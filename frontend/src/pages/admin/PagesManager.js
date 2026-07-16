import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Lock, ExternalLink, Home, Newspaper, Image, BookOpen, Loader2, GripVertical } from 'lucide-react';
import { getLayoutLabel } from '../../components/admin/LayoutPreview';
import PageEditorDialog from '../../components/admin/PageEditorDialog';
import { useDataTable, DataTableToolbar, DataTablePagination, SortableTh } from '../../components/admin/useDataTable';

import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const emptyPage = { title: '', url: '', show_in_header: false, show_in_footer: false, open_in_new_tab: false, login_required: false, order: 0, summary: '', content: '', page_type: '', layout: '', layout_image: '', zones: {}, category: 'all' };

const SYSTEM_ICONS = { home: Home, news: Newspaper, gallery: Image, reading_list: BookOpen };

const CATEGORY_META = {
  all:       { label: 'All Templates', cls: 'bg-sky-50 text-sky-600' },
  business:  { label: 'PB — Business',  cls: 'bg-slate-100 text-slate-600' },
  lifestyle: { label: 'PB — Lifestyle', cls: 'bg-emerald-50 text-emerald-600' },
  personal:  { label: 'PB — Personal',  cls: 'bg-violet-50 text-violet-600' },
};
function CategoryBadge({ category }) {
  const meta = CATEGORY_META[category] || CATEGORY_META.all;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium ${meta.cls}`}>{meta.label}</span>;
}

function StatusBadge({ active, label }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium ${active ? 'bg-[#0D9488]/10 text-[#0D9488]' : 'bg-slate-100 text-slate-400'}`}>
      {label}
    </span>
  );
}

