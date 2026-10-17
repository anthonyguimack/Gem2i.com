import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { Crown, Check, Loader2, Tag, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { gemAPI } from '../../lib/api';
import { useMember } from '../../lib/memberAuth';
import { useT, useLang } from '../../lib/i18n';

/**
 * gem2i My Account 2.0 — paid membership (F5). Monthly / annual plan, one
 * payment per period, coupons apply. Coming back from Stripe the page polls
 * the session (the server re-verifies with Stripe) and refreshes the member,
 * whose level — and so the sidebar — changes on activation.
 */
const L = {
  title: { en: 'Membership', es: 'Membresía' },
  active: { en: 'Active until {d}', es: 'Activa hasta el {d}' },
  lapsed: { en: 'Your membership expired on {d}. Renew to get your benefits back.', es: 'Tu membresía venció el {d}. Renuévala para recuperar tus beneficios.' },
  monthly: { en: 'Monthly', es: 'Mensual' },
  annual: { en: 'Annual', es: 'Anual' },
  perMonth: { en: '30 days', es: '30 días' },
  perYear: { en: '365 days', es: '365 días' },
  save: { en: 'Save {p}%', es: 'Ahorra {p}%' },
  join: { en: 'Get membership', es: 'Obtener membresía' },
  renew: { en: 'Renew / extend', es: 'Renovar / extender' },
  extendNote: { en: 'Renewing adds the new period after your current expiry.', es: 'Al renovar, el nuevo periodo se suma después de tu vencimiento actual.' },
  coupon: { en: 'Have a coupon?', es: '¿Tienes un cupón?' },
  couponCode: { en: 'Coupon code', es: 'Código de cupón' },
  apply: { en: 'Apply', es: 'Aplicar' },
  removeCoupon: { en: 'Remove coupon', es: 'Quitar cupón' },
  total: { en: 'Total', es: 'Total' },
  secure: { en: 'Secure one-time payment via Stripe. It does not renew automatically.', es: 'Pago único y seguro con Stripe. No se renueva automáticamente.' },
  confirming: { en: 'Confirming your payment…', es: 'Confirmando tu pago…' },
  welcome: { en: 'Your membership is active. Welcome!', es: 'Tu membresía está activa. ¡Bienvenido!' },
  pendingPay: { en: 'We have not received the payment yet. If you paid, refresh in a minute.', es: 'Aún no recibimos el pago. Si ya pagaste, actualiza en un minuto.' },
  unavailable: { en: 'The membership is not available right now.', es: 'La membresía no está disponible en este momento.' },
  history: { en: 'Payment history', es: 'Historial de pagos' },
  error: { en: 'Something went wrong. Try again.', es: 'Algo salió mal. Inténtalo de nuevo.' },
  coupon_invalid: { en: 'That coupon does not exist or is no longer active.', es: 'Ese cupón no existe o ya no está activo.' },
  coupon_expired: { en: 'That coupon has expired.', es: 'Ese cupón ya venció.' },
  coupon_not_applicable: { en: 'That coupon is not valid for the membership.', es: 'Ese cupón no es válido para la membresía.' },
  coupon_used_up: { en: 'That coupon has no uses left.', es: 'Ese cupón ya no tiene usos disponibles.' },
  amount_below_minimum: { en: 'After the coupon the total is below the minimum card charge (0.50).', es: 'Con el cupón el total queda por debajo del cobro mínimo con tarjeta (0.50).' },
};

export default function Membership() {
  const tt = useT();
  const { lang } = useLang();
  const { refresh } = useMember();
  const ctx = useOutletContext() || {};
  const title = ctx.sectionLabel ? ctx.sectionLabel('membership', tt(L.title)) : tt(L.title);
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [plan, setPlan] = useState('annual');
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [quote, setQuote] = useState(null);       // {price, discount, total} with the coupon
  const [coupon, setCoupon] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(() => {
    setError(false);
    return gemAPI.myMembership().then(r => {
      setData(r.data);
      const p = r.data?.offer?.prices || {};
      if (!(p.annual > 0) && p.monthly > 0) setPlan('monthly');
    }).catch(() => setError(true));
  }, []);
  useEffect(() => { load(); }, [load]);

  // Back from Stripe (or a 100% coupon): confirm, refresh the member, clean the URL.
  useEffect(() => {
    const sid = params.get('session_id');
    if (!sid) return;
    setConfirming(true);
    gemAPI.membershipStatus(sid).then(async r => {
      if (r.data?.payment_status === 'paid') {
        toast.success(tt(L.welcome));
        if (refresh) await refresh();
        await load();
      } else {
        toast(tt(L.pendingPay));
      }
    }).catch(() => toast.error(tt(L.error))).finally(() => {
      setConfirming(false);
      params.delete('session_id');
      setParams(params, { replace: true });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const errText = (e) => {
    const d = e?.response?.data?.detail;
    return L[d] ? tt(L[d]) : tt(L.error);
  };

  const applyCoupon = async (e) => {
    e.preventDefault();
    const code = couponInput.trim();
    if (!code) return;
    setBusy(true);
    try {
      const r = await gemAPI.membershipQuote(plan, code);
      setQuote(r.data);
      setCoupon(code);
    } catch (err) { toast.error(errText(err)); }
    setBusy(false);
  };

  // Re-quote when the plan changes while a coupon is applied.
  useEffect(() => {
    if (!coupon) { setQuote(null); return; }
    gemAPI.membershipQuote(plan, coupon).then(r => setQuote(r.data)).catch(err => {
      toast.error(errText(err)); setCoupon(''); setQuote(null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  const checkout = async () => {
    setBusy(true);
    try {
      const r = await gemAPI.membershipCheckout(plan, coupon || undefined);
      window.location.assign(r.data.url);
    } catch (err) { toast.error(errText(err)); setBusy(false); }
  };

  const v = (name, fb) => `var(--ma-${name}, ${fb})`;
  const locale = lang === 'es' ? 'es' : 'en';
  const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }) : '');

  if (error) {
    return (
      <div className="ma2-card p-5 max-w-xl flex items-center justify-between gap-3" role="alert">
        <span className="text-sm flex items-center gap-2" style={{ color: 'var(--ma2-danger-fg)' }}><AlertTriangle className="w-4 h-4" />{tt(L.error)}</span>
        <button onClick={load} className="ma2-btn ma2-btn-outline ma2-btn-sm">↻</button>
      </div>
    );
  }
  if (!data || confirming) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: v('accent', '#3287B7') }} />
        {confirming && <p className="text-sm" style={{ color: v('text-secondary', '#9aa7b4') }}>{tt(L.confirming)}</p>}
      </div>
    );
  }

  const { offer, status, history } = data;
  const currency = (offer.currency || 'usd').toUpperCase();
  const prices = offer.prices || {};
  const plans = ['monthly', 'annual'].filter(p => prices[p] > 0);
  const savePct = prices.monthly > 0 && prices.annual > 0
    ? Math.round((1 - prices.annual / (prices.monthly * 12)) * 100) : 0;
  const money = (n) => `${Number(n || 0).toFixed(2)} ${currency}`;
  const total = quote ? quote.total : prices[plan];

  return (
    <div className="max-w-3xl" data-testid="gem-membership">
      <div className="flex items-center gap-2 mb-5">
        <Crown className="w-5 h-5" style={{ color: v('accent', '#3287B7') }} />
        <h1 className="text-lg font-semibold" style={{ color: v('text-primary', '#fff') }}>{title}</h1>
      </div>

      {status.active && (
        <div className="ma2-card p-4 mb-4 flex items-center gap-3" data-testid="membership-active">
          <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'color-mix(in srgb, var(--ma2-success) 16%, transparent)' }}>
            <Check className="w-4 h-4" style={{ color: 'var(--ma2-success-fg)' }} />
          </span>
          <div>
            <p className="text-sm font-semibold" style={{ color: v('text-primary', '#fff') }}>{tt(offer.name)} · {tt(L[status.plan] || L.annual)}</p>
            <p className="text-xs" style={{ color: v('text-secondary', '#9aa7b4') }}>{tt(L.active).replace('{d}', fmtDate(status.expires_at))}</p>
          </div>
        </div>
      )}
      {status.lapsed && !status.active && (
        <div className="ma2-card p-4 mb-4 text-sm" style={{ color: 'var(--ma2-warning-fg)' }} role="status">
          {tt(L.lapsed).replace('{d}', fmtDate(status.expires_at))}
        </div>
      )}

      {!offer.enabled || plans.length === 0 ? (
        !status.active && <div className="ma2-card p-5 text-sm" style={{ color: v('text-secondary', '#9aa7b4') }}>{tt(L.unavailable)}</div>
      ) : (
        <div className="ma2-card p-5">
          <h2 className="text-base font-semibold" style={{ color: v('text-primary', '#fff') }}>{tt(offer.name)}</h2>
          {tt(offer.description) && <p className="text-sm mt-1 max-w-prose" style={{ color: v('text-secondary', '#9aa7b4') }}>{tt(offer.description)}</p>}
          {offer.benefits?.length > 0 && (
            <ul className="mt-4 space-y-2">
              {offer.benefits.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-sm" style={{ color: v('text-primary', '#fff') }}>
                  <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: v('accent', '#3287B7') }} />{tt(b)}
                </li>
              ))}
            </ul>
          )}

          <div className="grid sm:grid-cols-2 gap-3 mt-5" role="radiogroup" aria-label={tt(L.title)}>
            {plans.map(p => {
              const on = plan === p;
              return (
                <button key={p} type="button" role="radio" aria-checked={on} onClick={() => setPlan(p)}
                  className="ma2-press text-left rounded-md p-4 border-2 transition-colors"
                  style={{ borderColor: on ? 'var(--ma2-success)' : 'var(--ma2-border)', backgroundColor: on ? 'color-mix(in srgb, var(--ma2-success) 8%, transparent)' : 'transparent' }}
                  data-testid={`plan-${p}`}>
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold" style={{ color: v('text-primary', '#fff') }}>{tt(L[p])}</span>
                    {p === 'annual' && savePct > 0 && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded" style={{ backgroundColor: 'color-mix(in srgb, var(--ma2-success) 16%, transparent)', color: 'var(--ma2-success-fg)' }}>
                        {tt(L.save).replace('{p}', savePct)}
                      </span>
                    )}
                  </span>
                  <span className="block text-xl font-semibold tabular-nums mt-1" style={{ color: v('text-primary', '#fff') }}>{money(prices[p])}</span>
                  <span className="block text-xs" style={{ color: v('text-secondary', '#9aa7b4') }}>{tt(p === 'annual' ? L.perYear : L.perMonth)}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-4">
            {coupon ? (
              <p className="text-xs inline-flex items-center gap-2" style={{ color: v('accent', '#3287B7') }}>
                <Tag className="w-3.5 h-3.5" /><span className="font-semibold tracking-wide">{coupon.toUpperCase()}</span>
                {quote && <span className="tabular-nums">−{money(quote.discount)}</span>}
                <button type="button" onClick={() => { setCoupon(''); setQuote(null); setCouponInput(''); }} className="p-1 -m-1" aria-label={tt(L.removeCoupon)}><X className="w-3.5 h-3.5" /></button>
              </p>
            ) : !couponOpen ? (
              <button type="button" onClick={() => setCouponOpen(true)} className="text-xs py-1 hover:underline underline-offset-4" style={{ color: v('text-secondary', '#9aa7b4') }}>{tt(L.coupon)}</button>
            ) : (
              <form onSubmit={applyCoupon} className="flex gap-2 max-w-xs">
                <input value={couponInput} onChange={e => setCouponInput(e.target.value.toUpperCase())} autoFocus
                  placeholder={tt(L.couponCode)} aria-label={tt(L.couponCode)} className="ma2-input flex-1 min-w-0 uppercase tracking-wide" data-testid="membership-coupon" />
                <button type="submit" disabled={busy || !couponInput.trim()} className="ma2-btn ma2-btn-outline ma2-press">{tt(L.apply)}</button>
              </form>
            )}
          </div>

          <div className="mt-5 pt-4 flex flex-wrap items-center justify-between gap-3" style={{ borderTop: '1px solid var(--ma2-border)' }}>
            <p className="text-sm" style={{ color: v('text-secondary', '#9aa7b4') }}>
              {tt(L.total)}{' '}
              {quote && quote.discount > 0 && <span className="line-through mr-1 tabular-nums">{money(quote.price)}</span>}
              <span className="text-lg font-semibold tabular-nums" style={{ color: v('text-primary', '#fff') }}>{money(total)}</span>
            </p>
            <button onClick={checkout} disabled={busy} className="ma2-btn ma2-btn-primary ma2-press inline-flex items-center gap-2" data-testid="membership-checkout">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}{status.active ? tt(L.renew) : tt(L.join)}
            </button>
          </div>
          {status.active && <p className="text-xs mt-2" style={{ color: v('text-muted', '#7b8794') }}>{tt(L.extendNote)}</p>}
          <p className="text-xs mt-2" style={{ color: v('text-muted', '#7b8794') }}>{tt(L.secure)}</p>
        </div>
      )}

      {history?.length > 0 && (
        <div className="ma2-card p-5 mt-4">
          <h2 className="text-sm font-semibold mb-3" style={{ color: v('text-primary', '#fff') }}>{tt(L.history)}</h2>
          <ul className="divide-y text-sm" style={{ borderColor: 'var(--ma2-border)' }}>
            {history.map(h => (
              <li key={h.id} className="py-2 flex items-center justify-between gap-3" style={{ borderColor: 'var(--ma2-border)' }}>
                <span style={{ color: v('text-primary', '#fff') }}>{tt(L[h.plan] || L.annual)} <span className="text-xs" style={{ color: v('text-muted', '#7b8794') }}>· {fmtDate(h.completed_at)}{h.coupon?.code ? ` · ${h.coupon.code}` : ''}</span></span>
                <span className="tabular-nums" style={{ color: v('text-secondary', '#9aa7b4') }}>{Number(h.total || 0).toFixed(2)} {(h.currency || '').toUpperCase()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
