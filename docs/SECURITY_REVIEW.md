# ReySoft-Asistencia Security Review

Date: 2026-05-15

## Threat Model

Primary assets:

- Student, guardian, attendance and organization records.
- Super admin activation controls.
- JWT signing secret and password hashes.
- Tenant isolation boundaries.

Trust boundaries:

- Public landing and login endpoints.
- Authenticated school API endpoints.
- Super admin API endpoints.
- PostgreSQL persistence layer.
- Local uploaded media storage.
- Browser local storage containing JWT.

Attacker-controlled inputs:

- Login credentials.
- CRUD payloads for school users.
- IDs in route paths.
- WhatsApp template text.
- Logo image uploads and visual customization colors.

## Controls Verified

- Passwords are hashed with bcrypt and never returned in schemas.
- JWT tokens include expiration and use `SECRET_KEY`.
- Production refuses the default `SECRET_KEY`.
- School users must belong to an active organization.
- Super admin can operate without `organization_id`.
- School endpoints filter by `organization_id`.
- Cross-organization route access returns not found or forbidden.
- Expired activations automatically suspend the organization before school or parent access is granted.
- Colors are validated as hex values.
- Tutor phone numbers are cleaned before persistence/link generation.
- Logo uploads are limited to PNG, JPG and WEBP files with a bounded size.
- One attendance per student per day is enforced.
- One primary guardian per student is enforced by a partial unique index and service logic.
- Important mutations write audit logs.

## Findings

No high-confidence exploitable cross-tenant, authentication bypass, password exposure, or privileged action bypass was found in the implemented code during this pass.

## Residual Risks

- JWT is stored in browser local storage; production deployments should pair this with strict HTTPS, CSP, short token lifetimes and careful XSS prevention.
- Uploaded logos are stored on local disk; production deployments must persist and back up `UPLOAD_DIR`.
- Parent access by phone only remains intentionally lightweight because OTP was removed by product decision.
