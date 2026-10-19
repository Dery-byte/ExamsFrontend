import { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { CameraOff, CheckCircle2, Info, Loader2, RefreshCw, XCircle } from 'lucide-react';
import type { ScanResult } from '../../../api/attendance';
import AvatarPhoto from '../../../components/common/AvatarPhoto';

/**
 * Camera QR scanner for attendance. Uses the browser's BarcodeDetector where there is one (fast,
 * Android Chrome) and jsQR otherwise (iPhone Safari, desktop). Each scan is sent once; the same code
 * isn't re-sent for a few seconds, and nothing is read while a scan is being recorded.
 */
export default function QrScanner({ onCode, paused = false, hint }: {
  onCode: (code: string) => Promise<ScanResult>;
  paused?: boolean;
  /** What to point the camera at (shown until the first result). */
  hint?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [camera, setCamera] = useState<'starting' | 'on' | 'blocked' | 'none'>('starting');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [sending, setSending] = useState(false);
  const busy = useRef(false);
  const recent = useRef<Map<string, number>>(new Map());
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();
  const [attempt, setAttempt] = useState(0);

  const handle = useCallback(async (text: string) => {
    const now = Date.now();
    for (const [k, t] of recent.current) if (now - t > 4000) recent.current.delete(k);
    if (busy.current || recent.current.has(text)) return;
    busy.current = true;
    recent.current.set(text, now);
    setSending(true);
    try {
      const r = await onCode(text);
      setResult(r);
      if (r.outcome === 'RECORDED') navigator.vibrate?.(80);
      else if (!r.ok) navigator.vibrate?.([60, 60, 60]);
    } catch (e: any) {
      setResult({ ok: false, outcome: 'REFUSED', message: e?.response?.data?.message ?? 'Could not record the scan. Check the connection.',
        studentId: null, name: null, indexNo: null, photo: null, status: null });
    } finally {
      setSending(false);
      busy.current = false;
      clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setResult(null), 3500);
    }
  }, [onCode]);

  // Camera
  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    setCamera('starting');
    if (!navigator.mediaDevices?.getUserMedia) { setCamera('none'); return; }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
      .then(s => {
        if (cancelled) { s.getTracks().forEach(t => t.stop()); return; }
        stream = s;
        const v = videoRef.current;
        if (v) { v.srcObject = s; v.play().catch(() => {}); }
        setCamera('on');
      })
      .catch(err => setCamera(err?.name === 'NotFoundError' || err?.name === 'OverconstrainedError' ? 'none' : 'blocked'));
    return () => { cancelled = true; stream?.getTracks().forEach(t => t.stop()); };
  }, [attempt]);

  // Reading loop
  useEffect(() => {
    if (camera !== 'on') return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const Detector = (window as any).BarcodeDetector;
    let detector: any = null;
    try { if (Detector) detector = new Detector({ formats: ['qr_code'] }); } catch { detector = null; }

    const tick = async () => {
      if (stop) return;
      const v = videoRef.current, c = canvasRef.current;
      if (!paused && !busy.current && v && c && v.readyState >= 2 && v.videoWidth > 0) {
        try {
          let text: string | null = null;
          if (detector) {
            const codes = await detector.detect(v);
            text = codes?.[0]?.rawValue ?? null;
          } else {
            // Decode a centred square at a modest size: fast enough on older phones
            const side = Math.min(v.videoWidth, v.videoHeight);
            const size = Math.min(side, 640);
            c.width = size; c.height = size;
            const ctx = c.getContext('2d', { willReadFrequently: true });
            if (ctx) {
              ctx.drawImage(v, (v.videoWidth - side) / 2, (v.videoHeight - side) / 2, side, side, 0, 0, size, size);
              const img = ctx.getImageData(0, 0, size, size);
              text = jsQR(img.data, size, size, { inversionAttempts: 'dontInvert' })?.data ?? null;
            }
          }
          if (text) handle(text);
        } catch { /* try again on the next frame */ }
      }
      timer = setTimeout(tick, detector ? 150 : 220);
    };
    tick();
    return () => { stop = true; clearTimeout(timer); };
  }, [camera, paused, handle]);

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  const tone = !result ? '' : result.outcome === 'RECORDED' ? 'is-ok' : result.outcome === 'ALREADY' ? 'is-info' : 'is-bad';
  return (
    <div className="at-scanner">
      <div className="at-scanner-view">
        <video ref={videoRef} playsInline muted aria-label="Camera" />
        <canvas ref={canvasRef} hidden />
        {camera === 'on' && <div className="at-scanner-frame" aria-hidden="true" />}
        {camera === 'starting' && <div className="at-scanner-msg"><Loader2 size={26} className="at-spin" /><span>Starting the camera…</span></div>}
        {(camera === 'blocked' || camera === 'none') && (
          <div className="at-scanner-msg">
            <CameraOff size={28} />
            <span>{camera === 'blocked'
              ? 'The camera is blocked for this site. Allow camera access in the browser settings, then try again.'
              : 'No camera was found. Scan from a phone or a laptop with a camera.'}</span>
            <button className="at-screen-btn" onClick={() => setAttempt(a => a + 1)}><RefreshCw size={15} /> Try again</button>
          </div>
        )}
        {sending && <div className="at-scanner-sending"><Loader2 size={18} className="at-spin" /> Recording…</div>}
      </div>

      <div className={`at-scan-result ${tone}`} role="status" aria-live="assertive">
        {result ? (
          <>
            <div className="at-scan-photo" aria-hidden="true">
              {/* The student's photo, so the scanner can check it is them; initials if there is none (or it won't load) */}
              <AvatarPhoto src={result.photo}>
                {result.name ? initials(result.name) : result.outcome === 'RECORDED' ? <CheckCircle2 size={26} /> : <XCircle size={26} />}
              </AvatarPhoto>
            </div>
            <div style={{ minWidth: 0 }}>
              {result.name && <div className="at-scan-name">{result.name}</div>}
              {result.indexNo && <div className="at-scan-index">{result.indexNo}</div>}
              <div className="at-scan-msg">{result.message}</div>
            </div>
          </>
        ) : (
          <div className="at-scan-hint"><Info size={16} /> {hint ?? "Point the camera at a student's attendance code. Check the name (and photo) matches the person."}</div>
        )}
      </div>
    </div>
  );
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join('');
}
