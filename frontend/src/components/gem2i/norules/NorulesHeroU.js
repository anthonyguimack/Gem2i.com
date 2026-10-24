/* Norules (`gem2i`) — own copy of hero U (template = package, D-GEM-2026-15): GemHeroU stays as it is for the
 * Gem2i template (frozen). Same stage, carousel, video and flyer; only the CTAs change to the approved
 * "pill + sweep": B1 pill with the arrow disc, and on hover white sweeps in left→right (like the cards). */
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useT } from '../../../lib/i18n';
import { useAuth } from '../../../lib/auth';
import { gemImg } from '../GemCatalogBits';
import {
  DEFAULTS, useSlideButtons, onCta, Title, HERO_IN_CSS, noHtml, useHeroCarousel, pinnedTo, HeroControls, StageVideo, holdVideo, U_VEIL,
} from '../GemHeroVariants';

const LINK = 'var(--color-link, #5FB2E0)';

export function NorulesHeroU({ slide, slides, linked = [] }) {
  const tt = useT();
  const { user } = useAuth();
  const c = useHeroCarousel(slide, slides, holdVideo);
  const btns = useSlideButtons(c.cur);
  const pinned = pinnedTo(linked, c.cur);
  const [pick, setPick] = React.useState(0);
  const [muted, setMuted] = React.useState(true);
  const [zoom, setZoom] = React.useState(false);
  // Natural width/height of the uploaded flyer: the frame keeps the hero height and takes this proportion.
  const [ratio, setRatio] = React.useState(2 / 3);
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

        <div className={`h-full gap-8 lg:gap-12 px-5 py-6 md:px-12 md:py-12 ${flyer ? 'grid lg:flex lg:items-center' : 'grid items-end min-h-[70svh] lg:min-h-0'}`}>
          <div key={`${c.at}-${pick}`} className="order-2 lg:order-1 lg:flex-1 lg:min-w-0 self-end lg:pb-6 gem-hero-in" aria-live="polite">
            <span className="inline-block text-xs md:text-[13px] font-extrabold tracking-[0.04em] uppercase px-3.5 py-1.5 rounded-full text-white border border-white/20 backdrop-blur-sm" style={{ backgroundColor: 'rgba(4,8,12,.6)' }}>{chip}</span>
            <Title text={title} className="mt-5" style={{ fontSize: 'clamp(2.2rem, min(4.2vw, 7vh), 3.9rem)' }} />
            {bigDate && <p className="mt-5 text-white font-extrabold leading-[.95] tracking-[-0.02em] tabular-nums" style={{ fontSize: 'clamp(2.8rem, min(6.4vw, 10vh), 6rem)' }}>{bigDate}</p>}
            {(place || hour) && <p className="mt-3 text-white font-bold uppercase tracking-[0.04em]" style={{ fontSize: 'clamp(1.15rem, 2vw, 1.9rem)' }}>{[place, hour].filter(Boolean).join(' · ')}</p>}
            {lead && <p className="mt-6 max-w-xl text-white text-lg md:text-xl font-semibold" style={{ textWrap: 'pretty' }}>{lead}</p>}
            {ctas.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-3">
                {ctas.map((b, i) => (
                  <a key={i} href={b.href} target={b.target} rel={b.target === '_blank' ? 'noopener noreferrer' : undefined} onClick={onCta(b, !!user)}
                    className={`nb nb-sweep nb-hero ${i ? 'nb-hero-s' : 'nb-hero-p'}`}>
                    <span className="nb-tx">{b.label}</span>
                    <span className="nb-ar" aria-hidden="true"><ArrowRight /></span>
                  </a>
                ))}
              </div>
            )}
            <HeroControls c={c} />
          </div>

          {flyer && (
            <div className="order-1 lg:order-2 relative w-full max-h-[70svh] mx-auto lg:mx-0 lg:w-auto lg:max-h-none lg:h-full lg:max-w-[50%] lg:shrink-0 rounded-[18px] md:rounded-[22px] overflow-hidden transition-[aspect-ratio] duration-500 ease-out motion-reduce:transition-none"
              style={{ aspectRatio: ratio, backgroundColor: '#0D1721', boxShadow: '0 0 0 1px color-mix(in srgb, var(--color-accent) 45%, transparent), 0 0 40px color-mix(in srgb, var(--color-accent) 45%, transparent), 0 30px 60px -20px rgba(0,0,0,.8)' }}>
              <Link to={`/events/${ev.slug}`} aria-label={tt(ev.title)} className="block w-full h-full">
                {/* Wider than the 50% cap: shown whole over a blurred copy of itself. */}
                <img src={flyer} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl brightness-[.6]" />
                <img key={flyer} src={flyer} alt="" onLoad={(e) => { const { naturalWidth: w, naturalHeight: h } = e.currentTarget; if (w && h) setRatio(w / h); }}
                  className="relative w-full h-full object-contain gem-hero-in" />
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
