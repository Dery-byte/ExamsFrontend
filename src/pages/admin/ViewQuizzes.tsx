import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { loadQuizzes, getCategories, getQuiz, updateQuiz, deleteQuiz, updateQuizStatus, getAvailableLlmProviders } from '../../api/endpoints';
import Swal from 'sweetalert2';
import toast, { Toaster } from 'react-hot-toast';
import PageHeader from '../../components/PageHeader';
import AssessmentCard from '../../components/ui/AssessmentCard';
import {
  Plus, Loader2, LayoutGrid, Settings, X,
  ShieldAlert, Zap, Eye, EyeOff, Save, Calendar, Clock,
  BookOpen, Layers, CheckCircle, ShieldCheck, Monitor,
  Smartphone, List, FileText, Terminal, Award,
  Activity, Key, Timer, Tag, Hash, Info, Bot
} from 'lucide-react';

const VIOLATION_OPTIONS = [
  { v: 'NONE',                 l: 'No Restrictions' },
  { v: 'DELAY_ONLY',           l: 'Temporary Lock' },
  { v: 'AUTOSUBMIT_ONLY',      l: 'Auto Submit' },
  { v: 'DELAY_AND_AUTOSUBMIT', l: 'Lock + Auto Submit' },
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

  const { data: providersData } = useQuery({
    queryKey: ['llmProviders'],
    queryFn: getAvailableLlmProviders,
    retry: 1,
  });

  const FALLBACK_PROVIDERS = [
    { id: 'GPT',      displayName: 'OpenAI GPT',       description: 'GPT-3.5-Turbo / GPT-4 — Default evaluator', available: true },
    { id: 'GEMINI',   displayName: 'Google Gemini',    description: 'Gemini 1.5 Flash — Google AI evaluator',      available: true },
    { id: 'DEEPSEEK', displayName: 'DeepSeek',         description: 'DeepSeek Chat — Cost-effective evaluator',    available: true },
    { id: 'CLAUDE',   displayName: 'Anthropic Claude', description: 'Claude 3 Haiku — Requires Claude API key',    available: false },
  ];
  const llmProviders: any[] = (providersData?.providers?.length > 0)
    ? providersData.providers
    : FALLBACK_PROVIDERS;

  if (!quiz) return createPortal(
    <div className="qe-overlay">
      <div className="qe-loader">
        <Loader2 className="qe-spin" size={32} />
        <span>Loading quiz data...</span>
      </div>
    </div>,
    document.body
  );

  const set = (k: string, v: any) => setQuiz((q: any) => ({ ...q, [k]: v }));

  const save = async () => {
    if (!quiz.quizType)    { toast.error('Please select a quiz type'); return; }
    if (!quiz.category?.cid) { toast.error('Please select a course category'); return; }
    setSaving(true);
    try {
      await updateQuiz(quiz);
      toast.success('Quiz settings saved successfully');
      onSave(); onClose();
    } catch { toast.error('Failed to save settings'); }
    setSaving(false);
  };

  const Toggle = ({ label, k, icon: Icon, desc }: { label: string; k: string; icon: any; desc: string }) => {
    const on = quiz[k];
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

  return createPortal(
    <div className="qe-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="qe-modal animate-scale-in">

        {/* ── Header ── */}
        <div className="qe-header">
          <div className="qe-header-left">
            <div className="qe-header-icon"><Settings size={18} /></div>
            <div>
              <h5 className="qe-header-title">Quiz Settings</h5>
              <p className="qe-header-sub">{quiz.title}</p>
            </div>
          </div>
          <button className="qe-close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        {/* ── Body ── */}
        <div className="qe-body">
          <div className="qe-layout">

            {/* Main Column */}
            <div className="qe-main">

              {/* Identity Section */}
              <div className="aq-section aq-section-blue" style={{ marginBottom: 20 }}>
                <div className="aq-section-head">
                  <div className="aq-section-icon blue"><BookOpen size={18} /></div>
                  <div>
                    <h6 className="aq-section-title">Quiz Information</h6>
                    <p className="aq-section-sub">Basic information about this quiz</p>
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
                      <select className="aq-input" required value={quiz.category?.cid || ''} onChange={e => set('category', { cid: e.target.value })}>
                        <option value="">Select category...</option>
                        {categories.map((c: any) => <option key={c.cid} value={c.cid}>{c.title}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <div style={{ padding: '0 24px 24px' }}>
                  <div className="aq-field">
                    <label className="aq-label">Instructions &amp; Guidelines</label>
                    <textarea
                      className="aq-input aq-textarea"
                      rows={3}
                      value={quiz.description}
                      onChange={e => set('description', e.target.value)}
                      placeholder="Provide student instructions and syllabus guidelines..."
                    />
                  </div>
                </div>
              </div>

              {/* Parameters Section */}
              <div className="aq-section aq-section-green">
                <div className="aq-section-head">
                  <div className="aq-section-icon green"><Activity size={18} /></div>
                  <div>
                    <h6 className="aq-section-title">Quiz Parameters</h6>
                    <p className="aq-section-sub">Quiz type, scoring, schedule and access</p>
                  </div>
                </div>
                <div style={{ padding: '24px 24px 0' }}>

                  {/* Quiz Type */}
                  <div className="aq-field" style={{ marginBottom: 20 }}>
                    <label className="aq-label">Quiz Type</label>
                    <div className="aq-type-row">
                      {[
                        { id: 'OBJ',    label: 'Objectives', icon: List },
                        { id: 'THEORY', label: 'Theory',     icon: FileText },
                        { id: 'BOTH',   label: 'Combined',   icon: LayoutGrid },
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
                        <span>Theory mode: marking is done By AI and subsequently reviewed by Lecturer before release of results</span>
                        <span>When Adding question set the no. of questions to answer and duration.</span>

                      </div>
                    )}
                  </div>

                  {/* LLM Provider Selection — visible for Theory & Combined quiz types */}
                  {(quiz.quizType === 'THEORY' || quiz.quizType === 'BOTH') && (
                    <div className="aq-llm-card">
                      <div className="aq-llm-header">
                        <div className="aq-llm-icon"><Bot size={17} /></div>
                        <div>
                          <p className="aq-llm-title">AI Evaluator</p>
                          <p className="aq-llm-sub">Select the LLM model to grade subjective answers</p>
                        </div>
                      </div>
                      <div className="aq-llm-grid">
                        {llmProviders.map((p: any) => (
                          <button
                            key={p.id}
                            type="button"
                            disabled={!p.available}
                            onClick={() => p.available && set('llmProvider', p.id)}
                            className={`aq-llm-btn ${
                              (quiz.llmProvider || 'GPT') === p.id ? 'aq-llm-btn--active' : ''
                            } ${!p.available ? 'aq-llm-btn--disabled' : ''}`}
                          >
                            <span className="aq-llm-btn-name">{p.displayName}</span>
                            <span className="aq-llm-btn-desc">{p.description}</span>
                            {!p.available && <span className="aq-llm-badge">Key needed</span>}
                            {(quiz.llmProvider || 'GPT') === p.id && p.available && (
                              <span className="aq-llm-check">✓ Selected</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Metrics — hidden for Theory-only quizzes */}
                  {quiz.quizType !== 'THEORY' && (
                    <div className="aq-grid-3" style={{ marginBottom: 20 }}>
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
                  )}

                  {/* Schedule + Passkey */}
                  <div className="aq-grid-3" style={{ paddingBottom: 24 }}>
                    <div className="aq-field">
                      <label className="aq-label">Scheduled Date</label>
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
                      <label className="aq-label">Security Passkey</label>
                      <div className="aq-iw">
                        <span className="aq-ii"><Key size={15} /></span>
                        <input
                          className="aq-input"
                          style={{ paddingRight: 42 }}
                          type={hide ? 'password' : 'text'}
                          value={quiz.quizpassword}
                          onChange={e => set('quizpassword', e.target.value)}
                          placeholder="TOKEN"
                        />
                        <button type="button" className="aq-eye" onClick={() => setHide(!hide)}>
                          {hide ? <Eye size={15} /> : <EyeOff size={15} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar Column */}
            <div className="qe-sidebar">

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
                <Toggle label="Focus Lock"     k="enableFullscreenLock"     icon={Monitor}    desc="Restrict window switches" />
                <Toggle label="Watermark"      k="enableWatermark"          icon={Layers}     desc="Visible student ID overlay" />
                <Toggle label="Media Shield"   k="enableScreenshotBlocking" icon={Smartphone} desc="Block screen captures" />
                <Toggle label="DevTools Block" k="enableDevToolsBlocking"   icon={Terminal}   desc="Disable browser console" />
              </div>

              {/* Breach Policy */}
              <div className="aq-sidebar-card aq-card-danger">
                <div className="aq-sidebar-head">
                  <div className="aq-section-icon red"><ShieldAlert size={16} /></div>
                  <h6 className="aq-sidebar-title" style={{ color: '#dc2626' }}>Breach Policy</h6>
                </div>
                <div className="aq-field" style={{ marginBottom: 14 }}>
                  <label className="aq-label">Auto Penalty</label>
                  <select className="aq-input aq-input-sm" style={{ paddingLeft: 14 }} value={quiz.violationAction} onChange={e => set('violationAction', e.target.value)}>
                    {VIOLATION_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div className="aq-field">
                    <label className="aq-label">Max Violations</label>
                    <input className="aq-input aq-input-sm text-center" type="number" min="1" value={quiz.maxViolations} onChange={e => set('maxViolations', Number(e.target.value))} />
                  </div>
                  <div className="aq-field">
                    <label className="aq-label">Delay (s)</label>
                    <input className="aq-input aq-input-sm text-center" type="number" min="0" value={quiz.delaySeconds ?? ''} onChange={e => set('delaySeconds', Number(e.target.value))} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="aq-field">
                    <label className="aq-label">Multiplier</label>
                    <input className="aq-input aq-input-sm text-center" type="number" step="0.1" min="1" value={quiz.delayMultiplier ?? ''} onChange={e => set('delayMultiplier', Number(e.target.value))} />
                  </div>
                  <div className="aq-field">
                    <label className="aq-label">Auto Submit (s)</label>
                    <input className="aq-input aq-input-sm text-center" type="number" min="0" value={quiz.autoSubmitCountdownSeconds} onChange={e => set('autoSubmitCountdownSeconds', Number(e.target.value))} />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="qe-footer">
          <button className="aq-btn-ghost" onClick={onClose}>Discard</button>
          <button className="aq-btn-primary" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="aq-spin" size={16} /> : <Save size={16} />}
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
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
      title: 'Delete Quiz?', text: 'This action is permanent and cannot be undone.',
      icon: 'warning', showCancelButton: true, confirmButtonColor: '#6366f1', confirmButtonText: 'Yes, Delete'
    }).then(r => {
      if (r.isConfirmed) {
        deleteQuiz(qId).then(() => { toast.success('Quiz deleted'); qc.invalidateQueries({ queryKey: ['quizzes'] }); });
      }
    });
  };

  const doUpdateStatus = (q: any) => {
    const sel = statusMap[q.qId] ?? q.status;
    setUpdatingMap(m => ({ ...m, [q.qId]: true }));
    updateQuizStatus(q.qId, sel).then(() => {
      toast.success('Status updated');
      qc.invalidateQueries({ queryKey: ['quizzes'] });
    }).finally(() => setUpdatingMap(m => ({ ...m, [q.qId]: false })));
  };

  return (
    <div className="modern-registry animate-fade-in">
      <Toaster position="top-right" containerStyle={{ zIndex: 999999 }} />
      <PageHeader title="Quizzes" breadcrumbs={['Admin', 'Command', 'Registry']} />

      <div className="reg-top-bar">
        <div className="t-info">
          <h1 className="t-title">Quizzes</h1>
          <p className="t-sub">{quizzes.length} quizzes currently available.</p>
        </div>
        <button className="btn-add" onClick={() => navigate('/admin/add-quiz')}>
          <Plus size={18} /> <span>Add Quiz</span>
        </button>
      </div>

      {isLoading ? (
        <div className="reg-loading"><Loader2 className="spin" size={40} /></div>
      ) : quizzes.length === 0 ? (
        <div className="reg-empty">
          <LayoutGrid size={64} />
          <h3>Registry Empty</h3>
          <p>No active quizzes found.</p>
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
        <QuizEditModal
          qId={editQuizId}
          categories={categories}
          onClose={() => setEditQuizId(null)}
          onSave={() => qc.invalidateQueries({ queryKey: ['quizzes'] })}
        />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@700;800;900&display=swap');

        /* ── Page ── */
        .modern-registry { padding: 40px 0 80px; font-family: 'Inter', sans-serif; background: #fafafa; min-height: 100vh; }
        .animate-fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }

        .reg-top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; padding: 0 40px; gap: 16px; }
        .t-title { font-family: 'Outfit', sans-serif; font-size: 36px; font-weight: 800; color: #111827; margin: 0 0 6px; letter-spacing: -0.02em; }
        .t-sub { font-size: 14px; color: #6b7280; margin: 0; }

        .btn-add { height: 44px; padding: 0 20px; background: #111827; color: #fff; border: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); flex-shrink: 0; }
        .btn-add:hover { transform: translateY(-2px); background: #374151; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }

        .reg-grid-modern { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 24px; padding: 0 40px; }
        .reg-loading, .reg-empty { padding: 100px 0; text-align: center; color: #6b7280; }
        .reg-empty h3 { margin: 20px 0 8px; color: #111827; font-weight: 700; font-size: 20px; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Modal overlay ── */
        .qe-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 99999; padding: 16px; }
        .qe-loader { display: flex; flex-direction: column; align-items: center; gap: 14px; color: #fff; font-size: 14px; font-weight: 600; }
        .qe-spin { animation: spin 1s linear infinite; }

        /* ── Modal shell ── */
        .qe-modal {
          background: #f0f2f8;
          border-radius: 20px;
          box-shadow: 0 32px 64px -12px rgba(0,0,0,0.35);
          width: 100%;
          max-width: 1060px;
          max-height: 92vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          font-family: 'Inter', sans-serif;
        }
        .animate-scale-in { animation: scaleIn 0.22s cubic-bezier(0.34,1.56,0.64,1); }
        @keyframes scaleIn { from { opacity:0; transform:scale(0.94); } to { opacity:1; transform:scale(1); } }

        /* ── Modal header ── */
        .qe-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 28px;
          background: #fff;
          border-bottom: 1px solid #e8eaf0;
          flex-shrink: 0;
        }
        .qe-header-left { display: flex; align-items: center; gap: 14px; min-width: 0; }
        .qe-header-icon {
          width: 40px; height: 40px; border-radius: 11px;
          background: linear-gradient(135deg, #5156be, #7c3aed);
          color: #fff; display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; box-shadow: 0 4px 12px rgba(81,86,190,0.35);
        }
        .qe-header-title { font-size: 16px; font-weight: 800; color: #1e293b; margin: 0 0 2px; }
        .qe-header-sub { font-size: 12px; color: #94a3b8; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .qe-close-btn {
          width: 36px; height: 36px; border-radius: 10px; border: 1.5px solid #e2e8f0;
          background: #f8fafc; color: #64748b; display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: .2s; flex-shrink: 0;
        }
        .qe-close-btn:hover { background: #fef2f2; border-color: #fca5a5; color: #dc2626; }

        /* ── Modal body ── */
        .qe-body { flex: 1; overflow-y: auto; padding: 24px; }
        .qe-body::-webkit-scrollbar { width: 5px; }
        .qe-body::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 5px; }

        /* ── Two-column layout ── */
        .qe-layout { display: grid; grid-template-columns: 1fr 300px; gap: 20px; align-items: start; }
        .qe-main { display: flex; flex-direction: column; }
        .qe-sidebar { display: flex; flex-direction: column; gap: 16px; }

        /* ── Modal footer ── */
        .qe-footer {
          padding: 18px 28px; background: #fff; border-top: 1px solid #e8eaf0;
          display: flex; justify-content: flex-end; gap: 12px; flex-shrink: 0;
        }

        /* ── Shared section styles (matching AddQuiz) ── */
        .aq-section { background: #fff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px -4px rgba(0,0,0,0.06); overflow: hidden; }
        .aq-section-blue  { border-left: 4px solid #5156be; }
        .aq-section-green { border-left: 4px solid #10b981; }
        .aq-section-head  { display: flex; align-items: center; gap: 14px; padding: 20px 24px; border-bottom: 1px solid #f1f5f9; background: linear-gradient(135deg,#fafbff,#f8fafc); }
        .aq-section-title { font-size: 15px; font-weight: 800; color: #1e293b; margin: 0 0 2px; }
        .aq-section-sub   { font-size: 12px; color: #94a3b8; margin: 0; font-weight: 500; }

        .aq-section-icon { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .aq-section-icon.blue   { background: #eef2ff; color: #5156be; }
        .aq-section-icon.green  { background: #ecfdf5; color: #10b981; }
        .aq-section-icon.amber  { background: #fffbeb; color: #f59e0b; }
        .aq-section-icon.purple { background: #f5f3ff; color: #7c3aed; }
        .aq-section-icon.red    { background: #fef2f2; color: #dc2626; }

        /* ── Sidebar cards ── */
        .aq-sidebar-card  { background: #fff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 20px; box-shadow: 0 4px 20px -4px rgba(0,0,0,0.06); }
        .aq-card-deploy   { border-left: 4px solid #f59e0b; }
        .aq-card-security { border-left: 4px solid #7c3aed; }
        .aq-card-danger   { border-left: 4px solid #dc2626; }
        .aq-sidebar-head  { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
        .aq-sidebar-title { font-size: 14px; font-weight: 800; color: #1e293b; margin: 0; }

        /* ── Deployment toggle ── */
        .aq-deploy-toggle { display: flex; align-items: center; gap: 14px; padding: 16px; border-radius: 12px; border: 2px dashed #e2e8f0; cursor: pointer; transition: .3s; }
        .aq-deploy-toggle.live { border-style: solid; border-color: #10b981; background: #f0fdf4; }
        .aq-deploy-icon { width: 44px; height: 44px; border-radius: 12px; background: #f1f5f9; color: #94a3b8; display: flex; align-items: center; justify-content: center; transition: .3s; flex-shrink: 0; }
        .aq-deploy-toggle.live .aq-deploy-icon { background: #10b981; color: #fff; }
        .aq-deploy-status { font-size: 14px; font-weight: 800; color: #1e293b; margin: 0 0 2px; }
        .aq-deploy-hint   { font-size: 11px; color: #94a3b8; margin: 0; font-weight: 500; }

        /* ── Toggle rows ── */
        .aq-toggle { display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 10px; cursor: pointer; border: 1px solid transparent; transition: .2s; margin-bottom: 6px; }
        .aq-toggle:hover { background: #f8fafc; }
        .aq-toggle.on { background: rgba(124,58,237,0.04); }
        .aq-toggle-icon { width: 32px; height: 32px; border-radius: 8px; background: #f1f5f9; color: #94a3b8; display: flex; align-items: center; justify-content: center; transition: .2s; flex-shrink: 0; }
        .aq-toggle.on .aq-toggle-icon { background: #7c3aed; color: #fff; }
        .aq-toggle-info  { flex: 1; }
        .aq-toggle-label { display: block; font-size: 13px; font-weight: 700; color: #334155; }
        .aq-toggle-desc  { display: block; font-size: 10px; color: #94a3b8; }
        .aq-switch { width: 34px; height: 18px; border-radius: 20px; background: #e2e8f0; position: relative; transition: .3s; flex-shrink: 0; }
        .aq-toggle.on .aq-switch { background: #7c3aed; }
        .aq-thumb { width: 13px; height: 13px; border-radius: 50%; background: #fff; position: absolute; top: 2.5px; left: 2.5px; transition: .3s; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
        .aq-toggle.on .aq-thumb { left: 18px; }

        /* ── Form elements ── */
        .aq-field { display: flex; flex-direction: column; gap: 7px; }
        .aq-label { font-size: 10.5px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: .06em; }
        .aq-iw  { position: relative; display: flex; align-items: center; }
        .aq-ii  { position: absolute; left: 13px; color: #94a3b8; pointer-events: none; z-index: 1; transition: .2s; }
        .aq-input { width: 100%; padding: 11px 14px 11px 40px; font-size: 14px; font-weight: 500; color: #1e293b; background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; transition: all .2s; outline: none; font-family: 'Inter', sans-serif; box-sizing: border-box; }
        .aq-input:hover { border-color: #c7d2fe; background: #f5f7ff; }
        .aq-input:focus { border-color: #5156be; background: #fff; box-shadow: 0 0 0 4px rgba(81,86,190,.1); }
        .aq-iw:focus-within .aq-ii { color: #5156be; }
        .aq-textarea { padding: 12px 14px; resize: none; line-height: 1.6; }
        .aq-input-sm  { padding: 9px 10px; font-size: 13px; border-radius: 8px; }
        .aq-eye { position: absolute; right: 12px; background: none; border: none; color: #94a3b8; cursor: pointer; display: flex; align-items: center; }
        .aq-eye:hover { color: #5156be; }

        /* ── Quiz type buttons ── */
        .aq-type-row { display: flex; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
        .aq-type-btn { flex: 1; min-width: 90px; padding: 11px 8px; border-radius: 10px; border: 1.5px solid #e2e8f0; background: #fff; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 13px; font-weight: 700; color: #64748b; cursor: pointer; transition: .25s; }
        .aq-type-btn.active { background: #1e293b; border-color: #1e293b; color: #fff; transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.12); }
        .aq-type-btn:hover:not(.active) { background: #f5f7ff; border-color: #c7d2fe; color: #5156be; }

        /* ── Notice ── */
        .aq-notice { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: #eff6ff; border: 1px solid #dbeafe; border-radius: 9px; color: #1d4ed8; font-size: 12px; font-weight: 600; margin-top: 8px; }

        /* ── LLM Provider Card ── */
        .aq-llm-card { background: linear-gradient(135deg,#f5f3ff,#ede9fe); border: 1.5px solid #c4b5fd; border-radius: 14px; padding: 18px; margin-top: 8px; margin-bottom: 16px; }
        .aq-llm-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
        .aq-llm-icon { width: 36px; height: 36px; border-radius: 10px; background: #7c3aed; color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .aq-llm-title { font-size: 13px; font-weight: 800; color: #4c1d95; margin: 0 0 2px; }
        .aq-llm-sub { font-size: 11px; color: #7c3aed; margin: 0; font-weight: 500; }
        .aq-llm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .aq-llm-btn { background: #fff; border: 2px solid #e2e8f0; border-radius: 11px; padding: 12px 14px; text-align: left; cursor: pointer; transition: all .2s; position: relative; display: flex; flex-direction: column; gap: 4px; }
        .aq-llm-btn:hover:not(.aq-llm-btn--disabled) { border-color: #7c3aed; background: #faf5ff; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(124,58,237,.15); }
        .aq-llm-btn--active { border-color: #7c3aed !important; background: linear-gradient(135deg,#faf5ff,#f3e8ff) !important; box-shadow: 0 0 0 4px rgba(124,58,237,.15); }
        .aq-llm-btn--disabled { opacity: .5; cursor: not-allowed; background: #f8fafc; }
        .aq-llm-btn-name { font-size: 13px; font-weight: 700; color: #1e293b; }
        .aq-llm-btn-desc { font-size: 10.5px; color: #64748b; font-weight: 500; line-height: 1.4; }
        .aq-llm-badge { margin-top: 6px; font-size: 9.5px; font-weight: 700; color: #dc2626; background: #fef2f2; border: 1px solid #fecaca; border-radius: 20px; padding: 2px 8px; display: inline-block; }
        .aq-llm-check { margin-top: 6px; font-size: 9.5px; font-weight: 700; color: #7c3aed; background: #f5f3ff; border: 1px solid #c4b5fd; border-radius: 20px; padding: 2px 8px; display: inline-block; }
        @media (max-width: 560px) { .aq-llm-grid { grid-template-columns: 1fr; } }


        .aq-grid-2-1 { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; padding: 24px; }
        .aq-grid-3   { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
        .text-center { text-align: center; }

        /* ── Action buttons ── */
        .aq-btn-primary { display: flex; align-items: center; gap: 8px; background: linear-gradient(135deg,#5156be,#7c3aed); color: #fff; border: none; padding: 12px 28px; border-radius: 11px; font-size: 14px; font-weight: 700; cursor: pointer; transition: .3s; box-shadow: 0 6px 20px -4px rgba(81,86,190,.5); font-family: 'Inter',sans-serif; }
        .aq-btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 28px -4px rgba(81,86,190,.55); }
        .aq-btn-primary:disabled { opacity: .6; cursor: not-allowed; }
        .aq-btn-ghost  { display: flex; align-items: center; gap: 8px; background: #fff; border: 1.5px solid #e2e8f0; color: #64748b; padding: 12px 24px; border-radius: 11px; font-size: 14px; font-weight: 700; cursor: pointer; transition: .2s; font-family: 'Inter',sans-serif; }
        .aq-btn-ghost:hover { background: #f8fafc; color: #1e293b; border-color: #cbd5e1; }
        .aq-spin { animation: spin 1s linear infinite; }

        /* ── Responsive ── */
        @media (max-width: 900px) {
          .qe-layout { grid-template-columns: 1fr; }
          .qe-sidebar { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
          .aq-card-danger { grid-column: span 2; }
        }
        @media (max-width: 768px) {
          .reg-top-bar { flex-direction: column; align-items: flex-start; padding: 0 16px; }
          .t-title { font-size: 26px; }
          .btn-add { width: 100%; justify-content: center; }
          .reg-grid-modern { grid-template-columns: 1fr; padding: 0 16px; gap: 16px; }
          .qe-body { padding: 16px; }
          .qe-header { padding: 16px 20px; }
          .qe-footer { padding: 14px 20px; }
          .aq-grid-2-1 { grid-template-columns: 1fr; padding: 16px; }
          .aq-grid-3   { grid-template-columns: 1fr 1fr; }
          .qe-sidebar  { grid-template-columns: 1fr; }
          .aq-card-danger { grid-column: span 1; }
          .aq-btn-primary, .aq-btn-ghost { padding: 12px 18px; }
        }
        @media (max-width: 480px) {
          .qe-modal { border-radius: 14px; max-height: 96vh; }
          .qe-header-title { font-size: 14px; }
          .aq-grid-3 { grid-template-columns: 1fr; }
          .aq-type-btn { min-width: 70px; font-size: 12px; }
          .qe-footer { flex-direction: column-reverse; }
          .aq-btn-primary, .aq-btn-ghost { width: 100%; justify-content: center; }
        }
      `}</style>
    </div>
  );
}
