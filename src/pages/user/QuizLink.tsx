import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { quizInstructionsPath } from '../../utils/quizLink';

/**
 * Entry point for shared quiz links (/quiz/:qid).
 *  - signed out      → login, then straight to the quiz's start (Instructions) page
 *  - signed in student → straight to the start page
 *  - signed in as anyone else → explain that the link is for students
 */
export default function QuizLink() {
  const { qid } = useParams();
  const { isLoggedIn, user, logout } = useAuth();

  if (!qid || !/^\d+$/.test(qid)) return <Navigate to="/" replace />;
  const target = quizInstructionsPath(qid);

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: { pathname: target }, quizLink: true }} replace />;
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
