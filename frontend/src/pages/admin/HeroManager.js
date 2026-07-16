import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Loader2, Image, Video } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { useDataTable, DataTableToolbar, DataTablePagination, SortableTh } from '../../components/admin/useDataTable';

const fmtDt = (d) => {
  if (!d) return '-';
  const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  return m ? `${m[2]}/${m[3]}/${m[1]} ${m[4]}:${m[5]}` : d;
};

// Scope badge — mirrors the CategoryBadge pattern from PagesManager
const SCOPE_META = {
  '':          { label: 'PB — Business',  cls: 'bg-slate-100 text-slate-600' },
  'business':  { label: 'PB — Business',  cls: 'bg-slate-100 text-slate-600' },
  'lifestyle': { label: 'PB — Lifestyle', cls: 'bg-emerald-50 text-emerald-600' },
  'personal':  { label: 'PB — Personal',  cls: 'bg-violet-50  text-violet-600' },
};
function ScopeBadge({ pb_personality }) {
  const meta = SCOPE_META[pb_personality || ''] || SCOPE_META[''];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium ${meta.cls}`}>{meta.label}</span>;
}

export default function HeroManager() {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    adminAPI.getHeroSlides().then(r => setSlides(r.data || [])).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await adminAPI.deleteHeroSlide(deleteTarget.id);
      toast.success('Slide deleted');
      setDeleteTarget(null);
      load();
    } catch { toast.error('Delete failed'); }
    finally { setDeleting(false); }
  };

  const dt = useDataTable(slides, {
    searchAccessor: s => `${s.title || ''} ${s.subtitle || ''} ${s.slide_type || ''} ${s.pb_personality || 'business'}`,
    defaultSort: { key: 'date_start', dir: 'desc' },
    storageKey: 'hero',
  });

  return (
    <div data-testid="hero-manager">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1a2332]" style={{ fontFamily: 'Playfair Display, serif' }}>Hero Slides</h1>
        <button onClick={() => navigate('/admin/hero/add')}
          className="bg-[#0D9488] text-white px-4 py-2 rounded-sm text-sm font-medium hover:bg-[#0D9488]/80 flex items-center gap-2"
          data-testid="add-hero-slide-btn">
          <Plus className="w-4 h-4" /> Add Slide
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-[#0D9488] animate-spin" /></div>
      ) : slides.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-sm p-12 text-center">
          <p className="text-slate-400 text-sm">No hero slides yet.</p>
          <button onClick={() => navigate('/admin/hero/add')} className="mt-3 text-[#0D9488] text-sm hover:underline">Create your first slide</button>
        </div>
      ) : (
        <>
        <DataTableToolbar dt={dt} testId="hero" placeholder="Search by title, subtitle, type…" />
        <div className="bg-white border border-slate-100 rounded-sm overflow-hidden">
          <table className="w-full text-sm" data-testid="hero-slides-table">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500 text-xs uppercase">
                <SortableTh dt={dt} field="title">Title</SortableTh>
                <SortableTh dt={dt} field="subtitle">Subtitle</SortableTh>
                <SortableTh dt={dt} field="slide_type" align="center">Type</SortableTh>
                <SortableTh dt={dt} field="pb_personality" align="center">Scope</SortableTh>
                <SortableTh dt={dt} field="date_start">Start Date</SortableTh>
                <SortableTh dt={dt} field="date_end">End Date</SortableTh>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {dt.visibleItems.map(s => (
                <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50" data-testid={`hero-slide-row-${s.id}`}>
                  <td className="p-3 font-medium text-[#1a2332] max-w-[200px] truncate" dangerouslySetInnerHTML={{ __html: s.title || '-' }} />
                  <td className="p-3 text-slate-500 max-w-[180px] truncate" dangerouslySetInnerHTML={{ __html: s.subtitle || '-' }} />
                  <td className="p-3 text-center">
                    {s.slide_type === 'video' ? (
                      <span className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded"><Video className="w-3 h-3" /> Video</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded"><Image className="w-3 h-3" /> Photo</span>
                    )}
                  </td>
                  <td className="p-3 text-center"><ScopeBadge pb_personality={s.pb_personality} /></td>
                  <td className="p-3 text-slate-500 text-xs">{fmtDt(s.date_start)}</td>
                  <td className="p-3 text-slate-500 text-xs">{fmtDt(s.date_end)}</td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => navigate(`/admin/hero/edit/${s.id}`)} className="p-1.5 text-slate-400 hover:text-[#0D9488]" data-testid={`edit-slide-${s.id}`}><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteTarget(s)} className="p-1.5 text-slate-400 hover:text-red-500" data-testid={`delete-slide-${s.id}`}><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {dt.totalAll > 0 && dt.totalFiltered === 0 && <div className="p-8 text-center text-slate-400 text-sm">No slides match your search</div>}
          <DataTablePagination dt={dt} testId="hero" />
        </div>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[400px]" data-testid="delete-slide-dialog">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Trash2 className="w-5 h-5 text-red-500" /> Delete Slide</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-500 mt-2">Are you sure you want to delete this slide? This action cannot be undone.</p>
          <div className="flex gap-2 mt-4">
            <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2 border border-slate-200 text-slate-500 rounded-sm text-sm hover:bg-slate-50">Cancel</button>
            <button onClick={handleDelete} disabled={deleting}
              className="flex-1 py-2 bg-red-500 text-white rounded-sm text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              data-testid="confirm-delete-slide-btn">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
