import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, CalendarDays, ExternalLink, Share2, CalendarPlus } from 'lucide-react';
import { gemAPI } from '../../lib/api';
import { useT, useLang } from '../../lib/i18n';
import { normalizeRichText } from '../../lib/richText';
import {
  gemImg, CardImage, FollowButton, SocialLinks, SkeletonGrid, TypeBadge, ArtistCard,
} from '../../components/gem2i/GemCatalogBits';
import GemGuestListWidget from '../../components/gem2i/GemGuestListWidget';
import GemTicketWidget from '../../components/gem2i/GemTicketWidget';
import { HoverCard, CARD_CSS } from '../../components/gem2i/GemCatalogCards';
import { NotFoundShell } from './Gem2iArtistDetail';

const GEM_FONT = "'Manrope', sans-serif";
const SERIF = "'Playfair Display', Georgia, serif";
const BODY_C = 'var(--color-body-text, #9AA6B2)';

/** Event detail — ED-A (2026-10-26, boceto gem2i-event-detail.html; evolves GD2): blurred-flyer hero, about + line-up, sticky action card (follow,
 *  external tickets, guest list, e-tickets, share, add to calendar), venue block, "More at <venue>",
 *  fixed bottom action bar (hidden for past events). No CMS hero: detail pages are not in Page Assignment. */
