import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { CheckCircle2, ChevronDown, Search, Trash2, RotateCcw, Check, Loader2, X } from 'lucide-react';
import { getErrorEvents, setErrorResolved, clearResolvedErrors } from '../../../api/endpoints';
import { PanelHeader, PanelLoading, PanelError, CopyButton, useNow, relativeTime, fullDate, apiMessage } from './ui';

type Filter = 'open' | 'resolved' | 'all';
type Source = 'ALL' | 'SERVER' | 'BACKGROUND' | 'BROWSER';

const FILTERS: [Filter, string][] = [['open', 'Open'], ['resolved', 'Resolved'], ['all', 'All']];
const SOURCES: [Source, string][] = [['ALL', 'All sources'], ['SERVER', 'Server'], ['BACKGROUND', 'Background'], ['BROWSER', 'Browser']];

/** Grouped server, job and browser errors with triage actions. */
export default function ErrorsPanel() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>('open');
  const [source, setSource] = useState<Source>('ALL');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const now = useNow(30_000);
  const q = useQuery({ queryKey: ['dev-errors', filter], queryFn: () => getErrorEvents(filter), refetchInterval: 60_000 });

  const rows: any[] = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (q.data ?? []).filter((e: any) =>
      (source === 'ALL' || e.source === source)
      && (!term || [e.location, e.message, e.type, e.lastUser].some(v => v && String(v).toLowerCase().includes(term))));
  }, [q.data, source, search]);
  const occurrences = rows.reduce((n, e) => n + (e.occurrences ?? 0), 0);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['dev-errors'] });
    qc.invalidateQueries({ queryKey: ['dev-health'] });
  };

  const toggle = async (e: any) => {
    setBusy(e.id);
    try {
      await setErrorResolved(e.id, !e.resolved);
      toast.success(e.resolved ? 'Reopened' : 'Marked resolved');
      refresh();
    } catch (err) { toast.error(apiMessage(err, 'Could not update')); }
    finally { setBusy(null); }
  };

  const clear = async () => {
    const res = await Swal.fire({
      title: 'Delete all resolved errors?', text: 'This cannot be undone.', icon: 'warning',
      showCancelButton: true, confirmButtonText: 'Delete', confirmButtonColor: '#b91c1c',
    });
    if (!res.isConfirmed) return;
    try { const r = await clearResolvedErrors(); toast.success(`Deleted ${r.deleted}`); refresh(); }
    catch (err) { toast.error(apiMessage(err, 'Could not delete')); }
  };

  return (
    <section>
      <PanelHeader
        title="Errors"
        description="Server errors (HTTP 5xx), failed background jobs and browser crashes, grouped by where they happen."
        actions={filter !== 'open' && (
          <button className="dd-btn dd-btn-danger" onClick={clear}><Trash2 size={14} /> Delete resolved</button>
        )}
      />

      <div className="dd-toolbar">
        <div className="dd-seg" role="tablist" aria-label="Status">
          {FILTERS.map(([k, l]) => (
            <button key={k} role="tab" aria-selected={filter === k} className={filter === k ? 'on' : ''}
              onClick={() => { setFilter(k); setExpanded(null); }}>{l}</button>
          ))}
        </div>
        <div className="dd-search">
          <Search size={15} aria-hidden />
          <input type="search" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search location, message, user…" aria-label="Search errors" />
          {search && <button onClick={() => setSearch('')} aria-label="Clear search"><X size={14} /></button>}
        </div>
        <select className="dd-select" value={source} onChange={e => setSource(e.target.value as Source)} aria-label="Source">
          {SOURCES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>

      {q.isLoading ? <PanelLoading label="Loading errors" />
        : q.isError ? <PanelError message="Could not load errors." onRetry={() => q.refetch()} />
        : rows.length === 0 ? (
          <div className="dd-emptystate">
            <CheckCircle2 size={28} />
            <strong>{(q.data ?? []).length ? 'No errors match these filters' : filter === 'open' ? 'No open errors' : 'Nothing here'}</strong>
            <span>{(q.data ?? []).length ? 'Try a different search or source.' : filter === 'open' ? 'Everything reported so far is resolved.' : 'No errors in this view.'}</span>
          </div>
        ) : (
          <>
            <p className="dd-count-line">
              {rows.length} group{rows.length === 1 ? '' : 's'} · {occurrences.toLocaleString()} occurrence{occurrences === 1 ? '' : 's'}
              {q.isFetching && <Loader2 size={13} className="dd-spin" />}
            </p>
            <ul className="dd-errs">
              {rows.map(e => {
                const isOpen = expanded === e.id;
                return (
                  <li key={e.id} className={`dd-err dd-err-${e.source.toLowerCase()}${e.resolved ? ' is-resolved' : ''}`}>
                    <div className="dd-err-top">
                      <div className="dd-err-tags">
                        <span className={`dd-src dd-src-${e.source.toLowerCase()}`}>{e.source.toLowerCase()}</span>
                        {e.httpStatus && <span className="dd-src dd-src-http">HTTP {e.httpStatus}</span>}
                        {e.resolved && <span className="dd-tag dd-tag-ok">Resolved</span>}
                      </div>
                      <span className="dd-err-count" title={`${e.occurrences} occurrences`}>{e.occurrences.toLocaleString()}×</span>
                    </div>
                    <div className="dd-err-loc dd-mono">{e.location}</div>
                    <p className={`dd-err-msg${isOpen ? '' : ' is-clamped'}`}>{e.message}</p>
                    <div className="dd-err-foot">
                      <span className="dd-err-meta">
                        <span title={fullDate(e.lastSeen)}>Last {relativeTime(e.lastSeen, now)}</span>
                        <span title={fullDate(e.firstSeen)}>First {relativeTime(e.firstSeen, now)}</span>
                        {e.lastUser && <span className="dd-ellipsis">by {e.lastUser}</span>}
                      </span>
                      <span className="dd-err-actions">
                        <button className="dd-btn dd-btn-sm dd-btn-quiet" onClick={() => setExpanded(isOpen ? null : e.id)}
                          aria-expanded={isOpen} aria-controls={`err-${e.id}`}>
                          <ChevronDown size={14} className={`dd-chev${isOpen ? ' is-open' : ''}`} /> {isOpen ? 'Hide' : 'Details'}
                        </button>
                        <button className="dd-btn dd-btn-sm" onClick={() => toggle(e)} disabled={busy === e.id}>
                          {busy === e.id ? <Loader2 size={13} className="dd-spin" /> : e.resolved ? <RotateCcw size={13} /> : <Check size={13} />}
                          {e.resolved ? 'Reopen' : 'Resolve'}
                        </button>
                      </span>
                    </div>
                    {isOpen && (
                      <div className="dd-err-detail" id={`err-${e.id}`}>
                        <dl className="dd-kv">
                          <div><dt>Type</dt><dd className="dd-mono">{e.type ?? '–'}</dd></div>
                          <div><dt>First seen</dt><dd>{fullDate(e.firstSeen)}</dd></div>
                          <div><dt>Last seen</dt><dd>{fullDate(e.lastSeen)}</dd></div>
                        </dl>
                        {e.stack ? (
                          <div className="dd-stack-wrap">
                            <div className="dd-stack-bar"><span>Stack trace</span><CopyButton text={e.stack} /></div>
                            <pre className="dd-stack">{e.stack}</pre>
                          </div>
                        ) : <p className="dd-empty-sm">No stack trace (the controller handled the error itself).</p>}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
    </section>
  );
}
