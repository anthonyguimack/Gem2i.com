import React, { useState, useEffect, useCallback, useRef } from 'react';
import CaptchaWidget from '../components/CaptchaWidget';
import { landingAPI } from '../lib/api';
import { useSettings } from '../App';
import { X } from 'lucide-react';
import { normalizeRichText } from '../lib/richText';
import { useT } from '../lib/i18n';

const API = process.env.REACT_APP_BACKEND_URL;
const resolveSrc = (v) => v ? (v.startsWith('/api') ? `${API}${v}` : v) : null;
const cv = (name, fallback) => `var(--lp-${name}, ${fallback})`;

/* Normalize rich-text HTML for the public landing page:
 *   1. Strip &nbsp; / U+00A0 (Quill inserts these between every word, which
 *      makes the browser treat a paragraph as a single unbreakable token and
 *      forces mid-character splits near the container edge).
 *   2. Replace regular hyphens between word chars with a non-breaking hyphen
 *      U+2011 so compound words ("membership-based", "expert-led") never
 *      wrap at the dash.
 * Must accept any input (string, LocalizedField object, null) without throwing. */
function nbHyphens(html) {
  if (html == null) return '';
  const str = normalizeRichText(typeof html === 'string' ? html : String(html));
  return str.replace(/>([^<]+)</g, (match, text) => {
    return '>' + text.replace(/(\w)-(\w)/g, '$1\u2011$2') + '<';
  }).replace(/^([^<]+)/, (text) => text.replace(/(\w)-(\w)/g, '$1\u2011$2'));
}

/* ─── Scroll Reveal ─── */
function useScrollReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

function Reveal({ children, className = '', style = {}, delay = 0, direction = 'up', ...props }) {
  const [ref, visible] = useScrollReveal(0.1);
  const t = direction === 'up' ? 'translateY(40px)' : direction === 'left' ? 'translateX(-40px)' : direction === 'right' ? 'translateX(40px)' : 'translateY(40px)';
  return (
    <div ref={ref} className={className} style={{ ...style, opacity: visible ? 1 : 0, transform: visible ? 'translate(0)' : t, transition: `opacity 0.8s ease-out ${delay}s, transform 0.8s ease-out ${delay}s` }} {...props}>
      {children}
    </div>
  );
}

/* ─── Countdown Hook ─── */
function useCountdown(targetDate) {
  const calc = useCallback(() => {
    if (!targetDate) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
    const diff = new Date(targetDate).getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / (1000 * 60)) % 60),
      seconds: Math.floor((diff / 1000) % 60),
      expired: false,
    };
  }, [targetDate]);
  const [time, setTime] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  }, [calc]);
  return time;
}

/* ─── Resolve Video URL ─── */
function resolveVideoUrl(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?\s]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vim = url.match(/vimeo\.com\/(\d+)/);
  if (vim) return `https://player.vimeo.com/video/${vim[1]}`;
  if (url.startsWith('<iframe')) { const m = url.match(/src=["']([^"']+)["']/); if (m) return m[1]; }
  return url;
}

/* ─── Cookie Banner ─── */
function CookieBanner({ message }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { if (!localStorage.getItem('lp_cookie_consent')) setVisible(true); }, []);
  const accept = () => { localStorage.setItem('lp_cookie_consent', 'accepted'); setVisible(false); };
  const decline = () => { localStorage.setItem('lp_cookie_consent', 'declined'); setVisible(false); };
  if (!visible) return null;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4" data-testid="cookie-banner">
      <div className="max-w-4xl mx-auto rounded-lg p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-4" style={{ backgroundColor: cv('cookie-bg', '#13161e'), border: `1px solid ${cv('border', 'rgba(201,168,76,0.3)')}` }}>
        <p className="text-sm flex-1" style={{ color: cv('cookie-text', '#a0a0b0') }}>{message || 'We use cookies and analytics to improve your experience.'}</p>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={accept} className="px-4 py-2 rounded text-sm font-medium hover:opacity-80" style={{ backgroundColor: cv('button-bg', '#c9a84c'), color: cv('button-text', '#0a0a12') }} data-testid="cookie-accept">Accept all cookies</button>
          <button onClick={decline} className="px-4 py-2 rounded text-sm font-medium hover:opacity-80 border" style={{ borderColor: cv('border', 'rgba(201,168,76,0.3)'), color: cv('secondary-text', '#a0a0b0') }} data-testid="cookie-decline">Decline</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Countdown Box ─── */
