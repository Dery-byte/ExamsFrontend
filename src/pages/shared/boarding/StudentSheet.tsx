import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { BedDouble, DoorOpen, Loader2, LogOut, MoveRight, Save } from 'lucide-react';
import AppModal from '../../../components/ui/AppModal';
import { assignRoom, getStudentBoarding, moveStudent, updateStudentBoarding, vacateRoom } from '../../../api/boarding';
import { useBoarding } from '../../../hooks/useFeatureFlags';
import PlacePicker from './PlacePicker';
import { HistoryList } from './RoomSheet';
import { Avatar, errMsg, levelText, PlacePath, residencyLabel, useBoardingBase } from './shared';

/** A student as boarding sees them: gender, residency, where they sleep now, their past rooms, and the actions. */
export default function StudentSheet({ studentId, onClose }: { studentId: number; onClose: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const base = useBoardingBase();
  const { mode } = useBoarding();
  const q = useQuery({ queryKey: ['boarding', 'student', studentId], queryFn: () => getStudentBoarding(studentId) });
  const s = q.data;
  const [gender, setGender] = useState<string | null>(null);
  const [residency, setResidency] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState<'give' | 'move' | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ['boarding'] });

  const g = gender ?? s?.gender ?? '';
  const r = residency ?? s?.residency ?? '';
  const dirty = !!s && (g !== (s.gender ?? '') || (mode === 'BOTH' && r !== (s.residency ?? '')));

  const save = async () => {
    if (!s) return;
    if (mode === 'BOTH' && r !== 'BOARDING' && s.place && !window.confirm(`${s.name} will leave ${s.place.short} because they are no longer a boarder. Continue?`)) return;
    setBusy(true);
    try {
      await updateStudentBoarding(s.id, { gender: g, ...(mode === 'BOTH' ? { residency: r } : {}) });
      toast.success(`${s.name} saved`);
      setGender(null); setResidency(null); refresh();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const vacate = async () => {
    if (!s?.place?.allocationId) return;
    const note = window.prompt(`Take ${s.name} out of ${s.place.short}? Add a note if you like.`, '');
    if (note === null) return;
    setBusy(true);
    try { toast.success((await vacateRoom(s.place.allocationId, note)).message); refresh(); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <>
      <AppModal title={s?.name ?? 'Student'} size="lg" onClose={onClose} subtitle={s ? `${s.username}${s.programme ? ` · ${s.programme}` : ''}` : undefined}
        footer={s && (
          <div className="bd-row" style={{ width: '100%' }}>
            {s.place && s.canManage && <button type="button" className="bd-btn-danger" onClick={vacate} disabled={busy}><LogOut size={15} /> Vacate</button>}
            <span className="bd-spacer" />
            {s.place && <button type="button" className="bd-btn-ghost" onClick={() => { onClose(); navigate(`${base}/boarding/${s.place!.hostelId}?room=${s.place!.roomId}`); }}><DoorOpen size={15} /> Open room</button>}
            {s.place && s.canManage && <button type="button" className="bd-btn-ghost" onClick={() => setPicking('move')} disabled={busy}><MoveRight size={15} /> Move</button>}
            {!s.place && s.enabled && <button type="button" className="bd-btn" onClick={() => setPicking('give')} disabled={busy}><BedDouble size={15} /> Give a room</button>}
          </div>
        )}>
        {q.isLoading ? <div className="bd-empty"><Loader2 className="bd-spin" size={22} /></div>
          : q.isError ? <div className="bd-alert is-error">{errMsg(q.error)}</div>
          : s && (
            <div className="bd-sheet">
              <div className="bd-row" style={{ marginBottom: 14, flexWrap: 'nowrap' }}>
                <Avatar name={s.name} photo={s.photo} size="lg" />
                <div style={{ minWidth: 0 }}>
                  {s.place ? <PlacePath place={s.place} /> : <span className="bd-pill is-warn">{s.residency === 'BOARDING' ? 'No room yet' : residencyLabel(s.residency)}</span>}
                  <div className="bd-meta">{s.level != null && <span>{levelText(s.level)}</span>}{!s.enabled && <span style={{ color: '#b42318' }}>Account deactivated</span>}</div>
                </div>
              </div>

              <div className="bd-form">
                <label className="bd-field">Gender
                  <select className="bd-select" value={g} onChange={e => setGender(e.target.value)} disabled={!s.canManage}>
                    <option value="">Not recorded</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </label>
                {mode === 'BOTH' && (
                  <label className="bd-field">Residency
                    <select className="bd-select" value={r} onChange={e => setResidency(e.target.value)} disabled={!s.canManage}>
                      <option value="">Not recorded</option>
                      <option value="BOARDING">Boarder</option>
                      <option value="DAY">Day student</option>
                    </select>
                  </label>
                )}
              </div>
              {dirty && (
                <div className="bd-row" style={{ marginTop: 10, justifyContent: 'flex-end' }}>
                  <button type="button" className="bd-btn-ghost bd-btn-sm" onClick={() => { setGender(null); setResidency(null); }} disabled={busy}>Undo</button>
                  <button type="button" className="bd-btn bd-btn-sm" onClick={save} disabled={busy}>{busy ? <Loader2 size={14} className="bd-spin" /> : <Save size={14} />} Save</button>
                </div>
              )}

              <div className="bd-section-title">Rooms over time</div>
              {s.history.length === 0 ? <div className="bd-empty" style={{ padding: 18 }}><p>No room yet.</p></div> : <HistoryList rows={s.history} show="place" />}
            </div>
          )}
      </AppModal>

      {picking && s && (
        <PlacePicker title={picking === 'move' ? `Move ${s.name}` : `Give ${s.name} a room`} student={s}
          current={picking === 'move' ? s.place : null} residency={s.residency}
          needsBoarder={picking === 'give' && mode === 'BOTH' && s.residency !== 'BOARDING'}
          confirmLabel={picking === 'move' ? 'Move here' : 'Give this room'}
          onClose={() => setPicking(null)}
          onPick={async (roomId, bed) => {
            const p = picking === 'move' && s.place?.allocationId
              ? await moveStudent(s.place.allocationId, { roomId, bed })
              : await assignRoom({ studentId: s.id, roomId, bed, makeBoarder: mode === 'BOTH' && s.residency !== 'BOARDING' });
            toast.success(`${s.name}: ${p.short}`);
            setPicking(null); refresh();
          }} />
      )}
    </>
  );
}
