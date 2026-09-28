import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import type { FeatureFlags, FeatureKey } from '../api/endpoints';

type MarksFlag = Exclude<keyof FeatureFlags, 'features'>;

/**
 * Renders children only while the given switch is on for the signed-in user; otherwise redirects.
 * Use `flag` for the Marks Sheet visibility switches and `feature` for the Feature Controls switches.
 */
export default function FeatureGate({ flag, feature, redirectTo, children }: {
  flag?: MarksFlag; feature?: FeatureKey; redirectTo: string; children: ReactNode;
}) {
  const flags = useFeatureFlags();
  const on = (flag ? flags[flag] !== false : true) && (feature ? flags.features?.[feature] !== false : true);
  return on ? <>{children}</> : <Navigate to={redirectTo} replace />;
}
