import { useEffect, useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { CalendarDays, Clock, AlertTriangle, Loader2, GraduationCap } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { getPrograms, getProgramsByDept, getTimetable, saGetDepartments } from '../../api/endpoints';
import { tx } from '../../utils/terms';

const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const fmtTime = (t: string) => (t ?? '').slice(0, 5);
const fmtDay = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/** Exam timetable: students see their own assessments; staff see what they manage, with clash warnings. */
export default function Timetable() {
  const { user } = useAuth() as any;
  const role: string = user?.role ?? '';
  const isStudent = role === 'NORMAL';
  const isSuper = role === 'SUPER_ADMIN';
  const canFilterScope = isSuper || role === 'ADMIN';

  const today = useMemo(() => new Date(), []);
  const [from, setFrom] = useState(iso(addDays(today, -7)));
  const [to, setTo] = useState(iso(addDays(today, 90)));
  const [departmentId, setDepartmentId] = useState<number | ''>('');
  const [programId, setProgramId] = useState<number | ''>('');
  const [level, setLevel] = useState('');
  const [departments, setDepartments] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);

  useEffect(() => {
    if (!canFilterScope) return;
    if (isSuper) {
      saGetDepartments().then((d: any) => setDepartments(Array.isArray(d) ? d : [])).catch(() => {});
      getPrograms().then((d: any) => setPrograms(Array.isArray(d) ? d : [])).catch(() => {});
    } else if (user?.department?.id) {
      getProgramsByDept(user.department.id).then((d: any) => setPrograms(Array.isArray(d) ? d : [])).catch(() => {});
    }
  }, [canFilterScope, isSuper, user]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['timetable', from, to, departmentId, programId, level],
    queryFn: () => getTimetable({ from, to, departmentId, programId, level }),
    placeholderData: keepPreviousData,
  });

  const items: any[] = data?.items ?? [];
  const byDay = useMemo(() => {
    const m = new Map<string, any[]>();
    items.forEach(i => { const k = String(i.date); m.set(k, [...(m.get(k) ?? []), i]); });
    return Array.from(m.entries());
  }, [items]);

  const todayIso = iso(today);
  const programOptions = isSuper && departmentId ? programs.filter(p => p.departmentId === departmentId) : programs;

  return (
    <div style={{ paddingBottom: 40 }}>
      <PageHeader title="Exam Timetable" breadcrumbs={['Assessments', 'Timetable']} />

      <div className="tt-filters">
        <label className="tt-field"><span>From</span>
          <input type="date" className="tt-input" value={from} onChange={e => setFrom(e.target.value)} /></label>
        <label className="tt-field"><span>To</span>
          <input type="date" className="tt-input" value={to} onChange={e => setTo(e.target.value)} /></label>
        {isSuper && (
          <label className="tt-field"><span>Department</span>
            <select className="tt-input" value={departmentId} onChange={e => { setDepartmentId(e.target.value ? Number(e.target.value) : ''); setProgramId(''); }}>
              <option value="">All</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select></label>
        )}
        {canFilterScope && (
          <>
            <label className="tt-field"><span>{tx("Program")}</span>
              <select className="tt-input" value={programId} onChange={e => setProgramId(e.target.value ? Number(e.target.value) : '')}>
                <option value="">All</option>
                {programOptions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select></label>
            <label className="tt-field"><span>{tx("Level")}</span>
              <select className="tt-input" value={level} onChange={e => setLevel(e.target.value)}>
                <option value="">All</option>
                {['100', '200', '300', '400', '500', '600'].map(l => <option key={l} value={l}>{tx("Level ")}{l}</option>)}
              </select></label>
          </>
        )}
      </div>

      {data?.clashCount > 0 && (
        <div className="tt-alert" role="status">
          <AlertTriangle size={16} />
          <span><strong>{data.clashCount}</strong> assessment{data.clashCount > 1 ? 's' : ''} overlap{isStudent ? ' in your timetable' : tx(' with another for the same program and level')}. They are marked below.</span>
        </div>
      )}

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Loader2 size={26} color="#5156be" className="tt-spin" /></div>
      ) : isError ? (
        <div className="tt-empty">Could not load the timetable.</div>
      ) : byDay.length === 0 ? (
        <div className="tt-empty"><CalendarDays size={32} /><p>No scheduled assessments in this period.</p></div>
      ) : byDay.map(([day, list]) => (
        <section key={day} className={`tt-day ${day < todayIso ? 'is-past' : ''}`}>
          <h2 className="tt-day-head">
            {fmtDay(day)}
            {day === todayIso && <span className="tt-today">Today</span>}
          </h2>
          {list.map(i => {
            const clash = i.clashesWith?.length > 0;
            const status = i.published ? (i.status === 'CLOSED' ? 'Closed' : 'Published') : i.autoOpen ? 'Opens automatically' : 'Draft';
            return (
              <article key={i.quizId} className={`tt-item ${clash ? 'has-clash' : ''}`}>
                <div className="tt-time">
                  <Clock size={14} />
                  <span>{fmtTime(i.startTime)} – {fmtTime(String(i.end).slice(11, 16))}</span>
                  <span className="tt-dur">{i.durationMinutes} min</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="tt-title">{i.courseCode && <strong>{i.courseCode}</strong>} {i.title}</div>
                  <div className="tt-meta">
                    {i.courseTitle && <span>{i.courseTitle}</span>}
                    {i.level && <span><GraduationCap size={12} /> {tx("Level ")}{i.level}</span>}
                    {!isStudent && i.programs?.length > 0 && <span>{i.programs.join(', ')}</span>}
                    {!isStudent && i.lecturer && <span>{i.lecturer}</span>}
                  </div>
                  {clash && (
                    <div className="tt-clash"><AlertTriangle size={12} /> Overlaps with {i.clashesWith.map((c: any) => `${c.courseCode ? c.courseCode + ' ' : ''}${c.title}`).join('; ')}</div>
                  )}
                </div>
                {!isStudent && <span className={`tt-status ${i.published ? 'on' : ''}`}>{status}</span>}
              </article>
            );
          })}
        </section>
      ))}

      <style>{`
        .tt-filters { display: flex; flex-wrap: wrap; gap: 10px; padding: 12px 14px; background: #fff; border: 1.5px solid #e2e8f0; border-radius: 12px; margin-bottom: 14px; }
        .tt-field { display: flex; flex-direction: column; gap: 4px; font-size: 11.5px; font-weight: 700; color: #64748b; flex: 1 1 150px; }
        .tt-input { height: 36px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 13px; padding: 0 10px; background: #f8fafc; color: #1e293b; font-family: inherit; }
        .tt-alert { display: flex; gap: 8px; align-items: center; padding: 10px 14px; border-radius: 10px; background: #fdeeee; color: #9f1f1f; font-size: 13px; margin-bottom: 14px; }
        .tt-day { margin-bottom: 16px; }
        .tt-day.is-past { opacity: 0.6; }
        .tt-day-head { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 800; color: #334155; margin: 0 0 8px; }
        .tt-today { font-size: 11px; font-weight: 800; background: #5156be; color: #fff; padding: 2px 8px; border-radius: 10px; }
        .tt-item { display: flex; gap: 16px; align-items: flex-start; background: #fff; border: 1.5px solid #e2e8f0; border-left: 4px solid #5156be; border-radius: 10px; padding: 12px 14px; margin-bottom: 8px; }
        .tt-item.has-clash { border-left-color: #d03b3b; }
        .tt-time { display: flex; flex-direction: column; gap: 2px; min-width: 110px; font-weight: 800; color: #1e293b; font-size: 13.5px; font-variant-numeric: tabular-nums; }
        .tt-time svg { color: #5156be; }
        .tt-dur { font-size: 11.5px; font-weight: 600; color: #94a3b8; }
        .tt-title { font-size: 14.5px; color: #1e293b; font-weight: 600; }
        .tt-meta { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 12px; color: #64748b; margin-top: 4px; }
        .tt-meta span { display: inline-flex; align-items: center; gap: 4px; }
        .tt-clash { display: inline-flex; gap: 5px; align-items: center; margin-top: 6px; font-size: 12px; font-weight: 700; color: #9f1f1f; background: #fdeeee; padding: 3px 8px; border-radius: 6px; }
        .tt-status { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 6px; background: #f1f5f9; color: #475569; white-space: nowrap; }
        .tt-status.on { background: #eef2ff; color: #4338ca; }
        .tt-empty { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 48px 16px; color: #94a3b8; background: #fff; border: 1.5px dashed #e2e8f0; border-radius: 12px; text-align: center; }
        .tt-empty p { margin: 0; }
        .tt-spin { animation: tt-spin 1s linear infinite; }
        @keyframes tt-spin { to { transform: rotate(360deg); } }
        @media (max-width: 600px) { .tt-item { flex-wrap: wrap; gap: 8px; } .tt-time { flex-direction: row; align-items: center; gap: 8px; min-width: 0; } }
      `}</style>
    </div>
  );
}
