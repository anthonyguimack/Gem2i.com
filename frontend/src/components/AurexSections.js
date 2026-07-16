/**
 * Aurex One-page theme — public-site section components.
 *
 * All sections accept `{ config, items, bg, font, contrast }` props where:
 *   bg       — hex from section_configs (overrides schema suggestion)
 *   font     — font-family CSS string
 *   contrast — 'dark' or 'light' (text color scheme)
 *
 * Design notes match the Aurex spec: monochromatic palette, generous spacing,
 * subtle borders (not shadows), auto-alternating process steps, grayscale→color
 * partner/client hovers.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X as XIcon, Linkedin, Twitter, Globe, Calendar, ArrowRight, ArrowUpRight, Quote, Phone, Send, Loader2, Star, Clock, BookOpen, ExternalLink } from 'lucide-react';
import * as lucide from 'lucide-react';
import { toast } from 'sonner';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { AUREX_FONTS, AUREX_PALETTE, aurexContrastFor } from '../lib/themeColors';
import { normalizeRichText } from '../lib/richText';
import { useT } from '../lib/i18n';
import { useLang, itemHasLocale } from '../lib/i18n';
import { getTileUrl, getTileAttribution } from '../lib/mapConfig';
import { contactAPI, blogExternalAPI, checkoutAPI } from '../lib/api';
import CaptchaWidget from './CaptchaWidget';
import { useSettings } from '../App';

import { BACKEND_URL as API } from '../lib/config';
const resolveImg = (src) => (src && src.startsWith('/api') ? `${API}${src}` : src);

// ─── Scroll-reveal wrapper (IntersectionObserver) ────────────────────────

export function Reveal({ children, delay = 0, className = '', as: Tag = 'div', once = true, ...rest }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Graceful fallback for very old browsers: show immediately
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          setVisible(true);
          if (once) obs.unobserve(el);
        } else if (!once) {
          setVisible(false);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [once]);
  return (
    <Tag ref={ref} className={`aurex-reveal ${visible ? 'aurex-in' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }} {...rest}>
      {children}
    </Tag>
  );
}


// ─── Shared helpers ──────────────────────────────────────────────────────

function fontFor(key, contrast) {
  const f = AUREX_FONTS.find(x => x.key === key);
  if (f) return f.css;
  // Spec defaults: Inter for light bg, Sora for dark bg
  return contrast === 'dark' ? "'Inter', sans-serif" : "'Sora', sans-serif";
}

function sectionStyle({ bg, font, contrast }) {
  return {
    backgroundColor: bg || '#FFFFFF',
    color: contrast === 'light' ? '#FFFFFF' : '#111827',
    fontFamily: font || fontFor(null, contrast),
  };
}

function SectionShell({ bg, font, contrast, className = '', children, ...rest }) {
  return (
    <section className={`aurex-section px-6 sm:px-10 md:px-16 lg:px-24 py-16 md:py-24 ${className}`} style={sectionStyle({ bg, font, contrast })} {...rest}>
      <div className="max-w-7xl mx-auto">{children}</div>
    </section>
  );
}

function SectionHeader({ title, subtitle, eyebrow, contrast, centered = true, sectionNumber, action }) {
  const tt = useT();
  const eyebrowText = tt(eyebrow);
  const t1 = tt(title);
  const t2 = tt(subtitle);
  if (!eyebrowText && !t1 && !t2 && !sectionNumber) return null;
  // When a section number or right-side action (CTA button) is present → left-aligned split layout.
  // Otherwise keep the default centred layout.
  const isLeft = !centered || sectionNumber != null || action != null;
  return (
    <Reveal className={`${isLeft ? 'flex items-end justify-between gap-6 flex-wrap' : 'text-center'} mb-12 md:mb-16`}>
      <div>
        {(eyebrowText || sectionNumber) && (
          <p className={`text-[11px] uppercase tracking-[0.3em] font-semibold mb-3 ${contrast === 'light' ? 'text-gray-300' : 'text-gray-500'}`}>
            {sectionNumber && <span className="mr-1" style={{ color: 'var(--color-primary)' }}>{sectionNumber}/</span>}
            {eyebrowText}
          </p>
        )}
        {t1 && <h2 className="text-3xl md:text-5xl font-bold tracking-tight">{t1}</h2>}
        {t2 && <p className={`mt-4 max-w-2xl ${!isLeft ? 'mx-auto' : ''} ${contrast === 'light' ? 'text-gray-300' : 'text-gray-600'}`}>{t2}</p>}
      </div>
      {action && <div className="shrink-0 self-end">{action}</div>}
    </Reveal>
  );
}

function LucideIcon({ name, className = 'w-8 h-8' }) {
  if (!name) return null;
  // Normalize input (e.g. "briefcase" → "Briefcase")
  const key = name.charAt(0).toUpperCase() + name.slice(1);
  const Comp = lucide[key] || lucide[name];
  return Comp ? <Comp className={className} /> : null;
}

// ─── 1. Aurex is for you (target audience) ───────────────────────────────

export function AurexAudience({ config = {}, items = [], bg, font, contrast }) {
  const tt = useT();
  const { lang } = useLang();
  const c = { bg: bg || '#FFFFFF', font, contrast: contrast || aurexContrastFor(bg || '#FFFFFF') };
  // Locale filter: each item only renders in the locales its primary field
  // (title) has content for. Legacy plain strings show in all locales.
  const visibleItems = items.filter(i => itemHasLocale(i.title, lang));
  const cols = Math.min(visibleItems.length, 3);
  const ctaText = tt(config.cta_text);
  const ctaUrl = tt(config.cta_url);
  return (
    <SectionShell {...c} id="aurex-audience" data-testid="aurex-section-audience">
      <SectionHeader title={config.title} subtitle={config.subtitle} eyebrow={config.eyebrow} contrast={c.contrast} />
      <div className={`grid gap-8 ${cols === 1 ? 'grid-cols-1 max-w-md mx-auto' : cols === 2 ? 'grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
        {visibleItems.map((i, idx) => (
          <Reveal as="article" delay={idx * 100} key={i.id} className="border rounded-xl p-8" style={{ borderColor: c.contrast === 'light' ? 'rgba(255,255,255,.15)' : '#E5E7EB' }} data-testid={`audience-card-${i.id}`}>
            <LucideIcon name={i.icon} className="w-9 h-9 mb-5" />
            <h3 className="text-xl font-semibold mb-2">{tt(i.title)}</h3>
            {i.description && <div className={`text-sm leading-relaxed rich-text-content ${c.contrast === 'light' ? 'text-gray-300' : 'text-gray-600'}`} dangerouslySetInnerHTML={{ __html: normalizeRichText(tt(i.description)) }} />}
          </Reveal>
        ))}
      </div>
      {ctaText && ctaUrl && (
        <div className="text-center mt-12">
          <a href={ctaUrl} target={config.cta_new_tab ? '_blank' : '_self'} rel={config.cta_new_tab ? 'noopener noreferrer' : undefined} className="inline-flex items-center gap-2 px-7 py-2.5 rounded-full text-sm font-semibold transition-all hover:opacity-80" style={{ border: `1.5px solid ${c.contrast === 'light' ? 'rgba(255,255,255,0.7)' : '#111827'}`, color: c.contrast === 'light' ? '#FFFFFF' : '#111827', backgroundColor: 'transparent' }} data-testid="audience-cta">
            {ctaText} <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      )}
    </SectionShell>
  );
}

// ─── 2. Our Process (vertical timeline, alternating) ─────────────────────

export function AurexProcess({ config = {}, items = [], bg, font, contrast, sectionNumber }) {
  const tt = useT();
  const { lang } = useLang();
  const c = { bg: bg || '#1F2937', font, contrast: contrast || aurexContrastFor(bg || '#1F2937') };
  const visibleItems = items.filter(i => itemHasLocale(i.title, lang));
  if (!visibleItems.length) return null;   // hide section when no items
  return (
    <SectionShell {...c} id="aurex-process" data-testid="aurex-section-process">
      <SectionHeader title={config.title} subtitle={config.subtitle} eyebrow={config.eyebrow} contrast={c.contrast} sectionNumber={sectionNumber} />
      <div className="relative max-w-3xl mx-auto">
        {/* Center vertical line */}
        <div className="absolute left-8 md:left-1/2 top-2 bottom-2 w-px md:-translate-x-px" style={{ backgroundColor: c.contrast === 'light' ? 'rgba(255,255,255,.2)' : 'rgba(17,24,39,.15)' }} />
        {visibleItems.map((step, idx) => {
          const isLeft = idx % 2 === 0;
          return (
            <Reveal delay={idx * 120} key={step.id} className={`relative flex items-start gap-6 mb-12 ${isLeft ? 'md:flex-row' : 'md:flex-row-reverse'}`} data-testid={`process-step-${step.id}`}>
              {/* Node */}
              <div className="absolute left-8 md:left-1/2 md:-translate-x-1/2 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: c.contrast === 'light' ? '#FFFFFF' : '#111827', color: c.contrast === 'light' ? '#111827' : '#FFFFFF', boxShadow: `0 0 0 4px ${c.bg}` }}>
                {step.step_number || (idx + 1)}
              </div>
              <div className={`pl-20 md:pl-0 md:w-1/2 ${isLeft ? 'md:pr-16 md:text-right' : 'md:pl-16'}`}>
                <h3 className="text-lg md:text-xl font-semibold mb-2">{tt(step.title)}</h3>
                {step.description && <div className={`text-sm leading-relaxed rich-text-content ${c.contrast === 'light' ? 'text-gray-300' : 'text-gray-600'}`} dangerouslySetInnerHTML={{ __html: normalizeRichText(tt(step.description)) }} />}
              </div>
            </Reveal>
          );
        })}
      </div>
    </SectionShell>
  );
}

