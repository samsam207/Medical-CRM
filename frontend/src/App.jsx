import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import DashboardPage from './pages/DashboardPage'
import DoctorDashboard from './pages/DoctorDashboard'
import PatientsListPage from './pages/PatientsListPage'
import AppointmentsPage from './pages/AppointmentsPage'
import PaymentsPage from './pages/PaymentsPage'
import ReportsPage from './pages/ReportsPage'
import QueueManagementPage from './pages/QueueManagementPage'
import ClinicsDoctorsPage from './pages/ClinicsDoctorsPage'
import ProtectedRoute from './components/common/ProtectedRoute'
import ErrorBoundary from './components/common/ErrorBoundary'
import AppShell from './components/layout/AppShell'
import { LayoutProvider } from './contexts/LayoutContext'

function App() {
  return (
    <ErrorBoundary>
      <LayoutProvider>
        <div className="min-h-screen bg-gray-50 font-arabic" dir="rtl">
          <Routes>
            <Route 
              path="/login" 
              element={<Login />}
            />
            <Route 
              path="/reception" 
              element={
                <ProtectedRoute allowedRoles={['receptionist', 'admin']}>
                  <AppShell>
                    <DashboardPage />
                  </AppShell>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/doctor" 
              element={
                <ProtectedRoute allowedRoles={['doctor', 'admin']}>
                  <DoctorDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/reception/patients" 
              element={
                <ProtectedRoute allowedRoles={['receptionist', 'admin']}>
                  <AppShell>
                    <PatientsListPage />
                  </AppShell>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/reception/appointments" 
              element={
                <ProtectedRoute allowedRoles={['receptionist', 'admin']}>
                  <AppShell>
                    <AppointmentsPage />
                  </AppShell>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/reception/payments" 
              element={
                <ProtectedRoute allowedRoles={['receptionist', 'admin']}>
                  <AppShell>
                    <PaymentsPage />
                  </AppShell>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/reception/reports" 
              element={
                <ProtectedRoute allowedRoles={['receptionist', 'admin']}>
                  <AppShell>
                    <ReportsPage />
                  </AppShell>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/reception/clinics-doctors" 
              element={
                <ProtectedRoute allowedRoles={['receptionist', 'admin']}>
                  <AppShell>
                    <ClinicsDoctorsPage />
                  </AppShell>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/reception/queue" 
              element={
                <ProtectedRoute allowedRoles={['receptionist', 'admin']}>
                  <AppShell>
                    <QueueManagementPage />
                  </AppShell>
                </ProtectedRoute>
              } 
            />
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </LayoutProvider>
    </ErrorBoundary>
  )
}

export default App
