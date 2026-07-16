import React from 'react';

// The four CMS authoring scopes for a Personal Brand section.
// null = Global (shared by all non-PB themes + fallback for empty mini-sites).
export const PB_PERSONALITY_TABS = [
  { key: null,        label: 'Global',         cls: 'border-sky-400     text-sky-700'     },
  { key: 'business',  label: 'PB — Business',  cls: 'border-slate-400   text-slate-700'   },
  { key: 'lifestyle', label: 'PB — Lifestyle', cls: 'border-emerald-400 text-emerald-700' },
  { key: 'personal',  label: 'PB — Personal',  cls: 'border-violet-400  text-violet-700'  },
];

// Reusable Personal Brand personality tab strip for CMS content managers.
// Shows Global + the 3 mini-site tabs when the PB theme is active (`show`);
// renders nothing otherwise so non-PB themes behave exactly as before.
//
// Props:
//   show       boolean  — render the strip (typically active_theme === 'personalbrand')
//   activeTab  string?  — current scope (null | 'business' | 'lifestyle' | 'personal')
//   onChange   fn(key)  — called with the new scope key
//   savedTabs  Set      — keys ('__global__' for null) that already have content
//   label      string   — heading, e.g. "Services scope"
//   noun       string   — used in hints, e.g. "services"
export default function PersonalityTabs({ show, activeTab, onChange, savedTabs, label = 'Content scope', noun = 'content' }) {
  if (!show) return null;
  return (
    <div className="mb-5 border border-slate-200 rounded-sm bg-slate-50 p-4" data-testid="personality-tabs">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-xs text-slate-400 mb-3">
        Each Personal Brand mini-site can have its own {noun}.
        <span className="ml-1 font-medium text-slate-600">Global</span> is shared by all other themes and used as a fallback.
      </p>
      <div className="flex flex-wrap gap-2" role="tablist">
        {PB_PERSONALITY_TABS.map(tab => {
          const isActive = activeTab === tab.key;
          const hasSaved = savedTabs?.has(tab.key ?? '__global__');
          return (
            <button
              key={tab.key ?? '__global__'}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.key)}
              className={`px-4 py-2 rounded-sm text-sm font-medium border-2 transition-colors ${
                isActive
                  ? `bg-white shadow-sm ${tab.cls}`
                  : 'text-slate-400 border-transparent hover:text-slate-600 hover:bg-white/60'
              }`}
              data-testid={`ptab-${tab.key ?? 'global'}`}
            >
              {tab.label}
              {tab.key !== null && (
                <span className={`ml-1.5 text-[10px] font-normal ${hasSaved ? 'text-emerald-500' : 'text-amber-500'}`}>
                  ● {hasSaved ? 'configured' : 'not configured'}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-400 mt-2">
        {activeTab
          ? <>Showing <strong>{activeTab}</strong> {noun} — appears only on that mini-site; falls back to Global when left empty.</>
          : <>Global {noun} — used by all non-PB themes and as the fallback for any mini-site left empty.</>}
      </p>
    </div>
  );
}
