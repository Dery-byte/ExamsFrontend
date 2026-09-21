import { TimerOff } from 'lucide-react';

export type AutoCloseFraction = 'HALF' | 'QUARTER';

const DIVISOR: Record<AutoCloseFraction, number> = { HALF: 2, QUARTER: 4 };
const OPTIONS: { value: AutoCloseFraction; label: string }[] = [
  { value: 'HALF', label: 'Half the duration' },
  { value: 'QUARTER', label: 'A quarter of the duration' },
];

const fmtMinutes = (m: number) => `${Number.isInteger(m) ? m : m.toFixed(1)} minute${m === 1 ? '' : 's'}`;

interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  fraction: AutoCloseFraction;
  onFractionChange: (f: AutoCloseFraction) => void;
  quizType?: string;
  /** The objective-section Duration (mins) field on this form. */
  quizTime?: string | number;
  /** Known open time, e.g. from an already-published quiz — gives an absolute close time. */
  publishedAt?: string | null;
  /** Fallback anchor when there's no publishedAt yet: the scheduled quizDate + startTime. */
  quizDate?: string;
  startTime?: string;
}

/** "Auto-close after half/a quarter of the duration" — shared by the add page and both edit modals. */
export default function AutoCloseField({
  checked, onChange, fraction, onFractionChange, quizType, quizTime, publishedAt, quizDate, startTime,
}: Props) {
  const objMinutes = Number(quizTime) || 0;
  const isTheoryOnly = quizType === 'THEORY';
  const isCombined = quizType === 'BOTH';
  // For THEORY, the whole duration comes from a field set later (when theory questions are added),
  // so nothing can be computed here yet. For OBJ/BOTH, quizTime is at least a known lower bound.
  const durationKnown = !isTheoryOnly && objMinutes > 0;
  const divisor = DIVISOR[fraction];
  const minutesUntilClose = durationKnown ? objMinutes / divisor : null;

  // Prefer the quiz's real open time; otherwise estimate from its scheduled date/time.
  const anchor = publishedAt ? new Date(publishedAt) : (quizDate && startTime ? new Date(`${quizDate}T${startTime}`) : null);
  const closeAt = anchor && minutesUntilClose !== null && !isNaN(anchor.getTime())
    ? new Date(anchor.getTime() + minutesUntilClose * 60000)
    : null;

  return (
    <div className={`aq-toggle ${checked ? 'on' : ''}`} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => onChange(!checked)}>
        <div className="aq-toggle-icon"><TimerOff size={15} /></div>
        <div className="aq-toggle-info">
          <span className="aq-toggle-label">Auto-close after part of the duration</span>
          <span className="aq-toggle-desc">
            {checked ? 'Closes itself automatically — no manual action needed' : 'Off — you close it manually'}
          </span>
        </div>
        <div className="aq-switch"><div className="aq-thumb" /></div>
      </div>

      {checked && (
        <div style={{ paddingLeft: 44, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {OPTIONS.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => onFractionChange(o.value)}
                className={`aq-type-btn ${fraction === o.value ? 'active' : ''}`}
                style={{ flex: 1, fontSize: 12, padding: '8px 6px' }}
              >
                {o.label}
              </button>
            ))}
          </div>
          <span style={{ fontSize: 11.5, color: '#64748b', fontWeight: 500, lineHeight: 1.5 }}>
            {isTheoryOnly ? (
              <>Duration for a Theory quiz is set when its questions are added, so the close time isn't known yet — auto-close will apply {fraction === 'HALF' ? 'half' : 'a quarter'} of it once that's configured.</>
            ) : !durationKnown ? (
              <>Enter a Duration (mins) above to see when this will close.</>
            ) : (
              <>
                Closes {fmtMinutes(minutesUntilClose!)} after the quiz opens
                {isCombined ? ' — plus any time added for the theory section' : ''}
                {closeAt ? <> — ≈ <strong>{closeAt.toLocaleString()}</strong></> : ''}.
              </>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
