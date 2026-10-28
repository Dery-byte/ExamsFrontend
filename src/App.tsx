import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import ModeGate from './components/common/ModeGate';
import DeveloperLogin from './pages/developer/DeveloperLogin';
import DeveloperDashboard from './pages/developer/DeveloperDashboard';
import { useInstitution } from './hooks/useInstitution';
import { syncMode } from './utils/terms';
import { Toaster } from 'react-hot-toast';
import BrandingSync from './components/common/BrandingSync';

// Layouts
import AdminLayout from './components/layout/AdminLayout';
import LecturerLayout from './components/layout/LecturerLayout';
import UserLayout from './components/layout/UserLayout';
import SuperAdminLayout from './components/layout/SuperAdminLayout';

// Auth
import Welcome from './pages/auth/Welcome';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import MaintenanceGate from './components/common/MaintenanceGate';
import Unavailable from './pages/auth/Unavailable';
import ResetPassword from './pages/auth/ResetPassword';
import ChangePassword from './pages/auth/ChangePassword';
import Profile from './pages/auth/Profile';

// Admin
import AdminWelcome from './pages/admin/AdminWelcome';
import ViewCategories from './pages/admin/ViewCategories';
import AddCategory from './pages/admin/AddCategory';
import ViewQuizzes from './pages/admin/ViewQuizzes';
import AddQuiz from './pages/admin/AddQuiz';
import ViewQuizQuestions from './pages/admin/ViewQuizQuestions';
import AddQuestion from './pages/admin/AddQuestion';
import Students from './pages/admin/Students';
import Lecturers from './pages/admin/Lecturers';
import QuizReview from './pages/admin/QuizReview';
import EnrollStudent from './pages/admin/EnrollStudent';
import FeatureGate from './components/FeatureGate';
import AssessmentsGate from './components/common/AssessmentsGate';
import Announcements from './pages/shared/Announcements';
import Analytics from './pages/shared/Analytics';
import AuditLog from './pages/superadmin/AuditLog';
import ReportsHub from './pages/shared/reports/ReportsHub';
import ReportView from './pages/shared/reports/ReportView';
import Timetable from './pages/shared/Timetable';
import QuestionBank from './pages/shared/QuestionBank';
import ProctoringReport from './pages/shared/ProctoringReport';
import RemarkRequests from './pages/shared/RemarkRequests';
import AcademicSettings from './pages/superadmin/AcademicSettings';
import InstitutionSettings from './pages/superadmin/InstitutionSettings';
import TermRemarks from './pages/shared/TermRemarks';
import VerifyDocument from './pages/auth/VerifyDocument';
import AcademicRecords from './pages/shared/AcademicRecords';
import Transcript from './pages/user/Transcript';
import DataTools from './pages/shared/DataTools';
import FeatureControls from './pages/shared/FeatureControls';
import AttendanceHome from './pages/shared/attendance/AttendanceHome';
import AttendanceSessionPage from './pages/shared/attendance/SessionPage';
import ProjectorScreen from './pages/shared/attendance/ProjectorScreen';
import { HelperScannerPage, StaffScannerPage } from './pages/shared/attendance/ScannerPages';
import StudentAttendance from './pages/user/attendance/StudentAttendance';
import BoardingGate from './components/common/BoardingGate';
import BoardingHome from './pages/shared/boarding/BoardingHome';
import HostelPage from './pages/shared/boarding/HostelPage';

// Super Admin
import SuperAdminWelcome from './pages/superadmin/SuperAdminWelcome';
import SuperAdminConfiguration from './pages/superadmin/SuperAdminConfiguration';
import Departments from './pages/superadmin/Departments';
import Programs from './pages/superadmin/Programs';
import ManageHODs from './pages/superadmin/ManageHODs';
import ManageStudentLevel from './pages/superadmin/ManageStudentLevel';
import FeesPage from './pages/superadmin/fees/FeesPage';
import FinanceStaff from './pages/superadmin/FinanceStaff';
import AccountantLayout from './components/layout/AccountantLayout';
import AccountsDashboard from './pages/accounts/AccountsDashboard';
import FeeSettingsPage from './pages/accounts/FeeSettingsPage';
import BillsPage from './pages/accounts/BillsPage';
import StudentAccountPage from './pages/accounts/StudentAccountPage';
import CashBookPage from './pages/accounts/CashBookPage';
import ConcessionsPage from './pages/accounts/ConcessionsPage';
import YearEndPage from './pages/accounts/YearEndPage';
import StoresPage from './pages/accounts/StoresPage';
import RemindersPage from './pages/accounts/RemindersPage';
import BursarGate from './components/common/BursarGate';

