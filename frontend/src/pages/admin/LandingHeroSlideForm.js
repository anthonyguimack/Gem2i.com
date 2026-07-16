import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminAPI, publicAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Save, Loader2, ArrowLeft, Eye, EyeOff, ArrowRight, Plus, Trash2 } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Checkbox } from '../../components/ui/checkbox';
import RichTextEditor from '../../components/RichTextEditor';
import ImageUpload from '../../components/ImageUpload';
import HeroCanvasEditor from '../../components/HeroCanvasEditor';

const effectOptions = ['top', 'right', 'bottom', 'left'];
const API_URL = process.env.REACT_APP_BACKEND_URL;
const resolveSrc = (v) => v ? (v.startsWith('/api') ? `${API_URL}${v}` : v) : null;

function resolveVideoUrl(url) {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?\s]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  if (url.startsWith('<iframe')) { const m = url.match(/src=["']([^"']+)["']/); if (m) return m[1]; }
  return url;
}

function HeroSlidePreview({ form }) {
  const bg = resolveSrc(form.background);
  const photoSrc = resolveSrc(form.photo);
  const videoEmbedUrl = resolveVideoUrl(form.video_embed);
  const hasContent = form.title || form.subtitle || form.description || (form.buttons?.length > 0) ||
    (form.slide_type === 'photo' && form.photo) || (form.slide_type === 'video' && form.video_embed);

  if (!hasContent) return (
    <div className="bg-[#0f172a] rounded-lg flex items-center justify-center text-white/50 text-sm italic" style={{ aspectRatio: '16/7' }}>
      Start editing the form below to see a live preview
    </div>
  );

  return (
    <div className="relative rounded-lg overflow-hidden" style={{ aspectRatio: '16/7' }} data-testid="hero-live-preview">
      {bg ? <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${bg})` }} /> : <div className="absolute inset-0 bg-[#0f172a]" />}
      {form.background_overlay !== false && <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(26,35,50,0.93), rgba(26,35,50,0.6))' }} />}
      <div className="relative w-full h-full">
        {form.title && (
          <div className="absolute max-w-[55%] px-1" style={{ left: `${(form.title_x || 100) / 7}%`, top: `${(form.title_y || 50) / 3}%` }}>
            <div className="text-lg md:text-xl xl:text-2xl font-bold leading-tight [&_em]:italic [&_p]:m-0" style={{ fontFamily: 'Playfair Display, serif', color: 'white' }} dangerouslySetInnerHTML={{ __html: form.title }} />
          </div>
        )}
        {form.subtitle && (
          <div className="absolute max-w-[55%] px-1" style={{ left: `${(form.subtitle_x || 100) / 7}%`, top: `${(form.subtitle_y || 80) / 3}%` }}>
            <div className="text-xs md:text-sm font-semibold [&_em]:italic [&_p]:m-0" style={{ fontFamily: 'Playfair Display, serif', color: 'white' }} dangerouslySetInnerHTML={{ __html: form.subtitle }} />
          </div>
        )}
        {form.description && (
          <div className="absolute max-w-[45%] px-1" style={{ left: `${(form.description_x || 100) / 7}%`, top: `${(form.description_y || 120) / 3}%` }}>
            <div className="text-[10px] md:text-xs leading-relaxed [&_p]:m-0" style={{ color: 'rgba(255,255,255,0.7)' }} dangerouslySetInnerHTML={{ __html: form.description }} />
          </div>
        )}
        {form.buttons?.length > 0 && (
          <div className="absolute px-1 flex gap-2" style={{ left: `${(form.button_x || 100) / 7}%`, top: `${(form.button_y || 180) / 3}%` }}>
            {form.buttons.map((b, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-3 py-1 md:px-4 md:py-1.5 rounded-sm font-medium text-[10px] md:text-xs" style={b.style === 'filled' ? { backgroundColor: '#c9a84c', color: '#0a0a12' } : { border: '1px solid white', color: 'white' }}>
                {b.text} <ArrowRight className="w-2.5 h-2.5" />
              </span>
            ))}
          </div>
        )}
        {form.slide_type === 'video' && videoEmbedUrl && (
          <div className="absolute" style={{ left: `${(form.media_x || 400) / 7}%`, top: `${(form.media_y || 50) / 3}%`, width: form.media_width ? `${Math.min(form.media_width * 0.45, 280)}px` : '200px' }}>
            <div className="rounded-md overflow-hidden shadow-2xl aspect-video border border-white/10">
              <iframe src={videoEmbedUrl} className="w-full h-full" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="Preview" />
            </div>
          </div>
        )}
        {form.slide_type === 'photo' && photoSrc && (
          <div className="absolute" style={{ left: `${(form.media_x || 400) / 7}%`, top: `${(form.media_y || 50) / 3}%`, width: form.media_width ? `${Math.min(form.media_width * 0.45, 280)}px` : '200px' }}>
            <img src={photoSrc} alt="" className="rounded-md shadow-2xl w-full object-cover" style={form.media_height ? { maxHeight: `${Math.min(form.media_height * 0.45, 200)}px` } : { maxHeight: '180px' }} />
          </div>
        )}
      </div>
    </div>
  );
}

const defaultSlide = {
  date_start: '', date_end: '',
  title: '', subtitle: '', description: '',
  buttons: [],
  slide_type: 'photo', video_embed: '', photo: '',
  background: '', background_overlay: true, show_countdown: true,
  title_effect: 'top', subtitle_effect: 'right', description_effect: 'bottom',
  button_effect: 'left', media_effect: 'right',
  title_x: 100, title_y: 50,
  subtitle_x: 100, subtitle_y: 80,
  description_x: 100, description_y: 120,
  button_x: 100, button_y: 180,
  media_x: 400, media_y: 50,
  transition: 'fade', slot_amount: 8, master_speed: 700,
  delay: 9400, speed_per_layer: 400,
  title_start: 1500, subtitle_start: 2000, description_start: 2500,
  button_start: 3000, media_start: 1000,
  assigned_pages: [],
  media_width: 0, media_height: 0,
};

const defaultButton = { text: '', url: '', window_open: 'same', style: 'outline' };

const quillCls = "[&_.ql-toolbar]:!bg-slate-50 [&_.ql-toolbar]:!border-slate-200 [&_.ql-container]:!border-slate-200 [&_.ql-editor]:!min-h-[80px]";

export default function LandingHeroSlideForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [form, setForm] = useState({ ...defaultSlide });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sitePages, setSitePages] = useState([]);
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => { publicAPI.getSitePages().then(r => setSitePages(r.data || [])).catch(() => {}); }, []);

  useEffect(() => {
    if (isEdit) {
      setLoading(true);
      adminAPI.getLandingHeroSlide(id).then(r => {
        const data = { ...defaultSlide, ...r.data };
        if (!Array.isArray(data.buttons)) data.buttons = [];
        setForm(data);
      }).catch(() => { toast.error('Slide not found'); navigate('/admin/landing-hero'); })
        .finally(() => setLoading(false));
    }
  }, [id]); // eslint-disable-line

  const set = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));
  const setNum = (field) => (e) => setForm(p => ({ ...p, [field]: parseInt(e.target.value) || 0 }));

  const handleCanvasChange = useCallback((layerId, x, y) => {
    setForm(p => ({ ...p, [`${layerId}_x`]: x, [`${layerId}_y`]: y }));
  }, []);

  // Buttons CRUD
  const addButton = () => setForm(p => ({ ...p, buttons: [...(p.buttons || []), { ...defaultButton }] }));
  const updateButton = (idx, field, val) => setForm(p => {
    const btns = [...(p.buttons || [])];
    btns[idx] = { ...btns[idx], [field]: val };
    return { ...p, buttons: btns };
  });
  const removeButton = (idx) => setForm(p => ({ ...p, buttons: (p.buttons || []).filter((_, i) => i !== idx) }));

  const handleSave = async () => {
    if (!form.title.trim() && !form.subtitle.trim()) { toast.error('Title or Subtitle is required'); return; }
    setSaving(true);
    try {
      if (isEdit) { await adminAPI.updateLandingHeroSlide(id, form); toast.success('Slide updated!'); }
      else { await adminAPI.createLandingHeroSlide(form); toast.success('Slide created!'); }
      navigate('/admin/landing-hero');
    } catch (e) { toast.error(e.response?.data?.detail || 'Error saving'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-[#0D9488] animate-spin" /></div>;

  const sectionCls = "bg-white border border-slate-100 rounded-sm p-5 mb-5";
  const sectionTitle = "text-sm font-semibold text-[#1a2332] mb-4 pb-2 border-b border-slate-100";
  const selectCls = "w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#0D9488]/50";

  const canvasCoords = {
    title_x: form.title_x, title_y: form.title_y,
    subtitle_x: form.subtitle_x, subtitle_y: form.subtitle_y,
    description_x: form.description_x, description_y: form.description_y,
    button_x: form.button_x, button_y: form.button_y,
    media_x: form.media_x, media_y: form.media_y,
  };

  return (
    <div data-testid="landing-hero-slide-form">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin/landing-hero')} className="text-slate-400 hover:text-[#1a2332]"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-2xl font-bold text-[#1a2332]" style={{ fontFamily: 'Playfair Display, serif' }}>{isEdit ? 'Edit' : 'Add'} Landing Hero Slide</h1>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="bg-[#0D9488] text-white px-5 py-2 rounded-sm text-sm font-medium hover:bg-[#0D9488]/80 flex items-center gap-2 disabled:opacity-50"
          data-testid="save-lp-slide-btn">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {isEdit ? 'Update' : 'Create'} Slide
        </button>
      </div>

      {/* Timer */}
      <div className={sectionCls}>
        <h2 className={sectionTitle}>Timer</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div><Label className="text-xs text-slate-500">Date Start</Label><input type="datetime-local" value={form.date_start} onChange={set('date_start')} className={`mt-1 ${selectCls}`} data-testid="lp-slide-date-start" /></div>
          <div><Label className="text-xs text-slate-500">Date End</Label><input type="datetime-local" value={form.date_end} onChange={set('date_end')} className={`mt-1 ${selectCls}`} data-testid="lp-slide-date-end" /></div>
        </div>
        <div>
          <Label className="text-xs text-slate-500 mb-2 block">Show Countdown Timer</Label>
          <p className="text-xs text-slate-400 mb-2">Display the countdown timer on this slide. Disable to create slides without a timer (e.g. decorative or link-only slides).</p>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="show_countdown" checked={form.show_countdown !== false} onChange={() => setForm(p => ({...p, show_countdown: true}))} className="accent-[#0D9488]" data-testid="lp-countdown-yes" />
              <span className="text-sm text-slate-600">Yes</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="show_countdown" checked={form.show_countdown === false} onChange={() => setForm(p => ({...p, show_countdown: false}))} className="accent-[#0D9488]" data-testid="lp-countdown-no" />
              <span className="text-sm text-slate-600">No</span>
            </label>
          </div>
        </div>
      </div>

      {/* Text Content */}
      <div className={sectionCls}>
        <h2 className={sectionTitle}>Text Content</h2>
        <div className="space-y-4">
          <div><Label className="text-xs text-slate-500 mb-2 block">Title</Label><div className={quillCls}><RichTextEditor value={form.title} onChange={v => setForm(p => ({...p, title: v}))} placeholder="Slide title..." /></div></div>
          <div><Label className="text-xs text-slate-500 mb-2 block">Subtitle</Label><div className={quillCls}><RichTextEditor value={form.subtitle} onChange={v => setForm(p => ({...p, subtitle: v}))} placeholder="Slide subtitle..." /></div></div>
          <div><Label className="text-xs text-slate-500 mb-2 block">Description</Label><div className={quillCls}><RichTextEditor value={form.description} onChange={v => setForm(p => ({...p, description: v}))} placeholder="Slide description..." /></div></div>
        </div>
      </div>

      {/* Buttons (Multiple) */}
      <div className={sectionCls}>
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-[#1a2332]">Buttons</h2>
          <button onClick={addButton} className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-sm border border-slate-200 hover:bg-slate-50" data-testid="add-lp-btn">
            <Plus className="w-3 h-3" /> Add Button
          </button>
        </div>
        {(form.buttons || []).length === 0 && <p className="text-xs text-slate-400">No buttons yet. Click "Add Button" to create one.</p>}
        <div className="space-y-3">
          {(form.buttons || []).map((btn, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-sm border border-slate-100" data-testid={`lp-btn-row-${idx}`}>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                <div><Label className="text-xs text-slate-500">Text</Label><Input value={btn.text} onChange={e => updateButton(idx, 'text', e.target.value)} className="mt-1" placeholder="Learn More" data-testid={`lp-btn-text-${idx}`} /></div>
                <div><Label className="text-xs text-slate-500">URL</Label><Input value={btn.url} onChange={e => updateButton(idx, 'url', e.target.value)} className="mt-1" placeholder="https://..." data-testid={`lp-btn-url-${idx}`} /></div>
                <div>
                  <Label className="text-xs text-slate-500">Window</Label>
                  <select value={btn.window_open} onChange={e => updateButton(idx, 'window_open', e.target.value)} className={`mt-1 ${selectCls}`} data-testid={`lp-btn-window-${idx}`}>
                    <option value="same">Same window</option>
                    <option value="new">New window</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Style</Label>
                  <select value={btn.style || 'outline'} onChange={e => updateButton(idx, 'style', e.target.value)} className={`mt-1 ${selectCls}`} data-testid={`lp-btn-style-${idx}`}>
                    <option value="outline">Outline</option>
                    <option value="filled">Filled</option>
                  </select>
                </div>
              </div>
              <button onClick={() => removeButton(idx)} className="mt-6 p-1.5 text-slate-400 hover:text-red-500" data-testid={`remove-lp-btn-${idx}`}><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Slide Type */}
      <div className={sectionCls}>
        <h2 className={sectionTitle}>Slide Type</h2>
        <div className="flex gap-6 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="lp_slide_type" value="photo" checked={form.slide_type === 'photo'} onChange={() => setForm(p => ({...p, slide_type: 'photo'}))} className="accent-[#0D9488]" data-testid="lp-slide-type-photo" />
            <span className="text-sm text-slate-600">Photo</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="lp_slide_type" value="video" checked={form.slide_type === 'video'} onChange={() => setForm(p => ({...p, slide_type: 'video'}))} className="accent-[#0D9488]" data-testid="lp-slide-type-video" />
            <span className="text-sm text-slate-600">Video</span>
          </label>
        </div>
        {form.slide_type === 'video' ? (
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">Video URL (YouTube, Vimeo, or direct link)</Label>
            <Input value={form.video_embed} onChange={set('video_embed')} placeholder="https://www.youtube.com/watch?v=..." data-testid="lp-slide-video-embed" />
            <p className="text-xs text-slate-400 mt-1">Paste a YouTube, Vimeo, or direct video URL.</p>
          </div>
        ) : (
          <div><Label className="text-xs text-slate-500 mb-1 block">Photo</Label><ImageUpload value={form.photo} onChange={v => setForm(p => ({...p, photo: v}))} className="mt-1" /></div>
        )}
      </div>

      {/* Media Dimensions */}
      <div className={sectionCls}>
        <h2 className={sectionTitle}>Media Dimensions</h2>
        <p className="text-xs text-slate-400 mb-3">Set custom width and height for the photo or video.</p>
        <div className="grid grid-cols-2 gap-4">
          <div><Label className="text-xs text-slate-500">Width (px)</Label><Input type="number" value={form.media_width || ''} onChange={e => setForm(p => ({...p, media_width: parseInt(e.target.value) || 0}))} className="mt-1" placeholder="420" data-testid="lp-slide-media-width" /></div>
          <div><Label className="text-xs text-slate-500">Height (px)</Label><Input type="number" value={form.media_height || ''} onChange={e => setForm(p => ({...p, media_height: parseInt(e.target.value) || 0}))} className="mt-1" placeholder="Auto" data-testid="lp-slide-media-height" /></div>
        </div>
      </div>

      {/* Background */}
      <div className={sectionCls}>
        <h2 className={sectionTitle}>Background</h2>
        <Label className="text-xs text-slate-500 mb-1 block">Background Image</Label>
        <ImageUpload value={form.background} onChange={v => setForm(p => ({...p, background: v}))} className="mt-1" />
        <div className="mt-4">
          <Label className="text-xs text-slate-500 mb-2 block">Background Overlay</Label>
          <p className="text-xs text-slate-400 mb-2">Apply a dark gradient overlay on top of the background image for text readability.</p>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="bg_overlay" checked={form.background_overlay !== false} onChange={() => setForm(p => ({...p, background_overlay: true}))} className="accent-[#0D9488]" data-testid="lp-overlay-yes" />
              <span className="text-sm text-slate-600">Yes</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="bg_overlay" checked={form.background_overlay === false} onChange={() => setForm(p => ({...p, background_overlay: false}))} className="accent-[#0D9488]" data-testid="lp-overlay-no" />
              <span className="text-sm text-slate-600">No</span>
            </label>
          </div>
        </div>
      </div>

      {/* Layer Animation Effects */}
      <div className={sectionCls}>
        <h2 className={sectionTitle}>Layer Animation Effects</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { field: 'title_effect', label: 'Title Effect' },
            { field: 'subtitle_effect', label: 'Subtitle Effect' },
            { field: 'description_effect', label: 'Description Effect' },
            { field: 'button_effect', label: 'Buttons Effect' },
            { field: 'media_effect', label: 'Video/Photo Effect' },
          ].map(e => (
            <div key={e.field}>
              <Label className="text-xs text-slate-500">{e.label}</Label>
              <select value={form[e.field]} onChange={set(e.field)} className={`mt-1 ${selectCls}`} data-testid={`lp-slide-${e.field}`}>{effectOptions.map(o => <option key={o} value={o}>{o}</option>)}</select>
            </div>
          ))}
        </div>
      </div>

      {/* Layer Positioning */}
      <div className={sectionCls}>
        <h2 className={sectionTitle}>Layer Positioning</h2>
        <p className="text-xs text-slate-400 mb-4">Drag each layer to position it on the slide canvas.</p>
        <HeroCanvasEditor coords={canvasCoords} onChange={handleCanvasChange} backgroundImage={form.background} />
      </div>

      {/* Live Preview */}
      <div className="bg-white border border-slate-100 rounded-sm mb-5 overflow-hidden" data-testid="lp-hero-preview-section">
        <button onClick={() => setShowPreview(p => !p)} className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-[#1a2332] hover:bg-slate-50 transition-colors" data-testid="toggle-lp-preview-btn">
          <div className="flex items-center gap-2">
            {showPreview ? <Eye className="w-4 h-4 text-[#0D9488]" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
            <span>Live Preview</span>
            <span className="text-[10px] font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Updates in real-time</span>
          </div>
          <span className="text-xs text-slate-400">{showPreview ? 'Hide' : 'Show'}</span>
        </button>
        {showPreview && <div className="px-5 pb-5"><HeroSlidePreview form={form} /></div>}
      </div>

      {/* Page Assignment */}
      <div className={sectionCls}>
        <h2 className={sectionTitle}>Page Assignment</h2>
        <p className="text-xs text-slate-400 mb-4">Select which pages this slide should appear on.</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {sitePages.map(pg => {
            const checked = (form.assigned_pages || []).includes(pg.id);
            return (
              <label key={pg.id} className={`flex items-center gap-2.5 p-2.5 rounded-sm border cursor-pointer transition-colors ${checked ? 'bg-[#0D9488]/5 border-[#0D9488]/30' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                <Checkbox checked={checked} onCheckedChange={(v) => {
                  setForm(p => { const cur = p.assigned_pages || []; return { ...p, assigned_pages: v ? [...cur, pg.id] : cur.filter(x => x !== pg.id) }; });
                }} />
                <div><span className="text-sm font-medium text-[#1a2332]">{pg.title}</span><span className="block text-xs text-slate-400 font-mono">{pg.url}</span></div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Revolution Slider Parameters */}
      <div className={sectionCls}>
        <h2 className={sectionTitle}>Revolution Slider Parameters</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
          <div><Label className="text-xs text-slate-500">Transition</Label><Input value={form.transition} onChange={set('transition')} className="mt-1" data-testid="lp-slide-transition" /></div>
          <div><Label className="text-xs text-slate-500">Slot Amount</Label><Input type="number" value={form.slot_amount} onChange={setNum('slot_amount')} className="mt-1" /></div>
          <div><Label className="text-xs text-slate-500">Master Speed (ms)</Label><Input type="number" value={form.master_speed} onChange={setNum('master_speed')} className="mt-1" /></div>
          <div><Label className="text-xs text-slate-500">Delay (ms)</Label><Input type="number" value={form.delay} onChange={setNum('delay')} className="mt-1" /></div>
          <div><Label className="text-xs text-slate-500">Speed/Layer (ms)</Label><Input type="number" value={form.speed_per_layer} onChange={setNum('speed_per_layer')} className="mt-1" /></div>
        </div>
        <h3 className="text-xs font-medium text-slate-500 mb-3">Data Start per Layer (ms)</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div><Label className="text-xs text-slate-500">Title Start</Label><Input type="number" value={form.title_start} onChange={setNum('title_start')} className="mt-1" /></div>
          <div><Label className="text-xs text-slate-500">Subtitle Start</Label><Input type="number" value={form.subtitle_start} onChange={setNum('subtitle_start')} className="mt-1" /></div>
          <div><Label className="text-xs text-slate-500">Description Start</Label><Input type="number" value={form.description_start} onChange={setNum('description_start')} className="mt-1" /></div>
          <div><Label className="text-xs text-slate-500">Button Start</Label><Input type="number" value={form.button_start} onChange={setNum('button_start')} className="mt-1" /></div>
          <div><Label className="text-xs text-slate-500">Video/Photo Start</Label><Input type="number" value={form.media_start} onChange={setNum('media_start')} className="mt-1" /></div>
        </div>
      </div>

      {/* Bottom Save */}
      <button onClick={handleSave} disabled={saving}
        className="w-full py-3 bg-[#0D9488] text-white font-semibold rounded-sm flex items-center justify-center gap-2 hover:bg-[#0D9488]/80 disabled:opacity-50"
        data-testid="save-lp-slide-btn-bottom">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saving ? 'Saving...' : `${isEdit ? 'Update' : 'Create'} Slide`}
      </button>
    </div>
  );
}
