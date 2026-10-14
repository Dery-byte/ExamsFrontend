/**
 * The student's changing attendance QR code for scanned classes (see the server's AttendanceQr).
 *
 * After the phone and location checks the server gives this phone a key for this student in this
 * class. Every 10 seconds the phone draws A1.<session>.<student>.<step>.<mac>, where mac is an HMAC of
 * "session.student.step" with that key. The server accepts the current step and its neighbours,
 * so a photo or screenshot stops working within about 20 seconds.
 */

export interface QrKey {
  key: string; sessionId: number; studentId: number; stepSeconds: number;
  /** Server time minus this phone's time, so a phone with a wrong clock still draws the current code. */
  offsetMs: number; name: string | null; indexNo: string | null;
}

const MAC_CHARS = 16;

function fromBase64Url(s: string): ArrayBuffer {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  const buf = new ArrayBuffer(bin.length);
  const out = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return buf;
}

function toBase64Url(bytes: ArrayBuffer): string {
  let bin = '';
  new Uint8Array(bytes).forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Returns a function giving the code for a step, plus the current step and seconds left in it. */
export async function qrCoder(k: QrKey) {
  if (!window.crypto?.subtle) throw new Error('This browser cannot show the attendance code. Use an up-to-date browser on a secure (https) page.');
  const cryptoKey = await crypto.subtle.importKey('raw', fromBase64Url(k.key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const stepMs = k.stepSeconds * 1000;
  return {
    now: () => {
      const t = Date.now() + k.offsetMs;
      return { step: Math.floor(t / stepMs), secondsLeft: Math.ceil((stepMs - (t % stepMs)) / 1000) };
    },
    code: async (step: number) => {
      const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(`${k.sessionId}.${k.studentId}.${step}`));
      return `A1.${k.sessionId}.${k.studentId}.${step}.${toBase64Url(sig).slice(0, MAC_CHARS)}`;
    },
  };
}

// Kept for the browser tab only, so a reload during class doesn't ask for the location again
const cacheKey = (sessionId: number) => `attendance_qr_${sessionId}`;

export function cachedQrKey(sessionId: number): QrKey | null {
  try {
    const raw = sessionStorage.getItem(cacheKey(sessionId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function cacheQrKey(k: QrKey) {
  try { sessionStorage.setItem(cacheKey(k.sessionId), JSON.stringify(k)); } catch { /* ignore */ }
}
