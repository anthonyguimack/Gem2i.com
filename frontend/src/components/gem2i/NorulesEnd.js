/* Norules — end of the home page, «Boceto 2 · Editorial» (boceto gallery-to-end-variants.html, 2026-10-22):
 * masonry gallery with a full-screen viewer, the GEM2i map (same OSM tiles + grey filter) with the offices as
 * floating tabs that fly the map, a hairline logo wall, client cases that unfold, and a contact block with the
 * e-mail big (tap to copy) plus a three-step form → POST /api/contact (CMS → Contacts). Norules only. */
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, ArrowRight, X } from 'lucide-react';
import { toast } from 'sonner';
import { useT, useLang } from '../../lib/i18n';
import { contactAPI, publicAPI } from '../../lib/api';
import { getTileUrl, getTileAttribution } from '../../lib/mapConfig';
import { gemImg } from './GemCatalogBits';
import CaptchaWidget from '../CaptchaWidget';
import { GemHeading, GemCta } from './NorulesSections';

// Rich-text CMS fields ("<p>…</p>") shown as plain text in compact spots.
const plainText = (v) => String(v || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const ACCENT = 'var(--color-accent, #3287B7)';
const BODY = 'var(--color-body-text, #9AA6B2)';
const CARD = 'var(--color-card-bg, #0D1721)';
const BORDER = 'var(--color-card-border, rgba(255,255,255,0.08))';
const EASE = 'ease-[cubic-bezier(.2,.8,.2,1)]';
const Wrap = ({ children, testid, id }) => (
  <section id={id} className="max-w-7xl mx-auto px-6 md:px-10 py-20 md:py-28" data-testid={testid}>{children}</section>
);
const logoOf = (l) => gemImg(l.logo_url || l.image);

// ── Gallery: masonry; a tap opens the full-screen viewer (arrows, Esc).
const RATIOS = ['3/4', '1/1', '4/5', '4/3', '3/4', '1/1', '16/11', '4/5', '1/1', '3/4'];
export function GemGalleryMasonry({ config = {}, items = [] }) {
  const tt = useT();
  const [open, setOpen] = useState(-1);
  const list = items.filter(g => gemImg(g.image)).slice(0, parseInt(config.max_items, 10) || 9);
  useEffect(() => {
    if (open < 0) return undefined;
    const key = (e) => {
      if (e.key === 'Escape') setOpen(-1);
      if (e.key === 'ArrowRight') setOpen(i => (i + 1) % list.length);
      if (e.key === 'ArrowLeft') setOpen(i => (i - 1 + list.length) % list.length);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [open, list.length]);
  if (!list.length) return null;
  const cur = open >= 0 ? list[open] : null;
  return (
    <Wrap testid="gem2i-gallery">
      <GemHeading eyebrow={config.eyebrow} title={config.title || { en: 'Gallery', es: 'Galería' }} subtitle={config.subtitle}
        action={<GemCta text={config.cta_text} url={config.cta_url} newTab={config.cta_new_tab} />} />
      <div className="mt-11 [column-width:320px] [column-gap:16px]">
        {list.map((g, i) => (
          <button key={g.id || i} type="button" onClick={() => setOpen(i)} aria-label={tt(g.title)}
            className="group relative block w-full mb-3.5 [break-inside:avoid] rounded-[18px] overflow-hidden cursor-zoom-in">
            <img src={gemImg(g.image)} alt="" loading="lazy" className={`block w-full object-cover transition-transform duration-700 ${EASE} group-hover:scale-[1.06]`} style={{ aspectRatio: RATIOS[i % RATIOS.length] }} />
            <span className="absolute inset-x-0 bottom-0 p-4 text-left text-white opacity-0 translate-y-2 transition-[opacity,transform] duration-300 group-hover:opacity-100 group-hover:translate-y-0"
              style={{ background: 'linear-gradient(180deg, transparent, rgba(0,0,0,.75))' }}>
              <b className="block">{tt(g.title)}</b>{tt(g.summary) && <span className="text-xs opacity-80">{tt(g.summary)}</span>}
            </span>
          </button>
        ))}
      </div>
      {cur && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-4 text-white" style={{ backgroundColor: 'rgba(10,12,15,.94)' }} role="dialog" aria-modal="true" onClick={() => setOpen(-1)}>
          <button type="button" onClick={() => setOpen(-1)} aria-label={tt({ en: 'Close', es: 'Cerrar' })} className="absolute right-5 top-5 w-11 h-11 rounded-full inline-flex items-center justify-center bg-white/10"><X className="w-5 h-5" /></button>
          <img src={gemImg(cur.image)} alt={tt(cur.title)} className="w-[min(90vw,1200px)] h-[min(78vh,800px)] object-contain rounded-xl" onClick={e => e.stopPropagation()} />
          <b>{tt(cur.title)}{tt(cur.summary) ? ` · ${tt(cur.summary)}` : ''}</b>
          <div className="flex gap-2.5" onClick={e => e.stopPropagation()}>
            {[-1, 1].map(d => (
              <button key={d} type="button" onClick={() => setOpen(i => (i + d + list.length) % list.length)} aria-label={d < 0 ? tt({ en: 'Previous', es: 'Anterior' }) : tt({ en: 'Next', es: 'Siguiente' })}
                className="w-11 h-11 rounded-full inline-flex items-center justify-center border border-white/30"><ArrowRight className={`w-4 h-4 ${d < 0 ? 'rotate-180' : ''}`} /></button>
            ))}
          </div>
        </div>
      )}
    </Wrap>
  );
}

// ── Map: same OSM tiles in grey (modern-map), offices as floating tabs over the map; a tab (or pin) flies there.
const pinIcon = (active) => L.divIcon({ className: 'mm-pin-wrap', html: `<span class="mm-pin${active ? ' is-active' : ''}"><b></b></span>`, iconSize: [30, 30], iconAnchor: [15, 15] });
function Fly({ pts, sel }) {
  const map = useMap();
  const key = pts.map(p => `${p.lat},${p.lng}`).join('|');
  useEffect(() => {
    if (pts.length > 1) map.fitBounds(L.latLngBounds(pts.map(p => [p.lat, p.lng])), { padding: [60, 60], maxZoom: 5, animate: false });
    else if (pts[0]) map.setView([pts[0].lat, pts[0].lng], 5, { animate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    if (sel != null && pts[sel]) map.flyTo([pts[sel].lat, pts[sel].lng], 5, { duration: 1.4 });
    else if (sel == null && pts.length > 1) map.flyToBounds(L.latLngBounds(pts.map(p => [p.lat, p.lng])), { padding: [60, 60], maxZoom: 5, duration: 1.2 });
  }, [sel]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
export function GemMapTabs({ tabs, cmsConfig = {}, mapsLang }) {
  const tt = useT();
  const pts = ((tabs || []).find(t => (t.locations || []).some(l => l.lat && l.lng))?.locations || []).filter(l => l.lat && l.lng);
  const [sel, setSel] = useState(null);
  if (!pts.length) return null;
  return (
    <Wrap testid="gem2i-locations" id="locations">
      <GemHeading eyebrow={cmsConfig.eyebrow} title={cmsConfig.title || { en: 'Where GEM2i plays', es: 'Dónde suena GEM2i' }} subtitle={cmsConfig.subtitle} />
      <div className="relative mt-11">
        <div className="modern-map relative isolate overflow-hidden rounded-3xl h-[420px] md:h-[540px]">
          <MapContainer center={[pts[0].lat, pts[0].lng]} zoom={3} scrollWheelZoom={false} zoomControl={false} style={{ height: '100%', width: '100%' }}>
            <ZoomControl position="topright" />
            <TileLayer url={getTileUrl(mapsLang || 'local')} attribution={getTileAttribution(mapsLang || 'local')} />
            <Fly pts={pts} sel={sel} />
            {pts.map((p, i) => <Marker key={p.id || i} position={[p.lat, p.lng]} icon={pinIcon(i === sel)} eventHandlers={{ click: () => setSel(i) }} />)}
          </MapContainer>
        </div>
        <div className="absolute left-4 right-4 bottom-4 md:left-5 md:right-5 md:bottom-5 z-[500] flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist">
          {pts.length > 1 && (
            <button type="button" role="tab" aria-selected={sel == null} onClick={() => setSel(null)}
              className="shrink-0 rounded-2xl px-[18px] py-3.5 backdrop-blur-md shadow-[0_10px_30px_-14px_rgba(0,0,0,.35)] text-[15px] font-bold transition-colors duration-300"
              style={sel == null ? { backgroundColor: '#16191D', color: '#fff' } : { backgroundColor: 'rgba(255,255,255,.92)', color: '#16191D' }}>
              🌐 {tt({ en: 'All', es: 'Todas' })}
            </button>
          )}
          {pts.map((p, i) => {
            const on = i === sel;
            return (
              <button key={p.id || i} type="button" role="tab" aria-selected={on} onClick={() => setSel(i)}
                className={`shrink-0 text-left rounded-2xl px-[18px] py-3.5 backdrop-blur-md shadow-[0_10px_30px_-14px_rgba(0,0,0,.35)] transition-[background-color,color,transform] duration-300 ${EASE} ${on ? '-translate-y-1' : ''}`}
                style={on ? { backgroundColor: '#16191D', color: '#fff' } : { backgroundColor: 'rgba(255,255,255,.92)', color: '#16191D' }}>
                <b className="block text-[15px]">{tt(p.title) || tt(p.name)}</b>
                {tt(p.description) && <span className="text-[12.5px]" style={{ color: on ? '#AAB1B8' : '#5B636C' }}>{plainText(tt(p.description)).split(' · ')[0]}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </Wrap>
  );
}

// ── Partners: hairline logo wall; grey logos colour up on hover.
export function GemLogoWall({ config = {}, items = [], testid = 'gem2i-partners' }) {
  const tt = useT();
  const list = items.filter(logoOf);
  if (!list.length) return null;
  return (
    <Wrap testid={testid}>
      <GemHeading eyebrow={config.eyebrow} title={config.title || { en: 'Brands that party with us', es: 'Marcas que salen con nosotros' }} subtitle={config.subtitle} />
      <div className="mt-11 grid grid-cols-3 md:grid-cols-5 border-t border-l" style={{ borderColor: BORDER }}>
        {list.map((l, i) => {
          const img = <img src={logoOf(l)} alt={tt(l.name) || ''} loading="lazy" className={`max-w-[70%] max-h-14 object-contain grayscale opacity-60 transition-[filter,opacity,transform] duration-300 ${EASE} group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-[1.08]`} />;
          const cls = 'group aspect-[3/2] grid place-items-center p-6 border-r border-b transition-colors duration-300 hover:bg-[color:var(--color-card-bg)]';
          return l.link_url
            ? <a key={l.id || i} href={l.link_url} target={l.link_target || '_blank'} rel="noopener noreferrer" className={cls} style={{ borderColor: BORDER }}>{img}</a>
            : <div key={l.id || i} className={cls} style={{ borderColor: BORDER }}>{img}</div>;
        })}
      </div>
    </Wrap>
  );
}

// ── Clients: a list of cases that unfold (logo · name · line), CTA top-right.
export function GemClientCases({ kicker, title, text, logos = [], ctaText, ctaUrl, ctaNewTab }) {
  const tt = useT();
  const [open, setOpen] = useState(-1);
  if (!logos.length) return null;
  return (
    <Wrap testid="gem2i-clients">
      <GemHeading eyebrow={kicker || { en: 'Clients', es: 'Clientes' }} title={title || { en: 'Brands that trust us', es: 'Marcas que confían en nosotros' }} subtitle={text}
        action={ctaText ? <GemCta text={ctaText} url={ctaUrl || '/#contact'} newTab={ctaNewTab} /> : null} />
      <div className="mt-11 border-t" style={{ borderColor: BORDER }}>
        {logos.map((l, i) => {
          const on = open === i;
          return (
            <div key={l.id || i} className="border-b" style={{ borderColor: BORDER }}>
              <button type="button" onClick={() => setOpen(on ? -1 : i)} aria-expanded={on}
                className="w-full grid grid-cols-[48px_1fr_32px] md:grid-cols-[64px_1fr_auto_40px] gap-5 items-center py-5 text-left">
                <span className="w-12 h-12 md:w-16 md:h-16 rounded-2xl p-2 grid place-items-center" style={{ backgroundColor: CARD }}>
                  {logoOf(l) && <img src={logoOf(l)} alt="" loading="lazy" className="max-w-full max-h-full object-contain" />}
                </span>
                <b className="text-white text-lg md:text-xl tracking-[-0.015em]">{tt(l.name)}</b>
                {tt(l.description) && <span className="hidden md:block text-[13.5px]" style={{ color: BODY }}>{plainText(tt(l.description))}</span>}
                <span aria-hidden="true" className={`text-white text-2xl transition-transform duration-500 ${EASE} ${on ? 'rotate-45' : ''}`}>+</span>
              </button>
              <div className={`grid transition-[grid-template-rows] duration-500 ${EASE} ${on ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                  <p className="mb-6 md:ml-[84px] max-w-[60ch] leading-[1.7]" style={{ color: BODY }}>
                    {plainText(tt(l.description))}
                    {l.url && <> · <a href={l.url} target="_blank" rel="noopener noreferrer" className="font-bold text-white underline underline-offset-4">{tt({ en: 'Visit', es: 'Visitar' })}</a></>}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Wrap>
  );
}

// ── Contact: the e-mail big (tap to copy) + a three-step form; CMS → Contact Section copy.
export function GemContactEditorial({ settings = {} }) {
  const tt = useT();
  const cs = settings.contact_settings || {};
  const [info, setInfo] = useState(null);
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ need: '', message: '', email: '', name: '' });
  const [captchaToken, setCaptchaToken] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => { publicAPI.getGemContent().then(r => setInfo(r.data?.contact_info || null)).catch(() => {}); }, []);
  const email = info?.email;
  const copy = () => { try { navigator.clipboard.writeText(email); } catch { /* clipboard blocked */ } setCopied(true); setTimeout(() => setCopied(false), 1800); };
  const steps = [
    { k: 'need', label: { en: 'What do you need?', es: '¿Qué necesitas?' }, ph: { en: 'Promote an event, book an artist…', es: 'Promocionar un evento, contratar un artista…' } },
    { k: 'message', label: { en: 'Tell us a bit more', es: 'Cuéntanos un poco más' }, ph: { en: 'Dates, city, audience…', es: 'Fechas, ciudad, público…' }, area: true },
    { k: 'email', label: { en: 'Where can we reach you?', es: '¿Dónde te escribimos?' }, ph: { en: 'Your e-mail', es: 'Tu correo' } },
  ];
  const s = steps[step];
  const submit = async () => {
    setSending(true);
    try {
      await contactAPI.submit({ name: form.name || form.email, email: form.email, message: `${form.need}\n\n${form.message}`.trim(), captcha_token: captchaToken, subject: 'gem2i contact section' });
      setDone(true);
    } catch (err) {
      toast.error(err?.response?.data?.detail || tt({ en: 'Could not send the message.', es: 'No se pudo enviar el mensaje.' }));
    } finally { setSending(false); }
  };
  const next = (e) => {
    e.preventDefault();
    if (!String(form[s.k] || '').trim()) return;
    if (step < steps.length - 1) setStep(step + 1); else submit();
  };
  const field = 'w-full bg-transparent border-0 border-b-2 border-current py-2.5 text-xl text-white outline-none placeholder:opacity-40';
  return (
    <Wrap testid="gem2i-contact" id="contact">
      <style>{'@keyframes gemSwap{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}'}</style>
      <GemHeading eyebrow={cs.title || { en: 'Contact us', es: 'Contáctanos' }} title={cs.subtitle || { en: 'Write to us', es: 'Escríbenos' }} />
      {email && (
        <p className="mt-6">
          <button type="button" onClick={copy} className="group relative text-white font-extrabold leading-none tracking-[-0.05em] text-left" style={{ fontSize: 'clamp(2.2rem, 7vw, 6rem)' }} aria-label={tt({ en: 'Copy e-mail', es: 'Copiar correo' })}>
            {email}
            <span aria-hidden="true" className={`absolute left-0 -bottom-1.5 h-1 w-0 transition-[width] duration-700 ${EASE} group-hover:w-full`} style={{ backgroundColor: ACCENT }} />
          </button>
          <span className={`ml-3.5 align-middle text-sm font-bold transition-opacity ${copied ? 'opacity-100' : 'opacity-0'}`} style={{ color: ACCENT }} aria-live="polite">{tt({ en: 'Copied ✓', es: 'Copiado ✓' })}</span>
        </p>
      )}
      <div className="mt-11 grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-14">
        <div className="text-[17px] leading-[1.7]" style={{ color: BODY }}>
          {tt({ en: 'Or tell us in three quick steps — our team gets back to you within a day.', es: 'O cuéntanos en tres pasos: nuestro equipo te responde en un día.' })}
          {info?.phone && <p className="mt-5 text-white font-bold">{info.phone}</p>}
        </div>
        <form onSubmit={next} className="rounded-3xl p-7" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }} data-testid="gem2i-contact-form">
          {done ? (
            <p className="m-0 text-white text-2xl font-extrabold animate-[gemSwap_.5s_both]">{tt({ en: "Thanks — we'll be in touch ✓", es: 'Gracias, te escribiremos pronto ✓' })}</p>
          ) : (
            <>
              <div className="flex gap-1.5 mb-6" aria-hidden="true">{steps.map((_, k) => <i key={k} className="flex-1 h-1 rounded" style={{ backgroundColor: k <= step ? 'var(--color-heading, #16191D)' : BORDER }} />)}</div>
              <div key={step} className="animate-[gemSwap_.5s_cubic-bezier(.2,.8,.2,1)_both] motion-reduce:animate-none">
                <label htmlFor={`gem-c-${s.k}`} className="block text-white text-[22px] font-extrabold tracking-[-0.02em] mb-3.5">{tt(s.label)}</label>
                {s.area
                  ? <textarea id={`gem-c-${s.k}`} rows={3} value={form[s.k]} onChange={e => setForm(f => ({ ...f, [s.k]: e.target.value }))} placeholder={tt(s.ph)} className={`${field} resize-none`} required autoFocus />
                  : <input id={`gem-c-${s.k}`} type={s.k === 'email' ? 'email' : 'text'} value={form[s.k]} onChange={e => setForm(f => ({ ...f, [s.k]: e.target.value }))} placeholder={tt(s.ph)} className={field} required autoFocus={step > 0} />}
                {step === steps.length - 1 && <div className="pt-5"><CaptchaWidget onChange={setCaptchaToken} testId="gem2i-contact-captcha" /></div>}
              </div>
              <div className="flex justify-between mt-6">
                <button type="button" onClick={() => setStep(Math.max(0, step - 1))} disabled={!step} className="w-11 h-11 rounded-full text-white disabled:opacity-30" style={{ border: `1px solid ${BORDER}` }} aria-label={tt({ en: 'Back', es: 'Atrás' })}>←</button>
                <button type="submit" disabled={sending} className="gem-press inline-flex items-center gap-2 rounded-full px-6 py-3 text-[15px] font-bold text-white disabled:opacity-50" style={{ backgroundColor: ACCENT, boxShadow: '0 0 0 1px rgba(255,255,255,.28)' }} data-testid="gem2i-contact-submit">
                  {sending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {step < steps.length - 1 ? tt({ en: 'Next', es: 'Siguiente' }) : (tt(cs.submit_text) || tt({ en: 'Send', es: 'Enviar' }))} {!sending && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </Wrap>
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

// ── Team · T5: grouped by region (from each person's country); the region name goes big on the left
// and that region's cards fade in.
export function GemTeamRegions({ config = {}, items = [] }) {
  const tt = useT();
  const { lang } = useLang() || { lang: 'en' };
  const [region, setRegion] = useState('All');
  const people = items.slice(0, parseInt(config.max_visible, 10) || items.length).map(m => ({ ...m, ...placeOf(tt(m.role)) }));
  if (!people.length) return null;
  const regions = ['All', ...Array.from(new Set(people.map(p => p.region)))];
  const shown = people.filter(p => region === 'All' || p.region === region);
  const label = (r) => (r === 'All' ? tt({ en: 'All', es: 'Todos' }) : (lang === 'es' ? REGION_ES[r] || r : r));
  return (
    <Wrap testid="gem2i-team">
      <style>{'@keyframes gemSwap{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}'}</style>
      <GemHeading eyebrow={config.eyebrow} title={config.title} subtitle={config.subtitle} />
      <div className="mt-9 flex flex-wrap gap-2" role="tablist">
        {regions.map(r => (
          <button key={r} type="button" role="tab" aria-selected={r === region} onClick={() => setRegion(r)}
            className="rounded-full px-[18px] py-2.5 text-sm font-bold transition-colors duration-200"
            style={r === region ? { backgroundColor: 'var(--color-heading, #16191D)', color: 'var(--color-page-bg, #fff)', border: '1px solid transparent' } : { border: `1px solid ${BORDER}`, color: 'var(--color-heading, #16191D)' }}>
            {label(r)}<i className="not-italic ml-1.5 opacity-50">{r === 'All' ? people.length : people.filter(p => p.region === r).length}</i>
          </button>
        ))}
      </div>
      <div className="mt-9 grid gap-6 lg:grid-cols-[auto_1fr] lg:gap-12 items-start">
        <p key={region} className="m-0 text-white font-extrabold leading-[.92] tracking-[-0.05em] max-w-[7ch] animate-[gemSwap_.5s_both] motion-reduce:animate-none" style={{ fontSize: 'clamp(3rem, 7vw, 6rem)' }}>
          <small className="block mb-3 text-[13px] font-bold tracking-[0.2em] uppercase" style={{ color: ACCENT }}>{region === 'All' ? tt({ en: 'Worldwide', es: 'Mundial' }) : tt({ en: 'Region', es: 'Región' })}</small>
          {region === 'All' ? tt({ en: 'Every market', es: 'Todos los mercados' }) : label(region)}
        </p>
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
          {shown.map((m, i) => (
            <article key={`${region}-${m.id || i}`} className="rounded-[22px] p-6 animate-[gemSwap_.55s_cubic-bezier(.2,.8,.2,1)_both] motion-reduce:animate-none" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}`, animationDelay: `${i * 60}ms` }}>
              <span className="w-[72px] h-[72px] rounded-full overflow-hidden inline-flex items-center justify-center text-[22px] font-extrabold" style={{ background: 'linear-gradient(135deg, #1d3a52, #0f1d2a)', color: 'var(--color-link, #5FB2E0)' }}>
                {m.photo_url ? <img src={gemImg(m.photo_url)} alt="" loading="lazy" className="w-full h-full object-cover" /> : initialsOf(tt(m.name))}
              </span>
              <b className="block mt-4 text-white text-lg">{tt(m.name)}</b>
              <span className="text-[13px] font-bold" style={{ color: ACCENT }}>{tt(m.role)}</span>
              {tt(m.bio) && <p className="mt-2.5 text-[14.5px] leading-[1.6]" style={{ color: BODY }}>{plainText(tt(m.bio))}</p>}
            </article>
          ))}
        </div>
      </div>
    </Wrap>
  );
}
