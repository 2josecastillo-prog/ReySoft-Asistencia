# Protecciones OWASP Top 10

Fecha: 2026-05-26

Este documento mapea los controles actuales de ReySoft-Asistencia contra OWASP Top 10:2025. OWASP define este listado como un documento de concienciacion para desarrolladores sobre los riesgos criticos mas comunes en aplicaciones web.

## A01 Broken Access Control

Controles implementados:

- Roles obligatorios por endpoint: `super_admin`, `school_admin`, `staff` y acceso de padres.
- Dependencias `get_current_user`, `require_role`, `ensure_active_organization` y validaciones por organizacion.
- Consultas escolares filtradas por `organization_id`.
- Super admin sin `organization_id`; usuarios escolares con organizacion obligatoria.
- Padres solo ven estudiantes/asistencias asociados a su tutor.
- Pruebas de no acceso cruzado entre organizaciones.

## A02 Security Misconfiguration

Controles implementados:

- `SecurityHeadersMiddleware` en FastAPI.
- Cabeceras equivalentes en `vercel.json`.
- CSP, HSTS en produccion, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- `TrustedHostMiddleware` con allowlist configurable por `TRUSTED_HOSTS`.
- CORS con origenes, metodos y cabeceras explicitas.
- Rechazo de `SECRET_KEY` por defecto en produccion.
- `X-Request-ID` para trazabilidad operativa de solicitudes y errores.
- Guardia de `Content-Type` para rechazar escrituras con tipos inesperados.

## A03 Software Supply Chain Failures

Controles implementados:

- Dependencias fijadas por version en `backend/requirements.txt`, `requirements.txt`, `pyproject.toml` y `frontend/package-lock.json`.
- SQLAlchemy actualizado a `2.0.49` para compatibilidad con el entorno local actual sin cambiar la API del proyecto.
- Builds reproducibles con `npm ci` en Vercel.

Practica pendiente recomendada:

- Agregar auditoria periodica con `npm audit`, `pip-audit` o dependabot antes de cada release.

## A04 Cryptographic Failures

Controles implementados:

- Passwords con bcrypt.
- JWT firmados con `SECRET_KEY`, expiracion, issuer, audience, `iat`, `nbf`, `jti` y version de token.
- Cookies de sesion `HttpOnly`, `SameSite=Lax` y `Secure` en produccion.
- CSRF token firmado con HMAC-SHA256 usando `SECRET_KEY`.
- No se expone `password_hash` en respuestas.

## A05 Injection

Controles implementados:

- SQLAlchemy ORM con parametros enlazados.
- Pydantic valida payloads de entrada.
- Validaciones de emails, colores hex, telefonos y estados enum.
- Importacion de Excel/CSV procesada por parsers estructurados.
- WhatsApp link codifica el texto antes de construir la URL.

## A06 Insecure Design

Controles implementados:

- Modelo multiempresa por `organizations`.
- Constraints, indices y FKs para integridad.
- Restricciones de tutor principal unico, asistencia diaria y duplicados por organizacion.
- Organizaciones inactivas bloqueadas aun con credenciales validas.
- Límite de tamano de request para reducir abuso por payloads excesivos.
- Rate limiting por IP para login, padres, asistencia, importacion y exportacion.
- Capa central `apply_security_layer(app)` para aplicar defensas de forma consistente.

## A07 Authentication Failures

Controles implementados:

- Login con bcrypt y JWT.
- Tokens revocables por `token_version` cuando cambia la contrasena.
- Expiracion de JWT configurable.
- Bloqueo por organizacion `pending`, `suspended`, `cancelled` o expirada.
- Rate limiting en autenticacion.
- Acceso de padres separado por token con `scope=parent`.

## A08 Software or Data Integrity Failures

Controles implementados:

- Migraciones Alembic versionadas.
- Constraints de PostgreSQL para reglas criticas.
- Auditoria de mutaciones importantes.
- Importacion de estudiantes valida curso, tutor principal y pertenencia a la organizacion.
- No se confia en IDs del cliente sin validar pertenencia.

## A09 Security Logging and Alerting Failures

Controles implementados:

- `audit_logs` para activaciones, suspensiones, cancelaciones, creacion/edicion de estudiantes, tutores, asistencia, configuracion visual y acciones administrativas.
- Super admin puede consultar auditoria filtrada por centro.
- Notificaciones internas y en tiempo real para eventos relevantes.
- Errores inesperados se registran en logs del backend sin exponer detalles al cliente.

## A10 Mishandling of Exceptional Conditions

Controles implementados:

- Handler global de excepciones no controladas con respuesta generica en espanol.
- Errores de negocio devuelven mensajes claros sin stack traces.
- Requests con cuerpo excesivo devuelven `413`.
- CSRF invalido devuelve `403`.
- Host no permitido devuelve `400`.

## Pruebas agregadas

Archivo: `backend/tests/test_owasp_controls.py`

Cubre:

- Escritura autenticada por cookie sin CSRF se bloquea.
- Escritura autenticada por cookie con CSRF valido se permite.
- Cliente API con bearer token no requiere cookie CSRF.
- Request demasiado grande se rechaza con `413`.
- Host desconocido se rechaza.
