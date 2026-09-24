import { useEffect, useState } from 'react';
import { Mail, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { setQuizEmailReport } from '../../api/endpoints';

/**
 * Per-quiz switch on the Quiz Review panel: email each student their PDF result slip
 * as soon as their review is completed. Sits inside a clickable row, so it stops propagation.
 */
export default function QuizEmailReportToggle({ quizId, initial }: { quizId: number; initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setOn(initial); }, [initial]);

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (saving) return;
    setSaving(true);
    try {
      const next = await setQuizEmailReport(quizId, !on);
      setOn(next);
      toast.success(next ? 'Students will be emailed their PDF report after review' : 'Automatic PDF emails turned off for this quiz');
    } catch {
      toast.error('Could not update this quiz');
    } finally {
      setSaving(false);
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={toggle}
      disabled={saving}
      title="Email each student their PDF result slip as soon as you finish reviewing them"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 10px 6px 12px', flexShrink: 0,
        border: `1px solid ${on ? '#bbf7d0' : '#e2e8f0'}`, borderRadius: 999, background: on ? '#f0fdf4' : '#f8fafc',
        color: on ? '#15803d' : '#64748b', fontSize: 12, fontWeight: 700, cursor: saving ? 'wait' : 'pointer', fontFamily: 'inherit',
      }}
    >
      {saving ? <Loader2 size={14} style={{ animation: 'rSpin 1s linear infinite' }} /> : <Mail size={14} />}
      <span>Email PDF report</span>
      <span style={{ width: 34, height: 18, borderRadius: 999, background: on ? '#10b981' : '#cbd5e1', position: 'relative', transition: 'background 0.2s' }}>
        <span style={{ position: 'absolute', top: 2, left: on ? 18 : 2, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
      </span>
    </button>
  );
}
