// Theme color definitions with defaults for all 3 groups

// Luminance-based color-scheme detection: parses common CSS color formats
// and returns "dark" if the color is perceptually dark, else "light".
// Used to auto-toggle `color-scheme` so native form controls (date/time
// pickers, select dropdowns) render with icons that contrast the theme.
function getLuminance(color) {
  if (!color || typeof color !== 'string') return 0;
  let r, g, b;
  const hex = color.trim().match(/^#([a-fA-F0-9]{3}|[a-fA-F0-9]{6})$/);
  const rgb = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    r = parseInt(h.slice(0, 2), 16);
    g = parseInt(h.slice(2, 4), 16);
    b = parseInt(h.slice(4, 6), 16);
  } else if (rgb) {
    r = +rgb[1]; g = +rgb[2]; b = +rgb[3];
  } else {
    return 0;
  }
  // ITU-R BT.601 perceptual luma
  return (r * 299 + g * 587 + b * 114) / 1000 / 255;
}
export function schemeFor(color) {
  return getLuminance(color) < 0.5 ? 'dark' : 'light';
}

export const WEBSITE_COLORS = [
  { key: 'primary', label: 'Primary Color', default: '#1a2332' },
  { key: 'accent', label: 'Accent Color', default: '#0D9488' },
  { key: 'heading_color', label: 'Heading Color', default: '#1a2332' },
  { key: 'body_text', label: 'Body Text Color', default: '#475569' },
  { key: 'navbar_bg', label: 'Navbar Background', default: '#ffffff' },
  { key: 'button_bg', label: 'Button Background', default: '#1a2332' },
  { key: 'button_text', label: 'Button Text', default: '#ffffff' },
  { key: 'button_hover_bg', label: 'Button Hover Background', default: '#c9a227' },
  { key: 'button_hover_text', label: 'Button Hover Text', default: '#111827' },
  { key: 'link_color', label: 'Link Color', default: '#0D9488' },
  { key: 'tab_active_bg', label: 'Tab Active Background', default: '#1a2332' },
  { key: 'tab_active_text', label: 'Tab Active Text', default: '#ffffff' },
  { key: 'icon_color', label: 'Icon Color', default: '#0D9488' },
  { key: 'page_bg', label: 'Page Background', default: '#ffffff' },
  { key: 'section_bg', label: 'Section Alt Background', default: '#F8FAFC' },
  { key: 'card_bg', label: 'Card Background', default: '#ffffff' },
  { key: 'card_border', label: 'Card Border', default: '#e2e8f0' },
  { key: 'footer_bg', label: 'Footer Background', default: '#1a2332' },
  { key: 'footer_text', label: 'Footer Text', default: '#ffffff' },
];

export const MYACCOUNT_COLORS = [
  { key: 'page_bg', label: 'Page Background', default: '#0d0f14' },
  { key: 'sidebar_bg', label: 'Sidebar Background', default: '#13161e' },
  { key: 'sidebar_text', label: 'Sidebar Text', default: '#9ca3af' },
  { key: 'sidebar_active_bg', label: 'Sidebar Active Background', default: 'rgba(201,168,76,0.1)' },
  { key: 'sidebar_active_text', label: 'Sidebar Active Text', default: '#c9a84c' },
  { key: 'sidebar_active_border', label: 'Sidebar Active Border', default: '#c9a84c' },
  { key: 'header_bg', label: 'Header Background', default: '#13161e' },
  { key: 'card_bg', label: 'Card Background', default: '#13161e' },
  { key: 'card_border', label: 'Card Border', default: 'rgba(255,255,255,0.05)' },
  { key: 'accent', label: 'Accent Color', default: '#c9a84c' },
  { key: 'text_primary', label: 'Primary Text', default: '#ffffff' },
  { key: 'text_secondary', label: 'Secondary Text', default: '#9ca3af' },
  { key: 'text_muted', label: 'Muted Text', default: '#6b7280' },
  { key: 'input_bg', label: 'Input Background', default: '#0d0f14' },
  { key: 'input_border', label: 'Input Border', default: 'rgba(255,255,255,0.1)' },
  { key: 'button_bg', label: 'Button Background', default: '#c9a84c' },
  { key: 'button_text', label: 'Button Text', default: '#0d0f14' },
  { key: 'tab_active', label: 'Tab Active Color', default: '#c9a84c' },
  { key: 'tab_inactive', label: 'Tab Inactive Color', default: '#6b7280' },
  { key: 'modal_bg', label: 'Modal Background', default: '#13161e' },
  { key: 'modal_border', label: 'Modal Border', default: 'rgba(255,255,255,0.1)' },
  { key: 'progress_low', label: 'Progress Bar Low', default: '#ef4444' },
  { key: 'progress_mid', label: 'Progress Bar Mid', default: '#c9a84c' },
  { key: 'progress_high', label: 'Progress Bar High', default: '#22c55e' },
  { key: 'avatar_border', label: 'Avatar Border', default: 'rgba(201,168,76,0.3)' },
  { key: 'avatar_bg', label: 'Avatar Background', default: 'rgba(201,168,76,0.1)' },
  { key: 'bell_icon', label: 'Notification Bell Icon', default: '#c9a84c' },
  { key: 'bell_hover_bg', label: 'Notification Bell Hover BG', default: 'rgba(201,168,76,0.12)' },
  { key: 'bell_badge_bg', label: 'Notification Badge Background', default: '#ef4444' },
  { key: 'bell_badge_text', label: 'Notification Badge Text', default: '#ffffff' },
];

