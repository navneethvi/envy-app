const crypto = require('crypto');

// Shared-passcode gate for the API. The client sends it in the `x-passcode` header.
// With APP_PASSCODE unset the API stays open, which is only acceptable on localhost.

const MAX_FAILURES = 10;                 // wrong guesses allowed per IP...
const WINDOW_MS = 15 * 60 * 1000;        // ...within this window
const failures = new Map();              // ip -> { count, resetAt }

const digest = s => crypto.createHash('sha256').update(String(s)).digest();
const matches = (a, b) => crypto.timingSafeEqual(digest(a), digest(b));

function requirePasscode(req, res, next) {
  const expected = process.env.APP_PASSCODE;
  if (!expected) return next();

  // Google redirects the browser here after consent, so it can't carry the header.
  // It only accepts a one-time code issued by Google for our OAuth client.
  if (req.path === '/oauth-callback') return next();

  const now = Date.now();
  const ip = req.ip || 'unknown';
  let f = failures.get(ip);
  if (f && f.resetAt <= now) { failures.delete(ip); f = null; }
  if (f && f.count >= MAX_FAILURES) {
    return res.status(429).json({
      success: false, code: 'locked_out',
      error: 'Too many wrong passcode attempts. Try again in a few minutes.',
    });
  }

  const given = req.get('x-passcode');
  if (given && matches(given, expected)) {
    failures.delete(ip);
    return next();
  }

  // A request with no passcode at all is just the first visit, not a guess.
  if (given) {
    if (!f) { f = { count: 0, resetAt: now + WINDOW_MS }; failures.set(ip, f); }
    f.count += 1;
  }
  res.status(401).json({ success: false, code: 'passcode', error: 'Passcode required.' });
}

module.exports = requirePasscode;
