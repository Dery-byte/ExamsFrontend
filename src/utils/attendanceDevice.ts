/**
 * Phone identity and location for class attendance.
 *
 * The phone id is a random value kept in this browser (it survives sign-out). The server stores only
 * its hash and links it to the first student who checks in with it, so one phone serves one student.
 *
 * Location comes from one shared tracker that keeps listening while a page needs it, so GPS is
 * already warm (and precise) by the time a code is typed or scanned. Readings are blended rather
 * than taking the first one: phones often hand out an old or optimistic reading first.
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
 * Wi-Fi location off, or an iPhone with Precise Location off) is guessing. Same limit as the server.
 */
export const GUESSED_LOCATION_METERS = 1000;

export type LocationErrorKind = 'unsupported' | 'insecure' | 'denied' | 'unavailable';

export class LocationError extends Error {
  constructor(message: string, public kind: LocationErrorKind) {
    super(message);
    this.name = 'LocationError';
  }
}

function geo(): Geolocation {
  if (typeof window !== 'undefined' && !window.isSecureContext)
    throw new LocationError('Location only works on a secure (https) page.', 'insecure');
  if (typeof navigator === 'undefined' || !navigator.geolocation)
    throw new LocationError('This browser cannot share its location. Use the browser on your phone.', 'unsupported');
  return navigator.geolocation;
}

const DENIED_MESSAGE = 'Location is blocked for this site. Allow it (steps below), then tap Try again.';
const UNAVAILABLE_MESSAGE = 'Your location could not be found yet. Turn on Location (GPS) and keep this page open.';

// ── The shared tracker ─────────────────────────────────────────────────────

interface Sample extends Reading { at: number }

export interface TrackerState {
  /** locating: listening, no reading yet; ready: has a reading; error: can't read (see error). */
  status: 'idle' | 'locating' | 'ready' | 'error';
  /** The blended position; accuracy (± metres) includes how old the readings are. */
  best: Reading | null;
  /** Readings that went into {@code best}. */
  samples: number;
  error: LocationError | null;
  /** When listening started (ms), or null. */
  since: number | null;
}

/** Readings this recent are blended together; older ones are used only when nothing newer exists. */
const WINDOW_MS = 30_000;
/** Readings are forgotten after this. */
const KEEP_MS = 120_000;
/** A reading's error grows by this much per second once it is this old (the phone may have moved). */
const AGE_GRACE_S = 15, AGE_GROWTH_M_PER_S = 0.5;
/** Keep listening this long after the last page stops needing it (the student often comes straight back). */
const LINGER_MS = 30_000;
/** Ask again when the newest reading is this old (some phones go quiet while still). */
const QUIET_MS = 15_000;

class LocationTracker {
  private watchId: number | null = null;
  private samples: Sample[] = [];
  private listeners = new Set<(s: TrackerState) => void>();
  private users = 0;
  private stopTimer: ReturnType<typeof setTimeout> | null = null;
  private startedAt: number | null = null;
  private error: LocationError | null = null;
  private hooked = false;

  state(): TrackerState {
    const best = this.blend();
    return {
      status: this.error && !best ? 'error' : best ? 'ready' : this.watchId != null ? 'locating' : 'idle',
      best: best?.reading ?? null,
      samples: best?.count ?? 0,
      error: this.error,
      since: this.startedAt,
    };
  }

  /** Starts listening (if not already) and tells {@code fn} about every change, starting now. */
  subscribe(fn: (s: TrackerState) => void): () => void {
    this.listeners.add(fn);
    this.users++;
    if (this.stopTimer) { clearTimeout(this.stopTimer); this.stopTimer = null; }
    this.start();
    fn(this.state());
    let done = false;
    return () => {
      if (done) return;
      done = true;
      this.listeners.delete(fn);
      this.users--;
      if (this.users <= 0) {
        this.users = 0;
        this.stopTimer = setTimeout(() => this.stop(), LINGER_MS);
      }
    };
  }

