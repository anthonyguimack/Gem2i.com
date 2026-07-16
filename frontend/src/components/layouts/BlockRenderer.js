import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { publicAPI } from '../../lib/api';
import { useSettings } from '../../App';
import { getTileUrl, getTileAttribution } from '../../lib/mapConfig';
import { ChevronLeft, ChevronRight, X, ExternalLink } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const API = process.env.REACT_APP_BACKEND_URL;
const resolveSrc = (v) => v ? (v.startsWith('/api') ? `${API}${v}` : v) : null;

const cleanHtml = (html) => html ? html.replace(/&nbsp;/g, ' ').replace(/\u00A0/g, ' ') : '';

function RichTextBlock({ config }) {
  if (!config.content) return null;
  return (
    <div className="rich-text-content prose max-w-none"
      style={{ color: 'var(--color-body-text, #475569)' }}
      dangerouslySetInnerHTML={{ __html: cleanHtml(config.content) }} />
  );
}

function ImageBlock({ config }) {
  const src = resolveSrc(config.src);
  if (!src) return null;
  const img = (
    <figure>
      <img src={src} alt={config.alt || ''} className="w-full rounded-lg" data-testid="block-image" />
      {config.caption && <figcaption className="text-sm text-slate-400 mt-2 text-center">{config.caption}</figcaption>}
    </figure>
  );
  if (config.link) return <a href={config.link} target="_blank" rel="noreferrer">{img}</a>;
  return img;
}

function VideoBlock({ config }) {
  if (!config.url) return null;
  let embedUrl = config.url;
  const ytMatch = config.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/);
  if (ytMatch) embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
  const vimeoMatch = config.url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return (
    <div className="aspect-video rounded-lg overflow-hidden" data-testid="block-video">
      <iframe src={embedUrl} className="w-full h-full" allow="autoplay; fullscreen" frameBorder="0" title="Video" />
    </div>
  );
}

function ServiceListBlock() {
  const [services, setServices] = useState([]);
  useEffect(() => { publicAPI.getServices().then(r => setServices(r.data || [])).catch(() => {}); }, []);
  if (!services.length) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="block-service-list">
      {services.map(s => (
        <div key={s.id} className="bg-white rounded-lg border border-slate-100 p-5 hover:shadow-md transition-shadow">
          <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--color-heading, #1a2332)' }}>{s.title}</h3>
          <div className="text-sm mb-3 rich-text-content" style={{ color: 'var(--color-body-text, #475569)' }} dangerouslySetInnerHTML={{ __html: cleanHtml(s.short_description || s.description || '') }} />
          {s.price > 0 && <p className="text-sm font-semibold mb-2" style={{ color: 'var(--color-accent, #0D9488)' }}>${Number(s.price).toFixed(2)}</p>}
          {s.external_url ? (
            <a href={s.external_url} target={s.open_in_new_tab ? '_blank' : '_self'} rel="noreferrer" className="text-sm font-medium hover:opacity-80" style={{ color: 'var(--color-accent, #0D9488)' }}>Learn more &rarr;</a>
          ) : (
            <Link to={`/service/${s.id}`} className="text-sm font-medium hover:opacity-80" style={{ color: 'var(--color-accent, #0D9488)' }}>Learn more &rarr;</Link>
          )}
        </div>
      ))}
    </div>
  );
}

