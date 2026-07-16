import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { companiesAPI } from '../lib/api';
import { normalizeRichText } from '../lib/richText';
import {
  ArrowLeft, ExternalLink, Globe, Layers, Home, Calendar, Clock,
  Users, DollarSign, Rocket, Tag,
  Facebook, Twitter, Linkedin, Instagram, Youtube, Link as LinkIcon,
} from 'lucide-react';

import { CompanyBannerFallback } from './CompaniesPage';

const PB_FONT = "'Plus Jakarta Sans', 'Inter', sans-serif";

const SOCIAL_ICONS = {
  facebook: Facebook, twitter: Twitter, linkedin: Linkedin,
  instagram: Instagram, youtube: Youtube,
};

function FactRow({ icon: Icon, value, label }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-b-0">
      <Icon className="w-4 h-4 mt-1 shrink-0" style={{ color: 'var(--color-accent, #0D9488)' }} />
      <div className="min-w-0">
        <div className="text-sm font-semibold break-words" style={{ color: 'var(--color-heading, #1a2332)' }}>
          {value || '—'}
        </div>
        <div className="text-[11px] uppercase tracking-wider text-slate-400 mt-0.5">{label}</div>
      </div>
    </div>
  );
}

function fmtDate(iso) {
  if (!iso) return null;
  const d = new Date(iso + 'T00:00:00');
  return isNaN(d) ? iso : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function fmtNewsDate(iso) {
  if (!iso) return '';
  const d = new Date(iso.replace(' ', 'T'));
  return isNaN(d) ? iso : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function CompanyDetailPage() {
  const { slug } = useParams();
  const [company, setCompany] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ok | notfound
  const [tab, setTab] = useState('description');

  useEffect(() => {
    setStatus('loading');
    setTab('description');
    companiesAPI.detail(slug)
      .then(r => { setCompany(r.data); setStatus('ok'); })
      .catch(() => setStatus('notfound'));
  }, [slug]);

  if (status === 'loading') {
    return (
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-16 pt-24 md:pt-28" data-testid="company-loading">
        <div className="h-8 w-72 bg-slate-100 rounded-sm animate-pulse mb-6" />
        <div className="aspect-[21/9] bg-slate-100 rounded-sm animate-pulse" />
      </div>
    );
  }

  if (status === 'notfound') {
    return (
      <div className="max-w-3xl mx-auto px-6 py-32 text-center" style={{ fontFamily: PB_FONT }} data-testid="company-notfound">
        <h1 className="text-2xl font-bold mb-3" style={{ color: 'var(--color-heading, #1a2332)', fontFamily: 'Playfair Display, serif' }}>
          Company not found
        </h1>
        <p className="text-slate-500 text-sm mb-8">The company you are looking for does not exist or is no longer available.</p>
        <Link to="/companies" className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-sm"
          style={{ backgroundColor: 'var(--color-button-bg, #1a2332)', color: 'var(--color-button-text, #fff)' }}>
          <ArrowLeft className="w-4 h-4" /> Back to Companies List
        </Link>
      </div>
    );
  }

  const c = company;
  const socials = Object.entries(c.socials || {}).filter(([, url]) => url);
  const news = c.news || [];
  const backBtn = (
    <Link to="/companies"
      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-sm transition-opacity duration-150 hover:opacity-90 active:scale-[0.98]"
      style={{ backgroundColor: 'var(--color-button-bg, #1a2332)', color: 'var(--color-button-text, #fff)' }}>
      <ArrowLeft className="w-4 h-4" /> Back to Companies List
    </Link>
  );

  return (
    <div data-testid="company-detail" style={{ fontFamily: PB_FONT }}>
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-16 pt-24 md:pt-28">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* ---- Main column ---- */}
          <div className="lg:col-span-2 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] font-semibold mb-2" style={{ color: 'var(--color-accent, #0D9488)' }}>
                  {c.sector || 'Company'}
                </div>
                <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--color-heading, #1a2332)', fontFamily: 'Playfair Display, serif' }} data-testid="company-title">
                  {c.symbol ? `${c.symbol} · ` : ''}{c.name}
                </h1>
              </div>
              {backBtn}
            </div>

            {/* Hero banner + logo overlay */}
            <div className="relative rounded-sm overflow-hidden border border-slate-100 bg-slate-100">
              {c.image_detail ? (
                <img src={c.image_detail} alt={c.name} className="w-full object-cover" data-testid="company-banner" />
              ) : (
                <div className="aspect-[21/9]"><CompanyBannerFallback name={c.name} symbol={c.symbol} /></div>
              )}
              {c.logo_on && (
                <div className="absolute top-4 left-4 w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden bg-white shadow-lg flex items-center justify-center p-1">
                  <img src={c.logo_on} alt={`${c.name} logo`} className="w-full h-full object-contain rounded-full" data-testid="company-logo-overlay" />
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="flex items-center border-b border-slate-200 mt-10" data-testid="company-tabs">
              {[['description', 'Description'], ['news', `News${news.length ? ` (${news.length})` : ''}`]].map(([key, label]) => (
                <button key={key} onClick={() => setTab(key)}
                  className={`relative px-6 py-2.5 text-sm transition-colors duration-150 ${tab === key ? 'font-semibold' : 'text-slate-500 hover:text-slate-700'}`}
                  style={tab === key ? { color: 'var(--color-heading, #1a2332)' } : undefined}
                  data-testid={`company-tab-${key}`}>
                  {label}
                  {tab === key && <span className="absolute inset-x-0 -bottom-px h-0.5" style={{ backgroundColor: 'var(--color-accent, #0D9488)' }} />}
                </button>
              ))}
            </div>

            {tab === 'description' ? (
              <div className="pt-8" data-testid="company-description">
                {c.description ? (
                  <div className="rich-text-content text-[15px] leading-relaxed text-slate-600"
                    dangerouslySetInnerHTML={{ __html: normalizeRichText(c.description) }} />
                ) : (
                  <p className="text-sm text-slate-400 italic">No description available.</p>
                )}
                <div className="flex flex-wrap items-center justify-between gap-4 mt-8 pt-6 border-t border-slate-100">
                  <div className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--color-heading, #1a2332)' }}>
                    <Tag className="w-4 h-4" style={{ color: 'var(--color-accent, #0D9488)' }} /> {c.name}
                  </div>
                  {socials.length > 0 && (
                    <div className="flex items-center gap-2" data-testid="company-socials">
                      <span className="text-xs text-slate-400 mr-1">Company Social Media:</span>
                      {socials.map(([key, url]) => {
                        const Icon = SOCIAL_ICONS[key] || LinkIcon;
                        return (
                          <a key={key} href={url} target="_blank" rel="noopener noreferrer" aria-label={key}
                            className="w-9 h-9 flex items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:text-white transition-colors duration-200 hover:border-transparent"
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-accent, #0D9488)'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; }}>
                            <Icon className="w-4 h-4" />
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="pt-8 space-y-6" data-testid="company-news">
                {news.length === 0 && <p className="text-sm text-slate-400 italic">No news available for this company.</p>}
                {news.map((n, i) => (
                  <article key={i} className="flex gap-5 pb-6 border-b border-slate-100 last:border-b-0">
                    {n.image && (
                      <a href={n.url || '#'} target="_blank" rel="noopener noreferrer" className="hidden sm:block shrink-0 w-40 h-24 rounded-sm overflow-hidden bg-slate-100">
                        <img src={n.image} alt="" loading="lazy" className="w-full h-full object-cover" />
                      </a>
                    )}
                    <div className="min-w-0">
                      <h3 className="text-[15px] font-semibold leading-snug" style={{ color: 'var(--color-heading, #1a2332)' }}>
                        {n.url ? (
                          <a href={n.url} target="_blank" rel="noopener noreferrer" className="hover:underline underline-offset-4">{n.title}</a>
                        ) : n.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-400">
                        {n.published_date && <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> {fmtNewsDate(n.published_date)}</span>}
                        {n.site && <span className="inline-flex items-center gap-1"><LinkIcon className="w-3 h-3" /> {n.site}</span>}
                      </div>
                      {n.description && <div className="text-sm text-slate-500 mt-2 line-clamp-3 rich-text-content" dangerouslySetInnerHTML={{ __html: normalizeRichText(n.description) }} />}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          {/* ---- Facts sidebar ---- */}
          <aside className="lg:col-span-1">
            <div className="lg:sticky lg:top-28 space-y-6">
              <div className="space-y-3">
                {c.link_sec && (
                  <a href={c.link_sec} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 text-sm font-medium rounded-sm text-white transition-opacity duration-150 hover:opacity-90 active:scale-[0.99]"
                    style={{ backgroundColor: 'var(--color-primary, #1a2332)' }} data-testid="company-sec-link">
                    <ExternalLink className="w-4 h-4" /> SEC.GOV URL
                  </a>
                )}
                {c.link_company && (
                  <a href={c.link_company} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 text-sm font-medium rounded-sm transition-opacity duration-150 hover:opacity-90 active:scale-[0.99]"
                    style={{ backgroundColor: 'var(--color-accent, #0D9488)', color: '#fff' }} data-testid="company-site-link">
                    <ExternalLink className="w-4 h-4" /> Company URL
                  </a>
                )}
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-sm px-5 py-2" data-testid="company-facts">
                <FactRow icon={Globe} value={c.sector} label="Sector" />
                <FactRow icon={Layers} value={c.industry} label="Industry" />
                <FactRow icon={Home} value={(c.indexes || []).join(', ')} label="Index" />
                <FactRow icon={Calendar} value={fmtDate(c.dates?.launched)} label="Launched" />
                <FactRow icon={Clock} value={fmtDate(c.dates?.funding_end)} label="Funding Ends" />
                <FactRow icon={Calendar} value={fmtDate(c.dates?.project)} label="Project Date" />
              </div>

              {/* Funding block — view-only HTML parity with the legacy page (D5):
                  these figures were never populated by the source system. */}
              <div className="bg-slate-50 border border-slate-100 rounded-sm px-5 py-2" data-testid="company-funding">
                <FactRow icon={Users} value={null} label="Investors" />
                <FactRow icon={Users} value={null} label="Backers" />
                <FactRow icon={DollarSign} value={null} label="Funded" />
                <FactRow icon={Rocket} value={null} label="Days to Go" />
              </div>

              {backBtn}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
