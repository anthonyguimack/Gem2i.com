/* Norules (`gem2i`) — own copy of this inner page (template = package, D-GEM-2026-15). */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { gemAPI } from '../../../lib/api';
import { useT } from '../../../lib/i18n';
import { Paginator, SkeletonGrid, EmptyState, gemImg } from '../../../components/gem2i/GemCatalogBits';
import {
  PageHero, PageHead, SearchBar, Segmented, ContinentTabs, continentParams, HoverCard, NumChip, Where,
  place, CARD_CSS, LINK, BODY, CARD, LINE,
} from '../../../components/gem2i/norules/GemCatalogCards';

const GEM_FONT = "'Manrope', sans-serif";
const EMPTY = { q: '', country: '', genre: '', position: '', state: '', city: '' };
const ROSTERS = [['gem', 'Gem2i'], ['djmag', 'DJ Mag'], ['resident', 'Resident Advisor']];

/** Left column: the three legacy rankings (top 10 each). */
function Ranking({ roster, setRoster, onHover }) {
  const tt = useT();
  const [lists, setLists] = useState({});
  useEffect(() => {
    ROSTERS.forEach(([k]) => gemAPI.artists({ roster: k, limit: 10 })
      .then(r => setLists(p => ({ ...p, [k]: r.data?.items || [] }))).catch(() => {}));
  }, []);
  const list = lists[roster];
  return (
    <aside className="rounded-2xl overflow-hidden lg:sticky lg:top-28" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }} data-testid="artist-ranking">
      <div className="flex" role="tablist" style={{ borderBottom: `1px solid ${LINE}` }}>
        {ROSTERS.map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={roster === k} onClick={() => setRoster(k)}
            className="flex-1 px-2 py-3.5 text-[14px] transition-colors border-b-2"
            style={roster === k ? { color: '#fff', fontWeight: 700, borderColor: 'var(--color-link,#5AAFEA)' } : { color: BODY, borderColor: 'transparent' }}>
            {l}
          </button>
        ))}
      </div>
      <div className="px-5 pt-5 pb-1 text-center">
        <p className="text-white font-bold text-[26px]" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
          Global <em className="font-medium" style={{ color: LINK }}>DJ's</em>
        </p>
        <p className="text-[13px] mt-1" style={{ color: BODY }}>{tt({ en: 'Our latest ranking', es: 'Nuestro último ranking' })}</p>
      </div>
      <ol className="py-2">
        {!list ? Array.from({ length: 10 }).map((_, i) => <li key={i} className="mx-5 my-3 h-9 rounded animate-pulse" style={{ backgroundColor: '#0A121A' }} />)
          : list.map((a, i) => (
            <li key={a.id}>
              <Link to={`/artists/${a.slug}`} onMouseEnter={() => onHover(a.id)} onMouseLeave={() => onHover(null)} onFocus={() => onHover(a.id)} onBlur={() => onHover(null)}
                className="group grid grid-cols-[34px_44px_1fr_auto] gap-3 items-center px-5 py-2 transition-colors hover:bg-[rgba(90,175,234,.08)]">
                <span className="font-extrabold text-[18px] tabular-nums" style={{ color: LINK }}>{a.rosters?.[`${roster}_rank`] ?? i + 1}</span>
                <span className="w-11 h-11 rounded-full overflow-hidden" style={{ backgroundColor: '#0A121A' }}>
                  {(a.image_urls?.small || a.image_urls?.big) && <img src={gemImg(a.image_urls?.small) || gemImg(a.image_urls?.big)} alt="" loading="lazy" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-[filter] duration-300" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-white text-[15px] truncate">{a.name}</span>
                  {a.country && <span className="block text-[12px] truncate" style={{ color: BODY }}>{a.country}</span>}
                </span>
                <ArrowRight className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" style={{ color: LINK }} aria-hidden="true" />
              </Link>
            </li>
          ))}
      </ol>
      <p className="px-5 py-3.5 text-center text-[13px]" style={{ color: BODY, borderTop: `1px solid ${LINE}` }}>
        {tt({ en: 'Information updated as of', es: 'Información actualizada a' })} {new Date().getFullYear()}
      </p>
    </aside>
  );
}

