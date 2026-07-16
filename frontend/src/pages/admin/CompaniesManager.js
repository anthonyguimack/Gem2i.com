import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Search, ChevronLeft, ChevronRight, Loader2, ExternalLink } from 'lucide-react';

const BACKEND = process.env.REACT_APP_BACKEND_URL || '';
const imgSrc = (url) => (!url ? '' : url.startsWith('/api') ? `${BACKEND}${url}` : url);

export default function CompaniesManager() {
  const navigate = useNavigate();
  const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminAPI.getCompanies({ q, status: statusFilter, page })
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load companies'))
      .finally(() => setLoading(false));
  }, [q, statusFilter, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [q, statusFilter]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}" and all its news? This cannot be undone.`)) return;
    try { await adminAPI.deleteCompany(id); toast.success('Deleted'); load(); }
    catch { toast.error('Delete failed'); }
  };

  return (
    <div data-testid="companies-manager">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1a2332]" style={{ fontFamily: 'Playfair Display, serif' }}>Companies Manager</h1>
        <button onClick={() => navigate('/admin/companies/new')} className="bg-[#0D9488] text-white px-4 py-2 rounded-sm text-sm font-medium flex items-center gap-2" data-testid="add-company-btn">
          <Plus className="w-4 h-4" /> Add Company
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, ticker, sector, industry…"
            className="w-full h-10 pl-9 pr-3 text-sm bg-white border border-slate-200 rounded-sm outline-none focus:border-[#0D9488]"
            data-testid="companies-mgr-search" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="h-10 px-3 text-sm bg-white border border-slate-200 rounded-sm" data-testid="companies-mgr-status">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="hidden">Hidden</option>
        </select>
        <span className="text-sm text-slate-400">{data.total} total</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-sm border border-slate-100 relative">
        {loading && <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10"><Loader2 className="w-6 h-6 animate-spin text-[#0D9488]" /></div>}
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-100 bg-slate-50">
            <th className="text-left p-3 font-medium text-slate-600 w-16">Logo</th>
            <th className="text-left p-3 font-medium text-slate-600">Company</th>
            <th className="text-left p-3 font-medium text-slate-600">Sector</th>
            <th className="text-left p-3 font-medium text-slate-600">Industry</th>
            <th className="text-left p-3 font-medium text-slate-600 w-20">Status</th>
            <th className="text-right p-3 font-medium text-slate-600 w-24">Actions</th>
          </tr></thead>
          <tbody>
            {data.items.map(c => (
              <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer" onClick={() => navigate(`/admin/companies/${c.id}`)} data-testid={`company-row-${c.slug}`}>
                <td className="p-3">
                  {(c.logo_on || c.image_detail)
                    ? <img src={imgSrc(c.logo_on || c.image_detail)} alt="" className="w-10 h-10 object-contain rounded-sm bg-slate-50" />
                    : <div className="w-10 h-10 rounded-sm bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 font-semibold">{(c.symbol || c.name || '?').slice(0, 3)}</div>}
                </td>
                <td className="p-3">
                  <div className="font-medium text-[#1a2332]">{c.name}</div>
                  <div className="text-xs text-slate-400">{c.symbol || '—'}</div>
                </td>
                <td className="p-3 text-slate-500">{c.sector || '—'}</td>
                <td className="p-3 text-slate-500">{c.industry || '—'}</td>
                <td className="p-3">
                  {c.status === 'active'
                    ? <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">Active</span>
                    : <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Hidden</span>}
                </td>
                <td className="p-3 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                  <a href={`/companies/${c.slug}`} target="_blank" rel="noopener noreferrer" className="inline-block p-1.5 text-slate-400 hover:text-[#0D9488]" title="View public page"><ExternalLink className="w-4 h-4" /></a>
                  <button onClick={() => navigate(`/admin/companies/${c.id}`)} className="p-1.5 text-slate-400 hover:text-[#0D9488]" title="Edit"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(c.id, c.name)} className="p-1.5 text-slate-400 hover:text-red-500" title="Delete"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && data.items.length === 0 && <div className="p-8 text-center text-slate-400 text-sm">No companies found</div>}
        {data.pages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-slate-100">
            <span className="text-xs text-slate-400">Page {data.page} of {data.pages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-1.5 border border-slate-200 rounded-sm disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setPage(p => Math.min(data.pages, p + 1))} disabled={page >= data.pages} className="p-1.5 border border-slate-200 rounded-sm disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
