import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Music2 } from 'lucide-react';
import { gemAPI } from '../../lib/api';
import { useT } from '../../lib/i18n';
import AccentTitle from '../../components/gem2i/AccentTitle';
import { Paginator, SkeletonGrid, EmptyState, gemImg } from '../../components/gem2i/GemCatalogBits';
import {
  PageHero, SearchBar, Segmented, ContinentTabs, continentParams, HoverCard, Where, When,
  useFmtDate, place, CARD_CSS, LINK, BODY,
} from '../../components/gem2i/GemCatalogCards';

const GEM_FONT = "'Manrope', sans-serif";
const EMPTY = { q: '', date_from: '', date_to: '', country: '', state: '', city: '' };

/** Festivals (/festivals) — FE-A (2026-10-26, boceto gem2i-festivals.html; was GF1): first three as a 2+1+1 bento + 3-col grid, legacy
 *  search (name, date, country, city) + continent tabs, hover cards with
 *  date range, place and the first lineup names. Upcoming/Past only when
 *  there is something upcoming. Conferences strip kept below. */
export default function Gem2iFestivals() {
  const tt = useT();
  const fmt = useFmtDate();
  const [filters, setFilters] = useState(EMPTY);
  const [tab, setTab] = useState('');
  const [scope, setScope] = useState('');
  const [hasUpcoming, setHasUpcoming] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [hasHero, setHasHero] = useState(null); // null until PageHero knows
  const [conferences, setConferences] = useState([]);

  useEffect(() => {
    gemAPI.conferences({ limit: 12 }).then(r => setConferences(r.data?.items || [])).catch(() => {});
    gemAPI.festivalsMeta().then(r => {
      const n = r.data?.upcoming || 0;
      setHasUpcoming(n > 0);
      if (n > 0) setScope('upcoming');
    }).catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    setData(null);
    const params = { page, limit: 24, ...continentParams(tab) };
    if (scope) params.scope = scope;
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    gemAPI.festivals(params).then(r => { if (alive) setData(r.data); }).catch(() => { if (alive) setData({ items: [], pages: 1 }); });
    return () => { alive = false; };
  }, [filters, tab, scope, page]);

  const featured = page === 1 && !filters.q;
  const dates = (f) => f.range_dates || fmt(f.event_date, { month: 'long', day: 'numeric', year: 'numeric' });
  const where = (f) => place(f.city || f.state, f.country);
  const items = data?.items || [];
  const top = featured ? items.slice(0, 3) : [];
  const rest = featured ? items.slice(3) : items;
  const card = (f, aspect, big) => (
    <HoverCard key={f.id} to={`/festivals/${f.slug}`} testid="festival-card" aspect={aspect}
      img={gemImg(f.image_urls?.view) || gemImg(f.image_urls?.flyer)}
      logo={gemImg(f.image_urls?.logo)} title={f.title} strip={f.title}
      meta={[<When>{dates(f)}</When>, where(f) && <Where>{where(f)}</Where>]}
      extra={f.lineup_names?.length > 0 && (
        <span className="mt-1.5 inline-flex items-start gap-1.5 text-[14px]" style={{ color: LINK }}>
          <Music2 className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />{f.lineup_names.join(' · ')}
        </span>
      )} />
  );

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: 'var(--color-page-bg, #04080C)', fontFamily: GEM_FONT }} data-testid="gem2i-festivals-page">
      <PageHero page="festivals" onShown={setHasHero} />
      {/* FE-A (boceto gem2i-festivals.html): title left + Upcoming/Past right (only when something is upcoming),
          then search, continent tabs, bento, grid, conferences. Without CMS hero the title is the opener and grows. */}
      <div className={`max-w-7xl mx-auto px-6 md:px-10 ${hasHero === false ? 'pt-14 md:pt-16' : 'pt-16 md:pt-20'}`}>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-5">
          <h1 className="text-white font-bold leading-[1.06] pb-1" data-testid="festivals-title"
            style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: hasHero === false ? 'clamp(2.6rem, 5.4vw, 4.4rem)' : 'clamp(2.2rem, 4.4vw, 3.4rem)' }}>
            <AccentTitle text={tt({ en: 'Global festivals', es: 'Festivales globales' })} />
          </h1>
          {hasUpcoming && (
            <Segmented value={scope} onChange={v => { setScope(v); setPage(1); }} label={tt({ en: 'Festivals period', es: 'Periodo' })} options={[
              { value: 'upcoming', label: tt({ en: 'Upcoming', es: 'Próximos' }) },
              { value: 'past', label: tt({ en: 'Past', es: 'Pasados' }) },
            ]} />
          )}
        </div>
        <SearchBar values={filters} onSearch={v => { setFilters(v); setPage(1); }} onReset={() => { setFilters(EMPTY); setTab(''); setPage(1); }} fields={[
          { key: 'q', placeholder: tt({ en: 'by name…', es: 'por nombre…' }) },
          { type: 'daterange', key: 'dates', catalog: 'festivals' },
          { type: 'places', key: 'places', catalog: 'festivals' },
        ]} />
        <ContinentTabs value={tab} onChange={v => { setTab(v); setPage(1); }} />
      </div>

      <section className="max-w-7xl mx-auto px-6 md:px-10">
        {!data ? <SkeletonGrid count={8} aspect="aspect-square" /> : data.items.length === 0 ? (
          <EmptyState>{tt({ en: 'We have not found a festival. Press Reset to see the full list.', es: 'No encontramos festivales. Pulsa Limpiar para ver la lista completa.' })}</EmptyState>
        ) : (
          <>
            {/* GF1 (boceto gem2i-inner-pages-1.html): the first three as a 2+1+1 bento, the rest in a 3-col 4:5 grid. */}
            {top.length > 0 && (
              <div className={`grid grid-cols-1 gap-4 mb-4 ${top.length > 1 ? 'md:grid-cols-[2fr_1fr] md:grid-rows-2 md:h-[560px]' : 'md:h-[480px]'}`} data-testid="festivals-bento">
                {top.map((f, i) => card(f, i === 0 ? `aspect-[4/3] md:aspect-auto ${top.length > 1 ? 'md:row-span-2' : ''}` : 'aspect-[4/3] md:aspect-auto', i === 0))}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rest.map(f => card(f, 'aspect-[4/5]'))}
            </div>
            <Paginator page={data.page} pages={data.pages} onPage={setPage} />
          </>
        )}
      </section>

      {conferences.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 md:px-10 pt-20" data-testid="gem2i-conferences-strip">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-white font-bold leading-[1.1] pb-1" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(1.6rem, 2.8vw, 2.2rem)' }}>
              <AccentTitle text={tt({ en: 'Music conferences', es: 'Conferencias de música' })} />
            </h2>
            <Link to="/conferences" className="font-bold underline underline-offset-4 decoration-1 hover:decoration-2" style={{ color: LINK }} data-testid="all-conferences-link">{tt({ en: 'All conferences', es: 'Todas las conferencias' })}</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {conferences.slice(0, 8).map(c => (
              <Link key={c.id} to={`/conferences/${c.slug}`} className="group">
                <span className="block aspect-square rounded-[4px] bg-white p-7 overflow-hidden">
                  {(c.image_urls?.logo || c.image_urls?.flyer) && <img src={gemImg(c.image_urls?.logo) || gemImg(c.image_urls?.flyer)} alt={c.title} loading="lazy" className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-[1.05]" />}
                </span>
                <p className="mt-3 text-white/90 text-[14.5px] font-bold group-hover:text-white transition-colors">{c.title}</p>
                <p className="text-[13px] mt-0.5" style={{ color: BODY }}>{[c.range_dates || c.event_date, c.country].filter(Boolean).join(' · ')}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
      <style>{CARD_CSS}</style>
    </div>
  );
}
