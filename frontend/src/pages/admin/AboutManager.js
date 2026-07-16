import React, { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../lib/api';
import { useSettings } from '../../App';
import { toast } from 'sonner';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Save, Loader2 } from 'lucide-react';

import ImageUpload from '../../components/ImageUpload';
import LocalizedField from '../../components/admin/LocalizedField';
import RichTextEditor from '../../components/RichTextEditor';

// Personal Brand mini-site tabs — mirrors the PB_PERSONALITIES pattern
// from SectionOrderManager.js and the CATEGORY_META pattern from PagesManager.
const PB_TABS = [
  { key: null,         label: 'Global',         hint: 'Used by all non-PB themes',       cls: 'border-sky-400     text-sky-700'      },
  { key: 'business',   label: 'PB — Business',   hint: 'Personal Brand Business mini-site', cls: 'border-slate-400   text-slate-700'    },
  { key: 'lifestyle',  label: 'PB — Lifestyle',  hint: 'Personal Brand Lifestyle mini-site', cls: 'border-emerald-400 text-emerald-700'  },
  { key: 'personal',   label: 'PB — Personal',   hint: 'Personal Brand Personal mini-site',  cls: 'border-violet-400  text-violet-700'   },
];

const EMPTY = {
  label: '', title: '', description: '', phone: '',
  signature_name: '', signature_title: '', image: '',
  button_text: '', button_url: '', button_open_in_new_tab: false,
};

