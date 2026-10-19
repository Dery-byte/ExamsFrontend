import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { Loader2, MapPin, QrCode, Sun, XCircle } from 'lucide-react';
import { getMyQrKey, type OpenClass } from '../../../api/attendance';
import { getDeviceId, readLocation, LocationError } from '../../../utils/attendanceDevice';
import { cacheQrKey, cachedQrKey, qrCoder, type QrKey } from '../../../utils/attendanceQr';
import { errMsg } from '../../shared/attendance/shared';
import { tx } from '../../../utils/terms';

/**
 * Scanned classes: the student's personal QR code. Shown only after the phone and location checks
 * pass; it changes every 10 seconds, so a photo or screenshot of it is useless.
 */
export default function StudentQr({ s }: { s: OpenClass }) {
  const qc = useQueryClient();
  const [key, setKey] = useState<QrKey | null>(() => cachedQrKey(s.sessionId));
  const [stage, setStage] = useState<'idle' | 'locating' | 'fetching'>('idle');
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const show = async () => {
    setError(null);
    const deviceId = getDeviceId();
    if (!deviceId) { setError('This browser is blocking storage (private browsing?). Use your normal browser.'); return; }
    try {
      setStage('locating');
      setAccuracy(null);
      const loc = await readLocation({ goodEnough: Math.min(15, s.maxAccuracyMeters / 2), maxWaitMs: 10000, onUpdate: r => setAccuracy(Math.round(r.accuracy)) });
      setStage('fetching');
      const r = await getMyQrKey({ sessionId: s.sessionId, latitude: loc.latitude, longitude: loc.longitude, accuracy: loc.accuracy, deviceId });
      if (!r.ok || !r.key) { setError(tx(r.message)); return; }
      const k: QrKey = { key: r.key, sessionId: r.sessionId!, studentId: r.studentId!, stepSeconds: r.stepSeconds ?? 10,
        offsetMs: (r.serverTime ?? Date.now()) - Date.now(), name: r.name, indexNo: r.indexNo };
      cacheQrKey(k);
      setKey(k);
    } catch (e: any) {
      setError(e instanceof LocationError ? e.message : errMsg(e, 'Could not get your code. Check your connection and try again.'));
    } finally {
      setStage('idle');
    }
  };

  const refresh = useCallback(() => { qc.invalidateQueries({ queryKey: ['attendance'] }); }, [qc]);
  if (key) return <LiveCode k={key} onDone={refresh} />;
  return (
    <div className="at-checkin-form">
      <button type="button" className="at-btn at-btn-big at-btn-block" onClick={show} disabled={stage !== 'idle'}>
        {stage === 'locating' ? <><Loader2 size={18} className="at-spin" /> Finding your location{accuracy != null ? ` (±${accuracy} m)` : '…'}</>
          : stage === 'fetching' ? <><Loader2 size={18} className="at-spin" /> Getting your code…</>
          : <><QrCode size={18} /> Show my attendance QR code</>}
      </button>
      <p className="at-help" style={{ margin: 0 }}>
        <MapPin size={12} style={{ verticalAlign: '-2px' }} /> {tx('Your lecturer scans this class. Location must be on; then hold up your code to be scanned.')}
      </p>
      {error && <div className="at-alert is-error" role="alert" style={{ marginBottom: 0 }}><XCircle size={16} /><span>{error}</span></div>}
    </div>
  );
}

/** The code itself, redrawn every step, with a countdown; asks the server every few seconds whether it was scanned. */
function LiveCode({ k, onDone }: { k: QrKey; onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [left, setLeft] = useState(k.stepSeconds);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    let stop = false;
    let lastStep = -1;
    let coder: Awaited<ReturnType<typeof qrCoder>> | null = null;
    const draw = async () => {
      if (stop) return;
      try {
        if (!coder) coder = await qrCoder(k);
        const { step, secondsLeft } = coder.now();
        setLeft(secondsLeft);
        if (step !== lastStep && canvasRef.current) {
          lastStep = step;
          const text = await coder.code(step);
          await QRCode.toCanvas(canvasRef.current, text, { errorCorrectionLevel: 'M', margin: 2, width: 320, color: { dark: '#0f172a', light: '#ffffff' } });
        }
      } catch (e: any) {
        setProblem(e?.message ?? 'Could not draw the code.');
      }
    };
    draw();
    const t = setInterval(draw, 500);
    return () => { stop = true; clearInterval(t); };
  }, [k]);

  // Has the lecturer scanned it yet?
  useEffect(() => {
    const t = setInterval(onDone, 5000);
    return () => clearInterval(t);
  }, [onDone]);

  // Keep the screen on while the code is up
  useEffect(() => {
    let lock: any = null;
    (navigator as any).wakeLock?.request?.('screen').then((l: any) => { lock = l; }).catch(() => {});
    return () => { lock?.release?.().catch?.(() => {}); };
  }, []);

  if (problem) return <div className="at-alert is-error" role="alert" style={{ marginTop: 12, marginBottom: 0 }}><XCircle size={16} /><span>{problem}</span></div>;
  return (
    <div className="at-qr">
      <div className="at-qr-who">
        <b>{k.name}</b>
        {k.indexNo && <span>{k.indexNo}</span>}
      </div>
      <canvas ref={canvasRef} className="at-qr-canvas" aria-label="Your attendance QR code" role="img" />
      <div className="at-bar" style={{ width: '100%', maxWidth: 320 }}><span style={{ width: `${(left / k.stepSeconds) * 100}%`, transition: 'width 0.5s linear' }} /></div>
      <p className="at-help" style={{ textAlign: 'center', margin: 0 }}>
        <Sun size={12} style={{ verticalAlign: '-2px' }} /> {tx('Turn your screen brightness up and hold the phone still for your lecturer to scan. The code changes every few seconds, so photos of it do not work.')}
      </p>
    </div>
  );
}
