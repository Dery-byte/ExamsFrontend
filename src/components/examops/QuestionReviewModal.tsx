import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle, Check, CircleCheck, FileSpreadsheet, Loader2, Pencil, Plus, RotateCcw, Trash2, Upload, X,
} from 'lucide-react';
import { allowedTypes, checkDrafts, draftToItem, plainText, tagged, TYPE_LABEL } from '../../utils/questionImport';
import type { Draft, DraftErrors, ImportTarget, QType } from '../../utils/questionImport';

/**
 * Full-screen review of a bulk question upload (quiz Add Questions and the Question Bank). Every question
 * from the file is shown; those with something missing open as forms with the problem under the field,
 * and Approve stays off until they are fixed or removed. The drafts live in the parent (setDrafts), so
 * closing the window keeps the corrections.
 */

export interface ReviewSetting {
  id: string; label: string; value: string; onChange: (v: string) => void; placeholder?: string; error?: string;
}

export interface QuestionReviewProps {
  title: string;
  fileName: string;
  target: ImportTarget;
  drafts: Draft[];
  setDrafts: Dispatch<SetStateAction<Draft[]>>;
  /** Questions in the file this upload leaves out (from readQuestionFile). */
  note?: string;
  /** A button beside the note, e.g. to review the file's theory questions instead. */
  noteAction?: { label: string; onClick: () => void };
  maxItems?: number;
  maxItemsMessage?: (count: number) => string;
  /** The bank's default topic / difficulty, shown for questions that don't set their own. */
  defaults?: { topic?: string; difficulty?: string };
  /** Number fields the upload needs besides the questions, e.g. Section B's Questions to Answer. */
  settings?: { title: string; fields: ReviewSetting[] };
  /** Why Approve is off apart from the questions themselves (e.g. a setting left empty). */
  blockReason?: string;
  approveLabel?: (count: number) => string;
  /** Uploads the items; a rejection's message is shown in the window, which stays open. */
  onApprove: (items: any[]) => Promise<void>;
  onClose: () => void;
}

type Filter = 'all' | 'fix' | 'removed';
type Patch = (id: string, p: Partial<Draft>) => void;

const LETTERS = ['A', 'B', 'C', 'D'];
const DIFF_LABEL: Record<string, string> = { EASY: 'Easy', MEDIUM: 'Medium', HARD: 'Hard' };

/** The server's message: a plain string body or { message }. */
export function uploadErrorMessage(err: any): string {
  const d = err?.response?.data;
  return (typeof d === 'string' && d) || d?.message || 'The upload failed. Check your connection and try again.';
}

// Question text from .json files is HTML; parsing it on every keystroke for 500 questions adds up
const plainCache = new Map<string, string>();
function plain(d: Draft) {
  if (!d.html) return d.text;
  let t = plainCache.get(d.text);
  if (t == null) {
    t = plainText(d.text, true);
    if (plainCache.size > 2000) plainCache.clear();
    plainCache.set(d.text, t);
  }
  return t;
}

const domId = (id: string, f: string) => `qrv-${id.replace(/[^A-Za-z0-9_-]/g, '_')}-${f}`;

