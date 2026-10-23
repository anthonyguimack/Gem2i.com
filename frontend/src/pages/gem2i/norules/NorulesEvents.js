/* Norules (`gem2i`) — own copy of this inner page (template = package, D-GEM-2026-15). */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MapPin } from 'lucide-react';
import { gemAPI } from '../../../lib/api';
import { useT } from '../../../lib/i18n';
import { Paginator, SkeletonGrid, EmptyState, gemImg } from '../../../components/gem2i/GemCatalogBits';
import {
  PageHero, PageHead, SearchBar, Segmented, HoverCard, Where, When, useFmtDate, place,
  usePageTone, CARD_CSS, ACCENT, LINE,
} from '../../../components/gem2i/norules/GemCatalogCards';

const GEM_FONT = "'Manrope', sans-serif";
const EMPTY = { country: '',  q: '', date_from: '', date_to: '', state: '', city: '' };

/** Event type tag — legacy INFO / E-TICKET / GUEST LIST label (always visible). */
function TypeTag({ type, inline }) {
  const tt = useT();
  const L = { eticket: 'E-Ticket', guest_list: tt({ en: 'Guest list', es: 'Guest list' }), epass: 'E-Pass', info: 'Info' };
  if (!L[type]) return null;
  const style = type === 'eticket' ? { backgroundColor: ACCENT, borderColor: ACCENT, color: '#fff' }
    : type === 'guest_list' ? { backgroundColor: '#2fbf71', borderColor: '#2fbf71', color: '#04210f' }
      : { backgroundColor: 'rgba(4,8,12,.8)', borderColor: 'rgba(255,255,255,.15)', color: '#fff' };
  return <span className={`${inline ? 'inline-block' : 'absolute left-3.5 top-3.5 z-[3]'} px-3 py-1.5 text-[11px] font-bold tracking-[0.16em] uppercase border`} style={style}>{L[type]}</span>;
}

// E3 list rows: the same left→right veil as the cards crosses the whole row.
const LIST_CSS = `
.evrow{position:relative;isolation:isolate;color:var(--gem-ink,#fff);transition:color .4s}
.evrow::before{content:'';position:absolute;inset:0;z-index:-1;background:#0E1216;transform:scaleX(0);transform-origin:right center;transition:transform 1s cubic-bezier(.19,1,.22,1)}
.evrow:hover::before,.evrow:focus-visible::before{transform:scaleX(1);transform-origin:left center}
.evrow:hover,.evrow:focus-visible{color:#fff}
.evrow:hover .evrow-img,.evrow:focus-visible .evrow-img{transform:scale(1.05)}
.evrow .evrow-cta{border:1px solid currentColor}
.gcard:hover .evstamp,.gcard:focus-visible .evstamp{opacity:0}
@media (prefers-reduced-motion:reduce){.evrow::before,.evrow-img{transition:none}}
`;

/** Date stamp on the poster at rest (E1); hidden once the veil comes in. */
function DateStamp({ date }) {
  const d = date ? new Date(date) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  return (
    <span className="evstamp absolute right-3.5 top-3.5 z-[3] rounded-xl bg-white px-2.5 py-1.5 text-center leading-none transition-opacity duration-300" style={{ color: '#0E1216' }}>
      <b className="block text-[22px] font-extrabold tabular-nums">{d.getUTCDate()}</b>
      <small className="text-[10px] font-extrabold tracking-[0.18em]">{d.toLocaleString('en', { month: 'short', timeZone: 'UTC' }).toUpperCase()}</small>
    </span>
  );
}

const time = (t) => (t && /T\d\d:\d\d/.test(t) ? t.slice(11, 16) : '');

/** Events (/events) — E1 posters (date stamp at rest, legacy hover) and E3 list view (veil crosses the
 *  row), boceto norules-events-page.html. Current/Past, Event/List view, legacy search
 *  (country, state, city, event name, dates). */