function CountdownBox({ value, label }) {
  return (
    <div className="flex flex-col items-center" data-testid={`countdown-${label}`}>
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg flex items-center justify-center text-2xl sm:text-3xl font-bold" style={{ backgroundColor: cv('countdown-bg', 'rgba(255,255,255,0.05)'), color: cv('countdown-number', '#c9a84c'), border: `1px solid ${cv('border', 'rgba(201,168,76,0.3)')}` }}>
        {String(value).padStart(2, '0')}
      </div>
      <span className="mt-1.5 text-[10px] uppercase tracking-[0.2em]" style={{ color: cv('countdown-label', '#a0a0b0') }}>{label}</span>
    </div>
  );
}

/* ─── Social Icons ─── */
function SocialIcon({ type, url }) {
  const icons = {
    facebook: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>,
    twitter: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
    youtube: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
    instagram: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>,
    linkedin: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
    tiktok: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>,
  };
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-full border flex items-center justify-center transition-colors hover:opacity-70" style={{ borderColor: cv('border', 'rgba(255,255,255,0.2)'), color: cv('body-text', '#f5f5f5') }}>
      {icons[type] || null}
    </a>
  );
}

/* ═══════════════════════════════════════════════
   MAIN LANDING PAGE
   ═══════════════════════════════════════════════ */
