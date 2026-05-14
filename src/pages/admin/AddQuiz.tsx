import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCategories, addQuiz } from '../../api/endpoints';
import toast, { Toaster } from 'react-hot-toast';
import { 
  ClipboardList, Settings, ShieldAlert, Zap, Globe, Lock, Eye, EyeOff, 
  Save, X, Calendar, Clock, BookOpen, Layers, CheckCircle, Send, 
  ShieldCheck, HelpCircle, Monitor, Smartphone, AlertTriangle, List, 
  FileText, Loader2, ArrowLeft, Terminal, Target, Award, Shield,
  Activity, BadgeCheck, Cpu, Key, UserCheck, Timer, LayoutGrid, Sparkles,
  LockIcon, AlertCircle, ShieldEllipsis, ChevronRight,
  ClipboardCheck,
  Tag,
  Hash,
  Info
} from 'lucide-react';

const VIOLATION_OPTIONS = [
  { v:'NONE', l:'No Restrictions' }, 
  { v:'DELAY_ONLY', l:'Temporary Lock' },
  { v:'AUTOSUBMIT_ONLY', l:'Auto Submit' }, 
  { v:'DELAY_AND_AUTOSUBMIT', l:'Lock + Auto Submit' },
];

const defaultQuiz = () => ({
  title:'', description:'', maxMarks:'', numberOfQuestions:'', quizpassword:'', quizTime:'',
  startTime:'', quizDate:'', attempted:false, active:true, category:{ cid:'' }, quizType:'',
  violationAction:'NONE', violationDelaySeconds:30, autoSubmitCountdownSeconds:5, maxViolations:3,
  delayMultiplier:1.5, enableFullscreenLock:true, enableWatermark:true,
  enableScreenshotBlocking:true, enableDevToolsBlocking:true,
});

