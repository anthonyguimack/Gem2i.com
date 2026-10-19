// One-shot (2026-10-19): sample gem2i copy for CMS → About (shown on /about).
// Replaces the fork text ("ABOUT LEGACY / Smart and effective business agency").
// Run on the box: mongosh gem2i_cms --quiet scripts/gem2i_about_sample.js
// Backup first: /opt/_port_backups/about_before_sample_<ts>.json (done by the caller).
db.about.updateOne({ id: 'main' }, { $set: {
  label: { en: 'About us', es: 'Nosotros' },
  title: { en: 'Three decades behind the night', es: 'Tres décadas detrás de la noche' },
  description: {
    en: '<p>GEM2i\'s origins date back to an entertainment and promotions partnership first established in 1993. In 2002 it was reorganized to serve different segments and demographics of the nightlife and live-music business.</p><p>With our proprietary business development methodology we connect promoters, festivals, venues and artists in more than 17 markets across North America, South America, Europe and Asia, designing strategies that fit our clients and their audiences.</p><p>Today GEM2i is a private membership network: guest lists, QR e-passes and e-tickets for the best events, festivals and conferences in the world.</p>',
    es: '<p>Los orígenes de GEM2i se remontan a una alianza de entretenimiento y promociones creada en 1993. En 2002 se reorganizó para atender distintos segmentos y públicos del negocio de la vida nocturna y la música en vivo.</p><p>Con nuestra metodología propia de desarrollo de negocio conectamos promotoras, festivales, venues y artistas en más de 17 mercados de Norteamérica, Sudamérica, Europa y Asia, con estrategias a la medida de nuestros clientes y sus públicos.</p><p>Hoy GEM2i es una red privada de miembros: guest lists, e-passes QR y e-tickets para los mejores eventos, festivales y conferencias del mundo.</p>',
  },
  image: '/api/uploads/gem2i/site/gem_intro.jpg',
  stats: [
    { value: '1993', label: { en: 'First partnership', es: 'Primera alianza' } },
    { value: '17+', label: { en: 'Markets on 4 continents', es: 'Mercados en 4 continentes' } },
    { value: '1,700+', label: { en: 'Events on the platform', es: 'Eventos en la plataforma' } },
    { value: '500+', label: { en: 'Artists in our catalog', es: 'Artistas en el catálogo' } },
  ],
  sample: 'gem2i_about_sample_2026-10-19',
  updated_at: new Date().toISOString(),
} });
print('about', db.about.findOne({ id: 'main' }).title.en);
