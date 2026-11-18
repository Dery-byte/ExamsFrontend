import { Fragment, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { ClipboardList, Download, Eye, FileText, Link2, Loader2, MoreVertical, Plus, UploadCloud } from 'lucide-react';
import { tx } from '../../../utils/terms';
import toast from 'react-hot-toast';
import { absoluteLink, errMsg, type FileInfo, type MaterialKind, type SignedLink } from '../../../api/materials';

/** Base path of the staff area this page is in. */
export function useMaterialsBase(): string {
  const p = useLocation().pathname;
  if (p.startsWith('/super-admin')) return '/super-admin';
  if (p.startsWith('/admin')) return '/admin';
  return '/lect';
}

// ── Formatting ─────────────────────────────────────────────────────────────

export const fmtWhen = (iso?: string | null) => iso
  ? new Date(iso).toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
  : '—';
export const fmtDay = (iso?: string | null) => iso
  ? new Date(iso + (iso.length === 10 ? 'T00:00' : '')).toLocaleDateString([], { day: 'numeric', month: 'short' })
  : '';
export const fmtRange = (start?: string | null, end?: string | null) => start && end ? `${fmtDay(start)} – ${fmtDay(end)}` : '';
export const fmtSize = (b: number) => b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : b >= 1024 ? `${Math.round(b / 1024)} KB` : `${b} B`;
export const plain = (n: number | null | undefined) => n == null ? '' : String(Number(n));

/** "in 3 days", "2 hours ago" for due dates. */
export function relative(iso: string, now = Date.now()) {
  const diff = new Date(iso).getTime() - now;
  const abs = Math.abs(diff);
  const m = Math.round(abs / 60000), h = Math.round(abs / 3600000), d = Math.round(abs / 86400000);
  const s = m < 60 ? `${m} min` : h < 36 ? `${h} hour${h === 1 ? '' : 's'}` : `${d} day${d === 1 ? '' : 's'}`;
  return diff >= 0 ? `in ${s}` : `${s} ago`;
}

/** Value for <input type="datetime-local"> from a server LocalDateTime, and back. */
export const toLocalInput = (iso?: string | null) => (iso ? iso.slice(0, 16) : '');
export const fromLocalInput = (v: string) => (v ? (v.length === 16 ? v + ':00' : v) : null);
export const localNowInput = (plusMinutes = 0) => {
  const d = new Date(Date.now() + plusMinutes * 60000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const kindLabel: Record<MaterialKind, string> = { NOTE: 'Notes', LINK: 'Link', ASSIGNMENT: 'Assignment' };
export function KindIcon({ kind, size = 18 }: { kind: MaterialKind; size?: number }) {
  return (
    <span className={`cm-item-icon cm-k-${kind}`} aria-hidden>
      {kind === 'NOTE' ? <FileText size={size} /> : kind === 'LINK' ? <Link2 size={size} /> : <ClipboardList size={size} />}
    </span>
  );
}

/** Files the viewer can show: PDFs, pictures, text, and Word / PowerPoint / Excel (drawn in the browser or converted by the server). */
export const canPreview = (f: { contentType: string; name?: string }) =>
  f.contentType.startsWith('application/pdf') || f.contentType.startsWith('image/') || f.contentType.startsWith('text/')
  || /\.(docx?|pptx?|xlsx?|odt|odp|ods|csv)$/i.test(f.name ?? '')
  || /wordprocessingml|presentationml|spreadsheetml|msword|ms-powerpoint|ms-excel|opendocument/.test(f.contentType);

export const weekName = (n: number) => (n === 0 ? 'General' : `Week ${n}`);

// ── Downloads ──────────────────────────────────────────────────────────────

/** Fetches a 5-minute link and starts the download in this tab (the server sends it as an attachment). */
export async function downloadVia(getLink: () => Promise<SignedLink | { url: string }>) {
  try {
    const l = await getLink();
    const a = document.createElement('a');
    a.href = absoluteLink(l.url);
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (e) {
    toast.error(errMsg(e, 'The download could not start.'));
  }
}

// ── Small parts ────────────────────────────────────────────────────────────

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; disabled?: boolean }) {
  return (
    <label className="cm-switch">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} />
      <span className="cm-switch-track" aria-hidden />
      <span>{label}</span>
    </label>
  );
}

/**
 * A ⋮ menu. The list is drawn on top of the page (in <body>), placed by its button, so cards with
 * rounded clipped corners and scrolling tables can't hide it. It opens upwards when there is no room
 * below, stays inside the screen, and closes on a click outside, Escape, scrolling or resizing.
 */
export function Menu({ label, children }: { label: string; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);

  // Place it once it has a size: under the button, right edges lined up; above when it won't fit below
  useLayoutEffect(() => {
    if (!open || !btn.current || !list.current) return;
    const b = btn.current.getBoundingClientRect();
    const m = list.current.getBoundingClientRect();
    const gap = 4, edge = 8;
    let top = b.bottom + gap;
    if (top + m.height > window.innerHeight - edge && b.top - gap - m.height > edge) top = b.top - gap - m.height;
    const left = Math.min(Math.max(edge, b.right - m.width), window.innerWidth - m.width - edge);
    setPos({ top, left });
  }, [open]);

  useEffect(() => {
    if (!open) { setPos(null); return; }
    // Resizing reports the window itself, which isn't a page element
    const inside = (t: EventTarget | null) => t instanceof Node && !!(btn.current?.contains(t) || list.current?.contains(t));
    const onDown = (e: MouseEvent | TouchEvent) => { if (!inside(e.target)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus(); } };
    const onMove = (e: Event) => { if (!inside(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      document.removeEventListener('mousedown', onDown); document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onMove, true); window.removeEventListener('resize', onMove);
    };
  }, [open]);

  return (
    <div className="cm-menu-wrap">
      <button type="button" ref={btn} className="cm-icon-btn" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <MoreVertical size={17} />
      </button>
      {open && createPortal(
        <div ref={list} className="cm-menu" role="menu"
          style={{ position: 'fixed', top: pos?.top ?? -9999, left: pos?.left ?? -9999, right: 'auto', visibility: pos ? 'visible' : 'hidden' }}>
          {children(() => setOpen(false))}
        </div>,
        document.body,
      )}
    </div>
  );
}

/** Drag-and-drop or tap to pick files; checks type and size before anything is sent. */
export function DropZone({ accepted, maxMb, maxFiles, onFiles, label, disabled }: {
  accepted: string[]; maxMb: number; maxFiles: number; onFiles: (f: File[]) => void; label?: string; disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const take = (list: FileList | null) => {
    if (!list || disabled) return;
    const ok: File[] = [];
    for (const f of Array.from(list)) {
      const ext = f.name.includes('.') ? f.name.split('.').pop()!.toLowerCase() : '';
      if (!accepted.includes(ext)) { toast.error(`"${f.name}" can't be uploaded. Allowed: ${accepted.join(', ')}`); continue; }
      if (f.size > maxMb * 1024 * 1024) { toast.error(`"${f.name}" is larger than ${maxMb} MB`); continue; }
      if (f.size === 0) { toast.error(`"${f.name}" is empty`); continue; }
      ok.push(f);
    }
    if (ok.length > maxFiles) { toast.error(`Choose at most ${maxFiles} files`); ok.length = maxFiles; }
    if (ok.length) onFiles(ok);
    if (input.current) input.current.value = '';
  };
  return (
    <div className={`cm-drop${over ? ' is-over' : ''}`} role="button" tabIndex={0} aria-disabled={disabled}
      onClick={() => !disabled && input.current?.click()}
      onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !disabled) { e.preventDefault(); input.current?.click(); } }}
      onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); take(e.dataTransfer.files); }}>
      <UploadCloud size={26} />
      <span><b>{label ?? 'Choose files'}</b> or drop them here</span>
      <div className="cm-help" style={{ marginTop: 4 }}>Up to {maxFiles} files, {maxMb} MB each · {accepted.join(', ')}</div>
      <input ref={input} type="file" multiple hidden accept={accepted.map(a => '.' + a).join(',')} onChange={e => take(e.target.files)} />
    </div>
  );
}

