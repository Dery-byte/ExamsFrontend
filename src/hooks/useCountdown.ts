import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Seconds left until a server limit lifts ("Too many attempts"), counted from an end time so it stays
 * right if the tab sleeps. start(n) begins (or restarts) at n seconds; remaining is 0 when done.
 */
export function useCountdown() {
  const [remaining, setRemaining] = useState(0);
  const endsAt = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
  }, []);

  const tick = useCallback(() => {
    const left = Math.max(0, Math.ceil((endsAt.current - Date.now()) / 1000));
    setRemaining(left);
    if (left <= 0) stop();
  }, [stop]);

  const start = useCallback((seconds: number) => {
    stop();
    endsAt.current = Date.now() + Math.max(0, seconds) * 1000;
    tick();
    timer.current = setInterval(tick, 250);
  }, [stop, tick]);

  useEffect(() => stop, [stop]);

  return { remaining, start };
}

/** "0:45", "4:05" — minutes and seconds. */
export const fmtCountdown = (seconds: number) => {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * For a "Too many attempts" (429) error: how many seconds to wait, from the server's
 * retryAfterSeconds or its Retry-After header, never more than `max`. Null for any other error.
 */
export const retryAfterSecondsOf = (err: any, max: number): number | null => {
  const res = err?.response;
  if (res?.status !== 429) return null;
  const fromBody = Number(res.data?.retryAfterSeconds);
  const fromHeader = Number(res.headers?.['retry-after']);
  const s = Number.isFinite(fromBody) && fromBody > 0 ? fromBody : Number.isFinite(fromHeader) && fromHeader > 0 ? fromHeader : max;
  return Math.min(max, Math.max(1, Math.round(s)));
};
