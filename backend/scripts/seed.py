from datetime import date, time

from sqlalchemy import select

from app.core.config import settings
from app.core.security import hash_password
from app.database.session import SessionLocal
from app.models import (
    AttendanceRecord,
    AttendanceStatus,
    Course,
    Guardian,
    Organization,
    OrganizationStatus,
    Student,
    StudentGuardian,
    User,
    UserRole,
)
from app.services.templates import create_default_whatsapp_templates


SUPER_ADMIN_EMAIL = settings.initial_super_admin_email
SUPER_ADMIN_PASSWORD = settings.initial_super_admin_password
SCHOOL_ADMIN_EMAIL = "admin@colegioprueba.edu.do"
SCHOOL_ADMIN_PASSWORD = "SchoolAdmin123!"
STAFF_EMAIL = "staff@colegioprueba.edu.do"
STAFF_PASSWORD = "Staff12345!"
SEED_ATTENDANCE_DATE = date(2026, 5, 12)


def get_or_create_super_admin(db):
    user = db.scalar(select(User).where(User.email == SUPER_ADMIN_EMAIL))
    if user:
        return user
    user = User(
        organization_id=None,
        full_name="Administrador Global ReySoft-Asistencia",
        email=SUPER_ADMIN_EMAIL,
        password_hash=hash_password(SUPER_ADMIN_PASSWORD),
        role=UserRole.super_admin,
        is_active=True,
    )
    db.add(user)
    db.flush()
    return user


def run_seed() -> None:
    db = SessionLocal()
    try:
        get_or_create_super_admin(db)
        organization = db.scalar(select(Organization).where(Organization.email == "contacto@colegioprueba.edu.do"))
        if not organization:
            organization = Organization(
                name="Colegio Prueba Dominicana",
                email="contacto@colegioprueba.edu.do",
                phone="8095550000",
                logo_url="https://placehold.co/160x160?text=CPD",
                footer_text="Colegio Prueba Dominicana - Información para familias y personal.",
                primary_color="#2563EB",
                secondary_color="#1E293B",
                accent_color="#F59E0B",
                status=OrganizationStatus.active,
            )
            db.add(organization)
            db.flush()
            create_default_whatsapp_templates(db, organization)
        elif not organization.footer_text:
            organization.footer_text = "Colegio Prueba Dominicana - Información para familias y personal."

        school_admin = db.scalar(select(User).where(User.email == SCHOOL_ADMIN_EMAIL))
        if not school_admin:
            school_admin = User(
                organization_id=organization.id,
                full_name="Admin Colegio Prueba",
                email=SCHOOL_ADMIN_EMAIL,
                password_hash=hash_password(SCHOOL_ADMIN_PASSWORD),
                role=UserRole.school_admin,
                is_active=True,
            )
            db.add(school_admin)
            db.flush()

        staff_user = db.scalar(select(User).where(User.email == STAFF_EMAIL))
        if not staff_user:
            staff_user = User(
                organization_id=organization.id,
                full_name="Auxiliar de Asistencia",
                email=STAFF_EMAIL,
                password_hash=hash_password(STAFF_PASSWORD),
                role=UserRole.staff,
                is_active=True,
            )
            db.add(staff_user)
            db.flush()
        else:
            staff_user.organization_id = organization.id
            staff_user.password_hash = hash_password(STAFF_PASSWORD)
            staff_user.role = UserRole.staff
            staff_user.is_active = True

        course = db.scalar(
            select(Course).where(
                Course.organization_id == organization.id,
                Course.name == "Primero",
                Course.section == "A",
                Course.academic_year == "2026-2027",
            )
        )
        if not course:
            course = Course(
                organization_id=organization.id,
                name="Primero",
                section="A",
                academic_year="2026-2027",
                is_active=True,
            )
            db.add(course)
            db.flush()

        guardian = db.scalar(select(Guardian).where(Guardian.organization_id == organization.id, Guardian.phone == "8095551234"))
        if not guardian:
            guardian = Guardian(
                organization_id=organization.id,
                full_name="María Rodríguez",
                phone="8095551234",
                relationship="Madre",
                is_active=True,
            )
            db.add(guardian)
            db.flush()

        student = db.scalar(select(Student).where(Student.organization_id == organization.id, Student.student_code == "CPD-001"))
        if not student:
            student = Student(
                organization_id=organization.id,
                course_id=course.id,
                full_name="Luis Pérez Rodríguez",
                student_code="CPD-001",
                is_active=True,
            )
            db.add(student)
            db.flush()
            db.add(StudentGuardian(student_id=student.id, guardian_id=guardian.id, is_primary=True))

        attendance = db.scalar(
            select(AttendanceRecord).where(
                AttendanceRecord.student_id == student.id,
                AttendanceRecord.attendance_date == SEED_ATTENDANCE_DATE,
            )
        )
        if not attendance:
            db.add(
                AttendanceRecord(
                    organization_id=organization.id,
                    student_id=student.id,
                    recorded_by_user_id=school_admin.id,
                    attendance_date=SEED_ATTENDANCE_DATE,
                    status=AttendanceStatus.arrived,
                    arrival_time=time(7, 45),
                    notes="Seed de desarrollo",
                )
            )
        legacy_seed_attendance = db.scalars(
            select(AttendanceRecord).where(
                AttendanceRecord.student_id == student.id,
                AttendanceRecord.attendance_date != SEED_ATTENDANCE_DATE,
                AttendanceRecord.notes == "Seed de desarrollo",
            )
        ).all()
        for record in legacy_seed_attendance:
            db.delete(record)
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()
    print("Seed completado.")
    print(f"Administrador global: {SUPER_ADMIN_EMAIL} / {SUPER_ADMIN_PASSWORD}")
    print(f"Administrador del centro: {SCHOOL_ADMIN_EMAIL} / {SCHOOL_ADMIN_PASSWORD}")
    print(f"Personal: {STAFF_EMAIL} / {STAFF_PASSWORD}")
