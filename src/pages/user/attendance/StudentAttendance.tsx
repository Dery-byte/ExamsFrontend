import { useQuery } from '@tanstack/react-query';
import { CalendarCheck, Loader2, Lock } from 'lucide-react';
import PageHeader from '../../../components/PageHeader';
import CheckInPanel from './CheckInPanel';
import { getMyAttendance } from '../../../api/attendance';
import { StatusPill, classTitle, fmtDate, fmtTime } from '../../shared/attendance/shared';
import { tx } from '../../../utils/terms';
import '../../shared/attendance/attendance.css';

/** Student: check in to a class that is taking attendance, and see attendance so far this session. */
export default function StudentAttendance() {
  const { data, isLoading } = useQuery({ queryKey: ['attendance', 'mine'], queryFn: getMyAttendance });

  return (
    <div className="at-page">
      <PageHeader title="Attendance" breadcrumbs={['Main', 'Attendance']} />

      <h2 className="at-section-title" style={{ marginTop: 0 }}>Check in</h2>
      <CheckInPanel />

      <h2 className="at-section-title">{data ? `This academic year (${data.academicSession})` : 'This academic year'}</h2>
      {isLoading ? (
        <div className="at-card"><div className="at-empty"><Loader2 className="at-spin" size={22} /></div></div>
      ) : !data || data.summary.length === 0 ? (
        <div className="at-card"><div className="at-empty"><CalendarCheck size={28} /><p>{tx('No attendance has been taken for your classes yet.')}</p></div></div>
      ) : (
        <div className="at-summary-grid" style={{ marginBottom: 14 }}>
          {data.summary.map(g => {
            const pct = g.percent;
            return (
              <div key={g.key} className="at-card" style={{ marginBottom: 0 }}>
                <div className="at-item-title" style={{ marginBottom: 8 }}>{classTitle(g.title)}</div>
                <div className="at-row" style={{ alignItems: 'baseline', gap: 6 }}>
                  <span className="at-pct">{pct == null ? '—' : `${pct}%`}</span>
                  <span className="at-sub">{g.attended} of {g.counted} classes</span>
                </div>
                <div className={`at-bar ${g.belowMinimum ? 'is-low' : ''}`} role="progressbar"
                     aria-valuenow={pct ?? 0} aria-valuemin={0} aria-valuemax={100} aria-label={`Attendance for ${g.title}`}>
                  <span style={{ width: `${pct ?? 0}%` }} />
                </div>
                <div className="at-counts" style={{ marginTop: 10 }}>
                  {g.minimumPercent != null && <span className={`at-chip ${g.belowMinimum ? 'is-bad' : ''}`}>Minimum {g.minimumPercent}%</span>}
                  {g.late > 0 && <span className="at-chip is-warn">{g.late} late</span>}
                  {g.absent > 0 && <span className="at-chip is-bad">{g.absent} absent</span>}
                  {g.excused > 0 && <span className="at-chip">{g.excused} excused</span>}
                  {g.pending > 0 && <span className="at-chip">{g.pending} waiting for review</span>}
                </div>
                {g.belowMinimum && (
                  <div className="at-alert is-error" role="status" style={{ marginTop: 10, marginBottom: 0 }}>
                    <Lock size={15} />
                    <span>{g.scope === 'PROGRAMME'
                      ? tx("You're below the minimum, so you can't start quizzes until your attendance improves.")
                      : tx("You're below the minimum, so you can't start this course's quizzes until your attendance improves.")}
                      {' '}{tx('If some absences should be excused, see your lecturer.')}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {data && data.history.length > 0 && (
        <div className="at-card">
          <h3 className="at-card-title" style={{ marginBottom: 10 }}>Recent classes</h3>
          <div className="at-list">
            {data.history.map(h => (
              <div key={h.sessionId} className="at-item">
                <div className="at-item-main">
                  <div className="at-item-title" style={{ fontSize: 13.5 }}>{classTitle(h.title)}</div>
                  <div className="at-meta">
                    <span>{fmtDate(h.date)} · {fmtTime(h.date)}</span>
                    <span>Meeting {h.meetingNumber}</span>
                    {h.topic && <span>{h.topic}</span>}
                    {h.live && <span>in progress</span>}
                  </div>
                  {(h.missedSecondCheck || h.note) && (
                    <div className="at-meta">
                      {h.missedSecondCheck && <span className="at-chip is-bad">Missed the second check</span>}
                      {h.note && <span>Note: {h.note}</span>}
                    </div>
                  )}
                </div>
                <StatusPill status={h.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
