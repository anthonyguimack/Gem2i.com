import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, LogIn, LogOut } from 'lucide-react';
import LoginModal from '../LoginModal';
import LanguageSwitcher from '../LanguageSwitcher';
import { useT } from '../../lib/i18n';
import { useSocialCatalog, resolveKey, SocialIcon } from '../../lib/socialCatalog';
import { Gem2iContactTab } from './Gem2iContactPanel';
import Gem2iWaitingListModal from './Gem2iWaitingListModal';

const GEM_FONT = "'Manrope', sans-serif";

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

  // Every "Contact us" (tab, side menu, banners, `gem2i:open-contact` events)
  // goes to the homepage Contact section (#contact): scroll when it is on the
  // page, otherwise navigate home and let the homepage scroll to the hash.
  const navigate = useNavigate();
  const goToContact = React.useCallback(() => {
    setMenuOpen(false);
    const el = document.getElementById('contact');
    if (window.location.pathname === '/' && el) {
      // window.scrollTo, not scrollIntoView: a wrapper on the home page swallows scrollIntoView.
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 72,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      window.history.replaceState(null, '', '#contact');
    } else {
      navigate('/#contact');
    }
  }, [navigate]);
  useEffect(() => {
    window.addEventListener('gem2i:open-contact', goToContact);
    return () => window.removeEventListener('gem2i:open-contact', goToContact);
  }, [goToContact]);

  // Catalog pages open the login modal for gated interactions (follow, and
  // later guest-list/ticket actions) via the same window-event pattern.
  useEffect(() => {
    const open = () => setLoginOpen(true);
    window.addEventListener('gem2i:open-login', open);
    return () => window.removeEventListener('gem2i:open-login', open);
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
        <div className="w-full px-5 md:px-8 2xl:px-16 grid grid-cols-[1fr_auto] lg:grid-cols-[1fr_auto_1fr] items-center gap-6 h-[72px] lg:h-[88px]">
          <Link to="/" className="flex items-center gap-3 shrink-0 justify-self-start" data-testid="brand-logo">
            {logoSrc
              ? <img src={logoSrc} alt={brandName} className="h-9 w-auto object-contain" data-testid="navbar-logo-img" />
              : <span className="text-white text-xl font-bold tracking-[0.18em]" style={{ fontFamily: GEM_FONT }}>{brandName}</span>}
          </Link>

          <nav className="hidden lg:flex items-center justify-center gap-4 xl:gap-5 2xl:gap-8" aria-label={tt({ en: 'Main navigation', es: 'Navegación principal' })}>
            {headerPages.map(page => {
              const { href, isExt, active } = linkFor(page);
              const Comp = isExt ? 'a' : Link;
              const props = isExt
                ? { href, target: page.open_in_new_tab ? '_blank' : '_self', rel: 'noreferrer' }
                : { to: href, onClick: e => handlePageClick(page, e) };
              return (
                <Comp key={page.id} {...props}
                  aria-current={active ? 'page' : undefined}
                  className={`gem-nav-link whitespace-nowrap py-2 text-[14px] font-semibold${active ? ' is-active' : ''}`}
                  data-testid={`nav-${page.title.toLowerCase().replace(/\s/g, '-')}`}>
                  {page.title}
                </Comp>
              );
            })}
          </nav>

          <div className="flex items-center justify-end gap-1.5 2xl:gap-3 justify-self-end">
            {user ? (
              <div className="hidden sm:flex items-center gap-2">
                {hasMyAccount && <Link to="/my-account/membership-profile" className={`gem-nav-link whitespace-nowrap text-[15px] font-medium px-2 py-1.5${location.pathname.startsWith('/my-account') ? ' is-active' : ''}`} data-testid="nav-my-account">{tt({ en: 'My Account', es: 'Mi Cuenta' })}</Link>}
                {hasCmsAccess && <Link to="/admin" className="gem-press gem-nav-pill text-[15px] font-medium px-4 py-2 rounded-full" data-testid="nav-admin-btn">Admin</Link>}
                <button onClick={logout} aria-label={tt({ en: 'Log out', es: 'Cerrar sesión' })} className="p-2 text-white/70 hover:text-white transition-colors"><LogOut className="w-4 h-4" /></button>
              </div>
            ) : (
              <button onClick={() => setLoginOpen(true)}
                className="gem-press whitespace-nowrap text-[15px] font-medium px-5 py-2 rounded-full flex items-center gap-1.5 transition-colors"
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
      {!hasHero && <div className="h-[72px] lg:h-[88px]" aria-hidden="true" style={{ backgroundColor: 'var(--color-page-bg, #04080C)' }} />}

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
        <nav className="px-6 py-6 space-y-1 overflow-y-auto" aria-label={tt({ en: 'Side menu', es: 'Menú lateral' })}>
          {headerPages.map(page => {
            const { href, isExt, active } = linkFor(page);
            const Comp = isExt ? 'a' : Link;
            const props = isExt
              ? { href, target: page.open_in_new_tab ? '_blank' : '_self', rel: 'noreferrer' }
              : { to: href, onClick: e => { handlePageClick(page, e); setMenuOpen(false); } };
            return (
              <Comp key={page.id} {...props}
                className="block py-2.5 text-sm font-semibold transition-colors hover:text-white"
                style={{ color: active ? 'var(--color-accent, #3287B7)' : 'rgba(255,255,255,0.75)' }}
                data-testid={`side-nav-${page.title.toLowerCase().replace(/\s/g, '-')}`}>
                {page.title}
              </Comp>
            );
          })}
          <button onClick={goToContact}
            className="block w-full text-left py-2.5 text-sm font-semibold text-white/75 hover:text-white transition-colors"
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

      <Gem2iContactTab onOpen={goToContact} />
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
      <Gem2iWaitingListModal />
    </>
  );
}