export default function AboutManager() {
  const settings = useSettings();
  const isPB = settings.active_theme === 'personalbrand';

  // Active personality tab. null = Global, 'business'|'lifestyle'|'personal' = PB
  const [activeTab, setActiveTab] = useState(null);
  // Track which tabs already have saved data (for the "not yet configured" badge)
  const [savedTabs, setSavedTabs] = useState(new Set());
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadTab = useCallback(async (personality) => {
    setLoading(true);
    try {
      const r = await adminAPI.getAbout(personality);
      const doc = r.data || {};
      setData({ ...EMPTY, ...doc });
      // Mark tab as having data if at least the title is set
      if (doc.title) {
        setSavedTabs(prev => new Set([...prev, personality ?? '__global__']));
      }
    } catch (err) {
      toast.error('Failed to load About data');
      setData(EMPTY);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount and on tab switch
  useEffect(() => { loadTab(activeTab); }, [activeTab, loadTab]);

  // Pre-check all PB tabs so we can show "not yet configured" badges
  useEffect(() => {
    if (!isPB) return;
    const checkAll = async () => {
      for (const t of PB_TABS) {
        try {
          const r = await adminAPI.getAbout(t.key);
          if (r.data?.title) {
            setSavedTabs(prev => new Set([...prev, t.key ?? '__global__']));
          }
        } catch {}
      }
    };
    checkAll();
  }, [isPB]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminAPI.updateAbout(data, activeTab);
      toast.success(
        activeTab
          ? `Saved — Personal Brand ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`
          : 'Global About saved'
      );
      setSavedTabs(prev => new Set([...prev, activeTab ?? '__global__']));
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const tabsToShow = isPB ? PB_TABS : PB_TABS.slice(0, 1); // non-PB: only Global tab (no strip shown)

  return (
    <div data-testid="about-manager">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1a2332]" style={{ fontFamily: 'Playfair Display, serif' }}>
          About Us Manager
        </h1>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="bg-[#0D9488] text-white px-4 py-2 rounded-sm text-sm font-medium flex items-center gap-2 disabled:opacity-50"
          data-testid="about-save-btn"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
        </button>
      </div>

      {/* Personality tab strip — only visible when Personal Brand theme is active */}
      {isPB && (
        <div className="mb-5 border border-slate-200 rounded-sm bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            About Us scope
          </p>
          <p className="text-xs text-slate-400 mb-3">
            Each Personal Brand mini-site can have its own independent About Us content.
            <span className="ml-1 font-medium text-slate-600">Global</span> is used by all other themes.
          </p>
          <div className="flex flex-wrap gap-2" role="tablist">
            {tabsToShow.map(tab => {
              const isActive = activeTab === tab.key;
              const hasSaved = savedTabs.has(tab.key ?? '__global__');
              return (
                <button
                  key={tab.key ?? '__global__'}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 rounded-sm text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? `bg-white shadow-sm border-2 ${tab.cls}`
                      : 'text-slate-400 border-transparent hover:text-slate-600 hover:bg-white/60 border-2'
                  }`}
                  data-testid={`about-tab-${tab.key ?? 'global'}`}
                >
                  {tab.label}
                  {!hasSaved && tab.key !== null && (
                    <span className="ml-1.5 text-[10px] font-normal text-amber-500">● not configured</span>
                  )}
                  {hasSaved && tab.key !== null && (
                    <span className="ml-1.5 text-[10px] font-normal text-emerald-500">● configured</span>
                  )}
                </button>
              );
            })}
          </div>
          {activeTab && (
            <p className="text-[11px] text-slate-400 mt-2">
              {tabsToShow.find(t => t.key === activeTab)?.hint}
              {' — '}content shown exclusively on the <strong>{activeTab}</strong> mini-site homepage.
              Falls back to Global if left unconfigured.
            </p>
          )}
          {!activeTab && (
            <p className="text-[11px] text-slate-400 mt-2">
              Global content — used by all non-PB themes and as a fallback for any PB mini-site not yet configured.
            </p>
          )}
        </div>
      )}

      {/* Form */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 text-[#0D9488] animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-sm border border-slate-100 p-6 space-y-4">
          <div>
            <Label>Label (eyebrow)</Label>
            <LocalizedField value={data.label} onChange={v => setData({ ...data, label: v })} render={({ value, onChange }) => (
              <Input value={value || ''} onChange={e => onChange(e.target.value)} className="mt-1" placeholder="e.g. About me" />
            )} />
          </div>
          <div>
            <Label>Title</Label>
            <LocalizedField value={data.title} onChange={v => setData({ ...data, title: v })} render={({ value, onChange }) => (
              <Input value={value || ''} onChange={e => onChange(e.target.value)} className="mt-1" />
            )} />
          </div>
          <div>
            <Label>Description</Label>
            <p className="text-xs text-slate-400 mb-1">Rich text — rendered formatted on the website.</p>
            <LocalizedField value={data.description} onChange={v => setData({ ...data, description: v })} render={({ value, onChange }) => (
              <RichTextEditor value={value || ''} onChange={onChange} />
            )} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Phone</Label>
              <Input value={data.phone || ''} onChange={e => setData({ ...data, phone: e.target.value })} className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Image</Label>
            <ImageUpload value={data.image} onChange={v => setData({ ...data, image: v })} className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Signature Name</Label>
              <LocalizedField value={data.signature_name} onChange={v => setData({ ...data, signature_name: v })} render={({ value, onChange }) => (
                <Input value={value || ''} onChange={e => onChange(e.target.value)} className="mt-1" />
              )} />
            </div>
            <div>
              <Label>Signature Title</Label>
              <LocalizedField value={data.signature_title} onChange={v => setData({ ...data, signature_title: v })} render={({ value, onChange }) => (
                <Input value={value || ''} onChange={e => onChange(e.target.value)} className="mt-1" />
              )} />
            </div>
          </div>

          {/* Call-to-action Button */}
          <div className="pt-4 border-t border-slate-100">
            <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">
              Call-to-action Button (optional)
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Button Text</Label>
                <LocalizedField value={data.button_text} onChange={v => setData({ ...data, button_text: v })} render={({ value, onChange }) => (
                  <Input value={value || ''} onChange={e => onChange(e.target.value)} placeholder="e.g. Read About Us" className="mt-1" data-testid="about-btn-text" />
                )} />
              </div>
              <div>
                <Label>Button URL (or anchor #id)</Label>
                <Input
                  value={data.button_url || ''}
                  onChange={e => setData({ ...data, button_url: e.target.value })}
                  placeholder="/about  or  #contact  or  https://…"
                  className="mt-1"
                  data-testid="about-btn-url"
                />
              </div>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={!!data.button_open_in_new_tab}
                onChange={e => setData({ ...data, button_open_in_new_tab: e.target.checked })}
                className="w-4 h-4 accent-[#0D9488]"
                data-testid="about-btn-new-tab"
              />
              Open in new window / tab
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
