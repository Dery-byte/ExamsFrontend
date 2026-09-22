import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { quizInstructionsPath, decodeQuizId } from '../../utils/quizLink';

/**
 * Entry point for shared quiz links (/quiz/:qid).
 *  - signed out      → login, then straight to the quiz's start (Instructions) page
 *  - signed in student → straight to the start page
 *  - signed in as anyone else → explain that the link is for students
 *
 * :qid is an obfuscated base64url token (never a raw integer) so the DB ID
 * is not visible in the URL.
 */
export default function QuizLink() {
  const { qid } = useParams();
  const { isLoggedIn, user, logout } = useAuth();

  // Decode the obfuscated token → real numeric ID
  const realId = qid ? decodeQuizId(qid) : null;
  if (!realId) return <Navigate to="/" replace />;

  const target = quizInstructionsPath(realId);

  if (!isLoggedIn) {
    // realId rides along so the login page can show which program(s) this quiz is for.
    return <Navigate to="/login" state={{ from: { pathname: target }, quizLink: true, qid: realId }} replace />;
  }
  if (user?.role === 'NORMAL') return <Navigate to={target} replace />;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#f0f2f8' }}>
      <div style={{ maxWidth: 420, textAlign: 'center', background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 4px 20px rgba(0,0,0,.06)' }}>
        <h3 style={{ margin: '0 0 8px', color: '#1e293b' }}>This link is for students</h3>
        <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: 14 }}>
          You're signed in as {user?.role?.toLowerCase().replace('_', ' ')}. Sign out and log in with a student account to take this quiz.
        </p>
        <button className="btn-lexa btn-lexa-primary" onClick={logout}>Sign out</button>
      </div>
    </div>
  );
}

