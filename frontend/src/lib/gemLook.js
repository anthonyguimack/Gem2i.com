/**
 * gem2i home "look" preview (2026-10-17, bocetos/home-luz.html): `?look=l1|l2|l3`
 * shows the home with that lighting option WITHOUT changing the Page Builder
 * colours; kept for the browser session, `?look=off` clears it.
 *   l1 · midnight navy base (palette vars only)
 *   l2 · alternate light / dark sections
 *   l3 · navy base + light reading sections + blue bands
 * Without a look, the Page Builder colours (section_configs.bg_color) apply.
 */
const KEY = 'gem2i:look-preview';
// Brand gradient from the legacy site (settings.css `.dark .section`): deep navy → GEM2i blue.
const BLUE_BAND = 'linear-gradient(90deg, #002444 0%, #0068b3 100%)';

export const LOOKS = {
  l1: { root: 'gem-look-navy', bg: {} },
  l2: {
    root: '',
    bg: { gem_intro: '#E8EDF2', gem_featured: '#F4F6F8', services: '#E8EDF2', aurex_pricing: '#F4F6F8', contact: '#E8EDF2' },
  },
  l3: {
    root: 'gem-look-navy',
    bg: { gem_intro: '#E8EDF2', gem_featured: '#F4F6F8', services: BLUE_BAND, aurex_pricing: '#F4F6F8', contact: BLUE_BAND },
  },
};

export function readLook() {
  try {
    const q = new URLSearchParams(window.location.search).get('look');
    if (q === 'off') sessionStorage.removeItem(KEY);
    else if (q && LOOKS[q]) sessionStorage.setItem(KEY, q);
    const v = sessionStorage.getItem(KEY);
    return LOOKS[v] ? v : null;
  } catch { return null; }
}

/** 'light' | 'blue' | 'dark' | null for a CSS colour / gradient string. */
export function toneOf(bg) {
  if (!bg) return null;
  const s = String(bg).trim();
  if (s.startsWith('linear-gradient')) return 'blue';
  let r, g, b;
  const hex = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].split('').map(c => c + c).join('') : hex[1];
    [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
  } else {
    const m = s.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
    if (!m) return null;
    [r, g, b] = [m[1], m[2], m[3]].map(Number);
  }
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  if (lum > 0.6) return 'light';
  // saturated mid-blue / accent fills read like a band (white text stays)
  if (lum > 0.25 && b > r + 40) return 'blue';
  return 'dark';
}
