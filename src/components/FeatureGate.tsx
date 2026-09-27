import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import type { FeatureFlags } from '../api/endpoints';

/** Renders children only while the Super Admin has the given feature switched on; otherwise redirects. */
export default function FeatureGate({ flag, redirectTo, children }: { flag: keyof FeatureFlags; redirectTo: string; children: ReactNode }) {
  const flags = useFeatureFlags();
  return flags[flag] ? <>{children}</> : <Navigate to={redirectTo} replace />;
}
