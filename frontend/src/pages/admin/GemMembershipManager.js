import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Crown, Plus, Trash2, Save } from 'lucide-react';
import { gemAPI } from '../../lib/api';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

/** GEM2i paid membership (F5). The operator sets the plan name/benefits (EN/ES),
 *  monthly + annual prices and the level granted while the plan is active.
 *  Members buy it in My Account → Membership; when it lapses they return to the
 *  level they had. The list below shows every membership payment. */
const loc = (v) => (v && typeof v === 'object' ? v : { en: v || '', es: '' });

export default function GemMembershipManager() {
  const [cfg, setCfg] = useState(null);
  const [levels, setLevels] = useState([]);
  const [saving, setSaving] = useState(false);
  const [subs, setSubs] = useState(null);

  useEffect(() => {
    gemAPI.adminMembershipConfig().then(r => {
      const c = r.data.config || {};
      setCfg({ ...c, name: loc(c.name), description: loc(c.description), benefits: (c.benefits || []).map(loc) });
      setLevels(r.data.levels || []);
    }).catch(() => toast.error('Failed to load'));
    gemAPI.adminMembershipSubscriptions().then(r => setSubs(r.data.items || [])).catch(() => setSubs([]));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const r = await gemAPI.adminSaveMembershipConfig(cfg);
      setCfg({ ...r.data, name: loc(r.data.name), description: loc(r.data.description), benefits: (r.data.benefits || []).map(loc) });
      toast.success('Membership saved');
    } catch (e) { toast.error(e.response?.data?.detail || 'Save failed'); }
    setSaving(false);
  };

  if (!cfg) return <div className="p-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;
  const setLoc = (field, lang, val) => setCfg({ ...cfg, [field]: { ...cfg[field], [lang]: val } });
  const setBenefit = (i, lang, val) => setCfg({ ...cfg, benefits: cfg.benefits.map((b, j) => (j === i ? { ...b, [lang]: val } : b)) });

  return (
    <div className="max-w-4xl" data-testid="gem-membership-manager">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1a2332] flex items-center gap-2"><Crown className="w-6 h-6 text-[#0D9488]" />Paid membership</h1>
          <p className="text-sm text-slate-500 mt-1">Sold in My Account → Membership. One payment per period (no auto-renew); renewing extends the current period.</p>
        </div>
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 bg-[#0D9488] text-white text-sm font-medium rounded-sm disabled:opacity-50" data-testid="membership-save">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Save
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-sm p-5 space-y-5">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={!!cfg.enabled} onChange={e => setCfg({ ...cfg, enabled: e.target.checked })} data-testid="membership-enabled" />
          Offer the paid membership to members
        </label>

        <div className="grid md:grid-cols-2 gap-4">
          <div><Label>Name (EN)</Label><Input value={cfg.name.en} onChange={e => setLoc('name', 'en', e.target.value)} className="mt-1" /></div>
          <div><Label>Nombre (ES)</Label><Input value={cfg.name.es} onChange={e => setLoc('name', 'es', e.target.value)} className="mt-1" /></div>
          <div><Label>Description (EN)</Label><Input value={cfg.description.en} onChange={e => setLoc('description', 'en', e.target.value)} className="mt-1" /></div>
          <div><Label>Descripción (ES)</Label><Input value={cfg.description.es} onChange={e => setLoc('description', 'es', e.target.value)} className="mt-1" /></div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><Label>Monthly price (30 days)</Label><Input type="number" min="0" step="0.01" value={cfg.prices?.monthly ?? 0} onChange={e => setCfg({ ...cfg, prices: { ...cfg.prices, monthly: e.target.value } })} className="mt-1" /></div>
          <div><Label>Annual price (365 days)</Label><Input type="number" min="0" step="0.01" value={cfg.prices?.annual ?? 0} onChange={e => setCfg({ ...cfg, prices: { ...cfg.prices, annual: e.target.value } })} className="mt-1" /></div>
          <div><Label>Currency</Label>
            <select value={cfg.currency || 'usd'} onChange={e => setCfg({ ...cfg, currency: e.target.value })} className="mt-1 w-full h-10 px-3 border border-slate-200 rounded-sm text-sm">
              {['usd', 'eur', 'pen', 'ars', 'mxn', 'cop', 'clp', 'gbp'].map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
            </select></div>
          <div><Label>Level while active</Label>
            <select value={cfg.level_id || ''} onChange={e => setCfg({ ...cfg, level_id: e.target.value || null })} className="mt-1 w-full h-10 px-3 border border-slate-200 rounded-sm text-sm">
              <option value="">— keep their level —</option>
              {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select></div>
        </div>
        <p className="text-xs text-slate-500 -mt-2">A price of 0 hides that plan. The level decides which My Account sections the member unlocks (CMS → Members Level).</p>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Benefits shown to members</Label>
            <button onClick={() => setCfg({ ...cfg, benefits: [...cfg.benefits, { en: '', es: '' }] })} disabled={cfg.benefits.length >= 12}
              className="inline-flex items-center gap-1 text-xs text-[#0D9488] disabled:opacity-40"><Plus className="w-3.5 h-3.5" />Add benefit</button>
          </div>
          {cfg.benefits.length === 0 && <p className="text-xs text-slate-400">No benefits listed yet.</p>}
          <div className="space-y-2">
            {cfg.benefits.map((b, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <Input value={b.en} onChange={e => setBenefit(i, 'en', e.target.value)} placeholder="EN — e.g. Priority guest-list access" />
                <Input value={b.es} onChange={e => setBenefit(i, 'es', e.target.value)} placeholder="ES — ej. Acceso prioritario a listas" />
                <button onClick={() => setCfg({ ...cfg, benefits: cfg.benefits.filter((_, j) => j !== i) })} className="p-2 text-slate-400 hover:text-red-500" aria-label="Remove benefit"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-[#1a2332] mt-8 mb-3">Membership payments</h2>
      <div className="bg-white border border-slate-200 rounded-sm overflow-x-auto">
        {subs === null ? <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
          : subs.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No membership payments yet.</p> : (
            <table className="w-full text-sm text-[#1a2332]">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="p-3 text-left">Member</th><th className="p-3 text-left">Plan</th><th className="p-3 text-left">Paid</th>
                  <th className="p-3 text-left">Coupon</th><th className="p-3 text-left">Payment</th><th className="p-3 text-left">Member status</th><th className="p-3 text-left">Date</th></tr>
              </thead>
              <tbody>
                {subs.map(s => (
                  <tr key={s.id} className="border-t border-slate-100">
                    <td className="p-3">{s.member_name || s.member_email}<p className="text-xs text-slate-400">{s.membership_id}</p></td>
                    <td className="p-3 capitalize">{s.plan}</td>
                    <td className="p-3 tabular-nums">{Number(s.total || 0).toFixed(2)} {(s.currency || '').toUpperCase()}</td>
                    <td className="p-3 font-mono text-xs">{s.coupon?.code || '—'}</td>
                    <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-sm ${s.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{s.status}</span></td>
                    <td className="p-3 text-xs">{s.member_status?.active ? `Active until ${String(s.member_status.expires_at).slice(0, 10)}` : s.member_status?.lapsed ? 'Lapsed' : '—'}</td>
                    <td className="p-3 text-slate-500 text-xs">{String(s.completed_at || s.created_at).slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </div>
  );
}
