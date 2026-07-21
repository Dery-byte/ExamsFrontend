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
import { useAuth } from '../../contexts/AuthContext';

const emptyLecturer = { firstname:'', lastname:'', username:'', email:'', phone:'', password:'', departmentId:'', secondaryDepartmentIds: [] as number[] };

export default function Lecturers() {
  const { user } = useAuth();
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
    getDepartments().then(res => {
      let allowed = res;
      if (user?.role === 'ADMIN' && user?.department?.id) {
        allowed = res.filter((d: any) => d.id === user.department!.id);
      }
      setDepartments(allowed);
      if (allowed.length === 1) {
        setNewLect(prev => ({ ...prev, departmentId: allowed[0].id.toString() }));
      }
    }).catch(()=>{});
  },[user]);

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
      setLecturerEdit({ ...data, secondaryDepartmentIds: data.secondaryDepartmentIds ?? [] }); 
      setEditModal(true); 
    } catch {}
  };

  const toggleSecondaryDept = (deptId: number, isSuperAdmin: boolean, isEdit: boolean) => {
    if (!isSuperAdmin) return;
    if (isEdit) {
      const current: number[] = lecturerEdit.secondaryDepartmentIds ?? [];
      setLecturerEdit((prev: any) => ({ 
        ...prev, 
        secondaryDepartmentIds: current.includes(deptId) ? current.filter((d: number) => d !== deptId) : [...current, deptId]
      }));
    } else {
      const current = newLect.secondaryDepartmentIds;
      setNewLect(prev => ({ 
        ...prev, 
        secondaryDepartmentIds: current.includes(deptId) ? current.filter(d => d !== deptId) : [...current, deptId]
      }));
    }
  };

  const doUpdate = async () => {
    setSaving(true);
    try {
      const payload = {
        ...lecturerEdit,
        secondaryDepartmentIds: (lecturerEdit.secondaryDepartmentIds || []).filter((id: number) => id.toString() !== lecturerEdit.departmentId?.toString())
      };
      await toast.promise(
        updateLecturer(payload.id, payload),
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
      const payload = {
        ...newLect,
        secondaryDepartmentIds: newLect.secondaryDepartmentIds.filter(id => id.toString() !== newLect.departmentId?.toString())
      };
      await registerLecturer(payload);
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
  const setNSelect = (k: keyof typeof emptyLecturer) => (e: React.ChangeEvent<HTMLSelectElement>) =>
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


      {/* ─── EDIT MODAL ─────────────────────────────────────────── */}
      {editModal && createPortal(
        <div className="lx-overlay" onClick={e => { if (e.target === e.currentTarget) setEditModal(false); }}>
          <div className="lx-modal animate-lx-in">

            {/* Left accent panel */}
            <div className="lx-modal-aside">
              <div className="lx-modal-aside-avatar">
                {lecturerEdit.firstname?.[0]?.toUpperCase()}{lecturerEdit.lastname?.[0]?.toUpperCase()}
              </div>
              <h3 className="lx-modal-aside-title">Edit Profile</h3>
              <p className="lx-modal-aside-sub">Update faculty member details and department assignments.</p>
              <div className="lx-modal-aside-steps">
                <div className="lx-step active"><span className="lx-step-dot" /><span>Personal Info</span></div>
                <div className="lx-step active"><span className="lx-step-dot" /><span>Credentials</span></div>
                <div className="lx-step active"><span className="lx-step-dot" /><span>Department</span></div>
              </div>
            </div>

            {/* Right form panel */}
            <div className="lx-modal-body">
              <div className="lx-modal-top-bar">
                <div>
                  <p className="lx-modal-label-tag">Faculty Registry</p>
                  <h4 className="lx-modal-heading">Synchronize Profile</h4>
                </div>
                <button className="lx-close-btn" onClick={() => setEditModal(false)}><X size={18}/></button>
              </div>

              <div className="lx-form-scroll">
                <div className="lx-section-label"><User size={13}/> Personal Information</div>
                <div className="lx-field-grid">
                  <div className="lx-field">
                    <label>First Name</label>
                    <div className="lx-input-wrap">
                      <User size={14} className="lx-input-icon"/>
                      <input value={lecturerEdit.firstname||''} onChange={e=>setLecturerEdit({...lecturerEdit,firstname:e.target.value})} placeholder="First name"/>
                    </div>
                  </div>
                  <div className="lx-field">
                    <label>Last Name</label>
                    <div className="lx-input-wrap">
                      <User size={14} className="lx-input-icon"/>
                      <input value={lecturerEdit.lastname||''} onChange={e=>setLecturerEdit({...lecturerEdit,lastname:e.target.value})} placeholder="Last name"/>
                    </div>
                  </div>
                  <div className="lx-field">
                    <label>Email Address</label>
                    <div className="lx-input-wrap">
                      <Mail size={14} className="lx-input-icon"/>
                      <input type="email" value={lecturerEdit.email||''} onChange={e=>setLecturerEdit({...lecturerEdit,email:e.target.value})} placeholder="email@institution.edu"/>
                    </div>
                  </div>
                  <div className="lx-field">
                    <label>Phone</label>
                    <div className="lx-input-wrap">
                      <Phone size={14} className="lx-input-icon"/>
                      <input value={lecturerEdit.phone||''} onChange={e=>setLecturerEdit({...lecturerEdit,phone:e.target.value})} placeholder="+233 ..."/>
                    </div>
                  </div>
                </div>

                <div className="lx-section-label" style={{marginTop:20}}><Fingerprint size={13}/> System Identity</div>
                <div className="lx-field-grid">
                  <div className="lx-field lx-field-full">
                    <label>Username / System ID</label>
                    <div className="lx-input-wrap lx-input-accent">
                      <Fingerprint size={14} className="lx-input-icon"/>
                      <input value={lecturerEdit.username||''} onChange={e=>setLecturerEdit({...lecturerEdit,username:e.target.value})} placeholder="system.id"/>
                    </div>
                  </div>
                </div>

                <div className="lx-section-label" style={{marginTop:20}}><GraduationCap size={13}/> Department Assignment</div>
                <div className="lx-field">
                  <label>Primary Department</label>
                  <div className="lx-input-wrap">
                    <GraduationCap size={14} className="lx-input-icon"/>
                    <select value={lecturerEdit.departmentId||''} onChange={e=>setLecturerEdit({...lecturerEdit,departmentId:e.target.value})}>
                      <option value="">— Select Department —</option>
                      {departments.map((d:any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                </div>

                {user?.role === 'SUPER_ADMIN' && (
                  <div style={{marginTop:20}}>
                    <div className="lx-section-label">
                      <Shield size={13}/>
                      <span>Additional Departments</span>
                      <span className="lx-super-badge">Super Admin</span>
                    </div>
                    <p className="lx-hint-text">This lecturer will be visible to HODs of every selected department.</p>
                    <div className="lx-dept-chips">
                      {departments.filter((d:any) => d.id.toString() !== lecturerEdit.departmentId?.toString()).map((d:any) => {
                        const sel = (lecturerEdit.secondaryDepartmentIds ?? []).includes(d.id);
                        return (
                          <button type="button" key={d.id} className={`lx-chip ${sel?'lx-chip-on':''}`}
                            onClick={() => toggleSecondaryDept(d.id, true, true)}>
                            {sel && <CheckCircle2 size={13}/>}
                            {d.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="lx-modal-footer">
                <button className="lx-btn-ghost" onClick={() => setEditModal(false)}>Cancel</button>
                <button className="lx-btn-primary" onClick={doUpdate} disabled={saving}>
                  {saving ? <Loader2 size={14} className="spin-ico"/> : <Save size={14}/>}
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ─── ADD / ENROLL MODAL ────────────────────────────────── */}
      {addModal && createPortal(
        <div className="lx-overlay" onClick={e => { if (e.target === e.currentTarget) setAddModal(false); }}>
          <div className="lx-modal animate-lx-in">

            {/* Left accent panel */}
            <div className="lx-modal-aside lx-modal-aside-enroll">
              <div className="lx-modal-aside-icon-wrap">
                <UserPlus size={28} color="#fff"/>
              </div>
              <h3 className="lx-modal-aside-title">Enroll Staff</h3>
              <p className="lx-modal-aside-sub">Register a new faculty member and assign them to departments.</p>
              <div className="lx-modal-aside-steps">
                <div className="lx-step active"><span className="lx-step-dot"/><span>Identity</span></div>
                <div className="lx-step active"><span className="lx-step-dot"/><span>Contact</span></div>
                <div className="lx-step active"><span className="lx-step-dot"/><span>Access</span></div>
                <div className="lx-step active"><span className="lx-step-dot"/><span>Department</span></div>
              </div>
              <div className="lx-aside-notice">
                <Lock size={13}/>
                <span>Personnel will inherit faculty-level access privileges.</span>
              </div>
            </div>

            {/* Right form panel */}
            <div className="lx-modal-body">
              <div className="lx-modal-top-bar">
                <div>
                  <p className="lx-modal-label-tag">Faculty Registry</p>
                  <h4 className="lx-modal-heading">New Enrollment</h4>
                </div>
                <button className="lx-close-btn" onClick={() => setAddModal(false)}><X size={18}/></button>
              </div>

              <form onSubmit={doAddLecturer} style={{display:'flex',flexDirection:'column',flex:1,overflow:'hidden'}}>
                <div className="lx-form-scroll">
                  <div className="lx-section-label"><User size={13}/> Personal Information</div>
                  <div className="lx-field-grid">
                    <div className="lx-field">
                      <label>First Name <span className="lx-req">*</span></label>
                      <div className="lx-input-wrap">
                        <User size={14} className="lx-input-icon"/>
                        <input required value={newLect.firstname} onChange={setN('firstname')} placeholder="First name"/>
                      </div>
                    </div>
                    <div className="lx-field">
                      <label>Last Name <span className="lx-req">*</span></label>
                      <div className="lx-input-wrap">
                        <User size={14} className="lx-input-icon"/>
                        <input required value={newLect.lastname} onChange={setN('lastname')} placeholder="Last name"/>
                      </div>
                    </div>
                    <div className="lx-field">
                      <label>Email <span className="lx-req">*</span></label>
                      <div className="lx-input-wrap">
                        <Mail size={14} className="lx-input-icon"/>
                        <input required type="email" value={newLect.email} onChange={setN('email')} placeholder="email@institution.edu"/>
                      </div>
                    </div>
                    <div className="lx-field">
                      <label>Phone</label>
                      <div className="lx-input-wrap">
                        <Phone size={14} className="lx-input-icon"/>
                        <input value={newLect.phone} onChange={setN('phone')} placeholder="+233 ..."/>
                      </div>
                    </div>
                  </div>

                  <div className="lx-section-label" style={{marginTop:20}}><Key size={13}/> Access Credentials</div>
                  <div className="lx-field-grid">
                    <div className="lx-field">
                      <label>Username <span className="lx-req">*</span></label>
                      <div className="lx-input-wrap lx-input-accent">
                        <Fingerprint size={14} className="lx-input-icon"/>
                        <input required value={newLect.username} onChange={setN('username')} placeholder="system.username"/>
                      </div>
                    </div>
                    <div className="lx-field">
                      <label>Password <span className="lx-req">*</span></label>
                      <div className="lx-input-wrap">
                        <Lock size={14} className="lx-input-icon"/>
                        <input required type="password" value={newLect.password} onChange={setN('password')} placeholder="••••••••"/>
                      </div>
                    </div>
                  </div>

                  <div className="lx-section-label" style={{marginTop:20}}><GraduationCap size={13}/> Department</div>
                  <div className="lx-field">
                    <label>Primary Department</label>
                    <div className="lx-input-wrap">
                      <GraduationCap size={14} className="lx-input-icon"/>
                      <select value={newLect.departmentId} onChange={setNSelect('departmentId')}>
                        <option value="">— Select Department —</option>
                        {departments.map((d:any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {user?.role === 'SUPER_ADMIN' && (
                    <div style={{marginTop:20}}>
                      <div className="lx-section-label">
                        <Shield size={13}/>
                        <span>Additional Departments</span>
                        <span className="lx-super-badge">Super Admin</span>
                      </div>
                      <p className="lx-hint-text">This lecturer will be visible to HODs of every selected department.</p>
                      <div className="lx-dept-chips">
                        {departments.filter((d:any) => d.id.toString() !== newLect.departmentId?.toString()).map((d:any) => {
                          const sel = newLect.secondaryDepartmentIds.includes(d.id);
                          return (
                            <button type="button" key={d.id} className={`lx-chip ${sel?'lx-chip-on':''}`}
                              onClick={() => toggleSecondaryDept(d.id, true, false)}>
                              {sel && <CheckCircle2 size={13}/>}
                              {d.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="lx-modal-footer">
                  <button type="button" className="lx-btn-ghost" onClick={() => setAddModal(false)}>Cancel</button>
                  <button type="submit" className="lx-btn-primary lx-btn-enroll" disabled={saving}>
                    {saving ? <Loader2 size={14} className="spin-ico"/> : <UserPlus size={14}/>}
                    {saving ? 'Enrolling...' : 'Confirm Enrollment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Outfit:wght@400;500;600;700;800;900&display=swap');

        /* ── Page layout ───────────────────────────────────────── */
        .registry-compact-header { display:flex; justify-content:space-between; align-items:center; background:#fff; padding:15px 25px; border-radius:15px; margin-bottom:25px; border:1px solid #f1f5f9; }
        .compact-stats { display:flex; align-items:center; gap:20px; }
        .stat-node { display:flex; flex-direction:column; }
        .stat-node .l { font-size:9px; font-weight:800; color:#94a3b8; text-transform:uppercase; }
        .stat-node .v { font-size:16px; font-weight:900; color:#1e293b; }
        .stat-node .v.secure { color:#f59e0b; }
        .stat-sep { width:1px; height:24px; background:#f1f5f9; }
        .compact-actions { display:flex; align-items:center; gap:15px; }
        .mini-search { height:36px; width:240px; background:#f8fafc; border-radius:10px; display:flex; align-items:center; gap:8px; padding:0 12px; border:1px solid #f1f5f9; }
        .mini-search input { background:none; border:none; outline:none; font-size:11px; font-weight:600; color:#475569; width:100%; }
        .add-p-btn { height:38px; padding:0 20px; background:linear-gradient(135deg,#6366f1,#4f46e5); color:#fff; border:none; border-radius:11px; display:flex; align-items:center; gap:8px; font-size:12px; font-weight:700; cursor:pointer; transition:0.2s; box-shadow:0 4px 14px rgba(99,102,241,0.3); }
        .add-p-btn:hover { transform:translateY(-2px); box-shadow:0 8px 20px rgba(99,102,241,0.4); }

        .reg-row-premium { background:#fff; border-radius:15px; padding:10px 25px; display:grid; grid-template-columns:60px 1fr 120px 100px; gap:15px; align-items:center; border:1px solid #f1f5f9; margin-bottom:8px; transition:0.2s; }
        .reg-row-premium:hover { border-color:#e2e8f0; box-shadow:0 4px 20px rgba(0,0,0,0.04); transform:translateY(-1px); }
        .s-avatar-gold { width:38px; height:38px; border-radius:10px; background:linear-gradient(135deg,rgba(245,158,11,0.15),rgba(245,158,11,0.05)); color:#f59e0b; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:12px; border:1px solid rgba(245,158,11,0.2); }
        .reg-col.info .t { margin:0; font-size:14px; font-weight:800; color:#1e293b; }
        .reg-col.info .sub { display:flex; align-items:center; gap:8px; font-size:11px; color:#94a3b8; font-weight:600; margin-top:2px; flex-wrap:wrap; }
        .reg-col.info .sub .dot { width:3px; height:3px; border-radius:50%; background:#cbd5e1; }
        .p-badge { display:flex; align-items:center; gap:5px; font-size:10px; font-weight:800; color:#6366f1; text-transform:uppercase; background:rgba(99,102,241,0.07); padding:4px 10px; border-radius:6px; }
        .reg-col.acts { display:flex; gap:6px; justify-content:flex-end; }
        .a-btn { width:32px; height:32px; border-radius:8px; border:none; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:0.2s; }
        .a-btn.p { background:#eff6ff; color:#2563eb; }
        .a-btn.d { background:#fef2f2; color:#dc2626; }
        .a-btn:hover { filter:brightness(0.95); transform:translateY(-1px); }
        .reg-loader,.reg-empty-state { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:60px 0; color:#94a3b8; gap:12px; }
        .reg-empty-state h5 { margin:0; font-size:16px; font-weight:700; color:#64748b; }
        .reg-empty-state p { margin:0; font-size:13px; }

        /* ── Overlay ───────────────────────────────────────────── */
        .lx-overlay { position:fixed; inset:0; background:rgba(10,14,26,0.65); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); display:flex; align-items:center; justify-content:center; z-index:99999; padding:16px; }

        /* ── Modal shell ───────────────────────────────────────── */
        .lx-modal {
          display:flex; width:100%; max-width:860px; max-height:92vh;
          background:#fff; border-radius:24px;
          box-shadow:0 32px 80px rgba(0,0,0,0.22), 0 0 0 1px rgba(255,255,255,0.06);
          overflow:hidden;
        }

        /* ── Left accent panel ─────────────────────────────────── */
        .lx-modal-aside {
          width:220px; flex-shrink:0;
          background:linear-gradient(160deg,#1e1b4b 0%,#312e81 45%,#4338ca 100%);
          padding:36px 24px; display:flex; flex-direction:column; gap:16px;
          position:relative; overflow:hidden;
        }
        .lx-modal-aside::before {
          content:''; position:absolute; width:200px; height:200px;
          background:rgba(255,255,255,0.04); border-radius:50%;
          top:-60px; right:-60px;
        }
        .lx-modal-aside::after {
          content:''; position:absolute; width:150px; height:150px;
          background:rgba(255,255,255,0.03); border-radius:50%;
          bottom:-40px; left:-40px;
        }
        .lx-modal-aside-enroll { background:linear-gradient(160deg,#064e3b 0%,#065f46 45%,#047857 100%); }
        .lx-modal-aside-avatar {
          width:60px; height:60px; border-radius:16px;
          background:rgba(255,255,255,0.15); backdrop-filter:blur(4px);
          border:2px solid rgba(255,255,255,0.2);
          display:flex; align-items:center; justify-content:center;
          font-size:20px; font-weight:900; color:#fff; letter-spacing:1px;
          position:relative; z-index:1;
        }
        .lx-modal-aside-icon-wrap {
          width:60px; height:60px; border-radius:16px;
          background:rgba(255,255,255,0.15); backdrop-filter:blur(4px);
          border:2px solid rgba(255,255,255,0.2);
          display:flex; align-items:center; justify-content:center;
          position:relative; z-index:1;
        }
        .lx-modal-aside-title { margin:0; font-size:18px; font-weight:800; color:#fff; position:relative; z-index:1; }
        .lx-modal-aside-sub { margin:0; font-size:12px; color:rgba(255,255,255,0.65); line-height:1.6; position:relative; z-index:1; }
        .lx-modal-aside-steps { display:flex; flex-direction:column; gap:10px; margin-top:8px; position:relative; z-index:1; }
        .lx-step { display:flex; align-items:center; gap:10px; font-size:11px; font-weight:600; color:rgba(255,255,255,0.55); }
        .lx-step.active { color:rgba(255,255,255,0.9); }
        .lx-step-dot { width:7px; height:7px; border-radius:50%; background:rgba(255,255,255,0.3); flex-shrink:0; }
        .lx-step.active .lx-step-dot { background:#fff; box-shadow:0 0 8px rgba(255,255,255,0.6); }
        .lx-aside-notice {
          margin-top:auto; display:flex; align-items:flex-start; gap:8px;
          background:rgba(0,0,0,0.2); border-radius:10px; padding:10px 12px;
          font-size:11px; color:rgba(255,255,255,0.7); line-height:1.5;
          position:relative; z-index:1;
        }
        .lx-aside-notice svg { flex-shrink:0; margin-top:2px; }

        /* ── Right body panel ──────────────────────────────────── */
        .lx-modal-body { flex:1; display:flex; flex-direction:column; min-width:0; overflow:hidden; }

        .lx-modal-top-bar {
          display:flex; align-items:flex-start; justify-content:space-between;
          padding:24px 28px 20px; border-bottom:1px solid #f1f5f9;
          flex-shrink:0;
        }
        .lx-modal-label-tag { margin:0 0 2px; font-size:10px; font-weight:800; color:#a5b4fc; text-transform:uppercase; letter-spacing:0.1em; }
        .lx-modal-heading { margin:0; font-size:20px; font-weight:800; color:#0f172a; }
        .lx-close-btn {
          width:34px; height:34px; border-radius:10px; border:1.5px solid #e2e8f0;
          background:#f8fafc; color:#64748b; display:flex; align-items:center;
          justify-content:center; cursor:pointer; transition:0.2s; flex-shrink:0;
        }
        .lx-close-btn:hover { background:#fee2e2; border-color:#fca5a5; color:#dc2626; }

        /* ── Scrollable form area ──────────────────────────────── */
        .lx-form-scroll { flex:1; overflow-y:auto; padding:24px 28px; }
        .lx-form-scroll::-webkit-scrollbar { width:4px; }
        .lx-form-scroll::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:4px; }

        /* ── Section labels ────────────────────────────────────── */
        .lx-section-label {
          display:flex; align-items:center; gap:8px;
          font-size:10px; font-weight:800; color:#6366f1;
          text-transform:uppercase; letter-spacing:0.1em;
          margin-bottom:14px;
          padding-bottom:8px; border-bottom:1.5px solid #eef2ff;
        }

        /* ── Field grid ────────────────────────────────────────── */
        .lx-field-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        .lx-field { display:flex; flex-direction:column; gap:6px; }
        .lx-field-full { grid-column:1/-1; }
        .lx-field label { font-size:11px; font-weight:700; color:#64748b; }
        .lx-req { color:#f43f5e; }

        /* ── Inputs ────────────────────────────────────────────── */
        .lx-input-wrap {
          display:flex; align-items:center; gap:10px;
          background:#f8fafc; border:1.5px solid #e2e8f0; border-radius:12px;
          padding:0 14px; transition:0.2s;
        }
        .lx-input-wrap:focus-within { background:#fff; border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,0.1); }
        .lx-input-accent:focus-within { border-color:#8b5cf6; box-shadow:0 0 0 3px rgba(139,92,246,0.1); }
        .lx-input-icon { color:#94a3b8; flex-shrink:0; }
        .lx-input-wrap input, .lx-input-wrap select {
          flex:1; background:none; border:none; outline:none;
          font-size:13px; font-weight:600; color:#0f172a;
          padding:12px 0; font-family:inherit;
          min-width:0;
        }
        .lx-input-wrap select { cursor:pointer; }
        .lx-input-wrap input::placeholder { color:#cbd5e1; font-weight:500; }
        .lx-input-accent .lx-input-icon { color:#8b5cf6; }
        .lx-input-accent input { color:#6d28d9; font-weight:700; }

        /* ── Dept chips ────────────────────────────────────────── */
        .lx-hint-text { font-size:11px; color:#94a3b8; margin:4px 0 12px; line-height:1.5; }
        .lx-dept-chips { display:flex; flex-wrap:wrap; gap:8px; }
        .lx-chip {
          display:inline-flex; align-items:center; gap:6px;
          padding:7px 14px; border-radius:50px;
          border:1.5px solid #e2e8f0; background:#f8fafc;
          font-size:12px; font-weight:600; color:#475569;
          cursor:pointer; transition:all 0.18s; white-space:nowrap;
          font-family:inherit;
        }
        .lx-chip:hover { border-color:#a5b4fc; background:#eef2ff; color:#4f46e5; }
        .lx-chip-on { border-color:#6366f1; background:linear-gradient(135deg,rgba(99,102,241,0.1),rgba(79,70,229,0.06)); color:#4338ca; font-weight:700; }
        .lx-chip-on svg { color:#6366f1; }

        /* ── Super admin badge ─────────────────────────────────── */
        .lx-super-badge {
          background:linear-gradient(135deg,#7c3aed,#4f46e5);
          color:#fff; font-size:8px; font-weight:800; padding:3px 8px;
          border-radius:50px; text-transform:uppercase; letter-spacing:0.08em;
        }

        /* ── Footer ────────────────────────────────────────────── */
        .lx-modal-footer {
          display:flex; align-items:center; justify-content:flex-end; gap:10px;
          padding:16px 28px; border-top:1px solid #f1f5f9; flex-shrink:0;
          background:#fcfdfe;
        }
        .lx-btn-ghost {
          height:40px; padding:0 20px; background:none; border:1.5px solid #e2e8f0;
          border-radius:11px; font-size:13px; font-weight:600; color:#64748b;
          cursor:pointer; transition:0.2s; font-family:inherit;
        }
        .lx-btn-ghost:hover { background:#f1f5f9; color:#1e293b; }
        .lx-btn-primary {
          height:40px; padding:0 22px;
          background:linear-gradient(135deg,#6366f1,#4f46e5);
          color:#fff; border:none; border-radius:11px;
          font-size:13px; font-weight:700; cursor:pointer;
          display:flex; align-items:center; gap:8px; transition:0.2s;
          box-shadow:0 4px 14px rgba(99,102,241,0.35); font-family:inherit;
        }
        .lx-btn-primary:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 8px 20px rgba(99,102,241,0.45); }
        .lx-btn-primary:disabled { opacity:0.6; cursor:not-allowed; }
        .lx-btn-enroll { background:linear-gradient(135deg,#059669,#047857); box-shadow:0 4px 14px rgba(5,150,105,0.35); }
        .lx-btn-enroll:hover:not(:disabled) { box-shadow:0 8px 20px rgba(5,150,105,0.45); }

        /* ── Animations ────────────────────────────────────────── */
        .animate-lx-in { animation:lxIn 0.28s cubic-bezier(0.34,1.56,0.64,1) both; }
        @keyframes lxIn { from { opacity:0; transform:scale(0.94) translateY(12px); } to { opacity:1; transform:scale(1) translateY(0); } }
        .spin-ico { animation:spin 0.9s linear infinite; }
        @keyframes spin { to { transform:rotate(360deg); } }

        /* ── Responsive ────────────────────────────────────────── */
        @media (max-width:900px) {
          .registry-compact-header { flex-direction:column; align-items:stretch; gap:14px; padding:14px 18px; }
          .compact-stats { justify-content:center; }
          .compact-actions { flex-direction:column; align-items:stretch; }
          .mini-search { width:100%; }
          .reg-row-premium { grid-template-columns:48px 1fr 80px; gap:10px; padding:10px 14px; }
          .reg-col.acts { grid-column:3; grid-row:1; justify-content:flex-end; }
          .lx-modal { max-width:100%; border-radius:20px; }
          .lx-modal-aside { width:180px; padding:28px 18px; }
          .lx-modal-aside-title { font-size:15px; }
        }
        @media (max-width:680px) {
          .lx-overlay { padding:0; align-items:flex-end; }
          .lx-modal { flex-direction:column; border-radius:24px 24px 0 0; max-height:96vh; }
          .lx-modal-aside {
            width:auto; flex-direction:row; gap:14px; padding:20px 20px;
            align-items:center; flex-shrink:0;
          }
          .lx-modal-aside::before, .lx-modal-aside::after { display:none; }
          .lx-modal-aside-steps { display:none; }
          .lx-aside-notice { display:none; }
          .lx-modal-aside-title { font-size:16px; margin:0; }
          .lx-modal-aside-sub { display:none; }
          .lx-modal-aside-avatar, .lx-modal-aside-icon-wrap { width:44px; height:44px; border-radius:12px; font-size:16px; flex-shrink:0; }
          .lx-modal-top-bar { padding:16px 20px 14px; }
          .lx-modal-heading { font-size:17px; }
          .lx-form-scroll { padding:16px 20px; }
          .lx-field-grid { grid-template-columns:1fr; }
          .lx-modal-footer { padding:12px 20px; }
          .reg-row-premium { grid-template-columns:1fr; position:relative; padding:12px 14px; gap:6px; }
          .reg-col.id-badge { display:none; }
          .reg-col.status { position:absolute; top:12px; right:14px; }
          .reg-col.acts { justify-content:flex-start; margin-top:4px; }
        }
        @media (max-width:400px) {
          .lx-dept-chips { gap:6px; }
          .lx-chip { font-size:11px; padding:6px 11px; }
          .lx-modal-footer { flex-direction:column; gap:8px; }
          .lx-btn-ghost, .lx-btn-primary { width:100%; justify-content:center; }
        }
      `}</style>
    </div>
  );
}
