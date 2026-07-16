import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { checkoutAPI } from '../lib/api';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId) { setStatus('error'); return; }
    let attempts = 0;
    const poll = async () => {
      if (attempts >= 5) { setStatus('timeout'); return; }
      try {
        const res = await checkoutAPI.status(sessionId);
        if (res.data.payment_status === 'paid') { setStatus('success'); return; }
        if (res.data.status === 'expired') { setStatus('expired'); return; }
        attempts++;
        setTimeout(poll, 2000);
      } catch { setStatus('error'); }
    };
    poll();
  }, [sessionId]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6" data-testid="checkout-success-page">
      <div className="text-center max-w-md">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 text-[#0D9488] animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-[#1a2332]" style={{ fontFamily: 'Playfair Display, serif' }}>Processing Payment...</h2>
            <p className="text-slate-500 mt-2">Please wait while we confirm your payment.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 text-[#0D9488] mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-[#1a2332]" style={{ fontFamily: 'Playfair Display, serif' }}>Payment Successful!</h2>
            <p className="text-slate-500 mt-2">Thank you for your purchase. You will receive a confirmation email shortly.</p>
            <Link to="/" className="inline-block mt-6 bg-[#1a2332] text-white px-6 py-2.5 rounded-sm text-sm font-medium hover:bg-[#0D9488] transition-colors" data-testid="checkout-home-link">Back to Home</Link>
          </>
        )}
        {(status === 'error' || status === 'expired' || status === 'timeout') && (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-[#1a2332]" style={{ fontFamily: 'Playfair Display, serif' }}>Payment {status === 'expired' ? 'Expired' : 'Failed'}</h2>
            <p className="text-slate-500 mt-2">{status === 'timeout' ? 'Payment verification timed out. Please check your email.' : 'Something went wrong. Please try again.'}</p>
            <Link to="/" className="inline-block mt-6 bg-[#1a2332] text-white px-6 py-2.5 rounded-sm text-sm font-medium hover:bg-[#0D9488] transition-colors">Back to Home</Link>
          </>
        )}
      </div>
    </div>
  );
}