  /** After the student changed a setting (or location was blocked): listen again from scratch. */
  retry() {
    this.error = null;
    this.clearWatch();
    if (this.users > 0) this.start();
    this.emit();
  }

  /**
   * A position to send: at once if a settled reading is precise enough ({@code goodEnough});
   * otherwise the best there is after a short wait for a better one (1.5 s when already settled,
   * half of {@code maxWaitMs} from cold), since a code only lives a few seconds. Rejects only if no
   * reading comes within {@code maxWaitMs}.
   */
  fix({ goodEnough = 20, maxWaitMs = 12000 }: { goodEnough?: number; maxWaitMs?: number } = {}): Promise<Reading> {
    return new Promise((resolve, reject) => {
      const callAt = Date.now();
      let finished = false;
      let unsub: () => void = () => {};
      let tick: ReturnType<typeof setInterval> | null = null;
      const done = (r: Reading | null, err?: LocationError) => {
        if (finished) return;
        finished = true;
        if (tick) clearInterval(tick);
        // After the current subscribe() call has returned
        setTimeout(() => unsub(), 0);
        if (r) resolve(r); else reject(err ?? new LocationError(UNAVAILABLE_MESSAGE, 'unavailable'));
      };
      const hard = callAt + maxWaitMs;
      const warm = !!this.blend(callAt) && this.settled(callAt);
      const soft = callAt + (warm ? Math.min(1500, maxWaitMs) : Math.floor(maxWaitMs / 2));
      const check = () => {
        if (finished) return;
        const now = Date.now();
        const st = this.state();
        if (st.error && !st.best && (st.error.kind !== 'unavailable' || now >= hard)) return done(null, st.error);
        if (st.best && this.settled(now) && (st.best.accuracy <= goodEnough || now >= soft)) return done(st.best);
        if (now >= hard) return done(st.best);
      };
      unsub = this.subscribe(check);
      const newest = this.samples[this.samples.length - 1];
      if (!newest || callAt - newest.at > QUIET_MS) this.poke();
      tick = setInterval(check, 400);
    });
  }

  private start() {
    if (this.watchId != null) return;
    let g: Geolocation;
    try { g = geo(); } catch (e) { this.error = e as LocationError; this.emit(); return; }
    this.hookPage();
    this.startedAt = Date.now();
    this.watchId = g.watchPosition(p => this.add(p), e => this.fail(e), { enableHighAccuracy: true, maximumAge: 0 });
    this.emit();
  }

  private stop() {
    if (this.users > 0) return;
    this.clearWatch();
    this.startedAt = null;
    this.emit();
  }

  private clearWatch() {
    if (this.watchId != null) {
      try { navigator.geolocation.clearWatch(this.watchId); } catch { /* gone */ }
      this.watchId = null;
    }
  }

  /** A one-off fresh reading, for phones whose watch has gone quiet. */
  private poke() {
    try {
      geo().getCurrentPosition(p => this.add(p), e => { if (e.code === e.PERMISSION_DENIED) this.fail(e); },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
    } catch { /* reported by start() */ }
  }

  private add(p: GeolocationPosition) {
    const { latitude, longitude, accuracy } = p.coords;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(accuracy) || accuracy <= 0) return;
    if (latitude === 0 && longitude === 0) return;
    const now = Date.now();
    // The reading's own time when it is believable: a reading handed out from before we asked ages like one
    const t = p.timestamp;
    const at = t > now - 10 * 60_000 && t < now + 60_000 ? Math.min(t, now) : now;
    this.samples.push({ latitude, longitude, accuracy, at });
    this.samples = this.samples.filter(s => now - s.at <= KEEP_MS).slice(-60);
    this.error = null;
    this.emit();
  }

