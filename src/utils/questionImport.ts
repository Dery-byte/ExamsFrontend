/**
 * Bulk question upload: reads the Excel template (Questions_Template.xlsx, built by
 * Templates/make_question_template.py), a CSV, or an older .json file into editable drafts. The review
 * window (components/examops/QuestionReviewModal.tsx) shows them, lets the lecturer fix what is missing,
 * and turns them into the JSON items the quiz and bank upload endpoints already take, so the server is unchanged.
 *
 * Sheets are recognised by their headings, not their names, so a renamed tab or a CSV still works:
 *   Objective  Type | Question | Option A–D | Answer | Tolerance | Topic | Difficulty
 *   Matching   Question | Left | Right | Topic | Difficulty            (one row per pair)
 *   Theory     Q No | Question | Marks | Marking guide | Compulsory | Topic | Difficulty
 */
import { readSheets } from './spreadsheet';
import type { SheetRows } from './spreadsheet';

/** What the upload is for: a quiz's OBJ tab, its THEORY tab, or a course's bank (every type, plus topic / difficulty). */
export type ImportTarget = 'OBJECTIVE' | 'THEORY' | 'BANK';
export type QType = 'MCQ' | 'TRUE_FALSE' | 'FILL_BLANK' | 'NUMERIC' | 'MATCHING' | 'THEORY';

/** One question as the lecturer can edit it; every shape is kept so changing the type loses nothing. */
export interface Draft {
  id: string;
  /** Where it came from, e.g. "Objective tab, row 7". */
  source: string;
  type: QType | '';
  /** Question text: plain text from a sheet, HTML from a .json file (html = true). */
  text: string;
  html: boolean;
  options: string[];                 // multiple choice, A–D
  correct: number[];                 // multiple choice: indexes into options
  tf: 'True' | 'False' | '';
  accepted: string[];                // fill in the blank
  value: string;                     // numeric
  tolerance: string;
  pairs: { left: string; right: string }[];
  qno: string;                       // theory
  marks: string;
  guide: string;
  compulsory: boolean | null;        // null: the file said something other than yes / no
  topic: string;                     // bank and quiz objective questions (a question pool balances by it)
  difficulty: '' | 'EASY' | 'MEDIUM' | 'HARD';
  image?: string;                    // .json files only, passed through
  /** Left out of the upload by the lecturer. */
  excluded: boolean;
  /** What the file said for a field the app couldn't understand; shown in that field's message until it is edited. */
  fileSaid: Partial<Record<DraftField, string>>;
}

export type DraftField = 'type' | 'text' | 'options' | 'correct' | 'tf' | 'accepted' | 'value' | 'tolerance'
  | 'pairs' | 'qno' | 'marks' | 'compulsory' | 'difficulty' | 'topic';
export type DraftErrors = Partial<Record<DraftField, string>>;

export interface ImportResult {
  drafts: Draft[];
  /** Problems with the file as a whole (unreadable, no question tabs); there are no drafts then. */
  errors: string[];
  /** Questions in the file this upload leaves out, e.g. theory rows when uploading on the OBJ tab. */
  note?: string;
  /** How many questions that is. */
  leftOut?: number;
}

export const QUESTION_FILE_ACCEPT = '.xlsx,.xls,.csv,.json';

export const TYPE_LABEL: Record<string, string> = {
  MCQ: 'Multiple choice', TRUE_FALSE: 'True / False', MATCHING: 'Matching',
  FILL_BLANK: 'Fill in the blank', NUMERIC: 'Numeric', THEORY: 'Theory (written answer)',
};

const OBJECTIVE_TYPES: QType[] = ['MCQ', 'TRUE_FALSE', 'FILL_BLANK', 'NUMERIC', 'MATCHING'];

/** The question types an upload may hold. */
export const allowedTypes = (target: ImportTarget): QType[] =>
  target === 'OBJECTIVE' ? OBJECTIVE_TYPES : target === 'THEORY' ? ['THEORY'] : [...OBJECTIVE_TYPES, 'THEORY'];

