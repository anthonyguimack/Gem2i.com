import React, { useRef, useEffect, useState, createContext, useContext, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { MemberProvider, useMember } from './lib/memberAuth';
import { authAPI, publicAPI } from './lib/api';
import { Toaster } from 'sonner';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import LoginModal from './components/LoginModal';
import HomePage from './pages/HomePage';
import ReadingListPage from './pages/ReadingListPage';
import GalleryPage from './pages/GalleryPage';
import MapDetailPage from './pages/MapDetailPage';
import CheckoutSuccess from './pages/CheckoutSuccess';
import DynamicPage from './pages/DynamicPage';
import ServiceDetailPage from './pages/ServiceDetailPage';
import LayoutSubGallery from './components/layouts/LayoutSubGallery';
// Eager (public-facing) pages — kept in the main bundle.
import LandingPage from './pages/LandingPage';
import MembershipEnrollment from './pages/MembershipEnrollment';
import { CmsSectionGuard } from './pages/admin/Forbidden';

// Admin + Member portal pages are lazy-loaded so the PUBLIC bundle no longer
// ships the entire CMS. Each becomes its own async chunk.
// (gem2i keeps ONLY the brand-neutral CMS-core managers — all brand/product
//  managers from the AUX-1.0 fork were stripped at Phase 0.)
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const HeroManager = lazy(() => import('./pages/admin/HeroManager'));
const HeroSlideForm = lazy(() => import('./pages/admin/HeroSlideForm'));
const HeroAbAnalytics = lazy(() => import('./pages/admin/HeroAbAnalytics'));
const AboutManager = lazy(() => import('./pages/admin/AboutManager'));
const ServicesManager = lazy(() => import('./pages/admin/ServicesManager'));
const BlogManager = lazy(() => import('./pages/admin/BlogManager'));
const BooksManager = lazy(() => import('./pages/admin/BooksManager'));
const MapsManager = lazy(() => import('./pages/admin/MapsManager'));
const GalleryManager = lazy(() => import('./pages/admin/GalleryManager'));
const GalleryAlbumsManager = lazy(() => import('./pages/admin/GalleryAlbumsManager'));
const PortfolioManager = lazy(() => import('./pages/admin/PortfolioManager'));
const TestimonialsManager = lazy(() => import('./pages/admin/TestimonialsManager'));
const ContactsManager = lazy(() => import('./pages/admin/ContactsManager'));
const PurchasesManager = lazy(() => import('./pages/admin/PurchasesManager'));
const SettingsManager = lazy(() => import('./pages/admin/SettingsManager'));
const EmailManagement = lazy(() => import('./pages/admin/EmailManagement'));
const PagesManager = lazy(() => import('./pages/admin/PagesManager'));
const UsersManager = lazy(() => import('./pages/admin/UsersManager'));
const AnalyticsDashboard = lazy(() => import('./pages/admin/AnalyticsDashboard'));
const SeoManager = lazy(() => import('./pages/admin/SeoManager'));
const SectionOrderManager = lazy(() => import('./pages/admin/SectionOrderManager'));
const MembersManager = lazy(() => import('./pages/admin/MembersManager'));
const MemberSignatures = lazy(() => import('./pages/admin/MemberSignatures'));
const MemberLogins = lazy(() => import('./pages/admin/MemberLogins'));
const MemberLevelsManager = lazy(() => import('./pages/admin/MemberLevelsManager'));
const MemberTypesManager = lazy(() => import('./pages/admin/MemberTypesManager'));
const MembershipSettingsManager = lazy(() => import('./pages/admin/MembershipSettingsManager'));
const BackupManager = lazy(() => import('./pages/admin/BackupManager'));
const ContactSettingsManager = lazy(() => import('./pages/admin/ContactSettingsManager'));
const LandingContentManager = lazy(() => import('./pages/admin/LandingContentManager'));
const LandingSubscribersManager = lazy(() => import('./pages/admin/LandingSubscribersManager'));
const LandingContactsManager = lazy(() => import('./pages/admin/LandingContactsManager'));
const LandingHeroManager = lazy(() => import('./pages/admin/LandingHeroManager'));
const LandingHeroSlideForm = lazy(() => import('./pages/admin/LandingHeroSlideForm'));
const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage'));
const GeoManager = lazy(() => import('./pages/admin/GeoManager'));
const QuickLinksManager = lazy(() => import('./pages/admin/QuickLinksManager'));
const MyAccountNavManager = lazy(() => import('./pages/admin/MyAccountNavManager'));
const RolesManager = lazy(() => import('./pages/admin/RolesManager'));
const CmsWelcome = lazy(() => import('./pages/admin/CmsWelcome'));
// Membership / My Account (core only)
const MemberLogin = lazy(() => import('./pages/myaccount/MemberLogin'));
const MemberRegister = lazy(() => import('./pages/myaccount/MemberRegister'));
const MemberForgotPassword = lazy(() => import('./pages/myaccount/MemberForgotPassword'));
const MemberResetPassword = lazy(() => import('./pages/myaccount/MemberResetPassword'));
const MyAccountLayout = lazy(() => import('./pages/myaccount/MyAccountLayout'));
const MembershipProfile = lazy(() => import('./pages/myaccount/MembershipProfile'));
const MySponsor = lazy(() => import('./pages/myaccount/MySponsor'));
// gem2i Phase-2 catalogs — theme-gated routes; lazy so other themes never load them.
const Gem2iArtists = lazy(() => import('./pages/gem2i/Gem2iArtists'));
const Gem2iArtistDetail = lazy(() => import('./pages/gem2i/Gem2iArtistDetail'));
const Gem2iVenues = lazy(() => import('./pages/gem2i/Gem2iVenues'));
const Gem2iVenueDetail = lazy(() => import('./pages/gem2i/Gem2iVenueDetail'));
const Gem2iFestivals = lazy(() => import('./pages/gem2i/Gem2iFestivals'));
const Gem2iFestivalDetail = lazy(() => import('./pages/gem2i/Gem2iFestivalDetail'));
const Gem2iEvents = lazy(() => import('./pages/gem2i/Gem2iEvents'));
const Gem2iEventDetail = lazy(() => import('./pages/gem2i/Gem2iEventDetail'));

import { injectThemeColors } from './lib/themeColors';
import { LanguageProvider } from './lib/i18n';
import { t as i18nT } from './lib/i18n';
import BackToTop from './components/BackToTop';

// Global settings context for colors and theme
export const SettingsContext = createContext({});
export const useSettings = () => useContext(SettingsContext);

export const ThemeContext = createContext('default');
export const useTheme = () => useContext(ThemeContext);

function SettingsProvider({ children }) {
  const [settings, setSettings] = useState({ _loaded: false });
  useEffect(() => {
    publicAPI.getSettings()
      .then(r => setSettings({ ...(r.data || {}), _loaded: true }))
      .catch(() => setSettings({ _loaded: true }));
  }, []);

  useEffect(() => {
    const themeColors = settings.theme_colors || {};
    if (!themeColors.website && settings.colors) {
      themeColors.website = settings.colors;
    }
    injectThemeColors(themeColors, {
      my_account_color_scheme: settings.my_account_color_scheme,
      active_theme: settings.active_theme,
    });
  }, [settings.theme_colors, settings.colors, settings.my_account_color_scheme, settings.active_theme]);

  // Dynamic favicon
  useEffect(() => {
    const faviconUrl = settings.favicon;
    if (!faviconUrl) return;
    const src = faviconUrl.startsWith('/api') ? `${process.env.REACT_APP_BACKEND_URL}${faviconUrl}` : faviconUrl;
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = src;
  }, [settings.favicon]);

  // Dynamic page title from tagline
  useEffect(() => {
    const lang = localStorage.getItem('aurex_locale') || settings.default_language || 'en';
    const tagline = i18nT(settings.tagline, lang);
    const brand = i18nT(settings.brand_name, lang);
    if (tagline) { document.title = tagline; }
    else if (brand) { document.title = brand; }
  }, [settings.tagline, settings.brand_name, settings.default_language]);

  const activeTheme = settings.active_theme || 'default';

  return (
    <SettingsContext.Provider value={settings}>
      <ThemeContext.Provider value={activeTheme}>
        <LanguageProvider settings={settings}>
          {children}
        </LanguageProvider>
      </ThemeContext.Provider>
    </SettingsContext.Provider>
  );
}

function AuthCallback() {
  const hasProcessed = useRef(false);
  const navigate = useNavigate();
  const { setUserData } = useAuth();
  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;
    const hash = window.location.hash;
    const sessionId = new URLSearchParams(hash.substring(1)).get('session_id');
    if (!sessionId) { navigate('/'); return; }
    (async () => {
      try {
        const res = await authAPI.exchangeSession(sessionId);
        setUserData(res.data);
        navigate('/', { replace: true });
      } catch { navigate('/', { replace: true }); }
    })();
  }, [navigate, setUserData]);
  return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-[var(--color-accent,#0D9488)] border-t-transparent rounded-full"></div></div>;
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-[var(--color-accent,#0D9488)] border-t-transparent rounded-full"></div></div>;
  if (!user) return <Navigate to="/admin/login" replace />;
  const hasAnyCmsAccess = user.role === 'admin' || ((user.effective_permissions || []).length > 0);
  if (!hasAnyCmsAccess) return <Navigate to="/admin/login" replace />;
  return children;
}

function AdminIndexRouter() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const perms = user?.effective_permissions || [];
  const canSeeDashboard = isAdmin || perms.includes('dashboard');
  return canSeeDashboard ? <AdminDashboard /> : <CmsWelcome />;
}

const ADMIN_ROUTES = [
  { index: true, el: <AdminIndexRouter /> },
  { path: 'hero',                            section: 'hero',                             el: <HeroManager /> },
  { path: 'hero/add',                        section: 'hero',                             el: <HeroSlideForm /> },
  { path: 'hero/edit/:id',                   section: 'hero',                             el: <HeroSlideForm /> },
  { path: 'hero-ab',                         section: 'hero_ab',                          el: <HeroAbAnalytics /> },
  { path: 'about',                           section: 'about',                            el: <AboutManager /> },
  { path: 'services',                        section: 'services',                         el: <ServicesManager /> },
  { path: 'blog',                            section: 'blog',                             el: <BlogManager /> },
  { path: 'books',                           section: 'books',                            el: <BooksManager /> },
  { path: 'maps',                            section: 'maps',                             el: <MapsManager /> },
  { path: 'gallery',                         section: 'gallery',                          el: <GalleryManager /> },
  { path: 'gallery-albums',                  section: 'gallery_albums',                   el: <GalleryAlbumsManager /> },
  { path: 'portfolio',                       section: 'portfolio',                        el: <PortfolioManager /> },
  { path: 'testimonials',                    section: 'testimonials',                     el: <TestimonialsManager /> },
  { path: 'contacts',                        section: 'contacts',                         el: <ContactsManager /> },
  { path: 'contact-settings',                section: 'contact_settings',                 el: <ContactSettingsManager /> },
  { path: 'purchases',                       section: 'purchases',                        el: <PurchasesManager /> },
  { path: 'settings',                        section: 'settings',                         el: <SettingsManager /> },
  { path: 'email-management',                section: 'email_management',                 el: <EmailManagement /> },
  { path: 'pages',                           section: 'pages',                            el: <PagesManager /> },
  { path: 'users',                           adminOnly: true,                             el: <UsersManager /> },
  { path: 'members',                         section: 'members',                          el: <MembersManager /> },
  { path: 'members/:memberId/signatures',    section: 'members',                          el: <MemberSignatures /> },
  { path: 'members/:memberId/logins',        section: 'members',                          el: <MemberLogins /> },
  { path: 'member-levels',                   section: 'member_levels',                    el: <MemberLevelsManager /> },
  { path: 'member-types',                    section: 'member_types',                     el: <MemberTypesManager /> },
  { path: 'membership-settings',             section: 'membership_settings',              el: <MembershipSettingsManager /> },
  { path: 'analytics',                       section: 'analytics',                        el: <AnalyticsDashboard /> },
  { path: 'seo',                             section: 'seo',                              el: <SeoManager /> },
  { path: 'backup',                          section: 'backup',                           el: <BackupManager /> },
  { path: 'section-order',                   section: 'section_order',                    el: <SectionOrderManager /> },
  { path: 'landing-content',                 section: 'landing_content',                  el: <LandingContentManager /> },
  { path: 'landing-hero',                    section: 'landing_hero',                     el: <LandingHeroManager /> },
  { path: 'landing-hero/add',                section: 'landing_hero',                     el: <LandingHeroSlideForm /> },
  { path: 'landing-hero/edit/:id',           section: 'landing_hero',                     el: <LandingHeroSlideForm /> },
  { path: 'landing-subscribers',             section: 'landing_subscribers',              el: <LandingSubscribersManager /> },
  { path: 'landing-contacts',                section: 'landing_contacts',                 el: <LandingContactsManager /> },
  { path: 'quick-links',                     section: 'quick_links',                      el: <QuickLinksManager /> },
  { path: 'myaccount-nav',                   section: 'myaccount_nav',                    el: <MyAccountNavManager /> },
  { path: 'geo',                             section: 'geo',                              el: <GeoManager /> },
  { path: 'roles',                           adminOnly: true,                             el: <RolesManager /> },
];

function renderAdminRoutes() {
  return ADMIN_ROUTES.map(r => {
    const el = r.adminOnly
      ? <AdminOnlyRoute>{r.el}</AdminOnlyRoute>
      : (r.section ? <CmsSectionGuard section={r.section}>{r.el}</CmsSectionGuard> : r.el);
    return r.index
      ? <Route key="index" index element={el} />
      : <Route key={r.path} path={r.path} element={el} />;
  });
}

function AdminOnlyRoute({ children }) {
  const { user } = useAuth();
  if (user?.role !== 'admin') return <CmsSectionGuard section="__admin_only__">{children}</CmsSectionGuard>;
  return children;
}

function PageProtectedRoute({ children }) {
  const { user, loading: authLoading } = useAuth();
  const { member, loading: memberLoading } = useMember();
  const location = useLocation();
  const [pageData, setPageData] = useState(null);
  const [checking, setChecking] = useState(true);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    publicAPI.getNavPages().then(r => {
      const pages = r.data || [];
      const path = location.pathname;
      const found = pages.find(p => p.url === path || `/page/${p.id}` === path);
      setPageData(found || null);
      setChecking(false);
    }).catch(() => setChecking(false));
  }, [location.pathname]);

  if (checking || authLoading || memberLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-[var(--color-accent,#0D9488)] border-t-transparent rounded-full"></div></div>;

  if (pageData?.login_required) {
    if (user?.role === 'admin') return children;
    if (member) {
      const allowedPages = member._member_type?.allowed_pages || [];
      const pageId = pageData.id;
      if (allowedPages.length > 0 && !allowedPages.includes(pageId)) {
        return (
          <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-page-bg, #f8fafc)' }}>
            <div className="text-center max-w-md mx-auto px-6">
              <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-heading, #1a2332)' }}>Access Restricted</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--color-body-text, #64748b)' }}>Your membership type does not include access to this page.</p>
            </div>
          </div>
        );
      }
      return children;
    }
    if (!user && !member) {
      return (
        <>
          <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-page-bg, #f8fafc)' }}>
            <div className="text-center max-w-md mx-auto px-6">
              <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-heading, #1a2332)' }}>Login Required</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--color-body-text, #64748b)' }}>You need to be logged in to access this page.</p>
              <button onClick={() => setShowLogin(true)} className="px-6 py-2.5 rounded-sm text-sm font-medium" style={{ backgroundColor: 'var(--color-button-bg, #1a2332)', color: 'var(--color-button-text, #fff)' }} data-testid="page-login-btn">
                Login to Continue
              </button>
            </div>
          </div>
          <LoginModal open={showLogin} onClose={() => setShowLogin(false)} />
        </>
      );
    }
  }
  return children;
}

function MemberRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#0d0f14]"><div className="animate-spin w-8 h-8 border-2 border-[#c9a84c] border-t-transparent rounded-full" /></div>;
  if (!user) return <Navigate to="/my-account/login" replace />;
  const allowedAccess = user.role === 'admin' || (user.cms_roles || []).includes('role_member');
  if (!allowedAccess) return <Navigate to="/my-account/login" replace />;
  return children;
}

// Maps system page URLs to their hero page identifiers
const SYSTEM_PAGE_MAP = {
  '/gallery': 'gallery',
  '/reading-list': 'reading-list',
};

function SystemPageHero() {
  const location = useLocation();
  const [heroSlides, setHeroSlides] = useState([]);
  const pageId = SYSTEM_PAGE_MAP[location.pathname];

  useEffect(() => {
    if (!pageId) { setHeroSlides([]); return; }
    publicAPI.getHeroSlides(pageId).then(r => setHeroSlides(r.data || [])).catch(() => setHeroSlides([]));
  }, [pageId]);

  if (heroSlides.length === 0) return null;
  const HeroSection = require('./components/HeroSection').default;
  return <HeroSection slides={heroSlides} />;
}

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const id = hash.substring(1);
      const tryScroll = (attempts) => {
        const el = document.getElementById(id);
        if (el) { el.scrollIntoView({ behavior: 'smooth' }); }
        else if (attempts > 0) { setTimeout(() => tryScroll(attempts - 1), 200); }
      };
      setTimeout(() => tryScroll(5), 100);
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);
  return null;
}

