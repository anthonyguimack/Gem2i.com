import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { ArrowLeft, Loader2, Plus, Edit2, Trash2, ExternalLink } from 'lucide-react';
import ImageUpload from '../../components/ImageUpload';
import RichTextEditor from '../../components/RichTextEditor';

const SOCIALS = ['facebook', 'twitter', 'linkedin', 'instagram', 'youtube'];
const DATES = [
  ['launched', 'Launched'], ['funding_end', 'Funding Ends'], ['project', 'Project Date'],
  ['reporting', 'Reporting Date'], ['distribution', 'Distribution Date'],
];
// Company Information is the only real tab; the rest mirror companies_edit.php's
// tab bar as navigation placeholders for pending features (per Anthony).
const TABS = [
  ['info', 'Company Information'],
  ['tab2', 'Tab2'],
  ['ratios', 'Financial Ratios'],
  ['price', 'Price Analysis'],
  ['iireport', 'iiReport Update'],
];

const emptyCompany = {
  symbol: '', name: '', sector: '', industry: '', indexes: [], description: '',
  link_sec: '', edgar_cik: '', link_company: '', investor_url: '', ipo_date: '',
  ceo: '', address: '', country: '', state: '', city: '', zip: '', phone: '',
  image_detail: '', logo_on: '', logo_off: '', socials: {}, dates: {}, status: 'active',
};

