import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'
import { useSocket } from '../hooks/useSocket'
import { dashboardApi } from '../api/dashboard'
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card'
import Button from '../components/common/Button'
import DoctorQueue from '../components/DoctorQueue'
import { Users, Clock, CheckCircle, AlertCircle, Stethoscope } from 'lucide-react'

const DoctorDashboard = () => {
  const { user, token, logout } = useAuthStore()
  const { socket, isConnected, onAppointmentCreated, onAppointmentUpdated, onAppointmentCancelled } = useSocket()
  const [activeTab, setActiveTab] = useState('overview')

  const { data: stats, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardApi.getStats,
    refetchInterval: 30000 // Refresh every 30 seconds
  })

  // Set up real-time updates
  useEffect(() => {
    if (socket && isConnected && user?.id) {
      // Join doctor room for real-time updates
      socket.emit('join_doctor_room', { 
        doctor_id: user.id,
        token: token 
      })

      // Listen for queue updates
      socket.on('queue_updated', (data) => {
        console.log('Doctor queue updated:', data)
        refetch()
      })

      // Listen for new check-ins
      socket.on('new_checkin', (data) => {
        console.log('New check-in for doctor:', data)
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
        socket.emit('leave_doctor_room', { 
          doctor_id: user.id,
          token: token 
        })
        socket.off('queue_updated')
        socket.off('new_checkin')
        socket.off('visit_status_changed')
        socket.off('appointment_created')
        socket.off('appointment_updated')
        socket.off('appointment_cancelled')
      }
    }
  }, [socket, isConnected, user?.id, token, refetch])

  const handleLogout = () => {
    logout()
  }

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
              <h1 className="text-xl font-semibold text-gray-900">Medical CRM - Doctor</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-xs text-gray-500">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <span className="text-sm text-gray-700">Welcome, Dr. {user?.username}</span>
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
          <h2 className="text-2xl font-bold text-gray-900">Doctor Dashboard</h2>
          <p className="text-gray-600">Manage your patient queue and consultations</p>
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
                  Patient Queue
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Users className="h-8 w-8 text-primary-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Today's Visits</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {stats.visits?.total || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Clock className="h-8 w-8 text-warning-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Waiting</p>
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
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">In Progress</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {stats.visits?.in_progress || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-8 w-8 text-success-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Completed</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {stats.visits?.completed || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
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
        {activeTab === 'queue' && user?.id && (
          <DoctorQueue 
            doctorId={user.id} 
            onQueueUpdate={() => refetch()} 
          />
        )}
      </main>
    </div>
  )
}

export default DoctorDashboard
