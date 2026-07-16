import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';

const v = (name, fb) => `var(--ma-${name}, ${fb})`;
const API = process.env.REACT_APP_BACKEND_URL;
const MAX_POLLS = 10;

export default function MentorshipCheckoutSuccess() {
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ status: 'polling', message: 'Confirming your payment…' });
  const sessionId = search.get('session_id');
  const pollsRef = useRef(0);

  useEffect(() => {
    if (!sessionId) { setState({ status: 'error', message: 'Missing session_id' }); return; }
    let stopped = false;
    const poll = async () => {
      if (stopped) return;
      pollsRef.current += 1;
      try {
        const token = localStorage.getItem('auth_token');
        const r = await axios.get(`${API}/api/member/mentorship/checkout/status/${sessionId}`,
          { headers: { Authorization: `Bearer ${token}` } });
        if (r.data?.payment_status === 'paid') {
          setState({ status: 'paid', message: 'Payment received — your booking is confirmed!' });
          return;
        }
        if (r.data?.status === 'expired' || r.data?.payment_status === 'failed') {
          setState({ status: 'failed', message: 'Payment was not completed. Your seat has been released.' });
          return;
        }
        if (pollsRef.current >= MAX_POLLS) {
          setState({ status: 'timeout', message: 'Still processing. Check back in a minute on My Reservations.' });
          return;
        }
        setTimeout(poll, 2000);
      } catch {
        if (pollsRef.current >= MAX_POLLS) {
          setState({ status: 'error', message: 'Could not confirm payment. Contact support if you were charged.' });
        } else {
          setTimeout(poll, 2000);
        }
      }
    };
    poll();
    return () => { stopped = true; };
  }, [sessionId]);

  const icon = {
    polling: <Loader2 className="w-10 h-10 animate-spin" style={{ color: v('accent', '#c9a84c') }} />,
    paid: <CheckCircle2 className="w-10 h-10 text-green-400" />,
    failed: <XCircle className="w-10 h-10 text-red-400" />,
    timeout: <Clock className="w-10 h-10 text-amber-400" />,
    error: <XCircle className="w-10 h-10 text-red-400" />,
  }[state.status];

  return (
    <div className="max-w-xl mx-auto py-16" data-testid="checkout-success-page">
      <div className="rounded-lg p-8 text-center" style={{ backgroundColor: v('card-bg', '#13161e'), border: `1px solid ${v('card-border', 'rgba(255,255,255,0.05)')}` }}>
        <div className="flex justify-center mb-4">{icon}</div>
        <h1 className="text-xl font-semibold mb-2" style={{ color: v('text-primary', '#fff'), fontFamily: "'DM Serif Display', serif" }}>
          {state.status === 'paid' ? 'Booking Confirmed' : state.status === 'failed' ? 'Payment Not Completed' : state.status === 'timeout' ? 'Still Processing' : state.status === 'error' ? 'Something Went Wrong' : 'Processing Payment'}
        </h1>
        <p className="text-sm mb-6" style={{ color: v('text-secondary', '#9ca3af') }}>{state.message}</p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <button onClick={() => navigate('/my-account/my-bookings')} className="px-4 py-2 rounded text-sm font-medium" style={{ backgroundColor: v('button-bg', '#c9a84c'), color: v('button-text', '#0d0f14') }} data-testid="go-to-bookings">
            View My Reservations
          </button>
          <button onClick={() => navigate('/my-account/mentor-calendar')} className="px-4 py-2 rounded text-sm font-medium border" style={{ borderColor: v('card-border', 'rgba(255,255,255,0.1)'), color: v('text-secondary', '#9ca3af') }}>
            Back to Calendar
          </button>
        </div>
      </div>
    </div>
  );
}
