import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  AlertTriangle, ArrowLeft, CheckCircle2, ChevronDown, ChevronRight, ClipboardList, Clock, Download, ExternalLink, EyeOff, FileText, Loader2, Lock, Trash2,
} from 'lucide-react';
import AppModal from '../../../components/ui/AppModal';
import {
  errMsg, getStudentAssignment, getStudentSpace, markOpened, studentFileLink, studentZipLink, submitAssignment,
  type StudentAssignmentDetail, type StudentItem,
} from '../../../api/materials';
import { FileViewer, type ViewFile } from '../../shared/materials/DocViewer';
import { DropZone, FileRow, KindIcon, Spinner, WeekSections, downloadVia, fmtRange, fmtSize, fmtWhen, plain, relative, weekName } from '../../shared/materials/shared';
import { tx } from '../../../utils/terms';
import '../../shared/materials/materials.css';

const STATUS = {
  TO_DO: { label: 'To do', cls: 'cm-chip-warn' },
  MISSED: { label: 'Not handed in', cls: 'cm-chip-bad' },
  HANDED_IN: { label: 'Handed in', cls: 'cm-chip-ok' },
  MARKED: { label: 'Marked', cls: 'cm-chip-info' },
} as const;

/** Student: one course's notes, links and assignments, week by week. */
export default function StudentCourseMaterials() {
  const { courseId } = useParams();
  const id = Number(courseId);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const q = useQuery({ queryKey: ['materials', 'student-space', id], queryFn: () => getStudentSpace(id), enabled: Number.isFinite(id) });
  const [viewing, setViewing] = useState<{ title: string; files: ViewFile[]; start: string } | null>(null);
  const [assignmentId, setAssignmentId] = useState<number | null>(null);
  const jumped = useRef(false);
  /** Weeks the student opened or closed (others follow the default below). */
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

  const s = q.data;
  // ?item=… from a notification or the dashboard: scroll to it, open an assignment
  useEffect(() => {
    if (!s || jumped.current) return;
    const item = Number(params.get('item'));
    jumped.current = true;
    if (!item) {
      if (s.currentWeek > 0) document.getElementById(`cm-week-${s.currentWeek}`)?.scrollIntoView({ block: 'start' });
      return;
    }
    const found = s.weeks.flatMap(w => w.items).find(i => i.id === item);
    const inWeek = s.weeks.find(w => w.items.some(i => i.id === item));
    if (inWeek) setCollapsed(c => ({ ...c, [inWeek.number]: false }));
    if (found?.kind === 'ASSIGNMENT') setAssignmentId(found.id);
    setTimeout(() => document.getElementById(`cm-item-${item}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
    params.delete('item');
    setParams(params, { replace: true });
  }, [s, params, setParams]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['materials', 'student-space', id] });
    qc.invalidateQueries({ queryKey: ['materials', 'overview'] });
    qc.invalidateQueries({ queryKey: ['materials', 'student-courses'] });
  };

  if (q.isLoading) return <div className="cm-page"><Spinner /></div>;
  if (q.isError || !s) return (
    <div className="cm-page">
      <button type="button" className="cm-back" onClick={() => navigate('/user-dashboard/materials')}><ArrowLeft size={15} /> {tx('My courses')}</button>
      <div className="cm-banner cm-banner-bad"><AlertTriangle size={16} />{errMsg(q.error, tx('Could not load this course.'))}</div>
    </div>
  );

  // Open at first: this week (or the latest earlier one), and any week with something new or still to hand in
  const numbers = s.weeks.map(w => w.number);
  const focusWeek = numbers.includes(s.currentWeek) ? s.currentWeek
    : [...numbers].reverse().find(n => n > 0 && n <= s.currentWeek) ?? numbers.find(n => n > 0) ?? numbers[0];
  const needsAttention = (w: (typeof s.weeks)[number]) => w.items.some(i => i.isNew || i.assignment?.status === 'TO_DO');
  const isCollapsed = (w: (typeof s.weeks)[number]) => collapsed[w.number] ?? !(w.number === focusWeek || needsAttention(w));

  const openLink = (item: StudentItem) => { markOpened(item.id).then(refresh).catch(() => { /* counting only */ }); };
  const view = (item: StudentItem, fileId: string) => { setViewing({ title: item.title, files: item.files, start: fileId }); setTimeout(refresh, 1500); };

  return (
    <div className="cm-page">
      <button type="button" className="cm-back" onClick={() => navigate('/user-dashboard/materials')}><ArrowLeft size={15} /> {tx('My courses')}</button>
      <div className="cm-card">
        {s.course.code && <div className="cm-course-code">{s.course.code}</div>}
        <h1 className="cm-title" style={{ fontSize: 19 }}>{s.course.title}</h1>
        <div className="cm-sub">{s.session}{s.course.lecturer ? ` · ${s.course.lecturer}` : ''}{s.currentWeek > 0 ? ` · week ${s.currentWeek}` : ''}</div>
      </div>

      {s.myMarks && s.myMarks.assignments.length > 0 && !s.hiddenReason && (
        <details className="cm-card" open style={{ padding: 0 }}>
          <summary className="cm-mymarks-head">
            <ClipboardList size={17} color="#9f1ab1" aria-hidden />
            <b>My assignment marks</b>
            <span className="cm-spacer" />
            {Number(s.myMarks.outOf) > 0 && <span className="cm-chip cm-chip-info">{plain(s.myMarks.total)} / {plain(s.myMarks.outOf)}{s.myMarks.percent != null ? ` · ${plain(s.myMarks.percent)}%` : ''}</span>}
          </summary>
          <div style={{ padding: '0 14px 12px' }}>
            <table className="cm-mymarks">
              <tbody>
                {s.myMarks.assignments.map(a => (
                  <tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => setAssignmentId(a.id)}>
                    <td>
                      <span style={{ fontWeight: 700, color: '#1e293b' }}>{a.title}</span>
                      <span className="cm-sub" style={{ display: 'block', marginTop: 0 }}>{weekName(a.weekNumber)}{a.counts ? '' : ' · practice, not counted'}</span>
                    </td>
                    <td>
                      {a.state === 'MARKED' ? `${plain(a.score)} / ${plain(a.maxMarks)}`
                        : a.state === 'MISSING' ? <span style={{ color: '#b42318' }}>0 / {plain(a.maxMarks)} <small style={{ fontWeight: 600 }}>not handed in</small></span>
                        : a.state === 'PENDING' ? <span className="cm-muted" style={{ fontWeight: 600 }}>Being marked</span>
                        : a.state === 'NOT_RELEASED' ? <span className="cm-muted" style={{ fontWeight: 600 }}>Mark not out yet</span>
                        : <span className="cm-muted" style={{ fontWeight: 600 }}>Not due yet</span>}
                    </td>
                  </tr>
                ))}
                <tr className="is-total">
                  <td>Total so far</td>
                  <td>{plain(s.myMarks.total)} / {plain(s.myMarks.outOf)}{s.myMarks.percent != null ? ` (${plain(s.myMarks.percent)}%)` : ''}</td>
                </tr>
              </tbody>
            </table>
            {s.myMarks.notReleased > 0 && <p className="cm-help">{s.myMarks.notReleased} assignment{s.myMarks.notReleased === 1 ? "'s mark isn't" : "s' marks aren't"} out yet, so {s.myMarks.notReleased === 1 ? "it isn't" : "they aren't"} in this total.</p>}
          </div>
        </details>
      )}

      {s.hiddenReason === 'QUIZ' ? (
        <div className="cm-banner cm-banner-warn"><Lock size={16} />{tx('This course’s materials are hidden while you are taking one of its quizzes. They come back when you hand the quiz in.')}</div>
      ) : s.hiddenReason === 'HIDDEN' ? (
        <div className="cm-card cm-empty"><EyeOff size={30} /><b>Not available yet</b>{tx('Your lecturer hasn’t opened this course’s materials to students yet.')}</div>
      ) : s.weeks.length === 0 ? (
        <div className="cm-card cm-empty"><FileText size={30} /><b>Nothing here yet</b>{tx('When your lecturer posts notes or assignments you’ll see them here, and be told.')}</div>
      ) : s.weeks.map(w => {
        const isCurrent = w.number === s.currentWeek && w.number > 0;
        const hasFiles = w.items.some(i => i.files.length > 0);
        const closed = isCollapsed(w);
        const fresh = w.items.filter(i => i.isNew).length;
        const toDo = w.items.filter(i => i.assignment?.status === 'TO_DO').length;
        return (
          <section key={w.number} id={`cm-week-${w.number}`} className={`cm-week${isCurrent ? ' is-current' : ''}${closed ? '' : ' is-open'}`} aria-label={weekName(w.number)} style={{ scrollMarginTop: 80 }}>
            <div className="cm-week-head">
              <button type="button" className="cm-week-toggle" onClick={() => setCollapsed(c => ({ ...c, [w.number]: !closed }))}
                aria-expanded={!closed} aria-controls={`cm-week-body-${w.number}`}>
                <span className="cm-week-num">{w.number === 0 ? <><small>All</small><b>★</b></> : <><small>Week</small><b>{w.number}</b></>}</span>
                <span className="cm-week-text">
                  <span className="cm-week-title">{w.number === 0 ? (w.topic || 'General') : (w.topic || weekName(w.number))}
                    {isCurrent && <span className="cm-chip cm-chip-info">This week</span>}
                    {closed && fresh > 0 && <span className="cm-chip cm-chip-new">{fresh} new</span>}
                    {closed && toDo > 0 && <span className="cm-chip cm-chip-warn">{toDo} to do</span>}</span>
                  <span className="cm-week-dates">{[w.number === 0 ? 'For the whole course' : fmtRange(w.start, w.end), `${w.items.length} item${w.items.length === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}</span>
                </span>
                {closed ? <ChevronRight size={18} color="#94a3b8" aria-hidden /> : <ChevronDown size={18} color="#94a3b8" aria-hidden />}
              </button>
              {hasFiles && (
                <button type="button" className="cm-btn-ghost cm-btn-sm" onClick={() => { downloadVia(() => studentZipLink(id, w.number)); setTimeout(refresh, 2000); }}
                  aria-label={`Download all of ${weekName(w.number)}`}><Download size={14} /> All files</button>
              )}
            </div>
            {!closed && <div className="cm-week-body" id={`cm-week-body-${w.number}`}>
              <WeekSections items={w.items} render={item => (
                <div id={`cm-item-${item.id}`} className="cm-item" style={{ scrollMarginTop: 90 }}>
                  <KindIcon kind={item.kind} />
                  <div className="cm-item-main">
                    <div className="cm-item-title">
                      {item.title}
                      {item.isNew && <span className="cm-chip cm-chip-new">New</span>}
                      {item.assignment && <span className={`cm-chip ${STATUS[item.assignment.status].cls}`}>{STATUS[item.assignment.status].label}{item.assignment.late ? ' (late)' : ''}</span>}
                    </div>
                    {item.assignment && (
                      <div className="cm-item-meta">
                        <span><Clock size={12} style={{ verticalAlign: -2 }} /> Due {fmtWhen(item.assignment.dueAt)}{item.assignment.dueAt ? ` · ${relative(item.assignment.dueAt)}` : ''}</span>
                        {item.assignment.reopened && item.assignment.open && <span className="cm-chip cm-chip-warn">Open until {fmtWhen(item.assignment.closesAt)}</span>}
                        {item.assignment.score != null && <span className="cm-chip cm-chip-info">{plain(item.assignment.score)}/{plain(item.assignment.maxMarks)}</span>}
                      </div>
                    )}
                    {item.description && item.kind !== 'ASSIGNMENT' && <div className="cm-item-desc">{item.description}</div>}
                    {item.kind === 'LINK' && item.linkUrl && (
                      <a className="cm-btn-soft cm-btn-sm" style={{ marginTop: 8 }} href={item.linkUrl} target="_blank" rel="noopener noreferrer" onClick={() => openLink(item)}>
                        <ExternalLink size={14} /> Open link
                      </a>
                    )}
                    {item.kind === 'NOTE' && item.files.length > 0 && (
                      <div className="cm-files">
                        {item.files.map(f => <FileRow key={f.id} file={f} onView={() => view(item, f.id)}
                          onDownload={() => { downloadVia(() => studentFileLink(f.id, false)); setTimeout(refresh, 1500); }} />)}
                      </div>
                    )}
                    {item.kind === 'ASSIGNMENT' && (
                      <button type="button" className={item.assignment?.status === 'TO_DO' ? 'cm-btn cm-btn-sm' : 'cm-btn-ghost cm-btn-sm'} style={{ marginTop: 8 }}
                        onClick={() => setAssignmentId(item.id)}>
                        <ClipboardList size={14} /> {item.assignment?.status === 'TO_DO' ? (item.assignment.submittedAt ? 'View or change my work' : 'Open and hand in') : 'Open'}
                      </button>
                    )}
                  </div>
                </div>
              )} />
            </div>}
          </section>
        );
      })}

      {viewing && <FileViewer files={viewing.files} startId={viewing.start} title={viewing.title} getLink={studentFileLink} onClose={() => setViewing(null)} />}
      {assignmentId != null && <AssignmentSheet id={assignmentId} onClose={() => setAssignmentId(null)} onChanged={refresh}
        onView={(title, files, start) => setViewing({ title, files, start })} />}
    </div>
  );
}

