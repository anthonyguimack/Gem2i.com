// Beta demo content for the Norules /media page (Section Manager → "Media page — videos" + "— press"), EN/ES.
// Videos = official festival / club channels on YouTube (oEmbed-checked 2026-10-26, embeddable).
// Press rows use FICTIONAL outlets on purpose (no invented headlines attributed to real media).
// Re-runnable: replaces only the rows carrying this seed tag. Run on the box:
//   mongosh gem2i_cms --quiet scripts/gem2i_seed_demo_media.js
// Remove: db.gem_section_items.deleteMany({seed:'gem2i_demo_media_2026-10-26'});
//         db.gem_section_configs.deleteMany({seed:'gem2i_demo_media_2026-10-26'})
const SEED = 'gem2i_demo_media_2026-10-26';
const now = new Date().toISOString();
const L = (en, es) => ({ en, es: es || en });
const yt = (id) => `https://www.youtube.com/watch?v=${id}`;

if (!db.gem_section_configs.findOne({ section: 'gem_media' })) {
  db.gem_section_configs.insertOne({
    section: 'gem_media', seed: SEED, created_at: now,
    eyebrow: L('Media', 'Media'),
    title: L('Watch & read', 'Mira y lee'),
    subtitle: L('Aftermovies, sets and interviews from the nights we live — and what the press says about them.',
      'Aftermovies, sets y entrevistas de las noches que vivimos, y lo que dice la prensa.'),
  });
}
if (!db.gem_section_configs.findOne({ section: 'gem_press' })) {
  db.gem_section_configs.insertOne({ section: 'gem_press', seed: SEED, created_at: now, title: L('In the press', 'En la prensa') });
}

const AFTER = L('Aftermovie', 'Aftermovie');
const SET = L('DJ set', 'DJ set');
const TALK = L('Interview', 'Entrevista');
const VIDEOS = [
  ['ULTRA MIAMI 2025 — Into Hyperspace', '5eDxz3cLyHw', AFTER],
  ['Ushuaïa Ibiza 2025 — The Aftermovie', 'uDfq8zPUoEk', AFTER],
  ['EDC Las Vegas 2026 — Official Aftermovie', 'JaU7FNpCrlo', AFTER],
  ['Awakenings Summer Festival 2022', 'c-oaLJVjVnM', AFTER],
  ['Tomorrowland 2015 — Official Aftermovie', 'HuAxVfZasUk', AFTER],
  ['Martin Garrix — Ushuaïa Ibiza 2025', 'xAPM5InP6NQ', AFTER],
  ['Solomun — Boiler Room Tulum', 'bk6Xst6euQk', SET],
  ['Fred again.. — Boiler Room London', 'c0-hvjV2A5Y', SET],
  ['Charlotte de Witte — Awakenings 2025', 'm1SvbXLYEEc', SET],
  ['Indira Paganotto — DJ Mag ADE 2025', 'gxDqqqGo1WU', TALK],
];

const PRESS = [
  ['Night Notes Magazine', L('How a members portal is rewriting the guest list', 'Cómo un portal de miembros está reescribiendo la guest list'), L('Feature', 'Reportaje'), L('Oct 2026', 'Oct 2026')],
  ['Bassline Weekly', L('Ten festivals to plan your 2027 around', 'Diez festivales para planificar tu 2027'), L('List', 'Lista'), L('Sep 2026', 'Sep 2026')],
  ['The Booth Report', L('Promoters on QR passes: no more paper at the door', 'Promotores y pases QR: se acabó el papel en la puerta'), L('Interview', 'Entrevista'), L('Aug 2026', 'Ago 2026')],
  ['Club Culture Review', L('From Miami to Ibiza: one calendar for the season', 'De Miami a Ibiza: un calendario para toda la temporada'), L('Opinion', 'Opinión'), L('Jul 2026', 'Jul 2026')],
];

db.gem_section_items.deleteMany({ section: { $in: ['gem_media', 'gem_press'] }, seed: SEED });
db.gem_section_items.insertMany(VIDEOS.map(([title, id, type], i) => ({
  id: require('crypto').randomUUID(), section: 'gem_media', order: i + 1, visible: true,
  title: L(title), video_url: yt(id), type, duration: '',
  seed: SEED, demo: true, created_at: now,
})));
db.gem_section_items.insertMany(PRESS.map(([outlet, title, kind, date], i) => ({
  id: require('crypto').randomUUID(), section: 'gem_press', order: i + 1, visible: true,
  outlet: L(outlet), title, kind, date, url: '',
  seed: SEED, demo: true, created_at: now,
})));
print('gem_media items:', db.gem_section_items.countDocuments({ section: 'gem_media' }),
  '· gem_press items:', db.gem_section_items.countDocuments({ section: 'gem_press' }));
