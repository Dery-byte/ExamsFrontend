import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { BedDouble, Check, Loader2 } from 'lucide-react';
import AppModal from '../../../components/ui/AppModal';
import { getBoardingOverview, getHostel, type HostelGender, type Place, type Room, type StudentBrief } from '../../../api/boarding';
import { errMsg, freeBeds, GenderPill, PlacePath, residencyLabel } from './shared';

const admits = (g: HostelGender, s: StudentBrief['gender']) => g === 'MIXED' || (g === 'BOYS' && s === 'MALE') || (g === 'GIRLS' && s === 'FEMALE');

/** Why the student can't go into this room, as far as the page can tell (the server checks again). */
function roomProblem(r: Room, s: StudentBrief, currentRoomId?: number): string | null {
  if (r.status === 'CLOSED') return 'Closed';
  if (!admits(r.effectiveGender, s.gender)) return s.gender ? `${r.effectiveGender === 'BOYS' ? 'Boys' : 'Girls'} only` : 'Record gender first';
  if (r.effectiveLevels && s.level != null && !r.effectiveLevels.split(',').map(Number).includes(s.level)) return 'Other levels';
  if (r.free <= 0 && r.id !== currentRoomId) return 'Full';
  return null;
}

/**
 * Choose where a student goes: hostel → block → floor → room → bed (bed optional). Rooms that are
 * closed, full or for the other gender are shown but can't be picked.
 */
