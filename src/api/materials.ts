import client from './client';

/** Course notes and assignments (/api/materials) and term dates (/api/academic/terms). */
const apiRoot = () => client.defaults.baseURL!.replace('/v1/auth', '');
const root = () => apiRoot() + '/materials';

export type MaterialKind = 'NOTE' | 'LINK' | 'ASSIGNMENT';
export type Visibility = 'DRAFT' | 'VISIBLE' | 'SCHEDULED' | 'HIDDEN';
export type WeekState = 'OPEN' | 'HIDDEN' | 'SCHEDULED';
export type AiProviderKey = 'CLAUDE' | 'GEMINI' | 'GPT' | 'DEEPSEEK';
export type HiddenBecause = 'COURSE_HIDDEN' | 'WEEK_HIDDEN' | 'WEEK_SCHEDULED' | 'DRAFT' | 'HIDDEN' | 'SCHEDULED';

export interface FileInfo { id: string; name: string; size: number; contentType: string; role: 'ATTACHMENT' | 'SUBMISSION' | 'FEEDBACK' }
export interface CourseInfo { id: number; title: string; code: string | null; level: string | null; semester: number | null; lecturer: string | null }
export interface AiProvider { key: AiProviderKey; label: string; configured: boolean; readsScans: boolean; model?: string }
/** What the AI is doing right now for one student's work (null when nothing runs). */
export type AiStage = 'QUEUED' | 'PREPARING' | 'CONVERTING' | 'READING' | 'SAVING';
/** The AI's cautious view on whether an AI tool wrote the work: a pointer, never proof, never used in the mark. */
export type AiWriting = 'LOW' | 'MEDIUM' | 'HIGH';
export interface SimilarMatch { studentId: number; name: string; percent: number; flagged: boolean; passages: string[] }
export interface AiProgressInfo { stage: AiStage; provider: string; detail: string | null; seconds: number; stageSeconds: number }

// ── Staff ──────────────────────────────────────────────────────────────────

export interface ManageCourse {
  courseId: number; title: string; code: string | null; level: string | null; semester: number | null; lecturer: string | null;
  items: number; assignments: number; toMark: number; visibleToStudents: boolean;
}

export interface StaffAssignment {
  dueAt: string | null; closesAt: string | null; open: boolean; maxMarks: number; markingGuide: string | null;
  aiProvider: AiProviderKey | null; allowTyped: boolean; allowFiles: boolean; marksReleased: boolean; handedIn: number; marked: number;
}

export interface StaffItem {
  id: number; kind: MaterialKind; weekNumber: number; title: string; description: string | null; linkUrl: string | null;
  visibility: Visibility; visibleFrom: string | null; pinned: boolean; studentsSee: boolean;
  hiddenBecause: HiddenBecause | null; hiddenUntil: string | null;
  publishedAt: string | null; createdBy: string | null; updatedAt: string; opened: number; files: FileInfo[];
  assignment?: StaffAssignment;
}

export interface StaffWeek {
  number: number; topic: string | null; state: WeekState; releaseAt: string | null; open: boolean;
  start: string | null; end: string | null; items: StaffItem[];
}

export interface SpaceSettings {
  visibleToStudents: boolean; hideDuringQuiz: boolean; weekOneStart: string | null; weeksCount: number | null;
  usesTermDates: boolean; termStart: string | null; termWeeks: number | null; weekOneMonday: string | null; weeks: number;
  autoRelease: boolean; autoReleaseDay: string; autoReleaseTime: string;
}

export interface StaffSpace {
  course: CourseInfo; spaceId: number; session: string; settings: SpaceSettings; currentWeek: number; rosterSize: number;
  weeks: StaffWeek[];
  limits: { maxFileMb: number; accepted: string[]; submissionAccepted: string[]; maxFiles: number };
  aiProviders: AiProvider[]; binCount: number; copied?: number;
}

export interface MaterialInput {
  weekNumber?: number; kind?: MaterialKind; title?: string; description?: string | null; linkUrl?: string | null;
  visibility?: Visibility; visibleFrom?: string | null; pinned?: boolean;
  dueAt?: string | null; maxMarks?: number | null; markingGuide?: string | null; aiProvider?: AiProviderKey | '' | null;
  allowTyped?: boolean; allowFiles?: boolean;
}

