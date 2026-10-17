import React, { useEffect, useState } from 'react';
import { Loader2, Ticket, QrCode, Tag, X } from 'lucide-react';
import { gemAPI } from '../../lib/api';
import { useMember } from '../../lib/memberAuth';
import { useT } from '../../lib/i18n';
import { gemImg } from './GemCatalogBits';
import GemFormalNameDialog from './GemFormalNameDialog';

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
  const [formalOpen, setFormalOpen] = useState(false);
  const [formalRetryTier, setFormalRetryTier] = useState(null); // retry buy after B7 confirmation
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState(null);          // validated {code, discount_type, discount_value}
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponError, setCouponError] = useState('');

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

  const COUPON_ERR = {
    coupon_invalid: { en: 'That coupon does not exist or is no longer active.', es: 'Ese cupón no existe o ya no está activo.' },
    coupon_expired: { en: 'That coupon has expired.', es: 'Ese cupón ya venció.' },
    coupon_not_applicable: { en: 'That coupon is not valid for this event.', es: 'Ese cupón no es válido para este evento.' },
    coupon_used_up: { en: 'That coupon has no uses left.', es: 'Ese cupón ya no tiene usos disponibles.' },
  };
  const discounted = (price) => {
    if (!coupon) return price;
    const d = coupon.discount_type === 'percent' ? price * coupon.discount_value / 100 : coupon.discount_value;
    return Math.max(0, Math.round((price - Math.min(d, price)) * 100) / 100);
  };
  const applyCoupon = async (e) => {
    e.preventDefault();
    if (!member) { window.dispatchEvent(new CustomEvent('gem2i:open-login')); return; }
    const code = couponInput.trim();
    if (!code) return;
    const prices = tierKeys.map(k => tiers[k].price).filter(p => p > 0);
    setCouponBusy(true); setCouponError('');
    try {
      const r = await gemAPI.validateCoupon(code, 'tickets', Math.max(...prices, 1), event.id);
      setCoupon(r.data);
    } catch (err) {
      const d = err.response?.data?.detail;
      setCoupon(null);
      setCouponError(COUPON_ERR[d] ? tt(COUPON_ERR[d]) : tt({ en: 'Could not apply the coupon.', es: 'No se pudo aplicar el cupón.' }));
    }
    setCouponBusy(false);
  };

  const buy = async (tierKey) => {
    if (!member) { window.dispatchEvent(new CustomEvent('gem2i:open-login')); return; }
    setBusyTier(tierKey); setError('');
    try {
      const r = await gemAPI.checkout(event.id, tierKey, qty[tierKey] || 1, coupon?.code);
      window.location.assign(r.data.url); // → Stripe Checkout (or the success page for a 100% coupon)
    } catch (e) {
      const detail = e.response?.data?.detail;
      if (detail === 'formal_name_confirmation_required') {
        // B7 gate — confirm the legal name, then retry the purchase
        setFormalRetryTier(tierKey);
        setFormalOpen(true);
        setBusyTier(null);
        return;
      }
      setError(detail === 'tier_sold_out'
        ? tt({ en: 'That tier just sold out.', es: 'Ese nivel se acaba de agotar.' })
        : COUPON_ERR[detail] ? tt(COUPON_ERR[detail])
        : detail === 'amount_below_minimum' ? tt({ en: 'After the coupon the total is below the minimum card charge (0.50).', es: 'Con el cupón el total queda por debajo del cobro mínimo con tarjeta (0.50).' })
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
                <img src={gemImg(t.qr.image_url)} alt={tt({ en: 'QR ticket', es: 'Entrada QR' })} width="72" height="72"
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
                  {coupon && discounted(t.price) !== t.price && (
                    <span className="line-through mr-2 font-normal text-xs" style={mutedText}>{t.price.toFixed(2)}</span>
                  )}
                  {discounted(t.price).toFixed(2)} <span className="text-xs font-normal" style={mutedText}>{currency}</span>
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
      {avail && tierKeys.length > 0 && (
        <div className="mt-4" data-testid="ticket-coupon">
          {coupon ? (
            <p className="text-xs inline-flex items-center gap-2" style={{ color: 'var(--color-accent, #3287B7)' }}>
              <Tag className="w-3.5 h-3.5" />
              {tt({ en: 'Coupon', es: 'Cupón' })} <span className="font-semibold tracking-wide">{coupon.code}</span>
              · {coupon.discount_type === 'percent' ? `-${coupon.discount_value}%` : `-${Number(coupon.discount_value).toFixed(2)} ${currency}`}
              <button type="button" onClick={() => { setCoupon(null); setCouponInput(''); }} className="p-1 -m-1 opacity-70 hover:opacity-100"
                aria-label={tt({ en: 'Remove coupon', es: 'Quitar cupón' })}><X className="w-3.5 h-3.5" /></button>
            </p>
          ) : !couponOpen ? (
            <button type="button" onClick={() => setCouponOpen(true)} className="text-xs underline-offset-4 hover:underline py-1"
              style={mutedText} data-testid="ticket-coupon-toggle">
              {tt({ en: 'Have a coupon?', es: '¿Tienes un cupón?' })}
            </button>
          ) : (
            <form onSubmit={applyCoupon} className="flex gap-2 max-w-xs">
              <input value={couponInput} onChange={e => setCouponInput(e.target.value.toUpperCase())}
                placeholder={tt({ en: 'Coupon code', es: 'Código de cupón' })} autoFocus
                aria-label={tt({ en: 'Coupon code', es: 'Código de cupón' })}
                className="flex-1 min-w-0 px-3 py-2 text-sm rounded-sm border bg-transparent text-white uppercase tracking-wide"
                style={{ borderColor: 'var(--color-card-border, rgba(255,255,255,0.08))' }} data-testid="ticket-coupon-input" />
              <button type="submit" disabled={couponBusy || !couponInput.trim()}
                className="px-4 py-2 text-sm font-medium rounded-sm border text-white disabled:opacity-40 inline-flex items-center gap-1.5"
                style={{ borderColor: 'var(--color-accent, #3287B7)' }}>
                {couponBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}{tt({ en: 'Apply', es: 'Aplicar' })}
              </button>
            </form>
          )}
          {couponError && <p className="mt-2 text-xs text-red-400" role="alert">{couponError}</p>}
        </div>
      )}
      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
      <p className="mt-4 text-[11px]" style={mutedText}>
        {tt({ en: 'Secure payment via Stripe. Tickets arrive by email and appear here after payment.',
              es: 'Pago seguro con Stripe. Los tickets llegan por email y aparecen aquí tras el pago.' })}
      </p>
      <GemFormalNameDialog open={formalOpen}
        onClose={() => { setFormalOpen(false); setFormalRetryTier(null); }}
        onConfirmed={() => { setFormalOpen(false); const t = formalRetryTier; setFormalRetryTier(null); if (t) buy(t); }} />
    </div>
  );
}
