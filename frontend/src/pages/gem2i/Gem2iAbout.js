import React, { useEffect, useState } from 'react';
import { ArrowRight, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { aboutSectionOrder } from '../../lib/gemAboutSections';
import { publicAPI } from '../../lib/api';
import { useT } from '../../lib/i18n';
import { normalizeRichText } from '../../lib/richText';
import { gemImg } from '../../components/gem2i/GemCatalogBits';
import { GemMethodCycle, GemTeamPortraits } from '../../components/gem2i/GemSections';
import AccentTitle from '../../components/gem2i/AccentTitle';
import { officeSlug } from '../../components/gem2i/g02/G02DetailBits';
import { zoneOf, localTime } from './g02/G02Helpers';
import { PageHero, ACCENT, LINK, BODY, CARD, LINE } from '../../components/gem2i/GemCatalogCards';

const GEM_FONT = "'Manrope', sans-serif";
const SERIF = "'Playfair Display', Georgia, serif";
const BTN = 'inline-flex items-center gap-2 rounded-full px-6 py-3 text-[15px] font-semibold text-white transition-opacity hover:opacity-90';

/** About (/about) — AB-A = GA2 (2026-10-26, boceto gem2i-about.html; without CMS hero the title grows). Content: CMS → About (eyebrow, title, story text,
 *  photo, stats), Section Manager → GEM Methodology + Team, Maps & Locations →
 *  global_business (offices). Hero: Hero slide → Page Assignment "About Us". */
export default function Gem2iAbout() {
  const tt = useT();
  const [about, setAbout] = useState(null);
  const [method, setMethod] = useState(null);
  const [team, setTeam] = useState(null);
  const [offices, setOffices] = useState([]);
  const [now, setNow] = useState(() => new Date());
  const [hasHero, setHasHero] = useState(null); // null until PageHero knows

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
  const story = normalizeRichText(tt(a.description) || '');
  const order = aboutSectionOrder(a.page_sections);
  const showOffices = order.some(x => x.key === 'offices' && x.visible);
  const toContact = () => window.dispatchEvent(new CustomEvent('gem2i:open-contact'));

  // Blocks below the story, ordered/hidden from CMS → About → Page sections.
  const blocks = {
    methodology: () => (method?.items?.length > 0 ? <GemMethodCycle config={method.config || {}} items={method.items} /> : null),
    team: () => (team?.items?.length > 0 ? <GemTeamPortraits config={team.config || {}} items={team.items} /> : null),
    offices: () => (offices.length > 0 && (
        <section style={{ backgroundColor: 'var(--color-section-bg-alt, #0A121A)' }}>
          <div className="max-w-7xl mx-auto px-6 md:px-10 py-20 grid lg:grid-cols-[1fr_1.4fr] gap-12">
            <div>
              <p className="gem-eyebrow mb-4" style={{ color: LINK }}>{tt(a.offices_eyebrow) || tt({ en: 'Where we are', es: 'Dónde estamos' })}</p>
              <h2 className="text-white font-bold leading-[1.08]" style={{ fontFamily: SERIF, fontSize: 'clamp(1.9rem, 3.2vw, 2.6rem)' }}>
                <AccentTitle text={tt(a.offices_title) || tt({ en: `${offices.length} offices, one team`, es: `${offices.length} oficinas, un equipo` })} />
              </h2>
            </div>
            <ul className="grid sm:grid-cols-2 gap-3" data-testid="about-offices">
              {offices.map(o => (
                <li key={o.id} className="rounded-2xl p-5" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
                  <span className="block text-white font-semibold">{o.name || tt(o.title)}</span>
                  {String(o.description || '').trim() && <span className="block text-[14px] mt-0.5" style={{ color: BODY }}>{String(o.description).trim()}</span>}
                </li>
              ))}
            </ul>
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
      <PageHero page="about" onShown={setHasHero} />

      {/* GA2 (boceto gem2i-inner-pages-1.html): photo + key figures pinned on the left while the story reads
          like a signed letter; the offices (when shown) close the letter as cards → /map/:slug. */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 pt-16 md:pt-24 pb-20 grid lg:grid-cols-[0.85fr_1.15fr] gap-12 lg:gap-16 items-start">
        <div className="lg:sticky lg:top-28">
          {a.image && <img src={gemImg(a.image)} alt="" loading="lazy" className="w-full aspect-[3/4] object-cover rounded-[4px]" />}
          {stats.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-px rounded-[4px] overflow-hidden" style={{ backgroundColor: LINE }} data-testid="about-stats">
              {stats.map((s, i) => (
                <div key={i} className="p-5" style={{ backgroundColor: CARD }}>
                  <p className="text-white font-bold tabular-nums leading-none" style={{ fontFamily: SERIF, fontSize: 'clamp(1.7rem, 2.6vw, 2.1rem)' }}>{s.value}</p>
                  <p className="mt-2 text-[13.5px] leading-snug" style={{ color: BODY }}>{tt(s.label)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <p className="gem-eyebrow mb-4" style={{ color: LINK }}>{tt(a.label) || tt({ en: 'About us', es: 'Nosotros' })}</p>
          <h1 className="text-white font-bold leading-[1.1] pb-1" style={{ fontFamily: SERIF, fontSize: hasHero === false ? 'clamp(2.6rem, 5.2vw, 4.2rem)' : 'clamp(2.2rem, 4.2vw, 3.4rem)' }} data-testid="about-title">
            <AccentTitle text={tt(a.title) || tt({ en: 'Three decades behind the night', es: 'Tres décadas detrás de la noche' })} />
          </h1>
          <div className="mt-8 max-w-[62ch] text-[17px] md:text-[18px] leading-[1.85] [&_p]:mb-5" style={{ color: BODY }} dangerouslySetInnerHTML={{ __html: story }} />
          {(tt(a.signature_name) || tt(a.signature_title)) && (
            <div className="mt-6" data-testid="about-signature">
              {tt(a.signature_name) && <p className="text-white text-[30px] italic leading-tight" style={{ fontFamily: SERIF }}>{tt(a.signature_name)}</p>}
              {tt(a.signature_title) && <p className="text-[14px] mt-1" style={{ color: BODY }}>{tt(a.signature_title)}</p>}
            </div>
          )}
          {(tt(a.button_text) || a.phone) && (
            <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
              {tt(a.button_text) && a.button_url && (/^https?:/i.test(a.button_url) || a.button_open_in_new_tab
                ? <a href={a.button_url} target={a.button_open_in_new_tab ? '_blank' : undefined} rel="noopener noreferrer" className={BTN} style={{ backgroundColor: ACCENT }}>{tt(a.button_text)} <ArrowRight className="w-4 h-4" aria-hidden="true" /></a>
                : <Link to={a.button_url} className={BTN} style={{ backgroundColor: ACCENT }}>{tt(a.button_text)} <ArrowRight className="w-4 h-4" aria-hidden="true" /></Link>)}
              {a.phone && <a href={`tel:${a.phone.replace(/[^+\d]/g, '')}`} className="inline-flex items-center gap-2 text-white text-[15px] hover:underline"><Phone className="w-4 h-4" style={{ color: LINK }} aria-hidden="true" />{a.phone}</a>}
            </div>
          )}
          {showOffices && offices.length > 0 && (
            <div className="mt-16">
              <h2 className="text-white font-bold leading-[1.1] mb-5" style={{ fontFamily: SERIF, fontSize: 'clamp(1.6rem, 2.6vw, 2rem)' }}>
                <AccentTitle text={tt(a.offices_title) || tt({ en: `${offices.length} offices, one team`, es: `${offices.length} oficinas, un equipo` })} />
              </h2>
              <ul className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3" data-testid="about-offices">
                {offices.map(o => {
                  const name = o.name || tt(o.title);
                  const region = String(o.description || '').trim();
                  const time = localTime(zoneOf(`${name} ${region}`), now);
                  return (
                    <li key={o.id}>
                      <Link to={`/map/${officeSlug(o)}`} className="group block h-full rounded-[4px] p-5 transition-colors hover:border-[#5AAFEA]" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
                        {region && <span className="block text-[11px] font-extrabold tracking-[0.14em] uppercase" style={{ color: /headquarters|sede/i.test(region) ? LINK : BODY }}>{region.split(' · ')[0]}</span>}
                        <span className="block mt-1 text-white font-semibold text-[17px]">{name}</span>
                        {time && <span className="block mt-1 text-[13.5px] tabular-nums" style={{ color: BODY }}>{tt({ en: 'Local time', es: 'Hora local' })} {time}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </section>

      {about && order.filter(x => x.visible && x.key !== 'offices').map(x => (
        <React.Fragment key={x.key}>{blocks[x.key] ? blocks[x.key]() : null}</React.Fragment>
      ))}
    </div>
  );
}
