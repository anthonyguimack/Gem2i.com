import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { publicAPI } from '../lib/api';
import { ArrowLeft, Calendar, User, Tag } from 'lucide-react';
import { useT } from '../lib/i18n';

export default function NewsDetailPage() {
  const tt = useT();
  const { slug } = useParams();
  const [post, setPost] = useState(null);

  useEffect(() => {
    publicAPI.getBlogDetail(slug).then(r => setPost(r.data)).catch(console.error);
  }, [slug]);

  if (!post) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-[#0D9488] border-t-transparent rounded-full"></div></div>;

  return (
    <div data-testid="news-detail-page">
      <div className="relative h-[350px] md:h-[400px] overflow-hidden">
        <img src={post.image} alt={tt(post.title)} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-[#1a2332]/60" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center max-w-3xl px-6">
            <span className="text-[#0D9488] text-xs uppercase tracking-wider font-semibold">{post.category}</span>
            <h1 className="text-3xl md:text-5xl font-bold text-white mt-3" style={{ fontFamily: 'Playfair Display, serif' }} data-testid="news-detail-title">{tt(post.title)}</h1>
          </div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-6 md:px-12 py-12 pt-24 md:pt-28">
        <div className="flex items-center gap-6 mb-8 pb-6 border-b border-slate-200">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <User className="w-4 h-4 text-[#0D9488]" /> {post.author}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Calendar className="w-4 h-4 text-[#0D9488]" /> {new Date(post.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Tag className="w-4 h-4 text-[#0D9488]" /> {post.category}
          </div>
        </div>
        {tt(post.summary) && (
          <div className="rich-text-content text-base md:text-lg text-slate-600 italic mb-8 pb-8 border-b border-slate-200" dangerouslySetInnerHTML={{ __html: tt(post.summary) }} data-testid="news-detail-summary" />
        )}
        <div className="rich-text-content" dangerouslySetInnerHTML={{ __html: tt(post.content) }} data-testid="news-detail-content" />
        <div className="mt-12 pt-6 border-t border-slate-200">
          <Link to="/news" className="inline-flex items-center gap-2 text-[#0D9488] font-medium text-sm hover:underline" data-testid="news-back-link">
            <ArrowLeft className="w-4 h-4" /> Back to All Posts
          </Link>
        </div>
      </div>
    </div>
  );
}
