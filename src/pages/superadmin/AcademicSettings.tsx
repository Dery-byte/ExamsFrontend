import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { CalendarRange, Scale, Plus, Trash2, Loader2, CheckCircle2, Star, RefreshCw, GraduationCap, BookmarkPlus } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import {
  createSession, deleteSession, getGradingPreset, getGradingSettings, getSessions, makeSessionCurrent,
  recalculateGrades, saveGradingSettings, saveGradingPreset, deleteGradingPreset,
} from '../../api/endpoints';
import { getMode, isSchoolMode, tx } from '../../utils/terms';

type Band = { letter: string; minScore: string; gradePoint: string; remark: string; passing: boolean };
type Klass = { name: string; minCgpa: string };

const toBand = (b: any): Band => ({ letter: b.letter ?? '', minScore: String(b.minScore ?? ''), gradePoint: String(b.gradePoint ?? ''), remark: b.remark ?? '', passing: b.passing !== false });
const toClass = (c: any): Klass => ({ name: c.name ?? '', minCgpa: String(c.minCgpa ?? '') });

/** Super Admin: academic sessions, grading scale, degree classes, credit units and promotion rules. */
export default function AcademicSettings() {
  return (
    <div className="as" style={{ paddingBottom: 40 }}>
      <PageHeader title="Sessions & Grading" breadcrumbs={['Super Admin', 'Sessions & Grading']} />
      <SessionsCard />
      <GradingCard />
      <style>{ACADEMIC_CSS}</style>
    </div>
  );
}

