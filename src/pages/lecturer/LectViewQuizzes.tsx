import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { loadQuizzesForUser, getCategories, getQuiz, updateQuiz, deleteQuiz, updateQuizStatus } from '../../api/endpoints';
import Swal from 'sweetalert2';
import toast, { Toaster } from 'react-hot-toast';
import { Plus, X, Save, Loader2, Database, Settings, Trash2, Eye, EyeOff, ShieldCheck, Clock, Calendar, Layers, ChevronRight, CheckCircle, Edit, Smartphone, Terminal } from 'lucide-react';

const VIOLATION_OPTIONS = [
  { v:'NONE', l:'None' }, { v:'DELAY_ONLY', l:'Delay Student' },
  { v:'AUTOSUBMIT_ONLY', l:'Auto Submit' }, { v:'DELAY_AND_AUTOSUBMIT', l:'Delay + Auto' },
];

const inp: React.CSSProperties = { width:'100%', padding:'9px 12px', borderRadius:'8px', border:'1px solid #e2e8f0', fontSize:'13px', color:'#2a3142', outline:'none', boxSizing:'border-box', fontFamily:'inherit', background:'#fafbff' };
const lbl: React.CSSProperties = { display:'block', fontSize:'11px', fontWeight:700, color:'#74788d', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'6px' };

