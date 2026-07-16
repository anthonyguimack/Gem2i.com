import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { memberAPI } from '../../lib/api';
import { useT } from '../../lib/i18n';
import {
  Loader2, Trophy, Eye, MessageSquare, Share2, UserPlus, Gift, Medal,
  CheckCircle2, Clock, Crown, Sparkles,
} from 'lucide-react';

const v = (name, fb) => `var(--ma-${name}, ${fb})`;
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString() : '—');
const fmtDateTime = (iso) => (iso ? new Date(iso).toLocaleString() : '—');

const ACTION_META = {
  view: { label: 'Article read', icon: Eye },
  comment: { label: 'Comment', icon: MessageSquare },
  share: { label: 'Share', icon: Share2 },
  referral_signup: { label: 'Referral signed up', icon: UserPlus },
  referral_activation: { label: 'Referral activated', icon: Crown },
  milestone_bonus: { label: 'Milestone bonus', icon: Trophy },
  manual_adjust: { label: 'Adjustment', icon: Sparkles },
};
const METRIC_LABELS = {
  views: 'articles read',
  comments: 'comments',
  shares: 'shares',
  referrals_activated: 'activated referrals',
  points_total: 'points',
};

function Stat({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="p-4 rounded-lg border" style={{ backgroundColor: v('card-bg', '#13161e'), borderColor: v('card-border', 'rgba(255,255,255,0.05)') }}>
      <div className="flex items-center gap-2 text-xs mb-2" style={{ color: v('text-muted', '#6b7280') }}>
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <div className="text-2xl font-bold" style={{ color: accent ? v('accent', '#c9a84c') : v('text-primary', '#fff'), fontFamily: "'DM Serif Display', serif" }}>{value}</div>
      {sub && <div className="text-[11px] mt-0.5" style={{ color: v('text-muted', '#6b7280') }}>{sub}</div>}
    </div>
  );
}

function SectionCard({ title, right, children, testid }) {
  return (
    <div className="rounded-lg border mb-6 overflow-hidden" style={{ backgroundColor: v('card-bg', '#13161e'), borderColor: v('card-border', 'rgba(255,255,255,0.05)') }} data-testid={testid}>
      <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor: v('card-border', 'rgba(255,255,255,0.05)') }}>
        <h2 className="text-sm font-semibold" style={{ color: v('text-primary', '#fff') }}>{title}</h2>
        {right && <span className="text-[11px]" style={{ color: v('text-muted', '#6b7280') }}>{right}</span>}
      </div>
      {children}
    </div>
  );
}

const Th = ({ children, right }) => (
  <th className={`${right ? 'text-right' : 'text-left'} p-3 text-[11px] font-medium uppercase tracking-wider`} style={{ color: v('text-muted', '#6b7280') }}>{children}</th>
);
const theadStyle = { backgroundColor: v('input-bg', '#0d0f14') };
const rowBorder = { borderColor: v('card-border', 'rgba(255,255,255,0.05)') };

