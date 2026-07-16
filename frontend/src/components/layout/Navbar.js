import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { useMember } from '../../lib/memberAuth';
import { publicAPI } from '../../lib/api';
import { useSettings, useTheme } from '../../App';
import LanguageSwitcher from '../LanguageSwitcher';
import { useT } from '../../lib/i18n';
import { Menu, X, LogIn, LogOut, Search } from 'lucide-react';
import LoginModal from '../LoginModal';
import SearchBar from '../SearchBar';
import { isAurexFamily } from '../../lib/themeColors';
import { resolveActivePersonality, scopePagesForPersonality, miniSiteLinks as buildMiniSiteLinks, getPersonalityVisibility, meetsVisibility } from '../../lib/pbPersonality';
import { useSocialCatalog, resolveKey, SocialIcon } from '../../lib/socialCatalog';
import Gem2iHeader from '../gem2i/Gem2iHeader';

export default function Navbar() {
  const theme = useTheme();
  if (theme === 'gem2i') return <Gem2iNavbar />;
  if (theme === 'modern' || isAurexFamily(theme)) return <ModernNavbar />;
  if (theme === 'classic') return <ClassicNavbar />;
  return <DefaultNavbar />;
}

// gem2i dark entertainment header — markup lives in components/gem2i/, the
// shared nav data/gating hook stays here so all themes behave identically.
function Gem2iNavbar() {
  const nav = useNavData();
  return <Gem2iHeader nav={nav} />;
}

