import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Plus, Edit2, Trash2, Loader2, Quote, Eye, EyeOff, GripVertical } from 'lucide-react';
import ImageUpload from '../../components/ImageUpload';
import LocalizedField from '../../components/admin/LocalizedField';
import { Switch } from '../../components/ui/switch';
import { adminText } from '../../lib/i18n';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useSettings } from '../../App';
import PersonalityTabs, { PB_PERSONALITY_TABS } from '../../components/admin/PersonalityTabs';

const API = process.env.REACT_APP_BACKEND_URL;
const resolveSrc = (v) => v ? (v.startsWith('/api') ? `${API}${v}` : v) : null;

const emptyItem = { name: '', title: '', content: '', image: '', order: 0, visible: true };

// Single sortable row — keeps dnd-kit hooks isolated so React doesn't re-run
// them on every parent re-render.
function TestimonialRow({ item, onEdit, onDelete, onToggleVisible }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };
  const visible = item.visible !== false;
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg group hover:bg-slate-100 transition-colors" data-testid={`testimonial-row-${item.id}`}>
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 shrink-0" data-testid={`testimonial-drag-${item.id}`}>
        <GripVertical className="w-5 h-5" />
      </button>
      {item.image ? (
        <img src={resolveSrc(item.image)} alt={adminText(item.name)} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
      ) : (
        <div className="w-12 h-12 rounded-full bg-[#1a2332]/10 flex items-center justify-center">
          <Quote className="w-5 h-5 text-[#1a2332]/30" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className={`font-medium text-sm ${visible ? 'text-[#1a2332]' : 'text-slate-400'}`}>{adminText(item.name)}</p>
        <p className="text-xs text-slate-500">{adminText(item.title)}</p>
        <p className="text-xs text-slate-400 truncate mt-0.5">{adminText(item.content)?.substring(0, 80)}...</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onToggleVisible(item)}
          title={visible ? 'Visible — click to hide' : 'Hidden — click to show'}
          className={`p-1.5 ${visible ? 'text-[#0D9488] hover:text-[#0D9488]/70' : 'text-slate-300 hover:text-slate-500'}`}
          data-testid={`toggle-testimonial-${item.id}`}
        >
          {visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(item)} className="p-1.5 text-slate-400 hover:text-[#0D9488]" data-testid={`edit-testimonial-${item.id}`}><Edit2 className="w-4 h-4" /></button>
          <button onClick={() => onDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-500" data-testid={`delete-testimonial-${item.id}`}><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
}

export default function TestimonialsManager() {
  const settings = useSettings();
  const isPB = settings.active_theme === 'personalbrand';
  const [activeTab, setActiveTab] = useState(null); // null = Global
  const [savedTabs, setSavedTabs] = useState(new Set(['__global__']));
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const load = (personality = activeTab) => adminAPI.getTestimonials(personality).then(r => {
    const data = (r.data || []).sort((a, b) => (a.order || 0) - (b.order || 0));
    setItems(data);
  }).catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(activeTab); }, [activeTab]);

  useEffect(() => {
    if (!isPB) return;
    PB_PERSONALITY_TABS.forEach(t => {
      if (t.key === null) return;
      adminAPI.getTestimonials(t.key).then(r => { if ((r.data || []).length) setSavedTabs(prev => new Set([...prev, t.key])); }).catch(() => {});
    });
  }, [isPB]);

  const handleSave = async () => {
    setLoading(true);
    try {
      if (editing.id) await adminAPI.updateTestimonial(editing.id, editing);
      else await adminAPI.createTestimonial(editing, activeTab);
      if (activeTab) setSavedTabs(prev => new Set([...prev, activeTab]));
      toast.success('Saved'); setOpen(false); load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Error'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this item?')) return;
    try { await adminAPI.deleteTestimonial(id); toast.success('Deleted'); load(); } catch { toast.error('Error'); }
  };

  const handleToggleVisible = async (item) => {
    try {
      await adminAPI.updateTestimonial(item.id, { ...item, visible: item.visible === false });
      load();
    } catch { toast.error('Failed to update visibility'); }
  };

  const handleDragEnd = async ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex(i => i.id === active.id);
    const newIndex = items.findIndex(i => i.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);
    // Persist each changed row's new order. Matches the Services pattern.
    try {
      await Promise.all(reordered.map((t, idx) => t.order !== idx ? adminAPI.updateTestimonial(t.id, { ...t, order: idx }) : Promise.resolve()));
      toast.success('Order saved');
    } catch { toast.error('Failed to save order'); load(); }
  };

  return (
    <div data-testid="testimonials-manager">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1a2332]" style={{ fontFamily: 'Playfair Display, serif' }}>Legends & Testimonials</h1>
          <p className="text-xs text-slate-400 mt-1">Drag rows to reorder. Click the eye icon to hide a testimonial without deleting it.</p>
        </div>
        <button onClick={() => { setEditing({ ...emptyItem, order: items.length }); setOpen(true); }} className="bg-[#0D9488] text-white px-4 py-2 rounded-sm text-sm font-medium flex items-center gap-2" data-testid="add-testimonial-btn">
          <Plus className="w-4 h-4" /> Add Legend
        </button>
      </div>

      <PersonalityTabs show={isPB} activeTab={activeTab} onChange={setActiveTab} savedTabs={savedTabs} label="Testimonials scope" noun="testimonials" />

      <div className="bg-white rounded-sm border border-slate-200">
        <div className="grid gap-3 p-4">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
              {items.map(item => (
                <TestimonialRow key={item.id} item={item} onEdit={(i) => { setEditing({ ...i }); setOpen(true); }} onDelete={handleDelete} onToggleVisible={handleToggleVisible} />
              ))}
            </SortableContext>
          </DndContext>
          {items.length === 0 && <div className="p-12 text-center text-slate-400 text-sm">No legends or testimonials yet.</div>}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto" data-testid="testimonial-dialog">
          <DialogHeader><DialogTitle style={{ fontFamily: 'Playfair Display, serif' }}>{editing?.id ? 'Edit' : 'New'} Legend / Testimonial</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-slate-500">Author Photo</Label>
                <ImageUpload value={editing.image || ''} onChange={v => setEditing({ ...editing, image: v })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-slate-500">Author Name</Label>
                  <LocalizedField value={editing.name} onChange={v => setEditing({ ...editing, name: v })} render={({ value, onChange }) => (
                    <Input value={value || ''} onChange={e => onChange(e.target.value)} className="mt-1" data-testid="testimonial-name-input" />
                  )} />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Title / Role</Label>
                  <LocalizedField value={editing.title} onChange={v => setEditing({ ...editing, title: v })} render={({ value, onChange }) => (
                    <Input value={value || ''} onChange={e => onChange(e.target.value)} className="mt-1" data-testid="testimonial-title-input" />
                  )} />
                </div>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Quote / Testimonial</Label>
                <LocalizedField value={editing.content} onChange={v => setEditing({ ...editing, content: v })} render={({ value, onChange }) => (
                  <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={4} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-sm mt-1" placeholder="Their words..." data-testid="testimonial-content-input" />
                )} />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <Label className="text-xs text-slate-500">Visible on site</Label>
                <Switch
                  checked={editing.visible !== false}
                  onCheckedChange={(v) => setEditing({ ...editing, visible: v })}
                  data-testid="testimonial-visible-switch"
                />
              </div>
              <button onClick={handleSave} disabled={loading} className="w-full bg-[#0D9488] text-white py-2.5 rounded-sm text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50" data-testid="testimonial-save-btn">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
