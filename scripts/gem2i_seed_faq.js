// Home FAQ starter content (Section Manager → FAQ), EN/ES. Re-runnable: replaces
// only the rows carrying this seed tag. Run on the box:
//   mongosh gem2i_cms --quiet scripts/gem2i_seed_faq.js
// Remove: db.gem_section_items.deleteMany({seed:'gem2i_faq_2026-10-21'})
const SEED = 'gem2i_faq_2026-10-21';
const now = new Date().toISOString();
const p = (t) => `<p>${t}</p>`;

if (!db.gem_section_configs.findOne({ section: 'gem_faq' })) {
  db.gem_section_configs.insertOne({
    section: 'gem_faq', seed: SEED, created_at: now,
    eyebrow: { en: 'Help', es: 'Ayuda' },
    title: { en: 'Frequently asked questions', es: 'Preguntas frecuentes' },
    subtitle: { en: 'Having difficulties? Here are the answers members ask for most.', es: '¿Tienes dudas? Aquí están las respuestas que más piden los miembros.' },
    cta_text: { en: 'Contact us', es: 'Contáctanos' }, cta_url: '/#contact',
  });
}

const QA = [
  ['Who can join GEM2i?', '¿Quién puede unirse a GEM2i?',
   'Anyone who lives the entertainment industry: artists, venues, promoters, brands and fans. Registration is free; paid plans add extra benefits.',
   'Cualquier persona que vive la industria del entretenimiento: artistas, venues, promotores, marcas y fans. El registro es gratuito; los planes de pago suman beneficios.'],
  ['How do I get on an event guest list?', '¿Cómo entro en la guest list de un evento?',
   'Log in, open the event and press "Join guest list". You receive a QR e-pass by email that is scanned at the door.',
   'Inicia sesión, abre el evento y pulsa "Unirme a la lista". Recibes un e-pass con código QR por email que se escanea en la puerta.'],
  ['How do I buy tickets?', '¿Cómo compro entradas?',
   'On events with e-tickets choose the ticket type and quantity and pay by card. Your tickets arrive by email with a QR code and stay in My Account.',
   'En los eventos con e-tickets eliges el tipo de entrada y la cantidad y pagas con tarjeta. Las entradas llegan por email con código QR y quedan en Mi Cuenta.'],
  ['Can I list my own event on GEM2i?', '¿Puedo publicar mi evento en GEM2i?',
   'Yes. Write to us from the contact section and we publish it with guest list, QR e-passes and e-tickets.',
   'Sí. Escríbenos desde la sección de contacto y lo publicamos con guest list, e-passes QR y e-tickets.'],
  ['How can I sponsor an event?', '¿Cómo puedo patrocinar un evento?',
   'Contact our team with your brand and goals; we propose events, venues and artists that fit your audience.',
   'Contacta con nuestro equipo con tu marca y objetivos; te proponemos eventos, venues y artistas que encajen con tu público.'],
];

db.gem_section_items.deleteMany({ section: 'gem_faq', seed: SEED });
db.gem_section_items.insertMany(QA.map(([qen, qes, aen, aes], i) => ({
  id: require('crypto').randomUUID(), section: 'gem_faq', order: i + 1, visible: true,
  question: { en: qen, es: qes }, answer: { en: p(aen), es: p(aes) },
  seed: SEED, created_at: now,
})));
print('gem_faq items:', db.gem_section_items.countDocuments({ section: 'gem_faq' }));
