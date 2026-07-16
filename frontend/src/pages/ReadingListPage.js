import React, { useState, useEffect } from 'react';
import { publicAPI } from '../lib/api';
import { Dialog, DialogContent } from '../components/ui/dialog';
import { BookOpen, ExternalLink, Quote } from 'lucide-react';

export default function ReadingListPage() {
  const [books, setBooks] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => { publicAPI.getBooks().then(r => setBooks(r.data)).catch(console.error); }, []);

  return (
    <div data-testid="reading-list-page">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-16 pt-24 md:pt-28">
        {/* Inspirational quote */}
        <div className="bg-[#F8FAFC] p-8 md:p-12 rounded-sm border border-slate-100 mb-12 text-center">
          <Quote className="w-10 h-10 mx-auto mb-4" style={{ color: 'var(--color-accent, #0D9488)' }} />
          <blockquote className="text-xl md:text-2xl italic max-w-3xl mx-auto leading-relaxed" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--color-heading, #1a2332)' }}>
            "A reader lives a thousand lives before he dies. The man who never reads lives only one."
          </blockquote>
          <p className="text-sm mt-4" style={{ color: 'var(--color-body-text, #475569)' }}>- George R.R. Martin</p>
        </div>

        {/* Introduction */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs uppercase tracking-[0.3em] font-semibold mb-3" style={{ color: 'var(--color-accent, #0D9488)' }}>CURATED RECOMMENDATIONS</p>
          <h2 className="text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--color-heading, #1a2332)' }}>Books That Shape Our Thinking</h2>
          <p className="mt-4 leading-relaxed" style={{ color: 'var(--color-body-text, #475569)' }}>These carefully selected books have profoundly influenced our consulting philosophy. Each one offers unique insights into leadership, strategy, and business transformation.</p>
        </div>

        {/* Book grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {books.map(book => (
            <div key={book.id} className="cursor-pointer group text-center" onClick={() => setSelected(book)} data-testid={`book-card-${book.id}`}>
              <div className="relative overflow-hidden rounded-sm shadow-md group-hover:shadow-xl transition-shadow mx-auto w-[160px] h-[220px]">
                <img src={book.image} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              </div>
              <h3 className="text-sm font-semibold mt-3" style={{ color: 'var(--color-heading, #1a2332)' }}>{book.title}</h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-accent, #0D9488)' }}>by {book.author}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Book detail modal */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto p-0" data-testid="book-detail-modal">
          {selected && (
            <div>
              <div className="flex flex-col md:flex-row gap-6 p-6 pb-0">
                <img src={selected.image} alt={selected.title} className="w-36 h-52 object-cover rounded-sm shadow-lg mx-auto md:mx-0 flex-shrink-0" />
                <div>
                  <h3 className="text-xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--color-heading, #1a2332)' }}>{selected.title}</h3>
                  <p className="text-sm font-medium mt-1" style={{ color: 'var(--color-accent, #0D9488)' }}>by {selected.author}</p>
                  <p className="text-sm mt-3 leading-relaxed" style={{ color: 'var(--color-body-text, #475569)' }}>{selected.description}</p>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {selected.synopsis && (
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--color-heading, #1a2332)' }}>Synopsis</h4>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--color-body-text, #475569)' }}>{selected.synopsis}</p>
                  </div>
                )}
                {selected.who_is_it_for && (
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--color-heading, #1a2332)' }}>Who Is It For?</h4>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--color-body-text, #475569)' }}>{selected.who_is_it_for}</p>
                  </div>
                )}
                {selected.about_author && (
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--color-heading, #1a2332)' }}>About the Author</h4>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--color-body-text, #475569)' }}>{selected.about_author}</p>
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  {selected.amazon_link && (
                    <a href={selected.amazon_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm text-sm font-medium transition-colors" style={{ backgroundColor: 'var(--color-button-bg, #1a2332)', color: 'var(--color-button-text, #fff)' }} data-testid="book-amazon-link">
                      <ExternalLink className="w-4 h-4" /> Buy on Amazon
                    </a>
                  )}
                  {selected.other_links?.map((link, i) => (
                    <a key={i} href={link.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 border rounded-sm text-sm font-medium" style={{ borderColor: 'var(--color-accent, #0D9488)', color: 'var(--color-accent, #0D9488)' }}>
                      <ExternalLink className="w-4 h-4" /> {link.name}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
