import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Checkbox } from '../../components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Plus, Edit2, Trash2, Loader2, Tag, Settings2, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ImageUpload from '../../components/ImageUpload';
import { useSettings } from '../../App';
import PersonalityTabs, { PB_PERSONALITY_TABS } from '../../components/admin/PersonalityTabs';

const emptyItem = { title: '', summary: '', image: '', category: '', link: '', open_in_new_tab: false, order: 0 };
const emptyCategory = { name: '', slug: '', order: 0 };
const API = process.env.REACT_APP_BACKEND_URL;

function SortableGalleryCard({ item, onEdit, onDelete, onToggleSelect, isSelected }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 50 : 'auto' };
  const src = item.image?.startsWith('/api') ? `${API}${item.image}` : item.image;

  return (
    <div ref={setNodeRef} style={style} className="bg-white rounded-sm border border-slate-100 overflow-hidden group relative" data-testid={`gallery-card-${item.id}`}>
      <div className="absolute top-2 left-2 z-10"><Checkbox checked={isSelected} onCheckedChange={() => onToggleSelect(item.id)} className="bg-white" /></div>
      <div {...attributes} {...listeners} className="absolute top-2 right-2 z-10 cursor-grab active:cursor-grabbing bg-white/80 rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`drag-handle-${item.id}`}>
        <GripVertical className="w-4 h-4 text-slate-400" />
      </div>
      <div className="h-40 overflow-hidden">
        {src ? <img src={src} alt={item.title} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300">No image</div>}
      </div>
      <div className="p-3">
        <h4 className="text-sm font-semibold text-[#1a2332] truncate">{item.title || 'Untitled'}</h4>
        <p className="text-xs text-slate-400 capitalize">{item.category || 'No category'}</p>
        {item.link && <p className="text-xs text-blue-500 truncate mt-0.5">{item.link}</p>}
        <div className="flex gap-1 mt-2">
          <button onClick={() => onEdit(item)} className="p-1 text-slate-400 hover:text-[#0D9488]" data-testid={`edit-gallery-${item.id}`}><Edit2 className="w-3 h-3" /></button>
          <button onClick={() => onDelete(item.id)} className="p-1 text-slate-400 hover:text-red-500" data-testid={`delete-gallery-${item.id}`}><Trash2 className="w-3 h-3" /></button>
        </div>
      </div>
    </div>
  );
}

