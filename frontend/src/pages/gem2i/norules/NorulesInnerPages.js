/* Norules (`gem2i`) — own copy of this inner page (template = package, D-GEM-2026-15). */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, MapPin, Map as MapIcon, Camera, Lock, X } from 'lucide-react';
import { publicAPI } from '../../../lib/api';
import { useT } from '../../../lib/i18n';
import { useAuth } from '../../../lib/auth';
import { normalizeRichText } from '../../../lib/richText';
import { gemImg } from '../../../components/gem2i/GemCatalogBits';
import { slugify } from '../../../components/gem2i/norules/NorulesDetailBits';
import { NBtn, NBtnLook } from '../../../components/gem2i/norules/NBtn';
import { PageHero, PageHead, usePageTone, CARD_CSS, LINK, BODY, CARD, LINE } from '../../../components/gem2i/norules/GemCatalogCards';

/**
 * gem2i inner pages ported from the legacy PHP site (2026-10-19):
 *   /travels  ← travels.php  (members only; alternating photo/text rows, each
 *                             photo switches to its Google map)
 *   /services ← services.php (8 service cards with icon + photo viewer, then the
 *                             dark "Our works" carousel)
 *   /partners ← partners.php (members only; header + partner logos, "Coming soon"
 *                             when there are none)
 * The legacy content was hardcoded; here it is CMS-editable (Section Manager →
 * Travels page / Services page / Our Works / Partners page). Same hero, head
 * and card language as the catalog pages.
 */
const GEM_FONT = "'Manrope', sans-serif";
const SERIF = "'Playfair Display', Georgia, serif";

export function useSection(key) {
  const [data, setData] = useState(null);
  useEffect(() => {
    let alive = true;
    publicAPI.getSectionContent(key).then(r => { if (alive) setData(r.data || {}); }).catch(() => { if (alive) setData({}); });
    return () => { alive = false; };
  }, [key]);
  return data;
}

const Rich = ({ html, className = '' }) => (
  <div className={`text-base md:text-[17px] leading-[1.8] [&_p]:mb-4 ${className}`} style={{ color: BODY }}
    dangerouslySetInnerHTML={{ __html: normalizeRichText(html || '') }} />
);

