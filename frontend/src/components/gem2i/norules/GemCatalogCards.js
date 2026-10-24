/* Norules (`gem2i`) — own copy of GemCatalogCards (template = package, D-GEM-2026-15). */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, CalendarDays } from 'lucide-react';
import { publicAPI, gemAPI } from '../../../lib/api';
import { useSettings } from '../../../App';
import { useT } from '../../../lib/i18n';
import { useAuth } from '../../../lib/auth';
import { slideForAudience, isLoggedInUser } from '../../../lib/heroAudience';
import { GemHeroB, GemHeroC } from '../GemHeroVariants';
import { NorulesHeroU } from './NorulesHeroU';
import { websitePaletteFor } from '../../../lib/themeColors';
import { toneOf } from '../../../lib/gemLook';
import AccentTitle from '../AccentTitle';
import { NBtn, NBtnLook } from './NBtn';
import GemDateRange from '../GemDateRange';

/**
 * Catalog pages v2 (approved 2026-10-19, bocetos/catalogos-paginas.html):
 * one card hover for every catalog — the legacy dark veil wipes in left→right
 * (1s, cubic-bezier(.19,1,.22,1)), the photo zooms, the info rises in and the
 * logo turns from grey to colour — plus the shared search bar, continent tabs,
 * segmented switches and the per-page CMS hero.
 */

/** Page tone for Norules inner pages (D-GEM-2026-14): a light palette flips the page to dark text via
 *  .gem-tone-light, as on the home; the palette's own text/card/link colours are re-applied so the
 *  tone's generic values don't win. Spread onto the page root: <div className={tone.className} style={tone.style}>. */
export function usePageTone() {
  const settings = useSettings();
  const pal = websitePaletteFor(settings.theme_colors, settings.active_theme);
  if (toneOf(pal.page_bg) !== 'light') return { className: '', style: {} };
  return {
    className: 'gem-tone-light',
    style: { '--gem-ink': '#1D2228', '--color-seg-on': '#2A3038', '--color-seg-on-text': '#fff', '--color-body-text': pal.body_text, '--color-card-bg': pal.card_bg, '--color-card-border': pal.card_border, '--color-link': pal.link_color },
  };
}

export const ACCENT = 'var(--color-accent, #0068b3)';
export const LINK = 'var(--color-link, #5AAFEA)';
export const BODY = 'var(--color-body-text, #b4c0cb)';
export const CARD = 'var(--color-card-bg, #0D1721)';
export const LINE = 'var(--color-card-border, rgba(255,255,255,0.09))';

export const CARD_CSS = `
.gcard{position:relative;display:block;overflow:hidden;isolation:isolate;background:#0E1216;border-radius:18px;outline:none}
.gcard .gph{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:transform .7s ease-out}
.gcard::before{content:'';position:absolute;inset:0;z-index:1;background:linear-gradient(180deg,rgba(4,8,12,.55),rgba(4,8,12,.92) 70%);transform:scaleX(0);transform-origin:right center;transition:transform 1s cubic-bezier(.19,1,.22,1)}
.gcard:hover::before,.gcard:focus-visible::before{transform:scaleX(1);transform-origin:left center}
.gcard:hover .gph,.gcard:focus-visible .gph{transform:scale(1.05)}
.gcard .glogo img{filter:grayscale(1);opacity:.85;transition:filter .3s,opacity .3s}
.gcard:hover .glogo img,.gcard:focus-visible .glogo img{filter:none;opacity:1}
.gcard .ginfo{opacity:0;transform:translateY(18px);transition:opacity .5s,transform 1.2s cubic-bezier(.19,1,.22,1)}
.gcard:hover .ginfo,.gcard:focus-visible .ginfo{opacity:1;transform:none}
.gcard .gstrip{transition:opacity .3s}
.gcard:hover .gstrip,.gcard:focus-visible .gstrip{opacity:0}
.gcard:focus-visible{box-shadow:inset 0 0 0 3px ${LINK}}
@media (hover:none){.gcard::before{transform:scaleX(1)}.gcard .ginfo{opacity:1;transform:none}.gcard .gstrip{opacity:0}}
@media (prefers-reduced-motion:reduce){.gcard::before,.gcard .gph,.gcard .ginfo,.gcard .glogo img{transition:none}}
`;

/** CMS hero for an inner page (Hero slide → Page Assignment: about / events /
 *  festivals / artists / venues) — the SAME hero as the homepage: the active
 *  template's variant (Norules → U, 02 → B + next event, 03 → C + upcoming strip),
 *  full height, carousel, CTA actions, audience filter. Nothing renders while
 *  no slide is assigned to the page. */