function QuizEditModal({ qId, onClose, onSave, categories }: any) {
  const [quiz, setQuiz] = useState<any>(null);
  const [hide, setHide] = useState(true);
  useEffect(() => { getQuiz(qId).then(d => setQuiz({ ...d, selectedStatus: d.status })); }, [qId]);

  if (!quiz) return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.55)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:99999 }}>
      <div style={{ background:'#fff', borderRadius:'16px', padding:'40px', textAlign:'center' }}>
        <Loader2 style={{ animation:'spin 1s linear infinite', color:'#5156be', margin:'0 auto 12px' }} size={32} />
        <p style={{ color:'#74788d', fontSize:'14px', margin:0 }}>Fetching configuration...</p>
      </div>
    </div>
  );

  const set = (k: string, v: any) => setQuiz((q: any) => ({ ...q, [k]: v }));
  const save = async () => { try { await updateQuiz(quiz); toast.success('Quiz updated'); onSave(); onClose(); } catch { toast.error('Failed to sync'); } };

  const Toggle = ({ label, icon, k }: any) => (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderRadius:'10px', border:'1px solid #eff0f2', background:'#fff' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
        <div style={{ width:28, height:28, borderRadius:'8px', background:'rgba(81,86,190,0.08)', display:'flex', alignItems:'center', justifyContent:'center', color:'#5156be' }}>{icon}</div>
        <span style={{ fontSize:'13px', fontWeight:600, color:'#2a3142' }}>{label}</span>
      </div>
      <div onClick={() => set(k, !quiz[k])} style={{ cursor:'pointer', width:40, height:22, borderRadius:12, background:quiz[k]?'#5156be':'#e2e8f0', position:'relative', transition:'0.3s', flexShrink:0 }}>
        <div style={{ width:16, height:16, borderRadius:'50%', background:'#fff', position:'absolute', top:3, left:quiz[k]?21:3, transition:'0.3s', boxShadow:'0 2px 4px rgba(0,0,0,0.15)' }} />
      </div>
    </div>
  );

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.55)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:99999, padding:'16px' }}>
      <div style={{ background:'#fff', borderRadius:'16px', width:'100%', maxWidth:'640px', maxHeight:'92vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>

        <div style={{ background:'linear-gradient(135deg,#5156be 0%,#3d41a8 100%)', padding:'18px 24px', borderRadius:'16px 16px 0 0', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <div style={{ width:36, height:36, borderRadius:'10px', background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff' }}><Settings size={18}/></div>
            <div>
              <h5 style={{ margin:0, fontWeight:800, fontSize:'15px', color:'#fff' }}>Configure Assessment</h5>
              <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.7)' }}>Update quiz settings and schedule</span>
            </div>
          </div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:'8px', border:'none', background:'rgba(255,255,255,0.15)', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={16}/></button>
        </div>

        <div style={{ padding:'20px 24px', overflowY:'auto', flex:1, display:'flex', flexDirection:'column', gap:'14px' }}>

          <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:'12px' }}>
            <div><label style={lbl}>Quiz Title</label><input style={inp} value={quiz.title||''} onChange={e=>set('title',e.target.value)}/></div>
            <div><label style={lbl}>Category</label><select style={{...inp,minWidth:'130px'}} value={quiz.category?.cid||''} onChange={e=>set('category',{...quiz.category,cid:Number(e.target.value)})}>{categories.map((c:any)=><option key={c.cid} value={c.cid}>{c.title}</option>)}</select></div>
          </div>

          <div><label style={lbl}>Description / Instructions</label><textarea style={{...inp,resize:'vertical',minHeight:'65px',lineHeight:'1.6'}} value={quiz.description||''} onChange={e=>set('description',e.target.value)}/></div>

          <div style={{ display:'grid', gridTemplateColumns: quiz.quizType==='THEORY'?'1fr':'1fr 1fr', gap:'12px' }}>
            <div>
              <label style={lbl}>Quiz Mode</label>
              <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginTop:'2px' }}>
                {['THEORY','OBJ','BOTH'].map(t=>(
                  <button key={t} onClick={()=>set('quizType',t)} style={{ padding:'6px 14px', borderRadius:'20px', border:`1.5px solid ${quiz.quizType===t?'#5156be':'#e2e8f0'}`, background:quiz.quizType===t?'#5156be':'#fff', color:quiz.quizType===t?'#fff':'#74788d', fontSize:'11px', fontWeight:700, cursor:'pointer', transition:'0.2s' }}>{t}</button>
                ))}
              </div>
            </div>
            {quiz.quizType!=='THEORY'&&(
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px' }}>
                <div><label style={lbl}>Marks</label><input style={{...inp,textAlign:'center'}} type="number" value={quiz.maxMarks||''} onChange={e=>set('maxMarks',e.target.value)}/></div>
                <div><label style={lbl}>Items</label><input style={{...inp,textAlign:'center'}} type="number" value={quiz.numberOfQuestions||''} onChange={e=>set('numberOfQuestions',e.target.value)}/></div>
                <div><label style={lbl}>Time (m)</label><input style={{...inp,textAlign:'center'}} type="number" value={quiz.quizTime||''} onChange={e=>set('quizTime',e.target.value)}/></div>
              </div>
            )}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'12px' }}>
            <div><label style={lbl}>Scheduled Date</label><input style={inp} type="date" value={quiz.quizDate||''} onChange={e=>set('quizDate',e.target.value)}/></div>
            <div><label style={lbl}>Start Time</label><input style={inp} type="time" value={quiz.startTime||''} onChange={e=>set('startTime',e.target.value)}/></div>
            <div>
              <label style={lbl}>Password</label>
              <div style={{ position:'relative' }}>
                <input style={{...inp,paddingRight:'36px'}} type={hide?'password':'text'} value={quiz.quizpassword||''} onChange={e=>set('quizpassword',e.target.value)}/>
                <button type="button" onClick={()=>setHide(h=>!h)} style={{ position:'absolute', right:'8px', top:'50%', transform:'translateY(-50%)', border:'none', background:'transparent', color:'#74788d', cursor:'pointer', display:'flex', alignItems:'center' }}>{hide?<Eye size={15}/>:<EyeOff size={15}/>}</button>
              </div>
            </div>
          </div>

          <div style={{ background:'#f8f9ff', borderRadius:'12px', border:'1px solid #eff0f2', padding:'16px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'14px' }}>
              <ShieldCheck size={16} style={{ color:'#5156be' }}/>
              <span style={{ fontSize:'12px', fontWeight:700, color:'#2a3142', textTransform:'uppercase', letterSpacing:'0.8px' }}>Security & Integrity</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'12px', marginBottom:'10px' }}>
              <div><label style={lbl}>Violation Action</label><select style={inp} value={quiz.violationAction||'NONE'} onChange={e=>set('violationAction',e.target.value)}>{VIOLATION_OPTIONS.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select></div>
              <div><label style={lbl}>Max Violations</label><input style={{...inp,textAlign:'center'}} type="number" value={quiz.maxViolations??''} onChange={e=>set('maxViolations',Number(e.target.value))}/></div>
              <div><label style={lbl}>Delay (sec)</label><input style={{...inp,textAlign:'center'}} type="number" min="0" value={quiz.violationDelaySeconds??''} onChange={e=>set('violationDelaySeconds',Number(e.target.value))} placeholder="e.g. 30"/></div>
            </div>
            <div className="qem-toggle-grid">
              <Toggle label="Focus Lock" icon={<Layers size={14}/>} k="enableFullscreenLock"/>
              <Toggle label="Watermark" icon={<CheckCircle size={14}/>} k="enableWatermark"/>
              <Toggle label="Media Shield" icon={<Smartphone size={14}/>} k="enableScreenshotBlocking"/>
              <Toggle label="Tech Shield" icon={<Terminal size={14}/>} k="enableDevToolsBlocking"/>
            </div>
          </div>
        </div>

        <div style={{ padding:'14px 24px', borderTop:'1px solid #f1f5f9', display:'flex', justifyContent:'flex-end', gap:'10px', flexShrink:0 }}>
          <button onClick={onClose} style={{ padding:'9px 20px', borderRadius:'8px', border:'1px solid #e2e8f0', background:'#fff', color:'#74788d', fontWeight:600, fontSize:'13px', cursor:'pointer' }}>Cancel</button>
          <button onClick={save} style={{ padding:'9px 22px', borderRadius:'8px', border:'none', background:'linear-gradient(135deg,#5156be,#3d41a8)', color:'#fff', fontWeight:700, fontSize:'13px', cursor:'pointer', display:'flex', alignItems:'center', gap:'7px' }}><Save size={14}/> Save Changes</button>
        </div>
      </div>
    </div>
  );
}

