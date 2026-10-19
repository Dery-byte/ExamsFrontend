import { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { CameraOff, CheckCircle2, Flashlight, FlashlightOff, Info, Loader2, RefreshCw, XCircle } from 'lucide-react';
import type { ScanResult } from '../../../api/attendance';
import AvatarPhoto from '../../../components/common/AvatarPhoto';

/**
 * Camera QR scanner for attendance, tuned for speed:
 * - reads every camera frame it can (requestVideoFrameCallback / requestAnimationFrame), not on a timer;
 * - uses the browser's BarcodeDetector where there is one (Android Chrome), else jsQR in a Web Worker
 *   so the page never stutters, alternating a close-up centre crop and the whole (scaled) frame so a
 *   phone held up close and a projector across the room are both read;
 * - with {@code concurrent}, keeps reading while earlier scans are still being recorded, so staff can
 *   move straight on to the next student;
 * - beeps / buzzes the moment a code is read, then again with the outcome.
 * The same code (for a student's code: the same student) isn't re-sent for a few seconds.
 */
export default function QrScanner({ onCode, paused = false, hint, concurrent = true }: {
  onCode: (code: string) => Promise<ScanResult>;
  paused?: boolean;
  /** What to point the camera at (shown until the first result). */
  hint?: string;
  /** Keep reading while a scan is being recorded (staff scanning a queue). False: one at a time. */
  concurrent?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const [camera, setCamera] = useState<'starting' | 'on' | 'blocked' | 'none'>('starting');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [sending, setSending] = useState(0);
  const [flash, setFlash] = useState(false);
  const [torch, setTorch] = useState<boolean | null>(null);   // null: the camera has no torch
  const inFlight = useRef(0);
  const recent = useRef<Map<string, number>>(new Map());      // key -> time it may be read again
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();
  const flashTimer = useRef<ReturnType<typeof setTimeout>>();
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const [attempt, setAttempt] = useState(0);

  const handle = useCallback(async (text: string) => {
    const now = Date.now();
    for (const [k, until] of recent.current) if (until < now) recent.current.delete(k);
    const key = dedupeKey(text);
    if (recent.current.has(key) || (!concurrent && inFlight.current > 0)) return;
    recent.current.set(key, now + 4000);
    inFlight.current++;
    setSending(n => n + 1);
    // Instant "got it", before the server answers
    tone('read');
    navigator.vibrate?.(30);
    setFlash(true);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(false), 250);
    let r: ScanResult;
    try {
      r = await onCode(text);
    } catch (e: any) {
      r = { ok: false, outcome: 'REFUSED', message: e?.response?.data?.message ?? 'Could not record the scan. Check the connection.',
        studentId: null, name: null, indexNo: null, photo: null, status: null };
    }
    inFlight.current--;
    setSending(n => n - 1);
    // Recorded: leave that student alone for a while. Refused: let them try again soon.
    recent.current.set(key, Date.now() + (r.outcome === 'RECORDED' || r.outcome === 'ALREADY' ? 8000 : 2500));
    setResult(r);
    if (r.outcome === 'RECORDED') { tone('ok'); navigator.vibrate?.(80); }
    else if (r.outcome === 'ALREADY') tone('ok');
    else { tone('bad'); navigator.vibrate?.([60, 60, 60]); }
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setResult(null), 3500);
  }, [onCode, concurrent]);

  // Camera
  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    setCamera('starting');
    setTorch(null);
    if (!navigator.mediaDevices?.getUserMedia) { setCamera('none'); return; }
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
      audio: false,
    })
      .then(s => {
        if (cancelled) { s.getTracks().forEach(t => t.stop()); return; }
        stream = s;
        const track = s.getVideoTracks()[0] ?? null;
        trackRef.current = track;
        // Keep refocusing as codes come closer and go (phones that allow it)
        const caps: any = track?.getCapabilities?.() ?? {};
        if (Array.isArray(caps.focusMode) && caps.focusMode.includes('continuous'))
          track!.applyConstraints({ advanced: [{ focusMode: 'continuous' } as any] }).catch(() => {});
        if (caps.torch) setTorch(false);
        const v = videoRef.current;
        if (v) { v.srcObject = s; v.play().catch(() => {}); }
        setCamera('on');
      })
      .catch(err => setCamera(err?.name === 'NotFoundError' || err?.name === 'OverconstrainedError' ? 'none' : 'blocked'));
    return () => { cancelled = true; trackRef.current = null; stream?.getTracks().forEach(t => t.stop()); };
  }, [attempt]);

  // Reading loop: one decode at a time, the next one on the next new frame
  useEffect(() => {
    if (camera !== 'on') return;
    const v = videoRef.current;
    if (!v) return;
    let stop = false;
    let frame = 0;
    let decoding = false;
    let detector: any = null;
    let worker: Worker | null = null;
    let nextId = 0;
    const waiting = new Map<number, (text: string | null) => void>();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const Detector = (window as any).BarcodeDetector;
    const ready = (async () => {
      try {
        if (Detector && (await Detector.getSupportedFormats?.())?.includes('qr_code')) detector = new Detector({ formats: ['qr_code'] });
      } catch { detector = null; }
      if (!detector) {
        try {
          worker = new Worker(new URL('./qrWorker.ts', import.meta.url), { type: 'module' });
          worker.onmessage = (e: MessageEvent<{ id: number; text: string | null }>) => {
            waiting.get(e.data.id)?.(e.data.text);
            waiting.delete(e.data.id);
          };
          worker.onerror = () => { worker?.terminate(); worker = null; waiting.forEach(done => done(null)); waiting.clear(); };
        } catch { worker = null; }
      }
    })();

    // Even frames: the centre square close up (a phone held to the camera). Odd frames: the whole
    // picture, scaled down (a code further away, or off to one side).
    const grab = (): ImageData | null => {
      if (!ctx) return null;
      const w = v.videoWidth, h = v.videoHeight;
      frame++;
      if (frame % 2 === 0) {
        const side = Math.min(w, h), size = Math.min(side, 480);
        canvas.width = size; canvas.height = size;
        ctx.drawImage(v, (w - side) / 2, (h - side) / 2, side, side, 0, 0, size, size);
        return ctx.getImageData(0, 0, size, size);
      }
      const scale = Math.min(1, 800 / Math.max(w, h));
      const cw = Math.round(w * scale), ch = Math.round(h * scale);
      canvas.width = cw; canvas.height = ch;
      ctx.drawImage(v, 0, 0, w, h, 0, 0, cw, ch);
      return ctx.getImageData(0, 0, cw, ch);
    };

    const decode = async (): Promise<string | null> => {
      if (detector) {
        try {
          const codes = await detector.detect(v);
          return codes?.[0]?.rawValue ?? null;
        } catch { detector = null; return null; }   // fall back to jsQR from the next frame
      }
      const img = grab();
      if (!img) return null;
      if (worker) {
        const id = ++nextId;
        return new Promise(resolve => {
          waiting.set(id, resolve);
          worker!.postMessage({ id, data: img.data.buffer, width: img.width, height: img.height }, [img.data.buffer]);
        });
      }
      return jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })?.data ?? null;
    };

    const schedule = () => {
      if (stop) return;
      const anyV = v as any;
      if (typeof anyV.requestVideoFrameCallback === 'function') anyV.requestVideoFrameCallback(tick);
      else requestAnimationFrame(tick);
    };
    const tick = async () => {
      if (stop) return;
      if (!decoding && !pausedRef.current && (concurrent || inFlight.current === 0) && v.readyState >= 2 && v.videoWidth > 0) {
        decoding = true;
        try {
          await ready;
          const text = await decode();
          if (text && !stop) handle(text);
        } catch { /* try again on the next frame */ }
        decoding = false;
      }
      schedule();
    };
    schedule();
    return () => {
      stop = true;
      worker?.terminate();
      waiting.clear();
    };
  }, [camera, handle, concurrent]);

  useEffect(() => () => { clearTimeout(hideTimer.current); clearTimeout(flashTimer.current); }, []);

  const toggleTorch = () => {
    const track = trackRef.current;
    if (!track || torch == null) return;
    const on = !torch;
    track.applyConstraints({ advanced: [{ torch: on } as any] }).then(() => setTorch(on)).catch(() => setTorch(null));
  };

  const tone_ = !result ? '' : result.outcome === 'RECORDED' ? 'is-ok' : result.outcome === 'ALREADY' ? 'is-info' : 'is-bad';
  return (
    <div className="at-scanner">
      <div className="at-scanner-view">
        <video ref={videoRef} playsInline muted autoPlay aria-label="Camera" />
        {camera === 'on' && <div className={`at-scanner-frame ${flash ? 'is-read' : ''}`} aria-hidden="true" />}
        {camera === 'on' && torch != null && (
          <button type="button" className="at-scanner-torch" onClick={toggleTorch} aria-pressed={torch} aria-label={torch ? 'Turn the torch off' : 'Turn the torch on'}>
            {torch ? <FlashlightOff size={18} /> : <Flashlight size={18} />}
          </button>
        )}
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
        {sending > 0 && <div className="at-scanner-sending"><Loader2 size={18} className="at-spin" /> Recording{sending > 1 ? ` ${sending}` : ''}…</div>}
      </div>

      <div className={`at-scan-result ${tone_}`} role="status" aria-live="assertive">
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

/** A student's code changes every few seconds: count it as the same scan per student, not per picture. */
function dedupeKey(text: string) {
  const p = text.split('.');
  return p[0] === 'A1' && p.length === 5 ? p.slice(0, 3).join('.') : text;
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join('');
}

// Short beeps, so whoever is scanning can keep their eyes on the queue
let audio: AudioContext | null = null;
function tone(kind: 'read' | 'ok' | 'bad') {
  try {
    const AC = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!AC) return;
    audio ??= new AC();
    if (audio.state === 'suspended') audio.resume().catch(() => {});
    const t = audio.currentTime;
    const notes = kind === 'read' ? [[1400, 0, 0.04]] : kind === 'ok' ? [[880, 0, 0.08], [1320, 0.09, 0.12]] : [[220, 0, 0.18], [180, 0.2, 0.2]];
    for (const [freq, at, len] of notes) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = kind === 'bad' ? 'square' : 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t + at);
      gain.gain.exponentialRampToValueAtTime(kind === 'read' ? 0.08 : 0.15, t + at + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + at + len);
      osc.connect(gain).connect(audio.destination);
      osc.start(t + at);
      osc.stop(t + at + len + 0.02);
    }
  } catch { /* no sound: fine */ }
}
