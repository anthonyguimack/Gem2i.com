import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, XCircle, CalendarPlus, Download } from 'lucide-react';
import { gemAPI } from '../../lib/api';
import { useT, useLang } from '../../lib/i18n';
import { gemImg } from '../../components/gem2i/GemCatalogBits';

const GEM_FONT = "'Manrope', sans-serif";
const SERIF = "'Playfair Display', Georgia, serif";
const BODY = 'var(--color-body-text, #9AA6B2)';
const LINK = 'var(--color-link, #5AAFEA)';
const LINE = 'var(--color-card-border, rgba(255,255,255,0.09))';
const CARD = 'var(--color-card-bg, #0D1721)';
const ACCENT = 'var(--color-accent, #0068b3)';
const hhmm = (t) => (/T\d\d:\d\d/.test(t || '') ? t.slice(11, 16) : '');
const btn = 'inline-flex items-center gap-2 rounded-[4px] px-5 py-3 text-[14.5px] font-bold text-white transition-opacity hover:opacity-90';

/** Google Calendar link for the night (all-day without a door time). */
function calendarUrl(ev) {
  const d = String(ev.event_date || '').slice(0, 10).replace(/-/g, '');
  if (!d) return '';
  const t = hhmm(ev.open_time).replace(':', '');
  const dates = t ? `${d}T${t}00/${d}T235900` : `${d}/${d}`;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(ev.title || 'GEM2i')}&dates=${dates}&location=${encodeURIComponent(ev.venue?.name || '')}`;
}

/** The pass as a ticket: flyer band with the type, facts, perforation, QR + code. */
function TicketCard({ tx, ev, guest }) {
  const tt = useT();
  const { lang } = useLang() || { lang: 'en' };
  const day = String(ev.event_date || tx.event_date || '').slice(0, 10);
  const date = day ? new Date(`${day}T12:00:00`).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : '—';
  const tag = guest ? `${tt({ en: 'Guest list', es: 'Guest list' })}${tx.guest_additional ? ` · +${tx.guest_additional}` : ''}`
    : `E-ticket${tx.tier_label ? ` · ${tx.tier_label}` : ''}${tx.quantity > 1 ? ` ×${tx.quantity}` : ''}`;
  const facts = [
    [tt({ en: 'Date', es: 'Fecha' }), date],
    guest && tx.free_until ? [tt({ en: 'Free until', es: 'Gratis hasta' }), tx.free_until] : [tt({ en: 'Doors', es: 'Apertura' }), hhmm(ev.open_time) || '—'],
    [tt({ en: 'Venue', es: 'Venue' }), ev.venue?.name || '—'],
  ];
  const flyer = gemImg(ev.image_urls?.flyer || ev.flyer);
  return (
    <div className="rounded-[4px] overflow-hidden" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }} data-testid="ticket-card">
      <div className="relative h-[170px]" style={{ backgroundColor: '#0A121A' }}>
        {flyer && <img src={flyer} alt="" className="w-full h-full object-cover opacity-70" />}
        <span aria-hidden="true" className="absolute inset-0" style={{ background: 'linear-gradient(transparent, rgba(13,23,33,.95))' }} />
        <span className="absolute left-5 top-4 rounded-[4px] px-2.5 py-1 text-[11px] font-extrabold tracking-[0.14em] uppercase text-white" style={{ backgroundColor: guest ? '#1F8F55' : ACCENT }}>{tag}</span>
        <b className="absolute left-5 right-5 bottom-3 text-white text-[26px] leading-tight" style={{ fontFamily: SERIF }}>{ev.title || tx.event_title}</b>
      </div>
      <div className="grid grid-cols-3 gap-3 px-5 py-4">
        {facts.map(([k, v]) => <div key={k}><small className="block text-[12px]" style={{ color: BODY }}>{k}</small><b className="text-white text-[15px]">{v}</b></div>)}
      </div>
      <div className="mx-5 border-t-2 border-dashed" style={{ borderColor: LINE }} />
      <div className="grid sm:grid-cols-[150px_1fr] gap-5 items-center px-5 py-5">
        {tx.qr?.image_url
          ? <img src={gemImg(tx.qr.image_url)} alt={tt({ en: 'QR pass', es: 'Pase QR' })} width="150" height="150" className="w-[150px] h-[150px] rounded-[4px] bg-white p-2.5" data-testid="ticket-qr" />
          : <span className="w-[150px] h-[150px] rounded-[4px]" style={{ backgroundColor: '#1A2026' }} />}
        <div className="min-w-0">
          <small className="text-[12px]" style={{ color: BODY }}>{tt({ en: 'Code', es: 'Código' })}</small>
          <code className="block text-white text-[16px] font-extrabold tracking-[0.04em] break-all">{tx.qr?.code}</code>
          <p className="mt-2 mb-0 text-[13.5px]" style={{ color: BODY }}>
            {[tx.member_name, tx.membership_id].filter(Boolean).join(' · ')}
            {!guest && tx.quantity > 1 && <><br />{tt({ en: `Valid for ${tx.quantity} people`, es: `Válida para ${tx.quantity} personas` })}</>}
            {!guest && tx.total != null && <><br />{Number(tx.total).toFixed(2)} {String(tx.currency || '').toUpperCase()}</>}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Stripe return page + guest-list pass page (`?pass=<event slug>`) — TS-A (2026-10-26, boceto
 *  gem2i-ticket-success.html): message + actions on the left, the pass as a ticket on the right.
 *  Payments are verified server-side (checkout-status re-checks with Stripe); the pass is read via
 *  my-event-status (JWT identity). No CMS hero. */
export default function Gem2iTicketSuccess() {
  const tt = useT();
  const [params] = useSearchParams();
  const sessionId = params.get('session_id');
  const passSlug = params.get('pass');
  const [state, setState] = useState('checking'); // checking | paid | pending | failed | nopass
  const [tx, setTx] = useState(null);
  const [ev, setEv] = useState({});
  const tries = useRef(0);

  useEffect(() => {
    if (!passSlug) return undefined;
    let alive = true;
    gemAPI.eventDetail(passSlug)
      .then(r => gemAPI.myEventStatus(r.data.id).then(s => {
        if (!alive) return;
        const pass = s.data?.pass;
        if (!pass) { setState('nopass'); return; }
        setTx(pass); setEv(r.data || {}); setState('paid');
      }))
      .catch(() => { if (alive) setState('nopass'); });
    return () => { alive = false; };
  }, [passSlug]);

  useEffect(() => {
    if (passSlug) return undefined;
    if (!sessionId) { setState('failed'); return undefined; }
    let alive = true;
    const poll = () => {
      gemAPI.checkoutStatus(sessionId).then(r => {
        if (!alive) return;
        if (r.data.payment_status === 'paid') { setTx(r.data.transaction); setEv(r.data.event || {}); setState('paid'); return; }
        tries.current += 1;
        if (tries.current >= 10) { setState('pending'); return; }
        setState('checking');
        setTimeout(poll, 2000);
      }).catch(() => { if (alive) setState('failed'); });
    };
    poll();
    return () => { alive = false; };
  }, [sessionId, passSlug]);

  const guest = tx?.kind === 'guest_pass';
  const cal = tx ? calendarUrl({ ...ev, title: ev.title || tx.event_title, event_date: ev.event_date || tx.event_date }) : '';
  const backTo = passSlug ? `/events/${passSlug}` : ev.slug ? `/events/${ev.slug}` : '/events';

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-page-bg, #04080C)', fontFamily: GEM_FONT }} data-testid="ticket-success-page">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-16 md:py-20">
        {state === 'paid' && tx ? (
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div>
              <span className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E4F6EC', color: '#178A4C' }}><Check className="w-8 h-8" aria-hidden="true" /></span>
              <h1 className="mt-4 mb-3 text-white font-bold leading-[1.06] pb-1" style={{ fontFamily: SERIF, fontSize: 'clamp(2.4rem, 4.8vw, 3.8rem)' }}>
                {guest ? tt({ en: 'On the ', es: 'Estás en la ' }) : tt({ en: "You're ", es: 'Ya estás ' })}
                <em className="font-semibold" style={{ color: LINK }}>{guest ? tt({ en: 'list.', es: 'lista.' }) : tt({ en: 'in.', es: 'dentro.' })}</em>
              </h1>
              <p className="max-w-[44ch] text-[17px] leading-[1.7]" style={{ color: BODY }}>
                {guest ? tt({ en: 'Your spot is saved. Show this QR at the door. A copy is in your e-mail.', es: 'Tu plaza está guardada. Muestra este QR en la puerta. Tienes una copia en tu e-mail.' })
                  : tt({ en: 'Payment confirmed. Show this QR at the door. A copy is in your e-mail.', es: 'Pago confirmado. Muestra este QR en la puerta. Tienes una copia en tu e-mail.' })}
              </p>
              <div className="mt-6 flex flex-wrap gap-2.5">
                {cal && <a href={cal} target="_blank" rel="noreferrer" className={btn} style={{ backgroundColor: ACCENT }}><CalendarPlus className="w-4 h-4" aria-hidden="true" />{tt({ en: 'Add to calendar', es: 'Añadir al calendario' })}</a>}
                {tx.qr?.image_url && <a href={gemImg(tx.qr.image_url)} download className={btn} style={{ border: '1px solid rgba(255,255,255,.3)' }}><Download className="w-4 h-4" aria-hidden="true" />{tt({ en: 'Download QR', es: 'Descargar QR' })}</a>}
                <Link to="/my-account/global-calendar" className={btn} style={{ border: '1px solid rgba(255,255,255,.3)' }}>{tt({ en: 'My Account', es: 'Mi cuenta' })}</Link>
              </div>
              <p className="mt-6 text-[14.5px]"><Link to={backTo} className="font-bold underline underline-offset-4" style={{ color: LINK }}>← {tt({ en: 'Back to the event', es: 'Volver al evento' })}</Link></p>
            </div>
            <TicketCard tx={tx} ev={ev} guest={guest} />
          </div>
        ) : state === 'nopass' ? (
          <div className="max-w-[560px] mx-auto py-12 text-center" data-testid="no-pass">
            <h1 className="text-white font-bold text-[34px]" style={{ fontFamily: SERIF }}>{tt({ en: 'No pass for this event', es: 'No tienes pase para este evento' })}</h1>
            <p style={{ color: BODY }}>{tt({ en: 'Log in with the account you used, or join the guest list from the event page.', es: 'Entra con la cuenta que usaste o apúntate a la guest list desde la página del evento.' })}</p>
            <Link to={backTo} className={`${btn} mt-6`} style={{ backgroundColor: ACCENT }}>{tt({ en: 'Go to the event', es: 'Ir al evento' })}</Link>
          </div>
        ) : state === 'failed' ? (
          <div className="max-w-[560px] mx-auto py-12 text-center">
            <XCircle className="w-14 h-14 mx-auto text-red-400" aria-hidden="true" />
            <h1 className="mt-4 text-white font-bold text-[32px]" style={{ fontFamily: SERIF }}>{tt({ en: "We couldn't verify this payment", es: 'No pudimos verificar este pago' })}</h1>
            <p style={{ color: BODY }}>{tt({ en: 'If you were charged, your ticket will appear in My Account and by e-mail.', es: 'Si se hizo el cargo, tu entrada aparecerá en Mi cuenta y por e-mail.' })}</p>
            <Link to="/events" className={`${btn} mt-6`} style={{ backgroundColor: ACCENT }}>{tt({ en: 'Back to events', es: 'Volver a eventos' })}</Link>
          </div>
        ) : (
          <div className="max-w-[560px] mx-auto py-12 text-center" aria-live="polite">
            <span className={`block w-16 h-16 mx-auto rounded-full border-4 ${state === 'checking' ? 'animate-spin motion-reduce:animate-none' : ''}`} style={{ borderColor: LINE, borderTopColor: ACCENT }} aria-hidden="true" />
            <h1 className="mt-5 text-white font-bold leading-tight" style={{ fontFamily: SERIF, fontSize: 'clamp(2rem, 4vw, 2.6rem)' }}>
              {state === 'pending' ? tt({ en: 'Still confirming your payment', es: 'Seguimos confirmando tu pago' }) : tt({ en: 'Confirming your payment…', es: 'Confirmando tu pago…' })}
            </h1>
            <p style={{ color: BODY }}>{tt({ en: "This usually takes a few seconds. Please don't pay again.", es: 'Suele tardar unos segundos. Por favor, no pagues otra vez.' })}</p>
            {state === 'pending' && <p className="mt-4 text-[14px]" style={{ color: BODY }}>{tt({ en: 'Your ticket will appear in My Account and by e-mail once confirmed.', es: 'Tu entrada aparecerá en Mi cuenta y por e-mail al confirmarse.' })}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
