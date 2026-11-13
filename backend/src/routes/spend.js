const express = require('express');
const router = express.Router();
const Spend = require('../models/Spend');
const gmail = require('../services/gmail');
const { parseBmsEmail, isCancellation, getBookingId, parseShowCancellation, NON_MOVIE_BOOKING_RE } = require('../services/bmsParser');
const tmdb = require('../services/tmdb');

// Enrich BMS bookings (which only have a title) with TMDB id + runtime + poster,
// so time-in-theatre and posters work and items become tappable. Idempotent.
async function enrichBmsRecords() {
  const pending = await Spend.find({
    source: 'bms',
    $or: [{ movieId: '' }, { movieId: null }, { runtime: null }],
  });
  const titles = [...new Set(pending.map(s => s.movieTitle).filter(Boolean))];
  let enriched = 0, failed = 0;
  for (const title of titles) {
    try {
      const info = await tmdb.findByTitle(title);
      if (info) {
        await Spend.updateMany(
          { source: 'bms', movieTitle: title },
          { movieId: info.movieId, runtime: info.runtime, posterUrl: info.posterUrl }
        );
        enriched++;
      } else { failed++; }
    } catch { failed++; }
  }
  return { titles: titles.length, enriched, failed };
}

// "Jana Nayagan (Tamil)" and "jana nayagan" compare equal.
const titleKey = t => (t || '').toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z0-9]/g, '');

