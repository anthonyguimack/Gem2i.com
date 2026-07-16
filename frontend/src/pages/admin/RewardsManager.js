import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { adminAPI } from '../../lib/api';
import {
  Loader2, Trophy, Save, Plus, Edit2, Trash2, Gift, Medal, CheckCircle2,
  BarChart3, Eye, Share2, UserPlus, Power,
} from 'lucide-react';

const METRICS = [
  { value: 'views', label: 'Articles read' },
  { value: 'comments', label: 'Comments' },
  { value: 'shares', label: 'Shares' },
  { value: 'referrals_activated', label: 'Activated referrals' },
  { value: 'points_total', label: 'Total points' },
];
const REWARD_TYPES = [
  { value: 'points', label: 'Bonus points' },
  { value: 'badge', label: 'Badge' },
  { value: 'gift', label: 'Gift (manual delivery)' },
  { value: 'invitation', label: 'Invitation (manual delivery)' },
];
const ACTION_LABELS = {
  view: 'Article read', comment: 'Approved comment', share: 'Social share (base)',
  share_kms: 'Share: KMS article', share_news: 'Share: News post', share_brief: 'Share: Morning Brief',
  referral_signup: 'Referral signs up', referral_activation: 'Referral becomes active',
};
const CAP_LABELS = {
  max_pointed_views_per_day: 'Pointed reads / day',
  max_pointed_comments_per_day: 'Pointed comments / day',
  max_pointed_comments_per_post: 'Pointed comments / post',
  max_pointed_shares_per_day: 'Pointed shares / day',
};
const metricLabel = (v) => (METRICS.find(m => m.value === v) || {}).label || v;
const msTitle = (t) => (typeof t === 'object' && t !== null ? (t.en || t.es || '') : (t || ''));

const EMPTY_MS = { metric: 'views', threshold: 100, reward_type: 'points', reward_value: 50, title: { en: '', es: '' }, active: true };

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
      {children}
    </label>
  );
}
const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488]';