export default function LandingPage() {
  const settings = useSettings();
  const tt = useT();
  const [content, setContent] = useState({});
  const [heroSlides, setHeroSlides] = useState([]);
  const [contactForm, setContactForm] = useState({ first_name: '', email: '', subject: '', message: '' });
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [waitlistForm, setWaitlistForm] = useState({ first_name: '', last_name: '', email: '' });
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false);
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  const [contactCaptcha, setContactCaptcha] = useState('');
  const [waitlistCaptcha, setWaitlistCaptcha] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideAnimKey, setSlideAnimKey] = useState(0);

  const launchDate = settings.landing_page_launch_date;
  const countdown = useCountdown(launchDate);

  useEffect(() => {
    landingAPI.getContent().then(r => setContent(r.data || {})).catch(() => {});
    landingAPI.getHeroSlides().then(r => setHeroSlides(r.data || [])).catch(() => {});
  }, []);

  /* Auto-advance carousel */
  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const delay = heroSlides[currentSlide]?.delay || 9400;
    const timer = setTimeout(() => {
      setCurrentSlide(prev => (prev + 1) % heroSlides.length);
      setSlideAnimKey(prev => prev + 1);
    }, delay);
    return () => clearTimeout(timer);
  }, [currentSlide, heroSlides]);

  const goToSlide = (i) => { setCurrentSlide(i); setSlideAnimKey(prev => prev + 1); };
  const prevSlide = () => goToSlide((currentSlide - 1 + heroSlides.length) % heroSlides.length);
  const nextSlide = () => goToSlide((currentSlide + 1) % heroSlides.length);

  const hero = heroSlides[currentSlide] || {};
  const logoSrc = resolveSrc(settings.landing_page_logo);
  const heroBg = resolveSrc(hero.background);
  const videoUrl = resolveVideoUrl(hero.video_embed || hero.video_url);
  const heroPhoto = resolveSrc(hero.photo);
  const contactImage = resolveSrc(content.contact_image);
  const socialLinks = settings.social_media || [];
  const showOverlay = hero.background_overlay !== false;
  const heroButtons = hero.buttons || [];

  const scrollTo = (id) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); setMobileMenuOpen(false); };

  const handleContact = async (e) => {
    e.preventDefault();
    setContactSubmitting(true);
    try {
      await landingAPI.submitContact({ ...contactForm, captcha_token: contactCaptcha });
      setContactSuccess(true);
      setContactForm({ first_name: '', email: '', subject: '', message: '' });
      setContactCaptcha('');
    } catch { } finally { setContactSubmitting(false); }
  };

  const handleWaitlist = async (e) => {
    e.preventDefault();
    setWaitlistSubmitting(true);
    try {
      await landingAPI.subscribe({ ...waitlistForm, captcha_token: waitlistCaptcha });
      setWaitlistSuccess(true);
      setWaitlistForm({ first_name: '', last_name: '', email: '' });
      setWaitlistCaptcha('');
    } catch { } finally { setWaitlistSubmitting(false); }
  };

  const inputDark = { backgroundColor: cv('input-bg', 'rgba(255,255,255,0.05)'), border: `1px solid ${cv('input-border', 'rgba(201,168,76,0.3)')}`, color: cv('input-text', '#f5f5f5') };
  const inputLight = { backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb', color: '#1a1a2e' };

  return (
    <div className="min-h-screen" style={{ backgroundColor: cv('bg-base', '#0a0a12') }} data-testid="landing-page">

      {/* ═══ HEADER / NAV ═══ */}
      <header className="fixed top-0 left-0 right-0 z-50" style={{ backgroundColor: 'rgba(10,10,18,0.92)', backdropFilter: 'blur(12px)' }} data-testid="lp-header">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {logoSrc ? (
            <img src={logoSrc} alt="Logo" className="h-8 sm:h-10 w-auto object-contain" data-testid="lp-logo" />
          ) : (
            <div className="text-lg font-bold tracking-wide" style={{ color: cv('heading', '#f5f5f5'), fontFamily: 'Playfair Display, serif' }}>{tt(settings.brand_name) || 'Coming Soon'}</div>
          )}
          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8" data-testid="lp-nav">
            <button onClick={() => scrollTo('hero')} className="text-sm hover:opacity-70 transition-opacity" style={{ color: cv('body-text', '#f5f5f5') }}>{content.nav1_text || 'Home'}</button>
            <button onClick={() => scrollTo('contact')} className="text-sm hover:opacity-70 transition-opacity" style={{ color: cv('body-text', '#f5f5f5') }}>{content.nav2_text || 'More Information'}</button>
            <a href="/my-account" className="text-sm hover:opacity-70 transition-opacity" style={{ color: cv('body-text', '#f5f5f5') }}>{content.nav3_text || 'Membership Lounge'}</a>
            <button onClick={() => scrollTo('waitlist')} className="text-sm hover:opacity-70 transition-opacity" style={{ color: cv('body-text', '#f5f5f5') }}>{content.nav4_text || 'Waiting List'}</button>
          </nav>
          {/* Mobile hamburger */}
          <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ color: cv('body-text', '#f5f5f5') }} data-testid="lp-mobile-menu">
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>}
          </button>
        </div>
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t px-6 py-4 space-y-3" style={{ borderColor: cv('border', 'rgba(201,168,76,0.3)'), backgroundColor: 'rgba(10,10,18,0.97)' }}>
            <button onClick={() => scrollTo('hero')} className="block text-sm w-full text-left" style={{ color: cv('body-text', '#f5f5f5') }}>{content.nav1_text || 'Home'}</button>
            <button onClick={() => scrollTo('contact')} className="block text-sm w-full text-left" style={{ color: cv('body-text', '#f5f5f5') }}>{content.nav2_text || 'More Information'}</button>
            <a href="/my-account" className="block text-sm" style={{ color: cv('body-text', '#f5f5f5') }}>{content.nav3_text || 'Membership Lounge'}</a>
            <button onClick={() => scrollTo('waitlist')} className="block text-sm w-full text-left" style={{ color: cv('body-text', '#f5f5f5') }}>{content.nav4_text || 'Waiting List'}</button>
          </div>
        )}
      </header>

      {/* ═══ HERO SECTION ═══ */}
      <section className="relative min-h-screen flex items-center pt-16" id="hero" data-testid="lp-hero">
        {/* Background with crossfade */}
        {heroBg && <div className="absolute inset-0 z-0 bg-cover bg-center bg-fixed transition-opacity duration-700" style={{ backgroundImage: `url(${heroBg})` }} key={`bg-${slideAnimKey}`} />}
        {showOverlay && <div className="absolute inset-0 z-[1]" style={{ background: `linear-gradient(to bottom, ${cv('overlay-start', 'rgba(0,0,0,0.75)')}, ${cv('overlay-end', 'rgba(5,5,15,0.88)')})` }} />}

        {/* Prev / Next arrows */}
        {heroSlides.length > 1 && (
          <>
            <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110" style={{ backgroundColor: 'rgba(0,0,0,0.35)', color: cv('body-text', '#f5f5f5'), backdropFilter: 'blur(4px)' }} data-testid="lp-hero-prev" aria-label="Previous slide">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110" style={{ backgroundColor: 'rgba(0,0,0,0.35)', color: cv('body-text', '#f5f5f5'), backdropFilter: 'blur(4px)' }} data-testid="lp-hero-next" aria-label="Next slide">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </>
        )}

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-16 sm:py-24 w-full" key={slideAnimKey}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left column: Text + Countdown */}
            <div className="animate-fadeIn">
              {hero.title && (
                <div className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 rich-text-content [&_p]:m-0" style={{ color: cv('heading', '#f5f5f5'), fontFamily: 'Playfair Display, serif' }} data-testid="lp-hero-title" dangerouslySetInnerHTML={{ __html: nbHyphens(hero.title) }} />
              )}
              {!hero.title && hero.show_countdown !== false && <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6" style={{ color: cv('heading', '#f5f5f5'), fontFamily: 'Playfair Display, serif' }}>Launching in :</h1>}
              {/* Countdown — only if enabled on this slide */}
              {hero.show_countdown !== false && (
                <div className="flex gap-3 sm:gap-5 mb-8" data-testid="lp-countdown">
                  <CountdownBox value={countdown.days} label="Days" />
                  <CountdownBox value={countdown.hours} label="Hours" />
                  <CountdownBox value={countdown.minutes} label="Minutes" />
                  <CountdownBox value={countdown.seconds} label="Seconds" />
                </div>
              )}
              {hero.subtitle && (
                <div className="text-base sm:text-lg font-semibold mb-4 rich-text-content [&_p]:m-0" style={{ color: cv('body-text', '#f5f5f5') }} dangerouslySetInnerHTML={{ __html: nbHyphens(hero.subtitle) }} />
              )}
              {hero.description && (
                <div className="text-sm leading-relaxed mb-8 rich-text-content" style={{ color: cv('secondary-text', '#a0a0b0') }} dangerouslySetInnerHTML={{ __html: nbHyphens(hero.description) }} data-testid="lp-hero-description" />
              )}
              {/* CTA Buttons — only shown if admin created them */}
              {heroButtons.length > 0 && (
                <div className="flex flex-wrap gap-3" data-testid="lp-cta-buttons">
                  {heroButtons.map((btn, i) => {
                    const isExternal = btn.window_open === 'new';
                    const isFilled = btn.style === 'filled';
                    const btnStyle = isFilled
                      ? { backgroundColor: cv('button-bg', '#c9a84c'), color: cv('button-text', '#0a0a12') }
                      : { borderColor: cv('button-outline-border', '#c9a84c'), color: cv('button-outline-text', '#c9a84c'), backgroundColor: 'transparent' };
                    const cls = `px-6 py-2.5 rounded text-sm font-medium transition-all hover:opacity-80 ${isFilled ? '' : 'border'}`;
                    if (btn.url === '#contact' || btn.url === '#waitlist' || btn.url === '#hero') {
                      return <button key={i} onClick={() => scrollTo(btn.url.replace('#', ''))} className={cls} style={btnStyle} data-testid={`lp-btn-${i}`}>{btn.text}</button>;
                    }
                    return <a key={i} href={btn.url || '#'} target={isExternal ? '_blank' : '_self'} rel="noreferrer" className={`${cls} text-center`} style={btnStyle} data-testid={`lp-btn-${i}`}>{btn.text}</a>;
                  })}
                </div>
              )}
            </div>
            {/* Right column: Video or Photo */}
            <div className="animate-fadeIn" style={{ animationDelay: '0.3s' }}>
              {videoUrl ? (
                <div className="rounded-lg overflow-hidden shadow-2xl border" style={{ borderColor: cv('border', 'rgba(201,168,76,0.3)'), aspectRatio: '16/9' }} data-testid="lp-hero-video">
                  <iframe src={videoUrl} className="w-full h-full" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="Video" />
                </div>
              ) : heroPhoto ? (
                <div className="rounded-lg overflow-hidden shadow-2xl" data-testid="lp-hero-photo">
                  <img src={heroPhoto} alt="" className="w-full h-auto object-cover" />
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Dot indicators */}
        {heroSlides.length > 1 && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2.5 z-20" data-testid="lp-hero-dots">
            {heroSlides.map((_, i) => (
              <button key={i} onClick={() => goToSlide(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${i === currentSlide ? 'scale-125' : 'hover:opacity-70'}`}
                style={{ backgroundColor: i === currentSlide ? cv('accent', '#c9a84c') : 'rgba(255,255,255,0.35)' }}
                data-testid={`lp-hero-dot-${i}`}
                aria-label={`Go to slide ${i + 1}`} />
            ))}
          </div>
        )}
      </section>

      {/* ═══ GET IN TOUCH ═══ */}
      <section className="py-16 sm:py-24" id="contact" style={{ backgroundColor: cv('bg-base', '#0a0a12') }} data-testid="lp-contact-section">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Left: Image */}
            <Reveal direction="left">
              {contactImage ? (
                <img src={contactImage} alt="About" className="w-full h-auto rounded-lg object-cover shadow-lg" style={{ maxHeight: '600px' }} data-testid="lp-contact-image" />
              ) : (
                <div className="w-full rounded-lg flex items-center justify-center" style={{ minHeight: '400px', backgroundColor: 'rgba(255,255,255,0.03)', border: `1px solid ${cv('border', 'rgba(201,168,76,0.3)')}` }}>
                  <p className="text-sm" style={{ color: cv('secondary-text', '#a0a0b0') }}>Upload an image in CMS</p>
                </div>
              )}
            </Reveal>
            {/* Right: Form */}
            <Reveal direction="right" delay={0.15}>
              <h2 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: cv('heading', '#f5f5f5'), fontFamily: 'Playfair Display, serif' }} data-testid="lp-contact-title">
                {content.contact_title || 'Get in touch with us!'}
              </h2>
              {content.contact_subtitle && <p className="text-sm mb-3" style={{ color: cv('accent', '#c9a84c') }}>{content.contact_subtitle}</p>}
              {content.contact_description && (
                <div className="text-sm leading-relaxed mb-8 rich-text-content" style={{ color: cv('secondary-text', '#a0a0b0') }} dangerouslySetInnerHTML={{ __html: nbHyphens(content.contact_description) }} />
              )}
              {contactSuccess ? (
                <div className="text-center py-8 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }} data-testid="lp-contact-success">
                  <div className="text-3xl mb-2" style={{ color: cv('accent', '#c9a84c') }}>&#10003;</div>
                  <p className="font-semibold" style={{ color: cv('heading', '#f5f5f5') }}>Message sent!</p>
                  <p className="text-sm mt-1" style={{ color: cv('secondary-text', '#a0a0b0') }}>We'll get back to you soon.</p>
                  <button onClick={() => setContactSuccess(false)} className="mt-4 text-sm hover:underline" style={{ color: cv('accent', '#c9a84c') }}>Send another message</button>
                </div>
              ) : (
                <form onSubmit={handleContact} className="space-y-4">
                  <input placeholder={content.contact_name_ph || 'Your Name'} required value={contactForm.first_name} onChange={e => setContactForm({ ...contactForm, first_name: e.target.value })} className="w-full px-4 py-3 rounded-lg text-sm placeholder:opacity-50" style={inputDark} data-testid="lp-contact-name" />
                  <input type="email" placeholder={content.contact_email_ph || 'Your Email'} required value={contactForm.email} onChange={e => setContactForm({ ...contactForm, email: e.target.value })} className="w-full px-4 py-3 rounded-lg text-sm placeholder:opacity-50" style={inputDark} data-testid="lp-contact-email" />
                  <input placeholder={content.contact_subject_ph || 'Write the subject'} value={contactForm.subject} onChange={e => setContactForm({ ...contactForm, subject: e.target.value })} className="w-full px-4 py-3 rounded-lg text-sm placeholder:opacity-50" style={inputDark} data-testid="lp-contact-subject" />
                  <textarea placeholder={content.contact_message_ph || 'Your message here'} required rows={4} value={contactForm.message} onChange={e => setContactForm({ ...contactForm, message: e.target.value })} className="w-full px-4 py-3 rounded-lg text-sm placeholder:opacity-50 resize-none" style={inputDark} data-testid="lp-contact-message" />
                  <CaptchaWidget onChange={setContactCaptcha} testId="lp-contact-captcha" />
                  <button type="submit" disabled={contactSubmitting} className="w-full py-3 rounded-lg text-sm font-semibold hover:opacity-80 disabled:opacity-50" style={{ backgroundColor: cv('button-bg', '#c9a84c'), color: cv('button-text', '#0a0a12') }} data-testid="lp-contact-submit">
                    {contactSubmitting ? 'Sending...' : (content.contact_btn_text || 'Send my Message')}
                  </button>
                </form>
              )}
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══ WAITING LIST ═══ */}
      <section className="py-16 sm:py-24" id="waitlist" style={{ backgroundColor: '#ffffff' }} data-testid="lp-waitlist-section">
        <div className="max-w-xl mx-auto px-6 text-center">
          <Reveal>
            <h2 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: '#1a1a2e', fontFamily: 'Playfair Display, serif' }} data-testid="lp-waitlist-title">
              {content.waitlist_title || 'Waiting List'}
            </h2>
            <p className="text-sm mb-8" style={{ color: '#6b7280' }}>
              {content.waitlist_subtitle || 'Signing up to our newsletter gives you exclusive access to our Grand Opening!'}
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            {waitlistSuccess ? (
              <div className="py-8" data-testid="lp-waitlist-success">
                <div className="text-3xl mb-2" style={{ color: '#c9a84c' }}>&#10003;</div>
                <p className="font-semibold" style={{ color: '#1a1a2e' }}>You're on the list!</p>
                <p className="text-sm mt-1" style={{ color: '#6b7280' }}>We'll notify you when we launch.</p>
              </div>
            ) : (
              <form onSubmit={handleWaitlist} className="space-y-3">
                <input placeholder="Name" required value={waitlistForm.first_name} onChange={e => setWaitlistForm({ ...waitlistForm, first_name: e.target.value })} className="w-full px-4 py-3 rounded-lg text-sm" style={inputLight} data-testid="lp-waitlist-name" />
                <input placeholder="Last Name" required value={waitlistForm.last_name} onChange={e => setWaitlistForm({ ...waitlistForm, last_name: e.target.value })} className="w-full px-4 py-3 rounded-lg text-sm" style={inputLight} data-testid="lp-waitlist-lastname" />
                <input type="email" placeholder="Email" required value={waitlistForm.email} onChange={e => setWaitlistForm({ ...waitlistForm, email: e.target.value })} className="w-full px-4 py-3 rounded-lg text-sm" style={inputLight} data-testid="lp-waitlist-email" />
                <div className="flex justify-center"><CaptchaWidget onChange={setWaitlistCaptcha} testId="lp-waitlist-captcha" /></div>
                <button type="submit" disabled={waitlistSubmitting} className="w-full py-3 rounded-lg text-sm font-semibold hover:opacity-80 disabled:opacity-50" style={{ backgroundColor: '#1a1a2e', color: '#ffffff' }} data-testid="lp-waitlist-submit">
                  {waitlistSubmitting ? 'Submitting...' : (content.waitlist_btn_text || 'Submit')}
                </button>
              </form>
            )}
          </Reveal>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="py-12" style={{ backgroundColor: cv('footer-bg', 'rgba(0,0,0,0.3)') }} data-testid="lp-footer">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Left: Logo + description */}
            <div>
              {logoSrc ? (
                <img src={logoSrc} alt="Logo" className="h-8 mb-4 w-auto object-contain" />
              ) : (
                <div className="text-lg font-bold mb-4" style={{ color: cv('heading', '#f5f5f5'), fontFamily: 'Playfair Display, serif' }}>{tt(settings.brand_name) || 'Coming Soon'}</div>
              )}
              <p className="text-sm leading-relaxed max-w-md" style={{ color: cv('footer-text', '#a0a0b0') }}>
                {content.footer_description || 'A membership-based community focused on financial literacy, growing assets, and creating generational wealth.'}
              </p>
            </div>
            {/* Right: Social */}
            <div className="md:text-right">
              <h3 className="font-semibold text-sm mb-4" style={{ color: cv('heading', '#f5f5f5') }}>
                {content.footer_social_title || 'Follow Us'}
              </h3>
              <div className="flex gap-2 md:justify-end">
                {socialLinks.length > 0 ? socialLinks.map((s, i) => <SocialIcon key={i} type={s.platform} url={s.url} />) : (
                  <>
                    <SocialIcon type="facebook" url="#" />
                    <SocialIcon type="twitter" url="#" />
                    <SocialIcon type="youtube" url="#" />
                    <SocialIcon type="instagram" url="#" />
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="border-t pt-6 text-center" style={{ borderColor: cv('border', 'rgba(201,168,76,0.3)') }}>
            <p className="text-xs" style={{ color: cv('footer-text', '#a0a0b0') }}>{content.footer_text || '\u00A9 Coming Soon'}</p>
          </div>
        </div>
      </footer>

      {/* Cookie Banner */}
      <CookieBanner message={content.cookie_message} />

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.8s ease-out both; }
        html { scroll-behavior: smooth; }
      `}</style>
    </div>
  );
}