function Shell({ page, testid, children }) {
  const tone = usePageTone();
  return (
    <div className={`min-h-screen pb-24 ${tone.className}`} style={{ backgroundColor: 'var(--color-page-bg, #04080C)', fontFamily: GEM_FONT, ...tone.style }} data-testid={testid}>
      <PageHero page={page} />
      {children}
      <style>{CARD_CSS}</style>
    </div>
  );
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

// ── /travels ────────────────────────────────────────────────────────────────
/** T0 (boceto norules-travels-page.html): the legacy alternating photo/text rows as rounded cards.
 *  Optional trip facts (CMS → Travels page items): status, nights, price_from, spots_total,
 *  spots_taken, includes (list) — each shows only when filled. */
/** /travels/:slug — the CMS slug, else the title slugified (English title, so links match in both languages). */
export const tripSlug = (item) => slugify(item.slug || item.title?.en || item.title);

const STATUS = {
  open: { en: 'Open', es: 'Abierto' }, last: { en: 'Last spots', es: 'Últimas plazas' },
  soon: { en: 'Coming soon', es: 'Próximamente' }, sold_out: { en: 'Sold out', es: 'Agotado' },
};

function TravelRow({ item, flip, index }) {
  const tt = useT();
  const [map, setMap] = useState(false);
  const img = gemImg(item.image);
  const hasMap = !!item.map_url;
  const status = STATUS[item.status];
  const spots = item.spots_total ? `${Number(item.spots_taken) || 0} / ${item.spots_total}` : '';
  const facts = [
    item.nights && [tt({ en: 'Nights', es: 'Noches' }), item.nights],
    tt(item.price_from) && [tt({ en: 'From', es: 'Desde' }), tt(item.price_from)],
    spots && [tt({ en: 'Spots', es: 'Plazas' }), spots],
  ].filter(Boolean);
  const includes = String(tt(item.includes) || '').split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  return (
    <article className="group grid lg:grid-cols-[5fr_6fr] rounded-[28px] overflow-hidden" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }} data-testid="travel-row">
      <div className={`gem-tone-dark relative min-h-[300px] lg:min-h-[460px] overflow-hidden isolate ${flip ? 'lg:order-2' : ''}`} style={{ backgroundColor: '#0E1216' }}>
        {img && <img src={img} alt="" loading="lazy" className={`absolute inset-0 w-full h-full object-cover transition-[opacity,transform] duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transition-none ${map ? 'opacity-0' : 'opacity-100'}`} />}
        {hasMap && map && <iframe src={item.map_url} title={`${tt(item.title)} map`} className="absolute inset-0 w-full h-full border-0" loading="lazy" allowFullScreen />}
        {status && !map && (
          <span className="absolute left-4 top-4 z-[2] rounded-full px-3 py-1.5 text-[11px] font-extrabold tracking-[0.14em] uppercase"
            style={{ backgroundColor: item.status === 'last' ? '#FFD34D' : '#fff', color: '#0E1216' }}>{tt(status)}</span>
        )}
        {!map && <span aria-hidden="true" className="absolute right-4 bottom-1 z-[2] font-extrabold leading-[.8] tracking-[-0.06em]" style={{ fontSize: 120, color: 'transparent', WebkitTextStroke: '1.5px rgba(255,255,255,.7)' }}>{String(index + 1).padStart(2, '0')}</span>}
      </div>
      <div className="px-6 md:px-12 py-10 lg:py-12 flex flex-col justify-center">
        {tt(item.dates) && <p className="inline-flex items-center gap-2 text-[14px] font-semibold" style={{ color: LINK }}><CalendarDays className="w-4 h-4" aria-hidden="true" />{tt(item.dates)}</p>}
        <h2 className="mt-3 text-white font-bold leading-[1.04]" style={{ fontFamily: SERIF, fontSize: 'clamp(2rem, 3.4vw, 2.9rem)' }}>{tt(item.title)}</h2>
        <Rich html={tt(item.description)} className="mt-4" />
        {facts.length > 0 && (
          <dl className="mt-1 mb-5 py-3.5 flex flex-wrap gap-x-8 gap-y-2 border-y" style={{ borderColor: LINE }}>
            {facts.map(([k, v]) => (
              <div key={k}><dt className="text-[10.5px] font-extrabold tracking-[0.16em] uppercase" style={{ color: BODY }}>{k}</dt><dd className="m-0 text-white text-[17px] font-bold">{v}</dd></div>
            ))}
          </dl>
        )}
        {includes.length > 0 && (
          <div className="mb-5 flex flex-wrap gap-1.5">
            {includes.map(x => <span key={x} className="rounded-full px-2.5 py-1 text-[12.5px] font-semibold text-white" style={{ border: `1px solid ${LINE}` }}>{x}</span>)}
          </div>
        )}
        {tt(item.address) && <p className="inline-flex items-start gap-2 text-[15px]" style={{ color: BODY }}><MapPin className="w-4 h-4 mt-1 shrink-0" style={{ color: LINK }} aria-hidden="true" />{tt(item.address)}</p>}
        <div className="mt-6 flex flex-wrap gap-3">
          <NBtn to={`/travels/${tripSlug(item)}`} data-testid="view-trip">{tt({ en: 'View trip', es: 'Ver viaje' })}</NBtn>
          {tt(item.cta_text) && item.cta_url && <NBtn href={item.cta_url} variant="a">{tt(item.cta_text)}</NBtn>}
          {hasMap && (
            <NBtn onClick={() => setMap(m => !m)} aria-pressed={map} variant="s" icon={map ? <Camera /> : <MapIcon />}>
              {map ? tt({ en: 'View photo', es: 'Ver foto' }) : tt({ en: 'View map', es: 'Ver mapa' })}
            </NBtn>
          )}
        </div>
      </div>
    </article>
  );
}

