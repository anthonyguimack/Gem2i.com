// ============================================================================
// Gem2i — TEST content for the Section Manager (gem2i template), 2026-10-16.
// Every doc carries seed:'gem2i_test_2026-10-16' so it can be removed with:
//   db.gem_section_configs.deleteMany({seed:'gem2i_test_2026-10-16'})
//   db.gem_section_items.deleteMany({seed:'gem2i_test_2026-10-16'})
// Idempotent: re-running replaces only the seeded docs; sections an operator
// already configured in the CMS (no seed tag) are never touched.
//
//   mongosh gem2i_cms scripts/gem2i_seed_section_manager_test.js
// ============================================================================
const SEED = 'gem2i_test_2026-10-16';
const now = new Date().toISOString();
const L = (en, es) => ({ en, es });

function config(section, doc) {
  if (db.gem_section_configs.findOne({ section, pb_personality: { $exists: false }, seed: { $ne: SEED } })) {
    print('  skip config (operator content): ' + section); return;
  }
  db.gem_section_configs.deleteMany({ section, seed: SEED });
  db.gem_section_configs.insertOne({ section, ...doc, seed: SEED, updated_at: now });
}
function items(section, rows) {
  if (db.gem_section_items.findOne({ section, pb_personality: { $exists: false }, seed: { $ne: SEED } })) {
    print('  skip items (operator content): ' + section); return;
  }
  db.gem_section_items.deleteMany({ section, seed: SEED });
  rows.forEach((r, i) => db.gem_section_items.insertOne({
    id: crypto.randomUUID(), section, order: i + 1, visible: true, ...r, seed: SEED, created_at: now,
  }));
}

// ── Target audience ──
config('aurex_audience', {
  eyebrow: L('Who it is for', 'Para quién es'), title: L('Built for the people who move the night', 'Hecho para quienes mueven la noche'),
  subtitle: L('One network for promoters, venues, artists and the crowd that follows them.', 'Una red para promotores, venues, artistas y el público que los sigue.'),
  cta_text: L('Join GEM2i', 'Únete a GEM2i'), cta_url: '/membership-enrollment',
});
items('aurex_audience', [
  { icon: 'megaphone', title: L('Promoters', 'Promotores'), description: L('<p>Guest lists, QR e-passes and e-tickets for every event you run.</p>', '<p>Listas de invitados, pases QR y e-tickets para cada evento que organizas.</p>') },
  { icon: 'building-2', title: L('Venues', 'Venues'), description: L('<p>Publish your calendar and fill the room with members who actually show up.</p>', '<p>Publica tu calendario y llena el local con miembros que sí asisten.</p>') },
  { icon: 'music', title: L('Artists & DJs', 'Artistas y DJs'), description: L('<p>Your profile, line-ups and fans in one place.</p>', '<p>Tu perfil, line-ups y fans en un solo lugar.</p>') },
]);

// ── Our process ──
config('aurex_process', { eyebrow: L('How it works', 'Cómo funciona'), title: L('From invite to the dance floor', 'De la invitación a la pista') });
items('aurex_process', [
  { step_number: 1, title: L('Join with an invite', 'Únete con una invitación'), description: L('<p>A member shares their code; you register in a minute.</p>', '<p>Un miembro comparte su código; te registras en un minuto.</p>') },
  { step_number: 2, title: L('Pick your events', 'Elige tus eventos'), description: L('<p>Browse festivals, parties and conferences worldwide.</p>', '<p>Explora festivales, fiestas y conferencias en todo el mundo.</p>') },
  { step_number: 3, title: L('Get your pass', 'Obtén tu pase'), description: L('<p>Guest list or e-ticket — your QR arrives by email.</p>', '<p>Lista de invitados o entrada: tu QR llega por correo.</p>') },
  { step_number: 4, title: L('Earn rewards', 'Gana recompensas'), description: L('<p>Invite friends and grow your community.</p>', '<p>Invita a tus amigos y haz crecer tu comunidad.</p>') },
]);

// ── Methodology (gem2i) ──
config('gem_methodology', { eyebrow: L('Methodology', 'Metodología'), title: L('The GEM2i method', 'El método GEM2i') });
items('gem_methodology', [
  { step_number: 1, icon: 'search', title: L('Discover', 'Descubrir'), description: L('<p>We map the scene: venues, artists and audiences.</p>', '<p>Mapeamos la escena: venues, artistas y audiencias.</p>') },
  { step_number: 2, icon: 'handshake', title: L('Connect', 'Conectar'), description: L('<p>We bring promoters and brands together around each event.</p>', '<p>Unimos a promotores y marcas alrededor de cada evento.</p>') },
  { step_number: 3, icon: 'trending-up', title: L('Grow', 'Crecer'), description: L('<p>Data from every pass helps the next event sell out.</p>', '<p>Los datos de cada pase ayudan a llenar el siguiente evento.</p>') },
]);

