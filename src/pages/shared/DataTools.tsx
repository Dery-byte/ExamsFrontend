import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { Upload, Download, FileSpreadsheet, Loader2, CheckCircle2, XCircle, Users, KeyRound, BookPlus, FileDown, Mail } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import {
  bulkEnroll, getPrograms, getProgramsByDept, getResultsSummary, importRows, type ImportType,
} from '../../api/endpoints';
import { downloadWorkbook, readRows, slug } from '../../utils/spreadsheet';
import { defaultLevels, periodName, periodsPerLevel, tx } from '../../utils/terms';

const TEMPLATES: Record<ImportType, { label: string; columns: string[]; example: string[]; notes: string }> = {
  students: {
    label: tx('Students'),
    columns: ['First Name', 'Last Name', 'Student ID', 'Email', 'Phone', 'Program', 'Level', 'Semester', 'Password'],
    example: ['Ama', 'Mensah', 'PS/CSC/24/0001', 'ama.mensah@stu.ucc.edu.gh', '0240000000', 'BCS', '100', '1', ''],
    notes: 'Program = program code or exact name. Semester defaults to 1. Leave Password empty to generate a temporary one.',
  },
  lecturers: {
    label: tx('Lecturers'),
    columns: ['First Name', 'Last Name', 'Staff ID', 'Email', 'Phone', 'Department', 'Password'],
    example: ['Kofi', 'Owusu', 'STF1024', 'k.owusu@ucc.edu.gh', '0200000000', 'CSIT', ''],
    notes: 'Department = department code or exact name. Leave Password empty to generate a temporary one.',
  },
  courses: {
    label: tx('Courses'),
    columns: ['Course Code', 'Title', 'Level', 'Semester', 'Credit Units', 'Programs', 'Lecturer', 'Description'],
    example: ['CSC201', 'Data Structures', '200', '1', '3', 'BCS;BIT', 'STF1024', ''],
    notes: 'Programs = codes separated by ";" (empty = global course, Super Admin only). Lecturer = staff ID (optional).',
  },
};

type Tab = 'import' | 'enroll' | 'export';

/** Super Admin / HOD: bulk import, bulk enrolment and results export. */
export default function DataTools() {
  const [tab, setTab] = useState<Tab>('import');
  const { user } = useAuth() as any;
  const isSuper = user?.role === 'SUPER_ADMIN';
  const [programs, setPrograms] = useState<any[]>([]);

  useEffect(() => {
    const load = isSuper ? getPrograms() : user?.department?.id ? getProgramsByDept(user.department.id) : Promise.resolve([]);
    load.then((d: any) => setPrograms(Array.isArray(d) ? d : [])).catch(() => {});
  }, [isSuper, user]);

  return (
    <div style={{ paddingBottom: 40 }}>
      <PageHeader title="Data Tools" breadcrumbs={['Administration', 'Data Tools']} />
      <div role="tablist" className="dt-tabs">
        {([['import', 'Bulk import', Upload], ['enroll', 'Bulk enrolment', BookPlus], ['export', 'Export results', FileDown]] as const).map(([k, l, Icon]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'is-active' : ''} onClick={() => setTab(k)}><Icon size={15} /> {l}</button>
        ))}
      </div>
      {tab === 'import' && <ImportPanel isSuper={isSuper} />}
      {tab === 'enroll' && <EnrollPanel programs={programs} />}
      {tab === 'export' && <ExportPanel programs={programs} />}

      <style>{`
        .dt-tabs { display: flex; gap: 4px; border-bottom: 1px solid #e2e8f0; margin-bottom: 16px; flex-wrap: wrap; }
        .dt-tabs button { display: inline-flex; align-items: center; gap: 6px; padding: 10px 14px; border: none; background: none; font-size: 13.5px; font-weight: 700; color: #64748b; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; }
        .dt-tabs button.is-active { color: #5156be; border-bottom-color: #5156be; }
        .dt-card { background: #fff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 16px 18px; margin-bottom: 14px; }
        .dt-row { display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-end; }
        .dt-field { display: flex; flex-direction: column; gap: 4px; font-size: 11.5px; font-weight: 700; color: #475569; flex: 1 1 160px; }
        .dt-input { height: 38px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 13px; padding: 0 10px; background: #fff; color: #1e293b; font-family: inherit; }
        .dt-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 38px; padding: 0 16px; border: none; border-radius: 8px; background: #5156be; color: #fff; font-weight: 700; font-size: 13px; cursor: pointer; white-space: nowrap; }
        .dt-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .dt-ghost { display: inline-flex; align-items: center; gap: 6px; height: 38px; padding: 0 14px; border-radius: 8px; border: 1.5px solid #e2e8f0; background: #fff; color: #475569; font-weight: 600; font-size: 13px; cursor: pointer; white-space: nowrap; }
        .dt-note { font-size: 12.5px; color: #64748b; margin: 8px 0 0; line-height: 1.5; }
        .dt-drop { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 26px; border: 2px dashed #cbd5e1; border-radius: 12px; color: #64748b; cursor: pointer; text-align: center; background: #f8fafc; }
        .dt-drop:hover, .dt-drop.is-over { border-color: #5156be; background: #f5f6ff; }
        .dt-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .dt-table th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; padding: 8px 10px; border-bottom: 1px solid #eef0f4; background: #f8fafc; }
        .dt-table td { padding: 8px 10px; border-bottom: 1px solid #f4f5f8; vertical-align: top; }
        .dt-ok { display: inline-flex; align-items: center; gap: 4px; color: #0b7a0b; font-weight: 700; font-size: 12px; }
        .dt-bad { display: inline-flex; align-items: center; gap: 4px; color: #b42323; font-weight: 700; font-size: 12px; }
        .dt-stats { display: flex; gap: 10px; flex-wrap: wrap; margin: 12px 0; }
        .dt-stat { background: #f8fafc; border: 1px solid #eef0f4; border-radius: 10px; padding: 8px 14px; font-size: 12px; color: #64748b; }
        .dt-stat b { display: block; font-size: 20px; color: #1e293b; }
        .dt-warn { display: flex; gap: 8px; align-items: flex-start; background: #fff7e6; border: 1px solid #fde8b8; color: #7a4d00; border-radius: 10px; padding: 10px 12px; font-size: 13px; margin-top: 12px; }
      `}</style>
    </div>
  );
}

