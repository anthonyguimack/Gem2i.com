import React, { useState } from 'react';
import { Mail, X, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { contactAPI } from '../../lib/api';
import { useSettings } from '../../App';
import { useT } from '../../lib/i18n';

const GEM_FONT = "'Poppins', sans-serif";

/**
 * gem2i side contact panel — port of the legacy site's fixed right-edge
 * "Contact Us" tab + slide-in form (contacts_ok.php pipeline → POST /api/contact,
 * server-guarded by rate-limit + CMS-managed captcha). Copy comes from
 * settings.contact_settings (EN/ES localizable in the CMS).
 */
export default function Gem2iContactPanel({ open, onClose }) {
  const settings = useSettings();
  const tt = useT();
  const cs = settings.contact_settings || {};
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sending, setSending] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await contactAPI.submit({ ...form, subject: 'gem2i contact panel' });
      toast.success(tt({ en: 'Message sent — we will get back to you.', es: 'Mensaje enviado — te responderemos pronto.' }));
      setForm({ name: '', email: '', message: '' });
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || tt({ en: 'Could not send the message.', es: 'No se pudo enviar el mensaje.' }));
    } finally { setSending(false); }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[70] bg-black/60 transition-opacity duration-300 motion-reduce:transition-none ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <aside
        className={`fixed top-0 right-0 z-[71] h-full w-full max-w-md transform transition-transform duration-300 ease-out motion-reduce:transition-none ${open ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ backgroundColor: 'var(--color-section-bg, #0A121A)', fontFamily: GEM_FONT }}
        role="dialog" aria-modal="true" aria-label={tt(cs.title) || 'Contact'}
        data-testid="gem2i-contact-panel"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: 'var(--color-card-border, rgba(255,255,255,0.08))' }}>
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4" style={{ color: 'var(--color-accent, #3287B7)' }} />
            <h2 className="text-white text-base font-semibold tracking-wide uppercase">{tt(cs.title) || 'Contact Us'}</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 text-white/60 hover:text-white transition-colors" data-testid="gem2i-contact-close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto h-[calc(100%-73px)]">
          {tt(cs.description) && <p className="text-sm mb-6" style={{ color: 'var(--color-body-text, #9AA6B2)' }}>{tt(cs.description)}</p>}
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-white/70 mb-1.5" htmlFor="gem2i-contact-name">{tt({ en: 'Name', es: 'Nombre' })}</label>
              <input id="gem2i-contact-name" type="text" required value={form.name} onChange={set('name')}
                placeholder={tt(cs.name_placeholder) || tt({ en: 'Your name', es: 'Tu nombre' })}
                className="w-full px-3.5 py-2.5 text-sm text-white rounded-sm bg-white/5 border focus:outline-none focus:border-[var(--color-accent,#3287B7)] placeholder:text-white/40"
                style={{ borderColor: 'var(--color-card-border, rgba(255,255,255,0.08))' }}
                data-testid="gem2i-contact-name" />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-white/70 mb-1.5" htmlFor="gem2i-contact-email">{tt({ en: 'Email', es: 'Correo' })}</label>
              <input id="gem2i-contact-email" type="email" required value={form.email} onChange={set('email')}
                placeholder={tt(cs.email_placeholder) || tt({ en: 'Your email', es: 'Tu correo' })}
                className="w-full px-3.5 py-2.5 text-sm text-white rounded-sm bg-white/5 border focus:outline-none focus:border-[var(--color-accent,#3287B7)] placeholder:text-white/40"
                style={{ borderColor: 'var(--color-card-border, rgba(255,255,255,0.08))' }}
                data-testid="gem2i-contact-email" />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-white/70 mb-1.5" htmlFor="gem2i-contact-message">{tt({ en: 'Message', es: 'Mensaje' })}</label>
              <textarea id="gem2i-contact-message" required rows={6} value={form.message} onChange={set('message')}
                placeholder={tt(cs.message_placeholder) || tt({ en: 'Your message', es: 'Tu mensaje' })}
                className="w-full px-3.5 py-2.5 text-sm text-white rounded-sm bg-white/5 border focus:outline-none focus:border-[var(--color-accent,#3287B7)] placeholder:text-white/40 resize-none"
                style={{ borderColor: 'var(--color-card-border, rgba(255,255,255,0.08))' }}
                data-testid="gem2i-contact-message" />
            </div>
            <button type="submit" disabled={sending}
              className="w-full py-3 rounded-sm text-sm font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-button-bg, #3287B7)', color: 'var(--color-button-text, #fff)' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-button-hover-bg, #4DA3D4)'; e.currentTarget.style.color = 'var(--color-button-hover-text, #04080C)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--color-button-bg, #3287B7)'; e.currentTarget.style.color = 'var(--color-button-text, #fff)'; }}
              data-testid="gem2i-contact-submit">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {tt(cs.submit_text) || tt({ en: 'Send Message', es: 'Enviar Mensaje' })}
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}

/** Fixed right-edge vertical tab that opens the contact panel (legacy signature). */
export function Gem2iContactTab({ onOpen }) {
  const tt = useT();
  return (
    <button
      onClick={onOpen}
      className="hidden md:flex fixed right-0 top-1/2 -translate-y-1/2 z-[60] items-center gap-2 px-3 py-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition-colors"
      style={{ backgroundColor: 'var(--color-accent, #3287B7)', writingMode: 'vertical-rl', fontFamily: GEM_FONT, borderRadius: '4px 0 0 4px' }}
      data-testid="gem2i-contact-tab"
      aria-label={tt({ en: 'Open contact panel', es: 'Abrir panel de contacto' })}
    >
      {tt({ en: 'Contact Us', es: 'Contáctanos' })}
    </button>
  );
}
