import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { BedDouble, CheckCircle2, Info, Loader2, Plus, Save, Search, Trash2, UserCog, Wand2 } from 'lucide-react';
import {
  addBoardingStaff, assignRoom, findStaffCandidates, getAwaiting, getBoardingSettings, getBoardingStaff, removeBoardingStaff,
  saveBoardingSettings, type HostelCard, type StudentBrief,
} from '../../../api/boarding';
import { useBoarding } from '../../../hooks/useFeatureFlags';
import PlacePicker from './PlacePicker';
import { Avatar, errMsg, genderLabel, levelText } from './shared';
import { tx, showLevelPicker, isSchoolMode } from '../../../utils/terms';
import { useAuth } from '../../../contexts/AuthContext';

// ── Boarders waiting for a room ────────────────────────────────────────────

export function AwaitingPanel({ onOpen, onAuto }: { onOpen: (id: number) => void; onAuto?: () => void }) {
  const qc = useQueryClient();
  const [gender, setGender] = useState('');
  const [level, setLevel] = useState('');
  const [programId, setProgramId] = useState('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [giving, setGiving] = useState<StudentBrief | null>(null);
  useEffect(() => { const t = setTimeout(() => setDebounced(search.trim()), 250); return () => clearTimeout(t); }, [search]);

  const params = { gender: gender || undefined, level: level ? Number(level) : undefined, programId: programId ? Number(programId) : undefined, q: debounced || undefined };
  const q = useQuery({ queryKey: ['boarding', 'awaiting', params], queryFn: () => getAwaiting(params), placeholderData: prev => prev });
  const d = q.data;
  const filtering = !!(gender || level || programId || debounced);

  return (
    <div className="bd-card">
      <div className="bd-card-head">
        <div style={{ minWidth: 0 }}>
          <h3 className="bd-card-title"><BedDouble size={18} /> Waiting for a room</h3>
          <div className="bd-sub">Active boarders with no room yet{d ? `: ${filtering ? `${d.matching} of ${d.total}` : d.total}` : ''}. Students who leave a room come back here.</div>
        </div>
        {onAuto && (d?.total ?? 0) > 0 && <button type="button" className="bd-btn-ghost bd-btn-sm" onClick={onAuto}><Wand2 size={14} /> Auto-allocate</button>}
      </div>
      <div className="bd-form" style={{ marginBottom: 12 }}>
        <div className="bd-find-box bd-wide">
          <Search size={16} className="bd-find-icon" />
          <input className="bd-input" style={{ minHeight: 42, fontSize: 14 }} value={search} onChange={e => setSearch(e.target.value)} placeholder="Name or ID" aria-label="Search waiting students" />
        </div>
        <select className="bd-select" value={gender} onChange={e => setGender(e.target.value)} aria-label="Gender">
          <option value="">Any gender</option><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="NONE">Gender not recorded</option>
        </select>
        {showLevelPicker(d?.levels.length ?? 0) && <select className="bd-select" value={level} onChange={e => setLevel(e.target.value)} aria-label={tx('Level')}>
          <option value="">{tx('Every level')}</option>
          {(d?.levels ?? []).map(l => <option key={l} value={l}>{levelText(l)}</option>)}
        </select>}
        {(d?.programmes.length ?? 0) > 1 && (
          <select className="bd-select bd-wide" value={programId} onChange={e => setProgramId(e.target.value)} aria-label={tx('Programme')}>
            <option value="">{tx('Every programme')}</option>
            {d!.programmes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
      </div>

      {q.isLoading ? <div className="bd-empty"><Loader2 className="bd-spin" size={22} /></div>
        : q.isError ? <div className="bd-alert is-error">{errMsg(q.error)}</div>
        : (d?.students.length ?? 0) === 0 ? (
          <div className="bd-empty"><CheckCircle2 size={28} color="#16a34a" /><p>{filtering ? 'Nobody matches.' : 'Every boarder has a room.'}</p></div>
        ) : (
          <div className="bd-list">
            {d!.students.map(s => (
              <div key={s.id} className="bd-item">
                <button type="button" className="bd-item-main" style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', font: 'inherit', cursor: 'pointer' }} onClick={() => onOpen(s.id)}>
                  <Avatar name={s.name} photo={s.photo} />
                  <div className="bd-item-text">
                    <div className="bd-name">{s.name}</div>
                    <div className="bd-meta">
                      <span>{s.username}</span>
                      {s.level != null && <span>{levelText(s.level)}</span>}
                      {s.programme && <span>{s.programme}</span>}
                      <span style={s.gender ? undefined : { color: '#b45309', fontWeight: 700 }}>{genderLabel(s.gender)}</span>
                    </div>
                  </div>
                </button>
                <div className="bd-item-actions">
                  <button type="button" className="bd-btn bd-btn-sm" onClick={() => setGiving(s)}><BedDouble size={14} /> Give a room</button>
                </div>
              </div>
            ))}
            {d!.matching > d!.students.length && <div className="bd-sub" style={{ textAlign: 'center' }}>Showing the first {d!.students.length}. Narrow the list with the filters.</div>}
          </div>
        )}

      {giving && (
        <PlacePicker title={`Give ${giving.name} a room`} student={giving} onClose={() => setGiving(null)}
          onPick={async (roomId, bed) => {
            const p = await assignRoom({ studentId: giving.id, roomId, bed });
            toast.success(`${giving.name}: ${p.short}`);
            setGiving(null);
            qc.invalidateQueries({ queryKey: ['boarding'] });
          }} />
      )}
    </div>
  );
}

// ── Boarding staff ─────────────────────────────────────────────────────────

export function StaffPanel({ head, hostels, word }: { head: boolean; hostels: HostelCard[]; word: string }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['boarding', 'staff'], queryFn: getBoardingStaff });
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [picked, setPicked] = useState<{ id: number; name: string } | null>(null);
  const [duty, setDuty] = useState<'HOUSE' | 'HEAD'>('HOUSE');
  const [hostelId, setHostelId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { const t = setTimeout(() => setDebounced(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  const cands = useQuery({ queryKey: ['boarding', 'staff-candidates', debounced], queryFn: () => findStaffCandidates(debounced), enabled: head && debounced.length >= 2 && !picked });

  const rows = q.data ?? [];
  const heads = rows.filter(r => r.duty === 'HEAD');
  const byHostel = hostels.map(h => ({ h, people: rows.filter(r => r.hostelId === h.id) }));

  const add = async () => {
    if (!picked) return;
    setBusy(true);
    try {
      const r = await addBoardingStaff({ userId: picked.id, duty, hostelId: duty === 'HOUSE' ? Number(hostelId) || null : null, title: title || null });
      qc.setQueryData(['boarding', 'staff'], r);
      qc.invalidateQueries({ queryKey: ['boarding'] });
      qc.invalidateQueries({ queryKey: ['feature-flags'] });
      toast.success(`${picked.name} added`);
      setPicked(null); setSearch(''); setTitle('');
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const remove = async (id: number, name: string) => {
    if (!window.confirm(`Remove this boarding duty from ${name}?`)) return;
    try {
      qc.setQueryData(['boarding', 'staff'], await removeBoardingStaff(id));
      qc.invalidateQueries({ queryKey: ['boarding'] });
      toast.success('Removed');
    } catch (e) { toast.error(errMsg(e)); }
  };

  const Person = ({ r }: { r: typeof rows[number] }) => (
    <div className="bd-item">
      <div className="bd-item-main">
        <Avatar name={r.name} photo={r.photo} />
        <div className="bd-item-text">
          <div className="bd-name">{r.name}{r.title && <span className="bd-muted" style={{ fontWeight: 600 }}> · {r.title}</span>}</div>
          <div className="bd-meta"><span>{r.username}</span><span>{r.role === 'ADMIN' ? tx('HOD') : tx('Lecturer')}</span></div>
        </div>
      </div>
      {head && <div className="bd-item-actions"><button type="button" className="bd-btn-danger bd-btn-sm" onClick={() => remove(r.id, r.name)}><Trash2 size={14} /> Remove</button></div>}
    </div>
  );

  return (
    <>
      {head && (
        <div className="bd-card">
          <h3 className="bd-card-title" style={{ marginBottom: 4 }}><Plus size={18} /> Give boarding duties</h3>
          <div className="bd-sub" style={{ marginBottom: 12 }}>
            {tx('Use an existing teacher or HOD account.')} A housemaster or housemistress looks after one {word.toLowerCase()}'s students;
            the head of boarding (senior housemaster / housemistress) runs every {word.toLowerCase()}, its rooms, staff and settings.
          </div>
          <div className="bd-form">
            <div className="bd-field bd-wide">Staff member
              {picked ? (
                <div className="bd-item" style={{ padding: '8px 10px' }}>
                  <div className="bd-item-main"><Avatar name={picked.name} size="sm" /><span className="bd-name">{picked.name}</span></div>
                  <button type="button" className="bd-link" onClick={() => setPicked(null)}>Change</button>
                </div>
              ) : (
                <>
                  <div className="bd-find-box">
                    <Search size={16} className="bd-find-icon" />
                    <input className="bd-input" style={{ minHeight: 42, fontSize: 14 }} value={search} onChange={e => setSearch(e.target.value)} placeholder="Name or staff ID" />
                  </div>
                  {debounced.length >= 2 && (
                    <div className="bd-results" style={{ marginTop: 4 }}>
                      {cands.isLoading ? <div className="bd-empty" style={{ padding: 14 }}><Loader2 className="bd-spin" size={18} /></div>
                        : (cands.data ?? []).length === 0 ? <div className="bd-empty" style={{ padding: 14 }}><p>No staff found.</p></div>
                        : (cands.data ?? []).map(c => (
                          <button key={c.id} type="button" className="bd-result" onClick={() => setPicked({ id: c.id, name: c.name })}>
                            <Avatar name={c.name} size="sm" />
                            <div className="bd-result-main"><div className="bd-name">{c.name}</div>
                              <div className="bd-meta"><span>{c.username}</span>{c.department && <span>{c.department}</span>}</div></div>
                          </button>
                        ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="bd-field">Duty
              <div className="bd-seg" role="radiogroup">
                <button type="button" role="radio" aria-checked={duty === 'HOUSE'} className={duty === 'HOUSE' ? 'is-on' : ''} onClick={() => setDuty('HOUSE')}>One {word.toLowerCase()}</button>
                <button type="button" role="radio" aria-checked={duty === 'HEAD'} className={duty === 'HEAD' ? 'is-on' : ''} onClick={() => setDuty('HEAD')}>Head of boarding</button>
              </div>
            </div>
            {duty === 'HOUSE' && (
              <label className="bd-field">{word}
                <select className="bd-select" value={hostelId} onChange={e => setHostelId(e.target.value)}>
                  <option value="">Choose…</option>
                  {hostels.filter(h => h.active).map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </label>
            )}
            <label className="bd-field">Title students see <small>Optional, e.g. Housemistress</small>
              <input className="bd-input" value={title} onChange={e => setTitle(e.target.value)} maxLength={60} />
            </label>
          </div>
          <div className="bd-row" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
            <button type="button" className="bd-btn" onClick={add} disabled={!picked || busy || (duty === 'HOUSE' && !hostelId)}>
              {busy ? <Loader2 size={15} className="bd-spin" /> : <Plus size={15} />} Add
            </button>
          </div>
        </div>
      )}

      <div className="bd-card">
        <h3 className="bd-card-title" style={{ marginBottom: 10 }}><UserCog size={18} /> Head of boarding</h3>
        {q.isLoading ? <div className="bd-empty"><Loader2 className="bd-spin" size={22} /></div>
          : heads.length === 0 ? <div className="bd-sub">Nobody yet. The Super Admin can do everything a head of boarding does.</div>
          : <div className="bd-list">{heads.map(r => <Person key={r.id} r={r} />)}</div>}
      </div>
      {byHostel.map(({ h, people }) => (
        <div key={h.id} className="bd-card">
          <h3 className="bd-card-title" style={{ marginBottom: 10 }}>{h.name}</h3>
          {people.length === 0 ? <div className="bd-sub">No housemaster or housemistress yet.</div>
            : <div className="bd-list">{people.map(r => <Person key={r.id} r={r} />)}</div>}
        </div>
      ))}
    </>
  );
}

// ── Settings ───────────────────────────────────────────────────────────────

export function SettingsPanel() {
  const qc = useQueryClient();
  const { mode } = useBoarding();
  const q = useQuery({ queryKey: ['boarding', 'settings'], queryFn: getBoardingSettings });
  const [word, setWord] = useState<string | null>(null);
  const [groundFloor, setGroundFloor] = useState<boolean | null>(null);
  const [showRoommates, setShowRoommates] = useState<boolean | null>(null);
  const [showOnReport, setShowOnReport] = useState<boolean | null>(null);
  const [classmates, setClassmates] = useState<'TOGETHER' | 'MIXED' | null>(null);
  const [busy, setBusy] = useState(false);
  const isSuper = (useAuth() as any).user?.role === 'SUPER_ADMIN';
  const s = q.data;

  const save = async () => {
    setBusy(true);
    try {
      const r = await saveBoardingSettings({
        ...(word !== null ? { word } : {}),
        ...(groundFloor !== null ? { groundFloor } : {}),
        ...(showRoommates !== null ? { showRoommates } : {}),
        ...(showOnReport !== null ? { showOnReport } : {}),
        ...(classmates !== null ? { classmates } : {}),
      });
      qc.setQueryData(['boarding', 'settings'], r);
      qc.invalidateQueries({ queryKey: ['boarding'] });
      qc.invalidateQueries({ queryKey: ['feature-flags'] });
      setWord(null); setGroundFloor(null); setShowRoommates(null); setShowOnReport(null); setClassmates(null);
      toast.success('Boarding settings saved');
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  if (q.isLoading) return <div className="bd-card"><div className="bd-empty"><Loader2 className="bd-spin" size={22} /></div></div>;
  if (q.isError || !s) return <div className="bd-card"><div className="bd-alert is-error" style={{ margin: 0 }}>{errMsg(q.error)}</div></div>;
  const dirty = word !== null || groundFloor !== null || showRoommates !== null || showOnReport !== null || classmates !== null;
  const together = (classmates ?? s.classmates ?? 'TOGETHER') === 'TOGETHER';

  return (
    <div className="bd-card">
      <div className="bd-alert is-info"><Info size={16} />
        <span>This institution has <b>{s.modeLabel.toLowerCase()}</b> students. {mode === 'BOTH' ? 'Record each student as a day student or a boarder on their profile.' : 'Every student is a boarder.'} Only the developer changes this.</span>
      </div>
      <div className="bd-form">
        <label className="bd-field">Word for a building <small>Shown everywhere, e.g. House, Hall, Hostel, Dormitory. Blank = {s.customWord ? 'the default' : `"${s.word}"`}.</small>
          <input className="bd-input" value={word ?? s.customWord ?? ''} onChange={e => setWord(e.target.value)} placeholder={s.word} maxLength={20} />
        </label>
        <div className="bd-field">Floor names
          <div className="bd-seg" role="radiogroup">
            <button type="button" role="radio" aria-checked={(groundFloor ?? s.groundFloor)} className={(groundFloor ?? s.groundFloor) ? 'is-on' : ''} onClick={() => setGroundFloor(true)}>Ground, First …</button>
            <button type="button" role="radio" aria-checked={!(groundFloor ?? s.groundFloor)} className={!(groundFloor ?? s.groundFloor) ? 'is-on' : ''} onClick={() => setGroundFloor(false)}>Floor 1, 2 …</button>
          </div>
        </div>
        {isSchoolMode() && (
          <div className="bd-field bd-wide">Classmates in rooms
            <small>How auto-allocation places students. {isSuper ? 'Only you (the Super Admin) decide this.' : 'Set by the Super Admin.'}</small>
            <div className="bd-seg" role="radiogroup" aria-label="Classmates in rooms">
              <button type="button" role="radio" aria-checked={together} className={together ? 'is-on' : ''} disabled={!isSuper} onClick={() => setClassmates('TOGETHER')}>Keep classmates together</button>
              <button type="button" role="radio" aria-checked={!together} className={!together ? 'is-on' : ''} disabled={!isSuper} onClick={() => setClassmates('MIXED')}>Mix classes</button>
            </div>
            <small>{together ? 'Students of the same class share rooms where they can (a JHS 1 room, a Primary 6 room …).' : 'Classmates are spread across rooms, so each room mixes students of different classes.'}</small>
          </div>
        )}
        <label className="bd-check bd-wide">
          <input type="checkbox" checked={showRoommates ?? s.showRoommates} onChange={e => setShowRoommates(e.target.checked)} />
          <span>Students see their roommates' names <small>On "My room" on their dashboard.</small></span>
        </label>
        <label className="bd-check bd-wide">
          <input type="checkbox" checked={showOnReport ?? s.showOnReport} onChange={e => setShowOnReport(e.target.checked)} />
          <span>Print the {s.word.toLowerCase()} on report cards <small>{s.mode === 'BOTH' ? `"Residency: Boarder · ${s.word} name" or "Day student"` : `"${s.word}: name"`} under the student's details.</small></span>
        </label>
      </div>
      <div className="bd-row" style={{ marginTop: 14, justifyContent: 'flex-end' }}>
        <button type="button" className="bd-btn" onClick={save} disabled={!dirty || busy}>{busy ? <Loader2 size={15} className="bd-spin" /> : <Save size={15} />} Save</button>
      </div>
    </div>
  );
}
