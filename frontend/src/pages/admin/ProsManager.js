import React, { useState, useEffect, useRef, useCallback } from 'react';
import { adminAPI } from '../../lib/api';
import { useSettings } from '../../App';
import { useToast } from '../../hooks/use-toast';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import {
  Bot, Plus, Play, Pencil, Trash2, ChevronLeft, Loader2, Download, FileText,
  Paperclip, X, Clock, CheckCircle2, XCircle, AlertTriangle, Facebook, Twitter,
  Linkedin, Users, Globe2, Calendar, RefreshCw, Code2, Mail, ArrowUp, ArrowDown, ListOrdered
} from 'lucide-react';

/* Pro Management — admin-only manager for "Pros" (stored prompts with
   instructions) that generate + publish Morning Briefs via the Claude API.
   Carlos-only: the backend 404s every route unless settings.pro_manager_enabled
   (the nav item is hidden the same way), so this page never functions on the
   other brands even though the code ships in the shared bundle. */

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const heading = { color: 'var(--ad-heading, #1a2332)' };

function scheduleSummary(sch) {
  if (!sch) return '—';
  const t = sch.time || '08:30';
  if (sch.mode === 'interval') return `Every ${sch.interval_hours || 24}h`;
  const days = sch.days_of_week || [];
  if (sch.mode === 'weekly' || days.length < 7) {
    const names = days.map(d => DAY_LABELS[d]).join(', ');
    return `${names || 'No days'} at ${t}`;
  }
  return `Daily at ${t}`;
}

