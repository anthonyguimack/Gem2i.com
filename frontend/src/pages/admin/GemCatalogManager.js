import React, { useEffect, useMemo, useState } from 'react';
import { adminAPI, gemAdminAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Switch } from '../../components/ui/switch';
import ImageUpload from '../../components/ImageUpload';
import {
  Plus, Edit2, Trash2, Loader2, Search, RotateCcw, X,
  ChevronLeft, ChevronRight, Image as ImageIcon,
} from 'lucide-react';

/* Config-driven admin CRUD for the 7 gem_* catalogs (GEM2I_MIGRATION_PLAN A10).
   One generic list+dialog manager; each route mounts it with a `catalog` prop.
   Data shapes = the ETL'd docs (reference/GEM2I_LEGACY_SCHEMA_PHASE2.md §2).
   Images: legacy docs store FILENAMES resolved server-side via the legacy
   folder map; the CMS uploader stores a full `/api/uploads/...` path instead —
   the backend `_img` passes those through untouched. */

const API = process.env.REACT_APP_BACKEND_URL;
const resolveSrc = (v) => (v ? (v.startsWith('/api') ? `${API}${v}` : v) : null);

const CONTINENTS = ['Europe', 'North America', 'South America', 'Africa', 'Oceania', 'Asia'];
const SOCIAL_KEYS = ['website', 'facebook', 'twitter', 'instagram', 'youtube', 'soundcloud', 'mixcloud'];
const EVENT_TYPES = [
  { value: 'epass', label: 'E-Pass' },
  { value: 'eticket', label: 'E-Ticket' },
  { value: 'guest_list', label: 'Guest List' },
  { value: 'info', label: 'Info' },
];

/* ---------------- dot-path helpers (rosters.gem_rank etc.) ---------------- */
const getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
const setPath = (obj, path, val) => {
  const keys = path.split('.');
  const clone = { ...obj };
  let cur = clone;
  keys.slice(0, -1).forEach((k) => { cur[k] = { ...(cur[k] || {}) }; cur = cur[k]; });
  cur[keys[keys.length - 1]] = val;
  return clone;
};

/* ---------------- catalog configs ---------------- */
const geoFields = [
  { key: 'address', label: 'Address', type: 'text' },
  { key: 'city', label: 'City', type: 'text', half: true },
  { key: 'state', label: 'State', type: 'text', half: true },
  { key: 'country', label: 'Country', type: 'text', half: true },
  { key: 'continent', label: 'Continent', type: 'select', half: true, options: CONTINENTS.map((c) => ({ value: c, label: c })) },
];

