import React from 'react';
import { useSocialCatalog, resolveKey, SocialIcon } from '../../../lib/socialCatalog';

// Brand discs for the member's social row (reference: the "Portfolio" card).
// ⚠ Colours are NOT in the shared catalog (it carries key/label/svg/share only),
// so this small map is the one hand-kept piece — anything missing falls back to
// the Velzon navy, which is a deliberate neutral rather than a wrong brand colour.
const BRAND = {
  facebook: '#1877f2', x: '#0f1419', linkedin: '#0a66c2', instagram: '#e1306c',
  youtube: '#ff0000', whatsapp: '#25d366', telegram: '#229ed9', tiktok: '#010101',
  pinterest: '#e60023', github: '#181717', dribbble: '#ea4c89', behance: '#1769ff',
  reddit: '#ff4500', discord: '#5865f2', twitch: '#9146ff', medium: '#000000',
  spotify: '#1db954', threads: '#000000', snapchat: '#fffc00', vimeo: '#1ab7ea',
  paypal: '#003087', venmo: '#3d95ce', cashme: '#00d632', zelle: '#6d1ed4',
  website: '#405189', email: '#405189',
};
// Brands whose disc is too light for a white glyph.
const DARK_GLYPH = new Set(['snapchat']);

/**
 * Icon-only social card. Renders ONLY the networks the member actually filled in
 * — an empty URL means the network is not shown at all (and if none are filled,
 * the whole card disappears rather than leaving an empty shell).
 */
export default function SocialLinksCard({ links, title = 'Social Links', testId = 'social-links-card' }) {
  const { byKey } = useSocialCatalog();

  // ⚠ Coerce to array: some member/sponsor docs store `social_links` as an object
  // (legacy/imported data), and `(x || [])` would NOT guard a truthy non-array —
  // `.filter` then throws and blanks the whole page. Array.isArray is the real gate.
  const items = (Array.isArray(links) ? links : [])
    .filter(l => l && typeof l.url === 'string' && l.url.trim())
    .map(l => {
      const key = resolveKey(byKey, l);
      const entry = key ? byKey[key] : null;
      return {
        key: key || l.platform || l.icon || 'link',
        label: entry?.label || l.platform || l.icon || 'Link',
        svg: entry?.svg,
        url: l.url.trim(),
      };
    });

  if (items.length === 0) return null;

  return (
    <div className="ma2-card" data-testid={testId}>
      <div className="ma2-card-body">
        <h2 className="ma2-card-title mb-4">{title}</h2>
        <div className="flex flex-wrap gap-2">
          {items.map((it, i) => {
            const bg = BRAND[it.key] || '#405189';
            return (
              <a key={`${it.key}-${i}`} href={it.url} target="_blank" rel="noopener noreferrer"
                className="ma2-social-chip" title={it.label} aria-label={it.label}
                style={{ backgroundColor: bg, color: DARK_GLYPH.has(it.key) ? '#212529' : '#fff' }}
                data-testid={`social-chip-${it.key}`}>
                <SocialIcon svg={it.svg} size={16} />
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
