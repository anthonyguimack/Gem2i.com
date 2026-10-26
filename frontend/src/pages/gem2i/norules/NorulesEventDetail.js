/* Norules (`gem2i`) — own copy of this inner page (template = package, D-GEM-2026-15). */
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { gemAPI } from '../../../lib/api';
import { useT } from '../../../lib/i18n';
import { gemImg, FollowButton, SkeletonGrid } from '../../../components/gem2i/GemCatalogBits';
import GemGuestListWidget from '../../../components/gem2i/GemGuestListWidget';
import GemTicketWidget from '../../../components/gem2i/GemTicketWidget';
import AccentTitle from '../../../components/gem2i/AccentTitle';
import { NBtn } from '../../../components/gem2i/norules/NBtn';
import { LogoDisc, useFmtDate, place, ACCENT, BODY, LINE, CARD } from '../../../components/gem2i/norules/GemCatalogCards';
import {
  DetailShell, Crumb, Section, TextAndVideo, MapEmbed, EventPosterCard, ArtistHoverCard, typeLabel, SERIF, MapPin,
} from '../../../components/gem2i/norules/NorulesDetailBits';
import { NotFoundShell } from './NorulesArtistDetail';

const hhmm = (t) => (/T\d\d:\d\d/.test(t || '') ? t.slice(11, 16) : '');

/** Event detail — boceto norules-detail-pages.html (Event): sticky poster, date/venue block, tickets or
 *  guest list (legacy widgets), about, DJ line-up (A1 cards), the venue with its map, more at this venue (E1). */
