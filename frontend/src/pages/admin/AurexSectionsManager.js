import React, { useEffect, useState, useRef } from 'react';
import { adminAPI, blogExternalAPI } from '../../lib/api';
import { toast } from 'sonner';
import { AUREX_SECTIONS } from '../../lib/aurexSchemas';
import { useSettings } from '../../App';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import RichTextEditor from '../../components/RichTextEditor';
import LocalizedField from '../../components/admin/LocalizedField';
import { adminText } from '../../lib/i18n';
import { AUREX_ITEM_ICONS } from '../../lib/aurexIconList';
import * as lucide from 'lucide-react';
import { Loader2, Save, Plus, Edit2, Trash2, Upload, Eye, EyeOff, Sparkles, X, Copy, Search } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

function IconPicker({ value, onChange, fieldKey }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const filtered = AUREX_ITEM_ICONS.filter(n => n.toLowerCase().includes(q.toLowerCase()));
  const Current = value ? (lucide[pascal(value)] || lucide.Circle) : lucide.Circle;
  return (
    <div className="relative mt-1">
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-sm text-sm bg-white hover:border-slate-400" data-testid={`field-${fieldKey}`}>
        <Current className="w-4 h-4 text-slate-600" />
        <span className="flex-1 text-left font-mono text-xs">{value || '— pick an icon —'}</span>
        <span className="text-xs text-slate-400">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-72 overflow-hidden rounded-sm border border-slate-200 bg-white shadow-xl flex flex-col">
          <div className="p-2 border-b border-slate-100 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search icons…" className="flex-1 text-sm outline-none" />
          </div>
          <div className="overflow-y-auto p-2 grid grid-cols-6 gap-1">
            {filtered.map(name => {
              const Ico = lucide[pascal(name)];
              if (!Ico) return null;
              const selected = value === name;
              return (
                <button key={name} type="button" onClick={() => { onChange(name); setOpen(false); setQ(''); }} title={name} className={`aspect-square flex items-center justify-center rounded hover:bg-slate-100 ${selected ? 'bg-[#0D9488]/10 ring-1 ring-[#0D9488]' : ''}`}>
                  <Ico className="w-4 h-4" />
                </button>
              );
            })}
            {filtered.length === 0 && <div className="col-span-6 text-center text-xs text-slate-400 py-4">No icons match "{q}"</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function SocialLinksField({ value, onChange, fieldKey }) {
  const settings = useSettings();
  const networks = (settings.social_links || []).filter(n => n.platform);
  const map = value || {};
  if (networks.length === 0) {
    return <p className="text-xs text-slate-400 italic mt-1">Add social networks at <span className="font-mono">Settings → Social Links</span> first. They'll appear here for each team member.</p>;
  }
  return (
    <div className="mt-1 space-y-2" data-testid={`field-${fieldKey}`}>
      {networks.map(n => {
        const Ico = lucide[pascal(n.icon || 'globe')] || lucide.Globe;
        return (
          <div key={n.id} className="flex items-center gap-2">
            <div className="w-9 h-9 flex items-center justify-center bg-slate-100 rounded-sm text-slate-600 flex-shrink-0"><Ico className="w-4 h-4" /></div>
            <Input type="url" value={map[n.id] || ''} onChange={e => onChange({ ...(map || {}), [n.id]: e.target.value })} placeholder={`${n.platform} URL (optional)`} />
          </div>
        );
      })}
    </div>
  );
}

function pascal(s) {
  if (!s) return '';
  return String(s).replace(/(^|[-_ ])(\w)/g, (_, __, c) => c.toUpperCase()).replace(/[-_ ]/g, '');
}

// Reusable KMS category/subcategory picker (EXTERNAL_BLOG_KMS_SECTIONS_PLAN
// Phase 4). Any block config field of type 'kms_categories' gets it. Value =
// ordered [{slug, label?}]; the block renders one labelled section per entry.
function KmsCategoryPicker({ value, onChange, fieldKey }) {
  const [cats, setCats] = useState([]);
  const rows = Array.isArray(value) ? value : [];
  useEffect(() => {
    blogExternalAPI.getCategories().then(r => setCats(r.data?.categories || [])).catch(() => setCats([]));
  }, []);
  const bySlug = Object.fromEntries(cats.map(c => [c.slug, c]));
  const nameOf = (slug) => bySlug[slug]?.name || slug;
  const used = new Set(rows.map(r => r.slug));
  const set = (next) => onChange(next);
  const add = (slug) => { if (slug && !used.has(slug)) set([...rows, { slug }]); };
  const remove = (i) => set(rows.filter((_, idx) => idx !== i));
  const move = (i, d) => {
    const j = i + d; if (j < 0 || j >= rows.length) return;
    const next = rows.slice(); [next[i], next[j]] = [next[j], next[i]]; set(next);
  };
  const setLabel = (i, label) => set(rows.map((r, idx) => idx === i ? { ...r, label: label || undefined } : r));
  // grouped options: each pillar followed by its indented subcategories
  const options = [];
  cats.filter(c => !c.parent_id).forEach(p => {
    options.push({ slug: p.slug, name: p.name, depth: 0 });
    cats.filter(c => c.parent_id === p.id).forEach(sc => options.push({ slug: sc.slug, name: sc.name, depth: 1 }));
  });
  return (
    <div className="mt-1 space-y-2" data-testid={`field-${fieldKey}`}>
      {rows.length === 0 && (
        <p className="text-xs text-slate-400 italic">No categories selected — the block shows the latest posts flat. Add one or more below to display them as labelled sections.</p>
      )}
      {rows.map((r, i) => (
        <div key={r.slug || i} className="flex items-center gap-2 border border-slate-200 rounded-sm px-2 py-1.5 bg-white">
          <div className="flex flex-col leading-none">
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="text-slate-400 hover:text-slate-700 disabled:opacity-30 text-[10px]">▲</button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} className="text-slate-400 hover:text-slate-700 disabled:opacity-30 text-[10px]">▼</button>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{nameOf(r.slug)}</div>
            <div className="text-[11px] text-slate-400 font-mono truncate">{r.slug}</div>
          </div>
          <Input value={r.label || ''} onChange={e => setLabel(i, e.target.value)} placeholder="Label override (optional)" className="max-w-[190px] h-8 text-xs" />
          <button type="button" onClick={() => remove(i)} className="text-slate-400 hover:text-red-500" title="Remove"><X className="w-4 h-4" /></button>
        </div>
      ))}
      <select value="" onChange={e => { add(e.target.value); e.target.value = ''; }} className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm bg-white" data-testid={`field-${fieldKey}-add`}>
        <option value="">+ Add category…</option>
        {options.filter(o => !used.has(o.slug)).map(o => (
          <option key={o.slug} value={o.slug}>{o.depth ? '   — ' : ''}{o.name}</option>
        ))}
      </select>
    </div>
  );
}

function FieldInput({ field, value, onChange }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setUploading(true);
    try {
      const r = await adminAPI.uploadImage(f);
      const url = r.data?.url?.startsWith('/api') ? `${API}${r.data.url}` : r.data?.url;
      onChange(url);
      toast.success('Uploaded');
    } catch (err) { toast.error('Upload failed'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  if (field.type === 'rich') {
    return (
      <div className="mt-1" data-testid={`field-${field.key}`}>
        <LocalizedField value={value} onChange={onChange} render={({ value: v, onChange: oc }) => (
          <RichTextEditor value={v || ''} onChange={oc} placeholder={field.placeholder} />
        )} />
      </div>
    );
  }
  if (field.type === 'icon') {
    return <IconPicker value={value} onChange={onChange} fieldKey={field.key} />;
  }
  if (field.type === 'social_links') {
    return <SocialLinksField value={value} onChange={onChange} fieldKey={field.key} />;
  }
  if (field.type === 'kms_categories') {
    return <KmsCategoryPicker value={value} onChange={onChange} fieldKey={field.key} />;
  }
  if (field.type === 'textarea') {
    return (
      <LocalizedField value={value} onChange={onChange} render={({ value: v, onChange: oc }) => (
        <textarea value={v || ''} onChange={e => oc(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-sm text-sm min-h-[70px]" placeholder={field.placeholder} data-testid={`field-${field.key}`} />
      )} />
    );
  }
  if (field.type === 'number') {
    return <Input type="number" value={value ?? ''} onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))} className="mt-1" placeholder={field.placeholder} data-testid={`field-${field.key}`} />;
  }
  if (field.type === 'bool') {
    return <div className="mt-1"><Switch checked={!!value} onCheckedChange={onChange} data-testid={`field-${field.key}`} /></div>;
  }
  if (field.type === 'select') {
    return (
      <select value={value || ''} onChange={e => onChange(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-sm text-sm bg-white" data-testid={`field-${field.key}`}>
        <option value="">—</option>
        {field.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  }
  if (field.type === 'image') {
    return (
      <div className="flex gap-2 mt-1 items-start">
        <Input value={value || ''} onChange={e => onChange(e.target.value)} placeholder={field.placeholder || 'https://… or upload →'} data-testid={`field-${field.key}`} />
        <input type="file" ref={fileRef} accept="image/*" onChange={handleUpload} className="hidden" />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="px-3 py-2 rounded-sm text-xs font-medium bg-slate-100 hover:bg-slate-200 flex items-center gap-1 disabled:opacity-50 whitespace-nowrap">
          {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} Upload
        </button>
        {value && (<img src={value} alt="" className="w-10 h-10 object-cover rounded border border-slate-200" />)}
      </div>
    );
  }
  // text, url: URLs stay scalar, text fields get localized
  if (field.type === 'url') {
    return <Input type="url" value={value || ''} onChange={e => onChange(e.target.value)} className="mt-1" placeholder={field.placeholder} data-testid={`field-${field.key}`} />;
  }
  return (
    <LocalizedField value={value} onChange={onChange} render={({ value: v, onChange: oc }) => (
      <Input type="text" value={v || ''} onChange={e => oc(e.target.value)} className="mt-1" placeholder={field.placeholder} data-testid={`field-${field.key}`} />
    )} />
  );
}

// Personality tabs for sections that support per-mini-site data (currently aurex_team).
// null = Global / One-page Pro (unchanged behaviour); 'business'|'lifestyle'|'personal' = PB mini-site.
const PB_SECTION_TABS = [
  { key: null,         label: 'Global',         hint: 'One-page Pro + all non-PB themes',   cls: 'border-sky-400    text-sky-700'     },
  { key: 'business',   label: 'PB — Business',   hint: 'Personal Brand Business mini-site',   cls: 'border-slate-400  text-slate-700'   },
  { key: 'lifestyle',  label: 'PB — Lifestyle',  hint: 'Personal Brand Lifestyle mini-site',  cls: 'border-emerald-400 text-emerald-700' },
  { key: 'personal',   label: 'PB — Personal',   hint: 'Personal Brand Personal mini-site',   cls: 'border-violet-400  text-violet-700'  },
];
// Every Aurex section supports per-personality data — the backend already stores
// config and items keyed by pb_personality. Listing all keys here enables the
// Global | PB–Business | PB–Lifestyle | PB–Personal tab strip in the admin.
const PB_SCOPED_SECTIONS = new Set([
  'aurex_audience', 'aurex_process', 'aurex_pricing', 'aurex_team',
  'aurex_partners', 'aurex_clients', 'aurex_events', 'aurex_video',
  'aurex_services_cfg', 'aurex_testimonials_cfg', 'aurex_news_cfg',
  'aurex_blog_cfg', 'aurex_locations_cfg',
  'aurex_reading_cfg', 'aurex_portfolio_cfg', 'aurex_gallery_cfg',
]);

function SectionEditor({ sectionKey }) {
  const settings = useSettings();
  const isPB = settings.active_theme === 'personalbrand';
  const showPersonalityTabs = isPB && PB_SCOPED_SECTIONS.has(sectionKey);

  const schema = AUREX_SECTIONS[sectionKey];
  // null = Global; 'business'|'lifestyle'|'personal' = PB mini-site tab
  // Default to 'business' so PB theme admins land on production data immediately.
  // For non-PB themes showPersonalityTabs=false so tabPersonality resolves to undefined regardless.
  const [activeTab, setActiveTab] = useState('business');
  // Track which tabs have at least a title saved (config) or at least one item
  const [savedTabs, setSavedTabs] = useState(new Set());
  const [config, setConfig] = useState({});
  const [items, setItems] = useState([]);
  const [savingConfig, setSavingConfig] = useState(false);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [savingItem, setSavingItem] = useState(false);

  // The personality param forwarded to all API calls for the active tab.
  // null tab → no param (global); PB tabs → their key.
  const tabPersonality = showPersonalityTabs ? activeTab : undefined;

  const loadAll = async (personality) => {
    try {
      const c = await adminAPI.getAurexConfig(sectionKey, personality);
      setConfig(c.data || {});
      if (schema.itemFields) {
        const it = await adminAPI.getAurexItems(sectionKey, personality);
        setItems(it.data || []);
        // Mark as saved if any items exist OR the config has a title
        if ((it.data || []).length > 0 || (c.data || {}).title) {
          setSavedTabs(prev => new Set([...prev, personality ?? '__global__']));
        }
      } else if ((c.data || {}).title) {
        setSavedTabs(prev => new Set([...prev, personality ?? '__global__']));
      }
    } catch (err) { toast.error(`Failed to load ${schema.label}`); }
  };

  // Reload when section key, active tab, or personality visibility changes.
  // tabPersonality encodes both activeTab and showPersonalityTabs, so when
  // settings load asynchronously and flip showPersonalityTabs false→true,
  // tabPersonality changes (undefined→'business') and triggers a re-fetch.
  useEffect(() => {
    setConfig({});
    setItems([]);
    loadAll(tabPersonality);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionKey, tabPersonality]);

  // Pre-check PB tabs for saved-state badges when personality tabs are visible
  useEffect(() => {
    if (!showPersonalityTabs) return;
    const checkAll = async () => {
      for (const tab of PB_SECTION_TABS) {
        try {
          const c = await adminAPI.getAurexConfig(sectionKey, tab.key);
          const hasConfig = !!(c.data || {}).title;
          let hasItems = false;
          if (schema.itemFields) {
            const it = await adminAPI.getAurexItems(sectionKey, tab.key);
            hasItems = (it.data || []).length > 0;
          }
          if (hasConfig || hasItems) {
            setSavedTabs(prev => new Set([...prev, tab.key ?? '__global__']));
          }
        } catch {}
      }
    };
    checkAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPersonalityTabs, sectionKey]);

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      await adminAPI.saveAurexConfig(sectionKey, config, tabPersonality);
      setSavedTabs(prev => new Set([...prev, tabPersonality ?? '__global__']));
      toast.success(tabPersonality ? `Saved — PB ${tabPersonality}` : 'Saved');
    } catch (err) { toast.error(err.response?.data?.detail || 'Save failed'); }
    finally { setSavingConfig(false); }
  };

  const handleSaveItem = async () => {
    setSavingItem(true);
    try {
      if (editing?.id) await adminAPI.updateAurexItem(sectionKey, editing.id, editing);
      else await adminAPI.createAurexItem(sectionKey, editing, tabPersonality);
      setOpen(false); setEditing(null); await loadAll(tabPersonality);
      setSavedTabs(prev => new Set([...prev, tabPersonality ?? '__global__']));
      toast.success('Saved');
    } catch (err) { toast.error(err.response?.data?.detail || 'Save failed'); }
    finally { setSavingItem(false); }
  };

  const handleDelete = async (id, label) => {
    if (!window.confirm(`Delete "${label}"?`)) return;
    try { await adminAPI.deleteAurexItem(sectionKey, id); toast.success('Deleted'); await loadAll(tabPersonality); }
    catch (err) { toast.error('Delete failed'); }
  };

  const toggleVisible = async (item) => {
    try { await adminAPI.updateAurexItem(sectionKey, item.id, { ...item, visible: !(item.visible !== false) }); await loadAll(tabPersonality); }
    catch (err) { toast.error('Update failed'); }
  };

  const handleDuplicate = async (item) => {
    try {
      // Strip server-managed fields so the backend assigns a fresh id + order.
      // eslint-disable-next-line no-unused-vars
      const { id, order, section, _id, created_at, updated_at, pb_personality, ...rest } = item;
      const clone = { ...rest, visible: item.visible !== false };
      // Append "(Copy)" to the first text-like field so the user can tell them apart.
      // Handle both legacy plain strings and localized {en, es, …} dicts.
      const nameField = ['name', 'title'].find(k => clone[k] != null && (typeof clone[k] === 'string' ? clone[k] : (typeof clone[k] === 'object' && Object.values(clone[k]).some(v => v))));
      if (nameField) {
        if (typeof clone[nameField] === 'string') {
          clone[nameField] = `${clone[nameField]} (Copy)`;
        } else if (typeof clone[nameField] === 'object' && clone[nameField]) {
          const next = { ...clone[nameField] };
          for (const k of Object.keys(next)) {
            if (next[k]) next[k] = `${next[k]} (Copy)`;
          }
          clone[nameField] = next;
        }
      }
      await adminAPI.createAurexItem(sectionKey, clone, tabPersonality);
      toast.success('Duplicated');
      await loadAll(tabPersonality);
    } catch (err) { toast.error(err.response?.data?.detail || 'Duplicate failed'); }
  };

  return (
    <div data-testid={`aurex-editor-${sectionKey}`}>
      <div className="mb-4">
        <p className="text-xs text-slate-500">{schema.description}</p>
      </div>

      {/* ── Personal Brand personality tab strip ─────────────────────────── */}
      {showPersonalityTabs && (
        <div className="mb-5 border border-slate-200 rounded-sm bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Content scope
          </p>
          <p className="text-xs text-slate-400 mb-3">
            Each Personal Brand mini-site has its own independent content — section title, items, and all settings.
            <span className="ml-1 font-medium text-slate-600">Global</span> is used by the One-page Pro theme and as a fallback for any PB mini-site not yet configured.
          </p>
          <div className="flex flex-wrap gap-2" role="tablist">
            {PB_SECTION_TABS.map(tab => {
              const isActive = activeTab === tab.key;
              const hasSaved = savedTabs.has(tab.key ?? '__global__');
              return (
                <button
                  key={tab.key ?? '__global__'}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 rounded-sm text-sm font-medium border-2 transition-colors ${
                    isActive
                      ? `bg-white shadow-sm ${tab.cls}`
                      : 'text-slate-400 border-transparent hover:text-slate-600 hover:bg-white/60'
                  }`}
                  data-testid={`pb-team-tab-${tab.key ?? 'global'}`}
                >
                  {tab.label}
                  {tab.key !== null && hasSaved  && <span className="ml-1.5 text-[10px] font-normal text-emerald-500">● configured</span>}
                  {tab.key !== null && !hasSaved && <span className="ml-1.5 text-[10px] font-normal text-amber-500">● not set</span>}
                </button>
              );
            })}
          </div>
          {activeTab && (
            <p className="text-[11px] text-slate-400 mt-2">
              {PB_SECTION_TABS.find(t => t.key === activeTab)?.hint}
              {' — '}content here is exclusive to the <strong>{activeTab}</strong> mini-site.
              Falls back to Global if left unconfigured.
            </p>
          )}
          {!activeTab && (
            <p className="text-[11px] text-slate-400 mt-2">
              Global content — used by One-page Pro and as a fallback for any PB mini-site not yet configured.
            </p>
          )}
        </div>
      )}
      {/* Config card */}
      <div className="rounded-lg border bg-white p-5 mb-6" style={{ borderColor: 'var(--ad-border, #e2e8f0)' }} data-testid={`config-form-${sectionKey}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--ad-heading, #1a2332)' }}>Section configuration</h3>
          <button onClick={handleSaveConfig} disabled={savingConfig} className="text-white px-3 py-1.5 rounded-sm text-xs font-medium flex items-center gap-1.5 disabled:opacity-50" style={{ backgroundColor: 'var(--ad-button-bg, #0D9488)' }} data-testid={`save-config-${sectionKey}`}>
            {savingConfig ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save config
          </button>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {schema.configFields.map(f => (
            <div key={f.key} className={['textarea', 'image', 'kms_categories'].includes(f.type) ? 'sm:col-span-2' : ''}>
              <Label className="text-xs">{f.label}</Label>
              <FieldInput field={f} value={config[f.key]} onChange={(v) => setConfig({ ...config, [f.key]: v })} />
            </div>
          ))}
        </div>
      </div>

      {/* Items CRUD */}
      {schema.itemFields && (
        <div className="rounded-lg border bg-white overflow-hidden" style={{ borderColor: 'var(--ad-border, #e2e8f0)' }}>
          <div className="p-4 flex items-center justify-between border-b" style={{ borderColor: 'var(--ad-border, #e2e8f0)' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--ad-heading, #1a2332)' }}>Items ({items.length})</h3>
            <button onClick={() => { setEditing({ visible: true }); setOpen(true); }} className="text-white px-3 py-1.5 rounded-sm text-xs font-medium flex items-center gap-1.5" style={{ backgroundColor: 'var(--ad-button-bg, #0D9488)' }} data-testid={`add-item-${sectionKey}`}>
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
          {items.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-400">No items yet. Click "Add" to create one.</div>
          ) : (
            <ul className="divide-y" style={{ borderColor: 'var(--ad-border, #e2e8f0)' }}>
              {items.map(item => (
                <li key={item.id} className="p-3 flex items-center gap-3" data-testid={`item-row-${item.id}`}>
                  <span className="text-[10px] text-slate-400 font-mono w-6">#{item.order + 1}</span>
                  {(item.photo_url || item.logo_url || item.icon) && (
                    <div className="w-9 h-9 rounded bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                      {(item.photo_url || item.logo_url)
                        ? <img src={item.photo_url || item.logo_url} alt="" className="w-full h-full object-cover" />
                        : <span className="text-[10px] text-slate-500">{item.icon}</span>}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--ad-heading, #1a2332)' }}>{schema.itemPreview(item)}</p>
                    {item.description && <p className="text-xs text-slate-400 truncate">{adminText(item.description).replace(/<[^>]*>/g, '')}</p>}
                    {item.badge && <span className="inline-block text-[10px] mt-0.5 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">{adminText(item.badge)}</span>}
                  </div>
                  <button onClick={() => toggleVisible(item)} className="p-1.5 hover:bg-slate-100 rounded" data-testid={`toggle-${item.id}`}>
                    {item.visible !== false ? <Eye className="w-4 h-4 text-emerald-500" /> : <EyeOff className="w-4 h-4 text-slate-300" />}
                  </button>
                  <button onClick={() => handleDuplicate(item)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500" title="Duplicate" data-testid={`duplicate-${item.id}`}><Copy className="w-3.5 h-3.5" /></button>
                  <button onClick={() => { setEditing({ ...item }); setOpen(true); }} className="p-1.5 hover:bg-slate-100 rounded" data-testid={`edit-${item.id}`}><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(item.id, schema.itemPreview(item))} className="p-1.5 hover:bg-red-50 text-red-500 rounded" data-testid={`delete-${item.id}`}><Trash2 className="w-3.5 h-3.5" /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Item editor dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle style={{ fontFamily: "'Playfair Display', serif" }}>{editing?.id ? 'Edit' : 'New'} — {schema.label}</DialogTitle></DialogHeader>
          {editing && schema.itemFields && (
            <div className="space-y-3">
              {schema.itemFields.map(f => (
                <div key={f.key}>
                  <Label className="text-xs">{f.label}{f.required && <span className="text-rose-500"> *</span>}</Label>
                  <FieldInput field={f} value={editing[f.key]} onChange={(v) => setEditing({ ...editing, [f.key]: v })} />
                </div>
              ))}
              <label className="flex items-center gap-2 text-xs pt-2 border-t" style={{ borderColor: 'var(--ad-border, #e2e8f0)' }}>
                <Switch checked={editing.visible !== false} onCheckedChange={(v) => setEditing({ ...editing, visible: v })} />
                Visible on website
              </label>
              <button onClick={handleSaveItem} disabled={savingItem} className="w-full py-2 rounded-sm text-sm font-medium text-white flex items-center justify-center gap-2 disabled:opacity-50" style={{ backgroundColor: 'var(--ad-button-bg, #0D9488)' }} data-testid="aurex-item-save-btn">
                {savingItem ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {editing.id ? 'Update' : 'Create'}
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AurexSectionsManager() {
  const [active, setActive] = useState('aurex_audience');

  return (
    <div data-testid="aurex-sections-manager">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--ad-heading, #1a2332)', fontFamily: "'Playfair Display', serif" }}>
          <Sparkles className="w-5 h-5 text-amber-500" /> Section Manager
        </h1>
        <p className="text-sm text-slate-500 mt-1">Content management for the one-page content sections. Only visible when the one-page theme is active on the website.</p>
      </div>

      {/* Section tab rail */}
      <div className="flex gap-2 mb-6 flex-wrap" data-testid="aurex-tabs">
        {Object.entries(AUREX_SECTIONS).map(([key, schema]) => {
          const Icon = schema.icon;
          const isActive = active === key;
          return (
            <button key={key} onClick={() => setActive(key)} className={`px-4 py-2 rounded-sm text-xs font-medium flex items-center gap-2 transition-colors ${isActive ? 'text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`} style={isActive ? { backgroundColor: 'var(--ad-button-bg, #0D9488)' } : {}} data-testid={`aurex-tab-${key}`}>
              <Icon className="w-3.5 h-3.5" /> {schema.label}
            </button>
          );
        })}
      </div>

      <SectionEditor sectionKey={active} />
    </div>
  );
}
