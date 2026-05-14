import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '../../contexts/AuthContext';

interface Props {
  children: React.ReactNode;
  role?: UserRole | UserRole[];
}

export function ProtectedRoute({ children, role }: Props) {
  const { isLoggedIn, user } = useAuth();
  const location = useLocation();
  if (!isLoggedIn) return <Navigate to="/login" state={{ from: location }} replace />;
  if (role) {
    const allowed = Array.isArray(role) ? role : [role];
    if (!user || !allowed.includes(user.role)) return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
