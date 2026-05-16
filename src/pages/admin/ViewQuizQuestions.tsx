import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  getQuestionsForAdmin, getQuestionsForLecturer, getTheoryQuestions, getNumberOfTheoryToAnswer,
  getQuestion, updateQuestion, deleteQuestion,
  getTheoryQuestion, updateTheoryQuestion, deleteTheoryQuestion,
  setCompulsoryQuestion, updateNumberOfTheoryToAnswer
} from '../../api/endpoints';
import Swal from 'sweetalert2';
import toast, { Toaster } from 'react-hot-toast';
import {
  Plus, Edit, Trash2, Settings, List, Lock, Unlock, Eye, EyeOff,
  ShieldCheck, Clock, Layers, X, Save, AlertCircle, BookOpen,
  Info, CheckCircle, HelpCircle, ChevronRight, FileText, Loader2,
  ArrowLeft, GripVertical, Award, Target, Hash, Zap, Cpu, Activity,
  ChevronDown, MinusCircle, PlusCircle, Check
} from 'lucide-react';

export default function ViewQuizQuestions({ adminMode = true }: { adminMode?: boolean }) {
  const { qId, qTitle } = useParams();
  const navigate = useNavigate();
  const basePath = adminMode ? '/admin' : '/lect';
  const roleName = adminMode ? 'Admin' : 'Lecturer';

  const [questions, setQuestions] = useState<any[]>([]);
  const [sectionB, setSectionB] = useState<any[]>([]);
  const [numberOfquestionsToAnswers, setNqta] = useState<any[]>([]);
  const [compulsoryPrefixes, setCompulsory] = useState<Record<string, boolean>>({});
  const [isUpdatingCompulsory, setUpdating] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [editObjModal, setEditObjModal] = useState(false);
  const [specificObj, setSpecificObj] = useState<any>({ questionType: 'MCQ', correctAnswer: [], matchingPairs: [] });
  const [editTheoryModal, setEditTheoryModal] = useState(false);
  const [theory, setTheory] = useState<any>({});
  const [editCountModal, setEditCountModal] = useState(false);
  const [countData, setCountData] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [isModalLoading, setIsModalLoading] = useState(false);

  useEffect(() => {
    if (editObjModal || editTheoryModal || editCountModal) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [editObjModal, editTheoryModal, editCountModal]);

  const loadData = async () => {
    if (!qId) return;
    setIsLoading(true);
    try {
      const getObj = adminMode ? getQuestionsForAdmin : getQuestionsForLecturer;
      const [objQ, theoryQ, countQ] = await Promise.all([
        getObj(qId),
        getTheoryQuestions(qId),
        getNumberOfTheoryToAnswer(qId)
      ]);
      setQuestions(objQ);
      setSectionB(theoryQ);
      setNqta(countQ);
      initCompulsory(theoryQ);
    } catch (err) {
      console.error("LoadData failure:", err);
    } finally { setIsLoading(false); }
  };

  useEffect(() => { loadData(); }, [qId]);

  const initCompulsory = (data: any[]) => {
    const map: Record<string, boolean> = {};
    const prefixes = getPrefixes(data);
    prefixes.forEach(p => {
      const qs = data.filter(q => q.quesNo?.startsWith(p));
      map[p] = qs.some((q: any) => q.compulsory === true || q.isCompulsory === true);
    });
    setCompulsory(map);
  };

  const getPrefixes = (data?: any[]) => {
    const src = data ?? sectionB;
    const set = new Set<string>();
    src.forEach(q => { const m = q.quesNo?.match(/^Q\d+/)?.[0]; if (m) set.add(m); });
    return Array.from(set).sort();
  };

  const getGrouped = (prefix: string) => sectionB.filter(q => q.quesNo?.startsWith(prefix));

  const onCompulsoryChange = (prefix: string, checked: boolean) => {
    setCompulsory(m => ({ ...m, [prefix]: checked }));
    setUpdating(m => ({ ...m, [prefix]: true }));
    setCompulsoryQuestion(qId!, prefix, checked).then(() => {
      toast.success(`${prefix} enforcement updated`);
    }).catch(() => {
      setCompulsory(m => ({ ...m, [prefix]: !checked }));
      toast.error(`Sync failed`);
    }).finally(() => setUpdating(m => ({ ...m, [prefix]: false })));
  };

  const openUpdateObj = async (idParam: any, fallbackType?: string) => {
    const idToUse = idParam;
    console.log("Immediate Modal Trigger for ID:", idToUse);

    // Clear previous and open immediately
    setSpecificObj({ questionType: (fallbackType || 'MCQ').toUpperCase(), correctAnswer: [], matchingPairs: [] });
    setEditObjModal(true);
    setIsModalLoading(true);

    if (!idToUse) {
      toast.error("Invalid item identifier - missing ID");
      setIsModalLoading(false);
      return;
    }

    try {
      const data = await getQuestion(idToUse);
      console.log("API Response received:", data);
      if (!data) throw new Error("No data returned");

      const cAns = data.correctAnswer || data.correct_answer || [];
      const rawType = data.questionType || data.question_type || fallbackType || 'MCQ';
      const qType = String(rawType).toUpperCase();

      setSpecificObj({
        ...data,
        questionType: qType,
        correctAnswer: Array.isArray(cAns) ? cAns : (cAns ? [cAns] : []),
        matchingPairs: Array.isArray(data.matchingPairs) ? data.matchingPairs.map((p: any) => ({ ...p })) : []
      });
    } catch (err) {
      console.error("Fetch failure:", err);
      toast.error('Could not sync with registry');
      setEditObjModal(false);
    } finally {
      setIsModalLoading(false);
    }
  };

  const updateObjQuestion = async () => {
    setSaving(true);
    const payload: any = {
      quesId: specificObj.quesId,
      content: specificObj.content,
      questionType: specificObj.questionType,
      correct_answer: specificObj.correctAnswer,
      marks: specificObj.marks
    };

    if (specificObj.questionType === 'MATCHING') {
      payload.matchingPairs = specificObj.matchingPairs.map((p: any, i: number) => ({ ...p, pairOrder: i }));
      payload.correct_answer = specificObj.matchingPairs.map((p: any) => p.answer);
    } else if (specificObj.questionType === 'TRUE_FALSE') {
      payload.option1 = 'True'; payload.option2 = 'False';
    } else {
      payload.option1 = specificObj.option1; payload.option2 = specificObj.option2;
      payload.option3 = specificObj.option3; payload.option4 = specificObj.option4;
    }

    try {
      await updateQuestion(payload);
      toast.success('Registry item updated');
      setEditObjModal(false);
      loadData();
    } catch { toast.error("Sync failed"); }
    setSaving(false);
  };

  const doDeleteQuestion = (quesId: number) => {
    Swal.fire({
      title: 'Purge Registry Item?',
      text: "This action cannot be undone.",
      icon: 'warning', showCancelButton: true, confirmButtonColor: '#fd625e', confirmButtonText: 'Yes, Purge Item'
    }).then(r => {
      if (!r.isConfirmed) return;
      deleteQuestion(quesId).then(() => {
        toast.success('Item purged');
        setQuestions(q => q.filter(q => q.quesId !== quesId));
      });
    });
  };

  const openUpdateTheory = async (idParam: any) => {
    const idToUse = idParam;
    console.log("Immediate Theory Modal Trigger for ID:", idToUse);

    setTheory({});
    setEditTheoryModal(true);
    setIsModalLoading(true);

    if (!idToUse) {
      toast.error("Invalid theory identifier");
      setIsModalLoading(false);
      return;
    }

    try {
      let data = await getTheoryQuestion(idToUse);
      // Handle array wrap or nested data if backend is inconsistent
      if (Array.isArray(data) && data.length > 0) data = data[0];
      if (data && data.data) data = data.data;

      // Validate data structure. If empty, force fallback to local.
      if (!data || typeof data !== 'object' || !data.quesNo) {
        throw new Error("Invalid or empty data from API");
      }

      setTheory({ ...data, marks: data.marks ?? 0 });
    } catch (err) {
      console.warn("Falling back to local theory data:", err);
      const local = sectionB.find(q => String(q.tqId || q.id || q.quesId || q.theoryId) === String(idToUse));
      if (local) {
        setTheory({ ...local, marks: local.marks ?? 0 });
      } else {
        toast.error("Failed to sync protocol");
        setEditTheoryModal(false);
      }
    } finally {
      setIsModalLoading(false);
    }
  };

  const updateTheoryAction = async () => {
    setSaving(true);
    try {
      await updateTheoryQuestion(theory);
      toast.success('Theory protocol updated');
      setEditTheoryModal(false);
      loadData();
    } catch { toast.error("Sync failed"); }
    setSaving(false);
  };

  const doDeleteTheoryAction = (tqId: number) => {
    Swal.fire({
      title: 'Purge Theory Protocol?',
      text: "Permanent removal from the registry.",
      icon: 'warning', showCancelButton: true, confirmButtonColor: '#fd625e', confirmButtonText: 'Yes, Purge Protocol'
    }).then(r => {
      if (!r.isConfirmed) return;
      deleteTheoryQuestion(tqId).then(() => {
        toast.success('Protocol purged');
        setSectionB(b => b.filter(q => q.tqId !== tqId));
      });
    });
  };

  const openUpdateCount = async () => {
    try {
      const data = await getNumberOfTheoryToAnswer(qId!);
      setCountData(Array.isArray(data) ? data : []);
      setEditCountModal(true);
    } catch { }
  };

  const updateCountAction = async () => {
    setSaving(true);
    try {
      await updateNumberOfTheoryToAnswer(countData[0]);
      toast.success('Section B logistics updated');
      setEditCountModal(false);
      loadData();
    } catch { toast.error('Sync failed'); }
    setSaving(false);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', overflowX: 'hidden' }} className="minia-page animate-fade-in">
      <Toaster position="top-right" />

      <div className="vqq-page-header mb-4">
        <div>
          <h4 className="page-title mb-0 font-size-18 fw-bold">Assessment Registry Console</h4>
          <div className="breadcrumb m-0 font-size-13 text-muted">
            <span>{roleName} Portal</span> <ChevronRight size={12} className="mx-1" /> <span>Registry</span>
          </div>
        </div>
        <div className="vqq-header-actions">
          <Link to={`${basePath}/quizzes`} className="btn-light-custom d-flex align-items-center gap-2">
            <ArrowLeft size={16} /> <span>Registry</span>
          </Link>
          <Link to={`${basePath}/add-question/${qId}/${qTitle}`} className="btn-primary-custom d-flex align-items-center gap-2">
            <Plus size={18} /> <span>Add Items</span>
          </Link>
        </div>
      </div>

      <div className="minia-card shadow-sm mb-5 overflow-hidden">
        <div className="card-body p-4 bg-light-subtle">
          <div className="d-flex align-items-center gap-4">
            <div className="avatar-md flex-shrink-0">
              <span className="avatar-title rounded-circle bg-soft-primary text-primary shadow-sm">
                <Cpu size={28} />
              </span>
            </div>
            <div>
              <h4 className="font-size-20 mb-1 fw-bold text-dark">{qTitle}</h4>
              <div className="d-flex align-items-center gap-3">
                <span className="badge badge-soft-primary px-3 py-1 font-size-11 fw-bold">ID: {qId}</span>
                <span className="text-muted font-size-12 fw-medium text-uppercase letter-spacing-1">Master Registry Node</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '380px', gap: '20px' }}>
          <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'rgba(81,86,190,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 style={{ animation: 'spin 1s linear infinite', color: '#5156be' }} size={36} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#2a3142', fontWeight: 700, fontSize: '15px', margin: '0 0 4px' }}>Retrieving Assessment Bank...</p>
            <p style={{ color: '#74788d', fontSize: '13px', margin: 0 }}>Please wait while we load the questions</p>
          </div>
        </div>
      ) : questions.length === 0 && getPrefixes().length === 0 ? (
        <div className="minia-card text-center py-5">
          <div className="avatar-lg mx-auto mb-4">
            <div className="avatar-title bg-light rounded-circle text-muted h1 m-0">
              <Target size={48} />
            </div>
          </div>
          <h5 className="font-size-18 fw-bold">Registry Empty</h5>
          <p className="text-muted w-50 mx-auto">No assessment protocols established for this node.</p>
          <button className="btn-primary-custom mt-3" onClick={() => navigate(`${basePath}/add-question/${qId}/${qTitle}`)}>Launch Setup</button>
        </div>
      ) : (
        <div className="d-flex flex-column gap-5">
          {/* SECTION A */}
          {questions.length > 0 && (
            <div className="registry-section">
              <div className="d-flex align-items-center gap-3 mb-4 ps-2">
                <div className="avatar-xs flex-shrink-0">
                  <span className="avatar-title rounded-circle bg-soft-primary text-primary">
                    <Layers size={18} />
                  </span>
                </div>
                <div>
                  <h6 className="mb-0 font-size-15 fw-bold text-dark">Section A: Objective Inventory</h6>
                  <span className="text-muted font-size-12 fw-medium">{questions.length} Active Items</span>
                </div>
              </div>

              <div className="vqq-obj-grid">
                {questions.map((q, i) => {
                  const isMatching = (q.questionType || '').toUpperCase() === 'MATCHING';
                  const isTF = (q.questionType || '').toUpperCase() === 'TRUE_FALSE';
                  const typeLabel = isMatching ? 'Matching' : isTF ? 'True / False' : 'MCQ';
                  const headerGrad = isMatching
                    ? 'linear-gradient(135deg,#5156be 0%,#3d41a8 100%)'
                    : isTF
                    ? 'linear-gradient(135deg,#2ab57d 0%,#1a9666 100%)'
                    : 'linear-gradient(135deg,#4ba3ff 0%,#2b7de9 100%)';
                  const accentColor = isMatching ? '#5156be' : isTF ? '#2ab57d' : '#4ba3ff';
                  const correctAnswers = q.correctAnswer ?? q.correct_answer ?? [];

                  return (
                    <div key={q.quesId} className="vqq-obj-card">
                      {/* Colored Header */}
                      <div className="vqq-obj-header" style={{ background: headerGrad }}>
                        <div className="d-flex align-items-center gap-2">
                          <span className="vqq-obj-num">#{i + 1}</span>
                          <span className="vqq-obj-type">{typeLabel}</span>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <button className="vqq-hdr-btn" title="Edit" onClick={() => openUpdateObj(q.quesId || q.id || q.qId, q.questionType)}>
                            <Edit size={14} />
                          </button>
                          <button className="vqq-hdr-btn vqq-hdr-btn-danger" title="Delete" onClick={() => doDeleteQuestion(q.quesId || q.id || q.qId)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Body: Question */}
                      <div className="vqq-obj-body">
                        <p className="vqq-obj-question" dangerouslySetInnerHTML={{ __html: q.content }} />

                        {/* MCQ Options */}
                        {!isMatching && !isTF && (
                          <div className="vqq-opts-list">
                            {['option1','option2','option3','option4'].map((optKey, idx) => {
                              const optVal = q[optKey];
                              if (!optVal) return null;
                              const isCorrect = correctAnswers.includes(optVal);
                              return (
                                <div key={idx} className={`vqq-opt ${isCorrect ? 'vqq-opt-correct' : ''}`} style={isCorrect ? { borderColor: accentColor, background: `${accentColor}12` } : {}}>
                                  <span className="vqq-opt-letter" style={isCorrect ? { background: accentColor, color: '#fff' } : { background: `${accentColor}18`, color: accentColor }}>{String.fromCharCode(65 + idx)}</span>
                                  <span className="vqq-opt-text">{optVal}</span>
                                  {isCorrect && <CheckCircle size={14} style={{ color: accentColor, flexShrink: 0 }} />}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* True/False */}
                        {isTF && (
                          <div className="vqq-tf-row">
                            {['True','False'].map((val, idx) => {
                              const isCorrect = correctAnswers.includes(val);
                              const tfColor = val === 'True' ? '#2ab57d' : '#fd625e';
                              return (
                                <div key={idx} className="vqq-tf-btn" style={isCorrect ? { background: tfColor, color: '#fff', borderColor: tfColor } : { borderColor: '#e9ecef', color: '#74788d' }}>
                                  {isCorrect && <CheckCircle size={14} />}
                                  <span>{val}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Matching */}
                        {isMatching && q.matchingPairs && q.matchingPairs.length > 0 && (
                          <div className="vqq-match-list">
                            {q.matchingPairs.map((pair: any, idx: number) => (
                              <div key={idx} className="vqq-match-row">
                                <span className="vqq-match-prompt">{pair.prompt}</span>
                                <ChevronRight size={12} style={{ color: '#adb5bd', flexShrink: 0 }} />
                                <span className="vqq-match-answer" style={{ color: accentColor }}>{pair.answer}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Footer: Marks */}
                      <div className="vqq-obj-footer">
                        <div className="vqq-marks-pill" style={{ background: `${accentColor}15`, color: accentColor }}>
                          <Award size={13} />
                          <span className="fw-bold">{q.marks}</span>
                          <span className="font-size-10 fw-medium">pts</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION B */}
          {getPrefixes().length > 0 && (
            <div className="registry-section">
              <div className="d-flex align-items-center gap-3 mb-4 ps-2">
                <div className="avatar-xs flex-shrink-0">
                  <span className="avatar-title rounded-circle bg-soft-success text-success">
                    <FileText size={18} />
                  </span>
                </div>
                <div>
                  <h6 className="mb-0 font-size-15 fw-bold text-dark">Section B: Theory Protocol</h6>
                  <span className="text-muted font-size-12 fw-medium">Theoretical Assessment Schema</span>
                </div>
              </div>

              {/* Logistics Widget - Compact Banner */}
              {numberOfquestionsToAnswers.length > 0 && (
                <div className="minia-card bg-dark text-white shadow-sm mb-4 overflow-hidden" style={{ borderRadius: '12px' }}>
                  <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center p-3 px-4 position-relative z-index-2">
                    <div className="d-flex flex-wrap gap-4 align-items-center mb-3 mb-md-0">
                      <div className="d-flex align-items-center gap-3">
                        <div className="avatar-xs rounded-circle bg-white-soft text-white d-flex align-items-center justify-content-center">
                          <Target size={14} className="opacity-75" />
                        </div>
                        <div>
                          <span className="font-size-10 text-white-50 text-uppercase fw-bold letter-spacing-1 d-block lh-1">Requirement</span>
                          <span className="font-size-14 fw-bold">{numberOfquestionsToAnswers[0]?.totalQuestToAnswer} Items</span>
                        </div>
                      </div>
                      <div className="d-none d-md-block" style={{ width: '1px', height: '30px', background: 'rgba(255,255,255,0.1)' }} />
                      <div className="d-flex align-items-center gap-3">
                        <div className="avatar-xs rounded-circle bg-white-soft text-white d-flex align-items-center justify-content-center">
                          <Clock size={14} className="opacity-75" />
                        </div>
                        <div>
                          <span className="font-size-10 text-white-50 text-uppercase fw-bold letter-spacing-1 d-block lh-1">Duration</span>
                          <span className="font-size-14 fw-bold">{numberOfquestionsToAnswers[0]?.timeAllowed} Minutes</span>
                        </div>
                      </div>
                    </div>
                    <button className="btn btn-sm btn-light bg-white-soft text-white border-0 fw-bold px-3 d-flex align-items-center gap-2 transition-2 hover-scale" onClick={openUpdateCount}>
                      <Settings size={14} /> <span>Configure Logistics</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="vqq-theory-col">
                {getPrefixes().map(prefix => (
                  <div key={prefix} className="vqq-theory-card">
                    {/* Card Header */}
                    <div className="vqq-theory-header">
                      <div className="d-flex align-items-center gap-3">
                        <div className="vqq-group-badge">{prefix}</div>
                        <div>
                          <h6 className="mb-0 fw-bold text-white font-size-16">Group Protocol {prefix}</h6>
                          <span className="font-size-11 fw-medium text-uppercase" style={{ color: 'rgba(255,255,255,0.7)' }}>Theoretical Assessment Set &bull; {getGrouped(prefix).length} Questions</span>
                        </div>
                      </div>
                      <div className="d-flex align-items-center gap-3">
                        <div className="d-flex flex-column align-items-end">
                          <span className="font-size-9 fw-bold text-uppercase" style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '1px' }}>Status</span>
                          <span className="font-size-11 fw-bold text-white">{compulsoryPrefixes[prefix] ? 'MANDATORY' : 'OPTIONAL'}</span>
                        </div>
                        <div
                          onClick={() => !isUpdatingCompulsory[prefix] && onCompulsoryChange(prefix, !compulsoryPrefixes[prefix])}
                          className={`minia-switch ${compulsoryPrefixes[prefix] ? 'on' : ''}`}
                          style={{ cursor: 'pointer', background: compulsoryPrefixes[prefix] ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.15)' }}
                        >
                          <div className="switch-dot" />
                        </div>
                      </div>
                    </div>

                    {/* Questions */}
                    <div className="vqq-theory-body">
                      {getGrouped(prefix).map((q: any, idx: number) => (
                        <div key={q.tqId} className="vqq-theory-row">
                          <div className="vqq-q-num">
                            <span>{q.quesNo}</span>
                          </div>
                          <div className="vqq-q-content">
                            <div className="font-size-14 fw-bold text-dark lh-base mb-2" dangerouslySetInnerHTML={{ __html: q.question }} />
                            {q.evaluationCriteria && (
                              <div className="vqq-eval-box">
                                <div className="d-flex align-items-center gap-2 mb-1">
                                  <Target size={12} style={{ color: '#2ab57d' }} />
                                  <span className="font-size-10 fw-bold text-uppercase" style={{ color: '#2ab57d', letterSpacing: '0.8px' }}>Evaluation KPI</span>
                                </div>
                                <p className="font-size-12 text-muted mb-0 fw-medium">&ldquo;{q.evaluationCriteria}&rdquo;</p>
                              </div>
                            )}
                          </div>
                          <div className="vqq-q-actions">
                            <div className="vqq-marks-chip">
                              <span className="d-block font-size-18 fw-bold text-dark lh-1">{q.marks}</span>
                              <span className="font-size-9 text-muted fw-bold text-uppercase">PTS</span>
                            </div>
                            <div className="d-flex gap-2">
                              <button className="vqq-act-btn" style={{ color: '#4ba3ff' }} onClick={() => openUpdateTheory(q.tqId || q.id || q.quesId || q.theoryId)}><Edit size={14} /></button>
                              <button className="vqq-act-btn" style={{ color: '#fd625e' }} onClick={() => doDeleteTheoryAction(q.tqId || q.id || q.quesId || q.theoryId)}><Trash2 size={14} /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODALS */}
      {editObjModal && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '16px' }}>
          <div className="animate-scale-up" style={{ background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '520px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>

            {/* HEADER */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
              {isModalLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Loader2 style={{ animation: 'spin 1s linear infinite', color: '#5156be' }} size={18} />
                  <span style={{ fontWeight: 700, fontSize: '15px', color: '#2a3142' }}>Synchronizing...</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'rgba(81,86,190,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5156be' }}><Edit size={16} /></div>
                  <h5 style={{ margin: 0, fontWeight: 800, fontSize: '15px', color: '#2a3142' }}>Edit Objective Question</h5>
                </div>
              )}
              <button onClick={() => setEditObjModal(false)} style={{ width: 32, height: 32, borderRadius: '8px', border: '1px solid #e9ecef', background: '#f8f9fa', color: '#74788d', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
            </div>

            {/* BODY */}
            <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* Type + Marks */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ flex: 3, minWidth: 0 }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#74788d', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Question Type</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e9ecef', background: '#f8f9fa', height: '38px' }}>
                    <span style={{ background: '#5156be', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>{specificObj.questionType}</span>
                    <span style={{ fontSize: '12px', color: '#495057', fontWeight: 600 }}>
                      {(specificObj.questionType || '').toUpperCase() === 'MCQ' && 'Multiple Choice'}
                      {(specificObj.questionType || '').toUpperCase() === 'TRUE_FALSE' && 'True / False'}
                      {(specificObj.questionType || '').toUpperCase() === 'MATCHING' && 'Matching'}
                    </span>
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: '80px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#74788d', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Marks</label>
                  <input type="number" style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e9ecef', fontSize: '14px', fontWeight: 700, color: '#5156be', textAlign: 'center', height: '38px', boxSizing: 'border-box' }}
                    value={specificObj.marks || ''} onChange={e => setSpecificObj({ ...specificObj, marks: Number(e.target.value) })} placeholder="0" />
                </div>
              </div>

              {/* Question Text */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#74788d', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Question Text</label>
                <textarea style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e9ecef', fontSize: '13px', resize: 'vertical', minHeight: '70px', boxSizing: 'border-box', fontFamily: 'inherit', background: '#fafbff' }}
                  value={specificObj.content || ''} onChange={e => setSpecificObj({ ...specificObj, content: e.target.value })} placeholder="Enter the question text..." />
              </div>

              {/* MCQ Options */}
              {(specificObj.questionType || '').toUpperCase() === 'MCQ' && (
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#74788d', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Options <span style={{ fontSize: '10px', fontWeight: 400, textTransform: 'none', color: '#adb5bd' }}>(click circle to mark correct)</span></label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {['option1', 'option2', 'option3', 'option4'].map((opt, i) => {
                      const optVal = specificObj[opt];
                      const isSel = (specificObj.correctAnswer || []).includes(optVal);
                      return (
                        <div key={opt} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '8px', border: `1px solid ${isSel ? '#5156be' : '#e9ecef'}`, background: isSel ? 'rgba(81,86,190,0.06)' : '#fff' }}>
                          <button type="button" onClick={() => { if (!optVal) return; const cur = specificObj.correctAnswer || []; setSpecificObj({ ...specificObj, correctAnswer: isSel ? cur.filter((v: any) => v !== optVal) : [...cur, optVal] }); }}
                            style={{ width: 24, height: 24, borderRadius: '50%', border: 'none', background: isSel ? '#5156be' : '#f1f3fa', color: isSel ? '#fff' : '#74788d', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {isSel ? <Check size={12} strokeWidth={3} /> : <span style={{ fontSize: '9px', fontWeight: 700 }}>{String.fromCharCode(65 + i)}</span>}
                          </button>
                          <input style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '12px', fontWeight: 500, outline: 'none', minWidth: 0 }}
                            value={optVal || ''} onChange={e => setSpecificObj({ ...specificObj, [opt]: e.target.value })} placeholder={`Option ${String.fromCharCode(65 + i)}...`} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* True/False */}
              {(specificObj.questionType || '').toUpperCase() === 'TRUE_FALSE' && (
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#74788d', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Correct Answer</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {['True', 'False'].map(val => {
                      const isSel = (specificObj.correctAnswer || []).includes(val);
                      const color = val === 'True' ? '#2ab57d' : '#fd625e';
                      return (
                        <button key={val} type="button" onClick={() => setSpecificObj({ ...specificObj, correctAnswer: [val] })}
                          style={{ flex: 1, padding: '12px', borderRadius: '10px', border: `2px solid ${isSel ? color : '#e9ecef'}`, background: isSel ? `${color}10` : '#fff', color: isSel ? color : '#74788d', fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}>
                          {isSel ? (val === 'True' ? <CheckCircle size={18} /> : <X size={18} />) : <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid #ced4da' }} />}
                          {val.toUpperCase()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Matching */}
              {(specificObj.questionType || '').toUpperCase() === 'MATCHING' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#74788d', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Matching Pairs</label>
                    <span style={{ background: '#f1f3fa', color: '#5156be', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>{specificObj.matchingPairs?.length || 0} PAIRS</span>
                  </div>
                  <div style={{ background: '#f8f9fa', borderRadius: '10px', border: '1px solid #e9ecef', padding: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto', marginBottom: '8px' }}>
                      {(specificObj.matchingPairs || []).map((pair: any, idx: number) => (
                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 16px 1fr 28px', gap: '4px', alignItems: 'center', background: '#fff', padding: '6px 8px', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                          <input style={{ border: 'none', background: 'transparent', fontSize: '12px', fontWeight: 500, outline: 'none', minWidth: 0 }} value={pair.prompt} onChange={e => { const p = [...specificObj.matchingPairs]; p[idx].prompt = e.target.value; setSpecificObj({ ...specificObj, matchingPairs: p }); }} placeholder="Prompt..." />
                          <span style={{ color: '#adb5bd', fontSize: '10px', textAlign: 'center' }}>→</span>
                          <input style={{ border: 'none', background: 'transparent', fontSize: '12px', fontWeight: 600, color: '#5156be', outline: 'none', minWidth: 0 }} value={pair.answer} onChange={e => { const p = [...specificObj.matchingPairs]; p[idx].answer = e.target.value; setSpecificObj({ ...specificObj, matchingPairs: p }); }} placeholder="Match..." />
                          <button type="button" onClick={() => setSpecificObj({ ...specificObj, matchingPairs: specificObj.matchingPairs.filter((_: any, i: number) => i !== idx) })}
                            style={{ width: 24, height: 24, borderRadius: '50%', border: 'none', background: 'rgba(236,69,97,0.1)', color: '#ec4561', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={11} /></button>
                        </div>
                      ))}
                      {(!specificObj.matchingPairs || specificObj.matchingPairs.length === 0) && (
                        <div style={{ textAlign: 'center', padding: '16px', color: '#adb5bd', fontSize: '12px', border: '1px dashed #e9ecef', borderRadius: '8px' }}>No pairs yet</div>
                      )}
                    </div>
                    <button type="button" onClick={() => setSpecificObj({ ...specificObj, matchingPairs: [...(specificObj.matchingPairs || []), { prompt: '', answer: '' }] })}
                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px dashed #5156be', background: 'rgba(81,86,190,0.04)', color: '#5156be', fontWeight: 700, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <PlusCircle size={14} /> Add Pair
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* FOOTER */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '14px 20px', borderTop: '1px solid #f1f5f9', flexShrink: 0 }}>
              <button type="button" onClick={() => setEditObjModal(false)} style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid #e9ecef', background: '#fff', color: '#74788d', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Discard</button>
              <button type="button" onClick={updateObjQuestion} disabled={saving} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#5156be', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', opacity: saving ? 0.7 : 1 }}>
                {saving ? <Loader2 style={{ animation: 'spin 1s linear infinite' }} size={14} /> : <Save size={14} />}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>, document.body
      )}


      {editTheoryModal && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '16px' }}>
          <div className="animate-scale-up" style={{ background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '520px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>

            {/* HEADER */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
              {isModalLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Loader2 style={{ animation: 'spin 1s linear infinite', color: '#2ab57d' }} size={18} />
                  <span style={{ fontWeight: 700, fontSize: '15px', color: '#2a3142' }}>Synchronizing...</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'rgba(42,181,125,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2ab57d' }}><FileText size={16} /></div>
                  <h5 style={{ margin: 0, fontWeight: 800, fontSize: '15px', color: '#2a3142' }}>Edit Theory Question</h5>
                </div>
              )}
              <button onClick={() => setEditTheoryModal(false)} style={{ width: 32, height: 32, borderRadius: '8px', border: '1px solid #e9ecef', background: '#f8f9fa', color: '#74788d', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
            </div>

            {/* BODY */}
            <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* Question No + Marks */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ flex: 2, minWidth: 0 }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#74788d', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Question Number</label>
                  <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e9ecef', borderRadius: '8px', overflow: 'hidden' }}>
                    <span style={{ padding: '8px 12px', background: '#f8f9fa', color: '#74788d', fontWeight: 700, fontSize: '13px', borderRight: '1px solid #e9ecef', flexShrink: 0 }}>#</span>
                    <input style={{ flex: 1, padding: '8px 12px', border: 'none', outline: 'none', fontSize: '13px', fontWeight: 600, minWidth: 0 }}
                      value={theory.quesNo || ''} onChange={e => setTheory({ ...theory, quesNo: e.target.value })} placeholder="e.g. Q1, Q2" />
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: '90px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#74788d', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Marks</label>
                  <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e9ecef', borderRadius: '8px', overflow: 'hidden' }}>
                    <span style={{ padding: '8px 10px', background: '#f8f9fa', color: '#74788d', borderRight: '1px solid #e9ecef', display: 'flex', alignItems: 'center', flexShrink: 0 }}><Award size={13} /></span>
                    <input type="number" style={{ flex: 1, padding: '8px 10px', border: 'none', outline: 'none', fontSize: '14px', fontWeight: 700, color: '#2ab57d', textAlign: 'center', minWidth: 0 }}
                      value={theory.marks || 0} onChange={e => setTheory({ ...theory, marks: Number(e.target.value) })} placeholder="0" />
                  </div>
                </div>
              </div>

              {/* Question Text */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#74788d', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Theoretical Prompt</label>
                <textarea style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e9ecef', fontSize: '13px', resize: 'vertical', minHeight: '90px', boxSizing: 'border-box', fontFamily: 'inherit', background: '#fafbff', lineHeight: 1.6 }}
                  value={theory.question || ''} onChange={e => setTheory({ ...theory, question: e.target.value })} placeholder="Enter the question text..." />
              </div>

              {/* Evaluation Criteria */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#74788d', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                  <Target size={12} style={{ color: '#2ab57d' }} /> Evaluation Rubric
                </label>
                <textarea style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px dashed #c3e6cb', fontSize: '13px', resize: 'vertical', minHeight: '80px', boxSizing: 'border-box', fontFamily: 'inherit', background: '#f0faf5', lineHeight: 1.6 }}
                  value={theory.evaluationCriteria || ''} onChange={e => setTheory({ ...theory, evaluationCriteria: e.target.value })} placeholder="Key grading points..." />
              </div>
            </div>

            {/* FOOTER */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '14px 20px', borderTop: '1px solid #f1f5f9', flexShrink: 0 }}>
              <button type="button" onClick={() => setEditTheoryModal(false)} style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid #e9ecef', background: '#fff', color: '#74788d', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Discard</button>
              <button type="button" onClick={updateTheoryAction} disabled={saving} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#2ab57d', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', opacity: saving ? 0.7 : 1 }}>
                {saving ? <Loader2 style={{ animation: 'spin 1s linear infinite' }} size={14} /> : <Save size={14} />}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>, document.body
      )}


      {editCountModal && createPortal(
        <div className="minia-modal-overlay">
          <div className="animate-scale-up shadow-lg bg-white" style={{ width: '100%', maxWidth: 400, borderRadius: '16px', overflow: 'hidden' }}>
            <div className="py-3 px-4 border-bottom d-flex justify-content-between align-items-center" style={{ background: 'linear-gradient(to right, #ffffff, #f8f9ff)' }}>
              <div className="d-flex align-items-center gap-3">
                <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'rgba(81, 86, 190, 0.1)', color: '#5156be', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Target size={16} />
                </div>
                <h5 className="font-size-15 mb-0 fw-bold text-dark">Section B Logistics</h5>
              </div>
              <button className="btn-icon-sm rounded-circle border-0" onClick={() => setEditCountModal(false)}><X size={18} /></button>
            </div>
            <div className="p-4">
              <div className="text-center mb-4">
                <label className="form-label-custom mb-3">Required Assessment Count</label>
                <div className="d-flex justify-content-center align-items-center gap-4 bg-light-subtle p-3 rounded-4 border">
                  <button className="btn-icon-lg text-muted hover-scale" onClick={() => {
                    const n = [...countData]; n[0].totalQuestToAnswer = Math.max(0, n[0].totalQuestToAnswer - 1); setCountData(n);
                  }}><MinusCircle size={32} /></button>
                  <span className="font-size-40 fw-bold text-primary" style={{ minWidth: '60px' }}>{countData[0]?.totalQuestToAnswer}</span>
                  <button className="btn-icon-lg text-primary hover-scale" onClick={() => {
                    const n = [...countData]; n[0].totalQuestToAnswer++; setCountData(n);
                  }}><PlusCircle size={32} /></button>
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label-custom">Temporal Allocation (Minutes)</label>
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0 text-muted"><Clock size={18} /></span>
                  <input className="form-control-custom fw-bold font-size-18 text-center" style={{ borderLeft: 'none' }} type="number" value={countData[0]?.timeAllowed || 0} onChange={e => {
                    const n = [...countData]; n[0].timeAllowed = Number(e.target.value); setCountData(n);
                  }} />
                </div>
              </div>

              <button className="btn-primary-custom w-100 py-3 shadow-md font-size-15 fw-bold" style={{ borderRadius: '12px' }} onClick={updateCountAction} disabled={saving}>
                {saving ? <div className="spinner-border spinner-border-sm me-2" /> : <Save size={18} className="me-2" />}
                Commit Logistics Configuration
              </button>
            </div>
          </div>
        </div>, document.body
      )}

      <style>{`
        .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        .standout-theory-item { transition: background 0.2s; }
        .standout-theory-item:hover { background-color: #fbfbfd; }
        
        .minia-page { font-family: 'Inter', sans-serif; color: #495057; }
        .letter-spacing-1 { letter-spacing: 1px; }
        .tracking-wider { letter-spacing: 0.05em; }
        
        .minia-card { background: #fff; border-radius: 12px; border: 1px solid #eff0f2; box-shadow: 0 0.75rem 1.5rem rgba(18, 38, 63, 0.03); }
        .shadow-hover { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .shadow-hover:hover { transform: translateY(-5px); box-shadow: 0 1rem 2.5rem rgba(18, 38, 63, 0.1) !important; border-color: transparent !important; }
        
        .hover-translate-x { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .hover-translate-x:hover { transform: translateX(6px); box-shadow: 0 0.5rem 1.5rem rgba(18, 38, 63, 0.06) !important; }
        .standout-row { transition: background-color 0.2s, box-shadow 0.2s; }
        .standout-row:hover { background-color: #fbfbfd; box-shadow: 0 0.5rem 1.5rem rgba(18, 38, 63, 0.08) !important; }
        
        .transition-2 { transition: all 0.2s ease; }
        .bg-light-subtle { background-color: #f8f9fa; }
        .bg-soft-primary { background-color: rgba(81, 86, 190, 0.1); color: #5156be; }
        .bg-soft-success { background-color: rgba(42, 181, 125, 0.1); color: #2ab57d; }
        .bg-soft-info { background-color: rgba(75, 163, 255, 0.1); color: #4ba3ff; }
        .bg-soft-danger { background-color: rgba(253, 98, 94, 0.1); color: #fd625e; }
        .bg-soft-secondary { background-color: rgba(116, 120, 141, 0.1); color: #74788d; }
        
        .bg-white-soft { background-color: rgba(255, 255, 255, 0.1); }
        .bg-pattern-radial { position: absolute; top: 0; right: 0; width: 100%; height: 100%; background: radial-gradient(circle at top right, rgba(255, 255, 255, 0.15), transparent); }

        .avatar-md { width: 56px; height: 56px; }
        .avatar-sm { width: 48px; height: 48px; }
        .avatar-xs { width: 28px; height: 28px; }
        .avatar-title { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; font-weight: 700; }
        
        .btn-primary-custom { background-color: #5156be; color: #fff; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; transition: 0.2s; box-shadow: 0 4px 6px rgba(81, 86, 190, 0.2); }
        .btn-primary-custom:hover { background-color: #4549a2; transform: translateY(-2px); box-shadow: 0 6px 12px rgba(81, 86, 190, 0.3); }
        .btn-light-custom { background: #fff; border: 1px solid #eff0f2; color: #74788d; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; transition: 0.2s; }
        .btn-light-custom:hover { background: #f8f9fa; color: #5156be; border-color: #5156be; }
        
        .btn-icon-sm { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border: none; transition: all 0.2s; }
        .btn-icon-sm:hover { transform: scale(1.1); }
        .btn-icon-xs { background: transparent; border: none; padding: 0; cursor: pointer; transition: 0.2s; opacity: 0.7; }
        .btn-icon-xs:hover { transform: scale(1.15); opacity: 1; }
        .btn-icon-lg { background: transparent; border: none; padding: 0; cursor: pointer; transition: 0.2s; }
        .btn-icon-lg:hover { transform: scale(1.1); }

        .form-label-custom { display: block; font-size: 11px; font-weight: 700; color: #74788d; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px; }
        .form-control-custom { display: block; width: 100%; padding: 8px 12px; font-size: 13px; font-weight: 500; color: #495057; background-color: #fff; border: 1px solid #e2e8f0; border-radius: 8px; transition: 0.2s; }
        .form-control-custom:focus { border-color: #5156be; outline: 0; box-shadow: 0 0 0 4px rgba(81, 86, 190, 0.1); }

        .minia-switch { width: 44px; height: 22px; border-radius: 12px; background: #e2e8f0; position: relative; cursor: pointer; transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .minia-switch.on { background: #5156be; }
        .minia-switch .switch-dot { width: 16px; height: 16px; border-radius: 50%; background: #fff; position: absolute; top: 3px; left: 3px; transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .minia-switch.on .switch-dot { left: 25px; }

        .minia-modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 99999; padding: 20px; }
        .animate-scale-up { animation: scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
        @keyframes scaleUp { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.5s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Page Header */
        .vqq-page-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
        .vqq-header-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

        /* Objective Inventory responsive grid */
        /* Objective Inventory grid — 2 columns */
        .vqq-obj-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
        @media (max-width: 600px) { .vqq-obj-grid { grid-template-columns: 1fr; } }

        /* Objective Card */
        .vqq-obj-card { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(18,38,63,0.08); border: 1px solid #eff0f2; display: flex; flex-direction: column; transition: transform 0.2s, box-shadow 0.2s; }
        .vqq-obj-card:hover { transform: translateY(-3px); box-shadow: 0 10px 32px rgba(18,38,63,0.13); }

        .vqq-obj-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; }
        .vqq-obj-num { background: rgba(255,255,255,0.25); color: #fff; font-size: 13px; font-weight: 800; padding: 4px 10px; border-radius: 20px; letter-spacing: 0.3px; }
        .vqq-obj-type { background: rgba(255,255,255,0.18); color: #fff; font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.8px; }
        .vqq-hdr-btn { width: 30px; height: 30px; border-radius: 8px; border: none; background: rgba(255,255,255,0.2); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s; }
        .vqq-hdr-btn:hover { background: rgba(255,255,255,0.35); }
        .vqq-hdr-btn-danger:hover { background: rgba(253,98,94,0.55); }

        .vqq-obj-body { padding: 16px 18px; flex: 1; display: flex; flex-direction: column; gap: 12px; }
        .vqq-obj-question { font-size: 14px; font-weight: 700; color: #2a3142; line-height: 1.6; margin: 0; }

        .vqq-opts-list { display: flex; flex-direction: column; gap: 6px; }
        .vqq-opt { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 10px; border: 1px solid #e9ecef; background: #fafbff; transition: all 0.15s; }
        .vqq-opt-correct { font-weight: 600; }
        .vqq-opt-letter { width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; flex-shrink: 0; }
        .vqq-opt-text { font-size: 13px; color: #495057; flex: 1; min-width: 0; }

        .vqq-tf-row { display: flex; gap: 10px; }
        .vqq-tf-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 7px; padding: 10px; border-radius: 10px; border: 1.5px solid; font-size: 13px; font-weight: 700; transition: all 0.15s; }

        .vqq-match-list { display: flex; flex-direction: column; gap: 6px; }
        .vqq-match-row { display: flex; align-items: center; gap: 8px; padding: 7px 10px; border-radius: 8px; background: #f8f9fa; border: 1px solid #eff0f2; font-size: 12px; }
        .vqq-match-prompt { flex: 1; color: #495057; font-weight: 600; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .vqq-match-answer { flex: 1; font-weight: 700; text-align: right; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        .vqq-obj-footer { padding: 12px 18px; border-top: 1px solid #f1f5f9; display: flex; align-items: center; }
        .vqq-marks-pill { display: inline-flex; align-items: center; gap: 5px; padding: 5px 12px; border-radius: 20px; font-size: 13px; font-weight: 700; }

        /* Theory Card */
        .vqq-theory-col { display: flex; flex-direction: column; gap: 24px; }
        .vqq-theory-card { background: #fff; border-radius: 16px; border: 1px solid #eff0f2; box-shadow: 0 4px 24px rgba(18,38,63,0.07); overflow: hidden; }
        .vqq-theory-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; background: linear-gradient(135deg, #2ab57d 0%, #1a9666 100%); flex-wrap: wrap; gap: 12px; }
        .vqq-group-badge { width: 46px; height: 46px; border-radius: 12px; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; color: #fff; flex-shrink: 0; }
        .vqq-theory-body { padding: 4px 0; }
        .vqq-theory-row { display: flex; align-items: flex-start; gap: 16px; padding: 20px 24px; border-bottom: 1px solid #f1f5f9; transition: background 0.2s; }
        .vqq-theory-row:last-child { border-bottom: none; }
        .vqq-theory-row:hover { background: #fafbff; }
        .vqq-q-num { width: 42px; height: 42px; border-radius: 10px; background: rgba(42,181,125,0.1); display: flex; align-items: center; justify-content: center; color: #2ab57d; font-size: 12px; font-weight: 800; flex-shrink: 0; }
        .vqq-q-content { flex: 1; min-width: 0; }
        .vqq-eval-box { background: #f0faf5; border-left: 3px solid #2ab57d; border-radius: 0 8px 8px 0; padding: 10px 14px; margin-top: 8px; }
        .vqq-q-actions { display: flex; flex-direction: column; align-items: center; gap: 10px; flex-shrink: 0; }
        .vqq-marks-chip { text-align: center; background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 8px 12px; min-width: 56px; }
        .vqq-act-btn { width: 32px; height: 32px; border-radius: 50%; border: 1px solid #e9ecef; background: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.06); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .vqq-act-btn:hover { transform: scale(1.1); box-shadow: 0 4px 10px rgba(0,0,0,0.12); }

        @media (max-width: 640px) {
          .vqq-page-header { flex-direction: column; align-items: flex-start; }
          .vqq-header-actions { width: 100%; }
          .vqq-obj-grid { grid-template-columns: 1fr; }
          .vqq-theory-row { flex-wrap: wrap; }
          .vqq-q-actions { flex-direction: row; width: 100%; justify-content: flex-end; padding-top: 8px; }
          .vqq-theory-header { flex-direction: column; align-items: flex-start; }
          .minia-modal-overlay > div { width: 95vw !important; max-width: none !important; }
        }
      `}</style>
    </div>
  );
}
