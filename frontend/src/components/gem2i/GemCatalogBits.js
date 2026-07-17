import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { gemAPI } from '../../lib/api';
import { useMember } from '../../lib/memberAuth';
import { useT } from '../../lib/i18n';

/** Shared building blocks for the gem2i Phase-2 catalog pages. Visual
 *  language = the Phase-1 components (CSS vars, Poppins, restrained motion). */

const BACKEND = process.env.REACT_APP_BACKEND_URL || '';

/** Uploads-relative image URL → absolute (same convention as the favicon). */
export function gemImg(url) {
  if (!url) return null;
  return url.startsWith('/api') ? `${BACKEND}${url}` : url;
}

/** Solid page-title band used by every catalog page (no hero slides here). */
export function CatalogHero({ kicker, title, children }) {
  return (
    <section className="relative" data-testid="hero-section"
      style={{ background: 'linear-gradient(180deg, rgba(50,135,183,0.14), transparent 70%)' }}>
      <div className="max-w-7xl mx-auto px-6 md:px-10 pt-16 pb-10">
        {kicker && (
          <p className="text-xs font-medium uppercase tracking-[0.3em] mb-1.5"
            style={{ color: 'var(--color-accent, #3287B7)' }}>{kicker}</p>
        )}
        <h1 className="text-white font-bold" style={{ fontSize: 'clamp(1.9rem, 4vw, 3rem)' }}>{title}</h1>
        {children}
      </div>
    </section>
  );
}

