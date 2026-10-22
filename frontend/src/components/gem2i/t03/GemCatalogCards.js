/* Gem2i - 03 (`gem2i_03`) — own copy of GemCatalogCards (template = package, D-GEM-2026-15). */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MapPin, CalendarDays } from 'lucide-react';
import { publicAPI, gemAPI } from '../../../lib/api';
import { useSettings } from '../../../App';
import { useT } from '../../../lib/i18n';
import { useAuth } from '../../../lib/auth';
import { slideForAudience, isLoggedInUser } from '../../../lib/heroAudience';
import { GemHeroA, GemHeroB, GemHeroC } from '../GemHeroVariants';
import AccentTitle from '../AccentTitle';
import GemDateRange from '../GemDateRange';

/**
 * Catalog pages v2 (approved 2026-10-19, bocetos/catalogos-paginas.html):
 * one card hover for every catalog — the legacy dark veil wipes in left→right
 * (1s, cubic-bezier(.19,1,.22,1)), the photo zooms, the info rises in and the
 * logo turns from grey to colour — plus the shared search bar, continent tabs,
 * segmented switches and the per-page CMS hero.
 */

export const ACCENT = 'var(--color-accent, #0068b3)';
export const LINK = 'var(--color-link, #5AAFEA)';
export const BODY = 'var(--color-body-text, #b4c0cb)';
export const CARD = 'var(--color-card-bg, #0D1721)';
export const LINE = 'var(--color-card-border, rgba(255,255,255,0.09))';

export const CARD_CSS = `
.gcard{position:relative;display:block;overflow:hidden;isolation:isolate;background:${CARD};outline:none}
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
 *  template's variant (01 → A, 02 → B + next event, 03 → C + upcoming strip),
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
      : <GemHeroA slide={list[0]} slides={list} linked={linked} />;
  // Same wrapper as the homepage: template 02 is full-width (.gem-tpl-wide
  // lifts the max-w-7xl of [data-section] blocks, index.css).
  return <div className={tpl === 'gem2i_02' ? 'gem-tpl-wide' : undefined}><div data-section="hero">{hero}</div></div>;
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
    <form onSubmit={submit} className="mt-8 grid gap-2.5 p-3 rounded-2xl grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(var(--n),minmax(0,1fr))_auto_auto] items-center"
      style={{ '--n': fields.reduce((n, f) => n + (f.type === 'places' ? 3 : 1), 0), backgroundColor: 'var(--color-section-bg-alt, #0A121A)', border: `1px solid ${LINE}` }} data-testid="catalog-search">
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
            className="w-full rounded-xl px-3.5 py-3 text-[15px] text-white placeholder:text-white/45 focus:outline-none focus:ring-1 focus:ring-[var(--color-link,#5AAFEA)] [color-scheme:dark]"
            style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }} />
        </label>
      )))}
      <button type="submit" className="rounded-full px-6 py-3 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 active:scale-[0.98]" style={{ backgroundColor: ACCENT }}>
        {tt({ en: 'Search', es: 'Buscar' })}
      </button>
      <button type="button" onClick={onReset} className="rounded-full px-6 py-3 text-[15px] font-medium text-white border border-white/30 transition-colors hover:bg-white/10">
        {tt({ en: 'Reset', es: 'Limpiar' })}
      </button>
    </form>
  );
}

const SELECT_CLS = 'w-full rounded-xl px-3.5 py-3 text-[15px] text-white focus:outline-none focus:ring-1 focus:ring-[var(--color-link,#5AAFEA)] disabled:opacity-40 [color-scheme:dark]';

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
        className={SELECT_CLS} style={{ ...box, color: draft[key] ? '#fff' : 'rgba(255,255,255,.55)' }}>
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
          className={`${SELECT_CLS} placeholder:text-white/45`} style={box} />
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
            style={on ? { backgroundColor: ACCENT, color: '#fff', fontWeight: 600, border: `1px solid ${ACCENT}` } : { color: BODY, border: `1px solid ${LINE}` }}>
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
          style={value === o.value ? { backgroundColor: '#fff', color: '#04080C', fontWeight: 700 } : { color: BODY }}>
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

export function LogoBadge({ src, size = 84 }) {
  if (!src) return null;
  return (
    <span className="glogo absolute right-3.5 top-3.5 z-[3] rounded-full overflow-hidden bg-white flex items-center justify-center p-3 shadow-[0_8px_20px_-8px_rgba(0,0,0,.5)]" style={{ width: size, height: size }}>
      <img src={src} alt="" loading="lazy" className="max-w-full max-h-full object-contain" />
    </span>
  );
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
        <span className="mt-3 self-start inline-flex items-center gap-2 border border-white/80 px-3.5 py-1.5 text-[14px] font-medium text-white">
          {cta || tt({ en: 'View details', es: 'Ver detalles' })} <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </span>
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
