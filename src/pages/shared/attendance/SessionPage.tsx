import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  AlertTriangle, ArrowLeft, CheckCheck, Clock, Copy, DoorClosed, DoorOpen, Link2, Loader2, Lock, MapPin, Maximize2, Plus, ScanLine, Search,
  Share2, ShieldAlert, Smartphone, Square, Trash2, UserPlus, Users, XCircle,
} from 'lucide-react';
import QRCode from 'qrcode';
import ClassQr from './ClassQr';
import AppModal from '../../../components/ui/AppModal';
import PageHeader from '../../../components/PageHeader';
import {
  approvePendingAttendance, cancelSecondCheck, closeAttendanceCheckIn, deleteAttendanceSession, endAttendanceSession,
  extendAttendanceCheckIn, getAttendanceCode, getAttendanceSession, markAttendance, resetAttendancePhone,
  setAttendanceHeadcount, startSecondCheck, unlockAttendanceStudent, addAttendanceHelper, cancelAttendanceHelper,
  type AttendanceStatus, type SessionDetail, type SessionStudent,
} from '../../../api/attendance';
import { FLAG_LABELS, StatusPill, classTitle, errMsg, fmtClock, fmtDate, fmtTime, useAttendanceBase } from './shared';
import { tx } from '../../../utils/terms';
import './attendance.css';

type Filter = 'ALL' | 'IN' | 'PENDING' | 'NOT_YET' | 'ABSENT' | 'FLAGGED' | 'PHONE';

