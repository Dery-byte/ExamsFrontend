import { Fragment, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ShieldCheck, ShieldAlert, AlertTriangle, ChevronDown, ChevronRight, Loader2, Info } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { getProctoringReport, getProctoringTimeline } from '../../api/endpoints';
import { tx } from '../../utils/terms';

const TYPE_LABEL: Record<string, string> = {
  'visibility-hidden': 'Switched tab / minimised', 'focus-lost': 'Left the exam window', 'fullscreen-exit': 'Exited full screen',
  'screenshot-attempt': 'Screenshot attempt', 'devtools-block': 'Blocked shortcut / dev tools', 'new-tab-block': 'Tried to open a new tab',
  'auto-submit': 'Auto-submitted',
};
const label = (t: string) => TYPE_LABEL[t] ?? t.replace(/-/g, ' ');

const FLAG: Record<string, { text: string; bg: string; fg: string; Icon: any }> = {
  CLEAN:   { text: 'Clean',   bg: '#eefbee', fg: '#0b7a0b', Icon: ShieldCheck },
  WATCH:   { text: 'Review',  bg: '#fff7e6', fg: '#8a5a00', Icon: AlertTriangle },
  SERIOUS: { text: 'Limit reached', bg: '#fdeeee', fg: '#9f1f1f', Icon: ShieldAlert },
};

