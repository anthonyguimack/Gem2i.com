import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { toast } from 'sonner';
import { memberAPI, publicAPI } from '../../lib/api';
import { Loader2, DollarSign, TrendingUp, Clock, CheckCircle2, CalendarCheck, BarChart3, Package, Plus, Edit2, Trash2, Send } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import BundleEditorDialog from '../../components/BundleEditorDialog';

const v = (name, fb) => `var(--ma-${name}, ${fb})`;
const fmtMoney = (cents, currency = 'usd') => {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: (currency || 'usd').toUpperCase() }).format((cents || 0) / 100); }
  catch { return `$${((cents || 0) / 100).toFixed(2)}`; }
};
const fmtMonth = (key) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString(undefined, { month: 'short' });
};
const fmtDate = (iso) => { if (!iso) return '—'; const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString(); };

function Stat({ icon: Icon, label, value, sub }) {
  return (
    <div className="p-4 rounded-lg border" style={{ backgroundColor: v('card-bg', '#13161e'), borderColor: v('card-border', 'rgba(255,255,255,0.05)') }}>
      <div className="flex items-center gap-2 text-xs mb-2" style={{ color: v('text-muted', '#6b7280') }}>
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <div className="text-2xl font-bold" style={{ color: v('text-primary', '#fff'), fontFamily: "'DM Serif Display', serif" }}>{value}</div>
      {sub && <div className="text-[11px] mt-0.5" style={{ color: v('text-muted', '#6b7280') }}>{sub}</div>}
    </div>
  );
}

