import AccentTitle from './AccentTitle';
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MapPin } from 'lucide-react';
import { useT } from '../../lib/i18n';
import { useAuth } from '../../lib/auth';
import { resolveCta } from '../../lib/ctaActions';
import { gemImg } from './GemCatalogBits';

/**
 * gem2i template heroes — one per template (approved sketches 2026-10-16):
 *   gem2i     (Norules)    → U · Ultra-style stage (A stays for inner pages)
 *   gem2i_02  (Gem2i)      → B · Aurex + evento destacado (approved)
 *   gem2i_03  (Gem2i - 03) → C · Cinematográfico centrado
 * Content comes from the first CMS hero slide (title, subtitle, description,
 * up to 3 buttons with their actions, background photo or video); the defaults
 * below only fill what the slide leaves empty.
 */
const ACCENT = 'var(--color-accent, #3287B7)';
const LINK = 'var(--color-link, #5FB2E0)';
const BODY = '#c7d2dc';
const DEFAULT_BG = 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=2000&q=80';
const DEFAULTS = {
  title: { en: 'GEM2i\nNetwork', es: 'GEM2i\nNetwork' },
  kicker: { en: 'Global Entertainment', es: 'Global Entertainment' },
  description: {
    en: 'A private membership network for the entertainment industry: guest lists, QR e-passes and e-tickets for the best events, festivals and conferences in the world.',
    es: 'Una red privada de miembros para la industria del entretenimiento: listas de invitados, pases QR y e-tickets para los mejores eventos, festivales y conferencias del mundo.',
  },
};

function useSlideButtons(slide) {
  const tt = useT();
  const { user } = useAuth();
  const loggedIn = !!user;
  const raw = slide ? [
    { text: slide.button_text, url: tt(slide.button_url || slide.button_link), target: slide.window_open === 'new' ? '_blank' : '_self', action: slide.button_action },
    { text: slide.button_2_text, url: tt(slide.button_2_url), target: slide.button_2_window_open === 'new' ? '_blank' : '_self', action: slide.button_2_action },
    { text: slide.button_3_text, url: tt(slide.button_3_url), target: slide.button_3_window_open === 'new' ? '_blank' : '_self', action: slide.button_3_action },
  ] : [];
  const btns = raw.filter(b => tt(b.text))
    .map(b => { const r = resolveCta(b, { loggedIn }); return r.visible ? { ...b, label: tt(b.text), href: r.href, target: r.target, action: r.action } : null; })
    .filter(Boolean);
  if (btns.length) return btns;
  return [
    { label: tt({ en: 'More information', es: 'Más información' }), href: '#about', target: '_self' },
    { label: tt({ en: 'Join with an invite', es: 'Únete con invitación' }), href: '/membership-enrollment', target: '_self' },
    { label: tt({ en: 'Upcoming events', es: 'Próximos eventos' }), href: '/events', target: '_self' },
  ];
}

function onCta(b, loggedIn) {
  return (e) => {
    if (b.action === 'login') {
      e.preventDefault();
      if (loggedIn) window.location.assign('/my-account');
      else window.dispatchEvent(new CustomEvent('gem2i:open-login'));
    }
  };
}

function Btn({ b, variant }) {
  const { user } = useAuth();
  const common = { href: b.href, target: b.target, rel: b.target === '_blank' ? 'noopener noreferrer' : undefined, onClick: onCta(b, !!user) };
  if (variant === 'round') {
    // Port of aurexnetwork.com's hero CTA: the accent circle (56/64px) fills the
    // whole pill on hover/focus (width transition, 500ms), the arrow nudges
    // right and the label stays white on the gem2i blue.
    return (
      <a {...common} className="group relative inline-flex items-center flex-none rounded-full overflow-hidden h-14 md:h-16 outline-none focus-visible:ring-2 focus-visible:ring-white/70">
        <span aria-hidden="true" className="absolute left-0 top-0 h-full w-14 md:w-16 group-hover:w-full group-focus-visible:w-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none"
          style={{ backgroundColor: ACCENT, boxShadow: '0 10px 24px -12px rgba(0,0,0,.5)' }} />
        <span className="relative z-10 inline-flex items-center justify-center flex-none w-14 h-14 md:w-16 md:h-16 text-white">
          <ArrowRight className="w-5 h-5 transition-transform duration-500 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
        </span>
        <span className="relative z-10 text-[15px] font-semibold whitespace-nowrap text-white pl-1 pr-7">{b.label}</span>
      </a>
    );
  }
  if (variant === 'solid') {
    return <a {...common} className="gem-press inline-flex px-7 py-3.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90" style={{ backgroundColor: ACCENT }}>{b.label}</a>;
  }
  return <a {...common} className="gem-press inline-flex px-6 py-3 rounded-full text-[15px] font-medium text-white border border-white/60 transition-colors hover:bg-white/10">{b.label}</a>;
}

