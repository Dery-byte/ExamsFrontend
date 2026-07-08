import { useState, useEffect } from 'react';
import { saGetAllHods, saCreateHod, saUpdateHod, saDeleteHod, saGetDepartments } from '../../api/endpoints';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { UserCog, Plus, Trash2, Edit2, Eye, EyeOff, Building2, Mail, Phone, User, Key, X } from 'lucide-react';

interface Hod { id: number; firstname: string; lastname: string; email: string; username: string; phone: string; departmentId?: number; }
interface Department { id: number; name: string; code: string; }

const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', borderRadius: 9, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(139,92,246,0.2)', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 };
const iconInput = (icon: React.ReactNode, input: React.ReactNode) => (
  <div style={{ position: 'relative' }}>
    <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(139,92,246,0.6)', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>{icon}</div>
    <div style={{ paddingLeft: 36 }}>{input}</div>
  </div>
);

export default function ManageHODs() {
  const [hods, setHods] = useState<Hod[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ firstname: '', lastname: '', email: '', phone: '', username: '', password: '', departmentId: '' });
  const [editingHod, setEditingHod] = useState<Hod | null>(null);
  const [editForm, setEditForm] = useState({ firstname: '', lastname: '', email: '', phone: '', username: '', password: '', departmentId: '' });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [h, d] = await Promise.all([saGetAllHods(), saGetDepartments()]);
      setHods(Array.isArray(h) ? h : []);
      setDepartments(Array.isArray(d) ? d : []);
      if (Array.isArray(d) && d.length > 0 && !form.departmentId) setForm(p => ({ ...p, departmentId: String(d[0].id) }));
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstname || !form.lastname || !form.email || !form.username || !form.password || !form.departmentId) {
      toast.error('All fields are required.'); return;
    }
    setSaving(true);
    try {
      await saCreateHod({ ...form, departmentId: Number(form.departmentId) });
      toast.success(`HOD account created for ${form.firstname} ${form.lastname}`);
      setForm({ firstname: '', lastname: '', email: '', phone: '', username: '', password: '', departmentId: String(departments[0]?.id || '') });
      await load();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to create HOD'); }
    finally { setSaving(false); }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHod) return;
    if (!editForm.firstname || !editForm.lastname || !editForm.email || !editForm.username || !editForm.departmentId) {
      toast.error('Required fields missing.'); return;
    }
    setSaving(true);
    try {
      const payload: any = { ...editForm, departmentId: Number(editForm.departmentId) };
      if (!payload.password) delete payload.password; // Don't send empty password if not changing
      await saUpdateHod(editingHod.id, payload);
      toast.success('HOD account updated.');
      setEditingHod(null);
      await load();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to update HOD'); }
    finally { setSaving(false); }
  };

  const openEdit = (h: Hod) => {
    setEditForm({
      firstname: h.firstname || '', lastname: h.lastname || '',
      email: h.email || '', phone: h.phone || '', username: h.username || '',
      password: '', departmentId: String(h.departmentId || (departments.length > 0 ? departments[0].id : ''))
    });
    setEditingHod(h);
  };

  const handleDelete = async (h: Hod) => {
    const res = await Swal.fire({ title: `Remove HOD "${h.firstname} ${h.lastname}"?`, text: 'The account will be permanently deleted.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Remove', confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280', background: '#1a1a35', color: '#fff' });
    if (!res.isConfirmed) return;
    try { await saDeleteHod(h.id); setHods(prev => prev.filter(x => x.id !== h.id)); toast.success('HOD removed.'); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Delete failed'); }
  };

  const dept = (id: string | number) => departments.find(d => d.id === Number(id));

  return (
    <div style={{ color: '#fff' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <UserCog size={20} color="#fff" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>HOD Accounts</h1>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Manage Head of Department administrator accounts</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
        {/* Create Form */}
        <form onSubmit={handleCreate} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 16, padding: '24px', backdropFilter: 'blur(12px)' }}>
          <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#34d399', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={18} /> Register New HOD
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>First Name *</label>
                {iconInput(<User size={14} />, <input style={inputStyle} value={form.firstname} onChange={e => setForm(p => ({ ...p, firstname: e.target.value }))} placeholder="Jane" />)}
              </div>
              <div>
                <label style={labelStyle}>Last Name *</label>
                {iconInput(<User size={14} />, <input style={inputStyle} value={form.lastname} onChange={e => setForm(p => ({ ...p, lastname: e.target.value }))} placeholder="Doe" />)}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Email *</label>
              {iconInput(<Mail size={14} />, <input style={{ ...inputStyle }} value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="jane.doe@university.edu" type="email" />)}
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              {iconInput(<Phone size={14} />, <input style={inputStyle} value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+1 555 000 0000" />)}
            </div>
            <div>
              <label style={labelStyle}>Staff ID / Username *</label>
              {iconInput(<Key size={14} />, <input style={inputStyle} value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} placeholder="STF-001" />)}
            </div>
            <div>
              <label style={labelStyle}>Password *</label>
              <div style={{ position: 'relative' }}>
                <input style={{ ...inputStyle, paddingRight: 40 }} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} type={showPass ? 'text' : 'password'} placeholder="Strong password" />
                <button type="button" onClick={() => setShowPass(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Department *</label>
              {iconInput(<Building2 size={14} />, (
                <select style={inputStyle} value={form.departmentId} onChange={e => setForm(p => ({ ...p, departmentId: e.target.value }))}>
                  <option value="" style={{ background: '#1a1a35' }}>Select department…</option>
                  {departments.map(d => <option key={d.id} value={d.id} style={{ background: '#1a1a35' }}>{d.name}</option>)}
                </select>
              ))}
            </div>
            <button type="submit" disabled={saving} style={{ width: '100%', padding: '11px', borderRadius: 10, background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <UserCog size={16} />{saving ? 'Creating…' : 'Create HOD Account'}
            </button>
          </div>
        </form>

        {/* HOD List */}
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'rgba(255,255,255,0.7)' }}>
            Existing HODs ({hods.length})
          </h2>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1,2,3].map(i => <div key={i} style={{ height: 72, borderRadius: 12, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s infinite' }} />)}
            </div>
          ) : hods.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: 14, border: '1px dashed rgba(139,92,246,0.2)' }}>
              <UserCog size={36} style={{ color: 'rgba(139,92,246,0.3)', marginBottom: 10 }} />
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>No HOD accounts yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {hods.map(h => (
                <div key={h.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, transition: 'all 0.2s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(16,185,129,0.3)'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(16,185,129,0.15)'}
                >
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {h.firstname?.[0]?.toUpperCase() || 'H'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{h.firstname} {h.lastname}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{h.email} · {h.username}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => openEdit(h)} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', color: '#a78bfa', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => handleDelete(h)} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>`n      </div>`n      `n      {/* Edit Modal */}
      {editingHod && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <form onSubmit={handleUpdate} style={{ background: '#12122a', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 20, padding: 24, width: '90%', maxWidth: 500, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, color: '#a78bfa' }}>Edit HOD Account</h2>
              <button type="button" onClick={() => setEditingHod(null)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={labelStyle}>First Name *</label>{iconInput(<User size={14} />, <input style={inputStyle} value={editForm.firstname} onChange={e => setEditForm(p => ({ ...p, firstname: e.target.value }))} />)}</div>
                <div><label style={labelStyle}>Last Name *</label>{iconInput(<User size={14} />, <input style={inputStyle} value={editForm.lastname} onChange={e => setEditForm(p => ({ ...p, lastname: e.target.value }))} />)}</div>
              </div>
              <div><label style={labelStyle}>Email *</label>{iconInput(<Mail size={14} />, <input style={inputStyle} value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} type="email" />)}</div>
              <div><label style={labelStyle}>Phone</label>{iconInput(<Phone size={14} />, <input style={inputStyle} value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} />)}</div>
              <div><label style={labelStyle}>Staff ID / Username *</label>{iconInput(<Key size={14} />, <input style={inputStyle} value={editForm.username} onChange={e => setEditForm(p => ({ ...p, username: e.target.value }))} />)}</div>
              <div><label style={labelStyle}>Password (leave blank to keep)</label>
                <div style={{ position: 'relative' }}>
                  <input style={{ ...inputStyle, paddingRight: 40 }} value={editForm.password} onChange={e => setEditForm(p => ({ ...p, password: e.target.value }))} type={showPass ? 'text' : 'password'} placeholder="New password..." />
                  <button type="button" onClick={() => setShowPass(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 0 }}>
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div><label style={labelStyle}>Department *</label>
                {iconInput(<Building2 size={14} />, (
                  <select style={inputStyle} value={editForm.departmentId} onChange={e => setEditForm(p => ({ ...p, departmentId: e.target.value }))}>
                    <option value="" style={{ background: '#1a1a35' }}>Select department…</option>
                    {departments.map(d => <option key={d.id} value={d.id} style={{ background: '#1a1a35' }}>{d.name}</option>)}
                  </select>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setEditingHod(null)} style={{ flex: 1, padding: '11px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ flex: 1, padding: '11px', borderRadius: 10, background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  );
}

