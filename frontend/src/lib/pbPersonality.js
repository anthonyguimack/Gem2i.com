// pbPersonality.js — Personal Brand mini-site ordering & page scoping.
//
// Single source of truth shared by App routing, Navbar, and Footer so the
// three never drift (a recurring pain point in this codebase). The admin sets
// the order of the three mini-sites in the Page Builder; whichever is #1 is the
// site's homepage at "/", and the navbar/footer scope their pages to whichever
// mini-site the visitor is currently viewing.

export const PB_PERSONALITIES = ['business', 'lifestyle', 'personal'];

const PB_LABELS = { business: 'Business', lifestyle: 'Lifestyle', personal: 'Personal' };

export const personalityLabel = (key) => PB_LABELS[key] || key;

// Normalize the stored order to always contain exactly the 3 valid keys, in a
// stable sequence: dedupe, drop unknowns, then append any missing key. This
// means a corrupt, short, or absent save can never break routing. The default
// (no setting saved) is business-first — identical to the pre-feature behavior.
export function getPersonalityOrder(settings) {
  const raw = Array.isArray(settings?.pb_personality_order) ? settings.pb_personality_order : [];
  const out = [];
  for (const k of raw) {
    if (PB_PERSONALITIES.includes(k) && !out.includes(k)) out.push(k);
  }
  for (const k of PB_PERSONALITIES) {
    if (!out.includes(k)) out.push(k);
  }
  return out;
}

// The mini-site served at "/" (the #1 in the admin-defined order).
export function getRootPersonality(settings) {
  return getPersonalityOrder(settings)[0];
}

// URL for a given personality: the root one lives at "/", the others at "/<key>".
export function personalityPath(key, settings) {
  return key === getRootPersonality(settings) ? '/' : `/${key}`;
}

// Ordered switch links for the navbar/footer mini-site selector.
export function miniSiteLinks(settings) {
  return getPersonalityOrder(settings).map((key) => ({
    key,
    title: personalityLabel(key),
    url: personalityPath(key, settings),
  }));
}

// Per-mini-site visibility. Each personality is one of:
//   'public'     — reachable by everyone; its nav link shows for all visitors
//   'members'    — guests are redirected away and the nav link is hidden;
//                  any logged-in member sees it and accesses it normally
//   'mastermind' — only members on the Mastermind level (and CMS staff) see it
//                  (KMS_CONTENT_TIERS_PLAN R4, D-2026-63)
// Stored as settings.pb_personality_visibility = { business, lifestyle, personal }.
// Absent / unknown value ⇒ 'public' (default — identical to pre-feature behavior).
export const MASTERMIND_LEVEL_ID = 'level_mastermind';

export function getPersonalityVisibility(settings, key) {
  const v = settings?.pb_personality_visibility?.[key];
  return v === 'members' || v === 'mastermind' ? v : 'public';
}

// Does the current visitor meet a mini-site's visibility requirement?
// On this platform the "CMS session" and the "My Account member" are the SAME
// object (memberAuth passes through auth), so `user` and `member` are usually
// identical — presence of that object only means "logged in", NOT "staff".
// Staff = a real CMS-admin role (they always pass); Mastermind = a member on the
// Mastermind level. A plain active member does NOT pass a 'mastermind' gate.
export function meetsVisibility(vis, user, member) {
  if (vis === 'public') return true;
  const u = user || member;                 // same doc on this platform
  if (!u) return false;                      // not logged in
  const roles = u.cms_roles || [];
  const staff = u.role === 'admin' || roles.includes('role_admin');
  if (vis === 'members') return true;        // any authenticated member
  return staff || u.level_id === MASTERMIND_LEVEL_ID; // 'mastermind'
}

// Which mini-site is active, derived from the current URL:
//   "/"                       -> root personality (#1 in the order)
//   "/lifestyle","/personal","/business" (or sub-paths) -> that key
//   otherwise, a nav page whose category is a personality -> that category
//   fallback -> root personality
export function resolveActivePersonality(pathname, settings, navPages = []) {
  const root = getRootPersonality(settings);
  if (pathname === '/') return root;
  for (const key of PB_PERSONALITIES) {
    if (pathname === `/${key}` || pathname.startsWith(`/${key}/`)) return key;
  }
  const page = (navPages || []).find(
    (p) => p.url === pathname || `/page/${p.id}` === pathname
  );
  if (page && PB_PERSONALITIES.includes(page.category)) return page.category;
  return root;
}

// Pages visible for the active mini-site: those tagged with the active
// personality PLUS any tagged "All Templates" (category 'all' / unset), which
// appear everywhere.
export function scopePagesForPersonality(pages, active) {
  return (pages || []).filter((p) => {
    const cat = p.category || 'all';
    return cat === 'all' || cat === active;
  });
}
