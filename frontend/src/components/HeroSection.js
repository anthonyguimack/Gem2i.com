import React, { useState, useEffect, useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import { useTheme } from '../App';
import { useT } from '../lib/i18n';
import { normalizeRichText } from '../lib/richText';
import { toLeftPct, toTopPct, effectStyle as heroEffectStyle, HERO_KEYFRAMES } from '../lib/heroCoords';

function resolveVideoEmbed(url) {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?\s]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  if (url.startsWith('<iframe')) {
    const srcMatch = url.match(/src=["']([^"']+)["']/);
    if (srcMatch) return srcMatch[1];
  }
  return url;
}

function VideoEmbed({ url, style, className }) {
  const embedUrl = resolveVideoEmbed(url);
  if (!embedUrl) return null;
  return (
    <div className={className} style={style}>
      <iframe src={embedUrl} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen frameBorder="0" title="Hero Video" />
    </div>
  );
}

// Renders up to 3 CTAs as an inline pill row. First is the solid primary,
// rest are outlined secondary. Order/visibility is admin-controlled via the
// respective button_text fields on the slide.
function HeroButtonsRow({ slide, size = 'md', dataTestId }) {
  const tt = useT();
  const buttons = [
    { text: slide.button_text,   url: slide.button_url   || slide.button_link, target: slide.window_open === 'new' ? '_blank' : '_self' },
    { text: slide.button_2_text, url: slide.button_2_url, target: slide.button_2_window_open === 'new' ? '_blank' : '_self' },
    { text: slide.button_3_text, url: slide.button_3_url, target: slide.button_3_window_open === 'new' ? '_blank' : '_self' },
  ].filter(b => tt(b.text));
  if (buttons.length === 0) return null;
  const padding = size === 'sm' ? 'px-6 py-2.5' : 'px-8 py-3';
  return (
    <div className="flex flex-wrap items-center gap-3" data-testid={dataTestId || 'hero-cta-row'}>
      {buttons.map((b, i) => {
        const primary = i === 0;
        return (
          <a key={i} href={tt(b.url) || '#'} target={b.target} rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 ${padding} rounded-sm font-medium transition-all text-sm hover:opacity-90 ${primary ? 'bg-white' : 'bg-transparent border-2 border-white text-white hover:bg-white hover:text-[#1a2332]'}`}
            style={primary ? { color: 'var(--color-primary, #1a2332)' } : undefined}
            data-testid={`hero-cta-btn-${i}`}
          >
            {tt(b.text)} {primary && <ArrowRight className="w-4 h-4" />}
          </a>
        );
      })}
    </div>
  );
}

export default function HeroSection({ data, slides }) {
  const theme = useTheme();
  const tt = useT();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const allSlides = useMemo(() => slides && slides.length > 0 ? slides : (data?.title ? [data] : []), [slides, data]);

  useEffect(() => {
    if (allSlides.length <= 1) return;
    const s = allSlides[currentSlide];
    const delay = s?.delay || 9400;
    const timer = setTimeout(() => {
      setCurrentSlide(prev => (prev + 1) % allSlides.length);
      setAnimKey(prev => prev + 1);
    }, delay);
    return () => clearTimeout(timer);
  }, [currentSlide, allSlides]);

  if (allSlides.length === 0) return null;
  const slide = allSlides[currentSlide];
  const isLegacy = !slide.slide_type;
  const bg = slide.background || slide.background_image || '';
  const speed = slide.speed_per_layer || 400;

  const effectStyle = (effect, startDelay) => heroEffectStyle(effect, startDelay, speed);

  const isModernLike = theme === 'modern' || theme === 'aurex' || theme === 'personalbrand';
  const heroClasses = isModernLike
    ? 'relative min-h-[750px] md:min-h-[800px] flex items-center overflow-hidden'
    : theme === 'classic'
    ? 'relative min-h-[500px] md:min-h-[550px] flex items-center overflow-hidden'
    : 'relative min-h-[600px] md:min-h-[700px] flex items-center overflow-hidden';

  const overlayStyle = isModernLike
    ? { background: `linear-gradient(135deg, rgba(15,23,42,0.85), rgba(30,41,59,0.7))` }
    : theme === 'classic'
    ? { background: `linear-gradient(to right, var(--color-primary, #1a2332)f0, var(--color-primary, #1a2332)80)` }
    : { background: `linear-gradient(to right, var(--color-primary, #1a2332)ee, var(--color-primary, #1a2332)99)` };

  return (
    <section className={heroClasses} data-testid="hero-section">
      <style>{HERO_KEYFRAMES}</style>
      <div className="absolute inset-0 bg-cover bg-center transition-all duration-700" style={{ backgroundImage: bg ? `url(${bg})` : 'none' }} />
      <div className="absolute inset-0" style={overlayStyle} />

      <div className="relative max-w-7xl mx-auto px-6 md:px-12 py-20 w-full" key={animKey}>
        {isLegacy ? (
          <>
            <p className="text-xs uppercase tracking-[0.3em] font-semibold mb-4" style={{ color: 'var(--color-accent, #0D9488)' }} data-testid="hero-subtitle">{tt(slide.subtitle)}</p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight max-w-2xl" style={{ fontFamily: 'Playfair Display, serif' }} data-testid="hero-title">
              {tt(slide.title)?.split('\n').map((line, i) => <React.Fragment key={i}>{i > 0 && <br />}<span className={i > 0 ? 'italic' : ''}>{line}</span></React.Fragment>)}
            </h1>
            <p className="text-white/70 mt-6 max-w-xl text-base md:text-lg leading-relaxed" data-testid="hero-description">{tt(slide.description)}</p>
            <div className="mt-8"><HeroButtonsRow slide={slide} /></div>
          </>
        ) : (
          <>
            {/* Desktop (lg+): Absolute positioning from CMS coordinates */}
            <div className="relative w-full hidden lg:block" style={{ minHeight: '400px' }}>
              {slide.title && (
                <div className="absolute max-w-[55%]" style={{ left: toLeftPct(slide.title_x, 100), top: toTopPct(slide.title_y, 50), ...effectStyle(slide.title_effect, slide.title_start) }} data-testid="hero-title">
                  <div className="text-5xl xl:text-6xl font-bold leading-tight [&_em]:italic" style={{ fontFamily: 'Playfair Display, serif', color: 'white' }} dangerouslySetInnerHTML={{ __html: normalizeRichText(tt(slide.title)) }} />
                </div>
              )}
              {slide.subtitle && (
                <div className="absolute max-w-[55%]" style={{ left: toLeftPct(slide.subtitle_x, 100), top: toTopPct(slide.subtitle_y, 80), ...effectStyle(slide.subtitle_effect, slide.subtitle_start) }} data-testid="hero-subtitle-lg">
                  <div className="text-xl font-semibold [&_em]:italic" style={{ fontFamily: 'Playfair Display, serif', color: 'white' }} dangerouslySetInnerHTML={{ __html: normalizeRichText(tt(slide.subtitle)) }} />
                </div>
              )}
              {slide.description && (
                <div className="absolute max-w-[45%]" style={{ left: toLeftPct(slide.description_x, 100), top: toTopPct(slide.description_y, 120), ...effectStyle(slide.description_effect, slide.description_start) }} data-testid="hero-description-lg">
                  <div className="text-lg leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }} dangerouslySetInnerHTML={{ __html: normalizeRichText(tt(slide.description)) }} />
                </div>
              )}
              {(slide.button_text || slide.button_2_text || slide.button_3_text) && (
                <div className="absolute" style={{ left: toLeftPct(slide.button_x, 100), top: toTopPct(slide.button_y, 180), ...effectStyle(slide.button_effect, slide.button_start) }}>
                  <HeroButtonsRow slide={slide} dataTestId="hero-cta-btn-lg" />
                </div>
              )}
              {(slide.slide_type === 'video' && slide.video_embed) && (
                <div className="absolute" style={{ left: toLeftPct(slide.media_x, 400), top: toTopPct(slide.media_y, 50), width: slide.media_width ? `${slide.media_width}px` : '420px', ...effectStyle(slide.media_effect, slide.media_start) }}>
                  <VideoEmbed url={slide.video_embed} className="rounded-lg overflow-hidden shadow-2xl aspect-video" style={slide.media_height ? { height: `${slide.media_height}px`, aspectRatio: 'unset' } : {}} />
                </div>
              )}
              {(slide.slide_type === 'photo' && slide.photo) && (
                <div className="absolute" style={{ left: toLeftPct(slide.media_x, 400), top: toTopPct(slide.media_y, 50), width: slide.media_width ? `${slide.media_width}px` : '420px', ...effectStyle(slide.media_effect, slide.media_start) }}>
                  <img src={slide.photo} alt="" className="rounded-lg shadow-2xl w-full object-cover" style={slide.media_height ? { maxHeight: `${slide.media_height}px` } : { maxHeight: '400px' }} />
                </div>
              )}
            </div>

            {/* Mobile & Tablet (below lg): Stacked flow layout */}
            <div className="lg:hidden flex flex-col items-start gap-4">
              {(slide.slide_type === 'photo' && slide.photo) && (
                <div className="w-full max-w-sm mx-auto mb-2" style={effectStyle(slide.media_effect, slide.media_start)}>
                  <img src={slide.photo} alt="" className="rounded-lg shadow-2xl w-full object-cover max-h-[250px]" />
                </div>
              )}
              {(slide.slide_type === 'video' && slide.video_embed) && (
                <div className="w-full max-w-sm mx-auto mb-2" style={effectStyle(slide.media_effect, slide.media_start)}>
                  <VideoEmbed url={slide.video_embed} className="rounded-lg overflow-hidden shadow-2xl aspect-video" />
                </div>
              )}
              {slide.title && (
                <div style={effectStyle(slide.title_effect, slide.title_start)} data-testid="hero-title">
                  <div className="text-3xl sm:text-4xl font-bold leading-tight [&_em]:italic" style={{ fontFamily: 'Playfair Display, serif', color: 'white' }} dangerouslySetInnerHTML={{ __html: normalizeRichText(tt(slide.title)) }} />
                </div>
              )}
              {slide.subtitle && (
                <div style={effectStyle(slide.subtitle_effect, slide.subtitle_start)} data-testid="hero-subtitle">
                  <div className="text-base sm:text-lg font-semibold [&_em]:italic" style={{ fontFamily: 'Playfair Display, serif', color: 'white' }} dangerouslySetInnerHTML={{ __html: normalizeRichText(tt(slide.subtitle)) }} />
                </div>
              )}
              {slide.description && (
                <div style={effectStyle(slide.description_effect, slide.description_start)} data-testid="hero-description">
                  <div className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }} dangerouslySetInnerHTML={{ __html: normalizeRichText(tt(slide.description)) }} />
                </div>
              )}
              {(slide.button_text || slide.button_2_text || slide.button_3_text) && (
                <div style={effectStyle(slide.button_effect, slide.button_start)} className="mt-2">
                  <HeroButtonsRow slide={slide} size="sm" />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Slide indicators */}
      {allSlides.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {allSlides.map((_, i) => (
            <button key={i} onClick={() => { setCurrentSlide(i); setAnimKey(p => p + 1); }}
              className={`w-2.5 h-2.5 rounded-full transition-all ${i === currentSlide ? 'bg-white scale-110' : 'bg-white/30 hover:bg-white/50'}`}
              data-testid={`hero-dot-${i}`} />
          ))}
        </div>
      )}
    </section>
  );
}
