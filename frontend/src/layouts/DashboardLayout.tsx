import { BarChart3, Bell, BookOpen, CalendarCheck, GraduationCap, Home, LogOut, MessageCircle, Settings, UserCog, Users } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { mediaUrl } from '../api/client';
import { useAuth } from '../auth/AuthContext';
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
    <div className="min-h-screen bg-slate-50 md:flex">
      <aside className="bg-ink text-white md:sticky md:top-0 md:h-screen md:w-72">
        <div className="flex items-center gap-3 border-b border-white/10 p-5">
          {organization?.logo_url ? (
            <img src={mediaUrl(organization.logo_url)} alt={organization.name} className="h-11 w-11 rounded-md object-cover" />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-white">
              <ProjectLogo className="h-9 w-9" variant="mark" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{organization?.name ?? 'ReySoft-Asistencia'}</p>
            <p className="truncate text-xs text-white/70">{user?.full_name}</p>
          </div>
        </div>
        <nav className="grid gap-1 p-3">
          {schoolLinks.filter(({ roles }) => !roles || (user && roles.includes(user.role))).map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${isActive ? 'bg-white text-slate-950' : 'text-white/80 hover:bg-white/10 hover:text-white'}`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3">
          <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-white/80 hover:bg-white/10" onClick={logout}>
            <LogOut size={18} />
            Salir
          </button>
        </div>
      </aside>
      <main className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{labelFor(organization?.status)}</p>
            <h1 className="text-xl font-semibold text-slate-950">{organization?.name}</h1>
          </div>
          <Bell className="text-accent" size={22} />
        </header>
        <div className="flex-1 p-4 md:p-6">
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
