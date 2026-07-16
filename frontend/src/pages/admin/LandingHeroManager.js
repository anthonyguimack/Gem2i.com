import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Loader2, Image, Video } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';

const fmtDt = (d) => {
  if (!d) return '-';
  const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  return m ? `${m[2]}/${m[3]}/${m[1]} ${m[4]}:${m[5]}` : d;
};

export default function LandingHeroManager() {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    adminAPI.getLandingHeroSlides().then(r => setSlides(r.data || [])).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await adminAPI.deleteLandingHeroSlide(deleteTarget.id);
      toast.success('Slide deleted');
      setDeleteTarget(null);
      load();
    } catch { toast.error('Delete failed'); }
    finally { setDeleting(false); }
  };

  return (
    <div data-testid="landing-hero-manager">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--ad-heading, #1a2332)', fontFamily: 'Playfair Display, serif' }}>Landing Page Hero</h1>
        <button onClick={() => navigate('/admin/landing-hero/add')} className="text-white px-4 py-2 rounded-sm text-sm font-medium flex items-center gap-2 hover:opacity-80" style={{ backgroundColor: 'var(--ad-button-bg, #0D9488)' }} data-testid="add-lp-hero-btn">
          <Plus className="w-4 h-4" /> Add Slide
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--ad-accent, #0D9488)' }} /></div>
      ) : slides.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-sm p-12 text-center">
          <p className="text-slate-400 text-sm">No landing hero slides yet.</p>
          <button onClick={() => navigate('/admin/landing-hero/add')} className="mt-3 text-sm hover:underline" style={{ color: 'var(--ad-accent, #0D9488)' }}>Create your first slide</button>
        </div>
      ) : (
        <div className="space-y-3">
          {slides.map(s => (
            <div key={s.id} className="bg-white border border-slate-100 rounded-sm p-4 flex items-center gap-4" data-testid={`lp-hero-slide-${s.id}`}>
              <div className="w-12 h-12 rounded-sm flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--ad-accent, #0D9488)', color: 'white' }}>
                {s.slide_type === 'video' ? <Video className="w-5 h-5" /> : <Image className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate [&_p]:inline [&_em]:italic" style={{ color: 'var(--ad-heading, #1a2332)' }} dangerouslySetInnerHTML={{ __html: s.title || '<em>No title</em>' }} />
                <p className="text-xs text-slate-400 mt-0.5">
                  {fmtDt(s.date_start)} → {fmtDt(s.date_end)}
                  {s.buttons?.length > 0 && <span className="ml-2">| {s.buttons.length} button{s.buttons.length > 1 ? 's' : ''}</span>}
                  {s.background_overlay === false && <span className="ml-2">| No overlay</span>}
                </p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => navigate(`/admin/landing-hero/edit/${s.id}`)} className="p-2 rounded hover:bg-slate-50" data-testid={`edit-lp-hero-${s.id}`}><Edit2 className="w-4 h-4 text-slate-400" /></button>
                <button onClick={() => setDeleteTarget(s)} className="p-2 rounded hover:bg-red-50" data-testid={`delete-lp-hero-${s.id}`}><Trash2 className="w-4 h-4 text-slate-400 hover:text-red-500" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Confirm Delete</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-500">Delete slide "<span dangerouslySetInnerHTML={{ __html: deleteTarget?.title || '' }} />"?</p>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 border border-slate-200 rounded-sm text-sm hover:bg-slate-50">Cancel</button>
            <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 bg-red-500 text-white rounded-sm text-sm hover:bg-red-600 disabled:opacity-50 flex items-center gap-1">
              {deleting && <Loader2 className="w-3 h-3 animate-spin" />} Delete
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
