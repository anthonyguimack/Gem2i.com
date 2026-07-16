// Layout definitions: each layout defines its zones (content areas)
export const LAYOUTS = {
  full_width: {
    label: 'Full Width',
    desc: 'Edge-to-edge content area',
    zones: ['main'],
    zoneLabels: { main: 'Main Content' },
  },
  boxed: {
    label: 'Boxed',
    desc: 'Centered max-width container',
    zones: ['main'],
    zoneLabels: { main: 'Main Content' },
  },
  split_screen: {
    label: 'Split Screen',
    desc: 'Two equal columns (50/50)',
    zones: ['left', 'right'],
    zoneLabels: { left: 'Left Column', right: 'Right Column' },
  },
  about_bio: {
    label: 'About / Bio',
    desc: 'Image + text + social links',
    zones: ['sidebar', 'main'],
    zoneLabels: { sidebar: 'Photo & Links', main: 'Bio & Content' },
  },
  grid: {
    label: 'Grid 2x2',
    desc: 'Four cells in a 2x2 grid',
    zones: ['cell_1', 'cell_2', 'cell_3', 'cell_4'],
    zoneLabels: { cell_1: 'Top Left', cell_2: 'Top Right', cell_3: 'Bottom Left', cell_4: 'Bottom Right' },
  },
  masonry: {
    label: 'Masonry',
    desc: 'Pinterest-style flowing layout',
    zones: ['main'],
    zoneLabels: { main: 'Content Blocks' },
  },
  list: {
    label: 'List',
    desc: 'Vertical stacked entries',
    zones: ['main'],
    zoneLabels: { main: 'List Items' },
  },
  carousel: {
    label: 'Carousel',
    desc: 'Horizontally scrollable blocks',
    zones: ['main'],
    zoneLabels: { main: 'Carousel Items' },
  },
  two_column: {
    label: 'Two Column',
    desc: 'Main content (2/3) + sidebar (1/3)',
    zones: ['main', 'sidebar'],
    zoneLabels: { main: 'Main Content', sidebar: 'Sidebar' },
  },
  three_column: {
    label: 'Three Column',
    desc: 'Three equal columns',
    zones: ['col_1', 'col_2', 'col_3'],
    zoneLabels: { col_1: 'Column 1', col_2: 'Column 2', col_3: 'Column 3' },
  },
  profile: {
    label: 'Profile',
    desc: 'Narrow sidebar + wide content area',
    zones: ['sidebar', 'main'],
    zoneLabels: { sidebar: 'Profile Info', main: 'Main Content' },
  },
  card_based: {
    label: 'Card Based',
    desc: 'Responsive card grid',
    zones: ['main'],
    zoneLabels: { main: 'Cards' },
  },
  hero_banner: {
    label: 'Hero Banner',
    desc: 'Full-width banner + content below',
    zones: ['hero', 'main'],
    zoneLabels: { hero: 'Hero Banner', main: 'Main Content' },
  },
  sidebar_layout: {
    label: 'Sidebar',
    desc: 'Fixed sidebar with main content',
    zones: ['sidebar', 'main'],
    zoneLabels: { sidebar: 'Sidebar', main: 'Main Content' },
  },
  landing: {
    label: 'Landing Page',
    desc: 'Hero, features & call-to-action',
    zones: ['hero', 'features', 'cta'],
    zoneLabels: { hero: 'Hero Section', features: 'Features', cta: 'Call to Action' },
  },
};

export const BLOCK_TYPES = {
  rich_text: { label: 'Rich Text', desc: 'Formatted text with headings, links, etc.' },
  image: { label: 'Image', desc: 'Upload or URL image with caption' },
  video: { label: 'Video', desc: 'YouTube or Vimeo embed' },
  service_list: { label: 'Service List', desc: 'Auto-displays all services' },
  gallery: { label: 'Gallery', desc: 'Auto-displays simple photo gallery' },
  gallery_albums: { label: 'Gallery Albums', desc: 'Auto-displays album-based gallery' },
  blog_posts: { label: 'Blog / News', desc: 'Auto-displays latest blog posts' },
  reading_list: { label: 'Reading List', desc: 'Auto-displays books collection' },
  profile_card: { label: 'Profile Card', desc: 'Name, photo, title & bio card' },
  button: { label: 'Button', desc: 'Call-to-action button with link' },
  separator: { label: 'Separator', desc: 'Visual divider between content' },
  custom_html: { label: 'Custom HTML', desc: 'Raw HTML code block' },
  legends_testimonials: { label: 'Legends & Testimonials', desc: 'Auto-sliding quote carousel' },
  map_global: { label: 'Global Business Map', desc: 'World map with business locations' },
  map_conferences: { label: 'Conferences Map', desc: 'Map with conference locations' },
  map_recommended: { label: 'Recommended Sites Map', desc: 'Map with recommended locations' },
};

export const getDefaultBlockConfig = (type) => {
  const defaults = {
    rich_text: { content: '' },
    image: { src: '', alt: '', caption: '', link: '' },
    video: { url: '' },
    service_list: {},
    gallery: {},
    gallery_albums: {},
    blog_posts: {},
    reading_list: {},
    profile_card: { name: '', title: '', image: '', bio: '' },
    button: { text: 'Click Here', url: '', style: 'primary', open_in_new_tab: false },
    separator: { style: 'line' },
    custom_html: { html: '' },
    legends_testimonials: {},
  };
  return { ...(defaults[type] || {}) };
};

// Legacy layout values for backward compatibility (kept for existing pages)
export const LEGACY_LAYOUTS = ['layout_1', 'layout_2', 'layout_3', 'layout_5'];
