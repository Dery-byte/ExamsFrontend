import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { saGetPrograms, saGetDepartments, saCreateProgram, saUpdateProgram, saDeleteProgram, saToggleProgram } from '../../api/endpoints';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { BookMarked, Plus, Pencil, Trash2, X, Save, Calendar, Building2, Power, PowerOff, Loader2 } from 'lucide-react';
import { isSchoolMode, periodsPerLevel, tx } from '../../utils/terms';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

interface Program { id: number; name: string; code: string; durationYears: number; departmentId: number; departmentName: string; configuredLevels: number[]; enabled: boolean; semestersPerLevel: Record<number, number>; }
interface Department { id: number; name: string; code: string; }
interface FormState { name: string; code: string; durationYears: number; departmentId: number | ''; semestersPerLevel: Record<number, number>; }

const levelColors = ['#7c3aed','#4f46e5','#0ea5e9','#10b981','#f59e0b','#ef4444','#ec4899','#8b5cf6','#06b6d4','#84cc16'];
const levelChipStyle = (i: number): React.CSSProperties => {
  const c = levelColors[i % levelColors.length];
  return { background: `${c}22`, border: `1px solid ${c}44`, color: c };
};

export default function Programs() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDept, setFilterDept] = useState<number | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>({ name: '', code: '', durationYears: 4, departmentId: '', semestersPerLevel: {} });
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

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

  const openCreate = () => { setForm({ name: '', code: '', durationYears: 4, departmentId: departments[0]?.id || '', semestersPerLevel: {} }); setMode('create'); setEditId(null); setModalOpen(true); };
  const openEdit = (p: Program) => { setForm({ name: p.name, code: p.code, durationYears: p.durationYears, departmentId: p.departmentId, semestersPerLevel: p.semestersPerLevel || {} }); setMode('edit'); setEditId(p.id); setModalOpen(true); };

  const previewLevels = Array.from({ length: form.durationYears }, (_, i) => (i + 1) * (isSchoolMode() ? 1 : 100));

  const updateSemester = (level: number, delta: number) => {
    setForm(prev => {
      const current = prev.semestersPerLevel[level] || periodsPerLevel();
      const next = Math.max(1, Math.min(6, current + delta));
      return { ...prev, semestersPerLevel: { ...prev.semestersPerLevel, [level]: next } };
    });
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim() || !form.departmentId) { toast.error('All fields are required.'); return; }
    setSaving(true);
    try {
      const payload = { name: form.name, code: form.code.toUpperCase(), durationYears: form.durationYears, departmentId: form.departmentId, semestersPerLevel: form.semestersPerLevel };
      if (mode === 'create') {
        const created = await saCreateProgram(payload);
        setPrograms(prev => [...prev, created]);
        toast.success(tx('Program created!'));
      } else {
        const updated = await saUpdateProgram(editId!, payload);
        setPrograms(prev => prev.map(p => p.id === editId ? updated : p));
        toast.success(tx('Program updated!'));
      }
      setModalOpen(false);
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Operation failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (p: Program) => {
    const res = await Swal.fire({ title: `Delete "${p.name}"?`, text: tx('This will remove the program and all its level configurations.'), icon: 'warning', showCancelButton: true, confirmButtonText: 'Delete', confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280', background: '#1a1a35', color: '#fff' });
    if (!res.isConfirmed) return;
    try { await saDeleteProgram(p.id); setPrograms(prev => prev.filter(x => x.id !== p.id)); toast.success('Deleted.'); }
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
    } catch (e: any) {
      toast.error(e?.response?.data?.message || tx(`Failed to ${action} program`));
    } finally {
      setTogglingId(null);
    }
  };

  const filtered = programs
    .filter(p => filterDept === 'all' || p.departmentId === filterDept)
    .filter(p => filterStatus === 'all' || (filterStatus === 'enabled' ? p.enabled : !p.enabled));

  return (
    <div className="pg">
      <style>{PROGRAMS_CSS}</style>

      {/* Header */}
      <div className="pg-head">
        <div className="pg-title">
          <div className="pg-logo"><BookMarked size={20} color="#fff" /></div>
          <div style={{ minWidth: 0 }}>
            <h1 className="pg-h1">Programs &amp; Levels</h1>
            <p className="pg-sub">{tx("Configure academic programs and their level structure")}</p>
          </div>
        </div>
        <button type="button" className="pg-btn pg-add" onClick={openCreate}>
          <Plus size={17} /> {tx("Add Program")}</button>
      </div>

      {/* Stats bar */}
      <div className="pg-stats">
        {[
          { label: 'Total', count: programs.length, color: '#0ea5e9' },
          { label: 'Enabled', count: programs.filter(p => p.enabled).length, color: '#10b981' },
          { label: 'Disabled', count: programs.filter(p => !p.enabled).length, color: '#f87171' },
        ].map(s => (
          <div key={s.label} className="pg-stat" style={{ borderColor: `${s.color}30` }}>
            <span className="pg-stat-n" style={{ color: s.color }}>{s.count}</span>
            <span className="pg-stat-l">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="pg-filters">
        <select className="pg-input pg-dept" aria-label="Filter by department" value={filterDept}
          onChange={e => setFilterDept(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
          <option value="all">All Departments</option>
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
      ) : filtered.length === 0 ? (
        <div className="pg-empty">
          <BookMarked size={48} style={{ color: 'rgba(139,92,246,0.3)', marginBottom: 16 }} />
          <h3>{tx("No programs found")}</h3>
          {programs.length === 0
            ? <button type="button" className="pg-btn" onClick={openCreate}><Plus size={16} /> {tx("Add Program")}</button>
            : <p>Try a different department or status filter.</p>}
        </div>
      ) : (
        <div className="pg-grid">
          {filtered.map(p => (
            <div key={p.id} className={`pg-card${p.enabled ? '' : ' off'}`}>
              <div className="pg-card-top">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="pg-name-row">
                    <div className="pg-name" title={p.name}>{p.name}</div>
                    <span className={`pg-badge${p.enabled ? '' : ' off'}`}>{p.enabled ? 'Active' : 'Disabled'}</span>
                  </div>
                  <div className="pg-meta">
                    <span className="pg-code">{p.code}</span>
                    <span className="pg-dept-tag" title={p.departmentName}><Building2 size={10} style={{ flexShrink: 0 }} /><span>{p.departmentName}</span></span>
                  </div>
                </div>
                <div className="pg-actions">
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
              <div className="pg-dur">
                <Calendar size={13} style={{ color: 'rgba(255,255,255,0.4)' }} />
                <span>{p.durationYears} Year{p.durationYears > 1 ? 's' : ''} {tx("Programme")}</span>
              </div>
              <div className="pg-levels">
                {p.configuredLevels?.map((lv, i) => {
                  const sems = p.semestersPerLevel?.[lv] || periodsPerLevel();
                  return (
                    <span key={lv} className="pg-level" style={levelChipStyle(i)}>
                      {tx("Level ")}{lv} <span style={{ opacity: 0.6, fontSize: 10, marginLeft: 2 }}>({sems} sems)</span>
                    </span>
                  );
                })}
              </div>
              {/* Disabled overlay note */}
              {!p.enabled && (
                <div className="pg-off-note">
                  <PowerOff size={11} style={{ flexShrink: 0 }} />
                  Hidden from all users — enable to restore visibility
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <ProgramModal title={mode === 'create' ? tx('New Program') : tx('Edit Program')} busy={saving} onClose={() => setModalOpen(false)}
          footer={<>
            <button type="button" className="pg-ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</button>
            <button type="button" className="pg-btn" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 size={15} className="pg-spin" /> : <Save size={15} />}{saving ? 'Saving…' : 'Save'}
            </button>
          </>}>
          <div className="pg-form">
            <div>
              <label className="pg-label" htmlFor="pg-name">{tx("Program Name *")}</label>
              <input id="pg-name" className="pg-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Computer Science BS" />
            </div>
            <div>
              <label className="pg-label" htmlFor="pg-code">{tx("Program Code *")}</label>
              <input id="pg-code" className="pg-input" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="e.g. CS" maxLength={10} autoCapitalize="characters" />
            </div>
            <div>
              <label className="pg-label" htmlFor="pg-dept">Department *</label>
              <select id="pg-dept" className="pg-input" value={form.departmentId} onChange={e => setForm(p => ({ ...p, departmentId: Number(e.target.value) }))}>
                <option value="">Select department…</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
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
          </div>
        </ProgramModal>
      )}
    </div>
  );
}

/** Scrollable dialog on <body>: centred on larger screens, a bottom sheet on phones; Esc or a click outside closes it. */
function ProgramModal({ title, busy, onClose, footer, children }: {
  title: string; busy: boolean; onClose: () => void; footer: React.ReactNode; children: React.ReactNode;
}) {
  useBodyScrollLock();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  return createPortal(
    <div className="pg-overlay" onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="pg-modal" role="dialog" aria-modal="true" aria-labelledby="pg-modal-title">
        <div className="pg-modal-head">
          <h2 id="pg-modal-title">{title}</h2>
          <button type="button" className="pg-icon" onClick={onClose} disabled={busy} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="pg-modal-body">{children}</div>
        <div className="pg-modal-foot">{footer}</div>
      </div>
    </div>,
    document.body,
  );
}

const PROGRAMS_CSS = `
.pg { color: #fff; padding-bottom: 32px; container: pg / inline-size; }
.pg-head { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; margin-bottom: 22px; }
.pg-title { display: flex; align-items: center; gap: 12px; min-width: 0; }
.pg-logo { width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0; background: linear-gradient(135deg,#0ea5e9,#2563eb); display: flex; align-items: center; justify-content: center; }
.pg-h1 { margin: 0; font-size: 22px; font-weight: 700; }
.pg-sub { margin: 0; font-size: 12px; color: rgba(255,255,255,0.45); }

.pg-btn, .pg-ghost { height: 40px; padding: 0 18px; border-radius: 10px; font: inherit; font-size: 14px; display: inline-flex; align-items: center; justify-content: center; gap: 7px; cursor: pointer; white-space: nowrap; transition: transform .15s, box-shadow .15s, background .15s, opacity .15s; }
.pg-btn { background: linear-gradient(135deg,#0ea5e9,#2563eb); border: none; color: #fff; font-weight: 600; box-shadow: 0 4px 14px rgba(14,165,233,0.3); }
.pg-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(14,165,233,0.4); }
.pg-ghost { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: #fff; font-weight: 500; }
.pg-ghost:hover:not(:disabled) { background: rgba(255,255,255,0.1); }
.pg-btn:disabled, .pg-ghost:disabled { opacity: .6; cursor: not-allowed; }
.pg-btn:focus-visible, .pg-ghost:focus-visible, .pg-icon:focus-visible, .pg-seg button:focus-visible, .pg-stepper button:focus-visible { outline: 2px solid #38bdf8; outline-offset: 2px; }

.pg-stats { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
.pg-stat { background: rgba(255,255,255,0.04); border: 1px solid; border-radius: 10px; padding: 10px 18px; display: flex; align-items: center; gap: 10px; }
.pg-stat-n { font-size: 22px; font-weight: 800; font-variant-numeric: tabular-nums; }
.pg-stat-l { font-size: 12px; color: rgba(255,255,255,0.5); font-weight: 500; }

.pg-filters { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
.pg-input { width: 100%; height: 42px; padding: 0 14px; border-radius: 9px; background: rgba(255,255,255,0.05); border: 1px solid rgba(139,92,246,0.25); color: #fff; font: inherit; font-size: 14px; outline: none; box-sizing: border-box; transition: border-color .15s, box-shadow .15s; }
.pg-input:focus { border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14,165,233,0.2); }
.pg-input::placeholder { color: rgba(255,255,255,0.3); }
.pg-input option { background: #1a1a35; color: #fff; }
.pg-dept { width: auto; min-width: 220px; max-width: 100%; }
.pg-seg { display: flex; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 9px; overflow: hidden; }
.pg-seg button { padding: 0 16px; height: 40px; border: none; cursor: pointer; font: inherit; font-size: 13px; font-weight: 600; background: transparent; color: rgba(255,255,255,0.5); transition: background .2s, color .2s; }
.pg-seg button:hover { color: #fff; }
.pg-seg button.active { color: #fff; background: rgba(14,165,233,0.3); }
.pg-seg button.active.enabled { background: #10b981; }
.pg-seg button.active.disabled { background: #ef4444; }

.pg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr)); gap: 16px; }
.pg-skel { height: 180px; border-radius: 14px; background: rgba(255,255,255,0.04); animation: pg-pulse 1.5s infinite; }
.pg-empty { text-align: center; padding: 64px 20px; background: rgba(255,255,255,0.02); border-radius: 16px; border: 1px dashed rgba(139,92,246,0.2); }
.pg-empty h3 { margin: 0 0 10px; color: rgba(255,255,255,0.5); font-weight: 500; }
.pg-empty p { margin: 0; font-size: 13px; color: rgba(255,255,255,0.4); }

.pg-card { min-width: 0; background: rgba(255,255,255,0.03); border: 1px solid rgba(14,165,233,0.15); border-radius: 14px; padding: 20px; transition: border-color .2s, transform .2s; }
.pg-card:hover { border-color: rgba(14,165,233,0.35); transform: translateY(-2px); }
.pg-card.off { background: rgba(239,68,68,0.04); border-color: rgba(239,68,68,0.25); opacity: .75; }
.pg-card.off:hover { border-color: rgba(239,68,68,0.45); }
.pg-card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 12px; }
.pg-name-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; min-width: 0; }
.pg-name { font-weight: 700; font-size: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.pg-badge { flex-shrink: 0; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.35); color: #34d399; }
.pg-badge.off { background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.35); color: #f87171; }
.pg-meta { display: flex; gap: 6px; flex-wrap: wrap; min-width: 0; }
.pg-code { background: rgba(14,165,233,0.15); border: 1px solid rgba(14,165,233,0.3); border-radius: 6px; padding: 2px 8px; font-size: 11px; font-weight: 700; color: #38bdf8; }
.pg-dept-tag { background: rgba(139,92,246,0.12); border: 1px solid rgba(139,92,246,0.2); border-radius: 6px; padding: 2px 8px; font-size: 11px; color: #a78bfa; display: inline-flex; align-items: center; gap: 4px; max-width: 100%; min-width: 0; }
.pg-dept-tag > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pg-actions { display: flex; gap: 6px; flex-shrink: 0; }
.pg-icon { width: 32px; height: 32px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1); color: #fff; transition: background .2s, opacity .2s; }
.pg-icon:disabled { opacity: .5; cursor: not-allowed; }
.pg-icon.edit { background: rgba(99,102,241,0.15); border-color: rgba(99,102,241,0.25); color: #818cf8; }
.pg-icon.danger { background: rgba(239,68,68,0.12); border-color: rgba(239,68,68,0.28); color: #f87171; }
.pg-icon.ok { background: rgba(16,185,129,0.12); border-color: rgba(16,185,129,0.3); color: #34d399; }
.pg-icon:hover:not(:disabled) { filter: brightness(1.25); }
.pg-dur { display: flex; align-items: center; gap: 6px; margin-bottom: 12px; font-size: 12px; color: rgba(255,255,255,0.5); }
.pg-levels { display: flex; flex-wrap: wrap; gap: 6px; }
.pg-level { padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; white-space: nowrap; }
.pg-off-note { margin-top: 12px; padding: 8px 12px; border-radius: 8px; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); font-size: 11px; color: #f87171; display: flex; align-items: center; gap: 6px; }
.pg-muted { font-size: 12px; color: rgba(255,255,255,0.4); }
.pg-spin { animation: pg-spin 1s linear infinite; }

.pg-overlay { position: fixed; inset: 0; height: 100vh; height: 100dvh; box-sizing: border-box; overscroll-behavior: contain; font-family: Inter, sans-serif; background: rgba(0,0,0,0.75); backdrop-filter: blur(8px); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 20px; animation: pg-fade .15s ease-out; }
.pg-modal { width: 100%; max-width: 520px; max-height: 100%; display: flex; flex-direction: column; background: linear-gradient(145deg,#1a1a35,#12122a); border: 1px solid rgba(14,165,233,0.3); border-radius: 18px; box-shadow: 0 25px 60px rgba(0,0,0,0.6); color: #fff; animation: pg-pop .18s ease-out; }
.pg-modal-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 20px 24px 16px; border-bottom: 1px solid rgba(255,255,255,0.07); }
.pg-modal-head h2 { margin: 0; font-size: 18px; font-weight: 700; }
.pg-modal-body { padding: 20px 24px; overflow-y: auto; overscroll-behavior: contain; flex: 1 1 auto; min-height: 0; }
.pg-modal-foot { display: flex; gap: 10px; justify-content: flex-end; padding: 14px 24px; border-top: 1px solid rgba(255,255,255,0.07); }
.pg-form { display: flex; flex-direction: column; gap: 16px; }
.pg-label { display: block; font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
.pg-stepper { display: flex; align-items: center; gap: 12px; }
.pg-stepper button { width: 36px; height: 36px; border-radius: 8px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.15); color: #fff; cursor: pointer; font-size: 18px; line-height: 1; display: flex; align-items: center; justify-content: center; }
.pg-stepper button:disabled { opacity: .35; cursor: not-allowed; }
.pg-stepper-n { font-size: 22px; font-weight: 700; color: #38bdf8; min-width: 30px; text-align: center; font-variant-numeric: tabular-nums; }
.pg-stepper.sm { gap: 8px; }
.pg-stepper.sm button { width: 28px; height: 28px; font-size: 15px; border-radius: 6px; border-color: rgba(255,255,255,0.1); }
.pg-stepper.sm .pg-stepper-n { font-size: 14px; min-width: 20px; }
.pg-sems { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 10px; }
.pg-sem { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 12px; background: rgba(255,255,255,0.04); border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); font-size: 13px; color: rgba(255,255,255,0.7); }

@container pg (max-width: 560px) {
  .pg-head { margin-bottom: 16px; }
  .pg-h1 { font-size: 20px; }
  .pg-add { width: 100%; }
  .pg-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-bottom: 16px; }
  .pg-stat { flex-direction: column; align-items: flex-start; gap: 2px; padding: 10px 12px; }
  .pg-stat-n { font-size: 20px; }
  .pg-filters { margin-bottom: 16px; }
  .pg-dept { width: 100%; min-width: 0; }
  .pg-seg { width: 100%; }
  .pg-seg button { flex: 1; padding: 0 8px; }
  .pg-grid { gap: 12px; }
  .pg-card { padding: 16px; }
}
@media (max-width: 640px) {
  .pg-overlay { align-items: flex-end; padding: 0; }
  .pg-modal { max-width: none; max-height: 92vh; max-height: 92dvh; border-radius: 20px 20px 0 0; border-bottom: none; animation: pg-sheet .22s ease-out; }
  .pg-modal::before { content: ''; display: block; width: 38px; height: 4px; border-radius: 4px; background: rgba(255,255,255,0.2); margin: 8px auto 0; flex-shrink: 0; }
  .pg-modal-head { padding: 12px 16px 14px; }
  .pg-modal-body { padding: 16px; }
  .pg-modal-foot { padding: 12px 16px calc(12px + env(safe-area-inset-bottom)); }
  .pg-modal-foot > button { flex: 1 1 0; }
  .pg-sems { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
  /* 16px stops iOS Safari zooming into a field when it gets focus */
  .pg-input { font-size: 16px; }
}
@media (hover: none) {
  .pg-card:hover { transform: none; }
}
@media (pointer: coarse) {
  .pg-icon { width: 40px; height: 40px; }
  .pg-btn, .pg-ghost, .pg-seg button { height: 44px; }
  .pg-input { height: 46px; }
  .pg-stepper button { width: 42px; height: 42px; }
  .pg-stepper.sm button { width: 34px; height: 34px; }
}
@media (prefers-reduced-motion: reduce) {
  .pg *:not(.pg-spin), .pg-overlay, .pg-modal { animation-duration: .01ms !important; transition-duration: .01ms !important; }
}
@keyframes pg-pulse { 0%,100% { opacity: 1; } 50% { opacity: .5; } }
@keyframes pg-spin { to { transform: rotate(360deg); } }
@keyframes pg-fade { from { opacity: 0; } }
@keyframes pg-pop { from { opacity: 0; transform: translateY(8px) scale(.98); } }
@keyframes pg-sheet { from { transform: translateY(100%); } }
`;
