import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { publicAPI } from '../lib/api';
import HeroSection from '../components/HeroSection';
import LayoutAboutBio from '../components/layouts/LayoutAboutBio';
import LayoutServicesGrid from '../components/layouts/LayoutServicesGrid';
import LayoutGalleryAlbums from '../components/layouts/LayoutGalleryAlbums';
import LayoutFullContent from '../components/layouts/LayoutFullContent';
import LayoutRenderer from '../components/layouts/LayoutRenderer';
import { LAYOUTS } from '../lib/layoutDefinitions';

export default function DynamicPage() {
  const { pageId } = useParams();
  const location = useLocation();
  const [page, setPage] = useState(null);
  const [heroSlides, setHeroSlides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setPage(null);
    setHeroSlides([]);

    publicAPI.getNavPages().then(r => {
      const pages = r.data || [];
      const currentPath = location.pathname;

      const candidates = pages.filter(p =>
        (pageId && p.id === pageId) ||
        (pageId && p.url === `/page/${pageId}`) ||
        (!pageId && p.url === currentPath)
      );

      const found = candidates.length > 1
        ? candidates.sort((a, b) => {
            if (a.layout && !b.layout) return -1;
            if (!a.layout && b.layout) return 1;
            return (b.created_at || '').localeCompare(a.created_at || '');
          })[0]
        : candidates[0];

      if (found) {
        setPage(found);
        publicAPI.getHeroSlides(found.id).then(hs => {
          setHeroSlides(hs.data || []);
        }).catch(() => {});
        if (found.page_type) {
          publicAPI.getPage(found.page_type).then(res => {
            setPage(prev => ({ ...prev, ...res.data, title: found.title }));
          }).catch(() => {});
        }
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [pageId, location.pathname]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-[#0D9488] border-t-transparent rounded-full"></div></div>;

  if (!page) return (
    <div className="min-h-screen flex items-center justify-center" data-testid="page-not-found">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-[#1a2332] mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>404</h1>
        <p className="text-slate-500">Page not found</p>
      </div>
    </div>
  );

  const renderLayout = () => {
    // Legacy preset layouts
    switch (page.layout) {
      case 'layout_1': return <LayoutAboutBio page={page} />;
      case 'layout_2': return <LayoutServicesGrid page={page} />;
      case 'layout_3': return <LayoutGalleryAlbums page={page} />;
      case 'layout_5': return <LayoutFullContent page={page} />;
      default: break;
    }

    // New builder layouts with zones
    if (page.layout && LAYOUTS[page.layout]) {
      return <LayoutRenderer page={page} hasHero={heroSlides.length > 0} />;
    }

    // Default: render content HTML
    return (
      <div className={`max-w-4xl mx-auto px-6 md:px-12 py-16 ${!heroSlides.length ? 'pt-24 md:pt-28' : ''}`} style={{ overflowX: 'hidden', wordBreak: 'normal', overflowWrap: 'break-word', hyphens: 'none' }}>
        <h1 className="text-3xl font-bold mb-6" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--color-heading, #1a2332)' }} data-testid="page-title">{page.title}</h1>
        {page.summary && <p className="text-slate-500 mb-6">{page.summary}</p>}
        {page.content && <div className="rich-text-content" style={{ overflowX: 'hidden', maxWidth: '100%' }} dangerouslySetInnerHTML={{ __html: page.content }} />}
      </div>
    );
  };

  return (
    <div data-testid="dynamic-page">
      {heroSlides.length > 0 && <HeroSection slides={heroSlides} />}
      {renderLayout()}
    </div>
  );
}
