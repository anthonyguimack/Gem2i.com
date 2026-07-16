import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Plus, Pencil, Trash2, Eye, EyeOff, Save, Loader2, GripVertical, ExternalLink, ArrowLeft, KeyRound } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableLinkRow({ link, onEdit, onDelete, onToggle }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: link.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 px-5 py-3 border-b last:border-0 hover:bg-slate-50 bg-white" data-testid={`ql-row-${link.id}`}>
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-200 flex-shrink-0 touch-none" data-testid={`ql-drag-${link.id}`}>
        <GripVertical className="w-4 h-4 text-slate-300" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: link.active ? 'var(--ad-heading, #1a2332)' : '#9ca3af' }}>
          {link.label}
          {link.new_tab && <ExternalLink className="w-3 h-3 inline ml-1.5 text-slate-400" />}
          {link.sso_enabled && <KeyRound className="w-3 h-3 inline ml-1.5 text-amber-500" title="SSO handoff enabled" />}
        </p>
        <p className="text-xs text-slate-400 truncate">{link.url}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <button onClick={() => onToggle(link)} className={`p-1.5 rounded hover:bg-slate-100 ${link.active ? 'text-slate-500' : 'text-slate-300'}`} title={link.active ? 'Deactivate' : 'Activate'}>
          {link.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
        <button onClick={() => onEdit(link)} className="p-1.5 rounded hover:bg-slate-100 text-slate-500"><Pencil className="w-4 h-4" /></button>
        <button onClick={() => onDelete(link)} className="p-1.5 rounded hover:bg-red-50 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

const inputCls = "w-full border rounded-sm px-3 py-2 text-sm focus:ring-1 focus:ring-[#0D9488] focus:border-[#0D9488]";

export default function QuickLinksManager() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const load = () => {
    setLoading(true);
    adminAPI.getMyAccountLinks().then(r => { setLinks(r.data || []); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(load, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const toggleActive = async (link) => {
    try {
      await adminAPI.updateMyAccountLink(link.id, { active: !link.active });
      setLinks(prev => prev.map(l => l.id === link.id ? { ...l, active: !l.active } : l));
      toast.success(`Link ${link.active ? 'deactivated' : 'activated'}`);
    } catch { toast.error('Failed'); }
  };

  const deleteLink = async (link) => {
    if (!window.confirm(`Delete "${link.label}"?`)) return;
    try {
      await adminAPI.deleteMyAccountLink(link.id);
      setLinks(prev => prev.filter(l => l.id !== link.id));
      toast.success('Deleted');
    } catch { toast.error('Failed'); }
  };

  const openEdit = (link) => setEditing({ ...link });
  const openNew = () => setEditing({ id: null, label: '', url: '', new_tab: false, active: true, sso_enabled: false });

  const saveLink = async () => {
    if (!editing.label || !editing.url) { toast.error('Label and URL are required'); return; }
    try {
      if (editing.id) {
        await adminAPI.updateMyAccountLink(editing.id, editing);
        toast.success('Updated');
      } else {
        await adminAPI.createMyAccountLink(editing);
        toast.success('Created');
      }
      setEditing(null);
      load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Save failed'); }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = links.findIndex(l => l.id === active.id);
    const newIndex = links.findIndex(l => l.id === over.id);
    const reordered = arrayMove(links, oldIndex, newIndex);
    setLinks(reordered);
    try {
      await adminAPI.reorderMyAccountLinks(reordered.map(l => l.id));
    } catch { toast.error('Failed to save order'); load(); }
  };

  if (editing) {
    return (
      <div data-testid="quick-link-editor">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setEditing(null)} className="p-1.5 rounded hover:bg-slate-100"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-xl font-bold" style={{ color: 'var(--ad-heading, #1a2332)', fontFamily: 'Playfair Display, serif' }}>{editing.id ? 'Edit Link' : 'Add Link'}</h1>
        </div>
        <div className="bg-white rounded border p-6 space-y-4 max-w-lg" style={{ borderColor: 'var(--ad-card-border, #e2e8f0)' }}>
          <div>
            <Label className="text-xs text-slate-500">Label *</Label>
            <Input value={editing.label} onChange={e => setEditing(p => ({ ...p, label: e.target.value }))} placeholder="e.g. Home" data-testid="ql-label-input" />
          </div>
          <div>
            <Label className="text-xs text-slate-500">URL *</Label>
            <Input value={editing.url} onChange={e => setEditing(p => ({ ...p, url: e.target.value }))} placeholder="https://example.com or /page" data-testid="ql-url-input" />
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={editing.new_tab} onChange={e => setEditing(p => ({ ...p, new_tab: e.target.checked }))} className="accent-[#0D9488]" data-testid="ql-new-tab" />
              Open in new tab
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={editing.active} onChange={e => setEditing(p => ({ ...p, active: e.target.checked }))} className="accent-[#0D9488]" data-testid="ql-active" />
              Active
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={!!editing.sso_enabled} onChange={e => setEditing(p => ({ ...p, sso_enabled: e.target.checked }))} className="accent-[#0D9488]" data-testid="ql-sso-enabled" />
              <span className="flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                Enable SSO handoff
              </span>
            </label>
          </div>
          {editing.sso_enabled && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              When clicked, the member's session token will be appended to this URL as <code className="font-mono">?token=…</code> before redirecting. The destination must call <code className="font-mono">/api/auth/sso/verify</code> to authenticate.
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <button onClick={saveLink} className="px-5 py-2 rounded text-sm font-medium text-white flex items-center gap-2" style={{ backgroundColor: 'var(--ad-button-bg, #0D9488)' }} data-testid="ql-save-btn">
              <Save className="w-4 h-4" /> {editing.id ? 'Update' : 'Create'}
            </button>
            <button onClick={() => setEditing(null)} className="px-5 py-2 rounded text-sm font-medium border border-slate-300 text-slate-600 hover:bg-slate-50">Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="quick-links-manager">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--ad-heading, #1a2332)', fontFamily: 'Playfair Display, serif' }}>My Account Quick Links</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--ad-text-secondary, #6b7280)' }}>Manage the links shown in the My Account header navigation bar.</p>
        </div>
        <button onClick={openNew} className="text-white px-4 py-2 rounded-sm text-sm font-medium flex items-center gap-2" style={{ backgroundColor: 'var(--ad-button-bg, #0D9488)' }} data-testid="ql-add-btn">
          <Plus className="w-4 h-4" /> Add Link
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : (
        <div className="bg-white rounded border" style={{ borderColor: 'var(--ad-card-border, #e2e8f0)' }}>
          <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--ad-card-border, #e2e8f0)', backgroundColor: 'var(--ad-table-header-bg, #f8fafc)' }}>
            <h2 className="font-semibold text-sm" style={{ color: 'var(--ad-heading, #1a2332)' }}>Links</h2>
            <span className="text-xs text-slate-400">Drag to reorder</span>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={links.map(l => l.id)} strategy={verticalListSortingStrategy}>
              {links.map(l => (
                <SortableLinkRow key={l.id} link={l} onEdit={openEdit} onDelete={deleteLink} onToggle={toggleActive} />
              ))}
            </SortableContext>
          </DndContext>
          {links.length === 0 && <p className="px-5 py-8 text-sm text-slate-400 text-center">No links yet. Click "Add Link" to create one.</p>}
        </div>
      )}
    </div>
  );
}