export default function Gem2iEventDetail() {
  const { slug } = useParams();
  const tt = useT();
  const { lang } = useLang() || { lang: 'en' };
  const [event, setEvent] = useState(null);
  const [missing, setMissing] = useState(false);
  const [more, setMore] = useState([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    setEvent(null); setMissing(false); setMore([]);
    gemAPI.eventDetail(slug)
      .then(r => {
        if (!alive) return;
        setEvent(r.data);
        const vs = r.data?.venue?.slug;
        if (vs) gemAPI.venueDetail(vs).then(x => { if (alive) setMore((x.data?.upcoming_events || []).filter(e => e.slug !== slug).slice(0, 4)); }).catch(() => {});
      })
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
  const flyer = gemImg(event.image_urls?.flyer) || gemImg(event.image_urls?.logo);
  const doors = /T\d\d:\d\d/.test(event.open_time || '') ? String(event.open_time).slice(11, 16) : '';
  const dateText = event.event_date
    ? new Date(`${event.event_date}T12:00:00`).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  const isPast = (event.event_date || '') < new Date().toISOString().slice(0, 10);
  const hasAction = !isPast && (event.type === 'eticket' || event.type === 'guest_list' || !!event.external_ticket_system);
  const actionLabel = event.type === 'guest_list' ? tt({ en: 'Join guest list', es: 'Apuntarme a la guest list' }) : tt({ en: 'Get tickets', es: 'Comprar entradas' });
  const toAction = () => document.getElementById('event-action')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const venueImg = gemImg(v?.image_urls?.view) || gemImg(v?.image_urls?.logo);
  const venueAddr = [v?.address, v?.city, v?.country].filter(Boolean).join(', ');
  const mapsUrl = venueAddr ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${v.name}, ${venueAddr}`)}` : '';
  const calUrl = (() => {
    const d = String(event.event_date || '').replace(/-/g, '');
    if (!d) return '';
    const t = doors.replace(':', '');
    const dates = t ? `${d}T${t}00/${d}T235900` : `${d}/${d}`;
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${dates}&location=${encodeURIComponent([v?.name, venueAddr].filter(Boolean).join(', '))}`;
  })();
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) { await navigator.share({ title: event.title, url }); return; }
      await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000);
    } catch { /* dismissed */ }
  };
  const chip = 'inline-flex items-center gap-1.5 rounded-[4px] px-3 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-white/10';
  const H2 = ({ a, b }) => (
    <h2 className="text-white font-bold mb-5 leading-[1.1] pb-1" style={{ fontFamily: SERIF, fontSize: 'clamp(1.5rem, 2.4vw, 1.9rem)' }}>
      {a} <em className="font-semibold" style={{ color: 'var(--color-link, #5AAFEA)' }}>{b}</em>
    </h2>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-page-bg, #04080C)', fontFamily: GEM_FONT }} data-testid="gem2i-event-detail">
      {/* GD2 (boceto gem2i-inner-pages-1.html): the flyer, blurred, is the backdrop; the sharp flyer + title sit on it. */}
      <section className="relative overflow-hidden" data-testid="event-hero">
        {flyer && <img src={flyer} alt="" aria-hidden="true" className="absolute -inset-8 w-[calc(100%+4rem)] h-[calc(100%+4rem)] max-w-none object-cover blur-[26px] brightness-[.42]" />}
        <span aria-hidden="true" className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(4,8,12,.25) 0%, var(--color-page-bg, #04080C) 100%)' }} />
        <div className="relative max-w-7xl mx-auto px-6 md:px-10 pt-10 pb-14">
          <Link to="/events" className="inline-flex items-center gap-1.5 text-sm text-white/80 transition-colors hover:text-white">
            <ArrowLeft className="w-4 h-4" /> {tt({ en: 'Events', es: 'Eventos' })}
          </Link>
          <span className="text-sm text-white/50"> / {event.title}</span>
          <div className="mt-10 grid md:grid-cols-[auto_1fr] gap-8 md:gap-11 items-end">
            {flyer && <img src={flyer} alt={event.title} className="w-[220px] md:w-[300px] aspect-square object-cover rounded-[4px] shadow-[0_30px_60px_-20px_rgba(0,0,0,.75)]" />}
            <div>
              <TypeBadge type={event.type} />
              <h1 className="mt-3 text-white font-bold leading-[1.06] pb-1" style={{ fontFamily: SERIF, fontSize: 'clamp(2.3rem, 5vw, 4.2rem)' }}>{event.title}</h1>
              <p className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[15.5px] text-[#dfe6ec]">
                {dateText && <span className="inline-flex items-center gap-1.5"><CalendarDays className="w-4 h-4" aria-hidden="true" />{dateText}</span>}
                {doors && <span>{tt({ en: 'Doors', es: 'Apertura' })} {doors}</span>}
                {v && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" aria-hidden="true" />
                    <span><Link to={`/venues/${v.slug}`} className="hover:underline underline-offset-4">{v.name}</Link>{[v.city, v.country].filter(Boolean).length > 0 && `, ${[v.city, v.country].filter(Boolean).join(', ')}`}</span>
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className={`max-w-7xl mx-auto px-6 md:px-10 pt-8 ${hasAction ? 'pb-32' : 'pb-24'} grid lg:grid-cols-[1.3fr_0.7fr] gap-10 lg:gap-14 items-start`}>
        <div className="min-w-0">
          {event.description && (
            <section>
              <h2 className="text-white font-bold mb-4" style={{ fontFamily: SERIF, fontSize: 'clamp(1.5rem, 2.4vw, 1.9rem)' }}>
                {tt({ en: 'About the night', es: 'Sobre la noche' })}
              </h2>
              <div className="text-[16px] leading-[1.85] [&_p]:mb-4" style={{ color: BODY_C }}
                dangerouslySetInnerHTML={{ __html: normalizeRichText(event.description) }} />
            </section>
          )}
          {Array.isArray(event.lineup_artists) && event.lineup_artists.length > 0 && (
            <section className="mt-14" data-testid="event-lineup">
              <h2 className="text-white font-bold mb-6" style={{ fontFamily: SERIF, fontSize: 'clamp(1.5rem, 2.4vw, 1.9rem)' }}>
                {tt({ en: 'Line-up', es: 'Line-up' })}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
                {event.lineup_artists.map(a => <ArtistCard key={a.id} artist={a} />)}
              </div>
            </section>
          )}
          {v && (
            <section className="mt-14" data-testid="event-venue">
              <H2 a={tt({ en: 'The', es: 'El' })} b={tt({ en: 'venue', es: 'venue' })} />
              <div className="grid sm:grid-cols-2 gap-6 items-center">
                <Link to={`/venues/${v.slug}`} className="block rounded-[4px] overflow-hidden" style={{ backgroundColor: '#0A121A' }}>
                  {venueImg ? <img src={venueImg} alt="" loading="lazy" className="w-full aspect-[16/10] object-cover transition-transform duration-700 hover:scale-[1.03]" /> : <span className="block aspect-[16/10]" />}
                </Link>
                <div>
                  <p className="text-white font-bold text-[24px] leading-tight" style={{ fontFamily: SERIF }}>{v.name}</p>
                  {venueAddr && <p className="mt-2 text-[15px]" style={{ color: BODY_C }}>{venueAddr}</p>}
                  <p className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[14.5px] font-bold" style={{ color: 'var(--color-link, #5AAFEA)' }}>
                    <Link to={`/venues/${v.slug}`} className="underline underline-offset-4 decoration-1 hover:decoration-2">{tt({ en: 'View venue', es: 'Ver venue' })}</Link>
                    {mapsUrl && <a href={mapsUrl} target="_blank" rel="noreferrer" className="underline underline-offset-4 decoration-1 hover:decoration-2">{tt({ en: 'Open in Maps', es: 'Abrir en Maps' })} ↗</a>}
                  </p>
                </div>
              </div>
            </section>
          )}
          <div className="mt-12"><SocialLinks socials={event.socials} /></div>
        </div>

        <aside id="event-action" className="lg:sticky lg:top-28 rounded-[4px] p-6" data-testid="event-action"
          style={{ backgroundColor: 'var(--color-card-bg, #0D1721)', border: '1px solid var(--color-card-border, rgba(255,255,255,0.09))' }}>
          <div className="flex flex-wrap items-center gap-3">
            <FollowButton kind="event" targetId={event.id} />
            {event.external_ticket_system && (
              <a href={event.external_ticket_system} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-[4px] transition-opacity hover:opacity-85"
                style={{ backgroundColor: 'var(--color-button-bg, #3287B7)', color: 'var(--color-button-text, #fff)' }}>
                {tt({ en: 'Tickets', es: 'Tickets' })} <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
          <GemGuestListWidget event={event} passTo={`/tickets/success?pass=${encodeURIComponent(event.slug || event.id)}`} />
          <GemTicketWidget event={event} />
          {isPast && (
            <div className="mt-5">
              <p className="text-[12px] font-extrabold tracking-[0.14em] uppercase" style={{ color: BODY_C }}>{tt({ en: 'Past event', es: 'Evento pasado' })}</p>
              <p className="mt-2 text-[14.5px]" style={{ color: BODY_C }}>{tt({ en: 'This night already took place.', es: 'Esta noche ya se celebró.' })}</p>
              {v && <Link to={`/venues/${v.slug}`} className="mt-4 inline-flex rounded-[4px] px-4 py-2.5 text-[14px] font-bold text-white" style={{ border: '1px solid rgba(255,255,255,.3)' }}>{tt({ en: `Upcoming at ${v.name}`, es: `Próximamente en ${v.name}` })}</Link>}
            </div>
          )}
          <div className="mt-5 pt-4 flex flex-wrap gap-1.5 border-t" style={{ borderColor: 'var(--color-card-border, rgba(255,255,255,0.09))' }}>
            <button type="button" onClick={share} className={chip}><Share2 className="w-4 h-4" aria-hidden="true" />{copied ? tt({ en: 'Link copied', es: 'Enlace copiado' }) : tt({ en: 'Share', es: 'Compartir' })}</button>
            {calUrl && !isPast && <a href={calUrl} target="_blank" rel="noreferrer" className={chip}><CalendarPlus className="w-4 h-4" aria-hidden="true" />{tt({ en: 'Add to calendar', es: 'Añadir al calendario' })}</a>}
          </div>
        </aside>
      </div>

      {v && more.length > 0 && (
        <section className={`max-w-7xl mx-auto px-6 md:px-10 ${hasAction ? 'pb-32' : 'pb-24'} -mt-10`} data-testid="event-more">
          <H2 a={tt({ en: 'More at', es: 'Más en' })} b={v.name} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {more.map(e => (
              <HoverCard key={e.id || e.slug} to={`/events/${e.slug}`} aspect="aspect-[4/5]" testid="more-event"
                img={gemImg(e.image_urls?.flyer) || gemImg(e.image_urls?.logo)} title={e.title} strip={e.title}
                meta={[e.event_date && new Date(`${e.event_date}T12:00:00`).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' })]} />
            ))}
          </div>
          <style>{CARD_CSS}</style>
        </section>
      )}

      {/* ED-A (was GD2): the action follows the whole scroll in a bar at the bottom. */}
      {hasAction && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur-md" data-testid="event-action-bar"
          style={{ backgroundColor: 'rgba(7,13,20,.94)', borderColor: 'var(--color-card-border, rgba(255,255,255,0.09))' }}>
          <div className="max-w-7xl mx-auto px-6 md:px-10 py-3.5 flex items-center justify-between gap-4">
            <p className="min-w-0 truncate text-[14.5px]" style={{ color: BODY_C }}>
              <b className="text-white">{event.title}</b>{dateText && <span className="hidden sm:inline"> · {dateText}</span>}
            </p>
            {event.external_ticket_system && event.type !== 'guest_list'
              ? <a href={event.external_ticket_system} target="_blank" rel="noreferrer" className="shrink-0 inline-flex items-center gap-2 rounded-[4px] px-5 py-3 text-[14.5px] font-bold text-white" style={{ backgroundColor: 'var(--color-accent, #0068b3)' }}>{actionLabel} <ExternalLink className="w-4 h-4" /></a>
              : <button type="button" onClick={toAction} className="shrink-0 rounded-[4px] px-5 py-3 text-[14.5px] font-bold text-white transition-opacity hover:opacity-90" style={{ backgroundColor: 'var(--color-accent, #0068b3)' }}>{actionLabel}</button>}
          </div>
        </div>
      )}
    </div>
  );
}
