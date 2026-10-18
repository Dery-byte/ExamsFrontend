import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, homeFor } from '../../contexts/AuthContext';
import { useAssessments } from '../../hooks/useFeatureFlags';

/**
 * Quiz pages: shown only while the developer has the Assessments module on; otherwise the user
 * goes to their own home page (the server refuses the quiz requests as well).
 */
export default function AssessmentsGate({ children }: { children: ReactNode }) {
  const on = useAssessments();
  const { user } = useAuth() as any;
  if (on) return <>{children}</>;
  return <Navigate to={user?.role ? homeFor(user.role) : '/'} replace />;
}
