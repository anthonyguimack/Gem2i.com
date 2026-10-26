import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, MapPin, Map as MapIcon, Camera, Lock, X } from 'lucide-react';
import { publicAPI } from '../../lib/api';
import { useT } from '../../lib/i18n';
import { useAuth } from '../../lib/auth';
import { normalizeRichText } from '../../lib/richText';
import { gemImg } from '../../components/gem2i/GemCatalogBits';
import AccentTitle from '../../components/gem2i/AccentTitle';
import { tripSlug } from './g02/G02Helpers';
import { PageHero, CARD_CSS, ACCENT, LINK, BODY, CARD, LINE } from '../../components/gem2i/GemCatalogCards';

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

function Shell({ page, testid, children, onShown }) {
  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: 'var(--color-page-bg, #04080C)', fontFamily: GEM_FONT }} data-testid={testid}>
      <PageHero page={page} onShown={onShown} />
      {children}
      <style>{CARD_CSS}</style>
    </div>
  );
}

/** Page title + intro. Without a CMS hero (Hero → Page Assignment) the title is the page opener and grows. */
function PageTitle({ hasHero, eyebrow, title, intro, side }) {
  return (
    <div className={`max-w-7xl mx-auto px-6 md:px-10 ${hasHero === false ? 'pt-14 md:pt-16' : 'pt-16 md:pt-20'}`}>
      {eyebrow && <p className="gem-eyebrow mb-3" style={{ color: LINK }}>{eyebrow}</p>}
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
        <h1 className="text-white font-bold leading-[1.06] pb-1" data-testid="page-title"
          style={{ fontFamily: SERIF, fontSize: hasHero === false ? 'clamp(2.6rem, 5.4vw, 4.4rem)' : 'clamp(2.2rem, 4.4vw, 3.4rem)' }}>
          <AccentTitle text={title} />
        </h1>
        {side}
      </div>
      {intro && <p className="mt-4 max-w-3xl text-base md:text-[17px] leading-[1.7]" style={{ color: BODY }}>{intro}</p>}
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
      <div className="rounded-[4px] p-10 md:p-14 text-center" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }} data-testid="members-gate">
        <Lock className="w-8 h-8 mx-auto" style={{ color: LINK }} aria-hidden="true" />
        <p className="mt-4 text-white font-bold text-[26px]" style={{ fontFamily: SERIF }}>{tt({ en: 'For GEM2i members', es: 'Para miembros de GEM2i' })}</p>
        <p className="mt-2 text-[16px]" style={{ color: BODY }}>{tt({ en: 'Log in to see this page.', es: 'Inicia sesión para ver esta página.' })}</p>
        <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('gem2i:open-login'))}
          className="mt-6 inline-flex items-center gap-2 rounded-[4px] px-6 py-3 text-[15px] font-bold text-white transition-opacity hover:opacity-90" style={{ backgroundColor: ACCENT }}>
          {tt({ en: 'Log in', es: 'Iniciar sesión' })} <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// ── /travels ────────────────────────────────────────────────────────────────
const STATUS = {
  open: [{ en: 'Open', es: 'Abierto' }, '#2fbf71'],
  last: [{ en: 'Last spots', es: 'Últimas plazas' }, '#E8A23B'],
  soon: [{ en: 'Soon', es: 'Próximamente' }, '#5AAFEA'],
  sold_out: [{ en: 'Sold out', es: 'Agotado' }, '#8A949E'],
};
const linesOf = (t) => String(t || '').split(/\r?\n/).map(x => x.trim()).filter(Boolean);

/** TR-A (boceto gem2i-travels.html): one trip per row, photo + facts, alternating; each optional field shows only
 *  when filled (status, nights, price from, includes, spots). The photo switches to its map when there is one. */
