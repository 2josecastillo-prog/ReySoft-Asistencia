from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.permissions import ensure_school_admin, ensure_school_user
from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.models import Course, User
from app.schemas.course import CourseCreate, CourseResponse, CourseUpdate

router = APIRouter(prefix="/courses", tags=["courses"])


def _get_course_or_404(db: Session, course_id: UUID, organization_id: UUID) -> Course:
    course = db.scalar(select(Course).where(Course.id == course_id, Course.organization_id == organization_id))
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curso no encontrado.")
    return course


def _course_duplicate_exists(db: Session, organization_id: UUID, payload: CourseCreate | CourseUpdate, exclude_id: UUID | None = None) -> bool:
    if not payload.name:
        return False
    query = select(Course.id).where(
        Course.organization_id == organization_id,
        Course.name == payload.name,
        Course.section == payload.section,
        Course.academic_year == payload.academic_year,
    )
    if exclude_id:
        query = query.where(Course.id != exclude_id)
    return db.scalar(query.limit(1)) is not None


@router.post("", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
def create_course(
    payload: CourseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_school_admin(current_user)
    organization_id = current_user.organization_id
    if _course_duplicate_exists(db, organization_id, payload):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe un curso con esa sección y año escolar.")
    course = Course(organization_id=organization_id, **payload.model_dump())
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


@router.get("", response_model=list[CourseResponse])
def list_courses(
    is_active: bool | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_school_user(current_user)
    query = select(Course).where(Course.organization_id == current_user.organization_id)
    if is_active is not None:
        query = query.where(Course.is_active == is_active)
    if search:
        query = query.where(Course.name.ilike(f"%{search}%"))
    return db.scalars(query.order_by(Course.name)).all()


@router.get("/{course_id}", response_model=CourseResponse)
def get_course(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_school_user(current_user)
    return _get_course_or_404(db, course_id, current_user.organization_id)


@router.put("/{course_id}", response_model=CourseResponse)
def update_course(
    course_id: UUID,
    payload: CourseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_school_admin(current_user)
    course = _get_course_or_404(db, course_id, current_user.organization_id)
    update_data = payload.model_dump(exclude_unset=True)
    candidate = CourseCreate(
        name=update_data.get("name", course.name),
        section=update_data.get("section", course.section),
        academic_year=update_data.get("academic_year", course.academic_year),
        is_active=update_data.get("is_active", course.is_active),
    )
    if _course_duplicate_exists(db, current_user.organization_id, candidate, exclude_id=course.id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe un curso con esa sección y año escolar.")
    for field, value in update_data.items():
        setattr(course, field, value)
    db.commit()
    db.refresh(course)
    return course


@router.delete("/{course_id}", response_model=CourseResponse)
def delete_course(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_school_admin(current_user)
    course = _get_course_or_404(db, course_id, current_user.organization_id)
    course.is_active = False
    db.commit()
    db.refresh(course)
    return course

