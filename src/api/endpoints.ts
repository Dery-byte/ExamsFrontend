/**
 * All API calls from Angular services ported as typed functions.
 * Maps 1-to-1 with Angular's: LoginService, UserService, CategoryService,
 * QuizService, QuestionService, ReportServiceService, QuizProgressService,
 * RegCoursesService, AnswerService
 */
import client from './client';

// ── Auth ──────────────────────────────────────────────────────────────────
export const authenticate = (data: { username: string; password: string }) =>
  client.post('/authenticate', data).then(r => r.data);

export const getCurrentUser = () =>
  client.get('/current-user').then(r => {
    const d = r.data;
    // Backend UserResponse uses firstName/lastName (capital N) — normalize to lowercase
    if (d.firstName !== undefined && d.firstname === undefined) d.firstname = d.firstName;
    if (d.lastName  !== undefined && d.lastname  === undefined) d.lastname  = d.lastName;
    return d;
  });

export const doLogout = (token: string) =>
  client.post('/logout', {}, { headers: { Authorization: `Bearer ${token}` } });

// Unified: pass { phone } for SMS recovery, or { email } for email recovery
export const forgotPasswordSms = (phone: string) =>
  client.post('/forgotten-password', { phone }).then(r => r.data);

export const forgotPasswordEmail = (email: string) =>
  client.post('/forgotten-password', { email }).then(r => r.data);

export const forgotPassword = (data: { phone?: string; email?: string }) =>
  client.post('/forgotten-password', data).then(r => r.data);

// Must call /reset-password-with-token — this is handled by PasswordResetController
// which reads from the same in-memory map where the token was stored.
// /reset-password (AuthenticationController) reads from MySQL DB — a completely separate system.
export const resetPasswordWithToken = (data: { token: string; newPassword: string }) =>
  client.post('/reset-password-with-token', data).then(r => r.data);

// ── User registration ─────────────────────────────────────────────────────
export const registerStudent = (data: object) =>
  client.post('/register', data).then(r => r.data);

export const registerLecturer = (data: object) =>
  client.post('/register/lecturer', data).then(r => r.data);

// ── User management ───────────────────────────────────────────────────────
export const getAllUsers = () => client.get('/users').then(r => r.data);

export const getAllStudentsCounts = () => client.get('/students/counts').then(r => r.data);
/** Rich student list with programId/currentLevel/currentSemester — for admin enroll & promote pages */
export const adminGetAllStudents = () => client.get('/admin/students').then(r => r.data);
export const getAllLecturersCounts = () => client.get('/lecturers/counts').then(r => r.data);

export const getStudentById = (id: number) => client.get(`/studentbyId/${id}`).then(r => r.data);
export const getLecturerById = (id: number) => client.get(`/lecturerbyId/${id}`).then(r => r.data);

export const updateStudent = (id: number, data: object) => client.put(`/update/student/${id}`, data).then(r => r.data);
export const updateLecturer = (id: number, data: object) => client.put(`/update/lecturer/${id}`, data).then(r => r.data);

// Update current user's own profile — uses Principal, works for ALL roles
export const updateMyProfile = (_id: number, _role: string, data: { firstname?: string; lastname?: string; email?: string; phone?: string }) =>
  client.put('/update-my-profile', data).then(r => r.data);


// Change password for the currently logged-in user
export const changeMyPassword = (newPassword: string, currentPassword?: string) =>
  client.put('/updatepassword', { password: newPassword, ...(currentPassword ? { currentPassword } : {}) }).then(r => r.data);

export const deleteStudent = (id: number) => client.delete(`/student/${id}`).then(r => r.data);
export const deleteLecturer = (id: number) => client.delete(`/lecturer/${id}`).then(r => r.data);

// ── Categories ────────────────────────────────────────────────────────────
export const getCategories = () => client.get('/getCategories').then(r => r.data);
export const getCategoriesForUser = () => client.get('/categoriesForUser').then(r => r.data);
export const getCategory = (id: number) => client.get(`/category/${id}`).then(r => r.data);
export const addCategory = (data: object) => client.post('/add', data).then(r => r.data);
export const addLecturerCategory = (data: object) => client.post('/lecturer/addCategory', data).then(r => r.data);
export const addCategoryForUser = (data: object) => client.post('/user/addCategory', data).then(r => r.data);
export const adminUpdateCategory = (id: number, data: object) =>
  client.put(`/category/admin/updateCategory/${id}`, data).then(r => r.data);
export const updateCategory = (data: object) => client.put('/category/updateCategory', data).then(r => r.data);
export const deleteCategory = (id: number) => client.delete(`/category/${id}`).then(r => r.data);
export const assignCourseToLecturer = (courseId: number, lecturerId: number) =>
  client.put(`/courses/${courseId}/assign/${lecturerId}`, {}).then(r => r.data);
export const getAllLecturers = () => client.get('/all/lecturers').then(r => r.data);
export const getLecturersByDepartment = () => client.get('/lecturers/by-department').then(r => r.data);
export const getAllStudents = () => client.get('/all/students').then(r => r.data);
export const getLecturerCoursesWithQuizzes = (lecturerId: number | string) => 
  client.get(`/category/lecturer/${lecturerId}/with-quizzes`).then(r => r.data);
export const getMyCoursesWithQuizzes = () =>
  client.get('/category/my-courses-with-quizzes').then(r => r.data);

