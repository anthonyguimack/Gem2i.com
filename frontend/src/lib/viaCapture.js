// MMS affiliate tracking (Phase 2b): a landing with ?via=aux-N stores the code
// in a cross-subdomain cookie so the register/enrollment backends can attribute
// the signup (the mms_via cookie rides the same-domain API calls). Last touch
// wins (program default); the MMS also falls back to the sponsor tree, so this
// cookie is an attribution refinement, never a requirement.
const COOKIE = 'mms_via';
const DAYS = 60;

function parentDomain() {
  const parts = window.location.hostname.split('.');
  return parts.length >= 2 ? parts.slice(-2).join('.') : window.location.hostname;
}

export function captureVia() {
  try {
    const via = new URLSearchParams(window.location.search).get('via');
    if (!via || !/^[\w-]{1,40}$/.test(via)) return;
    const expires = new Date(Date.now() + DAYS * 864e5).toUTCString();
    const attrs = `expires=${expires}; path=/; domain=.${parentDomain()}; SameSite=Lax`;
    // last-touch cookie always overwrites…
    document.cookie = `${COOKIE}=${encodeURIComponent(via)}; ${attrs}`;
    // …the FIRST-touch cookie is written once and kept (G2: the MMS program
    // setting decides which of the two attributes the signup).
    if (!document.cookie.split('; ').some((c) => c.startsWith(`${COOKIE}_first=`))) {
      document.cookie = `${COOKIE}_first=${encodeURIComponent(via)}; ${attrs}`;
    }
  } catch {
    /* never break the page over tracking */
  }
}
