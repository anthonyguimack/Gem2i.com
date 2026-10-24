/* Norules template (`gem2i`) — its OWN copy of the home section designs
   (house rule 2026-10-21: every template has its own face; content is shared).
   Edit this file only for Norules; never import it from another template. */
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { NBtn, NBtnLook } from './norules/NBtn';
import * as lucide from 'lucide-react';
import { ArrowRight, Check, Quote, Linkedin, Twitter, Instagram, Globe, Calendar, MapPin, Clock } from 'lucide-react';
import { useT, useLang } from '../../lib/i18n';
import { normalizeRichText } from '../../lib/richText';
import { gemImg } from './GemCatalogBits';
import AccentTitle from './AccentTitle';
import { gemAPI } from '../../lib/api';
import { useAuth } from '../../lib/auth';

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
// Text laid over photos: never the grey body colour (contrast depends on the
// picture); near-white on a dark scrim keeps ≥ 4.5:1 on any image.
const ON_PHOTO = 'rgba(255,255,255,0.9)';

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
        {e && <p className="gem-eyebrow mb-3" style={{ color: ACCENT }}>{e}</p>}
        {t && <h2 className="text-white font-bold leading-[1.08]" style={{ fontSize: 'clamp(1.9rem, 3.6vw, 2.9rem)', textWrap: 'balance' }}><AccentTitle text={t} /></h2>}
        {s && <p className="mt-4 text-base md:text-[17px] leading-[1.7]" style={{ color: BODY, textWrap: 'pretty' }}>{s}</p>}
      </div>
      {action}
    </div>
  );
}

export function GemCta({ text, url, newTab, className = '' }) {
  const tt = useT();
  const label = tt(text);
  if (!label || !url) return null;
  // B1 (norules-buttons-links.html): "View all" links are small secondary pills with the arrow disc.
  if (newTab || /^https?:\/\//.test(url)) return <NBtn href={url} newTab={newTab} variant="s" size="sm" className={className}>{label}</NBtn>;
  return <NBtn to={url} variant="s" size="sm" className={className}>{label}</NBtn>;
}

function Rich({ html, className = '' }) {
  const tt = useT();
  const v = tt(html);
  if (!v) return null;
  return <div className={`rich-text-content text-[15px] md:text-base leading-[1.7] ${className}`} style={{ color: BODY }}
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
            <span className="inline-flex w-11 h-11 items-center justify-center rounded-sm mb-5" style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent) 12%, transparent)', color: ACCENT }}>
              <GemIcon name={it.icon || 'sparkles'} className="w-5 h-5" />
            </span>
            {tt(it.eyebrow) && <p className="text-xs uppercase tracking-[0.25em] mb-1" style={{ color: ACCENT }}>{tt(it.eyebrow)}</p>}
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

// ── Methodology as a cycle (boceto M-3) ─────────────────────────────────────
// Steps sit around a ring with the brand in the centre: Grow feeds the next
// Discover. Desktop = polar layout; < md = plain vertical list.
export function GemMethodCycle({ config = {}, items = [], brand = 'GEM2i', testid = 'gem2i-methodology' }) {
  const tt = useT();
  if (!items.length) return null;
  const n = items.length;
  const pos = (i) => {
    const a = (-90 + (360 / n) * i) * (Math.PI / 180);
    return { left: `${50 + 41 * Math.cos(a)}%`, top: `${50 + 41 * Math.sin(a)}%` };
  };
  const Step = ({ s, center }) => (
    <div className={center ? 'w-56 text-center' : ''}>
      <span className="inline-flex w-11 h-11 items-center justify-center rounded-xl" style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent) 14%, transparent)', color: ACCENT }}>
        <GemIcon name={s.icon || 'sparkles'} className="w-5 h-5" />
      </span>
      <h3 className="text-white text-lg font-semibold mt-3 mb-1">{tt(s.title)}</h3>
      <Rich html={s.description} className="!text-[15px]" />
    </div>
  );
  return (
    <Wrap testid={testid}>
      <GemHeading eyebrow={config.eyebrow} title={config.title} subtitle={config.subtitle} />
      <ol className="md:hidden mt-10 grid gap-8">
        {items.map((s, i) => <li key={s.id || i}><Step s={s} /></li>)}
      </ol>
      <div className="hidden md:block relative mx-auto mt-14" style={{ width: 640, maxWidth: '100%', aspectRatio: '1 / 1' }}>
        <div className="absolute rounded-full gem-spin-slow" style={{ inset: '22%', border: '1px dashed rgba(95,178,224,0.45)' }} aria-hidden="true" />
        <div className="absolute rounded-full flex items-center justify-center text-white font-extrabold text-2xl"
          style={{ left: '50%', top: '50%', width: 132, height: 132, transform: 'translate(-50%,-50%)', backgroundColor: ACCENT }}>{brand}</div>
        <ol>
          {items.map((s, i) => (
            <li key={s.id || i} className="absolute" style={{ ...pos(i), transform: 'translate(-50%,-50%)' }}><Step s={s} center /></li>
          ))}
        </ol>
      </div>
      <style>{`@media (prefers-reduced-motion: no-preference){.gem-spin-slow{animation:gemSpin 60s linear infinite}}@keyframes gemSpin{to{transform:rotate(360deg)}}`}</style>
    </Wrap>
  );
}

