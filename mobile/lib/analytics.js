import dayjs from 'dayjs';

export const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTH_INITIAL = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ── Formatting ───────────────────────────────────────────────────────

// 615 → "10h 15m" / "1d 2h"
export function formatMinutes(mins) {
  if (!mins) return '0h';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h === 0) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

// Indian-grouped currency, e.g. 123456 → "₹1,23,456". Avoids Intl for Hermes safety.
export function formatMoney(amount, symbol = '₹') {
  const n = Math.round(amount || 0);
  const s = String(Math.abs(n));
  let grouped;
  if (s.length <= 3) {
    grouped = s;
  } else {
    const last3 = s.slice(-3);
    let rest = s.slice(0, -3);
    const parts = [];
    while (rest.length > 2) { parts.unshift(rest.slice(-2)); rest = rest.slice(0, -2); }
    if (rest) parts.unshift(rest);
    grouped = parts.join(',') + ',' + last3;
  }
  return `${symbol}${n < 0 ? '-' : ''}${grouped}`;
}

// 12400 → "₹12.4K" — for cramped chart labels.
export function formatMoneyCompact(amount) {
  const n = Math.round(amount || 0);
  if (n < 10000) return formatMoney(n);
  if (n < 100000) return `₹${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return `₹${(n / 100000).toFixed(1).replace(/\.0$/, '')}L`;
}

// "just now" / "5m ago" / "3h ago" / "2d ago" / "12 Aug"
export function timeAgo(date) {
  if (!date) return '';
  const d = dayjs(date);
  const mins = dayjs().diff(d, 'minute');
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.format(d.year() === dayjs().year() ? 'D MMM' : 'D MMM YYYY');
}

// ── Reading a raw BMS booking ────────────────────────────────────────

const LANGUAGE_RE = /^(malayalam|tamil|telugu|kannada|hindi|english|bengali|marathi|punjabi|japanese|korean)$/i;

// "Ramayana (3D)(Malayalam)" → { name: "Ramayana", tags: ["3D", "Malayalam"] }
export function splitTitle(raw) {
  const tags = [];
  const name = (raw || '')
    .replace(/\(([^)]*)\)/g, (_, t) => { if (t.trim()) tags.push(t.trim()); return ' '; })
    .replace(/\s+/g, ' ')
    .trim();
  return { name: name || (raw || '').trim() || 'Untitled', tags };
}

// The auditorium, from the trailing brackets: "…Cherthala (STUDIO 2)" → "Studio 2"
export function screenLabel(venue) {
  const m = (venue || '').match(/\(([^)]*)\)\s*$/);
  if (!m) return '';
  return m[1].trim().toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase())
    .replace(/\b(Imax|4dx|Icon|Pxl)\b/g, x => x.toUpperCase());
}

const CINEMA_RE = /cinema|grand|pvr|inox|cinepolis|kairali|carnival|theatre|theater|mall|cineplex|q\s*cinemas|aries|ariesplex/i;
const CHAIN_RE = /^(pvr|inox|pvr inox|cinepolis|carnival|miraj)$/i;

// Reduce a venue string to the cinema you'd name out loud:
// "Paradise Cinema: Cherthala(SCREEN 2)"            → "Paradise Cinema"
// "EVM GRAND RGB Laser 4K 3D DOLBY: Cherthala (…)"  → "EVM GRAND"
// "PVR: Forum Mall, Kochi(SCREEN 4)"                → "PVR Forum Mall"   (chains keep their location)
export function cinemaBrand(v) {
  if (!v) return '';
  const parts = v.split('(')[0].split(':').map(x => x.trim()).filter(Boolean);
  const cinemaLike = parts.find(p => CINEMA_RE.test(p));
  let s = (cinemaLike || parts[0] || '')
    .replace(/\b(rgb|laser|4k|2k|3d|dolby|atmos|imax|screen).*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  // "EVM GRAND" and "EVM Grand Cinema" are the same place — soften shouted words, keep acronyms.
  s = s.replace(/\b[A-Z]{4,}\b/g, w => w[0] + w.slice(1).toLowerCase());
  if (CHAIN_RE.test(s)) {
    const where = parts.find(p => p !== cinemaLike && p !== s);
    if (where) s = `${s} ${where.split(',')[0].trim()}`;
  }
  return s;
}

const brandKey = b => (b || '').toLowerCase().replace(/\s+cinemas?$/, '').trim();

function normTitle(t) {
  return (t || '').toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z0-9]/g, '');
}

// Number of seats from a seats string — a plain count ("2") or seat labels ("G7, G8" → 2).
export function seatCount(seats) {
  if (seats == null) return 0;
  const s = String(seats).trim();
  if (!s) return 0;
  if (/^\d+$/.test(s)) return Number(s);
  return s.split(/[,;/]+/).map(x => x.trim()).filter(Boolean).length;
}

// Premium format, if any: IMAX / 4DX from the screen, 3D from the title tag.
// (Venue names like "RGB Laser 4K 3D DOLBY" are marketing, not the format of this show.)
function detectFormat(tags, screen) {
  const hay = `${tags.join(' ')} ${screen}`;
  if (/imax/i.test(hay)) return /3d/i.test(tags.join(' ')) ? 'IMAX 3D' : 'IMAX';
  if (/4dx/i.test(hay)) return '4DX';
  if (tags.some(t => /\b3d\b/i.test(t))) return '3D';
  return '';
}

// Turn raw API records into the shape every screen uses. Newest first.
export function decorate(bookings = []) {
  return bookings
    .map(b => {
      const { name, tags } = splitTitle(b.movieTitle);
      const screen = screenLabel(b.venue);
      const n = seatCount(b.seats);
      return {
        id: b._id,
        date: b.bookingDate,
        title: name,
        rawTitle: b.movieTitle || '',
        language: tags.find(t => LANGUAGE_RE.test(t)) || '',
        format: detectFormat(tags, screen),
        venue: b.venue || '',
        theatre: cinemaBrand(b.venue),
        screen,
        amount: b.amount || 0,
        seats: b.seats || '',
        seatN: n,
        perSeat: n > 0 && b.amount > 0 ? b.amount / n : null,
        runtime: b.runtime || null,
        posterUrl: b.posterUrl || '',
        bookingId: b.bookingId || '',
        emailId: b.emailId || '',
        cancelled: b.status === 'cancelled',
      };
    })
    .sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());
}

// ── Slicing ──────────────────────────────────────────────────────────

const sum = (arr, f) => arr.reduce((a, x) => a + (f(x) || 0), 0);

export const inYear = (items, year) => items.filter(v => dayjs(v.date).year() === year);

// Years that have at least one booking, newest first.
export function yearsOf(items) {
  return [...new Set(items.map(v => dayjs(v.date).year()))].sort((a, b) => b - a);
}

// Month sections for the history list. Totals ignore refunded bookings.
export function groupByMonth(items) {
  const map = new Map();
  items.forEach(v => {
    const key = dayjs(v.date).format('YYYY-MM');
    if (!map.has(key)) map.set(key, { key, title: dayjs(v.date).format('MMMM YYYY'), data: [] });
    map.get(key).data.push(v);
  });
  return [...map.values()].map(s => {
    const live = s.data.filter(v => !v.cancelled);
    return { ...s, count: live.length, total: sum(live, v => v.amount) };
  });
}

// 12 buckets for one year.
export function byMonth(visits, year) {
  const out = MONTH_SHORT.map((m, i) => ({ key: i, label: MONTH_INITIAL[i], name: `${m} ${year}`, count: 0, spend: 0, items: [] }));
  inYear(visits, year).forEach(v => {
    const b = out[dayjs(v.date).month()];
    b.count += 1; b.spend += v.amount; b.items.push(v);
  });
  return out;
}

// One bucket per calendar year from first booking to last (gaps included).
export function byYear(visits) {
  const years = yearsOf(visits);
  if (!years.length) return [];
  const out = [];
  for (let y = years[years.length - 1]; y <= years[0]; y++) {
    const items = inYear(visits, y);
    out.push({ key: y, label: `'${String(y).slice(2)}`, name: `${y}`, count: items.length, spend: sum(items, v => v.amount), items });
  }
  return out;
}

