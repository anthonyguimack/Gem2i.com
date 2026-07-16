import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { opportunitiesAPI } from '../lib/api';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Loader2, FileText, Copy, ClipboardCheck } from 'lucide-react';

const PB_FONT = "'Plus Jakarta Sans', 'Inter', sans-serif";

const STATUS_BADGES = {
  draft: 'bg-slate-100 text-slate-600',
  pending_review: 'bg-amber-50 text-amber-600',
  published: 'bg-emerald-50 text-emerald-600',
  archived: 'bg-slate-100 text-slate-400',
};
const STATUS_LABELS = {
  draft: 'Draft', pending_review: 'Pending Review',
  published: 'Published', archived: 'Archived',
};

const fmtMoney = (v) => (v == null ? '—' :
  Number(v).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }));

function ReviewQueueTab({ typeNames }) {
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  useEffect(() => {
    opportunitiesAPI.reviewQueue().then(r => setItems(r.data)).catch(() => setItems([]));
  }, []);
  if (items === null) {
    return <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-accent, #0D9488)' }} /></div>;
  }
  if (items.length === 0) {
    return <div className="p-14 text-center" style={{ fontFamily: PB_FONT }}>
      <ClipboardCheck className="w-10 h-10 mx-auto mb-3 text-slate-200" />
      <p className="text-slate-500 text-sm">Nothing waiting for your review.</p>
    </div>;
  }
  return (
    <table className="w-full text-sm" style={{ fontFamily: PB_FONT }}>
      <thead><tr className="border-b border-slate-100 bg-slate-50 text-left">
        <th className="p-3 font-medium text-slate-600">Opportunity</th>
        <th className="p-3 font-medium text-slate-600">Author</th>
        <th className="p-3 font-medium text-slate-600">Type</th>
        <th className="p-3 font-medium text-slate-600">Goal</th>
        <th className="p-3 font-medium text-slate-600">Your Review</th>
        <th className="p-3 font-medium text-slate-600 text-right w-28">Actions</th>
      </tr></thead>
      <tbody>
        {items.map(o => (
          <tr key={o.id} className="border-b border-slate-50 hover:bg-slate-50/50" data-testid={`review-row-${o.id}`}>
            <td className="p-3 font-medium" style={{ color: 'var(--color-heading, #1a2332)' }}>{o.name}</td>
            <td className="p-3 text-slate-500">{o.author || '—'}</td>
            <td className="p-3 text-slate-500">{typeNames[o.type_id] || '—'}</td>
            <td className="p-3 text-slate-500">{fmtMoney(o.total_amount)}</td>
            <td className="p-3">
              {o.my_review
                ? <span className={`text-xs px-2 py-0.5 rounded-full ${o.my_review.flag === 'approve' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>{o.my_review.flag === 'approve' ? 'Approved' : 'Rejected'}</span>
                : <span className="text-xs text-slate-400">—</span>}
            </td>
            <td className="p-3 text-right">
              <button onClick={() => navigate(`/opportunities/develop/review/${o.id}`)}
                className="text-xs font-medium px-3 py-1.5 rounded-sm border border-slate-200 hover:border-[var(--color-accent,#0D9488)] hover:text-[var(--color-accent,#0D9488)]"
                data-testid={`review-btn-${o.id}`}>
                Review
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function OpportunitiesDevelopmentPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'review' ? 'review' : 'mine';
  const [items, setItems] = useState(null);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [typeNames, setTypeNames] = useState({});

  const load = useCallback(() => {
    opportunitiesAPI.mine(includeArchived)
      .then(r => setItems(r.data))
      .catch(() => { setItems([]); toast.error('Failed to load your opportunities'); });
  }, [includeArchived]);
  useEffect(load, [load]);
  useEffect(() => {
    opportunitiesAPI.types().then(r =>
      setTypeNames(Object.fromEntries(r.data.map(t => [t.type_id, t.name])))
    ).catch(() => {});
  }, []);

  const remove = async (o) => {
    if (!window.confirm(`Delete "${o.name}"? It will disappear from your list.`)) return;
    try { await opportunitiesAPI.remove(o.id); toast.success('Deleted'); load(); }
    catch (e) { toast.error(e.response?.data?.detail || 'Delete failed'); }
  };
  const clone = async (o) => {
    try {
      const r = await opportunitiesAPI.clone(o.id);
      toast.success('Cloned — you are now editing the copy');
      navigate(`/opportunities/develop/${r.data.id}`);
    } catch (e) { toast.error(e.response?.data?.detail || 'Clone failed'); }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background, #faf8f5)' }}>
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-16 pt-24 md:pt-28">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] font-semibold mb-3" style={{ color: 'var(--color-accent, #0D9488)' }}>
              Opportunity Development
            </div>
            <h1 className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--color-heading, #1a2332)', fontFamily: 'Playfair Display, serif' }}>
              My Opportunities
            </h1>
            <p className="mt-2 text-sm text-slate-500 max-w-xl" style={{ fontFamily: PB_FONT }}>
              Draft, refine and submit your investment opportunities. Published entries appear in the member directory.
            </p>
          </div>
          <Link to="/opportunities/develop/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm text-sm font-medium"
            style={{ backgroundColor: 'var(--color-button-bg, #1a2332)', color: 'var(--color-button-text, #fff)' }}
            data-testid="add-opportunity-btn">
            <Plus className="w-4 h-4" /> New Opportunity
          </Link>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1 border border-slate-200 rounded-sm bg-white p-1" style={{ fontFamily: PB_FONT }}>
            {[['mine', 'My Opportunities'], ['review', 'Review Queue']].map(([k, l]) => (
              <button key={k} onClick={() => setSearchParams(k === 'review' ? { tab: 'review' } : {})}
                className={`px-4 py-1.5 text-sm font-medium rounded-sm transition-colors ${tab === k ? 'text-white' : 'text-slate-500 hover:text-slate-700'}`}
                style={tab === k ? { backgroundColor: 'var(--color-accent, #0D9488)' } : {}}
                data-testid={`tab-${k}`}>
                {l}
              </button>
            ))}
          </div>
          {tab === 'mine' && (
            <label className="inline-flex items-center gap-2 text-sm text-slate-500 cursor-pointer" style={{ fontFamily: PB_FONT }}>
              <input type="checkbox" checked={includeArchived} onChange={e => setIncludeArchived(e.target.checked)}
                className="accent-[var(--color-accent,#0D9488)]" data-testid="include-archived-toggle" />
              Show archived
            </label>
          )}
        </div>

        {tab === 'review' ? (
          <div className="bg-white rounded-sm border border-slate-100 overflow-x-auto">
            <ReviewQueueTab typeNames={typeNames} />
          </div>
        ) : (
        <div className="bg-white rounded-sm border border-slate-100 relative overflow-x-auto">
          {items === null && (
            <div className="p-12 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-accent, #0D9488)' }} />
            </div>
          )}
          {items !== null && (
            <table className="w-full text-sm" style={{ fontFamily: PB_FONT }}>
              <thead><tr className="border-b border-slate-100 bg-slate-50 text-left">
                <th className="p-3 font-medium text-slate-600">Opportunity</th>
                <th className="p-3 font-medium text-slate-600">Type</th>
                <th className="p-3 font-medium text-slate-600">Goal</th>
                <th className="p-3 font-medium text-slate-600">Launch</th>
                <th className="p-3 font-medium text-slate-600 w-32">Status</th>
                <th className="p-3 font-medium text-slate-600 text-right w-28">Actions</th>
              </tr></thead>
              <tbody>
                {items.map(o => (
                  <tr key={o.id} className="border-b border-slate-50 hover:bg-slate-50/50" data-testid={`opportunity-row-${o.id}`}>
                    <td className="p-3">
                      <Link to={`/opportunities/develop/${o.id}`} className="font-medium hover:underline" style={{ color: 'var(--color-heading, #1a2332)' }}>
                        {o.name || '(untitled)'}
                      </Link>
                    </td>
                    <td className="p-3 text-slate-500">{typeNames[o.type_id] || '—'}</td>
                    <td className="p-3 text-slate-500">{fmtMoney(o.total_amount)}</td>
                    <td className="p-3 text-slate-500">{o.dates?.launch || '—'}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_BADGES[o.status] || STATUS_BADGES.draft}`}>
                        {STATUS_LABELS[o.status] || o.status}
                      </span>
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <button onClick={() => navigate(`/opportunities/develop/${o.id}`)}
                        className="p-1.5 text-slate-400 hover:text-[var(--color-accent,#0D9488)]" title="Edit"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => clone(o)} className="p-1.5 text-slate-400 hover:text-[var(--color-accent,#0D9488)]" title="Clone"><Copy className="w-4 h-4" /></button>
                      {(o.status === 'draft' || o.status === 'archived') && (
                        <button onClick={() => remove(o)} className="p-1.5 text-slate-400 hover:text-red-500" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {items !== null && items.length === 0 && (
            <div className="p-14 text-center" style={{ fontFamily: PB_FONT }}>
              <FileText className="w-10 h-10 mx-auto mb-3 text-slate-200" />
              <p className="text-slate-500 text-sm mb-1">No opportunities yet.</p>
              <p className="text-slate-400 text-xs">Create your first one — it stays a private draft until you publish it.</p>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
