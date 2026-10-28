import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArchiveRestore, ArrowLeft, Building, DoorOpen, Layers, Loader2, Pencil, Plus, Rows3, Search, Trash2, Users } from 'lucide-react';
import PageHeader from '../../../components/PageHeader';
import { deleteHostel, getHostel, restoreHostel, type Block, type HostelDetail, type Room } from '../../../api/boarding';
import { BlockDialog, GenerateDialog, HostelDialog, RoomDialog } from './StructureDialogs';
import RoomSheet from './RoomSheet';
import { errMsg, GenderPill, levelsText, useBoardingBase } from './shared';
import './boarding.css';

type Section = 'all' | 'main' | number;

/** One hostel: pick a block (if it has any), then a floor (if it has more than one), then a room. */
export default function HostelPage() {
  const { id } = useParams();
  const hostelId = Number(id);
  const base = useBoardingBase();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const q = useQuery({ queryKey: ['boarding', 'hostel', hostelId], queryFn: () => getHostel(hostelId), enabled: Number.isFinite(hostelId) });
  const h = q.data;

  const [section, setSection] = useState<Section>('all');
  const [floor, setFloor] = useState<number | 'all'>('all');
  const [search, setSearch] = useState('');
  const [freeOnly, setFreeOnly] = useState(false);
  const [dialog, setDialog] = useState<null | { kind: 'hostel' } | { kind: 'block'; block?: Block } | { kind: 'room'; room?: Room } | { kind: 'many' }>(null);
  const openRoomId = params.get('room') ? Number(params.get('room')) : null;
  const openRoom = h?.rooms.find(r => r.id === openRoomId) ?? null;
  const setOpenRoom = (rid: number | null) => {
    const next = new URLSearchParams(params);
    if (rid == null) next.delete('room'); else next.set('room', String(rid));
    setParams(next, { replace: true });
  };
  const refresh = () => qc.invalidateQueries({ queryKey: ['boarding'] });

  useEffect(() => { setFloor('all'); }, [section]);

  const hasMain = !!h && (h.blockList.length === 0 || h.rooms.some(r => r.blockId == null));
  const sectionBlock = h && typeof section === 'number' ? h.blockList.find(b => b.id === section) ?? null : null;
  const sectionFloors = !h ? [] : sectionBlock ? sectionBlock.floorLabels : section === 'main' || h.blockList.length === 0 ? h.floorLabels : [];

  const visible = useMemo(() => {
    if (!h) return [];
    const t = search.trim().toLowerCase();
    return h.rooms.filter(r =>
      (section === 'all' || (section === 'main' ? r.blockId == null : r.blockId === section))
      && (floor === 'all' || r.floor === floor)
      && (!freeOnly || (r.free > 0 && r.status === 'OPEN'))
      && (!t || r.name.toLowerCase().includes(t) || r.display.toLowerCase().includes(t) || (r.label ?? '').toLowerCase().includes(t)
        || r.occupants.some(o => o.name.toLowerCase().includes(t) || o.username.toLowerCase().includes(t))));
  }, [h, section, floor, search, freeOnly]);

  /** Rooms grouped under "Block B · Second floor" headings, in building order. */
  const groups = useMemo(() => {
    if (!h) return [];
    const out: { key: string; title: string; rooms: Room[] }[] = [];
    for (const r of visible) {
      const b = r.blockId ? h.blockList.find(x => x.id === r.blockId) : null;
      const labels = b ? b.floorLabels : h.floorLabels;
      const parts = [...(h.blockList.length > 0 ? [b ? b.name : 'Main building'] : []), ...(labels.length > 1 ? [labels[r.floor]] : [])];
      const key = `${r.blockId ?? 'm'}:${r.floor}`;
      let g = out.find(x => x.key === key);
      if (!g) { g = { key, title: parts.join(' · '), rooms: [] }; out.push(g); }
      g.rooms.push(r);
    }
    return out;
  }, [h, visible]);

  const totals = useMemo(() => {
    const rs = h?.rooms ?? [];
    const open = rs.filter(r => r.status === 'OPEN');
    return {
      beds: open.reduce((n, r) => n + r.capacity, 0),
      living: rs.reduce((n, r) => n + r.occupants.length, 0),
      free: open.reduce((n, r) => n + r.free, 0),
    };
  }, [h]);

  const remove = async () => {
    if (!h || !window.confirm(`Delete ${h.name}? If students have ever lived here it is archived instead, so its history is kept.`)) return;
    try {
      const r = await deleteHostel(h.id);
      toast.success(r.message);
      refresh();
      navigate(`${base}/boarding`);
    } catch (e) { toast.error(errMsg(e)); }
  };
  const restore = async () => {
    if (!h) return;
    try { await restoreHostel(h.id); toast.success(`${h.name} restored`); refresh(); }
    catch (e) { toast.error(errMsg(e)); }
  };

  const word = h?.settings.word ?? 'House';
  const defaults = { blockId: typeof section === 'number' ? section : null, floor: floor === 'all' ? 0 : floor };

  return (
    <div className="bd-page">
      <PageHeader title={h?.name ?? word} breadcrumbs={['Boarding', h?.settings.plural ?? 'Houses', h?.name ?? '…']} />
      <button type="button" className="bd-back" onClick={() => navigate(`${base}/boarding`)}><ArrowLeft size={15} /> All {(h?.settings.plural ?? 'houses').toLowerCase()}</button>

      {q.isLoading ? <div className="bd-card"><div className="bd-empty"><Loader2 className="bd-spin" size={24} /></div></div>
        : q.isError ? <div className="bd-card"><div className="bd-alert is-error" style={{ margin: 0 }}>{errMsg(q.error)}</div></div>
        : h && (
          <>
            <div className="bd-card">
              <div className="bd-head">
                <span className="bd-hostel-icon"><Building size={20} /></span>
                <div className="bd-head-main">
                  <h2>{h.name}{h.code ? <span className="bd-muted" style={{ fontWeight: 700, fontSize: 14 }}> · {h.code}</span> : null}</h2>
                  <div className="bd-row" style={{ marginTop: 6 }}>
                    <GenderPill gender={h.gender} />
                    {!h.active && <span className="bd-pill is-bad">Archived</span>}
                    {h.blockList.length > 0 && <span className="bd-chip"><Layers size={12} /> {h.blockList.length} block{h.blockList.length === 1 ? '' : 's'}</span>}
                    {h.blockList.length === 0 && <span className="bd-chip"><Rows3 size={12} /> {h.floors === 1 ? 'Single storey' : `${h.floors} floors`}</span>}
                    {h.allowedLevels && <span className="bd-chip">{levelsText(h.allowedLevels)} only</span>}
                  </div>
                  {h.staff.length > 0 && <div className="bd-sub"><Users size={12} style={{ verticalAlign: -2 }} /> {h.staff.map(s => `${s.name}${s.title ? ` (${s.title})` : ''}`).join(', ')}</div>}
                  {h.note && <div className="bd-sub">{h.note}</div>}
                </div>
                {h.canEdit && (
                  <div className="bd-head-actions">
                    {h.active ? (
                      <>
                        <button type="button" className="bd-btn-ghost bd-btn-sm" onClick={() => setDialog({ kind: 'hostel' })}><Pencil size={14} /> Edit</button>
                        <button type="button" className="bd-btn-ghost bd-btn-sm" onClick={() => setDialog({ kind: 'block' })}><Layers size={14} /> Add block</button>
                        <button type="button" className="bd-btn-danger bd-btn-sm" onClick={remove}><Trash2 size={14} /> Delete</button>
                      </>
                    ) : <button type="button" className="bd-btn bd-btn-sm" onClick={restore}><ArchiveRestore size={14} /> Restore</button>}
                  </div>
                )}
              </div>
              <div className="bd-stats" style={{ margin: '14px 0 0' }}>
                <div className="bd-stat"><b>{h.rooms.length}</b><span>Rooms</span></div>
                <div className="bd-stat"><b>{totals.beds}</b><span>Beds (open rooms)</span></div>
                <div className="bd-stat"><b>{totals.living}</b><span>Living here</span></div>
                <div className={`bd-stat${totals.free === 0 && totals.beds > 0 ? ' is-warn' : ''}`}><b>{totals.free}</b><span>Free beds</span></div>
              </div>
            </div>

            <div className="bd-card">
              {h.blockList.length > 0 && (
                <>
                  <div className="bd-section-title" style={{ marginTop: 0 }}>Block</div>
                  <div className="bd-chips">
                    <button type="button" className={`bd-chip-btn${section === 'all' ? ' is-on' : ''}`} onClick={() => setSection('all')}>All <small>{h.rooms.length}</small></button>
                    {hasMain && <button type="button" className={`bd-chip-btn${section === 'main' ? ' is-on' : ''}`} onClick={() => setSection('main')}>
                      Main building <small>{h.rooms.filter(r => r.blockId == null).length}</small></button>}
                    {h.blockList.map(b => (
                      <button key={b.id} type="button" className={`bd-chip-btn${section === b.id ? ' is-on' : ''}`} onClick={() => setSection(b.id)}>
                        {b.name} <small>{h.rooms.filter(r => r.blockId === b.id).length}</small></button>
                    ))}
                  </div>
                  {sectionBlock && h.canEdit && (
                    <div className="bd-row" style={{ marginTop: 8 }}>
                      {sectionBlock.gender && <GenderPill gender={sectionBlock.gender} />}
                      <span className="bd-sub" style={{ margin: 0 }}>{sectionBlock.floors === 1 ? 'Single storey' : `${sectionBlock.floors} floors`}</span>
                      <button type="button" className="bd-link" style={{ fontSize: 12.5 }} onClick={() => setDialog({ kind: 'block', block: sectionBlock })}>Edit {sectionBlock.name}</button>
                    </div>
                  )}
                </>
              )}
              {sectionFloors.length > 1 && (
                <>
                  <div className="bd-section-title" style={h.blockList.length ? undefined : { marginTop: 0 }}>Floor</div>
                  <div className="bd-chips">
                    <button type="button" className={`bd-chip-btn${floor === 'all' ? ' is-on' : ''}`} onClick={() => setFloor('all')}>All floors</button>
                    {sectionFloors.map((l, i) => {
                      const n = h.rooms.filter(r => r.floor === i && (section === 'all' || (section === 'main' ? r.blockId == null : r.blockId === section))).length;
                      return <button key={i} type="button" className={`bd-chip-btn${floor === i ? ' is-on' : ''}`} onClick={() => setFloor(i)}>{l} <small>{n}</small></button>;
                    })}
                  </div>
                </>
              )}
              <div className="bd-row" style={{ marginTop: h.blockList.length || sectionFloors.length > 1 ? 12 : 0 }}>
                <div className="bd-find-box" style={{ flex: '1 1 220px' }}>
                  <Search size={16} className="bd-find-icon" />
                  <input className="bd-input" style={{ minHeight: 42, fontSize: 14 }} value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Room or student" aria-label="Search rooms and students" />
                </div>
                <label className="bd-check" style={{ alignItems: 'center' }}>
                  <input type="checkbox" checked={freeOnly} onChange={e => setFreeOnly(e.target.checked)} style={{ marginTop: 0 }} /> Free beds only
                </label>
                {h.canEdit && h.active && (
                  <div className="bd-row" style={{ marginLeft: 'auto' }}>
                    <button type="button" className="bd-btn-ghost bd-btn-sm" onClick={() => setDialog({ kind: 'room' })}><Plus size={14} /> Room</button>
                    <button type="button" className="bd-btn bd-btn-sm" onClick={() => setDialog({ kind: 'many' })}><Plus size={14} /> Many rooms</button>
                  </div>
                )}
              </div>
            </div>

            {h.rooms.length === 0 ? (
              <div className="bd-card"><div className="bd-empty"><DoorOpen size={30} />
                <p><strong>No rooms yet.</strong> {h.canEdit ? 'Add them one at a time, or number a whole floor in one go with "Many rooms".' : 'The head of boarding adds the rooms.'}</p>
                {h.canEdit && h.active && <div className="bd-row" style={{ justifyContent: 'center' }}>
                  <button type="button" className="bd-btn" onClick={() => setDialog({ kind: 'many' })}><Plus size={15} /> Many rooms</button>
                  <button type="button" className="bd-btn-ghost" onClick={() => setDialog({ kind: 'room' })}><Plus size={15} /> One room</button>
                </div>}
              </div></div>
            ) : groups.length === 0 ? (
              <div className="bd-card"><div className="bd-empty"><Search size={26} /><p>No room matches.</p>
                <button type="button" className="bd-link" onClick={() => { setSearch(''); setFreeOnly(false); setSection('all'); }}>Show every room</button></div></div>
            ) : groups.map(g => (
              <section key={g.key} className="bd-card bd-floor" aria-label={g.title || 'Rooms'}>
                {g.title && (
                  <div className="bd-floor-head">
                    <h4>{g.title}</h4>
                    <span className="bd-chip">{g.rooms.length} room{g.rooms.length === 1 ? '' : 's'}</span>
                    <span className="bd-chip">{g.rooms.reduce((n, r) => n + (r.status === 'OPEN' ? r.free : 0), 0)} free beds</span>
                  </div>
                )}
                <div className="bd-rooms">
                  {g.rooms.map(r => <RoomTile key={r.id} room={r} hostel={h} onOpen={() => setOpenRoom(r.id)} />)}
                </div>
              </section>
            ))}

            {openRoom && (
              <RoomSheet hostel={h} room={openRoom} onClose={() => setOpenRoom(null)}
                onEdit={() => setDialog({ kind: 'room', room: openRoom })} />
            )}
            {dialog?.kind === 'hostel' && (
              <HostelDialog word={word} hostel={h} onClose={() => setDialog(null)} onSaved={() => { setDialog(null); refresh(); }} />
            )}
            {dialog?.kind === 'block' && (
              <BlockDialog hostelId={h.id} block={dialog.block} onClose={() => setDialog(null)}
                onSaved={() => { setDialog(null); if (dialog.block) setSection('all'); refresh(); }} />
            )}
            {dialog?.kind === 'room' && (
              <RoomDialog hostel={h} room={dialog.room} defaults={defaults} onClose={() => setDialog(null)}
                onSaved={() => { setDialog(null); refresh(); }} />
            )}
            {dialog?.kind === 'many' && (
              <GenerateDialog hostel={h} defaults={defaults} onClose={() => setDialog(null)} onSaved={() => { setDialog(null); refresh(); }} />
            )}
          </>
        )}
    </div>
  );
}

