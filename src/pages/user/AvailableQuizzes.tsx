import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getRegCourses, getActiveQuizzesOfCategory, getReport, getOpenToEveryoneCourses } from '../../api/endpoints';
import { quizInstructionsPath } from '../../utils/quizLink';
import PageHeader from '../../components/PageHeader';
import AppModal, { ModalState } from '../../components/ui/AppModal';
import { Search, Loader2, BookOpen, AlertCircle, AlertTriangle, Ban, Award, Clock, PlayCircle, FileText, ChevronRight, Activity, Calendar, RotateCcw } from 'lucide-react';
import { tx } from '../../utils/terms';
import { fmtNum, gradeTone, reportTotals, parseServerDate, fmtDateTime } from '../../utils/scores';

/* ─── attempt history modal ─────────────────────────────────────── */
function AttemptHistoryModal({ quiz, userId, onClose }: { quiz: any; userId: number; onClose: () => void }) {
  const [data, setData] = useState<any[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    getReport(userId, quiz.qId)
      .then(res => {
        if (cancelled) return;
        setData(Array.isArray(res) ? res : []);
        setStatus('ready');
      })
      .catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
  }, [quiz.qId, userId, reloadKey]);

  // Number attempts oldest → newest, then list the newest first.
  const attempts = data
    .map(r => ({ r, t: parseServerDate(r.submissionDate)?.getTime() ?? 0 }))
    .sort((a, b) => (a.t - b.t) || ((a.r.id ?? 0) - (b.r.id ?? 0)))
    .map(({ r }, i) => ({ r, n: i + 1 }))
    .reverse();

  const quizLabel = [quiz.category?.courseCode, quiz.title].filter(Boolean).join(' · ');

  return (
    <AppModal
      title="Attempt History"
      subtitle={status === 'ready' && data.length > 0
        ? `${data.length} submitted attempt${data.length === 1 ? '' : 's'} for this assessment`
        : 'Your submitted attempts for this assessment'}
      meta={quizLabel ? <><BookOpen size={13} aria-hidden="true" /><span title={quizLabel}>{quizLabel}</span></> : undefined}
      onClose={onClose}
    >
      {status === 'loading' ? (
        <ModalState tone="loading" icon={<Loader2 className="am-spin" size={36} />}>Loading your attempts…</ModalState>
      ) : status === 'error' ? (
        <ModalState
          tone="error"
          icon={<AlertTriangle size={28} />}
          title="Couldn't load your history"
          action={
            <button type="button" className="btn-lexa btn-lexa-outline am-retry" onClick={() => setReloadKey(k => k + 1)}>
              <RotateCcw size={14} aria-hidden="true" /> Try again
            </button>
          }
        >
          Check your connection and try again.
        </ModalState>
      ) : attempts.length === 0 ? (
        <ModalState icon={<FileText size={28} />} title="No attempts yet">
          You haven't attempted this assessment yet. Your results will appear here once you submit.
        </ModalState>
      ) : (
        <ol className="ah-list">
          {attempts.map(({ r, n }) => {
            const { total, max, percent } = reportTotals(r);
            const tone = gradeTone(percent);
            const date = fmtDateTime(r.submissionDate);
            const completed = (r.progress ?? 'Completed') === 'Completed';
            return (
              <li key={r.id ?? n} className="ah-item">
                <div className="ah-index" aria-hidden="true">{n}</div>
                <div className="ah-main">
                  <div className="ah-title">
                    <span>Attempt {n}</span>
                    <span className={`lexa-badge badge-soft-${completed ? 'success' : 'warning'} ah-badge`}>{r.progress ?? 'Completed'}</span>
                  </div>
                  <div className="ah-sub">
                    <Calendar size={12} aria-hidden="true" />
                    <span>{date || 'Submission date unavailable'}</span>
                  </div>
                </div>
                <div className="ah-score">
                  {r.isReviewed ? (
                    <>
                      <div className="ah-score-value">
                        <strong>{fmtNum(total)}</strong>
                        <span>/ {fmtNum(max)}</span>
                      </div>
                      <div className="ah-score-pct" style={{ color: tone.text }}>{percent}%</div>
                    </>
                  ) : (
                    <span className="ah-pending" title={tx('Results available once reviewed by lecturer')}>
                      <Clock size={12} aria-hidden="true" /> Pending review
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </AppModal>
  );
}

export default function AvailableQuizzes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userRecords, setUserRecords]         = useState<any[]>([]);
  // Global courses open to everyone (no registration), not already among the registered ones
  const [generalCourses, setGeneralCourses]   = useState<any[]>([]);
  const [selectedCid, setSelectedCid]         = useState<string>('');
  const [availablequizzes, setQuizzes]        = useState<any[]>([]);
  const [displayedQuizzes, setDisplayed]      = useState<any[]>([]);
  const [searchQuery, setSearchQuery]         = useState('');
  const [isLoadingUserRecords, setLoadingRec] = useState(true);
  const [isLoadingQuizzes, setLoadingQ]       = useState(false);
  const [historyQuiz, setHistoryQuiz]         = useState<any | null>(null);

  useEffect(() => { loadRegisteredCourses(); }, []);

  const loadRegisteredCourses = async () => {
    setLoadingRec(true);
    try {
      const [data, open]: [any[], any[]] = await Promise.all([
        getRegCourses(),
        getOpenToEveryoneCourses().catch(() => []),
      ]);
      const userId = user?.id;
      const filtered = data.filter((r: any) => r.user?.id === userId);
      setUserRecords(filtered);
      const registered = new Set(filtered.map((r: any) => r.category?.cid));
      setGeneralCourses((open ?? []).filter((c: any) => !registered.has(c.cid)));
    } catch (err) {
      console.error('Failed to load registered courses:', err);
    } finally {
      setLoadingRec(false);
    }
  };

  useEffect(() => {
    if (!selectedCid) {
      setQuizzes([]);
      setDisplayed([]);
      return;
    }

    const fetchQuizzes = async () => {
      setLoadingQ(true);
      try {
        const quizzes = await getActiveQuizzesOfCategory(Number(selectedCid));
        setQuizzes(quizzes);
      } catch {
        setQuizzes([]);
        setDisplayed([]);
      } finally {
        setLoadingQ(false);
      }
    };

    fetchQuizzes();
  }, [selectedCid]);

  useEffect(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      setDisplayed([...availablequizzes]);
    } else {
      setDisplayed(availablequizzes.filter(quiz =>
        quiz.title?.toLowerCase().includes(q) ||
        quiz.category?.title?.toLowerCase().includes(q) ||
        quiz.category?.courseCode?.toLowerCase().includes(q)
      ));
    }
  }, [searchQuery, availablequizzes]);

  return (
    <div className="animate-fade-in" style={{ paddingBottom: 40 }}>
      <PageHeader title="Examination Portal" breadcrumbs={['Lexa', 'Portal', 'Assessments']} />

      {/* Control Panel: Filter & Search */}
      <div className="lexa-card">
        <div className="lexa-card-body" style={{ background: 'linear-gradient(to right, #ffffff, #fcfdfe)' }}>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 300px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, marginBottom: 10, color: '#2a3142' }}>
                <BookOpen size={16} className="text-primary" /> {tx("Select Course Curriculum")}</label>
              <div style={{ position: 'relative' }}>
                <select 
                  style={{ 
                    borderRadius: 8, padding: '12px 15px', fontSize: 14, background: '#fff', 
                    border: '1px solid #e1e9f1', width: '100%', outline: 'none', color: '#495057',
                    appearance: 'none', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                    boxSizing: 'border-box'
                  }}
                  value={selectedCid} 
                  onChange={e => setSelectedCid(e.target.value)}
                >
                  <option value="">Choose a module to view available tests...</option>
                  {userRecords.map((r: any) => (
                    <option key={r.category?.cid} value={r.category?.cid}>
                      {r.category?.courseCode} • {r.category?.title}
                    </option>
                  ))}
                  {generalCourses.length > 0 && (
                    <optgroup label="General — open to everyone">
                      {generalCourses.map((c: any) => (
                        <option key={`general-${c.cid}`} value={c.cid}>
                          {c.courseCode} • {c.title}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <div style={{ position: 'absolute', right: 15, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#adb5bd' }}>
                   <ChevronRight size={16} style={{ transform: 'rotate(90deg)' }} />
                </div>
              </div>
            </div>

            <div style={{ flex: '1 1 300px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, marginBottom: 10, color: '#2a3142' }}>
                <Search size={16} className="text-primary" /> Quick Search
              </label>
              <div style={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#adb5bd' }} size={16} />
                <input 
                  type="text" 
                  placeholder="Filter by assessment title or mode..." 
                  style={{ 
                    borderRadius: 8, padding: '11px 15px 11px 42px', fontSize: 14, background: '#fff', 
                    border: '1px solid #e1e9f1', width: '100%', outline: 'none',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                    boxSizing: 'border-box'
                  }}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {isLoadingUserRecords || isLoadingQuizzes ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
          <Loader2 className="spin-ico" size={48} style={{ color: 'var(--primary)', marginBottom: 20 }} />
          <h5 style={{ fontWeight: 700, color: '#495057' }}>Syncing Assessment Data</h5>
          <p style={{ color: '#adb5bd', fontSize: 14 }}>Initializing secure connection to examination server...</p>
        </div>
      ) : !selectedCid ? (
        <div className="lexa-card animate-fade-in-up" style={{ padding: '100px 20px', textAlign: 'center', background: '#fff' }}>
          <div style={{ width: 90, height: 90, borderRadius: '24px', background: 'rgba(122, 111, 190, 0.05)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', transform: 'rotate(-5deg)' }}>
            <BookOpen size={45} />
          </div>
          <h4 style={{ fontWeight: 800, color: '#2a3142', marginBottom: 12 }}>Ready for Evaluation?</h4>
          <p style={{ color: '#74788d', fontSize: 15, maxWidth: 500, margin: '0 auto', lineHeight: 1.6 }}>{tx("Select one of your registered courses from the selector above to access your scheduled examinations and quiz modules.")}</p>
        </div>
      ) : displayedQuizzes.length === 0 ? (
        <div className="lexa-card animate-fade-in-up" style={{ padding: '100px 20px', textAlign: 'center', border: '1px dashed #e1e9f1' }}>
          <div style={{ width: 90, height: 90, borderRadius: '50%', background: 'rgba(241, 180, 76, 0.1)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <AlertCircle size={45} />
          </div>
          <h4 style={{ fontWeight: 800, color: '#2a3142', marginBottom: 12 }}>No Active Assessments</h4>
          <p style={{ color: '#74788d', fontSize: 15, maxWidth: 500, margin: '0 auto', lineHeight: 1.6 }}>There are currently no examinations active for this curriculum module. Please monitor your notifications for future schedules.</p>
          <button onClick={() => setSelectedCid('')} className="btn-lexa btn-lexa-outline" style={{ marginTop: 30 }}>
            {tx("Change Course Selection")}</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
          {displayedQuizzes.map((q) => (
            <div key={q.qId} className="lexa-card quiz-card-premium" style={{ display: 'flex', flexDirection: 'column', transition: 'all 0.3s', border: '1px solid #f1f5f7' }}>
              <div className="lexa-card-body" style={{ flex: 1, padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <span className="lexa-badge badge-soft-primary" style={{ padding: '4px 10px', fontSize: 11, borderRadius: 4 }}>
                    {q.category?.courseCode}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#adb5bd', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <Activity size={14} className="text-info" /> {q.quizType}
                  </div>
                </div>
                
                <h5 style={{ fontSize: 18, fontWeight: 800, marginBottom: 10, color: '#2a3142', lineHeight: 1.4 }}>{q.title}</h5>
                <p style={{ fontSize: 13, color: '#74788d', marginBottom: 24, lineHeight: 1.6 }}>{q.category?.title}</p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ padding: '14px', background: '#fcfdfe', border: '1px solid #f1f5f7', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 6, background: 'rgba(122, 111, 190, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       <FileText size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#495057' }}>{q.numberOfQuestions}</div>
                      <div style={{ fontSize: 10, color: '#adb5bd', textTransform: 'uppercase', fontWeight: 700 }}>Items</div>
                    </div>
                  </div>
                  <div style={{ padding: '14px', background: '#fcfdfe', border: '1px solid #f1f5f7', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 6, background: 'rgba(241, 180, 76, 0.1)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       <Award size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#495057' }}>{q.maxMarks}</div>
                      <div style={{ fontSize: 10, color: '#adb5bd', textTransform: 'uppercase', fontWeight: 700 }}>Points</div>
                    </div>
                  </div>
                </div>

                {/* Set by the server when the student's index number is outside the quiz's allowed range */}
                {q.accessNotice && (
                  <div role="note" style={{ marginTop: 16, padding: '10px 12px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, display: 'flex', gap: 8, alignItems: 'flex-start', color: '#9a3412', fontSize: 12.5, lineHeight: 1.5 }}>
                    <Ban size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>{q.accessNotice}</span>
                  </div>
                )}
              </div>

              <div style={{ padding: '16px 24px', background: '#fcfdfe', borderTop: '1px solid #f1f5f7', display: 'flex', gap: 12 }}>
                <button 
                  type="button"
                  onClick={() => setHistoryQuiz(q)}
                  className="btn-lexa btn-lexa-outline"
                  style={{ flex: 1, padding: '10px', fontSize: 13, borderRadius: 6 }}
                >
                  History
                </button>
                {q.accessNotice ? (
                  <button
                    type="button"
                    disabled
                    className="btn-lexa"
                    title={q.accessNotice}
                    style={{ flex: 1.5, padding: '10px', fontSize: 13, borderRadius: 6, background: '#f1f5f9', color: '#94a3b8', border: '1px solid #e2e8f0', cursor: 'not-allowed' }}
                  >
                    <Ban size={16} /> {tx("Not assigned to you")}
                  </button>
                ) : (
                  <Link
                    to={quizInstructionsPath(q.qId, { courseTitle: q.category?.title, title: q.title })}
                    className="btn-lexa btn-lexa-primary"
                    style={{ flex: 1.5, padding: '10px', fontSize: 13, textDecoration: 'none', borderRadius: 6 }}
                  >
                    <PlayCircle size={16} /> Begin Session
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {historyQuiz && user?.id && (
        <AttemptHistoryModal quiz={historyQuiz} userId={user.id} onClose={() => setHistoryQuiz(null)} />
      )}

      <style>{`
        .quiz-card-premium:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 16px rgba(18, 38, 63, 0.08) !important;
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
        .spin-ico { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        /* ── Attempt History modal content (shell styles live in AppModal.css) ── */
        .ah-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
        .ah-item {
          display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 14px;
          padding: 14px 16px; border: 1px solid #eef1f5; border-radius: 12px; background: #fcfdfe;
        }
        .ah-index {
          width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: rgba(122, 111, 190, 0.1); color: var(--primary);
          font-size: 14px; font-weight: 800; font-variant-numeric: tabular-nums;
        }
        .ah-main { min-width: 0; }
        .ah-title { display: flex; align-items: center; flex-wrap: wrap; gap: 6px 8px; font-size: 14px; font-weight: 800; color: #2a3142; }
        .ah-badge { padding: 2px 8px !important; font-size: 10px !important; border-radius: 4px !important; text-transform: uppercase; letter-spacing: .04em; }
        .ah-sub { display: flex; align-items: center; gap: 6px; margin-top: 4px; font-size: 12px; font-weight: 600; color: #74788d; }
        .ah-sub svg { flex-shrink: 0; color: #adb5bd; }
        .ah-sub span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ah-score { text-align: right; white-space: nowrap; }
        .ah-score-value { display: flex; align-items: baseline; justify-content: flex-end; gap: 4px; font-variant-numeric: tabular-nums; }
        .ah-score-value strong { font-size: 18px; font-weight: 800; color: #2a3142; line-height: 1.2; }
        .ah-score-value span { font-size: 13px; font-weight: 700; color: #adb5bd; }
        .ah-score-pct { margin-top: 2px; font-size: 12px; font-weight: 800; font-variant-numeric: tabular-nums; }
        .ah-pending {
          display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 999px;
          background: #fffbeb; border: 1px solid #fde68a; color: #92400e; font-size: 11px; font-weight: 800;
        }

        /* Narrow phones: score moves under the attempt details */
        @media (max-width: 400px) {
          .ah-item { grid-template-columns: auto minmax(0, 1fr); grid-template-areas: "index main" "index score"; row-gap: 10px; padding: 12px; }
          .ah-index { grid-area: index; align-self: start; }
          .ah-main { grid-area: main; }
          .ah-score { grid-area: score; display: flex; align-items: baseline; gap: 8px; text-align: left; }
          .ah-score-value { justify-content: flex-start; }
          .ah-score-pct { margin-top: 0; }
        }
      `}</style>
    </div>
  );
}