export function NorulesTravels() {
  const tt = useT();
  const s = useSection('gem_travels');
  const cfg = s?.config || {};
  const items = (s?.items || []).filter(i => i.visible !== false);
  return (
    <Shell page="travels" testid="gem2i-travels">
      <PageHead eyebrow={tt(cfg.eyebrow) || tt({ en: 'Travels', es: 'Viajes' })} title={tt(cfg.title) || tt({ en: 'Travel with GEM2i', es: 'Viaja con GEM2i' })}>
        {tt(cfg.subtitle) && <p className="mt-4 max-w-3xl text-base md:text-[17px] leading-[1.7]" style={{ color: BODY }}>{tt(cfg.subtitle)}</p>}
      </PageHead>
      {s && (
        <MembersGate on={cfg.members_only !== false}>
          {items.length === 0
            ? <p className="max-w-7xl mx-auto px-6 md:px-10 mt-12 text-[17px]" style={{ color: BODY }}>{tt({ en: 'New trips coming soon.', es: 'Pronto nuevos viajes.' })}</p>
            : <div className="max-w-7xl mx-auto px-6 md:px-10 mt-12 grid gap-6">{items.map((it, i) => <TravelRow key={it.id || i} item={it} index={i} flip={i % 2 === 1} />)}</div>}
        </MembersGate>
      )}
    </Shell>
  );
}

// ── /services ───────────────────────────────────────────────────────────────
// S1 (boceto norules-yellow-pages.html): the legacy grid — grey photo under a veil + white icon; on hover the
// night veil wipes in left→right, the icon rises and "View" appears. Click → side panel with photo,
// description and "Talk to us". "Our works" below as a grid with the catalog hover (no horizontal scroll).
const SERVICES_CSS = `
.svc .gph{filter:grayscale(1)}
.svc .svc-veil{position:absolute;inset:0;z-index:1;background:rgba(40,46,54,.62)}
.svc::before{background:#0E1216!important;z-index:1}
.svc .svc-ic{transition:transform .8s cubic-bezier(.19,1,.22,1)}
.svc:hover .svc-ic,.svc:focus-visible .svc-ic{transform:translateY(-10px) scale(.9)}
.svc .svc-view{opacity:0;transform:translateY(10px);transition:opacity .4s,transform .8s cubic-bezier(.19,1,.22,1)}
.svc:hover .svc-view,.svc:focus-visible .svc-view{opacity:1;transform:none}
@keyframes svcIn{from{transform:translateX(100%)}}
@media (hover:none){.svc .svc-view{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.svc .svc-ic,.svc .svc-view{transition:none}}
`;

function ServicePanel({ item, onClose }) {
  const tt = useT();
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label={tt(item.title)}>
      <button type="button" className="absolute inset-0 bg-black/60" onClick={onClose} aria-label={tt({ en: 'Close', es: 'Cerrar' })} />
      <aside className="gem-tone-dark absolute right-0 top-0 bottom-0 w-full max-w-[520px] overflow-auto" style={{ backgroundColor: '#0E1216', animation: 'svcIn .5s cubic-bezier(.19,1,.22,1)' }}>
        <button type="button" onClick={onClose} aria-label={tt({ en: 'Close', es: 'Cerrar' })} className="absolute right-3 top-3 z-10 w-10 h-10 rounded-full bg-black/60 text-white inline-flex items-center justify-center hover:bg-black/80"><X className="w-5 h-5" /></button>
        {gemImg(item.image) && <img src={gemImg(item.image)} alt="" className="w-full aspect-[16/10] object-cover" />}
        <div className="p-7">
          {gemImg(item.icon_image) && <img src={gemImg(item.icon_image)} alt="" className="w-12 h-12 object-contain" style={{ filter: 'brightness(0) invert(1)' }} />}
          <h3 className="mt-3 mb-3 text-white font-bold text-[30px] leading-tight" style={{ fontFamily: SERIF }}>{tt(item.title)}</h3>
          {tt(item.description) && <Rich html={tt(item.description)} />}
          <div className="mt-5 flex flex-wrap gap-2.5">
            <NBtn to="/#contact" onClick={onClose} variant="w">{tt({ en: 'Talk to us', es: 'Hablemos' })}</NBtn>
            {item.url && <NBtn to={item.url} onClick={onClose} variant="g">{tt({ en: 'Learn more', es: 'Ver más' })}</NBtn>}
          </div>
        </div>
      </aside>
    </div>
  );
}

