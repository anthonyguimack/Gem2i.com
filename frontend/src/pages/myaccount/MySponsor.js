import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { memberAPI, publicAPI } from '../../lib/api';
import { User, Facebook, Twitter, Instagram, Linkedin, Globe } from 'lucide-react';

const socialIcons = { facebook: Facebook, twitter: Twitter, instagram: Instagram, linkedin: Linkedin, website: Globe };

export default function MySponsor() {
  const [sponsor, setSponsor] = useState(null);
  const [settings, setSettings] = useState({});
  const ctx = useOutletContext() || {};
  const title = ctx.sectionLabel ? ctx.sectionLabel('my-sponsor', 'My Sponsor') : 'My Sponsor';

  useEffect(() => {
    memberAPI.getSponsor().then(r => setSponsor(r.data)).catch(() => {});
    publicAPI.getSettings().then(r => setSettings(r.data)).catch(() => {});
  }, []);

  const defaultAvatar = settings.membership_default_avatar || '';
  const s = sponsor || {};

  const fields = [
    { label: 'Legal Name (as I.D.)', value: `${s.first_name || ''} ${s.last_name || ''}`.trim() },
    { label: 'Name', value: `${s.first_name || ''} ${s.last_name || ''}`.trim() },
    { label: 'Membership Number', value: s.membership_id || '-' },
    { label: 'Email', value: s.email || '-' },
    { label: 'Address', value: s.address || '-' },
    { label: 'Country / State', value: [s.country, s.state].filter(Boolean).join(' / ') || '-' },
    { label: 'ZIP Code', value: s.zip_code || '-' },
    { label: 'Phone Number', value: s.phone || '-' },
    { label: 'Google Account', value: s.google_account || '-' },
    { label: 'Date of Birth', value: s.date_of_birth || '-' },
  ];

  return (
    <div data-testid="my-sponsor-page">
      <h1 className="text-2xl font-bold text-white mb-6" style={{ fontFamily: "'DM Serif Display', serif" }} data-testid="my-sponsor-title">{title}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Avatar + Social */}
        <div className="bg-[#13161e] border border-white/5 rounded-lg p-6 flex flex-col items-center">
          <h3 className="text-sm font-semibold text-gray-400 mb-4">My Sponsor</h3>
          <div className="w-32 h-32 rounded-full bg-[#c9a84c]/10 border-2 border-[#c9a84c]/30 flex items-center justify-center overflow-hidden">
            {(s.avatar || defaultAvatar) ?
              <img src={s.avatar || defaultAvatar} alt="" className="w-full h-full object-cover" /> :
              <User className="w-12 h-12 text-[#c9a84c]/50" />}
          </div>
          {sponsor ? (
            <>
              <p className="mt-3 text-white font-medium">{s.first_name} {s.last_name}</p>
              <p className="text-[#c9a84c] text-xs">{s.membership_id}</p>
              {s.social_links?.length > 0 && (
                <div className="flex gap-3 mt-4">
                  {s.social_links.map((link, i) => {
                    const Icon = socialIcons[link.platform?.toLowerCase()] || Globe;
                    return link.url ? <a key={i} href={link.url} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-[#c9a84c]"><Icon className="w-4 h-4" /></a> : null;
                  })}
                </div>
              )}
            </>
          ) : <p className="mt-3 text-gray-500 text-sm">No sponsor info</p>}
        </div>

        {/* Right — Details */}
        <div className="lg:col-span-2 bg-[#13161e] border border-white/5 rounded-lg">
          <div className="border-b border-white/5 p-4">
            <button className="text-sm font-medium text-[#c9a84c] border-b-2 border-[#c9a84c] pb-2 px-1">General Info</button>
          </div>
          <div className="p-5 space-y-4">
            {fields.map(f => (
              <div key={f.label} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                <span className="text-xs text-gray-500 w-40 flex-shrink-0">{f.label}</span>
                <span className="text-sm text-white">{f.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
