/* Gem2i - 03 template (`gem2i_03`) — its OWN copy of the home page (sections from its own *Sections.js)
   (house rule 2026-10-21: every template has its own face; content is shared).
   Edit this file only for Gem2i - 03; never import it from another template. */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Play } from 'lucide-react';
import HeroSection from '../../components/HeroSection';
import { publicAPI, gemAPI, blogExternalAPI } from '../../lib/api';
import { gemImg } from '../../components/gem2i/GemCatalogBits';
import { useSettings } from '../../App';
import { useT } from '../../lib/i18n';
import { useAuth } from '../../lib/auth';
import { slideForAudience, isLoggedInUser } from '../../lib/heroAudience';
import { AUREX_FONTS } from '../../lib/themeColors';
import { GemHeroC } from '../../components/gem2i/GemHeroVariants';
import GemModernMaps from '../../components/gem2i/GemModernMaps';
import GemContactSection from '../../components/gem2i/GemContactSection';
import AccentTitle from '../../components/gem2i/AccentTitle';
import { LOOKS, readLook, toneOf } from '../../lib/gemLook';
import {
  GemAudience, GemSteps, GemMethodCycle, GemAudienceList, GemTimeline,
  GemEventPosters, GemArtistMosaic,
  GemVideoCover, GemPricingTiers, GemTeamPortraits, GemTestimonialSpotlight, GemGalleryMarquee, GemGalleryMosaic, GemLogoMarquee, GemClientsGrid, GemVenueCards, GemVenueGrid, GemFestivalBento, GemConferenceCards, GemPricing, GemTeam, GemVideo, GemLogos, GemTestimonials,
  GemCatalogStrip, GemTicker, GemLocations, GemGallery,
  GemIntroPhoto, GemServicesGrid, GemFeaturedCircles, GemFaq, GemNewsCards, GemConferenceReviews,
} from '../../components/gem2i/Gem2i03Sections';

// Section Manager content the home reads (one public call each, in parallel).
const SM_KEYS = [
  'aurex_audience', 'aurex_process', 'aurex_pricing', 'aurex_team', 'aurex_video',
  'aurex_partners', 'aurex_clients', 'aurex_testimonials_cfg', 'aurex_services_cfg',
  'gem_methodology', 'gem_events_cfg', 'gem_artists_cfg', 'gem_venues_cfg',
  'gem_festivals_cfg', 'gem_conferences_cfg', 'gem_clients_cfg',
  'news_ticker', 'aurex_locations_cfg', 'aurex_gallery_cfg', 'gem_faq', 'aurex_blog_cfg', 'gem_conf_reviews',
];
const DEFAULT_ORDER = [
  'news_ticker', 'hero', 'gem_intro', 'gem_featured', 'gem_faq', 'gem_services_banner', 'services', 'gem_methodology',
  'aurex_audience', 'aurex_process', 'gem_events', 'gem_artists', 'gem_venues',
  'gem_festivals', 'gem_conferences', 'gem_conf_reviews', 'aurex_video', 'aurex_pricing', 'aurex_team',
  'testimonials', 'gem_news', 'gem_media', 'gallery', 'map', 'aurex_partners', 'gem_clients', 'aurex_clients', 'contact',
];

const GEM_FONT = "'Manrope', sans-serif";

/**
 * gem2i homepage (GEM2I_MIGRATION_PLAN Phase 1 / §2): hero slides → intro →
 * featured blurbs → services banner + grid → methodology → festivals /
 * conferences carousels (Phase-2 data; hidden while empty) → media block →
 * clients. All copy is CMS-driven from gem_config content (EN/ES).
 *
 * Since the Section Manager port the page is a list of sections: the order,
 * visibility (eye) and per-section background/font come from CMS → Page
 * Builder (scope "gem2i"); section headers and items come from CMS →
 * Section Manager. Sections with no content render nothing.
 */
