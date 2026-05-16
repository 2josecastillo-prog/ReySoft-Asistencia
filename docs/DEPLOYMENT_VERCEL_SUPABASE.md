# Despliegue con Vercel y Supabase

Esta guia deja `ReySoft-Asistencia` preparado para usar:

- Vercel como hosting del frontend React/Vite.
- Vercel Functions para exponer FastAPI en `/api`.
- Supabase PostgreSQL como base de datos.
- Supabase Storage como almacenamiento persistente de logos.

## 1. Crear el proyecto en Supabase

1. Entra a Supabase y crea un proyecto nuevo.
2. Copia la cadena de conexion desde `Database > Connect`.
3. Para Vercel usa preferiblemente la conexion con pooler/transaction pooler.
4. Cambia el protocolo para SQLAlchemy:

```text
postgresql+psycopg://USER:PASSWORD@HOST:PORT/DATABASE
```

## 2. Ejecutar migraciones contra Supabase

Desde tu maquina local:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
$env:DATABASE_URL="postgresql+psycopg://USER:PASSWORD@HOST:PORT/DATABASE"
alembic upgrade head
python -m scripts.seed
```

El seed es opcional en produccion. Si lo ejecutas, cambia inmediatamente las contrasenas iniciales.

## 3. Preparar Storage para logos

1. En Supabase, abre `Storage`.
2. Crea un bucket publico llamado `school-logos`.
3. Mantén la `service_role key` solo como variable secreta del backend en Vercel.
4. No expongas `SUPABASE_SERVICE_ROLE_KEY` en el frontend.

Los logos quedan publicados como:

```text
https://PROJECT_REF.supabase.co/storage/v1/object/public/school-logos/logos/archivo.png
```

## 4. Variables de entorno en Vercel

Configura estas variables en el proyecto de Vercel:

```env
APP_NAME=ReySoft-Asistencia
ENVIRONMENT=production
DEBUG=false
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST:PORT/DATABASE
DATABASE_POOL_MODE=null
SECRET_KEY=CAMBIA_ESTE_VALOR_POR_UN_SECRETO_LARGO
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
CORS_ORIGINS=https://TU-DOMINIO.vercel.app
INITIAL_SUPER_ADMIN_EMAIL=superadmin@reysoft-asistencia.com
INITIAL_SUPER_ADMIN_PASSWORD=CAMBIA_ESTA_CONTRASENA
STORAGE_BACKEND=supabase
SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY
SUPABASE_STORAGE_BUCKET=school-logos
MAX_LOGO_UPLOAD_BYTES=2097152
VITE_API_URL=/api
```

Si agregas un dominio propio, añade ese dominio a `CORS_ORIGINS`.

## 5. Importar en Vercel

1. Sube el repositorio a GitHub.
2. En Vercel, selecciona `Add New > Project`.
3. Importa el repositorio.
4. Deja la raiz del proyecto en la raiz del repositorio.
5. Vercel usara `vercel.json`:
   - `buildCommand`: `cd frontend && npm ci && npm run build`
   - `outputDirectory`: `frontend/dist`
   - API FastAPI: `api/index.py`
   - Rewrites SPA: todas las rutas no API van a `index.html`.

## 6. Verificaciones despues del deploy

Abre estas rutas:

```text
https://TU-DOMINIO.vercel.app/
https://TU-DOMINIO.vercel.app/login
https://TU-DOMINIO.vercel.app/api/health
```

Luego prueba:

- Login del `super_admin`.
- Crear un centro.
- Subir logo del centro.
- Login del centro creado.
- Exportar/importar estudiantes.
- Reportes de asistencia.

## 7. Notas de produccion

- Usa `DATABASE_POOL_MODE=null` con Vercel Functions para evitar acumulacion de conexiones en funciones serverless.
- Ejecuta migraciones antes de recibir trafico.
- Usa una `SECRET_KEY` larga, unica y privada.
- Restringe `CORS_ORIGINS` a tus dominios reales.
- La `service_role key` de Supabase solo debe estar en variables secretas del backend.
- Programa backups desde Supabase o con `pg_dump` contra la base remota.
