import React, { useState, useEffect, useCallback, useRef } from 'react';
import { adminAPI } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { toast } from 'sonner';
import RichTextEditor from '../../components/RichTextEditor';
import {
  Mail, Inbox, Send, Trash2, RefreshCw, Settings, Search, Loader2, X,
  Paperclip, Reply, Forward, ChevronLeft, ChevronRight, CircleDot, Plug,
} from 'lucide-react';

/**
 * Mail — in-CMS webmail (replaces Plesk / Roundcube).
 *
 * Inbound mail is delivered by Amazon SES → S3 and ingested into the per-brand
 * `mail_messages` collection (backend/utils/mail_ingest.py); outbound goes via
 * the brand's SES SMTP creds. This screen is the operator UI: folder list +
 * read pane + compose, plus a Settings modal for the S3/IAM/forwarding config.
 * See work-plans-MD/EMAIL_MIGRATION_PLAN.md.
 */
const FOLDERS = [
  { key: 'inbox', label: 'Inbox', icon: Inbox },
  { key: 'sent', label: 'Sent', icon: Send },
  { key: 'trash', label: 'Trash', icon: Trash2 },
];

const v = (name, fallback) => `var(--ad-${name}, ${fallback})`;

function fmtDate(s) {
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(d)) return s;
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
}

