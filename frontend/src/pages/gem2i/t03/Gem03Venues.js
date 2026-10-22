/* Gem2i - 03 (`gem2i_03`) — own copy of this inner page (template = package, D-GEM-2026-15). */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { gemAPI } from '../../../lib/api';
import { useT } from '../../../lib/i18n';
import { Paginator, SkeletonGrid, EmptyState, gemImg } from '../../../components/gem2i/GemCatalogBits';
import {
  PageHero, PageHead, SearchBar, Segmented, ContinentTabs, continentParams, HoverCard, NumChip, Where,
  place, CARD_CSS, LINK, BODY, CARD, LINE,
} from '../../../components/gem2i/t03/GemCatalogCards';

const GEM_FONT = "'Manrope', sans-serif";
const EMPTY = { country: '',  position: '', q: '', state: '', city: '' };

function useVenueMeta() {
  const tt = useT();
  return (v) => {
    const cap = v.capacity && Number(v.capacity) ? `${tt({ en: 'capacity', es: 'aforo' })} ${Number(v.capacity).toLocaleString()}` : '';
    const kind = [v.type, cap].filter(Boolean).join(' · ');
    return [place(v.city || v.state, v.country) && <Where>{place(v.city || v.state, v.country)}</Where>, kind && <span>{kind}</span>];
  };
}

/** Venues (/venues) — VE-1: Top venues strip (CMS "Featured", else first by
 *  listing order) + all venues with Photo/Logo view, legacy search (country,
 *  city, position, name) and continent tabs. Number = CMS listing order. */
export default function Gem03Venues() {
  const tt = useT();
  const meta = useVenueMeta();
  const [top, setTop] = useState([]);
  const [view, setView] = useState('photo');
  const [filters, setFilters] = useState(EMPTY);
  const [tab, setTab] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);

  useEffect(() => { gemAPI.topVenues(8).then(r => setTop(r.data?.items || [])).catch(() => {}); }, []);
  useEffect(() => {
    let alive = true;
    setData(null);
    const params = { page, limit: 24, ...continentParams(tab) };
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    gemAPI.venues(params).then(r => { if (alive) setData(r.data); }).catch(() => { if (alive) setData({ items: [], pages: 1 }); });
    return () => { alive = false; };
  }, [filters, tab, page]);

  const num = (v) => (v.order > 0 ? v.order : null);
  // Photo view skips venues without a photo (legacy test rows); Logo view keeps all.
  const items = data ? (view === 'photo' ? data.items.filter(v => v.image_urls?.view) : data.items) : null;

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: 'var(--color-page-bg, #04080C)', fontFamily: GEM_FONT }} data-testid="gem2i-venues">
      <PageHero page="venues" />

      {top.length > 0 && (
        <>
          <PageHead eyebrow={tt({ en: 'Top', es: 'Top' })} title={tt({ en: 'Top venues', es: 'Top venues' })} />
          <div className="max-w-7xl mx-auto px-6 md:px-10 mt-8">
            <div className="grid grid-flow-col auto-cols-[minmax(260px,1fr)] gap-1.5 overflow-x-auto pb-3" data-testid="top-venues">
              {top.map(v => (
                <HoverCard key={v.id} to={`/venues/${v.slug}`} aspect="aspect-[3/4]" img={gemImg(v.image_urls?.view)}
                  top={<NumChip n={num(v)} />} logo={gemImg(v.image_urls?.logo)} title={v.name} meta={meta(v)} />
              ))}
            </div>
          </div>
        </>
      )}

      <PageHead eyebrow={tt({ en: 'Global', es: 'Global' })} title={tt({ en: 'All venues', es: 'Todos los venues' })}>
        <div className="mt-8">
          <Segmented value={view} onChange={setView} label={tt({ en: 'View', es: 'Vista' })} options={[
            { value: 'photo', label: tt({ en: 'Photo view', es: 'Vista de fotos' }) },
            { value: 'logo', label: tt({ en: 'Logo view', es: 'Vista de logos' }) },
          ]} />
        </div>
        <SearchBar values={filters} onSearch={v => { setFilters(v); setPage(1); }} onReset={() => { setFilters(EMPTY); setTab(''); setPage(1); }} fields={[
          { type: 'places', key: 'places', catalog: 'venues' },
          { key: 'position', placeholder: tt({ en: 'by position…', es: 'por posición…' }), inputMode: 'numeric' },
          { key: 'q', placeholder: tt({ en: 'by name…', es: 'por nombre…' }) },
        ]} />
        <ContinentTabs value={tab} onChange={v => { setTab(v); setPage(1); }} />
      </PageHead>

      <section className="max-w-7xl mx-auto px-6 md:px-10">
        {!items ? <SkeletonGrid count={8} aspect="aspect-[4/3]" /> : items.length === 0 ? (
          <EmptyState>{tt({ en: 'No venues match these filters.', es: 'Ningún venue coincide con estos filtros.' })}</EmptyState>
        ) : view === 'photo' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5">
            {items.map(v => (
              <HoverCard key={v.id} to={`/venues/${v.slug}`} testid="venue-card" aspect="aspect-[4/3]" img={gemImg(v.image_urls?.view)}
                top={<NumChip n={num(v)} />} logo={gemImg(v.image_urls?.logo)} title={v.name} meta={meta(v)} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {items.map(v => (
              <Link key={v.id} to={`/venues/${v.slug}`} data-testid="venue-logo-card"
                className="gcard group relative rounded-2xl px-3.5 pt-6 pb-5 text-center transition-colors hover:border-[rgba(90,175,234,.5)]"
                style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
                {num(v) && <span className="absolute left-3 top-2.5 text-[13px] font-extrabold tabular-nums" style={{ color: LINK }}>{num(v)}</span>}
                <span className="glogo mx-auto w-[88px] h-[88px] rounded-full overflow-hidden bg-white flex items-center justify-center p-3">
                  {v.image_urls?.logo ? <img src={gemImg(v.image_urls?.logo)} alt="" loading="lazy" className="max-w-full max-h-full object-contain" />
                    : <span className="text-[#04080C] font-bold text-lg">{(v.name || '?').slice(0, 2).toUpperCase()}</span>}
                </span>
                <span className="mt-3 block text-white text-[15px] font-semibold leading-tight">{v.name}</span>
                {v.country && <span className="block text-[13px] mt-0.5" style={{ color: BODY }}>{v.country}</span>}
              </Link>
            ))}
          </div>
        )}
        {data && data.items.length > 0 && <Paginator page={data.page} pages={data.pages} onPage={setPage} />}
      </section>
      <style>{CARD_CSS + '.gcard.rounded-2xl::before{display:none}'}</style>
    </div>
  );
}
