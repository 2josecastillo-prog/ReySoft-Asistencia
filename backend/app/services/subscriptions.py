from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    Notification,
    NotificationType,
    Organization,
    OrganizationStatus,
    SubscriptionActivation,
    SubscriptionStatus,
)
from app.services.audit import create_audit_log


def _latest_activation(db: Session, organization_id) -> SubscriptionActivation | None:
    return db.scalar(
        select(SubscriptionActivation)
        .where(
            SubscriptionActivation.organization_id == organization_id,
            SubscriptionActivation.status.in_([SubscriptionStatus.active, SubscriptionStatus.manual]),
        )
        .order_by(SubscriptionActivation.activation_date.desc(), SubscriptionActivation.created_at.desc())
        .limit(1)
    )


def sync_expired_organization(db: Session, organization: Organization | None) -> bool:
    if not organization or organization.status != OrganizationStatus.active:
        return False

    activation = _latest_activation(db, organization.id)
    if not activation or not activation.expiration_date or activation.expiration_date >= date.today():
        return False

    old_status = organization.status.value
    organization.status = OrganizationStatus.suspended
    activation.status = SubscriptionStatus.expired
    db.add(
        Notification(
            user_id=None,
            organization_id=organization.id,
            title="Centro suspendido automaticamente",
            message=f"{organization.name} fue suspendido porque su activacion expiro el {activation.expiration_date}.",
            type=NotificationType.warning,
        )
    )
    create_audit_log(
        db,
        action="auto_suspend_expired_organization",
        user=None,
        organization_id=organization.id,
        entity_name="organizations",
        entity_id=organization.id,
        old_data={"status": old_status, "activation_id": str(activation.id)},
        new_data={
            "status": organization.status.value,
            "activation_status": activation.status.value,
            "expiration_date": activation.expiration_date.isoformat(),
        },
    )
    db.flush()
    return True


def sync_expired_organizations(db: Session) -> int:
    organizations = db.scalars(select(Organization).where(Organization.status == OrganizationStatus.active)).all()
    expired_count = 0
    for organization in organizations:
        if sync_expired_organization(db, organization):
            expired_count += 1
    if expired_count:
        db.commit()
    return expired_count
