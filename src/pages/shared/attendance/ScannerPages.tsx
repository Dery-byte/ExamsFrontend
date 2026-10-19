import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2, QrCode, ScanLine, XCircle } from 'lucide-react';
import QrScanner from './QrScanner';
import ClassQr from './ClassQr';
import { getAttendanceCode, getHelperView, helperScan, scanStudentCode, type HelperView } from '../../../api/attendance';
import { classTitle, errMsg, fmtClock } from './shared';
import { tx } from '../../../utils/terms';
import './attendance.css';

/** The lecturer (or HOD / Super Admin) scanning students' QR codes from their own account. */
export function StaffScannerPage() {
  const { id } = useParams();
  const sessionId = Number(id);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { data, error, isError } = useQuery({
    queryKey: ['attendance', 'scanner', sessionId],
    queryFn: () => getAttendanceCode(sessionId),
    refetchInterval: 5000,
  });
  const onCode = useCallback((code: string) => scanStudentCode(sessionId, code), [sessionId]);
  const back = () => {
    const to = params.get('back');
    if (to && to.startsWith('/')) navigate(to);
    else navigate(-1);
  };

  return (
    <div className="at-scan-page">
      <ScanHeader title={data ? classTitle(data.title) : 'Scan students'} sub={data ? `Meeting ${data.meetingNumber}${data.placeName ? ` · ${data.placeName}` : ''}` : null}
        onBack={back} />
      {isError ? <Problem text={errMsg(error, 'This class could not be loaded.')} />
        : data && data.method !== 'STAFF_SCAN' ? <Problem text={data.method === 'STUDENT_SCAN'
            ? 'Students scan your class QR code in this class, so there is nothing for you to scan.'
            : 'Students type a code in this class, so there is nothing to scan.'} />
        : data && data.phase !== 'CHECK_IN' ? <Problem text={data.phase === 'ENDED' ? 'This class has ended.' : 'Check-in is closed. Reopen it from the session page to scan more students.'} />
        : (
          <>
            <QrScanner onCode={onCode} />
            {data && <Counts scanned={data.checkedIn} roster={data.rosterSize} closesIn={data.phaseSecondsLeft} />}
          </>
        )}
    </div>
  );
}

/**
 * A helper (teaching assistant) through the link the lecturer gave them; no account needed.
 * They scan students' codes, or, when students scan, their phone shows the class QR code.
 */
export function HelperScannerPage() {
  const { token = '' } = useParams();
  const { data, error, isError, isLoading } = useQuery({
    queryKey: ['attendance', 'helper', token],
    queryFn: () => getHelperView(token),
    // The class QR code changes every few seconds, so follow it closely
    refetchInterval: q => (q.state.data?.method === 'STUDENT_SCAN' ? 2000 : 5000),
    refetchIntervalInBackground: true,
    retry: false,
  });
  const showing = data?.method === 'STUDENT_SCAN';

  // The classroom is the one the lecturer set; the helper's own location isn't needed
  // (each student's code can only be shown from a phone inside that room)
  const onCode = useCallback((code: string) => helperScan(token, { code }), [token]);

  return (
    <div className="at-scan-page">
      <ScanHeader title={data ? classTitle(data.title) : 'Attendance scanner'} icon={showing ? <QrCode size={18} /> : undefined}
        sub={data ? `${showing ? 'Helping' : 'Scanning'} as ${data.helper} · meeting ${data.meetingNumber}${data.placeName ? ` · ${data.placeName}` : ''}` : null} />
      {isLoading ? <div className="at-scanner-msg" style={{ position: 'static', padding: 40 }}><Loader2 className="at-spin" size={26} /></div>
        : isError ? <Problem text={errMsg(error, 'This scanner link is not valid.')} />
        : data && showing ? <HelperClassQr data={data} />
        : data && data.phase !== 'CHECK_IN' ? <Problem text="Check-in for this class is closed. Ask the lecturer to reopen it if more students need scanning." />
        : (
          <>
            <QrScanner onCode={onCode} />
            {data && <Counts scanned={data.checkedIn} roster={data.rosterSize} closesIn={data.phaseSecondsLeft} mine={data.myScans} />}
          </>
        )}
    </div>
  );
}

/** The class QR code on the helper's phone, for students to scan; it follows the lecturer's code. */
function HelperClassQr({ data }: { data: HelperView }) {
  const [left, setLeft] = useState<number | null>(data.secondsLeft ?? null);
  useEffect(() => setLeft(data.secondsLeft ?? null), [data.secondsLeft, data.code]);
  useEffect(() => {
    const t = setInterval(() => setLeft(v => (v == null ? v : Math.max(0, v - 1))), 1000);
    return () => clearInterval(t);
  }, []);
  // Keep the phone's screen on while it is held up
  useEffect(() => {
    let lock: any = null;
    (navigator as any).wakeLock?.request?.('screen').then((l: any) => { lock = l; }).catch(() => {});
    return () => { lock?.release?.().catch?.(() => {}); };
  }, []);

  if (data.phase === 'ENDED') return <Problem text="This class has ended." />;
  if (!data.qr) {
    return (
      <div className="at-scan-problem" style={{ color: '#94a3b8' }}>
        <QrCode size={26} />
        <p>{tx('Check-in is closed. Keep this page open: if the lecturer starts a second check, its code appears here.')}</p>
      </div>
    );
  }
  const second = data.check === 2;
  const pct = data.codeSeconds && left != null ? (left / data.codeSeconds) * 100 : 0;
  return (
    <>
      <div className={`at-helper-card ${second ? 'is-second' : ''}`} aria-live="polite">
        <div className="at-helper-label">{second ? 'Second check: students scan this new code' : tx('Students scan this code')}</div>
        <ClassQr text={data.qr} className="at-helper-qr" />
        <div className="at-helper-digits">Can't scan? Type <span className="at-qr-digits">{data.code}</span></div>
        <div className="at-codebar"><span style={{ width: `${pct}%` }} /></div>
        <div className="at-helper-hint">New code in {left ?? '…'} s · hold the phone up, screen brightness up</div>
      </div>
      <Counts scanned={data.checkedIn} roster={data.rosterSize} closesIn={data.phaseSecondsLeft} closesLabel={second ? 'until the second check closes' : undefined} />
    </>
  );
}

function ScanHeader({ title, sub, onBack, icon }: { title: string; sub: string | null; onBack?: () => void; icon?: React.ReactNode }) {
  return (
    <div className="at-scan-head">
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="at-scan-title">{icon ?? <ScanLine size={18} />} {title}</div>
        {sub && <div className="at-scan-sub">{sub}</div>}
      </div>
      {onBack && <button className="at-screen-btn" onClick={onBack}><ArrowLeft size={16} /> Done</button>}
    </div>
  );
}

function Counts({ scanned, roster, closesIn, mine, closesLabel }: { scanned: number; roster: number; closesIn?: number | null; mine?: number; closesLabel?: string }) {
  return (
    <div className="at-scan-counts">
      <div><b>{scanned}</b><span>of {roster} {tx('students')} present</span></div>
      {mine != null && <div><b>{mine}</b><span>scanned by you</span></div>}
      {closesIn != null && <div><b>{fmtClock(closesIn)}</b><span>{closesLabel ?? 'until check-in closes'}</span></div>}
    </div>
  );
}

function Problem({ text }: { text: string }) {
  return <div className="at-scan-problem"><XCircle size={26} /><p>{text}</p></div>;
}
