# Estrategia SEO de ReySoft-Asistencia

Fecha: 2026-05-27

## Objetivo

Mejorar la capacidad del sitio publico de ReySoft-Asistencia para ser rastreado, entendido e indexado por buscadores. No se puede garantizar una posicion numero 1 en Google solo con codigo, porque el ranking depende tambien de autoridad del dominio, competencia, backlinks, comportamiento de usuarios, contenido nuevo, velocidad real, reputacion y busquedas locales. Esta implementacion deja una base tecnica y on-page fuerte para competir.

## Palabras clave principales

- software de asistencia escolar
- control de asistencia escolar
- sistema de asistencia para colegios
- plataforma escolar para centros educativos
- gestion de estudiantes y tutores
- reportes de asistencia escolar
- portal de padres escolar
- asistencia escolar por WhatsApp

## Implementaciones tecnicas

1. Metadatos base en `frontend/index.html`

- `title` descriptivo.
- `meta description` enfocada en valor real.
- `robots` para indexacion de la pagina publica.
- `canonical` apuntando al dominio principal.
- `hreflang` para `es-DO`.
- Open Graph y Twitter Card.
- `theme-color`, manifest y favicon.

2. SEO dinamico en React

Archivo: `frontend/src/components/Seo.tsx`

- Actualiza `title`, descripcion, canonical, OG y Twitter por ruta.
- Marca rutas privadas o de login como `noindex,nofollow,noarchive`.
- Inserta JSON-LD solo en la pagina publica.

3. Rastreo

Archivos:

- `frontend/public/robots.txt`
- `frontend/public/sitemap.xml`

El sitemap expone solo la landing publica. Login, panel, portal de padres y API no se incluyen porque no deben competir en resultados de busqueda.

4. Datos estructurados

Se agregan esquemas JSON-LD:

- `Organization`
- `SoftwareApplication`
- `FAQPage`

Esto ayuda a los buscadores a entender que ReySoft-Asistencia es una aplicacion web educativa, cual es su proposito y que preguntas frecuentes responde.

5. Contenido on-page

La landing ahora incluye:

- H1 visible con keyword principal.
- Secciones semanticas con `section`, `article`, `h2`, `h3`.
- Beneficios concretos.
- Modulos del sistema.
- Preguntas frecuentes visibles.
- Contacto en `address`.

6. Noindex de zonas privadas

Las rutas privadas se protegen en dos niveles:

- `Seo.tsx` agrega `robots noindex` cuando la SPA navega a rutas privadas.
- Backend agrega `X-Robots-Tag: noindex, nofollow` en rutas sensibles de API.

## Acciones posteriores recomendadas

1. Crear Google Search Console para el dominio.
2. Enviar `https://reysoft-asistencia.vercel.app/sitemap.xml`.
3. Medir indexacion con `site:reysoft-asistencia.vercel.app`.
4. Crear contenido publico adicional:

- guia de control de asistencia escolar
- comparativa entre asistencia manual y digital
- beneficios del portal de padres
- reportes de asistencia para colegios

5. Conseguir enlaces reales desde sitios relacionados:

- centros educativos
- blogs educativos
- directorios de software escolar
- perfiles institucionales

6. Medir Core Web Vitals y optimizar imagenes si el trafico crece.

## Limitaciones honestas

- Un SPA en React puede indexarse, pero una landing prerenderizada o SSR suele ofrecer mejores garantias de rastreo inicial.
- El dominio necesita autoridad y enlaces externos para competir por terminos amplios.
- La posicion numero 1 no depende solo de metadatos; requiere estrategia de contenido, autoridad y seguimiento continuo.
