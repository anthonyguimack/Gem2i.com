import React, { useEffect, useState } from 'react';
import { publicAPI } from '../lib/api';
import { useTheme } from '../App';
import Gem2iHome from './gem2i/Gem2iHome';

// gem2i homepage: the real dark-entertainment home (Phase 1) when the gem2i
// theme is active; otherwise the Phase-0 placeholder (kept as the fallback
// for any other theme selected in CMS Settings).
export default function HomePage() {
  const theme = useTheme();
  if (theme === 'gem2i') return <Gem2iHome />;
  return <PlaceholderHome />;
}

function PlaceholderHome() {
  const [s, setS] = useState({});
  useEffect(() => {
    publicAPI.getSettings().then(r => setS(r.data || {})).catch(() => {});
  }, []);
  const pick = (v) => (v && typeof v === 'object' ? (v.en || Object.values(v)[0] || '') : (v || ''));
  const brand = pick(s.brand_name) || 'GEM2i';
  const tagline = pick(s.tagline) || 'Global Entertainment Management & Marketing Integration';
  return (
    <div className="min-h-[72vh] flex items-center justify-center px-6 py-24">
      <div className="text-center max-w-2xl">
        <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: 'var(--color-heading, #111827)' }}>
          {brand}
        </h1>
        <p className="text-lg text-slate-500 mb-8">{tagline}</p>
        <p className="text-sm text-slate-400">
          The public experience is being built. Administration is available at{' '}
          <a href="/admin" className="underline" style={{ color: 'var(--color-accent, #0D9488)' }}>/admin</a>.
        </p>
      </div>
    </div>
  );
}
