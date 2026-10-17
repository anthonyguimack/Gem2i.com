import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import * as lucide from 'lucide-react';
import { ArrowRight, Check, Quote, Linkedin, Twitter, Instagram, Globe, Calendar, MapPin } from 'lucide-react';
import { useT } from '../../lib/i18n';
import { normalizeRichText } from '../../lib/richText';
import { gemImg } from './GemCatalogBits';

/**
 * gem2i template — renderers for the Section Manager sections (ported in
 * behaviour from AUX-1.0 components/AurexSections.js, restyled for gem2i:
 * night surfaces, the gem2i blue as accent, kicker-over-title headings).
 * Every component takes `{ config, items }` from /api/public/aurex/{section}
 * and renders nothing while it has no content, so an empty section never
 * leaves a hole in the home page.
 */

const ACCENT = 'var(--color-accent, #3287B7)';
const BODY = 'var(--color-body-text, #9AA6B2)';
const CARD = 'var(--color-card-bg, #0D1721)';
const BORDER = 'var(--color-card-border, rgba(255,255,255,0.08))';

export function GemIcon({ name, className = 'w-6 h-6' }) {
  if (!name) return null;
  const key = name.split(/[-_\s]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
  const Comp = lucide[key] || lucide[name];
  return Comp ? <Comp className={className} aria-hidden="true" /> : null;
}

export function GemHeading({ eyebrow, title, subtitle, action }) {
  const tt = useT();
  const e = tt(eyebrow); const t = tt(title); const s = tt(subtitle);
  if (!e && !t && !s && !action) return null;
  return (
    <div className="flex items-end justify-between gap-6 flex-wrap">
      <div className="max-w-3xl">
        {e && <p className="text-xs font-medium uppercase tracking-[0.3em] mb-1.5" style={{ color: ACCENT }}>{e}</p>}
        {t && <h2 className="text-white font-bold" style={{ fontSize: 'clamp(1.6rem, 3.2vw, 2.5rem)', textWrap: 'balance' }}>{t}</h2>}
        {s && <p className="mt-4 text-sm md:text-[15px] leading-[1.85]" style={{ color: BODY, textWrap: 'pretty' }}>{s}</p>}
      </div>
      {action}
    </div>
  );
}

export function GemCta({ text, url, newTab, className = '' }) {
  const tt = useT();
  const label = tt(text);
  if (!label || !url) return null;
  const cls = `inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-white ${className}`;
  const style = { color: 'var(--color-link, #5FB2E0)' };
  const inner = <>{label} <ArrowRight className="w-3.5 h-3.5" /></>;
  if (newTab || /^https?:\/\//.test(url)) {
    return <a href={url} target={newTab ? '_blank' : '_self'} rel={newTab ? 'noopener noreferrer' : undefined} className={cls} style={style}>{inner}</a>;
  }
  return <Link to={url} className={cls} style={style}>{inner}</Link>;
}

function Rich({ html, className = '' }) {
  const tt = useT();
  const v = tt(html);
  if (!v) return null;
  return <div className={`rich-text-content text-sm leading-[1.85] ${className}`} style={{ color: BODY }}
    dangerouslySetInnerHTML={{ __html: normalizeRichText ? normalizeRichText(v) : v }} />;
}

const Wrap = ({ children, testid, narrow }) => (
  <div className={`${narrow ? 'max-w-5xl' : 'max-w-7xl'} mx-auto px-6 md:px-10 py-20 md:py-28`} data-testid={testid}>{children}</div>
);

// ── Target audience ─────────────────────────────────────────────────────────
export function GemAudience({ config = {}, items = [] }) {
  const tt = useT();
  if (!items.length) return null;
  return (
    <Wrap testid="gem2i-audience">
      <GemHeading eyebrow={config.eyebrow} title={config.title} subtitle={config.subtitle} />
      <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map(it => (
          <div key={it.id} className="rounded-sm p-6" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
            <span className="inline-flex w-11 h-11 items-center justify-center rounded-sm mb-5" style={{ backgroundColor: 'rgba(50,135,183,0.12)', color: ACCENT }}>
              <GemIcon name={it.icon || 'sparkles'} className="w-5 h-5" />
            </span>
            {tt(it.eyebrow) && <p className="text-[11px] uppercase tracking-[0.25em] mb-1" style={{ color: ACCENT }}>{tt(it.eyebrow)}</p>}
            <h3 className="text-white text-lg font-semibold mb-2">{tt(it.title)}</h3>
            <Rich html={it.description} />
          </div>
        ))}
      </div>
      <div className="mt-10"><GemCta text={config.cta_text} url={config.cta_url} newTab={config.cta_new_tab} /></div>
    </Wrap>
  );
}

