import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminAPI } from '../../lib/api';
import { ArrowLeft, Loader2, History, ShieldCheck } from 'lucide-react';

const STATUS_META = {
  active: { label: 'Active', cls: 'bg-emerald-100 text-emerald-700' },
  deactivated: { label: 'Deactivated', cls: 'bg-red-100 text-red-700' },
  pre_registered: { label: 'Pre-registered', cls: 'bg-amber-100 text-amber-700' },
};

export default function MemberSignatures() {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    adminAPI.getMemberSignatures(memberId)
      .then(r => { if (alive) setData(r.data); })
      .catch(() => { if (alive) setError('Could not load signature history.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [memberId]);

  const m = data?.member;
  const sigs = data?.signatures || [];
  const fmt = (v) => { if (!v) return '—'; const d = new Date(v); return isNaN(d.getTime()) ? String(v) : d.toLocaleString(); };

  return (
    <div className="max-w-5xl mx-auto">
      <button
        onClick={() => navigate('/admin/members')}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#0D9488] mb-4"
        data-testid="signatures-back"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Members
      </button>

      <div className="flex items-center gap-3 mb-1">
        <div className="w-9 h-9 rounded-lg bg-[#0D9488]/10 text-[#0D9488] flex items-center justify-center">
          <History className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#1a2332]">Signature history</h1>
            {m && <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${(STATUS_META[m.account_status] || STATUS_META.active).cls}`}>{(STATUS_META[m.account_status] || STATUS_META.active).label}</span>}
          </div>
          <p className="text-sm text-slate-500">Every time this member accepted the disclaimer to read a post.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : error ? (
        <div className="mt-6 p-4 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
      ) : (
        <>
          {m && (
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-200 rounded-xl overflow-hidden border border-slate-200">
              <div className="bg-white p-4">
                <div className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Member</div>
                <div className="text-sm font-medium text-[#1a2332] mt-0.5">{`${m.first_name || ''} ${m.last_name || ''}`.trim() || '—'}</div>
              </div>
              <div className="bg-white p-4">
                <div className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">ID</div>
                <div className="text-sm font-mono text-[#0D9488] mt-0.5">{m.membership_id || (m.membership_number ? `#${m.membership_number}` : '—')}</div>
              </div>
              <div className="bg-white p-4">
                <div className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Email</div>
                <div className="text-sm text-slate-600 mt-0.5 break-all">{m.email || '—'}</div>
              </div>
              <div className="bg-white p-4">
                <div className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Total signatures</div>
                <div className="text-sm font-bold text-[#1a2332] mt-0.5">{sigs.length}</div>
              </div>
            </div>
          )}

          <div className="mt-6 bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-600">
                  <th className="p-3 font-medium w-12">#</th>
                  <th className="p-3 font-medium">Date &amp; time</th>
                  <th className="p-3 font-medium">Author / post context</th>
                  <th className="p-3 font-medium">Disclaimer</th>
                  <th className="p-3 font-medium">IP</th>
                </tr>
              </thead>
              <tbody>
                {sigs.map((s, i) => (
                  <tr key={s.id || i} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="p-3 text-slate-400 font-mono">{sigs.length - i}</td>
                    <td className="p-3 text-[#1a2332] whitespace-nowrap">{fmt(s.signed_at)}</td>
                    <td className="p-3 text-slate-500">{s.author || '—'}{s.aux_id ? ` · aux-${s.aux_id}` : ''}</td>
                    <td className="p-3">
                      {s.disclaimer_accepted
                        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700"><ShieldCheck className="w-3 h-3" /> Accepted</span>
                        : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="p-3 text-slate-400 font-mono text-xs">{s.ip || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sigs.length === 0 && <div className="p-10 text-center text-slate-400 text-sm">No signatures recorded yet for this member.</div>}
          </div>
        </>
      )}
    </div>
  );
}
