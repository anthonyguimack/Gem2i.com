import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useMember } from '../../lib/memberAuth';
import { memberAPI, publicAPI } from '../../lib/api';
import { User, Search, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import CommunityTree from '../../components/TreeNode';

function flattenAll(nodes) {
  const result = [];
  for (const node of nodes) {
    result.push(node);
    if (node.children?.length) result.push(...flattenAll(node.children));
  }
  return result;
}

function filterNodes(nodes, q, field) {
  if (!q) return nodes;
  const lq = q.toLowerCase();
  return nodes.reduce((acc, node) => {
    let val = '';
    if (field === 'membership_number') val = node.membership_id || '';
    else if (field === 'first_name') val = node.first_name || '';
    else val = node.last_name || '';
    const match = val.toLowerCase().includes(lq);
    const kids = filterNodes(node.children || [], q, field);
    if (match || kids.length > 0) acc.push({ ...node, children: kids });
    return acc;
  }, []);
}

export default function MyCommunity() {
  const { member } = useMember();
  const [data, setData] = useState({ tree: [], total_invites: 0, used_invites: 0 });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('membership_number');
  const [selected, setSelected] = useState(null);
  const [settings, setSettings] = useState({});
  const ctx = useOutletContext() || {};
  const title = ctx.sectionLabel ? ctx.sectionLabel('my-community', 'My Community') : 'My Community';

  useEffect(() => {
    memberAPI.getCommunity().then(r => setData(r.data)).catch(console.error);
    publicAPI.getSettings().then(r => setSettings(r.data)).catch(() => {});
  }, []);

  const defaultAvatar = settings.membership_default_avatar || '';
  const displayTree = filterNodes(data.tree, search, filter);

  // Flat search results for clickable list
  const allFlat = useMemo(() => flattenAll(data.tree), [data.tree]);
  const searchResults = useMemo(() => {
    if (!search) return [];
    const lq = search.toLowerCase();
    return allFlat.filter(n => {
      let val = '';
      if (filter === 'membership_number') val = n.membership_id || '';
      else if (filter === 'first_name') val = n.first_name || '';
      else val = n.last_name || '';
      return val.toLowerCase().includes(lq);
    });
  }, [search, filter, allFlat]);

  return (
    <div data-testid="my-community-page">
      <h1 className="text-2xl font-bold text-white mb-6" style={{ fontFamily: "'DM Serif Display', serif" }} data-testid="my-community-title">{title}</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="bg-[#13161e] border border-white/5 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-gray-400 mb-4">Sponsored Members</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-[#0d0f14] rounded">
                <span className="text-xs text-gray-400">Membership Invitation</span>
                <span className="text-lg font-bold" style={{ color: 'var(--ma-accent, #c9a84c)' }} data-testid="total-invites">{data.total_invites}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-[#0d0f14] rounded">
                <span className="text-xs text-gray-400">Invited Members</span>
                <span className="text-lg font-bold text-white" data-testid="used-invites">{data.used_invites}</span>
              </div>
            </div>
          </div>
          <div className="bg-[#13161e] border border-white/5 rounded-lg p-6 flex flex-col items-center">
            <div className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden" style={{ backgroundColor: 'var(--ma-avatar-bg, rgba(201,168,76,0.1))', border: '2px solid var(--ma-avatar-border, rgba(201,168,76,0.3))' }}>
              {(member?.avatar || defaultAvatar) ? (
                <img src={member?.avatar || defaultAvatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10" style={{ color: 'var(--ma-accent, #c9a84c)', opacity: 0.5 }} />
              )}
            </div>
            <p className="mt-2 text-white text-sm font-medium">{member?.first_name} {member?.last_name}</p>
            <p className="text-xs" style={{ color: 'var(--ma-accent, #c9a84c)' }}>{member?.membership_id}</p>
          </div>
        </div>
        <div className="lg:col-span-2 bg-[#13161e] border border-white/5 rounded-lg">
          <div className="p-4 border-b border-white/5">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">Members Info</h3>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-[#0d0f14] border border-white/10 rounded overflow-hidden flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-gray-500 ml-3" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
                  className="flex-1 px-3 py-2 bg-transparent text-white text-sm focus:outline-none" data-testid="community-search" />
                {search && <button onClick={() => setSearch('')} className="p-2 text-gray-500 hover:text-white"><X className="w-3 h-3" /></button>}
              </div>
              {['membership_number', 'first_name', 'last_name'].map(f => (
                <label key={f} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="communityFilter" value={f} checked={filter === f} onChange={e => setFilter(e.target.value)} style={{ accentColor: 'var(--ma-accent, #c9a84c)' }} />
                  <span className="text-xs text-gray-400 capitalize">{f.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </div>
          {/* Search Results List */}
          {search && searchResults.length > 0 && (
            <div className="px-4 py-2 border-b border-white/5 bg-[#0d0f14]/50 max-h-48 overflow-y-auto" data-testid="community-search-results">
              <p className="text-xs text-gray-500 mb-2">{searchResults.length} result(s) found</p>
              {searchResults.map(n => (
                <button key={n.member_id} onClick={() => setSelected(n)}
                  className="w-full text-left px-3 py-2 rounded text-sm text-gray-300 hover:text-white flex items-center gap-2"
                  style={{ '--hover-bg': 'var(--ma-accent, #c9a84c)' }}
                  data-testid={`search-result-${n.membership_id}`}>
                  <span className="font-mono text-xs" style={{ color: 'var(--ma-accent, #c9a84c)' }}>{n.membership_id}</span>
                  <span>{n.first_name} {n.last_name}</span>
                </button>
              ))}
            </div>
          )}
          <div className="p-4 max-h-[500px] overflow-y-auto">
            {displayTree.length > 0 ? (
              <CommunityTree tree={displayTree} onSelect={setSelected} />
            ) : <p className="text-center text-gray-500 text-sm py-8">No members in your community yet</p>}
          </div>
        </div>
      </div>
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="bg-[#13161e] border-white/10 text-white" data-testid="member-profile-modal">
          <DialogHeader><DialogTitle className="text-white" style={{ fontFamily: "'DM Serif Display', serif" }}>Member Profile</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
                  style={{
                    backgroundColor: 'var(--ma-avatar-bg, rgba(201,168,76,0.1))',
                    border: `2px solid var(--ma-avatar-border, rgba(201,168,76,0.3))`,
                  }}
                  data-testid="community-modal-avatar"
                >
                  {selected.avatar ? (
                    <img
                      src={selected.avatar}
                      alt={`${selected.first_name || ''} ${selected.last_name || ''}`.trim() || selected.membership_id}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      data-testid="community-modal-photo"
                    />
                  ) : (
                    <span className="font-bold text-lg" style={{ color: 'var(--ma-accent, #c9a84c)' }}>
                      {(selected.first_name || '?')[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-medium text-white">{selected.first_name} {selected.last_name}</p>
                  <p className="text-xs" style={{ color: 'var(--ma-accent, #c9a84c)' }}>{selected.membership_id}</p>
                </div>
              </div>
              {selected.email && <div><span className="text-xs text-gray-500">Email:</span><p className="text-sm text-white">{selected.email}</p></div>}
              {(() => {
                const fmtDate = (d) => {
                  if (!d) return '-';
                  const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
                  return m ? `${m[2]}/${m[3]}/${m[1]}` : d;
                };
                const fields = [
                  { label: 'Phone',         value: selected.phone },
                  { label: 'Gender',        value: selected.gender },
                  { label: 'Date of Birth', value: fmtDate(selected.date_of_birth) },
                  { label: 'Country',       value: selected.country },
                  { label: 'State',         value: selected.state },
                  { label: 'City',          value: selected.city },
                  { label: 'ZIP Code',      value: selected.zip_code },
                ];
                return (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5" data-testid="community-member-extra-fields">
                    {fields.map(f => (
                      <div key={f.label} data-testid={`community-modal-${f.label.toLowerCase().replace(/\s+/g, '-')}`}>
                        <span className="text-xs text-gray-500">{f.label}:</span>
                        <p className="text-sm text-white">{f.value || <span className="text-gray-600">—</span>}</p>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
