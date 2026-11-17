import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, ChevronLeft, Download, FileText, Info, Loader2, Minus, Plus, X } from 'lucide-react';
import { absoluteLink, errMsg, type SignedLink } from '../../../api/materials';
import { downloadVia, fmtSize } from './shared';
import { officeKind, renderOffice } from './officeRender';
import './materials.css';

/**
 * Shows a stored file inside the app: PDFs drawn page by page with pdf.js (Android Chrome can't show
 * a PDF in a page, and this works the same everywhere), photos, plain text; anything else offers a
 * download. The file comes through a 5-minute signed link.
 */

type PdfLib = typeof import('pdfjs-dist/legacy/build/pdf.mjs');
let pdfLib: Promise<PdfLib> | null = null;
function loadPdf(): Promise<PdfLib> {
  if (!pdfLib) {
    pdfLib = Promise.all([
      import('pdfjs-dist/legacy/build/pdf.mjs'),
      import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
    ]).then(([lib, worker]) => {
      lib.GlobalWorkerOptions.workerSrc = worker.default;
      return lib;
    }).catch(e => { pdfLib = null; throw e; });
  }
  return pdfLib;
}

type Mode = 'pdf' | 'image' | 'text' | 'office' | 'other';

export interface ViewFile { id: string; name: string; size: number; contentType: string }

