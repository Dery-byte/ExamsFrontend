import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getQuiz, getNumberOfTheoryToAnswer, getMyAttemptStatus } from '../../api/endpoints';
import { decodeParam, startQuizPath } from '../../utils/quizLink';
import Swal from 'sweetalert2';
import PageHeader from '../../components/PageHeader';
import { 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  Lock, 
  MousePointer2, 
  AlertTriangle, 
  Play, 
  Info,
  Loader2,
  ChevronRight,
  BookOpen,
  HelpCircle,
  FileText,
  Award,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  PlayCircle
} from 'lucide-react';

// ─── Module-level quiz window store ──────────────────────────────────────────
// _activeQuizWindow  — survives SPA navigation (module scope).
// sessionStorage key — survives page refresh (cleared when exam ends/submits).
// BroadcastChannel   — quiz window signals EXAM_ENDED so the instructions page
//                      can clear the sessionStorage flag even after a refresh.
// ─────────────────────────────────────────────────────────────────────────────
const EXAM_SESSION_KEY = 'examInProgress';
const EXAM_CHANNEL     = 'exam-session';
let _activeQuizWindow: Window | null = null;

export default function Instructions() {
  const { qid }    = useParams();
  const navigate   = useNavigate();
  const { user }   = useAuth();

  // Decode the obfuscated URL token → real numeric quiz ID
  const realId = qid ? decodeParam(qid) : null;

  const [quiz, setQuiz]                           = useState<any>(null);
  const [isLoading, setIsLoading]                 = useState(true);
  // The caller's own attempt position (limit / used / remaining) — replaces downloading every report.
  const [attempts, setAttempts]                 = useState<any>(null);
  const [loadError, setLoadError]                 = useState<string | null>(null);
  const [timerAll, setTimerAll]                   = useState(0);
  const [numberOfQuestionsToAnswer, setNqta]      = useState(0);

  // quizOpen drives the button ↔ in-progress banner swap.
  // Two persistence layers:
  //  • Module variable  — survives SPA navigation (cleared on module reload)
  //  • sessionStorage   — survives page refresh (cleared when exam ends)
  const [quizOpen, setQuizOpen] = useState(
    () =>
      (!!_activeQuizWindow && !_activeQuizWindow.closed) ||
      sessionStorage.getItem(EXAM_SESSION_KEY) === '1'
  );

  // On every mount:
  //  1. Wipe module var if the window closed while navigating.
  //  2. Re-sync quizOpen from both the module var and sessionStorage.
  //  3. Open a BroadcastChannel: when the quiz window broadcasts EXAM_ENDED
  //     (on submit or close), clear the sessionStorage flag and hide the banner
  //     — this works even if this page was refreshed and lost the Window ref.
  useEffect(() => {
    if (_activeQuizWindow?.closed) {
      _activeQuizWindow = null;
    }
    const live   = !!_activeQuizWindow && !_activeQuizWindow.closed;
    const stored = sessionStorage.getItem(EXAM_SESSION_KEY) === '1';
    setQuizOpen(live || stored);

    const ch = new BroadcastChannel(EXAM_CHANNEL);
    ch.onmessage = (e) => {
      if (e.data?.type === 'EXAM_ENDED') {
        sessionStorage.removeItem(EXAM_SESSION_KEY);
        _activeQuizWindow = null;
        setQuizOpen(false);
      }
    };
    return () => ch.close();
  }, []);   // once per mount

  // Poll every second while the exam window is open.
  // Detects when the student manually closes the window.
  useEffect(() => {
    if (!quizOpen) return;
    const id = setInterval(() => {
      if (_activeQuizWindow?.closed) {
        _activeQuizWindow = null;
        sessionStorage.removeItem(EXAM_SESSION_KEY);
        setQuizOpen(false);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [quizOpen]);

  useEffect(() => {
    if (!realId) return;
    let isLoadingQuiz = true, isLoadingQ = true, isLoadingRep = true;
    const check = () => { if (!isLoadingQuiz && !isLoadingQ && !isLoadingRep) setIsLoading(false); };

    getQuiz(realId).then((data: any) => {
      setQuiz(data);
      const o = (data.quizTime ?? 0) * 1;
      setTimerAll(o * 60);
    }).catch((err: any) => {
      // The server now says exactly why (wrong program vs. not enrolled in the course); fall back
      // to a generic message only if that reason is missing.
      setLoadError(err?.response?.data?.message
        || (err?.response?.status === 403
          ? 'This quiz is not available to you.'
          : 'This quiz could not be found. The link may be wrong or the quiz may have been removed.'));
    }).finally(() => { isLoadingQuiz = false; check(); });

    getNumberOfTheoryToAnswer(realId).then((data: any) => {
      const arr = Array.isArray(data) ? data : [];
      const nqta = arr[0]?.totalQuestToAnswer ?? 0;
      const tt   = arr[0]?.timeAllowed ?? 0;
      setNqta(nqta);
      setTimerAll(prev => prev + (tt * 60));
    }).catch(() => {}).finally(() => { isLoadingQ = false; check(); });

    getMyAttemptStatus(realId).then((s: any) => setAttempts(s))
      .catch(() => {}).finally(() => { isLoadingRep = false; check(); });
  }, [realId, user?.id]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate origin to ensure security (assuming both are on same origin)
      if (event.origin !== window.location.origin) return;
      
      if (event.data === 'QUIZ_SUBMITTED') {
        // Clear the persistent exam flag so the banner doesn't reappear after reload.
        sessionStorage.removeItem(EXAM_SESSION_KEY);
        _activeQuizWindow = null;
        Swal.fire({
          title: 'Submitted!',
          text: 'Your assessment has been successfully submitted for grading.',
          icon: 'success',
          confirmButtonColor: '#7a6fbe',
          customClass: { popup: 'swal2-premium-popup' }
        }).then(() => {
          window.location.reload();
        });
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const getFormattedTime = () => {
    if (!timerAll) return 'Calculating...';
    const hr = Math.floor(timerAll / 3600);
    const mm = Math.floor((timerAll % 3600) / 60);
    return hr > 0 ? `${hr} hr ${mm} min` : `${mm} minutes`;
  };

  const startQuiz = () => {
    if (!quiz) return;

    // If THIS quiz's window is already open, just bring it to the front.
    // If any exam window is already open, just bring it to the front.
    // This enforces single-quiz-at-a-time across ALL quiz pages.
    if (_activeQuizWindow && !_activeQuizWindow.closed) {
      _activeQuizWindow.focus();
      return;
    }

    const fullUrl  = `${window.location.origin}${startQuizPath(realId!)}`;
    const features = `width=${screen.width},height=${screen.height},top=0,left=0,fullscreen=yes,toolbar=no,location=no,menubar=no,scrollbars=yes,resizable=yes`;

    // Helper — called as soon as we have a confirmed open window handle.
    const registerWindow = (w: Window) => {
      _activeQuizWindow = w;                          // survives SPA navigation
      sessionStorage.setItem(EXAM_SESSION_KEY, '1'); // survives page refresh
      setQuizOpen(true);
      w.focus();
    };

    // Step 1 — password prompt. No window opened yet.
    Swal.fire({
      title: 'Security Verification',
      text: 'Please enter the access code provided by your instructor.',
      input: 'password',
      inputPlaceholder: 'Enter access code...',
      showCancelButton: true,
      confirmButtonText: 'Unlock & Begin',
      cancelButtonText: 'Cancel',
      confirmButtonColor: 'var(--primary)',
      cancelButtonColor: 'var(--gray-400)',
      reverseButtons: true,
      background: '#fff',
      customClass: { popup: 'swal2-premium-popup' },
      preConfirm: (value) => {
        if (!value) { Swal.showValidationMessage('Access code is required'); return false; }
        return value;
      }
    }).then(result => {
      if (!result.isConfirmed) return;

      if (result.value !== quiz.quizpassword) {
        Swal.fire({
          title: 'Authorization Failed',
          text: 'The code provided does not match our records.',
          icon: 'error',
          confirmButtonColor: 'var(--danger)',
          customClass: { popup: 'swal2-premium-popup' }
        });
        return;
      }

      // Step 2 — correct password.
      //
      // Chrome / Firefox / Edge carry the user-activation token through async
      // .then() chains, so window.open() works here directly — no extra click.
      //
      // Safari (WebKit) does NOT carry activation across async boundaries and
      // returns null. We detect that and show a minimal one-tap fallback whose
      // preConfirm calls window.open() synchronously inside the button-click
      // event, which Safari permits. ✅
      const quizWindow = window.open(fullUrl, 'QuizWindow', features);

      if (quizWindow && !quizWindow.closed) {
        // ── Opened immediately (Chrome, Firefox, Edge, etc.) ──────────────────
        registerWindow(quizWindow);
        Swal.fire({
          title: 'Authorization Successful',
          text: 'The examination session is now being initialized.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
          customClass: { popup: 'swal2-premium-popup' }
        });
      } else {
        // ── Blocked (Safari / WebKit) — need one explicit user tap ────────────
        Swal.fire({
          title: 'One more step',
          html: `
            <p style="color:#6c757d;font-size:14px;margin:0 0 8px">
              Your browser requires explicit permission to open the exam window.
            </p>
            <p style="color:#adb5bd;font-size:12px;margin:0">
              Tap <strong>Continue to Exam</strong> and then tap
              <em>Allow</em> if Safari asks for confirmation.
            </p>`,
          icon: 'info',
          confirmButtonText: 'Continue to Exam',
          confirmButtonColor: 'var(--primary)',
          showCancelButton: false,
          allowOutsideClick: false,
          customClass: { popup: 'swal2-premium-popup' },
          // preConfirm fires synchronously on the button-click DOM event —
          // Safari sees this as a fresh user gesture and allows window.open().
          preConfirm: () => {
            const w = window.open(fullUrl, 'QuizWindow', features);
            if (!w || w.closed) {
              Swal.showValidationMessage(
                'Pop-ups are still blocked. In Safari go to Settings → Safari → Block Pop-ups and turn it off, then try again.'
              );
              return false;
            }
            registerWindow(w);
            return true;
          }
        });
      }
    });
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 className="spin-ico" size={40} style={{ color: 'var(--primary)', marginBottom: 16 }} />
        <p style={{ color: '#adb5bd', fontSize: 14, fontWeight: 600 }}>Configuring examination parameters...</p>
      </div>
    );
  }

  if (loadError || !quiz) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Examination Brief" breadcrumbs={['Lexa', 'User', 'Instructions']} />
        <div className="lexa-card">
          <div className="lexa-card-body" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <AlertCircle size={40} style={{ color: 'var(--danger)', marginBottom: 12 }} />
            <h5 style={{ margin: '0 0 8px', color: '#495057' }}>Quiz unavailable</h5>
            <p style={{ margin: '0 0 20px', color: '#6c757d', fontSize: 14 }}>{loadError ?? 'This quiz could not be loaded.'}</p>
            <button className="btn-lexa btn-lexa-primary" onClick={() => navigate('/user-dashboard/quizzes')}>
              Browse available quizzes
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Examination Brief" breadcrumbs={['Lexa', 'User', 'Instructions']} />

      <div className="instructions-grid">
        {/* Left Column: Details & Rules */}
        <div>
          <div className="lexa-card">
            <div className="lexa-card-header">
              <h5 className="lexa-card-title">General Instructions</h5>
            </div>
            <div className="lexa-card-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 25 }}>
                <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'rgba(122, 111, 190, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={24} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#495057' }}>{quiz?.title}</h4>
                  <p style={{ margin: 0, fontSize: 13, color: '#adb5bd' }}>{quiz?.category?.courseCode} • {quiz?.category?.title}</p>
                </div>
              </div>

              <div style={{ 
                padding: '12px 15px', background: 'rgba(40, 187, 227, 0.1)', color: 'var(--success)', 
                fontSize: 12, fontWeight: 700, borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20 
              }}>
                <ShieldCheck size={14} /> SECURE ASSESSMENT ENVIRONMENT
              </div>

              <div style={{ color: '#6c757d', fontSize: 14, lineHeight: 1.8, marginBottom: 30 }}>
                {quiz?.description || 'This examination module is designed to assess your proficiency and understanding of the course curriculum. Please ensure you have read all instructions carefully before initializing the session.'}
              </div>

              <h6 style={{ fontSize: 13, fontWeight: 700, color: '#495057', marginBottom: 20, textTransform: 'uppercase' }}>Protocol & Regulations</h6>
              <div className="protocol-grid">
                {[
                  { title: 'Temporal Policy', desc: 'Clock synchronizes on start and persists through reload.', icon: Clock, color: 'var(--warning)' },
                  { title: 'State Persistence', desc: 'Auto-save active. Session results finalize on timeout.', icon: CheckCircle2, color: 'var(--success)' },
                  { title: 'Isolation Mode', desc: 'Switching tabs or windows triggers an integrity alert.', icon: Lock, color: 'var(--danger)' },
                  { title: 'Full Access', desc: 'Bidirectional navigation enabled for all questions.', icon: MousePointer2, color: 'var(--info)' },
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 15 }}>
                    <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 8, background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <item.icon size={18} style={{ color: item.color }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#495057', marginBottom: 2 }}>{item.title}</div>
                      <div style={{ fontSize: 12, color: '#adb5bd', lineHeight: 1.5 }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lexa-alert alert-info animate-fade-in-down" style={{ borderLeft: '4px solid var(--info)' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <AlertTriangle size={18} />
              <span>Integrated Proctoring active. Candidate behavior and browser interactions are monitored for academic integrity verification.</span>
            </div>
          </div>
        </div>

        {/* Right Column: Summary & Actions */}
        <div className="instructions-sidebar">
          <div className="lexa-card">
            <div className="lexa-card-header">
              <h5 className="lexa-card-title">Session Summary</h5>
            </div>
            <div className="lexa-card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 25 }}>
                {[
                  { label: 'Time Allowed', value: getFormattedTime(), icon: Clock },
                  { label: 'Total Questions', value: `${quiz?.numberOfQuestions || 0} Items`, icon: HelpCircle },
                  { label: 'Maximum Marks', value: `${quiz?.maxMarks || 0} Points`, icon: Award, highlight: true },
                  ...(attempts ? [{ label: 'Attempts', value: `${attempts.attemptsUsed} of ${attempts.maxAttempts} used`, icon: Play }] : []),
                ].map((stat, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', background: '#f8f9fa', borderRadius: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#adb5bd', fontWeight: 600 }}>
                      <stat.icon size={14} /> {stat.label}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: stat.highlight ? 'var(--primary)' : '#495057' }}>{stat.value}</div>
                  </div>
                ))}
              </div>

              {!quiz?.active ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: '100%', padding: '14px', borderRadius: 4, background: '#f1f5f7', color: '#adb5bd', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <Lock size={18} /> NOT YET PUBLISHED
                  </div>
                  {quiz?.autoOpen && quiz?.quizDate && (
                    <p style={{ marginTop: 10, fontSize: 12, color: '#adb5bd' }}>
                      Opens automatically on {quiz.quizDate}{quiz.startTimeAMPM ? ` at ${quiz.startTimeAMPM}` : ''} — just come back then.
                    </p>
                  )}
                </div>
              ) : quiz?.status === 'CLOSED' ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: '100%', padding: '14px', borderRadius: 4, background: '#f1f5f7', color: '#adb5bd', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <Lock size={18} /> ASSESSMENT CLOSED
                  </div>
                </div>
              ) : (attempts && !attempts.canStart) ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: '100%', padding: '14px', borderRadius: 4, background: 'rgba(40, 187, 227, 0.1)', color: 'var(--success)', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <CheckCircle2 size={18} /> {
                      attempts?.resultReviewed && attempts.attemptsRemaining > 0 ? 'RESULT REVIEWED'
                      : attempts?.maxAttempts > 1 ? `ALL ${attempts.maxAttempts} ATTEMPTS USED`
                      : 'ATTEMPT COMPLETED'
                    }
                  </div>
                  <button 
                    onClick={() => navigate('/user-dashboard/quizzes')}
                    style={{ marginTop: 15, background: 'none', border: 'none', color: 'var(--primary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, margin: '15px auto 0' }}
                  >
                    Browse Others <ChevronRight size={14} />
                  </button>
                </div>
              ) : (
                <>
                  {attempts?.retakeGranted && (
                    <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 4, background: 'rgba(122, 111, 190, 0.1)', color: 'var(--primary)', fontSize: 12, fontWeight: 600, lineHeight: 1.5 }}>
                      Your lecturer has allowed you to retake this quiz. Your new marks will replace your previous result.
                    </div>
                  )}

                  {quizOpen ? (
                    /* ── Any exam window is open — focus it; no second window allowed ── */
                    <div
                      onClick={() => {
                        if (_activeQuizWindow && !_activeQuizWindow.closed) {
                          // Window ref is alive (same session, no refresh) — focus directly.
                          _activeQuizWindow.focus();
                        } else {
                          // After a page refresh the Window ref is gone. Use the
                          // BroadcastChannel to ask the quiz window to focus itself.
                          try {
                            const ch = new BroadcastChannel(EXAM_CHANNEL);
                            ch.postMessage({ type: 'FOCUS_EXAM' });
                            ch.close();
                          } catch (_) {}
                        }
                      }}
                      style={{
                        width: '100%', padding: '14px', borderRadius: 4, cursor: 'pointer',
                        background: 'rgba(40, 187, 100, 0.12)', border: '1.5px solid rgba(40, 187, 100, 0.35)',
                        color: '#1a9e50', fontSize: 14, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                        userSelect: 'none',
                      }}
                      title="Click to switch to the exam window"
                    >
                      <span style={{
                        width: 10, height: 10, borderRadius: '50%',
                        background: '#28bb64', display: 'inline-block', flexShrink: 0,
                        boxShadow: '0 0 0 0 rgba(40,187,100,0.5)',
                        animation: 'examPulse 1.4s ease-in-out infinite',
                      }} />
                      EXAM IN PROGRESS — TAP TO SWITCH
                    </div>
                  ) : (
                    /* ── No exam window open — show the start button ── */
                    <button
                      className="btn-lexa btn-lexa-primary"
                      style={{ width: '100%', padding: '14px', fontSize: 14, fontWeight: 700, justifyContent: 'center' }}
                      onClick={startQuiz}
                    >
                      <Play size={16} /> {
                        attempts?.activeAttemptNumber ? `RESUME ATTEMPT ${attempts.activeAttemptNumber}`
                        : attempts?.retakeGranted ? 'RETAKE QUIZ'
                        : attempts?.attemptsUsed > 0 ? `START ATTEMPT ${attempts.attemptsUsed + 1} OF ${attempts.maxAttempts}`
                        : 'INITIALIZE SESSION'
                      }
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="lexa-card" style={{ background: 'var(--primary)', color: '#fff' }}>
            <div className="lexa-card-body">
              <div style={{ display: 'flex', gap: 15 }}>
                <div style={{ width: 35, height: 35, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Info size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>System Check</div>
                  <div style={{ fontSize: 12, opacity: 0.8, lineHeight: 1.5 }}>Ensure your internet connection is stable and pop-up blockers are disabled before proceeding.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .spin-ico { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        @keyframes examPulse {
          0%   { box-shadow: 0 0 0 0   rgba(40,187,100,0.55); }
          70%  { box-shadow: 0 0 0 8px rgba(40,187,100,0);    }
          100% { box-shadow: 0 0 0 0   rgba(40,187,100,0);    }
        }

        .instructions-grid {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 24px;
          align-items: start;
        }
        .protocol-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 25px;
        }
        .instructions-sidebar {
          position: sticky;
          top: 90px;
        }

        /* Tablet — sidebar collapses at 992px in UserLayout */
        @media (max-width: 992px) {
          .instructions-grid {
            grid-template-columns: 1fr !important;
          }
          .instructions-sidebar {
            position: relative !important;
            top: 0 !important;
          }
        }

        /* Mobile */
        @media (max-width: 576px) {
          .protocol-grid {
            grid-template-columns: 1fr !important;
            gap: 18px !important;
          }
        }
      `}</style>
    </div>
  );
}