// ─── 3. Pricing ──────────────────────────────────────────────────────────

function parseFeatures(raw) {
  return String(raw || '').split(/\r?\n/).filter(Boolean).map(l => ({
    included: !l.startsWith('✗') && !l.toLowerCase().startsWith('x '),
    text: l.replace(/^✗\s*/, '').replace(/^x\s+/i, '').trim(),
  }));
}

export function AurexPricing({ config = {}, items = [], bg, font, contrast }) {
  const tt = useT();
  const { lang } = useLang();
  const c = { bg: bg || '#F4F6F8', font, contrast: contrast || aurexContrastFor(bg || '#F4F6F8') };
  const [annual, setAnnual] = useState(false);
  const visibleItems = items.filter(i => itemHasLocale(i.name, lang));
  if (!visibleItems.length) return null;   // hide section when no items
  return (
    <SectionShell {...c} id="aurex-pricing" data-testid="aurex-section-pricing">
      <SectionHeader title={config.title} subtitle={config.subtitle} eyebrow={config.eyebrow} contrast={c.contrast} />
      {config.show_toggle && (
        <div className="flex justify-center mb-10">
          <div className="inline-flex rounded-full p-1 border" style={{ borderColor: c.contrast === 'light' ? 'rgba(255,255,255,.2)' : '#E5E7EB' }}>
            {['Monthly', 'Annual'].map((lbl, i) => (
              <button key={lbl} onClick={() => setAnnual(i === 1)} className={`px-5 py-1.5 rounded-full text-xs font-medium transition-colors ${annual === (i === 1) ? 'text-white' : ''}`} style={annual === (i === 1) ? { backgroundColor: '#111827' } : {}}>{lbl}</button>
            ))}
          </div>
        </div>
      )}
      <div className={`grid gap-6 ${visibleItems.length === 1 ? 'grid-cols-1 max-w-sm mx-auto' : visibleItems.length === 2 ? 'grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
        {visibleItems.map((plan, idx) => {
          const price = annual ? plan.price_annual || plan.price : plan.price;
          const features = parseFeatures(tt(plan.features));
          const featured = !!plan.is_featured;
          return (
            <Reveal as="article" delay={idx * 100} key={plan.id} className={`rounded-2xl p-8 flex flex-col border transition-all ${featured ? 'scale-[1.03] lg:scale-[1.05] shadow-xl' : ''}`} style={{ borderColor: featured ? '#111827' : (c.contrast === 'light' ? 'rgba(255,255,255,.15)' : '#E5E7EB'), backgroundColor: featured && c.contrast === 'dark' ? '#FFFFFF' : undefined, color: featured && c.contrast === 'dark' ? '#111827' : undefined, borderWidth: featured ? 2 : 1 }} data-testid={`plan-card-${plan.id}`}>
              {plan.badge && (
                <span className="inline-block self-start px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4" style={{ backgroundColor: '#111827', color: '#FFFFFF' }}>{tt(plan.badge)}</span>
              )}
              <h3 className="text-xl font-semibold mb-2">{tt(plan.name)}</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">{tt(plan.currency) || '$'}{tt(price)}</span>
                {plan.period && <span className="text-sm text-gray-500 ml-1">{tt(plan.period)}</span>}
              </div>
              <ul className="flex-1 space-y-3 mb-8">
                {features.map((f, i) => (
                  <li key={i} className={`flex items-start gap-2 text-sm ${!f.included ? 'line-through opacity-50' : ''}`}>
                    {f.included ? <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> : <XIcon className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />}
                    <span>{f.text}</span>
                  </li>
                ))}
              </ul>
              {plan.cta_text && (
                <a href={plan.cta_url || '#'} target={plan.cta_new_tab ? '_blank' : '_self'} rel={plan.cta_new_tab ? 'noopener noreferrer' : undefined} className={`w-full text-center py-2.5 rounded-full text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2`} style={{ backgroundColor: featured ? '#111827' : 'transparent', color: featured ? '#FFFFFF' : 'inherit', border: featured ? 'none' : '1.5px solid currentColor' }}>{tt(plan.cta_text)} {featured && <ArrowRight className="w-4 h-4" />}</a>
              )}
            </Reveal>
          );
        })}
      </div>
    </SectionShell>
  );
}

// ─── 4. Our Team ─────────────────────────────────────────────────────────

export function AurexTeam({ config = {}, items = [], bg, font, contrast }) {
  const tt = useT();
  const { lang } = useLang();
  const settings = useSettings();
  const networks = (settings.social_links || []).filter(n => n.platform);
  const c = { bg: bg || '#FFFFFF', font, contrast: contrast || aurexContrastFor(bg || '#FFFFFF') };
  const filteredItems = items.filter(i => itemHasLocale(i.name, lang));
  const limit = config.max_visible ? Number(config.max_visible) : filteredItems.length;
  const visible = filteredItems.slice(0, limit);
  const iconFor = (network) => {
    const key = String(network.icon || network.platform || '').toLowerCase().replace(/[^a-z]/g, '');
    const map = { linkedin: Linkedin, twitter: Twitter, x: Twitter, facebook: lucide.Facebook, instagram: lucide.Instagram, youtube: lucide.Youtube, github: lucide.Github, globe: Globe };
    return map[key] || Globe;
  };
  return (
    <SectionShell {...c} id="aurex-team" data-testid="aurex-section-team">
      <SectionHeader title={config.title} subtitle={config.subtitle} eyebrow={config.eyebrow} contrast={c.contrast} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {visible.map((m, idx) => {
          // `m.social_links` is a dict { [networkId]: url }. Fall back to legacy fields.
          const memberSocial = m.social_links || {};
          const entries = networks.map(n => {
            const url = memberSocial[n.id]
              || (n.platform?.toLowerCase() === 'linkedin' ? m.linkedin_url : null)
              || (n.platform?.toLowerCase() === 'twitter' || n.platform?.toLowerCase() === 'x' ? m.twitter_url : null);
            return url ? { ...n, url, Icon: iconFor(n) } : null;
          }).filter(Boolean);
          return (
            <Reveal as="article" delay={idx * 100} key={m.id} className="group" data-testid={`team-card-${m.id}`}>
              <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                {m.photo_url ? <img src={m.photo_url} alt={m.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">{m.name?.[0]}</div>}
                {/* Bottom bio strip — fades in on hover, strictly inside the photo. */}
                {(m.bio || entries.length > 0) && (
                  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/85 via-black/60 to-transparent text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {m.bio && <p className="text-xs leading-relaxed mb-2 line-clamp-3">{tt(m.bio)}</p>}
                    {entries.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {entries.map(s => (
                          <a key={s.id} href={s.url} target="_blank" rel="noreferrer" title={s.platform} className="p-1.5 bg-white/15 rounded hover:bg-white/35 backdrop-blur-sm transition-colors" aria-label={s.platform}>
                            <s.Icon className="w-3.5 h-3.5" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {/* Name + role: always outside the photo so they never overlap icons. */}
              <div className="pt-4 text-center">
                <h3 className="font-semibold text-base">{tt(m.name)}</h3>
                {m.role && <p className={`text-xs uppercase tracking-wider mt-1 ${c.contrast === 'light' ? 'text-gray-400' : 'text-gray-500'}`}>{tt(m.role)}</p>}
              </div>
            </Reveal>
          );
        })}
      </div>
      {config.show_view_all && config.view_all_url && tt(config.view_all_text) && (
        <div className="text-center mt-12">
          <a href={config.view_all_url} target={config.view_all_new_tab ? '_blank' : '_self'} rel={config.view_all_new_tab ? 'noopener noreferrer' : undefined} className="inline-flex items-center gap-2 px-7 py-2.5 rounded-full text-sm font-semibold transition-all hover:opacity-80" style={{ border: `1.5px solid ${c.contrast === 'light' ? 'rgba(255,255,255,0.7)' : '#111827'}`, color: c.contrast === 'light' ? '#FFFFFF' : '#111827', backgroundColor: 'transparent' }}>{tt(config.view_all_text)} <ArrowRight className="w-4 h-4" /></a>
        </div>
      )}
    </SectionShell>
  );
}

// ─── 5. Events (from AUX Calendar) ───────────────────────────────────────

export function AurexEvents({ config = {}, items = [], bg, font, contrast, sectionNumber }) {
  const tt = useT();
  const { lang } = useLang();
  const c = { bg: bg || '#FFFFFF', font, contrast: contrast || aurexContrastFor(bg || '#FFFFFF') };
  const visibleItems = items.filter(e => itemHasLocale(e.title, lang));
  if (!visibleItems.length) return null;   // hide section when no events
  const btnStyle = { border: `1.5px solid ${c.contrast === 'light' ? 'rgba(255,255,255,0.7)' : '#111827'}`, color: c.contrast === 'light' ? '#FFFFFF' : '#111827', backgroundColor: 'transparent' };
  const btnCls = 'inline-flex items-center gap-2 px-7 py-2.5 rounded-full text-sm font-semibold transition-all hover:opacity-80';
  // View-all button lives in the header (right side) when items exist
  const viewAllBtn = (config.view_all_url && visibleItems.length > 0 && tt(config.view_all_text)) ? (
    <a href={config.view_all_url} target={config.view_all_new_tab ? '_blank' : '_self'} rel={config.view_all_new_tab ? 'noopener noreferrer' : undefined} className={btnCls} style={btnStyle}>
      {tt(config.view_all_text)} <ArrowRight className="w-4 h-4" />
    </a>
  ) : null;
  return (
    <SectionShell {...c} id="aurex-events" data-testid="aurex-section-events">
      <SectionHeader title={config.title} subtitle={config.subtitle} eyebrow={config.eyebrow} contrast={c.contrast} sectionNumber={sectionNumber} action={viewAllBtn} />
      {visibleItems.length === 0 ? (
        <p className="text-center text-sm" style={{ color: c.contrast === 'light' ? 'rgba(255,255,255,.6)' : '#6b7280' }}>{tt(config.empty_message) || 'No upcoming events.'}</p>
      ) : (
        <ul className="divide-y max-w-4xl mx-auto" style={{ borderColor: c.contrast === 'light' ? 'rgba(255,255,255,.1)' : '#E5E7EB' }}>
          {visibleItems.map((e, idx) => {
            const d = new Date(`${e.date}T${e.start_time || '00:00'}`);
            const day = String(d.getDate()).padStart(2, '0');
            const month = d.toLocaleDateString(undefined, { month: 'short' });
            return (
              <Reveal as="li" delay={idx * 80} key={e.id} className="py-6 flex items-center gap-6 flex-wrap md:flex-nowrap" data-testid={`event-row-${e.id}`}>
                <div className="text-center shrink-0">
                  <div className="text-4xl md:text-5xl font-bold leading-none">{day}</div>
                  <div className={`text-[10px] uppercase tracking-wider mt-1 ${c.contrast === 'light' ? 'text-gray-400' : 'text-gray-500'}`}>{month}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base md:text-lg truncate">{tt(e.title)}</h3>
                  <p className={`text-sm truncate ${c.contrast === 'light' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {e.start_time}{e.end_time ? ` – ${e.end_time}` : ''}{e.location ? ` · ${e.location}` : ''}
                  </p>
                </div>
                <Link to={`/my-account/event/${e.id}`} className="shrink-0 inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-semibold transition-colors" style={btnStyle}>{tt(config.view_text) || 'View'} <ArrowRight className="w-3 h-3" /></Link>
              </Reveal>
            );
          })}
        </ul>
      )}
    </SectionShell>
  );
}