const CONFIGS = {
  artists: {
    title: 'Artists', noun: 'artist', nameOf: (i) => i.name || i.full_name,
    subtitle: (i) => [
      i.country,
      i.rosters?.gem_rank ? `GEM #${i.rosters.gem_rank}` : null,
      i.rosters?.djmag_rank ? `DJ Mag #${i.rosters.djmag_rank}` : null,
      i.rosters?.resident_rank ? `Resident #${i.rosters.resident_rank}` : null,
    ].filter(Boolean).join(' · '),
    fields: [
      { key: 'name', label: 'Name', type: 'text', half: true },
      { key: 'full_name', label: 'Full name', type: 'text', half: true },
      { key: 'slug', label: 'Slug (URL)', type: 'text', half: true },
      { key: 'genres', label: 'Genres (comma-separated)', type: 'csv', half: true },
      { key: 'country', label: 'Country', type: 'text', half: true },
      { key: 'continent', label: 'Continent', type: 'select', half: true, options: CONTINENTS.map((c) => ({ value: c, label: c })) },
      { key: 'rosters.gem_rank', label: 'GEM rank (1–100)', type: 'rank', third: true },
      { key: 'rosters.djmag_rank', label: 'DJ Mag rank (1–100)', type: 'rank', third: true },
      { key: 'rosters.resident_rank', label: 'Resident rank (1–100)', type: 'rank', third: true },
      { key: 'summary', label: 'Summary', type: 'textarea', rows: 2 },
      { key: 'bio', label: 'Biography (HTML allowed)', type: 'textarea', rows: 5 },
      { key: 'video', label: 'Video URL', type: 'text' },
      { key: 'gem2i_client', label: 'GEM2i-managed client', type: 'switch' },
    ],
    socials: SOCIAL_KEYS,
    imageKeys: [
      { key: 'small', label: 'Photo (listing)' }, { key: 'big', label: 'Photo (big)' },
      { key: 'detail', label: 'Photo (detail)' }, { key: 'logo', label: 'Logo' }, { key: 'logo_off', label: 'Logo (off)' },
    ],
  },

  venues: {
    title: 'Venues', noun: 'venue', nameOf: (i) => i.name,
    subtitle: (i) => [i.type, i.city, i.country, i.capacity ? `cap. ${i.capacity}` : null].filter(Boolean).join(' · '),
    fields: [
      { key: 'name', label: 'Name', type: 'text', half: true },
      { key: 'slug', label: 'Slug (URL)', type: 'text', half: true },
      { key: 'type', label: 'Venue type', type: 'venueType', half: true },
      { key: 'capacity', label: 'Capacity', type: 'text', half: true },
      ...geoFields,
      { key: 'zip', label: 'ZIP', type: 'text', half: true },
      { key: 'order', label: 'Listing order', type: 'number', half: true },
      { key: 'genres', label: 'Genres (comma-separated)', type: 'csv' },
      { key: 'summary', label: 'Summary', type: 'textarea', rows: 2 },
      { key: 'description', label: 'Description (HTML allowed)', type: 'textarea', rows: 4 },
      { key: 'map', label: 'Map embed / URL', type: 'text' },
      { key: 'featured', label: 'Featured', type: 'switch' },
    ],
    socials: ['website', 'facebook', 'twitter', 'youtube'],
    imageKeys: [
      { key: 'view', label: 'Venue view photo' }, { key: 'logo', label: 'Logo' }, { key: 'logo_off', label: 'Logo (off)' },
    ],
  },

  festivals: {
    title: 'Festivals', noun: 'festival', nameOf: (i) => i.title,
    subtitle: (i) => [i.event_date, i.range_dates, i.country].filter(Boolean).join(' · '),
    fields: [
      { key: 'title', label: 'Title', type: 'text', half: true },
      { key: 'slug', label: 'Slug (URL)', type: 'text', half: true },
      { key: 'event_date', label: 'Date', type: 'date', half: true },
      { key: 'range_dates', label: 'Date range (display)', type: 'text', half: true },
      { key: 'open_time', label: 'Open time', type: 'text', half: true },
      { key: 'end_time', label: 'End time', type: 'text', half: true },
      ...geoFields,
      { key: 'description', label: 'Description (HTML allowed)', type: 'textarea', rows: 4 },
      { key: 'artists_schedule', label: 'Artists schedule (HTML allowed)', type: 'textarea', rows: 3 },
      { key: 'video', label: 'Video URL', type: 'text', half: true },
      { key: 'map', label: 'Map embed / URL', type: 'text', half: true },
      { key: 'lineup', label: 'Line-up', type: 'lineup' },
    ],
    socials: SOCIAL_KEYS,
    imageKeys: [
      { key: 'flyer', label: 'Flyer' }, { key: 'view', label: 'View photo' },
      { key: 'generic', label: 'Generic image' }, { key: 'logo', label: 'Logo' }, { key: 'logo_off', label: 'Logo (off)' },
    ],
  },

  conferences: {
    title: 'Conferences', noun: 'conference', nameOf: (i) => i.title,
    subtitle: (i) => [i.event_date, i.range_dates, i.country].filter(Boolean).join(' · '),
    fields: [
      { key: 'title', label: 'Title', type: 'text', half: true },
      { key: 'slug', label: 'Slug (URL)', type: 'text', half: true },
      { key: 'event_date', label: 'Date', type: 'date', half: true },
      { key: 'range_dates', label: 'Date range (display)', type: 'text', half: true },
      ...geoFields,
      { key: 'description', label: 'Description (HTML allowed)', type: 'textarea', rows: 4 },
      { key: 'conferences_schedule', label: 'Schedule (HTML allowed)', type: 'textarea', rows: 3 },
      { key: 'video', label: 'Video URL', type: 'text', half: true },
      { key: 'website', label: 'Website', type: 'text', half: true },
    ],
    socials: SOCIAL_KEYS,
    imageKeys: [
      { key: 'flyer', label: 'Flyer' }, { key: 'logo', label: 'Logo' }, { key: 'logo_off', label: 'Logo (off)' },
    ],
  },

  clients: {
    title: 'Clients', noun: 'client', nameOf: (i) => i.title,
    subtitle: (i) => ({ video: 'Video lightbox', gallery: 'Photo gallery' }[i.mode] || 'Link'),
    fields: [
      { key: 'title', label: 'Title', type: 'text', half: true },
      { key: 'order', label: 'Carousel order', type: 'number', half: true },
      { key: 'mode', label: 'Click behavior', type: 'select', half: true, options: [
        { value: 'link', label: 'Open link' }, { value: 'video', label: 'Video lightbox' }, { value: 'gallery', label: 'Photo gallery' },
      ] },
      { key: 'url', label: 'Link URL', type: 'text', half: true },
      { key: 'video', label: 'Video URL (mode = video)', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea', rows: 2 },
      { key: 'publish', label: 'Published on homepage', type: 'publish' },
      { key: 'gallery', label: 'Gallery photos (mode = gallery)', type: 'gallery' },
    ],
    imageKeys: [{ key: 'on', label: 'Logo (on)', flat: 'image_on' }, { key: 'off', label: 'Logo (off)', flat: 'image_off' }],
  },

  events: {
    title: 'Events', noun: 'event', nameOf: (i) => i.title,
    subtitle: (i) => [
      i.event_date,
      (EVENT_TYPES.find((t) => t.value === i.type) || {}).label,
      i.private ? 'PRIVATE' : null,
      i.show_portal === false ? 'hidden from portal' : null,
    ].filter(Boolean).join(' · '),
    fields: [
      { key: 'title', label: 'Title', type: 'text', half: true },
      { key: 'slug', label: 'Slug (URL)', type: 'text', half: true },
      { key: 'type', label: 'Event type', type: 'select', half: true, options: EVENT_TYPES },
      { key: 'event_date', label: 'Date', type: 'date', half: true },
      { key: 'open_time', label: 'Open time', type: 'text', half: true },
      { key: 'end_time', label: 'End time', type: 'text', half: true },
      { key: 'venue_id', label: 'Venue', type: 'venue' },
      { key: 'lineup', label: 'DJ line-up', type: 'lineup' },
      { key: 'summary', label: 'Summary', type: 'textarea', rows: 2 },
      { key: 'description', label: 'Description (HTML allowed)', type: 'textarea', rows: 4 },
      { key: 'concept', label: 'Concept (HTML allowed)', type: 'textarea', rows: 2 },
      { key: 'external_ticket_system', label: 'External ticket system URL', type: 'text' },
      { key: 'private', label: 'Private event (hidden from public)', type: 'switch', half: true },
      { key: 'show_portal', label: 'Show on the GEM2i portal', type: 'switch', half: true },
      { key: 'guest_list', label: 'Guest list', type: 'guestList' },
      { key: 'tiers', label: 'Ticket tiers', type: 'tiers' },
      { key: 'payment.currency', label: 'Payment currency', type: 'select', half: true, options: [
        { value: 'usd', label: 'USD' }, { value: 'eur', label: 'EUR' }, { value: 'gbp', label: 'GBP' },
      ] },
    ],
    socials: SOCIAL_KEYS,
    imageKeys: [{ key: 'flyer', label: 'Flyer' }, { key: 'logo', label: 'Logo' }],
  },
};

/* ---------------- shared sub-widgets ---------------- */

/** Searchable reference picker against another gem catalog (single or multi). */
function RefPicker({ catalog, value, onChange, multiple, placeholder }) {
  const ids = useMemo(() => (multiple ? value || [] : value ? [value] : []), [value, multiple]);
  const [names, setNames] = useState({});
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const missing = ids.filter((i) => !names[i]);
    if (!missing.length) return;
    gemAdminAPI.list(catalog, { ids: missing.join(','), limit: 100 })
      .then((r) => setNames((prev) => {
        const n = { ...prev };
        (r.data.items || []).forEach((it) => { n[it.id] = it.name || it.title; });
        return n;
      })).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(','), catalog]);

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    const t = setTimeout(() => {
      gemAdminAPI.list(catalog, { q: q.trim(), status: 'active', limit: 8 })
        .then((r) => setResults(r.data.items || [])).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [q, catalog]);

  const add = (item) => {
    setNames((prev) => ({ ...prev, [item.id]: item.name || item.title }));
    onChange(multiple ? [...ids.filter((i) => i !== item.id), item.id] : item.id);
    setQ(''); setResults([]); setOpen(false);
  };
  const remove = (id) => onChange(multiple ? ids.filter((i) => i !== id) : '');

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {ids.map((id) => (
          <span key={id} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded-sm">
            {names[id] || id.slice(0, 8)}
            <button type="button" onClick={() => remove(id)} className="text-slate-400 hover:text-red-500"><X className="w-3 h-3" /></button>
          </span>
        ))}
      </div>
      <div className="relative">
        <Input value={q} placeholder={placeholder || 'Type to search…'}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} />
        {open && results.length > 0 && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-sm shadow-md max-h-52 overflow-y-auto">
            {results.map((it) => (
              <button key={it.id} type="button" onClick={() => add(it)}
                className="block w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50">
                {it.name || it.title}
                <span className="text-slate-400 text-xs ml-2">{it.country || it.event_date || ''}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** One image slot: current preview + CMS upload + legacy-filename input. */
function ImageSlot({ label, filename, url, onChange }) {
  const isUpload = (filename || '').startsWith('/');
  return (
    <div className="border border-slate-200 rounded-sm p-3">
      <p className="text-xs font-medium text-slate-500 mb-2">{label}</p>
      {url ? (
        <div className="relative group mb-2">
          <img src={resolveSrc(url)} alt={label} className="w-full h-24 object-contain bg-slate-50 rounded-sm"
            onError={(e) => { e.currentTarget.style.opacity = 0.25; }} />
          <button type="button" onClick={() => onChange('')}
            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity">
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <ImageUpload value="" onChange={onChange} className="mb-2" />
      )}
      <Input value={isUpload ? '' : (filename || '')} placeholder="legacy filename (advanced)"
        onChange={(e) => onChange(e.target.value)} className="text-xs h-7" />
    </div>
  );
}

/** Ticket-tier sub-editor for events (Phase 5): the 6 legacy tiers, each with
 *  label / price / internal cost / stock. A tier sells when price>0 AND stock>0. */
const TIER_ROWS = [
  ['admission', 'G. Admission'], ['eprice', 'ePrice'], ['vip', 'VIP'],
  ['gold', 'Gold'], ['ultra', 'Ultra'], ['platinium', 'Platinium'],
];
function TiersEditor({ value, onChange }) {
  const tiers = value || {};
  const setTier = (key, patch) => onChange({ ...tiers, [key]: { ...(tiers[key] || {}), ...patch } });
  const num = (v) => (v === '' ? null : Number(v));
  return (
    <div className="border border-slate-200 rounded-sm p-3 mt-1">
      <div className="grid grid-cols-12 gap-2 text-[11px] text-slate-400 font-medium mb-1 px-1">
        <span className="col-span-3">Tier</span><span className="col-span-3">Label</span>
        <span className="col-span-2">Price</span><span className="col-span-2">Cost (internal)</span>
        <span className="col-span-2">Stock</span>
      </div>
      {TIER_ROWS.map(([key, defLabel]) => {
        const t = tiers[key] || {};
        const active = (t.price || 0) > 0 && (t.stock || 0) > 0;
        return (
          <div key={key} className="grid grid-cols-12 gap-2 items-center py-1">
            <span className={`col-span-3 text-xs ${active ? 'text-[#0D9488] font-semibold' : 'text-slate-500'}`}>{defLabel}</span>
            <Input className="col-span-3 h-8 text-xs" value={t.label || ''} placeholder={defLabel}
              onChange={(e) => setTier(key, { label: e.target.value })} />
            <Input className="col-span-2 h-8 text-xs" type="number" min="0" step="0.01" value={t.price ?? ''} placeholder="0"
              onChange={(e) => setTier(key, { price: num(e.target.value) })} />
            <Input className="col-span-2 h-8 text-xs" type="number" min="0" step="0.01" value={t.cost ?? ''} placeholder="0"
              onChange={(e) => setTier(key, { cost: num(e.target.value) })} />
            <Input className="col-span-2 h-8 text-xs" type="number" min="0" value={t.stock ?? ''} placeholder="0"
              onChange={(e) => setTier(key, { stock: num(e.target.value) })} />
          </div>
        );
      })}
      <p className="text-[11px] text-slate-400 mt-2">A tier is on sale when price &gt; 0 and stock &gt; 0. Profit &amp; 6-level e-commissions are computed at purchase.</p>
    </div>
  );
}

/** Guest-list sub-editor for events (Phase 4): stock, additional-guest ranges,
 *  per-member-type benefits. Only meaningful when the event type is guest_list. */
function GuestListEditor({ value, onChange }) {
  const gl = value || {};
  const [memberTypes, setMemberTypes] = useState([]);
  useEffect(() => {
    adminAPI.getMemberTypes()
      .then((r) => setMemberTypes((r.data || []).map((t) => ({ id: t.id, name: t.name || t.id }))))
      .catch(() => {});
  }, []);

  const set = (patch) => onChange({ ...gl, ...patch });
  const benefits = gl.benefits || [];
  const setBenefit = (idx, patch) => set({ benefits: benefits.map((b, i) => (i === idx ? { ...b, ...patch } : b)) });

  const dt = (v, cb) => (
    <Input type="datetime-local" value={(v || '').slice(0, 16)} onChange={(e) => cb(e.target.value)} className="mt-1 text-xs h-8" />
  );

  return (
    <div className="border border-slate-200 rounded-sm p-3 mt-1 space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-xs text-slate-500">Stock (people)</Label>
          <Input type="number" min="0" value={gl.stock ?? ''} className="mt-1"
            onChange={(e) => set({ stock: e.target.value === '' ? null : Math.max(0, Number(e.target.value)) })} />
        </div>
        <div>
          <Label className="text-xs text-slate-500">Additional guests</Label>
          <div className="flex items-center h-9 mt-1">
            <Switch checked={!!gl.additional_enabled} onCheckedChange={(v) => set({ additional_enabled: v })} />
          </div>
        </div>
        <div>
          <Label className="text-xs text-slate-500">Allowed counts (e.g. 1, 2, 5)</Label>
          <Input value={(gl.ranges || []).join(', ')} className="mt-1" disabled={!gl.additional_enabled}
            onChange={(e) => set({ ranges: e.target.value.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => Number.isFinite(n) && n > 0) })} />
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-slate-500 mb-2">Benefits per member type <span className="text-slate-300">(empty = every member is eligible)</span></p>
        <div className="space-y-2">
          {benefits.map((b, idx) => (
            <div key={idx} className="border border-slate-100 rounded-sm p-2 grid grid-cols-12 gap-2 items-end">
              <div className="col-span-3">
                <Label className="text-[11px] text-slate-400">Member type</Label>
                <select value={b.member_type_id || ''} onChange={(e) => setBenefit(idx, { member_type_id: e.target.value })}
                  className="w-full h-8 px-1.5 bg-white border border-slate-200 rounded-sm text-xs mt-1">
                  <option value="">—</option>
                  {memberTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="col-span-3">
                <Label className="text-[11px] text-slate-400">Open until</Label>
                {dt(b.open_until, (v) => setBenefit(idx, { open_until: v }))}
              </div>
              <div className="col-span-3">
                <Label className="text-[11px] text-slate-400">Free until</Label>
                {dt(b.free_until, (v) => setBenefit(idx, { free_until: v }))}
              </div>
              <div className="col-span-2">
                <Label className="text-[11px] text-slate-400">Additional until</Label>
                {dt(b.additional_until, (v) => setBenefit(idx, { additional_until: v }))}
              </div>
              <button type="button" onClick={() => set({ benefits: benefits.filter((_, i) => i !== idx) })}
                className="col-span-1 h-8 flex items-center justify-center text-slate-400 hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="col-span-6">
                <Label className="text-[11px] text-slate-400">Benefit title (shown to members)</Label>
                <Input value={b.additional_title || ''} onChange={(e) => setBenefit(idx, { additional_title: e.target.value })} className="mt-1 text-xs h-8" />
              </div>
              <div className="col-span-6">
                <Label className="text-[11px] text-slate-400">Benefit description</Label>
                <Input value={b.additional_desc || ''} onChange={(e) => setBenefit(idx, { additional_desc: e.target.value })} className="mt-1 text-xs h-8" />
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => set({ benefits: [...benefits, { member_type_id: '' }] })}
          className="mt-2 text-xs text-[#0D9488] font-medium flex items-center gap-1"><Plus className="w-3 h-3" /> Add benefit row</button>
      </div>
    </div>
  );
}

function GalleryEditor({ value, onChange }) {
  const rows = value || [];
  const update = (idx, patch) => onChange(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  return (
    <div className="space-y-2">
      {rows.map((r, idx) => (
        <div key={idx} className="flex gap-2 items-center">
          <Input value={r.title || ''} placeholder="Title" onChange={(e) => update(idx, { title: e.target.value })} />
          <Input value={r.photo || ''} placeholder="Photo filename or /api/uploads/… path" onChange={(e) => update(idx, { photo: e.target.value })} />
          <button type="button" onClick={() => onChange(rows.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-red-500 shrink-0">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...rows, { title: '', photo: '' }])}
        className="text-xs text-[#0D9488] font-medium flex items-center gap-1"><Plus className="w-3 h-3" /> Add photo</button>
    </div>
  );
}

/* ---------------- main manager ---------------- */
export default function GemCatalogManager({ catalog }) {
  const cfg = CONFIGS[catalog];
  const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [venueTypes, setVenueTypes] = useState([]);

  const load = () => {
    setLoading(true);
    gemAdminAPI.list(catalog, { q: q.trim() || undefined, status: statusFilter || undefined, page, limit: 25 })
      .then((r) => setData(r.data))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [catalog, page, statusFilter]);
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load(); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  useEffect(() => {
    if (catalog !== 'venues') return;
    gemAdminAPI.list('venue-types', { limit: 100, status: 'active' })
      .then((r) => setVenueTypes((r.data.items || []).map((t) => t.name || t.type).filter(Boolean).sort()))
      .catch(() => {});
  }, [catalog]);

  const openEditor = (item) => {
    setEditing(item ? { ...item } : { status: 'active', images: {}, socials: {} });
    setOpen(true);
  };

  const cleanForSave = (doc) => {
    // Strip server-computed / joined fields; the API rejects id-ish keys itself.
    const { image_urls, venue, upcoming_events, lineup_artists, ...rest } = doc;
    if (rest.socials) {
      rest.socials = Object.fromEntries(Object.entries(rest.socials).filter(([, v]) => (v || '').trim()));
    }
    return rest;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = cleanForSave(editing);
      if (editing.id) await gemAdminAPI.update(catalog, editing.id, body);
      else await gemAdminAPI.create(catalog, body);
      toast.success('Saved');
      setOpen(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Save failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${cfg.nameOf(item)}"? It is hidden everywhere but kept in the database.`)) return;
    try { await gemAdminAPI.remove(catalog, item.id); toast.success('Deleted'); load(); }
    catch { toast.error('Delete failed'); }
  };

  const handleRestore = async (item) => {
    try { await gemAdminAPI.update(catalog, item.id, { ...cleanForSave(item), status: 'active' }); toast.success('Restored'); load(); }
    catch { toast.error('Restore failed'); }
  };

  const thumbOf = (item) => {
    const urls = item.image_urls || {};
    return resolveSrc(Object.values(urls).find(Boolean));
  };

  const renderField = (f) => {
    const val = getPath(editing, f.key);
    const set = (v) => setEditing((prev) => setPath(prev, f.key, v));
    switch (f.type) {
      case 'text':
        return <Input value={val || ''} onChange={(e) => set(e.target.value)} className="mt-1" />;
      case 'number':
        return <Input type="number" value={val ?? ''} onChange={(e) => set(e.target.value === '' ? null : Number(e.target.value))} className="mt-1" />;
      case 'rank':
        return <Input type="number" min="1" max="100" value={val ?? ''} placeholder="—"
          onChange={(e) => set(e.target.value === '' ? null : Math.max(1, Math.min(100, Number(e.target.value))))} className="mt-1" />;
      case 'date':
        return <Input type="date" value={(val || '').slice(0, 10)} onChange={(e) => set(e.target.value)} className="mt-1" />;
      case 'textarea':
        return <textarea value={val || ''} rows={f.rows || 3} onChange={(e) => set(e.target.value)}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-sm mt-1" />;
      case 'csv':
        return <Input value={Array.isArray(val) ? val.join(', ') : (val || '')} className="mt-1"
          onChange={(e) => set(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} />;
      case 'select':
        return (
          <select value={val || ''} onChange={(e) => set(e.target.value)}
            className="w-full h-9 px-2 bg-white border border-slate-200 rounded-sm text-sm mt-1">
            <option value="">—</option>
            {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        );
      case 'venueType':
        return (
          <select value={val || ''} onChange={(e) => set(e.target.value)}
            className="w-full h-9 px-2 bg-white border border-slate-200 rounded-sm text-sm mt-1">
            <option value="">—</option>
            {venueTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            {val && !venueTypes.includes(val) && <option value={val}>{val}</option>}
          </select>
        );
      case 'switch':
        return (
          <div className="flex items-center h-9 mt-1">
            <Switch checked={!!val} onCheckedChange={set} />
          </div>
        );
      case 'publish':
        // legacy publish flag is the string '1' (see gem_catalogs public_clients query)
        return (
          <div className="flex items-center h-9 mt-1">
            <Switch checked={val === '1' || val === true} onCheckedChange={(v) => set(v ? '1' : '0')} />
          </div>
        );
      case 'venue':
        return <div className="mt-1"><RefPicker catalog="venues" value={val} onChange={set} placeholder="Search venues…" /></div>;
      case 'lineup':
        return <div className="mt-1"><RefPicker catalog="artists" value={val} onChange={set} multiple placeholder="Search artists to add…" /></div>;
      case 'gallery':
        return editing.mode === 'gallery' ? <div className="mt-1"><GalleryEditor value={val} onChange={set} /></div>
          : <p className="text-xs text-slate-400 mt-1">Set click behavior to "Photo gallery" to edit photos.</p>;
      case 'guestList':
        return editing.type === 'guest_list' ? <GuestListEditor value={val} onChange={set} />
          : <p className="text-xs text-slate-400 mt-1">Set the event type to "Guest List" to configure it.</p>;
      case 'tiers':
        return editing.type === 'eticket' ? <TiersEditor value={val} onChange={set} />
          : <p className="text-xs text-slate-400 mt-1">Set the event type to "E-Ticket" to configure tiers.</p>;
      default:
        return null;
    }
  };

  const statusBadge = (s) => ({
    active: 'bg-emerald-50 text-emerald-600',
    inactive: 'bg-amber-50 text-amber-600',
    deleted: 'bg-red-50 text-red-500',
  }[s] || 'bg-slate-100 text-slate-500');

  if (!cfg) return null;

  return (
    <div data-testid={`gem-${catalog}-manager`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1a2332]">GEM2i · {cfg.title}</h1>
          <p className="text-xs text-slate-400 mt-1">
            {data.total} total — public pages show active items only{catalog === 'events' ? ' (non-private, portal-visible, recent)' : ''}.
          </p>
        </div>
        <button onClick={() => openEditor(null)}
          className="bg-[#0D9488] text-white px-4 py-2 rounded-sm text-sm font-medium flex items-center gap-2"
          data-testid={`add-gem-${catalog}-btn`}>
          <Plus className="w-4 h-4" /> Add {cfg.noun}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${cfg.title.toLowerCase()}…`} className="pl-9" />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-9 px-2 bg-white border border-slate-200 rounded-sm text-sm">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="deleted">Deleted</option>
        </select>
      </div>

      <div className="bg-white rounded-sm border border-slate-200 divide-y divide-slate-100">
        {loading && <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-300" /></div>}
        {!loading && data.items.map((item) => (
          <div key={item.id} className="flex items-center gap-4 p-3 group hover:bg-slate-50 transition-colors">
            {thumbOf(item) ? (
              <img src={thumbOf(item)} alt="" className="w-12 h-12 object-cover rounded-sm bg-slate-100 shrink-0"
                onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
            ) : (
              <div className="w-12 h-12 rounded-sm bg-slate-100 flex items-center justify-center shrink-0">
                <ImageIcon className="w-4 h-4 text-slate-300" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-[#1a2332] truncate">{cfg.nameOf(item) || '(untitled)'}</p>
              <p className="text-xs text-slate-400 truncate">{cfg.subtitle(item)}</p>
            </div>
            <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-sm shrink-0 ${statusBadge(item.status)}`}>
              {item.status || '—'}
            </span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button onClick={() => openEditor(item)} className="p-1.5 text-slate-400 hover:text-[#0D9488]"
                data-testid={`edit-gem-${catalog}-${item.id}`}><Edit2 className="w-4 h-4" /></button>
              {item.status === 'deleted' ? (
                <button onClick={() => handleRestore(item)} title="Restore" className="p-1.5 text-slate-400 hover:text-emerald-600">
                  <RotateCcw className="w-4 h-4" /></button>
              ) : (
                <button onClick={() => handleDelete(item)} className="p-1.5 text-slate-400 hover:text-red-500"
                  data-testid={`delete-gem-${catalog}-${item.id}`}><Trash2 className="w-4 h-4" /></button>
              )}
            </div>
          </div>
        ))}
        {!loading && data.items.length === 0 && (
          <div className="p-12 text-center text-slate-400 text-sm">Nothing here yet.</div>
        )}
      </div>

      {data.pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4 text-sm text-slate-500">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="p-1.5 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
          Page {data.page} of {data.pages}
          <button disabled={page >= data.pages} onClick={() => setPage(page + 1)} className="p-1.5 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[680px] max-h-[85vh] overflow-y-auto" data-testid={`gem-${catalog}-dialog`}>
          <DialogHeader><DialogTitle>{editing?.id ? 'Edit' : 'New'} {cfg.noun}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-6 gap-3">
                {cfg.fields.map((f) => (
                  <div key={f.key} className={f.third ? 'col-span-2' : f.half ? 'col-span-3' : 'col-span-6'}>
                    <Label className="text-xs text-slate-500">{f.label}</Label>
                    {renderField(f)}
                  </div>
                ))}
                <div className="col-span-3">
                  <Label className="text-xs text-slate-500">Status</Label>
                  <select value={editing.status || 'active'} onChange={(e) => setEditing({ ...editing, status: e.target.value })}
                    className="w-full h-9 px-2 bg-white border border-slate-200 rounded-sm text-sm mt-1">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    {editing.status === 'deleted' && <option value="deleted">Deleted</option>}
                  </select>
                </div>
              </div>

              {cfg.socials && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 pt-2 border-t border-slate-100">Social links</p>
                  <div className="grid grid-cols-2 gap-3">
                    {cfg.socials.map((s) => (
                      <div key={s}>
                        <Label className="text-xs text-slate-400 capitalize">{s}</Label>
                        <Input value={editing.socials?.[s] || ''} className="mt-1"
                          onChange={(e) => setEditing({ ...editing, socials: { ...(editing.socials || {}), [s]: e.target.value } })} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {cfg.imageKeys && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 pt-2 border-t border-slate-100">Images</p>
                  <div className="grid grid-cols-2 gap-3">
                    {cfg.imageKeys.map((im) => {
                      // clients store image_on/image_off flat; everything else uses images{}
                      const filename = im.flat ? editing[im.flat] : editing.images?.[im.key];
                      const savedUrl = editing.image_urls?.[im.key];
                      const preview = (filename || '').startsWith('/') ? filename : (filename ? savedUrl : null);
                      const setImg = (v) => im.flat
                        ? setEditing({ ...editing, [im.flat]: v })
                        : setEditing({ ...editing, images: { ...(editing.images || {}), [im.key]: v } });
                      return <ImageSlot key={im.key} label={im.label} filename={filename} url={preview} onChange={setImg} />;
                    })}
                  </div>
                </div>
              )}

              <button onClick={handleSave} disabled={saving}
                className="w-full bg-[#0D9488] text-white py-2.5 rounded-sm text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                data-testid={`gem-${catalog}-save-btn`}>
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
