import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { CalendarRange, Scale, Plus, Trash2, Loader2, CheckCircle2, Star, RefreshCw, GraduationCap } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import {
  createSession, deleteSession, getGradingPreset, getGradingSettings, getSessions, makeSessionCurrent,
  recalculateGrades, saveGradingSettings,
} from '../../api/endpoints';

type Band = { letter: string; minScore: string; gradePoint: string; remark: string; passing: boolean };
type Klass = { name: string; minCgpa: string };

const toBand = (b: any): Band => ({ letter: b.letter ?? '', minScore: String(b.minScore ?? ''), gradePoint: String(b.gradePoint ?? ''), remark: b.remark ?? '', passing: b.passing !== false });
const toClass = (c: any): Klass => ({ name: c.name ?? '', minCgpa: String(c.minCgpa ?? '') });

/** Super Admin: academic sessions, grading scale, degree classes, credit units and promotion rules. */
export default function AcademicSettings() {
  return (
    <div style={{ paddingBottom: 40 }}>
      <PageHeader title="Academic Settings" breadcrumbs={['Super Admin', 'Academic Settings']} />
      <SessionsCard />
      <GradingCard />
      <style>{`
        .as-card { background: #fff; border: 1.5px solid #e2e8f0; border-radius: 14px; box-shadow: 0 2px 16px rgba(0,0,0,0.05); margin-bottom: 18px; overflow: hidden; }
        .as-head { display: flex; align-items: center; gap: 10px; padding: 14px 18px; border-bottom: 1px solid #f1f5f9; }
        .as-head h2 { margin: 0; font-size: 15px; font-weight: 800; color: #1e293b; }
        .as-head p { margin: 2px 0 0; font-size: 12px; color: #64748b; }
        .as-body { padding: 14px 18px; }
        .as-input { height: 36px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 13px; padding: 0 10px; background: #fff; color: #1e293b; font-family: inherit; width: 100%; box-sizing: border-box; }
        .as-input:focus { border-color: #5156be; outline: none; }
        .as-label { display: block; font-size: 11.5px; font-weight: 700; color: #475569; margin-bottom: 4px; }
        .as-btn { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 14px; border: none; border-radius: 8px; background: #5156be; color: #fff; font-weight: 700; font-size: 13px; cursor: pointer; white-space: nowrap; }
        .as-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .as-ghost { display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 12px; border-radius: 8px; border: 1.5px solid #e2e8f0; background: #fff; color: #475569; font-weight: 600; font-size: 12.5px; cursor: pointer; white-space: nowrap; }
        .as-icon { width: 32px; height: 32px; border-radius: 8px; border: 1px solid #fee2e2; background: #fff5f5; color: #e34948; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .as-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .as-table th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; padding: 8px 10px; border-bottom: 1px solid #eef0f4; white-space: nowrap; }
        .as-table td { padding: 6px 10px; border-bottom: 1px solid #f4f5f8; vertical-align: middle; }
        .as-current { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 10px; background: #eef2ff; color: #4338ca; }
        .as-grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 18px; }
        .as-note { font-size: 12px; color: #64748b; background: #f8fafc; border: 1px solid #eef0f4; border-radius: 8px; padding: 8px 10px; margin: 0 0 12px; line-height: 1.5; }
        .as-spin { animation: as-spin 1s linear infinite; }
        @keyframes as-spin { to { transform: rotate(360deg); } }
        @media (max-width: 900px) { .as-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}

function SessionsCard() {
  const qc = useQueryClient();
  const { data: sessions = [], isLoading } = useQuery({ queryKey: ['sessions'], queryFn: getSessions });
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '', makeCurrent: false });
  const [busy, setBusy] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ['sessions'] });

  const add = async () => {
    setBusy(true);
    try {
      await createSession({ ...form, startDate: form.startDate || undefined, endDate: form.endDate || undefined });
      toast.success('Session created');
      setForm({ name: '', startDate: '', endDate: '', makeCurrent: false });
      refresh();
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Could not create the session'); }
    finally { setBusy(false); }
  };

  const setCurrent = async (s: any) => {
    const ok = await Swal.fire({ title: `Make ${s.name} current?`, text: 'New marks sheets and course enrolments will go into this session.', icon: 'question', showCancelButton: true, confirmButtonText: 'Make current', confirmButtonColor: '#5156be' });
    if (!ok.isConfirmed) return;
    try { await makeSessionCurrent(s.id); toast.success(`${s.name} is now the current session`); refresh(); }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Could not change the session'); }
  };

  const remove = async (s: any) => {
    const ok = await Swal.fire({ title: `Delete ${s.name}?`, icon: 'warning', showCancelButton: true, confirmButtonText: 'Delete', confirmButtonColor: '#e34948' });
    if (!ok.isConfirmed) return;
    try { await deleteSession(s.id); toast.success('Session deleted'); refresh(); }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Could not delete'); }
  };

  return (
    <section className="as-card">
      <div className="as-head">
        <CalendarRange size={18} color="#5156be" />
        <div><h2>Academic sessions</h2><p>Marks sheets and enrolments are filed under the current session, so each year's results stay separate.</p></div>
      </div>
      <div className="as-body">
        {isLoading ? <Loader2 size={20} className="as-spin" color="#5156be" /> : (
          <div style={{ overflowX: 'auto', marginBottom: 14 }}>
            <table className="as-table">
              <thead><tr><th>Session</th><th>Dates</th><th>Marks sheets</th><th /></tr></thead>
              <tbody>
                {(sessions as any[]).map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 700, color: '#1e293b' }}>{s.name} {s.current && <span className="as-current"><Star size={11} /> Current</span>}</td>
                    <td style={{ color: '#64748b' }}>{s.startDate ?? '—'} → {s.endDate ?? '—'}</td>
                    <td>{s.sheetCount}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {!s.current && <button className="as-ghost" onClick={() => setCurrent(s)}><CheckCircle2 size={13} /> Make current</button>}
                      {!s.current && s.sheetCount === 0 && <button className="as-icon" style={{ marginLeft: 6 }} onClick={() => remove(s)} aria-label={`Delete ${s.name}`}><Trash2 size={14} /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, alignItems: 'end' }}>
          <div><label className="as-label" htmlFor="as-sname">New session</label>
            <input id="as-sname" className="as-input" placeholder="e.g. 2026/2027" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div><label className="as-label" htmlFor="as-sstart">Starts</label>
            <input id="as-sstart" type="date" className="as-input" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} /></div>
          <div><label className="as-label" htmlFor="as-send">Ends</label>
            <input id="as-send" type="date" className="as-input" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} /></div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, fontSize: 13, fontWeight: 600, color: '#334155' }}>
            <input type="checkbox" checked={form.makeCurrent} onChange={e => setForm(f => ({ ...f, makeCurrent: e.target.checked }))} style={{ accentColor: '#5156be' }} /> Make current
          </label>
          <button className="as-btn" onClick={add} disabled={busy || !form.name.trim()}>{busy ? <Loader2 size={14} className="as-spin" /> : <Plus size={14} />} Add session</button>
        </div>
      </div>
    </section>
  );
}

function GradingCard() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['grading'], queryFn: getGradingSettings });
  const [bands, setBands] = useState<Band[]>([]);
  const [classes, setClasses] = useState<Klass[]>([]);
  const [credits, setCredits] = useState('3');
  const [maxCarry, setMaxCarry] = useState('');
  const [minCgpa, setMinCgpa] = useState('');
  const [preset, setPreset] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setBands(data.bands.map(toBand));
    setClasses(data.classes.map(toClass));
    setCredits(String(data.defaultCreditUnits));
    setMaxCarry(data.maxCarryoversForPromotion >= 0 ? String(data.maxCarryoversForPromotion) : '');
    setMinCgpa(Number(data.minCgpaForPromotion) > 0 ? String(data.minCgpaForPromotion) : '');
  }, [data]);

  const loadPreset = async () => {
    if (!preset) return;
    try {
      const p = await getGradingPreset(preset);
      setBands(p.bands.map(toBand));
      setClasses(p.classes.map(toClass));
      toast('Preset loaded — review it, then Save.', { icon: 'ℹ️' });
    } catch { toast.error('Could not load the preset'); }
  };

  const setBand = (i: number, k: keyof Band, v: any) => setBands(bs => bs.map((b, j) => j === i ? { ...b, [k]: v } : b));
  const setClass = (i: number, k: keyof Klass, v: string) => setClasses(cs => cs.map((c, j) => j === i ? { ...c, [k]: v } : c));

  const save = async () => {
    setSaving(true);
    try {
      await saveGradingSettings({
        bands: bands.map(b => ({ letter: b.letter, minScore: Number(b.minScore), gradePoint: Number(b.gradePoint), remark: b.remark, passing: b.passing })),
        classes: classes.map(c => ({ name: c.name, minCgpa: Number(c.minCgpa) })),
        defaultCreditUnits: Number(credits),
        maxCarryoversForPromotion: maxCarry.trim() === '' ? -1 : Number(maxCarry),
        minCgpaForPromotion: minCgpa.trim() === '' ? 0 : Number(minCgpa),
      });
      qc.invalidateQueries({ queryKey: ['grading'] });
      const again = await Swal.fire({
        title: 'Saved', icon: 'success',
        text: 'Re-grade marks on sheets that are not yet published with the new scale? Published results keep their grades.',
        showCancelButton: true, confirmButtonText: 'Re-grade unpublished', cancelButtonText: 'Not now', confirmButtonColor: '#5156be',
      });
      if (again.isConfirmed) {
        const r = await recalculateGrades();
        toast.success(`${r.updated} mark(s) re-graded`);
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Could not save');
    } finally { setSaving(false); }
  };

  if (isLoading) return <section className="as-card"><div className="as-body"><Loader2 size={20} className="as-spin" color="#5156be" /></div></section>;

  const sorted = [...bands].map((b, i) => ({ b, i })).sort((x, y) => Number(y.b.minScore) - Number(x.b.minScore));

  return (
    <section className="as-card">
      <div className="as-head">
        <Scale size={18} color="#5156be" />
        <div><h2>Grading scale, classes & promotion</h2><p>Used for every course grade, GPA, CGPA, transcript and promotion decision.</p></div>
      </div>
      <div className="as-body">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <select aria-label="Preset" className="as-input" style={{ maxWidth: 420 }} value={preset} onChange={e => setPreset(e.target.value)}>
            <option value="">Start from a preset…</option>
            {(data?.presets ?? []).map((p: any) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
          <button className="as-ghost" onClick={loadPreset} disabled={!preset}>Load preset</button>
        </div>

        <div className="as-grid">
          <div>
            <div className="as-label">Grades (score out of 100)</div>
            <div style={{ overflowX: 'auto' }}>
              <table className="as-table">
                <thead><tr><th>Grade</th><th>From score</th><th>Grade point</th><th>Remark</th><th>Pass</th><th /></tr></thead>
                <tbody>
                  {sorted.map(({ b, i }) => (
                    <tr key={i}>
                      <td><input aria-label="Grade letter" className="as-input" style={{ width: 60 }} value={b.letter} onChange={e => setBand(i, 'letter', e.target.value)} /></td>
                      <td><input aria-label="From score" type="number" min={0} max={100} className="as-input" style={{ width: 80 }} value={b.minScore} onChange={e => setBand(i, 'minScore', e.target.value)} /></td>
                      <td><input aria-label="Grade point" type="number" step="0.1" min={0} className="as-input" style={{ width: 80 }} value={b.gradePoint} onChange={e => setBand(i, 'gradePoint', e.target.value)} /></td>
                      <td><input aria-label="Remark" className="as-input" style={{ minWidth: 110 }} value={b.remark} onChange={e => setBand(i, 'remark', e.target.value)} /></td>
                      <td style={{ textAlign: 'center' }}><input aria-label="Passing grade" type="checkbox" checked={b.passing} onChange={e => setBand(i, 'passing', e.target.checked)} style={{ width: 16, height: 16, accentColor: '#0b7a0b' }} /></td>
                      <td><button className="as-icon" onClick={() => setBands(bs => bs.filter((_, j) => j !== i))} aria-label="Remove grade" disabled={bands.length <= 2}><Trash2 size={13} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="as-ghost" style={{ marginTop: 8 }} onClick={() => setBands(bs => [...bs, { letter: '', minScore: '', gradePoint: '', remark: '', passing: true }])}><Plus size={13} /> Add grade</button>
          </div>

          <div>
            <div className="as-label"><GraduationCap size={12} /> Class of degree (by CGPA)</div>
            <table className="as-table">
              <thead><tr><th>Class</th><th>From CGPA</th><th /></tr></thead>
              <tbody>
                {classes.map((c, i) => (
                  <tr key={i}>
                    <td><input aria-label="Class name" className="as-input" value={c.name} onChange={e => setClass(i, 'name', e.target.value)} /></td>
                    <td><input aria-label="From CGPA" type="number" step="0.01" min={0} className="as-input" style={{ width: 80 }} value={c.minCgpa} onChange={e => setClass(i, 'minCgpa', e.target.value)} /></td>
                    <td><button className="as-icon" onClick={() => setClasses(cs => cs.filter((_, j) => j !== i))} aria-label="Remove class"><Trash2 size={13} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="as-ghost" style={{ marginTop: 8 }} onClick={() => setClasses(cs => [...cs, { name: '', minCgpa: '' }])}><Plus size={13} /> Add class</button>

            <div style={{ marginTop: 18 }}>
              <label className="as-label" htmlFor="as-credits">Default credit units (courses without their own)</label>
              <input id="as-credits" type="number" min={0} max={30} className="as-input" style={{ maxWidth: 120 }} value={credits} onChange={e => setCredits(e.target.value)} />
            </div>

            <div style={{ marginTop: 18 }}>
              <div className="as-label">Promotion rules (moving students up a level)</div>
              <p className="as-note">Leave blank for no rule. Students who break a rule are held back by bulk promotion; only the Super Admin can override for one student.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label className="as-label" htmlFor="as-maxc">Max outstanding carry-overs</label>
                  <input id="as-maxc" type="number" min={0} className="as-input" placeholder="No limit" value={maxCarry} onChange={e => setMaxCarry(e.target.value)} /></div>
                <div><label className="as-label" htmlFor="as-minc">Minimum CGPA</label>
                  <input id="as-minc" type="number" step="0.01" min={0} className="as-input" placeholder="No minimum" value={minCgpa} onChange={e => setMinCgpa(e.target.value)} /></div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          <button className="as-ghost" onClick={async () => {
            try { const r = await recalculateGrades(); toast.success(`${r.updated} mark(s) re-graded`); }
            catch (e: any) { toast.error(e?.response?.data?.message ?? 'Could not re-grade'); }
          }}><RefreshCw size={13} /> Re-grade unpublished marks</button>
          <button className="as-btn" onClick={save} disabled={saving}>{saving && <Loader2 size={14} className="as-spin" />} Save settings</button>
        </div>
      </div>
    </section>
  );
}
