import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeftRight, DoorOpen, History, Loader2, LogOut, MoveRight, Pencil, Search, Trash2, UserPlus } from 'lucide-react';
import AppModal from '../../../components/ui/AppModal';
import {
  assignRoom, deleteRoom, findStudents, getRoomHistory, moveStudent, swapStudents, vacateRoom,
  type HistoryRow, type HostelDetail, type Occupant, type Room, type StudentRow,
} from '../../../api/boarding';
import PlacePicker from './PlacePicker';
import { Avatar, END_REASON, errMsg, fmtDate, freeBeds, GenderPill, genderLabel, levelText, levelsText, PlacePath, residencyLabel } from './shared';

/** One room: its beds and who sleeps in each, and (for staff who look after it) giving, moving, swapping and vacating. */
export default function RoomSheet({ hostel, room, onClose, onEdit }: {
  hostel: HostelDetail; room: Room; onClose: () => void; onEdit: () => void;
}) {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ['boarding'] });
  const [view, setView] = useState<'beds' | 'history'>('beds');
  const [giving, setGiving] = useState<number | null | 'any'>(null);
  const [moving, setMoving] = useState<Occupant | null>(null);
  const [swapping, setSwapping] = useState<Occupant | null>(null);
  const [busy, setBusy] = useState(false);

  const block = room.blockId ? hostel.blockList.find(b => b.id === room.blockId) : null;
  const floorLabels = block ? block.floorLabels : hostel.floorLabels;
  const floor = floorLabels.length > 1 ? floorLabels[room.floor] : null;
  const path = [hostel.name, ...(block ? [block.name] : []), ...(floor ? [floor] : []), room.display];
  const canManage = hostel.canManage;
  const full = room.free <= 0;
  const numbered = room.occupants.filter(o => o.bed != null);
  const unnumbered = room.occupants.filter(o => o.bed == null);
  const open = freeBeds(room.capacity, room.occupants.map(o => o.bed));
  // Free slots shown: numbered free beds, less those taken by students with no bed number
  const freeSlots = open.slice(0, Math.max(0, room.free));

  const vacate = async (o: Occupant) => {
    const note = window.prompt(`Take ${o.name} out of ${room.display}? Add a note if you like (e.g. "Moved home"). They stay a boarder and appear under "Waiting for a room".`, '');
    if (note === null) return;
    setBusy(true);
    try { toast.success((await vacateRoom(o.allocationId, note)).message); refresh(); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!window.confirm(`Delete ${room.display}? A room that has housed students is archived instead, so its history is kept.`)) return;
    setBusy(true);
    try { toast.success((await deleteRoom(room.id)).message); refresh(); onClose(); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const Person = ({ o }: { o: Occupant }) => (
    <div className="bd-slot-main">
      <Avatar name={o.name} photo={o.photo} />
      <div style={{ minWidth: 0 }}>
        <div className="bd-name">{o.name}</div>
        <div className="bd-meta">
          <span>{o.username}</span>
          {o.level != null && <span>{levelText(o.level)}</span>}
          {o.programme && <span>{o.programme}</span>}
          <span>Since {fmtDate(o.since)}</span>
        </div>
      </div>
    </div>
  );
  const PersonActions = ({ o }: { o: Occupant }) => canManage ? (
    <div className="bd-slot-actions">
      <button type="button" className="bd-btn-ghost bd-btn-sm" onClick={() => setMoving(o)} disabled={busy}><MoveRight size={14} /> Move</button>
      <button type="button" className="bd-btn-ghost bd-btn-sm" onClick={() => setSwapping(o)} disabled={busy}><ArrowLeftRight size={14} /> Swap</button>
      <button type="button" className="bd-btn-danger bd-btn-sm" onClick={() => vacate(o)} disabled={busy}><LogOut size={14} /> Vacate</button>
    </div>
  ) : null;

  return (
    <>
      <AppModal title={room.display} size="lg" onClose={onClose}
        subtitle={<PlacePath place={{ path }} small />}
        footer={
          <div className="bd-row" style={{ width: '100%' }}>
            {hostel.canEdit && <button type="button" className="bd-btn-danger" onClick={remove} disabled={busy}><Trash2 size={15} /> Delete</button>}
            <span className="bd-spacer" />
            {hostel.canEdit && <button type="button" className="bd-btn-ghost" onClick={onEdit} disabled={busy}><Pencil size={15} /> Edit room</button>}
            {canManage && !full && room.status === 'OPEN' && (
              <button type="button" className="bd-btn" onClick={() => setGiving('any')} disabled={busy}><UserPlus size={15} /> Give a bed</button>
            )}
          </div>
        }>
        <div className="bd-sheet">
          <dl className="bd-facts">
            <div className="bd-fact"><dt>Beds</dt><dd>{room.capacity - room.free} of {room.capacity} taken</dd></div>
            <div className="bd-fact"><dt>For</dt><dd><GenderPill gender={room.effectiveGender} /></dd></div>
            <div className="bd-fact"><dt>Status</dt><dd>{room.status === 'CLOSED' ? <span className="bd-pill is-bad">Closed</span> : <span className="bd-pill is-ok">Open</span>}</dd></div>
            <div className="bd-fact"><dt>Levels</dt><dd>{levelsText(room.effectiveLevels) ?? 'Any'}</dd></div>
          </dl>
          {room.label && <div className="bd-alert is-info"><DoorOpen size={16} /><span>{room.label}</span></div>}
          {room.status === 'CLOSED' && room.occupants.length > 0 && (
            <div className="bd-alert is-warn"><DoorOpen size={16} /><span>This room is closed but {room.occupants.length} student{room.occupants.length === 1 ? ' still lives' : 's still live'} here. Move them when you can.</span></div>
          )}

          <div className="bd-seg" role="tablist" style={{ marginBottom: 12 }}>
            <button type="button" role="tab" aria-selected={view === 'beds'} className={view === 'beds' ? 'is-on' : ''} onClick={() => setView('beds')}>Beds</button>
            <button type="button" role="tab" aria-selected={view === 'history'} className={view === 'history' ? 'is-on' : ''} onClick={() => setView('history')}><History size={14} style={{ verticalAlign: -2 }} /> History</button>
          </div>

          {view === 'beds' ? (
            <div className="bd-bedlist">
              {[...numbered.map(o => ({ bed: o.bed as number, o })), ...freeSlots.map(b => ({ bed: b, o: null as Occupant | null }))]
                .sort((a, b) => a.bed - b.bed)
                .map(({ bed, o }) => o ? (
                  <div key={`b${bed}`} className="bd-slot is-taken"><span className="bd-slot-no">{bed}</span><Person o={o} /><PersonActions o={o} /></div>
                ) : (
                  <div key={`f${bed}`} className="bd-slot is-free">
                    <span className="bd-slot-no">{bed}</span>
                    <div className="bd-slot-main"><span className="bd-muted" style={{ fontWeight: 700 }}>Free bed</span></div>
                    {canManage && room.status === 'OPEN' && (
                      <div className="bd-slot-actions"><button type="button" className="bd-btn-ghost bd-btn-sm" onClick={() => setGiving(bed)}><UserPlus size={14} /> Give this bed</button></div>
                    )}
                  </div>
                ))}
              {unnumbered.map(o => (
                <div key={o.allocationId} className="bd-slot is-taken"><span className="bd-slot-no">–</span><Person o={o} /><PersonActions o={o} /></div>
              ))}
              {room.occupants.length === 0 && freeSlots.length === 0 && <div className="bd-empty"><p>No beds.</p></div>}
            </div>
          ) : <RoomHistory roomId={room.id} />}
        </div>
      </AppModal>

      {giving !== null && (
        <AssignDialog room={room} path={path} bed={giving === 'any' ? null : giving}
          onClose={() => setGiving(null)} onDone={() => { setGiving(null); refresh(); }} />
      )}
      {moving && (
        <PlacePicker title={`Move ${moving.name}`} student={moving} confirmLabel="Move here"
          current={{ hostelId: hostel.id, hostel: hostel.name, blockId: room.blockId, block: block?.name ?? null, floor: room.floor, floorLabel: floor,
            roomId: room.id, room: room.display, bed: moving.bed, path, short: `${hostel.name} · ${room.display}`, allocationId: moving.allocationId }}
          onClose={() => setMoving(null)}
          onPick={async (roomId, bed) => {
            const p = await moveStudent(moving.allocationId, { roomId, bed });
            toast.success(`${moving.name} moved to ${p.short}`);
            setMoving(null); refresh();
          }} />
      )}
      {swapping && <SwapDialog occupant={swapping} roomName={room.display} onClose={() => setSwapping(null)} onDone={() => { setSwapping(null); refresh(); }} />}
    </>
  );
}

function useStudentSearch(roomId?: number) {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => { const t = setTimeout(() => setDebounced(q.trim()), 250); return () => clearTimeout(t); }, [q]);
  const res = useQuery({ queryKey: ['boarding', 'find', debounced, roomId ?? null], queryFn: () => findStudents(debounced, roomId), enabled: debounced.length >= 2 });
  return { q, setQ, res, ready: debounced.length >= 2 };
}

