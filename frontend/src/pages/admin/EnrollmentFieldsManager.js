import React, { useState, useEffect } from 'react';
import { enrollmentAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Plus, Pencil, Trash2, Eye, EyeOff, ArrowLeft, Save, Loader2, GripVertical, FileText, ListOrdered } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import RichTextEditor from '../../components/RichTextEditor';

const FIELD_TYPES = [
  { value: 'text', label: 'Text Input' },
  { value: 'email', label: 'Email' },
  { value: 'password', label: 'Password' },
  { value: 'number', label: 'Number' },
  { value: 'currency', label: 'Currency ($)' },
  { value: 'date', label: 'Date Picker (mm/dd/yyyy)' },
  { value: 'datetime', label: 'Date & Time (mm/dd/yyyy HH:mm:ss)' },
  { value: 'select', label: 'Select Dropdown' },
  { value: 'radio', label: 'Radio Buttons' },
  { value: 'checkbox', label: 'Checkboxes' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'richtext', label: 'Rich Text' },
  { value: 'rating', label: 'Rating (1-5)' },
  { value: 'rating_table', label: 'Rating Table' },
  { value: 'legal_checkbox', label: 'Legal Agreement Checkbox' },
  { value: 'signature_text', label: 'Signature Text' },
  { value: 'signature_date', label: 'Signature Date' },
  { value: 'country', label: 'Country Selector' },
  { value: 'state', label: 'State Selector' },
  { value: 'city', label: 'City Selector' },
];

const ICON_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'user', label: 'User' },
  { value: 'mail', label: 'Mail' },
  { value: 'lock', label: 'Lock' },
  { value: 'phone', label: 'Phone' },
  { value: 'map-pin', label: 'Map Pin' },
  { value: 'calendar', label: 'Calendar' },
  { value: 'briefcase', label: 'Briefcase' },
  { value: 'book', label: 'Book' },
  { value: 'pen', label: 'Pen' },
  { value: 'hash', label: 'Hash' },
  { value: 'dollar-sign', label: 'Dollar Sign' },
  { value: 'gift', label: 'Gift' },
  { value: 'shield', label: 'Shield' },
  { value: 'globe', label: 'Globe' },
  { value: 'home', label: 'Home' },
  { value: 'heart', label: 'Heart' },
  { value: 'star', label: 'Star' },
  { value: 'flag', label: 'Flag' },
  { value: 'file-text', label: 'File Text' },
  { value: 'award', label: 'Award' },
  { value: 'credit-card', label: 'Credit Card' },
  { value: 'trending-up', label: 'Trending Up' },
  { value: 'bar-chart', label: 'Bar Chart' },
  { value: 'clipboard', label: 'Clipboard' },
  { value: 'target', label: 'Target' },
  { value: 'info', label: 'Info' },
  { value: 'check-circle', label: 'Check Circle' },
  { value: 'alert-circle', label: 'Alert Circle' },
];

const inputCls = "w-full border rounded-sm px-3 py-2 text-sm focus:ring-1 focus:ring-[#0D9488] focus:border-[#0D9488]";
const STEP_NAMES = { 1: 'Step 1 - Invitation CODE', 2: 'Step 2 - Clarity Statement and Interview', 3: 'Step 3 - Application Enrollment', 4: 'Step 4 - Confirm & Submit' };

