import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutGrid, List } from 'lucide-react';
import { gemAPI } from '../../lib/api';
import { useT } from '../../lib/i18n';
import {
  CatalogHero, FilterPills, CatalogSearch, Paginator, SkeletonGrid,
  EmptyState, CardImage, TypeBadge, gemImg,
} from '../../components/gem2i/GemCatalogBits';

const GEM_FONT = "'Poppins', sans-serif";
const FILTER_BORDER = { borderColor: 'var(--color-card-border, rgba(255,255,255,0.08))' };
const MUTED = { color: 'var(--color-body-text, #9AA6B2)' };

/** Events listing (plan A4): current / past scope, name search, date + country
 *  filters, card/list view toggle (legacy parity). Public rows only
 *  (active + not private + show_portal; past capped server-side). */
export default function Gem2iEvents() {
  const tt = useT();
  const [scope, setScope] = useState('current');
  const [q, setQ] = useState('');
  const [date, setDate] = useState('');
  const [country, setCountry] = useState('');
  const [countries, setCountries] = useState([]);
  const [view, setView] = useState(() => window.localStorage.getItem('gem2i_events_view') || 'grid');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);

  useEffect(() => { setPage(1); }, [scope, q, date, country]);
  useEffect(() => { window.localStorage.setItem('gem2i_events_view', view); }, [view]);

  useEffect(() => {
    gemAPI.venueCountries().then(r => setCountries(r.data?.items || [])).catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    setData(null);
    const params = { scope, page, limit: 24 };
    if (q) params.q = q;
    if (date) params.date = date;
    if (country) params.country = country;
    gemAPI.events(params).then(r => { if (alive) setData(r.data); }).catch(() => { if (alive) setData({ items: [], pages: 1 }); });
    return () => { alive = false; };
  }, [scope, q, date, country, page]);

  const SCOPES = [
    { value: 'current', label: tt({ en: 'Current Events', es: 'Eventos Actuales' }) },
    { value: 'past', label: tt({ en: 'Past Events', es: 'Eventos Pasados' }) },
  ];

  const viewBtn = (v, Icon, label) => (
    <button type="button" onClick={() => setView(v)} aria-label={label} aria-pressed={view === v}
      className="p-2 rounded-sm border transition-colors"
      style={view === v
        ? { backgroundColor: 'var(--color-accent, #3287B7)', borderColor: 'var(--color-accent, #3287B7)', color: '#fff' }
        : { ...FILTER_BORDER, ...MUTED }}>
      <Icon className="w-4 h-4" />
    </button>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-page-bg, #04080C)', fontFamily: GEM_FONT }} data-testid="gem2i-events-page">
      <CatalogHero kicker={tt({ en: 'CATALOG', es: 'CATÁLOGO' })} title={tt({ en: 'Events', es: 'Eventos' })}>
        <div className="mt-6 flex flex-col gap-4">
          <FilterPills options={SCOPES} value={scope} onChange={setScope} />
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <CatalogSearch value={q} onChange={setQ} placeholder={tt({ en: 'Search event name', es: 'Buscar evento' })} />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full md:w-48 px-3 py-2 text-sm rounded-sm border bg-transparent text-white focus:outline-none [color-scheme:dark]"
              style={FILTER_BORDER}
              aria-label={tt({ en: 'Filter by date', es: 'Filtrar por fecha' })} />
            <select value={country} onChange={(e) => setCountry(e.target.value)}
              className="w-full md:w-52 px-3 py-2 text-sm rounded-sm border bg-transparent text-white focus:outline-none [color-scheme:dark]"
              style={FILTER_BORDER}
              aria-label={tt({ en: 'Filter by country', es: 'Filtrar por país' })}>
              <option value="">{tt({ en: 'All countries', es: 'Todos los países' })}</option>
              {countries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="flex items-center gap-2 md:ml-auto">
              {viewBtn('grid', LayoutGrid, tt({ en: 'Card view', es: 'Vista de tarjetas' }))}
              {viewBtn('list', List, tt({ en: 'List view', es: 'Vista de lista' }))}
            </div>
          </div>
        </div>
      </CatalogHero>

      <section className="max-w-7xl mx-auto px-6 md:px-10 pb-24">
        {!data ? <SkeletonGrid count={12} aspect="aspect-square" /> : data.items.length === 0 ? (
          <EmptyState>
            {scope === 'current'
              ? tt({ en: 'No upcoming events right now. Check the past events or come back soon.', es: 'No hay eventos próximos por ahora. Revisa los eventos pasados o vuelve pronto.' })
              : tt({ en: 'No events match these filters.', es: 'Ningún evento coincide con estos filtros.' })}
          </EmptyState>
        ) : (
          <>
            {view === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {data.items.map(e => (
                  <Link key={e.id} to={`/events/${e.slug}`} className="group block" data-testid="event-card">
                    <CardImage src={gemImg(e.image_urls?.flyer) || gemImg(e.image_urls?.logo)} alt={e.title} aspect="aspect-square" />
                    <div className="mt-3 flex items-center gap-2"><TypeBadge type={e.type} /></div>
                    <p className="mt-1.5 text-white/90 text-sm font-semibold group-hover:text-white transition-colors">{e.title}</p>
                    <p className="text-xs mt-0.5" style={MUTED}>
                      {e.event_date}{e.venue ? ` · ${e.venue.name}` : ''}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--color-card-border, rgba(255,255,255,0.08))' }}>
                {data.items.map(e => (
                  <Link key={e.id} to={`/events/${e.slug}`}
                    className="group flex items-center gap-4 py-3 transition-colors hover:bg-white/[0.03]"
                    style={FILTER_BORDER} data-testid="event-row">
                    <div className="w-16 shrink-0">
                      <CardImage src={gemImg(e.image_urls?.flyer) || gemImg(e.image_urls?.logo)} alt={e.title} aspect="aspect-square" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white/90 text-sm font-semibold truncate group-hover:text-white transition-colors">{e.title}</p>
                      <p className="text-xs mt-0.5 truncate" style={MUTED}>
                        {e.event_date}
                        {e.venue ? ` · ${e.venue.name}` : ''}
                        {e.venue?.country ? ` · ${e.venue.country}` : ''}
                      </p>
                    </div>
                    <TypeBadge type={e.type} />
                  </Link>
                ))}
              </div>
            )}
            <Paginator page={data.page} pages={data.pages} onPage={setPage} />
          </>
        )}
      </section>
    </div>
  );
}
