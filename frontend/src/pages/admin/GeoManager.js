import React, { useState, useEffect, useMemo } from 'react';
import { geoAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Plus, Pencil, Trash2, Loader2, Search, ChevronRight } from 'lucide-react';

const inputCls = "w-full border rounded-sm px-3 py-2 text-sm focus:ring-1 focus:ring-[#0D9488] focus:border-[#0D9488]";
const btnCls = "text-white px-4 py-2 rounded-sm text-sm font-medium flex items-center gap-2";

export default function GeoManager() {
  const [tab, setTab] = useState('countries');
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selCountry, setSelCountry] = useState(null);
  const [selState, setSelState] = useState(null);
  const [editing, setEditing] = useState(null);

  const loadCountries = () => { setLoading(true); geoAPI.getCountries().then(r => { setCountries(r.data || []); setLoading(false); }).catch(() => setLoading(false)); };
  useEffect(loadCountries, []);

  const loadStates = (cid) => { if (!cid) { setStates([]); return; } setLoading(true); geoAPI.getStates(cid).then(r => { setStates(r.data || []); setLoading(false); }).catch(() => setLoading(false)); };
  const loadCities = (sid) => { if (!sid) { setCities([]); return; } setLoading(true); geoAPI.getCities(sid).then(r => { setCities(r.data || []); setLoading(false); }).catch(() => setLoading(false)); };

  const selectCountry = (c) => { setSelCountry(c); setSelState(null); setCities([]); setTab('states'); loadStates(c.id); setSearch(''); };
  const selectState = (s) => { setSelState(s); setTab('cities'); loadCities(s.id); setSearch(''); };

  // CRUD handlers
  const saveItem = async () => {
    if (!editing?.name?.trim()) { toast.error('Name is required'); return; }
    try {
      if (editing._type === 'country') {
        if (editing.id) await geoAPI.adminUpdateCountry(editing.id, { name: editing.name, code: editing.code, alpha3: editing.alpha3 });
        else await geoAPI.adminCreateCountry({ name: editing.name, code: editing.code || '', alpha3: editing.alpha3 || '' });
        loadCountries();
      } else if (editing._type === 'state') {
        if (editing.id) await geoAPI.adminUpdateState(editing.id, { name: editing.name, code: editing.code });
        else await geoAPI.adminCreateState({ name: editing.name, code: editing.code || '', country_id: selCountry.id, country_code: selCountry.code || '' });
        loadStates(selCountry.id);
      } else if (editing._type === 'city') {
        if (editing.id) await geoAPI.adminUpdateCity(editing.id, { name: editing.name });
        else await geoAPI.adminCreateCity({ name: editing.name, state_id: selState.id, country_id: selCountry.id, country_code: selCountry.code || '' });
        loadCities(selState.id);
      }
      setEditing(null);
      toast.success(editing.id ? 'Updated' : 'Created');
    } catch (e) { toast.error('Save failed'); }
  };

  const deleteItem = async (type, item) => {
    const warn = type === 'country' ? 'This will also delete all associated states and cities.' : type === 'state' ? 'This will also delete all associated cities.' : '';
    if (!window.confirm(`Delete "${item.name}"? ${warn}`)) return;
    try {
      if (type === 'country') { await geoAPI.adminDeleteCountry(item.id); loadCountries(); setSelCountry(null); setStates([]); setCities([]); setTab('countries'); }
      else if (type === 'state') { await geoAPI.adminDeleteState(item.id); loadStates(selCountry.id); setSelState(null); setCities([]); }
      else { await geoAPI.adminDeleteCity(item.id); loadCities(selState.id); }
      toast.success('Deleted');
    } catch { toast.error('Delete failed'); }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (tab === 'countries') return countries.filter(c => c.name.toLowerCase().includes(q));
    if (tab === 'states') return states.filter(s => s.name.toLowerCase().includes(q));
    return cities.filter(c => c.name.toLowerCase().includes(q));
  }, [tab, countries, states, cities, search]);

  const breadcrumb = () => (
    <div className="flex items-center gap-1 text-sm mb-4 flex-wrap" style={{ color: 'var(--ad-text-secondary, #64748b)' }}>
      <button onClick={() => { setTab('countries'); setSelCountry(null); setSelState(null); setSearch(''); }} className="hover:underline font-medium" style={{ color: 'var(--ad-accent, #0D9488)' }}>Countries</button>
      {selCountry && (<><ChevronRight className="w-4 h-4" /><button onClick={() => { setTab('states'); setSelState(null); setSearch(''); }} className="hover:underline font-medium" style={{ color: 'var(--ad-accent, #0D9488)' }}>{selCountry.name}</button></>)}
      {selState && (<><ChevronRight className="w-4 h-4" /><span className="font-medium">{selState.name}</span></>)}
    </div>
  );

  // Edit modal inline
  if (editing) {
    return (
      <div data-testid="geo-editor">
        <h1 className="text-xl font-bold mb-4" style={{ color: 'var(--ad-heading, #1a2332)', fontFamily: 'Playfair Display, serif' }}>{editing.id ? 'Edit' : 'Add'} {editing._type === 'country' ? 'Country' : editing._type === 'state' ? 'State' : 'City'}</h1>
        <div className="bg-white rounded border p-6 max-w-lg space-y-4" style={{ borderColor: 'var(--ad-card-border, #e2e8f0)' }}>
          <div><Label className="text-xs text-slate-500">Name*</Label><Input value={editing.name || ''} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} data-testid="geo-name" /></div>
          {editing._type !== 'city' && <div><Label className="text-xs text-slate-500">Code</Label><Input value={editing.code || ''} onChange={e => setEditing(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="e.g. US" maxLength={editing._type === 'country' ? 2 : 10} data-testid="geo-code" /></div>}
          {editing._type === 'country' && <div><Label className="text-xs text-slate-500">Alpha-3 Code</Label><Input value={editing.alpha3 || ''} onChange={e => setEditing(p => ({ ...p, alpha3: e.target.value.toUpperCase() }))} placeholder="e.g. USA" maxLength={3} data-testid="geo-alpha3" /></div>}
          <div className="flex gap-3 pt-2">
            <button onClick={saveItem} className={btnCls} style={{ backgroundColor: 'var(--ad-button-bg, #0D9488)' }} data-testid="geo-save">Save</button>
            <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-sm text-sm border border-slate-300 text-slate-600 hover:bg-slate-50">Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  const currentType = tab === 'countries' ? 'country' : tab === 'states' ? 'state' : 'city';

  return (
    <div data-testid="geo-manager">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold" style={{ color: 'var(--ad-heading, #1a2332)', fontFamily: 'Playfair Display, serif' }}>
          {tab === 'countries' ? 'Countries' : tab === 'states' ? `States / Subdivisions` : 'Cities'}
        </h1>
        <button onClick={() => setEditing({ _type: currentType, name: '', code: '', alpha3: '' })} className={btnCls} style={{ backgroundColor: 'var(--ad-button-bg, #0D9488)' }} data-testid="geo-add-btn">
          <Plus className="w-4 h-4" /> Add {currentType === 'country' ? 'Country' : currentType === 'state' ? 'State' : 'City'}
        </button>
      </div>

      {breadcrumb()}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${tab}...`} className="pl-9" data-testid="geo-search" />
      </div>

      <div className="bg-white rounded border" style={{ borderColor: 'var(--ad-card-border, #e2e8f0)' }}>
        <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--ad-card-border, #e2e8f0)', backgroundColor: 'var(--ad-table-header-bg, #f8fafc)' }}>
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ad-text-secondary, #64748b)' }}>Name</span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--ad-badge-bg, #0D9488)', color: 'var(--ad-badge-text, #fff)' }}>{filtered.length} {tab}</span>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto">
            {filtered.map(item => (
              <div key={item.id} className="flex items-center gap-3 px-5 py-2.5 border-b last:border-0 hover:bg-slate-50 transition-colors" style={{ borderColor: 'var(--ad-table-border, #e2e8f0)' }} data-testid={`geo-row-${item.id}`}>
                <div className="flex-1 min-w-0">
                  {tab === 'countries' ? (
                    <button onClick={() => selectCountry(item)} className="text-sm font-medium hover:underline text-left" style={{ color: 'var(--ad-accent, #0D9488)' }}>{item.name}</button>
                  ) : tab === 'states' ? (
                    <button onClick={() => selectState(item)} className="text-sm font-medium hover:underline text-left" style={{ color: 'var(--ad-accent, #0D9488)' }}>{item.name}</button>
                  ) : (
                    <span className="text-sm" style={{ color: 'var(--ad-heading, #1a2332)' }}>{item.name}</span>
                  )}
                  {item.code && <span className="text-xs text-slate-400 ml-2">({item.code})</span>}
                </div>
                <div className="flex items-center gap-1.5">
                  {(tab === 'countries' || tab === 'states') && <button onClick={() => tab === 'countries' ? selectCountry(item) : selectState(item)} className="p-1.5 rounded hover:bg-slate-100 text-slate-400" title="View sub-items"><ChevronRight className="w-4 h-4" /></button>}
                  <button onClick={() => setEditing({ ...item, _type: currentType })} className="p-1.5 rounded hover:bg-slate-100 text-slate-500"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => deleteItem(currentType, item)} className="p-1.5 rounded hover:bg-red-50 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <p className="px-5 py-8 text-center text-sm text-slate-400">No {tab} found.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
