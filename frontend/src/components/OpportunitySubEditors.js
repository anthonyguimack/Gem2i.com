import React, { useState, useRef, useEffect } from 'react';
import { opportunitiesAPI } from '../lib/api';
import RichTextEditor from './RichTextEditor';
import { toast } from 'sonner';
import { Plus, Trash2, Upload, Loader2, FileText, ExternalLink, Edit2, X, Search, ChevronDown } from 'lucide-react';

const inputCls = 'h-11 w-full px-4 text-sm bg-white border border-slate-200 rounded-sm ' +
  'text-slate-700 placeholder:text-slate-400 outline-none transition-[border-color,box-shadow] duration-150 ' +
  'focus:border-[var(--color-accent,#0D9488)] focus:shadow-[0_0_0_3px_rgba(13,148,136,0.12)]';

const label = 'block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5';

// Field layouts per group (legacy tables, plan §2.5).
export const GROUP_SPECS = {
  files: {
    title: 'Files', addLabel: 'Add file',
    hint: 'Documents shared with members viewing the opportunity.',
    fields: ['title', 'file', 'permission', 'members'],
  },
  backers: {
    title: 'Backer Pledges', addLabel: 'Add pledge',
    hint: 'What a backer receives at each contribution level.',
    fields: ['title', 'price', 'stock', 'description'],
  },
  services: {
    title: 'Services', addLabel: 'Add service',
    hint: 'Services offered as part of the opportunity.',
    fields: ['title', 'price', 'stock', 'description'],
  },
  benefits: {
    title: 'Investment Benefits', addLabel: 'Add benefit',
    hint: 'Benefits an investor receives.',
    fields: ['title', 'price', 'description'],
  },
  updates: {
    title: 'Updates', addLabel: 'Add update',
    hint: 'Progress notes shown on the published opportunity.',
    fields: ['title', 'description'],
  },
};

const EMPTY_ROW = {
  files: { title: '', url: null, permission: 'Yes', members: 'All' },
  backers: { title: '', price: '', stock: '', description: '' },
  services: { title: '', price: '', stock: '', description: '' },
  benefits: { title: '', price: '', description: '' },
  updates: { title: '', description: '' },
};

function RowFileSlot({ oppId, row, onUrl }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const pick = async (file) => {
    setUploading(true);
    try {
      const r = await opportunitiesAPI.upload(oppId, 'file', file);
      onUrl(r.data.url);
      toast.success('Uploaded');
    } catch (e) { toast.error(e.response?.data?.detail || 'Upload failed'); }
    finally { setUploading(false); }
  };
  return row.url ? (
    <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-sm">
      <FileText className="w-4 h-4 text-slate-400 shrink-0" />
      <span className="text-xs text-slate-600 truncate flex-1">{row.url.split('/').pop()}</span>
      <a href={row.url} target="_blank" rel="noreferrer" className="p-1 text-slate-400 hover:text-[var(--color-accent,#0D9488)]"><ExternalLink className="w-3.5 h-3.5" /></a>
      <button type="button" onClick={() => onUrl(null)} className="p-1 text-slate-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
    </div>
  ) : (
    <>
      <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
        className="inline-flex items-center gap-2 px-3 py-2.5 w-full justify-center border border-dashed border-slate-300 rounded-sm text-xs text-slate-500 hover:border-[var(--color-accent,#0D9488)] hover:text-[var(--color-accent,#0D9488)]">
        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} Upload document
      </button>
      <input ref={fileRef} type="file" className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp,.zip"
        onChange={e => { if (e.target.files?.[0]) pick(e.target.files[0]); e.target.value = ''; }} />
    </>
  );
}