export default function Gem2i03Home() {
  const settings = useSettings();
  const tt = useT();
  const [content, setContent] = useState(null);
  const [allHeroSlides, setHeroSlides] = useState([]);
  const { user, loading: authLoading } = useAuth();
  // Audience filter (Everyone / Not logged in / Logged in) — hold until the
  // session check resolves so the wrong audience's hero never flashes.
  const heroSlides = authLoading ? [] : allHeroSlides.filter(s => slideForAudience(s, isLoggedInUser(user)));
  const [festivals, setFestivals] = useState([]);
  const [conferences, setConferences] = useState([]);
  const [clientLogos, setClientLogos] = useState([]);
  const [layout, setLayout] = useState(null);      // {section_order, sections, section_configs}
  const [sm, setSm] = useState({});                // Section Manager content by key
  const [events, setEvents] = useState([]);
  const [news, setNews] = useState([]); // KMS posts (Settings → Blog API URL)
  const [heroEvents, setHeroEvents] = useState([]); // events pinned to hero slides
  const [artists, setArtists] = useState([]);
  const [venues, setVenues] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [maps, setMaps] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [mapTabs, setMapTabs] = useState([]);      // [{key, locations}] for GemModernMaps

  useEffect(() => {
    publicAPI.getGemContent().then(r => setContent(r.data || {})).catch(() => setContent({}));
    publicAPI.getHeroSlides('home').then(r => setHeroSlides(r.data || [])).catch(() => {});
    // Phase-2 catalogs light up the legacy homepage carousels.
    gemAPI.festivals({ limit: 12 }).then(r => setFestivals(r.data?.items || [])).catch(() => {});
    gemAPI.conferences({ limit: 100 }).then(r => setConferences(r.data?.items || [])).catch(() => {});
    gemAPI.clients().then(r => setClientLogos((r.data?.items || []).map(cl => ({
      name: cl.title, url: cl.url, description: cl.description ? cl.description.replace(/<[^>]+>/g, '').trim() : '', image: cl.image_urls?.on?.startsWith('/api')
        ? `${process.env.REACT_APP_BACKEND_URL || ''}${cl.image_urls.on}` : cl.image_urls?.on,
    })))).catch(() => {});
    publicAPI.getSections(settings.active_theme).then(r => setLayout(r.data || {})).catch(() => setLayout({}));
    Promise.all(SM_KEYS.map(k => publicAPI.getSectionContent(k).then(r => [k, r.data]).catch(() => [k, null])))
      .then(rows => setSm(Object.fromEntries(rows.filter(([, v]) => v))));
    gemAPI.events({ limit: 12 }).then(r => setEvents(r.data?.items || [])).catch(() => {});
    blogExternalAPI.getLatest().then(r => setNews(r.data?.posts || [])).catch(() => {});
    gemAPI.heroEvents().then(r => setHeroEvents(r.data?.items || [])).catch(() => {});
    gemAPI.artists({ limit: 12 }).then(r => setArtists(r.data?.items || [])).catch(() => {});
    gemAPI.venues({ limit: 150 }).then(r => setVenues(r.data?.items || [])).catch(() => {});
    Promise.all([['map_global', 'global_business'], ['map_conferences', 'conferences'], ['map_recommended', 'recommended_sites']]
      .map(([key, type]) => publicAPI.getMapLocations(type).then(r => ({ key, locations: Array.isArray(r.data) ? r.data : [] })).catch(() => ({ key, locations: [] }))))
      .then(setMapTabs);
    publicAPI.getMaps().then(r => setMaps((r.data || []).filter(m => m.published !== false))).catch(() => {});
    publicAPI.getGallery().then(r => setGallery(Array.isArray(r.data) ? r.data : (r.data?.items || []))).catch(() => {});
    publicAPI.getTestimonials().then(r => setTestimonials(Array.isArray(r.data) ? r.data : (r.data?.items || []))).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.active_theme]);

  // Arriving at /#contact (any "Contact us" from another page): the route's
  // scroll-to-top and late-loading sections move things around, so keep
  // re-aligning #contact under the header for a few seconds, and stop as soon
  // as the visitor scrolls on their own.
  useEffect(() => {
    if (window.location.hash !== '#contact' || !content || !layout) return undefined;
    let ticks = 0;
    let stopped = false;
    const stop = () => { stopped = true; };
    window.addEventListener('wheel', stop, { passive: true });
    window.addEventListener('touchmove', stop, { passive: true });
    window.addEventListener('keydown', stop);
    const id = setInterval(() => {
      const el = document.getElementById('contact');
      if (stopped || ++ticks > 25) { clearInterval(id); return; }
      if (el && Math.abs(el.getBoundingClientRect().top - 72) > 4) {
        window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 72, behavior: 'instant' }); // 'auto' inherits html smooth-scroll and each tick cancels the last
      }
    }, 200);
    return () => {
      clearInterval(id);
      window.removeEventListener('wheel', stop);
      window.removeEventListener('touchmove', stop);
      window.removeEventListener('keydown', stop);
    };
  }, [content, layout]);

  if (!content || !layout) {
    return <div className="min-h-screen" style={{ backgroundColor: 'var(--color-page-bg, #04080C)' }} />;
  }

  const c = content;
  const brand = tt(settings.brand_name) || 'GEM2i';

  // Section-Manager header overrides on the legacy gem_content blocks.
  const smCfg = (k) => sm[k]?.config || {};
  const override = (section, k) => {
    const c2 = smCfg(k);
    if (!section && !c2.title) return section;
    return { ...(section || {}), ...(c2.title ? { title: c2.title } : {}), ...(c2.eyebrow ? { kicker: c2.eyebrow } : {}) };
  };
  const limitOf = (k, d = 12) => parseInt(smCfg(k).max_items, 10) || d;
  const methodologyItems = sm.gem_methodology?.items || [];
  // All three gem2i templates share the approved section designs (2026-10-17,
  // "copy everything from 01 to 02 and 03"); templates differ by their hero.
  const isTpl01 = true;

  const renderers = {
    hero: () => {
      return <GemHeroC slide={heroSlides[0]} slides={heroSlides} events={events} linked={heroEvents} />;
    },
    legacy_hero: () => (<>
      {/* HERO — CMS hero-canvas slides; branded static fallback until slides are entered */}
      {heroSlides.length > 0 ? (
        <HeroSection slides={heroSlides} />
      ) : (
        <section className="relative min-h-[72vh] flex items-center overflow-hidden" data-testid="hero-section">
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 30% 20%, rgba(50,135,183,0.22), transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(50,135,183,0.10), transparent 50%)' }} />
          <div className="relative max-w-7xl mx-auto px-6 md:px-10 pt-24 pb-16 w-full">
            <h1 className="text-white font-bold leading-[1.05] max-w-3xl" style={{ fontSize: 'clamp(2.4rem, 6vw, 4.5rem)', textWrap: 'balance' }}>
              {brand}
            </h1>
            <p className="mt-5 max-w-2xl text-lg" style={{ color: 'var(--color-body-text, #9AA6B2)' }}>
              {tt(settings.tagline)}
            </p>
          </div>
        </section>
      )}

      </>),
    gem_intro: () => <GemIntroPhoto intro={c.intro} />,
    legacy_gem_intro: () => (<>
      {/* INTRO */}
      {c.intro && (
        <section className="max-w-5xl mx-auto px-6 md:px-10 py-20 md:py-28" data-testid="gem2i-intro">
          <h2 className="text-white font-semibold leading-tight mb-8" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', textWrap: 'balance' }}>
            {tt(c.intro.heading)}
          </h2>
          <p className="text-[15px] md:text-base leading-[1.9]" style={{ color: 'var(--color-body-text, #9AA6B2)', textWrap: 'pretty' }}>
            {tt(c.intro.text)}
          </p>
        </section>
      )}

      </>),
    gem_featured: () => <GemFeaturedCircles items={Array.isArray(c.featured) ? c.featured : []} />,
    gem_faq: () => <GemFaq config={smCfg('gem_faq')} items={sm.gem_faq?.items || []} />,
    legacy_gem_featured: () => (<>
      {/* FEATURED — venues / events / artists */}
      {Array.isArray(c.featured) && c.featured.length > 0 && (
        <section style={{ backgroundColor: 'var(--color-section-bg, #0A121A)' }} data-testid="gem2i-featured">
          <div className="max-w-7xl mx-auto px-6 md:px-10 py-20 grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-10">
            {c.featured.map((f, i) => (
              <div key={i} className="md:px-2">
                <p className="text-xs font-medium uppercase tracking-[0.25em] mb-2" style={{ color: 'var(--color-accent, #3287B7)' }}>{tt(f.kicker)}</p>
                <h3 className="text-white text-2xl font-bold tracking-wide mb-4">{tt(f.title)}</h3>
                <p className="text-[15px] md:text-base leading-[1.7] mb-5" style={{ color: 'var(--color-body-text, #9AA6B2)' }}>{tt(f.text)}</p>
                {f.url && (
                  <Link to={f.url} className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-white" style={{ color: 'var(--color-link, #5FB2E0)' }}>
                    {tt({ en: 'Explore', es: 'Explorar' })} <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      </>),
    gem_services_banner: () => (<>
      {/* SERVICES BANNER */}
      {c.services_banner && (
        <section className="py-10" style={{ backgroundColor: 'var(--color-accent, #3287B7)' }} data-testid="gem2i-services-banner">
          <div className="max-w-7xl mx-auto px-6 md:px-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <p className="text-white text-lg md:text-xl font-medium" style={{ textWrap: 'balance' }}>{tt(c.services_banner.text)}</p>
            <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('gem2i:open-contact'))}
              className="shrink-0 px-6 py-2.5 text-[15px] font-semibold rounded-sm bg-white transition-opacity hover:opacity-85"
              style={{ color: 'var(--color-accent, #3287B7)' }} data-testid="gem2i-banner-contact">
              {tt({ en: 'Contact Us', es: 'Contáctanos' })}
            </button>
          </div>
        </section>
      )}

      </>),
    services: () => <GemServicesGrid services={override(c.services, 'aurex_services_cfg')} banner={c.services_banner} />,
    legacy_services: () => (<>
      {/* SERVICES */}
      {c.services && Array.isArray(c.services.items) && c.services.items.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 md:px-10 py-20 md:py-28" data-testid="gem2i-services">
          <SectionHeading kicker={tt(c.services.kicker)} title={tt(c.services.title)} />
          <ul className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-x-14">
            {c.services.items.map((item, i) => (
              <li key={i} className="py-4 border-b flex items-baseline gap-4" style={{ borderColor: 'var(--color-card-border, rgba(255,255,255,0.08))' }}>
                <span className="text-xs tabular-nums" style={{ color: 'var(--color-accent, #3287B7)' }}>{String(i + 1).padStart(2, '0')}</span>
                <span className="text-white/90 text-[15px] font-medium">{tt(item)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      </>),
    gem_methodology: () => (methodologyItems.length > 0
      ? (isTpl01
        ? <GemMethodCycle config={smCfg('gem_methodology')} items={methodologyItems} brand={brand} />
        : <GemSteps config={smCfg('gem_methodology')} items={methodologyItems} testid="gem2i-methodology" />)
      : (<>
      {/* METHODOLOGY — a real 3-step sequence (legacy 1/2/3) */}
      {c.methodology && Array.isArray(c.methodology.steps) && c.methodology.steps.length > 0 && (
        <section style={{ backgroundColor: 'var(--color-section-bg, #0A121A)' }} data-testid="gem2i-methodology">
          <div className="max-w-7xl mx-auto px-6 md:px-10 py-20 md:py-28">
            <SectionHeading kicker={tt(c.methodology.kicker)} title={tt(c.methodology.title)} />
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-10">
              {c.methodology.steps.map((s, i) => (
                <div key={i}>
                  <span className="block text-5xl font-bold leading-none mb-5" style={{ color: 'var(--color-accent, #3287B7)', opacity: 0.9 }}>{i + 1}</span>
                  <h3 className="text-white text-lg font-semibold mb-3">{tt(s.title)}</h3>
                  <p className="text-[15px] md:text-base leading-[1.7]" style={{ color: 'var(--color-body-text, #9AA6B2)' }}>{tt(s.text)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      </>)),
    gem_festivals: () => isTpl01
      ? <GemFestivalBento config={smCfg('gem_festivals_cfg')} items={festivals} />
      : <LogoCarousel
        section={withCatalogItems(override(c.festivals, 'gem_festivals_cfg'), festivals.slice(0, limitOf('gem_festivals_cfg')), f => ({
          title: f.title, url: `/festivals/${f.slug}`, date: f.range_dates || f.event_date,
          image: gemImg(f.image_urls?.flyer) || gemImg(f.image_urls?.logo),
        }))}
        testid="gem2i-festivals" />,
    gem_conferences: () => isTpl01
      ? <GemConferenceCards config={smCfg('gem_conferences_cfg')} items={conferences} />
      : <LogoCarousel
        section={withCatalogItems(override(c.conferences, 'gem_conferences_cfg'), conferences.slice(0, limitOf('gem_conferences_cfg')), cf => ({
          title: cf.title, url: `/conferences/${cf.slug}`, date: cf.range_dates || cf.event_date,
          image: gemImg(cf.image_urls?.logo) || gemImg(cf.image_urls?.flyer),
        }))}
        testid="gem2i-conferences" />,
    gem_media: () => (<>
      {/* MEDIA */}
      {c.media && Array.isArray(c.media.videos) && c.media.videos.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 md:px-10 py-20 md:py-28" data-testid="gem2i-media">
          <div className="flex items-end justify-between gap-6 flex-wrap">
            <SectionHeading kicker={tt(c.media.kicker)} title={tt(c.media.title)} />
            <Link to="/media" className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-white" style={{ color: 'var(--color-link, #5FB2E0)' }}>
              <Play className="w-3.5 h-3.5" /> {tt(c.media.see_all) || tt({ en: 'See all videos', es: 'Ver todos los videos' })}
            </Link>
          </div>
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {c.media.videos.map((v, i) => (
              <div key={i} className="aspect-video rounded-sm overflow-hidden bg-black/40">
                <iframe
                  src={`https://www.youtube.com/embed/${v.youtube_id}`}
                  title={tt(v.title) || `video-${i}`}
                  className="w-full h-full"
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ))}
          </div>
        </section>
      )}

      </>),
    gem_clients: () => (isTpl01 ? (() => {
      const cl = override(c.clients, 'gem_clients_cfg');
      if (!cl) return null;
      // Section Manager (Clients — Section Configuration) wins over the gem_config defaults.
      const cfg = smCfg('gem_clients_cfg');
      const logos = (cl.logos?.length > 0 ? cl.logos : clientLogos).slice(0, limitOf('gem_clients_cfg', 12));
      return <GemClientsGrid kicker={tt(cl.kicker)} title={tt(cl.title)} text={tt(cfg.subtitle) || tt(cl.text)} logos={logos}
        ctaText={tt(cfg.cta_text)} ctaUrl={cfg.cta_url} ctaNewTab={!!cfg.cta_new_tab} />;
    })() : (<>
      {/* CLIENTS */}
      {override(c.clients, 'gem_clients_cfg') && (
        <section className="max-w-7xl mx-auto px-6 md:px-10 py-20 md:py-28" data-testid="gem2i-clients">
          <SectionHeading kicker={tt(override(c.clients, 'gem_clients_cfg').kicker)} title={tt(override(c.clients, 'gem_clients_cfg').title)} />
          <p className="mt-6 max-w-3xl text-base md:text-[17px] leading-[1.7]" style={{ color: 'var(--color-body-text, #9AA6B2)' }}>
            {tt(override(c.clients, 'gem_clients_cfg').text)}
          </p>
          {(override(c.clients, 'gem_clients_cfg').logos?.length > 0 ? override(c.clients, 'gem_clients_cfg').logos : clientLogos).length > 0 && (
            <div className="mt-10 flex flex-wrap items-center gap-x-12 gap-y-8">
              {(override(c.clients, 'gem_clients_cfg').logos?.length > 0 ? override(c.clients, 'gem_clients_cfg').logos : clientLogos).map((l, i) => (
                l.url
                  ? <a key={i} href={l.url} target="_blank" rel="noreferrer" className="opacity-70 hover:opacity-100 transition-opacity"><img src={l.image} alt={l.name || 'client'} className="h-10 w-auto object-contain" /></a>
                  : <img key={i} src={l.image} alt={l.name || 'client'} className="h-10 w-auto object-contain opacity-70" />
              ))}
            </div>
          )}
        </section>
      )}
      </>)),
    gem_events: () => (isTpl01
      ? <GemEventPosters config={smCfg('gem_events_cfg')} items={events.slice(0, limitOf('gem_events_cfg'))} />
      : <GemCatalogStrip config={smCfg('gem_events_cfg')} fallbackTitle={{ en: 'Upcoming events', es: 'Próximos eventos' }} testid="gem2i-events"
        items={events.slice(0, limitOf('gem_events_cfg')).map(e => ({
          title: e.title, url: `/events/${e.slug}`, meta: e.event_date, metaIcon: 'date',
          image: gemImg(e.image_urls?.flyer) || gemImg(e.image_urls?.logo),
        }))} />
    ),
    gem_artists: () => (isTpl01
      ? <GemArtistMosaic config={smCfg('gem_artists_cfg')} items={artists} />
      : <GemCatalogStrip config={smCfg('gem_artists_cfg')} fallbackTitle={{ en: 'Artists', es: 'Artistas' }} testid="gem2i-artists" square
        items={artists.slice(0, limitOf('gem_artists_cfg')).map(a => ({
          title: a.title || a.name, url: `/artists/${a.slug}`, meta: a.country, metaIcon: 'place',
          image: gemImg(a.image_urls?.photo) || gemImg(a.image_urls?.main) || gemImg(Object.values(a.image_urls || {})[0]),
        }))} />
    ),
    gem_venues: () => (isTpl01
      ? <GemVenueGrid config={smCfg('gem_venues_cfg')} items={venues} limit={Math.min(limitOf('gem_venues_cfg', 12), 12)} />
      : <GemCatalogStrip config={smCfg('gem_venues_cfg')} fallbackTitle={{ en: 'Venues', es: 'Venues' }} testid="gem2i-venues" square
        items={venues.slice(0, limitOf('gem_venues_cfg')).map(v => ({
          title: v.name || v.title, url: `/venues/${v.slug}`, meta: [v.city, v.country].filter(Boolean).join(', '), metaIcon: 'place',
          image: gemImg(v.image_urls?.logo) || gemImg(v.image_urls?.photo) || gemImg(Object.values(v.image_urls || {})[0]),
        }))} />
    ),
    // Template 01 = approved bocetos A-3 / P-1; P-2 is reserved for 02/03.
    aurex_audience: () => (isTpl01 ? <GemAudienceList {...(sm.aurex_audience || {})} /> : <GemAudience {...(sm.aurex_audience || {})} />),
    aurex_process: () => (isTpl01 ? <GemTimeline {...(sm.aurex_process || {})} /> : <GemSteps {...(sm.aurex_process || {})} />),
    aurex_pricing: () => (isTpl01 ? <GemPricingTiers {...(sm.aurex_pricing || {})} /> : <GemPricing {...(sm.aurex_pricing || {})} />),
    aurex_team: () => (isTpl01 ? <GemTeamPortraits {...(sm.aurex_team || {})} /> : <GemTeam {...(sm.aurex_team || {})} />),
    aurex_video: () => (isTpl01 ? <GemVideoCover {...(sm.aurex_video || {})} /> : <GemVideo {...(sm.aurex_video || {})} />),
    aurex_partners: () => (isTpl01 ? <GemLogoMarquee {...(sm.aurex_partners || {})} testid="gem2i-partners" /> : <GemLogos {...(sm.aurex_partners || {})} testid="gem2i-partners" />),
    aurex_clients: () => <GemLogos {...(sm.aurex_clients || {})} testid="gem2i-aurex-clients" />,
    testimonials: () => (isTpl01 ? <GemTestimonialSpotlight config={smCfg('aurex_testimonials_cfg')} items={testimonials} /> : <GemTestimonials config={smCfg('aurex_testimonials_cfg')} items={testimonials} />),
    contact: () => <GemContactSection />,
    news_ticker: () => <GemTicker config={smCfg('news_ticker')} />,
    gem_conf_reviews: () => <GemConferenceReviews config={smCfg('gem_conf_reviews')} items={sm.gem_conf_reviews?.items || []} />,
    gem_news: () => <GemNewsCards config={smCfg('aurex_blog_cfg')} items={news} />,
    map: () => (isTpl01
      ? <GemModernMaps tabs={mapTabs} cmsConfig={smCfg('aurex_locations_cfg')} mapsLang={settings.maps_language || 'local'} />
      : <GemLocations config={smCfg('aurex_locations_cfg')} maps={maps} />),
    gallery: () => (isTpl01 ? <GemGalleryMosaic config={smCfg('aurex_gallery_cfg')} items={gallery} /> : <GemGallery config={smCfg('aurex_gallery_cfg')} items={gallery} />),
  };

  // A saved Page Builder order predates sections added later: slot each missing
  // default key right after its predecessor so new sections show up.
  const saved = (layout.section_order && layout.section_order.some(k => renderers[k])) ? layout.section_order : null;
  const order = saved ? DEFAULT_ORDER.reduce((acc, k, i) => {
    if (acc.includes(k)) return acc;
    const prev = DEFAULT_ORDER.slice(0, i).reverse().find(p => acc.includes(p));
    const at = prev ? acc.indexOf(prev) + 1 : 0;
    return [...acc.slice(0, at), k, ...acc.slice(at)];
  }, [...saved]) : DEFAULT_ORDER;
  const visibility = layout.sections || {};
  const sectionCfg = layout.section_configs || {};

  // Lighting preview (?look=l1|l2|l3) overrides the Page Builder colours for
  // its sections; otherwise each section uses its Page Builder bg_color.
  const look = LOOKS[readLook()] || null;
  return (
    <div className={`${look?.root || ''}`} style={{ backgroundColor: 'var(--color-page-bg, #04080C)', fontFamily: GEM_FONT }} data-testid="gem2i-home" data-look={readLook() || 'off'}>
      {order.filter(k => renderers[k] && visibility[k]?.enabled !== false).map(k => {
        const cfg = sectionCfg[k] || {};
        const font = AUREX_FONTS.find(f => f.key === cfg.font_family)?.css;
        // hero / ticker / video carry their own imagery: never repainted
        const paintable = !['hero', 'legacy_hero', 'news_ticker', 'aurex_video'].includes(k);
        const bg = paintable ? ((look && look.bg[k]) || cfg.bg_color || null) : null;
        // Optional background image (Page Builder): painted under a veil of the
        // section colour (or the night default) at bg_overlay %, so the text
        // tone still follows that colour. No image → plain colour as before.
        const img = paintable && cfg.bg_image ? gemImg(cfg.bg_image) : null;
        const veilBase = bg && !String(bg).startsWith('linear') ? bg : '#04080C';
        const tone = toneOf(img ? veilBase : bg);
        const veil = img ? `color-mix(in srgb, ${veilBase} ${Math.min(95, Math.max(0, Number(cfg.bg_overlay ?? 70)))}%, transparent)` : null;
        const paint = img
          ? { backgroundImage: `linear-gradient(${veil}, ${veil}), url("${img}")`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: veilBase }
          : (bg ? { background: bg } : {});
        const style = (img || bg || font) ? { ...paint, ...(font ? { fontFamily: font } : {}) } : undefined;
        const cls = (img || bg) ? `gem-has-bg gem-tone-${tone || 'dark'}${img ? ' gem-has-img' : ''}` : undefined;
        return <div key={k} className={cls} style={style} data-section={k}>{renderers[k]()}</div>;
      })}
    </div>
  );
}

/** Merge CMS-entered carousel items with live catalog docs: operator-entered
 *  CMS items win; otherwise the catalog feed maps into the same item shape. */
function withCatalogItems(section, docs, toItem) {
  if (!section) return null;
  if (Array.isArray(section.items) && section.items.length > 0) return section;
  return { ...section, items: (docs || []).map(toItem) };
}

/** Legacy gem2i stacked section heading — small kicker over big title. */
function SectionHeading({ kicker, title }) {
  return (
    <div>
      {kicker && <p className="gem-eyebrow mb-3" style={{ color: 'var(--color-accent, #3287B7)' }}>{kicker}</p>}
      <h2 className="text-white font-bold leading-[1.08]" style={{ fontSize: 'clamp(1.9rem, 3.6vw, 2.9rem)' }}><AccentTitle text={title} /></h2>
    </div>
  );
}

/** Festivals / conferences strip — logo/photo items with a detail link.
 *  Renders nothing until the Phase-2 catalogs populate `items`. */
function LogoCarousel({ section, testid }) {
  const tt = useT();
  if (!section || !Array.isArray(section.items) || section.items.length === 0) return null;
  return (
    <section className="max-w-7xl mx-auto px-6 md:px-10 py-16" data-testid={testid}>
      <SectionHeading kicker={tt(section.kicker)} title={tt(section.title)} />
      <div className="mt-10 flex gap-8 overflow-x-auto pb-4">
        {section.items.map((item, i) => (
          <Link key={i} to={item.url || '#'} className="shrink-0 w-48 group">
            <div className="aspect-square rounded-sm overflow-hidden mb-3" style={{ backgroundColor: 'var(--color-card-bg, #0D1721)' }}>
              {item.image && <img src={item.image} alt={tt(item.title) || ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 motion-reduce:transition-none" />}
            </div>
            <p className="text-white/85 text-sm font-medium group-hover:text-white transition-colors">{tt(item.title)}</p>
            {item.date && <p className="text-xs mt-0.5" style={{ color: 'var(--color-body-text, #9AA6B2)' }}>{item.date}</p>}
          </Link>
        ))}
      </div>
    </section>
  );
}