// ─── 6. Partners (dark strip, grayscale→color) ───────────────────────────

function LogoRow({ items, autoscroll, scrollSpeed, contrast, className = '' }) {
  const list = autoscroll ? [...items, ...items] : items;
  return (
    <div className={`${autoscroll ? 'overflow-hidden' : ''} ${className}`}>
      <div className={autoscroll ? 'flex gap-10 items-center' : 'flex flex-wrap gap-8 items-center justify-center'} style={autoscroll ? { animation: `aurex-scroll ${scrollSpeed || 30}s linear infinite` } : undefined}>
        {list.map((p, i) => {
          const target = p.link_target === 'internal' ? '_self' : (p.link_target || '_blank');
          const Wrap = p.link_url ? 'a' : 'div';
          return (
            <Wrap key={`${p.id}-${i}`} href={p.link_url || undefined} target={p.link_url ? target : undefined} rel={p.link_url && target === '_blank' ? 'noreferrer' : undefined} className="shrink-0 block group" data-testid={`logo-${p.id}`}>
              {p.logo_url ? (
                <img src={p.logo_url} alt={p.name} className="h-10 md:h-12 w-auto object-contain transition-all duration-300" style={{ filter: 'grayscale(100%) brightness(1.4)' }} onMouseEnter={e => (e.currentTarget.style.filter = 'grayscale(0%) brightness(1)')} onMouseLeave={e => (e.currentTarget.style.filter = 'grayscale(100%) brightness(1.4)')} />
              ) : (
                <span className={`text-sm font-medium ${contrast === 'light' ? 'text-white/50' : 'text-gray-400'} group-hover:text-inherit`}>{p.name}</span>
              )}
            </Wrap>
          );
        })}
      </div>
    </div>
  );
}

export function AurexPartners({ config = {}, items = [], bg, font, contrast, sectionNumber }) {
  const tt = useT();
  const { lang } = useLang();
  const visibleItems = items.filter(i => itemHasLocale(i.name, lang));
  const c = { bg: bg || '#111827', font, contrast: contrast || aurexContrastFor(bg || '#111827') };
  if (!visibleItems.length) return null;   // hide section when no items
  const btnStyle = { border: `1.5px solid ${c.contrast === 'light' ? 'rgba(255,255,255,0.7)' : '#111827'}`, color: c.contrast === 'light' ? '#FFFFFF' : '#111827', backgroundColor: 'transparent' };
  const ctaBtn = (tt(config.cta_text) && tt(config.cta_url)) ? (
    <a href={tt(config.cta_url)} target={config.cta_new_tab ? '_blank' : '_self'} rel={config.cta_new_tab ? 'noopener noreferrer' : undefined}
       className="inline-flex items-center gap-2 px-7 py-2.5 rounded-full text-sm font-semibold transition-all hover:opacity-80" style={btnStyle}>
      {tt(config.cta_text)} <ArrowRight className="w-4 h-4" />
    </a>
  ) : null;
  return (
    <SectionShell {...c} id="aurex-partners" data-testid="aurex-section-partners">
      <SectionHeader title={config.title} subtitle={config.subtitle} eyebrow={config.eyebrow} contrast={c.contrast} sectionNumber={sectionNumber} action={ctaBtn} />
      <LogoRow items={visibleItems} autoscroll={config.autoscroll} scrollSpeed={config.scroll_speed} contrast={c.contrast} />
    </SectionShell>
  );
}

// ─── 7. Our Clients (light bg, gallery style) ────────────────────────────

export function AurexClients({ config = {}, items = [], bg, font, contrast, sectionNumber }) {
  const tt = useT();
  const { lang } = useLang();
  const visibleItems = items.filter(i => itemHasLocale(i.name, lang));
  const c = { bg: bg || '#F4F6F8', font, contrast: contrast || aurexContrastFor(bg || '#F4F6F8') };
  if (!visibleItems.length) return null;   // hide section when no items
  const btnStyle = { border: `1.5px solid ${c.contrast === 'light' ? 'rgba(255,255,255,0.7)' : '#111827'}`, color: c.contrast === 'light' ? '#FFFFFF' : '#111827', backgroundColor: 'transparent' };
  const ctaBtn = (tt(config.cta_text) && tt(config.cta_url)) ? (
    <a href={tt(config.cta_url)} target={config.cta_new_tab ? '_blank' : '_self'} rel={config.cta_new_tab ? 'noopener noreferrer' : undefined}
       className="inline-flex items-center gap-2 px-7 py-2.5 rounded-full text-sm font-semibold transition-all hover:opacity-80" style={btnStyle}>
      {tt(config.cta_text)} <ArrowRight className="w-4 h-4" />
    </a>
  ) : null;
  return (
    <SectionShell {...c} id="aurex-clients" data-testid="aurex-section-clients">
      <SectionHeader title={config.title} subtitle={config.subtitle} eyebrow={config.eyebrow} contrast={c.contrast} sectionNumber={sectionNumber} action={ctaBtn} />
      <LogoRow items={visibleItems} autoscroll={config.autoscroll} scrollSpeed={config.scroll_speed || 30} contrast={c.contrast} className="py-8" />
    </SectionShell>
  );
}

// ─── 8. Video ─────────────────────────────────────────────────────────────
// Single embedded video + optional title. Supports YouTube, Vimeo and direct
// video URLs. Render picks the right <iframe> or <video> automatically.

