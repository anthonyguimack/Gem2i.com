import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, CalendarDays } from 'lucide-react';
import { gemAPI } from '../../lib/api';
import { useT } from '../../lib/i18n';
import { normalizeRichText } from '../../lib/richText';
import { gemImg, CardImage, SocialLinks, SkeletonGrid, ArtistCard } from '../../components/gem2i/GemCatalogBits';
import { NotFoundShell } from './Gem2iArtistDetail';

const GEM_FONT = "'Poppins', sans-serif";

/** Shared detail page for festivals AND conferences (same document shape).
 *  `kind` prop switches the API call + back link. */
export default function Gem2iFestivalDetail({ kind = 'festival' }) {
  const { slug } = useParams();
  const tt = useT();
  const [doc, setDoc] = useState(null);
  const [missing, setMissing] = useState(false);
  const isConf = kind === 'conference';

  useEffect(() => {
    let alive = true;
    setDoc(null); setMissing(false);
    const call = isConf ? gemAPI.conferenceDetail(slug) : gemAPI.festivalDetail(slug);
    call.then(r => { if (alive) setDoc(r.data); }).catch(() => { if (alive) setMissing(true); });
    return () => { alive = false; };
  }, [slug, isConf]);

  const backTo = isConf ? '/festivals' : '/festivals';
  const backLabel = tt({ en: 'Festivals', es: 'Festivales' });

  if (missing) {
    return (
      <NotFoundShell backTo={backTo} backLabel={backLabel}>
        {isConf
          ? tt({ en: 'Conference not found.', es: 'Conferencia no encontrada.' })
          : tt({ en: 'Festival not found.', es: 'Festival no encontrado.' })}
      </NotFoundShell>
    );
  }
  if (!doc) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-page-bg, #04080C)' }}>
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-24"><SkeletonGrid count={4} /></div>
      </div>
    );
  }

  const location = [doc.address, doc.city, doc.state, doc.country].filter(Boolean).join(', ');

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-page-bg, #04080C)', fontFamily: GEM_FONT }} data-testid={`gem2i-${kind}-detail`}>
      <div className="max-w-7xl mx-auto px-6 md:px-10 pt-10 pb-24">
        <Link to={backTo} className="inline-flex items-center gap-1.5 text-sm transition-colors hover:text-white"
          style={{ color: 'var(--color-link, #5FB2E0)' }}>
          <ArrowLeft className="w-4 h-4" /> {backLabel}
        </Link>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-[minmax(0,460px)_1fr] gap-10 lg:gap-14">
          <div className="group">
            <CardImage src={gemImg(doc.image_urls?.flyer) || gemImg(doc.image_urls?.logo)} alt={doc.title} aspect="aspect-square" />
          </div>

          <div>
            <h1 className="text-white font-bold leading-tight" style={{ fontSize: 'clamp(1.9rem, 4vw, 3rem)' }}>{doc.title}</h1>
            {(doc.range_dates || doc.event_date) && (
              <p className="mt-3 inline-flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-body-text, #9AA6B2)' }}>
                <CalendarDays className="w-4 h-4 shrink-0" /> {doc.range_dates || doc.event_date}
              </p>
            )}
            {location && (
              <p className="mt-2 flex items-start gap-1.5 text-sm" style={{ color: 'var(--color-body-text, #9AA6B2)' }}>
                <MapPin className="w-4 h-4 mt-0.5 shrink-0" /> {location}
              </p>
            )}

            {doc.description && (
              <div className="mt-8 max-w-none text-[15px] leading-[1.9]"
                style={{ color: 'var(--color-body-text, #9AA6B2)' }}
                dangerouslySetInnerHTML={{ __html: normalizeRichText(doc.description) }} />
            )}

            <div className="mt-10"><SocialLinks socials={doc.socials} /></div>
          </div>
        </div>

        {Array.isArray(doc.lineup_artists) && doc.lineup_artists.length > 0 && (
          <section className="mt-20" data-testid="festival-lineup">
            <h2 className="text-white font-bold mb-8" style={{ fontSize: 'clamp(1.4rem, 2.6vw, 2rem)' }}>
              {tt({ en: 'Line-up', es: 'Line-up' })}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {doc.lineup_artists.map(a => <ArtistCard key={a.id} artist={a} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
