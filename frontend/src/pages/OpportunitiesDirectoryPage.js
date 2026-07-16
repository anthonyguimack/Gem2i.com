import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { opportunitiesAPI } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useMember } from '../lib/memberAuth';
import { Loader2, Clock, User, Tag, PenSquare } from 'lucide-react';

const PB_FONT = "'Plus Jakarta Sans', 'Inter', sans-serif";

const fmtMoney = (v) => (v == null ? null :
  Number(v).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }));

export function OpportunityBannerFallback({ name }) {
  return (
    <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-primary, #1a2332)' }}>
      <span className="text-3xl font-bold text-white/25 px-6 text-center" style={{ fontFamily: 'Playfair Display, serif' }}>
        {(name || '?').split(' ').slice(0, 2).join(' ')}
      </span>
    </div>
  );
}

function OpportunityCard({ o }) {
  const img = (o.images || []).find(Boolean) || o.type_default_image;
  return (
    <Link to={`/opportunities/${o.slug}`}
      className="group relative block overflow-hidden rounded-sm border border-slate-100 bg-white"
      data-testid={`opportunity-card-${o.slug}`}>
      <div className="aspect-[16/9] overflow-hidden bg-slate-100">
        {img ? (
          <img src={img} alt={o.name} loading="lazy"
            className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-[1.03] transition-[filter,transform] duration-500 ease-out" />
        ) : (
          <OpportunityBannerFallback name={o.name} />
        )}
      </div>
      <div className="absolute top-3 left-3">
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full backdrop-blur ${o.funding_open ? 'bg-emerald-500/90 text-white' : 'bg-slate-800/80 text-white/80'}`}>
          {o.funding_open ? 'Open for funding' : 'Funding closed'}
        </span>
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent opacity-90 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="absolute inset-x-0 bottom-0 p-5 text-white translate-y-9 group-hover:translate-y-0 transition-transform duration-300 ease-out">
        <div className="text-lg font-semibold leading-snug" style={{ fontFamily: PB_FONT }}>{o.name}</div>
        <ul className="mt-1.5 space-y-0.5 text-[11px] text-white/80">
          <li className="flex items-center gap-1.5"><Tag className="w-3 h-3 shrink-0" /> {o.type_name || '—'}</li>
          <li className="flex items-center gap-1.5"><User className="w-3 h-3 shrink-0" /> {o.author || '—'}</li>
          <li className="flex items-center gap-1.5"><Clock className="w-3 h-3 shrink-0" /> Goal {fmtMoney(o.total_amount) || '—'}</li>
        </ul>
        <div className="mt-3 border border-white/70 text-center text-xs font-medium tracking-wide py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          View Details
        </div>
      </div>
    </Link>
  );
}

export default function OpportunitiesDirectoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState(null);
  const [types, setTypes] = useState([]);
  const { user } = useAuth();
  const { member } = useMember();
  const typeId = parseInt(searchParams.get('type') || '0', 10);

  useEffect(() => {
    opportunitiesAPI.types().then(r => setTypes(r.data)).catch(() => {});
  }, []);
  useEffect(() => {
    setItems(null);
    opportunitiesAPI.listPublished(typeId).then(r => setItems(r.data)).catch(() => setItems([]));
  }, [typeId]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background, #faf8f5)' }}>
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-16 pt-24 md:pt-28">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] font-semibold mb-3" style={{ color: 'var(--color-accent, #0D9488)' }}>
              Opportunity Development
            </div>
            <h1 className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--color-heading, #1a2332)', fontFamily: 'Playfair Display, serif' }}>
              Investment Opportunities
            </h1>
            <p className="mt-2 text-sm text-slate-500 max-w-xl" style={{ fontFamily: PB_FONT }}>
              Member-authored deals and projects, published after review.
            </p>
          </div>
          {(user || member) && (
            <Link to="/opportunities/develop"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm text-sm font-medium"
              style={{ backgroundColor: 'var(--color-button-bg, #1a2332)', color: 'var(--color-button-text, #fff)' }}
              data-testid="develop-link">
              <PenSquare className="w-4 h-4" /> Develop an Opportunity
            </Link>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-8" style={{ fontFamily: PB_FONT }}>
          <button onClick={() => setSearchParams({})}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-full border transition-colors ${!typeId ? 'text-white border-transparent' : 'text-slate-500 border-slate-200 bg-white hover:border-slate-300'}`}
            style={!typeId ? { backgroundColor: 'var(--color-accent, #0D9488)' } : {}}>
            All types
          </button>
          {types.map(t => (
            <button key={t.type_id} onClick={() => setSearchParams({ type: String(t.type_id) })}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-full border transition-colors ${typeId === t.type_id ? 'text-white border-transparent' : 'text-slate-500 border-slate-200 bg-white hover:border-slate-300'}`}
              style={typeId === t.type_id ? { backgroundColor: 'var(--color-accent, #0D9488)' } : {}}>
              {t.name}
            </button>
          ))}
        </div>

        {items === null ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-7 h-7 animate-spin" style={{ color: 'var(--color-accent, #0D9488)' }} /></div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-sm" style={{ fontFamily: PB_FONT }}>
            No published opportunities{typeId ? ' of this type' : ''} yet.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map(o => <OpportunityCard key={o.id} o={o} />)}
          </div>
        )}
      </div>
    </div>
  );
}
