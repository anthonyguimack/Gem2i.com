import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowUpRight } from 'lucide-react';
import { useT, useLang } from '../../lib/i18n';
import { getTileUrl, getTileAttribution } from '../../lib/mapConfig';

// ─────────────────────────────────────────────────────────────────────────
// GemModernMaps: "Where GEM2i plays" (gem2i template 01). Port of A Capital's
// components/ModernMaps.js (AUX-1.0 @ 1775e05) restyled for gem2i: the
// dark «Graphite Atlas» layout is the default (gem2i is a night theme), the
// accent is the gem2i blue. Tabs = the three Maps & Locations map types
// (Global presence / Conferences / Recommended sites); empty ones drop out.
// Header = Section Manager → aurex_locations_cfg. `layout: 'split'` on that
// config switches to the light split layout.
// ─────────────────────────────────────────────────────────────────────────

const SERIF = "'Playfair Display', Georgia, serif";
const GRAPHITE = 'var(--color-section-bg, #0A121A)';
const shell = 'max-w-[1440px] mx-auto px-5 sm:px-6 lg:px-[clamp(24px,5vw,80px)]';

const TAB_LABELS = {
  map_global: { en: 'Global presence', es: 'Presencia global' },
  map_conferences: { en: 'Conferences', es: 'Conferencias' },
  map_recommended: { en: 'Recommended sites', es: 'Sitios recomendados' },
};

const pin = (active, n) => L.divIcon({
  className: 'mm-pin-wrap',
  html: `<span class="mm-pin${active ? ' is-active' : ''}"><b>${n}</b></span>`,
  iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -16],
});

