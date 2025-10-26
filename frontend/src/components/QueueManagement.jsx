import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
  Filter
} from 'lucide-react'
import { queueApi } from '../api/queue'
import { useSocket } from '../hooks/useSocket'
import Button from './common/Button'
import Card from './common/Card'
import Badge from './common/Badge'
import Modal from './common/Modal'
import Spinner from './common/Spinner'

const QueueManagement = ({ onQueueUpdate }) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedClinic, setSelectedClinic] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [draggedItem, setDraggedItem] = useState(null)
  const [dragOverPhase, setDragOverPhase] = useState(null)

  // Socket connection for real-time updates
  useSocket()

  // Fetch queue phases data
  const { data: phasesData, isLoading, error } = useQuery({
    queryKey: ['queue-phases', selectedClinic, selectedDate],
    queryFn: () => queueApi.getQueuePhases(selectedClinic, selectedDate),
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  // Move patient mutation
  const movePatientMutation = useMutation({
    mutationFn: ({ visitId, fromPhase, toPhase }) => 
      queueApi.movePatientPhase(visitId, fromPhase, toPhase),
    onSuccess: () => {
      queryClient.invalidateQueries(['queue-phases'])
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
    setDraggedItem({ ...item, phaseId })
    e.dataTransfer.effectAllowed = 'move'
  }

  // Handle drag over
  const handleDragOver = (e, phaseId) => {
    e.preventDefault()
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
    setDragOverPhase(null)
    
    if (!draggedItem || draggedItem.phaseId === targetPhaseId) {
      setDraggedItem(null)
      return
    }

    // Move patient to new phase
    movePatientMutation.mutate({
      visitId: draggedItem.visit_id,
      fromPhase: draggedItem.phaseId,
      toPhase: targetPhaseId
    })
    
    setDraggedItem(null)
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

  // Filter appointments based on search term
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

  // Handle payment modal
  const handleProcessPayment = () => {
    setShowPaymentModal(false)
    navigate('/payments')
  }

  const handleSkipPayment = () => {
    setShowPaymentModal(false)
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
        <div className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleTimeString()}
            </div>
              </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Date Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
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
                value={selectedClinic}
                onChange={(e) => setSelectedClinic(parseInt(e.target.value))}
                className="pl-10 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={1}>Dermatology</option>
                <option value={2}>Internal Medicine</option>
                <option value={3}>Dentistry</option>
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
              onDragOver={(e) => handleDragOver(e, phase.id)}
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
                  appointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, appointment, phase.id)}
                      className={`bg-white rounded-lg p-3 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 cursor-move ${
                        draggedItem?.id === appointment.id ? 'opacity-50' : ''
                      }`}
                    >
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
                  </div>

                      {/* Action Buttons */}
                      {phase.id === 'appointments_today' && (
                    <Button
                      size="sm"
                          className="w-full mt-2 bg-blue-600 hover:bg-blue-700"
                          onClick={() => {
                            movePatientMutation.mutate({
                              visitId: appointment.visit_id,
                              fromPhase: 'appointments_today',
                              toPhase: 'waiting'
                            })
                          }}
                        >
                          Mark Waiting
                    </Button>
                  )}

                      {phase.id === 'waiting' && (
                        <Button
                          size="sm"
                          className="w-full mt-2 bg-yellow-600 hover:bg-yellow-700"
                          onClick={() => {
                            movePatientMutation.mutate({
                              visitId: appointment.visit_id,
                              fromPhase: 'waiting',
                              toPhase: 'with_doctor'
                            })
                          }}
                        >
                          Call Patient
                        </Button>
                      )}

                      {phase.id === 'with_doctor' && (
                      <Button
                        size="sm"
                          className="w-full mt-2 bg-green-600 hover:bg-green-700"
                          onClick={() => {
                            movePatientMutation.mutate({
                              visitId: appointment.visit_id,
                              fromPhase: 'with_doctor',
                              toPhase: 'completed'
                            })
                            setShowPaymentModal(true)
                          }}
                        >
                        Complete
                        </Button>
                      )}

                      {phase.id === 'completed' && (
                        <div className="flex space-x-2 mt-2">
                          <Button
                            size="sm"
                            className="flex-1 bg-gray-600 hover:bg-gray-700"
                            onClick={handleProcessPayment}
                          >
                            Process Payment
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                            className="flex-1"
                            onClick={() => {
                              // Could add action to move back to waiting if needed
                            }}
                      >
                            View Details
                      </Button>
                    </div>
                  )}
                </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
              </div>

      {/* Payment Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Process Payment"
      >
        <div className="text-center py-4">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">
            Consultation Completed
          </p>
          <p className="text-gray-600 mb-6">
            Would you like to process the payment now?
          </p>
          <div className="flex space-x-3 justify-center">
            <Button
              variant="outline"
              onClick={handleSkipPayment}
            >
              Skip for Now
            </Button>
            <Button
              onClick={handleProcessPayment}
              className="bg-green-600 hover:bg-green-700"
            >
              Process Payment
            </Button>
                    </div>
                  </div>
      </Modal>
    </div>
  )
}

export default QueueManagement