function buildEmbedUrl(url, autoplay) {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:.*v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt) {
    const params = autoplay ? '?autoplay=1&mute=1&loop=1&playlist=' + yt[1] : '';
    return `https://www.youtube.com/embed/${yt[1]}${params}`;
  }
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}${autoplay ? '?autoplay=1&muted=1&loop=1' : ''}`;
  return null;
}

export function AurexVideo({ config = {}, bg, font, contrast, sectionNumber }) {
  const c = { bg: bg || '#FFFFFF', font, contrast: contrast || aurexContrastFor(bg || '#FFFFFF') };
  const url = config.video_url;
  const embed = buildEmbedUrl(url, config.autoplay);
  const aspect = config.aspect_ratio || '16/9';
  const isDirect = url && !embed && /\.(mp4|webm|ogg)$/i.test(url);
  if (!url) return null;
  return (
    <SectionShell {...c} id="aurex-video" data-testid="aurex-section-video">
      {(config.eyebrow || config.title || config.subtitle || sectionNumber) && (
        <SectionHeader title={config.title} subtitle={config.subtitle} eyebrow={config.eyebrow} contrast={c.contrast} sectionNumber={sectionNumber} />
      )}
      <Reveal className="max-w-5xl mx-auto">
        <div className="relative rounded-xl overflow-hidden shadow-2xl" style={{ aspectRatio: aspect, backgroundColor: '#000' }}>
          {embed ? (
            <iframe src={embed} className="absolute inset-0 w-full h-full" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={config.title || 'Video'} />
          ) : isDirect ? (
            <video src={url} poster={config.poster_url || undefined} controls={!config.autoplay} autoPlay={!!config.autoplay} muted={!!config.autoplay} loop={!!config.autoplay} playsInline className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white/60 text-sm">Unsupported video URL.</div>
          )}
        </div>
      </Reveal>
    </SectionShell>
  );
}

// ─── Data hook: fetch all Aurex sections in parallel ─────────────────────

const SECTIONS_ITEMIZED = ['aurex_audience', 'aurex_process', 'aurex_pricing', 'aurex_team', 'aurex_partners', 'aurex_clients'];

// `personality` = undefined → all sections fetch global data (Aurex One-page + other themes)
// `personality` = 'business'|'lifestyle'|'personal' → PB mini-site: every section fetches
//   its personality-specific config + items, with the backend falling back to the global
//   doc when no scoped content exists for that personality.
export function useAurexSections(personality) {
  const [data, setData] = useState({});
  useEffect(() => {
    const keys = [
      ...SECTIONS_ITEMIZED, 'aurex_events', 'aurex_video', 'news_ticker',
      'aurex_services_cfg', 'aurex_testimonials_cfg', 'aurex_news_cfg', 'aurex_blog_cfg', 'aurex_locations_cfg',
      'aurex_reading_cfg', 'aurex_portfolio_cfg', 'aurex_gallery_cfg',
    ];
    Promise.all(keys.map(k => {
      // Pass personality for every section so CMS "Content Scope" per-personality
      // data is fetched. The backend falls back to global when no scoped doc exists.
      const param = personality ? `?personality=${personality}` : '';
      return fetch(`${API}/api/public/aurex/${k}${param}`)
        .then(r => r.ok ? r.json() : { config: {}, items: [] })
        .catch(() => ({ config: {}, items: [] }));
    }))
      .then(results => {
        const map = {};
        keys.forEach((k, i) => { map[k] = results[i]; });
        setData(map);
      });
  }, [personality]);
  return data;
}

// ═════════════════════════════════════════════════════════════════════════
//   Aurex "Mono" variants of the 9 existing sections.
//   Applied on HomePage.js when active_theme === 'aurex'. All follow the
//   monochrome palette (whites/grays/darks), subtle 1px borders (no heavy
//   shadows), sans-serif typography, and scroll-reveal.
//
//   Each variant accepts `{ bg, font }` from HomePage (pulled from
//   `settings.section_configs.aurex[<section_key>]`). When supplied, they
//   override the default bg/font and the text color scheme flips
//   automatically via luminance. If blank/undefined, the hardcoded
//   "tasteful defaults" below are used.
// ═════════════════════════════════════════════════════════════════════════

// Builds monochrome section style: CMS bg overrides the fallback; text
// color derived from bg luminance so a custom-picked dark hex still reads.
// Returns { style, textClass, mutedClass, borderColor, isDark }.
function monoStyle(bg, font, fallbackBg = '#FFFFFF') {
  const effectiveBg = bg || fallbackBg;
  const isDark = aurexContrastFor(effectiveBg) === 'light';
  return {
    style: {
      backgroundColor: effectiveBg,
      color: isDark ? '#FFFFFF' : '#111827',
      fontFamily: font || "'Inter', sans-serif",
    },
    textClass: isDark ? 'text-white' : 'text-gray-900',
    mutedClass: isDark ? 'text-white/70' : 'text-gray-600',
    eyebrowClass: isDark ? 'text-white/60' : 'text-gray-500',
    borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#E5E7EB',
    isDark,
  };
}

// Unified button used everywhere in the Aurex mono template. Pill (rounded-full),
// 1.5px border, matches the section's contrast automatically.
// Honors admin's "open in new tab" config per button.
function MonoButton({ href, text, newTab, m, extraClass = '', dataTestId, children }) {
  const tt = useT();
  const label = tt(text);
  if (!label && !children) return null;
  return (
    <a
      href={tt(href) || '#'}
      target={newTab ? '_blank' : '_self'}
      rel={newTab ? 'noopener noreferrer' : undefined}
      className={`inline-flex items-center gap-2 px-7 py-2.5 rounded-full text-sm font-semibold transition-all hover:opacity-80 ${extraClass}`}
      style={{ border: `1.5px solid ${m.isDark ? 'rgba(255,255,255,0.7)' : '#111827'}`, color: m.isDark ? '#FFFFFF' : '#111827', backgroundColor: 'transparent' }}
      data-testid={dataTestId}
    >
      {children || <>{label} <ArrowRight className="w-4 h-4" /></>}
    </a>
  );
}

const monoShell = 'aurex-section px-6 sm:px-10 md:px-16 lg:px-24 py-20 md:py-28';
const monoText = { color: '#111827', fontFamily: "'Inter', sans-serif" };

// About
export function AurexAboutMono({ data, bg, font }) {
  const tt = useT();
  const { lang } = useLang();
  // Hide the whole About section if the admin has no title translation
  // for the current locale. Legacy plain-string titles still render.
  if (!itemHasLocale(data?.title, lang)) return null;
  const img = resolveImg(data.image);
  const m = monoStyle(bg, font, '#FFFFFF');
  return (
    <section className={monoShell} style={m.style} id="about" data-testid="about-section">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
        <Reveal>
          {tt(data.label) && <p className={`text-[11px] uppercase tracking-[0.3em] font-semibold ${m.eyebrowClass} mb-4`}>{tt(data.label)}</p>}
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6" data-testid="about-title">{tt(data.title)}</h2>
          <div className="w-12 h-px mb-6" style={{ backgroundColor: m.isDark ? 'rgba(255,255,255,0.8)' : '#111827' }} />
          {tt(data.description) && <div className={`${m.mutedClass} leading-relaxed rich-text-content`} dangerouslySetInnerHTML={{ __html: normalizeRichText(tt(data.description)) }} />}
          <div className="flex items-center gap-6 mt-8 flex-wrap">
            {data.phone && <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ borderWidth: 1, borderStyle: 'solid', borderColor: m.borderColor }}><Phone className="w-4 h-4" /></div><div><p className={`text-[11px] uppercase tracking-wider ${m.eyebrowClass}`}>Call us</p><p className="text-sm font-semibold">{data.phone}</p></div></div>}
            {tt(data.signature_name) && <div className="pl-6" style={{ borderLeft: `1px solid ${m.borderColor}` }}><p className="font-semibold">{tt(data.signature_name)}</p>{tt(data.signature_title) && <p className={`text-xs ${m.mutedClass}`}>{tt(data.signature_title)}</p>}</div>}
          </div>
          {tt(data.button_text) && <div className="mt-8"><MonoButton href={data.button_url} text={data.button_text} newTab={data.button_open_in_new_tab} m={m} dataTestId="about-cta-btn" /></div>}
        </Reveal>
        {img && <Reveal delay={120}><img src={img} alt="" className="w-full rounded-xl object-cover aspect-[4/3]" style={{ borderWidth: 1, borderStyle: 'solid', borderColor: m.borderColor }} /></Reveal>}
      </div>
    </section>
  );
}

// Services
export function AurexServicesMono({ services, bg, font, cmsConfig = {} }) {
  const tt = useT();
  const { lang } = useLang();
  const filtered = (services || []).filter(s => itemHasLocale(s.title, lang));
  if (!filtered.length) return null;
  const m = monoStyle(bg, font, '#F9FAFB');
  const clean = (html) => (html || '').replace(/&nbsp;/g, ' ').replace(/\u00A0/g, ' ').replace(/<[^>]*>/g, '');
  // Each service card is only linked when the admin has explicitly set an
  // external URL. Otherwise the card renders as a passive display — the
  // website stays informational without forcing an internal service page.
  const hasLink = (s) => !!(s.external_url && String(s.external_url).trim());
  return (
    <section className={monoShell} style={m.style} id="services" data-testid="services-section">
      <div className="max-w-7xl mx-auto">
        <Reveal className="text-center mb-14">
          {tt(cmsConfig.eyebrow) && <p className={`text-[11px] uppercase tracking-[0.3em] font-semibold ${m.eyebrowClass} mb-3`}>{tt(cmsConfig.eyebrow)}</p>}
          {tt(cmsConfig.title) && <h2 className="text-3xl md:text-5xl font-bold tracking-tight" data-testid="services-title">{tt(cmsConfig.title)}</h2>}
          {tt(cmsConfig.subtitle) && <p className={`mt-4 max-w-2xl mx-auto ${m.mutedClass}`}>{tt(cmsConfig.subtitle)}</p>}
        </Reveal>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 md:gap-12">
          {filtered.slice(0, 6).map((s, idx) => {
            const linked = hasLink(s);
            const target = linked && s.open_in_new_tab ? '_blank' : '_self';
            const commonProps = {
              delay: idx * 80,
              key: s.id,
              className: `flex flex-col items-center text-center group ${linked ? 'cursor-pointer' : ''}`,
              'data-testid': `service-card-${s.id}`,
            };
            const linkProps = linked ? { as: 'a', href: s.external_url, target, rel: target === '_blank' ? 'noopener noreferrer' : undefined } : {};
            return (
              <Reveal {...commonProps} {...linkProps}>
                {s.image ? (
                  <div className="w-full aspect-[4/3] rounded-lg overflow-hidden mb-6 relative">
                    <img src={resolveImg(s.image)} alt={tt(s.title)} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" style={{ filter: m.isDark ? 'grayscale(15%)' : 'grayscale(25%)' }} />
                  </div>
                ) : (
                  <div className="w-full aspect-[4/3] rounded-lg mb-6 flex items-center justify-center" style={{ backgroundColor: m.isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6' }}>
                    <lucide.Briefcase className="w-10 h-10 opacity-30" />
                  </div>
                )}
                <h3 className={`font-bold text-xl md:text-2xl mb-3 ${linked ? 'group-hover:underline underline-offset-4' : ''}`} style={{ fontFamily: "'Playfair Display', serif" }}>{tt(s.title)}</h3>
                {(s.short_description || s.description) && (
                  <p className={`text-sm leading-relaxed ${m.mutedClass} max-w-xs`}>{clean(tt(s.short_description) || tt(s.description)).slice(0, 130)}</p>
                )}
              </Reveal>
            );
          })}
        </div>
        {tt(cmsConfig.cta_text) && (
          <Reveal delay={200} className="text-center mt-14">
            <MonoButton href={cmsConfig.cta_url} text={cmsConfig.cta_text} newTab={cmsConfig.cta_new_tab} m={m} dataTestId="services-view-all" />
          </Reveal>
        )}
      </div>
    </section>
  );
}

// News
export function AurexNewsMono({ posts, bg, font, cmsConfig = {}, sectionNumber }) {
  const tt = useT();
  const { lang } = useLang();
  const filtered = (posts || []).filter(p => itemHasLocale(p.title, lang));
  if (!filtered.length) return null;
  const m = monoStyle(bg, font, '#FFFFFF');
  return (
    <section className={monoShell} style={m.style} id="news" data-testid="news-section">
      <div className="max-w-7xl mx-auto">
        <Reveal className="flex items-end justify-between mb-12 flex-wrap gap-4">
          <div>
            {(sectionNumber || tt(cmsConfig.eyebrow)) && (
              <p className={`text-[11px] uppercase tracking-[0.3em] font-semibold mb-3`} style={{ color: 'var(--color-primary)' }}>
                {sectionNumber && <span className="mr-1">{sectionNumber}/</span>}
                {tt(cmsConfig.eyebrow)}
              </p>
            )}
            {tt(cmsConfig.title) && <h2 className="text-3xl md:text-5xl font-bold tracking-tight" data-testid="news-title">{tt(cmsConfig.title)}</h2>}
            {tt(cmsConfig.subtitle) && <p className={`mt-2 max-w-2xl ${m.mutedClass}`}>{tt(cmsConfig.subtitle)}</p>}
          </div>
          {tt(cmsConfig.cta_text) && <MonoButton href={cmsConfig.cta_url} text={cmsConfig.cta_text} newTab={cmsConfig.cta_new_tab} m={m} dataTestId="news-view-all" />}
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filtered.slice(0, 3).map((p, idx) => (
            <Reveal as={Link} delay={idx * 80} to={`/news/${p.slug || p.id}`} key={p.id} className="group rounded-xl overflow-hidden transition-colors block" style={{ borderWidth: 1, borderStyle: 'solid', borderColor: m.borderColor }}>
              {p.image && <div className="aspect-[16/10] overflow-hidden" style={{ backgroundColor: m.isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB' }}><img src={resolveImg(p.image)} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" style={{ filter: 'grayscale(10%)' }} /></div>}
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3"><Clock className={`w-3 h-3 ${m.eyebrowClass}`} /><span className={`text-[11px] uppercase tracking-wider ${m.eyebrowClass}`}>{new Date(p.created_at).toLocaleDateString()}</span></div>
                <h3 className="font-semibold text-lg mb-2 line-clamp-2">{tt(p.title)}</h3>
                {/* Render the admin's rich-text summary. Fall back to a
                    stripped-HTML excerpt from the article body only when
                    the admin hasn't filled the summary. */}
                {tt(p.summary)
                  ? <div className={`text-sm ${m.mutedClass} line-clamp-2 rich-text-content`} dangerouslySetInnerHTML={{ __html: normalizeRichText(tt(p.summary)) }} />
                  : (tt(p.excerpt) || tt(p.content))
                    ? <p className={`text-sm ${m.mutedClass} line-clamp-2`}>{(tt(p.excerpt) || tt(p.content) || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\u00A0/g, ' ').slice(0, 120)}</p>
                    : null}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// External Blog
export function AurexBlogMono({ bg, font, cmsConfig = {}, sectionNumber }) {
  const tt = useT();
  const { lang } = useLang();
  const settings = useSettings();
  const m = monoStyle(bg, font, '#F9FAFB');
  const PER = 3;
  // Per-block KMS category selection (EXTERNAL_BLOG_KMS_SECTIONS_PLAN §2.5):
  // when the admin has picked categories, render one labelled section per
  // category; otherwise keep the legacy flat "latest N" feed.
  const catCfg = (Array.isArray(cmsConfig.kms_categories) ? cmsConfig.kms_categories : [])
    .filter(c => c && c.slug);
  const slugs = catCfg.map(c => c.slug).join(',');
  const [posts, setPosts] = useState([]);
  const [sections, setSections] = useState([]);
  useEffect(() => {
    if (!settings.blog_api_url) return;
    if (slugs) {
      blogExternalAPI.getLatest(slugs, PER).then(r => setSections(r.data?.sections || [])).catch(() => {});
    } else {
      blogExternalAPI.getLatest().then(r => setPosts(r.data?.posts || [])).catch(() => {});
    }
  }, [settings.blog_api_url, slugs]);

  // Optional per-category label override from the block config; else the KMS name.
  const labelFor = (s) => {
    const cfg = catCfg.find(c => c.slug === s.slug);
    return (cfg && cfg.label && tt(cfg.label)) || s.label || s.name || '';
  };

  // External blog posts come from a 3rd-party source — they're plain-string
  // titles. `itemHasLocale` treats plain strings as visible in all locales.
  const visible = (arr) => (arr || []).filter(p => itemHasLocale(p.title, lang));
  const card = (p, i) => (
    <Reveal as="a" href={p.url || p.link} target="_blank" rel="noreferrer" delay={i * 80} key={i} className="group rounded-xl overflow-hidden transition-colors block" style={{ backgroundColor: m.isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderWidth: 1, borderStyle: 'solid', borderColor: m.borderColor }}>
      {p.image && <div className="aspect-[16/10] overflow-hidden"><img src={p.image} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" style={{ filter: 'grayscale(10%)' }} /></div>}
      <div className="p-6">
        <h3 className="font-semibold text-lg mb-2 flex items-center gap-1 line-clamp-2">{p.title} <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-40" /></h3>
        <p className={`text-sm ${m.mutedClass} line-clamp-2`}>{p.summary || p.excerpt}</p>
      </div>
    </Reveal>
  );

  const grouped = slugs
    ? sections.map(s => ({ ...s, _posts: visible(s.posts).slice(0, PER) })).filter(s => s._posts.length)
    : [];
  const flat = slugs ? [] : visible(posts).slice(0, PER);
  if (slugs ? !grouped.length : !flat.length) return null;

  return (
    <section className={monoShell} style={m.style} id="blog" data-testid="blog-section">
      <div className="max-w-7xl mx-auto">
        <Reveal className="flex items-end justify-between mb-12 flex-wrap gap-4">
          <div>
            {(sectionNumber || tt(cmsConfig.eyebrow)) && (
              <p className={`text-[11px] uppercase tracking-[0.3em] font-semibold mb-3`} style={{ color: 'var(--color-primary)' }}>
                {sectionNumber && <span className="mr-1">{sectionNumber}/</span>}
                {tt(cmsConfig.eyebrow)}
              </p>
            )}
            {tt(cmsConfig.title) && <h2 className="text-3xl md:text-5xl font-bold tracking-tight" data-testid="blog-title">{tt(cmsConfig.title)}</h2>}
            {tt(cmsConfig.subtitle) && <p className={`mt-2 max-w-2xl ${m.mutedClass}`}>{tt(cmsConfig.subtitle)}</p>}
          </div>
          {tt(cmsConfig.cta_text) && <MonoButton href={cmsConfig.cta_url} text={cmsConfig.cta_text} newTab={cmsConfig.cta_new_tab} m={m} dataTestId="blog-view-all" />}
        </Reveal>
        {slugs ? (
          <div className="space-y-14">
            {grouped.map((s, si) => (
              <div key={s.slug || si} data-testid={`blog-cat-${s.slug}`}>
                <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
                  <h3 className="text-xl md:text-2xl font-bold tracking-tight">{labelFor(s)}</h3>
                  {s.url && (
                    <a href={s.url} target="_blank" rel="noreferrer" className="text-sm font-medium inline-flex items-center gap-1 hover:gap-2 transition-all" style={{ color: 'var(--color-primary)' }} data-testid={`blog-cat-viewall-${s.slug}`}>
                      View all <ArrowRight className="w-4 h-4" />
                    </a>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {s._posts.map((p, i) => card(p, i))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {flat.map((p, i) => card(p, i))}
          </div>
        )}
      </div>
    </section>
  );
}

// Reading List
export function AurexReadingMono({ books, bg, font, cmsConfig = {} }) {
  const tt = useT();
  const { lang } = useLang();
  const filtered = (books || []).filter(b => itemHasLocale(b.title, lang));
  if (!filtered.length) return null;
  const m = monoStyle(bg, font, '#FFFFFF');
  return (
    <section className={monoShell} style={m.style} id="reading-list" data-testid="reading-section">
      <div className="max-w-7xl mx-auto">
        <Reveal className="flex items-end justify-between mb-12 flex-wrap gap-4">
          <div>
            <p className={`text-[11px] uppercase tracking-[0.3em] font-semibold ${m.eyebrowClass} mb-3`}>{tt(cmsConfig.eyebrow) || 'Reading'}</p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight" data-testid="reading-title">{tt(cmsConfig.title) || 'Reading List'}</h2>
            {tt(cmsConfig.subtitle) && <p className={`mt-3 ${m.mutedClass}`}>{tt(cmsConfig.subtitle)}</p>}
          </div>
          <Link to={tt(cmsConfig.cta_url) || '/reading-list'} target={cmsConfig.cta_new_tab ? '_blank' : '_self'} rel="noopener noreferrer" className="text-sm font-medium inline-flex items-center gap-1 hover:gap-2 transition-all">{tt(cmsConfig.cta_text) || 'View all'} <ArrowRight className="w-4 h-4" /></Link>
        </Reveal>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {filtered.slice(0, 5).map((b, idx) => {
            const cover = b.image || b.cover_image;
            const src = resolveImg(cover);
            return (
              <Reveal as={Link} to="/reading-list" delay={idx * 60} key={b.id} className="group rounded-xl overflow-hidden transition-colors block" style={{ backgroundColor: m.isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderWidth: 1, borderStyle: 'solid', borderColor: m.borderColor }}>
                {src ? <div className="aspect-[2/3] overflow-hidden" style={{ backgroundColor: m.isDark ? 'rgba(255,255,255,0.04)' : '#F9FAFB' }}><img src={src} alt={tt(b.title)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /></div>
                     : <div className="aspect-[2/3] flex items-center justify-center bg-gray-900"><BookOpen className="w-8 h-8 text-white/60" /></div>}
                <div className="p-3">
                  <p className="text-sm font-semibold truncate">{tt(b.title)}</p>
                  <p className={`text-xs ${m.mutedClass} truncate`}>{tt(b.author)}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// Map
export function AurexMapMono({ maps, locations, title, mapsLang, bg, font, cmsConfig = {} }) {
  const tt = useT();
  const all = [...(maps || []).filter(m => m.lat && m.lng), ...(locations || []).filter(l => l.lat && l.lng)];
  if (!all.length) return null;
  const m = monoStyle(bg, font, '#F4F6F8');
  const center = [all[0].lat, all[0].lng];
  const lang = mapsLang || 'local';
  return (
    <section className={monoShell} style={m.style} id="locations" data-testid="map-section">
      <div className="max-w-7xl mx-auto">
        <Reveal className="text-center mb-12">
          {tt(cmsConfig.eyebrow) && <p className={`text-[11px] uppercase tracking-[0.3em] font-semibold ${m.eyebrowClass} mb-3`}>{tt(cmsConfig.eyebrow)}</p>}
          {(tt(cmsConfig.title) || tt(title)) && <h2 className="text-3xl md:text-5xl font-bold tracking-tight" data-testid="map-title">{tt(cmsConfig.title) || tt(title)}</h2>}
          {tt(cmsConfig.subtitle) && <p className={`mt-3 max-w-2xl mx-auto ${m.mutedClass}`}>{tt(cmsConfig.subtitle)}</p>}
        </Reveal>
        <Reveal className="rounded-xl overflow-hidden h-[420px]" style={{ borderWidth: 1, borderStyle: 'solid', borderColor: m.borderColor }}>
          <MapContainer center={center} zoom={5} style={{ height: '100%', width: '100%' }}>
            <TileLayer url={getTileUrl(lang)} attribution={getTileAttribution(lang)} />
            <MarkerClusterGroup>
              {all.map((loc, i) => (<Marker key={i} position={[loc.lat, loc.lng]}><Popup><strong>{loc.title || loc.name}</strong>{loc.description && <p>{loc.description}</p>}{loc.link && <a href={loc.link} target={loc.open_in_new_tab ? '_blank' : '_self'} rel="noreferrer" className="text-blue-500 underline">Visit</a>}</Popup></Marker>))}
            </MarkerClusterGroup>
          </MapContainer>
        </Reveal>
      </div>
    </section>
  );
}

// Portfolio
export function AurexPortfolioMono({ items, bg, font, cmsConfig = {} }) {
  const tt = useT();
  const { lang } = useLang();
  const filtered = (items || []).filter(i => itemHasLocale(i.title, lang));
  if (!filtered.length) return null;
  const m = monoStyle(bg, font, '#FFFFFF');
  return (
    <section className={monoShell} style={m.style} id="portfolio" data-testid="portfolio-section">
      <div className="max-w-7xl mx-auto">
        <Reveal className="flex items-end justify-between mb-12 flex-wrap gap-4">
          <div>
            <p className={`text-[11px] uppercase tracking-[0.3em] font-semibold ${m.eyebrowClass} mb-3`}>{tt(cmsConfig.eyebrow) || 'Our work'}</p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight" data-testid="portfolio-title">{tt(cmsConfig.title) || 'Featured Projects'}</h2>
            {tt(cmsConfig.subtitle) && <p className={`mt-3 ${m.mutedClass}`}>{tt(cmsConfig.subtitle)}</p>}
          </div>
          <Link to={tt(cmsConfig.cta_url) || '/featured-projects'} target={cmsConfig.cta_new_tab ? '_blank' : '_self'} rel="noopener noreferrer" className="text-sm font-medium inline-flex items-center gap-1 hover:gap-2 transition-all" data-testid="portfolio-view-all">{tt(cmsConfig.cta_text) || 'View all'} <ArrowRight className="w-4 h-4" /></Link>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.slice(0, 4).map((p, idx) => (
            <Reveal delay={idx * 100} key={p.id} className="group relative rounded-xl overflow-hidden" style={{ borderWidth: 1, borderStyle: 'solid', borderColor: m.borderColor }}>
              {p.image && <img src={resolveImg(p.image)} alt="" className="w-full h-80 object-cover transition-all duration-500 group-hover:scale-105" style={{ filter: 'grayscale(30%)' }} />}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex items-end p-7 opacity-90 group-hover:opacity-100 transition-opacity">
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-wider text-white/70 mb-1">{p.category}</p>
                  <h3 className="text-xl font-semibold text-white">{p.title}</h3>
                </div>
                {p.link && <a href={p.link} target={p.open_in_new_tab ? '_blank' : '_self'} rel="noreferrer" className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center text-white hover:bg-white/30 flex-shrink-0 backdrop-blur-sm"><ArrowUpRight className="w-4 h-4" /></a>}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// Gallery
export function AurexGalleryMono({ items, bg, font, cmsConfig = {} }) {
  const tt = useT();
  const { lang } = useLang();
  const filtered = (items || []).filter(i => itemHasLocale(i.title, lang));
  if (!filtered.length) return null;
  const m = monoStyle(bg, font, '#F9FAFB');
  return (
    <section className={monoShell} style={m.style} id="gallery" data-testid="gallery-section">
      <div className="max-w-7xl mx-auto">
        <Reveal className="flex items-end justify-between mb-12 flex-wrap gap-4">
          <div>
            <p className={`text-[11px] uppercase tracking-[0.3em] font-semibold ${m.eyebrowClass} mb-3`}>{tt(cmsConfig.eyebrow) || 'Moments'}</p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight" data-testid="gallery-title">{tt(cmsConfig.title) || 'Gallery'}</h2>
            {tt(cmsConfig.subtitle) && <p className={`mt-3 ${m.mutedClass}`}>{tt(cmsConfig.subtitle)}</p>}
          </div>
          <Link to={tt(cmsConfig.cta_url) || '/gallery'} target={cmsConfig.cta_new_tab ? '_blank' : '_self'} rel="noopener noreferrer" className="text-sm font-medium inline-flex items-center gap-1 hover:gap-2 transition-all">{tt(cmsConfig.cta_text) || 'View all'} <ArrowRight className="w-4 h-4" /></Link>
        </Reveal>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {filtered.slice(0, 6).map((img, idx) => (
            <Reveal delay={idx * 60} key={img.id} className="group overflow-hidden rounded-xl" style={{ borderWidth: 1, borderStyle: 'solid', borderColor: m.borderColor }}>
              <img src={resolveImg(img.image)} alt={img.title} className="w-full aspect-square object-cover group-hover:scale-105 transition-all duration-500" style={{ filter: 'grayscale(40%)' }} onMouseEnter={e => (e.currentTarget.style.filter = 'grayscale(0%)')} onMouseLeave={e => (e.currentTarget.style.filter = 'grayscale(40%)')} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// Testimonials — carousel: arrows + dots, 3 visible on desktop, 1 on mobile.
export function AurexTestimonialsMono({ items, bg, font, cmsConfig = {} }) {
  const tt = useT();
  const { lang } = useLang();
  const m = monoStyle(bg, font, '#FFFFFF');
  const [page, setPage] = useState(0);
  const [perView, setPerView] = useState(3);
  useEffect(() => {
    const calc = () => setPerView(window.innerWidth < 640 ? 1 : window.innerWidth < 1024 ? 2 : 3);
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);
  // Filter testimonials by locale AND visibility. Items marked `visible:
  // false` in the CMS are hidden on the public site — this matches how
  // admins expect to disable a quote without deleting it.
  const filtered = (items || []).filter(t => t.visible !== false && itemHasLocale(t.content, lang));
  // Reset page when filter changes to avoid out-of-range index
  useEffect(() => { setPage(0); }, [lang, filtered.length]);
  if (!filtered.length) return null;
  const pageCount = Math.max(1, Math.ceil(filtered.length / perView));
  const go = (n) => setPage((n + pageCount) % pageCount);
  const visible = filtered.slice(page * perView, page * perView + perView);
  return (
    <section className={monoShell} style={m.style} id="testimonials" data-testid="testimonials-section">
      <div className="max-w-7xl mx-auto">
        <Reveal className="text-center mb-14">
          {tt(cmsConfig.eyebrow) && <p className={`text-[11px] uppercase tracking-[0.3em] font-semibold ${m.eyebrowClass} mb-3`}>{tt(cmsConfig.eyebrow)}</p>}
          {tt(cmsConfig.title) && <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-3" data-testid="testimonials-title" style={{ fontFamily: "'Playfair Display', serif" }}>{tt(cmsConfig.title)}</h2>}
          {tt(cmsConfig.subtitle) && <p className={`text-sm ${m.mutedClass}`}>{tt(cmsConfig.subtitle)}</p>}
        </Reveal>
        <div className="relative">
          <button onClick={() => go(page - 1)} aria-label="Previous testimonials" className={`absolute -left-2 md:-left-8 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:opacity-80 ${m.isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`} data-testid="testimonials-prev">
            <lucide.ChevronLeft className="w-5 h-5" />
          </button>
          <div className="grid gap-6 px-2" style={{ gridTemplateColumns: `repeat(${perView}, minmax(0, 1fr))` }}>
            {visible.map((t, idx) => {
              // Backend stores: name, title (role/position), content, image (photo)
              const photo = t.image || t.avatar;
              const roleLabel = tt(t.title) || tt(t.role);
              return (
              <Reveal delay={idx * 100} key={`${page}-${t.id}`} className="rounded-xl p-8 text-center flex flex-col items-center" style={{ backgroundColor: m.isDark ? 'rgba(255,255,255,0.04)' : '#F3F4F6' }} data-testid={`testimonial-card-${t.id}`}>
                {/* Order per CMS feedback: quote → photo → name → role */}
                <p className={`text-sm md:text-base italic leading-relaxed mb-6 ${m.mutedClass}`}>"{tt(t.content)}"</p>
                {photo ? (
                  <img src={resolveImg(photo)} alt={tt(t.name)} className="w-20 h-20 rounded-full object-cover mb-5 border-2" style={{ borderColor: m.isDark ? 'rgba(255,255,255,0.15)' : '#E5E7EB' }} />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gray-200 mb-5 flex items-center justify-center text-xl font-bold text-gray-400">{tt(t.name)?.[0] || '?'}</div>
                )}
                <h3 className="font-bold text-lg md:text-xl" style={{ fontFamily: "'Playfair Display', serif" }}>{tt(t.name)}</h3>
                {roleLabel && <p className={`text-[11px] uppercase tracking-[0.2em] mt-2 ${m.eyebrowClass}`}>{roleLabel}{tt(t.company) ? ` · ${tt(t.company)}` : ''}</p>}
              </Reveal>
              );
            })}
          </div>
          <button onClick={() => go(page + 1)} aria-label="Next testimonials" className={`absolute -right-2 md:-right-8 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:opacity-80 ${m.isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`} data-testid="testimonials-next">
            <lucide.ChevronRight className="w-5 h-5" />
          </button>
        </div>
        {pageCount > 1 && (
          <div className="flex justify-center gap-2 mt-10">
            {Array.from({ length: pageCount }).map((_, i) => (
              <button key={i} onClick={() => setPage(i)} className={`rounded-full transition-all ${i === page ? 'w-6' : 'w-2 hover:opacity-60'} h-2`} style={{ backgroundColor: i === page ? (m.isDark ? '#FFFFFF' : '#111827') : (m.isDark ? 'rgba(255,255,255,0.3)' : 'rgba(17,24,39,0.3)') }} aria-label={`Page ${i + 1}`} data-testid={`testimonials-dot-${i}`} />
            ))}
          </div>
        )}
        {cmsConfig.cta_text && (
          <Reveal delay={150} className="text-center mt-10">
            <MonoButton href={cmsConfig.cta_url} text={cmsConfig.cta_text} newTab={cmsConfig.cta_new_tab} m={m} dataTestId="testimonials-cta" />
          </Reveal>
        )}
      </div>
    </section>
  );
}