/* Lightbox component for gallery */
function Lightbox({ items, currentIndex, onClose, onNext, onPrev }) {
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft') onPrev();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; };
  }, [onClose, onNext, onPrev]);

  const item = items[currentIndex];
  if (!item) return null;
  const src = resolveSrc(item.image);

  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center" data-testid="gallery-lightbox" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 z-10 text-white/70 hover:text-white p-2" data-testid="lightbox-close"><X className="w-7 h-7" /></button>
      {items.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); onPrev(); }} className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white/50 hover:text-white p-2 bg-white/10 rounded-full" data-testid="lightbox-prev"><ChevronLeft className="w-7 h-7" /></button>
          <button onClick={(e) => { e.stopPropagation(); onNext(); }} className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white/50 hover:text-white p-2 bg-white/10 rounded-full" data-testid="lightbox-next"><ChevronRight className="w-7 h-7" /></button>
        </>
      )}
      <div className="max-w-5xl max-h-[90vh] flex flex-col items-center px-4" onClick={(e) => e.stopPropagation()}>
        {src && <img src={src} alt={item.title || ''} className="max-w-full max-h-[75vh] object-contain rounded" data-testid="lightbox-image" />}
        <div className="mt-4 text-center">
          {item.title && <h3 className="text-white text-lg font-semibold">{item.title}</h3>}
          {item.summary && <p className="text-white/60 text-sm mt-1 max-w-xl">{item.summary}</p>}
        </div>
        <p className="text-white/30 text-xs mt-3">{currentIndex + 1} / {items.length}</p>
      </div>
    </div>
  );
}