export interface SettingsInput {
  visibleToStudents?: boolean; hideDuringQuiz?: boolean; weekOneStart?: string | null; weeksCount?: number | null;
  useTermDates?: boolean; autoRelease?: boolean; autoReleaseDay?: string; autoReleaseTime?: string;
}

export const getManageCourses = (q?: string): Promise<ManageCourse[]> =>
  client.get(`${root()}/manage/courses`, { params: q ? { q } : {} }).then(r => r.data);
export const getManageSpace = (courseId: number): Promise<StaffSpace> =>
  client.get(`${root()}/manage/courses/${courseId}`).then(r => r.data);
export const saveSpaceSettings = (courseId: number, s: SettingsInput): Promise<StaffSpace> =>
  client.put(`${root()}/manage/courses/${courseId}/settings`, s).then(r => r.data);
export const saveWeek = (courseId: number, n: number, w: { topic?: string | null; state?: WeekState; releaseAt?: string | null }): Promise<StaffSpace> =>
  client.put(`${root()}/manage/courses/${courseId}/weeks/${n}`, w).then(r => r.data);

/** Long uploads: no timeout, progress 0–1. */
const upload = (onProgress?: (p: number) => void) => ({
  timeout: 0,
  headers: { 'Content-Type': 'multipart/form-data' },
  onUploadProgress: (e: any) => { if (onProgress && e.total) onProgress(e.loaded / e.total); },
});

export const createMaterial = (courseId: number, data: MaterialInput, files: File[], onProgress?: (p: number) => void): Promise<StaffSpace> => {
  const fd = new FormData();
  fd.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }));
  files.forEach(f => fd.append('files', f));
  return client.post(`${root()}/manage/courses/${courseId}/items`, fd, upload(onProgress)).then(r => r.data);
};
export const updateMaterial = (id: number, data: MaterialInput): Promise<StaffSpace> =>
  client.put(`${root()}/manage/items/${id}`, data).then(r => r.data);
export const setMaterialVisibility = (id: number, visibility: Visibility, visibleFrom?: string | null): Promise<StaffSpace> =>
  client.put(`${root()}/manage/items/${id}/visibility`, { visibility, visibleFrom: visibleFrom ?? null }).then(r => r.data);
export const addMaterialFiles = (id: number, files: File[], onProgress?: (p: number) => void): Promise<StaffSpace> => {
  const fd = new FormData();
  files.forEach(f => fd.append('files', f));
  return client.post(`${root()}/manage/items/${id}/files`, fd, upload(onProgress)).then(r => r.data);
};
export const removeMaterialFile = (id: number, fileId: string): Promise<StaffSpace> =>
  client.delete(`${root()}/manage/items/${id}/files/${fileId}`).then(r => r.data);
export const deleteMaterial = (id: number): Promise<StaffSpace> =>
  client.delete(`${root()}/manage/items/${id}`).then(r => r.data);

export interface BinItem { id: number; kind: MaterialKind; title: string; weekNumber: number; deletedAt: string; deletedBy: string | null; purgeOn: string; files: number }
export const getBin = (courseId: number): Promise<BinItem[]> => client.get(`${root()}/manage/courses/${courseId}/bin`).then(r => r.data);
export const restoreMaterial = (id: number): Promise<StaffSpace> => client.post(`${root()}/manage/items/${id}/restore`).then(r => r.data);
export const purgeMaterial = (id: number): Promise<void> => client.delete(`${root()}/manage/items/${id}/purge`).then(() => undefined);

export interface ViewRow { studentId: number; name: string; username: string; opened: boolean; firstAt: string | null; lastAt: string | null; times: number }
export interface ViewsReport { materialId: number; title: string; rosterSize: number; opened: number; students: ViewRow[] }
export const getViews = (id: number): Promise<ViewsReport> => client.get(`${root()}/manage/items/${id}/views`).then(r => r.data);

export interface CopySource { spaceId: number; session: string; notes: number; assignments: number }
export const getCopySources = (courseId: number): Promise<CopySource[]> =>
  client.get(`${root()}/manage/courses/${courseId}/copy-sources`).then(r => r.data);
export const copyFromTerm = (courseId: number, fromSpaceId: number): Promise<StaffSpace> =>
  client.post(`${root()}/manage/courses/${courseId}/copy`, { fromSpaceId }).then(r => r.data);

