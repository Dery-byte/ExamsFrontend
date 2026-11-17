/**
 * Office files drawn in the browser, so they can be read without downloading:
 *  - Word (.docx): paragraphs, headings, bold/italic/underline, colours, lists, tables, pictures;
 *  - PowerPoint (.pptx): each slide at its real proportions with positioned text, pictures, tables,
 *    fills and backgrounds (theme colours included);
 *  - Excel / CSV: each sheet as a table.
 * The ZIP is opened with SheetJS (already used for spreadsheets). Everything is built with DOM calls
 * and textContent, never HTML from the file, so a document can't run script in the page. When the
 * server has LibreOffice, Word and PowerPoint arrive as an exact PDF instead and none of this is used.
 */

export type OfficeKind = 'docx' | 'pptx' | 'sheet';

export function officeKind(name: string, contentType: string): OfficeKind | null {
  const ext = name.toLowerCase().split('.').pop() ?? '';
  if (ext === 'docx' || contentType.includes('wordprocessingml')) return 'docx';
  if (ext === 'pptx' || contentType.includes('presentationml')) return 'pptx';
  if (['xlsx', 'xls', 'ods', 'csv'].includes(ext) || contentType.includes('spreadsheetml') || contentType.startsWith('text/csv')) return 'sheet';
  return null;
}

type Files = Map<string, Uint8Array>;
const xlsxLib = () => import('xlsx');

