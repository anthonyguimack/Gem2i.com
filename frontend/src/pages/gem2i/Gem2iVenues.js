import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { gemAPI } from '../../lib/api';
import AccentTitle from '../../components/gem2i/AccentTitle';
import { useT } from '../../lib/i18n';
import { Paginator, SkeletonGrid, EmptyState, gemImg } from '../../components/gem2i/GemCatalogBits';
import {
  PageHero, SearchBar, Segmented, ContinentTabs, continentParams, HoverCard, NumChip, Where,
  place, CARD_CSS, CARD, LINE,
} from '../../components/gem2i/GemCatalogCards';

const GEM_FONT = "'Manrope', sans-serif";
const SERIF = "'Playfair Display', Georgia, serif";
const EMPTY = { country: '',  position: '', q: '', state: '', city: '' };

function useVenueMeta() {
  const tt = useT();
  return (v) => {
    const cap = v.capacity && Number(v.capacity) ? `${tt({ en: 'capacity', es: 'aforo' })} ${Number(v.capacity).toLocaleString()}` : '';
    const kind = [v.type, cap].filter(Boolean).join(' · ');
    return [place(v.city || v.state, v.country) && <Where>{place(v.city || v.state, v.country)}</Where>, kind && <span>{kind}</span>];
  };
}

/** Venues (/venues) — VE-A (2026-10-26, boceto gem2i-venues.html): Top venues as a 1 + 4 mosaic, then all
 *  venues with Photo / Logo (hairline logo wall). Before: VE-1: Top venues strip (CMS "Featured", else first by
 *  listing order) + all venues with Photo/Logo view, legacy search (country,
 *  city, position, name) and continent tabs. Number = CMS listing order. */
