import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { opportunitiesAPI } from '../lib/api';
import { normalizeRichText } from '../lib/richText';
import { OpportunityBannerFallback } from './OpportunitiesDirectoryPage';
import { toast } from 'sonner';
import { Loader2, ChevronLeft, CheckCircle2, XCircle, Tag, User, Clock } from 'lucide-react';

const PB_FONT = "'Plus Jakarta Sans', 'Inter', sans-serif";
const fmtMoney = (v) => (v == null ? '—' :
  Number(v).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }));

export default function OpportunityReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [o, setO] = useState(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    opportunitiesAPI.reviewView(id)
      .then(r => { setO(r.data); setComment(r.data.my_review?.comment || ''); })
      .catch(e => {
        toast.error(e.response?.data?.detail || 'Not available for review');
        navigate('/opportunities/develop?tab=review');
      });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (flag) => {
    setBusy(true);
    try {
      const r = await opportunitiesAPI.submitReview(id, flag, comment);
      if (r.data.status === 'published') toast.success('Approved — the opportunity is now published');
      else toast.success(`Review recorded (${r.data.approvals}/${r.data.threshold} approvals)`);
      navigate('/opportunities/develop?tab=review');
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
    finally { setBusy(false); }
  };

  if (!o) {
    return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-background, #faf8f5)' }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-accent, #0D9488)' }} />
    </div>;
  }

  const img = (o.images || []).find(Boolean) || o.type_default_image;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background, #faf8f5)', fontFamily: PB_FONT }}>
      <div className="max-w-4xl mx-auto px-6 md:px-12 py-16 pt-24 md:pt-28">
        <Link to="/opportunities/develop?tab=review" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-[var(--color-accent,#0D9488)] mb-6">
          <ChevronLeft className="w-4 h-4" /> Review Queue
        </Link>
        <div className="text-xs uppercase tracking-[0.2em] font-semibold mb-3" style={{ color: 'var(--color-accent, #0D9488)' }}>
          Peer Review · {o.approvals}/{o.threshold} approvals
        </div>
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-heading, #1a2332)', fontFamily: 'Playfair Display, serif' }}>{o.name}</h1>
        <div className="flex flex-wrap gap-4 text-xs text-slate-500 mb-6">
          {o.type_name && <span className="inline-flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> {o.type_name}</span>}
          {o.author && <span className="inline-flex items-center gap-1"><User className="w-3.5 h-3.5" /> {o.author}</span>}
          <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Goal {fmtMoney(o.total_amount)}</span>
        </div>

        <div className="rounded-sm overflow-hidden border border-slate-100 bg-white mb-6">
          <div className="aspect-[16/9] bg-slate-100">
            {img ? <img src={img} alt={o.name} className="w-full h-full object-cover" /> : <OpportunityBannerFallback name={o.name} />}
          </div>
        </div>
        {o.summary && <div className="bg-white border border-slate-100 rounded-sm p-6 mb-4">
          <div className="prose prose-sm max-w-none text-slate-600" dangerouslySetInnerHTML={{ __html: normalizeRichText(o.summary) }} />
        </div>}
        {o.description && <div className="bg-white border border-slate-100 rounded-sm p-6 mb-6">
          <div className="prose prose-sm max-w-none text-slate-600" dangerouslySetInnerHTML={{ __html: normalizeRichText(o.description) }} />
        </div>}

        <div className="bg-white border border-slate-100 rounded-sm p-6 sticky bottom-4 shadow-[0_4px_24px_rgba(26,35,50,0.08)]">
          {o.my_review && (
            <p className="text-xs text-slate-400 mb-3">
              You already reviewed this ({o.my_review.flag}) — submitting again replaces your review.
            </p>
          )}
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Comment (optional)</label>
          <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3}
            className="w-full px-4 py-3 text-sm bg-white border border-slate-200 rounded-sm text-slate-700 outline-none focus:border-[var(--color-accent,#0D9488)] mb-4"
            placeholder="Feedback for the author…" data-testid="review-comment" />
          <div className="flex gap-3 justify-end">
            <button onClick={() => submit('reject')} disabled={busy}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium text-red-500 border border-red-200 rounded-sm hover:bg-red-50 disabled:opacity-50" data-testid="review-reject">
              <XCircle className="w-4 h-4" /> Reject
            </button>
            <button onClick={() => submit('approve')} disabled={busy}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium rounded-sm disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-button-bg, #1a2332)', color: 'var(--color-button-text, #fff)' }} data-testid="review-approve">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Approve
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