// ── Quizzes ───────────────────────────────────────────────────────────────
export const loadQuizzes = () => client.get('/getQuizzes').then(r => r.data);
export const loadQuizzesForUser = () => client.get('/user/getQuiz').then(r => r.data);
export const getQuiz = (id: number | string) => client.get(`/singleQuiz/${id}`).then(r => r.data);
/** Title + allowed program names only — safe to call before login, for the shared quiz link's sign-in page. */
export const getQuizPublicSummary = (id: number | string) => client.get(`/quiz/${id}/public-summary`).then(r => r.data);
export const addQuiz = (data: object) => client.post('/addQuiz', data).then(r => r.data);
export const addLecturerQuiz = (data: object) => client.post('/lecturer/addQuiz', data).then(r => r.data);
export const addUserQuiz = (data: object) => client.post('/user/addQuiz', data).then(r => r.data);
export const updateQuiz = (data: object) => client.put('/update', data).then(r => r.data);
export const deleteQuiz = (id: number) => client.delete(`/delete/quiz/${id}`).then(r => r.data);
export const setQuizEmailReport = (id: number, enabled: boolean): Promise<boolean> =>
  client.put(`/quiz/${id}/email-report`, { enabled }).then(r => !!r.data?.enabled);
export const updateQuizStatus = (id: number, status: string) =>
  client.put(`/quiz/status/${id}`, { status }).then(r => r.data);
export const getActiveQuizzes = () => client.get('/active/quizzes').then(r => r.data);
export const getActiveQuizzesOfCategory = (cid: number) =>
  client.get(`/category/active/${cid}`).then(r => r.data);
export const getTakenQuizzesOfCategoryByUser = (cid: number) =>
  client.get(`/category/takenByUser/${cid}`).then(r => r.data);
export const getNumberOfTheoryToAnswer = (qid: number | string) =>
  client.get(`/numberOfTheoryQuestion/${qid}`).then(r => r.data);




export const addNumberOfTheoryToAnswer = (data: object) =>
  client.post('/numberOfTheoryQuestion/add', data).then(r => r.data);

export const updateNumberOfTheoryToAnswer = (data: object) =>
  client.put('/numberOfTheoryQuestion/update', data).then(r => r.data);

// ── Questions OBJ ─────────────────────────────────────────────────────────
export const getQuestionsForStudent = (qid: number | string) =>
  client.get(`/question/quiz/all/${qid}`).then(r => r.data);
export const getQuestionsForLecturer = (qid: number | string) =>
  client.get(`/questions/quiz/all/${qid}`).then(r => r.data);
export const getQuestionsForAdmin = (qid: number | string) =>
  client.get(`/questionAdmin/quiz/all/${qid}`).then(r => r.data);
export const getQuestionsForText = (qid: number | string) =>
  client.get(`/question/quiz/${qid}`).then(r => r.data);
export const getQuestion = (id: number | string) => client.get(`/question/${id}`).then(r => r.data);
export const addQuestion = (data: object) => client.post('/question/add', data).then(r => r.data);
export const updateQuestion = (data: object) => client.put('/question/updateQuestions', data).then(r => r.data);
export const deleteQuestion = (id: number) => client.delete(`/question/${id}`).then(r => r.data);
export const uploadQuestions = (qid: number | string, questions: object[]) =>
  client.post(`/upload/${qid}`, questions).then(r => r.data);
export const evalQuiz = (qid: number | string, answers: object[]) =>
  client.post(`/eval-quiz/${qid}`, answers).then(r => r.data);

// ── Theory Questions ──────────────────────────────────────────────────────
export const getTheoryQuestions = (qid: number | string) =>
  client.get(`/theoryquestion/quiz/all/${qid}`).then(r => r.data);
export const getTheoryQuestion = (id: number | string) =>
  client.get(`/theoryquestion/${id}`).then(r => r.data);



export const addTheoryQuestion = (data: object) =>
  client.post('/theoryquestion/add', data).then(r => r.data);



export const updateTheoryQuestion = (data: object) =>
  client.put('/theoryquestion/updateQuestions', data).then(r => r.data);
export const deleteTheoryQuestion = (id: number) =>
  client.delete(`/theoryquestion/${id}`).then(r => r.data);










export const uploadTheoryQuestions = (qid: number | string, questions: object[]) =>
  client.post(`/theoryupload/${qid}`, questions).then(r => r.data);













export const setCompulsoryQuestion = (quizId: number | string, prefix: string, isCompulsory: boolean) =>
  client.put(`/update-compulsory/${quizId}/${prefix}?isCompulsory=${isCompulsory}`, null, { responseType: 'text' }).then(r => r.data);

// ── GPT eval ──────────────────────────────────────────────────────────────
export const evalTheory = (questions: object) =>
  client.post('/quizGPT/evaluate', questions).then(r => r.data);

// ── Reports ───────────────────────────────────────────────────────────────
export const getReport = (uid: number, qid: number | string) =>
  client.get(`/getReportByUidAndQid/${uid}/${qid}`).then(r => r.data);
export const getReportsByUser = (uid: number) =>
  client.get(`/getReportsByUser/${uid}`).then(r => r.data);
export const loadReportSummary = () => client.get('/getReport').then(r => r.data);
export const getReportByQuizId = (qid: number | string) =>
  client.get(`/getReports/${qid}`).then(r => r.data);