/** A file with View (when the browser can show it) and Download. */
export function FileRow({ file, onView, onDownload, extra }: {
  file: FileInfo | { id: string; name: string; size: number; contentType: string }; onView?: () => void; onDownload?: () => void; extra?: ReactNode;
}) {
  return (
    <div className="cm-file">
      <FileText className="cm-file-icon" size={15} color="#64748b" aria-hidden />
      <span className="cm-file-name" title={file.name}>{file.name}</span>
      <span className="cm-file-size">{fmtSize(file.size)}</span>
      {onView && canPreview(file) && (
        <button type="button" className="cm-btn-ghost cm-btn-sm" onClick={onView} aria-label={`View ${file.name}`}><Eye size={14} /><span className="cm-view-label"> View</span></button>
      )}
      {onDownload && (
        <button type="button" className="cm-icon-btn" style={{ width: 32, height: 32 }} onClick={onDownload} aria-label={`Download ${file.name}`}><Download size={15} /></button>
      )}
      {extra}
    </div>
  );
}

/**
 * A week's items in two clearly labelled parts: course materials (notes and links) first, then
 * assignments. A part with nothing in it isn't shown. onAdd (staff) puts an Add button on each heading.
 */
export function WeekSections<T extends { id: number; kind: MaterialKind }>({ items, render, onAdd }: {
  items: T[]; render: (item: T) => ReactNode; onAdd?: (kind: MaterialKind) => void;
}) {
  const materials = items.filter(i => i.kind !== 'ASSIGNMENT');
  const assignments = items.filter(i => i.kind === 'ASSIGNMENT');
  const group = (key: 'materials' | 'assignments', list: T[]) => {
    if (!list.length) return null;
    const isWork = key === 'assignments';
    return (
      <div className={`cm-group cm-group-${key}`} role="group" aria-label={isWork ? 'Assignments' : tx('Course materials')}>
        <div className="cm-group-head">
          <span className="cm-group-icon" aria-hidden>{isWork ? <ClipboardList size={14} /> : <FileText size={14} />}</span>
          <span className="cm-group-title">{isWork ? 'Assignments' : tx('Course materials')}</span>
          <span className="cm-group-count">{list.length}</span>
          {onAdd && (
            <button type="button" className="cm-group-add" onClick={() => onAdd(isWork ? 'ASSIGNMENT' : 'NOTE')}
              aria-label={isWork ? 'Add an assignment to this week' : 'Add notes to this week'}>
              <Plus size={13} /> Add
            </button>
          )}
        </div>
        {list.map(i => <Fragment key={i.id}>{render(i)}</Fragment>)}
      </div>
    );
  };
  return <>{group('materials', materials)}{group('assignments', assignments)}</>;
}

export function Spinner({ label }: { label?: string }) {
  return <div className="cm-empty"><Loader2 size={22} className="cm-spin" /><div>{label ?? 'Loading…'}</div></div>;
}