async function unzip(data: Uint8Array): Promise<Files> {
  const XLSX = await xlsxLib();
  const z = XLSX.CFB.read(data, { type: 'array' });
  const out: Files = new Map();
  z.FullPaths.forEach((p: string, i: number) => {
    const f = z.FileIndex[i];
    if (f && f.type === 2 && f.content) out.set(p.replace(/^Root Entry\//, ''), f.content as Uint8Array);
  });
  return out;
}

const dec = new TextDecoder('utf-8');
function xml(files: Files, path: string): Document | null {
  const b = files.get(path);
  if (!b) return null;
  const d = new DOMParser().parseFromString(dec.decode(b), 'application/xml');
  return d.getElementsByTagName('parsererror').length ? null : d;
}

/** Children / descendants by local name (namespace prefixes vary between producers). */
const kids = (el: Element | null | undefined, name?: string) =>
  el ? Array.from(el.children).filter(c => !name || c.localName === name) : [];
const kid = (el: Element | null | undefined, name: string) => kids(el, name)[0] ?? null;
function find(el: Element | Document | null | undefined, name: string): Element | null {
  if (!el) return null;
  const all = (el as Element).getElementsByTagNameNS ? (el as Element).getElementsByTagNameNS('*', name) : null;
  return all && all.length ? all[0] : null;
}
const findAll = (el: Element | Document | null | undefined, name: string): Element[] =>
  el ? Array.from((el as Element).getElementsByTagNameNS('*', name)) : [];
const attr = (el: Element | null | undefined, name: string) => {
  if (!el) return null;
  if (el.hasAttribute(name)) return el.getAttribute(name);
  for (const a of Array.from(el.attributes)) if (a.localName === name) return a.value;
  return null;
};
/** The relationship id (r:id), which sits beside a plain id attribute on slide entries. */
const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const relId = (el: Element | null | undefined) => {
  if (!el) return null;
  return el.getAttributeNS(REL_NS, 'id') ?? Array.from(el.attributes).find(a => a.localName === 'id' && a.prefix)?.value ?? null;
};
const num = (v: string | null, d = 0) => (v == null || v === '' || isNaN(Number(v)) ? d : Number(v));

function rels(files: Files, partPath: string): Map<string, { target: string; type: string; external: boolean }> {
  const slash = partPath.lastIndexOf('/');
  const dir = partPath.slice(0, slash);
  const relPath = `${dir}/_rels/${partPath.slice(slash + 1)}.rels`;
  const d = xml(files, relPath);
  const m = new Map<string, { target: string; type: string; external: boolean }>();
  if (!d) return m;
  for (const r of findAll(d, 'Relationship')) {
    const external = attr(r, 'TargetMode') === 'External';
    const t = attr(r, 'Target') ?? '';
    m.set(attr(r, 'Id') ?? '', { target: external ? t : resolve(dir, t), type: attr(r, 'Type') ?? '', external });
  }
  return m;
}
function resolve(dir: string, target: string) {
  if (target.startsWith('/')) return target.slice(1);
  const parts = (dir ? dir.split('/') : []);
  for (const seg of target.split('/')) {
    if (seg === '..') parts.pop(); else if (seg !== '.') parts.push(seg);
  }
  return parts.join('/');
}

const MIME: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp', webp: 'image/webp', svg: 'image/svg+xml' };

/** Blob URLs for pictures; release() frees them when the viewer closes. */
class Pictures {
  private urls = new Map<string, string>();
  constructor(private files: Files) {}
  url(path: string): string | null {
    if (this.urls.has(path)) return this.urls.get(path)!;
    const b = this.files.get(path);
    const ext = path.split('.').pop()?.toLowerCase() ?? '';
    // Only plain raster pictures (no SVG: it could carry script)
    if (!b || !MIME[ext] || ext === 'svg') return null;
    const u = URL.createObjectURL(new Blob([b as BlobPart], { type: MIME[ext] }));
    this.urls.set(path, u);
    return u;
  }
  release() { this.urls.forEach(u => URL.revokeObjectURL(u)); this.urls.clear(); }
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, style?: Partial<CSSStyleDeclaration>) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (style) Object.assign(e.style, style);
  return e;
};
const safeColor = (v: string | null) => (v && /^[0-9a-fA-F]{6}$/.test(v) ? `#${v}` : null);

// ══ Word ═══════════════════════════════════════════════════════════════════

async function renderDocx(files: Files, host: HTMLElement, pics: Pictures) {
  const doc = xml(files, 'word/document.xml');
  if (!doc) throw new Error('This Word file could not be read.');
  const docRels = rels(files, 'word/document.xml');
  const styles = xml(files, 'word/styles.xml');
  const numbering = xml(files, 'word/numbering.xml');

  // Style id → name (Heading1 / "heading 1" / Title …)
  const styleName = new Map<string, string>();
  for (const s of findAll(styles, 'style')) {
    const id = attr(s, 'styleId');
    const n = attr(kid(s, 'name'), 'val');
    if (id) styleName.set(id, (n ?? id).toLowerCase());
  }
  // numId → abstract levels (numFmt per level)
  const abstract = new Map<string, Map<number, string>>();
  for (const a of findAll(numbering, 'abstractNum')) {
    const lv = new Map<number, string>();
    for (const l of kids(a, 'lvl')) lv.set(num(attr(l, 'ilvl')), attr(kid(l, 'numFmt'), 'val') ?? 'bullet');
    abstract.set(attr(a, 'abstractNumId') ?? '', lv);
  }
  const numFmt = new Map<string, Map<number, string>>();
  for (const n of findAll(numbering, 'num')) {
    if (n.parentElement?.localName !== 'numbering') continue;
    numFmt.set(attr(n, 'numId') ?? '', abstract.get(attr(kid(n, 'abstractNumId'), 'val') ?? '') ?? new Map());
  }
  const counters = new Map<string, number[]>();

  const page = el('div', 'cm-office-page');
  const body = find(doc, 'body');

  const runs = (p: Element, into: HTMLElement) => {
    for (const c of kids(p)) {
      if (c.localName === 'r') run(c, into);
      else if (c.localName === 'hyperlink') {
        const target = docRels.get(relId(c) ?? '')?.target ?? '';
        const holder = /^https?:\/\//i.test(target) ? Object.assign(el('a'), { href: target, target: '_blank', rel: 'noopener noreferrer' }) : el('span');
        holder.style.textDecoration = 'underline'; holder.style.color = '#1d4ed8';
        runs(c, holder);
        into.appendChild(holder);
      } else if (['ins', 'smartTag', 'fldSimple', 'sdt', 'sdtContent'].includes(c.localName)) runs(c, into);
    }
  };
  const run = (r: Element, into: HTMLElement) => {
    const pr = kid(r, 'rPr');
    const styled = () => { const s = el('span'); if (pr) styleRun(s); return s; };
    const styleRun = (span: HTMLElement) => {
      const on = (n: string) => { const x = kid(pr, n); return x && attr(x, 'val') !== '0' && attr(x, 'val') !== 'false'; };
      if (on('b')) span.style.fontWeight = '700';
      if (on('i')) span.style.fontStyle = 'italic';
      if (kid(pr, 'u') && attr(kid(pr, 'u'), 'val') !== 'none') span.style.textDecoration = 'underline';
      if (on('strike')) span.style.textDecoration = 'line-through';
      const color = safeColor(attr(kid(pr, 'color'), 'val'));
      if (color) span.style.color = color;
      const sz = num(attr(kid(pr, 'sz'), 'val'));
      if (sz) span.style.fontSize = `${sz / 2}pt`;
      const hl = attr(kid(pr, 'highlight'), 'val');
      if (hl && hl !== 'none') span.style.background = hl === 'yellow' ? '#fef08a' : hl === 'green' ? '#bbf7d0' : hl === 'cyan' ? '#a5f3fc' : '#fde68a';
      const va = attr(kid(pr, 'vertAlign'), 'val');
      if (va === 'superscript') { span.style.verticalAlign = 'super'; span.style.fontSize = '0.75em'; }
      if (va === 'subscript') { span.style.verticalAlign = 'sub'; span.style.fontSize = '0.75em'; }
    };
    let span = styled();
    for (const c of kids(r)) {
      if (c.localName === 't') span.appendChild(document.createTextNode(c.textContent ?? ''));
      else if (c.localName === 'tab') span.appendChild(document.createTextNode(' '));
      else if (c.localName === 'br') {
        if (attr(c, 'type') === 'page') { into.appendChild(span); into.appendChild(el('hr', 'cm-office-break')); span = styled(); }
        else span.appendChild(el('br'));
      } else if (c.localName === 'drawing' || c.localName === 'pict') {
        const blip = find(c, 'blip');
        const id = attr(blip, 'embed') ?? attr(find(c, 'imagedata'), 'id');
        const target = id ? docRels.get(id)?.target : null;
        const url = target ? pics.url(target) : null;
        if (url) {
          const ext = find(c, 'extent');
          const img = el('img', 'cm-office-img');
          img.src = url; img.alt = '';
          const w = num(attr(ext, 'cx')) / 9525;
          if (w) img.style.width = `${Math.round(w)}px`;
          span.appendChild(img);
        }
      }
    }
    into.appendChild(span);
  };

  const paragraph = (p: Element): HTMLElement => {
    const pr = kid(p, 'pPr');
    const sname = styleName.get(attr(kid(pr, 'pStyle'), 'val') ?? '') ?? '';
    const heading = /^heading (\d)/.exec(sname);
    let tag: keyof HTMLElementTagNameMap = 'p';
    if (sname === 'title') tag = 'h1';
    else if (heading) tag = (`h${Math.min(6, Number(heading[1]) + 1)}`) as keyof HTMLElementTagNameMap;
    const node = el(tag, 'cm-office-p');
    if (sname === 'title') node.style.fontSize = '24pt';
    const jc = attr(kid(pr, 'jc'), 'val');
    if (jc === 'center') node.style.textAlign = 'center';
    else if (jc === 'right' || jc === 'end') node.style.textAlign = 'right';
    else if (jc === 'both') node.style.textAlign = 'justify';
    const ind = kid(pr, 'ind');
    const left = num(attr(ind, 'left') ?? attr(ind, 'start'));
    if (left) node.style.marginLeft = `${Math.min(left / 20, 200)}pt`;

    const numPr = kid(pr, 'numPr');
    if (numPr) {
      const id = attr(kid(numPr, 'numId'), 'val') ?? '';
      const lvl = num(attr(kid(numPr, 'ilvl'), 'val'));
      const fmt = numFmt.get(id)?.get(lvl) ?? 'bullet';
      const cs = counters.get(id) ?? [];
      cs[lvl] = (cs[lvl] ?? 0) + 1;
      cs.length = lvl + 1;
      counters.set(id, cs);
      const n = cs[lvl];
      const label = fmt === 'bullet' ? (lvl % 2 ? '◦' : '•')
        : fmt === 'lowerLetter' ? `${String.fromCharCode(96 + ((n - 1) % 26) + 1)}.`
        : fmt === 'upperLetter' ? `${String.fromCharCode(64 + ((n - 1) % 26) + 1)}.`
        : fmt === 'lowerRoman' ? `${roman(n).toLowerCase()}.` : fmt === 'upperRoman' ? `${roman(n)}.` : `${n}.`;
      node.style.marginLeft = `${18 + lvl * 18}pt`;
      node.style.textIndent = '-14pt';
      const b = el('span'); b.textContent = label + ' ';
      node.appendChild(b);
    }
    runs(p, node);
    if (!node.textContent && !node.querySelector('img')) node.appendChild(el('br'));
    return node;
  };

  const table = (t: Element): HTMLElement => {
    const wrap = el('div', 'cm-office-tablewrap');
    const tb = el('table', 'cm-office-table');
    for (const tr of kids(t, 'tr')) {
      const row = el('tr');
      for (const tc of kids(tr, 'tc')) {
        const pr = kid(tc, 'tcPr');
        if (attr(kid(pr, 'vMerge'), 'val') === null && kid(pr, 'vMerge')) continue;   // continuation of a merged cell
        const td = el('td');
        const span = num(attr(kid(pr, 'gridSpan'), 'val'));
        if (span > 1) td.colSpan = span;
        const fill = safeColor(attr(kid(pr, 'shd'), 'fill'));
        if (fill) td.style.background = fill;
        block(tc, td);
        row.appendChild(td);
      }
      tb.appendChild(row);
    }
    wrap.appendChild(tb);
    return wrap;
  };

  const block = (container: Element | null, into: HTMLElement) => {
    for (const c of kids(container)) {
      if (c.localName === 'p') into.appendChild(paragraph(c));
      else if (c.localName === 'tbl') into.appendChild(table(c));
      else if (c.localName === 'sdt') block(kid(c, 'sdtContent'), into);
    }
  };
  block(body, page);
  host.appendChild(page);
}

function roman(n: number) {
  const m: [number, string][] = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let s = ''; for (const [v, r] of m) while (n >= v) { s += r; n -= v; } return s;
}

// ══ PowerPoint ═════════════════════════════════════════════════════════════

type Xfrm = { x: number; y: number; cx: number; cy: number };

async function renderPptx(files: Files, host: HTMLElement, pics: Pictures) {
  const pres = xml(files, 'ppt/presentation.xml');
  if (!pres) throw new Error('This PowerPoint file could not be read.');
  const sz = find(pres, 'sldSz');
  const W = num(attr(sz, 'cx'), 9144000), H = num(attr(sz, 'cy'), 6858000);
  const presRels = rels(files, 'ppt/presentation.xml');
  const slides = findAll(pres, 'sldId').map(s => presRels.get(relId(s) ?? '')?.target).filter(Boolean) as string[];
  if (!slides.length) throw new Error('This presentation has no slides.');

  // Theme colours (accent1 … , dk1, lt1 …)
  const theme = new Map<string, string>();
  const themePath = [...presRels.values()].find(r => r.type.endsWith('/theme'))?.target
    ?? [...files.keys()].find(k => /^ppt\/theme\/theme\d+\.xml$/.test(k));
  const scheme = find(themePath ? xml(files, themePath) : null, 'clrScheme');
  for (const c of kids(scheme)) {
    const v = attr(find(c, 'srgbClr'), 'val') ?? attr(find(c, 'sysClr'), 'lastClr');
    if (v) theme.set(c.localName, v);
  }
  const alias: Record<string, string> = { tx1: 'dk1', bg1: 'lt1', tx2: 'dk2', bg2: 'lt2' };
  const color = (holder: Element | null): string | null => {
    if (!holder) return null;
    const s = kid(holder, 'srgbClr');
    if (s) return safeColor(attr(s, 'val'));
    const sc = kid(holder, 'schemeClr');
    if (sc) { const k = attr(sc, 'val') ?? ''; return safeColor(theme.get(alias[k] ?? k) ?? null); }
    const sys = kid(holder, 'sysClr');
    if (sys) return safeColor(attr(sys, 'lastClr'));
    return null;
  };

  const xfrmOf = (holder: Element | null): Xfrm | null => {
    const x = holder ? (kid(holder, 'xfrm') ?? null) : null;
    if (!x) return null;
    const off = kid(x, 'off'), ext = kid(x, 'ext');
    if (!off || !ext) return null;
    return { x: num(attr(off, 'x')), y: num(attr(off, 'y')), cx: num(attr(ext, 'cx')), cy: num(attr(ext, 'cy')) };
  };
  const phKey = (sp: Element) => {
    const ph = find(kid(sp, 'nvSpPr') ?? kid(sp, 'nvPicPr') ?? sp, 'ph');
    return ph ? { type: attr(ph, 'type') ?? 'body', idx: attr(ph, 'idx') } : null;
  };
  /** Placeholder positions and sizes from a layout or master. */
  const placeholders = (d: Document | null) => {
    const byIdx = new Map<string, { xfrm: Xfrm | null; sp: Element }>(), byType = new Map<string, { xfrm: Xfrm | null; sp: Element }>();
    for (const sp of findAll(find(d, 'spTree'), 'sp')) {
      const k = phKey(sp);
      if (!k) continue;
      const v = { xfrm: xfrmOf(kid(sp, 'spPr')), sp };
      if (k.idx) byIdx.set(k.idx, v);
      if (!byType.has(k.type)) byType.set(k.type, v);
    }
    return { byIdx, byType };
  };
  const background = (d: Document | null, r: ReturnType<typeof rels>) => {
    const bg = find(d, 'bgPr');
    if (!bg) return null;
    const fill = color(kid(bg, 'solidFill'));
    const blip = find(kid(bg, 'blipFill'), 'blip');
    const img = blip ? pics.url(r.get(attr(blip, 'embed') ?? '')?.target ?? '') : null;
    return { fill, img };
  };

  const pt = (hundredths: number) => `${(hundredths / 100) / (W / 12700) * 100}cqw`;
  const defaultSize = (type: string | undefined, lvl: number) =>
    type === 'title' || type === 'ctrTitle' ? 4000 : type === 'subTitle' ? 2400 : type === 'body' || type === 'obj' ? Math.max(1200, 2400 - lvl * 200) : 1800;

  const textBody = (tx: Element, box: HTMLElement, phType: string | undefined, inherited: Element | null) => {
    const bodyPr = kid(tx, 'bodyPr');
    const anchor = attr(bodyPr, 'anchor') ?? attr(find(inherited, 'bodyPr'), 'anchor');
    box.style.display = 'flex';
    box.style.flexDirection = 'column';
    box.style.justifyContent = anchor === 'ctr' ? 'center' : anchor === 'b' ? 'flex-end' : 'flex-start';
    const isTitle = phType === 'title' || phType === 'ctrTitle';
    const bulleted = phType === 'body' || phType === 'obj';
    for (const p of kids(tx, 'p')) {
      const ppr = kid(p, 'pPr');
      const lvl = num(attr(ppr, 'lvl'));
      const para = el('div', 'cm-slide-p');
      const algn = attr(ppr, 'algn') ?? (phType === 'ctrTitle' || phType === 'subTitle' ? 'ctr' : null);
      if (algn === 'ctr') para.style.textAlign = 'center';
      else if (algn === 'r') para.style.textAlign = 'right';
      if (isTitle) para.style.fontWeight = '700';
      const hasBullet = kid(ppr, 'buChar') || kid(ppr, 'buAutoNum') || (bulleted && !kid(ppr, 'buNone'));
      let size = 0;
      const runsIn = kids(p).filter(c => c.localName === 'r' || c.localName === 'fld' || c.localName === 'br');
      if (hasBullet && runsIn.some(r => (r.textContent ?? '').trim())) {
        para.style.paddingLeft = `${1.2 + lvl * 1.4}em`;
        para.style.textIndent = '-1em';
        const b = el('span'); b.textContent = (attr(kid(ppr, 'buChar'), 'char') ?? '•') + ' ';
        para.appendChild(b);
      } else if (lvl) para.style.paddingLeft = `${lvl * 1.4}em`;
      for (const r of runsIn) {
        if (r.localName === 'br') { para.appendChild(el('br')); continue; }
        const rpr = kid(r, 'rPr');
        const span = el('span');
        span.textContent = kid(r, 't')?.textContent ?? '';
        const s = num(attr(rpr, 'sz'));
        if (s) { span.style.fontSize = pt(s); size = Math.max(size, s); }
        if (attr(rpr, 'b') === '1') span.style.fontWeight = '700';
        if (attr(rpr, 'i') === '1') span.style.fontStyle = 'italic';
        if (attr(rpr, 'u') && attr(rpr, 'u') !== 'none') span.style.textDecoration = 'underline';
        const c = color(kid(rpr, 'solidFill'));
        if (c) span.style.color = c;
        para.appendChild(span);
      }
      const endSz = num(attr(kid(p, 'endParaRPr'), 'sz'));
      para.style.fontSize = pt(size || endSz || num(attr(find(inherited, 'defRPr'), 'sz')) || defaultSize(phType, lvl));
      if (!para.textContent) para.appendChild(el('br'));
      box.appendChild(para);
    }
  };

  const tableOf = (tbl: Element, box: HTMLElement) => {
    const t = el('table', 'cm-slide-table');
    for (const tr of kids(tbl, 'tr')) {
      const row = el('tr');
      for (const tc of kids(tr, 'tc')) {
        if (attr(tc, 'hMerge') === '1' || attr(tc, 'vMerge') === '1') continue;
        const td = el('td');
        const span = num(attr(tc, 'gridSpan'));
        if (span > 1) td.colSpan = span;
        const fill = color(kid(kid(tc, 'tcPr'), 'solidFill'));
        if (fill) td.style.background = fill;
        const tx = kid(tc, 'txBody');
        if (tx) {
          for (const p of kids(tx, 'p')) {
            const d = el('div');
            const s = Math.max(...kids(p, 'r').map(r => num(attr(kid(r, 'rPr'), 'sz'))), 0);
            d.style.fontSize = pt(s || 1400);
            d.textContent = kids(p, 'r').map(r => kid(r, 't')?.textContent ?? '').join('');
            td.appendChild(d);
          }
        }
        row.appendChild(td);
      }
      t.appendChild(row);
    }
    box.appendChild(t);
  };

  for (let i = 0; i < slides.length; i++) {
    const path = slides[i];
    const sd = xml(files, path);
    const card = el('div', 'cm-slide');
    card.style.aspectRatio = `${W} / ${H}`;
    card.setAttribute('aria-label', `Slide ${i + 1} of ${slides.length}`);
    const number = el('div', 'cm-slide-num'); number.textContent = `${i + 1}`;
    if (!sd) { card.appendChild(number); host.appendChild(card); continue; }
    const sRels = rels(files, path);
    const layoutPath = [...sRels.values()].find(r => r.type.endsWith('/slideLayout'))?.target;
    const ld = layoutPath ? xml(files, layoutPath) : null;
    const lRels = layoutPath ? rels(files, layoutPath) : new Map();
    const masterPath = [...lRels.values()].find((r: any) => r.type.endsWith('/slideMaster'))?.target as string | undefined;
    const md = masterPath ? xml(files, masterPath) : null;
    const lph = placeholders(ld), mph = placeholders(md);
    const bg = background(sd, sRels) ?? background(ld, lRels) ?? (masterPath ? background(md, rels(files, masterPath)) : null);
    if (bg?.fill) card.style.background = bg.fill;
    if (bg?.img) { card.style.backgroundImage = `url("${bg.img}")`; card.style.backgroundSize = 'cover'; }

    const place = (box: HTMLElement, f: Xfrm) => {
      Object.assign(box.style, { left: `${f.x / W * 100}%`, top: `${f.y / H * 100}%`, width: `${f.cx / W * 100}%`, height: `${f.cy / H * 100}%` });
    };
    // Group children use their own coordinate space, mapped onto the group's box
    type Map2 = (f: Xfrm) => Xfrm;
    const walk = (tree: Element, map: Map2) => {
      for (const c of kids(tree)) {
        if (c.localName === 'grpSp') {
          const x = kid(kid(c, 'grpSpPr'), 'xfrm');
          const off = kid(x, 'off'), ext = kid(x, 'ext'), choff = kid(x, 'chOff'), chext = kid(x, 'chExt');
          if (off && ext && choff && chext) {
            const g = { x: num(attr(off, 'x')), y: num(attr(off, 'y')), cx: num(attr(ext, 'cx')), cy: num(attr(ext, 'cy')) };
            const ch = { x: num(attr(choff, 'x')), y: num(attr(choff, 'y')), cx: num(attr(chext, 'cx'), 1) || 1, cy: num(attr(chext, 'cy'), 1) || 1 };
            walk(c, f => map({ x: g.x + (f.x - ch.x) * g.cx / ch.cx, y: g.y + (f.y - ch.y) * g.cy / ch.cy, cx: f.cx * g.cx / ch.cx, cy: f.cy * g.cy / ch.cy }));
          } else walk(c, map);
        } else if (c.localName === 'sp') {
          const k = phKey(c);
          const inherited = k ? (k.idx && lph.byIdx.get(k.idx)) || lph.byType.get(k.type) || mph.byType.get(k.type) || null : null;
          const f = xfrmOf(kid(c, 'spPr')) ?? inherited?.xfrm ?? (k ? mph.byType.get(k.type)?.xfrm : null);
          const tx = kid(c, 'txBody');
          const fill = color(kid(kid(c, 'spPr'), 'solidFill'));
          if (!f || (!tx?.textContent?.trim() && !fill)) continue;
          const box = el('div', 'cm-slide-box');
          place(box, map(f));
          if (fill) box.style.background = fill;
          const line = kid(kid(c, 'spPr'), 'ln');
          const lc = line ? color(kid(line, 'solidFill')) : null;
          if (lc) box.style.border = `1px solid ${lc}`;
          if (tx) textBody(tx, box, k?.type, inherited?.sp ?? null);
          card.appendChild(box);
        } else if (c.localName === 'pic') {
          const f = xfrmOf(kid(c, 'spPr'));
          const blip = find(kid(c, 'blipFill'), 'blip');
          const url = blip ? pics.url(sRels.get(attr(blip, 'embed') ?? '')?.target ?? '') : null;
          if (!f || !url) continue;
          const img = el('img', 'cm-slide-img'); img.src = url; img.alt = '';
          place(img, map(f));
          card.appendChild(img);
        } else if (c.localName === 'graphicFrame') {
          const f = xfrmOf(c);
          const tbl = find(c, 'tbl');
          if (!f) continue;
          const box = el('div', 'cm-slide-box');
          place(box, map(f));
          if (tbl) tableOf(tbl, box);
          else { box.classList.add('cm-slide-chart'); box.textContent = 'Chart or diagram: download the file to see it'; }
          card.appendChild(box);
        }
      }
    };
    const tree = find(sd, 'spTree');
    if (tree) walk(tree, f => f);
    card.appendChild(number);
    host.appendChild(card);
  }
}

// ══ Spreadsheets ═══════════════════════════════════════════════════════════

const MAX_ROWS = 1500, MAX_COLS = 60;

async function renderSheet(data: Uint8Array, host: HTMLElement) {
  const XLSX = await xlsxLib();
  const wb = XLSX.read(data, { type: 'array', cellDates: true });
  const tabs = el('div', 'cm-sheet-tabs');
  const view = el('div', 'cm-sheet-view');
  const show = (name: string) => {
    view.textContent = '';
    tabs.querySelectorAll('button').forEach(b => b.classList.toggle('is-on', b.dataset.name === name));
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, raw: false, defval: '' }) as unknown[][];
    const width = Math.min(MAX_COLS, rows.reduce((m, r) => Math.max(m, r.length), 0));
    const t = el('table', 'cm-sheet-table');
    const head = el('tr');
    head.appendChild(el('th'));
    for (let c = 0; c < width; c++) { const th = el('th'); th.textContent = XLSX.utils.encode_col(c); head.appendChild(th); }
    t.appendChild(head);
    rows.slice(0, MAX_ROWS).forEach((r, i) => {
      const tr = el('tr');
      const th = el('th'); th.textContent = String(i + 1); tr.appendChild(th);
      for (let c = 0; c < width; c++) { const td = el('td'); td.textContent = String(r[c] ?? ''); tr.appendChild(td); }
      t.appendChild(tr);
    });
    view.appendChild(t);
    if (rows.length > MAX_ROWS || width === MAX_COLS) {
      const note = el('p', 'cm-sheet-note'); note.textContent = `Showing the first ${MAX_ROWS} rows and ${MAX_COLS} columns. Download the file to see everything.`;
      view.appendChild(note);
    }
    if (!rows.length) { const note = el('p', 'cm-sheet-note'); note.textContent = 'This sheet is empty.'; view.appendChild(note); }
  };
  wb.SheetNames.forEach(n => {
    const b = el('button', 'cm-tab'); b.type = 'button'; b.textContent = n; b.dataset.name = n;
    b.onclick = () => show(n);
    tabs.appendChild(b);
  });
  if (wb.SheetNames.length > 1) host.appendChild(tabs);
  host.appendChild(view);
  if (wb.SheetNames.length) show(wb.SheetNames[0]);
}

/** Draws the file into host; returns a function that frees its pictures. */
export async function renderOffice(kind: OfficeKind, data: Uint8Array, host: HTMLElement): Promise<() => void> {
  host.textContent = '';
  if (kind === 'sheet') { await renderSheet(data, host); return () => {}; }
  const files = await unzip(data);
  const pics = new Pictures(files);
  try {
    if (kind === 'docx') await renderDocx(files, host, pics);
    else await renderPptx(files, host, pics);
  } catch (e) { pics.release(); throw e; }
  return () => pics.release();
}
