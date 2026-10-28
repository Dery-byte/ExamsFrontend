import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { saGetPrograms, saGetDepartments, saCreateProgram, saUpdateProgram, saDeleteProgram, saToggleProgram, saReorderPrograms } from '../../api/endpoints';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { BookMarked, Plus, Pencil, Trash2, Save, Calendar, Building2, Power, PowerOff, Loader2, ChevronUp, ChevronDown, ArrowRight, LogOut, Info, Sparkles } from 'lucide-react';
import { isSchoolMode, oneYear, periodsPerLevel, tx } from '../../utils/terms';
import { StructureModal, STRUCTURE_CSS, classPicks, sameName, yearOf, type Pick } from './structureUi';

interface Program {
  id: number; name: string; code: string; durationYears: number; departmentId: number; departmentName: string;
  configuredLevels: number[]; enabled: boolean; semestersPerLevel: Record<number, number>;
  sortOrder?: number | null; sectionYear?: number | null; sectionYears?: number | null; nextProgramId?: number | null; finalClass?: boolean;
  promotesToId?: number | null; promotesToName?: string | null;
}
interface Department { id: number; name: string; code: string; sortOrder?: number | null; durationYears?: number | null; }
/** Schools: where a class's students go at promotion. */
type After = 'auto' | 'leave' | number;
/** Schools: year = the class's year in its section (Primary 4 → 4). */
interface FormState { name: string; code: string; durationYears: number; departmentId: number | ''; semestersPerLevel: Record<number, number>; terms: number; after: After; year: number | ''; }

const levelColors = ['var(--accent)','var(--brand)','#0ea5e9','#10b981','#f59e0b','#ef4444','#ec4899','var(--accent)','#06b6d4','#84cc16'];
const levelChipStyle = (i: number): React.CSSProperties => {
  const c = levelColors[i % levelColors.length];
  return { background: `color-mix(in srgb, ${c} 13.3%, transparent)`, border: `1px solid color-mix(in srgb, ${c} 26.7%, transparent)`, color: c };
};

const EMPTY: FormState = { name: '', code: '', durationYears: 4, departmentId: '', semestersPerLevel: {}, terms: 3, after: 'auto', year: '' };

/**
 * Super Admin: programmes and their levels. In a school these are the classes (Primary 1, JHS 2 …),
 * one year each, listed by section in order, each with the class its students are promoted to.
 */
