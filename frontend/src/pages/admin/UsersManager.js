import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Plus, Edit2, Trash2, Loader2, User, Phone, Mail } from 'lucide-react';
import { useDataTable, DataTableToolbar, DataTablePagination, SortableTh } from '../../components/admin/useDataTable';

const emptyUser = { first_name: '', last_name: '', email: '', password: '', phone: '' };

export default function UsersManager() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = () => adminAPI.getUsers().then(r => setItems(r.data || [])).catch(console.error);
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      if (editing.user_id) {
        await adminAPI.updateUser(editing.user_id, editing);
      } else {
        if (!editing.password) { toast.error('Password required'); setLoading(false); return; }
        await adminAPI.createUser(editing);
      }
      toast.success('Saved!'); setOpen(false); load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Error'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Delete this user?')) return;
    try { await adminAPI.deleteUser(userId); toast.success('Deleted'); load(); }
    catch { toast.error('Error'); }
  };

  const dt = useDataTable(items, {
    searchAccessor: u => `${u.first_name || ''} ${u.last_name || ''} ${u.email || ''} ${u.phone || ''}`,
    defaultSort: { key: 'created_at', dir: 'desc' },
    storageKey: 'users',
  });

  return (
    <div data-testid="users-manager">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1a2332]" style={{ fontFamily: 'Playfair Display, serif' }}>Users Manager</h1>
        <button onClick={() => { setEditing({...emptyUser}); setOpen(true); }} className="bg-[#0D9488] text-white px-4 py-2 rounded-sm text-sm font-medium flex items-center gap-2" data-testid="add-user-btn"><Plus className="w-4 h-4" /> Add User</button>
      </div>
      <DataTableToolbar dt={dt} testId="users" placeholder="Search by name, email, phone…" />
      <div className="bg-white rounded-sm border border-slate-100">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-slate-50">
            <SortableTh dt={dt} field="first_name">Name</SortableTh>
            <SortableTh dt={dt} field="email">Email</SortableTh>
            <SortableTh dt={dt} field="phone">Phone</SortableTh>
            <SortableTh dt={dt} field="created_at">Created</SortableTh>
            <th className="text-right p-3 font-medium text-slate-600">Actions</th>
          </tr></thead>
          <tbody>
            {dt.visibleItems.map(item => (
              <tr key={item.user_id} className="border-b border-slate-50 hover:bg-slate-50/50" data-testid={`user-row-${item.user_id}`}>
                <td className="p-3 font-medium text-[#1a2332] flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#0D9488]/10 flex items-center justify-center"><User className="w-4 h-4 text-[#0D9488]" /></div>
                  {item.first_name} {item.last_name}
                </td>
                <td className="p-3 text-slate-500 flex items-center gap-1"><Mail className="w-3 h-3" /> {item.email}</td>
                <td className="p-3 text-slate-500">{item.phone || '-'}</td>
                <td className="p-3 text-slate-400 text-xs">{new Date(item.created_at).toLocaleDateString()}</td>
                <td className="p-3 text-right">
                  <button onClick={() => { setEditing({...item, password: ''}); setOpen(true); }} className="p-1.5 text-slate-400 hover:text-[#0D9488]"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(item.user_id)} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {dt.totalAll === 0 && <div className="p-8 text-center text-slate-400 text-sm">No users yet</div>}
        {dt.totalAll > 0 && dt.totalFiltered === 0 && <div className="p-8 text-center text-slate-400 text-sm">No users match your search</div>}
        <DataTablePagination dt={dt} testId="users" />
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]" data-testid="user-dialog">
          <DialogHeader><DialogTitle style={{ fontFamily: 'Playfair Display, serif' }}>{editing?.user_id ? 'Edit' : 'New'} User</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>First Name</Label><Input value={editing.first_name} onChange={e => setEditing({...editing, first_name: e.target.value})} className="mt-1" required data-testid="user-firstname-input" /></div>
                <div><Label>Last Name</Label><Input value={editing.last_name} onChange={e => setEditing({...editing, last_name: e.target.value})} className="mt-1" required data-testid="user-lastname-input" /></div>
              </div>
              <div><Label>Email</Label><Input type="email" value={editing.email} onChange={e => setEditing({...editing, email: e.target.value})} className="mt-1" required data-testid="user-email-input" /></div>
              <div>
                <Label>Password {editing.user_id ? '(leave blank to keep current)' : ''}</Label>
                <Input type="password" value={editing.password} onChange={e => setEditing({...editing, password: e.target.value})} className="mt-1" placeholder={editing.user_id ? 'Leave blank to keep' : 'Required'} data-testid="user-password-input" />
              </div>
              <div><Label>Phone (optional)</Label><Input value={editing.phone || ''} onChange={e => setEditing({...editing, phone: e.target.value})} className="mt-1" data-testid="user-phone-input" /></div>
              <button onClick={handleSave} disabled={loading} className="w-full bg-[#0D9488] text-white py-2 rounded-sm text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50" data-testid="user-save-btn">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save User
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