export function DocView({ file, getLink }: { file: ViewFile; getLink: (fileId: string, inline: boolean) => Promise<SignedLink> }) {
  const office = officeKind(file.name, file.contentType);
  // Word / PowerPoint the server may turn into an exact PDF (also old .doc / .ppt, which browsers can't read)
  const convertible = /\.(docx?|pptx?|odt|odp)$/i.test(file.name);
  const initial: Mode = file.contentType.startsWith('application/pdf') ? 'pdf'
    : file.contentType.startsWith('image/') ? 'image'
    : file.contentType.startsWith('text/plain') ? 'text'
    : office || convertible ? 'office' : 'other';
  const [mode, setMode] = useState<Mode>(initial);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>(initial === 'other' ? 'ready' : 'loading');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [src, setSrc] = useState<string>('');
  const [text, setText] = useState('');
  const [officeData, setOfficeData] = useState<Uint8Array | null>(null);
  const [pages, setPages] = useState(0);
  const [zoom, setZoom] = useState(1);
  const docRef = useRef<any>(null);
  const holder = useRef<HTMLDivElement>(null);
  const officeHost = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const drawId = useRef(0);

  const openPdf = async (data: Uint8Array) => {
    const lib = await loadPdf();
    const doc = await lib.getDocument({ data, isEvalSupported: false }).promise;
    docRef.current?.destroy?.();
    docRef.current = doc;
    return doc;
  };

  // Load the file
  useEffect(() => {
    let cancelled = false;
    setMode(initial);
    setState(initial === 'other' ? 'ready' : 'loading');
    setPages(0); setSrc(''); setText(''); setZoom(1); setOfficeData(null); setStatus('');
    if (initial === 'other') return;
    const bytes = async (url: string, timeoutMs = 60_000) => {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), timeoutMs);
      try {
        const resp = await fetch(url, { signal: ctl.signal });
        if (!resp.ok) throw new Error((await resp.text()) || 'The file could not be opened.');
        return new Uint8Array(await resp.arrayBuffer());
      } finally { clearTimeout(t); }
    };
    (async () => {
      try {
        const link = await getLink(file.id, true);
        const url = absoluteLink(link.url);
        if (initial === 'image') { if (!cancelled) { setSrc(url); setState('ready'); } return; }
        if (initial === 'text') {
          const t = new TextDecoder().decode(await bytes(url));
          if (!cancelled) { setText(t); setState('ready'); }
          return;
        }
        if (initial === 'office') {
          // Exact copy from the server (LibreOffice) when it has one; the first time it is made can take a while
          if (link.previewUrl) {
            try {
              if (!cancelled) setStatus('Preparing the pages… the first time can take up to a minute.');
              const doc = await openPdf(await bytes(absoluteLink(link.previewUrl), 180_000));
              if (cancelled) { doc.destroy(); return; }
              setMode('pdf'); setPages(doc.numPages); setState('ready');
              return;
            } catch { /* fall back to drawing it here */ }
          }
          if (!office) { if (!cancelled) { setMode('other'); setState('ready'); } return; }
          if (!cancelled) setStatus('');
          const data = await bytes(url);
          if (!cancelled) { setOfficeData(data); setMode('office'); setState('ready'); }
          return;
        }
        const doc = await openPdf(await bytes(url));
        if (cancelled) { doc.destroy(); return; }
        setPages(doc.numPages);
        setState('ready');
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.response ? errMsg(e) : e?.name === 'AbortError' ? 'This is taking too long. Download the file instead.' : (e?.message || 'The file could not be opened.'));
        setState('error');
      }
    })();
    return () => { cancelled = true; };
  }, [file.id, initial, office, getLink]);

  useEffect(() => () => { docRef.current?.destroy?.(); docRef.current = null; }, []);

  // Draw a Word / PowerPoint / Excel file once its bytes are here
  useEffect(() => {
    if (mode !== 'office' || state !== 'ready' || !officeData || !office || !officeHost.current) return;
    let release: (() => void) | null = null;
    let cancelled = false;
    renderOffice(office, officeData, officeHost.current)
      .then(r => { if (cancelled) r(); else release = r; })
      .catch(e => { if (!cancelled) { setError(e?.message || 'This file could not be shown.'); setState('error'); } });
    return () => { cancelled = true; release?.(); };
  }, [mode, state, officeData, office]);

  // Draw PDF pages at the screen's width × zoom, sharp on high-density screens
  const draw = useCallback(async () => {
    const doc = docRef.current, box = holder.current;
    if (!doc || !box) return;
    const id = ++drawId.current;
    const width = Math.max(240, (scroller.current?.clientWidth ?? 600) - 44);   // padding + room for a scrollbar
    const ratio = Math.min(window.devicePixelRatio || 1, 2.5);
    box.innerHTML = '';
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      if (docRef.current !== doc || drawId.current !== id) return;
      const base = page.getViewport({ scale: 1 });
      const fit = Math.min(width / base.width, 1.6) * zoom;
      const vp = page.getViewport({ scale: fit * ratio });
      const canvas = document.createElement('canvas');
      canvas.className = 'cm-doc-page';
      canvas.width = Math.floor(vp.width);
      canvas.height = Math.floor(vp.height);
      canvas.style.width = `${Math.floor(vp.width / ratio)}px`;
      canvas.style.height = `${Math.floor(vp.height / ratio)}px`;
      canvas.setAttribute('aria-label', `Page ${n} of ${doc.numPages}`);
      box.appendChild(canvas);
      await page.render({ canvasContext: canvas.getContext('2d')!, viewport: vp }).promise;
      if (drawId.current !== id) return;
    }
  }, [zoom]);

  useEffect(() => { if (state === 'ready' && mode === 'pdf') draw().catch(() => { /* a newer draw took over */ }); }, [state, mode, draw, pages]);
  useEffect(() => {
    if (mode !== 'pdf') return;
    let t: any;
    const onResize = () => { clearTimeout(t); t = setTimeout(() => draw().catch(() => {}), 250); };
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); clearTimeout(t); };
  }, [mode, draw]);

  const download = () => downloadVia(() => getLink(file.id, false));

  if (state === 'loading') return (
    <div className="cm-doc-scroll"><div className="cm-doc-msg"><Loader2 size={28} className="cm-spin" />
      <div>Opening {file.name}…</div>{status && <div style={{ fontSize: 12.5, color: '#94a3b8', marginTop: 6 }}>{status}</div>}</div></div>
  );
  if (state === 'error') return (
    <div className="cm-doc-scroll"><div className="cm-doc-msg">
      <AlertTriangle size={28} /><div>{error}</div>
      <button type="button" className="cm-ov-btn" style={{ marginTop: 14 }} onClick={download}><Download size={15} /> Download instead</button>
    </div></div>
  );
  if (mode === 'other') return (
    <div className="cm-doc-scroll"><div className="cm-doc-msg">
      <FileText size={34} />
      <div><b style={{ color: '#fff' }}>{file.name}</b><br />{fmtSize(file.size)} · {convertible
        ? 'older Word / PowerPoint files can only be shown here once the server can convert them. Download it to open it.'
        : 'this kind of file opens in its own app.'}</div>
      <button type="button" className="cm-ov-btn" style={{ marginTop: 14 }} onClick={download}><Download size={15} /> Download</button>
    </div></div>
  );
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <div className="cm-doc-scroll" ref={scroller}>
        {mode === 'image' && <img className="cm-doc-img" src={src} alt={file.name} style={{ width: zoom === 1 ? undefined : `${zoom * 100}%`, maxWidth: zoom === 1 ? '100%' : 'none' }} />}
        {mode === 'text' && <div className="cm-doc-text" style={{ zoom }}><pre className="cm-pre">{text}</pre></div>}
        {mode === 'pdf' && <div ref={holder} />}
        {mode === 'office' && <>
          {office !== 'sheet' && <p className="cm-doc-note"><Info size={13} style={{ flexShrink: 0, marginTop: 1 }} />A quick view drawn in your browser: fonts and some drawings can differ from Office. Download for the original.</p>}
          <div className="cm-office" ref={officeHost} style={{ zoom }} />
        </>}
      </div>
      <div className="cm-zoom">
        <>
          <button type="button" className="cm-ov-btn" onClick={() => setZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2)))} aria-label="Zoom out"><Minus size={16} /></button>
          <span>{Math.round(zoom * 100)}%{mode === 'pdf' && pages ? ` · ${pages}p` : ''}</span>
          <button type="button" className="cm-ov-btn" onClick={() => setZoom(z => Math.min(3, +(z + 0.25).toFixed(2)))} aria-label="Zoom in"><Plus size={16} /></button>
        </>
        <button type="button" className="cm-ov-btn" onClick={download} aria-label={`Download ${file.name}`} title="Download"><Download size={16} /></button>
      </div>
    </div>
  );
}

