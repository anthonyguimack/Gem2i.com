import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useMember } from '../../lib/memberAuth';
import { memberAPI } from '../../lib/api';
import { useT, useLang } from '../../lib/i18n';
import { toast } from 'sonner';
import { Key, Send, Loader2, Copy, Check, QrCode, Download, Eye, RotateCw, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

const v = (name) => `var(--ma-${name})`;

const L = {
  title: { en: 'Invite Code', es: 'Código de invitación' },
  yourId: { en: 'Your Membership ID', es: 'Tu ID de miembro' },
  qrTitle: { en: 'Business QR', es: 'QR de negocio' },
  qrShare: { en: 'Share this QR code so new members register under your sponsorship.', es: 'Comparte este código QR para que los nuevos miembros se registren bajo tu patrocinio.' },
  qrIntro: { en: 'Generate a QR code for sponsor-based registration, then share it to invite new members.', es: 'Genera un código QR de registro con patrocinio y compártelo para invitar a nuevos miembros.' },
  qrBlocked: { en: 'The QR code can’t be generated yet', es: 'Todavía no se puede generar el código QR' },
  qrGenerate: { en: 'Generate QR code', es: 'Generar código QR' },
  qrGenerated: { en: 'QR code generated', es: 'Código QR generado' },
  qrFailed: { en: 'Could not generate the QR code', es: 'No se pudo generar el código QR' },
  qrImageAlt: { en: 'Your sponsor registration QR code', es: 'Tu código QR de registro con patrocinio' },
  download: { en: 'Download', es: 'Descargar' },
  viewFull: { en: 'View full size', es: 'Ver a tamaño completo' },
  regenerate: { en: 'Regenerate', es: 'Regenerar' },
  numCodes: { en: 'Number of codes', es: 'Número de códigos' },
  numHint: { en: 'Between 1 and 50', es: 'Entre 1 y 50' },
  generateKeys: { en: 'Generate codes', es: 'Generar códigos' },
  generatedN: { en: '{n} code(s) generated', es: '{n} código(s) generado(s)' },
  generateFailed: { en: 'Could not generate codes', es: 'No se pudieron generar los códigos' },
  colN: { en: '#', es: 'N.º' },
  colOwner: { en: 'Membership ID', es: 'ID de miembro' },
  colCode: { en: 'Code', es: 'Código' },
  colCreated: { en: 'Created', es: 'Creado' },
  colUsed: { en: 'Used on', es: 'Usado el' },
  colUsedBy: { en: 'Used by', es: 'Usado por' },
  colGender: { en: 'Gender', es: 'Género' },
  colSend: { en: 'Send', es: 'Enviar' },
  colStatus: { en: 'Status', es: 'Estado' },
  available: { en: 'Available', es: 'Disponible' },
  used: { en: 'Used', es: 'Usado' },
  copy: { en: 'Copy code {c}', es: 'Copiar código {c}' },
  copied: { en: 'Copied', es: 'Copiado' },
  copyFailed: { en: 'Could not copy. Select the code and copy it manually.', es: 'No se pudo copiar. Selecciona el código y cópialo a mano.' },
  sendTo: { en: 'Send code {c} by email', es: 'Enviar el código {c} por email' },
  loading: { en: 'Loading your invite codes…', es: 'Cargando tus códigos de invitación…' },
  loadFailed: { en: 'Could not load your invite codes.', es: 'No se pudieron cargar tus códigos de invitación.' },
  retry: { en: 'Try again', es: 'Reintentar' },
  empty: { en: 'No invite codes yet. Choose how many you need above and generate them. Each code registers one new member under you.', es: 'Aún no tienes códigos. Elige cuántos necesitas arriba y genéralos. Cada código registra a un nuevo miembro bajo tu patrocinio.' },
  sendTitle: { en: 'Send invitation', es: 'Enviar invitación' },
  code: { en: 'Code', es: 'Código' },
  firstName: { en: 'First name', es: 'Nombre' },
  lastName: { en: 'Last name', es: 'Apellido' },
  email: { en: 'Email', es: 'Email' },
  phone: { en: 'Phone', es: 'Teléfono' },
  gender: { en: 'Gender', es: 'Género' },
  select: { en: 'Select…', es: 'Selecciona…' },
  male: { en: 'Male', es: 'Masculino' },
  female: { en: 'Female', es: 'Femenino' },
  required: { en: 'required', es: 'obligatorio' },
  emailRequired: { en: 'Enter the invitee’s email address.', es: 'Escribe el email de la persona invitada.' },
  cancel: { en: 'Cancel', es: 'Cancelar' },
  send: { en: 'Send', es: 'Enviar' },
  sent: { en: 'Invitation sent', es: 'Invitación enviada' },
  sendFailed: { en: 'Could not send the invitation', es: 'No se pudo enviar la invitación' },
};

const EMPTY_FORM = { first_name: '', last_name: '', email: '', phone: '', gender: '' };
const inputStyle = { backgroundColor: v('input-bg'), borderColor: v('input-border'), color: v('text-primary') };
const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';

export default function InviteCode() {
  const tt = useT();
  const { lang } = useLang();
  const f = (key, vars = {}) => Object.entries(vars).reduce((s, [k, val]) => s.replace(`{${k}}`, val), tt(L[key]));
  const { member } = useMember();
  const [codes, setCodes] = useState([]);
  const [loadState, setLoadState] = useState('loading');
  const [count, setCount] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [sendCode, setSendCode] = useState(null);
  const [sendForm, setSendForm] = useState(EMPTY_FORM);
  const [emailError, setEmailError] = useState('');
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(null);
  const [qrGenerating, setQrGenerating] = useState(false);
  // Start blank — the mount effect re-fetches a fresh QR so a value baked in
  // before the operator configured the Site URL is never shown.
  const [qrData, setQrData] = useState({ qr_code: '', qr_url: '' });
  const [qrError, setQrError] = useState('');
  const ctx = useOutletContext() || {};
  const title = ctx.sectionLabel ? ctx.sectionLabel('invite-code', tt(L.title)) : tt(L.title);

  const fmtDate = (d) => {
    if (!d) return '—';
    const date = new Date(d);
    return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(lang).format(date);
  };

  const loadCodes = useCallback(() => {
    setLoadState((s) => (s === 'ready' ? s : 'loading'));
    return memberAPI.listCodes()
      .then((r) => { setCodes(Array.isArray(r.data) ? r.data : []); setLoadState('ready'); })
      .catch(() => setLoadState('error'));
  }, []);
  useEffect(() => { loadCodes(); }, [loadCodes]);

  const handleGenerate = async () => {
    const n = Math.max(1, Math.min(50, Number(count) || 1));
    setGenerating(true);
    try {
      await memberAPI.generateCodes(n);
      toast.success(f('generatedN', { n }));
      await loadCodes();
    } catch (e) {
      toast.error(e?.response?.data?.detail || tt(L.generateFailed));
    } finally { setGenerating(false); }
  };

  const openSend = (code) => { setSendCode(code); setSendForm(EMPTY_FORM); setEmailError(''); setSendOpen(true); };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!sendForm.email.trim()) { setEmailError(tt(L.emailRequired)); return; }
    setSending(true);
    try {
      await memberAPI.sendInvite(sendCode.id, { ...sendForm, email: sendForm.email.trim() });
      toast.success(tt(L.sent));
      setSendOpen(false);
      await loadCodes();
    } catch (err) {
      toast.error(err?.response?.data?.detail || tt(L.sendFailed));
    } finally { setSending(false); }
  };

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied((c) => (c === code ? null : c)), 2000);
    } catch {
      toast.error(tt(L.copyFailed));
    }
  };

  const handleGenerateQR = async () => {
    setQrGenerating(true);
    setQrError('');
    try {
      const r = await memberAPI.generateQR();
      setQrData({ qr_code: r.data.qr_code, qr_url: r.data.qr_url });
      toast.success(tt(L.qrGenerated));
    } catch (e) {
      const msg = e?.response?.data?.detail || tt(L.qrFailed);
      setQrError(msg);
      toast.error(msg);
    } finally { setQrGenerating(false); }
  };

  const downloadQR = () => {
    if (!qrData.qr_code) return;
    const link = document.createElement('a');
    link.href = qrData.qr_code;
    link.download = `qr-code-${member?.membership_id || 'member'}.png`;
    link.click();
  };

  const viewQR = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.title = tt(L.qrTitle);
    w.document.body.style.cssText = 'display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:white';
    const img = w.document.createElement('img');
    img.src = qrData.qr_code;
    img.alt = tt(L.qrImageAlt);
    img.style.maxWidth = '400px';
    w.document.body.appendChild(img);
  };

  // Always re-fetch on mount so the encoded URL reflects the current CMS Site
  // URL. A 400 "Site URL" means the operator must configure it: show that
  // instead of a stale QR. Other failures keep whatever is already shown.
  useEffect(() => {
    if (!member?.can_create_qr) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const r = await memberAPI.generateQR();
        if (!cancelled) { setQrData({ qr_code: r.data.qr_code, qr_url: r.data.qr_url }); setQrError(''); }
      } catch (e) {
        if (cancelled) return;
        const msg = e?.response?.data?.detail || '';
        if (msg.toLowerCase().includes('site url')) { setQrData({ qr_code: '', qr_url: '' }); setQrError(msg); }
      }
    })();
    return () => { cancelled = true; };
  }, [member?.member_id, member?.can_create_qr]);

  const primaryBtn = { backgroundColor: v('button-bg'), color: v('button-text'), outlineColor: v('accent') };
  const ghostBtn = { borderColor: v('input-border'), color: v('text-secondary'), outlineColor: v('accent') };
  const card = { backgroundColor: v('card-bg'), borderColor: v('card-border') };

  return (
    <div data-testid="invite-code-page">
      <h1 className="text-2xl font-bold mb-1" style={{ color: v('text-primary'), textWrap: 'balance' }} data-testid="invite-code-title">{title}</h1>
      <p className="text-sm mb-6" style={{ color: v('text-secondary') }}>
        {tt(L.yourId)}: <span className="font-semibold" style={{ color: v('accent') }}>{member?.membership_id}</span>
      </p>

      {member?.can_create_qr && (
        <section className="border rounded-lg p-5 mb-6" style={card} aria-labelledby="business-qr-heading" data-testid="business-qr-section">
          <div className="flex items-center gap-2 mb-4">
            <QrCode className="w-5 h-5" style={{ color: v('accent') }} aria-hidden="true" />
            <h2 id="business-qr-heading" className="text-base font-bold" style={{ color: v('text-primary') }}>{tt(L.qrTitle)}</h2>
          </div>
          {qrData.qr_code ? (
            <div className="flex flex-col sm:flex-row items-start gap-5">
              <div className="rounded-lg p-2 flex-shrink-0" style={{ background: 'white' }}>
                <img src={qrData.qr_code} alt={tt(L.qrImageAlt)} className="w-40 h-40" data-testid="my-qr-image" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm mb-2" style={{ color: v('text-secondary') }}>{tt(L.qrShare)}</p>
                <p className="text-xs font-mono break-all mb-3 p-2 rounded border" style={{ ...inputStyle, color: v('accent') }} data-testid="qr-url-display">{qrData.qr_url}</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={downloadQR} className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-opacity hover:opacity-90 ${focusRing}`} style={primaryBtn} data-testid="download-qr-btn">
                    <Download className="w-3 h-3" aria-hidden="true" /> {tt(L.download)}
                  </button>
                  <button type="button" onClick={viewQR} className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border transition-opacity hover:opacity-80 ${focusRing}`} style={ghostBtn} data-testid="view-qr-fullscreen-btn">
                    <Eye className="w-3 h-3" aria-hidden="true" /> {tt(L.viewFull)}
                  </button>
                  <button type="button" onClick={handleGenerateQR} disabled={qrGenerating} aria-busy={qrGenerating} className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border transition-opacity hover:opacity-80 disabled:opacity-50 ${focusRing}`} style={ghostBtn} data-testid="regenerate-qr-btn">
                    {qrGenerating ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> : <RotateCw className="w-3 h-3" aria-hidden="true" />} {tt(L.regenerate)}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-2">
              {qrError ? (
                <div role="alert" className="mb-4 p-3 rounded-lg border flex gap-3 text-sm" style={{ borderColor: v('accent'), background: `color-mix(in srgb, ${v('accent')} 10%, transparent)`, color: v('text-primary') }} data-testid="qr-error">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: v('accent') }} aria-hidden="true" />
                  <div>
                    <p className="font-medium mb-1">{tt(L.qrBlocked)}</p>
                    <p className="text-xs" style={{ color: v('text-secondary') }}>{qrError}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm mb-3" style={{ color: v('text-secondary') }}>{tt(L.qrIntro)}</p>
              )}
              <button type="button" onClick={handleGenerateQR} disabled={qrGenerating} aria-busy={qrGenerating}
                className={`inline-flex items-center gap-2 px-5 py-2 rounded text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 ${focusRing}`}
                style={primaryBtn} data-testid="generate-my-qr-btn">
                {qrGenerating ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <QrCode className="w-4 h-4" aria-hidden="true" />}
                {tt(L.qrGenerate)}
              </button>
            </div>
          )}
        </section>
      )}

      <div className="border rounded-lg p-5 mb-6" style={card}>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="invite-count" className="text-xs block mb-1" style={{ color: v('text-secondary') }}>{tt(L.numCodes)}</label>
            <input id="invite-count" type="number" inputMode="numeric" value={count} min={1} max={50}
              aria-describedby="invite-count-hint"
              onChange={(e) => setCount(e.target.value === '' ? '' : Math.max(1, Math.min(50, Number(e.target.value))))}
              onBlur={() => { if (count === '') setCount(1); }}
              className="w-24 px-3 py-2 border rounded text-sm focus:outline-none" style={inputStyle}
              data-testid="invite-count-input" />
            <p id="invite-count-hint" className="text-xs mt-1" style={{ color: v('text-muted') }}>{tt(L.numHint)}</p>
          </div>
          <button type="button" onClick={handleGenerate} disabled={generating} aria-busy={generating}
            className={`mb-5 px-5 py-2 rounded text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center gap-2 ${focusRing}`}
            style={primaryBtn} data-testid="generate-codes-btn">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Key className="w-4 h-4" aria-hidden="true" />}
            {tt(L.generateKeys)}
          </button>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden" style={card}>
        {loadState === 'loading' && (
          <div className="p-8 flex items-center justify-center gap-2 text-sm" role="status" style={{ color: v('text-secondary') }}>
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> {tt(L.loading)}
          </div>
        )}
        {loadState === 'error' && (
          <div className="p-8 text-center text-sm" role="alert" style={{ color: v('text-secondary') }}>
            <p className="mb-3">{tt(L.loadFailed)}</p>
            <button type="button" onClick={loadCodes} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border transition-opacity hover:opacity-80 ${focusRing}`} style={ghostBtn}>
              <RotateCw className="w-3 h-3" aria-hidden="true" /> {tt(L.retry)}
            </button>
          </div>
        )}
        {loadState === 'ready' && codes.length === 0 && (
          <p className="p-8 text-center text-sm max-w-md mx-auto" style={{ color: v('text-secondary') }}>{tt(L.empty)}</p>
        )}
        {loadState === 'ready' && codes.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs" style={{ borderColor: v('card-border'), color: v('text-secondary') }}>
                  {['colN', 'colOwner', 'colCode', 'colCreated', 'colUsed', 'colUsedBy', 'colGender', 'colSend', 'colStatus'].map((k) => (
                    <th key={k} scope="col" className="text-start font-medium p-3 whitespace-nowrap">{tt(L[k])}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {codes.map((code, i) => {
                  const isAvailable = code.status === 'available';
                  return (
                    <tr key={code.id} className="border-b" style={{ borderColor: v('card-border') }} data-testid={`invite-row-${i}`}>
                      <td className="p-3" style={{ color: v('text-muted') }}>{i + 1}</td>
                      <td className="p-3 whitespace-nowrap" style={{ color: v('text-primary') }}>{code.owner_membership_id}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-xs" style={{ color: v('accent') }}>{code.code}</span>
                          <button type="button" onClick={() => copyCode(code.code)}
                            aria-label={copied === code.code ? tt(L.copied) : f('copy', { c: code.code })}
                            className={`p-1.5 rounded transition-opacity hover:opacity-80 ${focusRing}`} style={{ color: v('text-secondary'), outlineColor: v('accent') }}>
                            {copied === code.code ? <Check className="w-3 h-3" style={{ color: v('accent') }} aria-hidden="true" /> : <Copy className="w-3 h-3" aria-hidden="true" />}
                          </button>
                        </div>
                      </td>
                      <td className="p-3 text-xs whitespace-nowrap" style={{ color: v('text-secondary') }}>{fmtDate(code.created_at)}</td>
                      <td className="p-3 text-xs whitespace-nowrap" style={{ color: v('text-secondary') }}>{fmtDate(code.used_at)}</td>
                      <td className="p-3 text-xs whitespace-nowrap" style={{ color: v('text-primary') }}>{code.used_by_membership_id || '—'}</td>
                      <td className="p-3 text-xs" style={{ color: v('text-secondary') }}>{code.invitee_gender === 'Male' ? tt(L.male) : code.invitee_gender === 'Female' ? tt(L.female) : (code.invitee_gender || '—')}</td>
                      <td className="p-3">
                        {isAvailable && (
                          <button type="button" onClick={() => openSend(code)} aria-label={f('sendTo', { c: code.code })}
                            className={`p-1.5 rounded transition-opacity hover:opacity-80 ${focusRing}`}
                            style={{ color: v('accent'), background: `color-mix(in srgb, ${v('accent')} 12%, transparent)`, outlineColor: v('accent') }}
                            data-testid={`send-invite-btn-${i}`}>
                            <Send className="w-3 h-3" aria-hidden="true" />
                          </button>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap border"
                          style={isAvailable
                            ? { color: v('accent'), borderColor: v('accent') }
                            : { color: v('text-muted'), borderColor: v('input-border') }}>
                          {isAvailable ? tt(L.available) : tt(L.used)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={sendOpen} onOpenChange={(o) => { if (!sending) setSendOpen(o); }}>
        <DialogContent className="border" style={{ backgroundColor: v('modal-bg'), borderColor: v('modal-border'), color: v('text-primary') }} data-testid="send-invite-dialog">
          <DialogHeader>
            <DialogTitle style={{ color: v('text-primary') }}>{tt(L.sendTitle)}</DialogTitle>
          </DialogHeader>
          {sendCode && (
            <form onSubmit={handleSend} noValidate className="space-y-3">
              <p className="text-xs" style={{ color: v('text-secondary') }}>{tt(L.code)}: <span className="font-mono" style={{ color: v('accent') }}>{sendCode.code}</span></p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="inv-first" className="text-xs" style={{ color: v('text-secondary') }}>{tt(L.firstName)}</Label>
                  <Input id="inv-first" autoComplete="off" value={sendForm.first_name} onChange={(e) => setSendForm((p) => ({ ...p, first_name: e.target.value }))} className="mt-1" style={inputStyle} />
                </div>
                <div>
                  <Label htmlFor="inv-last" className="text-xs" style={{ color: v('text-secondary') }}>{tt(L.lastName)}</Label>
                  <Input id="inv-last" autoComplete="off" value={sendForm.last_name} onChange={(e) => setSendForm((p) => ({ ...p, last_name: e.target.value }))} className="mt-1" style={inputStyle} />
                </div>
              </div>
              <div>
                <Label htmlFor="inv-email" className="text-xs" style={{ color: v('text-secondary') }}>
                  {tt(L.email)} <span aria-hidden="true">*</span><span className="sr-only">({tt(L.required)})</span>
                </Label>
                <Input id="inv-email" type="email" autoComplete="off" required aria-invalid={!!emailError} aria-describedby={emailError ? 'inv-email-error' : undefined}
                  value={sendForm.email} onChange={(e) => { setSendForm((p) => ({ ...p, email: e.target.value })); if (emailError) setEmailError(''); }}
                  className="mt-1" style={{ ...inputStyle, ...(emailError ? { borderColor: v('accent') } : {}) }} data-testid="invite-email-input" />
                {emailError && <p id="inv-email-error" className="text-xs mt-1" style={{ color: v('accent') }}>{emailError}</p>}
              </div>
              <div>
                <Label htmlFor="inv-phone" className="text-xs" style={{ color: v('text-secondary') }}>{tt(L.phone)}</Label>
                <Input id="inv-phone" type="tel" autoComplete="off" value={sendForm.phone} onChange={(e) => setSendForm((p) => ({ ...p, phone: e.target.value }))} className="mt-1" style={inputStyle} />
              </div>
              <div>
                <Label htmlFor="inv-gender" className="text-xs" style={{ color: v('text-secondary') }}>{tt(L.gender)}</Label>
                <select id="inv-gender" value={sendForm.gender} onChange={(e) => setSendForm((p) => ({ ...p, gender: e.target.value }))}
                  className="w-full px-3 py-2 border rounded text-sm mt-1" style={inputStyle}>
                  <option value="">{tt(L.select)}</option>
                  <option value="Male">{tt(L.male)}</option>
                  <option value="Female">{tt(L.female)}</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setSendOpen(false)} disabled={sending}
                  className={`flex-1 py-2 border rounded text-sm transition-opacity hover:opacity-80 disabled:opacity-50 ${focusRing}`} style={ghostBtn}>{tt(L.cancel)}</button>
                <button type="submit" disabled={sending} aria-busy={sending}
                  className={`flex-1 py-2 rounded text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 ${focusRing}`}
                  style={primaryBtn} data-testid="send-invite-submit">
                  {sending && <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />} {tt(L.send)}
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