export default function QuestionReviewModal({
  title, fileName, target, drafts, setDrafts, note, noteAction, maxItems, maxItemsMessage, defaults, settings, blockReason,
  approveLabel, onApprove, onClose,
}: QuestionReviewProps) {
  const checks = useMemo(() => checkDrafts(drafts, target), [drafts, target]);
  const included = useMemo(() => drafts.filter(d => !d.excluded), [drafts]);
  const problemIds = useMemo(() => included.filter(d => checks.has(d.id)).map(d => d.id), [included, checks]);
  const numbers = useMemo(() => new Map(included.map((d, i) => [d.id, i + 1])), [included]);
  const removedCount = drafts.length - included.length;

  // Questions with problems start open as forms
  const [editing, setEditing] = useState<Set<string>>(() => new Set(problemIds));
  const [filter, setFilter] = useState<Filter>('all');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const cards = useRef(new Map<string, HTMLElement>());
  const cursor = useRef(0);
  const mounted = useRef(true);

  const tooMany = maxItems != null && included.length > maxItems;
  const settingsMissing = settings?.fields.some(f => f.error);
  const canApprove = included.length > 0 && !problemIds.length && !tooMany && !blockReason && !settingsMissing && !busy;

  // Lock the page behind, focus the window, and give focus back on close
  useEffect(() => {
    mounted.current = true;
    const overflow = document.body.style.overflow;
    const before = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    rootRef.current?.focus();
    return () => { mounted.current = false; document.body.style.overflow = overflow; before?.focus?.(); };
  }, []);

  const patch: Patch = useCallback((id, p) => setDrafts(ds => ds.map(d => {
    if (d.id !== id) return d;
    const fileSaid = { ...d.fileSaid };
    Object.keys(p).forEach(k => { delete fileSaid[k as keyof typeof fileSaid]; });   // an edited field no longer quotes the file
    return { ...d, ...p, fileSaid };
  })), [setDrafts]);

  const toggleEdit = useCallback((id: string, on: boolean) => setEditing(s => {
    const n = new Set(s);
    if (on) n.add(id); else n.delete(id);
    return n;
  }), []);

  const registerCard = useCallback((id: string, el: HTMLElement | null) => {
    if (el) cards.current.set(id, el); else cards.current.delete(id);
  }, []);

  const typeCounts = useMemo(() => {
    const m = new Map<string, { total: number; on: number }>();
    drafts.forEach(d => {
      const c = m.get(d.type) ?? { total: 0, on: 0 };
      c.total++;
      if (!d.excluded) c.on++;
      m.set(d.type, c);
    });
    return m;
  }, [drafts]);
  const setTypeIncluded = (t: string, on: boolean) =>
    setDrafts(ds => ds.map(d => (d.type === t ? { ...d, excluded: !on } : d)));

  const goTo = (id: string) => {
    if (filter === 'removed') setFilter('all');
    if (checks.has(id)) toggleEdit(id, true);
    const smooth = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    requestAnimationFrame(() => cards.current.get(id)?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' }));
  };
  const nextProblem = () => {
    if (!problemIds.length) return;
    goTo(problemIds[cursor.current % problemIds.length]);
    cursor.current++;
  };

  const visible = drafts.filter(d => filter === 'removed' ? d.excluded
    : !d.excluded && (filter === 'all' || checks.has(d.id) || editing.has(d.id)));   // a card being fixed stays put

  const approve = async () => {
    if (!canApprove) return;
    setBusy(true);
    setError('');
    try { await onApprove(included.map(d => draftToItem(d, target))); }
    catch (err) { if (mounted.current) setError(uploadErrorMessage(err)); }
    finally { if (mounted.current) setBusy(false); }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !busy) { e.stopPropagation(); onClose(); return; }
    if (e.key !== 'Tab' || !rootRef.current) return;
    // Keep Tab inside the window
    const f = rootRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === rootRef.current)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  const status: { tone: 'good' | 'bad' | 'warn'; text: string } =
    !included.length ? { tone: 'warn', text: 'Every question has been removed. Restore some to upload.' }
    : problemIds.length ? { tone: 'bad', text: `${problemIds.length} question${problemIds.length !== 1 ? 's need' : ' needs'} fixing before you can upload.` }
    : tooMany ? { tone: 'bad', text: maxItemsMessage?.(included.length) ?? `Upload at most ${maxItems} questions at a time.` }
    : settingsMissing || blockReason ? { tone: 'warn', text: blockReason ?? 'Fill in the settings above the questions.' }
    : { tone: 'good', text: `All ${included.length} question${included.length !== 1 ? 's are' : ' is'} ready to upload.` };

  const filters: [Filter, string, number][] = [['all', 'All', included.length], ['fix', 'Needs fixing', problemIds.length], ['removed', 'Removed', removedCount]];
  const filterBar = (
    <div className="qrv-seg" role="group" aria-label="Show questions">
      {filters.map(([k, label, n]) => (
        <button key={k} type="button" aria-pressed={filter === k} className={filter === k ? 'is-on' : ''} onClick={() => setFilter(k)}>
          {label} <span className={`qrv-seg-n${k === 'fix' && n ? ' is-bad' : ''}`}>{n}</span>
        </button>
      ))}
    </div>
  );
  const typeList = typeCounts.size > 1 && (
    <div className="qrv-types">
      {[...typeCounts].map(([t, c]) => (
        <label key={t || 'none'} className={`qrv-type${c.on ? ' is-on' : ''}`}>
          <input type="checkbox" checked={c.on > 0} onChange={e => setTypeIncluded(t, e.target.checked)} />
          <span>{TYPE_LABEL[t] ?? 'No type chosen'}</span>
          <span className="qrv-type-n">{c.on === c.total ? c.total : `${c.on}/${c.total}`}</span>
        </label>
      ))}
    </div>
  );

  return createPortal(
    <div ref={rootRef} className="qrv-root" role="dialog" aria-modal="true" aria-labelledby="qrv-title" tabIndex={-1} onKeyDown={onKeyDown}>
      <header className="qrv-head">
        <div className="qrv-head-icon"><FileSpreadsheet size={20} /></div>
        <div className="qrv-head-text">
          <h2 id="qrv-title">{title}</h2>
          <p title={fileName}>{fileName} · {drafts.length} question{drafts.length !== 1 ? 's' : ''} in the file</p>
        </div>
        <button type="button" className="qrv-icon-btn qrv-close" onClick={onClose} disabled={busy} aria-label="Close the review (your corrections are kept)" title="Close (Esc)">
          <X size={20} />
        </button>
      </header>

      <div className="qrv-body">
        <aside className="qrv-side" aria-label="Summary">
          <Stats included={included.length} problems={problemIds.length} removed={removedCount} />
          {filterBar}
          {typeList && <div><div className="qrv-side-label">Question types</div>{typeList}</div>}
          <div className="qrv-nav-wrap">
            <div className="qrv-side-label">Questions</div>
            <nav className="qrv-nav" aria-label="Jump to a question">
              {included.map(d => {
                const bad = checks.has(d.id);
                return (
                  <button key={d.id} type="button" className={`qrv-nav-item${bad ? ' is-bad' : ''}`} onClick={() => goTo(d.id)}>
                    <span className="qrv-nav-n">{numbers.get(d.id)}</span>
                    <span className="qrv-nav-text">{d.type === 'THEORY' && d.qno ? <b>{d.qno} </b> : null}{plain(d) || 'No question text'}</span>
                    {bad ? <AlertTriangle size={14} aria-label="Needs fixing" /> : <Check size={14} aria-label="Ready" />}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        <main className="qrv-main">
          <div className="qrv-main-inner">
            <div className="qrv-mobile-bar">
              <Stats included={included.length} problems={problemIds.length} removed={removedCount} />
              {filterBar}
              {typeList && <details className="qrv-mobile-types"><summary>Question types</summary>{typeList}</details>}
            </div>

            {note && (
              <div className="qrv-banner is-info">
                <span className="qrv-banner-text">{note}</span>
                {noteAction && (
                  <button type="button" className="qrv-btn qrv-btn-ghost" onClick={noteAction.onClick} disabled={busy}>{noteAction.label}</button>
                )}
              </div>
            )}
            {tooMany && (
              <div className="qrv-banner is-bad" role="alert">
                <AlertTriangle size={16} />
                <span>{maxItemsMessage?.(included.length) ?? `Upload at most ${maxItems} questions at a time.`}</span>
              </div>
            )}
            {error && <div className="qrv-banner is-bad" role="alert"><AlertTriangle size={16} /><span><strong>Nothing was uploaded.</strong> {error}</span></div>}

            {settings && (
              <section className="qrv-panel" aria-label={settings.title}>
                <h3 className="qrv-panel-title">{settings.title}</h3>
                <div className="qrv-grid2">
                  {settings.fields.map(f => (
                    <Field key={f.id} label={f.label} htmlFor={f.id} error={f.error}>
                      <input id={f.id} type="number" min={1} inputMode="numeric" value={f.value} placeholder={f.placeholder}
                        aria-invalid={!!f.error} onChange={e => f.onChange(e.target.value)} />
                    </Field>
                  ))}
                </div>
              </section>
            )}

            {visible.length === 0 ? (
              <div className="qrv-empty">
                {filter === 'fix' ? <><CircleCheck size={28} /><p>Nothing needs fixing.</p></>
                  : filter === 'removed' ? <p>No questions have been removed.</p> : <p>No questions to show.</p>}
              </div>
            ) : visible.map(d => (
              <DraftCard key={d.id} d={d} n={numbers.get(d.id)} errors={checks.get(d.id)} editing={editing.has(d.id)}
                target={target} defaults={defaults} patch={patch} toggleEdit={toggleEdit} register={registerCard} />
            ))}
          </div>
        </main>
      </div>

      <footer className="qrv-foot">
        <div className={`qrv-foot-status is-${status.tone}`} aria-live="polite">
          {status.tone === 'good' ? <CircleCheck size={18} /> : <AlertTriangle size={18} />}
          <span>{status.text}</span>
        </div>
        <div className="qrv-foot-actions">
          <button type="button" className="qrv-btn qrv-btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          {problemIds.length > 0 && (
            <button type="button" className="qrv-btn qrv-btn-secondary" onClick={nextProblem}>
              <AlertTriangle size={15} /> Next problem
            </button>
          )}
          <button type="button" className="qrv-btn qrv-btn-primary" onClick={approve} disabled={!canApprove}>
            {busy ? <Loader2 size={16} className="qrv-spin" /> : <Upload size={16} />}
            {busy ? 'Uploading…' : approveLabel?.(included.length) ?? `Approve & upload ${included.length} question${included.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </footer>

      <style>{CSS}</style>
    </div>,
    document.body,
  );
}

function Stats({ included, problems, removed }: { included: number; problems: number; removed: number }) {
  return (
    <div className="qrv-stats">
      <div className="qrv-stat"><strong>{included}</strong><span>to upload</span></div>
      <div className={`qrv-stat ${problems ? 'is-bad' : 'is-good'}`}><strong>{problems}</strong><span>need fixing</span></div>
      <div className="qrv-stat"><strong>{removed}</strong><span>removed</span></div>
    </div>
  );
}

function Field({ label, htmlFor, error, hint, children }: { label: ReactNode; htmlFor?: string; error?: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className={`qrv-field${error ? ' has-error' : ''}`}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && !error && <p className="qrv-hint">{hint}</p>}
      {error && <p className="qrv-error"><AlertTriangle size={13} />{error}</p>}
    </div>
  );
}

const FieldError = ({ msg }: { msg?: string }) => (msg ? <p className="qrv-error"><AlertTriangle size={13} />{msg}</p> : null);

interface CardProps {
  d: Draft; n?: number; errors?: DraftErrors; editing: boolean; target: ImportTarget;
  defaults?: { topic?: string; difficulty?: string };
  patch: Patch; toggleEdit: (id: string, on: boolean) => void; register: (id: string, el: HTMLElement | null) => void;
}

const DraftCard = memo(function DraftCard({ d, n, errors, editing, target, defaults, patch, toggleEdit, register }: CardProps) {
  const bad = !!errors;
  const open = editing && !d.excluded;
  return (
    <article ref={el => register(d.id, el)} className={`qrv-card${bad ? ' is-bad' : ''}${d.excluded ? ' is-removed' : ''}`}
      aria-label={d.excluded ? `Removed question from ${d.source}` : `Question ${n}`}>
      <header className="qrv-card-head">
        <div className="qrv-card-tags">
          <span className="qrv-num">{d.excluded ? 'Removed' : `#${n}`}</span>
          <span className="qrv-badge">{TYPE_LABEL[d.type] ?? 'No type'}</span>
          {d.type === 'THEORY' && d.qno && target === 'THEORY' && <span className="qrv-badge is-soft">{d.qno}</span>}
          <span className="qrv-source">{d.source}</span>
        </div>
        <div className="qrv-card-actions">
          {!d.excluded && (bad
            ? <span className="qrv-pill is-bad"><AlertTriangle size={13} /> Needs fixing</span>
            : <span className="qrv-pill is-good"><CircleCheck size={13} /> Ready</span>)}
          {!d.excluded && (
            <button type="button" className="qrv-btn qrv-btn-ghost" onClick={() => toggleEdit(d.id, !editing)} aria-expanded={open}>
              {open ? <><Check size={14} /> Done</> : <><Pencil size={14} /> Edit</>}
            </button>
          )}
          {d.excluded
            ? <button type="button" className="qrv-btn qrv-btn-ghost" onClick={() => patch(d.id, { excluded: false })}><RotateCcw size={14} /> Restore</button>
            : <button type="button" className="qrv-icon-btn qrv-remove" onClick={() => patch(d.id, { excluded: true })}
                aria-label={`Remove question ${n} from the upload`} title="Remove from the upload"><Trash2 size={16} /></button>}
        </div>
      </header>
      {bad && !open && !d.excluded && (
        <ul className="qrv-errlist">{Object.values(errors!).map((m, i) => <li key={i}>{m}</li>)}</ul>
      )}
      {open ? <Editor d={d} errors={errors ?? {}} target={target} defaults={defaults} patch={patch} />
        : <ReadView d={d} target={target} defaults={defaults} />}
    </article>
  );
}, (a, b) => a.d === b.d && a.n === b.n && a.editing === b.editing && a.target === b.target
  && JSON.stringify(a.errors) === JSON.stringify(b.errors) && JSON.stringify(a.defaults) === JSON.stringify(b.defaults));

function ReadView({ d, target, defaults }: { d: Draft; target: ImportTarget; defaults?: CardProps['defaults'] }) {
  const text = plain(d);
  // Options close up on the exam screen, so letter them as students will see them
  const filled = d.options.map((o, i) => ({ o: o.trim(), i })).filter(x => x.o);
  return (
    <div className="qrv-read">
      <p className="qrv-qtext">{text || <em>No question text</em>}</p>
      {d.type === 'MCQ' && (
        <ul className="qrv-opts">
          {filled.map((x, k) => {
            const ok = d.correct.includes(x.i);
            return (
              <li key={x.i} className={ok ? 'is-correct' : ''}>
                <span className="qrv-letter">{LETTERS[k]}</span><span className="qrv-opt-text">{x.o}</span>
                {ok && <Check size={15} aria-label="Correct answer" />}
              </li>
            );
          })}
        </ul>
      )}
      {d.type === 'TRUE_FALSE' && <p className="qrv-answer">Answer: <strong>{d.tf || '—'}</strong></p>}
      {d.type === 'FILL_BLANK' && (
        <div className="qrv-answer">Accepted answers:{' '}
          {d.accepted.filter(a => a.trim()).map((a, i) => <span key={i} className="qrv-chip">{a}</span>)}
        </div>
      )}
      {d.type === 'NUMERIC' && (
        <p className="qrv-answer">Answer: <strong>{d.value || '—'}</strong>{d.tolerance.trim() && Number(d.tolerance) !== 0 ? ` (± ${d.tolerance})` : ' (exact)'}</p>
      )}
      {d.type === 'MATCHING' && (
        <ul className="qrv-pairs">
          {d.pairs.map((p, i) => (
            <li key={i}><span>{p.left || '—'}</span><span className="qrv-arrow" aria-hidden>→</span><span>{p.right || '—'}</span></li>
          ))}
        </ul>
      )}
      {d.type === 'THEORY' && (
        <>
          <p className="qrv-answer">
            <strong>{d.marks || '?'} mark{d.marks.trim() === '1' ? '' : 's'}</strong>
            {target === 'THEORY' && <> · {d.compulsory ? 'Compulsory' : 'Optional'}</>}
          </p>
          {d.guide && <div className="qrv-guide"><span>Marking guide</span>{d.guide}</div>}
        </>
      )}
      {target === 'BANK' && (
        <p className="qrv-meta">
          Topic: {d.topic || (defaults?.topic ? `${defaults.topic} (default)` : '—')} ·
          Difficulty: {d.difficulty ? DIFF_LABEL[d.difficulty] : `${DIFF_LABEL[defaults?.difficulty ?? ''] ?? 'Medium'} (default)`}
        </p>
      )}
      {target === 'OBJECTIVE' && tagged(target, d) && (d.topic.trim() || d.difficulty) && (
        <p className="qrv-meta">
          Topic: {d.topic.trim() || '—'} · Difficulty: {d.difficulty ? DIFF_LABEL[d.difficulty] : '—'}
        </p>
      )}
    </div>
  );
}

function Editor({ d, errors, target, defaults, patch }: {
  d: Draft; errors: DraftErrors; target: ImportTarget; defaults?: CardProps['defaults']; patch: Patch;
}) {
  const set = (p: Partial<Draft>) => patch(d.id, p);
  const id = (f: string) => domId(d.id, f);
  const allowed = allowedTypes(target);
  const types: QType[] = d.type && !allowed.includes(d.type) ? [...allowed, d.type] : allowed;
  const accepted = d.accepted.length ? d.accepted : [''];
  const pairs = d.pairs.length ? d.pairs : [{ left: '', right: '' }, { left: '', right: '' }];
  const setPair = (i: number, side: 'left' | 'right', v: string) => set({ pairs: pairs.map((p, k) => (k === i ? { ...p, [side]: v } : p)) });

  return (
    <div className="qrv-edit">
      {types.length > 1 || !d.type ? (
        <Field label="Question type" htmlFor={id('type')} error={errors.type}>
          <select id={id('type')} value={d.type} aria-invalid={!!errors.type} onChange={e => set({ type: e.target.value as QType })}>
            {!d.type && <option value="">Choose a type…</option>}
            {types.map(t => <option key={t} value={t}>{TYPE_LABEL[t]}{allowed.includes(t) ? '' : ' (not allowed here)'}</option>)}
          </select>
        </Field>
      ) : <FieldError msg={errors.type} />}

      <Field label="Question" htmlFor={id('text')} error={errors.text}
        hint={d.html ? 'This text came from a .json file and may contain HTML tags.' : undefined}>
        <textarea id={id('text')} rows={3} value={d.text} aria-invalid={!!errors.text} onChange={e => set({ text: e.target.value })} />
      </Field>

      {d.type === 'MCQ' && (
        <fieldset className="qrv-fieldset">
          <legend>Options <span>tick the correct answer (more than one is allowed)</span></legend>
          {d.options.map((o, i) => (
            <div key={i} className="qrv-opt-row">
              <input type="checkbox" className="qrv-check" checked={d.correct.includes(i)} disabled={!o.trim()}
                aria-label={`Option ${LETTERS[i]} is correct`}
                onChange={e => set({ correct: e.target.checked ? [...d.correct, i] : d.correct.filter(x => x !== i) })} />
              <label className="qrv-letter" htmlFor={id(`opt${i}`)}>{LETTERS[i]}</label>
              <input id={id(`opt${i}`)} value={o} placeholder={i < 2 ? 'Required' : 'Optional'} aria-invalid={!!errors.options && i < 2 && !o.trim()}
                onChange={e => {
                  const options = d.options.map((x, k) => (k === i ? e.target.value : x));
                  set(e.target.value.trim() ? { options } : { options, correct: d.correct.filter(x => x !== i) });
                }} />
            </div>
          ))}
          <FieldError msg={errors.options} />
          <FieldError msg={errors.correct} />
        </fieldset>
      )}

      {d.type === 'TRUE_FALSE' && (
        <Field label="Correct answer" error={errors.tf}>
          <div className="qrv-seg is-inline" role="radiogroup" aria-label="Correct answer">
            {(['True', 'False'] as const).map(v => (
              <button key={v} type="button" role="radio" aria-checked={d.tf === v} className={d.tf === v ? 'is-on' : ''} onClick={() => set({ tf: v })}>{v}</button>
            ))}
          </div>
        </Field>
      )}

      {d.type === 'FILL_BLANK' && (
        <fieldset className="qrv-fieldset">
          <legend>Accepted answers <span>capitals and extra spaces are ignored when marking</span></legend>
          {accepted.map((a, i) => (
            <div key={i} className="qrv-list-row">
              <input value={a} aria-label={`Accepted answer ${i + 1}`} placeholder="e.g. CPU"
                onChange={e => set({ accepted: accepted.map((x, k) => (k === i ? e.target.value : x)) })} />
              {accepted.length > 1 && (
                <button type="button" className="qrv-icon-btn" aria-label={`Remove accepted answer ${i + 1}`}
                  onClick={() => set({ accepted: accepted.filter((_, k) => k !== i) })}><X size={15} /></button>
              )}
            </div>
          ))}
          <button type="button" className="qrv-btn qrv-btn-ghost qrv-add" onClick={() => set({ accepted: [...accepted, ''] })}><Plus size={14} /> Add another answer</button>
          <FieldError msg={errors.accepted} />
        </fieldset>
      )}

      {d.type === 'NUMERIC' && (
        <div className="qrv-grid2">
          <Field label="Correct number" htmlFor={id('value')} error={errors.value}>
            <input id={id('value')} inputMode="decimal" value={d.value} placeholder="e.g. 8" aria-invalid={!!errors.value} onChange={e => set({ value: e.target.value })} />
          </Field>
          <Field label="Tolerance (optional)" htmlFor={id('tol')} error={errors.tolerance} hint="How far off an answer may be. Empty or 0 = exact.">
            <input id={id('tol')} inputMode="decimal" value={d.tolerance} placeholder="0" aria-invalid={!!errors.tolerance} onChange={e => set({ tolerance: e.target.value })} />
          </Field>
        </div>
      )}

      {d.type === 'MATCHING' && (
        <fieldset className="qrv-fieldset">
          <legend>Pairs <span>left is what students see, right is its correct match</span></legend>
          {pairs.map((p, i) => (
            <div key={i} className="qrv-pair-row">
              <span className="qrv-pair-n">{i + 1}</span>
              <input value={p.left} placeholder="Left" aria-label={`Pair ${i + 1}, left`} onChange={e => setPair(i, 'left', e.target.value)} />
              <span className="qrv-arrow" aria-hidden>→</span>
              <input value={p.right} placeholder="Right" aria-label={`Pair ${i + 1}, right`} onChange={e => setPair(i, 'right', e.target.value)} />
              <button type="button" className="qrv-icon-btn" aria-label={`Remove pair ${i + 1}`} disabled={pairs.length <= 1}
                onClick={() => set({ pairs: pairs.filter((_, k) => k !== i) })}><X size={15} /></button>
            </div>
          ))}
          <button type="button" className="qrv-btn qrv-btn-ghost qrv-add" onClick={() => set({ pairs: [...pairs, { left: '', right: '' }] })}><Plus size={14} /> Add pair</button>
          <FieldError msg={errors.pairs} />
        </fieldset>
      )}

      {d.type === 'THEORY' && (
        <>
          <div className={target === 'THEORY' ? 'qrv-grid3' : 'qrv-grid2'}>
            {target === 'THEORY' && (
              <Field label="Q No" htmlFor={id('qno')} error={errors.qno}>
                <input id={id('qno')} value={d.qno} placeholder="e.g. Q1a" aria-invalid={!!errors.qno} onChange={e => set({ qno: e.target.value })} />
              </Field>
            )}
            <Field label="Marks" htmlFor={id('marks')} error={errors.marks}>
              <input id={id('marks')} inputMode="decimal" value={d.marks} placeholder="e.g. 4" aria-invalid={!!errors.marks} onChange={e => set({ marks: e.target.value })} />
            </Field>
            {target === 'THEORY' && (
              <Field label="Compulsory" error={errors.compulsory}>
                <div className="qrv-seg is-inline" role="radiogroup" aria-label="Compulsory">
                  {([[true, 'Yes'], [false, 'No']] as const).map(([v, l]) => (
                    <button key={l} type="button" role="radio" aria-checked={d.compulsory === v} className={d.compulsory === v ? 'is-on' : ''}
                      onClick={() => set({ compulsory: v })}>{l}</button>
                  ))}
                </div>
              </Field>
            )}
          </div>
          <Field label="Marking guide (optional)" htmlFor={id('guide')} hint="Key points and how the marks are shared. Students don't see it.">
            <textarea id={id('guide')} rows={2} value={d.guide} onChange={e => set({ guide: e.target.value })} />
          </Field>
        </>
      )}

      {tagged(target, d) && (
        <div className="qrv-grid2">
          <Field label="Topic (optional)" htmlFor={id('topic')} error={errors.topic}>
            <input id={id('topic')} value={d.topic} aria-invalid={!!errors.topic} placeholder={defaults?.topic ? `Default: ${defaults.topic}` : 'e.g. Loops'} onChange={e => set({ topic: e.target.value })} />
          </Field>
          <Field label={target === 'BANK' ? 'Difficulty' : 'Difficulty (optional)'} htmlFor={id('diff')} error={errors.difficulty}>
            <select id={id('diff')} value={d.difficulty} aria-invalid={!!errors.difficulty} onChange={e => set({ difficulty: e.target.value as Draft['difficulty'] })}>
              <option value="">{target === 'BANK' ? `Default (${DIFF_LABEL[defaults?.difficulty ?? ''] ?? 'Medium'})` : 'Not set'}</option>
              <option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option>
            </select>
          </Field>
        </div>
      )}
    </div>
  );
}

const CSS = `
.qrv-root { position: fixed; inset: 0; z-index: 4000; display: flex; flex-direction: column; height: 100vh; height: 100dvh;
  background: #f1f5f9; color: #1e293b; outline: none; font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  animation: qrv-in .18s ease-out; }
@keyframes qrv-in { from { opacity: 0; transform: scale(.99); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .qrv-root { animation: none; } }
.qrv-root *, .qrv-root *::before, .qrv-root *::after { box-sizing: border-box; }
.qrv-root button, .qrv-root input, .qrv-root select, .qrv-root textarea { font: inherit; }
.qrv-root :focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }

.qrv-head { display: flex; align-items: center; gap: 12px; padding: 14px 24px; background: #fff; border-bottom: 1px solid #e2e8f0; flex-shrink: 0; }
.qrv-head-icon { width: 40px; height: 40px; border-radius: 10px; background: var(--brand-soft); color: var(--brand-text); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.qrv-head-text { flex: 1; min-width: 0; }
.qrv-head h2 { margin: 0; font-size: 17px; font-weight: 800; line-height: 1.3; }
.qrv-head p { margin: 2px 0 0; font-size: 12.5px; color: #64748b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.qrv-body { flex: 1; min-height: 0; display: grid; grid-template-columns: 300px minmax(0, 1fr); }
.qrv-side { background: #fff; border-right: 1px solid #e2e8f0; padding: 18px; display: flex; flex-direction: column; gap: 18px; min-height: 0; overflow-y: auto; }
.qrv-side-label { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; color: #94a3b8; margin-bottom: 8px; }
.qrv-main { min-height: 0; overflow-y: auto; padding: 20px 24px 40px; scroll-padding-top: 16px; }
.qrv-main-inner { max-width: 920px; margin: 0 auto; display: flex; flex-direction: column; gap: 14px; }
.qrv-mobile-bar { display: none; }

.qrv-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.qrv-stat { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 8px; text-align: center; }
.qrv-stat strong { display: block; font-size: 20px; font-weight: 800; line-height: 1.1; }
.qrv-stat span { font-size: 11px; color: #64748b; font-weight: 600; }
.qrv-stat.is-bad { background: #fef2f2; border-color: #fecaca; color: #b91c1c; }
.qrv-stat.is-good { background: #f0fdf4; border-color: #bbf7d0; color: #15803d; }

.qrv-seg { display: flex; gap: 4px; padding: 4px; background: #f1f5f9; border-radius: 10px; }
.qrv-seg button { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 36px; padding: 6px 10px; border: none; border-radius: 7px; background: transparent; color: #475569; font-size: 12.5px; font-weight: 600; cursor: pointer; white-space: nowrap; }
.qrv-seg button.is-on { background: #fff; color: #1e293b; box-shadow: 0 1px 3px rgba(15,23,42,.12); }
.qrv-side .qrv-seg { flex-direction: column; }
.qrv-side .qrv-seg button { justify-content: space-between; padding: 6px 12px; }
.qrv-seg.is-inline { display: inline-flex; min-width: 180px; }
.qrv-seg.is-inline button.is-on { background: var(--brand); color: var(--brand-contrast); }
.qrv-seg-n { font-size: 11px; font-weight: 800; background: #e2e8f0; color: #475569; border-radius: 10px; padding: 0 7px; line-height: 18px; }
.qrv-seg-n.is-bad { background: #fee2e2; color: #b91c1c; }

.qrv-types { display: flex; flex-direction: column; gap: 6px; }
.qrv-type { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border: 1.5px solid #e2e8f0; border-radius: 9px; font-size: 13px; color: #64748b; cursor: pointer; }
.qrv-type.is-on { border-color: var(--brand-border); background: var(--brand-soft); color: #1e293b; }
.qrv-type input { width: 16px; height: 16px; accent-color: var(--brand); flex-shrink: 0; }
.qrv-type-n { margin-left: auto; font-size: 11px; font-weight: 800; color: var(--brand-text); }

.qrv-nav-wrap { display: flex; flex-direction: column; min-height: 0; }
.qrv-nav { display: flex; flex-direction: column; gap: 2px; }
.qrv-nav-item { display: flex; align-items: center; gap: 8px; width: 100%; padding: 7px 8px; border: none; border-radius: 8px; background: transparent; text-align: left; cursor: pointer; color: #15803d; }
.qrv-nav-item:hover { background: #f1f5f9; }
.qrv-nav-item.is-bad { color: #dc2626; background: #fef2f2; }
.qrv-nav-n { min-width: 26px; height: 22px; border-radius: 6px; background: #f1f5f9; color: #475569; font-size: 11px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.qrv-nav-text { flex: 1; min-width: 0; font-size: 12.5px; color: #334155; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.qrv-banner { display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border-radius: 10px; font-size: 13.5px; line-height: 1.5; overflow-wrap: anywhere; }
.qrv-banner.is-info { background: var(--brand-soft); border: 1px solid var(--brand-border); color: #334155; }
.qrv-banner.is-bad { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
.qrv-banner svg { flex-shrink: 0; margin-top: 2px; }
.qrv-banner.is-info { align-items: center; flex-wrap: wrap; }
.qrv-banner-text { flex: 1 1 260px; }

.qrv-panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px 18px; }
.qrv-panel-title { margin: 0 0 12px; font-size: 14px; font-weight: 800; }

.qrv-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px 18px; scroll-margin-top: 12px; box-shadow: 0 1px 2px rgba(15,23,42,.04); }
.qrv-card.is-bad { border-color: #fca5a5; box-shadow: 0 0 0 3px rgba(239,68,68,.08); }
.qrv-card.is-removed { opacity: .65; background: #f8fafc; }
.qrv-card-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.qrv-card-tags { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; min-width: 0; }
.qrv-num { font-size: 13px; font-weight: 800; color: #0f172a; }
.qrv-badge { font-size: 11.5px; font-weight: 700; padding: 3px 9px; border-radius: 20px; background: var(--brand-soft); color: var(--brand-text); }
.qrv-badge.is-soft { background: #f1f5f9; color: #334155; }
.qrv-source { font-size: 12px; color: #94a3b8; }
.qrv-card-actions { display: flex; align-items: center; gap: 6px; margin-left: auto; }
.qrv-pill { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 20px; white-space: nowrap; }
.qrv-pill.is-good { background: #f0fdf4; color: #15803d; }
.qrv-pill.is-bad { background: #fef2f2; color: #b91c1c; }
.qrv-errlist { margin: 12px 0 0; padding: 10px 12px 10px 28px; background: #fef2f2; border-radius: 9px; color: #991b1b; font-size: 13px; line-height: 1.5; }

.qrv-read { margin-top: 12px; }
.qrv-qtext { margin: 0; font-size: 15px; font-weight: 600; line-height: 1.55; white-space: pre-wrap; overflow-wrap: anywhere; }
.qrv-opts { list-style: none; margin: 12px 0 0; padding: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.qrv-opts li { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border: 1.5px solid #e2e8f0; border-radius: 10px; font-size: 14px; overflow-wrap: anywhere; }
.qrv-opts li.is-correct { border-color: #86efac; background: #f0fdf4; color: #14532d; font-weight: 600; }
.qrv-opts li svg { margin-left: auto; color: #16a34a; flex-shrink: 0; }
.qrv-opt-text { min-width: 0; }
.qrv-letter { width: 26px; height: 26px; border-radius: 7px; background: #f1f5f9; color: #475569; font-size: 12px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.qrv-answer { margin: 12px 0 0; font-size: 14px; color: #334155; line-height: 1.6; }
.qrv-chip { display: inline-block; margin: 2px 4px 2px 0; padding: 2px 10px; border-radius: 20px; background: #f0fdf4; border: 1px solid #bbf7d0; color: #14532d; font-size: 13px; font-weight: 600; }
.qrv-pairs { list-style: none; margin: 12px 0 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.qrv-pairs li { display: grid; grid-template-columns: minmax(0, 1fr) 24px minmax(0, 1fr); align-items: center; gap: 8px; padding: 8px 12px; background: #f8fafc; border-radius: 9px; font-size: 14px; overflow-wrap: anywhere; }
.qrv-arrow { color: #94a3b8; text-align: center; }
.qrv-guide { margin-top: 10px; padding: 10px 12px; background: #f8fafc; border-left: 3px solid var(--brand-border); border-radius: 0 8px 8px 0; font-size: 13.5px; color: #475569; line-height: 1.55; white-space: pre-wrap; overflow-wrap: anywhere; }
.qrv-guide span { display: block; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; color: #94a3b8; margin-bottom: 3px; }
.qrv-meta { margin: 10px 0 0; font-size: 12.5px; color: #64748b; }

.qrv-edit { margin-top: 14px; display: flex; flex-direction: column; gap: 14px; }
.qrv-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.qrv-field > label, .qrv-fieldset legend { font-size: 12.5px; font-weight: 700; color: #334155; }
.qrv-fieldset legend span { font-weight: 500; color: #94a3b8; margin-left: 4px; }
.qrv-fieldset { border: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.qrv-fieldset legend { padding: 0; margin-bottom: 8px; }
.qrv-edit input:not([type=checkbox]), .qrv-edit select, .qrv-edit textarea, .qrv-panel input {
  width: 100%; min-height: 42px; padding: 9px 12px; border: 1.5px solid #e2e8f0; border-radius: 9px; background: #fff; color: #1e293b; font-size: 14.5px; outline: none; transition: border-color .15s, box-shadow .15s; }
.qrv-edit textarea { resize: vertical; line-height: 1.5; }
.qrv-edit input:focus, .qrv-edit select:focus, .qrv-edit textarea:focus, .qrv-panel input:focus { border-color: var(--brand); box-shadow: 0 0 0 3px rgba(var(--brand-rgb), .15); }
.qrv-root [aria-invalid=true] { border-color: #f87171 !important; background: #fffafa !important; }
.qrv-error { display: flex; align-items: flex-start; gap: 6px; margin: 0; font-size: 12.5px; font-weight: 600; color: #dc2626; line-height: 1.45; }
.qrv-error svg { flex-shrink: 0; margin-top: 2px; }
.qrv-hint { margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.4; }
.qrv-opt-row { display: grid; grid-template-columns: 22px 26px minmax(0, 1fr); align-items: center; gap: 10px; }
.qrv-check { width: 20px; height: 20px; accent-color: #16a34a; cursor: pointer; }
.qrv-check:disabled { cursor: not-allowed; opacity: .4; }
.qrv-list-row { display: grid; grid-template-columns: minmax(0, 1fr) 40px; gap: 8px; align-items: center; }
.qrv-pair-row { display: grid; grid-template-columns: 24px minmax(0, 1fr) 20px minmax(0, 1fr) 40px; gap: 8px; align-items: center; }
.qrv-pair-n { font-size: 12px; font-weight: 800; color: #94a3b8; text-align: center; }
.qrv-add { align-self: flex-start; }
.qrv-grid2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.qrv-grid3 { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto; gap: 14px; }

.qrv-btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 42px; padding: 0 18px; border-radius: 10px; border: 1.5px solid transparent; font-size: 14px; font-weight: 700; cursor: pointer; white-space: nowrap; transition: background .15s, border-color .15s, opacity .15s; }
.qrv-btn:disabled { opacity: .5; cursor: not-allowed; }
.qrv-btn-primary { background: var(--brand); color: var(--brand-contrast); }
.qrv-btn-primary:hover:not(:disabled) { background: var(--brand-hover); }
.qrv-btn-secondary { background: #fff; border-color: #e2e8f0; color: #334155; }
.qrv-btn-secondary:hover:not(:disabled) { background: #f8fafc; border-color: #cbd5e1; }
.qrv-btn-ghost { min-height: 34px; padding: 0 11px; font-size: 13px; background: #fff; border-color: #e2e8f0; color: #475569; }
.qrv-btn-ghost:hover:not(:disabled) { background: var(--brand-soft); border-color: var(--brand-border); color: var(--brand-text); }
.qrv-icon-btn { width: 38px; height: 38px; display: inline-flex; align-items: center; justify-content: center; border: 1.5px solid #e2e8f0; border-radius: 9px; background: #fff; color: #64748b; cursor: pointer; flex-shrink: 0; }
.qrv-icon-btn:hover:not(:disabled) { background: #f1f5f9; color: #1e293b; }
.qrv-icon-btn:disabled { opacity: .4; cursor: not-allowed; }
.qrv-remove:hover:not(:disabled) { background: #fef2f2 !important; border-color: #fecaca; color: #dc2626 !important; }
.qrv-close { border: none; }
.qrv-spin { animation: qrv-spin 1s linear infinite; }
@keyframes qrv-spin { to { transform: rotate(360deg); } }

.qrv-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 48px 16px; color: #64748b; text-align: center; background: #fff; border: 1px dashed #cbd5e1; border-radius: 14px; }
.qrv-empty svg { color: #16a34a; }
.qrv-empty p { margin: 0; font-size: 14px; font-weight: 600; }

.qrv-foot { flex-shrink: 0; display: flex; align-items: center; gap: 16px; padding: 12px 24px; padding-bottom: calc(12px + env(safe-area-inset-bottom)); background: #fff; border-top: 1px solid #e2e8f0; box-shadow: 0 -4px 16px rgba(15,23,42,.05); }
.qrv-foot-status { flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 600; line-height: 1.4; }
.qrv-foot-status svg { flex-shrink: 0; }
.qrv-foot-status.is-good { color: #15803d; }
.qrv-foot-status.is-bad { color: #b91c1c; }
.qrv-foot-status.is-warn { color: #b45309; }
.qrv-foot-actions { display: flex; gap: 8px; flex-shrink: 0; }

@media (max-width: 1100px) { .qrv-body { grid-template-columns: 260px minmax(0, 1fr); } }
@media (max-width: 899px) {
  .qrv-body { grid-template-columns: minmax(0, 1fr); }
  .qrv-side { display: none; }
  .qrv-mobile-bar { display: flex; flex-direction: column; gap: 10px; }
  .qrv-seg { overflow-x: auto; scrollbar-width: none; }
  .qrv-seg::-webkit-scrollbar { display: none; }
  .qrv-mobile-types { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 0 12px; }
  .qrv-mobile-types summary { min-height: 42px; display: flex; align-items: center; font-size: 13px; font-weight: 700; color: #334155; cursor: pointer; }
  .qrv-mobile-types .qrv-types { padding-bottom: 12px; }
  .qrv-head { padding: 12px 16px; }
  .qrv-main { padding: 14px 16px 28px; }
  .qrv-foot { padding: 10px 16px; padding-bottom: calc(10px + env(safe-area-inset-bottom)); }
}
@media (max-width: 640px) {
  .qrv-head-icon { display: none; }
  .qrv-head h2 { font-size: 15.5px; }
  .qrv-card { padding: 14px; border-radius: 12px; }
  .qrv-card-actions { width: 100%; justify-content: flex-end; }
  .qrv-card-actions .qrv-pill { margin-right: auto; }
  .qrv-source { flex-basis: 100%; }
  .qrv-opts { grid-template-columns: minmax(0, 1fr); }
  .qrv-grid2, .qrv-grid3 { grid-template-columns: minmax(0, 1fr); }
  .qrv-seg.is-inline { display: flex; width: 100%; }
  .qrv-pair-row { grid-template-columns: 20px minmax(0, 1fr) 40px; grid-template-areas: "n l x" "n r x"; row-gap: 6px; }
  .qrv-pair-row .qrv-pair-n { grid-area: n; }
  .qrv-pair-row input:first-of-type { grid-area: l; }
  .qrv-pair-row input:last-of-type { grid-area: r; }
  .qrv-pair-row .qrv-arrow { display: none; }
  .qrv-pair-row .qrv-icon-btn { grid-area: x; }
  .qrv-pairs li { grid-template-columns: minmax(0, 1fr); gap: 2px; }
  .qrv-pairs li .qrv-arrow { text-align: left; }
  .qrv-foot { flex-direction: column; align-items: stretch; gap: 10px; }
  .qrv-foot-actions { display: grid; grid-template-columns: 1fr 1fr; }
  .qrv-foot-actions .qrv-btn-primary { grid-column: 1 / -1; order: -1; }
  .qrv-foot-actions .qrv-btn:only-child, .qrv-foot-actions .qrv-btn-secondary:nth-child(1):nth-last-child(2) { grid-column: 1 / -1; }
}
`;
