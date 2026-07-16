// Shared social-network catalog (frontend mirror) — SOCIAL_LINKS_KMS_SYNC_PLAN.
//
// The authoritative registry lives in backend/utils/social_catalog.py and is served
// at /public/social-catalog (key, label, icon, share_capable, payment, svg). This
// module fetches it once, caches it, and exposes a hook + an icon renderer so the
// CMS Social Links tab and the website Footer/Navbar render icons/labels identically
// to the KMS — no per-surface hand-maintained icon set to drift.
import React from 'react';
import { publicAPI } from './api';

let _cache = null;      // resolved array
let _inflight = null;   // in-flight promise (dedupe concurrent callers)

export function loadSocialCatalog() {
  if (_cache) return Promise.resolve(_cache);
  if (_inflight) return _inflight;
  _inflight = publicAPI.getSocialCatalog()
    .then(r => { _cache = Array.isArray(r.data) ? r.data : []; return _cache; })
    .catch(() => { _cache = []; return _cache; })
    .finally(() => { _inflight = null; });
  return _inflight;
}

// React hook: returns { catalog, byKey, loading }. byKey is a { key → entry } map.
export function useSocialCatalog() {
  const [catalog, setCatalog] = React.useState(_cache || []);
  const [loading, setLoading] = React.useState(!_cache);
  React.useEffect(() => {
    let alive = true;
    if (_cache) { setCatalog(_cache); setLoading(false); return; }
    loadSocialCatalog().then(list => { if (alive) { setCatalog(list); setLoading(false); } });
    return () => { alive = false; };
  }, []);
  const byKey = React.useMemo(() => {
    const m = {};
    for (const c of catalog) m[c.key] = c;
    return m;
  }, [catalog]);
  return { catalog, byKey, loading };
}

// Best-effort catalog key for a (possibly legacy) social row — mirrors
// social_catalog.resolve_key on the backend. Used to map legacy free-text rows.
const ALIASES = {
  twitter: 'x', 'x / twitter': 'x', 'twitter/x': 'x',
  'cash app': 'cashme', cashapp: 'cashme', 'cash me': 'cashme',
  google: 'website', web: 'website', site: 'website', mail: 'email', 'e-mail': 'email',
};
export function resolveKey(byKey, { key, icon, platform } = {}) {
  const norm = (v) => (v || '').toString().trim().toLowerCase();
  for (const cand of [key, icon, platform]) {
    const k = norm(cand);
    if (!k) continue;
    if (byKey[k]) return k;
    if (ALIASES[k] && byKey[ALIASES[k]]) return ALIASES[k];
  }
  return null;
}

// Inline-SVG icon renderer. `svg` is the inner markup from the catalog entry;
// falls back to a neutral glyph if absent.
const GENERIC = '<path d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.5 5.5a.5.5 0 0 0-.707.707 2 2 0 0 1 .12 2.646l-.06.07-1.828 1.829a2 2 0 1 1-2.83-2.83l1.372-1.372a.5.5 0 0 0-.707-.707z"/><path d="M6.586 4.672A3 3 0 0 0 7.5 10.5a.5.5 0 0 0 .707-.707 2 2 0 0 1-.121-2.646l.06-.07 1.828-1.829a2 2 0 1 1 2.83 2.83l-1.373 1.372a.5.5 0 0 0 .708.707l1.372-1.372a3 3 0 1 0-4.243-4.243z"/>';

export function SocialIcon({ svg, size = 16, className, style }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 16 16" fill="currentColor"
      className={className} style={style} aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: svg || GENERIC }}
    />
  );
}
