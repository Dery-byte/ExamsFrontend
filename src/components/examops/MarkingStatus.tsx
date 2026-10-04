import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AlertTriangle, CheckCircle, Loader2, RotateCcw } from 'lucide-react';
import { getMarkingStatus, retryMarking } from '../../api/endpoints';
import { tx } from '../../utils/terms';

/**
 * Review page banner for a quiz with theory questions: how many submissions the AI is still
 * marking, and the ones whose marking failed — those students have no result yet, so they are not
 * in the results table — each with a button to try again.
 */
export default function MarkingStatus({ quizId }: { quizId: number }) {
  const queryClient = useQueryClient();
  const [retrying, setRetrying] = useState<number | null>(null);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['quiz-marking', quizId],
    queryFn: () => getMarkingStatus(quizId),
    retry: false,
    // While submissions are being marked, check again every 20 s; results appear as they finish
    refetchInterval: q => ((q.state.data?.marking ?? 0) > 0 ? 20_000 : false),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['quiz-marking', quizId] });
    queryClient.invalidateQueries({ queryKey: ['quiz-reports', quizId] });
  };

  const retry = async (jobId: number, name: string) => {
    setRetrying(jobId);
    try {
      await retryMarking(quizId, jobId);
      toast.success(`Marking restarted for ${name}.`);
      refresh();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Could not restart marking.');
    } finally {
      setRetrying(null);
    }
  };

  // Always show a line, so staff can tell "all marked" apart from "status unavailable"
  const line = (bg: string, color: string, text: React.ReactNode) => (
    <div style={{ padding: '10px 20px', background: bg, color, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #e2e8f0' }}>
      {text}
    </div>
  );
  if (isLoading) return line('#f8fafc', '#64748b', <><Loader2 size={13} style={{ animation: 'rSpin 1s linear infinite' }} /> Checking AI marking status…</>);
  if (isError || !data) return line('#fef2f2', '#b91c1c', <><AlertTriangle size={13} /> AI marking status could not be loaded.</>);
  if (data.marking === 0 && data.failed.length === 0) {
    return line('#f0fdf4', '#15803d', <><CheckCircle size={13} /> AI marking: every theory submission has been marked.</>);
  }

  return (
    <div style={{ borderBottom: '1px solid #e2e8f0' }}>
      {data.marking > 0 && (
        <div style={{ padding: '10px 20px', background: '#eef2ff', color: '#3730a3', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Loader2 size={13} style={{ animation: 'rSpin 1s linear infinite' }} />
          {data.marking} theory submission{data.marking !== 1 ? 's are' : ' is'} still being marked by AI
          {data.retrying > 0 && ` (${data.retrying} retrying after an error)`} — {tx('they will appear below when done.')}
        </div>
      )}
      {data.failed.length > 0 && (
        <div style={{ padding: '12px 20px', background: '#fffbeb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#92400e', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
            <AlertTriangle size={14} />
            AI marking failed for {data.failed.length} submission{data.failed.length !== 1 ? 's' : ''}. {tx('The answers are saved; these students have no result until marking succeeds.')}
          </div>
          {data.failed.map(f => (
            <div key={f.jobId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '8px 0', borderTop: '1px solid #fde68a' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                  {f.studentName}{f.username && <span style={{ fontWeight: 500, color: '#64748b' }}> · {f.username}</span>}
                </div>
                <div style={{ fontSize: 11, color: '#92400e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.error}>
                  {f.tries} tr{f.tries === 1 ? 'y' : 'ies'}{f.failedAt && ` · ${new Date(f.failedAt).toLocaleString()}`}{f.error && ` · ${f.error}`}
                </div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); retry(f.jobId, f.studentName); }}
                disabled={retrying === f.jobId}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', border: 'none', borderRadius: 8, background: '#f59e0b', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: retrying === f.jobId ? 0.6 : 1 }}
              >
                {retrying === f.jobId ? <Loader2 size={12} style={{ animation: 'rSpin 1s linear infinite' }} /> : <RotateCcw size={12} />}
                Retry marking
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
