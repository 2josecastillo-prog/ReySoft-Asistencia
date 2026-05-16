import { FormEvent, useEffect, useState } from 'react';
import { MessageCircle, Plus, Trash2 } from 'lucide-react';
import { api, extractError } from '../api/client';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge } from '../components/StatusBadge';
import { AttendanceRecord, AttendanceStatus, Student } from '../types';
import { useAuth } from '../auth/AuthContext';
import { attendanceStatusLabels } from '../utils/labels';

const statuses: AttendanceStatus[] = ['arrived', 'absent', 'late', 'early_pickup', 'excused'];

export function AttendancePage() {
  const { user } = useAuth();
  const canDelete = user?.role === 'school_admin';
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [form, setForm] = useState({ student_id: '', attendance_date: new Date().toISOString().slice(0, 10), status: 'arrived' as AttendanceStatus, arrival_time: '', departure_time: '', notes: '' });
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
    try {
      await api.post('/attendance', {
        ...form,
        arrival_time: form.arrival_time || null,
        departure_time: form.departure_time || null,
        notes: form.notes || null
      });
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
        <select className="form-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as AttendanceStatus })}>
          {statuses.map((status) => <option key={status} value={status}>{attendanceStatusLabels[status]}</option>)}
        </select>
        <input className="form-input" type="time" value={form.arrival_time} onChange={(e) => setForm({ ...form, arrival_time: e.target.value })} />
        <input className="form-input" type="time" value={form.departure_time} onChange={(e) => setForm({ ...form, departure_time: e.target.value })} />
        <textarea className="form-input md:col-span-5" placeholder="Notas" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <button className="btn-primary"><Plus size={16} />Registrar</button>
      </form>
      {preview && <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-800">{preview}</div>}
      <div className="card overflow-hidden">
        {records.length === 0 ? <EmptyState label="No hay asistencia registrada" /> : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-500">
              <tr><th className="p-3">Fecha</th><th className="p-3">Estudiante</th><th className="p-3">Estado</th><th className="p-3">Hora</th><th className="p-3">Acciones</th></tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr className="border-t border-slate-100" key={record.id}>
                  <td className="p-3">{record.attendance_date}</td>
                  <td className="p-3 font-medium">{studentName(record.student_id)}</td>
                  <td className="p-3"><StatusBadge value={record.status} /></td>
                  <td className="p-3">{record.arrival_time ?? record.departure_time}</td>
                  <td className="flex flex-wrap gap-2 p-3">
                    <button className="btn-secondary" onClick={() => openWhatsApp(record)}><MessageCircle size={16} />WhatsApp</button>
                    {canDelete && <button className="btn-danger" onClick={() => removeRecord(record.id)}><Trash2 size={16} /></button>}
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