// ── Numbered steps (Our Process / Methodology) ──────────────────────────────
export function GemSteps({ config = {}, items = [], testid = 'gem2i-process' }) {
  const tt = useT();
  if (!items.length) return null;
  return (
    <Wrap testid={testid}>
      <GemHeading eyebrow={config.eyebrow} title={config.title} subtitle={config.subtitle} />
      <ol className={`mt-12 grid grid-cols-1 ${items.length > 3 ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'} gap-12 md:gap-10`}>
        {items.map((s, i) => (
          <li key={s.id || i}>
            <span className="block text-5xl font-bold leading-none mb-5 tabular-nums" style={{ color: ACCENT, opacity: 0.9 }}>{s.step_number || i + 1}</span>
            <h3 className="text-white text-lg font-semibold mb-3">{tt(s.title)}</h3>
            <Rich html={s.description} />
          </li>
        ))}
      </ol>
    </Wrap>
  );
}

// ── Pricing ─────────────────────────────────────────────────────────────────
function features(raw) {
  if (Array.isArray(raw)) return raw;
  return String(raw || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
}
export function GemPricing({ config = {}, items = [] }) {
  const tt = useT();
  const [annual, setAnnual] = useState(false);
  if (!items.length) return null;
  const hasAnnual = config.show_toggle && items.some(p => p.price_annual);
  return (
    <Wrap testid="gem2i-pricing">
      <GemHeading eyebrow={config.eyebrow} title={config.title} subtitle={config.subtitle}
        action={hasAnnual ? (
          <div className="inline-flex rounded-sm overflow-hidden" style={{ border: `1px solid ${BORDER}` }} role="group">
            {[false, true].map(a => (
              <button key={String(a)} type="button" onClick={() => setAnnual(a)} aria-pressed={annual === a}
                className="px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors"
                style={annual === a ? { backgroundColor: ACCENT, color: '#fff' } : { color: BODY }}>
                {a ? tt({ en: 'Annual', es: 'Anual' }) : tt({ en: 'Monthly', es: 'Mensual' })}
              </button>
            ))}
          </div>
        ) : null} />
      <div className={`mt-12 grid grid-cols-1 ${{ 1: 'md:grid-cols-1 max-w-md', 2: 'md:grid-cols-2' }[items.length] || 'md:grid-cols-3'} gap-6`}>
        {items.map(p => {
          const price = annual && p.price_annual ? p.price_annual : p.price;
          return (
            <div key={p.id} className="rounded-sm p-7 flex flex-col"
              style={{ backgroundColor: p.is_featured ? 'rgba(50,135,183,0.10)' : CARD, border: `1px solid ${p.is_featured ? ACCENT : BORDER}` }}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-white text-lg font-semibold">{tt(p.name)}</h3>
                {tt(p.badge) && <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-sm" style={{ backgroundColor: ACCENT, color: '#fff' }}>{tt(p.badge)}</span>}
              </div>
              <p className="mt-4 text-white tabular-nums">
                <span className="text-4xl font-bold">{price}</span>
                <span className="ml-1 text-sm" style={{ color: BODY }}>{p.currency} {tt(p.period)}</span>
              </p>
              {tt(p.description) && <p className="mt-2 text-sm" style={{ color: BODY }}>{tt(p.description)}</p>}
              <ul className="mt-6 space-y-2.5 flex-1">
                {features(tt(p.features)).map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-white/85"><Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: ACCENT }} />{f}</li>
                ))}
              </ul>
              {tt(p.cta_text) && p.cta_url && (
                <a href={p.cta_url} target={p.cta_new_tab ? '_blank' : '_self'} rel={p.cta_new_tab ? 'noopener noreferrer' : undefined}
                  className="mt-7 text-center px-5 py-2.5 text-sm font-semibold rounded-sm transition-opacity hover:opacity-85"
                  style={p.is_featured ? { backgroundColor: ACCENT, color: '#fff' } : { border: `1px solid ${ACCENT}`, color: '#fff' }}>
                  {tt(p.cta_text)}
                </a>
              )}
            </div>
          );
        })}
      </div>
    </Wrap>
  );
}

