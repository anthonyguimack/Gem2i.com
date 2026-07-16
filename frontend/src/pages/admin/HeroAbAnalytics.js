/**
 * Hero CTA A/B analytics — compares Variant A vs Variant B per slide × button.
 * Source: /api/admin/hero-ab/analytics (aggregates `hero_cta_events`).
 */
import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { BarChart3, TrendingUp, TrendingDown, Loader2, Trophy, Eye, MousePointerClick } from 'lucide-react';

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-lg border bg-white p-5" style={{ borderColor: 'var(--ad-card-border, #e2e8f0)' }} data-testid={`hero-ab-stat-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-wider font-semibold mb-2">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <div className="text-3xl font-bold" style={{ color: 'var(--ad-heading, #1a2332)' }}>{value}</div>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function VariantCell({ v, winner }) {
  return (
    <div className={`rounded-lg p-4 border-2 ${winner ? 'border-emerald-400 bg-emerald-50/40' : 'border-slate-200 bg-slate-50/40'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${winner ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
          {winner && <Trophy className="w-3 h-3" />} Variant {v.label}
        </span>
        <span className="text-xs text-slate-400">{v.impressions} imp · {v.clicks} clk</span>
      </div>
      <p className="text-sm font-semibold truncate mb-2" title={v.text} style={{ color: 'var(--ad-heading, #1a2332)' }}>"{v.text}"</p>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-bold" style={{ color: winner ? '#10b981' : 'var(--ad-heading, #1a2332)' }}>{v.rate.toFixed(1)}%</span>
        <span className="text-xs text-slate-400">CTR</span>
      </div>
    </div>
  );
}

export default function HeroAbAnalytics() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ rows: [], totals: { impressions: 0, clicks: 0, rate: 0 } });

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/admin/hero-ab/analytics');
      setData(r.data);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  return (
    <div data-testid="hero-ab-analytics">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--ad-heading, #1a2332)', fontFamily: "'Playfair Display', serif" }}>
            <BarChart3 className="w-5 h-5" style={{ color: 'var(--ad-accent, #0D9488)' }} /> Hero CTA A/B Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-1">Compare Variant A vs B click-through rates for each CTA in your hero slides. Enable A/B inside each slide to start collecting data.</p>
        </div>
        <button onClick={load} className="text-xs font-medium text-slate-500 hover:text-slate-800" data-testid="hero-ab-refresh">Refresh ↻</button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin inline-block" /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatCard icon={Eye} label="Total Impressions" value={data.totals.impressions.toLocaleString()} sub="Across all active A/B tests" />
            <StatCard icon={MousePointerClick} label="Total Clicks" value={data.totals.clicks.toLocaleString()} />
            <StatCard icon={TrendingUp} label="Overall CTR" value={`${data.totals.rate || 0}%`} sub="All variants combined" />
          </div>

          {data.rows.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-slate-200 p-10 text-center bg-white" data-testid="hero-ab-empty">
              <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500 mb-1 font-semibold">No A/B data yet</p>
              <p className="text-xs text-slate-400">Open any hero slide, toggle <span className="font-mono text-slate-700">Enable A/B testing</span>, and fill in Variant B copy for at least one CTA. Impressions and clicks will appear here automatically.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {data.rows.map((r, i) => {
                const winner = r.variant_a.rate === r.variant_b.rate ? null : (r.variant_a.rate > r.variant_b.rate ? 'A' : 'B');
                const uplift = r.uplift_pct;
                const UpliftIcon = uplift >= 0 ? TrendingUp : TrendingDown;
                return (
                  <div key={i} className="rounded-lg border bg-white p-5" style={{ borderColor: 'var(--ad-card-border, #e2e8f0)' }} data-testid={`hero-ab-row-${r.slide_id}-${r.button_index}`}>
                    <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{r.button_label}</p>
                        <h3 className="font-bold text-lg" style={{ color: 'var(--ad-heading, #1a2332)' }}>{r.slide_title}</h3>
                      </div>
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${uplift >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        <UpliftIcon className="w-3.5 h-3.5" /> {uplift >= 0 ? '+' : ''}{uplift}% uplift (B vs A)
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <VariantCell v={{ ...r.variant_a, label: 'A' }} winner={winner === 'A'} />
                      <VariantCell v={{ ...r.variant_b, label: 'B' }} winner={winner === 'B'} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
