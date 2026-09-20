import { useState } from 'react';
import { createPortal } from 'react-dom';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';
import { X, RotateCcw, Loader2, CheckCircle } from 'lucide-react';
import { allowQuizRetake } from '../../api/endpoints';

export interface AttemptRow {
  id: number;
  userId: number;
  attemptNumber: number;
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'VOIDED';
  startedAt?: string;
  submittedAt?: string;
  marksA?: number | null;
  marksB?: number | null;
  voidedAt?: string;
  voidedByName?: string;
  voidReason?: string;
}

const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  SUBMITTED:   { bg: '#ecfdf5', fg: '#16a34a', label: 'Submitted' },
  IN_PROGRESS: { bg: '#fffbeb', fg: '#d97706', label: 'In progress' },
  VOIDED:      { bg: '#f1f5f9', fg: '#94a3b8', label: 'Voided (retake)' },
};

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
/** Names and titles are user-controlled and go into SweetAlert HTML, so escape them. */
const esc = (s: string) => s.replace(/[&<>"']/g, c => HTML_ESCAPES[c]);
const fmt = (d?: string) => (d ? new Date(d).toLocaleString() : '—');
const num = (v?: number | null) => (v === null || v === undefined ? '—' : String(v));
const total = (a: AttemptRow) =>  (a.marksA == null && a.marksB == null) ? '—' : String(Math.round(((a.marksA ?? 0) + (a.marksB ?? 0)) * 10) / 10);

interface Props {
  quiz: { qId: number; title: string; maxAttempts?: number };
  student: { id: number; name: string };
  attempts: AttemptRow[];
  onClose: () => void;
  /** Called after a retake is granted so the caller can refresh its data. */
  onChanged: () => void;
  /** The result has been marked as reviewed: it is final, so no retake can be allowed. */
  reviewed?: boolean;
}

/**
 * Every attempt one student made at a quiz, each with its own marks, plus "Allow retake".
 * The official result (the report) always reflects the latest non-voided attempt.
 */
export default function QuizAttemptsModal({ quiz, student, attempts, onClose, onChanged, reviewed = false }: Props) {
  const [busy, setBusy] = useState(false);
  const counted = attempts.filter(a => a.status !== 'VOIDED');
  const latest = counted[counted.length - 1];
  const max = quiz.maxAttempts ?? 1;

  const grant = async () => {
    if (!latest) return;
    const res = await Swal.fire({
      title: 'Allow a retake?',
      html: `<div style="text-align:left;font-size:14px;color:#475569">
               <b>${esc(student.name)}</b> will be able to take <b>${esc(quiz.title)}</b> again.<br/><br/>
               Attempt ${latest.attemptNumber} is voided and kept in this history.
               When they submit again, the new marks <b>replace</b> their official marks.
             </div>`,
      input: 'textarea',
      inputPlaceholder: 'Reason (optional) — e.g. network failure during the exam',
      inputAttributes: { maxlength: '500' },
      showCancelButton: true,
      confirmButtonText: 'Allow retake',
      confirmButtonColor: '#5156be',
      reverseButtons: true,
      target: document.body,
      customClass: { container: 'swal-above-modal' },
    });
    if (!res.isConfirmed) return;
    setBusy(true);
    try {
      await allowQuizRetake(quiz.qId, student.id, res.value || undefined);
      toast.success(`${student.name} can now retake this quiz`);
      onChanged();
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Could not allow a retake');
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="qr-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <style>{'.swal-above-modal { z-index: 1000000 !important; }'}</style>
      <div className="qr-modal-content" style={{ maxWidth: 780 }}>
        <div className="qr-modal-header">
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>Attempts — {student.name}</div>
            <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>
              {quiz.title} · {counted.length} of {max} attempt{max === 1 ? '' : 's'} used
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,.12)', border: 'none', borderRadius: 8, color: '#fff', width: 34, height: 34, cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 20, overflowX: 'auto' }}>
          {attempts.length === 0 ? (
            <p style={{ color: '#94a3b8', textAlign: 'center', margin: 24 }}>
              No attempts are recorded for this student. (Results from before attempts were tracked appear here after their next activity.)
            </p>
          ) : (
            <table className="resp-table" style={{ minWidth: 560 }}>
              <thead>
                <tr>{['#', 'Status', 'Started', 'Submitted', 'Sec A', 'Sec B', 'Total'].map(h => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {attempts.map(a => {
                  const s = STATUS_STYLE[a.status];
                  return (
                    <tr key={a.id} style={a.status === 'VOIDED' ? { opacity: 0.6 } : undefined}>
                      <td style={{ fontWeight: 800 }}>{a.attemptNumber}</td>
                      <td>
                        <span style={{ background: s.bg, color: s.fg, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>{s.label}</span>
                        {a.status === 'VOIDED' && (
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                            by {a.voidedByName || 'staff'} · {fmt(a.voidedAt)}
                            {a.voidReason ? <><br />“{a.voidReason}”</> : null}
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: 12, color: '#64748b' }}>{fmt(a.startedAt)}</td>
                      <td style={{ fontSize: 12, color: '#64748b' }}>{fmt(a.submittedAt)}</td>
                      <td style={{ fontWeight: 700, color: '#5156be' }}>{num(a.marksA)}</td>
                      <td style={{ fontWeight: 700, color: '#2ab57d' }}>{num(a.marksB)}</td>
                      <td style={{ fontWeight: 800 }}>{total(a)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="qr-modal-footer">
          <span style={{ fontSize: 12, color: '#64748b' }}>
            The official result always shows the latest non-voided attempt.
          </span>
          {reviewed ? (
            <span style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle size={14} /> Marked as reviewed — retakes and new attempts are locked
            </span>
          ) : (
            <button
              onClick={grant}
              disabled={busy || !latest}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', border: 'none', borderRadius: 8, background: latest ? 'linear-gradient(135deg,#5156be,#3d41a8)' : '#cbd5e1', color: '#fff', fontSize: 13, fontWeight: 700, cursor: latest ? 'pointer' : 'not-allowed' }}
            >
              {busy ? <Loader2 size={14} style={{ animation: 'rSpin 1s linear infinite' }} /> : <RotateCcw size={14} />}
              Allow retake
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
