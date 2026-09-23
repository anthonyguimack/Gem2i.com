// A FULL admin: the bootstrap `role:"admin"` account OR anyone holding the
// 'Administrator' CMS role (`role_admin`). Assigning that role in CMS →
// Roles & Permissions makes a second admin — no code change per admin.
// Mirrors the backend `is_admin()`.
//
// ⚠ This lives in its OWN dependency-free leaf module (NO imports) on purpose:
// it is imported by modules that sit in circular import cycles (App ↔ Navbar).
// If it lived in `lib/auth` (which imports the API layer), the circular
// initialization order could leave the binding `undefined` at render time and
// crash the app ("isAdmin is not a function"). A leaf module is always defined.
export const isAdmin = (user) =>
  user?.role === 'admin' || (user?.cms_roles || []).includes('role_admin');
