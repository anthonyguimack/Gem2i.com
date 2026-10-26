/* Norules (`gem2i`) — shared pieces of the detail pages (boceto bocetos/norules-detail-pages.html):
 * page shell with the palette tone, breadcrumb, section, rich text, video/map embeds, socials,
 * the catalog cards with the legacy hover (event poster E1, artist A1), E3 event rows and a countdown. */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, CalendarDays, ChevronRight, Play, Facebook, Twitter, Instagram, Youtube, Linkedin, Globe, Music2 } from 'lucide-react';
import { useT } from '../../../lib/i18n';
import { normalizeRichText } from '../../../lib/richText';
import { gemImg } from '../GemCatalogBits';
import AccentTitle from '../AccentTitle';
import { HoverCard, NumChip, Where, When, usePageTone, useFmtDate, place, PageHero, PageHead, CARD_CSS, ACCENT, BODY, LINE } from './GemCatalogCards';
import { NBtn, NBtnLook } from './NBtn';

export const GEM_FONT = "'Manrope', sans-serif";
export const SERIF = "'Playfair Display', Georgia, serif";

const DETAIL_CSS = `
.gcard:hover .evstamp,.gcard:focus-visible .evstamp{opacity:0}
.evrow{position:relative;isolation:isolate;color:var(--gem-ink,#fff);transition:color .4s}
.evrow::before{content:'';position:absolute;inset:0;z-index:-1;background:#0E1216;transform:scaleX(0);transform-origin:right center;transition:transform 1s cubic-bezier(.19,1,.22,1)}
.evrow:hover::before,.evrow:focus-visible::before{transform:scaleX(1);transform-origin:left center}
.evrow:hover,.evrow:focus-visible{color:#fff}
@media (prefers-reduced-motion:reduce){.evrow::before{transition:none}}
`;

/** Page root: palette tone (light palette → dark text), card CSS, max-width column. */
export function DetailShell({ testid, children }) {
  const tone = usePageTone();
  return (
    <div className={`min-h-screen pb-24 ${tone.className}`} style={{ backgroundColor: 'var(--color-page-bg, #04080C)', fontFamily: GEM_FONT, ...tone.style }} data-testid={testid}>
      <div className="max-w-7xl mx-auto px-6 md:px-10">{children}</div>
      <style>{CARD_CSS + DETAIL_CSS}</style>
    </div>
  );
}

/** Listing page root: palette tone, the page's CMS hero, eyebrow + accent title, card CSS. */
export function ListShell({ page, testid, eyebrow, title, intro, head, children }) {
  const tone = usePageTone();
  return (
    <div className={`min-h-screen pb-24 ${tone.className}`} style={{ backgroundColor: 'var(--color-page-bg, #04080C)', fontFamily: GEM_FONT, ...tone.style }} data-testid={testid}>
      {page && <PageHero page={page} />}
      <PageHead eyebrow={eyebrow} title={title}>
        {intro && <p className="mt-4 max-w-3xl text-base md:text-[17px] leading-[1.7]" style={{ color: BODY }}>{intro}</p>}
        {head}
      </PageHead>
      <div className="max-w-7xl mx-auto px-6 md:px-10 mt-8">{children}</div>
      <style>{CARD_CSS + DETAIL_CSS}</style>
    </div>
  );
}

export const slugify = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
/** URL slug of a Maps & Locations office → /map/:slug (NorulesOffice). */
export const officeSlug = (o) => o.slug || slugify(o.name || o.title?.en || o.title);

export function Crumb({ items }) {
  return (
    <nav className="pt-8 pb-5 flex flex-wrap items-center gap-1.5 text-[13.5px]" style={{ color: BODY }} aria-label="Breadcrumb">
      {items.map(([label, to], i) => (
        <React.Fragment key={label}>
          {i > 0 && <ChevronRight className="w-3.5 h-3.5 opacity-60" aria-hidden="true" />}
          {to ? <Link to={to} className="nl font-semibold">{label}</Link>
            : <span className="font-semibold" style={{ color: 'var(--gem-ink, #fff)' }}>{label}</span>}
        </React.Fragment>
      ))}
    </nav>
  );
}

/** Section with a hairline on top and an accent title ("About the night"). */
export function Section({ title, children, testid, first }) {
  return (
    <section className={`py-12 md:py-14 ${first ? '' : 'border-t'}`} style={{ borderColor: LINE }} data-testid={testid}>
      {title && (
        <h2 className="text-white font-bold mb-6 leading-[1.1]" style={{ fontFamily: SERIF, fontSize: 'clamp(1.7rem, 3vw, 2.4rem)' }}>
          <AccentTitle text={title} />
        </h2>
      )}
      {children}
    </section>
  );
}

