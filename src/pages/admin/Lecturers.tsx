import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getAllLecturersCounts, getLecturerById, updateLecturer, deleteLecturer, registerLecturer, getDepartments } from '../../api/endpoints';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';
import PageHeader from '../../components/PageHeader';
import { 
  Users, Search, Plus, Edit, Trash2, Mail, Phone, Fingerprint, X, 
  Save, UserCheck, UserPlus, Filter, MoreVertical, Loader2, ArrowRight, 
  Shield, BadgeCheck, GraduationCap, ChevronRight, User, CheckCircle2,
  Lock, Key
} from 'lucide-react';

const emptyLecturer = { firstname:'', lastname:'', username:'', email:'', phone:'', password:'', departmentId:'' };

export default function Lecturers() {
  const [lecturers, setLecturers]       = useState<any[]>([]);
  const [filtered, setFiltered]         = useState<any[]>([]);
  const [total, setTotal]               = useState(0);
  const [searchText, setSearchText]     = useState('');
  const [editModal, setEditModal]       = useState(false);
  const [addModal, setAddModal]         = useState(false);
  const [lecturerEdit, setLecturerEdit] = useState<any>({});
  const [newLect, setNewLect]           = useState(emptyLecturer);
  const [loading, setLoading]           = useState(false);
  const [saving, setSaving]             = useState(false);
  const [departments, setDepartments]   = useState<any[]>([]);

  const fetchLecturers = async () => {
    setLoading(true);
    try {
      const resp: any = await getAllLecturersCounts();
      setLecturers(resp.lecturers ?? []);
      setFiltered(resp.lecturers ?? []);
      setTotal(resp.count ?? 0);
    } catch {} finally { setLoading(false); }
  };
  
  useEffect(()=>{ 
    fetchLecturers(); 
    getDepartments().then(res => setDepartments(res)).catch(()=>{});
  },[]);

  useEffect(() => {
    if (editModal || addModal) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [editModal, addModal]);

  const applyFilter = (text: string) => {
    setSearchText(text);
    if (!text) { setFiltered(lecturers); return; }
    const s = text.toLowerCase();
    setFiltered(lecturers.filter(l=>
      l.fullName?.toLowerCase().includes(s)||
      l.username?.toLowerCase().includes(s)||
      l.email?.toLowerCase().includes(s)
    ));
  };

  const openEdit = async (id: number) => {
    try { 
      const data = await getLecturerById(id); 
      setLecturerEdit(data); 
      setEditModal(true); 
    } catch {}
  };

  const doUpdate = async () => {
    setSaving(true);
    try { 
      await toast.promise(
        updateLecturer(lecturerEdit.id, lecturerEdit),
        {
          loading: 'Synchronizing faculty profile...',
          success: 'Faculty record updated',
          error: 'Synchronization protocol failed'
        }
      );
      setEditModal(false); 
      fetchLecturers(); 
    } catch {}
    setSaving(false);
  };

  const doDelete = (id: number) => {
    Swal.fire({
      title: 'Remove Faculty Member?',
      text: "Permanent termination of administrative privileges and course access.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f43f5e',
      confirmButtonText: 'Yes, Remove Member'
    }).then(r=>{
      if (!r.isConfirmed) return;
      deleteLecturer(id).then(()=>{ 
        toast.success('Personnel purged from registry'); 
        fetchLecturers(); 
      }).catch(()=>toast.error('Removal protocol failed'));
    });
  };

  const doAddLecturer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const lt = toast.loading('Establishing new registry entry...');
    try {
      await registerLecturer(newLect);
      toast.success('Personnel established successfully', { id: lt });
      setAddModal(false); 
      setNewLect(emptyLecturer); 
      fetchLecturers();
    } catch { 
      toast.error(`Registration failed`, { id: lt }); 
    }
    setSaving(false);
  };

  const setN = (k: keyof typeof emptyLecturer) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setNewLect(l=>({...l,[k]:e.target.value}));

  return (
    <div className="admin-lecturers-page animate-fade-in" style={{ padding: '0 0 40px', fontFamily: '"Outfit", sans-serif' }}>
      <PageHeader title="Faculty Registry" breadcrumbs={['Lexa', 'Admin', 'Staffing']} />
      
      {/* COMPACT STATS & SEARCH */}
      <div className="registry-compact-header">
         <div className="compact-stats">
            <div className="stat-node">
               <span className="l">Faculty Personnel</span>
               <span className="v">{total}</span>
            </div>
            <div className="stat-sep"></div>
            <div className="stat-node">
               <span className="l">Network Status</span>
               <span className="v secure">Secure</span>
            </div>
         </div>
         <div className="compact-actions">
            <div className="mini-search">
               <Search size={14} />
               <input type="text" placeholder="Filter personnel..." value={searchText} onChange={e=>applyFilter(e.target.value)} />
            </div>
            <button className="add-p-btn" onClick={()=>setAddModal(true)}><Plus size={16} /> <span>Enroll Staff</span></button>
         </div>
      </div>

      <div className="registry-list-compact">
        {loading ? (
          <div className="reg-loader"><Loader2 className="spin-ico" size={32} /></div>
        ) : filtered.length === 0 ? (
          <div className="reg-empty-state">
             <Users size={48} />
             <h5>Registry Empty</h5>
             <p>No faculty personnel found in the active directory.</p>
          </div>
        ) : (
          filtered.map((el: any) => (
            <div key={el.id} className="reg-row-premium">
              <div className="reg-col id-badge">
                 <div className="s-avatar-gold">{el.firstname?.[0]}{el.lastname?.[0]}</div>
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
                 <span className="p-badge"><Shield size={12} /> Personnel</span>
              </div>
              <div className="reg-col acts">
                 <button className="a-btn p" onClick={()=>openEdit(el.id)}><Edit size={14} /></button>
                 <button className="a-btn d" onClick={()=>doDelete(el.id)}><Trash2 size={14} /></button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* PORTAL MODALS */}
      {editModal && createPortal(
        <div className="fixed-global-overlay">
          <div className="modal-lexa-container-compact animate-scale-up" style={{ width: 600 }}>
            <div className="modal-lexa-header-mini">
              <h6 className="m-0">Synchronize Faculty Profile</h6>
              <button className="m-close" onClick={()=>setEditModal(false)}><X size={16}/></button>
            </div>
            <div style={{ padding: '30px' }}>
              <div className="form-grid-2">
                <div className="f-grp-mini">
                   <label>First Name</label>
                   <input className="mini-input" value={lecturerEdit.firstname||''} onChange={e=>setLecturerEdit({...lecturerEdit,firstname:e.target.value})}/>
                </div>
                <div className="f-grp-mini">
                   <label>Last Name</label>
                   <input className="mini-input" value={lecturerEdit.lastname||''} onChange={e=>setLecturerEdit({...lecturerEdit,lastname:e.target.value})}/>
                </div>
                <div className="f-grp-mini">
                   <label>System Identity</label>
                   <input className="mini-input id-lock" value={lecturerEdit.username||''} onChange={e=>setLecturerEdit({...lecturerEdit,username:e.target.value})}/>
                </div>
                <div className="f-grp-mini">
                   <label>Email Address</label>
                   <input className="mini-input" value={lecturerEdit.email||''} onChange={e=>setLecturerEdit({...lecturerEdit,email:e.target.value})}/>
                </div>
                <div className="f-grp-mini">
                   <label>Department</label>
                   <select className="mini-input" value={lecturerEdit.departmentId||''} onChange={e=>setLecturerEdit({...lecturerEdit,departmentId:e.target.value})}>
                     <option value="">-- No Department --</option>
                     {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                   </select>
                </div>
              </div>
            </div>
            <div className="modal-lexa-footer-mini">
               <button className="m-btn-sec" onClick={()=>setEditModal(false)}>Discard</button>
               <button className="m-btn-pri" onClick={doUpdate} disabled={saving}>{saving ? '...' : 'Save Synchronization'}</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {addModal && createPortal(
        <div className="fixed-global-overlay">
          <div className="modal-lexa-container-compact animate-scale-up" style={{ width: 650 }}>
            <div className="modal-lexa-header-mini">
              <h6 className="m-0">Enroll Faculty Personnel</h6>
              <button className="m-close" onClick={()=>setAddModal(false)}><X size={16}/></button>
            </div>
            <form onSubmit={doAddLecturer}>
              <div style={{ padding: '30px' }}>
                <div className="form-grid-2" style={{ gap: '20px' }}>
                  <div className="f-grp-mini"><label>First Name</label><input className="mini-input" required value={newLect.firstname} onChange={setN('firstname')}/></div>
                  <div className="f-grp-mini"><label>Last Name</label><input className="mini-input" required value={newLect.lastname} onChange={setN('lastname')}/></div>
                  <div className="f-grp-mini"><label>System ID</label><input className="mini-input" required value={newLect.username} onChange={setN('username')}/></div>
                  <div className="f-grp-mini"><label>Registry Email</label><input className="mini-input" required type="email" value={newLect.email} onChange={setN('email')}/></div>
                  <div className="f-grp-mini"><label>Contact</label><input className="mini-input" value={newLect.phone} onChange={setN('phone')}/></div>
                  <div className="f-grp-mini"><label>Credential (Pass)</label><input className="mini-input" required type="password" value={newLect.password} onChange={setN('password')}/></div>
                  <div className="f-grp-mini">
                    <label>Department</label>
                    <select className="mini-input" value={newLect.departmentId} onChange={setN('departmentId')}>
                      <option value="">-- No Department --</option>
                      {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="enroll-protocol-box">
                   <Lock size={16} />
                   <span>Personnel established via this protocol will inherit administrative privileges.</span>
                </div>
              </div>
              <div className="modal-lexa-footer-mini">
                 <button type="button" className="m-btn-sec" onClick={()=>setAddModal(false)}>Cancel</button>
                 <button type="submit" className="m-btn-pri" disabled={saving}>{saving ? 'Initializing...' : 'Confirm Enrollment'}</button>
              </div>
            </form>
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
        .stat-node .v.secure { color: #f59e0b; }
        .stat-sep { width: 1px; height: 24px; background: #f1f5f9; }

        .compact-actions { display: flex; align-items: center; gap: 15px; }
        .mini-search { height: 36px; width: 240px; background: #f8fafc; border-radius: 10px; display: flex; align-items: center; gap: 8px; padding: 0 12px; border: 1px solid #f1f5f9; }
        .mini-search input { background: none; border: none; outline: none; font-size: 11px; font-weight: 600; color: #475569; width: 100%; }
        
        .add-p-btn { height: 36px; padding: 0 18px; background: #1e293b; color: #fff; border: none; border-radius: 10px; display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 800; cursor: pointer; transition: 0.2s; }
        .add-p-btn:hover { background: #000; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }

        .reg-row-premium { background: #fff; border-radius: 15px; padding: 10px 25px; display: grid; grid-template-columns: 60px 1fr 120px 100px; gap: 15px; align-items: center; border: 1px solid #f1f5f9; margin-bottom: 8px; transition: 0.2s; }
        .reg-row-premium:hover { border-color: #e2e8f0; transform: translateY(-1px); }
        
        .s-avatar-gold { width: 38px; height: 38px; border-radius: 10px; background: rgba(245, 158, 11, 0.08); color: #f59e0b; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px; border: 1px solid rgba(245, 158, 11, 0.1); }
        .reg-col.info .t { margin: 0; font-size: 14px; font-weight: 800; color: #1e293b; }
        .reg-col.info .sub { display: flex; align-items: center; gap: 8px; font-size: 11px; color: #94a3b8; font-weight: 600; margin-top: 2px; }
        .reg-col.info .sub .dot { width: 3px; height: 3px; border-radius: 50%; background: #cbd5e1; }
        
        .p-badge { display: flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 800; color: #6366f1; text-transform: uppercase; background: rgba(99, 102, 241, 0.05); padding: 4px 10px; border-radius: 6px; }

        .reg-col.acts { display: flex; gap: 6px; justify-content: flex-end; }
        .a-btn { width: 32px; height: 32px; border-radius: 8px; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; }
        .a-btn.p { background: #eff6ff; color: #2563eb; }
        .a-btn.d { background: #fef2f2; color: #dc2626; }
        .a-btn:hover { filter: brightness(0.95); transform: translateY(-1px); }

        .fixed-global-overlay { position: fixed; inset: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 99999; }
        .modal-lexa-container-compact { background: #fff; border-radius: 20px; box-shadow: 0 20px 50px rgba(0,0,0,0.15); overflow: hidden; }
        .modal-lexa-header-mini { padding: 15px 25px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; background: #fcfdfe; }
        .modal-lexa-header-mini h6 { margin: 0; font-size: 13px; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 0.05em; }
        .m-close { background: none; border: none; color: #94a3b8; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 8px; }
        
        .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .f-grp-mini { display: flex; flex-direction: column; gap: 6px; }
        .f-grp-mini label { font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; padding-left: 2px; }
        .mini-input { border-radius: 10px; border: 1.5px solid #f1f5f9; background: #f8fafc; padding: 11px 15px; font-size: 13px; font-weight: 600; color: #1e293b; outline: none; transition: 0.2s; }
        .mini-input:focus { border-color: #6366f1; background: #fff; }
        .id-lock { font-weight: 800; color: #6366f1; background: rgba(99, 102, 241, 0.02); }

        .enroll-protocol-box { margin-top: 25px; padding: 15px; background: rgba(245, 158, 11, 0.05); border: 1.5px dashed rgba(245, 158, 11, 0.2); border-radius: 12px; display: flex; gap: 12px; align-items: center; font-size: 12px; color: #b45309; font-weight: 600; }

        .modal-lexa-footer-mini { padding: 15px 25px; border-top: 1px solid #f1f5f9; display: flex; justify-content: flex-end; gap: 10px; background: #fcfdfe; }
        .m-btn-sec { background: none; border: none; font-size: 12px; font-weight: 700; color: #94a3b8; cursor: pointer; padding: 0 15px; height: 38px; }
        .m-btn-pri { height: 38px; padding: 0 25px; background: #1e293b; color: #fff; border: none; border-radius: 10px; font-size: 12px; font-weight: 800; cursor: pointer; transition: 0.2s; }

        .animate-scale-up { animation: scaleUp 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); }
        @keyframes scaleUp { from { transform: scale(0.97); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .spin-ico { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

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