export function PageHero({ page }) {
  const settings = useSettings();
  const [slides, setSlides] = useState([]);
  const [events, setEvents] = useState([]);
  const [linked, setLinked] = useState([]);
  const { user, loading } = useAuth();
  const tpl = settings.active_theme;
  useEffect(() => {
    let alive = true;
    publicAPI.getHeroSlides(page).then(r => { if (alive) setSlides(r.data || []); }).catch(() => {});
    gemAPI.heroEvents().then(r => { if (alive) setLinked(r.data?.items || []); }).catch(() => {});
    if (tpl === 'gem2i_02' || tpl === 'gem2i_03') {
      gemAPI.events({ limit: 12 }).then(r => { if (alive) setEvents(r.data?.items || []); }).catch(() => {});
    }
    return () => { alive = false; };
  }, [page, tpl]);
  if (loading) return null;
  const list = slides.filter(s => slideForAudience(s, isLoggedInUser(user)));
  if (!list.length) return null;
  const hero = tpl === 'gem2i_02' ? <GemHeroB slide={list[0]} slides={list} event={events[0]} linked={linked} />
    : tpl === 'gem2i_03' ? <GemHeroC slide={list[0]} slides={list} events={events} linked={linked} />
      : <NorulesHeroU slide={list[0]} slides={list} linked={linked} />; // Norules: the same hero U as the home
  // Same wrapper as the homepage: template 02 is full-width (.gem-tpl-wide
  // lifts the max-w-7xl of [data-section] blocks, index.css).
  // Norules: exactly the home wrapper (hero U handles its own colours over the photo); the other variants
  // sit on a photo too, so a light palette must not turn their text dark.
  if (tpl !== 'gem2i_02' && tpl !== 'gem2i_03') return <div data-section="hero">{hero}</div>;
  return <div className={`gem-tone-dark ${tpl === 'gem2i_02' ? 'gem-tpl-wide' : ''}`}><div data-section="hero">{hero}</div></div>;
}

export function PageHead({ eyebrow, title, children }) {
  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 pt-16 md:pt-20">
      {eyebrow && <p className="gem-eyebrow mb-3" style={{ color: LINK }}>{eyebrow}</p>}
      <h1 className="text-white font-bold leading-[1.05]" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(2.2rem, 4.4vw, 3.4rem)' }}>
        <AccentTitle text={title} />
      </h1>
      {children}
    </div>
  );
}

/** Legacy free-text search: N inputs + Search + Reset. Fields apply on Search/Enter. */
export function SearchBar({ fields, values, onSearch, onReset }) {
  const tt = useT();
  const [draft, setDraft] = useState(values);
  useEffect(() => { setDraft(values); }, [values]);
  // A single picked day searches that day (from = to).
  const submit = (e) => { e.preventDefault(); onSearch(draft.date_from && !draft.date_to ? { ...draft, date_to: draft.date_from } : draft); };
  return (
    <form onSubmit={submit} className="gem-tone-dark mt-8 grid gap-2.5 p-3 rounded-[20px] grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(var(--n),minmax(0,1fr))_auto_auto] items-center"
      style={{ '--n': fields.reduce((n, f) => n + (f.type === 'places' ? 3 : 1), 0), backgroundColor: '#0E1216' }} data-testid="catalog-search">
      {fields.map(f => (f.type === 'places' ? (
        <PlaceSelects key="places" catalog={f.catalog} draft={draft} setDraft={setDraft} />
      ) : f.type === 'daterange' ? (
        <GemDateRange key="dates" catalog={f.catalog} value={{ from: draft.date_from, to: draft.date_to }}
          onChange={v => setDraft({ ...draft, date_from: v.from, date_to: v.to })} />
      ) : (
        <label key={f.key} className="block">
          <span className="sr-only">{f.placeholder}</span>
          <input type={f.type || 'text'} value={draft[f.key] || ''} placeholder={f.placeholder} inputMode={f.inputMode}
            onChange={e => setDraft({ ...draft, [f.key]: e.target.value })}
            className="w-full rounded-xl px-3.5 py-3 text-[15px] text-white placeholder:text-white/80 focus:outline-none focus:ring-1 focus:ring-[var(--color-link,#5AAFEA)] [color-scheme:dark]"
            style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }} />
        </label>
      )))}
      <NBtn type="submit" variant="w">{tt({ en: 'Search', es: 'Buscar' })}</NBtn>
      <NBtn onClick={onReset} variant="g" icon="none">{tt({ en: 'Reset', es: 'Limpiar' })}</NBtn>
    </form>
  );
}