export const LANDING_PAGE_COLORS = [
  { key: 'bg_base', label: 'Base Background', default: '#0a0a12' },
  { key: 'overlay_start', label: 'Overlay Start (top)', default: 'rgba(0,0,0,0.75)' },
  { key: 'overlay_end', label: 'Overlay End (bottom)', default: 'rgba(5,5,15,0.88)' },
  { key: 'accent', label: 'Accent / Gold', default: '#c9a84c' },
  { key: 'heading', label: 'Heading Color', default: '#f5f5f5' },
  { key: 'body_text', label: 'Body Text', default: '#f5f5f5' },
  { key: 'secondary_text', label: 'Secondary Text', default: '#a0a0b0' },
  { key: 'border', label: 'Border / Separator', default: 'rgba(201,168,76,0.3)' },
  { key: 'button_bg', label: 'Button Background', default: '#c9a84c' },
  { key: 'button_text', label: 'Button Text', default: '#0a0a12' },
  { key: 'button_outline_border', label: 'Outline Button Border', default: '#c9a84c' },
  { key: 'button_outline_text', label: 'Outline Button Text', default: '#c9a84c' },
  { key: 'input_bg', label: 'Input Background', default: 'rgba(255,255,255,0.05)' },
  { key: 'input_border', label: 'Input Border', default: 'rgba(201,168,76,0.3)' },
  { key: 'input_text', label: 'Input Text', default: '#f5f5f5' },
  { key: 'input_placeholder', label: 'Input Placeholder', default: '#a0a0b0' },
  { key: 'modal_bg', label: 'Modal Background', default: '#13161e' },
  { key: 'modal_border', label: 'Modal Border', default: 'rgba(201,168,76,0.3)' },
  { key: 'footer_bg', label: 'Footer Background', default: 'rgba(0,0,0,0.3)' },
  { key: 'footer_text', label: 'Footer Text', default: '#a0a0b0' },
  { key: 'cookie_bg', label: 'Cookie Banner Background', default: '#13161e' },
  { key: 'cookie_text', label: 'Cookie Banner Text', default: '#a0a0b0' },
  { key: 'countdown_bg', label: 'Countdown Box Background', default: 'rgba(255,255,255,0.05)' },
  { key: 'countdown_number', label: 'Countdown Number', default: '#c9a84c' },
  { key: 'countdown_label', label: 'Countdown Label', default: '#a0a0b0' },
];