// ── Team ────────────────────────────────────────────────────────────────────
const SOCIAL_ICONS = { linkedin: Linkedin, twitter: Twitter, x: Twitter, instagram: Instagram };
export function GemTeam({ config = {}, items = [] }) {
  const tt = useT();
  if (!items.length) return null;
  const max = parseInt(config.max_visible, 10) || items.length;
  return (
    <Wrap testid="gem2i-team">
      <GemHeading eyebrow={config.eyebrow} title={config.title} subtitle={config.subtitle}
        action={config.show_view_all ? <GemCta text={config.view_all_text} url={config.view_all_url} newTab={config.view_all_new_tab} /> : null} />
      <div className="mt-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
        {items.slice(0, max).map(m => {
          const socials = Object.entries(m.social_links || {}).filter(([, u]) => u);
          return (
            <div key={m.id}>
              <div className="aspect-[4/5] rounded-sm overflow-hidden mb-4" style={{ backgroundColor: CARD }}>
                {m.photo_url && <img src={gemImg(m.photo_url)} alt={tt(m.name)} className="w-full h-full object-cover" loading="lazy" />}
              </div>
              <h3 className="text-white font-semibold">{tt(m.name)}</h3>
              <p className="text-xs uppercase tracking-[0.2em] mt-0.5" style={{ color: ACCENT }}>{tt(m.role)}</p>
              {socials.length > 0 && (
                <div className="mt-3 flex gap-3">
                  {socials.map(([k, u]) => {
                    const Icon = SOCIAL_ICONS[k] || Globe;
                    return <a key={k} href={u} target="_blank" rel="noopener noreferrer" aria-label={k} className="transition-colors hover:text-white" style={{ color: BODY }}><Icon className="w-4 h-4" /></a>;
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Wrap>
  );
}

// ── Video ───────────────────────────────────────────────────────────────────
function embedUrl(url, autoplay) {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}${autoplay ? '?autoplay=1&mute=1' : ''}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}${autoplay ? '?autoplay=1&muted=1' : ''}`;
  return null;
}
export function GemVideo({ config = {}, items = [] }) {
  const tt = useT();
  const src = embedUrl(config.video_url, config.autoplay);
  if (!src && !config.video_url) return null;
  const ratio = { '16:9': '56.25%', '4:3': '75%', '21:9': '42.85%', '1:1': '100%' }[config.aspect_ratio] || '56.25%';
  return (
    <Wrap testid="gem2i-video">
      <GemHeading eyebrow={config.eyebrow} title={config.title} subtitle={config.subtitle} />
      <div className="mt-10 relative w-full rounded-sm overflow-hidden bg-black" style={{ paddingTop: ratio }}>
        {src ? (
          <iframe src={src} title={tt(config.title) || 'video'} className="absolute inset-0 w-full h-full" loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
        ) : (
          <video src={gemImg(config.video_url)} poster={gemImg(config.poster_url) || undefined} controls className="absolute inset-0 w-full h-full object-cover" />
        )}
      </div>
      {items.length > 0 && (
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8">
          {items.map(it => (
            <div key={it.id} className="flex gap-3">
              <span style={{ color: ACCENT }}><GemIcon name={it.icon || 'star'} className="w-5 h-5" /></span>
              <div><h3 className="text-white font-semibold">{tt(it.title)}</h3><Rich html={it.description} /></div>
            </div>
          ))}
        </div>
      )}
    </Wrap>
  );
}

// ── Logo strip (Partners / Clients) ─────────────────────────────────────────
export function GemLogos({ config = {}, items = [], testid }) {
  const tt = useT();
  if (!items.length) return null;
  return (
    <Wrap testid={testid}>
      <GemHeading eyebrow={config.eyebrow} title={config.title} subtitle={config.subtitle}
        action={<GemCta text={config.cta_text} url={config.cta_url} newTab={config.cta_new_tab} />} />
      <div className="mt-10 flex flex-wrap items-center gap-x-12 gap-y-8">
        {items.map(l => {
          const img = <img src={gemImg(l.logo_url || l.image)} alt={tt(l.name) || ''} className="h-10 w-auto object-contain opacity-70 transition-opacity group-hover:opacity-100" loading="lazy" />;
          return l.link_url
            ? <a key={l.id || l.name} href={l.link_url} target={l.link_target || '_blank'} rel="noopener noreferrer" className="group">{img}</a>
            : <span key={l.id || l.name} className="group">{img}</span>;
        })}
      </div>
    </Wrap>
  );
}

// ── Testimonials (items from CMS → Testimonials, header from the Section Manager) ──
export function GemTestimonials({ config = {}, items = [] }) {
  const tt = useT();
  if (!items.length) return null;
  return (
    <div style={{ backgroundColor: 'var(--color-section-bg, #0A121A)' }}>
      <Wrap testid="gem2i-testimonials">
        <GemHeading eyebrow={config.eyebrow} title={config.title || { en: 'What people say', es: 'Lo que dicen' }} subtitle={config.subtitle} />
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.slice(0, 6).map(t => (
            <figure key={t.id} className="rounded-sm p-6 flex flex-col" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
              <Quote className="w-6 h-6 mb-4" style={{ color: ACCENT }} aria-hidden="true" />
              <blockquote className="text-white/85 text-[15px] leading-[1.8] flex-1">{tt(t.content)}</blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                {t.image && <img src={gemImg(t.image)} alt="" className="w-10 h-10 rounded-full object-cover" loading="lazy" />}
                <span><span className="block text-white text-sm font-semibold">{tt(t.name)}</span>
                  <span className="block text-xs" style={{ color: BODY }}>{tt(t.title)}</span></span>
              </figcaption>
            </figure>
          ))}
        </div>
        <div className="mt-10"><GemCta text={config.cta_text} url={config.cta_url} newTab={config.cta_new_tab} /></div>
      </Wrap>
    </div>
  );
}

// ── Catalog strip (events / artists / venues) ───────────────────────────────
export function GemCatalogStrip({ config = {}, items = [], fallbackTitle, testid, square }) {
  const tt = useT();
  if (!items.length) return null;
  return (
    <section className="max-w-7xl mx-auto px-6 md:px-10 py-16" data-testid={testid}>
      <GemHeading eyebrow={config.eyebrow} title={config.title || fallbackTitle} subtitle={config.subtitle}
        action={<GemCta text={config.cta_text} url={config.cta_url} newTab={config.cta_new_tab} />} />
      <div className="mt-10 flex gap-6 overflow-x-auto pb-4 snap-x">
        {items.map((it, i) => (
          <Link key={it.url || i} to={it.url || '#'} className="shrink-0 w-48 group snap-start">
            <div className={`${square ? 'aspect-square' : 'aspect-[3/4]'} rounded-sm overflow-hidden mb-3`} style={{ backgroundColor: CARD }}>
              {it.image && <img src={it.image} alt={tt(it.title) || ''} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 motion-reduce:transition-none" />}
            </div>
            <p className="text-white/85 text-sm font-medium group-hover:text-white transition-colors line-clamp-2">{tt(it.title)}</p>
            {it.meta && (
              <p className="text-xs mt-0.5 inline-flex items-center gap-1" style={{ color: BODY }}>
                {it.metaIcon === 'date' ? <Calendar className="w-3 h-3" /> : it.metaIcon === 'place' ? <MapPin className="w-3 h-3" /> : null}{it.meta}
              </p>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}

// ── Contact call-to-action ──────────────────────────────────────────────────
export function GemContactBand() {
  const tt = useT();
  return (
    <section className="py-16" style={{ backgroundColor: 'var(--color-section-bg, #0A121A)' }} data-testid="gem2i-contact-band">
      <div className="max-w-5xl mx-auto px-6 md:px-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <h2 className="text-white font-semibold" style={{ fontSize: 'clamp(1.4rem, 2.6vw, 2rem)', textWrap: 'balance' }}>
          {tt({ en: "Let's build your next event together", es: 'Construyamos juntos tu próximo evento' })}
        </h2>
        <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('gem2i:open-contact'))}
          className="shrink-0 px-6 py-3 text-sm font-semibold uppercase tracking-wider rounded-sm transition-opacity hover:opacity-85"
          style={{ backgroundColor: ACCENT, color: '#fff' }}>
          {tt({ en: 'Contact Us', es: 'Contáctanos' })}
        </button>
      </div>
    </section>
  );
}

// ── News ticker (Section Manager → News Ticker): comma-separated phrases ────
export function GemTicker({ config = {} }) {
  const tt = useT();
  const phrases = String(tt(config.phrases) || '').split(',').map(x => x.trim()).filter(Boolean);
  if (!phrases.length) return null;
  const row = [...phrases, ...phrases, ...phrases];
  return (
    <div className="gem-ticker overflow-hidden py-3 border-y" style={{ borderColor: BORDER, backgroundColor: 'var(--color-section-bg, #0A121A)' }}
      data-testid="gem2i-ticker" aria-label={phrases.join(', ')}>
      <div className="gem-ticker-track flex w-max gap-10 whitespace-nowrap" aria-hidden="true">
        {[0, 1].map(n => (
          <div key={n} className="flex gap-10 shrink-0">
            {row.map((p, i) => (
              <span key={i} className="text-xs font-semibold uppercase tracking-[0.3em] inline-flex items-center gap-10" style={{ color: i % 2 ? BODY : '#fff' }}>
                {p}<span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ACCENT }} />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Our Locations (maps from CMS → Maps; header from the Section Manager) ──
export function GemLocations({ config = {}, maps = [] }) {
  const tt = useT();
  if (!maps.length) return null;
  return (
    <Wrap testid="gem2i-locations">
      <GemHeading eyebrow={config.eyebrow} title={config.title || { en: 'Our locations', es: 'Nuestras ubicaciones' }} subtitle={config.subtitle} />
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {maps.map(m => (
          <Link key={m.id} to={`/map/${m.slug}`} className="group rounded-sm overflow-hidden" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
            <div className="aspect-[16/10] overflow-hidden" style={{ backgroundColor: '#0A121A' }}>
              {m.cover_image && <img src={gemImg(m.cover_image)} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 motion-reduce:transition-none" />}
            </div>
            <div className="p-5">
              <h3 className="text-white font-semibold inline-flex items-center gap-2"><MapPin className="w-4 h-4" style={{ color: ACCENT }} />{tt(m.title)}</h3>
            </div>
          </Link>
        ))}
      </div>
    </Wrap>
  );
}

// ── Gallery (images from CMS → Gallery; header + CTA from the Section Manager) ──
export function GemGallery({ config = {}, items = [] }) {
  const tt = useT();
  if (!items.length) return null;
  return (
    <Wrap testid="gem2i-gallery">
      <GemHeading eyebrow={config.eyebrow} title={config.title || { en: 'Gallery', es: 'Galería' }} subtitle={config.subtitle}
        action={<GemCta text={config.cta_text || { en: 'View all', es: 'Ver todo' }} url={config.cta_url || '/gallery'} newTab={config.cta_new_tab} />} />
      <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.slice(0, 8).map((g, i) => (
          <figure key={g.id} className={`relative overflow-hidden rounded-sm ${i === 0 ? 'col-span-2 row-span-2' : ''}`} style={{ backgroundColor: CARD }}>
            <img src={gemImg(g.image)} alt={tt(g.title) || ''} loading="lazy" className="w-full h-full object-cover aspect-square" />
          </figure>
        ))}
      </div>
    </Wrap>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Approved home designs (2026-10-16): Intro I-2 · Featured F-1 · Services S-2.
// Shared by the three gem2i templates until one gets its own variant.
// ════════════════════════════════════════════════════════════════════════════
const DEFAULT_INTRO_IMG = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1400&q=80';
const DEFAULT_FEATURED_IMG = {
  '/venues': 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=900&q=80',
  '/events': 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=900&q=80',
  '/artists': 'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=900&q=80',
};

function openContact(e) {
  e.preventDefault();
  window.dispatchEvent(new CustomEvent('gem2i:open-contact'));
}

// ── I-2 · Foto + texto + sello «Since» ──────────────────────────────────────
export function GemIntroPhoto({ intro }) {
  const tt = useT();
  if (!intro) return null;
  const img = gemImg(intro.image) || DEFAULT_INTRO_IMG;
  const since = intro.since || '1993';
  return (
    <section style={{ backgroundColor: 'var(--color-section-bg, #0A121A)' }} data-testid="gem2i-intro">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-20 md:py-28 grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">
        <div className="relative">
          <div className="aspect-[4/3.4] rounded-2xl overflow-hidden" style={{ backgroundColor: CARD }}>
            <img src={img} alt="" loading="lazy" className="w-full h-full object-cover" />
          </div>
          <div className="absolute -right-3 sm:-right-7 bottom-8 w-28 h-28 sm:w-32 sm:h-32 rounded-full flex flex-col items-center justify-center text-center text-white"
            style={{ backgroundColor: ACCENT }} aria-label={`${tt({ en: 'Since', es: 'Desde' })} ${since}`}>
            <span className="text-[10px] sm:text-[11px] tracking-[0.25em] uppercase">{tt({ en: 'Since', es: 'Desde' })}</span>
            <span className="text-2xl sm:text-3xl font-bold tabular-nums">{since}</span>
          </div>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.32em]" style={{ color: 'var(--color-link, #5FB2E0)' }}>{tt(intro.kicker) || tt({ en: 'Who we are', es: 'Quiénes somos' })}</p>
          <h2 className="text-white font-bold leading-[1.08] tracking-[-0.02em] mt-4 mb-6" style={{ fontSize: 'clamp(1.9rem, 3.4vw, 2.85rem)', textWrap: 'balance' }}>{tt(intro.heading)}</h2>
          <p className="text-[15px] leading-[1.85]" style={{ color: BODY, textWrap: 'pretty' }}>{tt(intro.text)}</p>
          <div className="mt-8 flex flex-wrap gap-3.5">
            <Link to={intro.cta_url || '/membership-enrollment'} className="gem-press inline-flex px-6 py-3 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90" style={{ backgroundColor: ACCENT }}>
              {tt(intro.cta_text) || tt({ en: 'Join GEM2i', es: 'Únete a GEM2i' })}
            </Link>
            <a href="#services" className="gem-press inline-flex px-6 py-3 rounded-full text-sm font-medium text-white border border-white/55 transition-colors hover:bg-white/10">
              {tt({ en: 'Our services', es: 'Nuestros servicios' })}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── F-1 · Tres tarjetas altas con foto ──────────────────────────────────────
export function GemFeaturedCards({ items = [], heading }) {
  const tt = useT();
  if (!items.length) return null;
  return (
    <section className="max-w-7xl mx-auto px-6 md:px-10 py-20 md:py-28" data-testid="gem2i-featured">
      <GemHeading eyebrow={heading?.kicker || items[0]?.kicker || { en: 'Featured', es: 'Destacados' }}
        title={heading?.title || { en: 'Explore the scene', es: 'Explora la escena' }} />
      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
        {items.map((f, i) => {
          const img = gemImg(f.image) || DEFAULT_FEATURED_IMG[f.url] || DEFAULT_INTRO_IMG;
          const inner = (
            <>
              <img src={img} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transition-none" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(4,8,12,0) 30%, rgba(4,8,12,.94) 100%)' }} />
              <div className="absolute left-6 right-6 bottom-6 lg:left-7 lg:right-7 lg:bottom-7">
                <h3 className="text-white font-bold tracking-[-0.01em] capitalize" style={{ fontSize: 'clamp(1.6rem, 2.4vw, 2.1rem)' }}>{String(tt(f.title) || '').toLowerCase()}</h3>
                <p className="mt-2 text-sm leading-[1.7] line-clamp-3" style={{ color: BODY }}>{tt(f.text)}</p>
                {f.url && (
                  <span className="mt-4 inline-flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.14em] transition-transform duration-200 group-hover:translate-x-1" style={{ color: 'var(--color-link, #5FB2E0)' }}>
                    {tt({ en: 'Explore', es: 'Explorar' })} <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
            </>
          );
          const cls = 'group relative block h-[420px] lg:h-[500px] rounded-2xl overflow-hidden';
          return f.url
            ? <Link key={i} to={f.url} className={cls} style={{ backgroundColor: CARD }} data-testid={`gem2i-featured-${i}`}>{inner}</Link>
            : <div key={i} className={cls} style={{ backgroundColor: CARD }}>{inner}</div>;
        })}
      </div>
    </section>
  );
}

// ── S-2 · Rejilla de tarjetas con icono + tarjeta de contacto ───────────────
const SERVICE_ICONS = ['target', 'megaphone', 'gem', 'building-2', 'mic-2', 'sparkles', 'calendar-check', 'handshake'];
export function GemServicesGrid({ services, banner }) {
  const tt = useT();
  const items = (services?.items || []).map(it => (it && typeof it === 'object' && (it.title || it.text) ? it : { title: it }));
  if (!items.length) return null;
  const cards = items.map((it, i) => ({ ...it, icon: it.icon || SERVICE_ICONS[i % SERVICE_ICONS.length] }));
  const ctaText = tt(banner?.text) || tt({ en: 'Need strategic planning?', es: '¿Necesitas planificación estratégica?' });
  // The contact card takes the 4th slot (top-right) so it reads early on desktop.
  const slots = [...cards.slice(0, 3), { contact: true }, ...cards.slice(3)];
  return (
    <section id="services" style={{ backgroundColor: 'var(--color-section-bg, #0A121A)' }} data-testid="gem2i-services">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-20 md:py-28">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-medium uppercase tracking-[0.32em]" style={{ color: 'var(--color-link, #5FB2E0)' }}>{[tt(services.kicker), tt(services.title)].filter(Boolean).join(' ') || tt({ en: 'Our services', es: 'Nuestros servicios' })}</p>
          <h2 className="text-white font-bold tracking-[-0.02em] mt-3" style={{ fontSize: 'clamp(1.9rem, 3.4vw, 2.85rem)', textWrap: 'balance' }}>
            {tt(services.subtitle) || tt({ en: 'Everything an event needs', es: 'Todo lo que un evento necesita' })}
          </h2>
        </div>
        <ul className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          {slots.map((c, i) => c.contact ? (
            <li key="contact" className="rounded-2xl p-7 flex flex-col justify-between gap-6 min-h-[220px]" style={{ backgroundColor: ACCENT }}>
              <p className="text-white text-xl font-bold leading-snug" style={{ textWrap: 'balance' }}>{ctaText}</p>
              <a href="#contact" onClick={openContact} className="gem-press self-start inline-flex items-center gap-2 bg-white rounded-full px-5 py-2.5 text-[13px] font-semibold" style={{ color: '#04080C' }} data-testid="gem2i-services-contact">
                {tt({ en: 'Contact us', es: 'Contáctanos' })} <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </li>
          ) : (
            <li key={i} className="gem-service-card rounded-2xl p-7 min-h-[220px]" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
              <span className="inline-flex w-11 h-11 items-center justify-center rounded-xl" style={{ backgroundColor: 'rgba(50,135,183,0.12)', color: 'var(--color-link, #5FB2E0)' }}>
                <GemIcon name={c.icon} className="w-5 h-5" />
              </span>
              <h3 className="text-white text-[17px] font-semibold leading-snug mt-5" style={{ textWrap: 'balance' }}>{tt(c.title)}</h3>
              {tt(c.text) && <p className="mt-2 text-[13px] leading-[1.7]" style={{ color: BODY }}>{tt(c.text)}</p>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
