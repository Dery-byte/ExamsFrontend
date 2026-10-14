import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2, MapPin, ScanLine, XCircle } from 'lucide-react';
import QrScanner from './QrScanner';
import { getAttendanceCode, getHelperView, helperScan, scanStudentCode } from '../../../api/attendance';
import { classTitle, errMsg, fmtClock } from './shared';
import { GUESSED_LOCATION_METERS, type Reading } from '../../../utils/attendanceDevice';
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
        : data && data.method !== 'STAFF_SCAN' ? <Problem text="Students type a code in this class, so there is nothing to scan." />
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

/** A helper (teaching assistant) scanning through the link the lecturer gave them; no account needed. */
export function HelperScannerPage() {
  const { token = '' } = useParams();
  const { data, error, isError, isLoading } = useQuery({
    queryKey: ['attendance', 'helper', token],
    queryFn: () => getHelperView(token),
    refetchInterval: 5000,
    retry: false,
  });

  // The helper's phone must be in the room: keep the latest reading and send it with each scan
  const [loc, setLoc] = useState<Reading | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const locRef = useRef<Reading | null>(null);
  useEffect(() => {
    if (!window.isSecureContext || !navigator.geolocation) { setLocError('Location only works on a secure (https) page.'); return; }
    const w = navigator.geolocation.watchPosition(
      p => {
        const r = { latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy };
        locRef.current = r;
        setLoc(r);
        setLocError(null);
      },
      e => setLocError(e.code === e.PERMISSION_DENIED
        ? 'Location is blocked. Allow location for this site: helpers must scan from inside the classroom.'
        : 'Your location could not be found. Turn on location (GPS).'),
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    return () => navigator.geolocation.clearWatch(w);
  }, []);

  const onCode = useCallback((code: string) => {
    const r = locRef.current;
    return helperScan(token, { code, latitude: r?.latitude, longitude: r?.longitude, accuracy: r?.accuracy });
  }, [token]);

  const acc = loc ? Math.round(loc.accuracy) : null;
  return (
    <div className="at-scan-page">
      <ScanHeader title={data ? classTitle(data.title) : 'Attendance scanner'}
        sub={data ? `Scanning as ${data.helper} · meeting ${data.meetingNumber}${data.placeName ? ` · ${data.placeName}` : ''}` : null} />
      {isLoading ? <div className="at-scanner-msg" style={{ position: 'static', padding: 40 }}><Loader2 className="at-spin" size={26} /></div>
        : isError ? <Problem text={errMsg(error, 'This scanner link is not valid.')} />
        : data && data.phase !== 'CHECK_IN' ? <Problem text="Check-in for this class is closed. Ask the lecturer to reopen it if more students need scanning." />
        : (
          <>
            <div className={`at-loc-bar ${locError || (acc != null && acc > (data?.maxAccuracyMeters ?? 30)) ? 'is-bad' : acc != null ? 'is-ok' : ''}`}>
              <MapPin size={14} />
              {locError ? locError
                : acc == null ? 'Finding your location…'
                : acc > GUESSED_LOCATION_METERS ? 'This device is only guessing its location. Use a phone with location (GPS) on.'
                : acc > (data?.maxAccuracyMeters ?? 30) ? `Location ±${acc} m: not precise enough yet. Wait a moment, or move away from walls.`
                : `Location ±${acc} m`}
            </div>
            <QrScanner onCode={onCode} />
            {data && <Counts scanned={data.checkedIn} roster={data.rosterSize} closesIn={data.phaseSecondsLeft} mine={data.myScans} />}
          </>
        )}
    </div>
  );
}

function ScanHeader({ title, sub, onBack }: { title: string; sub: string | null; onBack?: () => void }) {
  return (
    <div className="at-scan-head">
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="at-scan-title"><ScanLine size={18} /> {title}</div>
        {sub && <div className="at-scan-sub">{sub}</div>}
      </div>
      {onBack && <button className="at-screen-btn" onClick={onBack}><ArrowLeft size={16} /> Done</button>}
    </div>
  );
}

function Counts({ scanned, roster, closesIn, mine }: { scanned: number; roster: number; closesIn?: number | null; mine?: number }) {
  return (
    <div className="at-scan-counts">
      <div><b>{scanned}</b><span>of {roster} {tx('students')} present</span></div>
      {mine != null && <div><b>{mine}</b><span>scanned by you</span></div>}
      {closesIn != null && <div><b>{fmtClock(closesIn)}</b><span>until check-in closes</span></div>}
    </div>
  );
}

function Problem({ text }: { text: string }) {
  return <div className="at-scan-problem"><XCircle size={26} /><p>{text}</p></div>;
}
