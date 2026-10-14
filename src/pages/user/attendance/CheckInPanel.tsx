import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, Lock, MapPin, ShieldAlert, Timer, UserCheck, XCircle } from 'lucide-react';
import { checkInToClass, getMyOpenClasses, type CheckInResult, type OpenClass } from '../../../api/attendance';
import { getDeviceId, readLocation, LocationError } from '../../../utils/attendanceDevice';
import { StatusPill, classTitle, errMsg, fmtClock } from '../../shared/attendance/shared';
import { tx } from '../../../utils/terms';
import '../../shared/attendance/attendance.css';

/**
 * Classes taking attendance right now, with a code box for each one that needs a code.
 * {@code compact}: the dashboard version, which renders nothing unless a class is open.
 */
export default function CheckInPanel({ compact = false }: { compact?: boolean }) {
  const { data, isLoading } = useQuery({
    queryKey: ['attendance', 'open'],
    queryFn: getMyOpenClasses,
    // A second check can appear at any time during class, so look again often while one is open
    refetchInterval: q => ((q.state.data?.sessions?.length ?? 0) > 0 ? 15_000 : 60_000),
    refetchIntervalInBackground: false,
  });
  const sessions = data?.sessions ?? [];

  if (compact) {
    if (!data?.enabled || sessions.length === 0) return null;
    return (
      <div className="at-card" style={{ marginBottom: 16 }}>
        <div className="at-card-head" style={{ marginBottom: 6 }}>
          <h3 className="at-card-title"><UserCheck size={18} /> Class attendance</h3>
        </div>
        {sessions.map(s => <ClassCard key={s.sessionId} s={s} />)}
      </div>
    );
  }

  if (isLoading) return <div className="at-card"><div className="at-empty"><Loader2 className="at-spin" size={22} /></div></div>;
  if (data && !data.enabled) {
    return <div className="at-card"><div className="at-empty"><UserCheck size={28} /><p>Class attendance is not switched on.</p></div></div>;
  }
  if (sessions.length === 0) {
    return (
      <div className="at-card">
        <div className="at-empty">
          <UserCheck size={28} />
          <p>{tx('No class is taking attendance right now. When your lecturer starts one, it appears here.')}</p>
        </div>
      </div>
    );
  }
  return <div style={{ marginBottom: 14 }}>{sessions.map(s => <ClassCard key={s.sessionId} s={s} />)}</div>;
}

type Stage = 'idle' | 'locating' | 'sending';