function Background({ slide, veil }) {
  const video = slide?.video_embed;
  const bg = gemImg(slide?.background || slide?.background_image || slide?.photo) || DEFAULT_BG;
  return (
    <>
      {video && /\.(mp4|webm)(\?|$)/i.test(video) ? (
        <video className="absolute inset-0 w-full h-full object-cover" src={gemImg(video)} autoPlay muted loop playsInline poster={bg} />
      ) : (
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${bg})` }} />
      )}
      <div className="absolute inset-0" style={{ background: veil }} />
    </>
  );
}

const LEFT_VEIL = 'linear-gradient(90deg, rgba(4,8,12,.96) 0%, rgba(4,8,12,.85) 30%, rgba(4,8,12,.35) 62%, rgba(4,8,12,.12) 100%)';
const FULL_VEIL = 'linear-gradient(180deg, rgba(4,8,12,.55) 0%, rgba(4,8,12,.45) 50%, rgba(4,8,12,.94) 100%)';
const Glow = () => <div aria-hidden="true" className="absolute -right-36 -top-40 w-[520px] h-[520px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(50,135,183,.5), rgba(50,135,183,0) 70%)' }} />;
const Scroll = () => <div aria-hidden="true" className="hidden md:block absolute left-6 bottom-8 text-[10px] tracking-[0.35em] text-white/50" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>SCROLL</div>;

function Title({ text, className, style }) {
  const lines = String(text || '').split('\n');
  return <h1 className={`text-white font-bold leading-[1.02] tracking-[-0.01em] ${className}`} style={style}><AccentTitle text={text} /></h1>;
}

// ── Shared hero carousel (A, B and C) ───────────────────────────────────────
// With 2+ CMS slides: backgrounds cross-fade, copy fades in, auto-advance every
// 7s (paused on hover/focus, hidden tab, or reduced motion), dots + arrows +
// ←/→. 0-1 slides → a single static hero. Every hero fits the visible viewport
// under the fixed header (88px) + ticker (42px): height = 100svh - 130px, and
// the controls sit in the content flow so they are never below the fold.
const ROTATE_MS = 7000;
const noHtml = (v) => String(v || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/[ \t]+/g, ' ').trim();
const HERO_IN_CSS = '@media (prefers-reduced-motion: no-preference){.gem-hero-in{animation:gemHeroIn .8s cubic-bezier(.16,1,.3,1)}}@keyframes gemHeroIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}';

function useHeroCarousel(slide, slides, hold) {
  const list = (slides && slides.length ? slides : [slide]).filter((x, i) => x || i === 0);
  const many = list.length > 1;
  const [at, setAt] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const cur = list[Math.min(at, list.length - 1)];
  const go = React.useCallback((d) => setAt(i => (i + d + list.length) % list.length), [list.length]);
  React.useEffect(() => {
    // `hold(slide)` → stay on that slide (Hero U keeps a video slide playing).
    if (!many || paused || (hold && hold(cur))) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const id = setInterval(() => { if (!document.hidden) go(1); }, ROTATE_MS);
    return () => clearInterval(id);
  }, [many, paused, go, at, hold, cur]);
  const sectionProps = {
    'aria-roledescription': many ? 'carousel' : undefined,
    onMouseEnter: () => setPaused(true), onMouseLeave: () => setPaused(false),
    onFocus: () => setPaused(true), onBlur: () => setPaused(false),
    onKeyDown: many ? (e => { if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); }) : undefined,
  };
  return { list, many, at, setAt, cur, go, sectionProps };
}

/** Events pinned to the current slide (Events manager → "Show in these hero
 *  slides"); an event can sit in one or many slides. */
const pinnedTo = (linked, slide) => (slide?.id ? (linked || []).filter(e => (e.hero_slide_ids || []).includes(slide.id)) : []);

/** Featured-event card (Hero B; Hero A when the slide has a pinned event). */
function EventCard({ event, label }) {
  const tt = useT();
  const flyer = gemImg(event.image_urls?.flyer) || gemImg(event.image_urls?.logo);
  const when = event.event_date ? new Date(`${event.event_date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) : '';
  const ticket = event.type === 'eticket' || !!event.external_ticket_system;
  return (
    <Link to={`/events/${event.slug}`} className="hidden lg:block rounded-2xl p-3.5 border border-white/10 transition-transform duration-200 hover:-translate-y-1 gem-hero-in" style={{ backgroundColor: 'rgba(8,13,19,.88)' }} data-testid="gem2i-hero-event">
      <div className="h-40 rounded-xl bg-cover bg-center" style={{ backgroundImage: flyer ? `url(${flyer})` : 'none', backgroundColor: '#16202a' }} />
      <p className="mt-3 text-xs uppercase tracking-[0.2em]" style={{ color: LINK }}>{label} · {when}</p>
      <p className="text-white text-lg font-semibold mt-1 line-clamp-2">{tt(event.title)}</p>
      {event.venue?.name && <p className="text-xs mt-1 inline-flex items-center gap-1" style={{ color: '#b9c6d2' }}><MapPin className="w-3 h-3" />{event.venue.name}{event.venue.city ? ` · ${event.venue.city}` : ''}</p>}
      <span className="mt-3 block text-center rounded-full py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: ACCENT }}>
        {ticket ? tt({ en: 'Buy tickets', es: 'Comprar entradas' }) : tt({ en: 'Join the guest list', es: 'Unirme a la lista' })}
      </span>
    </Link>
  );
}

function HeroBackgrounds({ list, at, veil }) {
  return list.map((sl, i) => (
    <div key={i} aria-hidden={i !== at} className="absolute inset-0 transition-opacity duration-[1200ms] ease-out motion-reduce:transition-none"
      style={{ opacity: i === at ? 1 : 0 }}>
      <Background slide={sl} veil={veil} />
    </div>
  ));
}

function HeroControls({ c, center }) {
  const tt = useT();
  if (!c.many) return null;
  return (
    <div className={`mt-7 md:mt-8 flex items-center gap-4 ${center ? 'justify-center' : ''}`} data-testid="gem2i-hero-controls">
      <div className="flex gap-2">
        {c.list.map((_, i) => (
          <button key={i} type="button" onClick={() => c.setAt(i)} aria-label={`${tt({ en: 'Slide', es: 'Diapositiva' })} ${i + 1}`} aria-current={i === c.at}
            className="h-1.5 rounded-full transition-[width,background-color] duration-300"
            style={{ width: i === c.at ? 28 : 10, backgroundColor: i === c.at ? ACCENT : 'rgba(255,255,255,0.35)' }} />
        ))}
      </div>
      {[-1, 1].map(d => (
        <button key={d} type="button" onClick={() => c.go(d)} aria-label={d < 0 ? tt({ en: 'Previous slide', es: 'Diapositiva anterior' }) : tt({ en: 'Next slide', es: 'Diapositiva siguiente' })}
          className="w-11 h-11 rounded-full inline-flex items-center justify-center text-white border border-white/30 transition-[background-color,transform] hover:bg-white/10 active:scale-95">
          <ArrowRight className={`w-4 h-4 ${d < 0 ? 'rotate-180' : ''}`} />
        </button>
      ))}
    </div>
  );
}

// ── A · Fiel a Aurex ────────────────────────────────────────────────────────
// `compact` = inner pages (events/artists/venues/…): ~60% height, no default
// buttons when the slide has none.
export function GemHeroA({ slide, slides, compact = false, linked = [] }) {
  const tt = useT();
  const c = useHeroCarousel(slide, slides);
  const allBtns = useSlideButtons(c.cur);
  const hasOwn = !!(c.cur && [c.cur.button_text, c.cur.button_2_text, c.cur.button_3_text].some(x => tt(x)));
  const btns = compact && !hasOwn ? [] : allBtns;
  return (
    <section className={`relative ${compact ? 'min-h-[min(62svh,560px)]' : 'min-h-[calc(100svh-8.25rem)]'} flex items-center overflow-hidden`} data-testid="gem2i-hero-a" {...c.sectionProps}>
      <HeroBackgrounds list={c.list} at={c.at} veil={LEFT_VEIL} />
      <Glow />
      <div aria-hidden="true" className="hidden lg:block absolute left-[44%] top-[30%] w-64 h-64 rounded-full border border-white/25" />
      <div className={`relative z-10 w-full max-w-7xl mx-auto px-6 md:px-16 py-10 md:py-12 ${pinnedTo(linked, c.cur).length ? 'lg:grid lg:grid-cols-[1fr_320px] lg:gap-12 lg:items-center' : ''}`}>
        <div>
        <div key={c.at} className="max-w-3xl gem-hero-in" aria-live={c.many ? 'polite' : undefined}>
          {noHtml(tt(c.cur?.subtitle)) && <p className="gem-eyebrow mb-5" style={{ color: LINK }}>{noHtml(tt(c.cur.subtitle))}</p>}
          <Title text={noHtml(tt(c.cur?.title)) || tt(DEFAULTS.title)} style={{ fontSize: compact ? 'clamp(2.2rem, min(5.6vw, 8vh), 4.75rem)' : 'clamp(2.6rem, min(7.4vw, 10.5vh), 6.75rem)' }} />
          <p className="max-w-xl mt-5 mb-7 md:mt-6 md:mb-8 text-base md:text-[17px] leading-[1.7]" style={{ color: BODY, textWrap: 'pretty' }}>{noHtml(tt(c.cur?.description)) || tt(DEFAULTS.description)}</p>
          <div className="flex flex-wrap items-center gap-4">
            {btns[0] && <Btn b={btns[0]} variant="round" />}
            {btns[1] && <Btn b={btns[1]} variant="pill" />}
            {btns[2] && <Btn b={btns[2]} variant="pill" />}
          </div>
        </div>
        <HeroControls c={c} />
        </div>
        {pinnedTo(linked, c.cur)[0] && <EventCard key={`ev-${c.at}`} event={pinnedTo(linked, c.cur)[0]} label={tt({ en: 'Featured', es: 'Destacado' })} />}
      </div>
      <Scroll />
      <style>{HERO_IN_CSS}</style>
    </section>
  );
}

// ── B · Aurex + evento destacado ────────────────────────────────────────────
// The slide copy rotates; the featured-event card stays put on the right.
export function GemHeroB({ slide, slides, event, linked = [] }) {
  const tt = useT();
  const c = useHeroCarousel(slide, slides);
  const btns = useSlideButtons(c.cur);
  // Only events pinned to THIS slide (Events manager → hero slides); no
  // "next event" fallback — an event appears only in the slides chosen for it.
  const shown = pinnedTo(linked, c.cur)[0];
  return (
    <section className="relative min-h-[calc(100svh-8.25rem)] flex items-center overflow-hidden" data-testid="gem2i-hero-b" {...c.sectionProps}>
      <HeroBackgrounds list={c.list} at={c.at} veil={LEFT_VEIL} />
      <Glow />
      <div className={`relative z-10 w-full max-w-7xl mx-auto px-6 md:px-16 py-10 md:py-12 grid gap-12 items-center ${shown ? 'lg:grid-cols-[1fr_320px]' : ''}`}>
        <div>
          <div key={c.at} className="max-w-3xl gem-hero-in" aria-live={c.many ? 'polite' : undefined}>
            <p className="gem-eyebrow mb-4" style={{ color: LINK }}>{noHtml(tt(c.cur?.subtitle)) || tt(DEFAULTS.kicker)}</p>
            <Title text={noHtml(tt(c.cur?.title)) || tt({ en: 'Live the night\nwithout lines', es: 'Vive la noche\nsin filas' })} style={{ fontSize: 'clamp(2.6rem, min(6.2vw, 10vh), 5.75rem)' }} />
            <p className="max-w-xl mt-5 mb-7 md:mt-6 md:mb-8 text-base md:text-[17px] leading-[1.7]" style={{ color: BODY, textWrap: 'pretty' }}>{noHtml(tt(c.cur?.description)) || tt({ en: 'Your QR pass for parties, festivals and conferences in one place.', es: 'Tu pase QR para fiestas, festivales y conferencias en un solo lugar.' })}</p>
            <div className="flex flex-wrap items-center gap-4">
              {btns[0] && <Btn b={btns[0]} variant="round" />}
              {btns.slice(1).map((b, i) => <Btn key={i} b={b} variant="pill" />)}
            </div>
          </div>
          <HeroControls c={c} />
        </div>
        {shown && <EventCard key={`ev-${shown.id}`} event={shown} label={tt({ en: 'Featured', es: 'Destacado' })} />}
      </div>
      <Scroll />
      <style>{HERO_IN_CSS}</style>
    </section>
  );
}

// ── C · Cinematográfico centrado ────────────────────────────────────────────
// The centred copy rotates; the upcoming-events strip stays at the bottom.
export function GemHeroC({ slide, slides, events: upcoming = [], linked = [] }) {
  const tt = useT();
  const c = useHeroCarousel(slide, slides);
  const events = pinnedTo(linked, c.cur); // pinned only, same rule as A/B
  const btns = useSlideButtons(c.cur);
  const fmt = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { day: '2-digit', month: 'short' }).toUpperCase() : '');
  return (
    <section className="relative min-h-[calc(100svh-8.25rem)] flex items-center justify-center overflow-hidden" data-testid="gem2i-hero-c" {...c.sectionProps}>
      <HeroBackgrounds list={c.list} at={c.at} veil={FULL_VEIL} />
      <div className={`relative z-10 w-full max-w-4xl mx-auto px-6 pt-10 ${events.length ? 'pb-28' : 'pb-12'} text-center`}>
        <div key={c.at} className="gem-hero-in" aria-live={c.many ? 'polite' : undefined}>
          <p className="gem-eyebrow" style={{ color: LINK }}>{noHtml(tt(c.cur?.subtitle)) || tt({ en: 'Global Entertainment Management & Marketing', es: 'Global Entertainment Management & Marketing' })}</p>
          <Title text={noHtml(tt(c.cur?.title)) || 'GEM2i'} className="mt-4 mb-5" style={{ fontSize: 'clamp(3rem, min(9vw, 13vh), 8.75rem)' }} />
          <p className="max-w-2xl mx-auto mb-8 text-base md:text-[17px] leading-[1.7]" style={{ color: BODY, textWrap: 'pretty' }}>{noHtml(tt(c.cur?.description)) || tt({ en: 'Guest lists, QR e-passes and e-tickets for the community that moves the night.', es: 'Listas de invitados, pases QR y e-tickets para la comunidad que mueve la noche.' })}</p>
          <div className="flex flex-wrap justify-center items-center gap-4">
            {btns[0] && <Btn b={btns[0]} variant="solid" />}
            {btns.slice(1).map((b, i) => <Btn key={i} b={b} variant="pill" />)}
          </div>
        </div>
        <HeroControls c={c} center />
      </div>
      {events.length > 0 && (
        <div className="absolute left-0 right-0 bottom-0 z-10 border-t border-white/10 overflow-hidden" style={{ backgroundColor: 'rgba(8,13,19,.88)' }} data-testid="gem2i-hero-ticker">
          <div className="flex items-center gap-8 px-6 md:px-12 py-4 overflow-x-auto whitespace-nowrap text-[15px]" style={{ color: BODY }}>
            <span className="text-xs font-semibold tracking-[0.25em]" style={{ color: LINK }}>{tt({ en: 'FEATURED', es: 'DESTACADOS' })}</span>
            {events.slice(0, 8).map(e => (
              <Link key={e.id} to={`/events/${e.slug}`} className="hover:text-white transition-colors">
                <span className="tabular-nums">{fmt(e.event_date)}</span> · {tt(e.title)}
              </Link>
            ))}
          </div>
        </div>
      )}
      <style>{HERO_IN_CSS}</style>
    </section>
  );
}

