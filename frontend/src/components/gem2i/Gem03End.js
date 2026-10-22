/* Gem2i - 03 — end of the home page, «Boceto 3 · Movimiento» (boceto gallery-to-end-variants.html, 2026-10-22):
 * gallery that slides sideways while you scroll (parallax photos), the GEM2i map full width with a glass panel
 * and a «Tour» that flies office to office, partners turning in a 3D ring, clients picked by their logo, and a
 * fill-in-the-sentence contact form → POST /api/contact (CMS → Contacts). Template 03 only. */
import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useT } from '../../lib/i18n';
import { contactAPI } from '../../lib/api';
import { getTileUrl, getTileAttribution } from '../../lib/mapConfig';
import { gemImg } from './GemCatalogBits';
import CaptchaWidget from '../CaptchaWidget';
import { GemHeading, GemCta } from './Gem2i03Sections';

// Rich-text CMS fields ("<p>…</p>") shown as plain text in compact spots.
const plainText = (v) => String(v || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const ACCENT = 'var(--color-accent, #3287B7)';
const BODY = 'var(--color-body-text, #9AA6B2)';
const EASE = 'ease-[cubic-bezier(.2,.8,.2,1)]';
const still = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const logoOf = (l) => gemImg(l.logo_url || l.image);

// ── Gallery: the section pins while you scroll and the photos slide sideways, each with a slight parallax.
const WIDTHS = ['min(60vw,520px)', 'min(40vw,340px)', 'min(48vw,420px)'];
export function GemGalleryScroll({ config = {}, items = [] }) {
  const tt = useT();
  const out = useRef(null);
  const track = useRef(null);
  const list = items.filter(g => gemImg(g.image)).slice(0, parseInt(config.max_items, 10) || 12);
  useEffect(() => {
    const o = out.current; const t = track.current;
    if (!o || !t || still()) return undefined;
    const onScroll = () => {
      const r = o.getBoundingClientRect();
      const total = o.offsetHeight - window.innerHeight;
      const p = Math.max(0, Math.min(1, -r.top / Math.max(1, total)));
      const max = Math.max(0, t.scrollWidth - window.innerWidth + 48);
      t.style.transform = `translateX(${-p * max}px)`;
      t.querySelectorAll('img').forEach(im => {
        const q = im.parentElement.getBoundingClientRect();
        im.style.transform = `translateX(${-((q.left + q.width / 2) / window.innerWidth - 0.5) * 12}%)`;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, [list.length]);
  if (!list.length) return null;
  return (
    <section ref={out} className="relative h-[300vh] motion-reduce:h-auto" data-testid="gem2i-gallery">
      <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-hidden flex flex-col justify-center motion-reduce:static motion-reduce:h-auto motion-reduce:py-20">
        <div className="max-w-7xl w-full mx-auto px-6 md:px-10">
          <GemHeading eyebrow={config.eyebrow} title={config.title || { en: 'Gallery', es: 'Galería' }} subtitle={config.subtitle}
            action={<GemCta text={config.cta_text} url={config.cta_url} newTab={config.cta_new_tab} />} />
        </div>
        <div ref={track} className="mt-9 flex gap-5 will-change-transform pl-[max(24px,calc((100vw-80rem)/2+40px))] motion-reduce:overflow-x-auto">
          {list.map((g, i) => (
            <figure key={g.id || i} className="relative m-0 shrink-0 h-[min(58vh,480px)] rounded-3xl overflow-hidden" style={{ width: WIDTHS[i % 3] }}>
              <img src={gemImg(g.image)} alt="" loading="lazy" className="absolute -inset-y-[10%] -inset-x-[15%] w-[130%] h-[120%] max-w-none object-cover will-change-transform" />
              <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 55%, rgba(0,0,0,.7))' }} />
              <figcaption className="absolute left-5 bottom-5 text-white">
                {tt(g.summary) && <span className="text-xs font-bold tracking-[0.16em] uppercase opacity-80">{plainText(tt(g.summary))}</span>}
                <b className="block text-[26px] font-extrabold tracking-[-0.03em]">{tt(g.title)}</b>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Map: full width (same OSM tiles in grey), a glass panel with the offices and a «Tour» that flies office to office.
const pinIcon = (active) => L.divIcon({ className: 'mm-pin-wrap', html: `<span class="mm-pin${active ? ' is-active' : ''}"><b></b></span>`, iconSize: [30, 30], iconAnchor: [15, 15] });
function Fly({ pts, sel }) {
  const map = useMap();
  const key = pts.map(p => `${p.lat},${p.lng}`).join('|');
  useEffect(() => {
    if (pts.length > 1) map.fitBounds(L.latLngBounds(pts.map(p => [p.lat, p.lng])), { paddingTopLeft: [window.innerWidth >= 1024 ? 400 : 40, 40], paddingBottomRight: [40, 40], maxZoom: 5, animate: false });
    else if (pts[0]) map.setView([pts[0].lat, pts[0].lng], 5, { animate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    if (sel != null && pts[sel]) map.flyTo([pts[sel].lat, pts[sel].lng], 5, { duration: 1.6 });
    else if (sel == null && pts.length > 1) map.flyToBounds(L.latLngBounds(pts.map(p => [p.lat, p.lng])), { paddingTopLeft: [window.innerWidth >= 1024 ? 400 : 40, 40], paddingBottomRight: [40, 40], maxZoom: 5, duration: 1.2 });
  }, [sel]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
export function GemMapTour({ tabs, cmsConfig = {}, mapsLang }) {
  const tt = useT();
  const pts = ((tabs || []).find(t => (t.locations || []).some(l => l.lat && l.lng))?.locations || []).filter(l => l.lat && l.lng);
  const [sel, setSel] = useState(null);
  const [touring, setTouring] = useState(false);
  useEffect(() => {
    if (!touring || pts.length < 2) return undefined;
    const t = setTimeout(() => setSel(s => (s == null ? 0 : (s + 1) % pts.length)), sel == null ? 0 : 3200);
    return () => clearTimeout(t);
  }, [touring, sel, pts.length]);
  if (!pts.length) return null;
  const pick = (i) => { setTouring(false); setSel(i); };
  return (
    <section id="locations" className="max-w-7xl mx-auto px-6 md:px-10 py-20 md:py-28" data-testid="gem2i-locations">
      <GemHeading eyebrow={cmsConfig.eyebrow} title={cmsConfig.title || { en: 'Where GEM2i plays', es: 'Dónde suena GEM2i' }} subtitle={cmsConfig.subtitle} />
      <div className="relative mt-11 rounded-[28px] overflow-hidden">
        <div className="modern-map relative isolate h-[620px] lg:h-[600px]">
          <MapContainer center={[pts[0].lat, pts[0].lng]} zoom={3} scrollWheelZoom={false} zoomControl={false} style={{ height: '100%', width: '100%' }}>
            <ZoomControl position="topright" />
            <TileLayer url={getTileUrl(mapsLang || 'local')} attribution={getTileAttribution(mapsLang || 'local')} />
            <Fly pts={pts} sel={sel} />
            {pts.map((p, i) => (
              <Marker key={`${p.id || i}-${i === sel}`} position={[p.lat, p.lng]} icon={pinIcon(i === sel)} eventHandlers={{ click: () => pick(i) }}>
                {i === sel && <Tooltip permanent direction="top" offset={[0, -14]}>{tt(p.title) || tt(p.name)}</Tooltip>}
              </Marker>
            ))}
          </MapContainer>
        </div>
        <div className="absolute z-[500] left-3 right-3 bottom-3 h-[46%] lg:left-6 lg:top-6 lg:bottom-6 lg:right-auto lg:h-auto lg:w-[340px] rounded-[22px] p-5 lg:p-6 flex flex-col backdrop-blur-xl shadow-[0_20px_50px_-20px_rgba(0,0,0,.35)]"
          style={{ backgroundColor: 'rgba(255,255,255,.74)', color: '#16191D' }}>
          <div className="flex justify-between items-center mb-4">
            <button type="button" onClick={() => { setTouring(false); setSel(null); }} disabled={sel == null} className="font-bold tabular-nums text-left disabled:cursor-default enabled:underline enabled:underline-offset-4" style={{ color: '#16191D' }}>
              {sel == null ? `${String(pts.length).padStart(2, '0')} ${tt({ en: 'locations', es: 'ubicaciones' })}` : `🌐 ${tt({ en: 'See all', es: 'Ver todas' })}`}
            </button>
            {pts.length > 1 && (
              <button type="button" onClick={() => setTouring(v => !v)} aria-pressed={touring} className="gem-press rounded-full px-3.5 py-2 text-[13px] font-extrabold text-white" style={{ backgroundColor: '#16191D' }}>
                {touring ? `❚❚ ${tt({ en: 'Stop', es: 'Parar' })}` : `▶ ${tt({ en: 'Tour', es: 'Recorrer' })}`}
              </button>
            )}
          </div>
          <ol className="m-0 p-0 list-none grid gap-1.5 overflow-auto">
            {pts.map((p, i) => (
              <li key={p.id || i}>
                <button type="button" onClick={() => pick(i)} aria-current={i === sel}
                  className="w-full text-left rounded-[14px] px-3.5 py-3 transition-[background-color,box-shadow] duration-300"
                  style={i === sel ? { backgroundColor: '#fff', boxShadow: '0 8px 20px -12px rgba(0,0,0,.3)' } : undefined}>
                  <b className="block text-[15px]" style={{ color: '#16191D' }}>{tt(p.title) || tt(p.name)}</b>
                  {tt(p.description) && <span className="text-[12.5px]" style={{ color: '#5B636C' }}>{plainText(tt(p.description))}</span>}
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

// ── Partners: logos on a 3D ring that turns slowly (pauses on hover); a plain row when motion is reduced.
export function GemLogoOrbit({ config = {}, items = [], testid = 'gem2i-partners' }) {
  const tt = useT();
  const list = items.filter(logoOf).slice(0, 14);
  if (!list.length) return null;
  const radius = Math.max(260, list.length * 44);
  return (
    <section className="py-20 md:py-28 overflow-hidden" data-testid={testid}>
      <style>{'@keyframes gemRingY{to{transform:rotateY(360deg)}}'}</style>
      <div className="max-w-7xl mx-auto px-6 md:px-10 text-center">
        <GemHeading eyebrow={config.eyebrow} title={config.title || { en: 'Brands that party with us', es: 'Marcas que salen con nosotros' }} subtitle={config.subtitle} />
      </div>
      <div className="group relative h-[300px] md:h-[420px] mt-8 [perspective:1100px] motion-reduce:hidden">
        <div className="absolute left-1/2 top-1/2 w-0 h-0 [transform-style:preserve-3d] animate-[gemRingY_30s_linear_infinite] group-hover:[animation-play-state:paused]">
          {list.map((l, i) => (
            <a key={l.id || i} href={l.link_url || undefined} target={l.link_url ? (l.link_target || '_blank') : undefined} rel="noopener noreferrer"
              className="absolute w-[150px] h-[88px] md:w-[190px] md:h-[110px] -ml-[75px] -mt-[44px] md:-ml-[95px] md:-mt-[55px] rounded-[18px] grid place-items-center [backface-visibility:hidden] shadow-[0_20px_40px_-24px_rgba(0,0,0,.35)]"
              style={{ transform: `rotateY(${(i * 360) / list.length}deg) translateZ(${radius}px)`, backgroundColor: '#fff', border: '1px solid rgba(0,0,0,.06)' }}>
              <img src={logoOf(l)} alt={tt(l.name) || ''} loading="lazy" className="max-w-[72%] max-h-[52px] object-contain" />
            </a>
          ))}
        </div>
      </div>
      <div className="hidden motion-reduce:flex flex-wrap justify-center gap-6 mt-10 px-6">
        {list.map((l, i) => <img key={l.id || i} src={logoOf(l)} alt={tt(l.name) || ''} className="h-12 object-contain" />)}
      </div>
    </section>
  );
}

// ── Clients: pick a client by its logo; the name and line swap beside the logos.
export function GemClientPicker({ kicker, title, text, logos = [], ctaText, ctaUrl, ctaNewTab }) {
  const tt = useT();
  const [at, setAt] = useState(0);
  if (!logos.length) return null;
  const c = logos[Math.min(at, logos.length - 1)];
  return (
    <section className="max-w-7xl mx-auto px-6 md:px-10 py-20 md:py-28" data-testid="gem2i-clients">
      <style>{'@keyframes gemSwap{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}'}</style>
      <GemHeading eyebrow={kicker || { en: 'Clients', es: 'Clientes' }} title={title || { en: 'Brands that trust us', es: 'Marcas que confían en nosotros' }} />
      <div className="mt-11 grid gap-10 md:grid-cols-[auto_1fr] items-center">
        <div className="grid grid-cols-3 gap-2.5 justify-self-start">
          {logos.slice(0, 9).map((l, i) => (
            <button key={l.id || i} type="button" onClick={() => setAt(i)} aria-pressed={i === at} aria-label={tt(l.name)}
              className={`w-[84px] h-[84px] md:w-[88px] md:h-[88px] rounded-[20px] p-3 transition-[transform,border-color,box-shadow] duration-300 ${EASE} ${i === at ? '-translate-y-1 shadow-[0_16px_30px_-18px_rgba(0,0,0,.4)]' : ''}`}
              style={{ backgroundColor: '#fff', border: `1px solid ${i === at ? '#16191D' : 'rgba(0,0,0,.08)'}` }}>
              {logoOf(l) && <img src={logoOf(l)} alt="" className="w-full h-full object-contain" />}
            </button>
          ))}
        </div>
        <div key={at} className="animate-[gemSwap_.55s_cubic-bezier(.2,.8,.2,1)_both] motion-reduce:animate-none">
          <h3 className="text-white font-extrabold leading-none tracking-[-0.04em]" style={{ fontSize: 'clamp(2rem, 4vw, 3.4rem)' }}>{tt(c.name)}</h3>
          {tt(c.description) && <p className="mt-4 max-w-[46ch] text-lg leading-[1.7]" style={{ color: BODY }}>{plainText(tt(c.description))}</p>}
          {text && <p className="mt-3 max-w-[52ch] text-[15px] leading-[1.7]" style={{ color: BODY }}>{plainText(text)}</p>}
          {ctaText && <div className="mt-6"><GemCta text={ctaText} url={ctaUrl || '/#contact'} newTab={ctaNewTab} /></div>}
        </div>
      </div>
    </section>
  );
}

// ── Contact: a sentence to fill in — «Hi, I'm ___ from ___. I'd like to ___. Reach me at ___.»
const WANTS = [
  { en: 'promote an event', es: 'promocionar un evento' }, { en: 'book an artist', es: 'contratar un artista' },
  { en: 'sponsor a night', es: 'patrocinar una noche' }, { en: 'list my venue', es: 'publicar mi venue' }, { en: 'become a member', es: 'hacerme socio' },
];
export function GemContactMadlib({ settings = {} }) {
  const tt = useT();
  const cs = settings.contact_settings || {};
  const [f, setF] = useState({ name: '', company: '', want: 0, email: '' });
  const [captchaToken, setCaptchaToken] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const message = `Hi, I'm ${f.name}${f.company ? ` from ${f.company}` : ''}. I'd like to ${WANTS[f.want].en}.`;
      await contactAPI.submit({ name: f.name, email: f.email, message, captcha_token: captchaToken, subject: 'gem2i contact section' });
      setDone(true);
    } catch (err) {
      toast.error(err?.response?.data?.detail || tt({ en: 'Could not send the message.', es: 'No se pudo enviar el mensaje.' }));
    } finally { setSending(false); }
  };
  const blank = 'mx-1 border-0 border-b-[3px] bg-transparent px-1 font-extrabold tracking-[-0.03em] outline-none align-baseline placeholder:opacity-40';
  const blankStyle = { color: ACCENT, borderColor: ACCENT, fontFamily: "'Manrope', sans-serif", fontSize: 'clamp(1.3rem, 3vw, 2.5rem)' };
  return (
    <section id="contact" className="max-w-7xl mx-auto px-6 md:px-10 py-20 md:py-28 scroll-mt-24" data-testid="gem2i-contact">
      <GemHeading eyebrow={cs.title || { en: 'Contact us', es: 'Contáctanos' }} title={cs.subtitle || { en: "Let's talk", es: 'Hablemos' }} />
      {done ? (
        <p className="mt-10 text-white text-3xl font-extrabold">{tt({ en: "Thanks — we'll be in touch ✓", es: 'Gracias, te escribiremos pronto ✓' })}</p>
      ) : (
        <form onSubmit={submit} className="mt-10 text-white font-bold leading-[1.7]" style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.6rem, 3.6vw, 3rem)' }} data-testid="gem2i-contact-form">
          {tt({ en: "Hi, I'm", es: 'Hola, soy' })}
          <input required value={f.name} onChange={set('name')} size={9} placeholder={tt({ en: 'your name', es: 'tu nombre' })} aria-label={tt({ en: 'Your name', es: 'Tu nombre' })} className={blank} style={blankStyle} />
          {tt({ en: 'from', es: 'de' })}
          <input value={f.company} onChange={set('company')} size={8} placeholder={tt({ en: 'company', es: 'empresa' })} aria-label={tt({ en: 'Company', es: 'Empresa' })} className={blank} style={blankStyle} />.
          {' '}{tt({ en: "I'd like to", es: 'Me gustaría' })}
          <select value={f.want} onChange={e => setF(p => ({ ...p, want: +e.target.value }))} aria-label={tt({ en: 'What you need', es: 'Lo que necesitas' })} className={`${blank} appearance-none cursor-pointer`} style={blankStyle}>
            {WANTS.map((w, i) => <option key={i} value={i}>{tt(w)}</option>)}
          </select>.
          {' '}{tt({ en: 'Reach me at', es: 'Escríbeme a' })}
          <input required type="email" value={f.email} onChange={set('email')} size={12} placeholder="email" aria-label="Email" className={blank} style={blankStyle} />.
          <div className="mt-6 font-sans text-base"><CaptchaWidget onChange={setCaptchaToken} testId="gem2i-contact-captcha" /></div>
          <button type="submit" disabled={sending} className="gem-press mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-[15px] font-bold text-white disabled:opacity-50" style={{ backgroundColor: ACCENT, fontFamily: "'Manrope', sans-serif" }} data-testid="gem2i-contact-submit">
            {sending && <Loader2 className="w-4 h-4 animate-spin" />}{tt(cs.submit_text) || tt({ en: 'Send it', es: 'Enviar' })} {!sending && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>
      )}
    </section>
  );
}

// Country (last « · » part of the role) → region and map spot. Unknown countries fall back to «Other».
const COUNTRY = {
  'united states': ['North America', 40.71, -74.0], usa: ['North America', 40.71, -74.0], canada: ['North America', 43.65, -79.38], mexico: ['North America', 19.43, -99.13],
  spain: ['Europe', 40.42, -3.70], 'united kingdom': ['Europe', 51.51, -0.13], france: ['Europe', 48.86, 2.35], italy: ['Europe', 41.9, 12.5], germany: ['Europe', 52.52, 13.4], netherlands: ['Europe', 52.37, 4.9], portugal: ['Europe', 38.72, -9.14],
  peru: ['South America', -12.05, -77.04], argentina: ['South America', -34.6, -58.38], brazil: ['South America', -23.55, -46.63], colombia: ['South America', 4.71, -74.07], chile: ['South America', -33.45, -70.67],
  'dominican republic': ['Central America', 18.49, -69.93], 'puerto rico': ['Central America', 18.47, -66.11], panama: ['Central America', 8.98, -79.52], 'costa rica': ['Central America', 9.93, -84.08],
};
const REGION_ES = { 'North America': 'Norteamérica', Europe: 'Europa', 'South America': 'Sudamérica', 'Central America': 'Centroamérica', Other: 'Otros' };
const placeOf = (role) => {
  const country = String(role || '').split('·').pop().trim();
  const hit = COUNTRY[country.toLowerCase()];
  return { country, region: hit ? hit[0] : 'Other', lat: hit?.[1], lng: hit?.[2] };
};
const initialsOf = (name) => String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');

// ── Team · T1: a dark world map with a pulsing pin per person (from each person's country); a pin or a name
// opens that person's card on the right.
const teamPin = (active) => L.divIcon({ className: 'mm-pin-wrap', html: `<span class="mm-pin${active ? ' is-active' : ''}"><b></b></span>`, iconSize: [30, 30], iconAnchor: [15, 15] });
function FitTeam({ pts, sel }) {
  const map = useMap();
  const key = pts.map(p => `${p.lat},${p.lng}`).join('|');
  useEffect(() => {
    if (pts.length > 1) map.fitBounds(L.latLngBounds(pts.map(p => [p.lat, p.lng])), { paddingTopLeft: [40, 40], paddingBottomRight: [window.innerWidth >= 1024 ? 400 : 40, 40], maxZoom: 4, animate: false });
    else if (pts[0]) map.setView([pts[0].lat, pts[0].lng], 4, { animate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => { if (sel != null && pts[sel]) map.flyTo([pts[sel].lat, pts[sel].lng], Math.max(map.getZoom(), 4), { duration: 1.2 }); }, [sel]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
export function GemTeamMap({ config = {}, items = [], mapsLang }) {
  const tt = useT();
  const [sel, setSel] = useState(0);
  const people = items.slice(0, parseInt(config.max_visible, 10) || items.length).map(m => ({ ...m, ...placeOf(tt(m.role)) }));
  if (!people.length) return null;
  // People in the same country get a small offset so their pins don't overlap.
  const seen = {};
  const pts = people.filter(p => p.lat != null).map(p => { const k = `${p.lat},${p.lng}`; const n = (seen[k] = (seen[k] || 0) + 1) - 1; return { ...p, lat: p.lat + n * 1.6, lng: p.lng + n * 2.2 }; });
  const cur = people[Math.min(sel, people.length - 1)];
  const curPt = pts.findIndex(p => p === pts.find(q => q.id === cur.id && q.name === cur.name));
  return (
    <section className="max-w-7xl mx-auto px-6 md:px-10 py-20 md:py-28" data-testid="gem2i-team">
      <style>{'@keyframes gemSwap{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}'}</style>
      <GemHeading eyebrow={config.eyebrow} title={config.title} subtitle={config.subtitle} />
      <div className="relative mt-11 rounded-[28px] overflow-hidden" style={{ backgroundColor: '#0D0F12' }}>
        {pts.length > 0 && (
          <div className="modern-map modern-map--dark relative isolate h-[560px] lg:h-[540px]">
            <MapContainer center={[pts[0].lat, pts[0].lng]} zoom={3} scrollWheelZoom={false} zoomControl={false} style={{ height: '100%', width: '100%' }}>
              <ZoomControl position="topleft" />
              <TileLayer url={getTileUrl(mapsLang || 'local')} attribution={getTileAttribution(mapsLang || 'local')} />
              <FitTeam pts={pts} sel={curPt >= 0 ? curPt : null} />
              {pts.map((p, i) => (
                <Marker key={`${p.id || i}-${i === curPt}`} position={[p.lat, p.lng]} icon={teamPin(i === curPt)} eventHandlers={{ click: () => setSel(people.indexOf(people.find(q => q.id === p.id && q.name === p.name))) }}>
                  <Tooltip direction="top" offset={[0, -14]}>{tt(p.name)}</Tooltip>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}
        <div className="lg:absolute lg:right-6 lg:top-6 lg:bottom-6 lg:w-[340px] z-[500] relative m-3 lg:m-0 rounded-[22px] p-6 flex flex-col" style={{ backgroundColor: '#fff', color: '#16191D' }}>
          <div key={sel} className="animate-[gemSwap_.5s_both] motion-reduce:animate-none">
            <span className="w-[84px] h-[84px] rounded-full overflow-hidden inline-flex items-center justify-center text-2xl font-extrabold" style={{ background: 'linear-gradient(135deg, #1d3a52, #0f1d2a)', color: '#5FB2E0' }}>
              {cur.photo_url ? <img src={gemImg(cur.photo_url)} alt="" className="w-full h-full object-cover" /> : initialsOf(tt(cur.name))}
            </span>
            <h3 className="mt-4 text-[22px] font-bold" style={{ color: '#16191D' }}>{tt(cur.name)}</h3>
            <p className="text-sm font-bold" style={{ color: '#3287B7' }}>{tt(cur.role)}</p>
            {tt(cur.bio) && <p className="mt-3.5 text-[15px] leading-[1.65]" style={{ color: '#5B636C' }}>{plainText(tt(cur.bio))}</p>}
          </div>
          <div className="mt-5 lg:mt-auto flex flex-wrap gap-1.5">
            {people.map((m, i) => (
              <button key={m.id || i} type="button" onClick={() => setSel(i)} aria-pressed={i === sel}
                className="rounded-full px-2.5 py-1.5 text-xs font-bold transition-colors"
                style={i === sel ? { backgroundColor: '#16191D', color: '#fff', border: '1px solid #16191D' } : { backgroundColor: '#fff', color: '#16191D', border: '1px solid #E3E5E8' }}>
                {String(tt(m.name) || '').split(/\s+/)[0]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
