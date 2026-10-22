/* Gem2i - 03 footer — F1 «Telón» (boceto footer-f1-f3-real.html, 2026-10-22): the page lifts like a curtain
   (rounded lip + shadow) and the night footer rises underneath: big «Be part of the night» + newsletter capsule,
   brand blurb + contact, Discover, Company, Offices, Follow, a huge outlined wordmark, legal bar. Template 03 only. */
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { publicAPI, landingAPI } from '../../lib/api';
import { BACKEND_URL } from '../../lib/config';
import { useT, useLang } from '../../lib/i18n';
import { useSocialCatalog, resolveKey, SocialIcon } from '../../lib/socialCatalog';
import AccentTitle from './AccentTitle';
import Gem2iCookieNotice from './Gem2iCookieNotice';

const GEM_FONT = "'Manrope', sans-serif";
const LEGAL = /privacy|terms|cookie|legal/i;
const DISCOVER = [
  { url: '/events', label: { en: 'Events', es: 'Eventos' } },
  { url: '/festivals', label: { en: 'Festivals', es: 'Festivales' } },
  { url: '/artists', label: { en: 'Artists', es: 'Artistas' } },
  { url: '/venues', label: { en: 'Venues', es: 'Venues' } },
];

/**
 * Data: newsletter → POST /public/landing-subscribe (CMS Landing subscribers); blurb = settings.footer_description;
 * e-mail/phone = gem_config contact_info; Company = CMS footer pages + Contact; offices = Maps & Locations →
 * global_business; socials = CMS social links. Props come from Footer.js's shared useFooterData() hook.
 */