export default function Gem2iVenues() {
  const tt = useT();
  const meta = useVenueMeta();
  const [top, setTop] = useState([]);
  const [view, setView] = useState('photo');
  const [filters, setFilters] = useState(EMPTY);
  const [tab, setTab] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [hasHero, setHasHero] = useState(null); // null until PageHero knows

  useEffect(() => { gemAPI.topVenues(8).then(r => setTop(r.data?.items || [])).catch(() => {}); }, []);
  useEffect(() => {
    let alive = true;
    setData(null);
    const params = { page, limit: 24, ...continentParams(tab) };
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    gemAPI.venues(params).then(r => { if (alive) setData(r.data); }).catch(() => { if (alive) setData({ items: [], pages: 1 }); });
    return () => { alive = false; };
  }, [filters, tab, page]);

  const mosaic = top.slice(0, 5);
  const num = (v) => (v.order > 0 ? v.order : null);
  // Photo view skips venues without a photo (legacy test rows); Logo view keeps all.
  const items = data ? (view === 'photo' ? data.items.filter(v => v.image_urls?.view) : data.items) : null;

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: 'var(--color-page-bg, #04080C)', fontFamily: GEM_FONT }} data-testid="gem2i-venues">
      <PageHero page="venues" onShown={setHasHero} />

      {/* VE-A (boceto gem2i-venues.html): Top venues as a 1 + 4 mosaic. Without CMS hero the title is the opener. */}
      {top.length > 0 && (
        <section className={`max-w-7xl mx-auto px-6 md:px-10 ${hasHero === false ? 'pt-14 md:pt-16' : 'pt-16 md:pt-20'}`}>
          <h1 className="text-white font-bold leading-[1.06] pb-1 mb-7" data-testid="venues-title"
            style={{ fontFamily: SERIF, fontSize: hasHero === false ? 'clamp(2.6rem, 5.4vw, 4.4rem)' : 'clamp(2.2rem, 4.4vw, 3.4rem)' }}>
            <AccentTitle text={tt({ en: 'Top venues', es: 'Top venues' })} />
          </h1>
          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${mosaic.length > 1 ? 'lg:grid-cols-[1.4fr_1fr_1fr] lg:grid-rows-[240px_240px]' : ''}`} data-testid="top-venues">
            {mosaic.map((v, i) => (
              <HoverCard key={v.id} to={`/venues/${v.slug}`} img={gemImg(v.image_urls?.view)}
                aspect={i === 0 ? 'aspect-[4/3] lg:aspect-auto' : 'aspect-[4/3] lg:aspect-auto'}
                className={i === 0 && mosaic.length > 1 ? 'sm:col-span-2 lg:col-span-1 lg:row-span-2' : ''}
                logo={gemImg(v.image_urls?.logo)} title={v.name} strip={v.name} meta={meta(v)} cta={tt({ en: 'View venue', es: 'Ver venue' })} />
            ))}
          </div>
        </section>
      )}

      <div className={`max-w-7xl mx-auto px-6 md:px-10 ${top.length > 0 ? 'pt-16' : hasHero === false ? 'pt-14 md:pt-16' : 'pt-16 md:pt-20'}`}>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <h2 className="text-white font-bold leading-[1.1] pb-1" style={{ fontFamily: SERIF, fontSize: 'clamp(1.7rem, 3vw, 2.4rem)' }}>
            <AccentTitle text={tt({ en: 'All venues', es: 'Todos los venues' })} />
          </h2>
          <Segmented value={view} onChange={setView} label={tt({ en: 'View', es: 'Vista' })} options={[
            { value: 'photo', label: tt({ en: 'Photo', es: 'Foto' }) },
            { value: 'logo', label: tt({ en: 'Logo', es: 'Logo' }) },
          ]} />
        </div>
        <SearchBar values={filters} onSearch={v => { setFilters(v); setPage(1); }} onReset={() => { setFilters(EMPTY); setTab(''); setPage(1); }} fields={[
          { key: 'q', placeholder: tt({ en: 'by name…', es: 'por nombre…' }) },
          { type: 'places', key: 'places', catalog: 'venues' },
          { key: 'position', placeholder: tt({ en: 'by position…', es: 'por posición…' }), inputMode: 'numeric' },
        ]} />
        <ContinentTabs value={tab} onChange={v => { setTab(v); setPage(1); }} />
      </div>

      <section className="max-w-7xl mx-auto px-6 md:px-10">
        {!items ? <SkeletonGrid count={8} aspect="aspect-[4/3]" /> : items.length === 0 ? (
          <EmptyState>{tt({ en: 'No venues match these filters.', es: 'Ningún venue coincide con estos filtros.' })}</EmptyState>
        ) : view === 'photo' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {items.map(v => (
              <HoverCard key={v.id} to={`/venues/${v.slug}`} testid="venue-card" aspect="aspect-[4/3]" img={gemImg(v.image_urls?.view)}
                top={<NumChip n={num(v)} />} logo={gemImg(v.image_urls?.logo)} title={v.name} meta={meta(v)} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-px rounded-[4px] overflow-hidden" style={{ backgroundColor: LINE }} data-testid="venue-logo-wall">
            {items.map(v => (
              <Link key={v.id} to={`/venues/${v.slug}`} data-testid="venue-logo-card" title={v.name}
                className="vlogo group relative flex flex-col items-center justify-center gap-3 aspect-square p-5 text-center transition-colors hover:bg-[#0F1C29]"
                style={{ backgroundColor: CARD }}>
                <span className="w-[84px] h-[84px] rounded-full overflow-hidden bg-white flex items-center justify-center p-3">
                  {v.image_urls?.logo ? <img src={gemImg(v.image_urls?.logo)} alt="" loading="lazy" className="max-w-full max-h-full object-contain" />
                    : <span className="text-[#04080C] font-bold text-lg">{(v.name || '?').slice(0, 2).toUpperCase()}</span>}
                </span>
                <span className="text-white text-[14px] font-semibold leading-tight">{v.name}</span>
              </Link>
            ))}
          </div>
        )}
        {data && data.items.length > 0 && <Paginator page={data.page} pages={data.pages} onPage={setPage} />}
      </section>
      <style>{CARD_CSS + '.vlogo img{filter:grayscale(1);opacity:.85;transition:filter .3s,opacity .3s}.vlogo:hover img,.vlogo:focus-visible img{filter:none;opacity:1}@media (prefers-reduced-motion:reduce){.vlogo img{transition:none}}'}</style>
    </div>
  );
}
