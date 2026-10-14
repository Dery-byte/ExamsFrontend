/**
 * Phone identity and location for class attendance.
 *
 * The phone id is a random value kept in this browser (it survives sign-out). The server stores only
 * its hash and links it to the first student who checks in with it, so one phone serves one student.
 */

const DEVICE_KEY = 'attendance_device';

export function getDeviceId(): string | null {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id || !/^[A-Za-z0-9_-]{16,128}$/.test(id)) {
      id = randomId();
      localStorage.setItem(DEVICE_KEY, id);
      if (localStorage.getItem(DEVICE_KEY) !== id) return null;
    }
    return id;
  } catch {
    return null;   // storage blocked (private browsing)
  }
}

function randomId(): string {
  const c: Crypto | undefined = typeof crypto !== 'undefined' ? crypto : undefined;
  if (c?.randomUUID) return c.randomUUID().replace(/-/g, '');
  const bytes = new Uint8Array(16);
  if (c?.getRandomValues) c.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

export interface Reading { latitude: number; longitude: number; accuracy: number }

/**
 * Readings rougher than this aren't positions: the device (usually a computer without GPS, or with
 * Wi-Fi location off) is guessing from its internet connection. Same limit as the server.
 */
export const GUESSED_LOCATION_METERS = 1000;

export class LocationError extends Error {
  constructor(message: string, public kind: 'unsupported' | 'insecure' | 'denied' | 'unavailable') { super(message); }
}

function geo(): Geolocation {
  if (typeof window !== 'undefined' && !window.isSecureContext)
    throw new LocationError('Location only works on a secure (https) page.', 'insecure');
  if (typeof navigator === 'undefined' || !navigator.geolocation)
    throw new LocationError('This browser cannot share its location. Use the browser on your phone.', 'unsupported');
  return navigator.geolocation;
}

function explain(err: GeolocationPositionError): LocationError {
  if (err.code === err.PERMISSION_DENIED)
    return new LocationError('Location is blocked for this site. Allow location in your browser settings, then try again.', 'denied');
  return new LocationError('Your location could not be found. Turn on location (GPS) and try again.', 'unavailable');
}

/**
 * Listens for a few seconds and returns the most accurate reading, stopping early once it is
 * good enough. {@code onUpdate} receives each improvement, for a live "±12 m" display.
 */
export function readLocation(opts: { goodEnough: number; maxWaitMs?: number; onUpdate?: (r: Reading) => void }): Promise<Reading> {
  const { goodEnough, maxWaitMs = 12000, onUpdate } = opts;
  return new Promise((resolve, reject) => {
    let g: Geolocation;
    try { g = geo(); } catch (e) { reject(e); return; }
    let best: Reading | null = null;
    let done = false;
    const finish = (r: Reading | null, err?: LocationError) => {
      if (done) return;
      done = true;
      g.clearWatch(watch);
      clearTimeout(timer);
      if (r) resolve(r); else reject(err ?? new LocationError('Your location could not be found. Turn on location (GPS) and try again.', 'unavailable'));
    };
    const watch = g.watchPosition(
      p => {
        const r = { latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy };
        if (!best || r.accuracy < best.accuracy) {
          best = r;
          onUpdate?.(r);
        }
        if (best.accuracy <= goodEnough) finish(best);
      },
      err => { if (!best) finish(null, explain(err)); },
      { enableHighAccuracy: true, maximumAge: 0, timeout: maxWaitMs },
    );
    const timer = setTimeout(() => finish(best), maxWaitMs);
  });
}

export interface RoomMeasurement extends Reading { readings: number }

/**
 * Measures a room for saving: collects readings for {@code durationMs} and averages the better
 * ones (weighted by precision), which steadies a single jumpy reading.
 */
export function measureRoom(opts: { durationMs?: number; onUpdate?: (best: Reading, readings: number) => void }): { promise: Promise<RoomMeasurement>; stop: () => void } {
  const { durationMs = 20000, onUpdate } = opts;
  let stopNow = () => {};
  const promise = new Promise<RoomMeasurement>((resolve, reject) => {
    let g: Geolocation;
    try { g = geo(); } catch (e) { reject(e); return; }
    const all: Reading[] = [];
    let done = false;
    const finish = (err?: LocationError) => {
      if (done) return;
      done = true;
      g.clearWatch(watch);
      clearTimeout(timer);
      if (!all.length) { reject(err ?? new LocationError('No location readings came in. Turn on location (GPS) and try again.', 'unavailable')); return; }
      const best = Math.min(...all.map(r => r.accuracy));
      const good = all.filter(r => r.accuracy <= Math.max(best * 2, best + 5));
      let w = 0, lat = 0, lng = 0;
      for (const r of good) { const k = 1 / (r.accuracy * r.accuracy); w += k; lat += r.latitude * k; lng += r.longitude * k; }
      resolve({ latitude: lat / w, longitude: lng / w, accuracy: Math.round(best), readings: all.length });
    };
    const watch = g.watchPosition(
      p => {
        all.push({ latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy });
        const best = all.reduce((a, b) => (b.accuracy < a.accuracy ? b : a));
        onUpdate?.(best, all.length);
      },
      err => { if (!all.length) finish(explain(err)); },
      { enableHighAccuracy: true, maximumAge: 0, timeout: durationMs },
    );
    const timer = setTimeout(() => finish(), durationMs);
    stopNow = () => finish();
  });
  return { promise, stop: () => stopNow() };
}

/** Metres between two points (haversine), for the location test display. */
export function distanceMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const R = 6371008.8, rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad, dLon = (b.longitude - a.longitude) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