// Contact
export function AurexContactMono({ contactSettings, bg, font }) {
  const tt = useT();
  const cs = contactSettings || {};
  const m = monoStyle(bg, font, '#111827');
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [captchaToken, setCaptchaToken] = useState('');
  const [sending, setSending] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    try { await contactAPI.submit({ ...form, captcha_token: captchaToken }); toast.success('Message sent!'); setForm({ name: '', email: '', message: '' }); setCaptchaToken(''); }
    catch (err) { toast.error(err?.response?.data?.detail || 'Failed to send'); }
    finally { setSending(false); }
  };
  // When dark: transparent inputs; when light: soft gray inputs
  const inputClass = m.isDark
    ? 'w-full px-5 py-3.5 bg-white/5 border border-white/15 rounded-lg text-sm placeholder:text-white/40 focus:outline-none focus:border-white/60 transition-colors'
    : 'w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:border-gray-800 transition-colors';
  return (
    <section className={monoShell} style={m.style} id="contact" data-testid="contact-section">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
        <Reveal>
          {tt(cs.title) && <p className={`text-[11px] uppercase tracking-[0.3em] font-semibold ${m.eyebrowClass} mb-4`}>{tt(cs.title)}</p>}
          {tt(cs.subtitle) && <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-5" data-testid="contact-title">{tt(cs.subtitle)}</h2>}
          <div className="w-12 h-px mb-6" style={{ backgroundColor: m.isDark ? 'rgba(255,255,255,0.4)' : '#111827' }} />
          {tt(cs.description) && <div className={`${m.mutedClass} leading-relaxed rich-text-content`} dangerouslySetInnerHTML={{ __html: normalizeRichText(tt(cs.description)) }} />}
        </Reveal>
        <Reveal delay={120} as="form" onSubmit={submit} className="space-y-4">
          <input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} required placeholder={tt(cs.name_placeholder) || 'Your name'} className={inputClass} style={{ color: 'inherit' }} />
          <input type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} required placeholder={tt(cs.email_placeholder) || 'Your email'} className={inputClass} style={{ color: 'inherit' }} />
          <textarea value={form.message} onChange={e => setForm(p => ({...p, message: e.target.value}))} required placeholder={tt(cs.message_placeholder) || 'Your message'} rows={5} className={`${inputClass} resize-none`} style={{ color: 'inherit' }} />
          <CaptchaWidget onChange={setCaptchaToken} testId="contact-captcha" />
          <button type="submit" disabled={sending} className="w-full py-3 rounded-full font-semibold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50 transition-colors" style={{ backgroundColor: m.isDark ? '#FFFFFF' : '#111827', color: m.isDark ? '#111827' : '#FFFFFF' }} data-testid="contact-submit">{sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} {tt(cs.submit_text) || 'Send message'}</button>
        </Reveal>
      </div>
    </section>
  );
}