function fmtSize(n) {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default function MailManager() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [folder, setFolder] = useState('inbox');
  const [messages, setMessages] = useState([]);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);       // full message in read pane
  const [activeLoading, setActiveLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [compose, setCompose] = useState(null);     // compose draft or null
  const [showSettings, setShowSettings] = useState(false);
  const [mailboxes, setMailboxes] = useState([]);   // addresses the caller may use
  const [mailbox, setMailbox] = useState('');       // selected mailbox filter ('' = all)
  const LIMIT = 30;

  useEffect(() => {
    adminAPI.listMailMailboxes().then(r => setMailboxes(r.data || [])).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminAPI.listMailMessages({ folder, page, limit: LIMIT, q: search, mailbox });
      setMessages(r.data?.messages || []);
      setTotal(r.data?.total || 0);
      setUnread(r.data?.unread || 0);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Could not load mail');
    } finally {
      setLoading(false);
    }
  }, [folder, page, search, mailbox]);

  useEffect(() => { load(); }, [load]);

  const defaultFrom = mailbox || mailboxes[0]?.address || '';

  const openMessage = async (m) => {
    setActiveLoading(true);
    setActive({ ...m });
    try {
      const r = await adminAPI.getMailMessage(m.id);
      setActive(r.data);
      if (folder === 'inbox' && !m.read) {
        setMessages(prev => prev.map(x => x.id === m.id ? { ...x, read: true } : x));
        setUnread(u => Math.max(0, u - 1));
      }
    } catch (e) {
      toast.error('Could not open message');
    } finally {
      setActiveLoading(false);
    }
  };

  const runSearch = (e) => { e?.preventDefault(); setPage(1); setSearch(q.trim()); };

  const doSync = async () => {
    setSyncing(true);
    try {
      const r = await adminAPI.syncMail();
      if (r.data?.error) toast.error(`Sync error: ${r.data.error}`);
      else toast.success(r.data?.ingested ? `${r.data.ingested} new message(s)` : 'No new mail');
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const doDelete = async (m, hard = false) => {
    const permanent = hard || folder === 'trash';
    if (permanent && !window.confirm('Permanently delete this message? This cannot be undone.')) return;
    try {
      await adminAPI.deleteMailMessage(m.id, hard);
      toast.success(permanent ? 'Deleted' : 'Moved to Trash');
      if (active?.id === m.id) setActive(null);
      await load();
    } catch (e) {
      toast.error('Delete failed');
    }
  };

  const toggleRead = async (m) => {
    const next = !m.read;
    try {
      await adminAPI.setMailRead(m.id, next);
      setMessages(prev => prev.map(x => x.id === m.id ? { ...x, read: next } : x));
      if (folder === 'inbox') setUnread(u => Math.max(0, u + (next ? -1 : 1)));
      if (active?.id === m.id) setActive(a => ({ ...a, read: next }));
    } catch (e) { toast.error('Failed to update'); }
  };

  const downloadAttachment = async (m, idx, att) => {
    try {
      const r = await adminAPI.downloadMailAttachment(m.id, idx);
      const url = window.URL.createObjectURL(new Blob([r.data], { type: att.content_type || 'application/octet-stream' }));
      const a = document.createElement('a');
      a.href = url; a.download = att.filename || `attachment-${idx}`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) { toast.error('Could not download attachment'); }
  };

  const startReply = (m, all = false) => {
    const to = m.from_email || '';
    const cc = all ? (m.cc || []).map(c => c.email).filter(e => e && e !== to).join(', ') : '';
    setCompose({
      from: m.mailbox || defaultFrom, to, cc, bcc: '',
      subject: m.subject?.match(/^re:/i) ? m.subject : `Re: ${m.subject || ''}`,
      body_html: `<br><br><blockquote style="border-left:3px solid #ccc;padding-left:12px;color:#666">On ${m.date || ''}, ${m.from_name || m.from_email} wrote:<br>${m.body_html || m.body_text || ''}</blockquote>`,
      attachments: [],
      in_reply_to: m.message_id || '',
      references: [...(m.references || []), m.message_id].filter(Boolean),
    });
  };

  const startForward = (m) => {
    setCompose({
      from: m.mailbox || defaultFrom, to: '', cc: '', bcc: '',
      subject: m.subject?.match(/^fwd:/i) ? m.subject : `Fwd: ${m.subject || ''}`,
      body_html: `<br><br>---------- Forwarded message ----------<br>From: ${m.from_name || ''} &lt;${m.from_email || ''}&gt;<br>Subject: ${m.subject || ''}<br><br>${m.body_html || m.body_text || ''}`,
      attachments: [],
      in_reply_to: '', references: [],
    });
  };

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div data-testid="mail-manager">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Mail className="w-6 h-6" style={{ color: v('accent', '#0D9488') }} />
          <h1 className="text-xl font-bold" style={{ color: v('heading', '#1a2332') }}>Mail</h1>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && mailboxes.length > 1 && (
            <select value={mailbox} onChange={e => { setMailbox(e.target.value); setPage(1); setActive(null); }}
              className="text-sm px-2 py-2 rounded-sm border bg-white"
              style={{ borderColor: v('navbar-border', '#e2e8f0'), color: v('text-secondary', '#475569') }}
              data-testid="mail-mailbox-switch">
              <option value="">All mailboxes</option>
              {mailboxes.map(mb => <option key={mb.address} value={mb.address}>{mb.address}</option>)}
            </select>
          )}
          <button onClick={doSync} disabled={syncing}
            className="flex items-center gap-2 px-3 py-2 rounded-sm text-sm font-medium border"
            style={{ borderColor: v('navbar-border', '#e2e8f0'), color: v('text-secondary', '#475569') }}
            data-testid="mail-sync-btn">
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Sync
          </button>
          {isAdmin && (
            <button onClick={() => setShowSettings(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-sm text-sm font-medium border"
              style={{ borderColor: v('navbar-border', '#e2e8f0'), color: v('text-secondary', '#475569') }}
              data-testid="mail-settings-btn">
              <Settings className="w-4 h-4" /> Settings
            </button>
          )}
          <button onClick={() => setCompose({ from: defaultFrom, to: '', cc: '', bcc: '', subject: '', body_html: '', attachments: [], in_reply_to: '', references: [] })}
            className="flex items-center gap-2 px-3 py-2 rounded-sm text-sm font-semibold text-white"
            style={{ backgroundColor: v('accent', '#0D9488') }}
            data-testid="mail-compose-btn">
            <Send className="w-4 h-4" /> Compose
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[180px_minmax(0,1fr)] gap-4">
        {/* Folder rail */}
        <div className="flex md:flex-col gap-1">
          {FOLDERS.map(f => {
            const Icon = f.icon;
            const sel = folder === f.key;
            return (
              <button key={f.key}
                onClick={() => { setFolder(f.key); setPage(1); setActive(null); }}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-sm text-sm font-medium w-full"
                style={sel
                  ? { backgroundColor: `${v('accent', '#0D9488')}15`, color: v('accent', '#0D9488') }
                  : { color: v('text-secondary', '#475569') }}
                data-testid={`mail-folder-${f.key}`}>
                <span className="flex items-center gap-2"><Icon className="w-4 h-4" /> {f.label}</span>
                {f.key === 'inbox' && unread > 0 && (
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: v('accent', '#0D9488') }}>{unread}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* List + read pane */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-w-0">
          {/* List */}
          <div className="border rounded-sm overflow-hidden bg-white" style={{ borderColor: v('navbar-border', '#e2e8f0') }}>
            <form onSubmit={runSearch} className="flex items-center gap-2 p-2 border-b" style={{ borderColor: v('navbar-border', '#e2e8f0') }}>
              <Search className="w-4 h-4 flex-shrink-0" style={{ color: v('text-secondary', '#94a3b8') }} />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search mail…"
                className="flex-1 text-sm outline-none bg-transparent" data-testid="mail-search-input" />
              {search && <button type="button" onClick={() => { setQ(''); setSearch(''); setPage(1); }}><X className="w-4 h-4 text-slate-400" /></button>}
            </form>

            {loading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
            ) : messages.length === 0 ? (
              <div className="text-center py-16 text-sm" style={{ color: v('text-secondary', '#94a3b8') }}>
                <Inbox className="w-8 h-8 mx-auto mb-2 opacity-40" />
                No messages{search ? ' match your search' : ''}.
              </div>
            ) : (
              <ul className="divide-y" style={{ borderColor: v('navbar-border', '#e2e8f0') }}>
                {messages.map(m => {
                  const sel = active?.id === m.id;
                  const who = folder === 'sent'
                    ? (m.to || []).map(t => t.name || t.email).join(', ')
                    : (m.from_name || m.from_email);
                  return (
                    <li key={m.id}>
                      <button onClick={() => openMessage(m)}
                        className="w-full text-left px-3 py-2.5 flex flex-col gap-0.5 transition-colors"
                        style={{ backgroundColor: sel ? `${v('accent', '#0D9488')}10` : (m.read ? 'transparent' : 'rgba(13,148,136,0.04)') }}
                        data-testid={`mail-row-${m.id}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-sm truncate ${m.read ? '' : 'font-bold'}`} style={{ color: v('heading', '#1a2332') }}>
                            {!m.read && folder === 'inbox' && <CircleDot className="inline w-3 h-3 mr-1" style={{ color: v('accent', '#0D9488') }} />}
                            {who || '(unknown)'}
                          </span>
                          <span className="text-xs flex-shrink-0" style={{ color: v('text-secondary', '#94a3b8') }}>{fmtDate(m.received_at || m.date)}</span>
                        </div>
                        <div className={`text-sm truncate ${m.read ? '' : 'font-semibold'}`} style={{ color: v('text-secondary', '#475569') }}>
                          {m.has_attachments && <Paperclip className="inline w-3 h-3 mr-1" />}
                          {m.subject || '(no subject)'}
                        </div>
                        <div className="text-xs truncate" style={{ color: v('text-secondary', '#94a3b8') }}>{m.snippet}</div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Pager */}
            {total > LIMIT && (
              <div className="flex items-center justify-between p-2 border-t text-xs" style={{ borderColor: v('navbar-border', '#e2e8f0'), color: v('text-secondary', '#475569') }}>
                <span>{(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}</span>
                <div className="flex gap-1">
                  <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                  <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-1 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </div>

          {/* Read pane */}
          <div className="border rounded-sm bg-white min-h-[300px]" style={{ borderColor: v('navbar-border', '#e2e8f0') }}>
            {!active ? (
              <div className="flex flex-col items-center justify-center h-full py-20 text-sm" style={{ color: v('text-secondary', '#94a3b8') }}>
                <Mail className="w-10 h-10 mb-2 opacity-30" />
                Select a message to read
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="p-4 border-b" style={{ borderColor: v('navbar-border', '#e2e8f0') }}>
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-base font-bold" style={{ color: v('heading', '#1a2332') }}>{active.subject || '(no subject)'}</h2>
                    <button onClick={() => setActive(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="mt-1 text-sm" style={{ color: v('text-secondary', '#475569') }}>
                    <span className="font-medium">{active.from_name || active.from_email}</span>
                    {active.from_name && <span className="text-slate-400"> &lt;{active.from_email}&gt;</span>}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: v('text-secondary', '#94a3b8') }}>
                    To: {(active.to || []).map(t => t.email).join(', ') || '—'}
                    {active.cc?.length ? ` · Cc: ${active.cc.map(c => c.email).join(', ')}` : ''}
                    {active.date ? ` · ${active.date}` : ''}
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <button onClick={() => startReply(active)} className="flex items-center gap-1 text-xs px-2 py-1 rounded-sm border" style={{ borderColor: v('navbar-border', '#e2e8f0'), color: v('text-secondary', '#475569') }}><Reply className="w-3 h-3" /> Reply</button>
                    {(active.cc?.length > 0 || active.to?.length > 1) && <button onClick={() => startReply(active, true)} className="flex items-center gap-1 text-xs px-2 py-1 rounded-sm border" style={{ borderColor: v('navbar-border', '#e2e8f0'), color: v('text-secondary', '#475569') }}><Reply className="w-3 h-3" /> Reply all</button>}
                    <button onClick={() => startForward(active)} className="flex items-center gap-1 text-xs px-2 py-1 rounded-sm border" style={{ borderColor: v('navbar-border', '#e2e8f0'), color: v('text-secondary', '#475569') }}><Forward className="w-3 h-3" /> Forward</button>
                    <button onClick={() => toggleRead(active)} className="flex items-center gap-1 text-xs px-2 py-1 rounded-sm border" style={{ borderColor: v('navbar-border', '#e2e8f0'), color: v('text-secondary', '#475569') }}>{active.read ? 'Mark unread' : 'Mark read'}</button>
                    <button onClick={() => doDelete(active)} className="flex items-center gap-1 text-xs px-2 py-1 rounded-sm border text-red-600 ml-auto" style={{ borderColor: '#fecaca' }}><Trash2 className="w-3 h-3" /> {folder === 'trash' ? 'Delete forever' : 'Delete'}</button>
                  </div>
                </div>
                {/* Attachments */}
                {active.attachments?.length > 0 && (
                  <div className="px-4 py-2 border-b flex flex-wrap gap-2" style={{ borderColor: v('navbar-border', '#e2e8f0') }}>
                    {active.attachments.map((att, i) => (
                      <button key={i} onClick={() => active.folder === 'sent' ? null : downloadAttachment(active, i, att)}
                        className="flex items-center gap-2 text-xs px-2 py-1 rounded-sm border" style={{ borderColor: v('navbar-border', '#e2e8f0'), color: v('text-secondary', '#475569') }}>
                        <Paperclip className="w-3 h-3" /> {att.filename} <span className="text-slate-400">{fmtSize(att.size)}</span>
                      </button>
                    ))}
                  </div>
                )}
                {/* Body */}
                <div className="p-4 overflow-auto flex-1">
                  {activeLoading ? (
                    <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
                  ) : active.body_html ? (
                    <div className="prose prose-sm max-w-none text-sm" dangerouslySetInnerHTML={{ __html: active.body_html }} />
                  ) : (
                    <pre className="whitespace-pre-wrap text-sm font-sans" style={{ color: v('text-secondary', '#475569') }}>{active.body_text || '(empty message)'}</pre>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {compose && <ComposeModal draft={compose} mailboxes={mailboxes} onClose={() => setCompose(null)} onSent={() => { setCompose(null); if (folder === 'sent') load(); }} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}

/* ── Compose modal ─────────────────────────────────────────────────────────── */
function ComposeModal({ draft, mailboxes = [], onClose, onSent }) {
  const [form, setForm] = useState(draft);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const set = (k, val) => setForm(f => ({ ...f, [k]: val }));

  const addFiles = async (files) => {
    setUploading(true);
    const added = [];
    for (const file of files) {
      try {
        const r = await adminAPI.uploadFile(file);
        added.push({ url: r.data.url, name: r.data.original_name, size: r.data.size, content_type: r.data.content_type });
      } catch (e) { toast.error(`Failed to upload ${file.name}`); }
    }
    set('attachments', [...(form.attachments || []), ...added]);
    setUploading(false);
  };

  const send = async () => {
    if (!form.to.trim()) { toast.error('At least one recipient is required'); return; }
    setSending(true);
    try {
      await adminAPI.sendMail({
        from: form.from || '',
        to: form.to, cc: form.cc, bcc: form.bcc,
        subject: form.subject, body_html: form.body_html,
        attachments: form.attachments,
        in_reply_to: form.in_reply_to, references: form.references,
      });
      toast.success('Message sent');
      onSent();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Send failed');
    } finally {
      setSending(false);
    }
  };

  const inputCls = "w-full text-sm px-3 py-2 border rounded-sm outline-none";
  const inputStyle = { borderColor: v('navbar-border', '#e2e8f0') };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-md w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()} data-testid="mail-compose-modal">
        <div className="flex items-center justify-between p-4 border-b" style={inputStyle}>
          <h2 className="font-bold" style={{ color: v('heading', '#1a2332') }}>New message</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="p-4 space-y-2 overflow-auto flex-1">
          {mailboxes.length > 1 ? (
            <select className={inputCls} style={inputStyle} value={form.from || ''} onChange={e => set('from', e.target.value)} data-testid="mail-compose-from">
              {mailboxes.map(mb => <option key={mb.address} value={mb.address}>From: {mb.address}</option>)}
            </select>
          ) : form.from ? (
            <div className="text-xs px-1" style={{ color: v('text-secondary', '#94a3b8') }}>From: <span className="font-medium">{form.from}</span></div>
          ) : null}
          <input className={inputCls} style={inputStyle} placeholder="To (comma-separated)" value={form.to} onChange={e => set('to', e.target.value)} data-testid="mail-compose-to" />
          <div className="grid grid-cols-2 gap-2">
            <input className={inputCls} style={inputStyle} placeholder="Cc" value={form.cc} onChange={e => set('cc', e.target.value)} />
            <input className={inputCls} style={inputStyle} placeholder="Bcc" value={form.bcc} onChange={e => set('bcc', e.target.value)} />
          </div>
          <input className={inputCls} style={inputStyle} placeholder="Subject" value={form.subject} onChange={e => set('subject', e.target.value)} data-testid="mail-compose-subject" />
          <RichTextEditor value={form.body_html} onChange={(val) => set('body_html', val)} placeholder="Write your message…" />
          {/* Attachments */}
          <div className="flex flex-wrap items-center gap-2">
            {(form.attachments || []).map((a, i) => (
              <span key={i} className="flex items-center gap-1 text-xs px-2 py-1 rounded-sm border" style={inputStyle}>
                <Paperclip className="w-3 h-3" /> {a.name}
                <button onClick={() => set('attachments', form.attachments.filter((_, j) => j !== i))}><X className="w-3 h-3 text-slate-400" /></button>
              </span>
            ))}
            <input ref={fileRef} type="file" multiple className="hidden" onChange={e => { addFiles(Array.from(e.target.files)); e.target.value = ''; }} />
            <button onClick={() => fileRef.current?.click()} disabled={uploading} className="flex items-center gap-1 text-xs px-2 py-1 rounded-sm border" style={inputStyle}>
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Paperclip className="w-3 h-3" />} Attach
            </button>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 p-4 border-t" style={inputStyle}>
          <button onClick={onClose} className="px-3 py-2 text-sm rounded-sm border" style={inputStyle}>Cancel</button>
          <button onClick={send} disabled={sending} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-sm" style={{ backgroundColor: v('accent', '#0D9488') }} data-testid="mail-compose-send">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Settings modal ────────────────────────────────────────────────────────── */
const SETTINGS_FIELDS = [
  { key: 'enabled', label: 'Enable inbound polling', type: 'bool', hint: 'When on, the server polls the S3 bucket for new mail.' },
  { key: 'region', label: 'AWS region', placeholder: 'us-east-2' },
  { key: 's3_bucket', label: 'S3 bucket', placeholder: 'aux-mail-carlosartiles' },
  { key: 's3_prefix', label: 'S3 prefix', placeholder: 'inbox/' },
  { key: 'aws_access_key_id', label: 'AWS access key ID' },
  { key: 'aws_secret_access_key', label: 'AWS secret access key', type: 'password' },
  { key: 'inbox_address', label: 'Mailbox address (From)', placeholder: 'info@carlosartiles.com' },
  { key: 'from_name', label: 'From display name', placeholder: 'Carlos Artiles' },
  { key: 'poll_seconds', label: 'Poll interval (seconds)', type: 'number', placeholder: '60' },
  { key: 'forward_enabled', label: 'Forward a copy to Gmail', type: 'bool', hint: 'Re-send incoming mail to a personal inbox (Tier 1).' },
  { key: 'forward_copy_to', label: 'Forward copy to', placeholder: 'me@gmail.com' },
  { key: 'bcc', label: 'Always BCC', placeholder: 'archive@brand.com', hint: 'Optional: BCC every outbound message for audit.' },
];

function SettingsModal({ onClose }) {
  const [cfg, setCfg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const set = (k, val) => setCfg(c => ({ ...c, [k]: val }));

  useEffect(() => {
    (async () => {
      try {
        const r = await adminAPI.getMailConfig();
        setCfg(r.data || {});
      } catch (e) { toast.error('Could not load mail settings'); setCfg({}); }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await adminAPI.updateMailConfig(cfg);
      toast.success('Mail settings saved');
      onClose();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Save failed'); }
    finally { setSaving(false); }
  };

  const test = async () => {
    setTesting(true);
    try {
      const r = await adminAPI.testMailConnection(cfg);
      if (r.data?.ok) toast.success(`Connected — ${r.data.object_count} object(s) in bucket`);
      else toast.error(`Connection failed: ${r.data?.error || 'unknown'}`);
    } catch (e) { toast.error('Test failed'); }
    finally { setTesting(false); }
  };

  const inputStyle = { borderColor: v('navbar-border', '#e2e8f0') };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-md w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()} data-testid="mail-settings-modal">
        <div className="flex items-center justify-between p-4 border-b" style={inputStyle}>
          <h2 className="font-bold flex items-center gap-2" style={{ color: v('heading', '#1a2332') }}><Settings className="w-4 h-4" /> Mail settings</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="p-4 space-y-3 overflow-auto flex-1">
          {!cfg ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
          ) : SETTINGS_FIELDS.map(f => (
            <div key={f.key}>
              {f.type === 'bool' ? (
                <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: v('heading', '#1a2332') }}>
                  <input type="checkbox" checked={!!cfg[f.key]} onChange={e => set(f.key, e.target.checked)} />
                  {f.label}
                </label>
              ) : (
                <>
                  <label className="block text-xs font-medium mb-1" style={{ color: v('text-secondary', '#475569') }}>{f.label}</label>
                  <input
                    type={f.type === 'password' ? 'password' : f.type === 'number' ? 'number' : 'text'}
                    className="w-full text-sm px-3 py-2 border rounded-sm outline-none" style={inputStyle}
                    placeholder={f.placeholder || ''}
                    value={cfg[f.key] ?? ''}
                    onChange={e => set(f.key, f.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
                    autoComplete={f.type === 'password' ? 'new-password' : 'off'}
                  />
                </>
              )}
              {f.hint && <p className="text-xs mt-0.5" style={{ color: v('text-secondary', '#94a3b8') }}>{f.hint}</p>}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2 p-4 border-t" style={inputStyle}>
          <button onClick={test} disabled={testing || !cfg} className="flex items-center gap-2 px-3 py-2 text-sm rounded-sm border" style={inputStyle} data-testid="mail-test-connection">
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plug className="w-4 h-4" />} Test connection
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-2 text-sm rounded-sm border" style={inputStyle}>Cancel</button>
            <button onClick={save} disabled={saving || !cfg} className="px-4 py-2 text-sm font-semibold text-white rounded-sm" style={{ backgroundColor: v('accent', '#0D9488') }} data-testid="mail-settings-save">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
