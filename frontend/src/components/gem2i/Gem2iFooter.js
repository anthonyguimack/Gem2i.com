import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { publicAPI, landingAPI } from '../../lib/api';
import { BACKEND_URL } from '../../lib/config';
import { useT } from '../../lib/i18n';
import { useSocialCatalog, resolveKey, SocialIcon } from '../../lib/socialCatalog';
import AccentTitle from './AccentTitle';
import Gem2iCookieNotice from './Gem2iCookieNotice';

const GEM_FONT = "'Manrope', sans-serif";
const TEXT = 'var(--color-footer-text, #B4C0CB)';
const LINK = 'var(--color-link, #5AAFEA)';
const LEGAL = /privacy|terms|cookie|legal/i;

/**
 * gem2i public footer — FT-1 (approved 2026-10-17, bocetos/gallery-footer.html).
 *  1) Call band on the brand gradient: headline + newsletter (POST
 *     /public/landing-subscribe → CMS Landing subscribers).
 *  2) Four columns: brand blurb + HQ contact (gem_config content), CMS site map
 *     (legal pages moved to the bottom bar), offices (Maps & Locations →
 *     global_business, the same data as the home map), socials + Contact us.
 *  3) Bottom bar: copyright + legal links.
 * Data props come from Footer.js's shared useFooterData() hook.
 */
