import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { gemAPI } from '../../lib/api';
import { useT } from '../../lib/i18n';
import {
  CatalogHero, FilterPills, CatalogSearch, Paginator, SkeletonGrid,
  EmptyState, CardImage, gemImg,
} from '../../components/gem2i/GemCatalogBits';

const GEM_FONT = "'Poppins', sans-serif";

/** Venues catalog (plan A7): continent tabs + name search + logo wall grid. */
export default function Gem2iVenues() {
  const tt = useT();
  const [continent, setContinent] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [continents, setContinents] = useState([]);

  useEffect(() => {
    gemAPI.continents().then(r => setContinents(r.data?.items || [])).catch(() => {});
  }, []);

  useEffect(() => { setPage(1); }, [continent, q]);

  useEffect(() => {
    let alive = true;
    setData(null);
    const params = { page, limit: 24 };
    if (continent) params.continent = continent;
    if (q) params.q = q;
    gemAPI.venues(params).then(r => { if (alive) setData(r.data); }).catch(() => { if (alive) setData({ items: [], pages: 1 }); });
    return () => { alive = false; };
  }, [continent, q, page]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-page-bg, #04080C)', fontFamily: GEM_FONT }} data-testid="gem2i-venues">
      <CatalogHero kicker={tt({ en: 'CATALOG', es: 'CATÁLOGO' })} title={tt({ en: 'Venues', es: 'Venues' })}>
        <div className="mt-6 flex flex-col gap-4">
          <FilterPills options={continents.map(c => ({ value: c, label: c }))} value={continent}
            onChange={setContinent} allLabel={tt({ en: 'All Continents', es: 'Todos los Continentes' })} />
          <CatalogSearch value={q} onChange={setQ} placeholder={tt({ en: 'Search venue name', es: 'Buscar venue' })} />
        </div>
      </CatalogHero>

      <section className="max-w-7xl mx-auto px-6 md:px-10 pb-24">
        {!data ? <SkeletonGrid count={12} aspect="aspect-square" /> : data.items.length === 0 ? (
          <EmptyState>{tt({ en: 'No venues match these filters.', es: 'Ningún venue coincide con estos filtros.' })}</EmptyState>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {data.items.map(v => (
                <Link key={v.id} to={`/venues/${v.slug}`} className="group block" data-testid="venue-card">
                  <CardImage src={gemImg(v.image_urls?.logo) || gemImg(v.image_urls?.view)} alt={v.name}
                    aspect="aspect-square" fit="object-contain p-6" />
                  <p className="mt-3 text-white/90 text-sm font-semibold group-hover:text-white transition-colors">{v.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-body-text, #9AA6B2)' }}>
                    {[v.city, v.country].filter(Boolean).join(', ')}
                  </p>
                </Link>
              ))}
            </div>
            <Paginator page={data.page} pages={data.pages} onPage={setPage} />
          </>
        )}
      </section>
    </div>
  );
}
