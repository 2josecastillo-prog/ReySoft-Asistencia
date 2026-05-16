from enum import Enum


class OrganizationStatus(str, Enum):
    pending = "pending"
    active = "active"
    suspended = "suspended"
    cancelled = "cancelled"


class UserRole(str, Enum):
    super_admin = "super_admin"
    school_admin = "school_admin"
    staff = "staff"


class AttendanceStatus(str, Enum):
    arrived = "arrived"
    absent = "absent"
    late = "late"
    early_pickup = "early_pickup"
    excused = "excused"


class SubscriptionStatus(str, Enum):
    active = "active"
    expired = "expired"
    cancelled = "cancelled"
    manual = "manual"


class NotificationType(str, Enum):
    info = "info"
    success = "success"
    warning = "warning"
    error = "error"
    new_registration = "new_registration"
    activation = "activation"
