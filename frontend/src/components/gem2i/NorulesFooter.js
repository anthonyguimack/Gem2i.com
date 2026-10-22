/* Norules footer — F3 «Cinta y escenario» (boceto footer-f1-f3-real.html, 2026-10-22): brand-blue footer with a
   running «GEM2i · LET'S PARTY» band, the newsletter strip, brand blurb + contact + socials, Discover in big type,
   Company + «Become a member», offices, and an equaliser «Now playing» bar with the legal links. Own copy (D-GEM-2026-13). */
import React, { useEffect, useState } from 'react';
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
export default function NorulesFooter({ settings, socialLinks, footerPages, isExternal }) {
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

  const BLUE = '#3287B7';
  const band = Array.from({ length: 8 }, (_, i) => (i % 2 ? "LET'S PARTY" : brandName));
  const rule = 'rgba(255,255,255,.25)';
  const smallLink = 'inline-block text-[15px] font-bold text-white transition-opacity hover:opacity-75';
  return (
    <footer className="text-white overflow-hidden" style={{ backgroundColor: BLUE, fontFamily: GEM_FONT }} data-testid="site-footer">
      <style>{"@keyframes gemRun{to{transform:translateX(-50%)}}@keyframes gemEq{0%,100%{height:4px}50%{height:14px}}"}</style>
      {/* 1 · Running band */}
      <div className="group py-6 overflow-hidden border-b" style={{ borderColor: rule }} aria-hidden="true">
        <div className="flex gap-11 w-max whitespace-nowrap font-extrabold leading-none tracking-[-0.05em] animate-[gemRun_24s_linear_infinite] group-hover:[animation-play-state:paused] motion-reduce:animate-none" style={{ fontSize: 'clamp(2.6rem, 7vw, 6rem)' }}>
          {band.map((w, i) => <span key={i} style={i % 2 ? { color: 'transparent', WebkitTextStroke: '2px #fff' } : undefined}>{w}</span>)}
        </div>
      </div>

      {/* 2 · Newsletter strip */}
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:gap-10 items-center px-6 md:px-8 py-10 border-b" style={{ borderColor: rule }} data-testid="footer-cta">
        <div>
          <h2 className="font-bold leading-[1.1] [&_.gem-accent]:!text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', color: '#fff' }}>
            <AccentTitle text={tt({ en: 'Be part of the night', es: 'Sé parte de la noche' })} />
          </h2>
          <p className="mt-2.5 max-w-[52ch] leading-[1.6]" style={{ color: 'rgba(255,255,255,.85)' }}>
            {tt({ en: 'Guest lists, QR e-passes and e-tickets for members. Get the next events in your inbox.', es: 'Guest lists, e-passes QR y e-tickets para miembros. Recibe los próximos eventos en tu correo.' })}
          </p>
        </div>
        <form onSubmit={subscribe} className="flex gap-2 rounded-full p-1.5 border" style={{ backgroundColor: 'rgba(255,255,255,.14)', borderColor: 'rgba(255,255,255,.3)' }} data-testid="footer-newsletter">
          <label className="flex-1 min-w-0">
            <span className="sr-only">{tt({ en: 'Email address', es: 'Correo electrónico' })}</span>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email"
              placeholder={tt({ en: 'Your email for news and events', es: 'Tu correo para novedades y eventos' })}
              className="w-full bg-transparent border-0 px-4 py-3 text-base text-white placeholder:text-white/70 focus:outline-none focus:ring-0" />
          </label>
          <button type="submit" disabled={sending} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-[15px] font-extrabold transition-opacity hover:opacity-90 disabled:opacity-60" style={{ color: BLUE }}>
            {sending && <Loader2 className="w-4 h-4 animate-spin" />}{tt({ en: 'Subscribe', es: 'Suscribirme' })}
          </button>
        </form>
      </div>

      {/* 3 · Brand · Discover · Company · Offices */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div className="sm:col-span-2 lg:col-span-1 px-6 md:px-8 py-10 border-b lg:border-b-0 lg:border-r" style={{ borderColor: rule }}>
          {logoSrc
            ? <img src={logoSrc} alt={brandName} className="h-11 w-auto object-contain" data-testid="footer-logo-img" />
            : <p className="text-2xl font-extrabold">{brandName}</p>}
          {tt(settings.footer_description) && <p className="mt-5 max-w-[34ch] text-[15px] leading-[1.75]" style={{ color: 'rgba(255,255,255,.92)' }}>{tt(settings.footer_description)}</p>}
          {contactInfo && (
            <div className="mt-4 grid gap-1.5 text-[15px] font-bold">
              {contactInfo.email && <a href={`mailto:${contactInfo.email}`} className="justify-self-start hover:opacity-75 transition-opacity">{contactInfo.email}</a>}
              {contactInfo.phone && <a href={`tel:${contactInfo.phone}`} className="justify-self-start hover:opacity-75 transition-opacity">{contactInfo.phone}</a>}
            </div>
          )}
          {socialLinks.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2.5">
              {socialLinks.map(link => {
                const key = link.key || resolveKey(byKey, link) || '';
                const entry = byKey[key];
                return (
                  <a key={link.id} href={link.url} target="_blank" rel="noreferrer" aria-label={link.platform || (entry && entry.label) || 'Social link'}
                    className="w-[42px] h-[42px] rounded-full border border-white/70 flex items-center justify-center text-white transition-[background-color,color,transform] hover:bg-white hover:text-[#3287B7] hover:-translate-y-0.5"
                    data-testid={`footer-social-${key || link.icon || 'link'}`}>
                    <SocialIcon svg={entry && entry.svg} size={17} />
                  </a>
                );
              })}
            </div>
          )}
        </div>
        <div className="px-6 md:px-8 py-10 border-b lg:border-b-0 sm:border-r" style={{ borderColor: rule }}>
          <h4 className="mb-4 text-[11.5px] font-extrabold tracking-[0.24em] uppercase opacity-75">{tt({ en: 'Discover', es: 'Descubre' })}</h4>
          <ul className="grid" data-testid="footer-discover">
            {DISCOVER.map(d => (
              <li key={d.url}><Link to={d.url} className="inline-block font-extrabold leading-[1.45] tracking-[-0.03em] transition-[color,transform] duration-300 hover:text-[#0D0F12] hover:translate-x-1.5" style={{ fontSize: 'clamp(1.3rem, 2.1vw, 1.8rem)' }}>{tt(d.label)}</Link></li>
            ))}
          </ul>
        </div>
        <div className="px-6 md:px-8 py-10 border-b lg:border-b-0 lg:border-r" style={{ borderColor: rule }}>
          <h4 className="mb-4 text-[11.5px] font-extrabold tracking-[0.24em] uppercase opacity-75">{tt({ en: 'Company', es: 'Compañía' })}</h4>
          <ul className="grid gap-2.5" data-testid="footer-sitemap">
            {companyPages.map(p => <li key={p.id}>{pageLink(p, smallLink)}</li>)}
            <li><button type="button" onClick={toContact} className={smallLink}>{tt({ en: 'Contact', es: 'Contacto' })}</button></li>
          </ul>
          <Link to="/membership-enrollment" className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-[15px] font-extrabold transition-opacity hover:opacity-90" style={{ color: BLUE }}>
            {tt({ en: 'Become a member', es: 'Hazte socio' })} →
          </Link>
        </div>
        {offices.length > 0 && (
          <div className="px-6 md:px-8 py-10">
            <h4 className="mb-4 text-[11.5px] font-extrabold tracking-[0.24em] uppercase opacity-75">{tt({ en: 'Offices', es: 'Oficinas' })}</h4>
            <ul className="grid gap-2.5 font-semibold" data-testid="footer-offices">
              {offices.map(o => (
                <li key={o.id} className="flex flex-wrap items-center gap-2" title={region(o) || undefined}>
                  {o.name || tt(o.title)}
                  {/headquarters|sede/i.test(region(o)) && <i className="not-italic rounded-full bg-white px-2 py-0.5 text-[10.5px] font-extrabold" style={{ color: '#0D0F12' }}>HQ</i>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 4 · Now playing + legal */}
      <div className="px-6 md:px-8 py-[18px] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[13px]" style={{ backgroundColor: 'rgba(0,0,0,.2)' }}>
        <p className="flex items-center flex-wrap gap-x-2">
          <span className="inline-flex items-end gap-0.5 h-3.5" aria-hidden="true">
            {[0, 1, 2].map(i => <i key={i} className="w-[3px] h-1 bg-white animate-[gemEq_1s_ease-in-out_infinite] motion-reduce:animate-none" style={{ animationDelay: `${i * 0.2}s` }} />)}
          </span>
          {tt({ en: 'Now playing: your next night out', es: 'Sonando: tu próxima noche' })} · {tt(settings.footer_copyright) || '© Gem2i. All Rights Reserved.'}
        </p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {legalPages.map(p => <span key={p.id}>{pageLink(p, 'text-[13px] text-white transition-opacity hover:opacity-75')}</span>)}
          {enabled.length > 1 && (
            <span className="inline-flex items-center gap-1.5" data-testid="footer-lang">
              {enabled.map((l, i) => (
                <React.Fragment key={l}>
                  {i > 0 && <span aria-hidden="true">/</span>}
                  <button type="button" onClick={() => setLang(l)} aria-pressed={lang === l} className={`uppercase ${lang === l ? 'font-extrabold' : 'opacity-80 hover:opacity-100'}`}>{l}</button>
                </React.Fragment>
              ))}
            </span>
          )}
        </div>
      </div>
      <Gem2iCookieNotice />
    </footer>
  );
}
