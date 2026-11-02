import * as XLSX from 'xlsx';
import { downloadWorkbook, slug } from './spreadsheet';
import { tx } from './terms';

/**
 * Uploading a marks sheet from Excel (lecturer Manual Marks Entry).
 *
 * The file has one row per student (and course), a Student ID column and one column per section,
 * headed with the section's name and optionally its maximum, e.g. "CA (/30)" — the same layout the
 * sheet's Excel export writes, so an exported sheet can be filled in and uploaded straight back.
 * Columns that match no section become new sections when the lecturer ticks them in the preview.
 * Empty cells leave the mark on the sheet as it is.
 */

const norm = (s: unknown) => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

const STUDENT_HEADINGS = ['student id', 'username', 'index number', 'index no', 'student number', 'id'];
const courseHeadings = () => ['course code', 'subject code', 'code', norm(tx('Course code'))];
/** Columns the export writes that the system works out (or that only label the row). */
const IGNORED_HEADINGS = ['name', 'student name', 'student', 'course', 'subject', 'course title', 'credit units',
  'total', 'grade', 'grade point', 'gp', 'remark', 'remarks', 's/n', 'no', 'no.', '#'];

export interface ParsedFile {
  fileName: string;
  headings: string[];
  rows: { rowNo: number; cells: string[] }[];
}

export interface NewSectionChoice { key: string; col: number; name: string; max: string; include: boolean }

export interface ImportIssue { row: number | null; text: string; level: 'error' | 'warn' }

export interface ImportCell {
  studentId: number; courseId: number;
  /** An existing section's id, or a NewSectionChoice key. */
  target: number | string;
  score: number; changed: boolean;
}

export interface ImportPlan {
  cells: ImportCell[];
  issues: ImportIssue[];
  blockers: string[];
  rowsRead: number;
  matchedStudents: number;
  missingStudents: string[];
  changedCount: number;
  currentMax: number;
  newMax: number;
}

/** "CA (/30)", "CA [30]", "CA (out of 30)" → { name: "CA", max: 30 }; "CA" → { name: "CA", max: null }. */
export function parseHeading(h: string): { name: string; max: number | null } {
  const m = String(h).match(/^(.*?)\s*[([]\s*(?:out of|\/)?\s*(\d+(?:\.\d+)?)\s*[)\]]\s*$/i);
  if (m && m[1].trim()) return { name: m[1].trim(), max: Number(m[2]) };
  return { name: String(h).trim(), max: null };
}

const toScore = (raw: string): number | null => {
  const s = raw.replace(/\s/g, '');
  const t = /^-?\d+,\d+$/.test(s) ? s.replace(',', '.') : s;
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(t)) return null;
  return Math.round(Number(t) * 100) / 100;
};

const colName = (col: number) => XLSX.utils.encode_col(col);

/** Reads the "Marks" sheet (or the first one) keeping the real Excel row numbers for messages. */
export async function readMarksFile(file: File): Promise<ParsedFile> {
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const name = wb.SheetNames.find(n => norm(n) === 'marks') ?? wb.SheetNames[0];
  const ws = name ? wb.Sheets[name] : undefined;
  if (!ws || !ws['!ref']) return { fileName: file.name, headings: [], rows: [] };
  const firstRow = XLSX.utils.decode_range(ws['!ref']).s.r + 1;
  // raw values: a cell formatted to show "12" must not hide a stored 12.5
  const grid = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '', raw: true, blankrows: true });
  const cellText = (v: unknown) => (v == null ? '' : String(v).trim());
  const headerIdx = grid.findIndex(r => r.some(v => cellText(v) !== ''));
  if (headerIdx < 0) return { fileName: file.name, headings: [], rows: [] };
  const headings = grid[headerIdx].map(cellText);
  const rows = grid.slice(headerIdx + 1)
    .map((r, i) => ({ rowNo: firstRow + headerIdx + 1 + i, cells: r.map(cellText) }))
    .filter(r => r.cells.some(v => v !== ''));
  return { fileName: file.name, headings, rows };
}

type Column =
  | { col: number; kind: 'student' | 'course' | 'ignored' | 'blank' }
  | { col: number; kind: 'section'; sectionId: number; max: number }
  | { col: number; kind: 'new'; key: string };

