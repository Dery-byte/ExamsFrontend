import { useState, useEffect } from 'react';
import { saGetAllStudents, saSetStudentSemester, saGetPrograms } from '../../api/endpoints';
import toast from 'react-hot-toast';
import { Search, GraduationCap, BookOpen, RefreshCw, ChevronDown, Save, Users } from 'lucide-react';

interface Student {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  username: string;
  phone: string;
  program: string;
  programId: number;
  currentLevel: number;
  currentSemester: number;
}

interface Program {
  id: number;
  name: string;
  configuredLevels: number[];
}

const card = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(139,92,246,0.15)',
  borderRadius: 14,
  padding: '20px',
  backdropFilter: 'blur(12px)',
};

export default function ManageStudentLevel() {
  const [students, setStudents] = useState<Student[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [search, setSearch] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [edits, setEdits] = useState<{ [id: number]: { currentSemester: number; currentLevel: number } }>({});

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [stds, progs] = await Promise.all([saGetAllStudents(), saGetPrograms()]);
      setStudents(Array.isArray(stds) ? stds : []);
      setPrograms(Array.isArray(progs) ? progs : []);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getEdit = (s: Student) => edits[s.id] || { currentSemester: s.currentSemester || 1, currentLevel: s.currentLevel || 100 };
  const setEdit = (id: number, field: string, val: number) =>
    setEdits(prev => ({ ...prev, [id]: { ...getEdit(students.find(s => s.id === id)!), [field]: val } }));

  const getLevels = (programId: number): number[] => {
    const prog = programs.find(p => p.id === programId);
    return prog?.configuredLevels || [100, 200, 300, 400];
  };

  const handleSave = async (student: Student) => {
    const edit = getEdit(student);
    setSaving(student.id);
    try {
      await saSetStudentSemester(student.id, { currentSemester: edit.currentSemester, currentLevel: edit.currentLevel });
      toast.success(`Updated ${student.firstname} ${student.lastname}`);
      setStudents(prev => prev.map(s => s.id === student.id
        ? { ...s, currentSemester: edit.currentSemester, currentLevel: edit.currentLevel } : s));
      setEdits(prev => { const n = { ...prev }; delete n[student.id]; return n; });
    } catch {
      toast.error('Failed to update student');
    } finally {
      setSaving(null);
    }
  };

  const filtered = students.filter(s => {
    if (programFilter && s.programId !== Number(programFilter)) return false;
    return `${s.firstname} ${s.lastname} ${s.username} ${s.email} ${s.program}`.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div style={{ color: '#fff' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GraduationCap size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Student Semester Management</h1>
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Set current level & semester for each student</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ ...card, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Search size={18} color="rgba(139,92,246,0.7)" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, ID, email or program…"
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 14 }}
        />
        <select value={programFilter} onChange={e => setProgramFilter(e.target.value)}
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 8, padding: '6px 12px', color: '#fff', outline: 'none' }}>
          <option value="" style={{ background: '#1a1a35' }}>All Programs</option>
          {programs.map(p => <option key={p.id} value={p.id} style={{ background: '#1a1a35' }}>{p.name}</option>)}
        </select>
        <button onClick={loadData} style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#a78bfa' }}>
          <RefreshCw size={15} />
        </button>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{filtered.length} students</span>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.4)' }}>
          <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: 12, color: '#a78bfa' }} />
          <p>Loading students…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 60 }}>
          <Users size={40} style={{ color: 'rgba(139,92,246,0.3)', marginBottom: 12 }} />
          <p style={{ color: 'rgba(255,255,255,0.4)' }}>No students found.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(student => {
            const edit = getEdit(student);
            const levels = getLevels(student.programId);
            const isDirty = edits[student.id] !== undefined;
            return (
              <div key={student.id} style={{
                ...card,
                display: 'grid',
                gridTemplateColumns: '1fr 180px 180px 120px',
                alignItems: 'center', gap: 16,
                border: isDirty ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(139,92,246,0.12)',
                transition: 'all 0.2s',
              }}>
                {/* Student info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%',
                    background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0,
                  }}>{student.firstname?.[0]?.toUpperCase() || 'S'}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{student.firstname} {student.lastname}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{student.username} · {student.program || 'No Program'}</div>
                  </div>
                </div>

                {/* Level selector */}
                <div>
                  <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>LEVEL</label>
                  <select
                    value={edit.currentLevel}
                    onChange={e => setEdit(student.id, 'currentLevel', Number(e.target.value))}
                    style={{
                      width: '100%', padding: '7px 10px', borderRadius: 8,
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(139,92,246,0.25)',
                      color: '#fff', fontSize: 13, cursor: 'pointer', outline: 'none',
                    }}
                  >
                    {levels.map(l => <option key={l} value={l} style={{ background: '#1a1a35' }}>Level {l}</option>)}
                  </select>
                </div>

                {/* Semester selector */}
                <div>
                  <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>SEMESTER</label>
                  <select
                    value={edit.currentSemester}
                    onChange={e => setEdit(student.id, 'currentSemester', Number(e.target.value))}
                    style={{
                      width: '100%', padding: '7px 10px', borderRadius: 8,
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(139,92,246,0.25)',
                      color: '#fff', fontSize: 13, cursor: 'pointer', outline: 'none',
                    }}
                  >
                    <option value={1} style={{ background: '#1a1a35' }}>Semester 1</option>
                    <option value={2} style={{ background: '#1a1a35' }}>Semester 2</option>
                  </select>
                </div>

                {/* Save button */}
                <button
                  onClick={() => handleSave(student)}
                  disabled={saving === student.id || !isDirty}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '8px 14px', borderRadius: 8, cursor: isDirty ? 'pointer' : 'default',
                    border: 'none', fontSize: 13, fontWeight: 600,
                    background: isDirty ? 'linear-gradient(135deg,#7c3aed,#4f46e5)' : 'rgba(255,255,255,0.05)',
                    color: isDirty ? '#fff' : 'rgba(255,255,255,0.25)',
                    transition: 'all 0.2s',
                    opacity: saving === student.id ? 0.6 : 1,
                  }}
                >
                  <Save size={14} />
                  {saving === student.id ? 'Saving…' : 'Save'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
