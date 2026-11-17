import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  AlertTriangle, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Download, FileText, Loader2, Sparkles, Trash2, X,
} from 'lucide-react';
import {
  addFeedbackFiles, aiSuggest, errMsg, getWork, removeFeedbackFile, saveMark, staffFileLink,
  type AiProvider, type AiProviderKey, type StudentWork,
} from '../../../api/materials';
import { DocView } from './DocViewer';
import AiProgressSteps from './AiProgressSteps';
import IntegrityPanel from './IntegrityPanel';
import { DropZone, downloadVia, fmtSize, fmtWhen, plain } from './shared';
import './materials.css';

const SUBMISSION_TYPES = ['pdf', 'doc', 'docx', 'odt', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'png', 'jpg', 'jpeg', 'webp', 'zip'];

/**
 * Full-screen marking: the student's work fills the screen (PDF pages, photos, typed answer), with
 * the marking panel beside it (a bottom sheet on phones). "Mark with AI" asks for a suggestion; the
 * lecturer accepts or changes it and saves. Arrows move between students.
 */
export default function MarkingViewer({ assignmentId, studentIds, startStudentId, providers, defaultProvider, onChanged, onClose }: {
  assignmentId: number; studentIds: number[]; startStudentId: number; providers: AiProvider[]; defaultProvider: AiProviderKey | null;
  onChanged: () => void; onClose: () => void;
}) {
  const qc = useQueryClient();
  const order = useMemo(() => (studentIds.includes(startStudentId) ? studentIds : [startStudentId, ...studentIds]), [studentIds, startStudentId]);
  const [sid, setSid] = useState(startStudentId);
  const idx = order.indexOf(sid);
  const key = ['materials', 'work', assignmentId, sid];
  // While the AI works on this student, check on it every 1.5 s
  const work = useQuery({ queryKey: key, queryFn: () => getWork(assignmentId, sid),
    refetchInterval: q => (q.state.data?.aiProgress || q.state.data?.aiQueued ? 1500 : false) });
  const w = work.data;

  const [tab, setTab] = useState<string>('');
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [aiAssisted, setAiAssisted] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [, tick] = useState(0);
  const configured = providers.filter(p => p.configured);
  const [provider, setProvider] = useState<AiProviderKey | undefined>(
    configured.find(p => p.key === defaultProvider)?.key ?? configured[0]?.key);
  const [panelOpen, setPanelOpen] = useState(false);
  const loadedFor = useRef<number | null>(null);

  // Fill the form when a student's work arrives (not on every refetch)
  useEffect(() => {
    if (!w || loadedFor.current === sid) return;
    loadedFor.current = sid;
    setScore(w.score != null ? plain(w.score) : '');
    setFeedback(w.feedback ?? '');
    setAiAssisted(w.aiAssisted);
    setDirty(false);
    setTab(w.files[0]?.id ?? (w.typedAnswer ? 'typed' : ''));
  }, [w, sid]);

  // Lock the page behind
  useEffect(() => {
    const html = document.documentElement, body = document.body;
    const prev = [html.style.overflow, body.style.overflow];
    html.style.overflow = 'hidden'; body.style.overflow = 'hidden';
    return () => { html.style.overflow = prev[0]; body.style.overflow = prev[1]; };
  }, []);

  const go = useCallback((delta: number) => {
    const next = order[idx + delta];
    if (next == null) return;
    if (dirty && !window.confirm('You have an unsaved mark. Leave it without saving?')) return;
    loadedFor.current = null;
    setSid(next);
  }, [order, idx, dirty]);

  const close = useCallback(() => {
    if (dirty && !window.confirm('You have an unsaved mark. Close without saving?')) return;
    onClose();
  }, [dirty, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT');
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (!typing && e.key === 'ArrowRight') go(1);
      else if (!typing && e.key === 'ArrowLeft') go(-1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [go, close]);

  const running = !!w?.aiProgress;
  const aiBusy = starting || running;
  // Seconds count up smoothly between checks
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => tick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, [running]);
  const extraSeconds = running ? Math.max(0, Math.floor((Date.now() - work.dataUpdatedAt) / 1000)) : 0;

  // When the AI finishes (for this student), say how it went
  const wasRunning = useRef<{ sid: number; on: boolean }>({ sid, on: false });
  useEffect(() => {
    const prev = wasRunning.current;
    if (prev.sid === sid && prev.on && !running && w) {
      if (w.aiError) toast.error('The AI could not mark this work. See the reason in the marking panel.');
      else if (w.aiScore != null) toast.success(`AI suggests ${plain(w.aiScore)}/${plain(w.assignment.maxMarks)}. Check it, then use or change it.`);
      onChanged();
    }
    wasRunning.current = { sid, on: running };
  }, [running, sid, w, onChanged]);

  const store = (x: StudentWork) => qc.setQueryData(key, x);

  const runAi = async () => {
    setStarting(true);
    try {
      const x = await aiSuggest(assignmentId, sid, provider);
      store(x);
      setPanelOpen(true);
      onChanged();
    } catch (e) {
      toast.error(errMsg(e, 'The AI could not start.'));
      work.refetch();
    } finally { setStarting(false); }
  };

  const useSuggestion = () => {
    if (!w || w.aiScore == null) return;
    setScore(plain(w.aiScore));
    setFeedback(w.aiFeedback ?? '');
    setAiAssisted(true);
    setDirty(true);
    setPanelOpen(true);
  };

  const save = async (andNext: boolean) => {
    if (!w) return;
    const max = Number(w.assignment.maxMarks);
    const n = score.trim() === '' ? null : Number(score);
    if (n != null && (!Number.isFinite(n) || n < 0 || n > max)) { toast.error(`The mark must be between 0 and ${plain(max)}`); return; }
    setSaving(true);
    try {
      const x = await saveMark(assignmentId, sid, { score: n, feedback: feedback.trim() || null, aiAssisted });
      store(x);
      setDirty(false);
      onChanged();
      toast.success(n == null ? 'Mark cleared' : `Saved: ${plain(n)}/${plain(max)}`);
      if (andNext) {
        const next = order[idx + 1];
        if (next != null) { loadedFor.current = null; setSid(next); } else toast('That was the last one in this list');
      }
    } catch (e) { toast.error(errMsg(e, 'Could not save the mark')); } finally { setSaving(false); }
  };

  const uploadFeedback = async (files: File[]) => {
    try { store(await addFeedbackFiles(assignmentId, sid, files)); toast.success('Marked copy added'); }
    catch (e) { toast.error(errMsg(e, 'Could not upload')); }
  };
  const removeFeedback = async (fileId: string) => {
    if (!window.confirm('Remove this marked copy?')) return;
    try { store(await removeFeedbackFile(assignmentId, sid, fileId)); } catch (e) { toast.error(errMsg(e)); }
  };

  const files = w?.files ?? [];
  const current = files.find(f => f.id === tab);
  const max = w ? plain(w.assignment.maxMarks) : '';
  const handedIn = !!w?.submittedAt;

  return createPortal(
    <div className="cm-overlay" role="dialog" aria-modal="true" aria-label="Marking">
      <div className="cm-ov-top">
        <button type="button" className="cm-ov-btn" onClick={close} aria-label="Close marking"><X size={18} /></button>
        <div className="cm-ov-title">
          <b>{w?.student.name ?? 'Loading…'}</b>
          <span>{w ? `${w.student.username} · ${handedIn ? `handed in ${fmtWhen(w.submittedAt)}${w.late ? ' (late)' : ''}` : 'nothing handed in online'}` : ''}</span>
        </div>
        <span className="cm-hide-sm" style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>{idx + 1} of {order.length}</span>
        <button type="button" className="cm-ov-btn" onClick={() => go(-1)} disabled={idx <= 0} aria-label="Previous student"><ChevronLeft size={18} /></button>
        <button type="button" className="cm-ov-btn" onClick={() => go(1)} disabled={idx >= order.length - 1} aria-label="Next student"><ChevronRight size={18} /></button>
      </div>

      {(files.length > 1 || (files.length > 0 && w?.typedAnswer)) && (
        <div className="cm-tabs" role="tablist" aria-label="The student's work">
          {files.map(f => <button key={f.id} type="button" role="tab" aria-selected={tab === f.id} className={`cm-tab${tab === f.id ? ' is-on' : ''}`} onClick={() => setTab(f.id)} title={f.name}>{f.name}</button>)}
          {w?.typedAnswer && <button type="button" role="tab" aria-selected={tab === 'typed'} className={`cm-tab${tab === 'typed' ? ' is-on' : ''}`} onClick={() => setTab('typed')}>Typed answer</button>}
        </div>
      )}

      <div className="cm-ov-body">
        <div className="cm-ov-doc">
          {work.isLoading ? <div className="cm-doc-msg"><Loader2 size={28} className="cm-spin" /></div>
            : work.isError ? <div className="cm-doc-msg"><AlertTriangle size={28} /><div>{errMsg(work.error)}</div></div>
            : current ? <DocView key={current.id} file={current} getLink={staffFileLink} />
            : tab === 'typed' && w?.typedAnswer ? <div className="cm-doc-scroll"><div className="cm-doc-text"><pre className="cm-pre">{w.typedAnswer}</pre></div></div>
            : <div className="cm-doc-scroll"><div className="cm-doc-msg"><FileText size={30} /><div>{handedIn ? 'No files.' : 'This student hasn’t handed anything in online. You can still enter a mark (for work handed in on paper).'}</div></div></div>}
        </div>

        {w && (
          <aside className={`cm-mark${panelOpen ? '' : ' is-collapsed'}`} aria-label="Marking panel">
            <button type="button" className="cm-mark-handle" onClick={() => setPanelOpen(o => !o)} aria-expanded={panelOpen} style={{ position: 'relative' }}>
              <b>Mark</b>
              <span className="cm-sub" style={{ marginTop: 0, flex: 1 }}>
                {score !== '' ? `${score}/${max}` : 'Not marked'}{w.aiProgress ? ` · ${w.aiProgress.provider} is working on it…` : w.aiScore != null ? ` · AI suggests ${plain(w.aiScore)}` : ''}{dirty ? ' · unsaved' : ''}
              </span>
              {panelOpen ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            </button>
            <div className={`cm-mark-body${panelOpen ? ' is-open' : ''}`}>
              {markBody()}
            </div>
          </aside>
        )}
      </div>
    </div>,
    document.body,
  );

  function markBody() {
    if (!w) return null;
    return (
      <>
        <div className="cm-ai">
          <div className="cm-ai-head">
            <b><Sparkles size={15} /> AI marking</b>
            <span className="cm-spacer" />
            {configured.length > 1 && !w.aiProgress && (
              <select className="cm-select" style={{ width: 'auto', minHeight: 34, fontSize: 13 }} value={provider} onChange={e => setProvider(e.target.value as AiProviderKey)} aria-label="AI to use" disabled={aiBusy}>
                {configured.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            )}
          </div>
          {configured.length === 0 ? (
            <p className="cm-help">No AI is set up on this server. Mark it yourself below.</p>
          ) : !handedIn ? (
            <p className="cm-help">Nothing handed in online to read.</p>
          ) : (
            <>
              {w.aiProgress ? (
                <AiProgressSteps p={w.aiProgress} extraSeconds={extraSeconds} />
              ) : (
                <button type="button" className="cm-btn cm-ai-btn cm-btn-block" style={{ marginTop: 10 }} onClick={runAi} disabled={aiBusy || w.aiQueued}>
                  {aiBusy || w.aiQueued ? <Loader2 size={15} className="cm-spin" /> : <Sparkles size={15} />}
                  {starting ? 'Starting…' : w.aiQueued ? 'Waiting its turn in the class run…' : w.aiScore != null ? 'Mark again with AI' : 'Mark with AI'}
                </button>
              )}
              {!aiBusy && provider && !configured.find(p => p.key === provider)?.readsScans && (
                <p className="cm-help">This AI reads typed text only; for scanned or handwritten work choose another.</p>
              )}
              {w.aiError && !aiBusy && <div className="cm-banner cm-banner-bad" style={{ marginTop: 10, marginBottom: 0 }}><AlertTriangle size={15} /><span>{w.aiError}</span></div>}
              {w.aiScore != null && !aiBusy && (
                <div className="cm-ai-result">
                  <div className="cm-row"><span className="cm-ai-score">{plain(w.aiScore)}<span style={{ fontSize: 14, color: '#7f56d9' }}> / {max}</span></span>
                    <span className="cm-sub">suggested{w.aiAt ? ` ${fmtWhen(w.aiAt)}` : ''}</span></div>
                  {w.aiFeedback && <pre className="cm-pre" style={{ fontSize: 13, marginTop: 6 }}>{w.aiFeedback}</pre>}
                  <button type="button" className="cm-btn-soft cm-btn-block" style={{ marginTop: 10 }} onClick={useSuggestion}><Check size={15} /> Use this mark and feedback</button>
                </div>
              )}
            </>
          )}
        </div>

        <IntegrityPanel w={w} onOpenStudent={(other => {
          if (!order.includes(other)) { toast('That student isn\u2019t in the list you opened. Choose "All" on the class list.'); return; }
          if (dirty && !window.confirm('You have an unsaved mark. Leave it without saving?')) return;
          loadedFor.current = null;
          setSid(other);
        })} />

        <label className="cm-field">Mark
          <span className="cm-mark-score">
            <input className="cm-input" type="number" inputMode="decimal" min={0} max={Number(w.assignment.maxMarks)} step="0.5"
              value={score} onChange={e => { setScore(e.target.value); setDirty(true); }} aria-label={`Mark out of ${max}`} />
            <span>/ {max}</span>
            {aiAssisted && <span className="cm-chip cm-chip-info"><Sparkles size={11} /> AI-assisted</span>}
          </span>
        </label>
        <label className="cm-field" style={{ marginTop: 12 }}>Feedback to the student
          <textarea className="cm-textarea" value={feedback} onChange={e => { setFeedback(e.target.value); setDirty(true); }} placeholder="What went well, what to improve" />
        </label>
        <div className="cm-row" style={{ marginTop: 12 }}>
          <button type="button" className="cm-btn-ghost" onClick={() => save(false)} disabled={saving}>{saving && <Loader2 size={14} className="cm-spin" />} Save</button>
          <button type="button" className="cm-btn" style={{ flex: 1 }} onClick={() => save(true)} disabled={saving}>Save and next <ChevronRight size={15} /></button>
        </div>
        {w.markedBy && <p className="cm-help">Last saved by {w.markedBy}{w.markedAt ? ` · ${fmtWhen(w.markedAt)}` : ''}</p>}
        {!w.assignment.marksReleased && <p className="cm-help">Students see marks only after you release them on the assignment page.</p>}

        {w.score != null && (
          <details className="cm-details">
            <summary>Marked copy for the student {w.feedbackFiles.length ? `(${w.feedbackFiles.length})` : ''}</summary>
            {w.feedbackFiles.map(f => (
              <div className="cm-file" key={f.id} style={{ marginBottom: 6 }}>
                <FileText size={15} color="#64748b" /><span className="cm-file-name">{f.name}</span><span className="cm-file-size">{fmtSize(f.size)}</span>
                <button type="button" className="cm-icon-btn" style={{ width: 32, height: 32 }} onClick={() => downloadVia(() => staffFileLink(f.id, false))} aria-label={`Download ${f.name}`}><Download size={14} /></button>
                <button type="button" className="cm-icon-btn" style={{ width: 32, height: 32 }} onClick={() => removeFeedback(f.id)} aria-label={`Remove ${f.name}`}><Trash2 size={14} /></button>
              </div>
            ))}
            <DropZone accepted={SUBMISSION_TYPES} maxMb={25} maxFiles={5} onFiles={uploadFeedback} label="Upload the marked copy" />
          </details>
        )}

        <details className="cm-details">
          <summary>Instructions{w.assignment.markingGuide ? ' and marking guide' : ''}</summary>
          {w.assignment.description && <pre className="cm-pre" style={{ fontSize: 13 }}>{w.assignment.description}</pre>}
          {w.assignment.markingGuide && <><div className="cm-section-title">Marking guide</div><pre className="cm-pre" style={{ fontSize: 13 }}>{w.assignment.markingGuide}</pre></>}
        </details>
      </>
    );
  }
}