// ─── Hero (Aurex monochrome) ─────────────────────────────────────────────
// Supports CMS slides + countdown + single-column typography-forward layout.
// Falls back to the optional photo — rendered in grayscale — as a side column.

// A/B testing helpers — deterministic per-browser bucket, persisted in localStorage.
function getVisitorId() {
  try {
    let v = localStorage.getItem('aurex_visitor_id');
    if (!v) {
      v = `v_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
      localStorage.setItem('aurex_visitor_id', v);
    }
    return v;
  } catch { return 'anon'; }
}
function getVariantFor(slideId) {
  if (!slideId) return 'A';
  try {
    const key = `aurex_ab_${slideId}`;
    let v = localStorage.getItem(key);
    if (!v) {
      v = Math.random() < 0.5 ? 'A' : 'B';
      localStorage.setItem(key, v);
    }
    return v;
  } catch { return 'A'; }
}
function logHeroEvent(payload) {
  try {
    fetch(`${API}/api/public/hero-cta-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true, // allow tracking on click-navigate
    }).catch(() => {});
  } catch { /* noop */ }
}

function countdownParts(target) {
  if (!target) return null;
  const t = new Date(target).getTime();
  const diff = t - Date.now();
  if (isNaN(t) || diff <= 0) return null;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return { days, hours, mins, secs };
}