export default function NorulesEventDetail() {
  const { slug } = useParams();
  const tt = useT();
  const fmt = useFmtDate();
  const [event, setEvent] = useState(null);
  const [missing, setMissing] = useState(false);
  const [more, setMore] = useState([]);

  useEffect(() => {
    let alive = true;
    setEvent(null); setMissing(false); setMore([]);
    gemAPI.eventDetail(slug)
      .then(r => {
        if (!alive) return;
        setEvent(r.data);
        const vs = r.data?.venue?.slug;
        if (vs) gemAPI.venueDetail(vs).then(v => { if (alive) setMore((v.data?.upcoming_events || []).filter(e => e.slug !== slug).slice(0, 4)); }).catch(() => {});
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
    return <DetailShell><div className="py-24"><SkeletonGrid count={4} /></div></DetailShell>;
  }

  const v = event.venue;
  const d = event.event_date ? new Date(`${event.event_date.slice(0, 10)}T12:00:00`) : null;
  const label = typeLabel(event.type);
  const times = [hhmm(event.open_time) && `${tt({ en: 'Doors', es: 'Apertura' })} ${hhmm(event.open_time)}`,
    hhmm(event.end_time) && `${tt({ en: 'Ends', es: 'Cierre' })} ${hhmm(event.end_time)}`].filter(Boolean).join(' · ');
  const venueWhere = v && place(v.address, v.city || v.state, v.country);

  return (
    <DetailShell testid="gem2i-event-detail">
      <Crumb items={[[tt({ en: 'Events', es: 'Eventos' }), '/events'], [event.title]]} />

      <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-10 lg:gap-12 items-start">
        <div className="relative lg:sticky lg:top-24 rounded-3xl overflow-hidden aspect-[3/4] max-w-[460px] shadow-[0_30px_60px_-30px_rgba(0,0,0,.45)]" style={{ backgroundColor: CARD }}>
          {(event.image_urls?.flyer || event.image_urls?.logo) && <img src={gemImg(event.image_urls?.flyer) || gemImg(event.image_urls?.logo)} alt={event.title} className="w-full h-full object-cover" />}
          {label && <span className="absolute left-4 top-4 px-3 py-1.5 text-[11px] font-bold tracking-[0.16em] uppercase text-white rounded-md" style={{ backgroundColor: event.type === 'guest_list' ? '#1f8f55' : ACCENT }}>{label}</span>}
        </div>

        <div>
          <h1 className="text-white font-bold leading-[.98] tracking-[-0.01em]" style={{ fontFamily: SERIF, fontSize: 'clamp(2.4rem, 5vw, 4.2rem)' }}>
            <AccentTitle text={event.title} />
          </h1>

          <div className="mt-6 py-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-4 items-center border-y" style={{ borderColor: LINE }}>
            {d && !Number.isNaN(d.getTime()) && <>
              <span className="w-[78px] rounded-2xl overflow-hidden text-center" style={{ border: `1px solid ${LINE}` }}>
                <small className="block py-1 text-[11px] font-extrabold tracking-[0.2em] text-white" style={{ backgroundColor: '#2A3038' }}>{d.toLocaleString('en', { month: 'short' }).toUpperCase()}</small>
                <b className="block text-[34px] font-extrabold leading-[1.25] text-white">{d.getDate()}</b>
              </span>
              <span className="text-[15px] leading-[1.7]" style={{ color: BODY }}>
                <b className="block text-white text-[17px]">{fmt(event.event_date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</b>{times}
              </span>
            </>}
            {v && <>
              <span className="w-[78px] flex justify-center"><MapPin className="w-7 h-7" style={{ color: 'var(--color-link, #5AAFEA)' }} aria-hidden="true" /></span>
              <span className="text-[15px] leading-[1.7]" style={{ color: BODY }}>
                <span className="block"><Link to={`/venues/${v.slug}`} className="nl text-[17px]">{v.name}</Link></span>{venueWhere}
              </span>
            </>}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <FollowButton kind="event" targetId={event.id} className="nb-follow" />
            {event.external_ticket_system && (
              <NBtn href={event.external_ticket_system} variant="a" icon="ext">{tt({ en: 'Get tickets', es: 'Comprar entradas' })}</NBtn>
            )}
          </div>

          <div className="mt-2"><GemTicketWidget event={event} /></div>
          <GemGuestListWidget event={event} passTo={`/tickets/success?pass=${encodeURIComponent(event.slug || event.id)}`} />
        </div>
      </div>

      <div className="mt-12">
        <TextAndVideo title={tt({ en: 'About the night', es: 'Sobre la noche' })} html={event.description} video={event.video} socials={event.socials} lead={event.summary} />
      </div>

      {event.lineup_artists?.length > 0 && (
        <Section title={tt({ en: 'DJ line-up', es: 'Line-up de DJs' })} testid="event-lineup">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {event.lineup_artists.map(a => <ArtistHoverCard key={a.id} a={a} />)}
          </div>
        </Section>
      )}

      {v && (
        <Section title={tt({ en: 'The venue', es: 'El venue' })}>
          <div className={`grid rounded-3xl overflow-hidden ${v.map ? 'lg:grid-cols-[1fr_1.2fr]' : ''}`} style={{ border: `1px solid ${LINE}` }}>
            <div className="p-7 flex flex-col gap-3">
              {v.image_urls?.logo && <LogoDisc src={gemImg(v.image_urls.logo)} size={64} />}
              <b className="text-white text-[28px] leading-tight" style={{ fontFamily: SERIF }}>{v.name}</b>
              <span className="text-[15px]" style={{ color: BODY }}>{[venueWhere, v.type, v.capacity && `${tt({ en: 'capacity', es: 'aforo' })} ${Number(v.capacity).toLocaleString()}`].filter(Boolean).join(' · ')}</span>
              <NBtn to={`/venues/${v.slug}`} variant="s" className="mt-1 self-start">{tt({ en: 'View venue', es: 'Ver venue' })}</NBtn>
            </div>
            {v.map && <MapEmbed src={v.map} title={v.name} />}
          </div>
        </Section>
      )}

      {more.length > 0 && (
        <Section title={tt({ en: 'More at this venue', es: 'Más en este venue' })}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">{more.map(e => <EventPosterCard key={e.id} e={e} />)}</div>
        </Section>
      )}
    </DetailShell>
  );
}
