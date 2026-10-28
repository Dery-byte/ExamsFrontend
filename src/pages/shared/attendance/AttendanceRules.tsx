import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AlertTriangle, Loader2, Pencil, RotateCcw, Settings2, ShieldCheck } from 'lucide-react';
import AppModal from '../../../components/ui/AppModal';
import {
  getAttendanceSettings, resetDepartmentAttendancePolicy, saveDepartmentAttendancePolicy, saveSystemAttendancePolicy,
  type AttendancePolicy,
} from '../../../api/attendance';
import { getFeatures, setFeatureForDepartment, setFeatureSystemWide } from '../../../api/endpoints';
import { useAuth } from '../../../contexts/AuthContext';
import { useAssessments } from '../../../hooks/useFeatureFlags';
import { errMsg } from './shared';
import { tx } from '../../../utils/terms';

/**
 * Super Admin: the attendance switch, the default rules and each department's own rules.
 * HOD: their department's switch and rules (or follow the default).
 */
export default function AttendanceRules() {
  const { user } = useAuth() as any;
  const isSuper = user?.role === 'SUPER_ADMIN';
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['attendance', 'settings'], queryFn: getAttendanceSettings });
  const { data: features = [] } = useQuery<any[]>({ queryKey: ['features'], queryFn: getFeatures });
  const [editing, setEditing] = useState<{ departmentId: number | null; name: string; policy: AttendancePolicy } | null>(null);

  const feature = features.find(f => f.key === 'ATTENDANCE');
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['attendance'] });
    qc.invalidateQueries({ queryKey: ['features'] });
    qc.invalidateQueries({ queryKey: ['feature-flags'] });
  };

  const toggleSystem = async (on: boolean) => {
    try { await setFeatureSystemWide('ATTENDANCE', on); toast.success(on ? 'Class attendance switched on' : 'Class attendance switched off'); refresh(); }
    catch (e) { toast.error(errMsg(e)); }
  };
  const toggleDepartment = async (departmentId: number, on: boolean | null) => {
    try { await setFeatureForDepartment('ATTENDANCE', departmentId, on); toast.success('Saved'); refresh(); }
    catch (e) { toast.error(errMsg(e)); }
  };
  const reset = async (departmentId: number) => {
    if (!window.confirm(tx('Use the default rules for this department again?'))) return;
    try { await resetDepartmentAttendancePolicy(departmentId); toast.success(tx('The department follows the default rules')); refresh(); }
    catch (e) { toast.error(errMsg(e)); }
  };

  if (isLoading || !data) return <div className="at-card"><div className="at-empty"><Loader2 className="at-spin" size={22} /></div></div>;
  const own = !isSuper ? data.departments[0] : null;
  const hodEffective = feature?.effective ?? feature?.systemEnabled;

  return (
    <>
      <div className="at-card">
        <div className="at-card-head">
          <h3 className="at-card-title"><ShieldCheck size={18} /> Class attendance</h3>
        </div>
        {isSuper ? (
          <>
            <label className="at-switch">
              <input type="checkbox" checked={!!feature?.systemEnabled} onChange={e => toggleSystem(e.target.checked)} />
              <span className="at-switch-track" />
              <span>{feature?.systemEnabled ? 'On for the whole system' : 'Off for everyone'}</span>
            </label>
            <p className="at-help">{tx('While on, lecturers (or HODs, for programme attendance) can start sessions and students can check in. Each HOD can still switch it off for their department.')}</p>
          </>
        ) : feature && !feature.systemEnabled ? (
          <div className="at-alert is-warn" style={{ marginBottom: 0 }}><AlertTriangle size={16} /><span>The Super Admin has switched class attendance off for the whole system.</span></div>
        ) : own && (
          <>
            <label className="at-switch">
              <input type="checkbox" checked={!!hodEffective} onChange={e => toggleDepartment(own.departmentId, e.target.checked ? null : false)} />
              <span className="at-switch-track" />
              <span>{hodEffective ? `On for ${own.departmentName}` : `Off for ${own.departmentName}`}</span>
            </label>
            <p className="at-help">{tx('Switch it off if your department does not take attendance.')}</p>
          </>
        )}
      </div>

      <div className="at-card">
        <div className="at-card-head">
          <div style={{ minWidth: 0 }}>
            <h3 className="at-card-title"><Settings2 size={18} /> Default rules</h3>
            <div className="at-sub">{isSuper ? tx('Used by every department that has not set its own.') : tx('Set by the Super Admin. Your department uses these unless you set your own below.')}</div>
          </div>
          {isSuper && <button className="at-btn-ghost" onClick={() => setEditing({ departmentId: null, name: 'Default rules', policy: data.system })}><Pencil size={15} /> Edit</button>}
        </div>
        <PolicySummary p={data.system} />
      </div>

      <div className="at-card">
        <div className="at-card-head">
          <h3 className="at-card-title">{isSuper ? tx('Departments') : tx('Your department')}</h3>
        </div>
        <div className="at-list">
          {data.departments.map(d => {
            const depFeature = isSuper ? feature?.departments?.find((x: any) => x.departmentId === d.departmentId) : null;
            return (
              <div key={d.departmentId} className="at-item">
                <div className="at-item-main">
                  <div className="at-item-title">{d.departmentName}</div>
                  <div className="at-meta">
                    <span>{(d.policy ?? data.system).mode === 'PROGRAMME' ? tx('By programme') : tx('By course')}</span>
                    <span>{d.policy ? 'Own rules' : 'Follows the default'}</span>
                    {depFeature && depFeature.enabled === false && <span className="at-chip is-bad">{tx('Switched off by department')}</span>}
                  </div>
                </div>
                <div className="at-row">
                  <button className="at-btn-ghost at-btn-sm" onClick={() => setEditing({ departmentId: d.departmentId, name: d.departmentName, policy: d.policy ?? data.system })}>
                    <Pencil size={14} /> {d.policy ? 'Edit rules' : 'Set own rules'}
                  </button>
                  {d.policy && <button className="at-btn-ghost at-btn-sm" onClick={() => reset(d.departmentId)}><RotateCcw size={14} /> Use default</button>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {editing && (
        <PolicyDialog title={editing.departmentId == null ? 'Default attendance rules' : `Attendance rules · ${editing.name}`}
          initial={editing.policy} onClose={() => setEditing(null)}
          onSave={async p => {
            if (editing.departmentId == null) await saveSystemAttendancePolicy(p);
            else await saveDepartmentAttendancePolicy(editing.departmentId, p);
            toast.success('Rules saved');
            setEditing(null);
            refresh();
          }} />
      )}
    </>
  );
}

function PolicySummary({ p }: { p: AttendancePolicy }) {
  const quizzesOn = useAssessments();
  const rows: [string, string][] = [
    ['Attendance taken', p.mode === 'PROGRAMME' ? tx('By programme (HOD starts sessions)') : tx('By course (lecturer starts sessions)')],
    ['Projector code', `New every ${p.codeSeconds} s (+${p.graceSeconds} s to finish typing)`],
    ['Read-aloud code', `New every ${p.readAloudCodeSeconds} s, check-ins wait for review`],
    ['Check-in window', `${p.checkInMinutes} min, late after ${p.lateAfterMinutes} min`],
    ['Location', `Within ${p.radiusMeters} m (when no saved room), accuracy ±${p.maxAccuracyMeters} m or better`],
    ['Wrong codes allowed', `${p.maxFailedAttempts} per class, then locked out`],
    ['Second check', p.secondCheck ? `On, open ${p.secondCheckMinutes} min at a random time` : 'Off'],
    ...(!quizzesOn ? [] : [['Minimum for quizzes', p.minimumRequired
      ? `${p.minimumPercent}%: below it, ${p.mode === 'PROGRAMME' ? 'no quiz at all' : tx("none of the course's quizzes")} can be started`
      : 'Off']] as [string, string][]),
  ];
  return (
    <div className="at-rules-grid">
      {rows.map(([k, v]) => (
        <div key={k} className="at-stat"><span>{k}</span><div style={{ fontWeight: 700, color: '#1e293b', fontSize: 13.5, marginTop: 3 }}>{v}</div></div>
      ))}
    </div>
  );
}

function PolicyDialog({ title, initial, onClose, onSave }: {
  title: string; initial: AttendancePolicy; onClose: () => void; onSave: (p: Partial<AttendancePolicy>) => Promise<void>;
}) {
  const quizzesOn = useAssessments();
  const [p, setP] = useState<AttendancePolicy>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setP(initial), [initial]);
  const set = <K extends keyof AttendancePolicy>(k: K, v: AttendancePolicy[K]) => setP(x => ({ ...x, [k]: v }));
  const num = (k: keyof AttendancePolicy, label: string, unit: string, min: number, max: number, help?: string) => (
    <label className="at-field"><span>{label}</span>
      <span className="at-inline-field">
        <input className="at-input" type="number" min={min} max={max} value={p[k] as number}
          onChange={e => set(k, Number(e.target.value) as any)} />
        <span className="at-sub" style={{ marginTop: 0 }}>{unit}</span>
      </span>
      {help && <span className="at-help" style={{ fontWeight: 500 }}>{help}</span>}
    </label>
  );

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const { updatedAt, updatedBy, ...rules } = p;
      await onSave(rules);
    } catch (e) {
      setError(errMsg(e, 'Could not save the rules.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal title={title} size="lg" onClose={onClose}
      footer={
        <div className="at-row" style={{ width: '100%', justifyContent: 'flex-end' }}>
          <button className="at-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="at-btn" onClick={save} disabled={saving}>{saving ? <Loader2 size={16} className="at-spin" /> : null} Save rules</button>
        </div>
      }>
      <div className="at-page" style={{ paddingBottom: 0 }}>
        <h4 className="at-section-title" style={{ marginTop: 0 }}>How attendance is taken</h4>
        <div className="at-choices">
          {(['COURSE', 'PROGRAMME'] as const).map(m => (
            <label key={m} className={`at-choice ${p.mode === m ? 'is-on' : ''}`}>
              <input type="radio" name="at-mode" checked={p.mode === m} onChange={() => set('mode', m)} />
              <span>
                <b>{m === 'COURSE' ? tx('By course') : tx('By programme')}</b>
                <small>{m === 'COURSE' ? tx("Each course's lecturer starts a session for every class meeting.") : tx('The HOD (or Super Admin) starts sessions for a programme, optionally one level.')}</small>
              </span>
            </label>
          ))}
        </div>

        <h4 className="at-section-title">Code</h4>
        <div className="at-form-grid">
          {num('codeSeconds', 'Projector code changes every', 'seconds', 10, 60, 'Shorter means a forwarded code dies sooner. 15 s works well.')}
          {num('graceSeconds', 'Time to finish typing', 'seconds', 0, 15, 'The previous code is still accepted this long after it changes.')}
          {num('readAloudCodeSeconds', 'Read-aloud code changes every', 'seconds', 30, 300, 'For rooms without a screen.')}
          {num('maxFailedAttempts', 'Wrong codes allowed', 'per class', 3, 10, 'Then the student is locked out until you unlock them.')}
        </div>

        <h4 className="at-section-title">Timing</h4>
        <div className="at-form-grid">
          {num('checkInMinutes', 'Check-in stays open', 'minutes', 3, 60)}
          {num('lateAfterMinutes', 'Marked late after', 'minutes', 0, 60)}
        </div>

        <h4 className="at-section-title">Location</h4>
        <div className="at-form-grid">
          {num('maxAccuracyMeters', 'Readings must be accurate to', '± metres', 5, 150, 'Rougher readings are refused.')}
          {num('radiusMeters', 'Allowed distance', 'metres', 10, 300, "Used when the lecturer's own location is the room centre. Saved classrooms have their own.")}
        </div>

        <h4 className="at-section-title">Second check</h4>
        <label className="at-switch">
          <input type="checkbox" checked={p.secondCheck} onChange={e => set('secondCheck', e.target.checked)} />
          <span className="at-switch-track" />
          <span>A second code at a random time during class</span>
        </label>
        <div className="at-form-grid" style={{ marginTop: 10 }}>
          {num('secondCheckMinutes', 'Second check stays open', 'minutes', 1, 10)}
        </div>

        {quizzesOn && <>
        <h4 className="at-section-title">Minimum attendance for quizzes</h4>
        <label className="at-switch">
          <input type="checkbox" checked={p.minimumRequired} onChange={e => set('minimumRequired', e.target.checked)} />
          <span className="at-switch-track" />
          <span>Block quizzes for students below the minimum</span>
        </label>
        <div className="at-form-grid" style={{ marginTop: 10 }}>
          {num('minimumPercent', 'Minimum attendance', '%', 1, 100)}
        </div>
        <p className="at-help">
          {p.mode === 'PROGRAMME'
            ? tx("By programme: a student below the minimum for their programme can't start any quiz.")
            : tx("By course: a student below the minimum for a course can't start that course's quizzes.")}
          {' '}{tx('Only finished classes this academic year count; excused absences are left out, so excusing raises the percentage. A quiz already started can always be finished.')}
        </p>
        </>}
        {error && <div className="at-alert is-error" role="alert" style={{ marginTop: 12, marginBottom: 0 }}><AlertTriangle size={16} /><span>{error}</span></div>}
      </div>
    </AppModal>
  );
}
