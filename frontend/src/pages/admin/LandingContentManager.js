import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Save, Loader2 } from 'lucide-react';
import RichTextEditor from '../../components/RichTextEditor';
import ImageUpload from '../../components/ImageUpload';

export default function LandingContentManager() {
  const [content, setContent] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    adminAPI.getLandingContent().then(r => setContent(r.data || {})).catch(console.error);
  }, []);

  const save = async () => {
    setLoading(true);
    try {
      await adminAPI.updateLandingContent(content);
      toast.success('Landing page content saved!');
    } catch { toast.error('Error saving'); }
    finally { setLoading(false); }
  };

  const u = (key, val) => setContent(prev => ({ ...prev, [key]: val }));

  return (
    <div data-testid="landing-content-manager">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--ad-heading, #1a2332)', fontFamily: 'Playfair Display, serif' }}>Landing Page Content</h1>
        <button onClick={save} disabled={loading} className="text-white px-4 py-2 rounded-sm text-sm font-medium flex items-center gap-2 disabled:opacity-50" style={{ backgroundColor: 'var(--ad-button-bg, #0D9488)' }} data-testid="lp-content-save-btn">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Content
        </button>
      </div>

      <div className="space-y-6">
        {/* Navigation Links */}
        <div className="bg-white rounded-sm border border-slate-100 p-6 space-y-4">
          <h2 className="font-semibold text-sm uppercase tracking-wider" style={{ color: 'var(--ad-heading, #1a2332)' }}>Navigation Bar Links</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div><Label>Link 1 Text</Label><Input value={content.nav1_text || ''} onChange={e => u('nav1_text', e.target.value)} className="mt-1" placeholder="Home" data-testid="lp-nav1-text" /></div>
            <div><Label>Link 2 Text</Label><Input value={content.nav2_text || ''} onChange={e => u('nav2_text', e.target.value)} className="mt-1" placeholder="More Information" data-testid="lp-nav2-text" /></div>
            <div><Label>Link 3 Text</Label><Input value={content.nav3_text || ''} onChange={e => u('nav3_text', e.target.value)} className="mt-1" placeholder="Membership Lounge" data-testid="lp-nav3-text" /></div>
            <div><Label>Link 4 Text</Label><Input value={content.nav4_text || ''} onChange={e => u('nav4_text', e.target.value)} className="mt-1" placeholder="Waiting List" data-testid="lp-nav4-text" /></div>
          </div>
        </div>

        {/* Get in Touch Section */}
        <div className="bg-white rounded-sm border border-slate-100 p-6 space-y-4">
          <h2 className="font-semibold text-sm uppercase tracking-wider" style={{ color: 'var(--ad-heading, #1a2332)' }}>Get in Touch Section (Contact Form)</h2>
          <div><Label>Section Title</Label><Input value={content.contact_title || ''} onChange={e => u('contact_title', e.target.value)} className="mt-1" placeholder="Get in touch with us!" data-testid="lp-contact-title" /></div>
          <div><Label>Section Subtitle</Label><Input value={content.contact_subtitle || ''} onChange={e => u('contact_subtitle', e.target.value)} className="mt-1" placeholder="" data-testid="lp-contact-subtitle" /></div>
          <div><Label>Description</Label>
            <RichTextEditor value={content.contact_description || ''} onChange={val => u('contact_description', val)} />
          </div>
          <div><Label>Section Image (left column)</Label>
            <ImageUpload value={content.contact_image || ''} onChange={v => u('contact_image', v)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Submit Button Text</Label><Input value={content.contact_btn_text || ''} onChange={e => u('contact_btn_text', e.target.value)} className="mt-1" placeholder="Send my Message" data-testid="lp-contact-btn" /></div>
            <div><Label>Name Placeholder</Label><Input value={content.contact_name_ph || ''} onChange={e => u('contact_name_ph', e.target.value)} className="mt-1" placeholder="Your Name" data-testid="lp-contact-name-ph" /></div>
            <div><Label>Email Placeholder</Label><Input value={content.contact_email_ph || ''} onChange={e => u('contact_email_ph', e.target.value)} className="mt-1" placeholder="Your Email" data-testid="lp-contact-email-ph" /></div>
            <div><Label>Subject Placeholder</Label><Input value={content.contact_subject_ph || ''} onChange={e => u('contact_subject_ph', e.target.value)} className="mt-1" placeholder="Write the subject" data-testid="lp-contact-subject-ph" /></div>
            <div><Label>Message Placeholder</Label><Input value={content.contact_message_ph || ''} onChange={e => u('contact_message_ph', e.target.value)} className="mt-1" placeholder="Your message here" data-testid="lp-contact-message-ph" /></div>
          </div>
        </div>

        {/* Waiting List Section */}
        <div className="bg-white rounded-sm border border-slate-100 p-6 space-y-4">
          <h2 className="font-semibold text-sm uppercase tracking-wider" style={{ color: 'var(--ad-heading, #1a2332)' }}>Waiting List Section</h2>
          <div><Label>Section Title</Label><Input value={content.waitlist_title || ''} onChange={e => u('waitlist_title', e.target.value)} className="mt-1" placeholder="Waiting List" data-testid="lp-waitlist-title" /></div>
          <div><Label>Section Subtitle</Label><Input value={content.waitlist_subtitle || ''} onChange={e => u('waitlist_subtitle', e.target.value)} className="mt-1" placeholder="Signing up to our newsletter gives you exclusive access..." data-testid="lp-waitlist-subtitle" /></div>
          <div><Label>Submit Button Text</Label><Input value={content.waitlist_btn_text || ''} onChange={e => u('waitlist_btn_text', e.target.value)} className="mt-1" placeholder="Submit" data-testid="lp-waitlist-btn" /></div>
        </div>

        {/* Footer */}
        <div className="bg-white rounded-sm border border-slate-100 p-6 space-y-4">
          <h2 className="font-semibold text-sm uppercase tracking-wider" style={{ color: 'var(--ad-heading, #1a2332)' }}>Footer</h2>
          <div><Label>Footer Description</Label><textarea value={content.footer_description || ''} onChange={e => u('footer_description', e.target.value)} rows={3} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-sm mt-1" placeholder="Platform description for the footer..." data-testid="lp-footer-desc" /></div>
          <div><Label>Social Section Title</Label><Input value={content.footer_social_title || ''} onChange={e => u('footer_social_title', e.target.value)} className="mt-1" placeholder="Follow Us" data-testid="lp-footer-social-title" /></div>
          <div><Label>Copyright Text</Label><Input value={content.footer_text || ''} onChange={e => u('footer_text', e.target.value)} className="mt-1" placeholder="&copy; aurexnetwork.com - Coming Soon" data-testid="lp-footer-text" /></div>
        </div>

        {/* Cookie Banner */}
        <div className="bg-white rounded-sm border border-slate-100 p-6 space-y-4">
          <h2 className="font-semibold text-sm uppercase tracking-wider" style={{ color: 'var(--ad-heading, #1a2332)' }}>Cookie Banner (GDPR)</h2>
          <div><Label>Cookie Message</Label><textarea value={content.cookie_message || ''} onChange={e => u('cookie_message', e.target.value)} rows={2} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-sm text-sm mt-1" placeholder="We use cookies and analytics to improve your experience..." data-testid="lp-cookie-msg" /></div>
        </div>
      </div>
    </div>
  );
}
