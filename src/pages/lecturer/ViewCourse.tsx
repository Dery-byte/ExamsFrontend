import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getCategoriesForUser, getCategory, updateCategory, deleteCategory } from '../../api/endpoints';
import Swal from 'sweetalert2';
import toast, { Toaster } from 'react-hot-toast';
import { Plus, X, Save, Loader2, Database, BookOpen, Layers, Edit, Trash2, ChevronRight, GraduationCap } from 'lucide-react';

const LEVELS = ['Level 100','Level 200','Level 300','Level 400'];

const CARD_GRADS = [
  'linear-gradient(135deg,#5156be 0%,#3d41a8 100%)',
  'linear-gradient(135deg,#2ab57d 0%,#1a9666 100%)',
  'linear-gradient(135deg,#fd625e 0%,#d94f4b 100%)',
  'linear-gradient(135deg,#ffbf53 0%,#e6a832 100%)',
  'linear-gradient(135deg,#4ba3ff 0%,#2b7de9 100%)',
  'linear-gradient(135deg,#a55eea 0%,#8843d4 100%)',
];

const inp: React.CSSProperties = { width:'100%', padding:'9px 12px', borderRadius:'8px', border:'1px solid #e2e8f0', fontSize:'13px', color:'#2a3142', outline:'none', boxSizing:'border-box', fontFamily:'inherit', background:'#fafbff' };
const lbl: React.CSSProperties = { display:'block', fontSize:'11px', fontWeight:700, color:'#74788d', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'6px' };

