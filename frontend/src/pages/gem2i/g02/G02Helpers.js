/* Gem2i (`gem2i_02`) — own copy for the Gem2i package (D-GEM-2026-15), made from the Norules version so both
 * templates have the same pages; the Gem2i design comes later. Never import Norules files from here. */
import React, { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { publicAPI } from '../../../lib/api';
import { useT } from '../../../lib/i18n';
import { useAuth } from '../../../lib/auth';
import { slugify, SERIF } from '../../../components/gem2i/g02/G02DetailBits';
import { NBtn } from '../../../components/gem2i/g02/G02Btn';
import { BODY, CARD, LINE, LINK } from '../../../components/gem2i/g02/GemCatalogCards';

export function useSection(key) {
  const [data, setData] = useState(null);
  useEffect(() => {
    let alive = true;
    publicAPI.getSectionContent(key).then(r => { if (alive) setData(r.data || {}); }).catch(() => { if (alive) setData({}); });
    return () => { alive = false; };
  }, [key]);
  return data;
}

/** Legacy parity: travels.php and partners.php asked visitors to log in. */
export function MembersGate({ on, children }) {
  const tt = useT();
  const { user, loading } = useAuth();
  if (!on || user) return children;
  if (loading) return null;
  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 mt-12">
      <div className="rounded-2xl p-10 md:p-14 text-center" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }} data-testid="members-gate">
        <Lock className="w-8 h-8 mx-auto" style={{ color: LINK }} aria-hidden="true" />
        <p className="mt-4 text-white font-bold text-[26px]" style={{ fontFamily: SERIF }}>{tt({ en: 'For GEM2i members', es: 'Para miembros de GEM2i' })}</p>
        <p className="mt-2 text-[16px]" style={{ color: BODY }}>{tt({ en: 'Log in to see this page.', es: 'Inicia sesión para ver esta página.' })}</p>
        <NBtn onClick={() => window.dispatchEvent(new CustomEvent('gem2i:open-login'))} className="mt-6">{tt({ en: 'Log in', es: 'Iniciar sesión' })}</NBtn>
      </div>
    </div>
  );
}

export const tripSlug = (item) => slugify(item.slug || item.title?.en || item.title);

// Office → IANA zone for the live local time (CMS offices carry no zone; matched on the name).
const ZONES = [
  [/new york|usa|united states|miami/i, 'America/New_York'], [/spain|españa|madrid|ibiza|barcelona/i, 'Europe/Madrid'],
  [/lima|peru|perú/i, 'America/Lima'], [/buenos aires|argentina/i, 'America/Argentina/Buenos_Aires'],
  [/santo domingo|dominican/i, 'America/Santo_Domingo'], [/mexico|méxico/i, 'America/Mexico_City'],
  [/bogot|colombia/i, 'America/Bogota'], [/london|united kingdom|\buk\b/i, 'Europe/London'],
  [/paris|france/i, 'Europe/Paris'], [/berlin|germany/i, 'Europe/Berlin'], [/dubai|emirates/i, 'Asia/Dubai'],
];
export const zoneOf = (name = '') => (ZONES.find(([re]) => re.test(name)) || [])[1];
export const localTime = (zone, now) => {
  try { return now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: zone }); } catch { return ''; }
};

