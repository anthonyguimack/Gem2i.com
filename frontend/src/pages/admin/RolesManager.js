import React, { useEffect, useMemo, useState } from 'react';
import { adminAPI } from '../../lib/api';
import { Plus, Edit2, Trash2, Shield, Users, Save, X, Check } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Roles & Permissions Manager
 *
 * Full CRUD over the `cms_roles` collection.
 *   • Left panel: list of roles (name, member count, full-access badge).
 *   • Right panel: editor — name, description, full-access toggle,
 *     checkbox matrix grouped by the CMS Section Registry's groups.
 *   • Group header has a "Select All" that ticks/unticks every child in one go
 *     and shows an indeterminate state when only some children are ticked.
 *   • System roles (Administrator, Member) cannot be deleted; Administrator's
 *     full_access flag is locked on and Member's is locked off.
 */
export default function RolesManager() {
  const [roles, setRoles] = useState([]);
  const [sections, setSections] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(null);

  const loadAll = async () => {
    try {
      const [rolesRes, secsRes] = await Promise.all([
        adminAPI.getCmsRoles(),
        adminAPI.getCmsSections(),
      ]);
      setRoles(rolesRes.data);
      setSections(secsRes.data.sections);
      setGroups(secsRes.data.groups);
    } finally { setLoading(false); }
  };
  useEffect(() => { loadAll(); }, []);

  const sectionsByGroup = useMemo(() => {
    const m = {};
    sections.forEach(s => { (m[s.group] = m[s.group] || []).push(s); });
    return m;
  }, [sections]);

  const startCreate = () => {
    setSelectedId('__new__');
    setForm({ name: '', description: '', permissions: [], full_access: false, is_system: false });
  };
  const startEdit = (role) => {
    setSelectedId(role.id);
    setForm({
      name: role.name, description: role.description || '',
      permissions: [...(role.permissions || [])],
      full_access: !!role.full_access, is_system: !!role.is_system,
    });
  };
  const cancel = () => { setSelectedId(null); setForm(null); };

  const togglePerm = (key, checked) => {
    setForm(f => ({ ...f, permissions: checked
      ? Array.from(new Set([...(f.permissions || []), key]))
      : (f.permissions || []).filter(k => k !== key) }));
  };
  const toggleGroup = (groupKey, checked) => {
    const keys = (sectionsByGroup[groupKey] || []).map(s => s.key);
    setForm(f => {
      const current = new Set(f.permissions || []);
      keys.forEach(k => { checked ? current.add(k) : current.delete(k); });
      return { ...f, permissions: Array.from(current) };
    });
  };
  const selectAll = () => { setForm(f => ({ ...f, permissions: sections.map(s => s.key), full_access: true })); };
  const clearAll = () => { setForm(f => ({ ...f, permissions: [], full_access: false })); };

  const save = async () => {
    if (!form.name.trim()) { toast.error('Role name is required'); return; }
    try {
      if (selectedId === '__new__') {
        const { data } = await adminAPI.createCmsRole(form);
        toast.success('Role created');
        await loadAll(); setSelectedId(data.id);
      } else {
        await adminAPI.updateCmsRole(selectedId, form);
        toast.success('Role updated');
        await loadAll();
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Save failed');
    }
  };
  const remove = async (role) => {
    if (role.is_system) { toast.error('System roles cannot be deleted'); return; }
    if (!window.confirm(`Delete role "${role.name}"? Members assigned to it will keep their other roles.`)) return;
    try {
      await adminAPI.deleteCmsRole(role.id);
      toast.success('Role deleted');
      if (selectedId === role.id) cancel();
      await loadAll();
    } catch (e) { toast.error(e.response?.data?.detail || 'Delete failed'); }
  };

  if (loading) return <div className="p-8 text-slate-500" data-testid="roles-loading">Loading…</div>;

  return (
    <div className="space-y-4" data-testid="roles-manager">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Roles &amp; Permissions</h1>
          <p className="text-sm text-slate-500 mt-1">Create custom CMS roles and grant per-section access. Admin stays full-access; Members never see the CMS.</p>
        </div>
        <button onClick={startCreate} className="flex items-center gap-2 px-4 py-2 bg-[#0D9488] text-white rounded-sm text-sm font-medium hover:bg-[#0b7a70]" data-testid="roles-new-btn">
          <Plus className="w-4 h-4" /> New Role
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Roles list */}
        <div className="lg:col-span-1 space-y-2">
          {roles.map(r => (
            <div key={r.id} className={`border rounded-sm p-3 cursor-pointer transition-colors ${selectedId === r.id ? 'border-[#0D9488] bg-[#0D9488]/5' : 'border-slate-200 bg-white hover:border-slate-300'}`} onClick={() => startEdit(r)} data-testid={`role-row-${r.id}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 flex-shrink-0" style={{ color: r.full_access ? '#0D9488' : '#64748b' }} />
                    <div className="font-semibold text-sm truncate">{r.name}</div>
                    {r.is_system && <span className="text-[10px] uppercase tracking-wider bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">System</span>}
                    {r.full_access && <span className="text-[10px] uppercase tracking-wider bg-[#0D9488]/10 text-[#0D9488] px-1.5 py-0.5 rounded">Full</span>}
                  </div>
                  {r.description && <div className="text-xs text-slate-500 mt-1 line-clamp-2">{r.description}</div>}
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {r.member_count} {r.member_count === 1 ? 'member' : 'members'}</span>
                    <span>{r.full_access ? 'All sections' : `${(r.permissions || []).length} sections`}</span>
                  </div>
                </div>
                {!r.is_system && (
                  <button onClick={(e) => { e.stopPropagation(); remove(r); }} className="text-slate-400 hover:text-red-500 p-1" data-testid={`role-delete-${r.id}`} title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Editor */}
        <div className="lg:col-span-2 border border-slate-200 rounded-sm bg-white min-h-[400px]">
          {!form ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              Select a role to edit, or click <span className="font-medium text-slate-600">New Role</span> to create one.
            </div>
          ) : (
            <div className="p-5 space-y-5" data-testid="role-editor">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-slate-400" />
                  {selectedId === '__new__' ? 'New Role' : form.name}
                  {form.is_system && <span className="text-[10px] uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-0.5 rounded">System</span>}
                </h2>
                <div className="flex items-center gap-2">
                  <button onClick={cancel} className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-sm text-sm hover:bg-slate-50" data-testid="role-cancel-btn"><X className="w-3.5 h-3.5" /> Cancel</button>
                  <button onClick={save} className="flex items-center gap-1 px-3 py-1.5 bg-[#0D9488] text-white rounded-sm text-sm font-medium hover:bg-[#0b7a70]" data-testid="role-save-btn"><Save className="w-3.5 h-3.5" /> Save</button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
                  <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-sm text-sm focus:outline-none focus:border-[#0D9488]"
                    disabled={form.is_system}
                    data-testid="role-name-input" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Full-access (Administrator-style)</label>
                  <label className="flex items-center gap-2 h-9 px-3 border border-slate-300 rounded-sm">
                    <input type="checkbox" checked={!!form.full_access}
                      onChange={e => setForm(f => ({ ...f, full_access: e.target.checked }))}
                      disabled={form.is_system}
                      className="w-4 h-4 accent-[#0D9488]"
                      data-testid="role-full-access-checkbox" />
                    <span className="text-sm text-slate-700">Grants every current &amp; future CMS section</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-sm text-sm focus:outline-none focus:border-[#0D9488]"
                  data-testid="role-description-input" />
              </div>

              {/* Permission matrix */}
              <div className={form.full_access ? 'opacity-50 pointer-events-none select-none' : ''}>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-slate-600">Section Permissions</label>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={selectAll} className="text-xs text-[#0D9488] hover:underline" data-testid="role-select-all-btn">Select All</button>
                    <span className="text-slate-300">|</span>
                    <button type="button" onClick={clearAll} className="text-xs text-slate-500 hover:underline" data-testid="role-clear-all-btn">Clear All</button>
                  </div>
                </div>
                <div className="border border-slate-200 rounded-sm divide-y divide-slate-200">
                  {groups.map(g => {
                    const gSections = sectionsByGroup[g.key] || [];
                    if (!gSections.length) return null;
                    const allChecked = gSections.every(s => form.permissions.includes(s.key));
                    const someChecked = gSections.some(s => form.permissions.includes(s.key));
                    return (
                      <div key={g.key} className="p-3">
                        <label className="flex items-center gap-2 mb-2 cursor-pointer">
                          <input type="checkbox" checked={allChecked}
                            ref={el => { if (el) el.indeterminate = someChecked && !allChecked; }}
                            onChange={e => toggleGroup(g.key, e.target.checked)}
                            className="w-4 h-4 accent-[#0D9488]"
                            data-testid={`role-group-${g.key}`} />
                          <span className="text-xs font-bold uppercase tracking-[0.1em] text-slate-700">{g.label}</span>
                          <span className="text-[10px] text-slate-400">{gSections.filter(s => form.permissions.includes(s.key)).length}/{gSections.length}</span>
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 pl-6">
                          {gSections.map(s => (
                            <label key={s.key} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                              <input type="checkbox" checked={form.permissions.includes(s.key)}
                                onChange={e => togglePerm(s.key, e.target.checked)}
                                className="w-3.5 h-3.5 accent-[#0D9488]"
                                data-testid={`role-perm-${s.key}`} />
                              <span className="truncate">{s.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {form.full_access && (
                  <p className="mt-2 text-xs text-slate-500 flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#0D9488]" /> Full-access overrides the matrix — this role sees every section.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
