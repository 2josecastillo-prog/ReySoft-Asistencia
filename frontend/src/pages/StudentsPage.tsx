import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { Download, Plus, Trash2, Upload } from 'lucide-react';
import { api, extractError } from '../api/client';
import { EmptyState } from '../components/EmptyState';
import { Course, Guardian, Student } from '../types';
import { useAuth } from '../auth/AuthContext';

const blankForm = { full_name: '', student_code: '', course_id: '', guardian_id: '', primary_guardian_id: '' };

interface StudentImportResponse {
  created: number;
  updated: number;
  errors: string[];
}

export function StudentsPage() {
  const { user } = useAuth();
  const canEdit = user?.role === 'school_admin';
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [form, setForm] = useState(blankForm);
  const [courseFilter, setCourseFilter] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [importInputKey, setImportInputKey] = useState(0);
  const [importing, setImporting] = useState(false);

  async function loadData() {
    try {
      const [studentsResponse, coursesResponse, guardiansResponse] = await Promise.all([
        api.get<Student[]>('/students', { params: { ...(search ? { search } : {}), ...(courseFilter ? { course_id: courseFilter } : {}) } }),
        api.get<Course[]>('/courses', { params: { is_active: true } }),
        api.get<Guardian[]>('/guardians', { params: { is_active: true } })
      ]);
      setStudents(studentsResponse.data);
      setCourses(coursesResponse.data);
      setGuardians(guardiansResponse.data);
    } catch (err) {
      setError(extractError(err));
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await api.post('/students', {
        full_name: form.full_name,
        student_code: form.student_code || null,
        course_id: form.course_id,
        guardian_ids: [form.guardian_id],
        primary_guardian_id: form.primary_guardian_id || form.guardian_id
      });
      setForm(blankForm);
      await loadData();
      setMessage('Estudiante creado.');
    } catch (err) {
      setError(extractError(err));
    }
  }

  async function removeStudent(id: string) {
    if (!confirm('¿Desactivar este estudiante?')) return;
    await api.delete(`/students/${id}`);
    await loadData();
  }

  async function exportStudents(fileFormat: 'xlsx' | 'csv') {
    setError('');
    try {
      const response = await api.get('/students/export', {
        params: { file_format: fileFormat },
        responseType: 'blob'
      });
      const blob = new Blob([response.data], {
        type: fileFormat === 'csv'
          ? 'text/csv;charset=utf-8'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileFormat === 'csv' ? 'estudiantes.csv' : 'estudiantes.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(extractError(err));
    }
  }

  async function importStudents(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setError('');
    setMessage('');
    try {
      const data = new FormData();
      data.append('file', file);
      const response = await api.post<StudentImportResponse>('/students/import', data);
      const summary = `Importación completada: ${response.data.created} creados, ${response.data.updated} actualizados.`;
      setMessage(response.data.errors.length ? `${summary} ${response.data.errors.join(' ')}` : summary);
      await loadData();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setImporting(false);
      setImportInputKey((value) => value + 1);
    }
  }

  useEffect(() => {
    loadData();
  }, [courseFilter]);

  const courseName = (id: string) => courses.find((course) => course.id === id)?.name ?? 'Curso';

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Estudiantes</h2>
          <p className="mt-1 text-sm text-slate-500">Exporta el archivo actual para usarlo como plantilla de importación.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" type="button" onClick={() => exportStudents('xlsx')}>
            <Download size={16} />
            Exportar Excel
          </button>
          <button className="btn-secondary" type="button" onClick={() => exportStudents('csv')}>
            <Download size={16} />
            Exportar CSV
          </button>
          {canEdit && (
            <label className="btn-secondary cursor-pointer">
              <Upload size={16} />
              {importing ? 'Importando...' : 'Importar archivo'}
              <input
                key={importInputKey}
                className="hidden"
                type="file"
                accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                onChange={importStudents}
                disabled={importing}
              />
            </label>
          )}
          <input className="form-input max-w-xs" placeholder="Buscar estudiante" value={search} onChange={(event) => setSearch(event.target.value)} onBlur={loadData} />
          <select className="form-input max-w-xs" value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)}>
            <option value="">Todos los cursos</option>
            {courses.map((course) => <option key={course.id} value={course.id}>{course.name} {course.section}</option>)}
          </select>
        </div>
      </div>
      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {message && <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}
      {canEdit && (
        <form className="card grid gap-3 p-4 md:grid-cols-5" onSubmit={onSubmit}>
          <input className="form-input md:col-span-2" placeholder="Nombre completo" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
          <input className="form-input" placeholder="Código" value={form.student_code} onChange={(e) => setForm({ ...form, student_code: e.target.value })} />
          <select className="form-input" value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })} required>
            <option value="">Curso</option>
            {courses.map((course) => <option key={course.id} value={course.id}>{course.name} {course.section}</option>)}
          </select>
          <select className="form-input" value={form.guardian_id} onChange={(e) => setForm({ ...form, guardian_id: e.target.value, primary_guardian_id: e.target.value })} required>
            <option value="">Tutor principal</option>
            {guardians.map((guardian) => <option key={guardian.id} value={guardian.id}>{guardian.full_name}</option>)}
          </select>
          <button className="btn-primary md:col-span-5"><Plus size={16} />Crear estudiante</button>
        </form>
      )}
      <div className="card overflow-hidden">
        {students.length === 0 ? <EmptyState label="No hay estudiantes" /> : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-500">
              <tr><th className="p-3">Nombre</th><th className="p-3">Código</th><th className="p-3">Curso</th><th className="p-3">Estado</th><th className="p-3">Acciones</th></tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr className="border-t border-slate-100" key={student.id}>
                  <td className="p-3 font-medium">{student.full_name}</td>
                  <td className="p-3">{student.student_code}</td>
                  <td className="p-3">{courseName(student.course_id)}</td>
                  <td className="p-3">{student.is_active ? 'Activo' : 'Inactivo'}</td>
                  <td className="p-3">{canEdit && <button className="btn-danger" onClick={() => removeStudent(student.id)}><Trash2 size={16} /></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
