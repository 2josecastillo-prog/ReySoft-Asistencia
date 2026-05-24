import { FormEvent, useEffect, useState } from 'react';
import { Bell, Check, CheckCircle2, FileClock, KeyRound, MailOpen, PauseCircle, Pencil, Plus, RefreshCw, Save, X, XCircle } from 'lucide-react';
import { api, extractError } from '../api/client';
import { EmptyState } from '../components/EmptyState';
import { ProjectLogo } from '../components/ProjectLogo';
import { StatusBadge } from '../components/StatusBadge';
import { Organization, OrganizationStatus } from '../types';
import { useAuth } from '../auth/AuthContext';

interface AdminStats {
  total_organizations: number;
  active_organizations: number;
  pending_organizations: number;
  suspended_organizations: number;
  new_registration_requests: number;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

type NotificationFilter = 'all' | 'unread' | 'read';

interface ActivationItem {
  id: string;
  organization_id: string;
  activation_date: string;
  expiration_date?: string | null;
  notes?: string | null;
}

interface AuditLogItem {
  id: string;
  organization_id?: string | null;
  organization_name?: string | null;
  user_email?: string | null;
  user_full_name?: string | null;
  action: string;
  entity_name?: string | null;
  entity_id?: string | null;
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
}

interface AuditLogGroup {
  key: string;
  name: string;
  logs: AuditLogItem[];
}

const initialOrganizationForm = {
  organization_name: '',
  organization_email: '',
  organization_phone: '',
  admin_first_name: '',
  admin_middle_name: '',
  admin_last_name: '',
  admin_second_surname: '',
  admin_email: '',
  password: '',
  footer_text: '',
  primary_color: '#2563EB',
  secondary_color: '#1E293B',
  accent_color: '#F59E0B',
  status: 'active' as OrganizationStatus
};

const initialActivationForm = {
  organizationId: '',
  organizationName: '',
  expiration_date: '',
  notes: 'Activación manual desde panel'
};

const initialPasswordForm = {
  organizationId: '',
  organizationName: '',
  password: ''
};

const notificationRefreshIntervalMs = 30_000;

export function AdminDashboardPage() {
  const { logout } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activations, setActivations] = useState<ActivationItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<OrganizationStatus | ''>('');
  const [notificationFilter, setNotificationFilter] = useState<NotificationFilter>('all');
  const [auditOrganizationFilter, setAuditOrganizationFilter] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [auditFromDate, setAuditFromDate] = useState('');
  const [auditToDate, setAuditToDate] = useState('');
  const [form, setForm] = useState(initialOrganizationForm);
  const [activationForm, setActivationForm] = useState(initialActivationForm);
  const [passwordForm, setPasswordForm] = useState(initialPasswordForm);
  const [editingOrganizationId, setEditingOrganizationId] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoInputKey, setLogoInputKey] = useState(0);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const isEditing = Boolean(editingOrganizationId);
  const unreadNotificationsCount = notifications.filter((item) => !item.is_read).length;
  const visibleNotifications = notifications.filter((item) => {
    if (notificationFilter === 'unread') return !item.is_read;
    if (notificationFilter === 'read') return item.is_read;
    return true;
  });
  const auditActionOptions = Array.from(new Set(auditLogs.map((item) => item.action))).sort();
  const auditLogGroups = auditLogs.reduce<AuditLogGroup[]>((groups, log) => {
    const key = log.organization_id ?? 'global';
    const existing = groups.find((group) => group.key === key);
    if (existing) {
      existing.logs.push(log);
      return groups;
    }
    groups.push({
      key,
      name: log.organization_name ?? 'Sin centro asociado',
      logs: [log]
    });
    return groups;
  }, []);

  function compactJson(value?: Record<string, unknown> | null) {
    if (!value || Object.keys(value).length === 0) return 'Sin datos';
    const json = JSON.stringify(value);
    return json.length > 180 ? `${json.slice(0, 180)}...` : json;
  }

  function auditLogParams() {
    return {
      organization_id: auditOrganizationFilter || undefined,
      action: auditActionFilter || undefined,
      created_from: auditFromDate ? `${auditFromDate}T00:00:00` : undefined,
      created_to: auditToDate ? `${auditToDate}T23:59:59` : undefined,
      limit: 100
    };
  }

  async function loadNotifications(options: { silent?: boolean } = {}) {
    try {
      const notificationsResponse = await api.get<NotificationItem[]>('/admin/notifications');
      setNotifications(notificationsResponse.data);
    } catch (err) {
      if (!options.silent) setError(extractError(err));
    }
  }

  async function loadAuditLogs(options: { silent?: boolean } = {}) {
    try {
      const auditResponse = await api.get<AuditLogItem[]>('/admin/audit-logs', {
        params: auditLogParams()
      });
      setAuditLogs(auditResponse.data);
    } catch (err) {
      if (!options.silent) setError(extractError(err));
    }
  }

  async function loadData() {
    try {
      const [organizationsResponse, statsResponse, notificationsResponse, activationsResponse, auditResponse] = await Promise.all([
        api.get<Organization[]>('/admin/organizations', {
          params: statusFilter ? { status: statusFilter } : undefined
        }),
        api.get<AdminStats>('/admin/dashboard'),
        api.get<NotificationItem[]>('/admin/notifications'),
        api.get<ActivationItem[]>('/admin/subscription-activations'),
        api.get<AuditLogItem[]>('/admin/audit-logs', { params: auditLogParams() })
      ]);
      setStats(statsResponse.data);
      setOrganizations(organizationsResponse.data);
      setNotifications(notificationsResponse.data);
      setActivations(activationsResponse.data);
      setAuditLogs(auditResponse.data);
    } catch (err) {
      setError(extractError(err));
    }
  }

  function resetForm() {
    setForm(initialOrganizationForm);
    setEditingOrganizationId(null);
    setLogoFile(null);
    setLogoInputKey((value) => value + 1);
  }

  function startEditing(organization: Organization) {
    setError('');
    setMessage('');
    setEditingOrganizationId(organization.id);
    setLogoFile(null);
    setLogoInputKey((value) => value + 1);
    setForm({
      organization_name: organization.name,
      organization_email: organization.email,
      organization_phone: organization.phone ?? '',
      admin_first_name: '',
      admin_middle_name: '',
      admin_last_name: '',
      admin_second_surname: '',
      admin_email: '',
      password: '',
      footer_text: organization.footer_text ?? '',
      primary_color: organization.primary_color,
      secondary_color: organization.secondary_color,
      accent_color: organization.accent_color,
      status: organization.status
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function startActivation(organization: Organization) {
    setError('');
    setMessage('');
    setActivationForm({
      organizationId: organization.id,
      organizationName: organization.name,
      expiration_date: '',
      notes: 'Activación manual desde panel'
    });
  }

  function startPasswordReset(organization: Organization) {
    setError('');
    setMessage('');
    setPasswordForm({
      organizationId: organization.id,
      organizationName: organization.name,
      password: ''
    });
  }

  async function activateOrganization(event: FormEvent) {
    event.preventDefault();
    if (!activationForm.organizationId) return;
    try {
      await api.post(`/admin/organizations/${activationForm.organizationId}/activate`, {
        expiration_date: activationForm.expiration_date || null,
        notes: activationForm.notes || null
      });
      setActivationForm(initialActivationForm);
      setMessage('Centro educativo activado.');
      await loadData();
    } catch (err) {
      setError(extractError(err));
    }
  }

  async function resetSchoolAdminPassword(event: FormEvent) {
    event.preventDefault();
    if (!passwordForm.organizationId) return;
    setError('');
    setMessage('');
    try {
      await api.put(`/admin/organizations/${passwordForm.organizationId}/school-admin-password`, {
        password: passwordForm.password
      });
      setPasswordForm(initialPasswordForm);
      await loadAuditLogs({ silent: true });
      setMessage('Contraseña del administrador del centro actualizada.');
    } catch (err) {
      setError(extractError(err));
    }
  }

  async function changeStatus(id: string, action: 'suspend' | 'cancel') {
    try {
      await api.post(`/admin/organizations/${id}/${action}`, {});
      await loadData();
    } catch (err) {
      setError(extractError(err));
    }
  }

  async function markNotificationRead(notificationId: string) {
    setError('');
    try {
      const response = await api.put<NotificationItem>(`/admin/notifications/${notificationId}/read`);
      setNotifications((current) => current.map((item) => (item.id === notificationId ? response.data : item)));
    } catch (err) {
      setError(extractError(err));
    }
  }

  async function markAllNotificationsRead() {
    setError('');
    try {
      await api.put('/admin/notifications/read-all');
      setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
    } catch (err) {
      setError(extractError(err));
    }
  }

  async function saveOrganization(event: FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      const payload = {
        organization_name: form.organization_name,
        organization_email: form.organization_email,
        organization_phone: form.organization_phone,
        footer_text: form.footer_text,
        primary_color: form.primary_color,
        secondary_color: form.secondary_color,
        accent_color: form.accent_color
      };

      const organization = editingOrganizationId
        ? (await api.put<Organization>(`/admin/organizations/${editingOrganizationId}`, payload)).data
        : (await api.post<{ organization: Organization }>('/admin/organizations', {
            ...payload,
            admin_first_name: form.admin_first_name,
            admin_middle_name: form.admin_middle_name || null,
            admin_last_name: form.admin_last_name,
            admin_second_surname: form.admin_second_surname || null,
            admin_email: form.admin_email,
            password: form.password,
            status: form.status
          })).data.organization;

      if (logoFile) {
        const logoData = new FormData();
        logoData.append('file', logoFile);
        await api.post(`/admin/organizations/${organization.id}/logo`, logoData);
      }

      resetForm();
      setMessage(editingOrganizationId ? 'Centro educativo actualizado.' : 'Centro educativo creado. Ya puede iniciar sesión si quedó activo.');
      await loadData();
    } catch (err) {
      setError(extractError(err));
    }
  }

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  useEffect(() => {
    loadAuditLogs();
  }, [auditOrganizationFilter, auditActionFilter, auditFromDate, auditToDate]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      loadNotifications({ silent: true });
    }, notificationRefreshIntervalMs);
    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex items-center gap-4">
          <ProjectLogo className="h-12 w-auto" />
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Administrador global</p>
            <h1 className="text-2xl font-semibold">Panel global</h1>
          </div>
        </div>
        <button className="btn-secondary" onClick={logout}>Salir</button>
      </header>
      <div className="grid gap-6 p-5">
        {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {message && <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}

        <form className="card grid gap-4 p-4" onSubmit={saveOrganization}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">{isEditing ? 'Editar centro educativo' : 'Registrar centro educativo'}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {isEditing
                  ? 'Actualiza los datos visibles del centro sin cambiar su estado de suscripción.'
                  : 'Solo el administrador global puede crear centros y sus usuarios administradores.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {isEditing && (
                <button className="btn-secondary" type="button" onClick={resetForm}>
                  <X size={16} />
                  Cancelar
                </button>
              )}
              <button className="btn-primary">
                {isEditing ? <Save size={16} /> : <Plus size={16} />}
                {isEditing ? 'Guardar cambios' : 'Crear centro'}
              </button>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <input className="form-input" placeholder="Nombre del centro" value={form.organization_name} onChange={(event) => setForm({ ...form, organization_name: event.target.value })} required />
            <input className="form-input" placeholder="Correo del centro" type="email" value={form.organization_email} onChange={(event) => setForm({ ...form, organization_email: event.target.value })} required />
            <input className="form-input" placeholder="Teléfono del centro" value={form.organization_phone} onChange={(event) => setForm({ ...form, organization_phone: event.target.value })} required />
            {!isEditing && (
              <>
                <input className="form-input" placeholder="Primer nombre del administrador" value={form.admin_first_name} onChange={(event) => setForm({ ...form, admin_first_name: event.target.value })} required />
                <input className="form-input" placeholder="Segundo nombre opcional" value={form.admin_middle_name} onChange={(event) => setForm({ ...form, admin_middle_name: event.target.value })} />
                <input className="form-input" placeholder="Primer apellido del administrador" value={form.admin_last_name} onChange={(event) => setForm({ ...form, admin_last_name: event.target.value })} required />
                <input className="form-input" placeholder="Segundo apellido opcional" value={form.admin_second_surname} onChange={(event) => setForm({ ...form, admin_second_surname: event.target.value })} />
                <input className="form-input" placeholder="Correo del administrador" type="email" value={form.admin_email} onChange={(event) => setForm({ ...form, admin_email: event.target.value })} required />
                <input className="form-input" placeholder="Contraseña temporal" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
              </>
            )}
            <textarea
              className="form-input min-h-24 md:col-span-3"
              maxLength={500}
              placeholder="Pie de página del centro visible para usuarios y padres"
              value={form.footer_text}
              onChange={(event) => setForm({ ...form, footer_text: event.target.value })}
            />
            <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Logo del centro
              <input key={logoInputKey} className="form-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)} />
              {logoFile && <span className="truncate text-xs normal-case tracking-normal text-slate-500">{logoFile.name}</span>}
            </label>
            {!isEditing && (
              <select className="form-input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as OrganizationStatus })}>
                <option value="active">Activo</option>
                <option value="pending">Pendiente</option>
              </select>
            )}
            <div className="grid grid-cols-3 gap-2">
              <input className="form-input h-11" aria-label="Color primario" type="color" value={form.primary_color} onChange={(event) => setForm({ ...form, primary_color: event.target.value })} />
              <input className="form-input h-11" aria-label="Color secundario" type="color" value={form.secondary_color} onChange={(event) => setForm({ ...form, secondary_color: event.target.value })} />
              <input className="form-input h-11" aria-label="Color de acento" type="color" value={form.accent_color} onChange={(event) => setForm({ ...form, accent_color: event.target.value })} />
            </div>
          </div>
        </form>

        {stats && (
          <section className="grid gap-4 md:grid-cols-5">
            {[
              ['Registrados', stats.total_organizations],
              ['Activos', stats.active_organizations],
              ['Pendientes', stats.pending_organizations],
              ['Suspendidos', stats.suspended_organizations],
              ['Solicitudes', stats.new_registration_requests]
            ].map(([label, value]) => (
              <div className="card p-4" key={label}>
                <p className="text-sm text-slate-500">{label}</p>
                <p className="mt-2 text-3xl font-semibold">{value}</p>
              </div>
            ))}
          </section>
        )}

        <section className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
            <h2 className="font-semibold">Centros educativos</h2>
            <select className="form-input max-w-48" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as OrganizationStatus | '')}>
              <option value="">Todos</option>
              <option value="pending">Pendientes</option>
              <option value="active">Activos</option>
              <option value="suspended">Suspendidos</option>
              <option value="cancelled">Cancelados</option>
            </select>
          </div>
          {activationForm.organizationId && (
            <form className="grid gap-3 border-b border-slate-200 bg-emerald-50 p-4 md:grid-cols-[1fr_180px_1.5fr_auto]" onSubmit={activateOrganization}>
              <div>
                <p className="text-xs font-semibold uppercase text-emerald-700">Activar centro</p>
                <p className="font-medium text-slate-900">{activationForm.organizationName}</p>
              </div>
              <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Fecha de expiración
                <input
                  className="form-input"
                  type="date"
                  value={activationForm.expiration_date}
                  onChange={(event) => setActivationForm({ ...activationForm, expiration_date: event.target.value })}
                />
              </label>
              <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Notas
                <input
                  className="form-input"
                  value={activationForm.notes}
                  onChange={(event) => setActivationForm({ ...activationForm, notes: event.target.value })}
                />
              </label>
              <div className="flex items-end gap-2">
                <button className="btn-primary" type="submit"><Check size={16} />Confirmar</button>
                <button className="btn-secondary" type="button" onClick={() => setActivationForm(initialActivationForm)}><X size={16} /></button>
              </div>
            </form>
          )}
          {passwordForm.organizationId && (
            <form className="grid gap-3 border-b border-slate-200 bg-blue-50 p-4 md:grid-cols-[1fr_260px_auto]" onSubmit={resetSchoolAdminPassword}>
              <div>
                <p className="text-xs font-semibold uppercase text-blue-700">Cambiar contraseña</p>
                <p className="font-medium text-slate-900">{passwordForm.organizationName}</p>
              </div>
              <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Nueva contraseña del administrador
                <input
                  className="form-input"
                  type="password"
                  minLength={8}
                  maxLength={72}
                  value={passwordForm.password}
                  onChange={(event) => setPasswordForm({ ...passwordForm, password: event.target.value })}
                  required
                />
              </label>
              <div className="flex items-end gap-2">
                <button className="btn-primary" type="submit"><KeyRound size={16} />Guardar</button>
                <button className="btn-secondary" type="button" onClick={() => setPasswordForm(initialPasswordForm)}><X size={16} /></button>
              </div>
            </form>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                <tr>
                  <th className="p-3">Centro</th>
                  <th className="p-3">Correo</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {organizations.map((organization) => (
                  <tr className="border-t border-slate-100" key={organization.id}>
                    <td className="p-3">
                      <p className="font-medium">{organization.name}</p>
                      {organization.footer_text && <p className="mt-1 max-w-md truncate text-xs text-slate-500">{organization.footer_text}</p>}
                    </td>
                    <td className="p-3">{organization.email}</td>
                    <td className="p-3"><StatusBadge value={organization.status} /></td>
                    <td className="flex flex-wrap gap-2 p-3">
                      <button className="btn-secondary" onClick={() => startEditing(organization)}><Pencil size={16} />Editar</button>
                      <button className="btn-secondary" onClick={() => startPasswordReset(organization)}><KeyRound size={16} />Contraseña</button>
                      <button className="btn-secondary" onClick={() => startActivation(organization)}><Check size={16} />Activar</button>
                      <button className="btn-secondary" onClick={() => changeStatus(organization.id, 'suspend')}><PauseCircle size={16} />Suspender</button>
                      <button className="btn-danger" onClick={() => changeStatus(organization.id, 'cancel')}><XCircle size={16} />Cancelar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-blue-600" />
                <h2 className="font-semibold">Notificaciones</h2>
                {unreadNotificationsCount > 0 && (
                  <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">
                    {unreadNotificationsCount}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="btn-secondary" type="button" onClick={() => loadNotifications()}>
                  <RefreshCw size={16} />
                  Actualizar
                </button>
                <button
                  className="btn-secondary"
                  disabled={unreadNotificationsCount === 0}
                  type="button"
                  onClick={markAllNotificationsRead}
                >
                  <MailOpen size={16} />
                  Marcar todas
                </button>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                ['all', 'Todas', notifications.length],
                ['unread', 'No leídas', unreadNotificationsCount],
                ['read', 'Leídas', notifications.length - unreadNotificationsCount]
              ].map(([value, label, count]) => (
                <button
                  className={`rounded-md border px-3 py-2 text-sm font-medium ${
                    notificationFilter === value
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                  key={value}
                  type="button"
                  onClick={() => setNotificationFilter(value as NotificationFilter)}
                >
                  {label} ({count})
                </button>
              ))}
            </div>
            <div className="mt-4 grid max-h-96 gap-3 overflow-y-auto pr-1">
              {visibleNotifications.length === 0 ? (
                <EmptyState label="Sin notificaciones" />
              ) : (
                visibleNotifications.map((item) => (
                  <div
                    className={`rounded-md border p-3 ${
                      item.is_read ? 'border-slate-200 bg-white' : 'border-blue-200 bg-blue-50'
                    }`}
                    key={item.id}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold">{item.title}</p>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                            {item.type}
                          </span>
                          {!item.is_read && (
                            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">
                              Nueva
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{item.message}</p>
                        <p className="mt-2 text-xs text-slate-500">
                          {new Date(item.created_at).toLocaleString('es-DO', {
                            dateStyle: 'short',
                            timeStyle: 'short'
                          })}
                        </p>
                      </div>
                      {!item.is_read && (
                        <button className="btn-secondary" type="button" onClick={() => markNotificationRead(item.id)}>
                          <CheckCircle2 size={16} />
                          Leída
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="card p-4">
            <h2 className="font-semibold">Historial de activaciones</h2>
            <div className="mt-4 grid gap-3">
              {activations.length === 0 ? <EmptyState label="Sin activaciones" /> : activations.slice(0, 8).map((item) => (
                <div className="rounded-md border border-slate-200 p-3 text-sm" key={item.id}>
                  <p className="font-medium">{item.activation_date}</p>
                  {item.expiration_date && <p className="text-slate-600">Expira: {item.expiration_date}</p>}
                  <p className="text-slate-600">{item.notes ?? 'Activación manual'}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
            <div className="flex items-center gap-2">
              <FileClock size={18} className="text-slate-700" />
              <div>
                <h2 className="font-semibold">Auditoría por centro</h2>
                <p className="mt-1 text-sm text-slate-500">Acciones importantes registradas en el sistema.</p>
              </div>
            </div>
            <button className="btn-secondary" type="button" onClick={() => loadAuditLogs()}>
              <RefreshCw size={16} />
              Actualizar
            </button>
          </div>
          <div className="grid gap-3 border-b border-slate-200 bg-slate-50 p-4 md:grid-cols-4">
            <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Centro
              <select className="form-input" value={auditOrganizationFilter} onChange={(event) => setAuditOrganizationFilter(event.target.value)}>
                <option value="">Todos los centros</option>
                {organizations.map((organization) => (
                  <option value={organization.id} key={organization.id}>{organization.name}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Acción
              <select className="form-input" value={auditActionFilter} onChange={(event) => setAuditActionFilter(event.target.value)}>
                <option value="">Todas las acciones</option>
                {auditActionFilter && !auditActionOptions.includes(auditActionFilter) && (
                  <option value={auditActionFilter}>{auditActionFilter}</option>
                )}
                {auditActionOptions.map((action) => (
                  <option value={action} key={action}>{action}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Desde
              <input className="form-input" type="date" value={auditFromDate} onChange={(event) => setAuditFromDate(event.target.value)} />
            </label>
            <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Hasta
              <input className="form-input" type="date" value={auditToDate} onChange={(event) => setAuditToDate(event.target.value)} />
            </label>
          </div>
          <div className="grid gap-4 p-4">
            {auditLogGroups.length === 0 ? (
              <EmptyState label="Sin registros de auditoría" />
            ) : (
              auditLogGroups.map((group) => (
                <div className="rounded-md border border-slate-200" key={group.key}>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white p-3">
                    <div>
                      <p className="font-semibold">{group.name}</p>
                      <p className="text-sm text-slate-500">{group.logs.length} registros</p>
                    </div>
                    {group.key !== 'global' && <span className="text-xs text-slate-500">{group.key}</span>}
                  </div>
                  <div className="divide-y divide-slate-100">
                    {group.logs.map((log) => (
                      <div className="grid gap-3 p-3 text-sm lg:grid-cols-[220px_1fr]" key={log.id}>
                        <div>
                          <p className="font-medium text-slate-900">
                            {new Date(log.created_at).toLocaleString('es-DO', {
                              dateStyle: 'short',
                              timeStyle: 'short'
                            })}
                          </p>
                          <p className="mt-1 text-slate-500">{log.user_full_name ?? log.user_email ?? 'Sistema'}</p>
                          {log.ip_address && <p className="mt-1 text-xs text-slate-400">IP: {log.ip_address}</p>}
                        </div>
                        <div className="grid gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">{log.action}</span>
                            {log.entity_name && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{log.entity_name}</span>}
                            {log.entity_id && <span className="text-xs text-slate-400">{log.entity_id}</span>}
                          </div>
                          <div className="grid gap-2 md:grid-cols-2">
                            <div className="rounded-md bg-slate-50 p-2">
                              <p className="text-xs font-semibold uppercase text-slate-500">Antes</p>
                              <code className="mt-1 block break-all text-xs text-slate-700">{compactJson(log.old_data)}</code>
                            </div>
                            <div className="rounded-md bg-slate-50 p-2">
                              <p className="text-xs font-semibold uppercase text-slate-500">Después</p>
                              <code className="mt-1 block break-all text-xs text-slate-700">{compactJson(log.new_data)}</code>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
