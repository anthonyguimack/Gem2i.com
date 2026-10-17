import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Save, Plus, Trash2, FileText, ChevronUp, ChevronDown } from 'lucide-react';
import api from '../../lib/api';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import LocalizedField from '../../components/admin/LocalizedField';
import ImageUpload from '../../components/ImageUpload';

/**
 * GEM2i Site Content — the copy + photos of the gem2i home sections that are
 * not Section-Manager sections: Intro (I-2), Featured (F-1), Services (S-2)
 * and the services contact banner. Saved to gem_config {key:'content'}; every
 * other key in that doc (methodology, media, festivals, …) is preserved as is.
 */
const L = (label, value, onChange, multi = false) => (
  <div>
    <Label>{label}</Label>
    <div className="mt-1">
      <LocalizedField value={value} onChange={onChange} render={({ value: v, onChange: oc }) => (
        multi
          ? <Textarea rows={5} value={v || ''} onChange={e => oc(e.target.value)} />
          : <Input value={v || ''} onChange={e => oc(e.target.value)} />
      )} />
    </div>
  </div>
);

const Card = ({ title, hint, children }) => (
  <section className="bg-white border border-slate-200 rounded-sm p-5 space-y-4">
    <div><h2 className="text-base font-semibold text-[#1a2332]">{title}</h2>{hint && <p className="text-xs text-slate-500 mt-0.5">{hint}</p>}</div>
    {children}
  </section>
);

export default function GemContentManager() {
  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/admin/gem/gem-content').then(r => setData(r.data || {})).catch(() => toast.error('Failed to load content'));
  }, []);

  const save = async () => {
    setSaving(true);
    try { await api.put('/admin/gem/gem-content', { data }); toast.success('Site content saved'); }
    catch { toast.error('Save failed'); }
    setSaving(false);
  };

  if (!data) return <div className="p-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;

  const intro = data.intro || {};
  const setIntro = (k, v) => setData({ ...data, intro: { ...intro, [k]: v } });
  const featured = Array.isArray(data.featured) ? data.featured : [];
  const setFeat = (i, k, v) => setData({ ...data, featured: featured.map((f, j) => (j === i ? { ...f, [k]: v } : f)) });
  const services = data.services || {};
  const items = (services.items || []).map(it => (it && typeof it === 'object' && (it.title || it.text || it.icon) ? it : { title: it }));
  const setServices = (k, v) => setData({ ...data, services: { ...services, [k]: v } });
  const setItem = (i, k, v) => setServices('items', items.map((it, j) => (j === i ? { ...it, [k]: v } : it)));
  const moveItem = (i, d) => {
    const n = [...items]; const t = i + d;
    if (t < 0 || t >= n.length) return;
    [n[i], n[t]] = [n[t], n[i]]; setServices('items', n);
  };
  const banner = data.services_banner || {};

  return (
    <div className="max-w-4xl space-y-6" data-testid="gem-content-manager">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#1a2332] flex items-center gap-2"><FileText className="w-6 h-6 text-[#0D9488]" />Site Content</h1>
          <p className="text-sm text-slate-500 mt-1">Copy and photos of the home sections Intro, Featured and Services (shared by the three gem2i templates). Order and visibility: Page Builder.</p>
        </div>
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 bg-[#0D9488] text-white text-sm font-medium rounded-sm disabled:opacity-50" data-testid="gem-content-save">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Save
        </button>
      </div>

      <Card title="Intro — Global Entertainment Management & Marketing Integration" hint="Photo on the left with the round “Since” badge; text and two buttons on the right.">
        <div className="grid md:grid-cols-[260px_1fr] gap-5">
          <div><Label>Photo</Label><ImageUpload value={intro.image || ''} onChange={v => setIntro('image', v)} className="mt-1" adjust adjustRatio={4 / 3.4} /></div>
          <div className="space-y-4">
            {L('Eyebrow (above title)', intro.kicker, v => setIntro('kicker', v))}
            {L('Title', intro.heading, v => setIntro('heading', v))}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Badge year (“Since …”)</Label><Input className="mt-1" value={intro.since || ''} placeholder="1993" onChange={e => setIntro('since', e.target.value.replace(/[^0-9]/g, '').slice(0, 4))} /></div>
              <div><Label>Main button URL</Label><Input className="mt-1" value={intro.cta_url || ''} placeholder="/membership-enrollment" onChange={e => setIntro('cta_url', e.target.value)} /></div>
            </div>
            {L('Main button text', intro.cta_text, v => setIntro('cta_text', v))}
          </div>
        </div>
        {L('Text', intro.text, v => setIntro('text', v), true)}
      </Card>

      <Card title="Featured — Venues · Events · Artists" hint="Three tall photo cards; each links to its catalog.">
        {featured.map((f, i) => (
          <div key={i} className="grid md:grid-cols-[200px_1fr] gap-5 pt-4 first:pt-0 border-t first:border-t-0 border-slate-100">
            <div><Label>Photo</Label><ImageUpload value={f.image || ''} onChange={v => setFeat(i, 'image', v)} className="mt-1" adjust adjustRatio={3 / 4} /></div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {L('Title', f.title, v => setFeat(i, 'title', v))}
                <div><Label>Link</Label><Input className="mt-1" value={f.url || ''} onChange={e => setFeat(i, 'url', e.target.value)} /></div>
              </div>
              {L('Text', f.text, v => setFeat(i, 'text', v), true)}
            </div>
          </div>
        ))}
      </Card>

      <Card title="Services" hint="Cards with icon (S-2). The blue contact card uses the banner text below. Icons: lucide names, e.g. target, megaphone, gem, mic-2, handshake.">
        <div className="grid md:grid-cols-3 gap-3">
          {L('Eyebrow word 1', services.kicker, v => setServices('kicker', v))}
          {L('Eyebrow word 2', services.title, v => setServices('title', v))}
          {L('Title', services.subtitle, v => setServices('subtitle', v))}
        </div>
        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className="border border-slate-100 rounded-sm p-3 grid md:grid-cols-[1fr_1fr_140px_auto] gap-3 items-end">
              {L(`Service ${i + 1}`, it.title, v => setItem(i, 'title', v))}
              {L('Short description', it.text, v => setItem(i, 'text', v))}
              <div><Label>Icon</Label><Input className="mt-1" value={it.icon || ''} placeholder="auto" onChange={e => setItem(i, 'icon', e.target.value.trim())} /></div>
              <div className="flex gap-1 pb-0.5">
                <button onClick={() => moveItem(i, -1)} className="p-2 text-slate-400 hover:text-slate-700" aria-label="Move up"><ChevronUp className="w-4 h-4" /></button>
                <button onClick={() => moveItem(i, 1)} className="p-2 text-slate-400 hover:text-slate-700" aria-label="Move down"><ChevronDown className="w-4 h-4" /></button>
                <button onClick={() => setServices('items', items.filter((_, j) => j !== i))} className="p-2 text-slate-400 hover:text-red-500" aria-label="Remove"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
          <button onClick={() => setServices('items', [...items, { title: { en: '', es: '' } }])} className="inline-flex items-center gap-1.5 text-sm text-[#0D9488]"><Plus className="w-4 h-4" />Add service</button>
        </div>
        {L('Contact card / banner text', banner.text, v => setData({ ...data, services_banner: { ...banner, text: v } }))}
      </Card>
    </div>
  );
}
