import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, Filter, GraduationCap } from 'lucide-react';
import { api, extractError } from '../api/client';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge } from '../components/StatusBadge';
import { AttendanceCourseReport, AttendanceReportRecord, AttendanceRiskLevel, AttendanceStudentReport, Course } from '../types';

const riskLabels: Record<AttendanceRiskLevel, string> = {
  ok: 'Bajo',
  warning: 'Atención',
  danger: 'Alto'
};

const riskClasses: Record<AttendanceRiskLevel, string> = {
  ok: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-800 ring-amber-200',
  danger: 'bg-red-50 text-red-700 ring-red-200'
};

function riskBadge(level: AttendanceRiskLevel) {
  return <span className={`rounded-full px-2 py-1 text-xs font-semibold ring-1 ${riskClasses[level]}`}>{riskLabels[level]}</span>;
}

function courseLabel(course: Pick<Course, 'name' | 'section' | 'academic_year'>) {
  return [course.name, course.section, course.academic_year].filter(Boolean).join(' · ');
}

function formatTime(value?: string | null) {
  if (!value) return 'Sin hora';
  return value.slice(0, 5);
}

function recordDetails(records: AttendanceReportRecord[], showStudent = false) {
  if (records.length === 0) return <span className="text-xs text-slate-400">Sin registros</span>;
  return (
    <div className="flex max-w-xl flex-wrap gap-2">
      {records.map((record) => (
        <div className="rounded-md border border-slate-200 bg-white px-2 py-1 shadow-sm" key={record.id}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">{record.attendance_date}</span>
            <span className="text-xs text-slate-500">{formatTime(record.display_time)}</span>
            <StatusBadge value={record.status} />
          </div>
          {showStudent && <p className="mt-1 text-xs text-slate-500">{record.student_name}</p>}
        </div>
      ))}
    </div>
  );
}