export default function ViewCourse() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: categories = [], isLoading } = useQuery({ queryKey: ['lectCats'], queryFn: getCategoriesForUser });
  const [editModal, setEditModal] = useState(false);
  const [categoryEdit, setCatEdit] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.body.style.overflow = editModal ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [editModal]);

  const openEdit = async (cid: number) => {
    try { const cat = await getCategory(cid); setCatEdit(cat); setEditModal(true); }
    catch { toast.error('Failed to load course details'); }
  };

  const doUpdate = async () => {
    if (!categoryEdit.title || !categoryEdit.courseCode) { toast.error('Title and Code are required'); return; }
    setSaving(true);
    try {
      const payload = { ...categoryEdit, id: categoryEdit.cid };
      await updateCategory(payload); 
      toast.success('Course updated!'); 
      qc.invalidateQueries({queryKey:['lectCats']}); 
      setEditModal(false); 
    }
    catch { toast.error('Failed to synchronize changes'); }
    setSaving(false);
  };

  const doDelete = (cid: number) => {
    Swal.fire({ title:'Remove Course?', text:'This will purge all linked assessments.', icon:'warning', showCancelButton:true, confirmButtonColor:'#fd625e', cancelButtonColor:'#f8f9fa', confirmButtonText:'Yes, Remove', cancelButtonText:'Cancel' })
      .then(r => { if (!r.isConfirmed) return; deleteCategory(cid).then(()=>{ toast.success('Course removed'); qc.invalidateQueries({queryKey:['lectCats']}); }).catch(()=>toast.error('Failed to purge')); });
  };

  const cats = categories as any[];

  return (
    <div style={{ padding:'24px', fontFamily:"'Inter',sans-serif", background:'#f5f6f8', minHeight:'100vh', overflowX:'hidden' }}>
      <Toaster position="top-right"/>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'12px', marginBottom:'28px' }}>
        <div>
          <h4 style={{ margin:0, fontSize:'20px', fontWeight:800, color:'#2a3142' }}>My Courses</h4>
          <div style={{ display:'flex', alignItems:'center', gap:'6px', color:'#74788d', fontSize:'13px', marginTop:'3px' }}>
            <span>Lecturer</span><ChevronRight size={12}/><span style={{ color:'#5156be', fontWeight:600 }}>Courses</span>
          </div>
        </div>
        <button onClick={()=>navigate('/lect/add-course')} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'10px 20px', background:'linear-gradient(135deg,#5156be,#3d41a8)', color:'#fff', border:'none', borderRadius:'10px', fontSize:'13px', fontWeight:700, cursor:'pointer', boxShadow:'0 4px 12px rgba(81,86,190,0.3)', transition:'0.2s' }}>
          <Plus size={16}/> New Course
        </button>
      </div>

      {/* Cards Grid */}
      {isLoading ? (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'320px', gap:'16px' }}>
          <div style={{ width:68, height:68, borderRadius:'50%', background:'rgba(81,86,190,0.08)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Loader2 style={{ animation:'spin 1s linear infinite', color:'#5156be' }} size={32}/>
          </div>
          <p style={{ color:'#74788d', fontWeight:600, fontSize:'14px', margin:0 }}>Loading courses...</p>
        </div>
      ) : cats.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 20px', background:'#fff', borderRadius:'16px', border:'1px solid #eff0f2' }}>
          <GraduationCap size={52} style={{ color:'#adb5bd', marginBottom:'16px' }}/>
          <h5 style={{ color:'#2a3142', fontWeight:700, marginBottom:'8px' }}>No Courses Yet</h5>
          <p style={{ color:'#74788d', fontSize:'14px', marginBottom:'20px' }}>You haven't been assigned to any courses. Start by adding a new one.</p>
          <button onClick={()=>navigate('/lect/add-course')} style={{ padding:'10px 24px', background:'#5156be', color:'#fff', border:'none', borderRadius:'10px', fontWeight:700, fontSize:'13px', cursor:'pointer' }}>Add First Course</button>
        </div>
      ) : (
        <div className="vc-grid">
          {cats.map((c: any, idx: number) => {
            const grad = CARD_GRADS[idx % CARD_GRADS.length];
            return (
              <div key={c.cid} className="vc-card">
                {/* Gradient Header */}
                <div style={{ background:grad, padding:'18px 18px 16px', position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', top:'-20px', right:'-20px', width:'90px', height:'90px', borderRadius:'50%', background:'rgba(255,255,255,0.08)' }}/>
                  <div style={{ position:'absolute', bottom:'-30px', left:'60px', width:'70px', height:'70px', borderRadius:'50%', background:'rgba(255,255,255,0.06)' }}/>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'10px', position:'relative', zIndex:1 }}>
                    <div style={{ minWidth:0, flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px' }}>
                        <span style={{ background:'rgba(255,255,255,0.2)', color:'#fff', fontSize:'10px', fontWeight:700, padding:'3px 9px', borderRadius:'20px', letterSpacing:'0.6px' }}>{c.courseCode || 'N/A'}</span>
                        {c.level && <span style={{ background:'rgba(255,255,255,0.15)', color:'#fff', fontSize:'10px', fontWeight:600, padding:'3px 9px', borderRadius:'20px' }}>{c.level}</span>}
                      </div>
                      <h5 style={{ margin:0, fontWeight:800, fontSize:'15px', color:'#fff', lineHeight:1.35, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{c.title}</h5>
                    </div>
                    {/* Inline action buttons */}
                    <div style={{ display:'flex', flexDirection:'row', alignItems:'center', gap:'6px', flexShrink:0 }}>
                      <button onClick={()=>openEdit(c.cid)} title="Edit" style={{ width:30, height:30, borderRadius:'8px', border:'none', background:'rgba(255,255,255,0.2)', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.2s' }} onMouseOver={e=>(e.currentTarget.style.background='rgba(255,255,255,0.35)')} onMouseOut={e=>(e.currentTarget.style.background='rgba(255,255,255,0.2)')}><Edit size={14}/></button>
                      <button onClick={()=>doDelete(c.cid)} title="Delete" style={{ width:30, height:30, borderRadius:'8px', border:'none', background:'rgba(253,98,94,0.3)', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.2s' }} onMouseOver={e=>(e.currentTarget.style.background='rgba(253,98,94,0.6)')} onMouseOut={e=>(e.currentTarget.style.background='rgba(253,98,94,0.3)')}><Trash2 size={14}/></button>
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:'5px', marginTop:'10px', position:'relative', zIndex:1 }}>
                    <span style={{ width:7, height:7, borderRadius:'50%', background:'#a8f0d3', boxShadow:'0 0 0 3px rgba(168,240,211,0.25)', display:'inline-block' }}/>
                    <span style={{ fontSize:'10px', color:'rgba(255,255,255,0.8)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.6px' }}>Session Active</span>
                  </div>
                </div>

                {/* Body */}
                <div style={{ padding:'16px 18px', flex:1 }}>
                  <p style={{ fontSize:'13px', color:'#74788d', lineHeight:1.6, margin:'0 0 16px', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                    {c.description || 'Comprehensive course module covering core fundamental concepts and advanced learning methodologies.'}
                  </p>
                  <div style={{ display:'flex', alignItems:'center', gap:'16px', fontSize:'12px', color:'#74788d', fontWeight:500 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'5px' }}><Layers size={13}/><span>{c.level || '—'}</span></div>
                    <div style={{ display:'flex', alignItems:'center', gap:'5px' }}><BookOpen size={13}/><span>{c.courseCode || '—'}</span></div>
                  </div>
                </div>

                {/* Footer */}
                <div style={{ padding:'12px 18px', borderTop:'1px solid #f1f5f9', display:'flex', justifyContent:'flex-end' }}>
                  {/* <button onClick={()=>navigate(`/lecturer/view-course/${c.cid}`)} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'7px 16px', borderRadius:'20px', border:'1.5px solid rgba(81,86,190,0.2)', background:'rgba(81,86,190,0.06)', color:'#5156be', fontSize:'12px', fontWeight:700, cursor:'pointer', transition:'0.2s' }}>
                    Manage <ChevronRight size={13}/>
                  </button> */}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Update Registry Modal */}
      {editModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.55)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:99999, padding:'16px' }}>
          <div style={{ background:'#fff', borderRadius:'16px', width:'100%', maxWidth:'480px', maxHeight:'92vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>

            {/* Modal Header */}
            <div style={{ background:'linear-gradient(135deg,#2ab57d 0%,#1a9666 100%)', padding:'18px 24px', borderRadius:'16px 16px 0 0', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                <div style={{ width:36, height:36, borderRadius:'10px', background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff' }}><BookOpen size={18}/></div>
                <div>
                  <h5 style={{ margin:0, fontWeight:800, fontSize:'15px', color:'#fff' }}>Update Course</h5>
                  <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.75)' }}>{categoryEdit.courseCode || 'Course Details'}</span>
                </div>
              </div>
              <button onClick={()=>setEditModal(false)} style={{ width:32, height:32, borderRadius:'8px', border:'none', background:'rgba(255,255,255,0.15)', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={16}/></button>
            </div>

            {/* Modal Body */}
            <div style={{ padding:'20px 24px', overflowY:'auto', flex:1, display:'flex', flexDirection:'column', gap:'14px' }}>
              <div><label style={lbl}>Course Title</label><input style={inp} value={categoryEdit.title||''} onChange={e=>setCatEdit({...categoryEdit,title:e.target.value})} placeholder="e.g. Introduction to Computer Science"/></div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                <div><label style={lbl}>Course Code</label><input style={inp} value={categoryEdit.courseCode||''} onChange={e=>setCatEdit({...categoryEdit,courseCode:e.target.value})} placeholder="e.g. CSC 101"/></div>
                <div><label style={lbl}>Level</label>
                  <select style={inp} value={categoryEdit.level||''} onChange={e=>setCatEdit({...categoryEdit,level:e.target.value})}>
                    <option value="">Select Level</option>
                    {LEVELS.map(l=><option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div><label style={lbl}>Description</label><textarea style={{...inp,resize:'vertical',minHeight:'80px',lineHeight:'1.6'}} value={categoryEdit.description||''} onChange={e=>setCatEdit({...categoryEdit,description:e.target.value})} placeholder="Brief course description..."/></div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding:'14px 24px', borderTop:'1px solid #f1f5f9', display:'flex', justifyContent:'flex-end', gap:'10px', flexShrink:0 }}>
              <button onClick={()=>setEditModal(false)} style={{ padding:'9px 20px', borderRadius:'8px', border:'1px solid #e2e8f0', background:'#fff', color:'#74788d', fontWeight:600, fontSize:'13px', cursor:'pointer' }}>Cancel</button>
              <button onClick={doUpdate} disabled={saving} style={{ padding:'9px 22px', borderRadius:'8px', border:'none', background:'linear-gradient(135deg,#2ab57d,#1a9666)', color:'#fff', fontWeight:700, fontSize:'13px', cursor:'pointer', display:'flex', alignItems:'center', gap:'7px', opacity:saving?0.7:1 }}>
                {saving?<Loader2 style={{ animation:'spin 1s linear infinite' }} size={14}/>:<Save size={14}/>}
                {saving?'Saving...':'Update Registry'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .vc-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; }
        .vc-card { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(18,38,63,0.07); border: 1px solid #eff0f2; display: flex; flex-direction: column; transition: transform 0.2s, box-shadow 0.2s; }
        .vc-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(18,38,63,0.12); }
        @media (max-width: 1100px) { .vc-grid { grid-template-columns: repeat(2,1fr); } }
        @media (max-width: 640px) { .vc-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
