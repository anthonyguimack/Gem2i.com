import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Rss, Copy, Check, RefreshCw, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { memberAPI } from '../../lib/api';
import { useT } from '../../lib/i18n';

/**
 * gem2i My Account 2.0 — Calendar Sync. A personal, private iCal URL with the
 * member's guest passes and tickets; Google / Apple / Outlook refresh it on
 * their own. Rotating the link kills the old one (shared by mistake).
 */
const L = {
  title: { en: 'Calendar Sync', es: 'Sincronizar calendario' },
  intro: { en: 'Subscribe once and every guest list you join or ticket you buy shows up in your phone calendar automatically.', es: 'Suscríbete una vez y cada lista de invitados o entrada que compres aparecerá sola en el calendario de tu teléfono.' },
  yourLink: { en: 'Your private calendar link', es: 'Tu enlace privado de calendario' },
  copy: { en: 'Copy link', es: 'Copiar enlace' },
  copied: { en: 'Link copied', es: 'Enlace copiado' },
  open: { en: 'Open in my calendar app', es: 'Abrir en mi app de calendario' },
  private: { en: 'Keep this link private: anyone with it can see your events.', es: 'Mantén este enlace en privado: cualquiera que lo tenga puede ver tus eventos.' },
  rotate: { en: 'Create a new link', es: 'Crear un enlace nuevo' },
  rotateConfirm: { en: 'The current link will stop working in every calendar that uses it. Continue?', es: 'El enlace actual dejará de funcionar en todos los calendarios que lo usan. ¿Continuar?' },
  rotated: { en: 'New link created — subscribe again with it', es: 'Enlace nuevo creado: vuelve a suscribirte con él' },
  error: { en: 'Could not load your calendar link.', es: 'No se pudo cargar tu enlace de calendario.' },
  how: { en: 'How to add it', es: 'Cómo añadirlo' },
  google: { en: 'Google Calendar: Other calendars → + → From URL → paste the link.', es: 'Google Calendar: Otros calendarios → + → Desde URL → pega el enlace.' },
  apple: { en: 'iPhone / Mac: tap “Open in my calendar app”, or Calendar → File → New Calendar Subscription.', es: 'iPhone / Mac: toca «Abrir en mi app de calendario», o Calendario → Archivo → Nueva suscripción.' },
  outlook: { en: 'Outlook: Add calendar → Subscribe from web → paste the link.', es: 'Outlook: Agregar calendario → Suscribirse desde la web → pega el enlace.' },
};

export default function CalendarSync() {
  const tt = useT();
  const ctx = useOutletContext() || {};
  const title = ctx.sectionLabel ? ctx.sectionLabel('calendar-sync', tt(L.title)) : tt(L.title);
  const [url, setUrl] = useState(null);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rotating, setRotating] = useState(false);

  useEffect(() => {
    memberAPI.getGemIcalUrl().then(r => setUrl(r.data?.url || '')).catch(() => { setUrl(''); setError(true); });
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(tt(L.copied));
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard blocked: the field stays selectable */ }
  };

  const rotate = async () => {
    if (!window.confirm(tt(L.rotateConfirm))) return;
    setRotating(true);
    try {
      const r = await memberAPI.rotateGemIcalUrl();
      setUrl(r.data?.url || '');
      toast.success(tt(L.rotated));
    } catch { toast.error(tt(L.error)); }
    setRotating(false);
  };

  const v = (name, fb) => `var(--ma-${name}, ${fb})`;
  const webcal = url ? url.replace(/^https?:\/\//, 'webcal://') : '';

  return (
    <div className="max-w-2xl" data-testid="gem-calendar-sync">
      <div className="flex items-center gap-2 mb-2">
        <Rss className="w-5 h-5" style={{ color: v('accent', '#3287B7') }} />
        <h1 className="text-lg font-semibold" style={{ color: v('text-primary', '#fff') }}>{title}</h1>
      </div>
      <p className="text-sm mb-5 max-w-prose" style={{ color: v('text-secondary', '#9aa7b4') }}>{tt(L.intro)}</p>

      <div className="ma2-card p-5">
        {url === null ? (
          <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin" style={{ color: v('accent', '#3287B7') }} /></div>
        ) : error ? (
          <p className="text-sm flex items-center gap-2" style={{ color: 'var(--ma2-danger-fg)' }} role="alert"><AlertTriangle className="w-4 h-4" />{tt(L.error)}</p>
        ) : (
          <>
            <label htmlFor="ical-url" className="block text-xs font-medium mb-1.5" style={{ color: v('text-secondary', '#9aa7b4') }}>{tt(L.yourLink)}</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input id="ical-url" readOnly value={url} onFocus={e => e.target.select()}
                className="ma2-input flex-1 min-w-0 font-mono text-xs" data-testid="ical-url" />
              <button onClick={copy} className="ma2-btn ma2-btn-primary ma2-press shrink-0 inline-flex items-center justify-center gap-1.5" data-testid="ical-copy">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}{tt(L.copy)}
              </button>
            </div>
            <p className="text-xs mt-2" style={{ color: v('text-muted', '#7b8794') }}>{tt(L.private)}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              <a href={webcal} className="ma2-btn ma2-btn-outline ma2-press" data-testid="ical-open">{tt(L.open)}</a>
              <button onClick={rotate} disabled={rotating} className="ma2-btn ma2-btn-light ma2-press inline-flex items-center gap-1.5" data-testid="ical-rotate">
                {rotating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}{tt(L.rotate)}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="ma2-card p-5 mt-4">
        <h2 className="text-sm font-semibold mb-2" style={{ color: v('text-primary', '#fff') }}>{tt(L.how)}</h2>
        <ul className="text-sm space-y-1.5 list-disc pl-5" style={{ color: v('text-secondary', '#9aa7b4') }}>
          <li>{tt(L.google)}</li>
          <li>{tt(L.apple)}</li>
          <li>{tt(L.outlook)}</li>
        </ul>
      </div>
    </div>
  );
}
