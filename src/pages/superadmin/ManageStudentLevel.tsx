import { useState, useEffect } from 'react';
import { saGetAllStudents, saSetStudentSemester, saGetPrograms, moveStudentClass } from '../../api/endpoints';
import toast from 'react-hot-toast';
import { Search, GraduationCap, BookOpen, RefreshCw, ChevronDown, Save, Users } from 'lucide-react';
import { defaultLevels, periodsPerLevel, tx, isSchoolMode } from '../../utils/terms';

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
  semestersPerLevel: Record<number, number>;
}

const card = {
  background: 'var(--sx-card)',
  border: '1px solid var(--sx-card-line)',
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
  /** Schools edit the class (programmeId) instead of the level: a class is one year. */
  const [edits, setEdits] = useState<{ [id: number]: { currentSemester: number; currentLevel: number; programId?: number } }>({});
  const school = isSchoolMode();

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

  const getEdit = (s: Student) => edits[s.id] || { currentSemester: s.currentSemester || 1, currentLevel: s.currentLevel || defaultLevels()[0], programId: s.programId };
  const setEdit = (id: number, field: string, val: number) =>
    setEdits(prev => ({ ...prev, [id]: { ...getEdit(students.find(s => s.id === id)!), [field]: val } }));

  const getLevels = (programId: number): number[] => {
    const prog = programs.find(p => p.id === programId);
    return prog?.configuredLevels || defaultLevels();
  };

  const handleSave = async (student: Student) => {
    const edit = getEdit(student);
    setSaving(student.id);
    try {
      const movedClass = school && edit.programId && edit.programId !== student.programId;
      // A new class starts at its first term; the term chosen here is set right after
      if (movedClass) await moveStudentClass(student.id, { programId: edit.programId, override: true });
      const level = movedClass ? (programs.find(p => p.id === edit.programId)?.configuredLevels?.[0] ?? 1) : edit.currentLevel;
      await saSetStudentSemester(student.id, { currentSemester: edit.currentSemester, currentLevel: level });
      toast.success(`Updated ${student.firstname} ${student.lastname}`);
      setStudents(prev => prev.map(s => s.id === student.id
        ? { ...s, currentSemester: edit.currentSemester, currentLevel: level, ...(movedClass ? { programId: edit.programId!, program: programs.find(p => p.id === edit.programId)?.name ?? s.program } : {}) } : s));
      setEdits(prev => { const n = { ...prev }; delete n[student.id]; return n; });
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? tx('Failed to update student'));
    } finally {
      setSaving(null);
    }
  };

  const filtered = students.filter(s => {
    if (programFilter && s.programId !== Number(programFilter)) return false;
    return `${s.firstname} ${s.lastname} ${s.username} ${s.email} ${s.program}`.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div style={{ color: 'var(--sx-ink)' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GraduationCap size={20} color="var(--brand-contrast)" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>{tx("Student Semester Management")}</h1>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--sx-muted)' }}>{school ? "Set each student's class and term" : 'Set current level & semester for each student'}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ ...card, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Search size={18} color="rgba(var(--accent-rgb), 0.7)" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder={tx("Search by name, ID, email or program…")}
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--sx-ink)', fontSize: 14 }}
        />
        <select value={programFilter} onChange={e => setProgramFilter(e.target.value)}
          style={{ background: 'var(--sx-fill)', border: '1px solid rgba(var(--accent-rgb), 0.3)', borderRadius: 8, padding: '6px 12px', color: 'var(--sx-ink)', outline: 'none' }}>
          <option value="" style={{ background: 'var(--sx-option)' }}>{tx("All Programs")}</option>
          {programs.map(p => <option key={p.id} value={p.id} style={{ background: 'var(--sx-option)' }}>{p.name}</option>)}
        </select>
        <button onClick={loadData} style={{ background: 'rgba(var(--accent-rgb), 0.1)', border: '1px solid rgba(var(--accent-rgb), 0.25)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: 'var(--sx-accent-text)' }}>
          <RefreshCw size={15} />
        </button>
        <span style={{ fontSize: 12, color: 'var(--sx-muted)' }}>{filtered.length} {tx("students")}</span>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--sx-muted)' }}>
          <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: 12, color: 'var(--sx-accent-text)' }} />
          <p>{tx("Loading students…")}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 60 }}>
          <Users size={40} style={{ color: 'rgba(var(--accent-rgb), 0.3)', marginBottom: 12 }} />
          <p style={{ color: 'var(--sx-muted)' }}>{tx("No students found.")}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(student => {
            const edit = getEdit(student);
            const levels = getLevels(student.programId);
            const isDirty = edits[student.id] !== undefined;
            return (
              <div key={student.id} className="sml-row" style={{
                ...card,
                border: isDirty ? '1px solid rgba(var(--accent-rgb), 0.4)' : '1px solid rgba(var(--accent-rgb), 0.12)',
                transition: 'all 0.2s',
              }}>
                {/* Student info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%',
                    background: 'var(--brand)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, color: 'var(--brand-contrast)', flexShrink: 0,
                  }}>{student.firstname?.[0]?.toUpperCase() || 'S'}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{student.firstname} {student.lastname}</div>
                    <div style={{ fontSize: 11, color: 'var(--sx-muted)' }}>{student.username} · {student.program || tx('No Program')}</div>
                  </div>
                </div>

                {/* Level selector (schools: the class) */}
                {school ? (
                <div>
                  <label style={{ fontSize: 10, color: 'var(--sx-muted)', display: 'block', marginBottom: 4 }}>{tx("PROGRAM")}</label>
                  <select
                    value={edit.programId ?? ''}
                    onChange={e => setEdit(student.id, 'programId', Number(e.target.value))}
                    style={{
                      width: '100%', padding: '7px 10px', borderRadius: 8,
                      background: 'var(--sx-fill)', border: '1px solid rgba(var(--accent-rgb), 0.25)',
                      color: 'var(--sx-ink)', fontSize: 13, cursor: 'pointer', outline: 'none',
                    }}
                  >
                    {!edit.programId && <option value="" style={{ background: 'var(--sx-option)' }}>Choose…</option>}
                    {programs.map(p => <option key={p.id} value={p.id} style={{ background: 'var(--sx-option)' }}>{p.name}</option>)}
                  </select>
                </div>
                ) : (
                <div>
                  <label style={{ fontSize: 10, color: 'var(--sx-muted)', display: 'block', marginBottom: 4 }}>{tx("LEVEL")}</label>
                  <select
                    value={edit.currentLevel}
                    onChange={e => setEdit(student.id, 'currentLevel', Number(e.target.value))}
                    style={{
                      width: '100%', padding: '7px 10px', borderRadius: 8,
                      background: 'var(--sx-fill)', border: '1px solid rgba(var(--accent-rgb), 0.25)',
                      color: 'var(--sx-ink)', fontSize: 13, cursor: 'pointer', outline: 'none',
                    }}
                  >
                    {levels.map(l => <option key={l} value={l} style={{ background: 'var(--sx-option)' }}>{tx("Level ")}{l}</option>)}
                  </select>
                </div>
                )}

                {/* Semester selector */}
                <div>
                  <label style={{ fontSize: 10, color: 'var(--sx-muted)', display: 'block', marginBottom: 4 }}>{tx("SEMESTER")}</label>
                  <select
                    value={edit.currentSemester}
                    onChange={e => setEdit(student.id, 'currentSemester', Number(e.target.value))}
                    style={{
                      width: '100%', padding: '7px 10px', borderRadius: 8,
                      background: 'var(--sx-fill)', border: '1px solid rgba(var(--accent-rgb), 0.25)',
                      color: 'var(--sx-ink)', fontSize: 13, cursor: 'pointer', outline: 'none',
                    }}
                  >
                    {Array.from({ length: (school
                      ? Object.values(programs.find(p => p.id === (edit.programId ?? student.programId))?.semestersPerLevel ?? {})[0]
                      : programs.find(p => p.id === student.programId)?.semestersPerLevel?.[edit.currentLevel]) || periodsPerLevel() }, (_, i) => i + 1).map(sem => (
                      <option key={sem} value={sem} style={{ background: 'var(--sx-option)' }}>{tx("Semester ")}{sem}</option>
                    ))}
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
                    background: isDirty ? 'var(--brand)' : 'var(--sx-fill)',
                    color: isDirty ? 'var(--brand-contrast)' : 'var(--sx-faint)',
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

      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        .sml-row{display:grid;grid-template-columns:1fr 160px 160px 110px;align-items:center;gap:16px}
        @media(max-width:900px){
          .sml-row{grid-template-columns:1fr 1fr}
          .sml-row>:first-child{grid-column:1/-1}
          .sml-row>:last-child{grid-column:1/-1}
        }
        @media(max-width:480px){
          .sml-row{grid-template-columns:1fr}
          .sml-row>*{grid-column:auto}
        }
      `}</style>
    </div>
  );
}
