import { useQuery } from '@tanstack/react-query';
import { getFeatureFlags, type FeatureFlags, type FeatureKey } from '../api/endpoints';

const DEFAULT_FLAGS: FeatureFlags = { marksSheetAdmin: true, marksSheetLecturer: true, marksSheetStudent: true, feesStudent: false, assessments: true, features: {} };

/** The developer's Assessments switch (the whole quiz module); on while the flags load. */
export function useAssessments(): boolean {
  return useFeatureFlags().assessments !== false;
}

const NO_BOARDING = { mode: 'DAY' as const, word: 'House', plural: 'Houses', staff: false, head: false };

/** The developer's day / boarding setting plus the signed-in user's boarding duties (no boarding while loading). */
export function useBoarding() {
  return useFeatureFlags().boarding ?? NO_BOARDING;
}

/** Super Admin / HOD switches that control which navigation entries and actions each user sees. */
export function useFeatureFlags(): FeatureFlags {
  const { data } = useQuery({ queryKey: ['feature-flags'], queryFn: getFeatureFlags, staleTime: 60_000 });
  return data ?? DEFAULT_FLAGS;
}

/** Whether a switchable feature is on for the signed-in user (defaults to on while loading). */
export function useFeature(key: FeatureKey): boolean {
  return useFeatureFlags().features?.[key] ?? true;
}
