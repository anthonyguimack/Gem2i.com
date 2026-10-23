/* Norules (`gem2i`) — own copy of this inner page (template = package, D-GEM-2026-15). */
import React, { useEffect, useState } from 'react';
import { gemAPI } from '../../../lib/api';
import { useT } from '../../../lib/i18n';
import { Paginator, SkeletonGrid, EmptyState, gemImg } from '../../../components/gem2i/GemCatalogBits';
import {
  PageHero, PageHead, SearchBar, Segmented, ContinentTabs, continentParams, HoverCard, NumChip, Where,
  place, usePageTone, CARD_CSS, LINE,
} from '../../../components/gem2i/norules/GemCatalogCards';

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

// Logo view (V1): big logo at rest; on hover the venue photo shows behind, the same veil wipes in,
// the logo moves up and shrinks to make room for the info.
const LOGO_CSS = `
.vlogo{background:var(--color-card-bg,#0D1721)!important;border:1px solid ${LINE}}
.vlogo .gph{opacity:0;transition:opacity .5s,transform .7s ease-out}
.vlogo:hover .gph,.vlogo:focus-visible .gph{opacity:1}
.vlogo .glogo{right:auto!important;left:50%;top:44%!important;width:44%!important;height:auto!important;aspect-ratio:1;transform:translate(-50%,-50%);transition:transform .8s cubic-bezier(.19,1,.22,1)}
.vlogo:hover .glogo,.vlogo:focus-visible .glogo{transform:translate(-50%,-50%) translateY(-55%) scale(.55)}
.vlogo .gstrip{background:none!important;color:var(--gem-ink,#fff)!important;text-align:center}
@media (hover:none){.vlogo .gph{opacity:1}}
`;

/** Venues (/venues) — V1 (boceto norules-venues-page.html): Top venues as a grid (no horizontal
 *  scroll; CMS "Featured", else first by listing order) + all venues with Photo/Logo view, legacy
 *  search (country, state, city, position, name) and continent tabs. Number = CMS listing order. */
export default function NorulesVenues() {
  const tt = useT();
  const meta = useVenueMeta();
  const [top, setTop] = useState([]);
  const [view, setView] = useState('photo');
  const [filters, setFilters] = useState(EMPTY);
  const [tab, setTab] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const tone = usePageTone();

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
    <div className={`min-h-screen pb-24 ${tone.className}`} style={{ backgroundColor: 'var(--color-page-bg, #04080C)', fontFamily: GEM_FONT, ...tone.style }} data-testid="gem2i-venues">
      <PageHero page="venues" />

      {top.length > 0 && (
        <>
          <PageHead eyebrow={tt({ en: 'Top', es: 'Top' })} title={tt({ en: 'Top venues', es: 'Top venues' })} />
          <div className="max-w-7xl mx-auto px-6 md:px-10 mt-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3" data-testid="top-venues">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {items.map(v => (
              <HoverCard key={v.id} to={`/venues/${v.slug}`} testid="venue-card" aspect="aspect-[4/3]" img={gemImg(v.image_urls?.view)}
                top={<NumChip n={num(v)} />} logo={gemImg(v.image_urls?.logo)} title={v.name} meta={meta(v)} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {items.map(v => (
              <HoverCard key={v.id} to={`/venues/${v.slug}`} testid="venue-logo-card" aspect="aspect-[4/3]" className="vlogo"
                img={gemImg(v.image_urls?.view)} top={<NumChip n={num(v)} />} logo={gemImg(v.image_urls?.logo)}
                title={v.name} strip={v.name} meta={meta(v)} />
            ))}
          </div>
        )}
        {data && data.items.length > 0 && <Paginator page={data.page} pages={data.pages} onPage={setPage} />}
      </section>
      <style>{CARD_CSS + LOGO_CSS}</style>
    </div>
  );
}