/** Staff: per-student proctoring summary for one quiz, with an expandable event timeline. */
export default function ProctoringReport() {
  const { qId } = useParams();
  const navigate = useNavigate();
  const [open, setOpen] = useState<number | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['proctoring', qId],
    queryFn: () => getProctoringReport(qId!),
    enabled: !!qId,
  });

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Loader2 size={26} color="#5156be" className="pr-spin" /><style>{`.pr-spin{animation:pr-spin 1s linear infinite}@keyframes pr-spin{to{transform:rotate(360deg)}}`}</style></div>;
  if (isError || !data) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>{(error as any)?.response?.data?.message ?? 'Could not load the proctoring report.'}</div>;

  const rows: any[] = data.students ?? [];
  const counts = { CLEAN: 0, WATCH: 0, SERIOUS: 0 } as Record<string, number>;
  rows.forEach(r => { counts[r.flag] = (counts[r.flag] ?? 0) + 1; });

  return (
    <div style={{ paddingBottom: 40 }}>
      <PageHeader title="Proctoring Report" breadcrumbs={['Assessments', data.quizTitle]} />

      <button onClick={() => navigate(-1)} className="pr-back"><ArrowLeft size={14} /> Back</button>

      <div className="pr-summary">
        <div className="pr-tile"><div className="pr-tile-l">Quiz</div><div className="pr-tile-v" style={{ fontSize: 16 }}>{data.courseCode ? `${data.courseCode} · ` : ''}{data.quizTitle}</div></div>
        <div className="pr-tile"><div className="pr-tile-l">{tx("Students")}</div><div className="pr-tile-v">{rows.length}</div></div>
        <div className="pr-tile"><div className="pr-tile-l">Clean</div><div className="pr-tile-v">{counts.CLEAN}</div></div>
        <div className="pr-tile"><div className="pr-tile-l">To review</div><div className="pr-tile-v">{counts.WATCH}</div></div>
        <div className="pr-tile"><div className="pr-tile-l">Reached limit</div><div className="pr-tile-v">{counts.SERIOUS}</div></div>
      </div>

      {(!data.proctoringEnabled || data.violationAction === 'NONE') && (
        <p className="pr-note"><Info size={14} /> Violation handling is off for this quiz, so the exam page does not record events for it.</p>
      )}

      <div className="pr-card">
        <div style={{ overflowX: 'auto' }}>
          <table className="pr-table">
            <thead>
              <tr><th style={{ width: 28 }} /><th>{tx("Student")}</th><th className="r">Violations</th><th>Most common</th><th>Status</th><th>Submitted</th></tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No attempts yet.</td></tr>
              ) : rows.map(r => {
                const f = FLAG[r.flag] ?? FLAG.CLEAN;
                const top = Object.entries(r.byType as Record<string, number>).filter(([t]) => t !== 'auto-submit').sort((a, b) => b[1] - a[1])[0];
                const expanded = open === r.studentId;
                return (
                  <Fragment key={r.studentId}>
                    <tr className={r.violations ? 'pr-click' : ''} onClick={() => r.violations && setOpen(expanded ? null : r.studentId)}>
                      <td>{r.violations > 0 && (expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />)}</td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#1e293b' }}>{r.name}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{r.username}</div>
                      </td>
                      <td className="r" style={{ fontWeight: 800, color: '#1e293b' }}>
                        {r.violations}{data.maxViolations ? <span style={{ color: '#94a3b8', fontWeight: 500 }}> / {data.maxViolations}</span> : null}
                      </td>
                      <td style={{ color: '#475569' }}>{top ? `${label(top[0])} (${top[1]})` : '—'}</td>
                      <td>
                        <span className="pr-flag" style={{ background: f.bg, color: f.fg }}><f.Icon size={12} /> {f.text}</span>
                        {r.autoSubmitted && <span className="pr-flag" style={{ background: '#f1f5f9', color: '#334155', marginLeft: 4 }}>Auto-submitted</span>}
                      </td>
                      <td style={{ color: r.submitted ? '#0b7a0b' : '#94a3b8', fontWeight: 600 }}>{r.submitted ? 'Yes' : 'No'}</td>
                    </tr>
                    {expanded && (
                      <tr><td colSpan={6} style={{ background: '#fafbff', padding: '4px 16px 14px 44px' }}>
                        <Timeline quizId={qId!} studentId={r.studentId} />
                      </td></tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .pr-back { display: inline-flex; align-items: center; gap: 6px; margin-bottom: 12px; height: 34px; padding: 0 12px; border-radius: 8px; border: 1.5px solid #e2e8f0; background: #fff; color: #475569; font-weight: 600; font-size: 13px; cursor: pointer; }
        .pr-summary { display: grid; grid-template-columns: 2fr repeat(4, 1fr); gap: 10px; margin-bottom: 14px; }
        .pr-tile { background: #fff; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 12px 14px; min-width: 0; }
        .pr-tile-l { font-size: 12px; font-weight: 600; color: #64748b; }
        .pr-tile-v { font-size: 22px; font-weight: 800; color: #1e293b; margin-top: 2px; overflow-wrap: anywhere; }
        .pr-note { display: flex; gap: 6px; align-items: center; font-size: 13px; color: #8a5a00; background: #fff7e6; border: 1px solid #fde8b8; border-radius: 10px; padding: 8px 12px; margin: 0 0 14px; }
        .pr-card { background: #fff; border: 1.5px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 2px 16px rgba(0,0,0,0.05); }
        .pr-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .pr-table th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; padding: 10px 14px; background: #f8fafc; border-bottom: 1px solid #eef0f4; white-space: nowrap; }
        .pr-table td { padding: 10px 14px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        .pr-table .r { text-align: right; font-variant-numeric: tabular-nums; }
        .pr-click { cursor: pointer; }
        .pr-click:hover td { background: #fafbff; }
        .pr-flag { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; font-weight: 700; padding: 3px 8px; border-radius: 6px; white-space: nowrap; }
        .pr-spin { animation: pr-spin 1s linear infinite; }
        @keyframes pr-spin { to { transform: rotate(360deg); } }
        @media (max-width: 800px) { .pr-summary { grid-template-columns: repeat(2, 1fr); } .pr-summary > :first-child { grid-column: 1 / -1; } }
      `}</style>
    </div>
  );
}

function Timeline({ quizId, studentId }: { quizId: string; studentId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ['proctoring', quizId, 'student', studentId],
    queryFn: () => getProctoringTimeline(quizId, studentId),
  });
  if (isLoading) return <div style={{ padding: 10 }}><Loader2 size={16} color="#5156be" className="pr-spin" /></div>;
  const events: any[] = data ?? [];
  return (
    <ol style={{ margin: '6px 0 0', padding: 0, listStyle: 'none' }}>
      {events.map(e => (
        <li key={e.id} style={{ display: 'flex', gap: 12, padding: '5px 0', fontSize: 12.5, borderBottom: '1px dashed #eef0f4' }}>
          <span style={{ color: '#64748b', fontVariantNumeric: 'tabular-nums', minWidth: 150 }}>{new Date(e.occurredAt).toLocaleString()}</span>
          <span style={{ color: '#1e293b', fontWeight: 600 }}>{label(e.type)}</span>
          {e.violationNumber != null && <span style={{ color: '#94a3b8' }}>violation #{e.violationNumber}</span>}
          {e.ipAddress && <span style={{ color: '#94a3b8', marginLeft: 'auto' }}>IP {e.ipAddress}</span>}
        </li>
      ))}
    </ol>
  );
}
