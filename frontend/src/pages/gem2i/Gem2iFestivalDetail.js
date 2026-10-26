import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, CalendarDays, Play } from 'lucide-react';
import { gemAPI } from '../../lib/api';
import { useT } from '../../lib/i18n';
import { normalizeRichText } from '../../lib/richText';
import { gemImg, SocialLinks, SkeletonGrid, FollowButton } from '../../components/gem2i/GemCatalogBits';
import { HoverCard, CARD_CSS } from '../../components/gem2i/GemCatalogCards';
import { NotFoundShell } from './Gem2iArtistDetail';
import { GemConferenceSchedule } from '../../components/gem2i/GemSections';

const GEM_FONT = "'Manrope', sans-serif";
const SERIF = "'Playfair Display', Georgia, serif";
const BODY = 'var(--color-body-text, #9AA6B2)';
const LINK = 'var(--color-link, #5AAFEA)';
const ytId = (s) => (String(s || '').match(/(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([\w-]{11})/) || [])[1];

/** Days / hours / minutes until `iso`; null once it has passed. Ticks every 30 s. */
function useCountdown(iso) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(id); }, []);
  const t = Date.parse(iso || '');
  if (!t || t <= now) return null;
  const m = Math.floor((t - now) / 60000);
  return [Math.floor(m / 1440), Math.floor((m % 1440) / 60), m % 60];
}

const H2 = ({ a, b }) => (
  <h2 className="text-white font-bold mb-5 leading-[1.1] pb-1" style={{ fontFamily: SERIF, fontSize: 'clamp(1.5rem, 2.4vw, 1.9rem)' }}>
    {a} {b && <em className="font-semibold" style={{ color: LINK }}>{b}</em>}
  </h2>
);

/** Festival AND conference detail (same document shape; `kind` switches the API call) — FD-A (2026-10-26,
 *  boceto gem2i-festival-detail.html): photo header with logo, name, dates, place and countdown ("Past edition"
 *  once it is over), Follow + socials, the line-up as a typographic festival poster (Poster ⇄ Cards), sessions by
 *  day for conferences, about + video, flyer. No CMS hero: detail pages are not in Hero → Page Assignment. */