export const getReportsByMyQuiz = (qid: number | string) =>
  client.get(`/quiz-results/my-quiz/${qid}`).then(r => r.data);
export const getTheoryReport = (qid: number | string) =>
  client.get(`/answers/quiz/${qid}`).then(r => r.data);
export const getTheoryDetails = (qid: number | string) =>
  client.get(`/quiz/${qid}`).then(r => r.data);
export const getResultsDetails = (qid: number | string) =>
  client.get(`/quiz/result/${qid}`).then(r => r.data);
export const getCategoriesFromReport = () =>
  client.get('/my-students-reports').then(r => r.data);
export const getStudentCount = () =>
  client.get('/students/counts').then(r => r.data);
export const getLecturerCount = () =>
  client.get('/lecturers/counts').then(r => r.data);

// Download PDF result slip (returns raw blob)
export const downloadReportPdf = (qid: number | string) =>
  client.get(`/report/pdf/${qid}`, { responseType: 'blob' });

// Extract unique categories+quizzes from raw report data (mirrors Angular extractCategoriesAndQuizzes)
const extractCategoriesAndQuizzes = (raw: any): any[] => {
  // Handle both array responses and wrapped responses like { data: [...] }
  const quizzes: any[] = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
  const result: any[] = [];
  quizzes.forEach((item: any) => {
    // Each item is a report: { quiz: { qId, title, category: { cid, title } }, marks, user, ... }
    const cid   = item?.quiz?.category?.cid;
    const qId   = item?.quiz?.qId;
    const qTitle = item?.quiz?.title;
    const cTitle = item?.quiz?.category?.title;
    if (!cid || !qId) return;
    const idx = result.findIndex(c => c.cid === cid);
    if (idx === -1) {
      result.push({ cid, title: cTitle, quizTitles: [{ qId, title: qTitle }] });
    } else {
      if (!result[idx].quizTitles.find((q: any) => q.qId === qId)) {
        result[idx].quizTitles.push({ qId, title: qTitle });
      }
    }
  });
  return result;
};
export const getUniqueCategoriesAndQuizzes = () =>
  client.get('/getReport').then(r => extractCategoriesAndQuizzes(r.data));
export const getUniqueCategoriesForLecturer = () =>
  client.get('/my-students-reports').then(r => extractCategoriesAndQuizzes(r.data));

// ── Quiz Progress ─────────────────────────────────────────────────────────
export const updateQuizAnswer = (data: {
  questionId: number;
  option: string;
  checked: boolean;
  quizId?: number;
  pairIndex?: number;   // MATCHING only: 0-based pair index
  replace?: boolean;    // FILL_BLANK / NUMERIC: the typed text replaces the saved answer
}) =>
  client.post('/quiz-progress/update', data).then(r => r.data);
export const getQuizAnswersByQuiz = (quizId: number | string) =>
  client.get(`/quiz-progress/quiz/${quizId}`).then(r => r.data);
export const clearQuizAnswers = (quizId: number | string) =>
  client.delete(`/quiz-progress/quiz/${quizId}`).then(r => r.data);

export const saveTheoryAnswers = (quizId: number | string, answers: object[]) =>
  client.post(`/theory-progress/save/${quizId}`, answers).then(r => r.data);
export const loadTheoryAnswers = (quizId: number | string) =>
  client.get(`/theory-progress/load/${quizId}`).then(r => r.data);
export const clearTheoryAnswers = (quizId: number | string) =>
  client.delete(`/theory-progress/clear/${quizId}`).then(r => r.data);

// ── Quiz Timer ────────────────────────────────────────────────────────────
export const getQuizTimer = (quizId: number | string) =>
  client.get(`/quiz-timer/getRemainingTime/${quizId}`).then(r => r.data).catch(e => { if (e.response?.status === 404) return null; throw e; });
export const saveQuizTimer = (quizId: number | string, remainingTime: number) =>
  client.patch(`/quiz-timer/saveRemainingTime/${quizId}`, { remainingTime }).then(r => r.data);
export const deleteQuizTimer = (quizId: number | string) =>
  client.delete(`/quiz-timer/deleteRemainingTime/${quizId}`).then(r => r.data);


export const saveViolationDelay = (quizId: number | string, violationDelayTime: number) =>
  client.post(`/quiz-timer/saveViolation-delay/${quizId}`, { violationDelayTime }).then(r => r.data);


export const getViolationDelay = (quizId: number | string) =>
  client.get(`/quiz-timer/getViolation-delay/${quizId}`).then(r => r.data).catch(e => { if (e.response?.status === 404) return null; throw e; });

export const saveViolationCount = (quizId: number | string, count: number) =>
  client.post(`/quiz-timer/saveViolationCount/${quizId}`, { totalViolationCount: count }).then(r => r.data);

export const getViolationCount = (quizId: number | string) =>
  client.get(`/quiz-timer/getViolationCount/${quizId}`).then(r => r.data);

// ── Registered Courses ────────────────────────────────────────────────────
export const getRegCourses = () => client.get('/getRegCourses').then(r => r.data);
export const regCourses = (data: object) => client.post('/registerCourse ', data).then(r => r.data);  // trailing space matches Angular
export const deleteRegCourse = (rid: number | string) =>
  client.delete(`/regCourse/deleteById/${rid}`).then(r => r.data);

