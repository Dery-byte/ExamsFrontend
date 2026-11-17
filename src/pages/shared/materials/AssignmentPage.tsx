import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  AlertTriangle, ArrowLeft, Bot, CalendarClock, Copy, FileSpreadsheet, Loader2, Lock, MoreHorizontal, Send, Sparkles, Unlock,
} from 'lucide-react';
import AppModal from '../../../components/ui/AppModal';
import {
  aiSuggestAll, cancelAiAll, closeAssignment, errMsg, getRoster, getSheetTargets, releaseMarks, reopenAssignment, sendToSheet,
  type AiProviderKey, type AssignmentRoster, type RosterRow,
} from '../../../api/materials';
import MarkingViewer from './MarkingViewer';
import { Menu, Spinner, Switch, fmtWhen, fromLocalInput, localNowInput, plain, relative, useMaterialsBase, weekName } from './shared';
import { downloadWorkbook, slug } from '../../../utils/spreadsheet';
import { tx } from '../../../utils/terms';
import './materials.css';

type Filter = 'all' | 'tomark' | 'marked' | 'missing' | 'late' | 'same';
/** Work worth a second look: identical file, very similar text, or chatbot phrases. */
const needsLook = (s: RosterRow) => s.sameFileAs.length > 0 || !!s.similarTo || s.chatbotPhrases > 0;

const AI_STAGE: Record<string, string> = { QUEUED: 'AI starting', PREPARING: 'AI getting ready', CONVERTING: 'AI preparing pages', READING: 'AI reading and marking', SAVING: 'AI saving' };

const STATUS: Record<RosterRow['status'], { label: string; cls: string }> = {
  MISSING: { label: 'Not handed in', cls: 'cm-chip-mute' },
  HANDED_IN: { label: 'Handed in', cls: 'cm-chip-info' },
  LATE: { label: 'Handed in late', cls: 'cm-chip-warn' },
  MARKED: { label: 'Marked', cls: 'cm-chip-ok' },
};

