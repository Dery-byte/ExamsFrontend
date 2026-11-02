import { Shuffle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { tx } from '../../utils/terms';

interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  /** The form's No. of Questions: how many each student gets when the pool is on. */
  perStudent?: string | number | null;
  /** Objective questions already in the quiz; undefined on the create page or while loading. */
  poolSize?: number;
  /** The create page: a new quiz has no questions yet. */
  isNew?: boolean;
}

/** Whether a question-pool quiz holds at least one full draw (always true with the pool off). */
export function poolReady(questionPool: boolean | undefined, perStudent: unknown, poolSize: number | undefined): boolean {
  if (!questionPool) return true;
  const n = Number(perStudent) || 0;
  return n > 0 && poolSize !== undefined && poolSize >= n;
}

/** The message shown when a question-pool quiz can't go live yet, or null when it can. */
export function poolNotReadyMessage(questionPool: boolean | undefined, perStudent: unknown, poolSize: number | undefined): string | null {
  if (poolReady(questionPool, perStudent, poolSize)) return null;
  const n = Number(perStudent) || 0;
  if (n < 1) return 'Set No. of Questions (how many each student gets) before going live.';
  if (poolSize === undefined) return `Add at least ${n} questions to the pool first, then go live from the quiz list.`;
  return `Each student gets ${n} questions but the pool has ${poolSize === 0 ? 'none yet' : `only ${poolSize}`}. Add ${n - poolSize} more first.`;
}

/**
 * "Question pool" switch — shared by the add page and both edit modals. With it on, a quiz may hold more
 * objective questions than No. of Questions and each student gets a balanced random draw of that many.
 */
export default function QuestionPoolField({ checked, onChange, perStudent, poolSize, isNew }: Props) {
  const n = Number(perStudent) || 0;
  const short = checked && poolSize !== undefined && n > 0 && poolSize < n;
  // Switching the pool off would hand every student all of these: the server refuses that, so say why here
  const overFull = !checked && poolSize !== undefined && n > 0 && poolSize > n;

  return (
    <div className={`aq-toggle ${checked ? 'on' : ''}`} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
      <style>{`
        .qp-detail { padding-left: 44px; display: flex; flex-direction: column; gap: 8px; }
        .qp-line { display: flex; align-items: flex-start; gap: 8px; font-size: 12px; font-weight: 600; line-height: 1.5;
                   padding: 8px 10px; border-radius: 8px; overflow-wrap: anywhere; }
        .qp-line svg { flex-shrink: 0; margin-top: 2px; }
        .qp-ok { background: #ecfdf5; color: #047857; }
        .qp-warn { background: #fffbeb; color: #b45309; }
        .qp-note { font-size: 11.5px; color: #64748b; font-weight: 500; line-height: 1.5; }
        @media (max-width: 480px) { .qp-detail { padding-left: 0; } }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} role="switch" aria-checked={checked}
           tabIndex={0} onClick={() => onChange(!checked)}
           onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange(!checked); } }}>
        <div className="aq-toggle-icon"><Shuffle size={15} /></div>
        <div className="aq-toggle-info">
          <span className="aq-toggle-label">{tx('Question pool — a random set per student')}</span>
          <span className="aq-toggle-desc">
            {checked
              ? tx(`Upload as many objective questions as you like; each student gets ${n > 0 ? n : 'No. of Questions'} of them`)
              : tx('Off — every student gets all the objective questions in the quiz')}
          </span>
        </div>
        <div className="aq-switch"><div className="aq-thumb" /></div>
      </div>

      {overFull && (
        <div className="qp-detail">
          <div className="qp-line qp-warn">
            <AlertTriangle size={14} />
            <span>{tx(`This quiz has ${poolSize} objective questions. Without the pool every student would get all ${poolSize}: `
              + `keep the pool on, or delete ${poolSize! - n} of them (or raise No. of Questions) before saving.`)}</span>
          </div>
        </div>
      )}

      {checked && (
        <div className="qp-detail">
          {poolSize !== undefined && n > 0 && (
            short ? (
              <div className="qp-line qp-warn">
                <AlertTriangle size={14} />
                <span>{tx(`Pool: ${poolSize} question${poolSize === 1 ? '' : 's'} · each student gets ${n}. Add ${n - poolSize} more before the quiz goes live.`)}</span>
              </div>
            ) : (
              <div className="qp-line qp-ok">
                <CheckCircle2 size={14} />
                <span>{tx(`Pool: ${poolSize} question${poolSize === 1 ? '' : 's'} · each student gets ${n}`)}</span>
              </div>
            )
          )}
          <span className="qp-note">
            {tx('The draw is balanced: every student gets the same number of easy, medium and hard questions and of each '
              + 'question type, with topics in proportion. Give questions a Topic and Difficulty when adding them to use this fully. '
              + 'A student keeps the same questions if they reload or change device; each new attempt gets a new draw.')}
          </span>
          {isNew && (
            <span className="qp-note">The quiz is saved as a draft: add the questions, then go live from the quiz list.</span>
          )}
        </div>
      )}
    </div>
  );
}
