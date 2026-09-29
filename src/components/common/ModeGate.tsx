import { Navigate } from 'react-router-dom';
import { isSchoolMode } from '../../utils/terms';

/** Renders a page only in university mode or only in the school modes; otherwise redirects. */
export default function ModeGate({ only, redirectTo, children }: {
  only: 'university' | 'school'; redirectTo: string; children: React.ReactNode;
}) {
  const allowed = only === 'school' ? isSchoolMode() : !isSchoolMode();
  return allowed ? <>{children}</> : <Navigate to={redirectTo} replace />;
}
