import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useMember } from '../../lib/memberAuth';
import { memberAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Key, Send, Loader2, Copy, Check, QrCode, Download, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

// MMS embeddable referral widget (MMS plan Phase 5b) — one script tag; the
// widget renders the member's zero-setup tracked link (/l/a/aux-N) with copy
// + share buttons. Carlos-first: the MMS host is per-brand at rollout.
const MMS_HOST = 'https://mms.carlosartiles.com';

function MmsInviteWidget({ code }) {
  useEffect(() => {
    if (!code || document.getElementById('mms-widget-script')) return;
    const s = document.createElement('script');
    s.id = 'mms-widget-script';
    s.src = `${MMS_HOST}/api/widget.js`;
    s.async = true;
    s.setAttribute('data-code', code);
    document.getElementById('mms-invite')?.appendChild(s);
  }, [code]);
  if (!code) return null;
  return <div id="mms-invite" className="mb-6" data-testid="mms-invite-widget" />;
}

export default function InviteCode() {
  const { member } = useMember();
  const [codes, setCodes] = useState([]);
  const [count, setCount] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [sendCode, setSendCode] = useState(null);
  const [sendForm, setSendForm] = useState({ first_name: '', last_name: '', email: '', phone: '', gender: '' });
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(null);
  const [qrGenerating, setQrGenerating] = useState(false);
  // Start blank — the mount effect immediately re-fetches a fresh QR.
  // Using `member.qr_code` here would briefly flash the stale value baked
  // in from before the operator configured Site URL.
  const [qrData, setQrData] = useState({ qr_code: '', qr_url: '' });
  const ctx = useOutletContext() || {};
  const title = ctx.sectionLabel ? ctx.sectionLabel('invite-code', 'Invite Code') : 'Invite Code';

  const loadCodes = () => memberAPI.listCodes().then(r => setCodes(r.data)).catch(console.error);
  useEffect(() => { loadCodes(); }, []);

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
    setSending(true);
    try {
      await memberAPI.sendInvite(sendCode.id, sendForm);
      toast.success('Invitation sent!');
      setSendOpen(false);
      setSendForm({ first_name: '', last_name: '', email: '', phone: '', gender: '' });
      loadCodes();
    } catch (e) { toast.error(e.response?.data?.detail || 'Error sending'); }
    finally { setSending(false); }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
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

  const [qrError, setQrError] = useState('');
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
      <h1 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "'DM Serif Display', serif" }} data-testid="invite-code-title">{title}</h1>
      <p className="text-gray-500 text-sm mb-6">Your Membership ID: <span className="text-[#c9a84c] font-semibold">{member?.membership_id}</span></p>

      <MmsInviteWidget code={member?.membership_number ? `aux-${member.membership_number}` : ''} />

      {/* Business QR Section - only visible if member has permission */}
      {member?.can_create_qr && (
        <div className="border rounded-lg p-5 mb-6" style={{ backgroundColor: 'var(--ma-card-bg, #13161e)', borderColor: 'var(--ma-card-border, rgba(255,255,255,0.05))' }} data-testid="business-qr-section">
          <div className="flex items-center gap-2 mb-4">
            <QrCode className="w-5 h-5" style={{ color: 'var(--ma-accent, #c9a84c)' }} />
            <h2 className="text-base font-bold" style={{ color: 'var(--ma-text-primary, #ffffff)', fontFamily: "'DM Serif Display', serif" }}>Business QR</h2>
          </div>
          {qrData.qr_code ? (
            <div className="flex flex-col sm:flex-row items-start gap-5">
              <div className="bg-white rounded-lg p-2 flex-shrink-0">
                <img src={qrData.qr_code} alt="QR Code" className="w-40 h-40" data-testid="my-qr-image" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs mb-2" style={{ color: 'var(--ma-text-secondary, #9ca3af)' }}>Share this QR code to invite users to register as your sponsored members.</p>
                <p className="text-xs font-mono break-all mb-3 p-2 rounded" style={{ backgroundColor: 'var(--ma-input-bg, #0d0f14)', color: 'var(--ma-accent, #c9a84c)', border: '1px solid var(--ma-input-border, rgba(255,255,255,0.1))' }} data-testid="qr-url-display">{qrData.qr_url}</p>
                <div className="flex gap-2">
                  <button onClick={downloadQR} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium" style={{ backgroundColor: 'var(--ma-button-bg, #c9a84c)', color: 'var(--ma-button-text, #0d0f14)' }} data-testid="download-qr-btn">
                    <Download className="w-3 h-3" /> Download
                  </button>
                  <button onClick={() => { const w = window.open('', '_blank'); w.document.write(`<html><body style="display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5"><img src="${qrData.qr_code}" style="max-width:400px" /></body></html>`); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border" style={{ borderColor: 'var(--ma-input-border, rgba(255,255,255,0.1))', color: 'var(--ma-text-secondary, #9ca3af)' }} data-testid="view-qr-fullscreen-btn">
                    <Eye className="w-3 h-3" /> View Full
                  </button>
                  <button onClick={handleGenerateQR} disabled={qrGenerating} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border" style={{ borderColor: 'var(--ma-input-border, rgba(255,255,255,0.1))', color: 'var(--ma-text-secondary, #9ca3af)' }} data-testid="regenerate-qr-btn">
                    {qrGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <QrCode className="w-3 h-3" />} Regenerate
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              {qrError ? (
                <div className="mb-4 p-3 rounded-lg text-left text-sm" style={{ background: 'color-mix(in srgb, #f59e0b 12%, transparent)', border: '1px solid color-mix(in srgb, #f59e0b 30%, transparent)', color: '#fcd34d' }} data-testid="qr-error">
                  <p className="font-medium mb-1">QR code cannot be generated yet</p>
                  <p className="text-xs opacity-90">{qrError}</p>
                </div>
              ) : (
                <p className="text-sm mb-3" style={{ color: 'var(--ma-text-secondary, #9ca3af)' }}>Generate a QR code for sponsor-based registration. Share it to invite new members.</p>
              )}
              <button onClick={handleGenerateQR} disabled={qrGenerating}
                className="inline-flex items-center gap-2 px-5 py-2 rounded text-sm font-semibold disabled:opacity-50"
                style={{ backgroundColor: 'var(--ma-button-bg, #c9a84c)', color: 'var(--ma-button-text, #0d0f14)' }}
                data-testid="generate-my-qr-btn">
                {qrGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                Generate QR Code
              </button>
            </div>
          )}
        </div>
      )}

      {/* Generate Section */}
      <div className="bg-[#13161e] border border-white/5 rounded-lg p-5 mb-6">
        <div className="flex items-end gap-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Number of codes</label>
            <input type="number" value={count} onChange={e => setCount(Math.max(1, Math.min(50, +e.target.value)))} min={1} max={50}
              className="w-24 px-3 py-2 bg-[#0d0f14] border border-white/10 rounded text-white text-sm focus:outline-none focus:border-[#c9a84c]"
              data-testid="invite-count-input" />
          </div>
          <button onClick={handleGenerate} disabled={generating}
            className="px-5 py-2 bg-[#c9a84c] text-[#0d0f14] rounded text-sm font-semibold hover:bg-[#d4b85d] disabled:opacity-50 flex items-center gap-2"
            data-testid="generate-codes-btn">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
            Generate Unique Key
          </button>
        </div>
      </div>

      {/* Codes Table */}
      <div className="bg-[#13161e] border border-white/5 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-gray-400 text-xs">
                <th className="text-left p-3">N&deg;</th>
                <th className="text-left p-3">Membership ID</th>
                <th className="text-left p-3">Key Unique</th>
                <th className="text-left p-3">Date Create</th>
                <th className="text-left p-3">Date Use</th>
                <th className="text-left p-3">Member Used</th>
                <th className="text-left p-3">Genre</th>
                <th className="text-left p-3">Send</th>
                <th className="text-left p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((code, i) => (
                <tr key={code.id} className="border-b border-white/5 hover:bg-white/[0.02]" data-testid={`invite-row-${i}`}>
                  <td className="p-3 text-gray-400">{i + 1}</td>
                  <td className="p-3 text-white">{code.owner_membership_id}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <span className="text-[#c9a84c] font-mono text-xs">{code.code}</span>
                      <button onClick={() => copyCode(code.code)} className="p-1 text-gray-500 hover:text-[#c9a84c]">
                        {copied === code.code ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </td>
                  <td className="p-3 text-gray-400 text-xs">{new Date(code.created_at).toLocaleDateString()}</td>
                  <td className="p-3 text-gray-400 text-xs">{code.used_at ? new Date(code.used_at).toLocaleDateString() : '-'}</td>
                  <td className="p-3 text-white text-xs">{code.used_by_membership_id || '-'}</td>
                  <td className="p-3 text-gray-400 text-xs">{code.invitee_gender || '-'}</td>
                  <td className="p-3">
                    {code.status === 'available' && (
                      <button onClick={() => { setSendCode(code); setSendOpen(true); }}
                        className="p-1.5 bg-[#c9a84c]/10 text-[#c9a84c] rounded hover:bg-[#c9a84c]/20"
                        data-testid={`send-invite-btn-${i}`}>
                        <Send className="w-3 h-3" />
                      </button>
                    )}
                  </td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${code.status === 'available' ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-400'}`}>
                      {code.status === 'available' ? 'Available' : 'Used'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {codes.length === 0 && <div className="p-8 text-center text-gray-500 text-sm">No invite codes generated yet</div>}
        </div>
      </div>

      {/* Send Invitation Modal */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="border" style={{ backgroundColor: 'var(--ma-modal-bg, #13161e)', borderColor: 'var(--ma-modal-border, rgba(255,255,255,0.1))', color: 'var(--ma-text-primary, #ffffff)' }} data-testid="send-invite-dialog">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--ma-text-primary, #ffffff)' }}>Send Invitation</DialogTitle>
          </DialogHeader>
          {sendCode && (
            <div className="space-y-3">
              <p className="text-xs" style={{ color: 'var(--ma-text-secondary, #9ca3af)' }}>Code: <span style={{ color: 'var(--ma-accent, #c9a84c)' }}>{sendCode.code}</span></p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs" style={{ color: 'var(--ma-text-secondary, #9ca3af)' }}>First Name</Label>
                  <Input value={sendForm.first_name} onChange={e => setSendForm(p => ({...p, first_name: e.target.value}))} className="mt-1" style={{ backgroundColor: 'var(--ma-input-bg, #0d0f14)', borderColor: 'var(--ma-input-border, rgba(255,255,255,0.1))', color: 'var(--ma-text-primary, #ffffff)' }} /></div>
                <div><Label className="text-xs" style={{ color: 'var(--ma-text-secondary, #9ca3af)' }}>Last Name</Label>
                  <Input value={sendForm.last_name} onChange={e => setSendForm(p => ({...p, last_name: e.target.value}))} className="mt-1" style={{ backgroundColor: 'var(--ma-input-bg, #0d0f14)', borderColor: 'var(--ma-input-border, rgba(255,255,255,0.1))', color: 'var(--ma-text-primary, #ffffff)' }} /></div>
              </div>
              <div><Label className="text-xs" style={{ color: 'var(--ma-text-secondary, #9ca3af)' }}>Email *</Label>
                <Input type="email" value={sendForm.email} onChange={e => setSendForm(p => ({...p, email: e.target.value}))} className="mt-1" style={{ backgroundColor: 'var(--ma-input-bg, #0d0f14)', borderColor: 'var(--ma-input-border, rgba(255,255,255,0.1))', color: 'var(--ma-text-primary, #ffffff)' }} data-testid="invite-email-input" /></div>
              <div><Label className="text-xs" style={{ color: 'var(--ma-text-secondary, #9ca3af)' }}>Phone</Label>
                <Input value={sendForm.phone} onChange={e => setSendForm(p => ({...p, phone: e.target.value}))} className="mt-1" style={{ backgroundColor: 'var(--ma-input-bg, #0d0f14)', borderColor: 'var(--ma-input-border, rgba(255,255,255,0.1))', color: 'var(--ma-text-primary, #ffffff)' }} /></div>
              <div><Label className="text-xs" style={{ color: 'var(--ma-text-secondary, #9ca3af)' }}>Gender</Label>
                <select value={sendForm.gender} onChange={e => setSendForm(p => ({...p, gender: e.target.value}))}
                  className="w-full px-3 py-2 border rounded text-sm mt-1" style={{ backgroundColor: 'var(--ma-input-bg, #0d0f14)', borderColor: 'var(--ma-input-border, rgba(255,255,255,0.1))', color: 'var(--ma-text-primary, #ffffff)' }}>
                  <option value="">Select...</option><option value="Male">Male</option><option value="Female">Female</option>
                </select></div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setSendOpen(false)} className="flex-1 py-2 border rounded text-sm hover:opacity-80" style={{ borderColor: 'var(--ma-input-border, rgba(255,255,255,0.1))', color: 'var(--ma-text-secondary, #9ca3af)' }}>Cancel</button>
                <button onClick={handleSend} disabled={sending} className="flex-1 py-2 rounded text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2" style={{ backgroundColor: 'var(--ma-button-bg, #c9a84c)', color: 'var(--ma-button-text, #0d0f14)' }} data-testid="send-invite-submit">
                  {sending && <Loader2 className="w-3 h-3 animate-spin" />} Send
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
