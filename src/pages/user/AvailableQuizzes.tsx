import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getRegCourses, getActiveQuizzesOfCategory, getReport, getOpenToEveryoneCourses } from '../../api/endpoints';
import { quizInstructionsPath, LAST_QUIZ_COURSE_KEY as LAST_COURSE_KEY } from '../../utils/quizLink';
import PageHeader from '../../components/PageHeader';
import AppModal, { ModalState } from '../../components/ui/AppModal';
import {
  Search, Loader2, BookOpen, AlertTriangle, Ban, Award, Clock, PlayCircle, FileText, ChevronRight,
  Calendar, RotateCcw, X, ChevronDown, ClipboardList, SearchX, Repeat, Info, ListChecks, PenLine, Layers,
} from 'lucide-react';
import { tx } from '../../utils/terms';
import { fmtNum, gradeTone, reportTotals, parseServerDate, fmtDateTime } from '../../utils/scores';
import './studentCatalog.css';

/** Human label + icon for the quiz type enum (OBJ / THEORY / BOTH). */
function quizTypeInfo(type: string | undefined) {
  switch (type) {
    case 'OBJ': return { label: 'Objective', Icon: ListChecks };
    case 'THEORY': return { label: 'Theory', Icon: PenLine };
    case 'BOTH': return { label: 'Objective + Theory', Icon: Layers };
    default: return type ? { label: type, Icon: ClipboardList } : null;
  }
}

/** "1 hr 30 min" / "45 min" from the quiz's minutes field. */
function fmtDuration(minutes: unknown): string {
  const m = Math.round(Number(minutes));
  if (!m || m <= 0) return '';
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? (r ? `${h} hr ${r} min` : `${h} hr`) : `${m} min`;
}

