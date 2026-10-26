/* Gem2i (`gem2i_02`) — the pages Norules has and Gem2i lacked, copied from NorulesExtraPages.js (same features):
 *   /conferences       listing (card + list view, legacy search, continent tabs)
 *   /travels/:slug     trip page T2 (packages, itinerary, includes, countdown)
 *   /works             portfolio (featured case + masonry + viewer)
 *   /gallery           photo mosaic with category tabs + viewer
 *   /media             videos (featured + grid + player) and press list
 *   /map/:slug         office page (map, local time, team of the region, events nearby)
 *   /terms, /privacy   legal text with a sticky table of contents
 * Template = package (D-GEM-2026-15): only the Gem2i routes use these. The Gem2i design comes later. */
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, X, ChevronLeft, ChevronRight, MapPin, CalendarDays, Clock } from 'lucide-react';
import { gemAPI, publicAPI } from '../../../lib/api';
import { useT } from '../../../lib/i18n';
import { normalizeRichText } from '../../../lib/richText';
import { gemImg, Paginator, SkeletonGrid, EmptyState } from '../../../components/gem2i/GemCatalogBits';
import {
  LogoDisc, HoverCard, SearchBar, Segmented, ContinentTabs, continentParams, Where, useFmtDate, place, ACCENT, BODY, LINE, CARD,
} from '../../../components/gem2i/g02/GemCatalogCards';
import AccentTitle from '../../../components/gem2i/AccentTitle';
import {
  ListShell, DetailShell, Crumb, Section, PhotoHero, HeroChip, Countdown, EventPosterCard, MapEmbed, officeSlug, NotFoundShell, SERIF,
} from '../../../components/gem2i/g02/G02DetailBits';
import { useSection, MembersGate, tripSlug, zoneOf, localTime } from './G02Helpers';
import { NBtnLook } from '../../../components/gem2i/g02/G02Btn';