function TravelRow({ item, flip }) {
  const tt = useT();
  const [map, setMap] = useState(false);
  const img = gemImg(item.image);
  const hasMap = !!item.map_url;
  const st = STATUS[item.status];
  const total = Number(item.spots_total) || 0;
  const taken = Math.min(Number(item.spots_taken) || 0, total);
  const includes = linesOf(tt(item.includes)).slice(0, 5);
  const facts = [
    item.nights && `${item.nights} ${tt({ en: 'nights', es: 'noches' })}`,
    tt(item.price_from) && `${tt({ en: 'from', es: 'desde' })} ${tt(item.price_from)}`,
  ].filter(Boolean);
  return (
    <article className="grid lg:grid-cols-2 rounded-[4px] overflow-hidden" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }} data-testid="travel-row">
      <div className={`relative min-h-[300px] lg:min-h-[420px] overflow-hidden ${flip ? 'lg:order-2' : ''}`} style={{ backgroundColor: '#0A121A' }}>
        {img && <img src={img} alt="" loading="lazy" className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${map ? 'opacity-0' : 'opacity-100'}`} />}
        {hasMap && map && <iframe src={item.map_url} title={`${tt(item.title)} map`} className="absolute inset-0 w-full h-full border-0" loading="lazy" allowFullScreen />}
      </div>
      <div className="p-7 md:p-10 flex flex-col justify-center gap-3">
        {st && <span className="self-start rounded-[4px] px-2.5 py-1 text-[11px] font-extrabold tracking-[0.12em] uppercase" style={{ backgroundColor: st[1], color: '#04080C' }}>{tt(st[0])}</span>}
        <h2 className="text-white font-bold leading-[1.08] pb-1" style={{ fontFamily: SERIF, fontSize: 'clamp(1.9rem, 3.2vw, 2.6rem)' }}>{tt(item.title)}</h2>
        <p className="flex flex-wrap gap-x-5 gap-y-1 text-[15px]" style={{ color: BODY }}>
          {tt(item.dates) && <span className="inline-flex items-center gap-1.5"><CalendarDays className="w-4 h-4" style={{ color: LINK }} aria-hidden="true" />{tt(item.dates)}</span>}
          {tt(item.address) && <span className="inline-flex items-center gap-1.5"><MapPin className="w-4 h-4" style={{ color: LINK }} aria-hidden="true" />{tt(item.address)}</span>}
        </p>
        {facts.length > 0 && <p className="text-white text-[16px] font-semibold">{facts.join(' · ')}</p>}
        {includes.length > 0 && (
          <p className="flex flex-wrap gap-1.5">
            {includes.map(x => <span key={x} className="rounded-[4px] px-2.5 py-1 text-[12.5px]" style={{ border: `1px solid ${LINE}`, color: BODY }}>{x}</span>)}
          </p>
        )}
        {total > 0 && (
          <div className="max-w-sm" data-testid="travel-spots">
            <span className="block h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,.1)' }}>
              <i className="block h-full" style={{ width: `${Math.round((taken / total) * 100)}%`, backgroundColor: LINK }} />
            </span>
            <small className="text-[13px]" style={{ color: BODY }}>{tt({ en: `${total - taken} of ${total} spots left`, es: `Quedan ${total - taken} de ${total} plazas` })}</small>
          </div>
        )}
        <div className="mt-2 flex flex-wrap gap-3">
          <Link to={`/travels/${tripSlug(item)}`} className="inline-flex items-center gap-2 rounded-[4px] px-5 py-3 text-[15px] font-bold text-white transition-opacity hover:opacity-90" style={{ backgroundColor: ACCENT }} data-testid="view-trip-link">
            {tt({ en: 'View trip', es: 'Ver viaje' })} <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
          {hasMap && (
            <button type="button" onClick={() => setMap(m => !m)} aria-pressed={map}
              className="inline-flex items-center gap-2 rounded-[4px] px-5 py-3 text-[15px] font-semibold text-white border border-white/30 transition-colors hover:bg-white/10">
              {map ? <><Camera className="w-4 h-4" aria-hidden="true" />{tt({ en: 'View photo', es: 'Ver foto' })}</> : <><MapIcon className="w-4 h-4" aria-hidden="true" />{tt({ en: 'View map', es: 'Ver mapa' })}</>}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function Gem2iTravels() {
  const tt = useT();
  const s = useSection('gem_travels');
  const [hasHero, setHasHero] = useState(null);
  const cfg = s?.config || {};
  const items = (s?.items || []).filter(i => i.visible !== false);
  return (
    <Shell page="travels" testid="gem2i-travels" onShown={setHasHero}>
      <PageTitle hasHero={hasHero} eyebrow={tt(cfg.eyebrow) || tt({ en: 'Travels', es: 'Viajes' })}
        title={tt(cfg.title) || tt({ en: 'Travel with GEM2i', es: 'Viaja con GEM2i' })} intro={tt(cfg.subtitle)} />
      {s && (
        <MembersGate on={cfg.members_only !== false}>
          {items.length === 0
            ? <p className="max-w-7xl mx-auto px-6 md:px-10 mt-12 text-[17px]" style={{ color: BODY }}>{tt({ en: 'New trips coming soon.', es: 'Pronto nuevos viajes.' })}</p>
            : <div className="max-w-7xl mx-auto px-6 md:px-10 mt-10 grid gap-5">{items.map((it, i) => <TravelRow key={it.id || i} item={it} flip={i % 2 === 1} />)}</div>}
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

export function Gem2iServices() {
  const tt = useT();
  const s = useSection('gem_services_page');
  const w = useSection('gem_works');
  const [open, setOpen] = useState(null);
  const [hasHero, setHasHero] = useState(null); // null until PageHero knows
  const cfg = s?.config || {};
  const items = (s?.items || []).filter(i => i.visible !== false);
  const wc = w?.config || {};
  const works = (w?.items || []).filter(i => i.visible !== false);
  const rows = items.slice(0, 4);
  const rest = items.slice(4);
  // A service opens its own link when it has one (e.g. /works), else the photo viewer.
  const act = (it) => (it.url ? { as: Link, to: it.url } : { as: 'button', type: 'button', onClick: () => setOpen(it) });
  const Icon = ({ it, size = 52 }) => (gemImg(it.icon_image) ? (
    <span className="shrink-0 rounded-full flex items-center justify-center" style={{ width: size, height: size, backgroundColor: 'rgba(0,104,179,.18)' }}>
      <img src={gemImg(it.icon_image)} alt="" className="object-contain" style={{ width: size / 2, height: size / 2, filter: 'brightness(0) invert(1)' }} />
    </span>
  ) : null);
  return (
    <Shell page="services" testid="gem2i-services" onShown={setHasHero}>
      {/* SE-C (boceto gem2i-services.html): the first four services as alternating image rows, the rest as
          small cards, then "Our works". Without CMS hero the title is the page opener and grows. */}
      <div className={`max-w-7xl mx-auto px-6 md:px-10 ${hasHero === false ? 'pt-14 md:pt-16' : 'pt-16 md:pt-20'}`}>
        <p className="gem-eyebrow mb-3" style={{ color: LINK }}>{tt(cfg.eyebrow) || tt({ en: 'What we do', es: 'Qué hacemos' })}</p>
        <h1 className="text-white font-bold leading-[1.06] pb-1" data-testid="services-title"
          style={{ fontFamily: SERIF, fontSize: hasHero === false ? 'clamp(2.6rem, 5.4vw, 4.4rem)' : 'clamp(2.2rem, 4.4vw, 3.4rem)' }}>
          <AccentTitle text={tt(cfg.title) || tt({ en: 'Our services', es: 'Nuestros servicios' })} />
        </h1>
        {tt(cfg.subtitle) && <p className="mt-4 max-w-3xl text-base md:text-[17px] leading-[1.7]" style={{ color: BODY }}>{tt(cfg.subtitle)}</p>}
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-10 mt-12 grid gap-10 md:gap-8" data-testid="services-rows">
        {rows.map((it, i) => {
          const A = act(it);
          const { as: Tag, ...props } = A;
          return (
            <div key={it.id || i} className="grid md:grid-cols-2 gap-6 md:gap-10 items-center">
              <div className={`rounded-[4px] overflow-hidden aspect-[16/10] ${i % 2 ? 'md:order-2' : ''}`} style={{ backgroundColor: '#0A121A' }}>
                {gemImg(it.image) && <img src={gemImg(it.image)} alt="" loading="lazy" className="w-full h-full object-cover" />}
              </div>
              <div>
                <Icon it={it} />
                <h2 className="mt-4 text-white font-bold leading-[1.15]" style={{ fontFamily: SERIF, fontSize: 'clamp(1.6rem, 2.6vw, 2.1rem)' }}>{tt(it.title)}</h2>
                {tt(it.description) && <div className="mt-3 max-w-[56ch] text-[16px] leading-[1.75] [&_p]:mb-3" style={{ color: BODY }} dangerouslySetInnerHTML={{ __html: normalizeRichText(tt(it.description)) }} />}
                <Tag {...props} className="mt-4 inline-block font-bold underline underline-offset-4 decoration-1 hover:decoration-2" style={{ color: LINK }}>
                  {it.url ? tt({ en: 'See related works', es: 'Ver trabajos' }) : tt({ en: 'Learn more', es: 'Ver más' })}
                </Tag>
              </div>
            </div>
          );
        })}
      </div>

      {rest.length > 0 && (
        <div className="max-w-7xl mx-auto px-6 md:px-10 mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3" data-testid="services-cards">
          {rest.map((it, i) => {
            const { as: Tag, ...props } = act(it);
            return (
              <Tag key={it.id || i} {...props} className="flex items-center gap-3.5 rounded-[4px] p-4 text-left transition-colors hover:border-[#5AAFEA]"
                style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
                <Icon it={it} size={46} />
                <span className="text-white font-semibold text-[15px] leading-snug">{tt(it.title)}</span>
              </Tag>
            );
          })}
        </div>
      )}

      {works.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 md:px-10 mt-20" data-testid="services-works">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-white font-bold leading-[1.1] pb-1" style={{ fontFamily: SERIF, fontSize: 'clamp(1.7rem, 3vw, 2.4rem)' }}>
              <AccentTitle text={tt(wc.title) || tt({ en: 'Our works', es: 'Nuestros trabajos' })} />
            </h2>
            <Link to="/works" className="font-bold underline underline-offset-4 decoration-1 hover:decoration-2" style={{ color: LINK }}>{tt(wc.cta_text) || tt({ en: 'View all works', es: 'Ver todos los trabajos' })}</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {works.slice(0, 4).map((it, i) => (
              <Link key={it.id || i} to="/works" className="gcard aspect-[4/3]">
                {gemImg(it.image) && <img src={gemImg(it.image)} alt="" loading="lazy" className="gph" />}
                <span className="gstrip absolute inset-x-0 bottom-0 z-[2] px-4 py-3.5 font-semibold text-white" style={{ background: 'linear-gradient(180deg,transparent,rgba(4,8,12,.85))' }}>{tt(it.title)}</span>
                <span className="ginfo absolute inset-x-0 bottom-0 z-[2] flex flex-col px-5 pb-5 pt-5 border-t border-white/10">
                  <span className="text-white text-[20px] font-semibold leading-tight">{tt(it.title)}</span>
                  <span className="mt-3 self-start inline-flex items-center gap-2 border border-white/80 px-3.5 py-1.5 text-[14px] font-medium text-white">{tt({ en: 'View work', es: 'Ver trabajo' })} <ArrowRight className="w-4 h-4" /></span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
      {open && <ServiceViewer item={open} onClose={() => setOpen(null)} />}
    </Shell>
  );
}

// ── /partners ───────────────────────────────────────────────────────────────
export function Gem2iPartners() {
  const tt = useT();
  const s = useSection('gem_partners_page');
  const logos = useSection('aurex_partners');
  const [hasHero, setHasHero] = useState(null);
  const cfg = s?.config || {};
  const items = (logos?.items || []).filter(i => i.visible !== false && (i.logo_url || i.image));
  return (
    <Shell page="partners" testid="gem2i-partners-page" onShown={setHasHero}>
      {/* PA-A (boceto gem2i-partners.html): hairline wall of logos, grey -> colour on hover; logo only. */}
      <PageTitle hasHero={hasHero} eyebrow={tt(cfg.eyebrow) || tt({ en: 'Global', es: 'Global' })}
        title={tt(cfg.title) || tt({ en: 'Our partners', es: 'Nuestros partners' })}
        side={tt(cfg.subtitle) && <p className="max-w-[42ch] text-[16px] leading-[1.7]" style={{ color: BODY }}>{tt(cfg.subtitle)}</p>} />
      {s && (
        <MembersGate on={cfg.members_only !== false}>
          {items.length === 0 ? (
            <p className="max-w-7xl mx-auto px-6 md:px-10 mt-12 text-[17px]" style={{ color: BODY }}>{tt(cfg.empty_text) || tt({ en: 'Coming soon…', es: 'Próximamente…' })}</p>
          ) : (
            <div className="max-w-7xl mx-auto px-6 md:px-10 mt-10">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px rounded-[4px] overflow-hidden" style={{ backgroundColor: LINE }} data-testid="partners-grid">
                {items.map((l, i) => {
                  const img = <img src={gemImg(l.logo_url || l.image)} alt={tt(l.name) || ''} loading="lazy" className="max-h-16 max-w-[80%] object-contain grayscale opacity-70 transition-[filter,opacity] duration-300 group-hover:grayscale-0 group-hover:opacity-100" />;
                  const cls = 'group aspect-[3/2] flex items-center justify-center p-6 transition-colors hover:bg-[#0F1C29]';
                  const st = { backgroundColor: CARD };
                  return l.link_url
                    ? <a key={l.id || i} href={l.link_url} target={l.link_target || '_blank'} rel="noopener noreferrer" className={cls} style={st} title={tt(l.name) || undefined}>{img}</a>
                    : <div key={l.id || i} className={cls} style={st} title={tt(l.name) || undefined}>{img}</div>;
                })}
              </div>
            </div>
          )}
        </MembersGate>
      )}
    </Shell>
  );
}
