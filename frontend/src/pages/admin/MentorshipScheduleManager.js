import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Plus, Edit2, Trash2, Loader2, Users, Calendar, ArrowLeft, ChevronLeft, ChevronRight, List, Grid3X3 } from 'lucide-react';
import RichTextEditor from '../../components/RichTextEditor';
import SlotRecurrencePicker from '../../components/SlotRecurrencePicker';
import { useDataTable, DataTableToolbar, DataTablePagination, SortableTh } from '../../components/admin/useDataTable';

const SESSION_TYPES = ['One-on-One', 'Group'];
const STATUSES = ['active', 'inactive', 'cancelled'];
const inputCls = "w-full border rounded-sm px-3 py-2 text-sm focus:ring-1 focus:ring-[#0D9488] focus:border-[#0D9488]";
const TIME_OPTIONS = [];
for (let h = 6; h <= 22; h++) { for (let m of ['00', '15', '30', '45']) { TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:${m}`); } }

const slotStatusColors = {
  active: 'bg-green-50 text-green-700',
  inactive: 'bg-slate-100 text-slate-500',
};

export default function MentorshipScheduleManager() {
  const [slots, setSlots] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewBookings, setViewBookings] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [templates, setTemplates] = useState([]);
  const [templatesEnabled, setTemplatesEnabled] = useState(false);
  const [paidEnabled, setPaidEnabled] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      adminAPI.getMentorshipSlots(),
      adminAPI.getMentors(),
    ]).then(([slotsR, mentorsR]) => {
      setSlots(slotsR.data || []);
      setMentors(mentorsR.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };
  useEffect(load, []);
  useEffect(() => {
    adminAPI.getSettings().then(r => { setTemplatesEnabled(r.data?.mentor_slot_templates_enabled === true); setPaidEnabled(r.data?.mentor_slots_paid_enabled === true); }).catch(() => {});
    adminAPI.getMentorSlotTemplates().then(r => setTemplates(r.data || [])).catch(() => setTemplates([]));
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
    if (!editing.mentor_id || !editing.date || !editing.start_time || !editing.end_time) {
      toast.error('Mentor, Date, Start Time, and End Time are required'); return;
    }
    setSaving(true);
    try {
      if (editing.id) {
        await adminAPI.updateMentorshipSlot(editing.id, editing);
        toast.success('Saved!');
      } else {
        const r = await adminAPI.createMentorshipSlot(editing);
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
    try { await adminAPI.deleteMentorshipSlot(id); toast.success('Deleted'); load(); } catch { toast.error('Error'); }
  };

  const openBookings = async (slot) => {
    setViewBookings(slot);
    setBookingsLoading(true);
    try { const r = await adminAPI.getSlotBookings(slot.id); setBookings(r.data || []); }
    catch { setBookings([]); }
    setBookingsLoading(false);
  };

  const dt = useDataTable(slots, {
    searchAccessor: s => `${s.mentor_name || ''} ${s.mentor_membership_id || ''} ${s.title || ''} ${s.session_type || ''} ${s.status || ''}`,
    defaultSort: { key: 'date', dir: 'desc' },
    storageKey: 'mentorship-slots',
  });

  // Bookings View
  if (viewBookings) {
    return (
      <div data-testid="slot-bookings-view">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setViewBookings(null)} className="p-1.5 rounded hover:bg-slate-100"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--ad-heading, #1a2332)', fontFamily: 'Playfair Display, serif' }}>
              Bookings: {viewBookings.mentor_name}
            </h1>
            <p className="text-xs text-slate-500">{viewBookings.date} &middot; {viewBookings.start_time} - {viewBookings.end_time} &middot; {viewBookings.session_type}</p>
          </div>
        </div>
        {bookingsLoading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div> : (
          <div className="bg-white rounded border overflow-x-auto" style={{ borderColor: 'var(--ad-card-border, #e2e8f0)' }}>
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-slate-50">
                <th className="text-left p-3 font-medium text-slate-600">#</th>
                <th className="text-left p-3 font-medium text-slate-600">Membership ID</th>
                <th className="text-left p-3 font-medium text-slate-600">Name</th>
                <th className="text-left p-3 font-medium text-slate-600">Email</th>
                <th className="text-left p-3 font-medium text-slate-600">Booked At</th>
                <th className="text-left p-3 font-medium text-slate-600">Status</th>
              </tr></thead>
              <tbody>
                {bookings.map((b, i) => (
                  <tr key={b.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="p-3 text-slate-400">{i + 1}</td>
                    <td className="p-3 font-mono text-[#0D9488]">{b.membership_id || '-'}</td>
                    <td className="p-3 text-[#1a2332]">{b.name || '-'}</td>
                    <td className="p-3 text-slate-500">{b.email || '-'}</td>
                    <td className="p-3 text-slate-400 text-xs">{b.booked_at ? new Date(b.booked_at).toLocaleString() : '-'}</td>
                    <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded font-medium ${b.status === 'booked' ? 'bg-green-50 text-green-700' : b.status === 'waitlist' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>{b.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {bookings.length === 0 && <p className="p-8 text-center text-slate-400 text-sm">No bookings yet</p>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div data-testid="mentorship-schedule-manager">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--ad-heading, #1a2332)', fontFamily: 'Playfair Display, serif' }}>Mentorship Schedule</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded p-0.5 bg-slate-100">
            <button onClick={() => setViewMode('list')} className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium ${viewMode === 'list' ? 'bg-[#0D9488] text-white' : 'text-slate-500'}`} data-testid="cms-slot-list-view"><List className="w-3 h-3" /> List</button>
            <button onClick={() => setViewMode('calendar')} className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium ${viewMode === 'calendar' ? 'bg-[#0D9488] text-white' : 'text-slate-500'}`} data-testid="cms-slot-cal-view"><Grid3X3 className="w-3 h-3" /> Calendar</button>
          </div>
          <button onClick={() => { setEditing({ mentor_id: '', title: '', date: '', start_time: '', end_time: '', session_type: 'One-on-One', max_students: 1, description: '', status: 'active', virtual_link: '' }); setOpen(true); }}
            className="text-white px-4 py-2 rounded-sm text-sm font-medium flex items-center gap-2" style={{ backgroundColor: 'var(--ad-button-bg, #0D9488)' }} data-testid="add-slot-btn">
            <Plus className="w-4 h-4" /> Add Slot
          </button>
        </div>
      </div>

      {mentors.length === 0 && !loading && (
        <div className="mb-4 p-3 rounded border bg-amber-50 border-amber-200 text-amber-700 text-xs">
          No mentors found. Create a Member Type with "Mentor" permission enabled and assign it to members first.
        </div>
      )}

      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div> : viewMode === 'calendar' ? (() => {
        const year = currentDate.getFullYear(); const mo = currentDate.getMonth();
        const firstDay = new Date(year, mo, 1).getDay();
        const daysInMonth = new Date(year, mo + 1, 0).getDate();
        const days = []; for (let i = 0; i < firstDay; i++) days.push(null); for (let d = 1; d <= daysInMonth; d++) days.push(d);
        const monthLabel = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
        const getSlotsForDay = (day) => { if (!day) return []; const ds = `${year}-${String(mo+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`; return slots.filter(s => s.date === ds); };
        const todayD = new Date().toISOString().split('T')[0];
        const sc = (s) => { if (s.status === 'cancelled' || s.status === 'inactive' || s.date < todayD) return '#6b7280'; return '#22c55e'; };
        return (
          <>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCurrentDate(new Date(year, mo-1, 1))} className="p-1.5 rounded hover:bg-slate-100"><ChevronLeft className="w-5 h-5 text-slate-400" /></button>
              <h2 className="text-sm font-semibold text-[#1a2332]">{monthLabel}</h2>
              <button onClick={() => setCurrentDate(new Date(year, mo+1, 1))} className="p-1.5 rounded hover:bg-slate-100"><ChevronRight className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="grid grid-cols-7 gap-px rounded-lg overflow-hidden bg-slate-200">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="p-2 text-center text-xs font-medium bg-slate-50 text-slate-500">{d}</div>)}
              {days.map((day, i) => {
                const ds = getSlotsForDay(day);
                return <div key={i} className="min-h-[80px] p-1.5 bg-white">
                  {day && <><span className="text-xs font-medium text-[#1a2332]">{day}</span>
                    {ds.map(s => <div key={s.id} className="mt-0.5 px-1.5 py-0.5 rounded text-[10px] truncate cursor-pointer" onClick={() => openBookings(s)} style={{ backgroundColor: sc(s)+'20', color: sc(s), borderLeft: `2px solid ${sc(s)}` }}>{s.title || s.mentor_name?.split(' ')[0]} {s.start_time}</div>)}
                  </>}
                </div>;
              })}
            </div>
          </>
        );
      })() : (
        <>
        <DataTableToolbar dt={dt} testId="mslots" placeholder="Search by mentor, title, type…" />
        <div className="bg-white rounded border overflow-x-auto" style={{ borderColor: 'var(--ad-card-border, #e2e8f0)' }}>
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-slate-50">
              <th className="text-left p-3 font-medium text-slate-600">No.</th>
              <SortableTh dt={dt} field="mentor_name">Mentor</SortableTh>
              <SortableTh dt={dt} field="title">Title</SortableTh>
              <SortableTh dt={dt} field="date">Date</SortableTh>
              <SortableTh dt={dt} field="start_time">Time</SortableTh>
              <SortableTh dt={dt} field="session_type">Type</SortableTh>
              <SortableTh dt={dt} field="max_students">Max</SortableTh>
              <SortableTh dt={dt} field="booked_count">Booked</SortableTh>
              <SortableTh dt={dt} field="waitlist_count">Waitlist</SortableTh>
              <SortableTh dt={dt} field="status">Status</SortableTh>
              <th className="text-right p-3 font-medium text-slate-600">Actions</th>
            </tr></thead>
            <tbody>
              {dt.visibleItems.map((s, i) => {
                const rowNum = (dt.page - 1) * dt.pageSize + i + 1;
                return (
                <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50" data-testid={`mslot-row-${s.id}`}>
                  <td className="p-3 text-slate-400">{rowNum}</td>
                  <td className="p-3">
                    <span className="text-[#1a2332] font-medium">{s.mentor_name || '-'}</span>
                    {s.mentor_membership_id && <span className="block text-xs text-[#0D9488]">{s.mentor_membership_id}</span>}
                  </td>
                  <td className="p-3 text-[#1a2332] text-xs font-medium">{s.title || '-'}</td>
                  <td className="p-3 text-slate-500 text-xs">{s.date}</td>
                  <td className="p-3 text-slate-500 text-xs">{s.start_time} - {s.end_time}</td>
                  <td className="p-3 text-slate-500 text-xs">{s.session_type}</td>
                  <td className="p-3 text-slate-500">{s.max_students}</td>
                  <td className="p-3 font-semibold text-[#0D9488]">{s.booked_count || 0}</td>
                  <td className="p-3 text-blue-500">{s.waitlist_count || 0}</td>
                  <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded font-medium ${slotStatusColors[s.status] || ''}`}>{s.status}</span></td>
                  <td className="p-3 text-right">
                    <button onClick={() => openBookings(s)} className="p-1.5 text-slate-400 hover:text-[#0D9488]" title="View Bookings"><Users className="w-4 h-4" /></button>
                    <button onClick={() => { setEditing({ ...s }); setOpen(true); }} className="p-1.5 text-slate-400 hover:text-[#0D9488]"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(s.id)} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
          {dt.totalAll === 0 && <p className="p-8 text-center text-slate-400 text-sm">No mentorship slots yet. Click "Add Slot" to create one.</p>}
          {dt.totalAll > 0 && dt.totalFiltered === 0 && <p className="p-8 text-center text-slate-400 text-sm">No slots match your search.</p>}
          <DataTablePagination dt={dt} testId="mslots" />
        </div>
        </>
      )}

      {/* Slot Editor Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px]" data-testid="slot-dialog">
          <DialogHeader><DialogTitle style={{ fontFamily: 'Playfair Display, serif' }}>{editing?.id ? 'Edit' : 'New'} Mentorship Slot</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              {templatesEnabled && templates.length > 0 && !editing.id && (
                <div className="p-3 rounded bg-slate-50 border border-slate-200">
                  <Label className="text-xs font-medium">Apply Template</Label>
                  <p className="text-[11px] text-slate-400 mb-1.5">Pre-fill title, type, duration, description, and virtual link from a saved template.</p>
                  <select onChange={e => { if (e.target.value) { applyTemplate(e.target.value); e.target.value = ''; } }} className={inputCls} data-testid="admin-slot-apply-template" defaultValue="">
                    <option value="">Select a template…</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.default_duration_minutes} min)</option>)}
                  </select>
                </div>
              )}
              <div>
                <Label className="text-xs">Mentor *</Label>
                <select value={editing.mentor_id} onChange={e => setEditing({ ...editing, mentor_id: e.target.value })} className={inputCls + " mt-1"} data-testid="slot-mentor">
                  <option value="">Select mentor...</option>
                  {mentors.map(m => <option key={m.member_id} value={m.member_id}>{m.membership_id} - {m.first_name} {m.last_name}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs">Title</Label>
                <Input value={editing.title || ''} onChange={e => setEditing({ ...editing, title: e.target.value })} className="mt-1" placeholder="e.g. Portfolio Analysis Session" data-testid="slot-title" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label className="text-xs">Date *</Label><Input type="date" value={editing.date} onChange={e => setEditing({ ...editing, date: e.target.value })} className="mt-1" data-testid="slot-date" /></div>
                <div><Label className="text-xs">Start *</Label>
                  <Input type="time" value={editing.start_time} onChange={e => setEditing({ ...editing, start_time: e.target.value })} className="mt-1" data-testid="slot-start" /></div>
                <div><Label className="text-xs">End *</Label>
                  <Input type="time" value={editing.end_time} onChange={e => setEditing({ ...editing, end_time: e.target.value })} className="mt-1" data-testid="slot-end" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label className="text-xs">Session Type *</Label>
                  <select value={editing.session_type} onChange={e => setEditing({ ...editing, session_type: e.target.value })} className={inputCls + " mt-1"} data-testid="slot-type">
                    {SESSION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div><Label className="text-xs">Max Students *</Label><Input type="number" value={editing.max_students} onChange={e => setEditing({ ...editing, max_students: parseInt(e.target.value) || 1 })} className="mt-1" data-testid="slot-max" /></div>
                <div><Label className="text-xs">Status *</Label>
                  <select value={editing.status} onChange={e => setEditing({ ...editing, status: e.target.value })} className={inputCls + " mt-1"}>
                    {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div><Label className="text-xs">Description</Label>
                <div className="mt-1" data-testid="slot-description-editor">
                  <RichTextEditor value={editing.description || ''} onChange={val => setEditing({ ...editing, description: val })} placeholder="Optional notes visible to students" />
                </div></div>
              <div><Label className="text-xs">Virtual Link</Label>
                <Input value={editing.virtual_link || ''} onChange={e => setEditing({ ...editing, virtual_link: e.target.value })} className="mt-1" placeholder="https://zoom.us/..." data-testid="slot-virtual-link" /></div>
              {paidEnabled && (
                <div className="p-3 rounded-sm bg-slate-50 border border-slate-200">
                  <Label className="text-xs font-medium">Price (USD)</Label>
                  <p className="text-[11px] text-slate-400 mb-1.5">Leave blank or 0 for a free slot. Paid slots require Stripe checkout.</p>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={((editing.price_cents || 0) / 100).toFixed(2)}
                    onChange={e => setEditing({ ...editing, price_cents: Math.max(0, Math.round(parseFloat(e.target.value || '0') * 100)) })}
                    placeholder="0.00"
                    className="mt-1 max-w-[140px]"
                    data-testid="slot-price-input"
                  />
                </div>
              )}
              {!editing.id && (
                <SlotRecurrencePicker
                  value={editing.recurrence}
                  onChange={val => setEditing({ ...editing, recurrence: val })}
                  baseDate={editing.date}
                />
              )}
              <button onClick={handleSave} disabled={saving} className="w-full py-2 rounded-sm text-sm font-medium text-white flex items-center justify-center gap-2 disabled:opacity-50" style={{ backgroundColor: 'var(--ad-button-bg, #0D9488)' }} data-testid="slot-save-btn">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />} {editing.id ? 'Update' : 'Create'} Slot
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
