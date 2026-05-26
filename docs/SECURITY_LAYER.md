# Capa de seguridad de ReySoft-Asistencia

Fecha: 2026-05-26

La capa de seguridad se centraliza en `backend/app/core/security_layer.py` y se aplica desde `backend/app/main.py` mediante `apply_security_layer(app)`.

## Controles incluidos

1. `RequestIdMiddleware`

- Genera o preserva `X-Request-ID`.
- Permite rastrear errores, respuestas y eventos en logs.
- Si el ID recibido no cumple formato seguro, genera un UUID nuevo.

2. `SecurityHeadersMiddleware`

- Aplica CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` y `Cross-Origin-Opener-Policy`.
- En produccion agrega HSTS.
- Desactiva cache en rutas sensibles.

3. `TrustedHostMiddleware`

- Permite solo hosts definidos por `TRUSTED_HOSTS`.
- Reduce riesgos de host header injection.

4. `CsrfProtectionMiddleware`

- Protege acciones `POST`, `PUT`, `PATCH` y `DELETE` autenticadas por cookie.
- Usa token CSRF firmado por HMAC y enviado por `X-CSRF-Token`.
- Mantiene compatibilidad con clientes API que usan `Authorization: Bearer`.

5. `RequestSizeLimitMiddleware`

- Rechaza solicitudes cuyo `Content-Length` exceda `MAX_REQUEST_BODY_BYTES`.
- Responde `413` antes de procesar validaciones de negocio.

6. `ContentTypeGuardMiddleware`

- Rechaza escrituras con cuerpo y `Content-Type` fuera de la lista permitida.
- Por defecto permite `application/json` y `multipart/form-data`.
- Responde `415` para tipos inesperados como `text/plain`.

7. `RateLimitMiddleware`

- Aplica limites por IP a login, acceso de padres, asistencia, importacion, exportacion y trafico API general.
- Devuelve `429` y cabeceras `X-RateLimit-*`.

8. CORS explicito

- Permite solo origenes configurados por `CORS_ORIGINS`.
- Limita metodos y cabeceras conocidas.

## Variables de entorno relacionadas

- `CORS_ORIGINS`
- `TRUSTED_HOSTS`
- `CSRF_PROTECTION_ENABLED`
- `CSRF_COOKIE_NAME`
- `CSRF_HEADER_NAME`
- `REQUEST_ID_HEADER_NAME`
- `CONTENT_TYPE_GUARD_ENABLED`
- `ALLOWED_WRITE_CONTENT_TYPES`
- `MAX_REQUEST_BODY_BYTES`
- `RATE_LIMIT_*`

## Pruebas relacionadas

- `backend/tests/test_security_layer.py`
- `backend/tests/test_owasp_controls.py`
- `backend/tests/test_rate_limit.py`
- Pruebas de autenticacion y roles en `backend/tests/test_api.py`
