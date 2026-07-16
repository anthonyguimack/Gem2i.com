// Aurex section schemas — drive the polymorphic admin UI.
// Each entry defines: config fields (page-level) + item fields (CRUD rows).
import { Users, Workflow, DollarSign, UserCircle, Calendar, Building2, Award, Film, Briefcase, MessageCircle, Newspaper, BookOpen, MapPin, Image, GalleryHorizontal, Megaphone } from 'lucide-react';
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
    itemFields: null,
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
  aurex_news_cfg: {
    label: 'Latest News — Section Configuration',
    icon: Newspaper,
    description: 'Override the Latest News header + CTA (posts come from the News manager).',
    configFields: [
      { key: 'eyebrow',  label: 'Eyebrow',  type: 'text', placeholder: 'Latest News' },
      { key: 'title',    label: 'Title',    type: 'text', placeholder: 'From our desk' },
      { key: 'subtitle', label: 'Subtitle', type: 'textarea' },
      { key: 'cta_text', label: 'View-all text', type: 'text', placeholder: 'View all' },
      { key: 'cta_url',  label: 'View-all URL',  type: 'text', placeholder: '/news' },
      { key: 'cta_new_tab', label: 'Open in new window', type: 'bool' },
    ],
    itemFields: null,
  },
  aurex_blog_cfg: {
    label: 'Blog — Section Configuration',
    icon: BookOpen,
    description: 'Header + CTA for the External Blog block. Posts come from the KMS: pick one or more KMS categories/subcategories below to show them as labelled sections; leave empty to show the latest posts flat.',
    configFields: [
      { key: 'eyebrow',  label: 'Eyebrow',  type: 'text', placeholder: 'Blog' },
      { key: 'title',    label: 'Title',    type: 'text', placeholder: 'Writing' },
      { key: 'subtitle', label: 'Subtitle', type: 'textarea' },
      { key: 'kms_categories', label: 'KMS categories (content source)', type: 'kms_categories' },
      { key: 'cta_text', label: 'View-all text (optional)', type: 'text' },
      { key: 'cta_url',  label: 'View-all URL',             type: 'text' },
      { key: 'cta_new_tab', label: 'Open in new window', type: 'bool' },
    ],
    itemFields: null,
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

  aurex_events: {
    label: 'Events (from AUX Calendar)',
    icon: Calendar,
    description: 'Config-only. Events come from Calendar → Global Events. Change content there.',
    configFields: [
      { key: 'eyebrow',           label: 'Eyebrow (above title)', type: 'text',    placeholder: 'Upcoming events' },
      { key: 'title',             label: 'Section title',        type: 'text',     placeholder: 'Upcoming Events' },
      { key: 'subtitle',          label: 'Subtitle',             type: 'textarea' },
      { key: 'max_items',         label: 'Max events to show',   type: 'number',   placeholder: '5' },
      { key: 'only_upcoming',     label: 'Upcoming only',        type: 'bool' },
      { key: 'view_all_text',     label: '"View all" button',    type: 'text',     placeholder: 'View all events' },
      { key: 'view_all_url',      label: '"View all" URL',       type: 'url' },
      { key: 'view_all_new_tab',  label: 'Open "View all" in new window', type: 'bool' },
      { key: 'empty_message',     label: 'Empty-state message',  type: 'text',     placeholder: 'No upcoming events. Check back soon.' },
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

  // Config-only sections for Reading List, Portfolio, and Gallery.
  // Items come from their dedicated managers (Books, Portfolio, Gallery).
  aurex_reading_cfg: {
    label: 'Reading List — Section Configuration',
    icon: BookOpen,
    description: 'Override the Reading List section header + CTA (books come from the Books manager).',
    configFields: [
      { key: 'eyebrow',  label: 'Eyebrow (above title)', type: 'text',     placeholder: 'Reading List' },
      { key: 'title',    label: 'Section title',         type: 'text',     placeholder: 'Reading List' },
      { key: 'subtitle', label: 'Subtitle',              type: 'textarea' },
      { key: 'cta_text', label: 'View-all button text',  type: 'text',     placeholder: 'View all books' },
      { key: 'cta_url',  label: 'View-all URL',          type: 'text',     placeholder: '/reading-list' },
      { key: 'cta_new_tab', label: 'Open in new window', type: 'bool' },
    ],
    itemFields: null,
  },

  aurex_portfolio_cfg: {
    label: 'Portfolio (Featured Work) — Section Configuration',
    icon: Image,
    description: 'Override the Featured Work section header + CTA (items come from the Portfolio manager).',
    configFields: [
      { key: 'eyebrow',  label: 'Eyebrow (above title)', type: 'text',     placeholder: 'Featured Work' },
      { key: 'title',    label: 'Section title',         type: 'text',     placeholder: 'Featured Projects' },
      { key: 'subtitle', label: 'Subtitle',              type: 'textarea' },
      { key: 'cta_text', label: 'View-all button text',  type: 'text',     placeholder: 'View all projects' },
      { key: 'cta_url',  label: 'View-all URL',          type: 'text',     placeholder: '/featured-projects' },
      { key: 'cta_new_tab', label: 'Open in new window', type: 'bool' },
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
};