export const ADMIN_COLORS = [
  { key: 'sidebar_text', label: 'Sidebar Text', default: 'rgba(255,255,255,0.6)' },
  { key: 'sidebar_active_bg', label: 'Sidebar Active Background', default: '#0D9488' },
  { key: 'sidebar_active_text', label: 'Sidebar Active Text', default: '#ffffff' },
  { key: 'sidebar_hover_bg', label: 'Sidebar Hover Background', default: 'rgba(255,255,255,0.05)' },
  { key: 'navbar_bg', label: 'Navbar Background', default: '#ffffff' },
  { key: 'navbar_text', label: 'Navbar Text', default: '#1a2332' },
  { key: 'navbar_border', label: 'Navbar Border', default: '#e2e8f0' },
  { key: 'page_bg', label: 'Page Background', default: '#f8fafc' },
  { key: 'card_bg', label: 'Card Background', default: '#ffffff' },
  { key: 'card_border', label: 'Card Border', default: '#e2e8f0' },
  { key: 'accent', label: 'Accent Color', default: '#0D9488' },
  { key: 'button_bg', label: 'Button Background', default: '#0D9488' },
  { key: 'button_text', label: 'Button Text', default: '#ffffff' },
  { key: 'button_danger_bg', label: 'Danger Button Background', default: '#ef4444' },
  { key: 'heading', label: 'Heading Color', default: '#1a2332' },
  { key: 'text_primary', label: 'Primary Text', default: '#334155' },
  { key: 'text_secondary', label: 'Secondary Text', default: '#64748b' },
  { key: 'table_header_bg', label: 'Table Header Background', default: '#f8fafc' },
  { key: 'table_border', label: 'Table Border', default: '#e2e8f0' },
  { key: 'table_row_hover', label: 'Table Row Hover', default: '#f1f5f9' },
  { key: 'input_border', label: 'Input Border', default: '#e2e8f0' },
  { key: 'input_focus', label: 'Input Focus Border', default: '#0D9488' },
  { key: 'badge_bg', label: 'Badge Background', default: '#0D9488' },
  { key: 'badge_text', label: 'Badge Text', default: '#ffffff' },
];

export const ENROLLMENT_COLORS = [
  { key: 'page_bg', label: 'Page Background', default: '#f4f4f4' },
  { key: 'header_bg', label: 'Header Bar Background', default: '#F5A623' },
  { key: 'header_text', label: 'Header Text', default: '#ffffff' },
  { key: 'footer_bg', label: 'Footer Background', default: '#1a2535' },
  { key: 'footer_text', label: 'Footer Text', default: '#9ca3af' },
  { key: 'step_title', label: 'Step Title Color', default: '#1a2535' },
  { key: 'step_active', label: 'Step Active Circle', default: '#F5A623' },
  { key: 'step_completed', label: 'Step Completed Circle', default: '#F5A623' },
  { key: 'step_pending', label: 'Step Pending Circle', default: '#d4d4d4' },
  { key: 'progress_bar', label: 'Progress Bar Fill', default: '#F5A623' },
  { key: 'progress_bg', label: 'Progress Bar Track', default: '#e5e7eb' },
  { key: 'form_bg', label: 'Form Background', default: '#ffffff' },
  { key: 'label_color', label: 'Field Label Color', default: '#374151' },
  { key: 'input_text', label: 'Input Text', default: '#1a2535' },
  { key: 'input_border', label: 'Input Bottom Border', default: '#d1d5db' },
  { key: 'input_focus', label: 'Input Focus Border', default: '#F5A623' },
  { key: 'input_icon', label: 'Input Icon Color', default: '#9ca3af' },
  { key: 'placeholder', label: 'Placeholder Color', default: '#9ca3af' },
  { key: 'save_btn_border', label: 'Save Button Border', default: '#dc2626' },
  { key: 'save_btn_text', label: 'Save Button Text', default: '#dc2626' },
  { key: 'continue_btn_border', label: 'Continue Button Border', default: '#1a2535' },
  { key: 'continue_btn_text', label: 'Continue Button Text', default: '#1a2535' },
  { key: 'submit_btn_border', label: 'Submit Button Border', default: '#1a2535' },
  { key: 'submit_btn_text', label: 'Submit Button Text', default: '#1a2535' },
  { key: 'error_color', label: 'Error Message Color', default: '#dc2626' },
  { key: 'success_color', label: 'Success Color', default: '#16a34a' },
  { key: 'section_title', label: 'Section Title', default: '#1a2535' },
  { key: 'tooltip_bg', label: 'Tooltip Background', default: '#1a2535' },
  { key: 'tooltip_text', label: 'Tooltip Text', default: '#ffffff' },
];

