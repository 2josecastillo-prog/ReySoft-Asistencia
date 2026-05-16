import { AttendanceStatus, OrganizationStatus, UserRole } from '../types';

export const organizationStatusLabels: Record<OrganizationStatus, string> = {
  pending: 'Pendiente',
  active: 'Activo',
  suspended: 'Suspendido',
  cancelled: 'Cancelado'
};

export const attendanceStatusLabels: Record<AttendanceStatus, string> = {
  arrived: 'Llegó',
  absent: 'Ausente',
  late: 'Tarde',
  early_pickup: 'Retiro temprano',
  excused: 'Excusado'
};

export const userRoleLabels: Record<UserRole, string> = {
  super_admin: 'Administrador global',
  school_admin: 'Administrador del centro',
  staff: 'Personal'
};

export function labelFor(value?: string | null): string {
  if (!value) return '';
  return (
    organizationStatusLabels[value as OrganizationStatus] ??
    attendanceStatusLabels[value as AttendanceStatus] ??
    userRoleLabels[value as UserRole] ??
    value
  );
}
