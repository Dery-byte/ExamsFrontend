import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useAuth, homeFor } from '../../contexts/AuthContext';
import { getFeatureFlags } from '../../api/endpoints';

/**
 * Course notes and assignments pages: shown only while the developer's module is on and the Super
 * Admin (or the department) has the feature on; otherwise the user goes home. Waits for the flags,
 * since the module starts off and a cold page would otherwise bounce. The server refuses too.
 */
export default function MaterialsGate({ children }: { children: ReactNode }) {
  const { user } = useAuth() as any;
  const q = useQuery({ queryKey: ['feature-flags'], queryFn: getFeatureFlags, staleTime: 60_000 });
  if (q.isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} color="var(--brand-text)" aria-label="Loading" /></div>;
  const on = q.data?.materials === true && (user?.role === 'SUPER_ADMIN' || q.data?.features?.COURSE_MATERIALS !== false);
  if (on) return <>{children}</>;
  return <Navigate to={user?.role ? homeFor(user.role) : '/'} replace />;
}
