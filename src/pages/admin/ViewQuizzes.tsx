import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { loadQuizzes, getCategories, getQuiz, updateQuiz, deleteQuiz, updateQuizStatus } from '../../api/endpoints';
import Swal from 'sweetalert2';
import toast, { Toaster } from 'react-hot-toast';
import PageHeader from '../../components/PageHeader';
import AssessmentCard from '../../components/ui/AssessmentCard';
import { 
  Plus, Loader2, LayoutGrid, Settings, X,
  ShieldAlert, Zap, Eye, EyeOff, Save, Calendar, Clock, 
  BookOpen, Layers, CheckCircle, ShieldCheck, Monitor, 
  Smartphone, List, FileText, Terminal, Award,
  Activity, Key, Timer, Tag, Hash, Info
} from 'lucide-react';

const VIOLATION_OPTIONS = [
  { v:'NONE', l:'No Restrictions' }, 
  { v:'DELAY_ONLY', l:'Temporary Lock' },
  { v:'AUTOSUBMIT_ONLY', l:'Auto Submit' }, 
  { v:'DELAY_AND_AUTOSUBMIT', l:'Lock + Auto Submit' },
];

function QuizEditModal({ qId, onClose, onSave, categories }: any) {
  const [quiz, setQuiz] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [hide, setHide] = useState(true);

  useEffect(() => {
    getQuiz(qId).then(data => {
      if (data) {
        if (!data.category) data.category = { cid: '' };
        setQuiz({ ...data });
      } else {
        onClose();
      }
    }).catch(() => onClose());
  }, [qId]);

  if (!quiz) return createPortal(
    <div className="modern-overlay">
       <div className="modern-loader">
          <Loader2 className="spin" size={32} />
          <span>Synchronizing Node...</span>
       </div>
    </div>, document.body
  );

  const set = (k: string, v: any) => setQuiz((q: any) => ({ ...q, [k]: v }));

  const save = async () => {
    if (!quiz.quizType) { toast.error('Please select a quiz type (OBJ/Theory)'); return; }
    if (!quiz.category?.cid) { toast.error('Please associate this with a course'); return; }

    setSaving(true);
    try {
      await updateQuiz(quiz);
      toast.success('Protocol state synchronized');
      onSave(); onClose();
    } catch { toast.error('Sync failure'); }
    setSaving(false);
  };

  const ToggleNode = ({ label, k, icon: Icon, desc }: { label: string; k: string; icon: any; desc: string }) => (
    <div className={`minia-switch-item ${quiz[k] ? 'active' : ''}`} onClick={() => set(k, !quiz[k])}>
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

  return createPortal(
    <div className="modern-overlay">
       <div className="modern-modal animate-scale-in" style={{ width: 1000, maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
          <div className="modal-head" style={{ flexShrink: 0 }}>
             <div className="h-title">
                <div className="h-ico"><Settings size={16} /></div>
                <span>Quiz Settings - {quiz.title}</span>
             </div>
             <button className="h-close" onClick={onClose}><X size={16} /></button>
          </div>
          <div className="modal-body minia-app-container-modal" style={{ overflowY: 'auto', padding: '24px', flex: 1, backgroundColor: '#f4f5f7' }}>
            <div className="row g-4 m-0">
              <div className="col-xl-8">
                {/* Identity Card */}
                <div className="minia-card-standout standout-identity mb-4">
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
                           <select className="minia-field" required value={quiz.category?.cid || ''} onChange={e=>set('category',{cid:e.target.value})}>
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
                <div className="minia-card-standout standout-parameters mb-4">
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
                      <div className="col-3">
                        <label className="minia-form-label text-center" style={{ fontSize: '11px' }}>Max Violiation Limit</label>
                        <input className="minia-field text-center px-1" type="number" value={quiz.maxViolations} onChange={e=>set('maxViolations',e.target.value)}/>
                      </div>
                      <div className="col-3">
                        <label className="minia-form-label text-center" style={{ fontSize: '11px' }}>Delay</label>
                        <input className="minia-field text-center px-1" type="number" value={quiz.violationDelaySeconds ?? ''} onChange={e=>set('violationDelaySeconds',Number(e.target.value))}/>
                      </div>
                      <div className="col-3">
                        <label className="minia-form-label text-center" style={{ fontSize: '11px' }}>Delay Multiplier</label>
                        <input className="minia-field text-center px-1" type="number" step="0.1" value={quiz.delayMultiplier ?? ''} onChange={e=>set('delayMultiplier',Number(e.target.value))}/>
                      </div>
                      <div className="col-3">
                        <label className="minia-form-label text-center" style={{ fontSize: '11px' }}>Auto Submit Count Downdown</label>
                        <input className="minia-field text-center px-1" type="number" value={quiz.autoSubmitCountdownSeconds} onChange={e=>set('autoSubmitCountdownSeconds',e.target.value)}/>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-foot" style={{ flexShrink: 0 }}>
            <button className="btn-sec" onClick={onClose}>Discard</button>
            <button className="btn-pri" onClick={save} disabled={saving}>
              {saving ? 'Syncing...' : 'Save Configuration'}
            </button>
          </div>
       </div>
    </div>, document.body
  );
}

export default function ViewQuizzes() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: rawQuizzes, isLoading } = useQuery({ queryKey: ['quizzes'], queryFn: loadQuizzes });
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: getCategories });

  const [editQuizId, setEditQuizId] = useState<number | null>(null);
  const [statusMap, setStatusMap] = useState<Record<number, string>>({});
  const [updatingMap, setUpdatingMap] = useState<Record<number, boolean>>({});

  const handleStatusChange = (id: number, newStatus: string) => {
    setStatusMap(prev => ({ ...prev, [id]: newStatus }));
  };

  const quizzes = Array.isArray(rawQuizzes) ? rawQuizzes : (rawQuizzes?.quizzes || []);

  const doDelete = (qId: number) => {
    Swal.fire({
      title: 'Purge Assessment?', text: "Permanent decommission of this node.",
      icon: 'warning', showCancelButton: true, confirmButtonColor: '#6366f1', confirmButtonText: 'Yes, Purge'
    }).then(r => {
      if (r.isConfirmed) {
        deleteQuiz(qId).then(() => { toast.success('Node purged'); qc.invalidateQueries({ queryKey: ['quizzes'] }); });
      }
    });
  };

  const doUpdateStatus = (q: any) => {
    const sel = statusMap[q.qId] ?? q.status;
    setUpdatingMap(m => ({ ...m, [q.qId]: true }));
    updateQuizStatus(q.qId, sel).then(() => {
      toast.success('Registry Updated');
      qc.invalidateQueries({ queryKey: ['quizzes'] });
    }).finally(() => setUpdatingMap(m => ({ ...m, [q.qId]: false })));
  };

  return (
    <div className="modern-registry animate-fade-in">
      <Toaster position="top-right" />
      <PageHeader title="Assessment Registry" breadcrumbs={['Admin', 'Command', 'Registry']} />

      <div className="reg-top-bar">
         <div className="t-info">
            <h1 className="t-title">Assessment Nodes</h1>
            <p className="t-sub">{quizzes.length} protocols currently established.</p>
         </div>
         <button className="btn-add" onClick={() => navigate('/admin/add-quiz')}>
            <Plus size={18} /> <span>Initialize Node</span>
         </button>
      </div>

      {isLoading ? (
        <div className="reg-loading"><Loader2 className="spin" size={40} /></div>
      ) : quizzes.length === 0 ? (
        <div className="reg-empty">
           <LayoutGrid size={64} />
           <h3>Registry Empty</h3>
           <p>No active assessment nodes found.</p>
        </div>
      ) : (
        <div className="reg-grid-modern">
          {quizzes.map((q: any) => (
            <AssessmentCard
              key={q.qId}
              qId={q.qId}
              title={q.title}
              quizType={q.quizType}
              status={q.status}
              category={q.category}
              numberOfQuestions={q.numberOfQuestions}
              maxMarks={q.maxMarks}
              quizTime={q.quizTime}
              onEdit={setEditQuizId}
              onDelete={doDelete}
              selectedStatus={statusMap[q.qId] ?? q.status}
              onStatusChange={handleStatusChange}
              onSync={() => doUpdateStatus(q)}
              updating={!!updatingMap[q.qId]}
            />
          ))}
        </div>
      )}

      {editQuizId !== null && (
        <QuizEditModal qId={editQuizId} categories={categories} onClose={() => setEditQuizId(null)} onSave={() => qc.invalidateQueries({ queryKey: ['quizzes'] })} />
      )}

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@700;800;900&family=JetBrains+Mono:wght@500;600&display=swap');
        .modern-registry { padding: 40px 0 80px; font-family: 'Inter', sans-serif; background: #fafafa; min-height: 100vh; }
        .reg-top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 48px; padding: 0 40px; }
        .t-title { font-family: 'Outfit', sans-serif; font-size: 36px; font-weight: 800; color: #111827; margin: 0 0 8px 0; letter-spacing: -0.02em; }
        .t-sub { font-size: 15px; color: #6b7280; font-weight: 400; margin: 0; }
        .btn-add { height: 44px; padding: 0 20px; background: #111827; color: #fff; border: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
        .btn-add:hover { transform: translateY(-2px); background: #374151; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }
        .reg-grid-modern { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 24px; padding: 0 40px; }
        .reg-loading, .reg-empty { padding: 100px 0; text-align: center; }
        .reg-loading { color: #111827; }
        .reg-empty h3 { margin: 20px 0 10px; color: #111827; font-weight: 700; font-size: 20px; }
        .reg-empty p { font-size: 15px; color: #6b7280; }
        .modern-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.3); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 99999; }
        .modern-modal { background: #fff; border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); overflow: hidden; border: 1px solid #eaeaea; }
        .modal-head { padding: 20px 24px; border-bottom: 1px solid #eaeaea; display: flex; justify-content: space-between; align-items: center; background: #fafafa; }
        .h-title { display: flex; align-items: center; gap: 8px; font-weight: 600; color: #111827; font-size: 15px; }
        .modal-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
        .modal-foot { padding: 20px 24px; background: #fafafa; border-top: 1px solid #eaeaea; display: flex; justify-content: flex-end; gap: 12px; }
        .btn-sec { background: none; border: none; font-size: 14px; font-weight: 600; color: #6b7280; cursor: pointer; transition: color 0.2s; }
        .btn-sec:hover { color: #111827; }
        .btn-pri { height: 40px; padding: 0 20px; background: #111827; color: #fff; border: none; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s ease; }
        .btn-pri:hover { background: #374151; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 768px) {
          .reg-top-bar { flex-direction: column; align-items: flex-start; gap: 16px; padding: 0 16px; }
          .t-title { font-size: 24px; }
          .btn-add { width: 100%; justify-content: center; }
          .reg-grid-modern { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; padding: 0 16px; }
          .modern-modal { width: 95vw !important; max-width: none !important; }
        }

        /* Modal specific form styles */
        .minia-card-standout {
          background: #fff; border-radius: 12px; border: 1px solid #e2e8f0;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
          overflow: hidden;
          transition: all 0.3s ease;
        }
        .minia-card-standout:hover { box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.1); }
        .minia-card-header-distinct {
           padding: 1.25rem 1.5rem; border-bottom: 1px solid #f1f5f9; position: relative;
        }
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
        .minia-field:focus { border-color: #5156be; outline: 0; box-shadow: 0 0 0 4px rgba(81, 86, 190, 0.1); }
        .minia-tax-btn {
          flex: 1; padding: 0.75rem; border-radius: 8px; border: 1px solid #e2e8f0;
          background: #fff; display: flex; align-items: center; justify-content: center;
          gap: 10px; font-size: 13px; font-weight: 700; color: #64748b; transition: 0.3s; cursor: pointer;
        }
        .minia-tax-btn.active { background: #1e293b; border-color: #1e293b; color: #fff; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .minia-eye-btn { position: absolute; right: 12px; background: none; border: none; color: #94a3b8; cursor: pointer; }
        .minia-switch-item {
          padding: 12px; border-radius: 10px; display: flex; align-items: center; gap: 12px;
          cursor: pointer; transition: 0.2s; margin-bottom: 8px; border: 1px solid transparent;
        }
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
        .minia-deployment-card-distinct { padding: 1.75rem; border: 2px dashed #e2e8f0; border-radius: 12px; cursor: pointer; transition: 0.3s; }
        .minia-deployment-card-distinct.active { border-color: #2ab57d; background: #ecfdf5; border-style: solid; box-shadow: 0 10px 20px -5px rgba(42, 181, 125, 0.1); }
        .status-badge-distinct { width: 44px; height: 44px; border-radius: 12px; background: #f1f5f9; color: #94a3b8; display: flex; align-items: center; justify-content: center; transition: 0.3s; }
        .minia-deployment-card-distinct.active .status-badge-distinct { background: #2ab57d; color: #fff; }
        .minia-theory-notice { padding: 12px 16px; background: #eff6ff; border: 1px solid #dbeafe; border-radius: 10px; display: flex; align-items: center; gap: 10px; color: #1d4ed8; font-size: 12px; font-weight: 600; }
        `}</style>
    </div>
  );
}
