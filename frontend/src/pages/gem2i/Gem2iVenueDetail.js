import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin } from 'lucide-react';
import { gemAPI } from '../../lib/api';
import { useT } from '../../lib/i18n';
import { normalizeRichText } from '../../lib/richText';
import { gemImg, CardImage, FollowButton, SocialLinks, SkeletonGrid, TypeBadge } from '../../components/gem2i/GemCatalogBits';
import { NotFoundShell } from './Gem2iArtistDetail';

const GEM_FONT = "'Poppins', sans-serif";

export default function Gem2iVenueDetail() {
  const { slug } = useParams();
  const tt = useT();
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

  const location = [venue.address, venue.city, venue.state, venue.country].filter(Boolean).join(', ');

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-page-bg, #04080C)', fontFamily: GEM_FONT }} data-testid="gem2i-venue-detail">
      <div className="max-w-7xl mx-auto px-6 md:px-10 pt-10 pb-24">
        <Link to="/venues" className="inline-flex items-center gap-1.5 text-sm transition-colors hover:text-white"
          style={{ color: 'var(--color-link, #5FB2E0)' }}>
          <ArrowLeft className="w-4 h-4" /> {tt({ en: 'Venues', es: 'Venues' })}
        </Link>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-[minmax(0,460px)_1fr] gap-10 lg:gap-14">
          <div className="group">
            <CardImage src={gemImg(venue.image_urls?.view) || gemImg(venue.image_urls?.logo)} alt={venue.name} aspect="aspect-[4/3]" />
          </div>

          <div>
            <h1 className="text-white font-bold leading-tight" style={{ fontSize: 'clamp(1.9rem, 4vw, 3rem)' }}>{venue.name}</h1>
            {venue.type && (
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.25em]" style={{ color: 'var(--color-accent, #3287B7)' }}>{venue.type}</p>
            )}
            {location && (
              <p className="mt-3 inline-flex items-start gap-1.5 text-sm" style={{ color: 'var(--color-body-text, #9AA6B2)' }}>
                <MapPin className="w-4 h-4 mt-0.5 shrink-0" /> {location}
              </p>
            )}
            {venue.capacity && (
              <p className="mt-2 text-sm" style={{ color: 'var(--color-body-text, #9AA6B2)' }}>
                {tt({ en: 'Capacity', es: 'Capacidad' })}: {venue.capacity}
              </p>
            )}

            <div className="mt-7"><FollowButton kind="venue" targetId={venue.id} /></div>

            {venue.description && (
              <div className="mt-10 max-w-none text-[15px] leading-[1.9]"
                style={{ color: 'var(--color-body-text, #9AA6B2)' }}
                dangerouslySetInnerHTML={{ __html: normalizeRichText(venue.description) }} />
            )}

            <div className="mt-10"><SocialLinks socials={venue.socials} /></div>
          </div>
        </div>

        {Array.isArray(venue.upcoming_events) && venue.upcoming_events.length > 0 && (
          <section className="mt-20" data-testid="venue-upcoming-events">
            <h2 className="text-white font-bold mb-8" style={{ fontSize: 'clamp(1.4rem, 2.6vw, 2rem)' }}>
              {tt({ en: 'Upcoming Events', es: 'Próximos Eventos' })}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {venue.upcoming_events.map(e => (
                <Link key={e.id} to={`/events/${e.slug}`} className="group block">
                  <CardImage src={gemImg(e.image_urls?.flyer)} alt={e.title} aspect="aspect-square" />
                  <div className="mt-3 flex items-center gap-2"><TypeBadge type={e.type} /></div>
                  <p className="mt-1.5 text-white/90 text-sm font-semibold group-hover:text-white transition-colors">{e.title}</p>
                  {e.event_date && <p className="text-xs mt-0.5" style={{ color: 'var(--color-body-text, #9AA6B2)' }}>{e.event_date}</p>}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
