import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { opportunitiesAPI } from '../lib/api';
import RichTextEditor from '../components/RichTextEditor';
import { RepeatableGroup, FaqManager, TeamPicker } from '../components/OpportunitySubEditors';
import { toast } from 'sonner';
import { Loader2, Upload, X, FileText, ExternalLink, ChevronLeft, Trash2, Send } from 'lucide-react';

const PB_FONT = "'Plus Jakarta Sans', 'Inter', sans-serif";
const inputCls = 'h-11 w-full px-4 text-sm bg-white border border-slate-200 rounded-sm ' +
  'text-slate-700 placeholder:text-slate-400 outline-none transition-[border-color,box-shadow] duration-150 ' +
  'focus:border-[var(--color-accent,#0D9488)] focus:shadow-[0_0_0_3px_rgba(13,148,136,0.12)]';
const TIMER_OPTIONS = [6, 12, 24, 36, 72];
const DATE_FIELDS = [
  ['launch', 'Launch Date'], ['funding_end', 'Funding End Date'],
  ['project', 'Project Date'], ['reporting', 'Reporting Date'],
  ['distribution', 'Distribution Date'],
];
const SOCIAL_FIELDS = ['facebook', 'twitter', 'linkedin', 'google', 'instagram'];

const EMPTY = {
  name: '', type_id: '', country_id: '', state_id: '', city_id: '',
  contact_email: '', video_url: '',
  dates: { launch: '', funding_end: '', project: '', reporting: '', distribution: '' },
  total_amount: '', minimum_investment_amount: '',
  summary: '', description: '',
  socials: { facebook: '', twitter: '', linkedin: '', google: '', instagram: '' },
  show_mode: 'all', timer_hours: '',
  images: [null, null, null, null, null], pfs_url: null,
  files: [], backers: [], services: [], benefits: [], updates: [], faq: [], team: [],
  status: 'draft',
};
const SUB_GROUPS = ['files', 'backers', 'services', 'benefits', 'updates'];

function Section({ title, hint, children }) {
  return (
    <section className="bg-white rounded-sm border border-slate-100 p-6 md:p-8">
      <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--color-heading, #1a2332)', fontFamily: 'Playfair Display, serif' }}>{title}</h2>
      {hint && <p className="text-xs text-slate-400 mb-5">{hint}</p>}
      {!hint && <div className="mb-5" />}
      {children}
    </section>
  );
}