/* ── Import ─────────────────────────────────────────────────────────── */

function ImportPanel({ isSuper }: { isSuper: boolean }) {
  const [type, setType] = useState<ImportType>('students');
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [notify, setNotify] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const tpl = TEMPLATES[type];
  const isPeople = type !== 'courses';

  const reset = () => { setRows([]); setResult(null); setFileName(''); };

  const downloadTemplate = () => downloadWorkbook(`${type}-import-template`, [{ name: tpl.label, rows: [tpl.columns, tpl.example] }]);

  const check = async (data: Record<string, string>[]) => {
    setBusy(true);
    try { setResult(await importRows(type, data, false)); }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Could not check the file'); setResult(null); }
    finally { setBusy(false); }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!/\.(csv|xlsx|xls)$/i.test(file.name)) { toast.error('Choose a .csv, .xlsx or .xls file'); return; }
    try {
      const data = await readRows(file);
      if (!data.length) { toast.error('No data rows found in that file'); return; }
      setFileName(file.name);
      setRows(data);
      await check(data);
    } catch { toast.error('That file could not be read'); }
  };

  const commit = async () => {
    const invalid = result.total - result.valid;
    const ok = await Swal.fire({
      title: `Import ${result.valid} ${tpl.label.toLowerCase()}?`,
      text: (invalid ? `${invalid} row(s) with problems will be skipped.` : 'All rows passed the checks.')
        + (isPeople && notify ? ' Each new user will be emailed their username and temporary password.' : ''),
      icon: 'question', showCancelButton: true, confirmButtonText: 'Import', confirmButtonColor: '#5156be',
    });
    if (!ok.isConfirmed) return;
    setBusy(true);
    try {
      const res = await importRows(type, rows, true, isPeople && notify);
      setResult(res);
      toast.success(`${res.created} ${tpl.label.toLowerCase()} imported`);
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Import failed'); }
    finally { setBusy(false); }
  };

  const downloadCredentials = () => downloadWorkbook(`${type}-login-details`, [{
    name: 'Login details',
    rows: result.credentials.map((c: any) => ({ Name: c.name, 'Login ID': c.username, Email: c.email, 'Temporary password': c.password })),
  }]);

  const problems = useMemo(() => (result?.rows ?? []).filter((r: any) => !r.ok), [result]);

  return (
    <>
      <section className="dt-card">
        <div className="dt-row">
          <label className="dt-field" style={{ flex: '0 1 220px' }}>What are you importing?
            <select className="dt-input" value={type} onChange={e => { setType(e.target.value as ImportType); reset(); }}>
              {(Object.keys(TEMPLATES) as ImportType[]).map(t => <option key={t} value={t}>{TEMPLATES[t].label}</option>)}
            </select>
          </label>
          <button className="dt-ghost" onClick={downloadTemplate}><FileSpreadsheet size={15} /> Download template</button>
        </div>
        <p className="dt-note"><b>Columns:</b> {tpl.columns.join(', ')}. {tpl.notes}{!isSuper && ' You can only import into your own department.'}</p>
      </section>

      <section className="dt-card">
        <div
          className={`dt-drop ${over ? 'is-over' : ''}`}
          role="button" tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
          onDragOver={e => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={e => { e.preventDefault(); setOver(false); onFile(e.dataTransfer.files?.[0]); }}
        >
          <Upload size={24} />
          <strong style={{ color: '#1e293b' }}>{fileName || 'Choose or drop a CSV / Excel file'}</strong>
          <span style={{ fontSize: 12 }}>{rows.length ? `${rows.length} row(s) read` : 'The first row must be the column headings'}</span>
        </div>
        <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" hidden onChange={e => { onFile(e.target.files?.[0]); e.target.value = ''; }} />

        {busy && <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}><Loader2 size={22} color="#5156be" style={{ animation: 'spin 1s linear infinite' }} /></div>}

        {result && !busy && (
          <>
            <div className="dt-stats">
              <div className="dt-stat"><b>{result.total}</b>rows</div>
              <div className="dt-stat"><b>{result.valid}</b>ready</div>
              <div className="dt-stat"><b>{result.total - result.valid}</b>with problems</div>
              {result.committed && <div className="dt-stat"><b>{result.created}</b>imported</div>}
            </div>

            {problems.length > 0 && (
              <div style={{ overflowX: 'auto', maxHeight: 360, overflowY: 'auto', border: '1px solid #eef0f4', borderRadius: 10 }}>
                <table className="dt-table">
                  <thead><tr><th>Row</th><th>Record</th><th>Problem</th></tr></thead>
                  <tbody>
                    {problems.map((r: any) => (
                      <tr key={r.row}>
                        <td>{r.row}</td>
                        <td style={{ color: '#1e293b', fontWeight: 600 }}>{r.summary || '—'}</td>
                        <td><span className="dt-bad"><XCircle size={12} /> {r.errors.join(' ')}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {problems.length === 0 && !result.committed && <span className="dt-ok"><CheckCircle2 size={14} /> Every row passed the checks.</span>}

            {isPeople && !result.committed && (
              <label className="dt-note" style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={notify} onChange={e => setNotify(e.target.checked)} />
                Email each new user their username and temporary password
              </label>
            )}
            {result.committed && result.emailed > 0 && (
              <span className="dt-ok" style={{ marginTop: 8 }}><Mail size={14} /> Login details are being emailed to {result.emailed} user(s).</span>
            )}

            <div className="dt-row" style={{ marginTop: 12 }}>
              {!result.committed && (
                <button className="dt-btn" disabled={!result.valid} onClick={commit}>
                  <Users size={15} /> Import {result.valid} {tpl.label.toLowerCase()}
                </button>
              )}
              <button className="dt-ghost" onClick={reset}>Start over</button>
            </div>

            {result.committed && result.credentials?.length > 0 && (
              <div className="dt-warn">
                <KeyRound size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <b>{result.credentials.length} temporary password(s) were generated.</b> Download them now — they are not stored anywhere readable and can't be shown again.
                  {result.emailed > 0 ? ' Each person has also been emailed their own login details; keep this file as a backup in case an email does not arrive.' : ' Ask each person to change their password after first sign-in.'}
                  <div style={{ marginTop: 8 }}><button className="dt-btn" onClick={downloadCredentials}><Download size={14} /> Download login details</button></div>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}

/* ── Bulk enrolment ─────────────────────────────────────────────────── */

function ProgramLevelPicker({ programs, programId, setProgramId, level, setLevel, requireLevel }: {
  programs: any[]; programId: number | ''; setProgramId: (v: number | '') => void; level: number | ''; setLevel: (v: number | '') => void; requireLevel: boolean;
}) {
  const levels: number[] = programs.find(p => p.id === programId)?.configuredLevels ?? defaultLevels();
  return (
    <>
      <label className="dt-field">{tx("Program")}<select className="dt-input" value={programId} onChange={e => { setProgramId(e.target.value ? Number(e.target.value) : ''); setLevel(''); }}>
          <option value="">{tx("Choose a program…")}</option>
          {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      <label className="dt-field" style={{ flex: '0 1 150px' }}>{tx("Level")}<select className="dt-input" value={level} onChange={e => setLevel(e.target.value ? Number(e.target.value) : '')}>
          <option value="">{requireLevel ? 'Choose…' : tx('All levels')}</option>
          {levels.map(l => <option key={l} value={l}>{tx("Level ")}{l}</option>)}
        </select>
      </label>
    </>
  );
}

function EnrollPanel({ programs }: { programs: any[] }) {
  const [programId, setProgramId] = useState<number | ''>('');
  const [level, setLevel] = useState<number | ''>('');
  const [semester, setSemester] = useState<number | ''>('');
  const [preview, setPreview] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setPreview(null); }, [programId, level, semester]);

  const run = async (commit: boolean) => {
    if (!programId || !level) return;
    setBusy(true);
    try {
      const res = await bulkEnroll({ programId, level, semester: semester || null }, commit);
      setPreview(res);
      if (commit) toast.success(`${res.created} enrolment(s) created`);
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Could not enrol'); }
    finally { setBusy(false); }
  };

  return (
    <section className="dt-card">
      <div className="dt-row">
        <ProgramLevelPicker programs={programs} programId={programId} setProgramId={setProgramId} level={level} setLevel={setLevel} requireLevel />
        <label className="dt-field" style={{ flex: '0 1 150px' }}>{tx("Semester")}<select className="dt-input" value={semester} onChange={e => setSemester(e.target.value ? Number(e.target.value) : '')}>
            <option value="">{tx("All semesters")}</option>{Array.from({ length: periodsPerLevel() }, (_, i) => i + 1).map(n => <option key={n} value={n}>{periodName(n)}</option>)}
          </select>
        </label>
        <button className="dt-ghost" disabled={!programId || !level || busy} onClick={() => run(false)}>Preview</button>
      </div>
      <p className="dt-note">{tx("Enrols every active student at this program and level in all of the level's courses for the program. Existing enrolments are kept; deactivated students are skipped.")}</p>

      {busy && <div style={{ padding: 16, textAlign: 'center' }}><Loader2 size={22} color="#5156be" style={{ animation: 'spin 1s linear infinite' }} /></div>}
      {preview && !busy && (
        <>
          <div className="dt-stats">
            <div className="dt-stat"><b>{preview.students}</b>{tx("students")}</div>
            <div className="dt-stat"><b>{preview.courses.length}</b>{tx("courses")}</div>
            <div className="dt-stat"><b>{preview.alreadyEnrolled}</b>already enrolled</div>
            <div className="dt-stat"><b>{preview.committed ? preview.created : preview.toCreate}</b>{preview.committed ? 'created' : 'to create'}</div>
          </div>
          {preview.courses.length > 0 && (
            <p className="dt-note"><b>{tx("Courses:")}</b> {preview.courses.map((c: any) => `${c.courseCode} ${c.title}`).join(' · ')}</p>
          )}
          {!preview.committed && (
            <div className="dt-row" style={{ marginTop: 12 }}>
              <button className="dt-btn" disabled={!preview.toCreate} onClick={() => run(true)}><BookPlus size={15} /> Enrol {preview.toCreate}</button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

/* ── Export ─────────────────────────────────────────────────────────── */

function ExportPanel({ programs }: { programs: any[] }) {
  const [programId, setProgramId] = useState<number | ''>('');
  const [level, setLevel] = useState<number | ''>('');
  const [busy, setBusy] = useState(false);

  const exportResults = async () => {
    if (!programId) return;
    setBusy(true);
    try {
      const rows: any[] = await getResultsSummary(programId, level);
      if (!rows.length) { toast(tx('No students found for that selection'), { icon: 'ℹ️' }); return; }
      const program = programs.find(p => p.id === programId)?.name ?? 'program';
      downloadWorkbook(`results-${slug(program)}${level ? `-L${level}` : ''}`, [{
        name: 'Results',
        rows: rows.map(r => ({
          'Student ID': r.studentId, Name: r.name, Email: r.email, Program: r.program, Level: r.level, Semester: r.semester,
          'Credits attempted': r.creditsAttempted, 'Credits earned': r.creditsEarned,
          CGPA: r.cgpa == null ? '' : Number(r.cgpa), Class: r.class ?? '', 'Outstanding courses': r.outstandingCourses,
          'Meets promotion rules': r.meetsPromotionRules, 'Account status': r.accountStatus,
        })),
      }]);
      toast.success(tx(`Exported ${rows.length} student(s)`));
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Export failed'); }
    finally { setBusy(false); }
  };

  return (
    <section className="dt-card">
      <div className="dt-row">
        <ProgramLevelPicker programs={programs} programId={programId} setProgramId={setProgramId} level={level} setLevel={setLevel} requireLevel={false} />
        <button className="dt-btn" disabled={!programId || busy} onClick={exportResults}>
          {busy ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={15} />} Download results (Excel)
        </button>
      </div>
      <p className="dt-note">{tx("One row per student: credits attempted and earned, CGPA, class, outstanding courses and promotion standing. Includes approved as well as published results. Individual marks sheets can be exported from the Marks Sheets page.")}</p>
    </section>
  );
}
