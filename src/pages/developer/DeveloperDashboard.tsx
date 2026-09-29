import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import {
  TerminalSquare, LogOut, Loader2, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Mail, Database,
  HardDrive, Cpu, Clock, Bug, ChevronDown, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getSystemMode, setSystemMode, getSystemHealth, getErrorEvents, setErrorResolved, clearResolvedErrors, sendTestAlert,
  getDevelopers,
} from '../../api/endpoints';
import { SYSTEM_MODES, syncMode, type SystemMode } from '../../utils/terms';

type Tab = 'mode' | 'health' | 'errors' | 'developers';

/** The developer's console: choose the system mode, watch health and errors. */
export default function DeveloperDashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<Tab>('mode');

  return (
    <div className="dd-shell">
      <header className="dd-top">
        <div className="dd-brand"><TerminalSquare size={20} /> Developer console</div>
        <div className="dd-user">
          <span>{user?.email}</span>
          <button onClick={logout} aria-label="Sign out"><LogOut size={16} /> Sign out</button>
        </div>
      </header>
      <nav className="dd-tabs" role="tablist">
        {([['mode', 'System mode'], ['health', 'Health'], ['errors', 'Errors'], ['developers', 'Developers']] as [Tab, string][]).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
        ))}
      </nav>
      <main className="dd-main">
        {tab === 'mode' && <ModePanel />}
        {tab === 'health' && <HealthPanel />}
        {tab === 'errors' && <ErrorsPanel />}
        {tab === 'developers' && <DevelopersPanel />}
      </main>
      <style>{CSS}</style>
    </div>
  );
}

// ── System mode ─────────────────────────────────────────────────────────

const PREVIEW_KEYS: [string, string][] = [
  ['level', 'Level'], ['semester', 'Semester'], ['course', 'Course'], ['lecturer', 'Lecturer'],
  ['hod', 'HOD'], ['student', 'Student'], ['program', 'Programme'], ['reportCard', 'Report'],
];