function SortableFieldRow({ field: f, onEdit, onDelete, onToggleVisibility }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: f.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 50 : 'auto' };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 px-5 py-3 border-b last:border-0 hover:bg-slate-50 transition-colors bg-white" data-testid={`ef-row-${f.field_key}`}>
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-200 flex-shrink-0 touch-none" data-testid={`ef-drag-${f.field_key}`}>
        <GripVertical className="w-4 h-4 text-slate-300" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: f.visible ? 'var(--ad-heading, #1a2332)' : '#9ca3af' }}>{f.label}</p>
        <p className="text-xs text-slate-400">{f.field_key} &middot; {f.field_type}{f.required ? ' \u00b7 required' : ''}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <button onClick={() => onToggleVisibility(f)} className={`p-1.5 rounded hover:bg-slate-100 ${f.visible ? 'text-slate-500' : 'text-slate-300'}`} title={f.visible ? 'Hide' : 'Show'} data-testid={`ef-vis-${f.field_key}`}>
          {f.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
        <button onClick={() => onEdit(f)} className="p-1.5 rounded hover:bg-slate-100 text-slate-500" title="Edit" data-testid={`ef-edit-${f.field_key}`}>
          <Pencil className="w-4 h-4" />
        </button>
        <button onClick={() => onDelete(f)} className="p-1.5 rounded hover:bg-red-50 text-red-400 hover:text-red-600" title="Delete" data-testid={`ef-del-${f.field_key}`}>
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function EnrollmentFieldsManager() {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null = list view, object = editing
  const [activeTab, setActiveTab] = useState('fields'); // 'fields' | 'step4'
  const [step4Content, setStep4Content] = useState({ title: '', description: '' });
  const [step4Loading, setStep4Loading] = useState(false);
  const [step4Saving, setStep4Saving] = useState(false);

  const load = () => {
    setLoading(true);
    enrollmentAPI.adminGetFields().then(r => { setFields(r.data || []); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(load, []);

  useEffect(() => {
    if (activeTab === 'step4') {
      setStep4Loading(true);
      enrollmentAPI.adminGetStep4Content().then(r => { setStep4Content(r.data || {}); setStep4Loading(false); }).catch(() => setStep4Loading(false));
    }
  }, [activeTab]);

  const saveStep4Content = async () => {
    setStep4Saving(true);
    try {
      await enrollmentAPI.adminUpdateStep4Content(step4Content);
      toast.success('Step 4 content updated');
    } catch { toast.error('Failed to save'); }
    setStep4Saving(false);
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const toggleVisibility = async (field) => {
    try {
      await enrollmentAPI.adminToggleVisibility(field.id, !field.visible);
      setFields(prev => prev.map(f => f.id === field.id ? { ...f, visible: !f.visible } : f));
      toast.success(`Field ${field.visible ? 'hidden' : 'shown'}`);
    } catch { toast.error('Failed to update visibility'); }
  };

  // Bulk hide / show every field in a step in one call.  Optimistically updates
  // the UI then fires the toggle API for each affected field in parallel.
  // If we're already in the target state for every field we no-op so the user
  // can spam the toggle without spamming the backend.
  const toggleStepVisibility = async (step, makeVisible) => {
    const stepFields = (grouped[step] || []);
    const targets = stepFields.filter(f => !!f.visible !== makeVisible);
    if (!targets.length) return;
    setFields(prev => prev.map(f => f.step === step ? { ...f, visible: makeVisible } : f));
    try {
      await Promise.all(targets.map(f => enrollmentAPI.adminToggleVisibility(f.id, makeVisible)));
      toast.success(`${targets.length} field${targets.length === 1 ? '' : 's'} ${makeVisible ? 'shown' : 'hidden'}`);
    } catch {
      toast.error('Failed to bulk update');
      load();
    }
  };

  const deleteField = async (field) => {
    if (!window.confirm(`Delete "${field.label}" permanently?`)) return;
    try {
      await enrollmentAPI.adminDeleteField(field.id);
      setFields(prev => prev.filter(f => f.id !== field.id));
      toast.success('Field deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const openEdit = (field) => setEditing({ ...field, _options_text: (field.options || []).join('\n') });
  const openNew = () => setEditing({ id: null, step: 1, field_key: '', label: '', field_type: 'text', placeholder: '', tooltip: '', required: false, visible: true, options: [], icon: '', _options_text: '' });

  const saveField = async () => {
    if (!editing.label || !editing.field_key) { toast.error('Label and Field Key are required'); return; }
    const data = { ...editing, options: editing._options_text ? editing._options_text.split('\n').map(s => s.trim()).filter(Boolean) : [] };
    delete data._options_text;
    try {
      if (editing.id) {
        await enrollmentAPI.adminUpdateField(editing.id, data);
        toast.success('Field updated');
      } else {
        await enrollmentAPI.adminCreateField(data);
        toast.success('Field created');
      }
      setEditing(null);
      load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Save failed'); }
  };

  if (editing) {
    return (
      <div data-testid="enrollment-field-editor">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setEditing(null)} className="p-1.5 rounded hover:bg-slate-100"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-xl font-bold" style={{ color: 'var(--ad-heading, #1a2332)', fontFamily: 'Playfair Display, serif' }}>{editing.id ? 'Edit Field' : 'Add Field'}</h1>
        </div>
        <div className="bg-white rounded border p-6 space-y-5 max-w-2xl" style={{ borderColor: 'var(--ad-card-border, #e2e8f0)' }}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-slate-500">Step*</Label>
              <select value={editing.step} onChange={e => setEditing(p => ({ ...p, step: parseInt(e.target.value) }))} className={inputCls} data-testid="ef-step">
                {Object.entries(STEP_NAMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Field Type*</Label>
              <select value={editing.field_type} onChange={e => setEditing(p => ({ ...p, field_type: e.target.value }))} className={inputCls} data-testid="ef-type">
                {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-slate-500">Field Key* (unique identifier)</Label>
              <Input value={editing.field_key} onChange={e => setEditing(p => ({ ...p, field_key: e.target.value.replace(/\s/g, '_').toLowerCase() }))} placeholder="e.g. phone_number" data-testid="ef-key" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Label*</Label>
              <Input value={editing.label} onChange={e => setEditing(p => ({ ...p, label: e.target.value }))} placeholder="Display label" data-testid="ef-label" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-slate-500">Placeholder</Label>
              <Input value={editing.placeholder} onChange={e => setEditing(p => ({ ...p, placeholder: e.target.value }))} placeholder="If empty, won't appear" data-testid="ef-placeholder" />
            </div>
            <div>
              <Label className="text-xs text-slate-500">Tooltip / Help Text</Label>
              <Input value={editing.tooltip} onChange={e => setEditing(p => ({ ...p, tooltip: e.target.value }))} placeholder="Guidance for the user" data-testid="ef-tooltip" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-slate-500">Icon</Label>
            <select value={editing.icon || ''} onChange={e => setEditing(p => ({ ...p, icon: e.target.value }))} className={inputCls} data-testid="ef-icon">
              {ICON_OPTIONS.map(ic => <option key={ic.value} value={ic.value}>{ic.label}</option>)}
            </select>
          </div>
          {['select', 'radio', 'checkbox', 'rating_table', 'legal_checkbox'].includes(editing.field_type) && (
            <div>
              <Label className="text-xs text-slate-500">Options (one per line)</Label>
              <textarea value={editing._options_text} onChange={e => setEditing(p => ({ ...p, _options_text: e.target.value }))} rows={5} className={inputCls} placeholder="Option 1&#10;Option 2&#10;Option 3" data-testid="ef-options" />
            </div>
          )}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={editing.required} onChange={e => setEditing(p => ({ ...p, required: e.target.checked }))} className="accent-[#0D9488]" data-testid="ef-required" />
              Required field
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={editing.visible} onChange={e => setEditing(p => ({ ...p, visible: e.target.checked }))} className="accent-[#0D9488]" data-testid="ef-visible" />
              Visible on form
            </label>
          </div>
          {editing.field_type === 'number' || editing.field_type === 'text' || true ? (
            <div>
              <Label className="text-xs text-slate-500">Display Order</Label>
              <Input type="number" value={editing.order || ''} onChange={e => setEditing(p => ({ ...p, order: parseInt(e.target.value) || 0 }))} data-testid="ef-order" />
            </div>
          ) : null}
          <div className="flex gap-3 pt-2">
            <button onClick={saveField} className="px-5 py-2 rounded text-sm font-medium text-white flex items-center gap-2" style={{ backgroundColor: 'var(--ad-button-bg, #0D9488)' }} data-testid="ef-save">
              <Save className="w-4 h-4" /> {editing.id ? 'Update Field' : 'Create Field'}
            </button>
            <button onClick={() => setEditing(null)} className="px-5 py-2 rounded text-sm font-medium border border-slate-300 text-slate-600 hover:bg-slate-50">Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  const grouped = {};
  fields.forEach(f => {
    if (!grouped[f.step]) grouped[f.step] = [];
    grouped[f.step].push(f);
  });

  const handleDragEnd = async (event, step) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const stepFields = grouped[step] || [];
    const oldIndex = stepFields.findIndex(f => f.id === active.id);
    const newIndex = stepFields.findIndex(f => f.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(stepFields, oldIndex, newIndex);
    // Optimistic update
    setFields(prev => {
      const otherFields = prev.filter(f => f.step !== step);
      return [...otherFields, ...reordered.map((f, i) => ({ ...f, order: i + 1 }))];
    });
    try {
      await enrollmentAPI.adminReorderFields(reordered.map(f => f.id));
    } catch { toast.error('Failed to save order'); load(); }
  };

  return (
    <div data-testid="enrollment-fields-manager">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--ad-heading, #1a2332)', fontFamily: 'Playfair Display, serif' }}>Membership Enrollment</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b" style={{ borderColor: 'var(--ad-card-border, #e2e8f0)' }}>
        <button
          onClick={() => setActiveTab('fields')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'fields' ? 'border-[var(--ad-button-bg,#0D9488)] text-[var(--ad-button-bg,#0D9488)]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          data-testid="tab-fields"
        >
          <ListOrdered className="w-4 h-4" /> Form Fields
        </button>
        <button
          onClick={() => setActiveTab('step4')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'step4' ? 'border-[var(--ad-button-bg,#0D9488)] text-[var(--ad-button-bg,#0D9488)]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          data-testid="tab-step4-content"
        >
          <FileText className="w-4 h-4" /> Step 4 Content
        </button>
      </div>

      {/* Step 4 Content Tab */}
      {activeTab === 'step4' && (
        <div data-testid="step4-content-editor">
          {step4Loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
          ) : (
            <div className="bg-white rounded border p-6 space-y-5 max-w-3xl" style={{ borderColor: 'var(--ad-card-border, #e2e8f0)' }}>
              <p className="text-sm text-slate-500 mb-4">Customize the title and description that appear on Step 4 (Confirm & Submit) of the enrollment form.</p>
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">Title</Label>
                <Input
                  value={step4Content.title || ''}
                  onChange={e => setStep4Content(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Thank you for entering your information"
                  data-testid="step4-title-input"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">Description</Label>
                <RichTextEditor
                  value={step4Content.description || ''}
                  onChange={v => setStep4Content(p => ({ ...p, description: v }))}
                  placeholder="Enter description text for Step 4..."
                />
              </div>
              <div className="pt-2">
                <button
                  onClick={saveStep4Content}
                  disabled={step4Saving}
                  className="px-5 py-2 rounded text-sm font-medium text-white flex items-center gap-2 disabled:opacity-50"
                  style={{ backgroundColor: 'var(--ad-button-bg, #0D9488)' }}
                  data-testid="step4-save-btn"
                >
                  <Save className="w-4 h-4" /> {step4Saving ? 'Saving...' : 'Save Content'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Form Fields Tab */}
      {activeTab === 'fields' && (
        <>
          <div className="flex items-center justify-end mb-4">
            <button onClick={openNew} className="text-white px-4 py-2 rounded-sm text-sm font-medium flex items-center gap-2" style={{ backgroundColor: 'var(--ad-button-bg, #0D9488)' }} data-testid="ef-add-btn">
              <Plus className="w-4 h-4" /> Add Field
            </button>
          </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : (
        <div className="space-y-6">
          {[1, 2, 3, 4].map(step => {
            const stepFields = grouped[step] || [];
            const visibleCount = stepFields.filter(f => f.visible).length;
            const allVisible = stepFields.length > 0 && visibleCount === stepFields.length;
            const allHidden = stepFields.length > 0 && visibleCount === 0;
            return (
            <div key={step} className="bg-white rounded border" style={{ borderColor: 'var(--ad-card-border, #e2e8f0)' }}>
              <div className="px-5 py-3 border-b flex items-center justify-between flex-wrap gap-2" style={{ borderColor: 'var(--ad-card-border, #e2e8f0)', backgroundColor: 'var(--ad-table-header-bg, #f8fafc)' }}>
                <h2 className="font-semibold text-sm flex items-center gap-2" style={{ color: 'var(--ad-heading, #1a2332)' }}>
                  {STEP_NAMES[step]}
                  {allHidden && stepFields.length > 0 && (
                    <span className="text-[10px] uppercase tracking-wider bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded" title="This step will be skipped on the public enrollment flow because all its fields are hidden.">Skipped on public flow</span>
                  )}
                </h2>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">Drag to reorder</span>
                  <span className="px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--ad-badge-bg, #0D9488)', color: 'var(--ad-badge-text, #fff)' }}>
                    {visibleCount}/{stepFields.length} visible
                  </span>
                  {stepFields.length > 0 && (
                    <button
                      onClick={() => toggleStepVisibility(step, !allVisible)}
                      className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-100 transition-colors text-slate-600 font-medium"
                      data-testid={`step-${step}-bulk-toggle`}
                      title={allVisible ? 'Hide all fields in this step' : 'Show all fields in this step'}
                    >
                      {allVisible ? 'Hide All' : 'Show All'}
                    </button>
                  )}
                </div>
              </div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, step)}>
                <SortableContext items={stepFields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                  {stepFields.map(f => (
                    <SortableFieldRow key={f.id} field={f} onEdit={openEdit} onDelete={deleteField} onToggleVisibility={toggleVisibility} />
                  ))}
                </SortableContext>
              </DndContext>
              {stepFields.length === 0 && (
                <p className="px-5 py-4 text-sm text-slate-400">No fields in this step.</p>
              )}
            </div>
            );
          })}
        </div>
      )}
        </>
      )}
    </div>
  );
}
