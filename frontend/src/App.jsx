import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import ProtectedRoute from './components/common/ProtectedRoute'
import ErrorBoundary from './components/common/ErrorBoundary'
import SentryErrorBoundary from './components/common/SentryErrorBoundary'
import AppShell from './components/layout/AppShell'
import { LayoutProvider } from './contexts/LayoutContext'
import Spinner from './components/common/Spinner'
import { initSentry } from './utils/sentry'

// Lazy load pages for code splitting
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const DoctorDashboard = lazy(() => import('./pages/DoctorDashboard'))
const PatientsListPage = lazy(() => import('./pages/PatientsListPage'))
const AppointmentsPage = lazy(() => import('./pages/AppointmentsPage'))
const PaymentsPage = lazy(() => import('./pages/PaymentsPage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const QueueManagementPage = lazy(() => import('./pages/QueueManagementPage'))
const ClinicsAndDoctorsPage = lazy(() => import('./pages/ClinicsAndDoctorsPage'))
const CurrentAppointmentPage = lazy(() => import('./pages/CurrentAppointmentPage'))

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Spinner size="lg" />
  </div>
)

function App() {
  // Initialize Sentry on app mount
  React.useEffect(() => {
    initSentry();
  }, []);
  
  return (
    <SentryErrorBoundary>
      <ErrorBoundary>
      <LayoutProvider>
        <div className="min-h-screen bg-gray-50 font-arabic" dir="rtl">
          <Routes>
            <Route 
              path="/login" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <Login />
                </Suspense>
              }
            />
            <Route 
              path="/register" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <Register />
                </Suspense>
              }
            />
            <Route 
              path="/forgot-password" 
              element={
                <Suspense fallback={<PageLoader />}>
                  <ForgotPassword />
                </Suspense>
              }
            />
            <Route 
              path="/reception/dashboard" 
              element={
                <ProtectedRoute allowedRoles={['receptionist', 'admin', 'doctor']}>
                  <AppShell>
                    <Suspense fallback={<PageLoader />}>
                      <DashboardPage />
                    </Suspense>
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
                  <Suspense fallback={<PageLoader />}>
                    <DoctorDashboard />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/reception/patients" 
              element={
                <ProtectedRoute allowedRoles={['receptionist', 'admin', 'doctor']}>
                  <AppShell>
                    <Suspense fallback={<PageLoader />}>
                      <PatientsListPage />
                    </Suspense>
                  </AppShell>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/reception/appointments" 
              element={
                <ProtectedRoute allowedRoles={['receptionist', 'admin', 'doctor']}>
                  <AppShell>
                    <Suspense fallback={<PageLoader />}>
                      <AppointmentsPage />
                    </Suspense>
                  </AppShell>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/reception/payments" 
              element={
                <ProtectedRoute allowedRoles={['receptionist', 'admin', 'doctor']}>
                  <AppShell>
                    <Suspense fallback={<PageLoader />}>
                      <PaymentsPage />
                    </Suspense>
                  </AppShell>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/reception/reports" 
              element={
                <ProtectedRoute allowedRoles={['receptionist', 'admin', 'doctor']}>
                  <AppShell>
                    <Suspense fallback={<PageLoader />}>
                      <ReportsPage />
                    </Suspense>
                  </AppShell>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/reception/clinics-doctors" 
              element={
                <ProtectedRoute allowedRoles={['receptionist', 'admin', 'doctor']}>
                  <AppShell>
                    <Suspense fallback={<PageLoader />}>
                      <ClinicsAndDoctorsPage />
                    </Suspense>
                  </AppShell>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/reception/queue" 
              element={
                <ProtectedRoute allowedRoles={['receptionist', 'admin', 'doctor']}>
                  <AppShell>
                    <Suspense fallback={<PageLoader />}>
                      <QueueManagementPage />
                    </Suspense>
                  </AppShell>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/doctor/current-appointment" 
              element={
                <ProtectedRoute allowedRoles={['doctor', 'admin']}>
                  <AppShell>
                    <Suspense fallback={<PageLoader />}>
                      <CurrentAppointmentPage />
                    </Suspense>
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
    </SentryErrorBoundary>
  )
}

export default App
