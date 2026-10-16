import axios from 'axios';
import client from './client';

/** Class attendance (/api/attendance). */
const root = () => client.defaults.baseURL!.replace('/v1/auth', '') + '/attendance';

export type AttendanceStatus = 'PRESENT' | 'LATE' | 'PENDING' | 'REJECTED' | 'EXCUSED' | 'ABSENT';
export type AttendanceMode = 'COURSE' | 'PROGRAMME';
export type CodeDisplay = 'PROJECTOR' | 'READ_ALOUD';
export type SessionPhase = 'CHECK_IN' | 'SECOND_CHECK' | 'IN_CLASS' | 'ENDED';
/** STUDENT_CODE: students type the code shown. STAFF_SCAN: staff scan each student's QR code. */
export type AttendanceMethod = 'STUDENT_CODE' | 'STAFF_SCAN';

// ── Student ────────────────────────────────────────────────────────────────

export interface OpenClass {
  sessionId: number; title: string; topic: string | null; meetingNumber: number; lecturer: string | null;
  placeName: string | null; codeDisplay: CodeDisplay; phase: SessionPhase; phaseSecondsLeft: number | null;
  status: AttendanceStatus | null; manual: boolean; firstChecked: boolean; secondChecked: boolean;
  /** 1 or 2 when a code should be typed now, else 0. */
  needsCheck: 0 | 1 | 2; attemptsLeft: number; locked: boolean; maxAccuracyMeters: number;
  method: AttendanceMethod;
  /** Scanned class: the student should show their QR code now. */
  needsScan: boolean;
}
export interface CheckInResult { ok: boolean; status: AttendanceStatus | null; message: string; reason: string; attemptsLeft: number | null }
export interface StudentAttendanceSummary {
  academicSession: string;
  summary: { key: string; scope: AttendanceMode; title: string; held: number; attended: number; late: number; absent: number; excused: number; pending: number; counted: number; percent: number | null;
    /** The minimum for starting quizzes, when one is switched on. */ minimumPercent: number | null; belowMinimum: boolean }[];
  history: { sessionId: number; title: string; meetingNumber: number; topic: string | null; date: string; status: AttendanceStatus; live: boolean; missedSecondCheck: boolean; note: string | null }[];
}

export const getMyOpenClasses = (): Promise<{ enabled: boolean; sessions: OpenClass[] }> =>
  client.get(`${root()}/student/open`).then(r => r.data);
export const checkInToClass = (data: { sessionId: number; code: string; latitude: number; longitude: number; accuracy: number; deviceId: string }): Promise<CheckInResult> =>
  client.post(`${root()}/student/check-in`, data).then(r => r.data);
export interface QrKeyResult {
  ok: boolean; message: string; reason: string; key: string | null; sessionId: number | null; studentId: number | null;
  stepSeconds: number | null; serverTime: number | null; name: string | null; indexNo: string | null;
}
/** Scanned classes: after the phone and location checks, the key the phone draws its changing QR code from. */
export const getMyQrKey = (data: { sessionId: number; latitude: number; longitude: number; accuracy: number; deviceId: string }): Promise<QrKeyResult> =>
  client.post(`${root()}/student/qr-key`, data).then(r => r.data);
export const getMyAttendance = (): Promise<StudentAttendanceSummary> =>
  client.get(`${root()}/student/summary`).then(r => r.data);

// ── Staff ──────────────────────────────────────────────────────────────────

