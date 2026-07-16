import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useOutletContext } from 'react-router-dom';
import { memberAPI } from '../../lib/api';
import { normalizeRichText } from '../../lib/richText';
import { toast } from 'sonner';
import { Loader2, Package, ShoppingCart, Users, Gift, CreditCard, ArrowRight } from 'lucide-react';

const v = (name, fb) => `var(--ma-${name}, ${fb})`;
const API = process.env.REACT_APP_BACKEND_URL;
const fmtMoney = (c, cur = 'usd') => { try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: (cur || 'usd').toUpperCase() }).format((c || 0) / 100); } catch { return `$${((c || 0) / 100).toFixed(2)}`; } };

function BundleCard({ bundle, onBuy, buying }) {
  const savings = Math.max(0, (bundle.session_count * (bundle.single_session_value_cents || 0)) - bundle.price_cents);
  const isGlobal = !bundle.mentor_id;
  return (
    <div className="rounded-lg border overflow-hidden flex flex-col" style={{ backgroundColor: v('card-bg', '#13161e'), borderColor: v('card-border', 'rgba(255,255,255,0.05)') }} data-testid={`bundle-card-${bundle.id}`}>
      {bundle.banner_url && (
        <div className="w-full h-36 overflow-hidden" data-testid={`bundle-banner-${bundle.id}`}>
          <img src={bundle.banner_url} alt={bundle.name} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-5 flex-1">
        <div className="flex items-center gap-2 mb-2">
          {isGlobal
            ? <span className="text-[10px] px-2 py-0.5 rounded" style={{ backgroundColor: v('accent', '#c9a84c') + '20', color: v('accent', '#c9a84c') }}>Global</span>
            : <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 flex items-center gap-1"><Users className="w-2.5 h-2.5" /> {bundle.mentor_name || 'Mentor'}</span>}
        </div>
        <h3 className="text-lg font-semibold mb-1" style={{ color: v('text-primary', '#fff') }}>{bundle.name}</h3>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-2xl font-bold" style={{ color: v('text-primary', '#fff') }}>{fmtMoney(bundle.price_cents, bundle.currency)}</span>
          <span className="text-xs" style={{ color: v('text-muted', '#6b7280') }}>for {bundle.session_count} sessions</span>
        </div>
        {savings > 0 && (
          <div className="text-xs mb-3 flex items-center gap-1.5" style={{ color: v('accent', '#c9a84c') }} data-testid={`bundle-savings-${bundle.id}`}>
            <Gift className="w-3.5 h-3.5" /> <strong>{fmtMoney((bundle.session_count * bundle.single_session_value_cents), bundle.currency)} value</strong>
            &nbsp;— save {fmtMoney(savings, bundle.currency)}
          </div>
        )}
        {bundle.summary && (
          <div className="text-xs mb-2 rich-text-content [&_p]:!mb-1 [&_p]:!text-inherit" style={{ color: v('text-secondary', '#9ca3af') }} dangerouslySetInnerHTML={{ __html: normalizeRichText(bundle.summary) }} />
        )}
        <Link to={`/my-account/bundles/${bundle.id}`} className="text-xs inline-flex items-center gap-1 hover:opacity-80" style={{ color: v('accent', '#c9a84c') }} data-testid={`bundle-read-more-${bundle.id}`}>
          Read more <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <button onClick={() => onBuy(bundle)} disabled={buying === bundle.id} className="py-3 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 border-t" style={{ backgroundColor: v('button-bg', '#c9a84c'), color: v('button-text', '#0d0f14'), borderColor: v('card-border', 'rgba(255,255,255,0.05)') }} data-testid={`buy-bundle-${bundle.id}`}>
        {buying === bundle.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
        Buy {fmtMoney(bundle.price_cents, bundle.currency)}
      </button>
    </div>
  );
}

export default function BundlesBrowse() {
  const [bundles, setBundles] = useState([]);
  const [credits, setCredits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(null);
  const ctx = useOutletContext() || {};
  const title = ctx.sectionLabel ? ctx.sectionLabel('bundles', 'Session Bundles') : 'Session Bundles';

  const load = () => {
    setLoading(true);
    Promise.all([
      memberAPI.getBundles().catch(() => ({ data: [] })),
      memberAPI.getMyCredits().catch(() => ({ data: [] })),
    ]).then(([b, c]) => { setBundles(b.data || []); setCredits(c.data || []); setLoading(false); });
  };
  useEffect(load, []);

  const handleBuy = async (b) => {
    setBuying(b.id);
    try {
      const token = localStorage.getItem('auth_token');
      const r = await axios.post(`${API}/api/member/bundles/checkout/${b.id}`, { origin_url: window.location.origin }, { headers: { Authorization: `Bearer ${token}` } });
      if (r.data?.url) { window.location.href = r.data.url; return; }
      toast.error('Checkout failed'); setBuying(null);
    } catch (e) { toast.error(e.response?.data?.detail || 'Error'); setBuying(null); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: v('text-muted', '#6b7280') }} /></div>;

  return (
    <div data-testid="bundles-browse-page">
      <div className="flex items-center gap-3 mb-2">
        <Package className="w-6 h-6" style={{ color: v('accent', '#c9a84c') }} />
        <h1 className="text-2xl font-bold" style={{ color: v('text-primary', '#fff'), fontFamily: "'DM Serif Display', serif" }} data-testid="bundles-title">{title}</h1>
      </div>
      <p className="text-sm mb-6" style={{ color: v('text-secondary', '#9ca3af') }}>Buy sessions in bulk at a discount. Credits never expire and redeem against any eligible paid slot.</p>

      {credits.length > 0 && (
        <div className="rounded-lg border p-4 mb-6" style={{ backgroundColor: v('card-bg', '#13161e'), borderColor: v('card-border', 'rgba(255,255,255,0.05)') }} data-testid="my-credits-block">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4" style={{ color: v('accent', '#c9a84c') }} />
            <h2 className="text-sm font-semibold" style={{ color: v('text-primary', '#fff') }}>My session credits</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {credits.map(p => (
              <div key={p.id} className="p-3 rounded" style={{ backgroundColor: v('input-bg', '#0d0f14'), border: `1px solid ${v('input-border', 'rgba(255,255,255,0.1)')}` }} data-testid={`credit-pack-${p.id}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: v('text-primary', '#fff') }}>{p.bundle_name}</p>
                    <p className="text-[11px]" style={{ color: v('text-muted', '#6b7280') }}>{p.mentor_id ? (p.mentor_name || 'Mentor') + ' only' : 'Any mentor'}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-2xl font-bold leading-none" style={{ color: v('accent', '#c9a84c') }}>{p.remaining}</p>
                    <p className="text-[10px]" style={{ color: v('text-muted', '#6b7280') }}>of {p.session_count}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {bundles.length === 0 ? (
        <div className="rounded-lg border p-12 text-center" style={{ backgroundColor: v('card-bg', '#13161e'), borderColor: v('card-border', 'rgba(255,255,255,0.05)'), color: v('text-muted', '#6b7280') }}>
          <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
          No bundles available right now. Check back soon.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {bundles.map(b => <BundleCard key={b.id} bundle={b} onBuy={handleBuy} buying={buying} />)}
        </div>
      )}
    </div>
  );
}
