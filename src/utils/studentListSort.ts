/**
 * Search and sort for staff lists of students (proctoring report, Quiz Review): by name or by index
 * number (the student's username, e.g. PS/ICT/17/0012), ascending or descending.
 */

export type StudentSort = 'name-asc' | 'name-desc' | 'index-asc' | 'index-desc';

export const STUDENT_SORT_OPTIONS: { value: StudentSort; label: string }[] = [
  { value: 'name-asc',   label: 'Name (A to Z)' },
  { value: 'name-desc',  label: 'Name (Z to A)' },
  { value: 'index-asc',  label: 'Index number (ascending)' },
  { value: 'index-desc', label: 'Index number (descending)' },
];

/**
 * Compares the way people read them: numbers inside the text by value (…/0009 before …/0010,
 * …/2 before …/10) and letters without regard to case.
 */
export const compareNatural = (a: string, b: string) =>
  (a ?? '').localeCompare(b ?? '', undefined, { numeric: true, sensitivity: 'base' });

/** True when the name or the index number contains every word typed (any order, any case). */
export const matchesStudent = (term: string, name: string, index: string) => {
  const words = term.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = `${name ?? ''} ${index ?? ''}`.toLowerCase();
  return words.every(w => hay.includes(w));
};

/**
 * Filters by the search, then sorts. With sort '' (the list's own order) the rows keep the order
 * they came in. Ties fall back to the other field, so the order never jumps around.
 */
export function searchAndSortStudents<T>(
  rows: T[],
  term: string,
  sort: StudentSort | '',
  nameOf: (r: T) => string,
  indexOf: (r: T) => string,
): T[] {
  const found = rows.filter(r => matchesStudent(term, nameOf(r), indexOf(r)));
  if (!sort) return found;
  const dir = sort.endsWith('desc') ? -1 : 1;
  const byIndex = sort.startsWith('index');
  return [...found].sort((a, b) => {
    const first = byIndex ? compareNatural(indexOf(a), indexOf(b)) : compareNatural(nameOf(a), nameOf(b));
    if (first) return first * dir;
    return (byIndex ? compareNatural(nameOf(a), nameOf(b)) : compareNatural(indexOf(a), indexOf(b))) * dir;
  });
}
