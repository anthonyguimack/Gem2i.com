import React, { useState, useCallback } from 'react';
import { Search, X, FileText, Package, Briefcase, BookOpen, FileStack } from 'lucide-react';
import { searchAPI } from '../lib/api';
import { useNavigate } from 'react-router-dom';

const typeIcons = { blog: FileText, service: Package, portfolio: Briefcase, book: BookOpen, page: FileStack };

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const debounceRef = React.useRef(null);

  const doSearch = useCallback((q) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    searchAPI.search(q).then(r => {
      setResults(r.data.results || []);
      setOpen(true);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(v), 300);
  };

  const handleClick = (result) => {
    setOpen(false);
    setQuery('');
    setResults([]);
    navigate(result.url);
  };

  return (
    <div className="relative" data-testid="search-bar">
      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-sm overflow-hidden">
        <Search className="w-4 h-4 text-slate-400 ml-3" />
        <input
          type="text" value={query} onChange={handleChange}
          placeholder="Search..."
          className="flex-1 px-3 py-2 bg-transparent text-sm focus:outline-none"
          onFocus={() => results.length > 0 && setOpen(true)}
          data-testid="search-input"
        />
        {query && <button onClick={() => { setQuery(''); setResults([]); setOpen(false); }} className="p-2 text-slate-400 hover:text-slate-600"><X className="w-3 h-3" /></button>}
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-sm shadow-xl z-50 max-h-80 overflow-y-auto" data-testid="search-results">
          {results.map((r, i) => {
            const Icon = typeIcons[r.type] || FileText;
            return (
              <button key={i} onClick={() => handleClick(r)} className="w-full flex items-start gap-3 p-3 hover:bg-slate-50 text-left border-b border-slate-50 last:border-0" data-testid={`search-result-${i}`}>
                <div className="w-8 h-8 rounded-sm bg-[#0D9488]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-[#0D9488]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#1a2332] truncate">{r.title}</p>
                  <p className="text-xs text-slate-400 truncate">{r.summary}</p>
                  <span className="text-xs text-[#0D9488] capitalize">{r.type}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
      {open && query.length >= 2 && results.length === 0 && !loading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-sm shadow-xl z-50 p-4 text-center text-sm text-slate-400">No results found</div>
      )}
    </div>
  );
}