export function RepeatableGroup({ group, oppId, rows, onChange, disabled }) {
  const spec = GROUP_SPECS[group];
  const setRow = (i, patch) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const removeRow = async (i) => {
    const row = rows[i];
    if (row.id) {
      if (!window.confirm('Delete this row?')) return;
      try {
        const r = await opportunitiesAPI.deleteRow(oppId, group, row.id);
        onChange(r.data[group]);
        toast.success('Deleted');
      } catch (e) { toast.error(e.response?.data?.detail || 'Delete failed'); }
    } else {
      onChange(rows.filter((_, j) => j !== i));
    }
  };

  return (
    <section className="bg-white rounded-sm border border-slate-100 p-6 md:p-8" data-testid={`group-${group}`}>
      <div className="flex items-start justify-between gap-4 mb-1">
        <h2 className="text-lg font-bold" style={{ color: 'var(--color-heading, #1a2332)', fontFamily: 'Playfair Display, serif' }}>{spec.title}</h2>
        <button type="button" disabled={disabled}
          onClick={() => onChange([...rows, { ...EMPTY_ROW[group] }])}
          className="inline-flex items-center gap-1.5 text-sm font-medium disabled:opacity-40"
          style={{ color: 'var(--color-accent, #0D9488)' }} data-testid={`add-${group}`}>
          <Plus className="w-4 h-4" /> {spec.addLabel}
        </button>
      </div>
      <p className="text-xs text-slate-400 mb-5">{disabled ? 'Save the draft first to add rows.' : spec.hint}</p>
      <div className="space-y-4">
        {rows.map((row, i) => (
          <div key={row.id || `new-${i}`} className="border border-slate-200 rounded-sm p-4 relative" data-testid={`${group}-row-${i}`}>
            <button type="button" onClick={() => removeRow(i)}
              className="absolute top-3 right-3 p-1.5 text-slate-300 hover:text-red-500" title="Delete row">
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="grid md:grid-cols-2 gap-3 pr-8">
              <div className={spec.fields.includes('description') ? '' : 'md:col-span-1'}>
                <span className={label}>Title</span>
                <input className={inputCls} value={row.title || ''} onChange={e => setRow(i, { title: e.target.value })} />
              </div>
              {spec.fields.includes('price') && (
                <div><span className={label}>Price (USD)</span>
                  <input type="number" min="0" step="any" className={inputCls} value={row.price ?? ''} onChange={e => setRow(i, { price: e.target.value })} /></div>
              )}
              {spec.fields.includes('stock') && (
                <div><span className={label}>Stock / Quantity</span>
                  <input type="number" min="0" className={inputCls} value={row.stock ?? ''} onChange={e => setRow(i, { stock: e.target.value })} /></div>
              )}
              {spec.fields.includes('file') && (
                <div><span className={label}>Document</span>
                  <RowFileSlot oppId={oppId} row={row} onUrl={url => setRow(i, { url })} /></div>
              )}
              {spec.fields.includes('permission') && (
                <div><span className={label}>Requires Permission</span>
                  <div className="flex gap-4 h-11 items-center">
                    {['Yes', 'No'].map(v => (
                      <label key={v} className="inline-flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer">
                        <input type="radio" checked={(row.permission || 'Yes') === v} onChange={() => setRow(i, { permission: v })} className="accent-[var(--color-accent,#0D9488)]" /> {v}
                      </label>
                    ))}
                  </div></div>
              )}
              {spec.fields.includes('members') && (
                <div><span className={label}>Visible To</span>
                  <div className="flex gap-4 h-11 items-center">
                    {[['All', 'All members'], ['Only_Fund_it', 'Only Fund-it backers']].map(([v, l]) => (
                      <label key={v} className="inline-flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer">
                        <input type="radio" checked={(row.members || 'All') === v} onChange={() => setRow(i, { members: v })} className="accent-[var(--color-accent,#0D9488)]" /> {l}
                      </label>
                    ))}
                  </div></div>
              )}
            </div>
            {spec.fields.includes('description') && (
              <div className="mt-3">
                <span className={label}>Description</span>
                <RichTextEditor value={row.description || ''} onChange={v => setRow(i, { description: v })} placeholder="Describe it…" />
              </div>
            )}
          </div>
        ))}
        {rows.length === 0 && !disabled && (
          <p className="text-sm text-slate-400 text-center py-4">Nothing yet — use “{spec.addLabel}”.</p>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- FAQ

export function FaqManager({ oppId, faq, onChange, disabled }) {
  const [newTopic, setNewTopic] = useState('');
  const [qForm, setQForm] = useState({ topic_id: '', title: '', description: '' });
  const [editing, setEditing] = useState(null); // {qid, topic_id, title, description}
  const [openTopics, setOpenTopics] = useState({});
  const [busy, setBusy] = useState(false);

  const run = async (fn, ok) => {
    setBusy(true);
    try { const r = await fn(); onChange(r.data.faq); if (ok) toast.success(ok); return true; }
    catch (e) { toast.error(e.response?.data?.detail || 'Failed'); return false; }
    finally { setBusy(false); }
  };

  const addTopic = async () => {
    if (!newTopic.trim()) return;
    if (await run(() => opportunitiesAPI.faqAddTopic(oppId, newTopic), 'Topic added')) setNewTopic('');
  };
  const addQuestion = async () => {
    if (!qForm.topic_id) { toast.error('Select a topic first'); return; }
    if (!qForm.title.trim()) { toast.error('Question title is required'); return; }
    if (await run(() => opportunitiesAPI.faqAddQuestion(oppId, qForm), 'Question added'))
      setQForm({ topic_id: qForm.topic_id, title: '', description: '' });
  };
  const saveEdit = async () => {
    if (await run(() => opportunitiesAPI.faqEditQuestion(oppId, editing.qid, editing), 'Saved')) setEditing(null);
  };

  return (
    <section className="bg-white rounded-sm border border-slate-100 p-6 md:p-8" data-testid="faq-manager">
      <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--color-heading, #1a2332)', fontFamily: 'Playfair Display, serif' }}>FAQ</h2>
      <p className="text-xs text-slate-400 mb-5">{disabled ? 'Save the draft first to build the FAQ.' : 'Group answers under topics; shown as an accordion on the published page.'}</p>
      {!disabled && (
        <>
          <div className="flex gap-2 mb-5 max-w-md">
            <input className={inputCls} placeholder="New topic name…" value={newTopic}
              onChange={e => setNewTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTopic()} data-testid="faq-topic-input" />
            <button type="button" onClick={addTopic} disabled={busy || !newTopic.trim()}
              className="px-4 rounded-sm text-sm font-medium shrink-0 disabled:opacity-40"
              style={{ backgroundColor: 'var(--color-button-bg, #1a2332)', color: 'var(--color-button-text, #fff)' }}>
              Add Topic
            </button>
          </div>
          {faq.length > 0 && (
            <div className="border border-slate-200 rounded-sm p-4 mb-6 space-y-3">
              <div className="grid md:grid-cols-[200px_1fr] gap-3">
                <div><span className={label}>Topic</span>
                  <select className={inputCls} value={qForm.topic_id} onChange={e => setQForm({ ...qForm, topic_id: e.target.value })} data-testid="faq-q-topic">
                    <option value="">Select…</option>
                    {faq.map(t => <option key={t.topic_id} value={t.topic_id}>{t.topic}</option>)}
                  </select></div>
                <div><span className={label}>Question</span>
                  <input className={inputCls} value={qForm.title} onChange={e => setQForm({ ...qForm, title: e.target.value })} data-testid="faq-q-title" /></div>
              </div>
              <div><span className={label}>Answer</span>
                <RichTextEditor value={qForm.description} onChange={v => setQForm({ ...qForm, description: v })} placeholder="The answer…" /></div>
              <button type="button" onClick={addQuestion} disabled={busy}
                className="inline-flex items-center gap-1.5 text-sm font-medium disabled:opacity-40" style={{ color: 'var(--color-accent, #0D9488)' }} data-testid="faq-q-add">
                <Plus className="w-4 h-4" /> Add question
              </button>
            </div>
          )}
        </>
      )}
      <div className="space-y-2">
        {faq.map(t => (
          <div key={t.topic_id} className="border border-slate-200 rounded-sm">
            <button type="button" className="w-full flex items-center justify-between px-4 py-3 text-left"
              onClick={() => setOpenTopics(o => ({ ...o, [t.topic_id]: !o[t.topic_id] }))}>
              <span className="text-sm font-semibold text-slate-700">{t.topic} <span className="text-slate-400 font-normal">({t.questions.length})</span></span>
              <span className="flex items-center gap-1">
                {!disabled && (
                  <Trash2 className="w-4 h-4 text-slate-300 hover:text-red-500" onClick={async (e) => {
                    e.stopPropagation();
                    if (window.confirm(`Delete topic "${t.topic}" and its ${t.questions.length} question(s)?`))
                      await run(() => opportunitiesAPI.faqDeleteTopic(oppId, t.topic_id), 'Topic deleted');
                  }} />
                )}
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openTopics[t.topic_id] ? 'rotate-180' : ''}`} />
              </span>
            </button>
            {openTopics[t.topic_id] && (
              <div className="border-t border-slate-100 divide-y divide-slate-50">
                {t.questions.map(q => (
                  <div key={q.id} className="px-4 py-3" data-testid={`faq-q-${q.id}`}>
                    {editing?.qid === q.id ? (
                      <div className="space-y-2">
                        <input className={inputCls} value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} />
                        <RichTextEditor value={editing.description} onChange={v => setEditing({ ...editing, description: v })} />
                        <div className="flex gap-3">
                          <button type="button" onClick={saveEdit} disabled={busy} className="text-sm font-medium" style={{ color: 'var(--color-accent, #0D9488)' }}>Save</button>
                          <button type="button" onClick={() => setEditing(null)} className="text-sm text-slate-400">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-700">{q.title}</div>
                          {q.description && <div className="text-xs text-slate-500 mt-1 line-clamp-2" dangerouslySetInnerHTML={{ __html: q.description }} />}
                        </div>
                        {!disabled && (
                          <span className="flex shrink-0 gap-1">
                            <button type="button" onClick={() => setEditing({ qid: q.id, topic_id: t.topic_id, title: q.title, description: q.description || '' })}
                              className="p-1 text-slate-300 hover:text-[var(--color-accent,#0D9488)]"><Edit2 className="w-3.5 h-3.5" /></button>
                            <button type="button" onClick={async () => {
                              if (window.confirm('Delete this question?'))
                                await run(() => opportunitiesAPI.faqDeleteQuestion(oppId, q.id), 'Question deleted');
                            }} className="p-1 text-slate-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {t.questions.length === 0 && <div className="px-4 py-3 text-xs text-slate-400">No questions in this topic yet.</div>}
              </div>
            )}
          </div>
        ))}
        {faq.length === 0 && !disabled && <p className="text-sm text-slate-400 text-center py-2">No topics yet.</p>}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Team

function Avatar({ m }) {
  const initials = `${(m.first_name || '')[0] || ''}${(m.last_name || '')[0] || ''}`.toUpperCase() || '?';
  return m.avatar
    ? <img src={m.avatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
    : <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-white shrink-0"
        style={{ backgroundColor: 'var(--color-primary, #1a2332)' }}>{initials}</div>;
}

export function TeamPicker({ team, onChange, disabled }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [profiles, setProfiles] = useState({}); // member_id -> profile

  // Resolve display profiles for already-selected member ids.
  useEffect(() => {
    const missing = team.filter(t => !profiles[t.member_id]);
    if (!missing.length) return;
    opportunitiesAPI.teamPool('').then(r => {
      const map = Object.fromEntries(r.data.map(m => [m.member_id, m]));
      setProfiles(p => ({ ...map, ...p }));
    }).catch(() => {});
  }, [team]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      opportunitiesAPI.teamPool(q).then(r => {
        setResults(r.data);
        setProfiles(p => ({ ...Object.fromEntries(r.data.map(m => [m.member_id, m])), ...p }));
      }).catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q, open]);

  const add = (m) => {
    if (team.some(t => t.member_id === m.member_id)) return;
    onChange([...team, { member_id: m.member_id, role: '' }]);
    setOpen(false); setQ('');
  };

  return (
    <section className="bg-white rounded-sm border border-slate-100 p-6 md:p-8" data-testid="team-picker">
      <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--color-heading, #1a2332)', fontFamily: 'Playfair Display, serif' }}>Our Team</h2>
      <p className="text-xs text-slate-400 mb-5">{disabled ? 'Save the draft first to build the team.' : 'Members presented as the team behind this opportunity, with their role.'}</p>
      {!disabled && (
        <div className="relative max-w-md mb-5">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className={inputCls + ' pl-9'} placeholder="Search members by name or ID…"
            value={q} onChange={e => setQ(e.target.value)}
            onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 180)}
            data-testid="team-search" />
          {open && results.length > 0 && (
            <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-sm shadow-lg max-h-64 overflow-y-auto">
              {results.map(m => {
                const taken = team.some(t => t.member_id === m.member_id);
                return (
                  <button type="button" key={m.member_id} disabled={taken}
                    onMouseDown={e => e.preventDefault()} onClick={() => add(m)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 disabled:opacity-40">
                    <Avatar m={m} />
                    <span className="text-sm text-slate-700 flex-1 truncate">{m.first_name} {m.last_name}</span>
                    <span className="text-xs text-slate-400">{m.membership_id}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
      <div className="space-y-2">
        {team.map((t, i) => {
          const m = profiles[t.member_id] || {};
          return (
            <div key={t.member_id} className="flex items-center gap-3 border border-slate-200 rounded-sm px-3 py-2" data-testid={`team-row-${t.member_id}`}>
              <Avatar m={m} />
              <span className="text-sm text-slate-700 w-44 truncate">{m.first_name ? `${m.first_name} ${m.last_name || ''}` : t.member_id}</span>
              <input className={inputCls + ' flex-1 !h-9'} placeholder="Role (e.g. Project Lead)…" value={t.role || ''} disabled={disabled}
                onChange={e => onChange(team.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))} />
              {!disabled && (
                <button type="button" onClick={() => onChange(team.filter((_, j) => j !== i))}
                  className="p-1.5 text-slate-300 hover:text-red-500" title="Remove"><X className="w-4 h-4" /></button>
              )}
            </div>
          );
        })}
        {team.length === 0 && !disabled && <p className="text-sm text-slate-400 text-center py-2">No team members yet.</p>}
      </div>
    </section>
  );
}
