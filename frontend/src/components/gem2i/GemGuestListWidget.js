import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, QrCode, Users, Clock, Check, X } from 'lucide-react';
import { gemAPI } from '../../lib/api';
import { useMember } from '../../lib/memberAuth';
import { useT } from '../../lib/i18n';
import { gemImg } from './GemCatalogBits';

/** Guest-list widget for the event detail page (plan A8, Phase 4).
 *  States: logged-out prompt → eligible join (benefit info, additional-guest
 *  select, availability) → pass issued (QR + cancel) → full (waiting list
 *  join/leave) → not eligible. Identity always from the JWT; the widget only
 *  ever posts the event id. Legacy parity: interactions are member-gated. */
export default function GemGuestListWidget({ event }) {
  const tt = useT();
  const { member } = useMember();
  const [status, setStatus] = useState(null);   // my-event-status payload
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [additional, setAdditional] = useState(0);

  const isGuestList = event?.type === 'guest_list';
  const isPast = (event?.event_date || '') < new Date().toISOString().slice(0, 10);

  const load = useCallback(() => {
    if (!member || !event?.id) { setStatus(null); return; }
    gemAPI.myEventStatus(event.id)
      .then(r => setStatus(r.data))
      .catch(() => setStatus(null));
  }, [member, event?.id]);
  useEffect(() => { load(); }, [load]);

  if (!isGuestList || isPast) return null;

  const box = (children) => (
    <div className="mt-8 rounded-sm border p-6" data-testid="guest-list-widget"
      style={{ borderColor: 'var(--color-card-border, rgba(255,255,255,0.08))', backgroundColor: 'var(--color-card-bg, #0D1721)' }}>
      <p className="text-xs font-semibold uppercase tracking-[0.25em] mb-4 inline-flex items-center gap-2"
        style={{ color: 'var(--color-accent, #3287B7)' }}>
        <Users className="w-4 h-4" /> {tt({ en: 'Guest List', es: 'Lista de Invitados' })}
      </p>
      {children}
      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
    </div>
  );

  const primaryBtn = (label, onClick, disabled) => (
    <button type="button" onClick={onClick} disabled={disabled || busy}
      className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-sm transition-opacity hover:opacity-85 disabled:opacity-40"
      style={{ backgroundColor: 'var(--color-button-bg, #3287B7)', color: 'var(--color-button-text, #fff)' }}>
      {busy && <Loader2 className="w-4 h-4 animate-spin" />} {label}
    </button>
  );

  const mutedText = { color: 'var(--color-body-text, #9AA6B2)' };

  // ---- logged out: prompt to log in (legacy: detail interactions are gated)
  if (!member) {
    return box(
      <>
        <p className="text-sm" style={mutedText}>
          {tt({ en: 'This event has a members guest list. Log in to join.', es: 'Este evento tiene lista de invitados para miembros. Inicia sesión para unirte.' })}
        </p>
        <div className="mt-4">
          {primaryBtn(tt({ en: 'Log in to join', es: 'Iniciar sesión' }),
            () => window.dispatchEvent(new CustomEvent('gem2i:open-login')))}
        </div>
      </>
    );
  }

  if (!status) {
    return box(<Loader2 className="w-5 h-5 animate-spin" style={mutedText} />);
  }

  const gl = status.guest_list;
  if (!gl) return null; // event has no configured guest list yet

  const run = async (fn) => {
    setBusy(true); setError('');
    try { await fn(); load(); }
    catch (e) {
      const detail = e.response?.data?.detail;
      if (detail === 'guest_list_full') { load(); }
      else setError(typeof detail === 'string' ? detail : tt({ en: 'Something went wrong. Try again.', es: 'Algo salió mal. Inténtalo de nuevo.' }));
    }
    setBusy(false);
  };

  // ---- pass issued: QR + cancel
  if (status.pass) {
    const qr = status.pass.qr || {};
    return box(
      <div className="flex flex-col sm:flex-row gap-6 items-start">
        {qr.image_url && (
          <img src={gemImg(qr.image_url)} alt="QR pass" width="140" height="140"
            className="rounded-sm bg-white p-2 shrink-0" data-testid="guest-pass-qr" />
        )}
        <div>
          <p className="text-white text-sm font-semibold inline-flex items-center gap-2">
            <Check className="w-4 h-4" style={{ color: 'var(--color-accent, #3287B7)' }} />
            {tt({ en: "You're on the list", es: 'Estás en la lista' })}
          </p>
          <p className="mt-1 text-xs" style={mutedText}>
            {tt({ en: 'Pass code', es: 'Código del pase' })}: <span className="tabular-nums">{qr.code}</span>
            {status.pass.guest_additional > 0 && (
              <> · {tt({ en: 'Additional guests', es: 'Invitados adicionales' })}: {status.pass.guest_additional}</>
            )}
          </p>
          <p className="mt-1 text-xs" style={mutedText}>
            {tt({ en: 'Show the QR at the door. A copy was emailed to you.', es: 'Muestra el QR en la puerta. Te enviamos una copia por email.' })}
          </p>
          <button type="button" disabled={busy}
            onClick={() => window.confirm(tt({ en: 'Cancel your pass? Your spot goes back to the list.', es: '¿Cancelar tu pase? Tu lugar vuelve a la lista.' }))
              && run(() => gemAPI.cancelGuestPass(event.id))}
            className="mt-4 inline-flex items-center gap-1.5 text-xs transition-colors hover:text-red-400"
            style={mutedText} data-testid="cancel-pass-btn">
            <X className="w-3.5 h-3.5" /> {tt({ en: 'Cancel my pass', es: 'Cancelar mi pase' })}
          </button>
        </div>
      </div>
    );
  }

  // ---- not eligible for this event's guest list
  if (!status.eligible) {
    return box(
      <p className="text-sm" style={mutedText}>
        {tt({ en: 'Your membership type is not eligible for this guest list.', es: 'Tu tipo de membresía no es elegible para esta lista de invitados.' })}
      </p>
    );
  }

  const full = gl.available <= 0;

  // ---- full: waiting list join / leave
  if (full) {
    return box(
      status.waiting ? (
        <>
          <p className="text-sm text-white/90 inline-flex items-center gap-2">
            <Clock className="w-4 h-4" style={{ color: 'var(--color-accent, #3287B7)' }} />
            {tt({ en: "You're on the waiting list.", es: 'Estás en la lista de espera.' })}
          </p>
          <p className="mt-1 text-xs" style={mutedText}>
            {tt({ en: 'Spots that free up are offered in order.', es: 'Los lugares liberados se ofrecen en orden.' })}
          </p>
          <button type="button" disabled={busy} onClick={() => run(() => gemAPI.leaveWaitingList(event.id))}
            className="mt-4 inline-flex items-center gap-1.5 text-xs transition-colors hover:text-red-400" style={mutedText}>
            <X className="w-3.5 h-3.5" /> {tt({ en: 'Leave the waiting list', es: 'Salir de la lista de espera' })}
          </button>
        </>
      ) : (
        <>
          <p className="text-sm" style={mutedText}>
            {tt({ en: 'The guest list is full.', es: 'La lista de invitados está llena.' })}
          </p>
          <div className="mt-4">
            {primaryBtn(tt({ en: 'Join the waiting list', es: 'Unirme a la lista de espera' }),
              () => run(() => gemAPI.joinWaitingList(event.id)))}
          </div>
        </>
      )
    );
  }

  // ---- eligible: join (with optional additional guests)
  const benefit = status.benefit || {};
  const ranges = (gl.additional_enabled && Array.isArray(gl.ranges)) ? gl.ranges : [];
  return box(
    <>
      <p className="text-sm" style={mutedText}>
        {tt({ en: 'Spots available', es: 'Lugares disponibles' })}: <span className="text-white/90 font-semibold tabular-nums">{gl.available}</span>
        {benefit.free_until && (
          <> · {tt({ en: 'Free until', es: 'Gratis hasta' })} {String(benefit.free_until).replace('T', ' ')}</>
        )}
      </p>
      {benefit.additional_title && (
        <p className="mt-1 text-xs" style={mutedText}>{benefit.additional_title}</p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {ranges.length > 0 && (
          <label className="text-xs inline-flex items-center gap-2" style={mutedText}>
            {tt({ en: 'Additional guests', es: 'Invitados adicionales' })}
            <select value={additional} onChange={(e) => setAdditional(Number(e.target.value))}
              className="px-2 py-1.5 text-sm rounded-sm border bg-transparent text-white [color-scheme:dark]"
              style={{ borderColor: 'var(--color-card-border, rgba(255,255,255,0.08))' }}>
              <option value={0}>0</option>
              {ranges.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
        )}
        {primaryBtn(
          <span className="inline-flex items-center gap-2"><QrCode className="w-4 h-4" /> {tt({ en: 'Join the guest list', es: 'Unirme a la lista' })}</span>,
          () => run(() => gemAPI.joinGuestList(event.id, additional)))}
      </div>
    </>
  );
}
