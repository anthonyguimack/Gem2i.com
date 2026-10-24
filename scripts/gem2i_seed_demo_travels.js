// Beta demo (2026-10-23): 3 extra test trips + the new T2 fields on the legacy Tomorrowland row, so
// /travels and /travels/:slug can be judged with real-looking content. Prices/packages are DEMO values.
// Run on the box: mongosh gem2i_cms --quiet scripts/gem2i_seed_demo_travels.js
// Re-runnable: removes its own rows first. Undo: db.gem_section_items.deleteMany({seed:'gem2i_demo_travels_2026-10-23'})
// and $unset the demo fields on the Tomorrowland row (listed in TOMORROW below).
const SEED = 'gem2i_demo_travels_2026-10-23';
const now = new Date().toISOString();
const F = '/api/uploads/gem2i/legacy/images_festivals/photo/';
const L = (en, es) => ({ en, es: es || en });

db.gem_section_items.deleteMany({ seed: SEED });

const TOMORROW = {
  status: 'last', nights: 4, price_from: L('$1,290'), spots_total: 50, spots_taken: 39, points: 250,
  departure_date: '2027-07-17', departure_from: L('Miami · Madrid · Lima'), slug: 'tomorrowland',
  includes: L('Full Madness pass\nHotel 4★ · Brussels\nDaily shuttle to the festival\nFlights (Gold package)\nGEM2i welcome party\nTravel insurance',
    'Pase Full Madness\nHotel 4★ · Bruselas\nShuttle diario al festival\nVuelos (paquete Gold)\nFiesta de bienvenida GEM2i\nSeguro de viaje'),
  packages: L('Silver | $1,290 | Pass + hotel + shuttle\nGold | $2,450 | Silver + flights + welcome party\nPlatinum | $3,900 | Gold + Comfort pass + private transfers',
    'Silver | $1,290 | Pase + hotel + shuttle\nGold | $2,450 | Silver + vuelos + fiesta de bienvenida\nPlatinum | $3,900 | Gold + pase Comfort + traslados privados'),
  itinerary: L('Day 1 · Thu 17 | Arrival in Brussels, check-in and GEM2i welcome party\nDay 2 · Fri 18 | Festival day 1 · shuttle 12:00 · return 01:30\nDay 3 · Sat 19 | Festival day 2 · meet & greet at the GEM2i point\nDay 4 · Sun 20 | Festival day 3 · closing ceremony\nDay 5 · Mon 21 | Brunch and check-out',
    'Día 1 · Jue 17 | Llegada a Bruselas, check-in y fiesta de bienvenida GEM2i\nDía 2 · Vie 18 | Festival día 1 · shuttle 12:00 · regreso 01:30\nDía 3 · Sáb 19 | Festival día 2 · meet & greet en el punto GEM2i\nDía 4 · Dom 20 | Festival día 3 · ceremonia de cierre\nDía 5 · Lun 21 | Brunch y check-out'),
  gallery: F + '1518136932.png', gallery_2: F + '1517430743.png', gallery_3: F + '1570741257.png',
  demo_fields: SEED,
};
print('tomorrowland', db.gem_section_items.updateOne(
  { section: 'gem_travels', 'title.en': /tomorrow/i }, { $set: { ...TOMORROW, updated_at: now } }).modifiedCount);

const base = db.gem_section_items.find({ section: 'gem_travels' }).sort({ order: -1 }).limit(1).toArray()[0];
let order = (base && base.order) || 1;
const add = (r) => db.gem_section_items.insertOne({
  id: require('crypto').randomUUID(), section: 'gem_travels', order: ++order, visible: true,
  ...r, seed: SEED, created_at: now, updated_at: now });

