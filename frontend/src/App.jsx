import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import DashboardPage from './pages/DashboardPage'
import DoctorDashboard from './pages/DoctorDashboard'
import PatientsListPage from './pages/PatientsListPage'
import AppointmentsPage from './pages/AppointmentsPage'
import PaymentsPage from './pages/PaymentsPage'
import ReportsPage from './pages/ReportsPage'
import QueueManagementPage from './pages/QueueManagementPage'
import ClinicsAndDoctorsPage from './pages/ClinicsAndDoctorsPage'
import CurrentAppointmentPage from './pages/CurrentAppointmentPage'
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
              path="/reception/dashboard" 
              element={
                <ProtectedRoute allowedRoles={['receptionist', 'admin', 'doctor']}>
                  <AppShell>
                    <DashboardPage />
                  </AppShell>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/reception" 
              element={<Navigate to="/reception/dashboard" replace />} 
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
                <ProtectedRoute allowedRoles={['receptionist', 'admin', 'doctor']}>
                  <AppShell>
                    <PatientsListPage />
                  </AppShell>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/reception/appointments" 
              element={
                <ProtectedRoute allowedRoles={['receptionist', 'admin', 'doctor']}>
                  <AppShell>
                    <AppointmentsPage />
                  </AppShell>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/reception/payments" 
              element={
                <ProtectedRoute allowedRoles={['receptionist', 'admin', 'doctor']}>
                  <AppShell>
                    <PaymentsPage />
                  </AppShell>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/reception/reports" 
              element={
                <ProtectedRoute allowedRoles={['receptionist', 'admin', 'doctor']}>
                  <AppShell>
                    <ReportsPage />
                  </AppShell>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/reception/clinics-doctors" 
              element={
                <ProtectedRoute allowedRoles={['receptionist', 'admin', 'doctor']}>
                  <AppShell>
                    <ClinicsAndDoctorsPage />
                  </AppShell>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/reception/queue" 
              element={
                <ProtectedRoute allowedRoles={['receptionist', 'admin', 'doctor']}>
                  <AppShell>
                    <QueueManagementPage />
                  </AppShell>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/doctor/current-appointment" 
              element={
                <ProtectedRoute allowedRoles={['doctor', 'admin']}>
                  <AppShell>
                    <CurrentAppointmentPage />
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