// AUX Projects (PMS) palette — the standalone Projects product at
// pms.<brand>.com reads this group over its brand endpoint and injects the
// values as --pm-* CSS variables at runtime (its whole UI is built on
// var(--pm-*), so this palette re-themes the entire app). Dark register by
// design; keys mirror the --pm-* tokens in the PMS index.css.
export const PMS_COLORS = [
  { key: 'bg',         label: 'App Background',            default: '#101318' },
  { key: 'surface',    label: 'Surface / Card',            default: '#171b22' },
  { key: 'raised',     label: 'Raised Surface',            default: '#1e232c' },
  { key: 'border',     label: 'Border',                    default: '#2a303b' },
  { key: 'sidebar',    label: 'Sidebar Background',        default: '#171b22' },
  { key: 'topbar',     label: 'Top Bar Background',        default: '#101318' },
  { key: 'input',      label: 'Input Background',          default: '#101318' },
  { key: 'text',       label: 'Primary Text',              default: '#e8eaee' },
  { key: 'muted',      label: 'Muted Text',                default: '#9aa3b2' },
  { key: 'faint',      label: 'Faint Text',                default: '#6b7383' },
  { key: 'accent',     label: 'Accent',                    default: '#c8a557' },
  { key: 'accent_ink', label: 'Accent Ink (text on accent)', default: '#14110a' },
  { key: 'danger',     label: 'Danger',                    default: '#e2635c' },
  { key: 'success',    label: 'Success',                   default: '#4ea87a' },
  { key: 'warning',    label: 'Warning',                   default: '#d9a441' },
  { key: 'info',       label: 'Info',                      default: '#5b8dd9' },
];

// Helper: get color value from settings with fallback to default
export function getColor(group, key, themeColors) {
  return themeColors?.[group]?.[key] || getDefault(group, key);
}

function getDefault(group, key) {
  const groups = { website: WEBSITE_COLORS, my_account: MYACCOUNT_COLORS, admin: ADMIN_COLORS, landing_page: LANDING_PAGE_COLORS, enrollment: ENROLLMENT_COLORS, pms: PMS_COLORS };
  return groups[group]?.find(c => c.key === key)?.default || '#000000';
}

