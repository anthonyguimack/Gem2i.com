import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { publicAPI } from '../lib/api';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { useT, useLang, itemHasLocale } from '../lib/i18n';

export default function NewsPage() {
  const tt = useT();
  const { lang } = useLang();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState({ posts: [], total: 0, page: 1, pages: 1 });
  const [category, setCategory] = useState('');
  const page = parseInt(searchParams.get('page') || '1');

  useEffect(() => {
    publicAPI.getBlog(page, 9, category).then(r => setData(r.data)).catch(console.error);
  }, [page, category]);

  // Filter out posts that have no content in the current locale — match the
  // rest of the site's per-item locale scoping. Legacy plain-string posts
  // remain visible everywhere (itemHasLocale handles it).
  const posts = data.posts.filter(p => itemHasLocale(p.title, lang));
  const categories = [...new Set(posts.map(p => p.category).filter(Boolean))];

  return (
    <div data-testid="news-page">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-16 pt-24 md:pt-28">
        {categories.length > 0 && (
          <div className="flex gap-3 mb-10 flex-wrap">
            <button onClick={() => setCategory('')} className={`px-5 py-2 rounded-sm text-sm font-medium transition-colors ${!category ? 'bg-[#1a2332] text-white' : 'bg-white text-slate-600 border border-slate-200'}`} data-testid="news-cat-all">All</button>
            {categories.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)} className={`px-5 py-2 rounded-sm text-sm font-medium transition-colors ${category === cat ? 'bg-[#1a2332] text-white' : 'bg-white text-slate-600 border border-slate-200'}`} data-testid={`news-cat-${cat}`}>{cat}</button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map(post => (
            <Link key={post.id} to={`/news/${post.slug}`} className="group bg-white rounded-sm border border-slate-100 overflow-hidden hover:shadow-xl transition-all" data-testid={`news-card-${post.slug}`}>
              <div className="h-48 overflow-hidden">
                <img src={post.image} alt={tt(post.title)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[#0D9488] text-xs uppercase tracking-wider font-semibold">{post.category}</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-xs text-slate-400">{new Date(post.created_at).toLocaleDateString()}</span>
                </div>
                <h3 className="text-lg font-semibold text-[#1a2332] group-hover:text-[#0D9488] transition-colors" style={{ fontFamily: 'Playfair Display, serif' }}>{tt(post.title)}</h3>
                {tt(post.summary) && (
                  <div
                    className="text-sm text-slate-500 mt-2 line-clamp-3 rich-text-content"
                    dangerouslySetInnerHTML={{ __html: tt(post.summary) }}
                  />
                )}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                  <span className="text-xs text-slate-400">By {post.author}</span>
                  <span className="text-xs text-[#0D9488] font-medium flex items-center gap-1">Read More <ChevronRight className="w-3 h-3" /></span>
                </div>
              </div>
            </Link>
          ))}
        </div>
        {data.pages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-12" data-testid="news-pagination">
            <button onClick={() => setSearchParams({ page: Math.max(1, page - 1) })} disabled={page <= 1} className="p-2 border border-slate-200 rounded-sm disabled:opacity-30" data-testid="news-prev-btn">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: data.pages }, (_, i) => (
              <button key={i + 1} onClick={() => setSearchParams({ page: i + 1 })} className={`w-10 h-10 rounded-sm text-sm font-medium ${page === i + 1 ? 'bg-[#1a2332] text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {i + 1}
              </button>
            ))}
            <button onClick={() => setSearchParams({ page: Math.min(data.pages, page + 1) })} disabled={page >= data.pages} className="p-2 border border-slate-200 rounded-sm disabled:opacity-30" data-testid="news-next-btn">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