type Kind = 'OBJECTIVE' | 'MATCHING' | 'THEORY';
interface Row { n: number; blank: boolean; get: (field: string) => string }

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Column headings (lower case, letters and digits only) → field. Keep in step with the template's headings. */
const HEADINGS: Record<string, string> = {
  type: 'type', questiontype: 'type',
  question: 'question', questiontext: 'question',
  optiona: 'A', optionb: 'B', optionc: 'C', optiond: 'D', a: 'A', b: 'B', c: 'C', d: 'D',
  answer: 'answer', answers: 'answer', correctanswer: 'answer', correctanswers: 'answer',
  tolerance: 'tolerance',
  left: 'left', right: 'right', prompt: 'left', match: 'right',
  qno: 'qno', questionno: 'qno', questionnumber: 'qno', no: 'qno', number: 'qno',
  marks: 'marks', mark: 'marks',
  markingguide: 'guide', markingscheme: 'guide', evaluationcriteria: 'guide', guide: 'guide',
  compulsory: 'compulsory',
  topic: 'topic', difficulty: 'difficulty',
};

/** The Type cell (lower case, letters only) → question type. */
const TYPES: Record<string, QType> = {
  multiplechoice: 'MCQ', mcq: 'MCQ', multichoice: 'MCQ', mc: 'MCQ',
  truefalse: 'TRUE_FALSE', trueorfalse: 'TRUE_FALSE', tf: 'TRUE_FALSE',
  fillintheblank: 'FILL_BLANK', fillintheblanks: 'FILL_BLANK', fillblank: 'FILL_BLANK', fillblanks: 'FILL_BLANK',
  blank: 'FILL_BLANK', fib: 'FILL_BLANK', shortanswer: 'FILL_BLANK',
  numeric: 'NUMERIC', number: 'NUMERIC', numerical: 'NUMERIC',
  matching: 'MATCHING', match: 'MATCHING',
  theory: 'THEORY', essay: 'THEORY',
};

const LETTERS = ['A', 'B', 'C', 'D'];

const blankDraft = (id: string, source: string): Draft => ({
  id, source, type: '', text: '', html: false, options: ['', '', '', ''], correct: [], tf: '', accepted: [],
  value: '', tolerance: '', pairs: [], qno: '', marks: '', guide: '', compulsory: false, topic: '', difficulty: '',
  excluded: false, fileSaid: {},
});

export async function readQuestionFile(file: File, target: ImportTarget): Promise<ImportResult> {
  if (/\.json$/i.test(file.name)) return readJson(await file.text());
  let sheets: SheetRows[];
  try { sheets = await readSheets(file); }
  catch { return { drafts: [], errors: ['This file could not be read. Save it as an Excel workbook (.xlsx) and choose it again.'] }; }
  return fromSheets(sheets, target);
}

// ── .json files (the older format) ─────────────────────────────────────────────

function readJson(text: string): ImportResult {
  let parsed: unknown;
  try { parsed = JSON.parse(text); }
  catch {
    return { drafts: [], errors: ['This file is not valid JSON. Check for a missing or extra comma, quote or bracket, or use the Excel template instead.'] };
  }
  const list = Array.isArray(parsed) ? parsed : [parsed];
  if (!list.length) return { drafts: [], errors: ['The file has no questions in it.'] };
  return { drafts: list.map(fromJsonItem), errors: [] };
}

function fromJsonItem(q: any, i: number): Draft {
  const d = blankDraft(`json-${i}`, `Question ${i + 1} in the file`);
  if (!q || typeof q !== 'object' || Array.isArray(q)) { d.fileSaid.text = 'something other than a { } block'; return d; }
  const str = (v: unknown) => (v == null ? '' : String(v).trim());
  const rawType = str(q.questionType);
  const type = rawType ? TYPES[norm(rawType)] : 'question' in q && !('content' in q) ? 'THEORY' : 'MCQ';
  if (type) d.type = type; else d.fileSaid.type = rawType;
  d.text = str(q.content ?? q.question);
  d.html = true;
  d.options = [q.option1, q.option2, q.option3, q.option4].map(str);
  const answers: string[] = (Array.isArray(q.correct_answer ?? q.correctAnswer) ? (q.correct_answer ?? q.correctAnswer) : [q.correct_answer ?? q.correctAnswer])
    .map(str).filter(Boolean);
  fillAnswer(d, answers.join('; '), answers);
  d.tolerance = str(q.tolerance);
  d.pairs = (Array.isArray(q.matchingPairs) ? [...q.matchingPairs] : [])
    .map((p: any, k: number) => ({ p, k, o: Number(p?.pairOrder ?? k) }))
    .sort((a, b) => a.o - b.o || a.k - b.k)
    .map(({ p }) => ({ left: str(p?.prompt), right: str(p?.answer) }));
  d.qno = str(q.quesNo);
  d.marks = str(q.marks);
  d.guide = str(q.evaluationCriteria ?? q.markingGuide);
  setCompulsory(d, str(q.isCompulsory));
  d.topic = str(q.topic);
  setDifficulty(d, str(q.difficulty));
  if (q.image) d.image = String(q.image);
  return d;
}

