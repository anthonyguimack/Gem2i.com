import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useMember } from '../../lib/memberAuth';
import { memberAPI, publicAPI } from '../../lib/api';
import { User, Search, X, Users, MailPlus, UserCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
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

const FILTERS = [
  { key: 'membership_number', label: 'Membership number' },
  { key: 'first_name', label: 'First name' },
  { key: 'last_name', label: 'Last name' },
];

export default function MyCommunity() {
  const { member } = useMember();
  const [data, setData] = useState({ tree: [], total_invites: 0, used_invites: 0 });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('membership_number');
  const [selected, setSelected] = useState(null);
  const [settings, setSettings] = useState({});
  const [inviting, setInviting] = useState(false);
  const [inviteDest, setInviteDest] = useState('');   // '' | 'my_account' | 'membership_enrollment'
  const [inviteResult, setInviteResult] = useState(null);
  const ctx = useOutletContext() || {};

  useEffect(() => { setInviteResult(null); setInviteDest(''); }, [selected]);

  const handleInviteToMembership = async () => {
    if (!selected) return;
    // Carlos 2026-09-02: hay que elegir a cuál de las 2 vías de ingreso se invita
    // (My Account o Membership Enrollment) antes de enviar.
    if (!inviteDest) {
      setInviteResult({ ok: false, msg: 'Choose where to invite them: My Account or Membership Enrollment.' });
      return;
    }
    setInviting(true); setInviteResult(null);
    try {
      const r = await memberAPI.inviteToMembership(selected.member_id, inviteDest);
      const code = r.data && r.data.code && r.data.code.code;
      setInviteResult({ ok: true, code, already: r.data && r.data.message === 'already_invited' });
      memberAPI.getCommunity().then(res => setData(res.data)).catch(() => {});
    } catch (e) {
      setInviteResult({ ok: false, msg: (e.response && e.response.data && e.response.data.detail) || 'Could not create the invitation.' });
    } finally { setInviting(false); }
  };
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

  const avatar = member?.avatar || defaultAvatar;

  const fmtDate = (d) => {
    if (!d) return '';
    const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[2]}/${m[3]}/${m[1]}` : d;
  };

  const modalFields = selected ? [
    { label: 'Email', value: selected.email },
    { label: 'Phone', value: selected.phone },
    { label: 'Gender', value: selected.gender },
    { label: 'Date of Birth', value: fmtDate(selected.date_of_birth) },
    { label: 'Country', value: selected.country },
    { label: 'State', value: selected.state },
    { label: 'City', value: selected.city },
    { label: 'ZIP Code', value: selected.zip_code },
  ] : [];

  return (
    <div data-testid="my-community-page">
      <div className="mb-4">
        <h1 className="text-[15px] font-semibold" style={{ color: 'var(--ma2-heading, #495057)' }} data-testid="my-community-title">{title}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-4">
          {/* Identity band — this page is about the member's own network */}
          <div className="ma2-band" data-testid="community-identity">
            <div className="flex items-center gap-3">
              <div className="rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
                style={{ width: 64, height: 64, backgroundColor: 'rgba(255,255,255,0.12)', border: '3px solid rgba(255,255,255,0.20)' }}>
                {avatar
                  ? <img src={avatar} alt="" className="w-full h-full object-cover" />
                  : <User className="w-7 h-7" style={{ color: 'rgba(255,255,255,0.6)' }} />}
              </div>
              <div className="min-w-0">
                <p className="ma2-profile-name truncate">{member?.first_name} {member?.last_name}</p>
                <p className="ma2-profile-meta">{member?.membership_id}</p>
              </div>
            </div>
          </div>

          <div className="ma2-stat" data-testid="invites-total-card">
            <div>
              <p className="ma2-stat-label">Membership Invitations</p>
              <p className="ma2-stat-value" data-testid="total-invites">{data.total_invites}</p>
              <p className="ma2-stat-sub">Keys issued to you</p>
            </div>
            <span className="ma2-stat-icon"><MailPlus className="w-4 h-4" /></span>
          </div>

          <div className="ma2-stat" data-testid="invites-used-card">
            <div>
              <p className="ma2-stat-label">Invited Members</p>
              <p className="ma2-stat-value" data-testid="used-invites">{data.used_invites}</p>
              <p className="ma2-stat-sub">Registered under you</p>
            </div>
            <span className="ma2-stat-icon" style={{ background: 'color-mix(in srgb, var(--ma2-success) 12%, transparent)', color: 'var(--ma2-success, #0ab39c)' }}>
              <UserCheck className="w-4 h-4" />
            </span>
          </div>
        </div>

        <div className="lg:col-span-2 ma2-card">
          <div className="ma2-card-head">
            <h2 className="ma2-card-title">Members Info</h2>
          </div>

          <div className="ma2-card-body" style={{ paddingBottom: '0.75rem' }}>
            <div className="ma2-search" style={{ maxWidth: 'none', marginLeft: 0 }}>
              <Search className="w-3.5 h-3.5" aria-hidden="true" />
              <input type="search" className="ma2-input" value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search your community…" aria-label="Search your community"
                style={{ paddingRight: search ? '2.1rem' : undefined }}
                data-testid="community-search" />
              {search && (
                <button onClick={() => setSearch('')} className="ma2-icon-btn"
                  style={{ position: 'absolute', right: '0.2rem', top: '50%', transform: 'translateY(-50%)' }}
                  aria-label="Clear search">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
              <span className="text-[12px]" style={{ color: 'var(--ma2-faint, #adb5bd)' }}>Search by</span>
              {FILTERS.map(f => (
                <label key={f.key} className="ma2-radio">
                  <input type="radio" name="communityFilter" value={f.key}
                    checked={filter === f.key} onChange={e => setFilter(e.target.value)} />
                  <span>{f.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Flat hit list — faster than hunting the match inside the tree */}
          {search && searchResults.length > 0 && (
            <div style={{ borderTop: '1px solid var(--ma2-border, #e9ebec)', background: 'var(--ma2-light, #f3f6f9)' }}
              data-testid="community-search-results">
              <div className="px-5 pt-3 pb-1">
                <p className="text-[12px]" style={{ color: 'var(--ma2-muted, #878a99)' }}>
                  {searchResults.length} {searchResults.length === 1 ? 'match' : 'matches'}
                </p>
              </div>
              <div className="px-3 pb-3 max-h-48 overflow-y-auto">
                {searchResults.map(n => (
                  <button key={n.member_id} onClick={() => setSelected(n)}
                    className="ma2-popover-item flex items-center gap-2 rounded"
                    style={{ background: 'transparent' }}
                    data-testid={`search-result-${n.membership_id}`}>
                    <span className="ma2-mono" style={{ color: 'var(--ma2-primary, #405189)' }}>{n.membership_id}</span>
                    <span>{n.first_name} {n.last_name}</span>
                    {n.account_status === 'pre_registered' && (
                      <span style={{ marginLeft: 'auto', padding: '1px 6px', borderRadius: 4, fontSize: 9, fontWeight: 600, background: '#fef3c7', color: '#b45309' }}>Pre-reg</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="ma2-card-body max-h-[500px] overflow-y-auto" style={{ borderTop: '1px solid var(--ma2-border, #e9ebec)' }}>
            {displayTree.length > 0 ? (
              <CommunityTree tree={displayTree} onSelect={setSelected} />
            ) : search ? (
              <div className="ma2-empty">
                <div className="ma2-empty-icon"><Search className="w-5 h-5" /></div>
                <p className="ma2-empty-title">No matches for “{search}”</p>
                <p className="ma2-empty-text">Try another term, or switch which field you are searching by.</p>
              </div>
            ) : (
              <div className="ma2-empty">
                <div className="ma2-empty-icon"><Users className="w-5 h-5" /></div>
                <p className="ma2-empty-title">Your community is empty</p>
                <p className="ma2-empty-text">
                  Send an invite key from <strong>Invite Code</strong> — everyone who registers with one of your keys
                  appears here, with the members they invite nested underneath.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Member profile modal */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="ma2-modal sm:max-w-[520px]" data-testid="member-profile-modal">
          <DialogHeader className="ma2-modal-header">
            <DialogTitle className="ma2-modal-title">Member Profile</DialogTitle>
            <DialogDescription className="ma2-modal-desc">A member of your community network.</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="ma2-modal-body">
              <div className="flex items-center gap-3 pb-4 mb-4" style={{ borderBottom: '1px solid var(--ma2-border, #e9ebec)' }}>
                <div className="rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
                  style={{ width: 56, height: 56, background: 'color-mix(in srgb, var(--ma2-primary) 12%, transparent)', border: '1px solid var(--ma2-border, #e9ebec)' }}
                  data-testid="community-modal-avatar">
                  {selected.avatar ? (
                    <img src={selected.avatar}
                      alt={`${selected.first_name || ''} ${selected.last_name || ''}`.trim() || selected.membership_id}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      data-testid="community-modal-photo" />
                  ) : (
                    <span className="text-lg font-semibold" style={{ color: 'var(--ma2-primary, #405189)' }}>
                      {(selected.first_name || '?')[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold truncate" style={{ color: 'var(--ma2-body, #212529)' }}>
                    {selected.first_name} {selected.last_name}
                  </p>
                  <p className="ma2-mono" style={{ color: 'var(--ma2-primary, #405189)' }}>{selected.membership_id}
                    {selected.account_status === 'pre_registered' && (
                      <span style={{ marginLeft: 8, padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: '#fef3c7', color: '#b45309' }}>Pre-registered</span>
                    )}
                  </p>
                </div>
              </div>
              {inviteResult && (
                <div data-testid="community-invite-result" style={{ marginBottom: 14, padding: '10px 12px', borderRadius: 8, fontSize: 13, border: '1px solid', background: inviteResult.ok ? '#ecfdf5' : '#fef2f2', color: inviteResult.ok ? '#047857' : '#b91c1c', borderColor: inviteResult.ok ? '#a7f3d0' : '#fecaca' }}>
                  {inviteResult.ok
                    ? <span>{inviteResult.already ? 'Already invited. ' : 'Invitation created. '}Code: <b>{inviteResult.code}</b> — it appears in <b>Invite Code</b>.</span>
                    : inviteResult.msg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3" data-testid="community-member-extra-fields">
                {modalFields.map(f => (
                  <div key={f.label} className="flex items-start gap-2"
                    data-testid={`community-modal-${f.label.toLowerCase().replace(/\s+/g, '-')}`}>
                    <span className="ma2-dt flex-shrink-0" style={{ minWidth: '6.5rem' }}>{f.label} :</span>
                    <span className="ma2-dd">{f.value || '—'}</span>
                  </div>
                ))}
              </div>

              {/* Vía de ingreso — DENTRO de ma2-modal-body para alinear con los campos.
                  El botón del email apunta a My Account (register) o a Membership
                  Enrollment según lo marcado; ambas auto-rellenan el invite code. */}
              {selected.account_status === 'pre_registered' && (
                <div className="ma2-invite-dest" data-testid="community-invite-dest"
                  style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 18, marginTop: 16, fontSize: 13 }}>
                  <span style={{ fontWeight: 600 }}>Invite to:</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input type="radio" name="inviteDest" value="my_account"
                      checked={inviteDest === 'my_account'} onChange={() => setInviteDest('my_account')} />
                    My Account
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input type="radio" name="inviteDest" value="membership_enrollment"
                      checked={inviteDest === 'membership_enrollment'} onChange={() => setInviteDest('membership_enrollment')} />
                    Membership Enrollment
                  </label>
                </div>
              )}
            </div>
          )}
          {/* Ruled footer with an explicit Close — the reference never leaves the
              ✕ as the only way out of a dialog. */}
          <div className="ma2-modal-footer">
            {selected && selected.account_status === 'pre_registered' && (
              <button onClick={handleInviteToMembership} disabled={inviting || !inviteDest} className="ma2-btn"
                data-testid="community-invite-btn"
                style={{ background: 'var(--ma2-primary, #405189)', color: '#fff', border: 'none', opacity: (!inviteDest ? 0.55 : 1) }}>
                <UserCheck className="w-4 h-4" style={{ marginRight: 6, display: 'inline', verticalAlign: '-2px' }} />
                {inviting ? 'Inviting…' : 'Invite to membership'}
              </button>
            )}
            <button onClick={() => setSelected(null)} className="ma2-btn ma2-btn-light" data-testid="community-modal-close">Close</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