export default function Programs() {
  const school = isSchoolMode();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDept, setFilterDept] = useState<number | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [movingId, setMovingId] = useState<number | null>(null);

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

  /** Quietly re-reads the list: one class's change can move where others promote to. */
  const refresh = async () => {
    try { const p = await saGetPrograms(); if (Array.isArray(p)) setPrograms(p); } catch { /* the list stays as it was */ }
  };

  const editing = editId != null ? programs.find(p => p.id === editId) : undefined;
  /** Schools edit a class (one year); an older multi-year programme keeps the years and levels editor. */
  const classForm = school && (mode === 'create' || oneYear(editing));

  /** The first year of a section that has no class yet (else its last year). */
  const freeYear = (deptId: number | ''): number | '' => {
    const d = departments.find(x => x.id === deptId);
    if (!d?.durationYears) return '';
    const used = new Set(programs.filter(p => p.departmentId === deptId).map(p => p.sectionYear));
    for (let y = 1; y <= d.durationYears; y++) if (!used.has(y)) return y;
    return d.durationYears;
  };

  const openCreate = (deptId?: number) => {
    const dept = deptId ?? (filterDept !== 'all' ? filterDept : departments[0]?.id) ?? '';
    setForm({ ...EMPTY, durationYears: school ? 1 : 4, departmentId: dept, terms: periodsPerLevel(), year: freeYear(dept) });
    setMode('create'); setEditId(null); setModalOpen(true);
  };
  const openEdit = (p: Program) => {
    setForm({
      name: p.name, code: p.code, durationYears: p.durationYears, departmentId: p.departmentId,
      semestersPerLevel: p.semestersPerLevel || {}, terms: p.semestersPerLevel?.[p.configuredLevels?.[0] ?? 1] || periodsPerLevel(),
      after: p.finalClass ? 'leave' : p.nextProgramId ?? 'auto', year: p.sectionYear ?? '',
    });
    setMode('edit'); setEditId(p.id); setModalOpen(true);
  };

  const previewLevels = Array.from({ length: form.durationYears }, (_, i) => (i + 1) * (school ? 1 : 100));

  const updateSemester = (level: number, delta: number) => {
    setForm(prev => {
      const current = prev.semestersPerLevel[level] || periodsPerLevel();
      const next = Math.max(1, Math.min(6, current + delta));
      return { ...prev, semestersPerLevel: { ...prev.semestersPerLevel, [level]: next } };
    });
  };

  const payloadOf = (f: FormState) => classForm
    ? {
        name: f.name.trim(), code: f.code.toUpperCase(), departmentId: f.departmentId,
        semestersPerLevel: { 1: f.terms }, sectionYear: f.year === '' ? null : f.year,
        nextProgramId: typeof f.after === 'number' ? f.after : null, finalClass: f.after === 'leave',
      }
    : { name: f.name, code: f.code.toUpperCase(), durationYears: f.durationYears, departmentId: f.departmentId, semestersPerLevel: f.semestersPerLevel,
        ...(school ? { nextProgramId: typeof f.after === 'number' ? f.after : null, finalClass: f.after === 'leave' } : {}) };

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim() || !form.departmentId) { toast.error('All fields are required.'); return; }
    setSaving(true);
    try {
      if (mode === 'create') {
        const created = await saCreateProgram(payloadOf(form));
        setPrograms(prev => [...prev, created]);
        toast.success(tx('Program created!'));
      } else {
        const updated = await saUpdateProgram(editId!, payloadOf(form));
        setPrograms(prev => prev.map(p => p.id === editId ? updated : p));
        toast.success(tx('Program updated!'));
      }
      setModalOpen(false);
      if (school) refresh();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Operation failed'); }
    finally { setSaving(false); }
  };

  /** Adds every suggested class the section doesn't have yet (Primary 1 … 6), in order. */
  const addAll = async (picks: Pick[]) => {
    if (!form.departmentId || picks.length === 0) return;
    setSaving(true);
    let added = 0;
    try {
      for (const p of picks) {
        await saCreateProgram({ name: p.name, code: p.code, departmentId: form.departmentId, sectionYear: p.year ?? null, semestersPerLevel: { 1: form.terms }, nextProgramId: null, finalClass: false });
        added++;
      }
      toast.success(`Added ${added} class${added === 1 ? '' : 'es'}.`);
      setModalOpen(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || (added ? `Added ${added}, then stopped.` : 'Could not add the classes.'));
    } finally {
      setSaving(false);
      refresh();
    }
  };

  const handleDelete = async (p: Program) => {
    const res = await Swal.fire({ title: `Delete "${p.name}"?`, text: school ? 'This removes the class. Students still in it must be moved first.' : tx('This will remove the program and all its level configurations.'), icon: 'warning', showCancelButton: true, confirmButtonText: 'Delete', confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280', background: '#1a1a35', color: '#fff' });
    if (!res.isConfirmed) return;
    try { await saDeleteProgram(p.id); setPrograms(prev => prev.filter(x => x.id !== p.id)); toast.success('Deleted.'); if (school) refresh(); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Delete failed'); }
  };

  const handleToggle = async (p: Program) => {
    const action = p.enabled ? 'disable' : 'enable';
    const res = await Swal.fire({
      title: `${p.enabled ? 'Disable' : 'Enable'} "${p.name}"?`,
      html: p.enabled
        ? tx(`<div style="color:rgba(255,255,255,0.7);font-size:14px">This program will be <b style="color:#f87171">hidden system-wide</b>.<br/>Students, Lecturers, and Admins will no longer see it.</div>`)
        : tx(`<div style="color:rgba(255,255,255,0.7);font-size:14px">This program will be <b style="color:#34d399">restored</b> and visible to all roles again.</div>`),
      icon: p.enabled ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonText: p.enabled ? tx('Disable Program') : tx('Enable Program'),
      confirmButtonColor: p.enabled ? '#ef4444' : '#10b981',
      cancelButtonColor: '#6b7280',
      background: '#1a1a35',
      color: '#fff',
    });
    if (!res.isConfirmed) return;
    setTogglingId(p.id);
    try {
      const updated = await saToggleProgram(p.id);
      setPrograms(prev => prev.map(x => x.id === p.id ? { ...x, enabled: updated.enabled } : x));
      toast.success(tx(`Program ${action}d successfully.`));
      if (school) refresh();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || tx(`Failed to ${action} program`));
    } finally {
      setTogglingId(null);
    }
  };

  const inSection = (deptId: number) => programs.filter(p => p.departmentId === deptId);

  /** Moves a class one place up or down within its section. */
  const move = async (p: Program, dir: -1 | 1) => {
    const ids = inSection(p.departmentId).map(x => x.id);
    const i = ids.indexOf(p.id), j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    setMovingId(p.id);
    try { const all = await saReorderPrograms(ids); if (Array.isArray(all)) setPrograms(all); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Could not move the class.'); }
    finally { setMovingId(null); }
  };

  const filtered = programs
    .filter(p => filterDept === 'all' || p.departmentId === filterDept)
    .filter(p => filterStatus === 'all' || (filterStatus === 'enabled' ? p.enabled : !p.enabled));

  // ── The dialog's school extras ──
  const formDept = departments.find(d => d.id === form.departmentId);
  const picks = classPicks(formDept);
  const missing = picks.filter(pk => !inSection(Number(form.departmentId)).some(p => sameName(p.name, pk.name)));
  const nextChoices = programs.filter(p => p.id !== editId);
  const autoNext = (() => {
    if (!editing) return null;
    if (editing.finalClass || typeof form.after !== 'string') return null;
    return editing.nextProgramId == null ? editing.promotesToName : null;
  })();

  const card = (p: Program, list: Program[], idx: number) => (
    <div key={p.id} className={`pg-card${p.enabled ? '' : ' off'}`}>
      <div className="pg-card-top">
        <div className="pg-card-main">
          <div className="pg-name-row">
            <div className="pg-name" title={p.name}>{p.name}</div>
            <span className={`pg-badge${p.enabled ? '' : ' off'}`}>{p.enabled ? 'Active' : 'Disabled'}</span>
          </div>
          <div className="pg-meta">
            <span className="pg-code">{p.code}</span>
            {!school && <span className="pg-dept-tag" title={p.departmentName}><Building2 size={10} style={{ flexShrink: 0 }} /><span>{p.departmentName}</span></span>}
          </div>
        </div>
        <div className="pg-actions">
          {school && <>
            <button type="button" className="pg-icon" onClick={() => move(p, -1)} disabled={idx === 0 || movingId != null}
              title="Move up" aria-label={`Move ${p.name} up`}><ChevronUp size={15} /></button>
            <button type="button" className="pg-icon" onClick={() => move(p, 1)} disabled={idx === list.length - 1 || movingId != null}
              title="Move down" aria-label={`Move ${p.name} down`}><ChevronDown size={15} /></button>
          </>}
          <button type="button" className={`pg-icon ${p.enabled ? 'danger' : 'ok'}`}
            onClick={() => handleToggle(p)} disabled={togglingId === p.id}
            title={p.enabled ? tx('Disable Program') : tx('Enable Program')}
            aria-label={`${p.enabled ? tx('Disable Program') : tx('Enable Program')}: ${p.name}`}>
            {togglingId === p.id ? <Loader2 size={13} className="pg-spin" /> : p.enabled ? <PowerOff size={13} /> : <Power size={13} />}
          </button>
          <button type="button" className="pg-icon edit" onClick={() => openEdit(p)} title="Edit" aria-label={`Edit ${p.name}`}><Pencil size={13} /></button>
          <button type="button" className="pg-icon danger" onClick={() => handleDelete(p)} title="Delete" aria-label={`Delete ${p.name}`}><Trash2 size={13} /></button>
        </div>
      </div>
      {school && oneYear(p) ? (
        <div className="pg-dur">
          <Calendar size={13} style={{ color: 'rgba(255,255,255,0.4)' }} />
          <span>{[yearOf(p.sectionYear, p.sectionYears), `${p.semestersPerLevel?.[p.configuredLevels?.[0] ?? 1] || periodsPerLevel()} terms a year`].filter(Boolean).join(' · ')}</span>
        </div>
      ) : <>
        <div className="pg-dur">
          <Calendar size={13} style={{ color: 'rgba(255,255,255,0.4)' }} />
          <span>{p.durationYears} Year{p.durationYears > 1 ? 's' : ''} {tx("Programme")}</span>
        </div>
        <div className="pg-levels">
          {p.configuredLevels?.map((lv, i) => {
            const sems = p.semestersPerLevel?.[lv] || periodsPerLevel();
            return (
              <span key={lv} className="pg-level" style={levelChipStyle(i)}>
                {tx("Level ")}{lv} <span style={{ opacity: 0.6, fontSize: 10, marginLeft: 2 }}>({sems} {tx('sems')})</span>
              </span>
            );
          })}
        </div>
      </>}
      {school && (p.promotesToName
        ? <div className="pg-next"><ArrowRight size={13} /> Promoted to <b>{p.promotesToName}</b>{p.nextProgramId == null && <span className="pg-muted">(next in order)</span>}</div>
        : <div className="pg-next leave"><LogOut size={13} /> <b>Leaves the school</b> after this class</div>)}
      {!p.enabled && (
        <div className="pg-off-note">
          <PowerOff size={11} style={{ flexShrink: 0 }} />
          Hidden from all users — enable to restore visibility
        </div>
      )}
    </div>
  );

  return (
    <div className="pg">
      <style>{STRUCTURE_CSS}</style>

      {/* Header */}
      <div className="pg-head">
        <div className="pg-title">
          <div className="pg-logo"><BookMarked size={20} color="#fff" /></div>
          <div style={{ minWidth: 0 }}>
            <h1 className="pg-h1">{tx('Programs & Levels')}</h1>
            <p className="pg-sub">{school ? 'The classes in each section, in the order students move through them' : tx('Configure academic programs and their level structure')}</p>
          </div>
        </div>
        <button type="button" className="pg-btn pg-add" onClick={() => openCreate()} disabled={school && departments.length === 0}>
          <Plus size={17} /> {tx("Add Program")}</button>
      </div>

      {school && (
        <div className="pg-hint">
          <Info size={16} />
          <span>Each class sits in one year of its section (Primary 4 is year 4 of Primary School's 6). At promotion, students move to the next year's class
            (the same stream where a year has several, e.g. JHS 1 Gold → JHS 2 Gold), or to the class you choose. The last year of a section leads to the
            first year of the next section, unless you mark the class as the one students leave from.</span>
        </div>
      )}

      {/* Stats bar */}
      <div className="pg-stats">
        {[
          { label: 'Total', count: programs.length, color: '#0ea5e9' },
          { label: 'Enabled', count: programs.filter(p => p.enabled).length, color: '#10b981' },
          { label: 'Disabled', count: programs.filter(p => !p.enabled).length, color: '#f87171' },
        ].map(s => (
          <div key={s.label} className="pg-stat" style={{ borderColor: `color-mix(in srgb, ${s.color} 18.8%, transparent)` }}>
            <span className="pg-stat-n" style={{ color: s.color }}>{s.count}</span>
            <span className="pg-stat-l">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="pg-filters">
        <select className="pg-input pg-dept" aria-label={tx('Filter by department')} value={filterDept}
          onChange={e => setFilterDept(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
          <option value="all">{tx('All Departments')}</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <div className="pg-seg" role="group" aria-label="Filter by status">
          {(['all', 'enabled', 'disabled'] as const).map(s => (
            <button key={s} type="button" onClick={() => setFilterStatus(s)} aria-pressed={filterStatus === s}
              className={filterStatus === s ? `active ${s}` : undefined}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="pg-grid">
          {[1,2,3].map(i => <div key={i} className="pg-skel" />)}
        </div>
      ) : school && departments.length === 0 ? (
        <div className="pg-empty">
          <Building2 size={48} style={{ color: 'rgba(var(--accent-rgb), 0.3)', marginBottom: 16 }} />
          <h3>Add a section first</h3>
          <p>Classes belong to a section, such as Primary School or Junior High School.</p>
          <Link to="/super-admin/departments" className="pg-btn" style={{ textDecoration: 'none' }}><Plus size={16} /> Add a section</Link>
        </div>
      ) : school ? (
        departments.filter(d => filterDept === 'all' || d.id === filterDept).map((d, n) => {
          const list = inSection(d.id);
          const shown = list.filter(p => filterStatus === 'all' || (filterStatus === 'enabled' ? p.enabled : !p.enabled));
          return (
            <section key={d.id} className="pg-group" aria-labelledby={`pg-sec-${d.id}`}>
              <div className="pg-group-head">
                <div className="pg-group-title">
                  {filterDept === 'all' && <span className="pg-num" aria-hidden="true">{n + 1}</span>}
                  <h2 id={`pg-sec-${d.id}`} title={d.name}>{d.name}</h2>
                  <span className="pg-muted">{list.length} class{list.length === 1 ? '' : 'es'}</span>
                </div>
                <button type="button" className="pg-ghost sm" onClick={() => openCreate(d.id)}><Plus size={15} /> Add class</button>
              </div>
              {shown.length === 0 ? (
                <div className="pg-empty sm">
                  <p>{list.length === 0 ? `No classes in ${d.name} yet.` : 'No classes match this filter.'}</p>
                </div>
              ) : (
                <div className="pg-grid">{shown.map(p => card(p, list, list.indexOf(p)))}</div>
              )}
            </section>
          );
        })
      ) : filtered.length === 0 ? (
        <div className="pg-empty">
          <BookMarked size={48} style={{ color: 'rgba(var(--accent-rgb), 0.3)', marginBottom: 16 }} />
          <h3>{tx("No programs found")}</h3>
          {programs.length === 0
            ? <button type="button" className="pg-btn" onClick={() => openCreate()}><Plus size={16} /> {tx("Add Program")}</button>
            : <p>{tx('Try a different department or status filter.')}</p>}
        </div>
      ) : (
        <div className="pg-grid">{filtered.map(p => card(p, filtered, -1))}</div>
      )}

      {/* Modal */}
      {modalOpen && (
        <StructureModal title={mode === 'create' ? tx('New Program') : tx('Edit Program')} busy={saving} onClose={() => setModalOpen(false)}
          footer={<>
            <button type="button" className="pg-ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</button>
            <button type="button" className="pg-btn" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 size={15} className="pg-spin" /> : <Save size={15} />}{saving ? 'Saving…' : 'Save'}
            </button>
          </>}>
          <div className="pg-form">
            <div>
              <label className="pg-label" htmlFor="pg-dept">{tx('Department *')}</label>
              <select id="pg-dept" className="pg-input" value={form.departmentId} onChange={e => { const d = Number(e.target.value); setForm(p => ({ ...p, departmentId: d, year: classForm ? freeYear(d) : p.year })); }}>
                <option value="">{tx('Select department…')}</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            {classForm && mode === 'create' && picks.length > 0 && (
              <div>
                <span className="pg-label">Usual classes</span>
                <div className="pg-picks">
                  {picks.map(pk => {
                    const used = !missing.includes(pk);
                    return (
                      <button key={pk.name} type="button" className={`pg-pick${sameName(form.name, pk.name) ? ' on' : ''}`} disabled={used || saving}
                        onClick={() => setForm(f => ({ ...f, name: pk.name, code: pk.code, year: pk.year ?? f.year }))} aria-pressed={sameName(form.name, pk.name)}
                        title={used ? 'Already added' : `Use ${pk.name}`}><span>{pk.name}</span></button>
                    );
                  })}
                </div>
                {missing.length > 1 && (
                  <button type="button" className="pg-ghost sm" style={{ marginTop: 10 }} onClick={() => addAll(missing)} disabled={saving}>
                    <Sparkles size={14} /> Add all {missing.length} ({missing[0].name} – {missing[missing.length - 1].name})
                  </button>
                )}
                <p className="pg-help">Pick one to fill in the name and code, or type your own (e.g. Basic 7, JHS 1A, SHS 1 Science).</p>
              </div>
            )}

            <div className={classForm ? 'pg-row2' : 'pg-form'}>
              <div>
                <label className="pg-label" htmlFor="pg-name">{tx("Program Name *")}</label>
                <input id="pg-name" className="pg-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder={school ? 'e.g. Primary 1' : 'e.g. Computer Science BS'} />
              </div>
              <div>
                <label className="pg-label" htmlFor="pg-code">{tx("Program Code *")}</label>
                <input id="pg-code" className="pg-input" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder={school ? 'e.g. P1' : 'e.g. CS'} maxLength={10} autoCapitalize="characters" />
              </div>
            </div>

            {classForm ? (
              <div className={formDept?.durationYears ? 'pg-row2' : undefined}>
              {formDept?.durationYears ? (
                <div>
                  <label className="pg-label" htmlFor="pg-year">Year in {formDept.name}</label>
                  <select id="pg-year" className="pg-input" value={form.year} onChange={e => setForm(p => ({ ...p, year: e.target.value ? Number(e.target.value) : '' }))}>
                    {Array.from({ length: formDept.durationYears }, (_, i) => i + 1).map(y => (
                      <option key={y} value={y}>Year {y} of {formDept.durationYears}</option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div>
                <span className="pg-label">Terms a year</span>
                <div className="pg-stepper">
                  <button type="button" onClick={() => setForm(p => ({ ...p, terms: Math.max(1, p.terms - 1) }))} disabled={form.terms <= 1} aria-label="Fewer terms">−</button>
                  <span className="pg-stepper-n" aria-live="polite">{form.terms}</span>
                  <button type="button" onClick={() => setForm(p => ({ ...p, terms: Math.min(6, p.terms + 1) }))} disabled={form.terms >= 6} aria-label="More terms">+</button>
                  <span className="pg-muted">term{form.terms > 1 ? 's' : ''}</span>
                </div>
              </div>
              </div>
            ) : <>
              <div>
                <span className="pg-label">Duration (Years) *</span>
                <div className="pg-stepper">
                  <button type="button" onClick={() => setForm(p => ({ ...p, durationYears: Math.max(1, p.durationYears - 1) }))} disabled={form.durationYears <= 1} aria-label="Fewer years">−</button>
                  <span className="pg-stepper-n" aria-live="polite">{form.durationYears}</span>
                  <button type="button" onClick={() => setForm(p => ({ ...p, durationYears: Math.min(10, p.durationYears + 1) }))} disabled={form.durationYears >= 10} aria-label="More years">+</button>
                  <span className="pg-muted">year{form.durationYears > 1 ? 's' : ''}</span>
                </div>
                <div style={{ marginTop: 10 }}>
                  <div className="pg-muted" style={{ fontSize: 11, marginBottom: 6 }}>{tx("Generated Levels:")}</div>
                  <div className="pg-levels">
                    {previewLevels.map((lv, i) => (
                      <span key={lv} className="pg-level" style={levelChipStyle(i)}>{tx("Level ")}{lv}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <span className="pg-label">{tx("Semesters per Level")}</span>
                <div className="pg-sems">
                  {previewLevels.map(lv => {
                    const n = form.semestersPerLevel[lv] || periodsPerLevel();
                    return (
                      <div key={lv} className="pg-sem">
                        <span>{tx("Level ")}{lv}</span>
                        <div className="pg-stepper sm">
                          <button type="button" onClick={() => updateSemester(lv, -1)} disabled={n <= 1} aria-label={`Fewer for ${tx('Level ')}${lv}`}>−</button>
                          <span className="pg-stepper-n">{n}</span>
                          <button type="button" onClick={() => updateSemester(lv, 1)} disabled={n >= 6} aria-label={`More for ${tx('Level ')}${lv}`}>+</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>}

            {school && (
              <div>
                <label className="pg-label" htmlFor="pg-after">After this class</label>
                <select id="pg-after" className="pg-input" value={String(form.after)}
                  onChange={e => { const v = e.target.value; setForm(p => ({ ...p, after: v === 'auto' || v === 'leave' ? v : Number(v) })); }}>
                  <option value="auto">Next class in order{autoNext ? ` (now ${autoNext})` : ''}</option>
                  {departments.map(d => {
                    const opts = nextChoices.filter(p => p.departmentId === d.id);
                    return opts.length === 0 ? null : (
                      <optgroup key={d.id} label={d.name}>
                        {opts.map(p => <option key={p.id} value={p.id}>Promote to {p.name}</option>)}
                      </optgroup>
                    );
                  })}
                  <option value="leave">Students leave the school (final class)</option>
                </select>
                <p className="pg-help">Where students go when they are promoted at the end of the year.</p>
              </div>
            )}
          </div>
        </StructureModal>
      )}
    </div>
  );
}
