import { CalendarClock } from 'lucide-react';

interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  quizDate?: string;
  startTime?: string;
}

/** "Auto-open at scheduled time" toggle — shared by the add page and both edit modals. */
export default function AutoOpenField({ checked, onChange, quizDate, startTime }: Props) {
  const when = quizDate && startTime ? `${quizDate} at ${startTime}` : null;
  return (
    <div className={`aq-toggle ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)}>
      <div className="aq-toggle-icon"><CalendarClock size={15} /></div>
      <div className="aq-toggle-info">
        <span className="aq-toggle-label">Auto-open at scheduled time</span>
        <span className="aq-toggle-desc">
          {checked
            ? (when ? `Publishes and opens automatically on ${when} — no manual action needed` : 'Publishes and opens automatically once a date & time are set above')
            : 'Off — you publish and open it manually'}
        </span>
      </div>
      <div className="aq-switch"><div className="aq-thumb" /></div>
    </div>
  );
}
