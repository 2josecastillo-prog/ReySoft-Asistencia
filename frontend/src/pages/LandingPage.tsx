import { ArrowRight, CheckCircle2, MessageCircle, Phone, ShieldCheck, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProjectLogo } from '../components/ProjectLogo';

const heroImage =
  'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1800&q=80';

export function LandingPage() {
  return (
    <div className="bg-white">
      <section className="relative min-h-[86vh] overflow-hidden">
        <img src={heroImage} alt="Centro educativo usando ReySoft-Asistencia" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-slate-950/65" />
        <div className="relative mx-auto flex min-h-[86vh] max-w-6xl flex-col justify-center px-5 py-20 text-white">
          <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-amber-300">SaaS para centros educativos</p>
          <ProjectLogo className="h-24 w-auto max-w-[min(92vw,520px)] drop-shadow-[0_12px_24px_rgba(0,0,0,0.5)]" />
          <h1 className="sr-only">ReySoft-Asistencia</h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-100">
            Control de asistencia, datos escolares aislados por centro y acceso para padres mediante teléfono registrado.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="btn-primary" to="/login">
              Iniciar sesión <ArrowRight size={18} />
            </Link>
            <Link className="btn-secondary border-white/30 bg-white/10 text-white hover:bg-white/20" to="/parents/login">
              <Phone size={18} /> Acceso padres
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-5 py-14 md:grid-cols-3">
        {[
          ['Problema', 'Los registros manuales dispersan asistencia, tutores y mensajes críticos.'],
          ['Beneficios', 'Cada centro opera con datos propios, roles definidos y estado de servicio controlado.'],
          ['Cómo funciona', 'El administrador global registra el centro, crea su administrador y habilita el acceso autorizado.']
        ].map(([title, text]) => (
          <div className="rounded-lg border border-slate-200 p-6" key={title}>
            <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
          </div>
        ))}
      </section>

      <section className="bg-slate-50 py-14">
        <div className="mx-auto grid max-w-6xl gap-5 px-5 md:grid-cols-3">
          {[
            { icon: ShieldCheck, title: 'Multiempresa seguro', text: 'Aislamiento por centro educativo en todos los módulos escolares.' },
            { icon: Users, title: 'Gestión escolar', text: 'Cursos, tutores, estudiantes, relaciones y asistencia diaria.' },
            { icon: MessageCircle, title: 'WhatsApp precargado', text: 'Plantillas por estado con variables dinámicas y tutor principal.' }
          ].map(({ icon: Icon, title, text }) => (
            <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-200" key={title}>
              <Icon className="text-blue-600" size={28} />
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid gap-3 md:grid-cols-2">
          {['Alta privada por administrador global', 'Auditoría de acciones importantes', 'Personalización de logo y colores', 'Portal de padres por teléfono'].map((item) => (
            <div className="flex items-center gap-3 rounded-md border border-slate-200 p-4" key={item}>
              <CheckCircle2 className="text-emerald-600" size={20} />
              <span className="text-sm font-medium text-slate-700">{item}</span>
            </div>
          ))}
        </div>
        <div className="mt-10 rounded-lg bg-slate-950 p-8 text-white">
          <h2 className="text-2xl font-semibold">Contacto del administrador</h2>
          <p className="mt-2 text-slate-300">admin@reysoft-asistencia.com - +1 809 555 0000</p>
        </div>
      </section>
    </div>
  );
}
