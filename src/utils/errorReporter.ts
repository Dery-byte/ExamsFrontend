import { reportClientError } from '../api/endpoints';

/**
 * Sends crashes in the browser to the developer's error log, so problems are seen without anyone
 * reporting them. Only for signed-in users, each distinct error once per page load, at most 10.
 * Failed API calls are not sent: the server already records its own errors.
 */
const seen = new Set<string>();
let sent = 0;

export function reportError(message: string, stack?: string) {
  try {
    if (!localStorage.getItem('access_token')) return;
    const key = message.slice(0, 200);
    if (!message || seen.has(key) || sent >= 10) return;
    seen.add(key);
    sent++;
    reportClientError({
      page: window.location.pathname,
      message: message.slice(0, 1000),
      stack: stack?.slice(0, 6000),
    }).catch(() => { /* never let reporting cause more errors */ });
  } catch { /* ignore */ }
}

export function installErrorReporter() {
  window.addEventListener('error', e => {
    // Resource load failures (broken images) have no error object; skip them
    if (!e.error) return;
    reportError(String(e.message || e.error), e.error?.stack);
  });
  window.addEventListener('unhandledrejection', e => {
    const reason: any = e.reason;
    if (reason?.isAxiosError) return;
    reportError(reason?.message ? String(reason.message) : String(reason), reason?.stack);
  });
}
