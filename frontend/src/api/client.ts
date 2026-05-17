import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? '/api' : 'http://localhost:8000');

export const api = axios.create({ baseURL, withCredentials: true });

export const parentApi = axios.create({ baseURL, withCredentials: true });

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
