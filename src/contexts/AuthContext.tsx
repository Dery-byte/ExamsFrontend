import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authenticate as apiAuth, doLogout, getCurrentUser } from '../api/endpoints';

export type UserRole = 'ADMIN' | 'LECTURER' | 'NORMAL' | 'SUPER_ADMIN';

export interface AuthUser {
  id: number;
  username: string;
  email?: string;
  firstname?: string;
  lastname?: string;
  phone?: string;
  role: UserRole;
  enabled?: boolean;
  accountNonExpired?: boolean;
  accountNonLocked?: boolean;
  credentialsNonExpired?: boolean;
  authorities?: { authority: string }[];
  profilePicture?: string;
  bio?: string;
}

interface AuthCtx {
  user: AuthUser | null;
  isLoggedIn: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  getToken: () => string | null;
  isAdmin: () => boolean;
  isLecturer: () => boolean;
  isStudent: () => boolean;
  isSuperAdmin: () => boolean;
  timeDisplay: { display: string; className: string } | null;
  updateUser: (partial: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthCtx | null>(null);

function decodePayload(token: string): Record<string, any> | null {
  try { return JSON.parse(atob(token.split('.')[1])); } catch { return null; }
}
function msUntilExpiry(token: string): number {
  const p = decodePayload(token);
  if (!p?.exp) return -1;
  return p.exp * 1000 - Date.now();
}
function fmtCountdown(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const r = localStorage.getItem('user');
      if (!r) return null;
      const parsed = JSON.parse(r);
      // Normalize firstName/lastName → firstname/lastname (backend field name mismatch)
      if (parsed.firstName !== undefined && parsed.firstname === undefined) parsed.firstname = parsed.firstName;
      if (parsed.lastName  !== undefined && parsed.lastname  === undefined) parsed.lastname  = parsed.lastName;
      // Normalize authorities string → array if needed
      if (typeof parsed.authorities === 'string') {
        parsed.authorities = parsed.authorities.split(',').map((a: string) => ({ authority: a.trim() }));
      }
      return parsed;
    } catch { return null; }
  });
  const [timeDisplay, setTimeDisplay] = useState<{ display: string; className: string } | null>(null);
  const expiryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigate = useNavigate();

  const performLogout = useCallback(() => {
    if (expiryRef.current) clearTimeout(expiryRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    sessionStorage.clear();
    setUser(null);
    setTimeDisplay(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  const startCountdown = useCallback((token: string) => {
    if (expiryRef.current) clearTimeout(expiryRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    const ms = msUntilExpiry(token);
    if (ms <= 0) { performLogout(); return; }
    expiryRef.current = setTimeout(performLogout, ms);

    // Update display every second (mirrors TokenExpirationService countdown)
    countdownRef.current = setInterval(() => {
      const remaining = msUntilExpiry(token);
      if (remaining <= 0) { performLogout(); return; }
      const display = fmtCountdown(remaining);
      const className = remaining < 120_000 ? 'danger' : remaining < 300_000 ? 'warning' : '';
      setTimeDisplay({ display, className });
    }, 1000);
  }, [performLogout]);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token && user) startCountdown(token);
    return () => {
      if (expiryRef.current) clearTimeout(expiryRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []); // eslint-disable-line

  const login = useCallback(async (username: string, password: string) => {
    const resp = await apiAuth({ username, password });
    const token: string = resp.token;
    if (!token) throw new Error('No token');
    localStorage.setItem('access_token', token);

    // Fetch full user from /current-user (mirrors Angular LoginService.getCurrentUser)
    let authUser: AuthUser;
    try {
      authUser = await getCurrentUser();
    } catch {
      const payload = decodePayload(token);
      const authorities = (payload?.authorities as { authority: string }[]) ?? [];
      const roleRaw = resp.role ?? authorities[0]?.authority ?? 'NORMAL';
      const role = roleRaw.replace('ROLE_', '') as UserRole;
      authUser = {
        id: resp.userId ?? payload?.userId,
        username: resp.username ?? username,
        email: resp.email,
        firstname: resp.firstname,
        lastname: resp.lastname,
        role,
        authorities,
      };
    }

    // Ensure role is clean
    if (!authUser.role) {
      const auths = authUser.authorities ?? [];
      authUser.role = ((auths[0]?.authority ?? 'NORMAL').replace('ROLE_', '') as UserRole);
    }

    localStorage.setItem('user', JSON.stringify(authUser));
    setUser(authUser);
    startCountdown(token);

    if (authUser.role === 'SUPER_ADMIN') navigate('/super-admin', { replace: true });
    else if (authUser.role === 'ADMIN') navigate('/admin', { replace: true });
    else if (authUser.role === 'LECTURER') navigate('/lect', { replace: true });
    else navigate('/user-dashboard/user-dashboard', { replace: true });
  }, [navigate, startCountdown]);

  const logout = useCallback(() => {
    const token = localStorage.getItem('access_token');
    if (token) doLogout(token).catch(() => {});
    performLogout();
  }, [performLogout]);

  const updateUser = useCallback((partial: Partial<AuthUser>) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...partial };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{
      user, isLoggedIn: !!user && !!localStorage.getItem('access_token'),
      login, logout, getToken: () => localStorage.getItem('access_token'),
      isAdmin:      () => user?.role === 'ADMIN',
      isLecturer:   () => user?.role === 'LECTURER',
      isStudent:    () => user?.role === 'NORMAL',
      isSuperAdmin: () => user?.role === 'SUPER_ADMIN',
      timeDisplay,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}