// Lecturer
import LectWelcome from './pages/lecturer/LectWelcome';
import ViewCourse from './pages/lecturer/ViewCourse';
import LectViewQuizzes from './pages/lecturer/LectViewQuizzes';
import LectQuizReview from './pages/lecturer/LectQuizReview';
import LectAddQuiz from './pages/lecturer/LectAddQuiz';
import LectViewQuizQuestions from './pages/lecturer/LectViewQuizQuestions';
import LectAddQuestion from './pages/lecturer/LectAddQuestion';
import ManualMarksEntry from './pages/lecturer/ManualMarksEntry';

// User
import UserDashboard from './pages/user/UserDashboard';
import RegisterCourses from './pages/user/RegisterCourses';
import CoursesRegistered from './pages/user/CoursesRegistered';
import AvailableQuizzes from './pages/user/AvailableQuizzes';
import LoadQuiz from './pages/user/LoadQuiz';
import Instructions from './pages/user/Instructions';
import StartQuiz from './pages/user/StartQuiz';
import PrintQuiz from './pages/user/PrintQuiz';
import SemesterReportCard from './pages/user/SemesterReportCard';
import QuizLink from './pages/user/QuizLink';
import Fees from './pages/user/fees/Fees';

// Shared
import MarksSheetManager from './pages/admin/MarksSheetManager';

/** When the server's system mode differs from the one this browser cached, reload once with the right words. */
function ModeSync() {
  const { institution } = useInstitution();
  useEffect(() => {
    if (syncMode(institution.mode)) window.location.reload();
  }, [institution.mode]);
  return null;
}

