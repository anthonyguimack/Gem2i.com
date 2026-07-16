import React, { useState, useEffect, useMemo } from 'react';
import { adminAPI } from '../../lib/api';
import { toast } from 'sonner';
import RichTextEditor from '../../components/RichTextEditor';
import {
  Mail, Save, RotateCcw, Eye, Send, Loader2, ChevronRight, ChevronLeft,
  Palette, FileEdit, AlertCircle, CheckCircle2, Plus, Trash2,
} from 'lucide-react';

/**
 * Email Management — CMS section for editing every transactional email
 * the platform sends.
 *
 *  Two top-level tabs:
 *    1. Templates — list of all template keys (password reset, welcome,
 *       contact form, etc.).  Click one to edit its subject + body, see
 *       the variables it accepts, preview, and send a test.
 *    2. General Design — branding wrapper applied around all emails
 *       (logo, primary color, button color, footer text, social links).
 *
 *  The dynamic-variables panel and live preview always reflect the
 *  *unsaved draft*, so the operator sees exactly what will be sent.
 */
export default function EmailManagement() {
  const [tab, setTab] = useState('templates'); // 'templates' | 'branding'
  const [templates, setTemplates] = useState([]);
  const [activeKey, setActiveKey] = useState(null);
  const [activeTpl, setActiveTpl] = useState(null);
  const [draft, setDraft] = useState({ subject: '', body: '', enabled: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewSubject, setPreviewSubject] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [branding, setBranding] = useState(null);
  const [brandingSaving, setBrandingSaving] = useState(false);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const r = await adminAPI.listEmailTemplates();
      setTemplates(r.data || []);
      if (!activeKey && (r.data || []).length) {
        await openTemplate(r.data[0].key, r.data);
      }
    } catch (e) {
      toast.error('Could not load email templates');
    } finally {
      setLoading(false);
    }
  };

  const loadBranding = async () => {
    try {
      const r = await adminAPI.getEmailBranding();
      setBranding(r.data || {});
    } catch (e) {
      toast.error('Could not load email branding');
    }
  };

  const openTemplate = async (key, listOverride) => {
    try {
      const r = await adminAPI.getEmailTemplate(key);
      setActiveKey(key);
      setActiveTpl(r.data);
      setDraft({ subject: r.data.subject, body: r.data.body, enabled: r.data.enabled });
      setPreviewHtml('');
      setPreviewSubject('');
      // refresh list metadata silently if we have one
      if (listOverride) setTemplates(listOverride);
    } catch (e) {
      toast.error('Could not load template');
    }
  };

  useEffect(() => {
    loadTemplates();
    loadBranding();
  }, []);

  // Live preview — debounce so we don't slam the server on every keystroke.
  useEffect(() => {
    if (!activeKey) return;
    const handle = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const r = await adminAPI.previewEmailTemplate(activeKey, {
          subject: draft.subject,
          body: draft.body,
        });
        setPreviewHtml(r.data?.html || '');
        setPreviewSubject(r.data?.subject || '');
      } catch (e) {
        // keep last preview on transient error
      } finally {
        setPreviewLoading(false);
      }
    }, 500);
    return () => clearTimeout(handle);
  }, [activeKey, draft.subject, draft.body, branding]);

  const handleSave = async () => {
    if (!activeKey) return;
    if (!draft.subject.trim()) { toast.error('Subject is required'); return; }
    if (!draft.body.trim())    { toast.error('Body is required'); return; }
    setSaving(true);
    try {
      await adminAPI.updateEmailTemplate(activeKey, draft);
      toast.success('Template saved');
      // refresh list so "Customised" badge updates
      const r = await adminAPI.listEmailTemplates();
      setTemplates(r.data || []);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!activeKey || !activeTpl) return;
    if (!window.confirm('Reset this template back to the default subject and body? Your edits will be lost.')) return;
    try {
      await adminAPI.resetEmailTemplate(activeKey);
      setDraft({ subject: activeTpl.default_subject, body: activeTpl.default_body, enabled: true });
      toast.success('Template reset to default');
      const r = await adminAPI.listEmailTemplates();
      setTemplates(r.data || []);
    } catch (e) {
      toast.error('Reset failed');
    }
  };

  const handleTestSend = async () => {
    if (!activeKey) return;
    if (!testEmail.trim()) { toast.error('Enter a recipient email'); return; }
    setTestSending(true);
    try {
      const r = await adminAPI.testSendEmailTemplate(activeKey, { to_email: testEmail.trim() });
      if (r.data?.success) toast.success(r.data.message || 'Test email sent');
      else toast.error(r.data?.message || 'Send failed');
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Send failed');
    } finally {
      setTestSending(false);
    }
  };

  const insertVariable = (varName) => {
    // Append into the subject if the subject input is focused, otherwise into the body.
    const focused = document.activeElement;
    if (focused?.dataset?.testid === 'email-tpl-subject') {
      setDraft(d => ({ ...d, subject: `${d.subject}{{${varName}}}` }));
    } else {
      setDraft(d => ({ ...d, body: `${d.body} {{${varName}}} ` }));
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto" data-testid="email-management-page">
      <div className="mb-6 flex items-center gap-3">
        <Mail className="w-7 h-7 text-[#c9a84c]" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Management</h1>
          <p className="text-sm text-gray-500">Customise the subject, body, and branding of every email the platform sends.</p>
        </div>
      </div>

      <div className="border-b border-gray-200 mb-6 flex gap-1">
        <button
          onClick={() => setTab('templates')}
          className={`px-4 py-2.5 text-sm font-medium flex items-center gap-2 border-b-2 ${tab === 'templates' ? 'border-[#c9a84c] text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          data-testid="email-tab-templates"
        >
          <FileEdit className="w-4 h-4" /> Templates
        </button>
        <button
          onClick={() => setTab('branding')}
          className={`px-4 py-2.5 text-sm font-medium flex items-center gap-2 border-b-2 ${tab === 'branding' ? 'border-[#c9a84c] text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          data-testid="email-tab-branding"
        >
          <Palette className="w-4 h-4" /> General Design
        </button>
      </div>

      {tab === 'templates' && (
        <TemplatesTab
          templates={templates}
          loading={loading}
          activeKey={activeKey}
          activeTpl={activeTpl}
          draft={draft}
          setDraft={setDraft}
          openTemplate={openTemplate}
          handleSave={handleSave}
          handleReset={handleReset}
          handleTestSend={handleTestSend}
          insertVariable={insertVariable}
          previewHtml={previewHtml}
          previewSubject={previewSubject}
          previewLoading={previewLoading}
          saving={saving}
          testEmail={testEmail}
          setTestEmail={setTestEmail}
          testSending={testSending}
        />
      )}

      {tab === 'branding' && (
        <BrandingTab
          branding={branding}
          setBranding={setBranding}
          saving={brandingSaving}
          setSaving={setBrandingSaving}
          onSaved={loadBranding}
        />
      )}
    </div>
  );
}

// ──────────────── Templates tab ────────────────
function TemplatesTab({
  templates, loading, activeKey, activeTpl, draft, setDraft,
  openTemplate, handleSave, handleReset, handleTestSend, insertVariable,
  previewHtml, previewSubject, previewLoading, saving,
  testEmail, setTestEmail, testSending,
}) {
  const variables = activeTpl?.variables || {};

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Sidebar list */}
      <aside className="col-span-12 lg:col-span-3 bg-white rounded-lg border border-gray-200 overflow-hidden self-start">
        <div className="p-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Templates ({templates.length})</h3>
        </div>
        {loading ? (
          <div className="p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
        ) : (
          <ul data-testid="email-tpl-list">
            {templates.map(t => (
              <li key={t.key}>
                <button
                  onClick={() => openTemplate(t.key)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 ${activeKey === t.key ? 'bg-[#fdf6e3] border-l-4 border-l-[#c9a84c]' : ''}`}
                  data-testid={`email-tpl-item-${t.key}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{t.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{t.description}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[11px]">
                    {!t.is_default ? (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium">Customised</span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">Default</span>
                    )}
                    {!t.enabled && <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">Disabled</span>}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* Editor + Live preview (stacked) */}
      <main className="col-span-12 lg:col-span-7 space-y-4">
        {!activeTpl ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-lg p-12 text-center text-gray-500 text-sm">
            Select a template to start editing.
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4" data-testid="email-tpl-editor">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{activeTpl.name}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">{activeTpl.description}</p>
                </div>
                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.enabled}
                    onChange={e => setDraft(d => ({ ...d, enabled: e.target.checked }))}
                    data-testid="email-tpl-enabled"
                  />
                  {draft.enabled ? <span className="flex items-center gap-1 text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5" /> Enabled</span> : <span className="flex items-center gap-1 text-amber-700"><AlertCircle className="w-3.5 h-3.5" /> Disabled</span>}
                </label>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Subject</label>
                <input
                  type="text"
                  value={draft.subject}
                  onChange={e => setDraft(d => ({ ...d, subject: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/30"
                  placeholder="Email subject"
                  data-testid="email-tpl-subject"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Body</label>
                <RichTextEditor
                  value={draft.body}
                  onChange={(v) => setDraft(d => ({ ...d, body: v }))}
                  placeholder="Email body — supports formatting, lists, links, images."
                />
                <p className="text-[11px] text-gray-500 mt-1">Tip: tag links with <code className="bg-gray-100 px-1 rounded">class="btn"</code> in the source view to apply your branded button style.</p>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-[#1a2332] text-white rounded-md text-sm font-medium flex items-center gap-2 hover:bg-[#243046] disabled:opacity-50"
                  data-testid="email-tpl-save"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save changes
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium flex items-center gap-2 hover:bg-gray-50"
                  data-testid="email-tpl-reset"
                >
                  <RotateCcw className="w-4 h-4" /> Reset to default
                </button>
              </div>

              <div className="pt-3 border-t border-gray-100">
                <label className="text-xs font-medium text-gray-700 mb-1 block">Send a test email</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={testEmail}
                    onChange={e => setTestEmail(e.target.value)}
                    placeholder="recipient@example.com"
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                    data-testid="email-tpl-test-email"
                  />
                  <button
                    onClick={handleTestSend}
                    disabled={testSending}
                    className="px-3 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium flex items-center gap-2 hover:bg-gray-50 disabled:opacity-50"
                    data-testid="email-tpl-test-send"
                  >
                    {testSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Send test
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">Uses sample variable values. Requires SMTP configured in Settings → SMTP.</p>
              </div>
            </div>

            {/* Live preview now sits directly under the editor — easier to scan
                without scrolling, and matches the order operators read in. */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> Live preview</h3>
                {previewLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
              </div>
              <div className="p-3 bg-gray-100" data-testid="email-tpl-preview">
                {previewSubject && (
                  <div className="text-[11px] text-gray-600 mb-2 px-2">
                    <span className="font-medium">Subject:</span> {previewSubject}
                  </div>
                )}
                {previewHtml ? (
                  <iframe
                    title="Email preview"
                    srcDoc={previewHtml}
                    style={{ width: '100%', minHeight: 640, border: 0, background: '#fff', borderRadius: 6 }}
                  />
                ) : (
                  <div className="text-xs text-gray-400 text-center py-12">Preview will appear here.</div>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Right column: only variables now (preview moved to centre) */}
      <aside className="col-span-12 lg:col-span-2 self-start">
        {activeTpl && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 sticky top-4">
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Available variables</h3>
            <p className="text-[11px] text-gray-500 mb-3">Click to insert. Use these in the subject or body.</p>
            <ul className="space-y-1.5" data-testid="email-tpl-vars">
              {Object.entries(variables).map(([k, desc]) => (
                <li key={k}>
                  <button
                    onClick={() => insertVariable(k)}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-50 text-xs"
                    data-testid={`email-tpl-var-${k}`}
                  >
                    <code className="text-[#c9a84c] font-mono break-all">{`{{${k}}}`}</code>
                    <p className="text-gray-500 text-[11px] mt-0.5">{desc}</p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}

// ──────────────── Branding tab ────────────────
function BrandingTab({ branding, setBranding, saving, setSaving, onSaved }) {
  // Live preview wraps a sample body with the current branding via the
  // server's renderer so the operator sees the *real* output. Hooks must
  // be declared before any early return — handle the loading state below.
  const [previewHtml, setPreviewHtml] = useState('');
  useEffect(() => {
    if (!branding) return;
    const handle = setTimeout(async () => {
      try {
        // Render against an existing template so the wrapper stays representative.
        const r = await adminAPI.previewEmailTemplate('password_reset', {});
        setPreviewHtml(r.data?.html || '');
      } catch (e) {/* noop */}
    }, 400);
    return () => clearTimeout(handle);
  }, [branding?.logo_url, branding?.primary_color, branding?.button_color, branding?.button_text_color, branding?.font_family, branding?.footer_text, branding?.social_links?.length]);

  if (!branding) {
    return <div className="p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>;
  }
  const setField = (k, v) => setBranding(b => ({ ...b, [k]: v }));
  const setSocial = (idx, k, v) =>
    setBranding(b => ({ ...b, social_links: (b.social_links || []).map((s, i) => i === idx ? { ...s, [k]: v } : s) }));
  const addSocial = () =>
    setBranding(b => ({ ...b, social_links: [...(b.social_links || []), { platform: '', url: '' }] }));
  const removeSocial = (idx) =>
    setBranding(b => ({ ...b, social_links: (b.social_links || []).filter((_, i) => i !== idx) }));

  const save = async () => {
    setSaving(true);
    try {
      await adminAPI.updateEmailBranding(branding);
      toast.success('Branding saved');
      onSaved?.();
    } catch (e) {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 lg:col-span-7 bg-white rounded-lg border border-gray-200 p-5 space-y-5" data-testid="email-branding-form">
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Platform logo URL</label>
          <input
            type="text"
            value={branding.logo_url || ''}
            onChange={e => setField('logo_url', e.target.value)}
            placeholder="https://example.com/logo.png"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            data-testid="email-branding-logo"
          />
          <p className="text-[11px] text-gray-500 mt-1">Shown at the top of every email. Leave blank to fall back to the brand name.</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Primary color (header)</label>
            <div className="flex items-center gap-2">
              <input type="color" value={branding.primary_color || '#1a2332'} onChange={e => setField('primary_color', e.target.value)} className="w-10 h-10 rounded cursor-pointer" data-testid="email-branding-primary"/>
              <input type="text" value={branding.primary_color || ''} onChange={e => setField('primary_color', e.target.value)} className="flex-1 border border-gray-300 rounded-md px-2 py-1.5 text-sm font-mono"/>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Button color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={branding.button_color || '#c9a84c'} onChange={e => setField('button_color', e.target.value)} className="w-10 h-10 rounded cursor-pointer" data-testid="email-branding-button"/>
              <input type="text" value={branding.button_color || ''} onChange={e => setField('button_color', e.target.value)} className="flex-1 border border-gray-300 rounded-md px-2 py-1.5 text-sm font-mono"/>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Button text color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={branding.button_text_color || '#0d0f14'} onChange={e => setField('button_text_color', e.target.value)} className="w-10 h-10 rounded cursor-pointer"/>
              <input type="text" value={branding.button_text_color || ''} onChange={e => setField('button_text_color', e.target.value)} className="flex-1 border border-gray-300 rounded-md px-2 py-1.5 text-sm font-mono"/>
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Font family</label>
          <select
            value={branding.font_family || 'Inter'}
            onChange={e => setField('font_family', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
            data-testid="email-branding-font"
          >
            {(branding.available_fonts || [
              { family: 'Inter', label: 'Inter' },
              { family: 'Sora', label: 'Sora' },
              { family: 'Playfair', label: 'Playfair' },
              { family: 'Space Grotesk', label: 'Space Grotesk' },
              { family: 'DM Sans', label: 'DM Sans' },
            ]).map(f => (
              <option key={f.family} value={f.family} style={{ fontFamily: f.family }}>{f.label}</option>
            ))}
          </select>
          <p className="text-[11px] text-gray-500 mt-1">Applied to every email — body text, headings and the branded button. Same options as Section → Page Builder → Font.</p>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Footer text</label>
          <input
            type="text"
            value={branding.footer_text || ''}
            onChange={e => setField('footer_text', e.target.value)}
            placeholder="© {{platform_name}} — All rights reserved."
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            data-testid="email-branding-footer"
          />
          <p className="text-[11px] text-gray-500 mt-1">Supports <code className="bg-gray-100 px-1 rounded">{'{{platform_name}}'}</code>.</p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-gray-700">Social links (optional)</label>
            <button onClick={addSocial} className="text-xs text-[#c9a84c] hover:text-[#b8973f] flex items-center gap-1" data-testid="email-branding-add-social">
              <Plus className="w-3.5 h-3.5" /> Add link
            </button>
          </div>
          <div className="space-y-2">
            {(branding.social_links || []).length === 0 && (
              <p className="text-[11px] text-gray-500">No social links yet.</p>
            )}
            {(branding.social_links || []).map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={s.platform || ''}
                  onChange={e => setSocial(i, 'platform', e.target.value)}
                  placeholder="Twitter"
                  className="w-32 border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                />
                <input
                  type="text"
                  value={s.url || ''}
                  onChange={e => setSocial(i, 'url', e.target.value)}
                  placeholder="https://twitter.com/yourhandle"
                  className="flex-1 border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                />
                <button onClick={() => removeSocial(i)} className="p-1.5 text-red-500 hover:bg-red-50 rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-3 border-t border-gray-100">
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 bg-[#1a2332] text-white rounded-md text-sm font-medium flex items-center gap-2 hover:bg-[#243046] disabled:opacity-50"
            data-testid="email-branding-save"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save branding
          </button>
        </div>
      </div>

      <aside className="col-span-12 lg:col-span-5">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> Sample preview (Password Reset)</h3>
          </div>
          <div className="p-3 bg-gray-100" style={{ maxHeight: 800, overflow: 'auto' }}>
            {previewHtml ? (
              <iframe title="Branding preview" srcDoc={previewHtml} style={{ width: '100%', minHeight: 600, border: 0, background: '#fff', borderRadius: 6 }} />
            ) : (
              <div className="text-xs text-gray-400 text-center py-12">Save your branding to see it applied.</div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
