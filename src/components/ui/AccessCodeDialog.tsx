import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { KeyRound, Eye, EyeOff, Loader2, Timer, Lock } from 'lucide-react';
import { useCountdown, fmtCountdown, retryAfterSecondsOf } from '../../hooks/useCountdown';
import { unlockQuiz } from '../../api/endpoints';
import { tx } from '../../utils/terms';

/** The server allows 5 tries a minute, so a student never waits longer than this. */
const MAX_WAIT_SECONDS = 60;

/**
 * Asks the student for the quiz's access code and checks it on the server (students never receive
 * the real code). On success it calls onUnlocked, which opens the exam window. After too many tries
 * it counts down (at most a minute) until the student may try again.
 */
export default function AccessCodeDialog({ quizId, quizTitle, courseLabel, onCancel, onUnlocked }: {
  quizId: number | string;
  quizTitle?: string;
  /** e.g. the course code, shown under the title. */
  courseLabel?: string;
  onCancel: () => void;
  onUnlocked: () => void;
}) {
  const [code, setCode] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const wait = useCountdown();
  const waiting = wait.remaining > 0;
  // 10 wrong codes: no more tries until a lecturer allows them (the server refuses until then)
  const [locked, setLocked] = useState('');

  useEffect(() => { inputRef.current?.focus(); }, []);

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (busy || waiting || locked) return;
    if (!code.trim()) {
      setError('Access code is required');
      inputRef.current?.focus();
      return;
    }
    setBusy(true);
    setError('');
    try {
      await unlockQuiz(quizId, code);
    } catch (err: any) {
      const seconds = retryAfterSecondsOf(err, MAX_WAIT_SECONDS);
      if (err?.response?.status === 423) {
        setError('');
        setLocked(err.response.data?.message ?? 'You have entered a wrong access code too many times. Ask your lecturer to let you try again.');
      } else if (seconds != null) {
        // Too many tries: the countdown below replaces the message
        setError('');
        wait.start(seconds);
      } else {
        setError(err?.response?.data?.message ?? 'Could not verify the access code. Please try again.');
      }
      setBusy(false);
      inputRef.current?.focus();
      inputRef.current?.select();
      return;
    }
    // Opens the exam window straight away, in the same tap (browsers allow it for a few seconds)
    onUnlocked();
  };

  const toggleShow = () => {
    setShow(s => !s);
    // Keep the phone keyboard open and the cursor at the end
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      const end = el.value.length;
      try { el.setSelectionRange(end, end); } catch { /* not supported for this type */ }
    });
  };

  // Rendered on <body>: an animated page wrapper (transform) would otherwise pin the overlay to
  // itself instead of the screen, leaving it part-covered on phones.
  // Only Cancel closes it: clicking outside or pressing Escape does nothing.
  return createPortal(
    <div className="acd-bg" role="dialog" aria-modal="true" aria-labelledby="acd-title" aria-describedby="acd-desc">
      <form className="acd" onSubmit={submit} noValidate>
        <h3 id="acd-title">
          <KeyRound size={18} aria-hidden="true" />
          Security verification
        </h3>
        {(quizTitle || courseLabel) && (
          <div className="acd-sub">{[courseLabel, quizTitle].filter(Boolean).join(' · ')}</div>
        )}
        <p id="acd-desc">
          Enter the access code provided by your {tx('lecturer')}.
        </p>

        <label htmlFor="acd-code">Access code</label>
        <div className={`acd-field${error ? ' acd-field-error' : ''}`}>
          <input
            ref={inputRef}
            id="acd-code"
            type={show ? 'text' : 'password'}
            value={code}
            onChange={e => { setCode(e.target.value); if (error) setError(''); }}
            placeholder="Enter access code…"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            disabled={busy || !!locked}
            aria-invalid={!!error}
            aria-describedby={error ? 'acd-error' : undefined}
          />
          <button type="button" className="acd-eye" onClick={toggleShow} onMouseDown={e => e.preventDefault()}
            aria-label={show ? 'Hide access code' : 'Show access code'} aria-pressed={show}
            title={show ? 'Hide access code' : 'Show access code'} disabled={busy || !!locked}>
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {error && <div id="acd-error" className="acd-error" role="alert">{error}</div>}
        {locked && (
          <div className="acd-locked" role="alert">
            <Lock size={15} aria-hidden="true" />
            <span>{locked}</span>
          </div>
        )}
        {waiting && !locked && (
          <div className="acd-wait" role="status" aria-live="polite">
            <Timer size={15} aria-hidden="true" />
            <span>Too many attempts. Try again in <b>{fmtCountdown(wait.remaining)}</b></span>
          </div>
        )}

        <div className="acd-actions">
          <button type="button" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="submit" className="acd-primary" disabled={busy || waiting || !!locked}>
            {busy ? <><Loader2 size={15} className="acd-spin" aria-hidden="true" /> Checking…</>
              : locked ? <>Locked</>
              : waiting ? <>Wait {fmtCountdown(wait.remaining)}</>
              : 'Unlock & begin'}
          </button>
        </div>
      </form>

      <style>{`
        .acd-bg { position: fixed; inset: 0; z-index: 2000; background: rgba(15, 23, 42, 0.45); display: flex; align-items: center; justify-content: center; padding: 16px;
          font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif; }   /* on <body>, so not inherited from the app (same as AppModal) */
        .acd { background: #fff; border-radius: 14px; width: 100%; max-width: 440px; padding: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.25); box-sizing: border-box; text-align: left; animation: acd-in .18s ease-out both; }
        @keyframes acd-in { from { opacity: 0; transform: translateY(8px) scale(.98); } to { opacity: 1; transform: none; } }
        .acd h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 4px; font-size: 17px; font-weight: 800; color: #1e293b; }
        .acd-sub { font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 8px; overflow-wrap: anywhere; }
        .acd p { margin: 0 0 14px; font-size: 13px; color: #475569; line-height: 1.55; }
        .acd label { display: block; font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 6px; }
        .acd-field { position: relative; }
        .acd-field input { width: 100%; box-sizing: border-box; height: 44px; padding: 0 46px 0 12px; border-radius: 8px; border: 1.5px solid #e2e8f0; background: #fff; color: #1e293b; font: inherit; font-size: 15px; outline: none; transition: border-color .15s; }
        .acd-field input:focus { border-color: var(--brand); }
        .acd-field input:disabled { background: #f8fafc; }
        .acd-field-error input { border-color: #dc2626; }
        .acd-eye { position: absolute; right: 4px; top: 50%; transform: translateY(-50%); width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border: none; border-radius: 6px; background: transparent; color: #64748b; cursor: pointer; padding: 0; }
        .acd-eye:hover:not(:disabled) { background: #f1f5f9; color: #334155; }
        .acd-error { font-size: 12px; font-weight: 600; color: #b91c1c; margin-top: 6px; }
        .acd-wait { display: flex; align-items: center; gap: 8px; margin-top: 10px; padding: 8px 10px; border-radius: 8px; background: #fff7ed; border: 1px solid #fed7aa; color: #9a3412; font-size: 12.5px; font-weight: 600; }
        .acd-wait b { font-variant-numeric: tabular-nums; font-size: 13.5px; }
        .acd-locked { display: flex; align-items: flex-start; gap: 8px; margin-top: 10px; padding: 9px 10px; border-radius: 8px; background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; font-size: 12.5px; font-weight: 600; line-height: 1.45; }
        .acd-locked svg { flex-shrink: 0; margin-top: 1px; }
        .acd-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
        .acd-actions button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 38px; padding: 0 16px; border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer; border: 1.5px solid #e2e8f0; background: #fff; color: #475569; }
        .acd-actions .acd-primary { background: var(--brand); border-color: var(--brand); color: var(--brand-contrast); min-width: 130px; }
        .acd-actions button:disabled { opacity: 0.6; cursor: not-allowed; }
        .acd-spin { animation: acd-spin 1s linear infinite; }
        @keyframes acd-spin { to { transform: rotate(360deg); } }
        @media (max-width: 576px) { .acd-field input { font-size: 16px; } }   /* no phone zoom on focus */
        @media (max-width: 420px) {
          .acd { padding: 18px 16px; }
          .acd-actions button { flex: 1; }
        }
      `}</style>
    </div>,
    document.body,
  );
}
