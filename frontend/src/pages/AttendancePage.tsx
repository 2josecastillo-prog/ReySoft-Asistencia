import { FormEvent, useEffect, useState } from 'react';
import { CheckCircle2, Clock3, MessageCircle, Plus, Trash2 } from 'lucide-react';
import { api, extractError } from '../api/client';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge } from '../components/StatusBadge';
import { AttendanceRecord, AttendanceStatus, Student } from '../types';
import { useAuth } from '../auth/AuthContext';
import { attendanceStatusLabels } from '../utils/labels';

const statuses: AttendanceStatus[] = ['arrived', 'absent', 'late', 'early_pickup', 'excused'];

interface AttendanceFormState {
  student_id: string;
  attendance_date: string;
  status: AttendanceStatus | '';
  arrival_time: string;
  departure_time: string;
  notes: string;
}

function createBlankAttendanceForm(): AttendanceFormState {
  return {
    student_id: '',
    attendance_date: '',
    status: '',
    arrival_time: '',
    departure_time: '',
    notes: ''
  };
}

function formatSentAt(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-DO', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

export function AttendancePage() {
  const { user } = useAuth();
  const canDelete = user?.role === 'school_admin';
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [form, setForm] = useState<AttendanceFormState>(createBlankAttendanceForm);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState('');

  async function loadData() {
    try {
      const [attendanceResponse, studentsResponse] = await Promise.all([
        api.get<AttendanceRecord[]>('/attendance'),
        api.get<Student[]>('/students', { params: { is_active: true } })
      ]);
      setRecords(attendanceResponse.data);
      setStudents(studentsResponse.data);
    } catch (err) {
      setError(extractError(err));
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setPreview('');
    if (!form.status) {
      setError('Selecciona un estado de asistencia.');
      return;
    }
    try {
      await api.post('/attendance', {
        ...form,
        arrival_time: form.arrival_time || null,
        departure_time: form.departure_time || null,
        notes: form.notes || null
      });
      setForm(createBlankAttendanceForm());
      await loadData();
    } catch (err) {
      setError(extractError(err));
    }
  }

  async function openWhatsApp(record: AttendanceRecord) {
    try {
      const response = await api.post<{ url: string; message: string }>(`/attendance/${record.id}/whatsapp-link`);
      setPreview(response.data.message);
      window.open(response.data.url, '_blank', 'noopener,noreferrer');
      await loadData();
    } catch (err) {
      setError(extractError(err));
    }
  }

  async function removeRecord(id: string) {
    if (!confirm('¿Eliminar este registro de asistencia?')) return;
    await api.delete(`/attendance/${id}`);
    await loadData();
  }

  useEffect(() => {
    loadData();
  }, []);

  const studentName = (id: string) => students.find((student) => student.id === id)?.full_name ?? 'Estudiante';
  const pendingMessageRecords = records.filter((record) => !record.parent_message_sent_at);
  const sentMessageRecords = records.filter((record) => record.parent_message_sent_at);

  function renderRecordsTable(items: AttendanceRecord[], emptyLabel: string, sentGroup = false) {
    if (items.length === 0) return <EmptyState label={emptyLabel} />;
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase text-slate-500">
            <tr>
              <th className="p-3">Fecha</th>
              <th className="p-3">Estudiante</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Hora</th>
              <th className="p-3">Mensaje</th>
              <th className="p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((record) => (
              <tr className="border-t border-slate-100" key={record.id}>
                <td className="p-3">{record.attendance_date}</td>
                <td className="p-3 font-medium">{studentName(record.student_id)}</td>
                <td className="p-3"><StatusBadge value={record.status} /></td>
                <td className="p-3">{record.arrival_time ?? record.departure_time ?? '-'}</td>
                <td className="p-3">
                  {record.parent_message_sent_at ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 size={14} /> Enviado {formatSentAt(record.parent_message_sent_at)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                      <Clock3 size={14} /> Pendiente
                    </span>
                  )}
                </td>
                <td className="flex flex-wrap gap-2 p-3">
                  <button className="btn-secondary" onClick={() => openWhatsApp(record)}>
                    <MessageCircle size={16} />{sentGroup ? 'Reenviar' : 'Enviar WhatsApp'}
                  </button>
                  {canDelete && <button className="btn-danger" onClick={() => removeRecord(record.id)}><Trash2 size={16} /></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <h2 className="text-xl font-semibold">Asistencia</h2>
      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <form className="card grid gap-3 p-4 md:grid-cols-6" onSubmit={onSubmit}>
        <select className="form-input md:col-span-2" value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} required>
          <option value="">Estudiante</option>
          {students.map((student) => <option key={student.id} value={student.id}>{student.full_name}</option>)}
        </select>
        <input className="form-input" type="date" value={form.attendance_date} onChange={(e) => setForm({ ...form, attendance_date: e.target.value })} required />
        <select className="form-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as AttendanceStatus | '' })} required>
          <option value="">Estado</option>
          {statuses.map((status) => <option key={status} value={status}>{attendanceStatusLabels[status]}</option>)}
        </select>
        <input className="form-input" type="time" value={form.arrival_time} onChange={(e) => setForm({ ...form, arrival_time: e.target.value })} />
        <input className="form-input" type="time" value={form.departure_time} onChange={(e) => setForm({ ...form, departure_time: e.target.value })} />
        <textarea className="form-input md:col-span-5" placeholder="Notas" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <button className="btn-primary"><Plus size={16} />Registrar</button>
      </form>
      {preview && <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-800">{preview}</div>}
      <section className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-950">Pendientes de enviar a padres</h3>
          <span className="rounded-md bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">{pendingMessageRecords.length}</span>
        </div>
        <div className="card overflow-hidden">
          {renderRecordsTable(pendingMessageRecords, 'No hay mensajes pendientes de enviar')}
        </div>
      </section>
      <section className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-950">Mensajes enviados a padres</h3>
          <span className="rounded-md bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">{sentMessageRecords.length}</span>
        </div>
        <div className="card overflow-hidden">
          {renderRecordsTable(sentMessageRecords, 'No hay mensajes enviados todavía', true)}
        </div>
      </section>
    </div>
  );
}
