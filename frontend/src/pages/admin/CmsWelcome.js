import React from 'react';
import { useAuth } from '../../lib/auth';
import { useSettings } from '../../App';
import { useT } from '../../lib/i18n';
import { normalizeRichText } from '../../lib/richText';
import { Sparkles } from 'lucide-react';

/**
 * CMS Welcome
 * ───────────
 * Default landing screen for operators whose role doesn't grant the Dashboard
 * section.  Renders the admin-managed `settings.cms_welcome` rich-text field,
 * with HTML formatting preserved (no escaped tags) and the same nbsp-strip
 * pipeline used elsewhere on the public site so paragraphs wrap naturally.
 */
export default function CmsWelcome() {
  const { user } = useAuth();
  const settings = useSettings();
  const tt = useT();
  const html = normalizeRichText(tt(settings.cms_welcome) || '');
  const fallback = `Welcome${user?.first_name ? `, ${user.first_name}` : ''}! Use the sidebar on the left to navigate to your assigned sections.`;
  return (
    <div className="max-w-3xl mx-auto py-12" data-testid="cms-welcome">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-[#0D9488]/10 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-[#0D9488]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome to the CMS</h1>
          <p className="text-sm text-slate-500">Logged in as {user?.email}</p>
        </div>
      </div>
      {html ? (
        <div
          className="rich-text-content text-slate-700 leading-relaxed prose prose-slate max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <p className="text-slate-600 leading-relaxed">{fallback}</p>
      )}
    </div>
  );
}
