import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/** Bursar-only pages of the accounts office; a cashier goes back to the dashboard (the server refuses them too). */
export default function BursarGate({ children }: { children: ReactNode }) {
  const { user } = useAuth() as any;
  if (user?.financeDuty === 'BURSAR') return <>{children}</>;
  return <Navigate to="/accounts" replace />;
}
