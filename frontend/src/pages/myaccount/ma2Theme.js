/**
 * My Account 2.0 — light / dark mode.
 *
 * ⚠ TWO STATES ONLY: 'light' (the default) and 'dark'.
 * There is deliberately NO "follow the system" option (Anthony, 2026-07-31):
 * a third state that silently changes the look when the OS flips confuses
 * members — they cannot tell whether the app or their laptop decided. The
 * reference (Velzon) does the same: one sun/moon button, two states.
 *
 * ⚠ 2.0 ONLY. My Account 1.0, the CMS and the public site are untouched: the mode
 * only decides WHICH `theme_colors` group is injected as `--ma2-*`
 * (`my_account_2` vs `my_account_2_dark`), and nothing outside `.ma2-scope` /
 * `.ma2-modal` reads those.
 *
 * The switch lives in JS on purpose. `injectThemeColors` writes INLINE custom
 * properties on :root, and no stylesheet rule can outrank an inline declaration
 * — so the usual `:root[data-theme="dark"]` trick would never fire.
 *
 * Preference is per-browser (localStorage), not per-account: it is a viewing
 * comfort setting, and storing it server-side would need a member-model change
 * for something the member re-picks in a second.
 */
const KEY = 'ma2:mode';
export const MA2_MODE_EVENT = 'ma2:mode-changed';
export const MA2_DEFAULT_MODE = 'light';

/**
 * 'light' | 'dark'. Anything else — including the retired 'system' value left in
 * a browser from the first iteration — resolves to the light default.
 */
export function getMa2Mode() {
  try {
    return localStorage.getItem(KEY) === 'dark' ? 'dark' : MA2_DEFAULT_MODE;
  } catch (_) { return MA2_DEFAULT_MODE; }
}

export function setMa2Mode(mode) {
  const next = mode === 'dark' ? 'dark' : 'light';
  try { localStorage.setItem(KEY, next); } catch (_) { /* private mode */ }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(MA2_MODE_EVENT, { detail: { mode: next } }));
  }
  return next;
}

export function toggleMa2Mode() {
  return setMa2Mode(getMa2Mode() === 'dark' ? 'light' : 'dark');
}

export function onMa2ModeChange(cb) {
  if (typeof window === 'undefined') return () => {};
  const handler = () => cb(getMa2Mode());
  window.addEventListener(MA2_MODE_EVENT, handler);
  return () => window.removeEventListener(MA2_MODE_EVENT, handler);
}
