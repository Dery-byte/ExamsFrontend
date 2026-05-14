import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getAllStudentsCounts, getStudentById, updateStudent, deleteStudent } from '../../api/endpoints';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';
import PageHeader from '../../components/PageHeader';
import { 
  Users, Search, Edit, Trash2, GraduationCap, Mail, Fingerprint, X, 
  Save, User, Loader2, ShieldCheck, UserCheck, Calendar, Filter, 
  MoreHorizontal, ArrowRight, BookOpen, BadgeCheck, Phone, ChevronRight,
  Database, Activity, CheckCircle2, MoreVertical
} from 'lucide-react';

export default function Students() {
  const [students, setStudents]           = useState<any[]>([]);
  const [filteredStudents, setFiltered]   = useState<any[]>([]);
  const [studentTotal, setTotal]          = useState(0);
  const [searchText, setSearchText]       = useState('');
  const [editModal, setEditModal]         = useState(false);
  const [studentEdit, setStudentEdit]     = useState<any>({});
  const [loading, setLoading]             = useState(false);
  const [saving, setSaving]               = useState(false);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const resp: any = await getAllStudentsCounts();
      setStudents(resp.students ?? []);
      setFiltered(resp.students ?? []);
      setTotal(resp.count ?? 0);
    } catch {} finally { setLoading(false); }
  };
  
  useEffect(() => { 
    fetchStudents(); 
  }, []);

  useEffect(() => {
    if (editModal) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [editModal]);

  const applyFilter = (text: string) => {
    setSearchText(text);
    if (!text) { setFiltered(students); return; }
    const s = text.toLowerCase();
    setFiltered(students.filter(st => 
      st.fullName?.toLowerCase().includes(s) || 
      st.username?.toLowerCase().includes(s) || 
      st.email?.toLowerCase().includes(s)
    ));
  };

  const openEdit = async (id: number) => {
    try { 
      const data = await getStudentById(id); 
      setStudentEdit(data); 
      setEditModal(true); 
    } catch {}
  };

  const doUpdate = async () => {
    setSaving(true);
    try { 
      await toast.promise(
        updateStudent(studentEdit.id, studentEdit),
        {
          loading: 'Synchronizing registry record...',
          success: 'Student profile updated',
          error: 'Synchronization protocol failed'
        }
      );
      setEditModal(false); 
      fetchStudents(); 
    } catch {}
    setSaving(false);
  };

  const doDelete = (id: number) => {
    Swal.fire({
      title: 'Purge Student Record?',
      text: "Permanent removal of all academic and registry history.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f43f5e',
      confirmButtonText: 'Yes, Purge Record',
      cancelButtonText: 'Discard'
    }).then(r=>{
      if (!r.isConfirmed) return;
      deleteStudent(id).then(()=>{ 
        toast.success('Registry record purged'); 
        fetchStudents(); 
      }).catch(()=>toast.error('Deletion protocol failed'));
    });
  };

  return (
    <div className="admin-students-page animate-fade-in" style={{ padding: '0 0 40px', fontFamily: '"Outfit", sans-serif' }}>
      <PageHeader title="Student Registry" breadcrumbs={['Lexa', 'Admin', 'Directory']} />
      
      {/* COMPACT STATS & SEARCH */}
      <div className="registry-compact-header">
         <div className="compact-stats">
            <div className="stat-node">
               <span className="l">Total Enrollment</span>
               <span className="v">{studentTotal}</span>
            </div>
            <div className="stat-sep"></div>
            <div className="stat-node">
               <span className="l">Status</span>
               <span className="v ok">Active</span>
            </div>
         </div>
         <div className="compact-actions">
            <div className="mini-search">
               <Search size={14} />
               <input type="text" placeholder="Filter directory..." value={searchText} onChange={e=>applyFilter(e.target.value)} />
            </div>
         </div>
      </div>

      <div className="registry-list-compact">
        {loading ? (
          <div className="reg-loader"><Loader2 className="spin-ico" size={32} /></div>
        ) : filteredStudents.length === 0 ? (
          <div className="reg-empty-state">
             <GraduationCap size={48} />
             <h5>No Student Records</h5>
             <p>The student directory is currently empty or matches no filters.</p>
          </div>
        ) : (
          filteredStudents.map((el: any) => (
            <div key={el.id} className="reg-row-premium">
              <div className="reg-col id-badge">
                 <div className="s-avatar">{el.firstname?.[0]}{el.lastname?.[0]}</div>
              </div>
              <div className="reg-col info">
                 <h6 className="t">{el.fullName}</h6>
                 <div className="sub">
                    <Fingerprint size={12} /> <span>{el.username}</span>
                    <span className="dot" />
                    <Mail size={12} /> <span>{el.email}</span>
                 </div>
              </div>
              <div className="reg-col status">
                 <span className="v-badge"><CheckCircle2 size={12} /> Verified</span>
              </div>
              <div className="reg-col acts">
                 <button className="a-btn p" onClick={()=>openEdit(el.id)}><Edit size={14} /></button>
                 <button className="a-btn d" onClick={()=>doDelete(el.id)}><Trash2 size={14} /></button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* PORTAL MODAL - Global Coverage */}
      {editModal && createPortal(
        <div className="fixed-global-overlay">
          <div className="modal-lexa-container-compact animate-scale-up" style={{ width: 600 }}>
            <div className="modal-lexa-header-mini">
              <h6 className="m-0">Update Registry Profile</h6>
              <button className="m-close" onClick={()=>setEditModal(false)}><X size={16}/></button>
            </div>
            <div style={{ padding: '30px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className="form-grid-2">
                   <div className="f-grp-mini">
                      <label>First Name</label>
                      <input className="mini-input" value={studentEdit.firstname||''} onChange={e=>setStudentEdit({...studentEdit,firstname:e.target.value})} placeholder="First name..."/>
                   </div>
                   <div className="f-grp-mini">
                      <label>Last Name</label>
                      <input className="mini-input" value={studentEdit.lastname||''} onChange={e=>setStudentEdit({...studentEdit,lastname:e.target.value})} placeholder="Last name..."/>
                   </div>
                </div>
                <div className="f-grp-mini">
                   <label>Email Address</label>
                   <input className="mini-input" value={studentEdit.email||''} onChange={e=>setStudentEdit({...studentEdit,email:e.target.value})} placeholder="student@email.com"/>
                </div>
                <div className="f-grp-mini">
                   <label>Registry Index (ID)</label>
                   <input className="mini-input id-lock" value={studentEdit.username||''} onChange={e=>setStudentEdit({...studentEdit,username:e.target.value})} placeholder="Index number..."/>
                </div>
              </div>
            </div>
            <div className="modal-lexa-footer-mini">
               <button className="m-btn-sec" onClick={()=>setEditModal(false)}>Discard</button>
               <button className="m-btn-pri" onClick={doUpdate} disabled={saving}>{saving ? '...' : 'Synchronize Profile'}</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <style>{`
        .registry-compact-header { display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 15px 25px; border-radius: 15px; margin-bottom: 25px; border: 1px solid #f1f5f9; }
        .compact-stats { display: flex; align-items: center; gap: 20px; }
        .stat-node { display: flex; flex-direction: column; }
        .stat-node .l { font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; }
        .stat-node .v { font-size: 16px; font-weight: 900; color: #1e293b; }
        .stat-node .v.ok { color: #10b981; }
        .stat-sep { width: 1px; height: 24px; background: #f1f5f9; }

        .compact-actions { display: flex; align-items: center; gap: 12px; }
        .mini-search { height: 36px; width: 260px; background: #f8fafc; border-radius: 10px; display: flex; align-items: center; gap: 8px; padding: 0 12px; border: 1px solid #f1f5f9; }
        .mini-search input { background: none; border: none; outline: none; font-size: 11px; font-weight: 600; color: #475569; width: 100%; }

        .reg-row-premium { background: #fff; border-radius: 15px; padding: 10px 25px; display: grid; grid-template-columns: 60px 1fr 120px 100px; gap: 15px; align-items: center; border: 1px solid #f1f5f9; margin-bottom: 8px; transition: 0.2s; }
        .reg-row-premium:hover { border-color: #e2e8f0; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.02); }
        
        .s-avatar { width: 38px; height: 38px; border-radius: 10px; background: rgba(99, 102, 241, 0.08); color: #6366f1; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px; }
        .reg-col.info .t { margin: 0; font-size: 14px; font-weight: 800; color: #1e293b; }
        .reg-col.info .sub { display: flex; align-items: center; gap: 8px; font-size: 11px; color: #94a3b8; font-weight: 600; margin-top: 2px; }
        .reg-col.info .sub .dot { width: 3px; height: 3px; border-radius: 50%; background: #cbd5e1; }
        
        .v-badge { display: flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 800; color: #10b981; text-transform: uppercase; background: rgba(16, 185, 129, 0.05); padding: 4px 10px; border-radius: 6px; }

        .reg-col.acts { display: flex; gap: 6px; justify-content: flex-end; }
        .a-btn { width: 32px; height: 32px; border-radius: 8px; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; }
        .a-btn.p { background: #eff6ff; color: #2563eb; }
        .a-btn.d { background: #fef2f2; color: #dc2626; }
        .a-btn:hover { filter: brightness(0.95); transform: translateY(-1px); }

        .reg-empty-state { padding: 80px 0; text-align: center; color: #cbd5e1; }
        .reg-empty-state h5 { margin: 15px 0 5px; color: #1e293b; font-weight: 800; }
        .reg-empty-state p { font-size: 13px; font-weight: 600; }

        .fixed-global-overlay { position: fixed; inset: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 99999; }
        .modal-lexa-container-compact { background: #fff; border-radius: 20px; box-shadow: 0 20px 50px rgba(0,0,0,0.15); overflow: hidden; }
        .modal-lexa-header-mini { padding: 15px 25px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; background: #fcfdfe; }
        .modal-lexa-header-mini h6 { margin: 0; font-size: 13px; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 0.05em; }
        .m-close { background: none; border: none; color: #94a3b8; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 8px; }
        .m-close:hover { background: #f1f5f9; color: #f43f5e; }

        .f-grp-mini { display: flex; flex-direction: column; gap: 6px; }
        .f-grp-mini label { font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; padding-left: 2px; }
        .mini-input { border-radius: 10px; border: 1.5px solid #f1f5f9; background: #f8fafc; padding: 11px 15px; font-size: 13px; font-weight: 600; color: #1e293b; outline: none; transition: 0.2s; }
        .mini-input:focus { border-color: #6366f1; background: #fff; }
        .id-lock { font-weight: 800; color: #02a4af; background: rgba(2, 164, 175, 0.02); }

        .modal-lexa-footer-mini { padding: 15px 25px; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end; gap: 10px; background: #fcfdfe; }
        .m-btn-sec { background: none; border: none; font-size: 12px; font-weight: 700; color: #94a3b8; cursor: pointer; padding: 0 15px; height: 38px; }
        .m-btn-pri { height: 38px; padding: 0 25px; background: #1e293b; color: #fff; border: none; border-radius: 10px; font-size: 12px; font-weight: 800; cursor: pointer; transition: 0.2s; }
        .m-btn-pri:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }

        .animate-scale-up { animation: scaleUp 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); }
        @keyframes scaleUp { from { transform: scale(0.97); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .spin-ico { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }

        @media (max-width: 768px) {
          .registry-compact-header { flex-direction: column; align-items: stretch; gap: 15px; padding: 15px; }
          .compact-stats { justify-content: center; }
          .compact-actions { flex-direction: column; align-items: stretch; width: 100%; }
          .mini-search { width: 100%; }
          .reg-row-premium { 
            grid-template-columns: 1fr; 
            position: relative; 
            padding: 15px; 
            gap: 10px;
          }
          .reg-col.id-badge { display: none; }
          .reg-col.status { position: absolute; top: 15px; right: 15px; }
          .reg-col.acts { justify-content: flex-start; margin-top: 5px; }
          .modal-lexa-container-compact { width: 95vw !important; max-width: none !important; }
          .form-grid-2 { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
