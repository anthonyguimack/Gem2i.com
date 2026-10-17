import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useMember } from '../../lib/memberAuth';
import { memberAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Key, Send, Loader2, Copy, Check, QrCode, Download, Eye, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { useDataTable, Ma2TableToolbar, Ma2SortableTh, Ma2Th, Ma2Pagination, Ma2NoResults } from './components/DataTable';

// Module-level so the hook's memo isn't invalidated by a fresh closure each render.
const CODE_SEARCH = row => [
  row.code, row.owner_membership_id, row.used_by_membership_id, row.invitee_gender, row.status,
].filter(Boolean).join(' ');
const CODE_SORT = { key: 'created_at', dir: 'desc' };

export default function InviteCode() {
  const { member } = useMember();
  const [codes, setCodes] = useState([]);
  const [count, setCount] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [sendCode, setSendCode] = useState(null);
  const [sendForm, setSendForm] = useState({ first_name: '', last_name: '', email: '', phone: '', gender: '' });
  const [inviteDest, setInviteDest] = useState('');   // '' | 'my_account' | 'membership_enrollment'
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(null);
  const [qrGenerating, setQrGenerating] = useState(false);
  const [qrError, setQrError] = useState('');
  // Start blank — the mount effect immediately re-fetches a fresh QR.
  // Using `member.qr_code` here would briefly flash the stale value baked
  // in from before the operator configured Site URL.
  const [qrData, setQrData] = useState({ qr_code: '', qr_url: '' });
  const ctx = useOutletContext() || {};
  const title = ctx.sectionLabel ? ctx.sectionLabel('invite-code', 'Invite Code') : 'Invite Code';

  const loadCodes = () => memberAPI.listCodes().then(r => setCodes(r.data)).catch(console.error);
  useEffect(() => { loadCodes(); }, []);

  const stats = useMemo(() => {
    const available = codes.filter(c => c.status === 'available').length;
    return { available, used: codes.length - available };
  }, [codes]);

  const dt = useDataTable(codes, {
    searchAccessor: CODE_SEARCH,
    defaultSort: CODE_SORT,
    defaultPageSize: 10,
    storageKey: 'ma2-invite-codes',
  });

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await memberAPI.generateCodes(count);
      toast.success(`${count} code(s) generated!`);
      loadCodes();
    } catch { toast.error('Error generating codes'); }
    finally { setGenerating(false); }
  };

  const handleSend = async () => {
    if (!sendForm.email) { toast.error('Email is required'); return; }
    if (!inviteDest) { toast.error('Choose where to invite them: My Account or Membership Enrollment.'); return; }
    setSending(true);
    try {
      // El botón del email apunta a My Account (register) o a Membership Enrollment
      // según `destination`; ambas vías auto-rellenan el invite code. Paridad con My Community.
      await memberAPI.sendInvite(sendCode.id, { ...sendForm, destination: inviteDest });
      toast.success('Invitation sent!');
      setSendOpen(false);
      setSendForm({ first_name: '', last_name: '', email: '', phone: '', gender: '' });
      setInviteDest('');
      loadCodes();
    } catch (e) { toast.error(e.response?.data?.detail || 'Error sending'); }
    finally { setSending(false); }
  };

  const copyValue = (value) => {
    navigator.clipboard.writeText(value);
    setCopied(value);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleGenerateQR = async () => {
    setQrGenerating(true);
    setQrError('');
    try {
      const r = await memberAPI.generateQR();
      setQrData({ qr_code: r.data.qr_code, qr_url: r.data.qr_url });
      toast.success('QR Code generated!');
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Failed to generate QR';
      setQrError(msg);
      toast.error(msg);
    }
    finally { setQrGenerating(false); }
  };

  const downloadQR = () => {
    if (!qrData.qr_code) return;
    const link = document.createElement('a');
    link.href = qrData.qr_code;
    link.download = `qr-code-${member?.membership_id || 'member'}.png`;
    link.click();
  };

  // On mount, always re-fetch a fresh QR so the displayed URL reflects the
  // current CMS Site URL.  If the backend returns 400 (Site URL not set)
  // we surface a clear admin-actionable message rather than silently
  // showing whatever stale value is cached on the member document.
  useEffect(() => {
    if (!member?.can_create_qr) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await memberAPI.generateQR();
        if (!cancelled) {
          setQrData({ qr_code: r.data.qr_code, qr_url: r.data.qr_url });
          setQrError('');
        }
      } catch (e) {
        if (cancelled) return;
        const msg = e?.response?.data?.detail || '';
        if (msg.toLowerCase().includes('site url')) {
          // Don't keep the stale QR — it would mislead the user. Show the fix instructions.
          setQrData({ qr_code: '', qr_url: '' });
          setQrError(msg);
        }
        // Other failures (network etc): keep whatever the user already had.
      }
    })();
    return () => { cancelled = true; };
  }, [member?.member_id, member?.can_create_qr]); // eslint-disable-line

  return (
    <div data-testid="invite-code-page">
      <div className="mb-4">
        <h1 className="text-[15px] font-semibold" style={{ color: 'var(--ma2-heading, #495057)' }} data-testid="invite-code-title">{title}</h1>
        <p className="mt-1 text-[13px]" style={{ color: 'var(--ma2-muted, #878a99)' }}>
          Your Membership ID: <span className="font-semibold" style={{ color: 'var(--ma2-body, #212529)' }}>{member?.membership_id}</span>
        </p>
      </div>

      {/* Business QR — only visible if the member has the permission */}
      {member?.can_create_qr && (
        <div className="ma2-card mb-4" data-testid="business-qr-section">
          <div className="ma2-card-head flex items-center gap-2">
            <QrCode className="w-4 h-4" style={{ color: 'var(--ma2-muted, #878a99)' }} />
            <h2 className="ma2-card-title">Business QR</h2>
          </div>
          <div className="ma2-card-body">
            {qrData.qr_code ? (
              <div className="flex flex-col sm:flex-row items-start gap-5">
                <div className="flex-shrink-0 p-2 rounded" style={{ background: '#fff', border: '1px solid var(--ma2-border, #e9ebec)' }}>
                  <img src={qrData.qr_code} alt="Your sponsor registration QR code" className="w-40 h-40" data-testid="my-qr-image" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] leading-relaxed" style={{ color: 'var(--ma2-muted, #878a99)' }}>
                    Share this QR code to invite users to register as your sponsored members.
                  </p>
                  <div className="flex items-center gap-1 mt-3 mb-3 p-2 rounded"
                    style={{ background: 'var(--ma2-light, #f3f6f9)', border: '1px solid var(--ma2-border, #e9ebec)' }}>
                    <span className="ma2-mono flex-1 break-all" style={{ color: 'var(--ma2-body, #212529)' }} data-testid="qr-url-display">{qrData.qr_url}</span>
                    <button onClick={() => copyValue(qrData.qr_url)}
                      className={`ma2-icon-btn ${copied === qrData.qr_url ? 'ma2-icon-btn-success' : ''}`}
                      aria-label="Copy registration link" title="Copy registration link"
                      data-testid="copy-qr-url-btn">
                      {copied === qrData.qr_url ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={downloadQR} className="ma2-btn ma2-btn-primary ma2-btn-sm" data-testid="download-qr-btn">
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                    <button onClick={() => { const w = window.open('', '_blank'); w.document.write(`<html><body style="display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5"><img src="${qrData.qr_code}" style="max-width:400px" /></body></html>`); }}
                      className="ma2-btn ma2-btn-outline ma2-btn-sm" data-testid="view-qr-fullscreen-btn">
                      <Eye className="w-3.5 h-3.5" /> View Full
                    </button>
                    <button onClick={handleGenerateQR} disabled={qrGenerating}
                      className="ma2-btn ma2-btn-light ma2-btn-sm" data-testid="regenerate-qr-btn">
                      {qrGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <QrCode className="w-3.5 h-3.5" />} Regenerate
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                {qrError ? (
                  <div className="ma2-alert ma2-alert-warning mb-4" data-testid="qr-error">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="ma2-alert-title">QR code cannot be generated yet</p>
                      <p>{qrError}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-[13px] mb-3" style={{ color: 'var(--ma2-muted, #878a99)' }}>
                    Generate a QR code for sponsor-based registration. Share it to invite new members.
                  </p>
                )}
                <button onClick={handleGenerateQR} disabled={qrGenerating}
                  className="ma2-btn ma2-btn-primary" data-testid="generate-my-qr-btn">
                  {qrGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                  Generate QR Code
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Generate codes */}
      <div className="ma2-card mb-4">
        <div className="ma2-card-head flex items-center gap-2">
          <Key className="w-4 h-4" style={{ color: 'var(--ma2-muted, #878a99)' }} />
          <h2 className="ma2-card-title">Generate Invite Codes</h2>
        </div>
        <div className="ma2-card-body">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="ma2-label" htmlFor="invite-count">Number of codes</label>
              <input id="invite-count" type="number" className="ma2-input" style={{ width: '6rem' }}
                value={count} min={1} max={50}
                onChange={e => setCount(Math.max(1, Math.min(50, +e.target.value || 1)))}
                data-testid="invite-count-input" />
            </div>
            <button onClick={handleGenerate} disabled={generating}
              className="ma2-btn ma2-btn-primary" data-testid="generate-codes-btn">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
              Generate Unique Key
            </button>
            <p className="text-[12px] basis-full sm:basis-auto" style={{ color: 'var(--ma2-faint, #adb5bd)' }}>
              Up to 50 at a time. Each key registers one member under you.
            </p>
          </div>
        </div>
      </div>

      {/* Codes table */}
      <div className="ma2-card overflow-hidden">
        <div className="ma2-card-head flex flex-wrap items-center justify-between gap-2">
          <h2 className="ma2-card-title">Invite Codes</h2>
          {codes.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="ma2-badge ma2-badge-success">{stats.available} available</span>
              <span className="ma2-badge ma2-badge-light">{stats.used} used</span>
            </div>
          )}
        </div>

        {codes.length === 0 ? (
          <div className="ma2-empty" data-testid="invite-empty">
            <div className="ma2-empty-icon"><Key className="w-5 h-5" /></div>
            <p className="ma2-empty-title">No invite codes yet</p>
            <p className="ma2-empty-text">
              Generate your first unique key above, then send it by email or share it directly — you'll be able to
              track here who used each key and when.
            </p>
          </div>
        ) : (
          <>
            <Ma2TableToolbar dt={dt} testId="invite-codes" placeholder="Search codes…" />

            {dt.totalFiltered === 0 ? (
              <Ma2NoResults query={dt.search} onClear={() => dt.setSearch('')} testId="invite-no-results" />
            ) : (
              <>
                <div className="ma2-table-wrap">
                  <table className="ma2-table" data-testid="invite-codes-table">
                    <thead>
                      <tr>
                        <Ma2Th className="ma2-td-tight">N°</Ma2Th>
                        <Ma2SortableTh dt={dt} field="owner_membership_id">Membership ID</Ma2SortableTh>
                        <Ma2SortableTh dt={dt} field="code">Key Unique</Ma2SortableTh>
                        <Ma2SortableTh dt={dt} field="created_at">Date Create</Ma2SortableTh>
                        <Ma2SortableTh dt={dt} field="used_at">Date Use</Ma2SortableTh>
                        <Ma2SortableTh dt={dt} field="used_by_membership_id">Member Used</Ma2SortableTh>
                        <Ma2SortableTh dt={dt} field="invitee_gender">Genre</Ma2SortableTh>
                        <Ma2Th>Send</Ma2Th>
                        <Ma2SortableTh dt={dt} field="status">Status</Ma2SortableTh>
                      </tr>
                    </thead>
                    <tbody>
                      {dt.visibleItems.map((code, i) => (
                        <tr key={code.id} data-testid={`invite-row-${i}`}>
                          {/* row number over the whole sorted set, not the page */}
                          <td className="ma2-td-tight">{(dt.page - 1) * dt.pageSize + i + 1}</td>
                          <td className="ma2-td-nowrap">{code.owner_membership_id}</td>
                          <td>
                            <div className="flex items-center gap-1">
                              <span className="ma2-mono" style={{ color: 'var(--ma2-primary, #405189)' }}>{code.code}</span>
                              <button onClick={() => copyValue(code.code)}
                                className={`ma2-icon-btn ${copied === code.code ? 'ma2-icon-btn-success' : ''}`}
                                aria-label={`Copy code ${code.code}`} title="Copy code">
                                {copied === code.code ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                          </td>
                          <td className="ma2-td-tight">{new Date(code.created_at).toLocaleDateString()}</td>
                          <td className="ma2-td-tight">{code.used_at ? new Date(code.used_at).toLocaleDateString() : '—'}</td>
                          <td className="ma2-td-nowrap">{code.used_by_membership_id || <span className="ma2-td-muted">—</span>}</td>
                          <td className="ma2-td-nowrap">{code.invitee_gender || <span className="ma2-td-muted">—</span>}</td>
                          <td>
                            {code.status === 'available' ? (
                              <button onClick={() => { setSendCode(code); setInviteDest(''); setSendOpen(true); }}
                                className="ma2-btn ma2-btn-success ma2-btn-sm"
                                aria-label={`Send invitation with code ${code.code}`}
                                data-testid={`send-invite-btn-${i}`}>
                                <Send className="w-3 h-3" /> Send
                              </button>
                            ) : <span className="ma2-td-muted">—</span>}
                          </td>
                          <td className="ma2-td-nowrap">
                            <span className={`ma2-badge ma2-badge-up ${code.status === 'available' ? 'ma2-badge-success' : 'ma2-badge-light'}`}>
                              {code.status === 'available' ? 'Available' : 'Used'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Ma2Pagination dt={dt} testId="invite-codes" />
              </>
            )}
          </>
        )}
      </div>

      {/* Send Invitation modal */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="ma2-modal sm:max-w-[520px]" data-testid="send-invite-dialog">
          <DialogHeader className="ma2-modal-header">
            <DialogTitle className="ma2-modal-title">Send Invitation</DialogTitle>
            <DialogDescription className="ma2-modal-desc">
              {sendCode ? <>The invitation email will carry code <span className="ma2-mono">{sendCode.code}</span>.</> : 'Select a code to send.'}
            </DialogDescription>
          </DialogHeader>
          {sendCode && (
            <>
              <div className="ma2-modal-body">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="ma2-label" htmlFor="invite-first-name">First Name</label>
                    <input id="invite-first-name" className="ma2-input" value={sendForm.first_name}
                      onChange={e => setSendForm(p => ({ ...p, first_name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="ma2-label" htmlFor="invite-last-name">Last Name</label>
                    <input id="invite-last-name" className="ma2-input" value={sendForm.last_name}
                      onChange={e => setSendForm(p => ({ ...p, last_name: e.target.value }))} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="ma2-label" htmlFor="invite-email">Email <span style={{ color: 'var(--ma2-danger, #f06548)' }}>*</span></label>
                    <input id="invite-email" type="email" className="ma2-input" required value={sendForm.email}
                      onChange={e => setSendForm(p => ({ ...p, email: e.target.value }))}
                      data-testid="invite-email-input" />
                  </div>
                  <div>
                    <label className="ma2-label" htmlFor="invite-phone">Phone</label>
                    <input id="invite-phone" className="ma2-input" value={sendForm.phone}
                      onChange={e => setSendForm(p => ({ ...p, phone: e.target.value }))} />
                  </div>
                  <div>
                    <label className="ma2-label" htmlFor="invite-gender">Gender</label>
                    <select id="invite-gender" className="ma2-input" value={sendForm.gender}
                      onChange={e => setSendForm(p => ({ ...p, gender: e.target.value }))}>
                      <option value="">Select…</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  {/* Vía de ingreso (paridad con My Community): el botón del email lleva a
                      My Account (register) o a Membership Enrollment; ambas auto-rellenan el code. */}
                  <div className="sm:col-span-2 ma2-invite-dest" data-testid="invite-code-dest"
                    style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 18, fontSize: 13 }}>
                    <span style={{ fontWeight: 600, color: 'var(--ma2-heading, #495057)' }}>Invite to:</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                      <input type="radio" name="inviteCodeDest" value="my_account"
                        checked={inviteDest === 'my_account'} onChange={() => setInviteDest('my_account')} />
                      My Account
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                      <input type="radio" name="inviteCodeDest" value="membership_enrollment"
                        checked={inviteDest === 'membership_enrollment'} onChange={() => setInviteDest('membership_enrollment')} />
                      Membership Enrollment
                    </label>
                  </div>
                </div>
              </div>
              <div className="ma2-modal-footer">
                <button onClick={() => setSendOpen(false)} className="ma2-btn ma2-btn-outline">Cancel</button>
                <button onClick={handleSend} disabled={sending || !inviteDest}
                  className="ma2-btn ma2-btn-primary" data-testid="send-invite-submit"
                  style={{ opacity: (!inviteDest ? 0.55 : 1) }}>
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
