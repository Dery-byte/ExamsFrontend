import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStaffBase } from '../../hooks/useStaffBase';
import { useQuery } from '@tanstack/react-query';
import { getCategories, addQuiz, addLecturerQuiz, getCategoriesForUser, getAvailableLlmProviders, getMyDepartmentPrograms, saGetPrograms } from '../../api/endpoints';
import { useAuth } from '../../contexts/AuthContext';
import QuizProgramPicker from '../../components/ui/QuizProgramPicker';
import { showQuizLinkDialog } from '../../utils/quizLink';
import AttemptsField from '../../components/ui/AttemptsField';
import IndexRangeField, { indexRangeError } from '../../components/ui/IndexRangeField';
import AutoOpenField from '../../components/ui/AutoOpenField';
import AutoCloseField from '../../components/ui/AutoCloseField';
import QuestionPoolField from '../../components/ui/QuestionPoolField';
import toast, { Toaster } from 'react-hot-toast';
import {
  ShieldAlert, Zap, Eye, EyeOff, Save, Calendar, Clock, Layers,
  CheckCircle, ShieldCheck, Monitor, Smartphone, List, FileText,
  Loader2, ArrowLeft, Terminal, Award, Key, Timer, LayoutGrid,
  ShieldEllipsis, ChevronRight, Tag, Hash, Info, Activity, BookOpen, Bot, ClipboardPaste
} from 'lucide-react';
import { tx } from '../../utils/terms';
import AQ_CSS from './AddQuiz.css?raw';

const VIOLATION_OPTIONS = [
  { v: 'NONE', l: 'No Restrictions' },
  { v: 'DELAY_ONLY', l: 'Temporary Lock' },
  { v: 'AUTOSUBMIT_ONLY', l: 'Auto Submit' },
  { v: 'DELAY_AND_AUTOSUBMIT', l: 'Lock + Auto Submit' },
];

const defaultQuiz = () => ({
  title: '', description: '', maxMarks: '', numberOfQuestions: '', quizpassword: '', quizTime: '',
  startTime: '', quizDate: '', attempted: false, active: true, category: { cid: '' }, quizType: '',
  violationAction: 'NONE', delaySeconds: 0, autoSubmitCountdownSeconds: 5, maxViolations: 3,
  delayMultiplier: 1.5, enableFullscreenLock: true, enableWatermark: true, emailReportOnReview: false,
  enableScreenshotBlocking: true, enableDevToolsBlocking: true, allowPaste: false, llmProvider: 'GPT',
  programIds: [] as number[],
  indexRangeStart: '',
  indexRangeEnd: '',
  maxAttempts: 1,
  autoOpen: false,
  questionPool: false,
  autoClose: false,
  autoCloseFraction: 'HALF' as 'HALF' | 'QUARTER'
});