// ── Audience as an editorial list (boceto A-3) ──────────────────────────────
// No cards: one big row per profile. The active row (hover / focus) lights up
// and shows its photo; the others dim.
export function GemAudienceList({ config = {}, items = [] }) {
  const tt = useT();
  const [active, setActive] = useState(0);
  if (!items.length) return null;
  return (
    <Wrap testid="gem2i-audience">
      <GemHeading eyebrow={config.eyebrow} title={config.title} subtitle={config.subtitle} />
      <ul className="mt-12" style={{ borderBottom: `1px solid ${BORDER}` }} onMouseLeave={() => setActive(0)}>
        {items.map((it, i) => {
          const on = i === active;
          return (
            <li key={it.id || i} tabIndex={0} onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)}
              className="grid grid-cols-1 md:grid-cols-[1.2fr_1.4fr_150px] gap-3 md:gap-10 items-center py-7 md:py-8 outline-none transition-opacity duration-300 motion-reduce:transition-none"
              style={{ borderTop: `1px solid ${BORDER}`, opacity: on ? 1 : 0.5 }}>
              <span className="text-white font-bold tracking-tight leading-[1.05]" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>{tt(it.title)}</span>
              <Rich html={it.description} />
              <div className="hidden md:block h-24 rounded-xl overflow-hidden transition-[opacity,transform] duration-300 motion-reduce:transition-none"
                style={{ opacity: on && it.image ? 1 : 0, transform: on ? 'scale(1)' : 'scale(0.94)' }} aria-hidden="true">
                {it.image && <img src={gemImg(it.image)} alt="" className="w-full h-full object-cover" loading="lazy" />}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-10"><GemCta text={config.cta_text} url={config.cta_url} newTab={config.cta_new_tab} /></div>
    </Wrap>
  );
}

// ── How it works as a timeline (boceto P-1) ─────────────────────────────────
// Dots on a line; the line fills once when the section scrolls into view.
export function GemTimeline({ config = {}, items = [], testid = 'gem2i-process' }) {
  const tt = useT();
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (!('IntersectionObserver' in window)) { setSeen(true); return undefined; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0, rootMargin: "0px 0px -25% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [items.length]); // the section mounts empty and gets its steps later
  if (!items.length) return null;
  return (
    <Wrap testid={testid}>
      <GemHeading eyebrow={config.eyebrow} title={config.title} subtitle={config.subtitle} />
      <div ref={ref} className="relative mt-14 md:mt-16">
        <div className="absolute left-[11px] md:left-0 top-0 bottom-0 md:bottom-auto md:right-0 md:top-[11px] w-[2px] md:w-auto md:h-[2px]" style={{ backgroundColor: BORDER }} aria-hidden="true" />
        <div className="absolute left-[11px] md:left-0 top-0 md:top-[11px] w-[2px] md:h-[2px] md:w-full origin-top md:origin-left transition-transform duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none gem-tl-fill"
          style={{ backgroundColor: ACCENT, height: '100%', transform: seen ? 'scale(1)' : 'var(--gem-tl-off)' }} aria-hidden="true" />
        <style>{`.gem-tl-fill{--gem-tl-off:scaleY(0)}@media(min-width:768px){.gem-tl-fill{--gem-tl-off:scaleX(0);height:2px!important}.gem-tl-grid{grid-template-columns:repeat(${items.length},minmax(0,1fr))}}`}</style>
        <ol className="relative grid grid-cols-1 gap-10 md:gap-8 gem-tl-grid">
          {items.map((s, i) => (
            <li key={s.id || i} className="relative pl-12 md:pl-0">
              <span className="absolute md:static left-0 block w-6 h-6 rounded-full transition-colors duration-500 motion-reduce:transition-none"
                style={{ backgroundColor: seen ? ACCENT : 'var(--color-bg, #04080C)', border: `2px solid ${seen ? ACCENT : BORDER}`, boxShadow: seen ? '0 0 0 6px color-mix(in srgb, var(--color-accent) 20%, transparent)' : 'none', transitionDelay: `${i * 250}ms` }} aria-hidden="true" />
              <p className="md:mt-7 mb-1.5 text-[15px] tabular-nums" style={{ color: 'var(--color-link, #5FB2E0)' }}>{String(s.step_number || i + 1).padStart(2, '0')}</p>
              <h3 className="text-white text-lg font-semibold mb-2">{tt(s.title)}</h3>
              <Rich html={s.description} />
            </li>
          ))}
        </ol>
      </div>
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
                className="px-4 py-2 text-[15px] font-semibold transition-colors"
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
              style={{ backgroundColor: p.is_featured ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)' : CARD, border: `1px solid ${p.is_featured ? ACCENT : BORDER}` }}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-white text-lg font-semibold">{tt(p.name)}</h3>
                {tt(p.badge) && <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-sm" style={{ backgroundColor: ACCENT, color: '#fff' }}>{tt(p.badge)}</span>}
              </div>
              <p className="mt-4 text-white tabular-nums">
                <span className="text-4xl font-bold">{price}</span>
                <span className="ml-1 text-[15px]" style={{ color: BODY }}>{p.currency} {tt(p.period)}</span>
              </p>
              {tt(p.description) && <p className="mt-2 text-[15px]" style={{ color: BODY }}>{plainText(tt(p.description))}</p>}
              <ul className="mt-6 space-y-2.5 flex-1">
                {features(tt(p.features)).map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-[15px] text-white/85"><Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: ACCENT }} />{f}</li>
                ))}
              </ul>
              {tt(p.cta_text) && p.cta_url && (
                <a href={p.cta_url} target={p.cta_new_tab ? '_blank' : '_self'} rel={p.cta_new_tab ? 'noopener noreferrer' : undefined}
                  className="mt-7 text-center px-5 py-2.5 text-[15px] font-semibold rounded-sm transition-opacity hover:opacity-85"
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
              <blockquote className="text-white/85 text-[15px] leading-[1.8] flex-1">{plainText(tt(t.content))}</blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                {t.image && <img src={gemImg(t.image)} alt="" className="w-10 h-10 rounded-full object-cover" loading="lazy" />}
                <span><span className="block text-white text-[15px] font-semibold">{tt(t.name)}</span>
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
            <p className="text-white/85 text-[15px] font-medium group-hover:text-white transition-colors line-clamp-2">{tt(it.title)}</p>
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

// ═════════════ Catalog sections, template 01 (bocetos E-2 / R-2 / V-1 / F-2 / C-1) ═════════════
// Each takes the raw catalog rows (as /api/public/gem/<catalog> returns them)
// plus the Section Manager header config, and renders nothing when empty.

function CatalogHead({ config, fallbackTitle, allText, allUrl }) {
  return (
    <GemHeading eyebrow={config.eyebrow} title={config.title || fallbackTitle} subtitle={config.subtitle}
      action={<GemCta text={config.cta_text || allText} url={config.cta_url || allUrl} newTab={config.cta_new_tab} />} />
  );
}

function useDateParts() {
  const { lang } = useLang() || { lang: 'en' };
  return (iso) => {
    if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return null;
    const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
    return { day: d.getDate(), month: d.toLocaleDateString(lang === 'es' ? 'es' : 'en', { month: 'short' }).replace('.', '').toUpperCase() };
  };
}

const ordinal = (n) => (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'));

// "22:00:00" or "2026-11-07T22:00:00" (legacy rows) → "10:00 PM" (en) / "22:00" (es);
// anything unparseable → null.
const clock = (t, lang) => {
  const m = /(?:^|T)(\d{1,2}):(\d{2})/.exec(t || '');
  if (!m) return null;
  const h = +m[1];
  return lang === 'es' ? `${m[1].padStart(2, '0')}:${m[2]}` : `${h % 12 || 12}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`;
};

// Lowest configured ticket price ("from"), in the event's currency.
const fromPrice = (e) => {
  const prices = Object.values(e.tiers || {}).map(t => Number(t?.price)).filter(n => n > 0);
  if (!prices.length) return null;
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency: (e.payment?.currency || 'usd').toUpperCase(), maximumFractionDigits: 0 }).format(Math.min(...prices));
  } catch { return `$${Math.min(...prices)}`; }
};

// E-3 card, hover H-1 (boceto eventos-hover.html, 2026-10-21): photo under a
// brand veil with price / title / date / time / place. On hover (mouse only)
// the veil lifts, a dark shadow rises from the bottom and the text block drops
// to the bottom edge (its offset is measured: --drop), so it always sits on the
// darkest part; the CTA appears top-right. On touch the veil stays and the CTA
// sits bottom-right.
function EventPosterCard({ e, parts, lang }) {
  const tt = useT();
  const card = useRef(null);
  const info = useRef(null);
  useEffect(() => {
    const c = card.current; const i = info.current;
    if (!c || !i || typeof ResizeObserver === 'undefined') return undefined;
    const set = () => c.style.setProperty('--drop', `${Math.max(0, c.clientHeight - i.offsetHeight)}px`);
    const ro = new ResizeObserver(set);
    ro.observe(c); ro.observe(i); set();
    return () => ro.disconnect();
  }, []);
  const img = gemImg(e.image_urls?.flyer || e.image_urls?.logo);
  const p = parts(e.event_date);
  const year = (e.event_date || '').slice(0, 4);
  const price = fromPrice(e);
  const time = clock(e.open_time, lang);
  const where = e.venue?.city || e.venue?.state || e.venue?.name;
  const cta = e.type === 'eticket' || e.external_ticket_system ? { en: 'Get tickets', es: 'Comprar entradas' }
    : e.type === 'guest_list' ? { en: 'Join guest list', es: 'Unirme a la lista' } : { en: 'View event', es: 'Ver evento' };
  return (
    <Link ref={card} to={`/events/${e.slug}`} className="group relative block aspect-square rounded-2xl overflow-hidden isolate text-white" style={{ backgroundColor: CARD }}>
      {img && <img src={img} alt="" loading="lazy" className="absolute inset-0 -z-10 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transition-none" />}
      {/* Bottom shadow the text drops onto (mouse hover only). */}
      <div className="absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 ease-out [@media(hover:hover)]:group-hover:opacity-100"
        style={{ background: 'linear-gradient(180deg, rgba(4,8,12,0) 30%, rgba(4,8,12,.55) 52%, rgba(4,8,12,.94) 78%, rgba(4,8,12,.97) 100%)' }} />
      {/* Brand veil (lifts on hover). */}
      <div className="absolute inset-0 -z-10 transition-opacity duration-300 ease-out [@media(hover:hover)]:group-hover:opacity-0"
        style={{ background: `linear-gradient(160deg, color-mix(in srgb, ${ACCENT} 88%, transparent), color-mix(in srgb, ${ACCENT} 72%, #04080C))` }} />
      {price && <p className="absolute right-5 top-5 text-[22px] font-light tabular-nums transition-opacity duration-200 [@media(hover:hover)]:group-hover:opacity-0">{price}</p>}
      <div ref={info} className={`absolute inset-x-0 top-0 p-5 ${price ? 'pt-14' : ''} transition-transform duration-[380ms] ease-[cubic-bezier(.23,1,.32,1)] motion-reduce:transition-none [@media(hover:hover)]:group-hover:translate-y-[var(--drop,0px)]`}>
        <h3 className="text-[15px] font-bold leading-snug line-clamp-2">{tt(e.title)}</h3>
        <div className="mt-3 h-px bg-white/60 transition-colors [@media(hover:hover)]:group-hover:bg-white/35" />
        {p && (
          <p className="mt-3 flex items-start gap-2 leading-none">
            <span className="text-[34px] font-light tabular-nums">{p.day}{lang === 'es' ? '' : ordinal(p.day)}</span>
            <span className="text-xs leading-tight pt-1">{p.month}<br />{year}</span>
          </p>
        )}
        {time && <p className="mt-3 flex items-center gap-1.5 text-[13px]"><Clock className="w-3.5 h-3.5" />{time}</p>}
        {where && <p className="mt-1.5 flex items-center gap-1.5 text-[13px]"><MapPin className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{where}</span></p>}
      </div>
      <span className="absolute right-4 bottom-4 inline-flex items-center rounded-full px-5 py-2.5 text-sm font-semibold transition-[opacity,transform] duration-200 ease-out group-active:scale-[0.97] shadow-[0_8px_20px_-8px_rgba(0,0,0,.6)]
        [@media(hover:hover)]:bottom-auto [@media(hover:hover)]:top-4 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:-translate-y-1 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-hover:translate-y-0 [@media(hover:hover)]:group-focus-visible:opacity-100 [@media(hover:hover)]:group-focus-visible:translate-y-0"
        style={{ backgroundColor: ACCENT }}>
        {tt(cta)}
      </span>
    </Link>
  );
}

// ── E-2 Upcoming events: posters. ≤ 2 events → posters + "list your event"
// tile (as in the boceto); 3 or more → a swipeable carousel with arrows.
export function GemEventPosters({ config = {}, items = [], testid = 'gem2i-events' }) {
  const tt = useT();
  const parts = useDateParts();
  const { lang } = useLang() || { lang: 'en' };
  const track = useRef(null);
  if (!items.length) return null;
  const carousel = items.length > 2;
  const scroll = (dir) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };
  const Poster = ({ e }) => <EventPosterCard e={e} parts={parts} lang={lang} />;
  const arrows = carousel ? (
    <div className="flex items-center gap-4">
      <div className="hidden sm:flex gap-2">
        {[-1, 1].map(d => (
          <button key={d} type="button" onClick={() => scroll(d)} aria-label={d < 0 ? tt({ en: 'Previous', es: 'Anterior' }) : tt({ en: 'Next', es: 'Siguiente' })}
            className="w-10 h-10 rounded-full inline-flex items-center justify-center text-white transition-[background-color,transform] hover:bg-white/10 active:scale-95"
            style={{ border: `1px solid ${BORDER}` }}>
            <ArrowRight className={`w-4 h-4 ${d < 0 ? 'rotate-180' : ''}`} />
          </button>
        ))}
      </div>
      <GemCta text={config.cta_text || { en: 'All events', es: 'Todos los eventos' }} url={config.cta_url || '/events'} newTab={config.cta_new_tab} />
    </div>
  ) : <GemCta text={config.cta_text || { en: 'All events', es: 'Todos los eventos' }} url={config.cta_url || '/events'} newTab={config.cta_new_tab} />;
  return (
    <Wrap testid={testid}>
      <GemHeading eyebrow={config.eyebrow} title={config.title || { en: 'Upcoming events', es: 'Próximos eventos' }} subtitle={config.subtitle} action={arrows} />
      {carousel ? (
        <div ref={track} className="mt-12 flex gap-6 overflow-x-auto snap-x snap-mandatory pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map(e => <div key={e.id} className="snap-start shrink-0 w-[72%] sm:w-[42%] lg:w-[calc((100%-4.5rem)/4)]"><Poster e={e} /></div>)}
        </div>
      ) : (
        <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map(e => <Poster key={e.id} e={e} />)}
          <div className="col-span-2 rounded-2xl p-8 md:p-10 flex flex-col justify-center" style={{ border: `1px dashed ${BORDER}` }}>
            <h3 className="text-white text-2xl font-semibold mb-2.5">{tt({ en: 'Promoting an event?', es: '¿Organizas un evento?' })}</h3>
            <p className="text-[15px] leading-[1.8]" style={{ color: BODY }}>{tt({ en: 'Publish it on GEM2i with guest list, QR e-passes and e-tickets.', es: 'Publícalo en GEM2i con guest list, e-passes QR y e-tickets.' })}</p>
            <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('gem2i:open-contact'))}
              className="mt-5 self-start inline-flex items-center gap-1.5 text-[15px] font-medium transition-colors hover:text-white" style={{ color: 'var(--color-link, #5FB2E0)' }}>
              {tt({ en: 'List your event', es: 'Publica tu evento' })} <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </Wrap>
  );
}

const artistImg = (a, big) => gemImg((big && a.image_urls?.big) || a.image_urls?.small || a.image_urls?.logo || a.image_urls?.detail);

// ── R-2 Artists: one featured portrait + a grid of six.
export function GemArtistMosaic({ config = {}, items = [] }) {
  const tt = useT();
  const withImg = items.filter(a => artistImg(a));
  if (!withImg.length) return null;
  const [lead, ...rest] = withImg;
  const name = (a) => tt(a.name || a.title);
  return (
    <Wrap testid="gem2i-artists">
      <CatalogHead config={config} fallbackTitle={{ en: 'Artists', es: 'Artistas' }} allText={{ en: 'All artists', es: 'Todos los artistas' }} allUrl="/artists" />
      {/* The featured portrait stretches to the height of the 3x2 grid beside it. */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-[1fr_1.35fr] gap-5">
        <Link to={`/artists/${lead.slug}`} className="group relative block aspect-square md:aspect-auto md:h-full rounded-2xl overflow-hidden" style={{ backgroundColor: CARD }}>
          <img src={artistImg(lead, true)} alt={name(lead)} loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03] motion-reduce:transition-none" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 55%, rgba(4,8,12,0.92))' }} />
          <div className="absolute left-7 bottom-6">
            {lead.country && <p className="text-[13px] font-semibold tracking-[0.2em] uppercase" style={{ color: ON_PHOTO }}>{tt(lead.country)}</p>}
            <h3 className="text-white font-bold mt-1" style={{ fontSize: 'clamp(1.8rem, 3.4vw, 2.6rem)' }}>{name(lead)}</h3>
          </div>
        </Link>
        <div className="grid grid-cols-3 gap-5 content-start">
          {rest.slice(0, 6).map(a => (
            <Link key={a.id} to={`/artists/${a.slug}`} className="group relative block aspect-square rounded-xl overflow-hidden" style={{ backgroundColor: CARD }} title={name(a)}>
              <img src={artistImg(a)} alt={name(a)} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none" />
              <span className="absolute inset-x-0 bottom-0 px-2.5 py-2 text-[13px] font-medium text-white opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity"
                style={{ background: 'linear-gradient(180deg, transparent, rgba(4,8,12,0.9))' }}>{name(a)}</span>
            </Link>
          ))}
        </div>
      </div>
    </Wrap>
  );
}

// ── V-1 Venues: photo of the place + logo plate, name and country below.
// Venues with a photo go first; rows without any image are skipped.
export function GemVenueCards({ config = {}, items = [], limit = 3 }) {
  const tt = useT();
  const view = (v) => gemImg(v.image_urls?.view);
  const logo = (v) => gemImg(v.image_urls?.logo);
  const list = [...items.filter(v => view(v)), ...items.filter(v => !view(v) && logo(v))].slice(0, limit);
  if (!list.length) return null;
  return (
    <Wrap testid="gem2i-venues">
      <CatalogHead config={config} fallbackTitle={{ en: 'Venues', es: 'Venues' }} allText={{ en: 'All venues', es: 'Todos los venues' }} allUrl="/venues" />
      <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {list.map(v => (
          <Link key={v.id} to={`/venues/${v.slug}`} className="group block">
            <div className="aspect-[7/5] rounded-2xl overflow-hidden flex items-center justify-center" style={{ backgroundColor: CARD }}>
              {view(v)
                ? <img src={view(v)} alt={tt(v.name)} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transition-none" />
                : <img src={logo(v)} alt={tt(v.name)} loading="lazy" className="max-w-[55%] max-h-[55%] object-contain opacity-80" />}
            </div>
            <div className="flex items-center gap-3.5 mt-4">
              {logo(v) && <img src={logo(v)} alt="" className="w-12 h-12 rounded-[10px] object-contain bg-white p-1" loading="lazy" />}
              <div>
                <p className="text-white font-semibold">{tt(v.name)}</p>
                {(v.city || v.country) && <p className="text-[15px]" style={{ color: BODY }}>{[tt(v.city), tt(v.country)].filter(Boolean).join(', ')}</p>}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </Wrap>
  );
}

// ── Venues · legacy venues.php grid (approved 2026-10-17) ──────────────────
// Numbered photo tiles (4 across on desktop) with the venue logo in a white
// circle (grey logo, colour on hover). Hover / keyboard focus reveals a dark
// veil with name, location and "View details" — same as gem2i.com/venues.php.
export function GemVenueGrid({ config = {}, items = [], limit = 12 }) {
  const tt = useT();
  const view = (v) => gemImg(v.image_urls?.view);
  const logo = (v, on) => gemImg((on ? v.image_urls?.logo : v.image_urls?.logo_off) || v.image_urls?.logo);
  const list = items.filter(v => view(v)).slice(0, limit);
  if (!list.length) return null;
  return (
    // Full-bleed like gem2i.com/venues.php: heading aligned with the other
    // sections, photo grid edge to edge.
    <section className="py-20 md:py-28" data-testid="gem2i-venues">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <CatalogHead config={config} fallbackTitle={{ en: 'Venues', es: 'Venues' }} allText={{ en: 'All venues', es: 'Todos los venues' }} allUrl="/venues" />
      </div>
      <ol className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5">
        {list.map((v, i) => {
          const where = [tt(v.city), tt(v.country)].filter(Boolean).join(', ');
          return (
            <li key={v.id}>
              <Link to={`/venues/${v.slug}`} className="group relative block aspect-[4/3] overflow-hidden outline-none" style={{ backgroundColor: CARD }}
                aria-label={`${tt(v.name)}${where ? ` · ${where}` : ''}`}>
                <img src={view(v)} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 group-focus-visible:scale-105 motion-reduce:transition-none" />
                <span className="absolute left-4 top-4 z-10 min-w-[44px] h-[44px] px-2 inline-flex items-center justify-center text-white text-[19px] font-semibold tabular-nums" style={{ backgroundColor: 'var(--color-accent, #0068b3)' }}>{i + 1}</span>
                {logo(v) && (
                  <span className="absolute right-4 top-4 z-10 w-[88px] h-[88px] 2xl:w-[104px] 2xl:h-[104px] rounded-full overflow-hidden bg-white flex items-center justify-center p-3 shadow-[0_8px_20px_-8px_rgba(0,0,0,.5)]">
                    <img src={logo(v)} alt="" loading="lazy" className="max-w-full max-h-full object-contain transition-opacity duration-300 group-hover:opacity-0 group-focus-visible:opacity-0" />
                    <img src={logo(v, true)} alt="" loading="lazy" className="absolute inset-3 m-auto max-w-[calc(100%-1.5rem)] max-h-[calc(100%-1.5rem)] object-contain opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100" />
                  </span>
                )}
                <span className="absolute inset-0 flex flex-col justify-end p-6 lg:p-7 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
                  style={{ background: 'linear-gradient(180deg, rgba(4,8,12,.35) 0%, rgba(4,8,12,.9) 70%)' }}>
                  <span className="text-white text-[24px] 2xl:text-[28px] font-semibold leading-tight">{tt(v.name)}</span>
                  {where && <span className="mt-1.5 inline-flex items-center gap-1.5 text-[15px]" style={{ color: ON_PHOTO }}><MapPin className="w-4 h-4" aria-hidden="true" />{where}</span>}
                  <NBtnLook className="mt-3 self-start">{tt({ en: 'View details', es: 'Ver detalles' })}</NBtnLook>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// ── F-2 Festivals: bento (one tall, one wide, two small). Fewer than 4 →
// the grid shrinks to what there is; never an empty cell.
export function GemFestivalBento({ config = {}, items = [] }) {
  const tt = useT();
  const img = (f) => gemImg(f.image_urls?.flyer || f.image_urls?.view || f.image_urls?.logo);
  const list = items.filter(img).slice(0, 4);
  if (!list.length) return null;
  const cells = ['md:row-span-2', 'md:col-span-2', '', ''];
  const sizes = ['text-2xl md:text-[28px]', 'text-xl', 'text-base', 'text-base'];
  const cols = list.length === 1 ? 'md:grid-cols-1' : list.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-[1.4fr_1fr_1fr]';
  return (
    <Wrap testid="gem2i-festivals">
      <CatalogHead config={config} fallbackTitle={{ en: 'Festivals', es: 'Festivales' }} allText={{ en: 'All festivals', es: 'Todos los festivales' }} allUrl="/festivals" />
      <div className={`mt-12 grid grid-cols-1 ${cols} md:auto-rows-[220px] gap-4`}>
        {list.map((f, i) => (
          <Link key={f.id} to={`/festivals/${f.slug}`}
            className={`group relative block rounded-2xl overflow-hidden min-h-[220px] ${list.length >= 3 ? cells[i] : 'md:row-span-2'}`} style={{ backgroundColor: CARD }}>
            <img src={img(f)} alt={tt(f.title)} loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04] motion-reduce:transition-none" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 40%, rgba(4,8,12,0.92))' }} />
            <div className="absolute left-5 right-5 bottom-4">
              <h3 className={`text-white font-semibold ${sizes[i]}`}>{tt(f.title)}</h3>
              {i < 2 && (f.range_dates || f.event_date) && <p className="text-[15px] mt-0.5" style={{ color: ON_PHOTO }}>{tt(f.range_dates) || f.event_date}</p>}
            </div>
          </Link>
        ))}
      </div>
    </Wrap>
  );
}

// ── Conferences · CC-1 carousel (2026-10-21) ────────────────────────────────
// Every active conference in a swipeable carousel (arrows when > 4). Each card
// keeps the photo-card design (flyer, dates chip, logo plate, name, place) and
// adds a "Schedule" block fed by the CMS sessions (Conferences → Sessions).
export function GemConferenceCards({ config = {}, items = [] }) {
  const tt = useT();
  const track = useRef(null);
  const list = items.filter(c => gemImg(c.image_urls?.flyer) || gemImg(c.image_urls?.logo));
  if (!list.length) return null;
  const scroll = (dir) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };
  return (
    <Wrap testid="gem2i-conferences">
      <GemHeading eyebrow={config.eyebrow} title={config.title || { en: 'Conferences', es: 'Conferencias' }} subtitle={config.subtitle}
        action={(
          <div className="flex items-center gap-4">
            {list.length > 4 && (
              <div className="hidden sm:flex gap-2">
                {[-1, 1].map(d => (
                  <button key={d} type="button" onClick={() => scroll(d)} aria-label={d < 0 ? tt({ en: 'Previous', es: 'Anterior' }) : tt({ en: 'Next', es: 'Siguiente' })}
                    className="w-10 h-10 rounded-full inline-flex items-center justify-center text-white transition-[background-color,transform] hover:bg-white/10 active:scale-95"
                    style={{ border: `1px solid ${BORDER}` }}>
                    <ArrowRight className={`w-4 h-4 ${d < 0 ? 'rotate-180' : ''}`} />
                  </button>
                ))}
              </div>
            )}
            <GemCta text={config.cta_text || { en: 'All conferences', es: 'Todas las conferencias' }} url={config.cta_url || '/conferences'} newTab={config.cta_new_tab} />
          </div>
        )} />
      <div ref={track} className="mt-12 flex gap-6 overflow-x-auto snap-x snap-mandatory pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {list.map(c => (
          <div key={c.id} className="snap-start shrink-0 w-[80%] sm:w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-4.5rem)/4)]">
            <ConferenceCard c={c} />
          </div>
        ))}
      </div>
    </Wrap>
  );
}

// Visible sessions grouped by date, in the CMS order → [{ date, rows }].
const sessionDays = (sessions) => {
  const days = [];
  (Array.isArray(sessions) ? sessions : []).filter(s => s && s.visible !== false && s.title).forEach(s => {
    const k = s.date || '';
    let d = days.find(x => x.date === k);
    if (!d) { d = { date: k, rows: [] }; days.push(d); }
    d.rows.push(s);
  });
  return days;
};

// Rich text → one plain line; the parser also decodes entities (legacy rows carry &#39; etc.).
const plainText = (html) => (html
  ? (new DOMParser().parseFromString(html, 'text/html').body.textContent || '').replace(/\s+/g, ' ').trim()
  : '');

// One CC-1 card. With sessions: first 3 of the chosen day (Day 1/2/3 tabs when
// the conference runs several days). Without: address + a short description.
function ConferenceCard({ c }) {
  const tt = useT();
  const parts = useDateParts();
  const [day, setDay] = useState(0);
  const photo = gemImg(c.image_urls?.flyer);
  const logo = gemImg(c.image_urls?.logo);
  const url = `/conferences/${c.slug}`;
  const days = sessionDays(c.sessions);
  const current = days[Math.min(day, days.length - 1)];
  const dayLabel = (iso) => { const p = parts(iso); return p ? `${p.day} ${p.month}` : ''; };
  const place = [tt(c.city), tt(c.country)].filter(Boolean).join(', ');
  const about = plainText(tt(c.description));
  const LINK = 'var(--color-link, #5FB2E0)';
  return (
    <div className="h-full flex flex-col rounded-2xl overflow-hidden" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
      <Link to={url} tabIndex={-1} aria-hidden="true" className="group relative block aspect-[7/5] overflow-hidden" style={{ backgroundColor: 'var(--color-section-bg, #0A121A)' }}>
        {photo
          ? <img src={photo} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transition-none" />
          : <div className="absolute inset-0 bg-white flex items-center justify-center p-8"><img src={logo} alt="" className="max-h-full max-w-full object-contain" /></div>}
        {(c.range_dates || c.event_date) && (
          <span className="absolute left-4 top-4 text-[13px] font-semibold text-white px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(4,8,12,.72)' }}>
            {tt(c.range_dates) || c.event_date}
          </span>
        )}
      </Link>
      <div className="relative px-5 pb-5 pt-10 flex-1 flex flex-col">
        {photo && logo && (
          <span className="absolute -top-8 left-5 w-16 h-16 rounded-xl bg-white flex items-center justify-center p-2 shadow-[0_10px_24px_-10px_rgba(0,0,0,.6)]">
            <img src={logo} alt="" loading="lazy" className="max-w-full max-h-full object-contain" />
          </span>
        )}
        <h3 className="text-white text-lg font-semibold leading-snug"><Link to={url} className="transition-colors hover:text-[color:var(--color-link,#5FB2E0)]">{tt(c.title)}</Link></h3>
        {place && <p className="mt-1.5 inline-flex items-center gap-1.5 text-[15px]" style={{ color: BODY }}><MapPin className="w-4 h-4 shrink-0" aria-hidden="true" />{place}</p>}

        <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${BORDER}` }}>
          {current ? (
            <>
              <p className="flex items-baseline justify-between gap-2 text-[11px] font-bold tracking-[0.14em] uppercase" style={{ color: BODY }}>
                {tt({ en: 'Schedule', es: 'Programa' })}
                {current.date && <span className="text-sm font-semibold normal-case tracking-normal" style={{ color: LINK }}>{dayLabel(current.date)}</span>}
              </p>
              {days.length > 1 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5" role="tablist">
                  {days.map((d, i) => (
                    <button key={d.date || i} type="button" role="tab" aria-selected={d === current} onClick={() => setDay(i)}
                      className="px-2.5 py-1 rounded-full text-xs font-semibold text-white transition-[background-color,transform] duration-150 active:scale-95"
                      style={d === current ? { backgroundColor: ACCENT } : { border: `1px solid ${BORDER}` }}>
                      {tt({ en: 'Day', es: 'Día' })} {i + 1}
                    </button>
                  ))}
                </div>
              )}
              <ul className="mt-1.5">
                {current.rows.slice(0, 3).map((s, i) => (
                  <li key={s.key || i} className="grid grid-cols-[6.25rem_1fr] gap-2.5 py-2 text-sm" style={i ? { borderTop: `1px dashed ${BORDER}` } : undefined}>
                    <time className="font-semibold tabular-nums" style={{ color: LINK }}>{[s.start, s.end].filter(Boolean).join(' – ')}</time>
                    <span className="text-white/90 leading-snug">{s.title}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="text-sm leading-[1.6] space-y-1" style={{ color: BODY }}>
              {tt(c.address) && <p className="line-clamp-1">{tt(c.address)}</p>}
              {about && <p className="line-clamp-3">{about}</p>}
            </div>
          )}
        </div>
        <Link to={url} className="mt-auto pt-4 self-start inline-flex items-center gap-1.5 text-sm font-semibold transition-colors hover:text-white" style={{ color: LINK }}>
          {current ? tt({ en: 'Full schedule', es: 'Programa completo' }) : tt({ en: 'View conference', es: 'Ver conferencia' })} <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

// ═════════════ Lower home sections, template 01 (bocetos W-1 / P-1 / T-1 / Q-1 / G-2 / B-1 / K-1) ═════════════

// Shared: close on Escape, lock page scroll while an overlay is open.
function useOverlay(open, onClose, onKey) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const h = (e) => { if (e.key === 'Escape') onClose(); else if (onKey) onKey(e); };
    window.addEventListener('keydown', h);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', h); };
  }, [open, onClose, onKey]);
}

const ytId = (url) => (url || '').match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/)?.[1];

// ── W-1 Watch: full-screen cover (100% width × viewport height) + play. The
// player loads only on click and plays in place, filling the same section
// (no modal); the X / Escape returns to the cover.
export function GemVideoCover({ config = {} }) {
  const tt = useT();
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return undefined;
    const h = (e) => { if (e.key === 'Escape') setPlaying(false); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [playing]);
  if (!config.video_url) return null;
  const id = ytId(config.video_url);
  const poster = gemImg(config.poster_url) || (id ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg` : null);
  const src = embedUrl(config.video_url, true);
  return (
    <section data-testid="gem2i-video" className="relative overflow-hidden h-[100svh] min-h-[420px]" style={{ backgroundColor: '#000' }}>
      {playing ? (
        <>
          {src
            ? <iframe src={src.replace('mute=1', 'mute=0')} title={tt(config.title) || 'video'} className="absolute inset-0 w-full h-full border-0" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
            : <video src={gemImg(config.video_url)} autoPlay controls playsInline className="absolute inset-0 w-full h-full object-contain bg-black" />}
          <button type="button" onClick={() => setPlaying(false)} aria-label={tt({ en: 'Close video', es: 'Cerrar video' })}
            className="absolute top-4 right-4 z-10 w-11 h-11 rounded-full inline-flex items-center justify-center text-white bg-black/60 hover:bg-black/80 transition-[background-color,transform] active:scale-95">
            <lucide.X className="w-6 h-6" />
          </button>
        </>
      ) : (
        <>
          {poster && <img src={poster} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-70"
            // YouTube answers a missing maxres thumbnail with a 120px grey placeholder: fall back to hq.
            onLoad={e => { if (id && e.currentTarget.naturalWidth <= 120 && !e.currentTarget.src.includes('hqdefault')) e.currentTarget.src = `https://img.youtube.com/vi/${id}/hqdefault.jpg`; }} />}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(4,8,12,0.25), rgba(4,8,12,0.85))' }} />
          <div className="relative h-full flex flex-col items-center justify-center text-center px-6 gap-7">
            <button type="button" onClick={() => setPlaying(true)} aria-label={tt({ en: 'Play video', es: 'Reproducir video' })}
              className="w-[84px] h-[84px] rounded-full inline-flex items-center justify-center text-white transition-transform duration-200 hover:scale-105 active:scale-95"
              style={{ backgroundColor: ACCENT, boxShadow: '0 0 0 12px color-mix(in srgb, var(--color-accent) 22%, transparent)' }}>
              <lucide.Play className="w-8 h-8 ml-1" fill="currentColor" />
            </button>
            {tt(config.title) && <h2 className="text-white font-bold max-w-3xl" style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', textWrap: 'balance' }}>{tt(config.title)}</h2>}
            {tt(config.subtitle) && <p className="max-w-xl text-base md:text-[17px]" style={{ color: 'rgba(255,255,255,0.75)' }}>{tt(config.subtitle)}</p>}
          </div>
        </>
      )}
    </section>
  );
}

// ── Pricing · P1: a slider asks how many nights out a month; the matching plan rises and is tagged «For you».
export function GemPricingTiers({ config = {}, items = [] }) {
  const tt = useT();
  const [annual, setAnnual] = useState(false);
  const [nights, setNights] = useState(2);
  if (!items.length) return null;
  const n = items.length;
  const hasAnnual = config.show_toggle && items.some(p => p.price_annual);
  // 0–2 nights → first plan, 3–8 → middle, 9+ → last (spread evenly for other plan counts).
  const pick = n === 1 ? 0 : n === 3 ? (nights <= 2 ? 0 : nights <= 8 ? 1 : 2) : Math.min(n - 1, Math.floor((nights / 13) * n));
  const cols = { 1: 'md:grid-cols-1 max-w-md mx-auto', 2: 'md:grid-cols-2 max-w-4xl mx-auto' }[n] || 'md:grid-cols-3';
  return (
    <Wrap testid="gem2i-pricing">
      <GemHeading eyebrow={config.eyebrow} title={config.title} subtitle={config.subtitle}
        action={hasAnnual ? (
          <div className="inline-flex gap-1 p-1 rounded-full" style={{ border: `1px solid ${BORDER}` }} role="group">
            {[false, true].map(a => (
              <button key={String(a)} type="button" onClick={() => setAnnual(a)} aria-pressed={annual === a}
                className="px-4 py-2 rounded-full text-[15px] font-semibold transition-colors"
                style={annual === a ? { backgroundColor: ACCENT, color: '#fff' } : { color: BODY }}>
                {a ? tt({ en: 'Annual', es: 'Anual' }) : tt({ en: 'Monthly', es: 'Mensual' })}
              </button>
            ))}
          </div>
        ) : null} />
      {n > 1 && (
        <div className="mt-11 rounded-[28px] px-6 py-7 md:px-9 md:py-8" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
          <label htmlFor="gem-nights" className="text-white font-extrabold tracking-[-0.02em]" style={{ fontSize: 'clamp(1.25rem, 2.2vw, 1.8rem)' }}>
            {tt({ en: 'How many nights out a month?', es: '¿Cuántas noches sales al mes?' })} <output style={{ color: ACCENT }}>{nights >= 12 ? '12+' : nights}</output>
          </label>
          <input id="gem-nights" type="range" min="0" max="12" value={nights} onChange={e => setNights(+e.target.value)} className="mt-5 w-full h-7" style={{ accentColor: 'var(--color-accent, #3287B7)' }} />
          <div className="flex justify-between text-[12.5px] font-semibold" style={{ color: BODY }}>
            <span>{tt({ en: 'Rarely', es: 'Casi nunca' })}</span><span>{tt({ en: 'Every weekend', es: 'Cada fin de semana' })}</span><span>{tt({ en: 'I run the party', es: 'Organizo la fiesta' })}</span>
          </div>
        </div>
      )}
      <div className={`mt-6 grid grid-cols-1 ${cols} gap-4`}>
        {items.map((p, i) => {
          const rec = i === pick;
          const price = annual && p.price_annual ? p.price_annual : p.price;
          return (
            <div key={p.id || i} className={`rounded-3xl p-8 flex flex-col transition-[transform,opacity,box-shadow,border-color] duration-500 ease-[cubic-bezier(.2,.8,.2,1)] ${rec ? 'md:-translate-y-2' : 'md:opacity-60'}`}
              style={{ backgroundColor: CARD, border: `1px solid ${rec ? 'var(--color-heading, #16191D)' : BORDER}`, boxShadow: rec ? '0 30px 60px -30px rgba(0,0,0,.35)' : 'none' }}>
              <div className="flex items-center gap-2 flex-wrap min-h-[26px]">
                {rec && n > 1 && <span className="text-[11px] font-extrabold tracking-[0.16em] uppercase px-2.5 py-1.5 rounded-full text-white" style={{ backgroundColor: ACCENT }}>{tt({ en: 'For you', es: 'Para ti' })}</span>}
                {tt(p.badge) && <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-full" style={{ border: `1px solid ${BORDER}`, color: BODY }}>{tt(p.badge)}</span>}
              </div>
              <h3 className="mt-3 text-white text-[22px] font-bold">{tt(p.name)}</h3>
              {tt(p.description) && <p className="mt-1 text-[15px]" style={{ color: BODY }}>{plainText(tt(p.description))}</p>}
              <p className="mt-5 text-white tabular-nums">
                <span className="text-[48px] font-extrabold leading-none tracking-[-0.04em]">{price}</span>
                <span className="ml-1.5 text-[14px] font-semibold" style={{ color: BODY }}>{p.currency} {tt(p.period)}</span>
              </p>
              <ul className="mt-6 space-y-2.5 flex-1">
                {features(tt(p.features)).map((f, k) => (
                  <li key={k} className="flex items-start gap-2 text-[15px] text-white">
                    <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: ACCENT }} />{f}
                  </li>
                ))}
              </ul>
              {tt(p.cta_text) && p.cta_url && (
                <NBtn href={p.cta_url} newTab={p.cta_new_tab} variant={rec ? 'a' : 's'} className="mt-7 w-full justify-between">{tt(p.cta_text)}</NBtn>
              )}
            </div>
          );
        })}
      </div>
    </Wrap>
  );
}

// ── T-1 Team: tall portraits in grey; colour + socials on hover / focus.
export function GemTeamPortraits({ config = {}, items = [] }) {
  const tt = useT();
  if (!items.length) return null;
  const max = parseInt(config.max_visible, 10) || items.length;
  return (
    <Wrap testid="gem2i-team">
      <GemHeading eyebrow={config.eyebrow} title={config.title} subtitle={config.subtitle}
        action={config.show_view_all ? <GemCta text={config.view_all_text} url={config.view_all_url} newTab={config.view_all_new_tab} /> : null} />
      <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-5">
        {items.slice(0, max).map(m => {
          const socials = Object.entries(m.social_links || {}).filter(([, u]) => u);
          return (
            <div key={m.id} className="group" tabIndex={0}>
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden" style={{ backgroundColor: CARD }}>
                {!m.photo_url && (
                  // No photo yet: initials on a brand gradient instead of a stranger's stock portrait.
                  <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center font-bold text-white/90 select-none"
                    style={{ background: 'linear-gradient(160deg, color-mix(in srgb, var(--color-accent) 45%, #000) 0%, var(--color-accent) 100%)', fontSize: 'clamp(2.4rem, 5vw, 3.6rem)', fontFamily: "'Playfair Display', Georgia, serif" }}>
                    {tt(m.name).split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')}
                  </span>
                )}
                {m.photo_url && <img src={gemImg(m.photo_url)} alt={tt(m.name)} loading="lazy"
                  className="w-full h-full object-cover grayscale transition-[filter,transform] duration-500 group-hover:grayscale-0 group-focus-within:grayscale-0 group-hover:scale-[1.03] motion-reduce:transition-none" />}
                {socials.length > 0 && (
                  <div className="absolute inset-x-0 bottom-0 p-4 flex gap-2 opacity-0 translate-y-2 transition-[opacity,transform] duration-300 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0"
                    style={{ background: 'linear-gradient(180deg, transparent, rgba(4,8,12,0.85))' }}>
                    {socials.map(([k, u]) => {
                      const Icon = SOCIAL_ICONS[k] || Globe;
                      return <a key={k} href={u} target="_blank" rel="noopener noreferrer" aria-label={k} className="w-9 h-9 rounded-full inline-flex items-center justify-center text-white bg-white/15 hover:bg-white/25"><Icon className="w-4 h-4" /></a>;
                    })}
                  </div>
                )}
              </div>
              <h3 className="text-white font-semibold mt-4">{tt(m.name)}</h3>
              <p className="text-[15px] mt-0.5" style={{ color: BODY }}>{tt(m.role)}</p>
              {tt(m.bio) && <p className="text-[15px] mt-2 leading-[1.6]" style={{ color: BODY }}>{plainText(tt(m.bio))}</p>}
            </div>
          );
        })}
      </div>
    </Wrap>
  );
}

// ── Q-1 Testimonials: one big quote at a time, dots + arrows.
export function GemTestimonialSpotlight({ config = {}, items = [] }) {
  const tt = useT();
  const [at, setAt] = useState(0);
  if (!items.length) return null;
  const list = items.slice(0, 8);
  const t = list[Math.min(at, list.length - 1)];
  const go = (d) => setAt(i => (i + d + list.length) % list.length);
  return (
    <div style={{ backgroundColor: 'var(--color-section-bg, #0A121A)' }}>
      <Wrap testid="gem2i-testimonials" narrow>
        <div className="text-center">
          {(tt(config.eyebrow) || tt(config.title)) && <p className="gem-eyebrow" style={{ color: ACCENT }}>{tt(config.eyebrow) || tt(config.title)}</p>}
          <figure key={t.id} className="mt-8 gem-fade-in">
            <blockquote className="text-white font-medium mx-auto max-w-4xl" style={{ fontSize: 'clamp(1.4rem, 3vw, 2.15rem)', lineHeight: 1.4, textWrap: 'balance' }}>
              “{plainText(tt(t.content))}”
            </blockquote>
            <figcaption className="mt-9 inline-flex items-center gap-3.5 text-left">
              {t.image && <img src={gemImg(t.image)} alt="" className="w-[52px] h-[52px] rounded-full object-cover" loading="lazy" />}
              <span><span className="block text-white font-semibold">{tt(t.name)}</span>
                <span className="block text-[15px]" style={{ color: BODY }}>{tt(t.title)}</span></span>
            </figcaption>
          </figure>
          {list.length > 1 && (
            <div className="mt-9 flex items-center justify-center gap-5">
              <button type="button" onClick={() => go(-1)} aria-label={tt({ en: 'Previous', es: 'Anterior' })} className="w-10 h-10 rounded-full inline-flex items-center justify-center text-white hover:bg-white/10 active:scale-95" style={{ border: `1px solid ${BORDER}` }}><ArrowRight className="w-4 h-4 rotate-180" /></button>
              <div className="flex gap-2">
                {list.map((x, i) => (
                  <button key={x.id || i} type="button" onClick={() => setAt(i)} aria-label={`${i + 1}`} aria-current={i === at}
                    className="h-1 rounded-full transition-[width,background-color] duration-300" style={{ width: i === at ? 26 : 10, backgroundColor: i === at ? ACCENT : BORDER }} />
                ))}
              </div>
              <button type="button" onClick={() => go(1)} aria-label={tt({ en: 'Next', es: 'Siguiente' })} className="w-10 h-10 rounded-full inline-flex items-center justify-center text-white hover:bg-white/10 active:scale-95" style={{ border: `1px solid ${BORDER}` }}><ArrowRight className="w-4 h-4" /></button>
            </div>
          )}
        </div>
        <style>{`@media (prefers-reduced-motion: no-preference){.gem-fade-in{animation:gemFade .45s cubic-bezier(.16,1,.3,1)}}@keyframes gemFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>
      </Wrap>
    </div>
  );
}

// Shared marquee: the track is the list twice, slid by -50%. Pauses on hover
// and focus; with reduced motion it becomes a plain horizontal scroller.
const MARQUEE_CSS = `.gem-mq{overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent);mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent)}
.gem-mq-track{display:flex;width:max-content}
@media (prefers-reduced-motion: no-preference){.gem-mq-track{animation:gemMq var(--mq-dur,60s) linear infinite}.gem-mq-track.rev{animation-direction:reverse}.gem-mq:hover .gem-mq-track,.gem-mq:focus-within .gem-mq-track{animation-play-state:paused}}
@media (prefers-reduced-motion: reduce){.gem-mq{overflow-x:auto;-webkit-mask-image:none;mask-image:none}}
@keyframes gemMq{to{transform:translateX(-50%)}}`;

// ── G-2 Gallery: two drifting rows; a click opens a full-screen viewer.
export function GemGalleryMarquee({ config = {}, items = [] }) {
  const tt = useT();
  const [open, setOpen] = useState(null);   // index into `pics`
  const pics = items.filter(g => g.image);
  const close = React.useCallback(() => setOpen(null), []);
  const step = React.useCallback((d) => setOpen(i => (i == null ? i : (i + d + pics.length) % pics.length)), [pics.length]);
  const onKey = React.useCallback((e) => { if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); }, [step]);
  useOverlay(open != null, close, onKey);
  if (!pics.length) return null;
  const half = Math.ceil(pics.length / 2);
  const rows = pics.length >= 8 ? [pics.slice(0, half).map((g, i) => [g, i]), pics.slice(half).map((g, i) => [g, i + half])] : [pics.map((g, i) => [g, i])];
  const cur = open != null ? pics[open] : null;
  return (
    <section className="py-20 md:py-28 overflow-hidden" data-testid="gem2i-gallery" style={{ backgroundColor: 'var(--color-section-bg, #0A121A)' }}>
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <GemHeading eyebrow={config.eyebrow} title={config.title || { en: 'Gallery', es: 'Galería' }} subtitle={config.subtitle}
          action={<GemCta text={config.cta_text || { en: 'View all', es: 'Ver todo' }} url={config.cta_url || '/gallery'} newTab={config.cta_new_tab} />} />
      </div>
      <div className="mt-10 space-y-3.5">
        {rows.map((row, r) => (
          <div key={r} className="gem-mq">
            <div className={`gem-mq-track ${r ? 'rev' : ''}`} style={{ '--mq-dur': `${Math.max(30, row.length * 7)}s` }}>
              {[0, 1].map(copy => row.map(([g, idx]) => (
                <button key={`${copy}-${g.id || idx}`} type="button" onClick={() => setOpen(idx)} tabIndex={copy ? -1 : 0} aria-hidden={copy ? 'true' : undefined}
                  aria-label={tt(g.title) || tt({ en: 'Open photo', es: 'Abrir foto' })}
                  className="shrink-0 mr-3.5 w-[240px] md:w-[300px] aspect-[10/7] rounded-xl overflow-hidden focus-visible:outline focus-visible:outline-2" style={{ backgroundColor: CARD, outlineColor: ACCENT }}>
                  <img src={gemImg(g.image)} alt={tt(g.title) || ''} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 hover:scale-105 motion-reduce:transition-none" />
                </button>
              )))}
            </div>
          </div>
        ))}
      </div>
      {cur && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-4 md:p-12" style={{ backgroundColor: 'rgba(0,0,0,0.94)' }}
          role="dialog" aria-modal="true" aria-label={tt({ en: 'Photo viewer', es: 'Visor de fotos' })} onClick={close}>
          <button type="button" onClick={close} aria-label={tt({ en: 'Close', es: 'Cerrar' })} className="absolute top-4 right-4 w-11 h-11 rounded-full inline-flex items-center justify-center text-white hover:bg-white/10"><lucide.X className="w-6 h-6" /></button>
          {pics.length > 1 && <>
            <button type="button" onClick={e => { e.stopPropagation(); step(-1); }} aria-label={tt({ en: 'Previous', es: 'Anterior' })} className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full inline-flex items-center justify-center text-white hover:bg-white/10"><lucide.ChevronLeft className="w-7 h-7" /></button>
            <button type="button" onClick={e => { e.stopPropagation(); step(1); }} aria-label={tt({ en: 'Next', es: 'Siguiente' })} className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full inline-flex items-center justify-center text-white hover:bg-white/10"><lucide.ChevronRight className="w-7 h-7" /></button>
          </>}
          <img key={open} src={gemImg(cur.image)} alt={tt(cur.title) || ''} onClick={e => e.stopPropagation()} className="max-w-full max-h-[80vh] object-contain rounded-lg gem-fade-in" />
          <p className="mt-4 text-[15px] text-white/80 tabular-nums" onClick={e => e.stopPropagation()}>{tt(cur.title) ? `${tt(cur.title)} · ` : ''}{open + 1} / {pics.length}</p>
        </div>
      )}
      <style>{MARQUEE_CSS}{`@media (prefers-reduced-motion: no-preference){.gem-fade-in{animation:gemFade .35s cubic-bezier(.16,1,.3,1)}}@keyframes gemFade{from{opacity:0;transform:scale(.98)}to{opacity:1;transform:none}}`}</style>
    </section>
  );
}

// ── Shared full-screen photo viewer (←/→/Esc, click outside closes) ──────────
function usePhotoViewer(pics) {
  const [open, setOpen] = useState(null);   // index into `pics`
  const close = React.useCallback(() => setOpen(null), []);
  const step = React.useCallback((d) => setOpen(i => (i == null ? i : (i + d + pics.length) % pics.length)), [pics.length]);
  const onKey = React.useCallback((e) => { if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); }, [step]);
  useOverlay(open != null, close, onKey);
  return { open, setOpen, close, step };
}
function PhotoViewer({ pics, v }) {
  const tt = useT();
  const cur = v.open != null ? pics[v.open] : null;
  if (!cur) return null;
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-4 md:p-12" style={{ backgroundColor: 'rgba(0,0,0,0.94)' }}
      role="dialog" aria-modal="true" aria-label={tt({ en: 'Photo viewer', es: 'Visor de fotos' })} onClick={v.close}>
      <button type="button" onClick={v.close} aria-label={tt({ en: 'Close', es: 'Cerrar' })} className="absolute top-4 right-4 w-11 h-11 rounded-full inline-flex items-center justify-center text-white hover:bg-white/10"><lucide.X className="w-6 h-6" /></button>
      {pics.length > 1 && <>
        <button type="button" onClick={e => { e.stopPropagation(); v.step(-1); }} aria-label={tt({ en: 'Previous', es: 'Anterior' })} className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full inline-flex items-center justify-center text-white hover:bg-white/10"><lucide.ChevronLeft className="w-7 h-7" /></button>
        <button type="button" onClick={e => { e.stopPropagation(); v.step(1); }} aria-label={tt({ en: 'Next', es: 'Siguiente' })} className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full inline-flex items-center justify-center text-white hover:bg-white/10"><lucide.ChevronRight className="w-7 h-7" /></button>
      </>}
      <img key={v.open} src={gemImg(cur.image)} alt={tt(cur.title) || ''} onClick={e => e.stopPropagation()} className="max-w-full max-h-[78vh] object-contain rounded-lg gem-fade-in" />
      <p className="mt-4 text-[15px] text-white/85 tabular-nums text-center" onClick={e => e.stopPropagation()}>
        {tt(cur.title) && <b className="text-white">{tt(cur.title)}</b>}{tt(cur.summary) ? ` · ${tt(cur.summary)}` : ''} <span className="text-white/60">· {v.open + 1} / {pics.length}</span>
      </p>
      <style>{`@media (prefers-reduced-motion: no-preference){.gem-fade-in{animation:gemFade .35s cubic-bezier(.16,1,.3,1)}}@keyframes gemFade{from{opacity:0;transform:scale(.98)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}

// ── Gallery GA-3 · full-bleed mosaic (approved 2026-10-17) ───────────────────
// Dense edge-to-edge grid of mixed tile sizes (like the Venues grid); caption on
// hover/focus; a click opens the full-screen viewer. The span pattern covers
// 10 tiles in exactly 3 rows of 6 (area 18) so the grid never ends with holes;
// more photos repeat the pattern.
const MOSAIC_SPANS = ['col-span-2 row-span-2', '', 'col-span-2', 'row-span-2', '', 'col-span-2', 'col-span-2', '', '', 'col-span-2'];
export function GemGalleryMosaic({ config = {}, items = [] }) {
  const tt = useT();
  const max = parseInt(config.max_items, 10) || 10;
  const pics = items.filter(g => g.image).slice(0, Math.max(10, Math.floor(max / 10) * 10) || 10);
  const v = usePhotoViewer(pics);
  if (!pics.length) return null;
  return (
    <section className="py-20 md:py-28" data-testid="gem2i-gallery">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <GemHeading eyebrow={config.eyebrow} title={config.title || { en: 'Gallery', es: 'Galería' }} subtitle={config.subtitle}
          action={<GemCta text={config.cta_text || { en: 'View all', es: 'Ver todo' }} url={config.cta_url || '/gallery'} newTab={config.cta_new_tab} />} />
      </div>
      <ul className="mt-12 grid grid-cols-2 md:grid-cols-6 auto-rows-[140px] md:auto-rows-[170px] 2xl:auto-rows-[210px] gap-1.5 [grid-auto-flow:dense]">
        {pics.map((g, i) => (
          <li key={g.id || i} className={MOSAIC_SPANS[i % MOSAIC_SPANS.length]}>
            <button type="button" onClick={() => v.setOpen(i)} aria-label={`${tt(g.title) || tt({ en: 'Photo', es: 'Foto' })}${tt(g.summary) ? ` · ${tt(g.summary)}` : ''}`}
              className="group relative block w-full h-full overflow-hidden outline-none" style={{ backgroundColor: CARD }}>
              <img src={gemImg(g.image)} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 group-focus-visible:scale-105 motion-reduce:transition-none" />
              {(tt(g.title) || tt(g.summary)) && (
                <span className="absolute inset-0 flex flex-col justify-end p-4 lg:p-5 text-left opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
                  style={{ background: 'linear-gradient(180deg, transparent 40%, rgba(4,8,12,.9))' }}>
                  {tt(g.title) && <span className="text-white text-lg font-semibold leading-tight">{tt(g.title)}</span>}
                  {tt(g.summary) && <span className="mt-1 inline-flex items-center gap-1.5 text-[15px]" style={{ color: ON_PHOTO }}><MapPin className="w-4 h-4" aria-hidden="true" />{tt(g.summary)}</span>}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
      <PhotoViewer pics={pics} v={v} />
    </section>
  );
}

// ── B-1 Partners: one slow strip of logos, centred heading.
export function GemLogoMarquee({ config = {}, items = [], testid }) {
  const tt = useT();
  if (!items.length) return null;
  const Logo = ({ l, hidden }) => {
    const img = <img src={gemImg(l.logo_url || l.image)} alt={hidden ? '' : (tt(l.name) || '')} loading="lazy" className="h-10 md:h-12 w-auto max-w-[180px] object-contain grayscale opacity-70 transition-[filter,opacity] duration-300 hover:grayscale-0 hover:opacity-100" />;
    return l.link_url
      ? <a href={l.link_url} target={l.link_target || '_blank'} rel="noopener noreferrer" tabIndex={hidden ? -1 : 0} aria-hidden={hidden || undefined} className="shrink-0 mx-8 md:mx-12">{img}</a>
      : <span className="shrink-0 mx-8 md:mx-12" aria-hidden={hidden || undefined}>{img}</span>;
  };
  return (
    <section className="py-14 md:py-16" data-testid={testid}>
      {tt(config.title) && <h2 className="text-center text-lg md:text-xl font-medium mb-8 px-6" style={{ color: BODY }}>{tt(config.title)}</h2>}
      <div className="gem-mq">
        <div className="gem-mq-track items-center" style={{ '--mq-dur': `${Math.max(25, items.length * 6)}s` }}>
          {items.map((l, i) => <Logo key={`a${l.id || i}`} l={l} />)}
          {items.map((l, i) => <Logo key={`b${l.id || i}`} l={l} hidden />)}
        </div>
      </div>
      <style>{MARQUEE_CSS}</style>
    </section>
  );
}

// ── K-1 Clients: centred heading + text, logo grid in boxes (colour on hover).
export function GemClientsGrid({ title, kicker, text, logos = [], ctaText, ctaUrl, ctaNewTab }) {
  if (!logos.length && !title) return null;
  const ctaExternal = /^https?:/i.test(ctaUrl || '');
  return (
    <Wrap testid="gem2i-clients">
      <div className="text-center">
        {kicker && <p className="gem-eyebrow mb-3" style={{ color: ACCENT }}>{kicker}</p>}
        {title && <h2 className="text-white font-bold" style={{ fontSize: 'clamp(1.6rem, 3.2vw, 2.5rem)' }}>{title}</h2>}
        {text && <p className="mt-4 mx-auto max-w-2xl text-base md:text-[17px] leading-[1.7]" style={{ color: BODY }}>{text}</p>}
      </div>
      {logos.length > 0 && (
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {logos.map((l, i) => {
            const body = (<>
              <span className="h-16 flex items-center justify-center">
                <img src={l.image} alt={l.name || 'client'} loading="lazy" className="max-w-full max-h-[60px] object-contain grayscale brightness-150 opacity-70 transition-[filter,opacity] duration-300 group-hover:grayscale-0 group-hover:brightness-100 group-hover:opacity-100" />
              </span>
              {l.name && <span className="mt-4 text-white text-[15px] font-semibold leading-tight">{l.name}</span>}
              {l.description && <span className="mt-1 text-[13px] leading-snug" style={{ color: BODY }}>{l.description}</span>}
            </>);
            const cls = 'group rounded-2xl flex flex-col items-center justify-start text-center p-5 transition-colors hover:border-white/20';
            const style = { backgroundColor: CARD, border: `1px solid ${BORDER}` };
            return l.url
              ? <a key={i} href={l.url} target="_blank" rel="noreferrer" className={cls} style={style}>{body}</a>
              : <div key={i} className={cls} style={style}>{body}</div>;
          })}
        </div>
      )}
      {ctaText && ctaUrl && (
        <div className="mt-12 text-center">
          <a href={ctaUrl} target={ctaNewTab || ctaExternal ? '_blank' : undefined} rel={ctaNewTab || ctaExternal ? 'noopener noreferrer' : undefined}
            className="inline-flex items-center gap-2 px-6 py-3 text-[15px] font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: ACCENT }}>
            {ctaText} <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </a>
        </div>
      )}
    </Wrap>
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
          className="shrink-0 px-6 py-3 text-[15px] font-semibold rounded-sm transition-opacity hover:opacity-85"
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
            <div className="aspect-[16/10] overflow-hidden" style={{ backgroundColor: 'var(--color-section-bg, #0A121A)' }}>
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
export function GemIntroPhoto({ intro, featured = [] }) {
  const tt = useT();
  if (!intro) return null;
  const since = intro.since || '1993';
  // Collage: the intro photo + the Featured cards' photos (all CMS), stock only as a last resort.
  const photos = [gemImg(intro.image) || DEFAULT_INTRO_IMG,
    ...(Array.isArray(featured) ? featured : []).map(f => gemImg(f.image) || DEFAULT_FEATURED_IMG[f.url]).filter(Boolean),
    ...Object.values(DEFAULT_FEATURED_IMG)].slice(0, 3);
  const sinceLabel = tt({ en: 'Since', es: 'Desde' });
  const buttons = (
    <>
      <NBtn to={intro.cta_url || '/membership-enrollment'} variant="a">{tt(intro.cta_text) || tt({ en: 'Join GEM2i', es: 'Únete a GEM2i' })}</NBtn>
      <NBtn href="#services" variant="s" icon="down">{tt({ en: 'Our services', es: 'Nuestros servicios' })}</NBtn>
    </>
  );
  const kicker = <p className="text-xs font-medium uppercase tracking-[0.32em]" style={{ color: 'var(--color-link, #5FB2E0)' }}>{tt(intro.kicker) || tt({ en: 'Who we are', es: 'Quiénes somos' })}</p>;
  // B2: outlined year behind the headline, text + buttons beside it, a strip of photos ending in the «Since» plate.
  return (
    <section className="overflow-hidden" style={{ backgroundColor: 'var(--color-section-bg, #0A121A)' }} data-testid="gem2i-intro">
      <div className="max-w-7xl mx-auto px-6 md:px-10 pt-20 md:pt-28 pb-20 md:pb-24">
        <div className="relative grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-8 lg:gap-16 items-end">
          <span aria-hidden="true" className="absolute -left-3 -top-10 md:-top-14 font-extrabold leading-[.8] tracking-[-0.07em] select-none pointer-events-none text-transparent"
            style={{ fontSize: 'clamp(7rem, 21vw, 19rem)', WebkitTextStroke: '1.5px color-mix(in srgb, var(--color-body-text, #9aa7b4) 28%, transparent)' }}>{since}</span>
          <div className="relative">
            {kicker}
            <h2 className="text-white font-bold leading-[1.04] tracking-[-0.02em] mt-4" style={{ fontSize: 'clamp(2.4rem, 5vw, 4.4rem)', textWrap: 'balance' }}>{tt(intro.heading)}</h2>
          </div>
          <div className="relative">
            <p className="text-[15px] leading-[1.75]" style={{ color: BODY, textWrap: 'pretty' }}>{tt(intro.text)}</p>
            <div className="mt-7 flex flex-wrap gap-3.5">{buttons}</div>
          </div>
        </div>
        <div className="mt-14 grid grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_.8fr] gap-3.5 items-end">
          {photos.map((src, i) => (
            <div key={i} className={`overflow-hidden rounded-[20px] ${['aspect-[16/11] col-span-2 lg:col-span-1', 'aspect-[3/4]', 'aspect-square'][i]}`} style={{ backgroundColor: CARD }}>
              <img src={src} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-500 ease-out hover:-translate-y-1.5 hover:scale-[1.03] motion-reduce:transition-none" />
            </div>
          ))}
          <div className="aspect-[3/4] rounded-[20px] flex flex-col justify-end p-5 text-white" style={{ backgroundColor: ACCENT }} aria-label={`${sinceLabel} ${since}`}>
            <span className="text-[11px] font-bold tracking-[0.24em] uppercase opacity-75">{sinceLabel}</span>
            <span className="text-4xl font-extrabold tracking-[-0.03em] tabular-nums">{since}</span>
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
                <p className="mt-2 text-[15px] leading-[1.7] line-clamp-3" style={{ color: ON_PHOTO }}>{plainText(tt(f.text))}</p>
                {f.url && (
                  <span className="mt-4 inline-flex items-center gap-2 text-[15px] font-semibold uppercase tracking-[0.14em] transition-transform duration-200 group-hover:translate-x-1" style={{ color: 'var(--color-link, #5FB2E0)' }}>
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

// ── Services · S2: index on the left, a live dark panel on the right that swaps per service.
const SERVICE_ICONS = ['target', 'megaphone', 'gem', 'building-2', 'mic-2', 'sparkles', 'calendar-check', 'handshake'];
function useServiceCards(services, banner) {
  const tt = useT();
  const items = (services?.items || []).map(it => (it && typeof it === 'object' && (it.title || it.text) ? it : { title: it }));
  const cards = items.map((it, i) => ({ ...it, icon: it.icon || SERVICE_ICONS[i % SERVICE_ICONS.length] }));
  const kicker = [tt(services?.kicker), tt(services?.title)].filter(Boolean).join(' · ') || tt({ en: 'Our services', es: 'Nuestros servicios' });
  const title = tt(services?.subtitle) || tt({ en: 'Everything an event needs', es: 'Todo lo que un evento necesita' });
  const ctaText = tt(banner?.text) || tt({ en: 'Need strategic planning?', es: '¿Necesitas planificación estratégica?' });
  return { cards, kicker, title, ctaText };
}
function ServicesHead({ kicker, title }) {
  return (
    <>
      <p className="flex items-center gap-3.5 text-xs font-bold uppercase tracking-[0.28em]" style={{ color: 'var(--color-link, #5FB2E0)' }}><span className="w-8 h-px bg-current" />{kicker}</p>
      <h2 className="text-white font-bold leading-[1.05] mt-4" style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(2.2rem, 4.4vw, 3.6rem)', textWrap: 'balance' }}>
        <AccentTitle text={title} />
      </h2>
    </>
  );
}
export function GemServicesGrid({ services, banner }) {
  const tt = useT();
  const { cards, kicker, title, ctaText } = useServiceCards(services, banner);
  const [at, setAt] = useState(0);
  if (!cards.length) return null;
  const c = cards[Math.min(at, cards.length - 1)];
  return (
    <section id="services" style={{ backgroundColor: 'var(--color-section-bg, #0A121A)' }} data-testid="gem2i-services">
      <style>{'@keyframes gemSwap{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}'}</style>
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-20 md:py-28">
        <ServicesHead kicker={kicker} title={title} />
        <div className="mt-14 grid gap-7 lg:grid-cols-[1fr_1.15fr] lg:gap-14 items-start">
          <ul className="order-2 lg:order-1 border-t" style={{ borderColor: BORDER }} role="tablist" aria-label={kicker}>
            {cards.map((s, i) => (
              <li key={i}>
                <button type="button" role="tab" aria-selected={i === at} onMouseEnter={() => setAt(i)} onFocus={() => setAt(i)} onClick={() => setAt(i)}
                  className={`w-full flex items-center gap-4 border-b py-[18px] px-1 text-left text-[17px] font-bold transition-colors duration-300 ${i === at ? 'text-white' : ''}`}
                  style={{ borderColor: BORDER, color: i === at ? undefined : 'color-mix(in srgb, var(--color-body-text, #9AA6B2) 75%, transparent)' }}>
                  <span aria-hidden="true" className="h-0.5 transition-[width] duration-500 ease-[cubic-bezier(.2,.8,.2,1)]" style={{ width: i === at ? 28 : 0, backgroundColor: ACCENT }} />
                  {tt(s.title)}
                </button>
              </li>
            ))}
          </ul>
          <div className="gem-tone-dark order-1 lg:order-2 lg:sticky lg:top-28 relative overflow-hidden rounded-[28px] p-7 md:p-11 min-h-[380px] md:min-h-[470px] flex flex-col justify-between text-white" style={{ backgroundColor: '#0D0F12' }} role="tabpanel">
            <span aria-hidden="true" className="absolute -right-32 -top-32 w-[420px] h-[420px] rounded-full transition-transform duration-[900ms] ease-[cubic-bezier(.2,.8,.2,1)]"
              style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--color-accent, #3287B7) 55%, transparent), transparent 65%)', transform: `translate(${-at * 22}px, ${at * 26}px)` }} />
            <div key={`i${at}`} className="relative flex justify-between items-start animate-[gemSwap_.55s_cubic-bezier(.2,.8,.2,1)_both] motion-reduce:animate-none">
              <span className="w-24 h-24 rounded-[26px] inline-flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,.08)' }}><GemIcon name={c.icon} className="w-11 h-11" /></span>
              <span className="text-xs font-semibold tracking-[0.2em] uppercase text-white/45">GEM2i</span>
            </div>
            <div key={`t${at}`} className="relative mt-10 animate-[gemSwap_.55s_cubic-bezier(.2,.8,.2,1)_.06s_both] motion-reduce:animate-none">
              <h3 className="text-white font-extrabold leading-[1.02] tracking-[-0.04em] max-w-[16ch]" style={{ fontSize: 'clamp(2rem, 3.4vw, 3rem)' }}>{tt(c.title)}</h3>
              {tt(c.text) && <p className="mt-4 max-w-[46ch] text-base leading-[1.7] text-white/70">{plainText(tt(c.text))}</p>}
              <p className="mt-5 text-[15px] text-white/60">{ctaText}</p>
              <NBtn href="#contact" onClick={openContact} variant="w" className="mt-6" data-testid="gem2i-services-contact">{tt({ en: 'Talk to us', es: 'Hablemos' })}</NBtn>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── FAQ · F2: a giant search field filters the questions live (match highlighted);
// hovering dims the others, the answer unfolds under a rotating «+» (CMS → Section Manager → FAQ).
const faqPlain = (html) => String(html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');
export function GemFaq({ config = {}, items = [] }) {
  const tt = useT();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(0);
  if (!items.length) return null;
  const term = query.trim().toLowerCase();
  const list = items.filter(q => !term || `${tt(q.question)} ${faqPlain(tt(q.answer))}`.toLowerCase().includes(term));
  const mark = (text) => {
    if (!term) return text;
    const at = text.toLowerCase().indexOf(term);
    if (at < 0) return text;
    return <>{text.slice(0, at)}<mark className="rounded-sm px-0.5 text-inherit" style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent, #3287B7) 22%, transparent)' }}>{text.slice(at, at + term.length)}</mark>{text.slice(at + term.length)}</>;
  };
  const shown = term ? (list.length ? 0 : -1) : open;
  return (
    <Wrap testid="gem2i-faq">
      <GemHeading eyebrow={config.eyebrow} title={config.title || { en: 'Frequently asked questions', es: 'Preguntas frecuentes' }} subtitle={config.subtitle}
        action={<GemCta text={config.cta_text} url={config.cta_url} newTab={config.cta_new_tab} />} />
      <label className="relative mt-10 block">
        <span className="sr-only">{tt({ en: 'Search the questions', es: 'Buscar en las preguntas' })}</span>
        <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder={tt({ en: 'Ask anything…', es: 'Pregunta lo que quieras…' })}
          className="w-full bg-transparent border-0 border-b-2 border-current text-white font-extrabold tracking-[-0.03em] pb-4 pt-2 pr-28 outline-none placeholder:opacity-30"
          style={{ fontSize: 'clamp(1.8rem, 4.4vw, 3.4rem)' }} />
        <span className="absolute right-0 bottom-6 text-[13px]" style={{ color: BODY }} aria-live="polite">
          {term ? tt({ en: `${list.length} result${list.length === 1 ? '' : 's'}`, es: `${list.length} resultado${list.length === 1 ? '' : 's'}` }) : tt({ en: `${items.length} questions`, es: `${items.length} preguntas` })}
        </span>
      </label>
      <div className="group/list mt-3">
        {list.map((q, i) => {
          const isOpen = shown === i || (!term && open === i);
          return (
            <div key={q.id || i} className="border-b" style={{ borderColor: BORDER }}>
              <button type="button" onClick={() => { setQuery(''); setOpen(isOpen ? -1 : items.indexOf(q)); }} aria-expanded={isOpen}
                className={`w-full flex items-center justify-between gap-6 py-6 md:py-7 text-left font-bold tracking-[-0.02em] transition-opacity duration-300 hover:!opacity-100 ${isOpen ? '' : 'md:group-hover/list:opacity-40'}`}
                style={{ fontSize: 'clamp(1.2rem, 2.2vw, 1.7rem)' }}>
                <span className="text-white">{mark(tt(q.question))}</span>
                <span aria-hidden="true" className={`shrink-0 w-11 h-11 rounded-full inline-flex items-center justify-center text-xl transition-[transform,background-color,color] duration-500 ease-[cubic-bezier(.2,.8,.2,1)] ${isOpen ? 'rotate-45 text-white' : ''}`}
                  style={isOpen ? { backgroundColor: ACCENT, border: `1px solid ${ACCENT}` } : { border: `1px solid ${BORDER}` }}>+</span>
              </button>
              <div className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden"><Rich html={q.answer} className="pb-7 max-w-[62ch] text-base md:text-[17px]" /></div>
              </div>
            </div>
          );
        })}
        {term && !list.length && (
          <p className="py-10 text-[17px]" style={{ color: BODY }}>
            {tt({ en: `No answer for “${query.trim()}” yet — `, es: `Aún no hay respuesta para «${query.trim()}» — ` })}
            <button type="button" onClick={openContact} className="font-bold text-white underline underline-offset-4">{tt({ en: 'ask us directly', es: 'pregúntanos directamente' })} →</button>
          </p>
        )}
      </div>
    </Wrap>
  );
}

// ── Latest news: KMS posts via the External Blog feed (Settings → Blog API).
// Photo with a date disc + title strip, then the summary and "Read more".
export function GemNewsCards({ config = {}, items = [] }) {
  const tt = useT();
  const parts = useDateParts();
  if (!items.length) return null;
  return (
    <Wrap testid="gem2i-news">
      <GemHeading eyebrow={config.eyebrow} title={config.title || { en: 'Latest news', es: 'Últimas noticias' }} subtitle={config.subtitle}
        action={<GemCta text={config.cta_text} url={config.cta_url} newTab={config.cta_new_tab} />} />
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {items.map((p, i) => {
          const d = parts((p.date || '').slice(0, 10));
          return (
            <a key={p.url || i} href={p.url} className="group flex flex-col rounded-2xl overflow-hidden" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
              <div className="relative aspect-[4/3] overflow-hidden">
                {p.image && <img src={p.image} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transition-none" />}
                <div className="absolute left-4 right-4 bottom-4 flex items-center gap-3">
                  {d && (
                    <span className="shrink-0 w-14 h-14 rounded-full flex flex-col items-center justify-center text-white leading-none" style={{ backgroundColor: ACCENT }}>
                      <b className="text-xl tabular-nums">{d.day}</b><span className="text-[10px] tracking-[0.15em] mt-0.5">{d.month}</span>
                    </span>
                  )}
                  <h3 className="flex-1 rounded-lg px-3 py-2 text-white text-[15px] font-semibold leading-snug line-clamp-2 backdrop-blur-sm" style={{ backgroundColor: 'rgba(4,8,12,0.62)' }}>{p.title}</h3>
                </div>
              </div>
              <div className="flex-1 flex flex-col p-6">
                {p.summary && <p className="text-[15px] leading-[1.7] line-clamp-3" style={{ color: BODY }}>{p.summary}</p>}
                <span className="mt-auto pt-5 text-xs font-bold tracking-[0.15em] uppercase text-white group-hover:text-[color:var(--color-link,#5FB2E0)] transition-colors">
                  {tt({ en: 'Read more', es: 'Leer más' })}
                </span>
              </div>
            </a>
          );
        })}
      </div>
    </Wrap>
  );
}

// Conference detail page: the full programme, one column per day (CS reference).
export function GemConferenceSchedule({ sessions }) {
  const tt = useT();
  const { lang } = useLang() || { lang: 'en' };
  const days = sessionDays(sessions);
  if (!days.length) return null;
  const longDate = (iso) => (/^\d{4}-\d{2}-\d{2}/.test(iso || '')
    ? new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString(lang === 'es' ? 'es' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '');
  return (
    <section className="mt-20" data-testid="conference-schedule">
      <h2 className="text-white font-bold mb-8" style={{ fontSize: 'clamp(1.4rem, 2.6vw, 2rem)' }}>{tt({ en: 'Conference schedule', es: 'Programa de la conferencia' })}</h2>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {days.map((d, i) => (
          <div key={d.date || i} className="rounded-2xl p-6" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
            <p className="pb-4 text-white font-semibold" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <span className="text-xl mr-1.5" style={{ color: 'var(--color-link, #5FB2E0)' }}>{tt({ en: 'Day', es: 'Día' })} {i + 1}</span>
              {d.date && <span className="text-sm">/ {longDate(d.date)}</span>}
            </p>
            {d.rows.map((s, j) => (
              <div key={s.key || j} className="py-4" style={j ? { borderTop: `1px solid ${BORDER}` } : undefined}>
                {(s.start || s.end) && <time className="text-sm font-semibold tabular-nums" style={{ color: 'var(--color-link, #5FB2E0)' }}>{[s.start, s.end].filter(Boolean).join(' – ')}</time>}
                <h3 className="mt-1 text-white font-semibold">{s.title}</h3>
                {s.description && <p className="mt-1.5 text-sm leading-[1.65]" style={{ color: BODY }}>{s.description}</p>}
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

// CMS → Section Manager → Conference reviews (own list, not the testimonials).
// ── Conference review · CR1: one huge quote whose words light up one by one, the speaker below;
// progress bars advance to the next review on their own (or on click). A pulsing «live» badge names the conference.
export function GemConferenceReviews({ config = {}, items = [] }) {
  const tt = useT();
  const [i, setI] = useState(0);
  const [lit, setLit] = useState(0);
  const n = items.length;
  const r = n ? items[Math.min(i, n - 1)] : null;
  const words = r ? String(tt(r.text) || '').split(/\s+/).filter(Boolean) : [];
  useEffect(() => {
    if (!n) return undefined;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setLit(still ? words.length : 0);
    if (still) return undefined;
    const iv = setInterval(() => setLit(l => (l >= words.length ? l : l + 1)), 80);
    const next = n > 1 ? setTimeout(() => setI(k => (k + 1) % n), 7000) : null;
    return () => { clearInterval(iv); if (next) clearTimeout(next); };
  }, [i, n, words.length]);
  if (!n) return null;
  const conf = tt(r.conference);
  const initials = String(tt(r.name) || '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  return (
    <Wrap testid="gem2i-conf-reviews">
      <style>{'@keyframes gemPulse{50%{opacity:.3}}@keyframes gemFill{to{width:100%}}'}</style>
      <div className="flex flex-wrap justify-between items-end gap-5">
        <GemHeading eyebrow={config.eyebrow} title={config.title || { en: 'Conference review', es: 'Opiniones de conferencias' }} subtitle={config.subtitle} />
        {conf && (
          <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-bold text-white" style={{ border: `1px solid ${BORDER}` }}>
            <i className="w-2 h-2 rounded-full animate-[gemPulse_1.6s_infinite] motion-reduce:animate-none" style={{ backgroundColor: '#E2493C' }} />{conf}
          </span>
        )}
      </div>
      <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_auto] lg:gap-12 items-end">
        <figure key={r.id || i}>
          <blockquote className="text-white font-bold leading-[1.15] min-h-[3.5em]" style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.9rem, 4.2vw, 3.6rem)', textWrap: 'pretty' }}>
            “{words.map((w, k) => <span key={k} className="transition-opacity duration-300" style={{ opacity: k < lit ? 1 : 0.12 }}>{w}{k < words.length - 1 ? ' ' : ''}</span>)}”
          </blockquote>
          <figcaption className="mt-7 flex items-center gap-3.5">
            <span className="w-14 h-14 rounded-full overflow-hidden shrink-0 inline-flex items-center justify-center font-extrabold" style={{ background: 'linear-gradient(135deg, #1d3a52, #0f1d2a)', color: 'var(--color-link, #5FB2E0)' }}>
              {r.image ? <img src={r.image} alt="" className="w-full h-full object-cover" /> : initials}
            </span>
            <span>
              <b className="block text-white">{tt(r.name)}</b>
              {(tt(r.role) || conf) && <span className="text-sm" style={{ color: BODY }}>{[tt(r.role), conf].filter(Boolean).join(', ')}</span>}
            </span>
          </figcaption>
        </figure>
        {n > 1 && (
          <div className="flex gap-2">
            {items.map((x, k) => (
              <button key={x.id || k} type="button" onClick={() => setI(k)} aria-label={`${k + 1} / ${n}`} aria-current={k === i}
                className="w-11 h-1 rounded p-0 overflow-hidden" style={{ backgroundColor: BORDER }}>
                {k === i && <i key={`f${i}`} className="block h-full w-0 animate-[gemFill_7s_linear_forwards] motion-reduce:animate-none motion-reduce:w-full" style={{ backgroundColor: 'var(--color-heading, #16191D)' }} />}
              </button>
            ))}
          </div>
        )}
      </div>
    </Wrap>
  );
}

function GemHeadingCenter({ eyebrow, title, subtitle }) {
  const tt = useT();
  const e = tt(eyebrow); const t = tt(title); const s = tt(subtitle);
  return (
    <div>
      {e && <p className="gem-eyebrow mb-3 justify-center" style={{ color: ACCENT }}>{e}</p>}
      {t && <h2 className="text-white font-bold leading-[1.08]" style={{ fontSize: 'clamp(1.9rem, 3.6vw, 2.9rem)', textWrap: 'balance' }}><AccentTitle text={t} /></h2>}
      {s && <p className="mt-4 text-base md:text-[17px]" style={{ color: BODY }}>{s}</p>}
    </div>
  );
}

// ── Featured "Explore the scene" + FAQ (2026-10-21, reference "Event Categories
// + FAQ"): round photo per featured card with a white label pill on the left;
// FAQ panel on the right (Section Manager → FAQ). No questions → full width.
export function GemFeaturedCircles({ items = [], faq, heading }) {
  const tt = useT();
  const [open, setOpen] = useState(0);
  const questions = faq?.items || [];
  const fcfg = faq?.config || {};
  if (!items.length && !questions.length) return null;
  return (
    <section className="max-w-7xl mx-auto px-6 md:px-10 py-20 md:py-28" data-testid="gem2i-featured">
      <div className={`grid gap-12 ${questions.length ? 'lg:grid-cols-[1.6fr_1fr] lg:gap-14 items-start' : ''}`}>
        {items.length > 0 && (
          <div>
            <GemHeading eyebrow={heading?.kicker || items[0]?.kicker || { en: 'Featured', es: 'Destacados' }}
              title={heading?.title || { en: 'Explore the scene', es: 'Explora la escena' }}
              subtitle={heading?.subtitle || { en: 'Sort through the best of the scene.', es: 'Lo mejor de la escena, por categoría.' }} />
            <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-8">
              {items.map((f, i) => {
                const img = gemImg(f.image) || DEFAULT_FEATURED_IMG[f.url] || DEFAULT_INTRO_IMG;
                const label = String(tt(f.title) || '').toLowerCase();
                const inner = (
                  <>
                    <span className="relative block aspect-square rounded-full overflow-hidden shadow-[0_18px_40px_-18px_rgba(0,0,0,.8)]" style={{ backgroundColor: CARD }}>
                      <img src={img} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06] motion-reduce:transition-none" />
                      <span className="absolute inset-0 bg-black/20 transition-opacity duration-300 group-hover:opacity-0" />
                      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-white px-5 py-2.5 text-[15px] font-bold capitalize text-[#0B121B] transition-transform duration-200 ease-out group-active:scale-[0.97]">
                        {label}
                      </span>
                    </span>
                    {tt(f.text) && <span className="mt-4 block text-sm leading-[1.6] line-clamp-2 text-center" style={{ color: BODY }}>{plainText(tt(f.text))}</span>}
                  </>
                );
                return f.url
                  ? <Link key={i} to={f.url} className="group block" data-testid={`gem2i-featured-${i}`}>{inner}</Link>
                  : <div key={i} className="group">{inner}</div>;
              })}
            </div>
          </div>
        )}
        {questions.length > 0 && (
          <aside className="rounded-2xl p-6 md:p-8" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }} data-testid="gem2i-faq">
            <h3 className="text-white text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>{tt(fcfg.title) || 'FAQ'}</h3>
            {tt(fcfg.subtitle) && <p className="mt-2 text-sm" style={{ color: BODY }}>{tt(fcfg.subtitle)}</p>}
            <div className="mt-6 flex flex-col gap-2.5">
              {questions.map((q, i) => {
                const isOpen = open === i;
                return (
                  <div key={q.id || i} className="rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,.04)' }}>
                    <button type="button" onClick={() => setOpen(isOpen ? -1 : i)} aria-expanded={isOpen}
                      className="w-full flex items-center justify-between gap-4 px-4 py-3.5 text-left text-white text-[15px] font-semibold">
                      {tt(q.question)}
                      <span aria-hidden className="relative w-3 h-3 shrink-0">
                        <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-current" />
                        <span className={`absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-current transition-transform duration-200 ease-out ${isOpen ? 'scale-y-0' : ''}`} />
                      </span>
                    </button>
                    <div className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                      <div className="overflow-hidden"><Rich html={q.answer} className="px-4 pb-4 !text-sm" /></div>
                    </div>
                  </div>
                );
              })}
            </div>
            <GemCta text={fcfg.cta_text} url={fcfg.cta_url} newTab={fcfg.cta_new_tab} className="mt-6" />
          </aside>
        )}
      </div>
    </section>
  );
}

// ═════════════ Norules · Awwwards-style cards (boceto norules-awwwards-cards.html, 2026-10-21) ═════════════
// Photo card: on hover a bottom shade rises with kicker + title, a white action
// button sits in the centre and ↗ (open) / bookmark (follow) icons on the right;
// under the card: name · "by/from/in" · avatar · place. Touch: always visible.
// Follow / vote need a session: logged-out clicks open the login modal.

const AWW_CSS = `
.aww-card .aww-shade,.aww-card .aww-meta,.aww-card .aww-cta{transition:opacity .25s cubic-bezier(.23,1,.32,1),transform .3s cubic-bezier(.23,1,.32,1)}
.aww-card .aww-img{transition:transform .6s cubic-bezier(.23,1,.32,1),filter .4s ease}
.aww-bw .aww-img{filter:grayscale(1)}
@media (hover:hover){
  .aww-card .aww-shade,.aww-card .aww-meta,.aww-card .aww-cta{opacity:0}
  .aww-card .aww-meta{transform:translateY(8px)} .aww-card .aww-cta{transform:translate(-50%,-40%)}
  .aww-card:hover .aww-shade,.aww-card:focus-within .aww-shade,.aww-card:hover .aww-meta,.aww-card:focus-within .aww-meta{opacity:1;transform:none}
  .aww-card:hover .aww-cta,.aww-card:focus-within .aww-cta{opacity:1;transform:translate(-50%,-50%)}
  .aww-card:hover .aww-img{transform:scale(1.035)} .aww-bw .aww-card:hover .aww-img{filter:grayscale(0)}
}
@media (hover:none){ .aww-card .aww-cta{top:auto;bottom:4.5rem;transform:translateX(-50%)} }
@media (prefers-reduced-motion:reduce){ .aww-card *{transition:none!important} }`;

const BookmarkIcon = ({ on }) => (
  <svg width="20" height="22" viewBox="0 0 24 24" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z" /></svg>
);
const OpenIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M7 17L17 7M8 7h9v9" /></svg>
);

function AwwCard({ img, to, kicker, title, badge, count, cta, ctaOn, ctaTo, onCta, saved, onSave, under }) {
  const tt = useT();
  return (
    <div className="aww-card group">
      <div className="relative aspect-[4/3] rounded-[14px] overflow-hidden isolate" style={{ backgroundColor: 'var(--color-section-bg, #F2F2F2)' }}>
        <Link to={to} aria-label={title} className="absolute inset-0 -z-10">
          {img && <img src={img} alt="" loading="lazy" className="aww-img w-full h-full object-cover" />}
        </Link>
        {badge && <span className="absolute top-3.5 left-3.5 text-xs font-extrabold bg-white text-[#111] px-2.5 py-1 rounded-full pointer-events-none">{badge}</span>}
        {count != null && <span className="absolute top-3.5 right-3.5 text-xs font-bold text-white px-2.5 py-1 rounded-full pointer-events-none" style={{ backgroundColor: 'rgba(0,0,0,.6)' }}>{count}</span>}
        <span aria-hidden="true" className="aww-shade absolute inset-0 -z-[5] pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,.72))' }} />
        {cta && ctaTo && (
          <Link to={ctaTo} className="aww-cta absolute left-1/2 top-1/2 inline-flex items-center gap-2.5 rounded-[10px] px-[18px] py-3 text-[15px] font-medium shadow-[0_10px_30px_-10px_rgba(0,0,0,.5)] active:scale-[0.97]"
            style={{ backgroundColor: '#fff', color: '#111' }}>
            <ArrowRight className="w-4 h-4" />{cta}
          </Link>
        )}
        {cta && !ctaTo && (
          <button type="button" onClick={onCta} aria-pressed={ctaOn}
            className="aww-cta absolute left-1/2 top-1/2 inline-flex items-center gap-2.5 rounded-[10px] px-[18px] py-3 text-[15px] font-medium shadow-[0_10px_30px_-10px_rgba(0,0,0,.5)] active:scale-[0.97]"
            style={ctaOn ? { backgroundColor: '#111', color: '#fff' } : { backgroundColor: '#fff', color: '#111' }}>
            {ctaOn ? <Check className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}{cta}
          </button>
        )}
        <div className="aww-meta absolute left-5 right-5 bottom-4 flex items-end justify-between gap-3 text-white">
          <div className="min-w-0">
            {kicker && <small className="block text-xs uppercase tracking-[0.06em] opacity-90 truncate">{kicker}</small>}
            <b className="block text-xl font-semibold mt-1 truncate">{title}</b>
          </div>
          <div className="flex gap-3.5 shrink-0">
            <Link to={to} aria-label={tt({ en: 'Open', es: 'Abrir' })} className="w-[30px] h-[30px] inline-flex items-center justify-center"><OpenIcon /></Link>
            {onSave && (
              <button type="button" onClick={onSave} aria-pressed={saved} aria-label={saved ? tt({ en: 'Unfollow', es: 'Dejar de seguir' }) : tt({ en: 'Follow', es: 'Seguir' })}
                className="w-[30px] h-[30px] inline-flex items-center justify-center active:scale-95"><BookmarkIcon on={saved} /></button>
            )}
          </div>
        </div>
      </div>
      <div className="mt-3.5 flex items-center gap-2.5 flex-wrap text-lg font-bold" style={{ color: 'var(--color-heading, #111)' }}>{under}</div>
    </div>
  );
}

const AwwUnder = ({ name, word, avatar, place }) => (
  <>
    <span>{name}</span>
    {place && <span className="text-xs font-medium" style={{ color: 'var(--color-body-text, #4A4A4A)' }}>{word}</span>}
    {avatar && <img src={avatar} alt="" loading="lazy" className="w-[30px] h-[30px] rounded-full object-contain bg-white p-[3px]" style={{ border: '1px solid var(--color-card-border, #E0E0E0)' }} />}
    {place && <span className="border-b border-current">{place}</span>}
  </>
);

// Follow state for one kind ('artist' | 'venue' | 'festival'), synced with the API.
function useFollows(kind) {
  const { user } = useAuth();
  const [ids, setIds] = useState(() => new Set());
  useEffect(() => {
    if (!user) { setIds(new Set()); return; }
    gemAPI.myFollows(kind).then(r => setIds(new Set((r.data?.items || []).map(f => f.target_id)))).catch(() => {});
  }, [user, kind]);
  const toggle = (id) => (e) => {
    e.preventDefault();
    if (!user) { window.dispatchEvent(new CustomEvent('gem2i:open-login')); return; }
    const on = !ids.has(id);
    setIds(prev => { const n = new Set(prev); if (on) n.add(id); else n.delete(id); return n; });
    gemAPI.follow(kind, id, on).catch(() => setIds(prev => { const n = new Set(prev); if (on) n.delete(id); else n.add(id); return n; }));
  };
  return [ids, toggle];
}

function AwwSection({ config, fallbackTitle, allText, allUrl, chips, chip, setChip, testid, bw, children }) {
  const tt = useT();
  return (
    <Wrap testid={testid}>
      <style>{AWW_CSS}</style>
      <CatalogHead config={config} fallbackTitle={fallbackTitle} allText={allText} allUrl={allUrl} />
      {chips.length > 1 && (
        <div className="mt-6 flex flex-wrap gap-2" role="tablist">
          {chips.map(c => {
            const on = chip === c.id;
            return (
              <button key={c.id} type="button" role="tab" aria-selected={on} onClick={() => setChip(c.id)}
                className="text-[13px] font-semibold px-3.5 py-1.5 rounded-full transition-colors active:scale-[0.97]"
                style={on ? { backgroundColor: 'var(--color-accent, #2B3035)', color: 'var(--color-button-text, #fff)', border: '1px solid var(--color-accent, #2B3035)' }
                  : { backgroundColor: 'var(--color-card-bg, #fff)', color: 'var(--color-heading, #111)', border: '1px solid var(--color-card-border, #E0E0E0)' }}>
                {tt(c.label)}
              </button>
            );
          })}
        </div>
      )}
      <div className={`mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 ${bw ? 'aww-bw' : ''}`}>{children}</div>
    </Wrap>
  );
}

// AW-1 · Artists — the button opens the artist page (no voting for now, Anthony 2026-10-21) + follow.
export function NorulesArtistCards({ config = {}, items = [] }) {
  const tt = useT();
  const [follows, toggleFollow] = useFollows('artist');
  const list = items.filter(a => artistImg(a)).slice(0, parseInt(config.max_items, 10) || 6);
  if (!list.length) return null;
  const genres = (a) => (Array.isArray(a.genres) ? a.genres.slice(0, 2).join(' · ') : '');
  return (
    <AwwSection config={config} fallbackTitle={{ en: 'Artists', es: 'Artistas' }} allText={{ en: 'All artists', es: 'Todos los artistas' }} allUrl="/artists"
      chips={[]} testid="gem2i-artists" bw>
      {list.map(a => {
        const name = tt(a.name || a.title);
        return (
          <AwwCard key={a.id} img={artistImg(a, true)} to={`/artists/${a.slug}`} kicker={genres(a)} title={name}
            cta={tt({ en: 'View artist', es: 'Ver artista' })} ctaTo={`/artists/${a.slug}`}
            saved={follows.has(a.id)} onSave={toggleFollow(a.id)}
            under={<AwwUnder name={name} word={tt({ en: 'from', es: 'de' })} place={tt(a.country)} />} />
        );
      })}
    </AwwSection>
  );
}

// AW-2 · Venues — follow venue; logo as the "author" avatar.
export function NorulesVenueAww({ config = {}, items = [] }) {
  const tt = useT();
  const [country, setCountry] = useState('all');
  const [follows, toggleFollow] = useFollows('venue');
  const withPhoto = items.filter(v => gemImg(v.image_urls?.view));
  if (!withPhoto.length) return null;
  const top = Object.entries(withPhoto.reduce((m, v) => { if (v.country) m[v.country] = (m[v.country] || 0) + 1; return m; }, {}))
    .sort((a, b) => b[1] - a[1]).slice(0, 4).map(([c]) => c);
  const shown = withPhoto.filter(v => country === 'all' || v.country === country).slice(0, parseInt(config.max_items, 10) || 6);
  return (
    <AwwSection config={config} fallbackTitle={{ en: 'Featured venues', es: 'Venues destacados' }} allText={{ en: 'All venues', es: 'Todos los venues' }} allUrl="/venues"
      chips={[{ id: 'all', label: { en: 'All', es: 'Todos' } }, ...top.map(c => ({ id: c, label: c }))]} chip={country} setChip={setCountry} testid="gem2i-venues">
      {shown.map(v => {
        const name = tt(v.name || v.title);
        const on = follows.has(v.id);
        return (
          <AwwCard key={v.id} img={gemImg(v.image_urls?.view)} to={`/venues/${v.slug}`} kicker={[tt(v.city), tt(v.country)].filter(Boolean).join(', ')} title={name}
            cta={tt({ en: 'View venue', es: 'Ver venue' })} ctaTo={`/venues/${v.slug}`}
            saved={on} onSave={toggleFollow(v.id)}
            under={<AwwUnder name={name} word={tt({ en: 'in', es: 'en' })} avatar={gemImg(v.image_urls?.logo)} place={tt(v.country)} />} />
        );
      })}
    </AwwSection>
  );
}

// AW-3 · Festivals — view line-up; logo as avatar; follow.
export function NorulesFestivalAww({ config = {}, items = [] }) {
  const tt = useT();
  const [country, setCountry] = useState('all');
  const [follows, toggleFollow] = useFollows('festival');
  const withPhoto = items.filter(f => gemImg(f.image_urls?.flyer) || gemImg(f.image_urls?.logo));
  if (!withPhoto.length) return null;
  const top = Object.entries(withPhoto.reduce((m, f) => { if (f.country) m[f.country] = (m[f.country] || 0) + 1; return m; }, {}))
    .sort((a, b) => b[1] - a[1]).slice(0, 4).map(([c]) => c);
  const shown = withPhoto.filter(f => country === 'all' || f.country === country).slice(0, parseInt(config.max_items, 10) || 6);
  return (
    <AwwSection config={config} fallbackTitle={{ en: 'Festival season', es: 'Temporada de festivales' }} allText={{ en: 'All festivals', es: 'Todos los festivales' }} allUrl="/festivals"
      chips={[{ id: 'all', label: { en: 'All', es: 'Todos' } }, ...top.map(c => ({ id: c, label: c }))]} chip={country} setChip={setCountry} testid="gem2i-festivals">
      {shown.map(f => {
        const name = tt(f.title || f.name);
        const place = [f.city && f.city !== 'None' ? tt(f.city) : '', tt(f.country)].filter(Boolean).join(', ');
        return (
          <AwwCard key={f.id} img={gemImg(f.image_urls?.flyer) || gemImg(f.image_urls?.logo)} to={`/festivals/${f.slug}`}
            kicker={tt(f.range_dates) || tt({ en: 'Festival', es: 'Festival' })} title={name}
            cta={tt({ en: 'View line-up', es: 'Ver line-up' })} ctaTo={`/festivals/${f.slug}`}
            saved={follows.has(f.id)} onSave={toggleFollow(f.id)}
            under={<AwwUnder name={name} word={tt({ en: 'by', es: 'por' })} avatar={gemImg(f.image_urls?.logo)} place={place} />} />
        );
      })}
    </AwwSection>
  );
}

// ── X1 · Featured as giant type: rows dim on hover, a tilted photo follows the cursor.
export function GemFeaturedType({ items = [], heading }) {
  const tt = useT();
  const [active, setActive] = useState(-1);
  const float = useRef(null);
  const pos = useRef({ x: 0, y: 0, fx: 0, fy: 0 });
  useEffect(() => {
    let raf;
    const move = (e) => { pos.current.x = e.clientX; pos.current.y = e.clientY; };
    const loop = () => {
      const p = pos.current;
      p.fx += (p.x - p.fx) * 0.12; p.fy += (p.y - p.fy) * 0.12;
      if (float.current) float.current.style.transform = `translate(${p.fx + 40}px, ${p.fy - 170}px)`;
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener('mousemove', move);
    raf = requestAnimationFrame(loop);
    return () => { window.removeEventListener('mousemove', move); cancelAnimationFrame(raf); };
  }, []);
  if (!items.length) return null;
  const imgOf = (f) => gemImg(f.image) || DEFAULT_FEATURED_IMG[f.url] || DEFAULT_INTRO_IMG;
  return (
    <section className="max-w-7xl mx-auto px-6 md:px-10 py-20 md:py-28" data-testid="gem2i-featured-type">
      <GemHeading eyebrow={heading?.kicker || items[0]?.kicker || { en: 'Featured', es: 'Destacados' }}
        title={heading?.title || { en: 'Explore the scene', es: 'Explora la escena' }}
        subtitle={heading?.subtitle || { en: 'Sort through the best of the scene.', es: 'Lo mejor de la escena, por categoría.' }} />
      <div className="mt-14 border-t" style={{ borderColor: BORDER }} onMouseLeave={() => setActive(-1)}>
        {items.map((f, i) => {
          const dim = active >= 0 && active !== i;
          const row = (
            <>
              <span className="hidden md:block font-mono text-[13px] font-semibold" style={{ color: BODY }}>{String(tt(f.title) || '').charAt(0).toUpperCase()}</span>
              <span className="font-extrabold leading-[.9] tracking-[-0.05em] capitalize transition-[transform,color] duration-500 ease-[cubic-bezier(.2,.8,.2,1)] md:group-hover:translate-x-7 motion-reduce:transition-none"
                style={{ fontSize: 'clamp(3rem, 9vw, 8.5rem)', color: dim ? 'color-mix(in srgb, var(--color-body-text, #9aa7b4) 45%, transparent)' : undefined }}>
                <span className={dim ? '' : 'text-white'}>{String(tt(f.title) || '').toLowerCase()}</span>
                {tt(f.count) && <i className="ml-3 align-top font-bold not-italic md:italic" style={{ fontFamily: "'Playfair Display', serif", fontSize: '.45em', color: ACCENT }}>{tt(f.count)}</i>}
              </span>
              {tt(f.text) && <span className="md:col-start-3 max-w-[300px] text-sm leading-[1.6] transition-[opacity,transform] duration-500 md:opacity-0 md:-translate-x-3 md:group-hover:opacity-100 md:group-hover:translate-x-0" style={{ color: BODY }}>{plainText(tt(f.text))}</span>}
            </>
          );
          const cls = 'group grid grid-cols-1 md:grid-cols-[60px_1fr_auto] items-center gap-x-6 gap-y-2 py-6 md:py-7 border-b md:cursor-none';
          return f.url
            ? <Link key={i} to={f.url} className={cls} style={{ borderColor: BORDER }} onMouseEnter={() => setActive(i)} data-testid={`gem2i-featured-type-${i}`}>{row}</Link>
            : <div key={i} className={cls} style={{ borderColor: BORDER }} onMouseEnter={() => setActive(i)}>{row}</div>;
        })}
      </div>
      {/* Floating photo (mouse only). */}
      <div ref={float} aria-hidden="true" className="hidden md:block fixed left-0 top-0 z-40 pointer-events-none">
        <div className="relative w-[300px] aspect-[4/5] rounded-[18px] overflow-hidden shadow-[0_30px_70px_-20px_rgba(0,0,0,.45)] transition-[opacity,transform] duration-500 ease-[cubic-bezier(.2,.8,.2,1)]"
          style={{ opacity: active >= 0 ? 1 : 0, transform: active >= 0 ? 'rotate(-3deg) scale(1)' : 'rotate(-6deg) scale(.6)' }}>
          {items.map((f, i) => (
            <img key={i} src={imgOf(f)} alt="" className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300" style={{ opacity: active === i ? 1 : 0 }} />
          ))}
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full inline-flex items-center justify-center text-[11px] font-bold tracking-[0.12em] text-white" style={{ backgroundColor: 'rgba(13,15,18,.85)' }}>
            {tt({ en: 'EXPLORE', es: 'EXPLORAR' })}
          </span>
        </div>
      </div>
    </section>
  );
}

// ── X2 · Featured on a dark stage: greyscale photos, a spotlight follows the cursor and lights them up.
function SpotlightCard({ f, i, total }) {
  const tt = useT();
  const ref = useRef(null);
  const img = gemImg(f.image) || DEFAULT_FEATURED_IMG[f.url] || DEFAULT_INTRO_IMG;
  const move = (e) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--x', `${e.clientX - r.left}px`);
    el.style.setProperty('--y', `${e.clientY - r.top}px`);
  };
  const mask = 'radial-gradient(circle var(--r) at var(--x) var(--y), #000 40%, transparent 100%)';
  const body = (
    <>
      <img src={img} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover grayscale brightness-50 md:brightness-[.22]" />
      <img src={img} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" style={{ WebkitMaskImage: mask, maskImage: mask }} />
      <span className="absolute right-5 top-5 z-[2] w-11 h-11 rounded-full inline-flex items-center justify-center text-white border border-white/30 transition-[background-color,color,transform] duration-300 group-hover:bg-white group-hover:text-black group-hover:-rotate-45">
        <ArrowRight className="w-4 h-4" />
      </span>
      <div className="absolute inset-0 z-[2] p-6 md:p-7 flex flex-col justify-between pointer-events-none">
        <span className="font-mono text-xs tracking-[0.14em] uppercase text-white/55">GEM2i · {tt(f.title)}</span>
        <div>
          <h3 className="text-white font-extrabold leading-[.9] tracking-[-0.04em] capitalize" style={{ fontSize: 'clamp(2.4rem, 4.2vw, 3.6rem)' }}>{String(tt(f.title) || '').toLowerCase()}</h3>
          {tt(f.count) && <p className="mt-2 text-[13px] font-extrabold tracking-[0.1em]" style={{ color: ACCENT }}>{tt(f.count)}</p>}
          {tt(f.text) && <p className="mt-3 max-w-[30ch] text-sm leading-[1.6] text-white/80 line-clamp-3 transition-[opacity,transform] duration-500 md:opacity-0 md:translate-y-2.5 md:group-hover:opacity-100 md:group-hover:translate-y-0">{plainText(tt(f.text))}</p>}
        </div>
      </div>
    </>
  );
  const cls = 'group relative block aspect-[4/3] md:aspect-[3/4] rounded-[22px] overflow-hidden bg-black isolate [--r:0px] md:hover:[--r:190px]';
  const style = { '--x': '50%', '--y': '50%' };
  return f.url
    ? <Link ref={ref} to={f.url} onMouseMove={move} className={cls} style={style} data-testid={`gem2i-featured-stage-${i}`} aria-label={`${tt(f.title)} (${i + 1}/${total})`}>{body}</Link>
    : <div ref={ref} onMouseMove={move} className={cls} style={style}>{body}</div>;
}

export function GemFeaturedStage({ items = [], heading }) {
  const tt = useT();
  if (!items.length) return null;
  return (
    <section className="gem-tone-dark" style={{ backgroundColor: '#0D0F12' }} data-testid="gem2i-featured-stage">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-20 md:py-28">
        <p className="flex items-center gap-3.5 text-xs font-bold uppercase tracking-[0.28em] text-white/80"><span className="w-8 h-px bg-current" />{tt(heading?.kicker || items[0]?.kicker) || tt({ en: 'Featured', es: 'Destacados' })}</p>
        <h2 className="mt-4 text-white font-bold leading-[1.05]" style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(2.2rem, 4.4vw, 3.6rem)' }}>
          <AccentTitle text={tt(heading?.title) || tt({ en: 'Explore the scene', es: 'Explora la escena' })} />
        </h2>
        <p className="mt-3 text-[17px]" style={{ color: '#8b939c' }}>{tt(heading?.subtitle) || tt({ en: 'Sort through the best of the scene.', es: 'Lo mejor de la escena, por categoría.' })}</p>
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-4">
          {items.map((f, i) => <SpotlightCard key={i} f={f} i={i} total={items.length} />)}
        </div>
      </div>
    </section>
  );
}

// ── Methodology · M2 "DJ deck": the steps as a track — a light playhead runs along a waveform and
// lights each step as it passes. Plays once when scrolled into view; steps are clickable.
const WAVE = Array.from({ length: 96 }, (_, i) => 18 + Math.abs(Math.sin(i * 0.55) * 50 + Math.sin(i * 0.17) * 30));
export function GemMethodDeck({ config = {}, items = [], testid = 'gem2i-methodology' }) {
  const tt = useT();
  const box = useRef(null);
  const raf = useRef(0);
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(false);
  const n = items.length;
  useEffect(() => {
    if (!playing) return undefined;
    const step = () => {
      setPos(p => {
        const next = Math.min(1, p + 0.0022);
        if (next >= 1) setPlaying(false);
        return next;
      });
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [playing]);
  useEffect(() => {
    const el = box.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setPlaying(true); io.disconnect(); } }, { threshold: 0.45 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  if (!n) return null;
  const active = Math.min(n - 1, Math.floor(pos * n));
  const toggle = () => { if (pos >= 1) setPos(0); setPlaying(p => !p); };
  const jump = (i) => { setPlaying(false); setPos((i + 0.5) / n); };
  return (
    <Wrap testid={testid}>
      <GemHeading eyebrow={config.eyebrow} title={config.title} subtitle={config.subtitle} />
      <div ref={box} className="gem-tone-dark mt-12 rounded-[32px] p-6 md:p-11 text-white overflow-hidden" style={{ backgroundColor: '#0D0F12' }}>
        <div className="flex flex-wrap items-center justify-between gap-5">
          <button type="button" onClick={toggle} className="gem-press inline-flex items-center gap-3 rounded-full bg-white py-2.5 pl-2.5 pr-5 text-sm font-extrabold" style={{ color: '#0D0F12' }} aria-pressed={playing}>
            <span className="w-9 h-9 rounded-full inline-flex items-center justify-center text-white text-[13px]" style={{ backgroundColor: ACCENT }}>{playing ? '❚❚' : pos >= 1 ? '↻' : '▶'}</span>
            {tt({ en: 'Play the method', es: 'Reproduce el método' })}
          </button>
          <span className="font-mono text-xs tracking-[0.14em] uppercase text-white/45">GEM2i · {n} {tt({ en: 'steps', es: 'pasos' })}</span>
        </div>
        <div className="relative mt-10 h-20 md:h-[120px] flex items-center gap-[3px]" aria-hidden="true">
          {WAVE.map((h, i) => (
            <b key={i} className="flex-1 rounded-[3px] transition-colors duration-200" style={{ height: `${h}%`, backgroundColor: i / WAVE.length <= pos ? ACCENT : '#2A3038' }} />
          ))}
          <span className="absolute -top-2.5 -bottom-2.5 w-0.5 bg-white" style={{ left: `${pos * 100}%`, boxShadow: '0 0 18px 2px rgba(255,255,255,.6)' }} />
        </div>
        <div className="mt-7 grid border-t md:grid-cols-3" style={{ borderColor: '#262C33', gridTemplateColumns: undefined }}>
          {items.map((s, i) => (
            <button key={s.id || i} type="button" onClick={() => jump(i)} aria-current={i === active}
              className={`text-left py-5 md:pt-7 md:pb-0 md:pr-7 border-b md:border-b-0 transition-colors duration-500 ${i === active ? 'text-white' : 'text-white/40'}`} style={{ borderColor: '#262C33' }}>
              <span className="block text-[11px] font-bold tracking-[0.2em] uppercase mb-3 transition-opacity duration-500" style={{ color: 'var(--color-link, #5FB2E0)', opacity: i === active ? 1 : 0 }}>{tt({ en: 'Now playing', es: 'Sonando' })}</span>
              <h3 className="font-extrabold tracking-[-0.03em] leading-[1.1]" style={{ fontSize: 'clamp(1.4rem, 2.2vw, 2rem)' }}>{tt(s.title)}</h3>
              {tt(s.description) && <div className={`mt-2.5 max-w-[34ch] text-[15px] leading-[1.7] transition-opacity duration-500 [&_*]:!text-inherit [&_p]:m-0 text-white/70 ${i === active ? '' : 'opacity-50'}`} dangerouslySetInnerHTML={{ __html: normalizeRichText(tt(s.description)) }} />}
            </button>
          ))}
        </div>
      </div>
    </Wrap>
  );
}

const evCta = (e) => (e.type === 'eticket' || e.external_ticket_system ? { en: 'Get tickets', es: 'Comprar entradas' }
  : e.type === 'guest_list' ? { en: 'Join guest list', es: 'Unirme a la lista' } : { en: 'View event', es: 'Ver evento' });
const evDate = (s) => (s ? new Date(`${String(s).slice(0, 10)}T12:00:00`) : null);
const evFlyer = (e) => gemImg(e.image_urls?.flyer || e.image_urls?.logo);

// ── Who it is for · W3: each audience is a backstage pass; it tilts in 3D after the cursor with a holographic sheen.
function AudiencePass({ it }) {
  const tt = useT();
  const ref = useRef(null);
  const move = (e) => {
    const p = ref.current; if (!p || !window.matchMedia('(hover: hover)').matches) return;
    const r = p.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width; const y = (e.clientY - r.top) / r.height;
    p.style.transform = `rotateY(${(x - 0.5) * 16}deg) rotateX(${(0.5 - y) * 16}deg)`;
    p.style.setProperty('--hx', `${x * 100}%`); p.style.setProperty('--hy', `${y * 100}%`);
  };
  const reset = () => { if (ref.current) ref.current.style.transform = ''; };
  const img = gemImg(it.image);
  return (
    <div ref={ref} onMouseMove={move} onMouseLeave={reset}
      className="group relative aspect-[3/4.4] rounded-3xl overflow-hidden text-white transition-transform duration-200 [transform-style:preserve-3d] shadow-[0_30px_60px_-30px_rgba(0,0,0,.5)]"
      style={{ backgroundColor: '#0D0F12' }}>
      <span aria-hidden="true" className="absolute left-1/2 top-4 z-[3] w-14 h-2 -ml-7 rounded-full bg-white/20" />
      {img && <img src={img} alt="" loading="lazy" className="absolute inset-x-0 top-0 h-[58%] w-full object-cover" />}
      <span aria-hidden="true" className="absolute inset-0 z-[2] pointer-events-none opacity-0 transition-opacity duration-300 group-hover:opacity-80 mix-blend-color-dodge"
        style={{ background: 'linear-gradient(115deg, transparent 20%, rgba(120,220,255,.55) 38%, rgba(255,120,220,.45) 50%, rgba(255,240,140,.45) 62%, transparent 80%)', backgroundSize: '250% 250%', backgroundPosition: 'var(--hx, 50%) var(--hy, 50%)' }} />
      <div className="gem-tone-dark absolute inset-x-0 bottom-0 h-[46%] p-6 flex flex-col justify-between border-t-2 border-dashed border-white/20" style={{ backgroundColor: '#0D0F12' }}>
        <span aria-hidden="true" className="absolute -top-3 -left-3 w-6 h-6 rounded-full" style={{ backgroundColor: 'var(--color-section-bg, #fff)' }} />
        <span aria-hidden="true" className="absolute -top-3 -right-3 w-6 h-6 rounded-full" style={{ backgroundColor: 'var(--color-section-bg, #fff)' }} />
        <div>
          <span className="text-[11px] font-bold tracking-[0.24em] uppercase" style={{ color: 'var(--color-link, #5FB2E0)' }}>GEM2i · All access</span>
          <h3 className="mt-1.5 text-[28px] font-extrabold leading-none tracking-[-0.03em] text-white">{tt(it.title)}</h3>
          {tt(it.description) && <p className="mt-2 text-sm leading-[1.6] text-white/65 line-clamp-3">{plainText(tt(it.description))}</p>}
        </div>
        <div className="flex justify-between items-end mt-3" aria-hidden="true">
          <span className="h-6 w-28 opacity-70" style={{ background: 'repeating-linear-gradient(90deg,#fff 0 2px,transparent 2px 4px,#fff 4px 5px,transparent 5px 8px)' }} />
          <span className="text-xs font-bold text-white">MEMBER</span>
        </div>
      </div>
    </div>
  );
}
export function GemAudiencePasses({ config = {}, items = [] }) {
  if (!items.length) return null;
  return (
    <Wrap testid="gem2i-audience">
      <GemHeading eyebrow={config.eyebrow} title={config.title} subtitle={config.subtitle} />
      <div className="mt-14 grid gap-7 sm:grid-cols-2 lg:grid-cols-3 [perspective:1200px] max-w-sm sm:max-w-none mx-auto">
        {items.map((it, i) => <AudiencePass key={it.id || i} it={it} />)}
      </div>
      {config.cta_text && <div className="mt-11 text-center"><GemCta text={config.cta_text} url={config.cta_url} newTab={config.cta_new_tab} /></div>}
    </Wrap>
  );
}

// ── How it works · H1: a phone in the middle shows the app for each step; steps advance on their own (or on click).
function PhoneScreen({ i, events }) {
  const tt = useT();
  const kind = i % 4;
  const ink = '#16191D'; const soft = '#F3F4F6'; const mut = '#5B636C';
  if (kind === 0) return (
    <>
      <p className="text-xs" style={{ color: mut }}>{tt({ en: 'Enter the code a member shared with you', es: 'Escribe el código que te compartieron' })}</p>
      <div className="flex gap-1.5 mt-1">{'GEM2I'.split('').map((c, k) => <span key={k} className="flex-1 h-12 rounded-xl grid place-items-center text-xl font-extrabold" style={{ backgroundColor: soft, color: ink }}>{c}</span>)}</div>
      <span className="mt-auto rounded-full py-3 text-center text-sm font-bold text-white" style={{ backgroundColor: ink }}>{tt({ en: 'Create my account', es: 'Crear mi cuenta' })}</span>
    </>
  );
  if (kind === 1) return (
    <>
      {(events.length ? events.slice(0, 3) : [{}, {}, {}]).map((e, k) => {
        const d = evDate(e.event_date);
        return (
          <div key={k} className="flex gap-2.5 items-center p-2 rounded-xl" style={{ backgroundColor: soft }}>
            <span className="w-12 h-12 rounded-lg bg-cover bg-center shrink-0" style={{ backgroundColor: '#dfe2e6', backgroundImage: evFlyer(e) ? `url("${evFlyer(e)}")` : undefined }} />
            <span className="min-w-0"><b className="block text-[13px] truncate" style={{ color: ink }}>{tt(e.title) || '—'}</b><span className="text-[11px]" style={{ color: mut }}>{d ? d.toLocaleDateString('en', { month: 'short', day: 'numeric' }) : ''}{e.venue?.city ? ` · ${e.venue.city}` : ''}</span></span>
          </div>
        );
      })}
      <span className="mt-auto rounded-full py-3 text-center text-sm font-bold text-white" style={{ backgroundColor: ink }}>{tt({ en: 'Join guest list', es: 'Unirme a la lista' })}</span>
    </>
  );
  if (kind === 2) return (
    <>
      <p className="text-xs" style={{ color: mut }}>{events[0] ? tt(events[0].title) : 'GEM2i'}</p>
      <span className="mx-auto mt-2 w-[160px] h-[160px] rounded-2xl" aria-hidden="true"
        style={{ border: `10px solid ${soft}`, background: `conic-gradient(from 90deg at 18% 18%, ${ink} 25%, transparent 0) 0 0/32px 32px, linear-gradient(${ink},${ink}) 50% 50%/38px 38px no-repeat, ${soft}` }} />
      <p className="text-xs text-center" style={{ color: mut }}>{tt({ en: 'Show this QR at the door', es: 'Muestra este QR en la puerta' })}</p>
    </>
  );
  return (
    <>
      <p className="mt-4 text-center text-5xl font-extrabold tracking-[-0.04em]" style={{ color: 'var(--color-accent, #3287B7)' }}>+250</p>
      <p className="text-xs text-center" style={{ color: mut }}>{tt({ en: 'points · 3 friends joined', es: 'puntos · 3 amigos se unieron' })}</p>
      <span className="mt-auto rounded-full py-3 text-center text-sm font-bold text-white" style={{ backgroundColor: ink }}>{tt({ en: 'Share my invite code', es: 'Compartir mi código' })}</span>
    </>
  );
}
export function GemProcessPhone({ config = {}, items = [], events = [] }) {
  const tt = useT();
  const [at, setAt] = useState(0);
  const n = items.length;
  useEffect(() => {
    if (n < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const t = setTimeout(() => setAt(a => (a + 1) % n), 3600);
    return () => clearTimeout(t);
  }, [at, n]);
  if (!n) return null;
  const half = Math.ceil(n / 2);
  const Step = ({ s, i }) => (
    <button type="button" onClick={() => setAt(i)} aria-current={i === at}
      className="text-left rounded-[18px] px-5 py-[18px] transition-colors duration-300"
      style={i === at ? { backgroundColor: 'var(--color-card-bg, #121A23)' } : undefined}>
      <h3 className={`text-[19px] font-bold tracking-[-0.015em] transition-colors ${i === at ? 'text-white' : ''}`} style={i === at ? undefined : { color: 'color-mix(in srgb, var(--color-body-text, #9AA6B2) 70%, transparent)' }}>{tt(s.title)}</h3>
      {tt(s.description) && <p className="mt-1.5 text-[14.5px] leading-[1.6]" style={{ color: BODY, opacity: i === at ? 1 : 0.6 }}>{plainText(tt(s.description))}</p>}
      <span className="block mt-3.5 h-0.5 rounded overflow-hidden" style={{ backgroundColor: BORDER }}>
        {i === at && <i key={`b${at}`} className="block h-full animate-[gemFill_3.6s_linear_forwards] motion-reduce:animate-none" style={{ backgroundColor: ACCENT, width: 0 }} />}
      </span>
    </button>
  );
  return (
    <Wrap testid="gem2i-process">
      <style>{'@keyframes gemFill{to{width:100%}}'}</style>
      <GemHeading eyebrow={config.eyebrow} title={config.title} subtitle={config.subtitle} />
      <div className="mt-14 grid gap-10 lg:grid-cols-[1fr_auto_1fr] items-center justify-items-center lg:justify-items-stretch">
        <div className="grid gap-4 w-full">{items.slice(0, half).map((s, i) => <Step key={s.id || i} s={s} i={i} />)}</div>
        <div className="gem-tone-dark w-[250px] h-[510px] md:w-[290px] md:h-[590px] rounded-[46px] p-3 shadow-[0_40px_80px_-30px_rgba(0,0,0,.45)]" style={{ backgroundColor: '#0D0F12' }} aria-hidden="true">
          <div className="relative w-full h-full rounded-[36px] overflow-hidden" style={{ backgroundColor: '#fff' }}>
            <span className="absolute left-1/2 top-2.5 z-[5] w-[90px] h-6 -ml-[45px] rounded-full" style={{ backgroundColor: '#0D0F12' }} />
            <div key={at} className="absolute inset-0 pt-14 px-5 pb-5 flex flex-col gap-3 animate-[gemSwap_.55s_cubic-bezier(.2,.8,.2,1)_both] motion-reduce:animate-none">
              <style>{'@keyframes gemSwap{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}'}</style>
              <p className="text-xl font-extrabold tracking-[-0.02em]" style={{ color: '#16191D' }}>{tt(items[at].title)}</p>
              <PhoneScreen i={at} events={events} />
            </div>
          </div>
        </div>
        <div className="grid gap-4 w-full">{items.slice(half).map((s, i) => <Step key={s.id || i} s={s} i={i + half} />)}</div>
      </div>
    </Wrap>
  );
}

// ── Upcoming events · U2: flyers in a 3D coverflow (centre one big, sides turned and dimmed); info below swaps.
export function GemEventCoverflow({ config = {}, items = [], testid = 'gem2i-events' }) {
  const tt = useT();
  const { lang } = useLang() || { lang: 'en' };
  const [at, setAt] = useState(items.length > 1 ? 1 : 0);
  const n = items.length;
  // Advances on its own every 4 s (loops) and keeps going after a click (Anthony, 2026-10-22).
  useEffect(() => {
    if (n < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const t = setTimeout(() => setAt(a => (a + 1) % n), 4000);
    return () => clearTimeout(t);
  }, [at, n]);
  if (!n) return null;
  const go = (d) => setAt(a => (a + d + n) % n);
  const e = items[Math.min(at, items.length - 1)];
  const d = evDate(e.event_date);
  const price = fromPrice(e);
  const time = clock(e.open_time, lang);
  const place = [e.venue?.name, e.venue?.city].filter(Boolean).join(', ');
  return (
    <Wrap testid={testid}>
      <style>{'@keyframes gemSwap{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}'}</style>
      <GemHeading eyebrow={config.eyebrow} title={config.title || { en: 'Upcoming events', es: 'Próximos eventos' }} subtitle={config.subtitle}
        action={<GemCta text={config.cta_text || { en: 'All events', es: 'Todos los eventos' }} url={config.cta_url || '/events'} newTab={config.cta_new_tab} />} />
      <div className="relative mt-10 h-[410px] md:h-[520px] [perspective:1600px] overflow-hidden" onKeyDown={(k) => { if (k.key === 'ArrowLeft') go(-1); if (k.key === 'ArrowRight') go(1); }}>
        {items.map((ev, i) => {
          const o = i - at; const a = Math.abs(o);
          const img = evFlyer(ev);
          return (
            <button key={ev.id || i} type="button" onClick={() => setAt(i)} tabIndex={o === 0 ? 0 : -1} aria-label={tt(ev.title)}
              className="absolute left-1/2 top-2.5 w-[230px] -ml-[115px] md:w-[300px] md:-ml-[150px] aspect-[2/3] rounded-[20px] overflow-hidden bg-black shadow-[0_40px_70px_-30px_rgba(0,0,0,.55)] transition-[transform,filter,opacity] duration-[800ms] ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none"
              style={{
                transform: o === 0 ? 'translateZ(80px)' : `translateX(${o * 190 + Math.sign(o) * 90}px) translateZ(${-a * 120}px) rotateY(${-Math.sign(o) * 42}deg)`,
                zIndex: 10 - a, filter: o === 0 ? 'none' : `brightness(${1 - a * 0.22})`, opacity: a > 3 ? 0 : 1,
              }}>
              {img && <img src={img} alt="" loading="lazy" className="w-full h-full object-cover" />}
            </button>
          );
        })}
      </div>
      <div key={at} className="mx-auto max-w-[860px] grid grid-cols-[auto_1fr] md:grid-cols-[auto_1fr_auto] gap-5 md:gap-7 items-center border-t pt-6 animate-[gemSwap_.5s_cubic-bezier(.2,.8,.2,1)_both] motion-reduce:animate-none" style={{ borderColor: BORDER }}>
        {d && (
          <p className="text-center text-white font-extrabold text-[54px] leading-[.9] tracking-[-0.04em] tabular-nums">
            {d.getDate()}
            <small className="block mt-1.5 text-[13px] tracking-[0.2em] uppercase font-bold" style={{ color: BODY }}>{d.toLocaleDateString(lang === 'es' ? 'es' : 'en', { month: 'short', weekday: 'short' }).replace('.', '')}</small>
          </p>
        )}
        <div className="min-w-0">
          <h3 className="text-white text-[26px] font-extrabold leading-[1.1] tracking-[-0.025em]">{tt(e.title)}</h3>
          {(place || time) && <p className="mt-1.5" style={{ color: BODY }}>{[place, time].filter(Boolean).join(' · ')}</p>}
          <NBtn to={`/events/${e.slug}`} variant="a" className="mt-3.5">{tt(evCta(e))}{price ? ` · ${tt({ en: 'from', es: 'desde' })} ${price}` : ''}</NBtn>
        </div>
        <div className="col-span-2 md:col-span-1 flex justify-center gap-2">
          {[-1, 1].map(s => (
            <button key={s} type="button" onClick={() => go(s)}
              aria-label={s < 0 ? tt({ en: 'Previous', es: 'Anterior' }) : tt({ en: 'Next', es: 'Siguiente' })}
              className="w-11 h-11 rounded-full inline-flex items-center justify-center text-white transition-[background-color,opacity] hover:bg-white/10 disabled:opacity-30" style={{ border: `1px solid ${BORDER}` }}>
              <ArrowRight className={`w-4 h-4 ${s < 0 ? 'rotate-180' : ''}`} />
            </button>
          ))}
        </div>
      </div>
    </Wrap>
  );
}

// ── Testimonials · TS3: polaroids pinned to a cork board, a little crooked; drag them around (mouse or finger),
// the one you touch comes to the front. On phones they stack in a column.
const POLAROID_SPOTS = [[4, 6, -6], [27, 24, 4], [52, 4, -3], [74, 26, 7], [12, 52, 3], [44, 50, -5], [68, 56, 4], [86, 6, -4]];
export function GemTestimonialBoard({ config = {}, items = [] }) {
  const tt = useT();
  const board = useRef(null);
  const z = useRef(10);
  if (!items.length) return null;
  const list = items.slice(0, POLAROID_SPOTS.length);
  const grab = (e) => {
    const el = e.currentTarget;
    if (!board.current || !window.matchMedia('(min-width: 768px)').matches) return;
    el.setPointerCapture(e.pointerId);
    el.style.zIndex = ++z.current;
    const sx = e.clientX; const sy = e.clientY; const ox = el.offsetLeft; const oy = el.offsetTop;
    const move = (m) => { el.style.left = `${ox + m.clientX - sx}px`; el.style.top = `${oy + m.clientY - sy}px`; };
    const up = () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
  };
  return (
    <Wrap testid="gem2i-testimonials">
      <GemHeading eyebrow={config.eyebrow} title={config.title || { en: 'What the night says', es: 'Lo que dice la noche' }} subtitle={config.subtitle} />
      <div ref={board} className="relative mt-10 rounded-[28px] p-6 md:p-0 flex flex-col items-center gap-8 md:block md:h-[620px] overflow-hidden"
        style={{ backgroundColor: '#EFE9DF', backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(0,0,0,.04), transparent 40%)' }}>
        {list.map((t, i) => {
          const [x, y, r] = POLAROID_SPOTS[i];
          const name = tt(t.name);
          const img = gemImg(t.image);
          return (
            <figure key={t.id || i} onPointerDown={grab}
              className="relative md:absolute w-[240px] md:w-[250px] m-0 p-3 pb-[18px] select-none md:cursor-grab md:active:cursor-grabbing md:touch-none shadow-[0_18px_30px_-14px_rgba(0,0,0,.35)]"
              style={{ left: undefined, '--x': `${x}%`, '--y': `${y}%`, transform: `rotate(${r}deg)`, backgroundColor: '#fff', color: '#1A1A1A' }}
              ref={el => { if (el && window.matchMedia('(min-width: 768px)').matches && !el.dataset.placed) { el.style.left = `${x}%`; el.style.top = `${y}%`; el.dataset.placed = '1'; } }}>
              <span aria-hidden="true" className="absolute left-1/2 -top-2.5 -ml-[11px] w-[22px] h-[22px] rounded-full" style={{ background: 'radial-gradient(circle at 35% 35%, #ff8a7a, #c0392b)', boxShadow: '0 3px 5px rgba(0,0,0,.3)' }} />
              {img
                ? <img src={img} alt="" draggable="false" className="w-full aspect-square object-cover" />
                : <span aria-hidden="true" className="w-full aspect-square grid place-items-center text-5xl font-bold text-white" style={{ background: 'linear-gradient(160deg, #002444, #0068b3)', fontFamily: "'Playfair Display', serif" }}>{name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('')}</span>}
              <blockquote className="mt-3 mx-1 mb-2 text-[15px] leading-[1.45] italic font-semibold" style={{ fontFamily: "'Playfair Display', serif", color: '#1A1A1A' }}>“{plainText(tt(t.content))}”</blockquote>
              <figcaption className="mx-1 text-[12.5px]"><b style={{ color: '#1A1A1A' }}>{name}</b>{tt(t.title) && <span style={{ color: '#777' }}> · {tt(t.title)}</span>}</figcaption>
            </figure>
          );
        })}
      </div>
    </Wrap>
  );
}

// ── Latest news · N1: magazine cover — the active story's photo big on the left, the headlines on the right;
// hovering (or tapping) a headline swaps the photo with a fade and reveals «Read more».
export function GemNewsCover({ config = {}, items = [] }) {
  const tt = useT();
  const parts = useDateParts();
  const [at, setAt] = useState(0);
  if (!items.length) return null;
  const list = items.slice(0, 5);
  const cur = list[Math.min(at, list.length - 1)];
  const dateOf = (p) => { const d = parts((p.date || '').slice(0, 10)); return d ? `${d.day} ${d.month}` : ''; };
  return (
    <Wrap testid="gem2i-news">
      <style>{'@keyframes gemSwap{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}'}</style>
      <GemHeading eyebrow={config.eyebrow} title={config.title || { en: 'Latest news', es: 'Últimas noticias' }} subtitle={config.subtitle}
        action={<GemCta text={config.cta_text} url={config.cta_url} newTab={config.cta_new_tab} />} />
      <div className="mt-11 grid gap-9 lg:grid-cols-[1.25fr_1fr]">
        <a href={cur.url} className="group relative block min-h-[380px] lg:min-h-[520px] rounded-[28px] overflow-hidden" style={{ backgroundColor: '#000' }}>
          {list.map((p, i) => p.image && (
            <img key={p.url || i} src={p.image} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-[opacity,transform] duration-[600ms,1200ms] ease-[cubic-bezier(.2,.8,.2,1)]"
              style={{ opacity: i === at ? 1 : 0, transform: i === at ? 'none' : 'scale(1.06)' }} />
          ))}
          <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,.85))' }} />
          <div key={at} className="absolute left-7 right-7 bottom-7 text-white animate-[gemSwap_.55s_cubic-bezier(.2,.8,.2,1)_both] motion-reduce:animate-none">
            {dateOf(cur) && <small className="text-xs font-extrabold tracking-[0.18em] uppercase">{dateOf(cur)}</small>}
            <h3 className="mt-2 font-bold leading-[1.15]" style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.6rem, 2.8vw, 2.4rem)' }}>{tt(cur.title) || cur.title}</h3>
          </div>
        </a>
        <div className="border-t" style={{ borderColor: BORDER }}>
          {list.map((p, i) => {
            const on = i === at;
            return (
              <a key={p.url || i} href={p.url} onMouseEnter={() => setAt(i)} onFocus={() => setAt(i)}
                onClick={(e) => { if (!on && !window.matchMedia('(hover: hover)').matches) { e.preventDefault(); setAt(i); } }}
                className="block border-b py-6" style={{ borderColor: BORDER }}>
                {dateOf(p) && <small className="text-xs font-extrabold tracking-[0.16em] uppercase" style={{ color: BODY }}>{dateOf(p)}</small>}
                <h4 className={`mt-2 text-xl font-bold leading-[1.3] transition-colors duration-300 ${on ? 'text-white' : ''}`} style={on ? undefined : { color: 'color-mix(in srgb, var(--color-body-text, #9AA6B2) 70%, transparent)' }}>{tt(p.title) || p.title}</h4>
                {(tt(p.summary) || p.summary) && <p className="mt-1.5 text-[14.5px] leading-[1.6] line-clamp-2 transition-opacity duration-300" style={{ color: BODY, opacity: on ? 1 : 0.6 }}>{tt(p.summary) || p.summary}</p>}
                <span className="inline-block mt-2.5 text-[13px] font-extrabold transition-[opacity,transform] duration-[300ms,400ms] text-white" style={{ opacity: on ? 1 : 0, transform: on ? 'none' : 'translateX(-8px)' }}>
                  {tt({ en: 'Read more', es: 'Leer más' })} →
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </Wrap>
  );
}
