import React, { useState, useEffect } from 'react';
import { publicAPI } from '../lib/api';
import { ExternalLink } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;
const resolveSrc = (v) => v ? (v.startsWith('/api') ? `${API}${v}` : v) : null;

export default function FeaturedProjectsPage() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    publicAPI.getPortfolio().then(r => setItems(r.data || [])).catch(console.error);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-16 pt-24 md:pt-28" data-testid="featured-projects-page">
      <div className="text-center mb-14">
        <p className="text-xs uppercase tracking-[0.3em] font-semibold mb-2" style={{ color: 'var(--color-accent, #0D9488)' }}>Our Work</p>
        <h1 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--color-heading, #1a2332)' }}>Featured Projects</h1>
      </div>

      {items.length === 0 && (
        <div className="text-center py-16 text-slate-400">No projects found.</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map(p => {
          const src = resolveSrc(p.image);
          const card = (
            <div key={p.id} className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all border border-slate-100 group relative" data-testid={`project-card-${p.id}`}>
              {p.link && (
                <a href={p.link} target={p.open_in_new_tab ? '_blank' : '_self'} rel="noreferrer" className="absolute top-3 right-3 z-10 bg-white/90 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm" onClick={e => e.stopPropagation()} data-testid={`project-link-${p.id}`}>
                  <ExternalLink className="w-4 h-4 text-slate-600" />
                </a>
              )}
              {src && (
                <div className="h-52 overflow-hidden">
                  <img src={src} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
              )}
              <div className="p-5">
                <h3 className="font-bold mb-1" style={{ color: 'var(--color-heading, #1a2332)' }}>{p.title}</h3>
                {p.category && <p className="text-xs mb-2" style={{ color: 'var(--color-accent, #0D9488)' }}>{p.category}</p>}
                {p.description && <p className="text-sm line-clamp-3" style={{ color: 'var(--color-body-text, #475569)' }}>{p.description}</p>}
                {p.link && (
                  <a href={p.link} target={p.open_in_new_tab ? '_blank' : '_self'} rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium mt-3 hover:opacity-70" style={{ color: 'var(--color-accent, #0D9488)' }}>
                    View Project <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          );
          return card;
        })}
      </div>
    </div>
  );
}
