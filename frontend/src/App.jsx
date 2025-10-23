import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import ReceptionDashboard from './pages/ReceptionDashboard'
import DoctorDashboard from './pages/DoctorDashboard'
import PatientsListPage from './pages/PatientsListPage'
import AppointmentsPage from './pages/AppointmentsPage'
import PaymentsPage from './pages/PaymentsPage'
import ReportsPage from './pages/ReportsPage'
import ProtectedRoute from './components/common/ProtectedRoute'
import ErrorBoundary from './components/common/ErrorBoundary'

function App() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background-500 font-arabic" dir="rtl">
        <Routes>
            <Route 
              path="/login" 
              element={<Login />}
            />
            <Route 
              path="/reception" 
              element={
                <ProtectedRoute allowedRoles={['receptionist', 'admin']}>
                  <ReceptionDashboard />
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
              path="/patients" 
              element={
                <ProtectedRoute allowedRoles={['receptionist', 'admin']}>
                  <PatientsListPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/appointments" 
              element={
                <ProtectedRoute allowedRoles={['receptionist', 'admin']}>
                  <AppointmentsPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/payments" 
              element={
                <ProtectedRoute allowedRoles={['receptionist', 'admin']}>
                  <PaymentsPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/reports" 
              element={
                <ProtectedRoute allowedRoles={['receptionist', 'admin']}>
                  <ReportsPage />
                </ProtectedRoute>
              } 
            />
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </ErrorBoundary>
  )
}

export default App
