import React, { useEffect, useRef, useState } from 'react';
import { Loader2, BadgeCheck, X } from 'lucide-react';
import { gemAPI } from '../../lib/api';
import { useT } from '../../lib/i18n';

/** B7 formal-name confirmation dialog (Phase 3 — legacy parity).
 *  The legacy site intercepted guest-list joins and ticket purchases with the
 *  #confirmation_formal_name modal until the member confirmed their legal name
 *  (as per their I.D.). The rebuilt gate lets the member confirm or correct the
 *  name right here (the old "change" flow lived in the retired My Account).
 *  Open it when an action returns 403 `formal_name_confirmation_required`;
 *  `onConfirmed` fires after a successful confirmation so the caller can retry. */
export default function GemFormalNameDialog({ open, onClose, onConfirmed }) {
  const tt = useT();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setError('');
    setLoading(true);
    gemAPI.formalName()
      .then(r => setName(r.data?.formal_name || ''))
      .catch(() => {})
      .finally(() => { setLoading(false); setTimeout(() => inputRef.current?.focus(), 50); });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const confirm = async () => {
    const trimmed = name.replace(/\s+/g, ' ').trim();
    if (trimmed.length < 3) {
      setError(tt({ en: 'Please enter your full legal name.', es: 'Ingresa tu nombre legal completo.' }));
      return;
    }
    setBusy(true); setError('');
    try {
      await gemAPI.confirmFormalName(trimmed);
      onConfirmed?.(trimmed);
    } catch (e) {
      const detail = e.response?.data?.detail;
      setError(typeof detail === 'string' ? detail
        : tt({ en: 'Something went wrong. Try again.', es: 'Algo salió mal. Inténtalo de nuevo.' }));
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      role="dialog" aria-modal="true" aria-label={tt({ en: 'Legal name confirmation', es: 'Confirmación de nombre legal' })}
      data-testid="formal-name-dialog">
      <button type="button" aria-hidden="true" tabIndex={-1} onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-default" />
      <div className="relative w-full max-w-md rounded-sm border p-6"
        style={{ borderColor: 'var(--color-card-border, rgba(255,255,255,0.08))', backgroundColor: 'var(--color-card-bg, #0D1721)' }}>
        <button type="button" onClick={onClose} aria-label={tt({ en: 'Close', es: 'Cerrar' })}
          className="absolute top-4 right-4 transition-colors hover:text-white"
          style={{ color: 'var(--color-body-text, #9AA6B2)' }}>
          <X className="w-4 h-4" />
        </button>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] mb-3 inline-flex items-center gap-2"
          style={{ color: 'var(--color-accent, #3287B7)' }}>
          <BadgeCheck className="w-4 h-4" /> {tt({ en: 'Confirmation', es: 'Confirmación' })}
        </p>
        <p className="text-sm text-white/90">
          {tt({
            en: 'Before completing any transaction, please confirm your legal name (as it appears on your I.D.). It will be used for all transactions within our community.',
            es: 'Antes de completar cualquier transacción, confirma tu nombre legal (tal como aparece en tu documento de identidad). Se usará para todas las transacciones en nuestra comunidad.',
          })}
        </p>
        {loading ? (
          <Loader2 className="mt-5 w-5 h-5 animate-spin" style={{ color: 'var(--color-body-text, #9AA6B2)' }} />
        ) : (
          <>
            <input ref={inputRef} type="text" value={name} maxLength={100}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') confirm(); }}
              placeholder={tt({ en: 'Full legal name (as I.D.)', es: 'Nombre legal completo (según I.D.)' })}
              className="mt-4 w-full px-3 py-2.5 text-sm rounded-sm border bg-transparent text-white placeholder-white/30 outline-none focus:border-white/30"
              style={{ borderColor: 'var(--color-card-border, rgba(255,255,255,0.08))' }}
              data-testid="formal-name-input" />
            {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
            <div className="mt-5 flex items-center gap-3">
              <button type="button" onClick={confirm} disabled={busy}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-sm transition-opacity hover:opacity-85 disabled:opacity-40"
                style={{ backgroundColor: 'var(--color-button-bg, #3287B7)', color: 'var(--color-button-text, #fff)' }}
                data-testid="formal-name-confirm">
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                {tt({ en: 'Confirm now', es: 'Confirmar ahora' })}
              </button>
              <button type="button" onClick={onClose} disabled={busy}
                className="text-xs transition-colors hover:text-white"
                style={{ color: 'var(--color-body-text, #9AA6B2)' }}>
                {tt({ en: 'Not now', es: 'Ahora no' })}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