export default function PointsRewards() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const ctx = useOutletContext() || {};
  const tt = useT();
  const title = ctx.sectionLabel ? ctx.sectionLabel('points', 'Points & Rewards') : 'Points & Rewards';

  useEffect(() => {
    memberAPI.getMyPoints()
      .then(r => setData(r.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: v('text-muted', '#6b7280') }} /></div>;
  if (error || !data) return <div className="text-sm" style={{ color: v('text-muted', '#6b7280') }}>Could not load your points.</div>;

  const c = data.counters || {};
  const msTitle = (t) => (typeof t === 'object' && t !== null ? (tt(t) || t.en || t.es || '') : (t || ''));

  return (
    <div data-testid="points-rewards-page">
      <div className="flex items-center gap-3 mb-2">
        <Trophy className="w-6 h-6" style={{ color: v('accent', '#c9a84c') }} />
        <h1 className="text-2xl font-bold" style={{ color: v('text-primary', '#fff'), fontFamily: "'DM Serif Display', serif" }} data-testid="points-title">{title}</h1>
      </div>
      <p className="text-sm mb-6" style={{ color: v('text-secondary', '#9ca3af') }}>
        Earn points by reading, commenting on and sharing our insights — and by inviting new members.
        {!data.enabled && <span className="block mt-1 text-amber-400 text-xs">The points program is not active yet — activity is being recorded and will count once it launches.</span>}
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat icon={Trophy} label="Points balance" value={data.balance} accent
          sub={data.rank ? `Rank #${data.rank} of ${data.rank_total}` : 'Start reading to earn'} />
        <Stat icon={Eye} label="Articles read" value={c.views || 0} sub={`+${(data.actions || {}).view ?? 1} pt each`} />
        <Stat icon={Share2} label="Shares" value={c.shares || 0} sub={`+${(data.actions || {}).share ?? 10} pts each`} />
        <Stat icon={UserPlus} label="Referrals" value={`${c.referrals_activated || 0} / ${c.referrals_total || 0}`} sub="activated / invited" />
      </div>

      {(data.badges || []).length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-6" data-testid="points-badges">
          <span className="text-xs" style={{ color: v('text-muted', '#6b7280') }}>Badges:</span>
          {data.badges.map(b => (
            <span key={b} className="text-[11px] px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 border"
              style={{ color: v('accent', '#c9a84c'), borderColor: v('accent', '#c9a84c'), backgroundColor: 'transparent' }}>
              <Medal className="w-3 h-3" /> {b}
            </span>
          ))}
        </div>
      )}

      {(data.milestones || []).length > 0 && (
        <SectionCard title="Milestones" right={`${data.milestones.filter(m => m.earned).length} of ${data.milestones.length} earned`} testid="points-milestones">
          <div>
            {data.milestones.map(ms => {
              const pct = ms.threshold ? Math.min(100, Math.round((ms.progress / ms.threshold) * 100)) : 0;
              return (
                <div key={ms.id} className="px-4 py-3 border-t first:border-t-0" style={rowBorder}>
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      {ms.earned
                        ? <CheckCircle2 className="w-4 h-4 shrink-0 text-green-400" />
                        : <span className="w-4 h-4 shrink-0 rounded-full border" style={{ borderColor: v('text-muted', '#6b7280') }} />}
                      <span className="text-sm font-medium truncate" style={{ color: v('text-primary', '#fff') }}>{msTitle(ms.title) || `${ms.threshold} ${METRIC_LABELS[ms.metric] || ms.metric}`}</span>
                    </div>
                    <span className="text-[11px] shrink-0" style={{ color: v('text-muted', '#6b7280') }}>
                      {ms.earned ? `Earned ${fmtDate(ms.granted_at)}` : `${ms.progress} / ${ms.threshold} ${METRIC_LABELS[ms.metric] || ms.metric}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: v('input-bg', '#0d0f14') }}>
                      <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${ms.earned ? 100 : pct}%`, backgroundColor: ms.earned ? '#4ade80' : v('accent', '#c9a84c') }} />
                    </div>
                    <span className="text-[11px] shrink-0 inline-flex items-center gap-1" style={{ color: v('text-muted', '#6b7280') }}>
                      {ms.reward_type === 'points' && <>+{ms.reward_value} pts</>}
                      {ms.reward_type === 'badge' && <><Medal className="w-3 h-3" /> badge</>}
                      {(ms.reward_type === 'gift' || ms.reward_type === 'invitation') && <><Gift className="w-3 h-3" /> {ms.reward_type}</>}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      {(data.rewards || []).length > 0 && (
        <SectionCard title="Rewards earned" right={`${data.rewards.length} reward${data.rewards.length === 1 ? '' : 's'}`} testid="points-rewards-earned">
          <table className="w-full text-sm">
            <thead><tr style={theadStyle}><Th>Reward</Th><Th>Type</Th><Th>Earned</Th><Th>Status</Th></tr></thead>
            <tbody>
              {data.rewards.map(r => (
                <tr key={r.id} className="border-t" style={rowBorder}>
                  <td className="p-3" style={{ color: v('text-primary', '#fff') }}>{msTitle(r.title) || `${r.threshold} ${METRIC_LABELS[r.metric] || r.metric}`}</td>
                  <td className="p-3 capitalize" style={{ color: v('text-secondary', '#9ca3af') }}>{r.reward_type}{r.reward_type === 'points' ? ` (+${r.reward_value})` : r.reward_type === 'badge' ? ` (${r.reward_value})` : ''}</td>
                  <td className="p-3" style={{ color: v('text-secondary', '#9ca3af') }}>{fmtDate(r.granted_at)}</td>
                  <td className="p-3">
                    {r.status === 'pending_fulfillment'
                      ? <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 inline-flex items-center gap-1"><Clock className="w-3 h-3" /> On its way</span>
                      : <span className="text-[11px] px-2 py-0.5 rounded bg-green-500/15 text-green-400 inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Granted</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      )}

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <SectionCard title="Leaderboard" right={data.rank ? `You are #${data.rank}` : null} testid="points-leaderboard">
          {(data.leaderboard || []).length === 0 ? (
            <p className="p-8 text-center text-sm" style={{ color: v('text-muted', '#6b7280') }}>No points earned yet — be the first on the board.</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr style={theadStyle}><Th>#</Th><Th>Member</Th><Th right>Points</Th></tr></thead>
              <tbody>
                {data.leaderboard.map((m, i) => {
                  const isMe = m.membership_id === data.my_membership_id;
                  return (
                    <tr key={m.membership_id || i} className="border-t" style={{ ...rowBorder, backgroundColor: isMe ? 'rgba(255,255,255,0.03)' : undefined }}>
                      <td className="p-3 w-10" style={{ color: i === 0 ? v('accent', '#c9a84c') : v('text-muted', '#6b7280') }}>{i === 0 ? <Crown className="w-4 h-4" /> : i + 1}</td>
                      <td className="p-3" style={{ color: v('text-primary', '#fff') }}>
                        {m.first_name || 'Member'}{isMe && <span className="ml-1.5 text-[10px]" style={{ color: v('accent', '#c9a84c') }}>(you)</span>}
                        <div className="text-[11px]" style={{ color: v('text-muted', '#6b7280') }}>{m.membership_id}</div>
                      </td>
                      <td className="p-3 text-right font-medium" style={{ color: v('accent', '#c9a84c') }}>{m.points_balance}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </SectionCard>

        <SectionCard title="My referrals" right={`${c.referrals_total || 0} invited`} testid="points-referrals">
          {(data.referrals || []).length === 0 ? (
            <p className="p-8 text-center text-sm" style={{ color: v('text-muted', '#6b7280') }}>
              Share any Insights article with your personal link — every reader who registers appears here under your sponsorship.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr style={theadStyle}><Th>Member</Th><Th>Joined</Th><Th>Status</Th></tr></thead>
              <tbody>
                {data.referrals.map((r, i) => (
                  <tr key={r.membership_id || i} className="border-t" style={rowBorder}>
                    <td className="p-3" style={{ color: v('text-primary', '#fff') }}>
                      {[r.first_name, r.last_name].filter(Boolean).join(' ') || 'Member'}
                      <div className="text-[11px]" style={{ color: v('text-muted', '#6b7280') }}>{r.membership_id}</div>
                    </td>
                    <td className="p-3" style={{ color: v('text-secondary', '#9ca3af') }}>{fmtDate(r.created_at)}</td>
                    <td className="p-3">
                      {r.account_status === 'active'
                        ? <span className="text-[11px] px-2 py-0.5 rounded bg-green-500/15 text-green-400">Active</span>
                        : <span className="text-[11px] px-2 py-0.5 rounded bg-blue-500/15 text-blue-400">Invited</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Recent activity" right={`Last ${(data.ledger || []).length} entries`} testid="points-ledger">
        {(data.ledger || []).length === 0 ? (
          <p className="p-8 text-center text-sm" style={{ color: v('text-muted', '#6b7280') }}>
            No activity yet. Read an Insights article to earn your first point.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr style={theadStyle}><Th>Action</Th><Th>When</Th><Th right>Points</Th></tr></thead>
            <tbody>
              {data.ledger.map(row => {
                const meta = ACTION_META[row.action] || ACTION_META.manual_adjust;
                const Icon = meta.icon;
                return (
                  <tr key={row.id} className="border-t" style={rowBorder}>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-2" style={{ color: v('text-primary', '#fff') }}>
                        <Icon className="w-3.5 h-3.5" style={{ color: v('text-muted', '#6b7280') }} /> {meta.label}
                      </span>
                    </td>
                    <td className="p-3 text-xs" style={{ color: v('text-secondary', '#9ca3af') }}>{fmtDateTime(row.created_at)}</td>
                    <td className="p-3 text-right font-medium" style={{ color: row.points >= 0 ? v('accent', '#c9a84c') : '#f87171' }}>{row.points >= 0 ? `+${row.points}` : row.points}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </SectionCard>
    </div>
  );
}