function RoomTile({ room: r, hostel, onOpen }: { room: Room; hostel: HostelDetail; onOpen: () => void }) {
  const full = r.free <= 0;
  const taken = r.capacity - r.free;
  const showDots = r.capacity <= 24;
  return (
    <button type="button" className={`bd-room${full ? ' is-full' : ''}${r.status === 'CLOSED' ? ' is-closed' : ''}`} onClick={onOpen}
      aria-label={`${r.display}: ${taken} of ${r.capacity} beds taken${r.status === 'CLOSED' ? ', closed' : ''}`}>
      <div className="bd-room-top">
        <span className="bd-room-name">{r.display}</span>
        <span className="bd-room-count">{taken}/{r.capacity}</span>
      </div>
      {showDots ? (
        <div className="bd-beds" aria-hidden>
          {Array.from({ length: r.capacity }, (_, i) => <span key={i} className={`bd-bed${i < taken ? ' is-taken' : ''}`} />)}
        </div>
      ) : (
        <div className={`bd-meter${full ? ' is-full' : taken / r.capacity >= 0.85 ? ' is-high' : ''}`} aria-hidden>
          <span style={{ width: `${Math.min(100, (taken / r.capacity) * 100)}%` }} />
        </div>
      )}
      <div className="bd-room-tags">
        {r.status === 'CLOSED' && <span className="bd-pill is-bad">Closed</span>}
        {full && r.status === 'OPEN' && <span className="bd-pill is-bad">Full</span>}
        {r.effectiveGender !== hostel.gender && <GenderPill gender={r.effectiveGender} />}
        {r.label && <span className="bd-chip">{r.label}</span>}
      </div>
    </button>
  );
}
