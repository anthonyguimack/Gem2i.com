import React from 'react';

export default function LayoutFullContent({ page }) {
  return (
    <div className="max-w-4xl mx-auto px-6 md:px-12 py-16 pt-24 md:pt-28" data-testid="layout-full-content">
      <h1 className="text-3xl md:text-4xl font-bold mb-6" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--color-heading, #1a2332)' }} data-testid="page-title">
        {page.title}
      </h1>
      {page.summary && <p className="text-slate-500 mb-8 text-lg leading-relaxed">{page.summary}</p>}
      {page.content && (
        <div className="rich-text-content prose prose-slate max-w-none leading-relaxed"
          style={{ overflowX: 'hidden', wordBreak: 'break-word' }}
          dangerouslySetInnerHTML={{ __html: page.content }} />
      )}
    </div>
  );
}
