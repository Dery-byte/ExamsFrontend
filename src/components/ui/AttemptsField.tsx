import { RotateCcw } from 'lucide-react';

export const MAX_ATTEMPTS_LIMIT = 10;

interface Props {
  value: number | string | undefined;
  onChange: (n: number) => void;
}

/** "Attempts allowed" input shared by the add page and both edit modals. */
export default function AttemptsField({ value, onChange }: Props) {
  return (
    <div className="aq-field" style={{ maxWidth: 320 }}>
      <label className="aq-label">Attempts Allowed</label>
      <div className="aq-iw">
        <span className="aq-ii"><RotateCcw size={15} /></span>
        <input
          className="aq-input text-center"
          type="number"
          min={1}
          max={MAX_ATTEMPTS_LIMIT}
          required
          value={value ?? 1}
          onChange={e => {
            const n = Math.floor(Number(e.target.value));
            onChange(Number.isFinite(n) ? Math.min(MAX_ATTEMPTS_LIMIT, Math.max(1, n)) : 1);
          }}
        />
      </div>
      <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>
        How many times each student may take this quiz. Every attempt's marks are kept.
      </span>
    </div>
  );
}