const lines = (txt) => String(txt || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
const cols = (line) => line.split('|').map(x => x.trim());

/** Full-screen viewer for images / videos; ←/→/Esc on the keyboard. */
function Viewer({ items, index, onClose, onMove, render }) {
  useEffect(() => {
    if (index == null) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onMove(1);
      if (e.key === 'ArrowLeft') onMove(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, onClose, onMove]);
  if (index == null || !items[index]) return null;
  const nav = 'absolute top-1/2 -translate-y-1/2 w-12 h-12 rounded-full border border-white/30 text-white flex items-center justify-center hover:bg-white/10';
  return (
    <div className="fixed inset-0 z-[2000] flex flex-col items-center justify-center gap-4 p-6 text-white" style={{ backgroundColor: 'rgba(8,10,12,.95)' }} role="dialog" aria-modal="true">
      <button type="button" onClick={onClose} className="absolute top-5 right-6 w-11 h-11 rounded-full border border-white/30 flex items-center justify-center hover:bg-white/10" aria-label="Close"><X className="w-5 h-5" /></button>
      {items.length > 1 && <button type="button" onClick={() => onMove(-1)} className={`${nav} left-4`} aria-label="Previous"><ChevronLeft className="w-5 h-5" /></button>}
      {render(items[index])}
      {items.length > 1 && <button type="button" onClick={() => onMove(1)} className={`${nav} right-4`} aria-label="Next"><ChevronRight className="w-5 h-5" /></button>}
    </div>
  );
}
function useViewer(n) {
  const [i, setI] = useState(null);
  return { i, open: setI, close: () => setI(null), move: (d) => setI(x => (x == null ? x : (x + d + n) % n)) };
}

// ── /conferences ─────────────────────────────────────────────────────────────
const EMPTY = { q: '', date_from: '', date_to: '', country: '', state: '', city: '' };

export function Gem2iConferences() {
  const tt = useT();
  const fmt = useFmtDate();
  const [filters, setFilters] = useState(EMPTY);
  const [tab, setTab] = useState('');
  const [scope, setScope] = useState('');
  const [hasUpcoming, setHasUpcoming] = useState(false);
  const [view, setView] = useState(() => { try { return localStorage.getItem('gem2i_conf_view') || 'grid'; } catch { return 'grid'; } });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);

  useEffect(() => { try { localStorage.setItem('gem2i_conf_view', view); } catch { /* private mode */ } }, [view]);
  useEffect(() => {
    gemAPI.conferencesMeta().then(r => { const n = r.data?.upcoming || 0; setHasUpcoming(n > 0); if (n > 0) setScope('upcoming'); }).catch(() => {});
  }, []);
  useEffect(() => {
    let alive = true;
    setData(null);
    const params = { page, limit: 24, ...continentParams(tab) };
    if (scope) params.scope = scope;
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    gemAPI.conferences(params).then(r => { if (alive) setData(r.data); }).catch(() => { if (alive) setData({ items: [], pages: 1 }); });
    return () => { alive = false; };
  }, [filters, tab, scope, page]);

  const dates = (c) => c.range_dates || fmt(c.event_date, { month: 'long', day: 'numeric', year: 'numeric' });
  const where = (c) => place(c.city || c.state, c.country);
  const nSessions = (c) => (c.sessions || []).filter(s => s.visible !== false && s.title).length;
  const cta = (c) => (nSessions(c) ? tt({ en: 'View schedule', es: 'Ver programa' }) : tt({ en: 'View details', es: 'Ver detalles' }));

  return (
    <ListShell page="conferences" testid="gem2i-conferences-page" eyebrow={tt({ en: 'Music', es: 'Música' })} title={tt({ en: 'Music conferences', es: 'Conferencias de música' })}
      head={<>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          {hasUpcoming ? <Segmented value={scope} onChange={v => { setScope(v); setPage(1); }} label={tt({ en: 'Period', es: 'Periodo' })} options={[
            { value: 'upcoming', label: tt({ en: 'Upcoming', es: 'Próximas' }) }, { value: 'past', label: tt({ en: 'Past', es: 'Pasadas' }) },
          ]} /> : <span />}
          <Segmented value={view} onChange={setView} label={tt({ en: 'View', es: 'Vista' })} options={[
            { value: 'grid', label: tt({ en: 'Card view', es: 'Vista de cards' }) }, { value: 'list', label: tt({ en: 'List view', es: 'Vista de lista' }) },
          ]} />
        </div>
        <SearchBar values={filters} onSearch={v => { setFilters(v); setPage(1); }} onReset={() => { setFilters(EMPTY); setTab(''); setPage(1); }} fields={[
          { key: 'q', placeholder: tt({ en: 'by name…', es: 'por nombre…' }) },
          { type: 'daterange', key: 'dates', catalog: 'conferences' },
          { type: 'places', key: 'places', catalog: 'conferences' },
        ]} />
        <ContinentTabs value={tab} onChange={v => { setTab(v); setPage(1); }} />
      </>}>
      {!data ? <SkeletonGrid count={8} aspect="aspect-[3/4]" /> : data.items.length === 0 ? (
        <EmptyState>{tt({ en: 'No conferences match these filters.', es: 'Ninguna conferencia coincide con estos filtros.' })}</EmptyState>
      ) : view === 'grid' ? (
        // CO-A (boceto gem2i-conferences.html): conferences have logos, not photos -> the card is built around the
        // logo on white (legacy logos are dark on white); date in blue, name, place, sessions; legacy veil on hover.
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="conference-grid">
          {data.items.map(c => (
            <Link key={c.id} to={`/conferences/${c.slug}`} data-testid="conference-card"
              className="confc group relative block rounded-[4px] overflow-hidden" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
              <span className="block aspect-square bg-white p-8">
                {(c.image_urls?.logo || c.image_urls?.flyer) && <img src={gemImg(c.image_urls?.logo) || gemImg(c.image_urls?.flyer)} alt="" loading="lazy" className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-[1.05]" />}
              </span>
              <span className="relative z-[2] block px-4 pt-3.5 pb-4">
                {dates(c) && <small className="block text-[12px] font-extrabold tracking-[0.08em] uppercase" style={{ color: 'var(--color-link, #5AAFEA)' }}>{dates(c)}</small>}
                <span className="block mt-1 text-white text-[16.5px] font-bold leading-snug">{c.title}</span>
                <small className="block mt-0.5 text-[13px] opacity-75">{[where(c), nSessions(c) > 0 && `${nSessions(c)} ${tt({ en: 'sessions', es: 'sesiones' })}`].filter(Boolean).join(' · ')}</small>
              </span>
              <span className="confc-veil absolute inset-0 z-[3] flex items-end p-5 text-white font-bold text-[15px]" aria-hidden="true">{cta(c)} →</span>
            </Link>
          ))}
          <style>{'.confc-veil{background:rgba(0,104,179,.88);transform:scaleX(0);transform-origin:right center;transition:transform 1s cubic-bezier(.19,1,.22,1)}.confc:hover .confc-veil,.confc:focus-visible .confc-veil{transform:scaleX(1);transform-origin:left center}@media (hover:none){.confc-veil{display:none}}@media (prefers-reduced-motion:reduce){.confc-veil{transition:none}}'}</style>
        </div>
      ) : (
        <div className="border-t" style={{ borderColor: LINE }}>
          {data.items.map(c => (
            <Link key={c.id} to={`/conferences/${c.slug}`} data-testid="conference-row"
              className="evrow grid grid-cols-[64px_1fr_auto] md:grid-cols-[84px_1.4fr_1fr_140px_auto] gap-4 md:gap-5 items-center px-2.5 py-3 border-b" style={{ borderColor: LINE }}>
              <LogoDisc src={gemImg(c.image_urls?.logo)} size={72} />
              <span><span className="block text-[22px] font-bold leading-tight" style={{ fontFamily: SERIF }}>{c.title}</span><small className="opacity-70 text-[13.5px]">{dates(c)}</small></span>
              <span className="hidden md:inline-flex items-start gap-1.5 text-[14px] opacity-80">{where(c) && <><MapPin className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />{where(c)}</>}</span>
              <span className="hidden md:block text-[13.5px] opacity-70">{nSessions(c) ? `${nSessions(c)} ${tt({ en: 'sessions', es: 'sesiones' })}` : '—'}</span>
              <NBtnLook variant="c" className="shrink-0"><span className="hidden sm:inline">{cta(c)}</span></NBtnLook>
            </Link>
          ))}
        </div>
      )}
      {data && data.items.length > 0 && <Paginator page={data.page} pages={data.pages} onPage={setPage} />}
    </ListShell>
  );
}

// ── /travels/:slug ───────────────────────────────────────────────────────────
/** /travels/:slug — TD-A (2026-10-26, boceto gem2i-travel-detail.html): photo header with status, dates, place,
 *  nights, departure and countdown; trip, included, itinerary, gallery, map; sticky packages card. No CMS hero. */
export function Gem2iTravelDetail() {
  const { slug } = useParams();
  const tt = useT();
  const s = useSection('gem_travels');
  const [pkg, setPkg] = useState(0);
  if (!s) return <DetailShell><div className="py-24"><SkeletonGrid count={3} /></div></DetailShell>;
  const cfg = s.config || {};
  const item = (s.items || []).find(i => i.visible !== false && tripSlug(i) === slug);
  if (!item) {
    return <NotFoundShell backTo="/travels" backLabel={tt({ en: 'Back to Travels', es: 'Volver a Viajes' })}>{tt({ en: 'Trip not found.', es: 'Viaje no encontrado.' })}</NotFoundShell>;
  }
  const packages = lines(tt(item.packages)).map(cols).filter(p => p[0]);
  const itinerary = lines(tt(item.itinerary)).map(cols);
  const includes = lines(tt(item.includes));
  const gallery = [item.gallery, item.gallery_2, item.gallery_3].filter(Boolean);
  const total = Number(item.spots_total) || 0;
  const taken = Math.min(Number(item.spots_taken) || 0, total);
  const soldOut = item.status === 'sold_out' || (total > 0 && taken >= total);
  const statusLabel = { open: tt({ en: 'Open', es: 'Abierto' }), last: tt({ en: 'Last spots', es: 'Últimas plazas' }), soon: tt({ en: 'Coming soon', es: 'Próximamente' }), sold_out: tt({ en: 'Sold out', es: 'Agotado' }) }[item.status];

  return (
    <DetailShell testid="gem2i-travel-detail">
      <Crumb items={[[tt({ en: 'Travels', es: 'Viajes' }), '/travels'], [tt(item.title)]]} />
      <MembersGate on={cfg.members_only !== false}>
        <PhotoHero img={gemImg(item.image)} minH="min-h-[420px] md:min-h-[480px]">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] items-end">
            <div>
              {statusLabel && <span className="inline-block mb-2 rounded-[4px] px-2.5 py-1 text-[11px] font-extrabold tracking-[0.12em] uppercase" style={{ backgroundColor: { open: '#2fbf71', last: '#E8A23B', soon: '#5AAFEA', sold_out: '#8A949E' }[item.status] || '#fff', color: '#04080C' }}>{statusLabel}</span>}
              <h1 className="mb-4 font-bold leading-[.95] text-white" style={{ fontFamily: SERIF, fontSize: 'clamp(2.6rem, 6vw, 5rem)' }}>{tt(item.title)}</h1>
              <HeroChip icon={CalendarDays}>{tt(item.dates)}</HeroChip>
              <HeroChip icon={MapPin}>{tt(item.address)}</HeroChip>
              {item.nights && <HeroChip>🌙 {item.nights} {tt({ en: 'nights', es: 'noches' })}</HeroChip>}
              {tt(item.departure_from) && <HeroChip>✈ {tt({ en: 'From', es: 'Desde' })} {tt(item.departure_from)}</HeroChip>}
            </div>
            <Countdown iso={item.departure_date} label={tt({ en: 'DEPARTURE IN', es: 'SALIDA EN' })} />
          </div>
        </PhotoHero>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1.5fr_1fr] items-start">
          <div>
            <Section title={tt({ en: 'The trip', es: 'El viaje' })} first>
              <div className="max-w-[68ch] text-base md:text-[16.5px] leading-[1.85] [&_p]:mb-3.5" style={{ color: BODY }} dangerouslySetInnerHTML={{ __html: normalizeRichText(tt(item.description) || '') }} />
            </Section>
            {includes.length > 0 && (
              <Section title={tt({ en: "What's included", es: 'Qué incluye' })}>
                <ul className="grid sm:grid-cols-2 gap-2.5 list-none p-0 m-0">
                  {includes.map(x => <li key={x} className="rounded-[4px] px-4 py-3 text-white font-semibold" style={{ border: `1px solid ${LINE}`, backgroundColor: CARD }}>✓ {x}</li>)}
                </ul>
              </Section>
            )}
            {itinerary.length > 0 && (
              <Section title={tt({ en: 'Itinerary', es: 'Itinerario' })}>
                <ol className="list-none m-0 ml-2.5 p-0 border-l-2" style={{ borderColor: LINE }}>
                  {itinerary.map(([day, text], i) => (
                    <li key={i} className="relative pl-6 pb-5">
                      <span aria-hidden="true" className="absolute -left-[8px] top-1 w-3.5 h-3.5 rounded-full border-2" style={{ backgroundColor: 'var(--color-link, #5AAFEA)', borderColor: 'var(--color-link, #5AAFEA)' }} />
                      <b className="block" style={{ color: 'var(--color-link, #5AAFEA)' }}>{day}</b>{text && <span style={{ color: BODY }}>{text}</span>}
                    </li>
                  ))}
                </ol>
              </Section>
            )}
            {gallery.length > 0 && (
              <Section title={tt({ en: 'Gallery', es: 'Galería' })}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">{gallery.map(g => <img key={g} src={gemImg(g)} alt="" loading="lazy" className="w-full aspect-[4/3] object-cover rounded-[4px]" />)}</div>
              </Section>
            )}
            {item.map_url && <Section title={tt({ en: 'Where', es: 'Dónde' })}><MapEmbed src={item.map_url} title={tt(item.title)} /></Section>}
          </div>

          <aside className="lg:sticky lg:top-24 rounded-[4px] p-6" style={{ border: `1px solid ${LINE}`, backgroundColor: CARD }} data-testid="trip-packages">
            <b className="block text-white text-[22px]" style={{ fontFamily: SERIF }}>{packages.length ? tt({ en: 'Choose your package', es: 'Elige tu paquete' }) : tt({ en: 'Join this trip', es: 'Únete a este viaje' })}</b>
            <small style={{ color: BODY }}>{tt({ en: 'Members only · prices per person', es: 'Solo miembros · precio por persona' })}</small>
            {packages.map(([name, price, desc], i) => (
              <button key={name} type="button" onClick={() => setPkg(i)} aria-pressed={pkg === i}
                className="mt-2.5 w-full text-left grid grid-cols-[1fr_auto] gap-0.5 rounded-[4px] px-4 py-3.5 transition-colors"
                style={{ border: `1px solid ${LINE}`, borderLeft: `3px solid ${pkg === i ? 'var(--color-link, #5AAFEA)' : LINE}`, backgroundColor: 'var(--color-page-bg, #04080C)' }}>
                <b className="text-white">{name}</b><span className="text-white text-[18px] font-extrabold">{price}</span>
                {desc && <small className="col-span-2" style={{ color: BODY }}>{desc}</small>}
              </button>
            ))}
            {!packages.length && tt(item.price_from) && <p className="mt-3 text-white text-[24px] font-extrabold">{tt({ en: 'From', es: 'Desde' })} {tt(item.price_from)}</p>}
            {total > 0 && <>
              <div className="mt-4 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: LINE }}><i className="block h-full" style={{ width: `${(taken / total) * 100}%`, backgroundColor: ACCENT }} /></div>
              <small style={{ color: BODY }}><b className="text-white">{total - taken} {tt({ en: 'spots left', es: 'plazas libres' })}</b> {tt({ en: 'of', es: 'de' })} {total}</small>
            </>}
            <Link to="/#contact" state={{ trip: tt(item.title), pkg: packages[pkg]?.[0] }} data-testid="trip-request"
              className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-[4px] px-5 py-3.5 text-[15px] font-bold text-white transition-opacity hover:opacity-90" style={{ backgroundColor: ACCENT }}>
              {soldOut ? tt({ en: 'Join waiting list', es: 'Lista de espera' }) : tt({ en: 'Request my spot', es: 'Reservar mi plaza' })} →
            </Link>
            {Number(item.points) > 0 && <small className="block mt-2.5 text-center" style={{ color: BODY }}>+{item.points} {tt({ en: 'GEM2i points with this trip', es: 'puntos GEM2i con este viaje' })}</small>}
          </aside>
        </div>
      </MembersGate>
    </DetailShell>
  );
}

