import { useEffect, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { ScrollText, Search, Loader2, CheckCircle2, XCircle, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { saGetAuditActions, saGetAuditLogs } from '../../api/endpoints';

const ROLE_LABEL: Record<string, string> = { SUPER_ADMIN: 'Super Admin', ADMIN: 'HOD', LECTURER: 'Lecturer' };
const PAGE_SIZE = 50;
const EMPTY = { actor: '', action: '', role: '', from: '', to: '' };

/** Super Admin: who changed what, and when (the developer's own activity is not included). */
export default function AuditLog() {
  const [draftActor, setDraftActor] = useState('');
  const [filters, setFilters] = useState(EMPTY);
  const [page, setPage] = useState(0);

  // Debounce the free-text actor search
  useEffect(() => {
    const t = setTimeout(() => { setFilters(f => ({ ...f, actor: draftActor })); setPage(0); }, 350);
    return () => clearTimeout(t);
  }, [draftActor]);

  const actions = useQuery({ queryKey: ['audit', 'actions'], queryFn: saGetAuditActions });
  const logs = useQuery({
    queryKey: ['audit', 'logs', filters, page],
    queryFn: () => saGetAuditLogs({ ...filters, page, size: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  const setFilter = (k: keyof typeof EMPTY, v: string) => { setFilters(f => ({ ...f, [k]: v })); setPage(0); };
  const reset = () => { setDraftActor(''); setFilters(EMPTY); setPage(0); };
  const filtered = draftActor !== '' || Object.values(filters).some(v => v !== '');

  const data = logs.data;
  const items = data?.items ?? [];

  return (
    <div className="al" style={{ paddingBottom: 40 }}>
      <PageHeader title="Audit Log" breadcrumbs={['Super Admin', 'Audit Log']} />

      <div className="al-card">
        {/* Filters: one row above the table */}
        <div className="al-filters">
          <div className="al-search">
            <Search size={14} />
            <input aria-label="Search by person" className="al-input" placeholder="Search by person…"
              value={draftActor} onChange={e => setDraftActor(e.target.value)} />
          </div>
          <select aria-label="Action" className="al-input al-sel" value={filters.action} onChange={e => setFilter('action', e.target.value)}>
            <option value="">All actions</option>
            {(actions.data ?? []).map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select aria-label="Role" className="al-input al-sel" value={filters.role} onChange={e => setFilter('role', e.target.value)}>
            <option value="">All roles</option>
            {Object.entries(ROLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <label className="al-date">
            <span>From</span>
            <input aria-label="From date" type="date" className="al-input" value={filters.from} max={filters.to || undefined} onChange={e => setFilter('from', e.target.value)} />
          </label>
          <label className="al-date">
            <span>To</span>
            <input aria-label="To date" type="date" className="al-input" value={filters.to} min={filters.from || undefined} onChange={e => setFilter('to', e.target.value)} />
          </label>
          <button type="button" onClick={reset} className="al-reset" title="Clear filters" disabled={!filtered}><RotateCcw size={14} /> Reset</button>
        </div>

        <div className="al-table-wrap">
          <table className="al-table">
            <thead>
              <tr><th>When</th><th>Who</th><th>Action</th><th>Record</th><th>Result</th></tr>
            </thead>
            <tbody style={{ opacity: logs.isFetching && !logs.isLoading ? 0.6 : 1, transition: 'opacity .15s' }}>
              {logs.isLoading ? (
                <tr className="al-msg"><td colSpan={5}><Loader2 size={22} color="#5156be" className="al-spin" /></td></tr>
              ) : logs.isError ? (
                <tr className="al-msg"><td colSpan={5}>
                  <XCircle size={28} color="#e34948" style={{ marginBottom: 6 }} />
                  <div style={{ fontWeight: 700, color: '#1e293b' }}>Couldn't load the audit log</div>
                  <button type="button" className="al-link" onClick={() => logs.refetch()}>Try again</button>
                </td></tr>
              ) : items.length === 0 ? (
                <tr className="al-msg"><td colSpan={5}>
                  <ScrollText size={30} style={{ marginBottom: 6 }} /><div style={{ fontWeight: 700 }}>No matching activity</div>
                  {filtered && <button type="button" className="al-link" onClick={reset}>Clear filters</button>}
                </td></tr>
              ) : items.map(e => {
                const ok = e.statusCode != null && e.statusCode < 400;
                const when = new Date(e.createdAt);
                return (
                  <tr key={e.id}>
                    <td className="al-c-when" data-label="When">
                      <time dateTime={e.createdAt}>{when.toLocaleString()}</time>
                    </td>
                    <td className="al-c-who">
                      <div className="al-who">{e.actorName ?? '—'}</div>
                      <div className="al-role">{ROLE_LABEL[e.actorRole ?? ''] ?? e.actorRole}</div>
                    </td>
                    <td className="al-c-action" data-label="Action">{e.action}</td>
                    <td className="al-c-record" data-label="Record">{e.entityId ? `#${e.entityId}` : '—'}</td>
                    <td className="al-c-result">
                      <span className="al-status" style={{ color: ok ? '#0b7a0b' : '#b42323', background: ok ? '#eefbee' : '#fdeeee' }}>
                        {ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />} {ok ? 'Succeeded' : `Failed (${e.statusCode ?? '?'})`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {data && data.totalItems > 0 && (
          <div className="al-pager">
            <span>{data.totalPages > 1 ? `Page ${data.page + 1} of ${data.totalPages} · ` : ''}{data.totalItems.toLocaleString()} entr{data.totalItems === 1 ? 'y' : 'ies'}</span>
            {data.totalPages > 1 && (
              <div className="al-pager-btns">
                <button type="button" disabled={page === 0} onClick={() => setPage(p => p - 1)} aria-label="Previous page"><ChevronLeft size={16} /></button>
                <button type="button" disabled={page + 1 >= data.totalPages} onClick={() => setPage(p => p + 1)} aria-label="Next page"><ChevronRight size={16} /></button>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .al { container: al / inline-size; }
        .al-card { background: #fff; border: 1.5px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 2px 16px rgba(0,0,0,0.06); }
        .al-filters { display: flex; flex-wrap: wrap; gap: 8px; padding: 12px 14px; border-bottom: 1px solid #f1f5f7; align-items: center; }
        .al-input { height: 36px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 13px; padding: 0 10px; background: #f8fafc; outline: none; color: #1e293b; width: 100%; min-width: 0; box-sizing: border-box; font-family: inherit; transition: border-color .15s, box-shadow .15s; }
        .al-input:focus { border-color: #5156be; box-shadow: 0 0 0 3px rgba(81,86,190,0.15); background: #fff; }
        .al-search { position: relative; flex: 1 1 200px; min-width: 0; }
        .al-search svg { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #adb5bd; pointer-events: none; }
        .al-search .al-input { padding-left: 30px; }
        .al-sel { width: auto; flex: 0 1 170px; }
        .al-date { display: flex; align-items: center; gap: 6px; flex: 0 1 190px; min-width: 0; font-size: 12px; font-weight: 600; color: #64748b; }
        .al-date > span { flex-shrink: 0; }
        .al-reset { display: inline-flex; align-items: center; justify-content: center; gap: 5px; height: 36px; padding: 0 12px; border-radius: 8px; border: 1.5px solid #e2e8f0; background: #fff; color: #475569; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; }
        .al-reset:hover:not(:disabled) { background: #f8fafc; border-color: #cbd5e1; }
        .al-reset:disabled { opacity: .5; cursor: default; }
        .al-link { background: none; border: none; padding: 0; margin-top: 6px; color: #5156be; font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }
        .al-table-wrap { overflow-x: auto; }
        .al-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .al-table th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; padding: 10px 14px; background: #f8fafc; border-bottom: 1px solid #eef0f4; white-space: nowrap; }
        .al-table td { padding: 10px 14px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
        .al-table tbody tr:not(.al-msg):hover td { background: #fafbff; }
        .al-msg td { text-align: center; padding: 44px 16px; color: #94a3b8; }
        .al-c-when { white-space: nowrap; color: #475569; }
        .al-who { font-weight: 700; color: #1e293b; }
        .al-role { font-size: 11px; color: #94a3b8; }
        .al-c-action { font-weight: 600; color: #1e293b; }
        .al-c-record { color: #64748b; }
        .al-status { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; font-weight: 700; padding: 3px 8px; border-radius: 6px; white-space: nowrap; }
        .al-pager { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 10px 14px; font-size: 12.5px; color: #64748b; flex-wrap: wrap; border-top: 1px solid #f1f5f9; }
        .al-pager-btns { display: flex; gap: 6px; }
        .al-pager button { width: 32px; height: 32px; border-radius: 8px; border: 1.5px solid #e2e8f0; background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #334155; }
        .al-pager button:disabled { opacity: 0.4; cursor: not-allowed; }
        .al-spin { animation: al-spin 1s linear infinite; }
        @keyframes al-spin { to { transform: rotate(360deg); } }

        /* Narrow content area: each entry becomes a card (browsers without container queries keep the scrolling table) */
        @container al (max-width: 760px) {
          .al-table thead { display: none; }
          .al-table, .al-table tbody { display: block; }
          .al-table tr { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px 12px; padding: 14px; border-bottom: 1px solid #f1f5f9; }
          .al-table tr.al-msg { display: block; }
          .al-table tr:last-child { border-bottom: none; }
          .al-table td { display: block; padding: 0; border: none; min-width: 0; background: none !important; }
          .al-msg td { padding: 40px 16px; }
          .al-table td[data-label]::before { content: attr(data-label); display: block; font-size: 10.5px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: #94a3b8; margin-bottom: 2px; }
          .al-c-who { order: 1; }
          .al-c-result { order: 2; justify-self: end; }
          .al-c-action { order: 3; grid-column: 1 / -1; overflow-wrap: anywhere; }
          .al-c-when { order: 4; white-space: normal; }
          .al-c-record { order: 5; text-align: right; }
        }
        @container al (max-width: 560px) {
          .al-filters { padding: 12px; }
          .al-search { flex-basis: 100%; }
          .al-sel { flex: 1 1 140px; }
          .al-date { flex: 1 1 140px; flex-direction: column; align-items: stretch; gap: 3px; }
          .al-reset { flex: 1 1 100%; }
          .al-pager { justify-content: center; text-align: center; }
          .al-pager > span { flex-basis: 100%; }
        }
        @media (max-width: 640px) {
          /* 16px stops iOS Safari zooming into a field when it gets focus */
          .al-input { font-size: 16px; }
        }
        @media (pointer: coarse) {
          .al-input, .al-reset { height: 44px; }
          .al-pager button { width: 44px; height: 44px; }
        }
      `}</style>
    </div>
  );
}