/** previewUrl: an exact PDF copy of a Word / PowerPoint file, when the server can make one (LibreOffice). */
export interface SignedLink { url: string; name: string; contentType: string; size: number; expiresInSeconds: number; previewUrl?: string }
export const staffFileLink = (fileId: string, inline = false): Promise<SignedLink> =>
  client.post(`${root()}/manage/files/${fileId}/link`, null, { params: { inline } }).then(r => r.data);
export const staffZipLink = (courseId: number, week: number): Promise<{ url: string }> =>
  client.post(`${root()}/manage/courses/${courseId}/weeks/${week}/zip-link`).then(r => r.data);

// ── Staff: assignments ─────────────────────────────────────────────────────

export interface AssignmentInfo {
  id: number; title: string; description: string | null; weekNumber: number; course: CourseInfo;
  dueAt: string | null; closesAt: string | null; open: boolean; reopened: boolean; maxMarks: number; markingGuide: string | null;
  aiProvider: AiProviderKey | null; allowTyped: boolean; allowFiles: boolean; marksReleased: boolean; visibility: Visibility; files: FileInfo[];
}
export type WorkStatus = 'MISSING' | 'HANDED_IN' | 'LATE' | 'MARKED';
export interface RosterRow {
  studentId: number; name: string; username: string; status: WorkStatus; submittedAt: string | null; late: boolean;
  score: number | null; aiScore: number | null; aiQueued: boolean; aiError: string | null; aiStage: AiStage | null; files: number; typed: boolean; sameFileAs: string[];
  /** Closest classmate when their work is at least 40% the same (question wording left out). */
  similarTo: { studentId: number; name: string; percent: number } | null;
  chatbotPhrases: number; aiWriting: AiWriting | null;
}
export interface AssignmentRoster {
  assignment: AssignmentInfo; students: RosterRow[];
  counts: { students: number; handedIn: number; marked: number; late: number; aiQueued: number; aiRunning?: number; similar?: number };
  aiProviders: AiProvider[]; queued?: number;
}
export interface StudentWork {
  assignment: AssignmentInfo;
  student: { id: number; name: string; username: string; photo: string | null };
  submittedAt: string | null; late: boolean; typedAnswer: string | null; files: FileInfo[]; feedbackFiles: FileInfo[];
  score: number | null; feedback: string | null; markedBy: string | null; markedAt: string | null; aiAssisted: boolean;
  aiScore: number | null; aiFeedback: string | null; aiProvider: AiProviderKey | null; aiAt: string | null; aiError: string | null; aiQueued: boolean;
  aiProgress: AiProgressInfo | null;
  aiWriting: AiWriting | null; aiWritingNotes: string | null;
  /** Present once the student has handed in: closest classmates (with shared passages) and chatbot phrases found. */
  similar?: SimilarMatch[]; chatbotPhrases?: string[]; hasText?: boolean;
}
export interface SheetTarget { sheetId: number; label: string; status: string; locked: boolean; sections: { id: number; name: string; maxScore: number }[] }

export const getRoster = (id: number): Promise<AssignmentRoster> => client.get(`${root()}/manage/assignments/${id}`).then(r => r.data);
export const reopenAssignment = (id: number, closesAt: string): Promise<AssignmentInfo> =>
  client.post(`${root()}/manage/assignments/${id}/reopen`, { closesAt }).then(r => r.data);
export const closeAssignment = (id: number): Promise<AssignmentInfo> => client.post(`${root()}/manage/assignments/${id}/close`).then(r => r.data);
export const releaseMarks = (id: number, released: boolean): Promise<AssignmentInfo> =>
  client.put(`${root()}/manage/assignments/${id}/release`, { released }).then(r => r.data);
export const getWork = (id: number, studentId: number): Promise<StudentWork> =>
  client.get(`${root()}/manage/assignments/${id}/students/${studentId}`).then(r => r.data);
export const saveMark = (id: number, studentId: number, m: { score: number | null; feedback: string | null; aiAssisted?: boolean }): Promise<StudentWork> =>
  client.put(`${root()}/manage/assignments/${id}/students/${studentId}/mark`, m).then(r => r.data);
/** Starts the AI and returns at once; follow aiProgress on the work until it is null. */
export const aiSuggest = (id: number, studentId: number, provider?: AiProviderKey): Promise<StudentWork> =>
  client.post(`${root()}/manage/assignments/${id}/students/${studentId}/ai`, { provider: provider ?? null }).then(r => r.data);