export default function PlacePicker({ title, student, current, residency, needsBoarder, onClose, onPick, confirmLabel = 'Give this room' }: {
  title: string; student: StudentBrief; current?: Place | null; residency?: string | null; needsBoarder?: boolean;
  onClose: () => void; onPick: (roomId: number, bed: number | null) => Promise<void>; confirmLabel?: string;
}) {
  const overview = useQuery({ queryKey: ['boarding', 'overview', false], queryFn: () => getBoardingOverview(false) });
  const hostels = (overview.data?.hostels ?? []).filter(h => h.canManage);
  const [hostelId, setHostelId] = useState<number | null>(current?.hostelId ?? null);
  useEffect(() => {
    if (hostelId == null && hostels.length > 0) {
      const fit = hostels.find(h => admits(h.gender, student.gender) && h.free > 0) ?? hostels[0];
      setHostelId(fit.id);
    }
  }, [hostels, hostelId, student.gender]);

  const detail = useQuery({ queryKey: ['boarding', 'hostel', hostelId], queryFn: () => getHostel(hostelId!), enabled: hostelId != null });
  const h = detail.data;
  const [blockKey, setBlockKey] = useState<string>('all');
  const [roomId, setRoomId] = useState<number | null>(null);
  const [bed, setBed] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setBlockKey('all'); setRoomId(null); setBed(null); }, [hostelId]);
  useEffect(() => { setBed(null); }, [roomId]);

  const rooms = useMemo(() => (h?.rooms ?? []).filter(r =>
    blockKey === 'all' || (blockKey === 'main' ? r.blockId == null : String(r.blockId) === blockKey)), [h, blockKey]);
  const hasMain = (h?.rooms ?? []).some(r => r.blockId == null);
  const room = h?.rooms.find(r => r.id === roomId) ?? null;
  const floorName = (r: Room) => {
    const labels = r.blockId != null ? h?.blockList.find(b => b.id === r.blockId)?.floorLabels : h?.floorLabels;
    return labels && labels.length > 1 ? labels[r.floor] : null;
  };
  const beds = room ? freeBeds(room.capacity, room.occupants.filter(o => o.allocationId !== current?.allocationId).map(o => o.bed)) : [];
  const usable = rooms.filter(r => !roomProblem(r, student, current?.roomId));

  const pick = async () => {
    if (!room) return;
    setBusy(true);
    try { await onPick(room.id, bed); }
    catch (e) { toast.error(errMsg(e)); }
    finally { setBusy(false); }
  };

  return (
    <AppModal title={title} size="lg" onClose={onClose}
      subtitle={<>{student.name} · {student.username}{student.gender ? '' : ' · gender not recorded'}</>}
      meta={current ? <>Now: {current.short}</> : residency ? <>{residencyLabel(residency as any)}</> : undefined}
      footer={
        <div className="bd-row" style={{ width: '100%' }}>
          {room && <span className="bd-sub" style={{ margin: 0 }}>{room.display}{bed ? ` · Bed ${bed}` : ''}</span>}
          <span className="bd-spacer" />
          <button type="button" className="bd-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="bd-btn" onClick={pick} disabled={!room || busy}>
            {busy ? <Loader2 size={15} className="bd-spin" /> : <Check size={15} />} {confirmLabel}
          </button>
        </div>
      }>
      <div className="bd-sheet">
        {needsBoarder && (
          <div className="bd-alert is-warn"><BedDouble size={16} />
            <span>{student.name} is recorded as {residencyLabel(residency as any).toLowerCase()}. Giving a room makes them a boarder.</span></div>
        )}
        {overview.isLoading ? <div className="bd-empty"><Loader2 className="bd-spin" size={22} /></div>
          : hostels.length === 0 ? <div className="bd-empty"><p>There are no {overview.data?.settings.plural.toLowerCase() ?? 'hostels'} you look after yet.</p></div>
          : (
            <>
              <div className="bd-section-title" style={{ marginTop: 0 }}>{overview.data?.settings.word}</div>
              <div className="bd-chips">
                {hostels.map(x => (
                  <button key={x.id} type="button" className={`bd-chip-btn${x.id === hostelId ? ' is-on' : ''}`} onClick={() => setHostelId(x.id)}>
                    {x.name} <small>{x.free} free</small>
                  </button>
                ))}
              </div>

              {detail.isLoading ? <div className="bd-empty"><Loader2 className="bd-spin" size={22} /></div> : h && (
                <>
                  <div className="bd-row" style={{ marginTop: 10 }}><GenderPill gender={h.gender} />
                    {!admits(h.gender, student.gender) && <span className="bd-pill is-warn">Only rooms set differently fit {student.name.split(' ')[0]}</span>}
                  </div>
                  {h.blockList.length > 0 && (
                    <>
                      <div className="bd-section-title">Block</div>
                      <div className="bd-chips">
                        <button type="button" className={`bd-chip-btn${blockKey === 'all' ? ' is-on' : ''}`} onClick={() => setBlockKey('all')}>All</button>
                        {hasMain && <button type="button" className={`bd-chip-btn${blockKey === 'main' ? ' is-on' : ''}`} onClick={() => setBlockKey('main')}>Main building</button>}
                        {h.blockList.map(b => (
                          <button key={b.id} type="button" className={`bd-chip-btn${blockKey === String(b.id) ? ' is-on' : ''}`} onClick={() => setBlockKey(String(b.id))}>{b.name}</button>
                        ))}
                      </div>
                    </>
                  )}
                  <div className="bd-section-title">Room <span style={{ textTransform: 'none', fontWeight: 600 }}>· {usable.length} of {rooms.length} can take {student.name.split(' ')[0]}</span></div>
                  {rooms.length === 0 ? <div className="bd-empty"><p>No rooms here yet.</p></div> : (
                    <div className="bd-rooms" role="radiogroup" aria-label="Room">
                      {rooms.map(r => {
                        const problem = roomProblem(r, student, current?.roomId);
                        const on = r.id === roomId;
                        const fl = floorName(r);
                        return (
                          <button key={r.id} type="button" role="radio" aria-checked={on} disabled={!!problem}
                            className={`bd-room${on ? ' is-on' : ''}${r.free <= 0 ? ' is-full' : ''}${r.status === 'CLOSED' ? ' is-closed' : ''}`}
                            style={on ? { borderColor: 'var(--brand)', boxShadow: '0 0 0 3px rgba(var(--brand-rgb), 0.15)' } : problem ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
                            onClick={() => setRoomId(r.id)}>
                            <div className="bd-room-top">
                              <span className="bd-room-name">{r.display}</span>
                              <span className="bd-room-count">{r.capacity - r.free}/{r.capacity}</span>
                            </div>
                            <div className="bd-room-tags">
                              {fl && <span className="bd-chip">{fl}</span>}
                              {problem ? <span className="bd-chip" style={{ background: '#fdeeee', color: '#9f1f1f' }}>{problem}</span>
                                : <span className="bd-chip" style={{ background: '#e8f7ef', color: '#0b7a3e' }}>{r.free} free</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {room && (
                    <>
                      <div className="bd-section-title">Bed <span style={{ textTransform: 'none', fontWeight: 600 }}>· optional</span></div>
                      <div className="bd-chips" style={{ flexWrap: 'wrap' }}>
                        <button type="button" className={`bd-chip-btn${bed == null ? ' is-on' : ''}`} onClick={() => setBed(null)}>Any bed</button>
                        {beds.map(b => (
                          <button key={b} type="button" className={`bd-chip-btn${bed === b ? ' is-on' : ''}`} onClick={() => setBed(b)}>Bed {b}</button>
                        ))}
                      </div>
                      <div style={{ marginTop: 12 }}>
                        <PlacePath place={{ path: [h.name, ...(room.blockId ? [h.blockList.find(b => b.id === room.blockId)?.name ?? ''] : []),
                          ...(floorName(room) ? [floorName(room)!] : []), room.display, ...(bed ? [`Bed ${bed}`] : [])] }} />
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}
      </div>
    </AppModal>
  );
}
