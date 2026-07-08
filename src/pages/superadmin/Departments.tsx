import { useState, useEffect } from 'react';
import { saGetDepartments, saCreateDepartment, saUpdateDepartment, saDeleteDepartment } from '../../api/endpoints';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { Building2, Plus, Pencil, Trash2, X, Save, Hash } from 'lucide-react';

interface Department { id: number; name: string; code: string; description: string; }
interface FormState { name: string; code: string; description: string; }

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 9,
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(139,92,246,0.25)',
  color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box',
};
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 };

export default function Departments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>({ name: '', code: '', description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try { setDepartments(await saGetDepartments()); }
    catch { toast.error('Failed to load departments'); }
    finally { setLoading(false); }
  };

  const openCreate = () => { setForm({ name: '', code: '', description: '' }); setMode('create'); setEditId(null); setModalOpen(true); };
  const openEdit = (d: Department) => { setForm({ name: d.name, code: d.code, description: d.description }); setMode('edit'); setEditId(d.id); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) { toast.error('Name and Code are required.'); return; }
    setSaving(true);
    try {
      const payload = { ...form, code: form.code.toUpperCase() };
      if (mode === 'create') {
        const created = await saCreateDepartment(payload);
        setDepartments(prev => [...prev, created]);
        toast.success('Department created!');
      } else {
        const updated = await saUpdateDepartment(editId!, payload);
        setDepartments(prev => prev.map(d => d.id === editId ? updated : d));
        toast.success('Department updated!');
      }
      setModalOpen(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Operation failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async (d: Department) => {
    const res = await Swal.fire({ title: `Delete "${d.name}"?`, text: 'This action cannot be undone.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Delete', confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280', background: '#1a1a35', color: '#fff' });
    if (!res.isConfirmed) return;
    try { await saDeleteDepartment(d.id); setDepartments(prev => prev.filter(x => x.id !== d.id)); toast.success('Deleted.'); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Delete failed'); }
  };

  return (
    <div style={{ color: '#fff' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Departments</h1>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{departments.length} department{departments.length !== 1 ? 's' : ''} configured</p>
          </div>
        </div>
        <button onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', border: 'none', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 14px rgba(124,58,237,0.35)' }}>
          <Plus size={17} /> Add Department
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 140, borderRadius: 14, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s infinite' }} />)}
        </div>
      ) : departments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: 16, border: '1px dashed rgba(139,92,246,0.2)' }}>
          <Building2 size={48} style={{ color: 'rgba(139,92,246,0.3)', marginBottom: 16 }} />
          <h3 style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>No departments yet</h3>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Click "Add Department" to create the first one.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
          {departments.map(d => (
            <div key={d.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 14, padding: '20px', backdropFilter: 'blur(12px)', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(139,92,246,0.35)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(139,92,246,0.15)'; (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{d.name}</div>
                  <span style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.35)', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700, color: '#a78bfa', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Hash size={10} />{d.code}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => openEdit(d)} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Pencil size={13} /></button>
                  <button onClick={() => handleDelete(d)} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={13} /></button>
                </div>
              </div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.5 }}>{d.description || 'No description provided.'}</p>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'linear-gradient(145deg,#1a1a35,#12122a)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 18, padding: '28px', width: '100%', maxWidth: 460, boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{mode === 'create' ? 'New Department' : 'Edit Department'}</h2>
              <button onClick={() => setModalOpen(false)} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#fff' }}><X size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Department Name *</label>
                <input style={inputStyle} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. School of Computing" />
              </div>
              <div>
                <label style={labelStyle}>Department Code *</label>
                <input style={inputStyle} value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="e.g. SOC" maxLength={10} />
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description of this department…" />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button onClick={() => setModalOpen(false)} style={{ padding: '9px 20px', borderRadius: 9, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
                <button onClick={handleSave} disabled={saving} style={{ padding: '9px 20px', borderRadius: 9, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7, opacity: saving ? 0.7 : 1 }}>
                  <Save size={15} />{saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  );
}
