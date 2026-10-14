import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Building2, Crosshair, Loader2, MapPin, Pencil, Plus, Ruler, Trash2, XCircle, CheckCircle2 } from 'lucide-react';
import AppModal from '../../../components/ui/AppModal';
import { deleteClassroom, getClassrooms, saveClassroom, type Classroom } from '../../../api/attendance';
import { saGetDepartments } from '../../../api/endpoints';
import { distanceMeters, measureRoom, readLocation, LocationError, GUESSED_LOCATION_METERS, type RoomMeasurement } from '../../../utils/attendanceDevice';
import { errMsg } from './shared';
import { useAuth } from '../../../contexts/AuthContext';

const PRESETS = [
  { value: 25, label: 'Small room · 25 m' },
  { value: 35, label: 'Classroom · 35 m' },
  { value: 50, label: 'Lecture hall · 50 m' },
  { value: 75, label: 'Large hall · 75 m' },
];

/** Saved classrooms: measure a room once, then test spots in it before relying on the distance. */
export default function ClassroomsPanel({ maxAccuracy }: { maxAccuracy: number }) {
  const qc = useQueryClient();
  const { data: rooms = [], isLoading } = useQuery({ queryKey: ['attendance', 'classrooms'], queryFn: getClassrooms });
  const [editing, setEditing] = useState<Classroom | 'new' | null>(null);
  const [testing, setTesting] = useState<Classroom | null>(null);

  const remove = async (r: Classroom) => {
    if (!window.confirm(`Delete ${r.name}? Class times that use it will no longer have a room.`)) return;
    try {
      await deleteClassroom(r.id);
      toast.success('Classroom deleted');
      qc.invalidateQueries({ queryKey: ['attendance'] });
    } catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div className="at-card">
      <div className="at-card-head">
        <div style={{ minWidth: 0 }}>
          <h3 className="at-card-title"><Building2 size={18} /> Classrooms</h3>
          <div className="at-sub">Measure each room once from its centre with a phone. Then use <b>Test a spot</b> from the back and the doorway to check the allowed distance.</div>
        </div>
        <button className="at-btn" onClick={() => setEditing('new')}><Plus size={16} /> Add classroom</button>
      </div>

      {isLoading ? <div className="at-empty"><Loader2 className="at-spin" size={22} /></div>
        : rooms.length === 0 ? <div className="at-empty"><MapPin size={28} /><p>No classrooms saved yet. Saved rooms are more precise than a lecturer's reading at the start of each class.</p></div>
        : (
          <div className="at-list">
            {rooms.map(r => (
              <div key={r.id} className="at-item">
                <div className="at-item-main">
                  <div className="at-item-title">{r.name}{r.building ? <span className="at-muted" style={{ fontWeight: 600 }}> · {r.building}</span> : null}</div>
                  <div className="at-meta">
                    <span><Ruler size={12} /> {r.radiusMeters} m allowed</span>
                    {r.measuredAccuracyMeters != null && <span><Crosshair size={12} /> measured ±{r.measuredAccuracyMeters} m</span>}
                    <span>{r.departmentName ?? 'All departments'}</span>
                    {r.createdBy && <span>by {r.createdBy}</span>}
                  </div>
                </div>
                <div className="at-row">
                  <button className="at-btn-ghost at-btn-sm" onClick={() => setTesting(r)}><Crosshair size={14} /> Test a spot</button>
                  {r.canEdit && <button className="at-icon-btn" aria-label={`Edit ${r.name}`} onClick={() => setEditing(r)}><Pencil size={15} /></button>}
                  {r.canEdit && <button className="at-icon-btn" aria-label={`Delete ${r.name}`} onClick={() => remove(r)}><Trash2 size={15} /></button>}
                </div>
              </div>
            ))}
          </div>
        )}

      {editing && <ClassroomDialog room={editing === 'new' ? null : editing} onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); qc.invalidateQueries({ queryKey: ['attendance'] }); }} />}
      {testing && <LocationTestDialog room={testing} maxAccuracy={maxAccuracy} onClose={() => setTesting(null)} />}
    </div>
  );
}