function StatusPill({ status }) {
  if (!status) return <span className="text-xs text-slate-400">never ran</span>;
  const map = {
    running: ['bg-blue-50 text-blue-700', <Loader2 key="i" className="w-3 h-3 animate-spin" />],
    success: ['bg-green-50 text-green-700', <CheckCircle2 key="i" className="w-3 h-3" />],
    partial: ['bg-amber-50 text-amber-700', <AlertTriangle key="i" className="w-3 h-3" />],
    error:   ['bg-red-50 text-red-600',   <XCircle key="i" className="w-3 h-3" />],
  };
  const [cls, icon] = map[status] || ['bg-slate-100 text-slate-500', null];
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded ${cls}`}>
      {icon}{status}
    </span>
  );
}

function fmtDT(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

export default function ProsManager() {
  const settings = useSettings();
  const { toast } = useToast();
  const [pros, setPros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // pro object being edited, or null = list view

  const enabled = !!settings?.pro_manager_enabled;

  const load = useCallback(() => {
    setLoading(true);
    adminAPI.getPros()
      .then(r => setPros(r.data || []))
      .catch(() => setPros([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (enabled) load(); }, [enabled, load]);

  if (!enabled) {
    return (
      <div className="p-6" data-testid="pros-disabled">
        <div className="bg-white rounded-sm border border-slate-100 p-10 text-center max-w-lg mx-auto">
          <Bot className="w-8 h-8 mx-auto text-slate-300 mb-3" />
          <h2 className="font-semibold mb-1" style={heading}>Prompt Management is not enabled on this site</h2>
          <p className="text-sm text-slate-500">This tool is only active on the source-brand CMS.</p>
        </div>
      </div>
    );
  }

  if (editing) {
    return (
      <ProEditor
        proId={editing.id}
        onBack={() => { setEditing(null); load(); }}
      />
    );
  }

  // "Add" goes straight to the details page; the Prompt is only created on Save.
  const startNew = () => setEditing({ id: null });

  const removePro = async (p) => {
    if (!window.confirm(`Delete the Prompt “${p.title}”? Its run history is kept.`)) return;
    try {
      await adminAPI.deletePro(p.id);
      toast({ title: 'Prompt deleted' });
      load();
    } catch { toast({ title: 'Delete failed', variant: 'destructive' }); }
  };

  const toggleEnabled = async (p, v) => {
    setPros(list => list.map(x => x.id === p.id ? { ...x, enabled: v } : x));
    try { await adminAPI.updatePro(p.id, { enabled: v }); } catch { load(); }
  };

  return (
    <div className="p-6 space-y-4" data-testid="pros-manager">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={heading}>
            <Bot className="w-5 h-5" /> Prompt Management
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Each Prompt researches its sources, writes the brief in your house style, and publishes
            it to Morning Brief — with PDF &amp; HTML you can download.
          </p>
        </div>
        <button onClick={startNew} data-testid="pros-new-btn"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded text-sm font-medium text-white"
          style={{ backgroundColor: 'var(--ad-button-bg, #0D9488)' }}>
          <Plus className="w-4 h-4" /> New Prompt
        </button>
      </div>

      <div className="bg-white rounded-sm border border-slate-100 overflow-x-auto">
        {loading ? (
          <div className="p-10 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
        ) : pros.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-slate-500 mb-1">No Prompts yet.</p>
            <p className="text-xs text-slate-400">Create one and paste the prompt you run locally today.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Schedule</th>
                <th className="px-4 py-3">Brands</th>
                <th className="px-4 py-3">Last run</th>
                <th className="px-4 py-3">Enabled</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pros.map(p => (
                <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50" data-testid={`pro-row-${p.id}`}>
                  <td className="px-4 py-3 font-medium" style={heading}>{p.title}</td>
                  <td className="px-4 py-3 text-slate-500">
                    <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-300" />
                      {scheduleSummary(p.schedule)}
                      {!p.schedule?.enabled && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">manual</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {['carlos', 'aurex', 'acapital'].filter(b => p.brands?.[b]).map(b => (
                        <span key={b} className="text-[10px] uppercase tracking-wide bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{b}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <StatusPill status={p.last_run_status} />
                      {p.last_run_at && <span className="text-[11px] text-slate-400">{fmtDT(p.last_run_at)}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Switch checked={p.enabled !== false} onCheckedChange={v => toggleEnabled(p, v)} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setEditing(p)} title="Open"
                        className="p-2 rounded hover:bg-slate-100 text-slate-500" data-testid={`pro-edit-${p.id}`}>
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => removePro(p)} title="Delete"
                        className="p-2 rounded hover:bg-red-50 text-slate-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ─── Editor + runner for one Prompt ───────────────────────────────────── */
// Blank Prompt for create mode — nothing is persisted until the first Save.
const NEW_PRO = {
  title: '', prompt_text: '', steps: [], template: '', email_to: '', enabled: true, attachments: [],
  brands: { carlos: true, aurex: false, acapital: false },
  author_member_ids: [],
  socials: { facebook: false, twitter: false, linkedin: false },
  schedule: { mode: 'daily', days_of_week: [0, 1, 2, 3, 4, 5, 6], time: '08:30', interval_hours: 24, enabled: false },
};

function ProEditor({ proId, onBack }) {
  const { toast } = useToast();
  const [pro, setPro] = useState(proId ? null : { ...NEW_PRO });
  // Unsaved edits block Run Now — a run must always execute the latest SAVED prompt.
  const [dirty, setDirty] = useState(false);
  // Files picked before the first Save (no server record yet) — uploaded right after create.
  const [pendingFiles, setPendingFiles] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [runs, setRuns] = useState([]);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);      // trigger in flight
  const [activeRun, setActiveRun] = useState(null);   // polled running run
  const [showTemplate, setShowTemplate] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const pollRef = useRef(null);

  const loadRuns = useCallback(() => {
    adminAPI.getProRuns(proId).then(r => {
      const list = r.data || [];
      setRuns(list);
      const live = list.find(x => x.status === 'running');
      setActiveRun(live || null);
    }).catch(() => {});
  }, [proId]);

  useEffect(() => {
    if (proId) {
      adminAPI.getPro(proId).then(r => setPro(r.data)).catch(() => onBack());
      loadRuns();
    }
    adminAPI.getProAuthors().then(r => setAuthors(r.data || [])).catch(() => {});
  }, [proId, loadRuns, onBack]);

  // Poll while a run is in flight
  useEffect(() => {
    if (!activeRun) { clearInterval(pollRef.current); return; }
    pollRef.current = setInterval(async () => {
      try {
        const r = await adminAPI.getProRun(activeRun.id);
        if (r.data.status !== 'running') {
          clearInterval(pollRef.current);
          setActiveRun(null);
          loadRuns();
        } else {
          setActiveRun(r.data);
        }
      } catch { /* keep polling */ }
    }, 4000);
    return () => clearInterval(pollRef.current);
  }, [activeRun?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!pro) return <div className="p-10 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>;

  const set = (patch) => { setDirty(true); setPro(p => ({ ...p, ...patch })); };
  const setSch = (patch) => set({ schedule: { ...pro.schedule, ...patch } });

  const save = async () => {
    if (!(pro.title || '').trim()) {
      toast({ title: 'Give the Prompt a title first', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const fields = {
      title: pro.title, prompt_text: pro.prompt_text, steps: pro.steps, template: pro.template,
      email_to: pro.email_to, enabled: pro.enabled, brands: pro.brands,
      author_member_ids: pro.author_member_ids, socials: pro.socials, schedule: pro.schedule,
    };
    try {
      // First Save of a new Prompt creates it; after that it updates in place.
      const r = pro.id
        ? await adminAPI.updatePro(pro.id, fields)
        : await adminAPI.createPro(fields);
      let saved = r.data;
      // Files attached before the first Save are uploaded now that the record exists.
      if (!pro.id && pendingFiles.length) {
        let atts = saved.attachments || [];
        for (const f of pendingFiles) {
          try {
            const ur = await adminAPI.uploadProAttachment(saved.id, f);
            atts = [...atts, ur.data];
          } catch (err) {
            toast({ title: `Could not attach ${f.name}`, description: err?.response?.data?.detail || '', variant: 'destructive' });
          }
        }
        saved = { ...saved, attachments: atts };
        setPendingFiles([]);
      }
      setPro(saved);
      setDirty(false);
      toast({ title: pro.id ? 'Prompt saved' : 'Prompt created', description: pro.id ? undefined : 'You can now use Run now to test it.' });
    } catch { toast({ title: 'Save failed', variant: 'destructive' }); }
    setSaving(false);
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const r = await adminAPI.runPro(pro.id);
      toast({ title: 'Run started', description: 'Research + writing can take a few minutes.' });
      setActiveRun({ id: r.data.run_id, status: 'running', log: [] });
      loadRuns();
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Could not start the run';
      toast({ title: msg, variant: 'destructive' });
    }
    setRunning(false);
  };

  const onPickFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (f.size > 15 * 1024 * 1024) {
      toast({ title: 'File too large (max 15 MB)', variant: 'destructive' });
      return;
    }
    if (!pro.id) {
      // New (unsaved) Prompt — keep the file locally; it uploads with the first Save.
      setPendingFiles(list => [...list, f]);
      return;
    }
    setUploading(true);
    try {
      const r = await adminAPI.uploadProAttachment(pro.id, f);
      setPro(p => ({ ...p, attachments: [...(p.attachments || []), r.data] }));
    } catch (err) {
      toast({ title: err?.response?.data?.detail || 'Upload failed', variant: 'destructive' });
    }
    setUploading(false);
  };

  const removeAttachment = async (att) => {
    try {
      await adminAPI.deleteProAttachment(pro.id, att.id);
      // attachment changes persist immediately server-side — not an unsaved edit
      setPro(p => ({ ...p, attachments: (p.attachments || []).filter(a => a.id !== att.id) }));
    } catch { toast({ title: 'Could not remove file', variant: 'destructive' }); }
  };

  const toggleAuthor = (id) => {
    const cur = pro.author_member_ids || [];
    if (cur.includes(id)) return set({ author_member_ids: cur.filter(x => x !== id) });
    if (cur.length >= 3) return toast({ title: 'Up to 3 authors', variant: 'destructive' });
    set({ author_member_ids: [...cur, id] });
  };

  const loadDefaultTemplate = async () => {
    try {
      const r = await adminAPI.getProDefaultTemplate();
      set({ template: r.data.template });
      setShowTemplate(true);
    } catch { toast({ title: 'Could not load the default template', variant: 'destructive' }); }
  };

  const download = (runId, fmt) => {
    // authenticated download → fetch as blob, then save via a temporary link
    const token = localStorage.getItem('auth_token');
    const base = process.env.REACT_APP_BACKEND_URL || '';
    fetch(`${base}/api/admin/pro-runs/${runId}/download?fmt=${fmt}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(async res => {
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const cd = res.headers.get('Content-Disposition') || '';
      const m = cd.match(/filename="?([^";]+)"?/);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = m ? m[1] : `brief.${fmt}`;
      a.click();
      URL.revokeObjectURL(a.href);
    }).catch(() => toast({ title: `No ${fmt.toUpperCase()} available for this run`, variant: 'destructive' }));
  };

  const removeRun = async (r) => {
    if (!window.confirm('Delete this run and its artifacts?')) return;
    try { await adminAPI.deleteProRun(r.id); loadRuns(); }
    catch { toast({ title: 'Delete failed', variant: 'destructive' }); }
  };

  const lastLog = activeRun?.log?.length ? activeRun.log[activeRun.log.length - 1].msg : 'Working…';

  return (
    <div className="p-6 space-y-4" data-testid="pro-editor">
      {/* header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded hover:bg-slate-100 text-slate-500" data-testid="pro-back">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold" style={heading}>{pro.title || 'New Prompt'}</h1>
            <p className="text-xs text-slate-400">Prompt Management</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <span className="text-[11px] text-amber-600 flex items-center gap-1 mr-1" data-testid="pro-dirty-hint">
              <AlertTriangle className="w-3 h-3" /> Unsaved changes{pro.id ? ' — save before running' : ''}
            </span>
          )}
          {/* Run now only exists once the Prompt is saved, and locks while there
              are unsaved edits — a run always executes the latest SAVED version. */}
          {pro.id && (
            <button onClick={runNow} disabled={running || !!activeRun || dirty} data-testid="pro-run-btn"
              title={dirty ? 'Save your changes first — runs use the saved version' : 'Run this Prompt now (for testing; the schedule runs it automatically)'}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: 'var(--ad-button-bg, #0D9488)' }}>
              {activeRun ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {activeRun ? 'Running…' : 'Run now'}
            </button>
          )}
          <button onClick={save} disabled={saving} data-testid="pro-save-btn"
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium disabled:opacity-50 ${dirty
              ? 'text-white border border-transparent'
              : 'border border-slate-200 bg-white hover:bg-slate-50'}`}
            style={dirty ? { backgroundColor: 'var(--ad-button-bg, #0D9488)' } : heading}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save
          </button>
          <button onClick={onBack} data-testid="pro-cancel-btn"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium border border-slate-200 bg-white hover:bg-slate-50 text-slate-500">
            Cancel
          </button>
        </div>
      </div>

      {/* live run banner */}
      {activeRun && (
        <div className="bg-blue-50 border border-blue-100 rounded-sm px-4 py-3 flex items-center gap-3" data-testid="pro-run-banner">
          <Loader2 className="w-4 h-4 animate-spin text-blue-500 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-blue-800">Run in progress</p>
            <p className="text-xs text-blue-600 truncate">{lastLog}</p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4 items-start">
        {/* left: prompt + sources + template */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-sm border border-slate-100 p-6 space-y-4">
            <div>
              <Label className="text-xs font-medium text-slate-600 mb-1 block">Title</Label>
              <Input value={pro.title || ''} onChange={e => set({ title: e.target.value })} data-testid="pro-title" />
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600 mb-1 block">
                Prompt — the instructions to execute
              </Label>
              <Textarea rows={14} value={pro.prompt_text || ''} onChange={e => set({ prompt_text: e.target.value })}
                placeholder={'Paste here the prompt you run locally today: which sources to research, what to extract, how to structure the brief…'}
                className="font-mono text-xs leading-relaxed" data-testid="pro-prompt" />
              <p className="text-xs text-slate-400 mt-1">
                URLs named here are researched live (web search). Attach files below to include them as sources.
              </p>
            </div>

            {/* steps — the sequential chat commands run one after another with full context */}
            <div>
              <Label className="text-xs font-medium text-slate-600 mb-1 flex items-center gap-1.5">
                <ListOrdered className="w-3.5 h-3.5 text-slate-400" /> Steps / commands (run in order)
              </Label>
              <div className="space-y-1.5">
                {(pro.steps || []).map((s, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0 text-white"
                      style={{ backgroundColor: 'var(--ad-button-bg, #0D9488)' }}>{i + 1}</span>
                    <Input value={s}
                      onChange={e => set({ steps: (pro.steps || []).map((x, j) => j === i ? e.target.value : x) })}
                      placeholder={i === 0 ? 'e.g. Run today’s Morning Brief' : 'Next command…'}
                      className="flex-1" data-testid={`pro-step-${i}`} />
                    <button type="button" disabled={i === 0} title="Move up"
                      onClick={() => set({ steps: (a => { const b = [...a]; [b[i - 1], b[i]] = [b[i], b[i - 1]]; return b; })(pro.steps) })}
                      className="p-1.5 rounded hover:bg-slate-100 text-slate-400 disabled:opacity-30">
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" disabled={i === (pro.steps || []).length - 1} title="Move down"
                      onClick={() => set({ steps: (a => { const b = [...a]; [b[i], b[i + 1]] = [b[i + 1], b[i]]; return b; })(pro.steps) })}
                      className="p-1.5 rounded hover:bg-slate-100 text-slate-400 disabled:opacity-30">
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" title="Remove step"
                      onClick={() => set({ steps: (pro.steps || []).filter((_, j) => j !== i) })}
                      className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => set({ steps: [...(pro.steps || []), ''] })}
                disabled={(pro.steps || []).length >= 12} data-testid="pro-add-step"
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-600">
                <Plus className="w-3.5 h-3.5" /> Add step
              </button>
              <p className="text-[11px] text-slate-400 mt-1">
                Each step is a chat command executed in order with full context (like your local chat).
                Branding into each brand's HTML happens automatically after the last step — no
                "create the HTML versions" step needed. No steps = the prompt runs as one instruction.
              </p>
            </div>

            {/* attachments */}
            <div>
              <Label className="text-xs font-medium text-slate-600 mb-1 block">Source files (optional)</Label>
              <div className="space-y-1.5">
                {(pro.attachments || []).map(att => (
                  <div key={att.id} className="flex items-center gap-2 text-sm border border-slate-100 rounded px-3 py-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                    <span className="truncate flex-1" style={heading}>{att.name}</span>
                    <span className="text-[11px] text-slate-400">{Math.max(1, Math.round((att.size || 0) / 1024))} KB</span>
                    <button onClick={() => removeAttachment(att)} className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {pendingFiles.map((f, i) => (
                  <div key={`pending-${i}`} className="flex items-center gap-2 text-sm border border-amber-100 bg-amber-50/40 rounded px-3 py-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <span className="truncate flex-1" style={heading}>{f.name}</span>
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">uploads on Save</span>
                    <button onClick={() => setPendingFiles(list => list.filter((_, j) => j !== i))}
                      className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <input ref={fileRef} type="file" className="hidden" onChange={onPickFile}
                accept=".pdf,.txt,.md,.csv,.html,.htm,.json,.png,.jpg,.jpeg,.gif,.webp" />
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-600">
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
                Attach file (PDF, text, image — max 15 MB)
              </button>
            </div>
          </div>

          {/* template (advanced) */}
          <div className="bg-white rounded-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2" style={heading}>
                  <Code2 className="w-4 h-4" /> Brand template
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Advanced override for the Carlos Artiles shell only. Empty (recommended) = the
                  built-in brand shells taken from your published briefs — each brand keeps its own
                  design automatically.
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={loadDefaultTemplate} className="text-xs px-2.5 py-1.5 rounded border border-slate-200 hover:bg-slate-50 text-slate-600">
                  Load default
                </button>
                <button onClick={() => setShowTemplate(s => !s)} className="text-xs px-2.5 py-1.5 rounded border border-slate-200 hover:bg-slate-50 text-slate-600">
                  {showTemplate ? 'Hide' : (pro.template ? 'Edit' : 'Show')}
                </button>
              </div>
            </div>
            {showTemplate && (
              <div className="mt-3">
                <Textarea rows={12} value={pro.template || ''} onChange={e => set({ template: e.target.value })}
                  placeholder="(using the built-in default template)"
                  className="font-mono text-[11px] leading-relaxed" data-testid="pro-template" />
                <p className="text-[11px] text-slate-400 mt-1">
                  Placeholders: {'{{LOGO_HTML}} {{DATE_LONG}} {{KICKER}} {{TITLE}} {{STANDFIRST}} {{DECK}} {{BODY}}'}
                </p>
              </div>
            )}
          </div>

          {/* run history (only exists once the Prompt is saved) */}
          {pro.id && (
          <div className="bg-white rounded-sm border border-slate-100">
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <h3 className="text-sm font-semibold" style={heading}>Run history</h3>
              <button onClick={loadRuns} className="p-1.5 rounded hover:bg-slate-100 text-slate-400" title="Refresh">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            {runs.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-slate-400">No runs yet — press <b>Run now</b>.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                    <th className="px-6 py-2">Started</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Brief</th>
                    <th className="px-4 py-2 text-right">Artifacts</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map(r => (
                    <tr key={r.id} className="border-b border-slate-50" data-testid={`pro-run-${r.id}`}>
                      <td className="px-6 py-2.5 text-slate-500 whitespace-nowrap">{fmtDT(r.started_at)}</td>
                      <td className="px-4 py-2.5"><StatusPill status={r.status} />
                        {r.status === 'error' && r.error && (
                          <p className="text-[11px] text-red-400 mt-0.5 max-w-[220px] truncate" title={r.error}>{r.error}</p>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {Object.keys(r.brief_results || {}).length === 0
                          ? <span className="text-xs text-slate-300">—</span>
                          : <div className="space-y-0.5">
                              {Object.entries(r.brief_results).map(([brand, br]) => (
                                <div key={brand} className="text-xs flex items-center gap-1.5">
                                  <span className="text-[10px] uppercase tracking-wide text-slate-400 w-14">{brand}</span>
                                  {br.ok
                                    ? <a href={br.url} target="_blank" rel="noopener noreferrer"
                                         className="underline decoration-slate-300 hover:decoration-slate-500 truncate max-w-[160px]" style={heading}>
                                        {br.slug}
                                      </a>
                                    : <span className="text-red-400 truncate max-w-[160px]" title={br.error}>{br.error || 'failed'}</span>}
                                </div>
                              ))}
                              {r.email_result?.status === 'sent' && (
                                <div className="text-xs flex items-center gap-1.5">
                                  <span className="text-[10px] uppercase tracking-wide text-slate-400 w-14">email</span>
                                  <span className="text-green-600">sent ({(r.email_result.to || []).length})</span>
                                </div>
                              )}
                              {r.email_result?.status === 'error' && (
                                <div className="text-xs flex items-center gap-1.5">
                                  <span className="text-[10px] uppercase tracking-wide text-slate-400 w-14">email</span>
                                  <span className="text-red-400 truncate max-w-[160px]" title={r.email_result.error}>{r.email_result.error || 'failed'}</span>
                                </div>
                              )}
                            </div>}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => download(r.id, 'html')} title="Download HTML"
                            className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                            <FileText className="w-4 h-4" />
                          </button>
                          <button onClick={() => download(r.id, 'pdf')} title="Download PDF" disabled={!r.has_pdf}
                            className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 disabled:opacity-30">
                            <Download className="w-4 h-4" />
                          </button>
                          <button onClick={() => removeRun(r)} title="Delete run"
                            className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          )}
        </div>

        {/* right: distribution + schedule */}
        <div className="space-y-4">
          {/* brands */}
          <div className="bg-white rounded-sm border border-slate-100 p-5">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3" style={heading}>
              <Globe2 className="w-4 h-4" /> Brands
            </h3>
            {[['carlos', 'Carlos Artiles', true], ['aurex', 'Aurex Network', false], ['acapital', 'ACapital Group', false]].map(([key, label, locked]) => (
              <label key={key} className={`flex items-center gap-2.5 py-1.5 text-sm ${locked ? 'opacity-70' : 'cursor-pointer'}`}>
                <input type="checkbox" className="accent-current" disabled={locked}
                  checked={!!pro.brands?.[key]}
                  onChange={e => set({ brands: { ...pro.brands, [key]: e.target.checked } })} />
                <span style={heading}>{label}</span>
                {locked && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">source</span>}
              </label>
            ))}
            <p className="text-[11px] text-slate-400 mt-2">
              Every run publishes on Carlos Artiles (source) and replicates the same content to each
              checked brand's Morning Brief — <b>in that brand's own design</b> (logos, colors, typography).
            </p>
          </div>

          {/* email delivery */}
          <div className="bg-white rounded-sm border border-slate-100 p-5">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-1" style={heading}>
              <Mail className="w-4 h-4" /> Email delivery
            </h3>
            <p className="text-[11px] text-slate-400 mb-3">
              The final brief is emailed after each run — the report itself as the message body,
              with the HTML and PDF files attached. Leave empty to skip.
            </p>
            <Label className="text-xs font-medium text-slate-600 mb-1 block">Recipients</Label>
            <Input value={pro.email_to || ''} onChange={e => set({ email_to: e.target.value })}
              placeholder="name@example.com, other@example.com" data-testid="pro-email-to" />
            <p className="text-[11px] text-slate-400 mt-1">
              Separate several addresses with commas. Sends via Settings → Email/SMTP.
            </p>
          </div>

          {/* authors */}
          <div className="bg-white rounded-sm border border-slate-100 p-5">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-1" style={heading}>
              <Users className="w-4 h-4" /> Authors
            </h3>
            <p className="text-[11px] text-slate-400 mb-3">Shown as the brief's byline. None selected = your admin name.</p>
            <div className="max-h-44 overflow-y-auto space-y-0.5 pr-1">
              {authors.map(a => (
                <label key={a.id} className="flex items-center gap-2.5 py-1 text-sm cursor-pointer">
                  <input type="checkbox" className="accent-current"
                    checked={(pro.author_member_ids || []).includes(a.id)}
                    onChange={() => toggleAuthor(a.id)} />
                  <span className="truncate" style={heading}>{a.name || a.email}</span>
                  {a.is_admin && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">admin</span>}
                </label>
              ))}
              {authors.length === 0 && <p className="text-xs text-slate-400">No members with the Author role.</p>}
            </div>
          </div>

          {/* socials — display-only checklist */}
          <div className="bg-white rounded-sm border border-slate-100 p-5">
            <h3 className="text-sm font-semibold mb-1" style={heading}>Social networks</h3>
            <p className="text-[11px] text-slate-400 mb-3">Saved with the Prompt — automatic posting is not active yet.</p>
            {[['facebook', 'Facebook', Facebook], ['twitter', 'X (Twitter)', Twitter], ['linkedin', 'LinkedIn', Linkedin]].map(([key, label, Icon]) => (
              <label key={key} className="flex items-center gap-2.5 py-1.5 text-sm cursor-pointer">
                <input type="checkbox" className="accent-current"
                  checked={!!pro.socials?.[key]}
                  onChange={e => set({ socials: { ...pro.socials, [key]: e.target.checked } })} />
                <Icon className="w-3.5 h-3.5 text-slate-400" />
                <span style={heading}>{label}</span>
              </label>
            ))}
          </div>

          {/* schedule */}
          <div className="bg-white rounded-sm border border-slate-100 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2" style={heading}>
                <Calendar className="w-4 h-4" /> Schedule
              </h3>
              <Switch checked={!!pro.schedule?.enabled} onCheckedChange={v => setSch({ enabled: v })} data-testid="pro-schedule-enabled" />
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600 mb-1 block">Frequency</Label>
              <select value={pro.schedule?.mode || 'daily'} onChange={e => setSch({ mode: e.target.value })}
                className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm bg-white" style={heading}>
                <option value="daily">Daily</option>
                <option value="weekly">Specific days</option>
                <option value="interval">Every N hours</option>
              </select>
            </div>
            {pro.schedule?.mode !== 'interval' && (
              <>
                {pro.schedule?.mode === 'weekly' && (
                  <div className="flex gap-1 flex-wrap">
                    {DAY_LABELS.map((d, i) => {
                      const on = (pro.schedule?.days_of_week || []).includes(i);
                      return (
                        <button key={d} type="button"
                          onClick={() => {
                            const cur = pro.schedule?.days_of_week || [];
                            setSch({ days_of_week: on ? cur.filter(x => x !== i) : [...cur, i].sort() });
                          }}
                          className={`text-[11px] px-2 py-1 rounded border ${on
                            ? 'text-white border-transparent'
                            : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                          style={on ? { backgroundColor: 'var(--ad-button-bg, #0D9488)' } : {}}>
                          {d}
                        </button>
                      );
                    })}
                  </div>
                )}
                <div>
                  <Label className="text-xs font-medium text-slate-600 mb-1 block">Time</Label>
                  <Input type="time" value={pro.schedule?.time || '08:30'}
                    onChange={e => setSch({ time: e.target.value })} className="w-32" />
                </div>
              </>
            )}
            {pro.schedule?.mode === 'interval' && (
              <div>
                <Label className="text-xs font-medium text-slate-600 mb-1 block">Every (hours)</Label>
                <Input type="number" min={1} max={168} value={pro.schedule?.interval_hours || 24}
                  onChange={e => setSch({ interval_hours: parseInt(e.target.value || '24', 10) })} className="w-24" />
              </div>
            )}
            <p className="text-[11px] text-slate-400">
              Times use the timezone from Settings → AI. Save to apply schedule changes.
            </p>
            {pro.schedule?.enabled && pro.next_run_at && (
              <p className="text-[11px] flex items-center gap-1.5 text-slate-500">
                <Clock className="w-3 h-3 text-slate-400" /> Next run: {fmtDT(pro.next_run_at)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
