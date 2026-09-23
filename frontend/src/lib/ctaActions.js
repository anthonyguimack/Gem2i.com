// Hero CTA "Action" model — makes hero buttons administrable from the CMS instead
// of relying on magic URL strings. Each button declares an ACTION; this pure
// resolver turns it into a concrete { visible, href, target } for the renderer.
//
// Three actions (by design — kept intentionally small):
//   • url      — any external/internal link or anchor. Uses the URL field; the
//                Window Open control (same/new) picks the target. Always visible.
//   • login    — "Login Required". Always points at #login. The global
//                LoginModalTrigger makes it auth-aware: guest → login modal,
//                logged-in → /my-account. Always visible.
//   • waitlist — "Waiting List". Always points at #waiting-list (WaitingListModal
//                opens it). Hidden automatically once the visitor has a session.
//
// Visibility is NOT an operator control — it is fixed per action (only waitlist is
// session-gated). Back-compat: a button with no `action` (legacy slides) infers it
// from a #login / #waiting-list URL, so existing heroes keep working untouched.
// Scope today: Personal Brand Pro hero. Designed to be reused by every template.

export const CTA_ACTIONS = ['url', 'login', 'waitlist'];

// Operator-facing labels for the CMS Action dropdown.
export const CTA_ACTION_LABELS = {
  url: 'Url / Link',
  login: 'Login Required',
  waitlist: 'Waiting List',
};

// Per-action behavior: whether it hides once logged in + how to derive the href.
const ACTION_DEFS = {
  url: { guestsOnly: false, href: (b) => b.url || '#' },
  login: { guestsOnly: false, href: () => '#login' },
  waitlist: { guestsOnly: true, href: () => '#waiting-list' },
};

// Infer the action of a legacy button from its URL (no `action` field stored).
export function inferAction(url) {
  const v = (url || '').trim().toLowerCase();
  if (v.endsWith('#login')) return 'login';
  if (v.endsWith('#waiting-list') || v.endsWith('#waitlist')) return 'waitlist';
  return 'url';
}

// The effective action of a button: explicit field if valid, else inferred.
export function effectiveAction(btn = {}) {
  return CTA_ACTIONS.includes(btn.action) ? btn.action : inferAction(btn.url);
}

// Resolve one CTA to render info.
//   btn = { text, url, action, target }
//   ctx = { loggedIn }
// Returns { visible:false } when the session gate hides it, otherwise
// { visible:true, href, target, action }.
export function resolveCta(btn = {}, ctx = {}) {
  const action = effectiveAction(btn);
  const def = ACTION_DEFS[action] || ACTION_DEFS.url;
  if (def.guestsOnly && !!ctx.loggedIn) return { visible: false };
  return { visible: true, href: def.href(btn), target: btn.target || '_self', action };
}