/** "Sat 8 Nov · 9:00 AM" for a scheduled quiz, or ''. */
function fmtSchedule(q: any): string {
  if (!q?.quizDate) return '';
  const d = new Date(`${q.quizDate}T00:00:00`);
  const date = isNaN(d.getTime())
    ? String(q.quizDate)
    : d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  const time = q.startTimeAMPM || q.startTime || '';
  return time ? `${date} · ${time}` : date;
}

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
      closeOnBackdrop={false}
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
  const [registeredCourses, setRegisteredCourses] = useState<any[]>([]);
  // Global courses open to everyone (no registration), not already among the registered ones
  const [generalCourses, setGeneralCourses] = useState<any[]>([]);
  const [selectedCid, setSelectedCid] = useState<string>('');
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [coursesFailed, setCoursesFailed] = useState(false);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [quizzesFailed, setQuizzesFailed] = useState(false);
  const [quizReload, setQuizReload] = useState(0);
  const [historyQuiz, setHistoryQuiz] = useState<any | null>(null);

  useEffect(() => { loadCourses(); }, []);

  const loadCourses = async () => {
    setLoadingCourses(true);
    setCoursesFailed(false);
    try {
      const [data, open]: [any[], any[]] = await Promise.all([
        getRegCourses(),
        getOpenToEveryoneCourses().catch(() => []),
      ]);
      const userId = user?.id;
      const mine = (Array.isArray(data) ? data : [])
        .filter((r: any) => r.user?.id === userId && r.category)
        .map((r: any) => r.category);
      const registered = new Set(mine.map((c: any) => c.cid));
      const general = (open ?? []).filter((c: any) => !registered.has(c.cid));
      setRegisteredCourses(mine);
      setGeneralCourses(general);

      // Re-open the course the student last looked at, else the first one.
      const all = [...mine, ...general];
      let saved: string | null = null;
      try { saved = sessionStorage.getItem(LAST_COURSE_KEY); } catch { /* storage blocked */ }
      const pick = all.find(c => String(c.cid) === saved) ?? all[0];
      setSelectedCid(pick ? String(pick.cid) : '');
    } catch (err) {
      console.error('Failed to load registered courses:', err);
      setCoursesFailed(true);
    } finally {
      setLoadingCourses(false);
    }
  };

  useEffect(() => {
    if (!selectedCid) { setQuizzes([]); return; }
    try { sessionStorage.setItem(LAST_COURSE_KEY, selectedCid); } catch { /* storage blocked */ }
    let cancelled = false;
    setLoadingQuizzes(true);
    setQuizzesFailed(false);
    getActiveQuizzesOfCategory(Number(selectedCid))
      .then(list => { if (!cancelled) setQuizzes(Array.isArray(list) ? list : []); })
      .catch(() => { if (!cancelled) { setQuizzes([]); setQuizzesFailed(true); } })
      .finally(() => { if (!cancelled) setLoadingQuizzes(false); });
    return () => { cancelled = true; };
  }, [selectedCid, quizReload]);

  const allCourses = useMemo(() => [...registeredCourses, ...generalCourses], [registeredCourses, generalCourses]);
  const selectedCourse = allCourses.find(c => String(c.cid) === selectedCid);

  const displayedQuizzes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return quizzes;
    return quizzes.filter(quiz =>
      quiz.title?.toLowerCase().includes(q) ||
      quiz.category?.title?.toLowerCase().includes(q) ||
      quiz.category?.courseCode?.toLowerCase().includes(q) ||
      quizTypeInfo(quiz.quizType)?.label.toLowerCase().includes(q)
    );
  }, [searchQuery, quizzes]);

  const selectCourse = (cid: string) => {
    if (cid === selectedCid) return;
    setSearchQuery('');
    setSelectedCid(cid);
  };

  const query = searchQuery.trim();
  const busy = loadingCourses || loadingQuizzes;
  const openToYou = quizzes.filter(q => !q.accessNotice).length;

  const courseItem = (c: any, general = false) => {
    const active = String(c.cid) === selectedCid;
    return (
      <li key={`${general ? 'g' : 'r'}-${c.cid}`}>
        <button
          type="button"
          className={`aq-course-item${active ? ' is-active' : ''}`}
          aria-current={active ? 'true' : undefined}
          onClick={() => selectCourse(String(c.cid))}
          title={`${c.courseCode ?? ''} · ${c.title ?? ''}`}
        >
          <span className="aq-ci-text">
            <span className="aq-ci-code">
              {c.courseCode}
              {general && <span className="aq-course-tag">Open</span>}
            </span>
            <span className="aq-ci-title">{c.title}</span>
          </span>
          <ChevronRight size={16} className="aq-ci-chev" aria-hidden />
        </button>
      </li>
    );
  };

  const skeleton = (
        <div className="rc-grid" aria-busy="true" aria-label="Loading assessments">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rc-card rc-skel">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div className="rc-skel-line" style={{ width: 56, height: 20 }} />
                <div className="rc-skel-line" style={{ width: 80, height: 20 }} />
              </div>
              <div className="rc-skel-line" style={{ width: '70%', height: 16, marginTop: 14 }} />
              <div className="rc-skel-line" style={{ width: '50%', height: 12, marginTop: 8 }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 14 }}>
                {Array.from({ length: 4 }).map((__, j) => <div key={j} className="rc-skel-line" style={{ height: 30, borderRadius: 9 }} />)}
              </div>
              <div className="rc-skel-foot" style={{ gap: 8 }}>
                <div className="rc-skel-line" style={{ flex: 1, height: 38, borderRadius: 9 }} />
                <div className="rc-skel-line" style={{ flex: 1.4, height: 38, borderRadius: 9 }} />
              </div>
            </div>
          ))}
        </div>
  );

  return (
    <div className="rc animate-fade-in">
      <PageHeader title="Assessments" breadcrumbs={['Portal', 'Assessments']} />

      {/* ── Context strip ── */}
      <section className="rc-hero" aria-label="Assessment summary">
        <div className="rc-hero-main">
          <div className="rc-hero-icon"><ClipboardList size={22} /></div>
          <div className="rc-hero-text">
            <span className="rc-eyebrow">Examination portal</span>
            <h2 className="rc-hero-title">Your assessments</h2>
            <p className="rc-hero-sub">
              {tx('Assessments are grouped by course. Choose a course, then start any assessment open to you. Each one shows its instructions before the timer starts.')}
            </p>
          </div>
        </div>
        <div className="rc-stats">
          <div className="rc-stat">
            <span className="rc-stat-label">{tx('Courses')}</span>
            <strong className="rc-stat-value">{loadingCourses ? '—' : allCourses.length}</strong>
          </div>
          <div className="rc-stat">
            <span className="rc-stat-label">Open now</span>
            <strong className="rc-stat-value">{busy || !selectedCid ? '—' : openToYou}</strong>
          </div>
        </div>
      </section>

      {loadingCourses ? (
        skeleton
      ) : coursesFailed ? (
        <div className="rc-empty">
          <div className="rc-empty-icon rc-empty-icon--warn"><AlertTriangle size={26} /></div>
          <h4>{tx("Couldn't load your courses")}</h4>
          <p>Check your connection and try again.</p>
          <div className="rc-empty-actions">
            <button type="button" className="rc-btn" onClick={loadCourses}><RotateCcw size={14} /> Try again</button>
          </div>
        </div>
      ) : allCourses.length === 0 ? (
        <div className="rc-empty">
          <div className="rc-empty-icon rc-empty-icon--muted"><BookOpen size={26} /></div>
          <h4>{tx('No registered courses yet')}</h4>
          <p>{tx('Assessments are listed per course. Register for your courses first, then come back here to take them.')}</p>
          <div className="rc-empty-actions">
            <button type="button" className="rc-btn" onClick={() => navigate('/user-dashboard/register')}>
              {tx('Register courses')} <ChevronRight size={15} />
            </button>
          </div>
        </div>
      ) : (
        <div className="aq-layout">
          {/* ── Step 1: course ── */}
          <aside className="aq-side" aria-label={tx('Your courses')}>
            <div className="aq-step-head">
              <span className="aq-step" aria-hidden>1</span>
              <div>
                <h3>{tx('Choose a course')}</h3>
                <p>{tx('Pick one of your courses to see its quizzes and exams.')}</p>
              </div>
            </div>

            {/* Phones / tablets: a plain dropdown */}
            <div className="aq-select-wrap">
              <select
                aria-label={tx('Course')}
                value={selectedCid}
                onChange={e => selectCourse(e.target.value)}
              >
                {registeredCourses.length > 0 && (
                  <optgroup label={tx('My registered courses')}>
                    {registeredCourses.map(c => (
                      <option key={`r-${c.cid}`} value={c.cid}>{c.courseCode} · {c.title}</option>
                    ))}
                  </optgroup>
                )}
                {generalCourses.length > 0 && (
                  <optgroup label="General · open to everyone">
                    {generalCourses.map(c => (
                      <option key={`g-${c.cid}`} value={c.cid}>{c.courseCode} · {c.title}</option>
                    ))}
                  </optgroup>
                )}
              </select>
              <ChevronDown size={18} className="aq-select-chev" aria-hidden />
            </div>

            {/* Desktop: a list of courses */}
            <ul className="aq-course-list">
              {generalCourses.length > 0 && registeredCourses.length > 0 && (
                <li className="aq-list-group" role="presentation">{tx('My registered courses')}</li>
              )}
              {registeredCourses.map(c => courseItem(c))}
              {generalCourses.length > 0 && (
                <li className="aq-list-group" role="presentation">General · open to everyone</li>
              )}
              {generalCourses.map(c => courseItem(c, true))}
            </ul>
          </aside>

          {/* ── Step 2: assessments ── */}
          <section className="aq-main" aria-label="Assessments">
            <div className="rc-panel">
              <div className="rc-bar">
                <div className="aq-step-head">
                  <span className="aq-step" aria-hidden>2</span>
                  <div className="rc-bar-text">
                    <h3>
                      Assessments{selectedCourse ? <> in <span className="aq-in-code">{selectedCourse.courseCode}</span></> : null}
                    </h3>
                    <span aria-live="polite">
                      {loadingQuizzes
                        ? 'Loading…'
                        : query
                          ? `${displayedQuizzes.length} of ${quizzes.length} match “${query}”`
                          : `${quizzes.length} ${quizzes.length === 1 ? 'assessment' : 'assessments'}${selectedCourse?.title ? ` · ${selectedCourse.title}` : ''}`}
                    </span>
                  </div>
                </div>
                <div className="rc-search">
                  <Search size={16} className="rc-search-ico" aria-hidden />
                  <input
                    type="search"
                    placeholder="Search by title or type"
                    aria-label="Search assessments"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    disabled={loadingQuizzes}
                  />
                  {searchQuery && (
                    <button type="button" className="rc-search-clear" onClick={() => setSearchQuery('')} aria-label="Clear search">
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {loadingQuizzes ? (
              skeleton
            ) : quizzesFailed ? (
              <div className="rc-empty">
                <div className="rc-empty-icon rc-empty-icon--warn"><AlertTriangle size={26} /></div>
                <h4>Couldn't load assessments</h4>
                <p>Check your connection and try again.</p>
                <div className="rc-empty-actions">
                  <button type="button" className="rc-btn" onClick={() => setQuizReload(k => k + 1)}><RotateCcw size={14} /> Try again</button>
                </div>
              </div>
            ) : quizzes.length === 0 ? (
              <div className="rc-empty">
                <div className="rc-empty-icon rc-empty-icon--muted"><ClipboardList size={26} /></div>
                <h4>No open assessments</h4>
                <p>
                  {tx('Nothing is open for')} <b>{selectedCourse?.courseCode ?? tx('this course')}</b> right now.
                  {' '}{tx('Your lecturer will publish quizzes and exams here; watch your announcements for dates.')}
                  {allCourses.length > 1 && <> {tx('You can choose another course.')}</>}
                </p>
              </div>
            ) : displayedQuizzes.length === 0 ? (
              <div className="rc-empty">
                <div className="rc-empty-icon rc-empty-icon--muted"><SearchX size={26} /></div>
                <h4>No assessments match your search</h4>
                <p>Nothing matches “{query}”. Try a different title or type.</p>
                <div className="rc-empty-actions">
                  <button type="button" className="rc-btn rc-btn--ghost" onClick={() => setSearchQuery('')}>Clear search</button>
                </div>
              </div>
            ) : (
              <ul className="rc-grid" role="list">
                {displayedQuizzes.map(q => {
                  const type = quizTypeInfo(q.quizType);
                  const duration = fmtDuration(q.quizTime);
                  const schedule = fmtSchedule(q);
                  const attempts = Number(q.maxAttempts) || 0;
                  return (
                    <li key={q.qId} className="rc-card">
                      <div className="rc-card-top">
                        <span className="rc-code">{q.category?.courseCode}</span>
                        {type && <span className="aq-type"><type.Icon size={12} /> {type.label}</span>}
                      </div>
                      <h4 className="rc-title" title={q.title}>{q.title}</h4>
                      <p className="aq-course-name" title={q.category?.title}>{q.category?.title}</p>

                      <ul className="aq-facts">
                        <li><FileText size={13} /><span><b>{q.numberOfQuestions ?? '—'}</b> questions</span></li>
                        <li><Award size={13} /><span><b>{q.maxMarks != null ? fmtNum(q.maxMarks) : '—'}</b> marks</span></li>
                        {duration && <li><Clock size={13} /><span><b>{duration}</b></span></li>}
                        {attempts > 0 && <li><Repeat size={13} /><span><b>{attempts}</b> {attempts === 1 ? 'attempt' : 'attempts'}</span></li>}
                      </ul>

                      {schedule && (
                        <div className="aq-when"><Calendar size={13} /> <span>{schedule}</span></div>
                      )}

                      {/* Set by the server when the student's index number is outside the quiz's allowed range */}
                      {q.accessNotice && (
                        <div role="note" className="aq-notice"><Ban size={14} /><span>{q.accessNotice}</span></div>
                      )}

                      <div className="rc-card-foot">
                        <div className="aq-actions">
                          <button type="button" className="rc-btn rc-btn--ghost" onClick={() => setHistoryQuiz(q)}>
                            History
                          </button>
                          {q.accessNotice ? (
                            <button type="button" disabled className="rc-btn rc-btn--start rc-btn--locked" title={q.accessNotice}>
                              <Ban size={15} /> {tx('Not assigned')}
                            </button>
                          ) : (
                            <Link
                              to={quizInstructionsPath(q.qId, { courseTitle: q.category?.title, title: q.title })}
                              className="rc-btn rc-btn--start"
                              aria-label={`Start ${q.title}`}
                            >
                              <PlayCircle size={15} /> Start
                            </Link>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}

      {/* ── Notice ── */}
      <div className="rc-notice">
        <div className="rc-notice-icon"><Info size={18} /></div>
        <div className="rc-notice-text">
          <strong>Before you start</strong>
          <span>Use a stable connection and stay on the quiz screen. Leaving it, switching tabs or exiting full screen may be recorded and can end your attempt.</span>
        </div>
        <button type="button" className="rc-btn rc-btn--ghost" onClick={() => navigate('/user-dashboard/courses')}>
          <BookOpen size={15} /> {tx('My registered courses')}
        </button>
      </div>

      {historyQuiz && user?.id && (
        <AttemptHistoryModal quiz={historyQuiz} userId={user.id} onClose={() => setHistoryQuiz(null)} />
      )}
    </div>
  );
}
