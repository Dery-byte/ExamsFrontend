import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, MapPin, RotateCcw, ShieldAlert, XCircle } from 'lucide-react';
import { locateForClass, type LocateResult } from '../../../api/attendance';
import { distanceMeters, getDeviceId, locationHelp, locationTracker, type Reading, type TrackerState } from '../../../utils/attendanceDevice';
import { tx } from '../../../utils/terms';

/** Report a reading to the server at most this often… */
const MIN_GAP_MS = 4000;
/** …and again after this long even if nothing changed (slower once the room is confirmed). */
const REFRESH_MS = 20_000, CONFIRMED_REFRESH_MS = 60_000;

export interface ClassLocation { tracker: TrackerState; verdict: LocateResult | null; slow: boolean }

/**
 * While {@code active}, keeps the phone's location warm and tells the server where it is, so the
 * student sees "in class" (or what to fix) before typing a code, and a check-in waiting only on
 * location is confirmed as soon as a precise reading comes in.
 */
export function useClassLocation(sessionId: number, active: boolean): ClassLocation {
  const qc = useQueryClient();
  const [tracker, setTracker] = useState<TrackerState>(() => locationTracker.state());
  const [verdict, setVerdict] = useState<LocateResult | null>(null);
  const [tick, setTick] = useState(0);
  const [slow, setSlow] = useState(false);
  const sent = useRef<{ at: number; reading: Reading } | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!active) return;
    const unsub = locationTracker.subscribe(setTracker);
    const t = setInterval(() => setTick(n => n + 1), 2000);
    return () => { unsub(); clearInterval(t); };
  }, [active]);

  // No reading after 15 s: show the "taking a while" tips
  useEffect(() => {
    if (!active || tracker.best) { setSlow(false); return; }
    const t = setTimeout(() => setSlow(true), 15000);
    return () => clearTimeout(t);
  }, [active, !!tracker.best]);   // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const b = tracker.best;
    if (!active || !b || inFlight.current) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    const now = Date.now();
    const last = sent.current;
    if (last) {
      const gap = now - last.at;
      const confirmedHere = verdict?.fit === 'INSIDE';
      const better = b.accuracy <= last.reading.accuracy - 3;
      const moved = distanceMeters(last.reading, b) > Math.max(10, b.accuracy / 2);
      const due = gap >= (confirmedHere ? CONFIRMED_REFRESH_MS : REFRESH_MS);
      if (gap < MIN_GAP_MS || !(better || moved || due)) return;
    }
    const deviceId = getDeviceId() ?? '';
    inFlight.current = true;
    sent.current = { at: now, reading: b };
    locateForClass({ sessionId, latitude: b.latitude, longitude: b.longitude, accuracy: b.accuracy, deviceId })
      .then(r => {
        setVerdict(r);
        if (r.confirmed || r.fit === 'ENDED') qc.invalidateQueries({ queryKey: ['attendance'] });
      })
      .catch(() => { sent.current = last; })   // offline for a moment: try again on the next tick
      .finally(() => { inFlight.current = false; });
  }, [active, tracker.best, tick, sessionId, verdict?.fit, qc]);

  return { tracker, verdict, slow };
}

/** One line (plus steps when something needs fixing) saying where the phone stands. */
export function LocationStatus({ loc, compact = false }: { loc: ClassLocation; compact?: boolean }) {
  const { tracker, verdict, slow } = loc;
  const err = tracker.error;
  const box = (cls: string, icon: React.ReactNode, text: React.ReactNode, steps?: string[], retry = false) => (
    <div className={`at-loc ${cls}`} role="status" aria-live="polite">
      <div className="at-loc-line">{icon}<span>{text}</span></div>
      {steps && steps.length > 0 && !compact && <ol className="at-loc-steps">{steps.map(s => <li key={s}>{tx(s)}</li>)}</ol>}
      {retry && (
        <button type="button" className="at-btn-ghost at-btn-sm" style={{ marginTop: 8 }} onClick={() => locationTracker.retry()}>
          <RotateCcw size={14} /> Try again
        </button>
      )}
    </div>
  );

  if (err && !tracker.best) {
    if (err.kind === 'denied') return box('is-bad', <XCircle size={16} />, err.message, locationHelp('denied'), true);
    if (err.kind === 'unavailable') return box('is-warn', <Loader2 size={16} className="at-spin" />, err.message, locationHelp('unavailable'), true);
    return box('is-bad', <XCircle size={16} />, err.message);
  }
  if (!tracker.best) {
    return box('is-quiet', <Loader2 size={16} className="at-spin" />,
      slow ? 'Still looking for your location. Check Location is on.' : 'Finding your location…',
      slow ? locationHelp('unavailable') : undefined, slow);
  }
  const acc = Math.round(tracker.best.accuracy);
  if (!verdict || verdict.fit === 'NO_LOCATION' || verdict.fit === 'OFF' || verdict.fit === 'NO_SESSION' || verdict.fit === 'ENDED' || verdict.fit === 'NOT_LISTED') {
    return box('is-quiet', <MapPin size={16} />, `Location found (±${acc} m), checking it against the room…`);
  }
  switch (verdict.fit) {
    case 'INSIDE':
      return box('is-ok', <CheckCircle2 size={16} />, tx(verdict.message));
    case 'UNCLEAR':
      return box('is-warn', <ShieldAlert size={16} />, tx(verdict.message), locationHelp('rough'));
    case 'NO_GPS':
      return box('is-bad', <XCircle size={16} />, tx(verdict.message), locationHelp('approximate'), true);
    default:
      return box('is-bad', <XCircle size={16} />, tx(verdict.message), locationHelp('rough'));
  }
}
