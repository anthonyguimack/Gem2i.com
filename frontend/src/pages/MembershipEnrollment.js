import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { enrollmentAPI, geoAPI, publicAPI } from '../lib/api';
import { useAuth } from '../lib/auth';
import RichTextEditor from '../components/RichTextEditor';
import { Lock, ChevronRight, Check, HelpCircle, Eye, EyeOff, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { useT } from '../lib/i18n';

const cv = (key, fb) => `var(--me-${key}, ${fb})`;

function PasswordStrength({ password }) {
  const score = useMemo(() => {
    let s = 0;
    if (password.length >= 8) s++;
    if (password.length >= 12) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  }, [password]);
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  const colors = ['', '#dc2626', '#f59e0b', '#eab308', '#22c55e', '#16a34a'];
  if (!password) return null;
  return (
    <div className="mt-1.5 flex items-center gap-2">
      <div className="flex gap-1 flex-1">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-1 flex-1 rounded-full" style={{ backgroundColor: i <= score ? colors[score] : '#e5e7eb' }} />
        ))}
      </div>
      <span className="text-xs font-medium" style={{ color: colors[score] }}>{labels[score]}</span>
    </div>
  );
}

function Tooltip({ text }) {
  if (!text) return null;
  return (
    <div className="relative group inline-block ml-1.5">
      <HelpCircle className="w-3.5 h-3.5 cursor-help" style={{ color: cv('input-icon', '#9ca3af') }} />
      <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 rounded text-xs opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity shadow-xl" style={{ backgroundColor: cv('tooltip-bg', '#1a2535'), color: cv('tooltip-text', '#fff') }}>
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-transparent" style={{ borderTopColor: cv('tooltip-bg', '#1a2535') }} />
      </div>
    </div>
  );
}

