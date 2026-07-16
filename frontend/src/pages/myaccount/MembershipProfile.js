import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useMember } from '../../lib/memberAuth';
import { memberAPI, publicAPI, geoAPI } from '../../lib/api';
import { toast } from 'sonner';
import { User, Save, Loader2, Edit3, Lock, Eye, ListChecks, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import RichTextEditor from '../../components/RichTextEditor';
import MemberImageUpload from '../../components/MemberImageUpload';

const quillDark = "[&_.ql-toolbar]:!bg-[#0d0f14] [&_.ql-toolbar]:!border-white/10 [&_.ql-container]:!border-white/10 [&_.ql-container]:!bg-[#0d0f14] [&_.ql-editor]:!text-white [&_.ql-editor]:!min-h-[150px] [&_.ql-snow_.ql-stroke]:!stroke-gray-400 [&_.ql-snow_.ql-fill]:!fill-gray-400 [&_.ql-snow_.ql-picker-label]:!text-gray-400 [&_.ql-snow_.ql-picker-options]:!bg-[#13161e]";

const fmtDate = (d) => {
  if (!d) return '-';
  const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[2]}/${m[3]}/${m[1]}`;
  return d;
};

const PROFILE_FIELD_LABELS = {
  first_name: 'First Name', last_name: 'Last Name', email: 'Email', phone: 'Phone',
  gender: 'Gender', date_of_birth: 'Date of Birth', address: 'Address',
  country: 'Country', state: 'State', city: 'City', zip_code: 'ZIP Code',
  passport_id: 'ID# (Passport or DNI or etc.)', google_account: 'Google Account', avatar: 'Avatar',
  summary: 'Summary (Bio)', biography: 'Biography',
};

const COMPLETION_FIELD_LABELS = {
  ...PROFILE_FIELD_LABELS,
  'ebank.investment_amount': 'Investment Amount', 'ebank.additional_capital': 'Additional Capital',
  'ebank.investment_goal': 'Investment Goal', 'ebank.monthly_savings': 'Monthly Savings',
  'ebank.deposit_date': 'Deposit Date', 'ebank.target_date': 'Target Date',
  'ebank.credit_limit': 'Credit Limit', 'ebank.credit_debt': 'Credit Debt',
  'ebank.risk_level': 'Risk Level', 'ebank.finance_involvement': 'Finance Involvement',
  'ebank.investment_safety': 'Investment Safety', 'ebank.financial_independence_age': 'Financial Independence Age',
  'ebank.rate_of_return': 'Rate of Return', 'ebank.investment_duration': 'Investment Duration',
  'ebank.own_business': 'Own Business', 'ebank.projects': 'Projects',
};

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
}

// Dark dialog class: makes the close button (X) visible on dark backgrounds
const darkDialogCls = "[&>button]:text-white";

export default function MembershipProfile() {
  const { member, refresh } = useMember();
  const [tab, setTab] = useState('general');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({});
  const [bioOpen, setBioOpen] = useState(false);
  const [bioForm, setBioForm] = useState({ summary: '', biography: '' });
  const [profileActivities, setProfileActivities] = useState([]);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  // New modals
  const [pwOpen, setPwOpen] = useState(false);
  const [pwForm, setPwForm] = useState({ new_password: '', confirm_password: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [viewBioOpen, setViewBioOpen] = useState(false);
  const [stepsOpen, setStepsOpen] = useState(false);
  // Membership settings (mandatory fields)
  const [mandatoryFields, setMandatoryFields] = useState([]);
  const [ebankData, setEbankData] = useState({});
  const ctx = useOutletContext() || {};
  const title = ctx.sectionLabel ? ctx.sectionLabel('membership-profile', 'Membership Profile') : 'Membership Profile';

  const fetchActivities = () => {
    memberAPI.getProfileActivities().then(r => setProfileActivities(r.data || [])).catch(() => {});
  };

  useEffect(() => {
    publicAPI.getSettings().then(r => setSettings(r.data)).catch(() => {});
    geoAPI.getCountries().then(r => setCountries(r.data)).catch(() => {});
    memberAPI.getMembershipSettings().then(r => setMandatoryFields(r.data?.mandatory_fields || [])).catch(() => {});
    memberAPI.getEbank().then(r => setEbankData(r.data || {})).catch(() => {});
    fetchActivities();
  }, []);

  useEffect(() => {
    if (member) {
      setForm({
        first_name: member.first_name || '', last_name: member.last_name || '',
        email: member.email || '', phone: member.phone || '', gender: member.gender || '',
        date_of_birth: member.date_of_birth || '',
        address: member.address || '', country: member.country || '',
        state: member.state || '', city: member.city || '', zip_code: member.zip_code || '',
        google_account: member.google_account || '', avatar: member.avatar || '',
        passport_id: member.passport_id || '',
      });
      setBioForm({ summary: member.summary || '', biography: member.biography || '' });
    }
  }, [member]);

  useEffect(() => {
    if (form.country) {
      const c = countries.find(c => c.name === form.country);
      if (c) geoAPI.getStates(c.id).then(r => setStates(r.data)).catch(() => {});
      else setStates([]);
    } else { setStates([]); }
  }, [form.country, countries]);

  useEffect(() => {
    if (form.state) {
      const s = states.find(s => s.name === form.state);
      if (s) geoAPI.getCities(s.id).then(r => setCities(r.data)).catch(() => {});
      else setCities([]);
    } else { setCities([]); }
  }, [form.state, states]);

  // --- Profile completion ---
  const { percentage, missingMandatory, missingOptional } = useMemo(() => {
    if (!member || mandatoryFields.length === 0) return { percentage: 0, missingMandatory: [], missingOptional: [] };

    const profileFields = mandatoryFields.filter(f => !f.startsWith('ebank.'));
    const ebankFields = mandatoryFields.filter(f => f.startsWith('ebank.'));

    let filled = 0;
    const missing = [];

    profileFields.forEach(key => {
      const val = member[key];
      if (val && stripHtml(String(val))) filled++;
      else missing.push(key);
    });

    ebankFields.forEach(key => {
      const ebankKey = key.replace('ebank.', '');
      const val = ebankData[ebankKey];
      if (val && String(val).trim()) filled++;
      else missing.push(key);
    });

    const pct = Math.round((filled / mandatoryFields.length) * 100);

    const allProfileKeys = ['first_name', 'last_name', 'email', 'phone', 'gender', 'date_of_birth', 'address', 'country', 'state', 'city', 'zip_code', 'passport_id', 'google_account', 'avatar', 'summary', 'biography'];
    const allEbankKeys = ['ebank.investment_amount', 'ebank.additional_capital', 'ebank.investment_goal', 'ebank.monthly_savings', 'ebank.deposit_date', 'ebank.target_date', 'ebank.credit_limit', 'ebank.credit_debt', 'ebank.risk_level', 'ebank.finance_involvement', 'ebank.investment_safety', 'ebank.financial_independence_age', 'ebank.rate_of_return', 'ebank.investment_duration', 'ebank.own_business', 'ebank.projects'];
    const allKeys = [...allProfileKeys, ...allEbankKeys];
    const optionalKeys = allKeys.filter(k => !mandatoryFields.includes(k));

    const missingOpt = [];
    optionalKeys.forEach(key => {
      if (key.startsWith('ebank.')) {
        const ek = key.replace('ebank.', '');
        if (!ebankData[ek] || !String(ebankData[ek]).trim()) missingOpt.push(key);
      } else {
        const val = member[key];
        if (!val || !stripHtml(String(val))) missingOpt.push(key);
      }
    });

    return { percentage: pct, missingMandatory: missing, missingOptional: missingOpt };
  }, [member, mandatoryFields, ebankData]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await memberAPI.updateProfile(form);
      toast.success('Profile updated!');
      setEditing(false);
      refresh();
      fetchActivities();
    } catch (e) { toast.error(e.response?.data?.detail || 'Error saving'); }
    finally { setLoading(false); }
  };

  const handleBioSave = async () => {
    setLoading(true);
    try {
      await memberAPI.updateBiography(bioForm);
      toast.success('Biography updated!');
      setBioOpen(false);
      refresh();
      fetchActivities();
    } catch { toast.error('Error saving'); }
    finally { setLoading(false); }
  };

  const handleChangePassword = async () => {
    if (pwForm.new_password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (pwForm.new_password !== pwForm.confirm_password) { toast.error('Passwords do not match'); return; }
    setPwLoading(true);
    try {
      await memberAPI.changePassword(pwForm);
      toast.success('Password changed successfully!');
      setPwOpen(false);
      setPwForm({ new_password: '', confirm_password: '' });
    } catch (e) { toast.error(e.response?.data?.detail || 'Error changing password'); }
    finally { setPwLoading(false); }
  };

  const platformSocials = (settings.social_links || []).map(s => s.platform || s.icon);
  const memberSocials = form.social_links || member?.social_links || [];
  const updateSocial = (platform, url) => {
    const links = [...memberSocials];
    const idx = links.findIndex(l => l.platform === platform);
    if (idx >= 0) links[idx] = { ...links[idx], url };
    else links.push({ platform, url });
    setForm(prev => ({ ...prev, social_links: links }));
  };
  const getSocialUrl = (platform) => memberSocials.find(l => l.platform === platform)?.url || '';
  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const defaultAvatar = settings.membership_default_avatar || '';
  const tabs = [
    { id: 'general', label: 'General Info' },
    { id: 'social', label: 'Social Links' },
    { id: 'activities', label: 'Activities' },
  ];

  // iOS-compatible native select style: font-size 16px prevents iOS zoom
  const selectCls = "w-full mt-1 px-3 py-2 bg-[#0d0f14] border border-white/10 text-white rounded-md text-base focus:outline-none";

  const progressColor = percentage >= 80
    ? (getComputedStyle(document.documentElement).getPropertyValue('--ma-progress-high')?.trim() || '#22c55e')
    : percentage >= 50
    ? (getComputedStyle(document.documentElement).getPropertyValue('--ma-progress-mid')?.trim() || '#c9a84c')
    : (getComputedStyle(document.documentElement).getPropertyValue('--ma-progress-low')?.trim() || '#ef4444');

  return (
    <div data-testid="membership-profile-page">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'DM Serif Display', serif" }} data-testid="membership-profile-title">{title}</h1>
        <button onClick={() => setBioOpen(true)}
          className="px-4 py-2 border rounded text-sm font-medium flex items-center gap-2 transition-colors"
          style={{ backgroundColor: 'var(--ma-accent, #c9a84c)', color: 'var(--ma-button-text, #0d0f14)', opacity: 0.9, borderColor: 'var(--ma-accent, #c9a84c)' }}
          data-testid="update-biography-btn">
          <Edit3 className="w-4 h-4" /> Update Biography
        </button>
      </div>

      {/* Progress Bar & Action Buttons */}
      {mandatoryFields.length > 0 && (
        <div className="mb-6 bg-[#13161e] border border-white/5 rounded-lg p-5" data-testid="profile-completion-section">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">Profile Completion</h2>
            <span className="text-sm font-bold" style={{ color: progressColor }} data-testid="profile-completion-pct">{percentage}%</span>
          </div>
          <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden mb-4">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%`, backgroundColor: progressColor }} data-testid="profile-progress-bar" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setPwOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded text-xs text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
              data-testid="change-password-btn">
              <Lock className="w-3.5 h-3.5" /> Change your password
            </button>
            <button onClick={() => setViewBioOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded text-xs text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
              data-testid="view-bio-btn">
              <Eye className="w-3.5 h-3.5" /> View full bio
            </button>
            <button onClick={() => setStepsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded text-xs text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
              data-testid="steps-to-complete-btn">
              <ListChecks className="w-3.5 h-3.5" /> Steps to complete my profile
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-[#13161e] border border-white/5 rounded-lg p-6 flex flex-col items-center">
          <div className="w-28 h-28 rounded-full flex items-center justify-center overflow-hidden" style={{ backgroundColor: 'var(--ma-avatar-bg, rgba(201,168,76,0.1))', border: '2px solid var(--ma-avatar-border, rgba(201,168,76,0.3))' }}>
            {(form.avatar || defaultAvatar) ?
              <img src={(form.avatar || defaultAvatar).startsWith('/api') ? `${process.env.REACT_APP_BACKEND_URL}${form.avatar || defaultAvatar}` : (form.avatar || defaultAvatar)} alt="" className="w-full h-full object-cover" /> :
              <User className="w-10 h-10" style={{ color: 'var(--ma-accent, #c9a84c)', opacity: 0.5 }} />}
          </div>
          <p className="mt-3 text-white font-medium text-sm">{member?.first_name} {member?.last_name}</p>
          <p className="text-xs" style={{ color: 'var(--ma-accent, #c9a84c)' }}>{member?.membership_id}</p>
          <p className="text-gray-500 text-xs mt-1">{member?.email}</p>
          {member?._member_type?.permissions?.is_mentor && <span className="mt-2 text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--ma-accent, #c9a84c)', color: 'var(--ma-button-text, #0d0f14)', opacity: 0.8 }}>Mentor</span>}
        </div>

        <div className="lg:col-span-2 bg-[#13161e] border border-white/5 rounded-lg">
          <div className="border-b border-white/5 p-4">
            <div className="flex gap-4">
              {tabs.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`text-sm font-medium pb-2 px-1 transition-colors ${tab === t.id ? 'border-b-2' : 'text-gray-500 hover:text-gray-300'}`}
                  style={tab === t.id ? { color: 'var(--ma-accent, #c9a84c)', borderColor: 'var(--ma-accent, #c9a84c)' } : {}}
                  data-testid={`profile-tab-${t.id}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="p-5">
            {tab === 'general' && (
              <div>
                <div className="flex justify-end mb-4">
                  {!editing ? (
                    <button onClick={() => setEditing(true)} className="text-sm hover:underline flex items-center gap-1" style={{ color: 'var(--ma-accent, #c9a84c)' }} data-testid="edit-profile-btn">
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => setEditing(false)} className="text-sm text-gray-500 hover:text-gray-300 px-3 py-1">Cancel</button>
                      <button onClick={handleSave} disabled={loading} className="text-sm px-4 py-1.5 rounded font-medium flex items-center gap-1 disabled:opacity-50" style={{ backgroundColor: 'var(--ma-button-bg, #c9a84c)', color: 'var(--ma-button-text, #0d0f14)' }} data-testid="save-profile-btn">
                        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
                      </button>
                    </div>
                  )}
                </div>
                {editing ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-xs text-gray-400">First Name</Label><Input value={form.first_name} onChange={set('first_name')} className="mt-1 bg-[#0d0f14] border-white/10 text-white" /></div>
                      <div><Label className="text-xs text-gray-400">Last Name</Label><Input value={form.last_name} onChange={set('last_name')} className="mt-1 bg-[#0d0f14] border-white/10 text-white" /></div>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-400">Email</Label>
                      <Input value={form.email} onChange={set('email')} className="mt-1 bg-[#0d0f14] border-white/10 text-white" data-testid="profile-email-input" />
                      <p className="text-[10px] text-gray-500 mt-1">Changing your email will also update your login username.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-xs text-gray-400">Phone</Label><Input value={form.phone} onChange={set('phone')} className="mt-1 bg-[#0d0f14] border-white/10 text-white" /></div>
                      <div><Label className="text-xs text-gray-400">Gender</Label>
                        <select value={form.gender} onChange={set('gender')} className={selectCls} style={{ colorScheme: 'dark' }}>
                          <option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option>
                        </select>
                      </div>
                    </div>
                    <div><Label className="text-xs text-gray-400">Date of Birth</Label><Input type="date" value={form.date_of_birth} onChange={set('date_of_birth')} className="mt-1 bg-[#0d0f14] border-white/10 text-white" style={{ colorScheme: 'dark' }} /></div>
                    <div><Label className="text-xs text-gray-400">Address</Label><Input value={form.address} onChange={set('address')} className="mt-1 bg-[#0d0f14] border-white/10 text-white" /></div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs text-gray-400">Country</Label>
                        <select value={form.country} onChange={e => setForm(p => ({...p, country: e.target.value, state: '', city: ''}))} className={selectCls} style={{ colorScheme: 'dark' }} data-testid="profile-country-select">
                          <option value="">Select</option>
                          {countries.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-400">State</Label>
                        <select value={form.state} onChange={e => setForm(p => ({...p, state: e.target.value, city: ''}))} className={selectCls} style={{ colorScheme: 'dark' }} disabled={!form.country} data-testid="profile-state-select">
                          <option value="">Select</option>
                          {states.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-400">City</Label>
                        <select value={form.city} onChange={set('city')} className={selectCls} style={{ colorScheme: 'dark' }} disabled={!form.state} data-testid="profile-city-select">
                          <option value="">Select</option>
                          {cities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div><Label className="text-xs text-gray-400">ZIP Code</Label><Input value={form.zip_code} onChange={set('zip_code')} className="mt-1 bg-[#0d0f14] border-white/10 text-white" /></div>
                    <div><Label className="text-xs text-gray-400">ID# (Passport or DNI or etc.)</Label><Input value={form.passport_id || ''} onChange={set('passport_id')} className="mt-1 bg-[#0d0f14] border-white/10 text-white" data-testid="profile-passport-input" /></div>
                    <div>
                      <Label className="text-xs text-gray-400">Avatar</Label>
                      <div className="mt-1">
                        <MemberImageUpload value={form.avatar} onChange={v => setForm(p => ({...p, avatar: v}))} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[
                      { label: 'Name', value: `${member?.first_name || ''} ${member?.last_name || ''}`.trim() },
                      { label: 'Membership Number', value: member?.membership_id || '-' },
                      { label: 'Email', value: member?.email || '-' },
                      { label: 'Phone', value: member?.phone || '-' },
                      { label: 'Gender', value: member?.gender || '-' },
                      { label: 'Date of Birth', value: fmtDate(member?.date_of_birth) },
                      { label: 'Address', value: member?.address || '-' },
                      { label: 'Country', value: member?.country || '-' },
                      { label: 'State', value: member?.state || '-' },
                      { label: 'City', value: member?.city || '-' },
                      { label: 'ZIP Code', value: member?.zip_code || '-' },
                      { label: 'ID# (Passport or DNI or etc.)', value: member?.passport_id || '-' },
                      { label: 'Google Account', value: member?.google_account || '-' },
                    ].map(f => (
                      <div key={f.label} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                        <span className="text-xs text-gray-500 w-48 flex-shrink-0">{f.label}</span>
                        <span className="text-sm text-white">{f.value || '-'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'social' && (
              <div className="space-y-4">
                <p className="text-xs text-gray-500 mb-4">Enter your social network profiles.</p>
                {platformSocials.length > 0 ? platformSocials.map(platform => (
                  <div key={platform} className="flex items-center gap-3">
                    <span className="text-sm text-gray-400 w-28 capitalize flex-shrink-0">{platform}</span>
                    <Input value={getSocialUrl(platform)} onChange={e => updateSocial(platform, e.target.value)}
                      placeholder={`Enter your ${platform} URL`}
                      className="bg-[#0d0f14] border-white/10 text-white flex-1"
                      data-testid={`social-${platform}`} />
                  </div>
                )) : <p className="text-sm text-gray-500">No social platforms configured by the administrator.</p>}
                {platformSocials.length > 0 && (
                  <button onClick={handleSave} disabled={loading}
                    className="mt-4 px-4 py-2 rounded text-sm font-medium flex items-center gap-1 disabled:opacity-50"
                    style={{ backgroundColor: 'var(--ma-button-bg, #c9a84c)', color: 'var(--ma-button-text, #0d0f14)' }}
                    data-testid="save-socials-btn">
                    {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save Social Links
                  </button>
                )}
              </div>
            )}

            {tab === 'activities' && (
              <div className="space-y-2" data-testid="profile-activities">
                {profileActivities.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 text-sm">No activities yet. Start by updating your profile information.</div>
                ) : profileActivities.map(act => (
                  <div key={act.id} className="bg-[#0d0f14] rounded-lg p-3 border border-white/5 flex items-start gap-3">
                    <div className="mt-0.5">
                      <Clock className="w-4 h-4" style={{ color: 'var(--ma-accent, #c9a84c)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">
                        <span className={`font-medium ${act.action === 'added' ? 'text-green-400' : ''}`} style={act.action !== 'added' ? { color: 'var(--ma-accent, #c9a84c)' } : {}}>{act.action === 'added' ? 'Added' : 'Updated'}</span>
                        {' '}<span style={{ color: 'var(--ma-accent, #c9a84c)' }}>{PROFILE_FIELD_LABELS[act.field] || act.field}</span>
                      </p>
                      {act.action === 'updated' && act.old_value && (
                        <p className="text-xs text-gray-500 mt-0.5 break-words">"{act.old_value}" &rarr; "{act.new_value}"</p>
                      )}
                      {act.action === 'added' && act.new_value && (
                        <p className="text-xs text-gray-500 mt-0.5 break-words">Set to: "{act.new_value}"</p>
                      )}
                      <p className="text-xs text-gray-600 mt-1">{new Date(act.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Update Biography Modal */}
      <Dialog open={bioOpen} onOpenChange={setBioOpen}>
        <DialogContent className={`sm:max-w-[700px] max-h-[85vh] overflow-y-auto bg-[#13161e] border-white/10 ${darkDialogCls}`} data-testid="biography-modal">
          <DialogHeader>
            <DialogTitle className="text-white" style={{ fontFamily: "'DM Serif Display', serif" }}>Update Biography</DialogTitle>
            <DialogDescription className="text-gray-500">Edit your summary and biography below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-gray-400 mb-2 block">Summary</Label>
              <div className={quillDark}>
                <RichTextEditor value={bioForm.summary} onChange={v => setBioForm(p => ({...p, summary: v}))} placeholder="Write your summary..." />
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-400 mb-2 block">Biography</Label>
              <div className={quillDark}>
                <RichTextEditor value={bioForm.biography} onChange={v => setBioForm(p => ({...p, biography: v}))} placeholder="Write your biography..." />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setBioOpen(false)} className="flex-1 py-2 border border-white/10 text-gray-400 rounded text-sm hover:bg-white/5">Cancel</button>
              <button onClick={handleBioSave} disabled={loading}
                className="flex-1 py-2 rounded text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: 'var(--ma-button-bg, #c9a84c)', color: 'var(--ma-button-text, #0d0f14)' }}
                data-testid="save-biography-btn">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password Modal */}
      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent className={`sm:max-w-[420px] bg-[#13161e] border-white/10 ${darkDialogCls}`} data-testid="change-password-modal">
          <DialogHeader>
            <DialogTitle className="text-white" style={{ fontFamily: "'DM Serif Display', serif" }}>Change Password</DialogTitle>
            <DialogDescription className="text-gray-500">Enter your new password below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-gray-400 mb-1 block">New Password</Label>
              <Input type="password" value={pwForm.new_password}
                onChange={e => setPwForm(p => ({ ...p, new_password: e.target.value }))}
                placeholder="Min. 8 characters"
                className="bg-[#0d0f14] border-white/10 text-white"
                data-testid="new-password-input" />
            </div>
            <div>
              <Label className="text-xs text-gray-400 mb-1 block">Confirm Password</Label>
              <Input type="password" value={pwForm.confirm_password}
                onChange={e => setPwForm(p => ({ ...p, confirm_password: e.target.value }))}
                placeholder="Re-enter password"
                className="bg-[#0d0f14] border-white/10 text-white"
                data-testid="confirm-password-input" />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setPwOpen(false)} className="flex-1 py-2 border border-white/10 text-gray-400 rounded text-sm hover:bg-white/5">Cancel</button>
              <button onClick={handleChangePassword} disabled={pwLoading}
                className="flex-1 py-2 rounded text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: 'var(--ma-button-bg, #c9a84c)', color: 'var(--ma-button-text, #0d0f14)' }}
                data-testid="submit-change-password-btn">
                {pwLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />} Change Password
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Full Bio Modal — vertical layout, proper rich text rendering */}
      <Dialog open={viewBioOpen} onOpenChange={setViewBioOpen}>
        <DialogContent className={`sm:max-w-[650px] max-h-[85vh] overflow-y-auto overflow-x-hidden bg-[#13161e] border-white/10 ${darkDialogCls}`} data-testid="view-bio-modal">
          <DialogHeader>
            <DialogTitle className="text-white" style={{ fontFamily: "'DM Serif Display', serif" }}>Full Biography</DialogTitle>
            <DialogDescription className="text-gray-500">Your summary and biography content.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--ma-accent, #c9a84c)' }}>Summary</h3>
              {member?.summary && stripHtml(member.summary) ? (
                <div
                  className="text-gray-300 break-words bio-rich-content"
                  dangerouslySetInnerHTML={{ __html: member.summary }}
                />
              ) : (
                <p className="text-sm text-gray-500 italic">No summary written yet.</p>
              )}
            </div>
            <hr className="border-white/10" />
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--ma-accent, #c9a84c)' }}>Biography</h3>
              {member?.biography && stripHtml(member.biography) ? (
                <div
                  className="text-gray-300 break-words bio-rich-content"
                  dangerouslySetInnerHTML={{ __html: member.biography }}
                />
              ) : (
                <p className="text-sm text-gray-500 italic">No biography written yet.</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Steps to Complete Profile Modal */}
      <Dialog open={stepsOpen} onOpenChange={setStepsOpen}>
        <DialogContent className={`sm:max-w-[500px] max-h-[85vh] overflow-y-auto bg-[#13161e] border-white/10 ${darkDialogCls}`} data-testid="steps-modal">
          <DialogHeader>
            <DialogTitle className="text-white" style={{ fontFamily: "'DM Serif Display', serif" }}>Steps to Complete Your Profile</DialogTitle>
            <DialogDescription className="text-gray-500">Fields you still need to fill in.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            {missingMandatory.length > 0 ? (
              <div>
                <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> Required Fields ({missingMandatory.length})
                </h3>
                <div className="space-y-1.5">
                  {missingMandatory.map(key => (
                    <div key={key} className="flex items-center gap-2 p-2 bg-red-500/5 border border-red-500/10 rounded text-sm" data-testid={`missing-mandatory-${key}`}>
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                      <span className="text-gray-300">{COMPLETION_FIELD_LABELS[key] || key}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-300">All mandatory fields are complete!</span>
              </div>
            )}

            {missingOptional.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  Optional Fields ({missingOptional.length})
                </h3>
                <div className="space-y-1.5">
                  {missingOptional.map(key => (
                    <div key={key} className="flex items-center gap-2 p-2 bg-white/5 border border-white/5 rounded text-sm" data-testid={`missing-optional-${key}`}>
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-500 flex-shrink-0" />
                      <span className="text-gray-400">{COMPLETION_FIELD_LABELS[key] || key}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {missingMandatory.length === 0 && missingOptional.length === 0 && (
              <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-300">Your profile is 100% complete!</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