// ── Section B marks ───────────────────────────────────────────────────────
export const addSectionBMarks = (questions: object) =>
  client.put('/addtheoryMark', questions).then(r => r.data);

// ── Student theory answers by user + quiz ─────────────────────────────────
export const getStudentTheoryAnswers = (userId: number, quizId: number | string) =>
  client.get(`/answers/by-user-quiz/${userId}/${quizId}`).then(r => r.data).catch(() => []);

// ── LLM Providers ─────────────────────────────────────────────────────────
export const getAvailableLlmProviders = () => client.get('/llm/providers').then(r => r.data);
export const getQuizLlmProvider = (quizId: number | string) => client.get(`/llm/quiz/${quizId}/provider`).then(r => r.data);
export const setQuizLlmProvider = (quizId: number | string, provider: string) => client.put(`/llm/quiz/${quizId}/provider`, { provider }).then(r => r.data);

// ── Programs & Departments (read-only — available to all authenticated users) ────────────
export const getPrograms = () => client.get('/programs').then(r => r.data);
/** Enabled programs in the logged-in admin/HOD's own department. */
export const getMyDepartmentPrograms = () => client.get('/programs/my-department').then(r => r.data);
export const getProgramsByDept =(deptId: number) => client.get(`/programs/department/${deptId}`).then(r => r.data);
export const getProgramById = (id: number) => client.get(`/programs/${id}`).then(r => r.data);
export const getDepartments = () => client.get('/departments').then(r => r.data);

// ── Student filtered courses ───────────────────────────────────────────────
export const getCoursesForStudent = () => client.get('/categories/for-student').then(r => r.data);

// ── Super Admin endpoints (different base path: /api/v1/super-admin) ────────
import axios from 'axios';
const SA_BASE = (import.meta as any).env?.VITE_API_URL
  ? (import.meta as any).env.VITE_API_URL.replace('/auth', '/super-admin')
  : 'https://examsbackend.onrender.com/api/v1/super-admin';

