import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useMember } from '../../lib/memberAuth';
import { publicAPI, memberAPI, authAPI } from '../../lib/api';
import { BACKEND_URL } from '../../lib/config';
import { DEFAULT_AVATAR } from '../../lib/defaultImages';
import {
  User, Key, Users, Briefcase, LogOut, Menu, X, ChevronRight, Home, Award, UserCheck, Loader2, Wallet, ExternalLink, Bell, CalendarDays, BookOpen, Rss, BarChart3, Package, Mail, Trophy
} from 'lucide-react';
import { useT } from '../../lib/i18n';
import { isAdmin as isFullAdmin } from '../../lib/isAdmin';

const ALL_NAV_ITEMS = [
  { id: 'membership-profile', label: 'Membership Profile', icon: User, href: '/my-account/membership-profile' },
  { id: 'mentorship-profile', label: 'Mentorship Profile', icon: Award, href: '/my-account/mentorship-profile' },
  { id: 'my-sponsor', label: 'My Sponsor', icon: UserCheck, href: '/my-account/my-sponsor' },
  { id: 'ebank', label: 'My Ebank', icon: Wallet, href: '/my-account/ebank' },
  { id: 'invite-code', label: 'Invite Code', icon: Key, href: '/my-account/invite-code' },
  { id: 'my-community', label: 'My Community', icon: Users, href: '/my-account/my-community' },
  { id: 'portfolios', label: 'Portfolios', icon: Briefcase, href: '/my-account/portfolios' },
  { id: 'global-calendar', label: 'Calendar', icon: CalendarDays, href: '/my-account/global-calendar', dynamicLabel: true },
  { id: 'mentorship-calendar', label: 'My Calendar', icon: CalendarDays, href: '/my-account/mentorship-calendar', mentorOnly: true },
  { id: 'earnings', label: 'Earnings', icon: BarChart3, href: '/my-account/earnings', mentorOnly: true },
  { id: 'bundles', label: 'Session Bundles', icon: Package, href: '/my-account/bundles' },
  { id: 'my-bookings', label: 'My Reservations', icon: BookOpen, href: '/my-account/my-bookings' },
  { id: 'calendar-sync', label: 'Calendar Sync', icon: Rss, href: '/my-account/calendar-sync' },
  // Points is level-gated like every other section: it shows only when the member's
  // level lists 'points' in CMS → Member Levels. Admins always see it.
  { id: 'points', label: 'Points & Rewards', icon: Trophy, href: '/my-account/points' },
];

const ROUTE_TO_PERM = {
  '/my-account/membership-profile': 'membership-profile',
  '/my-account/mentorship-profile': 'mentorship-profile',
  '/my-account/my-sponsor': 'my-sponsor',
  '/my-account/ebank': 'ebank',
  '/my-account/invite-code': 'invite-code',
  '/my-account/my-community': 'my-community',
  '/my-account/portfolios': 'portfolios',
  '/my-account/global-calendar': 'global-calendar',
  '/my-account/mentorship-calendar': 'mentorship-calendar',
  '/my-account/earnings': 'earnings',
  '/my-account/bundles': 'bundles',
  '/my-account/my-bookings': 'my-bookings',
  '/my-account/calendar-sync': 'calendar-sync',
  '/my-account/points': 'points',
};

