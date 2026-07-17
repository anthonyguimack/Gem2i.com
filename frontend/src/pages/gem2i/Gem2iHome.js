import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Play } from 'lucide-react';
import HeroSection from '../../components/HeroSection';
import { publicAPI, gemAPI } from '../../lib/api';
import { gemImg } from '../../components/gem2i/GemCatalogBits';
import { useSettings } from '../../App';
import { useT } from '../../lib/i18n';

const GEM_FONT = "'Poppins', sans-serif";

/**
 * gem2i homepage (GEM2I_MIGRATION_PLAN Phase 1 / §2): hero slides → intro →
 * featured blurbs → services banner + grid → methodology → festivals /
 * conferences carousels (Phase-2 data; hidden while empty) → media block →
 * clients. All copy is CMS-driven from gem_config content (EN/ES).
 */
export default function Gem2iHome() {
  const settings = useSettings();
  const tt = useT();
  const [content, setContent] = useState(null);
  const [heroSlides, setHeroSlides] = useState([]);
  const [festivals, setFestivals] = useState([]);
  const [conferences, setConferences] = useState([]);
  const [clientLogos, setClientLogos] = useState([]);

  useEffect(() => {
    publicAPI.getGemContent().then(r => setContent(r.data || {})).catch(() => setContent({}));
    publicAPI.getHeroSlides('home').then(r => setHeroSlides(r.data || [])).catch(() => {});
    // Phase-2 catalogs light up the legacy homepage carousels.
    gemAPI.festivals({ limit: 12 }).then(r => setFestivals(r.data?.items || [])).catch(() => {});
    gemAPI.conferences({ limit: 12 }).then(r => setConferences(r.data?.items || [])).catch(() => {});
    gemAPI.clients().then(r => setClientLogos((r.data?.items || []).map(cl => ({
      name: cl.title, url: cl.url, image: cl.image_urls?.on?.startsWith('/api')
        ? `${process.env.REACT_APP_BACKEND_URL || ''}${cl.image_urls.on}` : cl.image_urls?.on,
    })))).catch(() => {});
  }, []);

  if (!content) {
    return <div className="min-h-screen" style={{ backgroundColor: 'var(--color-page-bg, #04080C)' }} />;
  }

  const c = content;
  const brand = tt(settings.brand_name) || 'GEM2i';

  return (
    <div style={{ backgroundColor: 'var(--color-page-bg, #04080C)', fontFamily: GEM_FONT }} data-testid="gem2i-home">

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

      {/* FEATURED — venues / events / artists */}
      {Array.isArray(c.featured) && c.featured.length > 0 && (
        <section style={{ backgroundColor: 'var(--color-section-bg, #0A121A)' }} data-testid="gem2i-featured">
          <div className="max-w-7xl mx-auto px-6 md:px-10 py-20 grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-10">
            {c.featured.map((f, i) => (
              <div key={i} className="md:px-2">
                <p className="text-xs font-medium uppercase tracking-[0.25em] mb-2" style={{ color: 'var(--color-accent, #3287B7)' }}>{tt(f.kicker)}</p>
                <h3 className="text-white text-2xl font-bold tracking-wide mb-4">{tt(f.title)}</h3>
                <p className="text-sm leading-[1.85] mb-5" style={{ color: 'var(--color-body-text, #9AA6B2)' }}>{tt(f.text)}</p>
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

      {/* SERVICES BANNER */}
      {c.services_banner && (
        <section className="py-10" style={{ backgroundColor: 'var(--color-accent, #3287B7)' }} data-testid="gem2i-services-banner">
          <div className="max-w-7xl mx-auto px-6 md:px-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <p className="text-white text-lg md:text-xl font-medium" style={{ textWrap: 'balance' }}>{tt(c.services_banner.text)}</p>
            <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('gem2i:open-contact'))}
              className="shrink-0 px-6 py-2.5 text-sm font-semibold uppercase tracking-wider rounded-sm bg-white transition-opacity hover:opacity-85"
              style={{ color: 'var(--color-accent, #3287B7)' }} data-testid="gem2i-banner-contact">
              {tt({ en: 'Contact Us', es: 'Contáctanos' })}
            </button>
          </div>
        </section>
      )}

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
                  <p className="text-sm leading-[1.85]" style={{ color: 'var(--color-body-text, #9AA6B2)' }}>{tt(s.text)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FESTIVALS / CONFERENCES — live Phase-2 catalog data (CMS items win if entered) */}
      <LogoCarousel
        section={withCatalogItems(c.festivals, festivals, f => ({
          title: f.title, url: `/festivals/${f.slug}`, date: f.range_dates || f.event_date,
          image: gemImg(f.image_urls?.flyer) || gemImg(f.image_urls?.logo),
        }))}
        testid="gem2i-festivals" />
      <LogoCarousel
        section={withCatalogItems(c.conferences, conferences, cf => ({
          title: cf.title, url: `/conferences/${cf.slug}`, date: cf.range_dates || cf.event_date,
          image: gemImg(cf.image_urls?.logo) || gemImg(cf.image_urls?.flyer),
        }))}
        testid="gem2i-conferences" />

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

      {/* CLIENTS */}
      {c.clients && (
        <section className="max-w-7xl mx-auto px-6 md:px-10 py-20 md:py-28" data-testid="gem2i-clients">
          <SectionHeading kicker={tt(c.clients.kicker)} title={tt(c.clients.title)} />
          <p className="mt-6 max-w-3xl text-sm md:text-[15px] leading-[1.85]" style={{ color: 'var(--color-body-text, #9AA6B2)' }}>
            {tt(c.clients.text)}
          </p>
          {(c.clients.logos?.length > 0 ? c.clients.logos : clientLogos).length > 0 && (
            <div className="mt-10 flex flex-wrap items-center gap-x-12 gap-y-8">
              {(c.clients.logos?.length > 0 ? c.clients.logos : clientLogos).map((l, i) => (
                l.url
                  ? <a key={i} href={l.url} target="_blank" rel="noreferrer" className="opacity-70 hover:opacity-100 transition-opacity"><img src={l.image} alt={l.name || 'client'} className="h-10 w-auto object-contain" /></a>
                  : <img key={i} src={l.image} alt={l.name || 'client'} className="h-10 w-auto object-contain opacity-70" />
              ))}
            </div>
          )}
        </section>
      )}
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
      {kicker && <p className="text-xs font-medium uppercase tracking-[0.3em] mb-1.5" style={{ color: 'var(--color-accent, #3287B7)' }}>{kicker}</p>}
      <h2 className="text-white font-bold" style={{ fontSize: 'clamp(1.6rem, 3.2vw, 2.5rem)' }}>{title}</h2>
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
