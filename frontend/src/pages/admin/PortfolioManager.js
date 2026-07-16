import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import ImageUpload from '../../components/ImageUpload';
import { useDataTable, DataTableToolbar, DataTablePagination, SortableTh } from '../../components/admin/useDataTable';
import { useSettings } from '../../App';
import PersonalityTabs, { PB_PERSONALITY_TABS } from '../../components/admin/PersonalityTabs';

const emptyItem = { title: '', description: '', image: '', tags: [], link: '', open_in_new_tab: false };

export default function PortfolioManager() {
  const settings = useSettings();
  const isPB = settings.active_theme === 'personalbrand';
  const [activeTab, setActiveTab] = useState(null); // null = Global
  const [savedTabs, setSavedTabs] = useState(new Set(['__global__']));
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = (personality = activeTab) => adminAPI.getPortfolio(personality).then(r => setItems(r.data)).catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(activeTab); }, [activeTab]);

  useEffect(() => {
    if (!isPB) return;
    PB_PERSONALITY_TABS.forEach(t => {
      if (t.key === null) return;
      adminAPI.getPortfolio(t.key).then(r => { if ((r.data || []).length) setSavedTabs(prev => new Set([...prev, t.key])); }).catch(() => {});
    });
  }, [isPB]);

  const handleSave = async () => {
    setLoading(true);
    try {
      if (editing.id) await adminAPI.updatePortfolio(editing.id, editing);
      else await adminAPI.createPortfolio(editing, activeTab);
      if (activeTab) setSavedTabs(prev => new Set([...prev, activeTab]));
      toast.success('Saved!'); setOpen(false); load();
    } catch { toast.error('Error'); } finally { setLoading(false); }
  };

  const dt = useDataTable(items, {
    searchAccessor: p => `${p.title || ''} ${(p.tags || []).join(' ')} ${p.description || ''}`,
    defaultSort: { key: 'title', dir: 'asc' },
    storageKey: 'portfolio',
  });

  return (
    <div data-testid="portfolio-manager">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1a2332]" style={{ fontFamily: 'Playfair Display, serif' }}>Portfolio Manager</h1>
        <button onClick={() => { setEditing({...emptyItem}); setOpen(true); }} className="bg-[#0D9488] text-white px-4 py-2 rounded-sm text-sm font-medium flex items-center gap-2"><Plus className="w-4 h-4" /> Add Project</button>
      </div>
      <PersonalityTabs show={isPB} activeTab={activeTab} onChange={setActiveTab} savedTabs={savedTabs} label="Portfolio scope" noun="projects" />
      <DataTableToolbar dt={dt} testId="portfolio" placeholder="Search by title, tags…" />
      <div className="bg-white rounded-sm border border-slate-100">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-slate-50">
            <th className="text-left p-3 font-medium text-slate-600">Image</th>
            <SortableTh dt={dt} field="title">Title</SortableTh>
            <th className="text-left p-3 font-medium text-slate-600">Tags</th>
            <th className="text-right p-3 font-medium text-slate-600">Actions</th>
          </tr></thead>
          <tbody>{dt.visibleItems.map(item => (
            <tr key={item.id} className="border-b border-slate-50">
              <td className="p-3"><img src={item.image?.startsWith('/api') ? `${process.env.REACT_APP_BACKEND_URL}${item.image}` : item.image} alt="" className="w-16 h-10 object-cover rounded-sm" /></td>
              <td className="p-3 font-medium">{item.title}</td>
              <td className="p-3 text-slate-500">{item.tags?.join(', ')}</td>
              <td className="p-3 text-right">
                <button onClick={() => { setEditing({...item}); setOpen(true); }} className="p-1.5 text-slate-400 hover:text-[#0D9488]"><Edit2 className="w-4 h-4" /></button>
                <button onClick={async () => { if (window.confirm('Delete?')) { await adminAPI.deletePortfolio(item.id); load(); }}} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </td>
            </tr>
          ))}</tbody>
        </table>
        {dt.totalAll === 0 && <div className="p-8 text-center text-slate-400 text-sm">No portfolio items yet</div>}
        {dt.totalAll > 0 && dt.totalFiltered === 0 && <div className="p-8 text-center text-slate-400 text-sm">No items match your search</div>}
        <DataTablePagination dt={dt} testId="portfolio" />
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent><DialogHeader><DialogTitle>{editing?.id ? 'Edit' : 'New'} Project</DialogTitle></DialogHeader>
          {editing && <div className="space-y-4">
            <div><Label>Title</Label><Input value={editing.title} onChange={e => setEditing({...editing, title: e.target.value})} className="mt-1" /></div>
            <div><Label>Description</Label><textarea value={editing.description} onChange={e => setEditing({...editing, description: e.target.value})} rows={3} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-sm mt-1" /></div>
            <div><Label>Image</Label><ImageUpload value={editing.image} onChange={val => setEditing({...editing, image: val})} className="mt-1" /></div>
            <div><Label>Tags (comma separated)</Label><Input value={(editing.tags || []).join(', ')} onChange={e => setEditing({...editing, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)})} className="mt-1" /></div>
            <div><Label>Link</Label><Input value={editing.link || ''} onChange={e => setEditing({...editing, link: e.target.value})} className="mt-1" placeholder="https://..." data-testid="portfolio-link-input" /></div>
            {editing.link && (
              <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-sm border border-slate-100">
                <Switch checked={editing.open_in_new_tab || false} onCheckedChange={v => setEditing({...editing, open_in_new_tab: v})} data-testid="portfolio-newtab-toggle" />
                <Label className="text-sm">Open link in new tab</Label>
              </div>
            )}
            <button onClick={handleSave} disabled={loading} className="w-full bg-[#0D9488] text-white py-2 rounded-sm text-sm font-medium disabled:opacity-50">Save</button>
          </div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