function formatCurrency(val) {
  const num = parseFloat(String(val).replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return '';
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const STEP_LABELS = ['Invitation CODE', 'Clarity Statement and Interview', 'Application Enrollment', 'Confirm & Submit'];

export default function MembershipEnrollment() {
  const navigate = useNavigate();
  const tt = useT();
  const { setUserData } = useAuth();
  const [settings, setSettings] = useState({});
  const [fields, setFields] = useState([]);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [codeValid, setCodeValid] = useState(null);
  const [showPasswords, setShowPasswords] = useState({});
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [globalMsg, setGlobalMsg] = useState({ type: '', text: '' });
  const [step4Content, setStep4Content] = useState({ title: '', description: '' });

  useEffect(() => {
    enrollmentAPI.getFields().then(r => setFields(r.data || [])).catch(() => {});
    enrollmentAPI.getStep4Content().then(r => setStep4Content(r.data || {})).catch(() => {});
    publicAPI.getSettings().then(r => setSettings(r.data || {})).catch(() => {});
    geoAPI.getCountries().then(r => setCountries(r.data || [])).catch(() => {});
    // Pre-fill signature date
    setFormData(p => ({ ...p, signature_date: new Date().toISOString().split('T')[0] }));
  }, []);

  // Cascade geo
  useEffect(() => {
    if (formData.country) {
      const c = countries.find(x => x.name === formData.country);
      if (c) geoAPI.getStates(c.id).then(r => setStates(r.data || [])).catch(() => setStates([]));
      else setStates([]);
      setCities([]);
      setFormData(p => ({ ...p, state: '', city: '' }));
    }
  }, [formData.country]); // eslint-disable-line

  useEffect(() => {
    if (formData.state) {
      const s = states.find(x => x.name === formData.state);
      if (s) geoAPI.getCities(s.id).then(r => setCities(r.data || [])).catch(() => setCities([]));
      else setCities([]);
      setFormData(p => ({ ...p, city: '' }));
    }
  }, [formData.state]); // eslint-disable-line

  const stepFields = useMemo(() => fields.filter(f => f.step === currentStep && f.visible !== false), [fields, currentStep]);

  // Active step list — drops any step whose visible-fields count is zero so the
  // public flow skips empty steps entirely.  Step 4 (Submit/payment) is always
  // active so we never end up with no submit button.
  const activeSteps = useMemo(() => {
    return [1, 2, 3, 4].filter(s => {
      if (s === 4) return true;
      return fields.some(f => f.step === s && f.visible !== false);
    });
  }, [fields]);

  const stepIndex = activeSteps.indexOf(currentStep);
  const isLastStep = stepIndex === activeSteps.length - 1;
  const nextStep = () => activeSteps[stepIndex + 1];
  const prevStep = () => activeSteps[stepIndex - 1];

  // If `fields` finishes loading and the current step turned out to be empty
  // (e.g. admin hid every field in step 2 while user was on step 2), advance
  // to the next active step automatically.
  useEffect(() => {
    if (!fields.length) return;
    if (!activeSteps.includes(currentStep) && activeSteps.length) {
      const nxt = activeSteps.find(s => s >= currentStep) || activeSteps[activeSteps.length - 1];
      setCurrentStep(nxt);
    }
  }, [fields, activeSteps, currentStep]);

  const setField = useCallback((key, val) => {
    setFormData(p => ({ ...p, [key]: val }));
    setErrors(p => { const n = { ...p }; delete n[key]; return n; });
    setGlobalMsg({ type: '', text: '' });
  }, []);

  const validateStep = useCallback((step) => {
    const sf = fields.filter(f => f.step === step && f.visible !== false);
    const errs = {};
    for (const f of sf) {
      if (!f.required) continue;
      const val = formData[f.field_key];
      if (f.field_type === 'legal_checkbox') {
        if (!val) errs[f.field_key] = 'You must accept this agreement';
      } else if (f.field_type === 'checkbox') {
        if (!val || (Array.isArray(val) && val.length === 0)) errs[f.field_key] = 'Select at least one option';
      } else if (f.field_type === 'rating_table') {
        const ratings = val || {};
        const missing = (f.options || []).some(cat => !ratings[cat]);
        if (missing) errs[f.field_key] = 'Rate all categories';
      } else if (f.field_type === 'rating') {
        if (!val) errs[f.field_key] = 'Select a rating';
      } else {
        if (!val || (typeof val === 'string' && !val.trim())) errs[f.field_key] = `${f.label} is required`;
      }
      // Extra validations
      if (f.field_key === 'email' && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) errs[f.field_key] = 'Invalid email address';
      if (f.field_key === 'password' && val && val.length < 8) errs[f.field_key] = 'Min. 8 characters';
      if (f.field_key === 'confirm_password' && val !== formData.password) errs[f.field_key] = 'Passwords do not match';
    }
    return errs;
  }, [fields, formData]);

  const handleSaveOrContinue = async () => {
    const errs = validateStep(currentStep);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      setGlobalMsg({ type: 'error', text: 'Please correct the highlighted fields.' });
      return;
    }
    // Step 1: validate invite code AND check email
    if (currentStep === 1) {
      try {
        setLoading(true);
        // Check email availability first
        await enrollmentAPI.checkEmail(formData.email);
        // Then validate invite code
        if (codeValid !== true) {
          await enrollmentAPI.validateCode(formData.invite_code);
          setCodeValid(true);
        }
      } catch (e) {
        const detail = e.response?.data?.detail || 'Validation failed';
        if (detail.toLowerCase().includes('email')) {
          setErrors({ email: detail });
        } else {
          setErrors({ invite_code: detail });
          setCodeValid(false);
        }
        setLoading(false);
        return;
      } finally {
        setLoading(false);
      }
    }
    setCompletedSteps(p => new Set([...p, currentStep]));
    const nxt = nextStep();
    if (nxt) setCurrentStep(nxt);
    setGlobalMsg({ type: '', text: '' });
  };

  const handleSubmit = async () => {
    const errs = validateStep(currentStep);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setLoading(true);
    setGlobalMsg({ type: '', text: '' });
    try {
      const res = await enrollmentAPI.submit(formData);
      const data = res.data;
      toast.success('Membership application submitted successfully!');
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
        if (data.member) setUserData(data.member);
        navigate('/my-account');
      }
    } catch (e) {
      setGlobalMsg({ type: 'error', text: e.response?.data?.detail || 'Submission failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const goToStep = (step) => {
    if (!activeSteps.includes(step)) return;
    if (step < currentStep || completedSteps.has(step) || completedSteps.has(prevStep())) {
      setCurrentStep(step);
    }
  };

  const logo = settings.enrollment_logo || settings.site_logo || '';

  const renderField = (f) => {
    const val = formData[f.field_key];
    const err = errors[f.field_key];
    const baseCls = "w-full bg-transparent border-0 border-b py-2.5 text-sm outline-none transition-colors placeholder:text-[--me-placeholder]";
    const selectCls = "w-full border-0 border-b py-2.5 text-sm outline-none transition-colors";
    const borderStyle = { borderBottomColor: err ? cv('error-color', '#dc2626') : cv('input-border', '#d1d5db'), color: cv('input-text', '#1a2535') };
    const selectStyle = { ...borderStyle, backgroundColor: 'transparent', WebkitAppearance: 'menulist', appearance: 'menulist', opacity: 1 };
    const focusStyle = `focus:border-b-2 focus:border-[var(--me-input-focus,#F5A623)]`;

    switch (f.field_type) {
      case 'password': {
        const show = showPasswords[f.field_key];
        return (
          <div>
            <div className="relative">
              <input type={show ? 'text' : 'password'} value={val || ''} onChange={e => setField(f.field_key, e.target.value)} placeholder={tt(f.placeholder) || ''} className={`${baseCls} ${focusStyle} pr-10`} style={borderStyle} data-testid={`enroll-${f.field_key}`} />
              <button type="button" onClick={() => setShowPasswords(p => ({ ...p, [f.field_key]: !show }))} className="absolute right-0 top-1/2 -translate-y-1/2 p-1" style={{ color: cv('input-icon', '#9ca3af') }}>
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {f.field_key === 'password' && <PasswordStrength password={val || ''} />}
          </div>
        );
      }
      case 'email':
      case 'text':
      case 'number':
        return <input type={f.field_type === 'number' ? 'number' : 'text'} value={val || ''} onChange={e => setField(f.field_key, e.target.value)} placeholder={tt(f.placeholder) || ''} className={`${baseCls} ${focusStyle}`} style={borderStyle} data-testid={`enroll-${f.field_key}`} />;
      case 'currency':
        return <input type="text" value={val || ''} onChange={e => setField(f.field_key, e.target.value)} onBlur={() => { if (val) setField(f.field_key, formatCurrency(val)); }} placeholder={tt(f.placeholder) || '$0.00'} className={`${baseCls} ${focusStyle}`} style={borderStyle} data-testid={`enroll-${f.field_key}`} />;
      case 'date':
        return <input type="date" value={val || ''} onChange={e => setField(f.field_key, e.target.value)} className={`${baseCls} ${focusStyle}`} style={borderStyle} data-testid={`enroll-${f.field_key}`} />;
      case 'textarea':
        return <textarea value={val || ''} onChange={e => setField(f.field_key, e.target.value)} rows={4} placeholder={tt(f.placeholder) || ''} className={`${baseCls} ${focusStyle} resize-none`} style={borderStyle} data-testid={`enroll-${f.field_key}`} />;
      case 'richtext':
        return <div data-testid={`enroll-${f.field_key}`}><RichTextEditor value={val || ''} onChange={v => setField(f.field_key, v)} placeholder={tt(f.placeholder) || ''} /></div>;
      case 'datetime':
        return <input type="datetime-local" value={val || ''} onChange={e => setField(f.field_key, e.target.value)} className={`${baseCls} ${focusStyle}`} style={borderStyle} data-testid={`enroll-${f.field_key}`} />;
      case 'select':
        return (
          <select value={val || ''} onChange={e => setField(f.field_key, e.target.value)} className={`${selectCls} ${focusStyle}`} style={selectStyle} data-testid={`enroll-${f.field_key}`}>
            <option value="">Select...</option>
            {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        );
      case 'country':
        return (
          <select value={val || ''} onChange={e => setField(f.field_key, e.target.value)} className={`${selectCls} ${focusStyle}`} style={selectStyle} data-testid={`enroll-${f.field_key}`}>
            <option value="">Select country...</option>
            {countries.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        );
      case 'state':
        return (
          <select value={val || ''} onChange={e => setField(f.field_key, e.target.value)} className={`${selectCls} ${focusStyle}`} style={selectStyle} data-testid={`enroll-${f.field_key}`}>
            <option value="">Select state...</option>
            {states.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        );
      case 'city':
        return (
          <select value={val || ''} onChange={e => setField(f.field_key, e.target.value)} className={`${selectCls} ${focusStyle}`} style={selectStyle} data-testid={`enroll-${f.field_key}`}>
            <option value="">Select city...</option>
            {cities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        );
      case 'radio':
        return (
          <div className="flex gap-6 py-2">
            {(f.options || []).map(o => (
              <label key={o} className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: cv('input-text', '#1a2535') }}>
                <input type="radio" name={f.field_key} checked={val === o} onChange={() => setField(f.field_key, o)} className="accent-[var(--me-step-active,#F5A623)]" data-testid={`enroll-${f.field_key}-${o.toLowerCase()}`} />
                {o}
              </label>
            ))}
          </div>
        );
      case 'checkbox':
        return (
          <div className="flex flex-wrap gap-x-6 gap-y-2 py-2">
            {(f.options || []).map(o => (
              <label key={o} className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: cv('input-text', '#1a2535') }}>
                <input type="checkbox" checked={(val || []).includes(o)} onChange={e => {
                  const arr = val || [];
                  setField(f.field_key, e.target.checked ? [...arr, o] : arr.filter(x => x !== o));
                }} className="accent-[var(--me-step-active,#F5A623)] rounded" data-testid={`enroll-${f.field_key}-${o.toLowerCase().replace(/\s/g, '-')}`} />
                {o}
              </label>
            ))}
          </div>
        );
      case 'rating':
        return (
          <div className="flex gap-3 py-2">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} type="button" onClick={() => setField(f.field_key, n)}
                className={`w-9 h-9 rounded-full text-sm font-semibold transition-all ${val === n ? 'text-white' : 'border'}`}
                style={val === n ? { backgroundColor: cv('step-active', '#F5A623') } : { borderColor: cv('input-border', '#d1d5db'), color: cv('input-text', '#1a2535') }}
                data-testid={`enroll-${f.field_key}-${n}`}>
                {n}
              </button>
            ))}
          </div>
        );
      case 'rating_table':
        return (
          <div className="overflow-x-auto py-2">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left py-1.5 pr-4 font-medium text-xs" style={{ color: cv('label-color', '#374151') }}>Category</th>
                  {[1, 2, 3, 4, 5].map(n => <th key={n} className="text-center py-1.5 px-2 font-medium text-xs" style={{ color: cv('label-color', '#374151') }}>{n}</th>)}
                </tr>
              </thead>
              <tbody>
                {(f.options || []).map(cat => (
                  <tr key={cat} className="border-b" style={{ borderColor: cv('input-border', '#d1d5db') }}>
                    <td className="py-2 pr-4 text-sm" style={{ color: cv('input-text', '#1a2535') }}>{cat}</td>
                    {[1, 2, 3, 4, 5].map(n => (
                      <td key={n} className="text-center py-2 px-2">
                        <input type="radio" name={`${f.field_key}_${cat}`} checked={(val || {})[cat] === n} onChange={() => setField(f.field_key, { ...(val || {}), [cat]: n })} className="accent-[var(--me-step-active,#F5A623)]" data-testid={`enroll-${f.field_key}-${cat.toLowerCase().replace(/\s/g, '-')}-${n}`} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'legal_checkbox':
        return (
          <div className="py-2">
            <div className="p-3 rounded text-xs leading-relaxed mb-2" style={{ backgroundColor: '#f9fafb', color: cv('input-text', '#1a2535'), border: `1px solid ${cv('input-border', '#d1d5db')}` }}>
              {(f.options || [])[0]}
            </div>
            <label className="flex items-start gap-2 cursor-pointer text-sm" style={{ color: cv('input-text', '#1a2535') }}>
              <input type="checkbox" checked={!!val} onChange={e => setField(f.field_key, e.target.checked)} className="accent-[var(--me-step-active,#F5A623)] mt-0.5" data-testid={`enroll-${f.field_key}`} />
              I agree to the above terms
            </label>
          </div>
        );
      case 'signature_text':
        return <input type="text" value={val || ''} onChange={e => setField(f.field_key, e.target.value)} placeholder={tt(f.placeholder) || ''} className={`${baseCls} ${focusStyle} italic`} style={{ ...borderStyle, fontFamily: 'cursive' }} data-testid={`enroll-${f.field_key}`} />;
      case 'signature_date':
        return <input type="date" value={val || ''} onChange={e => setField(f.field_key, e.target.value)} className={`${baseCls} ${focusStyle}`} style={borderStyle} data-testid={`enroll-${f.field_key}`} />;
      default:
        return <input type="text" value={val || ''} onChange={e => setField(f.field_key, e.target.value)} placeholder={tt(f.placeholder) || ''} className={`${baseCls} ${focusStyle}`} style={borderStyle} data-testid={`enroll-${f.field_key}`} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: cv('page-bg', '#f4f4f4') }} data-testid="membership-enrollment">
      {/* Header */}
      <header className="relative" data-testid="enroll-header">
        <div className="h-[70px]" style={{ backgroundColor: cv('header-bg', '#F5A623') }} />
        {logo && (
          <div className="absolute left-1/2 -translate-x-1/2 top-1 z-10">
            <div className="bg-white rounded shadow-md p-2">
              <img src={logo} alt="Logo" className="h-14 w-auto object-contain" data-testid="enroll-logo" />
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {/* Step Title */}
        <div className="flex items-center gap-2 mb-6">
          <Layers className="w-5 h-5" style={{ color: cv('step-title', '#1a2535') }} />
          <h1 className="text-sm font-bold uppercase tracking-wide" style={{ color: cv('step-title', '#1a2535') }} data-testid="enroll-step-title">
            Membership Enrollment Step {stepIndex + 1} of {activeSteps.length}
          </h1>
        </div>

        {/* Progress Indicator — only shows ACTIVE steps so empty steps are
            invisible to the user (admin-driven via field visibility flags) */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            {activeSteps.map((step, i) => {
              const label = STEP_LABELS[step - 1] || `Step ${step}`;
              const displayNum = i + 1;
              const isActive = step === currentStep;
              const isCompleted = completedSteps.has(step);
              const isClickable = step < currentStep || isCompleted || (i > 0 && completedSteps.has(activeSteps[i - 1]));
              return (
                <React.Fragment key={step}>
                  {i > 0 && <div className="flex-1 h-px mx-2" style={{ backgroundColor: isCompleted || isActive ? cv('step-completed', '#F5A623') : cv('step-pending', '#d4d4d4') }} />}
                  <button onClick={() => isClickable && goToStep(step)} className={`flex flex-col items-center gap-1 ${isClickable ? 'cursor-pointer' : 'cursor-default'}`} data-testid={`enroll-step-nav-${step}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${isActive || isCompleted ? 'text-white' : 'border-2'}`}
                      style={isActive || isCompleted ? { backgroundColor: cv('step-active', '#F5A623') } : { borderColor: cv('step-pending', '#d4d4d4'), color: cv('step-pending', '#d4d4d4') }}>
                      {isCompleted ? <Check className="w-4 h-4" /> : displayNum}
                    </div>
                    <span className={`text-xs text-center max-w-[100px] leading-tight hidden sm:block ${isActive ? 'font-bold' : ''}`}
                      style={{ color: isActive ? cv('step-title', '#1a2535') : cv('step-pending', '#9ca3af') }}>
                      {label}
                    </span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>
          {/* Progress Bar — based on the position within the active-step list */}
          <div className="h-1.5 rounded-full" style={{ backgroundColor: cv('progress-bg', '#e5e7eb') }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${activeSteps.length ? ((stepIndex + 1) / activeSteps.length) * 100 : 0}%`, backgroundColor: cv('progress-bar', '#F5A623') }} data-testid="enroll-progress-bar" />
          </div>
        </div>

        {/* Global Message */}
        {globalMsg.text && (
          <div className={`mb-4 p-3 rounded text-sm ${globalMsg.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`} data-testid="enroll-global-msg">
            {globalMsg.text}
          </div>
        )}

        {/* Step Content */}
        <div className="rounded-lg shadow-sm p-6 sm:p-8" style={{ backgroundColor: cv('form-bg', '#ffffff') }} data-testid="enroll-form">
          {currentStep === 4 ? (
            <div data-testid="enroll-confirm">
              <div className="text-center pt-4 pb-2">
                <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: cv('step-active', '#F5A623') }}>
                  <Check className="w-8 h-8 text-white" />
                </div>
              </div>
              <div className="text-center pb-6">
                <h2 className="text-xl font-bold mb-3" style={{ color: cv('section-title', '#1a2535') }} data-testid="enroll-step4-title">
                  {step4Content.title || 'Thank you for entering your information'}
                </h2>
                <div className="text-sm mx-auto" style={{ color: '#6b7280', overflowWrap: 'break-word', wordBreak: 'normal', hyphens: 'none' }} data-testid="enroll-step4-description"
                  dangerouslySetInnerHTML={{ __html: step4Content.description || 'Thank you for entering your information on our membership application form. To finish the subscription process, please click <strong>SUBMIT</strong>.' }}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-0">
              {stepFields.map(f => (
                <div key={f.id || f.field_key} className="pt-6 first:pt-0" data-testid={`enroll-field-${f.field_key}`}>
                  <label className="flex items-center text-sm font-medium mb-1" style={{ color: cv('label-color', '#374151') }}>
                    {tt(f.label)}
                    {f.required && <span className="ml-0.5" style={{ color: cv('error-color', '#dc2626') }}>*</span>}
                    <Tooltip text={tt(f.tooltip)} />
                  </label>
                  {renderField(f)}
                  {errors[f.field_key] && <p className="text-xs mt-1" style={{ color: cv('error-color', '#dc2626') }} data-testid={`enroll-err-${f.field_key}`}>{errors[f.field_key]}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-end gap-3 mt-6" data-testid="enroll-buttons">
          {!isLastStep && (
            <>
              <button onClick={handleSaveOrContinue} disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 rounded text-sm font-medium border transition-all hover:opacity-80 disabled:opacity-50"
                style={{ borderColor: cv('save-btn-border', '#dc2626'), color: cv('save-btn-text', '#dc2626') }}
                data-testid="enroll-save-btn">
                <Lock className="w-4 h-4" /> Save
              </button>
              <button onClick={handleSaveOrContinue} disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 rounded text-sm font-medium border transition-all hover:opacity-80 disabled:opacity-50"
                style={{ borderColor: cv('continue-btn-border', '#1a2535'), color: cv('continue-btn-text', '#1a2535') }}
                data-testid="enroll-continue-btn">
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
          {isLastStep && (
            <button onClick={handleSubmit} disabled={loading} className="flex items-center gap-2 px-6 py-2.5 rounded text-sm font-medium border transition-all hover:opacity-80 disabled:opacity-50" style={{ borderColor: cv('submit-btn-border', '#1a2535'), color: cv('submit-btn-text', '#1a2535') }} data-testid="enroll-submit-btn">
              <Check className="w-4 h-4" /> Submit {loading && '...'}
            </button>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 px-6" style={{ backgroundColor: cv('footer-bg', '#1a2535') }} data-testid="enroll-footer">
        <p className="text-xs" style={{ color: cv('footer-text', '#9ca3af') }}>{new Date().getFullYear()} &copy; {tt(settings.brand_name) || 'Acapital.com'} - All Rights Reserved</p>
      </footer>
    </div>
  );
}
