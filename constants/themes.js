// ── App accent themes ────────────────────────────────────────────────
// Each theme recolors the brand accent across the app (brand marks, chrome,
// buttons, the hero ticket).
//
// `accent` is the solid base (icons, text, borders). `gradient` is a 2-stop
// pair used for richer surfaces (the loading animation, gradient bars/CTAs).
// Alpha variants are derived via rgba() so a theme only needs base + deep.

export function rgba(hex, a) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function makeTheme(key, name, accent, deep, gradient) {
  return {
    key,
    name,
    accent,            // solid accent (brand, icons, buttons)
    deep,              // darker shade for gradient tails
    gradient,          // [from, to] — loader rings, rich CTAs
    dim: rgba(accent, 0.55),   // secondary text (meta/footer)
    mid: rgba(accent, 0.4),    // badge borders
    soft: rgba(accent, 0.2),   // card borders / separators
    faint: rgba(accent, 0.08), // badge / chip fills
  };
}

export const THEMES = [
  makeTheme('golden',  'Golden Lux',   '#f5c518', '#7a6209', ['#f5c518', '#f59e0b']),
  makeTheme('emerald', 'Emerald Lux',  '#10b981', '#0b5e48', ['#10b981', '#06b6d4']),
  makeTheme('sunset',  'Sunset Blaze', '#fb923c', '#7c2d12', ['#fb923c', '#f43f5e']),
  makeTheme('vapor',   'Vaporwave',    '#d946ef', '#581c87', ['#8b5cf6', '#ec4899']),
  makeTheme('lime',    'Cyber Lime',   '#a3e635', '#3f6212', ['#a3e635', '#14b8a6']),
  makeTheme('ocean',   'Deep Ocean',   '#38bdf8', '#075985', ['#3b82f6', '#06b6d4']),
];

export const DEFAULT_THEME_KEY = 'golden';

export const THEME_MAP = Object.fromEntries(THEMES.map(t => [t.key, t]));
