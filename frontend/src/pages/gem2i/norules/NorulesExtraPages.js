/* Norules (`gem2i`) — pages that had no Norules design yet (boceto bocetos/norules-missing-pages.html):
 *   /conferences       listing (card + list view, legacy search, continent tabs)
 *   /travels/:slug     trip page T2 (packages, itinerary, includes, countdown)
 *   /works             portfolio (featured case + masonry + viewer)
 *   /gallery           photo mosaic with category tabs + viewer
 *   /media             videos (featured + grid + player) and press list
 *   /map/:slug         office page (map, local time, team of the region, events nearby)
 *   /terms, /privacy   legal text with a sticky table of contents
 * Template = package (D-GEM-2026-15): only the Norules routes use these. */
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, X, ChevronLeft, ChevronRight, MapPin, CalendarDays, Clock } from 'lucide-react';
import { gemAPI, publicAPI } from '../../../lib/api';
import { useT } from '../../../lib/i18n';
import { normalizeRichText } from '../../../lib/richText';
import { gemImg, Paginator, SkeletonGrid, EmptyState } from '../../../components/gem2i/GemCatalogBits';
import {
  LogoDisc, HoverCard, SearchBar, Segmented, ContinentTabs, continentParams, When, Where, useFmtDate, place, ACCENT, BODY, LINE, CARD,
} from '../../../components/gem2i/norules/GemCatalogCards';
import AccentTitle from '../../../components/gem2i/AccentTitle';
import {
  ListShell, DetailShell, Crumb, Section, PhotoHero, HeroChip, Countdown, EventPosterCard, MapEmbed, slugify, officeSlug, SERIF,
} from '../../../components/gem2i/norules/NorulesDetailBits';
import { useSection, MembersGate, tripSlug } from './NorulesInnerPages';
import { zoneOf, localTime } from './NorulesAbout';
import { NotFoundShell } from './NorulesArtistDetail';
import { NBtn, NBtnLook } from '../../../components/gem2i/norules/NBtn';

const plain = (html) => (html ? (new DOMParser().parseFromString(html, 'text/html').body.textContent || '').trim() : '');
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