/** Full-screen viewer for one or several files (tabs). Escape or the back button closes it. */
export function FileViewer({ files, startId, title, subtitle, getLink, onClose }: {
  files: ViewFile[]; startId?: string; title: string; subtitle?: string;
  getLink: (fileId: string, inline: boolean) => Promise<SignedLink>; onClose: () => void;
}) {
  const [current, setCurrent] = useState(startId ?? files[0]?.id);
  const file = files.find(f => f.id === current) ?? files[0];
  const closeRef = useRef<HTMLButtonElement>(null);
  // Take the focus (so Escape closes only the viewer, not a dialog behind it) and give it back after
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    closeRef.current?.focus({ preventScroll: true });
    return () => before?.focus?.({ preventScroll: true });
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    document.addEventListener('keydown', onKey, true);
    const html = document.documentElement, body = document.body;
    const prev = [html.style.overflow, body.style.overflow];
    html.style.overflow = 'hidden'; body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey, true); html.style.overflow = prev[0]; body.style.overflow = prev[1]; };
  }, [onClose]);
  if (!file) return null;
  return createPortal(
    <div className="cm-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="cm-ov-top">
        <button type="button" className="cm-ov-btn" ref={closeRef} onClick={onClose} aria-label="Close"><ChevronLeft size={18} /><span className="cm-hide-sm">Back</span></button>
        <div className="cm-ov-title"><b>{title}</b><span>{subtitle ?? file.name}</span></div>
        <button type="button" className="cm-ov-btn" onClick={() => downloadVia(() => getLink(file.id, false))} aria-label="Download">
          <Download size={16} /><span className="cm-hide-sm">Download</span>
        </button>
        <button type="button" className="cm-ov-btn" onClick={onClose} aria-label="Close viewer"><X size={18} /></button>
      </div>
      {files.length > 1 && (
        <div className="cm-tabs" role="tablist">
          {files.map(f => (
            <button key={f.id} type="button" role="tab" aria-selected={f.id === file.id}
              className={`cm-tab${f.id === file.id ? ' is-on' : ''}`} onClick={() => setCurrent(f.id)} title={f.name}>{f.name}</button>
          ))}
        </div>
      )}
      <div className="cm-ov-body"><div className="cm-ov-doc"><DocView key={file.id} file={file} getLink={getLink} /></div></div>
    </div>,
    document.body,
  );
}