export default function NorulesEvents() {
  const tt = useT();
  const fmt = useFmtDate();
  const [scope, setScope] = useState('current');
  const [filters, setFilters] = useState(EMPTY);
  const [view, setView] = useState(() => { try { return localStorage.getItem('gem2i_events_view') || 'grid'; } catch { return 'grid'; } });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const tone = usePageTone();

  useEffect(() => { try { localStorage.setItem('gem2i_events_view', view); } catch { /* private mode */ } }, [view]);
  useEffect(() => {
    let alive = true;
    setData(null);
    const params = { scope, page, limit: 24 };
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    gemAPI.events(params).then(r => { if (alive) setData(r.data); }).catch(() => { if (alive) setData({ items: [], pages: 1 }); });
    return () => { alive = false; };
  }, [scope, filters, page]);

  const isTicket = (e) => e.type === 'eticket' || !!e.external_ticket_system;
  const ctaOf = (e) => (isTicket(e) ? tt({ en: 'Buy tickets', es: 'Comprar entradas' })
    : e.type === 'guest_list' ? tt({ en: 'Join guest list', es: 'Unirme a la lista' }) : tt({ en: 'View details', es: 'Ver detalles' }));
  const whenOf = (e) => [fmt(e.event_date), time(e.open_time) && `${tt({ en: 'doors', es: 'apertura' })} ${time(e.open_time)}`].filter(Boolean).join(' · ');
  const whereOf = (e) => place(e.venue?.name, e.venue?.city || e.venue?.state, e.venue?.country);

  return (
    <div className={`min-h-screen pb-24 ${tone.className}`} style={{ backgroundColor: 'var(--color-page-bg, #04080C)', fontFamily: GEM_FONT, ...tone.style }} data-testid="gem2i-events-page">
      <PageHero page="events" />
      <PageHead eyebrow={tt({ en: 'All', es: 'Todos' })} title={scope === 'past' ? tt({ en: 'Past events', es: 'Eventos pasados' }) : tt({ en: 'Upcoming events', es: 'Próximos eventos' })}>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <Segmented value={scope} onChange={v => { setScope(v); setPage(1); }} label={tt({ en: 'Events period', es: 'Periodo' })} options={[
            { value: 'current', label: tt({ en: 'Current events', es: 'Eventos actuales' }) },
            { value: 'past', label: tt({ en: 'Past events', es: 'Eventos pasados' }) },
          ]} />
          <Segmented value={view} onChange={setView} label={tt({ en: 'View', es: 'Vista' })} options={[
            { value: 'grid', label: tt({ en: 'Event view', es: 'Vista de eventos' }) },
            { value: 'list', label: tt({ en: 'List view', es: 'Vista de lista' }) },
          ]} />
        </div>
        <SearchBar values={filters} onSearch={v => { setFilters(v); setPage(1); }} onReset={() => { setFilters(EMPTY); setPage(1); }} fields={[
          { type: 'places', key: 'places', catalog: 'events' },
          { key: 'q', placeholder: tt({ en: 'by event name…', es: 'por nombre del evento…' }) },
          { type: 'daterange', key: 'dates', catalog: 'events' },
        ]} />
      </PageHead>

      <section className="max-w-7xl mx-auto px-6 md:px-10 mt-8">
        {!data ? <SkeletonGrid count={8} aspect="aspect-[3/4]" /> : data.items.length === 0 ? (
          <EmptyState>
            {scope === 'current'
              ? tt({ en: 'No upcoming events right now. Check the past events or come back soon.', es: 'No hay eventos próximos por ahora. Revisa los eventos pasados o vuelve pronto.' })
              : tt({ en: 'No events match these filters.', es: 'Ningún evento coincide con estos filtros.' })}
          </EmptyState>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {data.items.map(e => (
              <HoverCard key={e.id} to={`/events/${e.slug}`} testid="event-card" aspect="aspect-[3/4]"
                img={gemImg(e.image_urls?.flyer) || gemImg(e.image_urls?.logo)}
                top={<><TypeTag type={e.type} /><DateStamp date={e.event_date} /></>} title={e.title} cta={ctaOf(e)}
                meta={[<When>{whenOf(e)}</When>, whereOf(e) && <Where>{whereOf(e)}</Where>]} />
            ))}
          </div>
        ) : (
          <div className="border-t" style={{ borderColor: LINE }}>
            {data.items.map(e => {
              const d = e.event_date ? new Date(e.event_date) : null;
              const ok = d && !Number.isNaN(d.getTime());
              return (
                <Link key={e.id} to={`/events/${e.slug}`} data-testid="event-row"
                  className="evrow grid grid-cols-[80px_1fr_auto] md:grid-cols-[96px_110px_1.3fr_1fr_auto] gap-4 md:gap-6 items-center px-2.5 py-3.5 border-b"
                  style={{ borderColor: LINE }}>
                  <span className="block w-20 h-[100px] md:w-24 md:h-[120px] rounded-xl overflow-hidden" style={{ backgroundColor: '#0A121A' }}>
                    {(e.image_urls?.flyer || e.image_urls?.logo) && <img src={gemImg(e.image_urls?.flyer) || gemImg(e.image_urls?.logo)} alt="" loading="lazy" className="evrow-img w-full h-full object-cover transition-transform duration-700" />}
                  </span>
                  <span className="hidden md:block">
                    {ok && <b className="block text-[40px] font-extrabold leading-none tracking-[-0.04em] tabular-nums">{d.getUTCDate()}</b>}
                    <small className="text-[12px] font-extrabold tracking-[0.16em] opacity-70">
                      {ok && d.toLocaleString('en', { month: 'short', timeZone: 'UTC' }).toUpperCase()}{time(e.open_time) && ` · ${time(e.open_time)}`}
                    </small>
                  </span>
                  <span>
                    <TypeTag type={e.type} inline />
                    <span className="mt-2 block text-[22px] font-bold leading-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{e.title}</span>
                    <span className="md:hidden mt-1 block text-[13px] opacity-75">{whenOf(e)}</span>
                  </span>
                  <span className="hidden md:inline-flex items-start gap-1.5 text-[14px] opacity-80">
                    {whereOf(e) && <><MapPin className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />{whereOf(e)}</>}
                  </span>
                  <span className="evrow-cta inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-[14px] font-semibold whitespace-nowrap">
                    <span className="hidden sm:inline">{ctaOf(e)}</span> <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </span>
                </Link>
              );
            })}
          </div>
        )}
        {data && data.items.length > 0 && <Paginator page={data.page} pages={data.pages} onPage={setPage} />}
      </section>
      <style>{CARD_CSS + LIST_CSS}</style>
    </div>
  );
}
