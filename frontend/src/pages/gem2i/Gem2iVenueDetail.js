import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Play } from 'lucide-react';
import { gemAPI } from '../../lib/api';
import { useT, useLang } from '../../lib/i18n';
import { normalizeRichText } from '../../lib/richText';
import { gemImg, FollowButton, SocialLinks, SkeletonGrid } from '../../components/gem2i/GemCatalogBits';
import { HoverCard, CARD_CSS } from '../../components/gem2i/GemCatalogCards';
import { NotFoundShell } from './Gem2iArtistDetail';

const GEM_FONT = "'Manrope', sans-serif";
const SERIF = "'Playfair Display', Georgia, serif";
const BODY = 'var(--color-body-text, #9AA6B2)';
const LINK = 'var(--color-link, #5AAFEA)';
const LINE = 'var(--color-card-border, rgba(255,255,255,0.09))';
const ytId = (v) => (String(v || '').match(/(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([\w-]{11})/) || [])[1];

const H2 = ({ a, b }) => (
  <h2 className="text-white font-bold mb-5 leading-[1.1] pb-1" style={{ fontFamily: SERIF, fontSize: 'clamp(1.5rem, 2.4vw, 1.9rem)' }}>
    {a} {b && <em className="font-semibold" style={{ color: LINK }}>{b}</em>}
  </h2>
);

/** Venue detail — VD-A (2026-10-26, boceto gem2i-venue-detail.html): wide photo with the logo disc, name and place;
 *  facts band (address, region, type, capacity) + Follow; about + socials next to the video (cover that opens
 *  YouTube); upcoming nights (before the map, Anthony's adjustment); map / "Open in Maps". No CMS hero: detail
 *  pages are not in Hero → Page Assignment. Venues carry no lat/lng, so the map is an address search. */
export default function Gem2iVenueDetail() {
  const { slug } = useParams();
  const tt = useT();
  const { lang } = useLang() || { lang: 'en' };
  const [venue, setVenue] = useState(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let alive = true;
    setVenue(null); setMissing(false);
    gemAPI.venueDetail(slug)
      .then(r => { if (alive) setVenue(r.data); })
      .catch(() => { if (alive) setMissing(true); });
    return () => { alive = false; };
  }, [slug]);

  if (missing) {
    return (
      <NotFoundShell backTo="/venues" backLabel={tt({ en: 'Back to Venues', es: 'Volver a Venues' })}>
        {tt({ en: 'Venue not found.', es: 'Venue no encontrado.' })}
      </NotFoundShell>
    );
  }
  if (!venue) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-page-bg, #04080C)' }}>
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-24"><SkeletonGrid count={4} /></div>
      </div>
    );
  }

  const photo = gemImg(venue.image_urls?.view);
  const logo = gemImg(venue.image_urls?.logo);
  const place = [venue.city, venue.state, venue.country].filter(Boolean).join(', ');
  const full = [venue.address, place].filter(Boolean).join(', ');
  const cap = Number(venue.capacity) ? Number(venue.capacity).toLocaleString(lang === 'es' ? 'es-ES' : 'en-US') : '';
  const facts = [
    [tt({ en: 'Address', es: 'Dirección' }), venue.address],
    [tt({ en: 'Region', es: 'Región' }), place],
    [tt({ en: 'Type', es: 'Tipo' }), venue.type],
    [tt({ en: 'Capacity', es: 'Aforo' }), cap],
  ].filter(([, v]) => v);
  const video = ytId(venue.video);
  const upcoming = Array.isArray(venue.upcoming_events) ? venue.upcoming_events : [];
  const mapsUrl = full ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue.name}, ${full}`)}` : '';
  const mapEmbed = full ? `https://maps.google.com/maps?q=${encodeURIComponent(`${venue.name}, ${full}`)}&z=14&output=embed` : '';

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: 'var(--color-page-bg, #04080C)', fontFamily: GEM_FONT }} data-testid="gem2i-venue-detail">
      <section className="relative h-[400px] md:h-[440px] overflow-hidden" style={{ backgroundColor: '#0A121A' }} data-testid="venue-hero">
        {photo && <img src={photo} alt="" className="absolute inset-0 w-full h-full object-cover" />}
        <span aria-hidden="true" className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(4,8,12,.92) 0%, rgba(4,8,12,.25) 100%)' }} />
        <div className="relative h-full max-w-7xl mx-auto px-6 md:px-10 pt-8 pb-9 flex flex-col">
          <p className="text-sm text-white/80">
            <Link to="/venues" className="inline-flex items-center gap-1.5 hover:text-white"><ArrowLeft className="w-4 h-4" /> {tt({ en: 'Venues', es: 'Venues' })}</Link>
            <span className="text-white/50"> / {venue.name}</span>
          </p>
          <div className="mt-auto flex items-center gap-5 md:gap-6">
            {logo && (
              <span className="shrink-0 w-[88px] h-[88px] md:w-[104px] md:h-[104px] rounded-full bg-white p-3.5 flex items-center justify-center shadow-[0_10px_30px_-10px_rgba(0,0,0,.6)]">
                <img src={logo} alt="" className="max-w-full max-h-full object-contain" />
              </span>
            )}
            <div className="min-w-0">
              <h1 className="text-white font-bold leading-[1.02] pb-1" style={{ fontFamily: SERIF, fontSize: 'clamp(2.5rem, 5.4vw, 4.4rem)' }}>{venue.name}</h1>
              {place && <p className="text-[15.5px] text-[#dfe6ec] inline-flex items-center gap-1.5"><MapPin className="w-4 h-4" aria-hidden="true" />{place}</p>}
            </div>
          </div>
        </div>
      </section>

      {/* Facts band + Follow */}
      <div className="border-b" style={{ borderColor: LINE }}>
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:flex" style={{ backgroundColor: LINE, gap: 1 }} data-testid="venue-facts">
          {facts.map(([k, v]) => (
            <div key={k} className="md:flex-1 px-6 py-4" style={{ backgroundColor: 'var(--color-card-bg, #0D1721)' }}>
              <small className="block text-[12px]" style={{ color: BODY }}>{k}</small>
              <b className="text-white text-[15px]">{v}</b>
            </div>
          ))}
          <div className="col-span-2 md:col-span-1 px-6 py-3 flex items-center" style={{ backgroundColor: 'var(--color-card-bg, #0D1721)' }}>
            <FollowButton kind="venue" targetId={venue.id} />
          </div>
        </div>
      </div>

      {(venue.description || video) && (
        <section className={`max-w-7xl mx-auto px-6 md:px-10 mt-14 grid gap-10 lg:gap-12 items-start ${venue.description && video ? 'lg:grid-cols-2' : ''}`}>
          <div>
            {venue.description && <>
              <H2 a={tt({ en: 'About the', es: 'Sobre el' })} b={tt({ en: 'venue', es: 'venue' })} />
              <div className="max-w-[62ch] text-[16.5px] leading-[1.85] [&_p]:mb-4" style={{ color: BODY }}
                dangerouslySetInnerHTML={{ __html: normalizeRichText(venue.description) }} />
            </>}
            <div className="mt-6"><SocialLinks socials={venue.socials} /></div>
          </div>
          {video && (
            // Cover + link: many legacy videos block embedding (rights owner), so we open YouTube.
            <a href={`https://www.youtube.com/watch?v=${video}`} target="_blank" rel="noreferrer" data-testid="venue-video"
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

      {/* Upcoming nights first, then the map (Anthony, 2026-10-26). */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 mt-16" data-testid="venue-upcoming-events">
        <H2 a={tt({ en: 'Coming up at', es: 'Próximamente en' })} b={venue.name} />
        {upcoming.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {upcoming.map(e => (
              <HoverCard key={e.id} to={`/events/${e.slug}`} aspect="aspect-[4/5]" testid="venue-event"
                img={gemImg(e.image_urls?.flyer) || gemImg(e.image_urls?.logo)} title={e.title} strip={e.title}
                cta={e.type === 'guest_list' ? tt({ en: 'Join guest list', es: 'Guest list' }) : tt({ en: 'View event', es: 'Ver evento' })}
                meta={[e.event_date && new Date(`${e.event_date}T12:00:00`).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' })]} />
            ))}
          </div>
        ) : (
          <p className="text-[15.5px]" style={{ color: BODY }}>
            {tt({ en: 'No upcoming nights here yet.', es: 'Aún no hay noches próximas aquí.' })}{' '}
            <Link to="/events" className="font-bold underline underline-offset-4" style={{ color: LINK }}>{tt({ en: 'See all events', es: 'Ver todos los eventos' })}</Link>
          </p>
        )}
      </section>

      {mapEmbed && (
        <section className="max-w-7xl mx-auto px-6 md:px-10 mt-16 grid lg:grid-cols-2 gap-10 items-center" data-testid="venue-map">
          <div className="rounded-[4px] overflow-hidden aspect-[16/10]" style={{ backgroundColor: '#0A121A' }}>
            <iframe title={tt({ en: 'Map', es: 'Mapa' })} src={mapEmbed} loading="lazy" className="w-full h-full border-0 grayscale invert-[.9] contrast-[.9]" />
          </div>
          <div>
            <H2 a={tt({ en: 'How to', es: 'Cómo' })} b={tt({ en: 'get there', es: 'llegar' })} />
            <p className="text-[15.5px] mb-4" style={{ color: BODY }}>{full}</p>
            <a href={mapsUrl} target="_blank" rel="noreferrer" className="font-bold underline underline-offset-4 decoration-1 hover:decoration-2" style={{ color: LINK }}>{tt({ en: 'Open in Maps', es: 'Abrir en Maps' })} ↗</a>
          </div>
        </section>
      )}
      <style>{CARD_CSS}</style>
    </div>
  );
}
