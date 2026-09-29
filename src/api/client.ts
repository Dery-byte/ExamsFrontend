import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { tx } from '../utils/terms';

export const BASE_URL: string =
  (import.meta as any).env?.VITE_API_URL ?? 'https://examsbackend.onrender.com/api/v1/auth';

const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT on every request (mirrors Angular AuthInterceptor)
client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401; send users who still have a staff-set password to /change-password
// Server messages are written in university words; show them in the system mode's words
const translateMessage = (data: any) => {
  if (data && typeof data === 'object' && typeof data.message === 'string') data.message = tx(data.message);
};

client.interceptors.response.use(
  (res) => { translateMessage(res.data); return res; },
  (err: AxiosError) => {
    translateMessage(err.response?.data);
    if (err.response?.status === 403 && (err.response.data as any)?.code === 'PASSWORD_CHANGE_REQUIRED') {
      try {
        const u = JSON.parse(localStorage.getItem('user') || 'null');
        if (u) localStorage.setItem('user', JSON.stringify({ ...u, mustChangePassword: true }));
      } catch { /* ignore */ }
      if (window.location.pathname !== '/change-password') window.location.href = '/change-password';
    }
    if (err.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      sessionStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export default client;
