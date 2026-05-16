import { useEffect, useState } from 'react';
import { CalendarCheck, ClipboardCheck, GraduationCap, Timer, UserRoundCheck, UserRoundX } from 'lucide-react';
import { api, extractError } from '../api/client';

interface SchoolStats {
  active_students: number;
  active_guardians: number;
  today_attendance: number;
  today_absences: number;
  today_late_arrivals: number;
  today_excused: number;
}

export function SchoolDashboardPage() {
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

  return (
    <div className="grid gap-5">
      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {cards.map(({ label, value, icon: Icon }) => (
          <div className="card p-4" key={label}>
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{label}</p>
              <Icon className="text-brand" size={22} />
            </div>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{value}</p>
          </div>
        ))}
      </section>
      <section className="rounded-lg bg-white p-5 ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold">Operación diaria</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Usa el menú lateral para mantener cursos, tutores, estudiantes, asistencia y plantillas de WhatsApp dentro de tu centro.
        </p>
      </section>
    </div>
  );
}
