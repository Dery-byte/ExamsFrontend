import { useQuery } from '@tanstack/react-query';
import { getInstitution } from '../api/endpoints';
import { getMode, isSchoolMode, tx, type SystemMode } from '../utils/terms';

export type InstitutionType = 'UNIVERSITY' | 'SCHOOL';

export interface Institution {
  name: string;
  shortName: string;
  subtitle: string;
  type: InstitutionType;
  mode: SystemMode;
  modeLabel: string;
  periodsPerLevel: number;
  portalUrl: string;
  showPosition: boolean;
  hasLogo: boolean;
  terms: Record<string, string>;
}

const FALLBACK: Institution = {
  name: 'University of Cape Coast', shortName: 'UCC', subtitle: '', type: 'UNIVERSITY',
  mode: 'UNIVERSITY', modeLabel: 'University / Tertiary', periodsPerLevel: 2,
  portalUrl: '', showPosition: false, hasLogo: false, terms: {},
};

/** Institution name, system mode and wording, shared by every page (cached; public endpoint). */
export function useInstitution() {
  const { data } = useQuery<Institution>({
    queryKey: ['institution'],
    queryFn: getInstitution,
    staleTime: 5 * 60_000,
  });
  const inst = data ?? { ...FALLBACK, mode: getMode() };
  return { institution: inst, isSchool: isSchoolMode(), mode: getMode(), term: tx };
}
