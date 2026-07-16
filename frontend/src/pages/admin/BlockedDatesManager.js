import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Plus, Trash2, Loader2, Save, CalendarX } from 'lucide-react';
import { useDataTable, DataTableToolbar, DataTablePagination, SortableTh } from '../../components/admin/useDataTable';

const fmtLong = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};

export default function BlockedDatesManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    adminAPI.getBlockedDates()
      .then(r => setItems(r.data || []))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleSave = async () => {
    if (!editing.date) { toast.error('Date is required'); return; }
    setSaving(true);
    try {
      await adminAPI.createBlockedDate(editing);
      toast.success('Added'); setOpen(false); load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Unblock this date?')) return;
    try { await adminAPI.deleteBlockedDate(id); toast.success('Unblocked'); load(); }
    catch { toast.error('Error'); }
  };

  const dt = useDataTable(items, {
    searchAccessor: it => `${it.date || ''} ${it.reason || ''} ${fmtLong(it.date)}`,
    defaultSort: { key: 'date', dir: 'asc' },
    storageKey: 'blocked-dates',
  });

  return (
    <div data-testid="blocked-dates-manager">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--ad-heading, #1a2332)', fontFamily: 'Playfair Display, serif' }}>
            Blocked Dates
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Dates on this list are skipped by the weekly-recurrence engine. Existing slots
            are not touched — mentors still cancel those manually.
          </p>
        </div>
        <button
          onClick={() => { setEditing({ date: '', reason: '' }); setOpen(true); }}
          className="text-white px-4 py-2 rounded-sm text-sm font-medium flex items-center gap-2"
          style={{ backgroundColor: 'var(--ad-button-bg, #0D9488)' }}
          data-testid="add-blocked-btn"
        >
          <Plus className="w-4 h-4" /> Block a Date
        </button>
      </div>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div> : (
        <>
        <DataTableToolbar dt={dt} testId="blocked" placeholder="Search by date or reason…" />
        <div className="bg-white rounded border overflow-x-auto" style={{ borderColor: 'var(--ad-card-border, #e2e8f0)' }}>
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-slate-50">
              <th className="text-left p-3 font-medium text-slate-600">No.</th>
              <SortableTh dt={dt} field="date">Date</SortableTh>
              <SortableTh dt={dt} field="reason">Reason</SortableTh>
              <th className="text-right p-3 font-medium text-slate-600">Actions</th>
            </tr></thead>
            <tbody>
              {dt.visibleItems.map((it, i) => {
                const rowNum = (dt.page - 1) * dt.pageSize + i + 1;
                return (
                <tr key={it.id} className="border-b border-slate-50 hover:bg-slate-50/50" data-testid={`blocked-row-${it.id}`}>
                  <td className="p-3 text-slate-400">{rowNum}</td>
                  <td className="p-3"><span className="text-[#1a2332] font-medium">{it.date}</span><span className="block text-[11px] text-slate-400">{fmtLong(it.date)}</span></td>
                  <td className="p-3 text-slate-500">{it.reason || <span className="text-slate-300">—</span>}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => handleDelete(it.id)} className="p-1.5 text-slate-400 hover:text-red-500" data-testid={`delete-blocked-${it.id}`}><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
          {dt.totalAll === 0 && (
            <div className="p-12 text-center text-slate-400 text-sm">
              <CalendarX className="w-10 h-10 mx-auto mb-2 opacity-50" />
              No blocked dates yet. Add holidays, vacation days, or any date mentors should skip.
            </div>
          )}
          {dt.totalAll > 0 && dt.totalFiltered === 0 && <p className="p-8 text-center text-slate-400 text-sm">No dates match your search.</p>}
          <DataTablePagination dt={dt} testId="blocked" />
        </div>
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[480px]" data-testid="blocked-dialog">
          <DialogHeader><DialogTitle style={{ fontFamily: 'Playfair Display, serif' }}>Block a Date</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Date *</Label>
                <Input type="date" value={editing.date} onChange={e => setEditing({ ...editing, date: e.target.value })} className="mt-1" data-testid="blocked-date-input" />
              </div>
              <div>
                <Label className="text-xs">Reason</Label>
                <p className="text-[11px] text-slate-400 mb-1">Optional — shown in the recurrence preview.</p>
                <Input value={editing.reason} onChange={e => setEditing({ ...editing, reason: e.target.value })} className="mt-1" placeholder="Christmas Day, Memorial Day…" data-testid="blocked-reason-input" />
              </div>
              <button onClick={handleSave} disabled={saving} className="w-full py-2 rounded-sm text-sm font-medium text-white flex items-center justify-center gap-2 disabled:opacity-50" style={{ backgroundColor: 'var(--ad-button-bg, #0D9488)' }} data-testid="blocked-save-btn">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Add
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
