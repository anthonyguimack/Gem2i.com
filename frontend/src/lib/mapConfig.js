// Centralized map tile URL configuration based on admin language setting
// All map components import getTileUrl() from here

const TILE_URLS = {
  local:   'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  en:      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  es:      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  fr:      'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
  de:      'https://tile.openstreetmap.de/{z}/{x}/{y}.png',
  pt:      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  it:      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  ja:      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  zh:      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  ru:      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  ar:      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
};

const TILE_ATTRIBUTIONS = {
  local:   '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>',
  en:      '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
  fr:      '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> France',
  de:      '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> DE',
};

export const MAP_LANGUAGES = [
  { value: 'local', label: 'Local (default OpenStreetMap)' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish / Espa\u00f1ol' },
  { value: 'fr', label: 'French / Fran\u00e7ais' },
  { value: 'de', label: 'German / Deutsch' },
  { value: 'pt', label: 'Portuguese / Portugu\u00eas' },
  { value: 'it', label: 'Italian / Italiano' },
  { value: 'ja', label: 'Japanese' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ru', label: 'Russian' },
  { value: 'ar', label: 'Arabic' },
];

export function getTileUrl(lang) {
  return TILE_URLS[lang] || TILE_URLS['en'];
}

export function getTileAttribution(lang) {
  return TILE_ATTRIBUTIONS[lang] || TILE_ATTRIBUTIONS['en'];
}
