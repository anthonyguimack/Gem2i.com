import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

// Referred-visitor banner (MMS plan §3.4): when the visitor arrived through an
// affiliate link (mms_via cookie set by lib/viaCapture.js), show a quiet
// "invited by" strip once per session. Never blocks, never errors the page.
export default function InvitedByBanner() {
  const [name, setName] = useState('');
  const [gone, setGone] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem('mms_via_banner_dismissed')) return;
      // URL param first: on the FIRST landing this child effect runs before
      // the parent's captureVia() has written the cookie (React child-first
      // effect order) — the cookie covers every later page.
      const via = new URLSearchParams(window.location.search).get('via')
        || document.cookie.split('; ').find((c) => c.startsWith('mms_via='))?.split('=')[1];
      if (!via) return;
      fetch(`/api/public/via/${encodeURIComponent(decodeURIComponent(via))}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d?.name && setName(d.name))
        .catch(() => {});
    } catch {
      /* tracking must never break the page */
    }
  }, []);

  if (!name || gone) return null;
  return (
    <div
      className="flex items-center justify-center gap-3 px-4 py-2 text-sm"
      style={{ background: 'var(--color-primary, #1a1d26)', color: '#fff' }}
      data-testid="invited-by-banner"
    >
      <span>
        You were invited by <strong>{name}</strong> — welcome!
      </span>
      <button
        aria-label="Dismiss"
        onClick={() => {
          setGone(true);
          try { sessionStorage.setItem('mms_via_banner_dismissed', '1'); } catch { /* ignore */ }
        }}
        className="opacity-70 hover:opacity-100"
      >
        <X size={14} />
      </button>
    </div>
  );
}