function CountdownMono({ target, light = false }) {
  const [parts, setParts] = useState(() => countdownParts(target));
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setParts(countdownParts(target)), 1000);
    return () => clearInterval(id);
  }, [target]);
  if (!parts) return null;
  const units = [['Days', parts.days], ['Hours', parts.hours], ['Min', parts.mins], ['Sec', parts.secs]];
  return (
    <div className="flex gap-6 md:gap-10 my-8" data-testid="hero-countdown">
      {units.map(([lbl, n]) => (
        <div key={lbl}>
          <div className={`text-4xl md:text-6xl font-bold tabular-nums leading-none ${light ? 'text-gray-900' : ''}`}>{String(n).padStart(2, '0')}</div>
          <div className={`text-[10px] uppercase tracking-[0.25em] mt-2 ${light ? 'text-gray-600' : 'text-white/50'}`}>{lbl}</div>
        </div>
      ))}
    </div>
  );
}

const stripHtml = (h) => (h || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

export function AurexHeroMono({ slides, data }) {
  const tt = useT();
  const allSlides = (slides && slides.length > 0 ? slides : (data?.title ? [data] : []));
  const [idx, setIdx] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    if (allSlides.length <= 1) return;
    const delay = allSlides[idx]?.delay || 9400;
    const t = setTimeout(() => setIdx(i => (i + 1) % allSlides.length), delay);
    return () => clearTimeout(t);
  }, [idx, allSlides]);
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  // Fire impressions for the visible slide's A/B-tracked buttons. Runs on every
  // slide change but only emits when ab_testing is on and the button has both
  // A and B variant text set.
  const curSlide = allSlides[idx];
  const curVariant = curSlide?.ab_testing_enabled ? getVariantFor(curSlide.id) : 'A';
  useEffect(() => {
    if (!curSlide?.ab_testing_enabled || !curSlide?.id) return;
    const vid = getVisitorId();
    [0, 1, 2].forEach(i => {
      const key = i === 0 ? '' : `_${i + 1}`;
      const textA = curSlide[`button${key}_text`];
      const textB = curSlide[`button${key}_text_variant_b`];
      if (textA && textB) {
        logHeroEvent({ slide_id: curSlide.id, button_index: i, variant: curVariant, event_type: 'impression', visitor_id: vid });
      }
    });
  }, [curSlide?.id, curVariant]); // eslint-disable-line react-hooks/exhaustive-deps
  if (allSlides.length === 0) return null;
  const s = allSlides[idx];
  const bg = s.background || s.background_image || '';

  // A/B testing: decide variant once per slide per visitor (persisted in localStorage).
  const abOn = !!s.ab_testing_enabled;
  const variant = abOn ? getVariantFor(s.id) : 'A';
  const pickText = (baseText, variantBText) => (abOn && variant === 'B' && variantBText ? variantBText : baseText);

  // Collect up to 3 CTAs into a single array. Filter by the translated text
  // so CTAs without a translation in the active locale are hidden.
  const ctas = [
    { text: pickText(s.button_text,   s.button_text_variant_b),   url: s.button_url   || s.button_link, target: s.window_open === 'new' ? '_blank' : '_self' },
    { text: pickText(s.button_2_text, s.button_2_text_variant_b), url: s.button_2_url, target: s.button_2_window_open === 'new' ? '_blank' : '_self' },
    { text: pickText(s.button_3_text, s.button_3_text_variant_b), url: s.button_3_url, target: s.button_3_window_open === 'new' ? '_blank' : '_self' },
  ].filter(c => tt(c.text));

  const onCtaClick = (buttonIndex) => {
    if (!abOn || !s?.id) return;
    const key = buttonIndex === 0 ? '' : `_${buttonIndex + 1}`;
    // Only track buttons that have a B variant (ie. actually in the test)
    if (!s[`button${key}_text_variant_b`]) return;
    logHeroEvent({ slide_id: s.id, button_index: buttonIndex, variant, event_type: 'click', visitor_id: getVisitorId() });
  };

  // Parallax: image translates 0 → +80px as user scrolls 0 → 600px
  const parallax = Math.min(scrollY * 0.25, 120);

  return (
    <section className="aurex-section relative overflow-hidden bg-white" data-testid="hero-section" style={{ fontFamily: "'Inter', sans-serif" }}>
      {bg && (
        <>
          <div className="absolute inset-0 bg-cover bg-center will-change-transform" style={{ backgroundImage: `url(${bg})`, transform: `translate3d(0, ${parallax}px, 0) scale(1.08)` }} />
          {/* Soft light overlay that fades from bright-left to transparent-right to keep text legible without killing the photo */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.55) 45%, rgba(255,255,255,0.05) 85%)' }} />
        </>
      )}
      <div className="relative max-w-7xl mx-auto px-6 sm:px-10 md:px-16 lg:px-24 py-24 md:py-36 min-h-[620px] md:min-h-[760px] flex items-end">
        <div className="w-full max-w-3xl">
          {s.subtitle && (
            <Reveal>
              <p className="text-[11px] uppercase tracking-[0.3em] font-semibold text-gray-700 mb-5" data-testid="hero-subtitle" dangerouslySetInnerHTML={{ __html: stripHtml(tt(s.subtitle)) }} />
            </Reveal>
          )}
          {s.title && (
            <Reveal delay={100}>
              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-[0.95] tracking-tight text-gray-900 mb-8" data-testid="hero-title">
                {(() => { const title = tt(s.title); return typeof title === 'string' && title.includes('<') ? <span dangerouslySetInnerHTML={{ __html: normalizeRichText(title) }} /> : title?.split('\n').map((line, i) => <React.Fragment key={i}>{i > 0 && <br />}<span className={i > 0 ? 'italic font-light text-gray-700' : ''}>{line}</span></React.Fragment>); })()}
              </h1>
            </Reveal>
          )}
          {s.countdown_to && <Reveal delay={200}><CountdownMono target={s.countdown_to} light /></Reveal>}
          {s.description && (
            <Reveal delay={250}>
              <div className="text-base md:text-lg text-gray-700 max-w-xl leading-relaxed rich-text-content mb-10" data-testid="hero-description" dangerouslySetInnerHTML={{ __html: normalizeRichText(tt(s.description)) }} />
            </Reveal>
          )}
          {ctas.length > 0 && (
            <Reveal delay={300}>
              <div className="flex flex-wrap items-center gap-3" data-testid="hero-cta-row">
                {ctas.map((c, i) => {
                  const primary = i === 0;
                  return (
                    <a
                      key={i}
                      href={tt(c.url) || '#'}
                      target={c.target}
                      rel="noopener noreferrer"
                      onClick={() => onCtaClick(i)}
                      className={`inline-flex items-center gap-2 px-7 py-3 rounded-full text-sm font-semibold transition-all hover:gap-3 ${primary ? 'bg-white text-gray-900 border border-gray-900 hover:bg-gray-900 hover:text-white' : 'bg-transparent text-gray-900 border-2 border-gray-900/80 hover:bg-gray-900 hover:text-white'}`}
                      data-testid={`hero-cta-btn-${i}`}
                    >
                      {tt(c.text)} {primary && <ArrowRight className="w-4 h-4" />}
                    </a>
                  );
                })}
              </div>
            </Reveal>
          )}
        </div>
      </div>
      {allSlides.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {allSlides.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)} className={`h-[2px] transition-all ${i === idx ? 'w-10 bg-gray-900' : 'w-6 bg-gray-900/30 hover:bg-gray-900/60'}`} aria-label={`Slide ${i + 1}`} data-testid={`hero-dot-${i}`} />
          ))}
        </div>
      )}
    </section>
  );
}

// CSS keyframe + reveal styles (injected once)
if (typeof document !== 'undefined' && !document.getElementById('aurex-keyframes')) {
  const style = document.createElement('style');
  style.id = 'aurex-keyframes';
  style.textContent = `
    @keyframes aurex-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
    .aurex-reveal { opacity: 0; transform: translateY(24px); transition: opacity .7s ease-out, transform .7s ease-out; will-change: opacity, transform; }
    .aurex-reveal.aurex-in { opacity: 1; transform: translateY(0); }
    @media (prefers-reduced-motion: reduce) {
      .aurex-reveal { opacity: 1 !important; transform: none !important; transition: none !important; }
    }
    /* Let each Aurex section control its own typography (override global h1-h4 Playfair rule) */
    .aurex-section h1, .aurex-section h2, .aurex-section h3, .aurex-section h4 { font-family: inherit; }
  `;
  document.head.appendChild(style);
}
