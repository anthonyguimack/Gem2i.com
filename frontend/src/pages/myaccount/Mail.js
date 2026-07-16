import React, { useState, useEffect, useCallback, useRef } from 'react';
import { memberAPI } from '../../lib/api';
import { toast } from 'sonner';
import {
  Mail as MailIcon, Inbox, Send, Trash2, RefreshCw, Search, Loader2, X,
  Paperclip, Reply, Forward, ChevronLeft, ChevronRight, CircleDot, ShieldAlert,
} from 'lucide-react';

/**
 * My Account → Mail — member-facing webmail, scoped to the member's OWN mailbox
 * (backend /api/member/mail/*, isolation enforced server-side). Styled entirely
 * from the My Account palette (Settings → Colors → My Account, the --ma-* CSS
 * variables) so it matches the rest of the portal in any theme/scheme.
 */
const FOLDERS = [
  { key: 'inbox', label: 'Inbox', icon: Inbox },
  { key: 'sent', label: 'Sent', icon: Send },
  { key: 'trash', label: 'Trash', icon: Trash2 },
];

const v = (name, fallback) => `var(--ma-${name}, ${fallback})`;

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

function escapeHtml(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function textToHtml(s) {
  return escapeHtml(s).replace(/\n/g, '<br>');
}
function htmlToText(html) {
  const el = document.createElement('div');
  el.innerHTML = html || '';
  return el.textContent || el.innerText || '';
}

export default function MemberMail() {
  const [folder, setFolder] = useState('inbox');
  const [messages, setMessages] = useState([]);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [activeLoading, setActiveLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [compose, setCompose] = useState(null);
  const [mailboxes, setMailboxes] = useState([]);
  const LIMIT = 30;

  const fromAddr = mailboxes[0]?.address || '';

  useEffect(() => {
    memberAPI.listMailboxes().then(r => setMailboxes(r.data || [])).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await memberAPI.listMail({ folder, page, limit: LIMIT, q: search });
      setMessages(r.data?.messages || []);
      setTotal(r.data?.total || 0);
      setUnread(r.data?.unread || 0);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Could not load mail');
    } finally {
      setLoading(false);
    }
  }, [folder, page, search]);

  useEffect(() => { load(); }, [load]);

  const openMessage = async (m) => {
    setActiveLoading(true);
    setActive({ ...m });
    try {
      const r = await memberAPI.getMail(m.id);
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
      const r = await memberAPI.syncMail();
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
      await memberAPI.deleteMail(m.id, hard);
      toast.success(permanent ? 'Deleted' : 'Moved to Trash');
      if (active?.id === m.id) setActive(null);
      await load();
    } catch (e) { toast.error('Delete failed'); }
  };

  const toggleRead = async (m) => {
    const next = !m.read;
    try {
      await memberAPI.setMailRead(m.id, next);
      setMessages(prev => prev.map(x => x.id === m.id ? { ...x, read: next } : x));
      if (folder === 'inbox') setUnread(u => Math.max(0, u + (next ? -1 : 1)));
      if (active?.id === m.id) setActive(a => ({ ...a, read: next }));
    } catch (e) { toast.error('Failed to update'); }
  };

  const downloadAttachment = async (m, idx, att) => {
    try {
      const r = await memberAPI.downloadMailAttachment(m.id, idx);
      const url = window.URL.createObjectURL(new Blob([r.data], { type: att.content_type || 'application/octet-stream' }));
      const a = document.createElement('a');
      a.href = url; a.download = att.filename || `attachment-${idx}`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) { toast.error('Could not download attachment'); }
  };

  const startReply = (m) => {
    const quoted = `\n\n----- On ${m.date || ''}, ${m.from_name || m.from_email} wrote -----\n${htmlToText(m.body_html || m.body_text || '')}`;
    setCompose({
      to: m.from_email || '', cc: '', bcc: '',
      subject: m.subject?.match(/^re:/i) ? m.subject : `Re: ${m.subject || ''}`,
      body: quoted, attachments: [],
      in_reply_to: m.message_id || '',
      references: [...(m.references || []), m.message_id].filter(Boolean),
    });
  };

  const startForward = (m) => {
    const quoted = `\n\n---------- Forwarded message ----------\nFrom: ${m.from_name || ''} <${m.from_email || ''}>\nSubject: ${m.subject || ''}\n\n${htmlToText(m.body_html || m.body_text || '')}`;
    setCompose({
      to: '', cc: '', bcc: '',
      subject: m.subject?.match(/^fwd:/i) ? m.subject : `Fwd: ${m.subject || ''}`,
      body: quoted, attachments: [], in_reply_to: '', references: [],
    });
  };

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const card = { backgroundColor: v('card-bg', '#13161e'), border: `1px solid ${v('card-border', 'rgba(255,255,255,0.06)')}` };
  const btnGhost = { border: `1px solid ${v('card-border', 'rgba(255,255,255,0.12)')}`, color: v('text-secondary', '#9ca3af') };

  return (
    <div data-testid="member-mail">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: v('text-primary', '#ffffff'), fontFamily: "'DM Serif Display', serif" }}>
            <MailIcon className="w-6 h-6" style={{ color: v('accent', '#c9a84c') }} /> Mail
          </h1>
          {fromAddr && <p className="text-sm mt-0.5" style={{ color: v('text-muted', '#6b7280') }}>{fromAddr}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={doSync} disabled={syncing}
            className="flex items-center gap-2 px-3 py-2 rounded text-sm font-medium" style={btnGhost} data-testid="member-mail-sync">
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Sync
          </button>
          <button onClick={() => setCompose({ to: '', cc: '', bcc: '', subject: '', body: '', attachments: [], in_reply_to: '', references: [] })}
            className="flex items-center gap-2 px-4 py-2 rounded text-sm font-semibold"
            style={{ backgroundColor: v('button-bg', v('accent', '#c9a84c')), color: v('button-text', '#0d0f14') }} data-testid="member-mail-compose">
            <Send className="w-4 h-4" /> Compose
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[160px_minmax(0,1fr)] gap-4">
        {/* Folder rail */}
        <div className="flex md:flex-col gap-1">
          {FOLDERS.map(f => {
            const Icon = f.icon; const sel = folder === f.key;
            return (
              <button key={f.key} onClick={() => { setFolder(f.key); setPage(1); setActive(null); }}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded text-sm font-medium w-full"
                style={sel ? { backgroundColor: v('sidebar-active-bg', 'rgba(201,168,76,0.1)'), color: v('sidebar-active-text', '#c9a84c') } : { color: v('text-secondary', '#9ca3af') }}
                data-testid={`member-mail-folder-${f.key}`}>
                <span className="flex items-center gap-2"><Icon className="w-4 h-4" /> {f.label}</span>
                {f.key === 'inbox' && unread > 0 && (
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: v('accent', '#c9a84c'), color: v('button-text', '#0d0f14') }}>{unread}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* List + read pane */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-w-0">
          {/* List */}
          <div className="rounded-lg overflow-hidden" style={card}>
            <form onSubmit={runSearch} className="flex items-center gap-2 p-2" style={{ borderBottom: `1px solid ${v('card-border', 'rgba(255,255,255,0.06)')}` }}>
              <Search className="w-4 h-4 flex-shrink-0" style={{ color: v('text-muted', '#6b7280') }} />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search mail…"
                className="flex-1 text-sm outline-none bg-transparent" style={{ color: v('text-primary', '#fff') }} data-testid="member-mail-search" />
              {search && <button type="button" onClick={() => { setQ(''); setSearch(''); setPage(1); }}><X className="w-4 h-4" style={{ color: v('text-muted', '#6b7280') }} /></button>}
            </form>

            {loading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" style={{ color: v('accent', '#c9a84c') }} /></div>
            ) : messages.length === 0 ? (
              <div className="text-center py-16 text-sm" style={{ color: v('text-muted', '#6b7280') }}>
                <Inbox className="w-8 h-8 mx-auto mb-2 opacity-40" />
                No messages{search ? ' match your search' : ''}.
              </div>
            ) : (
              <ul>
                {messages.map(m => {
                  const sel = active?.id === m.id;
                  const who = folder === 'sent' ? (m.to || []).map(t => t.name || t.email).join(', ') : (m.from_name || m.from_email);
                  return (
                    <li key={m.id} style={{ borderBottom: `1px solid ${v('card-border', 'rgba(255,255,255,0.05)')}` }}>
                      <button onClick={() => openMessage(m)} className="w-full text-left px-3 py-2.5 flex flex-col gap-0.5 transition-colors"
                        style={{ backgroundColor: sel ? v('sidebar-active-bg', 'rgba(201,168,76,0.08)') : 'transparent' }}
                        data-testid={`member-mail-row-${m.id}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-sm truncate ${m.read ? '' : 'font-bold'}`} style={{ color: v('text-primary', '#ffffff') }}>
                            {!m.read && folder === 'inbox' && <CircleDot className="inline w-3 h-3 mr-1" style={{ color: v('accent', '#c9a84c') }} />}
                            {m.suspicious && <ShieldAlert className="inline w-3 h-3 mr-1 text-amber-500" />}
                            {who || '(unknown)'}
                          </span>
                          <span className="text-xs flex-shrink-0" style={{ color: v('text-muted', '#6b7280') }}>{fmtDate(m.received_at || m.date)}</span>
                        </div>
                        <div className={`text-sm truncate ${m.read ? '' : 'font-semibold'}`} style={{ color: v('text-secondary', '#9ca3af') }}>
                          {m.has_attachments && <Paperclip className="inline w-3 h-3 mr-1" />}
                          {m.subject || '(no subject)'}
                        </div>
                        <div className="text-xs truncate" style={{ color: v('text-muted', '#6b7280') }}>{m.snippet}</div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {total > LIMIT && (
              <div className="flex items-center justify-between p-2 text-xs" style={{ borderTop: `1px solid ${v('card-border', 'rgba(255,255,255,0.06)')}`, color: v('text-secondary', '#9ca3af') }}>
                <span>{(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}</span>
                <div className="flex gap-1">
                  <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                  <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-1 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </div>

          {/* Read pane */}
          <div className="rounded-lg min-h-[300px]" style={card}>
            {!active ? (
              <div className="flex flex-col items-center justify-center h-full py-20 text-sm" style={{ color: v('text-muted', '#6b7280') }}>
                <MailIcon className="w-10 h-10 mb-2 opacity-30" /> Select a message to read
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="p-4" style={{ borderBottom: `1px solid ${v('card-border', 'rgba(255,255,255,0.06)')}` }}>
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-base font-bold" style={{ color: v('text-primary', '#ffffff') }}>{active.subject || '(no subject)'}</h2>
                    <button onClick={() => setActive(null)}><X className="w-4 h-4" style={{ color: v('text-muted', '#6b7280') }} /></button>
                  </div>
                  {active.suspicious && (
                    <div className="mt-2 text-xs flex items-center gap-1 px-2 py-1 rounded" style={{ backgroundColor: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                      <ShieldAlert className="w-3 h-3" /> This message failed spam/authentication checks — treat links and attachments with caution.
                    </div>
                  )}
                  <div className="mt-1 text-sm" style={{ color: v('text-secondary', '#9ca3af') }}>
                    <span className="font-medium">{active.from_name || active.from_email}</span>
                    {active.from_name && <span style={{ color: v('text-muted', '#6b7280') }}> &lt;{active.from_email}&gt;</span>}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: v('text-muted', '#6b7280') }}>
                    To: {(active.to || []).map(t => t.email).join(', ') || '—'}
                    {active.cc?.length ? ` · Cc: ${active.cc.map(c => c.email).join(', ')}` : ''}
                    {active.date ? ` · ${active.date}` : ''}
                  </div>
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <button onClick={() => startReply(active)} className="flex items-center gap-1 text-xs px-2 py-1 rounded" style={btnGhost}><Reply className="w-3 h-3" /> Reply</button>
                    <button onClick={() => startForward(active)} className="flex items-center gap-1 text-xs px-2 py-1 rounded" style={btnGhost}><Forward className="w-3 h-3" /> Forward</button>
                    <button onClick={() => toggleRead(active)} className="flex items-center gap-1 text-xs px-2 py-1 rounded" style={btnGhost}>{active.read ? 'Mark unread' : 'Mark read'}</button>
                    <button onClick={() => doDelete(active)} className="flex items-center gap-1 text-xs px-2 py-1 rounded text-red-400 ml-auto" style={{ border: '1px solid rgba(248,113,113,0.4)' }}><Trash2 className="w-3 h-3" /> {folder === 'trash' ? 'Delete forever' : 'Delete'}</button>
                  </div>
                </div>
                {active.attachments?.length > 0 && (
                  <div className="px-4 py-2 flex flex-wrap gap-2" style={{ borderBottom: `1px solid ${v('card-border', 'rgba(255,255,255,0.06)')}` }}>
                    {active.attachments.map((att, i) => (
                      <button key={i} onClick={() => active.folder === 'sent' ? null : downloadAttachment(active, i, att)}
                        className="flex items-center gap-2 text-xs px-2 py-1 rounded" style={btnGhost}>
                        <Paperclip className="w-3 h-3" /> {att.filename} <span style={{ color: v('text-muted', '#6b7280') }}>{fmtSize(att.size)}</span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="p-4 overflow-auto flex-1" style={{ color: v('text-secondary', '#cbd5e1') }}>
                  {activeLoading ? (
                    <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" style={{ color: v('accent', '#c9a84c') }} /></div>
                  ) : active.body_html ? (
                    <div className="text-sm rich-text-content" dangerouslySetInnerHTML={{ __html: active.body_html }} />
                  ) : (
                    <pre className="whitespace-pre-wrap text-sm font-sans">{active.body_text || '(empty message)'}</pre>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {compose && <ComposeModal draft={compose} fromAddr={fromAddr} onClose={() => setCompose(null)} onSent={() => { setCompose(null); if (folder === 'sent') load(); }} />}
    </div>
  );
}

/* ── Compose modal (--ma- themed) ──────────────────────────────────────────── */
function ComposeModal({ draft, fromAddr, onClose, onSent }) {
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
        const r = await memberAPI.uploadFile(file);
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
      await memberAPI.sendMail({
        to: form.to, cc: form.cc, bcc: form.bcc,
        subject: form.subject, body_html: textToHtml(form.body),
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

  const inputCls = "w-full text-sm px-3 py-2 rounded outline-none";
  const inputStyle = { backgroundColor: v('input-bg', 'rgba(255,255,255,0.04)'), border: `1px solid ${v('input-border', 'rgba(255,255,255,0.12)')}`, color: v('text-primary', '#fff') };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col" style={{ backgroundColor: v('card-bg', '#13161e'), border: `1px solid ${v('card-border', 'rgba(255,255,255,0.1)')}` }} onClick={e => e.stopPropagation()} data-testid="member-mail-compose-modal">
        <div className="flex items-center justify-between p-4" style={{ borderBottom: `1px solid ${v('card-border', 'rgba(255,255,255,0.08)')}` }}>
          <h2 className="font-bold" style={{ color: v('text-primary', '#fff') }}>New message</h2>
          <button onClick={onClose}><X className="w-5 h-5" style={{ color: v('text-muted', '#6b7280') }} /></button>
        </div>
        <div className="p-4 space-y-2 overflow-auto flex-1">
          {fromAddr && <div className="text-xs px-1" style={{ color: v('text-muted', '#6b7280') }}>From: <span className="font-medium" style={{ color: v('text-secondary', '#9ca3af') }}>{fromAddr}</span></div>}
          <input className={inputCls} style={inputStyle} placeholder="To (comma-separated)" value={form.to} onChange={e => set('to', e.target.value)} data-testid="member-mail-to" />
          <div className="grid grid-cols-2 gap-2">
            <input className={inputCls} style={inputStyle} placeholder="Cc" value={form.cc} onChange={e => set('cc', e.target.value)} />
            <input className={inputCls} style={inputStyle} placeholder="Bcc" value={form.bcc} onChange={e => set('bcc', e.target.value)} />
          </div>
          <input className={inputCls} style={inputStyle} placeholder="Subject" value={form.subject} onChange={e => set('subject', e.target.value)} data-testid="member-mail-subject" />
          <textarea className={inputCls} style={{ ...inputStyle, minHeight: 200, resize: 'vertical' }} placeholder="Write your message…" value={form.body} onChange={e => set('body', e.target.value)} data-testid="member-mail-body" />
          <div className="flex flex-wrap items-center gap-2">
            {(form.attachments || []).map((a, i) => (
              <span key={i} className="flex items-center gap-1 text-xs px-2 py-1 rounded" style={inputStyle}>
                <Paperclip className="w-3 h-3" /> {a.name}
                <button onClick={() => set('attachments', form.attachments.filter((_, j) => j !== i))}><X className="w-3 h-3" /></button>
              </span>
            ))}
            <input ref={fileRef} type="file" multiple className="hidden" onChange={e => { addFiles(Array.from(e.target.files)); e.target.value = ''; }} />
            <button onClick={() => fileRef.current?.click()} disabled={uploading} className="flex items-center gap-1 text-xs px-2 py-1 rounded" style={inputStyle}>
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Paperclip className="w-3 h-3" />} Attach
            </button>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 p-4" style={{ borderTop: `1px solid ${v('card-border', 'rgba(255,255,255,0.08)')}` }}>
          <button onClick={onClose} className="px-3 py-2 text-sm rounded" style={{ border: `1px solid ${v('card-border', 'rgba(255,255,255,0.12)')}`, color: v('text-secondary', '#9ca3af') }}>Cancel</button>
          <button onClick={send} disabled={sending} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded" style={{ backgroundColor: v('button-bg', v('accent', '#c9a84c')), color: v('button-text', '#0d0f14') }} data-testid="member-mail-send">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send
          </button>
        </div>
      </div>
    </div>
  );
}
