import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Plus, Edit2, Trash2, Loader2, Save, FileText } from 'lucide-react';
import RichTextEditor from '../../components/RichTextEditor';
import { useDataTable, DataTableToolbar, DataTablePagination, SortableTh } from '../../components/admin/useDataTable';

const inputCls = "w-full border rounded-sm px-3 py-2 text-sm focus:ring-1 focus:ring-[#0D9488] focus:border-[#0D9488]";
const SESSION_TYPES = ['One-on-One', 'Group'];

const emptyTemplate = () => ({
  name: '', title: '', session_type: 'One-on-One', max_students: 1,
  default_duration_minutes: 60, description: '', virtual_link: '',
});

export default function MentorSlotTemplatesManager() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    adminAPI.getMentorSlotTemplates()
      .then(r => setTemplates(r.data || []))
      .catch(() => toast.error('Failed to load templates'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleSave = async () => {
    if (!editing.name?.trim()) { toast.error('Template name is required'); return; }
    setSaving(true);
    try {
      if (editing.id) await adminAPI.updateMentorSlotTemplate(editing.id, editing);
      else await adminAPI.createMentorSlotTemplate(editing);
      toast.success('Saved!'); setOpen(false); load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this template?')) return;
    try { await adminAPI.deleteMentorSlotTemplate(id); toast.success('Deleted'); load(); }
    catch { toast.error('Error'); }
  };

  const dt = useDataTable(templates, {
    searchAccessor: t => `${t.name || ''} ${t.title || ''} ${t.session_type || ''}`,
    defaultSort: { key: 'name', dir: 'asc' },
    storageKey: 'mentor-slot-templates',
  });

  return (
    <div data-testid="mentor-slot-templates-manager">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--ad-heading, #1a2332)', fontFamily: 'Playfair Display, serif' }}>
            Mentor Slot Templates
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pre-built slot blueprints mentors can apply in one click. Enable &quot;Mentor Slot Templates&quot; in
            Settings &rarr; General for them to appear in the slot editor.
          </p>
        </div>
        <button
          onClick={() => { setEditing(emptyTemplate()); setOpen(true); }}
          className="text-white px-4 py-2 rounded-sm text-sm font-medium flex items-center gap-2"
          style={{ backgroundColor: 'var(--ad-button-bg, #0D9488)' }}
          data-testid="add-template-btn"
        >
          <Plus className="w-4 h-4" /> New Template
        </button>
      </div>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div> : (
        <>
        <DataTableToolbar dt={dt} testId="tpl" placeholder="Search by name, title, type…" />
        <div className="bg-white rounded border overflow-x-auto" style={{ borderColor: 'var(--ad-card-border, #e2e8f0)' }}>
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-slate-50">
              <th className="text-left p-3 font-medium text-slate-600">No.</th>
              <SortableTh dt={dt} field="name">Name</SortableTh>
              <SortableTh dt={dt} field="title">Title</SortableTh>
              <SortableTh dt={dt} field="session_type">Type</SortableTh>
              <SortableTh dt={dt} field="max_students">Max</SortableTh>
              <SortableTh dt={dt} field="default_duration_minutes">Duration</SortableTh>
              <th className="text-right p-3 font-medium text-slate-600">Actions</th>
            </tr></thead>
            <tbody>
              {dt.visibleItems.map((t, i) => {
                const rowNum = (dt.page - 1) * dt.pageSize + i + 1;
                return (
                <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/50" data-testid={`tpl-row-${t.id}`}>
                  <td className="p-3 text-slate-400">{rowNum}</td>
                  <td className="p-3"><span className="text-[#1a2332] font-medium">{t.name}</span></td>
                  <td className="p-3 text-slate-500">{t.title || '-'}</td>
                  <td className="p-3 text-slate-500 text-xs">{t.session_type}</td>
                  <td className="p-3 text-slate-500">{t.max_students}</td>
                  <td className="p-3 text-slate-500 text-xs">{t.default_duration_minutes} min</td>
                  <td className="p-3 text-right">
                    <button onClick={() => { setEditing({ ...t }); setOpen(true); }} className="p-1.5 text-slate-400 hover:text-[#0D9488]" data-testid={`edit-tpl-${t.id}`}><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(t.id)} className="p-1.5 text-slate-400 hover:text-red-500" data-testid={`delete-tpl-${t.id}`}><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
          {dt.totalAll === 0 && (
            <div className="p-12 text-center text-slate-400 text-sm">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
              No templates yet. Create one to save time on recurring mentorship slot types.
            </div>
          )}
          {dt.totalAll > 0 && dt.totalFiltered === 0 && <p className="p-8 text-center text-slate-400 text-sm">No templates match your search.</p>}
          <DataTablePagination dt={dt} testId="tpl" />
        </div>
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto" data-testid="tpl-dialog">
          <DialogHeader><DialogTitle style={{ fontFamily: 'Playfair Display, serif' }}>{editing?.id ? 'Edit' : 'New'} Template</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Template Name *</Label>
                <p className="text-[11px] text-slate-400 mb-1">Internal label mentors see in the dropdown (e.g. &quot;Portfolio Review&quot;).</p>
                <Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} className="mt-1" placeholder="Portfolio Review" data-testid="tpl-name" />
              </div>
              <div>
                <Label className="text-xs">Default Slot Title</Label>
                <Input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} className="mt-1" placeholder="e.g. Portfolio Analysis Session" data-testid="tpl-title" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Session Type *</Label>
                  <select value={editing.session_type} onChange={e => setEditing({ ...editing, session_type: e.target.value })} className={inputCls + " mt-1"} data-testid="tpl-type">
                    {SESSION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Max Students *</Label>
                  <Input type="number" min={1} value={editing.max_students} onChange={e => setEditing({ ...editing, max_students: parseInt(e.target.value) || 1 })} className="mt-1" data-testid="tpl-max" />
                </div>
                <div>
                  <Label className="text-xs">Duration (min) *</Label>
                  <Input type="number" min={5} step={5} value={editing.default_duration_minutes} onChange={e => setEditing({ ...editing, default_duration_minutes: parseInt(e.target.value) || 60 })} className="mt-1" data-testid="tpl-duration" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Default Virtual Link</Label>
                <Input value={editing.virtual_link} onChange={e => setEditing({ ...editing, virtual_link: e.target.value })} className="mt-1" placeholder="https://zoom.us/..." data-testid="tpl-link" />
              </div>
              <div>
                <Label className="text-xs">Description Outline</Label>
                <p className="text-[11px] text-slate-400 mb-1">Rich text pre-fill. Mentors can edit before publishing the slot.</p>
                <div className="mt-1" data-testid="tpl-description-editor">
                  <RichTextEditor value={editing.description || ''} onChange={val => setEditing({ ...editing, description: val })} placeholder="What members should expect in this session..." />
                </div>
              </div>
              <button onClick={handleSave} disabled={saving} className="w-full py-2 rounded-sm text-sm font-medium text-white flex items-center justify-center gap-2 disabled:opacity-50" style={{ backgroundColor: 'var(--ad-button-bg, #0D9488)' }} data-testid="tpl-save-btn">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {editing.id ? 'Update' : 'Create'} Template
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