export function NorulesServices() {
  const tt = useT();
  const s = useSection('gem_services_page');
  const w = useSection('gem_works');
  const [open, setOpen] = useState(null);
  const cfg = s?.config || {};
  const items = (s?.items || []).filter(i => i.visible !== false);
  const wc = w?.config || {};
  const works = (w?.items || []).filter(i => i.visible !== false).slice(0, 8);
  return (
    <Shell page="services" testid="gem2i-services">
      <PageHead eyebrow={tt(cfg.eyebrow) || tt({ en: 'What we do', es: 'Qué hacemos' })} title={tt(cfg.title) || tt({ en: 'Our services', es: 'Nuestros servicios' })}>
        {tt(cfg.subtitle) && <p className="mt-4 max-w-3xl text-base md:text-[17px] leading-[1.7]" style={{ color: BODY }}>{tt(cfg.subtitle)}</p>}
      </PageHead>
      <div className="max-w-7xl mx-auto px-6 md:px-10 mt-12 grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="services-grid">
        {items.map((it, i) => (
          <button key={it.id || i} type="button" onClick={() => setOpen(it)} className="gcard svc gem-tone-dark aspect-square text-center" aria-label={tt(it.title)}>
            {gemImg(it.image) && <img src={gemImg(it.image)} alt="" loading="lazy" className="gph" />}
            <span className="svc-veil" aria-hidden="true" />
            <span className="absolute inset-0 z-[2] flex flex-col items-center justify-center gap-4 p-5">
              {gemImg(it.icon_image) && <img src={gemImg(it.icon_image)} alt="" className="svc-ic w-16 h-16 md:w-[72px] md:h-[72px] object-contain" style={{ filter: 'brightness(0) invert(1)' }} />}
              <span className="text-white font-bold text-[15px] md:text-[17px] leading-snug max-w-[22ch]">{tt(it.title)}</span>
              <span className="svc-view text-white text-[13.5px] font-bold">{tt({ en: 'View', es: 'Ver' })} →</span>
            </span>
          </button>
        ))}
      </div>

      {works.length > 0 && (
        <section className="gem-tone-dark mt-20 py-16 md:py-20" style={{ backgroundColor: '#0E1216' }} data-testid="services-works">
          <div className="max-w-7xl mx-auto px-6 md:px-10">
            <p className="gem-eyebrow mb-3" style={{ color: '#9AA6B2' }}>{tt(wc.eyebrow) || tt({ en: 'Portfolio', es: 'Portafolio' })}</p>
            <h2 className="text-white font-bold leading-[1.06]" style={{ fontFamily: SERIF, fontSize: 'clamp(2rem, 3.6vw, 3rem)' }}>{tt(wc.title) || tt({ en: 'Our works', es: 'Nuestros trabajos' })}</h2>
            {tt(wc.subtitle) && <p className="mt-4 max-w-3xl text-base md:text-[17px] leading-[1.7]" style={{ color: '#9AA6B2' }}>{tt(wc.subtitle)}</p>}
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {works.map((it, i) => (
                <Link key={it.id || i} to="/works" className="gcard aspect-[4/3]">
                  {gemImg(it.image) && <img src={gemImg(it.image)} alt="" loading="lazy" className="gph" />}
                  <span className="gstrip absolute inset-x-0 bottom-0 z-[2] px-4 py-3.5 font-semibold text-white" style={{ background: 'linear-gradient(180deg,transparent,rgba(4,8,12,.85))' }}>{tt(it.title)}</span>
                  <span className="ginfo absolute inset-x-0 bottom-0 z-[2] flex flex-col px-5 pb-5 pt-5">
                    <span className="text-white text-[20px] font-semibold leading-tight">{tt(it.title)}</span>
                    <NBtnLook className="mt-3 self-start">{tt({ en: 'View project', es: 'Ver proyecto' })}</NBtnLook>
                  </span>
                </Link>
              ))}
            </div>
            <div className="mt-8 text-center">
              <NBtn to={wc.cta_url || '/works'} variant="g">{tt(wc.cta_text) || tt({ en: 'View all works', es: 'Ver todos los trabajos' })}</NBtn>
            </div>
          </div>
        </section>
      )}
      {open && <ServicePanel item={open} onClose={() => setOpen(null)} />}
      <style>{SERVICES_CSS}</style>
    </Shell>
  );
}

