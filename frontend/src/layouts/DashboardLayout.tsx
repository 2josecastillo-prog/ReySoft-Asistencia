import { BarChart3, BookOpen, CalendarCheck, GraduationCap, Home, LogOut, MessageCircle, Search, Settings, UserCog, Users } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { mediaUrl } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { NotificationCenter } from '../components/NotificationCenter';
import { ProjectLogo } from '../components/ProjectLogo';
import { UserRole } from '../types';
import { labelFor } from '../utils/labels';

const schoolLinks: Array<{ to: string; label: string; icon: typeof Home; roles?: UserRole[] }> = [
  { to: '/dashboard', label: 'Inicio', icon: Home },
  { to: '/dashboard/courses', label: 'Cursos', icon: BookOpen },
  { to: '/dashboard/guardians', label: 'Tutores', icon: Users },
  { to: '/dashboard/students', label: 'Estudiantes', icon: GraduationCap },
  { to: '/dashboard/attendance', label: 'Asistencia', icon: CalendarCheck },
  { to: '/dashboard/reports', label: 'Reportes', icon: BarChart3 },
  { to: '/dashboard/whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { to: '/dashboard/users', label: 'Personal', icon: UserCog, roles: ['school_admin'] },
  { to: '/dashboard/settings', label: 'Configuración', icon: Settings }
];

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const organization = user?.organization;

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-slate-950 lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="border-r border-slate-200 bg-white lg:sticky lg:top-0 lg:h-screen">
        <div className="grid min-h-full grid-rows-[auto_1fr_auto]">
          <div>
            <div className="flex h-[61px] items-center justify-center border-b border-slate-200 px-4">
              <ProjectLogo className="h-9 w-auto" />
            </div>
            <div className="border-b border-slate-200 p-4">
              <div className="flex items-center gap-3">
                {organization?.logo_url ? (
                  <img src={mediaUrl(organization.logo_url)} alt={organization.name} className="h-12 w-12 border border-slate-200 object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center border border-slate-200 bg-slate-50">
                    <ProjectLogo className="h-8 w-8" variant="mark" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{organization?.name ?? 'ReySoft-Asistencia'}</p>
                  <p className="truncate text-xs text-slate-500">{user?.full_name}</p>
                </div>
              </div>
            </div>
          </div>

          <nav className="grid content-start gap-1 p-3">
            {schoolLinks.filter(({ roles }) => !roles || (user && roles.includes(user.role))).map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/dashboard'}
                className={({ isActive }) =>
                  `flex items-center justify-between border px-3 py-2.5 text-sm transition ${
                    isActive
                      ? 'border-brand bg-blue-50 text-brand'
                      : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950'
                  }`
                }
              >
                <span className="flex items-center gap-3">
                  <Icon size={18} />
                  {label}
                </span>
              </NavLink>
            ))}
          </nav>

          <div className="border-t border-slate-200 p-3">
            <button className="flex w-full items-center gap-3 border border-slate-200 px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50" onClick={logout}>
              <LogOut size={18} />
              Salir
            </button>
          </div>
        </div>
      </aside>

      <main className="min-w-0">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-3 md:grid-cols-[1fr_auto_1fr]">
            <div className="hidden items-center gap-5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 md:flex">
              <span>Panel / {organization?.name ?? 'Centro'}</span>
              <span>{labelFor(organization?.status)}</span>
            </div>
            <div className="md:justify-self-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dashboard escolar</p>
              <h1 className="truncate text-lg font-semibold text-slate-950">{organization?.name}</h1>
            </div>
            <div className="flex items-center justify-end gap-3">
              <Search size={17} className="hidden text-slate-500 sm:block" aria-hidden="true" />
              <NotificationCenter />
            </div>
          </div>
        </header>

        <div className="px-4 py-6 md:px-6">
          <Outlet />
        </div>

        {organization?.footer_text && (
          <footer className="border-t border-slate-200 bg-white px-5 py-4 text-sm text-slate-600">
            <p>{organization.footer_text}</p>
          </footer>
        )}
      </main>
    </div>
  );
}
