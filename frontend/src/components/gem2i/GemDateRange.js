import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { gemAPI } from '../../lib/api';
import { useT } from '../../lib/i18n';

/**
 * CA-2 date picker (approved 2026-10-19, bocetos/calendario-ca2-ca3.html):
 * shortcuts (Today · This weekend · Next 7 days · This month), a from–to range
 * in two clicks, blue dots on days that have items (GET /public/gem/catalog-dates),
 * Today / Clear. Keyboard: arrows move, Enter picks, Esc closes. Below 640px it
 * opens as a bottom sheet. Value = { from, to } as 'YYYY-MM-DD' ('' = none).
 */
const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s) => (s ? new Date(`${s}T12:00:00`) : null);
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

const ACCENT = 'var(--color-accent, #0068b3)';
const LINK = 'var(--color-link, #5AAFEA)';
const CARD = 'var(--color-card-bg, #0D1721)';
const LINE = 'var(--color-card-border, rgba(255,255,255,0.09))';

export default function GemDateRange({ catalog = 'events', value = {}, onChange }) {
  const tt = useT();
  const loc = tt({ en: 'en-US', es: 'es-ES' });
  const today = useMemo(() => { const t = new Date(); t.setHours(12, 0, 0, 0); return t; }, []);
  const from = parse(value.from); const to = parse(value.to);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => { const b = from || today; return new Date(b.getFullYear(), b.getMonth(), 1, 12); });
  const [focus, setFocus] = useState(from || today);
  const [dots, setDots] = useState({});
  const wrap = useRef(null);
  const grid = useRef(null);

  const monthKey = `${view.getFullYear()}-${pad(view.getMonth() + 1)}`;
  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    gemAPI.catalogDates(catalog, monthKey).then(r => { if (alive) setDots(r.data?.days || {}); }).catch(() => {});
    return () => { alive = false; };
  }, [open, catalog, monthKey]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (wrap.current && !wrap.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => { if (open) grid.current?.querySelector('[data-focus="1"]')?.focus(); }, [open, focus]);

  const set = (a, b) => onChange({ from: a ? iso(a) : '', to: b ? iso(b) : '' });
  const pick = (d) => {
    if (!from || to) { set(d, null); return; }
    if (d < from) set(d, from); else set(from, d);
  };
  const shortcuts = [
    { label: tt({ en: 'Today', es: 'Hoy' }), range: () => [today, today] },
    { label: tt({ en: 'This weekend', es: 'Este fin de semana' }), range: () => { const sat = addDays(today, (6 - today.getDay() + 7) % 7); return [today.getDay() === 0 ? today : sat, today.getDay() === 0 ? today : addDays(sat, 1)]; } },
    { label: tt({ en: 'Next 7 days', es: 'Próximos 7 días' }), range: () => [today, addDays(today, 7)] },
    { label: tt({ en: 'This month', es: 'Este mes' }), range: () => [today, new Date(today.getFullYear(), today.getMonth() + 1, 0, 12)] },
  ];
  const isShortcut = (r) => from && to && iso(r[0]) === iso(from) && iso(r[1]) === iso(to);

  const label = from && to && iso(from) !== iso(to)
    ? `${from.toLocaleDateString(loc, { day: 'numeric', month: 'short' })} – ${to.toLocaleDateString(loc, { day: 'numeric', month: 'short', year: 'numeric' })}`
    : from ? from.toLocaleDateString(loc, { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  // 6-week grid starting Monday
  const first = new Date(view.getFullYear(), view.getMonth(), 1, 12);
  const start = addDays(first, -((first.getDay() + 6) % 7));
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const dow = Array.from({ length: 7 }, (_, i) => addDays(start, i).toLocaleDateString(loc, { weekday: 'short' }).slice(0, 2));
  const goMonth = (n) => setView(new Date(view.getFullYear(), view.getMonth() + n, 1, 12));

  const onKey = (e) => {
    const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (moves[e.key]) {
      e.preventDefault();
      const n = addDays(focus, moves[e.key]);
      setFocus(n);
      if (n.getMonth() !== view.getMonth()) setView(new Date(n.getFullYear(), n.getMonth(), 1, 12));
    } else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(focus); }
    else if (e.key === 'Escape') setOpen(false);
  };

  const monthTitle = view.toLocaleDateString(loc, { month: 'long' });
  return (
    <div ref={wrap} className="relative" onKeyDown={e => { if (e.key === 'Escape') setOpen(false); }}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-haspopup="dialog" aria-expanded={open}
        className="w-full flex items-center gap-2.5 rounded-xl px-3.5 py-3 text-[15px] text-left transition-shadow"
        style={{ backgroundColor: CARD, border: `1px solid ${open ? 'var(--color-link,#5AAFEA)' : LINE}`, boxShadow: open ? '0 0 0 3px rgba(90,175,234,.18)' : 'none' }}
        data-testid="date-range-field">
        <CalendarDays className="w-[18px] h-[18px] shrink-0" style={{ color: LINK }} aria-hidden="true" />
        <span className={`flex-1 truncate ${label ? 'text-white' : 'text-white/45'}`}>{label || tt({ en: 'Any date', es: 'Cualquier fecha' })}</span>
        {label && (
          <span role="button" tabIndex={0} aria-label={tt({ en: 'Clear dates', es: 'Quitar fechas' })}
            onClick={e => { e.stopPropagation(); set(null, null); }} onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); set(null, null); } }}
            className="text-white/50 hover:text-white"><X className="w-4 h-4" /></span>
        )}
      </button>

      {open && (
        <>
          <div className="sm:hidden fixed inset-0 z-[60] bg-black/60" onClick={() => setOpen(false)} aria-hidden="true" />
          <div role="dialog" aria-label={tt({ en: 'Choose dates', es: 'Elegir fechas' })}
            className="gem-cal fixed sm:absolute inset-x-0 bottom-0 sm:bottom-auto sm:inset-x-auto sm:right-0 sm:top-[calc(100%+8px)] z-[61] sm:w-[340px] rounded-t-3xl sm:rounded-[18px] p-[18px] pb-7 sm:pb-[18px] shadow-[0_24px_60px_-20px_rgba(0,0,0,.8)]"
            style={{ backgroundColor: '#0B141D', border: '1px solid rgba(255,255,255,.1)' }}>
            <div className="flex flex-wrap gap-2 mb-3.5">
              {shortcuts.map(s => {
                const r = s.range(); const on = isShortcut(r);
                return (
                  <button key={s.label} type="button" onClick={() => { set(r[0], r[1]); setView(new Date(r[0].getFullYear(), r[0].getMonth(), 1, 12)); }}
                    className="px-3.5 py-1.5 rounded-full text-[13px] transition-colors"
                    style={on ? { backgroundColor: '#fff', color: '#04080C', fontWeight: 700 } : { border: `1px solid ${LINE}`, color: '#b4c0cb' }}>
                    {s.label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between mb-3">
              <button type="button" onClick={() => goMonth(-1)} aria-label={tt({ en: 'Previous month', es: 'Mes anterior' })} className="w-9 h-9 rounded-full inline-flex items-center justify-center text-white hover:bg-white/10" style={{ border: `1px solid ${LINE}` }}><ChevronLeft className="w-4 h-4" /></button>
              <p className="text-white font-bold text-[22px]" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                {monthTitle.charAt(0).toUpperCase() + monthTitle.slice(1)} <em className="font-medium" style={{ color: LINK }}>{view.getFullYear()}</em>
              </p>
              <button type="button" onClick={() => goMonth(1)} aria-label={tt({ en: 'Next month', es: 'Mes siguiente' })} className="w-9 h-9 rounded-full inline-flex items-center justify-center text-white hover:bg-white/10" style={{ border: `1px solid ${LINE}` }}><ChevronRight className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center" aria-hidden="true">
              {dow.map((d, i) => <span key={i} className="text-[11px] font-bold tracking-[0.14em] uppercase py-1.5 text-[#8a98a6]">{d}</span>)}
            </div>
            <div ref={grid} role="grid" onKeyDown={onKey} className="grid grid-cols-7 gap-1 text-center">
              {cells.map(d => {
                const k = iso(d);
                const out = d.getMonth() !== view.getMonth();
                const sel = (from && k === iso(from)) || (to && k === iso(to));
                const inRange = from && to && d > from && d < to;
                const n = dots[k];
                return (
                  <button key={k} type="button" role="gridcell" tabIndex={k === iso(focus) ? 0 : -1} data-focus={k === iso(focus) ? '1' : undefined}
                    aria-selected={!!sel} aria-label={`${d.toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long' })}${n ? ` · ${n}` : ''}`}
                    onClick={() => { setFocus(d); pick(d); }}
                    className={`relative h-10 text-[14px] tabular-nums transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-link,#5AAFEA)] ${sel ? 'rounded-xl font-bold text-white' : inRange ? 'text-white' : 'rounded-xl hover:bg-white/[0.07]'} ${out && !sel ? 'text-white/25' : 'text-white'}`}
                    style={sel ? { backgroundColor: ACCENT } : inRange ? { backgroundColor: 'rgba(0,104,179,.22)' } : k === iso(today) ? { boxShadow: `inset 0 0 0 1px ${LINK}` } : undefined}>
                    {d.getDate()}
                    {n > 0 && <span className="absolute left-1/2 -translate-x-1/2 bottom-1.5 w-[5px] h-[5px] rounded-full" style={{ backgroundColor: sel ? '#fff' : LINK }} aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between mt-3.5 pt-3.5 text-[14px]" style={{ borderTop: `1px solid ${LINE}` }}>
              <button type="button" className="font-semibold" style={{ color: LINK }} onClick={() => { set(today, today); setView(new Date(today.getFullYear(), today.getMonth(), 1, 12)); }}>{tt({ en: 'Today', es: 'Hoy' })}</button>
              <span className="text-[#8a98a6]">{Object.keys(dots).length} {tt({ en: 'days with events', es: 'días con eventos' })}</span>
              <button type="button" className="font-semibold" style={{ color: LINK }} onClick={() => set(null, null)}>{tt({ en: 'Clear', es: 'Limpiar' })}</button>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="sm:hidden mt-4 w-full rounded-full py-3 text-[15px] font-semibold text-white" style={{ backgroundColor: ACCENT }}>
              {tt({ en: 'Done', es: 'Listo' })}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