function Field({ label, children, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function ImageSlot({ index, url, fallback, disabled, uploading, onPick, onClear }) {
  const fileRef = useRef(null);
  return (
    <div className="relative aspect-[4/3] rounded-sm border border-slate-200 bg-slate-50 overflow-hidden group">
      {url ? (
        <>
          <img src={url} alt={`Slot ${index + 1}`} className="w-full h-full object-cover" />
          <button type="button" onClick={onClear}
            className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            title="Remove image"><X className="w-3.5 h-3.5" /></button>
        </>
      ) : (
        <button type="button" disabled={disabled || uploading} onClick={() => fileRef.current?.click()}
          className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-slate-400 hover:text-[var(--color-accent,#0D9488)] disabled:opacity-40 disabled:cursor-not-allowed">
          {fallback && <img src={fallback} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />}
          {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
          <span className="text-[11px] relative">{index === 0 ? 'Main image' : `Image ${index + 1}`}</span>
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden"
        onChange={e => { if (e.target.files?.[0]) onPick(e.target.files[0]); e.target.value = ''; }} />
    </div>
  );
}

export default function OpportunityEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const [form, setForm] = useState(null);
  const [types, setTypes] = useState([]);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploadingKind, setUploadingKind] = useState(null);

  const set = (patch) => setForm(f => ({ ...f, ...patch }));

  useEffect(() => {
    opportunitiesAPI.types().then(r => setTypes(r.data)).catch(() => {});
    opportunitiesAPI.geoCountries().then(r => setCountries(r.data)).catch(() => {});
    if (isNew) setForm({ ...EMPTY });
    else opportunitiesAPI.get(id)
      .then(r => setForm({
        ...EMPTY, ...r.data,
        type_id: r.data.type_id ?? '',
        timer_hours: r.data.timer_hours ?? '',
        total_amount: r.data.total_amount ?? '',
        minimum_investment_amount: r.data.minimum_investment_amount ?? '',
        dates: { ...EMPTY.dates, ...(r.data.dates || {}) },
        socials: { ...EMPTY.socials, ...(r.data.socials || {}) },
        country_id: r.data.country_id || '', state_id: r.data.state_id || '', city_id: r.data.city_id || '',
        contact_email: r.data.contact_email || '', video_url: r.data.video_url || '',
      }))
      .catch(() => { toast.error('Opportunity not found'); navigate('/opportunities/develop'); });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (form?.country_id) opportunitiesAPI.geoStates(form.country_id).then(r => setStates(r.data)).catch(() => setStates([]));
    else setStates([]);
  }, [form?.country_id]);
  useEffect(() => {
    if (form?.state_id) opportunitiesAPI.geoCities(form.state_id).then(r => setCities(r.data)).catch(() => setCities([]));
    else setCities([]);
  }, [form?.state_id]);

  const typeDefault = types.find(t => String(t.type_id) === String(form?.type_id))?.default_image || null;

  const payload = () => ({
    name: form.name, type_id: form.type_id === '' ? null : Number(form.type_id),
    country_id: form.country_id, state_id: form.state_id, city_id: form.city_id,
    contact_email: form.contact_email, video_url: form.video_url,
    dates: form.dates,
    total_amount: form.total_amount === '' ? null : form.total_amount,
    minimum_investment_amount: form.minimum_investment_amount === '' ? null : form.minimum_investment_amount,
    summary: form.summary, description: form.description,
    socials: form.socials,
    show_mode: form.show_mode,
    timer_hours: form.show_mode === 'timer' && form.timer_hours !== '' ? Number(form.timer_hours) : null,
    images: form.images, pfs_url: form.pfs_url,
    files: form.files, backers: form.backers, services: form.services,
    benefits: form.benefits, updates: form.updates, team: form.team,
    status: form.status === 'pending_review' ? undefined : form.status,
  });

  const save = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const body = payload();
      if (body.status === undefined) delete body.status;
      if (isNew) {
        const r = await opportunitiesAPI.create(body);
        toast.success('Draft created — you can now add images and documents');
        navigate(`/opportunities/develop/${r.data.id}`, { replace: true });
      } else {
        const r = await opportunitiesAPI.update(id, body);
        // Sync server-normalized rows back (new rows gained ids/timestamps).
        setForm(f => ({
          ...f, slug: r.data.slug,
          files: r.data.files, backers: r.data.backers, services: r.data.services,
          benefits: r.data.benefits, updates: r.data.updates, team: r.data.team,
        }));
        toast.success('Saved');
      }
    } catch (e) { toast.error(e.response?.data?.detail || 'Save failed'); }
    finally { setSaving(false); }
  };

  const remove = async () => {
    if (!window.confirm(`Delete "${form.name}"?`)) return;
    try { await opportunitiesAPI.remove(id); toast.success('Deleted'); navigate('/opportunities/develop'); }
    catch (e) { toast.error(e.response?.data?.detail || 'Delete failed'); }
  };

  const publish = async () => {
    if (!window.confirm('Submit this opportunity for publication?')) return;
    setSaving(true);
    try {
      // Persist any pending edits first so the reviewed/published content
      // is exactly what is on screen.
      const body = payload();
      if (body.status === undefined) delete body.status;
      await opportunitiesAPI.update(id, body);
      const r = await opportunitiesAPI.publish(id);
      if (r.data.status === 'published') {
        toast.success('Published — it is now visible in the directory');
        setForm(f => ({ ...f, status: 'published' }));
      } else {
        toast.success(`Submitted for peer review (${r.data.approvals}/${r.data.threshold} approvals)`);
        setForm(f => ({ ...f, status: 'pending_review' }));
      }
    } catch (e) { toast.error(e.response?.data?.detail || 'Publish failed'); }
    finally { setSaving(false); }
  };

  const upload = async (kind, file) => {
    setUploadingKind(kind);
    try {
      const r = await opportunitiesAPI.upload(id, kind, file);
      if (r.data.images) set({ images: r.data.images });
      if (r.data.pfs_url) set({ pfs_url: r.data.pfs_url });
      toast.success('Uploaded');
    } catch (e) { toast.error(e.response?.data?.detail || 'Upload failed'); }
    finally { setUploadingKind(null); }
  };

  if (!form) {
    return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-background, #faf8f5)' }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-accent, #0D9488)' }} />
    </div>;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background, #faf8f5)', fontFamily: PB_FONT }}>
      <div className="max-w-4xl mx-auto px-6 md:px-12 py-16 pt-24 md:pt-28">
        <Link to="/opportunities/develop" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-[var(--color-accent,#0D9488)] mb-6">
          <ChevronLeft className="w-4 h-4" /> My Opportunities
        </Link>
        <div className="mb-8">
          <div className="text-xs uppercase tracking-[0.2em] font-semibold mb-3" style={{ color: 'var(--color-accent, #0D9488)' }}>
            Opportunity Development
          </div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-heading, #1a2332)', fontFamily: 'Playfair Display, serif' }}>
            {isNew ? 'New Opportunity' : (form.name || '(untitled)')}
          </h1>
        </div>

        <div className="space-y-6">
          <Section title="Basics">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Opportunity Name *" className="md:col-span-2">
                <input className={inputCls} value={form.name} onChange={e => set({ name: e.target.value })} data-testid="opp-name" />
              </Field>
              <Field label="Type">
                <select className={inputCls} value={form.type_id} onChange={e => set({ type_id: e.target.value })} data-testid="opp-type">
                  <option value="">Select a type…</option>
                  {types.map(t => <option key={t.type_id} value={t.type_id}>{t.name}</option>)}
                </select>
              </Field>
              <Field label="Contact Email">
                <input type="email" className={inputCls} value={form.contact_email} onChange={e => set({ contact_email: e.target.value })} data-testid="opp-email" />
              </Field>
              <Field label="Country">
                <select className={inputCls} value={form.country_id} onChange={e => set({ country_id: e.target.value, state_id: '', city_id: '' })} data-testid="opp-country">
                  <option value="">Select…</option>
                  {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="State / Province">
                <select className={inputCls} value={form.state_id} disabled={!form.country_id}
                  onChange={e => set({ state_id: e.target.value, city_id: '' })} data-testid="opp-state">
                  <option value="">Select…</option>
                  {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
              <Field label="City">
                <select className={inputCls} value={form.city_id} disabled={!form.state_id} onChange={e => set({ city_id: e.target.value })} data-testid="opp-city">
                  <option value="">Select…</option>
                  {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
            </div>
          </Section>

          <Section title="Dates & Amounts">
            <div className="grid md:grid-cols-3 gap-4">
              {DATE_FIELDS.map(([k, label]) => (
                <Field key={k} label={label}>
                  <input type="date" className={inputCls} value={form.dates[k] || ''}
                    onChange={e => set({ dates: { ...form.dates, [k]: e.target.value } })} data-testid={`opp-date-${k}`} />
                </Field>
              ))}
            </div>
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              <Field label="Total Amount (goal, USD)">
                <input type="number" min="0" step="any" className={inputCls} value={form.total_amount}
                  onChange={e => set({ total_amount: e.target.value })} data-testid="opp-total" />
              </Field>
              <Field label="Minimum Investment (USD)">
                <input type="number" min="0" step="any" className={inputCls} value={form.minimum_investment_amount}
                  onChange={e => set({ minimum_investment_amount: e.target.value })} data-testid="opp-min" />
              </Field>
            </div>
          </Section>

          <Section title="Content">
            <div className="space-y-4">
              <Field label="Summary">
                <RichTextEditor value={form.summary} onChange={v => set({ summary: v })} placeholder="A short pitch shown on the directory card…" />
              </Field>
              <Field label="Description">
                <RichTextEditor value={form.description} onChange={v => set({ description: v })} placeholder="The full story: the project, the plan, the numbers…" />
              </Field>
              <Field label="Video URL">
                <input className={inputCls} value={form.video_url} onChange={e => set({ video_url: e.target.value })}
                  placeholder="https://youtube.com/…" data-testid="opp-video" />
              </Field>
            </div>
          </Section>

          <Section title="Media" hint={isNew ? 'Save the draft first to attach images and documents.' : 'Up to 5 images. The first slot is the main image.'}>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              {form.images.map((url, i) => (
                <ImageSlot key={i} index={i} url={url} fallback={typeDefault} disabled={isNew}
                  uploading={uploadingKind === `image${i + 1}`}
                  onPick={file => upload(`image${i + 1}`, file)}
                  onClear={() => set({ images: form.images.map((u, j) => (j === i ? null : u)) })} />
              ))}
            </div>
            <Field label="Financial Statement (PFS)">
              {form.pfs_url ? (
                <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-sm">
                  <FileText className="w-5 h-5 text-slate-400 shrink-0" />
                  <span className="text-sm text-slate-600 truncate flex-1">{form.pfs_url.split('/').pop()}</span>
                  <a href={form.pfs_url} target="_blank" rel="noreferrer" className="p-1.5 text-slate-400 hover:text-[var(--color-accent,#0D9488)]" title="View"><ExternalLink className="w-4 h-4" /></a>
                  <button type="button" onClick={() => set({ pfs_url: null })} className="p-1.5 text-slate-400 hover:text-red-500" title="Remove"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <label className={`inline-flex items-center gap-2 px-4 py-2.5 border border-dashed border-slate-300 rounded-sm text-sm text-slate-500 ${isNew ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:border-[var(--color-accent,#0D9488)] hover:text-[var(--color-accent,#0D9488)]'}`}>
                  {uploadingKind === 'pfs' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Upload PDF / DOC / XLS / PPT
                  <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" className="hidden" disabled={isNew}
                    onChange={e => { if (e.target.files?.[0]) upload('pfs', e.target.files[0]); e.target.value = ''; }} />
                </label>
              )}
            </Field>
          </Section>

          <Section title="Visibility" hint="Choose how long the opportunity stays open for funding once published.">
            <div className="flex flex-col gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input type="radio" name="show_mode" checked={form.show_mode === 'all'}
                  onChange={() => set({ show_mode: 'all', timer_hours: '' })} className="accent-[var(--color-accent,#0D9488)]" data-testid="opp-mode-all" />
                Show to all — open until the Funding End Date
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input type="radio" name="show_mode" checked={form.show_mode === 'timer'}
                  onChange={() => set({ show_mode: 'timer' })} className="accent-[var(--color-accent,#0D9488)]" data-testid="opp-mode-timer" />
                For a limited time — countdown timer from publication
              </label>
              {form.show_mode === 'timer' && (
                <div className="ml-6 max-w-xs">
                  <select className={inputCls} value={form.timer_hours} onChange={e => set({ timer_hours: e.target.value })} data-testid="opp-timer-hours">
                    <option value="">Select duration…</option>
                    {TIMER_OPTIONS.map(h => <option key={h} value={h}>{h} hours</option>)}
                  </select>
                </div>
              )}
            </div>
          </Section>

          {SUB_GROUPS.map(g => (
            <RepeatableGroup key={g} group={g} oppId={id} disabled={isNew}
              rows={form[g]} onChange={rows => set({ [g]: rows })} />
          ))}

          <FaqManager oppId={id} faq={form.faq} disabled={isNew}
            onChange={faq => set({ faq })} />

          <TeamPicker team={form.team} disabled={isNew}
            onChange={team => set({ team })} />

          <Section title="Social Links">
            <div className="grid md:grid-cols-2 gap-4">
              {SOCIAL_FIELDS.map(k => (
                <Field key={k} label={k.charAt(0).toUpperCase() + k.slice(1)}>
                  <input className={inputCls} value={form.socials[k] || ''} placeholder="https://…"
                    onChange={e => set({ socials: { ...form.socials, [k]: e.target.value } })} data-testid={`opp-social-${k}`} />
                </Field>
              ))}
            </div>
          </Section>

          <div className="bg-white rounded-sm border border-slate-100 p-6 flex flex-wrap items-center gap-4 sticky bottom-4 shadow-[0_4px_24px_rgba(26,35,50,0.08)]">
            {form.status === 'published' ? (
              <span className="text-xs px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 font-medium">Published</span>
            ) : form.status === 'pending_review' ? (
              <span className="text-xs px-3 py-1.5 rounded-full bg-amber-50 text-amber-600 font-medium">Pending peer review</span>
            ) : (
              <Field label="Status" className="w-44">
                <select className={inputCls} value={form.status}
                  onChange={e => set({ status: e.target.value })} data-testid="opp-status">
                  <option value="draft">Draft</option>
                  <option value="archived">Archive</option>
                </select>
              </Field>
            )}
            <div className="flex-1" />
            {!isNew && (form.status === 'draft' || form.status === 'archived') && (
              <button onClick={remove} className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 rounded-sm" data-testid="opp-delete-btn">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            )}
            <Link to="/opportunities/develop" className="px-4 py-2.5 text-sm text-slate-500 hover:text-slate-700">Cancel</Link>
            {!isNew && (form.status === 'draft' || form.status === 'archived') && (
              <button onClick={publish} disabled={saving}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium rounded-sm border disabled:opacity-50"
                style={{ borderColor: 'var(--color-accent, #0D9488)', color: 'var(--color-accent, #0D9488)' }}
                data-testid="opp-publish-btn">
                <Send className="w-4 h-4" /> Submit for Publication
              </button>
            )}
            <button onClick={save} disabled={saving}
              className="px-6 py-2.5 rounded-sm text-sm font-medium disabled:opacity-50 inline-flex items-center gap-2"
              style={{ backgroundColor: 'var(--color-button-bg, #1a2332)', color: 'var(--color-button-text, #fff)' }}
              data-testid="opp-save-btn">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} {isNew ? 'Create Draft' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
