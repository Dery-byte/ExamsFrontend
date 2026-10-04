/**
 * Section B question numbers are grouped by their leading label and number:
 * "Q1a" and "Q1b(i)" belong to "Q1", "Q10a" to "Q10" (never "Q1"), and "2b" to "2".
 * Case and spaces are ignored ("q 1a" is "Q1"). A number with no digits is its own group,
 * and a missing one falls into "OTHER".
 *
 * The backend applies the same rule (com.exam.helper.TheoryGroups); keep the two in step.
 * Always compare group keys for equality — never `quesNo.startsWith(key)`, which puts Q10 in Q1.
 */
export function theoryGroupKey(quesNo?: string | null): string {
  const s = (quesNo ?? '').replace(/\s+/g, '').toUpperCase();
  if (!s) return 'OTHER';
  return s.match(/^[A-Z]*[0-9]+/)?.[0] ?? s;
}

/** Natural order for group keys: Q1, Q2 … Q9, Q10. */
export const compareTheoryGroups = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true });