// Inject all CSS variables from theme_colors settings.
// `overrides` can pin a specific color-scheme explicitly, e.g.:
//   { my_account_color_scheme: 'dark' | 'light' }
// When an override is provided it takes precedence over the luminance-derived scheme.
export function injectThemeColors(themeColors, overrides = {}) {
  const root = document.documentElement;

  // Website colors (--color-* for backwards compat)
  const ws = themeColors?.website || {};
  WEBSITE_COLORS.forEach(c => {
    const val = ws[c.key] || c.default;
    root.style.setProperty(`--color-${c.key.replace(/_/g, '-')}`, val);
    // Legacy aliases
    if (c.key === 'heading_color') root.style.setProperty('--color-heading', val);
    if (c.key === 'body_text') root.style.setProperty('--color-body-text', val);
    if (c.key === 'link_color') root.style.setProperty('--color-link', val);
    if (c.key === 'footer_bg') root.style.setProperty('--color-footer-bg', val);
    if (c.key === 'footer_text') root.style.setProperty('--color-footer-text', val);
    if (c.key === 'button_bg') root.style.setProperty('--color-button-bg', val);
    if (c.key === 'button_text') root.style.setProperty('--color-button-text', val);
    if (c.key === 'button_hover_bg') root.style.setProperty('--color-button-hover-bg', val);
    if (c.key === 'button_hover_text') root.style.setProperty('--color-button-hover-text', val);
    // Page Background: alias to the PB/Aurex `--color-bg` the one-page templates read.
    if (c.key === 'page_bg') root.style.setProperty('--color-bg', val);
    if (c.key === 'tab_active_bg') root.style.setProperty('--color-tab-active-bg', val);
    if (c.key === 'tab_active_text') root.style.setProperty('--color-tab-active-text', val);
    if (c.key === 'icon_color') root.style.setProperty('--color-icon', val);
  });

  // My Account colors (--ma-*)
  const ma = themeColors?.my_account || {};
  MYACCOUNT_COLORS.forEach(c => {
    root.style.setProperty(`--ma-${c.key.replace(/_/g, '-')}`, ma[c.key] || c.default);
  });
  // Auto-derive color-scheme from the card bg so native pickers/selects match theme,
  // unless an explicit admin override is set in CMS Settings.
  const maCardBg = ma.card_bg || MYACCOUNT_COLORS.find(c => c.key === 'card_bg').default;
  const maScheme = (overrides.my_account_color_scheme === 'dark' || overrides.my_account_color_scheme === 'light')
    ? overrides.my_account_color_scheme
    : schemeFor(maCardBg);
  root.style.setProperty('--ma-color-scheme', maScheme);

  // Admin colors (--ad-*)
  const ad = themeColors?.admin || {};
  ADMIN_COLORS.forEach(c => {
    root.style.setProperty(`--ad-${c.key.replace(/_/g, '-')}`, ad[c.key] || c.default);
  });
  const adCardBg = ad.card_bg || ADMIN_COLORS.find(c => c.key === 'card_bg').default;
  root.style.setProperty('--ad-color-scheme', schemeFor(adCardBg));

  // Landing Page colors (--lp-*)
  const lp = themeColors?.landing_page || {};
  LANDING_PAGE_COLORS.forEach(c => {
    root.style.setProperty(`--lp-${c.key.replace(/_/g, '-')}`, lp[c.key] || c.default);
  });

  // Membership Enrollment colors (--me-*)
  const me = themeColors?.enrollment || {};
  ENROLLMENT_COLORS.forEach(c => {
    root.style.setProperty(`--me-${c.key.replace(/_/g, '-')}`, me[c.key] || c.default);
  });
  const meFormBg = me.form_bg || ENROLLMENT_COLORS.find(c => c.key === 'form_bg').default;
  root.style.setProperty('--me-color-scheme', schemeFor(meFormBg));

  // AUX Projects / PMS colors (--pm-*). The standalone Projects app injects the
  // same tokens over its own endpoint; injecting them here too keeps the mapping
  // authoritative in one place (harmless in the CMS, which uses none of them).
  const pm = themeColors?.pms || {};
  PMS_COLORS.forEach(c => {
    root.style.setProperty(`--pm-${c.key.replace(/_/g, '-')}`, pm[c.key] || c.default);
  });

  // NOTE: the legacy `theme_colors.personal_brand` override group was removed
  // (2026-06-25). It used to be injected here LAST so it won over the Website
  // group, but it had no editor in Settings -> Colors, so operators could not
  // change those colors and their Website-tab edits were silently overridden.
  // The Website group is now the single source of truth for the public site
  // across every template (default/modern/classic/aurex/personalbrand); the PB
  // one-page sections keep their own per-section black/white auto-contrast.
}

// Theme definitions
export const THEMES = [
  {
    id: 'default',
    name: 'Default',
    description: 'Clean, professional layout with a modern business aesthetic. White background with structured sections.',
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Minimalist design with bold typography, generous spacing, and a transparent header that blends into the hero.',
  },
  {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional corporate look with a boxed layout, bordered sections, and serif-heavy typography for a distinguished feel.',
  },
  {
    id: 'aurex',
    name: 'One-page Pro',
    description: 'Monochromatic one-page template — clean whites/grays/darks, per-section background & font picker, and global drag-drop ordering.',
  },
  {
    id: 'personalbrand',
    name: 'Personal Brand Pro',
    description: 'Warm, personal one-page template for independent professionals — credit analysts, AI innovators, real-estate experts. Cream/sand/terracotta defaults, serif-led typography, same section library as One-page Pro.',
  },
];