/* Gallery block - Simple photo gallery with category tabs + lightbox */
function GalleryBlock() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tab, setTab] = useState('all');
  const [lightboxIndex, setLightboxIndex] = useState(-1);

  useEffect(() => {
    publicAPI.getGallery().then(r => setItems(r.data || [])).catch(() => {});
    publicAPI.getGalleryCategories().then(r => setCategories(r.data || [])).catch(() => {});
  }, []);

  const filtered = tab === 'all' ? items : items.filter(i => i.category === tab);
  const uniqueCats = categories.length > 0 ? categories : [...new Set(items.map(i => i.category).filter(Boolean))].map(c => ({ name: c }));

  if (!items.length) return null;
  return (
    <div data-testid="block-gallery">
      {uniqueCats.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mb-8" data-testid="gallery-block-tabs">
          <button onClick={() => setTab('all')} className={`px-5 py-2 rounded-sm text-sm font-medium transition-colors ${tab === 'all' ? 'text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-[#0D9488]'}`} style={tab === 'all' ? { backgroundColor: 'var(--color-primary, #1a2332)' } : {}}>All</button>
          {uniqueCats.map(c => {
            const key = c.slug || c.name;
            return (
              <button key={key} onClick={() => setTab(c.name)} className={`px-5 py-2 rounded-sm text-sm font-medium transition-colors capitalize ${tab === c.name ? 'text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-[#0D9488]'}`} style={tab === c.name ? { backgroundColor: 'var(--color-primary, #1a2332)' } : {}} data-testid={`gallery-block-tab-${key}`}>{c.name}</button>
            );
          })}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((item, idx) => {
          const src = resolveSrc(item.image);
          return (
            <div key={item.id} className="group relative rounded-lg overflow-hidden bg-slate-100 cursor-pointer" data-testid={`gallery-block-item-${item.id}`}>
              {item.link && (
                <a href={item.link} target={item.open_in_new_tab ? '_blank' : '_self'} rel="noreferrer" className="absolute top-3 right-3 z-10 bg-white/90 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()} data-testid={`gallery-link-${item.id}`}>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
                </a>
              )}
              <div className="aspect-[4/3] overflow-hidden" onClick={() => setLightboxIndex(filtered.findIndex(f => f.id === item.id))}>
                {src ? <img src={src} alt={item.title || ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center text-slate-300">No image</div>}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              {(item.title || item.summary) && (
                <div className="p-3">
                  {item.title && <h4 className="text-sm font-semibold" style={{ color: 'var(--color-heading, #1a2332)' }}>{item.title}</h4>}
                  {item.summary && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{item.summary}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {lightboxIndex >= 0 && (
        <Lightbox items={filtered} currentIndex={lightboxIndex} onClose={() => setLightboxIndex(-1)}
          onNext={() => setLightboxIndex(p => (p + 1) % filtered.length)}
          onPrev={() => setLightboxIndex(p => (p - 1 + filtered.length) % filtered.length)} />
      )}
    </div>
  );
}

/* Gallery Albums block */
function GalleryAlbumsBlock() {
  const [albums, setAlbums] = useState([]);
  useEffect(() => { publicAPI.getGalleryAlbums().then(r => setAlbums(r.data || [])).catch(() => {}); }, []);
  if (!albums.length) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6" data-testid="block-gallery-albums">
      {albums.map(a => (
        <Link key={a.id} to={`/album/${a.id}`} className="group">
          <div className="aspect-square rounded-lg overflow-hidden bg-slate-100">
            {a.cover_image ? <img src={resolveSrc(a.cover_image)} alt={a.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /> : <div className="w-full h-full flex items-center justify-center text-slate-400">No cover</div>}
          </div>
          <h3 className="mt-2 font-medium text-sm" style={{ color: 'var(--color-heading, #1a2332)' }}>{a.title}</h3>
        </Link>
      ))}
    </div>
  );
}

/* Blog Posts block - Auto-displays latest news/blog posts */
function BlogPostsBlock() {
  const [posts, setPosts] = useState([]);
  useEffect(() => { publicAPI.getBlog(1, 6).then(r => setPosts(r.data?.posts || r.data || [])).catch(() => {}); }, []);
  if (!posts.length) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="block-blog-posts">
      {posts.map(post => {
        const src = resolveSrc(post.image);
        return (
          <Link key={post.id} to={`/news/${post.slug || post.id}`} className="group bg-white rounded-lg border border-slate-100 overflow-hidden hover:shadow-md transition-shadow" data-testid={`blog-block-item-${post.id}`}>
            {src && <div className="h-44 overflow-hidden"><img src={src} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /></div>}
            <div className="p-4">
              {post.category && <span className="text-xs font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--color-accent, #0D9488)' }}>{post.category}</span>}
              <h3 className="text-base font-bold mb-1 line-clamp-2" style={{ color: 'var(--color-heading, #1a2332)' }}>{post.title}</h3>
              <p className="text-sm text-slate-500 line-clamp-2">{post.excerpt || ''}</p>
              {post.created_at && <p className="text-xs text-slate-400 mt-2">{new Date(post.created_at).toLocaleDateString()}</p>}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

/* Reading List block - Auto-displays books with modal */
function ReadingListBlock() {
  const [books, setBooks] = useState([]);
  const [selected, setSelected] = useState(null);
  useEffect(() => { publicAPI.getBooks().then(r => setBooks(r.data || [])).catch(() => {}); }, []);
  if (!books.length) return null;
  return (
    <div data-testid="block-reading-list">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
        {books.map(book => {
          const src = resolveSrc(book.image || book.cover_image);
          return (
            <div key={book.id} className="group text-center cursor-pointer" onClick={() => setSelected(book)} data-testid={`reading-block-item-${book.id}`}>
              <div className="aspect-[2/3] rounded-lg overflow-hidden bg-slate-100 shadow-md group-hover:shadow-lg transition-shadow mb-3">
                {src ? <img src={src} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /> : <div className="w-full h-full flex items-center justify-center text-slate-300 text-sm">No cover</div>}
              </div>
              <h4 className="text-sm font-semibold line-clamp-2" style={{ color: 'var(--color-heading, #1a2332)' }}>{book.title}</h4>
              {book.author && <p className="text-xs text-slate-500 mt-0.5">{book.author}</p>}
            </div>
          );
        })}
      </div>
      {selected && (
        <BookDetailModal book={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

/* Book Detail Modal - shared by ReadingListBlock */
function BookDetailModal({ book, onClose }) {
  const src = resolveSrc(book.image || book.cover_image);
  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4" onClick={onClose} data-testid="book-detail-modal">
      <div className="bg-white rounded-lg max-w-[600px] w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col md:flex-row gap-6 p-6 pb-0">
          {src && <img src={src} alt={book.title} className="w-36 h-52 object-cover rounded-sm shadow-lg mx-auto md:mx-0 flex-shrink-0" />}
          <div>
            <h3 className="text-xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--color-heading, #1a2332)' }}>{book.title}</h3>
            <p className="text-sm font-medium mt-1" style={{ color: 'var(--color-accent, #0D9488)' }}>by {book.author}</p>
            <p className="text-sm mt-3 leading-relaxed" style={{ color: 'var(--color-body-text, #475569)' }}>{book.description}</p>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {book.synopsis && (
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--color-heading, #1a2332)' }}>Synopsis</h4>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-body-text, #475569)' }}>{book.synopsis}</p>
            </div>
          )}
          {book.who_is_it_for && (
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--color-heading, #1a2332)' }}>Who Is It For?</h4>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-body-text, #475569)' }}>{book.who_is_it_for}</p>
            </div>
          )}
          {book.about_author && (
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--color-heading, #1a2332)' }}>About the Author</h4>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-body-text, #475569)' }}>{book.about_author}</p>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            {book.amazon_link && (
              <a href={book.amazon_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm text-sm font-medium transition-colors" style={{ backgroundColor: 'var(--color-button-bg, #1a2332)', color: 'var(--color-button-text, #fff)' }} data-testid="book-amazon-link">Buy on Amazon</a>
            )}
            <button onClick={onClose} className="px-5 py-2.5 border border-slate-200 rounded-sm text-sm text-slate-600 hover:bg-slate-50">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileCardBlock({ config }) {
  const src = resolveSrc(config.image);
  return (
    <div className="bg-white rounded-lg border border-slate-100 p-6 text-center max-w-sm mx-auto" data-testid="block-profile-card">
      {src && <img src={src} alt={config.name} className="w-24 h-24 rounded-full mx-auto mb-4 object-cover" />}
      {config.name && <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--color-heading, #1a2332)' }}>{config.name}</h3>}
      {config.title && <p className="text-sm mb-3" style={{ color: 'var(--color-accent, #0D9488)' }}>{config.title}</p>}
      {config.bio && <p className="text-sm" style={{ color: 'var(--color-body-text, #475569)' }}>{config.bio}</p>}
    </div>
  );
}

function ButtonBlock({ config }) {
  const isPrimary = config.style === 'primary';
  const style = isPrimary
    ? { backgroundColor: 'var(--color-button-bg, #1a2332)', color: 'var(--color-button-text, #fff)' }
    : { border: '2px solid var(--color-button-bg, #1a2332)', color: 'var(--color-button-bg, #1a2332)' };
  const cls = `inline-block px-6 py-3 rounded-sm font-medium text-sm transition-opacity hover:opacity-80 ${isPrimary ? '' : 'bg-transparent'}`;
  if (config.open_in_new_tab) {
    return <a href={config.url} target="_blank" rel="noreferrer" className={cls} style={style} data-testid="block-button">{config.text || 'Click Here'}</a>;
  }
  return <Link to={config.url || '#'} className={cls} style={style} data-testid="block-button">{config.text || 'Click Here'}</Link>;
}

function SeparatorBlock({ config }) {
  if (config.style === 'dots') return <div className="flex justify-center gap-2 py-4">{[1,2,3].map(i => <div key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-accent, #0D9488)' }} />)}</div>;
  if (config.style === 'space') return <div className="py-8" />;
  return <hr className="border-slate-200 my-6" />;
}

function CustomHtmlBlock({ config }) {
  if (!config.html) return null;
  return <div dangerouslySetInnerHTML={{ __html: config.html }} data-testid="block-custom-html" />;
}

function LegendsTestimonialsBlock() {
  const [items, setItems] = useState([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    publicAPI.getTestimonials().then(r => {
      const data = (r.data || []).sort((a, b) => (a.order || 0) - (b.order || 0));
      setItems(data);
    }).catch(() => {});
  }, []);

  const next = useCallback(() => setCurrent(p => (p + 1) % items.length), [items.length]);
  const prev = useCallback(() => setCurrent(p => (p - 1 + items.length) % items.length), [items.length]);

  useEffect(() => {
    if (items.length < 2) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [items.length, next]);

  if (!items.length) return null;
  const item = items[current];
  const src = resolveSrc(item?.image);

  return (
    <div className="relative bg-[#1a2332] rounded-xl p-8 md:p-12 lg:p-16 overflow-hidden" data-testid="block-legends-carousel">
      <div className="absolute top-6 left-8 text-6xl font-serif leading-none" style={{ color: 'var(--color-accent, #0D9488)', opacity: 0.3 }}>&ldquo;</div>
      <div className="relative z-10 text-center max-w-3xl mx-auto">
        <p className="text-white/90 text-lg md:text-xl italic leading-relaxed mb-8 min-h-[80px]" data-testid="testimonial-quote">
          {item?.content}
        </p>
        <div className="flex items-center justify-center gap-4">
          {src && <img src={src} alt={item?.name} className="w-14 h-14 rounded-full object-cover border-2 border-white/20" data-testid="testimonial-author-img" />}
          <div className="text-left">
            <p className="text-white font-semibold text-sm" data-testid="testimonial-author-name">{item?.name}</p>
            {item?.title && <p className="text-white/50 text-xs">{item?.title}</p>}
          </div>
        </div>
      </div>
      {items.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 p-2 text-white/30 hover:text-white/80 transition-colors" data-testid="testimonial-prev"><ChevronLeft className="w-6 h-6" /></button>
          <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-white/30 hover:text-white/80 transition-colors" data-testid="testimonial-next"><ChevronRight className="w-6 h-6" /></button>
          <div className="flex justify-center gap-2 mt-6 relative z-10">
            {items.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === current ? 'bg-[#0D9488] scale-125' : 'bg-white/20 hover:bg-white/40'}`}
                data-testid={`testimonial-dot-${i}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* Map Block - renders a react-leaflet map for a given map type (map-only, no list) */
function MapBlock({ mapType }) {
  const [locations, setLocations] = useState([]);
  const settings = useSettings();
  const lang = settings.maps_language || 'local';

  useEffect(() => {
    publicAPI.getMapLocations(mapType).then(r => setLocations(r.data || [])).catch(() => {});
  }, [mapType]);

  if (!locations.length) return <div className="text-center py-8 text-slate-400 text-sm">No locations for this map.</div>;

  const center = [locations[0].lat, locations[0].lng];
  return (
    <div className="rounded-lg overflow-hidden" style={{ height: '400px' }} data-testid={`block-map-${mapType}`}>
      <MapContainer center={center} zoom={locations.length > 1 ? 3 : 6} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer url={getTileUrl(lang)} attribution={getTileAttribution(lang)} />
        <MarkerClusterGroup chunkedLoading>
          {locations.map(loc => (
            <Marker key={loc.id} position={[loc.lat, loc.lng]}>
              <Popup>
                <strong>{loc.name}</strong>
                {loc.description && <><br /><span style={{ fontSize: '12px', color: '#666' }}>{loc.description}</span></>}
                {loc.link && <><br /><a href={loc.link} target={loc.open_in_new_tab ? '_blank' : '_self'} rel="noreferrer" style={{ fontSize: '12px', color: '#0D9488' }}>Visit &rarr;</a></>}
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}

export default function BlockRenderer({ block }) {
  if (!block || !block.type) return null;
  const config = block.config || {};
  switch (block.type) {
    case 'rich_text': return <RichTextBlock config={config} />;
    case 'image': return <ImageBlock config={config} />;
    case 'video': return <VideoBlock config={config} />;
    case 'service_list': return <ServiceListBlock />;
    case 'gallery': return <GalleryBlock />;
    case 'gallery_albums': return <GalleryAlbumsBlock />;
    case 'blog_posts': return <BlogPostsBlock />;
    case 'reading_list': return <ReadingListBlock />;
    case 'profile_card': return <ProfileCardBlock config={config} />;
    case 'button': return <ButtonBlock config={config} />;
    case 'separator': return <SeparatorBlock config={config} />;
    case 'custom_html': return <CustomHtmlBlock config={config} />;
    case 'legends_testimonials': return <LegendsTestimonialsBlock />;
    case 'map_global': return <MapBlock mapType="global_business" />;
    case 'map_conferences': return <MapBlock mapType="conferences" />;
    case 'map_recommended': return <MapBlock mapType="recommended_sites" />;
    default: return null;
  }
}