// ── Pricing ──
config('aurex_pricing', { eyebrow: L('Plans', 'Planes'), title: L('Pick your membership', 'Elige tu membresía'), show_toggle: true });
items('aurex_pricing', [
  { name: L('Member', 'Miembro'), price: '0', price_annual: '0', currency: 'USD', period: L('/ month', '/ mes'), description: L('Free with an invite', 'Gratis con invitación'),
    features: L('Guest lists\nQR e-passes\nEvent calendar', 'Listas de invitados\nPases QR\nCalendario de eventos'), cta_text: L('Join', 'Unirme'), cta_url: '/membership-enrollment' },
  { name: L('Premium', 'Premium'), price: '19', price_annual: '190', currency: 'USD', period: L('/ month', '/ mes'), description: L('For the regulars', 'Para los habituales'), badge: L('Most popular', 'Más popular'), is_featured: true,
    features: L('Everything in Member\nPriority guest lists\nMember discounts', 'Todo lo de Miembro\nListas prioritarias\nDescuentos para miembros'), cta_text: L('Go Premium', 'Ser Premium'), cta_url: '/my-account/membership' },
  { name: L('Promoter', 'Promotor'), price: '49', price_annual: '490', currency: 'USD', period: L('/ month', '/ mes'), description: L('Run your own events', 'Organiza tus eventos'),
    features: L('Event pages\nGuest-list management\nE-ticket sales', 'Páginas de eventos\nGestión de listas\nVenta de e-tickets'), cta_text: L('Contact us', 'Contáctanos'), cta_url: '/contact' },
]);

// ── Team ──
config('aurex_team', { eyebrow: L('Team', 'Equipo'), title: L('The people behind GEM2i', 'El equipo detrás de GEM2i') });
items('aurex_team', [
  { name: L('Alex Rivera', 'Alex Rivera'), role: L('Founder', 'Fundador'), photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&q=80', social_links: { linkedin: 'https://linkedin.com' } },
  { name: L('Maya Chen', 'Maya Chen'), role: L('Head of Events', 'Directora de eventos'), photo_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&q=80', social_links: { instagram: 'https://instagram.com' } },
  { name: L('Diego Torres', 'Diego Torres'), role: L('Artist Relations', 'Relación con artistas'), photo_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&q=80', social_links: {} },
  { name: L('Sara Kim', 'Sara Kim'), role: L('Partnerships', 'Alianzas'), photo_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=600&q=80', social_links: {} },
]);

// ── Video ──
config('aurex_video', { eyebrow: L('Watch', 'Mira'), title: L('Inside a GEM2i night', 'Dentro de una noche GEM2i'), video_url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk', aspect_ratio: '16:9' });

// ── Partners ──
config('aurex_partners', { eyebrow: L('Partners', 'Aliados'), title: L('Brands that party with us', 'Marcas que celebran con nosotros') });
items('aurex_partners', [
  { name: 'Partner One', logo_url: 'https://placehold.co/240x80/0D1721/9AA6B2?text=PARTNER+ONE', link_url: '' },
  { name: 'Partner Two', logo_url: 'https://placehold.co/240x80/0D1721/9AA6B2?text=PARTNER+TWO', link_url: '' },
  { name: 'Partner Three', logo_url: 'https://placehold.co/240x80/0D1721/9AA6B2?text=PARTNER+THREE', link_url: '' },
]);

// ── Headers for existing / catalog sections ──
config('aurex_services_cfg', { eyebrow: L('Services', 'Servicios'), title: L('What we do', 'Lo que hacemos') });
config('aurex_testimonials_cfg', { eyebrow: L('Testimonials', 'Testimonios'), title: L('What our members say', 'Lo que dicen nuestros miembros') });
config('gem_events_cfg', { eyebrow: L('Calendar', 'Calendario'), title: L('Upcoming events', 'Próximos eventos'), max_items: 10, cta_text: L('All events', 'Todos los eventos'), cta_url: '/events' });
config('gem_artists_cfg', { eyebrow: L('Line-ups', 'Line-ups'), title: L('Artists', 'Artistas'), max_items: 10, cta_text: L('All artists', 'Todos los artistas'), cta_url: '/artists' });
config('gem_venues_cfg', { eyebrow: L('Where it happens', 'Dónde pasa'), title: L('Venues', 'Venues'), max_items: 10, cta_text: L('All venues', 'Todos los venues'), cta_url: '/venues' });
config('gem_festivals_cfg', { eyebrow: L('Worldwide', 'En todo el mundo'), title: L('Festivals', 'Festivales'), max_items: 12 });
config('gem_conferences_cfg', { eyebrow: L('Industry', 'Industria'), title: L('Conferences', 'Conferencias'), max_items: 12 });
config('gem_clients_cfg', { eyebrow: L('Clients', 'Clientes'), title: L('Who trusts us', 'Quién confía en nosotros') });

config('news_ticker', { phrases: L('Guest lists, QR e-passes, E-tickets, Festivals, Artists, Venues, Conferences', 'Listas de invitados, Pases QR, E-tickets, Festivales, Artistas, Venues, Conferencias') });
config('aurex_locations_cfg', { eyebrow: L('Presence', 'Presencia'), title: L('Where GEM2i plays', 'Dónde suena GEM2i'), subtitle: L('Cities where our members party.', 'Ciudades donde celebran nuestros miembros.') });
config('aurex_gallery_cfg', { eyebrow: L('Moments', 'Momentos'), title: L('Gallery', 'Galería'), cta_text: L('View all', 'Ver todo'), cta_url: '/gallery' });

print('configs: ' + db.gem_section_configs.countDocuments({ seed: SEED }) + '  items: ' + db.gem_section_items.countDocuments({ seed: SEED }));
