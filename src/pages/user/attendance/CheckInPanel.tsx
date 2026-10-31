import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock, Loader2, Lock, MapPin, ScanLine, ShieldAlert, Timer, UserCheck, X, XCircle } from 'lucide-react';
import { checkInToClass, getMyOpenClasses, type CheckInResult, type OpenClass, type ScanResult } from '../../../api/attendance';
import { getDeviceId, readLocation, LocationError } from '../../../utils/attendanceDevice';
import QrScanner from '../../shared/attendance/QrScanner';
import { parseClassQr } from '../../shared/attendance/ClassQr';
import { StatusPill, classTitle, errMsg, fmtClock } from '../../shared/attendance/shared';
import { tx } from '../../../utils/terms';
import StudentQr from './StudentQr';
import { LocationStatus, useClassLocation } from './LocationStatus';
import '../../shared/attendance/attendance.css';

/** Location problems the live location panel explains (with steps), so the result box needn't repeat them. */
const PLACE_REASONS = new Set(['TOO_FAR', 'IMPRECISE', 'NO_GPS', 'NO_LOCATION']);
/** Wait this long for a precise reading before sending what there is (the server decides; it never counts as a wrong code). */
const FIX_OPTS = { goodEnough: 15, maxWaitMs: 12000 };

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

  const scanClass = s.method === 'STUDENT_SCAN';
  const [scanning, setScanning] = useState(false);

  // A new check (the second one) starts with a clean box
  useEffect(() => { setCode(''); setResult(null); setError(null); setScanning(false); }, [s.needsCheck]);

  const busy = stage !== 'idle';
  const needs = s.needsCheck;

  // Location runs from the moment the card needs it, so it is warm by the time a code is typed or
  // scanned (a code only lives a few seconds), and keeps running while a check-in waits on it
  const loc = useClassLocation(s.sessionId, needs !== 0 || s.needsScan || s.locationUnclear);
  const locate = useCallback(() => readLocation({ ...FIX_OPTS, onUpdate: r => setAccuracy(Math.round(r.accuracy)) }), []);

  const onScan = useCallback(async (text: string): Promise<ScanResult> => {
    const refuse = (message: string): ScanResult =>
      ({ ok: false, outcome: 'REFUSED', message, studentId: null, name: null, indexNo: null, photo: null, status: null });
    const qr = parseClassQr(text);
    if (!qr) return refuse(tx("That isn't a class attendance code. Scan the QR code your lecturer is showing."));
    if (qr.sessionId !== s.sessionId) return refuse(tx('That code is for a different class.'));
    const deviceId = getDeviceId();
    if (!deviceId) return refuse('This browser is blocking storage (private browsing?). Use your normal browser to check in.');
    let here;
    try { here = await locate(); }
    catch (err) { return refuse(err instanceof LocationError ? err.message : 'Your location could not be found. Turn on location and try again.'); }
    const r = await checkInToClass({ sessionId: s.sessionId, code: qr.code, latitude: here.latitude, longitude: here.longitude, accuracy: here.accuracy, deviceId, source: qr.source });
    const message = tx(r.message);
    if (r.ok) {
      setScanning(false);
      setError(null);
      setResult({ ...r, message });
    }
    qc.invalidateQueries({ queryKey: ['attendance'] });
    return { ok: r.ok, outcome: r.ok ? 'RECORDED' : r.reason === 'EXPIRED_CODE' ? 'EXPIRED' : 'REFUSED', message,
      studentId: null, name: null, indexNo: null, photo: null, status: r.status };
  }, [s.sessionId, locate, qc]);

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
      const here = await locate();
      setStage('sending');
      const r = await checkInToClass({ sessionId: s.sessionId, code: typed, latitude: here.latitude, longitude: here.longitude, accuracy: here.accuracy, deviceId });
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
    ? <span className="at-phase"><Timer size={13} /> {s.method === 'STAFF_SCAN' ? 'Scanning open' : 'Check-in open'}{left != null ? ` · ${fmtClock(left)}` : ''}</span>
    : s.phase === 'SECOND_CHECK'
      ? <span className="at-phase is-second"><ShieldAlert size={13} /> Second check{left != null ? ` · ${fmtClock(left)}` : ''}</span>
      : <span className="at-phase is-quiet">Class in progress</span>;

  return (
    <article className={`at-class ${needs || s.needsScan ? 'is-active' : ''}`} aria-live="polite">
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

      {s.method === 'STAFF_SCAN' ? (
        s.needsScan ? <StudentQr s={s} loc={loc} /> : null
      ) : s.locked && needs !== 0 ? (
        <div className="at-alert is-error" style={{ marginTop: 12, marginBottom: 0 }}>
          <Lock size={16} />
          <span>{tx("You've used all your attempts for this class. If you are in class, ask your lecturer to unlock you.")}</span>
        </div>
      ) : needs !== 0 && scanClass && scanning ? (
        <div className="at-checkin-scan">
          <QrScanner onCode={onScan} concurrent={false} hint={needs === 2 ? tx('Second check: point your camera at the new class QR code.') : tx('Point your camera at the class QR code your lecturer is showing.')} />
          <LocationStatus loc={loc} compact />
          {s.attemptsLeft < 5 && <div className="at-help" style={{ margin: 0, textAlign: 'center' }}>{s.attemptsLeft} attempt{s.attemptsLeft === 1 ? '' : 's'} left.</div>}
          <div className="at-checkin-alt">
            <button type="button" className="at-btn-ghost at-btn-sm" onClick={() => setScanning(false)}><X size={14} /> Close camera</button>
          </div>
        </div>
      ) : needs !== 0 && scanClass ? (
        <div className="at-checkin-form">
          <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>
            {needs === 2 ? 'Second check: scan the new class QR code' : tx('Scan the QR code your lecturer is showing')}
          </span>
          <button type="button" className="at-btn at-btn-big at-btn-block" onClick={() => { setResult(null); setError(null); setScanning(true); }}>
            <ScanLine size={18} /> {needs === 2 ? 'Scan for the second check' : 'Scan the class QR code'}
          </button>
          <LocationStatus loc={loc} />
          <p className="at-help" style={{ margin: 0 }}>
            <MapPin size={12} style={{ verticalAlign: '-2px' }} /> {tx('Location and camera must be allowed. The code changes every few seconds, so scan it live in class.')}
            {s.attemptsLeft < 5 && ` ${s.attemptsLeft} attempt${s.attemptsLeft === 1 ? '' : 's'} left.`}
          </p>
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
          <LocationStatus loc={loc} />
          <p id={`at-help-${s.sessionId}`} className="at-help" style={{ margin: 0 }}>
            <MapPin size={12} style={{ verticalAlign: '-2px' }} /> {tx('Location must be on. Codes change every few seconds, so type the one showing now.')}
            {s.attemptsLeft < 5 && ` ${s.attemptsLeft} attempt${s.attemptsLeft === 1 ? '' : 's'} left.`}
          </p>
        </form>
      ) : s.locationUnclear ? (
        <div className="at-checkin-form">
          <div className="at-alert is-warn" style={{ marginBottom: 0 }}>
            <Clock size={16} />
            <span>{tx("You're checked in, waiting for your lecturer because your location wasn't precise. Keep this page open: when your phone finds you in the room, it confirms on its own.")}</span>
          </div>
          <LocationStatus loc={loc} compact />
        </div>
      ) : null}

      {error && (
        <div className="at-alert is-error" role="alert" style={{ marginTop: 12, marginBottom: 0 }}>
          <XCircle size={16} /><span>{error}</span>
        </div>
      )}
      {result && !(result.ok && s.locationUnclear) && (
        <div className={`at-alert ${!result.ok ? 'is-error' : result.reason === 'LOCATION_UNCLEAR' ? 'is-warn' : 'is-ok'}`} role={result.ok ? 'status' : 'alert'} style={{ marginTop: 12, marginBottom: 0 }}>
          {!result.ok ? <XCircle size={16} /> : result.reason === 'LOCATION_UNCLEAR' ? <Clock size={16} /> : <CheckCircle2 size={16} />}
          <span>{result.message}{!result.ok && PLACE_REASONS.has(result.reason) ? ` ${tx('See the location box above for what to do.')}` : ''}</span>
        </div>
      )}
      {loc.verdict?.confirmed && !s.locationUnclear && (
        <div className="at-alert is-ok" role="status" style={{ marginTop: 12, marginBottom: 0 }}>
          <CheckCircle2 size={16} /><span>{tx(loc.verdict.message)}</span>
        </div>
      )}
    </article>
  );
}
