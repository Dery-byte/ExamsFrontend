import { Hash, X } from 'lucide-react';
import { tx } from '../../utils/terms';

/**
 * Index numbers are read as a prefix plus a trailing serial: "PS/ICT/17/" + "0001".
 * Mirrors the server's IndexNumberRange so the form can flag a bad range before saving;
 * the server re-validates and is the one that actually enforces it.
 */
const PREFIX_AND_SERIAL = /^(.*?)(\d+)$/;

const norm = (v: string | null | undefined) => (v ?? '').trim().toUpperCase();

function parse(v: string) {
  const m = PREFIX_AND_SERIAL.exec(norm(v));
  return m ? { prefix: m[1], serial: Number(m[2]) } : null;
}

/** Null when the range is usable or both ends are blank (no limit); otherwise what's wrong with it. */
export function indexRangeError(start: string | null | undefined, end: string | null | undefined): string | null {
  const s = norm(start), e = norm(end);
  if (!s && !e) return null;
  if (!s || !e) return tx('Enter both the first and the last index number of the range.');
  const ps = parse(s), pe = parse(e);
  if (!ps) return `"${s}" must end in a number, e.g. PS/ICT/17/0001.`;
  if (!pe) return `"${e}" must end in a number, e.g. PS/ICT/17/0009.`;
  if (ps.prefix !== pe.prefix) return `Both index numbers must start the same way ("${ps.prefix}" vs "${pe.prefix}").`;
  if (ps.serial > pe.serial) return `The first index number (${s}) comes after the last one (${e}).`;
  return null;
}

interface Props {
  start: string | null | undefined;
  end: string | null | undefined;
  onChange: (start: string, end: string) => void;
}

/** Optional "From / To" index-number range of students allowed to take a quiz. Shared by the add page and both edit modals. */
export default function IndexRangeField({ start, end, onChange }: Props) {
  const s = start ?? '', e = end ?? '';
  const error = indexRangeError(s, e);
  const isSet = !!norm(s) && !!norm(e) && !error;
  const count = isSet ? parse(e)!.serial - parse(s)!.serial + 1 : 0;

  return (
    <div className="aq-field mt-4">
      <label className="aq-label">
        {tx("Allowed Index Numbers ")}<span className="irf-hint">{tx("(optional — limit this quiz to a range of student index numbers)")}</span>
      </label>
      <div className="irf-row">
        <div className="aq-iw irf-col">
          <span className="aq-ii"><Hash size={15} /></span>
          <input
            className="aq-input"
            value={s}
            onChange={ev => onChange(ev.target.value.toUpperCase(), e)}
            placeholder={tx("From, e.g. PS/ICT/17/0001")}
            aria-label={tx("First index number in the range")}
            autoComplete="off"
          />
        </div>
        <span className="irf-to">to</span>
        <div className="aq-iw irf-col">
          <span className="aq-ii"><Hash size={15} /></span>
          <input
            className="aq-input"
            value={e}
            onChange={ev => onChange(s, ev.target.value.toUpperCase())}
            placeholder={tx("To, e.g. PS/ICT/17/0009")}
            aria-label={tx("Last index number in the range")}
            autoComplete="off"
          />
        </div>
        {(s || e) && (
          <button type="button" className="irf-clear" onClick={() => onChange('', '')} title={tx("Remove the range")} aria-label={tx("Remove the range")}>
            <X size={15} />
          </button>
        )}
      </div>
      {error ? (
        <p className="irf-msg irf-err">{error}</p>
      ) : isSet ? (
        <p className="irf-msg irf-ok">
          Only index numbers <strong>{norm(s)}</strong> to <strong>{norm(e)}</strong> ({count} number{count === 1 ? '' : 's'}) can take this quiz.
          {tx(" Students outside this range will be told the quiz is not assigned to their index number.")}
        </p>
      ) : (
        <p className="irf-msg">{tx("Leave blank to let every eligible student take this quiz.")}</p>
      )}
      <style>{`
        .irf-hint { font-size:11px; font-weight:500; color:#94a3b8; text-transform:none; letter-spacing:0; }
        .irf-row { display:flex; align-items:center; gap:10px; }
        .irf-col { flex:1; min-width:0; }
        .irf-to { font-size:12px; font-weight:600; color:#94a3b8; flex-shrink:0; }
        .irf-clear { width:34px; height:34px; flex-shrink:0; display:flex; align-items:center; justify-content:center; border:1px solid #e2e8f0; border-radius:8px; background:#f8fafc; color:#64748b; cursor:pointer; }
        .irf-clear:hover { background:#fef2f2; border-color:#fecaca; color:#dc2626; }
        .irf-msg { font-size:11.5px; font-weight:500; color:#94a3b8; margin:6px 0 0; line-height:1.5; }
        .irf-msg.irf-err { color:#dc2626; }
        .irf-msg.irf-ok { color:#047857; }
        @media (max-width:560px) {
          .irf-row { flex-wrap:wrap; }
          .irf-col { flex:1 1 100%; }
          .irf-to { display:none; }
        }
      `}</style>
    </div>
  );
}
