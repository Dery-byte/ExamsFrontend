import { useLocation } from 'react-router-dom';

/**
 * Base path of the staff area the current page is shown in. The quiz pages are shared by the HOD
 * area (/admin) and the Super Admin area (/super-admin); their links must stay in the same area.
 */
export function useStaffBase(): '/super-admin' | '/admin' {
  return useLocation().pathname.startsWith('/super-admin') ? '/super-admin' : '/admin';
}
