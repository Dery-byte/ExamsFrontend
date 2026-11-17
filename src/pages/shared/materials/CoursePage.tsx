import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import GradebookTab from './GradebookTab';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  AlertTriangle, ArchiveRestore, ArrowLeft, CalendarClock, ChevronDown, ChevronRight, ClipboardList, Copy, Download, Eye, EyeOff,
  Info, Loader2, Pencil, Pin, Plus, Settings2, Trash2, Users,
} from 'lucide-react';
import AppModal from '../../../components/ui/AppModal';
import {
  copyFromTerm, deleteMaterial, errMsg, getBin, getCopySources, getManageSpace, getViews, purgeMaterial, restoreMaterial,
  saveSpaceSettings, saveWeek, setMaterialVisibility, staffFileLink, staffZipLink, updateMaterial,
  type MaterialKind, type StaffItem, type StaffSpace, type StaffWeek, type WeekState,
} from '../../../api/materials';
import ItemEditor from './ItemEditor';
import { FileViewer } from './DocViewer';
import {
  FileRow, KindIcon, Menu, Spinner, Switch, downloadVia, fmtRange, fmtWhen, fromLocalInput, localNowInput, relative,
  toLocalInput, useMaterialsBase, weekName, plain, WeekSections,
} from './shared';
import { tx } from '../../../utils/terms';
import './materials.css';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const dayLabel = (d: string) => d.charAt(0) + d.slice(1).toLowerCase();

