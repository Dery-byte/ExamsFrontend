import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getQuiz, getNumberOfTheoryToAnswer, loadReportSummary } from '../../api/endpoints';
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

export default function Instructions() {
  const { qid }    = useParams();
  const navigate   = useNavigate();
  const { user }   = useAuth();
  const [quiz, setQuiz]                           = useState<any>(null);
  const [isLoading, setIsLoading]                 = useState(true);
  const [isLegible, setIsLegible]                 = useState(false);
  const [timerAll, setTimerAll]                   = useState(0);
  const [numberOfQuestionsToAnswer, setNqta]      = useState(0);

  useEffect(() => {
    if (!qid) return;
    let isLoadingQuiz = true, isLoadingQ = true, isLoadingRep = true;
    const check = () => { if (!isLoadingQuiz && !isLoadingQ && !isLoadingRep) setIsLoading(false); };

    getQuiz(qid).then((data: any) => {
      setQuiz(data);
      const o = (data.quizTime ?? 0) * 1;
      setTimerAll(o * 60);
    }).catch(() => {}).finally(() => { isLoadingQuiz = false; check(); });

    getNumberOfTheoryToAnswer(qid).then((data: any) => {
      const arr = Array.isArray(data) ? data : [];
      const nqta = arr[0]?.totalQuestToAnswer ?? 0;
      const tt   = arr[0]?.timeAllowed ?? 0;
      setNqta(nqta);
      setTimerAll(prev => prev + (tt * 60));
    }).catch(() => {}).finally(() => { isLoadingQ = false; check(); });

    loadReportSummary().then((report: any) => {
      const arr = Array.isArray(report) ? report : [];
      const userId = user?.id;
      const qIdNum = parseInt(qid);
      const found = arr.some((e: any) => e.user?.id === userId && e.quiz?.qId === qIdNum);
      setIsLegible(found);
    }).catch(() => {}).finally(() => { isLoadingRep = false; check(); });
  }, [qid, user?.id]);

  const getFormattedTime = () => {
    if (!timerAll) return 'Calculating...';
    const hr = Math.floor(timerAll / 3600);
    const mm = Math.floor((timerAll % 3600) / 60);
    return hr > 0 ? `${hr} hr ${mm} min` : `${mm} minutes`;
  };

  const openQuizInNewWindow = () => {
    const fullUrl = `${window.location.origin}/start/${qid}`;
    const features = `width=${screen.width},height=${screen.height},top=0,left=0,fullscreen=yes,toolbar=no,location=no,menubar=no,scrollbars=yes,resizable=yes`;
    const quizWindow = window.open(fullUrl, 'QuizWindow', features);

    if (!quizWindow || quizWindow.closed) {
      Swal.fire({
        title: 'Access Restricted',
        text: 'The portal requires pop-ups to be enabled for the secure examination environment.',
        icon: 'warning',
        confirmButtonColor: 'var(--primary)',
        customClass: { popup: 'swal2-premium-popup' }
      });
      return;
    }
    quizWindow.focus();
  };

  const startQuiz = () => {
    if (!quiz) return;
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
      if (result.isConfirmed && result.value === quiz.quizpassword) {
        Swal.fire({
          title: 'Authorization Successful',
          text: 'The examination session is now being initialized.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
          customClass: { popup: 'swal2-premium-popup' }
        }).then(() => openQuizInNewWindow());
      } else if (result.isConfirmed) {
        Swal.fire({ 
          title: 'Authorization Failed', 
          text: 'The code provided does not match our records.',
          icon: 'error', 
          confirmButtonColor: 'var(--danger)',
          customClass: { popup: 'swal2-premium-popup' }
        });
      }
    });
  };

  if (isLoading) {
    return (
      <div style={{ padding: '100px 0', textAlign: 'center' }}>
        <Loader2 className="spin-ico" size={40} style={{ color: 'var(--primary)', marginBottom: 16 }} />
        <p style={{ color: '#adb5bd', fontSize: 14, fontWeight: 600 }}>Configuring examination parameters...</p>
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
                ].map((stat, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', background: '#f8f9fa', borderRadius: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#adb5bd', fontWeight: 600 }}>
                      <stat.icon size={14} /> {stat.label}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: stat.highlight ? 'var(--primary)' : '#495057' }}>{stat.value}</div>
                  </div>
                ))}
              </div>

              {quiz?.status === 'CLOSED' ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: '100%', padding: '14px', borderRadius: 4, background: '#f1f5f7', color: '#adb5bd', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <Lock size={18} /> ASSESSMENT CLOSED
                  </div>
                </div>
              ) : (quiz?.attempted || isLegible) ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: '100%', padding: '14px', borderRadius: 4, background: 'rgba(40, 187, 227, 0.1)', color: 'var(--success)', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <CheckCircle2 size={18} /> ATTEMPT COMPLETED
                  </div>
                  <button 
                    onClick={() => navigate('/user-dashboard/available-quizzes')}
                    style={{ marginTop: 15, background: 'none', border: 'none', color: 'var(--primary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, margin: '15px auto 0' }}
                  >
                    Browse Others <ChevronRight size={14} />
                  </button>
                </div>
              ) : (
                <button 
                  className="btn-lexa btn-lexa-primary" 
                  style={{ width: '100%', padding: '14px', fontSize: 14, fontWeight: 700, justifyContent: 'center' }} 
                  onClick={startQuiz}
                >
                  <Play size={16} /> INITIALIZE SESSION
                </button>
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
