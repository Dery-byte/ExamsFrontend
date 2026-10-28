import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Building2, CalendarClock, ChevronRight, ClipboardList, Info, Loader2, MapPin, Play, Settings2, Users } from 'lucide-react';
import PageHeader from '../../../components/PageHeader';
import { useAuth } from '../../../contexts/AuthContext';
import {
  getAttendanceOptions, getAttendanceSessions, getClassrooms, type ClassScheduleItem, type SessionSummary,
} from '../../../api/attendance';
import StartSessionDialog from './StartSessionDialog';
import ClassroomsPanel from './ClassroomsPanel';
import SchedulePanel from './SchedulePanel';
import AttendanceRules from './AttendanceRules';
import { classTitle, errMsg, fmtDate, fmtTime, useAttendanceBase } from './shared';
import { tx } from '../../../utils/terms';
import './attendance.css';

type Tab = 'classes' | 'times' | 'rooms' | 'rules';

/** Staff: start and follow class attendance, keep class times and classrooms, and (SA / HOD) set the rules. */
export default function AttendanceHome() {
  const { user } = useAuth() as any;
  const role: string = user?.role ?? '';
  const canRules = role === 'SUPER_ADMIN' || role === 'ADMIN';
  const base = useAttendanceBase();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>(() => {
    try { return (sessionStorage.getItem('attendance_tab') as Tab) || 'classes'; } catch { return 'classes'; }
  });
  const choose = (t: Tab) => { setTab(t); try { sessionStorage.setItem('attendance_tab', t); } catch { /* ignore */ } };
  const [starting, setStarting] = useState<{ schedule: ClassScheduleItem | null } | null>(null);

  const options = useQuery({ queryKey: ['attendance', 'options'], queryFn: getAttendanceOptions, retry: false });
  const rooms = useQuery({ queryKey: ['attendance', 'classrooms'], queryFn: getClassrooms, enabled: options.isSuccess });
  const sessions = useQuery({ queryKey: ['attendance', 'sessions'], queryFn: getAttendanceSessions, enabled: options.isSuccess && tab === 'classes' });

  const openSession = (id: number) => navigate(`${base}/attendance/session/${id}`);
  const o = options.data;
  const canStart = !!o && (o.courses.length > 0 || o.programs.length > 0);

  const tabs: { key: Tab; label: string; Icon: any }[] = [
    { key: 'classes', label: 'Classes', Icon: ClipboardList },
    { key: 'times', label: 'Class times', Icon: CalendarClock },
    { key: 'rooms', label: 'Classrooms', Icon: Building2 },
    ...(canRules ? [{ key: 'rules' as Tab, label: 'Rules', Icon: Settings2 }] : []),
  ];

  return (
    <div className="at-page">
      <PageHeader title="Class Attendance" breadcrumbs={['Teaching', 'Attendance']} />

      <div className="at-tabs" role="tablist">
        {tabs.map(t => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} className={tab === t.key ? 'is-active' : ''} onClick={() => choose(t.key)}>
            <t.Icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {options.isLoading ? (
        <div className="at-card"><div className="at-empty"><Loader2 className="at-spin" size={22} /></div></div>
      ) : options.isError ? (
        tab === 'rules' && canRules ? <AttendanceRules /> : (
          <div className="at-card"><div className="at-alert is-warn" style={{ marginBottom: 0 }}><Info size={16} />
            <span>{errMsg(options.error, 'Class attendance is not available.')}{canRules ? ' Open the Rules tab to switch it on.' : ''}</span></div></div>
        )
      ) : o && (
        <>
          {tab === 'classes' && (
            <>
              <ModeNotice role={role} mode={o.mode} department={o.department} canStart={canStart} />

              {o.live.length > 0 && (
                <div className="at-card">
                  <h3 className="at-card-title" style={{ marginBottom: 10 }}><span className="at-pill is-live">Live</span> Running now</h3>
                  <div className="at-list">
                    {o.live.map(s => <SessionRow key={s.id} s={s} onOpen={() => openSession(s.id)} />)}
                  </div>
                </div>
              )}

              {canStart && (
                <div className="at-card">
                  <div className="at-card-head">
                    <div style={{ minWidth: 0 }}>
                      <h3 className="at-card-title"><Play size={18} /> Start a session</h3>
                      <div className="at-sub">{tx("Start it in class. Show the code on the projector, or read it out if there's no screen.")}</div>
                    </div>
                    <button className="at-btn" onClick={() => setStarting({ schedule: null })}><Play size={16} /> Start a session</button>
                  </div>
                  {o.today.length > 0 && (
                    <>
                      <h4 className="at-section-title" style={{ marginTop: 4 }}>Today's classes</h4>
                      <div className="at-list">
                        {o.today.map(t => (
                          <div key={t.id} className="at-item">
                            <div style={{ fontWeight: 800, color: '#1e293b', fontVariantNumeric: 'tabular-nums', minWidth: 96 }}>{t.startTime.slice(0, 5)}–{t.endTime.slice(0, 5)}</div>
                            <div className="at-item-main">
                              <div className="at-item-title">{classTitle(t.title)}</div>
                              {t.classroomName && <div className="at-meta"><span><MapPin size={12} /> {t.classroomName}</span></div>}
                            </div>
                            {t.startedToday ? <span className="at-pill is-present">Started</span>
                              : <button className="at-btn at-btn-sm" onClick={() => setStarting({ schedule: t })}><Play size={14} /> Start today's class</button>}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="at-card">
                <h3 className="at-card-title" style={{ marginBottom: 10 }}><Users size={18} /> Recent sessions</h3>
                {sessions.isLoading ? <div className="at-empty"><Loader2 className="at-spin" size={22} /></div>
                  : (sessions.data ?? []).length === 0 ? <div className="at-empty"><ClipboardList size={28} /><p>No sessions yet.</p></div>
                  : <div className="at-list">{(sessions.data ?? []).map(s => <SessionRow key={s.id} s={s} onOpen={() => openSession(s.id)} />)}</div>}
              </div>
            </>
          )}

          {tab === 'times' && <SchedulePanel options={o} classrooms={rooms.data ?? []} onStart={s => setStarting({ schedule: s })} />}
          {tab === 'rooms' && <ClassroomsPanel maxAccuracy={o.policy.maxAccuracyMeters} />}
          {tab === 'rules' && canRules && <AttendanceRules />}
        </>
      )}

      {starting && o && (
        <StartSessionDialog options={o} classrooms={rooms.data ?? []} schedule={starting.schedule}
          onClose={() => setStarting(null)} onStarted={id => { setStarting(null); openSession(id); }} />
      )}
    </div>
  );
}

function ModeNotice({ role, mode, department, canStart }: { role: string; mode: string; department: string | null; canStart: boolean }) {
  if (canStart) return null;
  const text = role === 'LECTURER' && mode === 'PROGRAMME'
    ? tx(`${department ?? 'Your department'} takes attendance by programme, so the HOD starts the sessions.`)
    : role === 'LECTURER' ? 'No courses are assigned to you yet, so there is nothing to take attendance for.'
    : 'There is nothing you can start attendance for yet. Check the Rules tab: attendance may be switched off, or set to the other mode.';
  return <div className="at-alert is-info"><Info size={16} /><span>{tx(text)}</span></div>;
}

function SessionRow({ s, onOpen }: { s: SessionSummary; onOpen: () => void }) {
  const c = s.counts ?? {};
  const present = (c.PRESENT ?? 0) + (c.LATE ?? 0);
  return (
    <button type="button" className="at-item is-clickable" onClick={onOpen} style={{ textAlign: 'left', width: '100%', font: 'inherit' }}>
      <div className="at-item-main">
        <div className="at-item-title">{classTitle(s.title)}</div>
        <div className="at-meta">
          <span>{fmtDate(s.openedAt)} · {fmtTime(s.openedAt)}</span>
          <span>Meeting {s.meetingNumber}</span>
          {s.topic && <span>{s.topic}</span>}
          {s.placeName && <span><MapPin size={12} /> {s.placeName}</span>}
        </div>
      </div>
      <div className="at-row">
        {s.live ? <span className="at-pill is-live">{s.phase === 'CHECK_IN' ? 'Check-in open' : s.phase === 'SECOND_CHECK' ? 'Second check' : 'In class'}</span>
          : s.counts && (
            <span className="at-counts">
              <span className="at-pill is-present">{present} present</span>
              {(c.ABSENT ?? 0) > 0 && <span className="at-pill is-absent">{c.ABSENT} absent</span>}
              {(c.PENDING ?? 0) > 0 && <span className="at-pill is-pending">{c.PENDING} waiting</span>}
            </span>
          )}
        <ChevronRight size={18} color="#94a3b8" />
      </div>
    </button>
  );
}
