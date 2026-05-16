# ReySoft-Asistencia Backend

## Local Setup

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
alembic upgrade head
python -m scripts.seed
uvicorn app.main:app --reload
```

## Test Credentials

- Super admin: `superadmin@reysoft-asistencia.com` / `SuperAdmin123!`
- School admin: `admin@colegioprueba.edu.do` / `SchoolAdmin123!`
- Staff: `staff@colegioprueba.edu.do` / `Staff12345!`

## Main Commands

```powershell
alembic upgrade head
python -m scripts.seed
pytest
```

## API Groups

- `POST /auth/login`
- `GET /auth/me`
- `POST /admin/organizations`
- `PUT /admin/organizations/{organization_id}`
- `POST /admin/organizations/{organization_id}/logo`
- `/admin/*`
- `/courses`
- `/guardians`
- `/users`
- `/students`
- `GET /students/export`
- `POST /students/import`
- `/attendance`
- `/reports/attendance/students`
- `/reports/attendance/courses`
- `POST /parents/login`
- `GET /parents/me`
- `GET /parents/students`
- `GET /parents/attendance`
- `/whatsapp`
- `/organization/settings`
- `POST /organization/settings/logo`
- `/dashboard/school`

Los centros educativos ya no se registran desde una ruta publica. El `super_admin` crea cada centro y su primer usuario `school_admin` desde `POST /admin/organizations` o desde el panel global.

Los logos se suben como archivos `PNG`, `JPG` o `WEBP`. En local el backend los guarda en `UPLOAD_DIR/logos` y devuelve una ruta publica `/uploads/logos/...`. En Vercel debe usarse `STORAGE_BACKEND=supabase` para guardarlos en Supabase Storage. Cada centro tambien puede tener un texto de pie de pagina configurable desde su configuracion o al ser creado por el `super_admin`.

La importacion/exportacion de estudiantes acepta `.xlsx` y CSV compatible con Excel. Para exportar CSV usa `GET /students/export?file_format=csv`; el CSV se genera en UTF-8 con BOM para abrir acentos correctamente en Excel.

## Vercel + Supabase

Consulta `../docs/DEPLOYMENT_VERCEL_SUPABASE.md`. Para Vercel Functions con Supabase usa `DATABASE_POOL_MODE=null` y una cadena `DATABASE_URL` con `postgresql+psycopg://...`.
