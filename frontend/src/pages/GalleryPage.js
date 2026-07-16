import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { publicAPI } from '../lib/api';
import { ChevronLeft, ChevronRight, X, ExternalLink } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;
const resolveSrc = (v) => v ? (v.startsWith('/api') ? `${API}${v}` : v) : null;

function Lightbox({ items, currentIndex, onClose, onNext, onPrev }) {
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft') onPrev();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; };
  }, [onClose, onNext, onPrev]);

  const item = items[currentIndex];
  if (!item) return null;
  const src = resolveSrc(item.image);

  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center" data-testid="gallery-lightbox" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 z-10 text-white/70 hover:text-white p-2" data-testid="lightbox-close"><X className="w-7 h-7" /></button>
      {items.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); onPrev(); }} className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white/50 hover:text-white p-3 bg-white/10 rounded-full backdrop-blur-sm" data-testid="lightbox-prev"><ChevronLeft className="w-7 h-7" /></button>
          <button onClick={(e) => { e.stopPropagation(); onNext(); }} className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white/50 hover:text-white p-3 bg-white/10 rounded-full backdrop-blur-sm" data-testid="lightbox-next"><ChevronRight className="w-7 h-7" /></button>
        </>
      )}
      <div className="max-w-5xl max-h-[90vh] flex flex-col items-center px-4" onClick={(e) => e.stopPropagation()}>
        {src && <img src={src} alt={item.title || ''} className="max-w-full max-h-[75vh] object-contain rounded" data-testid="lightbox-image" />}
        <div className="mt-4 text-center">
          {item.title && <h3 className="text-white text-lg font-semibold" style={{ fontFamily: 'Playfair Display, serif' }}>{item.title}</h3>}
          {item.summary && <p className="text-white/60 text-sm mt-1 max-w-xl">{item.summary}</p>}
        </div>
        <p className="text-white/30 text-xs mt-3">{currentIndex + 1} / {items.length}</p>
      </div>
    </div>
  );
}

export default function GalleryPage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tab, setTab] = useState('all');
  const [lightboxIndex, setLightboxIndex] = useState(-1);

  useEffect(() => {
    publicAPI.getGallery().then(r => setItems(r.data || [])).catch(console.error);
    publicAPI.getGalleryCategories().then(r => setCategories(r.data || [])).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    if (tab === 'all') return items;
    return items.filter(i => i.category === tab);
  }, [items, tab]);

  const uniqueCats = categories.length > 0 ? categories : [...new Set(items.map(i => i.category).filter(Boolean))].map(c => ({ name: c }));

  const openLightbox = useCallback((item) => {
    const idx = filtered.findIndex(f => f.id === item.id);
    setLightboxIndex(idx);
  }, [filtered]);

  return (
    <div data-testid="gallery-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-16 pt-24 md:pt-28">
        {/* Category Tabs */}
        {uniqueCats.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-10" data-testid="gallery-tabs">
            <button onClick={() => setTab('all')}
              className={`px-5 py-2.5 rounded-sm text-sm font-medium transition-colors ${tab === 'all' ? 'text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-[#0D9488]'}`}
              style={tab === 'all' ? { backgroundColor: 'var(--color-primary, #1a2332)' } : {}}
              data-testid="gallery-page-tab-all">
              All
            </button>
            {uniqueCats.map(c => {
              const key = c.slug || c.name;
              return (
                <button key={key} onClick={() => setTab(c.name)}
                  className={`px-5 py-2.5 rounded-sm text-sm font-medium transition-colors capitalize ${tab === c.name ? 'text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-[#0D9488]'}`}
                  style={tab === c.name ? { backgroundColor: 'var(--color-primary, #1a2332)' } : {}}
                  data-testid={`gallery-page-tab-${key}`}>
                  {c.name}
                </button>
              );
            })}
          </div>
        )}

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(item => {
            const src = resolveSrc(item.image);
            return (
              <div key={item.id} className="relative group rounded-lg overflow-hidden bg-slate-100" data-testid={`gallery-page-item-${item.id}`}>
                {/* Link icon */}
                {item.link && (
                  <a href={item.link} target={item.open_in_new_tab ? '_blank' : '_self'} rel="noreferrer"
                    className="absolute top-3 right-3 z-10 bg-white/90 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                    onClick={(e) => e.stopPropagation()} data-testid={`gallery-link-${item.id}`}>
                    <ExternalLink className="w-4 h-4 text-slate-600" />
                  </a>
                )}
                {/* Image */}
                <div className="aspect-[4/3] overflow-hidden cursor-pointer" onClick={() => openLightbox(item)}>
                  {src ? (
                    <img src={src} alt={item.title || ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">No image</div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                </div>
                {/* Title + Summary overlay at bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  {item.title && <h3 className="text-white text-base font-bold drop-shadow-md" style={{ fontFamily: 'Playfair Display, serif' }}>{item.title}</h3>}
                  {item.category && <p className="text-white/70 text-xs capitalize mt-0.5">{item.category}</p>}
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400">No photos found in this category.</div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex >= 0 && (
        <Lightbox items={filtered} currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(-1)}
          onNext={() => setLightboxIndex(p => (p + 1) % filtered.length)}
          onPrev={() => setLightboxIndex(p => (p - 1 + filtered.length) % filtered.length)} />
      )}
    </div>
  );
}