// Year × month grid of booking counts for the all-time heatmap.
export function monthGrid(visits) {
  const years = yearsOf(visits);
  if (!years.length) return null;
  const rows = [];
  let max = 0;
  for (let y = years[0]; y >= years[years.length - 1]; y--) {
    const cells = Array.from({ length: 12 }, () => ({ count: 0, items: [] }));
    inYear(visits, y).forEach(v => { const c = cells[dayjs(v.date).month()]; c.count += 1; c.items.push(v); });
    cells.forEach(c => { if (c.count > max) max = c.count; });
    rows.push({ year: y, cells });
  }
  return { rows, max };
}

// Bookings per weekday, Monday first.
export function byWeekday(visits) {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const out = order.map(d => ({ key: d, label: WEEKDAY_SHORT[d], name: WEEKDAY_SHORT[d], count: 0, items: [] }));
  visits.forEach(v => { const b = out[order.indexOf(dayjs(v.date).day())]; b.count += 1; b.items.push(v); });
  const total = visits.length;
  if (!total) return null;
  const top = out.reduce((a, b) => (b.count > a.count ? b : a), out[0]);
  const weekend = out.filter(b => b.key === 0 || b.key === 6).reduce((a, b) => a + b.count, 0);
  return { buckets: out, topDay: dayjs().day(top.key).format('dddd'), weekendPct: Math.round((weekend / total) * 100) };
}

