import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Send } from 'lucide-react';
import { useSettings } from '../../App';
import { publicAPI } from '../../lib/api';
import { BACKEND_URL } from '../../lib/config';
import { useT } from '../../lib/i18n';
import { resolveActivePersonality, scopePagesForPersonality } from '../../lib/pbPersonality';
import { useSocialCatalog, resolveKey, SocialIcon } from '../../lib/socialCatalog';
import Gem2iFooter from '../gem2i/Gem2iFooter';

// Categories exclusive to the Personal Brand mini-sites — hidden from other themes.
const PB_CATS = new Set(['business', 'lifestyle', 'personal']);

function useFooterData() {
  const settings = useSettings();
  const location = useLocation();
  const isPB = (settings.active_theme || 'default') === 'personalbrand';
  const [allPages, setAllPages] = React.useState([]);
  // Only ACTIVE networks appear on the public site (SOCIAL_LINKS_KMS_SYNC_PLAN).
  const socialLinks = (settings.social_links || []).filter(l => l.active !== false && (l.url || '').trim());

  React.useEffect(() => {
    publicAPI.getNavPages().then(r => setAllPages(r.data || [])).catch(() => {});
  }, []);

  // Scope footer pages to the active mini-site (same logic as the navbar):
  // on Personal Brand show the active personality's pages + "All Templates"
  // pages; on other themes show only universal pages.
  const active = isPB ? resolveActivePersonality(location.pathname, settings, allPages) : 'business';
  const scoped = isPB
    ? scopePagesForPersonality(allPages, active)
    : allPages.filter(p => !PB_CATS.has(p.category));
  const footerPages = scoped
    .filter(p => p.show_in_footer)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const isExternal = (url) => url && (url.startsWith('http://') || url.startsWith('https://'));
  const isAdmin = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
  return { settings, socialLinks, footerPages, isExternal, isAdmin };
}

function FooterContent({ settings, socialLinks, footerPages, isExternal, logoSrc, theme }) {
  const tt = useT();
  const { byKey } = useSocialCatalog();
  const isClassic = theme === 'classic';
  const isPersonalBrand = theme === 'personalbrand';
  const fontFamily = isClassic ? "'Playfair Display', serif"
    : isPersonalBrand ? "'Plus Jakarta Sans', 'Inter', sans-serif"
    : undefined;
  const API = BACKEND_URL;
  const brandName = tt(settings.brand_name) || 'Legacy';

  // Split footer pages into two columns
  const half = Math.ceil(footerPages.length / 2);
  const col1 = footerPages.slice(0, half);
  const col2 = footerPages.slice(half);

  const renderPageLink = (page) => {
    if (isExternal(page.url) || page.open_in_new_tab) {
      return (
        <a href={isExternal(page.url) ? page.url : (page.url || '/')} target="_blank" rel="noreferrer" className="text-white/50 text-sm hover:text-white transition-colors flex items-center gap-2">
          <ArrowRight className="w-3 h-3 flex-shrink-0" /> {page.title}
        </a>
      );
    }
    return (
      <Link to={page.url || `/page/${page.id}`} className="text-white/50 text-sm hover:text-white transition-colors flex items-center gap-2">
        <ArrowRight className="w-3 h-3 flex-shrink-0" /> {page.title}
      </Link>
    );
  };

  return (
    <>
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Column 1: Logo + Description */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              {logoSrc ? (
                <img src={logoSrc} alt={brandName} className="h-10 w-auto object-contain" data-testid="footer-logo-img" />
              ) : (
                <>
                  <div className="w-9 h-9 flex items-center justify-center" style={{ backgroundColor: 'var(--color-accent, #0D9488)', borderRadius: isClassic ? 0 : '0.25rem' }}>
                    <span className="text-white font-bold text-sm" style={{ fontFamily: fontFamily || 'Playfair Display, serif' }}>{brandName[0]}</span>
                  </div>
                  <span className="text-lg font-bold" style={{ fontFamily: fontFamily || 'Playfair Display, serif' }}>{brandName}</span>
                </>
              )}
            </div>
            <p className="text-white/50 text-sm leading-relaxed" style={fontFamily ? { fontFamily } : {}}>
              {tt(settings.footer_description) || 'Strategic consulting for businesses seeking sustainable growth and lasting impact.'}
            </p>
          </div>

          {/* Columns 2-3: Site Map (two columns from CMS pages) */}
          <div className="sm:col-span-2 lg:col-span-2">
            <h4 className="text-white text-sm font-bold uppercase tracking-wider mb-5" style={fontFamily ? { fontFamily } : {}}>Site Map</h4>
            {footerPages.length > 0 ? (
              <div className="grid grid-cols-2 gap-x-8 gap-y-2.5" data-testid="footer-sitemap">
                <ul className="space-y-2.5">
                  {col1.map(page => <li key={page.id}>{renderPageLink(page)}</li>)}
                </ul>
                <ul className="space-y-2.5">
                  {col2.map(page => <li key={page.id}>{renderPageLink(page)}</li>)}
                </ul>
              </div>
            ) : (
              <p className="text-white/30 text-sm">No pages configured for footer.</p>
            )}
          </div>

          {/* Column 4: Connect (Social + Email) */}
          <div>
            <h4 className="text-white text-sm font-bold uppercase tracking-wider mb-5" style={fontFamily ? { fontFamily } : {}}>Connect</h4>
            <div className="flex items-center gap-2 mb-5">
              {socialLinks.map(link => {
                const key = link.key || resolveKey(byKey, link) || '';
                const entry = byKey[key];
                return (
                  <a key={link.id} href={link.url} target="_blank" rel="noreferrer"
                    aria-label={link.platform || (entry && entry.label) || 'Social link'}
                    title={link.platform || (entry && entry.label) || ''}
                    className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-white/50 hover:text-white hover:border-white/50 transition-all"
                    data-testid={`footer-social-${key || link.icon || 'link'}`}>
                    <SocialIcon svg={entry && entry.svg} size={14} />
                  </a>
                );
              })}
            </div>
            <p className="text-white/50 text-sm mb-3">{tt(settings.footer_newsletter_text) || 'Get the latest insights delivered to your inbox.'}</p>
            <div className="flex">
              <input type="email" placeholder={tt(settings.footer_newsletter_placeholder) || 'Email address'}
                className="flex-1 bg-white/5 border border-white/10 text-white text-sm px-3 py-2.5 rounded-l-md placeholder:text-white/30 focus:outline-none focus:border-white/30"
                data-testid="footer-email-input" />
              <button className="px-4 py-2.5 rounded-r-md text-white text-sm font-medium flex items-center gap-1"
                style={{ backgroundColor: 'var(--color-accent, #0D9488)' }}
                data-testid="footer-subscribe-btn">
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 py-4">
        <p className="text-center text-white/30 text-xs" style={fontFamily ? { fontFamily } : {}}>
          {tt(settings.footer_copyright) || 'Legacy Consulting - All rights reserved.'}
        </p>
      </div>
    </>
  );
}

