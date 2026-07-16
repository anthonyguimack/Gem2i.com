import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { publicAPI } from '../lib/api';

const API = process.env.REACT_APP_BACKEND_URL;

export default function ServiceDetailPage() {
  const { serviceId } = useParams();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (serviceId) {
      publicAPI.getServiceDetail(serviceId).then(r => { setService(r.data); setLoading(false); }).catch(() => setLoading(false));
    }
  }, [serviceId]);

  if (loading) return <div className="pt-28 text-center text-slate-400">Loading...</div>;
  if (!service) return <div className="pt-28 text-center text-slate-400">Service not found</div>;

  const imgSrc = service.image ? (service.image.startsWith('/api') ? `${API}${service.image}` : service.image) : null;

  return (
    <div className="max-w-4xl mx-auto px-6 md:px-12 py-16 pt-24 md:pt-28" data-testid="service-detail-page">
      <Link to="/" className="inline-flex items-center gap-1 text-sm mb-6 hover:opacity-70" style={{ color: 'var(--color-accent, #0D9488)' }}>
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      {imgSrc && (
        <div className="rounded-lg overflow-hidden mb-8 aspect-video">
          <img src={imgSrc} alt={service.title} className="w-full h-full object-cover" />
        </div>
      )}
      <h1 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--color-heading, #1a2332)' }}>
        {service.title}
      </h1>
      {service.price > 0 && (
        <p className="text-lg font-semibold mb-6" style={{ color: 'var(--color-accent, #0D9488)' }}>
          ${Number(service.price).toFixed(2)}
        </p>
      )}
      {service.full_content ? (
        <div className="rich-text-content prose prose-slate max-w-none leading-relaxed" style={{ overflowX: 'hidden' }} dangerouslySetInnerHTML={{ __html: service.full_content }} />
      ) : (
        <p className="text-slate-600 leading-relaxed">{service.description}</p>
      )}
    </div>
  );
}
