// Aurex section schemas — drive the polymorphic admin UI.
// Each entry defines: config fields (page-level) + item fields (CRUD rows).
import { Users, Workflow, DollarSign, UserCircle, Calendar, Building2, Award, Film, Briefcase, MessageCircle, Newspaper, BookOpen, MapPin, Image, GalleryHorizontal, Megaphone, Plane, Handshake } from 'lucide-react';
import { adminText } from './i18n';

// Field types: 'text' | 'textarea' | 'url' | 'number' | 'bool' | 'image' | 'icon' | 'rich' | 'social_links'
// (social_links is dynamic — it reads settings.social_links and renders
//  one URL input per enabled network. See AurexSectionsManager.)

export const AUREX_SECTIONS = {
  // Scrolling text strip at the very top of the Personal Brand hero. One
  // localized field; each comma-separated chunk becomes a phrase, with the
  // comma representing the gap shown between phrases in the strip.
  news_ticker: {
    label: 'News Ticker',
    icon: Megaphone,
    description: 'Scrolling text strip atop the hero (shown first, before Target Audience). Type each word or short phrase separated by a comma — every comma becomes a gap between phrases. Localized: fill EN and ES as needed.',
    configFields: [
      { key: 'phrases', label: 'Ticker phrases (separate each with a comma)', type: 'textarea', placeholder: 'Strategy, Solutions, Advertising, Consulting, Finance, Mindset, Brands, Marketing' },
    ],
    itemFields: null,
  },

  aurex_audience: {
    label: 'Target Audience',
    icon: Users,
    description: 'Target-audience cards. Each card = icon + title + description.',
    configFields: [
      { key: 'eyebrow',     label: 'Eyebrow (above title)', type: 'text',     placeholder: 'Why choose us' },
      { key: 'title',        label: 'Section title',        type: 'text',     placeholder: 'Who this is for' },
      { key: 'subtitle',     label: 'Subtitle',             type: 'textarea', placeholder: 'Who this is for…' },
      { key: 'cta_text',     label: 'CTA button text',      type: 'text',     placeholder: 'Get started' },
      { key: 'cta_url',      label: 'CTA button URL',       type: 'url',      placeholder: '/enrollment' },
      { key: 'cta_new_tab',  label: 'Open CTA in new window', type: 'bool' },
    ],
    itemFields: [
      { key: 'eyebrow',     label: 'Eyebrow (above title)', type: 'text',     placeholder: '' },
      { key: 'icon',        label: 'Icon', type: 'icon',     placeholder: 'briefcase' },
      { key: 'title',       label: 'Title',              type: 'text',     required: true },
      { key: 'description', label: 'Description',        type: 'rich' },
      { key: 'image',       label: 'Photo (gem2i 01: shown on hover)', type: 'image' },
    ],
    itemPreview: (i) => adminText(i.title),
  },

  aurex_process: {
    label: 'Our Process',
    icon: Workflow,
    description: 'Vertical timeline of process steps (auto-alternating left/right).',
    configFields: [
      { key: 'eyebrow',  label: 'Eyebrow (above title)', type: 'text',     placeholder: 'How we work' },
      { key: 'title',    label: 'Section title', type: 'text',     placeholder: 'Our Process' },
      { key: 'subtitle', label: 'Subtitle',      type: 'textarea' },
    ],
    itemFields: [
      { key: 'step_number', label: 'Step #',      type: 'number', placeholder: 'auto' },
      { key: 'title',       label: 'Step title',  type: 'text',   required: true },
      { key: 'description', label: 'Description', type: 'rich' },
    ],
    itemPreview: (i) => `${i.step_number || '·'}. ${adminText(i.title)}`,
  },

  aurex_pricing: {
    label: 'Pricing',
    icon: DollarSign,
    description: 'Plan columns with features list. One plan can be marked "featured".',
    configFields: [
      { key: 'eyebrow',      label: 'Eyebrow (above title)',   type: 'text',     placeholder: 'Pricing plans' },
      { key: 'title',        label: 'Section title',           type: 'text',     placeholder: 'Pricing' },
      { key: 'subtitle',     label: 'Subtitle',                type: 'textarea' },
      { key: 'show_toggle',  label: 'Monthly/annual switch',   type: 'bool' },
    ],
    itemFields: [
      { key: 'name',         label: 'Plan name',         type: 'text', required: true },
      { key: 'price',        label: 'Price (monthly)',   type: 'text',    placeholder: '29' },
      { key: 'price_annual', label: 'Price (annual)',    type: 'text',    placeholder: '290' },
      { key: 'currency',     label: 'Currency',          type: 'text',    placeholder: 'USD' },
      { key: 'period',       label: 'Period label',      type: 'text',    placeholder: '/ month' },
      { key: 'description',  label: 'Short description (under price)', type: 'text', placeholder: 'Basic features for up to 10 users' },
      { key: 'badge',        label: 'Badge text',        type: 'text',    placeholder: 'Most popular' },
      { key: 'is_featured',  label: 'Featured plan',     type: 'bool' },
      { key: 'cta_text',     label: 'CTA text',          type: 'text',    placeholder: 'Get started' },
      { key: 'cta_url',      label: 'CTA URL',           type: 'url' },
      { key: 'cta_new_tab',  label: 'Open CTA in new window', type: 'bool' },
      { key: 'features',     label: 'Features (one per line, prefix ✗ for excluded)', type: 'textarea', placeholder: 'Unlimited access\nPriority support\n✗ Custom domain' },
    ],
    itemPreview: (i) => `${adminText(i.name)} — ${i.currency || '$'}${i.price || '–'}`,
  },

  aurex_team: {
    label: 'Our Team',
    icon: UserCircle,
    description: 'Team member grid with photos, roles, and social links.',
    configFields: [
      { key: 'eyebrow',            label: 'Eyebrow (above title)', type: 'text',     placeholder: 'Meet the experts' },
      { key: 'title',              label: 'Section title',         type: 'text',     placeholder: 'Our Team' },
      { key: 'subtitle',           label: 'Subtitle',              type: 'textarea' },
      { key: 'show_view_all',      label: 'Show "View all" button', type: 'bool' },
      { key: 'view_all_text',      label: '"View all" button text', type: 'text',    placeholder: 'View full team' },
      { key: 'view_all_url',       label: '"View all" URL',         type: 'url' },
      { key: 'view_all_new_tab',   label: 'Open "View all" in new window', type: 'bool' },
      { key: 'max_visible',        label: 'Max members on site',    type: 'number',  placeholder: '6' },
    ],
    itemFields: [
      { key: 'name',         label: 'Full name',       type: 'text', required: true },
      { key: 'role',         label: 'Position / role', type: 'text' },
      { key: 'photo_url',    label: 'Photo',           type: 'image' },
      { key: 'bio',          label: 'Short bio (≤120 chars)', type: 'textarea' },
      { key: 'social_links', label: 'Social profile URLs (per enabled network)', type: 'social_links' },
    ],
    itemPreview: (i) => {
      const n = adminText(i.name); const r = adminText(i.role);
      return `${n}${r ? ' · ' + r : ''}`;
    },
  },

  aurex_video: {
    label: 'Video',
    icon: Film,
    description: 'A single video embed (YouTube / Vimeo / direct MP4 URL) with an optional section title.',
    configFields: [
      { key: 'eyebrow',  label: 'Eyebrow (above title)',    type: 'text',     placeholder: '' },
      { key: 'title',    label: 'Section title (optional)', type: 'text',     placeholder: '' },
      { key: 'subtitle', label: 'Subtitle',                 type: 'textarea' },
      { key: 'video_url', label: 'Video URL (YouTube, Vimeo, or .mp4)', type: 'url', placeholder: 'https://www.youtube.com/watch?v=…' },
      { key: 'poster_url', label: 'Poster image (optional)', type: 'image' },
      { key: 'autoplay',   label: 'Autoplay (muted)',         type: 'bool' },
      { key: 'aspect_ratio', label: 'Aspect ratio', type: 'select', options: [
        { value: '16/9', label: '16:9 (widescreen)' },
        { value: '4/3',  label: '4:3'  },
        { value: '1/1',  label: '1:1 (square)' },
        { value: '21/9', label: '21:9 (ultrawide)' },
      ] },
    ],
    // Feature list shown beside the video (Private Community Pro theme).
    // Each item = icon + title + description.
    itemFields: [
      { key: 'icon',        label: 'Icon',        type: 'icon', placeholder: 'graduation-cap' },
      { key: 'title',       label: 'Title',       type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'rich' },
    ],
    itemPreview: (i) => adminText(i.title),
  },

  // Config-only entries: these let the admin edit the header copy + single CTA
  // for the legacy sections that are rendered by the Aurex mono variants.
  // Their items come from their respective dedicated managers (Services /
  // Testimonials / News / Blog / Maps), so these schemas only expose
  // `configFields` and no item CRUD.
  aurex_services_cfg: {
    label: 'Services — Section Configuration',
    icon: Briefcase,
    description: 'Override the Services section header + CTA (items are managed in the existing Services manager).',
    configFields: [
      { key: 'eyebrow',  label: 'Eyebrow (above title)', type: 'text', placeholder: 'What we offer' },
      { key: 'title',    label: 'Section title',         type: 'text', placeholder: 'Our Services' },
      { key: 'subtitle', label: 'Subtitle',              type: 'textarea' },
      { key: 'cta_text', label: 'Button text',           type: 'text', placeholder: 'See All Services' },
      { key: 'cta_url',  label: 'Button URL',            type: 'text', placeholder: '/services' },
      { key: 'cta_new_tab', label: 'Open in new window', type: 'bool' },
    ],
    itemFields: null,
  },
  aurex_testimonials_cfg: {
    label: 'Testimonials — Section Configuration',
    icon: MessageCircle,
    description: 'Override the Testimonials header + CTA (testimonials themselves live in the Testimonials manager).',
    configFields: [
      { key: 'eyebrow',  label: 'Eyebrow',  type: 'text', placeholder: 'Testimonials' },
      { key: 'title',    label: 'Title',    type: 'text', placeholder: 'Testimonials' },
      { key: 'subtitle', label: 'Subtitle', type: 'textarea', placeholder: 'Find out why so many companies prefer us over others!' },
      { key: 'cta_text', label: 'Button text (optional)', type: 'text' },
      { key: 'cta_url',  label: 'Button URL',             type: 'text' },
      { key: 'cta_new_tab', label: 'Open in new window', type: 'bool' },
    ],
    itemFields: null,
  },


  aurex_partners: {
    label: 'Partners',
    icon: Building2,
    description: 'Partner logo strip (dark bg, grayscale→color on hover).',
    configFields: [
      { key: 'eyebrow',         label: 'Eyebrow',                  type: 'text',     placeholder: 'Trusted partners' },
      { key: 'title',           label: 'Section title',            type: 'text',     placeholder: 'Our Partners' },
      { key: 'subtitle',        label: 'Subtitle',                 type: 'textarea' },
      { key: 'cta_text',        label: 'Button text',              type: 'text' },
      { key: 'cta_url',         label: 'Button URL',               type: 'url' },
      { key: 'cta_new_tab',     label: 'Open in new window',       type: 'bool' },
      { key: 'autoscroll',      label: 'Auto-scrolling carousel',  type: 'bool' },
      { key: 'scroll_speed',    label: 'Scroll speed (s per cycle)', type: 'number', placeholder: '30' },
    ],
    itemFields: [
      { key: 'name',      label: 'Partner name (internal)', type: 'text', required: true },
      { key: 'logo_url',  label: 'Logo (PNG/SVG)',          type: 'image' },
      { key: 'link_url',  label: 'Link URL',                type: 'url' },
      { key: 'link_target', label: 'Open in',               type: 'select', options: [
        { value: '_blank', label: 'New tab' }, { value: '_self', label: 'Same tab' }, { value: 'internal', label: 'Internal page' },
      ] },
    ],
    itemPreview: (i) => adminText(i.name),
  },

  aurex_clients: {
    label: 'Our Clients',
    icon: Award,
    description: 'Client logo gallery (light bg, grayscale→color on hover).',
    configFields: [
      { key: 'eyebrow',         label: 'Eyebrow',                  type: 'text',     placeholder: 'Trusted by' },
      { key: 'title',           label: 'Section title',            type: 'text',     placeholder: 'Our Clients' },
      { key: 'subtitle',        label: 'Subtitle',                 type: 'textarea' },
      { key: 'cta_text',        label: 'Button text',              type: 'text' },
      { key: 'cta_url',         label: 'Button URL',               type: 'url' },
      { key: 'cta_new_tab',     label: 'Open in new window',       type: 'bool' },
      { key: 'autoscroll',      label: 'Auto-scrolling carousel',  type: 'bool' },
      { key: 'scroll_speed',    label: 'Scroll speed (s per cycle)', type: 'number', placeholder: '30' },
    ],
    itemFields: [
      { key: 'name',      label: 'Client name (internal)', type: 'text', required: true },
      { key: 'logo_url',  label: 'Logo (PNG/SVG)',         type: 'image' },
      { key: 'link_url',  label: 'Link URL',               type: 'url' },
      { key: 'link_target', label: 'Open in',              type: 'select', options: [
        { value: '_blank', label: 'New tab' }, { value: '_self', label: 'Same tab' }, { value: 'internal', label: 'Internal page' },
      ] },
    ],
    itemPreview: (i) => adminText(i.name),
  },





  aurex_locations_cfg: {
    label: 'Our Locations — Section Configuration',
    icon: MapPin,
    description: 'Override the Map / Locations header (pins come from the Maps & Locations managers).',
    configFields: [
      { key: 'eyebrow',  label: 'Eyebrow',  type: 'text', placeholder: 'Presence' },
      { key: 'title',    label: 'Title',    type: 'text', placeholder: 'Our Locations' },
      { key: 'subtitle', label: 'Subtitle', type: 'textarea' },
    ],
    itemFields: null,
  },

  aurex_gallery_cfg: {
    label: 'Gallery — Section Configuration',
    icon: GalleryHorizontal,
    description: 'Override the Gallery section header + CTA (images come from the Gallery manager).',
    configFields: [
      { key: 'eyebrow',  label: 'Eyebrow (above title)', type: 'text',     placeholder: 'Moments' },
      { key: 'title',    label: 'Section title',         type: 'text',     placeholder: 'Gallery' },
      { key: 'subtitle', label: 'Subtitle',              type: 'textarea' },
      { key: 'cta_text', label: 'View-all button text',  type: 'text',     placeholder: 'View all' },
      { key: 'cta_url',  label: 'View-all URL',          type: 'text',     placeholder: '/gallery' },
      { key: 'cta_new_tab', label: 'Open in new window', type: 'bool' },
    ],
    itemFields: null,
  },

  // ── gem2i template ─────────────────────────────────────────────────────
  gem_methodology: {
    label: 'Methodology',
    icon: Workflow,
    description: 'The numbered steps of the GEM2i method (1 · 2 · 3 …). Each step = title + description.',
    configFields: [
      { key: 'eyebrow',  label: 'Eyebrow (above title)', type: 'text', placeholder: 'How it works' },
      { key: 'title',    label: 'Section title',         type: 'text', placeholder: 'Our methodology' },
      { key: 'subtitle', label: 'Subtitle',              type: 'textarea' },
    ],
    itemFields: [
      { key: 'step_number', label: 'Step #',      type: 'number', placeholder: 'auto' },
      { key: 'icon',        label: 'Icon',        type: 'icon',   placeholder: 'sparkles' },
      { key: 'title',       label: 'Step title',  type: 'text',   required: true },
      { key: 'description', label: 'Description', type: 'rich' },
    ],
    itemPreview: (i) => `${i.step_number || '·'}. ${adminText(i.title)}`,
  },
  // ── gem2i inner pages (2026-10-19, port of the legacy travels.php /
  //    services.php / partners.php — content was hardcoded in PHP there) ──
  gem_travels: {
    label: 'Travels page',
    icon: Plane,
    description: 'The /travels page: one row per trip, alternating photo / text. Each photo can switch to its Google map ("View map / View photo").',
    configFields: [
      { key: 'eyebrow',      label: 'Eyebrow (above title)', type: 'text', placeholder: 'Travels' },
      { key: 'title',        label: 'Page title',            type: 'text', placeholder: 'Travel with GEM2i' },
      { key: 'subtitle',     label: 'Intro',                 type: 'textarea' },
      { key: 'members_only', label: 'Members only (log in to see the trips)', type: 'bool' },
    ],
    itemFields: [
      { key: 'dates',       label: 'Dates (free text)',  type: 'text', placeholder: 'July 18 / 19 / 20 and 25 / 26 / 27' },
      { key: 'title',       label: 'Trip / festival',    type: 'text', required: true },
      { key: 'description', label: 'Description',        type: 'rich' },
      { key: 'address',     label: 'Address',            type: 'text', placeholder: 'Dirkputstraat 260, Boom, Belgium' },
      { key: 'image',       label: 'Photo',              type: 'image' },
      { key: 'map_url',     label: 'Google Maps embed URL (Share → Embed a map → src)', type: 'url' },
      { key: 'cta_text',    label: 'Button text (optional)', type: 'text', placeholder: 'Book this trip' },
      { key: 'cta_url',     label: 'Button URL',         type: 'url' },
    ],
    itemPreview: (i) => `${adminText(i.title)}${i.dates ? ` · ${adminText(i.dates)}` : ''}`,
  },
  gem_services_page: {
    label: 'Services page',
    icon: Briefcase,
    description: 'The /services page: "Our services" cards (icon + name). Clicking a card opens its photo / description.',
    configFields: [
      { key: 'eyebrow',  label: 'Eyebrow (above title)', type: 'text', placeholder: 'What we do' },
      { key: 'title',    label: 'Page title',            type: 'text', placeholder: 'Our services' },
      { key: 'subtitle', label: 'Intro',                 type: 'textarea' },
    ],
    itemFields: [
      { key: 'title',       label: 'Service name',    type: 'text', required: true },
      { key: 'icon_image',  label: 'Icon (SVG/PNG)',  type: 'image' },
      { key: 'image',       label: 'Photo',           type: 'image' },
      { key: 'description', label: 'Description',     type: 'rich' },
      { key: 'url',         label: 'Link (optional)', type: 'url', placeholder: '/works' },
    ],
    itemPreview: (i) => adminText(i.title),
  },
  gem_works: {
    label: 'Our Works (Services page)',
    icon: GalleryHorizontal,
    description: 'Dark band under the services: carousel of recent works.',
    configFields: [
      { key: 'eyebrow',  label: 'Eyebrow (above title)', type: 'text', placeholder: 'Portfolio' },
      { key: 'title',    label: 'Section title',         type: 'text', placeholder: 'Our works' },
      { key: 'subtitle', label: 'Intro',                 type: 'textarea' },
      { key: 'cta_text', label: 'Card button text',      type: 'text', placeholder: 'View all works' },
      { key: 'cta_url',  label: 'Card button URL',       type: 'url', placeholder: '/works' },
    ],
    itemFields: [
      { key: 'title', label: 'Work title', type: 'text', required: true },
      { key: 'image', label: 'Image',      type: 'image' },
      { key: 'url',   label: 'Link (optional, else the section URL)', type: 'url' },
    ],
    itemPreview: (i) => adminText(i.title),
  },
  gem_partners_page: {
    label: 'Partners page',
    icon: Handshake,
    description: 'The /partners page header. The logos come from "Partners" (aurex_partners) — the same list as the homepage marquee.',
    configFields: [
      { key: 'eyebrow',      label: 'Eyebrow (above title)', type: 'text', placeholder: 'Global' },
      { key: 'title',        label: 'Page title',            type: 'text', placeholder: 'Partners' },
      { key: 'subtitle',     label: 'Intro',                 type: 'textarea' },
      { key: 'empty_text',   label: 'Text when there are no logos', type: 'text', placeholder: 'Coming soon…' },
      { key: 'members_only', label: 'Members only (log in to see the page)', type: 'bool' },
    ],
    itemFields: null,
  },
  gem_events_cfg: {
    label: 'Upcoming Events — Section Configuration',
    icon: Calendar,
    description: 'Header + CTA of the upcoming-events strip (events come from the Events catalog).',
    configFields: [
      { key: 'eyebrow',   label: 'Eyebrow (above title)', type: 'text' },
      { key: 'title',     label: 'Section title',         type: 'text', placeholder: 'Upcoming events' },
      { key: 'subtitle',  label: 'Subtitle',              type: 'textarea' },
      { key: 'max_items', label: 'How many to show',      type: 'number', placeholder: '8' },
      { key: 'cta_text',  label: 'View-all button text',  type: 'text', placeholder: 'View all' },
      { key: 'cta_url',   label: 'View-all URL',          type: 'text', placeholder: '/events' },
      { key: 'cta_new_tab', label: 'Open in new window',  type: 'bool' },
    ],
    itemFields: null,
  },
  gem_artists_cfg: {
    label: 'Artists — Section Configuration',
    icon: Users,
    description: 'Header + CTA of the artists strip (artists come from the Artists catalog).',
    configFields: [
      { key: 'eyebrow',   label: 'Eyebrow (above title)', type: 'text' },
      { key: 'title',     label: 'Section title',         type: 'text', placeholder: 'Artists' },
      { key: 'subtitle',  label: 'Subtitle',              type: 'textarea' },
      { key: 'max_items', label: 'How many to show',      type: 'number', placeholder: '8' },
      { key: 'cta_text',  label: 'View-all button text',  type: 'text', placeholder: 'View all' },
      { key: 'cta_url',   label: 'View-all URL',          type: 'text', placeholder: '/artists' },
      { key: 'cta_new_tab', label: 'Open in new window',  type: 'bool' },
    ],
    itemFields: null,
  },
  gem_venues_cfg: {
    label: 'Venues — Section Configuration',
    icon: MapPin,
    description: 'Header + CTA of the venues strip (venues come from the Venues catalog).',
    configFields: [
      { key: 'eyebrow',   label: 'Eyebrow (above title)', type: 'text' },
      { key: 'title',     label: 'Section title',         type: 'text', placeholder: 'Venues' },
      { key: 'subtitle',  label: 'Subtitle',              type: 'textarea' },
      { key: 'max_items', label: 'How many to show',      type: 'number', placeholder: '8' },
      { key: 'cta_text',  label: 'View-all button text',  type: 'text', placeholder: 'View all' },
      { key: 'cta_url',   label: 'View-all URL',          type: 'text', placeholder: '/venues' },
      { key: 'cta_new_tab', label: 'Open in new window',  type: 'bool' },
    ],
    itemFields: null,
  },
  gem_festivals_cfg: {
    label: 'Festivals — Section Configuration',
    icon: Award,
    description: 'Header + CTA of the festivals carousel (festivals come from the Festivals catalog).',
    configFields: [
      { key: 'eyebrow',   label: 'Eyebrow (above title)', type: 'text' },
      { key: 'title',     label: 'Section title',         type: 'text', placeholder: 'Festivals' },
      { key: 'subtitle',  label: 'Subtitle',              type: 'textarea' },
      { key: 'max_items', label: 'How many to show',      type: 'number', placeholder: '8' },
      { key: 'cta_text',  label: 'View-all button text',  type: 'text', placeholder: 'View all' },
      { key: 'cta_url',   label: 'View-all URL',          type: 'text', placeholder: '/festivals' },
      { key: 'cta_new_tab', label: 'Open in new window',  type: 'bool' },
    ],
    itemFields: null,
  },
  gem_conferences_cfg: {
    label: 'Conferences — Section Configuration',
    icon: BookOpen,
    description: 'Header + CTA of the conferences carousel (conferences come from the Conferences catalog).',
    configFields: [
      { key: 'eyebrow',   label: 'Eyebrow (above title)', type: 'text' },
      { key: 'title',     label: 'Section title',         type: 'text', placeholder: 'Conferences' },
      { key: 'subtitle',  label: 'Subtitle',              type: 'textarea' },
      { key: 'max_items', label: 'How many to show',      type: 'number', placeholder: '8' },
      { key: 'cta_text',  label: 'View-all button text',  type: 'text', placeholder: 'View all' },
      { key: 'cta_url',   label: 'View-all URL',          type: 'text', placeholder: '/conferences' },
      { key: 'cta_new_tab', label: 'Open in new window',  type: 'bool' },
    ],
    itemFields: null,
  },
  gem_clients_cfg: {
    label: 'Clients — Section Configuration',
    icon: Building2,
    description: 'Header of the clients logo strip (logos come from the Clients catalog).',
    configFields: [
      { key: 'eyebrow',   label: 'Eyebrow (above title)', type: 'text' },
      { key: 'title',     label: 'Section title',         type: 'text', placeholder: 'Our clients' },
      { key: 'subtitle',  label: 'Subtitle',              type: 'textarea' },
      { key: 'max_items', label: 'How many to show',      type: 'number', placeholder: '8' },
      { key: 'cta_text',  label: 'View-all button text',  type: 'text', placeholder: 'View all' },
      { key: 'cta_url',   label: 'View-all URL',          type: 'text', placeholder: '/clients' },
      { key: 'cta_new_tab', label: 'Open in new window',  type: 'bool' },
    ],
    itemFields: null,
  },
};
