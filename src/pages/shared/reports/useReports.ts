import { useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import {
  getMyDepartmentPrograms, hodReportsApi, lecturerReportsApi, saGetPrograms, saReportsApi, type ReportsApi,
} from '../../../api/endpoints';

export type ReportsRole = 'sa' | 'hod' | 'lecturer';

/**
 * Which reports the signed-in person gets and where the pages live:
 * the Super Admin's (whole institution), an HOD's (own department) or a lecturer's
 * (own courses and quizzes). The server enforces the scope; this only picks the API.
 */
export function useReports(): {
  api: ReportsApi; role: ReportsRole; isSuper: boolean; base: string; staffBase: string; crumb: string;
  loadPrograms: () => Promise<any>;
} {
  const { user } = useAuth() as any;
  const { pathname } = useLocation();
  const staffBase = pathname.startsWith('/lect') ? '/lect' : pathname.startsWith('/super-admin') ? '/super-admin' : '/admin';
  const role: ReportsRole = user?.role === 'SUPER_ADMIN' ? 'sa' : user?.role === 'LECTURER' ? 'lecturer' : 'hod';
  return {
    api: role === 'sa' ? saReportsApi : role === 'lecturer' ? lecturerReportsApi : hodReportsApi,
    role,
    isSuper: role === 'sa',
    base: `${staffBase}/reports`,
    staffBase,
    crumb: role === 'sa' ? 'Super Admin' : role === 'lecturer' ? 'Lecturer' : 'Admin',
    loadPrograms: role === 'sa' ? saGetPrograms : getMyDepartmentPrograms,
  };
}

export const catalogQuery = (role: ReportsRole, api: ReportsApi) =>
  ({ queryKey: ['report-catalog', role], queryFn: api.catalog, staleTime: 5 * 60_000 });
