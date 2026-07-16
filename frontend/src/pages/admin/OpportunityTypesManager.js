import React, { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import ImageUpload from '../../components/ImageUpload';
import { Plus, Edit2, Trash2, Search, Loader2, Image as ImageIcon } from 'lucide-react';

const empty = { name: '', status: 'active', default_image: '' };

export default function OpportunityTypesManager() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminAPI.getOpportunityTypes(q).then(r => setItems(r.data)).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
  }, [q]);
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);

  const save = async () => {
    if (!editing.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      if (editing.id) await adminAPI.updateOpportunityType(editing.id, editing);
      else await adminAPI.createOpportunityType(editing);
      toast.success('Saved'); setOpen(false); load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Save failed'); } finally { setSaving(false); }
  };
  const remove = async (t) => {
    if (!window.confirm(`Delete opportunity type "${t.name}"?`)) return;
    try { await adminAPI.deleteOpportunityType(t.id); toast.success('Deleted'); load(); }
    catch (e) { toast.error(e.response?.data?.detail || 'Delete failed'); }
  };

  return (
    <div data-testid="opportunity-types-manager">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1a2332]" style={{ fontFamily: 'Playfair Display, serif' }}>Opportunity Types</h1>
        <button onClick={() => { setEditing({ ...empty }); setOpen(true); }} className="bg-[#0D9488] text-white px-4 py-2 rounded-sm text-sm font-medium flex items-center gap-2" data-testid="add-opportunity-type-btn">
          <Plus className="w-4 h-4" /> Add Type
        </button>
      </div>
      <div className="relative mb-4 max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search types…" className="w-full h-10 pl-9 pr-3 text-sm bg-white border border-slate-200 rounded-sm outline-none focus:border-[#0D9488]" />
      </div>
      <div className="bg-white rounded-sm border border-slate-100 relative">
        {loading && <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10"><Loader2 className="w-6 h-6 animate-spin text-[#0D9488]" /></div>}
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-100 bg-slate-50">
            <th className="text-left p-3 font-medium text-slate-600 w-16">Icon</th>
            <th className="text-left p-3 font-medium text-slate-600">Type</th>
            <th className="text-left p-3 font-medium text-slate-600 w-24">Status</th>
            <th className="text-right p-3 font-medium text-slate-600 w-24">Actions</th>
          </tr></thead>
          <tbody>
            {items.map(t => (
              <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/50" data-testid={`opportunity-type-row-${t.id}`}>
                <td className="p-3">
                  {t.default_image
                    ? <img src={t.default_image} alt="" className="w-9 h-9 rounded-sm object-cover border border-slate-100" />
                    : <div className="w-9 h-9 rounded-sm bg-slate-50 border border-slate-100 flex items-center justify-center"><ImageIcon className="w-4 h-4 text-slate-300" /></div>}
                </td>
                <td className="p-3 font-medium text-[#1a2332]">{t.name}</td>
                <td className="p-3">{t.status === 'active' ? <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">Active</span> : <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Inactive</span>}</td>
                <td className="p-3 text-right whitespace-nowrap">
                  <button onClick={() => { setEditing({ ...empty, ...t }); setOpen(true); }} className="p-1.5 text-slate-400 hover:text-[#0D9488]"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => remove(t)} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && items.length === 0 && <div className="p-8 text-center text-slate-400 text-sm">No opportunity types found</div>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[420px]" data-testid="opportunity-type-dialog">
          <DialogHeader><DialogTitle>{editing?.id ? 'Edit Opportunity Type' : 'New Opportunity Type'}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div><Label>Type Name *</Label><Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} className="mt-1" data-testid="opportunity-type-name" /></div>
              <div><Label>Default Image</Label>
                <p className="text-xs text-slate-400 mt-0.5 mb-1">Shown on opportunities of this type that have no images.</p>
                <ImageUpload value={editing.default_image || ''} onChange={url => setEditing({ ...editing, default_image: url })} />
              </div>
              <div><Label>Status</Label>
                <select value={editing.status} onChange={e => setEditing({ ...editing, status: e.target.value })} className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-sm mt-1">
                  <option value="active">Active</option><option value="inactive">Inactive</option>
                </select>
              </div>
              <button onClick={save} disabled={saving} className="w-full bg-[#0D9488] text-white py-2 rounded-sm text-sm font-medium disabled:opacity-50" data-testid="opportunity-type-save-btn">Save</button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
