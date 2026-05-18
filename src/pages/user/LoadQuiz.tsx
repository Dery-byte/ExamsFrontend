import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getReport, getRegCourses, getReportsByUser, getTakenQuizzesOfCategoryByUser, downloadReportPdf } from '../../api/endpoints';
import PageHeader from '../../components/PageHeader';
import { 
  X, 
  Loader2, 
  BookOpen, 
  Award, 
  Download,
  FileText,
  Activity,
  ArrowUpRight
} from 'lucide-react';

/* ─── tiny helpers ──────────────────────────────────────────────── */
const fmtScore = (marks: any, max: any) =>
  `${parseFloat(marks || 0).toFixed(0)} / ${parseFloat(max || 0).toFixed(0)}`;

const pct = (got: any, max: any) => {
  const g = parseFloat(got || 0), m = parseFloat(max || 0);
  return m > 0 ? Math.round((g / m) * 100) : 0;
};

const gradeColor = (p: number) =>
  p >= 70 ? 'var(--success)' : p >= 50 ? 'var(--warning)' : 'var(--danger)';

const gradeLabel = (p: number) =>
  p >= 70 ? 'EXCELLENT' : p >= 50 ? 'SATISFACTORY' : 'NEEDS IMPROVEMENT';

/* ─── summary modal ─────────────────────────────────────────────── */
/* ─── summary modal ─────────────────────────────────────────────── */
function SummaryModal({ qId, onClose, userId }: { qId: number; onClose: () => void; userId: number }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getReport(userId, qId)
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [qId, userId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const quizType = data[0]?.quiz?.quizType ?? '';
  const showObj  = quizType !== 'THEORY';
  const showTh   = quizType !== 'OBJ';

  return (
    <div className="lexa-modal-overlay">
      <div ref={ref} className="lexa-modal-content animate-zoom-in" style={{ maxWidth: 650, borderRadius: 12 }}>
        <div className="lexa-modal-header" style={{ padding: '20px 25px', background: '#fff' }}>
          <div>
            <h5 className="lexa-modal-title" style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Performance Analytics</h5>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#adb5bd' }}>Detailed evaluation breakdown for this session</p>
          </div>
          <button onClick={onClose} style={{ background: '#f8f9fa', border: 'none', color: '#adb5bd', cursor: 'pointer', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="close-btn-hover">
            <X size={18} />
          </button>
        </div>

        <div className="lexa-modal-body" style={{ padding: '25px' }}>
          {loading ? (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
              <Loader2 className="spin-ico" size={40} style={{ color: 'var(--primary)', marginBottom: 20 }} />
              <p style={{ color: '#adb5bd', fontSize: 14, fontWeight: 700 }}>Processing candidate metrics...</p>
            </div>
          ) : data.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#fcfdfe', border: '1px solid #f1f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#e1e9f1' }}>
                <Activity size={40} />
              </div>
              <h6 style={{ fontWeight: 800, color: '#adb5bd' }}>No Analytics Available</h6>
              <p style={{ color: '#ced4da', fontSize: 13, maxWidth: 300, margin: '0 auto' }}>Detailed metrics are being processed. Please check back after official verification.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {data.map((r: any, i: number) => {
                const total = parseFloat(r.marks || 0) + parseFloat(r.marksB || 0);
                const max   = parseFloat(r.quiz?.maxMarks || 0) + parseFloat(r.maxScoreSectionB || 0);
                const p     = pct(total, max);
                const color = gradeColor(p);
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                      <div className="lexa-card" style={{ marginBottom: 0, background: '#fcfdfe', border: '1px solid #f1f5f7' }}>
                        <div className="lexa-card-body" style={{ textAlign: 'center', padding: '20px' }}>
                          <h3 style={{ margin: 0, fontWeight: 800, color: color, fontSize: 28 }}>{total}</h3>
                          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#adb5bd', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>Total Score</p>
                        </div>
                      </div>
                      <div className="lexa-card" style={{ marginBottom: 0, background: '#fcfdfe', border: '1px solid #f1f5f7' }}>
                        <div className="lexa-card-body" style={{ textAlign: 'center', padding: '20px' }}>
                          <h3 style={{ margin: 0, fontWeight: 800, color: color, fontSize: 28 }}>{p}%</h3>
                          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#adb5bd', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>Proficiency</p>
                        </div>
                      </div>
                    </div>

                    <div style={{ padding: '18px 24px', borderRadius: 12, background: '#fcfdfe', display: 'flex', alignItems: 'center', gap: 15, border: `1px solid ${color}40` }}>
                      <div style={{ width: 45, height: 45, borderRadius: '12px', background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${color}40` }}>
                        <Award size={24} />
                      </div>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#2a3142' }}>{gradeLabel(p)}</div>
                        <div style={{ fontSize: 13, color: '#74788d', fontWeight: 600 }}>Candidate has achieved {p}% competency in this assessment module.</div>
                      </div>
                    </div>

                    <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #f1f5f7' }}>
                      <table className="table-lexa" style={{ marginBottom: 0 }}>
                        <thead style={{ background: '#fcfdfe' }}>
                          <tr>
                            {showObj && <th style={{ padding: '15px' }}>Section A (Objective)</th>}
                            {showTh  && <th style={{ padding: '15px' }}>Section B (Theory)</th>}
                            <th style={{ textAlign: 'right', padding: '15px' }}>Aggregate Result</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            {showObj && (
                              <td style={{ padding: '15px', fontWeight: 700, color: '#495057' }}>{r.marks} <span style={{ color: '#adb5bd', fontSize: 12 }}>/ {r.quiz?.maxMarks}</span></td>
                            )}
                            {showTh && (
                              <td style={{ padding: '15px', fontWeight: 700, color: '#495057' }}>{r.marksB} <span style={{ color: '#adb5bd', fontSize: 12 }}>/ {r.maxScoreSectionB}</span></td>
                            )}
                            <td style={{ textAlign: 'right', fontWeight: 800, color: color, padding: '15px', fontSize: 16 }}>{total} <span style={{ color: '#adb5bd', fontSize: 12, fontWeight: 600 }}>/ {max}</span></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="lexa-modal-footer" style={{ padding: '15px 25px', background: '#fcfdfe', borderTop: '1px solid #f1f5f7', textAlign: 'right' }}>
          <button onClick={onClose} className="btn-lexa btn-lexa-primary" style={{ padding: '10px 30px', borderRadius: 8 }}>Acknowledge Analytics</button>
        </div>
      </div>
    </div>
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

        <div style={{ marginTop: 24, padding: '18px', background: '#fcfdfe', border: '1px solid #f1f5f7', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
        </div>
      </div>

      <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f7', background: '#fcfdfe', display: 'flex', gap: 12 }}>
        <button 
          onClick={onSummary} 
          className="btn-lexa btn-lexa-outline"
          style={{ flex: 1, padding: '10px', fontSize: 13, borderRadius: 8 }}
        >
          Analytics
        </button>
        <button 
          onClick={closed && !isDownloading ? onDownload : undefined} 
          disabled={!closed || isDownloading}
          className={`btn-lexa ${closed ? 'btn-lexa-primary' : ''}`}
          style={{ flex: 1, padding: '10px', fontSize: 13, opacity: closed ? 1 : 0.5, justifyContent: 'center', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          {isDownloading
            ? <><Loader2 size={15} className="spin-ico" /> Generating...</>
            : <><Download size={15} /> Result Slip</>}
        </button>
      </div>
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
    try {
      const res = await downloadReportPdf(q.qId);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;

      const courseTitle = q.category?.title || 'Course';
      const quizTitle = q.title || 'Quiz';
      const safeCourse = courseTitle.replace(/[^a-zA-Z0-9.-]/g, '_');
      const safeQuiz = quizTitle.replace(/[^a-zA-Z0-9.-]/g, '_');
      
      link.setAttribute('download', `ResultsSlip_${safeCourse}_${safeQuiz}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF download failed', err);
      alert('Could not generate the result slip. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  useEffect(() => { init(); }, []);
  useEffect(() => { if (selectedCid) loadQuizzes(selectedCid); else setQuizzes([]); }, [selectedCid]);

  const init = async () => {
    if (!user?.id) return;
    try {
      const [reg, rpts] = await Promise.all([
        getRegCourses(),
        getReportsByUser(user.id).catch(() => []),
      ]);
      const mine = Array.isArray(reg) ? reg.filter((r: any) => r.user?.id === user.id) : [];
      setReports(Array.isArray(rpts) ? rpts : []);
      
      const map = new Map();
      mine.forEach((r: any) => {
        if (r.category && r.category.cid) {
          map.set(r.category.cid, r.category);
        }
      });
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
    <div style={{ padding: '120px 0', textAlign: 'center' }}>
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
                {uniqueCategories.length === 0 && <option value="">No courses available</option>}
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
            <div className="lexa-card" style={{ padding: '100px 20px', textAlign: 'center', background: '#fff' }}>
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
        .lexa-modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center; z-index: 9000; animation: fadeIn .3s ease;
        }
        .animate-zoom-in { animation: zoomIn .3s cubic-bezier(0.4, 0, 0.2, 1); }
        @keyframes zoomIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .close-btn-hover:hover { background: #fee !important; color: var(--danger) !important; }
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
          .lexa-modal-content {
            width: 95vw !important;
            max-width: 650px !important;
          }
        }
      `}</style>
    </div>
  );
}
