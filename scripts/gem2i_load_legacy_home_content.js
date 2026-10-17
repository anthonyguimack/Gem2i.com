// gem2i — load the real legacy home content (gem2i.exclusivesession.com, read
// 2026-10-17) into the sections that still carried fork/test data.
// Run on the box:  mongosh gem2i_cms scripts/gem2i_load_legacy_home_content.js
// Only replaces rows tagged as test seed or the fork's sample map offices;
// anything an operator created in the CMS is left alone. Re-runnable.
const SEED = 'gem2i_legacy_home_2026-10-17';
const now = new Date().toISOString();
const uuid = () => crypto.randomUUID();

// 1) Methodology — legacy "OUR Methodology" 1·2·3
db.gem_section_items.deleteMany({ section: 'gem_methodology', seed: { $in: ['gem2i_test_2026-10-16', SEED] } });
db.gem_section_items.insertMany([
  { step: 1, icon: 'target', en: ['Goal definition', 'A well defined strategic objective and clarity statement for the benefit of all stake holders.'],
    es: ['Definición de objetivos', 'Un objetivo estratégico bien definido y una declaración clara en beneficio de todas las partes interesadas.'] },
  { step: 2, icon: 'bar-chart-3', en: ['Analysis', 'The business feasibility analysis and the process development are the keys to a sustainable and profitable enterprise.'],
    es: ['Análisis', 'El análisis de viabilidad del negocio y el desarrollo de procesos son la clave de una empresa sostenible y rentable.'] },
  { step: 3, icon: 'rocket', en: ['Implementation', 'A well drafted prototype of the business with all its working components and the efficient utilization of all resources.'],
    es: ['Implementación', 'Un prototipo del negocio bien elaborado, con todos sus componentes operativos y el uso eficiente de todos los recursos.'] },
].map(s => ({
  id: uuid(), section: 'gem_methodology', order: s.step, visible: true, step_number: s.step, icon: s.icon,
  title: { en: s.en[0], es: s.es[0] },
  description: { en: `<p>${s.en[1]}</p>`, es: `<p>${s.es[1]}</p>` },
  seed: SEED, created_at: now,
})));
db.gem_section_configs.updateOne({ section: 'gem_methodology' },
  { $set: { eyebrow: { en: 'Methodology', es: 'Metodología' }, title: { en: 'Our methodology', es: 'Nuestra metodología' }, updated_at: now } }, { upsert: true });

// 2) Services banner — legacy wording
db.gem_config.updateOne({ key: 'content' }, { $set: {
  'data.services_banner.text': { en: 'If you need Marketing service, Contact us', es: 'Si necesitas servicios de Marketing, contáctanos' },
} });

// 3) Watch — the legacy Media video (real thumbnail, so drop the temporary poster)
db.gem_section_configs.updateOne({ section: 'aurex_video' },
  { $set: { video_url: 'https://www.youtube.com/watch?v=vy-k0FopsmY', eyebrow: { en: 'Media', es: 'Media' }, updated_at: now }, $unset: { poster_url: '' } });

// 4) Where GEM2i plays — the real offices (legacy footer), replacing the fork's samples
const FORK_OFFICES = ['New York Office', 'London Hub', 'Tokyo Center', 'Dubai Office', 'Sydney Branch'];
db.map_locations.deleteMany({ map_type: 'global_business', $or: [{ name: { $in: FORK_OFFICES } }, { seed: SEED }] });
db.map_locations.insertMany([
  ['New York, USA', 40.7128, -74.006, 'Headquarters · North America & Global'],
  ['Spain', 40.4168, -3.7038, 'Europe · Commercial management'],
  ['Lima, Peru', -12.0464, -77.0428, 'South America · Corporate representative'],
  ['Buenos Aires, Argentina', -34.6037, -58.3816, 'South America · Corporate representative'],
  ['Santo Domingo, Dominican Republic', 18.4861, -69.9312, 'Central America · Corporate representative'],
].map(([name, lat, lng, description]) => ({
  id: uuid(), name, lat, lng, description, map_type: 'global_business', link: '', open_in_new_tab: false, seed: SEED, created_at: now,
})));

// 5) Team — the real people and roles from the legacy footer (no photos: the
//    fork's stock portraits would show strangers under these names)
db.gem_section_items.deleteMany({ section: 'aurex_team', seed: { $in: ['gem2i_test_2026-10-16', SEED] } });
db.gem_section_items.insertMany([
  ['Carlos Artiles', 'Principal Manager', 'Gerente principal', 'United States'],
  ['Walter Garcia', 'Business Development', 'Desarrollo de negocios', 'United States'],
  ['Kike Sanchez', 'Commercial Management', 'Gestión comercial', 'Spain'],
  ['JP See', 'Corporate Representative', 'Representante corporativo', 'Peru'],
  ['Paola Nos', 'Corporate Representative', 'Representante corporativa', 'Argentina'],
  ['Melodi Brugal', 'Corporate Representative', 'Representante corporativa', 'Dominican Republic'],
].map(([name, en, es, country], i) => ({
  id: uuid(), section: 'aurex_team', order: i + 1, visible: true,
  name: { en: name, es: name }, role: { en: `${en} · ${country}`, es: `${es} · ${country}` },
  photo_url: '', social_links: {}, seed: SEED, created_at: now,
})));

print('methodology', db.gem_section_items.countDocuments({ section: 'gem_methodology' }),
  '| team', db.gem_section_items.countDocuments({ section: 'aurex_team' }),
  '| offices', db.map_locations.countDocuments({ map_type: 'global_business' }));
