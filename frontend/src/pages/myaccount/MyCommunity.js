import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useMember } from '../../lib/memberAuth';
import { memberAPI, publicAPI } from '../../lib/api';
import { useT } from '../../lib/i18n';
import { User, Search, X, Loader2, RotateCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import CommunityTree from '../../components/TreeNode';

const v = (name) => `var(--ma-${name})`;

const L = {
  title: { en: 'My Community', es: 'Mi comunidad' },
  sponsored: { en: 'Sponsored members', es: 'Miembros patrocinados' },
  invitations: { en: 'Invitations created', es: 'Invitaciones creadas' },
  invited: { en: 'Invited members', es: 'Miembros invitados' },
  membersInfo: { en: 'Members', es: 'Miembros' },
  search: { en: 'Search your community', es: 'Buscar en tu comunidad' },
  clear: { en: 'Clear search', es: 'Borrar búsqueda' },
  searchBy: { en: 'Search by', es: 'Buscar por' },
  byId: { en: 'Membership ID', es: 'ID de miembro' },
  byFirst: { en: 'First name', es: 'Nombre' },
  byLast: { en: 'Last name', es: 'Apellido' },
  results: { en: '{n} result(s)', es: '{n} resultado(s)' },
  noResults: { en: 'No members match “{q}”.', es: 'Ningún miembro coincide con «{q}».' },
  loading: { en: 'Loading your community…', es: 'Cargando tu comunidad…' },
  loadFailed: { en: 'Could not load your community.', es: 'No se pudo cargar tu comunidad.' },
  retry: { en: 'Try again', es: 'Reintentar' },
  empty: { en: 'No one has joined under you yet. Share an invite code or your QR from the Invite Code page to grow your community.', es: 'Todavía nadie se ha unido bajo tu patrocinio. Comparte un código de invitación o tu QR desde la página Código de invitación para hacer crecer tu comunidad.' },
  profile: { en: 'Member profile', es: 'Perfil del miembro' },
  country: { en: 'Country', es: 'País' },
  state: { en: 'State', es: 'Estado / Provincia' },
  city: { en: 'City', es: 'Ciudad' },
  privacyNote: { en: 'Contact details stay private to each member.', es: 'Los datos de contacto de cada miembro son privados.' },
};

const FILTERS = [
  { key: 'membership_number', label: 'byId', get: (n) => n.membership_id },
  { key: 'first_name', label: 'byFirst', get: (n) => n.first_name },
  { key: 'last_name', label: 'byLast', get: (n) => n.last_name },
];
const valueFor = (node, field) => String((FILTERS.find((x) => x.key === field) || FILTERS[0]).get(node) || '').toLowerCase();

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
    const kids = filterNodes(node.children || [], q, field);
    if (valueFor(node, field).includes(lq) || kids.length > 0) acc.push({ ...node, children: kids });
    return acc;
  }, []);
}

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';