const saClient = axios.create({ baseURL: SA_BASE, headers: { 'Content-Type': 'application/json' } });
saClient.interceptors.request.use((cfg: any) => {
  const token = localStorage.getItem('access_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// ── Super Admin — Departments ──────────────────────────────────────────────
export const saGetDepartments   = () => saClient.get('/departments').then(r => r.data);
export const saCreateDepartment = (data: object) => saClient.post('/departments', data).then(r => r.data);
export const saUpdateDepartment = (id: number, data: object) => saClient.put(`/departments/${id}`, data).then(r => r.data);
export const saDeleteDepartment = (id: number) => saClient.delete(`/departments/${id}`).then(r => r.data);

// ── Super Admin — Programs ─────────────────────────────────────────────────
export const saGetPrograms       = () => saClient.get('/programs').then(r => r.data);
export const saGetProgramsByDept = (deptId: number) => saClient.get(`/programs/department/${deptId}`).then(r => r.data);
export const saCreateProgram     = (data: object) => saClient.post('/programs', data).then(r => r.data);
export const saUpdateProgram     = (id: number, data: object) => saClient.put(`/programs/${id}`, data).then(r => r.data);
export const saDeleteProgram     = (id: number) => saClient.delete(`/programs/${id}`).then(r => r.data);
/** Toggle a program's enabled/disabled state. Returns the updated ProgramDTO. */
export const saToggleProgram     = (id: number) => saClient.patch(`/programs/${id}/toggle`).then(r => r.data);

// ── Super Admin — HODs ─────────────────────────────────────────────────────
export const saGetAllHods = () => saClient.get('/admins').then(r => r.data);
export const saCreateHod  = (data: object) => saClient.post('/register/hod', data).then(r => r.data);
export const saUpdateHod  = (id: number, data: object) => saClient.put(`/admin/${id}`, data).then(r => r.data);
export const saDeleteHod  = (id: number) => saClient.delete(`/admin/${id}`).then(r => r.data);


// ── Super Admin — Students semester ───────────────────────────────────────
export const saGetAllStudents     = () => saClient.get('/students').then(r => r.data);
export const saSetStudentSemester = (id: number, data: { currentSemester?: number; currentLevel?: number }) =>
  saClient.put(`/student/${id}/level-semester`, data).then(r => r.data);

// ── Super Admin — Student Promotion (forward + backward) ──────────────────
export const saPromoteStudent     = (id: number, targetLevel: number, override = false) =>
  saClient.put(`/student/${id}/promote`, override ? { targetLevel, override: 1 } : { targetLevel }).then(r => r.data);
export const saPromoteAllAtLevel  = (programId: number, level: number, targetLevel: number) =>
  saClient.put(`/students/promote-all/${programId}/${level}`, { targetLevel }).then(r => r.data);
export const saPromoteSemesterAllAtLevel = (programId: number, level: number) =>
  saClient.put(`/students/promote-semester-all/${programId}/${level}`).then(r => r.data);
export const saDemoteSemesterAllAtLevel = (programId: number, level: number) =>
  saClient.put(`/students/demote-semester-all/${programId}/${level}`).then(r => r.data);

// ── Super Admin — Enroll student in course ────────────────────────────────
export const saUnenrollStudent = (studentId: number, categoryId: number) =>
  saClient.delete(`/unenroll-student/${studentId}/${categoryId}`).then(r => r.data);
export const saGetEnrolledCourseIds = (studentId: number) =>
  saClient.get(`/student/${studentId}/enrolled-courses`).then(r => r.data);
export const saEnrollStudent      = (studentId: number, categoryId: number) =>
  saClient.post('/enroll-student', { studentId, categoryId }).then(r => r.data);
export const saGetCoursesForProgram = (programId: number) =>
  saClient.get(`/courses-for-program/${programId}`).then(r => r.data);

// ── Super Admin — System Settings ─────────────────────────────────────────
export const saGetSystemSettings = () =>
  saClient.get('/settings').then(r => r.data);
export const saUpdateSystemSettings = (data: Record<string, string>) =>
  saClient.put('/settings', data).then(r => r.data);

// ── HOD (Admin) — Student Promotion (forward-only) ────────────────────────
export const adminPromoteStudent    = (id: number, targetLevel: number) =>
  client.put(`/admin/student/${id}/promote`, { targetLevel }).then(r => r.data);
export const adminPromoteAllAtLevel = (programId: number, level: number, targetLevel: number) =>
  client.put(`/admin/students/promote-all/${programId}/${level}`, { targetLevel }).then(r => r.data);
export const adminPromoteSemesterAllAtLevel = (programId: number, level: number) =>
  client.put(`/admin/students/promote-semester-all/${programId}/${level}`).then(r => r.data);
export const adminDemoteSemesterAllAtLevel = (programId: number, level: number) =>
  client.put(`/admin/students/demote-semester-all/${programId}/${level}`).then(r => r.data);

// ── HOD (Admin) — Enroll student in course ────────────────────────────────
export const adminUnenrollStudent = (studentId: number, categoryId: number) =>
  client.delete(`/admin/unenroll-student/${studentId}/${categoryId}`).then(r => r.data);
export const adminGetEnrolledCourseIds = (studentId: number) =>
  client.get(`/admin/student/${studentId}/enrolled-courses`).then(r => r.data);
export const adminEnrollStudent       = (studentId: number, categoryId: number) =>
  client.post('/admin/enroll-student', { studentId, categoryId }).then(r => r.data);
export const adminGetCoursesForProgram = (programId: number) =>
  client.get(`/admin/courses-for-program/${programId}`).then(r => r.data);

// ── Register Super Admin (bootstrap — via auth base) ──────────────────────
export const registerSuperAdmin = (data: object) => client.post('/register/super-admin', data).then(r => r.data);



export const getAdminDashboardStats = () => client.get('/admin/dashboard-stats').then(r => r.data);

// ── Marks Entry ───────────────────────────────────────────────────────────
export const syncMarksForStudent = (sheetId: number | string, studentId: number, sectionId: number) =>
  client.post(client.defaults.baseURL!.replace('/v1/auth', '') + `/marks/sheet/${sheetId}/sync-marks/${studentId}?sectionId=${sectionId}`).then(r => r.data);

export const syncMarksBulk = (sheetId: number | string, sectionId: number) =>
  client.post(client.defaults.baseURL!.replace('/v1/auth', '') + `/marks/sheet/${sheetId}/sync-marks/bulk?sectionId=${sectionId}`).then(r => r.data);

export const addSheetSection = (sheetId: number | string, data: { sectionName: string, maxScore: number }) =>
  client.post(client.defaults.baseURL!.replace('/v1/auth', '') + `/marks/sheet/${sheetId}/sections`, data).then(r => r.data);

export const deleteSheetSection = (sheetId: number | string, sectionId: number) =>
  client.delete(client.defaults.baseURL!.replace('/v1/auth', '') + `/marks/sheet/${sheetId}/sections/${sectionId}`).then(r => r.data);
export const getAdminDepartmentCategoriesAndQuizzes = () => client.get('/admin/department-reports').then(r => extractCategoriesAndQuizzes(r.data));

// ── Quiz attempts ─────────────────────────────────────────────────────────
/** Student: where I stand on this quiz (max, used, remaining, canStart). */
export const getMyAttemptStatus = (qid: number | string) =>
  client.get(`/quiz-attempts/${qid}/my-status`).then(r => r.data);
/** Student: start a new attempt or resume the one in progress. Rejects with 409 if none is left. */
export const beginQuizAttempt = (qid: number | string) =>
  client.post(`/quiz-attempts/${qid}/begin`).then(r => r.data);
export const finishQuizAttempt = (qid: number | string) =>
  client.post(`/quiz-attempts/${qid}/finish`).then(r => r.data);
/** Staff: every attempt of every student for a quiz, each with its own marks. */
export const getQuizAttempts = (qid: number | string) =>
  client.get(`/quiz-attempts/quiz/${qid}`).then(r => r.data);
/** Staff: allow one student to take the quiz again. */
export const allowQuizRetake = (qid: number | string, studentId: number, reason?: string) =>
  client.post(`/quiz-attempts/quiz/${qid}/student/${studentId}/retake`, { reason }).then(r => r.data);

// ── Question images (PNG/JPG/JPEG are converted to WebP by the backend) ────────
export const uploadQuestionImage = (file: File): Promise<string> => {
  const form = new FormData();
  form.append('file', file);
  return client
    .post('/question-images/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then(r => r.data.image as string);
};

// ── Email result slips to students after lecturer review (Admin / Super Admin toggle) ──
export const getReportEmailSetting = (): Promise<boolean> =>
  client.get('/report-email-setting').then(r => !!r.data?.enabled);
export const setReportEmailSetting = (enabled: boolean): Promise<boolean> =>
  client.put('/report-email-setting', { enabled }).then(r => !!r.data?.enabled);

// ── Feature flags (set by Super Admin, readable by every role) ────────────
/** Switchable features (see Feature Controls). */
export type FeatureKey =
  | 'STUDENT_SELF_SIGNUP' | 'HOD_ANALYTICS' | 'HOD_DATA_TOOLS' | 'HOD_PROMOTION' | 'HOD_ANNOUNCEMENTS'
  | 'STUDENT_COURSE_REGISTRATION' | 'REMARK_REQUESTS' | 'STUDENT_TIMETABLE' | 'STUDENT_TRANSCRIPT' | 'QUESTION_BANK'
  | 'FORCE_PASSWORD_CHANGE' | 'DOCUMENT_VERIFICATION';

export interface FeatureFlags {
  marksSheetAdmin: boolean; marksSheetLecturer: boolean; marksSheetStudent: boolean;
  /** Each feature's state for the signed-in user (system switch + their department's choice). */
  features?: Partial<Record<FeatureKey, boolean>>;
}
export const getFeatureFlags = (): Promise<FeatureFlags> =>
  client.get('/feature-flags').then(r => r.data);

// ── Communication & oversight (Phase 3) ───────────────────────────────────
/** Root of the authenticated /api routes (outside the public /api/v1/auth prefix). */
const apiRoot = () => client.defaults.baseURL!.replace('/v1/auth', '');

export interface AppNotification {
  id: number; type: string; title: string; message: string; link: string | null; read: boolean; createdAt: string;
}
export const getNotifications = (limit = 30): Promise<AppNotification[]> =>
  client.get(`${apiRoot()}/notifications`, { params: { limit } }).then(r => r.data);
export const getUnreadNotificationCount = (): Promise<number> =>
  client.get(`${apiRoot()}/notifications/unread-count`).then(r => r.data?.count ?? 0);
export const markNotificationRead = (id: number) =>
  client.post(`${apiRoot()}/notifications/${id}/read`).then(r => r.data);
export const markAllNotificationsRead = () =>
  client.post(`${apiRoot()}/notifications/read-all`).then(r => r.data);

export type AnnouncementAudience = 'ALL' | 'STUDENTS' | 'LECTURERS' | 'ADMINS' | 'STAFF';
export interface Announcement {
  id: number; title: string; body: string; audience: AnnouncementAudience;
  departmentId: number | null; departmentName: string | null;
  programId: number | null; programName: string | null; level: number | null;
  pinned: boolean; expiresOn: string | null; createdAt: string;
  authorName: string | null; authorRole: string | null;
}
export const getAnnouncements = (): Promise<Announcement[]> =>
  client.get(`${apiRoot()}/announcements`).then(r => r.data);
export const getManageableAnnouncements = (): Promise<Announcement[]> =>
  client.get(`${apiRoot()}/announcements/manage`).then(r => r.data);
export const postAnnouncement = (data: {
  title: string; body: string; audience: AnnouncementAudience; departmentId?: number | null;
  programId?: number | null; level?: number | null; pinned?: boolean; expiresOn?: string | null;
}): Promise<Announcement> => client.post(`${apiRoot()}/announcements`, data).then(r => r.data);
export const deleteAnnouncement = (id: number) =>
  client.delete(`${apiRoot()}/announcements/${id}`).then(r => r.data);

export const getAnalyticsOverview = (departmentId?: number | ''): Promise<any> =>
  client.get(`${apiRoot()}/analytics/overview`, { params: departmentId ? { departmentId } : {} }).then(r => r.data);

export interface AuditEntry {
  id: number; actorId: number | null; actorName: string | null; actorRole: string | null; action: string;
  httpMethod: string; path: string; entityId: string | null; details: string | null;
  statusCode: number | null; ipAddress: string | null; createdAt: string;
}
export const saGetAuditLogs = (params: {
  actor?: string; action?: string; role?: string; from?: string; to?: string; page?: number; size?: number;
}): Promise<{ items: AuditEntry[]; page: number; size: number; totalItems: number; totalPages: number }> =>
  saClient.get('/audit-logs', { params }).then(r => r.data);
export const saGetAuditActions = (): Promise<string[]> => saClient.get('/audit-logs/actions').then(r => r.data);

// ── Exam operations (Phase 2) ─────────────────────────────────────────────
export const getTimetable = (params: { from?: string; to?: string; departmentId?: number | ''; programId?: number | ''; level?: string }) =>
  client.get(`${apiRoot()}/timetable`, {
    params: Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null)),
  }).then(r => r.data);

export const getBankCourses = () => client.get(`${apiRoot()}/question-bank/courses`).then(r => r.data);
export const getBankForCourse = (courseId: number) => client.get(`${apiRoot()}/question-bank/course/${courseId}`).then(r => r.data);
export const addBankQuestion = (courseId: number, data: object) =>
  client.post(`${apiRoot()}/question-bank/course/${courseId}`, data).then(r => r.data);
export const updateBankQuestion = (id: number, data: object) =>
  client.put(`${apiRoot()}/question-bank/${id}`, data).then(r => r.data);
export const deleteBankQuestion = (id: number) => client.delete(`${apiRoot()}/question-bank/${id}`).then(r => r.data);
export const importQuizIntoBank = (quizId: number, data: { topic?: string; difficulty?: string }) =>
  client.post(`${apiRoot()}/question-bank/import/quiz/${quizId}`, data).then(r => r.data);
export const drawBankIntoQuiz = (quizId: number, data: { topic?: string; difficulty?: string; questionType?: string; count?: number; questionIds?: number[] }) =>
  client.post(`${apiRoot()}/question-bank/draw/quiz/${quizId}`, data).then(r => r.data);

/** Fire-and-forget: log one proctoring event from the exam page. */
export const recordProctoringEvent = (quizId: number | string, type: string, violationNumber?: number) =>
  client.post(`${apiRoot()}/proctoring/events`, { quizId: Number(quizId), type, violationNumber }).then(r => r.data);
export const getProctoringReport = (quizId: number | string) =>
  client.get(`${apiRoot()}/proctoring/quiz/${quizId}`).then(r => r.data);
export const getProctoringTimeline = (quizId: number | string, studentId: number) =>
  client.get(`${apiRoot()}/proctoring/quiz/${quizId}/student/${studentId}`).then(r => r.data);

export const requestRemark = (reportId: number, reason: string) =>
  client.post(`${apiRoot()}/remarks`, { reportId, reason }).then(r => r.data);
export const getMyRemarks = () => client.get(`${apiRoot()}/remarks/mine`).then(r => r.data);
export const getRemarksToManage = () => client.get(`${apiRoot()}/remarks/manage`).then(r => r.data);
export const respondToRemark = (id: number, decision: 'RESOLVED' | 'REJECTED', response: string) =>
  client.post(`${apiRoot()}/remarks/${id}/respond`, { decision, response }).then(r => r.data);


// ── Academic core (Phase 1) ───────────────────────────────────────────────
export const getSessions = () => client.get(`${apiRoot()}/academic/sessions`).then(r => r.data);
export const createSession = (data: { name: string; startDate?: string; endDate?: string; makeCurrent?: boolean }) =>
  client.post(`${apiRoot()}/academic/sessions`, data).then(r => r.data);
export const updateSession = (id: number, data: { name: string; startDate?: string; endDate?: string }) =>
  client.put(`${apiRoot()}/academic/sessions/${id}`, data).then(r => r.data);
export const makeSessionCurrent = (id: number) => client.post(`${apiRoot()}/academic/sessions/${id}/current`).then(r => r.data);
export const deleteSession = (id: number) => client.delete(`${apiRoot()}/academic/sessions/${id}`).then(r => r.data);

export const getGradingSettings = () => client.get(`${apiRoot()}/academic/grading`).then(r => r.data);
export const getGradingPreset = (key: string) => client.get(`${apiRoot()}/academic/grading/preset/${key}`).then(r => r.data);
export const saveGradingSettings = (data: object) => client.put(`${apiRoot()}/academic/grading`, data).then(r => r.data);
/** Save a grading scale as a named preset (Super Admin). */
export const saveGradingPreset = (data: { name: string; description?: string; bands: object[]; classes: object[] }) =>
  client.post(`${apiRoot()}/academic/grading/presets`, data).then(r => r.data);
export const deleteGradingPreset = (id: number) =>
  client.delete(`${apiRoot()}/academic/grading/presets/${id}`).then(r => r.data);
export const recalculateGrades = () => client.post(`${apiRoot()}/academic/grading/recalculate`).then(r => r.data);

export const getMyTranscript = () => client.get(`${apiRoot()}/academic/me/transcript`).then(r => r.data);
export const getStudentTranscript = (id: number) => client.get(`${apiRoot()}/academic/students/${id}/transcript`).then(r => r.data);
export const getStudentEligibility = (id: number) => client.get(`${apiRoot()}/academic/students/${id}/eligibility`).then(r => r.data);
export const getPromotionPreview = (programId: number, level: number) =>
  client.get(`${apiRoot()}/academic/promotion-preview`, { params: { programId, level } }).then(r => r.data);

/** Downloads a transcript PDF (own when studentId is omitted). */
export const downloadTranscriptPdf = async (studentId?: number) => {
  const path = studentId ? `/academic/students/${studentId}/transcript/pdf` : '/academic/me/transcript/pdf';
  const res = await client.get(`${apiRoot()}${path}`, { responseType: 'blob' });
  const name = /filename="([^"]+)"/.exec(res.headers['content-disposition'] ?? '')?.[1] ?? 'transcript.pdf';
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
};

