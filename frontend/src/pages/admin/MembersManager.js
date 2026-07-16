import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI, geoAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Plus, Edit2, Trash2, Loader2, Lock, X, Save, Info, History, LogIn, Trophy } from 'lucide-react';

const STATUS_META = {
  active: { label: 'Active', cls: 'bg-emerald-100 text-emerald-700' },
  deactivated: { label: 'Deactivated', cls: 'bg-red-100 text-red-700' },
  pre_registered: { label: 'Pre-registered', cls: 'bg-amber-100 text-amber-700' },
};
function memberStatus(m) {
  const s = m.account_status || (m.registration_source === 'auxnews' ? 'pre_registered' : 'active');
  return STATUS_META[s] || STATUS_META.active;
}
import ImageUpload from '../../components/ImageUpload';
import { useDataTable, DataTableToolbar, DataTablePagination, SortableTh } from '../../components/admin/useDataTable';

const emptyMember = {
  first_name: '', last_name: '', email: '', password: '', role: 'member',
  gender: '', phone: '', date_of_birth: '', address: '', country: '', state: '', city: '', zip_code: '',
  google_account: '', social_links: [], avatar: '',
  sponsor_membership_number: null, mentor_membership_number: null,
  level_id: null,
  membership_ranking: '', membership_status: 'Free', active_date: '', expiration_date: '',
  membership_fee: '', member_type_id: '', can_create_qr: false,
  account_status: 'active',
};

