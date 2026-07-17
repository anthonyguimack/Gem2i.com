import React, { useEffect, useState } from 'react';
import { Loader2, Ticket, QrCode } from 'lucide-react';
import { gemAPI } from '../../lib/api';
import { useMember } from '../../lib/memberAuth';
import { useT } from '../../lib/i18n';
import { gemImg } from './GemCatalogBits';

/** E-ticket purchase widget (plan B1, Phase 5) for eticket events.
 *  Tier prices are public (legacy parity); buying is member-gated. Checkout
 *  redirects to Stripe; completion is verified server-side (webhook AND the
 *  success-page poll both re-check with Stripe's API). */
export default function GemTicketWidget({ event }) {
  const tt = useT();
  const { member } = useMember();
  const [avail, setAvail] = useState(null);   // {tiers, currency}
  const [myTickets, setMyTickets] = useState([]);
  const [qty, setQty] = useState({});         // tier -> quantity
  const [busyTier, setBusyTier] = useState(null);
  const [error, setError] = useState('');

  const isEticket = event?.type === 'eticket';
  const isPast = (event?.event_date || '') < new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!isEticket || !event?.id) return;
    gemAPI.tierAvailability(event.id).then(r => setAvail(r.data)).catch(() => setAvail({ tiers: {} }));
  }, [isEticket, event?.id]);

  useEffect(() => {
    if (!isEticket || !member || !event?.id) { setMyTickets([]); return; }
    gemAPI.myTickets(event.id).then(r => setMyTickets(r.data?.items || [])).catch(() => {});
  }, [isEticket, member, event?.id]);

  if (!isEticket || isPast) return null;
  const tiers = avail?.tiers || {};
  const tierKeys = Object.keys(tiers);
  if (avail && tierKeys.length === 0 && myTickets.length === 0) return null; // no tiers configured

  const currency = (avail?.currency || 'usd').toUpperCase();
  const mutedText = { color: 'var(--color-body-text, #9AA6B2)' };

  const buy = async (tierKey) => {
    if (!member) { window.dispatchEvent(new CustomEvent('gem2i:open-login')); return; }
    setBusyTier(tierKey); setError('');
    try {
      const r = await gemAPI.checkout(event.id, tierKey, qty[tierKey] || 1);
      window.location.assign(r.data.url); // → Stripe Checkout
    } catch (e) {
      const detail = e.response?.data?.detail;
      setError(detail === 'tier_sold_out'
        ? tt({ en: 'That tier just sold out.', es: 'Ese nivel se acaba de agotar.' })
        : (typeof detail === 'string' ? detail : tt({ en: 'Checkout failed. Try again.', es: 'El pago falló. Inténtalo de nuevo.' })));
      gemAPI.tierAvailability(event.id).then(r => setAvail(r.data)).catch(() => {});
      setBusyTier(null);
    }
  };

  return (
    <div className="mt-8 rounded-sm border p-6" data-testid="ticket-widget"
      style={{ borderColor: 'var(--color-card-border, rgba(255,255,255,0.08))', backgroundColor: 'var(--color-card-bg, #0D1721)' }}>
      <p className="text-xs font-semibold uppercase tracking-[0.25em] mb-4 inline-flex items-center gap-2"
        style={{ color: 'var(--color-accent, #3287B7)' }}>
        <Ticket className="w-4 h-4" /> {tt({ en: 'E-Tickets', es: 'E-Tickets' })}
      </p>

      {myTickets.length > 0 && (
        <div className="mb-5 pb-5 border-b" style={{ borderColor: 'var(--color-card-border, rgba(255,255,255,0.08))' }}>
          {myTickets.map(t => (
            <div key={t.id} className="flex items-center gap-4 py-2">
              {t.qr?.image_url && (
                <img src={gemImg(t.qr.image_url)} alt="QR ticket" width="72" height="72"
                  className="rounded-sm bg-white p-1 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-white/90 text-sm font-semibold inline-flex items-center gap-2">
                  <QrCode className="w-4 h-4" style={{ color: 'var(--color-accent, #3287B7)' }} />
                  {t.quantity} × {t.tier_label}
                </p>
                <p className="text-xs" style={mutedText}>
                  {tt({ en: 'Code', es: 'Código' })}: <span className="tabular-nums">{t.qr?.code}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {!avail ? <Loader2 className="w-5 h-5 animate-spin" style={mutedText} /> : (
        <div className="space-y-3">
          {tierKeys.map(k => {
            const t = tiers[k];
            const soldOut = t.available <= 0;
            const maxQ = Math.min(6, t.available);
            return (
              <div key={k} className="flex flex-wrap items-center gap-3 py-2 border-b last:border-b-0"
                style={{ borderColor: 'var(--color-card-border, rgba(255,255,255,0.08))' }}>
                <div className="flex-1 min-w-[140px]">
                  <p className="text-white/90 text-sm font-semibold">{t.label}</p>
                  <p className="text-xs" style={mutedText}>
                    {soldOut
                      ? tt({ en: 'Sold out', es: 'Agotado' })
                      : `${t.available} ${tt({ en: 'left', es: 'disponibles' })}`}
                  </p>
                </div>
                <p className="text-white font-semibold text-sm tabular-nums">
                  {t.price.toFixed(2)} <span className="text-xs font-normal" style={mutedText}>{currency}</span>
                </p>
                {!soldOut && (
                  <>
                    <select value={qty[k] || 1} onChange={(e) => setQty({ ...qty, [k]: Number(e.target.value) })}
                      className="px-2 py-1.5 text-sm rounded-sm border bg-transparent text-white [color-scheme:dark]"
                      style={{ borderColor: 'var(--color-card-border, rgba(255,255,255,0.08))' }}
                      aria-label={tt({ en: 'Quantity', es: 'Cantidad' })}>
                      {Array.from({ length: maxQ }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <button type="button" onClick={() => buy(k)} disabled={busyTier !== null}
                      className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-sm transition-opacity hover:opacity-85 disabled:opacity-40"
                      style={{ backgroundColor: 'var(--color-button-bg, #3287B7)', color: 'var(--color-button-text, #fff)' }}
                      data-testid={`buy-${k}`}>
                      {busyTier === k && <Loader2 className="w-4 h-4 animate-spin" />}
                      {member ? tt({ en: 'Buy', es: 'Comprar' }) : tt({ en: 'Log in to buy', es: 'Inicia sesión' })}
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
      <p className="mt-4 text-[11px]" style={mutedText}>
        {tt({ en: 'Secure payment via Stripe. Tickets arrive by email and appear here after payment.',
              es: 'Pago seguro con Stripe. Los tickets llegan por email y aparecen aquí tras el pago.' })}
      </p>
    </div>
  );
}