// ── Workbooks ───────────────────────────────────────────────────────────────────

function fromSheets(sheets: SheetRows[], target: ImportTarget): ImportResult {
  const wanted: Kind[] = target === 'OBJECTIVE' ? ['OBJECTIVE', 'MATCHING'] : target === 'THEORY' ? ['THEORY'] : ['OBJECTIVE', 'MATCHING', 'THEORY'];
  const drafts: Draft[] = [];
  let recognised = false, leftOut = 0;

  for (const s of sheets) {
    const head = findHeadings(s.rows);
    if (!head) continue;
    recognised = true;
    const { kind, at, cols } = head;
    const rows: Row[] = s.rows.slice(at + 1).map((cells, i) => ({
      n: s.firstRow + at + 1 + i,
      blank: cells.every(c => !c),
      get: (f: string) => (cols[f] == null ? '' : cells[cols[f]] ?? ''),
    }));
    const where = `${s.name} tab`;
    const found = kind === 'OBJECTIVE' ? rows.filter(r => !r.blank).map(r => objectiveDraft(r, where))
      : kind === 'MATCHING' ? matchingDrafts(rows, where)
      : rows.filter(r => !r.blank).map(r => theoryDraft(r, where));
    if (wanted.includes(kind)) drafts.push(...found); else leftOut += found.length;
  }

  if (!recognised) return {
    drafts, errors: ['No questions found. Use the Excel template and keep its headings in row 1 (e.g. Type, Question, Option A … Answer).'],
  };
  if (!drafts.length) return {
    drafts, errors: [target === 'OBJECTIVE' ? 'The Objective and Matching tabs have no questions in them.'
      : target === 'THEORY' ? 'The Theory tab has no questions in it.' : 'The file has no questions in it.'],
  };
  const note = leftOut ? (target === 'OBJECTIVE'
    ? `The ${leftOut} theory question${leftOut !== 1 ? 's' : ''} in this file ${leftOut !== 1 ? 'are' : 'is'} uploaded from the THEORY tab.`
    : `The ${leftOut} objective question${leftOut !== 1 ? 's' : ''} in this file ${leftOut !== 1 ? 'are' : 'is'} uploaded from the OBJ tab.`) : undefined;
  return { drafts, errors: [], note, leftOut };
}

/** The heading row (within the first 10 rows) and what kind of tab it starts. */
function findHeadings(rows: string[][]): { kind: Kind; at: number; cols: Record<string, number> } | null {
  for (let at = 0; at < Math.min(rows.length, 10); at++) {
    const cols: Record<string, number> = {};
    rows[at].forEach((cell, i) => { const f = HEADINGS[norm(cell)]; if (f && cols[f] == null) cols[f] = i; });
    if (cols.question == null) continue;
    if (cols.left != null && cols.right != null) return { kind: 'MATCHING', at, cols };
    if (cols.marks != null) return { kind: 'THEORY', at, cols };
    if (cols.answer != null) return { kind: 'OBJECTIVE', at, cols };
  }
  return null;
}

function objectiveDraft(r: Row, where: string): Draft {
  const d = blankDraft(`${where}-${r.n}`, `${where}, row ${r.n}`);
  const rawType = r.get('type'), answer = r.get('answer');
  d.text = r.get('question');
  d.options = LETTERS.map(l => r.get(l));
  // No Type: options mean multiple choice, a True/False answer means True/False
  const type = rawType ? TYPES[norm(rawType)] : d.options.some(Boolean) ? 'MCQ' : trueFalse(answer) ? 'TRUE_FALSE' : undefined;
  if (type) d.type = type; else if (rawType) d.fileSaid.type = rawType;
  fillAnswer(d, answer);
  d.tolerance = r.get('tolerance');
  bankCells(d, r);
  return d;
}