function classify(parsed: ParsedFile, sheet: any): { columns: Column[]; notes: ImportIssue[] } {
  const sections: any[] = sheet.sections ?? [];
  const byName = new Map(sections.map(s => [norm(s.sectionName), s]));
  const usedSections = new Set<number>();
  const newNames = new Set<string>();
  const notes: ImportIssue[] = [];
  let studentSeen = false, courseSeen = false;

  const columns = parsed.headings.map((h, col): Column => {
    const n = norm(h);
    if (!n) return { col, kind: 'blank' };
    if (!studentSeen && STUDENT_HEADINGS.includes(n)) { studentSeen = true; return { col, kind: 'student' }; }
    if (!courseSeen && courseHeadings().includes(n)) { courseSeen = true; return { col, kind: 'course' }; }
    if (IGNORED_HEADINGS.includes(n)) return { col, kind: 'ignored' };
    const { name, max } = parseHeading(h);
    const existing = byName.get(norm(name));
    if (existing) {
      if (usedSections.has(existing.id)) {
        notes.push({ row: null, level: 'warn', text: `Column ${colName(col)} "${h}" repeats the ${existing.sectionName} section and was ignored.` });
        return { col, kind: 'ignored' };
      }
      usedSections.add(existing.id);
      if (max != null && max !== Number(existing.maxScore)) {
        notes.push({ row: null, level: 'warn', text: `"${h}": ${existing.sectionName} is out of ${Number(existing.maxScore)} on this sheet, so scores are checked against ${Number(existing.maxScore)}.` });
      }
      return { col, kind: 'section', sectionId: existing.id, max: Number(existing.maxScore) };
    }
    if (newNames.has(norm(name))) {
      notes.push({ row: null, level: 'warn', text: `Column ${colName(col)} "${h}" repeats another new column and was ignored.` });
      return { col, kind: 'ignored' };
    }
    newNames.add(norm(name));
    return { col, kind: 'new', key: `new:${col}` };
  });
  return { columns, notes };
}

/** The new sections the file proposes, ticked, with the maximum taken from the heading when it has one. */
export function initialNewSections(parsed: ParsedFile, sheet: any): NewSectionChoice[] {
  return classify(parsed, sheet).columns
    .filter((c): c is Extract<Column, { kind: 'new' }> => c.kind === 'new')
    .map(c => {
      const { name, max } = parseHeading(parsed.headings[c.col]);
      return { key: c.key, col: c.col, name, max: max == null ? '' : String(max), include: true };
    });
}

const validMax = (s: string) => { const n = Number(s); return s.trim() !== '' && isFinite(n) && n > 0 ? n : null; };

