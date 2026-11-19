import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

/**
 * How well this device reaches the server, for the small notice at the top of the page (ConnectionBanner).
 *
 * Judged from the app's own requests: one that gets no answer at all (dropped connection, no internet,
 * timeout) or a small one still waiting after SLOW_MS. Answers from the server, errors included (a 502
 * is the server, not the student's internet), count as reachable. Cancelled requests and uploads,
 * downloads and file exports (slow because they are big) are ignored. While anything is wrong, the
 * server is checked every few seconds, so the notice also clears on a page that sends nothing.
 */
export type ConnectionState = 'ok' | 'unstable' | 'offline' | 'restored';

const SLOW_MS = 6000;               // a small request still waiting after this is "slow"
const SLOW_NEEDED = 2;              // slow requests within SLOW_WINDOW_MS before the notice shows
const SLOW_WINDOW_MS = 60000;
const CALM_MS = 10000;              // no problem for this long (and two good answers) = recovered
const PROBE_EVERY_MS = 8000;
const RESTORED_SHOW_MS = 3000;

let state: ConnectionState = typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'ok';
const listeners = new Set<() => void>();
const set = (next: ConnectionState) => {
  if (next === state) return;
  state = next;
  listeners.forEach(l => l());
};

export const subscribeConnection = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export const getConnectionState = () => state;

let failuresInARow = 0;
let goodInARow = 0;
let lastProblemAt = 0;
let slowAt: number[] = [];
let restoredTimer: ReturnType<typeof setTimeout> | null = null;

const bad = () => state === 'unstable' || state === 'offline';

function problem(kind: 'error' | 'slow') {
  const now = Date.now();
  lastProblemAt = now;
  goodInARow = 0;
  if (restoredTimer) { clearTimeout(restoredTimer); restoredTimer = null; }
  if (kind === 'error') {
    failuresInARow++;
    set(failuresInARow >= 2 || navigator.onLine === false ? 'offline' : 'unstable');
  } else {
    slowAt = slowAt.filter(t => now - t < SLOW_WINDOW_MS);
    slowAt.push(now);
    if (!bad() && slowAt.length >= SLOW_NEEDED) set('unstable');
  }
  if (bad()) startProbe();
}

function good() {
  failuresInARow = 0;
  goodInARow++;
  if (bad() && goodInARow >= 2 && Date.now() - lastProblemAt >= CALM_MS) {
    slowAt = [];
    stopProbe();
    set('restored');
    restoredTimer = setTimeout(() => { restoredTimer = null; if (state === 'restored') set('ok'); }, RESTORED_SHOW_MS);
  }
}

// ── Checking the server while something is wrong ────────────────────────────
let probeUrl = '';
let probeTimer: ReturnType<typeof setInterval> | null = null;

async function probe() {
  if (!probeUrl) return;
  const ctl = new AbortController();
  const timeout = setTimeout(() => ctl.abort(), SLOW_MS);
  const started = Date.now();
  try {
    // Any answer, even an error status, means the server was reached
    await fetch(probeUrl, { cache: 'no-store', signal: ctl.signal });
    if (Date.now() - started < SLOW_MS) good(); else problem('slow');
  } catch {
    problem('error');
  } finally {
    clearTimeout(timeout);
  }
}

function startProbe() {
  if (probeTimer || !probeUrl) return;
  probeTimer = setInterval(probe, PROBE_EVERY_MS);
}
function stopProbe() {
  if (probeTimer) { clearInterval(probeTimer); probeTimer = null; }
}

if (typeof window !== 'undefined') {
  window.addEventListener('offline', () => { lastProblemAt = Date.now(); goodInARow = 0; set('offline'); startProbe(); });
  window.addEventListener('online', () => { void probe(); });
}

// ── Watching the app's requests ─────────────────────────────────────────────
type Watched = { started: number; flagged: boolean };
const inFlight = new Map<number, Watched>();
let nextId = 1;

/** Big or long-by-design requests: their time says nothing about the connection. */
const ignoreTiming = (cfg: InternalAxiosRequestConfig) =>
  (typeof FormData !== 'undefined' && cfg.data instanceof FormData)
  || cfg.responseType === 'blob' || cfg.responseType === 'arraybuffer';

// A small request still waiting after SLOW_MS shows the notice while the student is still waiting
if (typeof window !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    inFlight.forEach(w => {
      if (!w.flagged && now - w.started >= SLOW_MS) { w.flagged = true; problem('slow'); }
    });
  }, 2000);
}

const finish = (cfg: InternalAxiosRequestConfig | undefined) => {
  const id = (cfg as any)?.__connId as number | undefined;
  if (!id) return null;
  const w = inFlight.get(id) ?? null;
  inFlight.delete(id);
  return w;
};

/**
 * Lets the connection notice learn from this client's requests. probe: an address on the server that
 * answers quickly without signing in, checked while something is wrong.
 */
export function trackConnection(instance: AxiosInstance, probe?: string) {
  if (probe && !probeUrl) probeUrl = probe;
  instance.interceptors.request.use(cfg => {
    if (!ignoreTiming(cfg)) {
      const id = nextId++;
      (cfg as any).__connId = id;
      inFlight.set(id, { started: Date.now(), flagged: false });
    }
    return cfg;
  });
  instance.interceptors.response.use(
    res => {
      const w = finish(res.config);
      if (!w || Date.now() - w.started < SLOW_MS) good();
      else if (!w.flagged) problem('slow');            // slow, and answered before the 2 s check caught it
      return res;
    },
    (err: AxiosError) => {
      finish(err.config);
      if (err.code === 'ERR_CANCELED') return Promise.reject(err);
      if (err.response) good();                       // the server answered (with an error): reachable
      else problem('error');                          // no answer at all: dropped, offline or timed out
      return Promise.reject(err);
    },
  );
}
