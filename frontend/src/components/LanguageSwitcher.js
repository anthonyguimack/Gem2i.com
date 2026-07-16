/**
 * Minimal pill dropdown that lets visitors switch between the locales
 * enabled in Settings. Auto-hides when only one locale is available.
 */
import React, { useState, useRef, useEffect } from 'react';
import { useLang, LANGUAGE_LABELS } from '../lib/i18n';
import { ChevronDown, Globe } from 'lucide-react';

export default function LanguageSwitcher({ compact = false, dark = false }) {
  const { lang, setLang, enabled } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  if (!enabled || enabled.length <= 1) return null;
  const activeLabel = LANGUAGE_LABELS[lang]?.short || lang.toUpperCase();
  return (
    <div ref={ref} className="relative" data-testid="language-switcher">
      <button type="button" onClick={() => setOpen(o => !o)} className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${compact ? 'px-2 py-1' : 'px-3 py-1.5'} ${dark ? 'text-white/80 hover:text-white' : 'hover:opacity-70'}`} aria-label="Change language">
        <Globe className="w-3.5 h-3.5" /> {activeLabel} <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 min-w-[140px] rounded-sm shadow-xl border py-1 z-50" style={{ backgroundColor: dark ? '#1a2332' : '#FFFFFF', borderColor: dark ? 'rgba(255,255,255,0.1)' : '#E5E7EB' }}>
          {enabled.map(l => (
            <button key={l} type="button" onClick={() => { setLang(l); setOpen(false); }} className={`block w-full text-left px-4 py-2 text-sm transition-colors ${lang === l ? 'font-semibold' : ''} ${dark ? 'text-white hover:bg-white/10' : 'text-gray-700 hover:bg-gray-50'}`} data-testid={`lang-option-${l}`}>
              {LANGUAGE_LABELS[l]?.name || l.toUpperCase()} <span className="text-xs opacity-60 ml-1">{LANGUAGE_LABELS[l]?.short || l.toUpperCase()}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