export default function AddQuiz({ lectMode = false }: { lectMode?: boolean }) {
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(defaultQuiz());
  const [hide, setHide] = useState(true);
  const [loading, setLoading] = useState(false);
  const { data: categories = [] } = useQuery({ 
    queryKey: lectMode ? ['lectCategories'] : ['categories'], 
    queryFn: lectMode ? getCategoriesForUser : getCategories 
  });

  // Programs allowed to take the quiz: HOD → own department only, Super Admin → every program.
  // (The server re-validates this; the filtering here is just for the picker.)
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const { data: adminPrograms = [] } = useQuery<any[]>({
    queryKey: ['quizProgramOptions', isSuperAdmin ? 'all' : 'department'],
    queryFn: isSuperAdmin ? saGetPrograms : getMyDepartmentPrograms,
    enabled: !lectMode && !!user,
  });

  // Lecturers: only the programs attached to the selected course.
  const coursePrograms: any[] = lectMode
    ? ((categories as any[]).find((c: any) => String(c.cid) === String(quiz.category.cid))?.programs ?? [])
        .filter((p: any) => p.enabled !== false)
    : [];
  const programs: any[] = lectMode ? coursePrograms : adminPrograms;
  // A Super Admin quiz on a global course (no programs) may leave programs empty: open to every program
  const selectedCourse: any = (categories as any[]).find((c: any) => String(c.cid) === String(quiz.category.cid));
  const courseIsGlobal = !!selectedCourse && (selectedCourse.programIds ?? selectedCourse.programs ?? []).length === 0;
  const programsOptional = isSuperAdmin && !lectMode && courseIsGlobal;

  const handleCategoryChange = (cid: string) => {
    if (lectMode) {
      // Default to every program of the newly chosen course; the lecturer can untick.
      const course = (categories as any[]).find((c: any) => String(c.cid) === String(cid));
      const ids = (course?.programs ?? []).filter((p: any) => p.enabled !== false).map((p: any) => p.id);
      setQuiz(q => ({ ...q, category: { cid }, programIds: ids }));
    } else {
      set('category', { cid });
    }
  };

  const { data: providersData } = useQuery({
    queryKey: ['llmProviders'],
    queryFn: getAvailableLlmProviders,
    retry: 1,
  });

  // Fallback list always shown immediately; enriched with API descriptions when available
  const FALLBACK_PROVIDERS = [
    { id: 'GPT',      displayName: 'OpenAI GPT',       description: 'GPT-3.5-Turbo / GPT-4 — Default evaluator', available: true },
    { id: 'GEMINI',   displayName: 'Google Gemini',    description: 'Gemini 1.5 Flash — Google AI evaluator',      available: true },
    { id: 'DEEPSEEK', displayName: 'DeepSeek',         description: 'DeepSeek Chat — Cost-effective evaluator',    available: true },
    { id: 'CLAUDE',   displayName: 'Anthropic Claude', description: 'Claude 3 Haiku — Requires Claude API key',    available: false },
  ];
  const llmProviders: any[] = (providersData?.providers?.length > 0)
    ? providersData.providers
    : FALLBACK_PROVIDERS;

  const roleName = lectMode ? 'Lecturer' : 'Admin';
  const staffBase = useStaffBase();
  const backPath = lectMode ? '/lect/quizes' : `${staffBase}/quizzes`;

  const set = (k: string, v: any) => setQuiz(q => ({ ...q, [k]: v }));

  const toggleAutoOpen = (on: boolean) =>
    // Turning it on hands "go live" over to the schedule, so a manually-LIVE quiz doesn't fight
    // with it; turning it off is left as a plain flag flip — the lecturer picks LIVE/DRAFT again.
    setQuiz(q => ({ ...q, autoOpen: on, active: on ? false : q.active }));

  // A new quiz has no questions yet, so a question-pool quiz starts as a draft: it can only go live once
  // its pool holds a full draw (the server refuses otherwise)
  const toggleQuestionPool = (on: boolean) =>
    setQuiz(q => ({ ...q, questionPool: on, active: on ? false : q.active }));

  const toggleActive = () => {
    if (!quiz.active && quiz.questionPool && quiz.quizType !== 'THEORY') {
      toast.error('A question-pool quiz goes live after its questions are added: save it as a draft, add them, then go live from the quiz list.');
      return;
    }
    set('active', !quiz.active);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quiz.quizType) { toast.error('Please select a quiz type'); return; }
    if (!quiz.category.cid) { toast.error('Please select a category'); return; }
    // Admin/HOD/SA always need a program; a lecturer needs one only if the course has programs.
    if (programs.length > 0 && quiz.programIds.length === 0 && !programsOptional) { toast.error(tx('Please select at least one program')); return; }
    if (!lectMode && programs.length === 0) { toast.error(tx('No programs available to assign this quiz to')); return; }
    const rangeError = indexRangeError(quiz.indexRangeStart, quiz.indexRangeEnd);
    if (rangeError) { toast.error(rangeError); return; }
    const pooled = quiz.questionPool && quiz.quizType !== 'THEORY';
    if (pooled && !(Number(quiz.numberOfQuestions) >= 1)) { toast.error('Set No. of Questions to how many questions each student gets.'); return; }
    setLoading(true);
    try {
      // The pool only applies to the objective section; a Theory quiz never carries it
      const payload = { ...quiz, questionPool: pooled, active: pooled ? false : quiz.active };
      const created = lectMode ? await addLecturerQuiz(payload) : await addQuiz(payload);
      if (created?.qId) {
        // The response's category is only the id we sent, so take the course name from the list.
        const course = (categories as any[]).find((c: any) => String(c.cid) === String(quiz.category.cid));
        await showQuizLinkDialog(created.qId, { title: created.title ?? quiz.title, courseTitle: course?.title });
      } else {
        toast.success('Assessment created successfully!');
      }
      navigate(backPath);
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Failed to create assessment'); }
    finally { setLoading(false); }
  };

  const Toggle = ({ label, k, icon: Icon, desc }: { label: string; k: string; icon: any; desc: string }) => {
    const on = (quiz as any)[k];
    return (
      <button type="button" role="switch" aria-checked={!!on} className={`aq-toggle ${on ? 'on' : ''}`} onClick={() => set(k, !on)}>
        <span className="aq-toggle-icon"><Icon size={15} /></span>
        <span className="aq-toggle-info">
          <span className="aq-toggle-label">{label}</span>
          <span className="aq-toggle-desc">{desc}</span>
        </span>
        <span className="aq-switch" aria-hidden><span className="aq-thumb" /></span>
      </button>
    );
  };


  return (
    <div className="aq-page">
      <Toaster position="top-right" />

      <div className="aq-head">
        <button type="button" className="aq-back" onClick={() => navigate(backPath)}><ArrowLeft size={16} /> Quizzes</button>
        <h2>New quiz</h2>
        <p>{tx('Set up the quiz, who can take it and when. Questions are added after it is created.')}</p>
      </div>

      <div className="aq-layout">
        {/* ── Main form ── */}
        <form id="aq-form" className="aq-main" onSubmit={handleSubmit}>

          {/* 1 · Details */}
          <section className="aq-section">
            <header className="aq-section-head">
              <span className="aq-step">1</span>
              <div>
                <h3 className="aq-section-title">Quiz details</h3>
                <p className="aq-section-sub">{tx('Name, course, and who is allowed to take it.')}</p>
              </div>
            </header>
            <div className="aq-body">
              <div className="aq-grid-2-1">
                <div className="aq-field">
                  <label className="aq-label" htmlFor="aq-title">Quiz title</label>
                  <div className="aq-iw">
                    <span className="aq-ii"><Tag size={15} /></span>
                    <input id="aq-title" className="aq-input" required value={quiz.title} onChange={e => set('title', e.target.value)} placeholder={tx('e.g. Mid-Semester Examination')} />
                  </div>
                </div>
                <div className="aq-field">
                  <label className="aq-label" htmlFor="aq-course">{tx('Course')}</label>
                  <div className="aq-iw">
                    <span className="aq-ii"><Layers size={15} /></span>
                    <select id="aq-course" className="aq-input" required value={quiz.category.cid} onChange={e => handleCategoryChange(e.target.value)}>
                      <option value="">{tx('Select a course…')}</option>
                      {(categories as any[]).map((c: any) => <option key={c.cid} value={c.cid}>{c.title}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <QuizProgramPicker
                programs={programs}
                selectedIds={quiz.programIds}
                onChange={ids => set('programIds', ids)}
                showDepartment={isSuperAdmin}
                emptyText={lectMode
                  ? (quiz.category.cid ? tx('This course has no programs attached, so the quiz is open to all students registered for it.') : tx('Select a course to choose which of its programs can take this quiz.'))
                  : (isSuperAdmin ? tx('No programs available.') : tx('No programs available for your department.'))}
              />
              {programsOptional && quiz.programIds.length === 0 && (
                <div className="aq-notice">
                  <Info size={15} />
                  <span>{selectedCourse?.openToEveryone
                    ? tx('No program selected: this quiz is for everyone. Its course is open to everyone, so every student can take it without registering.')
                    : tx('No program selected: students of every program who registered for this global course can take it.')}</span>
                </div>
              )}
              <IndexRangeField
                start={quiz.indexRangeStart}
                end={quiz.indexRangeEnd}
                onChange={(s, e) => setQuiz(q => ({ ...q, indexRangeStart: s, indexRangeEnd: e }))}
              />
              <div className="aq-field">
                <label className="aq-label" htmlFor="aq-desc">Instructions for students <span className="aq-opt">(optional)</span></label>
                <textarea id="aq-desc" className="aq-input aq-textarea" rows={3} value={quiz.description} onChange={e => set('description', e.target.value)} placeholder={tx('What students should know before they start…')} />
              </div>
            </div>
          </section>

          {/* 2 · Scoring & schedule */}
          <section className="aq-section">
            <header className="aq-section-head">
              <span className="aq-step">2</span>
              <div>
                <h3 className="aq-section-title">Scoring &amp; schedule</h3>
                <p className="aq-section-sub">Quiz type, marks, time and access.</p>
              </div>
            </header>
            <div className="aq-body">
              <div className="aq-field">
                <span className="aq-label">Quiz type</span>
                <div className="aq-type-row" role="radiogroup" aria-label="Quiz type">
                  {[
                    { id: 'OBJ', label: 'Objective', sub: 'Auto-marked', icon: List },
                    { id: 'THEORY', label: 'Theory', sub: 'Written answers', icon: FileText },
                    { id: 'BOTH', label: 'Combined', sub: 'Both sections', icon: LayoutGrid },
                  ].map(t => (
                    <button key={t.id} type="button" role="radio" aria-checked={quiz.quizType === t.id}
                      className={`aq-type-btn ${quiz.quizType === t.id ? 'active' : ''}`}
                      onClick={() => set('quizType', t.id)}>
                      <t.icon size={17} />
                      <span><b>{t.label}</b><small>{t.sub}</small></span>
                    </button>
                  ))}
                </div>
                {quiz.quizType === 'THEORY' && (
                  <div className="aq-notice">
                    <Info size={15} />
                    <span>{tx('Theory answers are marked by AI and reviewed by the lecturer before results are released. When adding questions, set how many to answer and the duration.')}</span>
                  </div>
                )}
              </div>

              {(quiz.quizType === 'THEORY' || quiz.quizType === 'BOTH') && (
                <div className="aq-llm-card">
                  <div className="aq-llm-header">
                    <div className="aq-llm-icon"><Bot size={17} /></div>
                    <div>
                      <p className="aq-llm-title">AI marker</p>
                      <p className="aq-llm-sub">The model that marks written answers</p>
                    </div>
                  </div>
                  <div className="aq-llm-grid">
                    {llmProviders.map((p: any) => (
                      <button key={p.id} type="button" disabled={!p.available} aria-pressed={quiz.llmProvider === p.id}
                        onClick={() => p.available && set('llmProvider', p.id)}
                        className={`aq-llm-btn ${quiz.llmProvider === p.id ? 'aq-llm-btn--active' : ''} ${!p.available ? 'aq-llm-btn--disabled' : ''}`}>
                        <span className="aq-llm-btn-name">{p.displayName}</span>
                        <span className="aq-llm-btn-desc">{p.description}</span>
                        {!p.available && <span className="aq-llm-badge">Key needed</span>}
                        {quiz.llmProvider === p.id && p.available && <span className="aq-llm-check">✓ Selected</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {quiz.quizType !== 'THEORY' && (
                <div className="aq-grid-3">
                  <div className="aq-field">
                    <label className="aq-label" htmlFor="aq-marks">Max marks</label>
                    <div className="aq-iw">
                      <span className="aq-ii"><Award size={15} /></span>
                      <input id="aq-marks" className="aq-input" type="number" inputMode="numeric" required value={quiz.maxMarks} onChange={e => set('maxMarks', e.target.value)} placeholder="100" />
                    </div>
                  </div>
                  <div className="aq-field">
                    <label className="aq-label" htmlFor="aq-count">{quiz.questionPool ? tx('Questions per student') : 'Number of questions'}</label>
                    <div className="aq-iw">
                      <span className="aq-ii"><Hash size={15} /></span>
                      <input id="aq-count" className="aq-input" type="number" inputMode="numeric" min={1} required value={quiz.numberOfQuestions} onChange={e => set('numberOfQuestions', e.target.value)} placeholder={quiz.questionPool ? '30' : '40'} />
                    </div>
                  </div>
                  <div className="aq-field">
                    <label className="aq-label" htmlFor="aq-time">Duration (minutes)</label>
                    <div className="aq-iw">
                      <span className="aq-ii"><Timer size={15} /></span>
                      <input id="aq-time" className="aq-input" type="number" inputMode="numeric" required value={quiz.quizTime} onChange={e => set('quizTime', e.target.value)} placeholder="60" />
                    </div>
                  </div>
                </div>
              )}

              <div className="aq-grid-3">
                <div className="aq-field">
                  <label className="aq-label" htmlFor="aq-date">Date</label>
                  <div className="aq-iw">
                    <span className="aq-ii"><Calendar size={15} /></span>
                    <input id="aq-date" className="aq-input" type="date" required value={quiz.quizDate} onChange={e => set('quizDate', e.target.value)} />
                  </div>
                </div>
                <div className="aq-field">
                  <label className="aq-label" htmlFor="aq-start">Start time</label>
                  <div className="aq-iw">
                    <span className="aq-ii"><Clock size={15} /></span>
                    <input id="aq-start" className="aq-input" type="time" required value={quiz.startTime} onChange={e => set('startTime', e.target.value)} />
                  </div>
                </div>
                <div className="aq-field">
                  <label className="aq-label" htmlFor="aq-key">Access code <span className="aq-opt">(optional)</span></label>
                  <div className="aq-iw">
                    <span className="aq-ii"><Key size={15} /></span>
                    <input id="aq-key" className="aq-input" style={{ paddingRight: '42px' }} type={hide ? 'password' : 'text'} value={quiz.quizpassword} onChange={e => set('quizpassword', e.target.value)} placeholder="Optional" autoComplete="off" />
                    <button type="button" className="aq-eye" onClick={() => setHide(!hide)} aria-label={hide ? 'Show access code' : 'Hide access code'}>{hide ? <Eye size={15} /> : <EyeOff size={15} />}</button>
                  </div>
                </div>
              </div>
              <div className="aq-grid-3">
                <AttemptsField value={quiz.maxAttempts} onChange={n => set('maxAttempts', n)} />
              </div>
              <div className="aq-options">
                {quiz.quizType !== 'THEORY' && (
                  <QuestionPoolField checked={quiz.questionPool} onChange={toggleQuestionPool} perStudent={quiz.numberOfQuestions} isNew />
                )}
                <AutoOpenField checked={quiz.autoOpen} onChange={toggleAutoOpen} quizDate={quiz.quizDate} startTime={quiz.startTime} />
                <AutoCloseField
                  checked={quiz.autoClose}
                  onChange={on => set('autoClose', on)}
                  fraction={quiz.autoCloseFraction}
                  onFractionChange={f => set('autoCloseFraction', f)}
                  quizType={quiz.quizType}
                  quizTime={quiz.quizTime}
                  quizDate={quiz.quizDate}
                  startTime={quiz.startTime}
                />
              </div>
            </div>
          </section>

        </form>

        {/* ── Sidebar ── */}
        <aside className="aq-sidebar">
          <div className="aq-sidebar-card">
            <div className="aq-sidebar-head">
              <div className="aq-section-icon"><Zap size={16} /></div>
              <h3 className="aq-sidebar-title">Publishing</h3>
            </div>
            {quiz.autoOpen && !quiz.active ? (
              <div className="aq-deploy-toggle scheduled">
                <div className="aq-deploy-icon"><Clock size={20} /></div>
                <div>
                  <p className="aq-deploy-status">Scheduled</p>
                  <p className="aq-deploy-hint">
                    {quiz.quizDate && quiz.startTime ? `Opens ${quiz.quizDate} at ${quiz.startTime}` : 'Set a date and time to open it automatically'}
                  </p>
                </div>
              </div>
            ) : (
              <button type="button" role="switch" aria-checked={!!quiz.active} className={`aq-deploy-toggle ${quiz.active ? 'live' : 'draft'}`} onClick={toggleActive}>
                <span className="aq-deploy-icon">{quiz.active ? <CheckCircle size={20} /> : <Save size={20} />}</span>
                <span>
                  <span className="aq-deploy-status">{quiz.active ? 'Published' : 'Draft'}</span>
                  <span className="aq-deploy-hint">{quiz.active ? tx('Students can see it')
                    : quiz.questionPool && quiz.quizType !== 'THEORY' ? 'Publish once the question pool is filled' : 'Only staff can see it'}</span>
                </span>
                <span className="aq-switch" aria-hidden><span className="aq-thumb" /></span>
              </button>
            )}
          </div>

          <div className="aq-sidebar-card">
            <div className="aq-sidebar-head">
              <div className="aq-section-icon"><ShieldCheck size={16} /></div>
              <h3 className="aq-sidebar-title">Exam security</h3>
            </div>
            <Toggle label="Focus lock" k="enableFullscreenLock" icon={Monitor} desc="Counts switching away from the exam" />
            <Toggle label="Watermark" k="enableWatermark" icon={Layers} desc={tx('Student ID shown over the questions')} />
            <Toggle label="Screenshot shield" k="enableScreenshotBlocking" icon={Smartphone} desc="Blocks screen captures" />
            <Toggle label="Developer tools block" k="enableDevToolsBlocking" icon={Terminal} desc="Stops the browser console" />
            <Toggle label="Allow paste" k="allowPaste" icon={ClipboardPaste} desc="Paste and keyboard suggestions in answers" />
          </div>

          <div className="aq-sidebar-card">
            <div className="aq-sidebar-head">
              <div className="aq-section-icon danger"><ShieldAlert size={16} /></div>
              <h3 className="aq-sidebar-title">Violation rules</h3>
            </div>
            <div className="aq-side-fields">
              <div className="aq-field">
                <label className="aq-label" htmlFor="aq-va">When a student breaks the rules</label>
                <select id="aq-va" className="aq-input aq-input-sm aq-noicon" value={quiz.violationAction} onChange={e => set('violationAction', e.target.value)}>
                  {VIOLATION_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </div>
              <div className="aq-pair">
                <div className="aq-field">
                  <label className="aq-label" htmlFor="aq-mv">Max violations</label>
                  <input id="aq-mv" className="aq-input aq-input-sm aq-noicon" type="number" inputMode="numeric" min="1" value={quiz.maxViolations} onChange={e => set('maxViolations', Number(e.target.value))} />
                </div>
                <div className="aq-field">
                  <label className="aq-label" htmlFor="aq-ds">Lock time (s)</label>
                  <input id="aq-ds" className="aq-input aq-input-sm aq-noicon" type="number" inputMode="numeric" min="0" placeholder="e.g. 30" value={quiz.delaySeconds || ''} onChange={e => set('delaySeconds', Number(e.target.value))} />
                </div>
              </div>
              <div className="aq-pair">
                <div className="aq-field">
                  <label className="aq-label" htmlFor="aq-dm">Lock multiplier</label>
                  <input id="aq-dm" className="aq-input aq-input-sm aq-noicon" type="number" step="0.1" min="1" value={quiz.delayMultiplier} onChange={e => set('delayMultiplier', Number(e.target.value))} />
                </div>
                <div className="aq-field">
                  <label className="aq-label" htmlFor="aq-as">Auto-submit (s)</label>
                  <input id="aq-as" className="aq-input aq-input-sm aq-noicon" type="number" inputMode="numeric" min="0" value={quiz.autoSubmitCountdownSeconds} onChange={e => set('autoSubmitCountdownSeconds', Number(e.target.value))} />
                </div>
              </div>
            </div>
          </div>
        </aside>

        <div className="aq-footer aq-footer-inline">
          <button type="button" className="aq-btn-ghost" onClick={() => navigate(backPath)}>Cancel</button>
          <button type="submit" form="aq-form" className="aq-btn-primary" disabled={loading}>
            {loading ? <Loader2 className="aq-spin" size={17} /> : <ShieldEllipsis size={17} />}
            <span>{loading ? 'Creating…' : 'Create quiz'}</span>
          </button>
        </div>
      </div>

      <div className="aq-footer-sticky">
        <button type="button" className="aq-btn-ghost" onClick={() => navigate(backPath)}>Cancel</button>
        <button type="submit" form="aq-form" className="aq-btn-primary" disabled={loading}>
          {loading ? <Loader2 className="aq-spin" size={17} /> : <ShieldEllipsis size={17} />}
          <span>{loading ? 'Creating…' : 'Create quiz'}</span>
        </button>
      </div>
      {/* Page-scoped: the Quiz Settings dialog reuses some aq- class names */}
      <style>{AQ_CSS}</style>
    </div>
  );
}
