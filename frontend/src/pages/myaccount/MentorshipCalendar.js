import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { memberAPI, publicAPI } from '../../lib/api';
import { normalizeRichText } from '../../lib/richText';
import { toast } from 'sonner';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Plus, Edit2, Trash2, Loader2, Calendar, Users, ChevronLeft, ChevronRight, Paperclip, Download, X, Video, FileText } from 'lucide-react';
import RichTextEditor from '../../components/RichTextEditor';
import SlotRecurrencePicker from '../../components/SlotRecurrencePicker';

const v = (name, fb) => `var(--ma-${name}, ${fb})`;
const API = process.env.REACT_APP_BACKEND_URL;
const SESSION_TYPES = ['One-on-One', 'Group'];
const SLOT_STATUSES = ['active', 'inactive', 'cancelled'];
const TIME_OPTIONS = [];
for (let h = 6; h <= 22; h++) { for (let m of ['00', '15', '30', '45']) { TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:${m}`); } }
const todayStr = () => new Date().toISOString().split('T')[0];

const slotColor = (slot) => {
  if (slot.status === 'inactive' || slot.status === 'cancelled') return '#6b7280';
  const isPast = slot.date < todayStr();
  if (isPast) return '#6b7280';
  const booked = slot.booked_count || 0;
  const max = slot.max_students || 1;
  if (slot.waitlist_count > 0) return '#38bdf8';
  if (booked >= max) return '#ef4444';
  if (booked > 0) return '#eab308';
  return '#22c55e';
};

export default function MentorshipCalendar() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewSlot, setViewSlot] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [paidEnabled, setPaidEnabled] = useState(false);
  const ctx = useOutletContext() || {};
  const title = ctx.sectionLabel ? ctx.sectionLabel('mentorship-calendar', 'My Calendar') : 'My Calendar';
  const [appliedTemplateId, setAppliedTemplateId] = useState('');

  const load = () => {
    setLoading(true);
    memberAPI.getMentorSlots().then(r => {
      const data = r.data || [];
      setSlots(data);
      // Update viewSlot if it exists
      if (viewSlot) {
        const updated = data.find(s => s.id === viewSlot.id);
        setViewSlot(updated || null);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  };
  useEffect(load, []); // eslint-disable-line
  useEffect(() => {
    memberAPI.getMentorSlotTemplates().then(r => setTemplates(r.data || [])).catch(() => setTemplates([]));
    publicAPI.getSettings().then(r => setPaidEnabled(r.data?.mentor_slots_paid_enabled === true)).catch(() => {});
  }, []);

  const addMinutes = (hhmm, mins) => {
    if (!hhmm) return '';
    const [h, m] = hhmm.split(':').map(Number);
    const total = h * 60 + m + mins;
    const newH = String(Math.floor(total / 60) % 24).padStart(2, '0');
    const newM = String(total % 60).padStart(2, '0');
    return `${newH}:${newM}`;
  };

  const applyTemplate = (tplId) => {
    const t = templates.find(x => x.id === tplId);
    if (!t || !editing) return;
    setEditing(p => ({
      ...p,
      title: t.title || p.title,
      session_type: t.session_type || p.session_type,
      max_students: t.max_students || p.max_students,
      description: t.description || p.description,
      virtual_link: t.virtual_link || p.virtual_link,
      end_time: p.start_time && t.default_duration_minutes ? addMinutes(p.start_time, t.default_duration_minutes) : p.end_time,
    }));
    toast.success(`Applied template "${t.name}"`);
  };

  const handleSave = async () => {
    if (!editing.date || !editing.start_time || !editing.end_time) { toast.error('Date and times required'); return; }
    setSaving(true);
    try {
      if (editing.id) {
        const r = await memberAPI.updateMentorSlot(editing.id, editing);
        setViewSlot(r.data);
        toast.success('Saved!');
      } else {
        const r = await memberAPI.createMentorSlot(editing);
        if (r.data?.count && r.data.count > 1) {
          toast.success(`Created ${r.data.count} slots`);
        } else {
          toast.success('Saved!');
        }
      }
      setOpen(false); load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this slot and all bookings?')) return;
    try { await memberAPI.deleteMentorSlot(id); toast.success('Deleted'); setViewSlot(null); load(); } catch { toast.error('Error'); }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const newAtts = [...(editing.attachments || [])];
    for (const file of files) {
      try {
        const r = await memberAPI.uploadFile(file);
        newAtts.push({ url: r.data.url, name: r.data.original_name, size: r.data.size, content_type: r.data.content_type });
      } catch { toast.error(`Failed to upload ${file.name}`); }
    }
    setEditing(prev => ({ ...prev, attachments: newAtts }));
    setUploading(false);
    e.target.value = '';
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthLabel = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const getSlotsForDay = (day) => {
    if (!day) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return slots.filter(s => s.date === dateStr);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" style={{ color: v('accent', '#c9a84c') }} /></div>;

  const selectStyle = { backgroundColor: v('input-bg', '#0d0f14'), border: `1px solid ${v('input-border', 'rgba(255,255,255,0.1)')}`, color: v('text-primary', '#fff'), appearance: 'auto' };

  return (
    <div data-testid="mentorship-calendar-page">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: v('text-primary', '#fff'), fontFamily: "'DM Serif Display', serif" }} data-testid="mentorship-calendar-title">{title}</h1>
        <button onClick={() => { setAppliedTemplateId(''); setEditing({ title: '', date: '', start_time: '', end_time: '', session_type: 'One-on-One', max_students: 1, description: '', status: 'active', virtual_link: '', attachments: [] }); setOpen(true); }} className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium"
          style={{ backgroundColor: v('button-bg', '#c9a84c'), color: v('button-text', '#0d0f14') }} data-testid="add-slot-btn">
          <Plus className="w-4 h-4" /> Add Slot
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4">
        {[{ c: '#22c55e', l: 'Available' }, { c: '#eab308', l: 'Partially Booked' }, { c: '#ef4444', l: 'Fully Booked' }, { c: '#38bdf8', l: 'Waiting List' }, { c: '#6b7280', l: 'Past / Inactive' }].map(lg => (
          <div key={lg.l} className="flex items-center gap-1.5 text-xs" style={{ color: v('text-secondary', '#9ca3af') }}>
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: lg.c }} /> {lg.l}
          </div>
        ))}
      </div>

      {/* Month Nav */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-2 rounded" style={{ color: v('text-secondary', '#9ca3af') }}><ChevronLeft className="w-5 h-5" /></button>
        <h2 className="text-lg font-semibold" style={{ color: v('text-primary', '#fff') }}>{monthLabel}</h2>
        <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-2 rounded" style={{ color: v('text-secondary', '#9ca3af') }}><ChevronRight className="w-5 h-5" /></button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-px rounded-lg overflow-hidden" style={{ backgroundColor: v('card-border', 'rgba(255,255,255,0.05)') }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="p-2 text-center text-xs font-medium" style={{ backgroundColor: v('card-bg', '#13161e'), color: v('text-secondary', '#9ca3af') }}>{d}</div>
        ))}
        {days.map((day, i) => {
          const daySlots = getSlotsForDay(day);
          return (
            <div key={i} className="min-h-[80px] p-1.5" style={{ backgroundColor: day ? v('card-bg', '#13161e') : 'transparent' }}>
              {day && (
                <>
                  <span className="text-xs font-medium" style={{ color: v('text-primary', '#fff') }}>{day}</span>
                  {daySlots.map(s => (
                    <div key={s.id} className="mt-0.5 px-1.5 py-0.5 rounded text-[10px] truncate cursor-pointer"
                      onClick={() => setViewSlot(s)}
                      style={{ backgroundColor: slotColor(s) + '20', color: slotColor(s), borderLeft: `2px solid ${slotColor(s)}` }}
                      data-testid={`slot-${s.id}`}>
                      {s.title ? s.title : `${s.start_time}-${s.end_time}`}
                    </div>
                  ))}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Slot Details Card */}
      {viewSlot && (() => {
        const isPast = viewSlot.date < todayStr();
        return (
          <div className="mt-4 p-4 rounded-lg border" style={{ backgroundColor: v('card-bg', '#13161e'), borderColor: v('card-border', 'rgba(255,255,255,0.05)') }} data-testid="slot-detail-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm" style={{ color: v('text-primary', '#fff') }}>
                {viewSlot.title && <span className="block">{viewSlot.title}</span>}
                <span className="text-xs font-normal" style={{ color: v('text-secondary', '#9ca3af') }}>{viewSlot.date} &middot; {viewSlot.start_time} - {viewSlot.end_time}</span>
              </h3>
              {!isPast && viewSlot.status !== 'cancelled' && (
                <div className="flex gap-1">
                  <button onClick={() => { setEditing({ ...viewSlot }); setOpen(true); }} className="p-1.5 rounded" style={{ color: v('accent', '#c9a84c') }}><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => { handleDelete(viewSlot.id); }} className="p-1.5 rounded text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              )}
              {isPast && <span className="text-xs px-2 py-0.5 rounded bg-gray-500/20 text-gray-400">Past</span>}
            </div>
            <div className="text-xs space-y-1 mb-3" style={{ color: v('text-secondary', '#9ca3af') }}>
              <p>Type: {viewSlot.session_type} &middot; Max: {viewSlot.max_students} &middot; Booked: {viewSlot.booked_count || 0} &middot; Waitlist: {viewSlot.waitlist_count || 0}</p>
              <p>Status: <span style={{ color: slotColor(viewSlot) }}>{viewSlot.status}</span></p>
              {viewSlot.virtual_link && <a href={viewSlot.virtual_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:opacity-80" style={{ color: v('accent', '#c9a84c') }}><Video className="w-3 h-3" /> Virtual Link</a>}
              {viewSlot.description && <div className="pt-1 rich-text-content [&_p]:!text-inherit [&_p]:!mb-1 [&_ul]:!text-inherit [&_ol]:!text-inherit" dangerouslySetInnerHTML={{ __html: normalizeRichText(viewSlot.description) }} />}
            </div>
            {/* Attachments */}
            {(viewSlot.attachments || []).length > 0 && (
              <div className="mb-3 space-y-1">
                {viewSlot.attachments.map((att, idx) => (
                  <a key={idx} href={`${API}${att.url}`} target="_blank" rel="noopener noreferrer" download={att.name} className="flex items-center gap-2 px-2 py-1 rounded text-xs hover:opacity-80" style={{ backgroundColor: v('input-bg', '#0d0f14'), color: v('text-secondary', '#9ca3af') }}>
                    <Paperclip className="w-3 h-3" style={{ color: v('accent', '#c9a84c') }} /><span className="truncate flex-1">{att.name}</span><Download className="w-3 h-3" />
                  </a>
                ))}
              </div>
            )}
            {/* Participants */}
            {(viewSlot.participants || []).length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1.5" style={{ color: v('text-primary', '#fff') }}>Participants</p>
                <div className="space-y-1">
                  {viewSlot.participants.map(p => (
                    <div key={p.member_id} className="flex items-center gap-2 px-2 py-1.5 rounded text-xs" style={{ backgroundColor: v('input-bg', '#0d0f14') }}>
                      <Users className="w-3 h-3 flex-shrink-0" style={{ color: p.status === 'booked' ? '#22c55e' : '#38bdf8' }} />
                      <span className="flex-1" style={{ color: v('text-primary', '#fff') }}>{p.name}</span>
                      <span className="text-[10px]" style={{ color: v('text-muted', '#6b7280') }}>{p.membership_id}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${p.status === 'booked' ? 'bg-green-500/15 text-green-400' : 'bg-blue-500/15 text-blue-400'}`}>{p.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Add/Edit Slot Dialog */}
      <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) setEditing(null); }}>
        <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto" style={{ backgroundColor: v('card-bg', '#13161e'), color: v('text-primary', '#fff'), borderColor: v('card-border', 'rgba(255,255,255,0.1)') }}>
          <DialogHeader><DialogTitle style={{ fontFamily: "'DM Serif Display', serif", color: v('text-primary', '#fff') }}>{editing?.id ? 'Edit' : 'New'} Slot</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              {templates.length > 0 && !editing.id && (
                <div>
                  <Label className="text-xs" style={{ color: v('text-secondary', '#9ca3af') }}>Apply Template</Label>
                  <select
                    value={appliedTemplateId}
                    onChange={e => {
                      const tplId = e.target.value;
                      setAppliedTemplateId(tplId);
                      if (tplId) applyTemplate(tplId);
                    }}
                    className="w-full mt-1 px-3 py-2 rounded text-sm"
                    style={selectStyle}
                    data-testid="slot-apply-template"
                  >
                    <option value="">Select a template to pre-fill…</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.default_duration_minutes} min)</option>)}
                  </select>
                </div>
              )}
              <div><Label className="text-xs" style={{ color: v('text-secondary', '#9ca3af') }}>Title</Label>
                <Input value={editing?.title || ''} onChange={e => setEditing(p => ({ ...p, title: e.target.value }))} className="mt-1" placeholder="e.g. Portfolio Analysis Session" style={{ backgroundColor: v('input-bg', '#0d0f14'), borderColor: v('input-border', 'rgba(255,255,255,0.1)'), color: v('text-primary', '#fff') }} data-testid="slot-title" /></div>
              <div><Label className="text-xs" style={{ color: v('text-secondary', '#9ca3af') }}>Date *</Label>
                <Input type="date" value={editing.date || ''} onChange={e => setEditing(p => ({ ...p, date: e.target.value }))} className="mt-1" style={{ backgroundColor: v('input-bg', '#0d0f14'), borderColor: v('input-border', 'rgba(255,255,255,0.1)'), color: v('text-primary', '#fff') }} data-testid="slot-date" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs" style={{ color: v('text-secondary', '#9ca3af') }}>Start *</Label>
                  <Input type="time" value={editing.start_time || ''} onChange={e => setEditing(p => ({ ...p, start_time: e.target.value }))} className="mt-1" style={{ backgroundColor: v('input-bg', '#0d0f14'), borderColor: v('input-border', 'rgba(255,255,255,0.1)'), color: v('text-primary', '#fff') }} data-testid="slot-start" /></div>
                <div><Label className="text-xs" style={{ color: v('text-secondary', '#9ca3af') }}>End *</Label>
                  <Input type="time" value={editing.end_time || ''} onChange={e => setEditing(p => ({ ...p, end_time: e.target.value }))} className="mt-1" style={{ backgroundColor: v('input-bg', '#0d0f14'), borderColor: v('input-border', 'rgba(255,255,255,0.1)'), color: v('text-primary', '#fff') }} data-testid="slot-end" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label className="text-xs" style={{ color: v('text-secondary', '#9ca3af') }}>Type *</Label>
                  <select value={editing.session_type || 'One-on-One'} onChange={e => { const val = e.target.value; setEditing(p => ({ ...p, session_type: val, max_students: val === 'One-on-One' ? 1 : p.max_students })); }} className="w-full mt-1 px-3 py-2 rounded text-sm" style={selectStyle} data-testid="slot-type">
                    {SESSION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select></div>
                <div><Label className="text-xs" style={{ color: v('text-secondary', '#9ca3af') }}>Max Students *</Label>
                  <Input type="number" min={1} value={editing.max_students || 1} onChange={e => setEditing(p => ({ ...p, max_students: parseInt(e.target.value) || 1 }))} className="mt-1" style={{ backgroundColor: v('input-bg', '#0d0f14'), borderColor: v('input-border', 'rgba(255,255,255,0.1)'), color: v('text-primary', '#fff') }} disabled={editing.session_type === 'One-on-One'} data-testid="slot-max" /></div>
                <div><Label className="text-xs" style={{ color: v('text-secondary', '#9ca3af') }}>Status</Label>
                  <select value={editing.status || 'active'} onChange={e => setEditing(p => ({ ...p, status: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded text-sm" style={selectStyle}>
                    {SLOT_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select></div>
              </div>
              <div><Label className="text-xs" style={{ color: v('text-secondary', '#9ca3af') }}>Virtual Link</Label>
                <Input value={editing.virtual_link || ''} onChange={e => setEditing(p => ({ ...p, virtual_link: e.target.value }))} className="mt-1" placeholder="https://zoom.us/..." style={{ backgroundColor: v('input-bg', '#0d0f14'), borderColor: v('input-border', 'rgba(255,255,255,0.1)'), color: v('text-primary', '#fff') }} data-testid="slot-virtual-link" /></div>
              {paidEnabled && (
                <div className="p-3 rounded" style={{ backgroundColor: v('input-bg', '#0d0f14'), border: `1px solid ${v('input-border', 'rgba(255,255,255,0.1)')}` }}>
                  <Label className="text-xs font-medium" style={{ color: v('text-secondary', '#9ca3af') }}>Price (USD)</Label>
                  <p className="text-[11px] mb-1.5" style={{ color: v('text-muted', '#6b7280') }}>Leave blank or 0 for a free session. Paid sessions require member checkout via Stripe.</p>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={((editing.price_cents || 0) / 100).toFixed(2)}
                    onChange={e => setEditing(p => ({ ...p, price_cents: Math.max(0, Math.round(parseFloat(e.target.value || '0') * 100)) }))}
                    placeholder="0.00"
                    className="mt-1 max-w-[140px]"
                    style={{ backgroundColor: v('card-bg', '#13161e'), borderColor: v('input-border', 'rgba(255,255,255,0.1)'), color: v('text-primary', '#fff') }}
                    data-testid="slot-price-input"
                  />
                </div>
              )}
              <div><Label className="text-xs" style={{ color: v('text-secondary', '#9ca3af') }}>Description</Label>
                <div className="mt-1 ma-quill-dark rounded" data-testid="slot-description-editor">
                  <RichTextEditor value={editing.description || ''} onChange={val => setEditing(p => ({ ...p, description: val }))} placeholder="Optional notes visible to students" />
                </div></div>
              {/* Attachments */}
              <div>
                <Label className="text-xs" style={{ color: v('text-secondary', '#9ca3af') }}>Attachments</Label>
                <div className="mt-1 space-y-1.5">
                  {(editing.attachments || []).map((att, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded text-xs" style={{ backgroundColor: v('input-bg', '#0d0f14'), border: `1px solid ${v('input-border', 'rgba(255,255,255,0.1)')}` }}>
                      <FileText className="w-3.5 h-3.5 flex-shrink-0" style={{ color: v('accent', '#c9a84c') }} />
                      <span className="flex-1 truncate" style={{ color: v('text-primary', '#fff') }}>{att.name}</span>
                      <button onClick={() => setEditing(p => ({ ...p, attachments: p.attachments.filter((_, i) => i !== idx) }))} className="p-0.5 text-red-400"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                  <label className="flex items-center gap-2 px-3 py-2 border border-dashed rounded cursor-pointer transition-colors" style={{ borderColor: v('input-border', 'rgba(255,255,255,0.1)'), color: v('text-muted', '#6b7280') }}>
                    {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
                    <span className="text-xs">{uploading ? 'Uploading...' : 'Add files'}</span>
                    <input type="file" multiple accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip,.jpg,.png" onChange={handleFileUpload} className="hidden" disabled={uploading} />
                  </label>
                </div>
              </div>
              {!editing.id && (
                <SlotRecurrencePicker
                  value={editing.recurrence}
                  onChange={val => setEditing(p => ({ ...p, recurrence: val }))}
                  baseDate={editing.date}
                  dark
                />
              )}
              <button onClick={handleSave} disabled={saving} className="w-full py-2 rounded text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50" style={{ backgroundColor: v('button-bg', '#c9a84c'), color: v('button-text', '#0d0f14') }} data-testid="slot-save-btn">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />} {editing?.id ? 'Update' : 'Create'} Slot
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
