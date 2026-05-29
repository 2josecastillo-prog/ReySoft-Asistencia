import { api } from './api/client';

let reportsSent = 0;
const maxReportsPerPage = 5;

function safeMessage(value: unknown): string {
  if (value instanceof Error) return value.message || value.name;
  if (typeof value === 'string') return value;
  return 'Error de frontend no identificado';
}

function safeStack(value: unknown): string | undefined {
  return value instanceof Error ? value.stack : undefined;
}

function reportFrontendError(payload: {
  message: string;
  name?: string;
  stack?: string;
  source?: string;
  line?: number;
  column?: number;
}) {
  if (reportsSent >= maxReportsPerPage) return;
  reportsSent += 1;

  api.post('/monitoring/frontend-error', {
    ...payload,
    path: window.location.pathname,
    user_agent: window.navigator.userAgent,
    release: import.meta.env.VITE_APP_VERSION ?? 'local'
  }).catch(() => {
    // Monitoring must never affect the user-facing application.
  });
}

export function installFrontendMonitoring() {
  window.addEventListener('error', (event) => {
    reportFrontendError({
      message: event.message || safeMessage(event.error),
      name: event.error instanceof Error ? event.error.name : 'Error',
      stack: safeStack(event.error),
      source: event.filename,
      line: event.lineno,
      column: event.colno
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    reportFrontendError({
      message: safeMessage(event.reason),
      name: event.reason instanceof Error ? event.reason.name : 'UnhandledPromiseRejection',
      stack: safeStack(event.reason)
    });
  });
}
