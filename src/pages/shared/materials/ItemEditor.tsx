import { useState } from 'react';
import toast from 'react-hot-toast';
import { ClipboardList, FileText, Link2, Loader2, Sparkles, Trash2 } from 'lucide-react';
import AppModal from '../../../components/ui/AppModal';
import {
  createMaterial, errMsg, removeMaterialFile, updateMaterial, addMaterialFiles,
  type MaterialInput, type MaterialKind, type StaffItem, type StaffSpace, type Visibility, type AiProviderKey,
} from '../../../api/materials';
import { DropZone, fmtRange, fmtSize, fromLocalInput, localNowInput, toLocalInput, weekName } from './shared';
import { tx } from '../../../utils/terms';

/** Add or edit notes, a link or an assignment in a course week. */
export default function ItemEditor({ space, item, week, kind: startKind, onClose, onSaved }: {
  space: StaffSpace; item?: StaffItem | null; week?: number; kind?: MaterialKind;
  onClose: () => void; onSaved: (s: StaffSpace) => void;
}) {
  const editing = !!item;
  const [kind, setKind] = useState<MaterialKind>(item?.kind ?? startKind ?? 'NOTE');
  const [weekNumber, setWeekNumber] = useState<number>(item?.weekNumber ?? week ?? Math.max(space.currentWeek, 0));
  const [title, setTitle] = useState(item?.title ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [linkUrl, setLinkUrl] = useState(item?.linkUrl ?? '');
  const [visibility, setVisibility] = useState<Visibility>(item?.visibility ?? 'VISIBLE');
  const [visibleFrom, setVisibleFrom] = useState(toLocalInput(item?.visibleFrom) || localNowInput(60));
  const [pinned, setPinned] = useState(item?.pinned ?? false);
  const a = item?.assignment;
  const [dueAt, setDueAt] = useState(toLocalInput(a?.dueAt) || '');
  const [maxMarks, setMaxMarks] = useState(a?.maxMarks != null ? String(Number(a.maxMarks)) : '10');
  const [markingGuide, setMarkingGuide] = useState(a?.markingGuide ?? '');
  const [aiProvider, setAiProvider] = useState<AiProviderKey | ''>(a?.aiProvider ?? '');
  const [allowTyped, setAllowTyped] = useState(a?.allowTyped ?? true);
  const [allowFiles, setAllowFiles] = useState(a?.allowFiles ?? true);
  const [files, setFiles] = useState<File[]>([]);
  const [existing, setExisting] = useState(item?.files ?? []);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);

  const weeks = space.weeks;
  const configuredAi = space.aiProviders.filter(p => p.configured);

  const save = async () => {
    if (!title.trim()) { toast.error('Give it a title'); return; }
    if (kind === 'LINK' && !linkUrl.trim()) { toast.error('Paste the link'); return; }
    if (kind === 'ASSIGNMENT' && !dueAt) { toast.error('Choose the due date'); return; }
    if (kind === 'ASSIGNMENT' && !allowTyped && !allowFiles) { toast.error('Let students type, upload files, or both'); return; }
    if (kind === 'NOTE' && !editing && files.length === 0 && !description.trim()) { toast.error('Add a file (or some text)'); return; }
    if (visibility === 'SCHEDULED' && !visibleFrom) { toast.error('Choose when students will see it'); return; }
    const marks = Number(maxMarks);
    if (kind === 'ASSIGNMENT' && (!Number.isFinite(marks) || marks <= 0)) { toast.error('Enter the marks it is out of'); return; }

    const data: MaterialInput = {
      weekNumber, kind, title: title.trim(), description, pinned, visibility,
      visibleFrom: visibility === 'SCHEDULED' ? fromLocalInput(visibleFrom) : null,
      ...(kind === 'LINK' ? { linkUrl: linkUrl.trim() } : {}),
      ...(kind === 'ASSIGNMENT' ? { dueAt: fromLocalInput(dueAt), maxMarks: marks, markingGuide, aiProvider, allowTyped, allowFiles } : {}),
    };
    setBusy(true);
    try {
      let s: StaffSpace;
      if (editing) {
        s = await updateMaterial(item!.id, data);
        if (files.length) { setProgress(0); s = await addMaterialFiles(item!.id, files, setProgress); }
      } else {
        if (files.length) setProgress(0);
        s = await createMaterial(space.course.id, data, files, setProgress);
      }
      toast.success(editing ? 'Saved' : visibility === 'VISIBLE' ? 'Posted' : visibility === 'SCHEDULED' ? 'Scheduled' : 'Saved as draft');
      onSaved(s);
      onClose();
    } catch (e) {
      toast.error(errMsg(e, 'Could not save'));
    } finally { setBusy(false); setProgress(null); }
  };

  const removeExisting = async (fileId: string) => {
    if (!item || !window.confirm('Remove this file?')) return;
    try {
      const s = await removeMaterialFile(item.id, fileId);
      setExisting(ex => ex.filter(f => f.id !== fileId));
      onSaved(s);
    } catch (e) { toast.error(errMsg(e, 'Could not remove the file')); }
  };

  const kindTabs: { k: MaterialKind; label: string; Icon: any }[] = [
    { k: 'NOTE', label: 'Notes', Icon: FileText }, { k: 'LINK', label: 'Link', Icon: Link2 }, { k: 'ASSIGNMENT', label: 'Assignment', Icon: ClipboardList },
  ];

  return (
    <AppModal size="lg" closeOnBackdrop={false} onClose={() => !busy && onClose()}
      title={editing ? `Edit ${kind === 'ASSIGNMENT' ? 'assignment' : kind === 'LINK' ? 'link' : 'notes'}` : 'Add to the course'}
      subtitle={tx(`${space.course.code ?? ''} ${space.course.title}`.trim())}
      footer={<>
        <button type="button" className="cm-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
        <button type="button" className="cm-btn" onClick={save} disabled={busy}>
          {busy && <Loader2 size={15} className="cm-spin" />}
          {editing ? 'Save' : visibility === 'VISIBLE' ? 'Post now' : visibility === 'SCHEDULED' ? 'Schedule' : 'Save draft'}
        </button>
      </>}>
      <div className="cm-grid">
        {!editing && (
          <div className="cm-seg" role="tablist" aria-label="What are you adding?">
            {kindTabs.map(t => (
              <button key={t.k} type="button" role="tab" aria-selected={kind === t.k} className={kind === t.k ? 'is-on' : ''} onClick={() => setKind(t.k)}>
                <t.Icon size={15} /> {t.label}
              </button>
            ))}
          </div>
        )}

        <div className="cm-grid cm-grid-2">
          <label className="cm-field">Week
            <select className="cm-select" value={weekNumber} onChange={e => setWeekNumber(Number(e.target.value))}>
              {weeks.map(w => (
                <option key={w.number} value={w.number}>
                  {weekName(w.number)}{w.topic ? ` · ${w.topic}` : ''}{w.start ? ` (${fmtRange(w.start, w.end)})` : ''}{w.number === space.currentWeek ? ' · this week' : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="cm-field">Title
            <input className="cm-input" value={title} maxLength={200} onChange={e => setTitle(e.target.value)}
              placeholder={kind === 'ASSIGNMENT' ? 'e.g. Assignment 1: Linked lists' : kind === 'LINK' ? 'e.g. Lecture video' : 'e.g. Lecture 5 slides'} />
          </label>
        </div>

        {kind === 'LINK' && (
          <label className="cm-field">Link
            <input className="cm-input" type="url" inputMode="url" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://…" />
          </label>
        )}

        <label className="cm-field">{kind === 'ASSIGNMENT' ? 'Instructions for students' : 'Description (optional)'}
          <textarea className="cm-textarea" value={description} maxLength={20000} onChange={e => setDescription(e.target.value)}
            placeholder={kind === 'ASSIGNMENT' ? 'The questions, what to hand in, how it will be marked…' : 'What students should do with it'} />
        </label>

        {kind === 'ASSIGNMENT' && (
          <>
            <div className="cm-grid cm-grid-2">
              <label className="cm-field">Due date and time
                <input className="cm-input" type="datetime-local" value={dueAt} min={editing ? undefined : localNowInput(5)} onChange={e => setDueAt(e.target.value)} />
                <span className="cm-help">Submissions close then. You can reopen them later with a new closing date.</span>
              </label>
              <label className="cm-field">Marked out of
                <input className="cm-input" type="number" min={1} max={1000} step="0.5" inputMode="decimal" value={maxMarks} onChange={e => setMaxMarks(e.target.value)} />
              </label>
            </div>
            <div className="cm-grid cm-grid-2">
              <label className="cm-check"><input type="checkbox" checked={allowFiles} onChange={e => setAllowFiles(e.target.checked)} />
                <span>Students upload files<small>PDF, Word or photos of handwritten work</small></span></label>
              <label className="cm-check"><input type="checkbox" checked={allowTyped} onChange={e => setAllowTyped(e.target.checked)} />
                <span>Students type their answer<small>Written in the page</small></span></label>
            </div>
            <label className="cm-field"><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Sparkles size={14} color="#7c3aed" /> Marking guide (only you and the AI see it)</span>
              <textarea className="cm-textarea" value={markingGuide} maxLength={20000} onChange={e => setMarkingGuide(e.target.value)}
                placeholder={'Model answers and how marks are shared, e.g.\nQ1 (4 marks): defines a node and a pointer…\nQ2 (6 marks): …'} />
              <span className="cm-help">The clearer the guide, the closer the AI's suggested marks will be to yours.</span>
            </label>
            <label className="cm-field">AI for suggested marks
              <select className="cm-select" value={aiProvider} onChange={e => setAiProvider(e.target.value as AiProviderKey | '')}>
                <option value="">Automatic{configuredAi.length ? ` (${configuredAi[0].label})` : ''}</option>
                {space.aiProviders.map(p => (
                  <option key={p.key} value={p.key} disabled={!p.configured}>
                    {p.label}{p.readsScans ? ' · reads scans and photos' : ' · typed text only'}{p.configured ? '' : ' · not set up'}
                  </option>
                ))}
              </select>
              {configuredAi.length === 0 && <span className="cm-help">No AI is set up on this server, so you'll mark by hand. The developer can add an AI key.</span>}
            </label>
          </>
        )}

        {kind !== 'LINK' && (
          <div className="cm-field">{kind === 'ASSIGNMENT' ? 'Question paper and other files (optional)' : 'Files'}
            {kind === 'ASSIGNMENT' && <span className="cm-help" style={{ marginTop: -2 }}>Students download these, and the AI reads them as the questions when it suggests marks.</span>}
            {existing.length > 0 && (
              <div className="cm-files" style={{ marginTop: 0 }}>
                {existing.map(f => (
                  <div className="cm-file" key={f.id}>
                    <FileText size={15} color="#64748b" aria-hidden />
                    <span className="cm-file-name">{f.name}</span><span className="cm-file-size">{fmtSize(f.size)}</span>
                    <button type="button" className="cm-icon-btn" style={{ width: 32, height: 32 }} onClick={() => removeExisting(f.id)} aria-label={`Remove ${f.name}`}><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}
            <DropZone accepted={space.limits.accepted} maxMb={space.limits.maxFileMb} maxFiles={space.limits.maxFiles - files.length}
              onFiles={f => setFiles(prev => [...prev, ...f].slice(0, space.limits.maxFiles))} disabled={busy} />
            {files.length > 0 && (
              <div className="cm-files">
                {files.map((f, i) => (
                  <div className="cm-file" key={i}>
                    <FileText size={15} color="var(--brand-text)" aria-hidden />
                    <span className="cm-file-name">{f.name}</span><span className="cm-file-size">{fmtSize(f.size)}</span>
                    <button type="button" className="cm-icon-btn" style={{ width: 32, height: 32 }} onClick={() => setFiles(fs => fs.filter((_, j) => j !== i))} aria-label={`Remove ${f.name}`} disabled={busy}><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}
            {progress != null && <div className="cm-progress" aria-label="Upload progress"><span style={{ width: `${Math.round(progress * 100)}%` }} /></div>}
          </div>
        )}

        <div className="cm-field">Who sees it
          <div className="cm-choices cm-choices-3">
            {([
              ['VISIBLE', 'Students see it', 'As soon as its week is open'],
              ['SCHEDULED', 'Show it later', 'On a date and time you choose'],
              ['DRAFT', 'Keep as draft', 'Only staff see it for now'],
            ] as [Visibility, string, string][]).map(([v, label, hint]) => (
              <label key={v} className={`cm-choice${visibility === v ? ' is-on' : ''}`}>
                <input type="radio" name="cm-vis" checked={visibility === v} onChange={() => setVisibility(v)} />
                <span><b>{label}</b><small>{hint}</small></span>
              </label>
            ))}
            {editing && item?.visibility === 'HIDDEN' && (
              <label className={`cm-choice${visibility === 'HIDDEN' ? ' is-on' : ''}`}>
                <input type="radio" name="cm-vis" checked={visibility === 'HIDDEN'} onChange={() => setVisibility('HIDDEN')} />
                <span><b>Hidden</b><small>Taken down from students</small></span>
              </label>
            )}
          </div>
          {visibility === 'SCHEDULED' && (
            <input className="cm-input" type="datetime-local" value={visibleFrom} onChange={e => setVisibleFrom(e.target.value)} aria-label="Show from" />
          )}
        </div>

        <label className="cm-check"><input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} />
          <span>Pin to the top of its week</span></label>
      </div>
    </AppModal>
  );
}
