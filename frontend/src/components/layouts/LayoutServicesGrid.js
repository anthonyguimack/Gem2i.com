import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { publicAPI } from '../../lib/api';

const API = process.env.REACT_APP_BACKEND_URL;
const resolveSrc = (v) => v ? (v.startsWith('/api') ? `${API}${v}` : v) : null;
const cleanHtml = (html) => html ? html.replace(/&nbsp;/g, ' ').replace(/\u00A0/g, ' ') : '';

export default function LayoutServicesGrid({ page }) {
  const [services, setServices] = useState([]);
  useEffect(() => { publicAPI.getServices().then(r => setServices(r.data || [])).catch(() => {}); }, []);

  return (
    <div className="max-w-6xl mx-auto px-6 md:px-12 py-16 pt-24 md:pt-28" data-testid="layout-services-grid">
      <h1 className="text-3xl md:text-4xl font-bold mb-3 text-center" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--color-heading, #1a2332)' }}>
        {page.title}
      </h1>
      {page.summary && <p className="text-slate-500 text-center mb-12 max-w-2xl mx-auto">{page.summary}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {services.map(svc => {
          const imgSrc = resolveSrc(svc.image || svc.icon);
          return (
            <div key={svc.id} className="bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden flex flex-col md:flex-row" data-testid={`service-card-${svc.id}`}>
              {imgSrc ? (
                <div className="md:w-2/5 h-48 md:h-auto flex-shrink-0">
                  <img src={imgSrc} alt={svc.title} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="md:w-2/5 h-48 md:h-auto flex-shrink-0 bg-slate-100 flex items-center justify-center">
                  <span className="text-4xl">{svc.icon || '📋'}</span>
                </div>
              )}
              <div className="p-5 flex flex-col flex-1">
                <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--color-heading, #1a2332)' }}>{svc.title}</h3>
                <div className="text-slate-500 text-sm flex-1 mb-4 line-clamp-3 rich-text-content" dangerouslySetInnerHTML={{ __html: cleanHtml(svc.short_description || svc.description || '') }} />
                {svc.price > 0 && (
                  <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-accent, #0D9488)' }}>
                    ${Number(svc.price).toFixed(2)}
                  </p>
                )}
                {svc.external_url ? (
                  <a href={svc.external_url} target={svc.open_in_new_tab ? '_blank' : '_self'} rel="noreferrer"
                    className="text-sm font-medium flex items-center gap-1 hover:opacity-80 transition-opacity"
                    style={{ color: 'var(--color-heading, #1a2332)' }}
                    data-testid={`service-learn-more-${svc.id}`}>
                    Learn more →
                  </a>
                ) : (
                  <Link to={`/service/${svc.id}`}
                    className="text-sm font-medium flex items-center gap-1 hover:opacity-80 transition-opacity"
                    style={{ color: 'var(--color-heading, #1a2332)' }}
                    data-testid={`service-learn-more-${svc.id}`}>
                    Learn more →
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
