import { useMemo, useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Save, Trash2 } from 'lucide-react';
import AppModal from '../../../components/ui/AppModal';
import {
  addBlock, addHostel, addRoom, deleteBlock, generateRooms, updateBlock, updateHostel, updateRoom,
  type Block, type HostelDetail, type HostelGender, type Room, type RoomStatus,
} from '../../../api/boarding';
import { errMsg } from './shared';
import { tx, isSchoolMode } from '../../../utils/terms';

const GENDERS: { value: HostelGender; label: string }[] = [
  { value: 'BOYS', label: 'Boys' }, { value: 'GIRLS', label: 'Girls' }, { value: 'MIXED', label: 'Mixed' },
];

function Footer({ busy, onClose, onSave, label = 'Save', extra }: { busy: boolean; onClose: () => void; onSave: () => void; label?: string; extra?: ReactNode }) {
  return (
    <div className="bd-row" style={{ width: '100%' }}>
      {extra}
      <span className="bd-spacer" />
      <button type="button" className="bd-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
      <button type="button" className="bd-btn" onClick={onSave} disabled={busy}>
        {busy ? <Loader2 size={15} className="bd-spin" /> : <Save size={15} />} {label}
      </button>
    </div>
  );
}

function GenderSeg({ value, onChange, inherit }: { value: HostelGender | null; onChange: (g: HostelGender | null) => void; inherit?: string }) {
  return (
    <div className="bd-seg" role="radiogroup">
      {inherit !== undefined && (
        <button type="button" role="radio" aria-checked={value === null} className={value === null ? 'is-on' : ''} onClick={() => onChange(null)}>{inherit}</button>
      )}
      {GENDERS.map(g => (
        <button key={g.value} type="button" role="radio" aria-checked={value === g.value} className={value === g.value ? 'is-on' : ''} onClick={() => onChange(g.value)}>{g.label}</button>
      ))}
    </div>
  );
}

// ── Hostel ────────────────────────────────────────────────────────────────

export function HostelDialog({ word, hostel, onClose, onSaved }: {
  word: string; hostel?: Pick<HostelDetail, 'id' | 'name' | 'code' | 'gender' | 'floors' | 'allowedLevels' | 'note'>;
  onClose: () => void; onSaved: (id: number) => void;
}) {
  const [name, setName] = useState(hostel?.name ?? '');
  const [code, setCode] = useState(hostel?.code ?? '');
  const [gender, setGender] = useState<HostelGender>(hostel?.gender ?? 'BOYS');
  const [floors, setFloors] = useState(String(hostel?.floors ?? 1));
  const [levels, setLevels] = useState(hostel?.allowedLevels ?? '');
  const [note, setNote] = useState(hostel?.note ?? '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const d = { name, code: code || null, gender, floors: Number(floors) || 1, allowedLevels: levels || null, note: note || null };
      const r = hostel ? await updateHostel(hostel.id, d) : await addHostel(d);
      toast.success(hostel ? `${name} saved` : `${name} added`);
      onSaved(r.id);
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <AppModal title={hostel ? `Edit ${hostel.name}` : `Add a ${word.toLowerCase()}`} onClose={onClose}
      subtitle={hostel ? undefined : 'A building students sleep in. Add its blocks and rooms next.'}
      footer={<Footer busy={busy} onClose={onClose} onSave={save} />}>
      <div className="bd-form">
        <label className="bd-field bd-wide">Name
          <input className="bd-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Aggrey House" maxLength={80} autoFocus />
        </label>
        <label className="bd-field">Short code <small>Optional, e.g. AGH</small>
          <input className="bd-input" value={code} onChange={e => setCode(e.target.value)} maxLength={20} />
        </label>
        <label className="bd-field">Floors <small>1 = single storey (ground floor only)</small>
          <input className="bd-input" type="number" inputMode="numeric" min={1} max={40} value={floors} onChange={e => setFloors(e.target.value)} />
        </label>
        <div className="bd-field bd-wide">Who it is for
          <GenderSeg value={gender} onChange={g => setGender(g ?? 'MIXED')} />
          <small>Girls can't be placed in a boys' {word.toLowerCase()} and the other way round. A block or room can be set differently.</small>
        </div>
        {!isSchoolMode() && <label className="bd-field bd-wide">{tx('Levels')} that may live here <small>{tx('Optional, e.g. 1 for a Level 1 house. Blank = every level.')}</small>
          <input className="bd-input" value={levels} onChange={e => setLevels(e.target.value)} placeholder="e.g. 1, 2" />
        </label>}
        <label className="bd-field bd-wide">Note <small>Optional</small>
          <textarea className="bd-textarea" value={note} onChange={e => setNote(e.target.value)} maxLength={300} />
        </label>
      </div>
    </AppModal>
  );
}

// ── Block ─────────────────────────────────────────────────────────────────

