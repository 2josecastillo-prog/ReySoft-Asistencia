# ReySoft-Asistencia

ReySoft-Asistencia is a professional SaaS starter for educational centers. It includes a FastAPI backend, PostgreSQL schema with Alembic, React/Vite frontend, role-based access control, JWT authentication, school-level data isolation and Docker deployment files.

Educational centers are created by the `super_admin`; schools do not self-register through a public form. Once created, school users can log in only if their organization is active.

School logos are uploaded as image files through the app. Each school can also define its own footer text for the school dashboard and parent portal. In local mode logos are stored under `backend/uploads/logos/`; Docker mode persists them in the `backend-uploads` volume.

School admins can import and export students with `.xlsx` Excel files or Excel-compatible `.csv` files from the students screen.

## Run Locally On Windows

```powershell
.\run-local.bat
```

The local runner prepares PostgreSQL in `.pgdata` on `localhost:55432`, installs dependencies when needed, runs Alembic migrations, runs the development seed, and starts backend/frontend in the background:

- Frontend: `http://127.0.0.1:5173`
- Backend API: `http://127.0.0.1:8000`
- Parent portal: `http://127.0.0.1:5173/parents/login`

Useful runner commands:

```powershell
.\run-local.bat --stop
.\run-local.bat --reinstall
.\run-local.bat --docker
```

## Run with Docker

```powershell
Copy-Item backend/.env.example backend/.env
docker compose up --build
```

Then run the seed:

```powershell
docker compose exec backend python -m scripts.seed
```

Frontend: `http://localhost:5173`  
Backend API: `http://localhost:8000`

## Deploy with Vercel and Supabase

The project includes `vercel.json`, `api/index.py`, root `requirements.txt`, and Supabase-ready storage/database settings.

Follow the deployment guide:

```text
docs/DEPLOYMENT_VERCEL_SUPABASE.md
```

## Technical Documentation

- `docs/current_database_schema.sql`: current PostgreSQL schema.
- `docs/REGLAS_NEGOCIO_Y_LOGICA.md`: current business rules and application logic.

## Test Credentials

- Super admin: `compuhelp.rd@gmail.com` / valor de `INITIAL_SUPER_ADMIN_PASSWORD` en `backend/.env`
- School admin: `admin@colegioprueba.edu.do` / `SchoolAdmin123!`
- Staff: `staff@colegioprueba.edu.do` / `Staff12345!`
- Parent portal phone: `8095551234`

## Manual Setup

Backend:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
alembic upgrade head
python -m scripts.seed
uvicorn app.main:app --reload
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

## PostgreSQL Backup

```powershell
docker compose exec postgres pg_dump -U reysoft_asistencia -d reysoft_asistencia > reysoft_asistencia_backup.sql
```

## PostgreSQL Restore

```powershell
Get-Content reysoft_asistencia_backup.sql | docker compose exec -T postgres psql -U reysoft_asistencia -d reysoft_asistencia
```

## Production Checklist

- Replace `SECRET_KEY` with a long random value.
- Restrict `CORS_ORIGINS` to production domains.
- For Vercel + Supabase, set `DATABASE_POOL_MODE=null`.
- For logo uploads on Vercel, set `STORAGE_BACKEND=supabase` and configure Supabase Storage.
- Run `alembic upgrade head` before serving traffic.
- Seed or create the first `super_admin`.
- Configure PostgreSQL backups and restore drills.
- Persist and back up uploaded logos from `UPLOAD_DIR`.
- Serve frontend through HTTPS and a production CDN or reverse proxy.
