import { useState, useEffect } from 'react';
import { saGetPrograms, saGetDepartments, saCreateProgram, saUpdateProgram, saDeleteProgram } from '../../api/endpoints';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { BookMarked, Plus, Pencil, Trash2, X, Save, Calendar, Building2 } from 'lucide-react';

interface Program { id: number; name: string; code: string; durationYears: number; departmentId: number; departmentName: string; configuredLevels: number[]; }
interface Department { id: number; name: string; code: string; }
interface FormState { name: string; code: string; durationYears: number; departmentId: number | ''; }

const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', borderRadius: 9, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(139,92,246,0.25)', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 };

const levelColors = ['#7c3aed','#4f46e5','#0ea5e9','#10b981','#f59e0b','#ef4444','#ec4899','#8b5cf6','#06b6d4','#84cc16'];

export default function Programs() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDept, setFilterDept] = useState<number | 'all'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>({ name: '', code: '', durationYears: 4, departmentId: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [p, d] = await Promise.all([saGetPrograms(), saGetDepartments()]);
      setPrograms(Array.isArray(p) ? p : []);
      setDepartments(Array.isArray(d) ? d : []);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const openCreate = () => { setForm({ name: '', code: '', durationYears: 4, departmentId: departments[0]?.id || '' }); setMode('create'); setEditId(null); setModalOpen(true); };
  const openEdit = (p: Program) => { setForm({ name: p.name, code: p.code, durationYears: p.durationYears, departmentId: p.departmentId }); setMode('edit'); setEditId(p.id); setModalOpen(true); };

  const previewLevels = Array.from({ length: form.durationYears }, (_, i) => (i + 1) * 100);

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim() || !form.departmentId) { toast.error('All fields are required.'); return; }
    setSaving(true);
    try {
      const payload = { name: form.name, code: form.code.toUpperCase(), durationYears: form.durationYears, departmentId: form.departmentId };
      if (mode === 'create') {
        const created = await saCreateProgram(payload);
        setPrograms(prev => [...prev, created]);
        toast.success('Program created!');
      } else {
        const updated = await saUpdateProgram(editId!, payload);
        setPrograms(prev => prev.map(p => p.id === editId ? updated : p));
        toast.success('Program updated!');
      }
      setModalOpen(false);
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Operation failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (p: Program) => {
    const res = await Swal.fire({ title: `Delete "${p.name}"?`, text: 'This will remove the program and all its level configurations.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Delete', confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280', background: '#1a1a35', color: '#fff' });
    if (!res.isConfirmed) return;
    try { await saDeleteProgram(p.id); setPrograms(prev => prev.filter(x => x.id !== p.id)); toast.success('Deleted.'); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Delete failed'); }
  };

  const filtered = filterDept === 'all' ? programs : programs.filter(p => p.departmentId === filterDept);

  return (
    <div style={{ color: '#fff' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#0ea5e9,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookMarked size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Programs & Levels</h1>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Configure academic programs and their level structure</p>
          </div>
        </div>
        <button onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, background: 'linear-gradient(135deg,#0ea5e9,#2563eb)', border: 'none', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 14px rgba(14,165,233,0.3)' }}>
          <Plus size={17} /> Add Program
        </button>
      </div>

      {/* Filter */}
      <div style={{ marginBottom: 20 }}>
        <select value={filterDept} onChange={e => setFilterDept(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          style={{ ...inputStyle, width: 'auto', minWidth: 220 }}>
          <option value="all" style={{ background: '#1a1a35' }}>All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id} style={{ background: '#1a1a35' }}>{d.name}</option>)}
        </select>
      </div>

      {/* Cards */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 180, borderRadius: 14, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s infinite' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: 16, border: '1px dashed rgba(139,92,246,0.2)' }}>
          <BookMarked size={48} style={{ color: 'rgba(139,92,246,0.3)', marginBottom: 16 }} />
          <h3 style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>No programs yet</h3>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
          {filtered.map(p => (
            <div key={p.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(14,165,233,0.15)', borderRadius: 14, padding: '20px', backdropFilter: 'blur(12px)', transition: 'all 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(14,165,233,0.35)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(14,165,233,0.15)'; (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{p.name}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.3)', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700, color: '#38bdf8' }}>{p.code}</span>
                    <span style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 6, padding: '2px 8px', fontSize: 11, color: '#a78bfa', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Building2 size={10} />{p.departmentName}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => openEdit(p)} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Pencil size={13} /></button>
                  <button onClick={() => handleDelete(p)} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={13} /></button>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <Calendar size={13} style={{ color: 'rgba(255,255,255,0.4)' }} />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{p.durationYears} Year{p.durationYears > 1 ? 's' : ''} Programme</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {p.configuredLevels?.map((lv, i) => (
                  <span key={lv} style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: `${levelColors[i % levelColors.length]}22`, border: `1px solid ${levelColors[i % levelColors.length]}44`, color: levelColors[i % levelColors.length] }}>
                    Level {lv}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'linear-gradient(145deg,#1a1a35,#12122a)', border: '1px solid rgba(14,165,233,0.3)', borderRadius: 18, padding: '28px', width: '100%', maxWidth: 480, boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{mode === 'create' ? 'New Program' : 'Edit Program'}</h2>
              <button onClick={() => setModalOpen(false)} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#fff' }}><X size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div><label style={labelStyle}>Program Name *</label><input style={inputStyle} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Computer Science BS" /></div>
              <div><label style={labelStyle}>Program Code *</label><input style={inputStyle} value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="e.g. CS" maxLength={10} /></div>
              <div>
                <label style={labelStyle}>Department *</label>
                <select style={inputStyle} value={form.departmentId} onChange={e => setForm(p => ({ ...p, departmentId: Number(e.target.value) }))}>
                  <option value="" style={{ background: '#1a1a35' }}>Select department…</option>
                  {departments.map(d => <option key={d.id} value={d.id} style={{ background: '#1a1a35' }}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Duration (Years) *</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button onClick={() => setForm(p => ({ ...p, durationYears: Math.max(1, p.durationYears - 1) }))} style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                  <span style={{ fontSize: 22, fontWeight: 700, color: '#38bdf8', minWidth: 30, textAlign: 'center' }}>{form.durationYears}</span>
                  <button onClick={() => setForm(p => ({ ...p, durationYears: Math.min(10, p.durationYears + 1) }))} style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>year{form.durationYears > 1 ? 's' : ''}</span>
                </div>
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Generated Levels:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {previewLevels.map((lv, i) => (
                      <span key={lv} style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: `${levelColors[i % levelColors.length]}22`, border: `1px solid ${levelColors[i % levelColors.length]}44`, color: levelColors[i % levelColors.length] }}>
                        Level {lv}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button onClick={() => setModalOpen(false)} style={{ padding: '9px 20px', borderRadius: 9, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
                <button onClick={handleSave} disabled={saving} style={{ padding: '9px 20px', borderRadius: 9, background: 'linear-gradient(135deg,#0ea5e9,#2563eb)', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7, opacity: saving ? 0.7 : 1 }}>
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