// ── Admin productivity (Phase 4) ──────────────────────────────────────────
export type ImportType = 'students' | 'lecturers' | 'courses';
export const importRows = (type: ImportType, rows: Record<string, string>[], commit: boolean) =>
  client.post(`${apiRoot()}/admin-tools/import/${type}`, { rows }, { params: { commit } }).then(r => r.data);
export const bulkEnroll = (data: { programId: number; level: number; semester?: number | null }, commit: boolean) =>
  client.post(`${apiRoot()}/admin-tools/bulk-enroll`, data, { params: { commit } }).then(r => r.data);
export const getResultsSummary = (programId: number, level?: number | '') =>
  client.get(`${apiRoot()}/admin-tools/results-summary`, { params: level ? { programId, level } : { programId } }).then(r => r.data);
export const deactivateAccount = (id: number, reason?: string) =>
  client.post(`${apiRoot()}/accounts/${id}/deactivate`, { reason }).then(r => r.data);
export const reactivateAccount = (id: number) =>
  client.post(`${apiRoot()}/accounts/${id}/reactivate`).then(r => r.data);
export const getMarksSheetData = (sheetId: number | string) =>
  client.get(`${apiRoot()}/marks/sheet/${sheetId}`).then(r => r.data);

// ── Security (Phase 0) ────────────────────────────────────────────────────
/** Checks a quiz access code on the server; lets the student start one new attempt. */
export const unlockQuiz = (quizId: number | string, password: string) =>
  client.post(`/quiz/${quizId}/unlock`, { password }).then(r => r.data);

