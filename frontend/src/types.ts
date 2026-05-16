export type OrganizationStatus = 'pending' | 'active' | 'suspended' | 'cancelled';
export type UserRole = 'super_admin' | 'school_admin' | 'staff';
export type AttendanceStatus = 'arrived' | 'absent' | 'late' | 'early_pickup' | 'excused';

export interface Organization {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  logo_url?: string | null;
  footer_text?: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  status: OrganizationStatus;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  organization_id?: string | null;
  full_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  organization?: Organization | null;
}

export interface Course {
  id: string;
  organization_id: string;
  name: string;
  section?: string | null;
  academic_year?: string | null;
  is_active: boolean;
}

export interface Guardian {
  id: string;
  organization_id: string;
  full_name: string;
  phone: string;
  relationship?: string | null;
  is_active: boolean;
}

export interface Student {
  id: string;
  organization_id: string;
  course_id: string;
  full_name: string;
  student_code?: string | null;
  is_active: boolean;
}

export interface AttendanceRecord {
  id: string;
  organization_id: string;
  student_id: string;
  recorded_by_user_id?: string | null;
  attendance_date: string;
  status: AttendanceStatus;
  arrival_time?: string | null;
  departure_time?: string | null;
  notes?: string | null;
}

export interface WhatsAppTemplate {
  id: string;
  organization_id: string;
  status: AttendanceStatus;
  template_text: string;
  is_active: boolean;
}

export type AttendanceRiskLevel = 'ok' | 'warning' | 'danger';
export type AttendanceRiskColor = 'green' | 'amber' | 'red';

export interface AttendanceReportRecord {
  id: string;
  student_id: string;
  student_name: string;
  attendance_date: string;
  status: AttendanceStatus;
  arrival_time?: string | null;
  departure_time?: string | null;
  display_time?: string | null;
  notes?: string | null;
}

export interface AttendanceReportBase {
  arrived_count: number;
  absent_count: number;
  late_count: number;
  early_pickup_count: number;
  excused_count: number;
  excused_absence_equivalent: number;
  equivalent_absences: number;
  total_records: number;
  risk_level: AttendanceRiskLevel;
  risk_color: AttendanceRiskColor;
  records: AttendanceReportRecord[];
}

export interface AttendanceStudentReport extends AttendanceReportBase {
  student_id: string;
  student_name: string;
  student_code?: string | null;
  course_id: string;
  course_name: string;
  course_section?: string | null;
  course_academic_year?: string | null;
}

export interface AttendanceCourseReport extends AttendanceReportBase {
  course_id: string;
  course_name: string;
  course_section?: string | null;
  course_academic_year?: string | null;
  student_count: number;
  ok_students: number;
  warning_students: number;
  danger_students: number;
}

export interface ParentGuardian {
  id: string;
  organization_id: string;
  full_name: string;
  phone: string;
  relationship?: string | null;
  organization: Organization;
}

export interface ParentLoginResponse {
  access_token: string;
  token_type: string;
  guardian: ParentGuardian;
}

export interface ParentStudent {
  id: string;
  full_name: string;
  student_code?: string | null;
  course_id: string;
  course_name: string;
  course_section?: string | null;
  course_academic_year?: string | null;
  organization_name: string;
}

export interface ParentAttendanceRecord {
  id: string;
  student_id: string;
  student_name: string;
  attendance_date: string;
  status: AttendanceStatus;
  arrival_time?: string | null;
  departure_time?: string | null;
  display_time?: string | null;
  notes?: string | null;
}
