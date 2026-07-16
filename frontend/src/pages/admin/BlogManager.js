import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Checkbox } from '../../components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Plus, Edit2, Trash2, Loader2, Settings2, Tag } from 'lucide-react';
import RichTextEditor from '../../components/RichTextEditor';
import ImageUpload from '../../components/ImageUpload';
import LocalizedField from '../../components/admin/LocalizedField';
import { adminText } from '../../lib/i18n';
import { useDataTable, DataTableToolbar, DataTablePagination, SortableTh } from '../../components/admin/useDataTable';
import { useSettings } from '../../App';
import PersonalityTabs, { PB_PERSONALITY_TABS } from '../../components/admin/PersonalityTabs';

const emptyPost = { title: '', summary: '', content: '', category: '', author: '', image: '', published: true };
const emptyCategory = { name: '' };

export default function BlogManager() {
  const settings = useSettings();
  const isPB = settings.active_theme === 'personalbrand';
  const [activeTab, setActiveTab] = useState(null); // null = Global
  const [savedTabs, setSavedTabs] = useState(new Set(['__global__']));
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState([]);
  const [catOpen, setCatOpen] = useState(false);
  const [editCat, setEditCat] = useState(null);
  const [catLoading, setCatLoading] = useState(false);

  // Posts are personality-scoped; categories are a shared taxonomy (global).
  const load = (personality = activeTab) => {
    adminAPI.getBlog(personality).then(r => setItems(r.data)).catch(console.error);
    adminAPI.getBlogCategories().then(r => setCategories(r.data || [])).catch(() => {});
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(activeTab); }, [activeTab]);

  useEffect(() => {
    if (!isPB) return;
    PB_PERSONALITY_TABS.forEach(t => {
      if (t.key === null) return;
      adminAPI.getBlog(t.key).then(r => { if ((r.data || []).length) setSavedTabs(prev => new Set([...prev, t.key])); }).catch(() => {});
    });
  }, [isPB]);

  const handleSave = async () => {
    setLoading(true);
    try {
      if (editing.id) await adminAPI.updateBlog(editing.id, editing);
      else await adminAPI.createBlog(editing, activeTab);
      if (activeTab) setSavedTabs(prev => new Set([...prev, activeTab]));
      toast.success('Saved!'); setOpen(false); load();
    } catch { toast.error('Error saving'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete?')) return;
    try { await adminAPI.deleteBlog(id); toast.success('Deleted'); load(); } catch { toast.error('Error'); }
  };

  const handleBulkDelete = async () => {
    if (!selected.length || !window.confirm(`Delete ${selected.length} posts?`)) return;
    try { await adminAPI.bulkDelete('blog_posts', selected); toast.success(`${selected.length} deleted`); setSelected([]); load(); }
    catch { toast.error('Error'); }
  };

  const toggleSelect = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () => setSelected(prev => prev.length === items.length ? [] : items.map(i => i.id));

  const dt = useDataTable(items, {
    searchAccessor: p => `${adminText(p.title)} ${p.category || ''} ${p.author || ''}`,
    defaultSort: { key: 'created_at', dir: 'desc' },
    storageKey: 'blog',
  });

  // Category CRUD
  const handleSaveCategory = async () => {
    setCatLoading(true);
    try {
      if (editCat.id) await adminAPI.updateBlogCategory(editCat.id, editCat);
      else await adminAPI.createBlogCategory(editCat);
      toast.success('Category saved!'); setEditCat(null); load();
    } catch { toast.error('Error'); } finally { setCatLoading(false); }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Delete this category?')) return;
    try { await adminAPI.deleteBlogCategory(id); toast.success('Deleted'); load(); } catch { toast.error('Error'); }
  };

  return (
    <div data-testid="blog-manager">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1a2332]" style={{ fontFamily: 'Playfair Display, serif' }}>Blog Manager</h1>
        <div className="flex items-center gap-2">
          {selected.length > 0 && (
            <button onClick={handleBulkDelete} className="bg-red-500 text-white px-3 py-2 rounded-sm text-sm font-medium flex items-center gap-1" data-testid="bulk-delete-btn">
              <Trash2 className="w-3 h-3" /> Delete ({selected.length})
            </button>
          )}
          <button onClick={() => setCatOpen(true)} className="border border-slate-200 text-slate-600 px-3 py-2 rounded-sm text-sm font-medium flex items-center gap-1 hover:border-[#0D9488] transition-colors" data-testid="manage-blog-categories-btn">
            <Settings2 className="w-3.5 h-3.5" /> Categories
          </button>
          <button onClick={() => { setEditing({...emptyPost}); setOpen(true); }} className="bg-[#0D9488] text-white px-4 py-2 rounded-sm text-sm font-medium flex items-center gap-2" data-testid="add-blog-btn"><Plus className="w-4 h-4" /> New Post</button>
        </div>
      </div>
      <PersonalityTabs show={isPB} activeTab={activeTab} onChange={setActiveTab} savedTabs={savedTabs} label="News / Blog scope" noun="posts" />
      <DataTableToolbar dt={dt} testId="blog" placeholder="Search by title, category, author…" />
      <div className="bg-white rounded-sm border border-slate-100">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-100 bg-slate-50">
            <th className="p-3 w-8"><Checkbox checked={selected.length === items.length && items.length > 0} onCheckedChange={toggleAll} data-testid="select-all-checkbox" /></th>
            <SortableTh dt={dt} field="title">Title</SortableTh>
            <SortableTh dt={dt} field="category">Category</SortableTh>
            <SortableTh dt={dt} field="author">Author</SortableTh>
            <SortableTh dt={dt} field="published">Status</SortableTh>
            <th className="text-right p-3 font-medium text-slate-600">Actions</th>
          </tr></thead>
          <tbody>
            {dt.visibleItems.map(item => (
              <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50" data-testid={`blog-row-${item.id}`}>
                <td className="p-3"><Checkbox checked={selected.includes(item.id)} onCheckedChange={() => toggleSelect(item.id)} /></td>
                <td className="p-3 font-medium text-[#1a2332]">{adminText(item.title)}</td>
                <td className="p-3 text-slate-500">{item.category}</td>
                <td className="p-3 text-slate-500">{item.author}</td>
                <td className="p-3">{item.published ? <span className="text-xs text-[#0D9488] bg-[#0D9488]/10 px-2 py-0.5 rounded-sm">Published</span> : <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-sm">Draft</span>}</td>
                <td className="p-3 text-right">
                  <button onClick={() => { setEditing({...item}); setOpen(true); }} className="p-1.5 text-slate-400 hover:text-[#0D9488]"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {dt.totalAll === 0 && <div className="p-8 text-center text-slate-400 text-sm">No blog posts yet</div>}
        {dt.totalAll > 0 && dt.totalFiltered === 0 && <div className="p-8 text-center text-slate-400 text-sm">No posts match your search</div>}
        <DataTablePagination dt={dt} testId="blog" />
      </div>

      {/* Post Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto" data-testid="blog-dialog">
          <DialogHeader><DialogTitle style={{ fontFamily: 'Playfair Display, serif' }}>{editing?.id ? 'Edit' : 'New'} Post</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div><Label>Title</Label>
                <LocalizedField value={editing.title} onChange={v => setEditing({...editing, title: v})} render={({ value, onChange }) => (
                  <Input value={value || ''} onChange={e => onChange(e.target.value)} className="mt-1" data-testid="blog-title-input" />
                )} />
              </div>
              <div><Label>Summary</Label>
                <p className="text-xs text-slate-400 mb-1">Rich text — shown below the title on the blog list.</p>
                <LocalizedField value={editing.summary} onChange={v => setEditing({...editing, summary: v})} render={({ value, onChange }) => (
                  <RichTextEditor value={value || ''} onChange={onChange} placeholder="Short rich-text teaser..." />
                )} />
              </div>
              <div><Label>Content</Label>
                <div className="mt-1">
                  <LocalizedField value={editing.content} onChange={v => setEditing({...editing, content: v})} render={({ value, onChange }) => (
                    <RichTextEditor value={value || ''} onChange={onChange} />
                  )} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Category</Label>
                  <select value={editing.category} onChange={e => setEditing({...editing, category: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-sm mt-1" data-testid="blog-category-select">
                    <option value="">-- Select category --</option>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div><Label>Author</Label><Input value={editing.author} onChange={e => setEditing({...editing, author: e.target.value})} className="mt-1" data-testid="blog-author-input" /></div>
              </div>
              <div><Label>Featured Image</Label><ImageUpload value={editing.image} onChange={val => setEditing({...editing, image: val})} className="mt-1" /></div>
              <div className="flex items-center gap-2">
                <Checkbox checked={editing.published} onCheckedChange={v => setEditing({...editing, published: v})} id="published" />
                <Label htmlFor="published">Published</Label>
              </div>
              <button onClick={handleSave} disabled={loading} className="w-full bg-[#0D9488] text-white py-2 rounded-sm text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50" data-testid="blog-save-btn">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Categories Manager Dialog */}
      <Dialog open={catOpen} onOpenChange={setCatOpen}>
        <DialogContent className="sm:max-w-[500px]" data-testid="blog-categories-dialog">
          <DialogHeader><DialogTitle style={{ fontFamily: 'Playfair Display, serif' }}>Blog Categories</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              {categories.map(c => (
                <div key={c.id} className="flex items-center gap-2 bg-slate-50 rounded-sm border border-slate-100 px-3 py-2" data-testid={`blog-cat-row-${c.id}`}>
                  <Tag className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-slate-700 flex-1">{c.name}</span>
                  <button onClick={() => setEditCat({...c})} className="p-1 text-slate-400 hover:text-[#0D9488]" data-testid={`edit-blog-cat-${c.id}`}><Edit2 className="w-3 h-3" /></button>
                  <button onClick={() => handleDeleteCategory(c.id)} className="p-1 text-slate-400 hover:text-red-500" data-testid={`delete-blog-cat-${c.id}`}><Trash2 className="w-3 h-3" /></button>
                </div>
              ))}
              {categories.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No categories yet. Add one below.</p>}
            </div>
            <div className="border-t border-slate-200 pt-4">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">{editCat?.id ? 'Edit' : 'Add'} Category</p>
              <div className="flex gap-2">
                <Input placeholder="Category name" value={editCat?.name || ''} onChange={e => setEditCat(prev => ({...(prev || emptyCategory), name: e.target.value}))} className="flex-1" data-testid="blog-category-name-input" />
                <button onClick={handleSaveCategory} disabled={catLoading || !editCat?.name} className="bg-[#0D9488] text-white px-4 py-2 rounded-sm text-sm font-medium disabled:opacity-50 flex items-center gap-1" data-testid="save-blog-category-btn">
                  {catLoading && <Loader2 className="w-3 h-3 animate-spin" />} {editCat?.id ? 'Update' : 'Add'}
                </button>
                {editCat?.id && <button onClick={() => setEditCat({...emptyCategory})} className="px-3 py-2 rounded-sm text-sm text-slate-500 border border-slate-200">Cancel</button>}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
