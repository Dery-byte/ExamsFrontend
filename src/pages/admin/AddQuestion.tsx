import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getQuiz, addQuestion, uploadQuestions,
  uploadTheoryQuestions, addNumberOfTheoryToAnswer, addTheoryQuestion
} from '../../api/endpoints';
import toast, { Toaster } from 'react-hot-toast';
import {
  FilePlus, FileText, Upload, Save, List, Info, ArrowLeft,
  Loader2, Database, Zap, Hash, Award, Target, ChevronRight,
  Layers, CheckSquare, ToggleLeft, Link2, X, Check, Plus, Trash2
} from 'lucide-react';
import RichTextEditor from '../../components/ui/RichTextEditor';

// Strip HTML tags for validation
const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '').trim();

// ─── Exact enum values from backend QuestionType.java ────────────────────────
const Q_TYPES = [
  {
    id: 'MCQ',
    label: 'Multiple Choice',
    sub: 'Single or multiple correct options',
    icon: CheckSquare,
    color: '#5156be',
    bg: '#eef2ff',
  },
  {
    id: 'TRUE_FALSE',
    label: 'True / False',
    sub: 'Binary — True or False answer',
    icon: ToggleLeft,
    color: '#0891b2',
    bg: '#ecfeff',
  },
  {
    id: 'MATCHING',
    label: 'Matching',
    sub: 'Match prompts to their correct answers',
    icon: Link2,
    color: '#7c3aed',
    bg: '#f5f3ff',
  },
];

// ─── Blank form factories ─────────────────────────────────────────────────────
const blankMCQ = (qId: any) => ({
  quiz: { qId },
  content: '',
  option1: '', option2: '', option3: '', option4: '',
  correct_answer: [] as string[],
  questionType: 'MCQ',
});

const blankTF = (qId: any) => ({
  quiz: { qId },
  content: '',
  option1: 'True', option2: 'False', option3: '', option4: '',
  correct_answer: [] as string[],
  questionType: 'TRUE_FALSE',
});

const blankMatching = (qId: any) => ({
  quiz: { qId },
  content: '',
  option1: '', option2: '', option3: '', option4: '',
  correct_answer: [] as string[],
  questionType: 'MATCHING',
  matchingPairs: [] as { prompt: string; answer: string; pairOrder: number }[],
});

