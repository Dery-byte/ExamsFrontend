import { useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import {
  boardingReportsApi, financeReportsApi, getMyDepartmentPrograms, getPrograms, hodReportsApi, lecturerReportsApi, saGetPrograms, saReportsApi, type ReportsApi,
} from '../../../api/endpoints';

export type ReportsRole = 'sa' | 'hod' | 'lecturer' | 'boarding' | 'finance';

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
  // The accounts office: the fee reports
  if (user?.role === 'ACCOUNTANT') return {
    api: financeReportsApi, role: 'finance', isSuper: false, base: '/accounts/reports', staffBase: '/accounts', crumb: 'Accounts', loadPrograms: getPrograms,
  };
  // Boarding staff open the boarding reports from the Boarding pages, whatever their role
  if (pathname.startsWith(`${staffBase}/boarding/reports`)) return {
    api: boardingReportsApi, role: 'boarding', isSuper: false, base: `${staffBase}/boarding/reports`, staffBase, crumb: 'Boarding',
    loadPrograms: user?.role === 'SUPER_ADMIN' ? saGetPrograms : getPrograms,
  };
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
