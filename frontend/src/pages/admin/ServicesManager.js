import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Plus, Edit2, Trash2, Loader2, DollarSign, GripVertical, Eye, EyeOff } from 'lucide-react';

import ImageUpload from '../../components/ImageUpload';
import { Switch } from '../../components/ui/switch';
import RichTextEditor from '../../components/RichTextEditor';
import LocalizedField from '../../components/admin/LocalizedField';
import { adminText } from '../../lib/i18n';
import { useSettings } from '../../App';
import PersonalityTabs, { PB_PERSONALITY_TABS } from '../../components/admin/PersonalityTabs';

// dnd-kit: same primitives already used elsewhere (SectionOrderManager, PageBuilder)
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDataTable, DataTableToolbar, DataTablePagination, SortableTh } from '../../components/admin/useDataTable';

const emptyService = { title: '', description: '', short_description: '', full_content: '', icon: 'briefcase', image: '', price: 0, currency: 'usd', type: 'service', external_url: '', open_in_new_tab: false, visible: true, order: 0 };

// Single row extracted so dnd-kit hooks can attach listeners to the drag handle.
function ServiceRow({ item, onEdit, onDelete, onToggle }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };
  const visible = item.visible !== false;
  return (
    <tr ref={setNodeRef} style={style} className="border-b border-slate-50 hover:bg-slate-50/50" data-testid={`service-row-${item.id}`}>
      <td className="p-3 w-10">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500" data-testid={`service-drag-${item.id}`}>
          <GripVertical className="w-4 h-4" />
        </button>
      </td>
      <td className={`p-3 font-medium ${visible ? 'text-[#1a2332]' : 'text-slate-400 line-through'}`}>{adminText(item.title)}</td>
      <td className="p-3"><span className="text-xs uppercase bg-slate-100 px-2 py-0.5 rounded-sm">{item.type}</span></td>
      <td className="p-3 flex items-center gap-1"><DollarSign className="w-3 h-3 text-[#0D9488]" />{Number(item.price || 0).toFixed(2)}</td>
      <td className="p-3 text-right whitespace-nowrap">
        <button
          onClick={() => onToggle(item)}
          title={visible ? 'Visible — click to hide' : 'Hidden — click to show'}
          className={`p-1.5 ${visible ? 'text-[#0D9488] hover:text-[#0D9488]/70' : 'text-slate-300 hover:text-slate-500'}`}
          data-testid={`toggle-service-${item.id}`}
        >
          {visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
        <button onClick={() => onEdit(item)} className="p-1.5 text-slate-400 hover:text-[#0D9488]" data-testid={`edit-service-${item.id}`}><Edit2 className="w-4 h-4" /></button>
        <button onClick={() => onDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-500" data-testid={`delete-service-${item.id}`}><Trash2 className="w-4 h-4" /></button>
      </td>
    </tr>
  );
}

export default function ServicesManager() {
  const settings = useSettings();
  const isPB = settings.active_theme === 'personalbrand';
  const [activeTab, setActiveTab] = useState(null); // null = Global
  const [savedTabs, setSavedTabs] = useState(new Set(['__global__']));
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const load = (personality = activeTab) => adminAPI.getServices(personality).then(r => setItems((r.data || []).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)))).catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(activeTab); }, [activeTab]);

  // Badge which personality tabs already have their own content.
  useEffect(() => {
    if (!isPB) return;
    PB_PERSONALITY_TABS.forEach(t => {
      if (t.key === null) return;
      adminAPI.getServices(t.key).then(r => { if ((r.data || []).length) setSavedTabs(prev => new Set([...prev, t.key])); }).catch(() => {});
    });
  }, [isPB]);

  const handleSave = async () => {
    setLoading(true);
    try {
      if (editing.id) { await adminAPI.updateService(editing.id, editing); }
      else { await adminAPI.createService({ ...editing, order: items.length }, activeTab); }
      if (activeTab) setSavedTabs(prev => new Set([...prev, activeTab]));
      toast.success('Saved!'); setOpen(false); load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Error'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this service?')) return;
    try { await adminAPI.deleteService(id); toast.success('Deleted'); load(); }
    catch (e) { toast.error(e.response?.data?.detail || 'Cannot delete'); }
  };

  const handleToggleVisible = async (item) => {
    try {
      await adminAPI.updateService(item.id, { ...item, visible: item.visible === false });
      load();
    } catch { toast.error('Failed to update visibility'); }
  };

  const handleDragEnd = async ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex(i => i.id === active.id);
    const newIndex = items.findIndex(i => i.id === over.id);
    const originalOrders = new Map(items.map(s => [s.id, s.order ?? 0]));
    // Update both array positions and `order` field values so useDataTable
    // doesn't re-sort by stale field values and snap rows back.
    const reordered = arrayMove(items, oldIndex, newIndex).map((s, idx) => ({ ...s, order: idx }));
    setItems(reordered);
    try {
      await Promise.all(
        reordered
          .filter(s => originalOrders.get(s.id) !== s.order)
          .map(s => adminAPI.updateService(s.id, { ...s }))
      );
      toast.success('Order saved');
    } catch { toast.error('Failed to save order'); load(); }
  };

  const dt = useDataTable(items, {
    searchAccessor: s => `${adminText(s.title)} ${adminText(s.short_description)} ${s.type}`,
    defaultSort: { key: 'order', dir: 'asc' },
    storageKey: 'services',
  });
  // Drag-drop reordering is only enabled when the user hasn't applied a
  // filter/sort that would make the resulting order ambiguous. We check
  // both the search input and any explicit column sort.
  const dragEnabled = !dt.search && (dt.sortKey === 'order' || dt.sortKey == null);

  return (
    <div data-testid="services-manager">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1a2332]" style={{ fontFamily: 'Playfair Display, serif' }}>Services & Products</h1>
          <p className="text-xs text-slate-400 mt-1">Drag rows to reorder (clear search/sort first). Click the eye icon to hide a service without deleting it.</p>
        </div>
        <button onClick={() => { setEditing({...emptyService}); setOpen(true); }} className="bg-[#0D9488] text-white px-4 py-2 rounded-sm text-sm font-medium flex items-center gap-2" data-testid="add-service-btn">
          <Plus className="w-4 h-4" /> Add New
        </button>
      </div>
      <PersonalityTabs show={isPB} activeTab={activeTab} onChange={setActiveTab} savedTabs={savedTabs} label="Services scope" noun="services" />
      <DataTableToolbar dt={dt} testId="services" placeholder="Search by title, type…" />
      <div className="bg-white rounded-sm border border-slate-100">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-100 bg-slate-50">
            <th className="w-10"></th>
            <SortableTh dt={dt} field="title">Title</SortableTh>
            <SortableTh dt={dt} field="type">Type</SortableTh>
            <SortableTh dt={dt} field="price">Price</SortableTh>
            <th className="text-right p-3 font-medium text-slate-600">Actions</th>
          </tr></thead>
          <tbody>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={dragEnabled ? handleDragEnd : () => {}}>
              <SortableContext items={dt.visibleItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                {dt.visibleItems.map(item => (
                  <ServiceRow key={item.id} item={item} onEdit={(i) => { setEditing({...i}); setOpen(true); }} onDelete={handleDelete} onToggle={handleToggleVisible} />
                ))}
              </SortableContext>
            </DndContext>
            {dt.totalAll === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400 text-sm">No services yet.</td></tr>}
            {dt.totalAll > 0 && dt.totalFiltered === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400 text-sm">No services match your search</td></tr>}
          </tbody>
        </table>
        <DataTablePagination dt={dt} testId="services" />
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto" data-testid="service-dialog">
          <DialogHeader><DialogTitle style={{ fontFamily: 'Playfair Display, serif' }}>{editing?.id ? 'Edit' : 'New'} Service</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div><Label>Title</Label>
                <LocalizedField value={editing.title} onChange={v => setEditing({...editing, title: v})} render={({ value, onChange }) => (
                  <Input value={value || ''} onChange={e => onChange(e.target.value)} className="mt-1" data-testid="service-title-input" />
                )} />
              </div>
              <div><Label>Short Description <span className="text-xs text-slate-400 font-normal">(Card view)</span></Label>
                <LocalizedField value={editing.short_description} onChange={v => setEditing({...editing, short_description: v})} render={({ value, onChange }) => (
                  <RichTextEditor value={value || ''} onChange={onChange} />
                )} />
              </div>
              <div><Label>Full Content <span className="text-xs text-slate-400 font-normal">(Detail page)</span></Label>
                <LocalizedField value={editing.full_content} onChange={v => setEditing({...editing, full_content: v})} render={({ value, onChange }) => (
                  <RichTextEditor value={value || ''} onChange={onChange} placeholder="Full service description..." />
                )} />
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-sm p-3">
                <Label>External URL <span className="text-xs text-slate-400 font-normal">(If no Full Content, this URL is used for the "Read More" link)</span></Label>
                <Input value={editing.external_url || ''} onChange={e => setEditing({...editing, external_url: e.target.value})} className="mt-1" placeholder="https://... or /page-url" data-testid="service-external-url" />
                <div className="flex items-center gap-2 mt-2">
                  <Switch checked={editing.open_in_new_tab || false} onCheckedChange={v => setEditing({...editing, open_in_new_tab: v})} data-testid="service-newtab-switch" />
                  <Label className="text-xs">Open in new tab</Label>
                </div>
              </div>
              <div><Label>Image</Label><ImageUpload value={editing.image || ''} onChange={v => setEditing({...editing, image: v})} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Price ($)</Label><Input type="number" step="0.01" value={editing.price} onChange={e => setEditing({...editing, price: parseFloat(e.target.value) || 0})} className="mt-1" data-testid="service-price-input" /></div>
                <div>
                  <Label>Type</Label>
                  <select value={editing.type} onChange={e => setEditing({...editing, type: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-sm mt-1" data-testid="service-type-select">
                    <option value="service">Service</option><option value="product">Product</option>
                  </select>
                </div>
                <div><Label>Icon</Label><Input value={editing.icon} onChange={e => setEditing({...editing, icon: e.target.value})} className="mt-1" placeholder="briefcase" /></div>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <Switch checked={editing.visible !== false} onCheckedChange={v => setEditing({...editing, visible: v})} data-testid="service-visible-switch" />
                <Label className="text-xs">Visible on website</Label>
              </div>
              <button onClick={handleSave} disabled={loading} className="w-full bg-[#0D9488] text-white py-2 rounded-sm text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50" data-testid="service-save-btn">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
