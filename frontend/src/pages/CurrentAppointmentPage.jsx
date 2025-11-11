import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { appointmentsApi } from '../api/appointments'
import { useSocket } from '../hooks/useSocket'
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card'
import Button from '../components/common/Button'
import { Spinner } from '../components/common/Spinner'
import {
  User,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Stethoscope,
  Building2,
  CheckCircle,
  AlertCircle,
  FileText,
  History,
  UserCheck
} from 'lucide-react'
import { formatDate, formatTime } from '../utils/formatters'

const CurrentAppointmentPage = () => {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [notes, setNotes] = useState('')
  const { socket } = useSocket()

  // Fetch current appointment
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['current-appointment'],
    queryFn: appointmentsApi.getCurrentAppointment,
    refetchInterval: 5000, // Poll every 5 seconds for updates
    retry: false
  })

  // Complete appointment mutation
  const completeMutation = useMutation({
    mutationFn: (notes) => appointmentsApi.completeCurrentAppointment(notes),
    onSuccess: () => {
      queryClient.invalidateQueries(['current-appointment'])
      queryClient.invalidateQueries(['dashboard-stats'])
      queryClient.invalidateQueries(['queue'])
      navigate('/reception/dashboard')
    }
  })

  const handleComplete = () => {
    if (window.confirm('Are you sure you want to complete this appointment?')) {
      completeMutation.mutate(notes)
    }
  }

  useEffect(() => {
    // Auto-refetch when window gains focus
    const handleFocus = () => {
      refetch()
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [refetch])

  // Listen for current_appointment_available event
  useEffect(() => {
    if (!socket || !user || user.role !== 'doctor') return

    const handleCurrentAppointmentAvailable = (data) => {
      // Check if this is for the current doctor
      if (data.doctor_user_id && data.doctor_user_id === user.id) {
        // If navigate flag is set and we're not already on this page, redirect
        if (data.navigate && window.location.pathname !== '/doctor/current-appointment') {
          navigate('/doctor/current-appointment')
        } else {
          // Otherwise, just refresh the appointment data
          refetch()
        }
      }
    }

    socket.on('current_appointment_available', handleCurrentAppointmentAvailable)

    return () => {
      socket.off('current_appointment_available', handleCurrentAppointmentAvailable)
    }
  }, [socket, refetch, navigate, user])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">Loading current appointment...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Appointment</h2>
          <p className="text-gray-600 mb-4">{error.message}</p>
          <Button onClick={() => navigate('/reception/dashboard')}>Back to Dashboard</Button>
        </div>
      </div>
    )
  }

  if (!data || !data.has_appointment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <UserCheck className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">No Current Appointment</h2>
          <p className="text-gray-600 mb-6">
            There is no active appointment at the moment. When a patient enters your room and the receptionist moves them to "with doctor" status, they will appear here.
          </p>
          <Button onClick={() => navigate('/reception/dashboard')}>Back to Dashboard</Button>
        </div>
      </div>
    )
  }

  const { patient, appointment, visit, service, clinic, is_first_visit, visit_count, previous_visits, previous_appointments } = data

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Current Appointment</h1>
              <p className="text-gray-600 mt-1">
                {is_first_visit ? 'First Visit' : `Visit #${visit_count}`}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate('/reception/dashboard')}
            >
              Back to Dashboard
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Patient Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Patient Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Patient Information
                  {is_first_visit && (
                    <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                      First Visit
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Name</label>
                      <p className="text-lg font-semibold text-gray-900">{patient?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Phone</label>
                      <p className="text-lg text-gray-900 flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {patient?.phone || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Age</label>
                      <p className="text-lg text-gray-900">{patient?.age ? `${patient.age} years` : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Gender</label>
                      <p className="text-lg text-gray-900 capitalize">{patient?.gender || 'N/A'}</p>
                    </div>
                  </div>
                  {patient?.address && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Address
                      </label>
                      <p className="text-gray-900 mt-1">{patient.address}</p>
                    </div>
                  )}
                  {patient?.medical_history && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Medical History
                      </label>
                      <p className="text-gray-900 mt-1 whitespace-pre-wrap">{patient.medical_history}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Appointment Details Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Appointment Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {appointment && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Booking ID</label>
                          <p className="text-lg font-mono text-gray-900">{appointment.booking_id}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Scheduled Time</label>
                          <p className="text-lg text-gray-900 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {appointment.start_time
                              ? `${formatDate(appointment.start_time)} at ${formatTime(appointment.start_time)}`
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <Stethoscope className="h-4 w-4" />
                        Service
                      </label>
                      <p className="text-lg text-gray-900">{service?.name || 'N/A'}</p>
                      {service?.duration && (
                        <p className="text-sm text-gray-500">Duration: {service.duration} minutes</p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Clinic
                      </label>
                      <p className="text-lg text-gray-900">{clinic?.name || 'N/A'}</p>
                    </div>
                  </div>
                  {visit?.queue_number && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Queue Number</label>
                      <p className="text-2xl font-bold text-primary-600">#{visit.queue_number}</p>
                    </div>
                  )}
                  {appointment?.notes && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Appointment Notes</label>
                      <p className="text-gray-900 mt-1 whitespace-pre-wrap">{appointment.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Visit History Card */}
            {(previous_visits?.length > 0 || previous_appointments?.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Visit History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {previous_visits?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Previous Visits ({previous_visits.length})</h4>
                        <div className="space-y-2">
                          {previous_visits.slice(0, 3).map((v) => (
                            <div key={v.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {v.created_at ? formatDate(v.created_at) : 'N/A'}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {v.service?.name || 'Service'} - {v.status}
                                </p>
                              </div>
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {previous_appointments?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Previous Appointments ({previous_appointments.length})</h4>
                        <div className="space-y-2">
                          {previous_appointments.slice(0, 3).map((apt) => (
                            <div key={apt.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {apt.start_time ? formatDate(apt.start_time) : 'N/A'}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {apt.booking_id} - {apt.status}
                                </p>
                              </div>
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notes and Complete Section */}
            <Card>
              <CardHeader>
                <CardTitle>Consultation Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Add Notes (Optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Enter consultation notes, observations, or recommendations..."
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={handleComplete}
                      disabled={completeMutation.isLoading}
                      className="flex items-center gap-2"
                    >
                      {completeMutation.isLoading ? (
                        <>
                          <Spinner size="sm" />
                          Completing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-5 w-5" />
                          Complete Appointment
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Quick Stats */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Visit Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Visit Type</p>
                    <p className="text-lg font-semibold text-gray-900 capitalize">
                      {visit?.visit_type || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <p className="text-lg font-semibold text-blue-600 capitalize">
                      {visit?.status?.replace('_', ' ') || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Check-in Time</p>
                    <p className="text-lg text-gray-900">
                      {visit?.check_in_time
                        ? `${formatTime(visit.check_in_time)}`
                        : 'N/A'}
                    </p>
                  </div>
                  {visit?.start_time && (
                    <div>
                      <p className="text-sm text-gray-500">Consultation Start</p>
                      <p className="text-lg text-gray-900">
                        {formatTime(visit.start_time)}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CurrentAppointmentPage

