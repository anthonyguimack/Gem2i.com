import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { memberAPI, publicAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Calendar, MapPin, Clock, Users, List, Grid3X3, Loader2, Download, Paperclip, Video, Map, ExternalLink, Rss } from 'lucide-react';
import CalendarGrid from '../../components/CalendarGrid';
import CalendarSyncCard from '../../components/CalendarSyncCard';

const v = (name, fb) => `var(--ma-${name}, ${fb})`;
const API = process.env.REACT_APP_BACKEND_URL;
const today = () => new Date().toISOString().split('T')[0];

function MonthView({ events, year, month, monthLabel, onPrevMonth, onNextMonth, onDayClick }) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  const todayStr = today();

  const getEventsForDay = (day) => {
    if (!day) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr);
  };

  return (
    <>
      {monthLabel && (
        <div className="flex items-center justify-between mb-3">
          <button onClick={onPrevMonth} className="px-3 py-1.5 rounded text-xs font-medium transition-colors" style={{ color: v('text-secondary', '#9ca3af'), border: `1px solid ${v('input-border', 'rgba(255,255,255,0.1)')}` }} data-testid="cal-prev-month">‹ Prev</button>
          <p className="text-sm font-semibold" style={{ color: v('text-primary', '#fff') }}>{monthLabel}</p>
          <button onClick={onNextMonth} className="px-3 py-1.5 rounded text-xs font-medium transition-colors" style={{ color: v('text-secondary', '#9ca3af'), border: `1px solid ${v('input-border', 'rgba(255,255,255,0.1)')}` }} data-testid="cal-next-month">Next ›</button>
        </div>
      )}
      <div className="grid grid-cols-7 gap-px rounded-lg overflow-hidden" style={{ backgroundColor: v('card-border', 'rgba(255,255,255,0.05)') }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="p-2 text-center text-xs font-medium" style={{ backgroundColor: v('card-bg', '#13161e'), color: v('text-secondary', '#9ca3af') }}>{d}</div>
        ))}
        {days.map((day, i) => {
          const dayEvents = getEventsForDay(day);
          return (
            <div key={i} className="min-h-[80px] p-1.5 cursor-pointer transition-colors hover:opacity-80" onClick={() => day && onDayClick(day, dayEvents)}
              style={{ backgroundColor: day ? v('card-bg', '#13161e') : 'transparent' }} data-testid={day ? `cal-day-${day}` : undefined}>
              {day && (
                <>
                  <span className="text-xs font-medium" style={{ color: v('text-primary', '#fff') }}>{day}</span>
                  {dayEvents.map(e => {
                    const isPast = e.date < todayStr;
                    return (
                      <div key={e.id} className="mt-0.5 px-1.5 py-0.5 rounded text-[10px] truncate"
                        style={{ backgroundColor: isPast ? '#374151' : '#22c55e', color: isPast ? '#9ca3af' : '#052e16' }}>
                        {e.title}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function EventCard({ event, onRegister, onCancel, onDetail }) {
  const available = Math.max(0, (event.max_capacity || 0) - (event.registered_count || 0));
  const isFull = available <= 0;
  const isPast = event.date < today();
  const imgSrc = event.image ? (event.image.startsWith('/api') ? `${API}${event.image}` : event.image) : null;

  return (
    <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: v('card-bg', '#13161e'), borderColor: v('card-border', 'rgba(255,255,255,0.05)'), opacity: isPast ? 0.65 : 1 }} data-testid={`event-card-${event.id}`}>
      {imgSrc && <img src={imgSrc} alt={event.title} className="w-full h-36 object-cover" />}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] px-2 py-0.5 rounded font-medium" style={{ backgroundColor: isPast ? '#374151' : '#22c55e', color: isPast ? '#9ca3af' : '#052e16' }}>{event.type}</span>
          {isPast && <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-gray-500/20 text-gray-400">Past</span>}
        </div>
        <h3 className="font-bold text-sm mb-2" style={{ color: v('text-primary', '#fff') }}>{event.title}</h3>
        <div className="space-y-1 text-xs mb-2" style={{ color: v('text-secondary', '#9ca3af') }}>
          <div className="flex items-center gap-1.5"><Clock className="w-3 h-3" />{event.date} &middot; {event.start_time} - {event.end_time}</div>
          {event.location && <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3" />{event.location}</div>}
          <div className="flex items-center gap-1.5"><Users className="w-3 h-3" />{available} / {event.max_capacity} spots left</div>
        </div>
        {/* Links row */}
        <div className="flex flex-wrap gap-2 mb-2">
          {event.map_url && !isPast && (
            <a href={event.map_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] font-medium hover:opacity-80" style={{ color: v('accent', '#c9a84c') }} data-testid={`map-link-${event.id}`}>
              <Map className="w-3 h-3" /> View Map <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
          {event.map_url && isPast && (
            <a href={event.map_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] font-medium hover:opacity-80" style={{ color: v('text-secondary', '#9ca3af') }}>
              <Map className="w-3 h-3" /> View Map <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
          {event.virtual_link && !isPast && (
            <a href={event.virtual_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] font-medium hover:opacity-80" style={{ color: v('accent', '#c9a84c') }} data-testid={`virtual-link-${event.id}`}>
              <Video className="w-3 h-3" /> Virtual Link <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
        </div>
        {/* Description preview */}
        {event.description && (
          <div className="text-xs mb-2 line-clamp-2" style={{ color: v('text-muted', '#6b7280') }} dangerouslySetInnerHTML={{ __html: event.description }} />
        )}
        {(event.description || (event.attachments || []).length > 0) && (
          <button onClick={() => onDetail(event.id)} className="text-[11px] font-medium mb-2 block hover:opacity-80" style={{ color: v('accent', '#c9a84c') }} data-testid={`read-more-${event.id}`}>Read more &rarr;</button>
        )}
        {/* Attachments */}
        {(event.attachments || []).length > 0 && (
          <div className="mb-3 space-y-1" data-testid={`event-files-${event.id}`}>
            {event.attachments.map((att, idx) => (
              <a key={idx} href={`${API}${att.url}`} target="_blank" rel="noopener noreferrer" download={att.name}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded text-xs transition-colors hover:opacity-80"
                style={{ backgroundColor: v('input-bg', '#0d0f14'), color: v('text-secondary', '#9ca3af'), border: `1px solid ${v('card-border', 'rgba(255,255,255,0.05)')}` }}
                data-testid={`download-file-${event.id}-${idx}`}>
                <Paperclip className="w-3 h-3 flex-shrink-0" style={{ color: v('accent', '#c9a84c') }} />
                <span className="truncate flex-1">{att.name}</span>
                <Download className="w-3 h-3 flex-shrink-0" />
              </a>
            ))}
          </div>
        )}
        {/* Action buttons - only for non-past events */}
        {!isPast && (
          <>
            {event.my_status === 'registered' ? (
              <div className="flex items-center gap-2">
                <span className="text-xs px-3 py-1.5 rounded font-medium" style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>Registered</span>
                <button onClick={() => onCancel(event.id)} className="text-xs px-3 py-1.5 rounded border font-medium" style={{ borderColor: v('card-border', 'rgba(255,255,255,0.1)'), color: v('text-secondary', '#9ca3af') }} data-testid={`cancel-reg-${event.id}`}>Cancel</button>
              </div>
            ) : event.my_status === 'waitlist' ? (
              <div className="flex items-center gap-2">
                <span className="text-xs px-3 py-1.5 rounded font-medium bg-blue-500/15 text-blue-400">Waiting List</span>
                <button onClick={() => onCancel(event.id)} className="text-xs px-3 py-1.5 rounded border font-medium" style={{ borderColor: v('card-border', 'rgba(255,255,255,0.1)'), color: v('text-secondary', '#9ca3af') }}>Cancel</button>
              </div>
            ) : isFull ? (
              <button onClick={() => onRegister(event.id)} className="text-xs px-3 py-1.5 rounded font-medium bg-blue-500/15 text-blue-400" data-testid={`waitlist-${event.id}`}>Waiting List</button>
            ) : (
              <button onClick={() => onRegister(event.id)} className="text-xs px-4 py-1.5 rounded font-medium" style={{ backgroundColor: v('button-bg', '#c9a84c'), color: v('button-text', '#0d0f14') }} data-testid={`register-${event.id}`}>Register</button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function GlobalCalendar() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [settings, setSettings] = useState({});
  const ctx = useOutletContext() || {};

  const load = () => {
    setLoading(true);
    memberAPI.getCalendarEvents().then(r => { setEvents(r.data || []); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(() => { load(); publicAPI.getSettings().then(r => setSettings(r.data || {})).catch(() => {}); }, []);

  const handleRegister = async (eventId) => {
    try {
      const r = await memberAPI.registerEvent(eventId);
      toast.success(r.data.status === 'registered' ? 'Registered!' : 'Added to waiting list');
      load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };
  const handleCancel = async (eventId) => {
    try { await memberAPI.cancelEventRegistration(eventId); toast.success('Registration cancelled'); load(); }
    catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthLabel = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const auxPrefix = settings.aux_prefix || 'AUX';

  const upcomingEvents = useMemo(() =>
    events.filter(e => e.status === 'active').sort((a, b) => a.date.localeCompare(b.date)),
  [events]);

  const dayEvents = useMemo(() => {
    if (!selectedDay) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr);
  }, [selectedDay, events, year, month]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" style={{ color: v('accent', '#c9a84c') }} /></div>;

  return (
    <div data-testid="global-calendar-page">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: v('text-primary', '#fff'), fontFamily: "'DM Serif Display', serif" }} data-testid="global-calendar-title">{ctx.sectionLabel ? ctx.sectionLabel('global-calendar', `${auxPrefix} Calendar`) : `${auxPrefix} Calendar`}</h1>
        <div className="flex items-center gap-2">
          <CalendarSyncCard
            asModal
            trigger={
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors" style={{ color: v('text-secondary', '#9ca3af'), border: `1px solid ${v('input-border', 'rgba(255,255,255,0.1)')}` }} data-testid="subscribe-calendar-btn">
                <Rss className="w-3 h-3" /> Subscribe
              </button>
            }
          />
          <div className="flex items-center gap-1 rounded p-0.5" style={{ backgroundColor: v('card-bg', '#13161e') }}>
            {[{ key: 'month', icon: Grid3X3, label: 'Month' }, { key: 'list', icon: List, label: 'List' }].map(vw => (
              <button key={vw.key} onClick={() => { setView(vw.key); setSelectedDay(null); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors"
                style={view === vw.key ? { backgroundColor: v('accent', '#c9a84c'), color: v('button-text', '#0d0f14') } : { color: v('text-secondary', '#9ca3af') }}
                data-testid={`view-${vw.key}`}>
                <vw.icon className="w-3 h-3" /> {vw.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {view === 'month' && (
        <>
          <MonthView
            events={events}
            year={year}
            month={month}
            monthLabel={monthLabel}
            onPrevMonth={() => setCurrentDate(new Date(year, month - 1, 1))}
            onNextMonth={() => setCurrentDate(new Date(year, month + 1, 1))}
            onDayClick={(day) => setSelectedDay(day)}
          />
          {selectedDay && dayEvents.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold mb-3" style={{ color: v('text-primary', '#fff') }}>
                Events on {monthLabel.split(' ')[0]} {selectedDay}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dayEvents.map(e => <EventCard key={e.id} event={e} onRegister={handleRegister} onCancel={handleCancel} onDetail={(id) => navigate(`/my-account/event/${id}`)} />)}
              </div>
            </div>
          )}
          {selectedDay && dayEvents.length === 0 && (
            <p className="mt-4 text-sm text-center" style={{ color: v('text-muted', '#6b7280') }}>No events on this day</p>
          )}
        </>
      )}

      {view === 'list' && (
        <div className="space-y-4">
          {upcomingEvents.length === 0 && <p className="text-center py-12 text-sm" style={{ color: v('text-muted', '#6b7280') }}>No upcoming events</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingEvents.map(e => <EventCard key={e.id} event={e} onRegister={handleRegister} onCancel={handleCancel} onDetail={(id) => navigate(`/my-account/event/${id}`)} />)}
          </div>
        </div>
      )}
    </div>
  );
}