export default function Gem2iFooter({ settings, socialLinks, footerPages, isExternal }) {
  const tt = useT();
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

  const pageLink = (page, cls = 'text-[15px] transition-colors hover:text-white') => {
    if (isExternal(page.url) || page.open_in_new_tab) {
      return <a href={isExternal(page.url) ? page.url : (page.url || '/')} target="_blank" rel="noreferrer" className={cls} style={{ color: TEXT }}>{page.title}</a>;
    }
    return <Link to={page.url || `/page/${page.id}`} className={cls} style={{ color: TEXT }}>{page.title}</Link>;
  };
  const isLegal = (p) => LEGAL.test(`${p.title} ${p.url || ''}`);
  const sitePages = footerPages.filter(p => !isLegal(p));
  const legalPages = footerPages.filter(isLegal);
  const half = Math.ceil(sitePages.length / 2);
  const toContact = () => window.dispatchEvent(new CustomEvent('gem2i:open-contact'));
  const region = (o) => String(o.description || '').trim();

  return (
    <footer style={{ backgroundColor: 'var(--color-footer-bg, #030609)', fontFamily: GEM_FONT }} data-testid="site-footer">
      {/* 1 · Call band */}
      <div style={{ background: 'linear-gradient(90deg, #002444 0%, #0068b3 100%)' }} data-testid="footer-cta">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-12 md:py-14 grid lg:grid-cols-[1.2fr_1fr] gap-8 lg:gap-12 items-center">
          <div>
            <h2 className="text-white font-bold leading-[1.08] [&_.gem-accent]:!text-[#cfe9f8]" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(1.9rem, 3.4vw, 2.6rem)' }}>
              <AccentTitle text={tt({ en: 'Be part of the night', es: 'Sé parte de la noche' })} />
            </h2>
            <p className="mt-3 text-base md:text-[17px]" style={{ color: '#e3f1fa' }}>
              {tt({ en: 'Guest lists, QR e-passes and e-tickets for members. Get the next events in your inbox.', es: 'Guest lists, e-passes QR y e-tickets para miembros. Recibe los próximos eventos en tu correo.' })}
            </p>
          </div>
          <form onSubmit={subscribe} className="flex flex-col sm:flex-row gap-3 sm:items-end" data-testid="footer-newsletter">
            <label className="flex-1">
              <span className="sr-only">{tt({ en: 'Email address', es: 'Correo electrónico' })}</span>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email"
                placeholder={tt({ en: 'Your email for news and events', es: 'Tu correo para novedades y eventos' })}
                className="w-full bg-transparent border-0 border-b-[1.5px] border-white/60 focus:border-white px-0 py-3 text-base text-white placeholder:text-white/70 focus:outline-none focus:ring-0" />
            </label>
            <button type="submit" disabled={sending}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-[15px] font-semibold transition-[opacity,transform] hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
              style={{ color: '#002444' }}>
              {sending && <Loader2 className="w-4 h-4 animate-spin" />}{tt({ en: 'Subscribe', es: 'Suscribirme' })}
            </button>
          </form>
        </div>
      </div>

      {/* 2 · Columns */}
      <div className="max-w-7xl mx-auto px-6 md:px-10 pt-16 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1.3fr_1fr] gap-10 lg:gap-12">
          <div>
            {logoSrc
              ? <img src={logoSrc} alt={brandName} className="h-10 w-auto object-contain mb-5" data-testid="footer-logo-img" />
              : <p className="text-white text-xl font-extrabold tracking-[0.06em] mb-5">{brandName}</p>}
            {tt(settings.footer_description) && <p className="text-[15px] leading-[1.7] mb-6" style={{ color: TEXT }}>{tt(settings.footer_description)}</p>}
            {contactInfo && (
              <ul className="space-y-2.5 text-[15px]" style={{ color: TEXT }}>
                {tt(contactInfo.headquarters) && <li className="flex items-center gap-2.5"><MapPin className="w-4 h-4 shrink-0" style={{ color: LINK }} />{tt(contactInfo.headquarters)}</li>}
                {contactInfo.phone && <li className="flex items-center gap-2.5"><Phone className="w-4 h-4 shrink-0" style={{ color: LINK }} /><a href={`tel:${contactInfo.phone}`} className="hover:text-white transition-colors">{contactInfo.phone}</a></li>}
                {contactInfo.email && <li className="flex items-center gap-2.5"><Mail className="w-4 h-4 shrink-0" style={{ color: LINK }} /><a href={`mailto:${contactInfo.email}`} className="hover:text-white transition-colors">{contactInfo.email}</a></li>}
              </ul>
            )}
          </div>

          <div>
            <h4 className="gem-eyebrow mb-5">{tt({ en: 'Site map', es: 'Mapa del sitio' })}</h4>
            {sitePages.length > 0 && (
              <div className="grid grid-cols-2 gap-x-6" data-testid="footer-sitemap">
                <ul className="space-y-2.5">{sitePages.slice(0, half).map(p => <li key={p.id}>{pageLink(p)}</li>)}</ul>
                <ul className="space-y-2.5">{sitePages.slice(half).map(p => <li key={p.id}>{pageLink(p)}</li>)}</ul>
              </div>
            )}
          </div>

          {offices.length > 0 && (
            <div>
              <h4 className="gem-eyebrow mb-5">{tt({ en: 'Offices', es: 'Oficinas' })}</h4>
              <ul className="space-y-3" data-testid="footer-offices">
                {offices.map(o => (
                  <li key={o.id}>
                    <span className="block text-white text-[15px] font-semibold">{o.name || tt(o.title)}</span>
                    {region(o) && <span className="block text-[14px]" style={{ color: TEXT }}>{region(o)}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h4 className="gem-eyebrow mb-5">{tt({ en: 'Connect', es: 'Conecta' })}</h4>
            <div className="flex flex-wrap items-center gap-2">
              {socialLinks.map(link => {
                const key = link.key || resolveKey(byKey, link) || '';
                const entry = byKey[key];
                return (
                  <a key={link.id} href={link.url} target="_blank" rel="noreferrer"
                    aria-label={link.platform || (entry && entry.label) || 'Social link'}
                    className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white/75 hover:text-white hover:border-[var(--color-link,#5AAFEA)] transition-colors"
                    data-testid={`footer-social-${key || link.icon || 'link'}`}>
                    <SocialIcon svg={entry && entry.svg} size={16} />
                  </a>
                );
              })}
            </div>
            <button type="button" onClick={toContact}
              className="mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-[15px] font-semibold text-white transition-[opacity,transform] hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: 'var(--color-accent, #0068b3)' }}>
              {tt({ en: 'Contact us', es: 'Contáctanos' })} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3 · Bottom bar */}
        <div className="mt-14 pt-6 border-t border-white/[0.08] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[14px]" style={{ color: TEXT }}>
          <p>{tt(settings.footer_copyright) || '© Gem2i. All Rights Reserved.'}</p>
          {legalPages.length > 0 && (
            <div className="flex flex-wrap gap-x-6 gap-y-2">{legalPages.map(p => <span key={p.id}>{pageLink(p, 'text-[14px] transition-colors hover:text-white')}</span>)}</div>
          )}
        </div>
      </div>
      <Gem2iCookieNotice />
    </footer>
  );
}