const draftKey = (id: number) => `assignment_draft_${id}`;

function AssignmentSheet({ id, onClose, onChanged, onView }: {
  id: number; onClose: () => void; onChanged: () => void; onView: (title: string, files: ViewFile[], start: string) => void;
}) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['materials', 'student-assignment', id], queryFn: () => getStudentAssignment(id) });
  const d = q.data;
  const [typed, setTyped] = useState<string | null>(null);
  const [keep, setKeep] = useState<string[] | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);

  // Start from what was handed in, or the unsent draft kept on this phone
  useEffect(() => {
    if (!d || typed !== null) return;
    let draft: string | null = null;
    try { draft = localStorage.getItem(draftKey(id)); } catch { /* storage blocked */ }
    setTyped(draft ?? d.submission?.typedAnswer ?? '');
    setKeep(d.submission?.files.map(f => f.id) ?? []);
  }, [d, id, typed]);

  const onTyped = (v: string) => {
    setTyped(v);
    try { localStorage.setItem(draftKey(id), v); } catch { /* storage blocked */ }
  };

  if (!d) return (
    <AppModal title="Assignment" onClose={onClose}>{q.isError ? <div className="cm-banner cm-banner-bad"><AlertTriangle size={16} />{errMsg(q.error)}</div> : <Spinner />}</AppModal>
  );

  const a = d.assignment;
  const sub = d.submission;
  const locked = !!sub?.locked;
  const canWork = a.open && !locked;
  const keptFiles = (sub?.files ?? []).filter(f => (keep ?? []).includes(f.id));
  const total = keptFiles.length + files.length;
  const dirty = typed !== (sub?.typedAnswer ?? '') || files.length > 0 || keptFiles.length !== (sub?.files.length ?? 0);

  const submit = async () => {
    const text = (typed ?? '').trim();
    if (!text && total === 0) { toast.error(a.allowFiles ? 'Attach your work first' : 'Type your answer first'); return; }
    setBusy(true);
    if (files.length) setProgress(0);
    try {
      const res: StudentAssignmentDetail = await submitAssignment(id, a.allowTyped ? text : null, keep ?? [], files, setProgress);
      qc.setQueryData(['materials', 'student-assignment', id], res);
      try { localStorage.removeItem(draftKey(id)); } catch { /* storage blocked */ }
      setFiles([]);
      setTyped(res.submission?.typedAnswer ?? '');
      setKeep(res.submission?.files.map(f => f.id) ?? []);
      toast.success(res.submission?.late ? 'Handed in (late)' : 'Handed in');
      onChanged();
    } catch (e) { toast.error(errMsg(e, 'Could not hand it in')); }
    finally { setBusy(false); setProgress(null); }
  };

  return (
    <AppModal size="lg" title={d.title} subtitle={`${d.course.code ?? d.course.title} · ${weekName(d.weekNumber)}`} onClose={() => !busy && onClose()} closeOnBackdrop={false}
      footer={canWork ? <>
        <button type="button" className="cm-btn-ghost" onClick={onClose} disabled={busy}>Close</button>
        <button type="button" className="cm-btn" onClick={submit} disabled={busy || (!!sub?.submittedAt && !dirty)}>
          {busy && <Loader2 size={15} className="cm-spin" />} {sub?.submittedAt ? 'Hand in again' : 'Hand in'}
        </button>
      </> : undefined}>
      <div className="cm-grid">
        <div className="cm-row">
          <span className={`cm-chip ${a.open ? 'cm-chip-ok' : 'cm-chip-mute'}`}>{a.open ? <Clock size={12} /> : <Lock size={12} />}
            {a.open ? `Due ${fmtWhen(a.dueAt)}` : `Closed ${fmtWhen(a.closesAt)}`}</span>
          {a.open && a.reopened && <span className="cm-chip cm-chip-warn">Reopened until {fmtWhen(a.closesAt)}</span>}
          <span className="cm-chip cm-chip-mute">Out of {plain(a.maxMarks)}</span>
          {sub?.submittedAt && <span className="cm-chip cm-chip-ok"><CheckCircle2 size={12} /> Handed in {fmtWhen(sub.submittedAt)}{sub.late ? ' (late)' : ''}</span>}
        </div>

        {d.description && <div className="cm-card" style={{ margin: 0, background: '#f8fafc' }}><pre className="cm-pre">{d.description}</pre></div>}
        {d.files.length > 0 && (
          <div className="cm-files" style={{ marginTop: 0 }}>
            {d.files.map(f => <FileRow key={f.id} file={f} onView={() => onView(d.title, d.files, f.id)} onDownload={() => downloadVia(() => studentFileLink(f.id, false))} />)}
          </div>
        )}

        {sub?.score != null && (
          <div className="cm-ai" style={{ margin: 0, borderColor: '#b2ddff', background: 'linear-gradient(180deg,#eff8ff,#fff)' }}>
            <div className="cm-row"><span className="cm-ai-score" style={{ color: '#175cd3' }}>{plain(sub.score)}<span style={{ fontSize: 14 }}> / {plain(a.maxMarks)}</span></span><span className="cm-sub">Your mark</span></div>
            {sub.feedback && <pre className="cm-pre" style={{ marginTop: 6 }}>{sub.feedback}</pre>}
            {(sub.feedbackFiles ?? []).length > 0 && (
              <div className="cm-files">{sub.feedbackFiles!.map(f => <FileRow key={f.id} file={f} onView={() => onView('Marked work', sub.feedbackFiles!, f.id)} onDownload={() => downloadVia(() => studentFileLink(f.id, false))} />)}</div>
            )}
          </div>
        )}
        {locked && sub?.score == null && <div className="cm-banner cm-banner-info" style={{ margin: 0 }}><CheckCircle2 size={16} />Your work has been marked. You'll see the mark when your lecturer releases it.</div>}
        {!a.open && !sub?.submittedAt && <div className="cm-banner cm-banner-bad" style={{ margin: 0 }}><Lock size={16} />Submissions closed on {fmtWhen(a.closesAt)}. Ask your lecturer if you need more time.</div>}

        <div className="cm-section-title" style={{ margin: '6px 0 0' }}>My work</div>
        {a.allowTyped && (canWork ? (
          <label className="cm-field">Your answer
            <textarea className="cm-textarea" style={{ minHeight: 160 }} value={typed ?? ''} onChange={e => onTyped(e.target.value)} placeholder="Type your answer here. It's kept on this device until you hand it in." disabled={busy} />
          </label>
        ) : sub?.typedAnswer ? <div className="cm-card" style={{ margin: 0 }}><pre className="cm-pre">{sub.typedAnswer}</pre></div> : null)}

        {a.allowFiles && (
          <div className="cm-field">Files
            {(sub?.files ?? []).length > 0 && (
              <div className="cm-files" style={{ marginTop: 0 }}>
                {sub!.files.map(f => {
                  const kept = (keep ?? []).includes(f.id);
                  return (
                    <div key={f.id} className="cm-file" style={{ opacity: kept ? 1 : 0.5 }}>
                      <FileText size={15} color="#64748b" /><span className="cm-file-name" style={{ textDecoration: kept ? undefined : 'line-through' }}>{f.name}</span>
                      <span className="cm-file-size">{fmtSize(f.size)}</span>
                      <button type="button" className="cm-icon-btn" style={{ width: 32, height: 32 }} onClick={() => onView('My work', sub!.files, f.id)} aria-label={`View ${f.name}`}><ExternalLink size={14} /></button>
                      {canWork && (
                        <button type="button" className="cm-icon-btn" style={{ width: 32, height: 32 }} disabled={busy}
                          onClick={() => setKeep(k => kept ? (k ?? []).filter(x => x !== f.id) : [...(k ?? []), f.id])}
                          aria-label={kept ? `Remove ${f.name}` : `Keep ${f.name}`}>{kept ? <Trash2 size={14} /> : <CheckCircle2 size={14} />}</button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {canWork && (
              <>
                {total < d.maxFiles && (
                  <DropZone accepted={d.accepted} maxMb={d.maxFileMb} maxFiles={d.maxFiles - total} onFiles={f => setFiles(prev => [...prev, ...f])}
                    label="Attach your work" disabled={busy} />
                )}
                {files.length > 0 && (
                  <div className="cm-files">
                    {files.map((f, i) => (
                      <div key={i} className="cm-file">
                        <FileText size={15} color="var(--brand-text)" /><span className="cm-file-name">{f.name}</span><span className="cm-file-size">{fmtSize(f.size)}</span>
                        <button type="button" className="cm-icon-btn" style={{ width: 32, height: 32 }} disabled={busy} onClick={() => setFiles(fs => fs.filter((_, j) => j !== i))} aria-label={`Remove ${f.name}`}><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="cm-help">Tip: photograph handwritten pages in good light, or scan them into one PDF.</p>
              </>
            )}
            {!canWork && (sub?.files ?? []).length === 0 && <span className="cm-muted">No files.</span>}
          </div>
        )}
        {progress != null && <div className="cm-progress" aria-label="Upload progress"><span style={{ width: `${Math.round(progress * 100)}%` }} /></div>}
        {canWork && sub?.submittedAt && <p className="cm-help" style={{ margin: 0 }}>You can change your work until submissions close. Only the last version counts.</p>}
      </div>
    </AppModal>
  );
}
