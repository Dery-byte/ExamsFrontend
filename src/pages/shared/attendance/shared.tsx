import { useLocation } from 'react-router-dom';
import type { AttendanceStatus } from '../../../api/attendance';
import { tx } from '../../../utils/terms';

export const STATUS_META: Record<AttendanceStatus | 'NOT_YET', { label: string; cls: string }> = {
  PRESENT:  { label: 'Present',          cls: 'is-present' },
  LATE:     { label: 'Late',             cls: 'is-late' },
  PENDING:  { label: 'Waiting',          cls: 'is-pending' },
  REJECTED: { label: 'Not accepted',     cls: 'is-rejected' },
  EXCUSED:  { label: 'Excused',          cls: 'is-excused' },
  ABSENT:   { label: 'Absent',           cls: 'is-absent' },
  NOT_YET:  { label: 'Not checked in',   cls: 'is-notyet' },
};

export function StatusPill({ status }: { status: AttendanceStatus | null | 'NOT_YET' }) {
  const m = STATUS_META[status ?? 'NOT_YET'];
  return <span className={`at-pill ${m.cls}`}>{m.label}</span>;
}

export const FLAG_LABELS: Record<string, string> = {
  LATE: 'Late',
  NEW_PHONE: 'New phone',
  MISSED_SECOND_CHECK: 'Missed second check',
  LOCATION_UNCLEAR: 'Location unclear',
};

/** A student's newest location reading, in a few words for the class list. */
export const PLACE_LABELS: Record<string, string> = {
  INSIDE: 'in the room',
  UNCLEAR: 'location unclear',
  OUTSIDE: 'outside the room',
  NO_GPS: 'approximate location only',
};

/** Staff area the page is shown in: /lect, /admin or /super-admin. */
export function useAttendanceBase(): string {
  const p = useLocation().pathname;
  if (p.startsWith('/super-admin')) return '/super-admin';
  if (p.startsWith('/admin')) return '/admin';
  return '/lect';
}

export const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
export const dayName = (d: string) => d.charAt(0) + d.slice(1).toLowerCase();

export const fmtTime = (iso?: string | null) => (iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—');
export const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '—';
export const fmtClock = (seconds: number) => {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export const errMsg = (e: any, fallback = 'Something went wrong. Please try again.') =>
  tx(e?.response?.data?.message ?? (e?.name === 'LocationError' ? e.message : fallback));

/** "CSC 201 Data Structures · Level 200" in the system mode's words. */
export const classTitle = (t: string) => tx(t);
