import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { Download, Plus, RotateCcw, Search, Star, Trash2, Upload, UserPlus, UsersRound, X } from 'lucide-react';
import { api, extractError } from '../api/client';
import { EmptyState } from '../components/EmptyState';
import { Course, Guardian, Student, StudentGuardianRelation } from '../types';
import { useAuth } from '../auth/AuthContext';

interface StudentFormState {
  first_name: string;
  middle_name: string;
  last_name: string;
  second_surname: string;
  student_code: string;
  course_id: string;
  guardian_ids: string[];
  primary_guardian_id: string;
}

const blankForm: StudentFormState = {
  first_name: '',
  middle_name: '',
  last_name: '',
  second_surname: '',
  student_code: '',
  course_id: '',
  guardian_ids: [],
  primary_guardian_id: ''
};

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
  const [form, setForm] = useState<StudentFormState>(blankForm);
  const [courseFilter, setCourseFilter] = useState('');
  const [search, setSearch] = useState('');
  const [guardianSearch, setGuardianSearch] = useState('');
  const [guardianRelationshipFilter, setGuardianRelationshipFilter] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [importInputKey, setImportInputKey] = useState(0);
  const [importing, setImporting] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentGuardians, setStudentGuardians] = useState<StudentGuardianRelation[]>([]);
  const [loadingStudentGuardians, setLoadingStudentGuardians] = useState(false);
  const [guardianToAssign, setGuardianToAssign] = useState('');
  const [assignAsPrimary, setAssignAsPrimary] = useState(false);

  const selectedGuardianIds = useMemo(() => new Set(form.guardian_ids), [form.guardian_ids]);
  const guardianRelationshipOptions = useMemo(
    () => Array.from(new Set(guardians.flatMap((guardian) => (guardian.relationship ? [guardian.relationship] : [])))).sort(),
    [guardians]
  );
  const visibleGuardiansForCreation = useMemo(() => {
    const normalizedSearch = guardianSearch.trim().toLowerCase();
    const normalizedPhoneSearch = normalizedSearch.replace(/\D/g, '');
    return guardians.filter((guardian) => {
      if (selectedGuardianIds.has(guardian.id)) return true;
      const matchesRelationship = guardianRelationshipFilter
        ? guardian.relationship === guardianRelationshipFilter
        : true;
      const matchesSearch = normalizedSearch
        ? [
          guardian.full_name,
          guardian.phone,
          guardian.relationship ?? ''
        ].some((value) => value.toLowerCase().includes(normalizedSearch))
          || (normalizedPhoneSearch ? guardian.phone.includes(normalizedPhoneSearch) : false)
        : true;
      return matchesRelationship && matchesSearch;
    });
  }, [guardianRelationshipFilter, guardianSearch, guardians, selectedGuardianIds]);
  const assignedGuardianIds = useMemo(
    () => new Set(studentGuardians.map((relation) => relation.guardian_id)),
    [studentGuardians]
  );
  const availableGuardiansToAssign = guardians.filter((guardian) => !assignedGuardianIds.has(guardian.id));

  function guardianName(id: string) {
    return guardians.find((guardian) => guardian.id === id)?.full_name ?? 'Tutor';
  }

  function guardianDetail(id: string) {
    const guardian = guardians.find((item) => item.id === id);
    return [guardian?.phone, guardian?.relationship].filter(Boolean).join(' · ');
  }

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

  async function loadStudentGuardians(student: Student) {
    setSelectedStudent(student);
    setLoadingStudentGuardians(true);
    setError('');
    try {
      const response = await api.get<StudentGuardianRelation[]>(`/students/${student.id}/guardians`);
      setStudentGuardians(response.data);
      setGuardianToAssign('');
      setAssignAsPrimary(false);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoadingStudentGuardians(false);
    }
  }

  function toggleGuardian(guardianId: string) {
    setForm((current) => {
      const exists = current.guardian_ids.includes(guardianId);
      const guardian_ids = exists
        ? current.guardian_ids.filter((id) => id !== guardianId)
        : [...current.guardian_ids, guardianId];
      const primary_guardian_id = guardian_ids.includes(current.primary_guardian_id)
        ? current.primary_guardian_id
        : guardian_ids[0] ?? '';
      return { ...current, guardian_ids, primary_guardian_id };
    });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (form.guardian_ids.length === 0) {
      setError('Selecciona al menos un tutor para el estudiante.');
      return;
    }
    try {
      await api.post('/students', {
        first_name: form.first_name,
        middle_name: form.middle_name || null,
        last_name: form.last_name,
        second_surname: form.second_surname || null,
        student_code: form.student_code || null,
        course_id: form.course_id,
        guardian_ids: form.guardian_ids,
        primary_guardian_id: form.primary_guardian_id || form.guardian_ids[0]
      });
      setForm(blankForm);
      await loadData();
      setMessage('Estudiante creado.');
    } catch (err) {
      setError(extractError(err));
    }
  }

  async function assignGuardian(event: FormEvent) {
    event.preventDefault();
    if (!selectedStudent || !guardianToAssign) return;
    setError('');
    setMessage('');
    try {
      await api.post(`/students/${selectedStudent.id}/guardians`, {
        guardian_id: guardianToAssign,
        is_primary: assignAsPrimary
      });
      await loadStudentGuardians(selectedStudent);
      setMessage('Tutor asignado al estudiante.');
    } catch (err) {
      setError(extractError(err));
    }
  }

  async function setPrimaryGuardian(guardianId: string) {
    if (!selectedStudent) return;
    setError('');
    setMessage('');
    try {
      await api.put(`/students/${selectedStudent.id}/guardians/${guardianId}/primary`);
      await loadStudentGuardians(selectedStudent);
      setMessage('Tutor principal actualizado.');
    } catch (err) {
      setError(extractError(err));
    }
  }

  async function removeStudentGuardian(guardianId: string) {
    if (!selectedStudent) return;
    if (studentGuardians.length <= 1) {
      setError('El estudiante debe conservar al menos un tutor asignado.');
      return;
    }
    if (!confirm('¿Quitar este tutor del estudiante?')) return;
    setError('');
    setMessage('');
    try {
      await api.delete(`/students/${selectedStudent.id}/guardians/${guardianId}`);
      await loadStudentGuardians(selectedStudent);
      setMessage('Tutor removido del estudiante.');
    } catch (err) {
      setError(extractError(err));
    }
  }

  async function removeStudent(id: string) {
    if (!confirm('¿Desactivar este estudiante?')) return;
    await api.delete(`/students/${id}`);
    if (selectedStudent?.id === id) {
      setSelectedStudent(null);
      setStudentGuardians([]);
    }
    await loadData();
  }

  async function reactivateStudent(student: Student) {
    if (!confirm('¿Reactivar este estudiante?')) return;
    setError('');
    setMessage('');
    try {
      const response = await api.post<Student>(`/students/${student.id}/reactivate`);
      if (selectedStudent?.id === student.id) {
        setSelectedStudent(response.data);
      }
      await loadData();
      setMessage('Estudiante reactivado.');
    } catch (err) {
      setError(extractError(err));
    }
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
        <form className="card grid gap-3 p-4 md:grid-cols-6" onSubmit={onSubmit}>
          <input className="form-input" placeholder="Primer nombre" value={form.first_name} onChange={(event) => setForm({ ...form, first_name: event.target.value })} required />
          <input className="form-input" placeholder="Segundo nombre" value={form.middle_name} onChange={(event) => setForm({ ...form, middle_name: event.target.value })} />
          <input className="form-input" placeholder="Primer apellido" value={form.last_name} onChange={(event) => setForm({ ...form, last_name: event.target.value })} required />
          <input className="form-input" placeholder="Segundo apellido" value={form.second_surname} onChange={(event) => setForm({ ...form, second_surname: event.target.value })} />
          <input className="form-input" placeholder="Código" value={form.student_code} onChange={(event) => setForm({ ...form, student_code: event.target.value })} />
          <select className="form-input" value={form.course_id} onChange={(event) => setForm({ ...form, course_id: event.target.value })} required>
            <option value="">Curso</option>
            {courses.map((course) => <option key={course.id} value={course.id}>{course.name} {course.section}</option>)}
          </select>

          <div className="md:col-span-6 rounded-md border border-slate-200 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                <UsersRound size={18} />
                Tutores del estudiante
              </div>
              <span className="text-xs font-medium text-slate-500">{form.guardian_ids.length} seleccionado(s)</span>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_240px]">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  className="form-input form-input-icon-left"
                  placeholder="Buscar tutor por nombre, teléfono o relación"
                  value={guardianSearch}
                  onChange={(event) => setGuardianSearch(event.target.value)}
                />
              </label>
              <select
                className="form-input"
                value={guardianRelationshipFilter}
                onChange={(event) => setGuardianRelationshipFilter(event.target.value)}
              >
                <option value="">Todas las relaciones</option>
                {guardianRelationshipOptions.map((relationship) => (
                  <option key={relationship} value={relationship}>{relationship}</option>
                ))}
              </select>
            </div>
            {guardians.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No hay tutores activos.</p>
            ) : visibleGuardiansForCreation.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No hay tutores que coincidan con la búsqueda.</p>
            ) : (
              <div className="mt-3 grid max-h-64 gap-2 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-3">
                {visibleGuardiansForCreation.map((guardian) => {
                  const selected = selectedGuardianIds.has(guardian.id);
                  return (
                    <label className="rounded-md border border-slate-200 p-3 text-sm" key={guardian.id}>
                      <span className="flex items-start gap-2">
                        <input
                          checked={selected}
                          className="mt-1"
                          onChange={() => toggleGuardian(guardian.id)}
                          type="checkbox"
                        />
                        <span className="grid gap-1">
                          <span className="font-medium text-slate-900">{guardian.full_name}</span>
                          <span className="text-xs text-slate-500">{guardian.phone}</span>
                        </span>
                      </span>
                      <span className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-600">
                        <input
                          checked={form.primary_guardian_id === guardian.id}
                          disabled={!selected}
                          name="primary_guardian_id"
                          onChange={() => setForm({ ...form, primary_guardian_id: guardian.id })}
                          type="radio"
                        />
                        Tutor principal
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <button className="btn-primary md:col-span-6"><Plus size={16} />Crear estudiante</button>
        </form>
      )}

      <div className="card overflow-hidden">
        {students.length === 0 ? <EmptyState label="No hay estudiantes" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                <tr>
                  <th className="p-3">Nombre</th>
                  <th className="p-3">Código</th>
                  <th className="p-3">Curso</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr className="border-t border-slate-100" key={student.id}>
                    <td className="p-3 font-medium">{student.full_name}</td>
                    <td className="p-3">{student.student_code}</td>
                    <td className="p-3">{courseName(student.course_id)}</td>
                    <td className="p-3">{student.is_active ? 'Activo' : 'Inactivo'}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <button className="btn-secondary" onClick={() => loadStudentGuardians(student)} type="button">
                          <UsersRound size={16} />
                          Tutores
                        </button>
                        {canEdit && (
                          student.is_active ? (
                            <button className="btn-danger" onClick={() => removeStudent(student.id)} type="button">
                              <Trash2 size={16} />
                              Desactivar
                            </button>
                          ) : (
                            <button className="btn-secondary" onClick={() => reactivateStudent(student)} type="button">
                              <RotateCcw size={16} />
                              Reactivar
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedStudent && (
        <section className="card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">Tutores asociados</p>
              <h3 className="text-lg font-semibold text-slate-950">{selectedStudent.full_name}</h3>
            </div>
            <button className="btn-secondary" onClick={() => setSelectedStudent(null)} type="button">
              <X size={16} />
              Cerrar
            </button>
          </div>

          {loadingStudentGuardians ? (
            <p className="mt-4 text-sm text-slate-500">Cargando tutores...</p>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {studentGuardians.map((relation) => (
                <div className="rounded-md border border-slate-200 p-3" key={relation.id}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-950">{guardianName(relation.guardian_id)}</p>
                      <p className="mt-1 text-sm text-slate-500">{guardianDetail(relation.guardian_id)}</p>
                    </div>
                    {relation.is_primary && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                        <Star size={13} />
                        Principal
                      </span>
                    )}
                  </div>
                  {canEdit && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {!relation.is_primary && (
                        <button className="btn-secondary" onClick={() => setPrimaryGuardian(relation.guardian_id)} type="button">
                          <Star size={16} />
                          Hacer principal
                        </button>
                      )}
                      <button
                        className="btn-danger"
                        disabled={studentGuardians.length <= 1}
                        onClick={() => removeStudentGuardian(relation.guardian_id)}
                        type="button"
                      >
                        <Trash2 size={16} />
                        Quitar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {canEdit && (
            <form className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto]" onSubmit={assignGuardian}>
              <select className="form-input" value={guardianToAssign} onChange={(event) => setGuardianToAssign(event.target.value)} required>
                <option value="">Agregar otro tutor</option>
                {availableGuardiansToAssign.map((guardian) => (
                  <option key={guardian.id} value={guardian.id}>{guardian.full_name}</option>
                ))}
              </select>
              <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
                <input checked={assignAsPrimary} onChange={(event) => setAssignAsPrimary(event.target.checked)} type="checkbox" />
                Principal
              </label>
              <button className="btn-primary" disabled={!guardianToAssign || availableGuardiansToAssign.length === 0} type="submit">
                <UserPlus size={16} />
                Asignar tutor
              </button>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
