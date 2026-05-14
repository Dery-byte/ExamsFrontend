import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="home-page">
      <header style={{background:'#111827',padding:'0 24px',height:60,display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:40}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:36,height:36,background:'#1a56db',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,color:'#fff',fontSize:14}}>OTC</div>
          <span style={{color:'#fff',fontWeight:700,fontSize:16}}>ExamPortal</span>
        </div>
        <div style={{display:'flex',gap:12}}>
          <Link to="/login" style={{padding:'8px 18px',borderRadius:8,border:'1px solid rgba(255,255,255,.2)',color:'rgba(255,255,255,.8)',fontSize:14,fontWeight:600}}>Sign In</Link>
          <Link to="/signup" style={{padding:'8px 18px',borderRadius:8,background:'#1a56db',color:'#fff',fontSize:14,fontWeight:600}}>Get Started</Link>
        </div>
      </header>

      <section className="home-hero">
        <h1>Best Online Exam Platform</h1>
        <p>One step ahead this season — secure, fast, intelligent assessment for universities.</p>
        <div className="home-cta">
          <Link to="/login" className="home-cta-primary">Sign In to Your Account</Link>
          <Link to="/signup" className="home-cta-secondary">Create Account</Link>
        </div>
      </section>

      <section style={{padding:'60px 24px',maxWidth:960,margin:'0 auto'}}>
        <div style={{textAlign:'center',marginBottom:40}}>
          <h2 style={{fontSize:28,fontWeight:800,color:'#fff',marginBottom:8}}>Awesome Features</h2>
          <p style={{color:'rgba(255,255,255,.5)'}}>Built for academic integrity and student success</p>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:24}}>
          {[
            {icon:'🎓',title:'Scholarship Facility',desc:'Manage courses across multiple academic levels from Level 100 to Level 400.'},
            {icon:'📚',title:'Multi-format Quizzes',desc:'MCQ, True/False, Matching, and Theory question types with auto-evaluation.'},
            {icon:'🌍',title:'Instant Results',desc:'Students receive detailed performance feedback with section-wise scoring.'},
          ].map(f=>(
            <div key={f.title} style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',borderRadius:16,padding:'28px 24px'}}>
              <div style={{fontSize:36,marginBottom:12}}>{f.icon}</div>
              <h4 style={{fontSize:16,fontWeight:700,color:'#fff',marginBottom:8}}>{f.title}</h4>
              <p style={{fontSize:14,color:'rgba(255,255,255,.5)',lineHeight:1.6}}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer style={{background:'#111827',padding:'40px 24px',borderTop:'1px solid rgba(255,255,255,.06)',marginTop:40}}>
        <div style={{maxWidth:960,margin:'0 auto',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:24,marginBottom:24}}>
          {[
            {t:'Top Products',links:['Managed Website','Manage Reputation','Power Tools','Marketing Service']},
            {t:'Quick Links',links:['Jobs','Brand Assets','Investor Relations','Terms of Service']},
            {t:'Features',links:['MCQ Quizzes','Theory Questions','Bulk Upload','Analytics']},
            {t:'Resources',links:['Guides','Research','Experts','Agencies']},
          ].map(col=>(
            <div key={col.t}>
              <h4 style={{color:'#fff',fontWeight:700,marginBottom:12,fontSize:14}}>{col.t}</h4>
              <ul style={{listStyle:'none',display:'flex',flexDirection:'column',gap:6}}>
                {col.links.map(l=><li key={l}><a href="#" style={{color:'rgba(255,255,255,.4)',fontSize:13}}>{l}</a></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div style={{borderTop:'1px solid rgba(255,255,255,.06)',paddingTop:20,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
          <p style={{color:'rgba(255,255,255,.3)',fontSize:13}}>Copyright © {new Date().getFullYear()} All rights reserved | ExamPortal</p>
        </div>
      </footer>
    </div>
  );
}
