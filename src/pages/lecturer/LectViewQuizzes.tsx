import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { loadQuizzesForUser, getCategoriesForUser, getQuiz, updateQuiz, deleteQuiz, updateQuizStatus, getAvailableLlmProviders } from '../../api/endpoints';
import Swal from 'sweetalert2';
import toast, { Toaster } from 'react-hot-toast';
import {
  Plus, X, Save, Loader2, Database, Settings, Trash2, Eye, EyeOff,
  ShieldCheck, Clock, Calendar, Layers, ChevronRight, CheckCircle,
  Smartphone, Terminal, ShieldAlert, Zap, BookOpen, Activity,
  List, FileText, LayoutGrid, Award, Hash, Timer, Tag, Key, Info,
  Monitor, Bot,
} from 'lucide-react';

const VIOLATION_OPTIONS = [
  { v: 'NONE',                 l: 'No Restrictions' },
  { v: 'DELAY_ONLY',           l: 'Temporary Lock' },
  { v: 'AUTOSUBMIT_ONLY',      l: 'Auto Submit' },
  { v: 'DELAY_AND_AUTOSUBMIT', l: 'Lock + Auto Submit' },
];

/* ─────────────────────────────────────────────────────────────────────────── */
/*  QuizEditModal — matches the Admin component design exactly                 */
/* ─────────────────────────────────────────────────────────────────────────── */
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
    if (!quiz.quizType)       { toast.error('Please select a quiz type'); return; }
    if (!quiz.category?.cid)  { toast.error('Please select a course category'); return; }
    setSaving(true);
    try {
      const payload = { ...quiz, categoryId: quiz.category?.cid ?? null };
      await updateQuiz(payload);
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
                      <input className="aq-input" required value={quiz.title || ''} onChange={e => set('title', e.target.value)} placeholder="e.g. Mid-Semester Examination" />
                    </div>
                  </div>
                  <div className="aq-field">
                    <label className="aq-label">Course Category</label>
                    <div className="aq-iw">
                      <span className="aq-ii"><Layers size={15} /></span>
                      <select className="aq-input" required value={quiz.category?.cid || ''} onChange={e => {
                        const chosen = categories.find((c: any) => String(c.cid) === String(e.target.value));
                        set('category', chosen ? { cid: chosen.cid, title: chosen.title } : { cid: e.target.value });
                      }}>
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
                      value={quiz.description || ''}
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

                  {/* LLM Provider Selection */}
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
                          <input className="aq-input text-center" type="number" required value={quiz.maxMarks || ''} onChange={e => set('maxMarks', e.target.value)} placeholder="100" />
                        </div>
                      </div>
                      <div className="aq-field">
                        <label className="aq-label">No. of Questions</label>
                        <div className="aq-iw">
                          <span className="aq-ii"><Hash size={15} /></span>
                          <input className="aq-input text-center" type="number" required value={quiz.numberOfQuestions || ''} onChange={e => set('numberOfQuestions', e.target.value)} placeholder="40" />
                        </div>
                      </div>
                      <div className="aq-field">
                        <label className="aq-label">Duration (mins)</label>
                        <div className="aq-iw">
                          <span className="aq-ii"><Timer size={15} /></span>
                          <input className="aq-input text-center" type="number" required value={quiz.quizTime || ''} onChange={e => set('quizTime', e.target.value)} placeholder="60" />
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
                        <input className="aq-input" type="date" required value={quiz.quizDate || ''} onChange={e => set('quizDate', e.target.value)} />
                      </div>
                    </div>
                    <div className="aq-field">
                      <label className="aq-label">Start Time</label>
                      <div className="aq-iw">
                        <span className="aq-ii"><Clock size={15} /></span>
                        <input className="aq-input" type="time" required value={quiz.startTime || ''} onChange={e => set('startTime', e.target.value)} />
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
                          value={quiz.quizpassword || ''}
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
                  <select className="aq-input aq-input-sm" style={{ paddingLeft: 14 }} value={quiz.violationAction || 'NONE'} onChange={e => set('violationAction', e.target.value)}>
                    {VIOLATION_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div className="aq-field">
                    <label className="aq-label">Max Violations</label>
                    <input className="aq-input aq-input-sm text-center" type="number" min="1" value={quiz.maxViolations ?? ''} onChange={e => set('maxViolations', Number(e.target.value))} />
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
                    <input className="aq-input aq-input-sm text-center" type="number" min="0" value={quiz.autoSubmitCountdownSeconds ?? ''} onChange={e => set('autoSubmitCountdownSeconds', Number(e.target.value))} />
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

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Main page                                                                   */
/* ─────────────────────────────────────────────────────────────────────────── */
export default function LectViewQuizzes() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: quizzes = [], isLoading } = useQuery({ queryKey: ['lectQuizzes'], queryFn: loadQuizzesForUser });
  const { data: categories = [] } = useQuery({ queryKey: ['lectCategories'], queryFn: getCategoriesForUser });
  const [editQuizId, setEditQuizId] = useState<number | null>(null);
  const [statusMap, setStatusMap] = useState<Record<number, string>>({});
  const [updatingMap, setUpdatingMap] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (editQuizId !== null) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [editQuizId]);

  const doDelete = (qId: number) => {
    Swal.fire({ title: 'Are you sure?', text: "You won't be able to revert this!", icon: 'warning', showCancelButton: true, confirmButtonColor: '#5156be', cancelButtonColor: '#74788d', confirmButtonText: 'Yes, delete it!' })
      .then(r => { if (!r.isConfirmed) return; deleteQuiz(qId).then(() => { toast.success('Quiz deleted'); qc.invalidateQueries({ queryKey: ['lectQuizzes'] }); }).catch(() => toast.error('Deletion failed')); });
  };

  const doUpdateStatus = (q: any) => {
    const sel = statusMap[q.qId] ?? q.status;
    setUpdatingMap(m => ({ ...m, [q.qId]: true }));
    updateQuizStatus(q.qId, sel).then(() => { toast.success(`Status updated: ${sel}`); qc.invalidateQueries({ queryKey: ['lectQuizzes'] }); })
      .catch(() => toast.error('Sync failed')).finally(() => setUpdatingMap(m => ({ ...m, [q.qId]: false })));
  };

  return (
    <div className="lvq-wrap">
      <Toaster position="top-right" containerStyle={{ zIndex: 999999 }} />

      <div className="lvq-header">
        <div>
          <h4 className="lvq-title">My Quizzes</h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#74788d', fontSize: '13px', marginTop: '2px' }}>
            <span>Home</span><ChevronRight size={12} /><span>Quizzes</span>
          </div>
        </div>
        <button className="lvq-create-btn" onClick={() => navigate('/lect/add-quizes')}>
          <Plus size={16} /> Create Quiz
        </button>
      </div>

      <div className="lvq-grid">
        {isLoading ? (
          <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '320px', gap: '16px' }}>
            <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'rgba(81,86,190,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 style={{ animation: 'spin 1s linear infinite', color: '#5156be' }} size={32} />
            </div>
            <p style={{ color: '#74788d', fontWeight: 600, fontSize: '14px', margin: 0 }}>Synchronizing Portfolio...</p>
          </div>
        ) : quizzes.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 20px' }}>
            <Database size={48} style={{ color: '#adb5bd', marginBottom: '16px' }} />
            <p style={{ color: '#74788d', fontSize: '14px' }}>No quizzes found in your registry.</p>
          </div>
        ) : quizzes.map((q: any) => {
          const isLive = q.status === 'OPEN';
          const grad = q.quizType === 'OBJ' ? 'linear-gradient(135deg,#5156be 0%,#3d41a8 100%)' : q.quizType === 'THEORY' ? 'linear-gradient(135deg,#fd625e 0%,#d94f4b 100%)' : 'linear-gradient(135deg,#ffbf53 0%,#e6a832 100%)';
          const accent = q.quizType === 'OBJ' ? '#5156be' : q.quizType === 'THEORY' ? '#fd625e' : '#ffbf53';
          const typeLabel = q.quizType === 'OBJ' ? 'Objective' : q.quizType === 'THEORY' ? 'Theory' : 'Combined';

          return (
            <div key={q.qId} className="lvq-card">
              {/* Colored Header */}
              <div style={{ background: grad, padding: '16px 18px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '3px 9px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{typeLabel}</span>
                    <span style={{ background: isLive ? 'rgba(42,181,125,0.25)' : 'rgba(253,98,94,0.25)', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '3px 9px', borderRadius: '20px', textTransform: 'uppercase' }}>{q.status}</span>
                  </div>
                  <h5 style={{ margin: 0, fontWeight: 800, fontSize: '15px', color: '#fff', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={q.title}>{q.title}</h5>
                  {q.category?.title && <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.72)', marginTop: '3px', display: 'block' }}>{q.category.title}</span>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <button style={{ width: 30, height: 30, borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                    title="Configure" onClick={() => setEditQuizId(q.qId)} onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.35)')} onMouseOut={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}><Settings size={14} /></button>
                  <button style={{ width: 30, height: 30, borderRadius: '8px', border: 'none', background: 'rgba(253,98,94,0.35)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                    title="Delete" onClick={() => doDelete(q.qId)} onMouseOver={e => (e.currentTarget.style.background = 'rgba(253,98,94,0.6)')} onMouseOut={e => (e.currentTarget.style.background = 'rgba(253,98,94,0.35)')}><Trash2 size={14} /></button>
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: '16px 18px', flex: 1 }}>
                <p style={{ fontSize: '13px', color: '#74788d', lineHeight: 1.6, margin: '0 0 14px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {q.description || 'Standard academic quiz for student evaluation.'}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', border: '1px solid #eff0f2', borderRadius: '10px', overflow: 'hidden' }}>
                  {[['Items', q.numberOfQuestions || '—'], ['Marks', q.maxMarks || '—'], ['Time', q.quizTime ? `${q.quizTime}m` : '—']].map(([k, v]) => (
                    <div key={k} style={{ padding: '10px 8px', textAlign: 'center', borderRight: '1px solid #eff0f2' }}>
                      <span style={{ display: 'block', fontSize: '10px', color: '#adb5bd', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{k}</span>
                      <span style={{ display: 'block', fontSize: '15px', fontWeight: 800, color: '#2a3142', marginTop: '2px' }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div style={{ padding: '12px 18px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {q.quizDate && <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#74788d', fontWeight: 500 }}><Calendar size={12} /> {q.quizDate}</div>}
                  {q.startTime && <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#74788d', fontWeight: 500 }}><Clock size={12} /> {q.startTime}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Link to={`/lect/view-quetions/${q.qId}/${q.title}`} style={{ fontSize: '12px', fontWeight: 700, color: accent, textDecoration: 'none', padding: '5px 12px', borderRadius: '20px', border: `1.5px solid ${accent}20`, background: `${accent}10`, transition: '0.2s' }}>Questions</Link>
                  <select style={{ fontSize: '11px', fontWeight: 700, color: '#495057', border: '1px solid #e9ecef', borderRadius: '6px', padding: '5px 8px', background: '#f8f9fa', cursor: 'pointer', outline: 'none' }}
                    value={statusMap[q.qId] ?? q.status ?? ''} onChange={e => setStatusMap(m => ({ ...m, [q.qId]: e.target.value }))}>
                    <option value="CLOSED">CLOSE</option>
                    <option value="OPEN">OPEN</option>
                  </select>
                  <button style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', background: '#5156be', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                    onClick={() => doUpdateStatus(q)} disabled={updatingMap[q.qId]}>
                    {updatingMap[q.qId] ? <Loader2 style={{ animation: 'spin 1s linear infinite' }} size={12} /> : <Save size={12} />}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {editQuizId !== null && (
        <QuizEditModal qId={editQuizId} categories={categories} onClose={() => setEditQuizId(null)} onSave={() => qc.invalidateQueries({ queryKey: ['lectQuizzes'] })} />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        /* ── List page ── */
        .lvq-wrap { padding: 24px; font-family: 'Inter', sans-serif; background: #f5f6f8; min-height: 100vh; overflow-x: hidden; }
        .lvq-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 28px; }
        .lvq-title { font-size: 20px; font-weight: 800; color: #2a3142; margin: 0; }
        .lvq-create-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; background: linear-gradient(135deg,#5156be,#3d41a8); color: #fff; border: none; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 12px rgba(81,86,190,0.3); }
        .lvq-create-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(81,86,190,0.4); }
        .lvq-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .lvq-card { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(18,38,63,0.07); border: 1px solid #eff0f2; display: flex; flex-direction: column; transition: transform 0.2s, box-shadow 0.2s; }
        .lvq-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(18,38,63,0.12); }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 1100px) { .lvq-grid { grid-template-columns: repeat(2,1fr); } }
        @media (max-width: 640px) {
          .lvq-wrap { padding: 16px; }
          .lvq-grid { grid-template-columns: 1fr; }
          .lvq-header { flex-direction: column; align-items: flex-start; }
          .lvq-create-btn { width: 100%; justify-content: center; }
        }

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

        /* ── Shared section styles ── */
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
        .aq-notice { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: #eff6ff; border: 1px solid #dbeafe; border-radius: 9px; color: #1d4ed8; font-size: 12px; font-weight: 600; margin-top: 8px; flex-wrap: wrap; }

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

        /* ── Grids ── */
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
          .qe-body { padding: 16px; }
          .qe-header { padding: 16px 20px; }
          .qe-footer { padding: 14px 20px; }
          .aq-grid-2-1 { grid-template-columns: 1fr; padding: 16px; }
          .aq-grid-3   { grid-template-columns: 1fr 1fr; }
          .qe-sidebar  { grid-template-columns: 1fr; }
          .aq-card-danger { grid-column: span 1; }
          .aq-btn-primary, .aq-btn-ghost { padding: 12px 18px; }
          .aq-llm-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 480px) {
          .qe-modal { border-radius: 14px; max-height: 96vh; }
          .qe-header-title { font-size: 14px; }
          .aq-grid-3 { grid-template-columns: 1fr; }
          .aq-type-btn { min-width: 70px; font-size: 12px; }
          .qe-footer { flex-direction: column-reverse; gap: 10px; }
          .aq-btn-primary, .aq-btn-ghost { width: 100%; justify-content: center; }
        }
      `}</style>
    </div>
  );
}