function DefaultFooter() {
  const { settings, socialLinks, footerPages, isExternal, isAdmin } = useFooterData();
  if (isAdmin) return null;
  const API = BACKEND_URL;
  const logoOff = settings.logo_off;
  const logoSrc = logoOff ? (logoOff.startsWith('/api') ? `${API}${logoOff}` : logoOff) : null;

  return (
    <footer style={{ backgroundColor: 'var(--color-footer-bg, #1a2332)', color: 'var(--color-footer-text, #FFFFFF)' }} data-testid="site-footer">
      <FooterContent settings={settings} socialLinks={socialLinks} footerPages={footerPages} isExternal={isExternal} logoSrc={logoSrc} theme="default" />
    </footer>
  );
}

function ModernFooter() {
  const { settings, socialLinks, footerPages, isExternal, isAdmin } = useFooterData();
  if (isAdmin) return null;
  const API = BACKEND_URL;
  const logoOff = settings.logo_off;
  const logoSrc = logoOff ? (logoOff.startsWith('/api') ? `${API}${logoOff}` : logoOff) : null;

  return (
    <footer className="relative overflow-hidden" data-testid="site-footer">
      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }} />
      <div className="relative">
        <FooterContent settings={settings} socialLinks={socialLinks} footerPages={footerPages} isExternal={isExternal} logoSrc={logoSrc} theme="modern" />
      </div>
    </footer>
  );
}

function ClassicFooter() {
  const { settings, socialLinks, footerPages, isExternal, isAdmin } = useFooterData();
  if (isAdmin) return null;
  const API = BACKEND_URL;
  const logoOff = settings.logo_off;
  const logoSrc = logoOff ? (logoOff.startsWith('/api') ? `${API}${logoOff}` : logoOff) : null;

  return (
    <footer data-testid="site-footer">
      <div style={{ backgroundColor: 'var(--color-primary, #1a2332)' }}>
        <FooterContent settings={settings} socialLinks={socialLinks} footerPages={footerPages} isExternal={isExternal} logoSrc={logoSrc} theme="classic" />
      </div>
    </footer>
  );
}

function PersonalBrandFooter() {
  const { settings, socialLinks, footerPages, isExternal, isAdmin } = useFooterData();
  if (isAdmin) return null;
  const API = BACKEND_URL;
  const logoOff = settings.logo_off;
  const logoSrc = logoOff ? (logoOff.startsWith('/api') ? `${API}${logoOff}` : logoOff) : null;

  return (
    <footer
      data-testid="site-footer"
      style={{
        backgroundColor: 'var(--color-footer-bg, #111111)',
        color: 'var(--color-footer-text, #ffffff)',
        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
      }}
    >
      <FooterContent settings={settings} socialLinks={socialLinks} footerPages={footerPages} isExternal={isExternal} logoSrc={logoSrc} theme="personalbrand" />
    </footer>
  );
}

function Gem2iFooterWrapper() {
  const { settings, socialLinks, footerPages, isExternal, isAdmin } = useFooterData();
  if (isAdmin) return null;
  return <Gem2iFooter settings={settings} socialLinks={socialLinks} footerPages={footerPages} isExternal={isExternal} />;
}

export default function Footer() {
  const settings = useSettings();
  const theme = settings.active_theme || 'default';
  if (theme === 'gem2i') return <Gem2iFooterWrapper />;
  if (theme === 'modern') return <ModernFooter />;
  if (theme === 'classic') return <ClassicFooter />;
  if (theme === 'personalbrand') return <PersonalBrandFooter />;
  return <DefaultFooter />;
}
