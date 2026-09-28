import { useQuery } from '@tanstack/react-query';
import { getFeatureFlags, type FeatureFlags, type FeatureKey } from '../api/endpoints';

const DEFAULT_FLAGS: FeatureFlags = { marksSheetAdmin: true, marksSheetLecturer: true, marksSheetStudent: true, features: {} };

/** Super Admin / HOD switches that control which navigation entries and actions each user sees. */
export function useFeatureFlags(): FeatureFlags {
  const { data } = useQuery({ queryKey: ['feature-flags'], queryFn: getFeatureFlags, staleTime: 60_000 });
  return data ?? DEFAULT_FLAGS;
}

/** Whether a switchable feature is on for the signed-in user (defaults to on while loading). */
export function useFeature(key: FeatureKey): boolean {
  return useFeatureFlags().features?.[key] ?? true;
}
