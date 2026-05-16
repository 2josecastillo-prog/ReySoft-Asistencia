from collections import Counter, defaultdict
from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.permissions import ensure_school_user
from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.models import AttendanceRecord, AttendanceStatus, Student, User
from app.schemas.report import AttendanceCourseReport, AttendanceReportRecord, AttendanceStudentReport

router = APIRouter(prefix="/reports", tags=["reports"])


def _risk_from_equivalent_absences(equivalent_absences: int) -> tuple[str, str]:
    if equivalent_absences >= 6:
        return "danger", "red"
    if equivalent_absences >= 3:
        return "warning", "amber"
    return "ok", "green"


def _empty_counts() -> Counter[str]:
    return Counter(
        {
            AttendanceStatus.arrived.value: 0,
            AttendanceStatus.absent.value: 0,
            AttendanceStatus.late.value: 0,
            AttendanceStatus.early_pickup.value: 0,
            AttendanceStatus.excused.value: 0,
        }
    )


def _report_record(record: AttendanceRecord, student: Student) -> AttendanceReportRecord:
    return AttendanceReportRecord(
        id=record.id,
        student_id=record.student_id,
        student_name=student.full_name,
        attendance_date=record.attendance_date,
        status=record.status.value,
        arrival_time=record.arrival_time,
        departure_time=record.departure_time,
        display_time=record.arrival_time or record.departure_time,
        notes=record.notes,
    )


def _build_student_reports(
    db: Session,
    current_user: User,
    start_date: date | None,
    end_date: date | None,
    course_id: UUID | None,
    include_inactive: bool,
) -> list[AttendanceStudentReport]:
    query = (
        select(Student)
        .options(selectinload(Student.course))
        .where(Student.organization_id == current_user.organization_id)
    )
    if course_id:
        query = query.where(Student.course_id == course_id)
    if not include_inactive:
        query = query.where(Student.is_active.is_(True))
    students = db.scalars(query.order_by(Student.full_name)).all()
    if not students:
        return []

    student_ids = [student.id for student in students]
    attendance_query = select(AttendanceRecord).where(
        AttendanceRecord.organization_id == current_user.organization_id,
        AttendanceRecord.student_id.in_(student_ids),
    )
    if start_date:
        attendance_query = attendance_query.where(AttendanceRecord.attendance_date >= start_date)
    if end_date:
        attendance_query = attendance_query.where(AttendanceRecord.attendance_date <= end_date)

    students_by_id = {student.id: student for student in students}
    counts_by_student: defaultdict[UUID, Counter[str]] = defaultdict(_empty_counts)
    records_by_student: defaultdict[UUID, list[AttendanceReportRecord]] = defaultdict(list)
    for record in db.scalars(attendance_query.order_by(AttendanceRecord.attendance_date, AttendanceRecord.created_at)):
        counts_by_student[record.student_id][record.status.value] += 1
        records_by_student[record.student_id].append(_report_record(record, students_by_id[record.student_id]))

    reports: list[AttendanceStudentReport] = []
    for student in students:
        counts = counts_by_student[student.id]
        excused_equivalent = counts[AttendanceStatus.excused.value] // 3
        equivalent_absences = counts[AttendanceStatus.absent.value] + excused_equivalent
        risk_level, risk_color = _risk_from_equivalent_absences(equivalent_absences)
        reports.append(
            AttendanceStudentReport(
                student_id=student.id,
                student_name=student.full_name,
                student_code=student.student_code,
                course_id=student.course_id,
                course_name=student.course.name,
                course_section=student.course.section,
                course_academic_year=student.course.academic_year,
                arrived_count=counts[AttendanceStatus.arrived.value],
                absent_count=counts[AttendanceStatus.absent.value],
                late_count=counts[AttendanceStatus.late.value],
                early_pickup_count=counts[AttendanceStatus.early_pickup.value],
                excused_count=counts[AttendanceStatus.excused.value],
                excused_absence_equivalent=excused_equivalent,
                equivalent_absences=equivalent_absences,
                total_records=sum(counts.values()),
                risk_level=risk_level,
                risk_color=risk_color,
                records=records_by_student[student.id],
            )
        )
    return sorted(reports, key=lambda row: (-row.equivalent_absences, row.student_name))


@router.get("/attendance/students", response_model=list[AttendanceStudentReport])
def attendance_by_student(
    start_date: date | None = None,
    end_date: date | None = None,
    course_id: UUID | None = None,
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_school_user(current_user)
    return _build_student_reports(db, current_user, start_date, end_date, course_id, include_inactive)


@router.get("/attendance/courses", response_model=list[AttendanceCourseReport])
def attendance_by_course(
    start_date: date | None = None,
    end_date: date | None = None,
    course_id: UUID | None = None,
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_school_user(current_user)
    student_reports = _build_student_reports(db, current_user, start_date, end_date, course_id, include_inactive)
    grouped: dict[UUID, list[AttendanceStudentReport]] = defaultdict(list)
    for report in student_reports:
        grouped[report.course_id].append(report)

    course_reports: list[AttendanceCourseReport] = []
    for grouped_course_id, rows in grouped.items():
        first = rows[0]
        risk_counts = Counter(row.risk_level for row in rows)
        equivalent_absences = sum(row.equivalent_absences for row in rows)
        risk_level, risk_color = _risk_from_equivalent_absences(equivalent_absences)
        records = sorted(
            [record for row in rows for record in row.records],
            key=lambda record: (record.attendance_date, record.student_name, record.display_time is None, record.display_time),
        )
        course_reports.append(
            AttendanceCourseReport(
                course_id=grouped_course_id,
                course_name=first.course_name,
                course_section=first.course_section,
                course_academic_year=first.course_academic_year,
                student_count=len(rows),
                arrived_count=sum(row.arrived_count for row in rows),
                absent_count=sum(row.absent_count for row in rows),
                late_count=sum(row.late_count for row in rows),
                early_pickup_count=sum(row.early_pickup_count for row in rows),
                excused_count=sum(row.excused_count for row in rows),
                excused_absence_equivalent=sum(row.excused_absence_equivalent for row in rows),
                equivalent_absences=equivalent_absences,
                total_records=sum(row.total_records for row in rows),
                ok_students=risk_counts["ok"],
                warning_students=risk_counts["warning"],
                danger_students=risk_counts["danger"],
                risk_level=risk_level,
                risk_color=risk_color,
                records=records,
            )
        )
    return sorted(course_reports, key=lambda row: (-row.equivalent_absences, row.course_name))
