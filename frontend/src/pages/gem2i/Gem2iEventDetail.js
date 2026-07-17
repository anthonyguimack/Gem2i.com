import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, CalendarDays, ExternalLink } from 'lucide-react';
import { gemAPI } from '../../lib/api';
import { useT } from '../../lib/i18n';
import { normalizeRichText } from '../../lib/richText';
import {
  gemImg, CardImage, FollowButton, SocialLinks, SkeletonGrid, TypeBadge, ArtistCard,
} from '../../components/gem2i/GemCatalogBits';
import GemGuestListWidget from '../../components/gem2i/GemGuestListWidget';
import GemTicketWidget from '../../components/gem2i/GemTicketWidget';
import { NotFoundShell } from './Gem2iArtistDetail';

const GEM_FONT = "'Poppins', sans-serif";

/** Event detail (plan A4) — description, socials, line-up, venue block, follow.
 *  Purchase / guest-list widgets arrive in Phases 4-5. */
export default function Gem2iEventDetail() {
  const { slug } = useParams();
  const tt = useT();
  const [event, setEvent] = useState(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let alive = true;
    setEvent(null); setMissing(false);
    gemAPI.eventDetail(slug)
      .then(r => { if (alive) setEvent(r.data); })
      .catch(() => { if (alive) setMissing(true); });
    return () => { alive = false; };
  }, [slug]);

  if (missing) {
    return (
      <NotFoundShell backTo="/events" backLabel={tt({ en: 'Back to Events', es: 'Volver a Eventos' })}>
        {tt({ en: 'Event not found.', es: 'Evento no encontrado.' })}
      </NotFoundShell>
    );
  }
  if (!event) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-page-bg, #04080C)' }}>
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-24"><SkeletonGrid count={4} /></div>
      </div>
    );
  }

  const v = event.venue;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-page-bg, #04080C)', fontFamily: GEM_FONT }} data-testid="gem2i-event-detail">
      <div className="max-w-7xl mx-auto px-6 md:px-10 pt-10 pb-24">
        <Link to="/events" className="inline-flex items-center gap-1.5 text-sm transition-colors hover:text-white"
          style={{ color: 'var(--color-link, #5FB2E0)' }}>
          <ArrowLeft className="w-4 h-4" /> {tt({ en: 'Events', es: 'Eventos' })}
        </Link>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-[minmax(0,460px)_1fr] gap-10 lg:gap-14">
          <div className="group">
            <CardImage src={gemImg(event.image_urls?.flyer) || gemImg(event.image_urls?.logo)} alt={event.title} aspect="aspect-square" />
          </div>

          <div>
            <div className="flex items-center gap-3"><TypeBadge type={event.type} /></div>
            <h1 className="mt-2 text-white font-bold leading-tight" style={{ fontSize: 'clamp(1.9rem, 4vw, 3rem)' }}>{event.title}</h1>

            {event.event_date && (
              <p className="mt-3 inline-flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-body-text, #9AA6B2)' }}>
                <CalendarDays className="w-4 h-4 shrink-0" />
                {event.event_date}
                {event.open_time && ` · ${String(event.open_time).slice(11, 16)}`}
              </p>
            )}
            {v && (
              <p className="mt-2 flex items-start gap-1.5 text-sm" style={{ color: 'var(--color-body-text, #9AA6B2)' }}>
                <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                <Link to={`/venues/${v.slug}`} className="transition-colors hover:text-white underline-offset-2 hover:underline">
                  {v.name}
                </Link>
                {[v.city, v.country].filter(Boolean).length > 0 && <span>· {[v.city, v.country].filter(Boolean).join(', ')}</span>}
              </p>
            )}

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <FollowButton kind="event" targetId={event.id} />
              {event.external_ticket_system && (
                <a href={event.external_ticket_system} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-sm transition-opacity hover:opacity-85"
                  style={{ backgroundColor: 'var(--color-button-bg, #3287B7)', color: 'var(--color-button-text, #fff)' }}>
                  {tt({ en: 'Tickets', es: 'Tickets' })} <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>

            <GemGuestListWidget event={event} />
            <GemTicketWidget event={event} />

            {event.description && (
              <div className="mt-10 max-w-none text-[15px] leading-[1.9]"
                style={{ color: 'var(--color-body-text, #9AA6B2)' }}
                dangerouslySetInnerHTML={{ __html: normalizeRichText(event.description) }} />
            )}

            <div className="mt-10"><SocialLinks socials={event.socials} /></div>
          </div>
        </div>

        {Array.isArray(event.lineup_artists) && event.lineup_artists.length > 0 && (
          <section className="mt-20" data-testid="event-lineup">
            <h2 className="text-white font-bold mb-8" style={{ fontSize: 'clamp(1.4rem, 2.6vw, 2rem)' }}>
              {tt({ en: 'DJ Line-up', es: 'Line-up de DJs' })}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {event.lineup_artists.map(a => <ArtistCard key={a.id} artist={a} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