export default function MyCommunity() {
  const tt = useT();
  const f = (key, vars = {}) => Object.entries(vars).reduce((s, [k, val]) => s.replace(`{${k}}`, val), tt(L[key]));
  const { member } = useMember();
  const [data, setData] = useState({ tree: [], total_invites: 0, used_invites: 0 });
  const [loadState, setLoadState] = useState('loading');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('membership_number');
  const [selected, setSelected] = useState(null);
  const [settings, setSettings] = useState({});
  const ctx = useOutletContext() || {};
  const title = ctx.sectionLabel ? ctx.sectionLabel('my-community', tt(L.title)) : tt(L.title);

  const load = useCallback(() => {
    setLoadState('loading');
    memberAPI.getCommunity()
      .then((r) => { setData({ tree: [], total_invites: 0, used_invites: 0, ...r.data }); setLoadState('ready'); })
      .catch(() => setLoadState('error'));
  }, []);

  useEffect(() => {
    load();
    publicAPI.getSettings().then((r) => setSettings(r.data || {})).catch(() => {});
  }, [load]);

  const defaultAvatar = settings.membership_default_avatar || '';
  const query = search.trim();
  const displayTree = useMemo(() => filterNodes(data.tree || [], query, filter), [data.tree, query, filter]);
  const allFlat = useMemo(() => flattenAll(data.tree || []), [data.tree]);
  const searchResults = useMemo(() => {
    if (!query) return [];
    const lq = query.toLowerCase();
    return allFlat.filter((n) => valueFor(n, filter).includes(lq));
  }, [query, filter, allFlat]);

  const card = { backgroundColor: v('card-bg'), borderColor: v('card-border') };
  const hasMembers = (data.tree || []).length > 0;

  return (
    <div data-testid="my-community-page">
      <h1 className="text-2xl font-bold mb-6" style={{ color: v('text-primary'), textWrap: 'balance' }} data-testid="my-community-title">{title}</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <section className="border rounded-lg p-5" style={card} aria-labelledby="community-stats-heading">
            <h2 id="community-stats-heading" className="text-sm font-semibold mb-4" style={{ color: v('text-secondary') }}>{tt(L.sponsored)}</h2>
            <dl className="space-y-3">
              <div className="flex justify-between items-center gap-3 p-3 rounded" style={{ backgroundColor: v('input-bg') }}>
                <dt className="text-xs" style={{ color: v('text-secondary') }}>{tt(L.invitations)}</dt>
                <dd className="text-lg font-bold tabular-nums" style={{ color: v('accent') }} data-testid="total-invites">{data.total_invites ?? 0}</dd>
              </div>
              <div className="flex justify-between items-center gap-3 p-3 rounded" style={{ backgroundColor: v('input-bg') }}>
                <dt className="text-xs" style={{ color: v('text-secondary') }}>{tt(L.invited)}</dt>
                <dd className="text-lg font-bold tabular-nums" style={{ color: v('text-primary') }} data-testid="used-invites">{data.used_invites ?? 0}</dd>
              </div>
            </dl>
          </section>
          <div className="border rounded-lg p-6 flex flex-col items-center text-center" style={card}>
            <div className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden" style={{ backgroundColor: v('avatar-bg'), border: `2px solid ${v('avatar-border')}` }}>
              {(member?.avatar || defaultAvatar) ? (
                <img src={member?.avatar || defaultAvatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10" style={{ color: v('accent'), opacity: 0.6 }} aria-hidden="true" />
              )}
            </div>
            <p className="mt-2 text-sm font-medium break-words max-w-full" style={{ color: v('text-primary') }}>{member?.first_name} {member?.last_name}</p>
            <p className="text-xs" style={{ color: v('accent') }}>{member?.membership_id}</p>
          </div>
        </div>

        <section className="lg:col-span-2 border rounded-lg min-w-0" style={card} aria-labelledby="community-members-heading">
          <div className="p-4 border-b" style={{ borderColor: v('card-border') }}>
            <h2 id="community-members-heading" className="text-sm font-semibold mb-3" style={{ color: v('text-secondary') }}>{tt(L.membersInfo)}</h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex items-center border rounded overflow-hidden flex-1 min-w-[200px]" style={{ backgroundColor: v('input-bg'), borderColor: v('input-border') }}>
                <Search className="w-4 h-4 ms-3 flex-shrink-0" style={{ color: v('text-muted') }} aria-hidden="true" />
                <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tt(L.search)} aria-label={tt(L.search)}
                  disabled={loadState !== 'ready' || !hasMembers}
                  className="flex-1 min-w-0 px-3 py-2 bg-transparent text-sm focus:outline-none disabled:opacity-50" style={{ color: v('text-primary') }} data-testid="community-search" />
                {search && (
                  <button type="button" onClick={() => setSearch('')} aria-label={tt(L.clear)} className={`p-2 transition-opacity hover:opacity-80 ${focusRing}`} style={{ color: v('text-secondary'), outlineColor: v('accent') }}>
                    <X className="w-3 h-3" aria-hidden="true" />
                  </button>
                )}
              </div>
              <fieldset className="flex flex-wrap items-center gap-3">
                <legend className="sr-only">{tt(L.searchBy)}</legend>
                {FILTERS.map((opt) => (
                  <label key={opt.key} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="communityFilter" value={opt.key} checked={filter === opt.key} onChange={(e) => setFilter(e.target.value)} style={{ accentColor: v('accent') }} />
                    <span className="text-xs" style={{ color: v('text-secondary') }}>{tt(L[opt.label])}</span>
                  </label>
                ))}
              </fieldset>
            </div>
          </div>

          {query && loadState === 'ready' && hasMembers && (
            <div className="px-4 py-2 border-b max-h-48 overflow-y-auto" style={{ borderColor: v('card-border') }} data-testid="community-search-results">
              <p className="text-xs mb-2" role="status" style={{ color: v('text-muted') }}>
                {searchResults.length > 0 ? f('results', { n: searchResults.length }) : f('noResults', { q: query })}
              </p>
              <ul>
                {searchResults.map((n) => (
                  <li key={n.member_id}>
                    <button type="button" onClick={() => setSelected(n)}
                      className={`w-full text-start px-3 py-2 rounded text-sm flex items-center gap-2 transition-opacity hover:opacity-80 ${focusRing}`}
                      style={{ color: v('text-primary'), outlineColor: v('accent') }}
                      data-testid={`search-result-${n.membership_id}`}>
                      <span className="font-mono text-xs flex-shrink-0" style={{ color: v('accent') }}>{n.membership_id}</span>
                      <span className="truncate">{n.first_name} {n.last_name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="p-4 max-h-[500px] overflow-y-auto">
            {loadState === 'loading' && (
              <div className="py-8 flex items-center justify-center gap-2 text-sm" role="status" style={{ color: v('text-secondary') }}>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> {tt(L.loading)}
              </div>
            )}
            {loadState === 'error' && (
              <div className="py-8 text-center text-sm" role="alert" style={{ color: v('text-secondary') }}>
                <p className="mb-3">{tt(L.loadFailed)}</p>
                <button type="button" onClick={load} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border transition-opacity hover:opacity-80 ${focusRing}`} style={{ borderColor: v('input-border'), color: v('text-secondary'), outlineColor: v('accent') }}>
                  <RotateCw className="w-3 h-3" aria-hidden="true" /> {tt(L.retry)}
                </button>
              </div>
            )}
            {loadState === 'ready' && !hasMembers && (
              <p className="text-center text-sm py-8 max-w-md mx-auto" style={{ color: v('text-secondary') }}>{tt(L.empty)}</p>
            )}
            {loadState === 'ready' && hasMembers && displayTree.length > 0 && (
              <CommunityTree tree={displayTree} onSelect={setSelected} />
            )}
          </div>
        </section>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        <DialogContent className="border" style={{ backgroundColor: v('modal-bg'), borderColor: v('modal-border'), color: v('text-primary') }} data-testid="member-profile-modal">
          <DialogHeader><DialogTitle style={{ color: v('text-primary') }}>{tt(L.profile)}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-14 h-14 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
                  style={{ backgroundColor: v('avatar-bg'), border: `2px solid ${v('avatar-border')}` }} data-testid="community-modal-avatar">
                  {selected.avatar ? (
                    <img src={selected.avatar}
                      alt={`${selected.first_name || ''} ${selected.last_name || ''}`.trim() || selected.membership_id}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      data-testid="community-modal-photo" />
                  ) : (
                    <span className="font-bold text-lg" style={{ color: v('accent') }} aria-hidden="true">
                      {(selected.first_name || '?')[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-medium break-words" style={{ color: v('text-primary') }}>{selected.first_name} {selected.last_name}</p>
                  <p className="text-xs" style={{ color: v('accent') }}>{selected.membership_id}</p>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-3 pt-3 border-t" style={{ borderColor: v('card-border') }} data-testid="community-member-extra-fields">
                {[['country', selected.country], ['state', selected.state], ['city', selected.city]].map(([k, val]) => (
                  <div key={k} className="min-w-0" data-testid={`community-modal-${k}`}>
                    <dt className="text-xs" style={{ color: v('text-muted') }}>{tt(L[k])}</dt>
                    <dd className="text-sm break-words" style={{ color: v('text-primary') }}>{val || '—'}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-xs pt-1" style={{ color: v('text-muted') }}>{tt(L.privacyNote)}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
