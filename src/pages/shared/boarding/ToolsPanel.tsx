import { useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CalendarClock, CheckCircle2, FileSpreadsheet, Info, Loader2, Play, Sparkles, Upload, Wand2, XCircle } from 'lucide-react';
import AppModal from '../../../components/ui/AppModal';
import {
  checkBoardingImport, clearRooms, getAwaiting, getBoardingSettings, previewAutoAllocate, previewClearRooms, runAutoAllocate, runBoardingImport,
  type AutoRequest, type AutoResult, type BoardingImportType, type ClearResult, type HostelCard, type ImportResult,
} from '../../../api/boarding';
import { downloadWorkbook, readRows } from '../../../utils/spreadsheet';
import { Avatar, errMsg, levelText } from './shared';
import { tx, isSchoolMode, showLevelPicker } from '../../../utils/terms';

/** Bulk work for boarding staff: spreadsheet imports, auto-allocation and the new academic year. */
export default function ToolsPanel({ head, hostels, word, plural }: { head: boolean; hostels: HostelCard[]; word: string; plural: string }) {
  const [open, setOpen] = useState<null | 'import' | 'rooms' | 'auto' | 'clear'>(null);
  const mine = hostels.filter(h => h.canManage && h.active);
  const cards = [
    { key: 'auto' as const, Icon: Wand2, title: 'Auto-allocate rooms', show: true,
      text: `Give every boarder waiting for a room a bed in the ${plural.toLowerCase()} you choose: fill rooms one by one or spread evenly, keep levels together or mix classmates. You see the plan before anything is saved.` },
    { key: 'import' as const, Icon: Upload, title: 'Import a room list', show: true,
      text: `Who sleeps where, from Excel or CSV: Student ID, ${word}, Block, Room, Bed. Students who already have a room are moved; the file can swap people.` },
    { key: 'rooms' as const, Icon: FileSpreadsheet, title: 'Import rooms', show: head,
      text: `The rooms themselves: ${word}, Block, Floor, Room, Beds (and who they are for, a label and levels). The ${word.toLowerCase()} and its blocks must exist.` },
    { key: 'clear' as const, Icon: CalendarClock, title: 'New academic year', show: head,
      text: 'Take students out of their rooms (everyone, or one house / level) so rooms can be given out again. Their history is kept and they wait for a room.' },
  ].filter(c => c.show);

  return (
    <>
      <div className="bd-hostels">
        {cards.map(c => (
          <div key={c.key} className="bd-card" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h3 className="bd-card-title"><c.Icon size={18} /> {c.title}</h3>
            <p className="bd-sub" style={{ margin: 0, flex: 1 }}>{c.text}</p>
            <button type="button" className="bd-btn" style={{ alignSelf: 'flex-start' }} onClick={() => setOpen(c.key)} disabled={mine.length === 0 && c.key !== 'rooms'}>
              <Play size={15} /> Open
            </button>
          </div>
        ))}
      </div>
      {mine.length === 0 && <div className="bd-alert is-info" style={{ marginTop: 12 }}>You don't look after any {word.toLowerCase()} yet.</div>}
      {(open === 'import' || open === 'rooms') && <ImportDialog type={open === 'import' ? 'allocations' : 'rooms'} word={word} onClose={() => setOpen(null)} />}
      {open === 'auto' && <AutoDialog hostels={mine} plural={plural} onClose={() => setOpen(null)} />}
      {open === 'clear' && <ClearDialog hostels={mine} word={word} onClose={() => setOpen(null)} />}
    </>
  );
}

// ── Spreadsheet imports ────────────────────────────────────────────────────

function ImportDialog({ type, word, onClose }: { type: BoardingImportType; word: string; onClose: () => void }) {
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const columns = type === 'allocations'
    ? ['Student ID', word, 'Block', 'Room', 'Bed']
    : [word, 'Block', 'Floor', 'Room', 'Beds', 'For', 'Label', 'Levels'];
  const example = type === 'allocations'
    ? ['PS/24/0001', 'Aggrey House', '', '14', '3']
    : ['Aggrey House', 'Block B', 'First floor', '101', '8', 'Boys', '', ''];

  const onFile = async (file?: File) => {
    if (!file) return;
    if (!/\.(csv|xlsx|xls)$/i.test(file.name)) { toast.error('Choose a .csv, .xlsx or .xls file'); return; }
    setBusy(true);
    try {
      const data = await readRows(file);
      if (!data.length) { toast.error('No data rows found in that file'); return; }
      setFileName(file.name);
      setRows(data);
      setResult(await checkBoardingImport(type, data));
    } catch (e) { toast.error(errMsg(e, 'That file could not be read')); setResult(null); }
    finally { setBusy(false); }
  };

  const commit = async () => {
    if (!result) return;
    const skipped = result.total - result.valid;
    if (!window.confirm(`Import ${result.valid} row${result.valid === 1 ? '' : 's'}?${skipped ? ` ${skipped} with problems will be skipped.` : ''}`)) return;
    setBusy(true);
    try {
      const r = await runBoardingImport(type, rows);
      setResult(r);
      toast.success(type === 'allocations' ? `${r.created} student${r.created === 1 ? '' : 's'} given a room` : `${r.created} room${r.created === 1 ? '' : 's'} added`);
      qc.invalidateQueries({ queryKey: ['boarding'] });
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const problems = (result?.rows ?? []).filter(r => !r.ok);
  return (
    <AppModal title={type === 'allocations' ? 'Import a room list' : 'Import rooms'} size="lg" onClose={onClose}
      subtitle={`Columns: ${columns.join(', ')}. The first row must be the headings.`}
      footer={
        <div className="bd-row" style={{ width: '100%' }}>
          <button type="button" className="bd-btn-ghost" onClick={() => downloadWorkbook(`${type === 'allocations' ? 'room-list' : 'rooms'}-template`, [{ name: 'Template', rows: [columns, example] }])}>
            <FileSpreadsheet size={15} /> Template
          </button>
          <span className="bd-spacer" />
          <button type="button" className="bd-btn-ghost" onClick={onClose} disabled={busy}>Close</button>
          {result && !result.committed && result.valid > 0 && (
            <button type="button" className="bd-btn" onClick={commit} disabled={busy}>{busy ? <Loader2 size={15} className="bd-spin" /> : <Upload size={15} />} Import {result.valid}</button>
          )}
        </div>
      }>
      <button type="button" className="bd-drop" onClick={() => input.current?.click()} disabled={busy}
        onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); onFile(e.dataTransfer.files?.[0]); }}>
        {busy ? <Loader2 size={22} className="bd-spin" /> : <Upload size={22} />}
        <strong>{fileName || 'Choose or drop a CSV / Excel file'}</strong>
        <span>{rows.length ? `${rows.length} row(s) read` : 'Nothing is saved until you press Import'}</span>
      </button>
      <input ref={input} type="file" accept=".csv,.xlsx,.xls" hidden onChange={e => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
      {type === 'allocations' && !result && (
        <p className="bd-sub">{word} = its name or code. Block can be left empty when the room name is unique. Bed is optional. {tx('Students')} who are recorded as day students become boarders.</p>
      )}
      {type === 'rooms' && !result && (
        <p className="bd-sub">Floor: Ground, First floor, 2nd … (empty = ground floor). For: Boys, Girls or Mixed (empty = as the building). Levels: e.g. 1, 2 (empty = any).</p>
      )}

      {result && (
        <>
          <div className="bd-stats" style={{ margin: '14px 0' }}>
            <div className="bd-stat"><b>{result.total}</b><span>Rows</span></div>
            <div className="bd-stat"><b>{result.valid}</b><span>Ready</span></div>
            <div className={`bd-stat${problems.length ? ' is-warn' : ''}`}><b>{problems.length}</b><span>With problems</span></div>
            <div className="bd-stat"><b>{result.committed ? result.created : '—'}</b><span>{result.committed ? 'Imported' : 'Not imported yet'}</span></div>
          </div>
          {result.committed && <div className="bd-alert is-ok"><CheckCircle2 size={16} /><span>Done. Rows with problems were skipped; fix them and import those rows again.</span></div>}
          {problems.length > 0 && (
            <>
              <div className="bd-section-title">Problems</div>
              <div className="bd-list">
                {problems.map(r => (
                  <div key={r.row} className="bd-item" style={{ alignItems: 'flex-start' }}>
                    <span className="bd-chip">Row {r.row}</span>
                    <div className="bd-item-text">
                      <div className="bd-name" style={{ fontSize: 13 }}>{r.summary || '—'}</div>
                      {r.errors.map((e, i) => <div key={i} className="bd-sub" style={{ color: '#b42318' }}><XCircle size={12} style={{ verticalAlign: -2 }} /> {e}</div>)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {!result.committed && result.valid > 0 && (
            <>
              <div className="bd-section-title">Ready ({result.valid})</div>
              <div className="bd-preview" style={{ maxHeight: 180 }}>
                {result.rows.filter(r => r.ok).slice(0, 200).map(r => <span key={r.row} className="bd-chip">{r.summary}</span>)}
              </div>
            </>
          )}
        </>
      )}
    </AppModal>
  );
}

// ── Auto-allocate ──────────────────────────────────────────────────────────

const ARRANGE: { value: AutoRequest['arrange']; label: string; hint: string }[] = [
  { value: 'ANY', label: 'Any order', hint: 'Rooms are filled in the order students are listed.' },
  // Schools: a class is one year, so "levels" say nothing there
  ...(isSchoolMode() ? [] : [
    { value: 'SAME_LEVEL' as const, label: tx('Keep each level together'), hint: tx('A room holds students of one level where it can (e.g. a Level 1 room).') },
    { value: 'MIX_LEVELS' as const, label: tx('Mix levels'), hint: tx('Students of different levels share rooms (seniors with juniors).') },
  ]),
  { value: 'MIX_PROGRAMMES', label: tx('Mix programmes'), hint: tx('Classmates from the same programme are spread across rooms.') },
];

function AutoDialog({ hostels, plural, onClose }: { hostels: HostelCard[]; plural: string; onClose: () => void }) {
  const qc = useQueryClient();
  const waiting = useQuery({ queryKey: ['boarding', 'awaiting', {}], queryFn: () => getAwaiting({}) });
  const [req, setReq] = useState<AutoRequest>({ hostelIds: [], gender: '', levels: [], programIds: [], order: 'FILL', arrange: 'ANY', numberBeds: true });
  const schoolSettings = useQuery({ queryKey: ['boarding', 'settings'], queryFn: getBoardingSettings, enabled: isSchoolMode() });
  const [plan, setPlan] = useState<AutoResult | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof AutoRequest>(k: K, v: AutoRequest[K]) => { setReq(r => ({ ...r, [k]: v })); setPlan(null); };
  const toggle = <T,>(list: T[], v: T) => list.includes(v) ? list.filter(x => x !== v) : [...list, v];

  const preview = async () => {
    setBusy(true);
    try { setPlan(await previewAutoAllocate(req)); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const run = async () => {
    if (!plan || !window.confirm(`Give ${plan.placed.length} student${plan.placed.length === 1 ? '' : 's'} a room now?`)) return;
    setBusy(true);
    try {
      const r = await runAutoAllocate(req);
      setPlan(r);
      toast.success(r.message ?? 'Rooms given');
      qc.invalidateQueries({ queryKey: ['boarding'] });
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const unplacedReasons = useMemo(() => {
    const m = new Map<string, number>();
    (plan?.unplaced ?? []).forEach(u => m.set(u.reason, (m.get(u.reason) ?? 0) + 1));
    return [...m.entries()];
  }, [plan]);

  return (
    <AppModal title="Auto-allocate rooms" size="lg" onClose={onClose}
      subtitle={waiting.data ? `${waiting.data.total} boarder${waiting.data.total === 1 ? ' is' : 's are'} waiting for a room.` : undefined}
      footer={
        <div className="bd-row" style={{ width: '100%' }}>
          {plan && !plan.committed && <span className="bd-sub" style={{ margin: 0 }}>{plan.placed.length} would get a room</span>}
          <span className="bd-spacer" />
          <button type="button" className="bd-btn-ghost" onClick={onClose} disabled={busy}>Close</button>
          {(!plan || plan.committed) ? (
            <button type="button" className="bd-btn" onClick={preview} disabled={busy || plan?.committed}>{busy ? <Loader2 size={15} className="bd-spin" /> : <Sparkles size={15} />} Preview</button>
          ) : (
            <button type="button" className="bd-btn" onClick={run} disabled={busy || plan.placed.length === 0}>{busy ? <Loader2 size={15} className="bd-spin" /> : <Wand2 size={15} />} Give {plan.placed.length} rooms</button>
          )}
        </div>
      }>
      <div className="bd-sheet">
        <div className="bd-section-title" style={{ marginTop: 0 }}>{plural} <span style={{ textTransform: 'none', fontWeight: 600 }}>· none chosen = all you look after</span></div>
        <div className="bd-chips" style={{ flexWrap: 'wrap' }}>
          {hostels.map(h => (
            <button key={h.id} type="button" className={`bd-chip-btn${req.hostelIds.includes(h.id) ? ' is-on' : ''}`} onClick={() => set('hostelIds', toggle(req.hostelIds, h.id))}>
              {h.name} <small>{h.free} free</small>
            </button>
          ))}
        </div>
        <div className="bd-section-title">Who</div>
        <div className="bd-form">
          <label className="bd-field">Gender
            <select className="bd-select" value={req.gender} onChange={e => set('gender', e.target.value as AutoRequest['gender'])}>
              <option value="">Boys and girls</option><option value="MALE">Boys</option><option value="FEMALE">Girls</option><option value="NONE">Gender not recorded</option>
            </select>
          </label>
          {(waiting.data?.programmes.length ?? 0) > 1 && (
            <label className="bd-field">{tx('Programme')}
              <select className="bd-select" value={req.programIds[0] ?? ''} onChange={e => set('programIds', e.target.value ? [Number(e.target.value)] : [])}>
                <option value="">{tx('Every programme')}</option>
                {waiting.data!.programmes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
          )}
        </div>
        {(waiting.data?.levels.length ?? 0) > 0 && showLevelPicker(waiting.data!.levels.length) && (
          <div className="bd-chips" style={{ flexWrap: 'wrap', marginTop: 10 }}>
            <button type="button" className={`bd-chip-btn${req.levels.length === 0 ? ' is-on' : ''}`} onClick={() => set('levels', [])}>{tx('Every level')}</button>
            {waiting.data!.levels.map(l => (
              <button key={l} type="button" className={`bd-chip-btn${req.levels.includes(l) ? ' is-on' : ''}`} onClick={() => set('levels', toggle(req.levels, l))}>{levelText(l)}</button>
            ))}
          </div>
        )}
        <div className="bd-section-title">How</div>
        <div className="bd-seg" role="radiogroup" style={{ marginBottom: 10 }}>
          <button type="button" role="radio" aria-checked={req.order === 'FILL'} className={req.order === 'FILL' ? 'is-on' : ''} onClick={() => set('order', 'FILL')}>Fill rooms one by one</button>
          <button type="button" role="radio" aria-checked={req.order === 'SPREAD'} className={req.order === 'SPREAD' ? 'is-on' : ''} onClick={() => set('order', 'SPREAD')}>Spread evenly</button>
        </div>
        <div className="bd-list">
          {isSchoolMode() ? (
            // Schools: the Super Admin's boarding setting decides (Settings › Classmates in rooms)
            <div className="bd-alert is-info" style={{ margin: '2px 0 6px' }}><Info size={16} />
              <span>{schoolSettings.data?.classmates === 'MIXED'
                ? <>Classes are <b>mixed</b>: classmates are spread across rooms.</>
                : <>Classmates are <b>kept together</b>: students of the same class share rooms where they can.</>}
                {' '}The Super Admin sets this in boarding Settings.</span>
            </div>
          ) : ARRANGE.map(a => (
            <label key={a.value} className="bd-check" style={{ padding: '6px 2px' }}>
              <input type="radio" name="arrange" checked={req.arrange === a.value} onChange={() => set('arrange', a.value)} />
              <span>{a.label} <small>{a.hint}</small></span>
            </label>
          ))}
          <label className="bd-check" style={{ padding: '6px 2px' }}>
            <input type="checkbox" checked={req.numberBeds} onChange={e => set('numberBeds', e.target.checked)} />
            <span>Give bed numbers <small>Each student gets the lowest free bed number in their room.</small></span>
          </label>
        </div>

        {plan && (
          <>
            <div className="bd-section-title">{plan.committed ? 'Done' : 'Plan'}</div>
            {plan.committed && plan.message && <div className="bd-alert is-ok"><CheckCircle2 size={16} /><span>{plan.message}</span></div>}
            <div className="bd-stats">
              <div className="bd-stat"><b>{plan.students}</b><span>Chosen</span></div>
              <div className="bd-stat"><b>{plan.placed.length}</b><span>{plan.committed ? 'Given a room' : 'Get a room'}</span></div>
              <div className={`bd-stat${plan.unplaced.length ? ' is-warn' : ''}`}><b>{plan.unplaced.length}</b><span>Still waiting</span></div>
              <div className="bd-stat"><b>{plan.freeBedsLeft}</b><span>Free beds left</span></div>
            </div>
            {plan.perHouse.length > 0 && <div className="bd-row">{plan.perHouse.map(p => <span key={p.house} className="bd-pill is-brand">{p.house}: {p.count}</span>)}</div>}
            {unplacedReasons.length > 0 && (
              <div className="bd-alert is-warn" style={{ marginTop: 10 }}><XCircle size={16} />
                <span>{unplacedReasons.map(([r, n]) => `${n} × ${r}`).join(' ')}</span></div>
            )}
            {plan.placed.length > 0 && (
              <div className="bd-list" style={{ marginTop: 10 }}>
                {plan.placed.slice(0, 60).map(p => (
                  <div key={p.id} className="bd-item" style={{ padding: '8px 10px' }}>
                    <div className="bd-item-main">
                      <Avatar name={p.name} photo={p.photo} size="sm" />
                      <div className="bd-item-text">
                        <div className="bd-name" style={{ fontSize: 13 }}>{p.name} {levelText(p.level) && <span className="bd-muted" style={{ fontWeight: 600 }}>· {levelText(p.level)}</span>}</div>
                        <div className="bd-sub" style={{ marginTop: 0 }}>{p.place.short}</div>
                      </div>
                    </div>
                  </div>
                ))}
                {plan.placed.length > 60 && <div className="bd-sub" style={{ textAlign: 'center' }}>… and {plan.placed.length - 60} more</div>}
              </div>
            )}
          </>
        )}
      </div>
    </AppModal>
  );
}

// ── New academic year ──────────────────────────────────────────────────────

function ClearDialog({ hostels, word, onClose }: { hostels: HostelCard[]; word: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [hostelId, setHostelId] = useState('');
  const [level, setLevel] = useState('');
  const [note, setNote] = useState('');
  const [result, setResult] = useState<ClearResult | null>(null);
  const [busy, setBusy] = useState(false);
  const req = { hostelId: hostelId ? Number(hostelId) : null, level: level ? Number(level) : null, note: note || null };

  const preview = async () => {
    setBusy(true);
    try { setResult(await previewClearRooms(req)); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const run = async () => {
    if (!result || !window.confirm(`Take ${result.count} student${result.count === 1 ? '' : 's'} out of their rooms? They will wait for a room again; their history is kept.`)) return;
    setBusy(true);
    try {
      const r = await clearRooms(req);
      setResult(r);
      toast.success(r.message ?? 'Done');
      qc.invalidateQueries({ queryKey: ['boarding'] });
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <AppModal title="New academic year" onClose={onClose}
      subtitle="Take students out of their rooms before giving rooms out again. Students who keep their rooms need nothing done."
      footer={
        <div className="bd-row" style={{ width: '100%' }}>
          <span className="bd-spacer" />
          <button type="button" className="bd-btn-ghost" onClick={onClose} disabled={busy}>Close</button>
          {!result || result.committed ? (
            <button type="button" className="bd-btn" onClick={preview} disabled={busy || !!result?.committed}>{busy ? <Loader2 size={15} className="bd-spin" /> : <Sparkles size={15} />} Preview</button>
          ) : (
            <button type="button" className="bd-btn-danger" onClick={run} disabled={busy || result.count === 0}>{busy ? <Loader2 size={15} className="bd-spin" /> : <CalendarClock size={15} />} Clear {result.count}</button>
          )}
        </div>
      }>
      <div className="bd-form">
        <label className="bd-field">{word}
          <select className="bd-select" value={hostelId} onChange={e => { setHostelId(e.target.value); setResult(null); }}>
            <option value="">Every {word.toLowerCase()}</option>
            {hostels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </label>
        {!isSchoolMode() && <label className="bd-field">{tx('Level')} <small>{tx('e.g. only the final-year students. Blank = every level.')}</small>
          <input className="bd-input" type="number" inputMode="numeric" value={level} onChange={e => { setLevel(e.target.value); setResult(null); }} />
        </label>}
        <label className="bd-field bd-wide">Note <small>Optional, kept with each student's room history</small>
          <input className="bd-input" value={note} onChange={e => setNote(e.target.value)} maxLength={200} placeholder="e.g. End of 2025/2026" />
        </label>
      </div>
      {result && (
        <div className={`bd-alert ${result.committed ? 'is-ok' : 'is-warn'}`} style={{ marginTop: 14 }}>
          <CalendarClock size={16} />
          <span>{result.committed ? result.message
            : `${result.count} student${result.count === 1 ? '' : 's'} would leave their rooms${result.perHouse.length ? `: ${result.perHouse.map(p => `${p.house} ${p.count}`).join(', ')}` : ''}.`}</span>
        </div>
      )}
    </AppModal>
  );
}