// Themes that share the Aurex section architecture (per-section bg + font,
// drag-drop ordering, the AurexFooMono components).  Helper centralises the
// check so we don't sprinkle `theme === 'aurex' || theme === 'personalbrand'`
// across the codebase.
export function isAurexFamily(themeId) {
  return themeId === 'aurex' || themeId === 'personalbrand';
}

// Personal Brand Pro: warm defaults that the operator can override from
// Settings → Colors → Website.  These are CSS variable values applied to
// :root when the theme is active so the existing Aurex components inherit
// them without code changes.
export const PERSONALBRAND_DEFAULTS = {
  '--color-primary': '#3a2517',          // Deep espresso
  '--color-accent': '#c08552',           // Warm terracotta
  '--color-bg': '#fbf6ee',               // Cream
  '--color-card': '#ffffff',
  '--color-heading': '#2a1810',          // Near-black brown
  '--color-text': '#3d2818',
  '--color-secondary-text': '#7c6651',   // Soft warm gray
  '--color-border': '#e8dccd',           // Sand
};

// CMS-editable color palette for Personal Brand Pro (Settings → Colors).
// Keys map to themeColors.personal_brand.{key} in the DB; values are injected
// as --color-{key} CSS variables, overriding the PERSONALBRAND_DEFAULTS above.
export const PERSONALBRAND_COLORS = [
  { key: 'primary',        label: 'Primary Color',      default: '#3a2517' },
  { key: 'accent',         label: 'Accent Color',       default: '#c08552' },
  { key: 'bg',             label: 'Page Background',    default: '#fbf6ee' },
  { key: 'card',           label: 'Card Background',    default: '#ffffff' },
  { key: 'heading',        label: 'Heading Color',      default: '#2a1810' },
  { key: 'text',           label: 'Body Text',          default: '#3d2818' },
  { key: 'secondary_text', label: 'Secondary Text',     default: '#7c6651' },
  { key: 'border',         label: 'Border Color',       default: '#e8dccd' },
  { key: 'button_bg',      label: 'Button Background',  default: '#3a2517' },
  { key: 'button_text',    label: 'Button Text',        default: '#ffffff' },
];

// ── Aurex theme: official monochromatic palette ──────────────────────────
// Only these 7 swatches are allowed as section backgrounds. Text color
// flips automatically to the opposite end of the contrast curve.
export const AUREX_PALETTE = [
  { key: 'white',    label: 'Pure White', hex: '#FFFFFF' },
  { key: 'gray_50',  label: 'Gray 50',    hex: '#F9FAFB' },
  { key: 'gray_100', label: 'Gray 100',   hex: '#F4F6F8' },
  { key: 'gray_200', label: 'Gray 200',   hex: '#E5E7EB' },
  { key: 'gray_700', label: 'Gray 700',   hex: '#374151' },
  { key: 'gray_800', label: 'Gray 800',   hex: '#1F2937' },
  { key: 'gray_900', label: 'Gray 900',   hex: '#111827' },
];

// Font picker — Google Fonts loaded in public/index.html when Aurex theme active.
export const AUREX_FONTS = [
  { key: 'plus_jakarta',   label: 'Plus Jakarta Sans', css: "'Plus Jakarta Sans', 'Inter', sans-serif", note: 'Personal Brand Pro default' },
  { key: 'sora',           label: 'Sora',           css: "'Sora', sans-serif",           note: 'Modern, geometric' },
  { key: 'inter',          label: 'Inter',          css: "'Inter', sans-serif",          note: 'Neutral, legible' },
  { key: 'playfair',       label: 'Playfair Display', css: "'Playfair Display', serif",  note: 'Elegant serif' },
  { key: 'space_grotesk',  label: 'Space Grotesk',  css: "'Space Grotesk', sans-serif",  note: 'Technical' },
  { key: 'dm_sans',        label: 'DM Sans',        css: "'DM Sans', sans-serif",        note: 'Friendly' },
];

// Default font CSS string for Personal Brand Pro template
export const PB_FONT_CSS = "'Plus Jakarta Sans', 'Inter', sans-serif";

// Returns 'dark' or 'light' based on bg luminance — used for auto-contrast.
export function aurexContrastFor(hex) {
  return schemeFor(hex) === 'dark' ? 'light' : 'dark';
}
