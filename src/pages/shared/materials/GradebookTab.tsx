import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AlertTriangle, ArrowDownUp, Ban, CheckCircle2, ClipboardList, EyeOff, FileSpreadsheet, Info, Loader2, Search, Send } from 'lucide-react';
import AppModal from '../../../components/ui/AppModal';
import {
  errMsg, getGradebook, getGradebookSheets, sendGradebookToSheet, setCounts,
  type Gradebook, type GradebookColumn, type GradebookRow, type StaffSpace,
} from '../../../api/materials';
import MarkingViewer from './MarkingViewer';
import { Menu, Spinner, plain, weekName } from './shared';
import { downloadWorkbook, slug } from '../../../utils/spreadsheet';
import { tx } from '../../../utils/terms';

type Sort = 'name' | 'high' | 'low';

/**
 * The course's marks table: each student's mark on every assignment and their running total.
 * Total = plain sum. An assignment adds once it's marked for the student, or once submissions close
 * (missing work = 0). Pending marking and still-open work stay out. "Doesn't count" assignments and
 * drafts stay out. Click a mark to open that student's work.
 */
export default function GradebookTab({ space }: { space: StaffSpace }) {
  const courseId = space.course.id;
  const qc = useQueryClient();
  const key = ['materials', 'gradebook', courseId];
  const q = useQuery({ queryKey: key, queryFn: () => getGradebook(courseId) });
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<Sort>('name');
  const [open, setOpen] = useState<{ assignment: GradebookColumn; studentId: number } | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const b = q.data;

  const rows = useMemo(() => {
    if (!b) return [];
    const t = search.trim().toLowerCase();
    const list = b.students.filter(s => !t || `${s.name} ${s.username}`.toLowerCase().includes(t));
    const pct = (r: GradebookRow) => (r.percent == null ? -1 : Number(r.percent));
    return [...list].sort((x, y) => sort === 'name' ? x.name.localeCompare(y.name) : sort === 'high' ? pct(y) - pct(x) : pct(x) - pct(y));
  }, [b, search, sort]);

  if (q.isLoading) return <Spinner label="Loading the marks…" />;
  if (q.isError || !b) return <div className="cm-banner cm-banner-bad"><AlertTriangle size={16} />{errMsg(q.error, 'Could not load the marks.')}</div>;
  if (b.assignments.length === 0) return (
    <div className="cm-card cm-empty"><ClipboardList size={30} /><b>No assignments yet</b>Marks appear here as soon as you post an assignment and mark it.</div>
  );

  const counted = b.assignments.filter(a => a.counts && !a.draft);
  const toggleCounts = async (a: GradebookColumn) => {
    try {
      qc.setQueryData(key, await setCounts(a.id, !a.counts));
      toast.success(a.counts ? `"${a.title}" no longer counts towards the total` : `"${a.title}" counts towards the total`);
    } catch (e) { toast.error(errMsg(e)); }
  };

  const exportExcel = () => {
    const header = ['Name', 'ID / username', ...b.assignments.map(a => `${a.title} (/${plain(a.maxMarks)})${a.counts && !a.draft ? '' : ' [not counted]'}`), 'Total', 'Out of', '%'];
    const cellText = (r: GradebookRow, a: GradebookColumn) => {
      const c = r.cells[String(a.id)];
      return c.state === 'MARKED' ? Number(c.score) : c.state === 'MISSING' ? 0 : c.state === 'PENDING' ? 'not marked yet' : '';
    };
    const marks = rows.map(r => [r.name, r.username, ...b.assignments.map(a => cellText(r, a)), Number(r.total), Number(r.outOf), r.percent == null ? '' : Number(r.percent)]);
    const stats = [['Assignment', 'Week', 'Out of', 'Counts', 'Released', 'Handed in', 'Marked', 'Average', 'Highest', 'Lowest'],
      ...b.assignments.map(a => [a.title, weekName(a.weekNumber), Number(a.maxMarks), a.counts && !a.draft ? 'Yes' : 'No', a.released ? 'Yes' : 'No',
        a.handedIn, a.marked, a.average ?? '', a.highest ?? '', a.lowest ?? ''])];
    downloadWorkbook(`${slug(space.course.code || space.course.title)}-assignment-marks`, [
      { name: 'Marks', rows: [header, ...marks] }, { name: 'Per assignment', rows: stats }]);
  };

  return (
    <>
      <div className="cm-gb-toolbar">
        <div className="cm-search" style={{ margin: 0, flex: '1 1 220px' }}>
          <Search size={16} />
          <input className="cm-input" value={search} onChange={e => setSearch(e.target.value)} placeholder={tx('Search students')} aria-label={tx('Search students')} />
        </div>
        <label className="cm-gb-sort"><ArrowDownUp size={14} aria-hidden />
          <select className="cm-select" value={sort} onChange={e => setSort(e.target.value as Sort)} aria-label="Sort">
            <option value="name">Name A–Z</option>
            <option value="high">Highest total first</option>
            <option value="low">Lowest total first</option>
          </select>
        </label>
        <button type="button" className="cm-btn-ghost" onClick={exportExcel}><FileSpreadsheet size={15} /> Download Excel</button>
        <button type="button" className="cm-btn" onClick={() => setSendOpen(true)}><Send size={15} /> {tx('Send total to Marks Sheet')}</button>
      </div>
      <p className="cm-help" style={{ margin: '0 0 10px' }}>
        <Info size={13} style={{ verticalAlign: -2 }} /> Total = sum of marks. An assignment adds once it's marked, or once submissions close (work not handed in counts 0).
        {counted.length < b.assignments.length && ` ${b.assignments.length - counted.length} of ${b.assignments.length} don't count.`}
        {b.classAverage != null && <> Class average <b>{plain(b.classAverage)}%</b>.</>}
      </p>

      <div className="cm-gb-wrap">
        <table className="cm-gb">
          <thead>
            <tr>
              <th className="cm-gb-name">Student</th>
              {b.assignments.map(a => (
                <th key={a.id} className={a.counts && !a.draft ? '' : 'is-off'}>
                  <div className="cm-gb-head">
                    <span className="cm-gb-title" title={a.title}>{a.title}</span>
                    <Menu label={`Options for ${a.title}`}>
                      {close => <button type="button" onClick={() => { close(); toggleCounts(a); }} disabled={a.draft}>
                        {a.counts ? <><Ban size={15} /> Don't count towards the total</> : <><CheckCircle2 size={15} /> Count towards the total</>}
                      </button>}
                    </Menu>
                  </div>
                  <span className="cm-gb-sub">{weekName(a.weekNumber)} · /{plain(a.maxMarks)}</span>
                  <span className="cm-gb-tags">
                    {a.draft ? <span className="cm-chip cm-chip-mute">Draft</span>
                      : !a.counts ? <span className="cm-chip cm-chip-mute"><Ban size={10} /> Not counted</span>
                      : a.released ? <span className="cm-chip cm-chip-ok">Released</span>
                      : <span className="cm-chip cm-chip-warn"><EyeOff size={10} /> Not released</span>}
                  </span>
                </th>
              ))}
              <th className="cm-gb-total">Total</th>
              <th className="cm-gb-total">%</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.studentId}>
                <th className="cm-gb-name" scope="row">
                  <span className="cm-gb-student">{r.name}</span>
                  <span className="cm-gb-sub">{r.username}{r.onList ? '' : ' · no longer registered'}</span>
                </th>
                {b.assignments.map(a => {
                  const c = r.cells[String(a.id)];
                  const label = c.state === 'MARKED' ? plain(c.score) : c.state === 'MISSING' ? '0' : c.state === 'PENDING' ? 'To mark' : '—';
                  return (
                    <td key={a.id} className={`cm-gb-cell is-${c.state.toLowerCase()}${a.counts && !a.draft ? '' : ' is-off'}`}>
                      <button type="button" onClick={() => setOpen({ assignment: a, studentId: r.studentId })}
                        aria-label={`${r.name}, ${a.title}: ${c.state === 'MARKED' ? `${plain(c.score)} out of ${plain(a.maxMarks)}` : c.state === 'MISSING' ? 'not handed in, 0' : c.state === 'PENDING' ? 'handed in, not marked yet' : 'not due yet'}`}>
                        <span>{label}</span>
                        {c.state === 'MISSING' && <small>not handed in</small>}
                        {c.late && c.state !== 'MISSING' && <small>late</small>}
                      </button>
                    </td>
                  );
                })}
                <td className="cm-gb-total"><b>{plain(r.total)}</b><span className="cm-gb-sub"> / {plain(r.outOf)}</span></td>
                <td className="cm-gb-total">{r.percent == null ? '—' : <span className={`cm-gb-pct ${Number(r.percent) < 50 ? 'is-low' : ''}`}>{plain(r.percent)}%</span>}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            {(['average', 'highest', 'lowest'] as const).map(k => (
              <tr key={k}>
                <th className="cm-gb-name" scope="row">{k === 'average' ? 'Average' : k === 'highest' ? 'Highest' : 'Lowest'}</th>
                {b.assignments.map(a => <td key={a.id} className="cm-gb-stat">{a[k] == null ? '—' : plain(a[k])}</td>)}
                <td className="cm-gb-stat" />
                <td className="cm-gb-stat">{k === 'average' && b.classAverage != null ? `${plain(b.classAverage)}%` : ''}</td>
              </tr>
            ))}
          </tfoot>
        </table>
      </div>

      {open && (
        <MarkingViewer assignmentId={open.assignment.id} studentIds={rows.map(r => r.studentId)} startStudentId={open.studentId}
          providers={space.aiProviders} defaultProvider={null}
          onChanged={() => qc.invalidateQueries({ queryKey: key })}
          onClose={() => { setOpen(null); qc.invalidateQueries({ queryKey: key }); }} />
      )}
      {sendOpen && <SendTotalDialog courseId={courseId} book={b} onClose={() => setSendOpen(false)} />}
    </>
  );
}

