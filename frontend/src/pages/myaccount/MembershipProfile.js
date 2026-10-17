import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useMember } from '../../lib/memberAuth';
import { memberAPI, publicAPI, geoAPI } from '../../lib/api';
import { DEFAULT_AVATAR } from '../../lib/defaultImages';
import { toast } from 'sonner';
import { User, Save, Loader2, Edit3, Lock, Eye, ListChecks, CheckCircle2, AlertCircle, Plus, RefreshCw, FileText, Upload, Trash2, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import RichTextEditor from '../../components/RichTextEditor';
import MemberImageUpload from '../../components/MemberImageUpload';
import SocialLinksCard from './components/SocialLinksCard';

// Semantic colour tokens. ⚠ No colour literal belongs in a page: these resolve
// to the CMS group (`theme_colors.my_account_2*`) and flip with light/dark.
const T = {
  success: 'var(--ma2-success)', warning: 'var(--ma2-warning)',
  danger: 'var(--ma2-danger)', info: 'var(--ma2-info)', muted: 'var(--ma2-muted)',
};


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
  summary: 'Summary (Bio)', biography: 'Biography', cv_file: 'Curriculum Vitae (PDF)',
};

const CV_MAX_MB = 10;

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

const fmtActivityDate = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const yest = new Date(today); yest.setDate(today.getDate() - 1);
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return `Today, ${time}`;
  if (d.toDateString() === yest.toDateString()) return `Yesterday, ${time}`;
  return d.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
};

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
  // Membership settings: mandatory fields (drive the completion ring) are still
  // fetched here; hidden fields come from the layout via context — resolved BEFORE
  // this page paints, so hideable fields (passport_id, google_account…) never flash.
  const [mandatoryFields, setMandatoryFields] = useState([]);
  const [ebankData, setEbankData] = useState({});
  const ctx = useOutletContext() || {};
  const hiddenFields = ctx.hiddenFields || [];
  const isHidden = (k) => hiddenFields.includes(k);
  // s150: the CV exists only for members whose LEVEL opens the LMS (mentorship),
  // and only while CMS → Membership Settings keeps it visible. It counts toward
  // the completion % when that page marks it mandatory — for those members only.
  const showCv = !!member?._lms_access && !isHidden('cv_file');
  const effectiveMandatory = useMemo(
    () => (showCv ? mandatoryFields : mandatoryFields.filter(f => f !== 'cv_file')),
    [mandatoryFields, showCv]);
  const cvInputRef = useRef(null);
  const [cvBusy, setCvBusy] = useState(false);
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
    if (!member || effectiveMandatory.length === 0) return { percentage: 0, missingMandatory: [], missingOptional: [] };

    const profileFields = effectiveMandatory.filter(f => !f.startsWith('ebank.'));
    const ebankFields = effectiveMandatory.filter(f => f.startsWith('ebank.'));

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

    const pct = Math.round((filled / effectiveMandatory.length) * 100);

    const allProfileKeys = ['first_name', 'last_name', 'email', 'phone', 'gender', 'date_of_birth', 'address', 'country', 'state', 'city', 'zip_code', 'passport_id', 'google_account', 'avatar', 'summary', 'biography'];
    const allEbankKeys = ['ebank.investment_amount', 'ebank.additional_capital', 'ebank.investment_goal', 'ebank.monthly_savings', 'ebank.deposit_date', 'ebank.target_date', 'ebank.credit_limit', 'ebank.credit_debt', 'ebank.risk_level', 'ebank.finance_involvement', 'ebank.investment_safety', 'ebank.financial_independence_age', 'ebank.rate_of_return', 'ebank.investment_duration', 'ebank.own_business', 'ebank.projects'];
    const allKeys = [...allProfileKeys, ...(showCv ? ['cv_file'] : []), ...allEbankKeys];
    const optionalKeys = allKeys.filter(k => !effectiveMandatory.includes(k));

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
  }, [member, effectiveMandatory, ebankData, showCv]);

  // Anillo del avatar: arranca en 0 y se anima hasta `percentage` al cargar
  // (o cuando los datos llegan async). Honra prefers-reduced-motion.
  const ringReduced = typeof window !== 'undefined' && window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [ringPct, setRingPct] = useState(0);
  useEffect(() => {
    if (ringReduced) { setRingPct(percentage); return; }
    // pinta primero el estado 0 y en el siguiente frame transiciona al valor
    const t = setTimeout(() => setRingPct(percentage), 150);
    return () => clearTimeout(t);
  }, [percentage, ringReduced]);

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

  const handleCvPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/\.pdf$/i.test(file.name) || (file.type && file.type !== 'application/pdf')) {
      toast.error('Only PDF files are allowed'); return;
    }
    if (file.size > CV_MAX_MB * 1024 * 1024) { toast.error(`File too large (max ${CV_MAX_MB}MB)`); return; }
    setCvBusy(true);
    try {
      await memberAPI.uploadCv(file);
      toast.success('CV uploaded!');
      refresh();
      fetchActivities();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error uploading CV'); }
    finally { setCvBusy(false); }
  };

  const handleCvDelete = async () => {
    if (!window.confirm('Remove your CV?')) return;
    setCvBusy(true);
    try {
      await memberAPI.deleteCv();
      toast.success('CV removed');
      refresh();
    } catch { toast.error('Error removing CV'); }
    finally { setCvBusy(false); }
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
  // ⚠ Array.isArray, not `|| []`: legacy/imported member docs may store
  // `social_links` as an OBJECT, which `|| []` would let through and then crash
  // the spread/find/filter below (and SocialLinksCard). Coerce to a real array.
  const memberSocials = Array.isArray(form.social_links) ? form.social_links
    : (Array.isArray(member?.social_links) ? member.social_links : []);
  const updateSocial = (platform, url) => {
    const links = [...memberSocials];
    const idx = links.findIndex(l => l.platform === platform);
    if (idx >= 0) links[idx] = { ...links[idx], url };
    else links.push({ platform, url });
    setForm(prev => ({ ...prev, social_links: links }));
  };
  const getSocialUrl = (platform) => memberSocials.find(l => l.platform === platform)?.url || '';
  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const defaultAvatar = settings.membership_default_avatar || DEFAULT_AVATAR;
  const tabs = [
    { id: 'general', label: 'General Info' },
    { id: 'social', label: 'Social Links' },
    { id: 'activities', label: 'Activities' },
  ];

  const progressColor = percentage >= 80 ? T.success : percentage >= 50 ? T.warning : T.danger;
  // El badge y el tirador viajan con el extremo del relleno; se acotan para que
  // en 0% / 100% no se salgan de la caja de la barra.
  const markerLeft = Math.min(Math.max(percentage, 5), 95);

  const avatarSrc = form.avatar || defaultAvatar;
  const avatarUrl = avatarSrc
    ? (avatarSrc.startsWith('/api') ? `${process.env.REACT_APP_BACKEND_URL}${avatarSrc}` : avatarSrc)
    : '';

  const infoRows = [
    { key: 'name', label: 'Name', value: `${member?.first_name || ''} ${member?.last_name || ''}`.trim() },
    { key: 'membership_id', label: 'Membership Number', value: member?.membership_id || '-' },
    { key: 'email', label: 'Email', value: member?.email || '-' },
    { key: 'phone', label: 'Phone', value: member?.phone || '-' },
    { key: 'gender', label: 'Gender', value: member?.gender || '-' },
    { key: 'date_of_birth', label: 'Date of Birth', value: fmtDate(member?.date_of_birth) },
    { key: 'address', label: 'Address', value: member?.address || '-' },
    { key: 'country', label: 'Country', value: member?.country || '-' },
    { key: 'state', label: 'State', value: member?.state || '-' },
    { key: 'city', label: 'City', value: member?.city || '-' },
    { key: 'zip_code', label: 'ZIP Code', value: member?.zip_code || '-' },
    { key: 'passport_id', label: 'ID# (Passport or DNI or etc.)', value: member?.passport_id || '-' },
    { key: 'google_account', label: 'Google Account', value: member?.google_account || '-' },
  ].filter(r => !isHidden(r.key));

  return (
    <div data-testid="membership-profile-page">
      {/* Page title row (Velzon page-title bar) */}
      <div className="mb-4">
        <h1 className="text-[15px] font-semibold" style={{ color: 'var(--ma2-heading, #495057)' }} data-testid="membership-profile-title">{title}</h1>
      </div>

      {/* Profile band — avatar + identity + primary action + tabs */}
      <div className="ma2-profile-band" data-testid="profile-band">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-5">
          {/* Anillo de completado alrededor de la foto: mismo dato que la barra,
              otra lectura. Se llena de 0 al valor al entrar (ringPct). */}
          <div className="relative flex-shrink-0" style={{ width: 110, height: 110 }} data-testid="profile-avatar-ring">
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 160 160" aria-hidden="true">
              <circle cx="80" cy="80" r="74" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="5" />
              {effectiveMandatory.length > 0 && (
                <circle cx="80" cy="80" r="74" fill="none" stroke={progressColor} strokeWidth="5" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 74}
                  strokeDashoffset={(2 * Math.PI * 74) * (1 - Math.min(Math.max(ringPct, 0), 100) / 100)}
                  transform="rotate(-90 80 80)"
                  style={{ transition: ringReduced ? 'none' : 'stroke-dashoffset 1.1s cubic-bezier(0.22, 1, 0.36, 1)' }} />
              )}
            </svg>
            <div className="absolute rounded-full overflow-hidden flex items-center justify-center"
              style={{ inset: 10, backgroundColor: 'rgba(255,255,255,0.12)' }}>
              {avatarUrl
                ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                : <User className="w-10 h-10" style={{ color: 'rgba(255,255,255,0.6)' }} />}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <p className="ma2-profile-name truncate">{member?.first_name} {member?.last_name}</p>
            <p className="ma2-profile-meta mt-0.5">{member?.membership_id}</p>
            <p className="ma2-profile-meta truncate">{member?.email}</p>
            {member?._member_type?.permissions?.is_mentor && (
              <span className="ma2-badge ma2-badge-success mt-2">Mentor</span>
            )}
          </div>

          <button onClick={() => setBioOpen(true)} className="ma2-btn ma2-btn-success self-start sm:self-auto" data-testid="update-biography-btn">
            <Edit3 className="w-4 h-4" /> Update Biography
          </button>
        </div>

        <div className="ma2-tabs" role="tablist" aria-label="Profile sections">
          {tabs.map(t => (
            <button key={t.id} id={`ma2-tab-${t.id}`} role="tab" aria-selected={tab === t.id}
              aria-controls="ma2-tabpanel" onClick={() => setTab(t.id)}
              className="ma2-tab" data-testid={`profile-tab-${t.id}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        {/* Left rail */}
        <div className="space-y-4">
          {effectiveMandatory.length > 0 && (
            <div className="ma2-card" data-testid="profile-completion-section">
              <div className="ma2-card-body">
                <h2 className="ma2-card-title mb-6">Complete Your Profile</h2>
                <div className="ma2-progress" style={{ color: progressColor }}>
                  <div className="ma2-progress-bar" style={{ width: `${percentage}%`, backgroundColor: progressColor }} data-testid="profile-progress-bar" />
                  <span className="ma2-progress-badge" style={{ left: `${markerLeft}%` }} data-testid="profile-completion-pct">{percentage}%</span>
                  <span className="ma2-progress-knob" style={{ left: `${markerLeft}%` }} aria-hidden="true" />
                </div>
              </div>
            </div>
          )}

          <div className="ma2-card">
            <div className="ma2-card-body space-y-2">
              <button onClick={() => setPwOpen(true)} className="ma2-btn ma2-btn-outline w-full !justify-start" data-testid="change-password-btn">
                <Lock className="w-3.5 h-3.5" /> Change your password
              </button>
              <button onClick={() => setViewBioOpen(true)} className="ma2-btn ma2-btn-outline w-full !justify-start" data-testid="view-bio-btn">
                <Eye className="w-3.5 h-3.5" /> View full bio
              </button>
              <button onClick={() => setStepsOpen(true)} className="ma2-btn ma2-btn-outline w-full !justify-start" data-testid="steps-to-complete-btn">
                <ListChecks className="w-3.5 h-3.5" /> Steps to complete my profile
              </button>
            </div>
          </div>

          {/* Curriculum Vitae — mentorship (LMS) members only (s150). */}
          {showCv && (
            <div className="ma2-card" data-testid="profile-cv-card">
              <div className="ma2-card-body">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h2 className="ma2-card-title">Resume to cv</h2>
                  <span className={`ma2-badge ${member?.cv_file ? 'ma2-badge-success' : 'ma2-badge-danger'}`}>
                    {member?.cv_file ? 'Uploaded' : (effectiveMandatory.includes('cv_file') ? 'Required' : 'Missing')}
                  </span>
                </div>
                <p className="text-[12px] mb-4" style={{ color: 'var(--ma2-muted, #878a99)' }}>
                  For the mentorship program. PDF only, max {CV_MAX_MB}MB.
                </p>
                <input ref={cvInputRef} type="file" accept="application/pdf,.pdf" className="hidden"
                  onChange={handleCvPick} data-testid="profile-cv-input" />
                {member?.cv_file ? (
                  <>
                    <a href={`${process.env.REACT_APP_BACKEND_URL || ''}${member.cv_file}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-md mb-3"
                      style={{ border: '1px solid var(--ma2-border, #e9ebec)' }} data-testid="profile-cv-link">
                      <FileText className="w-5 h-5 flex-shrink-0" style={{ color: T.danger }} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-medium truncate" style={{ color: 'var(--ma2-heading, #495057)' }}>{member.cv_file_name || 'cv.pdf'}</span>
                        {member.cv_uploaded_at && (
                          <span className="block text-[11px]" style={{ color: 'var(--ma2-faint, #adb5bd)' }}>Uploaded {fmtActivityDate(member.cv_uploaded_at)}</span>
                        )}
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" style={{ color: T.muted }} />
                    </a>
                    <div className="flex gap-2">
                      <button onClick={() => cvInputRef.current?.click()} disabled={cvBusy} className="ma2-btn ma2-btn-outline ma2-btn-sm flex-1" data-testid="profile-cv-replace">
                        {cvBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} Replace
                      </button>
                      <button onClick={handleCvDelete} disabled={cvBusy} className="ma2-btn ma2-btn-light ma2-btn-sm" aria-label="Remove CV" data-testid="profile-cv-delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                ) : (
                  <button onClick={() => cvInputRef.current?.click()} disabled={cvBusy}
                    className="ma2-btn ma2-btn-primary w-full" data-testid="profile-cv-upload">
                    {cvBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Upload CV (PDF)
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Only the networks the member actually filled in; hidden entirely if none. */}
          <SocialLinksCard links={memberSocials} />
        </div>

        {/* Main column */}
        <div className="lg:col-span-2 ma2-card" id="ma2-tabpanel" role="tabpanel" aria-labelledby={`ma2-tab-${tab}`}>
          {tab === 'general' && (
            <>
              <div className="ma2-card-head flex items-center justify-between">
                <h2 className="ma2-card-title">Personal Details</h2>
                {!editing && (
                  <button onClick={() => setEditing(true)} className="ma2-btn ma2-btn-light ma2-btn-sm" data-testid="edit-profile-btn">
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                )}
              </div>
              <div className="ma2-card-body">
                {editing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="ma2-label" htmlFor="mp-first">First Name</label>
                        <input id="mp-first" className="ma2-input" value={form.first_name} onChange={set('first_name')} />
                      </div>
                      <div>
                        <label className="ma2-label" htmlFor="mp-last">Last Name</label>
                        <input id="mp-last" className="ma2-input" value={form.last_name} onChange={set('last_name')} />
                      </div>
                    </div>
                    <div>
                      <label className="ma2-label" htmlFor="mp-email">Email Address</label>
                      <input id="mp-email" className="ma2-input" value={form.email} onChange={set('email')} data-testid="profile-email-input" />
                      <p className="text-[11px] mt-1.5" style={{ color: 'var(--ma2-muted, #878a99)' }}>Changing your email will also update your login username.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {!isHidden('phone') && (
                      <div>
                        <label className="ma2-label" htmlFor="mp-phone">Phone Number</label>
                        <input id="mp-phone" className="ma2-input" value={form.phone} onChange={set('phone')} />
                      </div>
                      )}
                      {!isHidden('gender') && (
                      <div>
                        <label className="ma2-label" htmlFor="mp-gender">Gender</label>
                        <select id="mp-gender" className="ma2-input" value={form.gender} onChange={set('gender')}>
                          <option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option>
                        </select>
                      </div>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {!isHidden('date_of_birth') && (
                      <div>
                        <label className="ma2-label" htmlFor="mp-dob">Date of Birth</label>
                        <input id="mp-dob" type="date" className="ma2-input" value={form.date_of_birth} onChange={set('date_of_birth')} />
                      </div>
                      )}
                      {!isHidden('passport_id') && (
                      <div>
                        <label className="ma2-label" htmlFor="mp-passport">ID# (Passport or DNI or etc.)</label>
                        <input id="mp-passport" className="ma2-input" value={form.passport_id || ''} onChange={set('passport_id')} data-testid="profile-passport-input" />
                      </div>
                      )}
                    </div>
                    {!isHidden('address') && (
                    <div>
                      <label className="ma2-label" htmlFor="mp-address">Address</label>
                      <input id="mp-address" className="ma2-input" value={form.address} onChange={set('address')} />
                    </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="ma2-label" htmlFor="mp-country">Country</label>
                        <select id="mp-country" className="ma2-input" value={form.country}
                          onChange={e => setForm(p => ({ ...p, country: e.target.value, state: '', city: '' }))}
                          data-testid="profile-country-select">
                          <option value="">Select</option>
                          {countries.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="ma2-label" htmlFor="mp-state">State</label>
                        <select id="mp-state" className="ma2-input" value={form.state} disabled={!form.country}
                          onChange={e => setForm(p => ({ ...p, state: e.target.value, city: '' }))}
                          data-testid="profile-state-select">
                          <option value="">Select</option>
                          {states.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="ma2-label" htmlFor="mp-city">City</label>
                        <select id="mp-city" className="ma2-input" value={form.city} onChange={set('city')} disabled={!form.state} data-testid="profile-city-select">
                          <option value="">Select</option>
                          {cities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {!isHidden('zip_code') && (
                      <div>
                        <label className="ma2-label" htmlFor="mp-zip">ZIP Code</label>
                        <input id="mp-zip" className="ma2-input" value={form.zip_code} onChange={set('zip_code')} />
                      </div>
                      )}
                    </div>
                    {!isHidden('avatar') && (
                    <div>
                      <span className="ma2-label">Avatar</span>
                      <MemberImageUpload value={form.avatar} onChange={v => setForm(p => ({ ...p, avatar: v }))} adjust adjustRatio={1} />
                    </div>
                    )}
                    <div className="flex justify-end gap-2 pt-2">
                      <button onClick={() => setEditing(false)} className="ma2-btn ma2-btn-light">Cancel</button>
                      <button onClick={handleSave} disabled={loading} className="ma2-btn ma2-btn-primary" data-testid="save-profile-btn">
                        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3.5">
                    {infoRows.map(f => (
                      <div key={f.label} className="flex items-start gap-2">
                        <span className="ma2-dt flex-shrink-0" style={{ minWidth: '9rem' }}>{f.label} :</span>
                        <span className="ma2-dd">{f.value || '-'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {tab === 'social' && (
            <>
              <div className="ma2-card-head">
                <h2 className="ma2-card-title">Social Links</h2>
              </div>
              <div className="ma2-card-body">
                <p className="text-[13px] mb-5" style={{ color: 'var(--ma2-muted, #878a99)' }}>Enter your social network profiles.</p>
                {platformSocials.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {platformSocials.map(platform => (
                        <div key={platform}>
                          <label className="ma2-label capitalize" htmlFor={`mp-social-${platform}`}>{platform}</label>
                          <input id={`mp-social-${platform}`} className="ma2-input"
                            value={getSocialUrl(platform)} onChange={e => updateSocial(platform, e.target.value)}
                            placeholder={`Enter your ${platform} URL`} data-testid={`social-${platform}`} />
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end pt-5">
                      <button onClick={handleSave} disabled={loading} className="ma2-btn ma2-btn-primary" data-testid="save-socials-btn">
                        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save Social Links
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="text-[13px]" style={{ color: 'var(--ma2-muted, #878a99)' }}>No social platforms configured by the administrator.</p>
                )}
              </div>
            </>
          )}

          {tab === 'activities' && (
            <>
              <div className="ma2-card-head">
                <h2 className="ma2-card-title">Activities</h2>
              </div>
              <div className="ma2-card-body" data-testid="profile-activities">
                {profileActivities.length === 0 ? (
                  <div className="text-center py-12 text-[13px]" style={{ color: 'var(--ma2-muted, #878a99)' }}>
                    No activities yet. Start by updating your profile information.
                  </div>
                ) : (
                  <div className="ma2-timeline">
                    {profileActivities.map(act => {
                      const added = act.action === 'added';
                      return (
                        <div key={act.id} className="ma2-timeline-item">
                          <span className="ma2-timeline-dot"
                            style={{ backgroundColor: added ? 'color-mix(in srgb, var(--ma2-success) 12%, transparent)' : 'color-mix(in srgb, var(--ma2-info) 12%, transparent)' }}>
                            {added
                              ? <Plus className="w-4 h-4" style={{ color: T.success }} />
                              : <RefreshCw className="w-3.5 h-3.5" style={{ color: T.info }} />}
                          </span>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[13px] font-semibold" style={{ color: 'var(--ma2-body, #212529)' }}>
                              {PROFILE_FIELD_LABELS[act.field] || act.field}
                            </span>
                            <span className={`ma2-badge ${added ? 'ma2-badge-success' : 'ma2-badge-info'}`}>
                              {added ? 'Added' : 'Updated'}
                            </span>
                          </div>
                          {act.action === 'updated' && act.old_value && (
                            <p className="text-[13px] mt-1 break-words" style={{ color: 'var(--ma2-muted, #878a99)' }}>
                              "{act.old_value}" &rarr; "{act.new_value}"
                            </p>
                          )}
                          {added && act.new_value && (
                            <p className="text-[13px] mt-1 break-words" style={{ color: 'var(--ma2-muted, #878a99)' }}>
                              Set to: "{act.new_value}"
                            </p>
                          )}
                          <p className="text-[12px] mt-1.5" style={{ color: 'var(--ma2-faint, #adb5bd)' }}>{fmtActivityDate(act.timestamp)}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Update Biography Modal */}
      <Dialog open={bioOpen} onOpenChange={setBioOpen}>
        <DialogContent className="ma2-modal sm:max-w-[700px]" data-testid="biography-modal">
          <DialogHeader className="ma2-modal-header">
            <DialogTitle className="ma2-modal-title">Update Biography</DialogTitle>
            <DialogDescription className="ma2-modal-desc">Edit your summary and biography below.</DialogDescription>
          </DialogHeader>
          <div className="ma2-modal-body space-y-4">
            <div>
              <span className="ma2-label">Summary</span>
              <div className="ma2-compose-editor">
                <RichTextEditor value={bioForm.summary} onChange={v => setBioForm(p => ({ ...p, summary: v }))} placeholder="Write your summary..." />
              </div>
            </div>
            <div>
              <span className="ma2-label">Biography</span>
              <div className="ma2-compose-editor">
                <RichTextEditor value={bioForm.biography} onChange={v => setBioForm(p => ({ ...p, biography: v }))} placeholder="Write your biography..." />
              </div>
            </div>
          </div>
          <div className="ma2-modal-footer">
            <button onClick={() => setBioOpen(false)} className="ma2-btn ma2-btn-light">Close</button>
            <button onClick={handleBioSave} disabled={loading} className="ma2-btn ma2-btn-primary" data-testid="save-biography-btn">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Changes
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password Modal */}
      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent className="ma2-modal sm:max-w-[480px]" data-testid="change-password-modal">
          <DialogHeader className="ma2-modal-header">
            <DialogTitle className="ma2-modal-title">Change Password</DialogTitle>
            <DialogDescription className="ma2-modal-desc">Enter your new password below.</DialogDescription>
          </DialogHeader>
          <div className="ma2-modal-body space-y-4">
            <div>
              <label className="ma2-label" htmlFor="mp-newpw">New Password</label>
              <input id="mp-newpw" type="password" className="ma2-input" value={pwForm.new_password}
                onChange={e => setPwForm(p => ({ ...p, new_password: e.target.value }))}
                placeholder="Min. 8 characters" data-testid="new-password-input" />
            </div>
            <div>
              <label className="ma2-label" htmlFor="mp-confirmpw">Confirm Password</label>
              <input id="mp-confirmpw" type="password" className="ma2-input" value={pwForm.confirm_password}
                onChange={e => setPwForm(p => ({ ...p, confirm_password: e.target.value }))}
                placeholder="Re-enter password" data-testid="confirm-password-input" />
            </div>
          </div>
          <div className="ma2-modal-footer">
            <button onClick={() => setPwOpen(false)} className="ma2-btn ma2-btn-light">Close</button>
            <button onClick={handleChangePassword} disabled={pwLoading} className="ma2-btn ma2-btn-primary" data-testid="submit-change-password-btn">
              {pwLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />} Change Password
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Full Bio Modal */}
      <Dialog open={viewBioOpen} onOpenChange={setViewBioOpen}>
        <DialogContent className="ma2-modal sm:max-w-[650px]" data-testid="view-bio-modal">
          <DialogHeader className="ma2-modal-header">
            <DialogTitle className="ma2-modal-title">Full Biography</DialogTitle>
            <DialogDescription className="ma2-modal-desc">Your summary and biography content.</DialogDescription>
          </DialogHeader>
          <div className="ma2-modal-body space-y-5">
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--ma2-muted, #878a99)' }}>Summary</h3>
              {member?.summary && stripHtml(member.summary) ? (
                <div className="ma2-rich break-words" dangerouslySetInnerHTML={{ __html: member.summary }} />
              ) : (
                <p className="text-[13px] italic" style={{ color: 'var(--ma2-faint, #adb5bd)' }}>No summary written yet.</p>
              )}
            </div>
            <hr style={{ borderColor: 'var(--ma2-border, #e9ebec)' }} />
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--ma2-muted, #878a99)' }}>Biography</h3>
              {member?.biography && stripHtml(member.biography) ? (
                <div className="ma2-rich break-words" dangerouslySetInnerHTML={{ __html: member.biography }} />
              ) : (
                <p className="text-[13px] italic" style={{ color: 'var(--ma2-faint, #adb5bd)' }}>No biography written yet.</p>
              )}
            </div>
          </div>
          <div className="ma2-modal-footer">
            <button onClick={() => setViewBioOpen(false)} className="ma2-btn ma2-btn-light">Close</button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Steps to Complete Profile Modal */}
      <Dialog open={stepsOpen} onOpenChange={setStepsOpen}>
        <DialogContent className="ma2-modal sm:max-w-[520px]" data-testid="steps-modal">
          <DialogHeader className="ma2-modal-header">
            <DialogTitle className="ma2-modal-title">Steps to Complete Your Profile</DialogTitle>
            <DialogDescription className="ma2-modal-desc">Fields you still need to fill in.</DialogDescription>
          </DialogHeader>
          <div className="ma2-modal-body space-y-5">
            {missingMandatory.length > 0 ? (
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-2.5 flex items-center gap-1.5" style={{ color: 'var(--ma2-danger, #f06548)' }}>
                  <AlertCircle className="w-3.5 h-3.5" /> Required Fields ({missingMandatory.length})
                </h3>
                <div className="space-y-1.5">
                  {missingMandatory.map(key => (
                    <div key={key} className="flex items-center gap-2 px-3 py-2 rounded text-[13px]"
                      style={{ backgroundColor: 'color-mix(in srgb, var(--ma2-danger) 8%, transparent)', color: 'var(--ma2-heading, #495057)' }}
                      data-testid={`missing-mandatory-${key}`}>
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--ma2-danger, #f06548)' }} />
                      {COMPLETION_FIELD_LABELS[key] || key}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded text-[13px]"
                style={{ backgroundColor: 'color-mix(in srgb, var(--ma2-success) 12%, transparent)', color: 'var(--ma2-success-fg)' }}>
                <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--ma2-success, #0ab39c)' }} />
                All mandatory fields are complete!
              </div>
            )}

            {missingOptional.length > 0 && (
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: 'var(--ma2-muted, #878a99)' }}>
                  Optional Fields ({missingOptional.length})
                </h3>
                <div className="space-y-1.5">
                  {missingOptional.map(key => (
                    <div key={key} className="flex items-center gap-2 px-3 py-2 rounded text-[13px]"
                      style={{ backgroundColor: 'var(--ma2-light, #f3f6f9)', color: 'var(--ma2-muted, #878a99)' }}
                      data-testid={`missing-optional-${key}`}>
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--ma2-faint, #adb5bd)' }} />
                      {COMPLETION_FIELD_LABELS[key] || key}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {missingMandatory.length === 0 && missingOptional.length === 0 && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded text-[13px]"
                style={{ backgroundColor: 'color-mix(in srgb, var(--ma2-success) 12%, transparent)', color: 'var(--ma2-success-fg)' }}>
                <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--ma2-success, #0ab39c)' }} />
                Your profile is 100% complete!
              </div>
            )}
          </div>
          <div className="ma2-modal-footer">
            <button onClick={() => setStepsOpen(false)} className="ma2-btn ma2-btn-light">Close</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