export default function RewardsManager() {
  const [cfg, setCfg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('config');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingIdx, setEditingIdx] = useState(null);
  const [draft, setDraft] = useState(EMPTY_MS);
  const [pending, setPending] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  const load = () => adminAPI.getRewardsConfig().then(r => setCfg(r.data)).catch(() => toast.error('Could not load rewards config')).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (tab === 'fulfillment') adminAPI.getRewardsPending().then(r => setPending(r.data || [])).catch(() => setPending([]));
    if (tab === 'analytics') adminAPI.getPointsAnalytics().then(r => setAnalytics(r.data)).catch(() => setAnalytics(null));
  }, [tab]);

  const save = async (next) => {
    const payload = next || cfg;
    setSaving(true);
    try {
      const r = await adminAPI.saveRewardsConfig(payload);
      setCfg(r.data);
      toast.success('Rewards configuration saved');
    } catch (e) { toast.error(e.response?.data?.detail || 'Save failed'); }
    finally { setSaving(false); }
  };

  const openEditor = (idx) => {
    setEditingIdx(idx);
    setDraft(idx === null ? { ...EMPTY_MS, title: { en: '', es: '' } } : { ...cfg.milestones[idx], title: { en: '', es: '', ...(typeof cfg.milestones[idx].title === 'object' ? cfg.milestones[idx].title : { en: cfg.milestones[idx].title || '' }) } });
    setEditorOpen(true);
  };
  const applyDraft = () => {
    if (!draft.threshold || Number(draft.threshold) <= 0) { toast.error('Threshold must be greater than zero'); return; }
    if (draft.reward_type === 'points' && (!draft.reward_value || Number(draft.reward_value) <= 0)) { toast.error('Bonus points must be greater than zero'); return; }
    if (draft.reward_type === 'badge' && !String(draft.reward_value || '').trim()) { toast.error('Badge name is required'); return; }
    const ms = [...(cfg.milestones || [])];
    if (editingIdx === null) ms.push(draft); else ms[editingIdx] = draft;
    setCfg({ ...cfg, milestones: ms });
    setEditorOpen(false);
  };
  const removeMilestone = (idx) => {
    if (!window.confirm('Remove this milestone? Grants already earned by members are kept.')) return;
    setCfg({ ...cfg, milestones: cfg.milestones.filter((_, i) => i !== idx) });
  };

  const fulfill = async (grantId) => {
    try {
      await adminAPI.fulfillReward(grantId);
      setPending(p => p.filter(g => g.id !== grantId));
      toast.success('Marked as fulfilled');
    } catch { toast.error('Could not update the grant'); }
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!cfg) return <div className="p-4 text-sm text-slate-500">Could not load the rewards configuration.</div>;

  return (
    <div className="max-w-5xl mx-auto" data-testid="rewards-manager">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center"><Trophy className="w-5 h-5" /></div>
          <div>
            <h1 className="text-xl font-bold text-[#1a2332]">Points &amp; Rewards</h1>
            <p className="text-sm text-slate-500">Member engagement points for reading, commenting, sharing and referring on Insights.</p>
          </div>
        </div>
        <button onClick={() => save()} disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#0D9488] text-white hover:bg-[#0b7e74] disabled:opacity-50"
          data-testid="rewards-save">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
        </button>
      </div>

      <div className={`mt-4 flex items-center justify-between rounded-xl border p-4 ${cfg.enabled ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`} data-testid="rewards-master-switch">
        <div className="flex items-center gap-3">
          <Power className={`w-5 h-5 ${cfg.enabled ? 'text-emerald-600' : 'text-amber-600'}`} />
          <div>
            <div className="text-sm font-semibold text-[#1a2332]">{cfg.enabled ? 'Program is LIVE' : 'Program is off'}</div>
            <div className="text-xs text-slate-500">{cfg.enabled ? 'Members are earning points right now.' : 'Activity (reads, shares) is still recorded, but no points are granted until you switch it on and save.'}</div>
          </div>
        </div>
        <button onClick={() => setCfg({ ...cfg, enabled: !cfg.enabled })}
          className={`relative w-11 h-6 rounded-full transition-colors ${cfg.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
          role="switch" aria-checked={cfg.enabled} data-testid="rewards-enable-toggle">
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${cfg.enabled ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
        </button>
      </div>

      <div className="mt-5 flex gap-1 border-b border-slate-200">
        {[['config', 'Configuration'], ['fulfillment', `Fulfillment${analytics?.pending_fulfillment ? ` (${analytics.pending_fulfillment})` : ''}`], ['analytics', 'Analytics']].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 ${tab === k ? 'border-[#0D9488] text-[#0D9488]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            data-testid={`rewards-tab-${k}`}>{label}</button>
        ))}
      </div>

      {tab === 'config' && (
        <>
          <div className="mt-6 grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="text-sm font-semibold text-[#1a2332] mb-1">Points per action</h2>
              <p className="text-xs text-slate-500 mb-4">Set to 0 to stop rewarding an action.</p>
              <div className="space-y-3">
                {Object.keys(ACTION_LABELS).map(k => (
                  <div key={k} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-slate-600">{ACTION_LABELS[k]}</span>
                    <input type="number" min="0" className={`${inputCls} !w-24 text-right`} value={cfg.actions?.[k] ?? 0}
                      onChange={e => setCfg({ ...cfg, actions: { ...cfg.actions, [k]: e.target.value } })}
                      data-testid={`action-points-${k}`} />
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="text-sm font-semibold text-[#1a2332] mb-1">Anti-abuse limits</h2>
              <p className="text-xs text-slate-500 mb-4">A member can never earn twice for the same article/share; these caps additionally limit volume. 0 = unlimited.</p>
              <div className="space-y-3">
                {Object.keys(CAP_LABELS).map(k => (
                  <div key={k} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-slate-600">{CAP_LABELS[k]}</span>
                    <input type="number" min="0" className={`${inputCls} !w-24 text-right`} value={cfg.anti_abuse?.[k] ?? 0}
                      onChange={e => setCfg({ ...cfg, anti_abuse: { ...cfg.anti_abuse, [k]: e.target.value } })} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[#1a2332]">Milestones</h2>
                <p className="text-xs text-slate-500">Each milestone is granted once per member when the threshold is crossed.</p>
              </div>
              <button onClick={() => openEditor(null)} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-[#0D9488] text-[#0D9488] hover:bg-[#0D9488]/5" data-testid="milestone-add">
                <Plus className="w-3.5 h-3.5" /> Add milestone
              </button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-600">
                  <th className="p-3 font-medium">Milestone</th>
                  <th className="p-3 font-medium">Condition</th>
                  <th className="p-3 font-medium">Reward</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(cfg.milestones || []).map((ms, idx) => (
                  <tr key={ms.id || idx} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="p-3 text-[#1a2332] font-medium">{msTitle(ms.title) || '—'}</td>
                    <td className="p-3 text-slate-500">{ms.threshold} {metricLabel(ms.metric).toLowerCase()}</td>
                    <td className="p-3 text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        {ms.reward_type === 'points' && <>+{ms.reward_value} points</>}
                        {ms.reward_type === 'badge' && <><Medal className="w-3.5 h-3.5 text-[#0D9488]" /> {ms.reward_value}</>}
                        {(ms.reward_type === 'gift' || ms.reward_type === 'invitation') && <><Gift className="w-3.5 h-3.5 text-amber-500" /> {ms.reward_type}{ms.reward_value ? ` — ${ms.reward_value}` : ''}</>}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${ms.active !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{ms.active !== false ? 'Active' : 'Paused'}</span>
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <button onClick={() => openEditor(idx)} className="p-1.5 text-slate-400 hover:text-[#0D9488]" title="Edit"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => removeMilestone(idx)} className="p-1.5 text-slate-400 hover:text-red-500" title="Remove"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(cfg.milestones || []).length === 0 && <div className="p-10 text-center text-slate-400 text-sm">No milestones yet — add the first one.</div>}
          </div>

          {editorOpen && (
            <div className="mt-4 bg-white rounded-xl border-2 border-[#0D9488]/30 p-5" data-testid="milestone-editor">
              <h3 className="text-sm font-semibold text-[#1a2332] mb-4">{editingIdx === null ? 'New milestone' : 'Edit milestone'}</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Title (English)"><input className={inputCls} value={draft.title.en} onChange={e => setDraft({ ...draft, title: { ...draft.title, en: e.target.value } })} placeholder="e.g. Avid Reader" /></Field>
                <Field label="Título (Español)"><input className={inputCls} value={draft.title.es} onChange={e => setDraft({ ...draft, title: { ...draft.title, es: e.target.value } })} placeholder="ej. Lector ávido" /></Field>
                <Field label="Metric">
                  <select className={inputCls} value={draft.metric} onChange={e => setDraft({ ...draft, metric: e.target.value })}>
                    {METRICS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </Field>
                <Field label="Threshold"><input type="number" min="1" className={inputCls} value={draft.threshold} onChange={e => setDraft({ ...draft, threshold: e.target.value })} /></Field>
                <Field label="Reward type">
                  <select className={inputCls} value={draft.reward_type} onChange={e => setDraft({ ...draft, reward_type: e.target.value, reward_value: e.target.value === 'points' ? 50 : '' })}>
                    {REWARD_TYPES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </Field>
                <Field label={draft.reward_type === 'points' ? 'Bonus points' : draft.reward_type === 'badge' ? 'Badge name' : 'Description (what the member receives)'}>
                  {draft.reward_type === 'points'
                    ? <input type="number" min="1" className={inputCls} value={draft.reward_value} onChange={e => setDraft({ ...draft, reward_value: e.target.value })} />
                    : <input className={inputCls} value={draft.reward_value || ''} onChange={e => setDraft({ ...draft, reward_value: e.target.value })} placeholder={draft.reward_type === 'badge' ? 'e.g. recruiter' : 'e.g. Dinner invitation'} />}
                </Field>
              </div>
              <label className="mt-4 inline-flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input type="checkbox" checked={draft.active !== false} onChange={e => setDraft({ ...draft, active: e.target.checked })} className="accent-[#0D9488]" /> Active
              </label>
              <div className="mt-4 flex gap-2">
                <button onClick={applyDraft} className="px-4 py-2 rounded-lg text-sm font-medium bg-[#0D9488] text-white hover:bg-[#0b7e74]" data-testid="milestone-apply">{editingIdx === null ? 'Add' : 'Apply'}</button>
                <button onClick={() => setEditorOpen(false)} className="px-4 py-2 rounded-lg text-sm text-slate-500 hover:bg-slate-100">Cancel</button>
              </div>
              <p className="mt-3 text-[11px] text-slate-400">Remember to press <b>Save</b> (top right) to publish your changes.</p>
            </div>
          )}
        </>
      )}

      {tab === 'fulfillment' && (
        <div className="mt-6 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-[#1a2332]">Pending gifts &amp; invitations</h2>
            <p className="text-xs text-slate-500">Milestones with a physical/manual reward wait here until you deliver them.</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-slate-600">
                <th className="p-3 font-medium">Member</th>
                <th className="p-3 font-medium">Milestone</th>
                <th className="p-3 font-medium">Reward</th>
                <th className="p-3 font-medium">Earned</th>
                <th className="p-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {pending.map(g => (
                <tr key={g.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="p-3">
                    <div className="text-[#1a2332] font-medium">{g.member_name || '—'}</div>
                    <div className="text-xs text-slate-400">{g.membership_id} · {g.member_email}</div>
                  </td>
                  <td className="p-3 text-slate-500">{msTitle(g.title) || `${g.threshold} ${metricLabel(g.metric).toLowerCase()}`}</td>
                  <td className="p-3 text-slate-500"><span className="inline-flex items-center gap-1.5"><Gift className="w-3.5 h-3.5 text-amber-500" /> {g.reward_type}{g.reward_value ? ` — ${g.reward_value}` : ''}</span></td>
                  <td className="p-3 text-slate-400 text-xs">{g.granted_at ? new Date(g.granted_at).toLocaleDateString() : '—'}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => fulfill(g.id)} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700" data-testid={`fulfill-${g.id}`}>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Mark fulfilled
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pending.length === 0 && <div className="p-10 text-center text-slate-400 text-sm">Nothing waiting — all earned gifts and invitations have been delivered.</div>}
        </div>
      )}

      {tab === 'analytics' && (
        analytics ? (
          <div className="mt-6 space-y-6" data-testid="rewards-analytics">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { icon: Trophy, label: 'Points issued', value: analytics.points_issued },
                { icon: UserPlus, label: 'Members with points', value: analytics.members_with_points },
                { icon: Share2, label: 'Referral conversion', value: `${analytics.funnel?.signup_to_active_pct ?? 0}%`, sub: `${analytics.funnel?.activated ?? 0} active of ${analytics.funnel?.signups ?? 0} signups` },
                { icon: Gift, label: 'Pending fulfillment', value: analytics.pending_fulfillment },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-1"><s.icon className="w-3.5 h-3.5" /> {s.label}</div>
                  <div className="text-2xl font-bold text-[#1a2332]">{s.value}</div>
                  {s.sub && <div className="text-[11px] text-slate-400 mt-0.5">{s.sub}</div>}
                </div>
              ))}
            </div>
            <div className="text-xs text-slate-500 bg-white rounded-xl border border-slate-200 p-4">
              Referral funnel: <b>{analytics.funnel?.clicks ?? 0}</b> link clicks → <b>{analytics.funnel?.clicks_converted ?? 0}</b> converted clicks → <b>{analytics.funnel?.signups ?? 0}</b> registrations → <b>{analytics.funnel?.activated ?? 0}</b> activated members.
            </div>
            <div className="grid lg:grid-cols-3 gap-6 items-start">
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-[#0D9488]" /><h3 className="text-sm font-semibold text-[#1a2332]">Top members</h3></div>
                {(analytics.top_members || []).length === 0 ? <div className="p-8 text-center text-slate-400 text-sm">No points yet.</div> : (
                  <table className="w-full text-sm">
                    <tbody>
                      {analytics.top_members.map((m, i) => (
                        <tr key={m.member_id || i} className="border-b border-slate-50">
                          <td className="p-2.5 pl-4 w-8 text-slate-400">{i + 1}</td>
                          <td className="p-2.5">
                            <div className="text-[#1a2332]">{[m.first_name, m.last_name].filter(Boolean).join(' ') || m.email}</div>
                            <div className="text-[11px] text-slate-400">{m.membership_id}</div>
                          </td>
                          <td className="p-2.5 pr-4 text-right font-semibold text-[#0D9488]">{m.points_balance}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              {[['most_read', 'Most read posts', Eye], ['most_shared', 'Most shared posts', Share2]].map(([key, title, Icon]) => (
                <div key={key} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2"><Icon className="w-4 h-4 text-[#0D9488]" /><h3 className="text-sm font-semibold text-[#1a2332]">{title}</h3></div>
                  {(analytics[key] || []).length === 0 ? <div className="p-8 text-center text-slate-400 text-sm">No data yet.</div> : (
                    <table className="w-full text-sm">
                      <tbody>
                        {analytics[key].map((p, i) => (
                          <tr key={p.post_id || i} className="border-b border-slate-50">
                            <td className="p-2.5 pl-4 text-[#1a2332]">{p.title || p.slug || `Post ${p.post_id}`}</td>
                            <td className="p-2.5 pr-4 text-right font-semibold text-[#0D9488] w-16">{p.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 className="w-5 h-5 animate-spin" /></div>
      )}
    </div>
  );
}