export function BlockDialog({ hostelId, block, onClose, onSaved }: {
  hostelId: number; block?: Block; onClose: () => void; onSaved: () => void;
}) {
  const [name, setName] = useState(block?.name ?? '');
  const [floors, setFloors] = useState(String(block?.floors ?? 1));
  const [gender, setGender] = useState<HostelGender | null>(block?.gender ?? null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const d = { name, floors: Number(floors) || 1, gender };
      if (block) await updateBlock(block.id, d); else await addBlock(hostelId, d);
      toast.success(`${name} saved`);
      onSaved();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!block || !window.confirm(`Delete ${block.name}? This works only when it has no rooms.`)) return;
    setBusy(true);
    try { toast.success((await deleteBlock(block.id)).message); onSaved(); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <AppModal title={block ? `Edit ${block.name}` : 'Add a block or wing'} size="sm" onClose={onClose}
      subtitle={block ? undefined : 'For buildings with separate blocks, each with its own number of floors.'}
      footer={<Footer busy={busy} onClose={onClose} onSave={save}
        extra={block && <button type="button" className="bd-btn-danger" onClick={remove} disabled={busy}><Trash2 size={15} /> Delete</button>} />}>
      <div className="bd-form">
        <label className="bd-field bd-wide">Name
          <input className="bd-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Block B or East Wing" maxLength={60} autoFocus />
        </label>
        <label className="bd-field bd-wide">Floors <small>1 = single storey</small>
          <input className="bd-input" type="number" inputMode="numeric" min={1} max={40} value={floors} onChange={e => setFloors(e.target.value)} />
        </label>
        <div className="bd-field bd-wide">Who it is for
          <GenderSeg value={gender} onChange={setGender} inherit="As building" />
        </div>
      </div>
    </AppModal>
  );
}

// ── Where a room goes: block + floor ──────────────────────────────────────

function useLocationChoice(hostel: HostelDetail, blockId: number | null) {
  return useMemo(() => {
    const block = hostel.blockList.find(b => b.id === blockId) ?? null;
    return { block, floorLabels: block ? block.floorLabels : hostel.floorLabels };
  }, [hostel, blockId]);
}

