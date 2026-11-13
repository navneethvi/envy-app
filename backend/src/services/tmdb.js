const axios = require('axios');

// Only used to enrich scraped BMS bookings with a poster + runtime.
const IMAGE_BASE = process.env.TMDB_IMAGE_BASE_URL || 'https://image.tmdb.org/t/p/w500';

function hasKey() {
  return !!process.env.TMDB_API_KEY && process.env.TMDB_API_KEY !== 'your_tmdb_api_key_here';
}

const tmdb = axios.create({
  baseURL: process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3',
  params: { api_key: process.env.TMDB_API_KEY, language: 'en-US' },
});

const posterUrl = p => (p ? `${IMAGE_BASE}${p}` : '');

// Strip language tags / certifications from a BMS title before searching TMDB.
function cleanTitle(t) {
  return (t || '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(malayalam|tamil|telugu|kannada|hindi|english|4k|3d|imax)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Resolve a movie title to its TMDB id + runtime + poster (best-effort, for BMS enrichment).
async function findByTitle(rawTitle) {
  const title = cleanTitle(rawTitle);
  if (!title || !hasKey()) return null;
  const { data } = await tmdb.get('/search/movie', { params: { query: title, include_adult: false } });
  const results = data.results || [];
  if (!results.length) return null;

  const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const pick = results.find(r => norm(r.title) === norm(title)) || results[0];

  let runtime = null;
  try {
    const { data: det } = await tmdb.get(`/movie/${pick.id}`);
    runtime = det.runtime || null;
  } catch { /* runtime is optional */ }

  return { movieId: String(pick.id), runtime, posterUrl: posterUrl(pick.poster_path), title: pick.title };
}

module.exports = { findByTitle };
