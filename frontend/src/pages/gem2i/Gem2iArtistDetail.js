import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Play } from 'lucide-react';
import { gemAPI } from '../../lib/api';
import { useT, useLang } from '../../lib/i18n';
import { normalizeRichText } from '../../lib/richText';
import { gemImg, FollowButton, SocialLinks, SkeletonGrid } from '../../components/gem2i/GemCatalogBits';

const GEM_FONT = "'Manrope', sans-serif";
const SERIF = "'Playfair Display', Georgia, serif";
const BODY = 'var(--color-body-text, #9AA6B2)';
const LINK = 'var(--color-link, #5AAFEA)';
const ytId = (v) => (String(v || '').match(/(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([\w-]{11})/) || [])[1];

/** Artist detail — AD-B (2026-10-26, boceto gem2i-artist-detail.html): giant name over the B/W photo, rankings +
 *  socials + Follow strip, bio next to the video (cover that opens YouTube), upcoming nights. "Similar artists"
 *  from the boceto waits for the API (it does not return them yet). */

export default function Gem2iArtistDetail() {
  const { slug } = useParams();
  const tt = useT();
  const { lang } = useLang() || { lang: 'en' };
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

  const ranks = [
    artist.rosters?.gem_rank != null && { label: 'Gem2i', rank: artist.rosters.gem_rank, main: true },
    artist.rosters?.djmag_rank != null && { label: 'DJ Mag', rank: artist.rosters.djmag_rank },
    artist.rosters?.resident_rank != null && { label: 'Resident Advisor', rank: artist.rosters.resident_rank },
  ].filter(Boolean);
  const photo = gemImg(artist.image_urls?.big) || gemImg(artist.image_urls?.detail) || gemImg(artist.image_urls?.small);
  const chips = [...(artist.genres || []), [artist.city, artist.country].filter(Boolean).join(', ')].filter(Boolean);
  const video = ytId(artist.video);
  const nights = (artist.upcoming_events || []).slice(0, 6);

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: 'var(--color-page-bg, #04080C)', fontFamily: GEM_FONT }} data-testid="gem2i-artist-detail">
      {/* AD-B (boceto gem2i-artist-detail.html): the name across the black-and-white photo, like a poster.
          No CMS hero: detail pages are not in Hero → Page Assignment. */}
      <section className="relative h-[460px] md:h-[560px] overflow-hidden" style={{ backgroundColor: '#0A121A' }} data-testid="artist-hero">
        {photo && <img src={photo} alt="" className="absolute inset-0 w-full h-full object-cover object-[center_25%] grayscale brightness-[.62]" />}
        <span aria-hidden="true" className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(4,8,12,.2) 30%, rgba(4,8,12,.97) 100%)' }} />
        <div className="relative h-full max-w-7xl mx-auto px-6 md:px-10 pt-8 pb-8 flex flex-col">
          <p className="text-sm text-white/80">
            <Link to="/artists" className="inline-flex items-center gap-1.5 hover:text-white"><ArrowLeft className="w-4 h-4" /> {tt({ en: 'Artists', es: 'Artistas' })}</Link>
            <span className="text-white/50"> / {artist.name}</span>
          </p>
          <div className="mt-auto">
            {chips.length > 0 && (
              <p className="mb-3 flex flex-wrap gap-2">
                {chips.map(c => <span key={c} className="rounded-[4px] px-2.5 py-1 text-[12.5px] font-semibold text-white" style={{ border: '1px solid rgba(255,255,255,.3)' }}>{c}</span>)}
              </p>
            )}
            <h1 className="text-white font-bold leading-[0.95] pb-2 break-words" style={{ fontFamily: SERIF, fontSize: 'clamp(3.2rem, 10.5vw, 9rem)' }}>{artist.name}</h1>
            {artist.full_name && artist.full_name !== artist.name && <p className="text-[15px] text-white/70">{artist.full_name}</p>}
          </div>
        </div>
      </section>

      <div className="border-b" style={{ borderColor: 'var(--color-card-border, rgba(255,255,255,0.09))' }}>
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-4 flex flex-wrap items-center justify-between gap-4">
          {ranks.length > 0 ? (
            <p className="flex flex-wrap gap-x-7 gap-y-1 text-[15px]" style={{ color: BODY }} data-testid="artist-ranks">
              {ranks.map(r => <span key={r.label}><b className="tabular-nums text-[18px]" style={{ color: r.main ? LINK : '#fff' }}>#{r.rank}</b> {r.label}</span>)}
            </p>
          ) : <span />}
          <div className="flex flex-wrap items-center gap-3">
            <SocialLinks socials={artist.socials} />
            <FollowButton kind="artist" targetId={artist.id} />
          </div>
        </div>
      </div>

      {(artist.bio || video) && (
        <section className={`max-w-7xl mx-auto px-6 md:px-10 mt-14 grid gap-10 lg:gap-12 items-start ${artist.bio && video ? 'lg:grid-cols-2' : ''}`}>
          {artist.bio && (
            <div className="max-w-[62ch] text-[17px] md:text-[18px] leading-[1.8] text-white/90 [&_p]:mb-4"
              dangerouslySetInnerHTML={{ __html: normalizeRichText(artist.bio) }} />
          )}
          {video && (
            // Cover + link: many legacy videos block embedding (rights owner), so we open YouTube.
            <a href={`https://www.youtube.com/watch?v=${video}`} target="_blank" rel="noreferrer" data-testid="artist-video"
              className="group relative block aspect-video rounded-[4px] overflow-hidden" style={{ backgroundColor: '#0A121A' }}>
              <img src={`https://img.youtube.com/vi/${video}/hqdefault.jpg`} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-70 transition-transform duration-700 group-hover:scale-[1.04]" />
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="w-16 h-16 rounded-full bg-white flex items-center justify-center"><Play className="w-6 h-6 text-[#04080C] ml-0.5" aria-hidden="true" /></span>
              </span>
              <span className="absolute left-4 bottom-3 text-[13px] font-semibold text-white">{tt({ en: 'Watch on YouTube', es: 'Ver en YouTube' })} ↗</span>
            </a>
          )}
        </section>
      )}

      {nights.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 md:px-10 mt-16" data-testid="artist-nights">
          <h2 className="text-white font-bold mb-5 leading-[1.1] pb-1" style={{ fontFamily: SERIF, fontSize: 'clamp(1.5rem, 2.4vw, 1.9rem)' }}>
            {tt({ en: 'Upcoming', es: 'Próximas' })} <em className="font-semibold" style={{ color: LINK }}>{tt({ en: 'nights', es: 'noches' })}</em>
          </h2>
          <div className="border-t" style={{ borderColor: 'var(--color-card-border, rgba(255,255,255,0.09))' }}>
            {nights.map(e => {
              const d = e.event_date ? new Date(`${e.event_date}T12:00:00`) : null;
              const img = gemImg(e.image_urls?.flyer) || gemImg(e.image_urls?.logo);
              const where = [e.venue?.name, e.venue?.city || e.venue?.country].filter(Boolean).join(', ');
              return (
                <Link key={e.id || e.slug} to={`/events/${e.slug}`} className="group grid grid-cols-[64px_1fr_auto] md:grid-cols-[80px_72px_1fr_auto] gap-4 md:gap-5 items-center py-4 border-b transition-colors hover:bg-white/[0.03]"
                  style={{ borderColor: 'var(--color-card-border, rgba(255,255,255,0.09))' }}>
                  <span><b className="block text-white leading-none tabular-nums" style={{ fontFamily: SERIF, fontSize: 30 }}>{d ? String(d.getDate()).padStart(2, '0') : ''}</b>
                    <small className="text-[12px] uppercase" style={{ color: BODY }}>{d ? d.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB', { month: 'short', year: 'numeric' }) : ''}</small></span>
                  <span className="hidden md:block w-[72px] h-[72px] rounded-[4px] overflow-hidden" style={{ backgroundColor: '#0A121A' }}>{img && <img src={img} alt="" loading="lazy" className="w-full h-full object-cover" />}</span>
                  <span className="min-w-0"><span className="block text-white text-[18px] font-semibold leading-tight">{e.title}</span>{where && <small className="text-[13.5px]" style={{ color: BODY }}>{where}</small>}</span>
                  <span className="rounded-[4px] px-4 py-2.5 text-[13.5px] font-bold text-white" style={e.type === 'guest_list' ? { border: '1px solid rgba(255,255,255,.35)' } : { backgroundColor: 'var(--color-accent, #0068b3)' }}>
                    {e.type === 'guest_list' ? tt({ en: 'Join guest list', es: 'Guest list' }) : tt({ en: 'View event', es: 'Ver evento' })}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}
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
