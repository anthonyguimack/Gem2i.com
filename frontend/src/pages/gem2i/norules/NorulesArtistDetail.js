/* Norules (`gem2i`) — own copy of this inner page (template = package, D-GEM-2026-15). */
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin } from 'lucide-react';
import { gemAPI } from '../../../lib/api';
import { useT } from '../../../lib/i18n';
import { gemImg, FollowButton, SkeletonGrid } from '../../../components/gem2i/GemCatalogBits';
import { place } from '../../../components/gem2i/norules/GemCatalogCards';
import { NBtn } from '../../../components/gem2i/norules/NBtn';
import {
  DetailShell, Crumb, Section, TextAndVideo, PhotoHero, HeroChip, EventPosterCard, ArtistHoverCard, GEM_FONT,
} from '../../../components/gem2i/norules/NorulesDetailBits';

/** Artist detail — boceto norules-detail-pages.html (Artist): B/W hero with the giant name, place,
 *  genres and ranking positions; bio + video; upcoming events (E1, from the line-ups); similar artists (A1). */
export default function NorulesArtistDetail() {
  const { slug } = useParams();
  const tt = useT();
  const [artist, setArtist] = useState(null);
  const [missing, setMissing] = useState(false);
  const [similar, setSimilar] = useState([]);

  useEffect(() => {
    let alive = true;
    setArtist(null); setMissing(false); setSimilar([]);
    gemAPI.artistDetail(slug)
      .then(r => {
        if (!alive) return;
        setArtist(r.data);
        const genre = r.data?.genres?.[0];
        if (genre) gemAPI.artists({ genre, limit: 9 }).then(s => { if (alive) setSimilar((s.data?.items || []).filter(a => a.slug !== slug).slice(0, 4)); }).catch(() => {});
      })
      .catch(() => { if (alive) setMissing(true); });
    return () => { alive = false; };
  }, [slug]);

  if (missing) {
    return (
      <NotFoundShell backTo="/artists" backLabel={tt({ en: 'Back to Artists', es: 'Volver a Artistas' })}>
        {tt({ en: 'Artist not found.', es: 'Artista no encontrado.' })}
      </NotFoundShell>
    );
  }
  if (!artist) {
    return <DetailShell><div className="py-24"><SkeletonGrid count={4} /></div></DetailShell>;
  }

  const ranks = [
    ['GEM2i', artist.rosters?.gem_rank], ['DJ Mag', artist.rosters?.djmag_rank], ['RA', artist.rosters?.resident_rank],
  ].filter(([, n]) => n != null);
  const where = place(artist.city || artist.state, artist.country);
  const listen = artist.socials?.soundcloud || artist.socials?.spotify || artist.socials?.youtube;

  return (
    <DetailShell testid="gem2i-artist-detail">
      <Crumb items={[[tt({ en: 'Artists', es: 'Artistas' }), '/artists'], [artist.name]]} />

      <PhotoHero img={gemImg(artist.image_urls?.big) || gemImg(artist.image_urls?.detail)} grayscale side>
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] items-end">
          <div>
            <HeroChip icon={MapPin}>{where}</HeroChip>
            {(artist.genres || []).slice(0, 4).map(g => <HeroChip key={g}>{g}</HeroChip>)}
            <h1 className="mt-3 mb-5 font-extrabold leading-[.85] tracking-[-0.06em] text-white break-words" style={{ fontSize: 'clamp(3.2rem, 10vw, 8.5rem)' }}>{artist.name}</h1>
            {artist.full_name && artist.full_name !== artist.name && <p className="-mt-2 mb-5 text-white/75">{artist.full_name}</p>}
            <div className="flex flex-wrap gap-3">
              <FollowButton kind="artist" targetId={artist.id} className="nb-follow nb-follow-g" />
              {listen && (
                <NBtn href={listen} variant="g" icon="ext">{tt({ en: 'Listen', es: 'Escuchar' })}</NBtn>
              )}
            </div>
          </div>
          {ranks.length > 0 && (
            <div className="flex gap-2.5" data-testid="artist-ranks">
              {ranks.map(([l, n]) => (
                <span key={l} className="min-w-[92px] rounded-2xl px-4 py-3 text-center backdrop-blur-md" style={{ backgroundColor: 'rgba(255,255,255,.12)' }}>
                  <b className="block text-[30px] font-extrabold leading-none">#{n}</b>
                  <small className="text-[10.5px] font-extrabold tracking-[0.16em] opacity-75 uppercase">{l}</small>
                </span>
              ))}
            </div>
          )}
        </div>
      </PhotoHero>

      <div className="mt-6">
        <TextAndVideo title={tt({ en: 'The artist', es: 'El artista' })} html={artist.bio || artist.summary} lead={artist.bio ? artist.summary : ''} video={artist.video} socials={artist.socials} />
      </div>

      {artist.upcoming_events?.length > 0 && (
        <Section title={tt({ en: 'Upcoming events', es: 'Próximos eventos' })} testid="artist-upcoming-events">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">{artist.upcoming_events.map(e => <EventPosterCard key={e.id} e={e} />)}</div>
        </Section>
      )}

      {similar.length > 0 && (
        <Section title={tt({ en: 'Similar artists', es: 'Artistas similares' })}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">{similar.map(a => <ArtistHoverCard key={a.id} a={a} />)}</div>
        </Section>
      )}
    </DetailShell>
  );
}

export function NotFoundShell({ children, backTo, backLabel }) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-page-bg, #04080C)', fontFamily: GEM_FONT }}>
      <div className="text-center px-6">
        <p className="text-lg mb-5" style={{ color: 'var(--gem-ink, rgba(255,255,255,.85))' }}>{children}</p>
        <Link to={backTo} className="nl inline-flex items-center gap-1.5 text-sm">
          <ArrowLeft className="w-4 h-4" /> {backLabel}
        </Link>
      </div>
    </div>
  );
}