/** A class meeting: the code, live counts, controls, and every student on the list. */
export default function SessionPage() {
  const { id } = useParams();
  const sessionId = Number(id);
  const base = useAttendanceBase();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const detail = useQuery({
    queryKey: ['attendance', 'session', sessionId],
    queryFn: () => getAttendanceSession(sessionId),
    refetchInterval: q => (q.state.data?.live ? 5000 : false),
  });
  const s = detail.data;

  const [busy, setBusy] = useState<string | null>(null);
  const run = async (key: string, fn: () => Promise<SessionDetail | unknown>, ok?: string) => {
    setBusy(key);
    try {
      const r = await fn();
      if (r && typeof r === 'object' && 'students' in (r as any)) qc.setQueryData(['attendance', 'session', sessionId], r);
      qc.invalidateQueries({ queryKey: ['attendance', 'code', sessionId] });
      if (ok) toast.success(ok);
      return true;
    } catch (e) {
      toast.error(errMsg(e));
      return false;
    } finally {
      setBusy(null);
    }
  };

  if (detail.isLoading) return <div className="at-page"><div className="at-card"><div className="at-empty"><Loader2 className="at-spin" size={22} /></div></div></div>;
  if (detail.isError || !s) {
    return (
      <div className="at-page">
        <div className="at-card"><div className="at-alert is-error" style={{ marginBottom: 12 }}><XCircle size={16} /><span>{errMsg(detail.error, 'This session could not be loaded.')}</span></div>
          <button className="at-btn-ghost" onClick={() => navigate(`${base}/attendance`)}><ArrowLeft size={16} /> Back to attendance</button></div>
      </div>
    );
  }

  return (
    <div className="at-page">
      <PageHeader title={classTitle(s.title)} breadcrumbs={['Attendance', `Meeting ${s.meetingNumber}`]} />
      <div className="at-row" style={{ marginBottom: 12 }}>
        <button className="at-btn-ghost at-btn-sm" onClick={() => navigate(`${base}/attendance`)}><ArrowLeft size={14} /> All sessions</button>
        <span className="at-spacer" />
        {s.live ? <span className="at-pill is-live">Live</span> : <span className="at-pill is-notyet">Ended {fmtTime(s.closedAt)}</span>}
      </div>

      <div className="at-session-grid">
        <div className="at-session-side">
          {s.live ? (s.method === 'STAFF_SCAN' ? <ScanPanel s={s} run={run} />
            : <><CodePanel s={s} />{s.method === 'STUDENT_SCAN' && <HelpersCard s={s} run={run} />}</>) : (
            <div className="at-card">
              <div className="at-sub" style={{ marginTop: 0 }}>{fmtDate(s.openedAt)} · {fmtTime(s.openedAt)}–{fmtTime(s.closedAt)}</div>
              {s.topic && <div className="at-item-title" style={{ marginTop: 6 }}>{s.topic}</div>}
            </div>
          )}

          <Counts s={s} onHeadcount={n => run('headcount', () => setAttendanceHeadcount(s.id, n))} />

          <div className="at-card">
            <h3 className="at-card-title" style={{ marginBottom: 10 }}>Controls</h3>
            <div className="at-controls">
              {s.live && s.phase === 'CHECK_IN' && (
                <button className="at-btn-ghost" disabled={!!busy} onClick={() => run('close', () => closeAttendanceCheckIn(s.id), 'Check-in closed')}>
                  <DoorClosed size={16} /> Close check-in now</button>
              )}
              {s.live && s.phase !== 'CHECK_IN' && s.phase !== 'SECOND_CHECK' && (
                <button className="at-btn-ghost" disabled={!!busy} onClick={() => run('extend', () => extendAttendanceCheckIn(s.id, 5), 'Check-in reopened for 5 minutes')}>
                  <DoorOpen size={16} /> Reopen check-in (5 min)</button>
              )}
              {s.live && s.method !== 'STAFF_SCAN' && s.phase === 'IN_CLASS' && !s.secondCheckDone && (
                <button className="at-btn-ghost" disabled={!!busy} onClick={() => run('second', () => startSecondCheck(s.id), 'Second check started')}>
                  <ShieldAlert size={16} /> Start second check now</button>
              )}
              {s.live && s.secondCheckPlanned && (
                <button className="at-btn-ghost" disabled={!!busy} onClick={() => run('cancel2', () => cancelSecondCheck(s.id), 'Second check cancelled')}>
                  <XCircle size={16} /> Cancel the planned second check</button>
              )}
              {(s.counts.PENDING ?? 0) > 0 && (
                <button className="at-btn" disabled={!!busy} onClick={() => run('approve', () => approvePendingAttendance(s.id), 'Waiting check-ins approved')}>
                  <CheckCheck size={16} /> Approve all {s.counts.PENDING} waiting</button>
              )}
              {s.live && (
                <button className="at-btn-danger" disabled={!!busy} onClick={() => {
                  if (window.confirm(tx('End this class? Students who have not checked in are marked absent.')))
                    run('end', () => endAttendanceSession(s.id), 'Class ended');
                }}><Square size={16} /> End class</button>
              )}
              <button className="at-btn-danger" disabled={!!busy} onClick={async () => {
                if (!window.confirm('Delete this session and everything recorded in it? Use this only for a session started by mistake.')) return;
                if (await run('delete', () => deleteAttendanceSession(s.id), 'Session deleted')) navigate(`${base}/attendance`);
              }}><Trash2 size={16} /> Delete session</button>
            </div>
            <p className="at-help" style={{ marginTop: 10 }}>
              {s.secondCheckPlanned ? 'A second check will appear at a random time during class. Its time is kept hidden so it can’t be passed on. '
                : s.secondCheckDone ? 'The second check has been done. Students who missed it are marked absent when the class ends. ' : ''}
              {s.live && `The class ends on its own at ${fmtTime(s.endsAt)}.`}
            </p>
          </div>
        </div>

        <Roster s={s} busy={busy} run={run} />
      </div>
    </div>
  );
}

function CodePanel({ s }: { s: SessionDetail }) {
  const { data } = useQuery({
    queryKey: ['attendance', 'code', s.id],
    queryFn: () => getAttendanceCode(s.id),
    refetchInterval: 2000,
  });
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => setLeft(data?.secondsLeft ?? null), [data?.secondsLeft, data?.code]);
  useEffect(() => {
    const t = setInterval(() => setLeft(v => (v == null ? v : Math.max(0, v - 1))), 1000);
    return () => clearInterval(t);
  }, []);
  const base = useAttendanceBase();
  const screenUrl = `/attendance-screen/${s.id}?back=${encodeURIComponent(`${base}/attendance/session/${s.id}`)}`;

  const second = data?.phase === 'SECOND_CHECK';
  const quiet = !data?.code;
  const pct = data?.codeSeconds && left != null ? (left / data.codeSeconds) * 100 : 0;
  return (
    <div className={`at-codebox ${second ? 'is-second' : quiet ? 'is-quiet' : ''}`} style={{ marginBottom: 14 }}>
      {quiet ? (
        <>
          <div className="at-codebox-label">{data?.phase === 'IN_CLASS' ? 'Check-in closed' : 'Loading…'}</div>
          <div style={{ fontSize: 14, fontWeight: 600, margin: '8px 0 4px' }}>
            {data?.phase === 'IN_CLASS' ? (s.secondCheckPlanned ? 'Waiting for the second check.' : 'No code is open.') : ''}
          </div>
        </>
      ) : (
        <>
          <div className="at-codebox-label">{second ? 'Second check' : data!.qr ? 'Students scan this code' : s.codeDisplay === 'READ_ALOUD' ? 'Read this code out' : 'Check-in code'}</div>
          {data!.qr ? <ClassQr text={data!.qr} /> : <div className="at-code" aria-live="polite">{data!.code}</div>}
          <div className="at-codebar"><span style={{ width: `${pct}%` }} /></div>
          <small>New code in {left ?? '…'} s · closes in {fmtClock(data!.phaseSecondsLeft ?? 0)}</small>
        </>
      )}
      <div style={{ marginTop: 10 }}>
        <a className="at-btn-ghost at-btn-sm" href={screenUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
          <Maximize2 size={14} /> Open projector screen</a>
      </div>
    </div>
  );
}