// Fits the map to the active tab's pins; flies to the selected one.
function MapView({ pts, sel, padLeft = 0 }) {
  const map = useMap();
  const key = pts.map(p => `${p.lat},${p.lng}`).join('|');
  React.useEffect(() => {
    if (!pts.length) return;
    if (pts.length === 1) map.setView([pts[0].lat, pts[0].lng], 5, { animate: false });
    else map.fitBounds(L.latLngBounds(pts.map(p => [p.lat, p.lng])), { paddingTopLeft: [48 + padLeft, 48], paddingBottomRight: [48, 48], maxZoom: 5, animate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  React.useEffect(() => {
    if (sel == null || !pts[sel]) return;
    map.flyTo([pts[sel].lat, pts[sel].lng], Math.max(map.getZoom(), 5), { duration: 0.8 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel]);
  return null;
}

function LeafletMap({ pts, sel, setSel, mapsLang, dark, padLeft = 0, className = '' }) {
  const tt = useT();
  const markers = React.useRef({});
  React.useEffect(() => { if (sel != null) markers.current[sel]?.openPopup(); }, [sel]);
  if (!pts.length) return null;
  return (
    <div className={`modern-map ${dark ? 'modern-map--dark' : ''} relative isolate overflow-hidden ${className}`}>
      <MapContainer center={[pts[0].lat, pts[0].lng]} zoom={3} scrollWheelZoom={false} zoomControl={false} style={{ height: '100%', width: '100%' }}>
        <ZoomControl position="topright" />
        <TileLayer url={getTileUrl(mapsLang || 'local')} attribution={getTileAttribution(mapsLang || 'local')} />
        <MapView pts={pts} sel={sel} padLeft={padLeft} />
        {pts.map((p, i) => (
          <Marker key={`${p.id || i}`} position={[p.lat, p.lng]} icon={pin(i === sel, i + 1)} ref={r => { markers.current[i] = r; }}
            eventHandlers={{ click: () => setSel(i) }}>
            <Popup>
              <strong>{tt(p.title) || tt(p.name)}</strong>
              {tt(p.description) && <p style={{ margin: '4px 0 0' }}>{tt(p.description)}</p>}
              {p.link && <a href={p.link} target={p.open_in_new_tab ? '_blank' : '_self'} rel="noopener noreferrer">Visit</a>}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

function Header({ cmsConfig, dark, count }) {
  const tt = useT();
  const { lang } = useLang();
  const title = tt(cmsConfig.title) || (lang === 'es' ? 'Dónde suena GEM2i' : 'Where GEM2i plays');
  const words = title.trim().split(/\s+/);
  const last = words.length > 1 ? words.pop() : null;
  const accent = 'var(--color-link, #5AAFEA)'; // text-safe blue (WCAG AA); raw accent only for fills
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8 lg:mb-10">
      <div className="flex flex-col gap-4 max-w-2xl">
        {tt(cmsConfig.eyebrow) && (
          <div className="inline-flex items-center gap-3 text-xs font-bold uppercase" style={{ letterSpacing: '.2em', color: accent }}>
            <span style={{ width: 32, height: 2, background: 'var(--color-accent, #3287B7)' }} />{tt(cmsConfig.eyebrow)}
          </div>
        )}
        <h2 className="font-bold" style={{ fontFamily: SERIF, fontSize: 'clamp(2rem, 3.4vw, 3rem)', lineHeight: 1.08, color: dark ? '#fff' : 'var(--color-heading, #1a2332)' }} data-testid="map-title">
          {words.join(' ')}{last && <> <em style={{ fontStyle: 'italic', fontWeight: 500, color: accent }}>{last}</em></>}
        </h2>
        {tt(cmsConfig.subtitle) && <p className="text-base md:text-lg leading-relaxed" style={{ color: dark ? 'rgba(255,255,255,.7)' : 'var(--color-body-text, #475569)' }}>{tt(cmsConfig.subtitle)}</p>}
      </div>
      <span className="text-sm font-bold tabular-nums self-start md:self-end" style={{ color: dark ? 'rgba(255,255,255,.55)' : 'rgba(20,26,58,.45)' }}>{String(count).padStart(2, '0')} {lang === 'es' ? 'ubicaciones' : 'locations'}</span>
    </div>
  );
}

function Tabs({ tabs, at, setAt, dark }) {
  const { lang } = useLang();
  if (tabs.length < 2) return null;
  return (
    <div role="tablist" aria-label="Map" className="flex flex-wrap gap-x-7 gap-y-2 mb-6 border-b" style={{ borderColor: dark ? 'rgba(255,255,255,.12)' : 'rgba(20,26,58,.1)' }}>
      {tabs.map((t, i) => {
        const active = i === at;
        const label = (TAB_LABELS[t.key] || {})[lang] || (TAB_LABELS[t.key] || {}).en || t.key;
        return (
          <button key={t.key} type="button" role="tab" aria-selected={active} onClick={() => setAt(i)}
            className="relative -mb-px pb-3 text-sm font-semibold transition-colors duration-150"
            style={{ color: active ? (dark ? '#fff' : 'var(--color-heading, #1a2332)') : (dark ? 'rgba(255,255,255,.5)' : 'rgba(20,26,58,.5)'), borderBottom: `2px solid ${active ? 'var(--color-accent, #3287B7)' : 'transparent'}` }}
            data-testid={`map-tab-${t.key}`}>
            {label} <span className="ml-1 tabular-nums font-bold" style={{ opacity: 0.55 }}>{t.pts.length}</span>
          </button>
        );
      })}
    </div>
  );
}

function PlaceRow({ p, i, active, onPick, dark }) {
  const tt = useT();
  const heading = dark ? '#fff' : 'var(--color-heading, #1a2332)';
  const body = dark ? 'rgba(255,255,255,.65)' : 'var(--color-body-text, #475569)';
  return (
    <li className="border-b" style={{ borderColor: dark ? 'rgba(255,255,255,.1)' : 'rgba(20,26,58,.1)' }}>
      <div className="flex items-start gap-4 py-4">
        <button type="button" onClick={() => onPick(i)} className="flex items-start gap-4 flex-1 min-w-0 text-left" data-testid={`map-place-${i}`}>
          <span className="w-7 h-7 flex-none rounded-full flex items-center justify-center text-[13px] font-bold tabular-nums transition-colors duration-150"
            style={{ background: active ? 'var(--color-accent, #3287B7)' : 'transparent', color: active ? '#fff' : (dark ? 'rgba(255,255,255,.7)' : 'rgba(20,26,58,.55)'), border: active ? 'none' : `1px solid ${dark ? 'rgba(255,255,255,.25)' : 'rgba(20,26,58,.2)'}` }}>{i + 1}</span>
          <span className="flex flex-col gap-1 min-w-0">
            <span className="font-semibold" style={{ fontFamily: SERIF, fontSize: '1.15rem', lineHeight: 1.25, color: active ? (dark ? 'var(--color-accent, #3287B7)' : 'var(--color-accent, #3287B7)') : heading }}>{tt(p.title) || tt(p.name)}</span>
            {tt(p.description) && <span className="text-[14px] leading-relaxed line-clamp-2" style={{ color: body }}>{tt(p.description)}</span>}
          </span>
        </button>
        {p.link && (
          <a href={p.link} target={p.open_in_new_tab ? '_blank' : '_self'} rel="noopener noreferrer" aria-label={`Visit ${tt(p.title) || tt(p.name)}`}
            className="mt-1 flex-none" style={{ color: dark ? 'var(--color-accent, #3287B7)' : 'var(--color-accent, #3287B7)' }}><ArrowUpRight className="w-5 h-5" /></a>
        )}
      </div>
    </li>
  );
}

/* ── Atlas Split (default) ─────────────────────────────────────────────────
   Directory on the left (numbered places), light greyscale map on the right;
   picking a place flies the map there. */
function SplitVariant({ pts, sel, pick, mapsLang }) {
  return (
    <div className="grid gap-8 lg:gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)] items-stretch">
      <ol className="m-0 p-0 list-none border-t order-2 lg:order-1 lg:max-h-[520px] lg:overflow-y-auto" style={{ borderColor: 'rgba(20,26,58,.1)' }}>
        {pts.map((p, i) => <PlaceRow key={p.id || i} p={p} i={i} active={i === sel} onPick={pick} />)}
      </ol>
      <LeafletMap pts={pts} sel={sel} setSel={pick} mapsLang={mapsLang} className="order-1 lg:order-2 h-[340px] sm:h-[420px] lg:h-[520px] rounded-[3px]" />
    </div>
  );
}

/* ── Graphite Atlas ─────────────────────────────────────────────
   Graphite band, dark map full width with the directory as a floating
   panel (stacked under the map on phones). */
function GraphiteVariant({ pts, sel, pick, mapsLang }) {
  return (
    <div className="relative isolate">
      <LeafletMap pts={pts} sel={sel} setSel={pick} mapsLang={mapsLang} dark padLeft={typeof window !== 'undefined' && window.innerWidth >= 1024 ? 380 : 0} className="h-[360px] sm:h-[460px] lg:h-[560px] rounded-[3px]" />
      <div className="lg:absolute lg:left-5 lg:top-5 lg:bottom-5 lg:w-[360px] z-10 mt-6 lg:mt-0 lg:rounded-[3px] lg:px-5 lg:overflow-y-auto" style={{ background: 'rgba(13,23,33,.92)', backdropFilter: 'blur(6px)' }}>
        <ol className="m-0 p-0 list-none">
          {pts.map((p, i) => <PlaceRow key={p.id || i} p={p} i={i} active={i === sel} onPick={pick} dark />)}
        </ol>
      </div>
    </div>
  );
}

// tabs = [{ key: 'map_global'|'map_conferences'|'map_recommended', locations: [] }]
export default function GemModernMaps({ tabs, cmsConfig = {}, mapsLang }) {
  const ready = (tabs || []).map(t => ({ ...t, pts: (t.locations || []).filter(l => l.lat && l.lng) })).filter(t => t.pts.length);
  const [at, setAt] = React.useState(0);
  const [sel, setSel] = React.useState(null);
  React.useEffect(() => { setSel(null); }, [at]);
  if (!ready.length) return null;
  const cur = ready[Math.min(at, ready.length - 1)];
  const dark = cmsConfig.layout !== 'split';
  const V = dark ? GraphiteVariant : SplitVariant;
  const count = ready.reduce((n, t) => n + t.pts.length, 0);
  return (
    <section id="locations" data-testid="gem2i-locations" style={{ background: dark ? GRAPHITE : '#fff' }}>
      <div className={`${shell} py-20 lg:py-28`}>
        <Header cmsConfig={cmsConfig} dark={dark} count={count} />
        <Tabs tabs={ready} at={Math.min(at, ready.length - 1)} setAt={setAt} dark={dark} />
        <V key={cur.key} pts={cur.pts} sel={sel} pick={setSel} mapsLang={mapsLang} />
      </div>
    </section>
  );
}
