import { Link, useLocation } from 'react-router-dom';
import { FileSearch, Table2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';

/** Shortcuts from a quiz to its result sheet and question analysis, in whichever staff area the page is shown. */
export default function QuizReportLinks({ quizId }: { quizId: number }) {
  const { user } = useAuth() as any;
  const { features } = useFeatureFlags();
  const { pathname } = useLocation();
  const area = pathname.startsWith('/lect') ? '/lect' : pathname.startsWith('/super-admin') ? '/super-admin' : '/admin';
  const allowed = user?.role === 'SUPER_ADMIN'
    || (user?.role === 'LECTURER' && features?.LECTURER_REPORTS !== false)
    || (user?.role === 'ADMIN' && features?.HOD_REPORTS !== false);
  if (!allowed) return null;
  const base = `${area}/reports`;
  return (
    <div className="qrl">
      <Link to={`${base}/quiz-results?quizId=${quizId}`} className="qrl-link"><Table2 size={14} /> Result sheet</Link>
      <Link to={`${base}/question-analysis?quizId=${quizId}`} className="qrl-link"><FileSearch size={14} /> Question analysis</Link>
      <style>{`
        .qrl { display: flex; flex-wrap: wrap; gap: 8px; padding: 12px 16px 4px; }
        .qrl-link { display: inline-flex; align-items: center; gap: 6px; min-height: 34px; padding: 0 12px; border-radius: 8px; border: 1.5px solid #c7c9f0; background: #f5f6fd; color: #3b3f99; font-size: 12.5px; font-weight: 700; text-decoration: none; }
        .qrl-link:hover { background: #eef0fb; }
        .qrl-link:focus-visible { outline: 2px solid #5156be; outline-offset: 2px; }
        @media (pointer: coarse) { .qrl-link { min-height: 42px; } }
      `}</style>
    </div>
  );
}