/** Staff: one course's weeks with their notes, links and assignments, and who sees what. */
export default function CoursePage() {
  const { courseId } = useParams();
  const id = Number(courseId);
  const base = useMaterialsBase();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const key = ['materials', 'space', id];
  const q = useQuery({ queryKey: key, queryFn: () => getManageSpace(id), enabled: Number.isFinite(id) });
  const set = (s: StaffSpace) => { qc.setQueryData(key, s); qc.invalidateQueries({ queryKey: ['materials', 'manage-courses'] }); };

  const [editor, setEditor] = useState<{ item?: StaffItem | null; week?: number; kind?: MaterialKind } | null>(null);
  const [weekEdit, setWeekEdit] = useState<StaffWeek | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [binOpen, setBinOpen] = useState(false);
  const [viewsOf, setViewsOf] = useState<StaffItem | null>(null);
  const [viewing, setViewing] = useState<{ item: StaffItem; fileId: string } | null>(null);
  const [showEmpty, setShowEmpty] = useState(false);
  // Weeks (notes and assignments) or Marks (every assignment's marks and the running total); kept in the address
  const [params, setParams] = useSearchParams();
  const tab: 'weeks' | 'marks' = params.get('tab') === 'marks' ? 'marks' : 'weeks';
  const chooseTab = (t: 'weeks' | 'marks') => { const p = new URLSearchParams(params); if (t === 'marks') p.set('tab', 'marks'); else p.delete('tab'); setParams(p, { replace: true }); };
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

  const s = q.data;
  const weeks = useMemo(() => {
    if (!s) return [];
    return s.weeks.filter(w => showEmpty || w.items.length > 0 || w.number === 0 || w.number === s.currentWeek || w.topic || w.state !== 'OPEN');
  }, [s, showEmpty]);

  if (q.isLoading) return <div className="cm-page"><Spinner /></div>;
  if (q.isError || !s) return (
    <div className="cm-page">
      <button type="button" className="cm-back" onClick={() => navigate(`${base}/materials`)}><ArrowLeft size={15} /> {tx('All courses')}</button>
      <div className="cm-banner cm-banner-bad"><AlertTriangle size={16} />{errMsg(q.error, tx('Could not load this course.'))}</div>
    </div>
  );

  const allItems = s.weeks.flatMap(w => w.items);
  // The week opened at first: this week if it has anything, else the latest earlier week with items, else the first with items
  const withItems = s.weeks.filter(w => w.items.length > 0).map(w => w.number);
  const focusWeek = withItems.includes(s.currentWeek) ? s.currentWeek
    : [...withItems].reverse().find(n => n > 0 && n <= s.currentWeek) ?? withItems.find(n => n > 0) ?? withItems[0];
  const toMark = allItems.reduce((n, i) => n + (i.assignment ? Math.max(0, i.assignment.handedIn - i.assignment.marked) : 0), 0);
  const hiddenCount = s.weeks.filter(w => !(showEmpty || w.items.length > 0 || w.number === 0 || w.number === s.currentWeek || w.topic || w.state !== 'OPEN')).length;

  const quickVisibility = async (item: StaffItem) => {
    const next = item.visibility === 'VISIBLE' ? 'HIDDEN' : 'VISIBLE';
    try {
      set(await setMaterialVisibility(item.id, next));
      toast.success(next === 'VISIBLE' ? 'Students can see it' : 'Hidden from students');
    } catch (e) { toast.error(errMsg(e, 'Could not change it')); }
  };
  const remove = async (item: StaffItem) => {
    if (!window.confirm(`Move "${item.title}" to the recycle bin? You can restore it for 30 days.`)) return;
    try { set(await deleteMaterial(item.id)); toast.success('Moved to the recycle bin'); }
    catch (e) { toast.error(errMsg(e, 'Could not delete it')); }
  };
  const togglePin = async (item: StaffItem) => {
    try { set(await updateMaterial(item.id, { pinned: !item.pinned })); } catch (e) { toast.error(errMsg(e)); }
  };
  const setWeekState = async (w: StaffWeek, state: WeekState) => {
    try {
      set(await saveWeek(id, w.number, { state }));
      toast.success(state === 'OPEN' ? `${weekName(w.number)} is open to students` : `${weekName(w.number)} is hidden from students`);
    } catch (e) { toast.error(errMsg(e)); }
  };
  const toggleCourse = async (v: boolean) => {
    try { set(await saveSpaceSettings(id, { visibleToStudents: v })); toast.success(v ? 'Students can see this course' : 'Hidden from students'); }
    catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div className="cm-page">
      <button type="button" className="cm-back" onClick={() => navigate(`${base}/materials`)}><ArrowLeft size={15} /> {tx('All courses')}</button>

      <div className="cm-card">
        <div className="cm-hero">
          <div className="cm-hero-main">
            {s.course.code && <div className="cm-course-code">{s.course.code}</div>}
            <h1 className="cm-title" style={{ fontSize: 19 }}>{s.course.title}</h1>
            <div className="cm-sub">{s.session}{s.course.lecturer ? ` · ${s.course.lecturer}` : ''}</div>
          </div>
          <div className="cm-hero-actions">
            <button type="button" className="cm-btn" onClick={() => setEditor({ week: Math.max(s.currentWeek, 0) })}><Plus size={16} /> Add</button>
            <button type="button" className="cm-btn-ghost" onClick={() => setSettingsOpen(true)}><Settings2 size={16} /> Settings</button>
            <Menu label="More">
              {close => <>
                <button type="button" onClick={() => { close(); setCopyOpen(true); }}><Copy size={15} /> {tx('Copy from an earlier term')}</button>
                <button type="button" onClick={() => { close(); setBinOpen(true); }}><ArchiveRestore size={15} /> Recycle bin{s.binCount ? ` (${s.binCount})` : ''}</button>
              </>}
            </Menu>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <Switch checked={s.settings.visibleToStudents} onChange={toggleCourse} label={tx('Students can see this course’s materials')} />
        </div>
        <div className="cm-stats">
          <div className="cm-stat"><b>{s.currentWeek > 0 ? `Week ${s.currentWeek}` : '—'}</b><span>{s.settings.weekOneMonday ? 'This week' : 'No term dates yet'}</span></div>
          <div className="cm-stat"><b>{s.rosterSize}</b><span>{tx('Students registered')}</span></div>
          <div className="cm-stat"><b>{allItems.length}</b><span>Items posted</span></div>
          <div className="cm-stat"><b>{toMark}</b><span>Hand-ins to mark</span></div>
        </div>
      </div>

      <div className="cm-tabs-light" role="tablist" aria-label="Show">
        <button type="button" role="tab" aria-selected={tab === 'weeks'} className={tab === 'weeks' ? 'is-on' : ''} onClick={() => chooseTab('weeks')}>
          <CalendarClock size={15} /> Weeks
        </button>
        <button type="button" role="tab" aria-selected={tab === 'marks'} className={tab === 'marks' ? 'is-on' : ''} onClick={() => chooseTab('marks')}>
          <ClipboardList size={15} /> Marks
        </button>
      </div>

      {tab === 'marks' ? <GradebookTab space={s} /> : <>
      {!s.settings.visibleToStudents && (
        <div className="cm-banner cm-banner-warn"><EyeOff size={16} />{tx('Students can’t see anything in this course until you switch it on above.')}</div>
      )}
      {!s.settings.weekOneMonday && (
        <div className="cm-banner cm-banner-info"><Info size={16} />
          <span>{tx('Weeks have no dates yet. The Super Admin can set term dates in Academic Settings, or set when week 1 starts in')} <button type="button" className="cm-chip cm-chip-info" onClick={() => setSettingsOpen(true)}>Settings</button>.</span>
        </div>
      )}
      {s.settings.autoRelease && (
        <div className="cm-banner cm-banner-info"><CalendarClock size={16} />
          Each future week opens on {dayLabel(s.settings.autoReleaseDay)} at {s.settings.autoReleaseTime.slice(0, 5)} of that week.
        </div>
      )}

      {weeks.map(w => {
        const isCurrent = w.number === s.currentWeek && w.number > 0;
        const isCollapsed = collapsed[w.number] ?? (w.number !== focusWeek);
        const hasFiles = w.items.some(i => i.files.length > 0);
        return (
          <section key={w.number} className={`cm-week${isCurrent ? ' is-current' : ''}${w.items.length === 0 ? ' is-empty' : ''}${!isCollapsed && w.items.length > 0 ? ' is-open' : ''}`} aria-label={weekName(w.number)}>
            <div className="cm-week-head">
              <button type="button" className="cm-week-toggle" onClick={() => setCollapsed(c => ({ ...c, [w.number]: !isCollapsed }))} aria-expanded={!isCollapsed}>
                <span className="cm-week-num">{w.number === 0 ? <><small>All</small><b>★</b></> : <><small>Week</small><b>{w.number}</b></>}</span>
                <span className="cm-week-text">
                  <span className="cm-week-title">
                    {w.number === 0 ? 'General' : (w.topic || weekName(w.number))}
                    {isCurrent && <span className="cm-chip cm-chip-info">This week</span>}
                  </span>
                  <span className="cm-week-dates">
                    {w.number === 0 ? (w.topic || 'Course outline, reading list…') : [fmtRange(w.start, w.end), `${w.items.length} item${w.items.length === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}
                  </span>
                </span>
                {w.items.length > 0 && (isCollapsed ? <ChevronRight size={18} color="#94a3b8" /> : <ChevronDown size={18} color="#94a3b8" />)}
              </button>
              <div className="cm-week-actions">
                <WeekChip w={w} onClick={() => setWeekEdit(w)} />
                {hasFiles && (
                  <button type="button" className="cm-icon-btn" aria-label={`Download ${weekName(w.number)} as ZIP`}
                    onClick={() => downloadVia(() => staffZipLink(id, w.number))}><Download size={16} /></button>
                )}
                <button type="button" className="cm-icon-btn" aria-label={`Add to ${weekName(w.number)}`} onClick={() => setEditor({ week: w.number })}><Plus size={17} /></button>
                <Menu label={`${weekName(w.number)} options`}>
                  {close => <>
                    <button type="button" onClick={() => { close(); setWeekEdit(w); }}><Pencil size={15} /> Topic and release</button>
                    {w.state !== 'OPEN' && <button type="button" onClick={() => { close(); setWeekState(w, 'OPEN'); }}><Eye size={15} /> Open to students now</button>}
                    {w.state !== 'HIDDEN' && <button type="button" onClick={() => { close(); setWeekState(w, 'HIDDEN'); }}><EyeOff size={15} /> Hide this week</button>}
                    <hr />
                    <button type="button" onClick={() => { close(); setEditor({ week: w.number, kind: 'NOTE' }); }}><Plus size={15} /> Add notes</button>
                    <button type="button" onClick={() => { close(); setEditor({ week: w.number, kind: 'ASSIGNMENT' }); }}><ClipboardList size={15} /> Add an assignment</button>
                  </>}
                </Menu>
              </div>
            </div>
            {!isCollapsed && w.items.length > 0 && (
              <div className="cm-week-body">
                <WeekSections items={w.items} onAdd={kind => setEditor({ week: w.number, kind })} render={item => (
                  <StaffItemRow item={item}
                    onEdit={() => setEditor({ item })} onToggle={() => quickVisibility(item)} onDelete={() => remove(item)}
                    onPin={() => togglePin(item)} onViews={() => setViewsOf(item)}
                    onView={fileId => setViewing({ item, fileId })}
                    onDownload={fileId => downloadVia(() => staffFileLink(fileId, false))}
                    onOpenAssignment={() => navigate(`${base}/materials/assignment/${item.id}`)} />
                )} />
              </div>
            )}
          </section>
        );
      })}

      {(hiddenCount > 0 || showEmpty) && (
        <button type="button" className="cm-btn-ghost cm-btn-block" onClick={() => setShowEmpty(v => !v)}>
          {showEmpty ? 'Hide empty weeks' : `Show ${hiddenCount} empty week${hiddenCount === 1 ? '' : 's'}`}
        </button>
      )}
      </>}

      {editor && <ItemEditor space={s} item={editor.item} week={editor.week} kind={editor.kind} onClose={() => setEditor(null)}
        onSaved={sp => { set(sp); const wk = editor.item?.weekNumber ?? editor.week; if (wk != null) setCollapsed(c => ({ ...c, [wk]: false })); }} />}
      {weekEdit && <WeekDialog courseId={id} week={weekEdit} onClose={() => setWeekEdit(null)} onSaved={set} />}
      {settingsOpen && <SettingsDialog space={s} onClose={() => setSettingsOpen(false)} onSaved={set} />}
      {copyOpen && <CopyDialog courseId={id} onClose={() => setCopyOpen(false)} onSaved={set} />}
      {binOpen && <BinDialog courseId={id} onClose={() => setBinOpen(false)} onRestored={set} />}
      {viewsOf && <ViewsDialog item={viewsOf} onClose={() => setViewsOf(null)} />}
      {viewing && (
        <FileViewer files={viewing.item.files} startId={viewing.fileId} title={viewing.item.title}
          getLink={staffFileLink} onClose={() => setViewing(null)} />
      )}
    </div>
  );
}

function WeekChip({ w, onClick }: { w: StaffWeek; onClick: () => void }) {
  if (w.state === 'HIDDEN') return <button type="button" className="cm-chip cm-chip-bad" onClick={onClick}><EyeOff size={12} /> Hidden</button>;
  if (w.state === 'SCHEDULED' && !w.open) return <button type="button" className="cm-chip cm-chip-warn" onClick={onClick}><CalendarClock size={12} /> Opens {fmtWhen(w.releaseAt)}</button>;
  return <button type="button" className="cm-chip cm-chip-ok" onClick={onClick}><Eye size={12} /> Open</button>;
}

function VisibilityChip({ item }: { item: StaffItem }) {
  if (item.studentsSee) return <span className="cm-chip cm-chip-ok"><Eye size={12} /> Students see it</span>;
  switch (item.hiddenBecause) {
    case 'DRAFT': return <span className="cm-chip cm-chip-mute"><Pencil size={12} /> Draft</span>;
    case 'HIDDEN': return <span className="cm-chip cm-chip-bad"><EyeOff size={12} /> Hidden</span>;
    case 'SCHEDULED': return <span className="cm-chip cm-chip-warn"><CalendarClock size={12} /> Shows {fmtWhen(item.hiddenUntil ?? item.visibleFrom)}</span>;
    case 'WEEK_HIDDEN': return <span className="cm-chip cm-chip-bad"><EyeOff size={12} /> Week hidden</span>;
    case 'WEEK_SCHEDULED': return <span className="cm-chip cm-chip-warn"><CalendarClock size={12} /> Week opens {fmtWhen(item.hiddenUntil)}</span>;
    case 'COURSE_HIDDEN': return <span className="cm-chip cm-chip-bad"><EyeOff size={12} /> Course hidden</span>;
    default: return null;
  }
}

function StaffItemRow({ item, onEdit, onToggle, onDelete, onPin, onViews, onView, onDownload, onOpenAssignment }: {
  item: StaffItem; onEdit: () => void; onToggle: () => void; onDelete: () => void; onPin: () => void; onViews: () => void;
  onView: (fileId: string) => void; onDownload: (fileId: string) => void; onOpenAssignment: () => void;
}) {
  const [more, setMore] = useState(false);
  const a = item.assignment;
  const shown = item.visibility === 'VISIBLE' || item.visibility === 'SCHEDULED';
  return (
    <div className={`cm-item has-actions${item.studentsSee ? '' : ' is-hidden'}`}>
      <KindIcon kind={item.kind} />
      <div className="cm-item-main">
        <div className="cm-item-title">
          {item.pinned && <Pin size={13} color="#7c3aed" aria-label="Pinned" />}
          {item.title}
        </div>
        <div className="cm-item-meta">
          <VisibilityChip item={item} />
          {a && <span className={`cm-chip ${a.open ? 'cm-chip-info' : 'cm-chip-mute'}`}>
            {a.open ? `Due ${fmtWhen(a.dueAt)}` : 'Closed'}</span>}
          {a && <span>{a.handedIn} handed in · {a.marked} marked · out of {plain(a.maxMarks)}</span>}
          {item.studentsSee && <button type="button" className="cm-chip cm-chip-mute" onClick={onViews}><Users size={12} /> {item.opened} opened</button>}
          {item.files.length > 0 && <span>{item.files.length} file{item.files.length === 1 ? '' : 's'}</span>}
        </div>
        {item.description && (
          <div className={`cm-item-desc${more ? '' : ' is-clamped'}`} onClick={() => setMore(m => !m)}>{item.description}</div>
        )}
        {item.linkUrl && <a className="cm-sub" href={item.linkUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: 6, overflowWrap: 'anywhere' }}>{item.linkUrl}</a>}
        {item.files.length > 0 && (
          <div className="cm-files">
            {item.files.map(f => <FileRow key={f.id} file={f} onView={() => onView(f.id)} onDownload={() => onDownload(f.id)} />)}
          </div>
        )}
        {a && (
          <div className="cm-row" style={{ marginTop: 10 }}>
            <button type="button" className="cm-btn-soft cm-btn-sm" onClick={onOpenAssignment}><ClipboardList size={14} /> Submissions and marking</button>
          </div>
        )}
      </div>
      <div className="cm-item-actions">
        <button type="button" className={`cm-icon-btn${shown ? ' is-on' : ''}`} onClick={onToggle}
          aria-label={item.visibility === 'VISIBLE' ? 'Hide from students' : 'Show to students'} title={item.visibility === 'VISIBLE' ? 'Hide from students' : 'Show to students'}>
          {item.visibility === 'VISIBLE' ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
        <Menu label={`Options for ${item.title}`}>
          {close => <>
            <button type="button" onClick={() => { close(); onEdit(); }}><Pencil size={15} /> Edit</button>
            {item.studentsSee && <button type="button" onClick={() => { close(); onViews(); }}><Users size={15} /> Who opened it</button>}
            <button type="button" onClick={() => { close(); onPin(); }}><Pin size={15} /> {item.pinned ? 'Unpin' : 'Pin to top'}</button>
            <hr />
            <button type="button" className="is-danger" onClick={() => { close(); onDelete(); }}><Trash2 size={15} /> Delete</button>
          </>}
        </Menu>
      </div>
    </div>
  );
}

function WeekDialog({ courseId, week, onClose, onSaved }: { courseId: number; week: StaffWeek; onClose: () => void; onSaved: (s: StaffSpace) => void }) {
  const [topic, setTopic] = useState(week.topic ?? '');
  const [state, setState] = useState<WeekState>(week.state === 'SCHEDULED' && week.open ? 'OPEN' : week.state);
  const [releaseAt, setReleaseAt] = useState(toLocalInput(week.releaseAt) || (week.start ? `${week.start}T08:00` : localNowInput(60)));
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (state === 'SCHEDULED' && !releaseAt) { toast.error('Choose when the week opens'); return; }
    setBusy(true);
    try {
      onSaved(await saveWeek(courseId, week.number, { topic, state, releaseAt: state === 'SCHEDULED' ? fromLocalInput(releaseAt) : null }));
      onClose();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <AppModal title={weekName(week.number)} subtitle={fmtRange(week.start, week.end) || undefined} onClose={onClose}
      footer={<><button type="button" className="cm-btn-ghost" onClick={onClose}>Cancel</button>
        <button type="button" className="cm-btn" onClick={save} disabled={busy}>{busy && <Loader2 size={15} className="cm-spin" />} Save</button></>}>
      <div className="cm-grid">
        <label className="cm-field">{week.number === 0 ? 'Heading' : 'Topic'}
          <input className="cm-input" value={topic} maxLength={200} onChange={e => setTopic(e.target.value)} placeholder={week.number === 0 ? 'e.g. Course outline and reading list' : 'e.g. Linked lists'} />
        </label>
        <div className="cm-field">Students see this week
          <div className="cm-choices">
            {([['OPEN', 'Open now', 'Students see everything in it that you have shown'],
              ['SCHEDULED', 'Open on a date', 'It stays closed until then, and students are told when it opens'],
              ['HIDDEN', 'Hidden', 'Nothing in it shows until you open it']] as [WeekState, string, string][]).map(([v, l, h]) => (
              <label key={v} className={`cm-choice${state === v ? ' is-on' : ''}`}>
                <input type="radio" name="cm-week-state" checked={state === v} onChange={() => setState(v)} />
                <span><b>{l}</b><small>{h}</small></span>
              </label>
            ))}
          </div>
          {state === 'SCHEDULED' && <input className="cm-input" type="datetime-local" value={releaseAt} onChange={e => setReleaseAt(e.target.value)} aria-label="Opens at" />}
        </div>
      </div>
    </AppModal>
  );
}

function SettingsDialog({ space, onClose, onSaved }: { space: StaffSpace; onClose: () => void; onSaved: (s: StaffSpace) => void }) {
  const st = space.settings;
  const termAvailable = !!st.termStart;
  const [hideDuringQuiz, setHide] = useState(st.hideDuringQuiz);
  const [useTerm, setUseTerm] = useState(st.usesTermDates && termAvailable);
  const [weekOne, setWeekOne] = useState(st.weekOneStart ?? st.weekOneMonday ?? '');
  const [weeksCount, setWeeksCount] = useState(String(st.weeksCount ?? st.weeks ?? 14));
  const [autoRelease, setAuto] = useState(st.autoRelease);
  const [day, setDay] = useState(st.autoReleaseDay || 'MONDAY');
  const [time, setTime] = useState((st.autoReleaseTime || '08:00').slice(0, 5));
  const [busy, setBusy] = useState(false);
  const save = async () => {
    const n = Number(weeksCount);
    if (!useTerm && (!Number.isInteger(n) || n < 1 || n > 30)) { toast.error('Choose 1 to 30 weeks'); return; }
    if (autoRelease && !useTerm && !weekOne) { toast.error('Set when week 1 starts for weekly release'); return; }
    setBusy(true);
    try {
      onSaved(await saveSpaceSettings(space.course.id, {
        hideDuringQuiz, useTermDates: useTerm, ...(useTerm ? {} : { weekOneStart: weekOne || null, weeksCount: n }),
        autoRelease, autoReleaseDay: day, autoReleaseTime: time.length === 5 ? time + ':00' : time,
      }));
      toast.success('Settings saved');
      onClose();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <AppModal title="Course settings" subtitle={tx(`${space.course.code ?? ''} ${space.course.title}`.trim())} onClose={onClose} size="md"
      footer={<><button type="button" className="cm-btn-ghost" onClick={onClose}>Cancel</button>
        <button type="button" className="cm-btn" onClick={save} disabled={busy}>{busy && <Loader2 size={15} className="cm-spin" />} Save</button></>}>
      <div className="cm-grid">
        <div>
          <Switch checked={hideDuringQuiz} onChange={setHide} label="Hide materials while a student is taking one of this course's quizzes" />
          <p className="cm-help">{tx('Stops students opening the notes during an online quiz. Other students still see them.')}</p>
        </div>

        <div className="cm-section-title" style={{ marginTop: 6 }}>Weeks</div>
        {termAvailable && (
          <label className="cm-check"><input type="checkbox" checked={useTerm} onChange={e => setUseTerm(e.target.checked)} />
            <span>{tx('Use the term dates')}<small>Week 1 starts {st.termStart} · {st.termWeeks} weeks (set by the Super Admin)</small></span></label>
        )}
        {!useTerm && (
          <div className="cm-grid cm-grid-2">
            <label className="cm-field">Week 1 starts
              <input className="cm-input" type="date" value={weekOne ?? ''} onChange={e => setWeekOne(e.target.value)} />
            </label>
            <label className="cm-field">Number of weeks
              <input className="cm-input" type="number" min={1} max={30} inputMode="numeric" value={weeksCount} onChange={e => setWeeksCount(e.target.value)} />
            </label>
          </div>
        )}

        <div className="cm-section-title" style={{ marginTop: 6 }}>Weekly release</div>
        <div>
          <Switch checked={autoRelease} onChange={setAuto} label="Open each week automatically" />
          <p className="cm-help">Upload the whole term in advance; each week opens on its day and time and students are told. Weeks already past are left as they are.</p>
        </div>
        {autoRelease && (
          <div className="cm-grid cm-grid-2">
            <label className="cm-field">Day
              <select className="cm-select" value={day} onChange={e => setDay(e.target.value)}>
                {DAYS.map(d => <option key={d} value={d}>{dayLabel(d)}</option>)}
              </select>
            </label>
            <label className="cm-field">Time
              <input className="cm-input" type="time" value={time} onChange={e => setTime(e.target.value)} />
            </label>
          </div>
        )}
      </div>
    </AppModal>
  );
}

function CopyDialog({ courseId, onClose, onSaved }: { courseId: number; onClose: () => void; onSaved: (s: StaffSpace) => void }) {
  const sources = useQuery({ queryKey: ['materials', 'copy-sources', courseId], queryFn: () => getCopySources(courseId) });
  const [busy, setBusy] = useState<number | null>(null);
  const copy = async (spaceId: number) => {
    setBusy(spaceId);
    try {
      const s = await copyFromTerm(courseId, spaceId);
      onSaved(s);
      toast.success(s.copied ? `${s.copied} item${s.copied === 1 ? '' : 's'} copied as drafts` : 'Everything was already copied');
      onClose();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(null); }
  };
  return (
    <AppModal title={tx('Copy from an earlier term')} onClose={onClose}>
      <p className="cm-help" style={{ marginTop: 0 }}>Notes, links and assignments are copied into the same weeks as drafts, so you can check them before students see them. Assignments need new due dates. Files are shared, so copying uses no extra space.</p>
      {sources.isLoading ? <Spinner />
        : (sources.data ?? []).length === 0 ? <div className="cm-empty"><b>Nothing to copy</b>{tx('This course has no materials from an earlier academic year.')}</div>
        : (
          <div className="cm-files">
            {sources.data!.map(src => (
              <div key={src.spaceId} className="cm-file" style={{ padding: 10 }}>
                <span className="cm-file-name"><b>{src.session}</b> · {src.notes} notes/links, {src.assignments} assignments</span>
                <button type="button" className="cm-btn cm-btn-sm" onClick={() => copy(src.spaceId)} disabled={busy !== null}>
                  {busy === src.spaceId ? <Loader2 size={14} className="cm-spin" /> : <Copy size={14} />} Copy
                </button>
              </div>
            ))}
          </div>
        )}
    </AppModal>
  );
}

function BinDialog({ courseId, onClose, onRestored }: { courseId: number; onClose: () => void; onRestored: (s: StaffSpace) => void }) {
  const qc = useQueryClient();
  const bin = useQuery({ queryKey: ['materials', 'bin', courseId], queryFn: () => getBin(courseId) });
  const refresh = () => qc.invalidateQueries({ queryKey: ['materials', 'bin', courseId] });
  const restore = async (id: number) => {
    try { onRestored(await restoreMaterial(id)); toast.success('Restored'); refresh(); } catch (e) { toast.error(errMsg(e)); }
  };
  const purge = async (id: number, title: string) => {
    if (!window.confirm(`Delete "${title}" for good? This can't be undone.`)) return;
    try { await purgeMaterial(id); toast.success('Deleted'); refresh(); qc.invalidateQueries({ queryKey: ['materials', 'space', courseId] }); }
    catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <AppModal title="Recycle bin" subtitle="Items are deleted for good 30 days after they were removed." onClose={onClose}>
      {bin.isLoading ? <Spinner />
        : (bin.data ?? []).length === 0 ? <div className="cm-empty"><ArchiveRestore size={28} /><b>The recycle bin is empty</b></div>
        : (
          <div className="cm-files">
            {bin.data!.map(b => (
              <div key={b.id} className="cm-file" style={{ padding: 10, flexWrap: 'wrap' }}>
                <KindIcon kind={b.kind} size={15} />
                <span className="cm-file-name" style={{ whiteSpace: 'normal' }}><b>{b.title}</b><br />
                  <span className="cm-sub">{weekName(b.weekNumber)} · removed {fmtWhen(b.deletedAt)}{b.deletedBy ? ` by ${b.deletedBy}` : ''} · goes {b.purgeOn}</span></span>
                <button type="button" className="cm-btn-ghost cm-btn-sm" onClick={() => restore(b.id)}><ArchiveRestore size={14} /> Restore</button>
                <button type="button" className="cm-btn-danger cm-btn-sm" onClick={() => purge(b.id, b.title)}><Trash2 size={14} /> Delete</button>
              </div>
            ))}
          </div>
        )}
    </AppModal>
  );
}

function ViewsDialog({ item, onClose }: { item: StaffItem; onClose: () => void }) {
  const v = useQuery({ queryKey: ['materials', 'views', item.id], queryFn: () => getViews(item.id) });
  const [show, setShow] = useState<'all' | 'opened' | 'not'>('not');
  const rows = (v.data?.students ?? []).filter(r => show === 'all' || (show === 'opened' ? r.opened : !r.opened));
  return (
    <AppModal title="Who opened it" subtitle={item.title} onClose={onClose}>
      {v.isLoading ? <Spinner /> : v.data && (
        <>
          <p className="cm-help" style={{ marginTop: 0 }}><b>{v.data.opened}</b> of {v.data.rosterSize} students have opened it.</p>
          <div className="cm-filters" role="tablist">
            {([['not', 'Not yet'], ['opened', 'Opened'], ['all', 'Everyone']] as const).map(([k, l]) => (
              <button key={k} type="button" className={`cm-filter${show === k ? ' is-on' : ''}`} onClick={() => setShow(k)}>{l}</button>
            ))}
          </div>
          {rows.length === 0 ? <div className="cm-empty">{show === 'not' ? 'Everyone has opened it.' : 'Nobody yet.'}</div> : (
            <div className="cm-files">
              {rows.map(r => (
                <div key={r.studentId} className="cm-file">
                  <span className="cm-file-name"><b>{r.name}</b> <span className="cm-muted">{r.username}</span></span>
                  <span className="cm-file-size">{r.opened ? `${relative(r.lastAt!)}${r.times > 1 ? ` · ${r.times}×` : ''}` : '—'}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </AppModal>
  );
}
