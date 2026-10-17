import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { CalendarDays, Ticket, MapPin, Clock, Rss, Loader2, Star } from 'lucide-react';
import { memberAPI } from '../../lib/api';
import { useT, useLang } from '../../lib/i18n';
import { useMyAccountBase } from '../../lib/myAccountBase';
import VelzonCalendar from './components/VelzonCalendar';

/**
 * gem2i My Account 2.0 — Calendar. The month grid IS the event catalog
 * (`gem_events`); "My events" narrows it to the member's live guest passes and
 * tickets. A day opens its full list below the grid; each event links to its
 * public page, where the guest-list / ticket widgets live.
 */
const L = {
  all: { en: 'All events', es: 'Todos los eventos' },
  mine: { en: 'My events', es: 'Mis eventos' },
  browse: { en: 'Browse events', es: 'Ver eventos' },
  hint: { en: 'Tap a day to see its events. Your guest passes and tickets are highlighted.', es: 'Toca un día para ver sus eventos. Tus pases y entradas aparecen resaltados.' },
  legendMine: { en: 'Guest pass / ticket', es: 'Pase / entrada' },
  legendFollow: { en: 'Following', es: 'Siguiendo' },
  legendOther: { en: 'Event', es: 'Evento' },
  upcoming: { en: 'My upcoming events', es: 'Mis próximos eventos' },
  upcomingHint: { en: 'Guest lists and tickets you hold', es: 'Listas de invitados y entradas que tienes' },
  sync: { en: 'Add to my phone calendar', es: 'Añadir al calendario del teléfono' },
  today: { en: 'Today', es: 'Hoy' },
  prev: { en: 'Previous month', es: 'Mes anterior' },
  next: { en: 'Next month', es: 'Mes siguiente' },
  noUpcoming: { en: 'No upcoming events yet', es: 'Aún no tienes próximos eventos' },
  dayEmpty: { en: 'No events this day.', es: 'No hay eventos este día.' },
  pass: { en: 'Guest list', es: 'Lista de invitados' },
  ticket: { en: 'Ticket', es: 'Entrada' },
  view: { en: 'View event', es: 'Ver evento' },
  error: { en: 'Could not load the calendar. Try again.', es: 'No se pudo cargar el calendario. Inténtalo de nuevo.' },
  retry: { en: 'Retry', es: 'Reintentar' },
  emptyMine: { en: 'You have no guest passes or tickets this month.', es: 'No tienes pases ni entradas este mes.' },
};
const WEEKDAYS = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  es: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
};

const pad = (n) => String(n).padStart(2, '0');
const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const timeOf = (iso) => { const m = /T(\d{2}):(\d{2})/.exec(iso || ''); return m ? `${m[1]}:${m[2]}` : ''; };

/** VelzonCalendar tints chips by appending an alpha to a hex colour, so read the
 *  live theme tokens (they flip with light/dark) instead of hardcoding hex. */
