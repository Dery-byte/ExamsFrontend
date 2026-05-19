import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getQuiz, getQuestionsForStudent, getTheoryQuestions, getNumberOfTheoryToAnswer,
  getQuizTimer, saveQuizTimer, updateQuizAnswer, getQuizAnswersByQuiz,
  saveTheoryAnswers, loadTheoryAnswers, clearTheoryAnswers,
  evalQuiz, evalTheory, addSectionBMarks,
  deleteQuizTimer, clearQuizAnswers,
} from '../../api/endpoints';
import { useAuth } from '../../contexts/AuthContext';
import { useQuizProtection } from '../../hooks/useQuizProtection';
import Swal from 'sweetalert2';
import {
  Clock,
  Shield,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Monitor,
  Moon,
  Sun,
  Eye,
  AlertCircle,
  Send,
  Info,
  CheckCircle,
  Menu,
  X,
  Award,
  BarChart2
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type Section = 'A' | 'B';
type QuizType = 'OBJ' | 'THEORY' | 'BOTH';

// ─── Pure helpers ─────────────────────────────────────────────────────────────
const fmtTimer = (s: number) => {
  const t = Math.max(0, s);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = t % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

function groupByPrefix(questions: any[]): Record<string, any[]> {
  return questions.reduce((acc, q) => {
    const prefix = q.quesNo?.match(/^[A-Za-z]+[0-9]+/)?.[0] ?? 'Q1';
    (acc[prefix] ??= []).push(q);
    return acc;
  }, {} as Record<string, any[]>);
}

function isGroupCompulsory(questions: any[]): boolean {
  return questions.some((q: any) => q.compulsory === true || q.isCompulsory === true);
}

function sortPrefixesByCompulsory(grouped: Record<string, any[]>): string[] {
  return Object.keys(grouped).sort((a, b) => {
    const aC = isGroupCompulsory(grouped[a]);
    const bC = isGroupCompulsory(grouped[b]);
    if (aC && !bC) return -1;
    if (!aC && bC) return 1;
    return a.localeCompare(b, undefined, { numeric: true });
  });
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ProgressRing = ({ pct, size, color }: { pct: number; size: number; color: string }) => {
  const r = size * 0.45;
  const c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={size * 0.06} opacity={0.05} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={size * 0.06} strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" style={{ transition: 'stroke-dashoffset .5s ease' }} />
    </svg>
  );
};

/* ─── main component ────────────────────────────────────────────────────────── */
export default function StartQuiz() {
  const { qid } = useParams<{ qid: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitLogs, setSubmitLogs] = useState<Array<{ msg: string; type: 'info'|'ok'|'warn'|'err' }>>([]);
  const [quiz, setQuiz] = useState<any>(null);
  const [quizType, setQuizType] = useState<QuizType>('OBJ');
  const [section, setSection] = useState<Section>('A');
  const [isLight, setIsLight] = useState(true);
  const [quizConfig, setQuizConfig] = useState<any>(null);

  const [questions, setQuestions] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;

  const shuffleCache = useRef(new Map<number, string[]>());

  const [sectionBAll, setSectionBAll] = useState<any[]>([]);
  const [prefixes, setPrefixes] = useState<string[]>([]);
  const [compulsoryPfx, setCompulsoryPfx] = useState<string[]>([]);
  const [selectedPfx, setSelectedPfx] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [nqta, setNqta] = useState(0);
  const [timeO, setTimeO] = useState(0);
  const [timeT, setTimeT] = useState(0);

  const [timer, setTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isTimerLoaded = useRef(false);
  const isExpiredHandled = useRef(false);
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const submitAllRef = useRef<(auto?: boolean) => void>(() => { });

  const timerVal = useRef(0);
  const totalSecRef = useRef(1);
  const mainRef = useRef<HTMLElement>(null);

  useQuizProtection(quizConfig ? {
    quizId: qid!,
    violationAction: quizConfig.violationAction ?? 'NONE',
    maxViolations: quizConfig.maxViolations ?? 3,
    delaySeconds: quizConfig.delaySeconds ?? 30,
    delayMultiplier: quizConfig.delayMultiplier ?? 1.5,
    autoSubmitCountdownSeconds: quizConfig.autoSubmitCountdownSeconds ?? 5,
    enableFullscreenLock: quizConfig.enableFullscreenLock ?? false,
    enableWatermark: quizConfig.enableWatermark ?? false,
    enableScreenshotBlocking: quizConfig.enableScreenshotBlocking ?? false,
    enableDevToolsBlocking: quizConfig.enableDevToolsBlocking ?? false,
    username: user?.username ?? '',
    onAutoSubmit: () => submitAllRef.current(true),
    _pendingViolationDelay: quizConfig._pendingViolationDelay ?? 0,
    _savedViolationCount: quizConfig._savedViolationCount ?? 0,
  } : {
    quizId: qid ?? '', violationAction: 'NONE' as const,
    maxViolations: 0, delaySeconds: 0, delayMultiplier: 3,
    autoSubmitCountdownSeconds: 5,
    enableFullscreenLock: false, enableWatermark: false,
    enableScreenshotBlocking: false, enableDevToolsBlocking: false,
    username: '', onAutoSubmit: () => { },
    _pendingViolationDelay: 0,
    _savedViolationCount: 0,
  });

  useEffect(() => {
    history.pushState(null, '', location.href);
    const onPop = () => history.pushState(null, '', location.href);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (!qid) return;
    loadAll();
    const onBlur = () => {
      if (isTimerLoaded.current && timerVal.current > 0) {
        saveQuizTimer(qid!, timerVal.current).catch(() => { });
        saveTheory().catch(() => { });
      }
    };
    window.addEventListener('blur', onBlur);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
      window.removeEventListener('blur', onBlur);
    };
  }, [qid]);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page, section]);

  const loadAll = async () => {
    try {
      const [quizData, rawQs, theoryRaw, nqArr, savedTime, savedAns, savedTh] = await Promise.all([
        getQuiz(qid!),
        getQuestionsForStudent(qid!).catch(() => []),
        getTheoryQuestions(qid!).catch(() => []),
        getNumberOfTheoryToAnswer(qid!).catch(() => []),
        getQuizTimer(qid!).catch(() => null),
        getQuizAnswersByQuiz(qid!).catch(() => ({})),
        loadTheoryAnswers(qid!).catch(() => []),
      ]);
      setQuiz(quizData);
      setQuizConfig({
        ...quizData,
        _pendingViolationDelay: 0,
        _savedViolationCount: (savedTime as any)?.totalViolationCount ?? 0,
      });
      const qt: QuizType = ((quizData.quizType as string)?.toUpperCase().trim() as QuizType) || 'OBJ';
      setQuizType(qt);
      const oMins = Number(quizData.quizTime) || 0;
      const tMins = Number((nqArr as any[])[0]?.timeAllowed) || 0;
      setTimeO(oMins);
      setTimeT(tMins);
      setNqta((nqArr as any[])[0]?.totalQuestToAnswer ?? 0);
      if (qt === 'THEORY') setSection('B');

      const rawQsArray: any[] = Array.isArray(rawQs) ? rawQs : (Array.isArray((rawQs as any)?.content) ? (rawQs as any).content : []);
      const savedAnswersMap: Record<string, string[]> = (savedAns as any)?.answers ?? {};
      const dbMatchingMap: Record<string, string> = (savedAns as any)?.matchingAnswers ?? {};

      const qs = rawQsArray.map((q: any, i: number) => {
        q.count = i + 1;
        const dbAnswers = savedAnswersMap[String(q.quesId)];
        q.givenAnswer = Array.isArray(dbAnswers) ? [...dbAnswers] : [];
        if (q.questionType === 'MATCHING') {
          if (!shuffleCache.current.has(q.quesId)) {
            const pool = (q.matchingPairs ?? []).map((p: any) => p.answer);
            shuffleCache.current.set(q.quesId, seededShuffle(pool, q.quesId));
          }
          const dbMatching = dbMatchingMap[String(q.quesId)];
          q.matchingAnswers = dbMatching ? dbMatching.split('|') : (q.matchingPairs ?? []).map(() => '');
        }
        return q;
      });
      setQuestions(qs);

      const theoryRawArray: any[] = Array.isArray(theoryRaw) ? theoryRaw : (Array.isArray((theoryRaw as any)?.content) ? (theoryRaw as any).content : []);
      const savedThArray: any[] = Array.isArray(savedTh) ? savedTh : [];
      const theoryQs = theoryRawArray.map((q: any) => {
        const saved = savedThArray.find((a: any) => a.quesNo === q.quesNo);
        return { ...q, givenAnswer: saved?.givenAnswer ?? '' };
      });
      setSectionBAll(theoryQs);
      if (theoryQs.length > 0) {
        const grp = groupByPrefix(theoryQs);
        const pfxs = sortPrefixesByCompulsory(grp);
        const comp = pfxs.filter(p => isGroupCompulsory(grp[p]));
        const initSel: Record<string, boolean> = {};
        comp.forEach(p => { initSel[p] = true; });
        
        if (qt === 'THEORY' && Object.keys(initSel).length === 0 && pfxs.length > 0) {
          initSel[pfxs[0]] = true;
        }

        setPrefixes(pfxs);
        setCompulsoryPfx(comp);
        setSelectedPfx(initSel);
      }
      const totalSec = (oMins + tMins) * 60 || oMins * 60 || 3600;
      let t0 = totalSec;
      
      if (savedTime && typeof savedTime === 'object') {
        const rTime = (savedTime as any).remainingTime ?? (savedTime as any).timeRemaining;
        const parsedTime = Number(rTime);
        if (!isNaN(parsedTime) && parsedTime > 0) {
          t0 = parsedTime;
        }
      }
      
      // Safety fallback to prevent 0:0 immediate submission
      if (!t0 || t0 <= 0) {
        t0 = totalSec;
      }

      setTimer(t0);
      startTimer(t0, totalSec);

      autoSaveRef.current = setInterval(() => {
        if (isTimerLoaded.current) {
          saveTheory().catch(() => { });
          saveQuizTimer(qid!, timerVal.current).catch(() => { });
        }
      }, 60_000);
      isTimerLoaded.current = true;
    } catch (e) { console.error('loadAll error', e); } finally { setLoading(false); }
  };

  const startTimer = (initial: number, total: number) => {
    timerVal.current = initial;
    totalSecRef.current = total || initial || 1;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      timerVal.current--;
      setTimer(timerVal.current);
      if (timerVal.current <= 0) {
        clearInterval(timerRef.current!);
        timerRef.current = null;
        onTimerExpired();
      }
    }, 1000);
  };

  const onTimerExpired = () => {
    if (isExpiredHandled.current) return;
    isExpiredHandled.current = true;
    submitAllRef.current(true);
  };

  const saveTheory = useCallback(async () => {
    if (sectionBAll.length === 0) return;
    const answers = sectionBAll.map(q => ({ quesNo: q.quesNo, givenAnswer: q.givenAnswer || '' }));
    await saveTheoryAnswers(qid!, answers).catch(() => { });
  }, [sectionBAll, qid]);

  const updateTheoryAnswer = (quesNo: string, val: string) => {
    setSectionBAll(prev => prev.map(q => q.quesNo === quesNo ? { ...q, givenAnswer: val } : q));
  };

  const togglePrefix = (p: string) => {
    if (compulsoryPfx.includes(p)) return;
    const sel = !!selectedPfx[p];
    if (!sel && Object.values(selectedPfx).filter(Boolean).length >= nqta) return;
    setSelectedPfx(prev => ({ ...prev, [p]: !sel }));
  };

  const setMCQAnswer = (q: any, option: string, checked: boolean) => {
    const ans = [...(q.givenAnswer ?? [])];
    if (checked && !ans.includes(option)) ans.push(option);
    else if (!checked) { const i = ans.indexOf(option); if (i > -1) ans.splice(i, 1); }
    setQuestions(prev => prev.map(pq => pq.quesId === q.quesId ? { ...pq, givenAnswer: ans } : pq));
    updateQuizAnswer({ questionId: q.quesId, option, checked, quizId: parseInt(qid!) }).catch(() => { });
  };

  const setTFAnswer = (q: any, val: string) => {
    const desel = (q.givenAnswer ?? [])[0] === val;
    setQuestions(prev => prev.map(pq => pq.quesId === q.quesId ? { ...pq, givenAnswer: desel ? [] : [val] } : pq));
    updateQuizAnswer({ questionId: q.quesId, option: val, checked: !desel, quizId: parseInt(qid!) }).catch(() => { });
  };

  const setMatchAnswer = (q: any, pairIdx: number, answer: string | null) => {
    updateQuizAnswer({ questionId: q.quesId, option: answer ?? '', checked: !!answer, quizId: parseInt(qid!), pairIndex: pairIdx }).catch(() => { });
    setQuestions(prev => prev.map(pq => {
      if (pq.quesId !== q.quesId) return pq;
      const ma = [...(pq.matchingAnswers ?? new Array(pq.matchingPairs?.length ?? 0).fill(''))];
      ma[pairIdx] = answer ?? '';
      return { ...pq, matchingAnswers: ma };
    }));
  };

  const addLog = (msg: string, type: 'info'|'ok'|'warn'|'err' = 'info') =>
    setSubmitLogs(prev => [...prev, { msg, type }]);

  const submitAll = useCallback(async (auto = false) => {
    if (submitting) return;
    if (!auto) {
      const result = await Swal.fire({
        title: 'Submit Assessment?',
        text: 'Your current session will be finalized and submitted for grading.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, Submit Now',
        cancelButtonText: 'Review Answers',
        confirmButtonColor: '#7a6fbe',
        cancelButtonColor: '#adb5bd',
        reverseButtons: true,
      });
      if (!result.isConfirmed) return;
    }
    setSubmitting(true);
    setSubmitLogs([]);

    try {
      // ── Section A: Objective ──────────────────────────────────────────────
      if ((quizType === 'OBJ' || quizType === 'BOTH') && questions.length > 0) {
        addLog(`Submitting ${questions.length} objective question(s)…`, 'info');
        await evalQuiz(qid!, questions.map(q => ({
          ...q,
          givenAnswer: q.questionType === 'MATCHING' 
            ? (q.matchingAnswers ?? []) 
            : (Array.isArray(q.givenAnswer) ? q.givenAnswer : [q.givenAnswer ?? '']),
        }))).catch((e: any) => {
          const errMsg = e.response?.data?.error || e.response?.data?.message || e.message || 'Unknown error';
          addLog(`Objective evaluation error: ${errMsg}`, 'err');
          Swal.fire({ title: 'Objective Error', text: errMsg, icon: 'error' });
          throw new Error(errMsg);
        });
        addLog('Objective answers submitted ✓', 'ok');
      }

      // ── Section B: Theory ─────────────────────────────────────────────────
      if ((quizType === 'THEORY' || quizType === 'BOTH') && sectionBAll.length > 0) {
        addLog('Saving theory draft…', 'info');
        await saveTheory();
        addLog('Theory draft saved ✓', 'ok');

        const selQs: any[] = [];
        Object.entries(selectedPfx).forEach(([pfx, sel]) => {
          if (sel) selQs.push(...sectionBAll.filter(q => q.quesNo?.startsWith(pfx)));
        });

        if (selQs.length > 0) {
          addLog(`Sending ${selQs.length} theory question(s) to AI evaluation…`, 'info');
          selQs.forEach((q, i) =>
            addLog(`  [${i + 1}/${selQs.length}] Evaluating: ${q.quesNo} — "${(q.question ?? '').slice(0, 60)}…"`, 'info')
          );

          const theoryResult: any = await evalTheory({
            contents: [{
              parts: selQs.map(item => ({
                text: `quizId ${qid}: tqid ${item.tqId || item.tqid || item.quesId}: Question Number ${item.quesNo}: ${item.question} Answer: ${item.givenAnswer || 'No answer provided'} Marks: ${item.marks || 10} Criteria: ${item.evaluationCriteria || item.criteria || 'Standard evaluation'}`,
              })),
            }],
          }).catch((e: any) => {
            const errMsg = e.response?.data?.error || e.response?.data?.message || e.message || 'Unknown error';
            addLog(`AI evaluation failed: ${errMsg}`, 'err');
            Swal.fire({ title: 'AI Evaluation Error', text: errMsg, icon: 'error' });
            throw new Error(errMsg);
          });

          // Backend returns QuizEvaluationResponse (object), not an array
          if (theoryResult && typeof theoryResult === 'object' && theoryResult.summary) {
            const s = theoryResult.summary;
            addLog(`AI evaluation complete ✓  Score: ${s.totalScore}/${s.totalMaxMarks} (${s.percentage?.toFixed(1)}%)`, 'ok');
            if (theoryResult.results?.length) {
              theoryResult.results.forEach((r: any) => {
                const icon = r.score > 0 ? '✓' : '✗';
                addLog(`  ${icon} Q${r.questionNumber}: ${r.score}/${r.maxMarks} — ${(r.feedback ?? '').slice(0, 80)}`, r.score > 0 ? 'ok' : 'warn');
              });
            }
          } else if (theoryResult) {
            addLog('Theory evaluation received (no summary data)', 'warn');
          }
        } else {
          addLog('No theory question groups selected — skipped.', 'warn');
        }
      }

      // ── Cleanup ───────────────────────────────────────────────────────────
      addLog('Cleaning up session data…', 'info');
      await deleteQuizTimer(qid!).catch(() => { });
      clearQuizAnswers(qid!).catch(() => { });
      clearTheoryAnswers(qid!).catch(() => { });
      addLog('Session finalised ✓', 'ok');

      // Brief pause so student can see final log
      await new Promise(r => setTimeout(r, 1500));

      // If opened in a new window, notify the main window to show confirmation and close this popup
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage('QUIZ_SUBMITTED', window.location.origin);
        window.close();
      } else {
        await Swal.fire({
          title: 'Submitted!',
          text: 'Your assessment has been successfully submitted for grading.',
          icon: 'success',
          confirmButtonColor: '#7a6fbe',
          customClass: { popup: 'swal2-premium-popup' }
        });
        // Fallback for direct navigation
        window.location.reload();
      }
    } catch (e: any) {
      setSubmitting(false);
      // We don't clear logs here so the user can see what failed
    }
  }, [quizType, questions, sectionBAll, selectedPfx, qid, saveTheory, submitting]);
  submitAllRef.current = submitAll;

  const currentQs = useMemo(() => sectionBAll.filter(q => {
    const pfx = prefixes.find(p => q.quesNo?.startsWith(p));
    return pfx ? selectedPfx[pfx] : true;
  }), [sectionBAll, prefixes, selectedPfx]);
  const selCount = Object.values(selectedPfx).filter(Boolean).length;
  const isSubmitDisabled = useMemo(() => {
    if (quizType === 'OBJ') return false;
    return !compulsoryPfx.every(p => selectedPfx[p] === true) || selCount !== nqta;
  }, [quizType, compulsoryPfx, selectedPfx, selCount, nqta]);

  const answered = useMemo(() => questions.filter(q => (q.questionType === 'MATCHING' ? (q.matchingAnswers ?? []).some((a: string) => a) : (q.givenAnswer?.length ?? 0) > 0)).length, [questions]);
  const totalObjPgs = Math.ceil(questions.length / PAGE_SIZE);
  const pagedObjQs = questions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const timerPct = totalSecRef.current > 0 ? (timer / totalSecRef.current) * 100 : 0;
  const timerColor = timer < 120 ? '#ec4561' : timer < 300 ? '#f1b44c' : '#28bbe3';

  const theme = {
    bg: isLight ? '#f4f7fa' : '#1a1d21',
    card: isLight ? '#ffffff' : '#22262b',
    border: isLight ? '#e5e9f2' : '#31363e',
    text: isLight ? '#475569' : '#94a3b8',
    title: isLight ? '#1e293b' : '#f1f5f9',
    muted: isLight ? '#94a3b8' : '#64748b'
  };

  if (loading || submitting) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 20, background: theme.bg }}>
      <Loader2 className="spin-ico" size={48} style={{ color: '#7a6fbe' }} />
      <div style={{ textAlign: 'center' }}>
        <h5 style={{ fontWeight: 700, color: theme.title }}>{loading ? 'Initializing Assessment...' : 'Submitting Responses...'}</h5>
        <p style={{ fontSize: 13, color: theme.muted }}>Please do not close this window.</p>
      </div>
    </div>
  );

  return (
    <div className="quiz-shell" style={{ background: theme.bg, color: theme.text, transition: 'all 0.3s', fontFamily: "'Inter', sans-serif" }}>
      {/* ── HEADER ── */}
      <header style={{
        position: 'relative', zIndex: 100, background: theme.card, padding: '10px 30px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: `1px solid ${theme.border}`, boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 4, background: '#7a6fbe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <Monitor size={18} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#7a6fbe' }}>Assessment Portal</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: theme.title }}>{quiz?.title}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '5px 15px',
            background: isLight ? '#f8f9fa' : '#2d333b', borderRadius: 4, border: `1px solid ${theme.border}`
          }}>
            <Clock size={16} style={{ color: timerColor }} />
            <span style={{ fontSize: 16, fontWeight: 700, color: timerColor, fontFamily: 'monospace' }}>{fmtTimer(timer)}</span>
          </div>
          <button onClick={() => setIsLight(!isLight)} style={{ background: 'none', border: 'none', color: theme.muted, cursor: 'pointer', padding: 5 }}>
            {isLight ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </header>

      <div className="quiz-three-col">
        {/* ── LEFT: MONITORING ── */}
        <aside className="quiz-left-panel" style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%', overflowY: 'auto', paddingRight: 5 }}>
          {/* Left panel items */}

          <div className="lexa-card" style={{ background: theme.card }}>
            <div className="lexa-card-header" style={{ borderBottomColor: theme.border }}>
              <h6 className="lexa-card-title" style={{ margin: 0, color: theme.title }}>Portal Security</h6>
            </div>
            <div className="lexa-card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <Shield size={16} style={{ color: '#28bbe3', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: theme.title }}>Active Protection</div>
                    <p style={{ fontSize: 10, color: theme.muted, margin: '2px 0 0' }}>Data encryption enabled.</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <Eye size={16} style={{ color: '#38a4f8', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: theme.title }}>Proctoring Active</div>
                    <p style={{ fontSize: 10, color: theme.muted, margin: '2px 0 0' }}>Session is being recorded.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ padding: 15, background: 'rgba(236, 69, 97, 0.05)', borderRadius: 4, borderLeft: '3px solid #ec4561' }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <AlertTriangle size={18} style={{ color: '#ec4561', flexShrink: 0 }} />
              <p style={{ fontSize: 11, color: '#ec4561', fontWeight: 600, margin: 0 }}>
                Switching tabs or exiting full screen will result in an immediate violation report.
              </p>
            </div>
          </div>

          <div style={{ marginTop: 'auto', padding: 12, background: theme.card, borderRadius: 4, display: 'flex', gap: 10, alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: `1px solid ${theme.border}` }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: isLight ? '#f8f9fa' : '#2d333b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7a6fbe', fontWeight: 700, fontSize: 12 }}>
              {user?.firstname?.[0]}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: theme.title, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.firstname} {user?.lastname}</div>
              <div style={{ fontSize: 10, color: theme.muted }}>ID: {user?.username}</div>
            </div>
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main ref={mainRef} style={{ height: '100%', overflowY: 'auto', paddingRight: 15 }}>
          {quizType === 'BOTH' && (
            <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
              <button
                onClick={() => setSection('A')}
                className={`btn-lexa ${section === 'A' ? 'btn-lexa-primary' : 'btn-lexa-outline'}`}
                style={{ flex: 1 }}
              >
                Section A: Objective
              </button>
              <button
                onClick={() => setSection('B')}
                className={`btn-lexa ${section === 'B' ? 'btn-lexa-primary' : 'btn-lexa-outline'}`}
                style={{ flex: 1 }}
              >
                Section B: Theory
              </button>
            </div>
          )}

          {section === 'A' && (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h5 style={{ margin: 0, fontWeight: 700, color: theme.title }}>Objective Items</h5>
                <span className="lexa-badge badge-soft-primary">
                  {answered} / {questions.length} Answered
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {pagedObjQs.map(q => (
                  <div key={q.quesId} className="lexa-card" style={{ background: theme.card }}>
                    <div className="lexa-card-body">
                      <div style={{ display: 'flex', gap: 12, marginBottom: 15 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#7a6fbe', background: 'rgba(122, 111, 190, 0.1)', padding: '2px 8px', borderRadius: 4, height: 'fit-content' }}>Q{q.count}</span>
                        <div style={{ fontSize: 15, fontWeight: 600, color: theme.title, lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: q.content }} />
                      </div>

                      {q.questionType === 'TRUE_FALSE' ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          {['True', 'False'].map(opt => {
                            const sel = q.givenAnswer?.[0] === opt;
                            return (
                              <button key={opt} onClick={() => setTFAnswer(q, opt)} className={`btn-lexa ${sel ? 'btn-lexa-primary' : 'btn-lexa-outline'}`} style={{ padding: '12px' }}>
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      ) : q.questionType === 'MATCHING' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 30px 1fr', gap: 10 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {(q.matchingPairs ?? []).map((p: any, i: number) => (
                                <div key={i} style={{ padding: '8px 12px', background: isLight ? '#f8f9fa' : '#2d333b', borderRadius: 4, fontSize: 13, border: `1px solid ${theme.border}` }}>{p.prompt}</div>
                              ))}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'space-around' }}>
                              {(q.matchingPairs ?? []).map((_: any, i: number) => <ChevronRight key={i} size={14} style={{ color: theme.muted }} />)}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {(q.matchingPairs ?? []).map((_: any, i: number) => {
                                const val = (q.matchingAnswers ?? [])[i];
                                return (
                                  <div
                                    key={i}
                                    onClick={() => val && setMatchAnswer(q, i, null)}
                                    onDragOver={e => e.preventDefault()}
                                    onDrop={e => {
                                      e.preventDefault();
                                      const answer = e.dataTransfer.getData('text');
                                      if (answer) setMatchAnswer(q, i, answer);
                                    }}
                                    style={{ height: 38, border: `1px dashed ${theme.muted}`, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: val ? '#7a6fbe' : theme.muted, fontWeight: 600, background: val ? 'rgba(122, 111, 190, 0.05)' : 'transparent', cursor: val ? 'pointer' : 'default' }}
                                  >
                                    {val || 'Drop Here'}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 10, background: isLight ? '#f8f9fa' : '#2d333b', borderRadius: 4 }}>
                            {(shuffleCache.current.get(q.quesId) ?? []).filter(a => !(q.matchingAnswers ?? []).includes(a)).map((ans, i) => (
                              <div key={i} draggable onDragStart={e => e.dataTransfer.setData('text', ans)} style={{ padding: '5px 12px', background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 4, fontSize: 12, cursor: 'grab' }}>{ans}</div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          {['option1', 'option2', 'option3', 'option4'].filter(k => q[k]).map((k, i) => {
                            const val = q[k];
                            const sel = (q.givenAnswer ?? []).includes(val);
                            return (
                              <button key={k} onClick={() => setMCQAnswer(q, val, !sel)} className={`btn-lexa ${sel ? 'btn-lexa-primary' : 'btn-lexa-outline'}`} style={{ textAlign: 'left', padding: '10px 15px' }}>
                                <span style={{ width: 22, height: 22, borderRadius: 2, background: sel ? '#fff' : (isLight ? '#f8f9fa' : '#2d333b'), color: sel ? '#7a6fbe' : theme.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, marginRight: 10 }}>{String.fromCharCode(65 + i)}</span>
                                {val}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {totalObjPgs > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginTop: 30 }}>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} className="btn-lexa btn-lexa-outline" disabled={page === 1}><ChevronLeft size={16} /></button>
                  {Array.from({ length: totalObjPgs }).map((_, i) => (
                    <button key={i} onClick={() => setPage(i + 1)} className={`btn-lexa ${page === i + 1 ? 'btn-lexa-primary' : 'btn-lexa-outline'}`} style={{ width: 40, padding: 0 }}>{i + 1}</button>
                  ))}
                  <button onClick={() => setPage(p => Math.min(totalObjPgs, p + 1))} className="btn-lexa btn-lexa-outline" disabled={page === totalObjPgs}><ChevronRight size={16} /></button>
                </div>
              )}
            </div>
          )}

          {section === 'B' && (
            <div className="animate-fade-in">
              {/* Theory Header & Pagination Removed */}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {currentQs.map(q => (
                  <div key={q.quesNo} className="lexa-card" style={{ background: theme.card }}>
                    <div className="lexa-card-body">
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15 }}>
                        <span className="lexa-badge badge-soft-primary">{q.quesNo}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: theme.muted }}>{q.marks} Marks</span>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: theme.title, marginBottom: 15, lineHeight: 1.6 }}>{q.question}</div>
                      <textarea
                        rows={5}
                        value={q.givenAnswer || ''}
                        onChange={e => updateTheoryAnswer(q.quesNo, e.target.value)}
                        onBlur={() => saveTheory()}
                        placeholder="Type your response here..."
                        style={{ width: '100%', padding: '15px', borderRadius: 4, border: `1px solid ${theme.border}`, background: isLight ? '#fcfdfe' : '#22262b', color: theme.text, fontSize: 14, outline: 'none', transition: 'all 0.2s', resize: 'vertical', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: 40, textAlign: 'center' }}>
            <button onClick={() => submitAll()} disabled={isSubmitDisabled} className="btn-lexa btn-lexa-primary" style={{ padding: '12px 40px', fontSize: 15, opacity: isSubmitDisabled ? 0.6 : 1 }}>
              Submit Assessment
            </button>
            {isSubmitDisabled && section === 'B' && <p style={{ fontSize: 11, color: '#ec4561', marginTop: 10, fontWeight: 600 }}>Please select and answer exactly {nqta} groups.</p>}
          </div>
        </main>

        {/* ── RIGHT: STATUS ── */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%', overflowY: 'auto', overflowX: 'hidden', paddingRight: 5 }}>
          <div className="lexa-card" style={{ background: theme.card, textAlign: 'center' }}>
            <div className="lexa-card-header" style={{ borderBottomColor: theme.border }}>
              <h6 className="lexa-card-title" style={{ margin: 0, color: theme.title }}>Progress</h6>
            </div>
            <div className="lexa-card-body" style={{ overflowX: 'hidden' }}>
              <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                <ProgressRing pct={timerPct} size={110} color={timerColor} />
                <div style={{ position: 'absolute' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: timerColor }}>{fmtTimer(timer)}</div>
                  <div style={{ fontSize: 8, fontWeight: 700, color: theme.muted, textTransform: 'uppercase' }}>Remaining</div>
                </div>
              </div>
              <div style={{ height: 4, background: isLight ? '#f1f5f7' : '#2d333b', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${timerPct}%`, background: timerColor, transition: 'width 1s linear' }} />
              </div>

              <div style={{ marginTop: 24, textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
                  <span style={{ color: theme.title }}>Objective</span>
                  <span style={{ color: '#7a6fbe' }}>{Math.round((answered / (questions.length || 1)) * 100)}%</span>
                </div>
                <div style={{ height: 6, background: isLight ? '#f1f5f7' : '#2d333b', borderRadius: 100, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(answered / (questions.length || 1)) * 100}%`, background: '#7a6fbe' }} />
                </div>
              </div>

              {(quizType === 'THEORY' || quizType === 'BOTH') && (
                <div style={{ marginTop: 16, textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
                    <span style={{ color: theme.title }}>Theory</span>
                    <span style={{ color: '#28bbe3' }}>{selCount} / {nqta}</span>
                  </div>
                  <div style={{ height: 6, background: isLight ? '#f1f5f7' : '#2d333b', borderRadius: 100, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(selCount / (nqta || 1)) * 100}%`, background: '#28bbe3' }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {section === 'A' && (
            <div className="lexa-card" style={{ background: theme.card }}>
              <div className="lexa-card-header" style={{ borderBottomColor: theme.border }}>
                <h6 className="lexa-card-title" style={{ margin: 0, color: theme.title }}>Navigator</h6>
              </div>
              <div className="lexa-card-body" style={{ overflowX: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
                  {questions.map((q, i) => (
                    <button
                      key={q.quesId}
                      onClick={() => {
                        setPage(Math.ceil((i + 1) / PAGE_SIZE));
                        setSection('A');
                      }}
                      style={{
                        width: 26, height: 26, borderRadius: 4, border: 'none',
                        background: (q.givenAnswer?.length > 0) ? '#7a6fbe' : (isLight ? '#f1f5f7' : '#2d333b'),
                        color: (q.givenAnswer?.length > 0) ? '#fff' : theme.text,
                        fontSize: 10, fontWeight: 700, cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 'auto'
                      }}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {section === 'B' && prefixes.length > 0 && (
            <div className="lexa-card" style={{ background: theme.card }}>
              <div className="lexa-card-header" style={{ borderBottomColor: theme.border }}>
                <h6 className="lexa-card-title" style={{ margin: 0, color: theme.title }}>Theory Protocol Groups</h6>
              </div>
              <div className="lexa-card-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {prefixes.map(p => (
                    <button
                      key={p}
                      onClick={() => togglePrefix(p)}
                      className={`btn-lexa ${selectedPfx[p] ? 'btn-lexa-primary' : 'btn-lexa-outline'}`}
                      style={{ justifyContent: 'center', padding: '8px 4px', fontSize: 11 }}
                    >
                      {compulsoryPfx.includes(p) && <Shield size={12} style={{ marginRight: 4 }} />} {p}
                    </button>
                  ))}
                </div>
                <div style={{ marginTop: 5, fontSize: 11, color: theme.muted, fontWeight: 600, textAlign: 'center' }}>
                  Select {nqta} groups
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>

      <style>{`
        .spin-ico { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-fade-in { animation: fade-in .4s cubic-bezier(0.4, 0, 0.2, 1); }
        @keyframes fade-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

        .quiz-shell {
          height: 100vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .quiz-three-col {
          display: grid;
          grid-template-columns: 260px 1fr 280px;
          gap: 24px;
          padding: 24px;
          max-width: 1500px;
          margin: 0 auto;
          flex: 1;
          min-height: 0;
          width: 100%;
          box-sizing: border-box;
        }
        .quiz-left-panel { display: flex; flex-direction: column; }

        @media (max-width: 900px) {
          .quiz-shell {
            height: auto;
            min-height: 100vh;
            overflow: auto;
          }
          .quiz-three-col {
            grid-template-columns: 1fr !important;
            gap: 16px;
            padding: 16px;
          }
          .quiz-left-panel { display: none !important; }
          aside:last-of-type { order: -1; }
        }
        @media (max-width: 576px) {
          .quiz-three-col { padding: 10px; gap: 12px; }
        }
      `}</style>
    </div>
  );
}