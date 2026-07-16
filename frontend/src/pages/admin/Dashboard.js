import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../lib/api';
import { Link } from 'react-router-dom';
import { FileText, Package, Mail, CreditCard, Images, Briefcase, MessageSquare, BookOpen, Map, DollarSign, Eye, Users } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({});
  useEffect(() => { adminAPI.dashboard().then(r => setStats(r.data)).catch(console.error); }, []);

  const cards = [
    { label: 'Members', value: stats.members_count || 0, icon: Users, color: 'bg-[#0D9488]', href: '/admin/members' },
    { label: 'Blog Posts', value: stats.blog_count || 0, icon: FileText, color: 'bg-blue-500', href: '/admin/blog' },
    { label: 'Services', value: stats.services_count || 0, icon: Package, color: 'bg-[#0D9488]', href: '/admin/services' },
    { label: 'Contacts', value: stats.contacts_count || 0, icon: Mail, color: 'bg-amber-500', href: '/admin/contacts', badge: stats.unread_contacts },
    { label: 'Purchases', value: stats.purchases_count || 0, icon: CreditCard, color: 'bg-purple-500', href: '/admin/purchases' },
    { label: 'Gallery', value: stats.gallery_count || 0, icon: Images, color: 'bg-pink-500', href: '/admin/gallery' },
    { label: 'Portfolio', value: stats.portfolio_count || 0, icon: Briefcase, color: 'bg-indigo-500', href: '/admin/portfolio' },
    { label: 'Testimonials', value: stats.testimonials_count || 0, icon: MessageSquare, color: 'bg-cyan-500', href: '/admin/testimonials' },
    { label: 'Books', value: stats.books_count || 0, icon: BookOpen, color: 'bg-orange-500', href: '/admin/books' },
    { label: 'Map Locations', value: stats.maps_count || 0, icon: Map, color: 'bg-emerald-500', href: '/admin/maps' },
  ];

  return (
    <div data-testid="admin-dashboard">
      <h1 className="text-2xl font-bold text-[#1a2332] mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>Dashboard</h1>
      
      {/* Revenue card */}
      <div className="bg-gradient-to-r from-[#1a2332] to-[#2a3a52] rounded-sm p-6 mb-6 text-white" data-testid="revenue-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/60 text-sm">Total Revenue</p>
            <p className="text-3xl font-bold mt-1">${(stats.total_revenue || 0).toFixed(2)}</p>
          </div>
          <DollarSign className="w-10 h-10 text-[#0D9488]" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(card => (
          <Link key={card.label} to={card.href} className="bg-white p-5 rounded-sm border border-slate-100 hover:shadow-md transition-all group" data-testid={`dashboard-card-${card.label.toLowerCase().replace(/\s/g, '-')}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">{card.label}</p>
                <p className="text-2xl font-bold text-[#1a2332] mt-1">{card.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-sm ${card.color} flex items-center justify-center`}>
                <card.icon className="w-5 h-5 text-white" />
              </div>
            </div>
            {card.badge > 0 && <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-sm mt-2 inline-block">{card.badge} unread</span>}
          </Link>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-sm border border-slate-100 p-5">
          <h3 className="text-sm font-semibold text-[#1a2332] mb-3">Quick Actions</h3>
          <div className="space-y-2">
            <Link to="/admin/blog" className="flex items-center gap-2 text-sm text-slate-600 hover:text-[#0D9488] transition-colors p-2 rounded-sm hover:bg-slate-50">
              <FileText className="w-4 h-4" /> Create New Blog Post
            </Link>
            <Link to="/admin/services" className="flex items-center gap-2 text-sm text-slate-600 hover:text-[#0D9488] transition-colors p-2 rounded-sm hover:bg-slate-50">
              <Package className="w-4 h-4" /> Add New Service
            </Link>
            <Link to="/admin/gallery" className="flex items-center gap-2 text-sm text-slate-600 hover:text-[#0D9488] transition-colors p-2 rounded-sm hover:bg-slate-50">
              <Images className="w-4 h-4" /> Upload Gallery Photo
            </Link>
            <Link to="/admin/settings" className="flex items-center gap-2 text-sm text-slate-600 hover:text-[#0D9488] transition-colors p-2 rounded-sm hover:bg-slate-50">
              <Eye className="w-4 h-4" /> Manage Site Settings
            </Link>
          </div>
        </div>
        <div className="bg-white rounded-sm border border-slate-100 p-5">
          <h3 className="text-sm font-semibold text-[#1a2332] mb-3">Site Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Stripe Connection</span>
              <span className="text-[#0D9488] flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#0D9488]"></span>Connected</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Auth System</span>
              <span className="text-[#0D9488] flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#0D9488]"></span>Active</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">SMTP Email</span>
              <span className="text-amber-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span>Simulated</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
