import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Phone } from 'lucide-react';
import { extractError, parentApi } from '../api/client';
import { ProjectLogo } from '../components/ProjectLogo';
import { ParentLoginResponse } from '../types';

export function ParentLoginPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await parentApi.post<ParentLoginResponse>('/parents/login', { phone });
      localStorage.setItem('reysoft_asistencia_parent_token', response.data.access_token);
      navigate('/parents', { replace: true });
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
        <h1 className="mt-4 text-2xl font-semibold">Acceso para padres</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Ingresa con el número de teléfono registrado por el centro educativo.
        </p>
        <div className="mt-6 grid gap-4">
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Teléfono
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                className="form-input pl-10"
                inputMode="tel"
                placeholder="(809) 555-1234"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
              />
            </div>
          </label>
          {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <button className="btn-primary" disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button>
          <Link className="text-sm font-semibold text-blue-700 hover:text-blue-800" to="/login">
            Soy usuario del centro educativo
          </Link>
        </div>
      </form>
    </main>
  );
}
