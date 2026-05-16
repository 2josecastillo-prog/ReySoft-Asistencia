import { FormEvent, useEffect, useState } from 'react';
import { Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { api, extractError } from '../api/client';
import { EmptyState } from '../components/EmptyState';
import { User } from '../types';
import { userRoleLabels } from '../utils/labels';

const blankForm = { full_name: '', email: '', password: '', is_active: true };

export function StaffUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadUsers(searchValue = search) {
    setLoading(true);
    setError('');
    try {
      const normalizedSearch = searchValue.trim();
      const response = await api.get<User[]>('/users', {
        params: { role: 'staff', ...(normalizedSearch ? { search: normalizedSearch } : {}) }
      });
      setUsers(response.data);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      const payload = {
        full_name: form.full_name,
        email: form.email,
        ...(form.password ? { password: form.password } : {}),
        ...(editingId ? { is_active: form.is_active } : {})
      };
      if (editingId) await api.put(`/users/${editingId}`, payload);
      else await api.post('/users', { full_name: form.full_name, email: form.email, password: form.password });
      setForm(blankForm);
      setEditingId(null);
      setMessage(editingId ? 'Usuario actualizado.' : 'Usuario de personal creado.');
      await loadUsers();
    } catch (err) {
      setError(extractError(err));
    }
  }

  async function deactivateUser(id: string) {
    if (!confirm('¿Desactivar este usuario de personal?')) return;
    setError('');
    setMessage('');
    try {
      await api.delete(`/users/${id}`);
      setMessage('Usuario de personal desactivado.');
      await loadUsers();
    } catch (err) {
      setError(extractError(err));
    }
  }

  function editUser(user: User) {
    setEditingId(user.id);
    setForm({
      full_name: user.full_name,
      email: user.email,
      password: '',
      is_active: user.is_active
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(blankForm);
    setError('');
    setMessage('');
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      loadUsers(search);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [search]);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Personal</h2>
          <p className="mt-1 text-sm text-slate-500">Usuarios operativos del centro con permisos limitados.</p>
        </div>
        <input className="form-input max-w-xs" placeholder="Buscar personal" value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {message && <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}

      <form className="card grid gap-3 p-4 md:grid-cols-5" onSubmit={onSubmit}>
        <input className="form-input md:col-span-2" placeholder="Nombre completo" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
        <input className="form-input" placeholder="Correo electrónico" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <input className="form-input" placeholder={editingId ? 'Nueva contraseña opcional' : 'Contraseña'} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editingId} />
        <button className="btn-primary"><Plus size={16} />{editingId ? 'Guardar' : 'Crear personal'}</button>
        {editingId && (
          <div className="flex flex-wrap items-center gap-3 md:col-span-5">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              Usuario activo
            </label>
            <button className="btn-secondary" type="button" onClick={resetForm}><RotateCcw size={16} />Cancelar edición</button>
          </div>
        )}
      </form>

      <div className="card overflow-hidden">
        {loading ? <div className="p-4 text-sm text-slate-500">Cargando...</div> : users.length === 0 ? <EmptyState label="No hay personal" /> : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-500">
              <tr><th className="p-3">Nombre</th><th className="p-3">Correo</th><th className="p-3">Rol</th><th className="p-3">Estado</th><th className="p-3">Acciones</th></tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr className="border-t border-slate-100" key={user.id}>
                  <td className="p-3 font-medium">{user.full_name}</td>
                  <td className="p-3">{user.email}</td>
                  <td className="p-3">{userRoleLabels[user.role]}</td>
                  <td className="p-3">{user.is_active ? 'Activo' : 'Inactivo'}</td>
                  <td className="flex gap-2 p-3">
                    <button className="btn-secondary" onClick={() => editUser(user)}><Pencil size={16} /></button>
                    {user.is_active && <button className="btn-danger" onClick={() => deactivateUser(user.id)}><Trash2 size={16} /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
