// Event microsites (plan: work-plans-MD/GEM2I_EVENT_MICROSITES_PLAN.md).
// Any host that is not the portal itself is a microsite host; on the portal,
// `?microsite=<host>` previews one (kept for the session while browsing it).
const PORTAL_HOSTS = ['gem2i.com', 'beta.gem2i.com', 'localhost', '127.0.0.1'];

const bare = (h) => (h || '').toLowerCase().replace(/^www\./, '');

export const isPortalHost = (h = window.location.hostname) => {
  const b = bare(h);
  return PORTAL_HOSTS.includes(b) || b.endsWith('.localhost') || b.endsWith('.test');
};

export function micrositeHost() {
  if (typeof window === 'undefined') return null;
  if (!isPortalHost()) return bare(window.location.hostname);
  const q = new URLSearchParams(window.location.search).get('microsite');
  try {
    if (q === '') sessionStorage.removeItem('gem2i_microsite');
    else if (q) sessionStorage.setItem('gem2i_microsite', bare(q));
    return sessionStorage.getItem('gem2i_microsite') || null;
  } catch {
    return q ? bare(q) : null;
  }
}
