/* Gem2i (`gem2i_02`) — the three generic CMS pages inherited from the AUX fork, in the Gem2i look
 * (template = package, D-GEM-2026-15; same shapes as the other Gem2i inner pages):
 *   /reading-list        CMS → Reading List (books): grid of covers + detail viewer
 *   /service/:serviceId  CMS → Services (the CMS services list, not the Section Manager "Services page")
 *   /album/:albumId      CMS → Gallery Albums: big viewer + thumbnail strip
 * Content is whatever the CMS holds (on beta still the fork's demo rows). */
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { publicAPI } from '../../../lib/api';
import { useT } from '../../../lib/i18n';
import { normalizeRichText } from '../../../lib/richText';
import { gemImg, SkeletonGrid, EmptyState } from '../../../components/gem2i/GemCatalogBits';
import { ListShell, DetailShell, NotFoundShell, SERIF } from '../../../components/gem2i/g02/G02DetailBits';
import { ACCENT, BODY, CARD, LINE } from '../../../components/gem2i/g02/GemCatalogCards';

const LINK = 'var(--color-link, #5AAFEA)';
const btn = 'inline-flex items-center gap-2 rounded-[4px] px-5 py-3 text-[15px] font-bold text-white transition-opacity hover:opacity-90';

// ── /reading-list ────────────────────────────────────────────────────────────
export function Gem2iReadingList() {
  const tt = useT();
  const [books, setBooks] = useState(null);
  const [open, setOpen] = useState(null);
  useEffect(() => { publicAPI.getBooks().then(r => setBooks(Array.isArray(r.data) ? r.data : [])).catch(() => setBooks([])); }, []);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  const list = (books || []).slice().sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  return (
    <ListShell page="reading-list" testid="gem2i-reading-list" eyebrow={tt({ en: 'Reading list', es: 'Lecturas' })} title={tt({ en: 'Books we recommend', es: 'Libros que recomendamos' })}>
      {!books ? <SkeletonGrid count={8} aspect="aspect-[2/3]" /> : !list.length ? <EmptyState>{tt({ en: 'No books yet.', es: 'Aún no hay libros.' })}</EmptyState> : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5" data-testid="books-grid">
          {list.map(b => (
            <button key={b.id} type="button" onClick={() => setOpen(b)} className="group text-left">
              <span className="block aspect-[2/3] rounded-[4px] overflow-hidden" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }}>
                {b.image ? <img src={gemImg(b.image)} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                  : <span className="w-full h-full flex items-center justify-center p-5 text-center text-white text-[20px] font-bold" style={{ fontFamily: SERIF }}>{tt(b.title)}</span>}
              </span>
              {b.featured && <small className="mt-3 block text-[11px] font-extrabold tracking-[0.14em] uppercase" style={{ color: LINK }}>{tt({ en: 'Featured', es: 'Destacado' })}</small>}
              <span className={`${b.featured ? 'mt-1' : 'mt-3'} block text-white text-[16.5px] font-bold leading-snug`}>{tt(b.title)}</span>
              {b.author && <small className="text-[13.5px]" style={{ color: BODY }}>{b.author}</small>}
            </button>
          ))}
        </div>
      )}
      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(4,8,12,.9)' }} role="dialog" aria-modal="true" onClick={() => setOpen(null)}>
          <div className="relative w-full max-w-3xl max-h-[88vh] overflow-y-auto rounded-[4px] grid sm:grid-cols-[220px_1fr] gap-6 p-6" style={{ backgroundColor: CARD, border: `1px solid ${LINE}` }} onClick={e => e.stopPropagation()}>
            <button type="button" onClick={() => setOpen(null)} aria-label={tt({ en: 'Close', es: 'Cerrar' })} className="absolute right-3 top-3 w-10 h-10 rounded-full inline-flex items-center justify-center text-white hover:bg-white/10"><X className="w-5 h-5" /></button>
            {open.image && <img src={gemImg(open.image)} alt="" className="w-full rounded-[4px]" />}
            <div>
              <h2 className="text-white font-bold leading-tight pr-8" style={{ fontFamily: SERIF, fontSize: 28 }}>{tt(open.title)}</h2>
              {open.author && <p className="mt-1" style={{ color: BODY }}>{open.author}</p>}
              {[[null, open.synopsis || open.description], [tt({ en: 'Who it is for', es: 'Para quién es' }), open.who_is_it_for], [tt({ en: 'About the author', es: 'Sobre el autor' }), open.about_author]]
                .filter(([, v]) => tt(v)).map(([h, v], i) => (
                  <div key={i} className="mt-4">
                    {h && <b className="block text-white text-[14px] mb-1">{h}</b>}
                    <div className="text-[15.5px] leading-[1.75] [&_p]:mb-2" style={{ color: BODY }} dangerouslySetInnerHTML={{ __html: normalizeRichText(tt(v)) }} />
                  </div>
                ))}
              {open.amazon_link && <a href={open.amazon_link} target="_blank" rel="noreferrer" className={`${btn} mt-5`} style={{ backgroundColor: ACCENT }}>{tt({ en: 'Get the book', es: 'Conseguir el libro' })} ↗</a>}
            </div>
          </div>
        </div>
      )}
    </ListShell>
  );
}

