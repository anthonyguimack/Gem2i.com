/* Norules (`gem2i`) — own copy of this inner page (template = package, D-GEM-2026-15). */
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, CalendarDays } from 'lucide-react';
import { gemAPI } from '../../../lib/api';
import { normalizeRichText } from '../../../lib/richText';
import { useT } from '../../../lib/i18n';
import { gemImg, FollowButton, SkeletonGrid } from '../../../components/gem2i/GemCatalogBits';
import { LogoDisc, HoverCard, Segmented, When, Where, useFmtDate, place, BODY, LINE } from '../../../components/gem2i/norules/GemCatalogCards';
import AccentTitle from '../../../components/gem2i/AccentTitle';
import { NBtn } from '../../../components/gem2i/norules/NBtn';
import {
  DetailShell, Crumb, Section, TextAndVideo, PhotoHero, HeroChip, ArtistHoverCard, MapEmbed, Countdown, SERIF,
} from '../../../components/gem2i/norules/NorulesDetailBits';
import { NotFoundShell } from './NorulesArtistDetail';

const today = () => new Date().toISOString().slice(0, 10);

/** Line-up as a festival poster: first 3 names biggest, next 5 medium, the rest small (CMS order). */
function LineupPoster({ artists, caption }) {
  const tiers = [[artists.slice(0, 3), 'text-[clamp(2rem,4.6vw,3.8rem)] font-extrabold tracking-[-0.04em] leading-[1.05]'],
    [artists.slice(3, 8), 'text-[clamp(1.4rem,2.8vw,2.3rem)] font-extrabold tracking-[-0.03em] leading-[1.15]'],
    [artists.slice(8), 'text-[clamp(1rem,1.6vw,1.3rem)] font-bold leading-[1.5] text-[#B9C2CB]']];
  return (
    <div className="gem-tone-dark rounded-[28px] px-6 md:px-9 py-11 text-center" style={{ backgroundColor: '#0E1216' }} data-testid="lineup-poster">
      {caption && <p className="mb-4 text-[12px] font-extrabold tracking-[0.3em] uppercase" style={{ color: '#8A949E' }}>{caption}</p>}
      {tiers.filter(([l]) => l.length).map(([list, cls], i) => (
        <div key={i} className={cls}>
          {list.map((a, j) => (
            <React.Fragment key={a.id}>
              {j > 0 && <span aria-hidden="true" className="mx-[.35em]" style={{ color: '#3A434C' }}>•</span>}
              <Link to={`/artists/${a.slug}`} className="text-white transition-colors hover:text-[#7CC4FF]">{a.name}</Link>
            </React.Fragment>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Conference programme: one tab per day, sessions by time; the running one is marked live. */
function Schedule({ sessions }) {
  const tt = useT();
  const fmt = useFmtDate();
  const days = useMemo(() => {
    const by = {};
    (sessions || []).filter(s => s.visible !== false && s.title).forEach(s => { (by[s.date || ''] = by[s.date || ''] || []).push(s); });
    return Object.keys(by).sort().map(d => ({ date: d, rows: by[d].sort((a, b) => String(a.start).localeCompare(String(b.start))) }));
  }, [sessions]);
  const [day, setDay] = useState(0);
  if (!days.length) return null;
  const cur = days[Math.min(day, days.length - 1)];
  const now = new Date();
  const nowDay = now.toISOString().slice(0, 10);
  const nowHm = now.toTimeString().slice(0, 5);
  return (
    <Section title={tt({ en: 'Conference schedule', es: 'Programa de la conferencia' })} testid="conference-schedule">
      {days.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2" role="tablist">
          {days.map((d, i) => (
            <button key={d.date || i} type="button" role="tab" aria-selected={i === day} onClick={() => setDay(i)}
              className="rounded-full px-4 py-2 text-[13px] font-bold transition-colors"
              style={i === day ? { backgroundColor: 'var(--color-seg-on, #fff)', color: 'var(--color-seg-on-text, #04080C)' } : { border: `1px solid ${LINE}`, color: BODY }}>
              {tt({ en: 'Day', es: 'Día' })} {i + 1}{d.date && ` · ${fmt(d.date, { month: 'short', day: 'numeric' })}`}
            </button>
          ))}
        </div>
      )}
      <div className="border-t" style={{ borderColor: LINE }}>
        {cur.rows.map((s, i) => {
          const live = s.date === nowDay && s.start && s.end && s.start <= nowHm && nowHm < s.end;
          return (
            <div key={s.key || i} className="grid grid-cols-[84px_1fr] md:grid-cols-[120px_1fr_auto] gap-4 md:gap-5 items-center py-4 px-1.5 border-b" style={{ borderColor: LINE }}>
              <span className="text-white text-[20px] font-extrabold tabular-nums">{s.start}{s.end && <small className="block text-[12.5px] font-semibold" style={{ color: BODY }}>{tt({ en: 'to', es: 'a' })} {s.end}</small>}</span>
              <span><b className="block text-white text-[18px]">{s.title}</b>{s.description && <span className="block mt-1 text-[14.5px]" style={{ color: BODY }}>{s.description}</span>}</span>
              {live && <span className="hidden md:inline rounded-full px-2.5 py-1 text-[11px] font-extrabold tracking-[0.14em]" style={{ color: '#178A4C', backgroundColor: '#E4F6EC' }}>● {tt({ en: 'LIVE NOW', es: 'EN VIVO' })}</span>}
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/** Shared detail page for festivals AND conferences (same document shape) — boceto norules-detail-pages.html
 *  (Festival / Conference): photo hero with dates, place, logo and a countdown when upcoming; festival =
 *  line-up poster ⇄ A1 cards; conference = day-tab schedule + more conferences. `kind` switches the API call. */
export default function NorulesFestivalDetail({ kind = 'festival' }) {
  const { slug } = useParams();
  const tt = useT();
  const fmt = useFmtDate();
  const [doc, setDoc] = useState(null);
  const [missing, setMissing] = useState(false);
  const [view, setView] = useState('poster');
  const [more, setMore] = useState([]);
  const isConf = kind === 'conference';

  useEffect(() => {
    let alive = true;
    setDoc(null); setMissing(false); setMore([]);
    const call = isConf ? gemAPI.conferenceDetail(slug) : gemAPI.festivalDetail(slug);
    call.then(r => { if (alive) setDoc(r.data); }).catch(() => { if (alive) setMissing(true); });
    if (isConf) gemAPI.conferences({ limit: 5 }).then(r => { if (alive) setMore((r.data?.items || []).filter(c => c.slug !== slug).slice(0, 4)); }).catch(() => {});
    return () => { alive = false; };
  }, [slug, isConf]);

  const backLabel = tt({ en: 'Festivals', es: 'Festivales' });

  if (missing) {
    return (
      <NotFoundShell backTo="/festivals" backLabel={backLabel}>
        {isConf ? tt({ en: 'Conference not found.', es: 'Conferencia no encontrada.' }) : tt({ en: 'Festival not found.', es: 'Festival no encontrado.' })}
      </NotFoundShell>
    );
  }
  if (!doc) {
    return <DetailShell><div className="py-24"><SkeletonGrid count={4} /></div></DetailShell>;
  }

  const location = place(doc.address, doc.city, doc.state, doc.country);
  const dates = doc.range_dates || fmt(doc.event_date, { month: 'long', day: 'numeric', year: 'numeric' });
  const upcoming = doc.event_date && doc.event_date.slice(0, 10) >= today();
  const lineup = doc.lineup_artists || [];
  const web = doc.socials?.website;

  return (
    <DetailShell testid={`gem2i-${kind}-detail`}>
      <Crumb items={[[backLabel, '/festivals'], [doc.title]]} />

      <PhotoHero img={gemImg(doc.image_urls?.view) || gemImg(doc.image_urls?.flyer)} minH={isConf ? 'min-h-[400px] md:min-h-[460px]' : 'min-h-[440px] md:min-h-[560px]'}>
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] items-end">
          <div>
            <HeroChip icon={CalendarDays}>{dates}</HeroChip>
            <HeroChip icon={MapPin}>{location}</HeroChip>
            <h1 className="mt-2 mb-4 font-bold leading-[.92] text-white" style={{ fontFamily: SERIF, fontSize: 'clamp(2.8rem, 7vw, 6rem)' }}>
              <AccentTitle text={doc.title} />
            </h1>
            <div className="flex flex-wrap gap-3">
              {!isConf && <FollowButton kind="festival" targetId={doc.id} className="nb-follow nb-follow-g" />}
              {web && <NBtn href={web} variant="g" icon="ext">{tt({ en: 'Official website', es: 'Web oficial' })}</NBtn>}
            </div>
          </div>
          <div className="flex items-end gap-5">
            {upcoming && <Countdown iso={doc.event_date} label={tt({ en: 'STARTS IN', es: 'EMPIEZA EN' })} />}
            {doc.image_urls?.logo && <LogoDisc src={gemImg(doc.image_urls.logo)} size={110} className="hidden md:flex shrink-0" />}
          </div>
        </div>
      </PhotoHero>

      {isConf && <div className="mt-6"><Schedule sessions={doc.sessions} /></div>}

      {lineup.length > 0 && (
        <Section title={tt({ en: 'Line-up', es: 'Line-up' })} testid="festival-lineup" first={!isConf}>
          <div className="mb-5 flex justify-center">
            <Segmented value={view} onChange={setView} label={tt({ en: 'Line-up view', es: 'Vista del line-up' })} options={[
              { value: 'poster', label: tt({ en: 'Poster', es: 'Cartel' }) }, { value: 'cards', label: tt({ en: 'Cards', es: 'Cards' }) },
            ]} />
          </div>
          {view === 'poster'
            ? <LineupPoster artists={lineup} caption={[dates, doc.address].filter(Boolean).join(' — ')} />
            : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">{lineup.map(a => <ArtistHoverCard key={a.id} a={a} />)}</div>}
        </Section>
      )}

      <TextAndVideo title={isConf ? tt({ en: 'About the conference', es: 'Sobre la conferencia' }) : tt({ en: 'About the festival', es: 'Sobre el festival' })}
        html={doc.description} video={doc.video} socials={doc.socials}
        aside={doc.image_urls?.flyer && <img src={gemImg(doc.image_urls.flyer)} alt={tt({ en: 'Official flyer', es: 'Flyer oficial' })} loading="lazy" className="w-full rounded-[22px]" />} />

      {doc.artists_schedule && (
        <Section title={tt({ en: 'Set times', es: 'Horarios' })} testid="festival-set-times">
          <div className="max-w-full [&_img]:max-w-full [&_img]:rounded-2xl text-[16px] leading-[1.8]" style={{ color: BODY }} dangerouslySetInnerHTML={{ __html: normalizeRichText(doc.artists_schedule) }} />
        </Section>
      )}

      {doc.map && (
        <Section title={tt({ en: 'Where', es: 'Dónde' })}>
          <div className={`grid gap-6 items-start ${doc.video && doc.image_urls?.flyer ? 'lg:grid-cols-[1.4fr_1fr]' : ''}`}>
            <MapEmbed src={doc.map} title={doc.title} />
            {doc.video && doc.image_urls?.flyer && <img src={gemImg(doc.image_urls.flyer)} alt={tt({ en: 'Official flyer', es: 'Flyer oficial' })} loading="lazy" className="w-full rounded-[22px]" />}
          </div>
          {location && <p className="mt-3 inline-flex items-start gap-1.5 text-[15px]" style={{ color: BODY }}><MapPin className="w-4 h-4 mt-1 shrink-0" aria-hidden="true" />{location}</p>}
        </Section>
      )}

      {isConf && more.length > 0 && (
        <Section title={tt({ en: 'More conferences', es: 'Más conferencias' })}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {more.map(c => (
              <HoverCard key={c.id} to={`/conferences/${c.slug}`} testid="conference-card" aspect="aspect-[3/4]"
                img={gemImg(c.image_urls?.view) || gemImg(c.image_urls?.flyer)} logo={gemImg(c.image_urls?.logo)} title={c.title} strip={c.title}
                meta={[(c.range_dates || c.event_date) && <When>{c.range_dates || fmt(c.event_date)}</When>, place(c.city || c.state, c.country) && <Where>{place(c.city || c.state, c.country)}</Where>]} />
            ))}
          </div>
        </Section>
      )}
    </DetailShell>
  );
}
