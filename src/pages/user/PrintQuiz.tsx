import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getReport, getQuestionsForText, getTheoryReport, getResultsDetails, getNumberOfTheoryToAnswer } from '../../api/endpoints';
import { Printer, ArrowLeft, Download, CheckCircle, XCircle, Info, Award, User, Clock, Calendar, FileText, ChevronRight, Loader2 } from 'lucide-react';

/* ─── helpers ───────────────────────────────────────────────────────────── */
const fmtDur = (m: number) => { const h = Math.floor(m/60); const mm = m%60; return h>0?`${h}hr ${mm}min`:`${mm} min`; };
const pct = (got: any, max: any) => { const g=parseFloat(got||0),m=parseFloat(max||0); return m>0?Math.round((g/m)*100):0; };
const gradeColor = (p: number) => p>=70?'#10b981':p>=50?'#f1b44c':'#ef6767';
const gradeLabel = (p: number) => p>=70?'EXCELLENT':p>=50?'SATISFACTORY':'NEEDS IMPROVEMENT';

const groupByPrefix = (data: any[]) => {
  if (!data?.length) return [];
  const map: Record<string,any[]> = {};
  data.forEach(q => {
    const pre = (q.quesO?.match(/^(Q\d+)/i)?.[0]??'OTHER').toUpperCase();
    (map[pre] ??= []).push(q);
  });
  return Object.entries(map).map(([prefix,questions]) => ({ prefix, questions }));
};

const StatusBadge = ({ status }: { status: string }) => {
  const s = (status||'SKIPPED').toUpperCase();
  const cfg: Record<string,{bg:string;color:string;label:string}> = {
    CORRECT:  { bg:'rgba(16, 185, 129, 0.1)', color:'#10b981', label:'Correct' },
    WRONG:    { bg:'rgba(239, 103, 103, 0.1)', color:'#ef6767', label:'Incorrect' },
    PARTIAL:  { bg:'rgba(241, 180, 76, 0.1)', color:'#f1b44c', label:'Partial' },
    SKIPPED:  { bg:'rgba(173, 181, 189, 0.1)', color:'#adb5bd', label:'Skipped' },
  };
  const c = cfg[s] ?? cfg.SKIPPED;
  return (
    <span style={{ padding:'4px 12px', borderRadius:4, fontSize:10, fontWeight:700, background:c.bg, color:c.color, textTransform:'uppercase', letterSpacing:'0.05em' }}>
      {c.label}
    </span>
  );
};