// ── Feature controls ──────────────────────────────────────────────────────
export const getFeatures = () => client.get(`${apiRoot()}/features`).then(r => r.data);
export const setFeatureSystemWide = (key: FeatureKey, enabled: boolean) =>
  client.put(`${apiRoot()}/features/${key}`, { enabled }).then(r => r.data);
/** enabled = null → the department follows the system-wide switch again. */
export const setFeatureForDepartment = (key: FeatureKey, departmentId: number, enabled: boolean | null) =>
  client.put(`${apiRoot()}/features/${key}/departments/${departmentId}`, { enabled }).then(r => r.data);
/** Settings needed before sign-in (e.g. whether students may sign up). */
export const getPublicSettings = (): Promise<{ studentSelfSignup: boolean }> =>
  client.get('/public-settings').then(r => r.data);

// ── Institution profile, document verification, report-card remarks ──────
const superAdminRootUrl = () => client.defaults.baseURL!.replace('/auth', '/super-admin');

/** Public: name, type (UNIVERSITY / SCHOOL) and wording. */
export const getInstitution = () => client.get('/institution').then(r => r.data);
export const institutionLogoUrl = () => `${client.defaults.baseURL}/institution/logo`;
export const updateInstitution = (data: object) =>
  client.put(`${superAdminRootUrl()}/institution`, data).then(r => r.data);
