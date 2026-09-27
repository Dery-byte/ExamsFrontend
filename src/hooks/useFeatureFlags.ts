import { useQuery } from '@tanstack/react-query';
import { getFeatureFlags, type FeatureFlags } from '../api/endpoints';

const DEFAULT_FLAGS: FeatureFlags = { marksSheetAdmin: true, marksSheetLecturer: true, marksSheetStudent: true };

/** Super Admin feature switches that control which navigation entries each role sees. */
export function useFeatureFlags(): FeatureFlags {
  const { data } = useQuery({ queryKey: ['feature-flags'], queryFn: getFeatureFlags, staleTime: 60_000 });
  return data ?? DEFAULT_FLAGS;
}
