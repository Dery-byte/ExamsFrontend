import { useEffect, useState } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ScrollText, Search, X, RotateCcw, ChevronLeft, ChevronRight, Loader2, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';
import { devGetAuditLogs, devGetAuditActions, getAuditLogAccess, setAuditLogAccess } from '../../../api/endpoints';
import { PanelHeader, PanelLoading, PanelError, useNow, relativeTime, fullDate, apiMessage } from './ui';

const ROLE_LABEL: Record<string, string> = { SUPER_ADMIN: 'Super Admin', ADMIN: 'HOD', LECTURER: 'Lecturer', DEVELOPER: 'Developer' };
const PAGE_SIZE = 50;
const EMPTY = { actor: '', action: '', role: '', from: '', to: '' };

/** The full audit trail, plus the switch that decides whether the Super Admin can see it too. */
export default function AuditPanel() {
  return (
    <section>
      <PanelHeader
        title="Audit log"
        description="Every change made by staff and developers: who did what, when, and whether it worked."
      />
      <AccessCard />
      <AuditTable />
    </section>
  );
}

function AccessCard() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['dev-audit-access'], queryFn: getAuditLogAccess });
  const [saving, setSaving] = useState(false);
  const on = q.data?.superAdminVisible ?? false;

  const toggle = async () => {
    setSaving(true);
    try {
      const r = await setAuditLogAccess(!on);
      qc.setQueryData(['dev-audit-access'], r);
      qc.invalidateQueries({ queryKey: ['dev-audit'] });   // the change itself is audited
      toast.success(r.superAdminVisible ? 'The Super Admin can now see the audit log' : 'The audit log is now hidden from the Super Admin');
    } catch (err) { toast.error(apiMessage(err, 'Could not change access')); }
    finally { setSaving(false); }
  };

  return (
    <div className="dd-card dd-access">
      {q.isLoading ? <PanelLoading label="Loading access" />
        : q.isError ? <PanelError message="Could not load the Super Admin's access." onRetry={() => q.refetch()} />
        : (
          <>
            <span className={`dd-access-icon${on ? ' is-on' : ''}`} aria-hidden>{on ? <Eye size={18} /> : <EyeOff size={18} />}</span>
            <div className="dd-access-text">
              <strong id="dd-access-label">Super Admin can see the audit log</strong>
              <span>{on
                ? 'The Audit Log appears in the Super Admin menu.'
                : 'Hidden: the menu entry is gone and the Super Admin’s audit endpoints refuse requests. You still see everything here.'}</span>
            </div>
            <button type="button" role="switch" aria-checked={on} aria-labelledby="dd-access-label"
              className={`dd-switch${on ? ' is-on' : ''}`} onClick={toggle} disabled={saving}>
              <span className="dd-switch-knob">{saving && <Loader2 size={11} className="dd-spin" />}</span>
            </button>
          </>
        )}
    </div>
  );
}

