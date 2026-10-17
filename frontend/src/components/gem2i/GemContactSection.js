import React, { useState } from 'react';
import { Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useT } from '../../lib/i18n';
import { contactAPI } from '../../lib/api';
import { useSettings } from '../../App';
import CaptchaWidget from '../CaptchaWidget';

// ─────────────────────────────────────────────────────────────────────────
// GemContactSection: the homepage "Contact Us" section (#contact). Port of
// A Capital's components/ModernContact.js (AUX-1.0 @ 1775e05, "Pull Quote +
// Form") restyled for gem2i's night theme. Left: eyebrow, the first short
// line of the description as a large serif quote, the rest below. Right:
// name / email / message + captcha → POST /api/contact (CMS → Contacts).
// Copy and placeholders: CMS → Contact Section (settings.contact_settings).
// Every "Contact us" button on the site lands here (see lib/goToContact).
// ─────────────────────────────────────────────────────────────────────────

const ACCENT = 'var(--color-accent, #3287B7)';
const BODY = 'var(--color-body-text, #9AA6B2)';
const LINE = 'rgba(255,255,255,0.18)';
const clean = (html) => String(html || '').replace(/&nbsp;?/gi, ' ').replace(/ /g, ' ');
const plain = (html) => clean(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

// First block of the description becomes the quote when it is a short line.
function splitDescription(html) {
  const blocks = clean(html).match(/<(p|h[1-6])[^>]*>[\s\S]*?<\/\1>/gi) || [];
  const first = blocks.find(b => plain(b));
  if (!first || plain(first).length > 140) return { quote: '', rest: clean(html) };
  return { quote: plain(first), rest: clean(html).replace(first, '') };
}

export default function GemContactSection() {
  const tt = useT();
  const settings = useSettings();
  const cs = settings.contact_settings || {};
  const title = tt(cs.title) || tt({ en: 'Contact', es: 'Contacto' });
  const subtitle = tt(cs.subtitle) || tt({ en: "Let's build your next event together", es: 'Construyamos juntos tu próximo evento' });
  const { quote, rest } = splitDescription(tt(cs.description));
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [captchaToken, setCaptchaToken] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await contactAPI.submit({ ...form, captcha_token: captchaToken, subject: 'gem2i contact section' });
      toast.success(tt({ en: 'Message sent. We will get back to you.', es: 'Mensaje enviado. Te responderemos pronto.' }));
      setForm({ name: '', email: '', message: '' });
      setCaptchaToken('');
    } catch (err) {
      toast.error(err?.response?.data?.detail || tt({ en: 'Could not send the message.', es: 'No se pudo enviar el mensaje.' }));
    } finally { setSending(false); }
  };

  const field = 'w-full bg-transparent border-0 border-b-[1.5px] px-0 py-3.5 text-base text-white placeholder:text-white/45 focus:outline-none focus:ring-0 transition-colors duration-200';
  const on = (e) => { e.target.style.borderColor = 'var(--color-accent, #3287B7)'; };
  const off = (e) => { e.target.style.borderColor = LINE; };
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <section id="contact" data-testid="gem2i-contact" className="scroll-mt-24" style={{ backgroundColor: 'var(--color-section-bg, #0A121A)' }}>
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-20 md:py-28 grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-12 lg:gap-20 items-start">
        <div className="flex flex-col gap-6">
          <p className="gem-eyebrow" style={{ color: ACCENT }}>{title}</p>
          <p className="m-0 text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic', fontWeight: 500, fontSize: 'clamp(2rem, 3.8vw, 3.4rem)', lineHeight: 1.12, textWrap: 'balance' }}>
            <span style={{ color: ACCENT }}>“</span>{quote || subtitle}
          </p>
          {plain(rest) && (
            <div className="rich-text-content text-base leading-relaxed max-w-xl [&_p]:mb-3 [&_p:empty]:hidden" style={{ color: BODY }} dangerouslySetInnerHTML={{ __html: rest }} />
          )}
        </div>
        <form onSubmit={submit} className="flex flex-col gap-2 lg:pt-10" data-testid="gem2i-contact-form">
          <input value={form.name} onChange={set('name')} onFocus={on} onBlur={off} required autoComplete="name"
            placeholder={tt(cs.name_placeholder) || tt({ en: 'Your name', es: 'Tu nombre' })} aria-label={tt({ en: 'Your name', es: 'Tu nombre' })}
            className={field} style={{ borderColor: LINE }} />
          <input type="email" value={form.email} onChange={set('email')} onFocus={on} onBlur={off} required autoComplete="email"
            placeholder={tt(cs.email_placeholder) || tt({ en: 'Email address', es: 'Correo electrónico' })} aria-label={tt({ en: 'Email address', es: 'Correo electrónico' })}
            className={field} style={{ borderColor: LINE }} />
          <textarea value={form.message} onChange={set('message')} onFocus={on} onBlur={off} required rows={4}
            placeholder={tt(cs.message_placeholder) || tt({ en: 'How can we help?', es: '¿Cómo podemos ayudarte?' })} aria-label={tt({ en: 'Message', es: 'Mensaje' })}
            className={`${field} resize-none`} style={{ borderColor: LINE }} />
          <div className="pt-4"><CaptchaWidget onChange={setCaptchaToken} theme="dark" testId="gem2i-contact-captcha" /></div>
          <button type="submit" disabled={sending}
            className="self-start mt-4 inline-flex items-center gap-2 font-semibold text-sm px-7 py-4 rounded-full text-white transition-[opacity,transform] hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
            style={{ backgroundColor: ACCENT }} data-testid="gem2i-contact-submit">
            {sending && <Loader2 className="w-4 h-4 animate-spin" />}
            {tt(cs.submit_text) || tt({ en: 'Send message', es: 'Enviar mensaje' })}
            {!sending && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </section>
  );
}