export function ReportsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [studentRows, setStudentRows] = useState<AttendanceStudentReport[]>([]);
  const [courseRows, setCourseRows] = useState<AttendanceCourseReport[]>([]);
  const [view, setView] = useState<'students' | 'courses'>('students');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [courseId, setCourseId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const params = useMemo(() => ({
    ...(startDate ? { start_date: startDate } : {}),
    ...(endDate ? { end_date: endDate } : {}),
    ...(courseId ? { course_id: courseId } : {})
  }), [startDate, endDate, courseId]);

  async function loadReports() {
    setLoading(true);
    setError('');
    try {
      const [coursesResponse, studentsResponse, coursesReportResponse] = await Promise.all([
        api.get<Course[]>('/courses', { params: { is_active: true } }),
        api.get<AttendanceStudentReport[]>('/reports/attendance/students', { params }),
        api.get<AttendanceCourseReport[]>('/reports/attendance/courses', { params })
      ]);
      setCourses(coursesResponse.data);
      setStudentRows(studentsResponse.data);
      setCourseRows(coursesReportResponse.data);
    } catch (err) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  const totals = studentRows.reduce(
    (acc, row) => ({
      equivalentAbsences: acc.equivalentAbsences + row.equivalent_absences,
      excuseConversions: acc.excuseConversions + row.excused_absence_equivalent,
      warningStudents: acc.warningStudents + (row.risk_level === 'warning' ? 1 : 0),
      dangerStudents: acc.dangerStudents + (row.risk_level === 'danger' ? 1 : 0)
    }),
    { equivalentAbsences: 0, excuseConversions: 0, warningStudents: 0, dangerStudents: 0 }
  );

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Reportes de asistencia</h2>
          <p className="mt-1 text-sm text-slate-500">Cada 3 excusas cuentan como 1 ausencia equivalente.</p>
        </div>
        <div className="inline-flex rounded-md border border-slate-200 bg-white p-1">
          <button className={`rounded px-3 py-1.5 text-sm font-semibold ${view === 'students' ? 'bg-slate-900 text-white' : 'text-slate-600'}`} onClick={() => setView('students')}>
            Por estudiante
          </button>
          <button className={`rounded px-3 py-1.5 text-sm font-semibold ${view === 'courses' ? 'bg-slate-900 text-white' : 'text-slate-600'}`} onClick={() => setView('courses')}>
            Por curso
          </button>
        </div>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <form className="card grid gap-3 p-4 md:grid-cols-[1fr_1fr_1.4fr_auto]" onSubmit={(event) => { event.preventDefault(); loadReports(); }}>
        <input className="form-input" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} aria-label="Fecha inicial" />
        <input className="form-input" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} aria-label="Fecha final" />
        <select className="form-input" value={courseId} onChange={(event) => setCourseId(event.target.value)}>
          <option value="">Todos los cursos</option>
          {courses.map((course) => <option key={course.id} value={course.id}>{courseLabel(course)}</option>)}
        </select>
        <button className="btn-primary"><Filter size={16} />Filtrar</button>
      </form>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="card p-4">
          <p className="text-sm text-slate-500">Ausencias equivalentes</p>
          <p className="mt-2 text-3xl font-semibold">{totals.equivalentAbsences}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-slate-500">Conversiones por excusas</p>
          <p className="mt-2 text-3xl font-semibold">{totals.excuseConversions}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-slate-500">Estudiantes en atención</p>
          <p className="mt-2 text-3xl font-semibold text-amber-700">{totals.warningStudents}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-slate-500">Estudiantes en riesgo alto</p>
          <p className="mt-2 text-3xl font-semibold text-red-700">{totals.dangerStudents}</p>
        </div>
      </section>

      {view === 'students' ? (
        <section className="card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-200 p-4">
            <GraduationCap size={18} />
            <h3 className="font-semibold">Reporte por estudiante</h3>
          </div>
          {loading ? <div className="p-4 text-sm text-slate-500">Cargando...</div> : studentRows.length === 0 ? <EmptyState label="Sin asistencia para reportar" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="p-3">Estudiante</th>
                    <th className="p-3">Curso</th>
                    <th className="p-3">Ausencias eq.</th>
                    <th className="p-3">Ausencias</th>
                    <th className="p-3">Excusas</th>
                    <th className="p-3">Tardes</th>
                    <th className="p-3">Nivel</th>
                    <th className="p-3">Fechas, horas y estados</th>
                  </tr>
                </thead>
                <tbody>
                  {studentRows.map((row) => (
                    <tr className="border-t border-slate-100 align-top" key={row.student_id}>
                      <td className="p-3 font-medium">
                        {row.student_name}
                        {row.student_code && <span className="ml-2 text-xs text-slate-500">{row.student_code}</span>}
                      </td>
                      <td className="p-3">{courseLabel({ name: row.course_name, section: row.course_section, academic_year: row.course_academic_year })}</td>
                      <td className="p-3 font-semibold">{row.equivalent_absences}</td>
                      <td className="p-3">{row.absent_count}</td>
                      <td className="p-3">{row.excused_count}</td>
                      <td className="p-3">{row.late_count}</td>
                      <td className="p-3">{riskBadge(row.risk_level)}</td>
                      <td className="p-3">{recordDetails(row.records)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
        <section className="card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-200 p-4">
            <BarChart3 size={18} />
            <h3 className="font-semibold">Reporte por curso</h3>
          </div>
          {loading ? <div className="p-4 text-sm text-slate-500">Cargando...</div> : courseRows.length === 0 ? <EmptyState label="Sin cursos para reportar" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="p-3">Curso</th>
                    <th className="p-3">Estudiantes</th>
                    <th className="p-3">Ausencias eq.</th>
                    <th className="p-3">Ausencias</th>
                    <th className="p-3">Excusas</th>
                    <th className="p-3">Atención</th>
                    <th className="p-3">Riesgo alto</th>
                    <th className="p-3">Fechas, horas y estados</th>
                  </tr>
                </thead>
                <tbody>
                  {courseRows.map((row) => (
                    <tr className="border-t border-slate-100 align-top" key={row.course_id}>
                      <td className="p-3 font-medium">{courseLabel({ name: row.course_name, section: row.course_section, academic_year: row.course_academic_year })}</td>
                      <td className="p-3">{row.student_count}</td>
                      <td className="p-3 font-semibold">{row.equivalent_absences}</td>
                      <td className="p-3">{row.absent_count}</td>
                      <td className="p-3">{row.excused_count}</td>
                      <td className="p-3 text-amber-700">{row.warning_students}</td>
                      <td className="p-3 text-red-700">{row.danger_students}</td>
                      <td className="p-3">{recordDetails(row.records, true)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
        <AlertTriangle className="mr-2 inline" size={16} />
        Atención desde 3 ausencias equivalentes. Riesgo alto desde 6.
      </div>
    </div>
  );
}
