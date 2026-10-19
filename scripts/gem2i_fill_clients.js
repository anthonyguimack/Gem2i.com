// One-shot (2026-10-19): fill the homepage Clients section with real copy.
// Run on the box: mongosh gem2i_cms --quiet scripts/gem2i_fill_clients.js
// Backup first: /opt/_port_backups/clients_before_fill_<ts>.json (done by the caller).
const now = new Date().toISOString();

db.gem_section_configs.updateOne({ section: 'gem_clients_cfg' }, { $set: {
  eyebrow: { en: 'Clients', es: 'Clientes' },
  title: { en: 'Brands that trust us', es: 'Marcas que confían en nosotros' },
  subtitle: {
    en: 'Since 1993 we have run campaigns, launches and nightlife activations for global spirits houses, promoters and entertainment brands, side by side with our regional partners in more than 17 markets.',
    es: 'Desde 1993 hemos realizado campañas, lanzamientos y activaciones de vida nocturna para casas de licores globales, promotoras y marcas de entretenimiento, junto a nuestros socios regionales en más de 17 mercados.',
  },
  max_items: '12',
  cta_text: { en: 'Work with us', es: 'Trabaja con nosotros' },
  cta_url: '/#contact',
  cta_new_tab: false,
  updated_at: now,
} }, { upsert: true });

const fill = {
  'BK Society': { description: 'Lifestyle & events · New York' },
  'Chivas Regal': { description: 'Premium Scotch whisky · Brand activations', url: 'https://www.chivas.com/' },
  'Norules': { description: 'Event promoter · Spain', url: 'http://norules.es' },
  'DJ College': { description: 'DJ & music production school' },
  'Technologic NY': { description: 'Electronic music events · New York' },
  'Jhonnie Walker': { title: 'Johnnie Walker', description: 'Scotch whisky · Nightlife campaigns', url: 'https://www.johnniewalker.com' },
};
for (const [title, set] of Object.entries(fill)) {
  const r = db.gem_clients.updateOne({ title, publish: '1' }, { $set: { ...set, updated_at: now } });
  print(title, r.modifiedCount);
}