/** Scanned classes: open the camera scanner, and give helpers (e.g. a TA) their own scanner link. */
function ScanPanel({ s, run }: { s: SessionDetail; run: (k: string, fn: () => Promise<any>, ok?: string) => Promise<boolean> }) {
  const base = useAttendanceBase();
  const navigate = useNavigate();
  // Counts down from the server's figure (re-synced every refresh), not from a clock time
  const [left, setLeft] = useState(s.phaseSecondsLeft ?? 0);
  useEffect(() => {
    setLeft(s.phaseSecondsLeft ?? 0);
    const t = setInterval(() => setLeft(v => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, [s.phaseSecondsLeft]);
  const open = s.phase === 'CHECK_IN';

  return (
    <>
      <div className={`at-codebox ${open ? '' : 'is-quiet'}`} style={{ marginBottom: 14 }}>
        <div className="at-codebox-label">{open ? 'Scanning open' : 'Scanning closed'}</div>
        <div style={{ fontSize: 14, fontWeight: 600, margin: '8px 0 12px' }}>
          {open ? <>Students show their QR codes; closes in {fmtClock(left)}</> : 'Reopen check-in below to scan more students.'}
        </div>
        {open && (
          <button className="at-btn at-btn-big at-btn-block" style={{ background: '#fff', color: 'var(--brand-text)' }}
            onClick={() => navigate(`/attendance-scanner/${s.id}?back=${encodeURIComponent(`${base}/attendance/session/${s.id}`)}`)}>
            <ScanLine size={18} /> Scan students
          </button>
        )}
      </div>

      <HelpersCard s={s} run={run} />
    </>
  );
}

/**
 * QR classes: helpers (e.g. a TA) get a link for their own phone. With STAFF_SCAN they scan students'
 * codes; with STUDENT_SCAN they hold up the class QR code, e.g. in a big hall far from the projector.
 */
function HelpersCard({ s, run }: { s: SessionDetail; run: (k: string, fn: () => Promise<any>, ok?: string) => Promise<boolean> }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const showing = s.method === 'STUDENT_SCAN';
  // Showing helpers can be set up any time in class (ready for a second check); scanning ones while check-in is open
  const open = showing || s.phase === 'CHECK_IN';
  const helpers = (s.helpers ?? []).filter(h => h.active);

  return (
    <>
      <div className="at-card">
        <div className="at-card-head" style={{ marginBottom: 6 }}>
          <h3 className="at-card-title"><UserPlus size={17} /> Helpers</h3>
          {open && <button className="at-btn-ghost at-btn-sm" onClick={() => setAdding(true)}><Plus size={14} /> Add a helper</button>}
        </div>
        {helpers.length === 0 ? (
          <p className="at-help" style={{ margin: 0 }}>{showing
            ? tx('A teaching assistant can show the class QR code on their own phone, e.g. at the back of a big hall: add them here. No account needed.')
            : tx('A teaching assistant can scan too: add them here and they open the link on their own phone. No account needed.')}</p>
        ) : (
          <div className="at-list">
            {helpers.map(h => (
              <div key={h.id} className="at-item" style={{ padding: '8px 12px' }}>
                <div className="at-item-main">
                  <div className="at-item-title" style={{ fontSize: 13.5 }}>{h.label}</div>
                  <div className="at-meta">{!showing && <span>{h.scans} scanned</span>}{h.lastUsedAt && <span>last at {fmtTime(h.lastUsedAt)}</span>}</div>
                </div>
                <button className="at-btn-ghost at-btn-sm" onClick={() => {
                  if (window.confirm(`Cancel ${h.label}'s helper link? It stops working at once.`))
                    run(`h${h.id}`, () => cancelAttendanceHelper(s.id, h.id), 'Link cancelled');
                }}>Cancel link</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {adding && <AddHelperDialog sessionId={s.id} showing={showing} onClose={() => { setAdding(false); qc.invalidateQueries({ queryKey: ['attendance', 'session', s.id] }); }} />}
    </>
  );
}

function AddHelperDialog({ sessionId, showing, onClose }: { sessionId: number; showing: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const h = await addAttendanceHelper(sessionId, name.trim());
      const url = `${window.location.origin}/attendance-scan/${h.token}`;
      setLink(url);
      setQr(await QRCode.toDataURL(url, { errorCorrectionLevel: 'M', margin: 2, width: 260 }));
    } catch (e) {
      setError(errMsg(e, 'Could not add the helper.'));
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(link!); toast.success('Link copied'); }
    catch { toast.error('Copy the link by hand'); }
  };
  const share = () => (navigator as any).share?.({ title: showing ? 'Class attendance QR code' : 'Attendance scanner', url: link }).catch(() => {});

  return (
    <AppModal title={link ? `${showing ? 'Helper' : 'Scanner'} link for ${name.trim()}` : 'Add a helper'} onClose={onClose}
      subtitle={link
        ? (showing ? 'They scan this with their phone camera (or open the link) and their phone shows the class QR code for students to scan.'
          : 'They scan this with their phone camera (or open the link) and start scanning students.')
        : 'For example a teaching assistant. They use their own phone; no account needed.'}
      footer={link
        ? <div className="at-row" style={{ width: '100%', justifyContent: 'flex-end' }}><button className="at-btn" onClick={onClose}>Done</button></div>
        : <div className="at-row" style={{ width: '100%', justifyContent: 'flex-end' }}>
            <button className="at-btn-ghost" onClick={onClose}>Cancel</button>
            <button className="at-btn" onClick={create} disabled={busy || !name.trim()}>{busy ? <Loader2 size={16} className="at-spin" /> : <Link2 size={16} />} Create link</button>
          </div>}>
      <div className="at-page" style={{ paddingBottom: 0 }}>
        {!link ? (
          <label className="at-field"><span>Helper's name</span>
            <input className="at-input" value={name} maxLength={80} autoFocus onChange={e => setName(e.target.value)} placeholder="e.g. Kojo Mensah (TA)"
              onKeyDown={e => { if (e.key === 'Enter' && name.trim() && !busy) create(); }} /></label>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            {qr && <img src={qr} alt="Helper link QR code" width={220} height={220} style={{ borderRadius: 12, border: '1.5px solid #e2e8f0' }} />}
            <div className="at-row" style={{ justifyContent: 'center' }}>
              <button className="at-btn-ghost at-btn-sm" onClick={copy}><Copy size={14} /> Copy link</button>
              {typeof (navigator as any).share === 'function' && <button className="at-btn-ghost at-btn-sm" onClick={share}><Share2 size={14} /> Share</button>}
            </div>
            <div className="at-alert is-warn" style={{ marginBottom: 0 }}>
              <AlertTriangle size={16} />
              <span>{showing
                ? tx('Anyone with this link can show the class QR code while the class runs, so give it only to your helper. Students still need to be inside your classroom to check in. The link stops working when the class ends, or when you cancel it.')
                : tx('Anyone with this link can scan for this class while it runs, so give it only to your helper. It uses your classroom: students can only show their codes from inside it. The link stops working when the class ends, or when you cancel it.')}</span>
            </div>
          </div>
        )}
        {error && <div className="at-alert is-error" role="alert" style={{ marginTop: 12, marginBottom: 0 }}><XCircle size={16} /><span>{error}</span></div>}
      </div>
    </AppModal>
  );
}

function Counts({ s, onHeadcount }: { s: SessionDetail; onHeadcount: (n: number | null) => void }) {
  const c = s.counts;
  const checkedIn = (c.PRESENT ?? 0) + (c.LATE ?? 0) + (c.PENDING ?? 0);
  const [head, setHead] = useState<string>(s.headcount != null ? String(s.headcount) : '');
  useEffect(() => setHead(s.headcount != null ? String(s.headcount) : ''), [s.headcount]);
  const over = s.headcount != null ? checkedIn - s.headcount : 0;
  return (
    <div className="at-card">
      <div className="at-stats">
        <div className="at-stat"><b>{checkedIn}</b><span>checked in of {s.rosterSize}</span></div>
        <div className="at-stat"><b>{c.PENDING ?? 0}</b><span>waiting for you</span></div>
        <div className="at-stat"><b>{c.NOT_YET ?? 0}</b><span>not checked in</span></div>
        <div className="at-stat"><b>{c.ABSENT ?? 0}</b><span>absent</span></div>
      </div>
      <form className="at-row" style={{ marginTop: 12 }} onSubmit={e => { e.preventDefault(); onHeadcount(head === '' ? null : Number(head)); }}>
        <label className="at-field" style={{ flex: '1 1 140px' }}><span>Headcount (people in the room)</span>
          <input className="at-input" type="number" min={0} inputMode="numeric" value={head} onChange={e => setHead(e.target.value)} placeholder="Count the room" /></label>
        <button className="at-btn-ghost" style={{ alignSelf: 'flex-end' }} type="submit"><Users size={16} /> Save</button>
      </form>
      {s.headcount != null && over > 0 && (
        <div className="at-alert is-warn" style={{ marginTop: 12, marginBottom: 0 }}>
          <AlertTriangle size={16} />
          <span><b>{over} more check-in{over === 1 ? '' : 's'} than people counted.</b> Someone may be checking in from outside. Review the flagged students, or call out names.</span>
        </div>
      )}
      {s.headcount != null && over <= 0 && (
        <p className="at-help" style={{ marginTop: 10 }}>{checkedIn} checked in, {s.headcount} counted{over < 0 ? ` (${-over} not checked in yet)` : ''}.</p>
      )}
    </div>
  );
}

const MARK_OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: 'PRESENT', label: 'Present' },
  { value: 'LATE', label: 'Late' },
  { value: 'EXCUSED', label: 'Excused' },
  { value: 'ABSENT', label: 'Absent' },
  { value: 'REJECTED', label: 'Not accepted' },
];

function Roster({ s, busy, run }: { s: SessionDetail; busy: string | null; run: (k: string, fn: () => Promise<any>, ok?: string) => Promise<boolean> }) {
  const [filter, setFilter] = useState<Filter>('ALL');
  const [q, setQ] = useState('');
  const flagged = (st: SessionStudent) => st.locked || st.flags.length > 0;

  const counts = useMemo(() => ({
    ALL: s.students.length,
    IN: s.students.filter(x => x.status === 'PRESENT' || x.status === 'LATE').length,
    PENDING: s.students.filter(x => x.status === 'PENDING').length,
    NOT_YET: s.students.filter(x => !x.status).length,
    ABSENT: s.students.filter(x => x.status === 'ABSENT' || x.status === 'REJECTED').length,
    FLAGGED: s.students.filter(flagged).length,
    PHONE: s.students.filter(x => x.phoneLinked).length,
  }), [s.students]);

  const list = s.students.filter(x => {
    if (filter === 'IN' && !(x.status === 'PRESENT' || x.status === 'LATE')) return false;
    if (filter === 'PENDING' && x.status !== 'PENDING') return false;
    if (filter === 'NOT_YET' && x.status) return false;
    if (filter === 'ABSENT' && !(x.status === 'ABSENT' || x.status === 'REJECTED')) return false;
    if (filter === 'FLAGGED' && !flagged(x)) return false;
    if (filter === 'PHONE' && !x.phoneLinked) return false;
    const t = q.trim().toLowerCase();
    return !t || x.name.toLowerCase().includes(t) || (x.indexNo ?? '').toLowerCase().includes(t);
  });

  const filters: { key: Filter; label: string }[] = [
    { key: 'ALL', label: 'All' }, { key: 'PENDING', label: 'Waiting' }, { key: 'IN', label: 'Checked in' },
    { key: 'NOT_YET', label: 'Not yet' }, { key: 'ABSENT', label: 'Absent' }, { key: 'FLAGGED', label: 'Flagged' },
    { key: 'PHONE', label: 'Phone linked' },
  ];

  return (
    <div className="at-card">
      <div className="at-card-head">
        <h3 className="at-card-title"><Users size={18} /> {tx('Students')} ({s.students.length})</h3>
        <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 320 }}>
          <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input className="at-input" style={{ paddingLeft: 32 }} value={q} onChange={e => setQ(e.target.value)} placeholder="Search name or ID" aria-label="Search students" />
        </div>
      </div>
      <div className="at-filters" role="toolbar" aria-label="Filter students">
        {filters.map(f => (
          <button key={f.key} className={filter === f.key ? 'is-on' : ''} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
            {f.label} <small>{counts[f.key]}</small>
          </button>
        ))}
      </div>

      <div className="at-roster">
        {list.length === 0 ? <div className="at-empty"><p>No students here.</p></div> : list.map(st => (
          <div key={st.studentId} className={`at-roster-row ${flagged(st) ? 'is-flagged' : ''}`}>
            <div className="at-roster-who">
              <div style={{ minWidth: 0 }}>
                <div className="at-roster-name">{st.name}</div>
                <div className="at-roster-idx">{st.indexNo}</div>
              </div>
              <span className="at-show-phone"><StatusPill status={st.status} /></span>
            </div>
            <div className="at-roster-info">
              <span className="at-hide-phone"><StatusPill status={st.status} /></span>
              {st.firstCheckAt && <span><Clock size={12} style={{ verticalAlign: '-2px' }} /> {fmtTime(st.firstCheckAt)}</span>}
              {st.firstDistance != null && <span><MapPin size={12} style={{ verticalAlign: '-2px' }} /> {st.firstDistance} m ±{st.firstAccuracy}</span>}
              {st.secondCheckAt && <span>2nd check {fmtTime(st.secondCheckAt)}</span>}
              {st.method === 'MANUAL' && st.reviewedBy && <span>marked by {st.reviewedBy}</span>}
              {st.method === 'SCAN' && st.reviewedBy && <span>scanned by {st.reviewedBy}</span>}
              {st.flags.filter(f => !(f === 'LATE' && st.status === 'LATE')).map(f => <span key={f} className={`at-chip ${f === 'MISSED_SECOND_CHECK' ? 'is-bad' : 'is-warn'}`}>{FLAG_LABELS[f] ?? f}</span>)}
              {st.locked && <span className="at-chip is-bad"><Lock size={11} /> Locked out</span>}
              {st.phoneLinked
                ? <span className="at-chip is-ok" title={`Linked ${fmtDate(st.phoneLinkedAt)}${st.phoneLastUsedAt ? `, last used ${fmtDate(st.phoneLastUsedAt)} ${fmtTime(st.phoneLastUsedAt)}` : ''}`}>
                    <Smartphone size={11} /> Phone linked</span>
                : <span className="at-chip"><Smartphone size={11} /> No phone linked</span>}
              {!st.locked && st.failures > 0 && <span className="at-chip">{st.failures} wrong code{st.failures === 1 ? '' : 's'}</span>}
              {st.note && <span>Note: {st.note}</span>}
            </div>
            <div className="at-roster-actions">
              {st.status === 'PENDING' && (
                <button className="at-btn at-btn-sm" disabled={!!busy}
                  onClick={() => run(`m${st.studentId}`, () => markAttendance(s.id, st.studentId, st.flags.includes('LATE') ? 'LATE' : 'PRESENT'))}>
                  <CheckCheck size={14} /> Approve</button>
              )}
              {st.locked && (
                <button className="at-btn-ghost at-btn-sm" disabled={!!busy} onClick={() => run(`u${st.studentId}`, () => unlockAttendanceStudent(s.id, st.studentId), `${st.name} can try again`)}>
                  <Lock size={14} /> Unlock</button>
              )}
              <select className="at-select" aria-label={`Mark ${st.name}`} value="" disabled={!!busy}
                onChange={e => {
                  const v = e.target.value;
                  if (v === 'RESET_PHONE') {
                    if (window.confirm(`Unlink ${st.name}'s phone? Their next check-in links the phone they use then. Only do this with the student in front of you.`))
                      run(`p${st.studentId}`, () => resetAttendancePhone(s.id, st.studentId), 'Phone unlinked');
                  } else if (v) {
                    run(`m${st.studentId}`, () => markAttendance(s.id, st.studentId, v as AttendanceStatus), `${st.name}: ${MARK_OPTIONS.find(o => o.value === v)?.label}`);
                  }
                }}>
                <option value="">Mark as…</option>
                {MARK_OPTIONS.filter(o => o.value !== st.status).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                {st.phoneLinked && <option value="RESET_PHONE">Reset phone link</option>}
              </select>
            </div>
          </div>
        ))}
      </div>
      <p className="at-help" style={{ marginTop: 10 }}>
        <Smartphone size={12} style={{ verticalAlign: '-2px' }} /> {tx('Mark students by hand only when you can see them in the room (for example, their phone could not get a precise location).')}
      </p>
    </div>
  );
}
