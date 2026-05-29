import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getRegCourses, getActiveQuizzesOfCategory, getReport } from '../../api/endpoints';
import PageHeader from '../../components/PageHeader';
import { Search, Loader2, BookOpen, AlertCircle, HelpCircle, Award, X, Clock, PlayCircle, FileText, ChevronRight, Activity, Calendar, Filter, PieChart, BarChart2, CheckCircle, TrendingUp } from 'lucide-react';

export default function AvailableQuizzes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userRecords, setUserRecords]         = useState<any[]>([]);
  const [selectedCid, setSelectedCid]         = useState<string>('');
  const [availablequizzes, setQuizzes]        = useState<any[]>([]);
  const [displayedQuizzes, setDisplayed]      = useState<any[]>([]);
  const [searchQuery, setSearchQuery]         = useState('');
  const [isLoadingUserRecords, setLoadingRec] = useState(true);
  const [isLoadingQuizzes, setLoadingQ]       = useState(false);
  const [reportModal, setReportModal]         = useState(false);
  const [reportData, setReportData]           = useState<any[]>([]);
  const [isLoadingReportData, setLoadingRep]  = useState(false);

  useEffect(() => { loadRegisteredCourses(); }, []);

  const loadRegisteredCourses = async () => {
    setLoadingRec(true);
    try {
      const data: any[] = await getRegCourses();
      const userId = user?.id;
      const filtered = data.filter((r: any) => r.user?.id === userId);
      setUserRecords(filtered);
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

  const viewReport = async (qId: number) => {
    if (!user?.id) return;
    setReportModal(true);
    setLoadingRep(true);
    try { 
      const report = await getReport(user.id, qId); 
      setReportData(Array.isArray(report) ? report : []); 
    }
    catch { setReportData([]); }
    finally { setLoadingRep(false); }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: 40 }}>
      <PageHeader title="Examination Portal" breadcrumbs={['Lexa', 'Portal', 'Assessments']} />

      {/* Control Panel: Filter & Search */}
      <div className="lexa-card">
        <div className="lexa-card-body" style={{ background: 'linear-gradient(to right, #ffffff, #fcfdfe)' }}>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 300px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, marginBottom: 10, color: '#2a3142' }}>
                <BookOpen size={16} className="text-primary" /> Select Course Curriculum
              </label>
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
          <p style={{ color: '#74788d', fontSize: 15, maxWidth: 500, margin: '0 auto', lineHeight: 1.6 }}>Select one of your registered courses from the selector above to access your scheduled examinations and quiz modules.</p>
        </div>
      ) : displayedQuizzes.length === 0 ? (
        <div className="lexa-card animate-fade-in-up" style={{ padding: '100px 20px', textAlign: 'center', border: '1px dashed #e1e9f1' }}>
          <div style={{ width: 90, height: 90, borderRadius: '50%', background: 'rgba(241, 180, 76, 0.1)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <AlertCircle size={45} />
          </div>
          <h4 style={{ fontWeight: 800, color: '#2a3142', marginBottom: 12 }}>No Active Assessments</h4>
          <p style={{ color: '#74788d', fontSize: 15, maxWidth: 500, margin: '0 auto', lineHeight: 1.6 }}>There are currently no examinations active for this curriculum module. Please monitor your notifications for future schedules.</p>
          <button onClick={() => setSelectedCid('')} className="btn-lexa btn-lexa-outline" style={{ marginTop: 30 }}>
            Change Course Selection
          </button>
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
              </div>

              <div style={{ padding: '16px 24px', background: '#fcfdfe', borderTop: '1px solid #f1f5f7', display: 'flex', gap: 12 }}>
                <button 
                  onClick={() => viewReport(q.qId)} 
                  className="btn-lexa btn-lexa-outline"
                  style={{ flex: 1, padding: '10px', fontSize: 13, borderRadius: 6 }}
                >
                  History
                </button>
                <Link 
                  to={`/user-dashboard/instructions/${q.qId}`} 
                  className="btn-lexa btn-lexa-primary"
                  style={{ flex: 1.5, padding: '10px', fontSize: 13, textDecoration: 'none', borderRadius: 6 }}
                >
                  <PlayCircle size={16} /> Begin Session
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results Modal - Enhanced Lexa Design */}
      {reportModal && (
        <div className="lexa-modal-overlay" onClick={() => setReportModal(false)}>
          <div className="lexa-modal-content animate-zoom-in" style={{ maxWidth: 650, borderRadius: 12, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div className="lexa-modal-header" style={{ padding: '20px 25px', borderBottom: '1px solid #f1f5f7', background: '#fff' }}>
              <div>
                <h5 className="lexa-modal-title" style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Assessment Performance Report</h5>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#adb5bd' }}>Verified examination attempt records</p>
              </div>
              <button onClick={() => setReportModal(false)} style={{ background: '#f8f9fa', border: 'none', color: '#adb5bd', cursor: 'pointer', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} className="close-btn-hover">
                <X size={18} />
              </button>
            </div>
            <div className="lexa-modal-body" style={{ padding: '25px' }}>
              {isLoadingReportData ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
                  <Loader2 className="spin-ico" size={40} style={{ color: 'var(--primary)', marginBottom: 20 }} />
                  <h6 style={{ fontWeight: 700, color: '#495057' }}>Retrieving Candidate Data</h6>
                  <p style={{ fontSize: 13, color: '#adb5bd' }}>Decryption in progress...</p>
                </div>
              ) : reportData.length === 0 ? (
                <div style={{ padding: '60px 0', textAlign: 'center' }}>
                  <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#fcfdfe', border: '1px solid #f1f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#e1e9f1' }}>
                    <FileText size={40} />
                  </div>
                  <h6 style={{ fontWeight: 800, color: '#adb5bd' }}>No Records Found</h6>
                  <p style={{ fontSize: 13, color: '#ced4da', maxWidth: 300, margin: '0 auto' }}>You haven't attempted this assessment yet. All future results will appear here.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="table-lexa">
                    <thead>
                      <tr>
                        <th style={{ padding: '15px 12px' }}>Candidate Details</th>
                        <th style={{ textAlign: 'center', padding: '15px 12px' }}>Final Score</th>
                        <th style={{ textAlign: 'right', padding: '15px 12px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.map((r: any, i: number) => (
                        <tr key={i}>
                          <td style={{ padding: '15px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ width: 35, height: 35, borderRadius: '50%', background: 'rgba(122, 111, 190, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12 }}>
                                {r.user?.firstname?.[0]}
                              </div>
                              <div>
                                <div style={{ fontWeight: 800, color: '#2a3142', fontSize: 14 }}>{r.user?.firstname} {r.user?.lastname}</div>
                                <div style={{ fontSize: 11, color: '#adb5bd', fontWeight: 600 }}>ID: {r.user?.username}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center', padding: '15px 12px' }}>
                            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                               <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary)' }}>
                                 {parseFloat(r.marks||0) + parseFloat(r.marksB||0)}
                               </span>
                               <span style={{ fontSize: 10, color: '#adb5bd', fontWeight: 700 }}>POINTS</span>
                            </div>
                          </td>
                          <td style={{ textAlign: 'right', padding: '15px 12px' }}>
                            <span className={`lexa-badge badge-soft-${r.progress === 'Completed' ? 'success' : 'warning'}`} style={{ padding: '4px 12px', fontSize: 11, borderRadius: 4 }}>
                              {r.progress}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="lexa-modal-footer" style={{ padding: '15px 25px', background: '#fcfdfe', borderTop: '1px solid #f1f5f7', textAlign: 'right' }}>
              <button onClick={() => setReportModal(false)} className="btn-lexa btn-lexa-primary" style={{ padding: '10px 25px', borderRadius: 8 }}>Close Report</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .quiz-card-premium:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 16px rgba(18, 38, 63, 0.08) !important;
          border-color: var(--primary) !important;
        }
        @media (max-width: 576px) {
          .lexa-modal-content { width: 95vw !important; border-radius: 8px !important; }
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
          display: flex; align-items: center; justify-content: center; z-index: 1000; animation: fadeIn .3s ease;
        }
        .animate-zoom-in { animation: zoomIn .3s cubic-bezier(0.4, 0, 0.2, 1); }
        @keyframes zoomIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .close-btn-hover:hover { background: #fee !important; color: var(--danger) !important; }
        .spin-ico { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        @media (max-width: 576px) {
          .lexa-modal-content { width: 95vw !important; border-radius: 8px !important; }
        }
      `}</style>
    </div>
  );
}
