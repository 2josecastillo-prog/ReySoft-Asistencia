-- ReySoft-Asistencia current PostgreSQL schema
-- Consolidated from Alembic revisions through 20260516_0004.
-- This file is a reference/export of the current schema, not a replacement for Alembic.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE organization_status AS ENUM (
    'pending',
    'active',
    'suspended',
    'cancelled'
);

CREATE TYPE user_role AS ENUM (
    'super_admin',
    'school_admin',
    'staff'
);

CREATE TYPE attendance_status AS ENUM (
    'arrived',
    'absent',
    'late',
    'early_pickup',
    'excused'
);

CREATE TYPE subscription_status AS ENUM (
    'active',
    'expired',
    'cancelled',
    'manual'
);

CREATE TYPE notification_type AS ENUM (
    'info',
    'success',
    'warning',
    'error',
    'new_registration',
    'activation'
);

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(30),
    logo_url TEXT,
    footer_text TEXT,
    primary_color VARCHAR(20) NOT NULL DEFAULT '#2563EB',
    secondary_color VARCHAR(20) NOT NULL DEFAULT '#1E293B',
    accent_color VARCHAR(20) NOT NULL DEFAULT '#F59E0B',
    status organization_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_organization_primary_color
    CHECK (primary_color ~ '^#[0-9A-Fa-f]{6}$'),

    CONSTRAINT chk_organization_secondary_color
    CHECK (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),

    CONSTRAINT chk_organization_accent_color
    CHECK (accent_color ~ '^#[0-9A-Fa-f]{6}$'),

    CONSTRAINT ck_organizations_organization_footer_text_length
    CHECK (footer_text IS NULL OR length(footer_text) <= 500)
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NULL REFERENCES organizations(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role user_role NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_super_admin_without_organization
    CHECK (
        (role = 'super_admin' AND organization_id IS NULL)
        OR
        (role IN ('school_admin', 'staff') AND organization_id IS NOT NULL)
    )
);

CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    section VARCHAR(50),
    academic_year VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_course_per_organization
    UNIQUE (organization_id, name, section, academic_year)
);

CREATE TABLE guardians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    relationship VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    full_name VARCHAR(150) NOT NULL,
    student_code VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_student_code_per_organization
    UNIQUE (organization_id, student_code)
);

CREATE TABLE student_guardians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    guardian_id UUID NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_student_guardian
    UNIQUE (student_id, guardian_id)
);

CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    recorded_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    attendance_date DATE NOT NULL,
    status attendance_status NOT NULL,
    arrival_time TIME,
    departure_time TIME,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE whatsapp_message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    status attendance_status NOT NULL,
    template_text TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_template_status_per_organization
    UNIQUE (organization_id, status)
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type notification_type NOT NULL DEFAULT 'info',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE subscription_activations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    activated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    activation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiration_date DATE,
    status subscription_status NOT NULL DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_name VARCHAR(100),
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address VARCHAR(100),
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE alembic_version (
    version_num VARCHAR(32) NOT NULL,
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);

INSERT INTO alembic_version (version_num)
VALUES ('20260516_0004');

CREATE INDEX idx_organizations_status
ON organizations(status);

CREATE INDEX idx_users_organization_id
ON users(organization_id);

CREATE INDEX idx_users_role
ON users(role);

CREATE INDEX idx_courses_organization_id
ON courses(organization_id);

CREATE INDEX idx_guardians_organization_id
ON guardians(organization_id);

CREATE INDEX idx_students_organization_id
ON students(organization_id);

CREATE INDEX idx_students_course_id
ON students(course_id);

CREATE INDEX idx_student_guardians_student_id
ON student_guardians(student_id);

CREATE INDEX idx_student_guardians_guardian_id
ON student_guardians(guardian_id);

CREATE UNIQUE INDEX uq_one_primary_guardian_per_student
ON student_guardians(student_id)
WHERE is_primary = TRUE;

CREATE INDEX idx_attendance_organization_id
ON attendance_records(organization_id);

CREATE INDEX idx_attendance_student_id
ON attendance_records(student_id);

CREATE INDEX idx_attendance_date
ON attendance_records(attendance_date);

CREATE INDEX idx_attendance_status
ON attendance_records(status);

CREATE UNIQUE INDEX uq_attendance_regular_record_per_student_day
ON attendance_records(student_id, attendance_date)
WHERE status != 'early_pickup';

CREATE UNIQUE INDEX uq_attendance_early_pickup_per_student_day
ON attendance_records(student_id, attendance_date)
WHERE status = 'early_pickup';

CREATE INDEX idx_whatsapp_templates_organization_id
ON whatsapp_message_templates(organization_id);

CREATE INDEX idx_notifications_user_id
ON notifications(user_id);

CREATE INDEX idx_notifications_is_read
ON notifications(is_read);

CREATE INDEX idx_subscription_organization_id
ON subscription_activations(organization_id);

CREATE INDEX idx_audit_logs_organization_id
ON audit_logs(organization_id);

CREATE INDEX idx_audit_logs_user_id
ON audit_logs(user_id);

CREATE INDEX idx_audit_logs_action
ON audit_logs(action);