// Seat-count & per-seat-price stats.
export function seatStats(visits) {
  const withSeats = visits.filter(v => v.seatN > 0);
  if (!withSeats.length) return null;
  const priced = withSeats.filter(v => v.perSeat != null);
  return {
    totalSeats: sum(withSeats, v => v.seatN),
    avgSeats: sum(withSeats, v => v.seatN) / withSeats.length,
    soloPct: Math.round((withSeats.filter(v => v.seatN === 1).length / withSeats.length) * 100),
    perSeat: priced.length ? sum(priced, v => v.perSeat) / priced.length : null,
    priciestSeat: priced.slice().sort((a, b) => b.perSeat - a.perSeat)[0] || null,
    biggestGroup: withSeats.slice().sort((a, b) => b.seatN - a.seatN)[0] || null,
  };
}

// Consecutive-month streaks: current run, longest run, longest gap.
export function monthStreaks(visits) {
  const set = new Set(visits.map(v => dayjs(v.date).format('YYYY-MM')));
  if (!set.size) return null;
  const toIdx = k => { const [y, m] = k.split('-').map(Number); return y * 12 + (m - 1); };
  const idxs = [...set].map(toIdx).sort((a, b) => a - b);
  let longest = 1, run = 1, longestGap = 0;
  for (let i = 1; i < idxs.length; i++) {
    const gap = idxs[i] - idxs[i - 1];
    if (gap === 1) { run += 1; longest = Math.max(longest, run); }
    else { longestGap = Math.max(longestGap, gap - 1); run = 1; }
  }
  let current = 1;
  for (let i = idxs.length - 1; i > 0; i--) {
    if (idxs[i] - idxs[i - 1] === 1) current += 1; else break;
  }
  // A streak is only "current" if it reaches this month or last.
  const nowIdx = dayjs().year() * 12 + dayjs().month();
  if (nowIdx - idxs[idxs.length - 1] > 1) current = 0;
  return { current, longest, longestGap };
}

// Linear projection of this year's bookings (current year only).
export function paceProjection(visits, year) {
  const now = dayjs();
  if (year !== now.year()) return null;
  const sofar = inYear(visits, year).length;
  const monthsElapsed = now.month() + now.date() / now.daysInMonth();
  if (monthsElapsed < 1 || sofar === 0) return null;
  return Math.round((sofar / monthsElapsed) * 12);
}

// Headline numbers for any slice of confirmed bookings.
export function summarize(visits) {
  if (!visits.length) return null;
  const total = sum(visits, v => v.amount);
  const theatreMap = {}, titleMap = {}, monthMap = {};

  visits.forEach(v => {
    if (v.theatre) {
      const key = brandKey(v.theatre);
      const t = theatreMap[key] = theatreMap[key] || { label: v.theatre, films: new Set(), items: [], spend: 0 };
      if (v.theatre.length > t.label.length) t.label = v.theatre;
      t.films.add(normTitle(v.title));
      t.items.push(v);
      t.spend += v.amount;
    }
    const nt = normTitle(v.title);
    const g = titleMap[nt] = titleMap[nt] || { key: nt, title: v.title, posterUrl: '', items: [] };
    g.items.push(v);
    if (!g.posterUrl && v.posterUrl) g.posterUrl = v.posterUrl;

    const mk = dayjs(v.date).format('YYYY-MM');
    (monthMap[mk] = monthMap[mk] || []).push(v);
  });

  const busiest = Object.entries(monthMap).sort((a, b) => b[1].length - a[1].length)[0];
  const oldestFirst = [...visits].sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf());

  return {
    bookings: visits.length,
    films: Object.keys(titleMap).length,
    total,
    avg: total / visits.length,
    minutes: sum(visits, v => v.runtime),
    knownRuntime: visits.filter(v => v.runtime).length,
    theatres: Object.values(theatreMap)
      .map(t => ({ key: t.label, visits: t.items.length, films: t.films.size, spend: t.spend, items: t.items }))
      .sort((a, b) => b.visits - a.visits),
    repeats: Object.values(titleMap)
      .filter(g => g.items.length > 1)
      .map(g => ({ ...g, count: g.items.length, spend: sum(g.items, v => v.amount) }))
      .sort((a, b) => b.count - a.count),
    busiest: busiest ? { label: dayjs(busiest[0] + '-01').format('MMMM YYYY'), items: busiest[1] } : null,
    priciest: [...visits].sort((a, b) => b.amount - a.amount)[0],
    first: oldestFirst[0],
    last: oldestFirst[oldestFirst.length - 1],
  };
}
