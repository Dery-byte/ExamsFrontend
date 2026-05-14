import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

export const BASE_URL: string =
  (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:9191/api/v1/auth';

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

// Auto-logout on 401
client.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
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
