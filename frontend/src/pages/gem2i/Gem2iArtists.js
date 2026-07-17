import React, { useEffect, useState } from 'react';
import { gemAPI } from '../../lib/api';
import { useT } from '../../lib/i18n';
import {
  CatalogHero, FilterPills, CatalogSearch, Paginator, SkeletonGrid,
  EmptyState, ArtistCard,
} from '../../components/gem2i/GemCatalogBits';

const GEM_FONT = "'Poppins', sans-serif";

/** Artists catalog (plan A6): three rosters (GEM / DJ Mag Top 100 / Residents)
 *  + continent / genre / name filters. Roster tabs sort by that roster's rank. */
export default function Gem2iArtists() {
  const tt = useT();
  const [roster, setRoster] = useState('gem');
  const [continent, setContinent] = useState('');
  const [genre, setGenre] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [continents, setContinents] = useState([]);
  const [genres, setGenres] = useState([]);

  useEffect(() => {
    gemAPI.continents().then(r => setContinents(r.data?.items || [])).catch(() => {});
    gemAPI.genres().then(r => setGenres(r.data?.items || [])).catch(() => {});
  }, []);

  useEffect(() => { setPage(1); }, [roster, continent, genre, q]);

  useEffect(() => {
    let alive = true;
    setData(null);
    const params = { page, limit: 24 };
    if (roster) params.roster = roster;
    if (continent) params.continent = continent;
    if (genre) params.genre = genre;
    if (q) params.q = q;
    gemAPI.artists(params).then(r => { if (alive) setData(r.data); }).catch(() => { if (alive) setData({ items: [], pages: 1 }); });
    return () => { alive = false; };
  }, [roster, continent, genre, q, page]);

  const ROSTERS = [
    { value: 'gem', label: tt({ en: 'GEM Roster', es: 'Roster GEM' }) },
    { value: 'djmag', label: tt({ en: 'DJ Mag Top 100', es: 'DJ Mag Top 100' }) },
    { value: 'resident', label: tt({ en: 'Residents', es: 'Residentes' }) },
    { value: '', label: tt({ en: 'All Artists', es: 'Todos' }) },
  ];
  const rankOf = (a) => (roster ? a.rosters?.[`${roster}_rank`] : null);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-page-bg, #04080C)', fontFamily: GEM_FONT }} data-testid="gem2i-artists">
      <CatalogHero kicker={tt({ en: 'CATALOG', es: 'CATÁLOGO' })} title={tt({ en: 'Artists', es: 'Artistas' })}>
        <div className="mt-6 flex flex-col gap-4">
          <FilterPills options={ROSTERS} value={roster} onChange={setRoster} />
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <FilterPills options={continents.map(c => ({ value: c, label: c }))} value={continent}
              onChange={setContinent} allLabel={tt({ en: 'All Continents', es: 'Todos los Continentes' })} />
          </div>
          <div className="flex flex-col md:flex-row gap-3">
            <CatalogSearch value={q} onChange={setQ} placeholder={tt({ en: 'Search artist name', es: 'Buscar artista' })} />
            <select value={genre} onChange={(e) => setGenre(e.target.value)}
              className="w-full md:w-56 px-3 py-2 text-sm rounded-sm border bg-transparent text-white focus:outline-none"
              style={{ borderColor: 'var(--color-card-border, rgba(255,255,255,0.08))', backgroundColor: 'var(--color-page-bg, #04080C)' }}>
              <option value="">{tt({ en: 'All Genres', es: 'Todos los Géneros' })}</option>
              {genres.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>
      </CatalogHero>

      <section className="max-w-7xl mx-auto px-6 md:px-10 pb-24">
        {!data ? <SkeletonGrid count={12} /> : data.items.length === 0 ? (
          <EmptyState>{tt({ en: 'No artists match these filters.', es: 'Ningún artista coincide con estos filtros.' })}</EmptyState>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {data.items.map(a => <ArtistCard key={a.id} artist={a} rank={rankOf(a)} />)}
            </div>
            <Paginator page={data.page} pages={data.pages} onPage={setPage} />
          </>
        )}
      </section>
    </div>
  );
}
