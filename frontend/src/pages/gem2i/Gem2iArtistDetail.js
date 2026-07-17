import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { gemAPI } from '../../lib/api';
import { useT } from '../../lib/i18n';
import { normalizeRichText } from '../../lib/richText';
import { gemImg, CardImage, FollowButton, SocialLinks, SkeletonGrid } from '../../components/gem2i/GemCatalogBits';

const GEM_FONT = "'Poppins', sans-serif";

export default function Gem2iArtistDetail() {
  const { slug } = useParams();
  const tt = useT();
  const [artist, setArtist] = useState(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let alive = true;
    setArtist(null); setMissing(false);
    gemAPI.artistDetail(slug)
      .then(r => { if (alive) setArtist(r.data); })
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
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-page-bg, #04080C)' }}>
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-24"><SkeletonGrid count={4} /></div>
      </div>
    );
  }

  const rankBadges = [
    artist.rosters?.gem_rank != null && { label: 'GEM', rank: artist.rosters.gem_rank },
    artist.rosters?.djmag_rank != null && { label: 'DJ MAG', rank: artist.rosters.djmag_rank },
    artist.rosters?.resident_rank != null && { label: tt({ en: 'RESIDENT', es: 'RESIDENTE' }), rank: artist.rosters.resident_rank },
  ].filter(Boolean);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-page-bg, #04080C)', fontFamily: GEM_FONT }} data-testid="gem2i-artist-detail">
      <div className="max-w-7xl mx-auto px-6 md:px-10 pt-10 pb-24">
        <Link to="/artists" className="inline-flex items-center gap-1.5 text-sm transition-colors hover:text-white"
          style={{ color: 'var(--color-link, #5FB2E0)' }}>
          <ArrowLeft className="w-4 h-4" /> {tt({ en: 'Artists', es: 'Artistas' })}
        </Link>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-[minmax(0,380px)_1fr] gap-10 lg:gap-14">
          <div className="group">
            <CardImage src={gemImg(artist.image_urls?.big) || gemImg(artist.image_urls?.detail)} alt={artist.name} aspect="aspect-[3/4]" />
          </div>

          <div>
            <h1 className="text-white font-bold leading-tight" style={{ fontSize: 'clamp(1.9rem, 4vw, 3rem)' }}>{artist.name}</h1>
            {artist.full_name && artist.full_name !== artist.name && (
              <p className="mt-1 text-sm" style={{ color: 'var(--color-body-text, #9AA6B2)' }}>{artist.full_name}</p>
            )}
            <p className="mt-2 text-sm" style={{ color: 'var(--color-body-text, #9AA6B2)' }}>
              {[artist.city, artist.country].filter(Boolean).join(', ')}
            </p>

            {rankBadges.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {rankBadges.map((b, i) => (
                  <span key={i} className="px-2.5 py-1 text-xs font-semibold rounded-sm tabular-nums"
                    style={{ backgroundColor: 'rgba(50,135,183,0.18)', color: 'var(--color-link, #5FB2E0)' }}>
                    {b.label} #{b.rank}
                  </span>
                ))}
              </div>
            )}

            {Array.isArray(artist.genres) && artist.genres.length > 0 && (
              <p className="mt-4 text-[13px]" style={{ color: 'var(--color-body-text, #9AA6B2)' }}>
                {artist.genres.join(' / ')}
              </p>
            )}

            <div className="mt-7"><FollowButton kind="artist" targetId={artist.id} /></div>

            {artist.bio && (
              <div className="mt-10 prose-invert max-w-none text-[15px] leading-[1.9]"
                style={{ color: 'var(--color-body-text, #9AA6B2)' }}
                dangerouslySetInnerHTML={{ __html: normalizeRichText(artist.bio) }} />
            )}

            <div className="mt-10"><SocialLinks socials={artist.socials} /></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function NotFoundShell({ children, backTo, backLabel }) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-page-bg, #04080C)', fontFamily: GEM_FONT }}>
      <div className="text-center px-6">
        <p className="text-white/85 text-lg mb-5">{children}</p>
        <Link to={backTo} className="inline-flex items-center gap-1.5 text-sm transition-colors hover:text-white"
          style={{ color: 'var(--color-link, #5FB2E0)' }}>
          <ArrowLeft className="w-4 h-4" /> {backLabel}
        </Link>
      </div>
    </div>
  );
}
