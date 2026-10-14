import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Maximize2, Minimize2, QrCode } from 'lucide-react';
import { getAttendanceCode } from '../../../api/attendance';
import { classTitle, errMsg, fmtClock } from './shared';
import { tx } from '../../../utils/terms';
import './attendance.css';

/** Full-screen code for the projector. Large enough to read from the back of a hall; nothing else to distract. */
export default function ProjectorScreen() {
  const { id } = useParams();
  const sessionId = Number(id);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { data, error, isError } = useQuery({
    queryKey: ['attendance', 'screen', sessionId],
    queryFn: () => getAttendanceCode(sessionId),
    refetchInterval: 2000,
    refetchIntervalInBackground: true,
  });

  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => setLeft(data?.secondsLeft ?? null), [data?.secondsLeft, data?.code]);
  useEffect(() => {
    const t = setInterval(() => setLeft(v => (v == null ? v : Math.max(0, v - 1))), 1000);
    return () => clearInterval(t);
  }, []);

  const [full, setFull] = useState(false);
  useEffect(() => {
    const on = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);
  // Keep the projector awake while the code is up
  useEffect(() => {
    let lock: any = null;
    const nav: any = navigator;
    nav.wakeLock?.request?.('screen').then((l: any) => { lock = l; }).catch(() => {});
    return () => { lock?.release?.().catch?.(() => {}); };
  }, []);

  const toggleFull = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen?.().catch(() => {});
  };
  const back = () => {
    const to = params.get('back');
    if (to && to.startsWith('/')) navigate(to);
    else if (window.history.length > 1) navigate(-1);
    else window.close();
  };

  const second = data?.phase === 'SECOND_CHECK';
  const showing = !!data?.code || (data?.method === 'STAFF_SCAN' && data?.phase === 'CHECK_IN');
  const pct = data?.codeSeconds && left != null ? (left / data.codeSeconds) * 100 : 0;

  return (
    <div className={`at-screen ${second ? 'is-second' : showing ? '' : 'is-quiet'}`}>
      <div className="at-screen-top">
        <div style={{ minWidth: 0 }}>
          <div className="at-screen-title">{data ? classTitle(data.title) : 'Class attendance'}</div>
          {data && <div className="at-screen-sub">Meeting {data.meetingNumber}{data.placeName ? ` · ${data.placeName}` : ''}</div>}
        </div>
        <div className="at-row">
          <button className="at-screen-btn" onClick={toggleFull}>{full ? <Minimize2 size={16} /> : <Maximize2 size={16} />} {full ? 'Exit full screen' : 'Full screen'}</button>
          <button className="at-screen-btn" onClick={back}><ArrowLeft size={16} /> Back</button>
        </div>
      </div>

      <div className="at-screen-main" aria-live="polite">
        {isError ? (
          <div className="at-screen-label">{errMsg(error, 'The code could not be loaded.')}</div>
        ) : !data ? (
          <div className="at-screen-label">Loading…</div>
        ) : data.method === 'STAFF_SCAN' && data.phase === 'CHECK_IN' ? (
          <>
            <QrCode size={96} aria-hidden="true" style={{ opacity: 0.9 }} />
            <div className="at-screen-label">{tx('Open Attendance on your phone and tap “Show my attendance QR code”')}</div>
            <div className="at-screen-hint">Location must be on. Hold your code up when your lecturer comes to scan it. Photos of codes do not work.</div>
          </>
        ) : showing ? (
          <>
            <div className="at-screen-label">{second ? 'Second check: type this new code' : tx('Open Attendance on your phone and type')}</div>
            <div className="at-screen-code">{data.code}</div>
            <div className="at-screen-bar" aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>
            <div className="at-screen-hint">
              New code in {left ?? '…'} s · {second ? 'second check' : 'check-in'} closes in {fmtClock(data.phaseSecondsLeft ?? 0)} · location must be on
            </div>
          </>
        ) : (
          <>
            <div className="at-screen-label">{data.phase === 'ENDED' ? 'This class has ended.' : 'Check-in is closed.'}</div>
            {data.phase !== 'ENDED' && <div className="at-screen-hint">{tx('If you are here and could not check in, see your lecturer.')}</div>}
          </>
        )}
      </div>

      {data && (
        <div className="at-screen-stats">
          <div><b>{data.checkedIn}</b><span>checked in</span></div>
          <div><b>{data.rosterSize}</b><span>on the list</span></div>
          {second && <div><b>{data.secondChecked}</b><span>second check</span></div>}
        </div>
      )}
    </div>
  );
}
