import axios, { AxiosHeaders, InternalAxiosRequestConfig } from 'axios';

const baseURL = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? '/api' : 'http://localhost:8000');
const csrfCookieName = 'reysoft_asistencia_csrf_token';
const csrfHeaderName = 'X-CSRF-Token';
const unsafeMethods = new Set(['post', 'put', 'patch', 'delete']);

export const api = axios.create({ baseURL, withCredentials: true });

export const parentApi = axios.create({ baseURL, withCredentials: true });

function readCookie(name: string): string {
  const cookie = document.cookie
    .split('; ')
    .find((item) => item.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : '';
}

function attachCsrfToken(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  const method = config.method?.toLowerCase();
  if (!method || !unsafeMethods.has(method)) return config;

  const csrfToken = readCookie(csrfCookieName);
  if (!csrfToken) return config;

  if (config.headers instanceof AxiosHeaders) {
    config.headers.set(csrfHeaderName, csrfToken);
  } else {
    config.headers = new AxiosHeaders(config.headers);
    config.headers.set(csrfHeaderName, csrfToken);
  }
  return config;
}

api.interceptors.request.use(attachCsrfToken);
parentApi.interceptors.request.use(attachCsrfToken);

export function extractError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return 'Revisa los campos del formulario.';
  }
  return 'Ocurrió un error inesperado.';
}

export function mediaUrl(value?: string | null): string {
  if (!value) return '';
  if (/^(https?:|data:|blob:)/.test(value)) return value;
  const apiBaseUrl = api.defaults.baseURL ?? '';
  return `${apiBaseUrl.replace(/\/$/, '')}/${value.replace(/^\//, '')}`;
}
