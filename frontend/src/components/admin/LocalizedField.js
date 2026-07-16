/**
 * LocalizedField — wraps any input with a tiny locale-tab strip so admins
 * can fill translations for each enabled language without touching JSON.
 *
 * Props:
 *   value      — current field value (string OR { en, es, … })
 *   onChange   — called with the full updated map
 *   render     — ({ value, onChange }) → input JSX (standard string IO)
 *
 * When only one language is enabled globally, renders the child inline
 * (no tab strip). Backwards-compatible: if value is a legacy string, tabs
 * preserve it under the currently active admin-edit lang.
 */
import React, { useState } from 'react';
import { useLang, getLocaleValue, setLocaleValue, LANGUAGE_LABELS } from '../../lib/i18n';

export default function LocalizedField({ value, onChange, render, disabled = false }) {
  const { enabled, defaultLang } = useLang();
  const [editLang, setEditLang] = useState(defaultLang);
  if (!enabled || enabled.length <= 1 || disabled) {
    // Single-language mode: no wrapper needed; render inline with scalar IO.
    const scalar = typeof value === 'object' && value !== null ? (value[defaultLang] ?? '') : (value || '');
    return render({ value: scalar, onChange: (v) => onChange(typeof value === 'object' && value !== null ? { ...value, [defaultLang]: v } : v) });
  }
  const cur = getLocaleValue(value, editLang);
  return (
    <div className="localized-field">
      <div className="flex items-center gap-1 mb-2" data-testid="locale-tab-row">
        {enabled.map(l => (
          <button key={l} type="button" onClick={() => setEditLang(l)} className={`text-[10px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-sm transition-colors ${editLang === l ? 'bg-[#0D9488] text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`} data-testid={`locale-tab-${l}`}>
            {LANGUAGE_LABELS[l]?.short || l.toUpperCase()}
            {typeof value === 'object' && value && value[l] && value[l] !== '' ? <span className="ml-1 w-1 h-1 rounded-full bg-emerald-400 inline-block align-middle" title="Translated" /> : null}
          </button>
        ))}
      </div>
      {render({ value: cur, onChange: (v) => onChange(setLocaleValue(value, editLang, v)) })}
    </div>
  );
}
