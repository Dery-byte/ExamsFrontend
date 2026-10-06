import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import RemarkControl from '../../components/examops/RemarkControl';
import AppModal, { ModalState } from '../../components/ui/AppModal';
import { getReport, getRegCourses, getReportsByUser, getTakenQuizzesOfCategoryByUser, downloadReportPdf, getOpenToEveryoneCourses } from '../../api/endpoints';
import PageHeader from '../../components/PageHeader';
import {
  Loader2,
  BookOpen,
  Award,
  Download,
  FileText,
  Activity,
  ArrowUpRight,
  Clock,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { tx } from '../../utils/terms';
import { toNum, fmtNum, pct, gradeTone } from '../../utils/scores';

/* ─── tiny helpers ──────────────────────────────────────────────── */
const gradeColor = (p: number) =>
  p >= 70 ? 'var(--success)' : p >= 50 ? 'var(--warning)' : 'var(--danger)';

const gradeLabel = (p: number) =>
  p >= 70 ? 'EXCELLENT' : p >= 50 ? 'SATISFACTORY' : 'NEEDS IMPROVEMENT';

/* ─── summary modal ─────────────────────────────────────────────── */
function ScoreRing({ percent, color }: { percent: number; color: string }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const filled = Math.max(0, Math.min(100, percent));
  return (
    <div className="am-ring" role="img" aria-label={`${percent}% overall`}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r={r} className="am-ring-track" />
        <circle cx="50" cy="50" r={r} className="am-ring-value"
          style={{ stroke: color, strokeDasharray: c, strokeDashoffset: c * (1 - filled / 100) }} />
      </svg>
      <span className="am-ring-label" style={{ color }} aria-hidden="true">{percent}<small>%</small></span>
    </div>
  );
}

function BreakdownRow({ label, hint, got, max, total }: {
  label: string; hint?: string; got: number; max: number; total?: boolean;
}) {
  const p = pct(got, max);
  const tone = gradeTone(p);
  return (
    <div className={`am-row${total ? ' am-row-total' : ''}`}>
      <div className="am-row-head">
        <div className="am-row-label">
          <span>{label}</span>
          {hint && <small>{hint}</small>}
        </div>
        <div className="am-row-score">
          <strong>{fmtNum(got)}</strong>
          <span>/ {fmtNum(max)}</span>
          <em style={{ color: tone.text }}>{p}%</em>
        </div>
      </div>
      <div className="am-bar" role="progressbar" aria-label={`${label} score`}
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, p)}>
        <div className="am-bar-fill" style={{ width: `${Math.min(100, p)}%`, background: tone.solid }} />
      </div>
    </div>
  );
}

