import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Velzon-style month calendar shell — My Account 2.0 ONLY.
 *
 * Lives under pages/myaccount2/components/ on purpose: production My Account 1.0
 * keeps using its own grid, so this redesign can never affect it.
 *
 * Layout mirrors the approved reference (Screenshot_4):
 *   ┌ left rail ────────────┐ ┌ calendar card ─────────────────────────┐
 *   │ primary action button │ │ ‹ › Today   MONTH YEAR   [Month|List]  │
 *   │ hint text             │ │ ┌───────── weekday header ───────────┐ │
 *   │ legend pills          │ │ │ day cells: number top-right,       │ │
 *   │ Upcoming events cards │ │ │ events as full-width tinted bars   │ │
 *   └───────────────────────┘ └────────────────────────────────────────┘
 *
 * Props
 *   monthDate       Date driving the visible month
 *   onPrev/onNext/onToday   () => void
 *   events          [{ id, date:"YYYY-MM-DD", title, color, onClick }]
 *   onDayClick      (day, dayEvents) => void
 *   selectedDay     number | null (highlights the cell)
 *   views           [{ key, label }]  — optional segmented switcher
 *   activeView, onViewChange
 *   primaryAction   { label, onClick }  — the navy button on the rail
 *   hint            string under the button
 *   legend          [{ color, label }]
 *   upcoming        [{ id, dateLabel, timeLabel, title, color, onClick }]
 *   upcomingTitle / upcomingHint
 *   railExtra       ReactNode appended to the rail (e.g. Subscribe control)
 */
