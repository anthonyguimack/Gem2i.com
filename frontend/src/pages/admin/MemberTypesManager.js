import React, { useState, useEffect } from 'react';
import { adminAPI, publicAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Checkbox } from '../../components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Plus, Edit2, Trash2, Loader2, Shield, Globe } from 'lucide-react';
import { useDataTable, DataTableToolbar, DataTablePagination, SortableTh } from '../../components/admin/useDataTable';

const PERMISSION_FIELDS = [
  { key: 'corporate', label: 'Corporate' },
  { key: 'is_mentor', label: 'Mentor' },
  { key: 'portfolio_development', label: 'Portfolio Development' },
  { key: 'application_reviewer', label: 'Application Reviewer' },
  { key: 'opportunities_development', label: 'Opportunities Development' },
  { key: 'opportunities_reviewer', label: 'Opportunities Reviewer' },
  { key: 'project_development', label: 'Project Development' },
  { key: 'project_reviewer', label: 'Project Reviewer' },
  { key: 'project_management', label: 'Project Management' },
  { key: 'content_operator', label: 'Content Operator' },
];

const emptyType = {
  name: '', description: '', order: 0, allowed_pages: [],
  corporate: false, is_mentor: false, portfolio_development: false,
  application_reviewer: false, opportunities_development: false, opportunities_reviewer: false,
  project_development: false, project_reviewer: false, project_management: false, content_operator: false,
};

