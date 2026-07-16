/**
 * useDataTable — reusable hook + render-helper components for every CMS table.
 *
 * Goal: drop-in real-time search, multi-column sort, page-size selector
 * (10/25/50/100), and numbered pagination with the smallest possible footprint
 * in each manager file.  Adopting the hook is ~10 lines per table:
 *
 *   const dt = useDataTable(items, {
 *     searchFields: ['email', 'first_name', 'last_name'],
 *     searchAccessor: row => row.email + ' ' + row.first_name,   // optional
 *     defaultSort: { key: 'created_at', dir: 'desc' },
 *     defaultPageSize: 25,
 *     storageKey: 'members-table',                               // optional
 *   });
 *
 *   <DataTableToolbar dt={dt} testId="members" />
 *   <table>
 *     <thead>
 *       <tr>
 *         <SortableTh dt={dt} field="first_name">Name</SortableTh>
 *         ...
 *       </tr>
 *     </thead>
 *     <tbody>{dt.visibleItems.map(...)}</tbody>
 *   </table>
 *   <DataTablePagination dt={dt} testId="members" />
 *
 * Notes:
 *   - Filtering, sorting, paging happen client-side; perfect fit for CMS
 *     tables that almost never exceed a few thousand rows.
 *   - The hook stores ONLY the page-size preference in localStorage (when
 *     `storageKey` is set) — search and sort are intentionally per-session.
 *   - Sort handles strings (locale-compare), numbers, dates (ISO-friendly),
 *     and null/undefined (always sorted last regardless of direction).
 */
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function getDeep(obj, path) {
  if (!obj || !path) return undefined;
  if (typeof path === 'function') return path(obj);
  return path.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
}

