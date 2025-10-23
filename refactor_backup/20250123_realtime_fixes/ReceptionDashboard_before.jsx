import { useState, useEffect, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useSocket } from '../hooks/useSocket'
import { useQueueStore } from '../stores/queueStore'
import { dashboardApi } from '../api/dashboard'
import { clinicsApi } from '../api/clinics'
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card'
import Button from '../components/common/Button'
import BookingWizard from '../components/BookingWizard'
import QueueManagement from '../components/QueueManagement'
import { Plus, Users, Calendar, CreditCard, AlertCircle, Stethoscope } from 'lucide-react'

const ReceptionDashboard = () => {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const { socket, isConnected, joinQueueRoom, leaveQueueRoom } = useSocket()
  const { selectedClinic, setSelectedClinic } = useQueueStore()

  const { data: stats, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardApi.getStats,
    refetchInterval: 30000 // Refresh every 30 seconds
  })

  // Fetch clinics for selection
  const { data: clinics = [] } = useQuery({
    queryKey: ['clinics'],
    queryFn: async () => {
      const result = await clinicsApi.getClinics()
      return result?.clinics || []
    }
  })

  // Set up real-time updates
  useEffect(() => {
    if (socket && isConnected) {
      // Listen for queue updates
      socket.on('queue_updated', (data) => {
        console.log('Queue updated:', data)
        // Refetch dashboard stats when queue updates
        refetch()
      })

      // Listen for new check-ins
      socket.on('new_checkin', (data) => {
        console.log('New check-in:', data)
        refetch()
      })

      // Listen for visit status changes
      socket.on('visit_status_changed', (data) => {
        console.log('Visit status changed:', data)
        refetch()
      })

      // Listen for appointment events
      socket.on('appointment_created', (data) => {
        console.log('Appointment created:', data)
        refetch()
      })

      socket.on('appointment_updated', (data) => {
        console.log('Appointment updated:', data)
        refetch()
      })

      socket.on('appointment_cancelled', (data) => {
        console.log('Appointment cancelled:', data)
        refetch()
      })

      return () => {
        socket.off('queue_updated')
        socket.off('new_checkin')
        socket.off('visit_status_changed')
        socket.off('appointment_created')
        socket.off('appointment_updated')
        socket.off('appointment_cancelled')
      }
    }
  }, [socket, isConnected, refetch])

  // Join clinic room when clinic is selected
  useEffect(() => {
    if (socket && isConnected && selectedClinic) {
      console.log('Joining clinic room:', selectedClinic)
      joinQueueRoom(selectedClinic)
      
      return () => {
        console.log('Leaving clinic room:', selectedClinic)
        leaveQueueRoom(selectedClinic)
      }
    }
  }, [socket, isConnected, selectedClinic, joinQueueRoom, leaveQueueRoom])

  // Auto-select first clinic if none selected
  useEffect(() => {
    if (clinics.length > 0 && !selectedClinic) {
      setSelectedClinic(clinics[0].id)
    }
  }, [clinics, selectedClinic, setSelectedClinic])

  const handleLogout = useCallback(() => {
    logout()
  }, [logout])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-error-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-4">{error.message}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Medical CRM</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-xs text-gray-500">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              {clinics.length > 0 && (
                <select
                  value={selectedClinic || ''}
                  onChange={(e) => setSelectedClinic(parseInt(e.target.value))}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                >
                  {clinics.map((clinic) => (
                    <option key={clinic.id} value={clinic.id}>
                      {clinic.name}
                    </option>
                  ))}
                </select>
              )}
              <span className="text-sm text-gray-700">Welcome, {user?.username}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Reception Dashboard</h2>
          <p className="text-gray-600">Manage appointments, patients, and payments</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('queue')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'queue'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-4 h-4" />
                  Queue Management
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
            {/* Quick Actions */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              className="h-20 flex flex-col items-center justify-center space-y-2"
              onClick={() => setShowBookingModal(true)}
            >
              <Plus className="h-6 w-6" />
              <span>New Booking</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center space-y-2"
              onClick={() => navigate('/patients')}
            >
              <Users className="h-6 w-6" />
              <span>Patients List</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center space-y-2"
              onClick={() => navigate('/appointments')}
            >
              <Calendar className="h-6 w-6" />
              <span>Appointments</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex flex-col items-center justify-center space-y-2"
              onClick={() => navigate('/payments')}
            >
              <CreditCard className="h-6 w-6" />
              <span>Payments</span>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Calendar className="h-8 w-8 text-primary-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Today's Appointments</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {stats.appointments?.total || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Users className="h-8 w-8 text-success-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Waiting Patients</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {stats.visits?.waiting || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CreditCard className="h-8 w-8 text-warning-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Pending Payments</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {stats.visits?.pending_payment || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-8 w-8 text-error-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Alerts</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {stats.alerts?.length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Alerts */}
        {stats?.alerts && stats.alerts.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertCircle className="h-5 w-5 text-warning-500 mr-2" />
                Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.alerts.map((alert, index) => (
                  <div key={index} className="p-3 bg-warning-50 border border-warning-200 rounded-lg">
                    <p className="text-sm text-warning-800">{alert.message}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500">Recent activity will be displayed here...</p>
              </CardContent>
            </Card>
          </>
        )}

        {/* Queue Management Tab */}
        {activeTab === 'queue' && selectedClinic && (
          <QueueManagement 
            clinicId={selectedClinic} 
            onQueueUpdate={() => refetch()} 
          />
        )}

        {activeTab === 'queue' && !selectedClinic && (
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-gray-500">
                <Stethoscope className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>Please select a clinic to manage the queue</p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Booking Wizard Modal */}
      <BookingWizard
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        onSuccess={(data) => {
          console.log('Appointment created:', data)
          setShowBookingModal(false)
        }}
      />
    </div>
  )
}

export default ReceptionDashboard
