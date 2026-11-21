import { Fragment, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ShieldCheck, ShieldAlert, AlertTriangle, ChevronDown, ChevronRight, Loader2, Info, RotateCcw, EyeOff, Eye, Lock, Unlock } from 'lucide-react';
import WithholdResultDialog from '../../components/ui/WithholdResultDialog';
import toast from 'react-hot-toast';
import PageHeader from '../../components/PageHeader';
import { getProctoringReport, getProctoringTimeline, resetStudentViolations, allowCodeAttempts } from '../../api/endpoints';
import { tx } from '../../utils/terms';
import StudentListTools from '../../components/ui/StudentListTools';
import { searchAndSortStudents, type StudentSort } from '../../utils/studentListSort';

const TYPE_LABEL: Record<string, string> = {
  'visibility-hidden': 'Switched tab / minimised', 'focus-lost': 'Left the exam window', 'fullscreen-exit': 'Exited full screen',
  'screenshot-attempt': 'Screenshot attempt', 'devtools-block': 'Blocked shortcut / dev tools', 'new-tab-block': 'Tried to open a new tab',
  'auto-submit': 'Auto-submitted', 'violations-reset': 'Violations reset',
};
/** Shortest reason the server accepts for a reset. */
const MIN_REASON = 5;
const fmtTime = (iso?: string) => iso ? new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '';
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
  // Search by name or index number; '' keeps the report's own order (most violations first)
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<StudentSort | ''>('');
  const [resetting, setResetting] = useState<any | null>(null);
  const [withholding, setWithholding] = useState<{ mode: 'withhold' | 'release'; row: any } | null>(null);
  const qc = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['proctoring', qId],
    queryFn: () => getProctoringReport(qId!),
    enabled: !!qId,
    // Staff watch this during the exam: new violations (and resets by others) show without reloading
    refetchInterval: 30_000,
  });

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Loader2 size={26} color="var(--brand-text)" className="pr-spin" /><style>{`.pr-spin{animation:pr-spin 1s linear infinite}@keyframes pr-spin{to{transform:rotate(360deg)}}`}</style></div>;
  if (isError || !data) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>{(error as any)?.response?.data?.message ?? 'Could not load the proctoring report.'}</div>;

  const rows: any[] = data.students ?? [];
  const canReset = data.canResetViolations === true;
  const canWithhold = data.canWithholdResults === true;
  // The last column holds Reset violations and Withhold / Release result
  const actions = canReset || canWithhold;
  const cols = actions ? 7 : 6;
  const visible = searchAndSortStudents(rows, search, sort, r => r.name ?? '', r => r.username ?? '');
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

      {/* Students who entered a wrong access code 10 times: they can't start until allowed again */}
      {(data.codeLocks ?? []).length > 0 && (
        <CodeLocks quizId={qId!} locks={data.codeLocks} onChanged={() => qc.invalidateQueries({ queryKey: ['proctoring', qId] })} />
      )}

      <div className="pr-card">
        {rows.length > 0 && (
          <div className="pr-tools">
            <StudentListTools id="pr-students" search={search} onSearch={setSearch} sort={sort} onSort={setSort}
              shown={visible.length} total={rows.length} firstOption="Most violations first" />
          </div>
        )}
        <div style={{ overflowX: 'auto' }}>
          <table className="pr-table">
            <thead>
              <tr><th style={{ width: 28 }} /><th>{tx("Student")}</th><th className="r">Violations</th><th>Most common</th><th>Status</th><th>Submitted</th>{actions && <th />}</tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={cols} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No attempts yet.</td></tr>
              ) : visible.length === 0 ? (
                <tr><td colSpan={cols} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No {tx('student')} matches “{search.trim()}”.</td></tr>
              ) : visible.map(r => {
                const f = FLAG[r.flag] ?? FLAG.CLEAN;
                const top = Object.entries(r.byType as Record<string, number>).filter(([t]) => t !== 'auto-submit').sort((a, b) => b[1] - a[1])[0];
                const expanded = open === r.studentId;
                // Older servers send no hasEvents: a row with violations has events
                const hasEvents = r.hasEvents ?? r.violations > 0;
                return (
                  <Fragment key={r.studentId}>
                    <tr className={hasEvents ? 'pr-click' : ''} onClick={() => hasEvents && setOpen(expanded ? null : r.studentId)}>
                      <td>{hasEvents && (expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />)}</td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#1e293b' }}>{r.name}</div>
                        {/* The name falls back to the index number when none is on record: never show it twice */}
                        {r.username && r.username !== r.name && <div style={{ fontSize: 11, color: '#94a3b8' }}>{r.username}</div>}
                      </td>
                      <td className="r" style={{ fontWeight: 800, color: '#1e293b' }}>
                        {r.violations}{data.maxViolations ? <span style={{ color: '#94a3b8', fontWeight: 500 }}> / {data.maxViolations}</span> : null}
                        {r.lastResetAt && (
                          <div className="pr-reset-note" title={r.lastResetReason ? `Reason: ${r.lastResetReason}` : undefined}>
                            {r.lastResetTo > 0 ? `Set to ${r.lastResetTo}` : 'Reset'} by {r.lastResetBy ?? 'staff'}, {fmtTime(r.lastResetAt)}
                            {r.violationsBeforeReset > 0 && <> · {r.violationsBeforeReset} before</>}
                          </div>
                        )}
                      </td>
                      <td style={{ color: '#475569' }}>{top ? `${label(top[0])} (${top[1]})` : '—'}</td>
                      <td>
                        <span className="pr-flag" style={{ background: f.bg, color: f.fg }}><f.Icon size={12} /> {f.text}</span>
                        {r.autoSubmitted && <span className="pr-flag" style={{ background: '#f1f5f9', color: '#334155', marginLeft: 4 }}>Auto-submitted</span>}
                        {r.withheld && <span className="pr-flag" title={r.withheldReason ? `Withheld: ${r.withheldReason}` : undefined}
                          style={{ background: '#fdeeee', color: '#9f1f1f', marginLeft: 4 }}><EyeOff size={12} /> Result withheld</span>}
                      </td>
                      <td style={{ color: r.submitted ? '#0b7a0b' : '#94a3b8', fontWeight: 600 }}>{r.submitted ? 'Yes' : 'No'}</td>
                      {actions && (
                        <td className="r">
                          <div className="pr-actions">
                            {canReset && r.inProgress && r.violations > 0 && (
                              <button type="button" className="pr-reset-btn" onClick={ev => { ev.stopPropagation(); setResetting(r); }}>
                                <RotateCcw size={13} /> Reset violations
                              </button>
                            )}
                            {canWithhold && (r.withheld ? (
                              <button type="button" className="pr-reset-btn pr-release" title="Let the student see this result again"
                                onClick={ev => { ev.stopPropagation(); setWithholding({ mode: 'release', row: r }); }}>
                                <Eye size={13} /> Release result
                              </button>
                            ) : (
                              <button type="button" className="pr-reset-btn pr-withhold" title="Hold back this student's result while others are released"
                                onClick={ev => { ev.stopPropagation(); setWithholding({ mode: 'withhold', row: r }); }}>
                                <EyeOff size={13} /> Withhold result
                              </button>
                            ))}
                          </div>
                        </td>
                      )}
                    </tr>
                    {expanded && (
                      <tr><td colSpan={cols} style={{ background: '#fafbff', padding: '4px 16px 14px 44px' }}>
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

      {withholding && (
        <WithholdResultDialog
          mode={withholding.mode}
          quizId={qId!}
          student={{ id: withholding.row.studentId, name: withholding.row.name, index: withholding.row.username }}
          currentReason={withholding.row.withheldReason}
          onClose={() => setWithholding(null)}
          onDone={() => {
            setWithholding(null);
            qc.invalidateQueries({ queryKey: ['proctoring', qId] });
            qc.invalidateQueries({ queryKey: ['result-review-info'] });
          }}
        />
      )}

      {resetting && (
        <ResetDialog
          quizId={qId!}
          student={resetting}
          maxViolations={data.maxViolations}
          violationAction={data.violationAction}
          delaySeconds={data.delaySeconds}
          delayMultiplier={data.delayMultiplier}
          onClose={() => setResetting(null)}
          onDone={() => {
            setResetting(null);
            qc.invalidateQueries({ queryKey: ['proctoring', qId] });
          }}
        />
      )}

      <style>{`
        .pr-tools { padding: 14px 14px 12px; border-bottom: 1px solid #eef0f4; }
        .pr-reset-note { font-size: 11px; font-weight: 500; color: #64748b; margin-top: 2px; white-space: nowrap; }
        .pr-reset-btn { display: inline-flex; align-items: center; gap: 5px; height: 30px; padding: 0 10px; border-radius: 7px; border: 1.5px solid #e2e8f0; background: #fff; color: #334155; font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap; }
        .pr-reset-btn:hover { border-color: var(--brand); color: var(--brand-text); }
        .pr-actions { display: inline-flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px; }
        .pr-withhold { color: #b91c1c; border-color: #fecaca; }
        .pr-withhold:hover { border-color: #b91c1c; color: #991b1b; }
        .pr-release { color: #15803d; border-color: #bbf7d0; }
        .pr-release:hover { border-color: #16a34a; color: #166534; }
        .pr-modal-bg { position: fixed; inset: 0; z-index: 1000; background: rgba(15, 23, 42, 0.45); display: flex; align-items: center; justify-content: center; padding: 16px; }
        .pr-modal { background: #fff; border-radius: 14px; width: 100%; max-width: 440px; padding: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.25); box-sizing: border-box; }
        .pr-modal h3 { margin: 0 0 6px; font-size: 17px; color: #1e293b; }
        .pr-modal p { margin: 0 0 12px; font-size: 13px; color: #475569; line-height: 1.55; }
        .pr-modal textarea { width: 100%; box-sizing: border-box; min-height: 84px; padding: 10px 12px; border-radius: 8px; border: 1.5px solid #e2e8f0; font: inherit; font-size: 14px; resize: vertical; outline: none; }
        .pr-modal textarea:focus, .pr-modal .pr-count:focus { border-color: var(--brand); }
        .pr-modal .pr-count { width: 100%; box-sizing: border-box; height: 40px; padding: 0 10px; border-radius: 8px; border: 1.5px solid #e2e8f0; background: #fff; font: inherit; font-size: 14px; outline: none; }
        .pr-modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
        .pr-modal-actions button { height: 36px; padding: 0 14px; border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer; border: 1.5px solid #e2e8f0; background: #fff; color: #475569; }
        .pr-modal-actions .pr-primary { background: var(--brand); border-color: var(--brand); color: var(--brand-contrast); }
        .pr-modal-actions button:disabled { opacity: 0.55; cursor: not-allowed; }
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
  if (isLoading) return <div style={{ padding: 10 }}><Loader2 size={16} color="var(--brand-text)" className="pr-spin" /></div>;
  const events: any[] = data ?? [];
  return (
    <ol style={{ margin: '6px 0 0', padding: 0, listStyle: 'none' }}>
      {events.map(e => e.type === 'violations-reset' ? (
        <li key={e.id} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, padding: '7px 10px', margin: '4px 0', fontSize: 12.5, background: '#eef6ff', borderRadius: 6 }}>
          <span style={{ color: '#64748b', fontVariantNumeric: 'tabular-nums', minWidth: 150 }}>{new Date(e.occurredAt).toLocaleString()}</span>
          <span style={{ color: '#1e3a8a', fontWeight: 700 }}><RotateCcw size={12} style={{ verticalAlign: -1 }} /> Violation count set to {e.violationNumber ?? 0}{e.actorName ? ` by ${e.actorName}` : ''}</span>
          {e.note && <span style={{ color: '#334155', flexBasis: '100%' }}>Reason: {e.note}</span>}
        </li>
      ) : (
        <li key={e.id} style={{ display: 'flex', gap: 12, padding: '5px 0', fontSize: 12.5, borderBottom: '1px dashed #eef0f4', opacity: e.beforeReset ? 0.6 : 1 }}>
          <span style={{ color: '#64748b', fontVariantNumeric: 'tabular-nums', minWidth: 150 }}>{new Date(e.occurredAt).toLocaleString()}</span>
          <span style={{ color: '#1e293b', fontWeight: 600 }}>{label(e.type)}</span>
          {e.violationNumber != null && <span style={{ color: '#94a3b8' }}>violation #{e.violationNumber}</span>}
          {e.beforeReset && <span style={{ color: '#94a3b8' }} title="Sent from the student's page before it heard of the reset">not counted (before the reset)</span>}
          {e.ipAddress && <span style={{ color: '#94a3b8', marginLeft: 'auto' }}>IP {e.ipAddress}</span>}
        </li>
      ))}
    </ol>
  );
}

/** "90 s (1 min 30 s)": seconds first, with minutes once it is a minute or more. */
const fmtSeconds = (sec: number) => {
  if (sec < 60) return `${sec} s`;
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${sec} s (${m} min${s ? ` ${s} s` : ''})`;
};

/**
 * Lock-out the student gets at their next violation once the count is set to `count`. Same rule as
 * the exam page (useQuizProtection calcDelay): violation n locks for delay × multiplier^(n-1).
 */
const nextLockOut = (count: number, delaySeconds?: number, delayMultiplier?: number) => {
  const d = Number(delaySeconds ?? 30);
  const m = Number(delayMultiplier ?? 1.5);
  const next = count + 1;
  return next > 1 ? Math.round(d * Math.pow(m, next - 1)) : d;
};

/** What the student's next violation does after the count is set to `count`, for the choice's label. */
const nextEffect = (count: number, action: string | undefined, max: number | undefined, delay?: number, mult?: number) => {
  const next = count + 1;
  const autoSubmits = (action === 'AUTOSUBMIT_ONLY' || action === 'DELAY_AND_AUTOSUBMIT') && !!max && next >= max;
  if (autoSubmits) return 'next violation auto-submits';
  if (action === 'DELAY_ONLY' || action === 'DELAY_AND_AUTOSUBMIT') return `next lock-out ${fmtSeconds(nextLockOut(count, delay, mult))}`;
  return '';
};

/** Asks for the new count (0, or lower than now) and the reason, then changes the student's violation count. */
function ResetDialog({ quizId, student, maxViolations, violationAction, delaySeconds, delayMultiplier, onClose, onDone }: {
  quizId: string; student: any; maxViolations?: number; violationAction?: string;
  delaySeconds?: number; delayMultiplier?: number; onClose: () => void; onDone: () => void;
}) {
  const current = Number(student.violations) || 0;
  const highest = Math.max(0, current - 1);
  const [reason, setReason] = useState('');
  const [countText, setCountText] = useState('0');
  const [busy, setBusy] = useState(false);
  const count = Number(countText);
  const countOk = countText.trim() !== '' && Number.isInteger(count) && count >= 0 && count <= highest;
  const usesLockOuts = violationAction === 'DELAY_ONLY' || violationAction === 'DELAY_AND_AUTOSUBMIT';
  const reasonOk = reason.trim().length >= MIN_REASON;
  const ok = countOk && reasonOk;

  const submit = async () => {
    if (!ok || busy) return;
    setBusy(true);
    try {
      await resetStudentViolations(quizId, student.studentId, reason.trim(), count);
      toast.success(count > 0
        ? `${student.name}'s violation count is now ${count}. Their exam page updates within a minute.`
        : `${student.name}'s violations were reset. Their exam page updates within a minute.`);
      onDone();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Could not reset the violations.');
      setBusy(false);
    }
  };

  return (
    <div className="pr-modal-bg" role="dialog" aria-modal="true" aria-labelledby="pr-reset-title" onClick={() => !busy && onClose()}>
      <div className="pr-modal" onClick={e => e.stopPropagation()}>
        <h3 id="pr-reset-title">Reset {student.name}'s violations?</h3>
        <p>
          Their count is now {current}{maxViolations ? ` / ${maxViolations}` : ''}. Enter the number it should be (0 clears it); any lock-out ends.
          The next violation counts from that number. The earlier ones stay in the timeline, and the change is recorded with your name.
        </p>
        <label htmlFor="pr-reset-count" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
          New violation count{usesLockOuts ? ' (next lock-out in seconds)' : ''}
        </label>
        <select
          id="pr-reset-count"
          value={countText}
          onChange={e => setCountText(e.target.value)}
          className="pr-count"
        >
          {Array.from({ length: highest + 1 }, (_, n) => {
            const effect = nextEffect(n, violationAction, maxViolations, delaySeconds, delayMultiplier);
            return <option key={n} value={String(n)}>{n}{effect ? ` · ${effect}` : ''}</option>;
          })}
        </select>
        <div style={{ fontSize: 11.5, color: '#64748b', margin: '4px 0 12px', lineHeight: 1.5 }}>
          {highest === 0 ? 'It can only go back to 0.' : `0 to ${highest}: it can only go down.`}
          {usesLockOuts && countOk && <> If they break a rule again, that is violation {count + 1} and locks them out for {fmtSeconds(nextLockOut(count, delaySeconds, delayMultiplier))}.</>}
        </div>
        <label htmlFor="pr-reset-reason" style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
          Reason (required)
        </label>
        <textarea
          id="pr-reset-reason"
          autoFocus
          maxLength={500}
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="e.g. The phone keyboard set off violations while typing"
        />
        {!reasonOk && reason.length > 0 && <div style={{ fontSize: 11.5, color: '#9f1f1f', marginTop: 4 }}>At least {MIN_REASON} characters.</div>}
        <div className="pr-modal-actions">
          <button type="button" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="pr-primary" onClick={submit} disabled={!ok || busy}>
            {busy ? 'Saving…' : count > 0 && countOk ? `Set to ${count}` : 'Reset to 0'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Students locked out of the access code (10 wrong codes), each with a button to let them try again. */
function CodeLocks({ quizId, locks, onChanged }: { quizId: string; locks: any[]; onChanged: () => void }) {
  const [busyId, setBusyId] = useState<number | null>(null);

  const allow = async (l: any) => {
    setBusyId(l.studentId);
    try {
      await allowCodeAttempts(quizId, l.studentId);
      toast.success(`${l.name} can enter the access code again.`);
      onChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Could not allow code attempts again.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="pr-locks" role="region" aria-label="Access code locked">
      <div className="pr-locks-head">
        <Lock size={15} aria-hidden="true" />
        <b>Access code locked ({locks.length})</b>
        <span>These {tx('students')} entered a wrong access code {10} times and can't start the quiz until you let them try again.</span>
      </div>
      <ul>
        {locks.map(l => (
          <li key={l.studentId}>
            <div className="pr-locks-who">
              <div className="pr-locks-name">{l.name}</div>
              <div className="pr-locks-meta">
                {l.username && l.username !== l.name && <>{l.username} · </>}
                {l.wrongCount} wrong codes{l.lockedAt && <> · locked {fmtTime(l.lockedAt)}</>}
              </div>
            </div>
            <button type="button" className="pr-reset-btn pr-release" disabled={busyId === l.studentId} onClick={() => allow(l)}>
              {busyId === l.studentId ? <Loader2 size={13} className="pr-spin" /> : <Unlock size={13} />} Allow code attempts again
            </button>
          </li>
        ))}
      </ul>
      <style>{`
        .pr-locks { background: #fff; border: 1.5px solid #fecaca; border-radius: 14px; padding: 12px 14px; margin-bottom: 14px; }
        .pr-locks-head { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; color: #991b1b; font-size: 13px; }
        .pr-locks-head span { flex-basis: 100%; color: #64748b; font-size: 12px; }
        .pr-locks ul { list-style: none; margin: 10px 0 0; padding: 0; }
        .pr-locks li { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding: 8px 0; border-top: 1px dashed #f1f5f9; }
        .pr-locks-name { font-weight: 700; color: #1e293b; font-size: 13px; }
        .pr-locks-meta { font-size: 11.5px; color: #94a3b8; }
        .pr-locks-who { min-width: 0; }
      `}</style>
    </div>
  );
}
