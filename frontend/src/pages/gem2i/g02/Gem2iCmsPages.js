/* Gem2i (`gem2i_02`) — generic CMS pages in the Gem2i look (template = package, D-GEM-2026-15):
 *   Gem2iCmsPage        /page/:pageId and any custom URL from CMS → Pages (CP-A: reading column; the page's own
 *                       hero slides when assigned; builder / preset layouts are rendered as before)
 *   Gem2iNotFound       unknown URLs (NF-C: message + the next four events)
 *   Gem2iPaymentSuccess /checkout/success — return from a Stripe purchase of a CMS service (MS-A: welcome + receipt).
 *                       The paid membership returns to My Account (/my-account/membership), not here.
 * Bocetos: work-plans-MD/bocetos/gem2i-cms-page.html, gem2i-404.html, gem2i-membership-success.html. */
import React, { useEffect, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { Check, XCircle } from 'lucide-react';
import { publicAPI, gemAPI, checkoutAPI } from '../../../lib/api';
import { useT } from '../../../lib/i18n';
import { normalizeRichText } from '../../../lib/richText';
import { gemImg, SkeletonGrid } from '../../../components/gem2i/GemCatalogBits';
import { PageHero, HoverCard, CARD_CSS } from '../../../components/gem2i/GemCatalogCards';
import AccentTitle from '../../../components/gem2i/AccentTitle';
import LayoutAboutBio from '../../../components/layouts/LayoutAboutBio';
import LayoutServicesGrid from '../../../components/layouts/LayoutServicesGrid';
import LayoutGalleryAlbums from '../../../components/layouts/LayoutGalleryAlbums';
import LayoutFullContent from '../../../components/layouts/LayoutFullContent';
import LayoutRenderer from '../../../components/layouts/LayoutRenderer';
import { LAYOUTS } from '../../../lib/layoutDefinitions';

const GEM_FONT = "'Manrope', sans-serif";
const SERIF = "'Playfair Display', Georgia, serif";
const BODY = 'var(--color-body-text, #9AA6B2)';
const LINK = 'var(--color-link, #5AAFEA)';
const LINE = 'var(--color-card-border, rgba(255,255,255,0.09))';
const CARD = 'var(--color-card-bg, #0D1721)';
const ACCENT = 'var(--color-accent, #0068b3)';
const btn = 'inline-flex items-center gap-2 rounded-[4px] px-5 py-3 text-[14.5px] font-bold text-white transition-opacity hover:opacity-90';
const Page = ({ children, testid }) => (
  <div className="min-h-screen" style={{ backgroundColor: 'var(--color-page-bg, #04080C)', fontFamily: GEM_FONT }} data-testid={testid}>{children}</div>
);

// ── 404 (NF-C) ───────────────────────────────────────────────────────────────
export function Gem2iNotFound() {
  const tt = useT();
  const [events, setEvents] = useState([]);
  useEffect(() => { gemAPI.events({ limit: 4 }).then(r => setEvents(r.data?.items || [])).catch(() => {}); }, []);
  return (
    <Page testid="page-not-found">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-16 md:py-20">
        <p className="text-[12px] font-extrabold tracking-[0.16em] uppercase" style={{ color: LINK }}>404</p>
        <h1 className="mt-2 text-white font-bold leading-[1.06] pb-1" style={{ fontFamily: SERIF, fontSize: 'clamp(2.4rem, 4.8vw, 3.8rem)' }}>
          <AccentTitle text={tt({ en: 'Page not found', es: 'Página no encontrada' })} />
        </h1>
        <p className="mt-3 text-[17px]" style={{ color: BODY }}>{tt({ en: 'The link may be old or the page was moved. Maybe one of these nights?', es: 'El enlace puede ser antiguo o la página se movió. ¿Quizá una de estas noches?' })}</p>
        {events.length > 0 && (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="not-found-events">
            {events.map(e => (
              <HoverCard key={e.id} to={`/events/${e.slug}`} aspect="aspect-[4/5]" img={gemImg(e.image_urls?.flyer) || gemImg(e.image_urls?.logo)}
                title={e.title} strip={e.title} cta={tt({ en: 'View event', es: 'Ver evento' })} meta={[e.event_date]} />
            ))}
          </div>
        )}
        <div className="mt-8 flex flex-wrap gap-2.5">
          <Link to="/" className={btn} style={{ backgroundColor: ACCENT }}>{tt({ en: 'Go home', es: 'Ir al inicio' })}</Link>
          <Link to="/events" className={btn} style={{ border: '1px solid rgba(255,255,255,.3)' }}>{tt({ en: 'Upcoming events', es: 'Próximos eventos' })}</Link>
          <Link to="/#contact" className={btn} style={{ border: '1px solid rgba(255,255,255,.3)' }}>{tt({ en: 'Contact us', es: 'Contáctanos' })}</Link>
        </div>
      </div>
      <style>{CARD_CSS}</style>
    </Page>
  );
}

// ── CMS page (CP-A) ──────────────────────────────────────────────────────────
export function Gem2iCmsPage() {
  const { pageId } = useParams();
  const location = useLocation();
  const tt = useT();
  const [page, setPage] = useState(undefined); // undefined = loading, null = not found
  const [hasHero, setHasHero] = useState(null);

  // Same page lookup as the shared DynamicPage (CMS → Pages: by id, by /page/:id url, or by the current path).
  useEffect(() => {
    let alive = true;
    setPage(undefined); setHasHero(null);
    publicAPI.getNavPages().then(r => {
      const pages = r.data || [];
      const cands = pages.filter(p => (pageId && p.id === pageId) || (pageId && p.url === `/page/${pageId}`) || (!pageId && p.url === location.pathname));
      const found = cands.length > 1
        ? cands.sort((a, b) => (a.layout && !b.layout ? -1 : !a.layout && b.layout ? 1 : (b.created_at || '').localeCompare(a.created_at || '')))[0]
        : cands[0];
      if (!alive) return;
      if (!found) { setPage(null); return; }
      setPage(found);
      if (found.page_type) publicAPI.getPage(found.page_type).then(res => { if (alive) setPage(prev => ({ ...prev, ...res.data, title: found.title })); }).catch(() => {});
    }).catch(() => { if (alive) setPage(null); });
    return () => { alive = false; };
  }, [pageId, location.pathname]);

  if (page === null) return <Gem2iNotFound />;
  if (page === undefined) return <Page><div className="max-w-7xl mx-auto px-6 md:px-10 py-24"><SkeletonGrid count={2} /></div></Page>;

  // Pages built with the CMS layout builder / legacy presets keep their renderer.
  const preset = { layout_1: LayoutAboutBio, layout_2: LayoutServicesGrid, layout_3: LayoutGalleryAlbums, layout_5: LayoutFullContent }[page.layout];
  const banner = gemImg(page.banner_image);
  return (
    <Page testid="dynamic-page">
      <PageHero page={page.id} onShown={setHasHero} />
      {preset ? React.createElement(preset, { page }) : page.layout && LAYOUTS[page.layout] ? <LayoutRenderer page={page} hasHero={hasHero === true} /> : (
        <article className={`max-w-[860px] mx-auto px-6 md:px-10 pb-24 ${hasHero === false ? 'pt-14 md:pt-16' : 'pt-16 md:pt-20'}`}>
          <p className="text-[13px]" style={{ color: BODY }}><Link to="/" className="hover:underline">{tt({ en: 'Home', es: 'Inicio' })}</Link> / {tt(page.title)}</p>
          <h1 className="mt-3 text-white font-bold leading-[1.06] pb-1" data-testid="page-title"
            style={{ fontFamily: SERIF, fontSize: hasHero === false ? 'clamp(2.6rem, 5.4vw, 4.2rem)' : 'clamp(2.2rem, 4.4vw, 3.4rem)' }}>
            <AccentTitle text={tt(page.title)} />
          </h1>
          {tt(page.summary) && <p className="mt-4 max-w-[56ch] text-[18px] leading-[1.7]" style={{ color: BODY }}>{tt(page.summary)}</p>}
          {banner && hasHero === false && <img src={banner} alt="" className="mt-8 w-full aspect-[21/9] object-cover rounded-[4px]" />}
          {tt(page.content) && (
            <div className="mt-8 text-[17px] leading-[1.85] [&_p]:mb-4 [&_h2]:mt-9 [&_h2]:mb-3 [&_h2]:text-white [&_h2]:text-[26px] [&_h2]:font-bold [&_h3]:text-white [&_h3]:mt-6 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:underline [&_img]:rounded-[4px] [&_img]:my-5 [&_blockquote]:border-l-[3px] [&_blockquote]:border-[#5AAFEA] [&_blockquote]:pl-5 [&_blockquote]:italic [&_blockquote]:text-white [&_blockquote]:text-[21px] [&_h2]:font-[Playfair_Display]"
              style={{ color: BODY, overflowWrap: 'break-word' }} dangerouslySetInnerHTML={{ __html: normalizeRichText(tt(page.content)) }} />
          )}
        </article>
      )}
    </Page>
  );
}

// ── /checkout/success (MS-A) ─────────────────────────────────────────────────
export function Gem2iPaymentSuccess() {
  const tt = useT();
  const [params] = useSearchParams();
  const sessionId = params.get('session_id');
  const [state, setState] = useState('loading'); // loading | paid | failed | timeout
  const [info, setInfo] = useState({});
  useEffect(() => {
    if (!sessionId) { setState('failed'); return undefined; }
    let alive = true; let tries = 0;
    const poll = () => {
      checkoutAPI.status(sessionId).then(r => {
        if (!alive) return;
        if (r.data.payment_status === 'paid') { setInfo(r.data); setState('paid'); return; }
        if (r.data.status === 'expired') { setState('failed'); return; }
        tries += 1;
        if (tries >= 6) { setState('timeout'); return; }
        setTimeout(poll, 2000);
      }).catch(() => { if (alive) setState('failed'); });
    };
    poll();
    return () => { alive = false; };
  }, [sessionId]);
  const amount = info.amount_total != null ? `${(Number(info.amount_total) / 100).toFixed(2)} ${String(info.currency || '').toUpperCase()}` : '';
  return (
    <Page testid="checkout-success-page">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-16 md:py-24">
        {state === 'paid' ? (
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div>
              <span className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E4F6EC', color: '#178A4C' }}><Check className="w-8 h-8" aria-hidden="true" /></span>
              <h1 className="mt-4 mb-3 text-white font-bold leading-[1.06] pb-1" style={{ fontFamily: SERIF, fontSize: 'clamp(2.4rem, 4.8vw, 3.8rem)' }}>
                <AccentTitle text={tt({ en: 'Payment confirmed', es: 'Pago confirmado' })} />
              </h1>
              <p className="max-w-[44ch] text-[17px] leading-[1.7]" style={{ color: BODY }}>{tt({ en: 'Thank you. A confirmation is on its way to your e-mail and the GEM2i team will contact you.', es: 'Gracias. Te llega la confirmación por e-mail y el equipo de GEM2i se pondrá en contacto contigo.' })}</p>
              <div className="mt-6 flex flex-wrap gap-2.5">
                <Link to="/my-account" className={btn} style={{ backgroundColor: ACCENT }}>{tt({ en: 'Go to My Account', es: 'Ir a Mi cuenta' })}</Link>
                <Link to="/events" className={btn} style={{ border: '1px solid rgba(255,255,255,.3)' }}>{tt({ en: 'Upcoming events', es: 'Próximos eventos' })}</Link>
              </div>
            </div>
            <div className="rounded-[4px] p-6" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }} data-testid="receipt">
              <small className="text-[12px] font-extrabold tracking-[0.14em] uppercase" style={{ color: LINK }}>{tt({ en: 'Receipt', es: 'Recibo' })}</small>
              {[[tt({ en: 'Status', es: 'Estado' }), tt({ en: 'Paid', es: 'Pagado' })], [tt({ en: 'Amount', es: 'Importe' }), amount], [tt({ en: 'Reference', es: 'Referencia' }), sessionId ? `…${sessionId.slice(-8)}` : '']]
                .filter(([, v]) => v).map(([k, v]) => (
                  <p key={k} className="m-0 py-3 flex justify-between gap-4 border-b" style={{ borderColor: LINE }}><small style={{ color: BODY }}>{k}</small><b className="text-white">{v}</b></p>
                ))}
              <p className="mt-4 mb-0 text-[13px]" style={{ color: BODY }}>{tt({ en: 'One-time payment processed by Stripe.', es: 'Pago único procesado por Stripe.' })}</p>
            </div>
          </div>
        ) : state === 'loading' ? (
          <div className="max-w-[560px] mx-auto text-center" aria-live="polite">
            <span className="block w-16 h-16 mx-auto rounded-full border-4 animate-spin motion-reduce:animate-none" style={{ borderColor: LINE, borderTopColor: ACCENT }} aria-hidden="true" />
            <h1 className="mt-5 text-white font-bold text-[32px]" style={{ fontFamily: SERIF }}>{tt({ en: 'Confirming your payment…', es: 'Confirmando tu pago…' })}</h1>
            <p style={{ color: BODY }}>{tt({ en: "This usually takes a few seconds. Please don't pay again.", es: 'Suele tardar unos segundos. Por favor, no pagues otra vez.' })}</p>
          </div>
        ) : (
          <div className="max-w-[560px] mx-auto text-center">
            <XCircle className="w-14 h-14 mx-auto text-red-400" aria-hidden="true" />
            <h1 className="mt-4 text-white font-bold text-[32px]" style={{ fontFamily: SERIF }}>{state === 'timeout' ? tt({ en: 'Still confirming', es: 'Seguimos confirmando' }) : tt({ en: "We couldn't verify this payment", es: 'No pudimos verificar este pago' })}</h1>
            <p style={{ color: BODY }}>{tt({ en: 'If you were charged, you will receive a confirmation by e-mail.', es: 'Si se hizo el cargo, recibirás la confirmación por e-mail.' })}</p>
            <Link to="/" className={`${btn} mt-6`} style={{ backgroundColor: ACCENT }}>{tt({ en: 'Back to home', es: 'Volver al inicio' })}</Link>
          </div>
        )}
      </div>
    </Page>
  );
}
