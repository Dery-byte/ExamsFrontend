/**
 * System mode and wording.
 *
 * The developer picks one of four modes. Every label in the app is written in university words
 * ("Course", "Lecturer", "Level", "Semester", "HOD") and passed through tx(), which rewrites it for
 * the current mode, e.g. in a Senior High School: Course → Subject, HOD → Headmaster.
 *
 * Schools are built differently: a department is a section (Primary School, Junior High School …) and
 * each programme is one class in it (Primary 1 … 6, JHS 1 … 3), added by the Super Admin. A class is
 * one year long, so its level is always 1 and level pickers hide themselves (see oneYear()).
 *
 * The mode is cached in localStorage so the first paint already uses the right words; when the
 * server's mode differs (or the developer changes it) the page reloads once — module-level labels
 * are computed at load time.
 */

export type SystemMode = 'UNIVERSITY' | 'SHS' | 'BASIC' | 'ALL_SCHOOLS';

export const SYSTEM_MODES: { value: SystemMode; label: string; description: string }[] = [
  { value: 'UNIVERSITY', label: 'University', description: 'Levels in hundreds set by each programme\'s duration (e.g. 4 years → 100–400, Pharmacy 6 years → 100–600), two semesters a year, courses, lecturers, HODs, GPA/CGPA and transcripts.' },
  { value: 'SHS', label: 'Senior High School', description: 'A Senior High School section with the classes the Super Admin adds (SHS 1–3, or SHS 1 Science A …), three terms a year, subjects, teachers, headmaster, terminal reports with position in class.' },
  { value: 'BASIC', label: 'Primary / JHS', description: 'Primary School and Junior High School sections with the classes the Super Admin adds (Primary 1–6, JHS 1–3), three terms, subjects, teachers, head teacher, pupils, terminal reports with position in class.' },
  { value: 'ALL_SCHOOLS', label: 'SHS / JHS / Primary', description: 'One school with Primary, Junior High and Senior High sections and the classes the Super Admin adds, three terms, subjects, teachers, head teachers.' },
];

const STORAGE_KEY = 'system_mode';

function readCached(): SystemMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'UNIVERSITY' || v === 'SHS' || v === 'BASIC' || v === 'ALL_SCHOOLS') return v;
  } catch { /* storage blocked */ }
  return 'UNIVERSITY';
}

let mode: SystemMode = readCached();

export const getMode = (): SystemMode => mode;
export const isSchoolMode = (): boolean => mode !== 'UNIVERSITY';
export const isUniversityMode = (): boolean => mode === 'UNIVERSITY';

/** Semesters per level at university, terms per class in schools. */
export const periodsPerLevel = (): number => (isSchoolMode() ? 3 : 2);

/** Fallback level list when a programme doesn't say (e.g. 100–400; schools: one, a class is one year). */
export const defaultLevels = (): number[] => (mode === 'UNIVERSITY' ? [100, 200, 300, 400] : [1]);

/**
 * Whether a programme is a school class: one year, level 1, so level pickers and "Level 1" text are
 * hidden and the class name says it all. Older multi-year programmes in a school still show levels.
 */
export const oneYear = (program?: { configuredLevels?: number[] | null; durationYears?: number } | null): boolean => {
  if (mode === 'UNIVERSITY') return false;
  if (!program) return true;
  return (program.configuredLevels?.length ?? program.durationYears ?? 1) <= 1;
};

/** " · Level 200" at a university; nothing in a school, where the class name already says it. */
export const levelSuffix = (level: number | string | null | undefined): string =>
  mode === 'UNIVERSITY' && level != null && level !== '' ? ` · ${levelName(level)}` : '';

/** Whether a level choice is worth offering among this many levels (a school class has one). */
export const showLevelPicker = (count: number): boolean => mode === 'UNIVERSITY' || count > 1;

/** "Computer Science · Level 200" at a university, just "Primary 4" for a school class. */
export function classLabel(programName: string | null | undefined, level?: number | string | null): string {
  const name = programName ?? '';
  if (mode !== 'UNIVERSITY' || level == null || level === '') return name;
  return name ? `${name} · ${levelName(level)}` : levelName(level);
}

/**
 * Remembers the server's mode. Returns true when it changed, so the caller can reload the page.
 */
export function syncMode(serverMode: string | undefined | null): boolean {
  if (serverMode !== 'UNIVERSITY' && serverMode !== 'SHS' && serverMode !== 'BASIC' && serverMode !== 'ALL_SCHOOLS') return false;
  if (serverMode === mode) return false;
  mode = serverMode;
  try { localStorage.setItem(STORAGE_KEY, serverMode); } catch { /* ignore */ }
  rulesCache = null;
  return true;
}

type Rule = [RegExp, string];
let rulesCache: { mode: SystemMode; rules: Rule[] } | null = null;

