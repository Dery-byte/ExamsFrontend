import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getFeatureFlags } from '../../api/endpoints';
import { useAuth, homeFor } from '../../contexts/AuthContext';

/**
 * Boarding pages: shown while the developer has boarding on (not "day only") and the user has
 * boarding duties (the Super Admin always does). Waits for the flags instead of bouncing the user
 * home on a fresh load; the server refuses the requests as well.
 */
export default function BoardingGate({ children }: { children: ReactNode }) {
  const { user } = useAuth() as any;
  const { data, isLoading } = useQuery({ queryKey: ['feature-flags'], queryFn: getFeatureFlags, staleTime: 60_000 });
  if (isLoading) return null;
  const b = data?.boarding;
  if (b && b.mode !== 'DAY' && b.staff) return <>{children}</>;
  return <Navigate to={user?.role ? homeFor(user.role) : '/'} replace />;
}