export default function Gem2iFestivalDetail({ kind = 'festival' }) {
  const { slug } = useParams();
  const tt = useT();
  const [doc, setDoc] = useState(null);
  const [missing, setMissing] = useState(false);
  const [view, setView] = useState('poster');
  const isConf = kind === 'conference';

  useEffect(() => {
    let alive = true;
    setDoc(null); setMissing(false);
    const call = isConf ? gemAPI.conferenceDetail(slug) : gemAPI.festivalDetail(slug);
    call.then(r => { if (alive) setDoc(r.data); }).catch(() => { if (alive) setMissing(true); });
    return () => { alive = false; };
  }, [slug, isConf]);

  const start = doc?.event_date ? `${doc.event_date}T${/T\d\d:\d\d/.test(doc.open_time || '') ? doc.open_time.slice(11, 16) : '00:00'}:00` : '';
  const cd = useCountdown(start);

  const backTo = isConf ? '/conferences' : '/festivals';
  const backLabel = isConf ? tt({ en: 'Conferences', es: 'Conferencias' }) : tt({ en: 'Festivals', es: 'Festivales' });

  if (missing) {
    return (
      <NotFoundShell backTo={backTo} backLabel={backLabel}>
        {isConf
          ? tt({ en: 'Conference not found.', es: 'Conferencia no encontrada.' })
          : tt({ en: 'Festival not found.', es: 'Festival no encontrado.' })}
      </NotFoundShell>
    );
  }
  if (!doc) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-page-bg, #04080C)' }}>
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-24"><SkeletonGrid count={4} /></div>
      </div>
    );
  }

  const photo = gemImg(doc.image_urls?.view) || gemImg(doc.image_urls?.generic);
  const flyer = gemImg(doc.image_urls?.flyer);
  const logo = gemImg(doc.image_urls?.logo);
  const cover = photo || flyer;
  const location = [doc.address, doc.city, doc.state, doc.country].filter(Boolean).join(', ');
  const isPast = !!doc.event_date && doc.event_date < new Date().toISOString().slice(0, 10);
  const lineup = Array.isArray(doc.lineup_artists) ? doc.lineup_artists : [];
  const tiers = [lineup.slice(0, 4), lineup.slice(4, 9), lineup.slice(9)];
  const video = ytId(doc.video);

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: 'var(--color-page-bg, #04080C)', fontFamily: GEM_FONT }} data-testid={`gem2i-${kind}-detail`}>
      {/* Photo header (a conference has only a flyer: it is blurred behind the name). */}
      <section className="relative h-[440px] md:h-[480px] overflow-hidden" data-testid="festival-hero" style={{ backgroundColor: '#0A121A' }}>
        {cover && <img src={cover} alt="" aria-hidden="true" className={`absolute inset-0 w-full h-full object-cover ${photo ? '' : 'blur-[18px] brightness-50 scale-110'}`} />}
        <span aria-hidden="true" className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(4,8,12,.15) 0%, rgba(4,8,12,.95) 100%)' }} />
        <div className="relative h-full max-w-7xl mx-auto px-6 md:px-10 pt-8 pb-9 flex flex-col">
          <p className="text-sm text-white/80">
            <Link to={backTo} className="inline-flex items-center gap-1.5 hover:text-white"><ArrowLeft className="w-4 h-4" /> {backLabel}</Link>
            <span className="text-white/50"> / {doc.title}</span>
          </p>
          <div className="mt-auto flex flex-wrap items-end justify-between gap-6">
            <div className="flex items-end gap-5 min-w-0">
              {logo && (
                <span className="shrink-0 w-[84px] h-[84px] md:w-24 md:h-24 rounded-full bg-white p-3.5 flex items-center justify-center shadow-[0_10px_30px_-10px_rgba(0,0,0,.6)]">
                  <img src={logo} alt="" className="max-w-full max-h-full object-contain" />
                </span>
              )}
              <div className="min-w-0">
                <h1 className="text-white font-bold leading-[1.04] pb-1" style={{ fontFamily: SERIF, fontSize: 'clamp(2.3rem, 5.2vw, 4.4rem)' }}>{doc.title}</h1>
                <p className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[15.5px] text-[#dfe6ec]">
                  {(doc.range_dates || doc.event_date) && <span className="inline-flex items-center gap-1.5"><CalendarDays className="w-4 h-4" aria-hidden="true" />{doc.range_dates || doc.event_date}</span>}
                  {location && <span className="inline-flex items-center gap-1.5"><MapPin className="w-4 h-4" aria-hidden="true" />{location}</span>}
                </p>
              </div>
            </div>
            {cd ? (
              <div className="flex gap-2" aria-label={tt({ en: 'Time left', es: 'Tiempo restante' })} data-testid="festival-countdown">
                {[[cd[0], tt({ en: 'days', es: 'días' })], [cd[1], tt({ en: 'hours', es: 'horas' })], [cd[2], tt({ en: 'min', es: 'min' })]].map(([n, l]) => (
                  <div key={l} className="min-w-[70px] rounded-[4px] px-4 py-3 text-center" style={{ backgroundColor: 'rgba(4,8,12,.75)' }}>
                    <b className="block text-white text-[28px] leading-none tabular-nums" style={{ fontFamily: SERIF }}>{String(n).padStart(2, '0')}</b>
                    <small className="text-[12px]" style={{ color: BODY }}>{l}</small>
                  </div>
                ))}
              </div>
            ) : isPast && (
              <span className="rounded-[4px] px-3 py-2 text-[12px] font-extrabold tracking-[0.12em] uppercase text-white" style={{ backgroundColor: 'rgba(4,8,12,.75)', border: '1px solid rgba(255,255,255,.15)' }}>
                {tt({ en: 'Past edition', es: 'Edición pasada' })}
              </span>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 md:px-10 pt-7 flex flex-wrap items-center gap-4">
        {!isConf && <FollowButton kind="festival" targetId={doc.id} />}
        <SocialLinks socials={doc.socials} />
      </div>

      {/* Line-up as a typographic poster: headliners big, then bold, then the rest (Poster ⇄ Cards). */}
      {lineup.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 md:px-10 mt-16" data-testid="festival-lineup">
          <p className="text-center text-[12px] font-extrabold tracking-[0.16em] uppercase" style={{ color: LINK }}>{tt({ en: 'Line-up', es: 'Line-up' })}</p>
          {view === 'poster' ? (
            <div className="mt-5 text-center" data-testid="lineup-poster">
              {tiers.map((list, ti) => list.length > 0 && (
                <p key={ti} className={ti === 0 ? 'text-white font-bold leading-[1.18] mb-3' : ti === 1 ? 'text-white font-bold leading-[1.45] mb-2' : 'leading-[1.7]'}
                  style={ti === 0 ? { fontFamily: SERIF, fontSize: 'clamp(1.9rem, 4.2vw, 3.3rem)' } : ti === 1 ? { fontSize: 'clamp(1.2rem, 2.2vw, 1.75rem)' } : { fontSize: 17, color: BODY }}>
                  {list.map((a, i) => (
                    <React.Fragment key={a.id || a.slug || i}>
                      {i > 0 && <span aria-hidden="true" className="opacity-40"> · </span>}
                      <Link to={`/artists/${a.slug}`} className="hover:underline underline-offset-[6px] decoration-1" style={ti === 0 ? { textDecorationColor: LINK } : undefined}>{a.name}</Link>
                    </React.Fragment>
                  ))}
                </p>
              ))}
            </div>
          ) : (
            <div className="mt-7 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
              {lineup.map(a => (
                <HoverCard key={a.id} to={`/artists/${a.slug}`} aspect="aspect-square" testid="lineup-card"
                  img={gemImg(a.image_urls?.big) || gemImg(a.image_urls?.small)} imgStyle={{ filter: 'grayscale(1)' }}
                  title={a.name} strip={a.name} cta={tt({ en: 'View artist', es: 'Ver artista' })} />
              ))}
            </div>
          )}
          <div className="mt-7 flex justify-center gap-1.5" role="group" aria-label={tt({ en: 'Line-up view', es: 'Vista del line-up' })}>
            {[['poster', tt({ en: 'Poster', es: 'Cartel' })], ['cards', tt({ en: 'Cards', es: 'Tarjetas' })]].map(([k, l]) => (
              <button key={k} type="button" onClick={() => setView(k)} aria-pressed={view === k}
                className="rounded-[4px] px-4 py-2 text-[13px] font-bold transition-colors"
                style={view === k ? { backgroundColor: '#F2F5F8', color: '#04080C' } : { border: '1px solid var(--color-card-border, rgba(255,255,255,0.09))', color: BODY }}>{l}</button>
            ))}
          </div>
        </section>
      )}

      {isConf && <GemConferenceSchedule sessions={doc.sessions} />}

      {(doc.description || video) && (
        <section className={`max-w-7xl mx-auto px-6 md:px-10 mt-16 grid gap-10 lg:gap-12 items-start ${doc.description && video ? 'lg:grid-cols-[1.1fr_0.9fr]' : ''}`}>
          {doc.description && (
            <div>
              <H2 a={tt({ en: 'About', es: 'Sobre' })} b={isConf ? tt({ en: 'the conference', es: 'la conferencia' }) : tt({ en: 'the festival', es: 'el festival' })} />
              <div className="max-w-[64ch] text-[16.5px] leading-[1.85] [&_p]:mb-4" style={{ color: BODY }}
                dangerouslySetInnerHTML={{ __html: normalizeRichText(doc.description) }} />
            </div>
          )}
          {video && (
            // Cover + link: many legacy videos block embedding (rights owner), so we open YouTube.
            <a href={`https://www.youtube.com/watch?v=${video}`} target="_blank" rel="noreferrer" data-testid="festival-video"
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

      {flyer && photo && (
        <section className="max-w-7xl mx-auto px-6 md:px-10 mt-16" data-testid="festival-flyer">
          <H2 a={tt({ en: 'The', es: 'El' })} b={tt({ en: 'flyer', es: 'flyer' })} />
          <a href={flyer} target="_blank" rel="noreferrer" className="block max-w-[420px]"><img src={flyer} alt={doc.title} loading="lazy" className="w-full rounded-[4px]" /></a>
        </section>
      )}
      <style>{CARD_CSS}</style>
    </div>
  );
}
