import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Shared month-grid calendar renderer used by GlobalCalendar and MentorCalendarView.
 *
 * Props:
 *   currentDate:  Date object (controls year/month shown)
 *   onPrevMonth:  () => void
 *   onNextMonth:  () => void
 *   onDayClick:   (day: number | null, items: any[]) => void
 *   items:        Array of items having a `date` field ("YYYY-MM-DD")
 *   renderItem:   (item) => ReactNode   (small pill inside a day cell)
 *   background:   CSS var reference for cell bg (defaults to --ma-card-bg)
 *   borderBg:     CSS var reference for grid gutter (defaults to --ma-card-border)
 *   textPrimary:  CSS var for day number color
 *   textSecondary: CSS var for weekday headers
 *   testIdPrefix: e.g. "cal-day" — yields cal-day-1, cal-day-2 …
 */
export default function CalendarGrid({
  currentDate,
  onPrevMonth,
  onNextMonth,
  onDayClick,
  items = [],
  renderItem,
  background = 'var(--ma-card-bg, #13161e)',
  borderBg = 'var(--ma-card-border, rgba(255,255,255,0.05))',
  textPrimary = 'var(--ma-text-primary, #fff)',
  textSecondary = 'var(--ma-text-secondary, #9ca3af)',
  testIdPrefix = 'cal-day',
}) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthLabel = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const itemsForDay = (day) => {
    if (!day) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return items.filter((it) => it.date === dateStr);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4" data-testid={`${testIdPrefix}-nav`}>
        <button onClick={onPrevMonth} className="p-2 rounded" style={{ color: textSecondary }} data-testid={`${testIdPrefix}-prev`}>
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold" style={{ color: textPrimary }}>{monthLabel}</h2>
        <button onClick={onNextMonth} className="p-2 rounded" style={{ color: textSecondary }} data-testid={`${testIdPrefix}-next`}>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-px rounded-lg overflow-hidden" style={{ backgroundColor: borderBg }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="p-2 text-center text-xs font-medium" style={{ backgroundColor: background, color: textSecondary }}>{d}</div>
        ))}
        {days.map((day, i) => {
          const dayItems = itemsForDay(day);
          return (
            <div
              key={i}
              className={`min-h-[80px] p-1.5 ${day ? 'cursor-pointer transition-colors hover:opacity-80' : ''}`}
              onClick={() => day && onDayClick && onDayClick(day, dayItems)}
              style={{ backgroundColor: day ? background : 'transparent' }}
              data-testid={day ? `${testIdPrefix}-${day}` : undefined}
            >
              {day && (
                <>
                  <span className="text-xs font-medium" style={{ color: textPrimary }}>{day}</span>
                  {dayItems.map((it) => renderItem(it))}
                </>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