export default function MembersManager() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('personal');
  const [levels, setLevels] = useState([]);
  const [memberTypes, setMemberTypes] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [ebankData, setEbankData] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  // Member info / enrollment Q&A modal
  const [infoMember, setInfoMember] = useState(null);
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoEnrollment, setInfoEnrollment] = useState(null);
  // CMS Roles inline-edit dialog state
  const [cmsRoles, setCmsRoles] = useState([]);
  const [rolesDialog, setRolesDialog] = useState(null); // { memberId, name, selected: [ids] }

  const load = () => {
    adminAPI.getMembers().then(r => setItems(r.data)).catch(console.error);
    adminAPI.getLevels().then(r => setLevels(r.data)).catch(console.error);
    adminAPI.getMemberTypes().then(r => setMemberTypes(r.data || [])).catch(console.error);
    adminAPI.getMentors().then(r => setMentors(r.data || [])).catch(console.error);
    geoAPI.getCountries().then(r => setCountries(r.data)).catch(console.error);
    adminAPI.getCmsRoles().then(r => setCmsRoles(r.data || [])).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  // Load states when country changes
  useEffect(() => {
    if (editing?.country) {
      const c = countries.find(c => c.name === editing.country);
      if (c) geoAPI.getStates(c.id).then(r => setStates(r.data)).catch(() => {});
      else setStates([]);
    } else { setStates([]); }
  }, [editing?.country, countries]);

  useEffect(() => {
    if (editing?.state) {
      const s = states.find(s => s.name === editing.state);
      if (s) geoAPI.getCities(s.id).then(r => setCities(r.data)).catch(() => {});
      else setCities([]);
    } else { setCities([]); }
  }, [editing?.state, states]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = { ...editing };
      payload.username = payload.email;
      if (editing.member_id) await adminAPI.updateMember(editing.member_id, payload);
      else await adminAPI.createMember(payload);
      toast.success('Saved!'); setOpen(false); load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Error'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this member?')) return;
    try { await adminAPI.deleteMember(id); toast.success('Deleted'); load(); } catch { toast.error('Error'); }
  };

  const selectCls = "w-full px-3 py-2 border border-slate-200 rounded-sm text-sm mt-1";

  const dt = useDataTable(items, {
    searchAccessor: m => `${m.first_name || ''} ${m.last_name || ''} ${m.email || ''} ${m.membership_id || ''} ${m.username || ''}`,
    defaultSort: { key: 'created_at', dir: 'desc' },
    storageKey: 'members',
  });

  return (
    <div data-testid="members-manager">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1a2332]" style={{ fontFamily: 'Playfair Display, serif' }}>Members Manager</h1>
        <button onClick={() => { setEditing({...emptyMember}); setTab('personal'); setOpen(true); }}
          className="bg-[#0D9488] text-white px-4 py-2 rounded-sm text-sm font-medium flex items-center gap-2" data-testid="add-member-btn">
          <Plus className="w-4 h-4" /> Add Member
        </button>
      </div>

      <DataTableToolbar dt={dt} testId="members" placeholder="Search by name, email, AUX…" />

      <div className="bg-white rounded-sm border border-slate-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-slate-50">
            <SortableTh dt={dt} field="membership_id">AUX</SortableTh>
            <SortableTh dt={dt} field="first_name">Name</SortableTh>
            <SortableTh dt={dt} field="email">Email</SortableTh>
            <SortableTh dt={dt} field="is_mentor">Mentor</SortableTh>
            <th className="text-left p-3 font-medium text-slate-600">CMS Roles</th>
            <th className="text-left p-3 font-medium text-slate-600">Level</th>
            <SortableTh dt={dt} field="created_at">Register</SortableTh>
            <SortableTh dt={dt} field="sponsor_membership_number">Sponsor</SortableTh>
            <th className="text-right p-3 font-medium text-slate-600">Actions</th>
          </tr></thead>
          <tbody>
            {dt.visibleItems.map(item => {
              const lvl = levels.find(l => l.id === item.level_id);
              return (
                <tr key={item.member_id} className="border-b border-slate-50 hover:bg-slate-50/50" data-testid={`member-row-${item.membership_number}`}>
                  <td className="p-3 font-mono text-[#0D9488]">{item.membership_id}</td>
                  <td className="p-3 font-medium text-[#1a2332]">{item.first_name} {item.last_name}
                    <span className={`ml-2 align-middle px-1.5 py-0.5 rounded text-[10px] font-semibold ${memberStatus(item).cls}`} data-testid={`member-status-${item.member_id}`}>{memberStatus(item).label}</span>
                  </td>
                  <td className="p-3 text-slate-500">{item.email}</td>
                  <td className="p-3" data-testid={`member-mentor-${item.member_id}`}>
                    {item.is_mentor ? <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-700">YES</span> : <span className="text-slate-400 font-mono">-</span>}
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => setRolesDialog({ memberId: item.member_id, name: `${item.first_name} ${item.last_name}`.trim() || item.email, selected: [...(item.cms_roles || (item.role === 'admin' ? ['role_admin'] : ['role_member']))] })}
                      className="inline-flex flex-wrap items-center gap-1 px-2 py-1 rounded hover:bg-slate-50 text-xs group"
                      data-testid={`member-cms-roles-${item.member_id}`}
                      title="Edit CMS Roles"
                    >
                      {(() => {
                        const assigned = item.cms_roles || (item.role === 'admin' ? ['role_admin'] : ['role_member']);
                        const resolved = assigned.map(id => cmsRoles.find(r => r.id === id)).filter(Boolean);
                        if (!resolved.length) return <span className="text-slate-400 italic">none</span>;
                        return resolved.map(r => (
                          <span key={r.id} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${r.full_access ? 'bg-[#0D9488]/10 text-[#0D9488]' : r.is_system ? 'bg-slate-100 text-slate-600' : 'bg-indigo-50 text-indigo-700'}`}>
                            {r.name}
                          </span>
                        ));
                      })()}
                      <Edit2 className="w-3 h-3 text-slate-300 group-hover:text-[#0D9488]" />
                    </button>
                  </td>
                  <td className="p-3 text-slate-500 text-xs">{lvl?.name || '-'}</td>
                  <td className="p-3 text-slate-500 text-xs">{item.created_at ? new Date(item.created_at).toLocaleDateString() : '-'}</td>
                  <td className="p-3 text-slate-500 text-xs">{item.sponsor_membership_number ? `AUX-${item.sponsor_membership_number}` : '-'}</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => navigate(`/admin/members/${item.member_id}/signatures`)}
                      className="p-1.5 text-slate-400 hover:text-[#0D9488]"
                      title="Signature / disclaimer history"
                      data-testid={`view-signatures-${item.member_id}`}
                    ><History className="w-4 h-4" /></button>
                    <button
                      onClick={() => navigate(`/admin/members/${item.member_id}/logins`)}
                      className="p-1.5 text-slate-400 hover:text-[#0D9488]"
                      title="Login / access history"
                      data-testid={`view-logins-${item.member_id}`}
                    ><LogIn className="w-4 h-4" /></button>
                    <button
                      onClick={() => navigate(`/admin/members/${item.member_id}/points`)}
                      className="p-1.5 text-slate-400 hover:text-[#0D9488]"
                      title="Points & rewards"
                      data-testid={`view-points-${item.member_id}`}
                    ><Trophy className="w-4 h-4" /></button>
                    <button
                      onClick={() => {
                        setInfoMember(item);
                        setInfoEnrollment(null);
                        setInfoLoading(true);
                        adminAPI.getMemberEnrollment(item.member_id)
                          .then(r => setInfoEnrollment(r.data))
                          .catch(() => setInfoEnrollment({ has_application: false, answers: [] }))
                          .finally(() => setInfoLoading(false));
                      }}
                      className="p-1.5 text-slate-400 hover:text-blue-600"
                      title="View profile + enrollment answers"
                      data-testid={`view-info-${item.member_id}`}
                    ><Info className="w-4 h-4" /></button>
                    <button onClick={() => { setEditing({...item}); setTab('personal'); setOpen(true); }} className="p-1.5 text-slate-400 hover:text-[#0D9488]"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(item.member_id)} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {dt.totalAll === 0 && <div className="p-8 text-center text-slate-400 text-sm">No members yet</div>}
        {dt.totalAll > 0 && dt.totalFiltered === 0 && <div className="p-8 text-center text-slate-400 text-sm">No members match your search</div>}
        <DataTablePagination dt={dt} testId="members" />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto" data-testid="member-dialog">
          <DialogHeader><DialogTitle style={{ fontFamily: 'Playfair Display, serif' }}>{editing?.member_id ? 'Edit' : 'New'} Member</DialogTitle></DialogHeader>
          {editing && (
            <div>
              <div className="flex gap-1 mb-4 bg-slate-100 rounded p-1 flex-wrap">
                {[{k:'personal',l:'Personal'},{k:'membership',l:'Membership'},{k:'ebank',l:'Ebank'},{k:'business-card',l:'Business Card'}].map(t => (
                  <button key={t.k} onClick={() => { setTab(t.k); if (t.k === 'ebank' && editing.member_id) adminAPI.getMemberEbank(editing.member_id).then(r => setEbankData(r.data)).catch(() => setEbankData(null)); }} className={`flex-1 px-3 py-1.5 rounded text-xs font-medium ${tab === t.k ? 'bg-white shadow text-[#1a2332]' : 'text-slate-500'}`}>{t.l}</button>
                ))}
              </div>

              {tab === 'personal' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">First Name</Label><Input value={editing.first_name} onChange={e => setEditing({...editing, first_name: e.target.value})} className="mt-1" /></div>
                    <div><Label className="text-xs">Last Name</Label><Input value={editing.last_name} onChange={e => setEditing({...editing, last_name: e.target.value})} className="mt-1" /></div>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <div><Label className="text-xs">Email *</Label><Input type="email" value={editing.email} onChange={e => setEditing({...editing, email: e.target.value})} className="mt-1" data-testid="member-email-input" /></div>
                  </div>
                  {!editing.member_id && <div><Label className="text-xs">Password *</Label><Input type="password" value={editing.password || ''} onChange={e => setEditing({...editing, password: e.target.value})} className="mt-1" /></div>}
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Gender</Label><select value={editing.gender || ''} onChange={e => setEditing({...editing, gender: e.target.value})} className={selectCls}><option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option></select></div>
                    <div><Label className="text-xs">Phone</Label><Input value={editing.phone || ''} onChange={e => setEditing({...editing, phone: e.target.value})} className="mt-1" /></div>
                  </div>
                  <div><Label className="text-xs">Date of Birth</Label><Input type="date" value={editing.date_of_birth || ''} onChange={e => setEditing({...editing, date_of_birth: e.target.value})} className="mt-1" /></div>
                  <div><Label className="text-xs">Address</Label><Input value={editing.address || ''} onChange={e => setEditing({...editing, address: e.target.value})} className="mt-1" /></div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label className="text-xs">Country</Label>
                      <select value={editing.country || ''} onChange={e => setEditing({...editing, country: e.target.value, state: '', city: ''})} className={selectCls} data-testid="member-country-select">
                        <option value="">Select</option>
                        {countries.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                    <div><Label className="text-xs">State</Label>
                      <select value={editing.state || ''} onChange={e => setEditing({...editing, state: e.target.value, city: ''})} className={selectCls} disabled={!editing.country} data-testid="member-state-select">
                        <option value="">Select</option>
                        {states.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                      </select>
                    </div>
                    <div><Label className="text-xs">City</Label>
                      <select value={editing.city || ''} onChange={e => setEditing({...editing, city: e.target.value})} className={selectCls} disabled={!editing.state} data-testid="member-city-select">
                        <option value="">Select</option>
                        {cities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div><Label className="text-xs">ZIP Code</Label><Input value={editing.zip_code || ''} onChange={e => setEditing({...editing, zip_code: e.target.value})} className="mt-1" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Passport ID#</Label><Input value={editing.passport_id || ''} onChange={e => setEditing({...editing, passport_id: e.target.value})} className="mt-1" data-testid="passport-id-input" /></div>
                    <div><Label className="text-xs">Zelle #</Label><Input value={editing.zelle || ''} onChange={e => setEditing({...editing, zelle: e.target.value})} className="mt-1" data-testid="zelle-input" /></div>
                  </div>
                  <div><Label className="text-xs">HTTP Access</Label><Input value={editing.http_access || ''} readOnly className="mt-1 bg-slate-100 cursor-not-allowed" data-testid="http-access-input" /><p className="text-xs text-slate-400 mt-0.5">Auto-populated from the domain where the member registered.</p></div>
                  <div><Label className="text-xs">Avatar</Label>
                    <ImageUpload value={editing.avatar || ''} onChange={v => setEditing({...editing, avatar: v})} />
                  </div>
                </div>
              )}

              {tab === 'membership' && (
                <div className="space-y-3">
                  {editing.member_id && <div className="p-3 bg-slate-50 rounded"><p className="text-xs text-slate-500">Membership ID</p><p className="text-lg font-bold text-[#0D9488]">{editing.membership_id}</p></div>}
                  <div><Label className="text-xs">Account Status</Label>
                    <select value={editing.account_status || 'active'} onChange={e => setEditing({...editing, account_status: e.target.value})} className={selectCls} data-testid="member-account-status-select">
                      <option value="active">Active</option>
                      <option value="pre_registered">Pre-registered</option>
                      <option value="deactivated">Deactivated</option>
                    </select>
                    <p className="text-[11px] text-slate-400 mt-1">Deactivated blocks login at every portal (main, frontend, news, KMS). Pre-registered = from news, no password yet.</p>
                  </div>
                  <div><Label className="text-xs">Share Attribution (Contributor)</Label>
                    <select value={editing.share_attribution || 'name_ref'} onChange={e => setEditing({...editing, share_attribution: e.target.value})} className={selectCls} data-testid="member-share-attribution-select">
                      <option value="name_ref">With referral code (?ref=...)</option>
                      <option value="name_only">Name only — clean link, no code</option>
                    </select>
                    <p className="text-[11px] text-slate-400 mt-1">Default mode for this member's PMS share tasks. A per-task override in the PMS still wins.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Member Level</Label>
                      <select value={editing.level_id || ''} onChange={e => setEditing({...editing, level_id: e.target.value || null})} className={selectCls} data-testid="member-level-select">
                        <option value="">No Level</option>
                        {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                      </select>
                    </div>
                    <div><Label className="text-xs">Membership Ranking</Label>
                      <Input value={editing.membership_ranking || ''} onChange={e => setEditing({...editing, membership_ranking: e.target.value})} className="mt-1" data-testid="membership-ranking-input" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 rounded"><Label className="text-xs font-medium mb-2 block">Membership Status</Label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="membership_status" checked={editing.membership_status === 'Free'} onChange={() => setEditing({...editing, membership_status: 'Free'})} className="accent-[#0D9488]" /><span className="text-sm">Free</span></label>
                        <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="membership_status" checked={editing.membership_status === 'Professional'} onChange={() => setEditing({...editing, membership_status: 'Professional'})} className="accent-[#0D9488]" /><span className="text-sm">Professional</span></label>
                      </div>
                    </div>
                    <div><Label className="text-xs">Membership Fee</Label>
                      <Input type="number" step="0.01" value={editing.membership_fee || ''} onChange={e => setEditing({...editing, membership_fee: e.target.value})} className="mt-1" placeholder="0.00" data-testid="membership-fee-input" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Active Date</Label>
                      <Input type="date" value={editing.active_date || ''} onChange={e => setEditing({...editing, active_date: e.target.value})} className="mt-1" data-testid="active-date-input" />
                    </div>
                    <div><Label className="text-xs">Expiration Date</Label>
                      <Input type="date" value={editing.expiration_date || ''} onChange={e => setEditing({...editing, expiration_date: e.target.value})} className="mt-1" data-testid="expiration-date-input" />
                    </div>
                  </div>
                  <div><Label className="text-xs">Member Type</Label>
                    <select value={editing.member_type_id || ''} onChange={e => setEditing({...editing, member_type_id: e.target.value || ''})} className={selectCls} data-testid="member-type-id-select">
                      <option value="">Select Type</option>
                      {memberTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    {memberTypes.length === 0 && <p className="text-xs text-amber-500 mt-1">No types. Create one in Member Types.</p>}
                    {editing.member_type_id && (() => {
                      const mt = memberTypes.find(t => t.id === editing.member_type_id);
                      if (!mt) return null;
                      const perms = ['corporate','is_mentor','portfolio_development','application_reviewer','opportunities_development','opportunities_reviewer','project_development','project_reviewer','project_management','content_operator'].filter(k => mt[k]);
                      const pageCount = (mt.allowed_pages || []).length;
                      if (!perms.length && !pageCount) return null;
                      return (
                        <div className="mt-2 p-3 bg-[#0D9488]/5 border border-[#0D9488]/20 rounded-sm">
                          <p className="text-xs font-medium text-[#0D9488] mb-1">Inherited from type "{mt.name}":</p>
                          {perms.length > 0 && <div className="flex flex-wrap gap-1 mb-1">{perms.map(p => <span key={p} className="px-1.5 py-0.5 bg-[#0D9488]/10 text-[#0D9488] text-xs rounded">{p.replace(/_/g, ' ')}</span>)}</div>}
                          {pageCount > 0 && <p className="text-xs text-slate-500">{pageCount} page(s) access granted</p>}
                        </div>
                      );
                    })()}
                  </div>
                  <div><Label className="text-xs">Sponsor</Label>
                    <select value={editing.sponsor_membership_number || ''} onChange={e => setEditing({...editing, sponsor_membership_number: e.target.value ? parseInt(e.target.value) : null})} className={selectCls} data-testid="sponsor-select">
                      <option value="">No Sponsor</option>
                      {items.filter(m => m.member_id !== editing.member_id).map(m => <option key={m.member_id} value={m.membership_number}>{m.membership_id} - {m.first_name} {m.last_name}</option>)}
                    </select>
                  </div>
                  <div><Label className="text-xs">Mentor</Label>
                    <select value={editing.mentor_membership_number || ''} onChange={e => setEditing({...editing, mentor_membership_number: e.target.value ? parseInt(e.target.value) : null})} className={selectCls} data-testid="mentor-select">
                      <option value="">No Mentor</option>
                      {mentors.filter(m => m.member_id !== editing.member_id).map(m => <option key={m.member_id} value={m.membership_number}>{m.membership_id} - {m.first_name} {m.last_name}</option>)}
                    </select>
                    {mentors.length === 0 && <p className="text-xs text-amber-500 mt-1">No mentors. Create a Member Type with Mentor permission enabled and assign it to members.</p>}
                  </div>
                  <div className="p-3 bg-slate-50 rounded"><Label className="text-xs font-medium mb-2 block">Create QR Code</Label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="can_create_qr" checked={editing.can_create_qr === true} onChange={() => setEditing({...editing, can_create_qr: true})} className="accent-[#0D9488]" data-testid="can-create-qr-yes" /><span className="text-sm">Yes</span></label>
                      <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" name="can_create_qr" checked={editing.can_create_qr !== true} onChange={() => setEditing({...editing, can_create_qr: false})} className="accent-[#0D9488]" data-testid="can-create-qr-no" /><span className="text-sm">No</span></label>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Allow this member to generate their own QR code from My Account for bulk invitations.</p>
                  </div>
                  {editing.member_id && <div><Label className="text-xs">New Password (leave blank to keep)</Label><Input type="password" value={editing.password || ''} onChange={e => setEditing({...editing, password: e.target.value})} className="mt-1" /></div>}
                </div>
              )}

              {/* Ebank Tab (Read-only) */}
              {tab === 'ebank' && (
                <div className="space-y-3" data-testid="ebank-tab">
                  <p className="text-xs text-slate-400 mb-2">These fields are managed by the member from their My Account.</p>
                  {ebankData ? (
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        ['Investment Amount', ebankData.investment_amount],
                        ['Additional Capital', ebankData.additional_capital],
                        ['Investment Goal', ebankData.investment_goal],
                        ['Monthly Savings', ebankData.monthly_savings],
                        ['Deposit Date', ebankData.deposit_date],
                        ['Target Date', ebankData.target_date],
                        ['Credit Limit', ebankData.credit_limit],
                        ['Credit Debt', ebankData.credit_debt],
                        ['Risk Level (1-5)', ebankData.risk_level],
                        ['Finance Involvement (1-5)', ebankData.finance_involvement],
                        ['Investment Safety (1-5)', ebankData.investment_safety],
                        ['Financial Independence Age', ebankData.financial_independence_age],
                        ['Rate of Return', ebankData.rate_of_return],
                        ['Investment Duration', ebankData.investment_duration],
                        ['Start Own Business?', ebankData.own_business],
                        ['Projects', ebankData.projects],
                      ].map(([label, val]) => (
                        <div key={label} className="p-2.5 bg-slate-50 rounded border border-slate-100">
                          <p className="text-xs text-slate-400">{label}</p>
                          <p className="text-sm font-medium text-[#1a2332] mt-0.5">{val || '-'}</p>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-sm text-slate-400 text-center py-8">No Ebank data available for this member.</p>}
                </div>
              )}

              {/* Business Card Tab */}
              {tab === 'business-card' && (
                <div className="space-y-4" data-testid="business-card-tab">
                  <div>
                    <Label className="text-xs font-medium">Generate QR</Label>
                    {editing.qr_code ? (
                      <div className="mt-2 space-y-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => {
                            const w = window.open('', '_blank');
                            w.document.write(`<html><body style="display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0"><img src="${editing.qr_code}" style="max-width:400px" /></body></html>`);
                          }} className="text-[#0D9488] underline text-sm font-medium" data-testid="view-qr-btn">View QR</button>
                        </div>
                        <img src={editing.qr_code} alt="QR Code" className="w-48 h-48 border rounded" data-testid="qr-image" />
                        <p className="text-xs text-slate-400 break-all">{editing.qr_url}</p>
                      </div>
                    ) : (
                      <div className="mt-2">
                        <button onClick={async () => {
                          if (!editing.member_id) { toast.error('Save the member first'); return; }
                          setQrLoading(true);
                          try {
                            // No base_url passed — backend uses CMS Settings → Site URL (strict).
                            const r = await adminAPI.generateMemberQR(editing.member_id, {});
                            setEditing(prev => ({ ...prev, qr_code: r.data.qr_code, qr_url: r.data.qr_url }));
                            toast.success('QR generated!');
                          } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to generate QR'); }
                          finally { setQrLoading(false); }
                        }} className="text-[#0D9488] underline text-sm font-medium" disabled={qrLoading} data-testid="generate-qr-btn">
                          {qrLoading ? 'Generating...' : 'Click Here'}
                        </button>
                        <p className="text-xs text-slate-400 mt-1">Generate a QR code for sponsor-based registration.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button onClick={handleSave} disabled={loading} className="w-full mt-4 bg-[#0D9488] text-white py-2 rounded-sm text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50" data-testid="member-save-btn">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* CMS Roles inline assignment */}
      <Dialog open={!!rolesDialog} onOpenChange={(o) => { if (!o) setRolesDialog(null); }}>
        <DialogContent className="sm:max-w-[480px]" data-testid="member-cms-roles-dialog">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Lock className="w-4 h-4 text-[#0D9488]" /> CMS Roles — {rolesDialog?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-slate-500">Assign one or more CMS roles to this member. They keep their My Account access regardless.</p>
            <div className="border border-slate-200 rounded-sm divide-y divide-slate-100 max-h-[55vh] overflow-y-auto">
              {cmsRoles.map(r => {
                const checked = rolesDialog?.selected?.includes(r.id);
                return (
                  <label key={r.id} className="flex items-start gap-3 p-3 hover:bg-slate-50 cursor-pointer">
                    <input type="checkbox" checked={!!checked}
                      onChange={(e) => {
                        setRolesDialog(d => ({
                          ...d,
                          selected: e.target.checked
                            ? Array.from(new Set([...(d.selected || []), r.id]))
                            : (d.selected || []).filter(x => x !== r.id),
                        }));
                      }}
                      className="mt-1 w-4 h-4 accent-[#0D9488]"
                      data-testid={`member-roles-toggle-${r.id}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-sm text-[#1a2332]">{r.name}</div>
                        {r.is_system && <span className="text-[10px] uppercase tracking-wider bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">System</span>}
                        {r.full_access && <span className="text-[10px] uppercase tracking-wider bg-[#0D9488]/10 text-[#0D9488] px-1.5 py-0.5 rounded">Full</span>}
                      </div>
                      {r.description && <div className="text-xs text-slate-500 mt-0.5">{r.description}</div>}
                      <div className="text-[10px] text-slate-400 mt-1">{r.full_access ? 'All sections' : `${(r.permissions || []).length} sections`}</div>
                    </div>
                  </label>
                );
              })}
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setRolesDialog(null)} className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-sm text-sm hover:bg-slate-50" data-testid="member-roles-cancel"><X className="w-3.5 h-3.5" /> Cancel</button>
              <button
                onClick={async () => {
                  try {
                    await adminAPI.assignMemberCmsRoles(rolesDialog.memberId, rolesDialog.selected || []);
                    toast.success('Roles updated');
                    setRolesDialog(null);
                    load();
                  } catch (e) { toast.error(e.response?.data?.detail || 'Save failed'); }
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#0D9488] text-white rounded-sm text-sm font-medium hover:bg-[#0b7a70]"
                data-testid="member-roles-save"
              ><Save className="w-3.5 h-3.5" /> Save</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Member Info + Enrollment Q&A */}
      <Dialog open={!!infoMember} onOpenChange={(o) => { if (!o) setInfoMember(null); }}>
        <DialogContent className="sm:max-w-[760px] max-h-[85vh] overflow-y-auto" data-testid="member-info-dialog">
          {infoMember && (
            <>
              <DialogHeader>
                <DialogTitle style={{ fontFamily: 'Playfair Display, serif' }}>
                  Member Information
                </DialogTitle>
              </DialogHeader>

              {/* Identity */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {infoMember.avatar
                    ? <img src={infoMember.avatar} alt="" className="w-full h-full object-cover" />
                    : <span className="text-slate-400 text-lg font-semibold">{(infoMember.first_name || infoMember.email || '?')[0].toUpperCase()}</span>}
                </div>
                <div className="min-w-0">
                  <p className="text-base font-semibold text-[#1a2332] truncate">
                    {infoMember.first_name} {infoMember.last_name}
                  </p>
                  <p className="text-xs text-[#0D9488] font-mono">{infoMember.membership_id}</p>
                  <p className="text-xs text-slate-500 truncate">{infoMember.email}</p>
                </div>
              </div>

              {/* Profile facts */}
              <div className="grid grid-cols-2 gap-3 text-xs mb-5 bg-slate-50 rounded-sm border border-slate-100 p-3" data-testid="member-info-profile">
                {[
                  ['Phone',         infoMember.phone],
                  ['Gender',        infoMember.gender],
                  ['Date of Birth', infoMember.date_of_birth],
                  ['Country',       infoMember.country],
                  ['State',         infoMember.state],
                  ['City',          infoMember.city],
                  ['ZIP Code',      infoMember.zip_code],
                  ['Address',       infoMember.address],
                  ['Member Type',   memberTypes.find(t => t.id === infoMember.member_type_id)?.name],
                  ['Member Level',  levels.find(l => l.id === infoMember.level_id)?.name],
                  ['Mentor',        infoMember.is_mentor ? 'Yes' : 'No'],
                  ['Sponsor',       infoMember.sponsor_membership_number ? `AUX-${infoMember.sponsor_membership_number}` : null],
                  ['Status',        infoMember.membership_status],
                  ['Registered',    infoMember.created_at ? new Date(infoMember.created_at).toLocaleDateString() : null],
                ].map(([k, val]) => (
                  <div key={k}>
                    <span className="text-slate-500">{k}:</span>
                    <p className="text-slate-700">{val || <span className="text-slate-300">—</span>}</p>
                  </div>
                ))}
              </div>

              {/* Enrollment Q&A */}
              <h3 className="text-sm font-semibold text-[#1a2332] mb-2">Membership Enrollment</h3>
              {infoLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
              ) : !infoEnrollment?.has_application ? (
                <p className="text-xs text-slate-500 italic bg-slate-50 rounded-sm border border-slate-100 p-4 text-center" data-testid="member-info-no-enrollment">
                  This member was created directly from the CMS, so there are no
                  enrollment-form answers to display. The basic profile data
                  shown above was entered manually.
                </p>
              ) : (
                <>
                  {infoEnrollment.submitted_at && (
                    <p className="text-[11px] text-slate-400 mb-2">
                      Submitted {new Date(infoEnrollment.submitted_at).toLocaleString()}
                    </p>
                  )}
                  <div className="border border-slate-100 rounded-sm divide-y divide-slate-100" data-testid="member-info-enrollment">
                    {(infoEnrollment.answers || []).map((a, i) => {
                      // Defensive: backend already flattens but in case any
                      // legacy value sneaks through as an object/array, coerce
                      // to a string so React never crashes on a raw dict.
                      let displayValue = a.value;
                      if (displayValue && typeof displayValue === 'object') {
                        if (Array.isArray(displayValue)) {
                          displayValue = displayValue.join(', ');
                        } else {
                          displayValue = Object.entries(displayValue)
                            .filter(([, v]) => v)
                            .map(([k]) => k)
                            .join(', ');
                        }
                      }
                      return (
                      <div key={`${a.field_key}-${i}`} className="p-3" data-testid={`enrollment-row-${a.field_key}`}>
                        <div className="flex items-baseline gap-2">
                          {a.step ? <span className="text-[10px] font-mono text-[#0D9488] bg-teal-50 px-1.5 py-0.5 rounded">Step {a.step}</span> : null}
                          <span className="text-xs font-medium text-slate-700">{a.label}</span>
                        </div>
                        <p className="text-sm text-[#1a2332] mt-1 break-words whitespace-pre-wrap">
                          {displayValue || <span className="text-slate-300 italic">— not answered —</span>}
                        </p>
                      </div>
                      );
                    })}
                    {(!infoEnrollment.answers || infoEnrollment.answers.length === 0) && (
                      <p className="p-4 text-xs text-slate-400 italic text-center">No answers recorded.</p>
                    )}
                  </div>
                </>
              )}

              <div className="flex justify-end mt-4">
                <button
                  onClick={() => setInfoMember(null)}
                  className="px-3 py-1.5 text-sm rounded-sm border border-slate-200 hover:bg-slate-50"
                  data-testid="member-info-close"
                >Close</button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
