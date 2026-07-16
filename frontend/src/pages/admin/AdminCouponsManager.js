import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { Loader2, Plus, Trash2, Edit2, Save, Ticket, Percent, DollarSign, Users, Calendar, ToggleLeft, BarChart3, TrendingUp, Crown, Package } from 'lucide-react';
import { useDataTable, DataTableToolbar, DataTablePagination, SortableTh } from '../../components/admin/useDataTable';

const emptyCoupon = {
  code: '',
  discount_type: 'percent',
  discount_value: 10,
  applies_to: 'both',
  usage_mode: 'total',
  usage_limit: 0,
  expires_at: '',
  active: true,
};

const fmtMoney = (c) => `$${((c || 0) / 100).toFixed(2)}`;
const fmtDiscount = (c) => {
  if (!c) return '';
  if (c.discount_type === 'percent') return `${c.discount_value}%`;
  return `$${((c.discount_value || 0) / 100).toFixed(2)}`;
};

export default function AdminCouponsManager() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const load = () => {
    setLoading(true);
    adminAPI.getCoupons().then(r => setCoupons(r.data || [])).catch(() => toast.error('Failed to load coupons')).finally(() => setLoading(false));
  };
  const loadAnalytics = () => {
    setLoadingAnalytics(true);
    adminAPI.getCouponAnalytics().then(r => setAnalytics(r.data)).catch(() => toast.error('Failed to load analytics')).finally(() => setLoadingAnalytics(false));
  };
  useEffect(() => { load(); loadAnalytics(); }, []);

  const openNew = () => { setEditing({ ...emptyCoupon }); setOpen(true); };
  const openEdit = (c) => {
    let dv = c.discount_value;
    // For flat, UI shows dollars; backend stores cents
    setEditing({ ...c, discount_value: c.discount_type === 'flat' ? dv / 100 : dv, expires_at: c.expires_at ? c.expires_at.slice(0, 10) : '' });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!editing?.code?.trim()) { toast.error('Code is required'); return; }
    setSaving(true);
    try {
      const payload = {
        ...editing,
        code: editing.code.trim().toUpperCase(),
        discount_value: editing.discount_type === 'flat'
          ? Math.max(0, Math.round(parseFloat(editing.discount_value || 0) * 100))
          : Math.max(0, Math.min(100, parseFloat(editing.discount_value || 0))),
        usage_limit: Math.max(0, parseInt(editing.usage_limit || 0)),
        expires_at: editing.expires_at || null,
      };
      if (editing.id) {
        await adminAPI.updateCoupon(editing.id, payload);
        toast.success('Coupon updated');
      } else {
        await adminAPI.createCoupon(payload);
        toast.success('Coupon created');
      }
      setOpen(false); setEditing(null); load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id, code) => {
    if (!window.confirm(`Delete coupon "${code}"? This will not revoke past redemptions.`)) return;
    try { await adminAPI.deleteCoupon(id); toast.success('Deleted'); load(); }
    catch (e) { toast.error(e.response?.data?.detail || 'Delete failed'); }
  };

  const dt = useDataTable(coupons, {
    searchFields: ['code', 'discount_type', 'applies_to'],
    defaultSort: { key: 'code', dir: 'asc' },
    storageKey: 'coupons',
  });

  return (
    <div data-testid="admin-coupons-manager">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--ad-heading, #1a2332)', fontFamily: "'Playfair Display', serif" }}>
            <Ticket className="w-6 h-6" style={{ color: 'var(--ad-accent, #0D9488)' }} /> Discount Coupons
          </h1>
          <p className="text-xs text-slate-500 mt-1">Codes can apply to mentorship slots, session bundles, or both — with percentage or flat discounts, expiry, and usage limits.</p>
        </div>
        <button onClick={openNew} className="text-white px-4 py-2 rounded-sm text-sm font-medium flex items-center gap-2" style={{ backgroundColor: 'var(--ad-button-bg, #0D9488)' }} data-testid="add-coupon-btn">
          <Plus className="w-4 h-4" /> New Coupon
        </button>
      </div>

      <Tabs defaultValue="coupons" className="w-full" onValueChange={(v) => { if (v === 'analytics') loadAnalytics(); }}>
        <TabsList className="mb-4">
          <TabsTrigger value="coupons" data-testid="tab-coupons"><Ticket className="w-3 h-3 mr-1" /> Coupons</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics"><BarChart3 className="w-3 h-3 mr-1" /> Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="coupons">
          <DataTableToolbar dt={dt} testId="coupons" placeholder="Search by code, discount type, applies to…" />
          <div className="rounded-lg border bg-white overflow-x-auto" style={{ borderColor: 'var(--ad-border, #e2e8f0)' }}>
        {loading ? (
          <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div>
        ) : coupons.length === 0 ? (
          <div className="p-12 text-center">
            <Ticket className="w-8 h-8 mx-auto mb-3 text-slate-300" />
            <p className="text-sm text-slate-500">No coupons yet. Create your first one above.</p>
          </div>
        ) : (
          <>
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <SortableTh dt={dt} field="code">Code</SortableTh>
                <SortableTh dt={dt} field="discount_value">Discount</SortableTh>
                <SortableTh dt={dt} field="applies_to">Applies to</SortableTh>
                <SortableTh dt={dt} field="usage_count">Usage</SortableTh>
                <SortableTh dt={dt} field="expires_at">Expires</SortableTh>
                <SortableTh dt={dt} field="active">Status</SortableTh>
                <th className="text-right p-3 font-medium text-xs text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {dt.visibleItems.map(c => (
                <tr key={c.id} className="border-t" style={{ borderColor: 'var(--ad-border, #e2e8f0)' }} data-testid={`coupon-row-${c.id}`}>
                  <td className="p-3 font-mono text-xs font-semibold">{c.code}</td>
                  <td className="p-3 text-xs">
                    <span className="inline-flex items-center gap-1">
                      {c.discount_type === 'percent' ? <Percent className="w-3 h-3" /> : <DollarSign className="w-3 h-3" />}
                      {fmtDiscount(c)}
                    </span>
                  </td>
                  <td className="p-3 text-xs capitalize">{c.applies_to}</td>
                  <td className="p-3 text-xs">
                    <span className="inline-flex items-center gap-1 text-slate-500">
                      <Users className="w-3 h-3" />
                      {c.usage_limit > 0 ? `${c.usage_count || 0}/${c.usage_limit}` : `${c.usage_count || 0} / ∞`}
                      <span className="text-[10px] ml-1 px-1.5 py-0.5 rounded bg-slate-100">{c.usage_mode === 'per_member' ? 'per member' : 'total'}</span>
                    </span>
                  </td>
                  <td className="p-3 text-xs text-slate-500">{c.expires_at ? <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> {c.expires_at.slice(0, 10)}</span> : '—'}</td>
                  <td className="p-3 text-xs">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${c.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                      {c.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button onClick={() => openEdit(c)} className="inline-flex p-1.5 hover:bg-slate-100 rounded mr-1" data-testid={`edit-coupon-${c.id}`}><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(c.id, c.code)} className="inline-flex p-1.5 hover:bg-red-50 text-red-500 rounded" data-testid={`delete-coupon-${c.id}`}><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {dt.totalAll > 0 && dt.totalFiltered === 0 && <div className="p-8 text-center text-slate-400 text-sm">No coupons match your search</div>}
          <DataTablePagination dt={dt} testId="coupons" />
          </>
        )}
      </div>
        </TabsContent>

        <TabsContent value="analytics">
          {loadingAnalytics || !analytics ? (
            <div className="rounded-lg border bg-white p-12 text-center" style={{ borderColor: 'var(--ad-border, #e2e8f0)' }}>
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
            </div>
          ) : (
            <div className="space-y-6" data-testid="coupon-analytics">
              {/* KPI cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-lg border bg-white p-4" style={{ borderColor: 'var(--ad-border, #e2e8f0)' }} data-testid="analytics-kpi-redemptions">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1"><Ticket className="w-3 h-3" /> Redemptions</p>
                  <p className="text-2xl font-bold" style={{ color: 'var(--ad-heading, #1a2332)' }}>{analytics.totals.redemptions}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">across {analytics.totals.coupons_total} coupon{analytics.totals.coupons_total === 1 ? '' : 's'} ({analytics.totals.coupons_active} active)</p>
                </div>
                <div className="rounded-lg border bg-white p-4" style={{ borderColor: 'var(--ad-border, #e2e8f0)' }} data-testid="analytics-kpi-discount">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1"><Percent className="w-3 h-3" /> Discounts Given</p>
                  <p className="text-2xl font-bold text-rose-600">−{fmtMoney(analytics.totals.discount_cents)}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">total savings delivered to members</p>
                </div>
                <div className="rounded-lg border bg-white p-4" style={{ borderColor: 'var(--ad-border, #e2e8f0)' }} data-testid="analytics-kpi-revenue">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Revenue Driven</p>
                  <p className="text-2xl font-bold text-emerald-600">{fmtMoney(analytics.totals.revenue_cents)}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">net revenue from couponed transactions</p>
                </div>
                <div className="rounded-lg border bg-white p-4" style={{ borderColor: 'var(--ad-border, #e2e8f0)' }} data-testid="analytics-kpi-avg">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1"><DollarSign className="w-3 h-3" /> Avg. Ticket</p>
                  <p className="text-2xl font-bold" style={{ color: 'var(--ad-heading, #1a2332)' }}>
                    {analytics.totals.redemptions > 0 ? fmtMoney(analytics.totals.revenue_cents / analytics.totals.redemptions) : '$0.00'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">avg. net per redemption</p>
                </div>
              </div>

              {/* Per-coupon table (sorted by revenue) */}
              <div className="rounded-lg border bg-white" style={{ borderColor: 'var(--ad-border, #e2e8f0)' }}>
                <div className="p-4 border-b" style={{ borderColor: 'var(--ad-border, #e2e8f0)' }}>
                  <h3 className="font-semibold text-sm" style={{ color: 'var(--ad-heading, #1a2332)' }}>Performance by Coupon</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Sorted by revenue driven. Zero-redemption codes appear at the bottom.</p>
                </div>
                {analytics.by_coupon.length === 0 ? (
                  <div className="p-12 text-center text-sm text-slate-500">No coupon data yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left p-3 font-medium text-xs text-slate-600">Code</th>
                          <th className="text-right p-3 font-medium text-xs text-slate-600">Redemptions</th>
                          <th className="text-right p-3 font-medium text-xs text-slate-600">Discounts Given</th>
                          <th className="text-right p-3 font-medium text-xs text-slate-600">Revenue Driven</th>
                          <th className="text-right p-3 font-medium text-xs text-slate-600">Avg. Discount</th>
                          <th className="text-left p-3 font-medium text-xs text-slate-600">Slots / Bundles</th>
                          <th className="text-left p-3 font-medium text-xs text-slate-600">Last Used</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.by_coupon.map(c => (
                          <tr key={c.id} className="border-t" style={{ borderColor: 'var(--ad-border, #e2e8f0)' }} data-testid={`analytics-row-${c.id}`}>
                            <td className="p-3">
                              <div className="font-mono text-xs font-semibold">{c.code}</div>
                              <div className="text-[10px] text-slate-400">{fmtDiscount(c)} off &middot; {c.applies_to} &middot; {c.active ? 'active' : 'inactive'}</div>
                            </td>
                            <td className="p-3 text-right text-xs font-semibold">{c.redemptions}</td>
                            <td className="p-3 text-right text-xs text-rose-600">−{fmtMoney(c.discount_cents)}</td>
                            <td className="p-3 text-right text-xs font-semibold text-emerald-600">{fmtMoney(c.revenue_cents)}</td>
                            <td className="p-3 text-right text-xs text-slate-500">{fmtMoney(c.avg_discount_cents)}</td>
                            <td className="p-3 text-xs text-slate-500">
                              <span className="inline-flex items-center gap-1 mr-2"><Ticket className="w-3 h-3" /> {c.context_breakdown.slots}</span>
                              <span className="inline-flex items-center gap-1"><Package className="w-3 h-3" /> {c.context_breakdown.bundles}</span>
                            </td>
                            <td className="p-3 text-xs text-slate-500">{c.last_used ? new Date(c.last_used).toLocaleDateString() : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Top redeemers */}
              <div className="rounded-lg border bg-white" style={{ borderColor: 'var(--ad-border, #e2e8f0)' }}>
                <div className="p-4 border-b flex items-center gap-2" style={{ borderColor: 'var(--ad-border, #e2e8f0)' }}>
                  <Crown className="w-4 h-4 text-amber-500" />
                  <h3 className="font-semibold text-sm" style={{ color: 'var(--ad-heading, #1a2332)' }}>Top Redeemers</h3>
                </div>
                {analytics.top_redeemers.length === 0 ? (
                  <div className="p-12 text-center text-sm text-slate-500">No redemptions yet.</div>
                ) : (
                  <ul className="divide-y" style={{ borderColor: 'var(--ad-border, #e2e8f0)' }}>
                    {analytics.top_redeemers.map((m, i) => (
                      <li key={m.member_id} className="p-3 flex items-center gap-3" data-testid={`top-redeemer-${i}`}>
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium" style={{ color: 'var(--ad-heading, #1a2332)' }}>{m.name}</p>
                          <p className="text-[11px] text-slate-400">{m.email || m.member_id}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold" style={{ color: 'var(--ad-heading, #1a2332)' }}>{m.count} redemption{m.count === 1 ? '' : 's'}</p>
                          <p className="text-[11px] text-rose-600">saved {fmtMoney(m.total_discount_cents)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto" data-testid="coupon-dialog">
          <DialogHeader><DialogTitle style={{ fontFamily: "'Playfair Display', serif" }}>{editing?.id ? 'Edit Coupon' : 'New Coupon'}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Code *</Label>
                <Input value={editing.code} onChange={e => setEditing({ ...editing, code: e.target.value.toUpperCase() })} className="mt-1 font-mono" placeholder="e.g. SAVE20" data-testid="coupon-code" />
                <p className="text-[10px] text-slate-400 mt-1">Uppercase automatically. Must be unique.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Discount Type *</Label>
                  <div className="flex gap-3 mt-2">
                    {[{ v: 'percent', label: '% Percent', Icon: Percent }, { v: 'flat', label: '$ Flat', Icon: DollarSign }].map(opt => (
                      <label key={opt.v} className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <input type="radio" name="dtype" value={opt.v} checked={editing.discount_type === opt.v} onChange={() => setEditing({ ...editing, discount_type: opt.v })} data-testid={`coupon-dtype-${opt.v}`} />
                        <opt.Icon className="w-3 h-3" /> {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Discount Value * {editing.discount_type === 'percent' ? '(%)' : '($)'}</Label>
                  <Input type="number" min={0} max={editing.discount_type === 'percent' ? 100 : undefined} step={editing.discount_type === 'percent' ? 1 : 0.01} value={editing.discount_value} onChange={e => setEditing({ ...editing, discount_value: e.target.value })} className="mt-1" data-testid="coupon-value" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Applies To *</Label>
                <div className="flex gap-4 mt-2">
                  {[{ v: 'slots', label: 'Mentorship Slots' }, { v: 'bundles', label: 'Session Bundles' }, { v: 'both', label: 'Both' }].map(opt => (
                    <label key={opt.v} className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input type="radio" name="applies" value={opt.v} checked={editing.applies_to === opt.v} onChange={() => setEditing({ ...editing, applies_to: opt.v })} data-testid={`coupon-applies-${opt.v}`} />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Usage Mode *</Label>
                  <div className="mt-2 space-y-1.5">
                    {[{ v: 'total', label: 'Total pool (shared)' }, { v: 'per_member', label: 'Per-member' }].map(opt => (
                      <label key={opt.v} className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <input type="radio" name="umode" value={opt.v} checked={editing.usage_mode === opt.v} onChange={() => setEditing({ ...editing, usage_mode: opt.v })} data-testid={`coupon-umode-${opt.v}`} />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Total pool = all redemptions counted together. Per-member = each member can redeem up to limit.</p>
                </div>
                <div>
                  <Label className="text-xs">Usage Limit</Label>
                  <Input type="number" min={0} value={editing.usage_limit} onChange={e => setEditing({ ...editing, usage_limit: e.target.value })} className="mt-1" data-testid="coupon-limit" />
                  <p className="text-[10px] text-slate-400 mt-1">0 = unlimited.</p>
                </div>
              </div>
              <div>
                <Label className="text-xs">Expiration Date (optional)</Label>
                <Input type="date" value={editing.expires_at || ''} onChange={e => setEditing({ ...editing, expires_at: e.target.value })} className="mt-1" data-testid="coupon-expires" />
              </div>
              <label className="flex items-center gap-2 text-xs cursor-pointer pt-1">
                <input type="checkbox" checked={editing.active !== false} onChange={e => setEditing({ ...editing, active: e.target.checked })} data-testid="coupon-active" />
                <ToggleLeft className="w-3.5 h-3.5" /> Active (members can redeem)
              </label>
              <button onClick={handleSave} disabled={saving} className="w-full py-2 rounded-sm text-sm font-medium text-white flex items-center justify-center gap-2 disabled:opacity-50" style={{ backgroundColor: 'var(--ad-button-bg, #0D9488)' }} data-testid="coupon-save-btn">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {editing.id ? 'Update' : 'Create'} Coupon
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