export default function Gem03Footer({ settings, socialLinks, footerPages, isExternal }) {
  const tt = useT();
  const { lang, setLang, enabled = [] } = useLang() || {};
  const { byKey } = useSocialCatalog();
  const [contactInfo, setContactInfo] = useState(null);
  const [offices, setOffices] = useState([]);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const logoOff = settings.logo_off;
  const logoSrc = logoOff ? (logoOff.startsWith('/api') ? `${BACKEND_URL}${logoOff}` : logoOff) : null;
  const brandName = tt(settings.brand_name) || 'GEM2i';

  useEffect(() => {
    publicAPI.getGemContent().then(r => setContactInfo(r.data?.contact_info || null)).catch(() => {});
    publicAPI.getMapLocations('global_business').then(r => setOffices(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  const subscribe = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    try {
      const r = await landingAPI.subscribe({ email: email.trim() });
      toast.success(r.data?.message === 'Already subscribed'
        ? tt({ en: 'You are already subscribed.', es: 'Ya estás suscrito.' })
        : tt({ en: 'Subscribed. See you at the next event!', es: '¡Suscrito! Nos vemos en el próximo evento.' }));
      setEmail('');
    } catch (err) {
      toast.error(err?.response?.data?.detail || tt({ en: 'Could not subscribe. Try again.', es: 'No se pudo suscribir. Inténtalo de nuevo.' }));
    } finally { setSending(false); }
  };

  const pageLink = (page, cls) => {
    if (isExternal(page.url) || page.open_in_new_tab) {
      return <a href={isExternal(page.url) ? page.url : (page.url || '/')} target="_blank" rel="noreferrer" className={cls}>{page.title}</a>;
    }
    return <Link to={page.url || `/page/${page.id}`} className={cls}>{page.title}</Link>;
  };
  const isLegal = (p) => LEGAL.test(`${p.title} ${p.url || ''}`);
  const sitePages = footerPages.filter(p => !isLegal(p));
  const legalPages = footerPages.filter(isLegal);
  // Catalog pages live under Discover; everything else is Company.
  const companyPages = sitePages.filter(p => !DISCOVER.some(d => (p.url || '').replace(/\/$/, '') === d.url) && !/contact/i.test(`${p.title} ${p.url || ''}`));
  const toContact = () => window.dispatchEvent(new CustomEvent('gem2i:open-contact'));
  const region = (o) => String(o.description || '').trim();

  const lift = useRef(null);
  // Curtain: the footer content rises as it scrolls into view (CSS var --lift 0→1).
  useEffect(() => {
    const el = lift.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const onScroll = () => {
      const r = el.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, (window.innerHeight - r.top) / (window.innerHeight * 0.9)));
      el.style.setProperty('--lift', p.toFixed(3));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const muted = '#9AA3AB';
  const linkCls = 'inline-block text-[15px] font-semibold text-[#D6DBE0] transition-colors hover:text-white';
  const eyebrow = 'mb-4 text-[11.5px] font-extrabold tracking-[0.24em] uppercase text-[#6D767F]';
  return (
    <footer ref={lift} className="relative text-white overflow-hidden [--lift:1]" style={{ backgroundColor: '#0D0F12', fontFamily: GEM_FONT }} data-testid="site-footer">
      {/* Curtain lip: the page's bottom edge, rounded and shadowed, lifting off the footer. */}
      <div aria-hidden="true" className="h-9 rounded-b-[36px] shadow-[0_30px_50px_-24px_rgba(0,0,0,.6)]" style={{ backgroundColor: 'var(--color-page-bg, #fff)' }} />
      <div className="max-w-7xl mx-auto px-6 md:px-10 pt-20 pb-7 will-change-transform" style={{ transform: 'translateY(calc((1 - var(--lift)) * 90px))', opacity: 'calc(.35 + var(--lift) * .65)' }}>
        {/* 1 · Headline + newsletter */}
        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:gap-14 items-end pb-12 border-b border-[#1D232B]" data-testid="footer-cta">
          <h2 className="m-0 font-extrabold leading-[.95] tracking-[-0.05em] text-white" style={{ fontSize: 'clamp(2.6rem, 6vw, 5.2rem)' }}>
            {tt({ en: 'Be part of the', es: 'Sé parte de la' })}{' '}
            <em className="font-bold tracking-[-0.02em]" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: 'var(--color-link, #5FB2E0)' }}>{tt({ en: 'night.', es: 'noche.' })}</em>
          </h2>
          <div>
            <p className="mb-4 leading-[1.65]" style={{ color: muted }}>{tt({ en: 'Guest lists, QR e-passes and e-tickets for members. Get the next events in your inbox.', es: 'Guest lists, e-passes QR y e-tickets para miembros. Recibe los próximos eventos en tu correo.' })}</p>
            <form onSubmit={subscribe} className="flex gap-2 rounded-full p-1.5 border border-[#232A32] bg-[#161B22] transition-colors focus-within:border-[color:var(--color-link,#5FB2E0)]" data-testid="footer-newsletter">
              <label className="flex-1 min-w-0">
                <span className="sr-only">{tt({ en: 'Email address', es: 'Correo electrónico' })}</span>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email"
                  placeholder={tt({ en: 'Your email for news and events', es: 'Tu correo para novedades y eventos' })}
                  className="w-full bg-transparent border-0 px-4 py-3 text-base text-white placeholder:text-[#6D767F] focus:outline-none focus:ring-0" />
              </label>
              <button type="submit" disabled={sending} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-[15px] font-extrabold transition-opacity hover:opacity-90 disabled:opacity-60" style={{ color: '#0D0F12' }}>
                {sending && <Loader2 className="w-4 h-4 animate-spin" />}{tt({ en: 'Subscribe', es: 'Suscribirme' })}
              </button>
            </form>
          </div>
        </div>

        {/* 2 · Brand · Discover · Company · Offices · Follow */}
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.2fr_.8fr] lg:gap-8 pt-12">
          <div className="sm:col-span-2 lg:col-span-1">
            {logoSrc
              ? <img src={logoSrc} alt={brandName} className="h-11 w-auto object-contain" data-testid="footer-logo-img" />
              : <p className="text-2xl font-extrabold">{brandName}</p>}
            {tt(settings.footer_description) && <p className="mt-5 max-w-[34ch] text-[15px] leading-[1.75]" style={{ color: '#AAB2BA' }}>{tt(settings.footer_description)}</p>}
            {contactInfo && (
              <div className="mt-4 grid gap-1.5 text-[15px] font-bold">
                {contactInfo.email && <a href={`mailto:${contactInfo.email}`} className="justify-self-start transition-colors hover:text-[color:var(--color-link,#5FB2E0)]">{contactInfo.email}</a>}
                {contactInfo.phone && <a href={`tel:${contactInfo.phone}`} className="justify-self-start transition-colors hover:text-[color:var(--color-link,#5FB2E0)]">{contactInfo.phone}</a>}
              </div>
            )}
          </div>
          <div>
            <h4 className={eyebrow}>{tt({ en: 'Discover', es: 'Descubre' })}</h4>
            <ul className="grid gap-2.5" data-testid="footer-discover">
              {DISCOVER.map(d => <li key={d.url}><Link to={d.url} className={linkCls}>{tt(d.label)}</Link></li>)}
            </ul>
          </div>
          <div>
            <h4 className={eyebrow}>{tt({ en: 'Company', es: 'Compañía' })}</h4>
            <ul className="grid gap-2.5" data-testid="footer-sitemap">
              {companyPages.map(p => <li key={p.id}>{pageLink(p, linkCls)}</li>)}
              <li><button type="button" onClick={toContact} className={linkCls}>{tt({ en: 'Contact', es: 'Contacto' })}</button></li>
            </ul>
          </div>
          {offices.length > 0 && (
            <div>
              <h4 className={eyebrow}>{tt({ en: 'Offices', es: 'Oficinas' })}</h4>
              <ul className="grid gap-2.5 font-semibold text-[#D6DBE0]" data-testid="footer-offices">
                {offices.map(o => (
                  <li key={o.id} className="flex flex-wrap gap-2 items-baseline" title={region(o) || undefined}>
                    {o.name || tt(o.title)}
                    {/headquarters|sede/i.test(region(o)) && <i className="not-italic text-xs font-extrabold tracking-[0.1em]" style={{ color: 'var(--color-link, #5FB2E0)' }}>HQ</i>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <h4 className={eyebrow}>{tt({ en: 'Follow', es: 'Síguenos' })}</h4>
            <div className="flex flex-wrap gap-2.5">
              {socialLinks.map(link => {
                const key = link.key || resolveKey(byKey, link) || '';
                const entry = byKey[key];
                return (
                  <a key={link.id} href={link.url} target="_blank" rel="noreferrer" aria-label={link.platform || (entry && entry.label) || 'Social link'}
                    className="w-[42px] h-[42px] rounded-full border border-white/60 flex items-center justify-center transition-[background-color,color,transform] hover:bg-white hover:text-[#0D0F12] hover:-translate-y-0.5"
                    data-testid={`footer-social-${key || link.icon || 'link'}`}>
                    <SocialIcon svg={entry && entry.svg} size={17} />
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3 · Huge outlined wordmark */}
        <p aria-hidden="true" className="mt-14 mb-0 text-center font-extrabold leading-[.78] tracking-[-0.07em] select-none text-transparent [-webkit-text-stroke:1.5px_#262C33] transition-[-webkit-text-stroke-color] duration-500 hover:[-webkit-text-stroke-color:#3C4652]"
          style={{ fontSize: 'clamp(5rem, 21vw, 20rem)' }}>{brandName}</p>

        {/* 4 · Legal bar */}
        <div className="mt-6 pt-5 border-t border-[#1D232B] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[13px] text-[#6D767F]">
          <p>{tt(settings.footer_copyright) || '© Gem2i. All Rights Reserved.'}</p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {legalPages.map(p => <span key={p.id}>{pageLink(p, 'text-[13px] text-[#6D767F] transition-colors hover:text-white')}</span>)}
            {enabled.length > 1 && (
              <span className="inline-flex items-center gap-1.5" data-testid="footer-lang">
                {enabled.map((l, i) => (
                  <React.Fragment key={l}>
                    {i > 0 && <span aria-hidden="true">/</span>}
                    <button type="button" onClick={() => setLang(l)} aria-pressed={lang === l} className={`uppercase transition-colors hover:text-white ${lang === l ? 'text-white font-extrabold' : ''}`}>{l}</button>
                  </React.Fragment>
                ))}
              </span>
            )}
          </div>
        </div>
      </div>
      <Gem2iCookieNotice />
    </footer>
  );
}
