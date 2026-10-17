import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../lib/api';
import { DollarSign, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useDataTable, DataTableToolbar, DataTablePagination, SortableTh } from '../../components/admin/useDataTable';

export default function PurchasesManager() {
  const [items, setItems] = useState([]);
  useEffect(() => { adminAPI.getPurchases().then(r => setItems(r.data)).catch(console.error); }, []);

  const statusIcon = (status) => {
    if (status === 'paid') return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (status === 'pending') return <Clock className="w-4 h-4 text-amber-500" />;
    return <XCircle className="w-4 h-4 text-red-500" />;
  };

  // s149: list price / coupon / paid — rows without a coupon paid the list price
  const rows = (items || []).map(it => ({
    ...it,
    list_price: it.list_amount !== undefined && it.list_amount !== null ? it.list_amount : it.amount,
    coupon_code: it.coupon_code || (it.metadata && it.metadata.coupon_code) || '',
  }));
  const money = (v, cur) => `$${Number(v || 0).toFixed(2)}${cur ? ' ' + cur.toUpperCase() : ''}`;

  const dt = useDataTable(rows, {
    searchFields: ['service_name', 'session_id', 'payment_status', 'coupon_code'],
    defaultSort: { key: 'created_at', dir: 'desc' },
    storageKey: 'purchases',
  });

  return (
    <div data-testid="purchases-manager">
      <h1 className="text-2xl font-bold text-[#1a2332] mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>Purchase History</h1>
      <DataTableToolbar dt={dt} testId="purchases" placeholder="Search by service, session…" />
      <div className="bg-white rounded-sm border border-slate-100">
        <table className="w-full text-sm text-[#1a2332]">
          <thead><tr className="border-b bg-slate-50">
            <SortableTh dt={dt} field="service_name">Service</SortableTh>
            <SortableTh dt={dt} field="list_price">Price</SortableTh>
            <SortableTh dt={dt} field="coupon_code">Coupon</SortableTh>
            <SortableTh dt={dt} field="amount">Paid</SortableTh>
            <SortableTh dt={dt} field="payment_status">Status</SortableTh>
            <SortableTh dt={dt} field="created_at">Date</SortableTh>
            <th className="text-left p-3 font-medium text-slate-600">Session ID</th>
          </tr></thead>
          <tbody>{dt.visibleItems.map(item => (
            <tr key={item.id} className="border-b border-slate-50">
              <td className="p-3 font-medium">{item.service_name}</td>
              <td className="p-3 tabular-nums">{money(item.list_price)}</td>
              <td className="p-3">{item.coupon_code
                ? <span className="font-mono text-xs bg-teal-50 text-[#0D9488] border border-teal-100 rounded px-1.5 py-0.5">{item.coupon_code}</span>
                : '—'}</td>
              <td className="p-3 tabular-nums font-semibold"><span className="inline-flex items-center gap-1"><DollarSign className="w-3 h-3 text-[#0D9488]" />{Number(item.amount || 0).toFixed(2)} {item.currency?.toUpperCase()}</span></td>
              <td className="p-3"><span className="flex items-center gap-1">{statusIcon(item.payment_status)} <span className="capitalize">{item.payment_status}</span></span></td>
              <td className="p-3 text-xs">{new Date(item.created_at).toLocaleDateString()}</td>
              <td className="p-3 text-xs font-mono">{item.session_id?.substring(0, 20)}...</td>
            </tr>
          ))}</tbody>
        </table>
        {dt.totalAll === 0 && <div className="p-8 text-center text-slate-400 text-sm">No purchases yet</div>}
        {dt.totalAll > 0 && dt.totalFiltered === 0 && <div className="p-8 text-center text-slate-400 text-sm">No purchases match your search</div>}
        <DataTablePagination dt={dt} testId="purchases" />
      </div>
    </div>
  );
}
