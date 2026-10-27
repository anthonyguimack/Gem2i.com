import React, { useRef, useEffect, useState, createContext, useContext, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { slideForAudience, isLoggedInUser } from './lib/heroAudience';
import { getMa2Mode, onMa2ModeChange } from './pages/myaccount/ma2Theme';
import { isGem2iTheme } from './lib/themeColors';
import { micrositeHost } from './lib/microsite';
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
const EnrollmentFieldsManager = lazy(() => import('./pages/admin/EnrollmentFieldsManager'));
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
const GemCatalogManager = lazy(() => import('./pages/admin/GemCatalogManager'));
const GemTransactionsManager = lazy(() => import('./pages/admin/GemTransactionsManager'));
const GemCouponsManager = lazy(() => import('./pages/admin/GemCouponsManager'));
const GemContentManager = lazy(() => import('./pages/admin/GemContentManager'));
const AurexSectionsManager = lazy(() => import('./pages/admin/AurexSectionsManager'));
const GemMembershipManager = lazy(() => import('./pages/admin/GemMembershipManager'));
const MembershipPage = lazy(() => import('./pages/myaccount/Membership'));
// Membership / My Account (core only)
const MemberLogin = lazy(() => import('./pages/myaccount/MemberLogin'));
const MemberRegister = lazy(() => import('./pages/myaccount/MemberRegister'));
const MemberForgotPassword = lazy(() => import('./pages/myaccount/MemberForgotPassword'));
const MemberResetPassword = lazy(() => import('./pages/myaccount/MemberResetPassword'));
const MyAccountLayout = lazy(() => import('./pages/myaccount/MyAccountLayout'));
const MembershipProfile = lazy(() => import('./pages/myaccount/MembershipProfile'));
const MySponsor = lazy(() => import('./pages/myaccount/MySponsor'));
const InviteCode = lazy(() => import('./pages/myaccount/InviteCode'));
const MyCommunity = lazy(() => import('./pages/myaccount/MyCommunity'));
const GlobalCalendar = lazy(() => import('./pages/myaccount/GlobalCalendar'));
const CalendarSync = lazy(() => import('./pages/myaccount/CalendarSync'));
// gem2i Phase-2 catalogs — theme-gated routes; lazy so other themes never load them.
const Gem2iArtists = lazy(() => import('./pages/gem2i/Gem2iArtists'));
const Gem2iArtistDetail = lazy(() => import('./pages/gem2i/Gem2iArtistDetail'));
const Gem2iVenues = lazy(() => import('./pages/gem2i/Gem2iVenues'));
const Gem2iVenueDetail = lazy(() => import('./pages/gem2i/Gem2iVenueDetail'));
const Gem2iFestivals = lazy(() => import('./pages/gem2i/Gem2iFestivals'));
const Gem2iFestivalDetail = lazy(() => import('./pages/gem2i/Gem2iFestivalDetail'));
const Gem2iEvents = lazy(() => import('./pages/gem2i/Gem2iEvents'));
const Gem2iEventDetail = lazy(() => import('./pages/gem2i/Gem2iEventDetail'));
const Gem2iTicketSuccess = lazy(() => import('./pages/gem2i/Gem2iTicketSuccess'));
const Gem2iAbout = lazy(() => import('./pages/gem2i/Gem2iAbout'));
const Gem2iTravels = lazy(() => import('./pages/gem2i/Gem2iInnerPages').then(m => ({ default: m.Gem2iTravels })));
const Gem2iServices = lazy(() => import('./pages/gem2i/Gem2iInnerPages').then(m => ({ default: m.Gem2iServices })));
const Gem2iPartners = lazy(() => import('./pages/gem2i/Gem2iInnerPages').then(m => ({ default: m.Gem2iPartners })));
// Each template owns its inner pages (D-GEM-2026-15): Norules and Gem2i - 03 copies; Gem2i keeps the originals.
const NorulesArtists = lazy(() => import('./pages/gem2i/norules/NorulesArtists'));
const NorulesArtistDetail = lazy(() => import('./pages/gem2i/norules/NorulesArtistDetail'));
const NorulesVenues = lazy(() => import('./pages/gem2i/norules/NorulesVenues'));
const NorulesVenueDetail = lazy(() => import('./pages/gem2i/norules/NorulesVenueDetail'));
const NorulesFestivals = lazy(() => import('./pages/gem2i/norules/NorulesFestivals'));
const NorulesFestivalDetail = lazy(() => import('./pages/gem2i/norules/NorulesFestivalDetail'));
const NorulesEvents = lazy(() => import('./pages/gem2i/norules/NorulesEvents'));
const NorulesEventDetail = lazy(() => import('./pages/gem2i/norules/NorulesEventDetail'));
const NorulesTicketSuccess = lazy(() => import('./pages/gem2i/norules/NorulesTicketSuccess'));
const NorulesTravels = lazy(() => import('./pages/gem2i/norules/NorulesInnerPages').then(m => ({ default: m.NorulesTravels })));
const NorulesServices = lazy(() => import('./pages/gem2i/norules/NorulesInnerPages').then(m => ({ default: m.NorulesServices })));
const NorulesPartners = lazy(() => import('./pages/gem2i/norules/NorulesInnerPages').then(m => ({ default: m.NorulesPartners })));
const NorulesAbout = lazy(() => import('./pages/gem2i/norules/NorulesAbout'));
const norulesExtra = (name) => lazy(() => import('./pages/gem2i/norules/NorulesExtraPages').then(m => ({ default: m[name] })));
const NorulesConferences = norulesExtra('NorulesConferences');
const NorulesTravelDetail = norulesExtra('NorulesTravelDetail');
const NorulesWorks = norulesExtra('NorulesWorks');
const NorulesGallery = norulesExtra('NorulesGallery');
const NorulesMedia = norulesExtra('NorulesMedia');
const NorulesOffice = norulesExtra('NorulesOffice');
const NorulesLegal = norulesExtra('NorulesLegal');
const gem2iCms = (name) => lazy(() => import('./pages/gem2i/g02/Gem2iCmsPages').then(m => ({ default: m[name] })));
const Gem2iCmsPage = gem2iCms('Gem2iCmsPage');
const Gem2iPaymentSuccess = gem2iCms('Gem2iPaymentSuccess');
const gem2iFork = (name) => lazy(() => import('./pages/gem2i/g02/Gem2iForkPages').then(m => ({ default: m[name] })));
const Gem2iReadingList = gem2iFork('Gem2iReadingList');
const Gem2iServiceDetail = gem2iFork('Gem2iServiceDetail');
const Gem2iAlbum = gem2iFork('Gem2iAlbum');
const gem2iExtra = (name) => lazy(() => import('./pages/gem2i/g02/Gem2iExtraPages').then(m => ({ default: m[name] })));
const Gem2iConferences = gem2iExtra('Gem2iConferences');
const Gem2iTravelDetail = gem2iExtra('Gem2iTravelDetail');
const Gem2iWorks = gem2iExtra('Gem2iWorks');
const Gem2iGallery = gem2iExtra('Gem2iGallery');
const Gem2iMedia = gem2iExtra('Gem2iMedia');
const Gem2iOffice = gem2iExtra('Gem2iOffice');
const Gem2iLegal = gem2iExtra('Gem2iLegal');
const Gem03Artists = lazy(() => import('./pages/gem2i/t03/Gem03Artists'));
const Gem03ArtistDetail = lazy(() => import('./pages/gem2i/t03/Gem03ArtistDetail'));
const Gem03Venues = lazy(() => import('./pages/gem2i/t03/Gem03Venues'));
const Gem03VenueDetail = lazy(() => import('./pages/gem2i/t03/Gem03VenueDetail'));
const Gem03Festivals = lazy(() => import('./pages/gem2i/t03/Gem03Festivals'));
const Gem03FestivalDetail = lazy(() => import('./pages/gem2i/t03/Gem03FestivalDetail'));
const Gem03Events = lazy(() => import('./pages/gem2i/t03/Gem03Events'));
const Gem03EventDetail = lazy(() => import('./pages/gem2i/t03/Gem03EventDetail'));
const Gem03TicketSuccess = lazy(() => import('./pages/gem2i/t03/Gem03TicketSuccess'));
const Gem03Travels = lazy(() => import('./pages/gem2i/t03/Gem03InnerPages').then(m => ({ default: m.Gem03Travels })));
const Gem03Services = lazy(() => import('./pages/gem2i/t03/Gem03InnerPages').then(m => ({ default: m.Gem03Services })));
const Gem03Partners = lazy(() => import('./pages/gem2i/t03/Gem03InnerPages').then(m => ({ default: m.Gem03Partners })));
const Gem03About = lazy(() => import('./pages/gem2i/t03/Gem03About'));

import { injectThemeColors } from './lib/themeColors';
import { LanguageProvider } from './lib/i18n';
import { t as i18nT } from './lib/i18n';
import BackToTop from './components/BackToTop';
import { isAdmin as isFullAdmin } from './lib/isAdmin';

// Global settings context for colors and theme
/**
 * gem2i template preview: `?template=01|02|03` shows the site with that gem2i
 * template WITHOUT changing the live one (CMS → Settings → Themes). Only while
 * the parameter is in the address: a plain reload shows the live template, so
 * switching templates in the CMS is always visible after a refresh (Anthony,
 * 2026-10-21). Only switches between gem2i templates — never to another brand.
 */
const TEMPLATE_KEY = 'gem2i:template-preview'; // legacy session key, cleared on load
function withTemplatePreview(s) {
  try { sessionStorage.removeItem(TEMPLATE_KEY); } catch { /* storage blocked */ }
  if (!isGem2iTheme(s.active_theme)) return s;
  let pick = null;
  try {
    const q = new URLSearchParams(window.location.search).get('template');
    pick = { '01': 'gem2i', '1': 'gem2i', '02': 'gem2i_02', '2': 'gem2i_02', '03': 'gem2i_03', '3': 'gem2i_03' }[q] || null;
  } catch { /* no preview */ }
  if (!pick || pick === s.active_theme) return s;
  return { ...s, active_theme: pick, _live_theme: s.active_theme, _template_preview: pick };
}

export const SettingsContext = createContext({});
export const useSettings = () => useContext(SettingsContext);

export const ThemeContext = createContext('default');
export const useTheme = () => useContext(ThemeContext);

function SettingsProvider({ children }) {
  const [settings, setSettings] = useState({ _loaded: false });
  useEffect(() => {
    publicAPI.getSettings()
      .then(r => setSettings(withTemplatePreview({ ...(r.data || {}), _loaded: true })))
      .catch(() => setSettings({ _loaded: true }));
  }, []);

  // My Account 2.0 light/dark (gem2i: dark by default). Kept in state so the
  // injection effect below re-runs when the member flips the switch.
  const [ma2Mode, setMa2ModeState] = useState(getMa2Mode);
  useEffect(() => onMa2ModeChange(setMa2ModeState), []);

  useEffect(() => {
    const themeColors = settings.theme_colors || {};
    if (!themeColors.website && settings.colors) {
      themeColors.website = settings.colors;
    }
    injectThemeColors(themeColors, {
      my_account_color_scheme: settings.my_account_color_scheme,
      active_theme: settings.active_theme,
      ma2_mode: ma2Mode,
    });
  }, [settings.theme_colors, settings.colors, settings.my_account_color_scheme, settings.active_theme, ma2Mode]);

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
  const hasAnyCmsAccess = isFullAdmin(user) || ((user.effective_permissions || []).length > 0);
  if (!hasAnyCmsAccess) return <Navigate to="/admin/login" replace />;
  return children;
}

function AdminIndexRouter() {
  const { user } = useAuth();
  const isAdmin = isFullAdmin(user);
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
  { path: 'gem-events',                      section: 'gem_events',                       el: <GemCatalogManager catalog="events" /> },
  { path: 'gem-artists',                     section: 'gem_artists',                      el: <GemCatalogManager catalog="artists" /> },
  { path: 'gem-venues',                      section: 'gem_venues',                       el: <GemCatalogManager catalog="venues" /> },
  { path: 'gem-festivals',                   section: 'gem_festivals',                    el: <GemCatalogManager catalog="festivals" /> },
  { path: 'gem-conferences',                 section: 'gem_conferences',                  el: <GemCatalogManager catalog="conferences" /> },
  { path: 'gem-clients',                     section: 'gem_clients',                      el: <GemCatalogManager catalog="clients" /> },
  { path: 'gem-promoters',                   section: 'gem_promoters',                    el: <GemCatalogManager catalog="promoters" /> },
  { path: 'gem-transactions',                section: 'gem_transactions',                 el: <GemTransactionsManager /> },
  { path: 'aurex-sections',                  section: 'aurex_sections',                   el: <AurexSectionsManager /> },
  { path: 'gem-content',                     section: 'gem_content',                      el: <GemContentManager /> },
  { path: 'gem-coupons',                     section: 'gem_coupons',                      el: <GemCouponsManager /> },
  { path: 'gem-membership',                  section: 'gem_membership',                   el: <GemMembershipManager /> },
  { path: 'users',                           adminOnly: true,                             el: <UsersManager /> },
  { path: 'members',                         section: 'members',                          el: <MembersManager /> },
  { path: 'members/:memberId/signatures',    section: 'members',                          el: <MemberSignatures /> },
  { path: 'members/:memberId/logins',        section: 'members',                          el: <MemberLogins /> },
  { path: 'member-levels',                   section: 'member_levels',                    el: <MemberLevelsManager /> },
  { path: 'member-types',                    section: 'member_types',                     el: <MemberTypesManager /> },
  { path: 'enrollment-fields',               section: 'enrollment_fields',                el: <EnrollmentFieldsManager /> },
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
  if (!isFullAdmin(user)) return <CmsSectionGuard section="__admin_only__">{children}</CmsSectionGuard>;
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
    if (isFullAdmin(user)) return children;
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
  const allowedAccess = isFullAdmin(user) || (user.cms_roles || []).includes('role_member');
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
  const [allHeroSlides, setHeroSlides] = useState([]);
  const { user, loading: authLoading } = useAuth();
  const pageId = SYSTEM_PAGE_MAP[location.pathname];

  useEffect(() => {
    if (!pageId) { setHeroSlides([]); return; }
    publicAPI.getHeroSlides(pageId).then(r => setHeroSlides(r.data || [])).catch(() => setHeroSlides([]));
  }, [pageId]);

  // Audience filter; hold until the session check resolves (no wrong-hero flash).
  const heroSlides = allHeroSlides.filter(s => slideForAudience(s, isLoggedInUser(user)));
  if (authLoading || heroSlides.length === 0) return null;
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
  // Inner pages per template: Norules (`gem2i`), Gem2i - 03 (`gem2i_03`), Gem2i (`gem2i_02`) keeps the originals.
  const tplPage = (N, T, G, props = {}) => { const C = settings.active_theme === 'gem2i' ? N : settings.active_theme === 'gem2i_03' ? T : G; return <C {...props} />; };
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
          <Route path="invite-code" element={<InviteCode />} />
          <Route path="my-community" element={<MyCommunity />} />
          <Route path="global-calendar" element={<GlobalCalendar />} />
          <Route path="calendar-sync" element={<CalendarSync />} />
          <Route path="membership" element={<MembershipPage />} />
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
              {/* gem2i: every "Contact us" lands on the homepage Contact section */}
              <Route path="/contact" element={<Navigate to="/#contact" replace />} />
              {/* gem2i catalogs take over these URLs when the theme is active;
                  other themes fall through to the CMS placeholder pages. */}
              {isGem2iTheme(settings.active_theme) && <>
                {/* Each template is a package: its own home AND inner pages (Norules = `gem2i`, 03 = `gem2i_03`). */}
                <Route path="/about" element={tplPage(NorulesAbout, Gem03About, Gem2iAbout)} />
                <Route path="/travels" element={tplPage(NorulesTravels, Gem03Travels, Gem2iTravels)} />
                <Route path="/services" element={tplPage(NorulesServices, Gem03Services, Gem2iServices)} />
                <Route path="/partners" element={tplPage(NorulesPartners, Gem03Partners, Gem2iPartners)} />
                <Route path="/artists" element={tplPage(NorulesArtists, Gem03Artists, Gem2iArtists)} />
                <Route path="/artists/:slug" element={tplPage(NorulesArtistDetail, Gem03ArtistDetail, Gem2iArtistDetail)} />
                <Route path="/venues" element={tplPage(NorulesVenues, Gem03Venues, Gem2iVenues)} />
                <Route path="/venues/:slug" element={tplPage(NorulesVenueDetail, Gem03VenueDetail, Gem2iVenueDetail)} />
                <Route path="/festivals" element={tplPage(NorulesFestivals, Gem03Festivals, Gem2iFestivals)} />
                <Route path="/festivals/:slug" element={tplPage(NorulesFestivalDetail, Gem03FestivalDetail, Gem2iFestivalDetail, { kind: 'festival' })} />
                <Route path="/conferences/:slug" element={tplPage(NorulesFestivalDetail, Gem03FestivalDetail, Gem2iFestivalDetail, { kind: 'conference' })} />
                <Route path="/events" element={tplPage(NorulesEvents, Gem03Events, Gem2iEvents)} />
                <Route path="/events/:slug" element={tplPage(NorulesEventDetail, Gem03EventDetail, Gem2iEventDetail)} />
                <Route path="/tickets/success" element={tplPage(NorulesTicketSuccess, Gem03TicketSuccess, Gem2iTicketSuccess)} />
              </>}
              {/* Norules-only pages (2026-10-23, boceto norules-missing-pages.html); the other templates keep
                  the generic pages below (same path, defined later → Norules wins only when active). */}
              {settings.active_theme === 'gem2i' && <>
                <Route path="/conferences" element={<NorulesConferences />} />
                <Route path="/travels/:slug" element={<NorulesTravelDetail />} />
                <Route path="/works" element={<NorulesWorks />} />
                <Route path="/gallery" element={<NorulesGallery />} />
                <Route path="/media" element={<NorulesMedia />} />
                <Route path="/map/:slug" element={<NorulesOffice />} />
                <Route path="/terms" element={<PageProtectedRoute><NorulesLegal type="terms" /></PageProtectedRoute>} />
                <Route path="/privacy" element={<PageProtectedRoute><NorulesLegal type="privacy" /></PageProtectedRoute>} />
              </>}
              {/* Gem2i (gem2i_02): the same pages, own copies (pages/gem2i/g02/Gem2iExtraPages.js, 2026-10-26). */}
              {settings.active_theme === 'gem2i_02' && <>
                <Route path="/conferences" element={<Gem2iConferences />} />
                <Route path="/travels/:slug" element={<Gem2iTravelDetail />} />
                <Route path="/works" element={<Gem2iWorks />} />
                <Route path="/gallery" element={<Gem2iGallery />} />
                <Route path="/media" element={<Gem2iMedia />} />
                <Route path="/map/:slug" element={<Gem2iOffice />} />
                <Route path="/terms" element={<PageProtectedRoute><Gem2iLegal type="terms" /></PageProtectedRoute>} />
                <Route path="/privacy" element={<PageProtectedRoute><Gem2iLegal type="privacy" /></PageProtectedRoute>} />
                <Route path="/reading-list" element={<Gem2iReadingList />} />
                <Route path="/service/:serviceId" element={<Gem2iServiceDetail />} />
                <Route path="/album/:albumId" element={<Gem2iAlbum />} />
                <Route path="/checkout/success" element={<Gem2iPaymentSuccess />} />
                <Route path="/page/:pageId" element={<PageProtectedRoute><Gem2iCmsPage /></PageProtectedRoute>} />
                <Route path="*" element={<PageProtectedRoute><Gem2iCmsPage /></PageProtectedRoute>} />
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

// Event microsites: a non-portal host (or ?microsite=<host> preview) renders its own site.
const MicrositeApp = lazy(() => import('./pages/microsite/MicrositeApp'));

function App() {
  const msHost = micrositeHost();
  if (msHost) {
    return (
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={null}><MicrositeApp host={msHost} /></Suspense>
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </BrowserRouter>
    );
  }
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