  private fail(e: GeolocationPositionError) {
    if (e.code === e.PERMISSION_DENIED) {
      this.error = new LocationError(DENIED_MESSAGE, 'denied');
      this.clearWatch();
    } else if (e.code === e.POSITION_UNAVAILABLE && !this.samples.length) {
      // Keep listening: it often recovers once GPS or Wi-Fi comes on
      this.error = new LocationError(UNAVAILABLE_MESSAGE, 'unavailable');
    }
    this.emit();
  }

  /** Accuracy-weighted average of the best readings, each one's error grown with its age. */
  private blend(now = Date.now()): { reading: Reading; count: number } | null {
    const kept = this.samples.filter(s => now - s.at <= KEEP_MS);
    if (!kept.length) return null;
    const fresh = kept.filter(s => now - s.at <= WINDOW_MS);
    const pool = (fresh.length ? fresh : kept).map(s => ({
      ...s, e: s.accuracy + Math.max(0, (now - s.at) / 1000 - AGE_GRACE_S) * AGE_GROWTH_M_PER_S,
    }));
    const b = Math.min(...pool.map(s => s.e));
    const good = pool.filter(s => s.e <= Math.max(b * 1.5, b + 5));
    let w = 0, lat = 0, lng = 0;
    for (const s of good) { const k = 1 / (s.e * s.e); w += k; lat += s.latitude * k; lng += s.longitude * k; }
    return { reading: { latitude: lat / w, longitude: lng / w, accuracy: Math.round(b * 10) / 10 }, count: good.length };
  }

  /** Two readings, or one that has stood a few seconds (a phone's very first reading is often a stale guess). */
  private settled(now: number): boolean {
    const fresh = this.samples.filter(s => now - s.at <= WINDOW_MS);
    if (fresh.length >= 2) return true;
    const since = this.startedAt ?? now;
    if (fresh.length === 1) return now - since >= 4000 || (fresh[0].accuracy <= 10 && now - since >= 1500);
    return this.samples.length > 0 && now - since >= 4000;
  }

  private emit() {
    const st = this.state();
    this.listeners.forEach(fn => fn(st));
  }

  /** Coming back to the page (or the app): browsers pause location in the background, so ask again. */
  private hookPage() {
    if (this.hooked || typeof document === 'undefined') return;
    this.hooked = true;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible' || this.users <= 0) return;
      const newest = this.samples[this.samples.length - 1];
      if (!newest || Date.now() - newest.at > QUIET_MS) { this.clearWatch(); this.start(); this.poke(); }
    });
    try {
      navigator.permissions?.query({ name: 'geolocation' as PermissionName }).then(p => {
        if (p.state === 'denied') { this.error = new LocationError(DENIED_MESSAGE, 'denied'); this.emit(); }
        p.onchange = () => {
          if (p.state === 'denied') { this.error = new LocationError(DENIED_MESSAGE, 'denied'); this.clearWatch(); this.emit(); }
          else if (this.error?.kind === 'denied') this.retry();
        };
      }).catch(() => {});
    } catch { /* no Permissions API */ }
  }
}

export const locationTracker = new LocationTracker();

/**
 * One position, from the shared tracker. {@code onUpdate} receives each improvement, for a live
 * "±12 m" display.
 */
export function readLocation(opts: { goodEnough: number; maxWaitMs?: number; onUpdate?: (r: Reading) => void }): Promise<Reading> {
  const { onUpdate, ...rest } = opts;
  const unsub = onUpdate ? locationTracker.subscribe(s => { if (s.best) onUpdate(s.best); }) : null;
  return locationTracker.fix(rest).finally(() => unsub?.());
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
    const startedAt = Date.now();
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
        // A reading from before measuring began (handed out from the phone's memory) isn't this room
        if (p.timestamp < startedAt - 1000 && p.timestamp > startedAt - 10 * 60_000) return;
        if (!Number.isFinite(p.coords.accuracy) || p.coords.accuracy <= 0) return;
        all.push({ latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy });
        const best = all.reduce((a, b) => (b.accuracy < a.accuracy ? b : a));
        onUpdate?.(best, all.length);
      },
      err => {
        if (err.code === err.PERMISSION_DENIED) finish(new LocationError(DENIED_MESSAGE, 'denied'));
        else if (!all.length && err.code !== err.TIMEOUT) finish(new LocationError(UNAVAILABLE_MESSAGE, 'unavailable'));
      },
      { enableHighAccuracy: true, maximumAge: 0 },
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

