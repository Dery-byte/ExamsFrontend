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
    <div className="minia-page animate-fade-in">
      <Toaster position="top-right" />

      <div className="page-title-box d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="page-title mb-0 font-size-18 fw-bold">Assessment Registry Console</h4>
          <div className="breadcrumb m-0 font-size-13 text-muted">
            <span>{roleName} Portal</span> <ChevronRight size={12} className="mx-1" /> <span>Registry</span>
          </div>
        </div>
        <div className="d-flex gap-2">
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
        <div className="text-center py-5">
          <Loader2 className="animate-spin text-primary mx-auto" size={40} />
          <p className="text-muted mt-3">Retrieving Assessment Bank...</p>
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
              
              <div className="row g-4">
                {questions.map((q, i) => {
                  const isMatching = (q.questionType || '').toUpperCase() === 'MATCHING';
                  const isTF = (q.questionType || '').toUpperCase() === 'TRUE_FALSE';
                  const typeColor = isMatching ? '#5156be' : isTF ? '#2ab57d' : '#4ba3ff';
                  const bgGradient = isMatching ? 'linear-gradient(145deg, #ffffff 0%, #f4f5fa 100%)' : isTF ? 'linear-gradient(145deg, #ffffff 0%, #f0fdf4 100%)' : 'linear-gradient(145deg, #ffffff 0%, #f0f7ff 100%)';
                  const correctAnswers = q.correctAnswer ?? q.correct_answer ?? [];

                  return (
                    <div key={q.quesId} className="col-12 col-md-6">
                      <div className="minia-card border-0 shadow-sm h-100 d-flex flex-column transition-2 hover-scale" style={{ background: bgGradient, borderTop: `4px solid ${typeColor}`, borderRadius: '16px', overflow: 'hidden' }}>
                        
                        {/* Header */}
                        <div className="p-3 d-flex justify-content-between align-items-center bg-white bg-opacity-75 border-bottom border-light">
                           <div className="d-flex align-items-center gap-2">
                             <span className="badge font-size-13 fw-bold px-3 py-1 rounded-pill shadow-sm" style={{ backgroundColor: typeColor, color: '#fff' }}>#{i + 1}</span>
                             <span className="badge font-size-10 px-2 py-1 text-uppercase fw-bold rounded-pill" style={{ backgroundColor: `${typeColor}15`, color: typeColor, letterSpacing: '0.5px' }}>
                               {isMatching ? 'Matching' : isTF ? 'True/False' : 'MCQ'}
                             </span>
                           </div>
                           <div className="d-flex align-items-center gap-3">
                             <div className="text-end">
                               <span className="d-inline-block font-size-16 fw-bold text-dark lh-1 me-1">{q.marks}</span>
                               <span className="font-size-9 text-muted fw-bold text-uppercase tracking-wider">PTS</span>
                             </div>
                             <div className="d-flex gap-2">
                               <button className="btn-icon-xs bg-white border shadow-sm text-info hover-scale rounded-circle d-flex align-items-center justify-content-center" style={{ width: 28, height: 28 }} onClick={() => openUpdateObj(q.quesId || q.id || q.qId, q.questionType)}><Edit size={13} /></button>
                               <button className="btn-icon-xs bg-white border shadow-sm text-danger hover-scale rounded-circle d-flex align-items-center justify-content-center" style={{ width: 28, height: 28 }} onClick={() => doDeleteQuestion(q.quesId || q.id || q.qId)}><Trash2 size={13} /></button>
                             </div>
                           </div>
                        </div>

                        {/* Content */}
                        <div className="p-4 flex-grow-1 d-flex flex-column">
                           <div className="font-size-15 fw-bold text-dark mb-4 lh-base" dangerouslySetInnerHTML={{ __html: q.content }} />
                           
                           <div className="mt-auto">
                             {/* MCQ Options */}
                             {!isMatching && !isTF && (
                               <div className="d-flex flex-column gap-2">
                                 {['option1', 'option2', 'option3', 'option4'].map((optKey, idx) => {
                                   const optVal = q[optKey];
                                   if (!optVal) return null;
                                   const isCorrect = correctAnswers.includes(optVal);
                                   return (
                                     <div key={idx} className={`px-3 py-2 rounded-3 border font-size-13 transition-2 d-flex align-items-center gap-3 ${isCorrect ? 'bg-soft-success border-success text-success fw-bold shadow-sm' : 'bg-white border-light text-muted'}`}>
                                       <span className={`fw-bold ${isCorrect ? 'text-success' : 'text-primary'}`} style={{ width: 20 }}>{String.fromCharCode(65 + idx)}.</span>
                                       <span className="text-truncate flex-grow-1">{optVal}</span>
                                       {isCorrect && <CheckCircle size={16} className="flex-shrink-0" />}
                                     </div>
                                   );
                                 })}
                               </div>
                             )}

                             {/* True/False Options */}
                             {isTF && (
                               <div className="d-flex gap-3">
                                 {['True', 'False'].map((val, idx) => {
                                   const isCorrect = correctAnswers.includes(val);
                                   return (
                                     <div key={idx} className={`flex-fill px-4 py-3 rounded-3 border font-size-14 transition-2 d-flex align-items-center justify-content-center gap-2 ${isCorrect ? 'bg-soft-success border-success text-success fw-bold shadow-sm' : 'bg-white border-light text-muted'}`}>
                                       {isCorrect && <CheckCircle size={16} />}
                                       <span>{val}</span>
                                     </div>
                                   );
                                 })}
                               </div>
                             )}

                             {/* Matching Pairs */}
                             {isMatching && q.matchingPairs && q.matchingPairs.length > 0 && (
                               <div className="d-flex flex-column gap-2">
                                 {q.matchingPairs.map((pair: any, idx: number) => (
                                   <div key={idx} className="bg-white border rounded-3 px-3 py-2 d-flex align-items-center justify-content-between shadow-sm font-size-13">
                                     <span className="text-dark fw-medium text-truncate w-50">{pair.prompt}</span>
                                     <div className="d-flex align-items-center gap-2 w-50 justify-content-end">
                                       <span className="text-muted opacity-50"><ChevronRight size={14}/></span>
                                       <span className="text-primary fw-bold text-truncate text-end" style={{ maxWidth: '80%' }}>{pair.answer}</span>
                                     </div>
                                   </div>
                                 ))}
                               </div>
                             )}
                           </div>
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

              <div className="d-flex flex-column gap-4 mt-2">
                {getPrefixes().map(prefix => (
                  <div key={prefix} className="minia-card shadow-lg border-0 overflow-hidden" style={{ borderRadius: '16px' }}>
                    {/* Group Header */}
                    <div className="card-header bg-white py-3 px-4 d-flex justify-content-between align-items-center border-bottom border-light">
                      <div className="d-flex align-items-center gap-3">
                        <div className="avatar-sm rounded-circle bg-success bg-gradient text-white d-flex align-items-center justify-content-center shadow-sm">
                          <span className="font-size-16 fw-bold">{prefix}</span>
                        </div>
                        <div>
                          <h6 className="mb-0 font-size-16 fw-bold text-dark">Group Protocol {prefix}</h6>
                          <span className="text-muted font-size-11 text-uppercase tracking-wider fw-medium">Instructional Assessment Set</span>
                        </div>
                      </div>
                      <div className="d-flex align-items-center gap-3 bg-light-subtle px-4 py-2 rounded-pill border">
                        <div className="d-flex flex-column align-items-end me-2">
                          <span className="font-size-9 fw-bold text-muted text-uppercase tracking-wider">Group Status</span>
                          <span className={`font-size-11 fw-bold ${compulsoryPrefixes[prefix] ? 'text-primary' : 'text-muted'}`}>{compulsoryPrefixes[prefix] ? 'MANDATORY' : 'OPTIONAL'}</span>
                        </div>
                        <div
                          onClick={() => !isUpdatingCompulsory[prefix] && onCompulsoryChange(prefix, !compulsoryPrefixes[prefix])}
                          className={`minia-switch ${compulsoryPrefixes[prefix] ? 'on' : ''}`}
                          style={{ transform: 'scale(0.9)', cursor: 'pointer' }}
                        >
                          <div className="switch-dot" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Vertical Rows */}
                    <div className="d-flex flex-column bg-light-subtle p-3 gap-3">
                      {getGrouped(prefix).map((q: any, idx: number, arr: any[]) => (
                        <div key={q.tqId} className="bg-white rounded-3 shadow-sm border border-light p-4 d-flex flex-column flex-lg-row align-items-start align-items-lg-center gap-4 transition-2 hover-scale">
                          
                          {/* LEFT: Badges */}
                          <div className="d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '60px' }}>
                            <span className="badge bg-soft-success text-success font-size-15 fw-bold px-3 py-2 rounded-circle shadow-sm" style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {q.quesNo}
                            </span>
                          </div>

                          {/* MIDDLE: Content */}
                          <div className="flex-grow-1 d-flex flex-column gap-3">
                            <div className="font-size-15 fw-bold text-dark lh-base" dangerouslySetInnerHTML={{ __html: q.question }} />
                            {q.evaluationCriteria && (
                              <div className="bg-light-subtle rounded-3 px-4 py-3 border-start border-4 border-success mt-1">
                                <div className="d-flex align-items-center gap-2 text-success mb-2">
                                  <Target size={14} />
                                  <span className="font-size-11 fw-bold text-uppercase letter-spacing-1">Evaluation KPI</span>
                                </div>
                                <p className="font-size-13 text-muted mb-0 fw-medium">"{q.evaluationCriteria}"</p>
                              </div>
                            )}
                          </div>

                          {/* RIGHT: Actions */}
                          <div className="d-flex flex-column align-items-center justify-content-center gap-3 flex-shrink-0" style={{ width: '100px' }}>
                            <div className="text-center bg-light-subtle rounded-3 py-2 px-3 border w-100">
                              <span className="d-block font-size-20 fw-bold text-dark lh-1 mb-1">{q.marks}</span>
                              <span className="font-size-10 text-muted fw-bold text-uppercase tracking-wider">PTS</span>
                            </div>
                            <div className="d-flex gap-2 w-100 justify-content-center">
                              <button className="btn-icon-sm bg-white border shadow-sm text-info hover-scale rounded-circle d-flex align-items-center justify-content-center" style={{ width: 32, height: 32 }} onClick={() => openUpdateTheory(q.tqId || q.id || q.quesId || q.theoryId)}><Edit size={14} /></button>
                              <button className="btn-icon-sm bg-white border shadow-sm text-danger hover-scale rounded-circle d-flex align-items-center justify-content-center" style={{ width: 32, height: 32 }} onClick={() => doDeleteTheoryAction(q.tqId || q.id || q.quesId || q.theoryId)}><Trash2 size={14} /></button>
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
        <div className="minia-modal-overlay">
          <div
            className="animate-scale-up"
            style={{
              background: '#fff', borderRadius: '0.5rem',
              width: '100%', maxWidth: '540px',
              maxHeight: '95vh',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 10px 40px rgba(0,0,0,0.18)',
              overflow: 'hidden'
            }}
          >
            {/* MODAL HEADER */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.75rem 1.25rem', borderBottom: '1px solid #eff0f2', flexShrink: 0,
              background: 'linear-gradient(to right, #ffffff, #fbfbfd)'
            }}>
              {isModalLoading ? (
                <div className="d-flex align-items-center gap-3">
                   <div className="spinner-border spinner-border-sm text-primary" role="status" />
                   <h5 className="mb-0 fw-bold font-size-15 text-dark">Synchronizing Registry...</h5>
                </div>
              ) : (
                <div className="d-flex align-items-center gap-2">
                  <div>
                    <h5 className="mb-0 fw-bold font-size-15 text-dark">Edit Objective Question</h5>
                  </div>
                </div>
              )}
              <button
                onClick={() => setEditObjModal(false)}
                className="btn-icon-sm rounded-circle"
                style={{ background: '#f8f9fa', border: '1px solid #eff0f2', color: '#878a99' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* MODAL BODY */}
            <div style={{ padding: '0.5rem 1rem', overflow: 'hidden', flex: 1, background: '#fff' }}>

              {/* Meta Section */}
              <div className="row g-2 mb-1">
                <div className="col-md-9">
                  <label className="form-label-custom">Question Classification</label>
                  <div className="d-flex align-items-center gap-2 p-1 rounded-2 border bg-light-subtle" style={{ height: '36px' }}>
                    <span className="badge bg-primary text-white font-size-10 px-2 py-0.5 rounded fw-bold">
                      {specificObj.questionType}
                    </span>
                    <span className="text-dark font-size-11 fw-semibold opacity-75">
                      {(specificObj.questionType || '').toUpperCase() === 'MCQ' && 'Multiple Choice'}
                      {(specificObj.questionType || '').toUpperCase() === 'TRUE_FALSE' && 'Boolean Polarity'}
                      {(specificObj.questionType || '').toUpperCase() === 'MATCHING' && 'Associative Matching'}
                    </span>
                  </div>
                </div>
                <div className="col-md-3">
                  <label className="form-label-custom text-center">Marks</label>
                  <div className="input-group">
                    <input
                      type="number"
                      className="form-control-custom fw-bold font-size-13 text-primary text-center"
                      style={{ height: '36px', padding: '4px' }}
                      value={specificObj.marks || ''}
                      onChange={e => setSpecificObj({ ...specificObj, marks: Number(e.target.value) })}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Content Section */}
              <div className="mb-2">
                <label className="form-label-custom">Instructional Prompt</label>
                <textarea
                  className="form-control-custom"
                  style={{ resize: 'none', height: '45px', lineHeight: 1.3, fontSize: '12px', background: '#fbfbfd', padding: '6px 10px' }}
                  value={specificObj.content || ''}
                  onChange={e => setSpecificObj({ ...specificObj, content: e.target.value })}
                  placeholder="Enter the question text..."
                />
              </div>

              {/* Options Section */}
              <div className="mb-1">
                {/* MCQ INTERFACE */}
                {(specificObj.questionType || '').toUpperCase() === 'MCQ' && (
                  <div>
                    <label className="form-label-custom mb-2">Response Inventory <span className="text-muted fw-normal ms-1 font-size-10">(Toggle circle for correct)</span></label>
                    <div className="row g-2">
                      {['option1', 'option2', 'option3', 'option4'].map((opt, i) => {
                        const optVal = specificObj[opt];
                        const isSel = (specificObj.correctAnswer || []).includes(optVal);
                        return (
                          <div key={opt} className="col-6">
                            <div className={`d-flex align-items-center gap-2 p-1 rounded-3 border transition-2 ${isSel ? 'border-primary bg-soft-primary' : 'border-light bg-white'}`}>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!optVal) return;
                                  const cur = specificObj.correctAnswer || [];
                                  setSpecificObj({ ...specificObj, correctAnswer: isSel ? cur.filter((v: any) => v !== optVal) : [...cur, optVal] });
                                }}
                                className={`btn-icon-xs rounded-circle ms-1 d-flex align-items-center justify-content-center shadow-sm ${isSel ? 'bg-primary text-white' : 'bg-light text-muted'}`}
                                style={{ width: '22px', height: '22px', border: 'none' }}
                              >
                                {isSel ? <Check size={12} strokeWidth={3} /> : <span className="font-size-9 fw-bold">{String.fromCharCode(65 + i)}</span>}
                              </button>
                              <input
                                className="form-control form-control-sm border-0 bg-transparent shadow-none font-size-12 fw-medium"
                                style={{ padding: '2px 4px' }}
                                value={optVal || ''}
                                onChange={e => setSpecificObj({ ...specificObj, [opt]: e.target.value })}
                                placeholder={`Option ${String.fromCharCode(65 + i)}...`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* TRUE / FALSE INTERFACE */}
                {(specificObj.questionType || '').toUpperCase() === 'TRUE_FALSE' && (
                  <div>
                    <label className="form-label-custom mb-2 text-center d-block">Validation Logic</label>
                    <div className="d-flex flex-row gap-3">
                      {['True', 'False'].map((val) => {
                        const isSel = (specificObj.correctAnswer || []).includes(val);
                        const color = val === 'True' ? '#2ab57d' : '#fd625e';
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setSpecificObj({ ...specificObj, correctAnswer: [val] })}
                            className="flex-fill d-flex align-items-center justify-content-center gap-2 transition-2 border-2"
                            style={{
                              padding: '0.6rem',
                              borderStyle: 'solid',
                              borderColor: isSel ? color : '#eff0f2',
                              borderRadius: '10px',
                              background: isSel ? `${color}10` : '#fff',
                              color: isSel ? color : '#74788d',
                              boxShadow: isSel ? `0 2px 8px ${color}10` : 'none'
                            }}
                          >
                            {isSel ? (val === 'True' ? <CheckCircle size={18} /> : <X size={18} />) : <div className="border border-2 rounded-circle" style={{ width: 18, height: 18 }} />}
                            <span className="font-size-14 fw-bold letter-spacing-1">{val.toUpperCase()}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* MATCHING INTERFACE */}
                {(specificObj.questionType || '').toUpperCase() === 'MATCHING' && (
                  <div className="matching-overhaul">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                       <label className="form-label-custom mb-0">Association Protocol</label>
                       <span className="badge bg-soft-secondary text-secondary font-size-10 fw-bold">{specificObj.matchingPairs?.length || 0} PAIRS</span>
                    </div>
                    
                    <div className="bg-light-subtle rounded-3 border p-1 mb-1">
                      {/* List */}
                      <div className="d-flex flex-column gap-1 mb-1" style={{ maxHeight: '142px', overflowY: 'auto', paddingRight: '12px', overflowX: 'hidden' }}>
                        {(specificObj.matchingPairs || []).map((pair: any, idx: number) => (
                          <div key={idx} style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'minmax(0, 1fr) 10px minmax(0, 1fr) 24px', 
                            alignItems: 'center', 
                            gap: '2px', 
                            background: '#fff', 
                            padding: '4px 4px', 
                            borderRadius: '6px', 
                            border: '1px solid #eff0f2',
                            marginBottom: '2px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                            width: '100%'
                          }}>
                            <input
                              className="form-control form-control-sm border-0 font-size-10 fw-semibold text-dark"
                              style={{ padding: '2px', height: '24px', background: 'transparent', minWidth: 0 }}
                              value={pair.prompt}
                              onChange={(e) => {
                                const newPairs = [...specificObj.matchingPairs];
                                newPairs[idx].prompt = e.target.value;
                                setSpecificObj({ ...specificObj, matchingPairs: newPairs });
                              }}
                              placeholder="Prompt..."
                            />
                            <div className="text-muted opacity-25 fw-bold" style={{ fontSize: '10px', textAlign: 'center' }}>:</div>
                            <input
                              className="form-control form-control-sm border-0 font-size-10 fw-bold text-primary"
                              style={{ padding: '2px', height: '24px', background: 'transparent', minWidth: 0 }}
                              value={pair.answer}
                              onChange={(e) => {
                                const newPairs = [...specificObj.matchingPairs];
                                newPairs[idx].answer = e.target.value;
                                setSpecificObj({ ...specificObj, matchingPairs: newPairs });
                              }}
                              placeholder="Match..."
                            />
                            <button
                              type="button"
                              className="btn btn-soft-danger btn-sm p-0 d-flex align-items-center justify-content-center rounded-circle"
                              style={{ width: '22px', height: '22px' }}
                              onClick={() => {
                                const newPairs = specificObj.matchingPairs.filter((_: any, i: number) => i !== idx);
                                setSpecificObj({ ...specificObj, matchingPairs: newPairs });
                              }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                        {(!specificObj.matchingPairs || specificObj.matchingPairs.length === 0) && (
                          <div className="text-center py-3 text-muted font-size-12 opacity-50 border border-dashed rounded-2">No associative pairs established</div>
                        )}
                      </div>

                      {/* Add Form Simplified */}
                      <div className="d-flex justify-content-center pt-1 border-top border-dashed mt-1">
                        <button
                          type="button"
                          className="btn btn-primary btn-sm px-4 d-flex align-items-center gap-2 fw-bold font-size-11"
                          style={{ 
                            height: '32px', 
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, #5156be 0%, #3b3f8c 100%)',
                            border: 'none',
                            boxShadow: '0 4px 10px rgba(81, 86, 190, 0.2)'
                          }}
                          onClick={() => {
                            const newPairs = [...(specificObj.matchingPairs || []), { prompt: '', answer: '' }];
                            setSpecificObj({ ...specificObj, matchingPairs: newPairs });
                          }}
                        >
                          <PlusCircle size={14} /> ADD NEW PAIR
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div style={{
              display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem',
              padding: '0.6rem 1.25rem', borderTop: '1px solid #eff0f2', flexShrink: 0, background: '#fbfbfd',
              borderRadius: '0 0 0.5rem 0.5rem'
            }}>
              <button
                type="button"
                onClick={() => setEditObjModal(false)}
                className="btn btn-link text-muted fw-semibold text-decoration-none px-2 font-size-12"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={updateObjQuestion}
                disabled={saving}
                className="btn btn-primary shadow-sm"
                style={{ borderRadius: '6px', padding: '6px 18px', fontWeight: 600, fontSize: '13px' }}
              >
                {saving ? <div className="spinner-border spinner-border-sm me-1" /> : <Save size={14} className="me-1" />}
                {saving ? 'Syncing' : 'Commit'}
              </button>
            </div>
          </div>
        </div>, document.body
      )}


      {editTheoryModal && createPortal(
        <div className="minia-modal-overlay">
          <div
            className="animate-scale-up"
            style={{
              background: '#fff', borderRadius: '0.5rem',
              width: '100%', maxWidth: '540px',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 10px 40px rgba(0,0,0,0.18)',
              overflow: 'hidden'
            }}
          >
            {/* HEADER */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.5rem 1rem', borderBottom: '1px solid #eff0f2', flexShrink: 0,
              background: 'linear-gradient(to right, #ffffff, #fbfbfd)'
            }}>
              {isModalLoading ? (
                <div className="d-flex align-items-center gap-3">
                   <div className="spinner-border spinner-border-sm text-primary" />
                   <h5 className="mb-0 fw-bold font-size-14 text-dark">Synchronizing Protocol...</h5>
                </div>
              ) : (
                <div className="d-flex align-items-center gap-2">
                  <h5 className="mb-0 fw-bold font-size-14 text-dark">Edit Theory Question</h5>
                </div>
              )}
              <button
                onClick={() => setEditTheoryModal(false)}
                className="btn-icon-sm rounded-circle"
                style={{ background: '#f8f9fa', border: '1px solid #eff0f2', color: '#878a99', width: '28px', height: '28px' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* BODY */}
            <div style={{ padding: '0.75rem 1rem', overflow: 'hidden', flex: 1 }}>
              {/* Meta row */}
              <div className="row g-2 mb-2">
                <div className="col-md-7">
                  <label className="form-label-custom mb-1">Question Number / Index</label>
                  <div className="input-group input-group-sm">
                    <span className="input-group-text bg-light border-end-0 text-muted font-size-11 fw-bold">#</span>
                    <input
                      className="form-control border-start-0 fw-bold font-size-12"
                      style={{ borderRadius: '0 0.375rem 0.375rem 0' }}
                      value={theory.quesNo || ''}
                      onChange={e => setTheory({ ...theory, quesNo: e.target.value })}
                      placeholder="e.g. Q1, Q2"
                    />
                  </div>
                </div>
                <div className="col-md-5">
                  <label className="form-label-custom mb-1">Marks</label>
                  <div className="input-group input-group-sm">
                    <span className="input-group-text bg-light border-end-0 text-muted"><Award size={12} /></span>
                    <input
                      type="number"
                      className="form-control border-start-0 fw-bold font-size-12 text-primary"
                      style={{ borderRadius: '0 0.375rem 0.375rem 0' }}
                      value={theory.marks || 0}
                      onChange={e => setTheory({ ...theory, marks: Number(e.target.value) })}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Two-column content */}
              <div className="row g-2">
                <div className="col-md-6">
                  <label className="form-label-custom mb-1">Theoretical Prompt</label>
                  <textarea
                    className="form-control-custom form-control-sm"
                    style={{ resize: 'none', height: '80px', lineHeight: 1.3, borderRadius: '0.375rem', background: '#fbfbfd', fontSize: '12px', padding: '6px' }}
                    value={theory.question || ''}
                    onChange={e => setTheory({ ...theory, question: e.target.value })}
                    placeholder="Enter question text..."
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label-custom d-flex align-items-center gap-1 mb-1">
                    <Target size={10} className="text-primary" />
                    Evaluation Rubric
                  </label>
                  <textarea
                    className="form-control-custom form-control-sm"
                    style={{ resize: 'none', height: '80px', lineHeight: 1.3, borderRadius: '0.375rem', borderStyle: 'dashed', background: '#fff', fontSize: '12px', padding: '6px' }}
                    value={theory.evaluationCriteria || ''}
                    onChange={e => setTheory({ ...theory, evaluationCriteria: e.target.value })}
                    placeholder="Grading key points..."
                  />
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div style={{
              display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 1rem', borderTop: '1px solid #eff0f2', flexShrink: 0,
              background: '#fbfbfd', borderRadius: '0 0 0.5rem 0.5rem'
            }}>
              <button type="button" onClick={() => setEditTheoryModal(false)} className="btn btn-link text-muted fw-semibold text-decoration-none px-2 font-size-11">Discard</button>
              <button
                type="button"
                onClick={updateTheoryAction}
                disabled={saving}
                className="btn btn-primary shadow-sm"
                style={{ borderRadius: '4px', padding: '4px 12px', fontWeight: 600, fontSize: '12px' }}
              >
                {saving ? <div className="spinner-border spinner-border-sm me-1" /> : <Save size={12} className="me-1" />}
                {saving ? 'Syncing' : 'Commit'}
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

        @media (max-width: 768px) {
          .page-title-box { flex-direction: column !important; align-items: flex-start !important; gap: 12px; }
          .page-title-box .d-flex.gap-2 { width: 100%; }
          .page-title-box .d-flex.gap-2 > * { flex: 1; text-align: center; justify-content: center; }
          .minia-modal-overlay > div { width: 95vw !important; max-width: none !important; }
          .card-header { flex-direction: column !important; align-items: flex-start !important; gap: 10px; }
          .card-header .d-flex.align-items-center.gap-3.bg-light-subtle { margin-top: 5px; }
          .avatar-md { width: 44px; height: 44px; }
          .font-size-20 { font-size: 16px !important; }
          .btn-primary-custom, .btn-light-custom { padding: 10px 16px; font-size: 13px; }
        }
      `}</style>
    </div>
  );
}
