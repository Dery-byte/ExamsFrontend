import { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';

export const MAX_ATTEMPTS_LIMIT = 10;

interface Props {
  value: number | string | undefined;
  onChange: (n: number) => void;
}

/** "Attempts allowed" input shared by the add page and both edit modals. */
export default function AttemptsField({ value, onChange }: Props) {
  // Keep a local *string* copy so the field can be cleared / partially typed
  // on mobile without the clamp logic immediately snapping it back to 1.
  const [raw, setRaw] = useState(String(value ?? 1));

  // Stay in sync when the parent resets the value (e.g. form reset / edit load).
  useEffect(() => {
    setRaw(String(value ?? 1));
  }, [value]);

  const commit = (str: string) => {
    const n = Math.floor(Number(str));
    const safe = Number.isFinite(n) && n >= 1
      ? Math.min(MAX_ATTEMPTS_LIMIT, n)
      : 1;
    setRaw(String(safe));
    onChange(safe);
  };

  const step = (delta: number) => {
    const current = Math.floor(Number(raw)) || 1;
    commit(String(current + delta));
  };

  const btnStyle: React.CSSProperties = {
    width: 34, height: 34, flexShrink: 0,
    border: '1px solid #e2e8f0', borderRadius: 6,
    background: '#f8fafc', color: '#475569',
    fontSize: 18, fontWeight: 700, lineHeight: 1,
    cursor: 'pointer', display: 'flex', alignItems: 'center',
    justifyContent: 'center', userSelect: 'none',
    transition: 'background 0.15s',
  };

  const current = Math.floor(Number(raw)) || 1;

  return (
    <div className="aq-field" style={{ maxWidth: 320 }}>
      <label className="aq-label">Attempts Allowed</label>
      <div className="aq-iw" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span className="aq-ii"><RotateCcw size={15} /></span>

        {/* Decrement button */}
        <button
          type="button"
          style={{ ...btnStyle, opacity: current <= 1 ? 0.4 : 1 }}
          disabled={current <= 1}
          onClick={() => step(-1)}
          aria-label="Decrease attempts"
        >−</button>

        {/* Free-text input — no min/max so mobile keyboards won't block clearing */}
        <input
          className="aq-input text-center"
          type="number"
          inputMode="numeric"
          style={{ flex: 1, minWidth: 0, textAlign: 'center' }}
          value={raw}
          onChange={e => {
            const val = e.target.value;
            setRaw(val);
            // Commit immediately only when the value is clearly valid (≥ 1),
            // so the parent form stays in a sensible state while typing.
            const n = Math.floor(Number(val));
            if (val !== '' && Number.isFinite(n) && n >= 1) {
              onChange(Math.min(MAX_ATTEMPTS_LIMIT, n));
            }
          }}
          onBlur={e => commit(e.target.value)}
        />

        {/* Increment button */}
        <button
          type="button"
          style={{ ...btnStyle, opacity: current >= MAX_ATTEMPTS_LIMIT ? 0.4 : 1 }}
          disabled={current >= MAX_ATTEMPTS_LIMIT}
          onClick={() => step(1)}
          aria-label="Increase attempts"
        >+</button>
      </div>
      <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>
        How many times each student may take this quiz (1–{MAX_ATTEMPTS_LIMIT}). Every attempt's marks are kept.
      </span>

      {/* Hide the native browser number spinner — stepper buttons replace it */}
      <style>{`
        input[type=number].aq-input::-webkit-inner-spin-button,
        input[type=number].aq-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number].aq-input { -moz-appearance: textfield; appearance: textfield; }
      `}</style>
    </div>
  );
}
