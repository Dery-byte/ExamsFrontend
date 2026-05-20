import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCategories, addQuiz } from '../../api/endpoints';
import toast, { Toaster } from 'react-hot-toast';
import {
  ShieldAlert, Zap, Eye, EyeOff, Save, Calendar, Clock, Layers,
  CheckCircle, ShieldCheck, Monitor, Smartphone, List, FileText,
  Loader2, ArrowLeft, Terminal, Award, Key, Timer, LayoutGrid,
  ShieldEllipsis, ChevronRight, Tag, Hash, Info, Activity, BookOpen
} from 'lucide-react';

const VIOLATION_OPTIONS = [
  { v: 'NONE', l: 'No Restrictions' },
  { v: 'DELAY_ONLY', l: 'Temporary Lock' },
  { v: 'AUTOSUBMIT_ONLY', l: 'Auto Submit' },
  { v: 'DELAY_AND_AUTOSUBMIT', l: 'Lock + Auto Submit' },
];

const defaultQuiz = () => ({
  title: '', description: '', maxMarks: '', numberOfQuestions: '', quizpassword: '', quizTime: '',
  startTime: '', quizDate: '', attempted: false, active: true, category: { cid: '' }, quizType: '',
  violationAction: 'NONE', violationDelaySeconds: 0, autoSubmitCountdownSeconds: 5, maxViolations: 3,
  delayMultiplier: 1.5, enableFullscreenLock: true, enableWatermark: true,
  enableScreenshotBlocking: true, enableDevToolsBlocking: true,
});