// ── /partners ───────────────────────────────────────────────────────────────
// P1 (boceto norules-yellow-pages.html): hairline logo wall — logos grey at rest; on hover the night veil
// wipes in left→right, the logo turns to colour and rises, the name + site appear. Last cell = your brand.
const PARTNERS_CSS = `
.pwall{border-top:1px solid ${LINE};border-left:1px solid ${LINE}}
.pcell{position:relative;isolation:isolate;border-right:1px solid ${LINE};border-bottom:1px solid ${LINE};overflow:hidden;transition:color .4s}
.pcell::before{content:'';position:absolute;inset:0;z-index:-1;background:#0E1216;transform:scaleX(0);transform-origin:right center;transition:transform 1s cubic-bezier(.19,1,.22,1)}
.pcell:hover::before,.pcell:focus-visible::before{transform:scaleX(1);transform-origin:left center}
.pcell:hover,.pcell:focus-visible{color:#fff!important}
.pcell img{filter:var(--plogo, grayscale(1));opacity:.6;transition:filter .4s,opacity .4s,transform .8s cubic-bezier(.19,1,.22,1)}
.gem-tone-light .pcell img{--plogo:brightness(0)}
.pcell:hover img,.pcell:focus-visible img{filter:none;opacity:1;transform:translateY(-12px)}
.pcell .pname{opacity:0;transform:translateY(10px);transition:opacity .4s,transform .8s cubic-bezier(.19,1,.22,1)}
.pcell:hover .pname,.pcell:focus-visible .pname{opacity:1;transform:none}
@media (hover:none){.pcell .pname{opacity:1;transform:none}.pcell img{opacity:.9}}
@media (prefers-reduced-motion:reduce){.pcell::before,.pcell img,.pcell .pname{transition:none}}
`;
const siteHost = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };

export function NorulesPartners() {
  const tt = useT();
  const s = useSection('gem_partners_page');
  const logos = useSection('aurex_partners');
  const cfg = s?.config || {};
  const items = (logos?.items || []).filter(i => i.visible !== false && (i.logo_url || i.image));
  return (
    <Shell page="partners" testid="gem2i-partners-page">
      <PageHead eyebrow={tt(cfg.eyebrow) || tt({ en: 'Global', es: 'Global' })} title={tt(cfg.title) || tt({ en: 'Partners', es: 'Partners' })}>
        {tt(cfg.subtitle) && <p className="mt-4 max-w-3xl text-base md:text-[17px] leading-[1.7]" style={{ color: BODY }}>{tt(cfg.subtitle)}</p>}
      </PageHead>
      {s && (
        <MembersGate on={cfg.members_only !== false}>
          {items.length === 0 ? (
            <p className="max-w-7xl mx-auto px-6 md:px-10 mt-12 text-[17px]" style={{ color: BODY }}>{tt(cfg.empty_text) || tt({ en: 'Coming soon…', es: 'Próximamente…' })}</p>
          ) : (
            <div className="max-w-7xl mx-auto px-6 md:px-10 mt-12">
              <div className="pwall grid grid-cols-2 lg:grid-cols-4" data-testid="partners-grid">
                {items.map((l, i) => {
                  const inner = (
                    <>
                      <img src={gemImg(l.logo_url || l.image)} alt={tt(l.name) || ''} loading="lazy" className="max-w-[56%] max-h-[44%] object-contain" />
                      {tt(l.name) && (
                        <span className="pname absolute inset-x-0 bottom-4 text-center text-white text-[13.5px] font-bold">
                          {tt(l.name)}{l.link_url && <small className="block font-semibold opacity-65 text-[12px]">{siteHost(l.link_url)} ↗</small>}
                        </span>
                      )}
                    </>
                  );
                  const cls = 'pcell aspect-[4/3] flex items-center justify-center';
                  return l.link_url
                    ? <a key={l.id || i} href={l.link_url} target={l.link_target || '_blank'} rel="noopener noreferrer" className={cls} aria-label={tt(l.name)}>{inner}</a>
                    : <div key={l.id || i} className={cls}>{inner}</div>;
                })}
                <Link to="/#contact" className="pcell aspect-[4/3] flex items-center justify-center text-center font-extrabold" style={{ color: 'var(--gem-ink, #fff)' }}>
                  + {tt({ en: 'Your brand', es: 'Tu marca' })}
                </Link>
              </div>
            </div>
          )}
        </MembersGate>
      )}
      <style>{PARTNERS_CSS}</style>
    </Shell>
  );
}