export const uploadInstitutionLogo = (file: File) => {
  const fd = new FormData();
  fd.append('file', file);
  return client.post(`${superAdminRootUrl()}/institution/logo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
};
export const deleteInstitutionLogo = () => client.delete(`${superAdminRootUrl()}/institution/logo`).then(r => r.data);

/** Public: check a code printed on a transcript or report card. */
export const verifyDocument = (code: string) =>
  client.get(`/verify/${encodeURIComponent(code)}`).then(r => r.data);
export const getIssuedDocuments = (q?: string) =>
  client.get(`${superAdminRootUrl()}/documents`, { params: q ? { q } : {} }).then(r => r.data);
export const setDocumentRevoked = (id: number, revoked: boolean, reason?: string) =>
  client.post(`${superAdminRootUrl()}/documents/${id}/revoke`, { revoked, reason }).then(r => r.data);

export const getTermRemarks = (sheetId: number) =>
  client.get(`${apiRoot()}/marks/sheet/${sheetId}/term-remarks`).then(r => r.data);
export const saveTermRemarks = (sheetId: number, rows: object[]) =>
  client.put(`${apiRoot()}/marks/sheet/${sheetId}/term-remarks`, { rows }).then(r => r.data);
export const getAllMarkSheets = () => client.get(`${apiRoot()}/marks/sheet/all`).then(r => r.data);
export const getMyMarkSheets = () => client.get(`${apiRoot()}/marks/sheet/my-sheets`).then(r => r.data);

// ── Developer: sign-in by emailed code, system mode, health, errors ───────
const developerRootUrl = () => client.defaults.baseURL!.replace('/auth', '/developer');

export const requestDeveloperCode = (email: string) =>
  client.post('/developer/request-code', { email }).then(r => r.data);
export const verifyDeveloperCode = (email: string, code: string): Promise<{ token: string }> =>
  client.post('/developer/verify', { email, code }).then(r => r.data);
export const getSystemMode = () => client.get(`${developerRootUrl()}/mode`).then(r => r.data);
export const setSystemMode = (mode: string) => client.put(`${developerRootUrl()}/mode`, { mode }).then(r => r.data);
export const getSystemHealth = () => client.get(`${developerRootUrl()}/health`).then(r => r.data);
export const getErrorEvents = (filter: 'open' | 'resolved' | 'all') =>
  client.get(`${developerRootUrl()}/errors`, { params: { filter } }).then(r => r.data);
export const setErrorResolved = (id: number, resolved: boolean) =>
  client.post(`${developerRootUrl()}/errors/${id}/resolve`, { resolved }).then(r => r.data);
export const clearResolvedErrors = () => client.delete(`${developerRootUrl()}/errors/resolved`).then(r => r.data);
export const sendTestAlert = () => client.post(`${developerRootUrl()}/alerts/test`).then(r => r.data);
export const reportClientError = (data: { page: string; message: string; stack?: string }) =>
  client.post('/client-errors', data);

// Developers: read-only list (rows are added directly in the developer_email table)
export const getDevelopers = () => client.get(`${developerRootUrl()}/developers`).then(r => r.data);