export function buildPlan(parsed: ParsedFile, sheet: any, newSections: NewSectionChoice[]): ImportPlan {
  const { columns, notes } = classify(parsed, sheet);
  const issues: ImportIssue[] = [...notes];
  const blockers: string[] = [];
  const sections: any[] = sheet.sections ?? [];
  const currentMax = sections.reduce((sum, s) => sum + Number(s.maxScore || 0), 0);
  const choice = new Map(newSections.map(n => [n.key, n]));

  const studentCol = columns.find(c => c.kind === 'student')?.col ?? -1;
  const courseCol = columns.find(c => c.kind === 'course')?.col ?? -1;
  if (studentCol < 0) blockers.push(tx('The file needs a Student ID column (the first row must be the column headings).'));

  columns.forEach(c => {
    if (c.kind === 'blank' && parsed.rows.some(r => (r.cells[c.col] ?? '') !== '')) {
      issues.push({ row: null, level: 'warn', text: `Column ${colName(c.col)} has no heading and was ignored.` });
    }
  });

  const existingNames = new Set(sections.map(s => norm(s.sectionName)));
  const included = newSections.filter(n => n.include);
  const seenNew = new Set<string>();
  let newMax = 0;
  for (const n of included) {
    const label = n.name.trim() || `column ${colName(n.col)}`;
    if (!n.name.trim()) blockers.push(`Give the new section in column ${colName(n.col)} a name, or untick it.`);
    else if (existingNames.has(norm(n.name)) || seenNew.has(norm(n.name))) blockers.push(`There is already a section called "${n.name.trim()}". Rename the new one or untick it.`);
    seenNew.add(norm(n.name));
    const max = validMax(n.max);
    if (max == null) blockers.push(`Enter a maximum score for the new section "${label}", or untick it.`);
    else newMax += max;
  }
  if (currentMax + newMax > 100) {
    blockers.push(`Sections would total ${currentMax + newMax} marks; the limit is 100. Untick a new section or lower its maximum.`);
  }

  // Students and courses on the sheet
  const students: any[] = sheet.studentMarks ?? [];
  const byUsername = new Map(students.map(s => [norm(s.username), s]));
  const courseIds = new Map<string, number>();
  students.forEach(s => (s.courseMarks ?? []).forEach((cm: any) => courseIds.set(norm(cm.courseCode), cm.courseId)));
  const onlyCourse = courseIds.size === 1 ? [...courseIds.values()][0] : null;

  const scoreCols = columns.filter(c => c.kind === 'section' || (c.kind === 'new' && choice.get(c.key)?.include)) as
    Extract<Column, { kind: 'section' | 'new' }>[];

  const cellMap = new Map<string, ImportCell>();
  const rowFor = new Map<string, number>();
  const matched = new Set<number>();

  if (studentCol >= 0) {
    for (const { rowNo, cells } of parsed.rows) {
      const hasScores = scoreCols.some(c => (cells[c.col] ?? '') !== '');
      const sid = cells[studentCol] ?? '';
      if (!sid) {
        if (hasScores) issues.push({ row: rowNo, level: 'error', text: tx('No Student ID — row skipped.') });
        continue;
      }
      const student = byUsername.get(norm(sid));
      if (!student) { issues.push({ row: rowNo, level: 'error', text: tx(`Student ID "${sid}" is not on this sheet — row skipped.`) }); continue; }

      const code = courseCol >= 0 ? cells[courseCol] ?? '' : '';
      let courseId: number | null | undefined;
      if (code) {
        courseId = courseIds.get(norm(code));
        if (courseId == null) { issues.push({ row: rowNo, level: 'error', text: tx(`Course code "${code}" is not on this sheet — row skipped.`) }); continue; }
      } else {
        courseId = onlyCourse;
        if (courseId == null) { issues.push({ row: rowNo, level: 'error', text: tx('This sheet has several courses; fill in the Course code — row skipped.') }); continue; }
      }
      const courseMark = (student.courseMarks ?? []).find((cm: any) => cm.courseId === courseId);
      if (!courseMark) { issues.push({ row: rowNo, level: 'error', text: tx(`${sid} is not taking ${code || 'this course'} — row skipped.`) }); continue; }

      matched.add(student.studentId);
      const rowKey = `${student.studentId}|${courseId}`;
      const earlier = rowFor.get(rowKey);
      if (earlier != null) issues.push({ row: rowNo, level: 'warn', text: `${sid} also appears in row ${earlier}; this later row is used.` });
      rowFor.set(rowKey, rowNo);

      for (const c of scoreCols) {
        const raw = cells[c.col] ?? '';
        if (raw === '') continue;
        const heading = c.kind === 'section'
          ? sections.find(s => s.id === c.sectionId)?.sectionName
          : choice.get(c.key)!.name.trim() || `column ${colName(c.col)}`;
        const max = c.kind === 'section' ? c.max : validMax(choice.get(c.key)!.max);
        const score = toScore(raw);
        if (score == null) { issues.push({ row: rowNo, level: 'error', text: `${heading}: "${raw}" is not a number — skipped.` }); continue; }
        if (score < 0) { issues.push({ row: rowNo, level: 'error', text: `${heading}: ${score} is below 0 — skipped.` }); continue; }
        if (max == null) continue;   // the new section's maximum is still missing; a blocker says so
        if (score > max) { issues.push({ row: rowNo, level: 'error', text: `${heading}: ${score} is above the maximum ${max} — skipped.` }); continue; }

        const target = c.kind === 'section' ? c.sectionId : c.key;
        const current = c.kind === 'section'
          ? Number((courseMark.sectionMarks ?? []).find((sm: any) => sm.sectionId === c.sectionId)?.scoreObtained ?? 0)
          : null;
        cellMap.set(`${rowKey}|${target}`, { studentId: student.studentId, courseId: courseId!, target, score, changed: current == null || current !== score });
      }
    }
  }

  const cells = [...cellMap.values()];
  if (studentCol >= 0 && !cells.length && !included.length && !blockers.length) {
    blockers.push('There are no marks to upload in this file.');
  }

  return {
    cells, issues, blockers,
    rowsRead: parsed.rows.length,
    matchedStudents: matched.size,
    missingStudents: students.filter(s => !matched.has(s.studentId)).map(s => `${s.studentName} (${s.username})`),
    changedCount: cells.filter(c => c.changed).length,
    currentMax, newMax,
  };
}

export const gradeFor = (total: number) =>
  total >= 90 ? 'A+' : total >= 80 ? 'A' : total >= 70 ? 'B' : total >= 60 ? 'C' : total >= 50 ? 'D' : 'F';