function useTokenColors(mode) {
  return useMemo(() => {
    const css = getComputedStyle(document.documentElement);
    const read = (name, fb) => (css.getPropertyValue(name) || '').trim() || fb;
    return {
      mine: read('--ma2-success', '#3287B7'),
      follow: read('--ma2-warning', '#f7b84b'),
      other: read('--ma2-muted', '#9aa7b4'),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);
}

export default function GlobalCalendar() {
  const tt = useT();
  const { lang } = useLang();
  const base = useMyAccountBase();
  const navigate = useNavigate();
  const ctx = useOutletContext() || {};
  const title = ctx.sectionLabel ? ctx.sectionLabel('global-calendar', tt(L.all)) : tt(L.all);
  const [month, setMonth] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [view, setView] = useState('all');
  const [events, setEvents] = useState(null);
  const [error, setError] = useState(false);
  const [upcoming, setUpcoming] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const colors = useTokenColors(document.documentElement.style.getPropertyValue('--ma2-card-bg'));

  const load = useCallback(() => {
    const start = new Date(month.getFullYear(), month.getMonth(), 1);
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    setEvents(null);
    setError(false);
    memberAPI.getGemCalendar(isoDay(start), isoDay(end), view === 'mine')
      .then(r => setEvents(r.data || []))
      .catch(() => { setEvents([]); setError(true); });
  }, [month, view]);
  useEffect(() => { load(); }, [load]);

  // Upcoming = my passes/tickets in the next 6 months (independent of the visible month).
  useEffect(() => {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth() + 6, 0);
    memberAPI.getGemCalendar(isoDay(now), isoDay(end), true)
      .then(r => setUpcoming((r.data || []).slice(0, 5)))
      .catch(() => setUpcoming([]));
  }, []);

  const openEvent = useCallback((e) => { if (e.slug) navigate(`/events/${e.slug}`); }, [navigate]);
  const colorOf = (e) => ((e.my_pass || e.my_ticket) ? colors.mine : e.following ? colors.follow : colors.other);
  const locale = lang === 'es' ? 'es' : 'en';

  const gridEvents = (events || []).map(e => ({
    id: e.id, date: e.event_date, title: tt(e.title), color: colorOf(e), onClick: () => openEvent(e),
  }));
  const dayList = selectedDay
    ? (events || []).filter(e => e.event_date === `${month.getFullYear()}-${pad(month.getMonth() + 1)}-${pad(selectedDay)}`)
    : null;

  const fmtDay = (iso) => {
    const [y, m, d] = (iso || '').split('-').map(Number);
    return y ? new Date(y, m - 1, d).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' }) : '';
  };
  const v = (name, fb) => `var(--ma-${name}, ${fb})`;

  return (
    <div className="max-w-7xl" data-testid="gem-calendar">
      <div className="flex items-center gap-2 mb-5">
        <CalendarDays className="w-5 h-5" style={{ color: v('accent', '#3287B7') }} />
        <h1 className="text-lg font-semibold" style={{ color: v('text-primary', '#fff') }}>{title}</h1>
      </div>

      {error && (
        <div className="mb-4 rounded-md p-3 text-sm flex items-center justify-between gap-3"
          style={{ backgroundColor: 'color-mix(in srgb, var(--ma2-danger) 12%, transparent)', color: 'var(--ma2-danger-fg)' }} role="alert">
          <span>{tt(L.error)}</span>
          <button onClick={load} className="ma2-btn ma2-btn-outline ma2-btn-sm">{tt(L.retry)}</button>
        </div>
      )}

      <VelzonCalendar
        monthDate={month}
        locale={locale}
        onPrev={() => { setSelectedDay(null); setMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1)); }}
        onNext={() => { setSelectedDay(null); setMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1)); }}
        onToday={() => { const d = new Date(); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); setSelectedDay(d.getDate()); }}
        events={gridEvents}
        onDayClick={(day) => setSelectedDay(d => (d === day ? null : day))}
        selectedDay={selectedDay}
        views={[{ key: 'all', label: tt(L.all), icon: CalendarDays }, { key: 'mine', label: tt(L.mine), icon: Ticket }]}
        activeView={view}
        onViewChange={(k) => { setSelectedDay(null); setView(k); }}
        primaryAction={{ label: tt(L.browse), onClick: () => navigate('/events') }}
        hint={tt(L.hint)}
        legend={[
          { color: colors.mine, label: tt(L.legendMine) },
          { color: colors.follow, label: tt(L.legendFollow) },
          { color: colors.other, label: tt(L.legendOther) },
        ]}
        upcoming={upcoming.map(e => ({
          id: e.id, dateLabel: fmtDay(e.event_date), timeLabel: timeOf(e.open_time),
          title: tt(e.title), color: colors.mine, onClick: () => openEvent(e),
        }))}
        upcomingTitle={tt(L.upcoming)}
        upcomingHint={tt(L.upcomingHint)}
        railExtra={(
          <Link to={`${base}/calendar-sync`} className="flex items-center gap-2 text-xs font-medium py-1.5" style={{ color: v('accent', '#3287B7') }}>
            <Rss className="w-3.5 h-3.5" />{tt(L.sync)}
          </Link>
        )}
        labels={{
          today: tt(L.today), prev: tt(L.prev), next: tt(L.next), noUpcoming: tt(L.noUpcoming),
          weekdays: WEEKDAYS[locale], more: (n) => (locale === 'es' ? `+${n} más` : `+${n} more`),
        }}
        testId="gem-calendar-grid"
      >
        {events === null && (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" style={{ color: v('accent', '#3287B7') }} /></div>
        )}
        {events !== null && view === 'mine' && events.length === 0 && !error && (
          <p className="text-sm text-center py-6" style={{ color: v('text-secondary', '#9aa7b4') }}>{tt(L.emptyMine)}</p>
        )}
        {dayList && (
          <div className="mt-4" data-testid="gem-calendar-day">
            <h3 className="text-sm font-semibold mb-2" style={{ color: v('text-primary', '#fff') }}>
              {fmtDay(`${month.getFullYear()}-${pad(month.getMonth() + 1)}-${pad(selectedDay)}`)}
            </h3>
            {dayList.length === 0 ? (
              <p className="text-sm" style={{ color: v('text-secondary', '#9aa7b4') }}>{tt(L.dayEmpty)}</p>
            ) : (
              <ul className="space-y-2">
                {dayList.map(e => (
                  <li key={e.id}>
                    <Link to={`/events/${e.slug}`} className="ma2-card flex items-center gap-3 p-3 transition-colors"
                      data-testid={`gem-calendar-item-${e.id}`}>
                      {e.image_urls?.flyer && (
                        <img src={e.image_urls.flyer.startsWith('/api') ? `${process.env.REACT_APP_BACKEND_URL || ''}${e.image_urls.flyer}` : e.image_urls.flyer}
                          alt="" className="w-12 h-12 rounded object-cover shrink-0" loading="lazy" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate" style={{ color: v('text-primary', '#fff') }}>{tt(e.title)}</p>
                        <p className="text-xs flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5" style={{ color: v('text-secondary', '#9aa7b4') }}>
                          {timeOf(e.open_time) && <span className="inline-flex items-center gap-1 tabular-nums"><Clock className="w-3 h-3" />{timeOf(e.open_time)}</span>}
                          {e.venue?.name && <span className="inline-flex items-center gap-1 min-w-0"><MapPin className="w-3 h-3 shrink-0" /><span className="truncate">{[e.venue.name, e.venue.city].filter(Boolean).join(', ')}</span></span>}
                          {e.following && <span className="inline-flex items-center gap-1"><Star className="w-3 h-3" />{tt(L.legendFollow)}</span>}
                        </p>
                      </div>
                      {(e.my_pass || e.my_ticket) && (
                        <span className="ma2-badge ma2-badge-success shrink-0 text-[11px] px-2 py-0.5 rounded"
                          style={{ backgroundColor: 'color-mix(in srgb, var(--ma2-success) 16%, transparent)', color: 'var(--ma2-success-fg)' }}>
                          {e.my_ticket ? tt(L.ticket) : tt(L.pass)}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </VelzonCalendar>
    </div>
  );
}
