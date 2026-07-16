import React, { useEffect, useMemo, useState } from 'react';
import { publicAPI } from '../lib/api';

/**
 * Reusable weekly-recurrence picker for slot editors.
 *
 * Props:
 *   value:       { enabled, days_of_week, weeks }   (shape matches backend API)
 *   onChange:    (next value) => void
 *   baseDate:    "YYYY-MM-DD"   — the slot's start date (used to preview expansion)
 *   dark:        boolean         — use dark-theme tokens (member side) vs light (admin)
 *
 * JS convention for days_of_week: 0=Sun..6=Sat (matches Date.getDay()).
 */
const DAYS = [
  { v: 0, s: 'S', l: 'Sun' },
  { v: 1, s: 'M', l: 'Mon' },
  { v: 2, s: 'T', l: 'Tue' },
  { v: 3, s: 'W', l: 'Wed' },
  { v: 4, s: 'T', l: 'Thu' },
  { v: 5, s: 'F', l: 'Fri' },
  { v: 6, s: 'S', l: 'Sat' },
];

function previewDates(baseDate, dows, weeks) {
  if (!baseDate || !dows?.length || !weeks) return [];
  const [y, m, d] = baseDate.split('-').map(Number);
  if (!y || !m || !d) return [];
  const start = new Date(y, m - 1, d);
  // Anchor sunday on-or-before start
  const sundayAnchor = new Date(start);
  sundayAnchor.setDate(start.getDate() - start.getDay());
  const out = new Set();
  for (let w = 0; w < weeks; w++) {
    for (const dow of dows) {
      const dt = new Date(sundayAnchor);
      dt.setDate(sundayAnchor.getDate() + w * 7 + dow);
      if (dt >= start) {
        const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        out.add(iso);
      }
    }
  }
  return Array.from(out).sort();
}

export default function SlotRecurrencePicker({ value, onChange, baseDate, dark = false }) {
  const val = value || { enabled: false, days_of_week: [], weeks: 4 };
  const set = (patch) => onChange({ ...val, ...patch });
  const [blocked, setBlocked] = useState([]);

  useEffect(() => {
    publicAPI.getBlockedDates().then(r => setBlocked(r.data || [])).catch(() => setBlocked([]));
  }, []);
  const blockedSet = useMemo(() => new Set(blocked.map(b => b.date)), [blocked]);
  const blockedMap = useMemo(() => {
    const m = new Map();
    blocked.forEach(b => m.set(b.date, b.reason || ''));
    return m;
  }, [blocked]);

  const allDates = useMemo(() => previewDates(baseDate, val.days_of_week, val.weeks), [baseDate, val.days_of_week, val.weeks]);
  const dates = useMemo(() => allDates.filter(d => !blockedSet.has(d)), [allDates, blockedSet]);
  const skipped = useMemo(() => allDates.filter(d => blockedSet.has(d)), [allDates, blockedSet]);

  const label = dark
    ? { color: 'var(--ma-text-secondary, #9ca3af)' }
    : { color: '#334155' };
  const muted = dark
    ? { color: 'var(--ma-text-muted, #6b7280)' }
    : { color: '#94a3b8' };
  const chipBase = 'w-8 h-8 rounded-full text-xs font-semibold transition flex items-center justify-center';
  const wrapperClass = dark
    ? 'p-3 rounded border'
    : 'p-3 rounded-sm bg-slate-50 border border-slate-200';
  const wrapperStyle = dark
    ? { borderColor: 'var(--ma-input-border, rgba(255,255,255,0.1))', backgroundColor: 'var(--ma-input-bg, #0d0f14)' }
    : {};

  return (
    <div className={wrapperClass} style={wrapperStyle} data-testid="slot-recurrence-picker">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={!!val.enabled}
          onChange={e => set({ enabled: e.target.checked, days_of_week: val.days_of_week.length ? val.days_of_week : (baseDate ? [new Date(baseDate + 'T00:00:00').getDay()] : []) })}
          data-testid="recurrence-enabled"
        />
        <span className="text-xs font-medium" style={label}>Repeat this slot weekly</span>
      </label>
      {val.enabled && (
        <div className="mt-3 space-y-3">
          <div>
            <p className="text-[11px] mb-1.5" style={muted}>Repeat on</p>
            <div className="flex gap-1.5" data-testid="recurrence-days">
              {DAYS.map(d => {
                const active = val.days_of_week.includes(d.v);
                return (
                  <button
                    key={d.v}
                    type="button"
                    onClick={() => {
                      const next = active ? val.days_of_week.filter(x => x !== d.v) : [...val.days_of_week, d.v];
                      set({ days_of_week: next });
                    }}
                    className={chipBase}
                    style={active
                      ? (dark
                        ? { backgroundColor: 'var(--ma-button-bg, #c9a84c)', color: 'var(--ma-button-text, #0d0f14)' }
                        : { backgroundColor: 'var(--ad-button-bg, #0D9488)', color: '#fff' })
                      : (dark
                        ? { backgroundColor: 'var(--ma-card-bg, #13161e)', color: 'var(--ma-text-secondary, #9ca3af)', border: '1px solid var(--ma-input-border, rgba(255,255,255,0.1))' }
                        : { backgroundColor: '#fff', color: '#64748b', border: '1px solid #e2e8f0' })
                    }
                    data-testid={`recurrence-day-${d.l.toLowerCase()}`}
                    title={d.l}
                    aria-label={d.l}
                    aria-pressed={active}
                  >{d.s}</button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[11px]" style={muted}>Number of weeks</label>
            <input
              type="number"
              min={1}
              max={52}
              value={val.weeks}
              onChange={e => set({ weeks: Math.max(1, Math.min(52, parseInt(e.target.value) || 1)) })}
              className="w-20 px-2 py-1 rounded text-sm"
              style={dark
                ? { backgroundColor: 'var(--ma-card-bg, #13161e)', color: 'var(--ma-text-primary, #fff)', border: '1px solid var(--ma-input-border, rgba(255,255,255,0.1))' }
                : { backgroundColor: '#fff', color: '#1a2332', border: '1px solid #e2e8f0' }}
              data-testid="recurrence-weeks"
            />
          </div>
          <p className="text-[11px]" style={muted} data-testid="recurrence-preview">
            {dates.length === 0 && skipped.length === 0
              ? 'Pick at least one weekday to preview.'
              : `Will create ${dates.length} slot${dates.length === 1 ? '' : 's'}${dates.length > 1 ? ` (${dates[0]} → ${dates[dates.length - 1]})` : ''}.`}
          </p>
          {skipped.length > 0 && (
            <p className="text-[11px]" style={muted} data-testid="recurrence-skipped">
              Skipping {skipped.length} blocked date{skipped.length === 1 ? '' : 's'}: {skipped.map(d => blockedMap.get(d) ? `${d} (${blockedMap.get(d)})` : d).join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
