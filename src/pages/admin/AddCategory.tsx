import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addCategory } from '../../api/endpoints';
import toast from 'react-hot-toast';
import PageHeader from '../../components/PageHeader';
import { BookPlus, BookOpen, Layers, FileText, Send, X, GraduationCap, Info, Loader2, ArrowLeft, Target, Award, ShieldCheck, CheckCircle2, LayoutGrid, Cpu, BadgeCheck, GraduationCap as CourseIcon, BookCheck } from 'lucide-react';

const LEVELS = ['Level 100','Level 200','Level 300','Level 400'];

export default function AddCategory() {
  const navigate = useNavigate();
  const [category, setCategory] = useState({ title:'', courseCode:'', level:'', description:'' });
  const [loading, setLoading] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) =>
    setCategory(c=>({...c,[k]:e.target.value}));

  const formSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category.level) { toast.error('Academic level required'); return; }
    
    const loadingToast = toast.loading('Initializing course registry...');
    setLoading(true);
    try {
      await addCategory(category);
      toast.success('Course registered successfully', { id: loadingToast });
      setTimeout(() => navigate('/admin/courses'), 1200);
    } catch (err: any) {
      toast.error('Registration failed', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-add-course-page animate-fade-in" style={{ padding: '0 0 50px', fontFamily: '"Outfit", sans-serif' }}>
      <PageHeader title="New Academic Course" breadcrumbs={['Lexa', 'Admin', 'Register Course']} />
      
      <div className="course-form-wrapper">
        <div className="lexa-standalone-card">
          {/* Header Section - Vibrant & Professional */}
          <div className="card-header-vibrant">
            <div className="header-flex">
               <div className="icon-badge-premium">
                  <CourseIcon size={24} />
               </div>
               <div className="header-info">
                  <h5>Add New Course Entry</h5>
                  <span>Establish a new course within the academic registry</span>
               </div>
            </div>
            <button onClick={()=>navigate('/admin/courses')} className="btn-return-compact">
               <ArrowLeft size={16} /> <span>Course Catalog</span>
            </button>
          </div>

          <div className="card-body-compact">
            <form onSubmit={formSubmit} className="course-compact-grid">
              {/* Row 1: Title & Code */}
              <div className="compact-row">
                <div className="f-node-flex">
                  <label><BookOpen size={14} /> Official Course Title</label>
                  <input 
                    className="premium-compact-input" 
                    required 
                    value={category.title} 
                    onChange={set('title')} 
                    placeholder="e.g. Software Engineering Fundamentals"
                  />
                </div>
                <div className="f-node-fixed">
                  <label><BadgeCheck size={14} /> Course Code</label>
                  <input 
                    className="premium-compact-input code-accent" 
                    required 
                    value={category.courseCode} 
                    onChange={e=>setCategory(c=>({...c,courseCode:e.target.value.toUpperCase()}))} 
                    placeholder="CODE"
                  />
                </div>
              </div>

              {/* Row 2: Level Selection */}
              <div className="f-node-full">
                <label><Layers size={14} /> Academic Level Selection</label>
                <div className="pill-selector-box">
                  {LEVELS.map(l => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setCategory(c => ({ ...c, level: l }))}
                      className={`pill-btn-compact ${category.level === l ? 'active' : ''}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 3: Description */}
              <div className="f-node-full">
                <label><FileText size={14} /> Course Synopsis & Objectives</label>
                <textarea 
                  className="premium-compact-area" 
                  required 
                  rows={4} 
                  value={category.description} 
                  onChange={set('description')} 
                  placeholder="Summarize course content, prerequisites, and primary learning outcomes..."
                />
              </div>

              {/* Security Strip */}
              <div className="registry-info-strip">
                 <ShieldCheck size={18} className="i-ico" />
                 <span>Registry Protocol: This course will be immediately available for faculty assignment and assessment scheduling upon establishment.</span>
              </div>

              {/* Footer Actions */}
              <div className="course-footer-actions">
                <button type="button" className="btn-cancel-ghost" onClick={()=>navigate('/admin/courses')}>Discard</button>
                <button type="submit" className="btn-register-premium" disabled={loading}>
                  {loading ? <Loader2 className="spin-ico" size={18} /> : <><BookPlus size={18} /> Register Course</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <style>{`
        .course-form-wrapper { max-width: 780px; margin: 0 auto; }
        .lexa-standalone-card { 
          background: #fff; border-radius: 24px; border: 1px solid #eef2f7; 
          box-shadow: 0 20px 60px rgba(42, 49, 66, 0.08); overflow: hidden; 
          position: relative;
        }
        .lexa-standalone-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 5px;
          background: linear-gradient(90deg, #626ed4 0%, #02a4af 100%);
        }

        .card-header-vibrant { padding: 30px 40px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; background: #fafbfc; }
        .header-flex { display: flex; align-items: center; gap: 20px; }
        .icon-badge-premium { width: 52px; height: 52px; border-radius: 14px; background: #fff; color: #626ed4; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        .header-info h5 { margin: 0; font-size: 18px; font-weight: 800; color: #2a3142; }
        .header-info span { font-size: 11px; color: #adb5bd; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
        
        .btn-return-compact { height: 36px; padding: 0 15px; border-radius: 10px; border: 1.5px solid #eef2f7; background: #fff; color: #64748b; font-size: 11px; font-weight: 800; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: 0.2s; }
        .btn-return-compact:hover { background: #f8fafc; border-color: #d1d5db; color: #626ed4; }

        .card-body-compact { padding: 35px 45px; }
        .course-compact-grid { display: flex; flex-direction: column; gap: 24px; }
        .compact-row { display: flex; gap: 20px; }
        
        .f-node-flex { flex: 1; display: flex; flex-direction: column; gap: 8px; }
        .f-node-fixed { width: 130px; display: flex; flex-direction: column; gap: 8px; }
        .f-node-full { display: flex; flex-direction: column; gap: 8px; }
        
        label { font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; display: flex; align-items: center; gap: 8px; padding-left: 2px; }
        
        .premium-compact-input, .premium-compact-area { 
          border-radius: 12px; border: 2px solid #f1f5f9; background: #f8fafc; 
          padding: 12px 18px; font-size: 14px; font-weight: 600; color: #1e293b; 
          outline: none; transition: 0.2s; 
        }
        .premium-compact-input:focus, .premium-compact-area:focus { border-color: #626ed4; background: #fff; }
        .code-accent { text-align: center; font-weight: 900; color: #626ed4; font-size: 16px; letter-spacing: 0.05em; }

        .pill-selector-box { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .pill-btn-compact { height: 42px; border-radius: 10px; border: 2px solid #f1f5f9; background: #fff; font-size: 11px; font-weight: 800; color: #64748b; cursor: pointer; transition: 0.2s; }
        .pill-btn-compact:hover { background: #f8fafc; }
        .pill-btn-compact.active { background: #626ed4; border-color: #626ed4; color: #fff; box-shadow: 0 4px 15px rgba(98, 110, 212, 0.2); }

        .registry-info-strip { padding: 14px 20px; background: #fcfdfe; border-radius: 12px; display: flex; align-items: center; gap: 15px; border: 1.5px dashed #e2e8f0; }
        .registry-info-strip .i-ico { color: #626ed4; flex-shrink: 0; }
        .registry-info-strip span { font-size: 11px; color: #64748b; font-weight: 700; line-height: 1.5; }

        .course-footer-actions { margin-top: 10px; padding-top: 25px; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end; gap: 15px; }
        .btn-cancel-ghost { background: none; border: none; font-size: 13px; font-weight: 700; color: #94a3b8; cursor: pointer; padding: 0 20px; }
        .btn-register-premium { height: 48px; padding: 0 30px; background: #2a3142; color: #fff; border: none; border-radius: 12px; font-size: 14px; font-weight: 800; display: flex; align-items: center; gap: 10px; cursor: pointer; transition: 0.2s; box-shadow: 0 8px 25px rgba(42, 49, 66, 0.2); }
        .btn-register-premium:hover { background: #000; transform: translateY(-2px); box-shadow: 0 12px 30px rgba(0,0,0,0.2); }

        .spin-ico { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