/**
 * The Answer cell into every answer shape (so a corrected Type keeps it); what the chosen type can't
 * understand is kept in fileSaid for its message.
 */
function fillAnswer(d: Draft, answer: string, list?: string[]) {
  const mcq = mcqAnswer(answer, d.options, list);
  if (mcq) d.correct = mcq;
  d.tf = trueFalse(list?.[0] ?? answer) ?? '';
  d.accepted = list ?? answer.split(/[;|\n]/).map(a => a.trim()).filter(Boolean);
  d.value = list?.[0] ?? answer;
  if (!answer) return;
  if (d.type === 'MCQ' && !mcq) d.fileSaid.correct = answer;
  if (d.type === 'TRUE_FALSE' && !d.tf) d.fileSaid.tf = answer;
}

/** A multiple choice answer as option indexes: letters ("B", "A, C", "AC") or the options' own text; null when it names no option. */
function mcqAnswer(answer: string, opts: string[], list?: string[]): number[] | null {
  const find = (s: string) => opts.findIndex(o => o && o.toLowerCase() === s.toLowerCase());
  if (list) {   // .json: the answers are option texts
    const idx = list.map(find);
    return idx.length && idx.every(i => i >= 0) ? Array.from(new Set(idx)) : null;
  }
  if (!answer) return null;
  if (find(answer) >= 0) return [find(answer)];
  let parts = answer.split(/\s*(?:[,;&]|\band\b)\s*/i).map(p => p.trim()).filter(Boolean);
  if (parts.length === 1 && /^[a-d]{2,4}$/i.test(parts[0])) parts = parts[0].split('');
  const out: number[] = [];
  for (const part of parts) {
    const letter = part.match(/^\(?(?:option\s*)?([a-d])[).]?$/i)?.[1]?.toUpperCase();
    const i = letter ? LETTERS.indexOf(letter) : find(part);
    if (i < 0 || !opts[i]) return null;
    if (!out.includes(i)) out.push(i);
  }
  return out.length ? out : null;
}

function matchingDrafts(rows: Row[], where: string): Draft[] {
  const out: Draft[] = [];
  let cur: Draft | null = null, first = 0, last = 0;
  const close = () => {
    if (cur) cur.source = `${where}, row${last > first ? `s ${first}–${last}` : ` ${first}`}`;
    cur = null;
  };
  for (const r of rows) {
    if (r.blank) { close(); continue; }   // an empty row ends the question
    const text = r.get('question'), left = r.get('left'), right = r.get('right');
    if (!cur || (text && text !== cur.text)) {
      close();
      cur = blankDraft(`${where}-${r.n}`, '');
      cur.type = 'MATCHING';
      cur.text = text;
      bankCells(cur, r);
      out.push(cur);
      first = r.n;
    }
    last = r.n;
    if (left || right) cur.pairs.push({ left, right });   // a row with only the question: the pairs follow below
  }
  close();
  return out;
}

function theoryDraft(r: Row, where: string): Draft {
  const d = blankDraft(`${where}-${r.n}`, `${where}, row ${r.n}`);
  d.type = 'THEORY';
  d.qno = r.get('qno');
  d.text = r.get('question');
  d.marks = r.get('marks');
  d.guide = r.get('guide');
  setCompulsory(d, r.get('compulsory'));
  bankCells(d, r);
  return d;
}

function bankCells(d: Draft, r: Row) {
  d.topic = r.get('topic');
  setDifficulty(d, r.get('difficulty'));
}

function setDifficulty(d: Draft, raw: string) {
  const v = norm(raw);
  if (v === 'easy' || v === 'medium' || v === 'hard') d.difficulty = v.toUpperCase() as Draft['difficulty'];
  else if (raw) d.fileSaid.difficulty = raw;
}

function setCompulsory(d: Draft, raw: string) {
  const v = norm(raw);
  if (['yes', 'y', 'true', '1', 'compulsory'].includes(v)) d.compulsory = true;
  else if (['', 'no', 'n', 'false', '0', 'optional'].includes(v)) d.compulsory = false;
  else { d.compulsory = null; d.fileSaid.compulsory = raw; }
}