/** One row of filter pills (tabs). Options: [{value, label}]. */
export function FilterPills({ options, value, onChange, allLabel }) {
  const opts = allLabel ? [{ value: '', label: allLabel }, ...options] : options;
  return (
    <div className="flex flex-wrap gap-2" role="tablist">
      {opts.map((o) => {
        const active = value === o.value;
        return (
          <button key={o.value || '_all'} type="button" role="tab" aria-selected={active}
            onClick={() => onChange(o.value)}
            className="px-4 py-1.5 text-[13px] font-medium rounded-sm border transition-colors"
            style={active
              ? { backgroundColor: 'var(--color-accent, #3287B7)', borderColor: 'var(--color-accent, #3287B7)', color: '#fff' }
              : { borderColor: 'var(--color-card-border, rgba(255,255,255,0.08))', color: 'var(--color-body-text, #9AA6B2)' }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Search input matching the dark theme. */
export function CatalogSearch({ value, onChange, placeholder }) {
  return (
    <input type="search" value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full md:w-72 px-4 py-2 text-sm rounded-sm border bg-transparent text-white placeholder:text-white/35 focus:outline-none focus:ring-1"
      style={{ borderColor: 'var(--color-card-border, rgba(255,255,255,0.08))' }} />
  );
}

export function Paginator({ page, pages, onPage }) {
  const tt = useT();
  if (pages <= 1) return null;
  return (
    <nav className="mt-12 flex items-center justify-center gap-4" aria-label="pagination">
      <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}
        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-sm border disabled:opacity-30 transition-colors hover:text-white"
        style={{ borderColor: 'var(--color-card-border, rgba(255,255,255,0.08))', color: 'var(--color-body-text, #9AA6B2)' }}>
        <ChevronLeft className="w-4 h-4" /> {tt({ en: 'Previous', es: 'Anterior' })}
      </button>
      <span className="text-sm tabular-nums" style={{ color: 'var(--color-body-text, #9AA6B2)' }}>
        {page} / {pages}
      </span>
      <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)}
        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-sm border disabled:opacity-30 transition-colors hover:text-white"
        style={{ borderColor: 'var(--color-card-border, rgba(255,255,255,0.08))', color: 'var(--color-body-text, #9AA6B2)' }}>
        {tt({ en: 'Next', es: 'Siguiente' })} <ChevronRight className="w-4 h-4" />
      </button>
    </nav>
  );
}

/** Skeleton grid shown while a catalog page loads. */
export function SkeletonGrid({ count = 8, aspect = 'aspect-[3/4]' }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className={`${aspect} rounded-sm`} style={{ backgroundColor: 'var(--color-card-bg, #0D1721)' }} />
          <div className="h-4 mt-3 w-2/3 rounded-sm" style={{ backgroundColor: 'var(--color-card-bg, #0D1721)' }} />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ children }) {
  return (
    <div className="py-24 text-center">
      <p className="text-sm" style={{ color: 'var(--color-body-text, #9AA6B2)' }}>{children}</p>
    </div>
  );
}

/** Image with the card background as fallback when the file is missing. */
export function CardImage({ src, alt, aspect = 'aspect-[3/4]', fit = 'object-cover', className = '' }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className={`${aspect} rounded-sm overflow-hidden ${className}`}
      style={{ backgroundColor: 'var(--color-card-bg, #0D1721)' }}>
      {src && !broken && (
        <img src={src} alt={alt || ''} loading="lazy" onError={() => setBroken(true)}
          className={`w-full h-full ${fit} group-hover:scale-105 transition-transform duration-500 motion-reduce:transition-none`} />
      )}
    </div>
  );
}

/** Event type badge — legacy E-TICKET / GUEST LIST / INFO labels. */
export function TypeBadge({ type }) {
  const tt = useT();
  const LABELS = {
    eticket: { en: 'E-Ticket', es: 'E-Ticket' },
    guest_list: { en: 'Guest List', es: 'Lista de Invitados' },
    info: { en: 'Info', es: 'Info' },
    epass: { en: 'E-Pass', es: 'E-Pass' },
  };
  if (!LABELS[type]) return null;
  return (
    <span className="inline-block px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-sm"
      style={{ backgroundColor: 'rgba(50,135,183,0.18)', color: 'var(--color-link, #5FB2E0)' }}>
      {tt(LABELS[type])}
    </span>
  );
}

/** Follow / unfollow. Logged-out clicks open the login modal (legacy parity:
 *  detail interactions are member-gated; identity comes from the JWT). */
export function FollowButton({ kind, targetId, className = '' }) {
  const tt = useT();
  const { member } = useMember();
  const [following, setFollowing] = useState(null); // null = unknown yet
  const [busy, setBusy] = useState(false);

  React.useEffect(() => {
    let alive = true;
    if (!member || !targetId) { setFollowing(false); return; }
    gemAPI.myFollows(kind)
      .then(r => { if (alive) setFollowing((r.data?.items || []).some(f => f.target_id === targetId)); })
      .catch(() => { if (alive) setFollowing(false); });
    return () => { alive = false; };
  }, [member, kind, targetId]);

  const toggle = async () => {
    if (!member) { window.dispatchEvent(new CustomEvent('gem2i:open-login')); return; }
    if (busy || following === null) return;
    setBusy(true);
    try {
      await gemAPI.follow(kind, targetId, !following);
      setFollowing(!following);
    } catch { /* leave state as-is */ }
    setBusy(false);
  };

  const active = !!following;
  return (
    <button type="button" onClick={toggle} disabled={busy} data-testid={`follow-${kind}`}
      className={`inline-flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-sm border transition-colors ${className}`}
      style={active
        ? { backgroundColor: 'var(--color-accent, #3287B7)', borderColor: 'var(--color-accent, #3287B7)', color: '#fff' }
        : { borderColor: 'var(--color-accent, #3287B7)', color: 'var(--color-link, #5FB2E0)' }}>
      <Heart className="w-4 h-4" fill={active ? 'currentColor' : 'none'} />
      {active ? tt({ en: 'Following', es: 'Siguiendo' }) : tt({ en: 'Follow', es: 'Seguir' })}
    </button>
  );
}

/** Social links row for detail pages. */
export function SocialLinks({ socials }) {
  const entries = Object.entries(socials || {}).filter(([, v]) => v);
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2">
      {entries.map(([k, v]) => (
        <a key={k} href={v} target="_blank" rel="noreferrer"
          className="text-[13px] capitalize transition-colors hover:text-white"
          style={{ color: 'var(--color-link, #5FB2E0)' }}>
          {k}
        </a>
      ))}
    </div>
  );
}

/** Reusable artist card (listings + lineup strips). */
export function ArtistCard({ artist, rank }) {
  const img = gemImg(artist.image_urls?.big) || gemImg(artist.image_urls?.small);
  return (
    <Link to={`/artists/${artist.slug}`} className="group block" data-testid="artist-card">
      <div className="relative">
        <CardImage src={img} alt={artist.name} aspect="aspect-[3/4]" />
        {rank != null && (
          <span className="absolute top-2 left-2 min-w-[2rem] text-center px-1.5 py-0.5 text-xs font-bold tabular-nums rounded-sm"
            style={{ backgroundColor: 'var(--color-accent, #3287B7)', color: '#fff' }}>
            {rank}
          </span>
        )}
      </div>
      <p className="mt-3 text-white/90 text-sm font-semibold group-hover:text-white transition-colors">{artist.name}</p>
      {artist.country && (
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-body-text, #9AA6B2)' }}>{artist.country}</p>
      )}
    </Link>
  );
}
