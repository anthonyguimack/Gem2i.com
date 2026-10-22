import React, { useEffect, useState } from 'react';
import { ArrowRight, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { aboutSectionOrder } from '../../lib/gemAboutSections';
import { publicAPI } from '../../lib/api';
import { useT } from '../../lib/i18n';
import { normalizeRichText } from '../../lib/richText';
import { gemImg } from '../../components/gem2i/GemCatalogBits';
import { GemMethodCycle } from '../../components/gem2i/GemSections';
import AccentTitle from '../../components/gem2i/AccentTitle';
import { PageHero, ACCENT, LINK, BODY, CARD, LINE } from '../../components/gem2i/GemCatalogCards';

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

/** About (/about) — Norules template, layout A · Editorial. Content: CMS → About (eyebrow, title, story text,
 *  photo, stats), Section Manager → GEM Methodology + Team, Maps & Locations →
 *  global_business (offices). Hero: Hero slide → Page Assignment "About Us". */
export default function NorulesAbout() {
  const tt = useT();
  const [about, setAbout] = useState(null);
  const [method, setMethod] = useState(null);
  const [team, setTeam] = useState(null);
  const [offices, setOffices] = useState([]);

  useEffect(() => {
    publicAPI.getAbout().then(r => setAbout(r.data || {})).catch(() => setAbout({}));
    publicAPI.getSectionContent('gem_methodology').then(r => setMethod(r.data)).catch(() => {});
    publicAPI.getSectionContent('aurex_team').then(r => setTeam(r.data)).catch(() => {});
    publicAPI.getMapLocations('global_business').then(r => setOffices(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  const a = about || {};
  const stats = (a.stats || []).filter(s => tt(s.label) || s.value);
  const story = normalizeRichText(tt(a.description) || '');
  const toContact = () => window.dispatchEvent(new CustomEvent('gem2i:open-contact'));

  // Blocks below the story, ordered/hidden from CMS → About → Page sections.
  const blocks = {
    methodology: () => (method?.items?.length > 0 ? <GemMethodCycle config={method.config || {}} items={method.items} /> : null),
    team: () => (team?.items?.length > 0 ? <AboutTeam config={team.config || {}} items={team.items} /> : null),
    offices: () => (offices.length > 0 && (
        <section style={{ backgroundColor: 'var(--color-section-bg-alt, #0A121A)' }}>
          <div className="max-w-7xl mx-auto px-6 md:px-10 py-20 grid lg:grid-cols-[1fr_1.4fr] gap-12">
            <div>
              <p className="gem-eyebrow mb-4" style={{ color: LINK }}>{tt(a.offices_eyebrow) || tt({ en: 'Where we are', es: 'Dónde estamos' })}</p>
              <h2 className="text-white font-bold leading-[1.08]" style={{ fontFamily: SERIF, fontSize: 'clamp(1.9rem, 3.2vw, 2.6rem)' }}>
                <AccentTitle text={tt(a.offices_title) || tt({ en: `${offices.length} offices, one team`, es: `${offices.length} oficinas, un equipo` })} />
              </h2>
            </div>
            <ol className="border-t" style={{ borderColor: LINE }} data-testid="about-offices">
              {offices.map((o, i) => (
                <li key={o.id} className="grid grid-cols-[3rem_1fr] sm:grid-cols-[3rem_1fr_auto] gap-x-3 gap-y-1 items-baseline py-5 border-b transition-transform duration-300 hover:translate-x-2 motion-reduce:transition-none" style={{ borderColor: LINE }}>
                  <span className="font-mono text-[13px] font-semibold" style={{ color: LINK }}>{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-white text-lg font-semibold">{o.name || tt(o.title)}</span>
                  {String(o.description || '').trim() && <span className="col-start-2 sm:col-start-3 text-[14px] sm:text-right" style={{ color: BODY }}>{String(o.description).trim()}</span>}
                </li>
              ))}
            </ol>
          </div>
        </section>
    )),
    contact: () => (
      <section style={{ background: 'linear-gradient(90deg, #002444 0%, #0068b3 100%)' }}>
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-14 flex flex-wrap items-center justify-between gap-6">
          <h2 className="text-white font-bold leading-[1.1] [&_.gem-accent]:!text-[#cfe9f8]" style={{ fontFamily: SERIF, fontSize: 'clamp(1.7rem, 3vw, 2.4rem)' }}>
            <AccentTitle text={tt(a.cta_title) || tt({ en: 'Planning an event, a tour or a launch', es: 'Planeas un evento, una gira o un lanzamiento' })} />
          </h2>
          <button type="button" onClick={toContact} className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-[15px] font-semibold transition-opacity hover:opacity-90" style={{ color: '#002444' }}>
            {tt(a.cta_button) || tt({ en: 'Contact us', es: 'Contáctanos' })} <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </section>
    ),
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-page-bg, #04080C)', fontFamily: GEM_FONT }} data-testid="gem2i-about">
      <PageHero page="about" />

      <section className="max-w-7xl mx-auto px-6 md:px-10 pt-16 md:pt-24 pb-16 md:pb-20 grid lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-16 items-center">
        <div>
          <p className="gem-eyebrow mb-4" style={{ color: LINK }}>{tt(a.label) || tt({ en: 'About us', es: 'Nosotros' })}</p>
          <h1 className="text-white font-bold leading-[1.06]" style={{ fontFamily: SERIF, fontSize: 'clamp(2.2rem, 4.2vw, 3.4rem)' }}>
            <AccentTitle text={tt(a.title) || tt({ en: 'Three decades behind the night', es: 'Tres décadas detrás de la noche' })} />
          </h1>
          <div className="mt-7 text-base md:text-[17px] leading-[1.8] [&_p]:mb-5" style={{ color: BODY }} dangerouslySetInnerHTML={{ __html: story }} />
          {/* Signature, member CTA and phone share one row under a hairline. */}
          {(tt(a.signature_name) || tt(a.signature_title) || tt(a.button_text) || a.phone) && (
            <div className="mt-8 pt-7 border-t flex flex-wrap items-center gap-x-8 gap-y-5" style={{ borderColor: LINE }}>
              {(tt(a.signature_name) || tt(a.signature_title)) && (
                <div data-testid="about-signature">
                  {tt(a.signature_name) && <p className="text-white text-[26px] italic font-bold leading-tight" style={{ fontFamily: SERIF }}>{tt(a.signature_name)}</p>}
                  {tt(a.signature_title) && <p className="text-[13px] mt-0.5" style={{ color: BODY }}>{tt(a.signature_title)}</p>}
                </div>
              )}
              {tt(a.button_text) && a.button_url && (/^https?:/i.test(a.button_url) || a.button_open_in_new_tab
                ? <a href={a.button_url} target={a.button_open_in_new_tab ? '_blank' : undefined} rel="noopener noreferrer" className={BTN} style={{ backgroundColor: ACCENT }}>{tt(a.button_text)} <ArrowRight className="w-4 h-4" aria-hidden="true" /></a>
                : <Link to={a.button_url} className={BTN} style={{ backgroundColor: ACCENT }}>{tt(a.button_text)} <ArrowRight className="w-4 h-4" aria-hidden="true" /></Link>)}
              {a.phone && <a href={`tel:${a.phone.replace(/[^+\d]/g, '')}`} className="inline-flex items-center gap-2 text-white text-[15px] hover:underline"><Phone className="w-4 h-4" style={{ color: LINK }} aria-hidden="true" />{a.phone}</a>}
            </div>
          )}
        </div>
        {a.image && (
          <div className="relative aspect-[4/5] rounded-3xl overflow-hidden" style={{ backgroundColor: CARD }}>
            <img src={gemImg(a.image)} alt="" loading="lazy" className="w-full h-full object-cover" />
            {stats[0] && (
              <div className="absolute left-5 bottom-5 rounded-2xl px-5 py-3.5 backdrop-blur-md" style={{ backgroundColor: 'rgba(4,8,12,.7)' }}>
                <p className="text-white text-3xl font-extrabold leading-none tabular-nums">{stats[0].value}</p>
                <p className="mt-1 text-[13px]" style={{ color: BODY }}>{tt(stats[0].label)}</p>
              </div>
            )}
          </div>
        )}
      </section>

      {stats.length > 0 && (
        <section className="border-y" style={{ borderColor: LINE }}>
          <div className="max-w-7xl mx-auto px-6 md:px-10 grid grid-cols-2 lg:grid-cols-4">
            {stats.map((s, i) => (
              <div key={i} className={`py-9 px-5 md:px-7 ${i % 2 ? 'border-l' : ''} ${i > 1 ? 'border-t lg:border-t-0' : ''} ${i === 2 ? 'lg:border-l' : ''}`} style={{ borderColor: LINE }}>
                <p className="text-white font-extrabold tabular-nums leading-none tracking-[-0.03em]" style={{ fontSize: 'clamp(2.2rem, 4vw, 3.4rem)' }}>{s.value}</p>
                <p className="mt-2 text-[15px]" style={{ color: BODY }}>{tt(s.label)}</p>
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