function SummaryModal({ qId, onClose, userId }: { qId: number; onClose: () => void; userId: number }) {
  const [data, setData] = useState<any[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    getReport(userId, qId)
      .then(res => {
        if (cancelled) return;
        setData(Array.isArray(res) ? res : []);
        setStatus('ready');
      })
      .catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
  }, [qId, userId, reloadKey]);

  const quiz = data[0]?.quiz;
  const quizLabel = [quiz?.category?.courseCode, quiz?.title].filter(Boolean).join(' · ');

  return (
    <AppModal
      title="Performance Analytics"
      subtitle="Detailed evaluation breakdown for this session"
      meta={status === 'ready' && quizLabel
        ? <><BookOpen size={13} aria-hidden="true" /><span title={quizLabel}>{quizLabel}</span></>
        : undefined}
      onClose={onClose}
    >
      {status === 'loading' ? (
        <ModalState tone="loading" icon={<Loader2 className="am-spin" size={36} />}>Loading your results…</ModalState>
      ) : status === 'error' ? (
        <ModalState
          tone="error"
          icon={<AlertTriangle size={28} />}
          title="Couldn't load analytics"
          action={
            <button type="button" className="btn-lexa btn-lexa-outline am-retry" onClick={() => setReloadKey(k => k + 1)}>
              <RotateCcw size={14} aria-hidden="true" /> Try again
            </button>
          }
        >
          Check your connection and try again.
        </ModalState>
      ) : data.length === 0 ? (
        <ModalState icon={<Activity size={28} />} title="No analytics available">
          Detailed metrics are still being processed. Please check back after official verification.
        </ModalState>
      ) : (
        <div className="am-reports">
          {data.map((r: any, i: number) => {
            const type  = r.quiz?.quizType ?? '';
            const showObj = type !== 'THEORY';
            const showTh  = type !== 'OBJ';
            const objGot = toNum(r.marks),  objMax = toNum(r.quiz?.maxMarks);
            const thGot  = toNum(r.marksB), thMax  = toNum(r.maxScoreSectionB);
            const total = objGot + thGot;
            const max   = objMax + thMax;
            const p     = pct(total, max);
            const tone  = gradeTone(p);
            return (
              <section key={r.id ?? i} className="am-report" aria-label={data.length > 1 ? `Attempt ${i + 1}` : undefined}>
                {data.length > 1 && <div className="am-attempt">Attempt {i + 1}</div>}

                <div className="am-summary" style={{ background: tone.soft, borderColor: tone.border }}>
                  <ScoreRing percent={p} color={tone.solid} />
                  <div className="am-summary-text">
                    <span className="am-grade" style={{ color: tone.text, borderColor: tone.border }}>
                      <Award size={13} aria-hidden="true" /> {gradeLabel(p)}
                    </span>
                    <div className="am-total">
                      <strong>{fmtNum(total)}</strong>
                      <span>/ {fmtNum(max)}</span>
                    </div>
                    <p>Total score across all sections</p>
                  </div>
                </div>

                <div className="am-breakdown">
                  <h3 className="am-section-title">Score breakdown</h3>
                  {showObj && <BreakdownRow label="Section A" hint="Objective" got={objGot} max={objMax} />}
                  {showTh  && <BreakdownRow label="Section B" hint="Theory" got={thGot} max={thMax} />}
                  {showObj && showTh && <BreakdownRow label="Aggregate" got={total} max={max} total />}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </AppModal>
  );
}

/* ─── quiz card ─────────────────────────────────────────────────── */
function QuizCard({ q, idx, report, onSummary, onDownload, isDownloading }: {
  q: any; idx: number; report: any;
  onSummary: () => void;
  onDownload: () => void;
  isDownloading: boolean;
}) {
  if (!q) return null;
  const closed  = q?.status === 'CLOSED';
  const total   = parseFloat(report?.marks || 0) + parseFloat(report?.marksB || 0);
  const max     = parseFloat(report?.quiz?.maxMarks || 0) + parseFloat(report?.maxScoreSectionB || 0);
  const p       = report ? pct(total, max) : 0;
  const color   = report ? gradeColor(p) : '#adb5bd';

  return (
    <div className="lexa-card quiz-card-premium" style={{ transition: 'all 0.3s', display: 'flex', flexDirection: 'column', border: '1px solid #f1f5f7' }}>
      <div className="lexa-card-body" style={{ flex: 1, padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#adb5bd', background: '#fcfdfe', padding: '4px 10px', borderRadius: 6, border: '1px solid #f1f5f7' }}>
            REF #{String(idx + 1).padStart(3, '0')}
          </span>
          <span className={`lexa-badge badge-soft-${closed ? 'success' : 'info'}`} style={{ padding: '4px 12px', fontSize: 11, borderRadius: 4, fontWeight: 800 }}>
            {closed ? 'VERIFIED' : 'ACTIVE'}
          </span>
        </div>

        <h6 style={{ fontSize: 17, fontWeight: 800, color: '#2a3142', margin: '0 0 8px 0', lineHeight: 1.4 }}>{q?.title || 'Unknown Assessment'}</h6>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#74788d', fontSize: 12, fontWeight: 700 }}>
          <BookOpen size={14} className="text-primary" />
          {q?.category?.courseCode || 'N/A'} • {q?.category?.title || 'Uncategorized'}
        </div>

        <div style={{ marginTop: 24, padding: '18px', background: report?.isReviewed ? '#fcfdfe' : '#fffbeb', border: `1px solid ${report?.isReviewed ? '#f1f5f7' : '#fde68a'}`, borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 72 }}>
          {report?.isReviewed ? (
            <>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#adb5bd', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Score Attained</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#2a3142' }}>
                  {total} <span style={{ color: '#adb5bd', fontSize: 13, fontWeight: 600 }}>/ {max}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: color }}>{p}%</div>
                <div style={{ fontSize: 9, fontWeight: 800, color: color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Proficiency</div>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Clock size={20} color="#b45309" />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#92400e' }}>⏳ Pending Review</div>
                <div style={{ fontSize: 11, color: '#b45309', fontWeight: 600, marginTop: 2 }}>{tx("Results available once reviewed by lecturer")}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f7', background: '#fcfdfe', display: 'flex', gap: 12 }}>
        <button 
          onClick={report?.isReviewed ? onSummary : undefined}
          disabled={!report?.isReviewed}
          title={!report?.isReviewed ? tx('Analytics available after lecturer review') : 'View performance analytics'}
          className="btn-lexa btn-lexa-outline"
          style={{ flex: 1, padding: '10px', fontSize: 13, borderRadius: 8, opacity: report?.isReviewed ? 1 : 0.45, cursor: report?.isReviewed ? 'pointer' : 'not-allowed' }}
        >
          Analytics
        </button>
        <button 
          onClick={closed && report?.isReviewed && !isDownloading ? onDownload : undefined} 
          disabled={!closed || !report?.isReviewed || isDownloading}
          className={`btn-lexa ${closed && report?.isReviewed ? 'btn-lexa-primary' : ''}`}
          style={{ flex: 1, padding: '10px', fontSize: 13, opacity: (closed && report?.isReviewed) ? 1 : 0.5, justifyContent: 'center', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}
          title={!report?.isReviewed ? tx('Result Slip available after lecturer review') : ''}
        >
          {isDownloading
            ? <><Loader2 size={15} className="spin-ico" /> Generating...</>
            : <><Download size={15} /> Result Slip</>}
        </button>
      </div>
      <RemarkControl report={report} />
    </div>
  );
}

/* ─── main component ────────────────────────────────────────────── */
export default function LoadQuiz() {
  const { user } = useAuth();

  const [uniqueCategories, setUniqueCategories] = useState<any[]>([]);
  const [selectedCid, setSelected]              = useState('');
  const [quizzes, setQuizzes]                   = useState<any[]>([]);
  const [reports, setReports]                   = useState<any[]>([]);
  const [isLoadingInit, setLoadingInit]         = useState(true);
  const [isLoadingQ, setLoadingQ]               = useState(false);
  const [summaryId, setSummaryId]               = useState<number | null>(null);
  const [downloadingId, setDownloadingId]       = useState<number | null>(null);

  const handleDownloadPdf = async (q: any) => {
    setDownloadingId(q.qId);
    let blob: Blob | null = null;
    try {
      const res = await downloadReportPdf(q.qId);
      blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: 'application/pdf' });
    } catch (err: any) {
      // With responseType 'blob' the server's error text arrives as a Blob — read it so the real cause is visible.
      let detail = '';
      try {
        const data = err?.response?.data;
        detail = data instanceof Blob ? await data.text() : (typeof data === 'string' ? data : '');
      } catch { /* ignore */ }
      console.error('PDF request failed', err?.response?.status, detail || err?.message, err);
      alert('Could not generate the result slip. Please try again.' + (detail ? ' ' + detail : ''));
      setDownloadingId(null);
      return;
    }

    // The PDF was received. Saving it is best-effort and must never show the "could not generate" alert.
    try {
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      const safeCourse = String(q.category?.title || 'Course').replace(/[^a-zA-Z0-9.-]/g, '_');
      const safeQuiz = String(q.title || 'Quiz').replace(/[^a-zA-Z0-9.-]/g, '_');
      link.setAttribute('download', `ResultsSlip_${safeCourse}_${safeQuiz}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch (err) {
      console.error('PDF was received but saving it failed', err);
    } finally {
      setDownloadingId(null);
    }
  };








  useEffect(() => { init(); }, []);
  useEffect(() => { if (selectedCid) loadQuizzes(selectedCid); else setQuizzes([]); }, [selectedCid]);

  const init = async () => {
    if (!user?.id) return;
    try {
      const [reg, rpts, open] = await Promise.all([
        getRegCourses(),
        getReportsByUser(user.id).catch(() => []),
        getOpenToEveryoneCourses().catch(() => []),   // results of quizzes taken without registering
      ]);
      const mine = Array.isArray(reg) ? reg.filter((r: any) => r.user?.id === user.id) : [];
      setReports(Array.isArray(rpts) ? rpts : []);
      
      const map = new Map();
      mine.forEach((r: any) => {
        if (r.category && r.category.cid) {
          map.set(r.category.cid, r.category);
        }
      });
      (Array.isArray(open) ? open : []).forEach((c: any) => { if (c?.cid && !map.has(c.cid)) map.set(c.cid, c); });
      const cats = Array.from(map.values());
      
      setUniqueCategories(cats);
      if (cats.length > 0) setSelected(String(cats[0].cid));
    } catch (e) {
      console.error("Failed to load init data", e);
    } finally { 
      setLoadingInit(false); 
    }
  };

  const loadQuizzes = async (cid: string) => {
    setLoadingQ(true);
    try { 
      let q = await getTakenQuizzesOfCategoryByUser(Number(cid)); 
      if (q && q.data && Array.isArray(q.data)) q = q.data;
      setQuizzes(Array.isArray(q) ? q.filter(Boolean) : []); 
    } catch { 
      setQuizzes([]); 
    }
    setLoadingQ(false);
  };

  const getReportForQuiz = (qId: number) => reports.find((r: any) => r && r.quiz && r.quiz.qId === qId) ?? null;

  if (isLoadingInit) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <Loader2 className="spin-ico" size={48} style={{ color: 'var(--primary)', marginBottom: 20 }} />
      <h5 style={{ fontWeight: 800, color: '#2a3142' }}>Synchronizing Secure Vault</h5>
      <p style={{ color: '#adb5bd', fontSize: 14, fontWeight: 600 }}>Accessing candidate examination records...</p>
    </div>
  );

  return (
    <div className="animate-fade-in" style={{ paddingBottom: 40 }}>
      {summaryId !== null && user?.id && (
        <SummaryModal qId={summaryId} userId={user.id} onClose={() => setSummaryId(null)}/>
      )}

      <PageHeader title="Examination Records" breadcrumbs={['Lexa', 'Portal', 'History']} />

      <div className="loadquiz-grid">
        {/* Desktop Sidebar: Course Selection (hidden on mobile) */}
        <div className="lexa-card loadquiz-sidebar loadquiz-desktop-only" style={{ marginBottom: 0 }}>
          <div className="lexa-card-header" style={{ padding: '20px 24px', background: '#fff', borderBottom: '1px solid #f1f5f7' }}>
            <h6 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#2a3142', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Academic Portfolio</h6>
          </div>
          <div className="lexa-card-body" style={{ padding: '15px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {uniqueCategories.map((c: any) => {
                const active = selectedCid === String(c.cid);
                return (
                  <button 
                    key={c.cid} 
                    onClick={() => setSelected(String(c.cid))} 
                    className={`portfolio-btn ${active ? 'active' : ''}`}
                    style={{
                      width: '100%', textAlign: 'left', padding: '14px 18px', borderRadius: 10,
                      background: active ? 'var(--primary)' : 'transparent',
                      color: active ? '#fff' : '#495057',
                      display: 'flex', alignItems: 'center', gap: 14, border: 'none', cursor: 'pointer', transition: 'all 0.3s',
                      boxShadow: active ? '0 4px 12px rgba(122, 111, 190, 0.25)' : 'none'
                    }}
                  >
                    <div style={{ 
                      width: 32, height: 32, borderRadius: '8px', 
                      background: active ? 'rgba(255,255,255,0.2)' : 'rgba(122, 111, 190, 0.08)',
                      color: active ? '#fff' : 'var(--primary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                       <BookOpen size={16} />
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontWeight: 800, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.courseCode}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, opacity: active ? 0.8 : 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div>
                    </div>
                    {active && <ArrowUpRight size={14} style={{ opacity: 0.8 }} />}
                  </button>
                );
              })}
            </div>
            {uniqueCategories.length === 0 && (
              <div style={{ padding: '40px 10px', textAlign: 'center' }}>
                 <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#fcfdfe', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px', color: '#e1e9f1' }}>
                    <Activity size={24} />
                 </div>
                 <p style={{ fontSize: 13, color: '#adb5bd', fontWeight: 700 }}>No active portfolio.</p>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Dropdown: Course Selection (hidden on desktop) */}
        <div className="loadquiz-mobile-only lexa-card" style={{ marginBottom: 0, padding: 0 }}>
          <div className="lexa-card-body" style={{ padding: '16px 20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 800, color: '#2a3142', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
              <BookOpen size={15} style={{ color: 'var(--primary)' }} /> Academic Portfolio
            </label>
            <div style={{ position: 'relative' }}>
              <select
                value={selectedCid}
                onChange={e => setSelected(e.target.value)}
                style={{
                  width: '100%', padding: '12px 40px 12px 16px', fontSize: 14, fontWeight: 700,
                  color: '#2a3142', background: '#f8f9fa', border: '1.5px solid #e1e9f1',
                  borderRadius: 10, appearance: 'none', cursor: 'pointer', outline: 'none',
                  transition: 'border-color 0.2s'
                }}
              >
                {uniqueCategories.length === 0 && <option value="">{tx("No courses available")}</option>}
                {uniqueCategories.map((c: any) => (
                  <option key={c.cid} value={String(c.cid)}>
                    {c.courseCode} — {c.title}
                  </option>
                ))}
              </select>
              <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#adb5bd' }}>
                <ArrowUpRight size={16} style={{ transform: 'rotate(90deg)' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Main Records Area */}
        <div className="animate-fade-in-right">
          {isLoadingQ ? (
            <div className="lexa-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', background: '#fff' }}>
              <Loader2 className="spin-ico text-primary" size={48} style={{ marginBottom: 20 }} />
              <h6 style={{ fontWeight: 800, color: '#2a3142' }}>Retrieving Session Data</h6>
              <p style={{ color: '#adb5bd', fontSize: 14, fontWeight: 600 }}>Accessing secure repository...</p>
            </div>
          ) : quizzes.length === 0 ? (
            <div className="lexa-card" style={{ padding: '100px 20px', textAlign: 'center', background: '#fff', border: '1px dashed #e1e9f1' }}>
              <div style={{ width: 100, height: 100, borderRadius: '24px', background: 'rgba(122, 111, 190, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: '#adb5bd', transform: 'rotate(-5deg)' }}>
                <FileText size={45} />
              </div>
              <h4 style={{ fontWeight: 800, color: '#2a3142', marginBottom: 12 }}>No Assessment History</h4>
              <p style={{ color: '#74788d', fontSize: 15, maxWidth: 450, margin: '0 auto', lineHeight: 1.6, fontWeight: 600 }}>
                There are no recorded attempts for this curriculum module. Your completed examinations will appear here once verified.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
              {quizzes.map((q: any, i: number) => (
                <QuizCard
                  key={q?.qId || `quiz-${i}`}
                  q={q}
                  idx={i}
                  report={getReportForQuiz(q?.qId)}
                  onSummary={() => setSummaryId(q?.qId)}
                  onDownload={() => handleDownloadPdf(q)}
                  isDownloading={downloadingId === q?.qId}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      
      <style>{`
        .portfolio-btn:not(.active):hover {
          background: #fcfdfe !important;
          transform: translateX(5px);
        }
        .quiz-card-premium:hover {
          transform: translateY(-8px);
          box-shadow: 0 12px 24px rgba(18, 38, 63, 0.08) !important;
          border-color: var(--primary) !important;
        }
        .btn-lexa-outline {
          background: transparent;
          border: 1.5px solid #e1e9f1;
          color: #74788d;
        }
        .btn-lexa-outline:hover {
          background: #f8f9fa;
          border-color: #ced4da;
          color: #495057;
        }
        /* ── Performance Analytics modal content (shell styles live in AppModal.css) ── */
        .am-reports { display: flex; flex-direction: column; gap: 28px; }
        .am-report + .am-report { padding-top: 28px; border-top: 1px dashed #e1e9f1; }
        .am-attempt { margin-bottom: 12px; font-size: 11px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: #74788d; }

        .am-summary {
          display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 22px;
          padding: 20px 22px; border: 1px solid; border-radius: 12px;
        }
        .am-ring { position: relative; width: 104px; height: 104px; }
        .am-ring svg { display: block; width: 100%; height: 100%; transform: rotate(-90deg); }
        .am-ring circle { fill: none; stroke-width: 9; }
        .am-ring-track { stroke: rgba(42, 49, 66, 0.08); }
        .am-ring-value { stroke-linecap: round; transition: stroke-dashoffset .6s ease-out; }
        .am-ring-label {
          position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
          font-size: 26px; font-weight: 800; font-variant-numeric: tabular-nums;
        }
        .am-ring-label small { margin: 6px 0 0 1px; font-size: 13px; }
        .am-summary-text { min-width: 0; display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }
        .am-grade {
          display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px;
          border: 1px solid; border-radius: 999px; background: #fff;
          font-size: 11px; font-weight: 800; letter-spacing: .05em;
        }
        .am-total { display: flex; align-items: baseline; gap: 6px; font-variant-numeric: tabular-nums; }
        .am-total strong { font-size: 30px; font-weight: 800; color: #2a3142; line-height: 1.1; }
        .am-total span { font-size: 15px; font-weight: 700; color: #adb5bd; }
        .am-summary-text p { margin: 0; font-size: 13px; font-weight: 600; color: #74788d; }

        .am-breakdown { margin-top: 24px; }
        .am-section-title { margin: 0 0 4px; font-size: 11px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: #74788d; }
        .am-row { padding: 14px 0; border-bottom: 1px solid #f1f5f7; }
        .am-row:last-child { border-bottom: none; padding-bottom: 0; }
        .am-row-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
        .am-row-label { min-width: 0; display: flex; align-items: baseline; gap: 8px; font-size: 14px; font-weight: 700; color: #2a3142; }
        .am-row-label small { font-size: 12px; font-weight: 600; color: #adb5bd; }
        .am-row-score { display: flex; align-items: baseline; gap: 4px; white-space: nowrap; font-variant-numeric: tabular-nums; font-size: 13px; font-weight: 600; color: #adb5bd; }
        .am-row-score strong { font-size: 15px; font-weight: 800; color: #2a3142; }
        .am-row-score em { min-width: 44px; margin-left: 8px; font-style: normal; font-weight: 800; text-align: right; }
        .am-bar { height: 6px; border-radius: 999px; background: #f1f3f7; overflow: hidden; }
        .am-bar-fill { height: 100%; border-radius: inherit; transition: width .6s ease-out; }
        .am-row-total .am-row-label { font-weight: 800; }
        .am-row-total .am-row-score strong { font-size: 16px; }
        .am-row-total .am-bar { height: 8px; }

        /* Phones: stack the ring above the score */
        @media (max-width: 520px) {
          .am-summary { grid-template-columns: 1fr; justify-items: center; gap: 14px; padding: 18px 16px; text-align: center; }
          .am-summary-text { align-items: center; }
          .am-ring { width: 96px; height: 96px; }
        }
        /* Very narrow phones: section hint drops under its label */
        @media (max-width: 360px) {
          .am-row-label { flex-direction: column; gap: 0; }
          .am-row-score em { min-width: 36px; margin-left: 4px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .am-ring-value, .am-bar-fill { transition: none; }
        }
        .text-primary { color: var(--primary); }
        .spin-ico { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .loadquiz-grid {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 30px;
          align-items: start;
        }
        .loadquiz-sidebar {
          position: sticky;
          top: 90px;
        }

        /* Desktop: show sidebar, hide dropdown */
        .loadquiz-mobile-only { display: none; }
        .loadquiz-desktop-only { display: block; }

        /* Tablet/Mobile — switch to dropdown */
        @media (max-width: 992px) {
          .loadquiz-grid {
            grid-template-columns: 1fr !important;
          }
          .loadquiz-desktop-only {
            display: none !important;
          }
          .loadquiz-mobile-only {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
