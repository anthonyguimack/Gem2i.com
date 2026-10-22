// Demo hero slide for the Ultra-style hero (Gem2i - 01, U-2): YouTube background
// video (official Ultra Miami 2025 aftermovie, test only) + the 5 demo events
// pinned to it. Re-runnable. Run on the box:
//   mongosh gem2i_cms --quiet scripts/gem2i_seed_hero_ultra_demo.js
// Remove: db.hero_slides.deleteOne({seed:'gem2i_hero_ultra_demo_2026-10-21'});
//         db.gem_events.updateMany({}, {$pull:{hero_slide_ids:'gem2i-hero-ultra-demo'}})
const SEED = 'gem2i_hero_ultra_demo_2026-10-21';
const ID = 'gem2i-hero-ultra-demo';
const now = new Date().toISOString();

db.hero_slides.updateOne({ id: ID }, { $set: {
  id: ID, seed: SEED, name: 'Demo · Ultra-style hero (video)',
  // earliest start → first slide on the home
  date_start: '2026-01-01T00:00', date_end: '2032-12-31T23:59',
  slide_type: 'video', video_embed: 'https://www.youtube.com/watch?v=5eDxz3cLyHw',
  background: '', photo: '',
  title: { en: 'Live the festival season', es: 'Vive la temporada de festivales' },
  subtitle: { en: 'Next on GEM2i · Guest list open', es: 'Próximamente en GEM2i · Guest list abierta' },
  description: { en: 'Tickets on sale now!', es: '¡Entradas a la venta!' },
  button_text: { en: 'All events', es: 'Todos los eventos' }, button_url: '/events', window_open: 'same',
  button_2_text: '', button_2_url: '', button_3_text: '', button_3_url: '',
  assigned_pages: ['home'], audience: '', pb_personality: '',
  updated_at: now,
}, $setOnInsert: { created_at: now } }, { upsert: true });

const r = db.gem_events.updateMany({ seed: 'gem2i_demo_events_2026-10-21' }, { $addToSet: { hero_slide_ids: ID } });
print('slide upserted; events pinned:', r.matchedCount);
