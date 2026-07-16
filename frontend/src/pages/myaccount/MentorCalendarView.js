import React, { useState, useEffect, useMemo } from 'react';
import { memberAPI, publicAPI } from '../../lib/api';
import { normalizeRichText } from '../../lib/richText';
import axios from 'axios';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Loader2, Calendar, Clock, User, Video, MapPin, Users, List, Grid3X3, Download, Paperclip, ExternalLink, CreditCard } from 'lucide-react';
import CalendarGrid from '../../components/CalendarGrid';

const v = (name, fb) => `var(--ma-${name}, ${fb})`;
const API = process.env.REACT_APP_BACKEND_URL;
const todayStr = () => new Date().toISOString().split('T')[0];
const stripHtml = (s) => {
  if (!s) return '';
  const withSep = String(s)
    .replace(/&nbsp;/gi, ' ')
    .replace(/<\/(li|p|h[1-6]|div|tr|td|blockquote)\s*>/gi, '</$1> ')
    .replace(/<br\s*\/?>/gi, ' ');
  const tmp = document.createElement('div');
  tmp.innerHTML = withSep;
  let text = tmp.textContent || tmp.innerText || '';
  text = text.replace(/<[^>]+>/g, ' ').replace(/\u00A0/g, ' ');
  return text.replace(/\s+/g, ' ').trim();
};
const formatPrice = (cents, currency = 'usd') => {
  if (!cents) return null;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: (currency || 'usd').toUpperCase() }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
};

const slotColor = (slot) => {
  const isPast = slot.date < todayStr();
  if (isPast) return '#6b7280';
  const booked = slot.booked_count || 0;
  const max = slot.max_students || 1;
  if (slot.waitlist_count > 0) return '#38bdf8';
  if (booked >= max) return '#ef4444';
  if (booked > 0) return '#eab308';
  return '#22c55e';
};

