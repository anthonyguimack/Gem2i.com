import React, { useState, useEffect, useCallback, useRef, useMemo, Suspense } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useMember } from '../../lib/memberAuth';
import { publicAPI, memberAPI, authAPI, gemAPI } from '../../lib/api';
import { BACKEND_URL } from '../../lib/config';
import { DEFAULT_AVATAR } from '../../lib/defaultImages';
import {
  User, Key, Users, LogOut, Menu, X, ChevronRight, Home, UserCheck, Loader2, ExternalLink, Bell, CalendarDays, Rss, Sun, Moon, Crown
} from 'lucide-react';
import { useT } from '../../lib/i18n';
import { isAdmin as isFullAdmin } from '../../lib/isAdmin';
import { useMyAccountBase } from '../../lib/myAccountBase';
import { getMa2Mode, toggleMa2Mode, onMa2ModeChange } from './ma2Theme';
import './velzon-theme.css';  // scoped (.ma2-scope) My Account 2.0 kit + gem2i palette

/**
 * gem2i My Account 2.0 shell (ported from AUX-1.0 pages/myaccount2/MyAccountLayout).
 * Same engine as the brands — level-gated nav, CMS order/rename/visibility,
 * quick links, notifications, light/dark — with gem2i's own sections only and
 * every label EN/ES. The pages inside keep gem2i's content; `.ma2-scope`
 * re-skins them through the `--ma-*` tokens.
 */
const L = {
  'membership-profile': { en: 'Membership Profile', es: 'Perfil de membresía' },
  'my-sponsor': { en: 'My Sponsor', es: 'Mi patrocinador' },
  'invite-code': { en: 'Invite Code', es: 'Código de invitación' },
  'my-community': { en: 'My Community', es: 'Mi comunidad' },
  'global-calendar': { en: 'Calendar', es: 'Calendario' },
  'calendar-sync': { en: 'Calendar Sync', es: 'Sincronizar calendario' },
  membership: { en: 'Membership', es: 'Membresía' },
  myAccount: { en: 'My Account', es: 'Mi cuenta' },
  dashboard: { en: 'Dashboard', es: 'Inicio' },
  back: { en: 'Back to Website', es: 'Volver al sitio' },
  logout: { en: 'Logout', es: 'Cerrar sesión' },
  menu: { en: 'Menu', es: 'Menú' },
  notifications: { en: 'Notifications', es: 'Notificaciones' },
  markAll: { en: 'Mark all read', es: 'Marcar todo como leído' },
  none: { en: 'No notifications yet', es: 'Aún no tienes notificaciones' },
  toDark: { en: 'Switch to dark mode', es: 'Cambiar a modo oscuro' },
  toLight: { en: 'Switch to light mode', es: 'Cambiar a modo claro' },
};

const RELATIVE_NAV_ITEMS = [
  { id: 'membership-profile', icon: User, path: 'membership-profile' },
  { id: 'my-sponsor', icon: UserCheck, path: 'my-sponsor' },
  { id: 'invite-code', icon: Key, path: 'invite-code' },
  { id: 'my-community', icon: Users, path: 'my-community' },
  { id: 'global-calendar', icon: CalendarDays, path: 'global-calendar', dynamicLabel: true },
  { id: 'calendar-sync', icon: Rss, path: 'calendar-sync' },
  // Paid membership: open to every level (it is how a member moves UP a level);
  // shown only while the CMS offers it or the member already has a plan.
  { id: 'membership', icon: Crown, path: 'membership', alwaysAllowed: true },
];

