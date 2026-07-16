import React, { useState } from 'react';
import { useT } from '../../lib/i18n';

const STORAGE_KEY = 'gem2i_cookies_accepted';
const GEM_FONT = "'Poppins', sans-serif";

/** Legacy gem2i cookie notice → bottom bar, acceptance persisted locally. */
export default function Gem2iCookieNotice() {
  const tt = useT();
  const [accepted, setAccepted] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return true; }
  });
  if (accepted) return null;

  const accept = () => {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* private mode */ }
    setAccepted(true);
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-[65] px-5 py-4" role="region" aria-label="Cookie notice"
      style={{ backgroundColor: 'var(--color-section-bg, #0A121A)', borderTop: '1px solid var(--color-card-border, rgba(255,255,255,0.08))', fontFamily: GEM_FONT }}
      data-testid="gem2i-cookie-notice">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
        <p className="text-xs leading-relaxed flex-1" style={{ color: 'var(--color-body-text, #9AA6B2)' }}>
          {tt({
            en: 'This website uses cookies. We use cookies to analyze website traffic and optimize your website experience. By accepting our use of cookies, your data will be aggregated with all other user data.',
            es: 'Este sitio web utiliza cookies. Usamos cookies para analizar el tráfico del sitio y optimizar tu experiencia. Al aceptar nuestro uso de cookies, tus datos se agregarán con los de los demás usuarios.',
          })}
        </p>
        <button onClick={accept}
          className="shrink-0 px-6 py-2 text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors"
          style={{ backgroundColor: 'var(--color-button-bg, #3287B7)', color: 'var(--color-button-text, #fff)' }}
          data-testid="gem2i-cookie-accept">
          {tt({ en: 'Accept', es: 'Aceptar' })}
        </button>
      </div>
    </div>
  );
}