export default function AddQuiz({ lectMode = false }: { lectMode?: boolean }) {
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(defaultQuiz());
  const [hide, setHide] = useState(true);
  const [loading, setLoading] = useState(false);
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: getCategories });
  const roleName = lectMode ? 'Lecturer' : 'Admin';
  const backPath = lectMode ? '/lect/quizes' : '/admin/quizzes';

  const set = (k: string, v: any) => setQuiz(q => ({ ...q, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quiz.quizType) { toast.error('Please select a quiz type'); return; }
    if (!quiz.category.cid) { toast.error('Please select a category'); return; }
    setLoading(true);
    try {
      await addQuiz(quiz);
      toast.success('Assessment created successfully!');
      setTimeout(() => navigate(backPath), 1200);
    } catch { toast.error('Failed to create assessment'); }
    finally { setLoading(false); }
  };

  const Toggle = ({ label, k, icon: Icon, desc }: { label: string; k: string; icon: any; desc: string }) => {
    const on = (quiz as any)[k];
    return (
      <div className={`aq-toggle ${on ? 'on' : ''}`} onClick={() => set(k, !on)}>
        <div className="aq-toggle-icon"><Icon size={15} /></div>
        <div className="aq-toggle-info">
          <span className="aq-toggle-label">{label}</span>
          <span className="aq-toggle-desc">{desc}</span>
        </div>
        <div className="aq-switch"><div className="aq-thumb" /></div>
      </div>
    );
  };

  return (
    <div className="aq-page">
      <Toaster position="top-right" />

      {/* Top Bar */}
      <div className="aq-topbar">
        <button className="aq-back-btn" onClick={() => navigate(backPath)}>
          <ArrowLeft size={15} /><span>Back</span>
        </button>
        <div className="aq-breadcrumb">
          <span>{roleName} Portal</span><ChevronRight size={12} /><span>Assessments</span><ChevronRight size={12} /><span className="active">New Quiz</span>
        </div>
      </div>

      <div className="aq-layout">
        {/* ── Main Form ── */}
        <div className="aq-main">
          <form onSubmit={handleSubmit}>

            {/* Section: Identity */}
            <div className="aq-section aq-section-blue">
              <div className="aq-section-head">
                <div className="aq-section-icon blue"><BookOpen size={18} /></div>
                <div>
                  <h6 className="aq-section-title">Assessment Identity</h6>
                  <p className="aq-section-sub">Basic information about the quiz</p>
                </div>
              </div>
              <div className="aq-grid-2-1">
                <div className="aq-field">
                  <label className="aq-label">Quiz Title</label>
                  <div className="aq-iw">
                    <span className="aq-ii"><Tag size={15} /></span>
                    <input className="aq-input" required value={quiz.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Mid-Semester Examination" />
                  </div>
                </div>
                <div className="aq-field">
                  <label className="aq-label">Course Category</label>
                  <div className="aq-iw">
                    <span className="aq-ii"><Layers size={15} /></span>
                    <select className="aq-input" required value={quiz.category.cid} onChange={e => set('category', { cid: e.target.value })}>
                      <option value="">Select category...</option>
                      {(categories as any[]).map((c: any) => <option key={c.cid} value={c.cid}>{c.title}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="aq-field mt-4">
                <label className="aq-label">Instructions & Guidelines</label>
                <textarea className="aq-input aq-textarea" rows={3} value={quiz.description} onChange={e => set('description', e.target.value)} placeholder="Provide student instructions and syllabus guidelines..." />
              </div>
            </div>

            {/* Section: Parameters */}
            <div className="aq-section aq-section-green">
              <div className="aq-section-head">
                <div className="aq-section-icon green"><Activity size={18} /></div>
                <div>
                  <h6 className="aq-section-title">Assessment Parameters</h6>
                  <p className="aq-section-sub">Quiz type, scoring, schedule and access</p>
                </div>
              </div>

              {/* Taxonomy */}
              <div className="aq-field mb-4">
                <label className="aq-label">Quiz Type</label>
                <div className="aq-type-row">
                  {[
                    { id: 'OBJ', label: 'Objectives', icon: List },
                    { id: 'THEORY', label: 'Theory', icon: FileText },
                    { id: 'BOTH', label: 'Combined', icon: LayoutGrid }
                  ].map(t => (
                    <button key={t.id} type="button"
                      className={`aq-type-btn ${quiz.quizType === t.id ? 'active' : ''}`}
                      onClick={() => set('quizType', t.id)}>
                      <t.icon size={16} /><span>{t.label}</span>
                    </button>
                  ))}
                </div>
                {quiz.quizType === 'THEORY' && (
                  <div className="aq-notice">
                    <Info size={14} />
                    <span>Theory mode: marking is done manually via the Assessment Panel.</span>
                  </div>
                )}
              </div>

              {/* Metrics */}
              <div className="aq-grid-3 mb-4">
                <div className="aq-field">
                  <label className="aq-label">Max Marks</label>
                  <div className="aq-iw">
                    <span className="aq-ii"><Award size={15} /></span>
                    <input className="aq-input text-center" type="number" required value={quiz.maxMarks} onChange={e => set('maxMarks', e.target.value)} placeholder="100" />
                  </div>
                </div>
                <div className="aq-field">
                  <label className="aq-label">No. of Questions</label>
                  <div className="aq-iw">
                    <span className="aq-ii"><Hash size={15} /></span>
                    <input className="aq-input text-center" type="number" required value={quiz.numberOfQuestions} onChange={e => set('numberOfQuestions', e.target.value)} placeholder="40" />
                  </div>
                </div>
                <div className="aq-field">
                  <label className="aq-label">Duration (mins)</label>
                  <div className="aq-iw">
                    <span className="aq-ii"><Timer size={15} /></span>
                    <input className="aq-input text-center" type="number" required value={quiz.quizTime} onChange={e => set('quizTime', e.target.value)} placeholder="60" />
                  </div>
                </div>
              </div>

              {/* Schedule + Passkey */}
              <div className="aq-grid-3">
                <div className="aq-field">
                  <label className="aq-label">Date</label>
                  <div className="aq-iw">
                    <span className="aq-ii"><Calendar size={15} /></span>
                    <input className="aq-input" type="date" required value={quiz.quizDate} onChange={e => set('quizDate', e.target.value)} />
                  </div>
                </div>
                <div className="aq-field">
                  <label className="aq-label">Start Time</label>
                  <div className="aq-iw">
                    <span className="aq-ii"><Clock size={15} /></span>
                    <input className="aq-input" type="time" required value={quiz.startTime} onChange={e => set('startTime', e.target.value)} />
                  </div>
                </div>
                <div className="aq-field">
                  <label className="aq-label">Passkey</label>
                  <div className="aq-iw">
                    <span className="aq-ii"><Key size={15} /></span>
                    <input className="aq-input" style={{ paddingRight: '42px' }} type={hide ? 'password' : 'text'} value={quiz.quizpassword} onChange={e => set('quizpassword', e.target.value)} placeholder="TOKEN" />
                    <button type="button" className="aq-eye" onClick={() => setHide(!hide)}>{hide ? <Eye size={15} /> : <EyeOff size={15} />}</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="aq-footer">
              <button type="button" className="aq-btn-ghost" onClick={() => navigate(backPath)}>Cancel</button>
              <button type="submit" className="aq-btn-primary" disabled={loading}>
                {loading ? <Loader2 className="aq-spin" size={17} /> : <ShieldEllipsis size={17} />}
                <span>{loading ? 'Creating...' : 'Create Assessment'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* ── Sidebar ── */}
        <div className="aq-sidebar">
          {/* Deployment */}
          <div className="aq-sidebar-card aq-card-deploy">
            <div className="aq-sidebar-head">
              <div className="aq-section-icon amber"><Zap size={16} /></div>
              <h6 className="aq-sidebar-title">Deployment</h6>
            </div>
            <div className={`aq-deploy-toggle ${quiz.active ? 'live' : 'draft'}`} onClick={() => set('active', !quiz.active)}>
              <div className="aq-deploy-icon">
                {quiz.active ? <CheckCircle size={20} /> : <Save size={20} />}
              </div>
              <div>
                <p className="aq-deploy-status">{quiz.active ? 'LIVE' : 'DRAFT'}</p>
                <p className="aq-deploy-hint">{quiz.active ? 'Visible to students' : 'Private – not published'}</p>
              </div>
            </div>
          </div>

          {/* Integrity Controls */}
          <div className="aq-sidebar-card aq-card-security">
            <div className="aq-sidebar-head">
              <div className="aq-section-icon purple"><ShieldCheck size={16} /></div>
              <h6 className="aq-sidebar-title">Integrity Controls</h6>
            </div>
            <Toggle label="Focus Lock" k="enableFullscreenLock" icon={Monitor} desc="Restrict window switches" />
            <Toggle label="Watermark" k="enableWatermark" icon={Layers} desc="Visible student ID overlay" />
            <Toggle label="Media Shield" k="enableScreenshotBlocking" icon={Smartphone} desc="Block screen captures" />
            <Toggle label="DevTools Block" k="enableDevToolsBlocking" icon={Terminal} desc="Disable browser console" />
          </div>

          {/* Breach Policy */}
          <div className="aq-sidebar-card aq-card-danger">
            <div className="aq-sidebar-head">
              <div className="aq-section-icon red"><ShieldAlert size={16} /></div>
              <h6 className="aq-sidebar-title" style={{ color: '#dc2626' }}>Breach Policy</h6>
            </div>
            <div className="aq-field mb-3">
              <label className="aq-label">Auto Penalty</label>
              <select className="aq-input aq-input-sm" value={quiz.violationAction} onChange={e => set('violationAction', e.target.value)}>
                {VIOLATION_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '12px' }}>
              <div className="aq-field">
                <label className="aq-label">Max Violations</label>
                <input className="aq-input aq-input-sm text-center" type="number" min="1" value={quiz.maxViolations} onChange={e => set('maxViolations', Number(e.target.value))} />
              </div>
              <div className="aq-field">
                <label className="aq-label">Delay (s)</label>
                <input className="aq-input aq-input-sm text-center" type="number" min="0" placeholder="e.g. 30" value={quiz.violationDelaySeconds || ''} onChange={e => set('violationDelaySeconds', Number(e.target.value))} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="aq-field">
                <label className="aq-label">Multiplier</label>
                <input className="aq-input aq-input-sm text-center" type="number" step="0.1" min="1" value={quiz.delayMultiplier} onChange={e => set('delayMultiplier', Number(e.target.value))} />
              </div>
              <div className="aq-field">
                <label className="aq-label">Auto (s)</label>
                <input className="aq-input aq-input-sm text-center" type="number" min="0" value={quiz.autoSubmitCountdownSeconds} onChange={e => set('autoSubmitCountdownSeconds', Number(e.target.value))} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        .aq-page { min-height:100vh; background:#f0f2f8; font-family:'Inter',sans-serif; display:flex; flex-direction:column; color:#1e293b; }

        .aq-topbar { display:flex; align-items:center; justify-content:space-between; padding:13px 28px; background:#fff; border-bottom:1px solid #e8eaf0; position:sticky; top:0; z-index:50; }
        .aq-back-btn { display:flex; align-items:center; gap:7px; background:none; border:1px solid #e2e8f0; border-radius:8px; padding:8px 14px; font-size:13px; font-weight:600; color:#64748b; cursor:pointer; transition:.2s; }
        .aq-back-btn:hover { background:#f8fafc; color:#5156be; border-color:#5156be; }
        .aq-breadcrumb { display:flex; align-items:center; gap:6px; font-size:12px; color:#94a3b8; font-weight:500; }
        .aq-breadcrumb .active { color:#5156be; font-weight:700; }

        .aq-layout { display:grid; grid-template-columns:1fr 320px; gap:24px; padding:28px; flex:1; align-items:start; }

        /* Sections */
        .aq-section { background:#fff; border-radius:16px; border:1px solid #e2e8f0; box-shadow:0 4px 20px -4px rgba(0,0,0,0.06); margin-bottom:20px; overflow:hidden; }
        .aq-section-blue { border-left:4px solid #5156be; }
        .aq-section-green { border-left:4px solid #10b981; }
        .aq-section-head { display:flex; align-items:center; gap:14px; padding:20px 24px; border-bottom:1px solid #f1f5f9; background:linear-gradient(135deg,#fafbff,#f8fafc); }
        .aq-section-title { font-size:15px; font-weight:800; color:#1e293b; margin:0 0 2px 0; }
        .aq-section-sub { font-size:12px; color:#94a3b8; margin:0; font-weight:500; }

        .aq-section > div:not(.aq-section-head) { padding:24px; }
        .aq-section > .aq-field { padding:24px; }

        /* Section icons */
        .aq-section-icon { width:38px; height:38px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .aq-section-icon.blue { background:#eef2ff; color:#5156be; }
        .aq-section-icon.green { background:#ecfdf5; color:#10b981; }
        .aq-section-icon.amber { background:#fffbeb; color:#f59e0b; }
        .aq-section-icon.purple { background:#f5f3ff; color:#7c3aed; }
        .aq-section-icon.red { background:#fef2f2; color:#dc2626; }

        /* Sidebar */
        .aq-sidebar { display:flex; flex-direction:column; gap:16px; }
        .aq-sidebar-card { background:#fff; border-radius:16px; border:1px solid #e2e8f0; padding:20px; box-shadow:0 4px 20px -4px rgba(0,0,0,0.06); }
        .aq-card-security { border-left:4px solid #7c3aed; }
        .aq-card-deploy { border-left:4px solid #f59e0b; }
        .aq-card-danger { border-left:4px solid #dc2626; }
        .aq-sidebar-head { display:flex; align-items:center; gap:10px; margin-bottom:16px; }
        .aq-sidebar-title { font-size:14px; font-weight:800; color:#1e293b; margin:0; }

        /* Deployment toggle */
        .aq-deploy-toggle { display:flex; align-items:center; gap:14px; padding:16px; border-radius:12px; border:2px dashed #e2e8f0; cursor:pointer; transition:.3s; }
        .aq-deploy-toggle.live { border-style:solid; border-color:#10b981; background:#f0fdf4; }
        .aq-deploy-icon { width:44px; height:44px; border-radius:12px; background:#f1f5f9; color:#94a3b8; display:flex; align-items:center; justify-content:center; transition:.3s; flex-shrink:0; }
        .aq-deploy-toggle.live .aq-deploy-icon { background:#10b981; color:#fff; }
        .aq-deploy-status { font-size:14px; font-weight:800; color:#1e293b; margin:0 0 2px 0; }
        .aq-deploy-hint { font-size:11px; color:#94a3b8; margin:0; font-weight:500; }

        /* Toggles */
        .aq-toggle { display:flex; align-items:center; gap:12px; padding:10px; border-radius:10px; cursor:pointer; border:1px solid transparent; transition:.2s; margin-bottom:6px; }
        .aq-toggle:hover { background:#f8fafc; }
        .aq-toggle.on { background:rgba(124,58,237,0.04); }
        .aq-toggle-icon { width:32px; height:32px; border-radius:8px; background:#f1f5f9; color:#94a3b8; display:flex; align-items:center; justify-content:center; transition:.2s; flex-shrink:0; }
        .aq-toggle.on .aq-toggle-icon { background:#7c3aed; color:#fff; }
        .aq-toggle-info { flex:1; }
        .aq-toggle-label { display:block; font-size:13px; font-weight:700; color:#334155; }
        .aq-toggle-desc { display:block; font-size:10px; color:#94a3b8; }
        .aq-switch { width:34px; height:18px; border-radius:20px; background:#e2e8f0; position:relative; transition:.3s; flex-shrink:0; }
        .aq-toggle.on .aq-switch { background:#7c3aed; }
        .aq-thumb { width:13px; height:13px; border-radius:50%; background:#fff; position:absolute; top:2.5px; left:2.5px; transition:.3s; box-shadow:0 1px 3px rgba(0,0,0,0.2); }
        .aq-toggle.on .aq-thumb { left:18px; }

        /* Form Elements */
        .aq-field { display:flex; flex-direction:column; gap:7px; }
        .aq-label { font-size:10.5px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:.06em; }
        .aq-iw { position:relative; display:flex; align-items:center; }
        .aq-ii { position:absolute; left:13px; color:#94a3b8; pointer-events:none; z-index:1; transition:.2s; }
        .aq-input { width:100%; padding:11px 14px 11px 40px; font-size:14px; font-weight:500; color:#1e293b; background:#f8fafc; border:1.5px solid #e2e8f0; border-radius:10px; transition:all .2s; outline:none; font-family:'Inter',sans-serif; }
        .aq-input:hover { border-color:#c7d2fe; background:#f5f7ff; }
        .aq-input:focus { border-color:#5156be; background:#fff; box-shadow:0 0 0 4px rgba(81,86,190,.1); }
        .aq-iw:focus-within .aq-ii { color:#5156be; }
        .aq-textarea { padding:12px 14px; resize:none; line-height:1.6; }
        .aq-input-sm { padding:9px 10px 9px 36px; font-size:13px; border-radius:8px; }
        .aq-eye { position:absolute; right:12px; background:none; border:none; color:#94a3b8; cursor:pointer; display:flex; align-items:center; }
        .aq-eye:hover { color:#5156be; }

        /* Type Buttons */
        .aq-type-row { display:flex; gap:10px; margin-bottom:12px; }
        .aq-type-btn { flex:1; padding:11px 8px; border-radius:10px; border:1.5px solid #e2e8f0; background:#fff; display:flex; align-items:center; justify-content:center; gap:8px; font-size:13px; font-weight:700; color:#64748b; cursor:pointer; transition:.25s; }
        .aq-type-btn.active { background:#1e293b; border-color:#1e293b; color:#fff; transform:translateY(-2px); box-shadow:0 6px 16px rgba(0,0,0,0.12); }
        .aq-type-btn:hover:not(.active) { background:#f5f7ff; border-color:#c7d2fe; color:#5156be; }

        /* Notice */
        .aq-notice { display:flex; align-items:center; gap:10px; padding:10px 14px; background:#eff6ff; border:1px solid #dbeafe; border-radius:9px; color:#1d4ed8; font-size:12px; font-weight:600; margin-top:8px; }

        /* Grids */
        .aq-grid-2-1 { display:grid; grid-template-columns:2fr 1fr; gap:16px; padding:24px; }
        .aq-grid-3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; }
        .aq-section .aq-grid-3 { padding:0 24px 24px; }
        .aq-grid-3:last-child:not(.aq-section .aq-grid-3) { padding:0; }
        .mt-4 { margin-top:16px; }
        .mb-4 { margin-bottom:16px; }
        .mb-3 { margin-bottom:12px; }
        .text-center { text-align:center; }

        /* Footer */
        .aq-footer { display:flex; justify-content:flex-end; gap:12px; padding:24px 0 12px; }
        .aq-btn-primary { display:flex; align-items:center; gap:8px; background:linear-gradient(135deg,#5156be,#7c3aed); color:#fff; border:none; padding:13px 28px; border-radius:11px; font-size:14px; font-weight:700; cursor:pointer; transition:.3s; box-shadow:0 6px 20px -4px rgba(81,86,190,.5); font-family:'Inter',sans-serif; }
        .aq-btn-primary:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 10px 28px -4px rgba(81,86,190,.55); }
        .aq-btn-primary:disabled { opacity:.6; cursor:not-allowed; }
        .aq-btn-ghost { display:flex; align-items:center; gap:8px; background:#fff; border:1.5px solid #e2e8f0; color:#64748b; padding:13px 24px; border-radius:11px; font-size:14px; font-weight:700; cursor:pointer; transition:.2s; font-family:'Inter',sans-serif; }
        .aq-btn-ghost:hover { background:#f8fafc; color:#1e293b; border-color:#cbd5e1; }
        .aq-spin { animation:aqSpin 1s linear infinite; }
        @keyframes aqSpin { to { transform:rotate(360deg); } }

        /* Responsive */
        @media (max-width:1100px) {
          .aq-layout { grid-template-columns:1fr; }
          .aq-sidebar { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
          .aq-card-danger { grid-column:span 2; }
        }
        @media (max-width:768px) {
          .aq-layout { padding:16px; gap:16px; }
          .aq-grid-2-1 { grid-template-columns:1fr; }
          .aq-grid-3 { grid-template-columns:1fr 1fr; }
          .aq-sidebar { grid-template-columns:1fr; }
          .aq-card-danger { grid-column:span 1; }
          .aq-type-row { flex-wrap:wrap; }
          .aq-footer { flex-direction:column-reverse; }
          .aq-btn-primary, .aq-btn-ghost { width:100%; justify-content:center; }
          .aq-topbar { padding:10px 16px; }
          .aq-breadcrumb { display:none; }
        }
        @media (max-width:480px) {
          .aq-grid-3 { grid-template-columns:1fr; }
          .aq-section-head { padding:16px; }
          .aq-grid-2-1, .aq-section .aq-grid-3 { padding:16px; }
        }
      `}</style>
    </div>
  );
}
