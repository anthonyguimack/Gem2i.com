/**
 * Simple i18n helper: resolves localized values from any admin-written
 * field that may be either a plain string (legacy) or a `{ en, es, … }`
 * locale map. Never throws — always returns a string.
 *
 *   t(value, lang, fallbacks) →
 *     if string   → the string
 *     if object   → value[lang] || value[fallback[0]] || first non-empty
 *                   || '' (never undefined)
 *
 * Admins may start writing translations gradually: an untranslated field
 * stays as plain string and continues to work.
 */
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export function t(value, lang = 'en', fallbacks = []) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && !Array.isArray(value)) {
    // Strict: return the value in the requested locale, or empty string.
    // No cross-locale fallback — admins must explicitly fill each language.
    // `fallbacks` param is kept for API compatibility but intentionally ignored
    // so the website never silently shows the wrong language.
    if (value[lang] != null && value[lang] !== '') return String(value[lang]);
    return '';
  }
  return String(value);
}

/** Admin-only helper: returns the first non-empty locale (or legacy string)
 *  so item lists in the CMS still show a readable preview regardless of the
 *  admin's current edit-locale. Never used on the public site. */
export function adminText(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && !Array.isArray(v)) {
    for (const k of ['en', 'es', 'fr', 'de', 'it', 'pt']) {
      if (v[k] != null && v[k] !== '') return String(v[k]);
    }
    for (const k of Object.keys(v)) {
      if (k.startsWith('_')) continue; // skip internal keys
      if (v[k] != null && v[k] !== '') return String(v[k]);
    }
  }
  return String(v);
}

/** True when the value has at least one non-empty translation OR is a
 *  non-empty legacy string. Used to decide whether to render a section
 *  header / CTA at all (strict mode — no hardcoded defaults). */
export function hasAnyTranslation(v) {
  if (v == null) return false;
  if (typeof v === 'string') return v !== '';
  if (typeof v === 'object' && !Array.isArray(v)) {
    return Object.entries(v).some(([k, val]) => !k.startsWith('_') && val != null && val !== '');
  }
  return false;
}

/** True when the value applies to the given locale — used to filter list
 *  items by language. Legacy plain strings are visible in every locale
 *  (backwards compatibility). Localized dicts are only visible in the
 *  locales they have non-empty content for. */
export function itemHasLocale(value, lang) {
  if (value == null) return false;
  if (typeof value === 'string') return value !== '';
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value[lang] != null && value[lang] !== '';
  }
  return false;
}

/** Upgrade a string → object when admin starts translating.
 *  Used inside LocalizedField to emit writes without destroying legacy data. */
export function setLocaleValue(current, lang, newValue) {
  if (typeof current === 'object' && current !== null && !Array.isArray(current)) {
    return { ...current, [lang]: newValue };
  }
  // Fresh — initialize a clean locale object. Legacy plain strings are
  // dropped on first edit so they don't leak into other locales.
  return { [lang]: newValue };
}

/** Extract the value shown in a specific locale tab of the admin UI. */
export function getLocaleValue(current, lang) {
  if (typeof current === 'string') return current;
  if (current && typeof current === 'object') return current[lang] ?? '';
  return '';
}

// ─── Language context (reads enabled languages from settings) ──────────

const LangContext = createContext({ lang: 'en', setLang: () => {}, enabled: ['en'], defaultLang: 'en' });

export function LanguageProvider({ settings, children }) {
  const enabled = useMemo(() => (settings?.languages && settings.languages.length ? settings.languages : ['en']), [settings?.languages]);
  const defaultLang = settings?.default_language || enabled[0] || 'en';
  // Start with default; we'll re-check after settings load.
  const [lang, setLangState] = useState('en');
  const [initialized, setInitialized] = useState(false);

  // Re-check URL param and localStorage after settings load (enabled list is populated).
  useEffect(() => {
    if (!settings?.languages || settings.languages.length === 0) return; // settings not loaded yet
    if (initialized) return; // already initialized
    const urlLang = new URLSearchParams(window.location.search).get('lang');
    const stored = localStorage.getItem('aurex_locale');
    const candidate = urlLang || stored || defaultLang;
    const resolved = enabled.includes(candidate) ? candidate : defaultLang;
    setLangState(resolved);
    setInitialized(true);
  }, [settings?.languages, enabled, defaultLang, initialized]);

  // If admin removes the active language from settings, fall back gracefully.
  useEffect(() => { if (initialized && !enabled.includes(lang)) setLangState(defaultLang); }, [enabled, lang, defaultLang, initialized]);
  const setLang = (l) => {
    if (!enabled.includes(l)) return;
    setLangState(l);
    try { localStorage.setItem('aurex_locale', l); } catch {}
  };
  const value = useMemo(() => ({ lang, setLang, enabled, defaultLang }), [lang, enabled, defaultLang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() { return useContext(LangContext); }

/** Hook helper: `const tt = useT(); tt(value)` — shorthand that pulls lang from context.
 *  Strict mode — never falls back to another locale. */
export function useT() {
  const { lang } = useLang();
  return (v) => t(v, lang);
}

// Static human labels for the switcher
export const LANGUAGE_LABELS = {
  en: { name: 'English',    short: 'EN' },
  es: { name: 'Español',    short: 'ES' },
  fr: { name: 'Français',   short: 'FR' },
  de: { name: 'Deutsch',    short: 'DE' },
  it: { name: 'Italiano',   short: 'IT' },
  pt: { name: 'Português',  short: 'PT' },
};