function SlotCard({ slot, mentor, onBook, onCancel, paidEnabled }) {
  const isPast = slot.date < todayStr();
  const booked = slot.booked_count || 0;
  const max = slot.max_students || 1;
  const isFull = booked >= max;
  const color = slotColor(slot);
  const priceLabel = paidEnabled ? formatPrice(slot.price_cents, slot.currency) : null;
  const isPaid = paidEnabled && (slot.price_cents || 0) > 0;

  return (
    <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: v('card-bg', '#13161e'), borderColor: v('card-border', 'rgba(255,255,255,0.05)'), borderLeft: `3px solid ${color}`, opacity: isPast ? 0.6 : 1 }} data-testid={`slot-card-${slot.id}`}>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-[10px] px-2 py-0.5 rounded font-medium" style={{ backgroundColor: color + '20', color }}>{slot.session_type}</span>
          {isPast && <span className="text-[10px] px-2 py-0.5 rounded bg-gray-500/20 text-gray-400">Past</span>}
          {priceLabel && <span className="text-[10px] px-2 py-0.5 rounded font-medium flex items-center gap-1" style={{ backgroundColor: v('accent', '#c9a84c') + '20', color: v('accent', '#c9a84c') }} data-testid={`slot-price-${slot.id}`}><CreditCard className="w-2.5 h-2.5" /> {priceLabel}</span>}
        </div>
        <div className="space-y-1 text-xs mb-2" style={{ color: v('text-secondary', '#9ca3af') }}>
          <div className="flex items-center gap-1.5"><Clock className="w-3 h-3" />{slot.date} &middot; {slot.start_time} - {slot.end_time}</div>
          <div className="flex items-center gap-1.5"><Users className="w-3 h-3" />{Math.max(0, max - booked)} / {max} spots</div>
          {slot.virtual_link && !isPast && <a href={slot.virtual_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:opacity-80" style={{ color: v('accent', '#c9a84c') }}><Video className="w-3 h-3" /> Virtual Link <ExternalLink className="w-2.5 h-2.5" /></a>}
        </div>
        {slot.description && <div className="text-xs mb-2 line-clamp-2 rich-text-content [&_p]:!text-inherit [&_p]:!mb-1 [&_ul]:!pl-4 [&_ol]:!pl-4 [&_ul]:list-disc [&_ol]:list-decimal" style={{ color: v('text-muted', '#6b7280') }} dangerouslySetInnerHTML={{ __html: normalizeRichText(slot.description) }} />}
        {(slot.attachments || []).length > 0 && (
          <div className="mb-2 space-y-1">
            {slot.attachments.map((att, idx) => (
              <a key={idx} href={`${API}${att.url}`} target="_blank" rel="noopener noreferrer" download={att.name} className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] hover:opacity-80" style={{ backgroundColor: v('input-bg', '#0d0f14'), color: v('text-secondary', '#9ca3af') }}>
                <Paperclip className="w-3 h-3" style={{ color: v('accent', '#c9a84c') }} /><span className="truncate flex-1">{att.name}</span><Download className="w-3 h-3" />
              </a>
            ))}
          </div>
        )}
        {!isPast && (
          <>
            {slot.my_status === 'booked' ? (
              <div className="flex items-center gap-2">
                <span className="text-xs px-3 py-1.5 rounded font-medium" style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>Booked</span>
                <button onClick={() => onCancel(slot.id)} className="text-xs px-3 py-1.5 rounded border font-medium" style={{ borderColor: v('card-border', 'rgba(255,255,255,0.1)'), color: v('text-secondary', '#9ca3af') }}>Cancel</button>
              </div>
            ) : slot.my_status === 'waitlist' ? (
              <div className="flex items-center gap-2">
                <span className="text-xs px-3 py-1.5 rounded font-medium bg-blue-500/15 text-blue-400">Waiting List</span>
                <button onClick={() => onCancel(slot.id)} className="text-xs px-3 py-1.5 rounded border font-medium" style={{ borderColor: v('card-border', 'rgba(255,255,255,0.1)'), color: v('text-secondary', '#9ca3af') }}>Cancel</button>
              </div>
            ) : isFull ? (
              <button onClick={() => onBook(slot)} className="text-xs px-3 py-1.5 rounded font-medium bg-blue-500/15 text-blue-400">Waiting List</button>
            ) : (
              <button onClick={() => onBook(slot)} className="text-xs px-4 py-1.5 rounded font-medium flex items-center gap-1.5" style={{ backgroundColor: v('button-bg', '#c9a84c'), color: v('button-text', '#0d0f14') }} data-testid={`book-slot-btn-${slot.id}`}>
                {isPaid ? <><CreditCard className="w-3 h-3" /> Pay &amp; Book {priceLabel}</> : 'Book this slot'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function MentorCalendarView() {
  const [data, setData] = useState({ slots: [], mentor: null });
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookDialog, setBookDialog] = useState(null);
  const [booking, setBooking] = useState(false);
  const [view, setView] = useState('month');
  const [selectedDay, setSelectedDay] = useState(null);
  const [paidEnabled, setPaidEnabled] = useState(false);
  const [credits, setCredits] = useState([]);
  const [useCredit, setUseCredit] = useState(false);

  const load = () => {
    setLoading(true);
    memberAPI.getMentorCalendar().then(r => {
      if (r.data?.slots) setData(r.data);
      else setData({ slots: r.data || [], mentor: null });
      setLoading(false);
    }).catch(() => setLoading(false));
  };
  useEffect(load, []);
  useEffect(() => {
    publicAPI.getSettings().then(r => setPaidEnabled(r.data?.mentor_slots_paid_enabled === true)).catch(() => {});
    memberAPI.getMyCredits().then(r => setCredits(r.data || [])).catch(() => setCredits([]));
  }, []);

  const eligibleCreditFor = (mentorId) => {
    // mirror backend priority: mentor-specific first, then global
    return credits.find(c => c.remaining > 0 && c.mentor_id === mentorId) ||
           credits.find(c => c.remaining > 0 && !c.mentor_id) || null;
  };

  const handleBook = async (slot) => {
    const booked = slot.booked_count || 0;
    const max = slot.max_students || 1;
    setUseCredit(false);
    if (booked >= max) {
      setBookDialog({ ...slot, _isWaitlist: true });
    } else {
      setBookDialog(slot);
    }
  };

  const confirmBook = async (slotId) => {
    setBooking(true);
    try {
      const slot = data.slots.find(s => s.id === slotId);
      const isPaid = paidEnabled && (slot?.price_cents || 0) > 0 && !slot?._isWaitlist && !bookDialog?._isWaitlist;
      if (isPaid && useCredit) {
        const r = await memberAPI.bookMentorSlot(slotId, { use_credit: true });
        toast.success('Booked with credit!');
        setBookDialog(null);
        memberAPI.getMyCredits().then(r2 => setCredits(r2.data || [])).catch(() => {});
        load();
      } else if (isPaid) {
        const API = process.env.REACT_APP_BACKEND_URL;
        const token = localStorage.getItem('auth_token');
        const r = await axios.post(`${API}/api/member/mentorship/checkout/${slotId}`,
          { origin_url: window.location.origin },
          { headers: { Authorization: `Bearer ${token}` } });
        if (r.data?.url) { window.location.href = r.data.url; return; }
        toast.error('Checkout failed — no URL returned');
      } else {
        const r = await memberAPI.bookMentorSlot(slotId);
        toast.success(r.data.status === 'booked' ? 'Booking confirmed!' : 'Added to waiting list');
        setBookDialog(null); load();
      }
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
    finally { setBooking(false); }
  };

  const handleCancelBooking = async (slotId) => {
    try { await memberAPI.cancelMentorBooking(slotId); toast.success('Cancelled'); load(); }
    catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daySlots = useMemo(() => {
    if (!selectedDay) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    return data.slots.filter(s => s.date === dateStr);
  }, [selectedDay, data.slots, year, month]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" style={{ color: v('accent', '#c9a84c') }} /></div>;

  if (!data.mentor && data.slots.length === 0) {
    return (
      <div data-testid="mentor-calendar-empty">
        <h1 className="text-2xl font-bold mb-4" style={{ color: v('text-primary', '#fff'), fontFamily: "'DM Serif Display', serif" }}>Mentor Calendar</h1>
        <p className="text-sm" style={{ color: v('text-muted', '#6b7280') }}>You don't have a mentor assigned yet, or your mentor hasn't set up their calendar.</p>
      </div>
    );
  }

  return (
    <div data-testid="mentor-calendar-view">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: v('text-primary', '#fff'), fontFamily: "'DM Serif Display', serif" }}>Mentor Calendar</h1>
          {data.mentor && <p className="text-xs mt-1" style={{ color: v('text-secondary', '#9ca3af') }}>Mentor: {data.mentor.name} ({data.mentor.membership_id})</p>}
        </div>
        <div className="flex items-center gap-1 rounded p-0.5" style={{ backgroundColor: v('card-bg', '#13161e') }}>
          {[{ key: 'month', icon: Grid3X3, label: 'Month' }, { key: 'list', icon: List, label: 'List' }].map(vw => (
            <button key={vw.key} onClick={() => { setView(vw.key); setSelectedDay(null); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors"
              style={view === vw.key ? { backgroundColor: v('accent', '#c9a84c'), color: v('button-text', '#0d0f14') } : { color: v('text-secondary', '#9ca3af') }}
              data-testid={`mentor-view-${vw.key}`}>
              <vw.icon className="w-3 h-3" /> {vw.label}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4">
        {[{ c: '#22c55e', l: 'Available' }, { c: '#eab308', l: 'Few Slots' }, { c: '#ef4444', l: 'Full' }, { c: '#38bdf8', l: 'Waiting List' }, { c: '#6b7280', l: 'Past' }].map(lg => (
          <div key={lg.l} className="flex items-center gap-1.5 text-xs" style={{ color: v('text-secondary', '#9ca3af') }}>
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: lg.c }} /> {lg.l}
          </div>
        ))}
      </div>

      {view === 'month' && (
        <>
          <CalendarGrid
            currentDate={currentDate}
            onPrevMonth={() => setCurrentDate(new Date(year, month - 1, 1))}
            onNextMonth={() => setCurrentDate(new Date(year, month + 1, 1))}
            onDayClick={(day) => setSelectedDay(day)}
            items={data.slots}
            testIdPrefix="mentor-cal-day"
            renderItem={(s) => (
              <div
                key={s.id}
                className="mt-0.5 px-1.5 py-0.5 rounded text-[10px] truncate"
                style={{ backgroundColor: slotColor(s) + '20', color: slotColor(s), borderLeft: `2px solid ${slotColor(s)}` }}
              >
                {s.start_time}-{s.end_time} {s.my_status === 'booked' && '(Booked)'}
              </div>
            )}
          />
          {selectedDay && daySlots.length > 0 && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {daySlots.map(s => <SlotCard key={s.id} slot={s} mentor={data.mentor} onBook={handleBook} onCancel={handleCancelBooking} paidEnabled={paidEnabled} />)}
            </div>
          )}
          {selectedDay && daySlots.length === 0 && <p className="mt-4 text-sm text-center" style={{ color: v('text-muted', '#6b7280') }}>No slots on this day</p>}
        </>
      )}

      {view === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.slots.length === 0 ? <p className="text-sm col-span-3 text-center py-12" style={{ color: v('text-muted', '#6b7280') }}>No available slots</p> :
            data.slots.map(s => <SlotCard key={s.id} slot={s} mentor={data.mentor} onBook={handleBook} onCancel={handleCancelBooking} paidEnabled={paidEnabled} />)}
        </div>
      )}

      {/* Booking Confirmation Dialog */}
      <Dialog open={!!bookDialog} onOpenChange={() => setBookDialog(null)}>
        <DialogContent style={{ backgroundColor: v('card-bg', '#13161e'), color: v('text-primary', '#fff'), borderColor: v('card-border', 'rgba(255,255,255,0.1)') }}>
          <DialogHeader><DialogTitle style={{ fontFamily: "'DM Serif Display', serif", color: v('text-primary', '#fff') }}>{bookDialog?._isWaitlist ? 'Join Waiting List' : 'Confirm Booking'}</DialogTitle></DialogHeader>
          {bookDialog && (
            <div className="space-y-3">
              {data.mentor && <div className="flex items-center gap-2 text-sm"><User className="w-4 h-4" style={{ color: v('accent', '#c9a84c') }} /> <span>Mentor: {data.mentor.name}</span></div>}
              <div className="flex items-center gap-2 text-sm"><Calendar className="w-4 h-4" style={{ color: v('accent', '#c9a84c') }} /> <span>Date: {bookDialog.date}</span></div>
              <div className="flex items-center gap-2 text-sm"><Clock className="w-4 h-4" style={{ color: v('accent', '#c9a84c') }} /> <span>Time: {bookDialog.start_time} — {bookDialog.end_time}</span></div>
              {bookDialog.description && <div className="text-xs p-2 rounded rich-text-content [&_p]:!text-inherit [&_p]:!mb-1 [&_ul]:!text-inherit [&_ol]:!text-inherit" style={{ backgroundColor: v('input-bg', '#0d0f14'), color: v('text-secondary', '#9ca3af') }} dangerouslySetInnerHTML={{ __html: normalizeRichText(bookDialog.description) }} />}
              <div className="text-xs" style={{ color: v('text-secondary', '#9ca3af') }}>
                Remaining: {Math.max(0, (bookDialog.max_students || 1) - (bookDialog.booked_count || 0))} / {bookDialog.max_students || 1}
              </div>
              {paidEnabled && (bookDialog.price_cents || 0) > 0 && !bookDialog._isWaitlist && (
                <div className="flex items-center justify-between p-3 rounded" style={{ backgroundColor: v('input-bg', '#0d0f14'), border: `1px solid ${v('input-border', 'rgba(255,255,255,0.1)')}` }}>
                  <span className="text-xs flex items-center gap-1.5" style={{ color: v('text-secondary', '#9ca3af') }}><CreditCard className="w-3.5 h-3.5" /> Price</span>
                  <span className="text-sm font-semibold" style={{ color: v('accent', '#c9a84c') }} data-testid="dialog-price">{formatPrice(bookDialog.price_cents, bookDialog.currency)}</span>
                </div>
              )}
              {bookDialog._isWaitlist && <p className="text-xs text-blue-400">This slot is full. You&apos;ll be added to the waiting list and notified if a spot opens.</p>}
              <div className="flex gap-2 pt-2">
                <button onClick={() => setBookDialog(null)} className="flex-1 py-2 rounded text-sm font-medium border" style={{ borderColor: v('card-border', 'rgba(255,255,255,0.1)'), color: v('text-secondary', '#9ca3af') }}>Cancel</button>
                <button onClick={() => confirmBook(bookDialog.id)} disabled={booking} className="flex-1 py-2 rounded text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2" style={{ backgroundColor: bookDialog._isWaitlist ? '#2563eb' : v('button-bg', '#c9a84c'), color: bookDialog._isWaitlist ? '#fff' : v('button-text', '#0d0f14') }} data-testid="confirm-booking-btn">
                  {booking && <Loader2 className="w-3 h-3 animate-spin" />}
                  {bookDialog._isWaitlist ? 'Join Waiting List' : (useCredit ? 'Book with Credit' : (paidEnabled && (bookDialog.price_cents || 0) > 0 ? `Pay ${formatPrice(bookDialog.price_cents, bookDialog.currency)} & Book` : 'Confirm Booking'))}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
