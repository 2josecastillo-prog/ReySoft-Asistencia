import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { CalendarDays, Filter, LogOut, UsersRound } from 'lucide-react';
import { extractError, mediaUrl, parentApi } from '../api/client';
import { ProjectLogo } from '../components/ProjectLogo';
import { StatusBadge } from '../components/StatusBadge';
import { ParentAttendanceRecord, ParentGuardian, ParentStudent } from '../types';

function courseLabel(student: ParentStudent) {
  return [student.course_name, student.course_section, student.course_academic_year].filter(Boolean).join(' · ');
}

function formatTime(value?: string | null) {
  return value ? value.slice(0, 5) : 'Sin hora';
}

export function ParentPortalPage() {
  const navigate = useNavigate();
  const hasToken = Boolean(localStorage.getItem('reysoft_asistencia_parent_token'));
  const [guardian, setGuardian] = useState<ParentGuardian | null>(null);
  const [students, setStudents] = useState<ParentStudent[]>([]);
  const [attendance, setAttendance] = useState<ParentAttendanceRecord[]>([]);
  const [studentId, setStudentId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const params = useMemo(() => ({
    ...(studentId ? { student_id: studentId } : {}),
    ...(startDate ? { start_date: startDate } : {}),
    ...(endDate ? { end_date: endDate } : {})
  }), [studentId, startDate, endDate]);

  async function loadPortal() {
    setLoading(true);
    setError('');
    try {
      const [meResponse, studentsResponse, attendanceResponse] = await Promise.all([
        parentApi.get<ParentGuardian>('/parents/me'),
        parentApi.get<ParentStudent[]>('/parents/students'),
        parentApi.get<ParentAttendanceRecord[]>('/parents/attendance', { params })
      ]);
      setGuardian(meResponse.data);
      setStudents(studentsResponse.data);
      setAttendance(attendanceResponse.data);
    } catch (err) {
      localStorage.removeItem('reysoft_asistencia_parent_token');
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem('reysoft_asistencia_parent_token');
    navigate('/parents/login', { replace: true });
  }

  function onFilter(event: FormEvent) {
    event.preventDefault();
    loadPortal();
  }

  useEffect(() => {
    if (hasToken) loadPortal();
  }, []);

  if (!hasToken) return <Navigate to="/parents/login" replace />;

  return (
    <main className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-5 py-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {guardian?.organization.logo_url ? (
              <img src={mediaUrl(guardian.organization.logo_url)} alt={guardian.organization.name} className="h-12 w-12 rounded-md object-cover" />
            ) : (
              <ProjectLogo className="h-12 w-auto" variant="mark" />
            )}
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Portal de padres</p>
              <h1 className="text-xl font-semibold text-slate-950">{guardian?.organization.name ?? 'ReySoft-Asistencia'}</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link className="btn-secondary" to="/">Inicio</Link>
            <button className="btn-secondary" onClick={logout}><LogOut size={16} />Salir</button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-5 px-5 py-6">
        {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <section className="grid gap-4 md:grid-cols-[1fr_2fr]">
          <div className="card p-4">
            <p className="text-sm text-slate-500">Tutor</p>
            <h2 className="mt-1 text-lg font-semibold">{guardian?.full_name}</h2>
            <p className="mt-1 text-sm text-slate-600">{guardian?.phone}</p>
            {guardian?.relationship && <p className="mt-1 text-sm text-slate-600">{guardian.relationship}</p>}
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2">
              <UsersRound className="text-blue-600" size={20} />
              <h2 className="font-semibold">Estudiantes asociados</h2>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {students.map((student) => (
                <div className="rounded-md border border-slate-200 p-3" key={student.id}>
                  <p className="font-medium">{student.full_name}</p>
                  <p className="mt-1 text-sm text-slate-600">{courseLabel(student)}</p>
                  {student.student_code && <p className="mt-1 text-xs text-slate-500">Código: {student.student_code}</p>}
                </div>
              ))}
              {students.length === 0 && <p className="text-sm text-slate-500">No hay estudiantes asociados.</p>}
            </div>
          </div>
        </section>

        <form className="card grid gap-3 p-4 md:grid-cols-[1.4fr_1fr_1fr_auto]" onSubmit={onFilter}>
          <select className="form-input" value={studentId} onChange={(event) => setStudentId(event.target.value)}>
            <option value="">Todos los estudiantes</option>
            {students.map((student) => <option key={student.id} value={student.id}>{student.full_name}</option>)}
          </select>
          <input className="form-input" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} aria-label="Fecha inicial" />
          <input className="form-input" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} aria-label="Fecha final" />
          <button className="btn-primary"><Filter size={16} />Filtrar</button>
        </form>

        <section className="card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-200 p-4">
            <CalendarDays size={18} />
            <h2 className="font-semibold">Asistencia</h2>
          </div>
          {loading ? <div className="p-4 text-sm text-slate-500">Cargando...</div> : attendance.length === 0 ? (
            <div className="p-4 text-sm text-slate-500">No hay registros de asistencia para mostrar.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="p-3">Fecha</th>
                    <th className="p-3">Hora</th>
                    <th className="p-3">Estudiante</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3">Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((record) => (
                    <tr className="border-t border-slate-100" key={record.id}>
                      <td className="p-3">{record.attendance_date}</td>
                      <td className="p-3">{formatTime(record.display_time)}</td>
                      <td className="p-3 font-medium">{record.student_name}</td>
                      <td className="p-3"><StatusBadge value={record.status} /></td>
                      <td className="p-3 text-slate-600">{record.notes ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {guardian?.organization.footer_text && (
        <footer className="border-t border-slate-200 bg-white px-5 py-4 text-sm text-slate-600">
          <div className="mx-auto max-w-6xl">{guardian.organization.footer_text}</div>
        </footer>
      )}
    </main>
  );
}
