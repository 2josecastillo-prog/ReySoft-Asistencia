import {
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  LogIn,
  MessageCircle,
  Phone,
  Search,
  ShieldCheck,
  Users
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProjectLogo } from '../components/ProjectLogo';

const heroImage =
  'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1800&q=80';

const featureItems = [
  { icon: ShieldCheck, title: 'Multiempresa seguro', text: 'Datos escolares aislados por centro, rol y organización.' },
  { icon: CalendarCheck, title: 'Asistencia diaria', text: 'Llegadas, ausencias, tardanzas, excusas y retiros tempranos.' },
  { icon: MessageCircle, title: 'Mensajes a padres', text: 'WhatsApp automático o asistido según el registro tomado.' },
  { icon: BarChart3, title: 'Reportes', text: 'Informes por estudiante y por curso con exportación institucional.' }
];

const modules = [
  ['Cursos', 'Secciones, años escolares y estado activo.'],
  ['Tutores', 'Relaciones familiares y contacto principal.'],
  ['Estudiantes', 'Importación Excel/CSV y control de estado.'],
  ['Auditoría', 'Trazabilidad de cambios críticos.']
];

const processSteps = [
  'El superadministrador registra el centro y su usuario escolar.',
  'El centro accede solo cuando está activo y dentro de vigencia.',
  'El personal registra asistencia y notifica a los padres.',
  'La dirección revisa reportes, auditoría y tendencias.'
];

const reportHighlights = [
  { label: 'Asistencia diaria', value: '4 estados + excusa', icon: ClipboardCheck },
  { label: 'Portal de padres', value: 'Acceso por teléfono', icon: Users },
  { label: 'Datos escolares', value: 'Excel y CSV', icon: BookOpen }
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f7f8fa] text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          <nav className="hidden items-center gap-5 md:flex">
            <a href="#plataforma" className="hover:text-slate-950">Plataforma</a>
            <a href="#modulos" className="hover:text-slate-950">Módulos</a>
            <a href="#reportes" className="hover:text-slate-950">Reportes</a>
            <a href="#contacto" className="hover:text-slate-950">Contacto</a>
          </nav>
          <Link to="/" className="justify-self-center" aria-label="ReySoft-Asistencia">
            <ProjectLogo className="h-9 w-auto" />
          </Link>
          <div className="flex items-center justify-end gap-3">
            <span className="hidden sm:inline">ESP / RD</span>
            <Search size={16} aria-hidden="true" />
            <Link to="/parents/login" aria-label="Acceso para padres">
              <Phone size={16} />
            </Link>
            <Link to="/login" aria-label="Iniciar sesión">
              <LogIn size={16} />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section id="plataforma" className="mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,430px)] lg:py-12">
          <div className="min-w-0">
            <div className="mb-4 flex items-center justify-between border-b border-slate-300 pb-3 text-[11px] uppercase tracking-wide text-slate-500">
              <span>Inicio / Software escolar / Asistencia</span>
              <span>SKU: reysoft-asistencia</span>
            </div>
            <div className="overflow-hidden border border-slate-200 bg-white">
              <img
                src={heroImage}
                alt="Centro educativo usando una plataforma de asistencia"
                className="h-[360px] w-full object-cover md:h-[520px]"
              />
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-4">
              {featureItems.map(({ icon: Icon, title, text }) => (
                <article className="border border-slate-200 bg-white p-4" key={title}>
                  <Icon className="text-brand" size={24} />
                  <h2 className="mt-4 text-sm font-semibold">{title}</h2>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{text}</p>
                </article>
              ))}
            </div>
          </div>

          <aside className="self-start border border-slate-200 bg-white p-6 lg:sticky lg:top-20">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">SaaS para centros educativos</p>
            <h1 className="mt-5 text-5xl font-semibold tracking-[-0.02em] text-slate-950 md:text-6xl">ReySoft-Asistencia</h1>
            <p className="mt-5 text-sm leading-7 text-slate-600">
              Plataforma profesional para controlar asistencia, estudiantes, tutores, reportes y comunicaciones
              institucionales desde un entorno multiempresa seguro.
            </p>

            <div className="mt-7 grid gap-4 border-y border-slate-200 py-5">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Paleta institucional</p>
                <div className="mt-3 flex gap-2">
                  <span className="h-9 w-9 border border-slate-200 bg-brand" title="Color primario" />
                  <span className="h-9 w-9 border border-slate-200 bg-ink" title="Color secundario" />
                  <span className="h-9 w-9 border border-slate-200 bg-accent" title="Color de acento" />
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Operación</p>
                <p className="mt-2 text-2xl font-semibold">Centros activos, usuarios protegidos y reportes claros</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-[44px_1fr_1fr] gap-2">
              <Link className="btn-secondary px-0" to="/parents/login" aria-label="Acceso padres">
                <Phone size={17} />
              </Link>
              <Link className="btn-primary" to="/login">
                Iniciar sesión
              </Link>
              <a className="btn-secondary" href="#contacto">
                Contacto
              </a>
            </div>

            <div className="mt-6 grid gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-brand" />
                JWT, roles y aislamiento por organización
              </div>
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-brand" />
                Notificaciones, auditoría y actividad por centro
              </div>
            </div>
          </aside>
        </section>

        <section id="modulos" className="mx-auto grid max-w-7xl gap-8 border-t border-slate-200 px-4 py-12 lg:grid-cols-[minmax(280px,380px)_1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Módulos principales</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.02em]">Gestión escolar con estructura de producción</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {modules.map(([title, text]) => (
              <article className="border border-slate-200 bg-white p-5" key={title}>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="reportes" className="mx-auto grid max-w-7xl gap-8 border-t border-slate-200 px-4 py-12 lg:grid-cols-[1fr_420px]">
          <div className="border border-slate-200 bg-white p-6">
            <div className="grid gap-4 md:grid-cols-3">
              {reportHighlights.map(({ label, value, icon: Icon }) => (
                <div className="border border-slate-100 p-4" key={label}>
                  <Icon className="text-accent" size={24} />
                  <p className="mt-4 text-xs uppercase tracking-wide text-slate-500">{label}</p>
                  <p className="mt-2 font-semibold">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="min-h-56 border border-slate-100 bg-slate-50 p-5">
                <GraduationCap className="text-brand" size={32} />
                <p className="mt-8 text-3xl font-semibold">Reportes por estudiante</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">Fechas, horas, estados, excusas convertidas y señales por color.</p>
              </div>
              <div className="min-h-56 border border-slate-100 bg-slate-50 p-5">
                <BarChart3 className="text-brand" size={32} />
                <p className="mt-8 text-3xl font-semibold">Reportes por curso</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">Lectura institucional para dirección, coordinación y seguimiento.</p>
              </div>
            </div>
          </div>
          <div className="border border-slate-200 bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cómo opera</p>
            <div className="mt-5 divide-y divide-slate-200">
              {processSteps.map((step, index) => (
                <div className="grid grid-cols-[48px_1fr] gap-4 py-4" key={step}>
                  <span className="flex h-10 w-10 items-center justify-center border border-slate-300 text-sm font-semibold">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <p className="text-sm leading-6 text-slate-600">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="contacto" className="mx-auto max-w-7xl border-t border-slate-200 px-4 py-10">
          <div className="grid gap-6 border border-slate-200 bg-white p-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contacto del administrador</p>
              <h2 className="mt-2 text-2xl font-semibold">compuhelp.rd@gmail.com</h2>
              <p className="mt-1 text-sm text-slate-600">+1 (829) 616-6060</p>
            </div>
            <Link className="btn-primary" to="/login">
              Entrar al sistema <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