/** Staff: everyone's hand-ins for one assignment, marking, AI suggestions, releasing marks. */
export default function AssignmentPage() {
  const { id: idParam } = useParams();
  const id = Number(idParam);
  const base = useMaterialsBase();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const key = ['materials', 'roster', id];
  const q = useQuery({
    queryKey: key, queryFn: () => getRoster(id), enabled: Number.isFinite(id),
    // While the AI works through the class, keep the list fresh
    refetchInterval: d => { const c = (d.state.data as AssignmentRoster | undefined)?.counts; return c && (c.aiQueued || c.aiRunning) ? 3000 : false; },
  });
  const set = (r: AssignmentRoster) => qc.setQueryData(key, r);
  const refresh = () => qc.invalidateQueries({ queryKey: key });
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [marking, setMarking] = useState<number | null>(null);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const r = q.data;
  const rows = useMemo(() => {
    if (!r) return [];
    const t = search.trim().toLowerCase();
    return r.students.filter(s => {
      if (t && !`${s.name} ${s.username}`.toLowerCase().includes(t)) return false;
      switch (filter) {
        case 'tomark': return s.submittedAt != null && s.score == null;
        case 'marked': return s.score != null;
        case 'missing': return s.submittedAt == null && s.score == null;
        case 'late': return s.late;
        case 'same': return needsLook(s);
        default: return true;
      }
    });
  }, [r, filter, search]);

  if (q.isLoading) return <div className="cm-page"><Spinner /></div>;
  if (q.isError || !r) return (
    <div className="cm-page">
      <button type="button" className="cm-back" onClick={() => navigate(-1)}><ArrowLeft size={15} /> Back</button>
      <div className="cm-banner cm-banner-bad"><AlertTriangle size={16} />{errMsg(q.error, 'Could not load this assignment.')}</div>
    </div>
  );
  const a = r.assignment;
  const c = r.counts;
  const sameCount = r.students.filter(needsLook).length;
  const identical = r.students.filter(s => s.sameFileAs.length > 0).length;
  const similarCount = r.students.filter(s => !!s.similarTo).length;
  const chatbotCount = r.students.filter(s => s.chatbotPhrases > 0).length;
  const toMark = r.students.filter(s => s.submittedAt != null && s.score == null).length;
  const configured = r.aiProviders.filter(p => p.configured);

  const closeNow = async () => {
    if (!window.confirm('Close submissions now? Students who haven’t handed in can’t any more (you can reopen later).')) return;
    setBusy(true);
    try { await closeAssignment(id); refresh(); toast.success('Submissions closed'); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const toggleRelease = async (v: boolean) => {
    if (v && !window.confirm(`Release marks? ${c.marked} student${c.marked === 1 ? '' : 's'} will see their mark and feedback and be told.`)) return;
    try { await releaseMarks(id, v); refresh(); toast.success(v ? 'Marks released to students' : 'Marks hidden from students'); }
    catch (e) { toast.error(errMsg(e)); }
  };
  const exportExcel = () => {
    downloadWorkbook(`${slug(a.course.code || a.course.title)}-${slug(a.title)}-marks`, [{
      name: 'Marks',
      rows: r.students.map(s => ({
        Name: s.name, 'ID / username': s.username, Status: STATUS[s.status].label,
        'Handed in': s.submittedAt ? new Date(s.submittedAt).toLocaleString() : '', Late: s.late ? 'Yes' : '',
        [`Mark (out of ${plain(a.maxMarks)})`]: s.score ?? '', 'AI suggestion': s.aiScore ?? '',
        'Same file as': s.sameFileAs.join(', '),
        'Most similar to': s.similarTo ? `${s.similarTo.name} (${s.similarTo.percent}%)` : '',
        'Chatbot phrases': s.chatbotPhrases || '',
        'AI-writing signs (not proof)': s.aiWriting === 'HIGH' ? 'Strong' : s.aiWriting === 'MEDIUM' ? 'Some' : s.aiWriting === 'LOW' ? 'None clear' : '',
      })),
    }]);
  };

  return (
    <div className="cm-page">
      <button type="button" className="cm-back" onClick={() => navigate(`${base}/materials/${a.course.id}`)}><ArrowLeft size={15} /> {a.course.code || a.course.title}</button>

      <div className="cm-card">
        <div className="cm-hero">
          <div className="cm-hero-main">
            <div className="cm-course-code">{weekName(a.weekNumber)} · Assignment</div>
            <h1 className="cm-title" style={{ fontSize: 19 }}>{a.title}</h1>
            <div className="cm-row" style={{ marginTop: 8 }}>
              <span className={`cm-chip ${a.open ? 'cm-chip-ok' : 'cm-chip-mute'}`}>{a.open ? <Unlock size={12} /> : <Lock size={12} />}
                {a.open ? (a.reopened ? `Reopened until ${fmtWhen(a.closesAt)}` : `Open until ${fmtWhen(a.closesAt)}`) : `Closed ${a.closesAt ? fmtWhen(a.closesAt) : ''}`}</span>
              <span className="cm-chip cm-chip-mute"><CalendarClock size={12} /> Due {fmtWhen(a.dueAt)}</span>
              <span className="cm-chip cm-chip-mute">Out of {plain(a.maxMarks)}</span>
              {a.visibility === 'DRAFT' && <span className="cm-chip cm-chip-warn">Draft: students can't see it</span>}
            </div>
          </div>
          <div className="cm-hero-actions">
            {a.open
              ? <button type="button" className="cm-btn-ghost" onClick={closeNow} disabled={busy}><Lock size={15} /> Close now</button>
              : <button type="button" className="cm-btn" onClick={() => setReopenOpen(true)}><Unlock size={15} /> Reopen</button>}
            <Menu label="More actions">
              {close => <>
                {a.open && <button type="button" onClick={() => { close(); setReopenOpen(true); }}><CalendarClock size={15} /> Change closing date</button>}
                <button type="button" onClick={() => { close(); setSheetOpen(true); }}><Send size={15} /> {tx('Send marks to a Marks Sheet')}</button>
                <button type="button" onClick={() => { close(); exportExcel(); }}><FileSpreadsheet size={15} /> Download marks (Excel)</button>
              </>}
            </Menu>
          </div>
        </div>
        <div className="cm-stats">
          <div className="cm-stat"><b>{c.handedIn}/{c.students}</b><span>Handed in</span></div>
          <div className="cm-stat"><b>{toMark}</b><span>To mark</span></div>
          <div className="cm-stat"><b>{c.marked}</b><span>Marked</span></div>
          <div className="cm-stat"><b>{c.late}</b><span>Late</span></div>
        </div>
        <div className="cm-row" style={{ marginTop: 14 }}>
          <Switch checked={a.marksReleased} onChange={toggleRelease} label="Students see their marks and feedback" />
          <span className="cm-spacer" />
          {c.aiQueued > 0 ? (
            <button type="button" className="cm-btn-ghost cm-btn-sm" onClick={async () => { try { set(await cancelAiAll(id)); } catch (e) { toast.error(errMsg(e)); } }}>
              <Loader2 size={14} className="cm-spin" /> AI is working through the class: {c.aiQueued} left{(() => { const now = r.students.find(x => x.aiStage); return now ? ` · now ${now.name}` : ''; })()} · Stop
            </button>
          ) : toMark > 0 && (
            <button type="button" className="cm-btn cm-ai-btn cm-btn-sm" onClick={() => setAiOpen(true)} disabled={configured.length === 0}
              title={configured.length === 0 ? 'No AI is set up on this server' : undefined}>
              <Sparkles size={14} /> AI-suggest marks for all {toMark}
            </button>
          )}
        </div>
      </div>

      {sameCount > 0 && (
        <div className="cm-banner cm-banner-warn"><Copy size={16} />
          <span>{[identical ? `${identical} handed in exactly the same file as a classmate` : '',
            similarCount ? `${similarCount} ${similarCount === 1 ? 'has' : 'have'} work very similar to a classmate's` : '',
            chatbotCount ? `${chatbotCount} ${chatbotCount === 1 ? 'has' : 'have'} phrases chatbots write` : ''].filter(Boolean).join('; ')}.{' '}
            <button type="button" className="cm-chip cm-chip-warn" onClick={() => setFilter('same')}>Show them</button></span>
        </div>
      )}

      <div className="cm-search"><input className="cm-input" style={{ paddingLeft: 12 }} value={search} onChange={e => setSearch(e.target.value)} placeholder={tx('Search students')} aria-label={tx('Search students')} /></div>
      <div className="cm-filters" role="tablist" aria-label="Show">
        {([['all', `All ${r.students.length}`], ['tomark', `To mark ${toMark}`], ['marked', `Marked ${c.marked}`],
          ['missing', `Not handed in ${r.students.filter(s => s.submittedAt == null && s.score == null).length}`], ['late', `Late ${c.late}`],
          ...(sameCount ? [['same', `Worth a look ${sameCount}`]] : [])] as [Filter, string][]).map(([k, l]) => (
          <button key={k} type="button" className={`cm-filter${filter === k ? ' is-on' : ''}`} onClick={() => setFilter(k)}>{l}</button>
        ))}
      </div>

      {rows.length === 0 ? <div className="cm-card cm-empty">Nobody here.</div> : (
        <div className="cm-roster">
          {rows.map(s => (
            <button key={s.studentId} type="button" className="cm-rrow" onClick={() => setMarking(s.studentId)}>
              <span style={{ minWidth: 0 }}>
                <span className="cm-rrow-name" style={{ display: 'block' }}>{s.name}</span>
                <span className="cm-rrow-sub">{s.username}{s.submittedAt ? ` · ${relative(s.submittedAt)}` : ''}{s.files ? ` · ${s.files} file${s.files === 1 ? '' : 's'}` : ''}{s.typed ? ' · typed answer' : ''}</span>
              </span>
              <span className="cm-rrow-tags">
                <span className={`cm-chip ${STATUS[s.status].cls}`}>{STATUS[s.status].label}</span>
                {s.aiStage ? <span className="cm-chip cm-chip-ai"><Loader2 size={11} className="cm-spin" /> {AI_STAGE[s.aiStage]}</span>
                  : s.aiQueued && <span className="cm-chip cm-chip-info">Waiting for AI</span>}
                {s.aiError && !s.aiQueued && s.score == null && <span className="cm-chip cm-chip-bad" title={s.aiError}>AI failed</span>}
                {s.sameFileAs.length > 0 && <span className="cm-chip cm-chip-warn" title={`Same file as ${s.sameFileAs.join(', ')}`}><Copy size={11} /> Same file</span>}
                {s.similarTo && <span className={`cm-chip ${s.similarTo.percent >= 70 ? 'cm-chip-bad' : 'cm-chip-warn'}`} title={`${s.similarTo.percent}% of this work also appears in ${s.similarTo.name}'s`}>
                  <Copy size={11} /> {s.similarTo.percent}% like {s.similarTo.name}</span>}
                {s.chatbotPhrases > 0 && <span className="cm-chip cm-chip-bad" title="Contains phrases chatbots write"><Bot size={11} /> Chatbot phrases</span>}
                {s.aiWriting && s.aiWriting !== 'LOW' && <span className={`cm-chip ${s.aiWriting === 'HIGH' ? 'cm-chip-bad' : 'cm-chip-warn'}`} title="The AI's view, not proof">
                  <Bot size={11} /> {s.aiWriting === 'HIGH' ? 'Strong AI-writing signs' : 'Some AI-writing signs'}</span>}
              </span>
              <span className="cm-rrow-score">
                {s.score != null ? `${plain(s.score)}/${plain(a.maxMarks)}` : s.submittedAt ? <MoreHorizontal size={18} color="#94a3b8" aria-label="Not marked" /> : '—'}
                {s.score == null && s.aiScore != null && <small>AI {plain(s.aiScore)}</small>}
              </span>
            </button>
          ))}
        </div>
      )}

      {marking != null && (
        <MarkingViewer assignmentId={id} studentIds={rows.map(s => s.studentId)} startStudentId={marking}
          providers={r.aiProviders} defaultProvider={a.aiProvider}
          onChanged={refresh} onClose={() => { setMarking(null); refresh(); }} />
      )}
      {reopenOpen && <ReopenDialog id={id} current={a.closesAt} open={a.open} onClose={() => setReopenOpen(false)} onSaved={refresh} />}
      {sheetOpen && <SheetDialog id={id} maxMarks={a.maxMarks} marked={c.marked} onClose={() => setSheetOpen(false)} />}
      {aiOpen && (
        <AppModal title="AI-suggest marks" subtitle={`${toMark} handed-in, unmarked`} onClose={() => setAiOpen(false)}>
          <AiAllForm providers={configured} defaultProvider={a.aiProvider} hasGuide={!!a.markingGuide}
            onStart={async p => {
              try { const res = await aiSuggestAll(id, p); set(res); toast.success(`${res.queued ?? 0} queued: suggestions appear as they come`); setAiOpen(false); }
              catch (e) { toast.error(errMsg(e)); }
            }} />
        </AppModal>
      )}
    </div>
  );
}

function AiAllForm({ providers, defaultProvider, hasGuide, onStart }: {
  providers: AssignmentRoster['aiProviders']; defaultProvider: AiProviderKey | null; hasGuide: boolean; onStart: (p: AiProviderKey) => Promise<void>;
}) {
  const [p, setP] = useState<AiProviderKey>(providers.find(x => x.key === defaultProvider)?.key ?? providers[0]?.key);
  const [busy, setBusy] = useState(false);
  return (
    <div className="cm-grid">
      <p className="cm-help" style={{ margin: 0 }}>The AI reads each student's work one after another and suggests a mark and feedback. <b>Nothing is saved as a mark</b> until you open the work and accept or change the suggestion. You can leave this page; it carries on.</p>
      {!hasGuide && <div className="cm-banner cm-banner-warn" style={{ margin: 0 }}><AlertTriangle size={16} />There is no marking guide on this assignment. Add one (edit the assignment) for closer suggestions.</div>}
      <label className="cm-field">AI
        <select className="cm-select" value={p} onChange={e => setP(e.target.value as AiProviderKey)}>
          {providers.map(x => <option key={x.key} value={x.key}>{x.label}{x.readsScans ? ' · reads scans and photos' : ' · typed text only'}</option>)}
        </select>
      </label>
      <button type="button" className="cm-btn cm-ai-btn" disabled={busy || !p} onClick={async () => { setBusy(true); try { await onStart(p); } finally { setBusy(false); } }}>
        {busy ? <Loader2 size={15} className="cm-spin" /> : <Sparkles size={15} />} Start
      </button>
    </div>
  );
}

function ReopenDialog({ id, current, open, onClose, onSaved }: { id: number; current: string | null; open: boolean; onClose: () => void; onSaved: () => void }) {
  const [when, setWhen] = useState(localNowInput(3 * 24 * 60).slice(0, 11) + '23:59');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    const v = fromLocalInput(when);
    if (!v || new Date(v).getTime() <= Date.now()) { toast.error('Choose a closing date in the future'); return; }
    setBusy(true);
    try { await reopenAssignment(id, v); toast.success(`Open until ${fmtWhen(v)}`); onSaved(); onClose(); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <AppModal title={open ? 'Change the closing date' : 'Reopen submissions'} subtitle={current ? `${open ? 'Closes' : 'Closed'} ${fmtWhen(current)}` : undefined} onClose={onClose}
      footer={<><button type="button" className="cm-btn-ghost" onClick={onClose}>Cancel</button>
        <button type="button" className="cm-btn" onClick={save} disabled={busy}>{busy && <Loader2 size={15} className="cm-spin" />} {open ? 'Save' : 'Reopen'}</button></>}>
      <div className="cm-grid">
        <label className="cm-field">New closing date and time
          <input className="cm-input" type="datetime-local" min={localNowInput(1)} value={when} onChange={e => setWhen(e.target.value)} />
        </label>
        <p className="cm-help" style={{ margin: 0 }}>Work handed in after the due date is marked <b>late</b>. Students who haven't handed in are told it has reopened.</p>
      </div>
    </AppModal>
  );
}

function SheetDialog({ id, maxMarks, marked, onClose }: { id: number; maxMarks: number; marked: number; onClose: () => void }) {
  const sheets = useQuery({ queryKey: ['materials', 'sheets', id], queryFn: () => getSheetTargets(id) });
  const [sheetId, setSheetId] = useState<number | null>(null);
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [scale, setScale] = useState(true);
  const [busy, setBusy] = useState(false);
  const usable = (sheets.data ?? []).filter(s => !s.locked && s.sections.length > 0);
  const sheet = usable.find(s => s.sheetId === sheetId) ?? usable[0];
  const section = sheet?.sections.find(s => s.id === sectionId) ?? sheet?.sections[0];
  const send = async () => {
    if (!sheet || !section) return;
    if (!window.confirm(`Put ${marked} mark${marked === 1 ? '' : 's'} into "${section.name}"? Marks already in that column for these students are replaced.`)) return;
    setBusy(true);
    try { const res = await sendToSheet(id, sheet.sheetId, section.id, scale); toast.success(res.message); onClose(); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <AppModal title={tx('Send marks to a Marks Sheet')} onClose={onClose}
      footer={<><button type="button" className="cm-btn-ghost" onClick={onClose}>Cancel</button>
        <button type="button" className="cm-btn" onClick={send} disabled={busy || !section || marked === 0}>{busy && <Loader2 size={15} className="cm-spin" />} Send</button></>}>
      {sheets.isLoading ? <Spinner /> : usable.length === 0 ? (
        <div className="cm-empty"><b>{tx('No open Marks Sheet takes this course')}</b>{tx('Marks Sheets that are submitted or published can’t be changed, and the sheet needs at least one column.')}</div>
      ) : (
        <div className="cm-grid">
          <label className="cm-field">{tx('Marks Sheet')}
            <select className="cm-select" value={sheet?.sheetId} onChange={e => { setSheetId(Number(e.target.value)); setSectionId(null); }}>
              {usable.map(s => <option key={s.sheetId} value={s.sheetId}>{tx(s.label)}</option>)}
            </select>
          </label>
          <label className="cm-field">Column
            <select className="cm-select" value={section?.id} onChange={e => setSectionId(Number(e.target.value))}>
              {sheet?.sections.map(s => <option key={s.id} value={s.id}>{s.name} (out of {plain(s.maxScore)})</option>)}
            </select>
          </label>
          {section && (
            <label className="cm-check"><input type="checkbox" checked={scale} onChange={e => setScale(e.target.checked)} />
              <span>Scale to the column<small>{scale
                ? `A mark of ${plain(maxMarks)}/${plain(maxMarks)} becomes ${plain(section.maxScore)}/${plain(section.maxScore)}`
                : `Marks go in as they are (capped at ${plain(section.maxScore)})`}</small></span></label>
          )}
        </div>
      )}
    </AppModal>
  );
}
