import React, { useEffect, useState } from 'react';
import { gemAdminAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import {
  Search, Loader2, ChevronLeft, ChevronRight, XCircle, CheckCircle2, Users, QrCode,
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

/** GEM2i transactions & passes admin (Phase 4; Phase 5 adds ticket purchases
 *  to the same ledger). Lists gem_transactions newest-first with search +
 *  filters, manual complete/cancel, QR preview, and a per-event waiting-list
 *  viewer. Stock is arithmetic-on-read, so canceling here frees a spot. */
export default function GemTransactionsManager() {
  const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [kind, setKind] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [qrPreview, setQrPreview] = useState(null);          // tx being previewed
  const [waiting, setWaiting] = useState(null);              // {event, items} dialog

  const load = () => {
    setLoading(true);
    gemAdminAPI.transactions({
      q: q.trim() || undefined, status: status || undefined,
      kind: kind || undefined, page, limit: 25,
    })
      .then((r) => setData(r.data))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [page, status, kind]);
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load(); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const setTxStatus = async (tx, next) => {
    const verb = next === 'canceled' ? 'Cancel' : 'Mark completed';
    if (!window.confirm(`${verb} — ${tx.member_name || tx.member_email} for "${tx.event?.title || tx.event_id}"?`)) return;
    try { await gemAdminAPI.updateTransaction(tx.id, { status: next }); toast.success('Updated'); load(); }
    catch { toast.error('Update failed'); }
  };

  const openWaitingList = async (tx) => {
    try {
      const r = await gemAdminAPI.waitingList(tx.event_id);
      setWaiting({ event: tx.event, items: r.data.items || [] });
    } catch { toast.error('Failed to load waiting list'); }
  };

  const badge = (s) => ({
    completed: 'bg-emerald-50 text-emerald-600',
    pending: 'bg-amber-50 text-amber-600',
    canceled: 'bg-red-50 text-red-500',
  }[s] || 'bg-slate-100 text-slate-500');

  return (
    <div data-testid="gem-transactions-manager">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1a2332]">GEM2i · Transactions & Passes</h1>
          <p className="text-xs text-slate-400 mt-1">
            {data.total} total — guest passes now; ticket purchases join this ledger in Phase 5. Canceling frees the spot immediately.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search member name, email, pass code…" className="pl-9" />
        </div>
        <select value={kind} onChange={(e) => { setKind(e.target.value); setPage(1); }}
          className="h-9 px-2 bg-white border border-slate-200 rounded-sm text-sm">
          <option value="">All kinds</option>
          <option value="guest_pass">Guest pass</option>
          <option value="ticket">Ticket</option>
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="h-9 px-2 bg-white border border-slate-200 rounded-sm text-sm">
          <option value="">All statuses</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="canceled">Canceled</option>
        </select>
      </div>

      <div className="bg-white rounded-sm border border-slate-200 divide-y divide-slate-100">
        {loading && <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-300" /></div>}
        {!loading && data.items.map((tx) => (
          <div key={tx.id} className="flex items-center gap-4 p-3 group hover:bg-slate-50 transition-colors">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-[#1a2332] truncate">
                {tx.member_name || tx.member_email || tx.member_id}
                {tx.guest_additional > 0 && <span className="text-slate-400 font-normal"> +{tx.guest_additional}</span>}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {tx.event?.title || tx.event_id}{tx.event?.event_date ? ` · ${tx.event.event_date}` : ''} · {(tx.created_at || '').slice(0, 16).replace('T', ' ')}
                {tx.kind === 'ticket' && tx.total != null && ` · ${tx.quantity} × ${tx.tier_label || tx.tier} = ${Number(tx.total).toFixed(2)} ${String(tx.currency || '').toUpperCase()}`}
              </p>
            </div>
            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-sm bg-slate-100 text-slate-500 shrink-0">
              {tx.kind === 'guest_pass' ? 'Guest' : tx.kind}
            </span>
            <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-sm shrink-0 ${badge(tx.status)}`}>{tx.status}</span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              {tx.qr?.image_url && (
                <button onClick={() => setQrPreview(tx)} title="View QR pass" className="p-1.5 text-slate-400 hover:text-[#0D9488]">
                  <QrCode className="w-4 h-4" /></button>
              )}
              <button onClick={() => openWaitingList(tx)} title="Waiting list for this event" className="p-1.5 text-slate-400 hover:text-[#0D9488]">
                <Users className="w-4 h-4" /></button>
              {tx.status !== 'canceled' ? (
                <button onClick={() => setTxStatus(tx, 'canceled')} title="Cancel" className="p-1.5 text-slate-400 hover:text-red-500">
                  <XCircle className="w-4 h-4" /></button>
              ) : (
                <button onClick={() => setTxStatus(tx, 'completed')} title="Reinstate as completed" className="p-1.5 text-slate-400 hover:text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" /></button>
              )}
            </div>
          </div>
        ))}
        {!loading && data.items.length === 0 && (
          <div className="p-12 text-center text-slate-400 text-sm">No transactions yet.</div>
        )}
      </div>

      {data.pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4 text-sm text-slate-500">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="p-1.5 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
          Page {data.page} of {data.pages}
          <button disabled={page >= data.pages} onClick={() => setPage(page + 1)} className="p-1.5 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
        </div>
      )}

      <Dialog open={!!qrPreview} onOpenChange={() => setQrPreview(null)}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader><DialogTitle>QR Pass</DialogTitle></DialogHeader>
          {qrPreview && (
            <div className="text-center">
              <img src={qrPreview.qr.image_url.startsWith('/api') ? `${API}${qrPreview.qr.image_url}` : qrPreview.qr.image_url}
                alt="QR pass" className="mx-auto w-56 h-56 object-contain" />
              <p className="text-xs text-slate-500 mt-2">Code: <span className="tabular-nums">{qrPreview.qr.code}</span></p>
              <p className="text-xs text-slate-400">{qrPreview.member_name} · {qrPreview.event?.title}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!waiting} onOpenChange={() => setWaiting(null)}>
        <DialogContent className="sm:max-w-[480px] max-h-[70vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Waiting list — {waiting?.event?.title || 'event'}</DialogTitle></DialogHeader>
          {waiting && (
            waiting.items.length === 0
              ? <p className="text-sm text-slate-400 py-6 text-center">Nobody is waiting.</p>
              : (
                <div className="divide-y divide-slate-100">
                  {waiting.items.map((w, i) => (
                    <div key={w.id || i} className="py-2 flex items-center gap-3">
                      <span className="text-xs text-slate-300 tabular-nums w-6">{i + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#1a2332] truncate">{w.member_name || w.member_id}</p>
                        <p className="text-xs text-slate-400 truncate">{w.member_email}</p>
                      </div>
                      <span className="text-xs text-slate-400">{(w.created_at || '').slice(0, 16).replace('T', ' ')}</span>
                    </div>
                  ))}
                </div>
              )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
