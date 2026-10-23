/* Norules (`gem2i`) — own copy of this inner page (template = package, D-GEM-2026-15). */
import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { aboutSectionOrder } from '../../../lib/gemAboutSections';
import { publicAPI } from '../../../lib/api';
import { useT } from '../../../lib/i18n';
import { normalizeRichText } from '../../../lib/richText';
import { gemImg } from '../../../components/gem2i/GemCatalogBits';
import { GemMethodCycle } from '../../../components/gem2i/GemSections';
import AccentTitle from '../../../components/gem2i/AccentTitle';
import { PageHero, ACCENT, LINK, BODY, CARD, LINE } from '../../../components/gem2i/norules/GemCatalogCards';

const GEM_FONT = "'Manrope', sans-serif";
const SERIF = "'Playfair Display', Georgia, serif";
const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
const BTN = 'inline-flex items-center gap-2 rounded-full px-6 py-3 text-[15px] font-semibold text-white transition-opacity hover:opacity-90';

/** A · Editorial team: cards, the first member leads with a tall photo. */
function AboutTeam({ config = {}, items = [] }) {
  const tt = useT();
  const list = items.slice(0, parseInt(config.max_visible, 10) || items.length);
  const [lead, ...rest] = list;
  const card = 'rounded-[18px] transition-transform duration-300 hover:-translate-y-[3px] motion-reduce:transition-none';
  return (
    <section className="max-w-7xl mx-auto px-6 md:px-10 py-20 md:py-24" data-testid="gem2i-team">
      <p className="gem-eyebrow mb-4" style={{ color: LINK }}>{tt(config.eyebrow) || tt({ en: 'Team', es: 'Equipo' })}</p>
      <h2 className="text-white font-bold leading-[1.1]" style={{ fontFamily: SERIF, fontSize: 'clamp(1.8rem, 3.2vw, 2.6rem)' }}>
        <AccentTitle text={tt(config.title) || tt({ en: 'The people behind GEM2i', es: 'Las personas detrás de GEM2i' })} />
      </h2>
      {tt(config.subtitle) && <p className="mt-4 max-w-2xl text-base md:text-[17px] leading-[1.8]" style={{ color: BODY }}>{tt(config.subtitle)}</p>}
      <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {lead && (
          <article className={`${card} overflow-hidden flex flex-col lg:row-span-2`} style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
            {lead.photo_url
              ? <img src={gemImg(lead.photo_url)} alt={tt(lead.name)} loading="lazy" className="w-full aspect-square object-cover" />
              : <span aria-hidden="true" className="w-full aspect-square flex items-center justify-center text-white/90 font-bold" style={{ background: 'linear-gradient(160deg, #002444 0%, #0068b3 100%)', fontFamily: SERIF, fontSize: '3.6rem' }}>{initials(tt(lead.name))}</span>}
            <div className="p-6">
              <h3 className="text-white text-lg font-semibold">{tt(lead.name)}</h3>
              <p className="text-[14px] mt-0.5" style={{ color: LINK }}>{tt(lead.role)}</p>
              {tt(lead.bio) && <p className="mt-3 text-[15px] leading-[1.7]" style={{ color: BODY }}>{tt(lead.bio)}</p>}
            </div>
          </article>
        )}
        {rest.map(m => (
          <article key={m.id} className={`${card} p-6`} style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
            <div className="flex items-center gap-3.5">
              <span className="w-14 h-14 shrink-0 rounded-full overflow-hidden inline-flex items-center justify-center font-bold" style={{ background: 'linear-gradient(135deg, #1d3a52, #0f1d2a)', color: LINK }}>
                {m.photo_url ? <img src={gemImg(m.photo_url)} alt="" loading="lazy" className="w-full h-full object-cover" /> : initials(tt(m.name))}
              </span>
              <div>
                <h3 className="text-white font-semibold">{tt(m.name)}</h3>
                <p className="text-[14px] mt-0.5" style={{ color: LINK }}>{tt(m.role)}</p>
              </div>
            </div>
            {tt(m.bio) && <p className="mt-4 text-[15px] leading-[1.7]" style={{ color: BODY }}>{tt(m.bio)}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}

// Rich text → paragraphs of plain text (the parser also decodes entities).
const paragraphs = (html) => (html
  ? [...new DOMParser().parseFromString(html, 'text/html').body.querySelectorAll('p')]
      .map(p => (p.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean)
  : []);

// Office → IANA zone for the live local time (CMS offices carry no zone; matched on the name).
const ZONES = [
  [/new york|usa|united states|miami/i, 'America/New_York'], [/spain|españa|madrid|ibiza|barcelona/i, 'Europe/Madrid'],
  [/lima|peru|perú/i, 'America/Lima'], [/buenos aires|argentina/i, 'America/Argentina/Buenos_Aires'],
  [/santo domingo|dominican/i, 'America/Santo_Domingo'], [/mexico|méxico/i, 'America/Mexico_City'],
  [/bogot|colombia/i, 'America/Bogota'], [/london|united kingdom|\buk\b/i, 'Europe/London'],
  [/paris|france/i, 'Europe/Paris'], [/berlin|germany/i, 'Europe/Berlin'], [/dubai|emirates/i, 'Asia/Dubai'],
];
const zoneOf = (name = '') => (ZONES.find(([re]) => re.test(name)) || [])[1];
const localTime = (zone, now) => {
  try { return now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: zone }); } catch { return ''; }
};

const reduceMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** AB1 · Manifesto: the first story paragraph in giant type; words light up as it scrolls through the
 *  viewport. The last three words carry the italic accent, like AccentTitle. */
function Manifesto({ text }) {
  const ref = useRef(null);
  const [lit, setLit] = useState(reduceMotion() ? 1 : 0);
  useEffect(() => {
    if (reduceMotion()) return undefined;
    const onScroll = () => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      setLit(Math.min(1, Math.max(0, (window.innerHeight * 0.85 - r.top) / (r.height + window.innerHeight * 0.35))));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const words = text.split(/\s+/);
  return (
    <p ref={ref} className="text-white font-bold tracking-[-0.03em] max-w-[24ch]" style={{ fontSize: 'clamp(1.9rem, 4.2vw, 3.7rem)', lineHeight: 1.18 }} data-testid="about-manifesto">
      {words.map((w, i) => {
        const accent = i >= words.length - 3;
        return (
          <React.Fragment key={i}>
            <span className={`transition-opacity duration-300 motion-reduce:transition-none ${accent ? 'italic' : ''}`}
              style={{ opacity: i / words.length < lit ? 1 : 0.18, ...(accent ? { fontFamily: SERIF, color: LINK } : {}) }}>{w}</span>{' '}
          </React.Fragment>
        );
      })}
    </p>
  );
}

/** Stat value that counts up once in view; keeps any prefix/suffix ("17+", "1,700+"). Years stay as typed. */
function CountUp({ value }) {
  const ref = useRef(null);
  const text = String(value ?? '');
  const m = text.match(/^(\D*)([\d,.]+)(.*)$/);
  const animate = !!m && !/^(19|20)\d\d$/.test(text.trim()) && !reduceMotion();
  const [shown, setShown] = useState(animate ? `${m[1]}0${m[3]}` : text);
  useEffect(() => {
    if (!animate || !ref.current) return undefined;
    const target = parseFloat(m[2].replace(/,/g, ''));
    let raf;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const step = (t) => {
        const k = Math.min(1, (t - t0) / 1400);
        setShown(k === 1 ? text : `${m[1]}${Math.round(target * (1 - Math.pow(1 - k, 3))).toLocaleString('en')}${m[3]}`);
        if (k < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, { threshold: 0.4 });
    io.observe(ref.current);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps
  return <span ref={ref}>{shown}</span>;
}

/** About (/about) — Norules template, layout AB1 · Manifesto (boceto bocetos/norules-about-page.html).
 *  Content: CMS → About (label, title, story text: 1st paragraph = manifesto, the rest = Our story;
 *  photo, signature, button, phone, stats, offices/CTA texts), Section Manager → GEM Methodology + Team,
 *  Maps & Locations → global_business (offices). Hero: Hero slide → Page Assignment "About Us". */
export default function NorulesAbout() {
  const tt = useT();
  const [about, setAbout] = useState(null);
  const [method, setMethod] = useState(null);
  const [team, setTeam] = useState(null);
  const [offices, setOffices] = useState([]);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    publicAPI.getAbout().then(r => setAbout(r.data || {})).catch(() => setAbout({}));
    publicAPI.getSectionContent('gem_methodology').then(r => setMethod(r.data)).catch(() => {});
    publicAPI.getSectionContent('aurex_team').then(r => setTeam(r.data)).catch(() => {});
    publicAPI.getMapLocations('global_business').then(r => setOffices(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const a = about || {};
  const stats = (a.stats || []).filter(s => tt(s.label) || s.value);
  const [manifesto, ...storyRest] = paragraphs(normalizeRichText(tt(a.description) || ''));
  const toContact = () => window.dispatchEvent(new CustomEvent('gem2i:open-contact'));
  const H2 = { fontFamily: SERIF, fontSize: 'clamp(1.9rem, 3.4vw, 2.9rem)' };

  // Blocks below the story, ordered/hidden from CMS → About → Page sections.
  const blocks = {
    methodology: () => (method?.items?.length > 0 ? <GemMethodCycle config={method.config || {}} items={method.items} /> : null),
    team: () => (team?.items?.length > 0 ? <AboutTeam config={team.config || {}} items={team.items} /> : null),
    offices: () => (offices.length > 0 && (
      <section className="max-w-7xl mx-auto px-6 md:px-10 py-20 md:py-24">
        <p className="gem-eyebrow mb-4" style={{ color: LINK }}>{tt(a.offices_eyebrow) || tt({ en: 'Where we are', es: 'Dónde estamos' })}</p>
        <h2 className="text-white font-bold leading-[1.08]" style={H2}>
          <AccentTitle text={tt(a.offices_title) || tt({ en: `${offices.length} offices, one team`, es: `${offices.length} oficinas, un equipo` })} />
        </h2>
        <ol className="mt-12 border-t" style={{ borderColor: LINE }} data-testid="about-offices">
          {offices.map(o => {
            const name = o.name || tt(o.title);
            const zone = zoneOf(name);
            const time = zone ? localTime(zone, now) : '';
            const desc = String(o.description || '').trim();
            return (
              <li key={o.id || name} className="grid grid-cols-[1fr_auto] md:grid-cols-[1.1fr_1fr_auto] gap-x-6 gap-y-1 items-center py-6 border-b transition-transform duration-300 ease-out hover:translate-x-3 motion-reduce:transition-none" style={{ borderColor: LINE }}>
                <span className="text-white font-bold leading-tight" style={{ fontFamily: SERIF, fontSize: 'clamp(1.35rem, 2.3vw, 1.9rem)' }}>{name}</span>
                <span className="col-start-1 md:col-start-2 row-start-2 md:row-start-1 text-[14px] md:text-[15px]" style={{ color: BODY }}>{desc}</span>
                <span className="col-start-2 md:col-start-3 row-start-1 row-span-2 md:row-span-1 text-right">
                  {time && <>
                    <span className="block text-white text-lg font-extrabold tabular-nums">{time}</span>
                    <span className="block text-[11px] font-bold tracking-[0.2em]" style={{ color: BODY }}>{tt({ en: 'LOCAL TIME', es: 'HORA LOCAL' })}</span>
                  </>}
                </span>
              </li>
            );
          })}
        </ol>
      </section>
    )),
    contact: () => (
      <section className="gem-tone-dark text-center" style={{ backgroundColor: '#0E1216' }}>
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-24 md:py-28">
          <p className="gem-eyebrow mb-5" style={{ color: '#9AA6B2' }}>{tt({ en: "Let's talk", es: 'Hablemos' })}</p>
          <h2 className="text-white font-bold leading-[1.05] max-w-[16ch] mx-auto" style={{ fontFamily: SERIF, fontSize: 'clamp(2.3rem, 5.2vw, 4.6rem)' }}>
            <AccentTitle text={tt(a.cta_title) || tt({ en: 'Planning an event, a tour or a launch', es: 'Planeas un evento, una gira o un lanzamiento' })} />
          </h2>
          <button type="button" onClick={toContact} className="mt-9 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-[15px] font-semibold transition-transform duration-150 ease-out active:scale-[0.97]" style={{ color: '#0E1216' }}>
            {tt(a.cta_button) || tt({ en: 'Contact us', es: 'Contáctanos' })} <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </section>
    ),
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-page-bg, #04080C)', fontFamily: GEM_FONT }} data-testid="gem2i-about">
      <PageHero page="about" />

      {/* Manifesto + signature row */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 pt-20 md:pt-28 pb-16 md:pb-24">
        <p className="gem-eyebrow mb-6" style={{ color: LINK }}>{tt(a.label) || tt({ en: 'About us', es: 'Nosotros' })}</p>
        {manifesto && <Manifesto key={manifesto} text={manifesto} />}
        {(tt(a.signature_name) || tt(a.signature_title) || tt(a.button_text) || a.phone) && (
          <div className="mt-12 pt-7 border-t flex flex-wrap items-center gap-x-8 gap-y-5" style={{ borderColor: LINE }}>
            {(tt(a.signature_name) || tt(a.signature_title)) && (
              <div data-testid="about-signature">
                {tt(a.signature_name) && <p className="text-white text-[26px] italic font-bold leading-tight" style={{ fontFamily: SERIF }}>{tt(a.signature_name)}</p>}
                {tt(a.signature_title) && <p className="text-[13px] mt-0.5" style={{ color: BODY }}>{tt(a.signature_title)}</p>}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4 md:ml-auto">
              {a.phone && <a href={`tel:${a.phone.replace(/[^+\d]/g, '')}`} className="inline-flex items-center gap-2 text-white text-[15px] hover:underline"><Phone className="w-4 h-4" style={{ color: LINK }} aria-hidden="true" />{a.phone}</a>}
              {tt(a.button_text) && a.button_url && (/^https?:/i.test(a.button_url) || a.button_open_in_new_tab
                ? <a href={a.button_url} target={a.button_open_in_new_tab ? '_blank' : undefined} rel="noopener noreferrer" className={BTN} style={{ backgroundColor: ACCENT }}>{tt(a.button_text)} <ArrowRight className="w-4 h-4" aria-hidden="true" /></a>
                : <Link to={a.button_url} className={BTN} style={{ backgroundColor: ACCENT }}>{tt(a.button_text)} <ArrowRight className="w-4 h-4" aria-hidden="true" /></Link>)}
            </div>
          </div>
        )}
      </section>

      {/* Our story: title + the rest of the story text, photo alongside */}
      {(storyRest.length > 0 || a.image) && (
        <section style={{ backgroundColor: 'var(--color-section-bg-alt, #0A121A)' }}>
          <div className={`max-w-7xl mx-auto px-6 md:px-10 py-20 md:py-24 grid gap-12 lg:gap-16 items-center ${a.image ? 'lg:grid-cols-[1.15fr_1fr]' : ''}`}>
            <div>
              <p className="gem-eyebrow mb-4" style={{ color: LINK }}>{tt({ en: 'Our story', es: 'Nuestra historia' })}</p>
              <h1 className="text-white font-bold leading-[1.06]" style={H2}>
                <AccentTitle text={tt(a.title) || tt({ en: 'Three decades behind the night', es: 'Tres décadas detrás de la noche' })} />
              </h1>
              {storyRest.map((p, i) => <p key={i} className="mt-6 max-w-[60ch] text-base md:text-[17px] leading-[1.8]" style={{ color: BODY }}>{p}</p>)}
            </div>
            {a.image && (
              <div className="aspect-[4/5] lg:aspect-square rounded-3xl overflow-hidden" style={{ backgroundColor: CARD }}>
                <img src={gemImg(a.image)} alt="" loading="lazy" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        </section>
      )}

      {/* Key figures, counting up */}
      {stats.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 border-b" style={{ borderColor: LINE }} data-testid="about-stats">
            {stats.map((s, i) => (
              <div key={i} className={`py-10 md:py-12 px-5 md:px-7 ${i % 2 ? 'border-l' : ''} ${i > 1 ? 'border-t lg:border-t-0' : ''} ${i === 2 ? 'lg:border-l' : ''}`} style={{ borderColor: LINE }}>
                <p className="text-white font-extrabold tabular-nums leading-none tracking-[-0.05em]" style={{ fontSize: 'clamp(2.6rem, 5vw, 4.4rem)' }}><CountUp value={s.value} /></p>
                <p className="mt-3 text-[15px]" style={{ color: BODY }}>{tt(s.label)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {about && aboutSectionOrder(a.page_sections).filter(x => x.visible).map(x => (
        <React.Fragment key={x.key}>{blocks[x.key] ? blocks[x.key]() : null}</React.Fragment>
      ))}
    </div>
  );
}
