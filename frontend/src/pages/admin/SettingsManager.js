import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Save, Loader2, Globe, Palette, Mail, Shield, Plug, Rss, Plus, Trash2, Send, Wifi, Users, Layout, ChevronDown, ChevronRight, Check, Map, Languages, CreditCard, Eye, EyeOff, Copy, AlertTriangle, Link2, RefreshCw, XCircle, Webhook, Bot, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { LANGUAGE_LABELS } from '../../lib/i18n';
import LocalizedField from '../../components/admin/LocalizedField';
import ImageUpload from '../../components/ImageUpload';
import RichTextEditor from '../../components/RichTextEditor';
import { WEBSITE_COLORS, MYACCOUNT_COLORS, ADMIN_COLORS, LANDING_PAGE_COLORS, ENROLLMENT_COLORS, PMS_COLORS, THEMES } from '../../lib/themeColors';
import { MAP_LANGUAGES } from '../../lib/mapConfig';
import { useSocialCatalog, resolveKey, SocialIcon } from '../../lib/socialCatalog';

function ColorGroup({ title, description, colors, values, onChange, testIdPrefix }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border rounded-sm overflow-hidden" style={{ borderColor: 'var(--ad-card-border, #e2e8f0)' }} data-testid={`color-group-${testIdPrefix}`}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-slate-50 transition-colors">
        <div>
          <h3 className="font-semibold text-sm" style={{ color: 'var(--ad-heading, #1a2332)' }}>{title}</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--ad-text-secondary, #64748b)' }}>{description}</p>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
      </button>
      {open && (
        <div className="px-5 py-4 border-t border-slate-100">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {colors.map(cf => (
              <div key={cf.key} className="p-2.5 border border-slate-100 rounded-sm">
                <Label className="text-xs block mb-1.5">{cf.label}</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={values[cf.key] || cf.default} onChange={e => onChange(cf.key, e.target.value)} className="w-7 h-7 rounded-sm cursor-pointer border-0 flex-shrink-0" />
                  <Input value={values[cf.key] || cf.default} onChange={e => onChange(cf.key, e.target.value)} className="flex-1 h-7 text-xs font-mono" data-testid={`color-${testIdPrefix}-${cf.key}`} />
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => {
            const defaults = {};
            colors.forEach(c => { defaults[c.key] = c.default; });
            Object.keys(defaults).forEach(k => onChange(k, defaults[k]));
          }} className="mt-3 text-xs text-slate-400 hover:text-slate-600 hover:underline">
            Reset to defaults
          </button>
        </div>
      )}
    </div>
  );
}

// A draggable Social Links row (project convention — same @dnd-kit sortable
// pattern as /admin/section-order). Stored array order is the render order
// everywhere the networks appear, so dragging here reorders all of them.
function SortableSocialRow({ id, link, idx, socialByKey, shareables, displays, payments, onPick, onUpdate, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };
  const key = link.key || resolveKey(socialByKey, link) || '';
  const entry = socialByKey[key];
  const shareCapable = !!(entry && entry.share_capable);
  const isPayment = !!(entry && entry.payment);
  const active = link.active !== false;
  const urlMissing = active && !(link.url || '').trim();
  return (
    <div ref={setNodeRef} style={style} className="flex flex-wrap items-center gap-3 p-3 border border-slate-100 rounded-sm bg-white" data-testid={`social-row-${idx}`}>
      {/* drag handle */}
      <button type="button" {...attributes} {...listeners}
        className="flex-shrink-0 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 touch-none"
        aria-label="Drag to reorder" title="Drag to reorder" data-testid={`social-drag-${idx}`}>
        <GripVertical className="w-5 h-5" />
      </button>
      {/* icon preview */}
      <span className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-sm bg-slate-50 border border-slate-200 text-slate-700">
        <SocialIcon svg={entry && entry.svg} size={16} />
      </span>
      {/* network picker */}
      <select
        value={key}
        onChange={e => onPick(idx, e.target.value)}
        className="px-2 py-1 bg-white border border-slate-200 rounded-sm text-sm h-8 w-40"
        data-testid={`social-network-${idx}`}>
        <option value="">Custom…</option>
        <optgroup label="Can share">
          {shareables.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </optgroup>
        <optgroup label="Display only">
          {displays.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </optgroup>
        <optgroup label="Payment">
          {payments.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </optgroup>
      </select>
      {!entry && (
        <Input value={link.platform || ''} onChange={e => onUpdate(idx, 'platform', e.target.value)} placeholder="Label" className="w-28 h-8 text-sm" data-testid={`social-label-${idx}`} />
      )}
      {/* URL */}
      <Input value={link.url || ''} onChange={e => onUpdate(idx, 'url', e.target.value)} placeholder="https://…" className="flex-1 min-w-[180px] h-8 text-sm" data-testid={`social-url-${idx}`} />
      {/* active toggle */}
      <label className="flex items-center gap-2 text-sm text-slate-600 select-none">
        <Switch checked={active} onCheckedChange={v => onUpdate(idx, 'active', v)} data-testid={`social-active-${idx}`} />
        <span className={active ? 'text-slate-700' : 'text-slate-400'}>{active ? 'Active' : 'Off'}</span>
      </label>
      <button onClick={() => onRemove(idx)} className="p-1 text-red-400 hover:text-red-600" data-testid={`social-remove-${idx}`}><Trash2 className="w-4 h-4" /></button>
      {/* capability badge — full-width second line */}
      <div className="basis-full flex flex-wrap items-center gap-2 pl-11">
        {shareCapable ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Check className="w-3 h-3" /> Share button
          </span>
        ) : (
          <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            No sharing function — will not appear in the brand's sharing sections
          </span>
        )}
        {isPayment && (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
            <CreditCard className="w-3 h-3" /> Payment
          </span>
        )}
        {urlMissing && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
            <AlertTriangle className="w-3 h-3" /> Active but no URL set
          </span>
        )}
      </div>
    </div>
  );
}

export default function SettingsManager() {
  const [settings, setSettings] = useState({});
  const { catalog: socialCatalog, byKey: socialByKey } = useSocialCatalog();
  const [loading, setLoading] = useState(false);
  const [testingConn, setTestingConn] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [stripeStatus, setStripeStatus] = useState({ configured: false, mode: null, webhook_url: '', site_url: '' });
  const [stripeKeyDraft, setStripeKeyDraft] = useState(''); // unsaved new key (write-only)
  const [stripeKeyVisible, setStripeKeyVisible] = useState(false);
  const [kmsSyncKeyDraft, setKmsSyncKeyDraft] = useState(''); // write-only, never returned by server
  const [kmsSyncKeyVisible, setKmsSyncKeyVisible] = useState(false);
  const [stripeTesting, setStripeTesting] = useState(false);
  const [stripeTestResult, setStripeTestResult] = useState(null); // {ok, code, message, account_id, ...}
  // Discord webhook URLs are write-only secrets (server returns only *_set flags).
  const [discordDrafts, setDiscordDrafts] = useState({ morning_discord_webhook: '', news_discord_webhook: '', news_discord_webhook_news: '' });
  const [discordVisible, setDiscordVisible] = useState({}); // { [key]: bool }
  const [discordTest, setDiscordTest] = useState({});       // { [target]: 'testing'|'ok'|'failed'|'skipped' }
  // Claude API key (Pro Manager) — write-only secret, same pattern as the webhooks.
  const [claudeKeyDraft, setClaudeKeyDraft] = useState('');
  const [claudeKeyVisible, setClaudeKeyVisible] = useState(false);
  const [claudeTest, setClaudeTest] = useState(null); // null | 'testing' | {status, message, model}

  useEffect(() => {
    adminAPI.getSettings().then(r => setSettings(r.data || {})).catch(console.error);
    adminAPI.getStripeStatus().then(r => setStripeStatus(r.data || {})).catch(() => {});
  }, []);

  const save = async () => {
    setLoading(true);
    try {
      // Only POST stripe_api_key if the operator typed something — empty string
      // would clear the saved key, undefined leaves it untouched.
      const payload = { ...settings };
      if (stripeKeyDraft !== '') {
        payload.stripe_api_key = stripeKeyDraft.trim();
      }
      if (kmsSyncKeyDraft !== '') {
        payload.kms_sync_key = kmsSyncKeyDraft.trim();
      }
      // Discord webhook URLs: only send a draft that was typed (write-only, like the keys above).
      Object.keys(discordDrafts).forEach(k => {
        if (discordDrafts[k] !== '') payload[k] = discordDrafts[k].trim();
      });
      if (claudeKeyDraft !== '') {
        payload.claude_api_key = claudeKeyDraft.trim();
      }
      const r = await adminAPI.updateSettings(payload);
      // Server strips secrets from the response — keep masked flags only.
      setSettings(r.data || {});
      setStripeKeyDraft('');
      setStripeKeyVisible(false);
      setKmsSyncKeyDraft('');
      setKmsSyncKeyVisible(false);
      setDiscordDrafts({ morning_discord_webhook: '', news_discord_webhook: '', news_discord_webhook_news: '' });
      setDiscordVisible({});
      setClaudeKeyDraft('');
      setClaudeKeyVisible(false);
      adminAPI.getStripeStatus().then(s => setStripeStatus(s.data || {})).catch(() => {});
      toast.success('Settings saved! Refresh the page to see color changes.');
    }
    catch { toast.error('Error saving'); }
    finally { setLoading(false); }
  };

  const clearStripeKey = async () => {
    if (!window.confirm('Clear the saved Stripe API key? Payments will stop until a new key is saved.')) return;
    try {
      await adminAPI.updateSettings({ stripe_api_key: '' });
      setStripeKeyDraft('');
      setStripeKeyVisible(false);
      const s = await adminAPI.getStripeStatus();
      setStripeStatus(s.data || {});
      const r = await adminAPI.getSettings();
      setSettings(r.data || {});
      toast.success('Stripe key cleared');
    } catch { toast.error('Error clearing key'); }
  };

  const copyWebhookUrl = () => {
    if (!stripeStatus.webhook_url) return;
    navigator.clipboard?.writeText(stripeStatus.webhook_url);
    toast.success('Webhook URL copied');
  };

  // Ping the Claude API with the SAVED key (Pro Manager). Save before testing a new paste.
  const testClaude = async () => {
    setClaudeTest('testing');
    try {
      const r = await adminAPI.testClaude();
      setClaudeTest(r.data || { status: 'error', message: 'no response' });
    } catch {
      setClaudeTest({ status: 'error', message: 'request failed' });
    }
  };

  // Send a sample embed to a saved Discord webhook. Tests the STORED config, so
  // a freshly typed URL must be saved first.
  const testDiscord = async (target) => {
    setDiscordTest(t => ({ ...t, [target]: 'testing' }));
    try {
      const r = await adminAPI.testDiscordWebhook(target);
      const st = r.data?.status || 'failed';
      setDiscordTest(t => ({ ...t, [target]: st }));
      if (st === 'ok') toast.success('Test message sent to Discord');
      else if (st === 'skipped') toast.error('Save a webhook URL for this channel first');
      else toast.error(`Discord test failed${r.data?.message ? ` — ${r.data.message}` : ''}`);
    } catch {
      setDiscordTest(t => ({ ...t, [target]: 'failed' }));
      toast.error('Discord test failed');
    }
  };

  const testStripeConnection = async () => {
    setStripeTesting(true);
    setStripeTestResult(null);
    try {
      // If the operator is currently typing a draft key, test THAT one;
      // otherwise test whichever key is currently saved (CMS or env).
      const draft = stripeKeyDraft.trim();
      const r = await adminAPI.testStripeConnection(draft || null);
      setStripeTestResult(r.data);
      if (r.data?.ok) {
        toast.success(`Stripe connection OK · ${r.data.mode?.toUpperCase()}`);
      } else {
        toast.error(r.data?.message || 'Stripe test failed');
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Test failed');
      setStripeTestResult({ ok: false, code: 'error', message: 'Test request failed.' });
    } finally {
      setStripeTesting(false);
    }
  };

  const updateSection = (key, field, value) => {
    setSettings(prev => ({ ...prev, sections: { ...prev.sections, [key]: { ...prev.sections?.[key], [field]: value } } }));
  };

  const updateThemeColor = (group, key, value) => {
    setSettings(prev => ({
      ...prev,
      theme_colors: {
        ...prev.theme_colors,
        [group]: { ...(prev.theme_colors || {})[group], [key]: value }
      }
    }));
  };

  const updateSocialLink = (index, field, value) => {
    setSettings(prev => {
      const links = [...(prev.social_links || [])];
      links[index] = { ...links[index], [field]: value };
      return { ...prev, social_links: links };
    });
  };

  const addSocialLink = () => {
    setSettings(prev => ({
      ...prev,
      social_links: [...(prev.social_links || []), { id: Date.now().toString(), key: '', platform: '', url: '', icon: 'website', active: true }]
    }));
  };

  // Pick a catalog network for a row: snap key/label/icon together. '' = Custom (free-form).
  const pickSocialNetwork = (index, key) => {
    setSettings(prev => {
      const links = [...(prev.social_links || [])];
      const entry = socialByKey[key];
      links[index] = entry
        ? { ...links[index], key, platform: links[index].platform || entry.label, icon: entry.icon }
        : { ...links[index], key: '' };
      return { ...prev, social_links: links };
    });
  };

  const removeSocialLink = (index) => {
    setSettings(prev => ({
      ...prev,
      social_links: (prev.social_links || []).filter((_, i) => i !== index)
    }));
  };

  // Drag-and-drop reordering (project convention — same @dnd-kit pattern as
  // /admin/section-order). The stored array order IS the render order everywhere
  // the networks appear (website Footer/Navbar, KMS footer, and the post share
  // row), so reordering here is the single control for all of them.
  const socialSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const handleSocialDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    setSettings(prev => {
      const links = [...(prev.social_links || [])];
      const from = links.findIndex(l => l.id === active.id);
      const to = links.findIndex(l => l.id === over.id);
      if (from < 0 || to < 0) return prev;
      return { ...prev, social_links: arrayMove(links, from, to) };
    });
  };

  // Drag needs a stable id per row; backfill any legacy row that lacks one.
  useEffect(() => {
    const links = settings.social_links;
    if (Array.isArray(links) && links.some(l => !l.id)) {
      setSettings(prev => ({
        ...prev,
        social_links: (prev.social_links || []).map((l, i) => (l.id ? l : { ...l, id: `sl_${Date.now()}_${i}` })),
      }));
    }
  }, [settings.social_links]);

  const testConnection = async () => {
    setTestingConn(true);
    try {
      const res = await adminAPI.testSmtpConnection(settings);
      if (res.data.success) toast.success(res.data.message);
      else toast.error(res.data.message);
    } catch (e) { toast.error(e.response?.data?.detail || 'Test failed'); }
    finally { setTestingConn(false); }
  };

  const testEmail = async () => {
    setTestingEmail(true);
    try {
      const res = await adminAPI.testSmtpEmail({ ...settings, test_email: settings.email_to || settings.smtp_user });
      if (res.data.success) toast.success(res.data.message);
      else toast.error(res.data.message);
    } catch (e) { toast.error(e.response?.data?.detail || 'Test failed'); }
    finally { setTestingEmail(false); }
  };

  const tc = settings.theme_colors || {};
  // Migrate legacy colors if theme_colors.website is empty
  const websiteColors = tc.website || settings.colors || {};
  const myAccountColors = tc.my_account || {};
  const adminColors = tc.admin || {};
  const landingPageColors = tc.landing_page || {};
  const enrollmentColors = tc.enrollment || {};
  const pmsColors = tc.pms || {};

  const activeTheme = settings.active_theme || 'default';
  // Discord webhook tab: brand accent = default embed color; brand name = default sender.
  const discordAccentHex = (tc.website || {}).accent || '#0D9488';
  const discordBrandName = (typeof settings.brand_name === 'string' ? settings.brand_name : (settings.brand_name && settings.brand_name.en))
    || (typeof settings.site_name === 'string' ? settings.site_name : (settings.site_name && settings.site_name.en))
    || 'Your brand name';

  return (
    <div data-testid="settings-manager">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--ad-heading, #1a2332)', fontFamily: 'Playfair Display, serif' }}>Settings</h1>
        <button onClick={save} disabled={loading} className="text-white px-4 py-2 rounded-sm text-sm font-medium flex items-center gap-2 disabled:opacity-50" style={{ backgroundColor: 'var(--ad-button-bg, #0D9488)' }} data-testid="settings-save-btn">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Settings
        </button>
      </div>
      <Tabs defaultValue="general">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="general"><Globe className="w-3 h-3 mr-1" />General</TabsTrigger>
          <TabsTrigger value="colors"><Palette className="w-3 h-3 mr-1" />Colors</TabsTrigger>
          <TabsTrigger value="themes"><Layout className="w-3 h-3 mr-1" />Themes</TabsTrigger>
          <TabsTrigger value="sections"><Shield className="w-3 h-3 mr-1" />Sections</TabsTrigger>
          <TabsTrigger value="social"><Globe className="w-3 h-3 mr-1" />Social Links</TabsTrigger>
          <TabsTrigger value="languages"><Languages className="w-3 h-3 mr-1" />Languages</TabsTrigger>
          <TabsTrigger value="email"><Mail className="w-3 h-3 mr-1" />Email/SMTP</TabsTrigger>
          <TabsTrigger value="blogapi"><Rss className="w-3 h-3 mr-1" />Blog API</TabsTrigger>
          <TabsTrigger value="membership"><Users className="w-3 h-3 mr-1" />Membership</TabsTrigger>
          <TabsTrigger value="stripe" data-testid="tab-stripe"><CreditCard className="w-3 h-3 mr-1" />Stripe</TabsTrigger>
          <TabsTrigger value="apis"><Plug className="w-3 h-3 mr-1" />APIs</TabsTrigger>
          <TabsTrigger value="integrations" data-testid="tab-integrations"><Link2 className="w-3 h-3 mr-1" />Integrations</TabsTrigger>
          <TabsTrigger value="webhook" data-testid="tab-webhook"><Webhook className="w-3 h-3 mr-1" />Webhook</TabsTrigger>
          {/* AI tab only where Pro Management is enabled (carlos-only flag) */}
          {settings.pro_manager_enabled && (
            <TabsTrigger value="ai" data-testid="tab-ai"><Bot className="w-3 h-3 mr-1" />AI</TabsTrigger>
          )}
          <TabsTrigger value="captcha" data-testid="tab-captcha"><Shield className="w-3 h-3 mr-1" />Captcha</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <div className="bg-white rounded-sm border border-slate-100 p-6 space-y-4">
            {/* Site URL — single source of truth for outbound links, webhooks, etc. */}
            <div className="rounded-sm border border-blue-100 bg-blue-50/50 p-4 space-y-2">
              <Label className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" /> Site URL
                <span className="text-xs text-slate-400 font-normal">(domain or IP, with or without http://)</span>
              </Label>
              <Input
                value={settings.site_url || ''}
                onChange={e => setSettings({ ...settings, site_url: e.target.value })}
                placeholder="https://yourdomain.com"
                className="font-mono text-sm"
                data-testid="settings-site-url"
              />
              <p className="text-xs text-slate-500">
                Used in webhook URLs, password-reset emails, QR / invite-code links and other outbound URLs.
                We&apos;ll auto-add <code>https://</code> if you omit it; trailing slash is removed.
                Changes take effect immediately — no server restart needed.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><Label>Brand Name</Label>
                <LocalizedField value={settings.brand_name} onChange={v => setSettings({...settings, brand_name: v})} render={({ value, onChange }) => (
                  <Input value={value || ''} onChange={e => onChange(e.target.value)} className="mt-1" data-testid="settings-brand-name" />
                )} />
              </div>
              <div><Label>Tagline</Label>
                <LocalizedField value={settings.tagline} onChange={v => setSettings({...settings, tagline: v})} render={({ value, onChange }) => (
                  <Input value={value || ''} onChange={e => onChange(e.target.value)} className="mt-1" />
                )} />
              </div>
            </div>
            <div><Label>Meta Title</Label>
              <LocalizedField value={settings.meta_title} onChange={v => setSettings({...settings, meta_title: v})} render={({ value, onChange }) => (
                <Input value={value || ''} onChange={e => onChange(e.target.value)} className="mt-1" />
              )} />
            </div>
            <div><Label>Meta Description</Label>
              <LocalizedField value={settings.meta_description} onChange={v => setSettings({...settings, meta_description: v})} render={({ value, onChange }) => (
                <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={2} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-sm mt-1" />
              )} />
            </div>

            <hr className="border-slate-200" />
            <div>
              <Label>CMS Welcome <span className="text-xs text-slate-400 font-normal">(Shown to operators without Dashboard permission)</span></Label>
              <p className="text-xs text-slate-400 mb-2">Rich text greeting rendered on the CMS welcome page when an operator's role doesn't grant access to the Dashboard. HTML formatting is preserved when displayed.</p>
              <LocalizedField value={settings.cms_welcome} onChange={v => setSettings({...settings, cms_welcome: v})} render={({ value, onChange }) => (
                <RichTextEditor value={value || ''} onChange={onChange} placeholder="Welcome to the CMS! Use the sidebar to navigate to your assigned sections..." data-testid="settings-cms-welcome" />
              )} />
            </div>

            <hr className="border-slate-200" />
            <h3 className="font-semibold text-sm" style={{ color: 'var(--ad-heading, #1a2332)' }}>Logo &amp; Favicon</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label>Logo On #1 <span className="text-xs text-slate-400 font-normal">(Hero / Initial)</span></Label>
                <p className="text-xs text-slate-400 mb-2">Shown on the hero or when the page first loads (before scrolling).</p>
                <ImageUpload value={settings.logo_on_1 || ''} onChange={v => setSettings({...settings, logo_on_1: v})} data-testid="settings-logo-on-1" />
              </div>
              <div>
                <Label>Logo On #2 <span className="text-xs text-slate-400 font-normal">(Scrolled Header)</span></Label>
                <p className="text-xs text-slate-400 mb-2">Shown when the header has a white/solid background (after scrolling).</p>
                <ImageUpload value={settings.logo_on_2 || ''} onChange={v => setSettings({...settings, logo_on_2: v})} data-testid="settings-logo-on-2" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label>Logo Off <span className="text-xs text-slate-400 font-normal">(Footer, Admin Sidebar, My Account)</span></Label>
                <p className="text-xs text-slate-400 mb-2">Displayed in the footer, admin sidebar, and My Account sidebar.</p>
                <ImageUpload value={settings.logo_off || ''} onChange={v => setSettings({...settings, logo_off: v})} data-testid="settings-logo-off" />
              </div>
              <div>
                <Label>Favicon</Label>
                <p className="text-xs text-slate-400 mb-2">Browser tab icon. Recommended: 32x32 or 64x64 PNG.</p>
                <ImageUpload value={settings.favicon || ''} onChange={v => setSettings({...settings, favicon: v})} data-testid="settings-favicon" />
              </div>
            </div>

            <hr className="border-slate-200" />
            <h3 className="font-semibold text-sm" style={{ color: 'var(--ad-heading, #1a2332)' }}>Footer Text</h3>
            <div><Label>Footer Description</Label><p className="text-xs text-slate-400 mb-1">Text shown below the logo in the footer.</p>
              <LocalizedField value={settings.footer_description} onChange={v => setSettings({...settings, footer_description: v})} render={({ value, onChange }) => (
                <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={2} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-sm mt-1" data-testid="settings-footer-description" />
              )} />
            </div>
            <div><Label>Footer Copyright</Label><p className="text-xs text-slate-400 mb-1">Copyright text at the bottom of the footer.</p>
              <LocalizedField value={settings.footer_copyright} onChange={v => setSettings({...settings, footer_copyright: v})} render={({ value, onChange }) => (
                <Input value={value || ''} onChange={e => onChange(e.target.value)} className="mt-1" data-testid="settings-footer-copyright" />
              )} />
            </div>
            <div><Label>Footer Newsletter Heading</Label><p className="text-xs text-slate-400 mb-1">Label above the email field in the footer (e.g. "Get the latest insights delivered to your inbox.").</p>
              <LocalizedField value={settings.footer_newsletter_text} onChange={v => setSettings({...settings, footer_newsletter_text: v})} render={({ value, onChange }) => (
                <Input value={value || ''} onChange={e => onChange(e.target.value)} placeholder="Get the latest insights delivered to your inbox." className="mt-1" data-testid="settings-footer-newsletter" />
              )} />
            </div>
            <div><Label>Footer Newsletter Placeholder</Label>
              <LocalizedField value={settings.footer_newsletter_placeholder} onChange={v => setSettings({...settings, footer_newsletter_placeholder: v})} render={({ value, onChange }) => (
                <Input value={value || ''} onChange={e => onChange(e.target.value)} placeholder="Email address" className="mt-1" data-testid="settings-footer-newsletter-ph" />
              )} />
            </div>

            <hr className="border-slate-200" />
            <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: 'var(--ad-heading, #1a2332)' }}><Map className="w-4 h-4" /> Maps Configuration</h3>
            <div>
              <Label>Maps Language</Label>
              <p className="text-xs text-slate-400 mb-1">Select the language for map tile labels globally across all maps.</p>
              <select value={settings.maps_language || 'local'} onChange={e => setSettings({...settings, maps_language: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-sm mt-1" data-testid="settings-maps-language">
                {MAP_LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>

            <hr className="border-slate-200" />
            <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: 'var(--ad-heading, #1a2332)' }}>Landing Page</h3>
            <div>
              <Label>Enable Landing Page</Label>
              <p className="text-xs text-slate-400 mb-2">When enabled, visitors see the Landing Page instead of the Website until the launch date.</p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="lp_enabled" checked={settings.landing_page_enabled === true} onChange={() => setSettings({...settings, landing_page_enabled: true})} className="accent-[#0D9488]" data-testid="lp-enabled-yes" />
                  <span className="text-sm">Yes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="lp_enabled" checked={settings.landing_page_enabled !== true} onChange={() => setSettings({...settings, landing_page_enabled: false})} className="accent-[#0D9488]" data-testid="lp-enabled-no" />
                  <span className="text-sm">No</span>
                </label>
              </div>
            </div>
            {settings.landing_page_enabled && (
              <>
                <div>
                  <Label>Website Launch Date</Label>
                  <p className="text-xs text-slate-400 mb-1">The landing page shows until this date, then auto-switches to the website.</p>
                  <Input type="datetime-local" value={settings.landing_page_launch_date || ''} onChange={e => setSettings({...settings, landing_page_launch_date: e.target.value})} className="mt-1" data-testid="lp-launch-date" />
                </div>
                <div>
                  <Label>Landing Page Logo</Label>
                  <p className="text-xs text-slate-400 mb-1">Exclusive logo for the landing page. Upload or paste URL.</p>
                  <ImageUpload value={settings.landing_page_logo || ''} onChange={v => setSettings({...settings, landing_page_logo: v})} data-testid="lp-logo" />
                </div>
              </>
            )}
            <div className="border-t pt-4 mt-4">
              <h3 className="font-semibold mb-2" style={{ color: 'var(--ad-heading, #1a2332)' }}>Membership Enrollment</h3>
              <div>
                <Label>Membership Enrollment Logo</Label>
                <p className="text-xs text-slate-400 mb-1">Exclusive logo displayed only in the Membership Enrollment portal. Upload or paste URL.</p>
                <ImageUpload value={settings.enrollment_logo || ''} onChange={v => setSettings({...settings, enrollment_logo: v})} data-testid="enrollment-logo" />
              </div>
            </div>

            <hr className="border-slate-200" />
            <h3 className="font-semibold text-sm" style={{ color: 'var(--ad-heading, #1a2332)' }}>Mentor Slot Templates</h3>
            <div>
              <Label>Enable Mentor Slot Templates</Label>
              <p className="text-xs text-slate-400 mb-2">When enabled, mentors see an &quot;Apply Template&quot; dropdown inside the slot editor that pre-fills title, duration, description, and virtual link from admin-managed templates. Manage the library in <span className="font-medium">Calendar &rarr; Mentor Slot Templates</span>.</p>
              <div className="flex items-center gap-3">
                <Switch
                  checked={settings.mentor_slot_templates_enabled === true}
                  onCheckedChange={(checked) => setSettings({ ...settings, mentor_slot_templates_enabled: checked })}
                  data-testid="mentor-slot-templates-toggle"
                />
                <span className="text-sm text-slate-600">{settings.mentor_slot_templates_enabled ? 'Enabled' : 'Disabled'}</span>
              </div>
            </div>

            <hr className="border-slate-200" />
            <h3 className="font-semibold text-sm" style={{ color: 'var(--ad-heading, #1a2332)' }}>Paid Mentor Slots (Stripe)</h3>
            <div>
              <Label>Enable Paid Mentor Slots</Label>
              <p className="text-xs text-slate-400 mb-2">When enabled, mentors can set a <strong>Price</strong> on each slot and members must pay via Stripe before the booking confirms. When disabled, all bookings stay free — no checkout ever appears, even if a price is saved. This toggle takes effect immediately without redeployment.</p>
              <div className="flex items-center gap-3">
                <Switch
                  checked={settings.mentor_slots_paid_enabled === true}
                  onCheckedChange={(checked) => setSettings({ ...settings, mentor_slots_paid_enabled: checked })}
                  data-testid="mentor-slots-paid-toggle"
                />
                <span className="text-sm text-slate-600">{settings.mentor_slots_paid_enabled ? 'Enabled — Stripe active on booking flow' : 'Disabled — bookings remain free'}</span>
              </div>
            </div>
            <div>
              <Label>Platform Fee (%)</Label>
              <p className="text-xs text-slate-400 mb-1">Percentage deducted from mentor gross earnings. Applies to the payouts ledger (Calendar → Payouts). Default: 15%.</p>
              <Input
                type="number" min={0} max={100} step="0.01"
                value={settings.platform_fee_percent ?? 15}
                onChange={e => setSettings({ ...settings, platform_fee_percent: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)) })}
                className="max-w-[120px]"
                data-testid="platform-fee-input"
              />
            </div>

            <hr className="border-slate-200" />
            <h3 className="font-semibold text-sm" style={{ color: 'var(--ad-heading, #1a2332)' }}>Paid Session Bundles (Stripe)</h3>
            <div>
              <Label>Enable Paid Session Bundles</Label>
              <p className="text-xs text-slate-400 mb-2">Independent of the per-slot toggle above. When enabled, members can purchase prepaid session bundles (credit packs) via Stripe. When disabled, bundle checkout is blocked even if the per-slot toggle is on.</p>
              <div className="flex items-center gap-3">
                <Switch
                  checked={settings.paid_bundles_enabled === true}
                  onCheckedChange={(checked) => setSettings({ ...settings, paid_bundles_enabled: checked })}
                  data-testid="paid-bundles-toggle"
                />
                <span className="text-sm text-slate-600">{settings.paid_bundles_enabled ? 'Enabled — Stripe active on bundle checkout' : 'Disabled — bundles cannot be purchased'}</span>
              </div>
            </div>

            <hr className="border-slate-200" />
            <h3 className="font-semibold text-sm" style={{ color: 'var(--ad-heading, #1a2332)' }}>My Account Color Scheme</h3>
            <div>
              <Label>Native form control color-scheme</Label>
              <p className="text-xs text-slate-400 mb-2">Controls the native chrome of date/time pickers, select dropdowns and scrollbars across the My Account area. Choose the scheme that matches your configured My Account background colors so native icons remain visible.</p>
              <div className="flex items-center gap-6" data-testid="my-account-color-scheme">
                {['dark', 'light'].map(opt => (
                  <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--ad-text-primary, #334155)' }}>
                    <input
                      type="radio"
                      name="my_account_color_scheme"
                      value={opt}
                      checked={(settings.my_account_color_scheme || 'dark') === opt}
                      onChange={() => setSettings({ ...settings, my_account_color_scheme: opt })}
                      data-testid={`ma-scheme-${opt}`}
                    />
                    <span className="capitalize">{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="colors">
          <div className="space-y-4" data-testid="colors-tab">
            <div className="bg-white rounded-sm border border-slate-100 p-4">
              <p className="text-sm text-slate-500">Customize colors for every section of the application. Changes apply globally after saving.</p>
            </div>
            <ColorGroup
              title="Website"
              description="Colors for the public-facing frontend — header, hero, cards, buttons, footer."
              colors={WEBSITE_COLORS}
              values={websiteColors}
              onChange={(key, val) => updateThemeColor('website', key, val)}
              testIdPrefix="website"
            />
            <ColorGroup
              title="My Account (Member Portal)"
              description="Colors for the member portal — sidebar, cards, forms, modals, progress bars."
              colors={MYACCOUNT_COLORS}
              values={myAccountColors}
              onChange={(key, val) => updateThemeColor('my_account', key, val)}
              testIdPrefix="myaccount"
            />
            <ColorGroup
              title="CMS (Admin Panel)"
              description="Colors for the admin interface — sidebar, navbar, tables, buttons, badges."
              colors={ADMIN_COLORS}
              values={adminColors}
              onChange={(key, val) => updateThemeColor('admin', key, val)}
              testIdPrefix="admin"
            />
            <ColorGroup
              title="Landing Page"
              description="Colors for the Coming Soon landing page — backgrounds, countdown, buttons, modal, forms, footer, cookie banner."
              colors={LANDING_PAGE_COLORS}
              values={landingPageColors}
              onChange={(key, val) => updateThemeColor('landing_page', key, val)}
              testIdPrefix="landing"
            />
            <ColorGroup
              title="Membership Enrollment"
              description="Colors for the Membership Enrollment portal — header, progress bar, form inputs, buttons, footer."
              colors={ENROLLMENT_COLORS}
              values={enrollmentColors}
              onChange={(key, val) => updateThemeColor('enrollment', key, val)}
              testIdPrefix="enrollment"
            />
            <ColorGroup
              title={`${(settings.aux_prefix || '').trim()} Projects (PMS)`.trim()}
              description="Palette for the Projects product at pms.<brand>.com — app background, surfaces, borders, text, accent and status colors. Dark register. Applies to the whole PMS interface after saving."
              colors={PMS_COLORS}
              values={pmsColors}
              onChange={(key, val) => updateThemeColor('pms', key, val)}
              testIdPrefix="pms"
            />
          </div>
        </TabsContent>

        <TabsContent value="themes">
          <div className="bg-white rounded-sm border border-slate-100 p-6" data-testid="themes-tab">
            <h3 className="font-semibold mb-1" style={{ color: 'var(--ad-heading, #1a2332)' }}>Website Theme</h3>
            <p className="text-sm text-slate-500 mb-6">Select a layout template for the public website. This only affects the frontend — Admin Panel and My Account are not changed.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {THEMES.map(theme => (
                <button key={theme.id}
                  onClick={() => setSettings(prev => ({ ...prev, active_theme: theme.id }))}
                  className={`text-left rounded-lg overflow-hidden border-2 transition-all hover:shadow-lg ${activeTheme === theme.id ? 'border-[#0D9488] shadow-md' : 'border-slate-200 hover:border-slate-300'}`}
                  data-testid={`theme-${theme.id}`}
                >
                  <div className="aspect-[16/10] bg-slate-100 relative overflow-hidden">
                    <ThemePreview themeId={theme.id} />
                    {activeTheme === theme.id && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-[#0D9488] rounded-full flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-sm" style={{ color: 'var(--ad-heading, #1a2332)' }}>{theme.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{theme.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="sections">
          <div className="bg-white rounded-sm border border-slate-100 p-6">
            <p className="text-sm text-slate-500 mb-4">Enable/disable homepage sections and edit their titles.</p>
            <div className="space-y-3">
              {Object.entries(settings.sections || {}).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between p-3 rounded-sm border border-slate-100">
                  <div className="flex items-center gap-4">
                    <Switch checked={val?.enabled !== false} onCheckedChange={(checked) => updateSection(key, 'enabled', checked)} data-testid={`section-toggle-${key}`} />
                    <Input value={val?.title || key} onChange={e => updateSection(key, 'title', e.target.value)} className="h-8 text-sm w-48" />
                  </div>
                  <span className="text-xs text-slate-400 capitalize">{key.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="social">
          <div className="bg-white rounded-sm border border-slate-100 p-6">
            <p className="text-sm text-slate-600 mb-1">This list is the single source of truth for the brand's social networks.</p>
            <p className="text-sm text-slate-500 mb-4">
              <strong className="font-medium text-slate-600">Active</strong> networks appear across the website and the Knowledge platform.
              Only networks with a <em>share</em> function drive the share buttons on posts; display-only platforms show as brand links, never as share buttons.
            </p>
            <p className="text-sm text-slate-500 mb-4">Drag the <GripVertical className="inline w-3.5 h-3.5 -mt-0.5 text-slate-400" /> handle to set the order — it's the order they appear across the website, the Knowledge platform, and the share buttons on posts.</p>
            {(() => {
              const shareables = socialCatalog.filter(c => c.share_capable);
              const payments = socialCatalog.filter(c => c.payment);
              const displays = socialCatalog.filter(c => !c.share_capable && !c.payment);
              const rows = settings.social_links || [];
              return (
                <DndContext sensors={socialSensors} collisionDetection={closestCenter} onDragEnd={handleSocialDragEnd}>
                  <SortableContext items={rows.map((l, i) => l.id || `row-${i}`)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2.5">
                      {rows.map((link, idx) => (
                        <SortableSocialRow
                          key={link.id || idx}
                          id={link.id || `row-${idx}`}
                          link={link}
                          idx={idx}
                          socialByKey={socialByKey}
                          shareables={shareables}
                          displays={displays}
                          payments={payments}
                          onPick={pickSocialNetwork}
                          onUpdate={updateSocialLink}
                          onRemove={removeSocialLink}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              );
            })()}
            <button onClick={addSocialLink} className="mt-3 flex items-center gap-2 text-sm hover:underline" style={{ color: 'var(--ad-accent, #0D9488)' }} data-testid="add-social-link-btn"><Plus className="w-4 h-4" /> Add Social Link</button>
          </div>
        </TabsContent>

        <TabsContent value="languages">
          <div className="bg-white rounded-sm border border-slate-100 p-6" data-testid="languages-panel">
            <div className="flex items-center gap-2 mb-4">
              <Languages className="w-5 h-5 text-[#0D9488]" />
              <h3 className="font-semibold" style={{ color: 'var(--ad-heading, #1a2332)' }}>Languages</h3>
            </div>
            <p className="text-sm text-slate-500 mb-5">Select which languages your site supports. Visitors see a language switcher in the navbar (auto-hidden when only one language is enabled). Admins can fill translations per field in each CMS manager.</p>
            <div>
              <Label className="text-xs text-slate-600 uppercase tracking-wider">Enabled languages</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                {Object.entries(LANGUAGE_LABELS).map(([code, info]) => {
                  const enabled = (settings.languages || ['en']).includes(code);
                  return (
                    <button key={code} type="button" onClick={() => {
                      const cur = settings.languages || ['en'];
                      let next = enabled ? cur.filter(l => l !== code) : [...cur, code];
                      if (next.length === 0) next = ['en'];
                      let nextDefault = settings.default_language || 'en';
                      if (!next.includes(nextDefault)) nextDefault = next[0];
                      setSettings({ ...settings, languages: next, default_language: nextDefault });
                    }} className={`flex items-center gap-2 px-3 py-2 rounded-sm border text-sm transition-colors ${enabled ? 'bg-[#0D9488]/10 border-[#0D9488] text-[#0D9488]' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'}`} data-testid={`lang-toggle-${code}`}>
                      {enabled ? <Check className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5" />}
                      <span className="font-semibold">{info.short}</span>
                      <span className="text-xs opacity-70">{info.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-5">
              <Label className="text-xs text-slate-600 uppercase tracking-wider">Default language (fallback when a translation is missing)</Label>
              <select value={settings.default_language || 'en'} onChange={e => setSettings({ ...settings, default_language: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-sm mt-2" data-testid="default-language-select">
                {(settings.languages || ['en']).map(l => (
                  <option key={l} value={l}>{LANGUAGE_LABELS[l]?.name || l.toUpperCase()} ({l})</option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-slate-400 mt-4">💡 Tip: legacy content (written before enabling a language) automatically falls back to the plain string value, so enabling a new language won't erase any existing text.</p>
          </div>
        </TabsContent>

        <TabsContent value="email">
          <div className="bg-white rounded-sm border border-slate-100 p-6 space-y-4">
            <h3 className="font-semibold" style={{ color: 'var(--ad-heading, #1a2332)' }}>SMTP Configuration</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>SMTP Host</Label><Input value={settings.smtp_host || ''} onChange={e => setSettings({...settings, smtp_host: e.target.value})} className="mt-1" placeholder="valor-smtp.us-east-2.amazonaws.com" data-testid="smtp-host-input" /></div>
              <div><Label>SMTP Port</Label><Input type="number" value={settings.smtp_port || 587} onChange={e => setSettings({...settings, smtp_port: parseInt(e.target.value)})} className="mt-1" data-testid="smtp-port-input" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>SMTP Username</Label><Input value={settings.smtp_user || ''} onChange={e => setSettings({...settings, smtp_user: e.target.value})} className="mt-1" data-testid="smtp-user-input" /></div>
              <div><Label>SMTP Password</Label><Input type="password" value={settings.smtp_password || ''} onChange={e => setSettings({...settings, smtp_password: e.target.value})} className="mt-1" data-testid="smtp-pass-input" /></div>
            </div>
            <hr className="border-slate-200" />
            <h3 className="font-semibold" style={{ color: 'var(--ad-heading, #1a2332)' }}>Email Sender/Receiver</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>From Name ($name_from)</Label><Input value={settings.name_from || ''} onChange={e => setSettings({...settings, name_from: e.target.value})} className="mt-1" placeholder="Contact form sender name" data-testid="name-from-input" /><p className="text-xs text-slate-400 mt-1">Uses contact form's "name" field if empty</p></div>
              <div><Label>From Email ($from)</Label><Input value={settings.email_from || ''} onChange={e => setSettings({...settings, email_from: e.target.value})} className="mt-1" placeholder="verified@yourdomain.com" data-testid="email-from-input" /><p className="text-xs text-slate-400 mt-1">Must be verified in AWS SES</p></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>To Name ($name_to)</Label><Input value={settings.name_to || ''} onChange={e => setSettings({...settings, name_to: e.target.value})} className="mt-1" placeholder="Company Name" data-testid="name-to-input" /></div>
              <div><Label>To Email ($email_to)</Label><Input value={settings.email_to || ''} onChange={e => setSettings({...settings, email_to: e.target.value})} className="mt-1" placeholder="operator@company.com" data-testid="email-to-input" /></div>
            </div>
            <div>
              <Label>CC Recipients (comma separated)</Label>
              <Input value={settings.email_cc || ''} onChange={e => setSettings({...settings, email_cc: e.target.value})} className="mt-1" placeholder="monitor1@company.com, monitor2@company.com" data-testid="email-cc-input" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={testConnection} disabled={testingConn} className="flex items-center gap-2 px-4 py-2 border rounded-sm text-sm font-medium hover:bg-slate-50 disabled:opacity-50" style={{ borderColor: 'var(--ad-accent, #0D9488)', color: 'var(--ad-accent, #0D9488)' }} data-testid="test-connection-btn">
                {testingConn ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />} Test Connection
              </button>
              <button onClick={testEmail} disabled={testingEmail} className="flex items-center gap-2 px-4 py-2 text-white rounded-sm text-sm font-medium disabled:opacity-50" style={{ backgroundColor: 'var(--ad-accent, #0D9488)' }} data-testid="test-email-btn">
                {testingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send Test Email
              </button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="blogapi">
          <div className="bg-white rounded-sm border border-slate-100 p-6 space-y-4">
            <h3 className="font-semibold" style={{ color: 'var(--ad-heading, #1a2332)' }}>External Blog API</h3>
            <p className="text-sm text-slate-500">Configure the external JSON API URL for the Blog section on the homepage. The News section uses internal posts.</p>
            <div>
              <Label>Blog API URL</Label>
              <Input value={settings.blog_api_url || ''} onChange={e => setSettings({...settings, blog_api_url: e.target.value})} className="mt-1" placeholder="https://carlosartiles.com/api.php" data-testid="blog-api-url-input" />
              <p className="text-xs text-slate-400 mt-1">The API must return JSON with a "posts" array. Each post should have: title, image, url/link, summary.</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="membership">
          <div className="bg-white rounded-sm border border-slate-100 p-6 space-y-4">
            <h3 className="font-semibold" style={{ color: 'var(--ad-heading, #1a2332)' }}>Membership Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>AUX Prefix</Label><Input value={settings.aux_prefix || 'AUX'} onChange={e => setSettings({...settings, aux_prefix: e.target.value})} className="mt-1" placeholder="AUX" data-testid="aux-prefix-input" />
                <p className="text-xs text-slate-400 mt-1">Prefix for membership IDs (e.g. AUX-1, AUX-2)</p></div>
              <div><Label>Platform Domain</Label><Input value={settings.platform_domain || ''} onChange={e => setSettings({...settings, platform_domain: e.target.value})} className="mt-1" placeholder="legacy.com" /></div>
            </div>
            <div><Label>Login Background Image</Label>
              <ImageUpload value={settings.membership_login_bg || ''} onChange={val => setSettings({...settings, membership_login_bg: val})} className="mt-1" /></div>
            <div><Label>Default Member Avatar</Label>
              <ImageUpload value={settings.membership_default_avatar || ''} onChange={val => setSettings({...settings, membership_default_avatar: val})} className="mt-1" /></div>
            <div><Label>Welcome Email Template</Label>
              <p className="text-xs text-slate-400 mb-1">Use placeholders: {'{{first_name}}'}, {'{{last_name}}'}, {'{{membership_id}}'}, {'{{username}}'}, {'{{platform_name}}'}</p>
              <div className="mt-1"><RichTextEditor value={settings.welcome_email_template || ''} onChange={val => setSettings({...settings, welcome_email_template: val})} placeholder="Welcome email HTML template..." /></div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="stripe">
          <div className="bg-white rounded-sm border border-slate-100 p-6 space-y-5" data-testid="stripe-tab">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--ad-heading, #1a2332)' }}>
                  <CreditCard className="w-4 h-4" /> Stripe Configuration
                </h3>
                <p className="text-sm text-slate-500 mt-1">Manage Stripe payments without restarting the server.</p>
              </div>
              {stripeStatus.configured ? (
                <span
                  className="text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{
                    backgroundColor: stripeStatus.mode === 'live' ? '#dcfce7' : '#fef3c7',
                    color: stripeStatus.mode === 'live' ? '#15803d' : '#a16207',
                  }}
                  data-testid="stripe-status-badge"
                >
                  ✓ Configured · {stripeStatus.mode === 'live' ? 'LIVE' : stripeStatus.mode === 'test' ? 'TEST' : 'unknown mode'}
                </span>
              ) : (
                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-amber-100 text-amber-800 flex items-center gap-1" data-testid="stripe-status-badge">
                  <AlertTriangle className="w-3 h-3" /> Not configured
                </span>
              )}
            </div>

            {/* API Key */}
            <div className="rounded-sm border border-slate-100 p-4 space-y-3">
              <Label className="flex items-center gap-1.5">
                Stripe Secret Key
                <span className="text-xs text-slate-400 font-normal">(test or live secret key from Stripe dashboard)</span>
              </Label>
              {settings.stripe_api_key_set && stripeKeyDraft === '' ? (
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-sm font-mono text-slate-500" data-testid="stripe-key-preview">
                    {settings.stripe_api_key_preview || '•••'}
                  </code>
                  <button
                    onClick={() => setStripeKeyDraft(' ')}
                    className="px-3 py-2 text-sm rounded-sm border border-slate-200 hover:bg-slate-50"
                    data-testid="stripe-key-replace"
                  >Replace</button>
                  <button
                    onClick={clearStripeKey}
                    className="px-3 py-2 text-sm rounded-sm border border-red-200 text-red-600 hover:bg-red-50"
                    data-testid="stripe-key-clear"
                  >Clear</button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Input
                    type={stripeKeyVisible ? 'text' : 'password'}
                    value={stripeKeyDraft.trim() === '' ? '' : stripeKeyDraft}
                    onChange={e => setStripeKeyDraft(e.target.value)}
                    placeholder="Paste your Stripe secret key here"
                    className="flex-1 font-mono text-sm"
                    autoComplete="off"
                    data-testid="stripe-key-input"
                  />
                  <button
                    onClick={() => setStripeKeyVisible(v => !v)}
                    className="p-2 rounded-sm border border-slate-200 hover:bg-slate-50"
                    title={stripeKeyVisible ? 'Hide' : 'Show'}
                    data-testid="stripe-key-toggle-visibility"
                  >{stripeKeyVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                  {settings.stripe_api_key_set && (
                    <button
                      onClick={() => { setStripeKeyDraft(''); setStripeKeyVisible(false); }}
                      className="px-3 py-2 text-sm rounded-sm border border-slate-200 hover:bg-slate-50"
                    >Cancel</button>
                  )}
                </div>
              )}
              <p className="text-xs text-slate-500">
                Get your key from
                <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline ml-1">Stripe Dashboard → Developers → API keys</a>.
                Use a <strong>test key</strong> while testing, swap to a <strong>live key</strong> when going to production.
                Click <em>Save Settings</em> at the bottom to apply.
              </p>

              {/* Test connection */}
              <div className="pt-3 border-t border-slate-100 flex items-center gap-3">
                <button
                  onClick={testStripeConnection}
                  disabled={stripeTesting || (!stripeKeyDraft.trim() && !stripeStatus.configured)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-sm border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                  data-testid="stripe-test-btn"
                >
                  {stripeTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
                  Test connection
                </button>
                <span className="text-[11px] text-slate-400">
                  {stripeKeyDraft.trim()
                    ? 'Pings Stripe with the key you typed above.'
                    : stripeStatus.configured
                      ? 'Pings Stripe with the currently saved key.'
                      : 'Type a key first or save one.'}
                </span>
              </div>

              {stripeTestResult && (
                <div
                  className={`mt-1 rounded-sm border p-3 text-xs ${
                    stripeTestResult.ok
                      ? 'border-green-100 bg-green-50 text-green-800'
                      : 'border-red-100 bg-red-50 text-red-700'
                  }`}
                  data-testid="stripe-test-result"
                >
                  {stripeTestResult.ok ? (
                    <>
                      <div className="flex items-center gap-1.5 font-semibold mb-1">
                        <Check className="w-3.5 h-3.5" /> Connection successful · {stripeTestResult.mode?.toUpperCase()} mode
                      </div>
                      <div className="space-y-0.5">
                        {stripeTestResult.business_name && <div>Business: <strong>{stripeTestResult.business_name}</strong></div>}
                        {stripeTestResult.account_id && <div>Account ID: <code className="text-[10px]">{stripeTestResult.account_id}</code></div>}
                        {stripeTestResult.email && <div>Email: {stripeTestResult.email}</div>}
                        {stripeTestResult.country && <div>Country: {stripeTestResult.country?.toUpperCase()} · Currency: {stripeTestResult.default_currency?.toUpperCase()}</div>}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5 font-semibold mb-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Connection failed
                        <span className="text-[10px] font-normal opacity-70">({stripeTestResult.code})</span>
                      </div>
                      <div>{stripeTestResult.message}</div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Webhook URL */}
            <div className="rounded-sm border border-slate-100 p-4 space-y-2">
              <Label>Webhook URL <span className="text-xs text-slate-400 font-normal">(register this in Stripe)</span></Label>
              <div className="flex items-center gap-2">
                <code
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-sm font-mono select-all"
                  data-testid="stripe-webhook-url"
                >
                  {stripeStatus.webhook_url || (settings.site_url ? `${settings.site_url.replace(/\/+$/, '')}/api/webhook/stripe` : '— set Site URL in General tab first —')}
                </code>
                <button
                  onClick={copyWebhookUrl}
                  disabled={!stripeStatus.webhook_url}
                  className="p-2 rounded-sm border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                  title="Copy"
                  data-testid="stripe-webhook-copy"
                ><Copy className="w-4 h-4" /></button>
              </div>
              <p className="text-xs text-slate-500">
                In your Stripe dashboard → <strong>Developers → Webhooks → Add endpoint</strong>, paste this URL,
                and select the event <code>checkout.session.completed</code> at minimum.
                The URL is auto-generated from <strong>Settings → General → Site URL</strong>.
              </p>
            </div>

            <div className="text-[11px] text-slate-400 italic">
              Tip: keys saved here override the <code>STRIPE_API_KEY</code> environment variable, so you can rotate keys without redeploying.
            </div>
          </div>
        </TabsContent>

        <TabsContent value="apis">
          <div className="bg-white rounded-sm border border-slate-100 p-6" data-testid="apis-tab">
            <h3 className="font-semibold mb-1" style={{ color: 'var(--ad-heading, #1a2332)' }}>Third-Party API Integrations</h3>
            <p className="text-sm text-slate-500 mb-5">Overview of all external services and APIs used in this project.</p>
            <div className="space-y-3">
              {[
                { name: 'Stripe', desc: 'Payment processing for services checkout', status: settings.stripe_configured !== false, config: 'API key configured in backend environment', category: 'Payments' },
                { name: 'Google OAuth', desc: 'Social login — pending self-hosted OAuth implementation', status: false, config: 'Not configured — implement self-hosted Google OAuth to enable', category: 'Authentication' },
                { name: 'SMTP (Email)', desc: 'Transactional emails — contact form, invitations, welcome emails', status: !!(settings.smtp_host && settings.smtp_user), config: settings.smtp_host ? `Host: ${settings.smtp_host}:${settings.smtp_port || 587}` : 'Not configured — set up in Email/SMTP tab', category: 'Email' },
                { name: 'External Blog API', desc: 'Fetches blog posts from an external JSON endpoint', status: !!settings.blog_api_url, config: settings.blog_api_url || 'Not configured — set up in Blog API tab', category: 'Content' },
                { name: 'Leaflet / OpenStreetMap', desc: 'Interactive maps for location display', status: true, config: 'Open-source — no API key needed', category: 'Maps' },
                { name: 'MongoDB', desc: 'Primary database for all application data', status: true, config: 'Configured in backend environment', category: 'Database' },
              ].map(api => (
                <div key={api.name} className="flex items-start gap-4 p-4 border border-slate-100 rounded-sm" data-testid={`api-${api.name.toLowerCase().replace(/[\s/()]+/g, '-')}`}>
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${api.status ? 'bg-green-500' : 'bg-slate-300'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-sm" style={{ color: 'var(--ad-heading, #1a2332)' }}>{api.name}</span>
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{api.category}</span>
                    </div>
                    <p className="text-xs text-slate-500">{api.desc}</p>
                    <p className="text-xs text-slate-400 mt-1 font-mono">{api.config}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded flex-shrink-0 ${api.status ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-400'}`}>
                    {api.status ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="integrations">
          <div className="bg-white rounded-sm border border-slate-100 p-6 space-y-8" data-testid="integrations-tab">
            <KmsSyncPanel />
            {/* KMS — Knowledge Management System */}
            <div>
              <h3 className="font-semibold mb-1" style={{ color: 'var(--ad-heading, #1a2332)' }}>Knowledge Management System (KMS)</h3>
              <p className="text-sm text-slate-500 mb-5">
                Connect this site to its paired KMS instance. When configured, new members are automatically
                created in the KMS and the My Account sidebar shows a <strong>Knowledge Hub</strong> button
                that logs users in without re-entering credentials (SSO).
              </p>
              <div className="space-y-4 max-w-lg">
                <div>
                  <Label className="text-xs font-medium text-slate-600 mb-1 block">KMS Base URL</Label>
                  <Input
                    value={settings.kms_url || ''}
                    onChange={e => setSettings(prev => ({ ...prev, kms_url: e.target.value }))}
                    placeholder="https://insights.yoursite.com"
                    data-testid="kms-url-input"
                  />
                  <p className="text-xs text-slate-400 mt-1">The root URL of the KMS — no trailing slash. Leave blank to disable KMS integration.</p>
                </div>
                <div>
                  <Label className="text-xs font-medium text-slate-600 mb-1 block">
                    KMS Sync Key
                    {settings.kms_sync_key_set
                      ? <span className="ml-2 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Set</span>
                      : <span className="ml-2 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Not set</span>}
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={kmsSyncKeyVisible ? 'text' : 'password'}
                        value={kmsSyncKeyDraft}
                        onChange={e => setKmsSyncKeyDraft(e.target.value)}
                        placeholder={settings.kms_sync_key_set ? '••••••••  (leave blank to keep current)' : 'Paste or generate a secret key'}
                        data-testid="kms-sync-key-input"
                      />
                      <button type="button" onClick={() => setKmsSyncKeyVisible(v => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {kmsSyncKeyVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <button type="button"
                      onClick={() => { const k = Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2,'0')).join(''); setKmsSyncKeyDraft(k); setKmsSyncKeyVisible(true); }}
                      className="px-3 py-2 text-xs bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 whitespace-nowrap">
                      Generate
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Shared secret between this site and the KMS. Set the same value as <code className="bg-slate-100 px-1 rounded">AUX_SYNC_KEY</code> in the KMS server <code className="bg-slate-100 px-1 rounded">.env</code>. Never expose this value publicly.
                  </p>
                </div>
              </div>
            </div>
            {/* Status row */}
            <div className="border-t border-slate-100 pt-4">
              <p className="text-xs font-medium text-slate-500 mb-2">Current status</p>
              <div className="flex items-center gap-3 text-sm">
                <span className={`flex items-center gap-1.5 ${settings.kms_url ? 'text-green-600' : 'text-slate-400'}`}>
                  <span className={`w-2 h-2 rounded-full ${settings.kms_url ? 'bg-green-500' : 'bg-slate-300'}`} />
                  KMS URL {settings.kms_url ? `configured (${settings.kms_url})` : 'not configured'}
                </span>
                <span className={`flex items-center gap-1.5 ${settings.kms_sync_key_set ? 'text-green-600' : 'text-slate-400'}`}>
                  <span className={`w-2 h-2 rounded-full ${settings.kms_sync_key_set ? 'bg-green-500' : 'bg-slate-300'}`} />
                  Sync key {settings.kms_sync_key_set ? 'set' : 'not set'}
                </span>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="webhook">
          <div className="bg-white rounded-sm border border-slate-100 p-6 space-y-8" data-testid="webhook-tab">
            <div>
              <h3 className="font-semibold mb-1 flex items-center gap-2" style={{ color: 'var(--ad-heading, #1a2332)' }}>
                <Webhook className="w-4 h-4" /> Discord Webhooks
              </h3>
              <p className="text-sm text-slate-500 max-w-2xl">
                Connect the <strong>Share on Discord</strong> buttons in Morning Brief and News to your Discord
                channels. In Discord: <em>Server Settings → Integrations → Webhooks → New Webhook</em>, choose the
                channel, then <em>Copy Webhook URL</em> and paste it below. Webhook URLs are secret — they are
                stored server-side and never shown again.
              </p>
            </div>

            {/* Master switch */}
            <div className="flex items-center justify-between max-w-lg border border-slate-100 rounded-sm p-4">
              <div>
                <Label className="text-sm font-medium" style={{ color: 'var(--ad-heading, #1a2332)' }}>Enable Discord sharing</Label>
                <p className="text-xs text-slate-400 mt-0.5">Master switch for every Discord share button on this site.</p>
              </div>
              <Switch checked={settings.discord_enabled !== false} onCheckedChange={v => setSettings({ ...settings, discord_enabled: v })} data-testid="discord-enabled" />
            </div>

            {/* Webhook URLs */}
            <div className="space-y-6 max-w-lg">
              {[
                { key: 'morning_discord_webhook', target: 'morning', label: 'Morning Brief', hint: 'Posts when a brief is shared from Morning Brief.' },
                { key: 'news_discord_webhook', target: 'news', label: 'News — post detail', hint: 'Posts when an article is shared from its own page.' },
                { key: 'news_discord_webhook_news', target: 'news_listing', label: 'News — listing / dashboard', hint: 'Posts when shared from the news listing or dashboard.' },
              ].map(f => {
                const isSet = !!settings[f.key + '_set'];
                const st = discordTest[f.target];
                return (
                  <div key={f.key}>
                    <Label className="text-xs font-medium text-slate-600 mb-1 block">
                      {f.label} — Webhook URL
                      {isSet
                        ? <span className="ml-2 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Set</span>
                        : <span className="ml-2 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Not set</span>}
                    </Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={discordVisible[f.key] ? 'text' : 'password'}
                          value={discordDrafts[f.key]}
                          onChange={e => setDiscordDrafts(d => ({ ...d, [f.key]: e.target.value }))}
                          placeholder={isSet ? '••••••••  (leave blank to keep current)' : 'https://discord.com/api/webhooks/…'}
                          data-testid={`discord-${f.target}-input`}
                        />
                        <button type="button" onClick={() => setDiscordVisible(v => ({ ...v, [f.key]: !v[f.key] }))}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                          {discordVisible[f.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <button type="button" onClick={() => testDiscord(f.target)} disabled={st === 'testing' || !isSet}
                        className="px-3 py-2 text-xs rounded border border-slate-200 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-1.5"
                        title={isSet ? 'Send a test message' : 'Save a URL first'}
                        data-testid={`discord-${f.target}-test`}>
                        {st === 'testing' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Test
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-slate-400">{f.hint}</p>
                      {st === 'ok' && <span className="text-[11px] text-green-600 flex items-center gap-1"><Check className="w-3 h-3" />sent</span>}
                      {st === 'failed' && <span className="text-[11px] text-red-500 flex items-center gap-1"><XCircle className="w-3 h-3" />failed</span>}
                      {st === 'skipped' && <span className="text-[11px] text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />save first</span>}
                    </div>
                  </div>
                );
              })}
              <p className="text-[11px] text-slate-400 italic flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3 flex-shrink-0" /> Test sends a sample message using the <strong>saved</strong> config — save changes before testing a newly pasted URL.
              </p>
            </div>

            {/* Appearance */}
            <div className="border-t border-slate-100 pt-6 space-y-4 max-w-lg">
              <h4 className="text-sm font-semibold" style={{ color: 'var(--ad-heading, #1a2332)' }}>Message appearance</h4>
              <div>
                <Label className="text-xs font-medium text-slate-600 mb-1 block">Embed color</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={settings.discord_embed_color || discordAccentHex}
                    onChange={e => setSettings({ ...settings, discord_embed_color: e.target.value })}
                    className="w-8 h-8 rounded-sm cursor-pointer border-0 flex-shrink-0" data-testid="discord-color" />
                  <Input value={settings.discord_embed_color || ''} placeholder={`${discordAccentHex}  (brand accent)`}
                    onChange={e => setSettings({ ...settings, discord_embed_color: e.target.value })}
                    className="flex-1 h-8 text-xs font-mono" />
                  {settings.discord_embed_color
                    ? <button type="button" onClick={() => setSettings({ ...settings, discord_embed_color: '' })}
                        className="text-xs text-slate-400 hover:text-slate-600 hover:underline whitespace-nowrap">Use brand accent</button>
                    : null}
                </div>
                <p className="text-xs text-slate-400 mt-1">The colored stripe on the embed. Blank = your brand Accent color.</p>
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-600 mb-1 block">Sender name override</Label>
                <Input value={settings.discord_username || ''} placeholder={discordBrandName}
                  onChange={e => setSettings({ ...settings, discord_username: e.target.value })} data-testid="discord-username" />
                <p className="text-xs text-slate-400 mt-1">The name shown on each message. Blank = your brand name.</p>
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-600 mb-1 block">Avatar URL override</Label>
                <Input value={settings.discord_avatar_url || ''} placeholder="https://…/logo.png"
                  onChange={e => setSettings({ ...settings, discord_avatar_url: e.target.value })} data-testid="discord-avatar" />
                <p className="text-xs text-slate-400 mt-1">Profile image next to each message. Blank = the webhook's own avatar.</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {settings.pro_manager_enabled && (
          <TabsContent value="ai">
            <div className="bg-white rounded-sm border border-slate-100 p-6 space-y-8" data-testid="ai-tab">
              <div>
                <h3 className="font-semibold mb-1 flex items-center gap-2" style={{ color: 'var(--ad-heading, #1a2332)' }}>
                  <Bot className="w-4 h-4" /> Claude API — Prompt Manager
                </h3>
                <p className="text-sm text-slate-500 max-w-2xl">
                  Prompt Management generates and publishes briefs through the Claude API. Paste your
                  Anthropic API key here — it is stored server-side, never shown again, and never
                  exposed publicly.
                </p>
              </div>

              <div className="space-y-6 max-w-lg">
                <div>
                  <Label className="text-xs font-medium text-slate-600 mb-1 block">
                    Claude API key
                    {settings.claude_api_key_set
                      ? <span className="ml-2 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Set</span>
                      : <span className="ml-2 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Not set</span>}
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={claudeKeyVisible ? 'text' : 'password'}
                        value={claudeKeyDraft}
                        onChange={e => setClaudeKeyDraft(e.target.value)}
                        placeholder={settings.claude_api_key_set ? '••••••••  (leave blank to keep current)' : 'sk-ant-…'}
                        data-testid="claude-key-input"
                      />
                      <button type="button" onClick={() => setClaudeKeyVisible(v => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {claudeKeyVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <button type="button" onClick={testClaude}
                      disabled={claudeTest === 'testing' || !settings.claude_api_key_set}
                      className="px-3 py-2 text-xs rounded border border-slate-200 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-1.5"
                      title={settings.claude_api_key_set ? 'Ping the Claude API' : 'Save a key first'}
                      data-testid="claude-test-btn">
                      {claudeTest === 'testing' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Test
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-slate-400">Test uses the <strong>saved</strong> key — save before testing a new paste.</p>
                    {claudeTest?.status === 'ok' && <span className="text-[11px] text-green-600 flex items-center gap-1"><Check className="w-3 h-3" />OK ({claudeTest.model})</span>}
                    {claudeTest?.status === 'error' && <span className="text-[11px] text-red-500 flex items-center gap-1"><XCircle className="w-3 h-3" />{claudeTest.message || 'failed'}</span>}
                    {claudeTest?.status === 'skipped' && <span className="text-[11px] text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />save a key first</span>}
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-medium text-slate-600 mb-1 block">Model</Label>
                  <select value={settings.claude_model || 'claude-opus-4-8'}
                    onChange={e => setSettings({ ...settings, claude_model: e.target.value })}
                    className="w-full border border-slate-200 rounded px-2 py-2 text-sm bg-white"
                    style={{ color: 'var(--ad-heading, #1a2332)' }} data-testid="claude-model">
                    <option value="claude-opus-4-8">Claude Opus 4.8 (best quality)</option>
                    <option value="claude-sonnet-5">Claude Sonnet 5 (faster / cheaper)</option>
                    <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (fastest)</option>
                  </select>
                  <p className="text-xs text-slate-400 mt-1">The model each Prompt run uses for research + writing.</p>
                </div>

                <div>
                  <Label className="text-xs font-medium text-slate-600 mb-1 block">Timezone</Label>
                  <select value={settings.pro_timezone || 'America/New_York'}
                    onChange={e => setSettings({ ...settings, pro_timezone: e.target.value })}
                    className="w-full border border-slate-200 rounded px-2 py-2 text-sm bg-white"
                    style={{ color: 'var(--ad-heading, #1a2332)' }} data-testid="pro-timezone">
                    {['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
                      'America/Santo_Domingo', 'America/Mexico_City', 'Europe/Madrid', 'UTC']
                      .concat(settings.pro_timezone && !['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Santo_Domingo', 'America/Mexico_City', 'Europe/Madrid', 'UTC'].includes(settings.pro_timezone) ? [settings.pro_timezone] : [])
                      .map(tz => <option key={tz} value={tz}>{tz}</option>)}
                  </select>
                  <p className="text-xs text-slate-400 mt-1">
                    Used for brief dates and Prompt schedules (e.g. “every day at 8:30 AM”).
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        )}

        <TabsContent value="captcha">
          <CaptchaSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── KMS Sync Panel ───────────────────────────────────────────────
function KmsSyncPanel() {
  const [failures, setFailures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [result, setResult] = useState(null);

  const load = () => {
    setLoading(true);
    adminAPI.getKmsSyncFailures()
      .then(r => setFailures(r.data || []))
      .catch(() => setFailures([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const retry = async () => {
    setRetrying(true);
    setResult(null);
    try {
      const r = await adminAPI.retryKmsSync();
      setResult(r.data);
      load();
    } catch { setResult({ message: 'Retry request failed.' }); }
    finally { setRetrying(false); }
  };

  if (loading) return null;
  if (failures.length === 0 && !result) return null;

  return (
    <div className="border border-amber-200 bg-amber-50 rounded-sm p-4" data-testid="kms-sync-panel">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <XCircle className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium text-amber-800">
            {failures.length} pending KMS sync {failures.length === 1 ? 'failure' : 'failures'}
          </span>
        </div>
        <button onClick={retry} disabled={retrying || failures.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50">
          {retrying ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          {retrying ? 'Retrying…' : 'Retry all'}
        </button>
      </div>
      <div className="space-y-1 max-h-40 overflow-y-auto">
        {failures.map((f, i) => (
          <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-amber-100">
            <span className="text-amber-900 font-medium">{f.email}</span>
            <span className="text-amber-600 font-mono">{f.error}</span>
          </div>
        ))}
      </div>
      {result && (
        <p className="text-xs text-amber-700 mt-2">
          {result.retried != null ? `Retried ${result.retried} record(s).` : result.message}
        </p>
      )}
    </div>
  );
}

// ─── Captcha Settings tab ─────────────────────────────────────────
// Stores the Google reCAPTCHA v2 site/secret keys plus a master enable
// toggle.  The keys live in their own `captcha_settings` Mongo collection
// (separate from the main settings doc) so they can be rotated without
// touching the sprawling general-settings record.
function CaptchaSettingsTab() {
  const [data, setData] = useState({ enabled: false, site_key: '', secret_key: '', version: 'v2' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    adminAPI.getCaptchaSettings()
      .then(r => setData(r.data || {}))
      .catch(() => toast.error('Could not load captcha settings'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await adminAPI.updateCaptchaSettings(data);
      toast.success('Captcha settings saved');
    } catch (e) {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5 max-w-3xl" data-testid="captcha-settings-form">
      <div>
        <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2"><Shield className="w-4 h-4" /> Google reCAPTCHA v2</h3>
        <p className="text-sm text-gray-500 mt-1">
          Protects every public form (Contact, Member registration, Forgot password, Enrollment, Waiting list) against
          bot abuse — required by AWS SES and other reputable email providers as a sending best-practice.
          When disabled, the widget hides and forms accept submissions without verification.
        </p>
        <p className="text-xs text-gray-500 mt-2">
          Get keys from <a href="https://www.google.com/recaptcha/admin" target="_blank" rel="noreferrer" className="text-blue-600 underline">Google reCAPTCHA admin</a> &mdash; choose <strong>reCAPTCHA v2 → "I'm not a robot" Checkbox</strong>.
        </p>
      </div>

      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded border border-gray-200">
        <Switch checked={data.enabled} onCheckedChange={(v) => setData(d => ({ ...d, enabled: v }))} data-testid="captcha-enabled-toggle" />
        <div>
          <Label className="font-medium">Enable Captcha</Label>
          <p className="text-xs text-gray-500">When ON, every public form requires a successful captcha challenge.</p>
        </div>
      </div>

      <div>
        <Label className="text-xs font-medium text-gray-700">Site Key (public)</Label>
        <Input
          type="text"
          value={data.site_key}
          onChange={e => setData(d => ({ ...d, site_key: e.target.value }))}
          placeholder="6Lfn...AAAA"
          className="mt-1 font-mono text-sm"
          data-testid="captcha-site-key"
        />
      </div>

      <div>
        <Label className="text-xs font-medium text-gray-700">Secret Key (private)</Label>
        <div className="relative mt-1">
          <Input
            type={showSecret ? 'text' : 'password'}
            value={data.secret_key}
            onChange={e => setData(d => ({ ...d, secret_key: e.target.value }))}
            placeholder="6Lfn...AAAA"
            className="font-mono text-sm pr-10"
            data-testid="captcha-secret-key"
          />
          <button type="button" onClick={() => setShowSecret(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700" aria-label="Toggle secret visibility">
            {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">Server-side only — never returned by the public config endpoint.</p>
      </div>

      <div className="pt-3 border-t border-gray-100 flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 bg-[#1a2332] text-white rounded-md text-sm font-medium flex items-center gap-2 hover:bg-[#243046] disabled:opacity-50"
          data-testid="captcha-save"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save
        </button>
      </div>

      {data.enabled && data.site_key && data.secret_key && (
        <div className="bg-emerald-50 border border-emerald-200 rounded p-3 text-xs text-emerald-800 flex items-start gap-2">
          <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>Captcha is active. Public forms now require the &quot;I&apos;m not a robot&quot; check before submission.</span>
        </div>
      )}
      {data.enabled && (!data.site_key || !data.secret_key) && (
        <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-800 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>Captcha is enabled but a key is missing — public forms will reject every submission until both keys are filled in.</span>
        </div>
      )}
    </div>
  );
}

// Visual theme previews rendered as mini mockups
function ThemePreview({ themeId }) {
  if (themeId === 'default') {
    return (
      <div className="w-full h-full bg-white flex flex-col text-[3px]">
        <div className="bg-[#1a2332] h-[4%]" />
        <div className="bg-white h-[6%] border-b border-slate-100 flex items-center px-[4%]">
          <div className="w-[8%] h-[60%] bg-[#1a2332] rounded-sm" />
          <div className="flex-1 flex justify-center gap-[3%]">
            <div className="w-[8%] h-[40%] bg-slate-300 rounded-full" />
            <div className="w-[8%] h-[40%] bg-slate-300 rounded-full" />
            <div className="w-[8%] h-[40%] bg-slate-300 rounded-full" />
          </div>
        </div>
        <div className="bg-[#1a2332] h-[35%] flex items-center justify-center">
          <div className="text-center">
            <div className="w-[40%] mx-auto h-[3px] bg-white/80 rounded mb-1" />
            <div className="w-[60%] mx-auto h-[2px] bg-white/40 rounded mb-2" />
            <div className="w-[20%] mx-auto h-[4px] bg-[#0D9488] rounded" />
          </div>
        </div>
        <div className="flex-1 bg-white p-[4%]">
          <div className="flex gap-[3%]">
            <div className="flex-1 h-[20px] bg-slate-100 rounded-sm" />
            <div className="flex-1 h-[20px] bg-slate-100 rounded-sm" />
            <div className="flex-1 h-[20px] bg-slate-100 rounded-sm" />
          </div>
        </div>
        <div className="bg-[#1a2332] h-[15%]" />
      </div>
    );
  }
  if (themeId === 'modern') {
    return (
      <div className="w-full h-full bg-white flex flex-col text-[3px]">
        <div className="h-[45%] bg-gradient-to-br from-slate-900 to-slate-700 relative">
          <div className="absolute inset-x-0 top-0 h-[12%] flex items-center justify-between px-[5%]">
            <div className="w-[8%] h-[50%] bg-white/20 rounded" />
            <div className="flex gap-[3%]">
              <div className="w-[6%] h-[40%] bg-white/30 rounded-full" />
              <div className="w-[6%] h-[40%] bg-white/30 rounded-full" />
              <div className="w-[6%] h-[40%] bg-white/30 rounded-full" />
            </div>
          </div>
          <div className="absolute bottom-[15%] left-[8%]">
            <div className="w-[45%] h-[3px] bg-white rounded mb-1" />
            <div className="w-[30%] h-[2px] bg-white/50 rounded mb-2" />
            <div className="flex gap-1">
              <div className="w-[15%] h-[4px] bg-[#0D9488] rounded-full" />
              <div className="w-[15%] h-[4px] bg-white/20 rounded-full" />
            </div>
          </div>
        </div>
        <div className="flex-1 p-[5%] flex gap-[3%]">
          <div className="flex-1 bg-slate-50 rounded-lg p-[3%]">
            <div className="w-full h-[8px] bg-slate-200 rounded-lg mb-1" />
            <div className="w-[70%] h-[4px] bg-slate-100 rounded" />
          </div>
          <div className="flex-1 bg-slate-50 rounded-lg p-[3%]">
            <div className="w-full h-[8px] bg-slate-200 rounded-lg mb-1" />
            <div className="w-[70%] h-[4px] bg-slate-100 rounded" />
          </div>
        </div>
        <div className="bg-slate-900 h-[12%]" />
      </div>
    );
  }
  if (themeId === 'classic') {
    return (
      <div className="w-full h-full bg-[#faf9f6] flex flex-col text-[3px]">
        <div className="bg-[#2c1810] h-[4%]" />
        <div className="bg-[#faf9f6] border-b-2 border-[#2c1810] h-[8%] flex items-center px-[5%]">
          <div className="w-[10%] h-[50%] bg-[#2c1810] rounded-sm" />
          <div className="flex-1 flex justify-center gap-[2%]">
            <div className="w-[10%] h-[40%] bg-[#2c1810]/20 rounded-sm" />
            <div className="w-[10%] h-[40%] bg-[#2c1810]/20 rounded-sm" />
            <div className="w-[10%] h-[40%] bg-[#2c1810]/20 rounded-sm" />
          </div>
        </div>
        <div className="mx-[8%] my-[3%] border-2 border-[#2c1810]/20 p-[3%] flex-1 flex gap-[4%]">
          <div className="flex-1">
            <div className="w-[70%] h-[3px] bg-[#2c1810] rounded mb-1" />
            <div className="w-full h-[2px] bg-[#2c1810]/30 rounded mb-0.5" />
            <div className="w-full h-[2px] bg-[#2c1810]/30 rounded mb-0.5" />
            <div className="w-[60%] h-[2px] bg-[#2c1810]/30 rounded mb-2" />
            <div className="w-[25%] h-[4px] bg-[#8B4513] rounded-sm" />
          </div>
          <div className="w-[40%] bg-[#2c1810]/10 rounded-sm" />
        </div>
        <div className="flex gap-[3%] mx-[8%] mb-[3%]">
          <div className="flex-1 border border-[#2c1810]/20 p-[2%] rounded-sm">
            <div className="w-full h-[10px] bg-[#2c1810]/10 rounded-sm" />
          </div>
          <div className="flex-1 border border-[#2c1810]/20 p-[2%] rounded-sm">
            <div className="w-full h-[10px] bg-[#2c1810]/10 rounded-sm" />
          </div>
          <div className="flex-1 border border-[#2c1810]/20 p-[2%] rounded-sm">
            <div className="w-full h-[10px] bg-[#2c1810]/10 rounded-sm" />
          </div>
        </div>
        <div className="bg-[#2c1810] h-[12%]" />
      </div>
    );
  }
  if (themeId === 'aurex') {
    return (
      <div className="w-full h-full bg-white flex flex-col text-[3px]" style={{ fontFamily: "'Sora', sans-serif" }}>
        {/* Header */}
        <div className="bg-white h-[8%] border-b border-[#E5E7EB] flex items-center px-[5%]">
          <div className="w-[10%] h-[50%] bg-[#111827] rounded-sm" />
          <div className="flex-1 flex justify-end gap-[3%]">
            <div className="w-[8%] h-[40%] bg-[#374151]/60 rounded-full" />
            <div className="w-[8%] h-[40%] bg-[#374151]/60 rounded-full" />
            <div className="w-[12%] h-[50%] bg-[#111827] rounded-sm" />
          </div>
        </div>
        {/* Hero */}
        <div className="h-[28%] bg-[#F4F6F8] flex items-center justify-center">
          <div className="text-center">
            <div className="w-[50%] mx-auto h-[4px] bg-[#111827] rounded mb-1" />
            <div className="w-[35%] mx-auto h-[2px] bg-[#374151]/50 rounded mb-2" />
            <div className="w-[18%] mx-auto h-[5px] bg-[#111827] rounded-sm" />
          </div>
        </div>
        {/* Services (white) */}
        <div className="h-[18%] bg-white flex gap-[3%] px-[5%] py-[2%]">
          <div className="flex-1 bg-[#F9FAFB] border border-[#E5E7EB] rounded-sm" />
          <div className="flex-1 bg-[#F9FAFB] border border-[#E5E7EB] rounded-sm" />
          <div className="flex-1 bg-[#F9FAFB] border border-[#E5E7EB] rounded-sm" />
        </div>
        {/* Our Process (dark) */}
        <div className="h-[18%] bg-[#1F2937] relative px-[5%] py-[2%]">
          <div className="absolute left-1/2 top-[10%] bottom-[10%] w-[1px] bg-white/30 -translate-x-1/2" />
          <div className="flex justify-start mb-[4%]">
            <div className="w-[45%] h-[3px] bg-white/70 rounded" />
          </div>
          <div className="flex justify-end">
            <div className="w-[45%] h-[3px] bg-white/70 rounded" />
          </div>
        </div>
        {/* Partners (darker) */}
        <div className="h-[10%] bg-[#111827] flex items-center justify-around px-[5%]">
          <div className="w-[10%] h-[40%] bg-white/20 rounded" />
          <div className="w-[10%] h-[40%] bg-white/20 rounded" />
          <div className="w-[10%] h-[40%] bg-white/20 rounded" />
          <div className="w-[10%] h-[40%] bg-white/20 rounded" />
        </div>
        {/* Footer */}
        <div className="flex-1 bg-[#111827]" />
      </div>
    );
  }
  if (themeId === 'personalbrand') {
    return (
      <div className="w-full h-full bg-[#fbf6ee] flex flex-col text-[3px]" style={{ fontFamily: "'Playfair Display', serif" }}>
        {/* Header — cream */}
        <div className="bg-[#fbf6ee] h-[8%] border-b border-[#e8dccd] flex items-center px-[5%]">
          <div className="w-[10%] h-[50%] bg-[#3a2517] rounded-sm" />
          <div className="flex-1 flex justify-end gap-[3%]">
            <div className="w-[8%] h-[40%] bg-[#7c6651]/50 rounded-full" />
            <div className="w-[8%] h-[40%] bg-[#7c6651]/50 rounded-full" />
            <div className="w-[12%] h-[50%] bg-[#c08552] rounded-sm" />
          </div>
        </div>
        {/* Hero — warm cream + portrait-style accent */}
        <div className="h-[28%] bg-[#fbf6ee] flex items-center px-[5%] gap-[4%]">
          <div className="w-[20%] h-[80%] bg-gradient-to-br from-[#c08552] to-[#a36a3e] rounded-full" />
          <div className="flex-1">
            <div className="w-[20%] h-[2px] bg-[#c08552] rounded mb-2" />
            <div className="w-[80%] h-[5px] bg-[#2a1810] rounded mb-1" />
            <div className="w-[60%] h-[3px] bg-[#7c6651] rounded mb-2" />
            <div className="w-[25%] h-[5px] bg-[#3a2517] rounded-sm" />
          </div>
        </div>
        {/* Services — warm white cards */}
        <div className="h-[18%] bg-white flex gap-[3%] px-[5%] py-[2%]">
          <div className="flex-1 bg-[#fbf6ee] border border-[#e8dccd] rounded" />
          <div className="flex-1 bg-[#fbf6ee] border border-[#e8dccd] rounded" />
          <div className="flex-1 bg-[#fbf6ee] border border-[#e8dccd] rounded" />
        </div>
        {/* Reading List / Testimonials — terracotta band */}
        <div className="h-[18%] bg-[#c08552] flex items-center justify-center px-[5%]">
          <div className="w-[60%] text-center">
            <div className="w-[60%] mx-auto h-[3px] bg-white rounded mb-1" />
            <div className="w-[80%] mx-auto h-[2px] bg-white/70 rounded" />
          </div>
        </div>
        {/* Contact — espresso footer */}
        <div className="h-[10%] bg-[#3a2517] flex items-center justify-around px-[5%]">
          <div className="w-[10%] h-[40%] bg-[#c08552]/40 rounded" />
          <div className="w-[10%] h-[40%] bg-[#c08552]/40 rounded" />
          <div className="w-[10%] h-[40%] bg-[#c08552]/40 rounded" />
        </div>
        <div className="flex-1 bg-[#2a1810]" />
      </div>
    );
  }
  return null;
}
