import { FormEvent, useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { api, extractError } from '../api/client';
import { EmptyState } from '../components/EmptyState';
import { WhatsAppTemplate } from '../types';
import { useAuth } from '../auth/AuthContext';
import { attendanceStatusLabels } from '../utils/labels';

const variables = ['{student_name}', '{guardian_name}', '{course_name}', '{school_name}', '{date}', '{time}'];

export function WhatsAppPage() {
  const { user } = useAuth();
  const canEdit = user?.role === 'school_admin';
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [selected, setSelected] = useState<WhatsAppTemplate | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadTemplates() {
    try {
      const response = await api.get<WhatsAppTemplate[]>('/whatsapp/templates');
      setTemplates(response.data);
      if (!selected && response.data[0]) {
        setSelected(response.data[0]);
        setText(response.data[0].template_text);
      }
    } catch (err) {
      setError(extractError(err));
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    try {
      await api.put(`/whatsapp/templates/${selected.id}`, { template_text: text, is_active: selected.is_active });
      setMessage('Plantilla actualizada.');
      await loadTemplates();
    } catch (err) {
      setError(extractError(err));
    }
  }

  useEffect(() => {
    loadTemplates();
  }, []);

  const preview = text
    .replace('{student_name}', 'Luis Pérez')
    .replace('{guardian_name}', 'María Rodríguez')
    .replace('{course_name}', 'Primero A')
    .replace('{school_name}', user?.organization?.name ?? 'Colegio')
    .replace('{date}', new Date().toISOString().slice(0, 10))
    .replace('{time}', '07:45');

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <section className="card p-4">
        <h2 className="text-lg font-semibold">Plantillas</h2>
        <div className="mt-4 grid gap-2">
          {templates.length === 0 ? <EmptyState label="Sin plantillas" /> : templates.map((template) => (
            <button
              className={`rounded-md border px-3 py-2 text-left text-sm ${selected?.id === template.id ? 'border-brand bg-blue-50' : 'border-slate-200 bg-white'}`}
              key={template.id}
              onClick={() => { setSelected(template); setText(template.template_text); }}
            >
              {attendanceStatusLabels[template.status] ?? template.status}
            </button>
          ))}
        </div>
      </section>
      <section className="card p-4">
        <h2 className="text-lg font-semibold">Mensaje de WhatsApp</h2>
        {error && <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {message && <div className="mt-3 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}
        <form className="mt-4 grid gap-4" onSubmit={onSubmit}>
          <textarea className="form-input min-h-40" value={text} onChange={(event) => setText(event.target.value)} disabled={!canEdit} />
          <div className="flex flex-wrap gap-2">
            {variables.map((variable) => <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700" key={variable}>{variable}</span>)}
          </div>
          <div className="rounded-md bg-slate-50 p-4 text-sm leading-6 text-slate-700">{preview}</div>
          {canEdit && <button className="btn-primary"><Save size={16} />Guardar plantilla</button>}
        </form>
      </section>
    </div>
  );
}
