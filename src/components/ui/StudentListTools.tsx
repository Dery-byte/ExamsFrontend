import { Search, X, ArrowUpDown } from 'lucide-react';
import { STUDENT_SORT_OPTIONS, type StudentSort } from '../../utils/studentListSort';
import { tx } from '../../utils/terms';

/**
 * Search box (name or index number) and sort list for a staff list of students, with a "showing
 * N of M" count while a search is on. `firstOption` is the list's own order, shown first.
 */
export default function StudentListTools({
  id, search, onSearch, sort, onSort, shown, total, firstOption,
}: {
  /** Unique per list on the page (Quiz Review has one list per quiz). */
  id: string;
  search: string;
  onSearch: (v: string) => void;
  sort: StudentSort | '';
  onSort: (v: StudentSort | '') => void;
  shown: number;
  total: number;
  /** Label of the list's own order (value ''); leave out when the list has none. */
  firstOption?: string;
}) {
  return (
    <div className="slt" onClick={e => e.stopPropagation()}>
      <div className="slt-search">
        <label htmlFor={`${id}-search`} className="slt-label">{tx('Search student')}</label>
        <Search size={15} className="slt-search-icon" aria-hidden="true" />
        <input
          id={`${id}-search`}
          type="search"
          className="slt-input"
          placeholder="Name or index number…"
          value={search}
          onChange={e => onSearch(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        {search && (
          <button type="button" className="slt-clear" onClick={() => onSearch('')} aria-label="Clear search"><X size={14} /></button>
        )}
      </div>
      <div className="slt-sort">
        <label htmlFor={`${id}-sort`} className="slt-label"><ArrowUpDown size={12} aria-hidden="true" /> Sort by</label>
        <select id={`${id}-sort`} className="slt-input slt-select" value={sort} onChange={e => onSort(e.target.value as StudentSort | '')}>
          {firstOption && <option value="">{firstOption}</option>}
          {STUDENT_SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      {search.trim() && (
        <div className="slt-count" role="status" aria-live="polite">
          {shown === 0 ? 'No match' : `Showing ${shown} of ${total}`}
        </div>
      )}
      <style>{`
        .slt { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 10px 12px; }
        .slt-search { position: relative; flex: 1 1 240px; min-width: 0; }
        .slt-sort { flex: 0 1 230px; min-width: 0; }
        .slt-label { display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 5px; text-transform: uppercase; letter-spacing: .03em; }
        .slt-input { width: 100%; box-sizing: border-box; height: 38px; border-radius: 8px; border: 1.5px solid #e2e8f0; background: #fff; color: #1e293b; font: inherit; font-size: 14px; padding: 0 12px; outline: none; }
        .slt-input:focus { border-color: var(--brand); }
        .slt-search .slt-input { padding-left: 34px; padding-right: 34px; }
        /* Our own clear button only (browsers add one to search boxes too) */
        .slt-search .slt-input::-webkit-search-cancel-button { -webkit-appearance: none; appearance: none; display: none; }
        .slt-search-icon { position: absolute; left: 11px; bottom: 12px; color: #94a3b8; pointer-events: none; }
        .slt-clear { position: absolute; right: 5px; bottom: 5px; width: 28px; height: 28px; border: none; border-radius: 6px; background: transparent; color: #94a3b8; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .slt-clear:hover { background: #f1f5f9; color: #475569; }
        .slt-select { cursor: pointer; }
        .slt-count { flex-basis: 100%; font-size: 12px; font-weight: 600; color: #64748b; }
        @media (max-width: 576px) { .slt-sort { flex-basis: 100%; } .slt-input { font-size: 16px; } }
      `}</style>
    </div>
  );
}
