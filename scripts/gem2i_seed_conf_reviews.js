// Sample content for the home "Conference reviews" band (Section Manager →
// Conference reviews), EN/ES. Example names — replace with real reviews.
// Re-runnable (replaces only this seed's rows). Run on the box:
//   mongosh gem2i_cms --quiet scripts/gem2i_seed_conf_reviews.js
// Remove: db.gem_section_items.deleteMany({seed:'gem2i_conf_reviews_2026-10-21'})
const SEED = 'gem2i_conf_reviews_2026-10-21';
const now = new Date().toISOString();

if (!db.gem_section_configs.findOne({ section: 'gem_conf_reviews' })) {
  db.gem_section_configs.insertOne({
    section: 'gem_conf_reviews', seed: SEED, created_at: now,
    eyebrow: { en: 'Reviews', es: 'Opiniones' },
    title: { en: 'Conference review', es: 'Opiniones de conferencias' },
    subtitle: { en: 'Here is what participants are saying.', es: 'Lo que dicen los asistentes.' },
    bg_image: '/api/uploads/gem2i/legacy/images_conferences/images/1412174875.jpg',
    bg_overlay: 80,
  });
}

const R = [
  ['Laura Méndez', 'Booking agent', 'Amsterdam Dance Event',
   'Five days that are worth the whole year: we closed two tours and met the venues we work with today.',
   'Cinco días que valen todo el año: cerramos dos giras y conocimos a los venues con los que trabajamos hoy.'],
  ['Daniel Ortega', 'Festival promoter', 'EDMbiz',
   'The panels on festival economics changed how we price tickets. Practical, honest and full of real numbers.',
   'Los paneles sobre economía de festivales cambiaron cómo fijamos precios. Prácticos, honestos y con cifras reales.'],
  ['Sophie Turner', 'Label manager', 'Brighton Music Conference',
   'Small enough to talk to everyone, big enough to matter. We signed our next three artists there.',
   'Lo bastante pequeña para hablar con todos y lo bastante grande para importar. Allí firmamos a nuestros próximos tres artistas.'],
  ['Marco Rossi', 'Club owner', 'Electronic Music Conference',
   'GEM2i put us in the right rooms: by the second day we had our season line-up confirmed.',
   'GEM2i nos puso en las salas correctas: el segundo día ya teníamos confirmado el line-up de la temporada.'],
];

db.gem_section_items.deleteMany({ section: 'gem_conf_reviews', seed: SEED });
db.gem_section_items.insertMany(R.map(([name, role, conf, en, es], i) => ({
  id: require('crypto').randomUUID(), section: 'gem_conf_reviews', order: i + 1, visible: true,
  name, role, conference: conf, text: { en, es }, image: '',
  seed: SEED, created_at: now,
})));
print('gem_conf_reviews items:', db.gem_section_items.countDocuments({ section: 'gem_conf_reviews' }));
