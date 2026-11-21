import { useState } from 'react';
import { EyeOff, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { withholdResult, releaseResult } from '../../api/endpoints';
import { tx } from '../../utils/terms';

/** Shortest reason the server accepts. */
const MIN_REASON = 5;

/**
 * Withhold one student's result for a quiz (asks for a reason, kept from the student), or release it.
 * Used by Quiz Review and the proctoring report.
 */
export default function WithholdResultDialog({ mode, quizId, student, currentReason, onClose, onDone }: {
  mode: 'withhold' | 'release';
  quizId: number | string;
  student: { id: number; name: string; index?: string };
  /** Release: the reason it was withheld, shown to staff. */
  currentReason?: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const withhold = mode === 'withhold';
  const ok = !withhold || reason.trim().length >= MIN_REASON;

  const submit = async () => {
    if (!ok || busy) return;
    setBusy(true);
    try {
      if (withhold) {
        await withholdResult(quizId, student.id, reason.trim());
        toast.success(`${student.name}'s result is withheld. They now see "withheld" instead of their marks.`);
      } else {
        const r = await releaseResult(quizId, student.id);
        toast.success(r?.notified
          ? `${student.name}'s result is released and they have been notified.`
          : `${student.name}'s result is released. They will be notified once it is reviewed.`);
      }
      onDone();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? (withhold ? 'Could not withhold the result.' : 'Could not release the result.'));
      setBusy(false);
    }
  };

  return (
    <div className="wrd-bg" role="dialog" aria-modal="true" aria-labelledby="wrd-title" onClick={() => !busy && onClose()}>
      <div className="wrd" onClick={e => e.stopPropagation()}>
        <h3 id="wrd-title">
          {withhold ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          {withhold ? `Withhold ${student.name}'s result?` : `Release ${student.name}'s result?`}
        </h3>
        {student.index && <div className="wrd-index">{student.index}</div>}
        {withhold ? (
          <>
            <p>
              {tx('The student')} will see “withheld — contact your lecturer” instead of their marks. They can't open, print or
              download the result or ask for a re-mark, the result email waits, and the marks are not copied into a marks sheet.
              {' '}Other {tx('students')}' results are not affected. You can release it at any time.
            </p>
            <label htmlFor="wrd-reason">Reason (required, for staff only, never shown to {tx('the student')})</label>
            <textarea
              id="wrd-reason"
              autoFocus
              maxLength={500}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Took 60 minutes on a 45-minute quiz, with 3 violations — checking before release"
            />
            {!ok && reason.length > 0 && <div className="wrd-err">At least {MIN_REASON} characters.</div>}
          </>
        ) : (
          <>
            <p>
              {tx('The student')} will see their marks again. If the script has been reviewed, the result email and the
              “result released” notice go out now.
            </p>
            {currentReason && <div className="wrd-reason-shown"><b>Withheld because:</b> {currentReason}</div>}
          </>
        )}
        <div className="wrd-actions">
          <button type="button" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className={withhold ? 'wrd-danger' : 'wrd-primary'} onClick={submit} disabled={!ok || busy}>
            {busy ? 'Saving…' : withhold ? 'Withhold result' : 'Release result'}
          </button>
        </div>
      </div>
      <style>{`
        .wrd-bg { position: fixed; inset: 0; z-index: 1100; background: rgba(15, 23, 42, 0.45); display: flex; align-items: center; justify-content: center; padding: 16px; }
        .wrd { background: #fff; border-radius: 14px; width: 100%; max-width: 460px; padding: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.25); box-sizing: border-box; text-align: left; }
        .wrd h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 4px; font-size: 17px; color: #1e293b; }
        .wrd-index { font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 8px; }
        .wrd p { margin: 0 0 12px; font-size: 13px; color: #475569; line-height: 1.55; }
        .wrd label { display: block; font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 6px; }
        .wrd textarea { width: 100%; box-sizing: border-box; min-height: 84px; padding: 10px 12px; border-radius: 8px; border: 1.5px solid #e2e8f0; font: inherit; font-size: 14px; resize: vertical; outline: none; }
        .wrd textarea:focus { border-color: var(--brand); }
        .wrd-err { font-size: 11.5px; color: #9f1f1f; margin-top: 4px; }
        .wrd-reason-shown { font-size: 13px; color: #334155; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; }
        .wrd-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
        .wrd-actions button { height: 36px; padding: 0 14px; border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer; border: 1.5px solid #e2e8f0; background: #fff; color: #475569; }
        .wrd-actions .wrd-danger { background: #b91c1c; border-color: #b91c1c; color: #fff; }
        .wrd-actions .wrd-primary { background: var(--brand); border-color: var(--brand); color: var(--brand-contrast); }
        .wrd-actions button:disabled { opacity: 0.55; cursor: not-allowed; }
        @media (max-width: 576px) { .wrd textarea { font-size: 16px; } }
      `}</style>
    </div>
  );
}