export default function GalleryManager() {
  const settings = useSettings();
  const isPB = settings.active_theme === 'personalbrand';
  const [activeTab, setActiveTab] = useState(null); // null = Global
  const [savedTabs, setSavedTabs] = useState(new Set(['__global__']));
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState([]);
  const [catOpen, setCatOpen] = useState(false);
  const [editCat, setEditCat] = useState(null);
  const [catLoading, setCatLoading] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // Photos are personality-scoped; categories are a shared taxonomy (global).
  const load = (personality = activeTab) => {
    adminAPI.getGallery(personality).then(r => setItems(r.data)).catch(console.error);
    adminAPI.getGalleryCategories().then(r => setCategories(r.data || [])).catch(() => {});
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(activeTab); }, [activeTab]);

  useEffect(() => {
    if (!isPB) return;
    PB_PERSONALITY_TABS.forEach(t => {
      if (t.key === null) return;
      adminAPI.getGallery(t.key).then(r => { if ((r.data || []).length) setSavedTabs(prev => new Set([...prev, t.key])); }).catch(() => {});
    });
  }, [isPB]);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex(i => i.id === active.id);
    const newIndex = items.findIndex(i => i.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);
    const batch = reordered.map((item, idx) => ({ id: item.id, order: idx }));
    try {
      await adminAPI.reorderGallery(batch);
      toast.success('Order saved');
    } catch { toast.error('Reorder failed'); }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const data = { ...editing, order: editing.order ?? items.length };
      if (editing.id) await adminAPI.updateGallery(editing.id, data);
      else await adminAPI.createGallery(data, activeTab);
      if (activeTab) setSavedTabs(prev => new Set([...prev, activeTab]));
      toast.success('Saved!'); setOpen(false); load();
    } catch { toast.error('Error'); } finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete?')) return;
    try { await adminAPI.deleteGallery(id); toast.success('Deleted'); load(); } catch { toast.error('Error'); }
  };

  const handleBulkDelete = async () => {
    if (!selected.length || !window.confirm(`Delete ${selected.length} items?`)) return;
    try { await adminAPI.bulkDelete('gallery', selected); toast.success(`${selected.length} deleted`); setSelected([]); load(); }
    catch { toast.error('Error'); }
  };

  const toggleSelect = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSaveCategory = async () => {
    setCatLoading(true);
    try {
      const slug = editCat.slug || editCat.name.toLowerCase().replace(/\s+/g, '_');
      const data = { ...editCat, slug };
      if (editCat.id) await adminAPI.updateGalleryCategory(editCat.id, data);
      else await adminAPI.createGalleryCategory(data);
      toast.success('Category saved!'); setEditCat(null); load();
    } catch { toast.error('Error'); } finally { setCatLoading(false); }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Delete this category?')) return;
    try { await adminAPI.deleteGalleryCategory(id); toast.success('Deleted'); load(); } catch { toast.error('Error'); }
  };

  return (
    <div data-testid="gallery-manager">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1a2332]" style={{ fontFamily: 'Playfair Display, serif' }}>Gallery Manager</h1>
          <p className="text-xs text-slate-400 mt-1">Drag photos to reorder. Changes save automatically.</p>
        </div>
        <div className="flex items-center gap-2">
          {selected.length > 0 && (
            <button onClick={handleBulkDelete} className="bg-red-500 text-white px-3 py-2 rounded-sm text-sm font-medium flex items-center gap-1" data-testid="bulk-delete-gallery-btn">
              <Trash2 className="w-3 h-3" /> Delete ({selected.length})
            </button>
          )}
          <button onClick={() => setCatOpen(true)} className="border border-slate-200 text-slate-600 px-3 py-2 rounded-sm text-sm font-medium flex items-center gap-1 hover:border-[#0D9488] transition-colors" data-testid="manage-categories-btn">
            <Settings2 className="w-3.5 h-3.5" /> Categories
          </button>
          <button onClick={() => { setEditing({...emptyItem, order: items.length}); setOpen(true); }} className="bg-[#0D9488] text-white px-4 py-2 rounded-sm text-sm font-medium flex items-center gap-2" data-testid="add-photo-btn"><Plus className="w-4 h-4" /> Add Photo</button>
        </div>
      </div>

      <PersonalityTabs show={isPB} activeTab={activeTab} onChange={setActiveTab} savedTabs={savedTabs} label="Gallery scope" noun="photos" />

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map(i => i.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map(item => (
              <SortableGalleryCard key={item.id} item={item} onEdit={(i) => { setEditing({...i}); setOpen(true); }} onDelete={handleDelete} onToggleSelect={toggleSelect} isSelected={selected.includes(item.id)} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {items.length === 0 && <div className="text-center py-16 text-slate-400">No photos yet. Click "Add Photo" to get started.</div>}

      {/* Photo Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="gallery-edit-dialog"><DialogHeader><DialogTitle>{editing?.id ? 'Edit' : 'New'} Photo</DialogTitle></DialogHeader>
          {editing && <div className="space-y-4">
            <div><Label>Title</Label><Input value={editing.title} onChange={e => setEditing({...editing, title: e.target.value})} className="mt-1" data-testid="gallery-title-input" /></div>
            <div><Label>Summary</Label><textarea value={editing.summary || ''} onChange={e => setEditing({...editing, summary: e.target.value})} rows={2} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-sm mt-1" data-testid="gallery-summary-input" /></div>
            <div><Label>Image</Label><ImageUpload value={editing.image} onChange={val => setEditing({...editing, image: val})} className="mt-1" /></div>
            <div><Label>Category</Label>
              <select value={editing.category} onChange={e => setEditing({...editing, category: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-sm mt-1" data-testid="gallery-category-select">
                <option value="">-- Select category --</option>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div><Label>Link (optional)</Label><Input value={editing.link || ''} onChange={e => setEditing({...editing, link: e.target.value})} className="mt-1" placeholder="https://..." data-testid="gallery-link-input" /></div>
            {editing.link && (
              <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-sm border border-slate-100">
                <Switch checked={editing.open_in_new_tab || false} onCheckedChange={v => setEditing({...editing, open_in_new_tab: v})} data-testid="gallery-newtab-toggle" />
                <Label className="text-sm">Open link in new tab</Label>
              </div>
            )}
            <button onClick={handleSave} disabled={loading} className="w-full bg-[#0D9488] text-white py-2 rounded-sm text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2" data-testid="gallery-save-btn">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} Save
            </button>
          </div>}
        </DialogContent>
      </Dialog>

      {/* Categories Manager Dialog */}
      <Dialog open={catOpen} onOpenChange={setCatOpen}>
        <DialogContent className="sm:max-w-[500px]" data-testid="categories-dialog">
          <DialogHeader><DialogTitle style={{ fontFamily: 'Playfair Display, serif' }}>Gallery Categories</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              {categories.map(c => (
                <div key={c.id} className="flex items-center gap-2 bg-slate-50 rounded-sm border border-slate-100 px-3 py-2" data-testid={`category-row-${c.id}`}>
                  <Tag className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-slate-700 flex-1 capitalize">{c.name}</span>
                  <span className="text-xs text-slate-400">Order: {c.order || 0}</span>
                  <button onClick={() => setEditCat({...c})} className="p-1 text-slate-400 hover:text-[#0D9488]" data-testid={`edit-cat-${c.id}`}><Edit2 className="w-3 h-3" /></button>
                  <button onClick={() => handleDeleteCategory(c.id)} className="p-1 text-slate-400 hover:text-red-500" data-testid={`delete-cat-${c.id}`}><Trash2 className="w-3 h-3" /></button>
                </div>
              ))}
              {categories.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No categories yet. Add one below.</p>}
            </div>
            <div className="border-t border-slate-200 pt-4">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">{editCat?.id ? 'Edit' : 'Add'} Category</p>
              <div className="flex gap-2">
                <Input placeholder="Category name" value={editCat?.name || ''} onChange={e => setEditCat(prev => ({...(prev || emptyCategory), name: e.target.value}))} className="flex-1" data-testid="category-name-input" />
                <Input type="number" placeholder="Order" value={editCat?.order || 0} onChange={e => setEditCat(prev => ({...(prev || emptyCategory), order: parseInt(e.target.value) || 0}))} className="w-20" data-testid="category-order-input" />
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={handleSaveCategory} disabled={catLoading || !editCat?.name} className="bg-[#0D9488] text-white px-4 py-2 rounded-sm text-sm font-medium disabled:opacity-50 flex items-center gap-1" data-testid="save-category-btn">
                  {catLoading && <Loader2 className="w-3 h-3 animate-spin" />} {editCat?.id ? 'Update' : 'Add'}
                </button>
                {editCat?.id && <button onClick={() => setEditCat({...emptyCategory})} className="px-4 py-2 rounded-sm text-sm text-slate-500 border border-slate-200">Cancel</button>}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