function trueFalse(s: string): 'True' | 'False' | null {
  const v = norm(s);
  return v === 'true' || v === 't' ? 'True' : v === 'false' || v === 'f' ? 'False' : null;
}

// ── Checking ────────────────────────────────────────────────────────────────────

const said = (d: Draft, f: DraftField) => (d.fileSaid[f] ? ` (the file said "${d.fileSaid[f]}")` : '');

/** Problems per draft id, for the drafts still in the upload; a draft with none is missing from the map. */
export function checkDrafts(drafts: Draft[], target: ImportTarget): Map<string, DraftErrors> {
  const out = new Map<string, DraftErrors>();
  const qnos = new Map<string, number>();
  if (target === 'THEORY') drafts.forEach(d => {
    const k = qnoKey(d.qno);
    if (!d.excluded && d.type === 'THEORY' && k) qnos.set(k, (qnos.get(k) ?? 0) + 1);
  });
  for (const d of drafts) {
    if (d.excluded) continue;
    const e = checkDraft(d, target);
    if (target === 'THEORY' && !e.qno && (qnos.get(qnoKey(d.qno)) ?? 0) > 1) e.qno = `Q No ${d.qno} is used more than once. Give each part its own number.`;
    if (Object.keys(e).length) out.set(d.id, e);
  }
  return out;
}

const qnoKey = (s: string) => s.replace(/\s+/g, '').toUpperCase();

function checkDraft(d: Draft, target: ImportTarget): DraftErrors {
  const e: DraftErrors = {};
  if (!d.type) { e.type = `Choose a question type${said(d, 'type')}.`; return e; }
  if (!allowedTypes(target).includes(d.type)) {
    e.type = target === 'THEORY' ? 'Only theory questions can be uploaded here. Remove this one, or upload it from the OBJ tab.'
      : 'Theory questions are uploaded from the THEORY tab. Remove this one here.';
    return e;
  }
  if (!plainText(d.text, d.html).trim()) e.text = d.fileSaid.text ? `The file has ${d.fileSaid.text} here. Type the question.` : 'Type the question.';

  switch (d.type) {
    case 'MCQ': {
      const filled = d.options.map((o, i) => (o.trim() ? i : -1)).filter(i => i >= 0);
      const dup = d.options.findIndex((o, i) => o.trim() && d.options.findIndex(p => p.trim().toLowerCase() === o.trim().toLowerCase()) !== i);
      if (filled.length < 2) e.options = 'Fill in at least two options.';
      else if (dup >= 0) e.options = `Option ${LETTERS[dup]} is the same as another option.`;
      if (!d.correct.some(i => filled.includes(i))) e.correct = `Tick the correct option${said(d, 'correct')}.`;
      break;
    }
    case 'TRUE_FALSE':
      if (!d.tf) e.tf = `Choose True or False${said(d, 'tf')}.`;
      break;
    case 'FILL_BLANK':
      if (!d.accepted.some(a => a.trim())) e.accepted = 'Add at least one accepted answer.';
      break;
    case 'NUMERIC': {
      if (!d.value.trim()) e.value = 'Enter the correct number.';
      else if (parseNumber(d.value) == null) e.value = `"${d.value}" isn't a number.`;
      const t = parseNumber(d.tolerance);
      if (d.tolerance.trim() && (t == null || t < 0)) e.tolerance = 'Tolerance must be 0 or more, or left empty.';
      break;
    }
    case 'MATCHING': {
      const complete = d.pairs.filter(p => p.left.trim() && p.right.trim()).length;
      if (d.pairs.some(p => !p.left.trim() !== !p.right.trim())) e.pairs = 'Fill in both sides of every pair, or remove the pair.';
      else if (complete < 2) e.pairs = 'Add at least 2 pairs.';
      break;
    }
    case 'THEORY': {
      const m = theoryMarks(d.marks);
      if (m == null || m <= 0) e.marks = d.marks.trim() ? `Marks must be a number above 0, not "${d.marks}".` : 'Enter the marks, e.g. 4.';
      if (target === 'THEORY') {
        if (!d.qno.trim()) e.qno = 'Enter the Q No, e.g. Q1a.';
        else if (!/\d/.test(d.qno)) e.qno = `Q No "${d.qno}" needs a number, e.g. Q1a or Q2b.`;
        if (d.compulsory == null) e.compulsory = `Choose Yes or No${said(d, 'compulsory')}.`;
      }
      break;
    }
  }
  if (tagged(target, d) && d.fileSaid.difficulty) e.difficulty = `Choose Easy, Medium or Hard${said(d, 'difficulty')}.`;
  if (tagged(target, d) && d.topic.trim().length > 120) e.topic = `Shorten the topic to 120 characters or fewer (it has ${d.topic.trim().length}).`;
  return e;
}

