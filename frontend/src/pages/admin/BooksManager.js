import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Plus, Edit2, Trash2, Loader2 } from 'lucide-react';

import ImageUpload from '../../components/ImageUpload';
import LocalizedField from '../../components/admin/LocalizedField';
import { adminText } from '../../lib/i18n';
import { useDataTable, DataTableToolbar, DataTablePagination, SortableTh } from '../../components/admin/useDataTable';
import { useSettings } from '../../App';
import PersonalityTabs, { PB_PERSONALITY_TABS } from '../../components/admin/PersonalityTabs';

const emptyBook = { title: '', author: '', description: '', image: '', amazon_link: '', other_links: [], featured: false };

export default function BooksManager() {
  const settings = useSettings();
  const isPB = settings.active_theme === 'personalbrand';
  const [activeTab, setActiveTab] = useState(null); // null = Global
  const [savedTabs, setSavedTabs] = useState(new Set(['__global__']));
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = (personality = activeTab) => adminAPI.getBooks(personality).then(r => setItems(r.data)).catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(activeTab); }, [activeTab]);

  useEffect(() => {
    if (!isPB) return;
    PB_PERSONALITY_TABS.forEach(t => {
      if (t.key === null) return;
      adminAPI.getBooks(t.key).then(r => { if ((r.data || []).length) setSavedTabs(prev => new Set([...prev, t.key])); }).catch(() => {});
    });
  }, [isPB]);

  const handleSave = async () => {
    setLoading(true);
    try {
      if (editing.id) { await adminAPI.updateBook(editing.id, editing); }
      else { await adminAPI.createBook(editing, activeTab); }
      if (activeTab) setSavedTabs(prev => new Set([...prev, activeTab]));
      toast.success('Saved!'); setOpen(false); load();
    } catch { toast.error('Error'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete?')) return;
    try { await adminAPI.deleteBook(id); toast.success('Deleted'); load(); } catch { toast.error('Error'); }
  };

  const dt = useDataTable(items, {
    searchAccessor: b => `${adminText(b.title)} ${adminText(b.author)}`,
    defaultSort: { key: 'title', dir: 'asc' },
    storageKey: 'books',
  });

  return (
    <div data-testid="books-manager">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1a2332]" style={{ fontFamily: 'Playfair Display, serif' }}>Reading List Manager</h1>
        <button onClick={() => { setEditing({...emptyBook}); setOpen(true); }} className="bg-[#0D9488] text-white px-4 py-2 rounded-sm text-sm font-medium flex items-center gap-2" data-testid="add-book-btn"><Plus className="w-4 h-4" /> Add Book</button>
      </div>
      <PersonalityTabs show={isPB} activeTab={activeTab} onChange={setActiveTab} savedTabs={savedTabs} label="Reading List scope" noun="books" />
      <DataTableToolbar dt={dt} testId="books" placeholder="Search by title or author…" />
      <div className="bg-white rounded-sm border border-slate-100">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-100 bg-slate-50">
            <th className="text-left p-3 font-medium text-slate-600">Cover</th>
            <SortableTh dt={dt} field="title">Title</SortableTh>
            <SortableTh dt={dt} field="author">Author</SortableTh>
            <SortableTh dt={dt} field="featured">Featured</SortableTh>
            <th className="text-right p-3 font-medium text-slate-600">Actions</th>
          </tr></thead>
          <tbody>
            {dt.visibleItems.map(item => (
              <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="p-3"><img src={item.image} alt="" className="w-10 h-14 object-cover rounded-sm" /></td>
                <td className="p-3 font-medium text-[#1a2332]">{adminText(item.title)}</td>
                <td className="p-3 text-slate-500">{adminText(item.author)}</td>
                <td className="p-3">{item.featured ? <span className="text-xs text-[#0D9488]">Yes</span> : <span className="text-xs text-slate-400">No</span>}</td>
                <td className="p-3 text-right">
                  <button onClick={() => { setEditing({...item}); setOpen(true); }} className="p-1.5 text-slate-400 hover:text-[#0D9488]"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {dt.totalAll === 0 && <div className="p-8 text-center text-slate-400 text-sm">No books yet</div>}
        {dt.totalAll > 0 && dt.totalFiltered === 0 && <div className="p-8 text-center text-slate-400 text-sm">No books match your search</div>}
        <DataTablePagination dt={dt} testId="books" />
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]" data-testid="book-dialog">
          <DialogHeader><DialogTitle>{editing?.id ? 'Edit' : 'New'} Book</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div><Label>Title</Label>
                <LocalizedField value={editing.title} onChange={v => setEditing({...editing, title: v})} render={({ value, onChange }) => (
                  <Input value={value || ''} onChange={e => onChange(e.target.value)} className="mt-1" />
                )} />
              </div>
              <div><Label>Author</Label>
                <LocalizedField value={editing.author} onChange={v => setEditing({...editing, author: v})} render={({ value, onChange }) => (
                  <Input value={value || ''} onChange={e => onChange(e.target.value)} className="mt-1" />
                )} />
              </div>
              <div><Label>Description</Label>
                <LocalizedField value={editing.description} onChange={v => setEditing({...editing, description: v})} render={({ value, onChange }) => (
                  <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={3} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-sm mt-1" />
                )} />
              </div>
              <div><Label>Synopsis</Label>
                <LocalizedField value={editing.synopsis} onChange={v => setEditing({...editing, synopsis: v})} render={({ value, onChange }) => (
                  <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={3} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-sm mt-1" placeholder="What is the book about?" />
                )} />
              </div>
              <div><Label>Who Is It For?</Label>
                <LocalizedField value={editing.who_is_it_for} onChange={v => setEditing({...editing, who_is_it_for: v})} render={({ value, onChange }) => (
                  <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={2} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-sm mt-1" />
                )} />
              </div>
              <div><Label>About the Author</Label>
                <LocalizedField value={editing.about_author} onChange={v => setEditing({...editing, about_author: v})} render={({ value, onChange }) => (
                  <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={2} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-sm mt-1" />
                )} />
              </div>
              <div><Label>Cover Image</Label><ImageUpload value={editing.image} onChange={v => setEditing({...editing, image: v})} className="mt-1" /></div>
              <div><Label>Amazon Link</Label><Input value={editing.amazon_link} onChange={e => setEditing({...editing, amazon_link: e.target.value})} className="mt-1" /></div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={editing.featured} onChange={e => setEditing({...editing, featured: e.target.checked})} id="featured" />
                <Label htmlFor="featured">Featured</Label>
              </div>
              <button onClick={handleSave} disabled={loading} className="w-full bg-[#0D9488] text-white py-2 rounded-sm text-sm font-medium disabled:opacity-50" data-testid="book-save-btn">Save</button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
