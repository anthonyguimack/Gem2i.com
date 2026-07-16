import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { adminAPI } from '../../lib/api';
import {
  ArrowLeft, Loader2, Trophy, Eye, MessageSquare, Share2, UserPlus, Crown,
  Sparkles, Medal, Gift, CheckCircle2, Clock,
} from 'lucide-react';

const ACTION_META = {
  view: { label: 'Article read', icon: Eye },
  comment: { label: 'Comment', icon: MessageSquare },
  share: { label: 'Share', icon: Share2 },
  referral_signup: { label: 'Referral signed up', icon: UserPlus },
  referral_activation: { label: 'Referral activated', icon: Crown },
  milestone_bonus: { label: 'Milestone bonus', icon: Trophy },
  manual_adjust: { label: 'Manual adjustment', icon: Sparkles },
};
const msTitle = (t) => (typeof t === 'object' && t !== null ? (t.en || t.es || '') : (t || ''));
const fmt = (v) => { if (!v) return '—'; const d = new Date(v); return isNaN(d.getTime()) ? String(v) : d.toLocaleString(); };

export default function MemberPoints() {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adjPoints, setAdjPoints] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const load = useCallback(() => {
    adminAPI.getMemberPoints(memberId)
      .then(r => setData(r.data))
      .catch(() => setError('Could not load points for this member.'))
      .finally(() => setLoading(false));
  }, [memberId]);
  useEffect(() => { load(); }, [load]);

  const adjust = async () => {
    const pts = parseInt(adjPoints, 10);
    if (!pts) { toast.error('Enter a non-zero points amount (negative to deduct)'); return; }
    if (!adjReason.trim()) { toast.error('A reason is required — it goes on the ledger'); return; }
    setAdjusting(true);
    try {
      await adminAPI.adjustMemberPoints(memberId, pts, adjReason.trim());
      toast.success('Adjustment recorded');
      setAdjPoints(''); setAdjReason('');
      load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Adjustment failed'); }
    finally { setAdjusting(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (error || !data) return <div className="mt-6 p-4 rounded-lg bg-red-50 text-red-700 text-sm">{error || 'Not found.'}</div>;

  const m = data.member || {};
  const c = data.counters || {};

  return (
    <div className="max-w-5xl mx-auto" data-testid="member-points-page">
      <button onClick={() => navigate('/admin/members')} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#0D9488] mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Members
      </button>

      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-lg bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center"><Trophy className="w-5 h-5" /></div>
        <div>
          <h1 className="text-xl font-bold text-[#1a2332]">Points — {m.name || m.email}</h1>
          <p className="text-sm text-slate-500">{m.membership_id} · {m.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-slate-200 rounded-xl overflow-hidden border border-slate-200">
        {[
          { label: 'Balance', value: data.balance, strong: true },
          { label: 'Articles read', value: c.views || 0 },
          { label: 'Shares', value: c.shares || 0 },
          { label: 'Pointed comments', value: c.comments || 0 },
          { label: 'Referrals', value: (data.referrals || []).length },
        ].map((s, i) => (
          <div key={i} className="bg-white p-4">
            <div className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">{s.label}</div>
            <div className={`mt-0.5 ${s.strong ? 'text-lg font-bold text-[#0D9488]' : 'text-sm font-medium text-[#1a2332]'}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {(data.badges || []).length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400">Badges:</span>
          {data.badges.map(b => <span key={b} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#0D9488]/10 text-[#0D9488]"><Medal className="w-3 h-3" /> {b}</span>)}
        </div>
      )}

      <div className="mt-6 bg-white rounded-xl border border-slate-200 p-5" data-testid="points-adjust-form">
        <h2 className="text-sm font-semibold text-[#1a2332] mb-1">Manual adjustment</h2>
        <p className="text-xs text-slate-500 mb-3">Adds a permanent ledger entry (visible to the member). Use a negative amount to deduct.</p>
        <div className="flex flex-wrap gap-3">
          <input type="number" placeholder="± points" value={adjPoints} onChange={e => setAdjPoints(e.target.value)}
            className="w-32 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30" data-testid="adjust-points-input" />
          <input placeholder="Reason (required)" value={adjReason} onChange={e => setAdjReason(e.target.value)}
            className="flex-1 min-w-[220px] border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30" data-testid="adjust-reason-input" />
          <button onClick={adjust} disabled={adjusting}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-[#0D9488] text-white hover:bg-[#0b7e74] disabled:opacity-50" data-testid="adjust-submit">
            {adjusting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
          </button>
        </div>
      </div>

      {(data.rewards || []).length > 0 && (
        <div className="mt-6 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100"><h2 className="text-sm font-semibold text-[#1a2332]">Rewards earned</h2></div>
          <table className="w-full text-sm">
            <tbody>
              {data.rewards.map(r => (
                <tr key={r.id} className="border-b border-slate-50">
                  <td className="p-3 text-[#1a2332]">{msTitle(r.title) || `${r.threshold} ${r.metric}`}</td>
                  <td className="p-3 text-slate-500 capitalize"><span className="inline-flex items-center gap-1.5">{r.reward_type === 'badge' ? <Medal className="w-3.5 h-3.5" /> : r.reward_type === 'points' ? <Trophy className="w-3.5 h-3.5" /> : <Gift className="w-3.5 h-3.5" />}{r.reward_type}{r.reward_value ? ` (${r.reward_value})` : ''}</span></td>
                  <td className="p-3 text-slate-400 text-xs">{fmt(r.granted_at)}</td>
                  <td className="p-3">
                    {r.status === 'pending_fulfillment'
                      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700"><Clock className="w-3 h-3" /> Pending delivery</span>
                      : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700"><CheckCircle2 className="w-3 h-3" /> {r.status === 'fulfilled' ? 'Fulfilled' : 'Granted'}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 grid lg:grid-cols-2 gap-6 items-start">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="member-points-ledger">
          <div className="px-4 py-3 border-b border-slate-100"><h2 className="text-sm font-semibold text-[#1a2332]">Ledger (last {data.ledger.length})</h2></div>
          {data.ledger.length === 0 ? <div className="p-10 text-center text-slate-400 text-sm">No entries yet.</div> : (
            <table className="w-full text-sm">
              <tbody>
                {data.ledger.map(row => {
                  const meta = ACTION_META[row.action] || ACTION_META.manual_adjust;
                  const Icon = meta.icon;
                  return (
                    <tr key={row.id} className="border-b border-slate-50">
                      <td className="p-3">
                        <span className="inline-flex items-center gap-2 text-[#1a2332]"><Icon className="w-3.5 h-3.5 text-slate-400" /> {meta.label}</span>
                        {row.action === 'manual_adjust' && row.ref?.reason && <div className="text-[11px] text-slate-400 ml-6">{row.ref.reason} — {row.ref.by}</div>}
                      </td>
                      <td className="p-3 text-slate-400 text-xs whitespace-nowrap">{fmt(row.created_at)}</td>
                      <td className={`p-3 text-right font-semibold ${row.points >= 0 ? 'text-[#0D9488]' : 'text-red-500'}`}>{row.points >= 0 ? `+${row.points}` : row.points}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="member-points-referrals">
          <div className="px-4 py-3 border-b border-slate-100"><h2 className="text-sm font-semibold text-[#1a2332]">Referrals (via KMS shares)</h2></div>
          {(data.referrals || []).length === 0 ? <div className="p-10 text-center text-slate-400 text-sm">No referrals generated yet.</div> : (
            <table className="w-full text-sm">
              <tbody>
                {data.referrals.map((r, i) => (
                  <tr key={r.membership_id || i} className="border-b border-slate-50">
                    <td className="p-3">
                      <div className="text-[#1a2332]">{[r.first_name, r.last_name].filter(Boolean).join(' ') || '—'}</div>
                      <div className="text-[11px] text-slate-400">{r.membership_id}</div>
                    </td>
                    <td className="p-3 text-slate-400 text-xs">{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</td>
                    <td className="p-3">
                      {r.account_status === 'active'
                        ? <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">Active</span>
                        : <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">Pre-registered</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
