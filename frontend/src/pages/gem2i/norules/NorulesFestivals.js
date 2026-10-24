/* Norules (`gem2i`) — own copy of this inner page (template = package, D-GEM-2026-15). */
import React, { useEffect, useState } from 'react';
import { Music2 } from 'lucide-react';
import { gemAPI } from '../../../lib/api';
import { useT } from '../../../lib/i18n';
import { Paginator, SkeletonGrid, EmptyState, gemImg } from '../../../components/gem2i/GemCatalogBits';
import { NBtn } from '../../../components/gem2i/norules/NBtn';
import {
  PageHero, PageHead, SearchBar, Segmented, ContinentTabs, continentParams, HoverCard, Where, When,
  useFmtDate, place, usePageTone, CARD_CSS, LINK,
} from '../../../components/gem2i/norules/GemCatalogCards';

const GEM_FONT = "'Manrope', sans-serif";
const EMPTY = { q: '', date_from: '', date_to: '', country: '', state: '', city: '' };

/** Festivals (/festivals) — F4 (boceto norules-festivals-hover.html): 3-column grid of equal 4:5 cards
 *  with the legacy hover (veil wipe, zoom, logo grey→colour, info rises), legacy search (name, date,
 *  country, state, city) + continent tabs. Upcoming/Past only when there is something upcoming.
 *  Conferences below as a 4-column grid with the same card (no horizontal scroll) + Load more. */
const CONF_STEP = 8;
export default function NorulesFestivals() {
  const tt = useT();
  const fmt = useFmtDate();
  const [filters, setFilters] = useState(EMPTY);
  const [tab, setTab] = useState('');
  const [scope, setScope] = useState('');
  const [hasUpcoming, setHasUpcoming] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [conferences, setConferences] = useState([]);
  const [confShown, setConfShown] = useState(CONF_STEP);
  const tone = usePageTone();

  useEffect(() => {
    gemAPI.conferences({ limit: 100 }).then(r => setConferences(r.data?.items || [])).catch(() => {});
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

  const dates = (f) => f.range_dates || fmt(f.event_date, { month: 'long', day: 'numeric', year: 'numeric' });
  const where = (f) => place(f.city || f.state, f.country);

  return (
    <div className={`min-h-screen pb-24 ${tone.className}`} style={{ backgroundColor: 'var(--color-page-bg, #04080C)', fontFamily: GEM_FONT, ...tone.style }} data-testid="gem2i-festivals-page">
      <PageHero page="festivals" />
      <PageHead eyebrow={tt({ en: 'Global', es: 'Global' })} title={tt({ en: 'Festivals worldwide', es: 'Festivales del mundo' })}>
        {hasUpcoming && (
          <div className="mt-8">
            <Segmented value={scope} onChange={v => { setScope(v); setPage(1); }} label={tt({ en: 'Festivals period', es: 'Periodo' })} options={[
              { value: 'upcoming', label: tt({ en: 'Upcoming', es: 'Próximos' }) },
              { value: 'past', label: tt({ en: 'Past', es: 'Pasados' }) },
            ]} />
          </div>
        )}
        <SearchBar values={filters} onSearch={v => { setFilters(v); setPage(1); }} onReset={() => { setFilters(EMPTY); setTab(''); setPage(1); }} fields={[
          { key: 'q', placeholder: tt({ en: 'by name…', es: 'por nombre…' }) },
          { type: 'daterange', key: 'dates', catalog: 'festivals' },
          { type: 'places', key: 'places', catalog: 'festivals' },
        ]} />
        <ContinentTabs value={tab} onChange={v => { setTab(v); setPage(1); }} />
      </PageHead>

      <section className="max-w-7xl mx-auto px-6 md:px-10">
        {!data ? <SkeletonGrid count={8} aspect="aspect-square" /> : data.items.length === 0 ? (
          <EmptyState>{tt({ en: 'We have not found a festival. Press Reset to see the full list.', es: 'No encontramos festivales. Pulsa Limpiar para ver la lista completa.' })}</EmptyState>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.items.map(f => (
                <HoverCard key={f.id} to={`/festivals/${f.slug}`} testid="festival-card" aspect="aspect-[4/5]"
                  img={gemImg(f.image_urls?.view) || gemImg(f.image_urls?.flyer)}
                  logo={gemImg(f.image_urls?.logo)} title={f.title} strip={f.title}
                  meta={[<When>{dates(f)}</When>, where(f) && <Where>{where(f)}</Where>]}
                  extra={f.lineup_names?.length > 0 && (
                    <span className="mt-1.5 inline-flex items-start gap-1.5 text-[14px]" style={{ color: '#9fd3ff' }}>
                      <Music2 className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />{f.lineup_names.join(' · ')}
                    </span>
                  )} />
              ))}
            </div>
            <Paginator page={data.page} pages={data.pages} onPage={setPage} />
          </>
        )}
      </section>

      {conferences.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 md:px-10 pt-20" data-testid="gem2i-conferences-strip">
          <p className="gem-eyebrow mb-3" style={{ color: LINK }}>{tt({ en: 'Music', es: 'Música' })}</p>
          <h2 className="text-white font-bold mb-8" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(1.6rem, 2.8vw, 2.2rem)' }}>
            {tt({ en: 'Conferences', es: 'Conferencias' })}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {conferences.slice(0, confShown).map(c => (
              <HoverCard key={c.id} to={`/conferences/${c.slug}`} testid="conference-card" aspect="aspect-[3/4]"
                img={gemImg(c.image_urls?.view) || gemImg(c.image_urls?.flyer)}
                logo={gemImg(c.image_urls?.logo)} title={c.title} strip={c.title}
                meta={[(c.range_dates || c.event_date) && <When>{c.range_dates || fmt(c.event_date, { month: 'long', day: 'numeric', year: 'numeric' })}</When>,
                  where(c) && <Where>{where(c)}</Where>]} />
            ))}
          </div>
          {conferences.length > confShown && (
            <div className="mt-8 flex justify-center">
              <NBtn onClick={() => setConfShown(n => n + CONF_STEP)} variant="s" icon="down">{tt({ en: 'Load more conferences', es: 'Ver más conferencias' })}</NBtn>
            </div>
          )}
        </section>
      )}
      <style>{CARD_CSS}</style>
    </div>
  );
}
