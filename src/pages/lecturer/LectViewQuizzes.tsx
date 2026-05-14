import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { loadQuizzesForUser, getCategories, getQuiz, updateQuiz, deleteQuiz, updateQuizStatus } from '../../api/endpoints';
import Swal from 'sweetalert2';
import toast, { Toaster } from 'react-hot-toast';
import { 
  Plus, 
  X, 
  Save, 
  Loader2,
  Database,
  Settings,
  Trash2,
  Eye,
  EyeOff,
  ShieldCheck,
  Clock,
  Calendar,
  Layers,
  FileText,
  BookOpen,
  ChevronRight,
  MoreVertical,
  Activity,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const VIOLATION_OPTIONS = [
  { v:'NONE', l:'None' }, { v:'DELAY_ONLY', l:'Delay Student' },
  { v:'AUTOSUBMIT_ONLY', l:'Auto Submit' }, { v:'DELAY_AND_AUTOSUBMIT', l:'Delay + Auto' },
];

function QuizEditModal({ qId, onClose, onSave, categories }: any) {
  const [quiz, setQuiz] = useState<any>(null);
  const [hide, setHide] = useState(true);

  useEffect(() => {
    getQuiz(qId).then(data => setQuiz({ ...data, selectedStatus: data.status }));
  }, [qId]);

  if (!quiz) return (
    <div className="minia-modal-overlay">
      <div className="minia-modal p-5 text-center" style={{ maxWidth: 350 }}>
        <Loader2 className="animate-spin text-primary mx-auto" size={32} />
        <p className="text-muted mt-3 font-size-14">Fetching configuration...</p>
      </div>
    </div>
  );

  const set = (k: string, v: any) => setQuiz((q: any) => ({ ...q, [k]: v }));

  const save = async () => {
    try { 
      await updateQuiz(quiz); 
      toast.success('Quiz updated successfully'); 
      onSave(); 
      onClose(); 
    } catch { 
      toast.error("Failed to sync changes"); 
    }
  };

  const ToggleItem = ({ label, icon, k }: { label: string; icon: React.ReactNode; k: string }) => (
    <div className="d-flex align-items-center justify-content-between p-3 border rounded mb-2 bg-white">
      <div className="d-flex align-items-center gap-2">
        <span className="text-primary">{icon}</span>
        <span className="font-size-13 fw-medium text-dark">{label}</span>
      </div>
      <div className="form-check form-switch" onClick={() => set(k, !quiz[k])} style={{ cursor: 'pointer' }}>
        <input className="form-check-input" type="checkbox" checked={quiz[k]||false} readOnly />
      </div>
    </div>
  );

  return (
    <div className="minia-modal-overlay">
      <div className="minia-modal shadow-lg animate-fade-in" style={{ maxWidth: 700 }}>
        <div className="minia-modal-header p-3 border-bottom d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
             <Settings size={18} className="text-primary" />
             <h6 className="mb-0 fw-bold font-size-15">Configure Assessment</h6>
          </div>
          <X className="cursor-pointer text-muted" onClick={onClose} size={20}/>
        </div>
        
        <div className="p-4 bg-light-subtle" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
          <div className="row g-3">
            <div className="col-md-8">
              <label className="minia-label">Quiz Title</label>
              <input className="minia-input" value={quiz.title||''} onChange={e=>set('title',e.target.value)}/>
            </div>
            <div className="col-md-4">
              <label className="minia-label">Category</label>
              <select className="minia-input" value={quiz.category?.cid||''} onChange={e=>set('category',{...quiz.category,cid:Number(e.target.value)})}>
                {categories.map((c:any)=><option key={c.cid} value={c.cid}>{c.title}</option>)}
              </select>
            </div>

            <div className="col-12">
              <label className="minia-label">Description / Instructions</label>
              <textarea className="minia-input" rows={3} value={quiz.description||''} onChange={e=>set('description',e.target.value)}/>
            </div>

            <div className="col-md-6">
              <label className="minia-label">Quiz Mode</label>
              <div className="d-flex gap-2">
                {['THEORY','OBJ','BOTH'].map(t=>(
                  <button key={t} className={`minia-btn-pill ${quiz.quizType===t ? 'active' : ''}`} onClick={()=>set('quizType',t)}>{t}</button>
                ))}
              </div>
            </div>

            <div className="col-md-6">
               <div className="row g-2">
                 {quiz.quizType !== 'THEORY' && (
                   <>
                    <div className="col-4">
                      <label className="minia-label text-center">Marks</label>
                      <input className="minia-input text-center" type="number" value={quiz.maxMarks||''} onChange={e=>set('maxMarks',e.target.value)}/>
                    </div>
                    <div className="col-4">
                      <label className="minia-label text-center">Items</label>
                      <input className="minia-input text-center" type="number" value={quiz.numberOfQuestions||''} onChange={e=>set('numberOfQuestions',e.target.value)}/>
                    </div>
                    <div className="col-4">
                      <label className="minia-label text-center">Time (m)</label>
                      <input className="minia-input text-center" type="number" value={quiz.quizTime||''} onChange={e=>set('quizTime',e.target.value)}/>
                    </div>
                   </>
                 )}
               </div>
            </div>

            <div className="col-md-4">
              <label className="minia-label">Scheduled Date</label>
              <input className="minia-input" type="date" value={quiz.quizDate||''} onChange={e=>set('quizDate',e.target.value)}/>
            </div>
            <div className="col-md-4">
              <label className="minia-label">Start Time</label>
              <input className="minia-input" type="time" value={quiz.startTime||''} onChange={e=>set('startTime',e.target.value)}/>
            </div>
            <div className="col-md-4">
              <label className="minia-label">Quiz Password</label>
              <div className="input-group-minia">
                <input className="minia-input" type={hide?'password':'text'} value={quiz.quizpassword||''} onChange={e=>set('quizpassword',e.target.value)} />
                <button type="button" onClick={()=>setHide(h=>!h)} className="input-action-btn">{hide ? <Eye size={16}/> : <EyeOff size={16}/>}</button>
              </div>
            </div>

            <div className="col-12 mt-3">
               <div className="p-3 border rounded bg-white shadow-sm">
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <ShieldCheck size={18} className="text-primary"/>
                    <span className="font-size-12 fw-bold text-uppercase">Security & Integrity</span>
                  </div>
                  <div className="row g-2">
                    <div className="col-md-8">
                      <label className="minia-label">Violation Action</label>
                      <select className="minia-input" value={quiz.violationAction||'NONE'} onChange={e=>set('violationAction',e.target.value)}>
                        {VIOLATION_OPTIONS.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="minia-label">Max Violations</label>
                      <input className="minia-input text-center" type="number" value={quiz.maxViolations||''} onChange={e=>set('maxViolations',e.target.value)}/>
                    </div>
                    
                    <div className="col-12 mt-2">
                       <div className="row g-2">
                         <div className="col-md-6"><ToggleItem label="Fullscreen Lock" icon={<Layers size={14}/>} k="enableFullscreenLock"/></div>
                         <div className="col-md-6"><ToggleItem label="Security Watermark" icon={<Save size={14}/>} k="enableWatermark"/></div>
                       </div>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </div>

        <div className="p-3 border-top d-flex justify-content-end gap-2 bg-white">
          <button className="minia-btn-plain" onClick={onClose}>Cancel</button>
          <button className="minia-btn-solid" onClick={save}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}

export default function LectViewQuizzes() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: quizzes = [], isLoading } = useQuery({ queryKey: ['lectQuizzes'], queryFn: loadQuizzesForUser });
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: getCategories });
  const [editQuizId, setEditQuizId] = useState<number|null>(null);
  const [statusMap, setStatusMap]   = useState<Record<number,string>>({});
  const [updatingMap, setUpdatingMap] = useState<Record<number,boolean>>({});

  useEffect(() => {
    if (editQuizId !== null) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [editQuizId]);

  const doDelete = (qId: number) => {
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#5156be',
      cancelButtonColor: '#74788d',
      confirmButtonText: 'Yes, delete it!'
    }).then(r => {
      if (!r.isConfirmed) return;
      deleteQuiz(qId).then(()=>{ 
        toast.success('Quiz deleted'); 
        qc.invalidateQueries({queryKey:['lectQuizzes']}); 
      }).catch(()=>toast.error('Deletion failed'));
    });
  };

  const doUpdateStatus = (q: any) => {
    const sel = statusMap[q.qId] ?? q.status;
    setUpdatingMap(m=>({...m,[q.qId]:true}));
    updateQuizStatus(q.qId, sel).then(()=>{
      toast.success(`Status updated: ${sel}`);
      qc.invalidateQueries({queryKey:['lectQuizzes']});
    }).catch(()=>toast.error('Sync failed'))
      .finally(()=>setUpdatingMap(m=>({...m,[q.qId]:false})));
  };

  return (
    <div className="minia-container animate-fade-in">
      <Toaster position="top-right"/>
      
      {/* Page Header */}
      <div className="minia-header mb-4">
        <div className="d-flex align-items-center justify-content-between">
          <div>
            <h4 className="minia-page-title mb-1">Assessment Portfolio</h4>
            <div className="d-flex align-items-center gap-2 text-muted font-size-13">
              <span>Home</span> <ChevronRight size={12}/> <span>Quizzes</span>
            </div>
          </div>
          <button className="btn-minia-primary" onClick={()=>navigate('/lect/add-quizes')}>
            <Plus size={16} className="me-1" />
            Create Quiz
          </button>
        </div>
      </div>

      {/* Grid Layout - 3 per row enforced */}
      <div className="row">
        {isLoading ? (
          <div className="col-12 text-center py-5">
            <Loader2 className="animate-spin text-primary" size={32} />
            <p className="text-muted mt-3">Synchronizing Portfolio...</p>
          </div>
        ) : quizzes.length === 0 ? (
          <div className="col-12 text-center py-5">
            <Database size={48} className="text-muted opacity-25 mb-3" />
            <p className="text-muted font-size-14">No quizzes found in your registry.</p>
          </div>
        ) : (
          quizzes.map((q: any) => {
            const isLive = q.status === 'OPEN';
            const accentColor = q.quizType === 'OBJ' ? '#5156be' : q.quizType === 'THEORY' ? '#fd625e' : '#ffbf53';
            
            return (
              <div key={q.qId} className="col-lg-4 col-md-6 mb-4">
                <div className="minia-card" style={{ borderTop: `3px solid ${accentColor}` }}>
                  <div className="card-header border-0 bg-transparent p-4 pb-0 d-flex justify-content-between align-items-start">
                     <div>
                        <span className="text-muted font-size-11 fw-bold text-uppercase ls-1">{q.category?.title}</span>
                        <h5 className="minia-card-title mt-1 mb-0 text-truncate" title={q.title}>{q.title}</h5>
                     </div>
                     <span className={`minia-badge ${isLive ? 'bg-soft-success text-success' : 'bg-soft-danger text-danger'}`}>
                        {q.status}
                     </span>
                  </div>

                  <div className="card-body p-4">
                     <p className="minia-card-desc mb-4">
                        {q.description || "Standard academic assessment for student proficiency evaluation."}
                     </p>

                     <div className="row g-0 border rounded overflow-hidden">
                        <div className="col-4 border-end p-2 text-center bg-light-subtle">
                           <span className="d-block font-size-11 text-muted text-uppercase fw-bold">Items</span>
                           <span className="fw-bold text-dark font-size-14">{q.numberOfQuestions}</span>
                        </div>
                        <div className="col-4 border-end p-2 text-center bg-light-subtle">
                           <span className="d-block font-size-11 text-muted text-uppercase fw-bold">Marks</span>
                           <span className="fw-bold text-dark font-size-14">{q.maxMarks}</span>
                        </div>
                        <div className="col-4 p-2 text-center bg-light-subtle">
                           <span className="d-block font-size-11 text-muted text-uppercase fw-bold">Time</span>
                           <span className="fw-bold text-dark font-size-14">{q.quizTime}m</span>
                        </div>
                     </div>

                     <div className="mt-4 pt-2 d-flex align-items-center justify-content-between text-muted font-size-12 fw-medium border-top pt-3">
                        <div className="d-flex align-items-center gap-1">
                           <Calendar size={13} /> <span>{q.quizDate}</span>
                        </div>
                        <div className="d-flex align-items-center gap-1">
                           <Clock size={13} /> <span>{q.startTime}</span>
                        </div>
                     </div>
                  </div>

                  <div className="card-footer bg-transparent border-top p-3 px-4 d-flex justify-content-between align-items-center">
                     <div className="d-flex gap-3">
                        <Link to={`/lect/view-quetions/${q.qId}/${q.title}`} className="minia-footer-link" title="Manage Questions">Questions</Link>
                        <button className="minia-footer-link" onClick={()=>setEditQuizId(q.qId)}>Edit</button>
                     </div>
                     <div className="d-flex align-items-center">
                        <select 
                           className="minia-status-select me-2" 
                           value={statusMap[q.qId]??q.status??''} 
                           onChange={e=>setStatusMap(m=>({...m,[q.qId]:e.target.value}))}
                         >
                           <option value="CLOSED">CLOSE</option>
                           <option value="OPEN">OPEN</option>
                         </select>
                         <button className="save-btn-minia" onClick={()=>doUpdateStatus(q)} disabled={updatingMap[q.qId]}>
                            {updatingMap[q.qId] ? <Loader2 className="animate-spin" size={12}/> : <Save size={14}/>}
                         </button>
                         <div className="vr mx-2 my-1"></div>
                         <button className="delete-btn-minia" onClick={()=>doDelete(q.qId)}><Trash2 size={16}/></button>
                     </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {editQuizId !== null && (
        <QuizEditModal qId={editQuizId} categories={categories} onClose={()=>setEditQuizId(null)} onSave={()=>qc.invalidateQueries({queryKey:['lectQuizzes']})}/>
      )}

      <style>{`
        .minia-container {
          padding: 1.5rem;
          font-family: 'Public Sans', sans-serif;
          background-color: #f5f6f8;
          min-height: 100vh;
          overflow-x: hidden;
        }

        .minia-page-title { font-size: 1.2rem; font-weight: 700; color: #495057; }
        
        .btn-minia-primary {
          background-color: #5156be; border-color: #5156be; color: #fff;
          padding: 0.5rem 1rem; border-radius: 0.25rem; font-weight: 500; font-size: 13px;
          transition: all 0.2s; border: 1px solid transparent; cursor: pointer;
          display: flex; align-items: center;
        }
        .btn-minia-primary:hover { background-color: #4549a2; transform: translateY(-1px); }

        /* Minia Card Styling */
        .minia-card {
          background-color: #fff; border: 1px solid #eff2f7; border-radius: 0.4rem;
          box-shadow: 0 0.75rem 1.5rem rgba(18, 38, 63, 0.03);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          height: 100%; display: flex; flex-direction: column;
        }
        .minia-card:hover { transform: translateY(-4px); box-shadow: 0 1rem 3rem rgba(18, 38, 63, 0.125); }

        .minia-card-title { font-size: 16px; font-weight: 600; color: #495057; }
        .minia-card-desc { font-size: 13px; color: #74788d; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 39px; }
        
        .minia-badge { padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
        .bg-soft-success { background-color: rgba(40, 167, 69, 0.1); }
        .bg-soft-danger { background-color: rgba(244, 102, 102, 0.1); }

        .minia-footer-link { font-size: 13px; font-weight: 600; color: #5156be; text-decoration: none; border: none; background: transparent; padding: 0; cursor: pointer; }
        .minia-footer-link:hover { color: #4549a2; text-decoration: underline; }

        .minia-status-select { border: none; background: transparent; font-size: 11px; font-weight: 700; color: #495057; cursor: pointer; outline: none; }
        .save-btn-minia { background: transparent; border: none; padding: 0; color: #5156be; transition: 0.2s; }
        .save-btn-minia:hover { opacity: 0.8; }
        .delete-btn-minia { background: transparent; border: none; padding: 0; color: #f46666; transition: 0.2s; }
        .delete-btn-minia:hover { transform: scale(1.1); }

        /* Minia Modal */
        .minia-modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 20px;
        }
        .minia-modal { background: #fff; border-radius: 0.4rem; width: 100%; overflow: hidden; }
        .minia-label { display: block; font-size: 12px; font-weight: 600; color: #495057; margin-bottom: 6px; }
        .minia-input {
          width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #ced4da; border-radius: 0.25rem;
          font-size: 14px; color: #495057; outline: none; transition: border-color 0.15s;
        }
        .minia-input:focus { border-color: #5156be; }
        
        .minia-btn-pill { background: #f5f6f8; border: 1px solid #eff2f7; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: 600; color: #74788d; transition: 0.2s; border: 1px solid transparent; }
        .minia-btn-pill.active { background: #5156be; color: #fff; }

        .minia-btn-plain { background: transparent; border: 1px solid #eff2f7; padding: 8px 20px; border-radius: 4px; font-size: 13px; font-weight: 500; color: #495057; }
        .minia-btn-solid { background: #5156be; border: 1px solid #5156be; padding: 8px 20px; border-radius: 4px; font-size: 13px; font-weight: 500; color: #fff; }

        .animate-fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        
        .ls-1 { letter-spacing: 0.5px; }
        .font-size-11 { font-size: 11px; }
        .font-size-13 { font-size: 13px; }
        .font-size-14 { font-size: 14px; }
        .font-size-15 { font-size: 15px; }

        @media (max-width: 768px) {
          .minia-container { padding: 1rem; }
          .minia-header .d-flex { flex-direction: column; align-items: flex-start !important; gap: 12px; }
          .btn-minia-primary { width: 100%; justify-content: center; }
          .minia-modal { max-width: 95vw !important; }
          .card-footer { flex-wrap: wrap; gap: 10px; padding: 1rem !important; }
          .card-footer .d-flex.align-items-center { flex-wrap: wrap; gap: 6px; width: 100%; justify-content: space-between; }
          .card-header { padding: 1rem 1rem 0 1rem !important; flex-direction: column; gap: 8px; }
          .card-body { padding: 1rem !important; }
          .minia-card-desc { height: auto; margin-bottom: 15px !important; }
        }
      `}</style>
    </div>
  );
}
