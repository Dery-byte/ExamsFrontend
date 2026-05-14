import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getQuiz, addQuestion, uploadQuestions, uploadTheoryQuestions, addNumberOfTheoryToAnswer, addTheoryQuestion } from '../../api/endpoints';
import toast, { Toaster } from 'react-hot-toast';
import { 
  FilePlus, 
  FileText, 
  Upload, 
  Save, 
  List, 
  Info, 
  ArrowLeft, 
  Loader2, 
  Database, 
  Zap, 
  Hash, 
  Award, 
  Target,
  ChevronRight,
  Layers
} from 'lucide-react';

export default function AddQuestion({ adminMode = true }: { adminMode?: boolean }) {
  const { qId, title } = useParams();
  const navigate = useNavigate();
  const [specificQuiz, setSpecificQuiz] = useState<any>(null);
  const [qTitle, setQTitle] = useState(title || '');
  const roleName = adminMode ? 'Admin' : 'Lecturer';
  const basePath = adminMode ? '/admin' : '/lect';
  
  const [question, setQuestion] = useState({ quiz:{ qId }, content:'', option1:'', option2:'', option3:'', option4:'', correct_answer:[] as string[] });
  const [theoryForm, setTheoryForm] = useState({ quiz:{ qId }, quesNo:'', question:'', marks: 0, evaluationCriteria:'' });
  const [selectedFile, setSelectedFile] = useState<File|null>(null);
  const [filePreview, setFilePreview] = useState<any[]>([]);
  const [selectedFileTheory, setSelectedFileTheory] = useState<File|null>(null);
  const [theoryPreview, setTheoryPreview] = useState<any[]>([]);
  const [theoryQuesToAnswer, setTheoryQA] = useState({ totalQuestToAnswer:'', timeAllowed:'', quiz:{ qId } });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'OBJ' | 'THEORY'>('OBJ');

  useEffect(() => {
    if (!qId) return;
    getQuiz(qId).then(quiz => { 
      setSpecificQuiz(quiz); 
      setQTitle(quiz.title); 
      setQuestion(q => ({ ...q, quiz: { qId } }));
      setTheoryForm(t => ({ ...t, quiz: { qId } }));
      const qType = String(quiz?.quizType || '').toUpperCase();
      if (qType.includes('THEORY') && !qType.includes('BOTH')) setActiveTab('THEORY');
      else setActiveTab('OBJ');
    });
  }, [qId]);

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.content.trim() || !question.option1.trim() || !question.option2.trim()) { 
      toast.error('Essential content and primary options are required'); 
      return; 
    }
    if (!question.correct_answer.length) { 
      toast.error('Identify the valid response protocol'); 
      return; 
    }
    setLoading(true);
    try { 
      await addQuestion(question); 
      toast.success('Objective item initialized!'); 
      setQuestion(q => ({ ...q, content:'', option1:'', option2:'', option3:'', option4:'', correct_answer:[] })); 
    }
    catch { toast.error('Item synchronization failed'); }
    finally { setLoading(false); }
  };

  const handleAddTheory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!theoryForm.quesNo.trim() || !theoryForm.question.trim() || theoryForm.marks <= 0) {
      toast.error('Registry ID, Weight and Content are required');
      return;
    }
    setLoading(true);
    try {
      await addTheoryQuestion(theoryForm);
      toast.success('Theory item established!');
      setTheoryForm(t => ({ ...t, quesNo: '', question: '', marks: 0, evaluationCriteria: '' }));
    } catch {
      toast.error('Theory protocol synchronization failed');
    } finally {
      setLoading(false);
    }
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'OBJ' | 'THEORY') => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (type === 'OBJ') {
        setSelectedFile(file);
        setFilePreview(Array.isArray(parsed) ? parsed : [parsed]);
      } else {
        setSelectedFileTheory(file);
        setTheoryPreview(Array.isArray(parsed) ? parsed : [parsed]);
      }
    } catch {
      toast.error('Invalid JSON registry format');
    }
  };

  const uploadObj = async () => {
    if (!selectedFile || filePreview.length === 0) return;
    setLoading(true);
    try {
      await uploadQuestions(qId!, filePreview); 
      toast.success('Bulk objectives synchronized!'); 
      setSelectedFile(null); 
      setFilePreview([]);
    }
    catch { toast.error('Bulk synchronization failed'); }
    finally { setLoading(false); }
  };

  const uploadTheory = async () => {
    if (!selectedFileTheory || !theoryQuesToAnswer.totalQuestToAnswer || !theoryQuesToAnswer.timeAllowed || theoryPreview.length === 0) { 
      toast.error('Configure all parameters and select a valid registry file'); 
      return; 
    }
    setLoading(true);
    try {
      await addNumberOfTheoryToAnswer(theoryQuesToAnswer);
      await uploadTheoryQuestions(qId!, theoryPreview);
      toast.success('Bulk theory protocols established!');
      setSelectedFileTheory(null);
      setTheoryPreview([]);
      setTheoryQA(t => ({ ...t, totalQuestToAnswer:'', timeAllowed:'' }));
    } catch { toast.error('Bulk established protocol failed'); }
    finally { setLoading(false); }
  };

  const qType = String(specificQuiz?.quizType || '').toUpperCase();
  const isOBJ = qType.includes('OBJ') || qType.includes('BOTH');
  const isTheory = qType.includes('THEORY') || qType.includes('BOTH');

  return (
    <div className="aq-page-wrapper animate-fade-in">
      <Toaster position="top-right" />
      
      {/* Header Section */}
      <div className="aq-header-container mb-4">
        <div>
          <h4 className="aq-page-title mb-1">Curriculum Expansion</h4>
          <div className="aq-breadcrumb">
            <span>{roleName}</span> <ChevronRight size={14} className="mx-2 text-muted" /> <span className="text-primary fw-bold">Item Initialization</span>
          </div>
        </div>
        <button className="aq-btn-outline" onClick={() => navigate(`${basePath}/view-questions/${qId}/${qTitle}`)}>
          <ArrowLeft size={16} /> <span>Back to Registry</span>
        </button>
      </div>

      {/* Quiz Context Banner */}
      <div className="aq-context-banner mb-4 shadow-sm">
        <div className="aq-context-inner">
          <div className="aq-context-icon">
            <Zap size={24} />
          </div>
          <div className="aq-context-info">
            <h4 className="aq-quiz-title">{qTitle}</h4>
            <div className="aq-quiz-meta">
              <span className="aq-badge-primary">ID: {qId}</span>
              <span className="aq-meta-text">Active Assessment Repository Expansion</span>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Left Column: Form Interface */}
        <div className="col-xl-7">
          <div className="aq-card shadow-sm h-100">
            {/* Tabs */}
            <div className="aq-tabs-header border-bottom">
              {isOBJ && (
                <button 
                  type="button"
                  className={`aq-tab-btn ${activeTab === 'OBJ' ? 'active' : ''}`}
                  onClick={() => setActiveTab('OBJ')}
                >
                  <List size={18} /> <span>Objective Inventory</span>
                </button>
              )}
              {isTheory && (
                <button 
                  type="button"
                  className={`aq-tab-btn ${activeTab === 'THEORY' ? 'active' : ''}`}
                  onClick={() => setActiveTab('THEORY')}
                >
                  <FileText size={18} /> <span>Theory Protocol</span>
                </button>
              )}
            </div>

            {/* Form Body */}
            <div className="aq-card-body p-4 p-md-5">
              {activeTab === 'OBJ' && isOBJ && (
                <form onSubmit={handleAddQuestion} className="animate-fade-in">
                  <div className="aq-form-group mb-4">
                    <label className="aq-form-label">
                      <Hash size={14} className="text-primary" /> Inquiry Content
                    </label>
                    <textarea 
                      className="aq-input-modern" 
                      rows={4}
                      value={question.content} 
                      onChange={e => setQuestion(q => ({ ...q, content: e.target.value }))} 
                      placeholder="Enter the comprehensive inquiry content here..."
                    />
                  </div>

                  <div className="row g-3 mb-4">
                    {['option1','option2','option3','option4'].map((k, i) => (
                      <div key={k} className="col-md-6">
                        <label className="aq-form-label">
                          <span className="aq-option-badge">{String.fromCharCode(65 + i)}</span>
                          Option {String.fromCharCode(65 + i)}{i >= 2 ? ' (Optional)' : '' }
                        </label>
                        <div className="aq-input-wrapper">
                          <input 
                            className="aq-input-modern" 
                            value={(question as any)[k]} 
                            onChange={e => setQuestion(q => ({ ...q, [k]: e.target.value }))} 
                            placeholder={`Response ${String.fromCharCode(65 + i)}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="aq-form-group mb-5">
                    <label className="aq-form-label">
                      <Award size={14} className="text-success" /> Validation Key Assignment
                    </label>
                    <select 
                      className="aq-select-modern" 
                      multiple 
                      value={question.correct_answer} 
                      onChange={e => setQuestion(q => ({ ...q, correct_answer: Array.from(e.target.selectedOptions).map(o => o.value) }))}
                    >
                      {['option1','option2','option3','option4'].filter(k => (question as any)[k]).map(k => (
                        <option key={k} value={(question as any)[k]}>{(question as any)[k]}</option>
                      ))}
                    </select>
                    <div className="aq-hint-box mt-3">
                      <Info size={16} className="text-info flex-shrink-0" />
                      <span>Hold <strong>Ctrl/Cmd</strong> to assign multiple valid responses for this registry item.</span>
                    </div>
                  </div>

                  <button type="submit" className="aq-btn-primary w-100" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20}/>}
                    <span>{loading ? 'Synchronizing...' : 'Initialize Objective Item'}</span>
                  </button>
                </form>
              )}

              {activeTab === 'THEORY' && isTheory && (
                <form onSubmit={handleAddTheory} className="animate-fade-in">
                  <div className="row g-3 mb-4">
                    <div className="col-md-8">
                      <label className="aq-form-label">Registry Identifier</label>
                      <input 
                        className="aq-input-modern" 
                        value={theoryForm.quesNo} 
                        onChange={e => setTheoryForm(t => ({ ...t, quesNo: e.target.value }))} 
                        placeholder="e.g. Q1a"
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="aq-form-label text-md-center">Weight (PTS)</label>
                      <input 
                        className="aq-input-modern text-md-center text-primary fw-bold font-size-18" 
                        type="number" 
                        value={theoryForm.marks || ''} 
                        onChange={e => setTheoryForm(t => ({ ...t, marks: Number(e.target.value) }))} 
                        placeholder="5"
                      />
                    </div>
                  </div>

                  <div className="aq-form-group mb-4">
                    <label className="aq-form-label">Theory Inquiry Content</label>
                    <textarea 
                      className="aq-input-modern" 
                      rows={5} 
                      value={theoryForm.question} 
                      onChange={e => setTheoryForm(t => ({ ...t, question: e.target.value }))} 
                      placeholder="Enter the comprehensive theory item content here..."
                    />
                  </div>

                  <div className="aq-form-group mb-5">
                    <label className="aq-form-label">Evaluation KPI Guidelines</label>
                    <textarea 
                      className="aq-input-modern bg-light border-dashed" 
                      rows={3} 
                      value={theoryForm.evaluationCriteria} 
                      onChange={e => setTheoryForm(t => ({ ...t, evaluationCriteria: e.target.value }))} 
                      placeholder="Internal grading benchmarks for this protocol..."
                    />
                  </div>

                  <button type="submit" className="aq-btn-success w-100" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20}/>}
                    <span>{loading ? 'Establishing Protocol...' : 'Initialize Theory Registry'}</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Bulk & Blueprint */}
        <div className="col-xl-5 d-flex flex-column gap-4">
          
          {/* Bulk Sync Widget */}
          <div className="aq-dark-widget shadow-sm">
            <div className="aq-dark-widget-header">
              <div className="aq-dark-icon">
                <Database size={20} />
              </div>
              <h5>Bulk Registry Sync</h5>
            </div>
            
            <div className="aq-dark-widget-body">
              {activeTab === 'OBJ' && isOBJ && (
                <div className="animate-fade-in">
                  <label className="aq-upload-zone mb-4">
                    <input type="file" accept=".json" onChange={e => onFileChange(e, 'OBJ')} style={{ display: 'none' }}/>
                    <FilePlus size={36} className="mb-3 text-white-50" />
                    <h6>{selectedFile ? selectedFile.name : 'Select JSON Registry'}</h6>
                    <p>Upload objective items in bulk</p>
                  </label>
                  
                  {filePreview.length > 0 && (
                    <div className="aq-staging-buffer mb-4">
                      <div className="aq-staging-header">
                        <span>Staging Buffer</span>
                        <span className="aq-staging-badge">{filePreview.length} Items</span>
                      </div>
                      <div className="aq-staging-list">
                        {filePreview.slice(0, 3).map((p, i) => (
                          <div key={i} className="aq-staging-item">
                            {i+1}. {p.content?.substring(0, 50)}...
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button className="aq-btn-primary-glow w-100" onClick={uploadObj} disabled={!selectedFile || loading}>
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18}/>}
                    <span>{loading ? 'Processing...' : 'Bulk Synchronize'}</span>
                  </button>
                </div>
              )}

              {activeTab === 'THEORY' && isTheory && (
                <div className="animate-fade-in">
                  <div className="row g-3 mb-4">
                    <div className="col-6">
                      <div className="aq-dark-input-group">
                        <label>Mandatory Items</label>
                        <input type="number" value={theoryQuesToAnswer.totalQuestToAnswer} onChange={e => setTheoryQA(t => ({ ...t, totalQuestToAnswer: e.target.value }))} placeholder="0"/>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="aq-dark-input-group">
                        <label>Minutes Allowed</label>
                        <input type="number" value={theoryQuesToAnswer.timeAllowed} onChange={e => setTheoryQA(t => ({ ...t, timeAllowed: e.target.value }))} placeholder="0"/>
                      </div>
                    </div>
                  </div>

                  <label className="aq-upload-zone success mb-4">
                    <input type="file" accept=".json" onChange={e => onFileChange(e, 'THEORY')} style={{ display: 'none' }}/>
                    <Layers size={36} className="mb-3 text-success" />
                    <h6 className={selectedFileTheory ? 'text-success' : ''}>{selectedFileTheory ? selectedFileTheory.name : 'Select Theory Registry'}</h6>
                  </label>

                  <button className="aq-btn-success-glow w-100" onClick={uploadTheory} disabled={!selectedFileTheory || loading}>
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18}/>}
                    <span>{loading ? 'Establishing...' : 'Establish Registry'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Blueprint Widget */}
          <div className="aq-blueprint-widget shadow-sm">
            <div className="aq-blueprint-header">
              <div className="aq-blueprint-icon">
                <Target size={20} />
              </div>
              <h6>Registry Blueprint Schema</h6>
            </div>
            
            <div className="aq-blueprint-body">
              <div className="aq-code-block mb-3">
                <div className="aq-code-label">
                  <span className="aq-dot primary"></span> Objective Protocol
                </div>
                <pre>{`{\n  "content": "...",\n  "option1": "...",\n  "correct_answer": ["..."]\n}`}</pre>
              </div>
              <div className="aq-code-block">
                <div className="aq-code-label">
                  <span className="aq-dot success"></span> Theory Protocol
                </div>
                <pre>{`{\n  "quesNo": "Q1",\n  "question": "...",\n  "marks": 5\n}`}</pre>
              </div>
            </div>
          </div>

        </div>
      </div>

      <style>{`
        .aq-page-wrapper { font-family: 'Inter', sans-serif; color: #334155; }
        
        /* Headers */
        .aq-header-container { display: flex; justify-content: space-between; align-items: center; }
        .aq-page-title { font-size: 24px; font-weight: 800; color: #1e293b; letter-spacing: -0.5px; }
        .aq-breadcrumb { font-size: 13px; font-weight: 600; display: flex; align-items: center; }
        
        /* Buttons */
        .aq-btn-outline { background: #fff; border: 1px solid #e2e8f0; color: #64748b; padding: 10px 18px; border-radius: 10px; font-weight: 600; font-size: 14px; display: flex; align-items: center; gap: 8px; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .aq-btn-outline:hover { background: #f8fafc; color: #0f172a; border-color: #cbd5e1; transform: translateY(-1px); }
        
        .aq-btn-primary { background: #626ed4; color: #fff; border: none; padding: 14px 24px; border-radius: 12px; font-weight: 700; font-size: 15px; display: flex; align-items: center; justify-content: center; gap: 10px; transition: all 0.2s; box-shadow: 0 4px 12px rgba(98, 110, 212, 0.2); }
        .aq-btn-primary:hover:not(:disabled) { background: #5460c5; transform: translateY(-2px); box-shadow: 0 6px 16px rgba(98, 110, 212, 0.3); }
        .aq-btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }

        .aq-btn-success { background: #10b981; color: #fff; border: none; padding: 14px 24px; border-radius: 12px; font-weight: 700; font-size: 15px; display: flex; align-items: center; justify-content: center; gap: 10px; transition: all 0.2s; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2); }
        .aq-btn-success:hover:not(:disabled) { background: #059669; transform: translateY(-2px); box-shadow: 0 6px 16px rgba(16, 185, 129, 0.3); }
        .aq-btn-success:disabled { opacity: 0.7; cursor: not-allowed; }

        .aq-btn-primary-glow { background: #626ed4; color: #fff; border: none; padding: 14px; border-radius: 12px; font-weight: 700; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px; transition: 0.2s; box-shadow: 0 0 20px rgba(98, 110, 212, 0.4); }
        .aq-btn-primary-glow:hover:not(:disabled) { background: #717ce0; box-shadow: 0 0 30px rgba(98, 110, 212, 0.6); }

        .aq-btn-success-glow { background: #10b981; color: #fff; border: none; padding: 14px; border-radius: 12px; font-weight: 700; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px; transition: 0.2s; box-shadow: 0 0 20px rgba(16, 185, 129, 0.3); }
        .aq-btn-success-glow:hover:not(:disabled) { background: #34d399; box-shadow: 0 0 30px rgba(16, 185, 129, 0.5); }
        
        /* Context Banner */
        .aq-context-banner { background: #fff; border-radius: 16px; padding: 24px; border: 1px solid #e2e8f0; }
        .aq-context-inner { display: flex; align-items: center; gap: 20px; }
        .aq-context-icon { width: 56px; height: 56px; background: rgba(98, 110, 212, 0.1); color: #626ed4; border-radius: 16px; display: flex; align-items: center; justify-content: center; }
        .aq-quiz-title { font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 6px; }
        .aq-quiz-meta { display: flex; align-items: center; gap: 12px; }
        .aq-badge-primary { background: #eff2fe; color: #626ed4; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; }
        .aq-meta-text { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }

        /* Cards & Forms */
        .aq-card { background: #fff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
        
        .aq-tabs-header { display: flex; background: #f8fafc; padding: 0 8px; pt: 8px; border-bottom: 1px solid #e2e8f0; }
        .aq-tab-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 10px; background: transparent; border: none; padding: 20px 0; font-size: 14px; font-weight: 700; color: #64748b; transition: 0.2s; position: relative; border-bottom: 3px solid transparent; }
        .aq-tab-btn:hover { color: #0f172a; }
        .aq-tab-btn.active { color: #626ed4; border-bottom-color: #626ed4; background: #fff; }
        
        .aq-form-label { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
        .aq-option-badge { background: #f1f5f9; color: #475569; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 800; }
        
        .aq-input-modern { width: 100%; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; font-size: 14px; font-weight: 500; color: #1e293b; transition: all 0.2s; outline: none; box-shadow: inset 0 1px 2px rgba(0,0,0,0.02); }
        .aq-input-modern:focus { background: #fff; border-color: #626ed4; box-shadow: 0 0 0 4px rgba(98, 110, 212, 0.1); }
        .aq-input-modern::placeholder { color: #94a3b8; }
        
        .border-dashed { border-style: dashed !important; border-width: 2px !important; }
        
        .aq-select-modern { width: 100%; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; font-size: 14px; font-weight: 600; color: #1e293b; outline: none; min-height: 140px; transition: 0.2s; }
        .aq-select-modern:focus { border-color: #626ed4; box-shadow: 0 0 0 4px rgba(98, 110, 212, 0.1); }
        .aq-select-modern option { padding: 10px; border-radius: 6px; margin-bottom: 4px; cursor: pointer; transition: 0.1s; }
        .aq-select-modern option:checked { background: #eff2fe; color: #626ed4; font-weight: 700; }

        .aq-hint-box { display: flex; align-items: center; gap: 12px; background: #f0f9ff; border: 1px dashed #bae6fd; padding: 14px 16px; border-radius: 10px; font-size: 13px; color: #0369a1; }
        
        /* Dark Widget */
        .aq-dark-widget { background: #1e293b; border-radius: 16px; color: #fff; overflow: hidden; position: relative; }
        .aq-dark-widget::before { content: ''; position: absolute; top: 0; right: 0; width: 200px; height: 200px; background: radial-gradient(circle, rgba(98, 110, 212, 0.3) 0%, transparent 70%); border-radius: 50%; opacity: 0.5; pointer-events: none; }
        
        .aq-dark-widget-header { padding: 24px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; gap: 12px; position: relative; z-index: 2; }
        .aq-dark-widget-header h5 { margin: 0; font-size: 16px; font-weight: 700; letter-spacing: 0.5px; }
        .aq-dark-icon { width: 36px; height: 36px; background: rgba(255,255,255,0.1); border-radius: 10px; display: flex; align-items: center; justify-content: center; }
        
        .aq-dark-widget-body { padding: 24px; position: relative; z-index: 2; }
        
        .aq-upload-zone { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 160px; border: 2px dashed rgba(255,255,255,0.2); border-radius: 16px; cursor: pointer; transition: 0.2s; background: rgba(255,255,255,0.02); }
        .aq-upload-zone:hover { border-color: #626ed4; background: rgba(98, 110, 212, 0.05); }
        .aq-upload-zone h6 { margin: 0 0 4px 0; font-size: 15px; font-weight: 700; }
        .aq-upload-zone p { margin: 0; font-size: 12px; color: rgba(255,255,255,0.4); }
        
        .aq-upload-zone.success:hover { border-color: #10b981; background: rgba(16, 185, 129, 0.05); }

        .aq-dark-input-group label { display: block; font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.5); text-transform: uppercase; margin-bottom: 8px; }
        .aq-dark-input-group input { width: 100%; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 12px; color: #fff; font-size: 16px; font-weight: 700; text-align: center; outline: none; transition: 0.2s; }
        .aq-dark-input-group input:focus { border-color: rgba(255,255,255,0.3); background: rgba(0,0,0,0.4); }
        
        .aq-staging-buffer { background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 16px; }
        .aq-staging-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: rgba(255,255,255,0.5); }
        .aq-staging-badge { background: rgba(16, 185, 129, 0.2); color: #34d399; padding: 2px 8px; border-radius: 10px; }
        .aq-staging-list { max-height: 120px; overflow-y: auto; }
        .aq-staging-item { font-size: 13px; color: rgba(255,255,255,0.8); padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .aq-staging-item:last-child { border-bottom: none; }

        /* Blueprint Widget */
        .aq-blueprint-widget { background: #fff; border-radius: 16px; border: 1px solid #e2e8f0; }
        .aq-blueprint-header { padding: 20px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; gap: 12px; }
        .aq-blueprint-header h6 { margin: 0; font-size: 15px; font-weight: 800; color: #1e293b; }
        .aq-blueprint-icon { width: 32px; height: 32px; background: #f1f5f9; color: #64748b; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
        
        .aq-blueprint-body { padding: 20px; }
        .aq-code-block { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
        .aq-code-label { display: flex; align-items: center; gap: 8px; padding: 12px 16px; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; background: #fff; }
        .aq-dot { width: 8px; height: 8px; border-radius: 50%; }
        .aq-dot.primary { background: #626ed4; }
        .aq-dot.success { background: #10b981; }
        .aq-code-block pre { margin: 0; padding: 16px; font-size: 12px; color: #64748b; font-family: 'Fira Code', monospace; line-height: 1.5; }

        /* Utilities */
        .animate-fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