/** Artists (/artists) — AR-1: ranking column left (Gem2i / DJ Mag / Resident
 *  Advisor), search (name, country, music genre, position) + continent tabs +
 *  hover cards right. The card number and the position filter follow the
 *  selected ranking; "All artists" lists everyone A–Z. */
export default function NorulesArtists() {
  const tt = useT();
  const [roster, setRoster] = useState('gem');
  const [scope, setScope] = useState('ranked');
  const [filters, setFilters] = useState(EMPTY);
  const [tab, setTab] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [hot, setHot] = useState(null);

  useEffect(() => {
    let alive = true;
    setData(null);
    const params = { page, limit: 24, ...continentParams(tab) };
    if (scope === 'ranked' || filters.position) params.roster = roster;
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    gemAPI.artists(params).then(r => { if (alive) setData(r.data); }).catch(() => { if (alive) setData({ items: [], pages: 1 }); });
    return () => { alive = false; };
  }, [roster, scope, filters, tab, page]);

  const rankOf = (a) => a.rosters?.[`${roster}_rank`];

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: 'var(--color-page-bg, #04080C)', fontFamily: GEM_FONT }} data-testid="gem2i-artists">
      <PageHero page="artists" />
      <PageHead eyebrow={tt({ en: 'All', es: 'Todos' })} title={tt({ en: 'Our artists', es: 'Nuestros artistas' })} />
      <div className="max-w-7xl mx-auto px-6 md:px-10 mt-10 grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-7 items-start">
        <Ranking roster={roster} setRoster={r => { setRoster(r); setPage(1); }} onHover={setHot} />
        <div>
          <Segmented value={scope} onChange={v => { setScope(v); setPage(1); }} label={tt({ en: 'Artists shown', es: 'Artistas' })} options={[
            { value: 'ranked', label: tt({ en: 'Ranking', es: 'Ranking' }) },
            { value: 'all', label: tt({ en: 'All artists', es: 'Todos los artistas' }) },
          ]} />
            <SearchBar values={filters} onSearch={v => { setFilters(v); setPage(1); }} onReset={() => { setFilters(EMPTY); setTab(''); setPage(1); }} fields={[
              { key: 'q', placeholder: tt({ en: 'by name…', es: 'por nombre…' }) },
              { type: 'places', key: 'places', catalog: 'artists' },
              { key: 'genre', placeholder: tt({ en: 'by music genre…', es: 'por género musical…' }) },
              { key: 'position', placeholder: tt({ en: 'by position…', es: 'por posición…' }), inputMode: 'numeric' },
            ]} />
          <ContinentTabs value={tab} onChange={v => { setTab(v); setPage(1); }} />
          {!data ? <SkeletonGrid count={9} aspect="aspect-square" /> : data.items.length === 0 ? (
            <EmptyState>{tt({ en: 'No artists match these filters.', es: 'Ningún artista coincide con estos filtros.' })}</EmptyState>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-1.5">
                {data.items.map(a => (
                  <HoverCard key={a.id} to={`/artists/${a.slug}`} testid="artist-card" aspect="aspect-square"
                    className={hot === a.id ? 'ring-[3px] ring-[var(--color-link,#5AAFEA)]' : ''}
                    img={gemImg(a.image_urls?.big) || gemImg(a.image_urls?.small)} imgStyle={{ filter: 'grayscale(1)' }}
                    top={<NumChip n={rankOf(a)} />} logo={gemImg(a.image_urls?.logo)} title={a.name}
                    meta={[place(a.state || a.city, a.country) && <Where>{place(a.state || a.city, a.country)}</Where>]}
                    extra={a.genres?.length > 0 && (
                      <span className="mt-2 flex flex-wrap gap-1.5">
                        {a.genres.slice(0, 3).map(g => <span key={g} className="text-[12px] px-2.5 py-0.5 rounded-full bg-white/[0.12] text-white">{g}</span>)}
                      </span>
                    )} />
                ))}
              </div>
              <Paginator page={data.page} pages={data.pages} onPage={setPage} />
            </>
          )}
        </div>
      </div>
      <style>{CARD_CSS}</style>
    </div>
  );
}
