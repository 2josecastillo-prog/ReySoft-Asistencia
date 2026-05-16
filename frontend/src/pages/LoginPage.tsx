import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { extractError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { ProjectLogo } from '../components/ProjectLogo';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
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

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <form className="card w-full max-w-md p-6" onSubmit={onSubmit}>
        <Link to="/" className="inline-flex">
          <ProjectLogo className="h-12 w-auto" />
        </Link>
        <h1 className="mt-4 text-2xl font-semibold">Iniciar sesión</h1>
        <div className="mt-6 grid gap-4">
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Correo electrónico
            <input className="form-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Contraseña
            <input className="form-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <button className="btn-primary" disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button>
          <Link className="text-sm font-semibold text-blue-700 hover:text-blue-800" to="/parents/login">
            Acceso para padres por teléfono
          </Link>
        </div>
      </form>
    </main>
  );
}
