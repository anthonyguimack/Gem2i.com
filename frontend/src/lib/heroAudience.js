// Hero slide audience (CMS → Hero Slides → "Audience").
//   ''        → everyone (default; slides created before this field)
//   'guests'  → only visitors WITHOUT a session
//   'members' → only logged-in members
export const HERO_AUDIENCES = [
  { value: '',        label: 'Everyone',        hint: 'Visitors and logged-in members' },
  { value: 'guests',  label: 'Not logged in',   hint: 'Only visitors without a session' },
  { value: 'members', label: 'Logged in',       hint: 'Only members with an active session' },
];

export function isLoggedInUser(user) {
  return !!(user && (user.id || user.member_id || user.username || user.email));
}

export function slideForAudience(slide, loggedIn) {
  const a = slide?.audience || '';
  if (a === 'guests') return !loggedIn;
  if (a === 'members') return loggedIn;
  return true;
}
