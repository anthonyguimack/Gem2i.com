import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Trash2, Mail } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { useDataTable, DataTableToolbar, DataTablePagination, SortableTh } from '../../components/admin/useDataTable';

export default function LandingContactsManager() {
  const [items, setItems] = useState([]);
  const [viewing, setViewing] = useState(null);

  const load = () => adminAPI.getLandingContacts().then(r => setItems(r.data || [])).catch(console.error);
  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this contact?')) return;
    await adminAPI.deleteLandingContact(id);
    toast.success('Deleted');
    load();
  };

  const dt = useDataTable(items, {
    searchAccessor: i => `${i.first_name || ''} ${i.last_name || ''} ${i.email || ''} ${i.subject || ''} ${i.message || ''}`,
    defaultSort: { key: 'created_at', dir: 'desc' },
    storageKey: 'landing-contacts',
  });

  return (
    <div data-testid="landing-contacts-manager">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--ad-heading, #1a2332)', fontFamily: 'Playfair Display, serif' }}>Landing Page Contacts</h1>
        <span className="text-sm px-3 py-1 rounded-sm" style={{ backgroundColor: 'var(--ad-accent, #0D9488)', color: '#fff' }}>{items.length} messages</span>
      </div>
      <DataTableToolbar dt={dt} testId="landing-contacts" placeholder="Search by name, email, subject…" />
      <div className="bg-white rounded-sm border border-slate-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ backgroundColor: 'var(--ad-table-header-bg, #f8fafc)' }}>
              <SortableTh dt={dt} field="first_name">Name</SortableTh>
              <SortableTh dt={dt} field="email">Email</SortableTh>
              <SortableTh dt={dt} field="subject">Subject</SortableTh>
              <SortableTh dt={dt} field="created_at">Date</SortableTh>
              <th className="text-right p-3 font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {dt.visibleItems.map(item => (
              <tr key={item.id} className="border-b border-slate-50 cursor-pointer hover:bg-slate-50" onClick={() => setViewing(item)} data-testid={`lp-contact-row-${item.id}`}>
                <td className="p-3 font-medium flex items-center gap-2"><Mail className="w-3 h-3" style={{ color: 'var(--ad-accent, #0D9488)' }} />{item.first_name} {item.last_name}</td>
                <td className="p-3 text-slate-600">{item.email}</td>
                <td className="p-3 text-slate-500 max-w-[200px] truncate">{item.subject || '—'}</td>
                <td className="p-3 text-slate-400 text-xs">{item.created_at ? new Date(item.created_at).toLocaleString() : '—'}</td>
                <td className="p-3 text-right" onClick={e => e.stopPropagation()}>
                  <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-500" data-testid={`delete-lp-contact-${item.id}`}><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {dt.totalAll === 0 && <div className="p-8 text-center text-slate-400 text-sm">No contacts yet</div>}
        {dt.totalAll > 0 && dt.totalFiltered === 0 && <div className="p-8 text-center text-slate-400 text-sm">No contacts match your search</div>}
        <DataTablePagination dt={dt} testId="landing-contacts" />
      </div>

      <Dialog open={!!viewing} onOpenChange={o => !o && setViewing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Contact Details</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-3 text-sm">
              <div><strong>Name:</strong> {viewing.first_name} {viewing.last_name}</div>
              <div><strong>Email:</strong> {viewing.email}</div>
              <div><strong>Subject:</strong> {viewing.subject || '—'}</div>
              <div><strong>Message:</strong><p className="mt-1 text-slate-600 whitespace-pre-wrap bg-slate-50 p-3 rounded">{viewing.message || '—'}</p></div>
              <div className="text-xs text-slate-400">{viewing.created_at ? new Date(viewing.created_at).toLocaleString() : ''}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