export interface AttendancePolicy {
  mode: AttendanceMode; codeSeconds: number; readAloudCodeSeconds: number; graceSeconds: number;
  checkInMinutes: number; lateAfterMinutes: number; radiusMeters: number; maxAccuracyMeters: number;
  maxFailedAttempts: number; secondCheck: boolean; secondCheckMinutes: number;
  /** Students below minimumPercent can't start quizzes (the course's, or any for programme attendance). */
  minimumRequired: boolean; minimumPercent: number;
  updatedBy?: string | null; updatedAt?: string | null;
}
export interface ClassScheduleItem {
  id: number; scope: AttendanceMode; courseId: number | null; courseCode: string | null; programId: number | null; level: number | null;
  title: string; dayOfWeek: string; startTime: string; endTime: string; classroomId: number | null; classroomName: string | null;
  startedToday?: boolean;
}
export interface SessionSummary {
  id: number; scope: AttendanceMode; title: string; courseId: number | null; programId: number | null; level: number | null;
  department: string | null; meetingNumber: number; topic: string | null; openedBy: string | null; openedAt: string;
  checkInClosesAt: string; lateAfter: string; endsAt: string; closedAt: string | null; live: boolean; phase: SessionPhase;
  codeDisplay: CodeDisplay; codeSeconds: number; placeName: string | null; radiusMeters: number; maxAccuracyMeters: number;
  maxFailedAttempts: number; headcount: number | null; secondCheckPlanned: boolean; secondCheckRunning: boolean;
  secondCheckDone: boolean; secondCheckMinutes: number; counts?: Partial<Record<AttendanceStatus, number>>;
  method: AttendanceMethod;
  /** Seconds until the open check (or scanning) closes; null when none is open. */
  phaseSecondsLeft: number | null;
}
export interface SessionStudent {
  studentId: number; name: string; indexNo: string; status: AttendanceStatus | null; method: string | null;
  firstCheckAt: string | null; firstDistance: number | null; firstAccuracy: number | null;
  secondCheckAt: string | null; secondDistance: number | null; secondAccuracy: number | null;
  flags: string[]; reviewedBy: string | null; note: string | null; failures: number; locked: boolean;
}
export interface SessionDetail extends SessionSummary {
  students: SessionStudent[]; counts: Record<string, number>; rosterSize: number;
  /** Scanned classes: helpers' scanner links. */
  helpers?: AttendanceHelper[];
}
export interface AttendanceHelper {
  id: number; label: string; createdBy: string | null; createdAt: string; lastUsedAt: string | null; scans: number; active: boolean;
  /** Only when just created: the secret part of the link. */
  token?: string;
}
export interface CodeView {
  sessionId: number; title: string; meetingNumber: number; placeName: string | null; codeDisplay: CodeDisplay;
  phase: SessionPhase; method: AttendanceMethod; check: 0 | 1 | 2; code?: string; codeSeconds?: number; secondsLeft?: number; phaseSecondsLeft?: number;
  checkedIn: number; pending: number; secondChecked: number; rosterSize: number; headcount: number | null;
}
export interface Classroom {
  id: number; name: string; building: string | null; departmentId: number | null; departmentName: string | null;
  latitude: number; longitude: number; radiusMeters: number; measuredAccuracyMeters: number | null; createdBy: string | null; canEdit: boolean;
}
export interface AttendanceOptions {
  role: string; department: string | null; mode: AttendanceMode; policy: AttendancePolicy;
  courses: { id: number; code: string | null; title: string; level: string | null }[];
  programs: { id: number; name: string; code: string; levels: number[] }[];
  today: ClassScheduleItem[]; live: SessionSummary[];
}
export interface OpenSessionInput {
  scope?: AttendanceMode; courseId?: number; programId?: number; level?: number | null; classroomId?: number | null;
  latitude?: number; longitude?: number; accuracy?: number; codeDisplay?: CodeDisplay; durationMinutes?: number;
  topic?: string; scheduleId?: number; secondCheck?: boolean; method?: AttendanceMethod;
}

const m = () => `${root()}/manage`;
export const getAttendanceOptions = (): Promise<AttendanceOptions> => client.get(`${m()}/options`).then(r => r.data);
export const getAttendanceSessions = (): Promise<SessionSummary[]> => client.get(`${m()}/sessions`).then(r => r.data);
export const startAttendanceSession = (data: OpenSessionInput): Promise<SessionDetail> => client.post(`${m()}/sessions`, data).then(r => r.data);
export const getAttendanceSession = (id: number): Promise<SessionDetail> => client.get(`${m()}/sessions/${id}`).then(r => r.data);
export const getAttendanceCode = (id: number): Promise<CodeView> => client.get(`${m()}/sessions/${id}/code`).then(r => r.data);
export const closeAttendanceCheckIn = (id: number): Promise<SessionDetail> => client.post(`${m()}/sessions/${id}/close-check-in`).then(r => r.data);
export const extendAttendanceCheckIn = (id: number, minutes: number): Promise<SessionDetail> =>
  client.post(`${m()}/sessions/${id}/extend`, { minutes }).then(r => r.data);
export const startSecondCheck = (id: number): Promise<SessionDetail> => client.post(`${m()}/sessions/${id}/second-check`).then(r => r.data);
export const cancelSecondCheck = (id: number): Promise<SessionDetail> => client.delete(`${m()}/sessions/${id}/second-check`).then(r => r.data);
export const setAttendanceHeadcount = (id: number, headcount: number | null): Promise<SessionDetail> =>
  client.put(`${m()}/sessions/${id}/headcount`, { headcount }).then(r => r.data);
export const markAttendance = (id: number, studentId: number, status: AttendanceStatus, note?: string): Promise<SessionDetail> =>
  client.put(`${m()}/sessions/${id}/students/${studentId}`, { status, note }).then(r => r.data);
