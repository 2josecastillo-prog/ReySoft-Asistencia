# Rate limiting y WAF

Fecha de actualizacion: 2026-05-25

## Rate limiting en FastAPI

El backend incluye `RateLimitMiddleware`, configurado en `backend/app/core/rate_limit.py`.

Reglas activas por defecto:

- `POST /auth/login`: 5 solicitudes por minuto por IP.
- `POST /parents/login`: 8 solicitudes por minuto por IP.
- `POST /attendance`: 60 solicitudes por minuto por IP.
- `POST /students/import`: 10 solicitudes por hora por IP.
- `GET /students/export`: 30 solicitudes por hora por IP.
- `GET /reports/attendance/*/export`: 30 solicitudes por hora por IP.
- Resto de endpoints API: 120 solicitudes por minuto por IP.

Cuando se supera un limite, la API responde:

- HTTP `429 Too Many Requests`.
- `Retry-After`.
- `X-RateLimit-Limit`.
- `X-RateLimit-Remaining`.

Variables de entorno:

```env
RATE_LIMIT_ENABLED=true
RATE_LIMIT_DEFAULT_REQUESTS_PER_MINUTE=120
RATE_LIMIT_AUTH_REQUESTS_PER_MINUTE=5
RATE_LIMIT_PARENT_AUTH_REQUESTS_PER_MINUTE=8
RATE_LIMIT_ATTENDANCE_REQUESTS_PER_MINUTE=60
RATE_LIMIT_IMPORT_REQUESTS_PER_HOUR=10
RATE_LIMIT_EXPORT_REQUESTS_PER_HOUR=30
```

Nota operativa: el limiter actual es en memoria por instancia. En Vercel Serverless funciona como proteccion basica por instancia, pero no como contador global perfecto. Para multiples instancias persistentes se recomienda mover los contadores a Redis.

## WAF en Vercel

Vercel Firewall tiene DDoS automatico. En este proyecto se publico una regla WAF adicional:

- `ReySoft block common probes`
- Accion: `deny`.
- Duracion: `1h`.
- Bloquea rutas comunes de escaneo:
  - `/.env`
  - `/.git`
  - `/wp-admin`
  - `/wp-login.php`
  - `/wp-content`
  - `/xmlrpc.php`
  - `/phpmyadmin`
  - `/vendor/`
  - `/config.php`

## Limitacion del plan actual

Al intentar crear reglas WAF de tipo `rate_limit`, Vercel devolvio:

```text
Rate limiting is not available for this plan (401)
```

Por eso el rate limiting queda aplicado en backend. Si se actualiza el plan de Vercel a uno que soporte WAF Rate Limiting, se deben crear reglas equivalentes en edge para:

- `/api/auth/login`: 5/min por IP.
- `/api/parents/login`: 8/min por IP.
- `/api/*`: 120/min por IP.
- `/api/students/import`: 10/hora por IP.
- `/api/students/export`: 30/hora por IP.
- `/api/reports/attendance/*/export`: 30/hora por IP.

Comando de verificacion:

```bash
vercel firewall rules list --expand
```
