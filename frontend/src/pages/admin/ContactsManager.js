import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Mail, MailOpen, Trash2, Eye, Download, Loader2 } from 'lucide-react';
import { Checkbox } from '../../components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { useDataTable, DataTableToolbar, DataTablePagination, SortableTh } from '../../components/admin/useDataTable';

export default function ContactsManager() {
  const [items, setItems] = useState([]);
  const [viewing, setViewing] = useState(null);
  const [selected, setSelected] = useState([]);
  const [exporting, setExporting] = useState(false);

  const load = () => adminAPI.getContacts().then(r => setItems(r.data)).catch(console.error);
  useEffect(() => { load(); }, []);

  const markRead = async (item) => {
    await adminAPI.updateContact(item.id, { ...item, read: true });
    setViewing({ ...item, read: true });
    load();
  };

  const handleBulkDelete = async () => {
    if (!selected.length || !window.confirm(`Delete ${selected.length} contacts?`)) return;
    try { await adminAPI.bulkDelete('contacts', selected); toast.success(`${selected.length} deleted`); setSelected([]); load(); }
    catch { toast.error('Error'); }
  };

  const handleBulkRead = async () => {
    if (!selected.length) return;
    try { await adminAPI.bulkUpdate('contacts', selected, { read: true }); toast.success('Marked as read'); setSelected([]); load(); }
    catch { toast.error('Error'); }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await adminAPI.exportContacts();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'contacts.csv';
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('CSV downloaded!');
    } catch { toast.error('Export failed'); }
    finally { setExporting(false); }
  };

  const toggleSelect = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () => setSelected(s => s.length === items.length ? [] : items.map(i => i.id));

  const dt = useDataTable(items, {
    searchFields: ['name', 'email', 'subject', 'message'],
    defaultSort: { key: 'created_at', dir: 'desc' },
    storageKey: 'contacts',
  });

  return (
    <div data-testid="contacts-manager">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1a2332]" style={{ fontFamily: 'Playfair Display, serif' }}>Contact Submissions</h1>
        <div className="flex items-center gap-2">
          {selected.length > 0 && (
            <>
              <button onClick={handleBulkRead} className="bg-[#0D9488] text-white px-3 py-2 rounded-sm text-sm font-medium" data-testid="bulk-read-btn">Mark Read ({selected.length})</button>
              <button onClick={handleBulkDelete} className="bg-red-500 text-white px-3 py-2 rounded-sm text-sm font-medium flex items-center gap-1" data-testid="bulk-delete-contacts-btn">
                <Trash2 className="w-3 h-3" /> Delete ({selected.length})
              </button>
            </>
          )}
          <button onClick={handleExport} disabled={exporting} className="border border-slate-200 text-slate-600 px-3 py-2 rounded-sm text-sm font-medium flex items-center gap-1 hover:bg-slate-50 disabled:opacity-50" data-testid="export-csv-btn">
            {exporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />} Export CSV
          </button>
        </div>
      </div>
      <DataTableToolbar dt={dt} testId="contacts" placeholder="Search by name, email, subject…" />
      <div className="bg-white rounded-sm border border-slate-100">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-slate-50">
            <th className="p-3 w-8"><Checkbox checked={selected.length === items.length && items.length > 0} onCheckedChange={toggleAll} /></th>
            <SortableTh dt={dt} field="read">Status</SortableTh>
            <SortableTh dt={dt} field="name">Name</SortableTh>
            <SortableTh dt={dt} field="email">Email</SortableTh>
            <SortableTh dt={dt} field="subject">Subject</SortableTh>
            <SortableTh dt={dt} field="created_at">Date</SortableTh>
            <th className="text-right p-3 font-medium text-slate-600">Actions</th>
          </tr></thead>
          <tbody>{dt.visibleItems.map(item => (
            <tr key={item.id} className={`border-b border-slate-50 ${!item.read ? 'bg-blue-50/30' : ''}`}>
              <td className="p-3"><Checkbox checked={selected.includes(item.id)} onCheckedChange={() => toggleSelect(item.id)} /></td>
              <td className="p-3">{item.read ? <MailOpen className="w-4 h-4 text-slate-400" /> : <Mail className="w-4 h-4 text-[#0D9488]" />}</td>
              <td className="p-3 font-medium">{item.name}</td>
              <td className="p-3 text-slate-500">{item.email}</td>
              <td className="p-3 text-slate-500">{item.subject}</td>
              <td className="p-3 text-slate-400 text-xs">{new Date(item.created_at).toLocaleDateString()}</td>
              <td className="p-3 text-right">
                <button onClick={() => { setViewing(item); if (!item.read) markRead(item); }} className="p-1.5 text-slate-400 hover:text-[#0D9488]"><Eye className="w-4 h-4" /></button>
                <button onClick={async () => { if (window.confirm('Delete?')) { await adminAPI.deleteContact(item.id); load(); }}} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </td>
            </tr>
          ))}</tbody>
        </table>
        {dt.totalAll === 0 && <div className="p-8 text-center text-slate-400 text-sm">No contact submissions yet</div>}
        {dt.totalAll > 0 && dt.totalFiltered === 0 && <div className="p-8 text-center text-slate-400 text-sm">No contacts match your search</div>}
        <DataTablePagination dt={dt} testId="contacts" />
      </div>
      <Dialog open={!!viewing} onOpenChange={() => setViewing(null)}>
        <DialogContent><DialogHeader><DialogTitle>Contact Message</DialogTitle></DialogHeader>
          {viewing && <div className="space-y-3">
            <div><span className="text-xs text-slate-400">From:</span><p className="font-medium">{viewing.name} ({viewing.email})</p></div>
            {viewing.phone && <div><span className="text-xs text-slate-400">Phone:</span><p>{viewing.phone}</p></div>}
            <div><span className="text-xs text-slate-400">Subject:</span><p className="font-medium">{viewing.subject}</p></div>
            <div><span className="text-xs text-slate-400">Message:</span><p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{viewing.message}</p></div>
            <div><span className="text-xs text-slate-400">Date:</span><p className="text-sm">{new Date(viewing.created_at).toLocaleString()}</p></div>
          </div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
