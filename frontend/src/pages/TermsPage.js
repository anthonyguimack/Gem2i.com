import React, { useState, useEffect } from 'react';
import { publicAPI } from '../lib/api';
import PageBanner from '../components/layout/PageBanner';

export default function TermsPage() {
  const [page, setPage] = useState(null);
  useEffect(() => { publicAPI.getPage('terms').then(r => setPage(r.data)).catch(console.error); }, []);
  if (!page) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-[#0D9488] border-t-transparent rounded-full"></div></div>;
  return (
    <div data-testid="terms-page">
      <PageBanner title={page.title || 'Terms of Service'} image={page.banner_image} />
      <div className="max-w-4xl mx-auto px-6 md:px-12 py-16">
        <div className="rich-text-content" dangerouslySetInnerHTML={{ __html: page.content }} data-testid="terms-content" />
      </div>
    </div>
  );
}
