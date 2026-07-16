import React, { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Plus, Edit2, Trash2, Search, Loader2 } from 'lucide-react';

const empty = { sector_name: '', name: '', pe: '', status: 'active' };

export default function IndustriesManager() {
  const [items, setItems] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [q, setQ] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { adminAPI.getSectors().then(r => setSectors(r.data.filter(s => s.status === 'active'))).catch(() => {}); }, []);

  const load = useCallback(() => {
    setLoading(true);
    adminAPI.getIndustries({ q, sector: sectorFilter }).then(r => setItems(r.data)).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
  }, [q, sectorFilter]);
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);

  const save = async () => {
    if (!editing.sector_name) { toast.error('Sector is required'); return; }
    if (!editing.name.trim()) { toast.error('Industry name is required'); return; }
    setSaving(true);
    try {
      if (editing.id) await adminAPI.updateIndustry(editing.id, editing);
      else await adminAPI.createIndustry(editing);
      toast.success('Saved'); setOpen(false); load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Save failed'); } finally { setSaving(false); }
  };
  const remove = async (i) => {
    if (!window.confirm(`Delete industry "${i.name}"?`)) return;
    try { await adminAPI.deleteIndustry(i.id); toast.success('Deleted'); load(); }
    catch (e) { toast.error(e.response?.data?.detail || 'Delete failed'); }
  };

  return (
    <div data-testid="industries-manager">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1a2332]" style={{ fontFamily: 'Playfair Display, serif' }}>Industries</h1>
        <button onClick={() => { setEditing({ ...empty, sector_name: sectorFilter || '' }); setOpen(true); }} className="bg-[#0D9488] text-white px-4 py-2 rounded-sm text-sm font-medium flex items-center gap-2" data-testid="add-industry-btn">
          <Plus className="w-4 h-4" /> Add Industry
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search industries…" className="w-full h-10 pl-9 pr-3 text-sm bg-white border border-slate-200 rounded-sm outline-none focus:border-[#0D9488]" />
        </div>
        <select value={sectorFilter} onChange={e => setSectorFilter(e.target.value)} className="h-10 px-3 text-sm bg-white border border-slate-200 rounded-sm" data-testid="industry-sector-filter">
          <option value="">All sectors</option>
          {sectors.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
        </select>
        <span className="text-sm text-slate-400">{items.length} shown</span>
      </div>
      <div className="bg-white rounded-sm border border-slate-100 relative">
        {loading && <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10"><Loader2 className="w-6 h-6 animate-spin text-[#0D9488]" /></div>}
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-100 bg-slate-50">
            <th className="text-left p-3 font-medium text-slate-600">Sector</th>
            <th className="text-left p-3 font-medium text-slate-600">Industry</th>
            <th className="text-left p-3 font-medium text-slate-600 w-24">P/E</th>
            <th className="text-left p-3 font-medium text-slate-600 w-24">Status</th>
            <th className="text-right p-3 font-medium text-slate-600 w-24">Actions</th>
          </tr></thead>
          <tbody>
            {items.map(i => (
              <tr key={i.id} className="border-b border-slate-50 hover:bg-slate-50/50" data-testid={`industry-row-${i.id}`}>
                <td className="p-3 text-slate-500">{i.sector_name || '—'}</td>
                <td className="p-3 font-medium text-[#1a2332]">{i.name}</td>
                <td className="p-3 text-slate-500">{i.pe || '—'}</td>
                <td className="p-3">{i.status === 'active' ? <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">Active</span> : <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Inactive</span>}</td>
                <td className="p-3 text-right whitespace-nowrap">
                  <button onClick={() => { setEditing({ ...i, pe: i.pe || '' }); setOpen(true); }} className="p-1.5 text-slate-400 hover:text-[#0D9488]"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => remove(i)} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && items.length === 0 && <div className="p-8 text-center text-slate-400 text-sm">No industries found</div>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[440px]" data-testid="industry-dialog">
          <DialogHeader><DialogTitle>{editing?.id ? 'Edit Industry' : 'New Industry'}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div><Label>Sector *</Label>
                <select value={editing.sector_name} onChange={e => setEditing({ ...editing, sector_name: e.target.value })} className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-sm mt-1" data-testid="industry-sector">
                  <option value="">Select your Sector</option>
                  {sectors.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  {editing.sector_name && !sectors.some(s => s.name === editing.sector_name) && <option value={editing.sector_name}>{editing.sector_name}</option>}
                </select>
              </div>
              <div><Label>Industry Name *</Label><Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} className="mt-1" data-testid="industry-name" /></div>
              <div><Label>P/E</Label><Input value={editing.pe} onChange={e => setEditing({ ...editing, pe: e.target.value })} className="mt-1" /></div>
              <div><Label>Status</Label>
                <select value={editing.status} onChange={e => setEditing({ ...editing, status: e.target.value })} className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-sm mt-1">
                  <option value="active">Active</option><option value="inactive">Inactive</option>
                </select>
              </div>
              <button onClick={save} disabled={saving} className="w-full bg-[#0D9488] text-white py-2 rounded-sm text-sm font-medium disabled:opacity-50" data-testid="industry-save-btn">Save</button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
