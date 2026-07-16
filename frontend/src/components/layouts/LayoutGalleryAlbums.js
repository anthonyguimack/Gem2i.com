import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { publicAPI } from '../../lib/api';

const API = process.env.REACT_APP_BACKEND_URL;
const resolveSrc = (v) => v ? (v.startsWith('/api') ? `${API}${v}` : v) : null;

export default function LayoutGalleryAlbums({ page }) {
  const [albums, setAlbums] = useState([]);
  useEffect(() => { publicAPI.getGalleryAlbums().then(r => setAlbums(r.data || [])).catch(() => {}); }, []);

  return (
    <div className="max-w-6xl mx-auto px-6 md:px-12 py-16 pt-24 md:pt-28" data-testid="layout-gallery-albums">
      <h1 className="text-3xl md:text-4xl font-bold mb-3 text-center" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--color-heading, #1a2332)' }}>
        {page.title}
      </h1>
      {page.summary && <p className="text-slate-500 text-center mb-12 max-w-2xl mx-auto">{page.summary}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {albums.map(album => {
          const coverSrc = resolveSrc(album.cover_image);
          return (
            <Link key={album.id} to={`/album/${album.id}`}
              className="group block rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-white border border-slate-100"
              data-testid={`album-card-${album.id}`}>
              <div className="aspect-[4/3] overflow-hidden">
                {coverSrc ? (
                  <img src={coverSrc} alt={album.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                    <span className="text-slate-400 text-sm">No cover image</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold" style={{ color: 'var(--color-heading, #1a2332)' }}>{album.title}</h3>
                {album.description && <p className="text-slate-500 text-sm mt-1 line-clamp-2">{album.description}</p>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
