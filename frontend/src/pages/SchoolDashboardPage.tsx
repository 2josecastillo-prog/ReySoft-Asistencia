import { useEffect, useState } from 'react';
import { CalendarCheck, ClipboardCheck, GraduationCap, MessageCircle, Timer, UserRoundCheck, UserRoundX } from 'lucide-react';
import { api, extractError } from '../api/client';
import { useAuth } from '../auth/AuthContext';

interface SchoolStats {
  active_students: number;
  active_guardians: number;
  today_attendance: number;
  today_absences: number;
  today_late_arrivals: number;
  today_excused: number;
}

export function SchoolDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<SchoolStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<SchoolStats>('/dashboard/school')
      .then((response) => setStats(response.data))
      .catch((err) => setError(extractError(err)));
  }, []);

  const cards = [
    { label: 'Estudiantes activos', value: stats?.active_students ?? 0, icon: GraduationCap },
    { label: 'Tutores activos', value: stats?.active_guardians ?? 0, icon: UserRoundCheck },
    { label: 'Asistencias de hoy', value: stats?.today_attendance ?? 0, icon: CalendarCheck },
    { label: 'Ausencias de hoy', value: stats?.today_absences ?? 0, icon: UserRoundX },
    { label: 'Llegadas tarde', value: stats?.today_late_arrivals ?? 0, icon: Timer },
    { label: 'Excusados de hoy', value: stats?.today_excused ?? 0, icon: ClipboardCheck }
  ];

  const attendanceTotal = stats?.today_attendance ?? 0;
  const studentsTotal = stats?.active_students ?? 0;
  const attendancePercent = studentsTotal > 0 ? Math.min(100, Math.round((attendanceTotal / studentsTotal) * 100)) : 0;
  const todaySummary = [
    ['Registros tomados', stats?.today_attendance ?? 0],
    ['Ausencias', stats?.today_absences ?? 0],
    ['Tardanzas', stats?.today_late_arrivals ?? 0],
    ['Excusas', stats?.today_excused ?? 0]
  ];

  return (
    <div className="grid gap-6">
      {error && <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="border border-slate-200 bg-white p-6">
          <div className="mb-5 flex items-center justify-between border-b border-slate-200 pb-3 text-[11px] uppercase tracking-wide text-slate-500">
            <span>Inicio / Operación diaria</span>
            <span>{new Date().toLocaleDateString('es-DO')}</span>
          </div>
          <div className="grid gap-8 lg:grid-cols-[1fr_260px] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Panel escolar</p>
              <h2 className="mt-4 max-w-3xl text-5xl font-semibold text-slate-950">
                Control diario de asistencia
              </h2>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-600">
                {user?.organization?.name ?? 'El centro'} puede registrar asistencia, revisar estados críticos,
                consultar reportes y mantener comunicación con padres desde una sola operación.
              </p>
            </div>
            <div className="border border-slate-200 bg-slate-50 p-5">
              <CalendarCheck className="text-brand" size={32} />
              <p className="mt-8 text-xs uppercase tracking-wide text-slate-500">Cobertura registrada</p>
              <p className="mt-2 text-5xl font-semibold">{attendancePercent}%</p>
              <div className="mt-4 h-2 bg-slate-200">
                <div className="h-2 bg-brand" style={{ width: `${attendancePercent}%` }} />
              </div>
            </div>
          </div>
        </div>

        <aside className="border border-slate-200 bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Resumen de hoy</p>
          <div className="mt-5 divide-y divide-slate-200">
            {todaySummary.map(([label, value]) => (
              <div className="flex items-center justify-between py-4" key={label}>
                <span className="text-sm text-slate-600">{label}</span>
                <span className="text-2xl font-semibold text-slate-950">{value}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 border border-slate-100 bg-slate-50 p-4">
            <MessageCircle className="text-accent" size={24} />
            <p className="mt-4 text-sm font-semibold">Mensajes a padres</p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Los registros pueden separarse entre pendientes y enviados para seguimiento operativo.
            </p>
          </div>
        </aside>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {cards.map(({ label, value, icon: Icon }) => (
          <div className="border border-slate-200 bg-white p-4" key={label}>
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
              <Icon className="text-brand" size={22} />
            </div>
            <p className="mt-6 text-4xl font-semibold text-slate-950">{value}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
