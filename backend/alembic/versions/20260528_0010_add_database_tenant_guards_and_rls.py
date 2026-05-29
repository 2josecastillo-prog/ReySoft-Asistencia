"""add database tenant guards and rls

Revision ID: 20260528_0010
Revises: 20260528_0009
Create Date: 2026-05-28 13:30:00.000000
"""

from alembic import op


revision = "20260528_0010"
down_revision = "20260528_0009"
branch_labels = None
depends_on = None


TENANT_GUARD_UP_SQL = """
CREATE OR REPLACE FUNCTION public.enforce_student_course_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    course_organization_id uuid;
BEGIN
    SELECT organization_id INTO course_organization_id
    FROM public.courses
    WHERE id = NEW.course_id;

    IF course_organization_id IS NULL THEN
        RAISE EXCEPTION 'course_id % does not exist', NEW.course_id
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    IF course_organization_id <> NEW.organization_id THEN
        RAISE EXCEPTION 'El curso no pertenece a la organizacion del estudiante.'
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_students_course_same_organization ON public.students;
CREATE TRIGGER trg_students_course_same_organization
BEFORE INSERT OR UPDATE OF organization_id, course_id
ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.enforce_student_course_organization();

CREATE OR REPLACE FUNCTION public.enforce_student_guardian_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    student_organization_id uuid;
    guardian_organization_id uuid;
BEGIN
    SELECT organization_id INTO student_organization_id
    FROM public.students
    WHERE id = NEW.student_id;

    SELECT organization_id INTO guardian_organization_id
    FROM public.guardians
    WHERE id = NEW.guardian_id;

    IF student_organization_id IS NULL THEN
        RAISE EXCEPTION 'student_id % does not exist', NEW.student_id
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    IF guardian_organization_id IS NULL THEN
        RAISE EXCEPTION 'guardian_id % does not exist', NEW.guardian_id
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    IF student_organization_id <> guardian_organization_id THEN
        RAISE EXCEPTION 'El tutor no pertenece a la organizacion del estudiante.'
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_student_guardians_same_organization ON public.student_guardians;
CREATE TRIGGER trg_student_guardians_same_organization
BEFORE INSERT OR UPDATE OF student_id, guardian_id
ON public.student_guardians
FOR EACH ROW
EXECUTE FUNCTION public.enforce_student_guardian_organization();

CREATE OR REPLACE FUNCTION public.enforce_attendance_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    student_organization_id uuid;
    recorded_by_organization_id uuid;
    parent_message_user_organization_id uuid;
BEGIN
    SELECT organization_id INTO student_organization_id
    FROM public.students
    WHERE id = NEW.student_id;

    IF student_organization_id IS NULL THEN
        RAISE EXCEPTION 'student_id % does not exist', NEW.student_id
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    IF student_organization_id <> NEW.organization_id THEN
        RAISE EXCEPTION 'La asistencia no pertenece a la organizacion del estudiante.'
            USING ERRCODE = 'check_violation';
    END IF;

    IF NEW.recorded_by_user_id IS NOT NULL THEN
        SELECT organization_id INTO recorded_by_organization_id
        FROM public.users
        WHERE id = NEW.recorded_by_user_id;

        IF recorded_by_organization_id IS NULL OR recorded_by_organization_id <> NEW.organization_id THEN
            RAISE EXCEPTION 'El usuario que registra la asistencia no pertenece a la organizacion.'
                USING ERRCODE = 'check_violation';
        END IF;
    END IF;

    IF NEW.parent_message_sent_by_user_id IS NOT NULL THEN
        SELECT organization_id INTO parent_message_user_organization_id
        FROM public.users
        WHERE id = NEW.parent_message_sent_by_user_id;

        IF parent_message_user_organization_id IS NULL OR parent_message_user_organization_id <> NEW.organization_id THEN
            RAISE EXCEPTION 'El usuario que marco el mensaje no pertenece a la organizacion.'
                USING ERRCODE = 'check_violation';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_attendance_same_organization ON public.attendance_records;
CREATE TRIGGER trg_attendance_same_organization
BEFORE INSERT OR UPDATE OF organization_id, student_id, recorded_by_user_id, parent_message_sent_by_user_id
ON public.attendance_records
FOR EACH ROW
EXECUTE FUNCTION public.enforce_attendance_organization();
"""


RLS_UP_SQL = """
DO $$
DECLARE
    table_name text;
    table_names text[] := ARRAY[
        'organizations',
        'users',
        'courses',
        'guardians',
        'students',
        'student_guardians',
        'attendance_records',
        'whatsapp_message_templates',
        'notifications',
        'subscription_activations',
        'audit_logs',
        'alembic_version'
    ];
BEGIN
    FOREACH table_name IN ARRAY table_names LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
        EXECUTE format('DROP POLICY IF EXISTS backend_service_all ON public.%I', table_name);

        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
            EXECUTE format(
                'CREATE POLICY backend_service_all ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
                table_name
            );
        END IF;
    END LOOP;
END $$;
"""


DOWN_SQL = """
DROP TRIGGER IF EXISTS trg_attendance_same_organization ON public.attendance_records;
DROP TRIGGER IF EXISTS trg_student_guardians_same_organization ON public.student_guardians;
DROP TRIGGER IF EXISTS trg_students_course_same_organization ON public.students;

DROP FUNCTION IF EXISTS public.enforce_attendance_organization();
DROP FUNCTION IF EXISTS public.enforce_student_guardian_organization();
DROP FUNCTION IF EXISTS public.enforce_student_course_organization();

DO $$
DECLARE
    table_name text;
    table_names text[] := ARRAY[
        'organizations',
        'users',
        'courses',
        'guardians',
        'students',
        'student_guardians',
        'attendance_records',
        'whatsapp_message_templates',
        'notifications',
        'subscription_activations',
        'audit_logs',
        'alembic_version'
    ];
BEGIN
    FOREACH table_name IN ARRAY table_names LOOP
        EXECUTE format('DROP POLICY IF EXISTS backend_service_all ON public.%I', table_name);
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', table_name);
    END LOOP;
END $$;
"""


def upgrade() -> None:
    op.execute(TENANT_GUARD_UP_SQL)
    op.execute(RLS_UP_SQL)


def downgrade() -> None:
    op.execute(DOWN_SQL)
