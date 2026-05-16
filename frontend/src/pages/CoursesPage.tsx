import { FormEvent, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api, extractError } from '../api/client';
import { EmptyState } from '../components/EmptyState';
import { Course } from '../types';
import { useAuth } from '../auth/AuthContext';

const blankForm = { name: '', section: '', academic_year: '', is_active: true };

export function CoursesPage() {
  const { user } = useAuth();
  const canEdit = user?.role === 'school_admin';
  const [courses, setCourses] = useState<Course[]>([]);
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadCourses() {
    setLoading(true);
    try {
      const response = await api.get<Course[]>('/courses', { params: search ? { search } : undefined });
      setCourses(response.data);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      if (editingId) await api.put(`/courses/${editingId}`, form);
      else await api.post('/courses', form);
      setForm(blankForm);
      setEditingId(null);
      await loadCourses();
    } catch (err) {
      setError(extractError(err));
    }
  }

  async function removeCourse(id: string) {
    if (!confirm('¿Desactivar este curso?')) return;
    await api.delete(`/courses/${id}`);
    await loadCourses();
  }

  useEffect(() => {
    loadCourses();
  }, []);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Cursos</h2>
        <input className="form-input max-w-xs" placeholder="Buscar curso" value={search} onChange={(event) => setSearch(event.target.value)} onBlur={loadCourses} />
      </div>
      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {canEdit && (
        <form className="card grid gap-3 p-4 md:grid-cols-5" onSubmit={onSubmit}>
          <input className="form-input md:col-span-2" placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="form-input" placeholder="Sección" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} />
          <input className="form-input" placeholder="Año escolar" value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} />
          <button className="btn-primary"><Plus size={16} />{editingId ? 'Guardar' : 'Crear'}</button>
        </form>
      )}
      <div className="card overflow-hidden">
        {loading ? <div className="p-4 text-sm text-slate-500">Cargando...</div> : courses.length === 0 ? <EmptyState label="No hay cursos" /> : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-500">
              <tr><th className="p-3">Nombre</th><th className="p-3">Sección</th><th className="p-3">Año</th><th className="p-3">Estado</th><th className="p-3">Acciones</th></tr>
            </thead>
            <tbody>
              {courses.map((course) => (
                <tr className="border-t border-slate-100" key={course.id}>
                  <td className="p-3 font-medium">{course.name}</td>
                  <td className="p-3">{course.section}</td>
                  <td className="p-3">{course.academic_year}</td>
                  <td className="p-3">{course.is_active ? 'Activo' : 'Inactivo'}</td>
                  <td className="flex gap-2 p-3">
                    {canEdit && <button className="btn-secondary" onClick={() => { setEditingId(course.id); setForm({ name: course.name, section: course.section ?? '', academic_year: course.academic_year ?? '', is_active: course.is_active }); }}><Pencil size={16} /></button>}
                    {canEdit && <button className="btn-danger" onClick={() => removeCourse(course.id)}><Trash2 size={16} /></button>}
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
