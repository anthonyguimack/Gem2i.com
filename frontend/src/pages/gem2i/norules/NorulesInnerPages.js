/* Norules (`gem2i`) — own copy of this inner page (template = package, D-GEM-2026-15). */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, MapPin, Map as MapIcon, Camera, Lock, X } from 'lucide-react';
import { publicAPI } from '../../../lib/api';
import { useT } from '../../../lib/i18n';
import { useAuth } from '../../../lib/auth';
import { normalizeRichText } from '../../../lib/richText';
import { gemImg } from '../../../components/gem2i/GemCatalogBits';
import { PageHero, PageHead, usePageTone, CARD_CSS, ACCENT, LINK, BODY, CARD, LINE } from '../../../components/gem2i/norules/GemCatalogCards';

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

function useSection(key) {
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
function MembersGate({ on, children }) {
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
        <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('gem2i:open-login'))}
          className="mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-[15px] font-semibold text-white transition-opacity hover:opacity-90" style={{ backgroundColor: ACCENT }}>
          {tt({ en: 'Log in', es: 'Iniciar sesión' })} <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// ── /travels ────────────────────────────────────────────────────────────────
/** T0 (boceto norules-travels-page.html): the legacy alternating photo/text rows as rounded cards.
 *  Optional trip facts (CMS → Travels page items): status, nights, price_from, spots_total,
 *  spots_taken, includes (list) — each shows only when filled. */
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
      <div className={`relative min-h-[300px] lg:min-h-[460px] overflow-hidden isolate ${flip ? 'lg:order-2' : ''}`} style={{ backgroundColor: '#0E1216' }}>
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
          {tt(item.cta_text) && item.cta_url && (
            <a href={item.cta_url} className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-[15px] font-semibold text-white transition-transform active:scale-[0.97]" style={{ backgroundColor: ACCENT }}>
              {tt(item.cta_text)} <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </a>
          )}
          {hasMap && (
            <button type="button" onClick={() => setMap(m => !m)} aria-pressed={map}
              className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-[15px] font-semibold text-white transition-transform active:scale-[0.97]" style={{ border: `1px solid ${LINE}` }}>
              {map ? <><Camera className="w-4 h-4" aria-hidden="true" />{tt({ en: 'View photo', es: 'Ver foto' })}</> : <><MapIcon className="w-4 h-4" aria-hidden="true" />{tt({ en: 'View map', es: 'Ver mapa' })}</>}
            </button>
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
function ServiceViewer({ item, onClose }) {
  const tt = useT();
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[90] bg-black/80 flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={tt(item.title)}>
      <div className="relative w-full max-w-4xl rounded-2xl overflow-hidden" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }} onClick={e => e.stopPropagation()}>
        <button type="button" onClick={onClose} aria-label={tt({ en: 'Close', es: 'Cerrar' })} className="absolute right-3 top-3 z-10 w-10 h-10 rounded-full bg-black/60 text-white inline-flex items-center justify-center hover:bg-black/80"><X className="w-5 h-5" /></button>
        {gemImg(item.image) && <img src={gemImg(item.image)} alt="" className="w-full max-h-[60vh] object-cover" />}
        <div className="p-7">
          <p className="text-white font-bold text-[26px]" style={{ fontFamily: SERIF }}>{tt(item.title)}</p>
          {tt(item.description) && <Rich html={tt(item.description)} className="mt-3" />}
          {item.url && <Link to={item.url} className="mt-4 inline-flex items-center gap-2 font-semibold" style={{ color: LINK }}>{tt({ en: 'Learn more', es: 'Ver más' })} <ArrowRight className="w-4 h-4" /></Link>}
        </div>
      </div>
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
  const works = (w?.items || []).filter(i => i.visible !== false);
  return (
    <Shell page="services" testid="gem2i-services">
      <PageHead eyebrow={tt(cfg.eyebrow) || tt({ en: 'What we do', es: 'Qué hacemos' })} title={tt(cfg.title) || tt({ en: 'Our services', es: 'Nuestros servicios' })}>
        {tt(cfg.subtitle) && <p className="mt-4 max-w-3xl text-base md:text-[17px] leading-[1.7]" style={{ color: BODY }}>{tt(cfg.subtitle)}</p>}
      </PageHead>
      <div className="max-w-7xl mx-auto px-6 md:px-10 mt-12 grid grid-cols-2 lg:grid-cols-4 gap-1.5" data-testid="services-grid">
        {items.map((it, i) => (
          <button key={it.id || i} type="button" onClick={() => setOpen(it)} className="gcard aspect-[4/3] text-left" aria-label={tt(it.title)}>
            {gemImg(it.image) && <img src={gemImg(it.image)} alt="" loading="lazy" className="gph opacity-40" />}
            <span className="absolute inset-0 z-[2] flex flex-col items-center justify-center gap-4 p-5 text-center">
              {gemImg(it.icon_image) && <img src={gemImg(it.icon_image)} alt="" className="w-16 h-16 md:w-20 md:h-20 object-contain" style={{ filter: 'brightness(0) invert(1)' }} />}
              <span className="text-white font-semibold text-[16px] md:text-[18px] leading-snug">{tt(it.title)}</span>
            </span>
            <span className="ginfo absolute inset-x-0 bottom-0 z-[3] px-5 pb-4 text-center text-[13px] font-semibold" style={{ color: LINK }}>{tt({ en: 'View', es: 'Ver' })} →</span>
          </button>
        ))}
      </div>

      {works.length > 0 && (
        <section className="mt-20 py-16 md:py-20" style={{ backgroundColor: 'var(--color-section-bg-alt, #0A121A)' }} data-testid="services-works">
          <div className="max-w-7xl mx-auto px-6 md:px-10">
            <p className="gem-eyebrow mb-3" style={{ color: LINK }}>{tt(wc.eyebrow) || tt({ en: 'Portfolio', es: 'Portafolio' })}</p>
            <h2 className="text-white font-bold leading-[1.06]" style={{ fontFamily: SERIF, fontSize: 'clamp(2rem, 3.6vw, 3rem)' }}>{tt(wc.title) || tt({ en: 'Our works', es: 'Nuestros trabajos' })}</h2>
            {tt(wc.subtitle) && <p className="mt-4 max-w-3xl text-base md:text-[17px] leading-[1.7]" style={{ color: BODY }}>{tt(wc.subtitle)}</p>}
            <div className="mt-10 grid grid-flow-col auto-cols-[minmax(280px,1fr)] lg:auto-cols-[calc((100%-12px)/3)] gap-1.5 overflow-x-auto pb-3 snap-x">
              {works.map((it, i) => (
                <a key={it.id || i} href={it.url || wc.cta_url || '#'} className="gcard aspect-[4/3] snap-start">
                  {gemImg(it.image) && <img src={gemImg(it.image)} alt="" loading="lazy" className="gph" />}
                  <span className="gstrip absolute inset-x-0 bottom-0 z-[2] px-4 py-3.5 font-semibold text-white" style={{ background: 'linear-gradient(180deg,transparent,rgba(4,8,12,.85))' }}>{tt(it.title)}</span>
                  <span className="ginfo absolute inset-x-0 bottom-0 z-[2] flex flex-col px-5 pb-5 pt-5 border-t border-white/10">
                    <span className="text-white text-[21px] font-semibold leading-tight">{tt(it.title)}</span>
                    <span className="mt-3 self-start inline-flex items-center gap-2 border border-white/80 px-3.5 py-1.5 text-[14px] font-medium text-white">{tt(wc.cta_text) || tt({ en: 'View all works', es: 'Ver todos los trabajos' })} <ArrowRight className="w-4 h-4" /></span>
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}
      {open && <ServiceViewer item={open} onClose={() => setOpen(null)} />}
    </Shell>
  );
}

// ── /partners ───────────────────────────────────────────────────────────────
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
            <div className="max-w-7xl mx-auto px-6 md:px-10 mt-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3" data-testid="partners-grid">
              {items.map((l, i) => {
                const inner = (
                  <>
                    <span className="h-20 flex items-center justify-center">
                      <img src={gemImg(l.logo_url || l.image)} alt={tt(l.name) || ''} loading="lazy" className="max-h-16 max-w-full object-contain grayscale opacity-70 transition-[filter,opacity] duration-300 group-hover:grayscale-0 group-hover:opacity-100" />
                    </span>
                    {tt(l.name) && <span className="mt-4 text-white text-[15px] font-semibold">{tt(l.name)}</span>}
                  </>
                );
                const cls = 'group rounded-2xl p-6 flex flex-col items-center text-center transition-colors hover:border-[rgba(90,175,234,.5)]';
                const st = { backgroundColor: CARD, border: `1px solid ${LINE}` };
                return l.link_url
                  ? <a key={l.id || i} href={l.link_url} target={l.link_target || '_blank'} rel="noopener noreferrer" className={cls} style={st}>{inner}</a>
                  : <div key={l.id || i} className={cls} style={st}>{inner}</div>;
              })}
            </div>
          )}
        </MembersGate>
      )}
    </Shell>
  );
}
