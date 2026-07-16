import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { memberAPI, publicAPI, geoAPI } from '../../lib/api';
import { UserPlus, Loader2, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import ImageUpload from '../../components/ImageUpload';
import { useT } from '../../lib/i18n';
import CaptchaWidget from '../../components/CaptchaWidget';

export default function MemberRegister() {
  const { setUserData } = useAuth();
  const navigate = useNavigate();
  const tt = useT();
  const [params] = useSearchParams();
  const [settings, setSettings] = useState({});
  const [step, setStep] = useState('code');
  const [code, setCode] = useState(params.get('code') || '');
  const [codeValid, setCodeValid] = useState(null);
  const [codeInfo, setCodeInfo] = useState(null);
  const [sponsorInfo, setSponsorInfo] = useState(null);
  const [validating, setValidating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', password: '', confirm_password: '',
    phone: '', gender: '', date_of_birth: '', country: '', state: '', city: '', avatar: '',
  });

  useEffect(() => {
    publicAPI.getSettings().then(r => setSettings(r.data)).catch(() => {});
    geoAPI.getCountries().then(r => setCountries(r.data)).catch(() => {});
  }, []);

  // Handle ?sponsor=X (QR-based) or ?code=X (invite code)
  useEffect(() => {
    const sponsorNum = params.get('sponsor');
    if (sponsorNum) {
      setValidating(true);
      memberAPI.validateSponsor(sponsorNum).then(r => {
        setSponsorInfo({ ...r.data, membership_number: parseInt(sponsorNum) });
        setStep('form');
      }).catch(() => { setSponsorInfo(null); setError('Invalid sponsor link'); })
      .finally(() => setValidating(false));
    } else if (params.get('code')) {
      validateCode(params.get('code'));
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    if (form.country) {
      const c = countries.find(c => c.name === form.country);
      if (c) geoAPI.getStates(c.id).then(r => setStates(r.data)).catch(() => {});
      else setStates([]);
    } else setStates([]);
  }, [form.country, countries]);

  useEffect(() => {
    if (form.state) {
      const s = states.find(s => s.name === form.state);
      if (s) geoAPI.getCities(s.id).then(r => setCities(r.data)).catch(() => {});
      else setCities([]);
    } else setCities([]);
  }, [form.state, states]);

  const validateCode = async (c) => {
    const val = (c || code).trim();
    if (!val) return;
    setValidating(true); setCodeValid(null);
    try { const res = await memberAPI.validateCode(val); setCodeValid(true); setCodeInfo(res.data); setStep('form'); }
    catch { setCodeValid(false); setCodeInfo(null); }
    finally { setValidating(false); }
  };

  const set = (field) => (e) => { setForm(prev => ({ ...prev, [field]: e.target.value })); if (field === 'email') setEmailError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setEmailError('');
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (form.password !== form.confirm_password) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      const httpAccess = window.location.hostname;
      const payload = { ...form, http_access: httpAccess, captcha_token: captchaToken };
      if (sponsorInfo) {
        payload.sponsor_membership_number = sponsorInfo.membership_number;
      } else {
        payload.invite_code = code;
      }
      const res = await memberAPI.register(payload);
      if (res.data.token) { localStorage.setItem('auth_token', res.data.token); if (res.data.member) setUserData(res.data.member); }
      toast.success(`Welcome! Your membership ID is ${res.data.membership_id}`);
      navigate('/my-account/membership-profile', { replace: true });
    } catch (err) {
      const detail = err?.response?.data?.detail || 'Registration failed';
      if (detail.toLowerCase().includes('email')) setEmailError(detail); else setError(detail);
    } finally { setLoading(false); }
  };

  const brandName = tt(settings.brand_name) || 'Legacy';
  const bgImage = settings.membership_login_bg || '';
  const inputCls = "w-full bg-[#13161e] border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#c9a84c]/50";
  const selectCls = inputCls + " appearance-auto";

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'DM Sans', sans-serif" }} data-testid="member-register-page">
      <div className="flex-1 flex items-center justify-center bg-[#0d0f14] px-6 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-[#c9a84c] rounded flex items-center justify-center"><span className="text-[#0d0f14] font-bold text-lg" style={{ fontFamily: "'DM Serif Display', serif" }}>{brandName[0]}</span></div>
            <span className="text-white text-xl font-semibold">{brandName}</span>
          </Link>

          {step === 'code' && !sponsorInfo && (
            <>
              <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: "'DM Serif Display', serif" }}>Join {brandName}</h1>
              <p className="text-gray-400 text-sm mb-8">Enter your invitation code to get started</p>
              <form onSubmit={e => { e.preventDefault(); validateCode(); }} className="space-y-5">
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-1 block">Invitation Code</label>
                  <input type="text" value={code} onChange={e => { setCode(e.target.value); setCodeValid(null); }} placeholder="e.g. AUX-1-abc123" className={inputCls} required data-testid="register-invite-code" />
                  {codeValid === true && <div className="flex items-center gap-1.5 mt-2 text-green-400 text-xs"><CheckCircle className="w-3.5 h-3.5" /> Valid code from {codeInfo?.sponsor_membership_id}</div>}
                  {codeValid === false && <div className="flex items-center gap-1.5 mt-2 text-red-400 text-xs" data-testid="register-code-error"><XCircle className="w-3.5 h-3.5" /> Invalid or used code</div>}
                </div>
                <button type="submit" disabled={validating || !code.trim()} className="w-full py-3 bg-[#c9a84c] text-[#0d0f14] font-semibold rounded-lg flex items-center justify-center gap-2 disabled:opacity-50" data-testid="register-validate-btn">
                  {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {validating ? 'Validating...' : 'Validate Code'}
                </button>
              </form>
              <div className="mt-6 text-center"><Link to="/my-account/login" className="text-[#c9a84c] text-sm hover:underline flex items-center justify-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> Already have an account? Sign In</Link></div>
            </>
          )}

          {step === 'form' && (
            <>
              <div className="flex items-center gap-2 mb-4">
                {!sponsorInfo && <button onClick={() => setStep('code')} className="text-gray-500 hover:text-white"><ArrowLeft className="w-4 h-4" /></button>}
                <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'DM Serif Display', serif" }}>Create Account</h1>
              </div>
              <div className="bg-[#c9a84c]/10 border border-[#c9a84c]/20 rounded-lg p-3 mb-4 text-xs text-[#c9a84c]">Sponsored by: <strong>{sponsorInfo?.sponsor_membership_id || codeInfo?.sponsor_membership_id}</strong> {sponsorInfo?.sponsor_name && `(${sponsorInfo.sponsor_name})`}</div>
              {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg mb-4">{error}</div>}
              <form onSubmit={handleSubmit} className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-gray-400 mb-1 block">First Name *</label><input type="text" value={form.first_name} onChange={set('first_name')} required className={inputCls} data-testid="register-firstname" /></div>
                  <div><label className="text-xs text-gray-400 mb-1 block">Last Name *</label><input type="text" value={form.last_name} onChange={set('last_name')} required className={inputCls} data-testid="register-lastname" /></div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Email * <span className="text-gray-600">(this will be your username)</span></label>
                  <input type="email" value={form.email} onChange={set('email')} required className={`${inputCls} ${emailError ? '!border-red-500/50' : ''}`} data-testid="register-email" />
                  {emailError && <p className="text-red-400 text-xs mt-1">{emailError}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-gray-400 mb-1 block">Password *</label><input type="password" value={form.password} onChange={set('password')} required minLength={8} className={inputCls} data-testid="register-password" /></div>
                  <div><label className="text-xs text-gray-400 mb-1 block">Confirm Password *</label><input type="password" value={form.confirm_password} onChange={set('confirm_password')} required className={inputCls} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-gray-400 mb-1 block">Phone</label><input type="tel" value={form.phone} onChange={set('phone')} className={inputCls} /></div>
                  <div><label className="text-xs text-gray-400 mb-1 block">Gender</label><select value={form.gender} onChange={set('gender')} className={selectCls}><option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option></select></div>
                </div>
                <div><label className="text-xs text-gray-400 mb-1 block">Date of Birth</label><input type="date" value={form.date_of_birth} onChange={set('date_of_birth')} className={selectCls} onClick={e => e.target.showPicker && e.target.showPicker()} data-testid="register-dob" /></div>
                <div className="grid grid-cols-3 gap-2">
                  <div><label className="text-xs text-gray-400 mb-1 block">Country</label><select value={form.country} onChange={e => setForm(p => ({...p, country: e.target.value, state: '', city: ''}))} className={selectCls}><option value="">Select</option>{countries.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
                  <div><label className="text-xs text-gray-400 mb-1 block">State</label><select value={form.state} onChange={e => setForm(p => ({...p, state: e.target.value, city: ''}))} className={selectCls} disabled={!form.country}><option value="">Select</option>{states.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}</select></div>
                  <div><label className="text-xs text-gray-400 mb-1 block">City</label><select value={form.city} onChange={set('city')} className={selectCls} disabled={!form.state}><option value="">Select</option>{cities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
                </div>
                <CaptchaWidget onChange={setCaptchaToken} testId="register-captcha" />
                <button type="submit" disabled={loading} className="w-full py-3 bg-[#c9a84c] text-[#0d0f14] font-semibold rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 mt-2" data-testid="register-submit-btn">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} {loading ? 'Creating...' : 'Create Account'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
      <div className="hidden lg:block lg:w-[45%] relative bg-[#13161e]" style={bgImage ? { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
        {!bgImage && <div className="absolute inset-0 flex items-center justify-center"><div className="text-center"><div className="w-20 h-20 bg-[#c9a84c]/10 rounded-2xl flex items-center justify-center mx-auto mb-4"><span className="text-[#c9a84c] text-3xl font-bold" style={{ fontFamily: "'DM Serif Display', serif" }}>{brandName[0]}</span></div><h2 className="text-white text-2xl font-bold" style={{ fontFamily: "'DM Serif Display', serif" }}>{brandName}</h2></div></div>}
      </div>
    </div>
  );
}