const SELECT_CLS = 'w-full rounded-xl px-3.5 py-3 text-[15px] text-white focus:outline-none focus:ring-1 focus:ring-[var(--color-link,#5AAFEA)] disabled:opacity-60 [color-scheme:dark]';

/** Nested Country → State → City for the catalog search, fed by the full geo
 *  tables (GET /public/gem/places). Country and State are selects; City is a
 *  type-ahead (a country can have 20k+ cities). Changing a parent clears its
 *  children. */
function PlaceSelects({ catalog, draft, setDraft }) {
  const tt = useT();
  const [opt, setOpt] = useState({ countries: [], states: [], cities: [] });
  const [cityQ, setCityQ] = useState(draft.city || '');
  useEffect(() => { setCityQ(draft.city || ''); }, [draft.city]);
  useEffect(() => {
    let alive = true;
    const id = setTimeout(() => {
      gemAPI.places(catalog, draft.country, draft.state, cityQ).then(r => { if (alive && r.data) setOpt(r.data); }).catch(() => {});
    }, cityQ ? 200 : 0);
    return () => { alive = false; clearTimeout(id); };
  }, [catalog, draft.country, draft.state, cityQ]);
  const listId = `gem-cities-${catalog}`;
  const box = { backgroundColor: CARD, border: `1px solid ${LINE}` };
  const sel = (key, label, options, disabled, clear) => (
    <label className="block">
      <span className="sr-only">{label}</span>
      <select value={draft[key] || ''} disabled={disabled} aria-label={label}
        onChange={e => setDraft({ ...draft, [key]: e.target.value, ...clear })}
        className={SELECT_CLS} style={{ ...box, color: draft[key] ? '#fff' : 'rgba(255,255,255,.85)' }}>
        <option value="">{label}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
  return (
    <>
      {sel('country', tt({ en: 'All countries', es: 'Todos los países' }), opt.countries, false, { state: '', city: '' })}
      {sel('state', tt({ en: 'All states', es: 'Todos los estados' }), opt.states, !draft.country || !opt.states.length, { city: '' })}
      <label className="block">
        <span className="sr-only">{tt({ en: 'City', es: 'Ciudad' })}</span>
        <input list={listId} value={cityQ} disabled={!draft.country} autoComplete="off"
          placeholder={draft.country ? tt({ en: 'Type a city…', es: 'Escribe una ciudad…' }) : tt({ en: 'City', es: 'Ciudad' })}
          onChange={e => { setCityQ(e.target.value); setDraft({ ...draft, city: e.target.value }); }}
          className={`${SELECT_CLS} placeholder:text-white/80`} style={box} />
        <datalist id={listId}>{opt.cities.map(c => <option key={c} value={c} />)}</datalist>
      </label>
    </>
  );
}

/** Legacy continent tabs: All · USA · Europe · North America · … */
const CONTINENTS = ['Europe', 'North America', 'South America', 'Africa', 'Oceania', 'Asia'];
export function ContinentTabs({ value, onChange }) {
  const tt = useT();
  const opts = [{ v: '', l: tt({ en: 'All', es: 'Todos' }) }, { v: 'USA', l: 'USA' },
    ...CONTINENTS.map(c => ({ v: c, l: c }))];
  return (
    <div className="mt-5 mb-6 flex flex-wrap gap-2" role="tablist">
      {opts.map(o => {
        const on = value === o.v;
        return (
          <button key={o.v || 'all'} type="button" role="tab" aria-selected={on} onClick={() => onChange(o.v)}
            className="px-4 py-2 rounded-full text-sm transition-colors"
            style={on ? { backgroundColor: 'var(--color-seg-on, ' + ACCENT + ')', color: '#fff', fontWeight: 600, border: '1px solid var(--color-seg-on, ' + ACCENT + ')' } : { color: BODY, border: `1px solid ${LINE}` }}>
            {o.l}
          </button>
        );
      })}
    </div>
  );
}
/** USA tab = country filter; the rest = continent. */
export const continentParams = (tab) => (tab === 'USA' ? { country: 'United States' } : tab ? { continent: tab } : {});

export function Segmented({ options, value, onChange, label }) {
  return (
    <div className="inline-flex rounded-full p-1 gap-1" style={{ border: `1px solid ${LINE}` }} role="group" aria-label={label}>
      {options.map(o => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}
          className="px-4 py-2 rounded-full text-sm transition-colors"
          style={value === o.value ? { backgroundColor: 'var(--color-seg-on, #fff)', color: 'var(--color-seg-on-text, #04080C)', fontWeight: 700 } : { color: BODY }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function NumChip({ n }) {
  if (n == null || n === '') return null;
  return <span className="absolute left-3.5 top-3.5 z-[3] min-w-[40px] h-10 px-2 inline-flex items-center justify-center text-white text-[17px] font-bold tabular-nums" style={{ backgroundColor: ACCENT }}>{n}</span>;
}

/** Disc background that matches the logo: legacy logos come as squares with their own background
 *  (often white), which showed as a cut-out square inside the dark circle. The first corner pixel gives
 *  that background; a transparent logo gets dark or light depending on how bright its ink is. */
const discCache = {};
export function useLogoDisc(src) {
  const [bg, setBg] = useState(discCache[src] || '#FFFFFF');
  useEffect(() => {
    if (!src) return undefined;
    if (discCache[src]) { setBg(discCache[src]); return undefined; }
    let alive = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        const w = (c.width = Math.min(64, img.naturalWidth || 64));
        const h = (c.height = Math.min(64, img.naturalHeight || 64));
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const d = ctx.getImageData(0, 0, w, h).data;
        let out;
        if (d[3] > 200) out = `rgb(${d[0]},${d[1]},${d[2]})`;
        else {
          let sum = 0; let n = 0;
          for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 128) { sum += (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000; n += 1; }
          out = n && sum / n > 150 ? '#14181D' : '#FFFFFF';
        }
        discCache[src] = out;
        if (alive) setBg(out);
      } catch { /* tainted canvas: keep the dark disc */ }
    };
    img.src = src;
    return () => { alive = false; };
  }, [src]);
  return bg;
}

/** Round logo like the legacy catalog: a white disc with the logo filling it (no inner square). The disc
 *  takes the logo's own background colour; only a light logo on transparency gets a dark disc. */
export function LogoDisc({ src, size = 84, className = '', style }) {
  const bg = useLogoDisc(src);
  if (!src) return null;
  return (
    <span className={`glogo rounded-full overflow-hidden flex items-center justify-center shadow-[0_8px_20px_-8px_rgba(0,0,0,.5)] ${className}`}
      style={{ width: size, height: size, backgroundColor: bg, padding: Math.round(size * 0.08), ...style }}>
      <img src={src} alt="" loading="lazy" className="w-full h-full object-contain" />
    </span>
  );
}

export function LogoBadge({ src, size = 90 }) {
  return <LogoDisc src={src} size={size} className="absolute right-3.5 top-3.5 z-[3]" />;
}

/** One catalog card. `meta` = lines shown on hover; `strip` = name at rest. */
export function HoverCard({ to, img, imgStyle, aspect = 'aspect-[4/3]', className = '', top, logo, title, meta = [], extra, cta, strip, testid, label }) {
  const tt = useT();
  const [broken, setBroken] = useState(false);
  return (
    <Link to={to} className={`gcard group ${aspect} ${className}`} data-testid={testid} aria-label={label || title}>
      {img && !broken && <img className="gph" src={img} alt="" loading="lazy" style={imgStyle} onError={() => setBroken(true)} />}
      {top}
      {logo && <LogoBadge src={logo} />}
      {strip && <span className="gstrip absolute inset-x-0 bottom-0 z-[2] px-4 py-3.5 font-semibold text-white" style={{ background: 'linear-gradient(180deg,transparent,rgba(4,8,12,.85))' }}>{strip}</span>}
      <span className="ginfo absolute inset-x-0 bottom-0 z-[2] flex flex-col px-5 pt-5 pb-5 border-t border-white/10">
        <span className="text-white text-[21px] 2xl:text-[23px] font-semibold leading-tight">{title}</span>
        {meta.filter(Boolean).length > 0 && (
          <span className="mt-1.5 flex flex-col gap-1 text-[14px]" style={{ color: '#d6e2ec' }}>
            {meta.filter(Boolean).map((m, i) => <span key={i} className="inline-flex items-start gap-1.5">{m}</span>)}
          </span>
        )}
        {extra}
        <NBtnLook className="mt-3 self-start">{cta || tt({ en: 'View details', es: 'Ver detalles' })}</NBtnLook>
      </span>
    </Link>
  );
}

export const Where = ({ children }) => (children ? <><MapPin className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />{children}</> : null);
export const When = ({ children }) => (children ? <><CalendarDays className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />{children}</> : null);

/** "Sat, Apr 19, 2030" in the current language. */
export function useFmtDate() {
  const tt = useT();
  const loc = tt({ en: 'en-US', es: 'es-ES' });
  return (d, opts = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) => {
    if (!d) return '';
    const dt = new Date(`${String(d).slice(0, 10)}T12:00:00`);
    return Number.isNaN(dt.getTime()) ? String(d) : dt.toLocaleDateString(loc, opts);
  };
}
export const place = (...parts) => parts.filter(Boolean).join(', ');
