import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getCategoriesForUser, getCategory, updateCategory, deleteCategory } from '../../api/endpoints';
import Swal from 'sweetalert2';
import toast, { Toaster } from 'react-hot-toast';
import { 
  Plus, 
  X, 
  Save, 
  Loader2,
  Database
} from 'lucide-react';

const LEVELS = ['Level 100','Level 200','Level 300','Level 400'];

export default function ViewCourse() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: categories = [], isLoading } = useQuery({ queryKey: ['lectCats'], queryFn: getCategoriesForUser });
  const [editModal, setEditModal]   = useState(false);
  const [categoryEdit, setCatEdit]  = useState<any>({});
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    if (editModal) { document.body.style.overflow = 'hidden'; }
    else { document.body.style.overflow = 'unset'; }
    return () => { document.body.style.overflow = 'unset'; };
  }, [editModal]);

  const openEdit = async (cid: number) => {
    try { 
      const cat = await getCategory(cid); 
      setCatEdit(cat); 
      setEditModal(true); 
    } catch {
      toast.error('Failed to load course details');
    }
  };

  const doUpdate = async () => {
    if (!categoryEdit.title || !categoryEdit.courseCode) {
      toast.error('Title and Code are required');
      return;
    }
    setSaving(true);
    try { 
      await updateCategory(categoryEdit); 
      toast.success('Course updated successfully!'); 
      qc.invalidateQueries({queryKey:['lectCats']}); 
      setEditModal(false); 
    } catch { 
      toast.error("Failed to synchronize changes"); 
    }
    setSaving(false);
  };

  const doDelete = (cid: number) => {
    Swal.fire({
      title: 'Remove Course?',
      text: "This action is irreversible and will purge all linked assessments.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#1a1b1e',
      cancelButtonColor: '#f3f3f9',
      confirmButtonText: 'Confirm',
      cancelButtonText: 'Cancel'
    }).then(r => {
      if (!r.isConfirmed) return;
      deleteCategory(cid).then(()=>{ 
        toast.success('Course removed'); 
        qc.invalidateQueries({queryKey:['lectCats']}); 
      }).catch(()=>toast.error('Failed to purge course'));
    });
  };

  return (
    <div className="course-stock-container animate-fade-in">
      <Toaster position="top-right"/>
      
      {/* Page Header */}
      <div className="stock-header mb-3">
        <div className="d-flex align-items-center justify-content-between">
          <div>
            <h4 className="stock-title mb-0 fw-bold">Academic Portfolio</h4>
          </div>
          <button className="btn-minimal-add" onClick={()=>navigate('/lect/add-course')}>
            <Plus size={16} />
            <span>New Registry</span>
          </button>
        </div>
      </div>

      {/* Stock Style Table */}
      <div className="stock-table-card">
        <div className="table-responsive">
          <table className="stock-table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Level</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="text-center py-5">
                    <Loader2 className="animate-spin text-muted" size={24} />
                    <p className="text-muted mt-2 font-size-12">Loading Registry...</p>
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-5">
                    <Database size={48} className="text-muted opacity-25 mb-2" />
                    <p className="text-muted font-size-13">No courses registered in your portfolio.</p>
                  </td>
                </tr>
              ) : (
                categories.map((el:any)=>(
                  <tr key={el.cid}>
                    <td className="course-identity-cell">
                      <span className="stock-ticker">{el.courseCode}</span>
                      <span className="stock-name">{el.title}</span>
                    </td>
                    <td className="stock-level">{el.level}</td>
                    <td className="stock-status">ACTIVE</td>
                    <td className="text-end">
                      <div className="stock-actions">
                        <button className="stock-btn" onClick={()=>openEdit(el.cid)}>Edit</button>
                        <span className="mx-1 opacity-25">|</span>
                        <button className="stock-btn text-danger" onClick={()=>doDelete(el.cid)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal - Keeping it simple but functional */}
      {editModal && (
        <div className="stock-modal-overlay">
          <div className="stock-modal shadow-lg animate-scale-up" style={{ maxWidth: 500 }}>
            <div className="stock-modal-header p-3 border-bottom d-flex justify-content-between align-items-center">
              <h6 className="mb-0 fw-bold">Update Registry: {categoryEdit.courseCode}</h6>
              <X className="cursor-pointer opacity-50" onClick={()=>setEditModal(false)} size={18}/>
            </div>
            <div className="p-3">
              <div className="mb-3">
                <label className="stock-label">Title</label>
                <input className="stock-input" value={categoryEdit.title||''} onChange={e=>setCatEdit({...categoryEdit,title:e.target.value})}/>
              </div>
              <div className="row g-3 mb-3">
                <div className="col-6">
                  <label className="stock-label">Code</label>
                  <input className="stock-input" value={categoryEdit.courseCode||''} onChange={e=>setCatEdit({...categoryEdit,courseCode:e.target.value})}/>
                </div>
                <div className="col-6">
                  <label className="stock-label">Level</label>
                  <select className="stock-input" value={categoryEdit.level||''} onChange={e=>setCatEdit({...categoryEdit,level:e.target.value})}>
                    <option value="">Select</option>{LEVELS.map(l=><option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div className="mb-4">
                <label className="stock-label">Description</label>
                <textarea className="stock-input" rows={3} value={categoryEdit.description||''} onChange={e=>setCatEdit({...categoryEdit,description:e.target.value})}/>
              </div>
              <div className="d-flex justify-content-end gap-2 border-top pt-3">
                <button className="stock-btn-plain" onClick={()=>setEditModal(false)}>Cancel</button>
                <button className="stock-btn-solid" onClick={doUpdate} disabled={saving}>
                  {saving ? 'Saving...' : 'Update Registry'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .course-stock-container {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #333;
          padding: 10px;
        }

        .stock-title { font-size: 18px; color: #333; }
        
        .btn-minimal-add {
          background: transparent; border: 1px solid #ddd; padding: 6px 12px; border-radius: 4px;
          display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600;
          transition: all 0.2s; cursor: pointer; color: #555;
        }
        .btn-minimal-add:hover { background: #f8f9fa; border-color: #333; color: #111; }

        .stock-table-card { background: #fff; }
        
        .stock-table { width: 100%; border-collapse: collapse; }
        .stock-table th {
          text-align: left; padding: 12px 8px; font-size: 13px; font-weight: 700;
          color: #333; border-bottom: 2px solid #f1f1f1;
        }
        .stock-table td {
          padding: 10px 8px; font-size: 13px; color: #555; border-bottom: 1px solid #f9f9f9;
          vertical-align: middle; white-space: nowrap;
        }
        .stock-table tbody tr:hover { background: #fafafa; }

        .course-identity-cell { display: flex; align-items: center; gap: 12px; }
        .stock-ticker { font-weight: 700; color: #111; min-width: 80px; }
        .stock-name { color: #555; }

        .stock-level { font-weight: 500; }
        .stock-status { color: #2ab57d; font-weight: 700; font-size: 11px; }

        .stock-actions { font-size: 12px; }
        .stock-btn { 
          background: transparent; border: none; padding: 0; color: #5156be; 
          font-weight: 600; cursor: pointer; transition: opacity 0.2s; 
        }
        .stock-btn:hover { text-decoration: underline; }
        .stock-btn.text-danger { color: #fd625e; }

        /* Modal */
        .stock-modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.2); backdrop-filter: blur(2px);
          display: flex; align-items: center; justify-content: center; z-index: 10000;
        }
        .stock-modal { background: #fff; border-radius: 8px; width: 100%; overflow: hidden; }
        .stock-label { display: block; font-size: 11px; font-weight: 700; color: #777; text-transform: uppercase; margin-bottom: 4px; }
        .stock-input {
          width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px;
          font-size: 13px; outline: none; transition: border-color 0.2s;
        }
        .stock-input:focus { border-color: #333; }
        
        .stock-btn-plain { background: transparent; border: 1px solid #ddd; padding: 6px 15px; border-radius: 4px; font-size: 12px; font-weight: 600; cursor: pointer; }
        .stock-btn-solid { background: #1a1b1e; color: #fff; border: none; padding: 6px 15px; border-radius: 4px; font-size: 12px; font-weight: 600; cursor: pointer; }
        .stock-btn-solid:disabled { opacity: 0.5; }

        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-scale-up { animation: scaleUp 0.2s ease-out; }
        @keyframes scaleUp { from { transform: scale(0.98); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        
        .cursor-pointer { cursor: pointer; }

        @media (max-width: 768px) {
          .stock-header > div { flex-direction: column; align-items: flex-start !important; gap: 12px; }
          .btn-minimal-add { width: 100%; justify-content: center; }
          .stock-table-card { overflow-x: auto; }
          .stock-modal { width: 95vw !important; max-width: none !important; }
        }
      `}</style>
    </div>
  );
}
