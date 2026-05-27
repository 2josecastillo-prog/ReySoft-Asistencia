import { ArrowRight, BarChart3, CheckCircle2, ClipboardCheck, MessageCircle, Phone, ShieldCheck, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProjectLogo } from '../components/ProjectLogo';

const heroImage =
  'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1800&q=80';

const summaryItems = [
  ['Problema', 'Los registros manuales dispersan asistencia, tutores y mensajes criticos.'],
  ['Beneficios', 'Cada centro opera con datos propios, roles definidos, reportes claros y estado de servicio controlado.'],
  ['Como funciona', 'El administrador global registra el centro, crea su administrador y habilita el acceso autorizado.']
];

const featureItems = [
  { icon: ShieldCheck, title: 'Multiempresa seguro', text: 'Aislamiento por centro educativo en todos los modulos escolares.' },
  { icon: Users, title: 'Gestion escolar', text: 'Cursos, tutores, estudiantes, relaciones familiares y asistencia diaria.' },
  { icon: MessageCircle, title: 'WhatsApp escolar', text: 'Plantillas por estado con variables dinamicas y tutor principal.' },
  { icon: ClipboardCheck, title: 'Control de asistencia', text: 'Estados de llegada, ausencia, tardanza, excusa y retiro temprano.' },
  { icon: BarChart3, title: 'Reportes institucionales', text: 'Reportes por estudiante y por curso exportables para seguimiento escolar.' },
  { icon: Phone, title: 'Portal de padres', text: 'Acceso para tutores mediante telefono registrado y datos asociados.' }
];

const mainFunctions = [
  'Alta privada por administrador global',
  'Auditoria de acciones importantes',
  'Personalizacion de logo, colores y footer',
  'Portal de padres por telefono',
  'Importacion y exportacion de estudiantes en Excel y CSV',
  'Reportes de asistencia con ausencias, excusas y alertas por color'
];

const faqs = [
  [
    'Que es ReySoft-Asistencia?',
    'Es una plataforma web para centros educativos que centraliza asistencia, estudiantes, tutores, reportes y comunicacion por WhatsApp.'
  ],
  [
    'La informacion de cada centro esta separada?',
    'Si. Cada centro trabaja con datos aislados por organizacion y los usuarios escolares solo acceden a su propio centro.'
  ],
  [
    'Los padres pueden consultar asistencia?',
    'Si. Los tutores registrados acceden por telefono para ver estudiantes asociados y registros de asistencia.'
  ]
];

export function LandingPage() {
  return (
    <div className="bg-white">
      <section className="relative min-h-[86vh] overflow-hidden">
        <img
          src={heroImage}
          alt="Centro educativo usando software de asistencia escolar"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-slate-950/65" />
        <div className="relative mx-auto flex min-h-[86vh] max-w-6xl flex-col justify-center px-5 py-20 text-white">
          <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-amber-300">SaaS para centros educativos</p>
          <ProjectLogo className="h-24 w-auto max-w-[min(92vw,520px)] drop-shadow-[0_12px_24px_rgba(0,0,0,0.5)]" />
          <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-tight md:text-5xl">
            Software de asistencia escolar para centros educativos
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-100">
            ReySoft-Asistencia centraliza asistencia diaria, estudiantes, tutores, reportes institucionales,
            mensajes de WhatsApp y portal de padres en una plataforma SaaS segura.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="btn-primary" to="/login">
              Iniciar sesion <ArrowRight size={18} />
            </Link>
            <Link className="btn-secondary border-white/30 bg-white/10 text-white hover:bg-white/20" to="/parents/login">
              <Phone size={18} /> Acceso padres
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-5 py-14 md:grid-cols-3" aria-labelledby="resumen-plataforma">
        <h2 id="resumen-plataforma" className="sr-only">Resumen de la plataforma de asistencia escolar</h2>
        {summaryItems.map(([title, text]) => (
          <article className="rounded-lg border border-slate-200 p-6" key={title}>
            <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
          </article>
        ))}
      </section>

      <section className="bg-slate-50 py-14" aria-labelledby="modulos-escolares">
        <div className="mx-auto max-w-6xl px-5">
          <h2 id="modulos-escolares" className="text-2xl font-semibold text-slate-950">
            Modulos para gestion de asistencia escolar
          </h2>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {featureItems.map(({ icon: Icon, title, text }) => (
              <article className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-200" key={title}>
                <Icon className="text-blue-600" size={28} />
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14" aria-labelledby="funciones-principales">
        <h2 id="funciones-principales" className="text-2xl font-semibold text-slate-950">
          Funciones principales del sistema de asistencia escolar
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          La plataforma esta pensada para centros que necesitan ordenar datos academicos, reducir procesos manuales
          y mantener trazabilidad sobre asistencia, usuarios, tutores y comunicaciones.
        </p>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {mainFunctions.map((item) => (
            <div className="flex items-center gap-3 rounded-md border border-slate-200 p-4" key={item}>
              <CheckCircle2 className="text-emerald-600" size={20} />
              <span className="text-sm font-medium text-slate-700">{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white py-14" aria-labelledby="preguntas-frecuentes">
        <div className="mx-auto max-w-6xl px-5">
          <h2 id="preguntas-frecuentes" className="text-2xl font-semibold text-slate-950">
            Preguntas frecuentes sobre ReySoft-Asistencia
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {faqs.map(([question, answer]) => (
              <article className="rounded-lg border border-slate-200 p-5" key={question}>
                <h3 className="font-semibold text-slate-950">{question}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14" aria-labelledby="contacto-administrador">
        <div className="rounded-lg bg-slate-950 p-8 text-white">
          <h2 id="contacto-administrador" className="text-2xl font-semibold">Contacto del administrador</h2>
          <address className="mt-2 not-italic text-slate-300">
            admin@reysoft-asistencia.com - +1 809 555 0000
          </address>
        </div>
      </section>
    </div>
  );
}
