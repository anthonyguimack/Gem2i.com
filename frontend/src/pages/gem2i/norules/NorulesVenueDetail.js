/* Norules (`gem2i`) — own copy of this inner page (template = package, D-GEM-2026-15). */
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { gemAPI } from '../../../lib/api';
import { useT } from '../../../lib/i18n';
import { gemImg, FollowButton, SkeletonGrid } from '../../../components/gem2i/GemCatalogBits';
import { LogoDisc, place, LINE } from '../../../components/gem2i/norules/GemCatalogCards';
import {
  DetailShell, Crumb, Section, TextAndVideo, PhotoHero, HeroChip, EventRow, MapEmbed, SERIF,
} from '../../../components/gem2i/norules/NorulesDetailBits';
import { NotFoundShell } from './NorulesArtistDetail';

const host = (url) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } };

/** Venue detail — boceto norules-detail-pages.html (Venue): photo hero with the logo, facts strip
 *  (type, capacity, city, website), about + video, upcoming events as E3 rows, map. */
export default function NorulesVenueDetail() {
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
    return <DetailShell><div className="py-24"><SkeletonGrid count={4} /></div></DetailShell>;
  }

  const location = place(venue.address, venue.city, venue.state, venue.country);
  const web = venue.socials?.website;
  const facts = [
    venue.type && [tt({ en: 'Type', es: 'Tipo' }), venue.type],
    Number(venue.capacity) > 0 && [tt({ en: 'Capacity', es: 'Aforo' }), Number(venue.capacity).toLocaleString()],
    (venue.city || venue.state) && [tt({ en: 'City', es: 'Ciudad' }), venue.city || venue.state],
    web && [tt({ en: 'Website', es: 'Web' }), <a href={web} target="_blank" rel="noreferrer" className="nl nl-ext">{host(web) || 'Website'}</a>],
  ].filter(Boolean);

  return (
    <DetailShell testid="gem2i-venue-detail">
      <Crumb items={[[tt({ en: 'Venues', es: 'Venues' }), '/venues'], [venue.name]]} />

      <PhotoHero img={gemImg(venue.image_urls?.view)} minH="min-h-[380px] md:min-h-[500px]">
        <div className="flex flex-wrap items-end gap-5">
          {venue.image_urls?.logo && <LogoDisc src={gemImg(venue.image_urls.logo)} size={104} className="shrink-0" />}
          <div className="flex-1 min-w-[240px]">
            {venue.order > 0 && venue.order <= 8 && <HeroChip>#{venue.order} {tt({ en: 'Top venue', es: 'Top venue' })}</HeroChip>}
            <h1 className="mt-1.5 mb-2.5 font-bold leading-[.95] text-white" style={{ fontFamily: SERIF, fontSize: 'clamp(2.6rem, 6vw, 5rem)' }}>{venue.name}</h1>
            {location && <p className="inline-flex items-start gap-1.5 text-white/85"><MapPin className="w-4 h-4 mt-1 shrink-0" aria-hidden="true" />{location}</p>}
          </div>
          <FollowButton kind="venue" targetId={venue.id} className="nb-follow nb-follow-g" />
        </div>
      </PhotoHero>

      {facts.length > 0 && (
        <dl className="mt-5 grid grid-cols-2 lg:grid-cols-[repeat(var(--n),minmax(0,1fr))] rounded-[20px] overflow-hidden" style={{ border: `1px solid ${LINE}`, '--n': facts.length }} data-testid="venue-facts">
          {facts.map(([k, val], i) => (
            <div key={k} className={`px-5 py-4 ${i ? 'border-l' : ''} ${i > 1 ? 'border-t lg:border-t-0' : ''} ${i === 2 ? 'border-l-0 lg:border-l' : ''}`} style={{ borderColor: LINE }}>
              <dt className="text-[10.5px] font-extrabold tracking-[0.16em] uppercase" style={{ color: 'var(--color-body-text, #9AA6B2)' }}>{k}</dt>
              <dd className="m-0 mt-0.5 text-white text-[18px] font-bold">{val}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-6">
        <TextAndVideo title={tt({ en: 'About the club', es: 'Sobre el club' })} html={venue.description} lead={venue.summary} chips={venue.genres} video={venue.video} socials={venue.socials} />
      </div>

      {venue.upcoming_events?.length > 0 && (
        <Section title={tt({ en: 'Upcoming events', es: 'Próximos eventos' })} testid="venue-upcoming-events">
          <div className="border-t" style={{ borderColor: LINE }}>{venue.upcoming_events.map(e => <EventRow key={e.id} e={e} />)}</div>
        </Section>
      )}

      {venue.map && (
        <Section title={tt({ en: 'How to get there', es: 'Cómo llegar' })}>
          <MapEmbed src={venue.map} title={venue.name} />
        </Section>
      )}
    </DetailShell>
  );
}