export const approvePendingAttendance = (id: number): Promise<SessionDetail> => client.post(`${m()}/sessions/${id}/approve-pending`).then(r => r.data);
export const unlockAttendanceStudent = (id: number, studentId: number): Promise<SessionDetail> =>
  client.post(`${m()}/sessions/${id}/students/${studentId}/unlock`).then(r => r.data);
export const resetAttendancePhone = (id: number, studentId: number): Promise<SessionDetail> =>
  client.post(`${m()}/sessions/${id}/students/${studentId}/reset-phone`).then(r => r.data);
export const endAttendanceSession = (id: number): Promise<SessionDetail> => client.post(`${m()}/sessions/${id}/end`).then(r => r.data);
export const deleteAttendanceSession = (id: number) => client.delete(`${m()}/sessions/${id}`).then(r => r.data);

/** What a scanner shows after a scan; the name and photo come back whenever the code is genuine. */
export interface ScanResult {
  ok: boolean; outcome: 'RECORDED' | 'ALREADY' | 'EXPIRED' | 'NOT_LISTED' | 'REFUSED'; message: string;
  studentId: number | null; name: string | null; indexNo: string | null; photo: string | null; status: AttendanceStatus | null;
}
export const scanStudentCode = (id: number, code: string): Promise<ScanResult> =>
  client.post(`${m()}/sessions/${id}/scan`, { code }).then(r => r.data);
export const addAttendanceHelper = (id: number, label: string): Promise<AttendanceHelper> =>
  client.post(`${m()}/sessions/${id}/helpers`, { label }).then(r => r.data);
export const cancelAttendanceHelper = (id: number, helperId: number): Promise<SessionDetail> =>
  client.delete(`${m()}/sessions/${id}/helpers/${helperId}`).then(r => r.data);

// ── Helper scanner link (no account: a plain request, so no sign-in token or sign-out on 401) ──

export interface HelperView {
  helper: string; title: string; meetingNumber: number; placeName: string | null; phase: SessionPhase;
  phaseSecondsLeft: number | null; maxAccuracyMeters: number; myScans: number; checkedIn: number; rosterSize: number;
}
export const getHelperView = (token: string): Promise<HelperView> =>
  axios.get(`${root()}/scan/${encodeURIComponent(token)}`).then(r => r.data);
export const helperScan = (token: string, data: { code: string }): Promise<ScanResult> =>
  axios.post(`${root()}/scan/${encodeURIComponent(token)}`, data).then(r => r.data);

export const getClassrooms = (): Promise<Classroom[]> => client.get(`${m()}/classrooms`).then(r => r.data);
export type ClassroomInput = { name: string; building?: string; departmentId?: number | null; latitude: number; longitude: number; radiusMeters: number; accuracyMeters?: number };
export const saveClassroom = (data: ClassroomInput, id?: number): Promise<Classroom> =>
  (id ? client.put(`${m()}/classrooms/${id}`, data) : client.post(`${m()}/classrooms`, data)).then(r => r.data);
export const deleteClassroom = (id: number) => client.delete(`${m()}/classrooms/${id}`).then(r => r.data);

export const getClassSchedules = (): Promise<ClassScheduleItem[]> => client.get(`${m()}/schedules`).then(r => r.data);
export type ScheduleInput = { scope: AttendanceMode; courseId?: number; programId?: number; level?: number | null; dayOfWeek: string; startTime: string; endTime: string; classroomId?: number | null };
export const saveClassSchedule = (data: ScheduleInput, id?: number): Promise<ClassScheduleItem> =>
  (id ? client.put(`${m()}/schedules/${id}`, data) : client.post(`${m()}/schedules`, data)).then(r => r.data);
export const deleteClassSchedule = (id: number) => client.delete(`${m()}/schedules/${id}`).then(r => r.data);

// ── Rules (Super Admin, HODs) ──────────────────────────────────────────────

export interface AttendanceSettings {
  system: AttendancePolicy;
  departments: { departmentId: number; departmentName: string; policy: AttendancePolicy | null }[];
}
export const getAttendanceSettings = (): Promise<AttendanceSettings> => client.get(`${root()}/settings`).then(r => r.data);
export const saveSystemAttendancePolicy = (data: Partial<AttendancePolicy>): Promise<AttendancePolicy> =>
  client.put(`${root()}/settings/system`, data).then(r => r.data);
export const saveDepartmentAttendancePolicy = (departmentId: number, data: Partial<AttendancePolicy>): Promise<AttendancePolicy> =>
  client.put(`${root()}/settings/departments/${departmentId}`, data).then(r => r.data);
export const resetDepartmentAttendancePolicy = (departmentId: number) =>
  client.delete(`${root()}/settings/departments/${departmentId}`).then(r => r.data);
