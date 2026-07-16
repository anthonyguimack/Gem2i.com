import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Loader2, Send, DollarSign, Trash2, History } from 'lucide-react';

const fmtMoney = (c) => `$${((c || 0) / 100).toFixed(2)}`;
const fmtDate = (iso) => { if (!iso) return '—'; return new Date(iso).toLocaleString(); };

export default function AdminPayoutsManager() {
  const [fee, setFee] = useState(15);
  const [ledger, setLedger] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    adminAPI.getPayouts()
      .then(r => { setFee(r.data.fee_percent || 15); setLedger(r.data.ledger || []); setRecords(r.data.records || []); })
      .catch(() => toast.error('Load failed'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const startPayout = (row) => {
    setForm({
      mentor_id: row.mentor_id,
      mentor_name: row.mentor_name || row.email,
      balance_cents: row.balance_cents,
      amount: (row.balance_cents / 100).toFixed(2),
      method: 'Wire',
      reference: '',
      note: '',
    });
    setOpen(true);
  };

  const handleSave = async () => {
    const amount_cents = Math.round(parseFloat(form.amount || '0') * 100);
    if (amount_cents <= 0) { toast.error('Amount must be > 0'); return; }
    if (amount_cents > form.balance_cents) { toast.error('Amount exceeds balance'); return; }
    setSaving(true);
    try {
      await adminAPI.createPayout({
        mentor_id: form.mentor_id,
        amount_cents,
        method: form.method,
        reference: form.reference,
        note: form.note,
      });
      toast.success('Payout recorded');
      setOpen(false); load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Error'); }
    finally { setSaving(false); }
  };

  const handleVoid = async (id) => {
    if (!window.confirm('Void this payout record? The balance will re-open.')) return;
    try { await adminAPI.deletePayout(id); toast.success('Voided'); load(); } catch { toast.error('Error'); }
  };

  const totals = ledger.reduce((a, r) => ({
    gross: a.gross + r.gross_cents,
    fee: a.fee + r.fee_cents,
    net: a.net + r.net_cents,
    paid: a.paid + r.paid_cents,
    balance: a.balance + r.balance_cents,
  }), { gross: 0, fee: 0, net: 0, paid: 0, balance: 0 });

  return (
    <div data-testid="admin-payouts-manager">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--ad-heading, #1a2332)', fontFamily: 'Playfair Display, serif' }}>Mentor Payouts</h1>
          <p className="text-xs text-slate-500 mt-1">Per-mentor earnings ledger. Platform fee: <strong>{fee}%</strong> (change in Settings → General). Payouts are settled externally (wire, PayPal, etc.) and recorded here.</p>
        </div>
      </div>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div> : (
        <>
          {/* Totals */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {[
              { label: 'Gross', value: fmtMoney(totals.gross) },
              { label: `Fee (${fee}%)`, value: fmtMoney(totals.fee) },
              { label: 'Net owed', value: fmtMoney(totals.net) },
              { label: 'Paid out', value: fmtMoney(totals.paid) },
              { label: 'Outstanding', value: fmtMoney(totals.balance), accent: true },
            ].map((s, i) => (
              <div key={i} className="bg-white p-4 rounded border" style={{ borderColor: 'var(--ad-card-border, #e2e8f0)' }}>
                <p className="text-[11px] uppercase tracking-wider text-slate-400">{s.label}</p>
                <p className={`text-xl font-bold mt-1 ${s.accent ? 'text-[#0D9488]' : 'text-[#1a2332]'}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Mentor ledger */}
          <div className="bg-white rounded border overflow-x-auto mb-6" style={{ borderColor: 'var(--ad-card-border, #e2e8f0)' }}>
            <div className="px-4 py-3 border-b bg-slate-50 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[#0D9488]" />
              <h2 className="text-sm font-semibold text-[#1a2332]">Mentor earnings ledger</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50/50">
                  <th className="text-left p-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Mentor</th>
                  <th className="text-right p-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Sessions</th>
                  <th className="text-right p-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Gross</th>
                  <th className="text-right p-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Fee</th>
                  <th className="text-right p-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Net</th>
                  <th className="text-right p-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Paid</th>
                  <th className="text-right p-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Balance</th>
                  <th className="text-right p-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map(r => (
                  <tr key={r.mentor_id} className="border-b border-slate-50 hover:bg-slate-50/30" data-testid={`ledger-row-${r.mentor_id}`}>
                    <td className="p-3">
                      <div className="font-medium text-[#1a2332]">{r.mentor_name || r.email || r.mentor_id}</div>
                      <div className="text-[11px] text-slate-400">{r.membership_id || r.email}</div>
                    </td>
                    <td className="p-3 text-right text-slate-500">{r.session_count}</td>
                    <td className="p-3 text-right text-slate-600">{fmtMoney(r.gross_cents)}</td>
                    <td className="p-3 text-right text-slate-400">{fmtMoney(r.fee_cents)}</td>
                    <td className="p-3 text-right text-slate-600">{fmtMoney(r.net_cents)}</td>
                    <td className="p-3 text-right text-slate-400">{fmtMoney(r.paid_cents)}</td>
                    <td className="p-3 text-right font-semibold text-[#0D9488]">{fmtMoney(r.balance_cents)}</td>
                    <td className="p-3 text-right">
                      <button onClick={() => startPayout(r)} disabled={r.balance_cents <= 0}
                        className="text-xs px-3 py-1.5 rounded font-medium text-white disabled:opacity-30 inline-flex items-center gap-1.5"
                        style={{ backgroundColor: 'var(--ad-button-bg, #0D9488)' }}
                        data-testid={`record-payout-${r.mentor_id}`}>
                        <Send className="w-3 h-3" /> Record payout
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {ledger.length === 0 && <div className="p-12 text-center text-slate-400 text-sm">No mentor earnings yet.</div>}
          </div>

          {/* Payout history */}
          <div className="bg-white rounded border overflow-x-auto" style={{ borderColor: 'var(--ad-card-border, #e2e8f0)' }}>
            <div className="px-4 py-3 border-b bg-slate-50 flex items-center gap-2">
              <History className="w-4 h-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-[#1a2332]">Payout history</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50/50">
                  <th className="text-left p-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="text-left p-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Mentor</th>
                  <th className="text-left p-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Method</th>
                  <th className="text-left p-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Reference</th>
                  <th className="text-right p-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="text-right p-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {records.map(rec => (
                  <tr key={rec.id} className="border-b border-slate-50">
                    <td className="p-3 text-slate-500 text-xs">{fmtDate(rec.created_at)}</td>
                    <td className="p-3 text-[#1a2332]">{rec.mentor_name || rec.mentor_id}</td>
                    <td className="p-3 text-slate-500 text-xs">{rec.method}</td>
                    <td className="p-3 text-slate-400 text-xs">{rec.reference || '—'}</td>
                    <td className="p-3 text-right font-semibold text-[#0D9488]">{fmtMoney(rec.amount_cents)}</td>
                    <td className="p-3 text-right">
                      <button onClick={() => handleVoid(rec.id)} className="p-1.5 text-slate-400 hover:text-red-500" data-testid={`void-payout-${rec.id}`}><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {records.length === 0 && <div className="p-8 text-center text-slate-400 text-sm">No payouts recorded yet.</div>}
          </div>
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[520px]" data-testid="payout-dialog">
          <DialogHeader><DialogTitle style={{ fontFamily: 'Playfair Display, serif' }}>Record Payout</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-3">
              <div className="p-3 rounded-sm bg-slate-50 border border-slate-200 text-xs">
                <p className="text-slate-500">Mentor</p>
                <p className="font-medium text-[#1a2332]">{form.mentor_name}</p>
                <p className="text-slate-500 mt-2">Current balance</p>
                <p className="font-bold text-[#0D9488]">{fmtMoney(form.balance_cents)}</p>
              </div>
              <div>
                <Label className="text-xs">Amount ($) *</Label>
                <Input type="number" min={0} step="0.01" max={(form.balance_cents / 100).toFixed(2)} value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="mt-1" data-testid="payout-amount" />
              </div>
              <div>
                <Label className="text-xs">Method *</Label>
                <select value={form.method} onChange={e => setForm({ ...form, method: e.target.value })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-sm text-sm" data-testid="payout-method">
                  {['Wire', 'ACH', 'PayPal', 'Check', 'Other'].map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs">Reference #</Label>
                <Input value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} className="mt-1" placeholder="TXN-12345" data-testid="payout-reference" />
              </div>
              <div>
                <Label className="text-xs">Note</Label>
                <Input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} className="mt-1" placeholder="Internal note" data-testid="payout-note" />
              </div>
              <button onClick={handleSave} disabled={saving} className="w-full py-2 rounded-sm text-sm font-medium text-white flex items-center justify-center gap-2 disabled:opacity-50" style={{ backgroundColor: 'var(--ad-button-bg, #0D9488)' }} data-testid="payout-save-btn">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Record Payout
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
