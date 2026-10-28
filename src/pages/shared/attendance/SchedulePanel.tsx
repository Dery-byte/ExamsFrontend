import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CalendarClock, Loader2, MapPin, Pencil, Play, Plus, Trash2, XCircle } from 'lucide-react';
import AppModal from '../../../components/ui/AppModal';
import {
  deleteClassSchedule, getClassSchedules, saveClassSchedule,
  type AttendanceMode, type AttendanceOptions, type ClassScheduleItem, type Classroom,
} from '../../../api/attendance';
import { DAYS, classTitle, dayName, errMsg } from './shared';
import { levelName, tx, showLevelPicker } from '../../../utils/terms';

const todayName = () => DAYS[(new Date().getDay() + 6) % 7];

/** Weekly class times; today's appear on the Classes tab with a Start button. */
export default function SchedulePanel({ options, classrooms, onStart }: {
  options: AttendanceOptions; classrooms: Classroom[]; onStart: (s: ClassScheduleItem) => void;
}) {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ['attendance', 'schedules'], queryFn: getClassSchedules });
  const [editing, setEditing] = useState<ClassScheduleItem | 'new' | null>(null);
  const canAdd = options.courses.length > 0 || options.programs.length > 0;
  const today = todayName();

  const byDay = useMemo(() => DAYS.map(d => [d, data.filter(s => s.dayOfWeek === d)] as const).filter(([, l]) => l.length > 0), [data]);

  const remove = async (s: ClassScheduleItem) => {
    if (!window.confirm(`Delete ${s.title} on ${dayName(s.dayOfWeek)} at ${s.startTime.slice(0, 5)}?`)) return;
    try {
      await deleteClassSchedule(s.id);
      toast.success('Class time deleted');
      qc.invalidateQueries({ queryKey: ['attendance'] });
    } catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div className="at-card">
      <div className="at-card-head">
        <div style={{ minWidth: 0 }}>
          <h3 className="at-card-title"><CalendarClock size={18} /> Class times</h3>
          <div className="at-sub">{tx("When each class meets every week. On the day, it shows under Classes with a one-tap Start.")}</div>
        </div>
        {canAdd && <button className="at-btn" onClick={() => setEditing('new')}><Plus size={16} /> Add class time</button>}
      </div>

      {isLoading ? <div className="at-empty"><Loader2 className="at-spin" size={22} /></div>
        : byDay.length === 0 ? <div className="at-empty"><CalendarClock size={28} /><p>No class times yet.</p></div>
        : byDay.map(([day, list]) => (
          <section key={day} style={{ marginBottom: 12 }}>
            <h4 className="at-section-title" style={{ marginTop: 4 }}>{dayName(day)}{day === today ? ' · today' : ''}</h4>
            <div className="at-list">
              {list.map(s => (
                <div key={s.id} className="at-item">
                  <div style={{ fontWeight: 800, color: '#1e293b', fontVariantNumeric: 'tabular-nums', minWidth: 96 }}>{s.startTime.slice(0, 5)}–{s.endTime.slice(0, 5)}</div>
                  <div className="at-item-main">
                    <div className="at-item-title">{classTitle(s.title)}</div>
                    {s.classroomName && <div className="at-meta"><span><MapPin size={12} /> {s.classroomName}</span></div>}
                  </div>
                  <div className="at-row">
                    {day === today && <button className="at-btn at-btn-sm" onClick={() => onStart(s)}><Play size={14} /> Start</button>}
                    <button className="at-icon-btn" aria-label="Edit class time" onClick={() => setEditing(s)}><Pencil size={15} /></button>
                    <button className="at-icon-btn" aria-label="Delete class time" onClick={() => remove(s)}><Trash2 size={15} /></button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

      {editing && <ScheduleDialog item={editing === 'new' ? null : editing} options={options} classrooms={classrooms}
        onClose={() => setEditing(null)} onSaved={() => { setEditing(null); qc.invalidateQueries({ queryKey: ['attendance'] }); }} />}
    </div>
  );
}

function ScheduleDialog({ item, options, classrooms, onClose, onSaved }: {
  item: ClassScheduleItem | null; options: AttendanceOptions; classrooms: Classroom[]; onClose: () => void; onSaved: () => void;
}) {
  const [scope, setScope] = useState<AttendanceMode>(item?.scope ?? (options.courses.length ? 'COURSE' : 'PROGRAMME'));
  const [courseId, setCourseId] = useState<number | ''>(item?.courseId ?? '');
  const [programId, setProgramId] = useState<number | ''>(item?.programId ?? '');
  const [level, setLevel] = useState<number | ''>(item?.level ?? '');
  const [day, setDay] = useState(item?.dayOfWeek ?? todayName());
  const [start, setStart] = useState(item?.startTime.slice(0, 5) ?? '08:00');
  const [end, setEnd] = useState(item?.endTime.slice(0, 5) ?? '10:00');
  const [classroomId, setClassroomId] = useState<number | ''>(item?.classroomId ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const program = options.programs.find(p => p.id === programId);
  const courseKnown = item?.courseId == null || options.courses.some(c => c.id === item.courseId);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveClassSchedule({
        scope, dayOfWeek: day, startTime: start, endTime: end, classroomId: classroomId === '' ? null : Number(classroomId),
        ...(scope === 'COURSE' ? { courseId: Number(courseId) } : { programId: Number(programId), level: level === '' ? null : Number(level) }),
      }, item?.id);
      toast.success('Class time saved');
      onSaved();
    } catch (e) {
      setError(errMsg(e, 'Could not save the class time.'));
    } finally {
      setSaving(false);
    }
  };

  const ready = (scope === 'COURSE' ? courseId !== '' : programId !== '') && start && end;
  return (
    <AppModal title={item ? 'Edit class time' : 'Add a class time'} onClose={onClose}
      footer={
        <div className="at-row" style={{ width: '100%', justifyContent: 'flex-end' }}>
          <button className="at-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="at-btn" onClick={save} disabled={saving || !ready}>{saving ? <Loader2 size={16} className="at-spin" /> : null} Save</button>
        </div>
      }>
      <div className="at-page" style={{ paddingBottom: 0 }}>
        <div className="at-form-grid">
          {options.courses.length > 0 && options.programs.length > 0 && (
            <label className="at-field at-span-2"><span>For</span>
              <select className="at-select" value={scope} onChange={e => setScope(e.target.value as AttendanceMode)}>
                <option value="COURSE">{tx('A course')}</option>
                <option value="PROGRAMME">{tx('A programme')}</option>
              </select></label>
          )}
          {scope === 'COURSE' ? (
            <label className="at-field at-span-2"><span>{tx('Course')}</span>
              <select className="at-select" value={courseId} onChange={e => setCourseId(e.target.value ? Number(e.target.value) : '')}>
                <option value="">{tx('Choose a course…')}</option>
                {!courseKnown && item && <option value={item.courseId!}>{item.title}</option>}
                {options.courses.map(c => <option key={c.id} value={c.id}>{[c.code, c.title].filter(Boolean).join(' · ')}</option>)}
              </select></label>
          ) : (
            <>
              <label className="at-field"><span>{tx('Programme')}</span>
                <select className="at-select" value={programId} onChange={e => { setProgramId(e.target.value ? Number(e.target.value) : ''); setLevel(''); }}>
                  <option value="">{tx('Choose a programme…')}</option>
                  {options.programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select></label>
              {showLevelPicker(program?.levels.length ?? 0) && <label className="at-field"><span>{tx('Level')}</span>
                <select className="at-select" value={level} onChange={e => setLevel(e.target.value ? Number(e.target.value) : '')}>
                  <option value="">{tx('Every level')}</option>
                  {program?.levels.map(l => <option key={l} value={l}>{levelName(l)}</option>)}
                </select></label>}
            </>
          )}
          <label className="at-field at-span-2"><span>Day</span>
            <select className="at-select" value={day} onChange={e => setDay(e.target.value)}>
              {DAYS.map(d => <option key={d} value={d}>{dayName(d)}</option>)}
            </select></label>
          <label className="at-field"><span>Starts</span><input className="at-input" type="time" value={start} onChange={e => setStart(e.target.value)} /></label>
          <label className="at-field"><span>Ends</span><input className="at-input" type="time" value={end} onChange={e => setEnd(e.target.value)} /></label>
          <label className="at-field at-span-2"><span>Classroom (optional)</span>
            <select className="at-select" value={classroomId} onChange={e => setClassroomId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">No saved room (use my location when starting)</option>
              {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}{c.building ? `, ${c.building}` : ''}</option>)}
            </select></label>
        </div>
        {error && <div className="at-alert is-error" role="alert" style={{ marginTop: 12, marginBottom: 0 }}><XCircle size={16} /><span>{error}</span></div>}
      </div>
    </AppModal>
  );
}
