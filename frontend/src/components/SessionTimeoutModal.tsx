import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Clock, LogIn } from 'lucide-react';
import { parentApi } from '../api/client';
import { useAuth } from '../auth/AuthContext';

const configuredTimeoutMinutes = Number(import.meta.env.VITE_INACTIVITY_TIMEOUT_MINUTES);
const inactivityTimeoutMs =
  Number.isFinite(configuredTimeoutMinutes) && configuredTimeoutMinutes > 0
    ? configuredTimeoutMinutes * 60 * 1000
    : 15 * 60 * 1000;

const activityEvents = ['keydown', 'mousedown', 'mousemove', 'scroll', 'touchstart', 'pointerdown'] as const;

type ExpiredSession = 'school' | 'parent';

export function SessionTimeoutModal() {
  const { loading, logout, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [expiredSession, setExpiredSession] = useState<ExpiredSession | null>(null);

  const expireSchoolSession = useCallback(async () => {
    await logout();
    setExpiredSession('school');
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  const expireParentSession = useCallback(async () => {
    try {
      await parentApi.post('/parents/logout');
    } finally {
      localStorage.removeItem('reysoft_asistencia_parent_token');
      localStorage.removeItem('reysoft_asistencia_parent_session');
      setExpiredSession('parent');
      navigate('/parents/login', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (loading || !user || expiredSession) return undefined;

    let timeoutId = window.setTimeout(() => {
      void expireSchoolSession();
    }, inactivityTimeoutMs);

    function resetTimer() {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        void expireSchoolSession();
      }, inactivityTimeoutMs);
    }

    activityEvents.forEach((eventName) => window.addEventListener(eventName, resetTimer, { passive: true }));

    return () => {
      window.clearTimeout(timeoutId);
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, resetTimer));
    };
  }, [expiredSession, expireSchoolSession, loading, user]);

  useEffect(() => {
    const hasParentSession = Boolean(localStorage.getItem('reysoft_asistencia_parent_session'));
    if (expiredSession || location.pathname !== '/parents' || !hasParentSession) return undefined;

    let timeoutId = window.setTimeout(() => {
      void expireParentSession();
    }, inactivityTimeoutMs);

    function resetTimer() {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        void expireParentSession();
      }, inactivityTimeoutMs);
    }

    activityEvents.forEach((eventName) => window.addEventListener(eventName, resetTimer, { passive: true }));

    return () => {
      window.clearTimeout(timeoutId);
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, resetTimer));
    };
  }, [expiredSession, expireParentSession, location.pathname]);

  useEffect(() => {
    if (expiredSession === 'school' && user) setExpiredSession(null);
    if (
      expiredSession === 'parent' &&
      location.pathname === '/parents' &&
      localStorage.getItem('reysoft_asistencia_parent_session')
    ) {
      setExpiredSession(null);
    }
  }, [expiredSession, location.pathname, user]);

  if (!expiredSession) return null;

  const loginPath = expiredSession === 'parent' ? '/parents/login' : '/login';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm">
      <section
        aria-labelledby="session-timeout-title"
        aria-modal="true"
        className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-5 text-center shadow-xl"
        role="dialog"
      >
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-700">
          <Clock size={22} />
        </div>
        <h2 id="session-timeout-title" className="mt-4 text-lg font-semibold text-slate-950">
          Sesion cerrada por inactividad
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Para proteger la informacion, vuelve a iniciar sesion y continua trabajando.
        </p>
        <Link
          className="btn-primary mt-5 w-full"
          onClick={() => setExpiredSession(null)}
          replace
          to={loginPath}
        >
          <LogIn size={16} />
          Volver a iniciar sesion
        </Link>
      </section>
    </div>
  );
}