function useLandingActive(settings) {
  const [active, setActive] = useState(false);
  useEffect(() => {
    if (!settings.landing_page_enabled) { setActive(false); return; }
    const check = () => {
      if (!settings.landing_page_launch_date) { setActive(true); return; }
      const launch = new Date(settings.landing_page_launch_date).getTime();
      setActive(Date.now() < launch);
    };
    check();
    const id = setInterval(check, 1000);
    return () => clearInterval(id);
  }, [settings.landing_page_enabled, settings.landing_page_launch_date]);
  return active;
}

function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="animate-spin w-8 h-8 border-2 border-[var(--color-accent,#0D9488)] border-t-transparent rounded-full" />
    </div>
  );
}

function AppRouter() {
  const location = useLocation();
  const settings = useSettings();
  const landingActive = useLandingActive(settings);

  if (!settings._loaded) {
    return <div className="min-h-screen" style={{ backgroundColor: '#0a0a12' }} />;
  }

  if (location.hash?.includes('session_id=')) return <AuthCallback />;

  const isMemberArea = location.pathname.startsWith('/my-account');
  const isAdmin = location.pathname.startsWith('/admin');

  if (isMemberArea) {
    return (
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/my-account/login" element={<MemberLogin />} />
        <Route path="/my-account/register" element={<MemberRegister />} />
        <Route path="/my-account/forgot-password" element={<MemberForgotPassword />} />
        <Route path="/my-account/reset-password" element={<MemberResetPassword />} />
        <Route path="/my-account" element={<MemberRoute><MyAccountLayout /></MemberRoute>}>
          <Route index element={<Navigate to="/my-account/membership-profile" replace />} />
          <Route path="membership-profile" element={<MembershipProfile />} />
          <Route path="my-sponsor" element={<MySponsor />} />
        </Route>
      </Routes>
      </Suspense>
    );
  }

  if (landingActive && !isAdmin) {
    return (
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          {renderAdminRoutes()}
        </Route>
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/membership-enrollment" element={<MembershipEnrollment />} />
        <Route path="*" element={<LandingPage />} />
      </Routes>
      </Suspense>
    );
  }

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/membership-enrollment" element={<MembershipEnrollment />} />
        <Route path="*" element={
          <>
            <Navbar />
            <SystemPageHero />
            <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              {/* gem2i catalogs take over these URLs when the theme is active;
                  other themes fall through to the CMS placeholder pages. */}
              {settings.active_theme === 'gem2i' && <>
                <Route path="/artists" element={<Gem2iArtists />} />
                <Route path="/artists/:slug" element={<Gem2iArtistDetail />} />
                <Route path="/venues" element={<Gem2iVenues />} />
                <Route path="/venues/:slug" element={<Gem2iVenueDetail />} />
                <Route path="/festivals" element={<Gem2iFestivals />} />
                <Route path="/festivals/:slug" element={<Gem2iFestivalDetail kind="festival" />} />
                <Route path="/conferences/:slug" element={<Gem2iFestivalDetail kind="conference" />} />
                <Route path="/events" element={<Gem2iEvents />} />
                <Route path="/events/:slug" element={<Gem2iEventDetail />} />
              </>}
              <Route path="/reading-list" element={<ReadingListPage />} />
              <Route path="/gallery" element={<GalleryPage />} />
              <Route path="/map/:slug" element={<MapDetailPage />} />
              <Route path="/service/:serviceId" element={<ServiceDetailPage />} />
              <Route path="/album/:albumId" element={<LayoutSubGallery />} />
              <Route path="/terms" element={<PageProtectedRoute><DynamicPage /></PageProtectedRoute>} />
              <Route path="/privacy" element={<PageProtectedRoute><DynamicPage /></PageProtectedRoute>} />
              <Route path="/checkout/success" element={<CheckoutSuccess />} />
              <Route path="/page/:pageId" element={<PageProtectedRoute><DynamicPage /></PageProtectedRoute>} />
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
                {renderAdminRoutes()}
              </Route>
              <Route path="/membership-enrollment" element={<MembershipEnrollment />} />
              <Route path="*" element={<PageProtectedRoute><DynamicPage /></PageProtectedRoute>} />
            </Routes>
            </Suspense>
            <Footer />
            <BackToTop />
          </>
        } />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <MemberProvider>
            <AppRouter />
            <Toaster position="top-right" richColors />
          </MemberProvider>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