export default function MentorEarnings() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paidEnabled, setPaidEnabled] = useState(false);
  const [myBundles, setMyBundles] = useState([]);
  const [editing, setEditing] = useState(null);
  const [bundleOpen, setBundleOpen] = useState(false);
  const [savingBundle, setSavingBundle] = useState(false);
  const [payouts, setPayouts] = useState({ fee_percent: 15, ledger: null, records: [] });
  const ctx = useOutletContext() || {};
  const title = ctx.sectionLabel ? ctx.sectionLabel('earnings', 'Earnings') : 'Earnings';

  const loadBundles = () => memberAPI.getMyMentorBundles().then(r => setMyBundles(r.data || [])).catch(() => setMyBundles([]));
  const loadPayouts = () => memberAPI.getMyPayouts().then(r => setPayouts(r.data || { fee_percent: 15, ledger: null, records: [] })).catch(() => {});

  useEffect(() => {
    Promise.all([
      memberAPI.getMentorEarnings().catch(() => ({ data: null })),
      publicAPI.getSettings().catch(() => ({ data: {} })),
    ]).then(([e, s]) => {
      setData(e.data);
      setPaidEnabled(s.data?.mentor_slots_paid_enabled === true);
      setLoading(false);
    });
    loadBundles();
    loadPayouts();
  }, []);

  const handleSaveBundle = async () => {
    if (!editing?.name?.trim()) { toast.error('Name required'); return; }
    setSavingBundle(true);
    try {
      if (editing.id) await memberAPI.updateMentorBundle(editing.id, editing);
      else await memberAPI.createMentorBundle(editing);
      toast.success('Saved'); setBundleOpen(false); loadBundles();
    } catch (e) { toast.error(e.response?.data?.detail || 'Error'); }
    finally { setSavingBundle(false); }
  };
  const handleDeleteBundle = async (id) => {
    if (!window.confirm('Delete this bundle? Existing credits remain valid.')) return;
    try { await memberAPI.deleteMentorBundle(id); toast.success('Deleted'); loadBundles(); } catch { toast.error('Error'); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: v('text-muted', '#6b7280') }} /></div>;
  if (!data) return <div className="text-sm" style={{ color: v('text-muted', '#6b7280') }}>Could not load earnings.</div>;

  const currency = data.currency || 'usd';
  const chart = (data.monthly_breakdown || []).map(m => ({
    month: fmtMonth(m.month),
    revenue: (m.revenue_cents || 0) / 100,
    sessions: m.sessions || 0,
    monthKey: m.month,
  }));

  return (
    <div data-testid="mentor-earnings-page">
      <div className="flex items-center gap-3 mb-2">
        <BarChart3 className="w-6 h-6" style={{ color: v('accent', '#c9a84c') }} />
        <h1 className="text-2xl font-bold" style={{ color: v('text-primary', '#fff'), fontFamily: "'DM Serif Display', serif" }} data-testid="earnings-title">{title}</h1>
      </div>
      <p className="text-sm mb-6" style={{ color: v('text-secondary', '#9ca3af') }}>
        Your paid mentorship sessions at a glance.
        {!paidEnabled && <span className="block mt-1 text-amber-400 text-xs">Paid slots are currently disabled by the administrator — no new charges will occur, but past paid sessions are shown below.</span>}
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat icon={DollarSign} label="Lifetime Revenue" value={fmtMoney(data.total_revenue_cents, currency)} sub={`${data.sessions_total} paid session${data.sessions_total === 1 ? '' : 's'}`} />
        <Stat icon={TrendingUp} label="This Month" value={fmtMoney(data.this_month_revenue_cents, currency)} />
        <Stat icon={Clock} label="Pending Payout" value={fmtMoney(data.pending_revenue_cents, currency)} sub={`${data.sessions_pending} upcoming`} />
        <Stat icon={CheckCircle2} label="Delivered" value={data.sessions_delivered} sub={`${data.sessions_pending} upcoming`} />
      </div>

      <div className="rounded-lg border p-4 mb-6" style={{ backgroundColor: v('card-bg', '#13161e'), borderColor: v('card-border', 'rgba(255,255,255,0.05)') }} data-testid="earnings-chart">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold" style={{ color: v('text-primary', '#fff') }}>Monthly revenue</h2>
          <span className="text-[11px]" style={{ color: v('text-muted', '#6b7280') }}>Last 12 months</span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chart} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0d0f14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, fontSize: 12 }}
              formatter={(value) => [`$${value.toFixed(2)}`, 'Revenue']}
              cursor={{ fill: 'rgba(201,168,76,0.08)' }}
            />
            <Bar dataKey="revenue" fill={getComputedStyle(document.documentElement).getPropertyValue('--ma-accent')?.trim() || '#c9a84c'} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-lg border overflow-x-auto mb-6" style={{ backgroundColor: v('card-bg', '#13161e'), borderColor: v('card-border', 'rgba(255,255,255,0.05)') }} data-testid="earnings-txn-table">
        <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor: v('card-border', 'rgba(255,255,255,0.05)') }}>
          <h2 className="text-sm font-semibold" style={{ color: v('text-primary', '#fff') }}>Paid sessions</h2>
          <span className="text-[11px]" style={{ color: v('text-muted', '#6b7280') }}>{data.transactions.length} record{data.transactions.length === 1 ? '' : 's'}</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: v('input-bg', '#0d0f14') }}>
              <th className="text-left p-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: v('text-muted', '#6b7280') }}>Session</th>
              <th className="text-left p-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: v('text-muted', '#6b7280') }}>Member</th>
              <th className="text-left p-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: v('text-muted', '#6b7280') }}>Date</th>
              <th className="text-right p-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: v('text-muted', '#6b7280') }}>Amount</th>
              <th className="text-left p-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: v('text-muted', '#6b7280') }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.transactions.map(t => (
              <tr key={t.booking_id} className="border-t" style={{ borderColor: v('card-border', 'rgba(255,255,255,0.05)') }}>
                <td className="p-3" style={{ color: v('text-primary', '#fff') }}>
                  <div className="font-medium">{t.slot_title}</div>
                  <div className="text-[11px]" style={{ color: v('text-muted', '#6b7280') }}>{t.session_type}</div>
                </td>
                <td className="p-3" style={{ color: v('text-secondary', '#9ca3af') }}>
                  {t.member_name || '—'}
                  {t.membership_id && <div className="text-[11px]" style={{ color: v('text-muted', '#6b7280') }}>{t.membership_id}</div>}
                </td>
                <td className="p-3" style={{ color: v('text-secondary', '#9ca3af') }}>{fmtDate(t.slot_date)}</td>
                <td className="p-3 text-right font-medium" style={{ color: v('accent', '#c9a84c') }}>{fmtMoney(t.amount_cents, t.currency)}</td>
                <td className="p-3">
                  {t.status === 'delivered' ? (
                    <span className="text-[11px] px-2 py-0.5 rounded bg-green-500/15 text-green-400 inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Delivered</span>
                  ) : (
                    <span className="text-[11px] px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 inline-flex items-center gap-1"><CalendarCheck className="w-3 h-3" /> Upcoming</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.transactions.length === 0 && (
          <div className="p-12 text-center text-sm" style={{ color: v('text-muted', '#6b7280') }}>
            No paid sessions yet. Once members book and pay for your slots, earnings will appear here.
          </div>
        )}
      </div>

      {/* Mentor personal bundles */}
      <div className="rounded-lg border overflow-x-auto" style={{ backgroundColor: v('card-bg', '#13161e'), borderColor: v('card-border', 'rgba(255,255,255,0.05)') }} data-testid="my-bundles-block">
        <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor: v('card-border', 'rgba(255,255,255,0.05)') }}>
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4" style={{ color: v('accent', '#c9a84c') }} />
            <h2 className="text-sm font-semibold" style={{ color: v('text-primary', '#fff') }}>My bundles</h2>
          </div>
          <button onClick={() => { setEditing({ name: '', description: '', session_count: 5, price_cents: 0, single_session_value_cents: 0, currency: 'usd', active: true }); setBundleOpen(true); }}
            className="text-xs px-3 py-1.5 rounded font-medium flex items-center gap-1.5"
            style={{ backgroundColor: v('button-bg', '#c9a84c'), color: v('button-text', '#0d0f14') }}
            data-testid="add-my-bundle-btn">
            <Plus className="w-3 h-3" /> New bundle
          </button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: v('input-bg', '#0d0f14') }}>
              <th className="text-left p-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: v('text-muted', '#6b7280') }}>Name</th>
              <th className="text-left p-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: v('text-muted', '#6b7280') }}>Sessions</th>
              <th className="text-left p-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: v('text-muted', '#6b7280') }}>Price</th>
              <th className="text-left p-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: v('text-muted', '#6b7280') }}>Status</th>
              <th className="text-right p-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: v('text-muted', '#6b7280') }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {myBundles.map(b => (
              <tr key={b.id} className="border-t" style={{ borderColor: v('card-border', 'rgba(255,255,255,0.05)') }}>
                <td className="p-3" style={{ color: v('text-primary', '#fff') }}>{b.name}</td>
                <td className="p-3" style={{ color: v('text-secondary', '#9ca3af') }}>{b.session_count}</td>
                <td className="p-3" style={{ color: v('accent', '#c9a84c') }}>{fmtMoney(b.price_cents, b.currency)}</td>
                <td className="p-3"><span className={`text-[11px] px-2 py-0.5 rounded ${b.active ? 'bg-green-500/15 text-green-400' : 'bg-gray-500/15 text-gray-400'}`}>{b.active ? 'Active' : 'Hidden'}</span></td>
                <td className="p-3 text-right">
                  <button onClick={() => { setEditing({ ...b }); setBundleOpen(true); }} className="p-1.5" style={{ color: v('text-muted', '#6b7280') }}><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDeleteBundle(b.id)} className="p-1.5 text-red-400"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {myBundles.length === 0 && (
          <div className="p-8 text-center text-sm" style={{ color: v('text-muted', '#6b7280') }}>
            Offer prepaid packs to lock in recurring revenue. Your bundles appear on the member-facing Session Bundles page.
          </div>
        )}
      </div>

      <BundleEditorDialog open={bundleOpen} onOpenChange={setBundleOpen} editing={editing} setEditing={setEditing} onSave={handleSaveBundle} saving={savingBundle} theme="mentor-dark" />

      {/* Payouts ledger */}
      {payouts.ledger && (
        <div className="rounded-lg border overflow-x-auto mt-6" style={{ backgroundColor: v('card-bg', '#13161e'), borderColor: v('card-border', 'rgba(255,255,255,0.05)') }} data-testid="mentor-payouts-block">
          <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor: v('card-border', 'rgba(255,255,255,0.05)') }}>
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4" style={{ color: v('accent', '#c9a84c') }} />
              <h2 className="text-sm font-semibold" style={{ color: v('text-primary', '#fff') }}>Payouts</h2>
            </div>
            <span className="text-[11px]" style={{ color: v('text-muted', '#6b7280') }}>Platform fee: {payouts.fee_percent}%</span>
          </div>
          <div className="grid grid-cols-4 gap-px" style={{ backgroundColor: v('card-border', 'rgba(255,255,255,0.05)') }}>
            {[
              { label: 'Gross', value: fmtMoney(payouts.ledger.gross_cents, 'usd') },
              { label: 'Fee', value: fmtMoney(payouts.ledger.fee_cents, 'usd') },
              { label: 'Paid out', value: fmtMoney(payouts.ledger.paid_cents, 'usd') },
              { label: 'Balance owed', value: fmtMoney(payouts.ledger.balance_cents, 'usd'), accent: true },
            ].map((s, i) => (
              <div key={i} className="p-3 text-center" style={{ backgroundColor: v('card-bg', '#13161e') }}>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: v('text-muted', '#6b7280') }}>{s.label}</p>
                <p className="text-lg font-bold mt-1" style={{ color: s.accent ? v('accent', '#c9a84c') : v('text-primary', '#fff') }}>{s.value}</p>
              </div>
            ))}
          </div>
          {payouts.records.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: v('input-bg', '#0d0f14') }}>
                  <th className="text-left p-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: v('text-muted', '#6b7280') }}>Date</th>
                  <th className="text-left p-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: v('text-muted', '#6b7280') }}>Method</th>
                  <th className="text-left p-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: v('text-muted', '#6b7280') }}>Reference</th>
                  <th className="text-right p-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: v('text-muted', '#6b7280') }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {payouts.records.map(r => (
                  <tr key={r.id} className="border-t" style={{ borderColor: v('card-border', 'rgba(255,255,255,0.05)') }}>
                    <td className="p-3 text-xs" style={{ color: v('text-secondary', '#9ca3af') }}>{new Date(r.created_at).toLocaleString()}</td>
                    <td className="p-3 text-xs" style={{ color: v('text-secondary', '#9ca3af') }}>{r.method}</td>
                    <td className="p-3 text-xs" style={{ color: v('text-muted', '#6b7280') }}>{r.reference || '—'}</td>
                    <td className="p-3 text-right font-medium" style={{ color: v('accent', '#c9a84c') }}>{fmtMoney(r.amount_cents, 'usd')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {payouts.records.length === 0 && (
            <p className="p-6 text-center text-xs" style={{ color: v('text-muted', '#6b7280') }}>No payouts recorded yet. Your earned balance accrues here until the administrator settles it.</p>
          )}
        </div>
      )}
    </div>
  );
}
