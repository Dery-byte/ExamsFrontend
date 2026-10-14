import { useMemo, useState } from 'react';
import { Loader2, MapPin, Play, XCircle } from 'lucide-react';
import AppModal from '../../../components/ui/AppModal';
import {
  startAttendanceSession, type AttendanceMode, type AttendanceOptions, type ClassScheduleItem, type Classroom, type CodeDisplay,
} from '../../../api/attendance';
import { readLocation, LocationError, GUESSED_LOCATION_METERS } from '../../../utils/attendanceDevice';
import { classTitle, errMsg, fmtTime } from './shared';
import { levelName, tx } from '../../../utils/terms';

const LENGTHS = [30, 45, 60, 90, 120, 150, 180, 240];

/** Starts a class meeting: what class, where, how the code is shown, and how long. */
export default function StartSessionDialog({ options, classrooms, schedule, onClose, onStarted }: {
  options: AttendanceOptions; classrooms: Classroom[]; schedule?: ClassScheduleItem | null;
  onClose: () => void; onStarted: (sessionId: number) => void;
}) {
  const policy = options.policy;
  const canCourse = options.courses.length > 0;
  const canProgramme = options.programs.length > 0;
  const [scope, setScope] = useState<AttendanceMode>(canCourse ? 'COURSE' : 'PROGRAMME');
  const [courseId, setCourseId] = useState<number | ''>(options.courses.length === 1 ? options.courses[0].id : '');
  const [programId, setProgramId] = useState<number | ''>(options.programs.length === 1 ? options.programs[0].id : '');
  const [level, setLevel] = useState<number | ''>('');
  const [place, setPlace] = useState<'ROOM' | 'HERE'>(schedule?.classroomId || classrooms.length > 0 ? 'ROOM' : 'HERE');
  const [classroomId, setClassroomId] = useState<number | ''>(schedule?.classroomId ?? (classrooms.length === 1 ? classrooms[0].id : ''));
  const [display, setDisplay] = useState<CodeDisplay>('PROJECTOR');
  const [minutes, setMinutes] = useState(120);
  const [topic, setTopic] = useState('');
  const [secondCheck, setSecondCheck] = useState(policy.secondCheck);
  const [busy, setBusy] = useState<'' | 'locating' | 'starting'>('');
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const program = useMemo(() => options.programs.find(p => p.id === programId), [options.programs, programId]);

  const ready = schedule ? (place === 'HERE' || classroomId !== '')
    : (scope === 'COURSE' ? courseId !== '' : programId !== '') && (place === 'HERE' || classroomId !== '');

  const start = async () => {
    setError(null);
    let loc: { latitude: number; longitude: number; accuracy: number } | null = null;
    try {
      if (place === 'HERE') {
        setBusy('locating');
        setAccuracy(null);
        loc = await readLocation({ goodEnough: Math.min(10, policy.maxAccuracyMeters / 2), maxWaitMs: 15000, onUpdate: r => setAccuracy(Math.round(r.accuracy)) });
        if (loc.accuracy > GUESSED_LOCATION_METERS) {
          setError(`This device can't find where it is: it is only guessing from the internet connection (about ${Math.round(loc.accuracy / 1000)} km off). `
            + 'Start the session on a phone with location (GPS) on, or pick a saved classroom.');
          return;
        }
        if (loc.accuracy > policy.maxAccuracyMeters) {
          setError(`Your location is only accurate to ±${Math.round(loc.accuracy)} m; it needs to be ±${policy.maxAccuracyMeters} m or better. `
            + 'Use a phone with GPS on (laptops are usually less precise), stand near a window, or pick a saved classroom.');
          return;
        }
      }
      setBusy('starting');
      const s = await startAttendanceSession({
        ...(schedule ? { scheduleId: schedule.id } : scope === 'COURSE'
          ? { scope, courseId: Number(courseId) }
          : { scope, programId: Number(programId), level: level === '' ? null : Number(level) }),
        ...(place === 'ROOM' ? { classroomId: Number(classroomId) } : { latitude: loc!.latitude, longitude: loc!.longitude, accuracy: loc!.accuracy }),
        codeDisplay: display,
        ...(schedule ? {} : { durationMinutes: minutes }),
        topic: topic.trim() || undefined,
        secondCheck,
      });
      onStarted(s.id);
    } catch (e: any) {
      setError(e instanceof LocationError ? e.message : errMsg(e, 'Could not start the session.'));
    } finally {
      setBusy('');
    }
  };

  return (
    <AppModal
      title="Start class attendance"
      subtitle={schedule ? `${classTitle(schedule.title)} · ${schedule.startTime.slice(0, 5)}–${schedule.endTime.slice(0, 5)}` : tx('Students check in on their own phones with the code you show.')}
      onClose={busy ? () => {} : onClose}
      size="md"
      footer={
        <div className="at-row" style={{ width: '100%', justifyContent: 'flex-end' }}>
          <button type="button" className="at-btn-ghost" onClick={onClose} disabled={!!busy}>Cancel</button>
          <button type="button" className="at-btn" onClick={start} disabled={!ready || !!busy}>
            {busy === 'locating' ? <><Loader2 size={16} className="at-spin" /> Reading location{accuracy != null ? ` ±${accuracy} m` : '…'}</>
              : busy === 'starting' ? <><Loader2 size={16} className="at-spin" /> Starting…</>
              : <><Play size={16} /> Start session</>}
          </button>
        </div>
      }
    >
      <div className="at-page" style={{ paddingBottom: 0 }}>
        {!schedule && (
          <>
            {canCourse && canProgramme && (
              <div className="at-choices" style={{ marginBottom: 12 }}>
                {(['COURSE', 'PROGRAMME'] as const).map(v => (
                  <label key={v} className={`at-choice ${scope === v ? 'is-on' : ''}`}>
                    <input type="radio" name="at-scope" checked={scope === v} onChange={() => setScope(v)} />
                    <span><b>{v === 'COURSE' ? tx('A course') : tx('A programme')}</b></span>
                  </label>
                ))}
              </div>
            )}
            <div className="at-form-grid">
              {scope === 'COURSE' ? (
                <label className="at-field at-span-2"><span>{tx('Course')}</span>
                  <select className="at-select" value={courseId} onChange={e => setCourseId(e.target.value ? Number(e.target.value) : '')}>
                    <option value="">{tx('Choose a course…')}</option>
                    {options.courses.map(c => <option key={c.id} value={c.id}>{[c.code, c.title].filter(Boolean).join(' · ')}</option>)}
                  </select>
                </label>
              ) : (
                <>
                  <label className="at-field"><span>{tx('Programme')}</span>
                    <select className="at-select" value={programId} onChange={e => { setProgramId(e.target.value ? Number(e.target.value) : ''); setLevel(''); }}>
                      <option value="">{tx('Choose a programme…')}</option>
                      {options.programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </label>
                  <label className="at-field"><span>{tx('Level')}</span>
                    <select className="at-select" value={level} onChange={e => setLevel(e.target.value ? Number(e.target.value) : '')} disabled={!program}>
                      <option value="">{tx('Every level')}</option>
                      {program?.levels.map(l => <option key={l} value={l}>{levelName(l)}</option>)}
                    </select>
                  </label>
                </>
              )}
            </div>
          </>
        )}

        <h4 className="at-section-title">Where</h4>
        <div className="at-choices">
          <label className={`at-choice ${place === 'ROOM' ? 'is-on' : ''}`}>
            <input type="radio" name="at-place" checked={place === 'ROOM'} onChange={() => setPlace('ROOM')} disabled={classrooms.length === 0} />
            <span><b>A saved classroom</b><small>{classrooms.length ? 'Its measured position and allowed distance are used.' : 'No classrooms saved yet. Add them under Classrooms.'}</small></span>
          </label>
          <label className={`at-choice ${place === 'HERE' ? 'is-on' : ''}`}>
            <input type="radio" name="at-place" checked={place === 'HERE'} onChange={() => setPlace('HERE')} />
            <span><b>Where I am now</b><small>Your device's location becomes the room centre ({policy.radiusMeters} m allowed). Needs ±{policy.maxAccuracyMeters} m or better.</small></span>
          </label>
        </div>
        {place === 'ROOM' && classrooms.length > 0 && (
          <label className="at-field" style={{ marginTop: 10 }}><span>Classroom</span>
            <select className="at-select" value={classroomId} onChange={e => setClassroomId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Choose a classroom…</option>
              {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}{c.building ? `, ${c.building}` : ''} ({c.radiusMeters} m)</option>)}
            </select>
          </label>
        )}

        <h4 className="at-section-title">How you show the code</h4>
        <div className="at-choices">
          <label className={`at-choice ${display === 'PROJECTOR' ? 'is-on' : ''}`}>
            <input type="radio" name="at-display" checked={display === 'PROJECTOR'} onChange={() => setDisplay('PROJECTOR')} />
            <span><b>On a projector or screen</b><small>A new code every {policy.codeSeconds} seconds. A code sent to someone outside is dead before they can use it.</small></span>
          </label>
          <label className={`at-choice ${display === 'READ_ALOUD' ? 'is-on' : ''}`}>
            <input type="radio" name="at-display" checked={display === 'READ_ALOUD'} onChange={() => setDisplay('READ_ALOUD')} />
            <span><b>Read aloud (no screen)</b><small>A new code every {Math.round(policy.readAloudCodeSeconds / 6) / 10} min. Every check-in waits for you to approve it.</small></span>
          </label>
        </div>

        <div className="at-form-grid" style={{ marginTop: 12 }}>
          {schedule ? (
            <div className="at-field"><span>Class ends</span><div className="at-sub" style={{ fontSize: 13.5 }}>{schedule.endTime.slice(0, 5)} (from the class times)</div></div>
          ) : (
            <label className="at-field"><span>Class length</span>
              <select className="at-select" value={minutes} onChange={e => setMinutes(Number(e.target.value))}>
                {LENGTHS.map(m => <option key={m} value={m}>{m < 60 ? `${m} minutes` : `${m / 60} hour${m === 60 ? '' : 's'}`}</option>)}
              </select>
            </label>
          )}
          <label className="at-field"><span>Topic (optional)</span>
            <input className="at-input" value={topic} maxLength={200} onChange={e => setTopic(e.target.value)} placeholder="e.g. Linked lists" />
          </label>
        </div>

        <label className="at-switch" style={{ marginTop: 14 }}>
          <input type="checkbox" checked={secondCheck} onChange={e => setSecondCheck(e.target.checked)} />
          <span className="at-switch-track" />
          <span>Second check at a random time during class</span>
        </label>
        <p className="at-help">A new code appears unannounced (it stays open {policy.secondCheckMinutes} min). Students need both checks to be marked present, which also catches anyone who leaves early.</p>
        <p className="at-help">Check-in stays open {policy.checkInMinutes} minutes; after {policy.lateAfterMinutes} minutes students are marked late. Started at {fmtTime(new Date().toISOString())}.</p>

        {place === 'HERE' && busy !== 'locating' && !error && (
          <div className="at-alert is-info" style={{ marginTop: 12, marginBottom: 0 }}>
            <MapPin size={16} /><span>Start this from inside the classroom. Your browser will ask to use your location.</span>
          </div>
        )}
        {error && <div className="at-alert is-error" role="alert" style={{ marginTop: 12, marginBottom: 0 }}><XCircle size={16} /><span>{error}</span></div>}
      </div>
    </AppModal>
  );
}
