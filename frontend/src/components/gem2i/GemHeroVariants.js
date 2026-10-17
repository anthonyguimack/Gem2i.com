import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MapPin } from 'lucide-react';
import { useT } from '../../lib/i18n';
import { useAuth } from '../../lib/auth';
import { resolveCta } from '../../lib/ctaActions';
import { gemImg } from './GemCatalogBits';

/**
 * gem2i template heroes — one per template (approved sketches 2026-10-16):
 *   gem2i     (Gem2i - 01) → A · Fiel a Aurex
 *   gem2i_02  (Gem2i - 02) → B · Aurex + evento destacado
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
    return (
      <a {...common} className="gem-press inline-flex items-center gap-4 text-[13px] font-semibold uppercase tracking-[0.18em] text-white group">
        <span className="w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-transform duration-200 group-hover:translate-x-0.5" style={{ backgroundColor: ACCENT }}>
          <ArrowRight className="w-5 h-5" />
        </span>
        {b.label}
      </a>
    );
  }
  if (variant === 'solid') {
    return <a {...common} className="gem-press inline-flex px-7 py-3.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90" style={{ backgroundColor: ACCENT }}>{b.label}</a>;
  }
  return <a {...common} className="gem-press inline-flex px-6 py-3 rounded-full text-[13px] font-medium text-white border border-white/60 transition-colors hover:bg-white/10">{b.label}</a>;
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
  return <h1 className={`text-white font-extrabold leading-[0.95] tracking-[-0.03em] ${className}`} style={style}>{lines.map((l, i) => <React.Fragment key={i}>{i > 0 && <br />}{l}</React.Fragment>)}</h1>;
}

// ── A · Fiel a Aurex ────────────────────────────────────────────────────────
export function GemHeroA({ slide }) {
  const tt = useT();
  const btns = useSlideButtons(slide);
  return (
    <section className="relative min-h-[92vh] flex items-center overflow-hidden" data-testid="gem2i-hero-a">
      <Background slide={slide} veil={LEFT_VEIL} />
      <Glow />
      <div aria-hidden="true" className="hidden lg:block absolute left-[44%] top-[30%] w-64 h-64 rounded-full border border-white/25" />
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-16 pt-32 pb-20">
        <div className="max-w-xl">
          {tt(slide?.subtitle) && <p className="text-xs uppercase tracking-[0.35em] mb-5" style={{ color: LINK }}>{tt(slide.subtitle)}</p>}
          <Title text={tt(slide?.title) || tt(DEFAULTS.title)} style={{ fontSize: 'clamp(3.4rem, 7.4vw, 6.75rem)' }} />
          <p className="mt-7 mb-9 text-base leading-[1.75]" style={{ color: BODY, textWrap: 'pretty' }}>{tt(slide?.description) || tt(DEFAULTS.description)}</p>
          <div className="flex flex-wrap items-center gap-4">
            {btns[0] && <Btn b={btns[0]} variant="round" />}
            {btns[1] && <Btn b={btns[1]} variant="pill" />}
          </div>
          {btns[2] && <div className="mt-4"><Btn b={btns[2]} variant="pill" /></div>}
        </div>
      </div>
      <Scroll />
    </section>
  );
}

// ── B · Aurex + evento destacado ────────────────────────────────────────────
export function GemHeroB({ slide, event }) {
  const tt = useT();
  const btns = useSlideButtons(slide);
  const flyer = event ? (gemImg(event.image_urls?.flyer) || gemImg(event.image_urls?.logo)) : null;
  const when = event?.event_date ? new Date(`${event.event_date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) : '';
  return (
    <section className="relative min-h-[92vh] flex items-center overflow-hidden" data-testid="gem2i-hero-b">
      <Background slide={slide} veil={LEFT_VEIL} />
      <Glow />
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-16 pt-32 pb-20 grid lg:grid-cols-[1fr_320px] gap-12 items-end">
        <div className="max-w-xl">
          <p className="text-xs uppercase tracking-[0.35em] mb-4" style={{ color: LINK }}>{tt(slide?.subtitle) || tt(DEFAULTS.kicker)}</p>
          <Title text={tt(slide?.title) || tt({ en: 'Live the night\nwithout lines', es: 'Vive la noche\nsin filas' })} style={{ fontSize: 'clamp(3rem, 6.2vw, 5.75rem)' }} />
          <p className="mt-6 mb-9 text-base leading-[1.75]" style={{ color: BODY, textWrap: 'pretty' }}>{tt(slide?.description) || tt({ en: 'Your QR pass for parties, festivals and conferences in one place.', es: 'Tu pase QR para fiestas, festivales y conferencias en un solo lugar.' })}</p>
          <div className="flex flex-wrap items-center gap-4">
            {btns[0] && <Btn b={btns[0]} variant="round" />}
            {btns.slice(1).map((b, i) => <Btn key={i} b={b} variant="pill" />)}
          </div>
        </div>
        {event && (
          <Link to={`/events/${event.slug}`} className="hidden lg:block rounded-2xl p-3.5 border border-white/10 transition-transform duration-200 hover:-translate-y-1" style={{ backgroundColor: 'rgba(8,13,19,.88)' }} data-testid="gem2i-hero-event">
            <div className="h-40 rounded-xl bg-cover bg-center" style={{ backgroundImage: flyer ? `url(${flyer})` : 'none', backgroundColor: '#16202a' }} />
            <p className="mt-3 text-[11px] uppercase tracking-[0.2em]" style={{ color: LINK }}>{tt({ en: 'Next', es: 'Próximo' })} · {when}</p>
            <p className="text-white text-base font-semibold mt-1 line-clamp-2">{tt(event.title)}</p>
            {event.venue?.name && <p className="text-xs mt-1 inline-flex items-center gap-1" style={{ color: '#8fa0ae' }}><MapPin className="w-3 h-3" />{event.venue.name}{event.venue.city ? ` · ${event.venue.city}` : ''}</p>}
            <span className="mt-3 block text-center rounded-full py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: ACCENT }}>{tt({ en: 'Join the guest list', es: 'Unirme a la lista' })}</span>
          </Link>
        )}
      </div>
      <Scroll />
    </section>
  );
}

// ── C · Cinematográfico centrado ────────────────────────────────────────────
export function GemHeroC({ slide, events = [] }) {
  const tt = useT();
  const btns = useSlideButtons(slide);
  const fmt = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { day: '2-digit', month: 'short' }).toUpperCase() : '');
  return (
    <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden" data-testid="gem2i-hero-c">
      <Background slide={slide} veil={FULL_VEIL} />
      <div className="relative z-10 w-full max-w-4xl mx-auto px-6 pt-28 pb-36 text-center">
        <p className="text-xs uppercase tracking-[0.35em]" style={{ color: LINK }}>{tt(slide?.subtitle) || tt({ en: 'Global Entertainment Management & Marketing', es: 'Global Entertainment Management & Marketing' })}</p>
        <Title text={tt(slide?.title) || 'GEM2i'} className="mt-4 mb-5" style={{ fontSize: 'clamp(4rem, 9vw, 8.75rem)' }} />
        <p className="max-w-2xl mx-auto mb-9 text-base leading-[1.75]" style={{ color: BODY, textWrap: 'pretty' }}>{tt(slide?.description) || tt({ en: 'Guest lists, QR e-passes and e-tickets for the community that moves the night.', es: 'Listas de invitados, pases QR y e-tickets para la comunidad que mueve la noche.' })}</p>
        <div className="flex flex-wrap justify-center items-center gap-4">
          {btns[0] && <Btn b={btns[0]} variant="solid" />}
          {btns.slice(1).map((b, i) => <Btn key={i} b={b} variant="pill" />)}
        </div>
      </div>
      {events.length > 0 && (
        <div className="absolute left-0 right-0 bottom-0 z-10 border-t border-white/10 overflow-hidden" style={{ backgroundColor: 'rgba(8,13,19,.88)' }} data-testid="gem2i-hero-ticker">
          <div className="flex items-center gap-8 px-6 md:px-12 py-4 overflow-x-auto whitespace-nowrap text-[13px]" style={{ color: BODY }}>
            <span className="text-xs font-semibold tracking-[0.25em]" style={{ color: LINK }}>{tt({ en: 'UPCOMING', es: 'PRÓXIMOS' })}</span>
            {events.slice(0, 8).map(e => (
              <Link key={e.id} to={`/events/${e.slug}`} className="hover:text-white transition-colors">
                <span className="tabular-nums">{fmt(e.event_date)}</span> · {tt(e.title)}
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
