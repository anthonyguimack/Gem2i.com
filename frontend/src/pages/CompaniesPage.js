import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { companiesAPI } from '../lib/api';
import { Search, X, ChevronRight, ChevronLeft, Star, Globe, Layers } from 'lucide-react';

const PB_FONT = "'Plus Jakarta Sans', 'Inter', sans-serif";

// Neutral placeholder for the handful of companies without a photo (11/571).
export function CompanyBannerFallback({ name, symbol }) {
  return (
    <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-primary, #1a2332)' }}>
      <span className="text-4xl font-bold text-white/25" style={{ fontFamily: 'Playfair Display, serif' }}>
        {(symbol || name || '?').slice(0, 4).toUpperCase()}
      </span>
    </div>
  );
}

const inputCls = 'h-11 w-full px-4 text-sm bg-white border border-slate-200 rounded-sm ' +
  'text-slate-700 placeholder:text-slate-400 outline-none transition-[border-color,box-shadow] duration-150 ' +
  'focus:border-[var(--color-accent,#0D9488)] focus:shadow-[0_0_0_3px_rgba(13,148,136,0.12)]';

function CompanyPhotoCard({ c }) {
  return (
    <Link
      to={`/companies/${c.slug}`}
      className="group relative block overflow-hidden rounded-sm border border-slate-100 bg-white"
      data-testid={`company-card-${c.slug}`}
    >
      <div className="aspect-[16/9] overflow-hidden bg-slate-100">
        {c.image_detail ? (
          <img
            src={c.image_detail}
            alt={c.name}
            loading="lazy"
            className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-[1.03] transition-[filter,transform] duration-500 ease-out"
          />
        ) : (
          <CompanyBannerFallback name={c.name} symbol={c.symbol} />
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent opacity-90 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="absolute inset-x-0 bottom-0 p-5 text-white translate-y-9 group-hover:translate-y-0 transition-transform duration-300 ease-out">
        <div className="text-lg font-semibold leading-snug" style={{ fontFamily: PB_FONT }}>{c.name}</div>
        <ul className="mt-1.5 space-y-0.5 text-[11px] text-white/80">
          <li className="flex items-center gap-1.5"><Star className="w-3 h-3 shrink-0" /> {c.symbol || '—'}</li>
          <li className="flex items-center gap-1.5"><Globe className="w-3 h-3 shrink-0" /> {c.sector || '—'}</li>
          <li className="flex items-center gap-1.5"><Layers className="w-3 h-3 shrink-0" /> {c.industry || '—'}</li>
        </ul>
        <div className="mt-3 border border-white/70 text-center text-xs font-medium tracking-wide py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          View Details
        </div>
      </div>
    </Link>
  );
}

function CompanyLogoCard({ c }) {
  const logo = c.logo_off || c.logo_on;
  const logoColor = c.logo_on || c.logo_off;
  return (
    <div
      className="group flex flex-col bg-white border border-slate-100 rounded-sm overflow-hidden hover:border-slate-300 hover:shadow-md transition-[border-color,box-shadow] duration-200"
      data-testid={`company-logo-${c.slug}`}
    >
      <Link to={`/companies/${c.slug}`} title={`${c.name}${c.symbol ? ` (${c.symbol})` : ''}`} className="flex flex-col flex-1">
        <div className="flex items-center justify-center aspect-[4/3] p-6">
          {logo ? (
            <div className="relative w-full h-full">
              <img src={logo} alt={c.name} loading="lazy" className="absolute inset-0 w-full h-full object-contain opacity-100 group-hover:opacity-0 transition-opacity duration-300" />
              <img src={logoColor} alt="" aria-hidden="true" loading="lazy" className="absolute inset-0 w-full h-full object-contain opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          ) : (
            <span className="text-sm font-semibold text-slate-500 text-center" style={{ fontFamily: PB_FONT }}>{c.name}</span>
          )}
        </div>
        <div className="border-t border-slate-100 px-3 py-2.5 text-center">
          <div className="text-sm font-semibold leading-tight truncate group-hover:text-[color:var(--color-accent,#0D9488)] transition-colors" style={{ color: 'var(--color-heading, #1a2332)' }}>
            {c.symbol || '—'}
          </div>
          <div className="text-[11px] text-slate-500 leading-tight truncate mt-0.5">{c.name}</div>
        </div>
      </Link>
      {/* Legacy parity: "View Details" (→ detail) + inert "N/A" (iiReport not migrated) */}
      <div className="mt-auto grid grid-cols-2 border-t border-slate-100 divide-x divide-slate-100">
        <Link
          to={`/companies/${c.slug}`}
          className="flex items-center justify-center gap-1 py-2.5 text-xs font-medium text-white transition-opacity duration-150 hover:opacity-90 active:opacity-80"
          style={{ backgroundColor: 'var(--color-button-bg, #1a2332)' }}
          data-testid={`company-logo-details-${c.slug}`}
        >
          <Search className="w-3 h-3" /> View Details
        </Link>
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Not available"
          className="py-2.5 text-xs font-medium text-white cursor-not-allowed select-none"
          style={{ backgroundColor: '#a3a3a3' }}
          data-testid={`company-logo-na-${c.slug}`}
        >
          N/A
        </button>
      </div>
    </div>
  );
}

function pageWindow(current, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  let start = Math.max(1, current - 3);
  let end = Math.min(pages, start + 6);
  start = Math.max(1, end - 6);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export default function CompaniesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [facets, setFacets] = useState({ sectors: [], industries: {} });
  const [error, setError] = useState(false);

  const page = parseInt(searchParams.get('page') || '1', 10);
  const view = searchParams.get('view') === 'logo' ? 'logo' : 'photo';
  const applied = {
    sector: searchParams.get('sector') || '',
    industry: searchParams.get('industry') || '',
    name: searchParams.get('name') || '',
    ticker: searchParams.get('ticker') || '',
  };

  // Draft form state; only committed to the URL on Search.
  const [form, setForm] = useState(applied);
  useEffect(() => { setForm(applied); }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    companiesAPI.facets().then(r => setFacets(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setData(null);
    companiesAPI.list({ ...applied, page })
      .then(r => { setData(r.data); setError(false); })
      .catch(() => setError(true));
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const industryOptions = useMemo(
    () => (form.sector ? (facets.industries[form.sector] || []) : []),
    [form.sector, facets]
  );

  const commit = (next, extra = {}) => {
    const params = { ...extra };
    Object.entries(next).forEach(([k, v]) => { if (v) params[k] = v; });
    if (view === 'logo') params.view = 'logo';
    setSearchParams(params);
  };

  const onSearch = (e) => { e.preventDefault(); commit(form); };
  const onReset = () => { setForm({ sector: '', industry: '', name: '', ticker: '' }); commit({}); };
  const gotoPage = (p) => commit(applied, p > 1 ? { page: p } : {});
  const setView = (v) => {
    const params = {};
    Object.entries(applied).forEach(([k, val]) => { if (val) params[k] = val; });
    if (page > 1) params.page = page;
    if (v === 'logo') params.view = 'logo';
    setSearchParams(params);
  };

  const hasFilters = Object.values(applied).some(Boolean);

  return (
    <div data-testid="companies-page" style={{ fontFamily: PB_FONT }}>
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-16 pt-24 md:pt-28">

        {/* Header */}
        <div className="mb-10">
          <div className="text-xs uppercase tracking-[0.2em] font-semibold mb-3" style={{ color: 'var(--color-accent, #0D9488)' }}>
            Portfolio Directory
          </div>
          <h1 className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--color-heading, #1a2332)', fontFamily: 'Playfair Display, serif' }}>
            Companies
          </h1>
          {data && (
            <p className="text-sm text-slate-500 mt-2" data-testid="companies-count">
              {data.total} compan{data.total === 1 ? 'y' : 'ies'}{hasFilters ? ' matching your search' : ''}
            </p>
          )}
        </div>

        {/* Search bar */}
        <form onSubmit={onSearch} className="bg-slate-50 border border-slate-100 rounded-sm p-4 md:p-5 mb-8" data-testid="companies-search">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <select
              value={form.sector}
              onChange={e => setForm({ ...form, sector: e.target.value, industry: '' })}
              className={`${inputCls} lg:col-span-2 appearance-none cursor-pointer`}
              data-testid="companies-filter-sector"
            >
              <option value="">All Sectors</option>
              {facets.sectors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={form.industry}
              onChange={e => setForm({ ...form, industry: e.target.value })}
              disabled={!form.sector}
              className={`${inputCls} lg:col-span-2 appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
              data-testid="companies-filter-industry"
            >
              <option value="">{form.sector ? 'All Industries' : 'Industry (pick a sector)'}</option>
              {industryOptions.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="By name…"
              className={inputCls}
              data-testid="companies-filter-name"
            />
            <input
              value={form.ticker}
              onChange={e => setForm({ ...form, ticker: e.target.value })}
              placeholder="By ticker…"
              className={inputCls}
              data-testid="companies-filter-ticker"
            />
          </div>
          <div className="flex gap-3 mt-3">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 h-11 text-sm font-medium rounded-sm transition-[transform,opacity] duration-150 hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: 'var(--color-button-bg, #1a2332)', color: 'var(--color-button-text, #fff)' }}
              data-testid="companies-search-btn"
            >
              <Search className="w-4 h-4" /> Search
            </button>
            {hasFilters && (
              <button
                type="button"
                onClick={onReset}
                className="inline-flex items-center gap-2 px-5 h-11 text-sm font-medium rounded-sm border border-slate-200 text-slate-600 hover:bg-white transition-colors duration-150 active:scale-[0.98]"
                data-testid="companies-reset-btn"
              >
                <X className="w-4 h-4" /> Reset
              </button>
            )}
          </div>
        </form>

        {/* View toggle */}
        <div className="flex items-center gap-0 mb-8 border-b border-slate-200" data-testid="companies-view-toggle">
          {[['photo', 'Photo view'], ['logo', 'Logo view']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`relative px-6 py-2.5 text-sm transition-colors duration-150 ${view === key ? 'font-semibold' : 'text-slate-500 hover:text-slate-700'}`}
              style={view === key ? { color: 'var(--color-heading, #1a2332)' } : undefined}
              data-testid={`companies-view-${key}`}
            >
              {label}
              {view === key && (
                <span className="absolute inset-x-0 -bottom-px h-0.5" style={{ backgroundColor: 'var(--color-accent, #0D9488)' }} />
              )}
            </button>
          ))}
        </div>

        {/* Grid */}
        {error ? (
          <div className="py-24 text-center text-slate-500 text-sm">Unable to load companies. Please try again.</div>
        ) : !data ? (
          <div className={`grid gap-6 ${view === 'logo' ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
            {Array.from({ length: view === 'logo' ? 12 : 9 }).map((_, i) => (
              <div key={i} className={`${view === 'logo' ? 'aspect-[4/3]' : 'aspect-[16/9]'} bg-slate-100 rounded-sm animate-pulse`} />
            ))}
          </div>
        ) : data.items.length === 0 ? (
          <div className="py-24 text-center" data-testid="companies-empty">
            <p className="text-slate-600 font-medium">No companies match your search.</p>
            <button onClick={onReset} className="mt-3 text-sm underline underline-offset-4" style={{ color: 'var(--color-accent, #0D9488)' }}>
              Clear filters
            </button>
          </div>
        ) : view === 'logo' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {data.items.map(c => <CompanyLogoCard key={c.slug} c={c} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.items.map(c => <CompanyPhotoCard key={c.slug} c={c} />)}
          </div>
        )}

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-12 flex-wrap" data-testid="companies-pagination">
            <button onClick={() => gotoPage(Math.max(1, page - 1))} disabled={page <= 1}
              className="p-2 border border-slate-200 rounded-sm disabled:opacity-30 hover:bg-slate-50 transition-colors duration-150"
              aria-label="Previous page" data-testid="companies-prev-btn">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {pageWindow(page, data.pages).map(p => (
              <button key={p} onClick={() => gotoPage(p)}
                className={`w-10 h-10 rounded-sm text-sm font-medium transition-colors duration-150 ${p === page ? 'text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                style={p === page ? { backgroundColor: 'var(--color-primary, #1a2332)' } : undefined}>
                {p}
              </button>
            ))}
            <button onClick={() => gotoPage(Math.min(data.pages, page + 1))} disabled={page >= data.pages}
              className="p-2 border border-slate-200 rounded-sm disabled:opacity-30 hover:bg-slate-50 transition-colors duration-150"
              aria-label="Next page" data-testid="companies-next-btn">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
