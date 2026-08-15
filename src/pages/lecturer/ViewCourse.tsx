import { useQuery } from '@tanstack/react-query';
import { getCategoriesForUser } from '../../api/endpoints';
import { Toaster } from 'react-hot-toast';
import { Loader2, BookOpen, Layers, ChevronRight, GraduationCap } from 'lucide-react';

const CARD_GRADS = [
  'linear-gradient(135deg,#5156be 0%,#3d41a8 100%)',
  'linear-gradient(135deg,#2ab57d 0%,#1a9666 100%)',
  'linear-gradient(135deg,#fd625e 0%,#d94f4b 100%)',
  'linear-gradient(135deg,#ffbf53 0%,#e6a832 100%)',
  'linear-gradient(135deg,#4ba3ff 0%,#2b7de9 100%)',
  'linear-gradient(135deg,#a55eea 0%,#8843d4 100%)',
];

export default function ViewCourse() {
  const { data: categories = [], isLoading } = useQuery({ queryKey: ['lectCats'], queryFn: getCategoriesForUser });

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
          <p style={{ color:'#74788d', fontSize:'14px' }}>You haven't been assigned to any courses yet. Please contact your administrator.</p>
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
                  <div style={{ position:'relative', zIndex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px' }}>
                      <span style={{ background:'rgba(255,255,255,0.2)', color:'#fff', fontSize:'10px', fontWeight:700, padding:'3px 9px', borderRadius:'20px', letterSpacing:'0.6px' }}>{c.courseCode || 'N/A'}</span>
                      {c.level && <span style={{ background:'rgba(255,255,255,0.15)', color:'#fff', fontSize:'10px', fontWeight:600, padding:'3px 9px', borderRadius:'20px' }}>{c.level}</span>}
                    </div>
                    <h5 style={{ margin:0, fontWeight:800, fontSize:'15px', color:'#fff', lineHeight:1.35, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{c.title}</h5>
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

                {/* Footer — read-only, no actions */}
                <div style={{ padding:'12px 18px', borderTop:'1px solid #f1f5f9' }}/>
              </div>
            );
          })}
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
