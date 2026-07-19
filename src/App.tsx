import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { Toaster } from 'react-hot-toast';

// Layouts
import AdminLayout from './components/layout/AdminLayout';
import LecturerLayout from './components/layout/LecturerLayout';
import UserLayout from './components/layout/UserLayout';
import SuperAdminLayout from './components/layout/SuperAdminLayout';

// Auth
import Welcome from './pages/auth/Welcome';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ResetPassword from './pages/auth/ResetPassword';
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

// Super Admin
import SuperAdminWelcome from './pages/superadmin/SuperAdminWelcome';
import SuperAdminConfiguration from './pages/superadmin/SuperAdminConfiguration';
import Departments from './pages/superadmin/Departments';
import Programs from './pages/superadmin/Programs';
import ManageHODs from './pages/superadmin/ManageHODs';
import ManageStudentLevel from './pages/superadmin/ManageStudentLevel';

// Lecturer
import LectWelcome from './pages/lecturer/LectWelcome';
import ViewCourse from './pages/lecturer/ViewCourse';
import AddCourse from './pages/lecturer/AddCourse';
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

// Shared
import MarksSheetManager from './pages/admin/MarksSheetManager';

export default function App() {
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
      <Routes>
        {/* Public */}
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Super Admin */}
        <Route path="/super-admin" element={<ProtectedRoute role="SUPER_ADMIN"><SuperAdminLayout /></ProtectedRoute>}>
          <Route index element={<SuperAdminWelcome />} />
          <Route path="configuration" element={<SuperAdminConfiguration />} />
          <Route path="profile" element={<Profile />} />
          <Route path="departments" element={<Departments />} />
          <Route path="programs" element={<Programs />} />
          <Route path="hods" element={<ManageHODs />} />
          <Route path="student-semester" element={<ManageStudentLevel />} />
          <Route path="students" element={<Students />} />
          <Route path="enroll-student" element={<EnrollStudent />} />
          <Route path="marks-sheets" element={<MarksSheetManager />} />
        </Route>

        {/* Admin */}
        <Route path="/admin" element={<ProtectedRoute role={['ADMIN','SUPER_ADMIN']}><AdminLayout /></ProtectedRoute>}>
          <Route index element={<AdminWelcome />} />
          <Route path="profile" element={<Profile />} />
          <Route path="courses" element={<ViewCategories />} />
          <Route path="add-course" element={<AddCategory />} />
          <Route path="quizzes" element={<ViewQuizzes />} />
          <Route path="add-quiz" element={<AddQuiz />} />
          <Route path="view-questions/:qId/:qTitle" element={<ViewQuizQuestions />} />
          <Route path="add-question/:qId/:title" element={<AddQuestion />} />
          <Route path="students" element={<Students />} />
          <Route path="lecturers" element={<Lecturers />} />
          <Route path="quiz-review" element={<QuizReview />} />
          <Route path="enroll-student" element={<EnrollStudent />} />
          <Route path="marks-sheets" element={<MarksSheetManager />} />
        </Route>

        {/* Lecturer */}
        <Route path="/lect" element={<ProtectedRoute role="LECTURER"><LecturerLayout /></ProtectedRoute>}>
          <Route index element={<LectWelcome />} />
          <Route path="profile" element={<Profile />} />
          <Route path="courses" element={<ViewCourse />} />
          <Route path="add-course" element={<AddCourse />} />
          <Route path="quizes" element={<LectViewQuizzes />} />
          <Route path="add-quizes" element={<LectAddQuiz />} />
          <Route path="view-quetions/:qId/:qTitle" element={<LectViewQuizQuestions />} />
          <Route path="add-question/:qId/:title" element={<LectAddQuestion />} />
          <Route path="quiz-review" element={<LectQuizReview />} />
          <Route path="manual-marks" element={<ManualMarksEntry />} />
        </Route>

        {/* Student */}
        <Route path="/user-dashboard" element={<ProtectedRoute role="NORMAL"><UserLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="user-dashboard" replace />} />
          <Route path="user-dashboard" element={<UserDashboard />} />
          <Route path="profile" element={<Profile />} />
          <Route path="register" element={<RegisterCourses />} />
          <Route path="courses" element={<CoursesRegistered />} />
          <Route path="quizzes" element={<AvailableQuizzes />} />
          <Route path="history" element={<LoadQuiz />} />
          <Route path="report-cards" element={<SemesterReportCard />} />

          <Route path="instructions/:qid" element={<Instructions />} />
        </Route>

        {/* Standalone exam pages */}
        <Route path="/start/:qid" element={<ProtectedRoute role="NORMAL"><StartQuiz /></ProtectedRoute>} />
        <Route path="/print_quiz/:qid" element={<ProtectedRoute role="NORMAL"><PrintQuiz /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
