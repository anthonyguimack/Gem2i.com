/* Norules (`gem2i`) — own copy of this inner page (template = package, D-GEM-2026-15). */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock } from 'lucide-react';
import { gemAPI } from '../../../lib/api';
import { useT } from '../../../lib/i18n';
import { Paginator, SkeletonGrid, EmptyState, gemImg } from '../../../components/gem2i/GemCatalogBits';
import {
  PageHero, PageHead, SearchBar, Segmented, HoverCard, Where, When, useFmtDate, place,
  CARD_CSS, ACCENT, BODY, CARD, LINE,
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

const time = (t) => (t && /T\d\d:\d\d/.test(t) ? t.slice(11, 16) : '');

/** Events (/events) — EV-1: Current/Past, Event/List view, legacy search
 *  (country, city, event name, date), hover cards. */
export default function NorulesEvents() {
  const tt = useT();
  const fmt = useFmtDate();
  const [scope, setScope] = useState('current');
  const [filters, setFilters] = useState(EMPTY);
  const [view, setView] = useState(() => { try { return localStorage.getItem('gem2i_events_view') || 'grid'; } catch { return 'grid'; } });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);

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
  const ctaOf = (e) => (isTicket(e) ? tt({ en: 'Buy tickets', es: 'Comprar entradas' }) : tt({ en: 'View details', es: 'Ver detalles' }));
  const whenOf = (e) => [fmt(e.event_date), time(e.open_time) && `${tt({ en: 'doors', es: 'apertura' })} ${time(e.open_time)}`].filter(Boolean).join(' · ');
  const whereOf = (e) => place(e.venue?.name, e.venue?.city || e.venue?.state, e.venue?.country);

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: 'var(--color-page-bg, #04080C)', fontFamily: GEM_FONT }} data-testid="gem2i-events-page">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5">
            {data.items.map(e => (
              <HoverCard key={e.id} to={`/events/${e.slug}`} testid="event-card" aspect="aspect-[3/4]"
                img={gemImg(e.image_urls?.flyer) || gemImg(e.image_urls?.logo)}
                top={<TypeTag type={e.type} />} title={e.title} cta={ctaOf(e)}
                meta={[<When>{whenOf(e)}</When>, whereOf(e) && <Where>{whereOf(e)}</Where>]} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {data.items.map(e => (
              <Link key={e.id} to={`/events/${e.slug}`} data-testid="event-row"
                className="group grid grid-cols-1 md:grid-cols-[260px_1fr_auto] gap-5 md:gap-7 items-center rounded-2xl overflow-hidden transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-[rgba(90,175,234,.5)]"
                style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
                <div className="h-48 md:h-40 overflow-hidden" style={{ backgroundColor: '#0A121A' }}>
                  {(e.image_urls?.flyer || e.image_urls?.logo) && <img src={gemImg(e.image_urls?.flyer) || gemImg(e.image_urls?.logo)} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />}
                </div>
                <div className="px-5 md:px-0">
                  <TypeTag type={e.type} inline />
                  <p className="mt-2.5 text-white text-[21px] font-semibold leading-tight">{e.title}</p>
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[14px]" style={{ color: BODY }}>
                    <span>{fmt(e.event_date)}</span>
                    {time(e.open_time) && <span className="inline-flex items-center gap-1.5"><Clock className="w-4 h-4" aria-hidden="true" />{tt({ en: 'Doors', es: 'Apertura' })} {time(e.open_time)}</span>}
                    {whereOf(e) && <span>{whereOf(e)}</span>}
                  </div>
                </div>
                <span className="mx-5 mb-5 md:m-0 md:mr-7 justify-self-start inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[14px] font-semibold text-white" style={{ backgroundColor: ACCENT }}>
                  {ctaOf(e)} <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        )}
        {data && data.items.length > 0 && <Paginator page={data.page} pages={data.pages} onPage={setPage} />}
      </section>
      <style>{CARD_CSS}</style>
    </div>
  );
}