// ── Upload items ────────────────────────────────────────────────────────────────

/** A checked draft as the upload endpoint's JSON item (the old .json template format). */
export function draftToItem(d: Draft, target: ImportTarget): any {
  const html = d.html ? d.text.trim() : toHtml(d.text.trim());
  const bank = target === 'BANK';
  const tags = tagged(target, d);
  const extra = (item: any) => {
    if (d.image) item.image = d.image;
    if (tags && d.topic.trim()) item.topic = d.topic.trim();
    if (tags && d.difficulty) item.difficulty = d.difficulty;
    return item;
  };
  switch (d.type) {
    case 'THEORY': {
      const marks = theoryMarks(d.marks)!;
      return bank
        ? extra({ questionType: 'THEORY', question: html, marks, evaluationCriteria: d.guide.trim() })
        : extra({ quesNo: d.qno.trim(), question: html, marks: String(marks), evaluationCriteria: d.guide.trim(), isCompulsory: !!d.compulsory });
    }
    case 'MCQ': {
      const item: any = { questionType: 'MCQ', content: html };
      const filled = d.options.map((o, i) => ({ o: o.trim(), i })).filter(x => x.o);
      filled.forEach((x, k) => { item[`option${k + 1}`] = x.o; });   // empty options close up, as on the exam screen
      item.correct_answer = filled.filter(x => d.correct.includes(x.i)).map(x => x.o);
      return extra(item);
    }
    case 'TRUE_FALSE':
      return extra({ questionType: 'TRUE_FALSE', content: html, correct_answer: [d.tf] });
    case 'FILL_BLANK':
      return extra({ questionType: 'FILL_BLANK', content: html, correct_answer: d.accepted.map(a => a.trim()).filter(Boolean) });
    case 'NUMERIC': {
      const item: any = { questionType: 'NUMERIC', content: html, correct_answer: [d.value.trim()] };
      if (d.tolerance.trim()) item.tolerance = parseNumber(d.tolerance);
      return extra(item);
    }
    default:
      return extra({
        questionType: 'MATCHING', content: html,
        matchingPairs: d.pairs.filter(p => p.left.trim() && p.right.trim())
          .map((p, k) => ({ prompt: p.left.trim(), answer: p.right.trim(), pairOrder: k })),
      });
  }
}

/** Whether a draft carries Topic / Difficulty: every bank question, and a quiz's objective questions. */
export function tagged(target: ImportTarget, d: Pick<Draft, 'type'>): boolean {
  return target === 'BANK' || (target === 'OBJECTIVE' && d.type !== 'THEORY');
}

/** Marks as typed: "4" or "4 marks". */
const theoryMarks = (s: string) => parseNumber(s.replace(/marks?/i, ''));

/** A number as the server reads it (AnswerMatcher.parseNumber): "1,000" thousands, "3,5" decimal comma. */
export function parseNumber(s: string): number | null {
  let t = s.trim().replace(/ /g, '');
  if (!t) return null;
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(t)) t = t.replace(/,/g, '');
  else if (t.includes(',') && !t.includes('.')) t = t.replace(',', '.');
  else t = t.replace(/,/g, '');
  const n = Number(t);
  return t && Number.isFinite(n) ? n : null;
}

/** Question text is shown as HTML (the editor's format): escape it and keep the cell's line breaks. */
function toHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\r?\n/g, '<br>');
}

/** A draft's question text without tags. */
export function plainText(text: string, html: boolean): string {
  if (!html) return text;
  return new DOMParser().parseFromString(text, 'text/html').body.textContent ?? '';
}