export default function PrintQuiz() {
  const { qid }  = useParams();
  const { user } = useAuth();
  const [report, setReport]         = useState<any[]>([]);
  const [questions, setQuestions]   = useState<any[]>([]);
  const [theoryGroups, setTGroups]  = useState<any[]>([]);
  const [resultsObj, setResultsObj] = useState<any>(null);
  const [theoryCount, setTCount]    = useState<any[]>([]);
  const [username, setUsername]     = useState('');
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    if (!qid) return;
    const stored = localStorage.getItem('user');
    if (stored) { try { const u=JSON.parse(stored); setUsername(u.username??''); } catch {} }

    Promise.all([
      getReport(user?.id!, qid).catch(()=>[]),
      getQuestionsForText(qid).catch(()=>[]),
      getTheoryReport(qid).catch(()=>[]),
      getResultsDetails(qid).catch(()=>null),
      getNumberOfTheoryToAnswer(qid).catch(()=>[]),
    ]).then(([rep,qs,theory,objRes,nqArr]) => {
      setReport(Array.isArray(rep)?rep:[]);
      setQuestions((Array.isArray(qs)?qs:[]).map((q:any,i:number)=>({...q,count:i+1})));
      setTGroups(groupByPrefix(Array.isArray(theory)?theory:[]));
      setResultsObj(objRes);
      setTCount(Array.isArray(nqArr)?nqArr:[]);
    }).finally(()=>setLoading(false));
  }, [qid, user]);

  const quizType      = report[0]?.quiz?.quizType ?? questions[0]?.quiz?.quizType;
  const showSectionA  = questions.length>0 && (quizType==='OBJ'||quizType==='BOTH'||!quizType);
  const showSectionB  = theoryGroups.length>0 && (quizType==='THEORY'||quizType==='BOTH');
  const mcqs          = (resultsObj?.results??[]).filter((q:any)=>q.questionType==='MCQ'||!q.questionType);
  const tfs           = (resultsObj?.results??[]).filter((q:any)=>q.questionType==='TRUE_FALSE');
  const matchings     = (resultsObj?.results??[]).filter((q:any)=>q.questionType==='MATCHING');
  const theoryTotal   = theoryGroups.reduce((s,g)=>s+g.questions.reduce((ss:number,q:any)=>ss+(q.score||0),0),0);
  const r0            = report[0];
  const objScore      = parseFloat(r0?.marks||0);
  const thScore       = theoryTotal;
  const totalScore    = objScore + thScore;
  const maxObj        = parseFloat(r0?.quiz?.maxMarks||0);
  const maxTh         = parseFloat(r0?.maxScoreSectionB||0);
  const totalMax      = maxObj + maxTh;
  const totalPct      = pct(totalScore, totalMax);
  const timeAllowed   = (parseFloat(r0?.quiz?.quizTime||0))+(theoryCount[0]?.timeAllowed||0);

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#f8f9fa', flexDirection:'column', gap:24 }}>
      <Loader2 className="spin-ico" size={48} style={{ color: 'var(--primary)' }} />
      <div style={{ color:'#2a3142', fontSize:16, fontWeight:800 }}>Assembling Academic Transcript...</div>
      <style>{`
        .spin-ico { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );

  return (
    <div style={{ background:'#f4f7fa', minHeight:'100vh', paddingBottom: 60, fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @media print {
          .no-print{display:none!important}
          body{background:#fff!important; padding:0!important}
          .print-page{box-shadow:none!important; border-radius:0!important; margin:0!important; max-width:100%!important; border:none!important}
          .lexa-card { border: 1px solid #f1f5f7 !important; }
        }
        .btn-hover:hover { opacity: 0.9; transform: translateY(-1px); }
        .print-toolbar { padding: 15px 40px; }
        .print-header { padding: 60px 50px 40px; display: flex; justify-content: space-between; align-items: flex-start; }
        .print-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); }
        .print-viz-pad { padding: 50px; }
        .print-viz-flex { display: flex; gap: 60px; alignItems: center; flex-wrap: wrap; }
        .print-section-pad { padding: 0 50px 50px; }
        .print-question-flex { display: flex; justify-content: space-between; gap: 30px; margin-bottom: 25px; }
        .print-footer { padding: 40px 50px; }
        
        @media (max-width: 768px) {
          .print-toolbar { padding: 15px 20px; flex-direction: column; gap: 15px; text-align: center; }
          .print-header { padding: 30px 20px 20px; flex-direction: column; gap: 20px; text-align: center; }
          .print-header > div { width: 100%; display: flex; flex-direction: column; align-items: center; text-align: center; }
          .print-header > div > div { justify-content: center; }
          .print-grid-4 { grid-template-columns: 1fr 1fr; }
          .print-grid-4 > div { border-right: none !important; border-bottom: 1px solid #f1f5f7; }
          .print-viz-pad { padding: 25px; }
          .print-viz-flex { gap: 30px; flex-direction: column; }
          .print-viz-flex > div { width: 100% !important; min-width: 0 !important; border-right: none !important; padding-right: 0 !important; }
          .print-section-pad { padding: 0 20px 30px; }
          .print-question-flex { flex-direction: column; gap: 15px; }
          .print-footer { padding: 25px 20px; flex-direction: column; gap: 15px; text-align: center; }
        }
      `}</style>

      {/* Modern Toolbar */}
      <div className="no-print print-toolbar" style={{ background:'#fff', borderBottom:'1px solid #e1e9f1', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100, boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:15 }}>
          <Link to="/user-dashboard/history" style={{ color:'#74788d', background:'#f8f9fa', width:36, height:36, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s' }} className="btn-hover">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <span style={{ fontWeight:800, fontSize:15, color:'#2a3142', display: 'block' }}>Candidate Examination Report</span>
            <span style={{ fontSize:11, color:'#adb5bd', fontWeight:700 }}>Academic Performance Record • Session 2023/2024</span>
          </div>
        </div>
        <div style={{ display:'flex', gap:12 }}>
          <button onClick={() => { document.title = username || 'exam-results'; window.print(); }} style={{ padding:'10px 25px', fontSize:13, fontWeight:800, display:'flex', alignItems:'center', gap:10, background:'var(--primary)', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', boxShadow:'0 4px 12px rgba(122, 111, 190, 0.25)' }} className="btn-hover">
            <Printer size={18} /> Print Record
          </button>
        </div>
      </div>

      <div style={{ maxWidth:1000, margin:'40px auto', padding:'0 25px' }}>
        <div className="print-page lexa-card" style={{ background:'#fff', borderRadius:16, border: 'none', overflow:'hidden', boxShadow:'0 15px 35px rgba(18, 38, 63, 0.05)' }}>

          {/* ── HEADER ── */}
          <div className="print-header" style={{ borderBottom:'1px solid #f1f5f7', background: 'linear-gradient(to right, #ffffff, #fcfdfe)' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:20, marginBottom:30 }}>
                <div style={{ width:64, height:64, background:'var(--primary)', borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:24, color:'#fff', boxShadow: '0 8px 20px rgba(122, 111, 190, 0.3)' }}>UCC</div>
                <div>
                  <h1 style={{ margin:0, fontSize:26, fontWeight:800, color:'#2a3142', letterSpacing: '-0.02em' }}>University of Cape Coast</h1>
                  <div style={{ fontSize:13, color:'var(--primary)', fontWeight:800, textTransform:'uppercase', marginTop:4, letterSpacing:'0.05em' }}>Faculty of Physical Sciences • Department of CS & IT</div>
                </div>
              </div>
              
              {r0 && (
                <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
                  <div style={{ padding: '8px 15px', background: 'rgba(122, 111, 190, 0.05)', borderRadius: 10, border: '1px solid rgba(122, 111, 190, 0.1)' }}>
                    <span style={{ fontSize:13, fontWeight:800, color:'var(--primary)' }}>{r0.quiz?.category?.courseCode}</span>
                  </div>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:'#adb5bd', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{r0.quiz?.category?.title}</div>
                    <h2 style={{ margin:'2px 0 0', fontSize:20, fontWeight:800, color:'#2a3142' }}>{r0.quiz?.title}</h2>
                  </div>
                </div>
              )}
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ padding:'20px 25px', background:'#fcfdfe', borderRadius:12, border:'1px solid #f1eefb' }}>
                <div style={{ fontSize:11, fontWeight:800, color:'#adb5bd', textTransform:'uppercase', marginBottom:5, letterSpacing: '0.05em' }}>Reference ID</div>
                <div style={{ fontSize:18, fontWeight:800, color:'#2a3142' }}>#{qid?.padStart(6, '0')}</div>
                <div style={{ fontSize:12, color:'#adb5bd', marginTop:6, fontWeight: 700 }}>{new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}</div>
              </div>
            </div>
          </div>

          {/* ── STUDENT CREDENTIALS ── */}
          {r0 && (
            <div className="print-grid-4" style={{ background:'#fff', borderBottom:'1px solid #f1f5f7' }}>
              {[
                { label:'Candidate ID', value:username.toUpperCase() || r0.user?.username?.toUpperCase(), icon:<User size={16} /> },
                { label:'Candidate Name', value:`${r0.user?.firstname} ${r0.user?.lastname}`, icon:<FileText size={16} /> },
                { label:'Duration', value: fmtDur(timeAllowed), icon:<Clock size={16} /> },
                { label:'Merit Status', value: totalPct >= 50 ? 'QUALIFIED' : 'REVIEW', icon:<Award size={16} /> },
              ].map((item, i) => (
                <div key={i} style={{ padding:'25px 30px', borderRight: i < 3 ? '1px solid #f1f5f7' : 'none' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                    <span style={{ color:'var(--primary)' }}>{item.icon}</span>
                    <span style={{ fontSize:11, fontWeight:800, color:'#adb5bd', textTransform:'uppercase', letterSpacing: '0.05em' }}>{item.label}</span>
                  </div>
                  <div style={{ fontSize:15, fontWeight:800, color: item.label === 'Merit Status' ? gradeColor(totalPct) : '#2a3142' }}>{item.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* ── PERFORMANCE VISUALIZATION ── */}
          <div className="print-viz-pad">
            <div className="print-viz-flex">
              <div style={{ width:220, display:'flex', flexDirection:'column', alignItems:'center', borderRight:'1px solid #f1f5f7', paddingRight:60 }}>
                <div style={{ position:'relative', width:150, height:150, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', transform:'rotate(-90deg)' }}>
                    <circle cx="75" cy="75" r="68" fill="none" stroke="#f1f5f7" strokeWidth="10" />
                    <circle cx="75" cy="75" r="68" fill="none" stroke={gradeColor(totalPct)} strokeWidth="10" strokeDasharray={`${2 * Math.PI * 68}`} strokeDashoffset={`${2 * Math.PI * 68 * (1 - totalPct / 100)}`} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
                  </svg>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:36, fontWeight:800, color:'#2a3142' }}>{totalPct}%</div>
                    <div style={{ fontSize:11, fontWeight:800, color:'#adb5bd', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Score</div>
                  </div>
                </div>
                <div style={{ marginTop:25, padding:'6px 18px', background:`${gradeColor(totalPct)}15`, borderRadius:8, border: `1px solid ${gradeColor(totalPct)}30` }}>
                   <span style={{ fontSize:11, fontWeight:800, color:gradeColor(totalPct), textTransform:'uppercase', letterSpacing: '0.05em' }}>{gradeLabel(totalPct)}</span>
                </div>
              </div>

              <div style={{ flex:1, minWidth: 350 }}>
                <h3 style={{ margin:'0 0 25px 0', fontSize:15, fontWeight:800, color:'#2a3142', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Competency Breakdown</h3>
                
                <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                  {showSectionA && (
                    <div style={{ padding:'20px', borderRadius:12, background:'#fcfdfe', border:'1px solid #f1f5f7' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:12 }}>
                        <div>
                           <div style={{ fontSize:10, fontWeight:800, color:'#adb5bd', textTransform:'uppercase', letterSpacing: '0.05em' }}>Module Section A</div>
                           <div style={{ fontSize:15, fontWeight:800, color:'#2a3142' }}>Objective Evaluation</div>
                        </div>
                        <div style={{ textAlign:'right' }}>
                           <span style={{ fontSize:20, fontWeight:800, color:'var(--primary)' }}>{objScore}</span>
                           <span style={{ fontSize:13, color:'#adb5bd', fontWeight: 600 }}> / {maxObj}</span>
                        </div>
                      </div>
                      <div style={{ height:8, background:'#f1f5f7', borderRadius:4, overflow:'hidden' }}>
                        <div style={{ width:`${pct(objScore, maxObj)}%`, height:'100%', background:'var(--primary)', borderRadius: 4 }} />
                      </div>
                    </div>
                  )}

                  {showSectionB && (
                    <div style={{ padding:'20px', borderRadius:12, background:'#fcfdfe', border:'1px solid #f1f5f7' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:12 }}>
                        <div>
                           <div style={{ fontSize:10, fontWeight:800, color:'#adb5bd', textTransform:'uppercase', letterSpacing: '0.05em' }}>Module Section B</div>
                           <div style={{ fontSize:15, fontWeight:800, color:'#2a3142' }}>Theoretical Proficiency</div>
                        </div>
                        <div style={{ textAlign:'right' }}>
                           <span style={{ fontSize:20, fontWeight:800, color:'#10b981' }}>{thScore}</span>
                           <span style={{ fontSize:13, color:'#adb5bd', fontWeight: 600 }}> / {maxTh}</span>
                        </div>
                      </div>
                      <div style={{ height:8, background:'#f1f5f7', borderRadius:4, overflow:'hidden' }}>
                        <div style={{ width:`${pct(thScore, maxTh)}%`, height:'100%', background:'#10b981', borderRadius: 4 }} />
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop:10, padding:'22px 30px', borderRadius:14, background:'#2a3142', display:'flex', justifyContent:'space-between', alignItems:'center', boxShadow: '0 10px 20px rgba(42, 49, 66, 0.15)' }}>
                    <div style={{ fontSize:15, fontWeight:800, color:'#fff' }}>Final Aggregate Total</div>
                    <div style={{ fontSize:26, fontWeight:800, color:gradeColor(totalPct) }}>{totalScore} <span style={{ fontSize:16, color:'rgba(255,255,255,0.3)', fontWeight: 600 }}>/ {totalMax}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── SECTION A ANALYSIS ── */}
          {showSectionA && (
            <div className="print-section-pad">
              <div style={{ display:'flex', alignItems:'center', gap:15, marginBottom:25, padding:'15px 20px', background:'#fcfdfe', borderRadius:12, border: '1px solid #f1f5f7' }}>
                <div style={{ width:36, height:36, borderRadius:8, background:'rgba(122, 111, 190, 0.1)', color:'var(--primary)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                   <CheckCircle size={20} />
                </div>
                <h4 style={{ margin:0, fontSize:16, fontWeight:800, color:'#2a3142' }}>Section A: Objective Assessment Details</h4>
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:15 }}>
                {mcqs.map((q:any, i:number) => (
                  <div key={i} style={{ padding:'25px', border:'1px solid #f1f5f7', borderRadius:12, background: '#fff' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', gap:25, marginBottom:20 }}>
                      <div style={{ display:'flex', gap:15 }}>
                        <span style={{ fontWeight:800, color:'#adb5bd', fontSize:15 }}>{String(i+1).padStart(2, '0')}.</span>
                        <div style={{ fontSize:15, color:'#2a3142', fontWeight:600, lineHeight:1.6 }} dangerouslySetInnerHTML={{__html:q.content}} />
                      </div>
                      <StatusBadge status={q.status} />
                    </div>
                    
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                      {['option1','option2','option3','option4'].filter(k=>q[k]).map((k, j) => {
                        const isCorrect = q.correct_answer?.includes(q[k]);
                        const isSelected = q.selectedAnswers?.includes(q[k]);
                        const color = isCorrect ? '#10b981' : isSelected ? '#ef6767' : '#f1f5f7';
                        return (
                          <div key={k} style={{ 
                            padding:'12px 18px', borderRadius:10, fontSize:14,
                            border: `1.5px solid ${isCorrect || isSelected ? color : '#f1f5f7'}`,
                            background: isCorrect ? 'rgba(16,185,129,0.03)' : isSelected ? 'rgba(239,103,103,0.03)' : '#fff',
                            color: isCorrect || isSelected ? (isCorrect ? '#10b981' : '#ef6767') : '#495057',
                            fontWeight: isCorrect || isSelected ? 800 : 500,
                            display:'flex', alignItems:'center', gap:12
                          }}>
                            <span style={{ width:24, height:24, borderRadius:6, background: isCorrect || isSelected ? color : 'rgba(0,0,0,0.03)', color: isCorrect || isSelected ? '#fff' : '#adb5bd', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800 }}>{['A','B','C','D'][j]}</span>
                            <span style={{ flex:1 }}>{q[k]}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── SECTION B ANALYSIS ── */}
          {showSectionB && (
            <div className="print-section-pad">
              <div style={{ display:'flex', alignItems:'center', gap:15, marginBottom:25, padding:'15px 20px', background:'#fcfdfe', borderRadius:12, border: '1px solid #f1f5f7' }}>
                <div style={{ width:36, height:36, borderRadius:8, background:'rgba(16, 185, 129, 0.1)', color:'#10b981', display:'flex', alignItems:'center', justifyContent:'center' }}>
                   <Award size={20} />
                </div>
                <h4 style={{ margin:0, fontSize:16, fontWeight:800, color:'#2a3142' }}>Section B: Theoretical Performance Analysis</h4>
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:40 }}>
                {theoryGroups.map((group) => (
                  <div key={group.prefix}>
                    <div style={{ display:'flex', alignItems:'center', gap:15, marginBottom:20 }}>
                      <span style={{ fontSize:12, fontWeight:800, color:'#adb5bd', textTransform:'uppercase', letterSpacing: '0.05em' }}>Curriculum Module {group.prefix}</span>
                      <div style={{ height:1, flex:1, background:'#f1f5f7' }} />
                    </div>

                    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                      {group.questions.map((q:any, qi:number) => {
                        const p = pct(q.score, q.maxMarks);
                        return (
                          <div key={qi} style={{ border:'1px solid #f1f5f7', borderRadius:12, padding:'30px', background: '#fff' }}>
                            <div className="print-question-flex">
                              <div style={{ flex:1 }}>
                                <div style={{ fontSize:11, fontWeight:800, color:'var(--primary)', marginBottom:6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{q.quesO}</div>
                                <h5 style={{ margin:0, fontSize:17, fontWeight:800, color:'#2a3142', lineHeight: 1.5 }}>{q.question}</h5>
                              </div>
                              <div style={{ textAlign:'center', padding:'12px 20px', background:'#fcfdfe', borderRadius:12, border:'1px solid #f1eefb', minWidth: 80 }}>
                                <div style={{ fontSize:22, fontWeight:800, color:gradeColor(p) }}>{q.score}</div>
                                <div style={{ fontSize:11, fontWeight:800, color:'#adb5bd' }}>/ {q.maxMarks}</div>
                              </div>
                            </div>

                            <div style={{ marginBottom:20 }}>
                              <div style={{ fontSize:11, fontWeight:800, color:'#adb5bd', textTransform:'uppercase', marginBottom:12, letterSpacing: '0.05em' }}>Candidate Qualitative Response</div>
                              <div style={{ padding:'20px 25px', background:'#fcfdfe', borderRadius:12, fontSize:14, color:'#495057', lineHeight:1.8, border:'1px solid #f1f5f7', whiteSpace:'pre-wrap', fontWeight: 500 }}>
                                {q.studentAnswer || "No qualitative response captured for this module."}
                              </div>
                            </div>

                            {q.keyMissed && q.keyMissed.length > 0 && !(q.keyMissed.length === 1 && q.keyMissed[0] === '') && (
                              <div style={{ padding:'18px 24px', background:'rgba(241, 180, 76, 0.05)', borderRadius:12, border:'1px solid rgba(241, 180, 76, 0.1)', display:'flex', gap:15 }}>
                                <Info size={20} style={{ color:'#f1b44c', flexShrink:0, marginTop: 2 }} />
                                <div style={{ fontSize:13, color:'#495057', lineHeight:1.6, fontWeight: 500 }}>
                                  <strong style={{ color:'#f1b44c', textTransform:'uppercase', fontSize:11, fontWeight: 800 }}>Evaluator Feedback: </strong>
                                  {Array.isArray(q.keyMissed) ? q.keyMissed.join(', ') : q.keyMissed}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── FOOTER ── */}
          <div className="print-footer" style={{ background:'#2a3142', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <CheckCircle size={24} />
              </div>
              <div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', fontWeight:800, letterSpacing: '0.05em' }}>OFFICIAL ACADEMIC TRANSCRIPT</div>
                <div style={{ fontSize:13, color:'#fff', fontWeight:700, marginTop:2 }}>Lexa Examination Framework • Verified Records</div>
              </div>
            </div>
            <div style={{ textAlign:'right' }}>
               <span style={{ fontSize:12, fontWeight:800, color:'#fff', background:'rgba(255,255,255,0.1)', padding:'8px 20px', borderRadius:8, border: '1px solid rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{gradeLabel(totalPct)}</span>
            </div>
          </div>
        </div>
        
        <div style={{ marginTop:30, textAlign:'center' }}>
          <p style={{ fontSize:12, color:'#adb5bd', fontWeight:600 }}>This document is a computer-generated academic record. No physical signature is required for validity. Portal Security: Active & Verified.</p>
        </div>
      </div>
    </div>
  );
}
