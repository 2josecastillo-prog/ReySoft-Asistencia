import { FormEvent, useState } from 'react';
import { ArrowRight, CalendarCheck, LockKeyhole, Phone, ShieldCheck, UserRoundCheck } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { extractError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { ProjectLogo } from '../components/ProjectLogo';
import loginImage from '../assets/login-school-hero.svg';

const loginHighlights = [
  { label: 'Centros activos', value: 'Acceso controlado', icon: ShieldCheck },
  { label: 'Asistencia', value: 'Registro diario', icon: CalendarCheck },
  { label: 'Usuarios', value: 'Roles definidos', icon: UserRoundCheck }
];

export function LoginPage() {
  const navigate = useNavigate();
  const { loading: authLoading, login, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await login(email, password);
      navigate(user.role === 'super_admin' ? '/admin' : '/dashboard', { replace: true });
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) return <div className="p-8 text-sm text-slate-600">Cargando...</div>;
  if (user) return <Navigate to={user.role === 'super_admin' ? '/admin' : '/dashboard'} replace />;

  return (
    <main className="min-h-screen bg-[#f7f8fa] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          <nav className="hidden items-center gap-5 md:flex">
            <Link to="/" className="hover:text-slate-950">Inicio</Link>
            <Link to="/parents/login" className="hover:text-slate-950">Padres</Link>
          </nav>
          <Link to="/" className="justify-self-center">
            <ProjectLogo className="h-9 w-auto" />
          </Link>
          <div className="justify-self-end">ESP / RD</div>
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-61px)] max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,460px)]">
        <div className="hidden min-w-0 lg:block">
          <div className="mb-4 flex items-center justify-between border-b border-slate-300 pb-3 text-[11px] uppercase tracking-wide text-slate-500">
            <span>Acceso / Panel escolar / Sesión segura</span>
            <span>JWT + roles</span>
          </div>
          <div className="border border-slate-200 bg-white">
            <img src={loginImage} alt="Aula preparada para gestión escolar" className="h-[420px] w-full object-cover" />
            <div className="grid gap-4 p-5 md:grid-cols-3">
              {loginHighlights.map(({ label, value, icon: Icon }) => (
                <div className="border border-slate-100 p-4" key={label}>
                  <Icon className="text-brand" size={24} />
                  <p className="mt-4 text-xs uppercase tracking-wide text-slate-500">{label}</p>
                  <p className="mt-2 text-sm font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <form className="self-start border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-8" onSubmit={onSubmit}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Panel institucional</p>
          <h1 className="mt-5 text-5xl font-semibold tracking-[-0.02em]">Iniciar sesión</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Acceso para superadministrador, administradores escolares y personal autorizado.
          </p>

          <div className="mt-8 grid gap-5">
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Correo electrónico
              <input
                className="form-input h-12"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Contraseña
              <input
                className="form-input h-12"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            {error && <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
            <button className="btn-primary h-12" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'} {!loading && <ArrowRight size={18} />}
            </button>
          </div>

          <div className="mt-6 grid gap-3 border-t border-slate-200 pt-5 text-sm">
            <Link className="flex items-center justify-between text-brand hover:opacity-80" to="/parents/login">
              <span className="inline-flex items-center gap-2 font-semibold">
                <Phone size={17} />
                Acceso para padres por teléfono
              </span>
              <ArrowRight size={16} />
            </Link>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <LockKeyhole size={15} />
              Sesión protegida con token, cookies seguras y control por rol.
            </div>
          </div>
        </form>
      </section>
    </main>
  );
}