function ModePanel() {
  const q = useQuery({ queryKey: ['dev-mode'], queryFn: getSystemMode });
  const [saving, setSaving] = useState<SystemMode | null>(null);
  const current: SystemMode | undefined = q.data?.mode;

  const choose = async (mode: SystemMode) => {
    if (mode === current) return;
    const label = SYSTEM_MODES.find(m => m.value === mode)?.label;
    const res = await Swal.fire({
      title: `Switch to ${label}?`,
      html: 'Everyone will see the new wording, calendar (semesters or terms) and features the next time a page loads.'
        + '<br><br><b>Existing data is not renumbered</b>: levels such as 100/200 stay as they are, so switch on a fresh '
        + 'system or update programmes and students afterwards.',
      icon: 'warning', showCancelButton: true, confirmButtonText: 'Switch mode', confirmButtonColor: '#0f172a',
    });
    if (!res.isConfirmed) return;
    setSaving(mode);
    try {
      await setSystemMode(mode);
      syncMode(mode);
      toast.success(`System mode is now ${label}`);
      setTimeout(() => window.location.reload(), 700);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Could not change the mode');
      setSaving(null);
    }
  };

  if (q.isLoading) return <Loader2 className="dd-spin" />;
  if (q.isError) return <p className="dd-muted">Could not load the system mode.</p>;

  return (
    <section>
      <h2>System mode</h2>
      <p className="dd-muted">Choose what kind of institution this system serves. Anything that doesn't apply to the chosen mode is hidden from every user.</p>
      <div className="dd-modes">
        {SYSTEM_MODES.map((m, i) => {
          const opt = q.data.options.find((o: any) => o.value === m.value);
          const on = m.value === current;
          return (
            <button key={m.value} className={`dd-mode ${on ? 'on' : ''}`} onClick={() => choose(m.value)} disabled={!!saving} aria-pressed={on}>
              <div className="dd-mode-head">
                <span className="dd-num">{i + 1}</span>
                <strong>{m.label}</strong>
                {on && <span className="dd-badge">Current</span>}
                {saving === m.value && <Loader2 size={15} className="dd-spin" />}
              </div>
              <p>{m.description}</p>
              {opt && (
                <dl className="dd-terms">
                  {PREVIEW_KEYS.map(([k, uni]) => (
                    <div key={k}><dt>{uni}</dt><dd>{opt.terms[k]}</dd></div>
                  ))}
                  <div title="Default number of semesters (or terms) in one academic year. A programme can set its own number per level on the Programmes page.">
                    <dt>{opt.value === 'UNIVERSITY' ? 'Semesters / year' : 'Terms / year'}</dt><dd>{opt.periodsPerLevel} (default)</dd>
                  </div>
                </dl>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ── Health ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, JSX.Element]> = {
    UP: ['#047857', <CheckCircle2 size={16} />], OK: ['#047857', <CheckCircle2 size={16} />],
    CONFIGURED: ['#047857', <CheckCircle2 size={16} />],
    DEGRADED: ['#b45309', <AlertTriangle size={16} />], STALLED: ['#b45309', <AlertTriangle size={16} />],
    NOT_CONFIGURED: ['#b45309', <AlertTriangle size={16} />],
    DOWN: ['#b91c1c', <XCircle size={16} />],
  };
  const [color, icon] = map[status] ?? ['#475569', <AlertTriangle size={16} />];
  return <span className="dd-status" style={{ color }}>{icon} {status.replace('_', ' ')}</span>;
}

function HealthPanel() {
  const q = useQuery({ queryKey: ['dev-health'], queryFn: getSystemHealth, refetchInterval: 30_000 });
  const h = q.data;

  const testAlert = async () => {
    try { toast.success((await sendTestAlert()).message); }
    catch (err: any) { toast.error(err?.response?.data?.message ?? 'Could not send'); }
  };

  if (q.isLoading) return <Loader2 className="dd-spin" />;
  if (q.isError || !h) return <p className="dd-muted">Could not reach the server's health check. The server may be down.</p>;

  return (
    <section>
      <div className="dd-row">
        <h2 style={{ margin: 0 }}>System health</h2>
        <StatusBadge status={h.status} />
        <span style={{ flex: 1 }} />
        <button className="dd-ghost" onClick={() => q.refetch()} disabled={q.isFetching}>
          <RefreshCw size={14} className={q.isFetching ? 'dd-spin' : ''} /> Refresh
        </button>
      </div>
      <p className="dd-muted">Checked {new Date(h.checkedAt).toLocaleTimeString()} · refreshes every 30 seconds · mode {h.mode}</p>

      {h.problems.length > 0 && (
        <ul className="dd-problems">{h.problems.map((p: string) => <li key={p}><AlertTriangle size={14} /> {p}</li>)}</ul>
      )}

      <div className="dd-cards">
        <div className="dd-card"><h3><Database size={15} /> Database</h3><StatusBadge status={h.database.status} />
          {h.database.responseMs != null && <p>{h.database.responseMs} ms to answer</p>}</div>
        <div className="dd-card"><h3><Mail size={15} /> Email</h3><StatusBadge status={h.mail.status} />
          <p>{h.mail.host ?? 'No mail server set'}</p></div>
        <div className="dd-card"><h3><HardDrive size={15} /> Disk</h3>
          <p className="dd-big">{h.disk.freePercent ?? '-'}% free</p><p>{h.disk.freeMb} MB of {h.disk.totalMb} MB</p></div>
        <div className="dd-card"><h3><Cpu size={15} /> Memory</h3>
          <p className="dd-big">{h.memory.usedPercent}% used</p><p>{h.memory.usedMb} MB of {h.memory.maxMb} MB</p></div>
        <div className="dd-card"><h3><Clock size={15} /> Uptime</h3>
          <p className="dd-big">{formatUptime(h.uptimeMinutes)}</p><p>Since {new Date(h.startedAt).toLocaleString()}</p></div>
        <div className="dd-card"><h3><Bug size={15} /> Errors</h3>
          <p className="dd-big">{h.errors.open} open</p><p>{h.errors.openLastHour} in the last hour · {h.errors.seenLast24h} seen in 24 h</p></div>
      </div>

      <h3 className="dd-h3">Scheduled jobs</h3>
      {h.jobs.length === 0 ? <p className="dd-muted">No job has reported yet (they report within a minute of the server starting).</p> : (
        <table className="dd-table"><thead><tr><th>Job</th><th>Last run</th><th>Status</th></tr></thead>
          <tbody>{h.jobs.map((j: any) => (
            <tr key={j.name}><td>{j.name}</td><td>{new Date(j.lastRun).toLocaleString()}</td><td><StatusBadge status={j.status} /></td></tr>
          ))}</tbody></table>
      )}

      <h3 className="dd-h3">Error alerts</h3>
      <p className="dd-muted">
        {h.errors.emailAlerts
          ? <>New errors are emailed to <strong>{h.errors.alertRecipients.join(', ') || 'nobody yet (add a row to the developer_email table)'}</strong>, at most once an hour for the same error.</>
          : 'Email alerts are off or no mail server is configured; errors still appear under Errors.'}
      </p>
      <button className="dd-ghost" onClick={testAlert}><Mail size={14} /> Send a test alert</button>
      <p className="dd-muted" style={{ marginTop: 14 }}>Uptime monitors can poll <code>/api/v1/auth/status</code> (public, no details).</p>
    </section>
  );
}

function formatUptime(min: number) {
  if (min < 60) return `${min} min`;
  if (min < 60 * 24) return `${Math.floor(min / 60)} h ${min % 60} min`;
  return `${Math.floor(min / 1440)} d ${Math.floor((min % 1440) / 60)} h`;
}

// ── Developers ──────────────────────────────────────────────────────────

function DevelopersPanel() {
  const q = useQuery({ queryKey: ['dev-developers'], queryFn: getDevelopers });
  return (
    <section>
      <h2>Developers</h2>
      <p className="dd-muted">
        These addresses can sign in at <code>/developer</code> and receive error alerts. The list lives in the
        <code> developer_email</code> table and is changed only directly in the database — nobody can add or remove
        developers from the app.
      </p>
      <pre className="dd-stack" style={{ marginBottom: 14 }}>{`-- add
INSERT INTO developer_email (email, name) VALUES ('someone@example.com', 'Their Name');
-- remove (their session ends on its next request)
DELETE FROM developer_email WHERE email = 'someone@example.com';`}</pre>
      {q.isLoading ? <Loader2 className="dd-spin" /> : (
        <table className="dd-table">
          <thead><tr><th>Email</th><th>Name</th></tr></thead>
          <tbody>
            {(q.data ?? []).map((d: any) => (
              <tr key={d.email}>
                <td>{d.email}{d.you && <span className="dd-badge" style={{ marginLeft: 8 }}>You</span>}</td>
                <td>{d.name ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

// ── Errors ──────────────────────────────────────────────────────────────

function ErrorsPanel() {
  const [filter, setFilter] = useState<'open' | 'resolved' | 'all'>('open');
  const [open, setOpen] = useState<number | null>(null);
  const q = useQuery({ queryKey: ['dev-errors', filter], queryFn: () => getErrorEvents(filter), refetchInterval: 60_000 });

  const toggle = async (e: any) => {
    try {
      await setErrorResolved(e.id, !e.resolved);
      toast.success(e.resolved ? 'Reopened' : 'Marked resolved');
      q.refetch();
    } catch (err: any) { toast.error(err?.response?.data?.message ?? 'Could not update'); }
  };
  const clear = async () => {
    const res = await Swal.fire({ title: 'Delete all resolved errors?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Delete', confirmButtonColor: '#b91c1c' });
    if (!res.isConfirmed) return;
    try { const r = await clearResolvedErrors(); toast.success(`Deleted ${r.deleted}`); q.refetch(); }
    catch (err: any) { toast.error(err?.response?.data?.message ?? 'Could not delete'); }
  };

  return (
    <section>
      <div className="dd-row">
        <h2 style={{ margin: 0 }}>Errors</h2>
        <span style={{ flex: 1 }} />
        <select value={filter} onChange={e => setFilter(e.target.value as any)} aria-label="Show errors">
          <option value="open">Open</option><option value="resolved">Resolved</option><option value="all">All</option>
        </select>
        {filter !== 'open' && <button className="dd-ghost dd-danger" onClick={clear}>Delete resolved</button>}
      </div>
      <p className="dd-muted">Server errors (HTTP 5xx), failed background jobs and crashes in users' browsers, grouped by where they happen.</p>

      {q.isLoading ? <Loader2 className="dd-spin" /> : !q.data?.length ? (
        <div className="dd-empty"><CheckCircle2 size={26} /> {filter === 'open' ? 'No open errors.' : 'Nothing here.'}</div>
      ) : q.data.map((e: any) => (
        <div key={e.id} className={`dd-err ${e.resolved ? 'resolved' : ''}`}>
          <div className="dd-err-head">
            <button className="dd-expand" onClick={() => setOpen(open === e.id ? null : e.id)} aria-expanded={open === e.id}
              aria-label="Show details">{open === e.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button>
            <span className={`dd-src dd-src-${e.source.toLowerCase()}`}>{e.source}</span>
            <strong className="dd-loc">{e.location}</strong>
            <span className="dd-count">{e.occurrences}×</span>
            <button className="dd-ghost" onClick={() => toggle(e)}>{e.resolved ? 'Reopen' : 'Resolve'}</button>
          </div>
          <div className="dd-err-msg">{e.message}</div>
          <div className="dd-muted" style={{ fontSize: 12 }}>
            Last {new Date(e.lastSeen).toLocaleString()} · first {new Date(e.firstSeen).toLocaleString()}
            {e.lastUser && <> · last user {e.lastUser}</>}{e.httpStatus && <> · HTTP {e.httpStatus}</>}
          </div>
          {open === e.id && (
            <>
              <div className="dd-muted" style={{ fontSize: 12, marginTop: 6 }}>{e.type}</div>
              {e.stack ? <pre className="dd-stack">{e.stack}</pre> : <p className="dd-muted">No stack trace (the controller handled the error itself).</p>}
            </>
          )}
        </div>
      ))}
    </section>
  );
}

const CSS = `
  .dd-shell { min-height: 100vh; background: #f1f5f9; }
  .dd-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 20px; background: #0f172a; color: #e2e8f0; flex-wrap: wrap; }
  .dd-brand { display: flex; align-items: center; gap: 8px; font-weight: 800; color: #38bdf8; }
  .dd-user { display: flex; align-items: center; gap: 12px; font-size: 13px; }
  .dd-user button { display: flex; align-items: center; gap: 6px; border: 1px solid #334155; background: none; color: #e2e8f0; border-radius: 8px; padding: 6px 10px; cursor: pointer; }
  .dd-tabs { display: flex; gap: 4px; padding: 0 20px; background: #0f172a; overflow-x: auto; }
  .dd-tabs button { border: none; background: none; color: #94a3b8; padding: 10px 14px; font-weight: 700; font-size: 13.5px; cursor: pointer; border-bottom: 3px solid transparent; white-space: nowrap; }
  .dd-tabs button.on { color: #fff; border-bottom-color: #38bdf8; }
  .dd-main { max-width: 1100px; margin: 0 auto; padding: 22px 16px 60px; }
  .dd-main h2 { font-size: 19px; color: #0f172a; margin: 0 0 6px; }
  .dd-h3 { font-size: 14px; color: #0f172a; margin: 22px 0 8px; }
  .dd-muted { color: #64748b; font-size: 13.5px; margin: 0 0 14px; }
  .dd-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 6px; }
  .dd-row select { height: 34px; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 0 8px; background: #fff; }
  .dd-modes { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; }
  .dd-mode { text-align: left; background: #fff; border: 2px solid #e2e8f0; border-radius: 14px; padding: 16px; cursor: pointer; color: #334155; }
  .dd-mode:hover:not(:disabled) { border-color: #94a3b8; }
  .dd-mode.on { border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14,165,233,0.15); }
  .dd-mode:disabled { cursor: default; }
  .dd-mode-head { display: flex; align-items: center; gap: 8px; }
  .dd-mode-head strong { color: #0f172a; font-size: 15px; }
  .dd-mode p { font-size: 12.5px; margin: 8px 0 10px; line-height: 1.45; }
  .dd-num { width: 22px; height: 22px; border-radius: 50%; background: #0f172a; color: #fff; font-size: 12px; display: inline-flex; align-items: center; justify-content: center; }
  .dd-badge { background: #e0f2fe; color: #0369a1; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; }
  .dd-terms { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 10px; margin: 0; font-size: 12px; }
  .dd-terms div { display: flex; justify-content: space-between; gap: 6px; border-bottom: 1px dashed #e2e8f0; padding: 2px 0; }
  .dd-terms dt { color: #94a3b8; } .dd-terms dd { margin: 0; font-weight: 700; color: #0f172a; text-align: right; }
  .dd-status { display: inline-flex; align-items: center; gap: 5px; font-weight: 800; font-size: 13px; }
  .dd-problems { list-style: none; padding: 12px 14px; margin: 0 0 14px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; color: #92400e; font-size: 13.5px; }
  .dd-problems li { display: flex; gap: 6px; align-items: flex-start; padding: 2px 0; }
  .dd-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
  .dd-card { background: #fff; border-radius: 12px; padding: 14px; border: 1px solid #e2e8f0; }
  .dd-card h3 { display: flex; align-items: center; gap: 6px; font-size: 12px; text-transform: uppercase; color: #64748b; margin: 0 0 8px; }
  .dd-card p { margin: 4px 0 0; font-size: 12.5px; color: #64748b; }
  .dd-card .dd-big { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
  .dd-table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 10px; overflow: hidden; font-size: 13px; }
  .dd-table th, .dd-table td { text-align: left; padding: 9px 12px; border-bottom: 1px solid #f1f5f9; }
  .dd-table th { font-size: 11px; text-transform: uppercase; color: #64748b; }
  .dd-ghost { display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 12px; border: 1.5px solid #cbd5e1; background: #fff; color: #0f172a; border-radius: 8px; font-weight: 700; font-size: 12.5px; cursor: pointer; white-space: nowrap; }
  .dd-danger { color: #b91c1c; border-color: #fecaca; }
  .dd-empty { display: flex; align-items: center; gap: 8px; color: #047857; background: #ecfdf5; border-radius: 12px; padding: 18px; font-weight: 600; }
  .dd-err { background: #fff; border: 1px solid #e2e8f0; border-left: 4px solid #ef4444; border-radius: 10px; padding: 12px 14px; margin-bottom: 10px; }
  .dd-err.resolved { border-left-color: #10b981; opacity: 0.75; }
  .dd-err-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .dd-expand { border: none; background: none; cursor: pointer; padding: 0; color: #475569; display: flex; }
  .dd-loc { flex: 1; min-width: 180px; font-size: 13.5px; color: #0f172a; word-break: break-all; }
  .dd-count { font-weight: 800; color: #b91c1c; font-size: 13px; }
  .dd-src { font-size: 10.5px; font-weight: 800; padding: 2px 7px; border-radius: 6px; }
  .dd-src-server { background: #fee2e2; color: #991b1b; } .dd-src-background { background: #ede9fe; color: #5b21b6; } .dd-src-browser { background: #e0f2fe; color: #075985; }
  .dd-err-msg { font-size: 13.5px; color: #334155; margin: 6px 0 4px; word-break: break-word; }
  .dd-stack { background: #0f172a; color: #e2e8f0; font-size: 11.5px; padding: 12px; border-radius: 8px; overflow-x: auto; max-height: 360px; margin: 8px 0 0; }
  .dd-spin { animation: dd-spin 1s linear infinite; }
  @keyframes dd-spin { to { transform: rotate(360deg); } }
`;