export default function AddQuestion({ adminMode = true }: { adminMode?: boolean }) {
  const { qId, title } = useParams();
  const navigate = useNavigate();
  const [specificQuiz, setSpecificQuiz] = useState<any>(null);
  const [qTitle, setQTitle] = useState(title || '');
  const roleName = adminMode ? 'Admin' : 'Lecturer';
  const basePath  = adminMode ? '/admin' : '/lect';

  // ── OBJ state ────────────────────────────────────────────────────────────────
  const [questionType, setQuestionType] = useState<string | null>(null);
  const [mcqForm, setMcqForm]           = useState<any>(blankMCQ(qId));
  const [tfForm, setTfForm]             = useState<any>(blankTF(qId));
  const [matchForm, setMatchForm]       = useState<any>(blankMatching(qId));

  // ── Theory state ─────────────────────────────────────────────────────────────
  const [theoryForm, setTheoryForm] = useState({
    quiz: { qId }, quesNo: '', question: '', marks: '', evaluationCriteria: ''
  });

  // ── Bulk / file state ────────────────────────────────────────────────────────
  const [selectedFile, setSelectedFile]             = useState<File | null>(null);
  const [filePreview, setFilePreview]               = useState<any[]>([]);
  const [selectedFileTheory, setSelectedFileTheory] = useState<File | null>(null);
  const [theoryPreview, setTheoryPreview]           = useState<any[]>([]);
  const [theoryQuesToAnswer, setTheoryQA]           = useState({ totalQuestToAnswer: '', timeAllowed: '', quiz: { qId } });

  const [loading, setLoading]     = useState(false);
  const [activeTab, setActiveTab] = useState<'OBJ' | 'THEORY'>('OBJ');

  useEffect(() => {
    if (!qId) return;
    getQuiz(qId).then(quiz => {
      setSpecificQuiz(quiz);
      setQTitle(quiz.title);
      // sync qId into forms
      setMcqForm(blankMCQ(qId));
      setTfForm(blankTF(qId));
      setMatchForm(blankMatching(qId));
      setTheoryForm(t => ({ ...t, quiz: { qId } }));
      const qt = String(quiz?.quizType || '').toUpperCase();
      if (qt.includes('THEORY') && !qt.includes('BOTH')) setActiveTab('THEORY');
    });
  }, [qId]);

  // ─── MCQ helpers ─────────────────────────────────────────────────────────────
  const setMcq = (k: string, v: any) => setMcqForm((f: any) => ({ ...f, [k]: v }));

  const toggleMcqAnswer = (optVal: string) => {
    setMcqForm((f: any) => {
      const already = f.correct_answer.includes(optVal);
      return {
        ...f,
        correct_answer: already
          ? f.correct_answer.filter((x: string) => x !== optVal)
          : [...f.correct_answer, optVal],
      };
    });
  };

  // ─── Matching helpers ─────────────────────────────────────────────────────────
  const addPair = () =>
    setMatchForm((f: any) => ({
      ...f,
      matchingPairs: [...f.matchingPairs, { prompt: '', answer: '', pairOrder: f.matchingPairs.length }],
    }));

  const updatePair = (i: number, field: 'prompt' | 'answer', val: string) =>
    setMatchForm((f: any) => {
      const pairs = [...f.matchingPairs];
      pairs[i] = { ...pairs[i], [field]: val };
      return { ...f, matchingPairs: pairs };
    });

  const removePair = (i: number) =>
    setMatchForm((f: any) => ({
      ...f,
      matchingPairs: f.matchingPairs
        .filter((_: any, idx: number) => idx !== i)
        .map((p: any, idx: number) => ({ ...p, pairOrder: idx })),
    }));

  // ─── Reset form for a given type ─────────────────────────────────────────────
  const selectType = (type: string) => {
    setQuestionType(type);
    if (type === 'MCQ')        setMcqForm(blankMCQ(qId));
    else if (type === 'TRUE_FALSE') setTfForm(blankTF(qId));
    else if (type === 'MATCHING')   setMatchForm(blankMatching(qId));
  };

  // ─── Submit handlers ──────────────────────────────────────────────────────────
  const handleAddMCQ = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripHtml(mcqForm.content)) { toast.error('Question content is required'); return; }
    if (!mcqForm.option1.trim() || !mcqForm.option2.trim()) { toast.error('At least two options are required'); return; }
    if (!mcqForm.correct_answer.length) { toast.error('Mark at least one correct answer'); return; }
    setLoading(true);
    try {
      await addQuestion(mcqForm);
      toast.success('MCQ question added!');
      setMcqForm(blankMCQ(qId));
    } catch { toast.error('Failed to add question'); }
    finally { setLoading(false); }
  };

  const handleAddTF = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripHtml(tfForm.content)) { toast.error('Question content is required'); return; }
    if (!tfForm.correct_answer.length) { toast.error('Select True or False as the correct answer'); return; }
    setLoading(true);
    try {
      await addQuestion(tfForm);
      toast.success('True/False question added!');
      setTfForm(blankTF(qId));
    } catch { toast.error('Failed to add question'); }
    finally { setLoading(false); }
  };

  const handleAddMatching = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripHtml(matchForm.content)) { toast.error('Question content is required'); return; }
    if (matchForm.matchingPairs.length < 2) { toast.error('Add at least 2 matching pairs'); return; }
    const incomplete = matchForm.matchingPairs.some((p: any) => !p.prompt.trim() || !p.answer.trim());
    if (incomplete) { toast.error('All pairs must have both a prompt and an answer'); return; }
    setLoading(true);
    try {
      await addQuestion(matchForm);
      toast.success('Matching question added!');
      setMatchForm(blankMatching(qId));
    } catch { toast.error('Failed to add question'); }
    finally { setLoading(false); }
  };

  const handleAddTheory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!theoryForm.quesNo.trim() || !stripHtml(theoryForm.question) || !theoryForm.marks || Number(theoryForm.marks) <= 0) {
      toast.error('Question number, content and marks are required'); return;
    }
    setLoading(true);
    try {
      // Backend entity stores marks as String, evaluationCriteria is nullable
      const payload = {
        ...theoryForm,
        marks: String(theoryForm.marks),
        evaluationCriteria: theoryForm.evaluationCriteria?.trim() || null,
      };
      await addTheoryQuestion(payload);
      toast.success('Theory question added!');
      setTheoryForm(t => ({ ...t, quesNo: '', question: '', marks: '', evaluationCriteria: '' }));
    } catch { toast.error('Failed to add question'); }
    finally { setLoading(false); }
  };

  // ─── File handlers ────────────────────────────────────────────────────────────
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'OBJ' | 'THEORY') => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (type === 'OBJ') { setSelectedFile(file); setFilePreview(Array.isArray(parsed) ? parsed : [parsed]); }
      else { setSelectedFileTheory(file); setTheoryPreview(Array.isArray(parsed) ? parsed : [parsed]); }
    } catch { toast.error('Invalid JSON format'); }
  };

  const uploadObj = async () => {
    if (!selectedFile || filePreview.length === 0) return;
    setLoading(true);
    try { await uploadQuestions(qId!, filePreview); toast.success('Questions uploaded!'); setSelectedFile(null); setFilePreview([]); }
    catch { toast.error('Upload failed'); }
    finally { setLoading(false); }
  };

  const uploadTheory = async () => {
    if (!selectedFileTheory || !theoryQuesToAnswer.totalQuestToAnswer || !theoryQuesToAnswer.timeAllowed || theoryPreview.length === 0) {
      toast.error('Fill all parameters and select a valid JSON file'); return;
    }
    setLoading(true);
    try {
      await addNumberOfTheoryToAnswer(theoryQuesToAnswer);
      await uploadTheoryQuestions(qId!, theoryPreview);
      toast.success('Theory questions uploaded!');
      setSelectedFileTheory(null); setTheoryPreview([]);
      setTheoryQA(t => ({ ...t, totalQuestToAnswer: '', timeAllowed: '' }));
    } catch { toast.error('Upload failed'); }
    finally { setLoading(false); }
  };

  const qType   = String(specificQuiz?.quizType || '').toUpperCase();
  const isOBJ   = qType.includes('OBJ') || qType.includes('BOTH');
  const isTheory = qType.includes('THEORY') || qType.includes('BOTH');
  const chosenTypeDef = Q_TYPES.find(t => t.id === questionType);

  // ── MCQ options list ─────────────────────────────────────────────────────────
  const OPT_KEYS = ['option1', 'option2', 'option3', 'option4'] as const;

  return (
    <div className="addq-page animate-fade-in">
      <Toaster position="top-right" />

      {/* ── Top bar ── */}
      <div className="addq-topbar">
        <div className="addq-topbar-left">
          <button className="addq-back-btn" onClick={() => navigate(`${basePath}/view-questions/${qId}/${qTitle}`)}>
            <ArrowLeft size={15} /><span>Back</span>
          </button>
          <div className="addq-breadcrumb">
            <span>{roleName}</span>
            <ChevronRight size={12} />
            <span>Add Questions</span>
            <ChevronRight size={12} />
            <span className="addq-bc-active">{qTitle}</span>
          </div>
        </div>
      </div>

      {/* ── Quiz banner ── */}
      <div className="addq-banner">
        <div className="addq-banner-icon"><Zap size={22} /></div>
        <div className="addq-banner-info">
          <h4 className="addq-banner-title">{qTitle}</h4>
          <div className="addq-banner-meta">
            <span className="addq-pill">ID: {qId}</span>
            <span className="addq-pill addq-pill-type">{specificQuiz?.quizType || '—'}</span>
          </div>
        </div>
      </div>

      {/* ── Tab switcher (only for BOTH) ── */}
      {isOBJ && isTheory && (
        <div className="addq-tab-bar">
          <button className={`addq-tab ${activeTab === 'OBJ' ? 'active' : ''}`} onClick={() => setActiveTab('OBJ')}>
            <List size={16} /><span>Objective</span>
          </button>
          <button className={`addq-tab ${activeTab === 'THEORY' ? 'active' : ''}`} onClick={() => setActiveTab('THEORY')}>
            <FileText size={16} /><span>Theory</span>
          </button>
        </div>
      )}

      {/* ── Main layout ── */}
      <div className="addq-layout">
        <div className="addq-main">

          {/* ══ OBJECTIVE TAB ══ */}
          {activeTab === 'OBJ' && isOBJ && (
            <div className="animate-fade-in">

              {/* STEP 1 — Pick question type */}
              {!questionType ? (
                <div className="addq-card">
                  <div className="addq-card-head addq-head-blue">
                    <div className="addq-card-head-icon blue"><List size={18} /></div>
                    <div>
                      <h6 className="addq-card-title">Choose Question Type</h6>
                      <p className="addq-card-sub">Select the format before entering question details</p>
                    </div>
                  </div>
                  <div className="addq-type-grid">
                    {Q_TYPES.map(t => (
                      <button
                        key={t.id}
                        className="addq-type-card"
                        style={{ '--tc': t.color, '--tb': t.bg } as any}
                        onClick={() => selectType(t.id)}
                      >
                        <div className="addq-type-icon-wrap"><t.icon size={26} /></div>
                        <div className="addq-type-texts">
                          <span className="addq-type-label">{t.label}</span>
                          <span className="addq-type-sub">{t.sub}</span>
                        </div>
                        <ChevronRight size={16} className="addq-type-arrow" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* STEP 2 — Question form, adapts to type */
                <div className="addq-card animate-fade-in">
                  <div className="addq-card-head addq-head-blue">
                    <div className="addq-card-head-icon blue">
                      {chosenTypeDef && <chosenTypeDef.icon size={18} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h6 className="addq-card-title">{chosenTypeDef?.label}</h6>
                      <p className="addq-card-sub">{chosenTypeDef?.sub}</p>
                    </div>
                    <button className="addq-change-btn" onClick={() => setQuestionType(null)}>
                      <X size={13} /><span>Change Type</span>
                    </button>
                  </div>

                  {/* ── MCQ Form ── */}
                  {questionType === 'MCQ' && (
                    <form onSubmit={handleAddMCQ} className="addq-form-body">
                      <div className="addq-field">
                        <label className="addq-label"><Hash size={13} />Question</label>
                        <RichTextEditor
                          value={mcqForm.content}
                          onChange={val => setMcq('content', val)}
                          placeholder="Enter the question text here..."
                          minHeight={140}
                          id="mcq-content-editor"
                        />
                      </div>

                      <div className="addq-field">
                        <label className="addq-label"><CheckSquare size={13} />Options &amp; Correct Answer(s)</label>
                        <p className="addq-field-hint" style={{ marginTop: 0 }}>Click the <strong>✓</strong> button to mark an option as correct. Multiple correct answers are allowed.</p>
                        <div className="addq-options-list">
                          {OPT_KEYS.map((k, i) => {
                            const val = mcqForm[k] as string;
                            const isCorrect = val && mcqForm.correct_answer.includes(val);
                            return (
                              <div key={k} className={`addq-option-row ${isCorrect ? 'correct' : ''}`}>
                                <span className="addq-opt-badge">{String.fromCharCode(65 + i)}</span>
                                <input
                                  className="addq-opt-input"
                                  value={val}
                                  onChange={e => {
                                    // if renamed: remove old value from correct_answer
                                    const old = mcqForm[k];
                                    const newVal = e.target.value;
                                    setMcqForm((f: any) => ({
                                      ...f,
                                      [k]: newVal,
                                      correct_answer: f.correct_answer
                                        .filter((x: string) => x !== old)
                                        .concat(isCorrect && newVal ? [newVal] : []),
                                    }));
                                  }}
                                  placeholder={`Option ${String.fromCharCode(65 + i)}${i >= 2 ? ' (optional)' : ''}`}
                                />
                                {val && (
                                  <button type="button"
                                    className={`addq-correct-btn ${isCorrect ? 'selected' : ''}`}
                                    onClick={() => toggleMcqAnswer(val)}
                                    title={isCorrect ? 'Remove correct mark' : 'Mark as correct'}>
                                    <Check size={13} />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {mcqForm.correct_answer.length > 0 && (
                          <div className="addq-answer-tags">
                            <span className="addq-sa-label">Correct:</span>
                            {mcqForm.correct_answer.map((a: string, i: number) => (
                              <span key={i} className="addq-sa-tag">{a}</span>
                            ))}
                          </div>
                        )}
                      </div>

                      <button type="submit" className="addq-submit-btn" disabled={loading}>
                        {loading ? <Loader2 className="addq-spin" size={16} /> : <Save size={16} />}
                        <span>{loading ? 'Saving...' : 'Add MCQ Question'}</span>
                      </button>
                    </form>
                  )}

                  {/* ── True/False Form ── */}
                  {questionType === 'TRUE_FALSE' && (
                    <form onSubmit={handleAddTF} className="addq-form-body">
                      <div className="addq-field">
                        <label className="addq-label"><Hash size={13} />Question</label>
                        <RichTextEditor
                          value={tfForm.content}
                          onChange={val => setTfForm((f: any) => ({ ...f, content: val }))}
                          placeholder="Enter the True/False statement here..."
                          minHeight={140}
                          id="tf-content-editor"
                        />
                      </div>

                      <div className="addq-field">
                        <label className="addq-label"><ToggleLeft size={13} />Correct Answer</label>
                        <div className="addq-tf-row">
                          {['True', 'False'].map(opt => (
                            <button key={opt} type="button"
                              className={`addq-tf-btn ${tfForm.correct_answer[0] === opt ? (opt === 'True' ? 'selected-true' : 'selected-false') : ''}`}
                              onClick={() => setTfForm((f: any) => ({ ...f, correct_answer: [opt] }))}>
                              <div className="addq-tf-circle">
                                {opt === 'True' ? <Check size={20} /> : <X size={20} />}
                              </div>
                              <span>{opt}</span>
                            </button>
                          ))}
                        </div>
                        <div className="addq-answer-hint">
                          <Info size={13} />
                          <span>
                            The backend stores <code>option1="True"</code> and <code>option2="False"</code>.
                            The selected value will be stored in <code>correct_answer</code>.
                          </span>
                        </div>
                      </div>

                      <button type="submit" className="addq-submit-btn" disabled={loading}>
                        {loading ? <Loader2 className="addq-spin" size={16} /> : <Save size={16} />}
                        <span>{loading ? 'Saving...' : 'Add True/False Question'}</span>
                      </button>
                    </form>
                  )}

                  {/* ── Matching Form ── */}
                  {questionType === 'MATCHING' && (
                    <form onSubmit={handleAddMatching} className="addq-form-body">
                      <div className="addq-field">
                        <label className="addq-label"><Hash size={13} />Question / Instructions</label>
                        <RichTextEditor
                          value={matchForm.content}
                          onChange={val => setMatchForm((f: any) => ({ ...f, content: val }))}
                          placeholder="e.g. Match each HTTP status code to its meaning..."
                          minHeight={110}
                          id="matching-content-editor"
                        />
                      </div>

                      <div className="addq-field">
                        <div className="addq-matching-head">
                          <label className="addq-label" style={{ marginBottom: 0 }}><Link2 size={13} />Matching Pairs</label>
                          <button type="button" className="addq-add-pair-btn" onClick={addPair}>
                            <Plus size={14} /><span>Add Pair</span>
                          </button>
                        </div>

                        {matchForm.matchingPairs.length === 0 ? (
                          <div className="addq-empty-pairs" onClick={addPair}>
                            <Link2 size={28} />
                            <span>Click <strong>Add Pair</strong> to start adding matching items</span>
                          </div>
                        ) : (
                          <div className="addq-pairs-list">
                            {/* Column headers */}
                            <div className="addq-pairs-header">
                              <span className="addq-col-label addq-col-prompt">Prompt (Left)</span>
                              <span className="addq-col-label addq-col-answer">Correct Answer (Right)</span>
                              <span style={{ width: 32 }} />
                            </div>
                            {matchForm.matchingPairs.map((pair: any, i: number) => (
                              <div key={i} className="addq-pair-row">
                                <span className="addq-pair-num">{i + 1}</span>
                                <input
                                  className="addq-pair-input"
                                  value={pair.prompt}
                                  onChange={e => updatePair(i, 'prompt', e.target.value)}
                                  placeholder={`e.g. HTTP 404`}
                                />
                                <div className="addq-pair-arrow">→</div>
                                <input
                                  className="addq-pair-input"
                                  value={pair.answer}
                                  onChange={e => updatePair(i, 'answer', e.target.value)}
                                  placeholder={`e.g. Not Found`}
                                />
                                <button type="button" className="addq-remove-pair" onClick={() => removePair(i)}>
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="addq-answer-hint" style={{ marginTop: 12 }}>
                          <Info size={13} />
                          <span>
                            Each pair stores a <code>prompt</code> and an <code>answer</code>.
                            The answer pool is shuffled for students during the exam.
                          </span>
                        </div>
                      </div>

                      <button type="submit" className="addq-submit-btn addq-submit-purple" disabled={loading}>
                        {loading ? <Loader2 className="addq-spin" size={16} /> : <Save size={16} />}
                        <span>{loading ? 'Saving...' : 'Add Matching Question'}</span>
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ══ THEORY TAB ══ */}
          {activeTab === 'THEORY' && isTheory && (
            <div className="addq-card animate-fade-in">
              <div className="addq-card-head addq-head-green">
                <div className="addq-card-head-icon green"><FileText size={18} /></div>
                <div>
                  <h6 className="addq-card-title">Theory Question</h6>
                  <p className="addq-card-sub">Manually graded open-ended question</p>
                </div>
              </div>
              <form onSubmit={handleAddTheory} className="addq-form-body">
                <div className="addq-theory-top">
                  <div className="addq-field" style={{ flex: 2 }}>
                    <label className="addq-label"><Hash size={13} />Question No.</label>
                    <input className="addq-input" value={theoryForm.quesNo}
                      onChange={e => setTheoryForm(t => ({ ...t, quesNo: e.target.value }))}
                      placeholder="e.g. Q1a" />
                  </div>
                  <div className="addq-field" style={{ flex: 1 }}>
                    <label className="addq-label"><Award size={13} />Marks</label>
                    <input className="addq-input addq-input-center" type="number" min="1"
                      value={theoryForm.marks || ''}
                      onChange={e => setTheoryForm(t => ({ ...t, marks: e.target.value }))}
                      placeholder="5" />
                  </div>
                </div>
                <div className="addq-field">
                  <label className="addq-label"><FileText size={13} />Question Content</label>
                  <RichTextEditor
                    value={theoryForm.question}
                    onChange={val => setTheoryForm(t => ({ ...t, question: val }))}
                    placeholder="Enter the theory question here..."
                    minHeight={160}
                    id="theory-question-editor"
                  />
                </div>
                <div className="addq-field">
                  <label className="addq-label">
                    <Info size={13} />Evaluation Criteria
                    <span className="addq-optional">optional</span>
                  </label>
                  <RichTextEditor
                    value={theoryForm.evaluationCriteria}
                    onChange={val => setTheoryForm(t => ({ ...t, evaluationCriteria: val }))}
                    placeholder="Internal grading benchmarks..."
                    minHeight={110}
                    id="theory-eval-editor"
                  />
                </div>
                <button type="submit" className="addq-submit-btn addq-submit-green" disabled={loading}>
                  {loading ? <Loader2 className="addq-spin" size={16} /> : <Save size={16} />}
                  <span>{loading ? 'Saving...' : 'Add Theory Question'}</span>
                </button>
              </form>
            </div>
          )}
        </div>

        {/* ── SIDEBAR ── */}
        <div className="addq-sidebar">

          {/* Bulk Upload */}
          <div className="addq-dark-card">
            <div className="addq-dark-head">
              <div className="addq-dark-icon"><Database size={18} /></div>
              <h6 className="addq-dark-title">Bulk Upload</h6>
            </div>
            <div className="addq-dark-body">
              {activeTab === 'OBJ' && isOBJ && (
                <div className="animate-fade-in">
                  <label className="addq-dropzone">
                    <input type="file" accept=".json" onChange={e => onFileChange(e, 'OBJ')} style={{ display: 'none' }} />
                    <FilePlus size={30} />
                    <span className="addq-dz-title">{selectedFile ? selectedFile.name : 'Select JSON File'}</span>
                    <span className="addq-dz-sub">Objective questions in bulk</span>
                  </label>
                  {filePreview.length > 0 && (
                    <div className="addq-staging">
                      <div className="addq-staging-head">
                        <span>Preview</span>
                        <span className="addq-staging-badge">{filePreview.length} items</span>
                      </div>
                      {filePreview.slice(0, 3).map((p, i) => (
                        <div key={i} className="addq-staging-row">{i + 1}. {String(p.content || '').substring(0, 50)}…</div>
                      ))}
                    </div>
                  )}
                  <button className="addq-upload-btn" onClick={uploadObj} disabled={!selectedFile || loading}>
                    {loading ? <Loader2 className="addq-spin" size={15} /> : <Upload size={15} />}
                    <span>{loading ? 'Uploading...' : 'Upload Questions'}</span>
                  </button>
                </div>
              )}
              {activeTab === 'THEORY' && isTheory && (
                <div className="animate-fade-in">
                  <div className="addq-dark-fields">
                    <div className="addq-dark-field">
                      <label>Questions to Answer</label>
                      <input type="number" value={theoryQuesToAnswer.totalQuestToAnswer}
                        onChange={e => setTheoryQA(t => ({ ...t, totalQuestToAnswer: e.target.value }))} placeholder="0" />
                    </div>
                    <div className="addq-dark-field">
                      <label>Time Allowed (mins)</label>
                      <input type="number" value={theoryQuesToAnswer.timeAllowed}
                        onChange={e => setTheoryQA(t => ({ ...t, timeAllowed: e.target.value }))} placeholder="0" />
                    </div>
                  </div>
                  <label className="addq-dropzone addq-dropzone-green">
                    <input type="file" accept=".json" onChange={e => onFileChange(e, 'THEORY')} style={{ display: 'none' }} />
                    <Layers size={30} />
                    <span className="addq-dz-title">{selectedFileTheory ? selectedFileTheory.name : 'Select JSON File'}</span>
                    <span className="addq-dz-sub">Theory questions in bulk</span>
                  </label>
                  {theoryPreview.length > 0 && (
                    <div className="addq-staging" style={{ marginBottom: 0 }}>
                      <div className="addq-staging-head">
                        <span>Preview</span>
                        <span className="addq-staging-badge addq-sb-green">{theoryPreview.length} items</span>
                      </div>
                    </div>
                  )}
                  <button className="addq-upload-btn addq-upload-green" onClick={uploadTheory} disabled={!selectedFileTheory || loading}>
                    {loading ? <Loader2 className="addq-spin" size={15} /> : <Upload size={15} />}
                    <span>{loading ? 'Uploading...' : 'Upload Questions'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* JSON Schema Reference */}
          <div className="addq-schema-card">
            <div className="addq-schema-head">
              <div className="addq-schema-icon"><Target size={15} /></div>
              <h6 className="addq-schema-title">JSON Schema Reference</h6>
            </div>
            <div className="addq-schema-body">
              <div className="addq-schema-block">
                <div className="addq-schema-label"><span className="addq-dot blue" />MCQ</div>
                <pre>{`{\n  "content": "Q text",\n  "option1": "A", "option2": "B",\n  "option3": "C", "option4": "D",\n  "correct_answer": ["A"],\n  "questionType": "MCQ"\n}`}</pre>
              </div>
              <div className="addq-schema-block">
                <div className="addq-schema-label"><span className="addq-dot cyan" />True / False</div>
                <pre>{`{\n  "content": "Statement",\n  "option1": "True",\n  "option2": "False",\n  "correct_answer": ["True"],\n  "questionType": "TRUE_FALSE"\n}`}</pre>
              </div>
              <div className="addq-schema-block">
                <div className="addq-schema-label"><span className="addq-dot purple" />Matching</div>
                <pre>{`{\n  "content": "Instructions",\n  "matchingPairs": [\n    {"prompt":"HTTP 404",\n     "answer":"Not Found",\n     "pairOrder":0}\n  ],\n  "questionType": "MATCHING"\n}`}</pre>
              </div>
              <div className="addq-schema-block">
                <div className="addq-schema-label"><span className="addq-dot green" />Theory</div>
                <pre>{`{\n  "quesNo": "Q1",\n  "question": "Explain...",\n  "marks": 5,\n  "evaluationCriteria": "..."\n}`}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        .addq-page { font-family:'Inter',sans-serif; color:#1e293b; min-height:100vh; background:#f0f2f8; padding-bottom:60px; }
        .animate-fade-in { animation:fadeIn .3s ease-out; }
        @keyframes fadeIn { from { opacity:0;transform:translateY(6px); } to { opacity:1;transform:translateY(0); } }
        .addq-spin { animation:spin 1s linear infinite; }
        @keyframes spin { to { transform:rotate(360deg); } }

        /* Top bar */
        .addq-topbar { display:flex; align-items:center; padding:12px 28px; background:#fff; border-bottom:1px solid #e8eaf0; position:sticky; top:0; z-index:50; }
        .addq-topbar-left { display:flex; align-items:center; gap:16px; }
        .addq-back-btn { display:flex; align-items:center; gap:7px; background:none; border:1.5px solid #e2e8f0; border-radius:8px; padding:8px 14px; font-size:13px; font-weight:600; color:#64748b; cursor:pointer; transition:.2s; }
        .addq-back-btn:hover { background:#f8fafc; color:#5156be; border-color:#5156be; }
        .addq-breadcrumb { display:flex; align-items:center; gap:6px; font-size:12px; color:#94a3b8; font-weight:500; }
        .addq-bc-active { color:#5156be; font-weight:700; }

        /* Banner */
        .addq-banner { display:flex; align-items:center; gap:18px; margin:24px 28px 0; padding:20px 24px; background:#fff; border-radius:14px; border:1px solid #e2e8f0; box-shadow:0 2px 12px -4px rgba(0,0,0,.06); }
        .addq-banner-icon { width:48px; height:48px; border-radius:13px; background:linear-gradient(135deg,#5156be,#7c3aed); color:#fff; display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow:0 4px 12px rgba(81,86,190,.3); }
        .addq-banner-title { font-size:18px; font-weight:800; color:#1e293b; margin:0 0 6px; }
        .addq-banner-meta { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .addq-pill { background:#f1f5f9; color:#64748b; padding:4px 10px; border-radius:6px; font-size:11px; font-weight:700; }
        .addq-pill-type { background:#eef2ff; color:#5156be; }

        /* Tab bar */
        .addq-tab-bar { display:flex; margin:20px 28px 0; background:#fff; border-radius:12px; border:1px solid #e2e8f0; padding:6px; gap:6px; }
        .addq-tab { flex:1; display:flex; align-items:center; justify-content:center; gap:8px; background:transparent; border:none; padding:12px; font-size:14px; font-weight:700; color:#64748b; border-radius:8px; cursor:pointer; transition:.2s; }
        .addq-tab:hover { background:#f8fafc; color:#1e293b; }
        .addq-tab.active { background:#5156be; color:#fff; box-shadow:0 4px 12px rgba(81,86,190,.25); }

        /* Two-column layout */
        .addq-layout { display:grid; grid-template-columns:1fr 300px; gap:20px; padding:20px 28px; align-items:start; }
        .addq-main { display:flex; flex-direction:column; gap:20px; }
        .addq-sidebar { display:flex; flex-direction:column; gap:16px; }

        /* Cards */
        .addq-card { background:#fff; border-radius:16px; border:1px solid #e2e8f0; box-shadow:0 4px 20px -4px rgba(0,0,0,.06); overflow:hidden; }
        .addq-card-head { display:flex; align-items:center; gap:14px; padding:20px 24px; border-bottom:1px solid #f1f5f9; }
        .addq-head-blue  { background:linear-gradient(135deg,#fafbff,#f0f4ff); }
        .addq-head-green { background:linear-gradient(135deg,#f0fdf9,#f0fdf4); }
        .addq-card-head-icon { width:38px; height:38px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .addq-card-head-icon.blue  { background:#eef2ff; color:#5156be; }
        .addq-card-head-icon.green { background:#dcfce7; color:#16a34a; }
        .addq-card-title { font-size:15px; font-weight:800; color:#1e293b; margin:0 0 2px; }
        .addq-card-sub   { font-size:12px; color:#94a3b8; margin:0; font-weight:500; }
        .addq-change-btn { display:flex; align-items:center; gap:6px; background:#f8fafc; border:1.5px solid #e2e8f0; border-radius:8px; padding:7px 12px; font-size:12px; font-weight:700; color:#64748b; cursor:pointer; transition:.2s; margin-left:auto; flex-shrink:0; }
        .addq-change-btn:hover { background:#fef2f2; border-color:#fca5a5; color:#dc2626; }

        /* Type selection */
        .addq-type-grid { display:flex; flex-direction:column; gap:10px; padding:20px 24px; }
        .addq-type-card { display:flex; align-items:center; gap:16px; padding:18px 20px; border-radius:12px; border:1.5px solid #e2e8f0; background:#fff; cursor:pointer; transition:.25s; text-align:left; width:100%; }
        .addq-type-card:hover { border-color:var(--tc); background:var(--tb); transform:translateX(4px); box-shadow:0 4px 16px -4px rgba(0,0,0,.1); }
        .addq-type-icon-wrap { width:46px; height:46px; border-radius:12px; background:var(--tb); color:var(--tc); display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:.25s; }
        .addq-type-card:hover .addq-type-icon-wrap { background:var(--tc); color:#fff; }
        .addq-type-texts { flex:1; display:flex; flex-direction:column; gap:3px; }
        .addq-type-label { font-size:14px; font-weight:800; color:#1e293b; }
        .addq-type-sub   { font-size:12px; color:#94a3b8; font-weight:500; }
        .addq-type-arrow { color:#cbd5e1; transition:.2s; flex-shrink:0; }
        .addq-type-card:hover .addq-type-arrow { color:var(--tc); transform:translateX(3px); }

        /* Form body */
        .addq-form-body { padding:24px; display:flex; flex-direction:column; gap:20px; }
        .addq-field { display:flex; flex-direction:column; gap:8px; }
        .addq-label { font-size:10.5px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:.06em; display:flex; align-items:center; gap:5px; }
        .addq-optional { font-size:10px; font-weight:500; text-transform:none; color:#94a3b8; letter-spacing:0; margin-left:6px; }
        .addq-input { width:100%; padding:11px 14px; font-size:14px; font-weight:500; color:#1e293b; background:#f8fafc; border:1.5px solid #e2e8f0; border-radius:10px; transition:.2s; outline:none; font-family:'Inter',sans-serif; box-sizing:border-box; }
        .addq-input:hover  { border-color:#c7d2fe; }
        .addq-input:focus  { border-color:#5156be; background:#fff; box-shadow:0 0 0 4px rgba(81,86,190,.1); }
        .addq-textarea { resize:vertical; line-height:1.6; }
        .addq-textarea-dashed { border-style:dashed; }
        .addq-input-center { text-align:center; font-weight:700; font-size:17px; }
        .addq-field-hint { font-size:12px; color:#64748b; margin:0; font-weight:500; }

        /* MCQ options */
        .addq-options-list { display:flex; flex-direction:column; gap:8px; }
        .addq-option-row { display:flex; align-items:center; gap:10px; background:#f8fafc; border:1.5px solid #e2e8f0; border-radius:10px; padding:8px 10px; transition:.2s; }
        .addq-option-row.correct { border-color:#10b981; background:#f0fdf4; }
        .addq-opt-badge { width:26px; height:26px; border-radius:7px; background:#e2e8f0; color:#64748b; font-size:11px; font-weight:800; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .addq-option-row.correct .addq-opt-badge { background:#10b981; color:#fff; }
        .addq-opt-input { flex:1; background:transparent; border:none; outline:none; font-size:14px; font-weight:500; color:#1e293b; font-family:'Inter',sans-serif; }
        .addq-correct-btn { width:30px; height:30px; border-radius:7px; border:1.5px solid #e2e8f0; background:#fff; color:#94a3b8; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:.2s; flex-shrink:0; }
        .addq-correct-btn:hover { border-color:#10b981; color:#10b981; background:#f0fdf4; }
        .addq-correct-btn.selected { background:#10b981; border-color:#10b981; color:#fff; }
        .addq-answer-tags { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-top:4px; }
        .addq-sa-label { font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; }
        .addq-sa-tag { background:#dcfce7; color:#16a34a; padding:4px 10px; border-radius:6px; font-size:12px; font-weight:700; }

        /* True/False */
        .addq-tf-row { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        .addq-tf-btn { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; padding:30px 16px; border-radius:14px; border:2px solid #e2e8f0; background:#fff; font-size:16px; font-weight:800; color:#64748b; cursor:pointer; transition:.25s; }
        .addq-tf-btn:hover { border-color:#5156be; color:#5156be; background:#eef2ff; transform:translateY(-2px); }
        .addq-tf-circle { width:46px; height:46px; border-radius:50%; background:#f1f5f9; color:#94a3b8; display:flex; align-items:center; justify-content:center; transition:.25s; }
        .addq-tf-btn.selected-true  { border-color:#10b981; background:#f0fdf4; color:#16a34a; box-shadow:0 6px 18px rgba(16,185,129,.15); }
        .addq-tf-btn.selected-true .addq-tf-circle  { background:#10b981; color:#fff; }
        .addq-tf-btn.selected-false { border-color:#ef4444; background:#fef2f2; color:#dc2626; box-shadow:0 6px 18px rgba(239,68,68,.12); }
        .addq-tf-btn.selected-false .addq-tf-circle { background:#ef4444; color:#fff; }

        /* Matching */
        .addq-matching-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
        .addq-add-pair-btn { display:flex; align-items:center; gap:6px; background:#eef2ff; color:#5156be; border:1.5px solid #c7d2fe; border-radius:8px; padding:7px 12px; font-size:12px; font-weight:700; cursor:pointer; transition:.2s; }
        .addq-add-pair-btn:hover { background:#5156be; color:#fff; border-color:#5156be; }
        .addq-empty-pairs { display:flex; flex-direction:column; align-items:center; gap:10px; padding:32px; border:2px dashed #e2e8f0; border-radius:12px; color:#94a3b8; font-size:13px; font-weight:500; cursor:pointer; transition:.2s; text-align:center; }
        .addq-empty-pairs:hover { border-color:#5156be; color:#5156be; background:#f5f7ff; }
        .addq-pairs-list { display:flex; flex-direction:column; gap:8px; }
        .addq-pairs-header { display:grid; grid-template-columns:24px 1fr 28px 1fr 32px; gap:8px; align-items:center; padding:0 2px 4px; }
        .addq-col-label { font-size:10px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:.05em; }
        .addq-col-prompt { grid-column:2; }
        .addq-col-answer { grid-column:4; }
        .addq-pair-row { display:grid; grid-template-columns:24px 1fr 28px 1fr 32px; gap:8px; align-items:center; background:#f8fafc; border:1.5px solid #e2e8f0; border-radius:10px; padding:8px 10px; transition:.2s; }
        .addq-pair-row:focus-within { border-color:#7c3aed; background:#faf5ff; }
        .addq-pair-num { font-size:11px; font-weight:700; color:#94a3b8; text-align:center; }
        .addq-pair-input { background:transparent; border:none; outline:none; font-size:13px; font-weight:500; color:#1e293b; font-family:'Inter',sans-serif; width:100%; }
        .addq-pair-arrow { color:#94a3b8; font-size:16px; text-align:center; font-weight:700; }
        .addq-remove-pair { width:28px; height:28px; border-radius:7px; border:none; background:transparent; color:#94a3b8; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:.2s; }
        .addq-remove-pair:hover { background:#fef2f2; color:#dc2626; }

        /* Answer hint */
        .addq-answer-hint { display:flex; align-items:flex-start; gap:8px; background:#f0f9ff; border:1px dashed #bae6fd; border-radius:8px; padding:10px 14px; font-size:12px; color:#0369a1; font-weight:500; }
        .addq-answer-hint code { background:#dbeafe; padding:1px 5px; border-radius:4px; font-size:11px; }

        /* Theory top row */
        .addq-theory-top { display:flex; gap:14px; }

        /* Submit buttons */
        .addq-submit-btn { display:flex; align-items:center; justify-content:center; gap:9px; background:linear-gradient(135deg,#5156be,#7c3aed); color:#fff; border:none; padding:14px 28px; border-radius:12px; font-size:14px; font-weight:700; cursor:pointer; transition:.3s; box-shadow:0 6px 20px -4px rgba(81,86,190,.45); font-family:'Inter',sans-serif; width:100%; }
        .addq-submit-btn:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 10px 28px -4px rgba(81,86,190,.5); }
        .addq-submit-btn:disabled { opacity:.6; cursor:not-allowed; }
        .addq-submit-green  { background:linear-gradient(135deg,#10b981,#059669); box-shadow:0 6px 20px -4px rgba(16,185,129,.4); }
        .addq-submit-green:hover:not(:disabled)  { box-shadow:0 10px 28px -4px rgba(16,185,129,.45); }
        .addq-submit-purple { background:linear-gradient(135deg,#7c3aed,#6d28d9); box-shadow:0 6px 20px -4px rgba(124,58,237,.4); }
        .addq-submit-purple:hover:not(:disabled) { box-shadow:0 10px 28px -4px rgba(124,58,237,.45); }

        /* Dark sidebar card */
        .addq-dark-card { background:#1e293b; border-radius:16px; color:#fff; overflow:hidden; position:relative; }
        .addq-dark-card::before { content:''; position:absolute; top:-30px; right:-30px; width:150px; height:150px; background:radial-gradient(circle,rgba(81,86,190,.3) 0%,transparent 70%); border-radius:50%; pointer-events:none; }
        .addq-dark-head { padding:18px 20px; border-bottom:1px solid rgba(255,255,255,.06); display:flex; align-items:center; gap:12px; position:relative; z-index:2; }
        .addq-dark-icon { width:32px; height:32px; background:rgba(255,255,255,.08); border-radius:8px; display:flex; align-items:center; justify-content:center; }
        .addq-dark-title { font-size:13px; font-weight:800; margin:0; }
        .addq-dark-body { padding:18px 20px; position:relative; z-index:2; display:flex; flex-direction:column; gap:12px; }
        .addq-dark-fields { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .addq-dark-field label { display:block; font-size:10px; font-weight:700; color:rgba(255,255,255,.4); text-transform:uppercase; letter-spacing:.05em; margin-bottom:5px; }
        .addq-dark-field input { width:100%; background:rgba(0,0,0,.25); border:1px solid rgba(255,255,255,.08); border-radius:8px; padding:10px; color:#fff; font-size:14px; font-weight:700; text-align:center; outline:none; box-sizing:border-box; font-family:'Inter',sans-serif; }
        .addq-dark-field input:focus { border-color:rgba(255,255,255,.2); }

        .addq-dropzone { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; height:130px; border:2px dashed rgba(255,255,255,.13); border-radius:12px; cursor:pointer; transition:.2s; color:rgba(255,255,255,.45); }
        .addq-dropzone:hover { border-color:#5156be; color:rgba(255,255,255,.8); background:rgba(81,86,190,.05); }
        .addq-dropzone-green:hover { border-color:#10b981; }
        .addq-dz-title { font-size:12px; font-weight:700; color:#fff; text-align:center; word-break:break-all; }
        .addq-dz-sub   { font-size:10px; color:rgba(255,255,255,.3); }

        .addq-staging { background:rgba(0,0,0,.2); border:1px solid rgba(255,255,255,.05); border-radius:9px; padding:10px 12px; }
        .addq-staging-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:7px; font-size:10px; font-weight:700; text-transform:uppercase; color:rgba(255,255,255,.4); }
        .addq-staging-badge { background:rgba(81,86,190,.25); color:#a5b4fc; padding:2px 8px; border-radius:8px; font-size:10px; }
        .addq-sb-green      { background:rgba(16,185,129,.2); color:#6ee7b7; }
        .addq-staging-row { font-size:11px; color:rgba(255,255,255,.6); padding:5px 0; border-bottom:1px solid rgba(255,255,255,.04); }
        .addq-staging-row:last-child { border-bottom:none; }

        .addq-upload-btn { display:flex; align-items:center; justify-content:center; gap:8px; width:100%; padding:11px; border-radius:9px; border:none; background:linear-gradient(135deg,#5156be,#7c3aed); color:#fff; font-size:13px; font-weight:700; cursor:pointer; transition:.2s; font-family:'Inter',sans-serif; }
        .addq-upload-btn:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 6px 20px rgba(81,86,190,.4); }
        .addq-upload-btn:disabled { opacity:.5; cursor:not-allowed; }
        .addq-upload-green { background:linear-gradient(135deg,#10b981,#059669); }
        .addq-upload-green:hover:not(:disabled) { box-shadow:0 6px 20px rgba(16,185,129,.4); }

        /* Schema card */
        .addq-schema-card { background:#fff; border-radius:16px; border:1px solid #e2e8f0; overflow:hidden; }
        .addq-schema-head { display:flex; align-items:center; gap:10px; padding:14px 18px; border-bottom:1px solid #e2e8f0; }
        .addq-schema-icon { width:28px; height:28px; border-radius:7px; background:#f1f5f9; color:#64748b; display:flex; align-items:center; justify-content:center; }
        .addq-schema-title { font-size:12px; font-weight:800; color:#1e293b; margin:0; }
        .addq-schema-body { padding:14px 16px; display:flex; flex-direction:column; gap:10px; }
        .addq-schema-block { background:#f8fafc; border:1px solid #e2e8f0; border-radius:9px; overflow:hidden; }
        .addq-schema-label { display:flex; align-items:center; gap:7px; padding:7px 12px; font-size:10px; font-weight:700; color:#475569; text-transform:uppercase; letter-spacing:.05em; border-bottom:1px solid #e2e8f0; background:#fff; }
        .addq-schema-block pre { margin:0; padding:10px 12px; font-size:10.5px; color:#64748b; font-family:'JetBrains Mono','Fira Code',monospace; line-height:1.55; overflow-x:auto; }
        .addq-dot { width:7px; height:7px; border-radius:50%; display:inline-block; flex-shrink:0; }
        .addq-dot.blue   { background:#5156be; }
        .addq-dot.cyan   { background:#0891b2; }
        .addq-dot.purple { background:#7c3aed; }
        .addq-dot.green  { background:#10b981; }

        /* Responsive */
        @media (max-width:1024px) {
          .addq-layout { grid-template-columns:1fr; }
          .addq-sidebar { display:grid; grid-template-columns:1fr 1fr; }
          .addq-schema-card { grid-column:span 2; }
        }
        @media (max-width:768px) {
          .addq-layout { padding:16px; }
          .addq-banner { margin:16px 16px 0; padding:16px; }
          .addq-tab-bar { margin:14px 16px 0; }
          .addq-topbar { padding:10px 16px; }
          .addq-breadcrumb { display:none; }
          .addq-form-body { padding:16px; gap:16px; }
          .addq-sidebar { grid-template-columns:1fr; }
          .addq-schema-card { grid-column:span 1; }
          .addq-theory-top { flex-direction:column; }
          .addq-pairs-header { display:none; }
          .addq-pair-row { grid-template-columns:20px 1fr 24px 1fr 28px; gap:6px; }
        }
        @media (max-width:480px) {
          .addq-tf-row { grid-template-columns:1fr 1fr; }
          .addq-banner-title { font-size:15px; }
          .addq-dark-fields { grid-template-columns:1fr; }
          .addq-pair-row { grid-template-columns:1fr 22px 1fr 26px; }
          .addq-pair-num { display:none; }
        }
      `}</style>
    </div>
  );
}
