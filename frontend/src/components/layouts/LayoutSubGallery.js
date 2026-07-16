import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { publicAPI } from '../../lib/api';

const API = process.env.REACT_APP_BACKEND_URL;
const resolveSrc = (v) => v ? (v.startsWith('/api') ? `${API}${v}` : v) : null;

export default function LayoutSubGallery() {
  const { albumId } = useParams();
  const [album, setAlbum] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (albumId) {
      publicAPI.getAlbumPhotos(albumId).then(r => {
        setAlbum(r.data.album);
        setPhotos(r.data.photos || []);
      }).catch(() => {});
    }
  }, [albumId]);

  const currentPhoto = photos[activeIdx];
  const currentSrc = currentPhoto ? resolveSrc(currentPhoto.image || currentPhoto.url) : null;

  const goPrev = () => setActiveIdx(i => (i > 0 ? i - 1 : photos.length - 1));
  const goNext = () => setActiveIdx(i => (i < photos.length - 1 ? i + 1 : 0));

  if (!album) return <div className="pt-28 text-center text-slate-400">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto px-6 md:px-12 py-16 pt-24 md:pt-28" data-testid="layout-sub-gallery">
      <Link to={-1} className="inline-flex items-center gap-1 text-sm mb-6 hover:opacity-70" style={{ color: 'var(--color-accent, #0D9488)' }}>
        <ArrowLeft className="w-4 h-4" /> Back to Albums
      </Link>
      <h1 className="text-2xl md:text-3xl font-bold mb-8" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--color-heading, #1a2332)' }}>
        {album.title}
      </h1>

      {photos.length > 0 ? (
        <>
          {/* Main Image Viewer */}
          <div className="relative bg-black rounded-lg overflow-hidden mb-4" style={{ aspectRatio: '16/9' }}>
            {currentSrc && (
              <img src={currentSrc} alt={currentPhoto?.caption || ''} className="w-full h-full object-contain" data-testid="gallery-main-image" />
            )}
            {photos.length > 1 && (
              <>
                <button onClick={goPrev} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors" data-testid="gallery-prev">
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button onClick={goNext} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors" data-testid="gallery-next">
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
            {currentPhoto?.caption && (
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
                <p className="text-white text-sm">{currentPhoto.caption}</p>
              </div>
            )}
          </div>

          {/* Thumbnail Strip */}
          <div className="flex gap-2 overflow-x-auto pb-2" data-testid="gallery-thumbnails">
            {photos.map((photo, idx) => {
              const thumbSrc = resolveSrc(photo.image || photo.url);
              return (
                <button key={photo.id} onClick={() => setActiveIdx(idx)}
                  className={`flex-shrink-0 w-20 h-16 rounded overflow-hidden border-2 transition-all ${idx === activeIdx ? 'opacity-100' : 'opacity-50 hover:opacity-75'}`}
                  style={{ borderColor: idx === activeIdx ? 'var(--color-accent, #0D9488)' : 'transparent' }}
                  data-testid={`gallery-thumb-${idx}`}>
                  {thumbSrc && <img src={thumbSrc} alt="" className="w-full h-full object-cover" />}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <p className="text-slate-400 text-center py-16">No photos in this album yet.</p>
      )}
    </div>
  );
}