export function NorulesConferences() {
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {data.items.map(c => (
            <HoverCard key={c.id} to={`/conferences/${c.slug}`} testid="conference-card" aspect="aspect-[3/4]"
              img={gemImg(c.image_urls?.view) || gemImg(c.image_urls?.flyer)} logo={gemImg(c.image_urls?.logo)} title={c.title} strip={c.title} cta={cta(c)}
              meta={[dates(c) && <When>{dates(c)}</When>, where(c) && <Where>{where(c)}</Where>]}
              extra={nSessions(c) > 0 && <span className="mt-2 self-start text-[12px] px-2.5 py-0.5 rounded-full bg-white/[0.14] text-white">{nSessions(c)} {tt({ en: 'sessions', es: 'sesiones' })}</span>} />
          ))}
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
export function NorulesTravelDetail() {
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
              {statusLabel && <span className="inline-block mb-2 rounded-full px-3 py-1.5 text-[11px] font-extrabold tracking-[0.14em] uppercase" style={{ backgroundColor: item.status === 'last' ? '#FFD34D' : '#fff', color: '#0E1216' }}>{statusLabel}</span>}
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
                  {includes.map(x => <li key={x} className="rounded-2xl px-4 py-3 text-white font-semibold" style={{ border: `1px solid ${LINE}` }}>{x}</li>)}
                </ul>
              </Section>
            )}
            {itinerary.length > 0 && (
              <Section title={tt({ en: 'Itinerary', es: 'Itinerario' })}>
                <ol className="list-none m-0 ml-2.5 p-0 border-l-2" style={{ borderColor: LINE }}>
                  {itinerary.map(([day, text], i) => (
                    <li key={i} className="relative pl-6 pb-5">
                      <span aria-hidden="true" className="absolute -left-[8px] top-1 w-3.5 h-3.5 rounded-full border-2" style={{ backgroundColor: 'var(--color-page-bg, #04080C)', borderColor: 'var(--gem-ink, #fff)' }} />
                      <b className="block text-white">{day}</b>{text && <span style={{ color: BODY }}>{text}</span>}
                    </li>
                  ))}
                </ol>
              </Section>
            )}
            {gallery.length > 0 && (
              <Section title={tt({ en: 'Gallery', es: 'Galería' })}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">{gallery.map(g => <img key={g} src={gemImg(g)} alt="" loading="lazy" className="w-full aspect-[4/3] object-cover rounded-2xl" />)}</div>
              </Section>
            )}
            {item.map_url && <Section title={tt({ en: 'Where', es: 'Dónde' })}><MapEmbed src={item.map_url} title={tt(item.title)} /></Section>}
          </div>

          <aside className="lg:sticky lg:top-24 rounded-3xl p-6" style={{ border: `1px solid ${LINE}`, backgroundColor: CARD }} data-testid="trip-packages">
            <b className="block text-white text-[22px]" style={{ fontFamily: SERIF }}>{packages.length ? tt({ en: 'Choose your package', es: 'Elige tu paquete' }) : tt({ en: 'Join this trip', es: 'Únete a este viaje' })}</b>
            <small style={{ color: BODY }}>{tt({ en: 'Members only · prices per person', es: 'Solo miembros · precio por persona' })}</small>
            {packages.map(([name, price, desc], i) => (
              <button key={name} type="button" onClick={() => setPkg(i)} aria-pressed={pkg === i}
                className="mt-2.5 w-full text-left grid grid-cols-[1fr_auto] gap-0.5 rounded-2xl px-4 py-3.5 transition-colors"
                style={{ border: `1.5px solid ${pkg === i ? 'var(--gem-ink, #fff)' : LINE}` }}>
                <b className="text-white">{name}</b><span className="text-white text-[18px] font-extrabold">{price}</span>
                {desc && <small className="col-span-2" style={{ color: BODY }}>{desc}</small>}
              </button>
            ))}
            {!packages.length && tt(item.price_from) && <p className="mt-3 text-white text-[24px] font-extrabold">{tt({ en: 'From', es: 'Desde' })} {tt(item.price_from)}</p>}
            {total > 0 && <>
              <div className="mt-4 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: LINE }}><i className="block h-full" style={{ width: `${(taken / total) * 100}%`, backgroundColor: ACCENT }} /></div>
              <small style={{ color: BODY }}><b className="text-white">{total - taken} {tt({ en: 'spots left', es: 'plazas libres' })}</b> {tt({ en: 'of', es: 'de' })} {total}</small>
            </>}
            <NBtn to="/#contact" state={{ trip: tt(item.title), pkg: packages[pkg]?.[0] }} className="mt-4 w-full justify-between" data-testid="trip-request">
              {soldOut ? tt({ en: 'Join waiting list', es: 'Lista de espera' }) : tt({ en: 'Request my spot', es: 'Reservar mi plaza' })}
            </NBtn>
            {Number(item.points) > 0 && <small className="block mt-2.5 text-center" style={{ color: BODY }}>+{item.points} {tt({ en: 'GEM2i points with this trip', es: 'puntos GEM2i con este viaje' })}</small>}
          </aside>
        </div>
      </MembersGate>
    </DetailShell>
  );
}

