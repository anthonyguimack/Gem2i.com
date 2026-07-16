import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, Link, useNavigate, useOutletContext } from 'react-router-dom';
import { memberAPI } from '../../lib/api';
import { normalizeRichText } from '../../lib/richText';
import { toast } from 'sonner';
import { Loader2, Package, ShoppingCart, Users, Gift, ArrowLeft } from 'lucide-react';

const v = (name, fb) => `var(--ma-${name}, ${fb})`;
const API = process.env.REACT_APP_BACKEND_URL;
const fmtMoney = (c, cur = 'usd') => {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: (cur || 'usd').toUpperCase() }).format((c || 0) / 100); }
  catch { return `$${((c || 0) / 100).toFixed(2)}`; }
};

export default function BundleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const ctx = useOutletContext() || {};
  const sectionTitle = ctx.sectionLabel ? ctx.sectionLabel('bundles', 'Session Bundles') : 'Session Bundles';

  useEffect(() => {
    memberAPI.getBundle(id)
      .then(r => setBundle(r.data))
      .catch(() => { toast.error('Bundle not found'); navigate('/my-account/bundles'); })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleBuy = async () => {
    if (!bundle) return;
    setBuying(true);
    try {
      const token = localStorage.getItem('auth_token');
      const r = await axios.post(`${API}/api/member/bundles/checkout/${bundle.id}`,
        { origin_url: window.location.origin },
        { headers: { Authorization: `Bearer ${token}` } });
      if (r.data?.url) { window.location.href = r.data.url; return; }
      toast.error('Checkout failed');
    } catch (e) { toast.error(e.response?.data?.detail || 'Error'); }
    finally { setBuying(false); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: v('text-muted', '#6b7280') }} /></div>;
  if (!bundle) return null;

  const savings = Math.max(0, (bundle.session_count * (bundle.single_session_value_cents || 0)) - bundle.price_cents);
  const isGlobal = !bundle.mentor_id;

  return (
    <div data-testid="bundle-detail-page" className="max-w-full overflow-x-hidden">
      <Link to="/my-account/bundles" className="inline-flex items-center gap-1 text-xs mb-4 hover:opacity-80" style={{ color: v('text-secondary', '#9ca3af') }} data-testid="back-to-bundles">
        <ArrowLeft className="w-3 h-3" /> Back to {sectionTitle}
      </Link>

      {bundle.banner_url && (
        <div className="w-full h-56 sm:h-72 rounded-lg overflow-hidden mb-6" data-testid="bundle-detail-banner">
          <img src={bundle.banner_url} alt={bundle.name} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            {isGlobal
              ? <span className="text-[10px] px-2 py-0.5 rounded" style={{ backgroundColor: v('accent', '#c9a84c') + '20', color: v('accent', '#c9a84c') }}>Global</span>
              : <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 flex items-center gap-1"><Users className="w-2.5 h-2.5" /> {bundle.mentor_name || 'Mentor'}</span>}
          </div>
          <h1 className="text-3xl font-bold" style={{ color: v('text-primary', '#fff'), fontFamily: "'DM Serif Display', serif" }}>{bundle.name}</h1>
        </div>
        <button onClick={handleBuy} disabled={buying} className="px-5 py-2.5 rounded text-sm font-medium flex items-center gap-2 disabled:opacity-50" style={{ backgroundColor: v('button-bg', '#c9a84c'), color: v('button-text', '#0d0f14') }} data-testid="bundle-detail-buy">
          {buying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
          Buy {fmtMoney(bundle.price_cents, bundle.currency)}
        </button>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        <div className="p-4 rounded-lg" style={{ backgroundColor: v('card-bg', '#13161e'), border: `1px solid ${v('card-border', 'rgba(255,255,255,0.05)')}` }} data-testid="bundle-stat-price">
          <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: v('text-muted', '#6b7280') }}>Price</p>
          <p className="text-xl font-bold" style={{ color: v('text-primary', '#fff') }}>{fmtMoney(bundle.price_cents, bundle.currency)}</p>
        </div>
        <div className="p-4 rounded-lg" style={{ backgroundColor: v('card-bg', '#13161e'), border: `1px solid ${v('card-border', 'rgba(255,255,255,0.05)')}` }} data-testid="bundle-stat-sessions">
          <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: v('text-muted', '#6b7280') }}>Sessions included</p>
          <p className="text-xl font-bold flex items-center gap-1.5" style={{ color: v('text-primary', '#fff') }}><Package className="w-4 h-4" />{bundle.session_count}</p>
        </div>
        {savings > 0 ? (
          <div className="p-4 rounded-lg" style={{ backgroundColor: v('card-bg', '#13161e'), border: `1px solid ${v('accent', '#c9a84c')}` }} data-testid="bundle-stat-savings">
            <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: v('text-muted', '#6b7280') }}>Savings</p>
            <p className="text-xl font-bold flex items-center gap-1.5" style={{ color: v('accent', '#c9a84c') }}><Gift className="w-4 h-4" />{fmtMoney(savings, bundle.currency)}</p>
            <p className="text-[10px] mt-0.5" style={{ color: v('text-muted', '#6b7280') }}>vs {bundle.session_count}× single sessions</p>
          </div>
        ) : (
          <div className="p-4 rounded-lg" style={{ backgroundColor: v('card-bg', '#13161e'), border: `1px solid ${v('card-border', 'rgba(255,255,255,0.05)')}` }} data-testid="bundle-stat-currency">
            <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: v('text-muted', '#6b7280') }}>Currency</p>
            <p className="text-xl font-bold uppercase" style={{ color: v('text-primary', '#fff') }}>{bundle.currency || 'usd'}</p>
          </div>
        )}
      </div>

      {bundle.single_session_value_cents > 0 && (
        <div className="mb-6 p-3 rounded text-xs" style={{ backgroundColor: v('input-bg', '#0d0f14'), color: v('text-secondary', '#9ca3af') }}>
          Equivalent of <strong style={{ color: v('text-primary', '#fff') }}>{fmtMoney(bundle.single_session_value_cents, bundle.currency)}</strong> per single session.
        </div>
      )}

      {bundle.description && (
        <div className="rounded-lg p-6 mb-6" style={{ backgroundColor: v('card-bg', '#13161e'), border: `1px solid ${v('card-border', 'rgba(255,255,255,0.05)')}` }}>
          <h2 className="text-sm font-semibold mb-3 uppercase tracking-wider" style={{ color: v('text-secondary', '#9ca3af') }}>About this bundle</h2>
          <div className="rich-text-content [&_p]:!text-inherit [&_ul]:!pl-4 [&_ol]:!pl-4" style={{ color: v('text-primary', '#fff') }} data-testid="bundle-detail-description" dangerouslySetInnerHTML={{ __html: normalizeRichText(bundle.description) }} />
        </div>
      )}
    </div>
  );
}