// ── U · Ultra-style stage (Norules, boceto hero-ultra.html U-2, 2026-10-21) ──
// Rounded inset stage the height of the screen. Background = the slide video
// (YouTube link or MP4) playing muted in a loop (sound toggle bottom-right),
// else its photo. Left/bottom: chip (subtitle), title, big date + place of the
// selected pinned event, description, buttons. Right: that event's flyer
// (~half the width, glow, zoom). 2+ pinned events → thumbnails switch the
// event without touching the video. No pinned event → copy only.
const ytIdOf = (url) => String(url || '').match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/)?.[1];
const U_VEIL = 'linear-gradient(90deg, rgba(4,8,12,.84) 0%, rgba(4,8,12,.58) 38%, rgba(4,8,12,.25) 62%, rgba(4,8,12,.45) 100%), linear-gradient(0deg, rgba(4,8,12,.7), rgba(4,8,12,0) 45%)';

function StageVideo({ slide, muted }) {
  const ref = React.useRef(null);
  const video = slide?.video_embed;
  const yt = ytIdOf(video);
  const bg = gemImg(slide?.background || slide?.background_image || slide?.photo) || DEFAULT_BG;
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.tagName === 'VIDEO') { el.muted = muted; return; }
    el.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: muted ? 'mute' : 'unMute', args: [] }), '*');
  }, [muted]);
  if (yt) {
    const src = `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&mute=1&loop=1&playlist=${yt}&controls=0&rel=0&modestbranding=1&playsinline=1&enablejsapi=1`;
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none bg-cover bg-center" style={{ backgroundImage: `url(https://img.youtube.com/vi/${yt}/maxresdefault.jpg)` }}>
        {/* 16:9 iframe scaled to COVER the stage, whatever the screen ratio */}
        <iframe ref={ref} src={src} title="" tabIndex={-1} aria-hidden="true" allow="autoplay; encrypted-media"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border-0"
          style={{ width: 'max(100%, 177.78vh)', height: 'max(100%, 56.25vw)' }} />
      </div>
    );
  }
  if (video && /\.(mp4|webm)(\?|$)/i.test(video)) {
    return <video ref={ref} className="absolute inset-0 w-full h-full object-cover" src={gemImg(video)} autoPlay muted loop playsInline poster={bg} />;
  }
  return <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${bg})` }} />;
}

const holdVideo = (s) => !!s?.video_embed;

export function GemHeroU({ slide, slides, linked = [] }) {
  const tt = useT();
  const { user } = useAuth();
  const c = useHeroCarousel(slide, slides, holdVideo);
  const btns = useSlideButtons(c.cur);
  const pinned = pinnedTo(linked, c.cur);
  const [pick, setPick] = React.useState(0);
  const [muted, setMuted] = React.useState(true);
  const [zoom, setZoom] = React.useState(false);
  React.useEffect(() => { setPick(0); }, [c.at]);
  React.useEffect(() => {
    if (!zoom) return undefined;
    const h = (e) => { if (e.key === 'Escape') setZoom(false); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [zoom]);
  const ev = pinned[Math.min(pick, pinned.length - 1)];
  const flyer = ev && (gemImg(ev.image_urls?.flyer) || gemImg(ev.image_urls?.logo));
  const d = ev?.event_date ? new Date(`${ev.event_date}T12:00:00`) : null;
  const bigDate = d ? d.toLocaleDateString(tt({ en: 'en', es: 'es' }), { month: 'long', day: '2-digit' }).replace('.', '').toUpperCase() : '';
  const hour = (/(?:^|T)(\d{1,2}):(\d{2})/.exec(ev?.open_time || '') || []).slice(1).join(':');
  const place = ev ? [ev.venue?.city || ev.venue?.state, ev.venue?.name].filter(Boolean).join(', ') : '';
  const title = ev ? tt(ev.title) : (noHtml(tt(c.cur?.title)) || tt(DEFAULTS.title));
  const chip = noHtml(tt(c.cur?.subtitle)) || tt({ en: 'Next on GEM2i', es: 'Próximamente en GEM2i' });
  const lead = noHtml(tt(c.cur?.description));
  const ticket = ev && (ev.type === 'eticket' || ev.external_ticket_system);
  // Event CTA first (tickets / guest list → event page), then the slide's own buttons.
  const evBtns = ev ? [{ label: ticket ? tt({ en: 'Get tickets', es: 'Comprar entradas' }) : tt({ en: 'Join guest list', es: 'Unirme a la lista' }), href: `/events/${ev.slug}`, target: '_self' }] : [];
  const ctas = [...evBtns, ...btns].slice(0, 2);
  return (
    <section className="relative px-3 md:px-[18px] pb-3 md:pb-[18px]" data-testid="gem2i-hero-u" {...c.sectionProps}>
      <div className="relative isolate overflow-hidden rounded-[22px] md:rounded-[28px] bg-black lg:h-[calc(100svh-8.25rem-18px)] lg:min-h-[620px]">
        <div className="absolute inset-0 -z-10">
          {c.list.map((sl, i) => (
            <div key={i} aria-hidden="true" className="absolute inset-0 transition-opacity duration-[1200ms] ease-out motion-reduce:transition-none" style={{ opacity: i === c.at ? 1 : 0 }}>
              {i === c.at && <StageVideo slide={sl} muted={muted} />}
            </div>
          ))}
          <div className="absolute inset-0" style={{ background: U_VEIL }} />
        </div>

        <div className={`h-full grid gap-8 lg:gap-10 px-5 py-6 md:px-12 md:py-12 ${flyer ? 'lg:grid-cols-[1fr_1.05fr] items-center' : 'items-end min-h-[70svh] lg:min-h-0'}`}>
          <div key={`${c.at}-${pick}`} className="order-2 lg:order-1 self-end lg:pb-6 gem-hero-in" aria-live="polite">
            <span className="inline-block text-xs md:text-[13px] font-extrabold tracking-[0.04em] uppercase px-3.5 py-1.5 rounded-full text-white border border-white/20 backdrop-blur-sm" style={{ backgroundColor: 'rgba(4,8,12,.6)' }}>{chip}</span>
            <Title text={title} className="mt-5" style={{ fontSize: 'clamp(2.2rem, min(4.2vw, 7vh), 3.9rem)' }} />
            {bigDate && <p className="mt-5 text-white font-extrabold leading-[.95] tracking-[-0.02em] tabular-nums" style={{ fontSize: 'clamp(2.8rem, min(6.4vw, 10vh), 6rem)' }}>{bigDate}</p>}
            {(place || hour) && <p className="mt-3 text-white font-bold uppercase tracking-[0.04em]" style={{ fontSize: 'clamp(1.15rem, 2vw, 1.9rem)' }}>{[place, hour].filter(Boolean).join(' · ')}</p>}
            {lead && <p className="mt-6 max-w-xl text-white text-lg md:text-xl font-semibold" style={{ textWrap: 'pretty' }}>{lead}</p>}
            {ctas.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-3">
                {ctas.map((b, i) => (
                  <a key={i} href={b.href} target={b.target} rel={b.target === '_blank' ? 'noopener noreferrer' : undefined} onClick={onCta(b, !!user)}
                    className={`gem-press inline-flex items-center gap-3 rounded-full pl-5 pr-2 py-2 text-sm md:text-[15px] font-extrabold uppercase tracking-[0.03em] text-white ${i ? 'border border-white/35 backdrop-blur-sm' : ''}`}
                    style={i ? { backgroundColor: 'rgba(255,255,255,.12)' } : { backgroundColor: 'var(--color-button-bg, #3287B7)', color: 'var(--color-button-text, #fff)', boxShadow: '0 0 0 3px color-mix(in srgb, var(--color-button-bg) 35%, transparent)' }}>
                    {b.label}
                    <span className="w-8 h-8 rounded-full inline-flex items-center justify-center" style={{ backgroundColor: '#04080C' }}><ArrowRight className="w-4 h-4 -rotate-45" /></span>
                  </a>
                ))}
              </div>
            )}
            <HeroControls c={c} />
          </div>

          {flyer && (
            <div className="order-1 lg:order-2 relative w-full aspect-[4/5] lg:aspect-auto lg:h-full rounded-[18px] md:rounded-[22px] overflow-hidden"
              style={{ backgroundColor: '#0D1721', boxShadow: '0 0 0 1px color-mix(in srgb, var(--color-accent) 45%, transparent), 0 0 40px color-mix(in srgb, var(--color-accent) 45%, transparent), 0 30px 60px -20px rgba(0,0,0,.8)' }}>
              <Link to={`/events/${ev.slug}`} aria-label={tt(ev.title)} className="block w-full h-full">
                <img key={flyer} src={flyer} alt="" className="w-full h-full object-cover object-top gem-hero-in" />
              </Link>
              <button type="button" onClick={() => setZoom(true)} aria-label={tt({ en: 'Enlarge flyer', es: 'Ampliar flyer' })}
                className="absolute top-4 right-4 w-10 h-10 rounded-full inline-flex items-center justify-center text-white transition-transform active:scale-95" style={{ backgroundColor: 'rgba(4,8,12,.65)' }}>
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5M11 8v6M8 11h6" /></svg>
              </button>
            </div>
          )}
        </div>

        {pinned.length > 1 && (
          <div className="hidden lg:flex absolute right-12 bottom-6 gap-2.5 z-10" role="tablist" aria-label={tt({ en: 'Featured events', es: 'Eventos destacados' })}>
            {pinned.slice(0, 6).map((e, i) => {
              const th = gemImg(e.image_urls?.flyer) || gemImg(e.image_urls?.logo);
              return (
                <button key={e.id} type="button" role="tab" aria-selected={i === pick} aria-label={tt(e.title)} onClick={() => setPick(i)}
                  className="w-[58px] h-[58px] rounded-xl overflow-hidden border-2 transition-[opacity,border-color,transform] duration-200 active:scale-95"
                  style={{ borderColor: i === pick ? LINK : 'transparent', opacity: i === pick ? 1 : 0.6 }}>
                  {th && <img src={th} alt="" className="w-full h-full object-cover" />}
                </button>
              );
            })}
          </div>
        )}
        {c.cur?.video_embed && (
          <button type="button" onClick={() => setMuted(m => !m)} aria-label={muted ? tt({ en: 'Turn sound on', es: 'Activar sonido' }) : tt({ en: 'Mute', es: 'Silenciar' })}
            className={`absolute left-5 lg:left-auto lg:right-5 bottom-5 ${pinned.length > 1 ? 'lg:bottom-24' : ''} z-10 w-11 h-11 rounded-full inline-flex items-center justify-center text-white border border-white/20 transition-transform active:scale-95`}
            style={{ backgroundColor: 'rgba(4,8,12,.6)' }}>
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" />{muted ? <path d="M17 9l5 6M22 9l-5 6" /> : <path d="M16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12" />}</svg>
          </button>
        )}
      </div>
      {zoom && flyer && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-10" style={{ backgroundColor: 'rgba(0,0,0,.92)' }} role="dialog" aria-modal="true" onClick={() => setZoom(false)}>
          <img src={flyer} alt={tt(ev.title)} className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      )}
      <style>{HERO_IN_CSS}</style>
    </section>
  );
}
