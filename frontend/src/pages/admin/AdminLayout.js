import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { useSettings } from '../../App';
import {
  LayoutDashboard, Image, Info, Package, FileText, BookOpen, Map, Images, Briefcase, 
  MessageSquare, Mail, Inbox, CreditCard, Settings, LogOut, ChevronLeft, Menu, X, FileStack, Users,
  BarChart3, Globe, Layers, UserCheck, Shield, ClipboardCheck, Database, Rocket, MapPin, ScrollText, CalendarDays, DollarSign, Ticket, Sparkles, Lock, Bot, Trophy, Building2, FolderTree, Boxes, Lightbulb
} from 'lucide-react';

/* Each interactive entry carries the section key it maps to in the CMS Section
   Registry (`backend/models/cms_sections.py`). The sidebar is filtered at
   render time against `user.effective_permissions` so operators never see links
   to sections they cannot open. `admin_only: true` items are additionally hidden
   from anyone whose `role` is not `admin` (Roles &amp; Permissions editor). */
const sidebarItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/admin', section: 'dashboard' },
  { label: 'Analytics', icon: BarChart3, href: '/admin/analytics', section: 'analytics' },
  { label: 'Hero', icon: Image, href: '/admin/hero', section: 'hero' },
  { label: 'Hero A/B', icon: BarChart3, href: '/admin/hero-ab', section: 'hero_ab' },
  { label: 'About Us', icon: Info, href: '/admin/about', section: 'about' },
  { label: 'Services', icon: Package, href: '/admin/services', section: 'services' },
  { label: 'Blog', icon: FileText, href: '/admin/blog', section: 'blog' },
  { label: 'Reading List', icon: BookOpen, href: '/admin/books', section: 'books' },
  { label: 'Maps', icon: Map, href: '/admin/maps', section: 'maps' },
  { label: 'Gallery', icon: Images, href: '/admin/gallery', section: 'gallery' },
  { label: 'Gallery Albums', icon: Images, href: '/admin/gallery-albums', section: 'gallery_albums' },
  { label: 'Portfolio', icon: Briefcase, href: '/admin/portfolio', section: 'portfolio' },
  { label: 'Companies', icon: Building2, href: '/admin/companies', section: 'companies' },
  { label: 'Sectors', icon: FolderTree, href: '/admin/company-sectors', section: 'company_sectors' },
  { label: 'Industries', icon: Boxes, href: '/admin/company-industries', section: 'company_industries' },
  { label: 'Opportunities', icon: Lightbulb, href: '/admin/opportunities', section: 'opportunities' },
  { label: 'Opportunity Types', icon: Boxes, href: '/admin/opportunity-types', section: 'opportunity_types' },
  { label: 'Testimonials', icon: MessageSquare, href: '/admin/testimonials', section: 'testimonials' },
  { label: 'Pages', icon: FileStack, href: '/admin/pages', section: 'pages' },
  { type: 'divider', label: 'Landing Page', group: 'landing' },
  { label: 'Hero', icon: Rocket, href: '/admin/landing-hero', group: 'landing', section: 'landing_hero' },
  { label: 'Content', icon: Layers, href: '/admin/landing-content', group: 'landing', section: 'landing_content' },
  { label: 'Subscribers', icon: UserCheck, href: '/admin/landing-subscribers', group: 'landing', section: 'landing_subscribers' },
  { label: 'Contacts', icon: Mail, href: '/admin/landing-contacts', group: 'landing', section: 'landing_contacts' },
  { type: 'divider', label: 'Membership Enrollment', group: 'enrollment' },
  { label: 'Content', icon: ClipboardCheck, href: '/admin/enrollment-fields', group: 'enrollment', section: 'enrollment_fields' },
  { type: 'divider', label: 'Calendar', group: 'calendar' },
  { label: 'Global Events', icon: CalendarDays, href: '/admin/calendar/global', group: 'calendar', section: 'calendar_global' },
  { label: 'Mentorship Schedule', icon: CalendarDays, href: '/admin/calendar/mentorship', group: 'calendar', section: 'calendar_mentorship' },
  { label: 'Mentor Slot Templates', icon: CalendarDays, href: '/admin/calendar/mentor-slot-templates', group: 'calendar', section: 'calendar_mentor_slot_templates' },
  { label: 'Blocked Dates', icon: CalendarDays, href: '/admin/calendar/blocked-dates', group: 'calendar', section: 'calendar_blocked_dates' },
  { label: 'Session Bundles', icon: CalendarDays, href: '/admin/calendar/bundles', group: 'calendar', section: 'calendar_bundles' },
  { label: 'Discount Coupons', icon: Ticket, href: '/admin/calendar/coupons', group: 'calendar', section: 'calendar_coupons' },
  { label: 'Payouts', icon: DollarSign, href: '/admin/payouts', group: 'calendar', section: 'payouts' },
  { type: 'divider', label: 'My Account', group: 'myaccount' },
  { label: 'Quick Links', icon: Globe, href: '/admin/quick-links', group: 'myaccount', section: 'quick_links' },
  { label: 'My Account Navigation', icon: Menu, href: '/admin/myaccount-nav', group: 'myaccount', section: 'myaccount_nav' },
  { type: 'divider', label: 'Membership', group: 'membership' },
  { label: 'Members', icon: UserCheck, href: '/admin/members', section: 'members' },
  { label: 'Member Levels', icon: Shield, href: '/admin/member-levels', section: 'member_levels' },
  { label: 'Member Types', icon: Users, href: '/admin/member-types', section: 'member_types' },
  { label: 'Membership Settings', icon: ClipboardCheck, href: '/admin/membership-settings', section: 'membership_settings' },
  { label: 'Points & Rewards', icon: Trophy, href: '/admin/rewards', section: 'rewards' },
  { type: 'divider', label: 'Security', group: 'security', admin_only: true },
  { label: 'Roles & Permissions', icon: Lock, href: '/admin/roles', section: 'roles_permissions', admin_only: true },
  { type: 'divider', label: 'Automation', group: 'automation', admin_only: true, flag: 'pro_manager_enabled' },
  /* Pro Management is carlos-only: hidden unless settings.pro_manager_enabled
     (set only in carlosartiles_cms) — never surfaces on the other brands. */
  { label: 'Prompt Management', icon: Bot, href: '/admin/pros', admin_only: true, flag: 'pro_manager_enabled' },
  { type: 'divider', label: 'System', group: 'system' },
  { label: 'Contacts', icon: Mail, href: '/admin/contacts', section: 'contacts' },
  { label: 'Contact Section', icon: MessageSquare, href: '/admin/contact-settings', section: 'contact_settings' },
  { label: 'Purchases', icon: CreditCard, href: '/admin/purchases', section: 'purchases' },
  { label: 'Page Builder', icon: Layers, href: '/admin/section-order', section: 'section_order' },
  { label: 'Section Manager', icon: Sparkles, href: '/admin/aurex-sections', section: 'aurex_sections' },
  { label: 'SEO', icon: Globe, href: '/admin/seo', section: 'seo' },
  { label: 'Countries, States, Cities', icon: MapPin, href: '/admin/geo', section: 'geo' },
  { label: 'Documentation', icon: ScrollText, href: '/admin/documentation', section: ['doc_flow_diagram','doc_technical','doc_operator_manual','doc_user_guide','doc_testing_manual','doc_aws_install','doc_feature_audit'] },
  { label: 'Backup', icon: Database, href: '/admin/backup', section: 'backup' },
  { label: 'Settings', icon: Settings, href: '/admin/settings', section: 'settings' },
  { label: 'Email Management', icon: Mail, href: '/admin/email-management', section: 'email_management' },
  { label: 'Mail', icon: Inbox, href: '/admin/mail', section: 'mail' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const settings = useSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const API = process.env.REACT_APP_BACKEND_URL;
  const logoOff = settings.logo_off;
  const logoSrc = logoOff ? (logoOff.startsWith('/api') ? `${API}${logoOff}` : logoOff) : null;

  const handleLogout = async () => { await logout(); navigate('/'); };

  const v = (name, fallback) => `var(--ad-${name}, ${fallback})`;

  // Permission-filter the sidebar: admins get everything; operators only see
  // entries whose `section` key is in their effective_permissions.  Dividers
  // are kept only when at least one child survived the filter so operators
  // never see an empty "Landing Page" / "Calendar" group header.
  const isAdmin = user?.role === 'admin';
  const perms = new Set(user?.effective_permissions || []);
  const visibleItems = (() => {
    const result = [];
    let pendingDivider = null;
    for (const item of sidebarItems) {
      if (item.type === 'divider') {
        if (item.admin_only && !isAdmin) { pendingDivider = null; continue; }
        if (item.flag && !settings?.[item.flag]) { pendingDivider = null; continue; }
        pendingDivider = item;
        continue;
      }
      if (item.admin_only && !isAdmin) continue;
      // feature-flagged entries (e.g. Pro Management) only render where the flag is on
      if (item.flag && !settings?.[item.flag]) continue;
      if (!isAdmin && item.section) {
        const keys = Array.isArray(item.section) ? item.section : [item.section];
        if (!keys.some(k => perms.has(k))) continue;
      }
      if (pendingDivider) { result.push(pendingDivider); pendingDivider = null; }
      result.push(item);
    }
    return result;
  })();

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: v('page-bg', '#f8fafc') }} data-testid="admin-layout">
      {mobileOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileOpen(false)} />}
      
      {/* Sidebar */}
      <aside className={`fixed md:sticky top-0 left-0 h-screen z-50 transition-all duration-300 flex flex-col
        ${collapsed ? 'w-16' : 'w-60'} 
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        style={{ backgroundColor: v('sidebar-bg', '#1a2332') }}
        data-testid="admin-sidebar"
      >
        <div className={`flex items-center h-14 px-4 ${collapsed ? 'justify-center' : 'justify-between'}`}
          style={{ borderBottom: `1px solid rgba(255,255,255,0.1)` }}>
          {!collapsed && (
            <Link to="/admin" className="flex items-center gap-2">
              {logoSrc ? (
                <img src={logoSrc} alt="Admin" className="h-7 w-auto object-contain" data-testid="admin-sidebar-logo-img" />
              ) : (
                <>
                  <div className="w-6 h-6 rounded-sm flex items-center justify-center" style={{ backgroundColor: v('accent', '#0D9488') }}>
                    <span className="text-white text-xs font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>{(settings.brand_name || 'L')[0]}</span>
                  </div>
                  <span className="text-sm font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>{settings.brand_name || 'Legacy'} CMS</span>
                </>
              )}
            </Link>
          )}
          <button onClick={() => setCollapsed(!collapsed)} className="hidden md:block text-white/50 hover:text-white" data-testid="sidebar-collapse-btn">
            <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </button>
          <button onClick={() => setMobileOpen(false)} className="md:hidden text-white/50 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <nav className="flex-1 py-3 overflow-y-auto">
          {visibleItems.map((item, idx) => {
            if (item.type === 'divider') {
              if (collapsed) return <div key={idx} className="my-2 mx-3 border-t border-white/10" />;
              return <div key={idx} className="mt-4 mb-1 px-4 text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: 'rgba(255,255,255,0.3)' }}>{item.label}</div>;
            }
            const active = location.pathname === item.href;
            return (
              <Link key={item.href} to={item.href} onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 mx-2 rounded-sm text-sm transition-colors"
                style={active ? {
                  backgroundColor: v('sidebar-active-bg', '#0D9488'),
                  color: v('sidebar-active-text', '#ffffff')
                } : {
                  color: v('sidebar-text', 'rgba(255,255,255,0.6)')
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.backgroundColor = v('sidebar-hover-bg', 'rgba(255,255,255,0.05)'); e.currentTarget.style.color = '#ffffff'; }}}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = v('sidebar-text', 'rgba(255,255,255,0.6)'); }}}
                data-testid={`admin-nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <Link to="/" className={`flex items-center gap-3 px-2 py-2 text-white/50 hover:text-white text-sm transition-colors ${collapsed ? 'justify-center' : ''}`} data-testid="admin-back-site">
            <ChevronLeft className="w-4 h-4" />
            {!collapsed && <span>Back to Site</span>}
          </Link>
          <button onClick={handleLogout} className={`flex items-center gap-3 px-2 py-2 text-white/50 hover:text-red-400 text-sm w-full transition-colors ${collapsed ? 'justify-center' : ''}`} data-testid="admin-logout-btn">
            <LogOut className="w-4 h-4" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <header className="h-14 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30"
          style={{ backgroundColor: v('navbar-bg', '#ffffff'), borderBottom: `1px solid ${v('navbar-border', '#e2e8f0')}` }}>
          <button onClick={() => setMobileOpen(true)} className="md:hidden p-2" style={{ color: v('text-secondary', '#64748b') }} data-testid="admin-mobile-menu">
            <Menu className="w-5 h-5" />
          </button>
          <div className="text-sm" style={{ color: v('text-secondary', '#64748b') }}>
            Welcome, <span className="font-medium" style={{ color: v('heading', '#1a2332') }}>{user?.name || user?.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1 rounded-sm font-medium" style={{ color: v('accent', '#0D9488'), backgroundColor: `${v('accent', '#0D9488')}15` }} data-testid="admin-header-role-badge">
              {isAdmin ? 'Admin' : (user?.role === 'member' ? 'Operator' : (user?.role || 'User'))}
            </span>
          </div>
        </header>
        <main className="p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
