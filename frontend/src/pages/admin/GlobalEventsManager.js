import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Plus, Edit2, Trash2, Loader2, Eye, Calendar, Users, Download, ArrowLeft, Paperclip, FileText, X, Copy, ChevronLeft, ChevronRight, List, Grid3X3 } from 'lucide-react';
import RichTextEditor from '../../components/RichTextEditor';
import ImageUpload from '../../components/ImageUpload';
import { useDataTable, DataTableToolbar, DataTablePagination, SortableTh } from '../../components/admin/useDataTable';

const EVENT_TYPES = ['Activity', 'Meeting', 'Conference', 'Talk', 'Other'];
const STATUSES = ['active', 'inactive', 'cancelled'];
const TIMEZONES = ['UTC', 'US/Eastern', 'US/Central', 'US/Mountain', 'US/Pacific', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo', 'America/Sao_Paulo'];

const emptyEvent = {
  title: '', type: 'Activity', description: '', date: '', start_time: '', end_time: '',
  timezone: 'US/Eastern', location: '', map_url: '', virtual_link: '', max_capacity: 50, image: '', status: 'active', attachments: [],
};

const inputCls = "w-full border rounded-sm px-3 py-2 text-sm focus:ring-1 focus:ring-[#0D9488] focus:border-[#0D9488]";
const statusColors = { active: 'bg-green-50 text-green-700', inactive: 'bg-slate-100 text-slate-500', cancelled: 'bg-red-50 text-red-700' };

export default function GlobalEventsManager() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewRegs, setViewRegs] = useState(null);
  const [regs, setRegs] = useState([]);
  const [regsLoading, setRegsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [currentDate, setCurrentDate] = useState(new Date());

  const load = () => {
    setLoading(true);
    adminAPI.getCalendarEvents().then(r => { setEvents(r.data || []); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(load, []);

  const handleSave = async () => {
    if (!editing.title || !editing.date || !editing.start_time || !editing.end_time) {
      toast.error('Title, Date, Start Time, and End Time are required'); return;
    }
    setSaving(true);
    try {
      if (editing.id) await adminAPI.updateCalendarEvent(editing.id, editing);
      else await adminAPI.createCalendarEvent(editing);
      toast.success('Saved!'); setOpen(false); load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this event and all registrations?')) return;
    try { await adminAPI.deleteCalendarEvent(id); toast.success('Deleted'); load(); } catch { toast.error('Error'); }
  };

  const handleClone = async (id) => {
    try { await adminAPI.cloneCalendarEvent(id); toast.success('Event cloned (Inactive)'); load(); } catch { toast.error('Error cloning'); }
  };

  const handleExportCSV = async (eventId) => {
    try {
      const r = await adminAPI.getEventRegistrationsCSV(eventId);
      const url = window.URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement('a'); a.href = url; a.download = `event_${eventId}_registrations.csv`; a.click();
      window.URL.revokeObjectURL(url);
    } catch { toast.error('CSV export failed'); }
  };

  const openRegistrations = async (event) => {
    setViewRegs(event);
    setRegsLoading(true);
    try {
      const r = await adminAPI.getEventRegistrations(event.id);
      setRegs(r.data || []);
    } catch { setRegs([]); }
    setRegsLoading(false);
  };

  const API = process.env.REACT_APP_BACKEND_URL;

  const dt = useDataTable(events, {
    searchAccessor: e => `${e.title || ''} ${e.type || ''} ${e.location || ''} ${e.status || ''}`,
    defaultSort: { key: 'date', dir: 'desc' },
    storageKey: 'global-events',
  });

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const newAttachments = [...(editing.attachments || [])];
    for (const file of files) {
      try {
        const r = await adminAPI.uploadFile(file);
        newAttachments.push({ url: r.data.url, name: r.data.original_name, size: r.data.size, content_type: r.data.content_type });
      } catch (err) { toast.error(`Failed to upload ${file.name}: ${err.response?.data?.detail || 'Error'}`); }
    }
    setEditing(prev => ({ ...prev, attachments: newAttachments }));
    setUploading(false);
    e.target.value = '';
  };

  const removeAttachment = (idx) => {
    setEditing(prev => ({ ...prev, attachments: (prev.attachments || []).filter((_, i) => i !== idx) }));
  };

  // Registrations View
  if (viewRegs) {
    return (
      <div data-testid="event-registrations-view">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setViewRegs(null)} className="p-1.5 rounded hover:bg-slate-100"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--ad-heading, #1a2332)', fontFamily: 'Playfair Display, serif' }}>Registrations: {viewRegs.title}</h1>
            <p className="text-xs text-slate-500">{viewRegs.date} &middot; {viewRegs.start_time} - {viewRegs.end_time}</p>
          </div>
          <button onClick={() => handleExportCSV(viewRegs.id)}
            className="ml-auto flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded border border-slate-300 text-slate-600 hover:bg-slate-50" data-testid="export-csv-btn">
            <Download className="w-3 h-3" /> Export CSV
          </button>
        </div>
        {regsLoading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div> : (
          <div className="bg-white rounded border overflow-x-auto" style={{ borderColor: 'var(--ad-card-border, #e2e8f0)' }}>
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-slate-50">
                <th className="text-left p-3 font-medium text-slate-600">#</th>
                <th className="text-left p-3 font-medium text-slate-600">Membership ID</th>
                <th className="text-left p-3 font-medium text-slate-600">Name</th>
                <th className="text-left p-3 font-medium text-slate-600">Email</th>
                <th className="text-left p-3 font-medium text-slate-600">Registered At</th>
                <th className="text-left p-3 font-medium text-slate-600">Status</th>
              </tr></thead>
              <tbody>
                {regs.map((r, i) => (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="p-3 text-slate-400">{i + 1}</td>
                    <td className="p-3 font-mono text-[#0D9488]">{r.membership_id || '-'}</td>
                    <td className="p-3 text-[#1a2332]">{r.name || '-'}</td>
                    <td className="p-3 text-slate-500">{r.email || '-'}</td>
                    <td className="p-3 text-slate-400 text-xs">{r.registered_at ? new Date(r.registered_at).toLocaleString() : '-'}</td>
                    <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded font-medium ${r.status === 'registered' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {regs.length === 0 && <p className="p-8 text-center text-slate-400 text-sm">No registrations yet</p>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div data-testid="global-events-manager">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--ad-heading, #1a2332)', fontFamily: 'Playfair Display, serif' }}>Global Events</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded p-0.5 bg-slate-100">
            <button onClick={() => setViewMode('list')} className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium ${viewMode === 'list' ? 'bg-[#0D9488] text-white' : 'text-slate-500'}`} data-testid="events-list-view"><List className="w-3 h-3" /> List</button>
            <button onClick={() => setViewMode('calendar')} className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium ${viewMode === 'calendar' ? 'bg-[#0D9488] text-white' : 'text-slate-500'}`} data-testid="events-cal-view"><Grid3X3 className="w-3 h-3" /> Calendar</button>
          </div>
          <button onClick={() => { setEditing({ ...emptyEvent }); setOpen(true); }}
            className="text-white px-4 py-2 rounded-sm text-sm font-medium flex items-center gap-2" style={{ backgroundColor: 'var(--ad-button-bg, #0D9488)' }} data-testid="add-event-btn">
            <Plus className="w-4 h-4" /> Add Event
          </button>
        </div>
      </div>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div> : viewMode === 'calendar' ? (() => {
        const yr = currentDate.getFullYear(); const mo = currentDate.getMonth();
        const firstDay = new Date(yr, mo, 1).getDay();
        const daysInMonth = new Date(yr, mo + 1, 0).getDate();
        const days = []; for (let i = 0; i < firstDay; i++) days.push(null); for (let d = 1; d <= daysInMonth; d++) days.push(d);
        const monthLabel = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
        const getEventsForDay = (day) => { if (!day) return []; const ds = `${yr}-${String(mo+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`; return events.filter(e => e.date === ds); };
        const todayD = new Date().toISOString().split('T')[0];
        const ec = (e) => { if (e.status === 'cancelled' || e.date < todayD) return '#6b7280'; return '#22c55e'; };
        return (
          <>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCurrentDate(new Date(yr, mo-1, 1))} className="p-1.5 rounded hover:bg-slate-100"><ChevronLeft className="w-5 h-5 text-slate-400" /></button>
              <h2 className="text-sm font-semibold text-[#1a2332]">{monthLabel}</h2>
              <button onClick={() => setCurrentDate(new Date(yr, mo+1, 1))} className="p-1.5 rounded hover:bg-slate-100"><ChevronRight className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="grid grid-cols-7 gap-px rounded-lg overflow-hidden bg-slate-200">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="p-2 text-center text-xs font-medium bg-slate-50 text-slate-500">{d}</div>)}
              {days.map((day, i) => {
                const de = getEventsForDay(day);
                return <div key={i} className="min-h-[80px] p-1.5 bg-white">
                  {day && <><span className="text-xs font-medium text-[#1a2332]">{day}</span>
                    {de.map(e => <div key={e.id} className="mt-0.5 px-1.5 py-0.5 rounded text-[10px] truncate cursor-pointer" onClick={() => { setEditing({...e}); setOpen(true); }} style={{ backgroundColor: ec(e)+'20', color: ec(e), borderLeft: `2px solid ${ec(e)}` }}>{e.title}</div>)}
                  </>}
                </div>;
              })}
            </div>
          </>
        );
      })() : (
        <>
        <DataTableToolbar dt={dt} testId="events" placeholder="Search by title, type, location…" />
        <div className="bg-white rounded border overflow-x-auto" style={{ borderColor: 'var(--ad-card-border, #e2e8f0)' }}>
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-slate-50">
              <th className="text-left p-3 font-medium text-slate-600">No.</th>
              <SortableTh dt={dt} field="title">Title</SortableTh>
              <SortableTh dt={dt} field="type">Type</SortableTh>
              <SortableTh dt={dt} field="date">Date</SortableTh>
              <SortableTh dt={dt} field="start_time">Time</SortableTh>
              <SortableTh dt={dt} field="max_capacity">Capacity</SortableTh>
              <SortableTh dt={dt} field="registered_count">Registered</SortableTh>
              <th className="text-left p-3 font-medium text-slate-600">Available</th>
              <th className="text-left p-3 font-medium text-slate-600">Files</th>
              <SortableTh dt={dt} field="status">Status</SortableTh>
              <th className="text-right p-3 font-medium text-slate-600">Actions</th>
            </tr></thead>
            <tbody>
              {dt.visibleItems.map((ev, i) => {
                const available = Math.max(0, (ev.max_capacity || 0) - (ev.registered_count || 0));
                const rowNum = (dt.page - 1) * dt.pageSize + i + 1;
                return (
                  <tr key={ev.id} className="border-b border-slate-50 hover:bg-slate-50/50" data-testid={`event-row-${ev.id}`}>
                    <td className="p-3 text-slate-400">{rowNum}</td>
                    <td className="p-3 font-medium text-[#1a2332]">{ev.title}</td>
                    <td className="p-3 text-slate-500 text-xs">{ev.type}</td>
                    <td className="p-3 text-slate-500 text-xs">{ev.date}</td>
                    <td className="p-3 text-slate-500 text-xs">{ev.start_time} - {ev.end_time}</td>
                    <td className="p-3 text-slate-500">{ev.max_capacity}</td>
                    <td className="p-3 font-semibold text-[#0D9488]">{ev.registered_count || 0}</td>
                    <td className="p-3" style={{ color: available > 0 ? '#059669' : '#dc2626' }}>{available}</td>
                    <td className="p-3 text-slate-500 text-xs">{(ev.attachments || []).length > 0 ? <span className="flex items-center gap-1"><Paperclip className="w-3 h-3" />{(ev.attachments || []).length}</span> : '-'}</td>
                    <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded font-medium ${statusColors[ev.status] || ''}`}>{ev.status}</span></td>
                    <td className="p-3 text-right">
                      <button onClick={() => openRegistrations(ev)} className="p-1.5 text-slate-400 hover:text-[#0D9488]" title="View Registrations"><Users className="w-4 h-4" /></button>
                      <button onClick={() => handleClone(ev.id)} className="p-1.5 text-slate-400 hover:text-blue-500" title="Clone Event"><Copy className="w-4 h-4" /></button>
                      <button onClick={() => { setEditing({ ...ev }); setOpen(true); }} className="p-1.5 text-slate-400 hover:text-[#0D9488]"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(ev.id)} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {dt.totalAll === 0 && <p className="p-8 text-center text-slate-400 text-sm">No events yet. Click "Add Event" to create one.</p>}
          {dt.totalAll > 0 && dt.totalFiltered === 0 && <p className="p-8 text-center text-slate-400 text-sm">No events match your search.</p>}
          <DataTablePagination dt={dt} testId="events" />
        </div>
        </>
      )}

      {/* Event Editor Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto" data-testid="event-dialog">
          <DialogHeader><DialogTitle style={{ fontFamily: 'Playfair Display, serif' }}>{editing?.id ? 'Edit' : 'New'} Event</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div><Label className="text-xs">Title *</Label><Input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} className="mt-1" placeholder="Event title" data-testid="event-title" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Type *</Label>
                  <select value={editing.type} onChange={e => setEditing({ ...editing, type: e.target.value })} className={inputCls + " mt-1"} data-testid="event-type">
                    {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div><Label className="text-xs">Status *</Label>
                  <select value={editing.status} onChange={e => setEditing({ ...editing, status: e.target.value })} className={inputCls + " mt-1"} data-testid="event-status">
                    {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div><Label className="text-xs">Description</Label>
                <div className="mt-1"><RichTextEditor value={editing.description || ''} onChange={v => setEditing({ ...editing, description: v })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label className="text-xs">Date *</Label><Input type="date" value={editing.date} onChange={e => setEditing({ ...editing, date: e.target.value })} className="mt-1" data-testid="event-date" /></div>
                <div><Label className="text-xs">Start Time *</Label><Input type="time" value={editing.start_time} onChange={e => setEditing({ ...editing, start_time: e.target.value })} className="mt-1" data-testid="event-start" /></div>
                <div><Label className="text-xs">End Time *</Label><Input type="time" value={editing.end_time} onChange={e => setEditing({ ...editing, end_time: e.target.value })} className="mt-1" data-testid="event-end" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Timezone *</Label>
                  <select value={editing.timezone} onChange={e => setEditing({ ...editing, timezone: e.target.value })} className={inputCls + " mt-1"} data-testid="event-timezone">
                    {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                  </select>
                </div>
                <div><Label className="text-xs">Max Capacity *</Label><Input type="number" value={editing.max_capacity} onChange={e => setEditing({ ...editing, max_capacity: parseInt(e.target.value) || 0 })} className="mt-1" data-testid="event-capacity" /></div>
              </div>
              <div><Label className="text-xs">Location (Address)</Label><Input value={editing.location || ''} onChange={e => setEditing({ ...editing, location: e.target.value })} className="mt-1" placeholder="Address" data-testid="event-location" /></div>
              <div><Label className="text-xs">View Map (URL)</Label><Input value={editing.map_url || ''} onChange={e => setEditing({ ...editing, map_url: e.target.value })} className="mt-1" placeholder="https://www.google.com/maps/..." data-testid="event-map-url" /></div>
              <div><Label className="text-xs">Virtual Link (Zoom/Meet)</Label><Input value={editing.virtual_link || ''} onChange={e => setEditing({ ...editing, virtual_link: e.target.value })} className="mt-1" placeholder="https://zoom.us/..." data-testid="event-virtual-link" /></div>
              <div><Label className="text-xs">Image</Label><ImageUpload value={editing.image || ''} onChange={v => setEditing({ ...editing, image: v })} /></div>
              <div>
                <Label className="text-xs">Attachments (PDF, PPT, DOC, XLS, etc.)</Label>
                <div className="mt-1 space-y-2">
                  {(editing.attachments || []).map((att, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded border border-slate-200 text-xs" data-testid={`attachment-${idx}`}>
                      <FileText className="w-4 h-4 text-[#0D9488] flex-shrink-0" />
                      <a href={`${API}${att.url}`} target="_blank" rel="noopener noreferrer" className="flex-1 truncate text-[#1a2332] hover:text-[#0D9488] font-medium">{att.name}</a>
                      <span className="text-slate-400 flex-shrink-0">{att.size ? `${(att.size / 1024).toFixed(0)} KB` : ''}</span>
                      <button onClick={() => removeAttachment(idx)} className="p-0.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 flex-shrink-0" data-testid={`remove-attachment-${idx}`}><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                  <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-slate-300 rounded cursor-pointer hover:border-[#0D9488] hover:bg-slate-50 transition-colors" data-testid="upload-attachment-btn">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" /> : <Paperclip className="w-4 h-4 text-slate-400" />}
                    <span className="text-xs text-slate-500">{uploading ? 'Uploading...' : 'Click to add files (max 25MB each)'}</span>
                    <input type="file" multiple accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip,.jpg,.png" onChange={handleFileUpload} className="hidden" disabled={uploading} />
                  </label>
                </div>
              </div>
              <button onClick={handleSave} disabled={saving} className="w-full py-2 rounded-sm text-sm font-medium text-white flex items-center justify-center gap-2 disabled:opacity-50" style={{ backgroundColor: 'var(--ad-button-bg, #0D9488)' }} data-testid="event-save-btn">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />} {editing.id ? 'Update' : 'Create'} Event
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