function SearchBox({ q, setQ, placeholder }: { q: string; setQ: (v: string) => void; placeholder: string }) {
  return (
    <div className="bd-find-box" style={{ marginBottom: 10 }}>
      <Search size={17} className="bd-find-icon" />
      <input className="bd-input" value={q} onChange={e => setQ(e.target.value)} placeholder={placeholder} aria-label={placeholder} autoComplete="off" />
    </div>
  );
}

/** Pick the student who gets a bed in this room (they are checked against the room as you search). */
function AssignDialog({ room, path, bed, onClose, onDone }: { room: Room; path: string[]; bed: number | null; onClose: () => void; onDone: () => void }) {
  const { q, setQ, res, ready } = useStudentSearch(room.id);
  const [busy, setBusy] = useState<number | null>(null);

  const give = async (s: StudentRow) => {
    let makeBoarder = false;
    if (s.needsBoarder) {
      if (!window.confirm(`${s.name} is recorded as ${residencyLabel(s.residency).toLowerCase()}. Make them a boarder and give them this bed?`)) return;
      makeBoarder = true;
    }
    setBusy(s.id);
    try {
      const p = await assignRoom({ studentId: s.id, roomId: room.id, bed, makeBoarder });
      toast.success(`${s.name}: ${p.short}`);
      onDone();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(null); }
  };

  return (
    <AppModal title={bed ? `Give bed ${bed}` : 'Give a bed'} onClose={onClose} subtitle={<PlacePath place={{ path: bed ? [...path, `Bed ${bed}`] : path }} small />}>
      <SearchBox q={q} setQ={setQ} placeholder="Search by name or ID" />
      {!ready ? <div className="bd-empty"><p>Type at least 2 letters of the student's name or ID.</p></div>
        : res.isLoading ? <div className="bd-empty"><Loader2 className="bd-spin" size={22} /></div>
        : (res.data ?? []).length === 0 ? <div className="bd-empty"><p>No student found.</p></div>
        : (
          <div className="bd-list">
            {(res.data ?? []).map(s => (
              <div key={s.id} className="bd-item">
                <div className="bd-item-main">
                  <Avatar name={s.name} photo={s.photo} />
                  <div className="bd-item-text">
                    <div className="bd-name">{s.name}</div>
                    <div className="bd-meta">
                      <span>{s.username}</span>
                      {s.level != null && <span>{levelText(s.level)}</span>}
                      <span>{genderLabel(s.gender)}</span>
                      <span>{residencyLabel(s.residency)}</span>
                    </div>
                    {s.place && <div className="bd-sub">Lives in {s.place.short}: use Move from their room instead.</div>}
                    {!s.place && s.fit && <div className="bd-sub" style={{ color: '#b42318' }}>{s.fit}</div>}
                    {!s.enabled && <div className="bd-sub" style={{ color: '#b42318' }}>Account deactivated</div>}
                  </div>
                </div>
                <div className="bd-item-actions">
                  <button type="button" className="bd-btn bd-btn-sm" disabled={!!s.place || !!s.fit || !s.enabled || busy !== null} onClick={() => give(s)}>
                    {busy === s.id ? <Loader2 size={14} className="bd-spin" /> : <UserPlus size={14} />} Give bed
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
    </AppModal>
  );
}

/** Swap places with another boarder who has a room. */
function SwapDialog({ occupant, roomName, onClose, onDone }: { occupant: Occupant; roomName: string; onClose: () => void; onDone: () => void }) {
  const { q, setQ, res, ready } = useStudentSearch();
  const [busy, setBusy] = useState<number | null>(null);
  const others = (res.data ?? []).filter(s => s.id !== occupant.id);

  const swap = async (s: StudentRow) => {
    if (!s.place?.allocationId) return;
    if (!window.confirm(`Swap ${occupant.name} (${roomName}) with ${s.name} (${s.place.short})?`)) return;
    setBusy(s.id);
    try {
      await swapStudents(occupant.allocationId, s.place.allocationId);
      toast.success(`${occupant.name} and ${s.name} swapped rooms`);
      onDone();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(null); }
  };

  return (
    <AppModal title={`Swap ${occupant.name}`} onClose={onClose} subtitle="Find the boarder to change places with. Both move in one step.">
      <SearchBox q={q} setQ={setQ} placeholder="Search by name or ID" />
      {!ready ? <div className="bd-empty"><p>Type at least 2 letters of the student's name or ID.</p></div>
        : res.isLoading ? <div className="bd-empty"><Loader2 className="bd-spin" size={22} /></div>
        : others.length === 0 ? <div className="bd-empty"><p>No student found.</p></div>
        : (
          <div className="bd-list">
            {others.map(s => (
              <div key={s.id} className="bd-item">
                <div className="bd-item-main">
                  <Avatar name={s.name} photo={s.photo} />
                  <div className="bd-item-text">
                    <div className="bd-name">{s.name}</div>
                    {s.place ? <PlacePath place={s.place} small /> : <div className="bd-sub">Has no room</div>}
                  </div>
                </div>
                <div className="bd-item-actions">
                  <button type="button" className="bd-btn bd-btn-sm" disabled={!s.place || !s.canManage || busy !== null} onClick={() => swap(s)}>
                    {busy === s.id ? <Loader2 size={14} className="bd-spin" /> : <ArrowLeftRight size={14} />} Swap
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
    </AppModal>
  );
}

export function RoomHistory({ roomId }: { roomId: number }) {
  const q = useQuery({ queryKey: ['boarding', 'room-history', roomId], queryFn: () => getRoomHistory(roomId) });
  if (q.isLoading) return <div className="bd-empty"><Loader2 className="bd-spin" size={22} /></div>;
  if (q.isError) return <div className="bd-alert is-error">{errMsg(q.error)}</div>;
  const rows = q.data ?? [];
  if (rows.length === 0) return <div className="bd-empty"><History size={26} /><p>Nobody has lived here yet.</p></div>;
  return <HistoryList rows={rows} show="student" />;
}

/** Stays, newest first: who (or where), from when to when, and why it ended. */
export function HistoryList({ rows, show }: { rows: HistoryRow[]; show: 'student' | 'place' }) {
  return (
    <div className="bd-history">
      {rows.map(r => (
        <div key={r.id} className="bd-history-row">
          <span className={`bd-dot${r.current ? ' is-current' : ''}`} aria-hidden />
          <div style={{ minWidth: 0, flex: 1 }}>
            {show === 'student' ? <div className="bd-name">{r.student.name} <span className="bd-muted" style={{ fontWeight: 600 }}>· {r.student.username}{r.place.bed ? ` · Bed ${r.place.bed}` : ''}</span></div>
              : <PlacePath place={r.place} small />}
            <div className="bd-meta">
              <span>{fmtDate(r.startedAt)} – {r.current ? 'now' : fmtDate(r.endedAt)}</span>
              {r.endReason && <span>{END_REASON[r.endReason]}</span>}
              {r.session && <span>{r.session}</span>}
              {r.assignedBy && <span>Given by {r.assignedBy}</span>}
            </div>
            {r.note && <div className="bd-sub">{r.note}</div>}
          </div>
          {r.current && <span className="bd-pill is-ok">Now</span>}
        </div>
      ))}
    </div>
  );
}