/** Works out a course's total and grade on screen; the server works out the official ones on save. */
export function recalcCourse(courseMark: any, sections: any[]) {
  const total = sections.reduce((sum, sec) =>
    sum + Number((courseMark.sectionMarks ?? []).find((sm: any) => sm.sectionId === sec.id)?.scoreObtained || 0), 0);
  courseMark.totalScore = Math.round(total * 100) / 100;
  courseMark.grade = gradeFor(courseMark.totalScore);
}

/** Copies the marks typed on screen (not saved yet) onto a freshly loaded sheet, so a reload doesn't lose them. */
export function carryOver(fresh: any, local: any) {
  const next = structuredClone(fresh);
  const oldStudents = new Map<number, any>((local?.studentMarks ?? []).map((s: any) => [s.studentId, s]));
  for (const s of next.studentMarks ?? []) {
    const old = oldStudents.get(s.studentId);
    for (const cm of s.courseMarks ?? []) {
      const oldCm = old?.courseMarks?.find((x: any) => x.courseId === cm.courseId);
      if (!oldCm) continue;
      cm.sectionMarks = cm.sectionMarks ?? [];
      for (const oldSm of oldCm.sectionMarks ?? []) {
        if (!(next.sections ?? []).some((sec: any) => sec.id === oldSm.sectionId)) continue;
        const sm = cm.sectionMarks.find((x: any) => x.sectionId === oldSm.sectionId);
        if (sm) sm.scoreObtained = oldSm.scoreObtained;
        else cm.sectionMarks.push({ sectionId: oldSm.sectionId, scoreObtained: oldSm.scoreObtained });
      }
      recalcCourse(cm, next.sections ?? []);
    }
  }
  return next;
}

/** Puts the planned marks into a copy of the sheet. newIds maps each created section's key to its id. */
export function applyPlan(sheet: any, plan: ImportPlan, newIds: Map<string, number>) {
  const next = structuredClone(sheet);
  const changedKeys: string[] = [];
  const touched = new Set<any>();
  for (const c of plan.cells) {
    const sectionId = typeof c.target === 'number' ? c.target : newIds.get(c.target);
    if (sectionId == null) continue;
    const cm = next.studentMarks?.find((s: any) => s.studentId === c.studentId)
      ?.courseMarks?.find((x: any) => x.courseId === c.courseId);
    if (!cm) continue;
    cm.sectionMarks = cm.sectionMarks ?? [];
    const sm = cm.sectionMarks.find((x: any) => x.sectionId === sectionId);
    if (sm) sm.scoreObtained = c.score;
    else cm.sectionMarks.push({ sectionId, scoreObtained: c.score });
    touched.add(cm);
    if (c.changed) changedKeys.push(markKey(c.studentId, c.courseId, sectionId));
  }
  touched.forEach(cm => recalcCourse(cm, next.sections ?? []));
  return { sheet: next, changedKeys };
}

export const markKey = (studentId: number, courseId: number, sectionId: number) => `${studentId}-${courseId}-${sectionId}`;

/** An empty upload template: the sheet's students and a column per section. */
export function downloadMarksTemplate(sheet: any) {
  const sections: any[] = sheet.sections ?? [];
  const header = ['Student ID', 'Name', tx('Course code'), ...sections.map(s => `${s.sectionName} (/${Number(s.maxScore)})`)];
  const rows: unknown[][] = [header];
  for (const s of sheet.studentMarks ?? []) {
    for (const cm of s.courseMarks ?? []) rows.push([s.username, s.studentName, cm.courseCode, ...sections.map(() => '')]);
  }
  const help: unknown[][] = [
    ['How to fill in this template'],
    ['Type each mark under its section. Leave a cell empty to keep the mark already on the sheet.'],
    [tx("Don't change the Student ID or Course code columns; they say whose mark it is.")],
    ['To add a section, add a column headed with its name and maximum, e.g. Project (/20).'],
    ['All sections together can be at most 100 marks.'],
    ['Total and grade are worked out by the system, so you can leave them out.'],
    ['Upload the file with Upload Excel on the marks sheet, check the preview, apply, then press Save Progress.'],
  ];
  const course = sheet.courseName || (sheet.studentMarks?.[0]?.courseMarks?.[0]?.courseCode) || 'sheet';
  downloadWorkbook(`marks-template-${slug(course)}`, [{ name: 'Marks', rows }, { name: 'How to fill', rows: help }]);
}
