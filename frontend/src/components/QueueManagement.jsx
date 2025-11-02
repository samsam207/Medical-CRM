import React, { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Stethoscope, 
  CheckCircle, 
  AlertCircle,
  Move,
  Search,
  Filter,
  TrendingUp,
  RefreshCw,
  MoreVertical,
  Download,
  Eye,
  Edit,
  X,
  Timer,
  Activity
} from 'lucide-react'
import { queueApi } from '../api/queue'
import { clinicsApi } from '../api/clinics'
import { doctorsApi } from '../api/doctors'
import { useSocket } from '../hooks/useSocket'
import { useMutationWithRefetch } from '../hooks/useMutationWithRefetch'
import { useDoctorFilters } from '../hooks/useDoctorFilters'
import { useAuthStore } from '../stores/authStore'
import Button from './common/Button'
import Card from './common/Card'
import Badge from './common/Badge'
import Spinner from './common/Spinner'

const QueueManagement = ({ clinicId, onQueueUpdate }) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { doctorId, isDoctor } = useDoctorFilters()
  const { user } = useAuthStore()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedClinic, setSelectedClinic] = useState(clinicId || null)
  const [selectedDoctor, setSelectedDoctor] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [draggedItem, setDraggedItem] = useState(null)
  const [dragOverPhase, setDragOverPhase] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [actionMenuOpen, setActionMenuOpen] = useState(null)

  // Socket connection for real-time updates
  const { socket } = useSocket()

  // Fetch clinics
  const { data: clinics = [] } = useQuery({
    queryKey: ['clinics'],
    queryFn: async () => {
      const result = await clinicsApi.getClinics()
      return result?.clinics || []
    }
  })

  // Fetch doctors for selected clinic
  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors', selectedClinic],
    queryFn: () => {
      if (selectedClinic === 'all' || !selectedClinic) return Promise.resolve([])
      return doctorsApi.getDoctors({ clinic_id: selectedClinic }).then(res => res?.doctors || [])
    },
    enabled: !!selectedClinic
  })

  // Auto-select first clinic if none selected
  useEffect(() => {
    if (clinics.length > 0 && !selectedClinic) {
      setSelectedClinic(clinics[0].id)
    }
  }, [clinics, selectedClinic])

  // Fetch queue phases data
  // For doctors, backend auto-filters by doctor_id, so we don't need to pass it
  // But we include it in query key for proper cache invalidation
  const { data: phasesData, isLoading, error, refetch: refetchPhases } = useQuery({
    queryKey: ['queue-phases', selectedClinic, selectedDate, isDoctor, doctorId],
    queryFn: () => {
      // Backend auto-filters for doctors, but receptionists can filter by selectedDoctor
      const filterDoctorId = !isDoctor && selectedDoctor !== 'all' ? parseInt(selectedDoctor) : null
      return queueApi.getQueuePhases(selectedClinic, selectedDate, filterDoctorId)
    },
    refetchInterval: autoRefresh ? 30000 : false,
    enabled: !!selectedClinic,
    staleTime: 0,
    gcTime: 0
  })

  // Fetch queue statistics
  const { data: statistics } = useQuery({
    queryKey: ['queue-statistics', selectedClinic, selectedDate],
    queryFn: () => queueApi.getQueueStatistics(selectedClinic, selectedDate),
    enabled: !!selectedClinic,
    refetchInterval: autoRefresh ? 30000 : false,
    staleTime: 0
  })

  // Listen for socket updates
  useEffect(() => {
    if (!socket || !refetchPhases) return

    const handlePhasesUpdate = (data) => {
      const socketDate = data.date ? data.date.split('T')[0] : data.date
      const currentDate = selectedDate ? selectedDate.split('T')[0] : selectedDate
      
      // Check if the update is for the current clinic and date
      // Also check if doctor_id matches (for doctors) or if no doctor_id (for receptionists)
      const isRelevantUpdate = 
        data.clinic_id === selectedClinic && 
        socketDate === currentDate &&
        (!isDoctor || !data.doctor_id || data.doctor_id === doctorId)
      
      if (isRelevantUpdate) {
        // Update the query cache with the new phases data
        queryClient.setQueryData(['queue-phases', selectedClinic, selectedDate, isDoctor, doctorId], {
          phases: data.phases,
          date: data.date,
          clinic_id: data.clinic_id
        })
      } else {
        // If update is not relevant, refetch to ensure consistency
        refetchPhases()
      }
    }

    socket.on('phases_updated', handlePhasesUpdate)

    return () => {
      socket.off('phases_updated', handlePhasesUpdate)
    }
  }, [socket, selectedClinic, selectedDate, queryClient, refetchPhases, isDoctor, doctorId])

  // Move patient mutation
  const movePatientMutation = useMutationWithRefetch({
    mutationFn: ({ visitId, fromPhase, toPhase, appointmentId }) => 
      queueApi.movePatientPhase(visitId, fromPhase, toPhase, appointmentId),
    queryKeys: [['queue-phases'], ['dashboard-stats'], ['queue-statistics']],
    onSuccessMessage: 'Patient moved successfully',
    onErrorMessage: 'Failed to move patient',
    onSuccessCallback: async () => {
      queryClient.invalidateQueries({ 
        queryKey: ['queue-phases', selectedClinic, selectedDate, isDoctor, doctorId],
        exact: true
      })
      queryClient.invalidateQueries({ 
        queryKey: ['queue-statistics', selectedClinic, selectedDate],
        exact: true
      })
      onQueueUpdate?.()
    }
  })

  // Phase configurations
  const phases = [
    {
      id: 'appointments_today',
      title: 'Appointments Today',
      icon: Calendar,
      color: 'blue',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-800',
      badgeColor: 'bg-blue-100 text-blue-800'
    },
    {
      id: 'waiting',
      title: 'Waiting',
      icon: Clock,
      color: 'yellow',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      textColor: 'text-yellow-800',
      badgeColor: 'bg-yellow-100 text-yellow-800'
    },
    {
      id: 'with_doctor',
      title: 'With Doctor',
      icon: Stethoscope,
      color: 'green',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-800',
      badgeColor: 'bg-green-100 text-green-800'
    },
    {
      id: 'completed',
      title: 'Completed',
      icon: CheckCircle,
      color: 'gray',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      textColor: 'text-gray-800',
      badgeColor: 'bg-gray-100 text-gray-800'
    }
  ]

  // Handle drag start
  const handleDragStart = (e, item, phaseId) => {
    const dragItem = { ...item, phaseId, queue_phase: item.queue_phase || phaseId }
    setDraggedItem(dragItem)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.dropEffect = 'move'
    e.dataTransfer.setData('text/plain', JSON.stringify(dragItem))
  }

  // Handle drag over
  const handleDragOver = (e, phaseId) => {
    e.preventDefault()
    
    // Doctors cannot drop into "with_doctor" phase
    if (isDoctor && phaseId === 'with_doctor') {
      e.dataTransfer.dropEffect = 'none'
      return
    }
    
    e.dataTransfer.dropEffect = 'move'
    setDragOverPhase(phaseId)
  }

  // Handle drag leave
  const handleDragLeave = () => {
    setDragOverPhase(null)
  }

  // Handle drop
  const handleDrop = (e, targetPhaseId) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverPhase(null)
    
    // Doctors cannot drop into "with_doctor" phase
    if (isDoctor && targetPhaseId === 'with_doctor') {
      setDraggedItem(null)
      alert('Doctors cannot move appointments to "with doctor" phase. Only receptionists can start consultations.')
      return
    }
    
    let itemData = null
    try {
      const dataTransferData = e.dataTransfer.getData('text/plain')
      if (dataTransferData) {
        itemData = JSON.parse(dataTransferData)
      }
    } catch (err) {
      console.error('Failed to parse drag data:', err)
    }
    
    const item = itemData || draggedItem
    
    if (!item || item.phaseId === targetPhaseId) {
      setDraggedItem(null)
      return
    }

    // Doctors can only move their own appointments
    if (isDoctor && doctorId) {
      // Check if the appointment belongs to this doctor
      // We need to check the doctor_id from the appointment data
      // Since appointments have doctor_id, we can check item.doctor_id
      // But the item might not have doctor_id directly, so we need to check via the phases data
      const currentPhases = phasesData?.phases || {}
      let appointmentBelongsToDoctor = false
      
      // Search through all phases to find the appointment
      for (const phaseName in currentPhases) {
        const apt = currentPhases[phaseName]?.find(a => a.id === item.id)
        if (apt) {
          // Check if appointment has doctor_id field or we need to extract it from doctor_name
          // For now, we'll rely on the backend validation, but add a warning
          // The backend will reject if the doctor tries to move someone else's appointment
          appointmentBelongsToDoctor = true
          break
        }
      }
    }

    const sourcePhaseId = item.phaseId || item.queue_phase || 'appointments_today'

    // Optimistic update
    queryClient.setQueryData(['queue-phases', selectedClinic, selectedDate, isDoctor, doctorId], (oldData) => {
      if (!oldData?.phases) return oldData
      
      const newPhases = { ...oldData.phases }
      
      if (newPhases[sourcePhaseId]) {
        newPhases[sourcePhaseId] = newPhases[sourcePhaseId].filter(apt => apt.id !== item.id)
      }
      
      if (!newPhases[targetPhaseId]) {
        newPhases[targetPhaseId] = []
      }
      
      const updatedItem = { ...item, queue_phase: targetPhaseId, phaseId: targetPhaseId }
      newPhases[targetPhaseId].push(updatedItem)
      
      return { ...oldData, phases: newPhases }
    })
    
    if (sourcePhaseId === 'appointments_today' && targetPhaseId === 'waiting') {
      movePatientMutation.mutate({
        visitId: item.visit_id || null,
        appointmentId: item.id,
        fromPhase: sourcePhaseId,
        toPhase: targetPhaseId
      }, {
        onError: () => {
          queryClient.invalidateQueries({ queryKey: ['queue-phases', selectedClinic, selectedDate, isDoctor, doctorId] })
          refetchPhases()
          alert(`Failed to check in patient`)
        }
      })
    } else if (item.visit_id) {
      movePatientMutation.mutate({
        visitId: item.visit_id,
        fromPhase: sourcePhaseId,
        toPhase: targetPhaseId
      }, {
        onError: () => {
          queryClient.invalidateQueries({ queryKey: ['queue-phases', selectedClinic, selectedDate, isDoctor, doctorId] })
          refetchPhases()
          alert(`Failed to move patient`)
        }
      })
    } else {
      queryClient.invalidateQueries({ queryKey: ['queue-phases', selectedClinic, selectedDate, isDoctor, doctorId] })
      refetchPhases()
      alert('Cannot move this appointment. Please check in the patient first.')
    }
    
    setDraggedItem(null)
  }

  // Calculate estimated wait time for patient
  const getEstimatedWaitTime = (patient, phase) => {
    if (phase.id !== 'waiting') return null
    if (!statistics?.avg_consultation_time_minutes) return null
    
    const waitingPatients = getPhaseData('waiting')
    const patientIndex = waitingPatients.findIndex(p => p.id === patient.id)
    const avgConsultationTime = statistics.avg_consultation_time_minutes || 15
    
    return (patientIndex + 1) * avgConsultationTime
  }

  // Format time
  const formatTime = (timeString) => {
    if (!timeString) return 'N/A'
    const date = new Date(timeString)
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })
  }

  // Format duration
  const formatDuration = (minutes) => {
    if (!minutes || minutes === 0) return 'N/A'
    if (minutes < 0) return 'N/A'
    const hours = Math.floor(minutes / 60)
    const mins = Math.floor(minutes % 60)
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  // Filter appointments based on search term only (doctor filtering is now done on backend)
  const filterAppointments = (appointments) => {
    if (!searchTerm) return appointments
    
    return appointments.filter(apt => 
      apt.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.patient_phone.includes(searchTerm)
    )
  }

  // Get phase data
  const getPhaseData = (phaseId) => {
    if (!phasesData?.phases) return []
    return filterAppointments(phasesData.phases[phaseId] || [])
  }

  // Export queue to CSV
  const handleExportQueue = () => {
    const headers = ['Phase', 'Patient Name', 'Phone', 'Doctor', 'Service', 'Time', 'Status']
    const csvRows = [headers.join(',')]
    
    phases.forEach(phase => {
      const appointments = getPhaseData(phase.id)
      appointments.forEach(apt => {
        const row = [
          phase.title,
          `"${apt.patient_name}"`,
          apt.patient_phone,
          apt.doctor_name,
          apt.service_name,
          formatTime(apt.start_time),
          apt.visit_status || 'unknown'
        ]
        csvRows.push(row.join(','))
      })
    })
    
    const csv = csvRows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `queue_${selectedDate}_${new Date().getTime()}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
          </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600">Error loading queue data</p>
          </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Queue Management</h2>
          <p className="text-gray-600">Manage patient flow through consultation phases</p>
              </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300"
            />
            <label className="text-sm text-gray-600">Auto-refresh</label>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchPhases()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportQueue}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Statistics Summary Card */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Today</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.total_appointments || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Wait Time</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatDuration(statistics.avg_wait_time_minutes)}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Consultation</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatDuration(statistics.avg_consultation_time_minutes)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Stethoscope className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.completed_count || 0}</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Date Filter */}
          <div className="min-w-0">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Date
            </label>
            <div className="flex gap-2 min-w-0">
              <div className="relative flex-1 min-w-0">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="pl-10 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0]
                  setSelectedDate(today)
                }}
                className="whitespace-nowrap shrink-0"
              >
                Today
              </Button>
            </div>
          </div>

          {/* Clinic Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Clinic
            </label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={selectedClinic || ''}
                onChange={(e) => setSelectedClinic(parseInt(e.target.value))}
                className="pl-10 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a clinic</option>
                {clinics.map(clinic => (
                  <option key={clinic.id} value={clinic.id}>
                    {clinic.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Doctor Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Doctor
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Doctors</option>
                {doctors.map(doctor => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Search */}
                    <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Patients
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
                      </div>
                    </div>
                  </div>
      </Card>

      {/* Queue Phases */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {phases.map((phase) => {
          const Icon = phase.icon
          const appointments = getPhaseData(phase.id)
          const isDragOver = dragOverPhase === phase.id

          return (
            <div
              key={phase.id}
              className={`${phase.bgColor} ${phase.borderColor} border-2 rounded-lg p-4 min-h-[600px] transition-all duration-200 ${
                isDragOver ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
              }`}
              onDragOver={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleDragOver(e, phase.id)
              }}
              onDragEnter={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleDragOver(e, phase.id)
              }}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, phase.id)}
            >
              {/* Phase Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Icon className={`w-5 h-5 ${phase.textColor}`} />
                  <h3 className={`font-semibold ${phase.textColor}`}>
                    {phase.title}
                  </h3>
                  </div>
                <Badge className={phase.badgeColor}>
                  {appointments.length}
                </Badge>
                    </div>

              {/* Appointments List */}
              <div className="space-y-3">
                {appointments.length === 0 ? (
                  <div className="text-center py-8">
                    <div className={`w-12 h-12 ${phase.textColor} opacity-30 mx-auto mb-2`}>
                      <Icon className="w-full h-full" />
                    </div>
                    <p className={`text-sm ${phase.textColor} opacity-60`}>
                      No patients in this phase
                    </p>
                  </div>
                ) : (
                  appointments.map((appointment, index) => {
                    const estimatedWaitTime = getEstimatedWaitTime(appointment, phase)
                    return (
                    <div
                      key={appointment.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, appointment, phase.id)}
                        className={`bg-white rounded-lg p-3 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 cursor-move relative ${
                        draggedItem?.id === appointment.id ? 'opacity-50' : ''
                      }`}
                    >
                        {/* Queue Position Badge */}
                        {phase.id === 'waiting' && (
                          <div className="absolute -top-2 -right-2 bg-yellow-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </div>
                        )}

                      {/* Patient Info */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4 text-gray-500" />
                            <span className="font-medium text-gray-900">
                              {appointment.patient_name}
                            </span>
                </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <Phone className="w-3 h-3 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {appointment.patient_phone}
                            </span>
                </div>
              </div>
                        <Move className="w-4 h-4 text-gray-400" />
                      </div>

                      {/* Appointment Details */}
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {formatTime(appointment.start_time)}
                          </span>
                  </div>
                    <div className="text-sm text-gray-600">
                          <span className="font-medium">{appointment.doctor_name}</span>
                          <span className="mx-1">•</span>
                          <span>{appointment.service_name}</span>
                    </div>
                        {appointment.booking_id && (
                          <div className="text-xs text-gray-500">
                            #{appointment.booking_id}
                    </div>
                        )}
                          
                          {/* Estimated Wait Time */}
                          {estimatedWaitTime && (
                            <div className="flex items-center space-x-2 mt-2 pt-2 border-t border-gray-100">
                              <Timer className="w-3 h-3 text-orange-500" />
                              <span className="text-xs font-medium text-orange-600">
                                ~{formatDuration(estimatedWaitTime)} wait
                              </span>
                            </div>
                          )}
                  </div>

                      {/* Action Buttons */}
                      {phase.id === 'appointments_today' && (
                    <Button
                      size="sm"
                          className="w-full mt-2 bg-blue-600 hover:bg-blue-700"
                          onClick={async (e) => {
                              const mutationParams = {
                                visitId: appointment.visit_id || null,
                                    appointmentId: appointment.id,
                                    fromPhase: 'appointments_today',
                                    toPhase: 'waiting'
                                  }
                              
                              const button = e.currentTarget
                              button.disabled = true
                              
                              queryClient.setQueryData(['queue-phases', selectedClinic, selectedDate, isDoctor, doctorId], (oldData) => {
                                if (!oldData?.phases) return oldData
                                
                                const newPhases = { ...oldData.phases }
                                
                                if (newPhases.appointments_today) {
                                  newPhases.appointments_today = newPhases.appointments_today.filter(apt => apt.id !== appointment.id)
                                }
                                
                                if (!newPhases.waiting) {
                                  newPhases.waiting = []
                                }
                                const updatedAppointment = { 
                                  ...appointment, 
                                  queue_phase: 'waiting', 
                                  phaseId: 'waiting',
                                  visit_status: 'waiting'
                                }
                                newPhases.waiting.push(updatedAppointment)
                                
                                return { ...oldData, phases: newPhases }
                              })
                              
                              movePatientMutation.mutate(mutationParams, {
                                onSuccess: () => {},
                                onError: () => {
                                  button.disabled = false
                                  queryClient.invalidateQueries({ queryKey: ['queue-phases', selectedClinic, selectedDate, isDoctor, doctorId] })
                                  refetchPhases()
                                  alert(`Failed to check in patient`)
                                }
                              })
                          }}
                        >
                          Mark Waiting
                    </Button>
                  )}

                      {/* Only receptionists can move from waiting to with_doctor */}
                      {phase.id === 'waiting' && !isDoctor && (
                        <Button
                          size="sm"
                          className="w-full mt-2 bg-yellow-600 hover:bg-yellow-700"
                          onClick={() => {
                              if (!appointment.visit_id) {
                                alert('Cannot move appointment without visit. Please check in first.')
                                return
                              }
                            movePatientMutation.mutate({
                              visitId: appointment.visit_id,
                              fromPhase: 'waiting',
                              toPhase: 'with_doctor'
                            })
                          }}
                        >
                            Start Consultation
                        </Button>
                      )}

                      {/* Only doctors can complete their appointments from with_doctor phase */}
                      {phase.id === 'with_doctor' && isDoctor && (
                      <Button
                        size="sm"
                          className="w-full mt-2 bg-green-600 hover:bg-green-700"
                          onClick={() => {
                              if (!appointment.visit_id) {
                                alert('Cannot complete appointment without visit.')
                                return
                              }
                            movePatientMutation.mutate({
                              visitId: appointment.visit_id,
                              fromPhase: 'with_doctor',
                              toPhase: 'completed'
                            })
                          }}
                        >
                            Complete Consultation
                        </Button>
                      )}
                      
                      {/* Receptionists can also complete (if needed for edge cases) */}
                      {phase.id === 'with_doctor' && !isDoctor && (
                      <Button
                        size="sm"
                          className="w-full mt-2 bg-green-600 hover:bg-green-700"
                          onClick={() => {
                              if (!appointment.visit_id) {
                                alert('Cannot complete appointment without visit.')
                                return
                              }
                            movePatientMutation.mutate({
                              visitId: appointment.visit_id,
                              fromPhase: 'with_doctor',
                              toPhase: 'completed'
                            })
                          }}
                        >
                            Complete Consultation
                        </Button>
                      )}

                      {phase.id === 'completed' && (
                          <Button
                            size="sm"
                            className="w-full mt-2 bg-gray-600 hover:bg-gray-700"
                            onClick={() => {
                              if (appointment.payment_id) {
                                navigate(`/reception/payments?paymentId=${appointment.payment_id}`)
                              } else if (appointment.visit_id) {
                                navigate(`/reception/payments?visitId=${appointment.visit_id}`)
                              } else {
                                alert('Payment information not available for this appointment.')
                              }
                            }}
                          >
                            Process Payment
                      </Button>
                  )}
                </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
              </div>
    </div>
  )
}

export default QueueManagement
