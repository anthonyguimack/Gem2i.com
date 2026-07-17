import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { gemAPI } from '../../lib/api';
import { useT } from '../../lib/i18n';
import { gemImg } from '../../components/gem2i/GemCatalogBits';

const GEM_FONT = "'Poppins', sans-serif";

/** Stripe return page (Phase 5). Polls the verified checkout-status endpoint —
 *  the backend re-checks payment state with Stripe's API before completing,
 *  so this page can't be spoofed by hitting the URL with a random session. */
export default function Gem2iTicketSuccess() {
  const tt = useT();
  const [params] = useSearchParams();
  const sessionId = params.get('session_id');
  const [state, setState] = useState('checking'); // checking | paid | pending | failed
  const [tx, setTx] = useState(null);
  const tries = useRef(0);

  useEffect(() => {
    if (!sessionId) { setState('failed'); return; }
    let alive = true;
    const poll = () => {
      gemAPI.checkoutStatus(sessionId).then(r => {
        if (!alive) return;
        if (r.data.payment_status === 'paid') { setTx(r.data.transaction); setState('paid'); return; }
        tries.current += 1;
        if (tries.current >= 10) { setState('pending'); return; }
        setState('checking');
        setTimeout(poll, 2000);
      }).catch(() => { if (alive) setState('failed'); });
    };
    poll();
    return () => { alive = false; };
  }, [sessionId]);

  const mutedText = { color: 'var(--color-body-text, #9AA6B2)' };

  return (
    <div className="min-h-screen flex items-center justify-center px-6"
      style={{ backgroundColor: 'var(--color-page-bg, #04080C)', fontFamily: GEM_FONT }}
      data-testid="ticket-success-page">
      <div className="max-w-md w-full text-center py-24">
        {state === 'checking' && (
          <>
            <Loader2 className="w-10 h-10 animate-spin mx-auto" style={{ color: 'var(--color-accent, #3287B7)' }} />
            <p className="mt-6 text-white/90 text-sm">{tt({ en: 'Confirming your payment…', es: 'Confirmando tu pago…' })}</p>
          </>
        )}

        {state === 'paid' && tx && (
          <>
            <CheckCircle2 className="w-10 h-10 mx-auto" style={{ color: 'var(--color-accent, #3287B7)' }} />
            <h1 className="mt-4 text-white font-bold text-2xl">{tt({ en: 'Payment confirmed!', es: '¡Pago confirmado!' })}</h1>
            <p className="mt-2 text-sm" style={mutedText}>
              {tx.quantity} × {tx.tier_label} · {Number(tx.total).toFixed(2)} {String(tx.currency).toUpperCase()}
            </p>
            {tx.qr?.image_url && (
              <img src={gemImg(tx.qr.image_url)} alt="QR ticket" width="200" height="200"
                className="mx-auto mt-6 rounded-sm bg-white p-2" data-testid="ticket-qr" />
            )}
            <p className="mt-3 text-xs" style={mutedText}>
              {tt({ en: 'Code', es: 'Código' })}: <span className="tabular-nums">{tx.qr?.code}</span>
            </p>
            <p className="mt-1 text-xs" style={mutedText}>
              {tt({ en: 'Show this QR at the door. A copy was emailed to you.', es: 'Muestra este QR en la puerta. Te enviamos una copia por email.' })}
            </p>
          </>
        )}

        {state === 'pending' && (
          <>
            <Loader2 className="w-10 h-10 mx-auto" style={mutedText} />
            <p className="mt-6 text-white/90 text-sm">
              {tt({ en: 'Payment is still processing. Your ticket will appear on the event page and by email once confirmed.',
                    es: 'El pago sigue procesándose. Tu ticket aparecerá en la página del evento y por email al confirmarse.' })}
            </p>
          </>
        )}

        {state === 'failed' && (
          <>
            <XCircle className="w-10 h-10 mx-auto text-red-400" />
            <p className="mt-6 text-white/90 text-sm">
              {tt({ en: "We couldn't verify this payment session.", es: 'No pudimos verificar esta sesión de pago.' })}
            </p>
          </>
        )}

        <Link to="/events" className="inline-block mt-10 text-sm transition-colors hover:text-white"
          style={{ color: 'var(--color-link, #5FB2E0)' }}>
          ← {tt({ en: 'Back to Events', es: 'Volver a Eventos' })}
        </Link>
      </div>
    </div>
  );
}
