import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { memberAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Loader2, Calendar, Video, ExternalLink, Rss, CreditCard, Gift } from 'lucide-react';
import CalendarSyncCard from '../../components/CalendarSyncCard';

const v = (name, fb) => `var(--ma-${name}, ${fb})`;
const fmtMoney = (c, cur = 'usd') => { try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: (cur || 'usd').toUpperCase() }).format((c || 0) / 100); } catch { return `$${((c || 0) / 100).toFixed(2)}`; } };

const statusStyle = {
  upcoming: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', label: 'Upcoming' },
  completed: { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6', label: 'Completed' },
  cancelled: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', label: 'Cancelled' },
  waitlist: { bg: 'rgba(56,189,248,0.15)', color: '#38bdf8', label: 'Waiting List' },
  booked: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', label: 'Upcoming' },
};

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const ctx = useOutletContext() || {};
  const title = ctx.sectionLabel ? ctx.sectionLabel('my-bookings', 'My Reservations') : 'My Reservations';

  const load = () => {
    setLoading(true);
    memberAPI.getMyBookings().then(r => { setBookings(r.data || []); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(load, []);

  const handleCancel = async (slotId) => {
    if (!window.confirm('Cancel this booking?')) return;
    try { await memberAPI.cancelMentorBooking(slotId); toast.success('Cancelled'); load(); }
    catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" style={{ color: v('accent', '#c9a84c') }} /></div>;

  return (
    <div data-testid="my-bookings-page">
      <h1 className="text-2xl font-bold mb-6" style={{ color: v('text-primary', '#fff'), fontFamily: "'DM Serif Display', serif" }} data-testid="my-bookings-title">{title}</h1>

      {/* Calendar Sync — inline collapsible card */}
      <details className="mb-6 rounded-lg border overflow-hidden" style={{ backgroundColor: v('card-bg', '#13161e'), borderColor: v('card-border', 'rgba(255,255,255,0.05)') }}>
        <summary className="flex items-center gap-3 p-4 cursor-pointer list-none" data-testid="sync-inline-toggle">
          <Rss className="w-4 h-4" style={{ color: v('accent', '#c9a84c') }} />
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: v('text-primary', '#fff') }}>Sync with Google / Apple Calendar</p>
            <p className="text-xs" style={{ color: v('text-muted', '#6b7280') }}>Get these reservations on your phone automatically.</p>
          </div>
          <span className="text-xs" style={{ color: v('text-muted', '#6b7280') }}>Show</span>
        </summary>
        <div className="p-4 border-t" style={{ borderColor: v('card-border', 'rgba(255,255,255,0.05)') }}>
          <CalendarSyncCard compact />
        </div>
      </details>

      <div className="rounded-lg border overflow-x-auto" style={{ backgroundColor: v('card-bg', '#13161e'), borderColor: v('card-border', 'rgba(255,255,255,0.05)') }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: `1px solid ${v('card-border', 'rgba(255,255,255,0.05)')}` }}>
              <th className="text-left p-3 font-medium text-xs" style={{ color: v('text-secondary', '#9ca3af') }}>Date</th>
              <th className="text-left p-3 font-medium text-xs" style={{ color: v('text-secondary', '#9ca3af') }}>Time</th>
              <th className="text-left p-3 font-medium text-xs" style={{ color: v('text-secondary', '#9ca3af') }}>Mentor</th>
              <th className="text-left p-3 font-medium text-xs" style={{ color: v('text-secondary', '#9ca3af') }}>Type</th>
              <th className="text-left p-3 font-medium text-xs" style={{ color: v('text-secondary', '#9ca3af') }}>Billing</th>
              <th className="text-left p-3 font-medium text-xs" style={{ color: v('text-secondary', '#9ca3af') }}>Virtual Link</th>
              <th className="text-left p-3 font-medium text-xs" style={{ color: v('text-secondary', '#9ca3af') }}>Status</th>
              <th className="text-right p-3 font-medium text-xs" style={{ color: v('text-secondary', '#9ca3af') }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map(b => {
              const displayStatus = b.display_status || b.status;
              const st = statusStyle[displayStatus] || statusStyle.booked;
              return (
                <tr key={b.id} style={{ borderBottom: `1px solid ${v('card-border', 'rgba(255,255,255,0.05)')}` }} data-testid={`booking-row-${b.id}`}>
                  <td className="p-3 text-xs" style={{ color: v('text-primary', '#fff') }}>{b.date || '-'}</td>
                  <td className="p-3 text-xs" style={{ color: v('text-secondary', '#9ca3af') }}>{b.start_time} - {b.end_time}</td>
                  <td className="p-3 text-xs" style={{ color: v('text-primary', '#fff') }}>{b.mentor_name || '-'}</td>
                  <td className="p-3 text-xs" style={{ color: v('text-secondary', '#9ca3af') }}>{b.session_type || '-'}</td>
                  <td className="p-3 text-xs" data-testid={`booking-billing-${b.id}`}>
                    {b.billing_type === 'paid' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-medium" style={{ backgroundColor: v('accent', '#c9a84c') + '20', color: v('accent', '#c9a84c') }}>
                        <CreditCard className="w-3 h-3" /> Paid {fmtMoney(b.price_cents, b.currency)}
                      </span>
                    ) : b.billing_type === 'credit' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-medium bg-purple-500/15 text-purple-400">
                        <Gift className="w-3 h-3" /> Credit
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-medium bg-emerald-500/15 text-emerald-400">Free</span>
                    )}
                  </td>
                  <td className="p-3 text-xs">
                    {b.virtual_link && displayStatus === 'upcoming' ? (
                      <a href={b.virtual_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:opacity-80" style={{ color: v('accent', '#c9a84c') }}>
                        <Video className="w-3 h-3" /> Join <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ) : '-'}
                  </td>
                  <td className="p-3"><span className="text-xs px-2 py-0.5 rounded font-medium" style={{ backgroundColor: st.bg, color: st.color }}>{st.label}</span></td>
                  <td className="p-3 text-right">
                    {(displayStatus === 'upcoming' || displayStatus === 'booked' || displayStatus === 'waitlist') && (
                      <button onClick={() => handleCancel(b.slot_id)} className="text-xs px-3 py-1 rounded border font-medium" style={{ borderColor: v('card-border', 'rgba(255,255,255,0.1)'), color: v('text-secondary', '#9ca3af') }} data-testid={`cancel-booking-${b.id}`}>Cancel</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {bookings.length === 0 && (
          <div className="p-12 text-center">
            <Calendar className="w-8 h-8 mx-auto mb-3" style={{ color: v('text-muted', '#6b7280') }} />
            <p className="text-sm" style={{ color: v('text-muted', '#6b7280') }}>No reservations yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