export const aiSuggestAll = (id: number, provider?: AiProviderKey): Promise<AssignmentRoster> =>
  client.post(`${root()}/manage/assignments/${id}/ai-all`, { provider: provider ?? null }).then(r => r.data);
export const cancelAiAll = (id: number): Promise<AssignmentRoster> => client.delete(`${root()}/manage/assignments/${id}/ai-all`).then(r => r.data);
export const addFeedbackFiles = (id: number, studentId: number, files: File[]): Promise<StudentWork> => {
  const fd = new FormData();
  files.forEach(f => fd.append('files', f));
  return client.post(`${root()}/manage/assignments/${id}/students/${studentId}/feedback-files`, fd, upload()).then(r => r.data);
};
export const removeFeedbackFile = (id: number, studentId: number, fileId: string): Promise<StudentWork> =>
  client.delete(`${root()}/manage/assignments/${id}/students/${studentId}/feedback-files/${fileId}`).then(r => r.data);
export const getSheetTargets = (id: number): Promise<SheetTarget[]> => client.get(`${root()}/manage/assignments/${id}/sheets`).then(r => r.data);
export const sendToSheet = (id: number, sheetId: number, sectionId: number, scale: boolean): Promise<{ updated: number; message: string }> =>
  client.post(`${root()}/manage/assignments/${id}/send-to-sheet`, { sheetId, sectionId, scale }).then(r => r.data);

// ── Marks table (running assignment total) ─────────────────────────────────

/** MARKED; MISSING = not handed in after closing (counts 0); PENDING = handed in, not marked; OPEN = still taking work. */
export type CellState = 'MARKED' | 'MISSING' | 'PENDING' | 'OPEN';
export interface GradebookColumn {
  id: number; title: string; weekNumber: number; maxMarks: number; dueAt: string | null; closesAt: string | null; closed: boolean;
  released: boolean; counts: boolean; draft: boolean; marked: number; handedIn: number;
  average: number | null; highest: number | null; lowest: number | null;
}
export interface GradebookRow {
  studentId: number; name: string; username: string; onList: boolean;
  cells: Record<string, { state: CellState; score: number | null; late: boolean }>;
  total: number; outOf: number; percent: number | null;
}
export interface Gradebook { course: CourseInfo; assignments: GradebookColumn[]; students: GradebookRow[]; classAverage?: number | null }

export const getGradebook = (courseId: number): Promise<Gradebook> => client.get(`${root()}/manage/courses/${courseId}/gradebook`).then(r => r.data);
export const setCounts = (assignmentId: number, counts: boolean): Promise<Gradebook> =>
  client.put(`${root()}/manage/assignments/${assignmentId}/counts`, { counts }).then(r => r.data);
export const getGradebookSheets = (courseId: number): Promise<SheetTarget[]> =>
  client.get(`${root()}/manage/courses/${courseId}/gradebook/sheets`).then(r => r.data);
export const sendGradebookToSheet = (courseId: number, sheetId: number, sectionId: number): Promise<{ updated: number; message: string }> =>
  client.post(`${root()}/manage/courses/${courseId}/gradebook/send-to-sheet`, { sheetId, sectionId }).then(r => r.data);

// ── Students ───────────────────────────────────────────────────────────────

