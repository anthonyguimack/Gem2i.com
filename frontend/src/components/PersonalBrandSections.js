/**
 * Personal Brand Pro — Digitak-inspired homepage section components.
 *
 * Design language (from live Digitak analysis):
 *  • Font: Plus Jakarta Sans 800/900 for headings, 400/500 for body
 *  • Colors: all via CSS vars (operator-configurable from CMS → Settings → Colors)
 *  • Dark sections: near-black #0f0f0f; Light sections: white or var(--color-bg)
 *  • Accent: var(--color-primary) — eyebrows, bullets, markers, marquees, stat tiles
 *  • Animations: marquee scroll, horizontal team carousel, scroll-reveal (shared Reveal)
 *  • Buttons: rounded-full pill; outline → fills on hover
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, ArrowUpRight, Send, Loader2, Phone, BookOpen,
  Facebook, Instagram, Youtube, Github, Globe,
} from 'lucide-react';
import * as lucide from 'lucide-react';
import { toast } from 'sonner';
import { Reveal } from './AurexSections';
import { normalizeRichText } from '../lib/richText';
import { useT } from '../lib/i18n';
import { useLang, itemHasLocale } from '../lib/i18n';
import { toLeftPct, toTopPct, effectStyle as heroEffectStyle, HERO_KEYFRAMES } from '../lib/heroCoords';
import { contactAPI } from '../lib/api';
import CaptchaWidget from './CaptchaWidget';
import { useSettings } from '../App';
import { BACKEND_URL as API } from '../lib/config';

const resolveImg = (src) => (src && src.startsWith('/api') ? `${API}${src}` : src);

// Given a bg hex from the CMS palette, return text color that contrasts it.
// Falls back to `defaultColor` when no bg override is set.
const pbTextFor = (bg, defaultColor) => {
  if (!bg || !bg.startsWith('#')) return defaultColor;
  return pbIsDark(bg) ? '#ffffff' : '#111111';
};
// Secondary / muted text — slightly transparent version of the text color.
const pbSubFor = (bg, defaultColor) => {
  if (!bg || !bg.startsWith('#')) return defaultColor;
  return pbIsDark(bg) ? 'rgba(255,255,255,0.65)' : '#475569';
};
// Border color that reads on both dark and light section backgrounds.
const pbBorderFor = (isDark) =>
  isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)';
// Role / label / secondary text shown on the template's fixed-dark surfaces
// (testimonial cards, team hover overlay, portfolio captions). Reuses the same
// on-dark colour that PBEyebrow already uses, so these labels stay readable even
// when the brand primary colour is itself dark — they were hardcoded to
// var(--color-primary), which disappeared on a dark background.
const PB_LABEL_ON_DARK = 'rgba(255,255,255,0.75)';
const PB_FONT = "'Plus Jakarta Sans', 'Inter', sans-serif";

// ─── Shared helpers ──────────────────────────────────────────────────────────

// Returns true when bg is "dark" (Gray 700 #374151 or darker → white text).
// BT.601 luma threshold = 0.300:
//   Gray 700 (#374151) luma ≈ 0.2503 → dark ✓   white text
//   Gray 200 (#E5E7EB) luma ≈ 0.9053 → light ✓  black text
// All PB sections use this so changing the CMS bg drives all text colors.
function pbIsDark(bg, defaultDark = false) {
  if (!bg || !bg.startsWith('#')) return defaultDark;
  let h = bg.slice(1);
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (h.length !== 6) return defaultDark;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 255000 <= 0.300;
}

function pbShell(bg, extra = '') {
  return { style: { backgroundColor: bg, fontFamily: PB_FONT }, className: `pb-section ${extra}` };
}

const stripHtml = (h) => (h || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

// Eyebrow label — section number + small label above the title.
// onDark=true  → white/70 so it reads on Gray 700+ backgrounds.
// onDark=false → var(--color-primary) for brand accent on light backgrounds.
function PBEyebrow({ number, text, onDark = false }) {
  const tt = useT();
  const label = tt(text);
  if (!label && !number) return null;
  return (
    <p
      className="text-[11px] font-semibold uppercase tracking-[0.25em] mb-5"
      style={{ color: onDark ? 'rgba(255,255,255,0.75)' : 'var(--color-primary)' }}
    >
      {number && <span className="mr-1">{number}/</span>}
      {label}
    </p>
  );
}

// Pill CTA button — outline style that fills on hover
function PBButton({ href, text, newTab, filled = false, size = 'md', className = '', onClick }) {
  const tt = useT();
  const label = tt(text);
  if (!label) return null;
  const pad = size === 'lg' ? 'px-9 py-3.5 text-base' : 'px-7 py-2.5 text-sm';
  return (
    <a
      href={tt(href) || '#'}
      target={newTab ? '_blank' : '_self'}
      rel={newTab ? 'noopener noreferrer' : undefined}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full font-semibold transition-all duration-300 group ${pad} ${className}`}
      style={
        filled
          ? { backgroundColor: 'var(--color-button-bg)', color: 'var(--color-button-text)', border: '2px solid var(--color-button-bg)' }
          : { backgroundColor: 'transparent', color: 'inherit', border: '2px solid currentColor' }
      }
      onMouseEnter={e => {
        if (!filled) {
          e.currentTarget.style.backgroundColor = 'var(--color-button-bg)';
          e.currentTarget.style.color = 'var(--color-button-text)';
          e.currentTarget.style.borderColor = 'var(--color-button-bg)';
        }
      }}
      onMouseLeave={e => {
        if (!filled) {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = 'inherit';
          e.currentTarget.style.borderColor = 'currentColor';
        }
      }}
    >
      {label} <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
    </a>
  );
}

// ─── CSS injection (once) ────────────────────────────────────────────────────
if (typeof document !== 'undefined' && !document.getElementById('pb-keyframes')) {
  const style = document.createElement('style');
  style.id = 'pb-keyframes';
  style.textContent = `
    @keyframes pb-marquee   { from { transform: translateX(0); } to { transform: translateX(-50%); } }
    @keyframes pb-carousel  { from { transform: translateX(0); } to { transform: translateX(-50%); } }
    .pb-section h1, .pb-section h2, .pb-section h3, .pb-section h4 {
      font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
    }
    .pb-service-card-img { transition: filter 0.4s ease; filter: grayscale(20%); }
    .pb-service-card-img:hover { filter: grayscale(0%); }
    .pb-team-card { position: relative; overflow: hidden; border-radius: 1rem; }
    .pb-team-card img { transition: transform 0.5s ease; }
    .pb-team-card:hover img { transform: scale(1.04); }
    .pb-team-overlay { position: absolute; left: 0; right: 0; bottom: 0; padding: 1rem;
      background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%);
      opacity: 0; transition: opacity 0.3s ease; }
    .pb-team-card:hover .pb-team-overlay { opacity: 1; }
    .pb-portfolio-card img { transition: transform 0.5s ease, filter 0.4s ease; filter: grayscale(15%); }
    .pb-portfolio-card:hover img { transform: scale(1.04); filter: grayscale(0%); }
    .pb-btn-hover:hover { background-color: var(--color-button-bg) !important;
      color: var(--color-button-text) !important; border-color: var(--color-button-bg) !important; }
  `;
  document.head.appendChild(style);
}

// ─── 1. Marquee Ticker (top of Hero) ─────────────────────────────────────────
export function PBTicker({ phrases = [] }) {
  // Pause the marquee while hovered so the reader can catch the words.
  const [paused, setPaused] = useState(false);
  if (!phrases.length) return null;
  // Duplicate for seamless loop
  const items = [...phrases, ...phrases];
  return (
    <div
      className="w-full overflow-hidden"
      style={{ backgroundColor: '#0f0f0f', height: '38px', display: 'flex', alignItems: 'center' }}
      aria-hidden="true"
      data-testid="pb-ticker"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="flex gap-10 items-center shrink-0 whitespace-nowrap"
        style={{ animation: 'pb-marquee 28s linear infinite', animationPlayState: paused ? 'paused' : 'running' }}
      >
        {items.map((phrase, i) => (
          <React.Fragment key={i}>
            <span className="text-[11px] font-medium tracking-[0.15em] uppercase text-white/80">{phrase}</span>
            <span style={{ color: 'var(--color-primary)', fontSize: '14px' }}>✳</span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ─── 2. Hero ─────────────────────────────────────────────────────────────────
// Supports two rendering modes determined by slide.slide_type:
//
//   EDITORIAL (legacy / no slide_type):
//     Fixed bottom-left 2-column layout with massive headline, parallax,
//     ticker bar. The original Personal Brand Pro aesthetic.
//
//   POSITIONED (slide_type === 'photo' | 'video'):
//     Elements are absolutely positioned on desktop using the canvas
//     coordinates (title_x/y, subtitle_x/y, description_x/y, button_x/y,
//     media_x/y) set via the drag-and-drop CMS canvas editor.
//     Mobile always stacks vertically regardless of mode.
//
// The ticker bar and parallax background are shared across both modes.

function countdownParts(target) {
  if (!target) return null;
  const diff = new Date(target).getTime() - Date.now();
  if (isNaN(diff) || diff <= 0) return null;
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    mins: Math.floor((diff % 3600000) / 60000),
    secs: Math.floor((diff % 60000) / 1000),
  };
}

function resolveVideoEmbed(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?\s]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  if (url.startsWith('<iframe')) {
    const m = url.match(/src=["']([^"']+)["']/);
    if (m) return m[1];
  }
  return url;
}

export function PBHero({ slides = [], tickerPhrases = [] }) {
  const tt = useT();
  const [idx, setIdx] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [countdown, setCountdown] = useState(() => countdownParts(slides[0]?.countdown_to));

  useEffect(() => {
    if (slides.length <= 1) return;
    const delay = slides[idx]?.delay || 9400;
    const t = setTimeout(() => setIdx(i => (i + 1) % slides.length), delay);
    return () => clearTimeout(t);
  }, [idx, slides]);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const s = slides[idx];
    if (!s?.countdown_to) { setCountdown(null); return; }
    setCountdown(countdownParts(s.countdown_to));
    const id = setInterval(() => setCountdown(countdownParts(s.countdown_to)), 1000);
    return () => clearInterval(id);
  }, [idx, slides]);

  if (!slides.length) return null;
  const s = slides[idx];
  const bg = s.background || s.background_image || '';
  const parallax = Math.min(scrollY * 0.2, 100);
  const speed = s.speed_per_layer || 400;

  // Mode detection: 'photo' or 'video' slide_type → use canvas coordinates
  const isPositioned = s.slide_type === 'photo' || s.slide_type === 'video';

  // Shared CTA list (both modes)
  const ctas = [
    { text: s.button_text,   url: s.button_url,   target: s.window_open === 'new' ? '_blank' : '_self' },
    { text: s.button_2_text, url: s.button_2_url,  target: s.button_2_window_open === 'new' ? '_blank' : '_self' },
    { text: s.button_3_text, url: s.button_3_url,  target: s.button_3_window_open === 'new' ? '_blank' : '_self' },
  ].filter(c => tt(c.text));

  // PB-styled CTA row (used in both modes)
  // Hero CTA styles: SOLID (white bg / black text) vs OUTLINE (transparent /
  // white). The first button starts SOLID, the rest OUTLINE; on hover each
  // morphs into the opposite variant for a dynamic, interactive feel.
  const PB_CTA_SOLID = { backgroundColor: '#ffffff', color: '#0f0f0f', borderColor: '#ffffff' };
  const PB_CTA_OUTLINE = { backgroundColor: 'transparent', color: '#ffffff', borderColor: 'rgba(255,255,255,0.6)' };
  const applyCtaStyle = (el, s) => { el.style.backgroundColor = s.backgroundColor; el.style.color = s.color; el.style.borderColor = s.borderColor; };
  const PBCtaRow = ({ size = 'md' }) => {
    if (!ctas.length) return null;
    const pad = size === 'sm' ? 'px-6 py-2.5 text-sm' : 'px-8 py-3 text-sm';
    return (
      <div className="flex flex-wrap gap-3" data-testid="pb-hero-ctas">
        {ctas.map((c, i) => {
          const base = i === 0 ? PB_CTA_SOLID : PB_CTA_OUTLINE;
          const hover = i === 0 ? PB_CTA_OUTLINE : PB_CTA_SOLID;
          return (
            <a
              key={i}
              href={tt(c.url) || '#'}
              target={c.target}
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 rounded-full ${pad} font-bold transition-all duration-300 hover:gap-3`}
              style={{ backgroundColor: base.backgroundColor, color: base.color, border: `2px solid ${base.borderColor}` }}
              onMouseEnter={e => applyCtaStyle(e.currentTarget, hover)}
              onMouseLeave={e => applyCtaStyle(e.currentTarget, base)}
              data-testid={`pb-hero-cta-${i}`}
            >
              {tt(c.text)} {i === 0 && <ArrowRight className="w-4 h-4" />}
            </a>
          );
        })}
      </div>
    );
  };

  return (
    <div data-testid="pb-hero-wrapper" style={{ fontFamily: PB_FONT }}>
      <style>{HERO_KEYFRAMES}</style>
      <PBTicker phrases={tickerPhrases} />
      <section
        className="pb-section relative overflow-hidden"
        data-testid="pb-hero-section"
        style={{ minHeight: '92vh', display: 'flex', flexDirection: 'column', justifyContent: isPositioned ? 'flex-start' : 'flex-end' }}
      >
        {/* Parallax background (shared) */}
        {bg && (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center will-change-transform"
              style={{ backgroundImage: `url(${bg})`, transform: `translate3d(0, ${parallax}px, 0) scale(1.06)` }}
            />
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(160deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.40) 100%)' }}
            />
          </>
        )}
        {!bg && <div className="absolute inset-0" style={{ backgroundColor: '#0f0f0f' }} />}

        {/* ── POSITIONED MODE (photo / video slides) ── */}
        {isPositioned && (
          <>
            {/* Desktop lg+: honour CMS canvas coordinates */}
            <div className="relative w-full hidden lg:block" style={{ minHeight: '80vh', color: '#ffffff' }}>
              {/* Title */}
              {tt(s.title) && (
                <div
                  className="absolute max-w-[55%]"
                  style={{ left: toLeftPct(s.title_x, 100), top: toTopPct(s.title_y, 50), color: '#ffffff', ...heroEffectStyle(s.title_effect, s.title_start, speed) }}
                  data-testid="pb-hero-title"
                >
                  <h1
                    className="font-black leading-tight"
                    style={{ fontSize: 'clamp(36px, 5vw, 80px)', letterSpacing: '-0.02em', fontFamily: PB_FONT, color: '#ffffff' }}
                    dangerouslySetInnerHTML={{ __html: normalizeRichText(tt(s.title)) }}
                  />
                </div>
              )}

              {/* Subtitle */}
              {tt(s.subtitle) && (
                <div
                  className="absolute max-w-[55%]"
                  style={{ left: toLeftPct(s.subtitle_x, 100), top: toTopPct(s.subtitle_y, 80), color: '#ffffff', ...heroEffectStyle(s.subtitle_effect, s.subtitle_start, speed) }}
                  data-testid="pb-hero-subtitle"
                >
                  <div
                    className="text-xl font-semibold leading-snug"
                    style={{ fontFamily: PB_FONT, color: '#ffffff' }}
                    dangerouslySetInnerHTML={{ __html: normalizeRichText(tt(s.subtitle)) }}
                  />
                </div>
              )}

              {/* Description */}
              {tt(s.description) && (
                <div
                  className="absolute max-w-[45%]"
                  style={{ left: toLeftPct(s.description_x, 100), top: toTopPct(s.description_y, 120), color: 'rgba(255,255,255,0.82)', ...heroEffectStyle(s.description_effect, s.description_start, speed) }}
                  data-testid="pb-hero-desc"
                >
                  <div
                    className="text-base leading-relaxed rich-text-content"
                    style={{ fontFamily: PB_FONT, color: 'rgba(255,255,255,0.82)' }}
                    dangerouslySetInnerHTML={{ __html: normalizeRichText(tt(s.description)) }}
                  />
                </div>
              )}

              {/* CTA buttons */}
              {ctas.length > 0 && (
                <div
                  className="absolute"
                  style={{ left: toLeftPct(s.button_x, 100), top: toTopPct(s.button_y, 180), ...heroEffectStyle(s.button_effect, s.button_start, speed) }}
                >
                  <PBCtaRow />
                </div>
              )}

              {/* Countdown (positioned below buttons when present) */}
              {countdown && (
                <div
                  className="absolute"
                  style={{ left: toLeftPct(s.button_x, 100), top: `calc(${toTopPct(s.button_y, 180)} + 72px)`, ...heroEffectStyle(s.button_effect, (s.button_start || 0) + 100, speed) }}
                >
                  <div className="flex gap-8">
                    {[['Days', countdown.days], ['Hours', countdown.hours], ['Min', countdown.mins], ['Sec', countdown.secs]].map(([lbl, n]) => (
                      <div key={lbl}>
                        <div className="text-3xl font-bold tabular-nums text-white">{String(n).padStart(2, '0')}</div>
                        <div className="text-[10px] uppercase tracking-[0.25em] mt-1 text-white/50">{lbl}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Photo media */}
              {s.slide_type === 'photo' && s.photo && (
                <div
                  className="absolute"
                  style={{
                    left: toLeftPct(s.media_x, 400),
                    top: toTopPct(s.media_y, 50),
                    width: s.media_width ? `${s.media_width}px` : '420px',
                    ...heroEffectStyle(s.media_effect, s.media_start, speed),
                  }}
                >
                  <img
                    src={s.photo}
                    alt=""
                    className="rounded-2xl shadow-2xl w-full object-cover"
                    style={{ maxHeight: s.media_height ? `${s.media_height}px` : '400px', filter: 'grayscale(5%)' }}
                  />
                </div>
              )}

              {/* Video media */}
              {s.slide_type === 'video' && s.video_embed && (() => {
                const embedUrl = resolveVideoEmbed(s.video_embed);
                return embedUrl ? (
                  <div
                    className="absolute"
                    style={{
                      left: toLeftPct(s.media_x, 400),
                      top: toTopPct(s.media_y, 50),
                      width: s.media_width ? `${s.media_width}px` : '420px',
                      ...heroEffectStyle(s.media_effect, s.media_start, speed),
                    }}
                  >
                    <div className="rounded-2xl overflow-hidden shadow-2xl aspect-video" style={s.media_height ? { height: `${s.media_height}px`, aspectRatio: 'unset' } : {}}>
                      <iframe
                        src={embedUrl}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        frameBorder="0"
                        title="Hero Video"
                      />
                    </div>
                  </div>
                ) : null;
              })()}
            </div>

            {/* Mobile: stacked flow layout */}
            <div className="lg:hidden flex flex-col gap-6 px-6 sm:px-10 pb-16 pt-20 relative z-10" style={{ color: '#ffffff' }}>
              {s.slide_type === 'photo' && s.photo && (
                <div className="w-full max-w-sm mx-auto">
                  <img src={s.photo} alt="" className="rounded-2xl shadow-2xl w-full object-cover max-h-[260px]" />
                </div>
              )}
              {s.slide_type === 'video' && s.video_embed && (() => {
                const embedUrl = resolveVideoEmbed(s.video_embed);
                return embedUrl ? (
                  <div className="w-full max-w-sm mx-auto rounded-2xl overflow-hidden shadow-2xl aspect-video">
                    <iframe src={embedUrl} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen frameBorder="0" title="Hero Video" />
                  </div>
                ) : null;
              })()}
              {tt(s.subtitle) && (
                <div
                  className="text-lg font-semibold leading-snug"
                  style={{ color: '#ffffff', fontFamily: PB_FONT }}
                  data-testid="pb-hero-eyebrow"
                  dangerouslySetInnerHTML={{ __html: normalizeRichText(tt(s.subtitle)) }}
                />
              )}
              {tt(s.title) && (
                <h1
                  className="font-black leading-tight"
                  style={{ fontSize: 'clamp(32px, 7vw, 58px)', letterSpacing: '-0.02em', fontFamily: PB_FONT, color: '#ffffff' }}
                  data-testid="pb-hero-title"
                  dangerouslySetInnerHTML={{ __html: normalizeRichText(tt(s.title)) }}
                />
              )}
              {tt(s.description) && (
                <div
                  className="text-base leading-relaxed rich-text-content"
                  style={{ color: 'rgba(255,255,255,0.82)' }}
                  dangerouslySetInnerHTML={{ __html: normalizeRichText(tt(s.description)) }}
                  data-testid="pb-hero-desc"
                />
              )}
              <PBCtaRow size="sm" />
              {countdown && (
                <div className="flex gap-6">
                  {[['Days', countdown.days], ['Hours', countdown.hours], ['Min', countdown.mins], ['Sec', countdown.secs]].map(([lbl, n]) => (
                    <div key={lbl}>
                      <div className="text-3xl font-bold tabular-nums text-white">{String(n).padStart(2, '0')}</div>
                      <div className="text-[10px] uppercase tracking-[0.25em] mt-1 text-white/50">{lbl}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── EDITORIAL MODE (legacy / no slide_type) ── */}
        {!isPositioned && (
          <div className="relative z-10 w-full px-6 sm:px-10 md:px-16 lg:px-24 pb-16 md:pb-24 pt-32">
            {/* Eyebrow */}
            {tt(s.subtitle) && (
              <Reveal>
                <p
                  className="text-sm font-semibold uppercase tracking-[0.25em] mb-6"
                  style={{ color: 'var(--color-primary)' }}
                  data-testid="pb-hero-eyebrow"
                >
                  / {stripHtml(tt(s.subtitle))}
                </p>
              </Reveal>
            )}

            {/* 2-col bottom layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-end max-w-7xl mx-auto w-full">
              {/* Left — giant headline */}
              <Reveal delay={80}>
                {s.title && (
                  <h1
                    className="font-black text-white leading-[0.93] tracking-tight"
                    style={{ fontSize: 'clamp(52px, 8vw, 110px)', letterSpacing: '-0.02em' }}
                    data-testid="pb-hero-title"
                  >
                    {stripHtml(tt(s.title) || '').split('\n').map((line, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && <br />}
                        <span
                          className={i > 0 ? 'font-light italic' : ''}
                          style={i > 0 ? { color: 'rgba(255,255,255,0.75)' } : {}}
                        >
                          {line}
                        </span>
                      </React.Fragment>
                    ))}
                  </h1>
                )}
                {countdown && (
                  <div className="flex gap-8 mt-8">
                    {[['Days', countdown.days], ['Hours', countdown.hours], ['Min', countdown.mins], ['Sec', countdown.secs]].map(([lbl, n]) => (
                      <div key={lbl}>
                        <div className="text-4xl md:text-5xl font-bold tabular-nums text-white">{String(n).padStart(2, '0')}</div>
                        <div className="text-[10px] uppercase tracking-[0.25em] mt-1 text-white/50">{lbl}</div>
                      </div>
                    ))}
                  </div>
                )}
              </Reveal>

              {/* Right — description + CTA */}
              {(tt(s.description) || ctas.length > 0) && (
                <Reveal delay={160}>
                  {tt(s.description) && (
                    <div
                      className="text-white/80 text-base md:text-lg leading-relaxed mb-8 rich-text-content"
                      dangerouslySetInnerHTML={{ __html: normalizeRichText(tt(s.description)) }}
                      data-testid="pb-hero-desc"
                    />
                  )}
                  <PBCtaRow />
                </Reveal>
              )}
            </div>
          </div>
        )}

        {/* Slide indicators (shared) */}
        {slides.length > 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`h-[2px] transition-all duration-300 ${i === idx ? 'w-10' : 'w-5 opacity-30 hover:opacity-60'}`}
                style={{ backgroundColor: '#fff' }}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ─── 3. About ────────────────────────────────────────────────────────────────
// White section: numbered eyebrow, huge bold heading, image right, stat strip below
export function PBAbout({ data = {}, bg, statStrip = [], sectionNumber }) {
  const tt = useT();
  const { lang } = useLang();
  if (!itemHasLocale(data?.title, lang)) return null;
  const img = resolveImg(data.image);
  const sectionBg = bg || 'var(--color-bg, #ffffff)';
  const isDark    = pbIsDark(bg, false);
  const textColor = pbTextFor(bg, '#111111');
  const subColor  = pbSubFor(bg, 'var(--color-body-text, #475569)');

  return (
    <section
      className="pb-section"
      id="about"
      data-testid="pb-about-section"
      style={{ backgroundColor: sectionBg, fontFamily: PB_FONT, color: textColor }}
    >
      {/* Main content */}
      <div className="max-w-7xl mx-auto px-6 sm:px-10 md:px-16 lg:px-24 py-20 md:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left — text */}
          <Reveal>
            <PBEyebrow number={sectionNumber} text={data.label || data.eyebrow || 'Who we are'} onDark={isDark} />
            <h2
              className="font-black tracking-tight leading-[1.0] mb-6"
              style={{ fontSize: 'clamp(36px, 5vw, 64px)', letterSpacing: '-0.02em' }}
              data-testid="pb-about-title"
            >
              {tt(data.title)}
            </h2>
            <div
              className="w-10 h-[2px] mb-6"
              style={{ backgroundColor: 'var(--color-primary)' }}
            />
            {tt(data.description) && (
              <div
                className="text-base leading-relaxed rich-text-content mb-8"
                style={{ color: subColor }}
                dangerouslySetInnerHTML={{ __html: normalizeRichText(tt(data.description)) }}
              />
            )}
            <div className="flex items-center gap-6 flex-wrap mb-8">
              {data.phone && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center border" style={{ borderColor: bg ? 'rgba(255,255,255,0.2)' : '#e5e7eb' }}>
                    <Phone className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: subColor }}>Call us</p>
                    <p className="text-sm font-semibold">{data.phone}</p>
                  </div>
                </div>
              )}
              {tt(data.signature_name) && (
                <div className="pl-6" style={{ borderLeft: `1px solid ${bg ? 'rgba(255,255,255,0.2)' : '#e5e7eb'}` }}>
                  <p className="font-bold">{tt(data.signature_name)}</p>
                  {tt(data.signature_title) && (
                    <p className="text-xs" style={{ color: subColor }}>{tt(data.signature_title)}</p>
                  )}
                </div>
              )}
            </div>
            {tt(data.button_text) && (
              <a
                href={tt(data.button_url) || '#'}
                target={data.button_open_in_new_tab ? '_blank' : '_self'}
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full px-7 py-2.5 text-sm font-bold transition-all duration-300 pb-btn-hover"
                style={{ border: '2px solid currentColor', backgroundColor: 'transparent' }}
                data-testid="pb-about-cta"
              >
                {tt(data.button_text)} <ArrowRight className="w-4 h-4" />
              </a>
            )}
          </Reveal>

          {/* Right — image */}
          {img && (
            <Reveal delay={120}>
              <div className="relative">
                <img
                  src={img}
                  alt=""
                  className="w-full rounded-2xl object-cover aspect-[4/3]"
                  style={{ filter: 'grayscale(8%)' }}
                />
              </div>
            </Reveal>
          )}
        </div>
      </div>

      {/* Stat strip — 1 primary tile + 3 photo tiles */}
      {statStrip.length > 0 && (
        <div className="max-w-7xl mx-auto px-6 sm:px-10 md:px-16 lg:px-24 pb-10">
          <Reveal>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-0 rounded-2xl overflow-hidden">
              {statStrip.map((tile, i) => (
                <div
                  key={i}
                  className="relative"
                  style={{
                    backgroundColor: i === 0 ? 'var(--color-primary)' : 'transparent',
                    minHeight: '200px',
                  }}
                >
                  {i === 0 ? (
                    /* Stat tile */
                    <div className="p-7 h-full flex flex-col justify-between text-white">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-80">{tile.label}</p>
                      <div>
                        <p className="text-5xl font-black leading-none mb-2">{tile.stat}</p>
                        <div className="w-8 h-px bg-white/40 mb-2" />
                        <p className="text-xs opacity-70 leading-relaxed">{tile.description}</p>
                      </div>
                    </div>
                  ) : tile.photo ? (
                    /* Photo tile */
                    <div className="relative h-full" style={{ minHeight: '200px' }}>
                      <img src={resolveImg(tile.photo)} alt={tile.label || ''} className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/30" />
                      <div className="absolute bottom-4 left-4 text-white">
                        {tile.icon && <span className="text-sm font-bold mr-1.5" style={{ color: 'var(--color-primary)' }}>✳</span>}
                        <span className="text-sm font-bold">{tile.label}</span>
                        {tile.description && <p className="text-xs opacity-75 mt-0.5">{tile.description}</p>}
                      </div>
                    </div>
                  ) : (
                    /* Fallback plain tile */
                    <div className="p-7 h-full flex flex-col justify-end" style={{ backgroundColor: '#f9fafb', minHeight: '200px' }}>
                      {tile.label && <p className="text-sm font-bold">{tile.label}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      )}
    </section>
  );
}

// ─── 4. Services ─────────────────────────────────────────────────────────────
// Dark section: stacked editorial rows — photo left + dark card right
export function PBServices({ services = [], bg, cmsConfig = {}, sectionNumber }) {
  const tt = useT();
  const { lang } = useLang();
  const filtered = services.filter(s => itemHasLocale(s.title, lang));
  if (!filtered.length) return null;
  const sectionBg = bg || '#0f0f0f';
  const isDark    = pbIsDark(bg, true);
  const textColor = pbTextFor(bg, '#ffffff');
  const subColor  = pbSubFor(bg, 'rgba(255,255,255,0.6)');

  return (
    <section
      className="pb-section"
      id="services"
      data-testid="pb-services-section"
      style={{ backgroundColor: sectionBg, fontFamily: PB_FONT, color: textColor, paddingTop: '80px', paddingBottom: '80px' }}
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-10 md:px-16 lg:px-24">
        {/* Header */}
        <Reveal className="mb-14">
          <PBEyebrow number={sectionNumber} text={cmsConfig.eyebrow || 'Our quality services'} onDark={isDark} />
          <div className="flex flex-wrap items-end gap-8 justify-between">
            <div className="flex-1 min-w-0">
              {tt(cmsConfig.title) && (
                <h2
                  className="font-black tracking-tight leading-[1.0]"
                  style={{ fontSize: 'clamp(36px, 5vw, 72px)', letterSpacing: '-0.02em', color: textColor }}
                  data-testid="pb-services-title"
                >
                  {tt(cmsConfig.title)}
                </h2>
              )}
              {tt(cmsConfig.subtitle) && (
                <p className="mt-4 max-w-xl" style={{ color: subColor }}>{tt(cmsConfig.subtitle)}</p>
              )}
            </div>
            {tt(cmsConfig.cta_text) && (
              <div className="flex-shrink-0">
                <a
                  href={tt(cmsConfig.cta_url) || '#'}
                  target={cmsConfig.cta_new_tab ? '_blank' : '_self'}
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full px-7 py-2.5 text-sm font-bold transition-all duration-300"
                  style={{ border: `2px solid ${pbBorderFor(isDark)}`, color: textColor, backgroundColor: 'transparent' }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-button-bg)'; e.currentTarget.style.color = 'var(--color-button-text)'; e.currentTarget.style.borderColor = 'var(--color-button-bg)'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = textColor; e.currentTarget.style.borderColor = pbBorderFor(isDark); }}
                  data-testid="pb-services-cta"
                >
                  {tt(cmsConfig.cta_text)} <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>
        </Reveal>

        {/* Stacked service rows */}
        <div className="flex flex-col gap-5">
          {filtered.slice(0, 6).map((s, idx) => (
            <Reveal delay={idx * 60} key={s.id}>
              <div
                className="grid grid-cols-1 md:grid-cols-[2fr_3fr] rounded-2xl overflow-hidden"
                style={{ minHeight: '320px' }}
                data-testid={`pb-service-row-${s.id}`}
              >
                {/* Photo */}
                <div className="relative overflow-hidden" style={{ minHeight: '240px' }}>
                  {s.image ? (
                    <img
                      src={resolveImg(s.image)}
                      alt={tt(s.title)}
                      className="pb-service-card-img absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: '#1a1a1a' }}>
                      <lucide.Briefcase className="w-12 h-12 text-white/20" />
                    </div>
                  )}
                </div>

                {/* Content card */}
                <div
                  className="flex flex-col justify-between p-8 md:p-10"
                  style={{ backgroundColor: '#1a1a1a' }}
                >
                  <div>
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <h3
                        className="font-black text-white leading-tight"
                        style={{ fontSize: 'clamp(26px, 3vw, 40px)', letterSpacing: '-0.02em' }}
                      >
                        {tt(s.title)}
                      </h3>
                    </div>
                    {/* Vertical separator */}
                    <div className="flex gap-6">
                      <div className="w-px self-stretch" style={{ backgroundColor: '#333' }} />
                      <div className="flex-1">
                        {(tt(s.short_description) || tt(s.description)) && (
                          <p className="text-white/60 text-sm leading-relaxed mb-5">
                            {stripHtml(tt(s.short_description) || tt(s.description)).slice(0, 160)}
                          </p>
                        )}
                        {tt(s.external_url || s.link) && (
                          <a
                            href={tt(s.external_url || s.link) || '#'}
                            target={s.open_in_new_tab ? '_blank' : '_self'}
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-full px-6 py-2 text-xs font-bold transition-all duration-300 border-2 border-white/30 text-white hover:border-transparent"
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-button-bg)'; e.currentTarget.style.color = 'var(--color-button-text)'; e.currentTarget.style.borderColor = 'var(--color-button-bg)'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
                          >
                            Learn More
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Features + counter */}
                  <div className="flex items-end justify-between mt-6 gap-4 flex-wrap">
                    {s.features && (
                      <ul className="flex flex-col gap-1.5">
                        {String(s.features).split(/\r?\n/).filter(Boolean).slice(0, 4).map((f, fi) => (
                          <li key={fi} className="flex items-center gap-2 text-xs text-white/70">
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--color-primary)' }} />
                            {f.trim()}
                          </li>
                        ))}
                      </ul>
                    )}
                    <span
                      className="text-4xl md:text-5xl font-black text-white/10 shrink-0 tabular-nums"
                      style={{ lineHeight: 1 }}
                    >
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

      </div>
    </section>
  );
}

// ─── 5. Audience / Why Choose Us (staggered 4-card cascade) ──────────────────
export function PBAudience({ config = {}, items = [], bg, sectionNumber }) {
  const tt = useT();
  const { lang } = useLang();
  const sectionBg = bg || '#ffffff';
  const isDark    = pbIsDark(bg, false);
  const textColor = isDark ? '#ffffff' : '#111111';
  const subColor  = isDark ? 'rgba(255,255,255,0.65)' : '#475569';
  const visibleItems = items.filter(i => itemHasLocale(i.title, lang)).slice(0, 4);
  if (!visibleItems.length) return null;   // hide section when no items

  // Stagger offsets for the cascade effect
  const topOffsets = ['0px', '40px', '20px', '60px'];
  const cardBgs = ['#f0f0f0', '#0f0f0f', '#f0f0f0', 'var(--color-primary)'];
  const cardTextColors = ['#111111', '#ffffff', '#111111', '#ffffff'];

  return (
    <section
      className="pb-section"
      id="aurex-audience"
      data-testid="pb-audience-section"
      style={{ backgroundColor: sectionBg, fontFamily: PB_FONT, color: textColor, paddingTop: '80px', paddingBottom: '80px' }}
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-10 md:px-16 lg:px-24">
        {/* Header */}
        <Reveal className="mb-16">
          <PBEyebrow number={sectionNumber} text={config.eyebrow || 'Why choose us'} onDark={isDark} />
          {tt(config.title) && (
            <h2
              className="font-black tracking-tight leading-[1.0]"
              style={{ fontSize: 'clamp(32px, 4.5vw, 60px)', letterSpacing: '-0.02em', color: textColor }}
              data-testid="pb-audience-title"
            >
              {tt(config.title)}
            </h2>
          )}
          {tt(config.subtitle) && (
            <p className="mt-4 text-base leading-relaxed max-w-2xl" style={{ color: subColor }} data-testid="pb-audience-subtitle">
              {tt(config.subtitle)}
            </p>
          )}
        </Reveal>

        {/* Cascade grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
          {visibleItems.map((item, i) => {
            const cardBg = cardBgs[i % cardBgs.length];
            const cardText = cardTextColors[i % cardTextColors.length];
            const onDark = cardText === '#ffffff';
            return (
              <Reveal
                key={item.id}
                delay={i * 80}
                as="article"
                className="rounded-2xl p-8 flex flex-col"
                style={{
                  backgroundColor: cardBg,
                  color: cardText,
                  marginTop: topOffsets[i % topOffsets.length],
                  minHeight: '280px',
                }}
                data-testid={`pb-audience-card-${item.id}`}
              >
                {/* Badge / Eyebrow — always resolve through tt() to handle localized objects */}
                {(tt(item.eyebrow) || item.badge) && (
                  <div className="mb-6">
                    <span
                      className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                      style={{
                        border: `1px solid ${onDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'}`,
                        color: cardText,
                      }}
                    >
                      {tt(item.eyebrow) || item.badge}
                    </span>
                  </div>
                )}

                {/* Icon */}
                {item.icon && (() => {
                  const iconKey = String(item.icon || '').charAt(0).toUpperCase() + String(item.icon || '').slice(1);
                  const Comp = lucide[iconKey];
                  return Comp ? (
                    <div className="mb-4">
                      <Comp className="w-8 h-8" style={{ color: onDark ? cardText : 'var(--color-primary)' }} />
                    </div>
                  ) : null;
                })()}
                {!item.icon && (
                  <div
                    className="w-8 h-8 rounded mb-4"
                    style={{ backgroundColor: onDark ? 'rgba(255,255,255,0.2)' : 'var(--color-primary)', opacity: 0.8 }}
                  />
                )}

                <h3 className="font-black text-xl md:text-2xl leading-tight mb-3" style={{ letterSpacing: '-0.01em' }}>
                  {tt(item.title)}
                </h3>
                {tt(item.description) && (
                  <div
                    className="text-sm leading-relaxed rich-text-content line-clamp-4"
                    style={{ color: onDark ? 'rgba(255,255,255,0.7)' : '#555' }}
                    dangerouslySetInnerHTML={{ __html: normalizeRichText(tt(item.description)) }}
                  />
                )}
              </Reveal>
            );
          })}
        </div>

        {tt(config.cta_text) && tt(config.cta_url) && (
          <Reveal delay={200} className="text-center mt-14">
            <PBButton href={config.cta_url} text={config.cta_text} newTab={config.cta_new_tab} filled />
          </Reveal>
        )}
      </div>
    </section>
  );
}

// ─── 6. Portfolio — scrolling marquee title + asymmetric 2-col grid ───────────
export function PBPortfolio({ items = [], bg, cmsConfig = {}, sectionNumber }) {
  const tt = useT();
  const { lang } = useLang();
  const filtered = items.filter(i => itemHasLocale(i.title, lang));
  if (!filtered.length) return null;
  const sectionBg = bg || '#ffffff';
  const isDark    = pbIsDark(bg, false);
  const textColor = pbTextFor(bg, '#111111');
  const subColor  = pbSubFor(bg, 'var(--color-body-text, #475569)');

  const marqueeText = tt(cmsConfig.title) || 'Featured work';
  const marqueeItems = Array(8).fill(marqueeText);

  return (
    <section
      className="pb-section"
      id="portfolio"
      data-testid="pb-portfolio-section"
      style={{ backgroundColor: sectionBg, fontFamily: PB_FONT, color: textColor, paddingBottom: '80px' }}
    >
      {/* Scrolling marquee headline */}
      <div className="overflow-hidden py-6 border-y" style={{ borderColor: bg ? 'rgba(128,128,128,0.2)' : '#e5e7eb', marginBottom: '48px' }}>
        <div
          className="flex gap-8 items-center shrink-0 whitespace-nowrap"
          style={{ animation: 'pb-marquee 22s linear infinite' }}
        >
          {[...marqueeItems, ...marqueeItems].map((text, i) => (
            <React.Fragment key={i}>
              <span
                className="font-black uppercase"
                style={{ fontSize: 'clamp(32px, 5vw, 64px)', letterSpacing: '-0.02em', color: i % 2 === 0 ? 'var(--color-primary)' : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)') }}
              >
                {text}
              </span>
              <span
                className="font-black"
                style={{ fontSize: 'clamp(20px, 3vw, 40px)', color: 'var(--color-primary)' }}
              >
                ✳
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 sm:px-10 md:px-16 lg:px-24">
        {/* Section header */}
        {(tt(cmsConfig.eyebrow) || tt(cmsConfig.title) || tt(cmsConfig.subtitle) || sectionNumber) && (
          <Reveal className="mb-10">
            <PBEyebrow number={sectionNumber} text={cmsConfig.eyebrow || 'Featured Work'} onDark={isDark} />
            {tt(cmsConfig.title) && (
              <h2
                className="font-black tracking-tight leading-[1.0]"
                style={{ fontSize: 'clamp(32px, 4.5vw, 60px)', letterSpacing: '-0.02em' }}
                data-testid="pb-portfolio-title"
              >
                {tt(cmsConfig.title)}
              </h2>
            )}
            {tt(cmsConfig.subtitle) && (
              <p className="mt-3 text-base leading-relaxed" style={{ color: subColor }}>
                {tt(cmsConfig.subtitle)}
              </p>
            )}
          </Reveal>
        )}

        {/* Asymmetric 2-col grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.slice(0, 4).map((p, idx) => (

            <Reveal
              key={p.id}
              delay={idx * 80}
              className="pb-portfolio-card group relative rounded-2xl overflow-hidden"
              style={{ height: idx % 2 === 0 ? '380px' : '460px' }}
              data-testid={`pb-portfolio-card-${p.id}`}
            >
              {p.image ? (
                <img
                  src={resolveImg(p.image)}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0" style={{ backgroundColor: '#1a1a1a' }} />
              )}
              {/* Dark gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              {/* Brand overlay (center) */}
              {tt(p.client) && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white font-black text-2xl md:text-3xl tracking-widest uppercase opacity-80">{tt(p.client)}</span>
                </div>
              )}
              {/* Info below */}
              <div className="absolute bottom-6 left-6 right-6">
                <h3 className="text-white font-bold text-xl mb-1">{tt(p.title)}</h3>
                <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: PB_LABEL_ON_DARK }}>
                  <span className="mr-1.5">✳</span>
                  {tt(p.category)}
                  {p.year && `, ${p.year}`}
                </p>
              </div>
              {p.link && (
                <a
                  href={p.link}
                  target={p.open_in_new_tab ? '_blank' : '_self'}
                  rel="noreferrer"
                  className="absolute top-5 right-5 w-10 h-10 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
                  style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
                >
                  <ArrowUpRight className="w-4 h-4" />
                </a>
              )}
            </Reveal>
          ))}
        </div>

        {tt(cmsConfig.cta_text) && (
          <Reveal delay={100} className="text-center mt-10">
            <Link
              to={tt(cmsConfig.cta_url) || '/featured-projects'}
              target={cmsConfig.cta_new_tab ? '_blank' : '_self'}
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full px-7 py-2.5 text-sm font-bold transition-all duration-300 pb-btn-hover"
              style={{ border: `2px solid ${textColor}`, color: textColor }}
              data-testid="pb-portfolio-view-all"
            >
              {tt(cmsConfig.cta_text)} <ArrowRight className="w-4 h-4" />
            </Link>
          </Reveal>
        )}
      </div>
    </section>
  );
}

// ─── 7. Testimonials — dark, staggered heights, oversized quote marks ─────────
export function PBTestimonials({ items = [], bg, cmsConfig = {}, sectionNumber }) {
  const tt = useT();
  const { lang } = useLang();
  const filtered = items.filter(t => t.visible !== false && itemHasLocale(t.content, lang));
  if (!filtered.length) return null;
  const sectionBg = bg || '#0f0f0f';
  const isDark    = pbIsDark(bg, true);
  const textColor = pbTextFor(bg, '#ffffff');
  const subColor  = pbSubFor(bg, 'rgba(255,255,255,0.6)');

  // Stagger heights for the 3-col layout
  const heightMap = ['380px', '440px', '380px'];

  return (
    <section
      className="pb-section"
      id="testimonials"
      data-testid="pb-testimonials-section"
      style={{ backgroundColor: sectionBg, fontFamily: PB_FONT, color: textColor, paddingTop: '80px', paddingBottom: '80px' }}
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-10 md:px-16 lg:px-24">
        {/* Header row: eyebrow + title + subtitle left, rating right */}
        <Reveal className="flex flex-wrap items-start justify-between gap-6 mb-16">
          <div>
            <PBEyebrow number={sectionNumber} text={cmsConfig.eyebrow || 'Real testimonials'} onDark={isDark} />
            {tt(cmsConfig.title) && (
              <h2
                className="font-black tracking-tight leading-[1.0]"
                style={{ fontSize: 'clamp(32px, 4.5vw, 58px)', letterSpacing: '-0.02em', color: textColor }}
                data-testid="pb-testimonials-title"
              >
                {tt(cmsConfig.title)}
              </h2>
            )}
            {tt(cmsConfig.subtitle) && (
              <p className="mt-4 max-w-2xl leading-relaxed" style={{ color: subColor }} data-testid="pb-testimonials-subtitle">
                {tt(cmsConfig.subtitle)}
              </p>
            )}
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 justify-end mb-1">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="w-5 h-5" fill="currentColor" style={{ color: 'var(--color-primary)' }} viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
              <span className="ml-2 font-black text-xl" style={{ color: textColor }}>4.9/5</span>
            </div>
            <p className="text-xs" style={{ color: subColor }}>based on 2,500+ reviews</p>
          </div>
        </Reveal>

        {/* Staggered 3-col cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
          {filtered.slice(0, 3).map((t, idx) => {
            const photo = resolveImg(t.image || t.avatar);
            const roleLabel = tt(t.title) || tt(t.role);
            return (
              <Reveal key={t.id} delay={idx * 100}>
                <div
                  className="relative rounded-2xl p-8 flex flex-col"
                  style={{
                    backgroundColor: '#1a1a1a',
                    minHeight: heightMap[idx % heightMap.length],
                    marginTop: idx === 1 ? '24px' : '0',
                  }}
                  data-testid={`pb-testimonial-card-${t.id}`}
                >
                  {/* Oversized quote mark */}
                  <div
                    className="absolute -top-5 left-7 text-7xl font-black leading-none select-none"
                    style={{ color: 'var(--color-primary)' }}
                    aria-hidden="true"
                  >
                    "
                  </div>

                  {/* Quote text */}
                  <p className="text-white/80 text-sm md:text-base leading-relaxed flex-1 mt-4">
                    "{tt(t.content)}"
                  </p>

                  {/* Author */}
                  <div className="flex items-center gap-3 mt-8 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    {photo ? (
                      <img
                        src={photo}
                        alt={tt(t.name)}
                        className="w-11 h-11 rounded-full object-cover flex-shrink-0"
                        style={{ border: '2px solid rgba(255,255,255,0.15)' }}
                      />
                    ) : (
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff' }}
                      >
                        {tt(t.name)?.[0] || '?'}
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-white text-sm">{tt(t.name)}</p>
                      {roleLabel && (
                        <p className="text-[10px] uppercase tracking-[0.2em] mt-0.5" style={{ color: PB_LABEL_ON_DARK }}>
                          {roleLabel}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        {filtered.length > 3 && (
          <Reveal delay={120} className="text-center mt-12">
            <PBButton href="/testimonials" text="View all reviews" filled />
          </Reveal>
        )}
      </div>
    </section>
  );
}

// ─── 8. Team — asymmetric headline + horizontal auto-scroll carousel ───────────
export function PBTeam({ config = {}, items = [], bg, sectionNumber }) {
  const tt = useT();
  const { lang } = useLang();
  const settings = useSettings();
  const networks = (settings.social_links || []).filter(n => n.platform);
  const sectionBg = bg || '#0f0f0f';
  const isDark    = pbIsDark(bg, true);
  const textColor = pbTextFor(bg, '#ffffff');
  const subColor  = pbSubFor(bg, 'rgba(255,255,255,0.6)');
  const filtered = items.filter(i => itemHasLocale(i.name, lang));
  if (!filtered.length) return null;   // hide section when no team members

  const iconFor = (network) => {
    const key = String(network?.icon || network?.platform || '').toLowerCase().replace(/[^a-z]/g, '');
    const map = { linkedin: lucide.Linkedin, twitter: lucide.Twitter, x: lucide.Twitter, facebook: Facebook, instagram: Instagram, youtube: Youtube, github: Github, globe: Globe };
    return map[key] || Globe;
  };

  return (
    <section
      className="pb-section"
      id="aurex-team"
      data-testid="pb-team-section"
      style={{ backgroundColor: sectionBg, fontFamily: PB_FONT, color: textColor, paddingTop: '80px', paddingBottom: '0' }}
    >
      {/* Asymmetric headline + description/CTA */}
      <div className="max-w-7xl mx-auto px-6 sm:px-10 md:px-16 lg:px-24 mb-14">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-end">
          <Reveal>
            <PBEyebrow number={sectionNumber} text={config.eyebrow || 'Our team'} onDark={isDark} />
            <h2
              className="font-black leading-[0.95] tracking-tight"
              style={{ fontSize: 'clamp(44px, 6.5vw, 96px)', letterSpacing: '-0.03em', color: textColor }}
              data-testid="pb-team-title"
            >
              {tt(config.title) || (
                <>Meet our<br /><span className="block pl-10 md:pl-24 italic font-light" style={{ color: subColor }}>amazing team</span></>
              )}
            </h2>
          </Reveal>
          <Reveal delay={120} className="lg:pb-4">
            {tt(config.subtitle) && (
              <p className="text-base leading-relaxed mb-6" style={{ color: subColor }}>{tt(config.subtitle)}</p>
            )}
            {config.show_view_all && config.view_all_url && tt(config.view_all_text) && (
              <a
                href={config.view_all_url}
                target={config.view_all_new_tab ? '_blank' : '_self'}
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full px-8 py-3 text-sm font-bold transition-all duration-300"
                style={{ border: `2px solid ${pbBorderFor(isDark)}`, color: textColor, backgroundColor: 'transparent' }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-button-bg)'; e.currentTarget.style.color = 'var(--color-button-text)'; e.currentTarget.style.borderColor = 'var(--color-button-bg)'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = textColor; e.currentTarget.style.borderColor = pbBorderFor(isDark); }}
                data-testid="pb-team-view-all"
              >
                {tt(config.view_all_text)} <ArrowRight className="w-4 h-4" />
              </a>
            )}
          </Reveal>
        </div>
      </div>

      {/* Horizontal auto-scroll carousel */}
      {filtered.length > 0 && (
        <div className="overflow-hidden pb-10" style={{ paddingLeft: 0, paddingRight: 0 }}>
          <div
            className="flex gap-4"
            style={{ animation: `pb-carousel ${Math.max(filtered.length * 5, 28)}s linear infinite`, width: 'max-content' }}
          >
            {/* Duplicate for seamless loop */}
            {[...filtered, ...filtered].map((m, i) => {
              const memberSocial = m.social_links || {};
              const entries = networks.map(n => {
                const url = memberSocial[n.id]
                  || (n.platform?.toLowerCase() === 'linkedin' ? m.linkedin_url : null)
                  || (['twitter', 'x'].includes(n.platform?.toLowerCase()) ? m.twitter_url : null);
                return url ? { ...n, url, Icon: iconFor(n) } : null;
              }).filter(Boolean);

              return (
                <div
                  key={`${m.id}-${i}`}
                  className="pb-team-card flex-shrink-0"
                  style={{ width: '260px', height: '340px' }}
                  data-testid={i < filtered.length ? `pb-team-card-${m.id}` : undefined}
                >
                  {m.photo_url ? (
                    <img
                      src={resolveImg(m.photo_url)}
                      alt={tt(m.name)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl font-black text-white/20" style={{ backgroundColor: '#1a1a1a' }}>
                      {tt(m.name)?.[0]}
                    </div>
                  )}
                  {/* Hover overlay */}
                  <div className="pb-team-overlay">
                    <h3 className="text-white font-bold text-base">{tt(m.name)}</h3>
                    {m.role && (
                      <p className="text-[10px] uppercase tracking-[0.2em] mt-0.5" style={{ color: PB_LABEL_ON_DARK }}>
                        {tt(m.role)}
                      </p>
                    )}
                    {entries.length > 0 && (
                      <div className="flex gap-2 mt-3">
                        {entries.map(s => (
                          <a
                            key={s.id}
                            href={s.url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                            aria-label={s.platform}
                          >
                            <s.Icon className="w-3.5 h-3.5 text-white" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

// ─── 10. Reading List — book covers grid with CMS-driven header ─────────────
export function PBReadingList({ books = [], bg, cmsConfig = {}, sectionNumber }) {
  const tt = useT();
  const filtered = books.filter(b => b.title);
  if (!filtered.length) return null;
  const sectionBg = bg || 'var(--color-bg, #ffffff)';
  const isDark    = pbIsDark(bg, false);
  const textColor = pbTextFor(bg, '#111111');
  const subColor  = pbSubFor(bg, 'var(--color-body-text, #475569)');

  return (
    <section
      className="pb-section"
      id="reading-list"
      data-testid="pb-reading-section"
      style={{ backgroundColor: sectionBg, fontFamily: PB_FONT, color: textColor, paddingTop: '80px', paddingBottom: '80px' }}
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-10 md:px-16 lg:px-24">
        {/* Header */}
        <Reveal className="flex flex-wrap items-end justify-between gap-6 mb-12">
          <div>
            <PBEyebrow number={sectionNumber} text={cmsConfig.eyebrow || 'Reading List'} onDark={isDark} />
            {tt(cmsConfig.title) && (
              <h2
                className="font-black tracking-tight leading-[1.0]"
                style={{ fontSize: 'clamp(32px, 4.5vw, 60px)', letterSpacing: '-0.02em' }}
                data-testid="pb-reading-title"
              >
                {tt(cmsConfig.title)}
              </h2>
            )}
            {tt(cmsConfig.subtitle) && (
              <p className="mt-3 text-base leading-relaxed" style={{ color: subColor }}>
                {tt(cmsConfig.subtitle)}
              </p>
            )}
          </div>
          {tt(cmsConfig.cta_text) && (
            <a
              href={tt(cmsConfig.cta_url) || '/reading-list'}
              target={cmsConfig.cta_new_tab ? '_blank' : '_self'}
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full px-7 py-2.5 text-sm font-bold transition-all duration-300 pb-btn-hover"
              style={{ border: '2px solid currentColor', backgroundColor: 'transparent' }}
              data-testid="pb-reading-view-all"
            >
              {tt(cmsConfig.cta_text)} <ArrowRight className="w-4 h-4" />
            </a>
          )}
        </Reveal>

        {/* Book grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {filtered.slice(0, 5).map((b, idx) => {
            const cover = b.image || b.cover_image;
            const src = cover ? resolveImg(cover) : null;
            return (
              <Reveal key={b.id} delay={idx * 60} as={Link} to="/reading-list" className="group block">
                <div
                  className="rounded-xl overflow-hidden mb-3 transition-shadow group-hover:shadow-lg"
                  style={{ border: '1px solid #e5e7eb' }}
                >
                  {src ? (
                    <div className="aspect-[2/3] overflow-hidden">
                      <img
                        src={src}
                        alt={tt(b.title)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        style={{ filter: 'grayscale(8%)' }}
                      />
                    </div>
                  ) : (
                    <div className="aspect-[2/3] flex items-center justify-center" style={{ backgroundColor: '#0f0f0f' }}>
                      <BookOpen className="w-10 h-10 text-white/40" />
                    </div>
                  )}
                </div>
                <p className="text-sm font-bold leading-tight truncate">{tt(b.title)}</p>
                <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-body-text, #475569)' }}>{tt(b.author)}</p>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── 11. Gallery — editorial masonry-style grid with CMS-driven header ────────
export function PBGallery({ items = [], bg, cmsConfig = {}, sectionNumber }) {
  const tt = useT();
  const filtered = items.filter(i => i.image);
  if (!filtered.length) return null;
  const sectionBg = bg || '#0f0f0f';
  const isDark    = pbIsDark(bg, true);
  const textColor = pbTextFor(bg, '#ffffff');
  const subColor  = pbSubFor(bg, 'rgba(255,255,255,0.6)');

  return (
    <section
      className="pb-section"
      id="gallery"
      data-testid="pb-gallery-section"
      style={{ backgroundColor: sectionBg, fontFamily: PB_FONT, color: textColor, paddingTop: '80px', paddingBottom: '80px' }}
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-10 md:px-16 lg:px-24">
        {/* Header */}
        <Reveal className="flex flex-wrap items-end justify-between gap-6 mb-12">
          <div>
            <PBEyebrow number={sectionNumber} text={cmsConfig.eyebrow || 'Moments'} onDark={isDark} />
            {tt(cmsConfig.title) && (
              <h2
                className="font-black tracking-tight leading-[1.0]"
                style={{ fontSize: 'clamp(32px, 4.5vw, 60px)', letterSpacing: '-0.02em', color: textColor }}
                data-testid="pb-gallery-title"
              >
                {tt(cmsConfig.title)}
              </h2>
            )}
            {tt(cmsConfig.subtitle) && (
              <p className="mt-3 max-w-xl" style={{ color: subColor }}>{tt(cmsConfig.subtitle)}</p>
            )}
          </div>
          {tt(cmsConfig.cta_text) && (
            <a
              href={tt(cmsConfig.cta_url) || '/gallery'}
              target={cmsConfig.cta_new_tab ? '_blank' : '_self'}
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full px-7 py-2.5 text-sm font-bold transition-all duration-300"
              style={{ border: `2px solid ${pbBorderFor(isDark)}`, color: textColor, backgroundColor: 'transparent' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-button-bg)'; e.currentTarget.style.color = 'var(--color-button-text)'; e.currentTarget.style.borderColor = 'var(--color-button-bg)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = textColor; e.currentTarget.style.borderColor = pbBorderFor(isDark); }}
              data-testid="pb-gallery-view-all"
            >
              {tt(cmsConfig.cta_text)} <ArrowRight className="w-4 h-4" />
            </a>
          )}
        </Reveal>

        {/* Gallery grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {filtered.slice(0, 6).map((img, idx) => (
            <Reveal key={img.id} delay={idx * 60} className="group overflow-hidden rounded-xl">
              <img
                src={resolveImg(img.image)}
                alt={img.title || ''}
                className="w-full aspect-square object-cover transition-all duration-500 group-hover:scale-105"
                style={{ filter: 'grayscale(20%)' }}
                onMouseEnter={e => (e.currentTarget.style.filter = 'grayscale(0%)')}
                onMouseLeave={e => (e.currentTarget.style.filter = 'grayscale(20%)')}
              />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── 9. Contact — dark editorial, 2-col ──────────────────────────────────────
export function PBContact({ contactSettings = {}, bg, sectionNumber }) {
  const tt = useT();
  const sectionBg = bg || '#111111';
  const isDark    = pbIsDark(bg, true);
  const textColor = pbTextFor(bg, '#ffffff');
  const subColor  = pbSubFor(bg, 'rgba(255,255,255,0.6)');
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [captchaToken, setCaptchaToken] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await contactAPI.submit({ ...form, captcha_token: captchaToken });
      toast.success('Message sent!');
      setForm({ name: '', email: '', message: '' });
      setCaptchaToken('');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '14px 20px', borderRadius: '12px',
    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.12)',
    color: textColor, fontSize: '14px', fontFamily: PB_FONT, outline: 'none',
    transition: 'border-color 0.2s',
  };

  return (
    <section
      className="pb-section"
      id="contact"
      data-testid="pb-contact-section"
      style={{ backgroundColor: sectionBg, fontFamily: PB_FONT, color: textColor, paddingTop: '80px', paddingBottom: '80px' }}
    >
      <div className="max-w-6xl mx-auto px-6 sm:px-10 md:px-16 lg:px-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          <Reveal>
            <PBEyebrow number={sectionNumber} text={tt(contactSettings.title) || 'Get in touch'} onDark={isDark} />
            {tt(contactSettings.subtitle) && (
              <h2
                className="font-black tracking-tight leading-[1.0] mb-5"
                style={{ fontSize: 'clamp(32px, 4.5vw, 58px)', letterSpacing: '-0.02em', color: textColor }}
                data-testid="pb-contact-title"
              >
                {tt(contactSettings.subtitle)}
              </h2>
            )}
            <div className="w-10 h-[2px] mb-6" style={{ backgroundColor: 'var(--color-primary)' }} />
            {tt(contactSettings.description) && (
              <div
                className="leading-relaxed rich-text-content"
                style={{ color: subColor }}
                dangerouslySetInnerHTML={{ __html: normalizeRichText(tt(contactSettings.description)) }}
              />
            )}
          </Reveal>

          <Reveal delay={120}>
            <form onSubmit={submit} className="flex flex-col gap-4">
              <input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                required
                placeholder={tt(contactSettings.name_placeholder) || 'Your name'}
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; }}
                onBlur={e => { e.target.style.borderColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'; }}
              />
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                required
                placeholder={tt(contactSettings.email_placeholder) || 'Your email'}
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; }}
                onBlur={e => { e.target.style.borderColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'; }}
              />
              <textarea
                value={form.message}
                onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                required
                placeholder={tt(contactSettings.message_placeholder) || 'Your message'}
                rows={5}
                style={{ ...inputStyle, resize: 'none' }}
                onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; }}
                onBlur={e => { e.target.style.borderColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'; }}
              />
              <CaptchaWidget onChange={setCaptchaToken} testId="pb-contact-captcha" />
              <button
                type="submit"
                disabled={sending}
                className="w-full py-3.5 rounded-full font-bold text-sm inline-flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-button-bg)', color: 'var(--color-button-text)' }}
                data-testid="pb-contact-submit"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {tt(contactSettings.submit_text) || 'Send message'}
              </button>
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
