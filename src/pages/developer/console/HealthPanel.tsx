import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Database, Mail, HardDrive, Cpu, Clock, Bug, RefreshCw, AlertTriangle, ArrowRight, BellRing, Globe, ListChecks,
} from 'lucide-react';
import { getSystemHealth, sendTestAlert } from '../../../api/endpoints';
import { BASE_URL } from '../../../api/client';
import { SYSTEM_MODES } from '../../../utils/terms';
import {
  PanelHeader, PanelLoading, PanelError, StatusBadge, Meter, CopyButton, toneOf, useNow, relativeTime, fullDate,
  formatUptime, formatMb, apiMessage, type Tone,
} from './ui';

const HEADLINE: Record<string, string> = {
  UP: 'All systems operational',
  DEGRADED: 'Running with problems',
  DOWN: 'Database unreachable',
};

const STATUS_PATH = '/api/v1/auth/status';

/** Live health: overall status, resources, scheduled jobs and alert routing. */
export default function HealthPanel({ onShowErrors }: { onShowErrors: () => void }) {
  const q = useQuery({ queryKey: ['dev-health'], queryFn: getSystemHealth, refetchInterval: 30_000 });
  const now = useNow(10_000);
  const h = q.data;

  const testAlert = async () => {
    try { toast.success((await sendTestAlert()).message); }
    catch (err) { toast.error(apiMessage(err, 'Could not send the test alert')); }
  };

  const header = (
    <PanelHeader
      title="System health"
      description="Live server checks. Refreshes every 30 seconds."
      actions={
        <button className="dd-btn" onClick={() => q.refetch()} disabled={q.isFetching}>
          <RefreshCw size={14} className={q.isFetching ? 'dd-spin' : ''} /> Refresh
        </button>
      }
    />
  );

  if (q.isLoading) return <section>{header}<PanelLoading label="Loading health" /></section>;
  if (q.isError || !h) return (
    <section>{header}
      <PanelError message="Could not reach the server's health check. The server may be down." onRetry={() => q.refetch()} />
    </section>
  );

  const tone = toneOf(h.status);
  const diskFree: number | null = h.disk.freePercent;
  const diskTone: Tone = diskFree == null ? 'neutral' : diskFree < 5 ? 'bad' : diskFree < 15 ? 'warn' : 'ok';
  const memTone: Tone = h.memory.usedPercent > 90 ? 'bad' : h.memory.usedPercent > 75 ? 'warn' : 'ok';
  const dbMs: number | null = h.database.responseMs ?? null;
  const dbTone: Tone = h.database.status !== 'UP' ? 'bad' : dbMs != null && dbMs > 500 ? 'warn' : 'ok';
  const errTone: Tone = h.errors.openLastHour > 0 ? 'bad' : h.errors.open > 0 ? 'warn' : 'ok';
  const statusUrl = new URL(`${BASE_URL.replace(/\/$/, '')}/status`, window.location.origin).href;

  return (
    <section>
      {header}

      {/* Overall status */}
      <div className={`dd-banner dd-banner-${tone}`}>
        <span className={`dd-pulse dd-tone-${tone}`} aria-hidden />
        <div className="dd-banner-main">
          <strong>{HEADLINE[h.status] ?? h.status}</strong>
          <span title={fullDate(h.checkedAt)}>Checked {relativeTime(h.checkedAt, now)}</span>
        </div>
        <dl className="dd-banner-meta">
          <div><dt>Mode</dt><dd>{SYSTEM_MODES.find(m => m.value === h.mode)?.label ?? h.mode}</dd></div>
          {h.javaVersion && <div><dt>Java</dt><dd>{h.javaVersion}</dd></div>}
          <div><dt>Profile</dt><dd>{h.profiles?.length ? h.profiles.join(', ') : 'default'}</dd></div>
        </dl>
      </div>

      {h.problems.length > 0 && (
        <div className="dd-callout dd-callout-warn">
          <AlertTriangle size={18} />
          <div>
            <strong>{h.problems.length} problem{h.problems.length === 1 ? '' : 's'} need attention</strong>
            <ul className="dd-problems">{h.problems.map((p: string) => <li key={p}>{p}</li>)}</ul>
          </div>
        </div>
      )}

      {/* Metrics */}
      <div className="dd-metrics">
        <Metric icon={<Database size={15} />} label="Database" tone={dbTone}
          value={dbMs != null ? `${dbMs} ms` : <StatusBadge status={h.database.status} />}
          foot={h.database.status === 'UP' ? 'Response time for a test query' : h.database.error ?? 'Not answering'} />
        <Metric icon={<Mail size={15} />} label="Email" tone={toneOf(h.mail.status)}
          value={<StatusBadge status={h.mail.status} />}
          foot={<span className="dd-mono dd-ellipsis" title={h.mail.host ?? undefined}>{h.mail.host ?? 'No mail server set'}</span>} />
        <Metric icon={<HardDrive size={15} />} label="Disk" tone={diskTone}
          value={diskFree != null ? `${100 - diskFree}% used` : '–'}
          meter={diskFree != null ? 100 - diskFree : undefined}
          foot={`${formatMb(h.disk.freeMb)} free of ${formatMb(h.disk.totalMb)}`} />
        <Metric icon={<Cpu size={15} />} label="Memory (heap)" tone={memTone}
          value={`${h.memory.usedPercent}% used`} meter={h.memory.usedPercent}
          foot={`${formatMb(h.memory.usedMb)} of ${formatMb(h.memory.maxMb)}`} />
        <Metric icon={<Clock size={15} />} label="Uptime" tone="neutral"
          value={formatUptime(h.uptimeMinutes)}
          foot={<span title={fullDate(h.startedAt)}>Started {relativeTime(h.startedAt, now)}</span>} />
        <Metric icon={<Bug size={15} />} label="Open errors" tone={errTone}
          value={String(h.errors.open)}
          foot={<>{h.errors.openLastHour} in the last hour · {h.errors.seenLast24h} in 24 h{' '}
            <button className="dd-link" onClick={onShowErrors}>View <ArrowRight size={12} /></button></>} />
      </div>

      <div className="dd-two">
        {/* Jobs */}
        <div className="dd-card">
          <div className="dd-card-head"><h2 className="dd-card-title"><ListChecks size={16} /> Scheduled jobs</h2></div>
          {h.jobs.length === 0 ? (
            <p className="dd-empty-sm">No job has reported yet. Jobs report within a minute of the server starting.</p>
          ) : (
            <ul className="dd-jobs">
              {h.jobs.map((j: any) => (
                <li key={j.name}>
                  <span className="dd-jobs-name dd-mono">{j.name}</span>
                  <span className="dd-jobs-when" title={fullDate(j.lastRun)}>{relativeTime(j.lastRun, now)}</span>
                  <StatusBadge status={j.status} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Alerts */}
        <div className="dd-card">
          <div className="dd-card-head">
            <h2 className="dd-card-title"><BellRing size={16} /> Error alerts</h2>
            <span className={`dd-tag ${h.errors.emailAlerts ? 'dd-tag-ok' : 'dd-tag-warn'}`}>{h.errors.emailAlerts ? 'On' : 'Off'}</span>
          </div>
          {h.errors.emailAlerts ? (
            <>
              <p className="dd-card-text">New errors are emailed to these addresses, at most once an hour for the same error:</p>
              {h.errors.alertRecipients.length ? (
                <ul className="dd-recipients">{h.errors.alertRecipients.map((r: string) => <li key={r} className="dd-mono">{r}</li>)}</ul>
              ) : (
                <p className="dd-card-text dd-warn-text">Nobody yet. Add a row to the <code>developer_email</code> table.</p>
              )}
            </>
          ) : (
            <p className="dd-card-text">Email alerts are off or no mail server is configured. Errors still appear on the Errors page.</p>
          )}
          <button className="dd-btn dd-btn-sm" onClick={testAlert}><Mail size={13} /> Send a test alert</button>

          <div className="dd-divider" />
          <h3 className="dd-card-subtitle"><Globe size={14} /> Uptime monitor endpoint</h3>
          <p className="dd-card-text">Public and returns no details, so it's safe for external monitors to poll.</p>
          <div className="dd-codeline">
            <code className="dd-ellipsis" title={statusUrl}>{STATUS_PATH}</code>
            <CopyButton text={statusUrl} label="Copy URL" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({ icon, label, value, foot, tone, meter }: {
  icon: ReactNode; label: string; value: ReactNode; foot: ReactNode; tone: Tone; meter?: number;
}) {
  return (
    <div className={`dd-metric dd-metric-${tone}`}>
      <div className="dd-metric-label">{icon} {label}</div>
      <div className="dd-metric-value">{value}</div>
      {meter != null && <Meter percent={meter} tone={tone} />}
      <div className="dd-metric-foot">{foot}</div>
    </div>
  );
}