export default function App() {
  const location = useLocation();
  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        containerStyle={{ zIndex: 9999999 }}
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1e293b',
            color: '#fff',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '600',
            padding: '12px 20px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#fff' }
          },
          error: {
            iconTheme: { primary: '#f43f5e', secondary: '#fff' }
          }
        }}
      />
      <ModeSync />
      <BrandingSync />
      <ErrorBoundary resetKey={location.pathname}>
      <Routes>
        {/* Developer: email code sign-in, system mode, health */}
        <Route path="/developer" element={<DeveloperLogin />} />
        <Route path="/developer/dashboard" element={<ProtectedRoute role="DEVELOPER"><DeveloperDashboard /></ProtectedRoute>} />
        {/* Public */}
        <Route path="/" element={<Welcome />} />
        {/* Under maintenance both are replaced by the maintenance notice */}
        <Route path="/login" element={<MaintenanceGate page="signin"><Login /></MaintenanceGate>} />
        <Route path="/signup" element={<MaintenanceGate page="signup"><Signup /></MaintenanceGate>} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/unavailable" element={<Unavailable />} />
        <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
        <Route path="/verify" element={<VerifyDocument />} />
        <Route path="/verify/:code" element={<VerifyDocument />} />
        <Route path="/quiz/:qid" element={<AssessmentsGate><QuizLink /></AssessmentsGate>} />
        {/* The readable part is decorative; the quiz is found by :qid */}
        <Route path="/quiz/:qid/:slug" element={<AssessmentsGate><QuizLink /></AssessmentsGate>} />

        {/* Super Admin */}
        <Route path="/super-admin" element={<ProtectedRoute role="SUPER_ADMIN"><SuperAdminLayout /></ProtectedRoute>}>
          <Route index element={<SuperAdminWelcome />} />
          <Route path="configuration" element={<SuperAdminConfiguration />} />
          <Route path="academic-settings" element={<AcademicSettings />} />
          <Route path="institution" element={<InstitutionSettings />} />
          <Route path="features" element={<FeatureControls />} />
          <Route path="fees" element={<FeesPage />} />
          <Route path="bills" element={<BillsPage />} />
          <Route path="student-accounts" element={<StudentAccountPage />} />
          <Route path="stores" element={<StoresPage />} />
          <Route path="reminders" element={<RemindersPage />} />
          <Route path="cash-book" element={<CashBookPage />} />
          <Route path="concessions" element={<ConcessionsPage />} />
          <Route path="year-end" element={<YearEndPage />} />
          <Route path="finance-staff" element={<FinanceStaff />} />
          <Route path="academic-records" element={<ModeGate only="university" redirectTo=".."><AcademicRecords /></ModeGate>} />
          <Route path="data-tools" element={<DataTools />} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="analytics" element={<AssessmentsGate><Analytics /></AssessmentsGate>} />
          <Route path="audit-log" element={<FeatureGate flag="auditLogSuperAdmin" redirectTo="/super-admin"><AuditLog /></FeatureGate>} />
          <Route path="reports" element={<ReportsHub />} />
          <Route path="reports/:key" element={<ReportView />} />
          <Route path="timetable" element={<AssessmentsGate><Timetable /></AssessmentsGate>} />
          <Route path="attendance" element={<AttendanceHome />} />
          <Route path="attendance/session/:id" element={<AttendanceSessionPage />} />
          <Route path="boarding" element={<BoardingGate><BoardingHome /></BoardingGate>} />
          <Route path="boarding/:id" element={<BoardingGate><HostelPage /></BoardingGate>} />
          <Route path="boarding/reports" element={<BoardingGate><ReportsHub /></BoardingGate>} />
          <Route path="boarding/reports/:key" element={<BoardingGate><ReportView /></BoardingGate>} />
          <Route path="question-bank" element={<AssessmentsGate><QuestionBank /></AssessmentsGate>} />
          <Route path="remarks" element={<AssessmentsGate><RemarkRequests /></AssessmentsGate>} />
          <Route path="profile" element={<Profile />} />
          <Route path="departments" element={<Departments />} />
          <Route path="programs" element={<Programs />} />
          <Route path="hods" element={<ManageHODs />} />
          <Route path="student-semester" element={<ManageStudentLevel />} />
          <Route path="students" element={<Students />} />
          <Route path="enroll-student" element={<EnrollStudent />} />
          <Route path="courses" element={<ViewCategories />} />
          <Route path="add-course" element={<AddCategory />} />
          <Route path="quizzes" element={<AssessmentsGate><ViewQuizzes /></AssessmentsGate>} />
          <Route path="add-quiz" element={<AssessmentsGate><AddQuiz /></AssessmentsGate>} />
          <Route path="view-questions/:qId/:qTitle" element={<AssessmentsGate><ViewQuizQuestions /></AssessmentsGate>} />
          <Route path="add-question/:qId/:title" element={<AssessmentsGate><AddQuestion /></AssessmentsGate>} />
          <Route path="quiz-review" element={<AssessmentsGate><QuizReview /></AssessmentsGate>} />
          <Route path="proctoring/:qId" element={<AssessmentsGate><ProctoringReport /></AssessmentsGate>} />
          <Route path="marks-sheets" element={<MarksSheetManager />} />
          <Route path="term-remarks" element={<ModeGate only="school" redirectTo="/super-admin"><TermRemarks /></ModeGate>} />
          <Route path="lecturers" element={<Lecturers />} />
        </Route>

        {/* Admin */}
        <Route path="/admin" element={<ProtectedRoute role={['ADMIN','SUPER_ADMIN']}><AdminLayout /></ProtectedRoute>}>
          <Route index element={<AdminWelcome />} />
          <Route path="department-settings" element={<FeatureControls />} />
          <Route path="timetable" element={<AssessmentsGate><Timetable /></AssessmentsGate>} />
          {/* Not gated: the HOD sets the rules (and the department switch) from here */}
          <Route path="attendance" element={<AttendanceHome />} />
          <Route path="attendance/session/:id" element={<AttendanceSessionPage />} />
          <Route path="boarding" element={<BoardingGate><BoardingHome /></BoardingGate>} />
          <Route path="boarding/:id" element={<BoardingGate><HostelPage /></BoardingGate>} />
          <Route path="boarding/reports" element={<BoardingGate><ReportsHub /></BoardingGate>} />
          <Route path="boarding/reports/:key" element={<BoardingGate><ReportView /></BoardingGate>} />
          <Route path="question-bank" element={<AssessmentsGate><FeatureGate feature="QUESTION_BANK" redirectTo="/admin"><QuestionBank /></FeatureGate></AssessmentsGate>} />
          <Route path="proctoring/:qId" element={<AssessmentsGate><ProctoringReport /></AssessmentsGate>} />
          <Route path="remarks" element={<AssessmentsGate><RemarkRequests /></AssessmentsGate>} />
          <Route path="academic-records" element={<ModeGate only="university" redirectTo=".."><AcademicRecords /></ModeGate>} />
          <Route path="data-tools" element={<FeatureGate feature="HOD_DATA_TOOLS" redirectTo="/admin"><DataTools /></FeatureGate>} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="analytics" element={<AssessmentsGate><FeatureGate feature="HOD_ANALYTICS" redirectTo="/admin"><Analytics /></FeatureGate></AssessmentsGate>} />
          <Route path="reports" element={<FeatureGate feature="HOD_REPORTS" redirectTo="/admin"><ReportsHub /></FeatureGate>} />
          <Route path="reports/:key" element={<FeatureGate feature="HOD_REPORTS" redirectTo="/admin"><ReportView /></FeatureGate>} />
          <Route path="profile" element={<Profile />} />
          <Route path="courses" element={<ViewCategories />} />
          <Route path="add-course" element={<AddCategory />} />
          <Route path="quizzes" element={<AssessmentsGate><ViewQuizzes /></AssessmentsGate>} />
          <Route path="add-quiz" element={<AssessmentsGate><AddQuiz /></AssessmentsGate>} />
          <Route path="view-questions/:qId/:qTitle" element={<AssessmentsGate><ViewQuizQuestions /></AssessmentsGate>} />
          <Route path="add-question/:qId/:title" element={<AssessmentsGate><AddQuestion /></AssessmentsGate>} />
          <Route path="students" element={<Students />} />
          <Route path="lecturers" element={<Lecturers />} />
          <Route path="quiz-review" element={<AssessmentsGate><QuizReview /></AssessmentsGate>} />
          <Route path="enroll-student" element={<EnrollStudent />} />
          <Route path="marks-sheets" element={<FeatureGate flag="marksSheetAdmin" redirectTo="/admin"><MarksSheetManager /></FeatureGate>} />
          <Route path="term-remarks" element={<ModeGate only="school" redirectTo="/admin"><FeatureGate flag="marksSheetAdmin" redirectTo="/admin"><TermRemarks /></FeatureGate></ModeGate>} />
        </Route>

        {/* Lecturer */}
        <Route path="/lect" element={<ProtectedRoute role="LECTURER"><LecturerLayout /></ProtectedRoute>}>
          <Route index element={<LectWelcome />} />
          <Route path="timetable" element={<AssessmentsGate><Timetable /></AssessmentsGate>} />
          <Route path="attendance" element={<FeatureGate feature="ATTENDANCE" redirectTo="/lect"><AttendanceHome /></FeatureGate>} />
          <Route path="attendance/session/:id" element={<FeatureGate feature="ATTENDANCE" redirectTo="/lect"><AttendanceSessionPage /></FeatureGate>} />
          <Route path="boarding" element={<BoardingGate><BoardingHome /></BoardingGate>} />
          <Route path="boarding/:id" element={<BoardingGate><HostelPage /></BoardingGate>} />
          <Route path="boarding/reports" element={<BoardingGate><ReportsHub /></BoardingGate>} />
          <Route path="boarding/reports/:key" element={<BoardingGate><ReportView /></BoardingGate>} />
          <Route path="question-bank" element={<AssessmentsGate><FeatureGate feature="QUESTION_BANK" redirectTo="/lect"><QuestionBank /></FeatureGate></AssessmentsGate>} />
          <Route path="reports" element={<FeatureGate feature="LECTURER_REPORTS" redirectTo="/lect"><ReportsHub /></FeatureGate>} />
          <Route path="reports/:key" element={<FeatureGate feature="LECTURER_REPORTS" redirectTo="/lect"><ReportView /></FeatureGate>} />
          <Route path="proctoring/:qId" element={<AssessmentsGate><ProctoringReport /></AssessmentsGate>} />
          <Route path="remarks" element={<AssessmentsGate><RemarkRequests /></AssessmentsGate>} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="profile" element={<Profile />} />
          <Route path="courses" element={<ViewCourse />} />
          <Route path="quizes" element={<AssessmentsGate><LectViewQuizzes /></AssessmentsGate>} />
          <Route path="add-quizes" element={<AssessmentsGate><LectAddQuiz /></AssessmentsGate>} />
          <Route path="view-quetions/:qId/:qTitle" element={<AssessmentsGate><LectViewQuizQuestions /></AssessmentsGate>} />
          <Route path="add-question/:qId/:title" element={<AssessmentsGate><LectAddQuestion /></AssessmentsGate>} />
          <Route path="quiz-review" element={<AssessmentsGate><LectQuizReview /></AssessmentsGate>} />
          <Route path="manual-marks" element={<FeatureGate flag="marksSheetLecturer" redirectTo="/lect"><ManualMarksEntry /></FeatureGate>} />
          <Route path="term-remarks" element={<ModeGate only="school" redirectTo="/lect"><FeatureGate flag="marksSheetLecturer" redirectTo="/lect"><TermRemarks /></FeatureGate></ModeGate>} />
        </Route>

        {/* Accounts office: bursars and cashiers */}
        <Route path="/accounts" element={<ProtectedRoute role="ACCOUNTANT"><AccountantLayout /></ProtectedRoute>}>
          <Route index element={<AccountsDashboard />} />
          <Route path="fees" element={<FeesPage />} />
          <Route path="bills" element={<BillsPage />} />
          <Route path="students" element={<StudentAccountPage />} />
          <Route path="stores" element={<StoresPage />} />
          <Route path="reminders" element={<RemindersPage />} />
          <Route path="cash-book" element={<CashBookPage />} />
          <Route path="concessions" element={<ConcessionsPage />} />
          <Route path="year-end" element={<YearEndPage />} />
          <Route path="reports" element={<ReportsHub />} />
          <Route path="reports/:key" element={<ReportView />} />
          <Route path="settings" element={<BursarGate><FeeSettingsPage /></BursarGate>} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Student */}
        <Route path="/user-dashboard" element={<ProtectedRoute role="NORMAL"><UserLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="user-dashboard" replace />} />
          <Route path="user-dashboard" element={<UserDashboard />} />
          <Route path="timetable" element={<AssessmentsGate><FeatureGate feature="STUDENT_TIMETABLE" redirectTo="/user-dashboard"><Timetable /></FeatureGate></AssessmentsGate>} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="transcript" element={<ModeGate only="university" redirectTo="/user-dashboard"><FeatureGate flag="marksSheetStudent" feature="STUDENT_TRANSCRIPT" redirectTo="/user-dashboard"><Transcript /></FeatureGate></ModeGate>} />
          <Route path="profile" element={<Profile />} />
          {/* Not behind FeatureGate: Paystack returns students here and the gate would redirect before the flags load */}
          <Route path="fees" element={<Fees />} />
          <Route path="register" element={<FeatureGate feature="STUDENT_COURSE_REGISTRATION" redirectTo="/user-dashboard"><RegisterCourses /></FeatureGate>} />
          <Route path="courses" element={<CoursesRegistered />} />
          <Route path="attendance" element={<FeatureGate feature="ATTENDANCE" redirectTo="/user-dashboard"><StudentAttendance /></FeatureGate>} />
          <Route path="quizzes" element={<AssessmentsGate><AvailableQuizzes /></AssessmentsGate>} />
          <Route path="history" element={<AssessmentsGate><LoadQuiz /></AssessmentsGate>} />
          <Route path="report-cards" element={<FeatureGate flag="marksSheetStudent" feature="STUDENT_REPORT_CARD" redirectTo="/user-dashboard"><SemesterReportCard /></FeatureGate>} />

          <Route path="instructions/:qid" element={<AssessmentsGate><Instructions /></AssessmentsGate>} />
        </Route>

        {/* Standalone exam pages */}
        <Route path="/start/:qid" element={<AssessmentsGate><ProtectedRoute role="NORMAL"><StartQuiz /></ProtectedRoute></AssessmentsGate>} />
        <Route path="/print_quiz/:qid" element={<AssessmentsGate><ProtectedRoute role="NORMAL"><PrintQuiz /></ProtectedRoute></AssessmentsGate>} />
        {/* Full-screen attendance code for the projector */}
        <Route path="/attendance-screen/:id" element={<ProtectedRoute role={['LECTURER', 'ADMIN', 'SUPER_ADMIN']}><ProjectorScreen /></ProtectedRoute>} />
        {/* Scanning students' attendance QR codes: staff from their account, helpers (TAs) from the link they were given */}
        <Route path="/attendance-scanner/:id" element={<ProtectedRoute role={['LECTURER', 'ADMIN', 'SUPER_ADMIN']}><StaffScannerPage /></ProtectedRoute>} />
        <Route path="/attendance-scan/:token" element={<HelperScannerPage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </ErrorBoundary>
    </AuthProvider>
  );
}