export default function LectViewQuizzes() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: quizzes = [], isLoading } = useQuery({ queryKey: ['lectQuizzes'], queryFn: loadQuizzesForUser });
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: getCategories });
  const [editQuizId, setEditQuizId] = useState<number|null>(null);
  const [statusMap, setStatusMap] = useState<Record<number,string>>({});
  const [updatingMap, setUpdatingMap] = useState<Record<number,boolean>>({});

  useEffect(() => {
    if (editQuizId !== null) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [editQuizId]);

  const doDelete = (qId: number) => {
    Swal.fire({ title:'Are you sure?', text:"You won't be able to revert this!", icon:'warning', showCancelButton:true, confirmButtonColor:'#5156be', cancelButtonColor:'#74788d', confirmButtonText:'Yes, delete it!' })
      .then(r => { if (!r.isConfirmed) return; deleteQuiz(qId).then(()=>{ toast.success('Quiz deleted'); qc.invalidateQueries({queryKey:['lectQuizzes']}); }).catch(()=>toast.error('Deletion failed')); });
  };

  const doUpdateStatus = (q: any) => {
    const sel = statusMap[q.qId] ?? q.status;
    setUpdatingMap(m=>({...m,[q.qId]:true}));
    updateQuizStatus(q.qId, sel).then(()=>{ toast.success(`Status updated: ${sel}`); qc.invalidateQueries({queryKey:['lectQuizzes']}); })
      .catch(()=>toast.error('Sync failed')).finally(()=>setUpdatingMap(m=>({...m,[q.qId]:false})));
  };

  return (
    <div className="lvq-wrap">
      <Toaster position="top-right"/>

      <div className="lvq-header">
        <div>
          <h4 className="lvq-title">Assessment Portfolio</h4>
          <div style={{ display:'flex', alignItems:'center', gap:'6px', color:'#74788d', fontSize:'13px', marginTop:'2px' }}>
            <span>Home</span><ChevronRight size={12}/><span>Quizzes</span>
          </div>
        </div>
        <button className="lvq-create-btn" onClick={()=>navigate('/lect/add-quizes')}>
          <Plus size={16}/> Create Quiz
        </button>
      </div>

      <div className="lvq-grid">
        {isLoading ? (
          <div style={{ gridColumn:'1/-1', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'320px', gap:'16px' }}>
            <div style={{ width:68, height:68, borderRadius:'50%', background:'rgba(81,86,190,0.08)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Loader2 style={{ animation:'spin 1s linear infinite', color:'#5156be' }} size={32}/>
            </div>
            <p style={{ color:'#74788d', fontWeight:600, fontSize:'14px', margin:0 }}>Synchronizing Portfolio...</p>
          </div>
        ) : quizzes.length === 0 ? (
          <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'60px 20px' }}>
            <Database size={48} style={{ color:'#adb5bd', marginBottom:'16px' }}/>
            <p style={{ color:'#74788d', fontSize:'14px' }}>No quizzes found in your registry.</p>
          </div>
        ) : quizzes.map((q: any) => {
          const isLive = q.status === 'OPEN';
          const grad = q.quizType==='OBJ' ? 'linear-gradient(135deg,#5156be 0%,#3d41a8 100%)' : q.quizType==='THEORY' ? 'linear-gradient(135deg,#fd625e 0%,#d94f4b 100%)' : 'linear-gradient(135deg,#ffbf53 0%,#e6a832 100%)';
          const accent = q.quizType==='OBJ' ? '#5156be' : q.quizType==='THEORY' ? '#fd625e' : '#ffbf53';
          const typeLabel = q.quizType==='OBJ' ? 'Objective' : q.quizType==='THEORY' ? 'Theory' : 'Combined';

          return (
            <div key={q.qId} className="lvq-card">
              {/* Colored Header */}
              <div style={{ background:grad, padding:'16px 18px', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'10px' }}>
                <div style={{ minWidth:0, flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px' }}>
                    <span style={{ background:'rgba(255,255,255,0.2)', color:'#fff', fontSize:'10px', fontWeight:700, padding:'3px 9px', borderRadius:'20px', textTransform:'uppercase', letterSpacing:'0.8px' }}>{typeLabel}</span>
                    <span style={{ background: isLive?'rgba(42,181,125,0.25)':'rgba(253,98,94,0.25)', color:'#fff', fontSize:'10px', fontWeight:700, padding:'3px 9px', borderRadius:'20px', textTransform:'uppercase' }}>{q.status}</span>
                  </div>
                  <h5 style={{ margin:0, fontWeight:800, fontSize:'15px', color:'#fff', lineHeight:1.3, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }} title={q.title}>{q.title}</h5>
                  {q.category?.title && <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.72)', marginTop:'3px', display:'block' }}>{q.category.title}</span>}
                </div>
                <div style={{ display:'flex', flexDirection:'row', alignItems:'center', gap:'6px', flexShrink:0 }}>
                  <button style={{ width:30, height:30, borderRadius:'8px', border:'none', background:'rgba(255,255,255,0.2)', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.2s' }}
                    title="Configure" onClick={()=>setEditQuizId(q.qId)} onMouseOver={e=>(e.currentTarget.style.background='rgba(255,255,255,0.35)')} onMouseOut={e=>(e.currentTarget.style.background='rgba(255,255,255,0.2)')}><Settings size={14}/></button>
                  <button style={{ width:30, height:30, borderRadius:'8px', border:'none', background:'rgba(253,98,94,0.35)', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.2s' }}
                    title="Delete" onClick={()=>doDelete(q.qId)} onMouseOver={e=>(e.currentTarget.style.background='rgba(253,98,94,0.6)')} onMouseOut={e=>(e.currentTarget.style.background='rgba(253,98,94,0.35)')}><Trash2 size={14}/></button>
                </div>
              </div>

              {/* Body */}
              <div style={{ padding:'16px 18px', flex:1 }}>
                <p style={{ fontSize:'13px', color:'#74788d', lineHeight:1.6, margin:'0 0 14px', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                  {q.description || 'Standard academic assessment for student proficiency evaluation.'}
                </p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', border:'1px solid #eff0f2', borderRadius:'10px', overflow:'hidden' }}>
                  {[['Items', q.numberOfQuestions||'—'], ['Marks', q.maxMarks||'—'], ['Time', q.quizTime ? `${q.quizTime}m` : '—']].map(([k,v])=>(
                    <div key={k} style={{ padding:'10px 8px', textAlign:'center', borderRight:'1px solid #eff0f2' }}>
                      <span style={{ display:'block', fontSize:'10px', color:'#adb5bd', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.6px' }}>{k}</span>
                      <span style={{ display:'block', fontSize:'15px', fontWeight:800, color:'#2a3142', marginTop:'2px' }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div style={{ padding:'12px 18px', borderTop:'1px solid #f1f5f9', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'10px', flexWrap:'wrap' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                  {q.quizDate && <div style={{ display:'flex', alignItems:'center', gap:'5px', fontSize:'12px', color:'#74788d', fontWeight:500 }}><Calendar size={12}/> {q.quizDate}</div>}
                  {q.startTime && <div style={{ display:'flex', alignItems:'center', gap:'5px', fontSize:'12px', color:'#74788d', fontWeight:500 }}><Clock size={12}/> {q.startTime}</div>}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  <Link to={`/lect/view-quetions/${q.qId}/${q.title}`} style={{ fontSize:'12px', fontWeight:700, color:accent, textDecoration:'none', padding:'5px 12px', borderRadius:'20px', border:`1.5px solid ${accent}20`, background:`${accent}10`, transition:'0.2s' }}>Questions</Link>
                  <select style={{ fontSize:'11px', fontWeight:700, color:'#495057', border:'1px solid #e9ecef', borderRadius:'6px', padding:'5px 8px', background:'#f8f9fa', cursor:'pointer', outline:'none' }}
                    value={statusMap[q.qId]??q.status??''} onChange={e=>setStatusMap(m=>({...m,[q.qId]:e.target.value}))}>
                    <option value="CLOSED">CLOSE</option>
                    <option value="OPEN">OPEN</option>
                  </select>
                  <button style={{ padding:'5px 12px', borderRadius:'6px', border:'none', background:'#5156be', color:'#fff', fontSize:'12px', fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:'5px' }}
                    onClick={()=>doUpdateStatus(q)} disabled={updatingMap[q.qId]}>
                    {updatingMap[q.qId]?<Loader2 style={{ animation:'spin 1s linear infinite' }} size={12}/>:<Save size={12}/>}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {editQuizId !== null && (
        <QuizEditModal qId={editQuizId} categories={categories} onClose={()=>setEditQuizId(null)} onSave={()=>qc.invalidateQueries({queryKey:['lectQuizzes']})}/>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
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
        .qem-toggle-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        @media (max-width: 480px) {
          .qem-toggle-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
