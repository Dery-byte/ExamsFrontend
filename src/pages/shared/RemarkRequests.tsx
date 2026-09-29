import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { MessageSquareWarning, Loader2, CheckCircle2, XCircle, Clock, ExternalLink, Send } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { getRemarksToManage, respondToRemark } from '../../api/endpoints';
import { tx } from '../../utils/terms';

export const REMARK_STATUS: Record<string, { text: string; bg: string; fg: string; Icon: any }> = {
  PENDING:  { text: 'Pending',  bg: '#fff7e6', fg: '#8a5a00', Icon: Clock },
  RESOLVED: { text: 'Re-marked', bg: '#eefbee', fg: '#0b7a0b', Icon: CheckCircle2 },
  REJECTED: { text: 'Declined', bg: '#fdeeee', fg: '#9f1f1f', Icon: XCircle },
};

/** Staff: re-mark requests for the quizzes they manage. */
export default function RemarkRequests() {
  const { user } = useAuth() as any;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'PENDING' | 'ALL'>('PENDING');
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [decisions, setDecisions] = useState<Record<number, 'RESOLVED' | 'REJECTED'>>({});
  const [busy, setBusy] = useState<number | null>(null);

  const { data = [], isLoading } = useQuery({ queryKey: ['remarks', 'manage'], queryFn: getRemarksToManage });
  const items = (data as any[]).filter(r => filter === 'ALL' || r.status === 'PENDING');
  const pending = (data as any[]).filter(r => r.status === 'PENDING').length;

  // The existing review screen for the quiz; admins and lecturers each have their own
  const reviewPath = user?.role === 'LECTURER' ? '/lect/quiz-review' : '/admin/quiz-review';

  const respond = async (r: any, decision: 'RESOLVED' | 'REJECTED') => {
    const text = (drafts[r.id] ?? '').trim();
    if (!text) { toast.error(tx('Write a response to the student first')); return; }
    setBusy(r.id);
    try {
      await respondToRemark(r.id, decision, text);
      toast.success(decision === 'RESOLVED' ? 'Marked as re-marked' : 'Request declined');
      qc.invalidateQueries({ queryKey: ['remarks'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Could not save the response');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div style={{ paddingBottom: 40 }}>
      <PageHeader title="Re-mark Requests" breadcrumbs={['Assessments', 'Re-mark Requests']} />

      <div role="tablist" className="rr-tabs">
        <button role="tab" aria-selected={filter === 'PENDING'} className={filter === 'PENDING' ? 'is-active' : ''} onClick={() => setFilter('PENDING')}>
          Pending {pending > 0 && <span className="rr-badge">{pending}</span>}
        </button>
        <button role="tab" aria-selected={filter === 'ALL'} className={filter === 'ALL' ? 'is-active' : ''} onClick={() => setFilter('ALL')}>All requests</button>
      </div>

      <p className="rr-help">
        {tx("To re-mark, open the quiz in the review screen, adjust the marks and save. Then come back here and resolve the request. The student's new score is recorded automatically.")}</p>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Loader2 size={24} color="#5156be" className="rr-spin" /></div>
      ) : items.length === 0 ? (
        <div className="rr-empty"><MessageSquareWarning size={30} /><p>{filter === 'PENDING' ? 'No pending requests.' : 'No re-mark requests yet.'}</p></div>
      ) : items.map(r => {
        const s = REMARK_STATUS[r.status];
        return (
          <article key={r.id} className="rr-card">
            <div className="rr-head">
              <div style={{ minWidth: 0 }}>
                <div className="rr-title">{r.studentName}</div>
                <div className="rr-sub">{r.courseCode ? `${r.courseCode} · ` : ''}{r.quizTitle} · requested {new Date(r.createdAt).toLocaleString()}</div>
              </div>
              <span className="rr-status" style={{ background: s.bg, color: s.fg }}><s.Icon size={12} /> {s.text}</span>
            </div>

            <blockquote className="rr-reason">{r.reason}</blockquote>

            <div className="rr-scores">
              Score at request: <strong>{r.scoreBefore ?? '—'}</strong>
              {r.status !== 'PENDING' && <> · after: <strong>{r.scoreAfter ?? '—'}</strong>{r.scoreChanged ? ' (changed)' : ' (unchanged)'}</>}
            </div>

            {r.status === 'PENDING' ? (
              <>
                <fieldset className="rr-outcome">
                  <legend className="rr-label">Outcome</legend>
                  {([['RESOLVED', 'Re-marked — I reviewed the script again'], ['REJECTED', 'Declined — the original mark stands']] as const).map(([v, l]) => (
                    <label key={v} className={`rr-choice ${(decisions[r.id] ?? 'RESOLVED') === v ? 'is-on' : ''}`}>
                      <input type="radio" name={`rr-dec-${r.id}`} value={v} checked={(decisions[r.id] ?? 'RESOLVED') === v}
                        onChange={() => setDecisions(d => ({ ...d, [r.id]: v }))} />
                      {l}
                    </label>
                  ))}
                </fieldset>
                <label className="rr-label" htmlFor={`rr-resp-${r.id}`}>{tx("Response to the student")}</label>
                <textarea id={`rr-resp-${r.id}`} className="rr-input" rows={3} value={drafts[r.id] ?? ''}
                  onChange={e => setDrafts(d => ({ ...d, [r.id]: e.target.value }))}
                  placeholder="Explain what you checked and the outcome…" />
                <div className="rr-actions">
                  <button className="rr-btn" disabled={busy === r.id || !(drafts[r.id] ?? '').trim()}
                    onClick={() => respond(r, decisions[r.id] ?? 'RESOLVED')}>
                    {busy === r.id ? <Loader2 size={13} className="rr-spin" /> : <Send size={13} />} Send response
                  </button>
                  <button className="rr-btn-ghost" onClick={() => navigate(reviewPath)}><ExternalLink size={13} /> Open review screen</button>
                </div>
                <p style={{ margin: '6px 0 0', fontSize: 11.5, color: '#94a3b8' }}>
                  {tx("To change the marks, use the review screen first, then send your response here. The student is notified.")}</p>
              </>
            ) : (
              <div className="rr-response"><strong>{r.respondedBy ?? 'Staff'}:</strong> {r.response}</div>
            )}
          </article>
        );
      })}

      <style>{`
        .rr-tabs { display: flex; gap: 4px; border-bottom: 1px solid #e2e8f0; margin-bottom: 12px; }
        .rr-tabs button { display: inline-flex; align-items: center; gap: 6px; padding: 9px 14px; border: none; background: none; font-size: 13.5px; font-weight: 700; color: #64748b; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; }
        .rr-tabs button.is-active { color: #5156be; border-bottom-color: #5156be; }
        .rr-badge { background: #5156be; color: #fff; border-radius: 10px; font-size: 11px; padding: 1px 7px; }
        .rr-help { font-size: 12.5px; color: #64748b; margin: 0 0 14px; }
        .rr-card { background: #fff; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; margin-bottom: 12px; }
        .rr-head { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; }
        .rr-title { font-weight: 800; color: #1e293b; font-size: 14.5px; }
        .rr-sub { font-size: 12px; color: #64748b; margin-top: 2px; }
        .rr-status { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; font-weight: 700; padding: 3px 8px; border-radius: 6px; white-space: nowrap; }
        .rr-reason { margin: 10px 0; padding: 10px 12px; background: #f8fafc; border-left: 3px solid #cbd5e1; border-radius: 6px; font-size: 13.5px; color: #334155; white-space: pre-wrap; overflow-wrap: anywhere; }
        .rr-scores { font-size: 12.5px; color: #475569; margin-bottom: 10px; }
        .rr-label { display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 5px; }
        .rr-input { width: 100%; box-sizing: border-box; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; font-size: 13px; font-family: inherit; resize: vertical; }
        .rr-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; align-items: center; }
        .rr-btn { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 14px; border: none; border-radius: 8px; background: #5156be; color: #fff; font-weight: 700; font-size: 13px; cursor: pointer; }
        .rr-btn-ghost { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 12px; border-radius: 8px; border: 1.5px solid #e2e8f0; background: #fff; color: #475569; font-weight: 600; font-size: 13px; cursor: pointer; }
        .rr-btn:disabled, .rr-btn-ghost:disabled { opacity: 0.6; cursor: not-allowed; }
        .rr-outcome { border: none; padding: 0; margin: 0 0 10px; display: flex; flex-wrap: wrap; gap: 8px; }
        .rr-outcome legend { margin-bottom: 5px; }
        .rr-choice { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 13px; color: #334155; cursor: pointer; background: #fff; }
        .rr-choice.is-on { border-color: #5156be; background: #f5f6ff; color: #1e293b; font-weight: 600; }
        .rr-choice input { accent-color: #5156be; }
        .rr-response { font-size: 13px; color: #334155; background: #f8fafc; border-radius: 8px; padding: 8px 12px; overflow-wrap: anywhere; }
        .rr-empty { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 48px 16px; color: #94a3b8; background: #fff; border: 1.5px dashed #e2e8f0; border-radius: 12px; }
        .rr-empty p { margin: 0; }
        .rr-spin { animation: rr-spin 1s linear infinite; }
        @keyframes rr-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
