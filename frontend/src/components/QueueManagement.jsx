import React, { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queueApi } from '../api/queue'
import { appointmentsApi } from '../api/appointments'
import { clinicsApi } from '../api/clinics'
import { Card, CardHeader, CardTitle, CardContent } from './common/Card'
import { Button } from './common/Button'
import { Badge } from './common/Badge'
import { Spinner } from './common/Spinner'
import WalkInModal from './WalkInModal'
import { 
  Clock, 
  User, 
  Phone, 
  Stethoscope, 
  CheckCircle, 
  AlertCircle, 
  Play, 
  Pause, 
  SkipForward, 
  Plus,
  Calendar,
  Building,
  Filter,
  GripVertical,
  X,
  Activity
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'

const QueueManagement = ({ clinicId, onQueueUpdate }) => {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [endDate, setEndDate] = useState(new Date())
  const [selectedClinic, setSelectedClinic] = useState(clinicId || 'all')
  const [showWalkInModal, setShowWalkInModal] = useState(false)
  const [draggedItem, setDraggedItem] = useState(null)
  const [lastUpdateTime, setLastUpdateTime] = useState(null)
  
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  // Format dates for API
  const formatDate = (date) => {
    return date.toISOString().split('T')[0]
  }

  // Fetch clinics
  const { data: clinics = [] } = useQuery({
    queryKey: ['clinics'],
    queryFn: async () => {
      const result = await clinicsApi.getClinics()
      return result?.clinics || []
    }
  })

  // Fetch queue data
  const { data: queueData, isLoading, error, refetch } = useQuery({
    queryKey: ['queue', selectedClinic, formatDate(selectedDate), formatDate(endDate)],
    queryFn: () => {
      if (selectedClinic === 'all') {
        // For all clinics, we need to fetch data for each clinic
        // For now, just use the first clinic as default
        const firstClinic = clinics[0]
        if (firstClinic) {
          return queueApi.getClinicQueue(firstClinic.id, formatDate(selectedDate), formatDate(endDate))
        }
        return Promise.resolve({ waiting: [], called: [], in_progress: [], completed: [] })
      }
      return queueApi.getClinicQueue(selectedClinic, formatDate(selectedDate), formatDate(endDate))
    },
    enabled: !!selectedClinic && selectedClinic !== 'all' ? true : clinics.length > 0,
    refetchInterval: 5000 // Refresh every 5 seconds
  })

  // Fetch upcoming appointments
  const { data: upcomingData } = useQuery({
    queryKey: ['upcoming-appointments', selectedClinic, formatDate(selectedDate)],
    queryFn: () => {
      const clinicId = selectedClinic === 'all' ? null : selectedClinic
      return queueApi.getUpcomingAppointments(formatDate(selectedDate), clinicId)
    },
    enabled: !!selectedDate
  })

  // Fetch queue statistics
  const { data: statistics } = useQuery({
    queryKey: ['queue-statistics', selectedClinic, formatDate(selectedDate)],
    queryFn: () => {
      if (selectedClinic === 'all') return null
      return queueApi.getQueueStatistics(selectedClinic, formatDate(selectedDate))
    },
    enabled: selectedClinic !== 'all'
  })

  // Update last update time when data changes
  useEffect(() => {
    if (queueData) {
      setLastUpdateTime(new Date().toLocaleTimeString())
    }
  }, [queueData])

  // Mutations
  const checkinMutation = useMutation({
    mutationFn: queueApi.checkinPatient,
    onSuccess: (data) => {
      queryClient.invalidateQueries(['queue'])
      queryClient.invalidateQueries(['upcoming-appointments'])
      queryClient.invalidateQueries(['dashboard-stats'])
      onQueueUpdate?.(data)
    }
  })

  const callPatientMutation = useMutation({
    mutationFn: queueApi.callPatient,
    onSuccess: () => {
      queryClient.invalidateQueries(['queue'])
      onQueueUpdate?.()
    }
  })

  const startConsultationMutation = useMutation({
    mutationFn: queueApi.startConsultation,
    onSuccess: () => {
      queryClient.invalidateQueries(['queue'])
      onQueueUpdate?.()
    }
  })

  const completeConsultationMutation = useMutation({
    mutationFn: queueApi.completeConsultation,
    onSuccess: () => {
      queryClient.invalidateQueries(['queue'])
      onQueueUpdate?.()
    }
  })

  const skipPatientMutation = useMutation({
    mutationFn: queueApi.skipPatient,
    onSuccess: () => {
      queryClient.invalidateQueries(['queue'])
      onQueueUpdate?.()
    }
  })

  const reorderMutation = useMutation({
    mutationFn: ({ visitId, newPosition }) => queueApi.reorderQueue(visitId, newPosition),
    onSuccess: () => {
      queryClient.invalidateQueries(['queue'])
      onQueueUpdate?.()
    }
  })

  const cancelVisitMutation = useMutation({
    mutationFn: ({ visitId, reason }) => queueApi.cancelVisit(visitId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries(['queue'])
      onQueueUpdate?.()
    }
  })

  // Event handlers
  const handleCheckin = (appointmentId) => {
    checkinMutation.mutate(appointmentId)
  }

  const handleCallPatient = (visitId) => {
    callPatientMutation.mutate(visitId)
  }

  const handleStartConsultation = (visitId) => {
    startConsultationMutation.mutate(visitId)
  }

  const handleCompleteConsultation = (visitId, notes = '') => {
    completeConsultationMutation.mutate({ visitId, notes })
  }

  const handleSkipPatient = (visitId) => {
    const reason = prompt('Reason for skipping (optional):') || 'No show'
    skipPatientMutation.mutate({ visitId, reason })
  }

  const handleCancelVisit = (visitId) => {
    const reason = prompt('Reason for cancellation (optional):') || 'Cancelled by receptionist'
    cancelVisitMutation.mutate({ visitId, reason })
  }

  const handleDragStart = (e, visitId) => {
    setDraggedItem(visitId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e, targetPosition) => {
    e.preventDefault()
    if (draggedItem && targetPosition) {
      reorderMutation.mutate({ visitId: draggedItem, newPosition: targetPosition })
    }
    setDraggedItem(null)
  }

  const handleWalkInSuccess = () => {
    queryClient.invalidateQueries(['queue'])
    onQueueUpdate?.()
  }

  // Utility functions
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
            <Spinner size="lg" />
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
      {/* Header with filters and actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900">Queue Management</h2>
          {lastUpdateTime && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Activity className="w-4 h-4" />
              Last updated: {lastUpdateTime}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowWalkInModal(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Walk-In
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date Range */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Date Range
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={formatDate(selectedDate)}
                  onChange={(e) => setSelectedDate(new Date(e.target.value))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="date"
                  value={formatDate(endDate)}
                  onChange={(e) => setEndDate(new Date(e.target.value))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Clinic Filter */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Clinic
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  value={selectedClinic}
                  onChange={(e) => setSelectedClinic(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Clinics</option>
                  {clinics.map((clinic) => (
                    <option key={clinic.id} value={clinic.id}>
                      {clinic.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Date Filters */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Quick Filters
              </label>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    const today = new Date()
                    setSelectedDate(today)
                    setEndDate(today)
                  }}
                  variant="outline"
                  size="sm"
                >
                  Today
                </Button>
                <Button
                  onClick={() => {
                    const today = new Date()
                    const weekAgo = new Date(today)
                    weekAgo.setDate(today.getDate() - 7)
                    setSelectedDate(weekAgo)
                    setEndDate(today)
                  }}
                  variant="outline"
                  size="sm"
                >
                  This Week
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Dashboard */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {statistics.total_appointments}
                </div>
                <div className="text-sm text-gray-600">Total Today</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {statistics.waiting_count}
                </div>
                <div className="text-sm text-gray-600">Waiting</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {statistics.in_progress_count}
                </div>
                <div className="text-sm text-gray-600">In Progress</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {statistics.completed_count}
                </div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upcoming Appointments */}
      {upcomingData?.appointments?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Upcoming Appointments ({upcomingData.appointments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingData.appointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gray-500" />
                    <div>
                      <div className="font-medium">{appointment.patient_name}</div>
                      <div className="text-sm text-gray-600">
                        {appointment.doctor_name} • {appointment.clinic_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatTime(appointment.start_time)} - {appointment.service_name}
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
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Queue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5" />
            Active Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Waiting Patients - Draggable */}
            {queueData?.waiting?.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-500" />
                  Waiting ({queueData.waiting.length})
                </h4>
                <div className="space-y-2">
                  {queueData.waiting.map((visit, index) => (
                    <div
                      key={visit.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, visit.id)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, index + 1)}
                      className="flex items-center justify-between p-3 border rounded-lg bg-yellow-50 hover:bg-yellow-100 cursor-move"
                    >
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-4 h-4 text-gray-400" />
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
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(visit.status)}>
                          {visit.status.replace('_', ' ')}
                        </Badge>
                        <div className="flex gap-1">
                          <Button
                            onClick={() => handleCallPatient(visit.id)}
                            disabled={callPatientMutation.isPending}
                            size="sm"
                            variant="outline"
                          >
                            <Phone className="w-4 h-4 mr-1" />
                            Call
                          </Button>
                          <Button
                            onClick={() => handleStartConsultation(visit.id)}
                            disabled={startConsultationMutation.isPending}
                            size="sm"
                            variant="outline"
                          >
                            <Play className="w-4 h-4 mr-1" />
                            Start
                          </Button>
                          <Button
                            onClick={() => handleCancelVisit(visit.id)}
                            disabled={cancelVisitMutation.isPending}
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Called Patients */}
            {queueData?.called?.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-500" />
                  Called ({queueData.called.length})
                </h4>
                <div className="space-y-2">
                  {queueData.called.map((visit) => (
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
                            Called: {formatTime(visit.start_time)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(visit.status)}>
                          {visit.status.replace('_', ' ')}
                        </Badge>
                        <div className="flex gap-1">
                          <Button
                            onClick={() => handleStartConsultation(visit.id)}
                            disabled={startConsultationMutation.isPending}
                            size="sm"
                            variant="outline"
                          >
                            <Play className="w-4 h-4 mr-1" />
                            Start
                          </Button>
                          <Button
                            onClick={() => handleCancelVisit(visit.id)}
                            disabled={cancelVisitMutation.isPending}
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* In Progress */}
            {queueData?.in_progress?.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Play className="w-4 h-4 text-green-500" />
                  In Progress ({queueData.in_progress.length})
                </h4>
                <div className="space-y-2">
                  {queueData.in_progress.map((visit) => (
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
                            Started: {formatTime(visit.start_time)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(visit.status)}>
                          {visit.status.replace('_', ' ')}
                        </Badge>
                        <div className="flex gap-1">
                          <Button
                            onClick={() => handleCompleteConsultation(visit.id)}
                            disabled={completeConsultationMutation.isPending}
                            size="sm"
                            variant="outline"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Complete
                          </Button>
                          <Button
                            onClick={() => handleSkipPatient(visit.id)}
                            disabled={skipPatientMutation.isPending}
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                          >
                            <SkipForward className="w-4 h-4 mr-1" />
                            Skip
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Completed */}
            {queueData?.completed?.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-gray-500" />
                  Completed ({queueData.completed.length})
                </h4>
                <div className="space-y-2">
                  {queueData.completed.slice(0, 5).map((visit) => (
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
                            Completed: {formatTime(visit.end_time)}
                          </div>
                        </div>
                      </div>
                      <Badge className={getStatusColor(visit.status)}>
                        {visit.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                  {queueData.completed.length > 5 && (
                    <div className="text-center text-gray-500 text-sm py-2">
                      +{queueData.completed.length - 5} more completed
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Empty State */}
            {(!queueData?.waiting?.length && 
              !queueData?.called?.length && 
              !queueData?.in_progress?.length && 
              !queueData?.completed?.length) && (
              <div className="text-center py-8 text-gray-500">
                <Stethoscope className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No patients in queue</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Walk-In Modal */}
      <WalkInModal
        isOpen={showWalkInModal}
        onClose={() => setShowWalkInModal(false)}
        onSuccess={handleWalkInSuccess}
      />
    </div>
  )
}

export default QueueManagement