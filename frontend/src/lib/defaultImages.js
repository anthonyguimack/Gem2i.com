// Default My Account images, baked into the build and served as statics from
// `frontend/public/defaults/`. Shown when the member/sponsor has no photo.
//
// The MEMBER avatar is also editable per brand in the CMS:
//   Admin → Settings → Membership → "Default Member Avatar" (settings.membership_default_avatar).
//   Priority: member photo → CMS override → DEFAULT_AVATAR.
// The sponsor image is not CMS-editable: always this default.
export const DEFAULT_AVATAR = '/defaults/user.png';
export const DEFAULT_SPONSOR = '/defaults/sponsor.png';