// GET /api/spend — every BMS booking, newest first
router.get('/', async (req, res) => {
  try {
    const items = await Spend.find({ source: 'bms' }).sort({ bookingDate: -1 });
    res.json({ success: true, count: items.length, data: items });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Gmail OAuth (one-time setup) ─────────────────────────────────────

// GET /api/spend/gmail/status — is the app connected to Gmail?
router.get('/gmail/status', async (req, res) => {
  try {
    res.json({ success: true, ...(await gmail.getStatus()) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/spend/auth-url — open this in a browser once to authorize read-only Gmail.
router.get('/auth-url', (req, res) => {
  try {
    res.json({ success: true, url: gmail.getAuthUrl() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/spend/oauth-callback?code=... — Google redirects here after consent.
router.get('/oauth-callback', async (req, res) => {
  try {
    console.log('[oauth-callback] hit:', { hasCode: !!req.query.code, error: req.query.error || null });
    if (req.query.error) return res.status(400).send(`Authorization failed: ${req.query.error}`);
    if (!req.query.code) return res.status(400).send('Missing authorization code.');
    const { email } = await gmail.handleCallback(req.query.code);
    res.send(`<html><body style="font-family:sans-serif;background:#0d0d0d;color:#fff;text-align:center;padding-top:80px">
      <h2>✅ Gmail connected${email ? ` (${email})` : ''}</h2>
      <p>You can close this tab and return to the app, then tap <b>Sync</b>.</p></body></html>`);
  } catch (err) {
    console.error('[oauth-callback] failed:', err.message);
    res.status(500).send(`Error: ${err.message}`);
  }
});

// DELETE /api/spend/gmail — forget the stored Gmail token (bookings are kept).
router.delete('/gmail', async (req, res) => {
  try {
    await gmail.disconnect();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/spend/scrape — read BMS emails from Gmail, parse them and upsert bookings.
//   ?full=true    re-read every matching email (default: only emails not saved yet)
//   ?dryRun=true  parse and return, write nothing
//   ?max=N        cap on emails listed (default 2000)
router.post('/scrape', async (req, res) => {
  try {
    const dryRun = String(req.query.dryRun) === 'true';
    const full = String(req.query.full) === 'true';
    // Targeted query: transactional subjects only (bookings + cancellations), skipping
    // promo blasts — so we capture every booking AND every refund, not a recency slice.
    const query = 'from:bookmyshow subject:(ticket OR tickets OR booking OR confirmed OR cancel OR cancelled OR cancellation OR refund)';
    const ids = await gmail.listBmsEmailIds({ maxResults: Number(req.query.max) || 2000, query });

    // Incremental by default: emails already saved as bookings are skipped. Refund
    // emails are never saved, so they are re-read every time and keep matching.
    let toFetch = ids;
    if (!full) {
      const known = new Set(await Spend.distinct('emailId', { source: 'bms' }));
      toFetch = ids.filter(id => !known.has(id));
    }
    const { messages, failed: unreadable } = await gmail.fetchMessages(toFetch);

    // Split bookings from cancellation/refund emails.
    const parsed = [];
    const cancelledBookingIds = new Set();
    const cancelEmailIds = new Set();
    const showCancellations = [];
    let skipped = 0;
    for (const m of messages) {
      if (isCancellation(m)) {
        cancelEmailIds.add(m.id);
        const bid = getBookingId(m);
        if (bid) cancelledBookingIds.add(bid);
        else {
          // Theatre-cancelled shows carry no booking reference — match by title + show day.
          const sc = parseShowCancellation(m);
          if (sc) showCancellations.push(sc);
        }
      } else {
        const rec = parseBmsEmail(m);
        if (rec) parsed.push(rec); else skipped += 1;
      }
    }

    if (dryRun) {
      return res.json({
        success: true, dryRun: true, full, emails: ids.length, fetched: messages.length,
        parsed: parsed.length, skipped, unreadable, cancellations: cancelEmailIds.size,
        cancelledBookingIds: [...cancelledBookingIds], showCancellations, data: parsed,
      });
    }

    let inserted = 0, updated = 0;
    for (const rec of parsed) {
      const existing = await Spend.findOne({ emailId: rec.emailId });
      if (existing) {
        // Never flip a refunded booking back to confirmed on a re-read.
        const { status, ...fields } = rec;
        await Spend.updateOne({ _id: existing._id }, fields);
        updated++;
      } else {
        await Spend.create(rec);
        inserted++;
      }
    }

    // Remove any cancellation/refund emails that an earlier scrape mis-saved as bookings.
    const removed = await Spend.deleteMany({ emailId: { $in: [...cancelEmailIds] } });
    // Drop non-movie event bookings (plays/concerts) that an earlier scrape saved as movies.
    const removedEvents = await Spend.deleteMany({ source: 'bms', bookingId: NON_MOVIE_BOOKING_RE });
    // Mark the original bookings of cancelled shows as refunded (excluded from totals/visits).
    let cancelled = 0;
    if (cancelledBookingIds.size) {
      const r = await Spend.updateMany(
        { source: 'bms', bookingId: { $in: [...cancelledBookingIds] }, status: { $ne: 'cancelled' } },
        { status: 'cancelled' }
      );
      cancelled = r.modifiedCount || 0;
    }

    for (const sc of showCancellations) {
      const dayEnd = new Date(sc.showDate.getTime() + 24 * 60 * 60 * 1000);
      const sameDay = await Spend.find({
        source: 'bms', status: { $ne: 'cancelled' },
        bookingDate: { $gte: sc.showDate, $lt: dayEnd },
      });
      const hits = sameDay.filter(b => titleKey(b.movieTitle) === titleKey(sc.movieTitle));
      if (hits.length) {
        const r = await Spend.updateMany({ _id: { $in: hits.map(b => b._id) } }, { status: 'cancelled' });
        cancelled += r.modifiedCount || 0;
      }
    }

    // Enrich any bookings still missing TMDB metadata.
    const enrichment = await enrichBmsRecords();
    const total = await Spend.countDocuments({ source: 'bms' });
    const summary = {
      full, emails: ids.length, fetched: messages.length, parsed: parsed.length,
      skipped, unreadable, inserted, updated,
      removedCancellationEmails: removed.deletedCount || 0,
      removedEventBookings: removedEvents.deletedCount || 0,
      cancelledBookings: cancelled, total, enrichment,
    };
    await gmail.recordSync(summary);
    res.json({ success: true, ...summary });
  } catch (err) {
    if (gmail.isAuthError(err)) {
      return res.status(401).json({
        success: false, code: 'reauth',
        error: 'Gmail access has expired or was revoked. Reconnect Gmail to keep syncing.',
      });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/spend/enrich — fill in TMDB runtime/poster/id for BMS bookings.
router.post('/enrich', async (req, res) => {
  try {
    res.json({ success: true, ...(await enrichBmsRecords()) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