function ClassroomDialog({ room, onClose, onSaved }: { room: Classroom | null; onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth() as any;
  const isSuper = user?.role === 'SUPER_ADMIN';
  const [name, setName] = useState(room?.name ?? '');
  const [building, setBuilding] = useState(room?.building ?? '');
  const [departmentId, setDepartmentId] = useState<number | ''>(room?.departmentId ?? '');
  const [departments, setDepartments] = useState<any[]>([]);
  const [radius, setRadius] = useState(room?.radiusMeters ?? 35);
  const [point, setPoint] = useState<RoomMeasurement | null>(room ? { latitude: room.latitude, longitude: room.longitude, accuracy: room.measuredAccuracyMeters ?? 0, readings: 0 } : null);
  const [measuring, setMeasuring] = useState<{ best: number; readings: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const stopRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (isSuper) saGetDepartments().then((d: any) => setDepartments(Array.isArray(d) ? d : [])).catch(() => {});
  }, [isSuper]);
  useEffect(() => () => stopRef.current(), []);

  const measure = async () => {
    setError(null);
    setMeasuring({ best: 0, readings: 0 });
    const m = measureRoom({ durationMs: 20000, onUpdate: (b, n) => setMeasuring({ best: Math.round(b.accuracy), readings: n }) });
    stopRef.current = m.stop;
    try {
      setPoint(await m.promise);
    } catch (e: any) {
      setError(e instanceof LocationError ? e.message : 'Could not measure the location.');
    } finally {
      setMeasuring(null);
    }
  };

  const save = async () => {
    if (!point) return;
    setSaving(true);
    setError(null);
    try {
      await saveClassroom({
        name: name.trim(), building: building.trim() || undefined, departmentId: isSuper ? (departmentId === '' ? null : Number(departmentId)) : undefined,
        latitude: point.latitude, longitude: point.longitude, radiusMeters: radius, accuracyMeters: point.readings > 0 ? point.accuracy : undefined,
      }, room?.id);
      toast.success('Classroom saved');
      onSaved();
    } catch (e) {
      setError(errMsg(e, 'Could not save the classroom.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal
      title={room ? `Edit ${room.name}` : 'Add a classroom'}
      subtitle="Stand in the middle of the room with a phone (GPS on) to measure it."
      onClose={onClose}
      footer={
        <div className="at-row" style={{ width: '100%', justifyContent: 'flex-end' }}>
          <button className="at-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="at-btn" onClick={save} disabled={saving || !!measuring || !point || !name.trim() || (point.readings > 0 && point.accuracy > GUESSED_LOCATION_METERS)}>
            {saving ? <Loader2 size={16} className="at-spin" /> : null} Save classroom
          </button>
        </div>
      }
    >
      <div className="at-page" style={{ paddingBottom: 0 }}>
        <div className="at-form-grid">
          <label className="at-field"><span>Room name</span>
            <input className="at-input" value={name} maxLength={100} onChange={e => setName(e.target.value)} placeholder="e.g. LT 2" /></label>
          <label className="at-field"><span>Building (optional)</span>
            <input className="at-input" value={building} maxLength={100} onChange={e => setBuilding(e.target.value)} placeholder="e.g. Science Block" /></label>
          {isSuper && (
            <label className="at-field at-span-2"><span>Department</span>
              <select className="at-select" value={departmentId} onChange={e => setDepartmentId(e.target.value ? Number(e.target.value) : '')}>
                <option value="">All departments (shared room)</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select></label>
          )}
        </div>

        <h4 className="at-section-title">Location</h4>
        <div className="at-measure">
          {measuring ? (
            <div className="at-row">
              <Loader2 size={18} className="at-spin" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="at-measure-num">{measuring.readings ? `±${measuring.best} m` : 'Waiting for GPS…'}</div>
                <div className="at-sub">{measuring.readings} reading{measuring.readings === 1 ? '' : 's'} so far. Keep still for up to 20 seconds.</div>
              </div>
              <button className="at-btn-ghost at-btn-sm" onClick={() => stopRef.current()} disabled={!measuring.readings}>Use these</button>
            </div>
          ) : point ? (
            <div className="at-row">
              <CheckCircle2 size={18} color="#0b7a3e" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, color: '#1e293b' }}>{point.readings > 0 ? `Measured: ±${point.accuracy} m from ${point.readings} readings` : 'Location saved'}</div>
                <div className="at-sub">{point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}</div>
              </div>
              <button className="at-btn-ghost at-btn-sm" onClick={measure}><Crosshair size={14} /> Measure again</button>
            </div>
          ) : (
            <button className="at-btn at-btn-block" onClick={measure}><Crosshair size={16} /> Measure this room now</button>
          )}
          {point && point.readings > 0 && point.accuracy > GUESSED_LOCATION_METERS ? (
            <p className="at-help" style={{ color: '#9f1f1f' }}>This device can't find where it is: it is only guessing from the internet connection. Measure the room with a phone that has location (GPS) on.</p>
          ) : point && point.readings > 0 && point.accuracy > 20 && (
            <p className="at-help" style={{ color: '#8a5a00' }}>That reading is rough. Indoors GPS is weaker; try again near the middle of the room, or by a window.</p>
          )}
        </div>

        <h4 className="at-section-title">Allowed distance</h4>
        <div className="at-form-grid">
          <label className="at-field"><span>Room size</span>
            <select className="at-select" value={PRESETS.some(p => p.value === radius) ? radius : ''} onChange={e => e.target.value && setRadius(Number(e.target.value))}>
              {PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              {!PRESETS.some(p => p.value === radius) && <option value="">Custom</option>}
            </select></label>
          <label className="at-field"><span>Metres from the centre</span>
            <input className="at-input" type="number" min={10} max={300} value={radius} onChange={e => setRadius(Number(e.target.value) || 0)} /></label>
        </div>
        <p className="at-help">A student passes only if their distance <b>plus</b> their reading's accuracy fits inside this. After saving, use <b>Test a spot</b> from the corners of the room.</p>
        {error && <div className="at-alert is-error" role="alert" style={{ marginTop: 12, marginBottom: 0 }}><XCircle size={16} /><span>{error}</span></div>}
      </div>
    </AppModal>
  );
}

interface TestResult { distance: number; accuracy: number; pass: boolean; at: string }

/** Takes a reading where the tester stands and shows whether a student there would be accepted. */
function LocationTestDialog({ room, maxAccuracy, onClose }: { room: Classroom; maxAccuracy: number; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState<number | null>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const test = async () => {
    setBusy(true);
    setError(null);
    setLive(null);
    try {
      const r = await readLocation({ goodEnough: 8, maxWaitMs: 12000, onUpdate: x => setLive(Math.round(x.accuracy)) });
      const d = Math.round(distanceMeters(room, r));
      const acc = Math.ceil(r.accuracy);
      setResults(list => [{ distance: d, accuracy: acc, pass: acc <= maxAccuracy && d + acc <= room.radiusMeters, at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }, ...list].slice(0, 8));
    } catch (e: any) {
      setError(e instanceof LocationError ? e.message : 'Could not read the location.');
    } finally {
      setBusy(false);
    }
  };

  const last = results[0];
  return (
    <AppModal title={`Test a spot in ${room.name}`} subtitle={`Allowed: distance + accuracy within ${room.radiusMeters} m, accuracy ±${maxAccuracy} m or better.`} onClose={onClose}>
      <div className="at-page" style={{ paddingBottom: 0 }}>
        <p className="at-help" style={{ marginTop: 0, marginBottom: 12 }}>Stand where a student would sit (the back row, a corner) and test. Then step outside the door and test again: that should fail.</p>
        <button className="at-btn at-btn-block at-btn-big" onClick={test} disabled={busy}>
          {busy ? <><Loader2 size={18} className="at-spin" /> Reading{live != null ? ` ±${live} m` : '…'}</> : <><Crosshair size={18} /> Test from where I stand</>}
        </button>
        {error && <div className="at-alert is-error" role="alert" style={{ marginTop: 12, marginBottom: 0 }}><XCircle size={16} /><span>{error}</span></div>}
        {last && (
          <div className={`at-verdict ${last.pass ? 'is-pass' : 'is-fail'}`} style={{ marginTop: 12 }} role="status">
            {last.pass ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
            <span>
              {last.pass ? 'A student here would be accepted.' : 'A student here would be refused.'}
              <span style={{ display: 'block', fontWeight: 600, fontSize: 12.5 }}>
                {last.accuracy > GUESSED_LOCATION_METERS
                  ? `This device is only guessing its location (±${Math.round(last.accuracy / 1000)} km). Test with a phone that has location (GPS) on.`
                  : <>{last.distance} m from the centre, accuracy ±{last.accuracy} m
                    {last.accuracy > maxAccuracy ? ' (too imprecise)' : ` (${last.distance + last.accuracy} m of ${room.radiusMeters} m)`}</>}
              </span>
            </span>
          </div>
        )}
        {results.length > 1 && (
          <div className="at-list" style={{ marginTop: 12 }}>
            {results.slice(1).map((r, i) => (
              <div key={i} className="at-item" style={{ padding: '8px 12px' }}>
                <span className="at-sub" style={{ marginTop: 0, flex: 1 }}>{r.at} · {r.distance} m · ±{r.accuracy} m</span>
                <span className={`at-pill ${r.pass ? 'is-present' : 'is-absent'}`}>{r.pass ? 'Accepted' : 'Refused'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppModal>
  );
}
