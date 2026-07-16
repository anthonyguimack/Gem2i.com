import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Plus, Edit2, Trash2, Loader2, Shield, Link2 } from 'lucide-react';

const SIDEBAR_SECTIONS = [
  { id: 'membership-profile', label: 'Membership Profile' },
  { id: 'mentorship-profile', label: 'Mentorship Profile' },
  { id: 'my-sponsor', label: 'My Sponsor' },
  { id: 'ebank', label: 'My Ebank' },
  { id: 'invite-code', label: 'Invite Code' },
  { id: 'my-community', label: 'My Community' },
  { id: 'portfolios', label: 'Portfolios' },
  { id: 'global-calendar', label: 'AUX Calendar' },
  { id: 'mentorship-calendar', label: 'My Calendar' },
  { id: 'earnings', label: 'Earnings' },
  { id: 'bundles', label: 'Session Bundles' },
  { id: 'my-bookings', label: 'My Reservations' },
  { id: 'calendar-sync', label: 'Calendar Sync' },
];

export default function MemberLevelsManager() {
  const [levels, setLevels] = useState([]);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quickLinks, setQuickLinks] = useState([]);
  const [navLabels, setNavLabels] = useState({}); // {id -> CMS-renamed label}

  const load = () => {
    adminAPI.getLevels().then(r => setLevels(r.data)).catch(console.error);
    adminAPI.getMyAccountLinks().then(r => setQuickLinks(r.data || [])).catch(() => {});
    adminAPI.getMyAccountNav().then(r => {
      const map = {};
      (r.data || []).forEach(n => { map[n.id] = n.label; });
      setNavLabels(map);
    }).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  // Merge CMS-renamed labels onto the hardcoded section list.
  const sections = SIDEBAR_SECTIONS.map(s => ({ ...s, label: navLabels[s.id] || s.label }));

  const handleSave = async () => {
    if (!editing?.name?.trim()) { toast.error('Name is required'); return; }
    setLoading(true);
    try {
      if (editing.id) await adminAPI.updateLevel(editing.id, editing);
      else await adminAPI.createLevel(editing);
      toast.success('Saved!'); setOpen(false); load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Error'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this level?')) return;
    try { await adminAPI.deleteLevel(id); toast.success('Deleted'); load(); } catch { toast.error('Error'); }
  };

  const togglePerm = (perm) => {
    setEditing(prev => {
      const perms = [...(prev.permissions || [])];
      const idx = perms.indexOf(perm);
      if (idx >= 0) perms.splice(idx, 1);
      else perms.push(perm);
      return { ...prev, permissions: perms };
    });
  };

  const toggleQLPerm = (linkId) => {
    setEditing(prev => {
      const perms = [...(prev.quick_link_permissions || [])];
      const idx = perms.indexOf(linkId);
      if (idx >= 0) perms.splice(idx, 1);
      else perms.push(linkId);
      return { ...prev, quick_link_permissions: perms };
    });
  };

  return (
    <div data-testid="member-levels-manager">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1a2332]" style={{ fontFamily: 'Playfair Display, serif' }}>Member Levels</h1>
        <button onClick={() => { setEditing({ name: '', permissions: [], order: levels.length + 1 }); setOpen(true); }}
          className="bg-[#0D9488] text-white px-4 py-2 rounded-sm text-sm font-medium flex items-center gap-2" data-testid="add-level-btn">
          <Plus className="w-4 h-4" /> Add Level
        </button>
      </div>

      <div className="space-y-3">
        {levels.map(level => (
          <div key={level.id} className="bg-white rounded-sm border border-slate-100 p-4 flex items-start justify-between" data-testid={`level-${level.id}`}>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-[#0D9488]" />
                <h3 className="font-semibold text-[#1a2332]">{level.name}</h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(level.permissions || []).map(p => {
                  const section = sections.find(s => s.id === p);
                  return <span key={p} className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded">{section?.label || p}</span>;
                })}
                {(!level.permissions || level.permissions.length === 0) && <span className="text-xs text-slate-400">No permissions</span>}
              </div>
              {(level.quick_link_permissions || []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {(level.quick_link_permissions || []).map(qlId => {
                    const ql = quickLinks.find(l => l.id === qlId);
                    return ql ? <span key={qlId} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded flex items-center gap-1"><Link2 className="w-3 h-3" />{ql.label}</span> : null;
                  })}
                </div>
              )}
            </div>
            <div className="flex gap-1">
              <button onClick={() => { setEditing({...level}); setOpen(true); }} className="p-1.5 text-slate-400 hover:text-[#0D9488]"><Edit2 className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(level.id)} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
        {levels.length === 0 && <div className="p-8 text-center text-slate-400 text-sm bg-white rounded-sm border border-slate-100">No levels created yet</div>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]" data-testid="level-dialog">
          <DialogHeader><DialogTitle style={{ fontFamily: 'Playfair Display, serif' }}>{editing?.id ? 'Edit' : 'New'} Level</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div><Label className="text-xs">Level Name *</Label><Input value={editing.name} onChange={e => setEditing({...editing, name: e.target.value})} className="mt-1" placeholder="e.g. Level 1" data-testid="level-name-input" /></div>
              <div><Label className="text-xs">Order</Label><Input type="number" value={editing.order || ''} onChange={e => setEditing({...editing, order: parseInt(e.target.value) || 0})} className="mt-1" /></div>
              <div>
                <Label className="text-xs mb-3 block">Permissions (My Account Sections)</Label>
                <div className="space-y-2">
                  {sections.map(section => (
                    <label key={section.id} className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer" data-testid={`perm-${section.id}`}>
                      <input type="checkbox" checked={(editing.permissions || []).includes(section.id)} onChange={() => togglePerm(section.id)} className="accent-[#0D9488] w-4 h-4" />
                      <span className="text-sm text-slate-700">{section.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              {quickLinks.length > 0 && (
                <div>
                  <Label className="text-xs mb-3 block">Permissions (My Account — Quick Links)</Label>
                  <div className="space-y-2">
                    {quickLinks.map(ql => (
                      <label key={ql.id} className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer" data-testid={`ql-perm-${ql.id}`}>
                        <input type="checkbox" checked={(editing.quick_link_permissions || []).includes(ql.id)} onChange={() => toggleQLPerm(ql.id)} className="accent-[#2563eb] w-4 h-4" />
                        <span className="text-sm text-slate-700">{ql.label}</span>
                        {ql.new_tab && <span className="text-xs text-slate-400">(external)</span>}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={handleSave} disabled={loading} className="w-full bg-[#0D9488] text-white py-2 rounded-sm text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50" data-testid="level-save-btn">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