export default function MyAccountLayout() {
  const base = useMyAccountBase();
  const tt = useT();
  const ALL_NAV_ITEMS = useMemo(
    () => RELATIVE_NAV_ITEMS.map(i => ({ ...i, href: `${base}/${i.path}` })), [base]);
  const { member, logout } = useMember();
  const location = useLocation();
  const navigate = useNavigate();
  const [sideOpen, setSideOpen] = useState(false);
  // Fetched collections start as `null` = "not loaded yet", so the chrome waits for
  // the real data before painting (no logo swap / nav re-filter flash on refresh).
  const [settings, setSettings] = useState({});
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [levelPerms, setLevelPerms] = useState(null);
  const [quickLinks, setQuickLinks] = useState(null);
  const [qlPerms, setQlPerms] = useState(null);
  const [navOrderState, setNavOrderState] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState(null);
  const [ssoLoadingId, setSsoLoadingId] = useState(null);
  const [ma2Mode, setMa2ModeState] = useState(getMa2Mode);
  useEffect(() => onMa2ModeChange(() => setMa2ModeState(getMa2Mode())), []);
  // Admin-configured field visibility (Membership Settings), resolved before the Outlet
  // paints so profile pages never flash a hidden field.
  const [hiddenFields, setHiddenFields] = useState(null);
  const notifRef = useRef(null);
  // Paid-membership menu entry: known after one light call (never blocks the chrome).
  const [showMembership, setShowMembership] = useState(false);
  useEffect(() => {
    gemAPI.myMembership().then(r => {
      const d = r.data || {};
      const p = d.offer?.prices || {};
      setShowMembership(!!(d.status?.active || d.status?.lapsed || (d.offer?.enabled && (p.monthly > 0 || p.annual > 0))));
    }).catch(() => setShowMembership(false));
  }, [member?.level_id]);

  const fetchUnread = useCallback(() => {
    memberAPI.getUnreadCount().then(r => setUnreadCount(r.data?.count || 0)).catch(() => {});
  }, []);

  useEffect(() => {
    publicAPI.getSettings().then(r => setSettings(r.data)).catch(() => {}).finally(() => setSettingsLoaded(true));
    publicAPI.getMyAccountLinks().then(r => setQuickLinks(r.data || [])).catch(() => setQuickLinks([]));
    memberAPI.getMembershipSettings().then(r => setHiddenFields(r.data?.hidden_fields || [])).catch(() => setHiddenFields([]));
    publicAPI.getMyAccountNav().then(r => setNavOrderState({ items: r.data || [] })).catch(() => setNavOrderState({ items: [] }));
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  // Close the notifications panel on an outside click/tap, on Escape and on navigation.
  useEffect(() => {
    if (!notifOpen) return undefined;
    const onDown = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setNotifOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [notifOpen]);
  useEffect(() => { setNotifOpen(false); setSideOpen(false); }, [location.pathname]);

  const openNotifications = async () => {
    const next = !notifOpen;
    setNotifOpen(next);
    if (next) {
      try {
        const r = await memberAPI.getNotifications();
        setNotifications(r.data || []);
      } catch { setNotifications([]); }
    }
  };

  const markAllRead = async () => {
    try {
      await memberAPI.markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications(prev => (prev || []).map(n => ({ ...n, read: true })));
    } catch {}
  };

  const openNotification = (n) => {
    if (!n.read) {
      memberAPI.markNotificationRead(n.id).catch(() => {});
      setNotifications(prev => (prev || []).map(x => (x.id === n.id ? { ...x, read: true } : x)));
      setUnreadCount(c => Math.max(0, c - 1));
    }
    setNotifOpen(false);
    if (n.link) navigate(n.link);
  };

  useEffect(() => {
    if (!member) return;
    const all = ALL_NAV_ITEMS.map(i => i.id);
    if (isFullAdmin(member)) {
      setLevelPerms(all);
      setQlPerms(null); // admin sees all
    } else if (member.level_id) {
      memberAPI.getMyLevel().then(r => {
        setLevelPerms(r.data?.permissions?.length > 0 ? r.data.permissions : all);
        setQlPerms(r.data?.quick_link_permissions || []);
      }).catch(() => { setLevelPerms(all); setQlPerms([]); });
    } else {
      setLevelPerms(all);
      setQlPerms([]);
    }
  }, [member, ALL_NAV_ITEMS]);

  const isRouteAllowed = (() => {
    if (levelPerms === null) return null;
    const rel = location.pathname.startsWith(base)
      ? location.pathname.slice(base.length).replace(/^\//, '') : location.pathname;
    const navDef = ALL_NAV_ITEMS.find(i => rel === i.path || rel.startsWith(i.path + '/'));
    if (!navDef) return true;
    const navOverride = navOrderState?.items?.find(n => n.id === navDef.id);
    if (navOverride && navOverride.visible === false) return false;
    return !!navDef.alwaysAllowed || levelPerms.includes(navDef.id);
  })();

  useEffect(() => {
    if (isRouteAllowed === false) {
      const firstAllowed = ALL_NAV_ITEMS.find(i => levelPerms.includes(i.id));
      if (firstAllowed) navigate(firstAllowed.href, { replace: true });
    }
  }, [isRouteAllowed, levelPerms, navigate, ALL_NAV_ITEMS]);

  const handleLogout = () => { logout(); navigate('/my-account/login'); };

  const handleSsoLink = async (ql, e) => {
    e.preventDefault();
    if (ssoLoadingId) return;
    setSsoLoadingId(ql.id);
    try {
      const res = await authAPI.generateSsoToken();
      const sep = ql.url.includes('?') ? '&' : '?';
      const dest = `${ql.url}${sep}token=${res.data.sso_token}`;
      if (ql.new_tab) window.open(dest, '_blank', 'noopener,noreferrer');
      else window.location.href = dest;
    } catch {
      if (ql.new_tab) window.open(ql.url, '_blank', 'noopener,noreferrer');
      else window.location.href = ql.url;
    } finally {
      setSsoLoadingId(null);
    }
  };

  const brandName = tt(settings.brand_name) || '';
  const prefix = settings.aux_prefix || '';
  /** Label of a nav item: the CMS rename wins; otherwise the EN/ES default (the
   *  calendar carries the brand prefix, e.g. "GEM Calendar"). */
  const labelFor = (id) => {
    const def = ALL_NAV_ITEMS.find(i => i.id === id);
    const stored = navOrderState?.items?.find(n => n.id === id)?.label;
    const auto = def?.dynamicLabel && (!stored || /^(?:[A-Z0-9]{1,10}\s+)?Calendar$/.test(stored.trim()));
    if (auto) return prefix ? `${prefix} ${tt(L['global-calendar'])}` : tt(L['global-calendar']);
    if (stored && stored !== (L[id]?.en || '')) return stored;
    return tt(L[id]) || stored || id;
  };

  const navItems = levelPerms !== null ? ALL_NAV_ITEMS.filter(item => {
    const navOverride = navOrderState?.items?.find(n => n.id === item.id);
    if (navOverride && navOverride.visible === false) return false;
    if (item.id === 'membership') return showMembership;
    return item.alwaysAllowed || levelPerms.includes(item.id);
  }) : [];
  // CMS-managed ordering when present, else source order; unknown items appended.
  const orderedNavItems = (() => {
    const override = navOrderState?.items;
    if (!override || override.length === 0) return navItems;
    const byId = new Map(navItems.map(i => [i.id, i]));
    const ordered = [];
    for (const o of override) {
      const it = byId.get(o.id);
      if (it) { ordered.push(it); byId.delete(o.id); }
    }
    return [...ordered, ...byId.values()];
  })();

  const v = (name, fallback) => `var(--ma-${name}, ${fallback})`;

  // Sidebar hover: one highlight that slides between items. Moved by mutating the
  // style through a ref (not state) so mouse events don't re-render; only transform
  // and opacity animate.
  const hlRef = useRef(null);
  const hlOn = useRef(false);
  const moveHighlight = (el) => {
    const hl = hlRef.current;
    if (!hl || !el) return;
    const y = el.offsetTop;
    const h = el.offsetHeight;
    if (!hlOn.current) {
      const prev = hl.style.transition;
      hl.style.transition = 'none';
      hl.style.height = `${h}px`;
      hl.style.transform = `translateY(${y}px)`;
      void hl.offsetHeight;
      hl.style.transition = prev;
    } else {
      hl.style.height = `${h}px`;
      hl.style.transform = `translateY(${y}px)`;
    }
    hl.style.opacity = '1';
    hlOn.current = true;
  };
  const hideHighlight = () => {
    if (hlRef.current) hlRef.current.style.opacity = '0';
    hlOn.current = false;
  };

  const chromeReady = settingsLoaded && levelPerms !== null && navOrderState !== null
    && hiddenFields !== null && quickLinks !== null;
  if (!chromeReady) {
    return (
      <div className="ma2-scope min-h-screen flex items-center justify-center"
        style={{ background: v('page-bg', '#04080C') }} data-testid="myaccount-layout-loading">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: v('accent', '#3287B7') }} />
      </div>
    );
  }

  const crumb = (() => {
    const item = ALL_NAV_ITEMS.find(i => location.pathname.startsWith(i.href));
    return item ? labelFor(item.id) : tt(L.dashboard);
  })();
  const modeLabel = ma2Mode === 'dark' ? tt(L.toLight) : tt(L.toDark);

  return (
    <div className="ma2-scope min-h-screen flex" style={{ background: v('page-bg', '#04080C'), fontFamily: "'Poppins', 'Helvetica Neue', sans-serif" }} data-testid="myaccount-layout">
      {/* Sidebar — off-canvas drawer below lg */}
      <aside className={`ma2-drawer fixed inset-y-0 left-0 z-40 w-64 lg:translate-x-0 lg:static lg:flex lg:flex-col ${sideOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ backgroundColor: v('sidebar-bg', '#070c12'), borderRight: `1px solid ${v('card-border', 'rgba(255,255,255,0.05)')}` }}
        aria-label={tt(L.myAccount)}>
        <div className="p-5" style={{ borderBottom: `1px solid ${v('card-border', 'rgba(255,255,255,0.05)')}` }}>
          <Link to="/" className="flex items-center gap-2" data-testid="myaccount-brand">
            {(() => {
              const logoOff = settings.logo_off;
              const logoSrc = logoOff ? (logoOff.startsWith('/api') ? `${BACKEND_URL}${logoOff}` : logoOff) : null;
              if (logoSrc) return <img src={logoSrc} alt={brandName} className="h-8 w-auto object-contain" data-testid="sidebar-logo-img" />;
              return (
                <>
                  <div className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: v('button-bg', '#276f97') }}>
                    <span className="font-semibold text-sm" style={{ color: v('button-text', '#ffffff') }}>{brandName[0]}</span>
                  </div>
                  <span className="font-semibold text-sm" style={{ color: '#ffffff' }}>{brandName}</span>
                </>
              );
            })()}
          </Link>
          {member && (
            <div className="mt-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: v('avatar-bg', 'rgba(50,135,183,0.14)'), border: `1px solid ${v('avatar-border', 'rgba(50,135,183,0.45)')}` }}>
                <img src={member.avatar || settings.membership_default_avatar || DEFAULT_AVATAR} alt="" className="w-full h-full rounded-full object-cover" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: '#ffffff' }}>{member.first_name} {member.last_name}</p>
                <p className="text-xs tabular-nums" style={{ color: v('sidebar-active-border', '#3287B7') }}>{member.membership_id}</p>
              </div>
            </div>
          )}
        </div>
        <nav className="flex-1 py-4 overflow-y-auto relative"
          onMouseLeave={hideHighlight}
          onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) hideHighlight(); }}>
          <div ref={hlRef} aria-hidden="true" className="ma-nav-hl"
            style={{ backgroundColor: v('sidebar-hover-bg', 'rgba(255,255,255,0.05)') }} />
          {orderedNavItems.map(item => {
            const active = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
            return (
              <Link key={item.href} to={item.href}
                aria-current={active ? 'page' : undefined}
                className="relative flex items-center gap-3 px-5 py-3 lg:py-2.5 text-sm transition-colors"
                style={active ? {
                  color: v('sidebar-active-text', '#ffffff'),
                  backgroundColor: v('sidebar-active-bg', 'rgba(50,135,183,0.16)'),
                  borderRight: `2px solid ${v('sidebar-active-border', '#3287B7')}`,
                } : { color: v('sidebar-text', '#9aa7b4') }}
                onMouseEnter={e => moveHighlight(e.currentTarget)}
                onFocus={e => moveHighlight(e.currentTarget)}
                data-testid={`myaccount-nav-${item.id}`}>
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span>{labelFor(item.id)}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4" style={{ borderTop: `1px solid ${v('card-border', 'rgba(255,255,255,0.05)')}` }}>
          <Link to="/" className="flex items-center gap-3 px-3 py-2.5 text-sm rounded transition-colors" style={{ color: v('sidebar-text', '#9aa7b4') }}>
            <Home className="w-4 h-4" /><span>{tt(L.back)}</span>
          </Link>
          <button onClick={handleLogout} className="ma2-press w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded transition-colors" style={{ color: v('sidebar-text', '#9aa7b4') }}
            data-testid="myaccount-logout-btn">
            <LogOut className="w-4 h-4" /><span>{tt(L.logout)}</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <header className="sticky top-0 z-30" style={{ backgroundColor: v('header-bg', '#0b1118'), borderBottom: `1px solid ${v('card-border', 'rgba(255,255,255,0.05)')}` }}>
          <div className="h-14 flex items-center px-4 lg:px-6 justify-between">
            <button onClick={() => setSideOpen(!sideOpen)} className="ma2-press lg:hidden -ml-2 mr-2 p-2.5" aria-label={tt(L.menu)} aria-expanded={sideOpen}
              style={{ color: v('text-secondary', '#9aa7b4') }}>
              {sideOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            {(() => {
              // Level-filtered quick links (admin sees all).
              const links = quickLinks || [];
              const visibleLinks = qlPerms === null ? links : links.filter(ql => qlPerms.includes(ql.id));
              if (visibleLinks.length === 0) return <span className="ml-auto" />;
              return (
                <nav className="flex items-center gap-0 ml-auto min-w-0 overflow-x-auto" data-testid="quick-links-bar">
                  {visibleLinks.map((ql, idx) => {
                    const isActive = ql.url === location.pathname || (ql.url !== '/' && location.pathname.startsWith(ql.url));
                    const style = isActive
                      ? { backgroundColor: v('button-bg', '#276f97'), color: v('button-text', '#ffffff') }
                      : { color: v('accent', '#3287B7') };
                    return (
                      <React.Fragment key={ql.id}>
                        {idx > 0 && <span className="text-xs mx-0.5 select-none" style={{ color: v('text-muted', '#7b8794') }}>|</span>}
                        {ql.sso_enabled ? (
                          <button onClick={(e) => handleSsoLink(ql, e)} disabled={ssoLoadingId === ql.id}
                            className="px-2.5 py-2.5 lg:py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 whitespace-nowrap"
                            style={{ ...style, opacity: ssoLoadingId === ql.id ? 0.6 : 1 }}>
                            {ssoLoadingId === ql.id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <ExternalLink className="w-2.5 h-2.5" />}
                            {tt(ql.label)}
                          </button>
                        ) : (
                          <a href={ql.url} target={ql.new_tab ? '_blank' : '_self'} rel={ql.new_tab ? 'noopener noreferrer' : undefined}
                            className="px-2.5 py-2.5 lg:py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 whitespace-nowrap" style={style}>
                            {tt(ql.label)}
                            {ql.new_tab && <ExternalLink className="w-2.5 h-2.5" />}
                          </a>
                        )}
                      </React.Fragment>
                    );
                  })}
                </nav>
              );
            })()}

            {/* Light / dark — two states (gem2i default: dark) */}
            <button onClick={() => setMa2ModeState(toggleMa2Mode())}
              className="ma2-press ma2-icon-btn ml-1 sm:ml-3 p-2.5 lg:p-2 shrink-0 rounded"
              style={{ color: v('bell-icon', '#9aa7b4') }}
              title={modeLabel} aria-label={modeLabel} data-testid="ma2-theme-toggle" data-mode={ma2Mode}>
              {ma2Mode === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Notification bell */}
            <div ref={notifRef} className="relative ml-1 sm:ml-3 shrink-0" data-testid="notification-bell-wrapper">
              <button onClick={openNotifications} aria-label={tt(L.notifications)} aria-expanded={notifOpen}
                className="ma2-press ma2-icon-btn relative p-2.5 lg:p-2 rounded-full"
                style={{ color: v('bell-icon', '#9aa7b4') }} data-testid="notification-bell">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[10px] font-bold tabular-nums"
                    style={{ backgroundColor: v('bell-badge-bg', '#f06548'), color: v('bell-badge-text', '#ffffff'), boxShadow: `0 0 0 2px ${v('header-bg', '#0b1118')}` }}
                    data-testid="unread-badge">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="ma2-popover absolute right-0 top-full mt-1 w-[min(20rem,calc(100vw-2rem))] rounded-lg border shadow-xl z-50 max-h-[400px] overflow-y-auto"
                  style={{ backgroundColor: v('card-bg', '#0b1118'), borderColor: v('card-border', 'rgba(255,255,255,0.1)') }}
                  role="dialog" aria-label={tt(L.notifications)} data-testid="notification-dropdown">
                  <div className="flex items-center justify-between p-3" style={{ borderBottom: `1px solid ${v('card-border', 'rgba(255,255,255,0.05)')}` }}>
                    <span className="text-xs font-semibold" style={{ color: v('text-primary', '#fff') }}>{tt(L.notifications)}</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-[11px] font-medium py-1" style={{ color: v('accent', '#3287B7') }} data-testid="mark-all-read">{tt(L.markAll)}</button>
                    )}
                  </div>
                  {notifications === null ? (
                    <div className="p-6 flex justify-center"><Loader2 className="w-4 h-4 animate-spin" style={{ color: v('accent', '#3287B7') }} /></div>
                  ) : notifications.length === 0 ? (
                    <p className="p-6 text-center text-xs" style={{ color: v('text-muted', '#7b8794') }}>{tt(L.none)}</p>
                  ) : (
                    notifications.map(n => (
                      <button key={n.id} type="button" onClick={() => openNotification(n)}
                        className="ma2-notif w-full text-left px-3 py-2.5 block"
                        style={{ borderBottom: `1px solid ${v('card-border', 'rgba(255,255,255,0.03)')}`, backgroundColor: n.read ? 'transparent' : v('sidebar-active-bg', 'rgba(50,135,183,0.10)') }}
                        data-testid={`notif-${n.id}`}>
                        <p className="text-xs font-medium mb-0.5" style={{ color: n.read ? v('text-secondary', '#9aa7b4') : v('accent', '#3287B7') }}>{tt(n.title)}</p>
                        <p className="text-[11px] leading-relaxed" style={{ color: v('text-muted', '#7b8794') }}>{tt(n.message)}</p>
                        <p className="text-[10px] mt-1 tabular-nums" style={{ color: v('text-muted', '#7b8794') }}>{new Date(n.created_at).toLocaleString()}</p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
          {/* Breadcrumb */}
          <div className="h-8 flex items-center px-4 lg:px-6" style={{ borderTop: `1px solid ${v('card-border', 'rgba(255,255,255,0.05)')}` }}>
            <div className="flex items-center text-xs" style={{ color: v('text-muted', '#7b8794') }}>
              <span>{tt(L.myAccount)}</span>
              <ChevronRight className="w-3 h-3 mx-1" />
              <span style={{ color: v('text-secondary', '#9aa7b4') }}>{crumb}</span>
            </div>
          </div>
        </header>
        <main className="ma2-main flex-1 p-4 lg:p-8 min-w-0 overflow-x-hidden">
          {isRouteAllowed === false || isRouteAllowed === null ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: v('accent', '#3287B7') }} />
            </div>
          ) : (
            // Own Suspense boundary: a lazy page chunk must not suspend up to the
            // app-level fallback and unmount this whole layout.
            <Suspense fallback={
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: v('accent', '#3287B7') }} />
              </div>
            }>
              <Outlet context={{
                navItems: navOrderState?.items || [],
                hiddenFields,
                isFieldHidden: (k) => hiddenFields.includes(k),
                sectionLabel: (id, fallback) => (ALL_NAV_ITEMS.some(i => i.id === id) ? labelFor(id) : fallback),
              }} />
            </Suspense>
          )}
        </main>
      </div>

      {sideOpen && <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setSideOpen(false)} aria-hidden="true" />}
    </div>
  );
}