export default function AddQuiz({ lectMode = false }: { lectMode?: boolean }) {
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(defaultQuiz());
  const [hide, setHide] = useState(true);
  const [loading, setLoading] = useState(false);
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: getCategories });
  const roleName = lectMode ? 'Lecturer' : 'Admin';

  const set = (k: string, v: any) => setQuiz(q => ({ ...q, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quiz.quizType) { toast.error('Please select a quiz type (OBJ/Theory)'); return; }
    if (!quiz.category.cid) { toast.error('Please associate this with a course'); return; }
    
    setLoading(true);
    try {
      await addQuiz(quiz);
      toast.success('Assessment established successfully');
      setTimeout(() => navigate(lectMode ? '/lect/quizes' : '/admin/quizzes'), 1200);
    } catch { 
      toast.error('Initialization protocol failed'); 
    } finally { 
      setLoading(false); 
    }
  };

  const ToggleNode = ({ label, k, icon: Icon, desc }: { label: string; k: string; icon: any; desc: string }) => (
    <div className={`minia-switch-item ${(quiz as any)[k] ? 'active' : ''}`} onClick={() => set(k, !(quiz as any)[k])}>
       <div className="switch-icon"><Icon size={16} /></div>
       <div className="switch-info">
          <span className="switch-label">{label}</span>
          <span className="switch-description">{desc}</span>
       </div>
       <div className="minia-toggle">
         <div className="toggle-thumb" />
       </div>
    </div>
  );

  return (
    <div className="minia-app-container animate-fade-in">
      <Toaster position="top-right" />
      
      {/* Page Header */}
      <div className="minia-page-header mb-5">
        <div className="d-flex align-items-center justify-content-between">
          <div>
            <h4 className="minia-page-title mb-1">Assessment Studio</h4>
            <div className="minia-breadcrumb font-size-13 text-muted">
              <span>{roleName} Portal</span> <ChevronRight size={12}/> <span>New Assessment</span>
            </div>
          </div>
          <button className="btn-minia-light" onClick={() => navigate(lectMode ? '/lect/quizes' : '/admin/quizzes')}>
            <ArrowLeft size={16} className="me-1"/> Back to Registry
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="row g-4">
          <div className="col-xl-8">
            {/* Identity Card */}
            <div className="minia-card-standout standout-identity mb-5">
              <div className="minia-card-header-distinct">
                <div className="d-flex align-items-center gap-2">
                  <div className="icon-badge-distinct bg-soft-primary"><BookOpen size={20}/></div>
                  <h6 className="mb-0 fw-bold">Assessment Identity</h6>
                </div>
              </div>
              <div className="card-body p-4">
                <div className="row g-4 mb-4">
                  <div className="col-md-8">
                    <label className="minia-form-label">Quiz Title</label>
                    <div className="minia-input-group">
                       <span className="minia-input-icon"><Tag size={16}/></span>
                       <input className="minia-field" required value={quiz.title} onChange={e=>set('title',e.target.value)} placeholder="e.g. Mid-Semester Theory Examination"/>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <label className="minia-form-label">Academic Category</label>
                    <div className="minia-input-group">
                       <span className="minia-input-icon"><Layers size={16}/></span>
                       <select className="minia-field" required value={quiz.category.cid} onChange={e=>set('category',{cid:e.target.value})}>
                        <option value="">Select Category...</option>
                        {categories.map((c:any)=><option key={c.cid} value={c.cid}>{c.title}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="col-12">
                    <label className="minia-form-label">Instructions & Syllabus Guidelines</label>
                    <textarea className="minia-field" rows={3} value={quiz.description} onChange={e=>set('description',e.target.value)} placeholder="Provide student guidelines..." style={{ resize: 'none' }}/>
                  </div>
                </div>
              </div>
            </div>

            {/* Metrics Card */}
            <div className="minia-card-standout standout-parameters mb-5">
              <div className="minia-card-header-distinct">
                <div className="d-flex align-items-center gap-2">
                  <div className="icon-badge-distinct bg-soft-info"><Activity size={20}/></div>
                  <h6 className="mb-0 fw-bold">Assessment Parameters</h6>
                </div>
              </div>
              <div className="card-body p-4">
                <div className="mb-4">
                  <label className="minia-form-label">Taxonomy Classification</label>
                  <div className="d-flex gap-2">
                    {[
                      { id: 'OBJ', label: 'Objectives', icon: List, color: '#5156be' },
                      { id: 'THEORY', label: 'Theory', icon: FileText, color: '#2ab57d' },
                      { id: 'BOTH', label: 'Combined', icon: LayoutGrid, color: '#ffbf53' }
                    ].map(t=>(
                      <button key={t.id} type="button" className={`minia-tax-btn ${quiz.quizType===t.id ? 'active' : ''}`} onClick={()=>set('quizType',t.id)}>
                        <t.icon size={16} /> <span>{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="row g-3 mb-4">
                  <div className="col-md-4">
                    <label className="minia-form-label text-center">Max Marks</label>
                    <div className="minia-input-group">
                       <span className="minia-input-icon"><Award size={16}/></span>
                       <input className="minia-field text-center fw-bold" type="number" required value={quiz.maxMarks} onChange={e=>set('maxMarks',e.target.value)}/>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <label className="minia-form-label text-center">Item Count</label>
                    <div className="minia-input-group">
                       <span className="minia-input-icon"><Hash size={16}/></span>
                       <input className="minia-field text-center fw-bold" type="number" required value={quiz.numberOfQuestions} onChange={e=>set('numberOfQuestions',e.target.value)}/>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <label className="minia-form-label text-center">Duration (M)</label>
                    <div className="minia-input-group">
                       <span className="minia-input-icon"><Timer size={16}/></span>
                       <input className="minia-field text-center fw-bold text-primary" type="number" required value={quiz.quizTime} onChange={e=>set('quizTime',e.target.value)}/>
                    </div>
                  </div>
                </div>

                {quiz.quizType === 'THEORY' && (
                  <div className="minia-theory-notice mb-4">
                    <Info size={16} /> 
                    <span>Theory mode requires manual marking via the Lecturer Assessment Panel.</span>
                  </div>
                )}

                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="minia-form-label">Scheduled Date</label>
                    <div className="minia-input-group">
                       <span className="minia-input-icon"><Calendar size={16}/></span>
                       <input className="minia-field" type="date" required value={quiz.quizDate} onChange={e=>set('quizDate',e.target.value)}/>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <label className="minia-form-label">Start Time</label>
                    <div className="minia-input-group">
                       <span className="minia-input-icon"><Clock size={16}/></span>
                       <input className="minia-field" type="time" required value={quiz.startTime} onChange={e=>set('startTime',e.target.value)}/>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <label className="minia-form-label">Security Passkey</label>
                    <div className="minia-input-group">
                      <span className="minia-input-icon"><Key size={16}/></span>
                      <input className="minia-field pe-5" type={hide?'password':'text'} value={quiz.quizpassword} onChange={e=>set('quizpassword',e.target.value)} placeholder="TOKEN"/>
                      <button type="button" onClick={()=>setHide(!hide)} className="minia-eye-btn">{hide ? <Eye size={16}/> : <EyeOff size={16}/>}</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-4">
            {/* System Security */}
            <div className="minia-card-standout standout-security mb-4">
              <div className="minia-card-header-distinct">
                <div className="d-flex align-items-center gap-2">
                  <div className="icon-badge-distinct bg-soft-indigo"><ShieldCheck size={20}/></div>
                  <h6 className="mb-0 fw-bold">Integrity Controls</h6>
                </div>
              </div>
              <div className="card-body p-3">
                <ToggleNode label="Focus Lock" k="enableFullscreenLock" icon={Monitor} desc="Restrict window maneuvers"/>
                <ToggleNode label="Watermark" k="enableWatermark" icon={Layers} desc="Visible student ID trace"/>
                <ToggleNode label="Media Shield" k="enableScreenshotBlocking" icon={Smartphone} desc="Block screen captures"/>
                <ToggleNode label="Tech Shield" k="enableDevToolsBlocking" icon={Terminal} desc="Inhibit console access"/>
              </div>
            </div>

            {/* Deployment Card */}
            <div className="minia-card-standout standout-deployment mb-4">
              <div className="minia-card-header-distinct">
                <div className="d-flex align-items-center gap-2">
                  <div className="icon-badge-distinct bg-soft-warning"><Zap size={20}/></div>
                  <h6 className="mb-0 fw-bold">Deployment Status</h6>
                </div>
              </div>
              <div className="card-body p-4">
                <div className={`minia-deployment-card-distinct ${quiz.active ? 'active' : 'draft'}`} onClick={()=>set('active',!quiz.active)}>
                  <div className="d-flex align-items-center gap-3">
                    <div className="status-badge-distinct">
                      {quiz.active ? <CheckCircle size={22} /> : <Save size={22} />}
                    </div>
                    <div>
                      <h6 className="mb-0 fw-bold">{quiz.active ? 'LIVE STATUS' : 'DRAFT MODE'}</h6>
                      <p className="mb-0 font-size-11 opacity-75">{quiz.active ? 'Visible to students' : 'Private to author'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Breach Protocols */}
            <div className="minia-card-standout standout-danger mb-4">
              <div className="minia-card-header-distinct">
                <div className="d-flex align-items-center gap-2">
                  <div className="icon-badge-distinct bg-soft-danger"><ShieldAlert size={20}/></div>
                  <h6 className="mb-0 fw-bold text-danger">Breach Policy</h6>
                </div>
              </div>
              <div className="card-body p-4">
                <div className="mb-4">
                  <label className="minia-form-label">Automated Penalty</label>
                  <select className="minia-field border-danger-subtle" value={quiz.violationAction} onChange={e=>set('violationAction',e.target.value)}>
                    {VIOLATION_OPTIONS.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                </div>
                <div className="row g-2">
                  <div className="col-4">
                    <label className="minia-form-label text-center">Limit</label>
                    <input className="minia-field text-center font-size-13" type="number" value={quiz.maxViolations} onChange={e=>set('maxViolations',e.target.value)}/>
                  </div>
                  <div className="col-4">
                    <label className="minia-form-label text-center">Delay</label>
                    <input className="minia-field text-center font-size-13" type="number" value={quiz.violationDelaySeconds} onChange={e=>set('violationDelaySeconds',e.target.value)}/>
                  </div>
                  <div className="col-4">
                    <label className="minia-form-label text-center">Auto</label>
                    <input className="minia-field text-center font-size-13" type="number" value={quiz.autoSubmitCountdownSeconds} onChange={e=>set('autoSubmitCountdownSeconds',e.target.value)}/>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="d-flex justify-content-end gap-3 mt-5 pb-5">
          <button type="button" onClick={()=>navigate(lectMode?'/lect/quizes':'/admin/quizzes')} className="btn-minia-ghost-distinct">Discard Entry</button>
          <button type="submit" className="btn-minia-solid-distinct d-flex align-items-center gap-2" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={18} /> : <ShieldEllipsis size={18} />}
            <span className="fw-bold">{loading ? 'Initializing...' : 'Establish Assessment'}</span>
          </button>
        </div>
      </form>

      <style>{`
        .minia-app-container {
          padding: 2.5rem;
          font-family: 'Public Sans', sans-serif;
          background-color: #f4f5f7;
          min-height: 100vh;
          color: #495057;
        }

        .minia-page-title { font-size: 1.25rem; font-weight: 800; color: #1e293b; letter-spacing: -0.01em; }
        .minia-breadcrumb { display: flex; align-items: center; gap: 8px; font-weight: 500; }

        /* Standout Cards */
        .minia-card-standout {
          background: #fff; border-radius: 12px; border: 1px solid #e2e8f0;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
          overflow: hidden;
          transition: all 0.3s ease;
        }
        .minia-card-standout:hover { box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.1); }
        
        .minia-card-header-distinct {
           padding: 1.25rem 1.5rem;
           border-bottom: 1px solid #f1f5f9;
           position: relative;
        }

        /* Color-Coded Left Accents */
        .standout-identity { border-left: 5px solid #5156be; }
        .standout-identity .minia-card-header-distinct { background: rgba(81, 86, 190, 0.02); }
        
        .standout-parameters { border-left: 5px solid #2ab57d; }
        .standout-parameters .minia-card-header-distinct { background: rgba(42, 181, 125, 0.02); }
        
        .standout-security { border-left: 5px solid #6f42c1; }
        .standout-security .minia-card-header-distinct { background: rgba(111, 66, 193, 0.02); }
        
        .standout-deployment { border-left: 5px solid #ffbf53; }
        .standout-deployment .minia-card-header-distinct { background: rgba(255, 191, 83, 0.02); }
        
        .standout-danger { border-left: 5px solid #fd625e; }
        .standout-danger .minia-card-header-distinct { background: rgba(253, 98, 94, 0.02); }

        .icon-badge-distinct { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 2px 4px rgba(0,0,0,0.05); }
        
        .bg-soft-primary { background: #eef2ff; color: #5156be; }
        .bg-soft-info { background: #ecfdf5; color: #2ab57d; }
        .bg-soft-warning { background: #fffbeb; color: #ffbf53; }
        .bg-soft-danger { background: #fef2f2; color: #fd625e; }
        .bg-soft-indigo { background: #f5f3ff; color: #6f42c1; }

        /* Form Elements */
        .minia-form-label { display: block; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.05em; }
        .minia-input-group { position: relative; display: flex; align-items: center; }
        .minia-input-icon { position: absolute; left: 14px; color: #94a3b8; pointer-events: none; }
        
        .minia-field {
          width: 100%; padding: 0.6rem 1rem 0.6rem 2.8rem; font-size: 14px;
          font-weight: 500; color: #334155; background-color: #fff;
          border: 1px solid #cbd5e1; border-radius: 8px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        textarea.minia-field { padding-left: 1rem; }
        .minia-field:focus {
          border-color: #5156be; outline: 0;
          box-shadow: 0 0 0 4px rgba(81, 86, 190, 0.1);
          background-color: #fff;
        }
        .minia-input-group:focus-within .minia-input-icon { color: #5156be; }

        .minia-tax-btn {
          flex: 1; padding: 0.75rem; border-radius: 8px; border: 1px solid #e2e8f0;
          background: #fff; display: flex; align-items: center; justify-content: center;
          gap: 10px; font-size: 13px; font-weight: 700; color: #64748b; transition: 0.3s; cursor: pointer;
        }
        .minia-tax-btn.active { background: #1e293b; border-color: #1e293b; color: #fff; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .minia-tax-btn:hover:not(.active) { background: #f8fafc; border-color: #cbd5e1; }

        .minia-eye-btn { position: absolute; right: 12px; background: none; border: none; color: #94a3b8; cursor: pointer; }
        .minia-eye-btn:hover { color: #5156be; }

        /* Switches */
        .minia-switch-item {
          padding: 12px; border-radius: 10px; display: flex; align-items: center; gap: 12px;
          cursor: pointer; transition: 0.2s; margin-bottom: 8px; border: 1px solid transparent;
        }
        .minia-switch-item:hover { background: #f8fafc; border-color: #f1f5f9; }
        .minia-switch-item.active { background: rgba(111, 66, 193, 0.05); }
        
        .switch-icon { width: 36px; height: 36px; border-radius: 8px; background: #f1f5f9; color: #64748b; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
        .minia-switch-item.active .switch-icon { background: #6f42c1; color: #fff; }
        
        .switch-info { flex: 1; }
        .switch-label { display: block; font-size: 13px; font-weight: 700; color: #334155; }
        .switch-description { display: block; font-size: 10px; color: #94a3b8; font-weight: 500; }

        .minia-toggle { width: 36px; height: 18px; border-radius: 20px; background: #e2e8f0; position: relative; transition: 0.3s; }
        .minia-switch-item.active .minia-toggle { background: #6f42c1; }
        .toggle-thumb { width: 14px; height: 14px; border-radius: 50%; background: #fff; position: absolute; top: 2px; left: 2px; transition: 0.3s; }
        .minia-switch-item.active .toggle-thumb { left: 20px; }

        /* Deployment Card */
        .minia-deployment-card-distinct { padding: 1.75rem; border: 2px dashed #e2e8f0; border-radius: 12px; cursor: pointer; transition: 0.3s; }
        .minia-deployment-card-distinct.active { border-color: #2ab57d; background: #ecfdf5; border-style: solid; box-shadow: 0 10px 20px -5px rgba(42, 181, 125, 0.1); }
        .status-badge-distinct { width: 44px; height: 44px; border-radius: 12px; background: #f1f5f9; color: #94a3b8; display: flex; align-items: center; justify-content: center; transition: 0.3s; }
        .minia-deployment-card-distinct.active .status-badge-distinct { background: #2ab57d; color: #fff; }

        .minia-theory-notice { padding: 12px 16px; background: #eff6ff; border: 1px solid #dbeafe; border-radius: 10px; display: flex; align-items: center; gap: 10px; color: #1d4ed8; font-size: 12px; font-weight: 600; }

        .btn-minia-solid-distinct { background: #1e293b; color: #fff; border: none; padding: 1rem 3rem; border-radius: 10px; font-size: 15px; font-weight: 800; transition: 0.3s; cursor: pointer; box-shadow: 0 10px 20px -5px rgba(0,0,0,0.2); }
        .btn-minia-solid-distinct:hover { background: #000; transform: translateY(-2px); box-shadow: 0 15px 30px -5px rgba(0,0,0,0.3); }
        
        .btn-minia-ghost-distinct { background: #fff; border: 2px solid #e2e8f0; color: #64748b; padding: 1rem 3rem; border-radius: 10px; font-size: 15px; transition: 0.2s; cursor: pointer; font-weight: 800; }
        .btn-minia-ghost-distinct:hover { background: #f8fafc; color: #1e293b; border-color: #cbd5e1; }
        
        .btn-minia-light { background: #fff; border: 1px solid #e2e8f0; padding: 10px 20px; border-radius: 8px; font-size: 13px; font-weight: 700; color: #64748b; cursor: pointer; transition: 0.2s; }
        .btn-minia-light:hover { background: #f8fafc; color: #1e293b; border-color: #5156be; }

        .animate-fade-in { animation: fadeIn 0.6s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 768px) {
          .minia-app-container { padding: 1rem; }
          .minia-page-title { font-size: 1.1rem; }
          .d-flex.justify-content-end.gap-3.mt-5 { flex-direction: column-reverse; }
          .btn-minia-solid-distinct, .btn-minia-ghost-distinct { width: 100%; text-align: center; justify-content: center; display: flex; padding: 0.8rem 1.5rem; font-size: 14px; }
          .minia-card-header-distinct { padding: 1rem; }
          .card-body { padding: 1rem !important; }
          .d-flex.gap-2 { flex-wrap: wrap; }
          .minia-tax-btn { min-width: 90px; }
        }
      `}</style>
    </div>
  );
}
