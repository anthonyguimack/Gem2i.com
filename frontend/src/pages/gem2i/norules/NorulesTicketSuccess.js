/* Norules (`gem2i`) — own copy of this inner page (template = package, D-GEM-2026-15). */
import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, XCircle, CalendarPlus } from 'lucide-react';
import { gemAPI } from '../../../lib/api';
import { useT } from '../../../lib/i18n';
import { gemImg } from '../../../components/gem2i/GemCatalogBits';
import { useFmtDate, BODY, LINE, ACCENT } from '../../../components/gem2i/norules/GemCatalogCards';
import { DetailShell, SERIF } from '../../../components/gem2i/norules/NorulesDetailBits';
import { NBtn, NLink } from '../../../components/gem2i/norules/NBtn';

const hhmm = (t) => (/T\d\d:\d\d/.test(t || '') ? t.slice(11, 16) : '');

/** Google Calendar link for the night (all-day if there is no door time). */
function calendarUrl(ev) {
  const d = String(ev.event_date || '').slice(0, 10).replace(/-/g, '');
  if (!d) return '';
  const t = hhmm(ev.open_time).replace(':', '');
  const dates = t ? `${d}T${t}00/${d}T235900` : `${d}/${d}`;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(ev.title || 'GEM2i')}&dates=${dates}&location=${encodeURIComponent(ev.venue?.name || '')}`;
}

/** The pass itself: event photo, tier × qty (or guest-list benefit), date, doors, venue, perforation, QR + code. */
function TicketCard({ tx, ev, guest }) {
  const tt = useT();
  const fmt = useFmtDate();
  const tag = guest ? `${tt({ en: 'Guest list', es: 'Guest list' })}${tx.guests ? ` · +${tx.guests}` : ''}`
    : `E-ticket · ${tx.tier_label || ''}${tx.quantity > 1 ? ` ×${tx.quantity}` : ''}`;
  const facts = [
    [tt({ en: 'Date', es: 'Fecha' }), fmt(ev.event_date || tx.event_date, { weekday: 'short', month: 'short', day: 'numeric' })],
    guest && tx.free_until ? [tt({ en: 'Free until', es: 'Gratis hasta' }), tx.free_until] : [tt({ en: 'Doors', es: 'Apertura' }), hhmm(ev.open_time) || '—'],
    [tt({ en: 'Venue', es: 'Venue' }), ev.venue?.name || '—'],
  ];
  return (
    <div className="gem-tone-dark relative rounded-[26px] overflow-hidden text-white -rotate-[1.5deg] transition-transform duration-500 hover:rotate-0 motion-reduce:transition-none shadow-[0_40px_80px_-40px_rgba(0,0,0,.6)]"
      style={{ backgroundColor: '#0E1216' }} data-testid="ticket-card">
      <div className="relative h-[180px]">
        {ev.flyer && <img src={gemImg(ev.flyer)} alt="" className="w-full h-full object-cover opacity-70" />}
        <span aria-hidden="true" className="absolute inset-0" style={{ background: 'linear-gradient(transparent, #0E1216)' }} />
        <span className="absolute left-6 top-4 rounded-md px-2.5 py-1.5 text-[11px] font-extrabold tracking-[0.16em] uppercase" style={{ backgroundColor: guest ? '#1F8F55' : ACCENT }}>{tag}</span>
        <b className="absolute left-6 right-6 bottom-3.5 text-[28px] leading-tight" style={{ fontFamily: SERIF }}>{ev.title || tx.event_title}</b>
      </div>
      <div className="grid grid-cols-3 gap-3 px-6 py-4">
        {facts.map(([k, v]) => <div key={k}><small className="block text-[10.5px] font-extrabold tracking-[0.16em] uppercase text-[#8A949E]">{k}</small><b className="text-[15px]">{v}</b></div>)}
      </div>
      <div className="relative mx-[18px] border-t-2 border-dashed border-[#2F363E]">
        <span aria-hidden="true" className="absolute -left-[30px] -top-[13px] w-6 h-6 rounded-full" style={{ backgroundColor: 'var(--color-page-bg, #04080C)' }} />
        <span aria-hidden="true" className="absolute -right-[30px] -top-[13px] w-6 h-6 rounded-full" style={{ backgroundColor: 'var(--color-page-bg, #04080C)' }} />
      </div>
      <div className="grid sm:grid-cols-[150px_1fr] gap-5 items-center px-6 py-5">
        {tx.qr?.image_url
          ? <img src={gemImg(tx.qr.image_url)} alt={tt({ en: 'QR ticket', es: 'Entrada QR' })} width="150" height="150" className="w-[150px] h-[150px] rounded-xl bg-white p-2.5" data-testid="ticket-qr" />
          : <span className="w-[150px] h-[150px] rounded-xl" style={{ backgroundColor: '#1A2026' }} />}
        <div>
          <small className="text-[10.5px] font-extrabold tracking-[0.16em] uppercase text-[#8A949E]">{tt({ en: 'Code', es: 'Código' })}</small>
          <code className="block text-[20px] font-extrabold tracking-[0.1em] tabular-nums">{tx.qr?.code}</code>
          <p className="mt-2.5 mb-0 text-[13.5px] text-[#AAB3BD]">
            {[tx.member_name, tx.membership_id].filter(Boolean).join(' · ')}
            {!guest && tx.quantity > 1 && <><br />{tt({ en: `Valid for ${tx.quantity} people`, es: `Válida para ${tx.quantity} personas` })}</>}
            {!guest && tx.total != null && <><br />{Number(tx.total).toFixed(2)} {String(tx.currency || '').toUpperCase()}</>}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Stripe return page (Phase 5) — boceto norules-yellow-pages.html (Ticket): confirmed e-ticket, guest-list
 *  pass and processing states. Polls the verified checkout-status endpoint — the backend re-checks payment
 *  state with Stripe's API before completing, so this page can't be spoofed with a random session. */
export default function NorulesTicketSuccess() {
  const tt = useT();
  const [params] = useSearchParams();
  const sessionId = params.get('session_id');
  const [state, setState] = useState('checking'); // checking | paid | pending | failed
  const [tx, setTx] = useState(null);
  const [ev, setEv] = useState({});
  const tries = useRef(0);

  useEffect(() => {
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
  }, [sessionId]);

  const guest = tx?.kind === 'guest_pass';
  const cal = tx ? calendarUrl({ ...ev, title: ev.title || tx.event_title, event_date: ev.event_date || tx.event_date }) : '';
  const steps = [
    [tt({ en: 'Payment received by Stripe', es: 'Pago recibido por Stripe' }), true],
    [tt({ en: 'Confirming with GEM2i', es: 'Confirmando con GEM2i' }), state === 'pending'],
    [tt({ en: 'Your QR ticket is ready', es: 'Tu entrada QR está lista' }), false],
  ];

  return (
    <DetailShell testid="ticket-success-page">
      {state === 'paid' && tx ? (
        <div className="py-16 md:py-20 grid gap-12 lg:grid-cols-2 items-center">
          <div>
            <span className="w-16 h-16 rounded-full flex items-center justify-center motion-reduce:!animate-none" style={{ backgroundColor: '#E4F6EC', color: '#178A4C', animation: 'gemPop .6s cubic-bezier(.19,1,.22,1)' }}><Check className="w-8 h-8" aria-hidden="true" /></span>
            <h1 className="mt-4 mb-3 text-white font-bold leading-none" style={{ fontFamily: SERIF, fontSize: 'clamp(2.4rem, 5vw, 4rem)' }}>
              {guest ? tt({ en: 'On the ', es: 'Estás en la ' }) : tt({ en: "You're ", es: 'Ya estás ' })}
              <em className="gem-accent" style={{ color: ACCENT }}>{guest ? tt({ en: 'list.', es: 'lista.' }) : tt({ en: 'in.', es: 'dentro.' })}</em>
            </h1>
            <p className="max-w-[46ch] text-[17px] leading-[1.7]" style={{ color: BODY }}>
              {guest ? tt({ en: 'Your spot is saved. Show this QR at the door.', es: 'Tu plaza está guardada. Muestra este QR en la puerta.' })
                : tt({ en: 'Payment confirmed. Show this QR at the door — a copy is in your e-mail.', es: 'Pago confirmado. Muestra este QR en la puerta: tienes una copia en tu e-mail.' })}
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              {cal && <NBtn href={cal} icon={<CalendarPlus />}>{tt({ en: 'Add to calendar', es: 'Añadir al calendario' })}</NBtn>}
              {tx.qr?.image_url && <NBtn href={gemImg(tx.qr.image_url)} download variant="s" icon="down">{tt({ en: 'Download QR', es: 'Descargar QR' })}</NBtn>}
              <NBtn to="/my-account/global-calendar" variant="s">{tt({ en: 'My Account', es: 'Mi cuenta' })}</NBtn>
            </div>
            {ev.slug && <p className="mt-6 text-[14.5px]"><NLink to={`/events/${ev.slug}`}>← {tt({ en: 'Back to the event', es: 'Volver al evento' })}</NLink></p>}
          </div>
          <TicketCard tx={tx} ev={ev} guest={guest} />
        </div>
      ) : state === 'failed' ? (
        <div className="max-w-[560px] mx-auto py-24 text-center">
          <XCircle className="w-14 h-14 mx-auto text-red-400" aria-hidden="true" />
          <h1 className="mt-4 text-white font-bold text-[34px]" style={{ fontFamily: SERIF }}>{tt({ en: "We couldn't verify this payment", es: 'No pudimos verificar este pago' })}</h1>
          <p style={{ color: BODY }}>{tt({ en: 'If you were charged, your ticket will appear in My Account and by e-mail.', es: 'Si se hizo el cargo, tu entrada aparecerá en Mi cuenta y por e-mail.' })} <NLink to="/#contact">{tt({ en: 'Contact us', es: 'Contáctanos' })}</NLink></p>
          <NBtn to="/events" className="mt-6">{tt({ en: 'Back to events', es: 'Volver a eventos' })}</NBtn>
        </div>
      ) : (
        <div className="max-w-[560px] mx-auto py-24 text-center" aria-live="polite">
          <span className={`block w-16 h-16 mx-auto rounded-full border-4 ${state === 'checking' ? 'animate-spin' : ''}`} style={{ borderColor: LINE, borderTopColor: ACCENT }} aria-hidden="true" />
          <h1 className="mt-5 text-white font-bold leading-tight" style={{ fontFamily: SERIF, fontSize: 'clamp(2rem, 4vw, 2.6rem)' }}>
            {state === 'pending' ? tt({ en: 'Still confirming your payment', es: 'Seguimos confirmando tu pago' }) : tt({ en: 'Confirming your payment…', es: 'Confirmando tu pago…' })}
          </h1>
          <p style={{ color: BODY }}>{tt({ en: "This usually takes a few seconds. Please don't pay again.", es: 'Suele tardar unos segundos. Por favor, no pagues otra vez.' })}</p>
          <ol className="mt-6 mx-auto max-w-[340px] grid gap-2.5 text-left list-none p-0">
            {steps.map(([label, done], i) => (
              <li key={label} className="flex items-center gap-3" style={{ color: done ? 'var(--gem-ink, #fff)' : BODY }}>
                <span className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[12px] font-bold" style={done ? { backgroundColor: '#E4F6EC', color: '#178A4C' } : { backgroundColor: LINE }}>{done ? '✓' : i + 1}</span>{label}
              </li>
            ))}
          </ol>
          {state === 'pending' && (
            <p className="mt-6 text-[14px]" style={{ color: BODY }}>
              {tt({ en: 'Taking long? Your ticket will appear in My Account and by e-mail once confirmed.', es: '¿Tarda? Tu entrada aparecerá en Mi cuenta y por e-mail al confirmarse.' })} <NLink to="/#contact">{tt({ en: 'Contact us', es: 'Contáctanos' })}</NLink>
            </p>
          )}
        </div>
      )}
      <style>{'@keyframes gemPop{from{transform:scale(.4);opacity:0}}'}</style>
    </DetailShell>
  );
}