function compareValues(a, b) {
  // null/undefined always sort to the end regardless of direction
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  // ISO date heuristic
  if (typeof a === 'string' && typeof b === 'string') {
    const da = Date.parse(a), db = Date.parse(b);
    if (!isNaN(da) && !isNaN(db) && a.length > 8 && b.length > 8) return da - db;
    // Natural / numeric-aware compare so "AUX-2" < "AUX-10" and "Item 2" < "Item 10"
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  }
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

export function useDataTable(items, options = {}) {
  const {
    searchFields = [],
    searchAccessor,
    defaultSort = { key: null, dir: 'asc' },
    defaultPageSize = 25,
    storageKey,
  } = options;

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState(defaultSort.key);
  const [sortDir, setSortDir] = useState(defaultSort.dir);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(() => {
    if (storageKey) {
      try {
        const stored = parseInt(localStorage.getItem(`dt:${storageKey}:pageSize`), 10);
        if (PAGE_SIZE_OPTIONS.includes(stored)) return stored;
      } catch (_) { /* ignore */ }
    }
    return defaultPageSize;
  });

  const setPageSize = useCallback((n) => {
    setPageSizeState(n);
    if (storageKey) {
      try { localStorage.setItem(`dt:${storageKey}:pageSize`, String(n)); } catch (_) { /* ignore */ }
    }
    setPage(1);
  }, [storageKey]);

  const toggleSort = useCallback((key) => {
    // Read current state explicitly. Calling another setter inside an
    // updater (the previous implementation) is unreliable in React 18
    // strict-mode and missed every other click.
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  }, [sortKey]);

  // Reset to page 1 whenever search changes
  useEffect(() => { setPage(1); }, [search]);

  const filtered = useMemo(() => {
    const list = Array.isArray(items) ? items : [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(row => {
      if (searchAccessor) {
        const txt = searchAccessor(row);
        return typeof txt === 'string' && txt.toLowerCase().includes(q);
      }
      return searchFields.some(f => {
        const v = getDeep(row, f);
        if (v == null) return false;
        return String(v).toLowerCase().includes(q);
      });
    });
  }, [items, search, searchFields, searchAccessor]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const arr = [...filtered];
    arr.sort((a, b) => {
      const av = getDeep(a, sortKey);
      const bv = getDeep(b, sortKey);
      const c = compareValues(av, bv);
      return sortDir === 'asc' ? c : -c;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const totalFiltered = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safePage = Math.min(page, totalPages);

  // Auto-correct page if it overflows after filter changes (without setState in render)
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const visibleItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, safePage, pageSize]);

  return {
    visibleItems,
    search, setSearch,
    sortKey, sortDir, toggleSort,
    page: safePage, setPage, totalPages,
    pageSize, setPageSize,
    totalFiltered,
    totalAll: Array.isArray(items) ? items.length : 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Render helpers — kept tiny so individual managers can compose around them.

export function DataTableToolbar({ dt, testId, placeholder = 'Search…', extra }) {
  const tid = testId || 'datatable';
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-3" data-testid={`${tid}-toolbar`}>
      <div className="relative flex-1 min-w-[220px] max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={dt.search}
          onChange={(e) => dt.setSearch(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-[#0D9488] bg-white"
          data-testid={`${tid}-search-input`}
        />
      </div>
      <div className="flex items-center gap-3 text-xs text-slate-500">
        {extra}
        <span data-testid={`${tid}-count`}>
          {dt.totalFiltered === dt.totalAll
            ? `${dt.totalAll} total`
            : `${dt.totalFiltered} of ${dt.totalAll}`}
        </span>
        <label className="flex items-center gap-1.5">
          <span>Show</span>
          <select
            value={dt.pageSize}
            onChange={(e) => dt.setPageSize(parseInt(e.target.value, 10))}
            className="border border-slate-200 rounded-sm px-2 py-1 text-xs bg-white focus:outline-none focus:border-[#0D9488]"
            data-testid={`${tid}-page-size`}
          >
            {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}

export function SortableTh({ dt, field, children, className = '', align = 'left', ...rest }) {
  const active = dt.sortKey === field;
  const Icon = !active ? ArrowUpDown : (dt.sortDir === 'asc' ? ArrowUp : ArrowDown);
  return (
    <th
      onClick={() => dt.toggleSort(field)}
      className={`select-none cursor-pointer hover:bg-slate-100 transition-colors text-${align} p-3 font-medium text-slate-600 ${className}`}
      data-testid={`th-${field}`}
      {...rest}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <Icon className={`w-3 h-3 ${active ? 'text-[#0D9488]' : 'text-slate-300'}`} />
      </span>
    </th>
  );
}

export function DataTablePagination({ dt, testId }) {
  const tid = testId || 'datatable';
  if (dt.totalPages <= 1) return null;

  // Build a numeric range with ellipses around the current page.
  const pages = [];
  const cur = dt.page;
  const last = dt.totalPages;
  const push = (n) => { if (!pages.includes(n) && n >= 1 && n <= last) pages.push(n); };
  push(1);
  push(2);
  for (let i = cur - 2; i <= cur + 2; i++) push(i);
  push(last - 1);
  push(last);
  pages.sort((a, b) => a - b);

  const out = [];
  let prev = 0;
  for (const p of pages) {
    if (p - prev > 1) out.push({ ellipsis: true, key: `e${p}` });
    out.push({ page: p, key: `p${p}` });
    prev = p;
  }

  return (
    <div className="flex items-center justify-between px-3 py-3 border-t border-slate-100 text-xs" data-testid={`${tid}-pagination`}>
      <div className="text-slate-500">
        Page <span className="font-medium text-slate-700">{cur}</span> of {last}
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => dt.setPage(1)} disabled={cur === 1} className="p-1.5 rounded-sm border border-slate-200 disabled:opacity-30 hover:bg-slate-50" data-testid={`${tid}-page-first`}><ChevronsLeft className="w-3.5 h-3.5" /></button>
        <button onClick={() => dt.setPage(cur - 1)} disabled={cur === 1} className="p-1.5 rounded-sm border border-slate-200 disabled:opacity-30 hover:bg-slate-50" data-testid={`${tid}-page-prev`}><ChevronLeft className="w-3.5 h-3.5" /></button>
        {out.map(item =>
          item.ellipsis
            ? <span key={item.key} className="px-2 text-slate-400">…</span>
            : (
              <button key={item.key}
                onClick={() => dt.setPage(item.page)}
                className={`min-w-[28px] px-2 py-1 rounded-sm border text-center ${item.page === cur ? 'bg-[#0D9488] text-white border-[#0D9488]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                data-testid={`${tid}-page-${item.page}`}>
                {item.page}
              </button>
            )
        )}
        <button onClick={() => dt.setPage(cur + 1)} disabled={cur === last} className="p-1.5 rounded-sm border border-slate-200 disabled:opacity-30 hover:bg-slate-50" data-testid={`${tid}-page-next`}><ChevronRight className="w-3.5 h-3.5" /></button>
        <button onClick={() => dt.setPage(last)} disabled={cur === last} className="p-1.5 rounded-sm border border-slate-200 disabled:opacity-30 hover:bg-slate-50" data-testid={`${tid}-page-last`}><ChevronsRight className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}

export const DEFAULT_PAGE_SIZE_OPTIONS = PAGE_SIZE_OPTIONS;
