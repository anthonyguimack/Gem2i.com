import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Switch } from '../../components/ui/switch';
import { Search, Loader2, Edit2, Trash2, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';

const STATUS_BADGES = {
  draft: 'bg-slate-100 text-slate-600',
  pending_review: 'bg-amber-50 text-amber-600',
  published: 'bg-emerald-50 text-emerald-600',
  archived: 'bg-slate-100 text-slate-400',
  deleted: 'bg-red-50 text-red-400',
};
const STATUS_LABELS = {
  draft: 'Draft', pending_review: 'Pending Review', published: 'Published',
  archived: 'Archived', deleted: 'Deleted',
};

const fmtMoney = (v) => (v == null ? '—' :
  Number(v).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }));

export default function OpportunitiesManager() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [config, setConfig] = useState(null);
  const [savingConfig, setSavingConfig] = useState(false);

  const load = useCallback(() => {
    adminAPI.getOpportunities({ q, status, page })
      .then(r => setData(r.data))
      .catch(() => { setData({ items: [], total: 0, pages: 1 }); toast.error('Failed to load'); });
  }, [q, status, page]);
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);
  useEffect(() => {
    adminAPI.getOpportunitiesConfig().then(r => setConfig(r.data)).catch(() => {});
  }, []);

  const saveMode = async (mode) => {
    setSavingConfig(true);
    try {
      const r = await adminAPI.updateOpportunitiesConfig({ approval_mode: mode });
      setConfig(r.data);
      toast.success(mode === 'direct'
        ? 'Approval mode: Direct — publishing approves instantly'
        : 'Approval mode: Consensus — publishing requires 50%+1 member approvals');
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
    finally { setSavingConfig(false); }
  };

  const setBypass = async (o, val) => {
    try {
      await adminAPI.setOpportunityBypass(o.id, val);
      setData(d => ({ ...d, items: d.items.map(x => x.id === o.id ? { ...x, bypass_approval: val } : x) }));
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const setDocStatus = async (o, newStatus) => {
    try {
      await adminAPI.setOpportunityStatus(o.id, newStatus);
      toast.success(`Status → ${STATUS_LABELS[newStatus]}`);
      load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const remove = async (o) => {
    if (!window.confirm(`Delete "${o.name}"? (soft delete — recoverable from the Deleted filter)`)) return;
    try { await adminAPI.deleteOpportunity(o.id); toast.success('Deleted'); load(); }
    catch (e) { toast.error(e.response?.data?.detail || 'Delete failed'); }
  };

  return (
    <div data-testid="opportunities-manager">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1a2332]" style={{ fontFamily: 'Playfair Display, serif' }}>Opportunities</h1>
      </div>

      <div className="bg-white rounded-sm border border-slate-100 p-5 mb-6" data-testid="approval-mode-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[#1a2332]">Approval Mode</div>
            <p className="text-xs text-slate-400 mt-0.5 max-w-lg">
              <b>Direct</b>: a member's publish request goes live instantly. <b>Consensus</b>: it stays in the
              peer-review queue until 50%+1 of active members approve. Admin "Bypass" overrides either mode per opportunity.
            </p>
          </div>
          {config ? (
            <div className="flex gap-1 border border-slate-200 rounded-sm p-1">
              {[['direct', 'Direct'], ['consensus', 'Consensus 50%+1']].map(([v, l]) => (
                <button key={v} onClick={() => v !== config.approval_mode && saveMode(v)} disabled={savingConfig}
                  className={`px-4 py-1.5 text-sm font-medium rounded-sm transition-colors ${config.approval_mode === v ? 'bg-[#0D9488] text-white' : 'text-slate-500 hover:text-slate-700'}`}
                  data-testid={`mode-${v}`}>
                  {l}
                </button>
              ))}
            </div>
          ) : <Loader2 className="w-4 h-4 animate-spin text-slate-300" />}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative max-w-sm flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={e => { setQ(e.target.value); setPage(1); }} placeholder="Search opportunities…"
            className="w-full h-10 pl-9 pr-3 text-sm bg-white border border-slate-200 rounded-sm outline-none focus:border-[#0D9488]" />
        </div>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="h-10 px-3 text-sm bg-white border border-slate-200 rounded-sm" data-testid="status-filter">
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-sm border border-slate-100 relative overflow-x-auto">
        {data === null && <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#0D9488]" /></div>}
        {data !== null && (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-100 bg-slate-50 text-left">
              <th className="p-3 font-medium text-slate-600">Opportunity</th>
              <th className="p-3 font-medium text-slate-600">Author</th>
              <th className="p-3 font-medium text-slate-600">Goal</th>
              <th className="p-3 font-medium text-slate-600 w-36">Status</th>
              <th className="p-3 font-medium text-slate-600 w-24">Bypass</th>
              <th className="p-3 font-medium text-slate-600 text-right w-32">Actions</th>
            </tr></thead>
            <tbody>
              {data.items.map(o => (
                <tr key={o.id} className="border-b border-slate-50 hover:bg-slate-50/50" data-testid={`admin-opp-row-${o.id}`}>
                  <td className="p-3 font-medium text-[#1a2332]">{o.name || '(untitled)'}</td>
                  <td className="p-3 text-slate-500">{o.author || '—'}</td>
                  <td className="p-3 text-slate-500">{fmtMoney(o.total_amount)}</td>
                  <td className="p-3">
                    <select value={o.status} onChange={e => setDocStatus(o, e.target.value)}
                      className={`text-xs px-2 py-1 rounded-sm border-0 cursor-pointer ${STATUS_BADGES[o.status]}`}
                      title="Change status" data-testid={`admin-opp-status-${o.id}`}>
                      {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}{v === 'pending_review' && o.approvals ? ` (${o.approvals} appr.)` : ''}</option>)}
                    </select>
                  </td>
                  <td className="p-3">
                    <Switch checked={!!o.bypass_approval} onCheckedChange={v => setBypass(o, v)} data-testid={`bypass-${o.id}`} />
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    {o.status === 'published' && (
                      <a href={`/opportunities/${o.slug}`} target="_blank" rel="noreferrer"
                        className="p-1.5 text-slate-400 hover:text-[#0D9488] inline-block" title="View public page"><ExternalLink className="w-4 h-4" /></a>
                    )}
                    <button onClick={() => navigate(`/opportunities/develop/${o.id}`)}
                      className="p-1.5 text-slate-400 hover:text-[#0D9488]" title="Edit (opens the authoring editor)"><Edit2 className="w-4 h-4" /></button>
                    {o.status !== 'deleted' && (
                      <button onClick={() => remove(o)} className="p-1.5 text-slate-400 hover:text-red-500" title="Delete"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {data !== null && data.items.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-sm">No opportunities found</div>
        )}
      </div>

      {data !== null && data.pages > 1 && (
        <div className="flex items-center justify-end gap-2 mt-4 text-sm text-slate-500">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
          Page {data.page} / {data.pages} · {data.total} total
          <button disabled={page >= data.pages} onClick={() => setPage(p => p + 1)} className="p-1.5 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
        </div>
      )}
    </div>
  );
}
