import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Loader2, Plus, Edit2, Trash2, Package } from 'lucide-react';
import BundleEditorDialog from '../../components/BundleEditorDialog';
import { useDataTable, DataTableToolbar, DataTablePagination, SortableTh } from '../../components/admin/useDataTable';

const empty = () => ({ name: '', description: '', session_count: 5, price_cents: 0, single_session_value_cents: 0, currency: 'usd', active: true });
const fmtMoney = (c) => `$${((c || 0) / 100).toFixed(2)}`;

export default function AdminBundlesManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    adminAPI.getAdminBundles().then(r => setItems(r.data || [])).catch(() => toast.error('Load failed')).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleSave = async () => {
    if (!editing.name?.trim()) { toast.error('Name required'); return; }
    setSaving(true);
    try {
      if (editing.id) await adminAPI.updateAdminBundle(editing.id, editing);
      else await adminAPI.createAdminBundle(editing);
      toast.success('Saved'); setOpen(false); load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this bundle? Existing purchases/credits remain intact.')) return;
    try { await adminAPI.deleteAdminBundle(id); toast.success('Deleted'); load(); } catch { toast.error('Error'); }
  };

  const dt = useDataTable(items, {
    searchFields: ['name', 'description'],
    defaultSort: { key: 'name', dir: 'asc' },
    storageKey: 'bundles',
  });

  return (
    <div data-testid="admin-bundles-manager">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--ad-heading, #1a2332)', fontFamily: 'Playfair Display, serif' }}>Session Bundles (Global)</h1>
          <p className="text-xs text-slate-500 mt-1">Admin-managed bundles redeemable against any paid mentor slot. Mentors can also publish personal bundles from their Earnings page.</p>
        </div>
        <button onClick={() => { setEditing(empty()); setOpen(true); }} className="text-white px-4 py-2 rounded-sm text-sm font-medium flex items-center gap-2" style={{ backgroundColor: 'var(--ad-button-bg, #0D9488)' }} data-testid="add-bundle-btn">
          <Plus className="w-4 h-4" /> New Bundle
        </button>
      </div>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div> : (
        <>
        <DataTableToolbar dt={dt} testId="bundles" placeholder="Search by name or description…" />
        <div className="bg-white rounded border overflow-x-auto" style={{ borderColor: 'var(--ad-card-border, #e2e8f0)' }}>
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-slate-50">
              <th className="text-left p-3 font-medium text-slate-600">No.</th>
              <SortableTh dt={dt} field="name">Name</SortableTh>
              <SortableTh dt={dt} field="session_count">Sessions</SortableTh>
              <SortableTh dt={dt} field="price_cents">Price</SortableTh>
              <th className="text-left p-3 font-medium text-slate-600">Save</th>
              <SortableTh dt={dt} field="active">Status</SortableTh>
              <th className="text-right p-3 font-medium text-slate-600">Actions</th>
            </tr></thead>
            <tbody>
              {dt.visibleItems.map((b, i) => {
                const savings = Math.max(0, (b.session_count * (b.single_session_value_cents || 0)) - b.price_cents);
                return (
                  <tr key={b.id} className="border-b border-slate-50 hover:bg-slate-50/50" data-testid={`bundle-row-${b.id}`}>
                    <td className="p-3 text-slate-400">{i + 1}</td>
                    <td className="p-3 text-[#1a2332] font-medium">{b.name}</td>
                    <td className="p-3 text-slate-500">{b.session_count}</td>
                    <td className="p-3 text-slate-500">{fmtMoney(b.price_cents)}</td>
                    <td className="p-3 text-[#0D9488]">{savings > 0 ? fmtMoney(savings) : '—'}</td>
                    <td className="p-3">
                      <span className={`text-[11px] px-2 py-0.5 rounded ${b.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{b.active ? 'Active' : 'Hidden'}</span>
                    </td>
                    <td className="p-3 text-right">
                      <button onClick={() => { setEditing({ ...b }); setOpen(true); }} className="p-1.5 text-slate-400 hover:text-[#0D9488]" data-testid={`edit-bundle-${b.id}`}><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(b.id)} className="p-1.5 text-slate-400 hover:text-red-500" data-testid={`delete-bundle-${b.id}`}><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {dt.totalAll === 0 && (
            <div className="p-12 text-center text-slate-400 text-sm">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
              No bundles yet. Create one to offer pre-paid session packs at a discount.
            </div>
          )}
          {dt.totalAll > 0 && dt.totalFiltered === 0 && <div className="p-8 text-center text-slate-400 text-sm">No bundles match your search</div>}
          <DataTablePagination dt={dt} testId="bundles" />
        </div>
        </>
      )}

      <BundleEditorDialog open={open} onOpenChange={setOpen} editing={editing} setEditing={setEditing} onSave={handleSave} saving={saving} theme="admin" />
    </div>
  );
}
