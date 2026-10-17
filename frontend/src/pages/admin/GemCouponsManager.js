import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Loader2, Tag, Users } from 'lucide-react';
import { gemAPI, gemAdminAPI } from '../../lib/api';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';

/** GEM2i discount coupons (F5). One coupon can apply to e-tickets, to the paid
 *  membership, or to both; optionally only to some events. A use is counted
 *  when the purchase completes, so abandoned checkouts never burn one. */
const EMPTY = {
  code: '', description: '', discount_type: 'percent', discount_value: 10, applies_to: 'all',
  event_ids: [], usage_mode: 'total', usage_limit: 0, expires_at: '', active: true,
};
const APPLIES = { all: 'Tickets + membership', tickets: 'E-tickets only', membership: 'Membership only' };

export default function GemCouponsManager() {
  const [items, setItems] = useState(null);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [events, setEvents] = useState([]);       // eticket events for the picker
  const [eventQ, setEventQ] = useState('');
  const [redemptions, setRedemptions] = useState(null);

  const load = () => gemAPI.adminCoupons().then(r => setItems(r.data.items || [])).catch(() => { setItems([]); toast.error('Failed to load coupons'); });
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!editing || editing.applies_to === 'membership') return;
    const t = setTimeout(() => {
      gemAdminAPI.list('events', { q: eventQ || undefined, limit: 20 })
        .then(r => setEvents((r.data.items || []).filter(e => e.type === 'eticket')))
        .catch(() => setEvents([]));
    }, 250);
    return () => clearTimeout(t);
  }, [editing, eventQ]);

  const save = async () => {
    setSaving(true);
    try {
      const body = { ...editing, expires_at: editing.expires_at || null };
      if (editing.id) await gemAPI.adminUpdateCoupon(editing.id, body);
      else await gemAPI.adminCreateCoupon(body);
      toast.success('Coupon saved');
      setEditing(null);
      load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Save failed'); }
    setSaving(false);
  };

  const remove = async (c) => {
    if (!window.confirm(`Delete coupon ${c.code}? Past redemptions are kept.`)) return;
    try { await gemAPI.adminDeleteCoupon(c.id); toast.success('Deleted'); load(); }
    catch { toast.error('Delete failed'); }
  };

  const openRedemptions = async (c) => {
    setRedemptions({ coupon: c, items: null });
    try { const r = await gemAPI.adminCouponRedemptions(c.id); setRedemptions({ coupon: c, items: r.data.items || [] }); }
    catch { setRedemptions({ coupon: c, items: [] }); }
  };

  const toggleEvent = (id) => setEditing(p => ({
    ...p, event_ids: p.event_ids.includes(id) ? p.event_ids.filter(x => x !== id) : [...p.event_ids, id],
  }));

  const valueLabel = (c) => (c.discount_type === 'percent' ? `${c.discount_value}%` : `${Number(c.discount_value).toFixed(2)}`);
  const usesLabel = (c) => (c.usage_limit ? `${c.usage_count || 0} / ${c.usage_limit}${c.usage_mode === 'per_member' ? ' per member' : ''}` : `${c.usage_count || 0} / ∞`);

  return (
    <div data-testid="gem-coupons-manager">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1a2332] flex items-center gap-2"><Tag className="w-6 h-6 text-[#0D9488]" />Coupons</h1>
          <p className="text-sm text-slate-500 mt-1">Discounts for e-tickets and the paid membership. A use counts when the payment completes.</p>
        </div>
        <button onClick={() => setEditing({ ...EMPTY })} className="inline-flex items-center gap-2 px-4 py-2 bg-[#0D9488] text-white text-sm font-medium rounded-sm hover:bg-[#0b7f75]" data-testid="coupon-new">
          <Plus className="w-4 h-4" />New coupon
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-sm overflow-x-auto">
        {items === null ? (
          <div className="p-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">No coupons yet. Create one to offer a discount on tickets or the membership.</div>
        ) : (
          <table className="w-full text-sm text-[#1a2332]">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="p-3 text-left">Code</th><th className="p-3 text-left">Discount</th><th className="p-3 text-left">Applies to</th>
                <th className="p-3 text-left">Uses</th><th className="p-3 text-left">Expires</th><th className="p-3 text-left">Status</th><th className="p-3" /></tr>
            </thead>
            <tbody>
              {items.map(c => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="p-3"><span className="font-mono font-semibold">{c.code}</span>{c.description && <p className="text-xs text-slate-400">{c.description}</p>}</td>
                  <td className="p-3 tabular-nums">{valueLabel(c)}{c.discount_type === 'flat' && <span className="text-xs text-slate-400"> (checkout currency)</span>}</td>
                  <td className="p-3">{APPLIES[c.applies_to]}{c.event_ids?.length > 0 && <span className="text-xs text-slate-400"> · {c.event_ids.length} event(s)</span>}</td>
                  <td className="p-3 tabular-nums">{usesLabel(c)}</td>
                  <td className="p-3 text-slate-500">{c.expires_at ? String(c.expires_at).slice(0, 10) : '—'}</td>
                  <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-sm ${c.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>{c.active ? 'Active' : 'Inactive'}</span></td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <button onClick={() => openRedemptions(c)} className="p-1.5 text-slate-400 hover:text-[#0D9488]" title="Redemptions" aria-label="Redemptions"><Users className="w-4 h-4" /></button>
                    <button onClick={() => setEditing({ ...EMPTY, ...c, expires_at: c.expires_at ? String(c.expires_at).slice(0, 10) : '' })} className="p-1.5 text-slate-400 hover:text-[#0D9488]" title="Edit" aria-label="Edit"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => remove(c)} className="p-1.5 text-slate-400 hover:text-red-500" title="Delete" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? `Edit ${editing.code}` : 'New coupon'}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Code</Label><Input value={editing.code} onChange={e => setEditing({ ...editing, code: e.target.value.toUpperCase().replace(/\s/g, '') })} className="mt-1 font-mono" placeholder="VIP10" data-testid="coupon-code" /></div>
                <div><Label>Expires (optional)</Label><Input type="date" value={editing.expires_at || ''} onChange={e => setEditing({ ...editing, expires_at: e.target.value })} className="mt-1" /></div>
              </div>
              <div><Label>Internal note (optional)</Label><Input value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} className="mt-1" placeholder="Promoter X — summer 2027" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Discount type</Label>
                  <select value={editing.discount_type} onChange={e => setEditing({ ...editing, discount_type: e.target.value })} className="mt-1 w-full h-10 px-3 border border-slate-200 rounded-sm text-sm">
                    <option value="percent">Percentage</option><option value="flat">Fixed amount</option>
                  </select></div>
                <div><Label>{editing.discount_type === 'percent' ? 'Percent (1–100)' : 'Amount'}</Label>
                  <Input type="number" min="0" step={editing.discount_type === 'percent' ? 1 : 0.01} value={editing.discount_value} onChange={e => setEditing({ ...editing, discount_value: e.target.value })} className="mt-1" data-testid="coupon-value" /></div>
              </div>
              <div><Label>Applies to</Label>
                <select value={editing.applies_to} onChange={e => setEditing({ ...editing, applies_to: e.target.value })} className="mt-1 w-full h-10 px-3 border border-slate-200 rounded-sm text-sm">
                  {Object.entries(APPLIES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select></div>
              {editing.applies_to !== 'membership' && (
                <div>
                  <Label>Only these events (leave empty for every e-ticket event)</Label>
                  <Input value={eventQ} onChange={e => setEventQ(e.target.value)} placeholder="Search e-ticket events…" className="mt-1" />
                  <div className="mt-2 max-h-40 overflow-y-auto border border-slate-100 rounded-sm divide-y divide-slate-100">
                    {events.length === 0 ? <p className="p-3 text-xs text-slate-400">No e-ticket events found.</p> : events.map(ev => (
                      <label key={ev.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50">
                        <input type="checkbox" checked={editing.event_ids.includes(ev.id)} onChange={() => toggleEvent(ev.id)} />
                        <span className="truncate">{ev.title}</span><span className="text-xs text-slate-400 ml-auto shrink-0">{ev.event_date}</span>
                      </label>
                    ))}
                  </div>
                  {editing.event_ids.length > 0 && <p className="text-xs text-slate-500 mt-1">{editing.event_ids.length} event(s) selected.</p>}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Usage limit (0 = unlimited)</Label><Input type="number" min="0" value={editing.usage_limit} onChange={e => setEditing({ ...editing, usage_limit: e.target.value })} className="mt-1" /></div>
                <div><Label>Limit counts</Label>
                  <select value={editing.usage_mode} onChange={e => setEditing({ ...editing, usage_mode: e.target.value })} className="mt-1 w-full h-10 px-3 border border-slate-200 rounded-sm text-sm">
                    <option value="total">In total</option><option value="per_member">Per member</option>
                  </select></div>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.active} onChange={e => setEditing({ ...editing, active: e.target.checked })} />Active</label>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm border border-slate-200 rounded-sm">Cancel</button>
                <button onClick={save} disabled={saving || !editing.code} className="px-4 py-2 text-sm bg-[#0D9488] text-white rounded-sm disabled:opacity-50 inline-flex items-center gap-2" data-testid="coupon-save">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}Save
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!redemptions} onOpenChange={(o) => { if (!o) setRedemptions(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Redemptions — {redemptions?.coupon.code}</DialogTitle></DialogHeader>
          {redemptions?.items === null ? <div className="p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
            : redemptions?.items.length === 0 ? <p className="text-sm text-slate-500 py-4">Not used yet.</p> : (
              <ul className="divide-y divide-slate-100 text-sm">
                {redemptions?.items.map(r => (
                  <li key={r.id} className="py-2 flex items-center justify-between gap-3">
                    <span className="min-w-0"><span className="font-medium">{r.member_name || r.member_id}</span> <span className="text-xs text-slate-400">{r.membership_id} · {r.context}</span></span>
                    <span className="tabular-nums text-xs text-slate-500 shrink-0">-{Number(r.discount).toFixed(2)} {(r.currency || '').toUpperCase()} · {String(r.created_at).slice(0, 10)}</span>
                  </li>
                ))}
              </ul>
            )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
