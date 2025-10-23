import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queueApi } from '../api/queue'
import { appointmentsApi } from '../api/appointments'
import { Card, CardHeader, CardTitle, CardContent } from './common/Card'
import Button from './common/Button'
import Badge from './common/Badge'
import { Clock, User, Phone, Stethoscope, CheckCircle, AlertCircle, Play, Pause, SkipForward } from 'lucide-react'

const QueueManagement = ({ clinicId, onQueueUpdate }) => {
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [showCheckinModal, setShowCheckinModal] = useState(false)
  const queryClient = useQueryClient()

  // Fetch queue data
  const { data: queueData, isLoading, error, refetch } = useQuery({
    queryKey: ['queue', clinicId],
    queryFn: () => queueApi.getClinicQueue(clinicId),
    enabled: !!clinicId,
    refetchInterval: 5000 // Refresh every 5 seconds
  })

  // Fetch confirmed appointments for check-in
  const { data: confirmedAppointmentsResponse = { appointments: [] } } = useQuery({
    queryKey: ['confirmed-appointments', clinicId],
    queryFn: () => {
      // Use local date to avoid timezone issues
      const today = new Date();
      const localDate = today.getFullYear() + '-' + 
        String(today.getMonth() + 1).padStart(2, '0') + '-' + 
        String(today.getDate()).padStart(2, '0');
      
      return appointmentsApi.getAppointments({ 
        clinic_id: clinicId, 
        status: 'CONFIRMED',
        date: localDate
      });
    },
    enabled: !!clinicId
  })
  
  const confirmedAppointments = confirmedAppointmentsResponse.appointments || []

  // Check-in mutation
  const checkinMutation = useMutation({
    mutationFn: queueApi.checkinPatient,
    onSuccess: (data) => {
      queryClient.invalidateQueries(['queue', clinicId])
      queryClient.invalidateQueries(['confirmed-appointments', clinicId])
      queryClient.invalidateQueries(['dashboard-stats'])
      setShowCheckinModal(false)
      setSelectedAppointment(null)
      onQueueUpdate?.(data)
    },
    onError: (error) => {
      console.error('Check-in failed:', error)
    }
  })

  const handleCheckin = (appointmentId) => {
    checkinMutation.mutate(appointmentId)
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'WAITING':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'CALLED':
        return <AlertCircle className="w-4 h-4 text-blue-500" />
      case 'IN_PROGRESS':
        return <Play className="w-4 h-4 text-green-500" />
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'NO_SHOW':
        return <SkipForward className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'WAITING':
        return 'bg-yellow-100 text-yellow-800'
      case 'CALLED':
        return 'bg-blue-100 text-blue-800'
      case 'IN_PROGRESS':
        return 'bg-green-100 text-green-800'
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'NO_SHOW':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A'
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p>Failed to load queue data</p>
            <Button onClick={() => refetch()} className="mt-2">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Queue Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5" />
            Queue Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {queueData?.waiting?.length || 0}
              </div>
              <div className="text-sm text-gray-600">Waiting</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {queueData?.called?.length || 0}
              </div>
              <div className="text-sm text-gray-600">Called</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {queueData?.in_progress?.length || 0}
              </div>
              <div className="text-sm text-gray-600">In Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {queueData?.completed?.length || 0}
              </div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Check-in Section */}
      <Card>
        <CardHeader>
          <CardTitle>Check-in Patients</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {confirmedAppointments.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No confirmed appointments for today</p>
            ) : (
              confirmedAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gray-500" />
                    <div>
                      <div className="font-medium">{appointment.patient_name}</div>
                      <div className="text-sm text-gray-600">
                        {appointment.doctor_name} • {appointment.service_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatTime(appointment.start_time)}
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleCheckin(appointment.id)}
                    disabled={checkinMutation.isPending}
                    size="sm"
                  >
                    {checkinMutation.isPending ? 'Checking in...' : 'Check In'}
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Queue */}
      <Card>
        <CardHeader>
          <CardTitle>Current Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {queueData?.waiting?.map((visit) => (
              <div
                key={visit.id}
                className="flex items-center justify-between p-3 border rounded-lg bg-yellow-50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(visit.status)}
                    <span className="font-bold text-lg">#{visit.queue_number}</span>
                  </div>
                  <div>
                    <div className="font-medium">{visit.patient_name}</div>
                    <div className="text-sm text-gray-600">
                      {visit.doctor_name} • {visit.service_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      Checked in: {formatTime(visit.check_in_time)}
                    </div>
                  </div>
                </div>
                <Badge className={getStatusColor(visit.status)}>
                  {visit.status.replace('_', ' ')}
                </Badge>
              </div>
            ))}

            {queueData?.called?.map((visit) => (
              <div
                key={visit.id}
                className="flex items-center justify-between p-3 border rounded-lg bg-blue-50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(visit.status)}
                    <span className="font-bold text-lg">#{visit.queue_number}</span>
                  </div>
                  <div>
                    <div className="font-medium">{visit.patient_name}</div>
                    <div className="text-sm text-gray-600">
                      {visit.doctor_name} • {visit.service_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      Called at: {formatTime(visit.called_time)}
                    </div>
                  </div>
                </div>
                <Badge className={getStatusColor(visit.status)}>
                  {visit.status.replace('_', ' ')}
                </Badge>
              </div>
            ))}

            {queueData?.in_progress?.map((visit) => (
              <div
                key={visit.id}
                className="flex items-center justify-between p-3 border rounded-lg bg-green-50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(visit.status)}
                    <span className="font-bold text-lg">#{visit.queue_number}</span>
                  </div>
                  <div>
                    <div className="font-medium">{visit.patient_name}</div>
                    <div className="text-sm text-gray-600">
                      {visit.doctor_name} • {visit.service_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      Started: {formatTime(visit.consultation_start_time)}
                    </div>
                  </div>
                </div>
                <Badge className={getStatusColor(visit.status)}>
                  {visit.status.replace('_', ' ')}
                </Badge>
              </div>
            ))}

            {queueData?.completed?.map((visit) => (
              <div
                key={visit.id}
                className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(visit.status)}
                    <span className="font-bold text-lg">#{visit.queue_number}</span>
                  </div>
                  <div>
                    <div className="font-medium">{visit.patient_name}</div>
                    <div className="text-sm text-gray-600">
                      {visit.doctor_name} • {visit.service_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      Completed: {formatTime(visit.consultation_end_time)}
                    </div>
                  </div>
                </div>
                <Badge className={getStatusColor(visit.status)}>
                  {visit.status.replace('_', ' ')}
                </Badge>
              </div>
            ))}

            {(!queueData?.waiting?.length && 
              !queueData?.called?.length && 
              !queueData?.in_progress?.length && 
              !queueData?.completed?.length) && (
              <p className="text-gray-500 text-center py-8">No patients in queue</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default QueueManagement
