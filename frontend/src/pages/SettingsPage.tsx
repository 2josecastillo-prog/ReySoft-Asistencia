import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { ImagePlus, Save } from 'lucide-react';
import { api, extractError, mediaUrl } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Organization } from '../types';

function organizationToForm(organization: Organization) {
  return {
    name: organization.name,
    phone: organization.phone ?? '',
    logo_url: organization.logo_url ?? '',
    footer_text: organization.footer_text ?? '',
    primary_color: organization.primary_color,
    secondary_color: organization.secondary_color,
    accent_color: organization.accent_color
  };
}

export function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const canEdit = user?.role === 'school_admin';
  const [form, setForm] = useState({
    name: '',
    phone: '',
    logo_url: '',
    footer_text: '',
    primary_color: '#2563EB',
    secondary_color: '#1E293B',
    accent_color: '#F59E0B'
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [logoInputKey, setLogoInputKey] = useState(0);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadSettings() {
    const response = await api.get<Organization>('/organization/settings');
    setForm(organizationToForm(response.data));
  }

  function onLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setLogoFile(file);
    setLogoPreview(file ? URL.createObjectURL(file) : '');
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      const settingsResponse = await api.put<Organization>('/organization/settings', {
        name: form.name,
        phone: form.phone,
        footer_text: form.footer_text,
        primary_color: form.primary_color,
        secondary_color: form.secondary_color,
        accent_color: form.accent_color
      });
      let organization = settingsResponse.data;

      if (logoFile) {
        const logoData = new FormData();
        logoData.append('file', logoFile);
        const logoResponse = await api.post<Organization>('/organization/settings/logo', logoData);
        organization = logoResponse.data;
        setLogoFile(null);
        setLogoPreview('');
        setLogoInputKey((value) => value + 1);
      }

      setForm(organizationToForm(organization));
      await refreshUser();
      setMessage('Configuración actualizada.');
    } catch (err) {
      setError(extractError(err));
    }
  }

  useEffect(() => {
    loadSettings().catch((err) => setError(extractError(err)));
  }, []);

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  const previewLogo = logoPreview || mediaUrl(form.logo_url);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <form className="card grid gap-4 p-4" onSubmit={onSubmit}>
        <h2 className="text-xl font-semibold">Configuración visual</h2>
        {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {message && <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Nombre del centro
          <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={!canEdit} />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Teléfono
          <input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} disabled={!canEdit} />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Pie de página
          <textarea
            className="form-input min-h-24"
            maxLength={500}
            value={form.footer_text}
            onChange={(e) => setForm({ ...form, footer_text: e.target.value })}
            disabled={!canEdit}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Logo del centro
          <div className="flex flex-wrap items-center gap-3">
            <input key={logoInputKey} className="form-input flex-1" type="file" accept="image/png,image/jpeg,image/webp" onChange={onLogoChange} disabled={!canEdit} />
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"><ImagePlus size={16} />PNG, JPG o WEBP</span>
          </div>
        </label>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="grid gap-1 text-sm font-medium text-slate-700">Primario<input className="form-input h-12" type="color" value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} disabled={!canEdit} /></label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">Secundario<input className="form-input h-12" type="color" value={form.secondary_color} onChange={(e) => setForm({ ...form, secondary_color: e.target.value })} disabled={!canEdit} /></label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">Acento<input className="form-input h-12" type="color" value={form.accent_color} onChange={(e) => setForm({ ...form, accent_color: e.target.value })} disabled={!canEdit} /></label>
        </div>
        {canEdit && <button className="btn-primary"><Save size={16} />Guardar</button>}
      </form>
      <aside className="rounded-lg bg-white p-4 ring-1 ring-slate-200">
        <div className="rounded-lg p-5 text-white" style={{ backgroundColor: form.secondary_color }}>
          {previewLogo && <img src={previewLogo} alt={form.name} className="mb-4 h-14 w-14 rounded-md object-cover" />}
          <h3 className="text-lg font-semibold">{form.name || 'Centro educativo'}</h3>
          <button className="mt-5 rounded-md px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: form.primary_color }}>Acción principal</button>
          <div className="mt-4 h-2 rounded-full" style={{ backgroundColor: form.accent_color }} />
          {form.footer_text && <p className="mt-5 border-t border-white/20 pt-4 text-sm text-white/85">{form.footer_text}</p>}
        </div>
      </aside>
    </div>
  );
}
