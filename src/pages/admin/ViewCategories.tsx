import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  getCategories, getCategory, getLecturersByDepartment, assignCourseToLecturer,
  adminUpdateCategory, deleteCategory
} from '../../api/endpoints';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';
import PageHeader from '../../components/PageHeader';
import { Plus, Edit, Trash2, UserPlus, BookOpen, User, Info, X, Loader2, Search, Filter, Book, ChevronRight, GraduationCap, Layers, ShieldCheck, Target, Award, ArrowRight, CheckCircle2, MoreVertical, LayoutGrid, List, Database, Activity, BadgeCheck } from 'lucide-react';

export default function ViewCategories() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: categories = [], isLoading } = useQuery({ queryKey: ['categories'], queryFn: getCategories });
  
  const [editModal, setEditModal] = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [categoryEdit, setCategoryEdit] = useState<any>({});
  const [lecturers, setLecturers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [programs, setPrograms] = useState<any[]>([]);

  useEffect(() => {
    import('../../api/endpoints').then(({ getPrograms }) => {
      getPrograms().then(data => { if (Array.isArray(data)) setPrograms(data); }).catch(() => {});
    });
  }, []);

  useEffect(() => {
    if (editModal || assignModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [editModal, assignModal]);

  const filteredCategories = categories.filter((c: any) => 
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.courseCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openEdit = async (cid: number) => {
    try { 
      const cat = await getCategory(cid); 
      setCategoryEdit(cat); 
      setEditModal(true); 
    } catch {}
  };

  const openAssign = async (cid: number) => {
    try {
      const [cat, lects] = await Promise.all([getCategory(cid), getLecturersByDepartment()]);
      setCategoryEdit(cat); 
      setLecturers(lects); 
      setAssignModal(true);
    } catch {}
  };

  const updateCategory = async () => {
    setSaving(true);
    const loadingToast = toast.loading('Synchronizing registry...');
    try {
      // Explicitly pick fields so programIds (List<Long>) is sent cleanly
      const payload = {
        title: categoryEdit.title,
        courseCode: categoryEdit.courseCode,
        description: categoryEdit.description,
        level: categoryEdit.level,
        semester: categoryEdit.semester,
        programIds: categoryEdit.programIds || [],
      };
      await adminUpdateCategory(categoryEdit.cid, payload);
      toast.success('Registry updated successfully', { id: loadingToast });
      qc.invalidateQueries({ queryKey: ['categories'] });
      setEditModal(false);
    } catch { 
      toast.error("Synchronization failed", { id: loadingToast }); 
    }
    setSaving(false);
  };

  const doAssign = async () => {
    if (!categoryEdit.userId) { toast.error('Faculty lead required'); return; }
    const loadingToast = toast.loading('Establishing faculty lead...');
    try {
      await assignCourseToLecturer(categoryEdit.cid, categoryEdit.userId);
      toast.success('Faculty lead established', { id: loadingToast });
      qc.invalidateQueries({ queryKey: ['categories'] });
      setAssignModal(false);
    } catch { 
      toast.error('Assignment protocol failed', { id: loadingToast }); 
    }
  };

  const deleteCateg = (cid: number) => {
    Swal.fire({ 
      title: 'Purge Category?',
      text: "Permanent removal from registry.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f43f5e',
      confirmButtonText: 'Yes, Purge'
    }).then(res => {
      if (!res.isConfirmed) return;
      deleteCategory(cid).then(() => {
        toast.success('Registry item purged');
        qc.invalidateQueries({ queryKey: ['categories'] });
      }).catch(() => toast.error('Purge failed'));
    });
  };

  const LEVELS = ['Level 100','Level 200','Level 300','Level 400'];

  return (
    <div className="admin-categories-page animate-fade-in" style={{ padding: '0 0 40px', fontFamily: '"Outfit", sans-serif' }}>
      <PageHeader title="Curriculum" breadcrumbs={['Lexa', 'Admin', 'Registry']} />
      
      <div className="registry-compact-header">
         <div className="compact-stats">
            <div className="stat-node">
               <span className="l">Total</span>
               <span className="v">{categories.length}</span>
            </div>
            <div className="stat-sep"></div>
            <div className="stat-node">
               <span className="l">Status</span>
               <span className="v ok">Live</span>
            </div>
         </div>
         <div className="compact-actions">
            <div className="mini-search">
               <Search size={14} />
               <input type="text" placeholder="Filter registry..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
            </div>
            <button className="mini-add-btn" onClick={()=>navigate('/admin/add-course')}>
               <Plus size={16} /> <span>New</span>
            </button>
         </div>
      </div>

      <div className="registry-list-compact">
        {isLoading ? (
          <div className="reg-loader"><Loader2 className="spin-ico" size={32} /></div>
        ) : (
          filteredCategories.map((el: any) => (
            <div key={el.cid} className="reg-row-premium">
              <div className="reg-col code"><span className="c-badge">{el.courseCode}</span></div>
              <div className="reg-col title">
                 <h6 className="t">{el.title}</h6>
                 <span className="m" style={{ color: '#64748b' }}>
                    <span style={{ fontWeight: 700, color: '#3b82f6' }}>{el.programNames?.join(', ') || 'General / All Programs'}</span>
                    {' • '}{el.level}{' • '}{el.description?.substring(0, 60)}...
                 </span>
              </div>
              <div className="reg-col lead">
                 {el.user ? (
                   <div className="l-pill">
                      <div className="a">{el.user.fullName?.[0]}</div>
                      <span className="n">{el.user.fullName}</span>
                   </div>
                 ) : <span className="u">Unassigned</span>}
              </div>
              <div className="reg-col acts">
                 <button className="a-btn s" onClick={()=>openAssign(el.cid)}><UserPlus size={14} /></button>
                 <button className="a-btn p" onClick={()=>openEdit(el.cid)}><Edit size={14} /></button>
                 <button className="a-btn d" onClick={()=>deleteCateg(el.cid)}><Trash2 size={14} /></button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* PORTAL MODALS */}
      {editModal && createPortal(
        <div className="fixed-global-overlay">
          <div className="modal-lexa-container-compact animate-scale-up" style={{ width: 520 }}>
            <div className="modal-lexa-header-mini">
              <h6 className="m-0">Configure Entity</h6>
              <button className="m-close" onClick={()=>setEditModal(false)}><X size={16}/></button>
            </div>
            <div style={{ padding: '25px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'flex', gap: 15, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Module Title</label>
                    <input className="mini-input" style={{ width: '100%', boxSizing: 'border-box' }} value={categoryEdit.title||''} onChange={e=>setCategoryEdit({...categoryEdit,title:e.target.value})} placeholder="Title..."/>
                  </div>
                  <div style={{ width: 110, flexShrink: 0 }}>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Code</label>
                    <input className="mini-input" style={{ width: '100%', boxSizing: 'border-box', textAlign: 'center', fontWeight: 900, color: '#6366f1' }} value={categoryEdit.courseCode||''} onChange={e=>setCategoryEdit({...categoryEdit,courseCode:e.target.value.toUpperCase()})} placeholder="CODE"/>
                  </div>
                </div>

                <div className="f-grp-mini">
                   <label>Academic Level</label>
                   <div className="mini-level-grid">
                      {LEVELS.map(l => (
                        <button key={l} className={`l-pill-btn ${categoryEdit.level === l ? 'active' : ''}`} onClick={()=>setCategoryEdit({...categoryEdit, level: l})}>{l}</button>
                      ))}
                   </div>
                </div>
                <div className="f-grp-mini">
                   <label>Synopsis</label>
                   <textarea className="mini-area" rows={3} value={categoryEdit.description||''} onChange={e=>setCategoryEdit({...categoryEdit,description:e.target.value})} placeholder="Description..."/>
                </div>
                {programs.length > 0 && (
                  <div className="f-grp-mini">
                     <label>Registered Programs (Select all that apply)</label>
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
                        {programs.map(p => {
                          const isSelected = (categoryEdit.programIds || []).includes(p.id);
                          return (
                            <label key={p.id} style={{
                              display: 'flex', alignItems: 'center', gap: '8px', padding: '8px',
                              border: isSelected ? '1px solid #6366f1' : '1px solid #e2e8f0',
                              borderRadius: '6px', background: isSelected ? '#6366f10a' : '#fff',
                              cursor: 'pointer'
                            }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  const currentIds = categoryEdit.programIds || [];
                                  const newIds = e.target.checked 
                                    ? [...currentIds, p.id] 
                                    : currentIds.filter((id: number) => id !== p.id);
                                  setCategoryEdit({ ...categoryEdit, programIds: newIds });
                                }}
                                style={{ accentColor: '#6366f1' }}
                              />
                              <span style={{ fontSize: '12px', fontWeight: isSelected ? 600 : 500, color: '#334155' }}>
                                {p.name}
                              </span>
                            </label>
                          );
                        })}
                     </div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-lexa-footer-mini">
               <button className="m-btn-sec" onClick={()=>setEditModal(false)}>Discard</button>
               <button className="m-btn-pri" onClick={updateCategory} disabled={saving}>{saving ? '...' : 'Commit Changes'}</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {assignModal && createPortal(
        <div className="fixed-global-overlay">
          <div className="modal-lexa-container-compact animate-scale-up" style={{ width: 400 }}>
            <div className="modal-lexa-header-mini">
              <h6 className="m-0">Faculty Assignment</h6>
              <button className="m-close" onClick={()=>setAssignModal(false)}><X size={16}/></button>
            </div>
            <div style={{ padding: '25px' }}>
               <div className="f-grp-mini">
                  <label>Establishing Lead for {categoryEdit.courseCode}</label>
                  <select className="mini-input" style={{ width: '100%' }} value={categoryEdit.userId||''} onChange={e=>setCategoryEdit({...categoryEdit,userId:Number(e.target.value)})}>
                    <option value="">Select Faculty Lead...</option>
                    {lecturers.map((l:any)=><option key={l.id} value={l.id}>{l.fullName}</option>)}
                  </select>
               </div>
            </div>
            <div className="modal-lexa-footer-mini">
               <button className="m-btn-sec" onClick={()=>setAssignModal(false)}>Cancel</button>
               <button className="m-btn-pri accent" onClick={doAssign}>Assign Lead</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <style>{`
        .fixed-global-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          width: 100vw; height: 100vh;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          pointer-events: auto;
        }

        .registry-compact-header { display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 15px 25px; border-radius: 15px; margin-bottom: 25px; border: 1px solid #f1f5f9; }
        .compact-stats { display: flex; align-items: center; gap: 20px; }
        .stat-node { display: flex; flex-direction: column; }
        .stat-node .l { font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; }
        .stat-node .v { font-size: 16px; font-weight: 900; color: #1e293b; }
        .stat-node .v.ok { color: #10b981; }
        .stat-sep { width: 1px; height: 24px; background: #f1f5f9; }

        .compact-actions { display: flex; align-items: center; gap: 12px; }
        .mini-search { height: 36px; width: 220px; background: #f8fafc; border-radius: 10px; display: flex; align-items: center; gap: 8px; padding: 0 12px; border: 1px solid #f1f5f9; }
        .mini-search input { background: none; border: none; outline: none; font-size: 11px; font-weight: 600; color: #475569; width: 100%; }
        .mini-add-btn { height: 36px; padding: 0 16px; background: #6366f1; color: #fff; border: none; border-radius: 10px; font-size: 11px; font-weight: 800; display: flex; align-items: center; gap: 6px; cursor: pointer; transition: 0.2s; }
        .mini-add-btn:hover { background: #4f46e5; }

        .reg-row-premium { background: #fff; border-radius: 15px; padding: 12px 25px; display: grid; grid-template-columns: 100px 1fr 180px 120px; gap: 15px; align-items: center; border: 1px solid #f1f5f9; margin-bottom: 10px; transition: 0.2s; }
        .reg-row-premium:hover { border-color: #e2e8f0; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.02); }
        .c-badge { padding: 4px 10px; background: rgba(99, 102, 241, 0.05); color: #6366f1; border-radius: 8px; font-size: 10px; font-weight: 900; letter-spacing: 0.05em; }
        .reg-col.title .t { margin: 0; font-size: 14px; font-weight: 800; color: #1e293b; }
        .reg-col.title .m { font-size: 11px; color: #94a3b8; font-weight: 600; }
        .l-pill { display: flex; align-items: center; gap: 8px; }
        .l-pill .a { width: 26px; height: 26px; border-radius: 8px; background: #f1f5f9; color: #64748b; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 11px; }
        .l-pill .n { font-size: 12px; font-weight: 700; color: #475569; }
        .reg-col .u { font-size: 11px; color: #cbd5e1; font-weight: 700; font-style: italic; }

        .reg-col.acts { display: flex; gap: 6px; justify-content: flex-end; }
        .a-btn { width: 32px; height: 32px; border-radius: 8px; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; }
        .a-btn.s { background: #f0fdf4; color: #16a34a; }
        .a-btn.p { background: #eff6ff; color: #2563eb; }
        .a-btn.d { background: #fef2f2; color: #dc2626; }
        .a-btn:hover { filter: brightness(0.95); transform: translateY(-1px); }

        .modal-lexa-container-compact { background: #fff; border-radius: 20px; box-shadow: 0 20px 50px rgba(0,0,0,0.15); overflow: hidden; }
        .modal-lexa-header-mini { padding: 15px 25px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; background: #fcfdfe; }
        .modal-lexa-header-mini h6 { margin: 0; font-size: 13px; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 0.05em; }
        .m-close { background: none; border: none; color: #94a3b8; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 8px; transition: 0.2s; }
        .m-close:hover { background: #f1f5f9; color: #f43f5e; }

        .f-grp-mini { display: flex; flex-direction: column; gap: 6px; }
        .f-grp-mini label { font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; padding-left: 2px; }
        .mini-input, .mini-area { border-radius: 10px; border: 1.5px solid #f1f5f9; background: #f8fafc; padding: 10px 14px; font-size: 13px; font-weight: 600; color: #1e293b; outline: none; transition: 0.2s; }
        .mini-input:focus, .mini-area:focus { border-color: #6366f1; background: #fff; }

        .mini-level-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
        .l-pill-btn { height: 34px; border-radius: 8px; border: 1.5px solid #f1f5f9; background: #f8fafc; font-size: 10px; font-weight: 800; color: #64748b; cursor: pointer; transition: 0.2s; }
        .l-pill-btn.active { background: #6366f1; border-color: #6366f1; color: #fff; }

        .modal-lexa-footer-mini { padding: 15px 25px; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end; gap: 10px; background: #fcfdfe; }
        .m-btn-sec { background: none; border: none; font-size: 12px; font-weight: 700; color: #94a3b8; cursor: pointer; padding: 0 15px; height: 38px; }
        .m-btn-pri { height: 38px; padding: 0 20px; background: #1e293b; color: #fff; border: none; border-radius: 10px; font-size: 12px; font-weight: 800; cursor: pointer; transition: 0.2s; }
        .m-btn-pri:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .m-btn-pri.accent { background: #0ea5e9; }

        .animate-scale-up { animation: scaleUp 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); }
        @keyframes scaleUp { from { transform: scale(0.97); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .spin-ico { animation: spin 1s linear infinite; }

        @media (max-width: 768px) {
          .registry-compact-header { flex-direction: column; align-items: stretch; gap: 15px; padding: 15px; }
          .compact-stats { justify-content: center; }
          .compact-actions { flex-direction: column; align-items: stretch; width: 100%; }
          .mini-search { width: 100%; }
          .mini-add-btn { width: 100%; justify-content: center; }
          .reg-row-premium {
            grid-template-columns: 1fr;
            position: relative;
            padding: 15px;
            gap: 10px;
          }
          .reg-col.code { position: absolute; top: 15px; right: 15px; }
          .reg-col.lead { margin-top: 5px; }
          .reg-col.acts { justify-content: flex-start; margin-top: 5px; }
          .modal-lexa-container-compact { width: 95vw !important; max-width: none !important; }
          .mini-level-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
    </div>
  );
}