export const Rich = ({ html }) => (html ? (
  <div className="max-w-[68ch] text-base md:text-[16.5px] leading-[1.85] [&_p]:mb-3.5" style={{ color: BODY }}
    dangerouslySetInnerHTML={{ __html: normalizeRichText(html) }} />
) : null);

/** The legacy `video` field is an <iframe> snippet; keep only its src (forced to https). The player loads on
 *  click over a cover (YouTube thumbnail) and a "Watch on YouTube/Vimeo" link is always there, because some
 *  rights owners block embedding (the player then only shows "Video unavailable"). */
export function VideoEmbed({ html, title }) {
  const tt = useT();
  const [play, setPlay] = useState(false);
  const src = ((String(html || '').match(/src=["']([^"']+)["']/) || [])[1] || '').replace(/^http:\/\//, 'https://').trim();
  if (!src) return null;
  const yt = (src.match(/(?:youtube(?:-nocookie)?\.com\/embed\/|youtu\.be\/)([\w-]{11})/) || [])[1];
  const vm = (src.match(/vimeo\.com\/(?:video\/)?(\d+)/) || [])[1];
  const watch = yt ? `https://www.youtube.com/watch?v=${yt}` : vm ? `https://vimeo.com/${vm}` : src;
  const thumb = yt ? `https://img.youtube.com/vi/${yt}/hqdefault.jpg` : '';
  const auto = src + (src.includes('?') ? '&' : '?') + 'autoplay=1';
  return (
    <div>
      <div className="relative aspect-video rounded-[22px] overflow-hidden bg-black">
        {play ? (
          <iframe src={auto} title={title} className="w-full h-full border-0" allowFullScreen allow="autoplay; encrypted-media; picture-in-picture" />
        ) : (
          <button type="button" onClick={() => setPlay(true)} className="group absolute inset-0 w-full h-full text-white" aria-label={tt({ en: 'Play video', es: 'Reproducir vídeo' })}>
            {thumb && <img src={thumb} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-75 transition-[transform,opacity] duration-700 ease-out group-hover:scale-105 group-hover:opacity-60" />}
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[72px] h-[72px] rounded-full bg-white flex items-center justify-center transition-transform duration-300 group-hover:scale-110" style={{ color: '#0E1216' }}>
              <Play className="w-7 h-7 ml-1" aria-hidden="true" />
            </span>
          </button>
        )}
      </div>
      <NBtn href={watch} variant="s" size="sm" icon="ext" className="mt-3">{yt ? tt({ en: 'Watch on YouTube', es: 'Ver en YouTube' }) : vm ? tt({ en: 'Watch on Vimeo', es: 'Ver en Vimeo' }) : tt({ en: 'Open video', es: 'Abrir vídeo' })}</NBtn>
    </div>
  );
}

export function MapEmbed({ src, title }) {
  if (!src || !/^https?:\/\//.test(src)) return null;
  return (
    <div className="h-[300px] rounded-[22px] overflow-hidden" style={{ border: `1px solid ${LINE}` }}>
      <iframe src={src} title={title} className="w-full h-full border-0 grayscale" loading="lazy" allowFullScreen />
    </div>
  );
}

const SOCIAL_ICON = { facebook: Facebook, twitter: Twitter, x: Twitter, instagram: Instagram, youtube: Youtube, linkedin: Linkedin,
  soundcloud: Music2, spotify: Music2, mixcloud: Music2, beatport: Music2, website: Globe, web: Globe };
const withProtocol = (u) => (/^https?:\/\//i.test(u) ? u : `https://${String(u).replace(/^\/+/, '')}`);

/** Social links as round icons (name in the tooltip + aria-label). */
export function Socials({ socials }) {
  const entries = Object.entries(socials || {}).filter(([, v]) => v && String(v).trim());
  if (!entries.length) return null;
  return (
    <div className="mt-6 flex flex-wrap gap-2" data-testid="social-icons">
      {entries.map(([k, v]) => {
        const Icon = SOCIAL_ICON[k.toLowerCase()] || Globe;
        const label = k.charAt(0).toUpperCase() + k.slice(1);
        return (
          <a key={k} href={withProtocol(v)} target="_blank" rel="noreferrer" title={label} aria-label={label}
            className="nsoc w-11 h-11 rounded-full flex items-center justify-center transition-[background-color,color,border-color,transform] duration-200 active:scale-95">
            <Icon className="w-[18px] h-[18px]" aria-hidden="true" />
          </a>
        );
      })}
    </div>
  );
}

const plainOf = (html) => (html ? (new DOMParser().parseFromString(html, 'text/html').body.textContent || '').replace(/\s+/g, ' ').trim() : '');

/** Two columns: text on the left, video (or an image, e.g. the official flyer) on the right; stacks on mobile.
 *  `lead` = the CMS summary as an intro line, shown only when it isn't just the start of the text. */
export function TextAndVideo({ title, html, video, socials, lead, chips, aside }) {
  const leadText = plainOf(lead);
  const showLead = leadText && !plainOf(html).startsWith(leadText.slice(0, 60));
  const side = video ? <VideoEmbed html={video} title={title} /> : aside;
  if (!html && !side && !socials && !showLead) return null;
  return (
    <Section title={title}>
      <div className={`grid gap-10 items-start ${side && (html || showLead) ? 'lg:grid-cols-[1.2fr_1fr]' : ''}`}>
        <div>
          {showLead && <p className="mb-4 max-w-[60ch] text-white text-[19px] md:text-[21px] leading-[1.6] font-medium">{leadText}</p>}
          {chips?.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-1.5">
              {chips.map(c => <span key={c} className="rounded-full px-3 py-1 text-[12.5px] font-bold" style={{ border: `1px solid ${LINE}`, color: 'var(--gem-ink, #fff)' }}>{c}</span>)}
            </div>
          )}
          <Rich html={html} /><Socials socials={socials} />
        </div>
        {side}
      </div>
    </Section>
  );
}

export const typeLabel = (t) => ({ eticket: 'E-Ticket', guest_list: 'Guest list', epass: 'E-Pass', info: 'Info' }[t]);

function DateStamp({ date }) {
  const d = date ? new Date(`${String(date).slice(0, 10)}T12:00:00`) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  return (
    <span className="evstamp absolute right-3.5 top-3.5 z-[3] rounded-xl bg-white px-2.5 py-1.5 text-center leading-none transition-opacity duration-300" style={{ color: '#0E1216' }}>
      <b className="block text-[22px] font-extrabold tabular-nums">{d.getDate()}</b>
      <small className="text-[10px] font-extrabold tracking-[0.18em]">{d.toLocaleString('en', { month: 'short' }).toUpperCase()}</small>
    </span>
  );
}

function useEventCta() {
  const tt = useT();
  return (e) => (e.type === 'eticket' || e.external_ticket_system ? tt({ en: 'Buy tickets', es: 'Comprar entradas' })
    : e.type === 'guest_list' ? tt({ en: 'Join guest list', es: 'Unirme a la lista' }) : tt({ en: 'View details', es: 'Ver detalles' }));
}

/** E1 poster card (same as /events). */
export function EventPosterCard({ e }) {
  const fmt = useFmtDate();
  const cta = useEventCta();
  const where = place(e.venue?.name, e.venue?.city || e.venue?.country);
  const label = typeLabel(e.type);
  return (
    <HoverCard to={`/events/${e.slug}`} testid="event-card" aspect="aspect-[3/4]"
      img={gemImg(e.image_urls?.flyer) || gemImg(e.image_urls?.logo)}
      top={<>{label && <span className="absolute left-3.5 top-3.5 z-[3] px-3 py-1.5 text-[11px] font-bold tracking-[0.16em] uppercase text-white rounded-md" style={{ backgroundColor: e.type === 'guest_list' ? '#1f8f55' : ACCENT }}>{label}</span>}<DateStamp date={e.event_date} /></>}
      title={e.title} cta={cta(e)}
      meta={[<When>{fmt(e.event_date)}</When>, where && <Where>{where}</Where>]} />
  );
}

/** A1 artist card (same as /artists). */
export function ArtistHoverCard({ a, rank }) {
  const where = place(a.state || a.city, a.country);
  return (
    <HoverCard to={`/artists/${a.slug}`} testid="artist-card" aspect="aspect-square"
      img={gemImg(a.image_urls?.big) || gemImg(a.image_urls?.small)} imgStyle={{ filter: 'grayscale(1)' }}
      top={<NumChip n={rank} />} logo={gemImg(a.image_urls?.logo)} title={a.name} strip={a.name}
      meta={[where && <Where>{where}</Where>]}
      extra={a.genres?.length > 0 && (
        <span className="mt-2 flex flex-wrap gap-1.5">
          {a.genres.slice(0, 3).map(g => <span key={g} className="text-[12px] px-2.5 py-0.5 rounded-full bg-white/[0.12] text-white">{g}</span>)}
        </span>
      )} />
  );
}

/** E3 list row (same as the /events List view). */
export function EventRow({ e }) {
  const cta = useEventCta();
  const d = e.event_date ? new Date(`${String(e.event_date).slice(0, 10)}T12:00:00`) : null;
  const ok = d && !Number.isNaN(d.getTime());
  const time = /T\d\d:\d\d/.test(e.open_time || '') ? e.open_time.slice(11, 16) : '';
  return (
    <Link to={`/events/${e.slug}`} data-testid="event-row" className="evrow grid grid-cols-[72px_1fr_auto] md:grid-cols-[84px_100px_1fr_auto] gap-4 md:gap-6 items-center px-2.5 py-3 border-b" style={{ borderColor: LINE }}>
      <span className="block w-[72px] h-[90px] md:w-[84px] md:h-[104px] rounded-xl overflow-hidden" style={{ backgroundColor: '#0A121A' }}>
        {(e.image_urls?.flyer || e.image_urls?.logo) && <img src={gemImg(e.image_urls?.flyer) || gemImg(e.image_urls?.logo)} alt="" loading="lazy" className="w-full h-full object-cover" />}
      </span>
      <span className="hidden md:block">
        {ok && <b className="block text-[36px] font-extrabold leading-none tabular-nums">{d.getDate()}</b>}
        <small className="text-[12px] font-extrabold tracking-[0.16em] opacity-70">{ok && d.toLocaleString('en', { month: 'short' }).toUpperCase()}{time && ` · ${time}`}</small>
      </span>
      <span>
        {typeLabel(e.type) && <span className="text-[11px] font-extrabold tracking-[0.16em] uppercase opacity-70">{typeLabel(e.type)}</span>}
        <span className="mt-1 block text-[21px] font-bold leading-tight" style={{ fontFamily: SERIF }}>{e.title}</span>
      </span>
      <NBtnLook variant="c" className="shrink-0"><span className="hidden sm:inline">{cta(e)}</span></NBtnLook>
    </Link>
  );
}

/** Days / hours / minutes until `iso`; nothing once it has passed. */
export function Countdown({ iso, label }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(id); }, []);
  const t = iso ? new Date(`${String(iso).slice(0, 10)}T12:00:00`).getTime() : NaN;
  if (!(t > now)) return null;
  const s = (t - now) / 1000;
  const parts = [[Math.floor(s / 86400), 'DAYS'], [Math.floor((s % 86400) / 3600), 'HRS'], [Math.floor((s % 3600) / 60), 'MIN']];
  return (
    <div>
      <small className="text-[11px] font-extrabold tracking-[0.2em] opacity-80">{label}</small>
      <div className="mt-1.5 flex gap-2">
        {parts.map(([n, l]) => (
          <span key={l} className="min-w-[64px] rounded-[14px] px-3 py-2.5 text-center backdrop-blur-md" style={{ backgroundColor: 'rgba(255,255,255,.12)' }}>
            <b className="block text-[26px] font-extrabold tabular-nums">{String(n).padStart(2, '0')}</b>
            <small className="text-[10px] tracking-[0.16em] opacity-75">{l}</small>
          </span>
        ))}
      </div>
    </div>
  );
}

/** Full-bleed photo hero with a dark gradient; children sit at the bottom. */
export function PhotoHero({ img, grayscale, minH = 'min-h-[460px] md:min-h-[540px]', side, children }) {
  return (
    <div className={`gem-tone-dark relative rounded-[30px] overflow-hidden flex items-end text-white ${minH}`} style={{ backgroundColor: '#0E1216' }}>
      {img && <img src={img} alt="" className="absolute inset-0 w-full h-full object-cover" style={grayscale ? { filter: 'grayscale(1)' } : undefined} />}
      <span aria-hidden="true" className="absolute inset-0" style={{ background: side
        ? 'linear-gradient(90deg,rgba(10,12,15,.88) 0%,rgba(10,12,15,.35) 60%,transparent),linear-gradient(transparent 50%,rgba(10,12,15,.8))'
        : 'linear-gradient(transparent 25%,rgba(10,12,15,.92))' }} />
      <div className="relative z-[1] w-full p-6 md:p-10">{children}</div>
    </div>
  );
}

export const HeroChip = ({ icon: Icon, children }) => (children ? (
  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 mr-1.5 mb-1.5 text-[12.5px] font-bold backdrop-blur-md" style={{ backgroundColor: 'rgba(255,255,255,.14)' }}>
    {Icon && <Icon className="w-3.5 h-3.5" aria-hidden="true" />}{children}
  </span>
) : null);

export { MapPin, CalendarDays };