// ── /service/:serviceId ──────────────────────────────────────────────────────
export function Gem2iServiceDetail() {
  const { serviceId } = useParams();
  const tt = useT();
  const [svc, setSvc] = useState(undefined);
  useEffect(() => {
    let alive = true;
    setSvc(undefined);
    publicAPI.getServiceDetail(serviceId).then(r => { if (alive) setSvc(r.data || null); }).catch(() => { if (alive) setSvc(null); });
    return () => { alive = false; };
  }, [serviceId]);
  if (svc === null) {
    return <NotFoundShell backTo="/services" backLabel={tt({ en: 'Back to Services', es: 'Volver a Servicios' })}>{tt({ en: 'Service not found.', es: 'Servicio no encontrado.' })}</NotFoundShell>;
  }
  if (!svc) return <DetailShell><div className="py-24"><SkeletonGrid count={2} /></div></DetailShell>;
  const img = gemImg(svc.image);
  const price = Number(svc.price) > 0 ? `${Number(svc.price).toFixed(2)} ${String(svc.currency || 'usd').toUpperCase()}` : '';
  return (
    <DetailShell testid="gem2i-service-detail">
      <div className="py-12 md:py-16 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-start">
        <div>
          <Link to="/services" className="inline-flex items-center gap-1.5 text-sm" style={{ color: LINK }}><ArrowLeft className="w-4 h-4" /> {tt({ en: 'Services', es: 'Servicios' })}</Link>
          <h1 className="mt-5 text-white font-bold leading-[1.06] pb-1" style={{ fontFamily: SERIF, fontSize: 'clamp(2.4rem, 4.8vw, 3.8rem)' }}>{tt(svc.title)}</h1>
          {price && <p className="mt-3 text-white text-[22px] font-bold" style={{ fontFamily: SERIF }}>{tt({ en: 'From', es: 'Desde' })} {price}</p>}
          <div className="mt-6 max-w-[62ch] text-[17px] leading-[1.85] [&_p]:mb-4" style={{ color: BODY }}
            dangerouslySetInnerHTML={{ __html: normalizeRichText(tt(svc.full_content) || tt(svc.description) || '') }} />
          <Link to="/#contact" className={`${btn} mt-6`} style={{ backgroundColor: ACCENT }}>{tt({ en: 'Talk to us about it', es: 'Hablemos de ello' })} <ArrowRight className="w-4 h-4" aria-hidden="true" /></Link>
        </div>
        {img && <img src={img} alt="" className="w-full aspect-[4/3] object-cover rounded-[4px]" />}
      </div>
    </DetailShell>
  );
}

