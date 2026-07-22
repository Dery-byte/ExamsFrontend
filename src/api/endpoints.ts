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
export const changeMyPassword = (newPassword: string) =>
  client.put('/updatepassword', { password: newPassword }).then(r => r.data);

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
export const addQuiz = (data: object) => client.post('/addQuiz', data).then(r => r.data);
export const addLecturerQuiz = (data: object) => client.post('/lecturer/addQuiz', data).then(r => r.data);
export const addUserQuiz = (data: object) => client.post('/user/addQuiz', data).then(r => r.data);
export const updateQuiz = (data: object) => client.put('/update', data).then(r => r.data);
export const deleteQuiz = (id: number) => client.delete(`/delete/quiz/${id}`).then(r => r.data);
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
export const getProgramsByDept = (deptId: number) => client.get(`/programs/department/${deptId}`).then(r => r.data);
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
export const saPromoteStudent     = (id: number, targetLevel: number) =>
  saClient.put(`/student/${id}/promote`, { targetLevel }).then(r => r.data);
export const saPromoteAllAtLevel  = (programId: number, level: number, targetLevel: number) =>
  saClient.put(`/students/promote-all/${programId}/${level}`, { targetLevel }).then(r => r.data);
export const saPromoteSemesterAllAtLevel = (programId: number, level: number) =>
  saClient.put(`/students/promote-semester-all/${programId}/${level}`).then(r => r.data);

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
