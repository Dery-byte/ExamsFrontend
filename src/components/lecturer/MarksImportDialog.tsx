import { useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Loader2, Upload, X, XCircle } from 'lucide-react';
import { addSheetSection, getMarksSheetData } from '../../api/endpoints';
import {
  ParsedFile, NewSectionChoice, readMarksFile, initialNewSections, buildPlan, applyPlan, carryOver, downloadMarksTemplate,
} from '../../utils/marksImport';
import { tx } from '../../utils/terms';

interface Props {
  sheet: any;
  sheetId: number | string;
  onClose: () => void;
  /** The sheet with the uploaded marks in it (not saved yet) and the keys of the cells that changed. */
  onApplied: (sheet: any, changedKeys: string[]) => void;
}

/** Upload marks from an Excel file into the open marks sheet: template, preview with checks, apply. */
export default function MarksImportDialog({ sheet, sheetId, onClose, onApplied }: Props) {
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [newSections, setNewSections] = useState<NewSectionChoice[]>([]);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const plan = useMemo(() => (parsed ? buildPlan(parsed, sheet, newSections) : null), [parsed, sheet, newSections]);
  const errors = plan?.issues.filter(i => i.level === 'error').length ?? 0;
  const included = newSections.filter(n => n.include);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!/\.(csv|xlsx|xls)$/i.test(file.name)) { toast.error('Choose a .xlsx, .xls or .csv file'); return; }
    try {
      const p = await readMarksFile(file);
      if (!p.headings.length) { toast.error('That file is empty'); return; }
      setParsed(p);
      setNewSections(initialNewSections(p, sheet));
    } catch {
      toast.error('That file could not be read');
    }
  };

  const setChoice = (key: string, patch: Partial<NewSectionChoice>) =>
    setNewSections(list => list.map(n => (n.key === key ? { ...n, ...patch } : n)));

  const apply = async () => {
    if (!plan || plan.blockers.length) return;
    setBusy(true);
    const ids = new Map<string, number>();
    let base = sheet;
    try {
      // One at a time: the server checks the 100-mark limit against the sections already there
      for (const n of included) {
        const created = await addSheetSection(sheetId, { sectionName: n.name.trim(), maxScore: Number(n.max) });
        ids.set(n.key, created.id);
      }
      if (ids.size) base = carryOver(await getMarksSheetData(sheetId), sheet);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Could not create the new sections');
      if (ids.size) {
        // Some were created: show them, so uploading again matches them instead of adding them twice
        try { onApplied(carryOver(await getMarksSheetData(sheetId), sheet), []); } catch { /* grid keeps its state */ }
      }
      setBusy(false);
      return;
    }
    const { sheet: next, changedKeys } = applyPlan(base, plan, ids);
    onApplied(next, changedKeys);
    toast.success(changedKeys.length
      ? `${changedKeys.length} mark${changedKeys.length === 1 ? '' : 's'} uploaded — press Save Progress to keep them`
      : ids.size ? 'Sections added — no marks changed' : 'No marks changed');
  };

  return (
    // Closes only from Cancel or the X — a stray click or Esc must not throw away a checked file
    <div className="mid-backdrop">
      <div className="mid-card" role="dialog" aria-modal="true" aria-labelledby="mid-title">
        <div className="mid-head">
          <div id="mid-title" className="mid-title"><FileSpreadsheet size={18} /> Upload marks from Excel</div>
          <button className="mid-x" onClick={onClose} disabled={busy} title="Close"><X size={16} /></button>
        </div>

        <div className="mid-body">
          <div className="mid-step">
            <button className="mid-ghost" onClick={() => downloadMarksTemplate(sheet)}><FileSpreadsheet size={14} /> Download template</button>
            <span className="mid-note">
              {tx('One row per student with a column per section. An exported sheet works too. To add a section, add a column such as')} <b>Project (/20)</b>.
            </span>
          </div>

          <div
            className={`mid-drop ${over ? 'is-over' : ''}`}
            role="button" tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
            onDragOver={e => { e.preventDefault(); setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={e => { e.preventDefault(); setOver(false); onFile(e.dataTransfer.files?.[0]); }}
          >
            <Upload size={22} />
            <strong>{parsed?.fileName || 'Choose or drop an Excel file'}</strong>
            <span>{parsed ? 'Choose another file to replace it' : '.xlsx, .xls or .csv — the first row must be the column headings'}</span>
          </div>
          <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={e => { onFile(e.target.files?.[0]); e.target.value = ''; }} />

          {plan && (
            <>
              <div className="mid-stats">
                <div className="mid-stat"><b>{plan.rowsRead}</b>rows read</div>
                <div className="mid-stat"><b>{plan.matchedStudents}</b>{tx('students matched')}</div>
                <div className="mid-stat"><b>{plan.changedCount}</b>marks will change</div>
                <div className={`mid-stat ${errors ? 'is-bad' : ''}`}><b>{errors}</b>skipped</div>
              </div>

              {newSections.length > 0 && (
                <div className="mid-box">
                  <div className="mid-box-title">New sections in this file</div>
                  {newSections.map(n => (
                    <div key={n.key} className={`mid-new ${n.include ? '' : 'is-off'}`}>
                      <input type="checkbox" checked={n.include} onChange={e => setChoice(n.key, { include: e.target.checked })} aria-label={`Create section ${n.name}`} />
                      <input className="mid-input mid-input-name" value={n.name} disabled={!n.include}
                        onChange={e => setChoice(n.key, { name: e.target.value })} aria-label="Section name" />
                      <span className="mid-out">out of</span>
                      <input className="mid-input mid-input-max" type="number" min="1" value={n.max} disabled={!n.include} placeholder="max"
                        onChange={e => setChoice(n.key, { max: e.target.value })} aria-label="Maximum score" />
                    </div>
                  ))}
                  <div className="mid-note">
                    Sections total: {plan.currentMax}{included.length ? ` + ${plan.newMax} = ${plan.currentMax + plan.newMax}` : ''} of 100.
                    {' '}Ticked sections are added to the sheet when you apply.
                  </div>
                </div>
              )}

              {plan.blockers.map(b => <div key={b} className="mid-blocker"><XCircle size={14} /> {b}</div>)}

              {plan.issues.length > 0 ? (
                <div className="mid-issues">
                  <table>
                    <thead><tr><th>Row</th><th>Problem</th></tr></thead>
                    <tbody>
                      {plan.issues.map((i, k) => (
                        <tr key={k}>
                          <td>{i.row ?? '—'}</td>
                          <td className={i.level === 'error' ? 'mid-bad' : 'mid-warn'}>
                            {i.level === 'error' ? <XCircle size={12} /> : <AlertTriangle size={12} />} {i.text}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : !plan.blockers.length && (
                <div className="mid-ok"><CheckCircle2 size={14} /> Every row passed the checks.</div>
              )}

              {plan.missingStudents.length > 0 && plan.matchedStudents > 0 && (
                <details className="mid-missing">
                  <summary>{plan.missingStudents.length} {tx(plan.missingStudents.length === 1 ? 'student on the sheet is' : 'students on the sheet are')} not in the file — their marks stay as they are.</summary>
                  <div>{plan.missingStudents.join(', ')}</div>
                </details>
              )}
            </>
          )}
        </div>

        <div className="mid-foot">
          <span className="mid-note">Empty cells keep the marks already on the sheet. Applied marks still need Save Progress.</span>
          <div className="mid-actions">
            <button className="mid-ghost" onClick={onClose} disabled={busy}>Cancel</button>
            <button className="mid-primary" onClick={apply} disabled={!plan || plan.blockers.length > 0 || busy}>
              {busy ? <Loader2 size={14} className="spin" /> : <Upload size={14} />} Apply
            </button>
          </div>
        </div>
      </div>
      <style>{midStyles}</style>
    </div>
  );
}

const midStyles = `
  .mid-backdrop {
    position: fixed; inset: 0; z-index: 100000;
    background: rgba(15, 23, 42, 0.55);
    display: flex; align-items: center; justify-content: center;
    padding: 16px; box-sizing: border-box;
  }
  .mid-card {
    background: #fff; border-radius: 14px; width: 100%; max-width: 680px; max-height: 92vh;
    display: flex; flex-direction: column; box-shadow: 0 20px 50px rgba(0,0,0,0.25); overflow: hidden;
  }
  .mid-head {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    padding: 14px 18px; border-bottom: 1px solid #eef0f4;
  }
  .mid-title { display: flex; align-items: center; gap: 8px; font-weight: 800; color: #1e293b; font-size: 15px; }
  .mid-x { border: none; background: #f1f5f9; border-radius: 8px; width: 32px; height: 32px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #475569; }
  .mid-body { padding: 16px 18px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
  .mid-step { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .mid-note { font-size: 12px; color: #64748b; line-height: 1.5; }
  .mid-ghost {
    display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px;
    border: 1.5px solid #d1d5db; background: #fff; color: #1e293b; font-weight: 700; font-size: 12px; cursor: pointer; white-space: nowrap;
  }
  .mid-primary {
    display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px; border-radius: 8px; border: none;
    background: linear-gradient(135deg,#10b981,#059669); color: #fff; font-weight: 700; font-size: 12px; cursor: pointer;
  }
  .mid-primary:disabled, .mid-ghost:disabled, .mid-x:disabled { opacity: 0.55; cursor: not-allowed; }
  .mid-drop {
    border: 2px dashed #cbd5e1; border-radius: 12px; padding: 22px 16px; text-align: center; cursor: pointer;
    display: flex; flex-direction: column; align-items: center; gap: 6px; color: #64748b; font-size: 12px;
  }
  .mid-drop strong { color: #1e293b; font-size: 14px; word-break: break-all; }
  .mid-drop.is-over, .mid-drop:hover { border-color: var(--brand); background: #f8fafc; }
  .mid-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .mid-stat { background: #f8fafc; border-radius: 10px; padding: 10px; font-size: 11px; color: #64748b; text-align: center; }
  .mid-stat b { display: block; font-size: 20px; color: #1e293b; }
  .mid-stat.is-bad b { color: #dc2626; }
  .mid-box { border: 1px solid #fde68a; background: #fffbeb; border-radius: 10px; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
  .mid-box-title { font-weight: 700; font-size: 13px; color: #92400e; }
  .mid-new { display: flex; align-items: center; gap: 8px; }
  .mid-new.is-off .mid-input-name { text-decoration: line-through; }
  .mid-input { padding: 6px 10px; border-radius: 6px; border: 1px solid #d1d5db; font-size: 13px; box-sizing: border-box; min-width: 0; }
  .mid-input-name { flex: 1 1 auto; }
  .mid-input-max { width: 80px; flex: 0 0 80px; }
  .mid-out { font-size: 12px; color: #92400e; white-space: nowrap; }
  .mid-blocker { display: flex; align-items: flex-start; gap: 6px; color: #b91c1c; background: #fef2f2; border-radius: 8px; padding: 8px 10px; font-size: 12px; font-weight: 600; }
  .mid-blocker svg { flex-shrink: 0; margin-top: 2px; }
  .mid-issues { max-height: 220px; overflow: auto; border: 1px solid #eef0f4; border-radius: 10px; }
  .mid-issues table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .mid-issues th { position: sticky; top: 0; background: #f8fafc; text-align: left; padding: 6px 10px; color: #64748b; font-weight: 700; }
  .mid-issues td { padding: 6px 10px; border-top: 1px solid #f1f5f9; vertical-align: top; }
  .mid-issues td:first-child { width: 48px; color: #64748b; }
  .mid-bad { color: #b91c1c; }
  .mid-warn { color: #92400e; }
  .mid-bad svg, .mid-warn svg { vertical-align: -2px; }
  .mid-ok { display: flex; align-items: center; gap: 6px; color: #047857; font-size: 13px; font-weight: 600; }
  .mid-missing { font-size: 12px; color: #64748b; }
  .mid-missing summary { cursor: pointer; }
  .mid-missing div { margin-top: 6px; line-height: 1.6; }
  .mid-foot {
    display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
    padding: 12px 18px; border-top: 1px solid #eef0f4; background: #fafbfc;
  }
  .mid-actions { display: flex; gap: 8px; margin-left: auto; }
  @media (max-width: 480px) {
    .mid-backdrop { padding: 8px; align-items: stretch; }
    .mid-card { max-height: none; }
    .mid-stats { grid-template-columns: repeat(2, 1fr); }
    .mid-head, .mid-body, .mid-foot { padding-left: 14px; padding-right: 14px; }
  }
`;