export type PlaceFit = 'INSIDE' | 'UNCLEAR' | 'OUTSIDE';

/**
 * The server's classroom rule (AttendanceGeo.judge), for "Test a spot": INSIDE when precise enough
 * and within the radius plus both errors combined (that allowance at most the radius); UNCLEAR
 * when still within the radius plus three times the combined error (25-300 m); else OUTSIDE.
 */
export function judgePlace(distance: number, centreAccuracy: number | null, radius: number, maxAccuracy: number, accuracy: number): { fit: PlaceFit; combined: number } {
  const centre = centreAccuracy == null ? 15 : Math.max(5, Math.min(50, centreAccuracy));
  const combined = Math.sqrt(accuracy * accuracy + centre * centre);
  if (accuracy <= maxAccuracy && distance <= radius + Math.min(combined, radius)) return { fit: 'INSIDE', combined: Math.ceil(combined) };
  const margin = Math.max(25, Math.min(3 * combined, 300));
  return { fit: distance <= radius + margin ? 'UNCLEAR' : 'OUTSIDE', combined: Math.ceil(combined) };
}

// ── Help for the student's own phone ───────────────────────────────────────

export type Platform = 'ios' | 'android' | 'other';

export function platform(): Platform {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && (navigator.maxTouchPoints ?? 0) > 1)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'other';
}

/** Steps for this phone. denied: location blocked; approximate: only a rough guess (±1 km+); rough: imprecise indoors. */
export function locationHelp(kind: 'denied' | 'approximate' | 'rough' | 'unavailable'): string[] {
  const p = platform();
  const wifi = 'Turn on Wi-Fi, even without connecting to a network: phones use nearby Wi-Fi to find themselves indoors.';
  if (kind === 'denied') {
    if (p === 'ios') return [
      'Open Settings → Privacy & Security → Location Services and turn it on.',
      'In the same list, tap your browser (Safari Websites, or Chrome) and choose “While Using the App”, with Precise Location on.',
      'Come back here and tap Try again. If it still says blocked, reload the page and tap Allow.',
    ];
    if (p === 'android') return [
      'Tap the icon left of the web address (a lock or two sliders) → Permissions → Location → Allow.',
      'Swipe down from the top of the screen and make sure Location is on.',
      'Tap Try again.',
    ];
    return ['Allow location for this site in your browser’s site settings, then tap Try again.', 'Computers usually can’t locate precisely: check in on your phone.'];
  }
  if (kind === 'approximate') {
    if (p === 'ios') return [
      'Settings → Privacy & Security → Location Services → your browser (Safari Websites, or Chrome) → turn on Precise Location.',
      wifi,
      'Come back here; it updates by itself.',
    ];
    if (p === 'android') return [
      'Settings → Location → Location services → Google Location Accuracy: turn it on.',
      'If your browser asked “precise or approximate”, choose precise (site settings → Location).',
      wifi,
    ];
    return ['Use your phone: computers usually only guess their location from the internet connection.'];
  }
  const tips = [
    'Keep this page open and hold still a few seconds: the reading gets more precise.',
    wifi,
    ...(p === 'android' ? ['Turn on Google Location Accuracy (Settings → Location → Location services).'] : []),
    ...(p === 'ios' ? ['Make sure Precise Location is on for your browser (Settings → Privacy & Security → Location Services).'] : []),
    'If you can, move nearer a window or the door.',
  ];
  return kind === 'unavailable' ? ['Turn on Location (GPS): swipe down from the top of the screen.', ...tips] : tips;
}
