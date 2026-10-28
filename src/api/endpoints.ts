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
  client.put(`/update-compulsory/${quizId}/${encodeURIComponent(prefix)}?isCompulsory=${isCompulsory}`, null, { responseType: 'text' }).then(r => r.data);

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
/** Ids of quizzes at least one student has taken (submitted). */
export const getTakenQuizIds = (): Promise<number[]> =>
  client.get('/getReports/taken-quiz-ids').then(r => r.data);
export const getReportsByMyQuiz = (qid: number | string) =>
  client.get(`/quiz-results/my-quiz/${qid}`).then(r => r.data);
export const getTheoryReport = (qid: number | string) =>
  client.get(`/answers/quiz/${qid}`).then(r => r.data);
export const getTheoryDetails = (qid: number | string) =>
  client.get(`/quiz/${qid}`).then(r => r.data);
export const getResultsDetails = (qid: number | string) =>
  client.get(`/quiz/result/${qid}`).then(r => r.data);
/** Staff: one student's objective answers, question by question. */
export const getStudentResultsDetails = (qid: number | string, userId: number | string) =>
  client.get(`/quiz/result/${qid}/student/${userId}`).then(r => r.data);
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
/** Global courses the Super Admin opened to everyone: any student can take their quizzes without registering. */
export const getOpenToEveryoneCourses = () => client.get('/categories/open-to-everyone').then(r => r.data);

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
/** Saves the order of the departments (school sections); returns them all in order. */
export const saReorderDepartments = (ids: number[]) => saClient.put('/departments/order', { ids }).then(r => r.data);

// ── Super Admin — Programs ─────────────────────────────────────────────────
export const saGetPrograms       = () => saClient.get('/programs').then(r => r.data);
export const saGetProgramsByDept = (deptId: number) => saClient.get(`/programs/department/${deptId}`).then(r => r.data);
export const saCreateProgram     = (data: object) => saClient.post('/programs', data).then(r => r.data);
export const saUpdateProgram     = (id: number, data: object) => saClient.put(`/programs/${id}`, data).then(r => r.data);
export const saDeleteProgram     = (id: number) => saClient.delete(`/programs/${id}`).then(r => r.data);
/** Toggle a program's enabled/disabled state. Returns the updated ProgramDTO. */
export const saToggleProgram     = (id: number) => saClient.patch(`/programs/${id}/toggle`).then(r => r.data);
/** Saves the order of one section's classes (schools); returns every programme. */
export const saReorderPrograms   = (ids: number[]) => saClient.put('/programs/order', { ids }).then(r => r.data);

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
/** Staff: theory submissions still being marked by AI, and those whose marking failed. */
export interface FailedMarking { jobId: number; studentId: number; studentName: string; username?: string; tries: number; error?: string; failedAt?: string; }
export const getMarkingStatus = (qid: number | string) =>
  client.get<{ marking: number; retrying: number; failed: FailedMarking[] }>(`/quiz-attempts/quiz/${qid}/marking`).then(r => r.data);
/** Staff: put one failed theory submission back in the marking queue. */
export const retryMarking = (qid: number | string, jobId: number) =>
  client.post(`/quiz-attempts/quiz/${qid}/marking/${jobId}/retry`).then(r => r.data);

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
  | 'STUDENT_COURSE_REGISTRATION' | 'REMARK_REQUESTS' | 'STUDENT_TIMETABLE' | 'STUDENT_TRANSCRIPT' | 'STUDENT_REPORT_CARD' | 'QUESTION_BANK'
  | 'FORCE_PASSWORD_CHANGE' | 'DOCUMENT_VERIFICATION' | 'HOD_REPORTS' | 'LECTURER_REPORTS' | 'EXAM_SOUNDS' | 'ATTENDANCE';

export interface FeatureFlags {
  marksSheetAdmin: boolean; marksSheetLecturer: boolean; marksSheetStudent: boolean;
  /** Super Admin switch: students see School Fees (nav entry, dashboard card, page). */
  feesStudent?: boolean;
  /** Developer switch: the Super Admin sees the Audit Log (nav entry and page). */
  auditLogSuperAdmin?: boolean;
  /** Developer switch: the whole Assessments (quiz) module; false hides it from every user. */
  assessments?: boolean;
  /** Each feature's state for the signed-in user (system switch + their department's choice). */
  features?: Partial<Record<FeatureKey, boolean>>;
  /**
   * Developer setting: how students are housed (DAY = no boarding at all), the word for a hostel
   * ("House", "Hall" …), and whether the signed-in user has boarding duties (staff) or runs it all (head).
   */
  boarding?: { mode: 'DAY' | 'BOARDING' | 'BOTH'; word: string; plural: string; staff: boolean; head: boolean };
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
  /** Students: BOARDERS or DAY; one house (its boarders, and its staff for staff audiences). */
  residency?: 'BOARDERS' | 'DAY' | null; hostelId?: number | null; hostelName?: string | null;
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
  residency?: 'BOARDERS' | 'DAY' | null; hostelId?: number | null;
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
export interface AuditQuery {
  actor?: string; action?: string; role?: string; from?: string; to?: string; page?: number; size?: number;
}
export interface AuditPage { items: AuditEntry[]; page: number; size: number; totalItems: number; totalPages: number }
export const saGetAuditLogs = (params: AuditQuery): Promise<AuditPage> =>
  saClient.get('/audit-logs', { params }).then(r => r.data);
export const saGetAuditActions = (): Promise<string[]> => saClient.get('/audit-logs/actions').then(r => r.data);

// ── Reports (Super Admin: whole institution; HOD: own department) ─────────
export type ReportFilterKey = 'session' | 'department' | 'program' | 'level' | 'semester' | 'from' | 'to' | 'course' | 'quiz' | 'status' | 'hostel';
export interface ReportFilterDef {
  key: ReportFilterKey; label: string; options: { value: string; label: string }[] | null;
  /** The report shows nothing until this is chosen (e.g. the broadsheet's programme, level and semester). */
  required: boolean;
}
export interface ReportDefinition {
  key: string; title: string; group: string; description: string; icon: string; filters: ReportFilterDef[];
}
export type ReportColumnType = 'text' | 'int' | 'number' | 'decimal' | 'percent' | 'money' | 'date' | 'datetime';
export interface ReportColumn { key: string; label: string; type: ReportColumnType }
export interface ReportTable {
  id: string; title: string; subtitle: string | null; columns: ReportColumn[]; rows: Record<string, unknown>[];
  drill: { param: string; key: string; hint: string } | null;
  chart: { label: string; value: string } | null;
  emptyText: string;
}
export interface ReportResult {
  key: string; title: string; description: string; scope: string[];
  summary: { label: string; value: unknown; hint: string | null; tone: 'good' | 'warn' | 'bad' | null }[];
  tables: ReportTable[]; notes: string[]; generatedAt: string; generatedBy: string | null;
  /** A document meant for printing (a question paper): the page offers its PDF first. */
  printable?: boolean;
}
/** Query parameters a report accepts; unset ones are left out. courseId / quizId are drill-downs. */
export interface ReportParams {
  sessionId?: number; departmentId?: number; programId?: number; level?: number; semester?: number;
  from?: string; to?: string; courseId?: number; quizId?: number; status?: string;
  /** Boarding reports: one house / hall. */
  hostelId?: number;
}
/** List, run and print reports; the Super Admin and HODs each have their own (same shape). */
export interface ReportsApi {
  catalog: () => Promise<ReportDefinition[]>;
  run: (key: string, params: ReportParams) => Promise<ReportResult>;
  pdf: (key: string, params: ReportParams, fileName: string) => Promise<void>;
}
const cleanParams = (p: ReportParams) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== '' && v != null));

const saveBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = fileName; a.click();
  URL.revokeObjectURL(url);
};

const reportsApi = (get: (path: string, config?: object) => Promise<any>): ReportsApi => ({
  catalog: () => get('').then(r => r.data),
  run: (key, params) => get(`/${key}`, { params: cleanParams(params) }).then(r => r.data),
  pdf: async (key, params, fileName) => {
    const res = await get(`/${key}/pdf`, { params: cleanParams(params), responseType: 'blob' });
    saveBlob(res.data, fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
  },
});

export const saReportsApi = reportsApi((path, config) => saClient.get(`/reports${path}`, config));
/** Always the HOD's own department (the server locks it). */
export const hodReportsApi = reportsApi((path, config) => client.get(`${apiRoot()}/hod/reports${path}`, config));
/** Always the lecturer's own courses and quizzes (the server locks it). */
export const lecturerReportsApi = reportsApi((path, config) => client.get(`${apiRoot()}/lecturer/reports${path}`, config));
/** Boarding staff's boarding reports (locked to the houses they look after). */
export const boardingReportsApi = reportsApi((path, config) => client.get(`${apiRoot()}/boarding/reports${path}`, config));

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
/** Bulk upload a JSON file's questions (quiz template format) into a course's bank. All or nothing; `types` limits it to those question types. */
export const uploadBankQuestions = (courseId: number, data: { topic?: string; difficulty?: string; questions: unknown[]; types?: string[] }) =>
  client.post<{ added: number; skipped: number; ignored: number }>(`${apiRoot()}/question-bank/upload/course/${courseId}`, data).then(r => r.data);
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

// ── Schools: promotion moves students to their next class ──
export interface ClassPromotion {
  classId: number; className: string; targetId: number | null; targetName: string | null; leaves: boolean;
  students: { studentId: number; name: string; username: string; term: number; eligible: boolean; reasons: string[] }[];
  eligible: number; canOverride: boolean;
}
export const getClassPromotion = (programId: number): Promise<ClassPromotion> =>
  client.get(`${apiRoot()}/academic/classes/${programId}/promotion`).then(r => r.data);
/** Everyone (or the students listed) to the class's next class, or out of the school after a final class. */
export const promoteClass = (programId: number, data: { studentIds?: number[]; override?: boolean } = {}) =>
  client.post(`${apiRoot()}/academic/classes/${programId}/promote`, data).then(r => r.data);
/** One student: to their next class, or (Super Admin) to the class given. */
export const moveStudentClass = (id: number, data: { programId?: number | null; override?: boolean } = {}) =>
  client.post(`${apiRoot()}/academic/students/${id}/move`, data).then(r => r.data);

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
export const importRows = (type: ImportType, rows: Record<string, string>[], commit: boolean, notify = true) =>
  client.post(`${apiRoot()}/admin-tools/import/${type}`, { rows }, { params: { commit, notify } }).then(r => r.data);
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
export const getPublicSettings = (): Promise<{ studentSelfSignup: boolean; showVerifyLink: boolean }> =>
  client.get('/public-settings').then(r => r.data);

// ── Institution profile, document verification, report-card remarks ──────
const superAdminRootUrl = () => client.defaults.baseURL!.replace('/auth', '/super-admin');

/** Public: name, type (UNIVERSITY / SCHOOL) and wording. */
export const getInstitution = () => client.get('/institution').then(r => r.data);
/** Pass the institution's logoVersion so a newly uploaded logo isn't hidden behind the browser's cached copy. */
export const institutionLogoUrl = (version?: number) =>
  `${client.defaults.baseURL}/institution/logo${version ? `?v=${version}` : ''}`;
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
/** Days present / opened per student from class attendance in the sheet's term (not saved until the page saves). */
export const getTermAttendance = (sheetId: number): Promise<{ rows: { studentId: number; daysPresent: number; daysOpen: number }[]; classDays: number; meetings: number }> =>
  client.get(`${apiRoot()}/marks/sheet/${sheetId}/term-remarks/attendance`).then(r => r.data);
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

// Setup tools: colour theme, maintenance mode, setup checklist, settings backup
export const getThemeSettings = () => client.get(`${developerRootUrl()}/theme`).then(r => r.data);
export const saveThemeSettings = (theme: { brand: string; sidebar: string; accent: string | null; preset?: string | null }) =>
  client.put(`${developerRootUrl()}/theme`, theme).then(r => r.data);
export const resetThemeSettings = () => client.delete(`${developerRootUrl()}/theme`).then(r => r.data);
export interface MaintenanceState { enabled: boolean; message: string; until: string | null; allowAdmins: boolean; since: string | null }
export const getMaintenance = (): Promise<MaintenanceState> => client.get(`${developerRootUrl()}/maintenance`).then(r => r.data);
export const saveMaintenance = (data: Partial<MaintenanceState>): Promise<MaintenanceState> =>
  client.put(`${developerRootUrl()}/maintenance`, data).then(r => r.data);
export const getSetupChecklist = () => client.get(`${developerRootUrl()}/setup`).then(r => r.data);
export const sendSetupTestEmail = (to: string) => client.post(`${developerRootUrl()}/setup/test-email`, { to }).then(r => r.data);
export const createSuperAdminAccount = (data: Record<string, string>) =>
  client.post(`${developerRootUrl()}/setup/super-admin`, data).then(r => r.data);
export const exportSystemConfig = (logo: boolean) =>
  client.get(`${developerRootUrl()}/config/export`, { params: { logo } }).then(r => r.data);
export const previewSystemConfig = (file: object) => client.post(`${developerRootUrl()}/config/preview`, file).then(r => r.data);
export const importSystemConfig = (file: object) => client.post(`${developerRootUrl()}/config/import`, file).then(r => r.data);

// Developers: read-only list (rows are added directly in the developer_email table)
export const getDevelopers = () => client.get(`${developerRootUrl()}/developers`).then(r => r.data);

// Audit log: the developer always sees it and decides whether the Super Admin does
export const devGetAuditLogs = (params: AuditQuery): Promise<AuditPage> =>
  client.get(`${developerRootUrl()}/audit-logs`, { params }).then(r => r.data);
export const devGetAuditActions = (): Promise<string[]> => client.get(`${developerRootUrl()}/audit-logs/actions`).then(r => r.data);
export const getAuditLogAccess = (): Promise<{ superAdminVisible: boolean }> =>
  client.get(`${developerRootUrl()}/audit-log/access`).then(r => r.data);
export const setAuditLogAccess = (superAdminVisible: boolean): Promise<{ superAdminVisible: boolean }> =>
  client.put(`${developerRootUrl()}/audit-log/access`, { superAdminVisible }).then(r => r.data);
/** Developer: which modules this institution uses (Assessments = the whole quiz module). */
/** residency: DAY (day students only), BOARDING (boarding only) or BOTH. */
export interface DeveloperModules { assessments: boolean; residency: 'DAY' | 'BOARDING' | 'BOTH' }
export const getModules = (): Promise<DeveloperModules> =>
  client.get(`${developerRootUrl()}/modules`).then(r => r.data);
/** Send only what changes. */
export const setModules = (data: Partial<DeveloperModules>): Promise<DeveloperModules> =>
  client.put(`${developerRootUrl()}/modules`, data).then(r => r.data);

// ── Subscription ─────────────────────────────────────────────────────────
export type SubscriptionStateName = 'ACTIVE' | 'GRACE' | 'RESTRICTED' | 'SUSPENDED';
export type SubscriptionAccess = 'FULL' | 'READ_ONLY' | 'BLOCKED';
/** What the signed-in person sees; details only when the developer included their role in the audience. */
/** An invoice from the vendor portal, payable online through its pay link. */
export interface SubscriptionInvoice { number: string; amount: string; currency: string; dueDate: string; coversUntil: string; payUrl: string }
export interface SubscriptionNotice {
  access: SubscriptionAccess; show: boolean;
  state?: SubscriptionStateName; unlicensed?: boolean; manual?: boolean; paidUntil?: string;
  nextChange?: string | null; nextState?: SubscriptionStateName | null; daysLeft?: number | null; contact?: string | null;
  invoice?: SubscriptionInvoice | null; canCheckPayment?: boolean; checked?: boolean;
  /** Set when "check now" couldn't reach the vendor portal (why). */
  checkProblem?: string;
}
export const getSubscriptionNotice = (): Promise<SubscriptionNotice> => client.get('/subscription/notice').then(r => r.data);
/** "I've paid, check now": checks in with the vendor portal at once and returns the updated notice. */
export const checkSubscriptionPayment = (): Promise<SubscriptionNotice> => client.post('/subscription/check-payment').then(r => r.data);

export interface SubscriptionKeyInfo {
  id: string; institutionId: string; institutionName: string; plan: string; issued: string; paidUntil: string;
  graceDays: number; restrictedDays: number; seq?: number; suspended?: boolean; note?: string | null; warnings?: string[];
}
export interface SubscriptionEventRow {
  id: number; at: string; type: string; fromState: string | null; toState: string | null; details: string | null; actor: string | null;
}
export interface SubscriptionDetails {
  state: SubscriptionStateName; source: 'KEY' | 'NO_KEY' | 'INVALID_KEY' | 'WRONG_INSTITUTION'; keyProblem: string | null;
  key: SubscriptionKeyInfo | null; today: string; paidUntil: string; graceEnd: string; restrictedEnd: string;
  extendedUntil: string | null; extensionReason: string | null; suspendedReason: string | null; suspendedAt: string | null;
  nextChange: string | null; nextState: SubscriptionStateName | null; daysLeft: number | null;
  audience: 'SUPER_ADMIN' | 'ADMINS'; contact: string; billingEmails: string; firstSeen: string | null;
  boundInstitution: string | null; maxExtensionUntil: string; events: SubscriptionEventRow[];
  providerSuspended: boolean; vendor: VendorLink; syncResult?: string; invoice: SubscriptionInvoice | null;
}
/** The link to the vendor portal, which renews keys automatically. */
export interface VendorLink {
  url: string | null; tokenSet: boolean; tokenHint: string | null; fromEnvironment: boolean;
  lastAttempt: string | null; lastSuccess: string | null; lastResult: string | null; lastOk: boolean | null;
}
const subUrl = () => `${developerRootUrl()}/subscription`;
export const getSubscription = (): Promise<SubscriptionDetails> => client.get(subUrl()).then(r => r.data);
export const checkSubscriptionKey = (key: string): Promise<SubscriptionKeyInfo> => client.post(`${subUrl()}/key/check`, { key }).then(r => r.data);
export const installSubscriptionKey = (key: string): Promise<SubscriptionDetails> => client.post(`${subUrl()}/key`, { key }).then(r => r.data);
export const suspendPortal = (reason: string): Promise<SubscriptionDetails> => client.post(`${subUrl()}/suspend`, { reason }).then(r => r.data);
export const resumePortal = (): Promise<SubscriptionDetails> => client.post(`${subUrl()}/resume`).then(r => r.data);
export const extendSubscription = (until: string, reason: string): Promise<SubscriptionDetails> =>
  client.put(`${subUrl()}/extension`, { until, reason }).then(r => r.data);
export const clearSubscriptionExtension = (): Promise<SubscriptionDetails> => client.delete(`${subUrl()}/extension`).then(r => r.data);
export const linkVendorPortal = (url: string, token: string): Promise<SubscriptionDetails> =>
  client.put(`${subUrl()}/vendor`, { url, token }).then(r => r.data);
export const unlinkVendorPortal = (): Promise<SubscriptionDetails> => client.delete(`${subUrl()}/vendor`).then(r => r.data);
export const syncSubscriptionNow = (): Promise<SubscriptionDetails> => client.post(`${subUrl()}/sync`).then(r => r.data);
export const saveSubscriptionSettings = (data: { audience?: string; contact?: string; billingEmails?: string }): Promise<SubscriptionDetails> =>
  client.put(`${subUrl()}/settings`, data).then(r => r.data);

// ── Fees & payments ───────────────────────────────────────────────────────
export type FeeStatus = 'PAID' | 'PART_PAID' | 'UNPAID' | 'NO_FEE' | 'NO_CLASS';
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'ABANDONED' | 'VOIDED';
export type PaymentMethod = 'PAYSTACK' | 'CASH' | 'BANK_TRANSFER' | 'OTHER';

/** EVERYONE (default), BOARDERS or DAY: who an item of an itemised fee is charged to. */
export type FeeAppliesTo = 'EVERYONE' | 'BOARDERS' | 'DAY';
export interface FeeComponentItem { name: string; amount: number; appliesTo?: FeeAppliesTo }
/** One item of a student's itemised fee: what it costs, what's been paid towards it and what's left. */
export interface FeeItemStatus { name: string; amount: number; paid: number; balance: number }
export interface FeeScheduleInfo {
  id: number; programId: number; level: number; sessionId: number; amount: number; itemised: boolean;
  /** Term / semester 1, 2 … or null for a whole-year fee; periodName: "Term 2" / "Whole year". */
  term?: number | null; periodName?: string;
  components: FeeComponentItem[]; dueDate: string | null; note: string | null; updatedAt: string; updatedBy: string | null;
  /** When some items are for boarders or day students only: each one's total. */
  boarderAmount?: number; dayAmount?: number;
  /** A student's statement: the whole fee before other residencies' items were left out. */
  fullAmount?: number;
}
export interface SessionRef { id: number; name: string; current: boolean }
export interface FeePaymentInfo {
  id: number; reference: string; amount: number; currency: string; status: PaymentStatus; method: PaymentMethod;
  channel: string | null; message: string | null; createdAt: string; paidAt: string | null; sessionName: string;
  programName: string | null; level: number | null; studentName: string; studentId: string;
  /** The breakdown items this payment was for; empty when it was for the fee as a whole. */
  items: FeeComponentItem[];
  /** RC-2026-000123 once the money is received; the code checks it on the verification page. */
  receiptNo?: string | null; verificationCode?: string | null; periodName?: string | null;
  studentEmail?: string; recordedBy?: string | null; note?: string | null; gatewayTransactionId?: number | null;
  /** Where the money went: fee terms, bills, credit. billTitle: the bill the payer chose, if any. */
  allocations?: FeeAllocationLine[]; billTitle?: string | null;
  /** Staff only: who recorded it, whether it is handed in (cash-up), when it was cancelled. */
  recordedById?: number | null; cashedUp?: boolean; voidedAt?: string | null;
}
export interface FeeAllocationLine { kind: 'FEE' | 'BILL' | 'ARREARS' | 'REFUND' | 'CREDIT'; label: string; amount: number; scheduleId?: number; billId?: number; arrearsId?: number }
export type BillStatus = 'PAID' | 'PART_PAID' | 'UNPAID' | 'CANCELLED' | 'DECLINED';
export interface BillLineInfo { name: string; quantity: number; unitPrice: number; amount: number; lineId?: number; stocked?: boolean; issued?: number }
/** A student's bill (uniform, books, an excursion …). */
export interface StudentBillInfo {
  id: number; batchId: number; title: string; amount: number; paid: number; balance: number; status: BillStatus;
  optional: boolean; dueDate: string | null; createdAt: string; sessionName: string | null; note: string | null;
  statusNote: string | null; lines: BillLineInfo[];
}
export interface MyFees {
  currency: string; session: SessionRef; onlinePayment: boolean; partPayment: boolean; itemPayment: boolean; minimumPayment: number;
  student: { name: string; studentId: string; email: string; programName: string | null; level: number | null };
  fee: FeeScheduleInfo | null; paid: number; balance: number; credit: number; status: FeeStatus;
  /** Per-item paid and balance when the fee is itemised (empty otherwise). */
  items: FeeItemStatus[];
  payments: FeePaymentInfo[];
  /** What the student's unpaid fees are holding back (null when nothing is held). */
  resultsHold: ResultsHold | null;
  /** Every fee owed so far this session (whole year, or each term up to now), oldest first; later terms coming up. */
  dues?: FeeDue[]; upcoming?: FeeScheduleInfo[];
  totalFees?: number; totalPaid?: number; totalBalance?: number;
  residency?: 'DAY' | 'BOARDING' | null;
  /** Bills (open, paid, declined; the office also sees cancelled), what they still owe, unused credit, and everything to pay. */
  bills?: StudentBillInfo[]; billsBalance?: number; accountCredit?: number; toPay?: number;
  /** Fees still owed from earlier sessions / opening balance (paid first), and this session's concessions in all. */
  arrears?: ArrearsInfo[]; arrearsBalance?: number; totalDiscount?: number;
  /** Staff statement only. */
  concessions?: ConcessionInfo[]; refunds?: RefundInfo[];
}
export type ArrearsStatus = 'PAID' | 'PART_PAID' | 'UNPAID' | 'WRITTEN_OFF';
export interface ArrearsInfo {
  id: number; label: string; kind: 'CARRIED' | 'OPENING'; sessionName: string | null; programName: string | null; level: number | null;
  amount: number; paid: number; balance: number; status: ArrearsStatus; writtenOff: number | null; note: string | null;
  statusNote: string | null; statusBy: string | null; statusAt: string | null; createdAt: string;
  studentId?: number; studentName?: string; username?: string; enabled?: boolean;
}
export type ConcessionKind = 'SCHOLARSHIP' | 'BURSARY' | 'SIBLING' | 'STAFF_CHILD' | 'WAIVER' | 'OTHER';
export interface ConcessionInfo {
  id: number; kind: ConcessionKind; kindLabel: string; title: string; mode: 'PERCENT' | 'AMOUNT'; value: number; items: string[];
  term: number | null; termName: string | null; note: string | null; active: boolean; sessionName: string;
  createdBy: string | null; createdAt: string; revokedBy: string | null; revokedAt: string | null; revokeReason: string | null;
  studentId?: number; studentName?: string; username?: string; programName?: string | null; level?: number | null; studentSaves?: number | null;
}
export interface RefundInfo {
  id: number; number: string; amount: number; currency: string; method: PaymentMethod; methodName: string; paidTo: string | null;
  reason: string; status: 'DONE' | 'VOIDED'; paidAt: string; paidBy: string | null; voidedAt: string | null; voidedBy: string | null;
  voidReason: string | null; cashedUp: boolean; studentId?: number; studentName?: string; username?: string; voidedToday?: boolean;
}
export interface FeeDue {
  fee: FeeScheduleInfo; paid: number; balance: number; credit: number; status: FeeStatus; items: FeeItemStatus[];
  /** Before concessions, what they take off, and their titles. */
  gross?: number; discount?: number; concessions?: string[];
}
/**
 * Returned (as a 403 body) instead of report cards / the transcript while a student's fees fall short
 * of their programme's rule, and in MyFees.resultsHold.
 */
export interface ResultsHold {
  code: 'FEES_HOLD'; message: string; documents: ('REPORT_CARDS' | 'TRANSCRIPT')[]; mode: ResultsHoldMode;
  currency: string; sessionName: string; fee: number; paid: number; balance: number; amountToRelease: number;
  unpaidItems: FeeItemStatus[]; feesPage: boolean;
}
/** The hold in an API error, if that is why the request was refused. */
export const resultsHoldOf = (err: any): ResultsHold | null => {
  const d = err?.response?.data;
  return d && d.code === 'FEES_HOLD' ? d as ResultsHold : null;
};
export type ResultsHoldMode = 'FULL' | 'PERCENT' | 'ITEMS';
export interface ResultsHoldRule {
  mode: ResultsHoldMode; minPercent: number | null; requiredItems: string[]; reportCards: boolean; transcript: boolean;
  updatedAt: string; updatedBy: string | null;
}
export interface ResultsHoldProgram {
  id: number; name: string; code: string; departmentName: string | null; enabled: boolean;
  /** Levels of this programme with a fee set in the current session. */
  levelsWithFee: number;
  /** Item names used in this programme's current-session fee breakdowns. */
  items: string[];
  rule: ResultsHoldRule | null;
}
export interface ResultsHoldOverview { enabled: boolean; feesVisibleToStudents: boolean; session: SessionRef; programs: ResultsHoldProgram[] }
export interface ResultsHoldInput {
  programId: number; mode: ResultsHoldMode; minPercent?: number | null; requiredItems?: string[];
  reportCards: boolean; transcript: boolean; alsoApplyToPrograms?: number[];
}
export interface FeeLevelRow {
  level: number; students: number | null; schedule: FeeScheduleInfo | null; collected: number;
  billed?: number; outstanding?: number;
  /** Terms a year for this class; how its fees are set this session (YEAR / TERM / null) and which terms have one. */
  periods?: number; setAs?: 'YEAR' | 'TERM' | null; termsSet?: number[];
}
export interface FeeProgramRow { id: number; name: string; code: string; departmentName: string | null; enabled: boolean; levels: FeeLevelRow[] }
export interface FeeOverview {
  session: SessionRef; sessions: SessionRef[]; currency: string;
  paystack: { configured: boolean; mode: 'live' | 'test' | null };
  settings: { visibleToStudents: boolean; onlinePayment: boolean; partPayment: boolean; itemPayment: boolean; resultsHold: boolean };
  totals: { billed: number | null; collected: number; outstanding: number | null; students: number | null; levelsSet: number; levelsTotal: number; residencyUnknown?: number };
  programs: FeeProgramRow[];
  /** The period shown (null = whole year), the choices, and where the page opens. */
  term?: number | null; periods?: { value: number; label: string }[]; defaultTerm?: number;
  residencyMode?: 'DAY' | 'BOARDING' | 'BOTH';
}
export interface FeeScheduleInput {
  programId: number; level: number; sessionId: number; itemised: boolean; amount?: number;
  components?: FeeComponentItem[]; dueDate?: string | null; note?: string | null; alsoApplyToLevels?: number[];
  /** 1, 2 … for a term's fee; null / 0 for the whole year. */
  term?: number | null;
}
export interface FeeStudentMatch {
  id: number; name: string; studentId: string; email: string; programName: string | null; level: number | null;
  fee: number | null; balance: number | null; items: FeeItemStatus[];
  dues?: FeeDue[]; residency?: 'DAY' | 'BOARDING' | null;
  /** Open bills with a balance, and unused credit (balance is everything owed less credit). */
  bills?: StudentBillInfo[]; credit?: number;
}
export interface PaymentPage { content: FeePaymentInfo[]; total: number; page: number; size: number }

/** Student: own fee, balance and history (403 while the Super Admin keeps fees hidden). */
export const getMyFees = (): Promise<MyFees> => client.get(`${apiRoot()}/fees/me`).then(r => r.data);
/**
 * Student: starts a Paystack checkout; send the browser to authorizationUrl.
 * Nothing = the full balance; amount = a part payment; items = those items of the breakdown.
 */
export const startFeePayment = (pay: { amount?: number; items?: string[]; scheduleId?: number; billId?: number } = {}): Promise<{ reference: string; authorizationUrl: string }> =>
  client.post(`${apiRoot()}/fees/pay`, pay).then(r => r.data);
/** Student: back from Paystack — confirm the payment and get its final state. */
export const confirmFeePayment = (reference: string): Promise<FeePaymentInfo> =>
  client.post(`${apiRoot()}/fees/payments/${encodeURIComponent(reference)}/confirm`).then(r => r.data);
/** Student: turn down an optional bill nothing has been paid on. */
export const declineBill = (id: number): Promise<StudentBillInfo> => client.post(`${apiRoot()}/fees/bills/${id}/decline`).then(r => r.data);

/** The fee screens are shared: the Super Admin's under /super-admin, the accounts office's under /api/finance. */
const isAccountant = () => { try { return JSON.parse(localStorage.getItem('user') || 'null')?.role === 'ACCOUNTANT'; } catch { return false; } };
const feesAdminUrl = () => (isAccountant() ? `${apiRoot()}/finance/fees` : `${superAdminRootUrl()}/fees`);
export const getFeeOverview = (sessionId?: number, term?: number | null): Promise<FeeOverview> =>
  client.get(`${feesAdminUrl()}/overview`, { params: { ...(sessionId ? { sessionId } : {}), ...(term ? { term } : {}) } }).then(r => r.data);
export const saveFeeSchedule = (data: FeeScheduleInput): Promise<FeeScheduleInfo[]> =>
  client.put(`${feesAdminUrl()}/schedules`, data).then(r => r.data);
export const deleteFeeSchedule = (id: number) => client.delete(`${feesAdminUrl()}/schedules/${id}`).then(r => r.data);
export const copyFeeSchedules = (fromSessionId: number, toSessionId: number, overwrite: boolean): Promise<{ copied: number; skipped: number }> =>
  client.post(`${feesAdminUrl()}/schedules/copy`, { fromSessionId, toSessionId, overwrite }).then(r => r.data);
export const getFeePayments = (params: { sessionId?: number; status?: string; programId?: number; level?: number; q?: string; page?: number; size?: number }): Promise<PaymentPage> =>
  client.get(`${feesAdminUrl()}/payments`, { params }).then(r => r.data);
export const searchFeeStudents = (q: string): Promise<FeeStudentMatch[]> =>
  client.get(`${feesAdminUrl()}/students`, { params: { q } }).then(r => r.data);
/** amount is ignored when items are given. No scheduleId / billId = everything owed, oldest first; any excess is kept as credit. */
export const recordFeePayment = (data: { studentId: number; amount?: number; method: PaymentMethod; paidOn?: string; note?: string; items?: string[]; scheduleId?: number; billId?: number }): Promise<FeePaymentInfo> =>
  client.post(`${feesAdminUrl()}/payments/manual`, data).then(r => r.data);
export const voidFeePayment = (id: number, reason: string): Promise<FeePaymentInfo> =>
  client.post(`${feesAdminUrl()}/payments/${id}/void`, { reason }).then(r => r.data);
export const recheckFeePayment = (id: number): Promise<FeePaymentInfo> =>
  client.post(`${feesAdminUrl()}/payments/${id}/recheck`).then(r => r.data);
/** Super Admin: which programmes hold report cards / transcripts until fees are paid. */
export const getResultsHolds = (): Promise<ResultsHoldOverview> =>
  client.get(`${feesAdminUrl()}/results-holds`).then(r => r.data);
export const saveResultsHold = (data: ResultsHoldInput) => client.put(`${feesAdminUrl()}/results-holds`, data).then(r => r.data);
export const removeResultsHold = (programId: number) => client.delete(`${feesAdminUrl()}/results-holds/${programId}`).then(r => r.data);

// ── Accounts office ───────────────────────────────────────────────────────
export interface FeeSettings { visibleToStudents: boolean; onlinePayment: boolean; partPayment: boolean; itemPayment: boolean; resultsHold: boolean; stockIssueUnpaid?: boolean }
export const getFeeSettings = (): Promise<{ settings: FeeSettings; paystack: { configured: boolean; mode: 'live' | 'test' | null } }> =>
  client.get(`${feesAdminUrl()}/settings`).then(r => r.data);
export const saveFeeSettings = (data: Partial<FeeSettings>): Promise<{ settings: FeeSettings; paystack: { configured: boolean; mode: 'live' | 'test' | null } }> =>
  client.put(`${feesAdminUrl()}/settings`, data).then(r => r.data);
export interface FinanceDashboard {
  currency: string; me: { name: string; duty: 'BURSAR' | 'CASHIER' | 'SUPER_ADMIN'; bursar: boolean };
  today: { total: number; count: number; mine: number }; week: { total: number }; month: { total: number };
  todayByMethod: { label: string; amount: number }[]; todayByCashier: { label: string; amount: number }[];
  session: { name: string; owed: number; outstanding: number; paid: number; students: number; debtors: number; residencyUnknown: number;
    discounts?: number; arrears?: number; withArrears?: number; credit?: number; closed?: boolean };
  /** What the signed-in person has to hand in (cash-up). */
  handIn?: CashUpMine;
  recent: { id: number; receiptNo: string | null; reference: string; studentName: string; studentId: string; amount: number; method: PaymentMethod; paidAt: string; recordedBy: string | null }[];
  settings: FeeSettings; paystack: { configured: boolean; mode: 'live' | 'test' | null };
}
export const getFinanceDashboard = (): Promise<FinanceDashboard> => client.get(`${feesAdminUrl()}/dashboard`).then(r => r.data);

// ── Bills and price list ──────────────────────────────────────────────────
export type PriceCategory = 'UNIFORM' | 'BOOKS' | 'LEVY' | 'EXAM' | 'TRIP' | 'FEEDING' | 'FINE' | 'OTHER';
export interface PriceItem { id: number; name: string; category: PriceCategory; price: number; description: string | null; active: boolean; stocked?: boolean; onHand?: number | null; updatedBy: string | null; updatedAt: string | null }
export type BillTarget = 'STUDENT' | 'CLASS' | 'HOSTEL' | 'BOARDERS' | 'DAY' | 'EVERYONE';
export interface BillLineInput { itemId?: number; name?: string; quantity: number; unitPrice?: number }
export interface BillInput {
  title?: string; target: BillTarget; programId?: number; level?: number; hostelId?: number; studentIds?: number[];
  lines: BillLineInput[]; optional?: boolean; dueDate?: string | null; note?: string | null; skipDuplicates?: boolean;
}
export interface BillPreview {
  title: string; audience: string; students: number; amountEach: number; total: number; skipped: number; residencyUnknown: number;
  optional: boolean; dueDate: string | null; currency: string; lines: BillLineInfo[]; sample?: string[]; batchId?: number;
}
export interface BillBatchInfo {
  id: number; title: string; audience: string; amountEach: number; students: number; open: number; cancelled: number; declined: number;
  billed: number; paid: number; outstanding: number; optional: boolean; dueDate: string | null; note: string | null;
  sessionName: string | null; issuedBy: string | null; issuedAt: string; cancelledAt: string | null; cancelledBy: string | null;
}
export interface BillBatchDetail extends BillBatchInfo {
  currency: string; lines: BillLineInfo[];
  roster: { billId: number; studentId: number; name: string; username: string; programName: string | null; level: number | null; paid: number; balance: number; status: BillStatus; statusNote: string | null }[];
}
export interface PriceList {
  currency: string; categories: PriceCategory[]; items: PriceItem[];
  residencyMode: 'DAY' | 'BOARDING' | 'BOTH'; houseWord: string; hostels: { id: number; name: string }[]; classes: { id: number; name: string; levels: { level: number; students: number }[] }[];
}
export const getPriceList = (): Promise<PriceList> => client.get(`${feesAdminUrl()}/price-items`).then(r => r.data);
export const savePriceItem = (id: number | null, data: { name: string; category: PriceCategory; price: number; description?: string | null }): Promise<PriceItem> =>
  (id ? client.put(`${feesAdminUrl()}/price-items/${id}`, data) : client.post(`${feesAdminUrl()}/price-items`, data)).then(r => r.data);
export const setPriceItemActive = (id: number, on: boolean): Promise<PriceItem> =>
  client.post(`${feesAdminUrl()}/price-items/${id}/active`, null, { params: { on } }).then(r => r.data);
export const previewBill = (data: BillInput): Promise<BillPreview> => client.post(`${feesAdminUrl()}/bills/preview`, data).then(r => r.data);
export const issueBill = (data: BillInput): Promise<BillPreview> => client.post(`${feesAdminUrl()}/bills`, data).then(r => r.data);
/** sessionId: omitted = current session, 0 = every session. */
export const getBillBatches = (sessionId?: number): Promise<{ currency: string; session: SessionRef; batches: BillBatchInfo[] }> =>
  client.get(`${feesAdminUrl()}/bills`, { params: sessionId !== undefined ? { sessionId } : {} }).then(r => r.data);
export const getBillBatch = (id: number): Promise<BillBatchDetail> => client.get(`${feesAdminUrl()}/bills/${id}`).then(r => r.data);
export const cancelBillBatch = (id: number, reason: string): Promise<BillBatchDetail> => client.post(`${feesAdminUrl()}/bills/${id}/cancel`, { reason }).then(r => r.data);
export const cancelStudentBill = (id: number, reason: string): Promise<StudentBillInfo & { creditReleased: number }> =>
  client.post(`${feesAdminUrl()}/student-bills/${id}/cancel`, { reason }).then(r => r.data);
/** The accounts office's view of one student's account (same shape as the student's own, plus cancelled bills and voided payments). */
export const getStudentStatement = (id: number): Promise<MyFees & { student: MyFees['student'] & { id: number } }> =>
  client.get(`${feesAdminUrl()}/students/${id}/statement`).then(r => r.data);


// ── Concessions, year end, refunds, cash book ─────────────────────────────
export interface ConcessionInput {
  studentId: number; sessionId?: number; kind: ConcessionKind; title?: string; mode: 'PERCENT' | 'AMOUNT'; value: number;
  items?: string[]; term?: number | null; note: string;
}
export const getConcessions = (sessionId?: number): Promise<{
  currency: string; session: SessionRef; closed: boolean; kinds: { value: ConcessionKind; label: string }[];
  students: number; totalSaved: number; concessions: ConcessionInfo[];
}> => client.get(`${feesAdminUrl()}/concessions`, { params: sessionId ? { sessionId } : {} }).then(r => r.data);
export const grantConcession = (data: ConcessionInput): Promise<ConcessionInfo> => client.post(`${feesAdminUrl()}/concessions`, data).then(r => r.data);
export const revokeConcession = (id: number, reason: string): Promise<ConcessionInfo> =>
  client.post(`${feesAdminUrl()}/concessions/${id}/revoke`, { reason }).then(r => r.data);

export interface SessionCloseInfo { sessionId: number; sessionName: string; current: boolean; students: number; total: number; automatic: boolean; closedBy: string | null; closedAt: string }
export interface YearEndOverview {
  currency: string; session: SessionRef; closes: SessionCloseInfo[];
  preview: { sessionId: number; sessionName: string; hasFees: boolean; debtors: number; total: number; classes: { name: string; students: number; debtors: number; owed: number }[] } | null;
  arrears: ArrearsInfo[]; totals: { owed: number; paid: number; writtenOff: number; lines: number };
}
export interface OpeningImportResult {
  ok: number; errors: number; total: number; applied: boolean;
  rows: { row: number; studentId: string | null; name?: string; amount: number | null; status: 'NEW' | 'REPLACE' | 'ERROR'; message?: string }[];
}
export const getYearEnd = (): Promise<YearEndOverview> => client.get(`${feesAdminUrl()}/year-end`).then(r => r.data);
export const closeSessionFees = (sessionId?: number): Promise<SessionCloseInfo> =>
  client.post(`${feesAdminUrl()}/year-end/close`, null, { params: sessionId ? { sessionId } : {} }).then(r => r.data);
export const reopenSessionFees = (sessionId?: number) =>
  client.post(`${feesAdminUrl()}/year-end/reopen`, null, { params: sessionId ? { sessionId } : {} }).then(r => r.data);
export const checkOpeningBalances = (rows: Record<string, string>[]): Promise<OpeningImportResult> =>
  client.post(`${feesAdminUrl()}/opening-balances/check`, { rows }).then(r => r.data);
export const importOpeningBalances = (rows: Record<string, string>[]): Promise<OpeningImportResult> =>
  client.post(`${feesAdminUrl()}/opening-balances`, { rows }).then(r => r.data);
export const setOpeningBalance = (studentId: number, amount: number, note?: string) =>
  client.put(`${feesAdminUrl()}/students/${studentId}/opening-balance`, { amount, note }).then(r => r.data);
export const writeOffArrears = (id: number, reason: string): Promise<ArrearsInfo> =>
  client.post(`${feesAdminUrl()}/arrears/${id}/write-off`, { reason }).then(r => r.data);
export const restoreArrears = (id: number): Promise<ArrearsInfo> => client.post(`${feesAdminUrl()}/arrears/${id}/restore`).then(r => r.data);

export const refundStudent = (data: { studentId: number; amount: number; method: PaymentMethod; paidTo?: string; reason: string }): Promise<RefundInfo> =>
  client.post(`${feesAdminUrl()}/refunds`, data).then(r => r.data);
export const voidRefund = (id: number, reason: string): Promise<RefundInfo> => client.post(`${feesAdminUrl()}/refunds/${id}/void`, { reason }).then(r => r.data);

export interface CashUpMine { payments: number; refunds: number; expectedCash: number; nonCash: number; since: string | null }
export interface CashUpInfo {
  id: number; cashierId: number; cashier: string; payments: number; expectedCash: number; declaredCash: number; difference: number;
  nonCash: number; note: string | null; status: 'SUBMITTED' | 'CONFIRMED'; createdAt: string; confirmedBy: string | null; confirmedAt: string | null; confirmNote: string | null;
}
export interface CashBookRow {
  id: number; receiptNo: string | null; reference: string; studentName: string; studentId: string; amount: number; method: PaymentMethod;
  methodName: string; status: PaymentStatus; paidAt: string; recordedBy: string | null; voidedAt: string | null; voidedBy: string | null; note: string | null; cashedUp: boolean;
}
export interface CashBookDay {
  date: string; today: boolean; currency: string;
  totals: { received: number; payments: number; refunded: number; net: number };
  byMethod: { label: string; amount: number }[]; byCashier: { label: string; payments: number; amount: number; cash: number }[];
  payments: CashBookRow[]; voids: CashBookRow[]; refunds: RefundInfo[]; cashUps: CashUpInfo[]; awaitingConfirmation: CashUpInfo[];
  notHandedIn: { cashierId: number; cashier: string; payments: number; amount: number }[]; mine: CashUpMine; canConfirm: boolean;
}
export const getCashBook = (date?: string): Promise<CashBookDay> => client.get(`${feesAdminUrl()}/cash-book`, { params: date ? { date } : {} }).then(r => r.data);
export const submitCashUp = (declaredCash: number, note?: string): Promise<CashUpInfo> => client.post(`${feesAdminUrl()}/cash-ups`, { declaredCash, note }).then(r => r.data);
export const confirmCashUp = (id: number, note?: string): Promise<CashUpInfo> => client.post(`${feesAdminUrl()}/cash-ups/${id}/confirm`, { note }).then(r => r.data);

// ── Stores and reminders ──────────────────────────────────────────────────
export interface StoreItem { id: number; name: string; category: PriceCategory; price: number; active: boolean; stocked: boolean; onHand: number; reorderLevel: number | null; unitCost: number | null; low: boolean; toHandOver?: number }
export interface StockMove { id: number; kind: 'RECEIVED' | 'ISSUED' | 'RETURNED' | 'ADJUSTED'; quantity: number; balanceAfter: number; unitCost: number | null; reference: string | null; note: string | null; studentName: string | null; by: string | null; at: string }
export interface HandOverLine { lineId: number; itemId: number; name: string; quantity: number; issued: number; billId: number; billTitle: string; billedAt: string; studentId: number; studentName: string; username: string; billBalance?: number; canHandOver?: boolean }
export const getStores = (): Promise<{ currency: string; items: StoreItem[]; low: number; value: number; issueBeforePayment: boolean }> => client.get(`${feesAdminUrl()}/stores`).then(r => r.data);
export const setItemStocked = (id: number, stocked: boolean, reorderLevel?: number | null): Promise<StoreItem> => client.put(`${feesAdminUrl()}/stores/items/${id}`, { stocked, reorderLevel }).then(r => r.data);
export const receiveStock = (id: number, d: { quantity: number; unitCost?: number; reference?: string; note?: string }): Promise<StoreItem> => client.post(`${feesAdminUrl()}/stores/items/${id}/receive`, d).then(r => r.data);
export const adjustStock = (id: number, countedQuantity: number, reason: string): Promise<StoreItem> => client.post(`${feesAdminUrl()}/stores/items/${id}/adjust`, { countedQuantity, reason }).then(r => r.data);
export const getStockHistory = (id: number): Promise<StockMove[]> => client.get(`${feesAdminUrl()}/stores/items/${id}/history`).then(r => r.data);
export const getToHandOver = (studentId?: number): Promise<{ currency: string; issueBeforePayment: boolean; lines: HandOverLine[] }> =>
  client.get(`${feesAdminUrl()}/stores/to-hand-over`, { params: studentId ? { studentId } : {} }).then(r => r.data);
export const handOverItems = (lineId: number, quantity: number, note?: string): Promise<HandOverLine> => client.post(`${feesAdminUrl()}/stores/lines/${lineId}/hand-over`, { quantity, note }).then(r => r.data);
export const takeBackItems = (lineId: number, quantity: number, note: string): Promise<HandOverLine> => client.post(`${feesAdminUrl()}/stores/lines/${lineId}/take-back`, { quantity, note }).then(r => r.data);

export interface ReminderInput { programId?: number; level?: number; minOwed?: number; skipDays?: number; email?: boolean; sms?: boolean; message?: string }
export interface ReminderPreview { students: number; total: number; skipped: number; withEmail: number; withPhone: number; smsReady: boolean; sample: { name: string; owed: number }[]; example: string | null }
export interface ReminderBatch { batch: string; sentAt: string; sentBy: string; automatic: boolean; email: boolean; sms: boolean; students: number; total: number }
export const getReminders = (): Promise<{ currency: string; autoEveryDays: number; smsReady: boolean; defaultMessage: string; studentWord: string; history: ReminderBatch[] }> =>
  client.get(`${feesAdminUrl()}/reminders`).then(r => r.data);
export const previewReminders = (d: ReminderInput): Promise<ReminderPreview> => client.post(`${feesAdminUrl()}/reminders/preview`, d).then(r => r.data);
export const sendReminders = (d: ReminderInput): Promise<{ students: number; emails: number; sms: number; total: number; skipped: number }> => client.post(`${feesAdminUrl()}/reminders`, d).then(r => r.data);
export const setAutoReminders = (everyDays: number) => client.put(`${feesAdminUrl()}/reminders/automatic`, { everyDays }).then(r => r.data);

/** The accounts office's fee reports. */
export const financeReportsApi = reportsApi((path, config) => client.get(`${apiRoot()}/finance/reports${path}`, config));

/** Super Admin: accountant logins (bursar / cashier). */
export interface FinanceStaff {
  id: number; firstname: string; lastname: string; name: string; username: string; email: string; phone: string | null;
  duty: 'BURSAR' | 'CASHIER'; photo: string | null; enabled: boolean; deactivatedAt: string | null; deactivationReason: string | null;
  /** Only right after creating or resetting: the temporary password, shown once. */
  password?: string; emailed?: boolean;
}
export const getFinanceStaff = (): Promise<FinanceStaff[]> => client.get(`${superAdminRootUrl()}/finance-staff`).then(r => r.data);
export const addFinanceStaff = (d: { firstname: string; lastname: string; username: string; email: string; phone?: string; duty: 'BURSAR' | 'CASHIER'; emailLogin: boolean }): Promise<FinanceStaff> =>
  client.post(`${superAdminRootUrl()}/finance-staff`, d).then(r => r.data);
export const updateFinanceStaff = (id: number, d: { firstname?: string; lastname?: string; phone?: string; duty?: 'BURSAR' | 'CASHIER' }): Promise<FinanceStaff> =>
  client.put(`${superAdminRootUrl()}/finance-staff/${id}`, d).then(r => r.data);
/** Super Admin: one-person accounts office (the bursar's own cash-ups need no second check). */
export const getAccountsOfficeSettings = (): Promise<{ selfCashUp: boolean }> => client.get(`${superAdminRootUrl()}/finance-staff/settings`).then(r => r.data);
export const saveAccountsOfficeSettings = (selfCashUp: boolean): Promise<{ selfCashUp: boolean }> =>
  client.put(`${superAdminRootUrl()}/finance-staff/settings`, { selfCashUp }).then(r => r.data);
export const resetFinanceStaffPassword = (id: number): Promise<FinanceStaff> =>
  client.post(`${superAdminRootUrl()}/finance-staff/${id}/reset-password`).then(r => r.data);