function WhereFields({ hostel, blockId, setBlockId, floor, setFloor }: {
  hostel: HostelDetail; blockId: number | null; setBlockId: (b: number | null) => void; floor: number; setFloor: (f: number) => void;
}) {
  const { floorLabels } = useLocationChoice(hostel, blockId);
  return (
    <>
      {hostel.blockList.length > 0 && (
        <label className="bd-field">Block
          <select className="bd-select" value={blockId ?? ''} onChange={e => { setBlockId(e.target.value ? Number(e.target.value) : null); setFloor(0); }}>
            <option value="">Main building (no block)</option>
            {hostel.blockList.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
      )}
      {floorLabels.length > 1 && (
        <label className="bd-field">Floor
          <select className="bd-select" value={floor} onChange={e => setFloor(Number(e.target.value))}>
            {floorLabels.map((l, i) => <option key={i} value={i}>{l}</option>)}
          </select>
        </label>
      )}
    </>
  );
}

// ── Room ──────────────────────────────────────────────────────────────────

export function RoomDialog({ hostel, room, defaults, onClose, onSaved }: {
  hostel: HostelDetail; room?: Room; defaults?: { blockId: number | null; floor: number };
  onClose: () => void; onSaved: (r: Room) => void;
}) {
  const [blockId, setBlockId] = useState<number | null>(room?.blockId ?? defaults?.blockId ?? null);
  const [floor, setFloor] = useState(room?.floor ?? defaults?.floor ?? 0);
  const [name, setName] = useState(room?.name ?? '');
  const [capacity, setCapacity] = useState(String(room?.capacity ?? 8));
  const [gender, setGender] = useState<HostelGender | null>(room?.gender ?? null);
  const [status, setStatus] = useState<RoomStatus>(room?.status ?? 'OPEN');
  const [label, setLabel] = useState(room?.label ?? '');
  const [levels, setLevels] = useState(room?.allowedLevels ?? '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const d = { blockId, floor, name, capacity: Number(capacity) || 0, gender, status, label: label || null, allowedLevels: levels || null };
      const r = room ? await updateRoom(room.id, d) : await addRoom(hostel.id, d);
      toast.success(`${r.display} saved`);
      onSaved(r);
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <AppModal title={room ? `Edit ${room.display}` : 'Add a room'} onClose={onClose} subtitle={hostel.name}
      footer={<Footer busy={busy} onClose={onClose} onSave={save} />}>
      <div className="bd-form">
        <WhereFields hostel={hostel} blockId={blockId} setBlockId={setBlockId} floor={floor} setFloor={setFloor} />
        <label className="bd-field">Room name or number
          <input className="bd-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. 14 or B2-01" maxLength={30} autoFocus={!room} />
        </label>
        <label className="bd-field">Beds
          <input className="bd-input" type="number" inputMode="numeric" min={1} max={200} value={capacity} onChange={e => setCapacity(e.target.value)} />
        </label>
        <div className="bd-field bd-wide">Who it is for
          <GenderSeg value={gender} onChange={setGender} inherit="As building" />
        </div>
        <div className="bd-field bd-wide">Status
          <div className="bd-seg" role="radiogroup">
            <button type="button" role="radio" aria-checked={status === 'OPEN'} className={status === 'OPEN' ? 'is-on' : ''} onClick={() => setStatus('OPEN')}>Open</button>
            <button type="button" role="radio" aria-checked={status === 'CLOSED'} className={status === 'CLOSED' ? 'is-on' : ''} onClick={() => setStatus('CLOSED')}>Closed</button>
          </div>
          <small>A closed room (repairs …) takes no new students; anyone in it stays until moved.</small>
        </div>
        <label className="bd-field">Label <small>Optional, e.g. Prefects, Sick bay</small>
          <input className="bd-input" value={label} onChange={e => setLabel(e.target.value)} maxLength={60} />
        </label>
        {!isSchoolMode() && <label className="bd-field">{tx('Levels')} only <small>Optional; blank = as the building</small>
          <input className="bd-input" value={levels} onChange={e => setLevels(e.target.value)} placeholder="e.g. 3" />
        </label>}
      </div>
    </AppModal>
  );
}

// ── Many rooms at once ────────────────────────────────────────────────────

export function GenerateDialog({ hostel, defaults, onClose, onSaved }: {
  hostel: HostelDetail; defaults?: { blockId: number | null; floor: number }; onClose: () => void; onSaved: () => void;
}) {
  const [blockId, setBlockId] = useState<number | null>(defaults?.blockId ?? null);
  const [floor, setFloor] = useState(defaults?.floor ?? 0);
  const [prefix, setPrefix] = useState('');
  const [from, setFrom] = useState('1');
  const [to, setTo] = useState('10');
  const [pad, setPad] = useState(false);
  const [capacity, setCapacity] = useState('8');
  const [gender, setGender] = useState<HostelGender | null>(null);
  const [busy, setBusy] = useState(false);

  const names = useMemo(() => {
    const a = Number(from), b = Number(to);
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < a || b - a >= 200) return [];
    const w = pad ? String(b).length : 0;
    return Array.from({ length: b - a + 1 }, (_, i) => prefix.trim() + String(a + i).padStart(w, '0'));
  }, [from, to, pad, prefix]);

  const save = async () => {
    setBusy(true);
    try {
      const r = await generateRooms(hostel.id, { blockId, floor, prefix, from: Number(from), to: Number(to), pad, capacity: Number(capacity) || 0, gender });
      toast.success(r.message);
      onSaved();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <AppModal title="Add many rooms" onClose={onClose} subtitle={`${hostel.name}: number a run of rooms in one go. Names already taken are skipped.`}
      footer={<Footer busy={busy} onClose={onClose} onSave={save} label={names.length ? `Add ${names.length} room${names.length === 1 ? '' : 's'}` : 'Add rooms'} />}>
      <div className="bd-form">
        <WhereFields hostel={hostel} blockId={blockId} setBlockId={setBlockId} floor={floor} setFloor={setFloor} />
        <label className="bd-field">Prefix <small>Optional, e.g. B2- or Room </small>
          <input className="bd-input" value={prefix} onChange={e => setPrefix(e.target.value)} maxLength={20} />
        </label>
        <label className="bd-field">Beds in each room
          <input className="bd-input" type="number" inputMode="numeric" min={1} max={200} value={capacity} onChange={e => setCapacity(e.target.value)} />
        </label>
        <label className="bd-field">From number
          <input className="bd-input" type="number" inputMode="numeric" min={0} value={from} onChange={e => setFrom(e.target.value)} />
        </label>
        <label className="bd-field">To number
          <input className="bd-input" type="number" inputMode="numeric" min={0} value={to} onChange={e => setTo(e.target.value)} />
        </label>
        <label className="bd-check bd-wide">
          <input type="checkbox" checked={pad} onChange={e => setPad(e.target.checked)} />
          <span>Same width numbers <small>01, 02 … 10 instead of 1, 2 … 10</small></span>
        </label>
        <div className="bd-field bd-wide">Who they are for
          <GenderSeg value={gender} onChange={setGender} inherit="As building" />
        </div>
        <div className="bd-field bd-wide">Preview
          {names.length ? (
            <div className="bd-preview" aria-live="polite">
              {names.slice(0, 40).map(n => <span key={n} className="bd-chip">{n}</span>)}
              {names.length > 40 && <span className="bd-chip">… {names[names.length - 1]}</span>}
            </div>
          ) : <small>Choose a first and last number (at most 200 rooms).</small>}
        </div>
      </div>
    </AppModal>
  );
}
