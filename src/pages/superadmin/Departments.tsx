import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { saGetDepartments, saCreateDepartment, saUpdateDepartment, saDeleteDepartment, saReorderDepartments, saGetPrograms } from '../../api/endpoints';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { Building2, Plus, Pencil, Trash2, Save, Hash, Loader2, ChevronUp, ChevronDown, Info, ArrowRight } from 'lucide-react';
import { getMode, isSchoolMode, tx } from '../../utils/terms';
import { StructureModal, STRUCTURE_CSS, sectionPicks, sameName } from './structureUi';

interface Department { id: number; name: string; code: string; description: string; sortOrder?: number | null; durationYears?: number | null; }
interface Program { id: number; name: string; departmentId: number; enabled: boolean; sectionYear?: number | null; }
/** years: how long a school section runs (Primary 6, JHS 3 …). */
interface FormState { name: string; code: string; description: string; years: number; }
const EMPTY: FormState = { name: '', code: '', description: '', years: 1 };

/**
 * Super Admin: departments. In a school these are the sections (Primary School, Junior High School …):
 * a collective name for a group of classes, kept in order so promotion runs from one section into the next.
 */
export default function Departments() {
  const school = isSchoolMode();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [movingId, setMovingId] = useState<number | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [d, p] = await Promise.all([saGetDepartments(), saGetPrograms().catch(() => [])]);
      setDepartments(Array.isArray(d) ? d : []);
      setPrograms(Array.isArray(p) ? p : []);
    }
    catch { toast.error(tx('Failed to load departments')); }
    finally { setLoading(false); }
  };

  const picks = sectionPicks(getMode());
  const taken = (name: string) => departments.some(d => d.id !== editId && sameName(d.name, name));

  const openCreate = () => {
    // Schools: start from the first usual section not added yet
    const first = picks.find(p => !taken(p.name));
    setForm(first && school ? { name: first.name, code: first.code, description: first.description ?? '', years: first.years ?? 1 } : EMPTY);
    setMode('create'); setEditId(null); setModalOpen(true);
  };
  const openEdit = (d: Department) => { setForm({ name: d.name, code: d.code, description: d.description ?? '', years: d.durationYears ?? 1 }); setMode('edit'); setEditId(d.id); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) { toast.error('Name and Code are required.'); return; }
    setSaving(true);
    try {
      const { years, ...rest } = form;
      const payload = { ...rest, name: form.name.trim(), code: form.code.toUpperCase(), ...(school ? { durationYears: years } : {}) };
      if (mode === 'create') {
        const created = await saCreateDepartment(payload);
        setDepartments(prev => [...prev, created]);
        toast.success(tx('Department created!'));
      } else {
        const updated = await saUpdateDepartment(editId!, payload);
        setDepartments(prev => prev.map(d => d.id === editId ? updated : d));
        toast.success(tx('Department updated!'));
      }
      setModalOpen(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Operation failed');
    } finally { setSaving(false); }
  };

  const classesOf = (d: Department) => programs.filter(p => p.departmentId === d.id);

  const handleDelete = async (d: Department) => {
    const n = classesOf(d).length;
    if (n > 0) {
      toast.error(tx(`Move or delete the ${n} program${n === 1 ? '' : 's'} in ${d.name} first.`));
      return;
    }
    const res = await Swal.fire({ title: `Delete "${d.name}"?`, text: 'This action cannot be undone.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Delete', confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280', background: '#1a1a35', color: '#fff' });
    if (!res.isConfirmed) return;
    try { await saDeleteDepartment(d.id); setDepartments(prev => prev.filter(x => x.id !== d.id)); toast.success('Deleted.'); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Delete failed'); }
  };

  const move = async (d: Department, dir: -1 | 1) => {
    const ids = departments.map(x => x.id);
    const i = ids.indexOf(d.id), j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    setMovingId(d.id);
    try { const all = await saReorderDepartments(ids); if (Array.isArray(all)) setDepartments(all); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Could not move it.'); }
    finally { setMovingId(null); }
  };

  return (
    <div className="pg">
      <style>{STRUCTURE_CSS}</style>
      {/* Header */}
      <div className="pg-head">
        <div className="pg-title">
          <div className="pg-logo brand"><Building2 size={20} color="#fff" /></div>
          <div style={{ minWidth: 0 }}>
            <h1 className="pg-h1">{tx('Departments')}</h1>
            <p className="pg-sub">{departments.length} {tx(departments.length !== 1 ? 'departments' : 'department')} configured</p>
          </div>
        </div>
        <button type="button" className="pg-btn brand pg-add" onClick={openCreate}>
          <Plus size={17} /> {tx('Add Department')}
        </button>
      </div>

      {school && (
        <div className="pg-hint">
          <Info size={16} />
          <span>A section is the collective name for a group of classes and runs a number of years, e.g. Primary School (6 years: Primary 1 – 6)
            or Junior High School (3 years: JHS 1 – 3). Keep them in order: students in the last year of one section are promoted into the first year of the next.</span>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="pg-grid">
          {[1,2,3].map(i => <div key={i} className="pg-skel" style={{ height: 140 }} />)}
        </div>
      ) : departments.length === 0 ? (
        <div className="pg-empty">
          <Building2 size={48} style={{ color: 'rgba(var(--accent-rgb), 0.3)', marginBottom: 16 }} />
          <h3>{tx('No departments yet')}</h3>
          <p>{tx('Click "Add Department" to create the first one.')}</p>
        </div>
      ) : (
        <div className="pg-grid">
          {departments.map((d, i) => {
            const classes = classesOf(d);
            return (
              <div key={d.id} className="pg-card" style={{ borderColor: 'rgba(var(--accent-rgb), 0.15)' }}>
                <div className="pg-card-top">
                  <div className="pg-card-main">
                    <div className="pg-name-row">
                      {school && <span className="pg-num" aria-label={`Position ${i + 1}`}>{i + 1}</span>}
                      <div className="pg-name" title={d.name}>{d.name}</div>
                    </div>
                    <div className="pg-meta">
                      <span className="pg-dept-tag" style={{ fontWeight: 700 }}><Hash size={10} />{d.code}</span>
                      {school && d.durationYears != null && <span className="pg-code">{d.durationYears} year{d.durationYears === 1 ? '' : 's'}</span>}
                    </div>
                  </div>
                  <div className="pg-actions">
                    {school && <>
                      <button type="button" className="pg-icon" onClick={() => move(d, -1)} disabled={i === 0 || movingId != null}
                        title="Move up" aria-label={`Move ${d.name} up`}>{movingId === d.id ? <Loader2 size={13} className="pg-spin" /> : <ChevronUp size={15} />}</button>
                      <button type="button" className="pg-icon" onClick={() => move(d, 1)} disabled={i === departments.length - 1 || movingId != null}
                        title="Move down" aria-label={`Move ${d.name} down`}><ChevronDown size={15} /></button>
                    </>}
                    <button type="button" className="pg-icon edit" onClick={() => openEdit(d)} title="Edit" aria-label={`Edit ${d.name}`}><Pencil size={13} /></button>
                    <button type="button" className="pg-icon danger" onClick={() => handleDelete(d)} title="Delete" aria-label={`Delete ${d.name}`}><Trash2 size={13} /></button>
                  </div>
                </div>
                <p className="pg-desc">{d.description || 'No description provided.'}</p>
                {school && (
                  classes.length > 0 ? (
                    <div className="pg-chips" aria-label={`Classes in ${d.name}`}>
                      {classes.map(c => <span key={c.id} className={`pg-chip${c.enabled ? '' : ' off'}`} title={c.name}>{c.name}</span>)}
                    </div>
                  ) : (
                    <Link to="/super-admin/programs" className="pg-next" style={{ textDecoration: 'none' }}>
                      <ArrowRight size={13} /> <span>No classes yet: <b>add them on the Classes page</b></span>
                    </Link>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <StructureModal title={mode === 'create' ? tx('New Department') : tx('Edit Department')} busy={saving} onClose={() => setModalOpen(false)}
          footer={<>
            <button type="button" className="pg-ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</button>
            <button type="button" className="pg-btn brand" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 size={15} className="pg-spin" /> : <Save size={15} />}{saving ? 'Saving…' : 'Save'}
            </button>
          </>}>
          <div className="pg-form">
            {school && mode === 'create' && picks.length > 0 && (
              <div>
                <span className="pg-label">Usual sections</span>
                <div className="pg-picks">
                  {picks.map(pk => {
                    const used = taken(pk.name);
                    const on = sameName(form.name, pk.name);
                    return (
                      <button key={pk.name} type="button" className={`pg-pick${on ? ' on' : ''}`} disabled={used || saving} aria-pressed={on}
                        onClick={() => setForm({ name: pk.name, code: pk.code, description: pk.description ?? '', years: pk.years ?? 1 })}
                        title={used ? 'Already added' : `Use ${pk.name}`}><span>{pk.name}</span></button>
                    );
                  })}
                </div>
                <p className="pg-help">Pick one, or type any name your school uses (e.g. Creche, Basic School).</p>
              </div>
            )}
            <div>
              <label className="pg-label" htmlFor="dp-name">{tx('Department Name *')}</label>
              <input id="dp-name" className="pg-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder={school ? 'e.g. Primary School' : 'e.g. School of Computing'} />
            </div>
            <div>
              <label className="pg-label" htmlFor="dp-code">{tx('Department Code *')}</label>
              <input id="dp-code" className="pg-input" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder={school ? 'e.g. PRI' : 'e.g. SOC'} maxLength={10} autoCapitalize="characters" />
            </div>
            {school && (
              <div>
                <span className="pg-label">Years</span>
                <div className="pg-stepper">
                  <button type="button" onClick={() => setForm(p => ({ ...p, years: Math.max(1, p.years - 1) }))} disabled={form.years <= 1} aria-label="Fewer years">−</button>
                  <span className="pg-stepper-n" aria-live="polite">{form.years}</span>
                  <button type="button" onClick={() => setForm(p => ({ ...p, years: Math.min(12, p.years + 1) }))} disabled={form.years >= 12} aria-label="More years">+</button>
                  <span className="pg-muted">year{form.years > 1 ? 's' : ''}</span>
                </div>
                <p className="pg-help">How long students spend in this section, e.g. Primary School 6 (Primary 1 to 6), Junior High School 3. Its classes sit in years 1 to {form.years}.</p>
              </div>
            )}
            <div>
              <label className="pg-label" htmlFor="dp-desc">Description</label>
              <textarea id="dp-desc" className="pg-input" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder={tx('Brief description of this department…')} />
            </div>
          </div>
        </StructureModal>
      )}
    </div>
  );
}
