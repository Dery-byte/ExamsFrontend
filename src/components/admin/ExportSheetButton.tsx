import { useState } from 'react';
import toast from 'react-hot-toast';
import { FileDown, Loader2 } from 'lucide-react';
import { getMarksSheetData } from '../../api/endpoints';
import { downloadWorkbook, slug } from '../../utils/spreadsheet';

/**
 * Exports one marks sheet to Excel: one row per student and course, a column per section,
 * then total, grade, grade point and credit units.
 */
export default function ExportSheetButton({ sheetId, style }: { sheetId: number | string; style?: React.CSSProperties }) {
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const d = await getMarksSheetData(sheetId);
      const sections: any[] = d.sections ?? [];
      const header = ['Student ID', 'Name', 'Course code', 'Course', 'Credit units',
        ...sections.map(s => `${s.sectionName} (/${s.maxScore})`), 'Total', 'Grade', 'Grade point'];
      const rows: unknown[][] = [header];
      for (const sm of d.studentMarks ?? []) {
        for (const cm of sm.courseMarks ?? []) {
          const bySection = new Map((cm.sectionMarks ?? []).map((x: any) => [x.sectionId, x.scoreObtained]));
          rows.push([
            sm.username, sm.studentName, cm.courseCode, cm.courseTitle, cm.creditUnits ?? '',
            ...sections.map(s => { const v = bySection.get(s.id); return v == null ? '' : Number(v); }),
            cm.totalScore == null ? '' : Number(cm.totalScore), cm.grade ?? '', cm.gradePoint == null ? '' : Number(cm.gradePoint),
          ]);
        }
      }
      const info: unknown[][] = [
        ['Program', d.programName ?? ''], ['Session', d.sessionName ?? ''], ['Level', d.level ?? ''],
        ['Semester', d.semester ?? ''], ['Course', d.courseName ?? ''], ['Status', d.status ?? ''],
        ['Exported', new Date().toLocaleString()],
      ];
      downloadWorkbook(`marks-${slug(d.courseName || 'sheet')}-L${d.level}-S${d.semester}${d.sessionName ? '-' + slug(d.sessionName) : ''}`,
        [{ name: 'Marks', rows }, { name: 'Sheet info', rows: info }]);
    } catch {
      toast.error('Could not export this sheet');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button onClick={run} disabled={busy} title="Download as Excel"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.35)',
        background: 'rgba(255,255,255,0.12)', color: '#fff', fontWeight: 700, fontSize: 12, cursor: busy ? 'wait' : 'pointer', ...style }}>
      {busy ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <FileDown size={14} />} Excel
    </button>
  );
}
