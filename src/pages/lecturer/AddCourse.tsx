import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addCategoryForUser } from '../../api/endpoints';
import toast, { Toaster } from 'react-hot-toast';
import { 
  BookOpen, 
  Save, 
  X, 
  Info, 
  Code, 
  Layers, 
  ChevronRight, 
  Loader2,
  Tag,
  Hash,
  AlignCenter
} from 'lucide-react';

const LEVELS = ['Level 100','Level 200','Level 300','Level 400'];

export default function AddCourse() {
  const navigate = useNavigate();
  const [category, setCategory] = useState({ title:'', courseCode:'', level:'', description:'' });
  const [loading, setLoading] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) =>
    setCategory(c=>({...c,[k]:e.target.value}));

  const formSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addCategoryForUser(category);
      toast.success('Course added successfully!');
      setTimeout(() => navigate('/lect/courses'), 1000);
    } catch { toast.error('Failed to add course registry'); }
    finally { setLoading(false); }
  };

  return (
    <div className="minia-form-page animate-fade-in">
      <Toaster position="top-right"/>
      
      {/* Header Section */}
      <div className="minia-header mb-5">
        <div className="d-flex align-items-center justify-content-between">
          <div>
            <h4 className="minia-title mb-1">Course Registry</h4>
            <div className="d-flex align-items-center gap-2 text-muted font-size-13">
               <span>Management</span> <ChevronRight size={12}/> <span>Add Course</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="row justify-content-center">
        <div className="col-xl-7 col-lg-9">
          <div className="minia-card-standout shadow-lg">
            {/* 3px Accent Bar */}
            <div className="card-accent"></div>
            
            <div className="card-header-minia p-4 border-bottom d-flex align-items-center gap-3 bg-white">
              <div className="minia-icon-box bg-soft-primary">
                <Layers size={22} className="text-primary" />
              </div>
              <div>
                <h5 className="font-size-16 mb-0 fw-bold text-dark">Initialize Course Protocol</h5>
                <p className="text-muted font-size-12 mb-0">Configure the academic details for your new subject.</p>
              </div>
            </div>

            <div className="card-body p-5">
              <form onSubmit={formSubmit}>
                <div className="row g-4 mb-4">
                  <div className="col-md-8">
                    <label className="minia-label standout-label">Full Academic Title</label>
                    <div className="input-group-minia">
                       <span className="input-group-icon"><Tag size={18}/></span>
                       <input 
                         className="minia-input-field standout-input" 
                         required 
                         value={category.title} 
                         onChange={set('title')} 
                         placeholder="e.g. Advanced Structural Engineering"
                       />
                    </div>
                  </div>
                  <div className="col-md-4">
                    <label className="minia-label standout-label">Catalog Code</label>
                    <div className="input-group-minia">
                       <span className="input-group-icon"><Hash size={18}/></span>
                       <input 
                         className="minia-input-field standout-input" 
                         required 
                         value={category.courseCode} 
                         onChange={e=>setCategory(c=>({...c,courseCode:e.target.value.toUpperCase()}))} 
                         placeholder="e.g. ASE-402"
                       />
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="minia-label standout-label">Academic Maturity Level</label>
                  <div className="input-group-minia">
                     <span className="input-group-icon"><AlignCenter size={18}/></span>
                     <select 
                       className="minia-input-field standout-input" 
                       required 
                       value={category.level} 
                       onChange={set('level')}
                     >
                       <option value="">Select Target Level</option>
                       {LEVELS.map(l=><option key={l} value={l}>{l}</option>)}
                     </select>
                  </div>
                </div>

                <div className="mb-5">
                  <label className="minia-label standout-label">Curriculum Brief & Objectives</label>
                  <textarea 
                    className="minia-input-field standout-input" 
                    required 
                    rows={5} 
                    style={{ resize: 'none', paddingLeft: '16px' }}
                    value={category.description} 
                    onChange={set('description')} 
                    placeholder="Describe the course scope, intended learning outcomes, and core concepts to be evaluated..."
                  />
                </div>

                <div className="d-flex gap-3 justify-content-end border-top pt-4 mt-2">
                  <button type="button" className="btn-minia-ghost px-4" onClick={()=>navigate('/lect/courses')}>Discard</button>
                  <button type="submit" className="btn-minia-solid px-4 d-flex align-items-center gap-2" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                    <span>{loading ? 'Adding...' : 'Add Course'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .minia-form-page {
          padding: 3rem;
          font-family: 'Public Sans', 'Inter', sans-serif;
          background-color: #f1f5f9;
          min-height: 100vh;
        }

        .minia-title { font-size: 1.3rem; font-weight: 800; color: #1e293b; letter-spacing: -0.01em; }
        
        /* Standout Card */
        .minia-card-standout {
          background: #fff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.12);
          position: relative;
          overflow: hidden;
          transition: transform 0.3s ease;
        }
        .card-accent { position: absolute; top: 0; left: 0; right: 0; height: 4px; background: #5156be; }
        
        .minia-icon-box { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .bg-soft-primary { background: rgba(81, 86, 190, 0.1); }
        
        /* Form Element Standout Styling */
        .minia-label { display: block; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.08em; }
        .standout-label { color: #334155; font-weight: 900; }
        
        .input-group-minia {
          position: relative;
          display: flex;
          align-items: center;
        }
        .input-group-icon {
          position: absolute;
          left: 14px;
          color: #64748b;
          transition: color 0.2s;
          pointer-events: none;
          z-index: 2;
        }
        .minia-input-field {
          width: 100%;
          padding: 14px 18px 14px 46px;
          font-size: 15px;
          font-weight: 600;
          color: #1e293b;
          background-color: #f8fafc;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .standout-input:hover {
          background-color: #f1f5f9;
          border-color: #cbd5e1;
        }
        .minia-input-field:focus {
          background-color: #fff;
          border-color: #5156be;
          box-shadow: 0 0 0 5px rgba(81, 86, 190, 0.15);
          outline: none;
        }
        .input-group-minia:focus-within .input-group-icon { color: #5156be; }
        
        /* Buttons */
        .btn-minia-solid {
          background-color: #5156be; color: #fff; border: none; padding: 14px 30px; border-radius: 10px;
          font-weight: 800; font-size: 15px; transition: all 0.3s; cursor: pointer;
          box-shadow: 0 4px 12px rgba(81, 86, 190, 0.2);
        }
        .btn-minia-solid:hover:not(:disabled) { 
          background-color: #4549a2; 
          transform: translateY(-2px); 
          box-shadow: 0 8px 20px rgba(81, 86, 190, 0.3); 
        }
        .btn-minia-solid:disabled { opacity: 0.6; cursor: not-allowed; }

        .btn-minia-ghost {
          background: #fff; border: 2px solid #e2e8f0; color: #64748b; padding: 14px 30px; border-radius: 10px;
          font-weight: 800; font-size: 15px; transition: 0.2s; cursor: pointer;
        }
        .btn-minia-ghost:hover { background: #f8fafc; color: #1e293b; border-color: #cbd5e1; }
        
        .animate-fade-in { animation: fadeIn 0.6s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        @media (max-width: 768px) {
          .minia-form-page { padding: 1.5rem 1rem; }
          .minia-header .d-flex { flex-direction: column; align-items: flex-start !important; gap: 12px; }
          .card-body { padding: 1.5rem !important; }
          .d-flex.justify-content-end { flex-direction: column; }
          .btn-minia-solid, .btn-minia-ghost { width: 100%; justify-content: center; }
        }
      `}</style>
    </div>
  );
}