function buildRules(m: SystemMode): Rule[] {
  if (m === 'UNIVERSITY') return [];
  // A class is a programme here, so a level is just the year (rarely seen: level pickers are hidden)
  const level = 'Year';
  const levels = 'Years';
  const head = m === 'SHS' ? 'Headmaster' : 'Head Teacher';
  const heads = m === 'SHS' ? 'Headmasters' : 'Head Teachers';
  const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
  const r: Rule[] = [
    // Phrases first
    [/\bUniversity Structure\b/g, 'School Structure'],
    [/\bStudent IDs\b/g, 'Admission Nos.'],
    [/\bStudent ID\b/g, 'Admission No.'],
    [/\bSemester Report Cards\b/g, 'Terminal Reports'],
    [/\bSemester Report Card\b/g, 'Terminal Report'],
    [/\bReport Cards\b/g, 'Terminal Reports'],
    [/\bReport Card\b/g, 'Terminal Report'],
    [/\breport cards\b/g, 'terminal reports'],
    [/\breport card\b/g, 'terminal report'],
    [/\bFaculty Directory\b/g, 'Staff Directory'],
    [/\bFaculty\b/g, 'Staff'],
    [/\bHeads? of Departments?\b/g, head],
    [/\bAcademic Level\b/g, level],
    // A programme and its level are one thing in a school: the class
    [/\bProgram(?:me)?s ?(?:&|and|\/) ?Levels\b/g, 'Classes'],
    [/\bProgram(?:me)? ?(?:&|and|\/|·) ?Level\b/g, 'Class'],
    [/\bprogram(?:me)?s ?(?:&|and|\/) ?levels\b/g, 'classes'],
    [/\bprogram(?:me)? ?(?:&|and|\/|·) ?level\b/g, 'class'],
    // Words
    [/\bDepartments\b/g, 'Sections'], [/\bDepartment\b/g, 'Section'],
    [/\bdepartments\b/g, 'sections'], [/\bdepartment\b/g, 'section'],
    [/\bDEPARTMENTS\b/g, 'SECTIONS'], [/\bDEPARTMENT\b/g, 'SECTION'],
    [/\bProgrammes\b/g, 'Classes'], [/\bProgramme\b/g, 'Class'],
    [/\bPrograms\b/g, 'Classes'], [/\bProgram\b/g, 'Class'],
    [/\bprogrammes\b/g, 'classes'], [/\bprogramme\b/g, 'class'],
    [/\bprograms\b/g, 'classes'], [/\bprogram\b/g, 'class'],
    [/\bPROGRAMMES\b/g, 'CLASSES'], [/\bPROGRAMME\b/g, 'CLASS'],
    [/\bPROGRAMS\b/g, 'CLASSES'], [/\bPROGRAM\b/g, 'CLASS'],
    [/\bLecturers\b/g, 'Teachers'], [/\bLecturer\b/g, 'Teacher'],
    [/\blecturers\b/g, 'teachers'], [/\blecturer\b/g, 'teacher'],
    [/\bLECTURERS\b/g, 'TEACHERS'], [/\bLECTURER\b/g, 'TEACHER'],
    [/\bCourses\b/g, 'Subjects'], [/\bCourse\b/g, 'Subject'],
    [/\bcourses\b/g, 'subjects'], [/\bcourse\b/g, 'subject'],
    [/\bCOURSES\b/g, 'SUBJECTS'], [/\bCOURSE\b/g, 'SUBJECT'],
    [/\bSemesters\b/g, 'Terms'], [/\bSemester\b/g, 'Term'],
    [/\bsemesters\b/g, 'terms'], [/\bsemester\b/g, 'term'],
    [/\bSEMESTER\b/g, 'TERM'],
    [/\bLevels\b/g, levels], [/\bLevel\b/g, level],
    [/\blevels\b/g, lower(levels)], [/\blevel\b/g, lower(level)],
    [/\bLEVEL\b/g, level.toUpperCase()],
    [/\bHODs\b/g, heads], [/\bHOD\b/g, head],
  ];
  if (m === 'BASIC') {
    r.push(
      [/\bStudents\b/g, 'Pupils'], [/\bStudent\b/g, 'Pupil'],
      [/\bstudents\b/g, 'pupils'], [/\bstudent\b/g, 'pupil'],
      [/\bSTUDENTS\b/g, 'PUPILS'], [/\bSTUDENT\b/g, 'PUPIL'],
    );
  }
  return r;
}

/** Rewrites a university label for the current system mode. Safe to call on any display text. */
export function tx(text: string): string;
export function tx<T>(text: T): T;
export function tx(text: any): any {
  if (typeof text !== 'string' || mode === 'UNIVERSITY' || !text) return text;
  if (!rulesCache || rulesCache.mode !== mode) rulesCache = { mode, rules: buildRules(mode) };
  let out = text;
  for (const [re, to] of rulesCache.rules) out = out.replace(re, to);
  return out;
}

/** "First Semester" / "Second Term" … for a period number. */
export function periodName(n: number | string | null | undefined): string {
  const num = Number(n);
  const ord = ['First', 'Second', 'Third', 'Fourth'][num - 1];
  const word = isSchoolMode() ? 'Term' : 'Semester';
  return ord ? `${ord} ${word}` : `${word} ${n ?? ''}`.trim();
}

/** "Level 200" / "Form 2" / "Class 4". */
export function levelName(level: number | string | null | undefined): string {
  return tx(`Level ${level ?? ''}`).trim();
}