export default function MemberTypesManager() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sitePages, setSitePages] = useState([]);
  const [formTab, setFormTab] = useState('general');

  const load = () => adminAPI.getMemberTypes().then(r => setItems(r.data || [])).catch(console.error);
  useEffect(() => {
    load();
    publicAPI.getSitePages().then(r => setSitePages(r.data || [])).catch(() => {});
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      if (editing.id) await adminAPI.updateMemberType(editing.id, editing);
      else await adminAPI.createMemberType(editing);
      toast.success('Saved!'); setOpen(false); load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Error'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this member type?')) return;
    try { await adminAPI.deleteMemberType(id); toast.success('Deleted'); load(); } catch { toast.error('Error'); }
  };

  const activePerms = (item) => PERMISSION_FIELDS.filter(f => item[f.key]).map(f => f.label);
  const tabCls = (t) => `flex-1 px-3 py-1.5 rounded text-sm font-medium capitalize ${formTab === t ? 'bg-white shadow text-[#1a2332]' : 'text-slate-500'}`;

  const dt = useDataTable(items, {
    searchFields: ['name', 'description'],
    defaultSort: { key: 'order', dir: 'asc' },
    storageKey: 'member-types',
  });

  return (
    <div data-testid="member-types-manager">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1a2332]" style={{ fontFamily: 'Playfair Display, serif' }}>Member Types</h1>
        <button onClick={() => { setEditing({ ...emptyType, order: items.length }); setFormTab('general'); setOpen(true); }}
          className="bg-[#0D9488] text-white px-4 py-2 rounded-sm text-sm font-medium flex items-center gap-2" data-testid="add-member-type-btn">
          <Plus className="w-4 h-4" /> Add Type
        </button>
      </div>

      <DataTableToolbar dt={dt} testId="member-types" placeholder="Search by name or description…" />

      <div className="bg-white rounded-sm border border-slate-100">
        <table className="w-full text-sm" data-testid="member-types-table">
          <thead><tr className="border-b bg-slate-50">
            <SortableTh dt={dt} field="order" className="w-16">Order</SortableTh>
            <SortableTh dt={dt} field="name">Name</SortableTh>
            <th className="text-left p-3 font-medium text-slate-500 hidden md:table-cell">Permissions</th>
            <th className="text-left p-3 font-medium text-slate-500 hidden lg:table-cell">Pages</th>
            <th className="text-right p-3 font-medium text-slate-500 w-24">Actions</th>
          </tr></thead>
          <tbody>
            {dt.visibleItems.map(item => (
              <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50" data-testid={`member-type-row-${item.id}`}>
                <td className="p-3 text-xs text-slate-400">{item.order}</td>
                <td className="p-3">
                  <div className="font-medium text-[#1a2332]">{item.name}</div>
                  {item.description && <div className="text-xs text-slate-400 mt-0.5">{item.description}</div>}
                </td>
                <td className="p-3 hidden md:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {activePerms(item).length > 0 ? activePerms(item).slice(0, 3).map(p => (
                      <span key={p} className="px-1.5 py-0.5 bg-[#0D9488]/10 text-[#0D9488] text-xs rounded">{p}</span>
                    )) : <span className="text-xs text-slate-300">None</span>}
                    {activePerms(item).length > 3 && <span className="text-xs text-slate-400">+{activePerms(item).length - 3}</span>}
                  </div>
                </td>
                <td className="p-3 hidden lg:table-cell">
                  <span className="text-xs text-slate-400">{(item.allowed_pages || []).length} pages</span>
                </td>
                <td className="p-3 text-right">
                  <button onClick={() => { setEditing({ ...emptyType, ...item }); setFormTab('general'); setOpen(true); }} className="p-1.5 text-slate-400 hover:text-[#0D9488]" data-testid={`edit-type-${item.id}`}><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-500" data-testid={`delete-type-${item.id}`}><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {dt.totalAll === 0 && <div className="p-8 text-center text-slate-400 text-sm">No member types yet. Add one to get started.</div>}
        {dt.totalAll > 0 && dt.totalFiltered === 0 && <div className="p-8 text-center text-slate-400 text-sm">No member types match your search</div>}
        <DataTablePagination dt={dt} testId="member-types" />
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto" data-testid="member-type-dialog">
          <DialogHeader><DialogTitle style={{ fontFamily: 'Playfair Display, serif' }}>{editing?.id ? 'Edit' : 'New'} Member Type</DialogTitle></DialogHeader>
          {editing && (
            <div>
              {/* Tabs */}
              <div className="flex gap-1 mb-4 bg-slate-100 rounded p-1">
                <button onClick={() => setFormTab('general')} className={tabCls('general')} data-testid="type-tab-general">General</button>
                <button onClick={() => setFormTab('permissions')} className={tabCls('permissions')} data-testid="type-tab-permissions">
                  <Shield className="w-3 h-3 inline mr-1" />Permissions
                </button>
                <button onClick={() => setFormTab('pages')} className={tabCls('pages')} data-testid="type-tab-pages">
                  <Globe className="w-3 h-3 inline mr-1" />Page Access
                </button>
              </div>

              {formTab === 'general' && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-slate-500">Name *</Label>
                    <Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} className="mt-1" data-testid="member-type-name-input" />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Description</Label>
                    <textarea value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} rows={2} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-sm mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Order</Label>
                    <Input type="number" value={editing.order || 0} onChange={e => setEditing({ ...editing, order: parseInt(e.target.value) || 0 })} className="mt-1 w-24" />
                  </div>
                </div>
              )}

              {formTab === 'permissions' && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-400 mb-3">Define which role permissions members of this type will automatically inherit.</p>
                  <div className="grid grid-cols-2 gap-3">
                    {PERMISSION_FIELDS.map(({ key, label }) => (
                      <div key={key} className="p-3 bg-slate-50 rounded border border-slate-100" data-testid={`perm-${key}`}>
                        <Label className="text-xs font-medium mb-2 block">{label}</Label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input type="radio" name={`perm_${key}`} checked={editing[key] === true} onChange={() => setEditing({ ...editing, [key]: true })} className="accent-[#0D9488]" />
                            <span className="text-sm">Yes</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input type="radio" name={`perm_${key}`} checked={!editing[key]} onChange={() => setEditing({ ...editing, [key]: false })} className="accent-[#0D9488]" />
                            <span className="text-sm">No</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {formTab === 'pages' && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-400 mb-3">Select which pages members of this type can access. Only applies to pages with "Login Required" enabled.</p>
                  <div className="grid grid-cols-2 gap-2">
                    {sitePages.map(pg => {
                      const checked = (editing.allowed_pages || []).includes(pg.id);
                      return (
                        <label key={pg.id} className={`flex items-center gap-2.5 p-2.5 rounded-sm border cursor-pointer transition-colors ${checked ? 'bg-[#0D9488]/5 border-[#0D9488]/30' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}
                          data-testid={`page-access-${pg.id}`}>
                          <Checkbox checked={checked} onCheckedChange={(v) => {
                            setEditing(prev => {
                              const cur = prev.allowed_pages || [];
                              return { ...prev, allowed_pages: v ? [...cur, pg.id] : cur.filter(x => x !== pg.id) };
                            });
                          }} />
                          <div>
                            <span className="text-sm font-medium text-[#1a2332]">{pg.title}</span>
                            <span className="block text-xs text-slate-400 font-mono">{pg.url}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  {sitePages.length === 0 && <p className="text-xs text-slate-400">Loading pages...</p>}
                </div>
              )}

              <button onClick={handleSave} disabled={loading} className="w-full mt-4 bg-[#0D9488] text-white py-2.5 rounded-sm text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50" data-testid="member-type-save-btn">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
