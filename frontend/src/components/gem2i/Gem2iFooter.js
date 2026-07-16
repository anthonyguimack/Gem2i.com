import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail } from 'lucide-react';
import { publicAPI } from '../../lib/api';
import { BACKEND_URL } from '../../lib/config';
import { useT } from '../../lib/i18n';
import { useSocialCatalog, resolveKey, SocialIcon } from '../../lib/socialCatalog';
import Gem2iCookieNotice from './Gem2iCookieNotice';

const GEM_FONT = "'Poppins', sans-serif";

/**
 * gem2i public footer — brand blurb + HQ contact block (from gem_config
 * content), CMS sitemap, socials, copyright. Data props come from Footer.js's
 * shared useFooterData() hook.
 */
export default function Gem2iFooter({ settings, socialLinks, footerPages, isExternal }) {
  const tt = useT();
  const { byKey } = useSocialCatalog();
  const [contactInfo, setContactInfo] = useState(null);
  const logoOff = settings.logo_off;
  const logoSrc = logoOff ? (logoOff.startsWith('/api') ? `${BACKEND_URL}${logoOff}` : logoOff) : null;
  const brandName = tt(settings.brand_name) || 'GEM2i';

  useEffect(() => {
    publicAPI.getGemContent().then(r => setContactInfo(r.data?.contact_info || null)).catch(() => {});
  }, []);

  const renderPageLink = (page) => {
    const cls = 'text-sm transition-colors hover:text-white';
    const style = { color: 'var(--color-footer-text, #A7B3BF)' };
    if (isExternal(page.url) || page.open_in_new_tab) {
      return <a href={isExternal(page.url) ? page.url : (page.url || '/')} target="_blank" rel="noreferrer" className={cls} style={style}>{page.title}</a>;
    }
    return <Link to={page.url || `/page/${page.id}`} className={cls} style={style}>{page.title}</Link>;
  };

  const half = Math.ceil(footerPages.length / 2);
  const col1 = footerPages.slice(0, half);
  const col2 = footerPages.slice(half);

  return (
    <footer style={{ backgroundColor: 'var(--color-footer-bg, #030609)', fontFamily: GEM_FONT }} data-testid="site-footer">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand + blurb */}
          <div className="lg:col-span-2 max-w-md">
            {logoSrc
              ? <img src={logoSrc} alt={brandName} className="h-10 w-auto object-contain mb-5" data-testid="footer-logo-img" />
              : <p className="text-white text-lg font-bold tracking-[0.18em] mb-5">{brandName}</p>}
            <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--color-footer-text, #A7B3BF)' }}>
              {tt(settings.footer_description)}
            </p>
            {contactInfo && (
              <ul className="space-y-2.5 text-sm" style={{ color: 'var(--color-footer-text, #A7B3BF)' }}>
                {tt(contactInfo.headquarters) && (
                  <li className="flex items-center gap-2.5">
                    <MapPin className="w-4 h-4 shrink-0" style={{ color: 'var(--color-accent, #3287B7)' }} />
                    {tt(contactInfo.headquarters)}
                  </li>
                )}
                {contactInfo.phone && (
                  <li className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 shrink-0" style={{ color: 'var(--color-accent, #3287B7)' }} />
                    <a href={`tel:${contactInfo.phone}`} className="hover:text-white transition-colors">{contactInfo.phone}</a>
                  </li>
                )}
                {contactInfo.email && (
                  <li className="flex items-center gap-2.5">
                    <Mail className="w-4 h-4 shrink-0" style={{ color: 'var(--color-accent, #3287B7)' }} />
                    <a href={`mailto:${contactInfo.email}`} className="hover:text-white transition-colors">{contactInfo.email}</a>
                  </li>
                )}
              </ul>
            )}
          </div>

          {/* Sitemap */}
          <div>
            <h4 className="text-white text-xs font-semibold uppercase tracking-[0.2em] mb-5">{tt({ en: 'Site Map', es: 'Mapa del Sitio' })}</h4>
            {footerPages.length > 0 ? (
              <div className="grid grid-cols-2 gap-x-6 gap-y-2.5" data-testid="footer-sitemap">
                <ul className="space-y-2.5">{col1.map(p => <li key={p.id}>{renderPageLink(p)}</li>)}</ul>
                <ul className="space-y-2.5">{col2.map(p => <li key={p.id}>{renderPageLink(p)}</li>)}</ul>
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'var(--color-footer-text, #A7B3BF)' }}>—</p>
            )}
          </div>

          {/* Connect */}
          <div>
            <h4 className="text-white text-xs font-semibold uppercase tracking-[0.2em] mb-5">{tt({ en: 'Connect', es: 'Conecta' })}</h4>
            <div className="flex items-center gap-2">
              {socialLinks.map(link => {
                const key = link.key || resolveKey(byKey, link) || '';
                const entry = byKey[key];
                return (
                  <a key={link.id} href={link.url} target="_blank" rel="noreferrer"
                    aria-label={link.platform || (entry && entry.label) || 'Social link'}
                    title={link.platform || (entry && entry.label) || ''}
                    className="w-9 h-9 rounded-full border border-white/15 flex items-center justify-center text-white/60 hover:text-white hover:border-[var(--color-accent,#3287B7)] transition-all"
                    data-testid={`footer-social-${key || link.icon || 'link'}`}>
                    <SocialIcon svg={entry && entry.svg} size={15} />
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-white/[0.06] py-5">
        <p className="text-center text-xs px-6" style={{ color: 'var(--color-footer-text, #A7B3BF)', opacity: 0.7 }}>
          {tt(settings.footer_copyright) || '© Gem2i. All Rights Reserved.'}
        </p>
      </div>
      <Gem2iCookieNotice />
    </footer>
  );
}
