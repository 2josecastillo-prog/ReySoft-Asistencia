# ReySoft-Asistencia Architecture

ReySoft-Asistencia is a SaaS application for educational centers. The central tenancy boundary is `organizations.id`; every school-owned record stores `organization_id`, and API routes filter by the authenticated user's organization.

## Backend

- FastAPI exposes REST endpoints grouped by domain.
- SQLAlchemy models mirror the official PostgreSQL schema and Alembic owns production DDL.
- Authentication uses bcrypt password hashes and JWT bearer tokens.
- Authorization is role-based: `super_admin`, `school_admin`, and `staff`.
- School users must belong to an active organization before accessing protected school modules.
- Important actions write audit logs with user, organization, entity and request metadata.
- Expired subscription activations are synchronized before school or parent access, automatically moving the organization to `suspended`.

## Database

The schema is normalized to third normal form:

- `students.course_id` references `courses`; course names are not duplicated in students.
- guardians and students are many-to-many through `student_guardians`.
- WhatsApp templates are one per attendance status per organization: `arrived`, `absent`, `late`, `early_pickup` and `excused`.
- Attendance records allow one main daily status per student/date plus one optional `early_pickup` record for the same day.
- Attendance reports summarize records by student and by course, and include the detailed dates, times and statuses behind each total. Three `excused` records count as one equivalent absence for risk highlighting.
- Partial unique index enforces one primary guardian per student.

## Frontend

- React, Vite, TypeScript and Tailwind CSS.
- AuthContext stores the JWT, loads `/auth/me`, and applies organization colors through CSS variables.
- Organization branding includes logo, colors and configurable footer text per school; the super admin can create and later edit the registered school profile.
- Public routes: `/`, `/login`, `/parents/login`.
- Super admin route: `/admin`.
- School route group: `/dashboard/*`.
- Parent route: `/parents`, backed by a guardian token issued from the registered phone number.
- Students can be exported and imported through `.xlsx` or Excel-compatible `.csv` files scoped to the authenticated school organization.

## Production Notes

- Payment is external. School creation, activation, suspension and cancellation are manual super admin actions.
- Activations can include an optional expiration date; once that date is in the past, access is blocked automatically.
- PostgreSQL backups should be created with `pg_dump` and restored with `psql`.
- Secrets must be supplied through `.env`, not committed.
