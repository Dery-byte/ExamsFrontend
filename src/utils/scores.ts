/* Score helpers shared by the student result views (history page, assessments page). */

export const toNum = (v: any) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

/** Rounds to at most 2 decimals without trailing zeros: 12 → "12", 12.5 → "12.5". */
export const fmtNum = (n: number) => String(Math.round(n * 100) / 100);

export const pct = (got: any, max: any) => {
  const g = toNum(got), m = toNum(max);
  return m > 0 ? Math.round((g / m) * 100) : 0;
};

/** Section A + Section B totals for one report. */
export const reportTotals = (r: any) => {
  const total = toNum(r?.marks) + toNum(r?.marksB);
  const max = toNum(r?.quiz?.maxMarks) + toNum(r?.maxScoreSectionB);
  return { total, max, percent: pct(total, max) };
};

// Hex tones (not CSS vars) so they can carry alpha; values mirror --success / --warning / --danger.
// `text` is a darker shade of `solid` so labels stay readable on white.
export const gradeTone = (p: number) =>
  p >= 70 ? { solid: '#28bbe3', text: '#1683a3', soft: 'rgba(40,187,227,0.07)', border: 'rgba(40,187,227,0.30)' }
  : p >= 50 ? { solid: '#f1b44c', text: '#a86b0c', soft: 'rgba(241,180,76,0.09)', border: 'rgba(241,180,76,0.38)' }
  : { solid: '#ec4561', text: '#c62f4a', soft: 'rgba(236,69,97,0.06)', border: 'rgba(236,69,97,0.30)' };

/** Parses a server LocalDateTime (ISO string or Jackson [y,m,d,h,min] array); null when absent or invalid. */
export const parseServerDate = (v: any): Date | null => {
  if (!v) return null;
  const d = Array.isArray(v)
    ? new Date(v[0], (v[1] ?? 1) - 1, v[2] ?? 1, v[3] ?? 0, v[4] ?? 0)
    : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const fmtDateTime = (v: any) =>
  parseServerDate(v)?.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) ?? '';