// ── /album/:albumId ──────────────────────────────────────────────────────────
export function Gem2iAlbum() {
  const { albumId } = useParams();
  const tt = useT();
  const [album, setAlbum] = useState(undefined);
  const [photos, setPhotos] = useState([]);
  const [i, setI] = useState(0);
  useEffect(() => {
    let alive = true;
    setAlbum(undefined); setI(0);
    publicAPI.getAlbumPhotos(albumId).then(r => { if (!alive) return; setAlbum(r.data?.album || r.data || null); setPhotos(r.data?.photos || []); })
      .catch(() => { if (alive) setAlbum(null); });
    return () => { alive = false; };
  }, [albumId]);
  const n = photos.length;
  const move = (d) => setI(x => (x + d + n) % n);
  useEffect(() => {
    if (n < 2) return undefined;
    const onKey = (e) => { if (e.key === 'ArrowRight') move(1); if (e.key === 'ArrowLeft') move(-1); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [n]); // eslint-disable-line react-hooks/exhaustive-deps
  if (album === null) {
    return <NotFoundShell backTo="/gallery" backLabel={tt({ en: 'Back to Gallery', es: 'Volver a la galería' })}>{tt({ en: 'Album not found.', es: 'Álbum no encontrado.' })}</NotFoundShell>;
  }
  if (album === undefined) return <DetailShell><div className="py-24"><SkeletonGrid count={3} /></div></DetailShell>;
  const cur = photos[i];
  return (
    <DetailShell testid="gem2i-album">
      <div className="py-12 md:py-16">
        <Link to="/gallery" className="inline-flex items-center gap-1.5 text-sm" style={{ color: LINK }}><ArrowLeft className="w-4 h-4" /> {tt({ en: 'Gallery', es: 'Galería' })}</Link>
        <h1 className="mt-5 mb-8 text-white font-bold leading-[1.06] pb-1" style={{ fontFamily: SERIF, fontSize: 'clamp(2.2rem, 4.4vw, 3.4rem)' }}>{tt(album.title) || tt({ en: 'Album', es: 'Álbum' })}</h1>
        {!n ? <EmptyState>{tt({ en: 'This album has no photos yet.', es: 'Este álbum aún no tiene fotos.' })}</EmptyState> : <>
          <div className="relative rounded-[4px] overflow-hidden bg-black aspect-[16/9]" data-testid="album-viewer">
            <img src={gemImg(cur.image || cur.url)} alt={cur.caption || ''} className="w-full h-full object-contain" />
            {n > 1 && <>
              <button type="button" onClick={() => move(-1)} aria-label={tt({ en: 'Previous', es: 'Anterior' })} className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-[4px] inline-flex items-center justify-center text-white" style={{ backgroundColor: 'rgba(4,8,12,.7)' }}><ChevronLeft className="w-5 h-5" /></button>
              <button type="button" onClick={() => move(1)} aria-label={tt({ en: 'Next', es: 'Siguiente' })} className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-[4px] inline-flex items-center justify-center text-white" style={{ backgroundColor: 'rgba(4,8,12,.7)' }}><ChevronRight className="w-5 h-5" /></button>
            </>}
            {cur.caption && <span className="absolute inset-x-0 bottom-0 px-5 py-3 text-white text-[14px]" style={{ background: 'linear-gradient(transparent, rgba(4,8,12,.9))' }}>{cur.caption}</span>}
          </div>
          {n > 1 && (
            <div className="mt-3 flex gap-2.5 overflow-x-auto pb-2" data-testid="album-thumbs">
              {photos.map((p, k) => (
                <button key={p.id || k} type="button" onClick={() => setI(k)} aria-label={`${k + 1}`} aria-current={k === i}
                  className="shrink-0 w-28 h-20 rounded-[4px] overflow-hidden transition-opacity" style={{ outline: k === i ? '2px solid var(--color-link, #5AAFEA)' : 'none', opacity: k === i ? 1 : 0.55 }}>
                  <img src={gemImg(p.image || p.url)} alt="" loading="lazy" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </>}
      </div>
    </DetailShell>
  );
}
