import React from 'react';
import BlockRenderer from './BlockRenderer';

function Zone({ blocks, className }) {
  const sorted = [...(blocks || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
  if (!sorted.length) return <div />;
  return (
    <div className={className || 'space-y-6'}>
      {sorted.map(block => <BlockRenderer key={block.id} block={block} />)}
    </div>
  );
}

export default function LayoutRenderer({ page, hasHero }) {
  const zones = page.zones || {};
  const layout = page.layout;
  const topPad = hasHero ? 'py-16' : 'py-16 pt-24 md:pt-28';
  const noAutoTitle = ['hero_banner', 'landing'].includes(layout);

  const Title = () => noAutoTitle ? null : (
    <>
      <h1 className="text-3xl md:text-4xl font-bold mb-4"
        style={{ fontFamily: 'Playfair Display, serif', color: 'var(--color-heading, #1a2332)' }}
        data-testid="layout-page-title">
        {page.title}
      </h1>
      {page.summary && <p className="text-slate-500 mb-8">{page.summary}</p>}
    </>
  );

  switch (layout) {
    case 'full_width':
      return (
        <div className={`w-full px-6 md:px-12 ${topPad}`} data-testid="layout-renderer">
          <div className="max-w-6xl mx-auto"><Title /></div>
          <Zone blocks={zones.main} />
        </div>
      );

    case 'boxed':
      return (
        <div className={`max-w-4xl mx-auto px-6 ${topPad}`} data-testid="layout-renderer">
          <Title />
          <Zone blocks={zones.main} />
        </div>
      );

    case 'split_screen':
      return (
        <div className={`max-w-6xl mx-auto px-6 md:px-12 ${topPad}`} data-testid="layout-renderer">
          <Title />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Zone blocks={zones.left} />
            <Zone blocks={zones.right} />
          </div>
        </div>
      );

    case 'about_bio':
      return (
        <div className={`max-w-6xl mx-auto px-6 md:px-12 ${topPad}`} data-testid="layout-renderer">
          <Title />
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
            <div className="lg:col-span-2">
              <Zone blocks={zones.sidebar} />
            </div>
            <div className="lg:col-span-3">
              <Zone blocks={zones.main} />
            </div>
          </div>
        </div>
      );

    case 'grid':
      return (
        <div className={`max-w-6xl mx-auto px-6 md:px-12 ${topPad}`} data-testid="layout-renderer">
          <Title />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Zone blocks={zones.cell_1} />
            <Zone blocks={zones.cell_2} />
            <Zone blocks={zones.cell_3} />
            <Zone blocks={zones.cell_4} />
          </div>
        </div>
      );

    case 'masonry':
      return (
        <div className={`max-w-6xl mx-auto px-6 md:px-12 ${topPad}`} data-testid="layout-renderer">
          <Title />
          <div style={{ columns: '2 300px', columnGap: '1.5rem' }}>
            {[...(zones.main || [])].sort((a, b) => (a.order || 0) - (b.order || 0)).map(block => (
              <div key={block.id} style={{ breakInside: 'avoid', marginBottom: '1.5rem' }}>
                <BlockRenderer block={block} />
              </div>
            ))}
          </div>
        </div>
      );

    case 'list':
      return (
        <div className={`max-w-3xl mx-auto px-6 ${topPad}`} data-testid="layout-renderer">
          <Title />
          <div className="divide-y divide-slate-100">
            {[...(zones.main || [])].sort((a, b) => (a.order || 0) - (b.order || 0)).map(block => (
              <div key={block.id} className="py-6"><BlockRenderer block={block} /></div>
            ))}
          </div>
        </div>
      );

    case 'carousel':
      return (
        <div className={`max-w-6xl mx-auto px-6 md:px-12 ${topPad}`} data-testid="layout-renderer">
          <Title />
          <div className="overflow-x-auto pb-4 -mx-2">
            <div className="flex gap-6 px-2" style={{ minWidth: 'max-content' }}>
              {[...(zones.main || [])].sort((a, b) => (a.order || 0) - (b.order || 0)).map(block => (
                <div key={block.id} className="w-80 flex-shrink-0"><BlockRenderer block={block} /></div>
              ))}
            </div>
          </div>
        </div>
      );

    case 'two_column':
      return (
        <div className={`max-w-6xl mx-auto px-6 md:px-12 ${topPad}`} data-testid="layout-renderer">
          <Title />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2"><Zone blocks={zones.main} /></div>
            <div><Zone blocks={zones.sidebar} /></div>
          </div>
        </div>
      );

    case 'three_column':
      return (
        <div className={`max-w-6xl mx-auto px-6 md:px-12 ${topPad}`} data-testid="layout-renderer">
          <Title />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Zone blocks={zones.col_1} />
            <Zone blocks={zones.col_2} />
            <Zone blocks={zones.col_3} />
          </div>
        </div>
      );

    case 'profile':
      return (
        <div className={`max-w-6xl mx-auto px-6 md:px-12 ${topPad}`} data-testid="layout-renderer">
          <Title />
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div><Zone blocks={zones.sidebar} /></div>
            <div className="lg:col-span-3"><Zone blocks={zones.main} /></div>
          </div>
        </div>
      );

    case 'card_based':
      return (
        <div className={`max-w-6xl mx-auto px-6 md:px-12 ${topPad}`} data-testid="layout-renderer">
          <Title />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...(zones.main || [])].sort((a, b) => (a.order || 0) - (b.order || 0)).map(block => (
              <div key={block.id} className="bg-white rounded-lg border border-slate-100 p-6 shadow-sm">
                <BlockRenderer block={block} />
              </div>
            ))}
          </div>
        </div>
      );

    case 'hero_banner':
      return (
        <div data-testid="layout-renderer">
          <div className="w-full min-h-[300px] relative flex items-center justify-center" style={{ backgroundColor: 'var(--color-primary, #1a2332)' }}>
            <div className="max-w-4xl mx-auto px-6 py-16 text-center text-white">
              <Zone blocks={zones.hero} className="space-y-4" />
            </div>
          </div>
          <div className="max-w-6xl mx-auto px-6 md:px-12 py-16">
            <Zone blocks={zones.main} />
          </div>
        </div>
      );

    case 'sidebar_layout':
      return (
        <div className={`max-w-6xl mx-auto px-6 md:px-12 ${topPad}`} data-testid="layout-renderer">
          <Title />
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="bg-slate-50 p-6 rounded-lg"><Zone blocks={zones.sidebar} /></div>
            <div className="lg:col-span-3"><Zone blocks={zones.main} /></div>
          </div>
        </div>
      );

    case 'landing':
      return (
        <div data-testid="layout-renderer">
          <div className={`w-full py-20 px-6 ${hasHero ? '' : 'pt-28'}`} style={{ backgroundColor: 'var(--color-primary, #1a2332)' }}>
            <div className="max-w-4xl mx-auto text-center text-white">
              <Zone blocks={zones.hero} className="space-y-4" />
            </div>
          </div>
          <div className="max-w-6xl mx-auto px-6 md:px-12 py-16">
            <Zone blocks={zones.features} />
          </div>
          <div className="w-full py-16 px-6" style={{ backgroundColor: 'var(--color-accent, #0D9488)' }}>
            <div className="max-w-4xl mx-auto text-center text-white">
              <Zone blocks={zones.cta} className="space-y-4" />
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
}
