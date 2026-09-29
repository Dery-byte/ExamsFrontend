import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Loader2, Save, ClipboardPen } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useInstitution } from '../../hooks/useInstitution';
import { getAllMarkSheets, getMyMarkSheets, getTermRemarks, saveTermRemarks } from '../../api/endpoints';
import { tx } from '../../utils/terms';

type Row = {
  studentId: number; studentName: string; username: string;
  daysPresent: number | null; daysOpen: number | null; conduct: string | null; interest: string | null;
  classTeacherRemark: string | null; headRemark: string | null;
};

const CONDUCT = ['Excellent', 'Very good', 'Good', 'Satisfactory', 'Needs improvement'];

/**
 * Attendance, conduct and remarks printed on report cards.
 * Class teachers see the sheets they are class teacher for; HODs and the Super Admin see all sheets.
 */
export default function TermRemarks() {
  const { user } = useAuth();
  const { term } = useInstitution();
  const isStaffAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const sheets = useQuery({
    queryKey: ['term-remark-sheets', isStaffAdmin],
    queryFn: () => (isStaffAdmin ? getAllMarkSheets() : getMyMarkSheets()),
  });
  const mySheets = useMemo(() => {
    const list: any[] = sheets.data ?? [];
    return isStaffAdmin ? list : list.filter(s => s.classTeacherId === user?.id);
  }, [sheets.data, isStaffAdmin, user?.id]);

  const [sheetId, setSheetId] = useState<number | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [daysOpenAll, setDaysOpenAll] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const detail = useQuery({
    queryKey: ['term-remarks', sheetId],
    queryFn: () => getTermRemarks(sheetId!),
    enabled: sheetId != null,
  });

  useEffect(() => {
    if (detail.data) { setRows(detail.data.rows); setDirty(false); setDaysOpenAll(''); }
  }, [detail.data]);

  const setRow = (i: number, patch: Partial<Row>) => {
    setRows(rs => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
    setDirty(true);
  };
  const num = (v: string) => (v.trim() === '' ? null : Math.max(0, Math.floor(Number(v))) || 0);

  const applyDaysOpen = () => {
    const n = num(daysOpenAll);
    if (n == null) return;
    setRows(rs => rs.map(r => ({ ...r, daysOpen: n })));
    setDirty(true);
  };

  const save = async () => {
    const bad = rows.find(r => r.daysPresent != null && r.daysOpen != null && r.daysPresent > r.daysOpen);
    if (bad) { toast.error(`${bad.studentName}: days present can't be more than days opened`); return; }
    setSaving(true);
    try {
      const res = await saveTermRemarks(sheetId!, rows);
      toast.success(res.message ?? 'Saved');
      setDirty(false);
      detail.refetch();
    } catch (err: any) { toast.error(err?.response?.data?.message ?? 'Could not save the remarks'); }
    finally { setSaving(false); }
  };

  const sheetLabel = (s: any) =>
    `${s.programName ?? ''} · ${term('Level')} ${s.level} · ${term('Semester')} ${s.semester}${s.sessionName ? ` · ${s.sessionName}` : ''}${s.courseName ? ` · ${s.courseName}` : ''}`;

  return (
    <div style={{ paddingBottom: 40 }}>
      <PageHeader title="Report Remarks" breadcrumbs={['Academic Performance', 'Report Remarks']} />

      <div className="tr-card">
        <p className="tr-help">
          {tx("Attendance, conduct and remarks entered here are printed on each student's report card.")}{isStaffAdmin ? ' You can also write the head\'s remark.' : ' You can enter them for sheets where you are the class teacher.'}
        </p>
        {sheets.isLoading ? <Loader2 className="tr-spin" size={20} /> : !mySheets.length ? (
          <p className="tr-help"><strong>No sheets to show.</strong> {isStaffAdmin ? 'Create a marks sheet first.' : tx('Ask your HOD to make you class teacher on a marks sheet.')}</p>
        ) : (
          <label className="tr-label">Marks sheet
            <select value={sheetId ?? ''} onChange={e => {
              if (dirty && !window.confirm('Discard unsaved changes?')) return;
              setSheetId(e.target.value ? Number(e.target.value) : null);
            }}>
              <option value="">Choose a sheet…</option>
              {mySheets.map((s: any) => <option key={s.id} value={s.id}>{sheetLabel(s)}</option>)}
            </select>
          </label>
        )}
      </div>

      {sheetId != null && (
        <div className="tr-card">
          {detail.isLoading ? <Loader2 className="tr-spin" size={20} /> : detail.isError ? (
            <p className="tr-help" style={{ color: '#dc2626' }}>{(detail.error as any)?.response?.data?.message ?? 'Could not load this sheet.'}</p>
          ) : !rows.length ? (
            <p className="tr-help">{tx("No students are enrolled on this sheet yet.")}</p>
          ) : (
            <>
              <div className="tr-toolbar">
                <label className="tr-inline">Days school opened, for everyone
                  <input inputMode="numeric" value={daysOpenAll} onChange={e => setDaysOpenAll(e.target.value)} placeholder="e.g. 62" />
                </label>
                <button type="button" className="tr-ghost" onClick={applyDaysOpen} disabled={!daysOpenAll.trim()}>Apply</button>
                <span style={{ flex: 1 }} />
                <button type="button" className="tr-btn" onClick={save} disabled={saving || !dirty}>
                  {saving ? <Loader2 size={15} className="tr-spin" /> : <Save size={15} />} Save
                </button>
              </div>
              <datalist id="tr-conduct">{CONDUCT.map(c => <option key={c} value={c} />)}</datalist>
              <div style={{ overflowX: 'auto' }}>
                <table className="tr-table">
                  <thead>
                    <tr>
                      <th>{tx("Student")}</th><th>Present</th><th>Opened</th><th>Conduct</th><th>Interest</th>
                      <th>Class teacher's remark</th>{detail.data?.canEditHeadRemark && <th>Head's remark</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={r.studentId}>
                        <td className="tr-name">{r.studentName}<div>{r.username}</div></td>
                        <td><input className="tr-num" inputMode="numeric" aria-label={`${r.studentName} days present`} value={r.daysPresent ?? ''} onChange={e => setRow(i, { daysPresent: num(e.target.value) })} /></td>
                        <td><input className="tr-num" inputMode="numeric" aria-label={`${r.studentName} days opened`} value={r.daysOpen ?? ''} onChange={e => setRow(i, { daysOpen: num(e.target.value) })} /></td>
                        <td><input list="tr-conduct" maxLength={100} aria-label={`${r.studentName} conduct`} value={r.conduct ?? ''} onChange={e => setRow(i, { conduct: e.target.value })} /></td>
                        <td><input maxLength={100} aria-label={`${r.studentName} interest`} value={r.interest ?? ''} placeholder="e.g. Football" onChange={e => setRow(i, { interest: e.target.value })} /></td>
                        <td><textarea rows={2} maxLength={500} aria-label={`${r.studentName} class teacher's remark`} value={r.classTeacherRemark ?? ''} onChange={e => setRow(i, { classTeacherRemark: e.target.value })} /></td>
                        {detail.data?.canEditHeadRemark && (
                          <td><textarea rows={2} maxLength={500} aria-label={`${r.studentName} head's remark`} value={r.headRemark ?? ''} onChange={e => setRow(i, { headRemark: e.target.value })} /></td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {sheetId == null && mySheets.length > 0 && (
        <div className="tr-card tr-empty"><ClipboardPen size={28} /><p>Choose a sheet to enter remarks.</p></div>
      )}

      <style>{`
        .tr-card { background: #fff; border-radius: 14px; padding: 18px; margin-bottom: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.05); border: 1px solid #eef0f4; }
        .tr-help { font-size: 13px; color: #64748b; margin: 0 0 12px; }
        .tr-label { display: flex; flex-direction: column; gap: 6px; font-size: 12px; font-weight: 700; color: #475569; max-width: 640px; }
        .tr-label select { height: 40px; border: 1.5px solid #e2e8f0; border-radius: 9px; padding: 0 10px; font-size: 14px; color: #1e293b; background: #fff; }
        .tr-toolbar { display: flex; align-items: flex-end; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
        .tr-inline { display: flex; flex-direction: column; gap: 4px; font-size: 12px; font-weight: 700; color: #475569; }
        .tr-inline input { width: 120px; height: 36px; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 0 9px; }
        .tr-btn { height: 36px; padding: 0 16px; border: none; border-radius: 8px; background: #5156be; color: #fff; font-weight: 700; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
        .tr-btn:disabled { opacity: 0.5; cursor: default; }
        .tr-ghost { height: 36px; padding: 0 14px; border-radius: 8px; border: 1.5px solid #c7c9f0; background: #fff; color: #5156be; font-weight: 700; font-size: 13px; cursor: pointer; }
        .tr-ghost:disabled { opacity: 0.5; cursor: default; }
        .tr-table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 900px; }
        .tr-table th { text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b; padding: 8px 6px; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
        .tr-table td { padding: 6px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
        .tr-table input, .tr-table textarea { width: 100%; box-sizing: border-box; border: 1.5px solid #e2e8f0; border-radius: 7px; padding: 6px 8px; font-size: 13px; font-family: inherit; color: #1e293b; }
        .tr-table textarea { resize: vertical; min-width: 180px; }
        .tr-table input:focus, .tr-table textarea:focus { outline: none; border-color: #5156be; }
        .tr-num { width: 64px !important; }
        .tr-name { font-weight: 600; color: #1e293b; min-width: 150px; }
        .tr-name div { font-size: 11.5px; color: #94a3b8; font-weight: 400; }
        .tr-empty { text-align: center; color: #94a3b8; }
        .tr-empty p { margin: 8px 0 0; font-size: 13px; }
        .tr-spin { animation: tr-spin 1s linear infinite; }
        @keyframes tr-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