// Single row extracted so dnd-kit hooks can attach listeners to the drag handle.
function PageRow({ item, dragEnabled, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const isSystem = !!item.system;
  const SysIcon = SYSTEM_ICONS[item.system_key];

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="border-b border-slate-50 hover:bg-slate-50/50 group"
      data-testid={`page-row-${item.id}`}
    >
      {/* Drag handle */}
      <td className="p-3 w-10">
        <button
          {...(dragEnabled ? { ...attributes, ...listeners } : {})}
          className={`${dragEnabled ? 'cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500' : 'cursor-not-allowed text-slate-100'}`}
          title={dragEnabled ? 'Drag to reorder' : 'Clear search / sort to enable drag'}
          data-testid={`page-drag-${item.id}`}
          tabIndex={-1}
        >
          <GripVertical className="w-4 h-4" />
        </button>
      </td>

      {/* Title */}
      <td className="p-3">
        <div className="flex items-center gap-2">
          {SysIcon && <SysIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
          <div>
            <div className="font-medium text-[#1a2332]">{item.title}</div>
            <div className="flex gap-1 mt-0.5">
              {isSystem && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium">System</span>}
              {item.layout && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">{getLayoutLabel(item.layout)}</span>}
              {item.zones && Object.values(item.zones).some(z => z?.length > 0) && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-green-50 text-green-600">Builder</span>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* URL */}
      <td className="p-3 hidden md:table-cell">
        <span className="text-slate-500 text-xs font-mono bg-slate-50 px-2 py-0.5 rounded">{item.url}</span>
      </td>

      {/* Scope */}
      <td className="p-3 hidden lg:table-cell">
        <CategoryBadge category={item.category || 'all'} />
      </td>

      {/* Visibility */}
      <td className="p-3 text-center">
        <div className="flex flex-wrap justify-center gap-1">
          {item.show_in_header && <StatusBadge active label="Header" />}
          {item.show_in_footer && <StatusBadge active label="Footer" />}
          {!item.show_in_header && !item.show_in_footer && <StatusBadge active={false} label="Hidden" />}
        </div>
      </td>

      {/* Access */}
      <td className="p-3 text-center">
        <div className="flex flex-wrap justify-center gap-1">
          {item.login_required && (
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-sm text-xs font-medium bg-amber-50 text-amber-600">
              <Lock className="w-3 h-3" />Login
            </span>
          )}
          {item.open_in_new_tab && (
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-sm text-xs font-medium bg-blue-50 text-blue-500">
              <ExternalLink className="w-3 h-3" />New Tab
            </span>
          )}
          {!item.login_required && !item.open_in_new_tab && (
            <span className="text-xs text-slate-300">Public</span>
          )}
        </div>
      </td>

      {/* Actions */}
      <td className="p-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => onEdit(item)}
            className="p-1.5 text-slate-400 hover:text-[#0D9488] transition-colors"
            data-testid={`edit-page-${item.id}`}
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(item.id, isSystem)}
            className={`p-1.5 transition-colors ${isSystem ? 'text-slate-300 hover:text-amber-500' : 'text-slate-400 hover:text-red-500'}`}
            data-testid={`delete-page-${item.id}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function PagesManager() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const load = () =>
    adminAPI.getNavPages()
      .then(r => setItems((r.data || []).sort((a, b) => (a.order || 0) - (b.order || 0))))
      .catch(console.error);

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      if (editing.id) await adminAPI.updateNavPage(editing.id, editing);
      else await adminAPI.createNavPage(editing);
      toast.success('Saved!'); setOpen(false); load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Error'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id, isSystem) => {
    const msg = isSystem
      ? 'This is a SYSTEM page. Deleting it will remove it from navigation. It can be re-created by reloading. Continue?'
      : 'Delete this page?';
    if (!window.confirm(msg)) return;
    try { await adminAPI.deleteNavPage(id); toast.success('Deleted'); load(); }
    catch (e) { toast.error(e.response?.data?.detail || 'Error'); }
  };

  const handleDragEnd = async ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex(i => i.id === active.id);
    const newIndex = items.findIndex(i => i.id === over.id);

    // Capture original order values BEFORE the update so we know which items
    // actually changed when building the API call list.
    const originalOrders = new Map(items.map(p => [p.id, p.order ?? 0]));

    // Reorder the array AND update every item's `order` field to match its new
    // index.  Without this second step, useDataTable (which sorts by the `order`
    // field whenever sortKey === 'order') would immediately re-sort the array
    // using the stale field values and snap rows back to their original positions.
    const reordered = arrayMove(items, oldIndex, newIndex).map((p, idx) => ({ ...p, order: idx }));
    setItems(reordered);

    try {
      await Promise.all(
        reordered
          .filter(p => originalOrders.get(p.id) !== p.order)
          .map(p => adminAPI.updateNavPage(p.id, { ...p }))
      );
      toast.success('Order saved');
    } catch {
      toast.error('Failed to save order');
      load(); // roll back to server state on error
    }
  };

  const openEditor = (page) => { setEditing({ ...page }); setOpen(true); };

  const filteredByCategory = categoryFilter === 'all'
    ? items
    : items.filter(p => (p.category || 'all') === categoryFilter);

  const dt = useDataTable(filteredByCategory, {
    searchFields: ['title', 'url'],
    defaultSort: { key: 'order', dir: 'asc' },
    storageKey: 'pages',
  });

  // Drag is only meaningful when viewing the natural order with no active search
  // or explicit sort override — same guard as ServicesManager.
  const dragEnabled = !dt.search && (dt.sortKey === 'order' || dt.sortKey == null);

  const handleSeedSystemPages = async () => {
    setSeeding(true);
    try {
      const r = await adminAPI.seedSystemPages?.();
      toast.success(`Seeded ${r?.data?.seeded ?? 0} system page(s)`);
      load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Error seeding'); }
    finally { setSeeding(false); }
  };

  return (
    <div data-testid="pages-manager">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1a2332]" style={{ fontFamily: 'Playfair Display, serif' }}>Pages Manager</h1>
          <p className="text-xs text-slate-400 mt-1">
            Drag rows to reorder (clear search / sort first). Changes are saved immediately.
          </p>
        </div>
        <button
          onClick={() => openEditor({ ...emptyPage, order: items.length })}
          className="bg-[#0D9488] text-white px-4 py-2 rounded-sm text-sm font-medium flex items-center gap-2"
          data-testid="add-page-btn"
        >
          <Plus className="w-4 h-4" /> Add Page
        </button>
      </div>

      <DataTableToolbar dt={dt} testId="pages" placeholder="Search by title or URL…" extra={
        <label className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">Scope</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border border-slate-200 rounded-sm px-2 py-1 text-xs bg-white focus:outline-none focus:border-[#0D9488]"
            data-testid="pages-category-filter"
          >
            <option value="all">— All scopes —</option>
            <option value="all_templates">All Templates</option>
            <option value="business">PB — Business</option>
            <option value="lifestyle">PB — Lifestyle</option>
            <option value="personal">PB — Personal</option>
          </select>
        </label>
      } />

      <div className="bg-white rounded-sm border border-slate-200">
        <table className="w-full text-sm" data-testid="pages-table">
          <thead>
            <tr className="border-b bg-slate-50/80">
              <th className="w-10 p-3" />
              <SortableTh dt={dt} field="title">Page</SortableTh>
              <SortableTh dt={dt} field="url" className="hidden md:table-cell">URL</SortableTh>
              <SortableTh dt={dt} field="category" className="hidden lg:table-cell w-36">Scope</SortableTh>
              <th className="text-center p-3 font-medium text-slate-500 w-20">Visibility</th>
              <th className="text-center p-3 font-medium text-slate-500 w-20">Access</th>
              <th className="text-right p-3 font-medium text-slate-500 w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={dragEnabled ? handleDragEnd : () => {}}>
              <SortableContext items={dt.visibleItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                {dt.visibleItems.map(item => (
                  <PageRow
                    key={item.id}
                    item={item}
                    dragEnabled={dragEnabled}
                    onEdit={openEditor}
                    onDelete={handleDelete}
                  />
                ))}
              </SortableContext>
            </DndContext>
            {dt.totalAll === 0 && (
              <tr>
                <td colSpan={7} className="p-12 text-center text-slate-400 text-sm">
                  No pages yet. Click "Add Page" to create one.
                </td>
              </tr>
            )}
            {dt.totalAll > 0 && dt.totalFiltered === 0 && (
              <tr>
                <td colSpan={7} className="p-12 text-center text-slate-400 text-sm">
                  No pages match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <DataTablePagination dt={dt} testId="pages" />
      </div>

      <PageEditorDialog
        editing={editing}
        setEditing={setEditing}
        open={open}
        setOpen={setOpen}
        onSave={handleSave}
        loading={loading}
      />
    </div>
  );
}