function useNavData() {
  const { user, logout } = useAuth();
  const { member } = useMember();
  const settings = useSettings();
  const theme = useTheme();
  const [navPages, setNavPages] = useState([]);
  const [loginOpen, setLoginOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const { byKey: socialByKey } = useSocialCatalog();
  // Only ACTIVE networks appear on the public site (SOCIAL_LINKS_KMS_SYNC_PLAN).
  const socialLinks = (settings.social_links || []).filter(l => l.active !== false && (l.url || '').trim());

  useEffect(() => {
    publicAPI.getNavPages().then(r => setNavPages(r.data || [])).catch(() => {});
  }, []);

  // Personal Brand mini-sites ("personalities"). Each acts as its own mini-site
  // within the Personal Brand theme: the active personality is derived from the
  // URL, and the header menu is scoped to that personality's pages. The admin
  // sets the mini-site order in the Page Builder; the #1 mini-site loads at "/".
  const isPB = theme === 'personalbrand';
  // PB_CATS: categories that are exclusive to the Personal Brand template.
  // Pages with these categories must never appear in other templates' navbars.
  const PB_CATS = new Set(['business', 'lifestyle', 'personal']);

  // Active mini-site, derived from the URL + the admin-defined personality order
  // (the #1 mini-site lives at "/"). See lib/pbPersonality.js.
  const activePersonality = isPB
    ? resolveActivePersonality(location.pathname, settings, navPages)
    : 'business';

  // On the Personal Brand theme: show pages scoped to the active mini-site PLUS
  // any page tagged "All Templates" (category 'all'), which appear everywhere.
  // On every other theme: show only universal pages, hiding PB-specific ones.
  const scopedPages = isPB
    ? scopePagesForPersonality(navPages, activePersonality)
    : navPages.filter(p => !PB_CATS.has(p.category));
  const headerPages = scopedPages.filter(p => p.show_in_header).sort((a, b) => (a.order || 0) - (b.order || 0));

  // Cross-mini-site switch links, ordered per the admin's drag-and-drop order
  // (the #1 mini-site points to "/"). Gated mini-sites are hidden from visitors
  // who don't qualify, matching the route gate in App.js: 'members' needs any
  // login, 'mastermind' needs the Mastermind level (staff always pass).
  const miniSiteLinks = isPB
    ? buildMiniSiteLinks(settings).filter(l =>
        meetsVisibility(getPersonalityVisibility(settings, l.key), user, member))
    : [];

  const handlePageClick = (page, e) => {
    if (page.login_required && !user) { e.preventDefault(); setLoginOpen(true); return; }
    const url = page.url || '';
    if (url.includes('#')) {
      e.preventDefault();
      const [pathPart, hashPart] = url.split('#');
      const targetPath = pathPart || '/';
      if (location.pathname === targetPath) {
        const el = document.getElementById(hashPart);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.location.href = url;
      }
    }
  };

  const isExternal = (url) => url?.startsWith('http://') || url?.startsWith('https://');
  const isAdmin = location.pathname.startsWith('/admin');

  // Header visibility flags (Roles & Permissions):
  //   • `hasCmsAccess` controls the "Admin" button — admins always see it,
  //     operators with at least one section permission see it too.  Plain
  //     members never do.
  //   • `hasMyAccount` controls the "My Account" link — admins always see
  //     it, members must hold the `role_member` CMS role.  If an admin
  //     revokes role_member from a user, this link hides instantly.
  const hasCmsAccess = !!user && (user.role === 'admin' || (user.effective_permissions || []).length > 0);
  const hasMyAccount = !!user && (user.role === 'admin' || (user.cms_roles || []).includes('role_member'));

  return { user, logout, settings, socialLinks, socialByKey, headerPages, handlePageClick, isExternal, isAdmin, location, loginOpen, setLoginOpen, searchOpen, setSearchOpen, hasCmsAccess, hasMyAccount, isPB, activePersonality, miniSiteLinks };
}

function NavLinks({ headerPages, isExternal, handlePageClick, location, user }) {
  return (
    <>
      {headerPages.map(page => {
        const pageUrl = page.url || `/page/${page.id}`;
        if (isExternal(page.url)) {
          return <a key={page.id} href={page.url} target={page.open_in_new_tab ? '_blank' : '_self'} rel="noreferrer" className="text-sm font-medium transition-colors hover:opacity-70" style={{ color: 'var(--color-heading-color, #1a2332)' }} data-testid={`nav-${page.title.toLowerCase().replace(/\s/g, '-')}`}>{page.title}</a>;
        }
        return (
          <Link key={page.id} to={pageUrl} onClick={e => handlePageClick(page, e)}
            className="text-sm font-medium transition-colors hover:opacity-70"
            style={{ color: location.pathname === pageUrl ? 'var(--color-accent, #0D9488)' : 'var(--color-heading-color, #1a2332)' }}
            data-testid={`nav-${page.title.toLowerCase().replace(/\s/g, '-')}`}
          >{page.title} {page.login_required && !user && <span className="text-[10px]">*</span>}</Link>
        );
      })}
    </>
  );
}

function DefaultNavbar() {
  const tt = useT();
  const { user, logout, settings, socialLinks, socialByKey, headerPages, handlePageClick, isExternal, isAdmin, location, loginOpen, setLoginOpen, searchOpen, setSearchOpen, hasCmsAccess, hasMyAccount } = useNavData();
  const [mobileOpen, setMobileOpen] = useState(false);
  const API = process.env.REACT_APP_BACKEND_URL;
  const resolveSrc = (v) => v ? (v.startsWith('/api') ? `${API}${v}` : v) : null;
  // Default theme always has solid bg, so use logo_on_2 (or fallback to logo_on_1)
  const logoSrc = resolveSrc(settings.logo_on_2 || settings.logo_on_1 || settings.logo_on);
  const brandName = tt(settings.brand_name) || 'Legacy';
  const settingsLoaded = !!settings.brand_name || !!settings.id;

  if (isAdmin) return null;

  return (
    <>
      <div className="text-white/70 text-xs py-2" style={{ backgroundColor: 'var(--color-primary, #1a2332)' }} data-testid="top-bar">
        <div className="max-w-7xl mx-auto px-6 flex justify-end items-center gap-3">
          {socialLinks.map(link => {
            const entry = socialByKey[link.key || resolveKey(socialByKey, link) || ''];
            return <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="hover:text-white transition-colors" data-testid={`social-${(entry && entry.key) || link.icon || 'link'}`} title={link.platform || (entry && entry.label) || ''} aria-label={link.platform || (entry && entry.label) || 'Social link'}><SocialIcon svg={entry && entry.svg} size={14} /></a>;
          })}
        </div>
      </div>
      <header className="sticky top-0 z-50" style={{ backgroundColor: 'var(--color-navbar-bg, #ffffff)', borderBottom: '1px solid #e2e8f0' }} data-testid="main-navbar">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2" data-testid="brand-logo">
            {logoSrc ? (
              <img src={logoSrc} alt={brandName} className="h-8 w-auto object-contain" data-testid="navbar-logo-img" />
            ) : settingsLoaded ? (
              <>
                <div className="w-8 h-8 rounded-sm flex items-center justify-center" style={{ backgroundColor: 'var(--color-primary, #1a2332)' }}>
                  <span className="text-white font-bold text-sm" style={{ fontFamily: 'Playfair Display, serif' }}>{brandName[0]}</span>
                </div>
                <span className="text-xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--color-heading-color, #1a2332)' }}>{brandName}</span>
              </>
            ) : <div className="h-8 w-24" />}
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <NavLinks {...{ headerPages, isExternal, handlePageClick, location, user }} />
          </nav>
          <div className="flex items-center gap-3">
            <button onClick={() => setSearchOpen(!searchOpen)} className="p-2 hover:opacity-70" style={{ color: 'var(--color-heading-color, #1a2332)' }} data-testid="search-toggle"><Search className="w-4 h-4" /></button>
            {user ? (
              <div className="flex items-center gap-2">
                {hasMyAccount && <Link to="/my-account/membership-profile" className="text-xs font-medium px-3 py-1.5 rounded-sm hover:opacity-80" style={{ color: 'var(--color-heading-color, #1a2332)' }} data-testid="nav-my-account">My Account</Link>}
                {hasCmsAccess && <Link to="/admin" className="text-xs font-medium px-3 py-1.5 rounded-sm" style={{ backgroundColor: 'var(--color-accent, #0D9488)', color: '#fff' }} data-testid="nav-admin-btn">Admin</Link>}
                <button onClick={logout} className="text-sm flex items-center gap-1 hover:opacity-70" style={{ color: 'var(--color-heading-color, #1a2332)' }}><LogOut className="w-4 h-4" /></button>
              </div>
            ) : (
              <button onClick={() => setLoginOpen(true)} className="text-sm font-medium px-4 py-2 rounded-sm flex items-center gap-1.5" style={{ backgroundColor: 'var(--color-button-bg, #1a2332)', color: 'var(--color-button-text, #ffffff)' }} data-testid="login-btn"><LogIn className="w-3.5 h-3.5" /> Login</button>
            )}
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2" style={{ color: 'var(--color-heading-color, #1a2332)' }}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {searchOpen && <div className="max-w-7xl mx-auto px-6 pb-3"><SearchBar onClose={() => setSearchOpen(false)} /></div>}
        {mobileOpen && (
          <div className="md:hidden border-t px-6 py-4 space-y-3 bg-white">
            {headerPages.map(page => {
              const href = page.url || `/page/${page.id}`;
              return <Link key={page.id} to={href} onClick={() => setMobileOpen(false)} className="block text-sm font-medium" style={{ color: 'var(--color-heading-color, #1a2332)' }}>{page.title}</Link>;
            })}
            {hasMyAccount && <Link to="/my-account/membership-profile" onClick={() => setMobileOpen(false)} className="block text-sm font-medium" style={{ color: 'var(--color-accent, #0D9488)' }}>My Account</Link>}
          </div>
        )}
      </header>
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}

function ModernNavbar() {
  const tt = useT();
  const { user, logout, settings, socialLinks, headerPages, handlePageClick, isExternal, isAdmin, location, loginOpen, setLoginOpen, searchOpen, setSearchOpen, hasCmsAccess, hasMyAccount, isPB, activePersonality, miniSiteLinks } = useNavData();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hasHero, setHasHero] = useState(true);
  const [tickerH, setTickerH] = useState(0);
  const API = process.env.REACT_APP_BACKEND_URL;
  const resolveSrc = (v) => v ? (v.startsWith('/api') ? `${API}${v}` : v) : null;
  const logoOn1 = resolveSrc(settings.logo_on_1 || settings.logo_on);
  const logoOn2 = resolveSrc(settings.logo_on_2 || settings.logo_on);
  const brandName = tt(settings.brand_name) || 'Legacy';
  const settingsLoaded = !!settings.brand_name || !!settings.id;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Detect if page has a hero section
  useEffect(() => {
    const check = () => {
      // Match the Modern/Aurex hero AND the Personal Brand hero so the navbar
      // goes transparent and the hero background shows behind it on PB too.
      const hero = document.querySelector('[data-testid="hero-section"], [data-testid="pb-hero-section"]');
      setHasHero(!!hero);
      // The PB hero is preceded by a marquee ticker strip; offset the transparent
      // navbar by its height so the menu sits just below the strip (no overlap).
      const ticker = document.querySelector('[data-testid="pb-ticker"]');
      setTickerH(ticker ? ticker.offsetHeight : 0);
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [location.pathname]);

  if (isAdmin) return null;

  // If no hero, always show solid background
  const showSolid = scrolled || !hasHero;
  const textColor = showSolid ? 'var(--color-heading-color, #1a2332)' : '#ffffff';

  return (
    <>
      <header className={`fixed inset-x-0 z-50 transition-all duration-300 ${showSolid ? 'shadow-lg' : ''}`}
        style={{ top: showSolid ? 0 : tickerH, backgroundColor: showSolid ? 'var(--color-navbar-bg, rgba(255,255,255,0.95))' : 'transparent', backdropFilter: showSolid ? 'blur(20px)' : 'none' }}
        data-testid="main-navbar">
        <div className="max-w-7xl mx-auto px-6 md:px-10 flex items-center justify-between h-20">
          <Link to="/" className="flex items-center gap-3" data-testid="brand-logo">
            {(() => {
              const currentLogo = showSolid ? logoOn2 : logoOn1;
              if (currentLogo) return <img src={currentLogo} alt={brandName} className="h-10 w-auto object-contain" data-testid="navbar-logo-img" />;
              if (!settingsLoaded) return <div className="h-10 w-28" />;
              return (
                <>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-accent, #0D9488)' }}>
                    <span className="text-white font-bold text-base" style={{ fontFamily: 'Playfair Display, serif' }}>{brandName[0]}</span>
                  </div>
                  <span className="text-xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: textColor }}>{brandName}</span>
                </>
              );
            })()}
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            {headerPages.map(page => {
              const href = isExternal(page.url) ? page.url : (page.url || `/page/${page.id}`);
              const isExt = isExternal(page.url);
              const Comp = isExt ? 'a' : Link;
              const props = isExt ? { href, target: page.open_in_new_tab ? '_blank' : '_self', rel: 'noreferrer' } : { to: href, onClick: e => handlePageClick(page, e) };
              return <Comp key={page.id} {...props} className="text-sm font-medium tracking-wide uppercase transition-colors hover:opacity-70" style={{ color: location.pathname === href ? 'var(--color-accent, #0D9488)' : textColor, letterSpacing: '0.1em' }} data-testid={`nav-${page.title.toLowerCase().replace(/\s/g, '-')}`}>{page.title}</Comp>;
            })}
            {isPB && miniSiteLinks.length > 0 && (
              <span className="flex items-center gap-6 pl-6 ml-2 border-l" style={{ borderColor: showSolid ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.3)' }} data-testid="minisite-switch">
                {miniSiteLinks.map(link => (
                  <Link key={link.key} to={link.url}
                    className="text-sm font-semibold tracking-wide uppercase transition-colors hover:opacity-70"
                    style={{ color: activePersonality === link.key ? 'var(--color-accent, #0D9488)' : textColor, letterSpacing: '0.1em' }}
                    data-testid={`minisite-link-${link.key}`}>{link.title}</Link>
                ))}
              </span>
            )}
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2">
                {hasMyAccount && <Link to="/my-account/membership-profile" className="text-xs font-medium px-3 py-1.5 rounded-full hover:opacity-80" style={{ color: textColor }} data-testid="nav-my-account">My Account</Link>}
                {hasCmsAccess && <Link to="/admin" className="text-xs font-medium px-3 py-1.5 rounded-full transition-colors" style={{ backgroundColor: 'var(--color-button-bg, #1a2332)', color: 'var(--color-button-text, #ffffff)' }} onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-button-hover-bg, #c9a227)'; e.currentTarget.style.color = 'var(--color-button-hover-text, #111827)'; }} onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--color-button-bg, #1a2332)'; e.currentTarget.style.color = 'var(--color-button-text, #ffffff)'; }} data-testid="nav-admin-btn">Admin</Link>}
                <button onClick={logout} className="p-2 hover:opacity-70" style={{ color: textColor }}><LogOut className="w-4 h-4" /></button>
              </div>
            ) : (
              <button onClick={() => setLoginOpen(true)} className="text-sm font-medium px-5 py-2.5 rounded-full flex items-center gap-2 transition-colors" style={{ backgroundColor: 'var(--color-button-bg, #1a2332)', color: 'var(--color-button-text, #ffffff)' }} onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-button-hover-bg, #c9a227)'; e.currentTarget.style.color = 'var(--color-button-hover-text, #111827)'; }} onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--color-button-bg, #1a2332)'; e.currentTarget.style.color = 'var(--color-button-text, #ffffff)'; }} data-testid="login-btn"><LogIn className="w-3.5 h-3.5" /> Login</button>
            )}
            <LanguageSwitcher dark={!showSolid} />
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2" style={{ color: textColor }}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="md:hidden px-6 py-4 space-y-3 bg-white shadow-lg">
            {headerPages.map(page => {
              const href = page.url || `/page/${page.id}`;
              return <Link key={page.id} to={href} onClick={() => setMobileOpen(false)} className="block text-sm font-medium" style={{ color: 'var(--color-heading-color, #1a2332)' }}>{page.title}</Link>;
            })}
            {isPB && miniSiteLinks.length > 0 && (
              <div className="pt-3 mt-2 border-t border-slate-100 space-y-3">
                {miniSiteLinks.map(link => (
                  <Link key={link.key} to={link.url} onClick={() => setMobileOpen(false)} className="block text-sm font-semibold uppercase tracking-wide" style={{ color: activePersonality === link.key ? 'var(--color-accent, #0D9488)' : 'var(--color-heading-color, #1a2332)' }} data-testid={`minisite-link-mobile-${link.key}`}>{link.title}</Link>
                ))}
              </div>
            )}
            {hasMyAccount && <Link to="/my-account/membership-profile" onClick={() => setMobileOpen(false)} className="block text-sm font-medium" style={{ color: 'var(--color-accent, #0D9488)' }}>My Account</Link>}
          </div>
        )}
      </header>
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}

function ClassicNavbar() {
  const tt = useT();
  const { user, logout, settings, socialLinks, socialByKey, headerPages, handlePageClick, isExternal, isAdmin, location, loginOpen, setLoginOpen, hasCmsAccess, hasMyAccount } = useNavData();
  const [mobileOpen, setMobileOpen] = useState(false);
  const API = process.env.REACT_APP_BACKEND_URL;
  const resolveSrc = (v) => v ? (v.startsWith('/api') ? `${API}${v}` : v) : null;
  const logoSrc = resolveSrc(settings.logo_on_2 || settings.logo_on_1 || settings.logo_on);
  const brandName = tt(settings.brand_name) || 'Legacy';
  const tagline = tt(settings.tagline) || 'Consulting';
  const settingsLoaded = !!settings.brand_name || !!settings.id;

  if (isAdmin) return null;

  return (
    <>
      {/* Accent top line */}
      <div className="h-1" style={{ backgroundColor: 'var(--color-accent, #0D9488)' }} />
      {/* Top info bar */}
      <div className="py-2 text-xs" style={{ backgroundColor: '#faf9f6', borderBottom: '1px solid #e8e4de' }}>
        <div className="max-w-6xl mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            {socialLinks.map(link => {
              const entry = socialByKey[link.key || resolveKey(socialByKey, link) || ''];
              return <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="hover:opacity-70 transition-colors" style={{ color: 'var(--color-primary, #1a2332)' }} title={link.platform || (entry && entry.label) || ''} aria-label={link.platform || (entry && entry.label) || 'Social link'}><SocialIcon svg={entry && entry.svg} size={14} /></a>;
            })}
          </div>
          <div>
            {user ? (
              <div className="flex items-center gap-3">
                {hasMyAccount && <Link to="/my-account/membership-profile" className="font-medium hover:opacity-70" style={{ color: 'var(--color-primary, #1a2332)' }} data-testid="nav-my-account">My Account</Link>}
                {hasCmsAccess && <Link to="/admin" className="font-medium" style={{ color: 'var(--color-accent, #0D9488)' }} data-testid="nav-admin-btn">Admin Panel</Link>}
                <button onClick={logout} className="flex items-center gap-1 hover:opacity-70" style={{ color: 'var(--color-primary, #1a2332)' }}><LogOut className="w-3 h-3" /> Logout</button>
              </div>
            ) : (
              <button onClick={() => setLoginOpen(true)} className="font-medium flex items-center gap-1" style={{ color: 'var(--color-primary, #1a2332)' }} data-testid="login-btn"><LogIn className="w-3 h-3" /> Login</button>
            )}
          </div>
        </div>
      </div>
      {/* Main header */}
      <header className="sticky top-0 z-50 shadow-sm" style={{ backgroundColor: '#faf9f6', borderBottom: '2px solid var(--color-primary, #1a2332)' }} data-testid="main-navbar">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3" data-testid="brand-logo">
            {logoSrc ? (
              <img src={logoSrc} alt={brandName} className="h-9 w-auto object-contain" data-testid="navbar-logo-img" />
            ) : settingsLoaded ? (
              <>
                <div className="w-9 h-9 rounded-none flex items-center justify-center border-2" style={{ borderColor: 'var(--color-primary, #1a2332)', backgroundColor: 'var(--color-primary, #1a2332)' }}>
                  <span className="text-white font-bold text-sm" style={{ fontFamily: "'Playfair Display', serif" }}>{brandName[0]}</span>
                </div>
                <div>
                  <span className="text-lg font-bold block leading-tight" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--color-heading-color, #1a2332)' }}>{brandName}</span>
                  <span className="text-[9px] uppercase tracking-[0.2em]" style={{ color: 'var(--color-accent, #0D9488)' }}>{tagline}</span>
                </div>
              </>
            ) : <div className="h-9 w-28" />}
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {headerPages.map(page => {
              const href = isExternal(page.url) ? page.url : (page.url || `/page/${page.id}`);
              const isExt = isExternal(page.url);
              const Comp = isExt ? 'a' : Link;
              const props = isExt ? { href, target: page.open_in_new_tab ? '_blank' : '_self', rel: 'noreferrer' } : { to: href, onClick: e => handlePageClick(page, e) };
              const isActivePage = location.pathname === href;
              return (
                <Comp
                  key={page.id}
                  {...props}
                  className="text-sm font-medium px-4 py-2 transition-colors"
                  style={{
                    color: isActivePage ? 'var(--color-accent, #0D9488)' : 'var(--color-heading-color, #1a2332)',
                    borderBottom: isActivePage ? '2px solid var(--color-accent, #0D9488)' : '2px solid transparent',
                    fontFamily: "'Playfair Display', serif",
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                  }}
                  data-testid={`nav-${page.title.toLowerCase().replace(/\s/g, '-')}`}
                >
                  {isActivePage && (
                    <span aria-hidden="true" style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--color-accent, #0D9488)', display: 'inline-block', flexShrink: 0 }} />
                  )}
                  {page.title}
                </Comp>
              );
            })}
          </nav>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2" style={{ color: 'var(--color-heading-color, #1a2332)' }}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {mobileOpen && (
          <div className="md:hidden px-6 py-4 space-y-3" style={{ backgroundColor: '#faf9f6', borderTop: '1px solid #e8e4de' }}>
            {headerPages.map(page => {
              const href = page.url || `/page/${page.id}`;
              return <Link key={page.id} to={href} onClick={() => setMobileOpen(false)} className="block text-sm font-medium py-1" style={{ color: 'var(--color-heading-color, #1a2332)', fontFamily: "'Playfair Display', serif" }}>{page.title}</Link>;
            })}
            {hasMyAccount && <Link to="/my-account/membership-profile" onClick={() => setMobileOpen(false)} className="block text-sm font-medium py-1" style={{ color: 'var(--color-accent, #0D9488)', fontFamily: "'Playfair Display', serif" }}>My Account</Link>}
          </div>
        )}
      </header>
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}
