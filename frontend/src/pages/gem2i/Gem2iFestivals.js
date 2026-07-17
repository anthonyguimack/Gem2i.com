import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { gemAPI } from '../../lib/api';
import { useT } from '../../lib/i18n';
import {
  CatalogHero, CatalogSearch, Paginator, SkeletonGrid, EmptyState, CardImage, gemImg,
} from '../../components/gem2i/GemCatalogBits';

const GEM_FONT = "'Poppins', sans-serif";

/** Festivals catalog (plan A5) + music conferences strip. */
export default function Gem2iFestivals() {
  const tt = useT();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [conferences, setConferences] = useState([]);

  useEffect(() => {
    gemAPI.conferences({ limit: 12 }).then(r => setConferences(r.data?.items || [])).catch(() => {});
  }, []);

  useEffect(() => { setPage(1); }, [q]);

  useEffect(() => {
    let alive = true;
    setData(null);
    const params = { page, limit: 24 };
    if (q) params.q = q;
    gemAPI.festivals(params).then(r => { if (alive) setData(r.data); }).catch(() => { if (alive) setData({ items: [], pages: 1 }); });
    return () => { alive = false; };
  }, [q, page]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-page-bg, #04080C)', fontFamily: GEM_FONT }} data-testid="gem2i-festivals-page">
      <CatalogHero kicker={tt({ en: 'GLOBAL', es: 'GLOBALES' })} title={tt({ en: 'Festivals', es: 'Festivales' })}>
        <div className="mt-6">
          <CatalogSearch value={q} onChange={setQ} placeholder={tt({ en: 'Search festival', es: 'Buscar festival' })} />
        </div>
      </CatalogHero>

      <section className="max-w-7xl mx-auto px-6 md:px-10 pb-20">
        {!data ? <SkeletonGrid count={12} aspect="aspect-square" /> : data.items.length === 0 ? (
          <EmptyState>{tt({ en: 'No festivals match this search.', es: 'Ningún festival coincide con esta búsqueda.' })}</EmptyState>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {data.items.map(f => (
                <Link key={f.id} to={`/festivals/${f.slug}`} className="group block" data-testid="festival-card">
                  <CardImage src={gemImg(f.image_urls?.flyer) || gemImg(f.image_urls?.logo)} alt={f.title} aspect="aspect-square" />
                  <p className="mt-3 text-white/90 text-sm font-semibold group-hover:text-white transition-colors">{f.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-body-text, #9AA6B2)' }}>
                    {f.range_dates || f.event_date}{f.country ? ` · ${f.country}` : ''}
                  </p>
                </Link>
              ))}
            </div>
            <Paginator page={data.page} pages={data.pages} onPage={setPage} />
          </>
        )}
      </section>

      {conferences.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 md:px-10 pb-24" data-testid="gem2i-conferences-strip">
          <p className="text-xs font-medium uppercase tracking-[0.3em] mb-1.5" style={{ color: 'var(--color-accent, #3287B7)' }}>
            {tt({ en: 'MUSIC', es: 'CONFERENCIAS' })}
          </p>
          <h2 className="text-white font-bold mb-8" style={{ fontSize: 'clamp(1.4rem, 2.6vw, 2rem)' }}>
            {tt({ en: 'Conferences', es: 'de Música' })}
          </h2>
          <div className="flex gap-8 overflow-x-auto pb-4">
            {conferences.map(c => (
              <Link key={c.id} to={`/conferences/${c.slug}`} className="shrink-0 w-48 group">
                <CardImage src={gemImg(c.image_urls?.logo) || gemImg(c.image_urls?.flyer)} alt={c.title}
                  aspect="aspect-square" fit="object-contain p-4" />
                <p className="mt-3 text-white/85 text-sm font-medium group-hover:text-white transition-colors">{c.title}</p>
                {(c.range_dates || c.event_date) && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-body-text, #9AA6B2)' }}>{c.range_dates || c.event_date}</p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
