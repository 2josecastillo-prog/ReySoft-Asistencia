# ReySoft-Asistencia Frontend

## Local Setup

```powershell
npm install
npm run dev
```

Set the backend URL with:

```powershell
$env:VITE_API_URL="http://localhost:8000"
```

## Routes

- `/`
- `/login`
- `/admin`
- `/dashboard`
- `/dashboard/courses`
- `/dashboard/guardians`
- `/dashboard/students`
- `/dashboard/attendance`
- `/dashboard/whatsapp`
- `/dashboard/settings`

Los centros educativos se crean desde `/admin` por un usuario `super_admin`. No existe ruta publica de registro.
