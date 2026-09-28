import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { MessageSquareWarning, Loader2, X } from 'lucide-react';
import { getMyRemarks, requestRemark } from '../../api/endpoints';
import { REMARK_STATUS } from '../../pages/shared/RemarkRequests';
import { useFeature } from '../../hooks/useFeatureFlags';

/** Student: request a re-mark of a reviewed script, or see the status of an existing request. */
export default function RemarkControl({ report }: { report: any }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);

  const { data: mine = [] } = useQuery({ queryKey: ['remarks', 'mine'], queryFn: getMyRemarks, staleTime: 60_000 });
  const requestsOpen = useFeature('REMARK_REQUESTS');
  if (!report?.id || !report?.isReviewed) return null;
  const existing = (mine as any[]).find(r => r.reportId === report.id);

  const submit = async () => {
    if (reason.trim().length < 10) { toast.error('Please explain the reason (at least 10 characters)'); return; }
    setSending(true);
    try {
      await requestRemark(report.id, reason.trim());
      toast.success('Re-mark requested. Your lecturer has been notified.');
      qc.invalidateQueries({ queryKey: ['remarks'] });
      setOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Could not send the request');
    } finally {
      setSending(false);
    }
  };

  if (existing) {
    const s = REMARK_STATUS[existing.status];
    return (
      <div style={{ padding: '10px 24px 14px', borderTop: '1px solid #f1f5f7', fontSize: 12.5, color: '#475569' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: s.bg, color: s.fg }}>
          <s.Icon size={12} /> Re-mark: {s.text}
        </span>
        {existing.response && <p style={{ margin: '6px 0 0', overflowWrap: 'anywhere' }}><strong>Response:</strong> {existing.response}</p>}
      </div>
    );
  }

  if (!requestsOpen) return null;   // switched off: existing requests above still show their status

  return (
    <div style={{ padding: '8px 24px 14px', borderTop: '1px solid #f1f5f7' }}>
      <button onClick={() => setOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', color: '#5156be', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', padding: 0 }}>
        <MessageSquareWarning size={14} /> Request a re-mark
      </button>

      {open && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onMouseDown={e => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div role="dialog" aria-modal="true" aria-label="Request a re-mark"
            style={{ width: '100%', maxWidth: 440, background: '#fff', borderRadius: 14, padding: 18, boxShadow: '0 20px 50px rgba(15,23,42,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <strong style={{ fontSize: 15, color: '#1e293b' }}>Request a re-mark</strong>
              <button onClick={() => setOpen(false)} aria-label="Close" style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #e9ecef', background: '#f8f9fa', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={15} /></button>
            </div>
            <p style={{ fontSize: 12.5, color: '#64748b', margin: '0 0 10px' }}>
              {report.quiz?.title}. You can ask once per assessment. Say which question(s) and why.
            </p>
            <textarea aria-label="Reason" rows={5} value={reason} onChange={e => setReason(e.target.value)}
              placeholder="e.g. Question 3 — my answer covers both points in the marking guide…"
              style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', resize: 'vertical' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button onClick={() => setOpen(false)} style={{ height: 36, padding: '0 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={submit} disabled={sending} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 16px', borderRadius: 8, border: 'none', background: '#5156be', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: sending ? 0.7 : 1 }}>
                {sending && <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />} Send request
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