function SessionsCard() {
  const qc = useQueryClient();
  const { data: sessions = [], isLoading, isError, refetch } = useQuery({ queryKey: ['sessions'], queryFn: getSessions });
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
    const ok = await Swal.fire({ title: `Make ${s.name} current?`, text: tx('New marks sheets and course enrolments will go into this session.'), icon: 'question', showCancelButton: true, confirmButtonText: 'Make current', confirmButtonColor: '#5156be' });
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
        <CalendarRange size={18} color="#5156be" style={{ flexShrink: 0, marginTop: 2 }} />
        <div><h2>Academic sessions</h2><p>Marks sheets and enrolments are filed under the current session, so each year's results stay separate.</p></div>
      </div>
      <div className="as-body">
        {isLoading ? <div className="as-loading"><Loader2 size={20} className="as-spin" color="#5156be" /></div>
        : isError ? (
          <p className="as-note as-warn">Couldn't load the sessions. <button type="button" className="as-link" onClick={() => refetch()}>Try again</button></p>
        ) : (sessions as any[]).length === 0 ? (
          <p className="as-note">No sessions yet. Add the first one below and make it current.</p>
        ) : (
          <div className="as-scroll" style={{ marginBottom: 14 }}>
            <table className="as-table as-sessions">
              <thead><tr><th>Session</th><th>Dates</th><th>Marks sheets</th><th /></tr></thead>
              <tbody>
                {(sessions as any[]).map(s => (
                  <tr key={s.id} className={s.current ? 'is-current' : undefined}>
                    <td className="as-c-title" style={{ fontWeight: 700, color: '#1e293b' }}>{s.name} {s.current && <span className="as-current"><Star size={11} /> Current</span>}</td>
                    <td data-label="Dates" style={{ color: '#64748b' }}>{s.startDate ?? '—'} → {s.endDate ?? '—'}</td>
                    <td data-label="Marks sheets">{s.sheetCount}</td>
                    <td className="as-c-actions">
                      <div className="as-row-actions">
                        {!s.current && <button type="button" className="as-ghost" onClick={() => setCurrent(s)}><CheckCircle2 size={13} /> Make current</button>}
                        {!s.current && s.sheetCount === 0 && <button type="button" className="as-icon" onClick={() => remove(s)} aria-label={`Delete ${s.name}`} title="Delete session"><Trash2 size={14} /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="as-new-session">
          <div><label className="as-label" htmlFor="as-sname">New session</label>
            <input id="as-sname" className="as-input" placeholder="e.g. 2026/2027" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div><label className="as-label" htmlFor="as-sstart">Starts</label>
            <input id="as-sstart" type="date" className="as-input" value={form.startDate} max={form.endDate || undefined} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} /></div>
          <div><label className="as-label" htmlFor="as-send">Ends</label>
            <input id="as-send" type="date" className="as-input" value={form.endDate} min={form.startDate || undefined} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} /></div>
          <label className="as-check">
            <input type="checkbox" checked={form.makeCurrent} onChange={e => setForm(f => ({ ...f, makeCurrent: e.target.checked }))} /> Make current
          </label>
          <button type="button" className="as-btn" onClick={add} disabled={busy || !form.name.trim()}>{busy ? <Loader2 size={14} className="as-spin" /> : <Plus size={14} />} Add session</button>
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

  const allPresets: any[] = data?.presets ?? [];
  // Only the presets that fit the system mode (saved presets always show)
  const SCHOOL_PRESETS: Record<string, string[]> = {
    SHS: ['GH_SHS'], BASIC: ['GH_PRIMARY', 'GH_JHS'], ALL_SCHOOLS: ['GH_PRIMARY', 'GH_JHS', 'GH_SHS'],
  };
  const allSchoolKeys = SCHOOL_PRESETS.ALL_SCHOOLS;
  const builtIn = allPresets.filter(p => p.builtIn && (isSchoolMode()
    ? (SCHOOL_PRESETS[getMode()] ?? []).includes(p.key)
    : !allSchoolKeys.includes(p.key)));
  const custom = allPresets.filter(p => !p.builtIn);
  const selectedPreset = allPresets.find(p => p.key === preset);

  const formBands = () => bands.map(b => ({ letter: b.letter, minScore: Number(b.minScore), gradePoint: Number(b.gradePoint), remark: b.remark, passing: b.passing }));
  const formClasses = () => classes.map(c => ({ name: c.name, minCgpa: Number(c.minCgpa) }));

  /** Saves the grades and classes currently in the form as a named preset. */
  const savePresetFromForm = async () => {
    const r = await Swal.fire({
      title: 'Save as preset',
      html: '<p style="margin:0 0 8px;font-size:14px">Saves the grades and classes shown below so you can load them again later.</p>'
        + '<input id="ps-name" class="swal2-input" placeholder="Preset name, e.g. Mock exams scale" maxlength="80" style="margin:6px auto">'
        + '<input id="ps-desc" class="swal2-input" placeholder="Short description (optional)" maxlength="300" style="margin:6px auto">',
      showCancelButton: true, confirmButtonText: 'Save preset', confirmButtonColor: '#5156be', focusConfirm: false,
      preConfirm: () => {
        const name = (document.getElementById('ps-name') as HTMLInputElement).value.trim();
        if (!name) { Swal.showValidationMessage('Give the preset a name'); return false; }
        return { name, description: (document.getElementById('ps-desc') as HTMLInputElement).value.trim() };
      },
    });
    if (!r.isConfirmed || !r.value) return;
    try {
      const next = await saveGradingPreset({ ...r.value, bands: formBands(), classes: formClasses() });
      qc.setQueryData(['grading'], (old: any) => ({ ...(old ?? {}), presets: next.presets }));
      toast.success(`Preset "${r.value.name}" saved`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Could not save the preset');
    }
  };

  const removePreset = async () => {
    if (!selectedPreset || selectedPreset.builtIn) return;
    const ok = await Swal.fire({ title: `Delete "${selectedPreset.label}"?`, text: 'The current grading scale is not affected.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Delete', confirmButtonColor: '#e34948' });
    if (!ok.isConfirmed) return;
    try {
      const next = await deleteGradingPreset(selectedPreset.id);
      qc.setQueryData(['grading'], (old: any) => ({ ...(old ?? {}), presets: next.presets }));
      setPreset('');
      toast.success('Preset deleted');
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Could not delete the preset');
    }
  };

  const setBand = (i: number, k: keyof Band, v: any) => setBands(bs => bs.map((b, j) => j === i ? { ...b, [k]: v } : b));
  const setClass = (i: number, k: keyof Klass, v: string) => setClasses(cs => cs.map((c, j) => j === i ? { ...c, [k]: v } : c));

  const save = async () => {
    setSaving(true);
    try {
      await saveGradingSettings({
        bands: formBands(),
        classes: formClasses(),
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

  if (isLoading) return <section className="as-card"><div className="as-body as-loading"><Loader2 size={20} className="as-spin" color="#5156be" /></div></section>;

  const sorted = [...bands].map((b, i) => ({ b, i })).sort((x, y) => Number(y.b.minScore) - Number(x.b.minScore));

  return (
    <section className="as-card">
      <div className="as-head">
        <Scale size={18} color="#5156be" style={{ flexShrink: 0, marginTop: 2 }} />
        <div><h2>{isSchoolMode() ? 'Grading scale & promotion' : 'Grading scale, classes & promotion'}</h2>
          <p>{isSchoolMode() ? tx('Used for every subject grade on terminal reports and for promotion.') : tx("Used for every course grade, GPA, CGPA, transcript and promotion decision.")}</p></div>
      </div>
      <div className="as-body">
        <div className="as-presets">
          <select aria-label="Preset" className="as-input as-preset-select" value={preset} onChange={e => setPreset(e.target.value)}>
            <option value="">Start from a preset…</option>
            <optgroup label="Built-in">
              {builtIn.map((p: any) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </optgroup>
            {custom.length > 0 && (
              <optgroup label="Saved by you">
                {custom.map((p: any) => <option key={p.key} value={p.key}>{p.label}</option>)}
              </optgroup>
            )}
          </select>
          <button type="button" className="as-ghost" onClick={loadPreset} disabled={!preset}>Load preset</button>
          {selectedPreset && !selectedPreset.builtIn && (
            <button type="button" className="as-ghost" style={{ color: '#b42323' }} onClick={removePreset}><Trash2 size={13} /> Delete preset</button>
          )}
          <span className="as-spacer" />
          <button type="button" className="as-ghost" onClick={savePresetFromForm}><BookmarkPlus size={13} /> Save as preset…</button>
        </div>
        {selectedPreset?.description && <p className="as-note" style={{ marginBottom: 12 }}>{selectedPreset.description}</p>}
        {!selectedPreset && <div style={{ height: 6 }} />}

        <div className="as-grid">
          <div>
            <div className="as-label">Grades (score out of 100)</div>
            <div className="as-scroll">
              <table className="as-table as-bands">
                <thead><tr><th>Grade</th><th>From score</th><th>Grade point</th><th>Remark</th><th>Pass</th><th /></tr></thead>
                <tbody>
                  {sorted.map(({ b, i }) => (
                    <tr key={i}>
                      <td data-label="Grade"><input aria-label="Grade letter" className="as-input as-w-letter" value={b.letter} onChange={e => setBand(i, 'letter', e.target.value)} /></td>
                      <td data-label="From score"><input aria-label="From score" type="number" inputMode="decimal" min={0} max={100} className="as-input as-w-num" value={b.minScore} onChange={e => setBand(i, 'minScore', e.target.value)} /></td>
                      <td data-label="Grade point"><input aria-label="Grade point" type="number" inputMode="decimal" step="0.1" min={0} className="as-input as-w-num" value={b.gradePoint} onChange={e => setBand(i, 'gradePoint', e.target.value)} /></td>
                      <td data-label="Remark" className="as-c-remark"><input aria-label="Remark" className="as-input as-w-remark" value={b.remark} onChange={e => setBand(i, 'remark', e.target.value)} /></td>
                      <td className="as-c-pass"><label className="as-pass"><input aria-label="Passing grade" type="checkbox" checked={b.passing} onChange={e => setBand(i, 'passing', e.target.checked)} /><span>Pass</span></label></td>
                      <td className="as-c-del"><button type="button" className="as-icon" onClick={() => setBands(bs => bs.filter((_, j) => j !== i))} aria-label={`Remove grade ${b.letter}`.trim()} title={bands.length <= 2 ? 'Keep at least two grades' : 'Remove grade'} disabled={bands.length <= 2}><Trash2 size={13} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" className="as-ghost" style={{ marginTop: 8 }} onClick={() => setBands(bs => [...bs, { letter: '', minScore: '', gradePoint: '', remark: '', passing: true }])}><Plus size={13} /> Add grade</button>
          </div>

          <div>
            {!isSchoolMode() && <>
            <div className="as-label"><GraduationCap size={12} /> Class of degree (by CGPA) — optional</div>
            {classes.length === 0 && <p className="as-note">No classes: transcripts won't show a class. Typical for primary, JHS and SHS.</p>}
            <table className="as-table as-classes">
              <thead><tr><th>Class</th><th>From CGPA</th><th /></tr></thead>
              <tbody>
                {classes.map((c, i) => (
                  <tr key={i}>
                    <td className="as-c-name"><input aria-label="Class name" className="as-input" placeholder="Class, e.g. First Class" value={c.name} onChange={e => setClass(i, 'name', e.target.value)} /></td>
                    <td><input aria-label="From CGPA" type="number" inputMode="decimal" step="0.01" min={0} className="as-input as-w-num" placeholder="CGPA" value={c.minCgpa} onChange={e => setClass(i, 'minCgpa', e.target.value)} /></td>
                    <td className="as-c-del"><button type="button" className="as-icon" onClick={() => setClasses(cs => cs.filter((_, j) => j !== i))} aria-label="Remove class"><Trash2 size={13} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" className="as-ghost" style={{ marginTop: 8 }} onClick={() => setClasses(cs => [...cs, { name: '', minCgpa: '' }])}><Plus size={13} /> Add class</button>

            <div style={{ marginTop: 18 }}>
              <label className="as-label" htmlFor="as-credits">{tx("Default credit units (courses without their own)")}</label>
              <input id="as-credits" type="number" inputMode="numeric" min={0} max={30} className="as-input" style={{ maxWidth: 120 }} value={credits} onChange={e => setCredits(e.target.value)} />
            </div>
            </>}

            <div style={{ marginTop: 18 }}>
              <div className="as-label">{tx("Promotion rules (moving students up a level)")}</div>
              <p className="as-note">{tx("Leave blank for no rule. Students who break a rule are held back by bulk promotion; only the Super Admin can override for one student.")}</p>
              <div className="as-rules">
                <div><label className="as-label" htmlFor="as-maxc">{isSchoolMode() ? tx('Max failed courses') : 'Max outstanding carry-overs'}</label>
                  <input id="as-maxc" type="number" inputMode="numeric" min={0} className="as-input" placeholder="No limit" value={maxCarry} onChange={e => setMaxCarry(e.target.value)} /></div>
                {!isSchoolMode() && <div><label className="as-label" htmlFor="as-minc">Minimum CGPA</label>
                  <input id="as-minc" type="number" inputMode="decimal" step="0.01" min={0} className="as-input" placeholder="No minimum" value={minCgpa} onChange={e => setMinCgpa(e.target.value)} /></div>}
              </div>
            </div>
          </div>
        </div>

        <div className="as-foot">
          <button type="button" className="as-ghost" onClick={async () => {
            try { const r = await recalculateGrades(); toast.success(`${r.updated} mark(s) re-graded`); }
            catch (e: any) { toast.error(e?.response?.data?.message ?? 'Could not re-grade'); }
          }}><RefreshCw size={13} /> Re-grade unpublished marks</button>
          <button type="button" className="as-btn" onClick={save} disabled={saving}>{saving && <Loader2 size={14} className="as-spin" />} Save settings</button>
        </div>
      </div>
    </section>
  );
}

const ACADEMIC_CSS = `
.as { container: as / inline-size; }
.as-card { background: #fff; border: 1.5px solid #e2e8f0; border-radius: 14px; box-shadow: 0 2px 16px rgba(0,0,0,0.05); margin-bottom: 18px; overflow: hidden; }
.as-head { display: flex; align-items: flex-start; gap: 10px; padding: 14px 18px; border-bottom: 1px solid #f1f5f9; }
.as-head h2 { margin: 0; font-size: 15px; font-weight: 800; color: #1e293b; }
.as-head p { margin: 2px 0 0; font-size: 12px; color: #64748b; line-height: 1.45; }
.as-body { padding: 14px 18px; }
.as-loading { display: flex; justify-content: center; padding: 24px 0; }
.as-input { height: 36px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 13px; padding: 0 10px; background: #fff; color: #1e293b; font-family: inherit; width: 100%; min-width: 0; box-sizing: border-box; transition: border-color .15s, box-shadow .15s; }
.as-input:focus { border-color: #5156be; outline: none; box-shadow: 0 0 0 3px rgba(81,86,190,0.15); }
.as-label { display: flex; align-items: center; gap: 4px; font-size: 11.5px; font-weight: 700; color: #475569; margin-bottom: 4px; }
.as-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 36px; padding: 0 14px; border: none; border-radius: 8px; background: #5156be; color: #fff; font-weight: 700; font-size: 13px; cursor: pointer; white-space: nowrap; font-family: inherit; }
.as-btn:hover:not(:disabled) { filter: brightness(1.08); }
.as-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.as-ghost { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 34px; padding: 0 12px; border-radius: 8px; border: 1.5px solid #e2e8f0; background: #fff; color: #475569; font-weight: 600; font-size: 12.5px; cursor: pointer; white-space: nowrap; font-family: inherit; }
.as-ghost:hover:not(:disabled) { background: #f8fafc; border-color: #cbd5e1; }
.as-ghost:disabled { opacity: .55; cursor: not-allowed; }
.as-icon { width: 32px; height: 32px; border-radius: 8px; border: 1px solid #fee2e2; background: #fff5f5; color: #e34948; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.as-icon:disabled { opacity: .4; cursor: not-allowed; }
.as-btn:focus-visible, .as-ghost:focus-visible, .as-icon:focus-visible, .as-link:focus-visible { outline: 2px solid #5156be; outline-offset: 2px; }
.as-link { background: none; border: none; padding: 0; color: #5156be; font: inherit; font-weight: 700; cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }
.as-scroll { overflow-x: auto; }
.as-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.as-table th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; padding: 8px 10px; border-bottom: 1px solid #eef0f4; white-space: nowrap; }
.as-table td { padding: 6px 10px; border-bottom: 1px solid #f4f5f8; vertical-align: middle; }
.as-sessions td { padding: 10px; }
.as-sessions tr.is-current td { background: #f8f9ff; }
.as-row-actions { display: flex; gap: 6px; justify-content: flex-end; align-items: center; }
.as-current { display: inline-flex; align-items: center; gap: 4px; margin-left: 4px; font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 10px; background: #eef2ff; color: #4338ca; vertical-align: 1px; white-space: nowrap; }
.as-new-session { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(150px, 100%), 1fr)); gap: 10px; align-items: end; padding-top: 14px; border-top: 1px dashed #e2e8f0; }
.as-check { display: flex; align-items: center; gap: 8px; height: 36px; font-size: 13px; font-weight: 600; color: #334155; cursor: pointer; user-select: none; }
.as-check input { width: 16px; height: 16px; accent-color: #5156be; }
.as-presets { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 6px; }
.as-preset-select { max-width: 460px; flex: 1 1 260px; }
.as-spacer { flex: 1; }
.as-w-letter { width: 64px; }
.as-w-num { width: 84px; }
.as-w-remark { min-width: 110px; }
.as-c-pass { text-align: center; }
.as-pass { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
.as-pass input { width: 16px; height: 16px; accent-color: #0b7a0b; margin: 0; }
.as-pass span { display: none; font-size: 12.5px; font-weight: 600; color: #334155; }
.as-grid { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 18px; }
.as-rules { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(160px, 100%), 1fr)); gap: 10px; }
.as-note { font-size: 12px; color: #64748b; background: #f8fafc; border: 1px solid #eef0f4; border-radius: 8px; padding: 8px 10px; margin: 0 0 12px; line-height: 1.5; }
.as-warn { background: #fff7ed; border-color: #fed7aa; color: #9a3412; }
.as-foot { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; padding-top: 14px; border-top: 1px solid #f1f5f9; flex-wrap: wrap; }
.as-spin { animation: as-spin 1s linear infinite; }
@keyframes as-spin { to { transform: rotate(360deg); } }

/* Sized by the content area, so the desktop sidebar is accounted for */
@container as (max-width: 980px) { .as-grid { grid-template-columns: minmax(0, 1fr); gap: 22px; } }
@container as (max-width: 600px) {
  .as-head { padding: 12px 14px; }
  .as-body { padding: 12px 14px; }
  .as-preset-select { flex-basis: 100%; max-width: none; }
  .as-presets > .as-ghost { flex: 1 1 auto; }
  .as-spacer { display: none; }
  .as-foot > button { flex: 1 1 auto; }

  /* Rows become small cards with their labels */
  .as-sessions thead, .as-bands thead, .as-classes thead { display: none; }
  .as-sessions, .as-sessions tbody, .as-bands, .as-bands tbody, .as-classes, .as-classes tbody { display: block; }
  .as-sessions tr, .as-bands tr { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 8px 12px; padding: 12px 0; border-bottom: 1px solid #f1f5f9; }
  .as-sessions tr.is-current { background: #f8f9ff; margin: 0 -14px; padding: 12px 14px; }
  .as-sessions td, .as-bands td, .as-classes td { display: block; padding: 0; border: none; background: none !important; min-width: 0; }
  .as-sessions td[data-label]::before, .as-bands td[data-label]::before { content: attr(data-label); display: block; font-size: 10.5px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: #94a3b8; margin-bottom: 3px; }
  .as-c-title { grid-column: 1 / -1; }
  .as-sessions .as-c-actions { grid-column: 1 / -1; }
  .as-sessions .as-c-actions .as-row-actions { justify-content: flex-start; }
  .as-sessions .as-c-actions .as-row-actions:empty { display: none; }

  .as-bands tr { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .as-bands .as-c-remark { grid-column: 1 / -1; }
  .as-bands .as-c-pass { grid-column: 1 / 3; text-align: left; align-self: center; }
  .as-bands .as-c-del { justify-self: end; align-self: center; }
  .as-pass span { display: inline; }
  .as-w-letter, .as-w-num, .as-w-remark { width: 100%; min-width: 0; }

  .as-classes tr { display: grid; grid-template-columns: minmax(0, 1fr) 96px auto; gap: 8px; align-items: center; padding: 6px 0; }
}
@media (max-width: 640px) {
  /* 16px stops iOS Safari zooming into a field when it gets focus */
  .as-input { font-size: 16px; }
}
@media (pointer: coarse) {
  .as-input, .as-btn { height: 44px; }
  .as-ghost { height: 40px; }
  .as-icon { width: 40px; height: 40px; }
  .as-check { height: 44px; }
  .as-check input, .as-pass input { width: 20px; height: 20px; }
}
`;
