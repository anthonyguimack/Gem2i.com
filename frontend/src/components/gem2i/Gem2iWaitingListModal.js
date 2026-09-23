import React, { useState, useEffect, useCallback } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { landingAPI, publicAPI } from '../../lib/api';
import { useT } from '../../lib/i18n';
import CaptchaWidget from '../CaptchaWidget';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';

const GEM_FONT = "'Poppins', sans-serif";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const L = {
  title: { en: 'Join the waiting list', es: 'Únete a la lista de espera' },
  intro: { en: 'Leave your details and we will send you an invitation as soon as a spot opens up.', es: 'Déjanos tus datos y te enviaremos una invitación en cuanto haya un cupo disponible.' },
  firstName: { en: 'First name', es: 'Nombre' },
  lastName: { en: 'Last name', es: 'Apellido' },
  email: { en: 'Email', es: 'Correo' },
  errFirst: { en: 'Enter your first name.', es: 'Escribe tu nombre.' },
  errLast: { en: 'Enter your last name.', es: 'Escribe tu apellido.' },
  errEmail: { en: 'Enter your email.', es: 'Escribe tu correo.' },
  errEmailFmt: { en: 'That email doesn’t look right.', es: 'Ese correo no parece válido.' },
  errCaptcha: { en: 'Confirm you are not a robot.', es: 'Confirma que no eres un robot.' },
  submit: { en: 'Join the list', es: 'Unirme a la lista' },
  doneTitle: { en: 'You’re on the list!', es: '¡Ya estás en la lista!' },
  doneText: { en: 'Thanks for your interest. We will email you when a spot opens up.', es: 'Gracias por tu interés. Te escribiremos cuando haya un cupo disponible.' },
  already: { en: 'You were already on the list.', es: 'Ya estabas en la lista.' },
  close: { en: 'Close', es: 'Cerrar' },
  failed: { en: 'Something went wrong. Please try again.', es: 'Algo salió mal. Inténtalo de nuevo.' },
};

const EMPTY = { first_name: '', last_name: '', email: '' };
const inputCls = 'w-full px-3.5 py-2.5 text-sm text-white rounded-sm bg-white/5 border focus:outline-none focus:border-[var(--color-accent,#3287B7)] placeholder:text-white/40';

/**
 * Waiting List capture (lead capture #31, ported from Carlos and restyled for gem2i).
 * Opens on any click of a link whose href ends with #waiting-list / #waitlist (e.g. a
 * hero CTA with the "Waiting List" action) or on the `gem2i:open-waitlist` event.
 * Posts to POST /api/public/landing-subscribe → CMS → Landing → Subscribers, which
 * also triggers the operator + subscriber Waiting List emails.
 */
