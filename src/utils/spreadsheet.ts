import * as XLSX from 'xlsx';

/** One worksheet: rows as objects (keys become the header row) or as arrays (first row is the header). */
export interface SheetSpec { name: string; rows: Record<string, unknown>[] | unknown[][] }

/** Builds an .xlsx workbook in the browser and downloads it. */
export function downloadWorkbook(fileName: string, sheets: SheetSpec[]) {
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ name, rows }) => {
    const ws = rows.length && Array.isArray(rows[0])
      ? XLSX.utils.aoa_to_sheet(rows as unknown[][])
      : XLSX.utils.json_to_sheet(rows as Record<string, unknown>[]);
    // Excel sheet names: max 31 chars, no []:*?/\
    XLSX.utils.book_append_sheet(wb, ws, name.replace(/[[\]:*?\/\\]/g, ' ').slice(0, 31) || 'Sheet1');
  });
  XLSX.writeFile(wb, fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`);
}

/** Reads the first worksheet of a .csv / .xlsx / .xls file into row objects keyed by the header row. */
export async function readRows(file: File): Promise<Record<string, string>[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return [];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '', raw: false });
  return rows
    .map(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [String(k).trim(), String(v ?? '').trim()])))
    .filter(r => Object.values(r).some(v => v !== ''));   // skip blank lines
}

/** One worksheet as text cells, blank rows kept; firstRow is the Excel row number of rows[0]. */
export interface SheetRows { name: string; firstRow: number; rows: string[][] }

/** Reads every worksheet of a .csv / .xlsx / .xls file as text, as Excel shows it. */
export async function readSheets(file: File): Promise<SheetRows[]> {
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  return wb.SheetNames.map(name => {
    const ws = wb.Sheets[name];
    if (!ws?.['!ref']) return { name, firstRow: 1, rows: [] };
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '', raw: false, blankrows: true });
    return {
      name,
      firstRow: XLSX.utils.decode_range(ws['!ref']).s.r + 1,
      rows: rows.map(r => r.map(v => String(v ?? '').trim())),
    };
  });
}

/** File-name friendly slug. */
export const slug = (s: string) => s.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
