// One-shot (2026-10-19): content of the legacy travels.php / services.php /
// partners.php (hardcoded there) → Section Manager sections on beta.
// Assets copied to /api/uploads/gem2i/pages/ from the legacy assets/images.
// Run on the box: mongosh gem2i_cms --quiet scripts/gem2i_seed_inner_pages.js
// Re-runnable: removes its own rows (seed tag) first. Backup taken by the caller.
const SEED = 'gem2i_inner_pages_2026-10-19';
const now = new Date().toISOString();
const P = '/api/uploads/gem2i/pages/';
const L = (en, es) => ({ en, es: es || en });

db.gem_section_items.deleteMany({ seed: SEED });

const cfg = (section, data) => db.gem_section_configs.updateOne(
  { section }, { $set: { section, ...data, seed: SEED, updated_at: now } }, { upsert: true });
const items = (section, rows) => rows.forEach((r, i) => db.gem_section_items.insertOne({
  id: require('crypto').randomUUID(), section, order: i + 1, visible: true,
  ...r, seed: SEED, created_at: now, updated_at: now }));

// Travels (legacy: members only, Tomorrowland row)
cfg('gem_travels', {
  eyebrow: L('Travels', 'Viajes'), title: L('Travel with GEM2i', 'Viaja con GEM2i'),
  subtitle: L('Festival trips for members: dates, the place and how to get there.', 'Viajes a festivales para miembros: fechas, el lugar y cómo llegar.'),
  members_only: true,
});
items('gem_travels', [{
  dates: L('July 18 / 19 / 20 and 25 / 26 / 27', '18 / 19 / 20 y 25 / 26 / 27 de julio'),
  title: L('TomorrowLand'),
  description: L(
    '<p>Tomorrowland is an electronic music festival that takes place in Boom (Belgium). It is organized by ID&amp;T Entertainment and Media Enterprise. The first edition of the festival was on August 14, 2005, and the first artists who participated in the event were Push (M.I.K.E.), Armin Van Buuren, Cor Fijneman, Yves Deruyter, DJ Ghost, Technoboy and Coone. Visitors of about 75 nationalities attend every year, more than 450,000 people.</p><p>The stages are surrounded by a decor that simulates a fairy tale. The festival offers a variety of sub-genres within electronic music. It also has a campsite just outside the festival site, called DreamVille, for those who wish to stay as close as possible: from a place to put your own tent to a mansion for a group. The DreamVille ticket also gives access to The Gathering, a pre-festival party on Thursday evening, often with DJs from the weekend line-up.</p>',
    '<p>Tomorrowland es un festival de música electrónica que se celebra en Boom (Bélgica). Lo organiza ID&amp;T Entertainment and Media Enterprise. La primera edición fue el 14 de agosto de 2005, con artistas como Push (M.I.K.E.), Armin Van Buuren, Cor Fijneman, Yves Deruyter, DJ Ghost, Technoboy y Coone. Cada año asisten personas de unas 75 nacionalidades, más de 450.000 en total.</p><p>Los escenarios están rodeados de una decoración que simula un cuento de hadas, y el festival ofrece una variedad de subgéneros de la música electrónica. Junto al recinto está DreamVille, el camping para quienes quieren alojarse lo más cerca posible: desde un lugar para tu propia carpa hasta una mansión para un grupo. La entrada a DreamVille incluye The Gathering, la fiesta previa del jueves por la noche, a menudo con DJs del line-up del fin de semana.</p>'),
  address: L('Dirkputstraat 260, Boom, Belgium', 'Dirkputstraat 260, Boom, Bélgica'),
  image: '/api/uploads/gem2i/legacy/images_festivals/photo/1567792515.png',
  map_url: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2505.9370103153888!2d4.382191715466784!3d51.09116997956891!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47c3ee2f461774e9%3A0xf12af43f2c284d2f!2sTomorrowland!5e0!3m2!1ses!2spe!4v1509733159392',
}]);

// Services (8 legacy services, icon + photo)
cfg('gem_services_page', {
  eyebrow: L('What we do', 'Qué hacemos'), title: L('Our services', 'Nuestros servicios'),
  subtitle: L('Marketing, media and business integration for the entertainment industry.', 'Marketing, medios e integración de negocios para la industria del entretenimiento.'),
});
items('gem_services_page', [
  ['Project Management and Strategic Development', 'Gestión de proyectos y desarrollo estratégico', 1, '/works'],
  ['Social Media & Influence Marketing', 'Redes sociales y marketing de influencia', 2],
  ['Brand Development & Management', 'Desarrollo y gestión de marca', 3],
  ['Venue Marketing Management & Consulting', 'Marketing y consultoría para venues', 4],
  ['Artist Management & Public Relations', 'Management de artistas y relaciones públicas', 5],
  ['Concept & Productions Development', 'Desarrollo de conceptos y producciones', 6],
  ['Event Management, Marketing & Consulting', 'Gestión, marketing y consultoría de eventos', 7],
  ['Sponsorship and Endorsement', 'Patrocinios y endorsement', 8],
].map(([en, es, n, url]) => ({ title: L(en, es), icon_image: `${P}service-${n}.svg`, image: `${P}work.jpg`, url: url || null })));

// Our works carousel (7 legacy works)
cfg('gem_works', {
  eyebrow: L('Portfolio', 'Portafolio'), title: L('Our works', 'Nuestros trabajos'),
  subtitle: L('At GEM2i we work hard so our clients get the best results. Review our most recent projects.', 'En GEM2i trabajamos duro para que nuestros clientes obtengan los mejores resultados. Revisa nuestros proyectos más recientes.'),
  cta_text: L('View all works', 'Ver todos los trabajos'), cta_url: '/works',
});
items('gem_works', [
  ['Electronic Events', 'Eventos electrónicos', 'conference-ade.png'],
  ['Theme Party', 'Fiesta temática', 'conference-rio.jpg'],
  ['Marketing Campaign', 'Campaña de marketing', 'conference-sonar.png'],
  ['Logo Design', 'Diseño de logos', 'conference-ultra.png'],
  ['New Yearly Marketing', 'Marketing anual', 'conference-wmc.png'],
  ['Generic Flyers', 'Flyers genéricos', 'conference-ultra.png'],
  ['Weekly Party', 'Fiesta semanal', 'conference-wmc.png'],
].map(([en, es, img]) => ({ title: L(en, es), image: P + img })));

// Partners page (legacy: members only, "Coming soon")
cfg('gem_partners_page', {
  eyebrow: L('Global', 'Global'), title: L('Partners', 'Partners'),
  subtitle: L('Brands and companies that work with GEM2i.', 'Marcas y empresas que trabajan con GEM2i.'),
  empty_text: L('Coming soon…', 'Próximamente…'), members_only: true,
});
print('travels', db.gem_section_items.countDocuments({ section: 'gem_travels', seed: SEED }),
  '/ services', db.gem_section_items.countDocuments({ section: 'gem_services_page', seed: SEED }),
  '/ works', db.gem_section_items.countDocuments({ section: 'gem_works', seed: SEED }));
