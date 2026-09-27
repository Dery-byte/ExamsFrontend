import { useEffect, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { ScrollText, Search, Loader2, CheckCircle2, XCircle, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { saGetAuditActions, saGetAuditLogs } from '../../api/endpoints';

const ROLE_LABEL: Record<string, string> = { SUPER_ADMIN: 'Super Admin', ADMIN: 'HOD', LECTURER: 'Lecturer' };
const PAGE_SIZE = 50;
const EMPTY = { actor: '', action: '', role: '', from: '', to: '' };

/** Super Admin: who changed what, and when. */
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

  const data = logs.data;
  const items = data?.items ?? [];

  return (
    <div style={{ paddingBottom: 40 }}>
      <PageHeader title="Audit Log" breadcrumbs={['Super Admin', 'Audit Log']} />

      <div className="al-card">
        {/* Filters: one row above the table */}
        <div className="al-filters">
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
            <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#adb5bd' }} />
            <input aria-label="Search by person" className="al-input" style={{ paddingLeft: 28 }} placeholder="Search by person…"
              value={draftActor} onChange={e => setDraftActor(e.target.value)} />
          </div>
          <select aria-label="Action" className="al-input" value={filters.action} onChange={e => setFilter('action', e.target.value)}>
            <option value="">All actions</option>
            {(actions.data ?? []).map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select aria-label="Role" className="al-input" value={filters.role} onChange={e => setFilter('role', e.target.value)}>
            <option value="">All roles</option>
            {Object.entries(ROLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <input aria-label="From date" type="date" className="al-input" value={filters.from} onChange={e => setFilter('from', e.target.value)} />
          <input aria-label="To date" type="date" className="al-input" value={filters.to} onChange={e => setFilter('to', e.target.value)} />
          <button onClick={reset} className="al-reset" title="Clear filters"><RotateCcw size={14} /> Reset</button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="al-table">
            <thead>
              <tr><th>When</th><th>Who</th><th>Action</th><th>Record</th><th>Result</th><th>Details</th></tr>
            </thead>
            <tbody>
              {logs.isLoading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 36 }}><Loader2 size={22} color="#5156be" className="al-spin" /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '44px 16px', color: '#94a3b8' }}>
                  <ScrollText size={30} style={{ marginBottom: 6 }} /><div style={{ fontWeight: 700 }}>No matching activity</div>
                </td></tr>
              ) : items.map(e => {
                const ok = e.statusCode != null && e.statusCode < 400;
                return (
                  <tr key={e.id}>
                    <td style={{ whiteSpace: 'nowrap', color: '#475569' }}>{new Date(e.createdAt).toLocaleString()}</td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#1e293b' }}>{e.actorName ?? '—'}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{ROLE_LABEL[e.actorRole ?? ''] ?? e.actorRole}</div>
                    </td>
                    <td style={{ fontWeight: 600, color: '#1e293b' }}>{e.action}</td>
                    <td style={{ color: '#64748b' }}>{e.entityId ? `#${e.entityId}` : '—'}</td>
                    <td>
                      <span className="al-status" style={{ color: ok ? '#0b7a0b' : '#b42323', background: ok ? '#eefbee' : '#fdeeee' }}>
                        {ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />} {ok ? 'Succeeded' : `Failed (${e.statusCode ?? '?'})`}
                      </span>
                    </td>
                    <td style={{ maxWidth: 280, color: '#64748b', fontSize: 12 }}>
                      <div title={e.path} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.details || e.path}</div>
                      {e.ipAddress && <div style={{ fontSize: 11, color: '#94a3b8' }}>IP {e.ipAddress}</div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {data && data.totalPages > 1 && (
          <div className="al-pager">
            <span>Page {data.page + 1} of {data.totalPages} · {data.totalItems.toLocaleString()} entries</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)} aria-label="Previous page"><ChevronLeft size={16} /></button>
              <button disabled={page + 1 >= data.totalPages} onClick={() => setPage(p => p + 1)} aria-label="Next page"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .al-card { background: #fff; border: 1.5px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 2px 16px rgba(0,0,0,0.06); }
        .al-filters { display: flex; flex-wrap: wrap; gap: 8px; padding: 12px 14px; border-bottom: 1px solid #f1f5f7; }
        .al-input { height: 36px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 13px; padding: 0 10px; background: #f8fafc; outline: none; color: #1e293b; width: 100%; box-sizing: border-box; font-family: inherit; }
        .al-filters > select, .al-filters > input { width: auto; flex: 0 1 170px; }
        .al-reset { display: flex; align-items: center; gap: 5px; height: 36px; padding: 0 12px; border-radius: 8px; border: 1.5px solid #e2e8f0; background: #fff; color: #475569; font-size: 13px; font-weight: 600; cursor: pointer; }
        .al-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .al-table th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; padding: 10px 14px; background: #f8fafc; border-bottom: 1px solid #eef0f4; white-space: nowrap; }
        .al-table td { padding: 10px 14px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
        .al-table tbody tr:hover td { background: #fafbff; }
        .al-status { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; font-weight: 700; padding: 3px 8px; border-radius: 6px; white-space: nowrap; }
        .al-pager { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 10px 14px; font-size: 12.5px; color: #64748b; flex-wrap: wrap; }
        .al-pager button { width: 32px; height: 32px; border-radius: 8px; border: 1.5px solid #e2e8f0; background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #334155; }
        .al-pager button:disabled { opacity: 0.4; cursor: not-allowed; }
        .al-spin { animation: al-spin 1s linear infinite; }
        @keyframes al-spin { to { transform: rotate(360deg); } }
        @media (max-width: 600px) { .al-filters > select, .al-filters > input, .al-reset { flex: 1 1 100%; } }
      `}</style>
    </div>
  );
}
