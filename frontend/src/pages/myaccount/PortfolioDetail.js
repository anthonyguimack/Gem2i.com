import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMember } from '../../lib/memberAuth';
import { memberAPI } from '../../lib/api';
import { ArrowLeft, Edit2, Loader2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#c9a84c', '#0D9488', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4', '#ef4444', '#10b981', '#f97316'];

const fmtCurrency = (v) => `$${(parseFloat(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtPct = (v) => `${(parseFloat(v) || 0).toFixed(2)}%`;
const fmtDate = (d) => {
  if (!d) return '-';
  const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[2]}/${m[3]}/${m[1]}`;
  return d;
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#13161e] border border-white/10 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-white font-medium">{payload[0].name}</p>
      <p className="text-[#c9a84c]">{fmtCurrency(payload[0].value)}</p>
    </div>
  );
};

export default function PortfolioDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { member } = useMember();
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    memberAPI.getPortfolio(id).then(r => setP(r.data)).catch(() => navigate('/my-account/portfolios')).finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading || !p) return <div className="flex items-center justify-center h-64" data-testid="portfolio-detail-page"><Loader2 className="w-8 h-8 text-[#c9a84c] animate-spin" /></div>;

  const isOwner = p.owner_member_id === member?.member_id;
  const holdings = p.holdings || [];
  const cashBalance = parseFloat(p.cash_balance) || 0;
  const totalHoldings = holdings.reduce((s, h) => s + ((parseFloat(h.price) || 0) * (parseInt(h.shares) || 0)), 0);
  const totalValue = totalHoldings + cashBalance;
  const cashPct = totalValue > 0 ? (cashBalance / totalValue * 100) : 0;
  const stockPct = 100 - cashPct;

  // Stock holdings with calculated values, sorted by rank
  const stockHoldings = holdings.map(h => {
    const price = parseFloat(h.price) || 0;
    const shares = parseInt(h.shares) || 0;
    const currentValue = price * shares;
    return {
      ...h, price, shares, currentValue,
      portfolioPct: totalValue > 0 ? (currentValue / totalValue * 100) : 0,
    };
  }).sort((a, b) => (parseInt(a.rank) || 999) - (parseInt(b.rank) || 999));

  // CASH row (always first, rank 0)
  const cashRow = {
    rank: 0,
    portfolioPct: totalValue > 0 ? (cashBalance / totalValue * 100) : 0,
    currentValue: cashBalance,
    symbol: 'CASH', security: 'CASH', sector: 'CASH', industry: 'CASH',
    price: cashBalance, shares: 1,
  };

  // All rows: CASH first, then stocks
  const allRows = [cashRow, ...stockHoldings];
  const grandTotal = totalValue; // cash + stocks

  // Sector breakdown — include CASH so percentages reach 100%
  const sectorMap = {};
  if (cashBalance > 0) sectorMap['CASH'] = cashBalance;
  stockHoldings.forEach(h => { const s = h.sector || 'Other'; sectorMap[s] = (sectorMap[s] || 0) + h.currentValue; });
  const sectorData = Object.entries(sectorMap).map(([name, value]) => ({ name, value }));

  // Industry breakdown — include CASH
  const indMap = {};
  if (cashBalance > 0) indMap['CASH'] = cashBalance;
  stockHoldings.forEach(h => { const ind = h.industry || 'Other'; indMap[ind] = (indMap[ind] || 0) + h.currentValue; });
  const industryData = Object.entries(indMap).map(([name, value]) => ({ name, value }));

  // Current Stock Holdings — include CASH
  const stockChartData = [
    ...(cashBalance > 0 ? [{ name: 'CASH', value: cashBalance }] : []),
    ...stockHoldings.filter(h => h.currentValue > 0).map(h => ({ name: h.symbol, value: h.currentValue })),
  ];

  // Portfolio Balance (Cash vs Stocks)
  const balanceData = [
    { name: 'Cash', value: cashBalance },
    { name: 'Stocks', value: totalHoldings },
  ].filter(d => d.value > 0);

  return (
    <div data-testid="portfolio-detail-page">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/my-account/portfolios')} className="text-gray-400 hover:text-white"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'DM Serif Display', serif" }}>{p.title}</h1>
            <p className="text-gray-500 text-sm">As of {fmtDate(p.as_of_date)}</p>
          </div>
        </div>
        {isOwner && (
          <button onClick={() => navigate(`/my-account/portfolios/${id}/edit`)}
            className="px-4 py-2 bg-[#c9a84c] text-[#0d0f14] rounded text-sm font-semibold flex items-center gap-2"
            data-testid="edit-portfolio-btn">
            <Edit2 className="w-4 h-4" /> Edit
          </button>
        )}
      </div>

      {/* Description */}
      {p.description && (
        <div className="bg-[#13161e] border border-white/5 rounded-lg p-5 mb-6">
          <div className="prose prose-invert prose-sm max-w-none text-gray-300 [&_p]:text-gray-300 [&_h1]:text-white [&_h2]:text-white [&_h3]:text-white [&_a]:text-[#c9a84c] [&_strong]:text-white [&_b]:text-white" dangerouslySetInnerHTML={{ __html: p.description }} />
        </div>
      )}

      {/* Portfolio Balance Banner */}
      <div className="bg-[#c9a84c] rounded-lg p-5 mb-6 text-center" data-testid="portfolio-balance">
        <p className="text-[#0d0f14] text-sm font-medium">PORTFOLIO BALANCE</p>
        <p className="text-[#0d0f14] text-3xl font-bold" style={{ fontFamily: "'DM Serif Display', serif" }}>
          {fmtCurrency(grandTotal)}
        </p>
        <div className="flex justify-center gap-8 mt-2 text-xs text-[#0d0f14]/70">
          <span>Cash: {fmtPct(cashPct)} ({fmtCurrency(cashBalance)})</span>
          <span>Stocks: {fmtPct(stockPct)} ({fmtCurrency(totalHoldings)})</span>
        </div>
      </div>

      {/* Holdings Table — includes CASH row, no Cost column, "Price" instead of "Share Price" */}
      <div className="bg-[#13161e] border border-white/5 rounded-lg overflow-hidden mb-6">
        <h3 className="text-sm font-semibold text-white p-4 border-b border-white/5">Holdings</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="holdings-table">
            <thead><tr className="border-b border-white/5 text-gray-400 text-xs">
              <th className="text-left p-3">Rank</th>
              <th className="text-right p-3">% Portfolio</th>
              <th className="text-right p-3">Current Value</th>
              <th className="text-left p-3">Symbol</th>
              <th className="text-left p-3">Security</th>
              <th className="text-left p-3">Sector</th>
              <th className="text-left p-3">Industry</th>
              <th className="text-right p-3">Price</th>
              <th className="text-right p-3"># Shares</th>
            </tr></thead>
            <tbody>
              {allRows.map((h, i) => {
                const isCash = h.symbol === 'CASH';
                return (
                  <tr key={i} className={`border-b border-white/5 ${isCash ? 'bg-[#c9a84c]/5' : 'hover:bg-white/[0.02]'}`} data-testid={`holding-row-${i}`}>
                    <td className="p-3 text-gray-400">{h.rank}</td>
                    <td className="p-3 text-right text-[#c9a84c] font-medium">{fmtPct(h.portfolioPct)}</td>
                    <td className="p-3 text-right text-white font-medium">{fmtCurrency(h.currentValue)}</td>
                    <td className={`p-3 font-mono ${isCash ? 'text-[#c9a84c] font-semibold' : 'text-[#c9a84c]'}`}>{h.symbol}</td>
                    <td className="p-3 text-gray-300">{h.security || '-'}</td>
                    <td className="p-3 text-gray-400">{h.sector || '-'}</td>
                    <td className="p-3 text-gray-400">{h.industry || '-'}</td>
                    <td className="p-3 text-right text-gray-300">{fmtCurrency(h.price)}</td>
                    <td className="p-3 text-right text-gray-300">{h.shares}</td>
                  </tr>
                );
              })}
              {allRows.length === 0 && (
                <tr><td colSpan={9} className="p-6 text-center text-gray-500 text-sm">No holdings in this portfolio.</td></tr>
              )}
            </tbody>
            {allRows.length > 0 && (
              <tfoot>
                <tr className="border-t border-white/10 bg-white/[0.02]">
                  <td className="p-3 text-white font-semibold" colSpan={2}>Total</td>
                  <td className="p-3 text-right text-white font-bold">{fmtCurrency(grandTotal)}</td>
                  <td colSpan={6}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Charts — 2x2 layout for better sizing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Current Stock Holdings */}
        {stockChartData.length > 0 && (
          <div className="bg-[#13161e] border border-white/5 rounded-lg p-5" data-testid="holdings-chart">
            <h3 className="text-sm font-semibold text-white mb-3">Current Stock Holdings</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={stockChartData} cx="50%" cy="50%" innerRadius={55} outerRadius={95} dataKey="value" nameKey="name">
                  {stockChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-2">
              {stockChartData.map((s, i) => (
                <span key={i} className="flex items-center gap-1 text-xs text-gray-400">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  {s.name} ({totalValue > 0 ? fmtPct(s.value / totalValue * 100) : '0.00%'})
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Sector Breakdown */}
        {sectorData.length > 0 && (
          <div className="bg-[#13161e] border border-white/5 rounded-lg p-5" data-testid="sector-chart">
            <h3 className="text-sm font-semibold text-white mb-3">By Sector</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={sectorData} cx="50%" cy="50%" innerRadius={55} outerRadius={95} dataKey="value" nameKey="name">
                  {sectorData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-2">
              {sectorData.map((s, i) => (
                <span key={i} className="flex items-center gap-1 text-xs text-gray-400">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  {s.name} ({totalValue > 0 ? fmtPct(s.value / totalValue * 100) : '0.00%'})
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Industry Breakdown */}
        {industryData.length > 0 && (
          <div className="bg-[#13161e] border border-white/5 rounded-lg p-5" data-testid="industry-chart">
            <h3 className="text-sm font-semibold text-white mb-3">By Industry</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={industryData} cx="50%" cy="50%" innerRadius={55} outerRadius={95} dataKey="value" nameKey="name">
                  {industryData.map((_, i) => <Cell key={i} fill={COLORS[(i + 3) % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-2">
              {industryData.map((s, i) => (
                <span key={i} className="flex items-center gap-1 text-xs text-gray-400">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[(i + 3) % COLORS.length] }} />
                  {s.name} ({totalValue > 0 ? fmtPct(s.value / totalValue * 100) : '0.00%'})
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Portfolio Balance (Cash vs Stocks) */}
        {balanceData.length > 0 && (
          <div className="bg-[#13161e] border border-white/5 rounded-lg p-5" data-testid="balance-chart">
            <h3 className="text-sm font-semibold text-white mb-3">Portfolio Balance</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={balanceData} cx="50%" cy="50%" innerRadius={55} outerRadius={95} dataKey="value" nameKey="name">
                  <Cell fill="#c9a84c" />
                  <Cell fill="#3b82f6" />
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 mt-2 justify-center">
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#c9a84c' }} />Cash {fmtPct(cashPct)}
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#3b82f6' }} />Stocks {fmtPct(stockPct)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