// ── /works ───────────────────────────────────────────────────────────────────
export function NorulesWorks() {
  const tt = useT();
  const s = useSection('gem_works');
  const [cat, setCat] = useState('');
  const items = (s?.items || []).filter(i => i.visible !== false);
  const cats = [...new Set(items.map(i => tt(i.category)).filter(Boolean))];
  const featured = items.find(i => i.featured);
  const shown = items.filter(i => i !== featured && (!cat || tt(i.category) === cat));
  const viewer = useViewer(shown.length);
  const cfg = s?.config || {};
  const ratios = ['aspect-[4/5]', 'aspect-square', 'aspect-[4/3]', 'aspect-[3/4]'];
  return (
    <ListShell page="works" testid="gem2i-works-page" eyebrow={tt(cfg.eyebrow) || tt({ en: 'Portfolio', es: 'Portafolio' })}
      title={tt(cfg.title) || tt({ en: 'Our works', es: 'Nuestros trabajos' })} intro={tt(cfg.subtitle)}>
      {!s ? <SkeletonGrid count={6} /> : !items.length ? <EmptyState>{tt({ en: 'New works coming soon.', es: 'Pronto nuevos trabajos.' })}</EmptyState> : <>
        {featured && (
          <div className="gem-tone-dark grid lg:grid-cols-2 rounded-[28px] overflow-hidden mb-10 text-white" style={{ backgroundColor: '#0E1216' }} data-testid="works-featured">
            {featured.image && <img src={gemImg(featured.image)} alt="" className="w-full h-full min-h-[320px] object-cover" />}
            <div className="p-8 md:p-11 flex flex-col justify-center gap-3">
              <span className="self-start rounded-full px-3 py-1.5 text-[11px] font-extrabold tracking-[0.14em]" style={{ backgroundColor: '#7CC4FF', color: '#0E1216' }}>{tt({ en: 'FEATURED CASE', es: 'CASO DESTACADO' })}</span>
              <h2 className="m-0 text-[clamp(1.8rem,3vw,2.4rem)] font-bold leading-tight" style={{ fontFamily: SERIF }}>{tt(featured.title)}</h2>
              {(tt(featured.client) || featured.year) && <small className="text-[#AAB3BD]">{[tt(featured.client), featured.year].filter(Boolean).join(' · ')}</small>}
              {tt(featured.description) && <p className="m-0 text-[#AAB3BD] leading-[1.8]">{tt(featured.description)}</p>}
              {lines(tt(featured.kpis)).length > 0 && (
                <div className="flex flex-wrap gap-7 my-1.5">{lines(tt(featured.kpis)).map(cols).map(([v, l]) => <span key={l || v}><b className="block text-[30px] font-extrabold">{v}</b><small className="text-[11px] tracking-[0.16em] uppercase text-[#8A949E]">{l}</small></span>)}</div>
              )}
            </div>
          </div>
        )}
        {cats.length > 1 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {['', ...cats].map(c => (
              <button key={c || 'all'} type="button" onClick={() => setCat(c)} className="rounded-full px-4 py-2 text-[13px] font-bold"
                style={c === cat ? { backgroundColor: 'var(--color-seg-on, #fff)', color: 'var(--color-seg-on-text, #04080C)' } : { border: `1px solid ${LINE}`, color: BODY }}>{c || tt({ en: 'All', es: 'Todos' })}</button>
            ))}
          </div>
        )}
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-3.5">
          {shown.map((w, i) => (
            <div key={w.id} className="mb-3.5 break-inside-avoid" onClickCapture={e => { e.preventDefault(); viewer.open(i); }}>
              <HoverCard to="/works" testid="work-card" aspect={ratios[i % ratios.length]} img={gemImg(w.image)} title={tt(w.title)} strip={tt(w.title)}
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
const MOSAIC = ['sm:col-span-3 sm:row-span-2', 'sm:col-span-3', 'sm:col-span-3', 'sm:col-span-2 sm:row-span-2', 'sm:col-span-4', 'sm:col-span-4',
  'sm:col-span-2', 'sm:col-span-2', 'sm:col-span-2', 'sm:col-span-6'];

export function NorulesGallery() {
  const tt = useT();
  const [items, setItems] = useState(null);
  const [cat, setCat] = useState('');
  useEffect(() => { publicAPI.getGallery('').then(r => setItems(Array.isArray(r.data) ? r.data : [])).catch(() => setItems([])); }, []);
  const cats = [...new Set((items || []).map(i => i.category).filter(Boolean))];
  const shown = (items || []).filter(i => !cat || i.category === cat);
  const viewer = useViewer(shown.length);
  return (
    <ListShell page="gallery" testid="gem2i-gallery-page" eyebrow={tt({ en: 'Gallery', es: 'Galería' })} title={tt({ en: 'Inside the night', es: 'Dentro de la noche' })}>
      {!items ? <SkeletonGrid count={6} /> : !shown.length ? <EmptyState>{tt({ en: 'No photos yet.', es: 'Aún no hay fotos.' })}</EmptyState> : <>
        {cats.length > 1 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {['', ...cats].map(c => (
              <button key={c || 'all'} type="button" onClick={() => setCat(c)} className="rounded-full px-4 py-2 text-[13px] font-bold capitalize"
                style={c === cat ? { backgroundColor: 'var(--color-seg-on, #fff)', color: 'var(--color-seg-on-text, #04080C)' } : { border: `1px solid ${LINE}`, color: BODY }}>{c || tt({ en: 'All', es: 'Todas' })}</button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-6 auto-rows-[150px] sm:auto-rows-[170px] gap-2.5">
          {shown.map((g, i) => (
            <div key={g.id || i} className={`${MOSAIC[i % MOSAIC.length]} [&>a]:h-full`} onClickCapture={e => { e.preventDefault(); viewer.open(i); }}>
              <HoverCard to="/gallery" testid="gallery-card" aspect="h-full" img={gemImg(g.image)} title={tt(g.title)} cta={tt({ en: 'View photo', es: 'Ver foto' })}
                meta={[tt(g.summary) && <Where>{tt(g.summary)}</Where>]} />
            </div>
          ))}
        </div>
        <Viewer items={shown} index={viewer.i} onClose={viewer.close} onMove={viewer.move} render={g => (
          <><img src={gemImg(g.image)} alt={tt(g.title)} className="max-w-[86vw] max-h-[76vh] rounded-2xl object-contain" /><b>{[tt(g.title), tt(g.summary)].filter(Boolean).join(' · ')}</b></>
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
    <button type="button" onClick={onPlay} className={`group relative block w-full overflow-hidden rounded-[22px] bg-black text-left text-white ${big ? 'aspect-video' : 'aspect-video'}`} data-testid="media-video">
      {thumbOf(m) && <img src={thumbOf(m)} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-75 transition-[transform,opacity] duration-700 ease-out group-hover:scale-105 group-hover:opacity-55" />}
      <span className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${big ? 'w-[72px] h-[72px]' : 'w-14 h-14'}`} style={{ color: '#0E1216' }}><Play className="w-6 h-6 ml-0.5" aria-hidden="true" /></span>
      <span className="absolute left-4 right-4 bottom-3.5">
        <b className={`block font-bold leading-tight ${big ? 'text-[24px]' : 'text-[18px]'}`} style={{ fontFamily: SERIF }}>{tt(m.title)}</b>
        <small className="opacity-80">{[m.duration, tt(m.type)].filter(Boolean).join(' · ')}</small>
      </span>
    </button>
  );
}

export function NorulesMedia() {
  const tt = useT();
  const s = useSection('gem_media');
  const press = useSection('gem_press');
  const [type, setType] = useState('');
  const videos = (s?.items || []).filter(i => i.visible !== false && embedOf(i.video_url));
  const types = [...new Set(videos.map(v => tt(v.type)).filter(Boolean))];
  const [first, ...rest] = videos;
  const grid = rest.slice(2).filter(v => !type || tt(v.type) === type);
  const [playing, setPlaying] = useState(null);
  const cfg = s?.config || {};
  const clips = (press?.items || []).filter(i => i.visible !== false && tt(i.title));
  return (
    <ListShell page="media" testid="gem2i-media-page" eyebrow={tt(cfg.eyebrow) || tt({ en: 'Media', es: 'Media' })}
      title={tt(cfg.title) || tt({ en: 'Watch & read', es: 'Mira y lee' })} intro={tt(cfg.subtitle)}>
      {!s ? <SkeletonGrid count={3} aspect="aspect-video" /> : !videos.length && !clips.length
        ? <EmptyState>{tt({ en: 'Videos and press coming soon.', es: 'Pronto vídeos y prensa.' })}</EmptyState> : <>
          {first && (
            <div className={`grid gap-4 mb-6 ${rest.length ? 'lg:grid-cols-[1.6fr_1fr]' : ''}`}>
              <VideoTile m={first} big onPlay={() => setPlaying(first)} />
              {rest.length > 0 && <div className="grid gap-4">{rest.slice(0, 2).map(m => <VideoTile key={m.id} m={m} onPlay={() => setPlaying(m)} />)}</div>}
            </div>
          )}
          {types.length > 1 && grid.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-2">
              {['', ...types].map(c => (
                <button key={c || 'all'} type="button" onClick={() => setType(c)} className="rounded-full px-4 py-2 text-[13px] font-bold"
                  style={c === type ? { backgroundColor: 'var(--color-seg-on, #fff)', color: 'var(--color-seg-on-text, #04080C)' } : { border: `1px solid ${LINE}`, color: BODY }}>{c || tt({ en: 'All', es: 'Todos' })}</button>
              ))}
            </div>
          )}
          {grid.length > 0 && <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">{grid.map(m => <VideoTile key={m.id} m={m} onPlay={() => setPlaying(m)} />)}</div>}
          {clips.length > 0 && (
            <Section title={tt(press?.config?.title) || tt({ en: 'In the press', es: 'En la prensa' })} testid="media-press">
              <div className="border-t" style={{ borderColor: LINE }}>
                {clips.map(p => (
                  <a key={p.id} href={p.url || undefined} target="_blank" rel="noreferrer" className="grid grid-cols-[110px_1fr_auto] gap-5 items-center px-1.5 py-4 border-b transition-colors hover:bg-[rgba(90,175,234,.08)]" style={{ borderColor: LINE }}>
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
          <div className="w-[min(1100px,92vw)] aspect-video rounded-2xl overflow-hidden bg-black"><iframe src={embedOf(m.video_url)} title={tt(m.title)} className="w-full h-full border-0" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /></div>
        )} />
      )}
    </ListShell>
  );
}

// ── /map/:slug (office) ──────────────────────────────────────────────────────
const COUNTRY_ALIAS = { usa: 'United States', 'united states': 'United States', uk: 'United Kingdom' };

export function NorulesOffice() {
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
  const map = Number.isFinite(lat) && Number.isFinite(lng)
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.03}%2C${lat - 0.02}%2C${lng + 0.03}%2C${lat + 0.02}&layer=mapnik&marker=${lat}%2C${lng}` : '';
  const desc = String(office.description || '').trim();

  return (
    <DetailShell testid="gem2i-office-page">
      <Crumb items={[[tt({ en: 'About us', es: 'Nosotros' }), '/about'], [name]]} />
      <div className="mb-4 flex flex-wrap gap-2">
        {offices.map(o => {
          const on = o === office;
          return <Link key={o.id} to={`/map/${officeSlug(o)}`} className="rounded-full px-4 py-2 text-[13px] font-bold"
            style={on ? { backgroundColor: 'var(--color-seg-on, #fff)', color: 'var(--color-seg-on-text, #04080C)' } : { border: `1px solid ${LINE}`, color: BODY }}>{o.name || tt(o.title)}</Link>;
        })}
      </div>
      <div className="grid lg:grid-cols-[1fr_1.2fr] rounded-[28px] overflow-hidden" style={{ border: `1px solid ${LINE}` }}>
        <div className="p-8 md:p-10 flex flex-col gap-3.5">
          {/headquarter|hq/i.test(desc) && <span className="self-start rounded-full px-3 py-1.5 text-[11px] font-extrabold tracking-[0.14em]" style={{ backgroundColor: '#7CC4FF', color: '#0E1216' }}>HQ</span>}
          <h1 className="m-0 text-white font-bold leading-none" style={{ fontFamily: SERIF, fontSize: 'clamp(2.4rem, 5vw, 4rem)' }}><AccentTitle text={name} /></h1>
          {desc && <p className="m-0" style={{ color: BODY }}>{desc}</p>}
          {zone && (
            <div><small className="text-[11px] font-extrabold tracking-[0.2em]" style={{ color: BODY }}><Clock className="inline w-3.5 h-3.5 mr-1 -mt-0.5" aria-hidden="true" />{tt({ en: 'LOCAL TIME', es: 'HORA LOCAL' })}</small>
              <b className="block text-white text-[54px] font-extrabold leading-none tracking-[-0.04em] tabular-nums">{localTime(zone, now)}</b></div>
          )}
          <div className="flex flex-wrap gap-2.5 mt-1.5">
            <NBtn to="/#contact">{tt({ en: 'Contact this office', es: 'Contactar esta oficina' })}</NBtn>
            {office.link && <NBtn href={office.link} variant="s" icon="ext">{tt({ en: 'Open in Maps', es: 'Abrir en Maps' })}</NBtn>}
          </div>
          {people.length > 0 && (
            <div className="grid gap-2.5 mt-2">
              {people.map(m => (
                <div key={m.id} className="flex items-center gap-3 rounded-2xl p-3" style={{ border: `1px solid ${LINE}` }}>
                  {m.photo_url ? <img src={gemImg(m.photo_url)} alt="" className="w-14 h-14 rounded-full object-cover" /> : <span className="w-14 h-14 rounded-full" style={{ backgroundColor: LINE }} />}
                  <span><b className="block text-white">{tt(m.name)}</b><small style={{ color: BODY }}>{tt(m.role)}</small></span>
                </div>
              ))}
            </div>
          )}
        </div>
        {map && <iframe src={map} title={name} className="w-full min-h-[420px] h-full border-0 grayscale" loading="lazy" />}
      </div>
      {events.length > 0 && (
        <Section title={tt({ en: 'Upcoming events nearby', es: 'Próximos eventos cerca' })}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">{events.map(e => <EventPosterCard key={e.id} e={e} />)}</div>
        </Section>
      )}
    </DetailShell>
  );
}

// ── /terms, /privacy ─────────────────────────────────────────────────────────
export function NorulesLegal({ type }) {
  const tt = useT();
  const fmt = useFmtDate();
  const [page, setPage] = useState(null);
  const [active, setActive] = useState('');
  useEffect(() => { setPage(null); publicAPI.getPage(type).then(r => setPage(r.data || {})).catch(() => setPage({})); }, [type]);

  // Give every h2 an id and build the table of contents from them; the first h2 repeating the title is dropped.
  const { html, toc } = useMemo(() => {
    const doc = new DOMParser().parseFromString(normalizeRichText(tt(page?.content) || ''), 'text/html');
    const hs = [...doc.body.querySelectorAll('h2')];
    if (hs[0] && plain(hs[0].innerHTML) === (tt(page?.title) || '').trim()) { hs[0].remove(); hs.shift(); }
    hs.forEach((h, i) => { h.id = `s${i + 1}-${slugify(h.textContent).slice(0, 40)}`; });
    return { html: doc.body.innerHTML, toc: hs.map(h => [h.id, h.textContent.trim()]) };
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!toc.length) return undefined;
    const onScroll = () => {
      let cur = toc[0][0];
      toc.forEach(([id]) => { const el = document.getElementById(id); if (el && el.getBoundingClientRect().top < 140) cur = id; });
      setActive(cur);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [toc]);

  const title = tt(page?.title) || (type === 'privacy' ? 'Privacy Policy' : 'Terms of Service');
  const words = plain(html).split(/\s+/).filter(Boolean).length;
  return (
    <DetailShell testid={`gem2i-legal-${type}`}>
      <div className="pt-10 flex flex-wrap gap-2">
        {[['terms', tt({ en: 'Terms of Service', es: 'Términos del servicio' })], ['privacy', tt({ en: 'Privacy Policy', es: 'Política de privacidad' })]].map(([k, l]) => (
          <Link key={k} to={`/${k}`} className="rounded-full px-4 py-2 text-[13px] font-bold"
            style={k === type ? { backgroundColor: 'var(--color-seg-on, #fff)', color: 'var(--color-seg-on-text, #04080C)' } : { border: `1px solid ${LINE}`, color: BODY }}>{l}</Link>
        ))}
      </div>
      <div className={`mt-8 mb-6 grid gap-12 ${toc.length > 1 ? 'lg:grid-cols-[250px_1fr]' : ''}`}>
        {toc.length > 1 && (
          <nav className="lg:sticky lg:top-24 self-start border-l-2 pl-4 grid gap-2.5" style={{ borderColor: LINE }} aria-label={tt({ en: 'Contents', es: 'Contenido' })}>
            {toc.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="text-[14.5px] transition-colors" style={id === active ? { color: 'var(--gem-ink, #fff)', fontWeight: 700 } : { color: BODY }}>{label}</a>
            ))}
          </nav>
        )}
        <article>
          <h1 className="m-0 text-white font-bold leading-none" style={{ fontFamily: SERIF, fontSize: 'clamp(2.4rem, 5vw, 3.8rem)' }}><AccentTitle text={title} /></h1>
          <p className="mt-2 mb-7 text-[14px]" style={{ color: BODY }}>
            {page?.updated_at || page?.created_at ? `${tt({ en: 'Last updated', es: 'Actualizado' })}: ${fmt(page.updated_at || page.created_at, { month: 'long', day: 'numeric', year: 'numeric' })} · ` : ''}
            ≈ {Math.max(1, Math.round(words / 220))} min
          </p>
          {!page ? <SkeletonGrid count={1} /> : (
            <div className="max-w-[72ch] text-[16.5px] leading-[1.85] [&_p]:mb-4 [&_h2]:scroll-mt-24 [&_h2]:mt-9 [&_h2]:mb-2.5 [&_h2]:text-[24px] [&_h2]:font-bold [&_h2]:text-white [&_ul]:list-disc [&_ul]:pl-6 [&_a]:underline"
              style={{ color: BODY }} dangerouslySetInnerHTML={{ __html: html }} />
          )}
        </article>
      </div>
    </DetailShell>
  );
}
