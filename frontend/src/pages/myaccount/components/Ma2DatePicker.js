import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * My Account 2.0 date field — OUR white calendar, not the browser's.
 *
 * Why it exists: `<input type="date">` renders the browser's own picker, which
 * (a) follows `color-scheme` — and inside this app that resolves to the DARK 1.0
 * palette in a portal, so the panel opened black and its icon went invisible —
 * and (b) never matches the 2.0 language whatever we do to it. This mirrors
 * `components/VelzonCalendar` at picker scale.
 *
 * Contract is identical to the native input it replaces: `value`/`onChange` speak
 * ISO `YYYY-MM-DD`, so callers and payloads are unchanged.
 *
 * ⚠ Dates are built from PARTS (`new Date(y, m - 1, d)`), never `new Date(iso)`:
 * the string form is parsed as UTC and shifts the day for anyone behind it.
 */
const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const pad = (n) => String(n).padStart(2, '0');
const toIso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

function parseIso(v) {
  const m = typeof v === 'string' && v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return { y: +m[1], m: +m[2] - 1, d: +m[3] };
}

export default function Ma2DatePicker({
  value, onChange, id, placeholder = 'mm/dd/yyyy', testId = 'ma2-datepicker', disabled,
}) {
  const [open, setOpen] = useState(false);
  const [flipUp, setFlipUp] = useState(false);
  const [flipRight, setFlipRight] = useState(false);
  const selected = parseIso(value);
  const today = new Date();
  const todayParts = { y: today.getFullYear(), m: today.getMonth(), d: today.getDate() };

  const [view, setView] = useState(() => ({
    y: selected?.y ?? todayParts.y,
    m: selected?.m ?? todayParts.m,
  }));

  const wrapRef = useRef(null);
  const fieldRef = useRef(null);

  // Re-centre on the selected month each time the panel opens, and decide whether
  // it has room below (it often doesn't, inside a scrolling modal body).
  useEffect(() => {
    if (!open) return;
    setView({ y: selected?.y ?? todayParts.y, m: selected?.m ?? todayParts.m });
    const r = fieldRef.current?.getBoundingClientRect();
    if (r) {
      setFlipUp(window.innerHeight - r.bottom < 320 && r.top > 320);
      // Panel is 17.5rem (~280px) wide, left-anchored. When the field sits near
      // the right edge (e.g. the "to" picker in a right-aligned toolbar) the panel
      // would overflow — anchor it to the field's right edge instead.
      setFlipRight(r.left + 280 > window.innerWidth - 8);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); fieldRef.current?.focus(); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  // 6 weeks starting on the Sunday of the week that contains the 1st.
  const cells = useMemo(() => {
    const first = new Date(view.y, view.m, 1);
    const start = new Date(view.y, view.m, 1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const dt = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      return { y: dt.getFullYear(), m: dt.getMonth(), d: dt.getDate() };
    });
  }, [view]);

  const shiftMonth = (delta) => setView(v => {
    const dt = new Date(v.y, v.m + delta, 1);
    return { y: dt.getFullYear(), m: dt.getMonth() };
  });

  const pick = (c) => { onChange(toIso(c.y, c.m, c.d)); setOpen(false); fieldRef.current?.focus(); };

  const label = selected ? `${pad(selected.m + 1)}/${pad(selected.d)}/${selected.y}` : '';

  return (
    <div className="ma2-datepicker" ref={wrapRef}>
      <button type="button" id={id} ref={fieldRef} disabled={disabled}
        className="ma2-input ma2-datepicker-field"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="dialog" aria-expanded={open}
        data-testid={testId}>
        <span className={label ? undefined : 'ma2-datepicker-placeholder'}>{label || placeholder}</span>
        <CalendarDays className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--ma2-muted, #878a99)' }} aria-hidden="true" />
      </button>

      {open && (
        <div className={`ma2-datepicker-panel ${flipUp ? 'is-up' : ''} ${flipRight ? 'is-right' : ''}`} role="dialog"
          aria-label="Choose a date" data-testid={`${testId}-panel`}>
          <div className="ma2-datepicker-head">
            <button type="button" className="ma2-icon-btn" onClick={() => shiftMonth(-1)} aria-label="Previous month">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="ma2-datepicker-month">{MONTHS[view.m]} {view.y}</span>
            <button type="button" className="ma2-icon-btn" onClick={() => shiftMonth(1)} aria-label="Next month">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="ma2-datepicker-grid" aria-hidden="true">
            {DOW.map(d => <span key={d} className="ma2-datepicker-dow">{d}</span>)}
          </div>

          <div className="ma2-datepicker-grid">
            {cells.map((c, i) => {
              const outside = c.m !== view.m;
              const isToday = c.y === todayParts.y && c.m === todayParts.m && c.d === todayParts.d;
              const isSel = selected && c.y === selected.y && c.m === selected.m && c.d === selected.d;
              return (
                <button key={i} type="button"
                  className={`ma2-datepicker-day ${outside ? 'is-outside' : ''} ${isToday && !isSel ? 'is-today' : ''} ${isSel ? 'is-selected' : ''}`}
                  onClick={() => pick(c)}
                  aria-current={isToday ? 'date' : undefined}
                  aria-label={`${MONTHS[c.m]} ${c.d}, ${c.y}`}
                  data-testid={`${testId}-day-${toIso(c.y, c.m, c.d)}`}>
                  {c.d}
                </button>
              );
            })}
          </div>

          <div className="ma2-datepicker-foot">
            <button type="button" className="ma2-btn ma2-btn-light ma2-btn-sm"
              onClick={() => { onChange(''); setOpen(false); }}>Clear</button>
            <button type="button" className="ma2-btn ma2-btn-primary ma2-btn-sm"
              onClick={() => pick(todayParts)}>Today</button>
          </div>
        </div>
      )}
    </div>
  );
}