export default function MyAccountLayout() {
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
  const [notifications, setNotifications] = useState([]);
  const [ssoLoadingId, setSsoLoadingId] = useState(null);
  const [mailboxes, setMailboxes] = useState(null);   // member's own mailbox(es), if any (null = not loaded)
  // Admin-configured field visibility (Membership Settings), resolved before the Outlet
  // paints so profile pages never flash a hidden field.
  const [hiddenFields, setHiddenFields] = useState(null);

  const fetchUnread = useCallback(() => {
    memberAPI.getUnreadCount().then(r => setUnreadCount(r.data?.count || 0)).catch(() => {});
  }, []);

  useEffect(() => {
    publicAPI.getSettings().then(r => setSettings(r.data)).catch(() => {}).finally(() => setSettingsLoaded(true));
    publicAPI.getMyAccountLinks().then(r => setQuickLinks(r.data || [])).catch(() => setQuickLinks([]));
    memberAPI.getMembershipSettings().then(r => setHiddenFields(r.data?.hidden_fields || [])).catch(() => setHiddenFields([]));
    publicAPI.getMyAccountNav().then(r => setNavOrderState({ items: r.data || [] })).catch(() => setNavOrderState({ items: [] }));
    memberAPI.listMailboxes().then(r => setMailboxes(r.data || [])).catch(() => setMailboxes([]));
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  const openNotifications = async () => {
    setNotifOpen(!notifOpen);
    if (!notifOpen) {
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
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch {}
  };

  useEffect(() => {
    if (member) {
      if (isFullAdmin(member)) {
        setLevelPerms(ALL_NAV_ITEMS.map(i => i.id));
        setQlPerms(null); // admin sees all
      } else if (member.level_id) {
        memberAPI.getMyLevel().then(r => {
          if (r.data && r.data.permissions && r.data.permissions.length > 0) {
            setLevelPerms(r.data.permissions);
          } else {
            setLevelPerms(ALL_NAV_ITEMS.map(i => i.id));
          }
          setQlPerms(r.data?.quick_link_permissions || []);
        }).catch(() => { setLevelPerms(ALL_NAV_ITEMS.map(i => i.id)); setQlPerms([]); });
      } else {
        setLevelPerms(ALL_NAV_ITEMS.map(i => i.id));
        setQlPerms([]);
      }
    }
  }, [member]);

  const isMentor = member?._member_type?.permissions?.is_mentor;
  const hasMentor = !!member?.mentor_id;

  const isRouteAllowed = (() => {
    if (levelPerms === null) return null;
    const path = location.pathname;
    let requiredPerm = null;
    for (const [route, perm] of Object.entries(ROUTE_TO_PERM)) {
      if (path === route || path.startsWith(route + '/')) {
        requiredPerm = perm;
        break;
      }
    }
    if (requiredPerm) {
      // Respect CMS "My Account Navigation" visibility override (global hide)
      const navOverride = navOrderState?.items?.find(n => n.id === requiredPerm);
      if (navOverride && navOverride.visible === false) return false;
      const navDef = ALL_NAV_ITEMS.find(i => i.id === requiredPerm);
      // Mentor-only sections are governed by the Mentor TYPE, not by the level.
      if (navDef?.mentorOnly) { if (!isMentor) return false; }
      else if (!navDef?.alwaysAllowed && !levelPerms.includes(requiredPerm)) return false;
    }
    return true;
  })();

  useEffect(() => {
    if (isRouteAllowed === false) {
      const firstAllowed = ALL_NAV_ITEMS.find(i => levelPerms.includes(i.id));
      if (firstAllowed) navigate(firstAllowed.href, { replace: true });
    }
  }, [isRouteAllowed, levelPerms, navigate]);

  const handleLogout = () => { logout(); navigate('/my-account/login'); };

  const handleSsoLink = async (ql, e) => {
    e.preventDefault();
    if (ssoLoadingId) return;
    setSsoLoadingId(ql.id);
    try {
      const res = await authAPI.generateSsoToken();
      const { sso_token } = res.data;
      const sep = ql.url.includes('?') ? '&' : '?';
      const dest = `${ql.url}${sep}token=${sso_token}`;
      if (ql.new_tab) {
        window.open(dest, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = dest;
      }
    } catch {
      // silently fall back to plain navigation on error
      if (ql.new_tab) {
        window.open(ql.url, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = ql.url;
      }
    } finally {
      setSsoLoadingId(null);
    }
  };

  const tt = useT();
  const brandName = tt(settings.brand_name) || '';
  const navItems = levelPerms !== null ? ALL_NAV_ITEMS.filter(item => {
    // Global-visibility override from CMS "My Account Navigation" (if present)
    const navOverride = navOrderState?.items?.find(n => n.id === item.id);
    if (navOverride && navOverride.visible === false) return false;
    // Mentor sections: governed by the Mentor TYPE, not by the level.
    if (item.mentorOnly) return isMentor;
    return item.alwaysAllowed || levelPerms.includes(item.id);
  }) : [];
  // Apply CMS-managed ordering if available, else keep source order.
  // Also override item.label with the CMS-renamed label when present.
  const orderedNavItems = (() => {
    const override = navOrderState?.items;
    if (!override || override.length === 0) return navItems;
    const byId = new Map(navItems.map(i => [i.id, i]));
    const ordered = [];
    for (const o of override) {
      const it = byId.get(o.id);
      if (it) {
        ordered.push(o.label && o.label !== it.label ? { ...it, label: o.label, _cmsLabel: true } : it);
        byId.delete(o.id);
      }
    }
    return [...ordered, ...byId.values()]; // any unknown new items appended
  })();
  // Mail is gated by OWNING a mailbox (mail_accounts.myaccount_access), not by
  // member level — append it only when the member actually has one assigned.
  const finalNavItems = (mailboxes && mailboxes.length > 0)
    ? [...orderedNavItems, { id: 'mail', label: 'Mail', icon: Mail, href: '/my-account/mail' }]
    : orderedNavItems;
  const permissionsLoading = levelPerms === null;

  // CSS variable shortcuts
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
      // First entry: place it without animating so it fades in under the cursor.
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

  // Hold the whole chrome until its data is in, then paint once: painting on the
  // empty defaults made My Account flash on refresh.
  const chromeReady = settingsLoaded && levelPerms !== null && navOrderState !== null
    && hiddenFields !== null && quickLinks !== null && mailboxes !== null;
  if (!chromeReady) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: v('page-bg', '#0d0f14'), fontFamily: "'DM Sans', sans-serif" }}
        data-testid="myaccount-layout-loading">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: v('accent', '#c9a84c') }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: v('page-bg', '#0d0f14'), fontFamily: "'DM Sans', sans-serif" }} data-testid="myaccount-layout">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 transition-transform lg:translate-x-0 lg:static lg:flex lg:flex-col ${sideOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ backgroundColor: v('sidebar-bg', '#13161e'), borderRight: `1px solid ${v('card-border', 'rgba(255,255,255,0.05)')}` }}>
        <div className="p-5" style={{ borderBottom: `1px solid ${v('card-border', 'rgba(255,255,255,0.05)')}` }}>
          <Link to="/" className="flex items-center gap-2" data-testid="myaccount-brand">
            {(() => {
              const logoOff = settings.logo_off;
              const logoSrc = logoOff ? (logoOff.startsWith('/api') ? `${BACKEND_URL}${logoOff}` : logoOff) : null;
              if (logoSrc) return <img src={logoSrc} alt={brandName} className="h-8 w-auto object-contain" data-testid="sidebar-logo-img" />;
              return (
                <>
                  <div className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: v('accent', '#c9a84c') }}>
                    <span className="font-bold text-sm" style={{ color: v('button-text', '#0d0f14'), fontFamily: "'DM Serif Display', serif" }}>
                      {brandName[0]}
                    </span>
                  </div>
                  <span className="font-semibold text-sm" style={{ color: v('text-primary', '#ffffff') }}>{brandName}</span>
                </>
              );
            })()}
          </Link>
          {member && (
            <div className="mt-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: v('avatar-bg', 'rgba(201,168,76,0.1)'), border: `1px solid ${v('avatar-border', 'rgba(201,168,76,0.4)')}` }}>
                <img src={member.avatar || settings.membership_default_avatar || DEFAULT_AVATAR} alt="" className="w-full h-full rounded-full object-cover" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: v('text-primary', '#ffffff') }}>{member.first_name} {member.last_name}</p>
                <p className="text-xs" style={{ color: v('accent', '#c9a84c') }}>{member.membership_id}</p>
              </div>
            </div>
          )}
        </div>
        <nav className="flex-1 py-4 overflow-y-auto relative"
          onMouseLeave={hideHighlight}
          onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) hideHighlight(); }}>
          <div ref={hlRef} aria-hidden="true" className="ma-nav-hl"
            style={{ backgroundColor: v('sidebar-hover-bg', 'rgba(255,255,255,0.05)') }} />
          {permissionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: v('accent', '#c9a84c') }} />
            </div>
          ) : (
            finalNavItems.map(item => {
              const active = location.pathname === item.href || location.pathname.startsWith(item.href + '/') || (item.id === 'global-calendar' && location.pathname.startsWith('/my-account/event/'));
              return (
                <Link key={item.href} to={item.href} onClick={() => setSideOpen(false)}
                  className="relative flex items-center gap-3 px-5 py-2.5 text-sm transition-colors"
                  style={active ? {
                    color: v('sidebar-active-text', '#c9a84c'),
                    backgroundColor: v('sidebar-active-bg', 'rgba(201,168,76,0.1)'),
                    borderRight: `2px solid ${v('sidebar-active-border', '#c9a84c')}`
                  } : {
                    color: v('sidebar-text', '#9ca3af'),
                  }}
                  onMouseEnter={e => { moveHighlight(e.currentTarget); if (!active) e.currentTarget.style.color = v('text-primary', '#ffffff'); }}
                  onFocus={e => { moveHighlight(e.currentTarget); if (!active) e.currentTarget.style.color = v('text-primary', '#ffffff'); }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.color = v('sidebar-text', '#9ca3af'); }}
                  onBlur={e => { if (!active) e.currentTarget.style.color = v('sidebar-text', '#9ca3af'); }}
                  data-testid={`myaccount-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}>
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item._cmsLabel ? item.label : (item.dynamicLabel ? `${settings.aux_prefix || 'AUX'} Calendar` : item.label)}</span>
                </Link>
              );
            })
          )}
        </nav>
        <div className="p-4" style={{ borderTop: `1px solid ${v('card-border', 'rgba(255,255,255,0.05)')}` }}>
          <Link to="/" className="flex items-center gap-3 px-3 py-2 text-sm rounded transition-colors" style={{ color: v('sidebar-text', '#9ca3af') }}>
            <Home className="w-4 h-4" /><span>Back to Website</span>
          </Link>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded transition-colors" style={{ color: v('sidebar-text', '#9ca3af') }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.7'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
            data-testid="myaccount-logout-btn">
            <LogOut className="w-4 h-4" /><span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top Header with Quick Links */}
        <header className="sticky top-0 z-30" style={{ backgroundColor: v('header-bg', '#13161e'), borderBottom: `1px solid ${v('card-border', 'rgba(255,255,255,0.05)')}` }}>
          <div className="h-14 flex items-center px-4 lg:px-6 justify-between">
            <button onClick={() => setSideOpen(!sideOpen)} className="lg:hidden mr-4" style={{ color: v('sidebar-text', '#9ca3af') }}>
              {sideOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            {/* Quick Links Bar */}
            {(() => {
              // Filter by level permissions: admin sees all, others see only permitted links.
              // pms/lms/mms_role_required links bypass level perms — the backend
              // already filtered them by platform role, so receiving one means show it.
              const links = quickLinks || [];
              const visibleLinks = qlPerms === null ? links : links.filter(ql => ql.pms_role_required || ql.lms_role_required || ql.mms_role_required || qlPerms.includes(ql.id));
              if (visibleLinks.length === 0) return null;
              return (
              <nav className="flex items-center gap-0 ml-auto overflow-x-auto" data-testid="quick-links-bar">
                {visibleLinks.map((ql, idx) => {
                  const isActive = ql.url === location.pathname || (ql.url !== '/' && location.pathname.startsWith(ql.url));
                  return (
                    <React.Fragment key={ql.id}>
                      {idx > 0 && <span className="text-xs mx-0.5 select-none" style={{ color: v('text-muted', '#6b7280') }}>|</span>}
                      {ql.sso_enabled ? (
                        <button
                          onClick={(e) => handleSsoLink(ql, e)}
                          disabled={ssoLoadingId === ql.id}
                          className="px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 whitespace-nowrap"
                          style={isActive
                            ? { backgroundColor: v('accent', '#c9a84c'), color: v('button-text', '#0d0f14'), opacity: ssoLoadingId === ql.id ? 0.6 : 1 }
                            : { color: v('accent', '#c9a84c'), opacity: ssoLoadingId === ql.id ? 0.6 : 1 }
                          }
                          data-testid={`quick-link-${ql.label.toLowerCase().replace(/\s/g, '-')}`}
                        >
                          {ssoLoadingId === ql.id
                            ? <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            : <ExternalLink className="w-2.5 h-2.5" />}
                          {ql.label}
                        </button>
                      ) : (
                        <a
                          href={ql.url}
                          target={ql.new_tab ? '_blank' : '_self'}
                          rel={ql.new_tab ? 'noopener noreferrer' : undefined}
                          className="px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 whitespace-nowrap"
                          style={isActive
                            ? { backgroundColor: v('accent', '#c9a84c'), color: v('button-text', '#0d0f14') }
                            : { color: v('accent', '#c9a84c') }
                          }
                          data-testid={`quick-link-${ql.label.toLowerCase().replace(/\s/g, '-')}`}
                        >
                          {ql.label}
                          {ql.new_tab && <ExternalLink className="w-2.5 h-2.5" />}
                        </a>
                      )}
                    </React.Fragment>
                  );
                })}
              </nav>
              );
            })()}
            {/* Notification Bell */}
            <div className="relative ml-3" data-testid="notification-bell-wrapper">
              <button
                onClick={openNotifications}
                className="relative p-2 rounded-full transition-colors"
                style={{ color: v('bell-icon', v('accent', '#c9a84c')) }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = v('bell-hover-bg', 'rgba(201,168,76,0.12)'); }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                data-testid="notification-bell"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 min-w-[18px] flex items-center justify-center rounded-full text-[10px] font-bold ring-2"
                    style={{
                      backgroundColor: v('bell-badge-bg', '#ef4444'),
                      color: v('bell-badge-text', '#ffffff'),
                      boxShadow: `0 0 0 2px ${v('header-bg', '#13161e')}`,
                    }}
                    data-testid="unread-badge"
                  >
                    {unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full mt-1 w-80 rounded-lg border shadow-xl z-50 max-h-[400px] overflow-y-auto" style={{ backgroundColor: v('card-bg', '#13161e'), borderColor: v('card-border', 'rgba(255,255,255,0.1)') }} data-testid="notification-dropdown">
                  <div className="flex items-center justify-between p-3" style={{ borderBottom: `1px solid ${v('card-border', 'rgba(255,255,255,0.05)')}` }}>
                    <span className="text-xs font-semibold" style={{ color: v('text-primary', '#fff') }}>Notifications</span>
                    {unreadCount > 0 && <button onClick={markAllRead} className="text-[10px] font-medium" style={{ color: v('accent', '#c9a84c') }} data-testid="mark-all-read">Mark all read</button>}
                  </div>
                  {notifications.length === 0 ? (
                    <p className="p-6 text-center text-xs" style={{ color: v('text-muted', '#6b7280') }}>No notifications</p>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className="px-3 py-2.5 transition-colors hover:opacity-90" style={{ borderBottom: `1px solid ${v('card-border', 'rgba(255,255,255,0.03)')}`, backgroundColor: n.read ? 'transparent' : v('sidebar-active-bg', 'rgba(201,168,76,0.05)') }} data-testid={`notif-${n.id}`}>
                        <p className="text-xs font-medium mb-0.5" style={{ color: n.read ? v('text-secondary', '#9ca3af') : v('accent', '#c9a84c') }}>{n.title}</p>
                        <p className="text-[11px] leading-relaxed" style={{ color: v('text-muted', '#6b7280') }}>{n.message}</p>
                        <p className="text-[10px] mt-1" style={{ color: v('text-muted', '#4b5563') }}>{new Date(n.created_at).toLocaleString()}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
          {/* Breadcrumb */}
          <div className="h-8 flex items-center px-4 lg:px-6" style={{ borderTop: `1px solid ${v('card-border', 'rgba(255,255,255,0.05)')}` }}>
            <div className="flex items-center text-xs" style={{ color: v('text-muted', '#6b7280') }}>
              <span>My Account</span>
              <ChevronRight className="w-3 h-3 mx-1" />
              <span style={{ color: v('text-secondary', '#9ca3af') }}>{
                location.pathname.startsWith('/my-account/event/') ? (
                  navOrderState?.items?.find(n => n.id === 'global-calendar')?.label
                  || `${settings.aux_prefix || 'AUX'} Calendar`
                ) :
                (() => {
                  const item = ALL_NAV_ITEMS.find(i => location.pathname.startsWith(i.href));
                  if (!item) return 'Dashboard';
                  const cmsLabel = navOrderState?.items?.find(n => n.id === item.id)?.label;
                  if (cmsLabel && cmsLabel !== item.label) return cmsLabel;
                  return item.dynamicLabel ? `${settings.aux_prefix || 'AUX'} Calendar` : item.label;
                })()
              }</span>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8 min-w-0 overflow-x-hidden">
          {isRouteAllowed === false || isRouteAllowed === null || hiddenFields === null ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: v('accent', '#c9a84c') }} />
            </div>
          ) : (
            // Own Suspense boundary around the lazy pages: otherwise a page chunk suspends
            // up to the app-level full-screen fallback and unmounts this whole layout.
            <Suspense fallback={
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: v('accent', '#c9a84c') }} />
              </div>
            }>
              <Outlet context={{
                navItems: navOrderState?.items || [],
                hiddenFields,
                isFieldHidden: (k) => hiddenFields.includes(k),
                sectionLabel: (id, fallback) => {
                  const stored = navOrderState?.items?.find(n => n.id === id)?.label;
                  const def = ALL_NAV_ITEMS.find(i => i.id === id);
                  // Dynamic label (AUX prefix) applies only when admin hasn't renamed the item
                  if (def?.dynamicLabel && (!stored || stored === def.label)) {
                    return `${settings.aux_prefix || 'AUX'} Calendar`;
                  }
                  return stored || fallback;
                },
              }} />
            </Suspense>
          )}
        </main>
      </div>

      {sideOpen && <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setSideOpen(false)} />}
    </div>
  );
}
