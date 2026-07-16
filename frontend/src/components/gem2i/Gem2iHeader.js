import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, LogIn, LogOut } from 'lucide-react';
import LoginModal from '../LoginModal';
import LanguageSwitcher from '../LanguageSwitcher';
import { useT } from '../../lib/i18n';
import { useSocialCatalog, resolveKey, SocialIcon } from '../../lib/socialCatalog';
import Gem2iContactPanel, { Gem2iContactTab } from './Gem2iContactPanel';

const GEM_FONT = "'Poppins', sans-serif";

/**
 * gem2i public header — dark entertainment register (legacy gem2i.com look):
 * transparent over the hero, solid near-black on scroll, uppercase tracked
 * nav, a right slide-in side menu panel (the legacy signature) and the fixed
 * contact tab + slide-in contact form. Receives everything from Navbar.js's
 * shared useNavData() hook so page gating / permissions behave identically
 * across themes.
 */
export default function Gem2iHeader({ nav }) {
  const tt = useT();
  const {
    user, logout, settings, socialLinks, socialByKey, headerPages, handlePageClick,
    isExternal, isAdmin, location, loginOpen, setLoginOpen, hasCmsAccess, hasMyAccount,
  } = nav;
  const [menuOpen, setMenuOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hasHero, setHasHero] = useState(true);
  const API = process.env.REACT_APP_BACKEND_URL;
  const resolveSrc = (v) => v ? (v.startsWith('/api') ? `${API}${v}` : v) : null;
  const logoSrc = resolveSrc(settings.logo_on_1 || settings.logo_on || settings.logo_on_2);
  const brandName = tt(settings.brand_name) || 'GEM2i';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the side menu on navigation
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  // Anywhere on the site can open the contact panel (e.g. the homepage
  // services banner) without prop-drilling through the router.
  useEffect(() => {
    const open = () => setContactOpen(true);
    window.addEventListener('gem2i:open-contact', open);
    return () => window.removeEventListener('gem2i:open-contact', open);
  }, []);

  // Pages without a hero need a solid header + a spacer so content doesn't
  // slide under the fixed bar (same detection as ModernNavbar).
  useEffect(() => {
    const check = () => setHasHero(!!document.querySelector('[data-testid="hero-section"]'));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [location.pathname]);

  if (isAdmin) return null;

  const linkFor = (page) => {
    const href = isExternal(page.url) ? page.url : (page.url || `/page/${page.id}`);
    const isExt = isExternal(page.url);
    const active = location.pathname === href;
    return { href, isExt, active };
  };

  return (
    <>
      <header
        className="fixed inset-x-0 top-0 z-50 transition-all duration-300 motion-reduce:transition-none"
        style={{
          backgroundColor: (scrolled || !hasHero) ? 'var(--color-navbar-bg, rgba(4,8,12,0.92))' : 'transparent',
          backdropFilter: (scrolled || !hasHero) ? 'blur(14px)' : 'none',
          borderBottom: (scrolled || !hasHero) ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
          fontFamily: GEM_FONT,
        }}
        data-testid="main-navbar"
      >
        <div className="max-w-7xl mx-auto px-5 md:px-10 flex items-center justify-between h-[72px]">
          <Link to="/" className="flex items-center gap-3 shrink-0" data-testid="brand-logo">
            {logoSrc
              ? <img src={logoSrc} alt={brandName} className="h-9 w-auto object-contain" data-testid="navbar-logo-img" />
              : <span className="text-white text-xl font-bold tracking-[0.18em]" style={{ fontFamily: GEM_FONT }}>{brandName}</span>}
          </Link>

          <nav className="hidden lg:flex items-center gap-7" aria-label="Primary">
            {headerPages.map(page => {
              const { href, isExt, active } = linkFor(page);
              const Comp = isExt ? 'a' : Link;
              const props = isExt
                ? { href, target: page.open_in_new_tab ? '_blank' : '_self', rel: 'noreferrer' }
                : { to: href, onClick: e => handlePageClick(page, e) };
              return (
                <Comp key={page.id} {...props}
                  className="text-[13px] font-medium uppercase tracking-[0.14em] transition-colors hover:text-white"
                  style={{ color: active ? 'var(--color-accent, #3287B7)' : 'rgba(255,255,255,0.85)' }}
                  data-testid={`nav-${page.title.toLowerCase().replace(/\s/g, '-')}`}>
                  {page.title}
                </Comp>
              );
            })}
          </nav>

          <div className="flex items-center gap-2.5">
            {user ? (
              <div className="hidden sm:flex items-center gap-2">
                {hasMyAccount && <Link to="/my-account/membership-profile" className="text-xs font-medium text-white/80 hover:text-white px-2 py-1.5" data-testid="nav-my-account">{tt({ en: 'My Account', es: 'Mi Cuenta' })}</Link>}
                {hasCmsAccess && <Link to="/admin" className="text-xs font-medium px-3 py-1.5 rounded-sm" style={{ backgroundColor: 'var(--color-accent, #3287B7)', color: '#fff' }} data-testid="nav-admin-btn">Admin</Link>}
                <button onClick={logout} aria-label={tt({ en: 'Log out', es: 'Cerrar sesión' })} className="p-2 text-white/70 hover:text-white transition-colors"><LogOut className="w-4 h-4" /></button>
              </div>
            ) : (
              <button onClick={() => setLoginOpen(true)}
                className="text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded-sm flex items-center gap-1.5 transition-colors"
                style={{ backgroundColor: 'var(--color-button-bg, #3287B7)', color: 'var(--color-button-text, #fff)' }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-button-hover-bg, #4DA3D4)'; e.currentTarget.style.color = 'var(--color-button-hover-text, #04080C)'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--color-button-bg, #3287B7)'; e.currentTarget.style.color = 'var(--color-button-text, #fff)'; }}
                data-testid="login-btn">
                <LogIn className="w-3.5 h-3.5" /> {tt({ en: 'Login', es: 'Entrar' })}
              </button>
            )}
            <LanguageSwitcher dark />
            <button onClick={() => setMenuOpen(true)} aria-label={tt({ en: 'Open menu', es: 'Abrir menú' })}
              className="p-2 text-white/85 hover:text-white transition-colors" data-testid="gem2i-menu-toggle">
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>
      {!hasHero && <div className="h-[72px]" aria-hidden="true" style={{ backgroundColor: 'var(--color-page-bg, #04080C)' }} />}

      {/* Side menu panel (legacy gem2i signature — all viewports) */}
      <div
        className={`fixed inset-0 z-[70] bg-black/60 transition-opacity duration-300 motion-reduce:transition-none ${menuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setMenuOpen(false)} aria-hidden="true"
      />
      <aside
        className={`fixed top-0 right-0 z-[71] h-full w-72 transform transition-transform duration-300 ease-out motion-reduce:transition-none ${menuOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ backgroundColor: 'var(--color-section-bg, #0A121A)', fontFamily: GEM_FONT }}
        role="dialog" aria-modal="true" aria-label={tt({ en: 'Site menu', es: 'Menú del sitio' })}
        data-testid="gem2i-side-menu"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: 'var(--color-card-border, rgba(255,255,255,0.08))' }}>
          <span className="text-white text-sm font-semibold tracking-[0.2em] uppercase">{brandName}</span>
          <button onClick={() => setMenuOpen(false)} aria-label={tt({ en: 'Close menu', es: 'Cerrar menú' })} className="p-2 text-white/60 hover:text-white transition-colors" data-testid="gem2i-menu-close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="px-6 py-6 space-y-1 overflow-y-auto" aria-label="Side menu">
          {headerPages.map(page => {
            const { href, isExt, active } = linkFor(page);
            const Comp = isExt ? 'a' : Link;
            const props = isExt
              ? { href, target: page.open_in_new_tab ? '_blank' : '_self', rel: 'noreferrer' }
              : { to: href, onClick: e => { handlePageClick(page, e); setMenuOpen(false); } };
            return (
              <Comp key={page.id} {...props}
                className="block py-2.5 text-sm font-medium uppercase tracking-[0.12em] transition-colors hover:text-white"
                style={{ color: active ? 'var(--color-accent, #3287B7)' : 'rgba(255,255,255,0.75)' }}
                data-testid={`side-nav-${page.title.toLowerCase().replace(/\s/g, '-')}`}>
                {page.title}
              </Comp>
            );
          })}
          <button onClick={() => { setMenuOpen(false); setContactOpen(true); }}
            className="block w-full text-left py-2.5 text-sm font-medium uppercase tracking-[0.12em] text-white/75 hover:text-white transition-colors"
            data-testid="side-nav-contact">
            {tt({ en: 'Contact Us', es: 'Contáctanos' })}
          </button>
          {user && (
            <div className="sm:hidden pt-4 mt-4 border-t space-y-1" style={{ borderColor: 'var(--color-card-border, rgba(255,255,255,0.08))' }}>
              {hasMyAccount && <Link to="/my-account/membership-profile" onClick={() => setMenuOpen(false)} className="block py-2.5 text-sm font-medium text-white/75 hover:text-white">{tt({ en: 'My Account', es: 'Mi Cuenta' })}</Link>}
              {hasCmsAccess && <Link to="/admin" onClick={() => setMenuOpen(false)} className="block py-2.5 text-sm font-medium" style={{ color: 'var(--color-accent, #3287B7)' }}>Admin</Link>}
              <button onClick={() => { setMenuOpen(false); logout(); }} className="block py-2.5 text-sm font-medium text-white/75 hover:text-white">{tt({ en: 'Log out', es: 'Cerrar sesión' })}</button>
            </div>
          )}
        </nav>
        {socialLinks.length > 0 && (
          <div className="absolute bottom-0 inset-x-0 px-6 py-5 border-t flex items-center gap-2" style={{ borderColor: 'var(--color-card-border, rgba(255,255,255,0.08))' }}>
            {socialLinks.map(link => {
              const entry = socialByKey[link.key || resolveKey(socialByKey, link) || ''];
              return (
                <a key={link.id} href={link.url} target="_blank" rel="noreferrer"
                  aria-label={link.platform || (entry && entry.label) || 'Social link'}
                  className="w-8 h-8 rounded-full border border-white/15 flex items-center justify-center text-white/60 hover:text-white hover:border-white/40 transition-all">
                  <SocialIcon svg={entry && entry.svg} size={14} />
                </a>
              );
            })}
          </div>
        )}
      </aside>

      <Gem2iContactTab onOpen={() => setContactOpen(true)} />
      <Gem2iContactPanel open={contactOpen} onClose={() => setContactOpen(false)} />
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}