// ── /works ───────────────────────────────────────────────────────────────────
export function Gem2iWorks() {
  const tt = useT();
  const s = useSection('gem_works');
  const [cat, setCat] = useState('');
  const items = (s?.items || []).filter(i => i.visible !== false);
  const cats = [...new Set(items.map(i => tt(i.category)).filter(Boolean))];
  // WO-A (boceto gem2i-works.html): the "Featured" work (else the first) as a wide case band, the rest in a
  // 3-col 4:3 grid with a category filter; a click opens the full-screen viewer.
  const featured = items.find(i => i.featured) || items[0];
  const shown = items.filter(i => i !== featured && (!cat || tt(i.category) === cat));
  const viewer = useViewer(shown.length);
  const cfg = s?.config || {};
  return (
    <ListShell page="works" testid="gem2i-works-page" eyebrow={tt(cfg.eyebrow) || tt({ en: 'Portfolio', es: 'Portafolio' })}
      title={tt(cfg.title) || tt({ en: 'Our works', es: 'Nuestros trabajos' })} intro={tt(cfg.subtitle)}>
      {!s ? <SkeletonGrid count={6} /> : !items.length ? <EmptyState>{tt({ en: 'New works coming soon.', es: 'Pronto nuevos trabajos.' })}</EmptyState> : <>
        {featured && (
          <div className="grid lg:grid-cols-[1.3fr_1fr] rounded-[4px] overflow-hidden mb-8" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }} data-testid="works-featured">
            {featured.image && <img src={gemImg(featured.image)} alt="" className="w-full h-full min-h-[300px] lg:min-h-[360px] object-cover" />}
            <div className="p-8 md:p-10 flex flex-col justify-center gap-3">
              <small className="text-[12px] font-extrabold tracking-[0.16em] uppercase" style={{ color: 'var(--color-link, #5AAFEA)' }}>{tt({ en: 'Featured case', es: 'Caso destacado' })}</small>
              <h2 className="m-0 text-white font-bold leading-[1.1] pb-1" style={{ fontFamily: SERIF, fontSize: 'clamp(1.9rem, 3.4vw, 2.8rem)' }}>{tt(featured.title)}</h2>
              {(tt(featured.client) || featured.year || tt(featured.category)) && <small className="text-[14px]" style={{ color: BODY }}>{[tt(featured.client), featured.year, tt(featured.category)].filter(Boolean).join(' · ')}</small>}
              {tt(featured.description) && <p className="m-0 leading-[1.8]" style={{ color: BODY }}>{tt(featured.description)}</p>}
              {lines(tt(featured.kpis)).length > 0 && (
                <div className="flex flex-wrap gap-8 my-1.5">{lines(tt(featured.kpis)).map(cols).map(([v, l]) => <span key={l || v}><b className="block text-white text-[30px] leading-none" style={{ fontFamily: SERIF }}>{v}</b><small className="text-[12.5px]" style={{ color: BODY }}>{l}</small></span>)}</div>
              )}
            </div>
          </div>
        )}
        {cats.length > 1 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {['', ...cats].map(c => (
              <button key={c || 'all'} type="button" onClick={() => setCat(c)} className="rounded-[4px] px-4 py-2 text-[13px] font-bold"
                style={c === cat ? { backgroundColor: 'var(--color-seg-on, #fff)', color: 'var(--color-seg-on-text, #04080C)' } : { border: `1px solid ${LINE}`, color: BODY }}>{c || tt({ en: 'All', es: 'Todos' })}</button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="works-grid">
          {shown.map((w, i) => (
            <div key={w.id} onClickCapture={e => { e.preventDefault(); viewer.open(i); }}>
              <HoverCard to="/works" testid="work-card" aspect="aspect-[4/3]" img={gemImg(w.image)} title={tt(w.title)} strip={tt(w.title)}
                cta={tt({ en: 'View project', es: 'Ver proyecto' })} meta={[[tt(w.category), w.year].filter(Boolean).join(' · ')]} />
            </div>
          ))}
        </div>
        <Viewer items={shown} index={viewer.i} onClose={viewer.close} onMove={viewer.move} render={w => (
          <>
            <img src={gemImg(w.image)} alt="" className="max-w-[86vw] max-h-[70vh] rounded-2xl object-contain" />
            <b className="text-[22px]" style={{ fontFamily: SERIF }}>{tt(w.title)}</b>
            {tt(w.description) && <p className="max-w-2xl text-center text-white/75 m-0">{tt(w.description)}</p>}
          </>
        )} />
      </>}
    </ListShell>
  );
}

// ── /gallery ─────────────────────────────────────────────────────────────────

export function Gem2iGallery() {
  const tt = useT();
  const [items, setItems] = useState(null);
  const [cat, setCat] = useState('');
  useEffect(() => { publicAPI.getGallery('').then(r => setItems(Array.isArray(r.data) ? r.data : [])).catch(() => setItems([])); }, []);
  const cats = [...new Set((items || []).map(i => i.category).filter(Boolean))];
  const [page, setPage] = useState(1);
  const PER = 12;
  const all = (items || []).filter(i => !cat || i.category === cat);
  const pages = Math.max(1, Math.ceil(all.length / PER));
  const shown = all.slice((page - 1) * PER, page * PER);
  const viewer = useViewer(shown.length);
  // GA-B (boceto gem2i-gallery.html): regular square grid, 4 columns, 12 per page; a click opens the viewer.
  return (
    <ListShell page="gallery" testid="gem2i-gallery-page" eyebrow={tt({ en: 'Gallery', es: 'Galería' })} title={tt({ en: 'Inside the night', es: 'Dentro de la noche' })}>
      {!items ? <SkeletonGrid count={6} /> : !shown.length ? <EmptyState>{tt({ en: 'No photos yet.', es: 'Aún no hay fotos.' })}</EmptyState> : <>
        {cats.length > 1 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {['', ...cats].map(c => (
              <button key={c || 'all'} type="button" onClick={() => { setCat(c); setPage(1); }} className="rounded-[4px] px-4 py-2 text-[13px] font-bold capitalize"
                style={c === cat ? { backgroundColor: 'var(--color-seg-on, #fff)', color: 'var(--color-seg-on-text, #04080C)' } : { border: `1px solid ${LINE}`, color: BODY }}>{c || tt({ en: 'All', es: 'Todas' })}</button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3" data-testid="gallery-grid">
          {shown.map((g, i) => (
            <div key={g.id || i} onClickCapture={e => { e.preventDefault(); viewer.open(i); }}>
              <HoverCard to="/gallery" testid="gallery-card" aspect="aspect-square" img={gemImg(g.image)} title={tt(g.title)} strip={tt(g.title)} cta={tt({ en: 'View photo', es: 'Ver foto' })}
                meta={[tt(g.summary) && <Where>{tt(g.summary)}</Where>]} />
            </div>
          ))}
        </div>
        {pages > 1 && <Paginator page={page} pages={pages} onPage={p => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />}
        <Viewer items={shown} index={viewer.i} onClose={viewer.close} onMove={viewer.move} render={g => (
          <><img src={gemImg(g.image)} alt={tt(g.title)} className="max-w-[86vw] max-h-[76vh] rounded-[4px] object-contain" /><b>{[tt(g.title), tt(g.summary)].filter(Boolean).join(' · ')}</b></>
        )} />
      </>}
    </ListShell>
  );
}

// ── /media ───────────────────────────────────────────────────────────────────
const ytId = (u) => (String(u || '').match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/) || [])[1];
const vimeoId = (u) => (String(u || '').match(/vimeo\.com\/(?:video\/)?(\d+)/) || [])[1];
const embedOf = (u) => (ytId(u) ? `https://www.youtube.com/embed/${ytId(u)}?autoplay=1` : vimeoId(u) ? `https://player.vimeo.com/video/${vimeoId(u)}?autoplay=1` : '');
const thumbOf = (m) => (m.thumbnail ? gemImg(m.thumbnail) : ytId(m.video_url) ? `https://img.youtube.com/vi/${ytId(m.video_url)}/hqdefault.jpg` : '');

function VideoTile({ m, onPlay, big }) {
  const tt = useT();
  return (
    <button type="button" onClick={onPlay} className={`group relative block w-full overflow-hidden rounded-[4px] bg-black text-left text-white aspect-video`} data-testid="media-video">
      {thumbOf(m) && <img src={thumbOf(m)} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-75 transition-[transform,opacity] duration-700 ease-out group-hover:scale-105 group-hover:opacity-55" />}
      <span className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${big ? 'w-[72px] h-[72px]' : 'w-14 h-14'}`} style={{ color: '#0E1216' }}><Play className="w-6 h-6 ml-0.5" aria-hidden="true" /></span>
      <span className="absolute left-4 right-4 bottom-3.5">
        <b className={`block font-bold leading-tight ${big ? 'text-[24px]' : 'text-[18px]'}`} style={{ fontFamily: SERIF }}>{tt(m.title)}</b>
        <small className="opacity-80">{[m.duration, tt(m.type)].filter(Boolean).join(' · ')}</small>
      </span>
    </button>
  );
}

export function Gem2iMedia() {
  const tt = useT();
  const s = useSection('gem_media');
  const press = useSection('gem_press');
  const [open, setOpen] = useState(''); // the type whose "See all" is open
  const videos = (s?.items || []).filter(i => i.visible !== false && embedOf(i.video_url));
  const other = tt({ en: 'More videos', es: 'Más vídeos' });
  const typeOf = (v) => tt(v.type) || other;
  const types = [...new Set(videos.map(typeOf))];
  const [playing, setPlaying] = useState(null);
  const cfg = s?.config || {};
  const clips = (press?.items || []).filter(i => i.visible !== false && tt(i.title));
  // ME-C (boceto gem2i-media.html): one row per video type (Aftermovies, DJ sets, Interviews...) with 4 videos and
  // "See all" (opens the whole type); press list at the end; a click plays the video in the viewer.
  return (
    <ListShell page="media" testid="gem2i-media-page" eyebrow={tt(cfg.eyebrow) || tt({ en: 'Media', es: 'Media' })}
      title={tt(cfg.title) || tt({ en: 'Watch & read', es: 'Mira y lee' })} intro={tt(cfg.subtitle)}>
      {!s ? <SkeletonGrid count={3} aspect="aspect-video" /> : !videos.length && !clips.length
        ? <EmptyState>{tt({ en: 'Videos and press coming soon.', es: 'Pronto vídeos y prensa.' })}</EmptyState> : <>
          {types.map(t => {
            const list = videos.filter(v => typeOf(v) === t);
            const all = open === t;
            return (
              <section key={t} className="mb-12" data-testid="media-row">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <h2 className="text-white font-bold leading-[1.1] pb-1" style={{ fontFamily: SERIF, fontSize: 'clamp(1.4rem, 2.4vw, 1.8rem)' }}>{t}</h2>
                  {list.length > 4 && (
                    <button type="button" onClick={() => setOpen(all ? '' : t)} className="font-bold underline underline-offset-4 decoration-1 hover:decoration-2" style={{ color: 'var(--color-link, #5AAFEA)' }}>
                      {all ? tt({ en: 'Show less', es: 'Ver menos' }) : `${tt({ en: 'See all', es: 'Ver todos' })} (${list.length})`}
                    </button>
                  )}
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5">{(all ? list : list.slice(0, 4)).map(m => <VideoTile key={m.id} m={m} onPlay={() => setPlaying(m)} />)}</div>
              </section>
            );
          })}
          {clips.length > 0 && (
            <Section title={tt(press?.config?.title) || tt({ en: 'In the press', es: 'En la prensa' })} testid="media-press">
              <div className="border-t" style={{ borderColor: LINE }}>
                {clips.map(p => (
                  <a key={p.id} href={p.url || undefined} target="_blank" rel="noreferrer" className="grid grid-cols-[110px_1fr_auto] md:grid-cols-[170px_1fr_auto] gap-5 items-center px-1.5 py-4 border-b transition-colors hover:bg-[rgba(90,175,234,.08)]" style={{ borderColor: LINE }}>
                    <small className="font-extrabold tracking-[0.12em] uppercase" style={{ color: BODY }}>{tt(p.outlet)}</small>
                    <span><b className="block text-white text-[19px]" style={{ fontFamily: SERIF }}>{tt(p.title)}</b><small style={{ color: BODY }}>{[tt(p.kind), tt(p.date)].filter(Boolean).join(' · ')}</small></span>
                    {p.url && <span className="text-white">↗</span>}
                  </a>
                ))}
              </div>
            </Section>
          )}
        </>}
      {playing && (
        <Viewer items={[playing]} index={0} onClose={() => setPlaying(null)} onMove={() => {}} render={m => (
          <div className="w-[min(1100px,92vw)] aspect-video rounded-[4px] overflow-hidden bg-black"><iframe src={embedOf(m.video_url)} title={tt(m.title)} className="w-full h-full border-0" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /></div>
        )} />
      )}
    </ListShell>
  );
}

// ── /map/:slug (office) ──────────────────────────────────────────────────────
const COUNTRY_ALIAS = { usa: 'United States', 'united states': 'United States', uk: 'United Kingdom' };

/** /map/:slug — OF-C (2026-10-26, boceto gem2i-office.html): the five offices as a sticky index on the left
 *  (current one marked), the office on the right: name, region, live local time, people of the region, map,
 *  contact, nights near the office. No CMS hero (office pages are not in Hero → Page Assignment). */
export function Gem2iOffice() {
  const { slug } = useParams();
  const tt = useT();
  const [offices, setOffices] = useState(null);
  const [team, setTeam] = useState([]);
  const [events, setEvents] = useState([]);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    publicAPI.getMapLocations('global_business').then(r => setOffices(Array.isArray(r.data) ? r.data : [])).catch(() => setOffices([]));
    publicAPI.getSectionContent('aurex_team').then(r => setTeam(r.data?.items || [])).catch(() => {});
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  const office = useMemo(() => (offices || []).find(o => officeSlug(o) === slug || o.id === slug), [offices, slug]);
  const name = office ? (office.name || tt(office.title)) : '';
  const country = name.split(',').pop().trim();
  const countryName = COUNTRY_ALIAS[country.toLowerCase()] || country;
  useEffect(() => {
    if (!countryName) return;
    gemAPI.events({ country: countryName, limit: 4 }).then(r => setEvents(r.data?.items || [])).catch(() => {});
  }, [countryName]);

  if (offices && !office) return <NotFoundShell backTo="/about" backLabel={tt({ en: 'About us', es: 'Nosotros' })}>{tt({ en: 'Office not found.', es: 'Oficina no encontrada.' })}</NotFoundShell>;
  if (!office) return <DetailShell><div className="py-24"><SkeletonGrid count={2} /></div></DetailShell>;

  const zone = zoneOf(name);
  const people = team.filter(m => new RegExp(`\\b${country.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(tt(m.role) || ''));
  const lat = Number(office.lat); const lng = Number(office.lng);
  const map = Number.isFinite(lat) && Number.isFinite(lng) && (lat || lng)
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.03}%2C${lat - 0.02}%2C${lng + 0.03}%2C${lat + 0.02}&layer=mapnik&marker=${lat}%2C${lng}`
    : `https://maps.google.com/maps?q=${encodeURIComponent(name)}&z=11&output=embed`;
  const desc = String(office.description || '').trim();
  const region = desc.split(' · ')[0];

  return (
    <DetailShell testid="gem2i-office-page">
      <Crumb items={[[tt({ en: 'About us', es: 'Nosotros' }), '/about'], [name]]} />
      <div className="pb-16 grid gap-8 lg:grid-cols-[300px_1fr] items-start">
        <nav className="lg:sticky lg:top-24 rounded-[4px] overflow-hidden" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }} aria-label={tt({ en: 'Offices', es: 'Oficinas' })} data-testid="office-index">
          {offices.map(o => {
            const on = o === office;
            const r = String(o.description || '').trim().split(' · ')[0];
            return (
              <Link key={o.id} to={`/map/${officeSlug(o)}`} aria-current={on ? 'page' : undefined}
                className="block px-5 py-4 border-b transition-colors hover:bg-[#0F1C29]"
                style={{ borderColor: LINE, borderLeft: `3px solid ${on ? 'var(--color-link, #5AAFEA)' : 'transparent'}`, backgroundColor: on ? '#0F1C29' : undefined }}>
                {r && <small className="block text-[11px] font-extrabold tracking-[0.12em] uppercase" style={{ color: /headquarter|sede/i.test(r) ? 'var(--color-link, #5AAFEA)' : BODY }}>{r}</small>}
                <b className="text-white text-[15.5px]">{o.name || tt(o.title)}</b>
              </Link>
            );
          })}
        </nav>
        <div>
          {region && <small className="text-[12px] font-extrabold tracking-[0.14em] uppercase" style={{ color: BODY }}>{region}</small>}
          <h1 className="mt-1 text-white font-bold leading-[1.04] pb-1" style={{ fontFamily: SERIF, fontSize: 'clamp(2.4rem, 4.6vw, 3.8rem)' }}><AccentTitle text={name} /></h1>
          <div className="mt-6 grid sm:grid-cols-2 gap-5 items-start">
            {zone && (
              <div>
                <small className="text-[11px] font-extrabold tracking-[0.16em]" style={{ color: 'var(--color-link, #5AAFEA)' }}><Clock className="inline w-3.5 h-3.5 mr-1 -mt-0.5" aria-hidden="true" />{tt({ en: 'LOCAL TIME', es: 'HORA LOCAL' })}</small>
                <b className="block text-white text-[54px] leading-none tabular-nums" style={{ fontFamily: SERIF }}>{localTime(zone, now)}</b>
                <small style={{ color: BODY }}>{zone}</small>
              </div>
            )}
            {people.length > 0 && (
              <div className="grid gap-2.5">
                {people.map(m => (
                  <div key={m.id} className="flex items-center gap-3 rounded-[4px] p-3" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
                    {m.photo_url ? <img src={gemImg(m.photo_url)} alt="" className="w-14 h-14 rounded-full object-cover grayscale" /> : <span className="w-14 h-14 rounded-full" style={{ backgroundColor: LINE }} />}
                    <span><b className="block text-white">{tt(m.name)}</b><small style={{ color: BODY }}>{tt(m.role)}</small></span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/#contact" className="inline-flex items-center gap-2 rounded-[4px] px-5 py-3 text-[15px] font-bold text-white transition-opacity hover:opacity-90" style={{ backgroundColor: ACCENT }}>{tt({ en: 'Contact this office', es: 'Contactar esta oficina' })} →</Link>
            {office.link && <a href={office.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-[4px] px-5 py-3 text-[15px] font-semibold text-white border border-white/30 hover:bg-white/10">{tt({ en: 'Open in Maps', es: 'Abrir en Maps' })} ↗</a>}
          </div>
          <div className="mt-8 rounded-[4px] overflow-hidden aspect-[21/9]" style={{ backgroundColor: '#0A121A' }}>
            <iframe src={map} title={name} className="w-full h-full border-0 grayscale invert-[.9] contrast-[.9]" loading="lazy" />
          </div>
          {events.length > 0 && (
            <Section title={tt({ en: 'Nights near this office', es: 'Noches cerca de esta oficina' })}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{events.map(e => <EventPosterCard key={e.id} e={e} />)}</div>
            </Section>
          )}
        </div>
      </div>
    </DetailShell>
  );
}

// ── /terms, /privacy ─────────────────────────────────────────────────────────
/** LE-C (2026-10-26, boceto gem2i-legal.html): one "Legal" page with a Terms / Privacy switch; the text is split
 *  at its h2 headings into accordion sections (first one open). Both routes are in Hero → Page Assignment. */
export function Gem2iLegal({ type }) {
  const tt = useT();
  const fmt = useFmtDate();
  const [page, setPage] = useState(null);
  const [open, setOpen] = useState(0);
  useEffect(() => { setPage(null); setOpen(0); publicAPI.getPage(type).then(r => setPage(r.data || {})).catch(() => setPage({})); }, [type]);

  const { intro, sections } = useMemo(() => {
    const doc = new DOMParser().parseFromString(normalizeRichText(tt(page?.content) || ''), 'text/html');
    const out = []; let cur = null; const pre = [];
    [...doc.body.childNodes].forEach(n => {
      if (n.nodeName === 'H2') { cur = { title: n.textContent.trim(), html: '' }; out.push(cur); return; }
      const h = n.outerHTML || n.textContent || '';
      if (cur) cur.html += h; else pre.push(h);
    });
    if (out[0] && out[0].title === (tt(page?.title) || '').trim() && !out[0].html.trim()) out.shift();
    return { intro: pre.join(''), sections: out };
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const prose = 'max-w-[72ch] text-[16.5px] leading-[1.85] [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_a]:underline';
  const updated = page?.updated_at || page?.created_at;
  return (
    <ListShell page={type} testid={`gem2i-legal-${type}`} eyebrow={tt({ en: 'Legal', es: 'Legal' })}
      title={type === 'privacy' ? tt({ en: 'Privacy Policy', es: 'Política de privacidad' }) : tt({ en: 'Terms of Service', es: 'Términos del servicio' })}
      head={(
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-1.5" role="group" aria-label={tt({ en: 'Legal pages', es: 'Páginas legales' })}>
            {[['terms', tt({ en: 'Terms of Service', es: 'Términos del servicio' })], ['privacy', tt({ en: 'Privacy Policy', es: 'Política de privacidad' })]].map(([k, l]) => (
              <Link key={k} to={`/${k}`} aria-current={k === type ? 'page' : undefined} className="rounded-[4px] px-4 py-2 text-[13.5px] font-bold"
                style={k === type ? { backgroundColor: '#F2F5F8', color: '#04080C' } : { border: `1px solid ${LINE}`, color: BODY }}>{l}</Link>
            ))}
          </div>
          {updated && <small className="text-[14px]" style={{ color: BODY }}>{tt({ en: 'Last updated', es: 'Actualizado' })}: {fmt(updated, { month: 'long', day: 'numeric', year: 'numeric' })}</small>}
        </div>
      )}>
      {!page ? <SkeletonGrid count={1} /> : (
        <div data-testid="legal-accordion">
          {intro.trim() && <div className={`${prose} mb-8`} style={{ color: BODY }} dangerouslySetInnerHTML={{ __html: intro }} />}
          {sections.length > 0 ? (
            <div className="border-t" style={{ borderColor: LINE }}>
              {sections.map((sec, i) => {
                const on = open === i;
                return (
                  <div key={i} className="border-b" style={{ borderColor: LINE }}>
                    <button type="button" onClick={() => setOpen(on ? -1 : i)} aria-expanded={on}
                      className="w-full flex items-center justify-between gap-4 py-5 px-1 text-left">
                      <b className="text-white text-[18px]">{sec.title}</b>
                      <span aria-hidden="true" className="text-[22px] leading-none" style={{ color: 'var(--color-link, #5AAFEA)' }}>{on ? '−' : '+'}</span>
                    </button>
                    {on && <div className={`${prose} pb-6 px-1`} style={{ color: BODY }} dangerouslySetInnerHTML={{ __html: sec.html }} />}
                  </div>
                );
              })}
            </div>
          ) : !intro.trim() && <EmptyState>{tt({ en: 'This text is being written.', es: 'Este texto se está redactando.' })}</EmptyState>}
        </div>
      )}
    </ListShell>
  );
}
