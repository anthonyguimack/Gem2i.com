import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, Mail, DollarSign, FileText, Images, BookOpen, Map, MessageSquare } from 'lucide-react';

const COLORS = ['#0D9488', '#1a2332', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

function getAccent() {
  return getComputedStyle(document.documentElement).getPropertyValue('--ad-accent')?.trim() || '#0D9488';
}
function getHeading() {
  return getComputedStyle(document.documentElement).getPropertyValue('--ad-heading')?.trim() || '#1a2332';
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accent, setAccent] = useState('#0D9488');
  const [heading, setHeading] = useState('#1a2332');

  useEffect(() => {
    adminAPI.getAnalytics().then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false));
    // Read CSS variable values once mounted
    setTimeout(() => {
      setAccent(getAccent());
      setHeading(getHeading());
    }, 100);
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-[#0D9488] border-t-transparent rounded-full"></div></div>;
  if (!data) return <div className="text-center text-slate-400 py-12">Unable to load analytics</div>;

  const cs = data.content_stats || {};

  return (
    <div data-testid="analytics-dashboard">
      <h1 className="text-2xl font-bold text-[#1a2332] mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>Analytics</h1>

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Contacts', value: cs.total_contacts, icon: Mail, color: 'bg-amber-500' },
          { label: 'Unread', value: cs.unread_contacts, icon: Mail, color: 'bg-red-500' },
          { label: 'Members', value: cs.total_users, icon: Users, color: '' },
          { label: 'Blog Posts', value: cs.blog_posts, icon: FileText, color: 'bg-blue-500' },
        ].map(m => (
          <div key={m.label} className="bg-white p-4 rounded-sm border border-slate-100" data-testid={`metric-${m.label.toLowerCase().replace(/\s/g, '-')}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">{m.label}</p>
                <p className="text-2xl font-bold text-[#1a2332] mt-1">{m.value || 0}</p>
              </div>
              <div className={`w-9 h-9 rounded-sm flex items-center justify-center ${m.color}`} style={!m.color ? { backgroundColor: accent } : {}}>
                <m.icon className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Monthly Contacts Chart */}
        <div className="bg-white rounded-sm border border-slate-100 p-5" data-testid="contacts-chart">
          <h3 className="text-sm font-semibold text-[#1a2332] mb-4">Monthly Contacts</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.monthly_contacts}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="contacts" fill={accent} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Revenue Chart */}
        <div className="bg-white rounded-sm border border-slate-100 p-5" data-testid="revenue-chart">
          <h3 className="text-sm font-semibold text-[#1a2332] mb-4">Monthly Revenue</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.monthly_revenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${v}`} />
              <Tooltip formatter={v => `$${v}`} />
              <Line type="monotone" dataKey="revenue" stroke={heading} strokeWidth={2} dot={{ fill: accent }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Monthly Registered Members Chart */}
        <div className="bg-white rounded-sm border border-slate-100 p-5" data-testid="registrations-chart">
          <h3 className="text-sm font-semibold text-[#1a2332] mb-4">Registered Members</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.monthly_registrations}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="members" fill="#059669" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Logged-In Members Chart */}
        <div className="bg-white rounded-sm border border-slate-100 p-5" data-testid="logins-chart">
          <h3 className="text-sm font-semibold text-[#1a2332] mb-4">Logged-In Members</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.monthly_logins}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="logins" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Services */}
        <div className="bg-white rounded-sm border border-slate-100 p-5" data-testid="top-services">
          <h3 className="text-sm font-semibold text-[#1a2332] mb-4">Top Services</h3>
          {data.top_services?.length > 0 ? (
            <div className="space-y-3">
              {data.top_services.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-sm">
                  <div>
                    <p className="text-sm font-medium text-[#1a2332]">{s.name}</p>
                    <p className="text-xs text-slate-400">{s.count} purchase{s.count !== 1 ? 's' : ''}</p>
                  </div>
                  <span className="text-sm font-bold" style={{ color: accent }}>${s.revenue?.toFixed(2)}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-slate-400 text-center py-4">No purchase data yet</p>}
        </div>

        {/* Content Overview */}
        <div className="bg-white rounded-sm border border-slate-100 p-5" data-testid="content-overview">
          <h3 className="text-sm font-semibold text-[#1a2332] mb-4">Content Overview</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Gallery', value: cs.gallery_items, icon: Images },
              { label: 'Portfolio', value: cs.portfolio_items, icon: TrendingUp },
              { label: 'Books', value: cs.books, icon: BookOpen },
              { label: 'Locations', value: cs.map_locations, icon: Map },
              { label: 'Testimonials', value: cs.testimonials, icon: MessageSquare },
              { label: 'Pages', value: cs.total_pages, icon: FileText },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-3 p-3 bg-slate-50 rounded-sm">
                <s.icon className="w-4 h-4" style={{ color: accent }} />
                <div>
                  <p className="text-lg font-bold text-[#1a2332]">{s.value || 0}</p>
                  <p className="text-xs text-slate-400">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
