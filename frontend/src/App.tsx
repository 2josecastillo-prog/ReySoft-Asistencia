import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AttendancePage } from './pages/AttendancePage';
import { CoursesPage } from './pages/CoursesPage';
import { GuardiansPage } from './pages/GuardiansPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { ParentLoginPage } from './pages/ParentLoginPage';
import { ParentPortalPage } from './pages/ParentPortalPage';
import { ReportsPage } from './pages/ReportsPage';
import { SchoolDashboardPage } from './pages/SchoolDashboardPage';
import { SettingsPage } from './pages/SettingsPage';
import { StaffUsersPage } from './pages/StaffUsersPage';
import { StudentsPage } from './pages/StudentsPage';
import { WhatsAppPage } from './pages/WhatsAppPage';
import { DashboardLayout } from './layouts/DashboardLayout';
import { ProtectedRoute } from './routes/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/parents/login" element={<ParentLoginPage />} />
      <Route path="/parents" element={<ParentPortalPage />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['super_admin']}>
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute roles={['school_admin', 'staff']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<SchoolDashboardPage />} />
        <Route path="courses" element={<CoursesPage />} />
        <Route path="guardians" element={<GuardiansPage />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="whatsapp" element={<WhatsAppPage />} />
        <Route
          path="users"
          element={
            <ProtectedRoute roles={['school_admin']}>
              <StaffUsersPage />
            </ProtectedRoute>
          }
        />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
