import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Save, Loader2, Plus, Globe } from 'lucide-react';

const defaultPages = [
  { path: '/', label: 'Homepage' },
  { path: '/news', label: 'News Page' },
  { path: '/gallery', label: 'Gallery Page' },
  { path: '/reading-list', label: 'Reading List' },
  { path: '/terms', label: 'Terms of Service' },
  { path: '/privacy', label: 'Privacy Policy' },
];

export default function SeoManager() {
  const [seoEntries, setSeoEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    adminAPI.getSeo().then(r => {
      const existing = r.data || [];
      const merged = defaultPages.map(dp => {
        const found = existing.find(e => e.page_path === dp.path);
        return found || { page_path: dp.path, meta_title: '', meta_description: '', og_image: '' };
      });
      // Add any custom pages not in defaults
      existing.forEach(e => {
        if (!merged.find(m => m.page_path === e.page_path)) merged.push(e);
      });
      setSeoEntries(merged);
    }).catch(console.error);
  }, []);

  const updateEntry = (index, field, value) => {
    setSeoEntries(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const saveAll = async () => {
    setLoading(true);
    try {
      for (const entry of seoEntries) {
        if (entry.meta_title || entry.meta_description || entry.og_image) {
          await adminAPI.updateSeo(entry.page_path, entry);
        }
      }
      toast.success('SEO settings saved!');
    } catch { toast.error('Error saving SEO'); }
    finally { setLoading(false); }
  };

  const getPageLabel = (path) => {
    const found = defaultPages.find(p => p.path === path);
    return found ? found.label : path;
  };

  return (
    <div data-testid="seo-manager">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1a2332]" style={{ fontFamily: 'Playfair Display, serif' }}>SEO Manager</h1>
        <button onClick={saveAll} disabled={loading} className="bg-[#0D9488] text-white px-4 py-2 rounded-sm text-sm font-medium flex items-center gap-2 disabled:opacity-50" data-testid="seo-save-btn">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save All
        </button>
      </div>

      <div className="space-y-4">
        {seoEntries.map((entry, idx) => (
          <div key={entry.page_path} className="bg-white rounded-sm border border-slate-100 p-5" data-testid={`seo-entry-${idx}`}>
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-4 h-4 text-[#0D9488]" />
              <h3 className="text-sm font-semibold text-[#1a2332]">{getPageLabel(entry.page_path)}</h3>
              <span className="text-xs text-slate-400 font-mono">{entry.page_path}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Meta Title</Label>
                <Input value={entry.meta_title || ''} onChange={e => updateEntry(idx, 'meta_title', e.target.value)} className="mt-1" placeholder="Page title for search engines" />
              </div>
              <div>
                <Label className="text-xs">OG Image URL</Label>
                <Input value={entry.og_image || ''} onChange={e => updateEntry(idx, 'og_image', e.target.value)} className="mt-1" placeholder="Social sharing image URL" />
              </div>
            </div>
            <div className="mt-3">
              <Label className="text-xs">Meta Description</Label>
              <textarea value={entry.meta_description || ''} onChange={e => updateEntry(idx, 'meta_description', e.target.value)} rows={2} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-sm mt-1" placeholder="Page description for search engines (150-160 characters)" />
              {entry.meta_description && <p className="text-xs text-slate-400 mt-1">{entry.meta_description.length}/160 characters</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
