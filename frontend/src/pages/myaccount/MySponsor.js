import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { memberAPI, publicAPI } from '../../lib/api';
import { DEFAULT_SPONSOR } from '../../lib/defaultImages';
import { User } from 'lucide-react';
import SocialLinksCard from './components/SocialLinksCard';

export default function MySponsor() {
  const [sponsor, setSponsor] = useState(null);
  const [settings, setSettings] = useState({});
  const ctx = useOutletContext() || {};
  // Profile-field visibility is platform-wide (Membership Settings) → the same fields
  // hidden on a member's own profile are hidden on anyone else's card (sponsor/mentor).
  // Comes from the layout via context (resolved before paint) so it never flashes.
  const hiddenFields = ctx.hiddenFields || [];
  const title = ctx.sectionLabel ? ctx.sectionLabel('my-sponsor', 'My Sponsor') : 'My Sponsor';

  useEffect(() => {
    memberAPI.getSponsor().then(r => setSponsor(r.data)).catch(() => {});
    publicAPI.getSettings().then(r => setSettings(r.data)).catch(() => {});
  }, []);

  const defaultAvatar = DEFAULT_SPONSOR;
  const s = sponsor || {};
  const avatar = s.avatar || defaultAvatar;

  const fields = [
    { label: 'Legal Name (as I.D.)', value: `${s.first_name || ''} ${s.last_name || ''}`.trim() },
    { label: 'Name', value: `${s.first_name || ''} ${s.last_name || ''}`.trim() },
    { label: 'Membership Number', value: s.membership_id || '-' },
    { key: 'email', label: 'Email', value: s.email || '-' },
    { key: 'address', label: 'Address', value: s.address || '-' },
    { key: 'country', label: 'Country / State', value: [s.country, s.state].filter(Boolean).join(' / ') || '-' },
    { key: 'zip_code', label: 'ZIP Code', value: s.zip_code || '-' },
    { key: 'phone', label: 'Phone Number', value: s.phone || '-' },
    { key: 'google_account', label: 'Google Account', value: s.google_account || '-' },
    { key: 'date_of_birth', label: 'Date of Birth', value: s.date_of_birth || '-' },
  ].filter(f => !f.key || !hiddenFields.includes(f.key));

  return (
    <div data-testid="my-sponsor-page">
      <div className="mb-4">
        <h1 className="text-[15px] font-semibold" style={{ color: 'var(--ma2-heading, #495057)' }} data-testid="my-sponsor-title">{title}</h1>
      </div>

      {/* Identity band — the sponsor is the person this page is about */}
      <div className="ma2-profile-band" data-testid="sponsor-band">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-6">
          <div className="rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
            style={{ width: 96, height: 96, backgroundColor: 'rgba(255,255,255,0.12)', border: '3px solid rgba(255,255,255,0.20)' }}>
            {avatar
              ? <img src={avatar} alt="" className="w-full h-full object-cover" />
              : <User className="w-9 h-9" style={{ color: 'rgba(255,255,255,0.6)' }} />}
          </div>
          <div className="min-w-0">
            {sponsor ? (
              <>
                <p className="ma2-profile-name truncate">{s.first_name} {s.last_name}</p>
                <p className="ma2-profile-meta mt-0.5">{s.membership_id}</p>
                {s.email && <p className="ma2-profile-meta truncate">{s.email}</p>}
              </>
            ) : (
              <p className="ma2-profile-meta">No sponsor info</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <div className="space-y-4">
          {/* Only the networks the sponsor actually filled in; hidden entirely if none. */}
          <SocialLinksCard links={s.social_links} testId="sponsor-social-card" />
        </div>

        <div className="lg:col-span-2 ma2-card">
          <div className="ma2-card-head">
            <h2 className="ma2-card-title">General Info</h2>
          </div>
          <div className="ma2-card-body">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3.5">
              {fields.map(f => (
                <div key={f.label} className="flex items-start gap-2">
                  <span className="ma2-dt flex-shrink-0" style={{ minWidth: '9.5rem' }}>{f.label} :</span>
                  <span className="ma2-dd">{f.value || '-'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