export interface StudentCourse {
  courseId: number; title: string; code: string | null; lecturer: string | null; items: number; assignments: number;
  newItems: number; toHandIn: number; hiddenReason: 'HIDDEN' | 'QUIZ' | null;
  /** The student's running total from released marks (null before any count). */
  assignmentTotal?: { total: number; outOf: number; percent: number | null } | null;
}
export type StudentWorkStatus = 'TO_DO' | 'MISSED' | 'HANDED_IN' | 'MARKED';
export interface StudentAssignmentState {
  dueAt: string | null; closesAt: string | null; open: boolean; reopened: boolean; maxMarks: number;
  allowTyped: boolean; allowFiles: boolean; marksReleased: boolean;
  submittedAt?: string; late?: boolean; score?: number; feedback?: string | null; status: StudentWorkStatus;
}
export interface StudentItem {
  id: number; kind: MaterialKind; title: string; description: string | null; linkUrl: string | null; pinned: boolean;
  publishedAt: string | null; isNew: boolean; opened: boolean; files: FileInfo[]; assignment?: StudentAssignmentState;
}
export interface StudentWeek { number: number; topic: string | null; start: string | null; end: string | null; items: StudentItem[] }
export interface MyMarks {
  assignments: { id: number; title: string; weekNumber: number; maxMarks: number; counts: boolean; released: boolean;
    state: CellState | 'NOT_RELEASED'; score: number | null }[];
  total: number; outOf: number; percent: number | null; notReleased: number;
}
export interface StudentSpace { course: CourseInfo; session: string; hiddenReason: 'HIDDEN' | 'QUIZ' | null; weeks: StudentWeek[]; currentWeek: number; myMarks?: MyMarks }
export interface StudentOverview {
  newItems: { id: number; courseId: number; courseCode: string | null; courseTitle: string; title: string; kind: MaterialKind; weekNumber: number; publishedAt: string }[];
  dueSoon: { id: number; courseId: number; courseCode: string | null; courseTitle: string; title: string; dueAt: string; closesAt: string | null; submitted: boolean }[];
}
export interface StudentAssignmentDetail {
  id: number; title: string; description: string | null; weekNumber: number; course: CourseInfo; files: FileInfo[];
  assignment: StudentAssignmentState; maxFiles: number; maxFileMb: number; accepted: string[];
  submission: null | {
    typedAnswer: string | null; submittedAt: string | null; late: boolean; files: FileInfo[]; locked: boolean;
    score?: number; feedback?: string | null; feedbackFiles?: FileInfo[];
  };
}

export const getStudentCourses = (): Promise<StudentCourse[]> => client.get(`${root()}/student/courses`).then(r => r.data);
export const getStudentOverview = (): Promise<StudentOverview> => client.get(`${root()}/student/overview`).then(r => r.data);
export const getStudentSpace = (courseId: number): Promise<StudentSpace> => client.get(`${root()}/student/courses/${courseId}`).then(r => r.data);
export const markOpened = (id: number): Promise<void> => client.post(`${root()}/student/items/${id}/opened`).then(() => undefined);
export const studentFileLink = (fileId: string, inline = false): Promise<SignedLink> =>
  client.post(`${root()}/student/files/${fileId}/link`, null, { params: { inline } }).then(r => r.data);
export const studentZipLink = (courseId: number, week: number): Promise<{ url: string }> =>
  client.post(`${root()}/student/courses/${courseId}/weeks/${week}/zip-link`).then(r => r.data);
export const getStudentAssignment = (id: number): Promise<StudentAssignmentDetail> =>
  client.get(`${root()}/student/assignments/${id}`).then(r => r.data);
export const submitAssignment = (id: number, typedAnswer: string | null, keep: string[], files: File[], onProgress?: (p: number) => void): Promise<StudentAssignmentDetail> => {
  const fd = new FormData();
  if (typedAnswer != null) fd.append('typedAnswer', typedAnswer);
  keep.forEach(k => fd.append('keep', k));
  files.forEach(f => fd.append('files', f));
  return client.post(`${root()}/student/assignments/${id}/submission`, fd, upload(onProgress)).then(r => r.data);
};

// ── Term dates ─────────────────────────────────────────────────────────────

export interface TermDates {
  sessionId: number; sessionName: string;
  terms: { semester: number; startDate: string | null; weeks: number; endDate: string | null; updatedBy: string | null }[];
}
export const getTermDates = (): Promise<TermDates> => client.get(`${apiRoot()}/academic/terms`).then(r => r.data);
export const saveTermDates = (semester: number, startDate: string | null, weeks: number): Promise<TermDates> =>
  client.put(`${apiRoot()}/academic/terms/${semester}`, { startDate, weeks }).then(r => r.data);

// ── Helpers ────────────────────────────────────────────────────────────────

/** A signed link is relative to the API root ("/materials/download/…"). */
export const absoluteLink = (path: string) => apiRoot() + path;

export const errMsg = (e: any, fallback = 'Something went wrong. Please try again.') => {
  const data = e?.response?.data;
  if (data?.code === 'MATERIALS_OFF') return 'Course notes and assignments are switched off.';
  if (e?.response?.status === 413) return 'That upload is too large for the server.';
  if (e?.code === 'ECONNABORTED') return 'This is taking too long. Check your connection and try again.';
  return data?.message ?? fallback;
};
