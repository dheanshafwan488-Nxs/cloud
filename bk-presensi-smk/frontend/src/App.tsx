import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { SchoolSettingsProvider } from './hooks/useSchoolSettings'
import { ProtectedRoute } from './layouts/ProtectedRoute'
import { DashboardLayout } from './layouts/DashboardLayout'
import { RoleGuard } from './layouts/RoleGuard'

// Pages
import { LoginPage } from './pages/auth/LoginPage'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { StudentListPage } from './pages/students/StudentListPage'
import { StudentDetailPage } from './pages/students/StudentDetailPage'
import { ClassListPage } from './pages/classes/ClassListPage'
import { ClassDetailPage } from './pages/classes/ClassDetailPage'
import { AttendanceDailyPage } from './pages/attendance/AttendanceDailyPage'
import { ViolationListPage } from './pages/violations/ViolationListPage'
import { ComplaintListPage } from './pages/complaints/ComplaintListPage'
import { ComplaintCreatePage } from './pages/complaints/ComplaintCreatePage'
import { ComplaintDetailPage } from './pages/complaints/ComplaintDetailPage'
import { CounselingPage } from './pages/counseling/CounselingPage'
import { ReportsPage } from './pages/reports/ReportsPage'
import { UserListPage } from './pages/users/UserListPage'
import { SettingsPage } from './pages/settings/SettingsPage'
import { ProfilePage } from './pages/profile/ProfilePage'

export function App() {
  return (
    <SchoolSettingsProvider>
      <AuthProvider>
      <Routes>
        {/* Public Login Route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Dashboard Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* Students */}
            <Route path="/students" element={<StudentListPage />} />
            <Route path="/students/:id" element={<StudentDetailPage />} />

            {/* Classes */}
            <Route
              path="/classes"
              element={
                <RoleGuard roles={['admin', 'guru_bk']}>
                  <ClassListPage />
                </RoleGuard>
              }
            />
            <Route
              path="/classes/:id"
              element={
                <RoleGuard roles={['admin', 'guru_bk']}>
                  <ClassDetailPage />
                </RoleGuard>
              }
            />

            {/* Attendance */}
            <Route
              path="/attendance"
              element={
                <RoleGuard roles={['admin', 'wali_kelas', 'guru_bk']}>
                  <AttendanceDailyPage />
                </RoleGuard>
              }
            />

            {/* Violations */}
            <Route
              path="/violations"
              element={
                <RoleGuard roles={['admin', 'guru_bk']}>
                  <ViolationListPage />
                </RoleGuard>
              }
            />

            {/* Complaints & Counseling */}
            <Route path="/complaints" element={<ComplaintListPage />} />
            <Route path="/complaints/create" element={<ComplaintCreatePage />} />
            <Route path="/complaints/:id" element={<ComplaintDetailPage />} />
            <Route
              path="/counseling"
              element={
                <RoleGuard roles={['admin', 'guru_bk']}>
                  <CounselingPage />
                </RoleGuard>
              }
            />

            {/* Reports */}
            <Route
              path="/reports"
              element={
                <RoleGuard roles={['admin', 'guru_bk', 'wali_kelas']}>
                  <ReportsPage />
                </RoleGuard>
              }
            />

            {/* Profile (All Authenticated Users) */}
            <Route path="/profile" element={<ProfilePage />} />

            {/* Users & Settings (Admin Only) */}
            <Route
              path="/users"
              element={
                <RoleGuard roles={['admin']}>
                  <UserListPage />
                </RoleGuard>
              }
            />
            <Route
              path="/settings"
              element={
                <RoleGuard roles={['admin']}>
                  <SettingsPage />
                </RoleGuard>
              }
            />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
    </SchoolSettingsProvider>
  )
}

export default App
