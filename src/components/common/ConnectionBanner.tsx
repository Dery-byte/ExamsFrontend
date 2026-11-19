import { useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';
import { getConnectionState, subscribeConnection } from '../../utils/connection';

/**
 * A small see-through notice at the top of every page while the internet connection is unstable or
 * lost, and briefly once it is back. It never blocks clicks. On the exam page it also says the answers
 * are safe: they wait on the device (saveQueue) and are sent when the connection allows.
 */
export default function ConnectionBanner() {
  const state = useSyncExternalStore(subscribeConnection, getConnectionState, getConnectionState);
  const { pathname } = useLocation();
  if (state === 'ok') return null;

  const inExam = pathname.startsWith('/start/');
  const text =
    state === 'restored' ? 'Back online'
    : state === 'offline'
      ? (inExam ? "You're offline. Your answers are kept on this device and sent when you're back online."
                : "You're offline. Check your internet connection.")
      : (inExam ? 'Your internet connection is unstable. Your answers are kept and sent when it improves.'
                : 'Your internet connection is unstable. Some actions may be slow.');

  return (
    <div className={`conn-banner ${state}`} role="status" aria-live="polite">
      <span className="conn-banner-dot" aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}
