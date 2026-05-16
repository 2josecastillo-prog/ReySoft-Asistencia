import { FormEvent, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api, extractError } from '../api/client';
import { EmptyState } from '../components/EmptyState';
import { Guardian } from '../types';
import { useAuth } from '../auth/AuthContext';

const blankForm = { full_name: '', phone: '', relationship: '', is_active: true };

export function GuardiansPage() {
  const { user } = useAuth();
  const canEdit = user?.role === 'school_admin';
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  async function loadGuardians(searchValue = search) {
    try {
      const normalizedSearch = searchValue.trim();
      const response = await api.get<Guardian[]>('/guardians', { params: normalizedSearch ? { search: normalizedSearch } : undefined });
      setGuardians(response.data);
    } catch (err) {
      setError(extractError(err));
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      if (editingId) await api.put(`/guardians/${editingId}`, form);
      else await api.post('/guardians', form);
      setForm(blankForm);
      setEditingId(null);
      await loadGuardians();
    } catch (err) {
      setError(extractError(err));
    }
  }

  async function removeGuardian(id: string) {
    if (!confirm('¿Desactivar este tutor?')) return;
    await api.delete(`/guardians/${id}`);
    await loadGuardians();
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      loadGuardians(search);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [search]);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Tutores</h2>
        <input className="form-input max-w-xs" placeholder="Buscar tutor" value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>
      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {canEdit && (
        <form className="card grid gap-3 p-4 md:grid-cols-5" onSubmit={onSubmit}>
          <input className="form-input md:col-span-2" placeholder="Nombre completo" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
          <input className="form-input" placeholder="Teléfono" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          <input className="form-input" placeholder="Relación" value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} />
          <button className="btn-primary"><Plus size={16} />{editingId ? 'Guardar' : 'Crear'}</button>
        </form>
      )}
      <div className="card overflow-hidden">
        {guardians.length === 0 ? <EmptyState label="No hay tutores" /> : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-500">
              <tr><th className="p-3">Nombre</th><th className="p-3">Teléfono</th><th className="p-3">Relación</th><th className="p-3">Estado</th><th className="p-3">Acciones</th></tr>
            </thead>
            <tbody>
              {guardians.map((guardian) => (
                <tr className="border-t border-slate-100" key={guardian.id}>
                  <td className="p-3 font-medium">{guardian.full_name}</td>
                  <td className="p-3">{guardian.phone}</td>
                  <td className="p-3">{guardian.relationship}</td>
                  <td className="p-3">{guardian.is_active ? 'Activo' : 'Inactivo'}</td>
                  <td className="flex gap-2 p-3">
                    {canEdit && <button className="btn-secondary" onClick={() => { setEditingId(guardian.id); setForm({ full_name: guardian.full_name, phone: guardian.phone, relationship: guardian.relationship ?? '', is_active: guardian.is_active }); }}><Pencil size={16} /></button>}
                    {canEdit && <button className="btn-danger" onClick={() => removeGuardian(guardian.id)}><Trash2 size={16} /></button>}
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