export default function VelzonCalendar({
  monthDate,
  onPrev,
  onNext,
  onToday,
  events = [],
  onDayClick,
  selectedDay = null,
  views = [],
  activeView,
  onViewChange,
  primaryAction,
  hint,
  legend = [],
  upcoming = [],
  upcomingTitle = 'Upcoming Events',
  upcomingHint = "Don't miss scheduled events",
  railExtra = null,
  testId = 'velzon-calendar',
  // gem2i: EN/ES chrome + a per-day cap (a busy night lists many parties).
  labels = {},
  locale = 'default',
  maxPerDay = 3,
  onMoreClick,
  children = null,
}) {
  const lb = {
    today: 'Today', prev: 'Previous month', next: 'Next month', noUpcoming: 'No upcoming events',
    weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], more: (n) => `+${n} more`,
    ...labels,
  };
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const monthLabel = monthDate
    .toLocaleString(locale, { month: 'long', year: 'numeric' })
    .toUpperCase();

  const todayIso = new Date().toISOString().split('T')[0];

  const cells = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const out = [];
    for (let i = 0; i < firstDay; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) out.push(d);
    while (out.length % 7 !== 0) out.push(null);   // full trailing week (Velzon grid is rectangular)
    return out;
  }, [year, month]);

  const iso = (day) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const eventsFor = (day) => (day ? events.filter((e) => e.date === iso(day)) : []);

  const border = 'var(--ma-card-border, #e9ebec)';
  const cardBg = 'var(--ma-card-bg, #fff)';
  const textPri = 'var(--ma-text-primary, #212529)';
  const textSec = 'var(--ma-text-secondary, #878a99)';
  const accent = 'var(--ma-accent, #0ab39c)';
  const railBtnBg = 'var(--ma2-primary, #405189)';   // solid disc: must stay brand, not the sidebar
  const surfaceAlt = 'var(--ma2-light, #f3f6f9)';    // mode-aware wash (a black/navy alpha vanishes on dark)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4" data-testid={testId}>
      {/* ── Left rail ─────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="rounded-md p-4" style={{ backgroundColor: cardBg, border: `1px solid ${border}` }}>
          {primaryAction && (
            <button
              onClick={primaryAction.onClick}
              className="w-full py-2.5 rounded-md text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: railBtnBg }}
              data-testid={`${testId}-primary`}
            >
              {primaryAction.label}
            </button>
          )}
          {hint && (
            <p className="mt-3 text-xs leading-relaxed" style={{ color: textSec }}>{hint}</p>
          )}
          {legend.length > 0 && (
            <div className="mt-3 space-y-2">
              {legend.map((lg) => (
                <div
                  key={lg.label}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium"
                  style={{ backgroundColor: `${lg.color}1f`, color: lg.color }}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: lg.color }} />
                  {lg.label}
                </div>
              ))}
            </div>
          )}
          {railExtra && <div className="mt-3">{railExtra}</div>}
        </div>

        <div>
          <h3 className="text-sm font-semibold" style={{ color: textPri }}>{upcomingTitle}</h3>
          <p className="text-xs mb-3" style={{ color: textSec }}>{upcomingHint}</p>
          <div className="space-y-3">
            {upcoming.length === 0 && (
              <div className="rounded-md p-4 text-xs text-center"
                style={{ backgroundColor: cardBg, border: `1px solid ${border}`, color: textSec }}>
                {lb.noUpcoming}
              </div>
            )}
            {upcoming.map((u) => (
              <div
                key={u.id}
                onClick={u.onClick}
                className={`rounded-md p-3 ${u.onClick ? 'cursor-pointer transition-shadow hover:shadow-sm' : ''}`}
                style={{ backgroundColor: cardBg, border: `1px solid ${border}` }}
                data-testid={`${testId}-upcoming-${u.id}`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: textPri }}>
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: u.color || accent }} />
                    {u.dateLabel}
                  </span>
                  {u.timeLabel && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: surfaceAlt, color: textSec }}>
                      {u.timeLabel}
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold leading-snug" style={{ color: textPri }}>{u.title}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Calendar card ─────────────────────────────────────────── */}
      <div className="rounded-md p-4" style={{ backgroundColor: cardBg, border: `1px solid ${border}` }}>
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            {/* ⚠ These used to be `rgba(64,81,137,0.10)` + `color: var(--ma-sidebar-bg)`.
                That works only in light: in dark the sidebar token becomes #212529,
                so the glyph ended up the same colour as the card it sits on and the
                buttons vanished. The kit's outline button is mode-aware by
                construction (card bg + hairline + heading text), so use it. */}
            <button onClick={onPrev} className="ma2-btn ma2-btn-outline ma2-btn-icon"
              aria-label={lb.prev} data-testid={`${testId}-prev`}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={onNext} className="ma2-btn ma2-btn-outline ma2-btn-icon"
              aria-label={lb.next} data-testid={`${testId}-next`}>
              <ChevronRight className="w-4 h-4" />
            </button>
            {onToday && (
              <button onClick={onToday} className="ma2-btn ma2-btn-outline" data-testid={`${testId}-today`}>
                {lb.today}
              </button>
            )}
          </div>

          <h2 className="text-sm font-semibold tracking-wide order-last w-full text-center sm:order-none sm:w-auto"
            style={{ color: textPri }} data-testid={`${testId}-month`}>
            {monthLabel}
          </h2>

          {views.length > 0 ? (
            <div className="flex rounded-md overflow-hidden" style={{ border: `1px solid ${border}` }}>
              {views.map((vw) => {
                const on = vw.key === activeView;
                const Icon = vw.icon;
                return (
                  <button key={vw.key} onClick={() => onViewChange && onViewChange(vw.key)}
                    className="flex items-center gap-1.5 px-3 py-2.5 sm:py-1.5 text-xs font-medium transition-colors"
                    style={on
                      ? { backgroundColor: accent, color: 'var(--ma2-button-text)' }
                      : { backgroundColor: 'transparent', color: textSec }}
                    data-testid={`${testId}-view-${vw.key}`}>
                    {Icon && <Icon className="w-3.5 h-3.5" />}
                    {vw.label}
                  </button>
                );
              })}
            </div>
          ) : <span className="w-8" />}
        </div>

        {/* Grid */}
        <div className="rounded-md overflow-hidden" style={{ border: `1px solid ${border}` }}>
          <div className="grid grid-cols-7">
            {lb.weekdays.map((d) => (
              <div key={d}
                className="py-2.5 text-center text-xs font-semibold"
                style={{ backgroundColor: surfaceAlt, color: textSec, borderBottom: `1px solid ${border}` }}>
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              const dayEvents = eventsFor(day);
              const isToday = day && iso(day) === todayIso;
              const isSelected = day && selectedDay === day;
              return (
                <div
                  key={i}
                  onClick={() => day && onDayClick && onDayClick(day, dayEvents)}
                  className={`min-h-[104px] p-1.5 flex flex-col gap-1 ${day && onDayClick ? 'cursor-pointer' : ''}`}
                  style={{
                    backgroundColor: !day
                      ? surfaceAlt
                      : isSelected ? 'color-mix(in srgb, var(--ma2-success) 12%, transparent)' : cardBg,
                    borderRight: (i % 7 !== 6) ? `1px solid ${border}` : 'none',
                    borderBottom: `1px solid ${border}`,
                  }}
                  data-testid={day ? `${testId}-day-${day}` : undefined}
                >
                  {day && (
                    <>
                      <div className="flex justify-end">
                        {isToday ? (
                          <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold text-white"
                            style={{ backgroundColor: railBtnBg }}>{day}</span>
                        ) : (
                          <span className="text-xs font-medium px-1" style={{ color: textSec }}>{day}</span>
                        )}
                      </div>
                      {dayEvents.slice(0, maxPerDay).map((e) => (
                        <button
                          key={e.id}
                          onClick={(ev) => { if (e.onClick) { ev.stopPropagation(); e.onClick(e); } }}
                          className="w-full text-left px-2 py-1 rounded text-[11px] font-medium truncate transition-opacity hover:opacity-80"
                          style={{ backgroundColor: `${e.color || accent}26`, color: e.color || accent }}
                          title={e.title}
                          data-testid={`${testId}-event-${e.id}`}
                        >
                          {e.title}
                        </button>
                      ))}
                      {dayEvents.length > maxPerDay && (
                        <button
                          onClick={(ev) => { ev.stopPropagation(); (onMoreClick || onDayClick) && (onMoreClick || onDayClick)(day, dayEvents); }}
                          className="w-full text-left px-2 py-0.5 text-[11px] font-medium"
                          style={{ color: textSec }}
                          data-testid={`${testId}-more-${day}`}
                        >
                          {lb.more(dayEvents.length - maxPerDay)}
                        </button>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