function AuditTable() {
  const [draftActor, setDraftActor] = useState('');
  const [filters, setFilters] = useState(EMPTY);
  const [page, setPage] = useState(0);
  const now = useNow(30_000);

  // Debounce the free-text person search
  useEffect(() => {
    const t = setTimeout(() => { setFilters(f => ({ ...f, actor: draftActor })); setPage(0); }, 350);
    return () => clearTimeout(t);
  }, [draftActor]);

  const actions = useQuery({ queryKey: ['dev-audit', 'actions'], queryFn: devGetAuditActions });
  const logs = useQuery({
    queryKey: ['dev-audit', 'logs', filters, page],
    queryFn: () => devGetAuditLogs({ ...filters, page, size: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  const setFilter = (k: keyof typeof EMPTY, v: string) => { setFilters(f => ({ ...f, [k]: v })); setPage(0); };
  const reset = () => { setDraftActor(''); setFilters(EMPTY); setPage(0); };
  const filtered = draftActor !== '' || Object.values(filters).some(v => v !== '');

  const data = logs.data;
  const items = data?.items ?? [];

  return (
    <>
      <div className="dd-toolbar dd-audit-toolbar">
        <div className="dd-search">
          <Search size={15} aria-hidden />
          <input type="search" value={draftActor} onChange={e => setDraftActor(e.target.value)}
            placeholder="Search by person…" aria-label="Search by person" />
          {draftActor && <button onClick={() => setDraftActor('')} aria-label="Clear search"><X size={14} /></button>}
        </div>
        <select className="dd-select" value={filters.action} onChange={e => setFilter('action', e.target.value)} aria-label="Action">
          <option value="">All actions</option>
          {(actions.data ?? []).map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select className="dd-select" value={filters.role} onChange={e => setFilter('role', e.target.value)} aria-label="Role">
          <option value="">All roles</option>
          {Object.entries(ROLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <label className="dd-date">
          <span>From</span>
          <input type="date" className="dd-select" value={filters.from} max={filters.to || undefined}
            onChange={e => setFilter('from', e.target.value)} aria-label="From date" />
        </label>
        <label className="dd-date">
          <span>To</span>
          <input type="date" className="dd-select" value={filters.to} min={filters.from || undefined}
            onChange={e => setFilter('to', e.target.value)} aria-label="To date" />
        </label>
        <button type="button" className="dd-btn" onClick={reset} disabled={!filtered}><RotateCcw size={14} /> Reset</button>
      </div>

      {logs.isLoading ? <PanelLoading label="Loading audit log" />
        : logs.isError ? <PanelError message="Could not load the audit log." onRetry={() => logs.refetch()} />
        : items.length === 0 ? (
          <div className="dd-emptystate">
            <ScrollText size={28} />
            <strong>No matching activity</strong>
            {filtered ? <button className="dd-link" onClick={reset}>Clear filters</button> : <span>Nothing has been recorded yet.</span>}
          </div>
        ) : (
          <>
            <p className="dd-count-line">
              {data!.totalItems.toLocaleString()} entr{data!.totalItems === 1 ? 'y' : 'ies'}
              {logs.isFetching && <Loader2 size={13} className="dd-spin" />}
            </p>
            <div className="dd-card dd-audit-card">
              <table className="dd-audit">
                <thead>
                  <tr><th>When</th><th>Who</th><th>Action</th><th>Result</th><th>Details</th></tr>
                </thead>
                <tbody style={{ opacity: logs.isFetching ? 0.6 : 1 }}>
                  {items.map(e => {
                    const ok = e.statusCode != null && e.statusCode < 400;
                    return (
                      <tr key={e.id}>
                        <td className="dd-a-when" data-label="When">
                          <time dateTime={e.createdAt} title={fullDate(e.createdAt)}>{relativeTime(e.createdAt, now)}</time>
                          <span className="dd-muted-sm">{fullDate(e.createdAt)}</span>
                        </td>
                        <td className="dd-a-who">
                          <strong className="dd-ellipsis">{e.actorName ?? '–'}</strong>
                          <span className="dd-muted-sm">{ROLE_LABEL[e.actorRole ?? ''] ?? e.actorRole}</span>
                        </td>
                        <td className="dd-a-action" data-label="Action">
                          {e.action}{e.entityId && <span className="dd-muted-sm"> · #{e.entityId}</span>}
                        </td>
                        <td className="dd-a-result">
                          <span className={`dd-pill dd-pill-${ok ? 'ok' : 'bad'}`}>
                            {ok ? <CheckCircle2 size={13} /> : <XCircle size={13} />} {ok ? 'Succeeded' : `Failed (${e.statusCode ?? '?'})`}
                          </span>
                        </td>
                        <td className="dd-a-details" data-label="Details">
                          {e.details && <div className="dd-a-detail-text" title={e.details}>{e.details}</div>}
                          <div className="dd-mono dd-a-path" title={e.path}>{e.httpMethod} {e.path}</div>
                          {e.ipAddress && <span className="dd-muted-sm">IP {e.ipAddress}</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {data!.totalPages > 1 && (
              <div className="dd-pager">
                <span>Page {data!.page + 1} of {data!.totalPages}</span>
                <span className="dd-pager-btns">
                  <button className="dd-btn dd-btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} aria-label="Previous page"><ChevronLeft size={15} /></button>
                  <button className="dd-btn dd-btn-sm" disabled={page + 1 >= data!.totalPages} onClick={() => setPage(p => p + 1)} aria-label="Next page"><ChevronRight size={15} /></button>
                </span>
              </div>
            )}
          </>
        )}
    </>
  );
}
