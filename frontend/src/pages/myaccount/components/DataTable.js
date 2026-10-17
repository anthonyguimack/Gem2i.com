/**
 * My Account 2.0 table presentation — the Velzon "List.js" table (Screenshot_51).
 *
 * ⚠ LOGIC IS NOT REIMPLEMENTED HERE. Search, multi-column sort and paging come
 * from the project's existing `useDataTable` hook (`components/admin/useDataTable`),
 * which already handles locale/numeric/date compares and null-last ordering and is
 * in use across the CMS tables. This file only supplies the 2.0 CHROME, because
 * the hook's own render helpers are styled for the light-slate CMS admin (teal
 * #0D9488, slate-* utilities) and would look foreign inside `.ma2-scope`.
 *
 * Re-export of the hook is deliberate: pages import both from one place, so the
 * pairing can never drift.
 *
 * Reference parity notes:
 *  - the toolbar carries the search box right-aligned; row-level bulk controls
 *    (the reference's select-all checkbox + trash) are NOT included — neither
 *    2.0 table has a bulk action, and an affordance that leads nowhere is worse
 *    than none. Add them the day a bulk endpoint exists.
 *  - no page-size selector: the reference paginates at a fixed size.
 */
import React from 'react';
import { Search, ChevronUp, ChevronDown } from 'lucide-react';
import { useDataTable } from '../../../components/admin/useDataTable';

export { useDataTable };

/** Search row that sits directly under the card head. */
export function Ma2TableToolbar({ dt, testId, placeholder = 'Search…', children }) {
  const tid = testId || 'ma2-table';
  return (
    <div className="ma2-table-toolbar" data-testid={`${tid}-toolbar`}>
      {children ? <div className="ma2-table-toolbar-actions">{children}</div> : null}
      <div className="ma2-search">
        <Search className="w-3.5 h-3.5" aria-hidden="true" />
        <input type="search" className="ma2-input" value={dt.search}
          onChange={e => dt.setSearch(e.target.value)}
          placeholder={placeholder} aria-label={placeholder}
          data-testid={`${tid}-search`} />
      </div>
    </div>
  );
}

/**
 * Sortable `<th>`. `aria-sort` is what a screen reader announces, so it tracks
 * the real state instead of relying on the arrow glyphs alone.
 */
export function Ma2SortableTh({ dt, field, children, className = '' }) {
  const active = dt.sortKey === field;
  const dir = active ? dt.sortDir : null;
  return (
    <th scope="col"
      className={`ma2-th-sort ${className}`}
      onClick={() => dt.toggleSort(field)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dt.toggleSort(field); } }}
      tabIndex={0} role="columnheader"
      aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      data-testid={`th-${field}`}>
      <span className="ma2-th-inner">
        {children}
        <span className="ma2-sort-ind" aria-hidden="true">
          <ChevronUp className={`w-3 h-3 ${active && dir === 'asc' ? 'is-active' : ''}`} />
          <ChevronDown className={`w-3 h-3 ${active && dir === 'desc' ? 'is-active' : ''}`} />
        </span>
      </span>
    </th>
  );
}

/** Plain (non-sortable) header cell — keeps padding identical to the sortable one. */
export function Ma2Th({ children, className = '' }) {
  return <th scope="col" className={className}>{children}</th>;
}

// Page numbers with ellipses around the current page (first/last always shown).
function pageRange(cur, last) {
  const pages = [];
  const push = n => { if (n >= 1 && n <= last && !pages.includes(n)) pages.push(n); };
  push(1);
  for (let i = cur - 1; i <= cur + 1; i++) push(i);
  push(last);
  pages.sort((a, b) => a - b);

  const out = [];
  let prev = 0;
  for (const p of pages) {
    if (p - prev > 1) out.push({ ellipsis: true, key: `e${p}` });
    out.push({ page: p, key: `p${p}` });
    prev = p;
  }
  return out;
}

export function Ma2Pagination({ dt, testId }) {
  const tid = testId || 'ma2-table';
  if (dt.totalPages <= 1) return null;
  const cur = dt.page;
  const last = dt.totalPages;

  return (
    <nav className="ma2-pagination" aria-label="Pagination" data-testid={`${tid}-pagination`}>
      <button className="ma2-page-btn ma2-page-nav" onClick={() => dt.setPage(cur - 1)}
        disabled={cur === 1} data-testid={`${tid}-page-prev`}>Previous</button>

      {pageRange(cur, last).map(item => item.ellipsis
        ? <span key={item.key} className="ma2-page-ellipsis" aria-hidden="true">…</span>
        : (
          <button key={item.key} className={`ma2-page-btn ${item.page === cur ? 'is-active' : ''}`}
            onClick={() => dt.setPage(item.page)}
            aria-current={item.page === cur ? 'page' : undefined}
            aria-label={`Page ${item.page}`}
            data-testid={`${tid}-page-${item.page}`}>{item.page}</button>
        ))}

      <button className="ma2-page-btn ma2-page-nav" onClick={() => dt.setPage(cur + 1)}
        disabled={cur === last} data-testid={`${tid}-page-next`}>Next</button>
    </nav>
  );
}

/** Shown when a search filters everything out (distinct from the never-had-data state). */
export function Ma2NoResults({ query, onClear, testId = 'ma2-no-results' }) {
  return (
    <div className="ma2-empty" data-testid={testId}>
      <div className="ma2-empty-icon"><Search className="w-5 h-5" /></div>
      <p className="ma2-empty-title">No matches for “{query}”</p>
      <p className="ma2-empty-text">Try a shorter term, or clear the search to see every row.</p>
      <button className="ma2-btn ma2-btn-light ma2-btn-sm mt-3" onClick={onClear}>Clear search</button>
    </div>
  );
}