export default function Gem2iWaitingListModal() {
  const tt = useT();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [captcha, setCaptcha] = useState('');
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const openFresh = useCallback(() => {
    setForm(EMPTY); setErrors({}); setCaptcha(''); setSubmitting(false); setDone(false); setOpen(true);
  }, []);

  useEffect(() => {
    const onClick = (e) => {
      const a = e.target.closest && e.target.closest('a[href$="#waiting-list"], a[href$="#waitlist"]');
      if (a) { e.preventDefault(); openFresh(); }
    };
    document.addEventListener('click', onClick);
    window.addEventListener('gem2i:open-waitlist', openFresh);
    return () => { document.removeEventListener('click', onClick); window.removeEventListener('gem2i:open-waitlist', openFresh); };
  }, [openFresh]);

  // The captcha widget yields an empty token when captcha is off in the CMS, so only
  // demand a token when it is actually enabled.
  useEffect(() => {
    if (!open) return;
    publicAPI.getCaptchaConfig()
      .then((r) => setCaptchaRequired(!!(r.data?.enabled && r.data?.site_key)))
      .catch(() => setCaptchaRequired(false));
  }, [open]);

  const setField = (k) => (e) => {
    setForm((p) => ({ ...p, [k]: e.target.value }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.first_name.trim()) e.first_name = tt(L.errFirst);
    if (!form.last_name.trim()) e.last_name = tt(L.errLast);
    if (!form.email.trim()) e.email = tt(L.errEmail);
    else if (!EMAIL_RE.test(form.email.trim())) e.email = tt(L.errEmailFmt);
    if (captchaRequired && !captcha) e.captcha = tt(L.errCaptcha);
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (submitting || !validate()) return;
    setSubmitting(true);
    try {
      const res = await landingAPI.subscribe({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        captcha_token: captcha,
      });
      setDone(true);
      if (/already/i.test(res?.data?.message || '')) toast.message(tt(L.already));
    } catch (err) {
      const msg = err?.response?.data?.detail;
      toast.error(typeof msg === 'string' ? msg : tt(L.failed));
    } finally {
      setSubmitting(false);
    }
  };

  const field = (name, label, type = 'text', autoComplete) => (
    <div>
      <label htmlFor={`waitlist-${name}`} className="block text-xs font-medium uppercase tracking-wider text-white/70 mb-1.5">{label}</label>
      <input id={`waitlist-${name}`} type={type} autoComplete={autoComplete} value={form[name]} onChange={setField(name)}
        aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `waitlist-${name}-err` : undefined}
        className={inputCls}
        style={{ borderColor: errors[name] ? 'var(--color-accent, #3287B7)' : 'var(--color-card-border, rgba(255,255,255,0.08))' }}
        data-testid={`waitlist-${name}`} />
      {errors[name] && <p id={`waitlist-${name}-err`} className="text-xs mt-1.5" style={{ color: 'var(--color-accent, #3287B7)' }}>{errors[name]}</p>}
    </div>
  );

  const primaryBtn = 'w-full py-3 rounded-sm text-sm font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';
  const primaryStyle = { backgroundColor: 'var(--color-button-bg, #3287B7)', color: 'var(--color-button-text, #fff)', outlineColor: 'var(--color-accent, #3287B7)' };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!submitting) setOpen(o); }}>
      <DialogContent className="border sm:max-w-md"
        style={{ backgroundColor: 'var(--color-section-bg, #0A121A)', borderColor: 'var(--color-card-border, rgba(255,255,255,0.08))', color: '#fff', fontFamily: GEM_FONT }}
        data-testid="waitlist-modal">
        {done ? (
          <div className="text-center py-4" role="status">
            <span className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4" style={{ backgroundColor: 'var(--color-accent, #3287B7)' }}>
              <Check className="w-7 h-7 text-white" aria-hidden="true" />
            </span>
            <DialogTitle className="text-xl font-semibold text-white mb-2">{tt(L.doneTitle)}</DialogTitle>
            <DialogDescription className="text-sm mb-6 mx-auto max-w-xs" style={{ color: 'var(--color-body-text, #9AA6B2)' }}>{tt(L.doneText)}</DialogDescription>
            <button type="button" onClick={() => setOpen(false)} className={primaryBtn} style={primaryStyle} data-testid="waitlist-done-close">{tt(L.close)}</button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-white">{tt(L.title)}</DialogTitle>
              <DialogDescription className="text-sm" style={{ color: 'var(--color-body-text, #9AA6B2)' }}>{tt(L.intro)}</DialogDescription>
            </DialogHeader>
            <form onSubmit={submit} noValidate className="space-y-4 mt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {field('first_name', tt(L.firstName), 'text', 'given-name')}
                {field('last_name', tt(L.lastName), 'text', 'family-name')}
              </div>
              {field('email', tt(L.email), 'email', 'email')}
              <div>
                <div className="flex justify-center">
                  <CaptchaWidget theme="dark" testId="waitlist-captcha"
                    onChange={(t) => { setCaptcha(t); if (t && errors.captcha) setErrors((p) => ({ ...p, captcha: undefined })); }} />
                </div>
                {errors.captcha && <p className="text-xs mt-1.5 text-center" style={{ color: 'var(--color-accent, #3287B7)' }}>{errors.captcha}</p>}
              </div>
              <button type="submit" disabled={submitting} aria-busy={submitting} className={primaryBtn} style={primaryStyle} data-testid="waitlist-submit">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                {tt(L.submit)}
              </button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
