// One-shot (2026-10-19): fill the /about CMS fields still holding fork values
// and repair double-encoded Spanish text ("MetodologÃ­a") in Section Manager.
// Run on the box: mongosh gem2i_cms --quiet scripts/gem2i_about_fill.js
// Backup first (done by the caller): about + gem_section_configs + gem_section_items.
const now = new Date().toISOString();

// 1. About: real contact phone (gem_config content), signature from the real team,
//    membership button, page-section order and section texts.
db.about.updateOne({ id: 'main' }, { $set: {
  phone: '862-201-3636',
  signature_name: { en: 'Carlos Artiles', es: 'Carlos Artiles' },
  signature_title: { en: 'Principal Manager · GEM2i', es: 'Gerente principal · GEM2i' },
  button_text: { en: 'Become a member', es: 'Hazte miembro' },
  button_url: '/membership-enrollment',
  button_open_in_new_tab: false,
  page_sections: [
    { key: 'methodology', visible: true }, { key: 'offices', visible: true },
    { key: 'team', visible: true }, { key: 'contact', visible: true },
  ],
  offices_eyebrow: { en: 'Where we are', es: 'Dónde estamos' },
  offices_title: { en: 'Five offices, one team', es: 'Cinco oficinas, un equipo' },
  cta_title: { en: 'Planning an event, a tour or a launch', es: 'Planeas un evento, una gira o un lanzamiento' },
  cta_button: { en: 'Contact us', es: 'Contáctanos' },
  updated_at: now,
} });

// 2. Methodology subtitle (was empty).
db.gem_section_configs.updateOne({ section: 'gem_methodology' }, { $set: {
  subtitle: {
    en: 'Every project follows the same three steps, from the first conversation to the night of the event.',
    es: 'Cada proyecto sigue los mismos tres pasos, desde la primera conversación hasta la noche del evento.',
  },
  updated_at: now,
} });

// 3. Repair mojibake (UTF-8 read as Latin-1) in Section Manager strings.
const fix = (v) => {
  if (typeof v === 'string') {
    if (!/[ÃÂ]/.test(v)) return v;
    try { return decodeURIComponent(escape(v)); } catch (e) { return v; }
  }
  if (Array.isArray(v)) return v.map(fix);
  if (v && typeof v === 'object' && !(v instanceof Date) && !(v instanceof ObjectId)) {
    const o = {}; for (const k of Object.keys(v)) o[k] = fix(v[k]); return o;
  }
  return v;
};
for (const coll of ['gem_section_configs', 'gem_section_items']) {
  let n = 0;
  db[coll].find({}).forEach(d => {
    const f = fix(d);
    if (JSON.stringify(f) !== JSON.stringify(d)) { db[coll].replaceOne({ _id: d._id }, f); n++; }
  });
  print(coll, 'repaired', n);
}
print('methodology es title:', db.gem_section_configs.findOne({ section: 'gem_methodology' }).eyebrow.es);
