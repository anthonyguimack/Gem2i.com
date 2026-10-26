import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { gemAPI } from '../../lib/api';
import { useT, useLang } from '../../lib/i18n';
import AccentTitle from '../../components/gem2i/AccentTitle';
import { Paginator, SkeletonGrid, EmptyState, gemImg } from '../../components/gem2i/GemCatalogBits';
import {
  PageHero, SearchBar, Segmented, HoverCard, Where, When, useFmtDate, place,
  CARD_CSS, ACCENT, BODY, CARD, LINE,
} from '../../components/gem2i/GemCatalogCards';

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
const SERIF = "'Playfair Display', Georgia, serif";

/** Days / hours / minutes until the doors (or the date at 00:00). Ticks every 30 s. */
function useCountdown(iso) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(id); }, []);
  const t = Date.parse(iso || '');
  if (!t || t <= now) return null;
  const m = Math.floor((t - now) / 60000);
  return [Math.floor(m / 1440), Math.floor((m % 1440) / 60), m % 60];
}

/** GE1 (boceto gem2i-inner-pages-1.html): the next event as a wide band, flyer left + countdown right. */
function NextEvent({ e, cta, when, where }) {
  const tt = useT();
  const cd = useCountdown(e.open_time && /T\d\d:\d\d/.test(e.open_time) ? e.open_time : e.event_date && `${e.event_date}T00:00:00`);
  const img = gemImg(e.image_urls?.flyer) || gemImg(e.image_urls?.logo);
  return (
    <Link to={`/events/${e.slug}`} data-testid="next-event" className="group grid md:grid-cols-[1fr_1.2fr] rounded-[4px] overflow-hidden mb-10" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
      <div className="aspect-square md:aspect-auto md:min-h-[420px] overflow-hidden" style={{ backgroundColor: '#0A121A' }}>
        {img && <img src={img} alt="" className="w-full h-full object-cover transition-transform duration-1000 ease-[cubic-bezier(.19,1,.22,1)] group-hover:scale-[1.04]" />}
      </div>
      <div className="p-7 md:p-11 flex flex-col justify-center">
        <p className="text-[12px] font-extrabold tracking-[0.16em] uppercase" style={{ color: 'var(--color-link, #5AAFEA)' }}>{tt({ en: 'Next event', es: 'Próximo evento' })}</p>
        <h2 className="mt-3 text-white font-bold leading-[1.08] pb-1" style={{ fontFamily: SERIF, fontSize: 'clamp(2rem, 4vw, 3rem)' }}>{e.title}</h2>
        <p className="mt-2 text-[15.5px]" style={{ color: BODY }}>{[when, where].filter(Boolean).join(' · ')}</p>
        {cd && (
          <div className="mt-7 flex gap-2.5" aria-label={tt({ en: 'Time left', es: 'Tiempo restante' })}>
            {[[cd[0], tt({ en: 'days', es: 'días' })], [cd[1], tt({ en: 'hours', es: 'horas' })], [cd[2], tt({ en: 'min', es: 'min' })]].map(([n, l]) => (
              <div key={l} className="min-w-[74px] rounded-[4px] px-4 py-3 text-center" style={{ backgroundColor: 'var(--color-page-bg, #04080C)' }}>
                <b className="block text-white text-[28px] leading-none tabular-nums" style={{ fontFamily: SERIF }}>{String(n).padStart(2, '0')}</b>
                <small className="text-[12px]" style={{ color: BODY }}>{l}</small>
              </div>
            ))}
          </div>
        )}
        <span className="mt-8 self-start inline-flex items-center gap-2 rounded-[4px] px-6 py-3.5 text-[15px] font-bold text-white transition-colors" style={{ backgroundColor: ACCENT }}>
          {cta} <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}

/** Events (/events) — EV-A (2026-10-26, boceto gem2i-events.html): title + switches, search, "Next event"
 *  band only without CMS hero, 4:5 flyer wall, list rows with big date. Before: EV-1: Current/Past, Event/List view, legacy search
 *  (country, city, event name, date), hover cards. */
export default function Gem2iEvents() {
  const tt = useT();
  const fmt = useFmtDate();
  const { lang } = useLang() || { lang: 'en' };
  const [scope, setScope] = useState('current');
  const [filters, setFilters] = useState(EMPTY);
  const [view, setView] = useState(() => { try { return localStorage.getItem('gem2i_events_view') || 'grid'; } catch { return 'grid'; } });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [hasHero, setHasHero] = useState(null); // null until PageHero knows

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
  // GE1: on the first page of upcoming events without filters, the first event becomes the "Next event" band.
  // EV-A: with a CMS hero on /events (Hero → Page Assignment) the hero already features an event, so the
  // "Next event" band only opens the page when there is NO hero (first page of upcoming events, no filters).
  const featured = hasHero === false && data && scope === 'current' && page === 1 && !Object.values(filters).some(Boolean) ? data.items[0] : null;
  const whereOf = (e) => place(e.venue?.name, e.venue?.city || e.venue?.state, e.venue?.country);

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: 'var(--color-page-bg, #04080C)', fontFamily: GEM_FONT }} data-testid="gem2i-events-page">
      <PageHero page="events" onShown={setHasHero} />
      {/* EV-A (boceto gem2i-events.html): title left, period + view switches right, full search below.
          Without hero the title is the page opener, so it grows. */}
      <div className={`max-w-7xl mx-auto px-6 md:px-10 ${hasHero === false ? 'pt-14 md:pt-16' : 'pt-16 md:pt-20'}`}>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-5">
          <h1 className="text-white font-bold leading-[1.06] pb-1" data-testid="events-title"
            style={{ fontFamily: SERIF, fontSize: hasHero === false ? 'clamp(2.6rem, 5.4vw, 4.4rem)' : 'clamp(2.2rem, 4.4vw, 3.4rem)' }}>
            <AccentTitle text={scope === 'past' ? tt({ en: 'Past events', es: 'Eventos pasados' }) : tt({ en: 'Upcoming events', es: 'Próximos eventos' })} />
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            <Segmented value={scope} onChange={v => { setScope(v); setPage(1); }} label={tt({ en: 'Events period', es: 'Periodo' })} options={[
              { value: 'current', label: tt({ en: 'Current', es: 'Actuales' }) },
              { value: 'past', label: tt({ en: 'Past', es: 'Pasados' }) },
            ]} />
            <Segmented value={view} onChange={setView} label={tt({ en: 'View', es: 'Vista' })} options={[
              { value: 'grid', label: tt({ en: 'Cards', es: 'Tarjetas' }) },
              { value: 'list', label: tt({ en: 'List', es: 'Lista' }) },
            ]} />
          </div>
        </div>
        <SearchBar values={filters} onSearch={v => { setFilters(v); setPage(1); }} onReset={() => { setFilters(EMPTY); setPage(1); }} fields={[
          { key: 'q', placeholder: tt({ en: 'by event name…', es: 'por nombre del evento…' }) },
          { type: 'places', key: 'places', catalog: 'events' },
          { type: 'daterange', key: 'dates', catalog: 'events' },
        ]} />
      </div>

      <section className="max-w-7xl mx-auto px-6 md:px-10 mt-8">
        {!data ? <SkeletonGrid count={8} aspect="aspect-[3/4]" /> : data.items.length === 0 ? (
          <EmptyState>
            {scope === 'current'
              ? tt({ en: 'No upcoming events right now. Check the past events or come back soon.', es: 'No hay eventos próximos por ahora. Revisa los eventos pasados o vuelve pronto.' })
              : tt({ en: 'No events match these filters.', es: 'Ningún evento coincide con estos filtros.' })}
          </EmptyState>
        ) : view === 'grid' ? (<>
          {featured && <NextEvent e={featured} cta={ctaOf(featured)} when={whenOf(featured)} where={whereOf(featured)} />}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(featured ? data.items.slice(1) : data.items).map(e => (
              <HoverCard key={e.id} to={`/events/${e.slug}`} testid="event-card" aspect="aspect-[4/5]"
                img={gemImg(e.image_urls?.flyer) || gemImg(e.image_urls?.logo)}
                top={<TypeTag type={e.type} />} title={e.title} cta={ctaOf(e)}
                meta={[<When>{whenOf(e)}</When>, whereOf(e) && <Where>{whereOf(e)}</Where>]} />
            ))}
          </div>
        </>) : (
          <div className="border-t" style={{ borderColor: LINE }} data-testid="events-list">
            {data.items.map(e => {
              const img = gemImg(e.image_urls?.flyer) || gemImg(e.image_urls?.logo);
              const d = e.event_date ? new Date(`${e.event_date}T12:00:00`) : null;
              return (
                <Link key={e.id} to={`/events/${e.slug}`} data-testid="event-row"
                  className="gem-row group relative grid grid-cols-[64px_1fr] md:grid-cols-[86px_92px_1fr_auto] gap-x-5 gap-y-3 md:gap-6 items-center px-2 md:px-4 py-4 border-b overflow-hidden"
                  style={{ borderColor: LINE }}>
                  <span className="relative z-[1]">
                    <b className="block text-white leading-none tabular-nums" style={{ fontFamily: SERIF, fontSize: 'clamp(1.9rem, 3vw, 2.4rem)' }}>{d ? String(d.getDate()).padStart(2, '0') : ''}</b>
                    <small className="text-[12px] uppercase tracking-[0.1em]" style={{ color: BODY }}>{d ? d.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB', { weekday: 'short', month: 'short' }) : ''}</small>
                  </span>
                  <span className="hidden md:block relative z-[1] w-[92px] h-[92px] rounded-[4px] overflow-hidden" style={{ backgroundColor: '#0A121A' }}>
                    {img && <img src={img} alt="" loading="lazy" className="w-full h-full object-cover" />}
                  </span>
                  <span className="relative z-[1] min-w-0">
                    <TypeTag type={e.type} inline />
                    <span className="block mt-2 text-white text-[19px] md:text-[21px] font-semibold leading-tight">{e.title}</span>
                    <span className="block mt-1 text-[14px]" style={{ color: BODY }}>
                      {[whereOf(e), time(e.open_time) && `${tt({ en: 'doors', es: 'apertura' })} ${time(e.open_time)}`].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <span className="col-span-2 md:col-span-1 relative z-[1] justify-self-start md:justify-self-end inline-flex items-center gap-2 rounded-[4px] px-5 py-3 text-[14px] font-bold text-white"
                    style={e.type === 'guest_list' ? { border: '1px solid rgba(255,255,255,.35)' } : { backgroundColor: ACCENT }}>
                    {ctaOf(e)} <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </span>
                </Link>
              );
            })}
          </div>
        )}
        {data && data.items.length > 0 && <Paginator page={data.page} pages={data.pages} onPage={setPage} />}
      </section>
      <style>{CARD_CSS + `.gem-row::before{content:'';position:absolute;inset:0;background:rgba(0,104,179,.16);transform:scaleX(0);transform-origin:right center;transition:transform 1s cubic-bezier(.19,1,.22,1)}.gem-row:hover::before,.gem-row:focus-visible::before{transform:scaleX(1);transform-origin:left center}@media (prefers-reduced-motion:reduce){.gem-row::before{transition:none}}`}</style>
    </div>
  );
}