add({
  title: L('Ultra Music Festival'), slug: 'ultra-miami', status: 'open',
  dates: L('March 27 / 28 / 29', '27 / 28 / 29 de marzo'), departure_date: '2027-03-26',
  address: L('Bayfront Park, Miami, United States', 'Bayfront Park, Miami, Estados Unidos'),
  image: F + '1518136932.png',
  description: L('<p>Three days at Bayfront Park with the biggest names in electronic music, the Resistance stage and every Miami Music Week party around it. GEM2i members get the pass, a hotel in Brickell and access to our members lounge.</p>',
    '<p>Tres días en Bayfront Park con los nombres más grandes de la música electrónica, el escenario Resistance y todas las fiestas de la Miami Music Week. Los miembros de GEM2i tienen el pase, hotel en Brickell y acceso a nuestro lounge.</p>'),
  nights: 3, price_from: L('$890'), spots_total: 60, spots_taken: 28, points: 180, departure_from: L('Lima · Bogotá · Madrid'),
  includes: L('3-day GA pass\nHotel 4★ · Brickell\nAirport transfers\nGEM2i members lounge', 'Pase GA 3 días\nHotel 4★ · Brickell\nTraslados aeropuerto\nLounge de miembros GEM2i'),
  packages: L('GA | $890 | Pass + hotel + transfers\nVIP | $1,690 | VIP pass + hotel + lounge', 'GA | $890 | Pase + hotel + traslados\nVIP | $1,690 | Pase VIP + hotel + lounge'),
  itinerary: L('Day 1 · Thu 26 | Arrival, check-in, Miami Music Week party\nDay 2 · Fri 27 | Festival day 1\nDay 3 · Sat 28 | Festival day 2\nDay 4 · Sun 29 | Festival day 3 · closing',
    'Día 1 · Jue 26 | Llegada, check-in, fiesta Miami Music Week\nDía 2 · Vie 27 | Festival día 1\nDía 3 · Sáb 28 | Festival día 2\nDía 4 · Dom 29 | Festival día 3 · cierre'),
  map_url: 'https://www.openstreetmap.org/export/embed.html?bbox=-80.20%2C25.76%2C-80.17%2C25.79&layer=mapnik',
});
add({
  title: L('EDC Las Vegas'), slug: 'edc-las-vegas', status: 'open',
  dates: L('May 14 / 15 / 16', '14 / 15 / 16 de mayo'), departure_date: '2027-05-13',
  address: L('Las Vegas Motor Speedway, Nevada, United States', 'Las Vegas Motor Speedway, Nevada, Estados Unidos'),
  image: F + '1517430743.png',
  description: L('<p>Electric Daisy Carnival: under the electric sky from dusk to dawn, art cars, carnival rides and eight stages in the desert. We stay on the Strip with a nightly shuttle to the speedway.</p>',
    '<p>Electric Daisy Carnival: bajo el cielo eléctrico del atardecer al amanecer, art cars, atracciones y ocho escenarios en el desierto. Nos alojamos en el Strip con shuttle cada noche al circuito.</p>'),
  nights: 4, price_from: L('$1,050'), spots_total: 40, spots_taken: 19, points: 200, departure_from: L('Miami · Mexico City · Lima'),
  includes: L('3-night GA+ pass\nHotel on the Strip\nNightly shuttle\nPool party GEM2i', 'Pase GA+ 3 noches\nHotel en el Strip\nShuttle nocturno\nPool party GEM2i'),
  packages: L('GA+ | $1,050 | Pass + hotel + shuttle\nVIP | $1,890 | VIP pass + suite + shuttle', 'GA+ | $1,050 | Pase + hotel + shuttle\nVIP | $1,890 | Pase VIP + suite + shuttle'),
  itinerary: L('Day 1 · Thu 13 | Arrival on the Strip\nDay 2 · Fri 14 | EDC night 1 · shuttle 18:00\nDay 3 · Sat 15 | Pool party + EDC night 2\nDay 4 · Sun 16 | EDC night 3\nDay 5 · Mon 17 | Check-out',
    'Día 1 · Jue 13 | Llegada al Strip\nDía 2 · Vie 14 | EDC noche 1 · shuttle 18:00\nDía 3 · Sáb 15 | Pool party + EDC noche 2\nDía 4 · Dom 16 | EDC noche 3\nDía 5 · Lun 17 | Check-out'),
  map_url: 'https://www.openstreetmap.org/export/embed.html?bbox=-115.03%2C36.26%2C-114.99%2C36.29&layer=mapnik',
});
add({
  title: L('Oasis Festival'), slug: 'oasis-marrakech', status: 'soon',
  dates: L('September 10 / 11 / 12', '10 / 11 / 12 de septiembre'), departure_date: '2027-09-09',
  address: L('The Source, Marrakech, Morocco', 'The Source, Marrakech, Marruecos'),
  image: F + '1516128182.png',
  description: L('<p>A boutique house and techno festival in a garden at the foot of the Atlas mountains: pools, sunsets and a crowd from all over the world. Riad stay in the medina.</p>',
    '<p>Un festival boutique de house y techno en un jardín a los pies del Atlas: piscinas, atardeceres y gente de todo el mundo. Alojamiento en riad dentro de la medina.</p>'),
  nights: 4, price_from: L('$1,150'), spots_total: 30, spots_taken: 0, points: 200, departure_from: L('Madrid · Barcelona'),
  includes: L('Weekend pass\nRiad in the medina\nDaily transfers\nDesert sunset trip', 'Pase de fin de semana\nRiad en la medina\nTraslados diarios\nExcursión al desierto'),
  packages: L('Riad | $1,150 | Pass + riad + transfers\nPremium | $1,980 | Premium pass + boutique hotel + desert trip', 'Riad | $1,150 | Pase + riad + traslados\nPremium | $1,980 | Pase premium + hotel boutique + desierto'),
  map_url: 'https://www.openstreetmap.org/export/embed.html?bbox=-8.06%2C31.57%2C-8.02%2C31.60&layer=mapnik',
});
print('travels', db.gem_section_items.countDocuments({ section: 'gem_travels' }));