function ClassCard({ s }: { s: OpenClass }) {
  const qc = useQueryClient();
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<Stage>('idle');
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Local countdown for the open check, re-synced whenever the server answers
  const [left, setLeft] = useState<number | null>(s.phaseSecondsLeft);
  useEffect(() => setLeft(s.phaseSecondsLeft), [s.phaseSecondsLeft, s.phase]);
  useEffect(() => {
    if (left == null) return;
    const t = setInterval(() => setLeft(v => (v == null ? v : Math.max(0, v - 1))), 1000);
    return () => clearInterval(t);
  }, [left == null]);   // eslint-disable-line react-hooks/exhaustive-deps

  // A new check (the second one) starts with a clean box
  useEffect(() => { setCode(''); setResult(null); setError(null); }, [s.needsCheck]);

  const busy = stage !== 'idle';
  const needs = s.needsCheck;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const typed = code.replace(/\D/g, '');
    if (typed.length !== 5) { setError('Type all 5 digits of the code on the screen.'); inputRef.current?.focus(); return; }
    const deviceId = getDeviceId();
    if (!deviceId) { setError('This browser is blocking storage (private browsing?). Use your normal browser to check in.'); return; }
    setError(null);
    setResult(null);
    setAccuracy(null);
    setStage('locating');
    try {
      const loc = await readLocation({
        goodEnough: Math.min(15, s.maxAccuracyMeters / 2),
        maxWaitMs: 10000,
        onUpdate: r => setAccuracy(Math.round(r.accuracy)),
      });
      setStage('sending');
      const r = await checkInToClass({ sessionId: s.sessionId, code: typed, latitude: loc.latitude, longitude: loc.longitude, accuracy: loc.accuracy, deviceId });
      setResult({ ...r, message: tx(r.message) });
      if (r.ok) setCode('');
      else if (r.reason === 'WRONG_CODE' || r.reason === 'EXPIRED_CODE') { setCode(''); inputRef.current?.focus(); }
      qc.invalidateQueries({ queryKey: ['attendance'] });
    } catch (err: any) {
      setError(err instanceof LocationError ? err.message : errMsg(err, 'Could not check in. Check your connection and try again.'));
    } finally {
      setStage('idle');
    }
  };

  const phaseBadge = s.phase === 'CHECK_IN'
    ? <span className="at-phase"><Timer size={13} /> Check-in open{left != null ? ` · ${fmtClock(left)}` : ''}</span>
    : s.phase === 'SECOND_CHECK'
      ? <span className="at-phase is-second"><ShieldAlert size={13} /> Second check{left != null ? ` · ${fmtClock(left)}` : ''}</span>
      : <span className="at-phase is-quiet">Class in progress</span>;

  return (
    <article className={`at-class ${needs ? 'is-active' : ''}`} aria-live="polite">
      <div className="at-card-head" style={{ marginBottom: 4 }}>
        <div style={{ minWidth: 0 }}>
          <div className="at-item-title">{classTitle(s.title)}</div>
          <div className="at-meta">
            <span>Meeting {s.meetingNumber}</span>
            {s.topic && <span>{s.topic}</span>}
            {s.lecturer && <span>{s.lecturer}</span>}
            {s.placeName && <span><MapPin size={12} /> {s.placeName}</span>}
          </div>
        </div>
        {phaseBadge}
      </div>

      {s.status && (
        <div className="at-row" style={{ marginTop: 8 }}>
          <span style={{ fontSize: 12.5, color: '#475569', fontWeight: 600 }}>Your attendance:</span>
          <StatusPill status={s.status} />
          {s.firstChecked && s.secondChecked && <span className="at-chip">Second check done</span>}
        </div>
      )}

      {s.locked && needs !== 0 ? (
        <div className="at-alert is-error" style={{ marginTop: 12, marginBottom: 0 }}>
          <Lock size={16} />
          <span>{tx("You've used all your attempts for this class. If you are in class, ask your lecturer to unlock you.")}</span>
        </div>
      ) : needs !== 0 ? (
        <form className="at-checkin-form" onSubmit={submit} noValidate>
          <label htmlFor={`at-code-${s.sessionId}`} style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>
            {needs === 2 ? 'Second check: type the new code on the screen' : s.codeDisplay === 'READ_ALOUD' ? tx('Type the code your lecturer reads out') : 'Type the code on the screen'}
          </label>
          <input
            id={`at-code-${s.sessionId}`}
            ref={inputRef}
            className="at-code-input"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={5}
            placeholder="•••••"
            value={code}
            disabled={busy}
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
            aria-describedby={`at-help-${s.sessionId}`}
          />
          <button type="submit" className="at-btn at-btn-big at-btn-block" disabled={busy || code.length !== 5}>
            {stage === 'locating' ? <><Loader2 size={18} className="at-spin" /> Finding your location{accuracy != null ? ` (±${accuracy} m)` : '…'}</>
              : stage === 'sending' ? <><Loader2 size={18} className="at-spin" /> Checking in…</>
              : <><CheckCircle2 size={18} /> {needs === 2 ? 'Confirm I’m still here' : 'Check in'}</>}
          </button>
          <p id={`at-help-${s.sessionId}`} className="at-help" style={{ margin: 0 }}>
            <MapPin size={12} style={{ verticalAlign: '-2px' }} /> {tx('Location must be on. Codes change every few seconds, so type the one showing now.')}
            {s.attemptsLeft < 5 && ` ${s.attemptsLeft} attempt${s.attemptsLeft === 1 ? '' : 's'} left.`}
          </p>
        </form>
      ) : null}

      {error && (
        <div className="at-alert is-error" role="alert" style={{ marginTop: 12, marginBottom: 0 }}>
          <XCircle size={16} /><span>{error}</span>
        </div>
      )}
      {result && (
        <div className={`at-alert ${result.ok ? 'is-ok' : 'is-error'}`} role={result.ok ? 'status' : 'alert'} style={{ marginTop: 12, marginBottom: 0 }}>
          {result.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}<span>{result.message}</span>
        </div>
      )}
    </article>
  );
}
