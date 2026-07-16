import React from 'react';
import { Facebook, Instagram, Youtube, Twitter, Linkedin } from 'lucide-react';
import { useSettings } from '../../App';

const socialIconMap = { facebook: Facebook, instagram: Instagram, youtube: Youtube, twitter: Twitter, linkedin: Linkedin };
const API = process.env.REACT_APP_BACKEND_URL;
const resolveSrc = (v) => v ? (v.startsWith('/api') ? `${API}${v}` : v) : null;

export default function LayoutAboutBio({ page }) {
  const settings = useSettings();
  const socialLinks = settings.social_links || [];

  const imgSrc = resolveSrc(page.layout_image || page.banner_image);

  return (
    <div className="max-w-6xl mx-auto px-6 md:px-12 py-16 pt-24 md:pt-28" data-testid="layout-about-bio">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
        {/* Left: Image */}
        <div>
          {imgSrc ? (
            <img src={imgSrc} alt={page.title} className="w-full rounded-lg shadow-lg object-cover aspect-[4/5]" data-testid="layout-bio-image" />
          ) : (
            <div className="w-full aspect-[4/5] rounded-lg bg-slate-200 flex items-center justify-center">
              <span className="text-slate-400 text-sm">No image set</span>
            </div>
          )}
        </div>
        {/* Right: Content */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-6" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--color-heading, #1a2332)' }} data-testid="layout-bio-title">
            {page.title}
          </h1>
          {page.summary && <p className="text-slate-500 mb-4 text-base leading-relaxed">{page.summary}</p>}
          {page.content && (
            <div className="rich-text-content prose max-w-none text-slate-600 leading-relaxed" style={{ overflowX: 'hidden' }} dangerouslySetInnerHTML={{ __html: page.content }} />
          )}
          {socialLinks.length > 0 && (
            <div className="mt-8 pt-6 border-t border-slate-200">
              <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-heading, #1a2332)' }}>Follow us:</p>
              <div className="flex items-center gap-3">
                {socialLinks.map(link => {
                  const IconComp = socialIconMap[link.icon] || Facebook;
                  return (
                    <a key={link.id} href={link.url} target="_blank" rel="noreferrer"
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-all hover:opacity-80"
                      style={{ backgroundColor: 'var(--color-primary, #1a2332)' }}
                      data-testid={`bio-social-${link.icon}`}>
                      <IconComp className="w-4 h-4" />
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