function Field({ label, children, className = '' }) {
  return (
    <div className={className}>
      <Label className="text-xs text-slate-500">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

export default function CompanyEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [c, setC] = useState(isNew ? { ...emptyCompany, news: [] } : null);
  const [tax, setTax] = useState({ sectors: [], industries: {} });
  const [tab, setTab] = useState('info');
  const [saving, setSaving] = useState(false);

  useEffect(() => { adminAPI.getCompanyTaxonomy().then(r => setTax(r.data)).catch(() => {}); }, []);

  const load = useCallback(() => {
    if (isNew) return;
    adminAPI.getCompany(id)
      .then(r => setC({ ...emptyCompany, ...r.data, socials: r.data.socials || {}, dates: r.data.dates || {}, news: r.data.news || [] }))
      .catch(() => { toast.error('Company not found'); navigate('/admin/companies'); });
  }, [id, isNew, navigate]);
  useEffect(() => { load(); }, [load]);

  if (!c) return <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#0D9488]" /></div>;

  const set = (k, v) => setC(prev => ({ ...prev, [k]: v }));
  const setSocial = (k, v) => setC(prev => ({ ...prev, socials: { ...prev.socials, [k]: v } }));
  const setDate = (k, v) => setC(prev => ({ ...prev, dates: { ...prev.dates, [k]: v } }));

  // Industry options for the chosen sector; always include the current value so a
  // legacy/"L"/custom industry stays visible until the admin re-picks.
  const industryOpts = (() => {
    const opts = new Set(tax.industries[c.sector] || []);
    if (c.industry) opts.add(c.industry);
    return [...opts].sort((a, b) => a.localeCompare(b));
  })();

  const handleSave = async () => {
    if (!c.name.trim()) { toast.error('Name is required'); setTab('info'); return; }
    setSaving(true);
    try {
      const payload = { ...c }; delete payload.news;
      if (isNew) {
        const r = await adminAPI.createCompany(payload);
        toast.success('Company created');
        navigate(`/admin/companies/${r.data.id}`);
      } else {
        await adminAPI.updateCompany(id, payload);
        toast.success('Saved');
        load();
      }
    } catch (e) { toast.error(e.response?.data?.detail || 'Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <div data-testid="company-edit-page" className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin/companies')} className="p-2 text-slate-400 hover:text-slate-700 rounded-sm" title="Back to Companies">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[#1a2332]" style={{ fontFamily: 'Playfair Display, serif' }}>
              {isNew ? 'New Company' : `${c.symbol ? c.symbol + ' · ' : ''}${c.name}`}
            </h1>
            {!isNew && c.slug && (
              <a href={`/companies/${c.slug}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[#0D9488] inline-flex items-center gap-1 mt-0.5">
                View public page <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} className="bg-[#0D9488] text-white px-5 py-2 rounded-sm text-sm font-medium disabled:opacity-50 flex items-center gap-2" data-testid="company-save-btn">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex items-center border-b border-slate-200 mb-6 overflow-x-auto" data-testid="company-edit-tabs">
        {TABS.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`relative px-5 py-2.5 text-sm whitespace-nowrap transition-colors ${tab === key ? 'font-semibold text-[#1a2332]' : 'text-slate-500 hover:text-slate-700'}`}
            data-testid={`company-tab-${key}`}>
            {label}
            {tab === key && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-[#0D9488]" />}
          </button>
        ))}
      </div>

      {tab !== 'info' ? (
        <div className="py-24 text-center text-slate-400" data-testid="company-tab-pending">
          <p className="text-sm">This section is not available yet.</p>
          <p className="text-xs mt-1">Coming soon.</p>
        </div>
      ) : (
        <div className="space-y-6" data-testid="company-info-tab">
          {/* Identity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white border border-slate-100 rounded-sm p-5">
            <Field label="Ticker"><Input value={c.symbol} onChange={e => set('symbol', e.target.value)} data-testid="company-symbol" /></Field>
            <Field label="Security (Name) *"><Input value={c.name} onChange={e => set('name', e.target.value)} data-testid="company-name" /></Field>
            <Field label="Sector">
              <select value={c.sector} onChange={e => set('sector', e.target.value)} className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-sm" data-testid="company-sector">
                <option value="">Select your Sector</option>
                {(tax.sectors.includes(c.sector) || !c.sector ? tax.sectors : [c.sector, ...tax.sectors]).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Industry">
              <select value={c.industry} onChange={e => set('industry', e.target.value)} disabled={!c.sector} className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-sm disabled:opacity-50" data-testid="company-industry">
                <option value="">{c.sector ? 'Select your Industry' : 'Pick a sector first'}</option>
                {industryOpts.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </Field>
            <Field label="Index (comma-separated)" className="sm:col-span-2">
              <Input value={Array.isArray(c.indexes) ? c.indexes.join(', ') : (c.indexes || '')} onChange={e => set('indexes', e.target.value.split(','))} placeholder="S&P 500, DJIA" />
            </Field>
            <Field label="CEO Name"><Input value={c.ceo} onChange={e => set('ceo', e.target.value)} /></Field>
            <Field label="IPO Date"><Input type="date" value={(c.ipo_date || '').slice(0, 10)} onChange={e => set('ipo_date', e.target.value)} /></Field>
          </div>

          {/* Links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white border border-slate-100 rounded-sm p-5">
            <Field label="SEC EDGAR URL"><Input value={c.link_sec} onChange={e => set('link_sec', e.target.value)} /></Field>
            <Field label="SEC EDGAR CIK Number"><Input value={c.edgar_cik} onChange={e => set('edgar_cik', e.target.value)} /></Field>
            <Field label="Company URL"><Input value={c.link_company} onChange={e => set('link_company', e.target.value)} /></Field>
            <Field label="Investor Relations URL"><Input value={c.investor_url} onChange={e => set('investor_url', e.target.value)} /></Field>
          </div>

          {/* Description (rich text — house rule) */}
          <div className="bg-white border border-slate-100 rounded-sm p-5">
            <Field label="Description"><RichTextEditor value={c.description || ''} onChange={v => set('description', v)} placeholder="Company description…" /></Field>
          </div>

          {/* Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white border border-slate-100 rounded-sm p-5">
            <Field label="Address" className="sm:col-span-2"><Input value={c.address} onChange={e => set('address', e.target.value)} /></Field>
            <Field label="Country"><Input value={c.country} onChange={e => set('country', e.target.value)} /></Field>
            <Field label="State"><Input value={c.state} onChange={e => set('state', e.target.value)} /></Field>
            <Field label="City"><Input value={c.city} onChange={e => set('city', e.target.value)} /></Field>
            <Field label="Zip Code"><Input value={c.zip} onChange={e => set('zip', e.target.value)} /></Field>
            <Field label="Phone"><Input value={c.phone} onChange={e => set('phone', e.target.value)} /></Field>
          </div>

          {/* Images */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white border border-slate-100 rounded-sm p-5">
            <Field label="Logo On (color)"><ImageUpload value={c.logo_on} onChange={v => set('logo_on', v)} /></Field>
            <Field label="Logo Off (mono)"><ImageUpload value={c.logo_off} onChange={v => set('logo_off', v)} /></Field>
            <Field label="Image Detail (banner)"><ImageUpload value={c.image_detail} onChange={v => set('image_detail', v)} /></Field>
          </div>

          {/* Socials + dates + status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-100 rounded-sm p-5">
              <Label className="text-xs text-slate-500">Social Media</Label>
              <div className="space-y-2 mt-1">
                {SOCIALS.map(s => (
                  <Input key={s} value={c.socials?.[s] || ''} onChange={e => setSocial(s, e.target.value)} placeholder={`${s} URL`} className="text-sm" />
                ))}
              </div>
            </div>
            <div className="bg-white border border-slate-100 rounded-sm p-5">
              <Label className="text-xs text-slate-500">Key Dates</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {DATES.map(([k, label]) => (
                  <div key={k}>
                    <span className="text-[11px] text-slate-400">{label}</span>
                    <Input type="date" value={(c.dates?.[k] || '').slice(0, 10)} onChange={e => setDate(k, e.target.value)} className="text-xs" />
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <Label className="text-xs text-slate-500">Status</Label>
                <select value={c.status} onChange={e => set('status', e.target.value)} className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-sm mt-1" data-testid="company-status">
                  <option value="active">Active (visible on directory)</option>
                  <option value="hidden">Hidden</option>
                </select>
              </div>
            </div>
          </div>

          {/* News */}
          {isNew ? (
            <p className="text-xs text-slate-400">Save the company first to manage its news.</p>
          ) : (
            <CompanyNewsEditor companyId={id} news={c.news} onChanged={news => setC(prev => ({ ...prev, news }))} />
          )}
        </div>
      )}
    </div>
  );
}

const emptyNews = { title: '', url: '', site: '', image: '', description: '', published_date: '' };

function CompanyNewsEditor({ companyId, news, onChanged }) {
  const [items, setItems] = useState(news || []);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setItems(news || []); }, [news]);

  const refresh = async () => {
    const r = await adminAPI.getCompany(companyId);
    setItems(r.data.news || []); onChanged(r.data.news || []);
  };
  const save = async () => {
    if (!draft.title.trim()) { toast.error('Title is required'); return; }
    setBusy(true);
    try {
      if (draft.id) await adminAPI.updateCompanyNews(companyId, draft.id, draft);
      else await adminAPI.addCompanyNews(companyId, draft);
      toast.success('News saved'); setDraft(null); await refresh();
    } catch { toast.error('News save failed'); } finally { setBusy(false); }
  };
  const remove = async (nid) => {
    if (!window.confirm('Delete this news item?')) return;
    try { await adminAPI.deleteCompanyNews(companyId, nid); toast.success('Deleted'); await refresh(); }
    catch { toast.error('Delete failed'); }
  };

  return (
    <div className="bg-white border border-slate-100 rounded-sm p-5">
      <div className="flex items-center justify-between mb-2">
        <Label className="text-sm font-semibold text-[#1a2332]">News ({items.length})</Label>
        <button onClick={() => setDraft({ ...emptyNews })} className="text-xs text-[#0D9488] flex items-center gap-1"><Plus className="w-3 h-3" /> Add News</button>
      </div>
      {draft && (
        <div className="bg-slate-50 border border-slate-200 rounded-sm p-3 space-y-2 mb-3">
          <Input value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} placeholder="Title *" className="text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <Input value={draft.url} onChange={e => setDraft({ ...draft, url: e.target.value })} placeholder="Article URL" className="text-xs" />
            <Input value={draft.site} onChange={e => setDraft({ ...draft, site: e.target.value })} placeholder="Source site" className="text-xs" />
            <Input value={draft.image} onChange={e => setDraft({ ...draft, image: e.target.value })} placeholder="Image URL" className="text-xs" />
            <Input type="date" value={(draft.published_date || '').slice(0, 10)} onChange={e => setDraft({ ...draft, published_date: e.target.value })} className="text-xs" />
          </div>
          <div><span className="text-[11px] text-slate-400">Summary</span>
            <RichTextEditor value={draft.description || ''} onChange={v => setDraft({ ...draft, description: v })} placeholder="Summary…" />
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={busy} className="bg-[#0D9488] text-white px-3 py-1.5 rounded-sm text-xs font-medium disabled:opacity-50">Save</button>
            <button onClick={() => setDraft(null)} className="border border-slate-200 px-3 py-1.5 rounded-sm text-xs">Cancel</button>
          </div>
        </div>
      )}
      <div className="space-y-1 max-h-72 overflow-y-auto">
        {items.map(n => (
          <div key={n.id} className="flex items-center gap-2 py-1.5 border-b border-slate-50 last:border-0">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-slate-700 truncate">{n.title}</div>
              <div className="text-[10px] text-slate-400">{(n.published_date || '').slice(0, 10)} · {n.site}</div>
            </div>
            <button onClick={() => setDraft({ ...n })} className="p-1 text-slate-400 hover:text-[#0D9488]"><Edit2 className="w-3.5 h-3.5" /></button>
            <button onClick={() => remove(n.id)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        ))}
        {items.length === 0 && <p className="text-xs text-slate-400 py-2">No news items yet.</p>}
      </div>
    </div>
  );
}
