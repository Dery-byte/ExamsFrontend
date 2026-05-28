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

export const getCurrentUser = () => client.get('/current-user').then(r => r.data);

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
export const getAllLecturersCounts = () => client.get('/lecturers/counts').then(r => r.data);

export const getStudentById = (id: number) => client.get(`/studentbyId/${id}`).then(r => r.data);
export const getLecturerById = (id: number) => client.get(`/lecturerbyId/${id}`).then(r => r.data);

export const updateStudent = (id: number, data: object) => client.put(`/update/student/${id}`, data).then(r => r.data);
export const updateLecturer = (id: number, data: object) => client.put(`/update/lecturer/${id}`, data).then(r => r.data);

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
  client.post(`/theory-progress/save/${quizId}`, answers, { withCredentials: true }).then(r => r.data);
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
