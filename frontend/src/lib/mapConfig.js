// Centralized map tile URL configuration based on admin language setting
// All map components import getTileUrl() from here

// ⚠ s140: CARTO basemaps now answer every request with an "API KEY REQUIRED"
// placeholder tile, so every map on the 6 instances (maps_language = pt → CARTO)
// showed no map. Keyless OpenStreetMap is used instead (labels in the local
// language of each place); fr/de keep their regional OSM mirrors.
const OSM = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_URLS = {
  local:   OSM,
  en:      OSM,
  es:      OSM,
  fr:      'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
  de:      'https://tile.openstreetmap.de/{z}/{x}/{y}.png',
  pt:      OSM,
  it:      OSM,
  ja:      OSM,
  zh:      OSM,
  ru:      OSM,
  ar:      OSM,
};

const TILE_ATTRIBUTIONS = {
  local:   '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>',
  en:      '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>',
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
