import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Save, Loader2, MessageSquare } from 'lucide-react';
import LocalizedField from '../../components/admin/LocalizedField';
import RichTextEditor from '../../components/RichTextEditor';

export default function ContactSettingsManager() {
  const [form, setForm] = useState({ title: 'Contact', subtitle: "Let's Work Together", description: 'Have a project in mind? Let\'s discuss how we can help' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminAPI.getContactSettings().then(r => { if (r.data) setForm(r.data); }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminAPI.updateContactSettings(form);
      toast.success('Contact section saved!');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <div data-testid="contact-settings-manager">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1a2332]" style={{ fontFamily: 'Playfair Display, serif' }}>Contact Section</h1>
          <p className="text-sm text-slate-400 mt-1">Edit the text displayed in the contact section on the homepage</p>
        </div>
        <MessageSquare className="w-8 h-8 text-slate-200" />
      </div>

      <div className="bg-white border border-slate-200 rounded-sm p-6 max-w-2xl">
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-slate-500">Title</Label>
            <LocalizedField value={form.title} onChange={v => setForm({ ...form, title: v })} render={({ value, onChange }) => (
              <Input value={value || ''} onChange={e => onChange(e.target.value)} className="mt-1" data-testid="contact-title-input" />
            )} />
          </div>
          <div>
            <Label className="text-xs text-slate-500">Subtitle</Label>
            <LocalizedField value={form.subtitle} onChange={v => setForm({ ...form, subtitle: v })} render={({ value, onChange }) => (
              <Input value={value || ''} onChange={e => onChange(e.target.value)} className="mt-1" data-testid="contact-subtitle-input" />
            )} />
          </div>
          <div>
            <Label className="text-xs text-slate-500">Description</Label>
            <p className="text-xs text-slate-400 mb-1">Rich text — rendered formatted on the website.</p>
            <LocalizedField value={form.description} onChange={v => setForm({ ...form, description: v })} render={({ value, onChange }) => (
              <RichTextEditor value={value || ''} onChange={onChange} placeholder="Have a project in mind? Let's discuss…" />
            )} />
          </div>
          <div>
            <Label className="text-xs text-slate-500">Name placeholder</Label>
            <LocalizedField value={form.name_placeholder} onChange={v => setForm({ ...form, name_placeholder: v })} render={({ value, onChange }) => (
              <Input value={value || ''} onChange={e => onChange(e.target.value)} placeholder="Your name" className="mt-1" data-testid="contact-name-ph" />
            )} />
          </div>
          <div>
            <Label className="text-xs text-slate-500">Email placeholder</Label>
            <LocalizedField value={form.email_placeholder} onChange={v => setForm({ ...form, email_placeholder: v })} render={({ value, onChange }) => (
              <Input value={value || ''} onChange={e => onChange(e.target.value)} placeholder="Your email" className="mt-1" data-testid="contact-email-ph" />
            )} />
          </div>
          <div>
            <Label className="text-xs text-slate-500">Message placeholder</Label>
            <LocalizedField value={form.message_placeholder} onChange={v => setForm({ ...form, message_placeholder: v })} render={({ value, onChange }) => (
              <Input value={value || ''} onChange={e => onChange(e.target.value)} placeholder="Your message" className="mt-1" data-testid="contact-msg-ph" />
            )} />
          </div>
          <div>
            <Label className="text-xs text-slate-500">Submit button text</Label>
            <LocalizedField value={form.submit_text} onChange={v => setForm({ ...form, submit_text: v })} render={({ value, onChange }) => (
              <Input value={value || ''} onChange={e => onChange(e.target.value)} placeholder="Send message" className="mt-1" data-testid="contact-submit-text" />
            )} />
          </div>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="mt-6 bg-[#0D9488] text-white px-6 py-2.5 rounded-sm text-sm font-medium flex items-center gap-2 disabled:opacity-50 hover:bg-[#0D9488]/80 transition-colors"
          data-testid="contact-save-btn">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Contact Section
        </button>
      </div>
    </div>
  );
}