function SendTotalDialog({ courseId, book, onClose }: { courseId: number; book: Gradebook; onClose: () => void }) {
  const sheets = useQuery({ queryKey: ['materials', 'gradebook-sheets', courseId], queryFn: () => getGradebookSheets(courseId) });
  const [sheetId, setSheetId] = useState<number | null>(null);
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const usable = (sheets.data ?? []).filter(s => !s.locked && s.sections.length > 0);
  const sheet = usable.find(s => s.sheetId === sheetId) ?? usable[0];
  const section = sheet?.sections.find(s => s.id === sectionId) ?? sheet?.sections[0];
  const withTotal = book.students.filter(s => Number(s.outOf) > 0);
  const example = withTotal[0];
  const send = async () => {
    if (!sheet || !section) return;
    if (!window.confirm(`Put ${withTotal.length} student${withTotal.length === 1 ? "'s" : "s'"} assignment total into "${section.name}"? What's in that column for them now is replaced.`)) return;
    setBusy(true);
    try { const r = await sendGradebookToSheet(courseId, sheet.sheetId, section.id); toast.success(r.message); onClose(); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <AppModal title={tx('Send total to a Marks Sheet')} onClose={onClose}
      footer={<><button type="button" className="cm-btn-ghost" onClick={onClose}>Cancel</button>
        <button type="button" className="cm-btn" onClick={send} disabled={busy || !section || withTotal.length === 0}>{busy && <Loader2 size={15} className="cm-spin" />} Send</button></>}>
      {sheets.isLoading ? <Spinner /> : usable.length === 0 ? (
        <div className="cm-empty"><b>{tx('No open Marks Sheet takes this course')}</b>{tx('Marks Sheets that are submitted or published can’t be changed, and the sheet needs at least one column.')}</div>
      ) : (
        <div className="cm-grid">
          <label className="cm-field">{tx('Marks Sheet')}
            <select className="cm-select" value={sheet?.sheetId} onChange={e => { setSheetId(Number(e.target.value)); setSectionId(null); }}>
              {usable.map(s => <option key={s.sheetId} value={s.sheetId}>{tx(s.label)}</option>)}
            </select>
          </label>
          <label className="cm-field">Column
            <select className="cm-select" value={section?.id} onChange={e => setSectionId(Number(e.target.value))}>
              {sheet?.sections.map(s => <option key={s.id} value={s.id}>{s.name} (out of {plain(s.maxScore)})</option>)}
            </select>
          </label>
          {section && example && (
            <p className="cm-help" style={{ margin: 0 }}>Each total is scaled to the column: {example.name}'s {plain(example.total)} / {plain(example.outOf)} becomes{' '}
              <b>{(Number(example.total) / Number(example.outOf) * Number(section.maxScore)).toFixed(2).replace(/\.?0+$/, '')} / {plain(section.maxScore)}</b>.
              Students with nothing counted yet are left as they are.</p>
          )}
        </div>
      )}
    </AppModal>
  );
}
