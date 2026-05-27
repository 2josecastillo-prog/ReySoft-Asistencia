import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const siteUrl = 'https://reysoft-asistencia.vercel.app';
const siteName = 'ReySoft-Asistencia';
const organizationName = 'ReySoft Multiservices';
const adminContactEmail = 'compuhelp.rd@gmail.com';
const adminContactPhone = '+1 (829) 616-6060';
const defaultDescription =
  'Software de asistencia escolar para centros educativos: estudiantes, tutores, cursos, reportes, WhatsApp y portal de padres en una plataforma segura.';
const publicTitle = 'ReySoft-Asistencia | Software de asistencia escolar para centros educativos';
const privateTitle = 'ReySoft-Asistencia | Plataforma escolar segura';

const noIndexPrefixes = ['/login', '/parents/login', '/parents', '/admin', '/dashboard'];

function upsertMeta(selector: string, attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function upsertLink(rel: string, href: string, hreflang?: string) {
  const selector = hreflang ? `link[rel="${rel}"][hreflang="${hreflang}"]` : `link[rel="${rel}"]`;
  let element = document.head.querySelector<HTMLLinkElement>(selector);
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    if (hreflang) element.setAttribute('hreflang', hreflang);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

function upsertJsonLd(id: string, data: unknown) {
  let element = document.getElementById(id) as HTMLScriptElement | null;
  if (!element) {
    element = document.createElement('script');
    element.id = id;
    element.type = 'application/ld+json';
    document.head.appendChild(element);
  }
  element.textContent = JSON.stringify(data);
}

function removeElement(id: string) {
  document.getElementById(id)?.remove();
}

function publicStructuredData() {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: organizationName,
      url: siteUrl,
      logo: `${siteUrl}/logo.svg`,
      email: adminContactEmail,
      contactPoint: [
        {
          '@type': 'ContactPoint',
          contactType: 'sales',
          email: adminContactEmail,
          telephone: adminContactPhone,
          availableLanguage: ['es']
        }
      ]
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: siteName,
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Web',
      url: siteUrl,
      description: defaultDescription,
      featureList: [
        'Control de asistencia escolar',
        'Reportes por estudiante y curso',
        'Gestion de tutores y estudiantes',
        'Mensajes de WhatsApp para tutores',
        'Portal de padres',
        'Administracion multiempresa para centros educativos'
      ]
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Que es ReySoft-Asistencia?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'ReySoft-Asistencia es una plataforma web para centros educativos que centraliza asistencia, estudiantes, tutores, reportes y comunicacion por WhatsApp.'
          }
        },
        {
          '@type': 'Question',
          name: 'La informacion de cada centro educativo esta separada?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Si. Cada centro trabaja con datos aislados por organizacion y los usuarios escolares solo acceden a la informacion de su propio centro.'
          }
        },
        {
          '@type': 'Question',
          name: 'Los padres pueden consultar asistencia?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Si. Los tutores registrados pueden acceder al portal de padres mediante su numero de telefono y ver estudiantes asociados y asistencias.'
          }
        }
      ]
    }
  ];
}

export function Seo() {
  const location = useLocation();

  useEffect(() => {
    const isPrivateRoute = noIndexPrefixes.some((prefix) => location.pathname.startsWith(prefix));
    const canonicalUrl = isPrivateRoute ? `${siteUrl}/` : `${siteUrl}${location.pathname}`;
    const title = isPrivateRoute ? privateTitle : publicTitle;
    const robots = isPrivateRoute ? 'noindex,nofollow,noarchive' : 'index,follow,max-image-preview:large';

    document.title = title;
    upsertMeta('meta[name="description"]', 'name', 'description', defaultDescription);
    upsertMeta('meta[name="robots"]', 'name', 'robots', robots);
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', title);
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', defaultDescription);
    upsertMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', defaultDescription);
    upsertLink('canonical', canonicalUrl);
    upsertLink('alternate', `${siteUrl}/`, 'es-DO');

    if (isPrivateRoute) {
      removeElement('reysoft-public-jsonld');
    } else {
      upsertJsonLd('reysoft-public-jsonld', publicStructuredData());
    }
  }, [location.pathname]);

  return null;
}
