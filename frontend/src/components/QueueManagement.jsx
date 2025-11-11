/**
 * Queue Management Component - Redesigned with UI Kit
 * 
 * Modern queue management component using the unified design system.
 * Preserves all API calls, drag-and-drop, Socket.IO, and mutations.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { 
  Calendar, Clock, User, Phone, Stethoscope, CheckCircle, AlertCircle,
  Move, Search, Filter, TrendingUp, RefreshCw, Download, Timer, Activity
} from 'lucide-react'
import { queueApi } from '../api/queue'
import { clinicsApi } from '../api/clinics'
import { doctorsApi } from '../api/doctors'
import { useSocket } from '../hooks/useSocket'
import { useMutationWithRefetch } from '../hooks/useMutationWithRefetch'
import { useDoctorFilters } from '../hooks/useDoctorFilters'
import { useAuthStore } from '../stores/authStore'
import { useQueueStore } from '../stores/queueStore'
import { Button, Badge } from '../ui-kit'
import { Card, CardContent, CardHeader, CardTitle } from '../ui-kit'
import { Input, Label } from '../ui-kit'
import { Skeleton } from '../ui-kit'
import StatCard from './dashboard/StatCard'

const QueueManagement = ({ clinicId, onQueueUpdate }) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { doctorId, isDoctor } = useDoctorFilters()
  const { user } = useAuthStore()
  const { selectedClinic: queueStoreClinic, setSelectedClinic: setQueueStoreClinic } = useQueueStore()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  // Use queueStore clinic if available, otherwise use prop or default
  const selectedClinic = queueStoreClinic || clinicId || null
  const setSelectedClinic = (clinicId) => {
    setQueueStoreClinic(clinicId)
  }
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

  // Auto-select first clinic if none selected (sync with queueStore)
  useEffect(() => {
    if (isDoctor && clinicId) {
      // For doctors, always use their clinic
      if (selectedClinic !== clinicId) {
        setSelectedClinic(clinicId)
      }
    } else if (!isDoctor && clinics.length > 0 && !selectedClinic) {
      // For receptionists/admins, use first clinic if none selected
      setSelectedClinic(clinics[0].id)
    }
  }, [clinics, selectedClinic, isDoctor, clinicId])

  // Fetch queue phases data
  const { data: phasesData, isLoading, error, refetch: refetchPhases } = useQuery({
    queryKey: ['queue-phases', selectedClinic, selectedDate, isDoctor, doctorId, selectedDoctor],
    queryFn: () => {
      const filterDoctorId = !isDoctor && selectedDoctor !== 'all' ? parseInt(selectedDoctor) : null
      return queueApi.getQueuePhases(selectedClinic, selectedDate, filterDoctorId)
    },
    refetchInterval: autoRefresh ? 30000 : false,
    enabled: !!selectedClinic,
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000
  })

  // Fetch queue statistics
  const { data: statistics } = useQuery({
    queryKey: ['queue-statistics', selectedClinic, selectedDate],
    queryFn: () => queueApi.getQueueStatistics(selectedClinic, selectedDate),
    enabled: !!selectedClinic,
    refetchInterval: autoRefresh ? 30000 : false,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000
  })

  // Listen for socket updates
  useEffect(() => {
    if (!socket || !refetchPhases) return

    const handlePhasesUpdate = (data) => {
      const socketDate = data.date ? data.date.split('T')[0] : data.date
      const currentDate = selectedDate ? selectedDate.split('T')[0] : selectedDate
      
      const isRelevantUpdate = 
        data.clinic_id === selectedClinic && 
        socketDate === currentDate &&
        (!isDoctor || !data.doctor_id || data.doctor_id === doctorId)
      
      if (isRelevantUpdate) {
        queryClient.setQueryData(['queue-phases', selectedClinic, selectedDate, isDoctor, doctorId, selectedDoctor], {
          phases: data.phases,
          date: data.date,
          clinic_id: data.clinic_id
        })
      } else {
        refetchPhases()
      }
    }

    socket.on('phases_updated', handlePhasesUpdate)

    return () => {
      socket.off('phases_updated', handlePhasesUpdate)
    }
  }, [socket, selectedClinic, selectedDate, queryClient, refetchPhases, isDoctor, doctorId, selectedDoctor])

  // Move patient mutation
  const movePatientMutation = useMutationWithRefetch({
    mutationFn: ({ visitId, fromPhase, toPhase, appointmentId }) => 
      queueApi.movePatientPhase(visitId, fromPhase, toPhase, appointmentId),
    queryKeys: [['queue-phases'], ['dashboard-stats'], ['queue-statistics']],
    onSuccessMessage: 'تم نقل المريض بنجاح',
    onErrorMessage: 'فشل نقل المريض',
    onSuccessCallback: async () => {
      queryClient.invalidateQueries({ 
        queryKey: ['queue-phases', selectedClinic, selectedDate, isDoctor, doctorId, selectedDoctor],
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
      title: 'مواعيد اليوم',
      icon: Calendar,
      color: 'blue',
      variant: 'default'
    },
    {
      id: 'waiting',
      title: 'في الانتظار',
      icon: Clock,
      color: 'amber',
      variant: 'outline'
    },
    {
      id: 'with_doctor',
      title: 'مع الطبيب',
      icon: Stethoscope,
      color: 'green',
      variant: 'success'
    },
    {
      id: 'completed',
      title: 'مكتمل',
      icon: CheckCircle,
      color: 'gray',
      variant: 'secondary'
    }
  ]

  // Handle drag start
  const handleDragStart = useCallback((e, item, phaseId) => {
    const dragItem = { ...item, phaseId, queue_phase: item.queue_phase || phaseId }
    setDraggedItem(dragItem)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.dropEffect = 'move'
    e.dataTransfer.setData('text/plain', JSON.stringify(dragItem))
  }, [])

  // Handle drag over
  const handleDragOver = useCallback((e, phaseId) => {
    e.preventDefault()
    
    // Get the dragged item phase
    const draggedPhase = draggedItem?.phaseId || draggedItem?.queue_phase
    
    // Doctors cannot move to "with_doctor" phase
    if (isDoctor && phaseId === 'with_doctor') {
      e.dataTransfer.dropEffect = 'none'
      return
    }
    
    // Reception cannot move from "with_doctor" to "completed" (only doctors can)
    if (!isDoctor && draggedPhase === 'with_doctor' && phaseId === 'completed') {
      e.dataTransfer.dropEffect = 'none'
      return
    }
    
    e.dataTransfer.dropEffect = 'move'
    setDragOverPhase(phaseId)
  }, [isDoctor, draggedItem])

  // Handle drag leave
  const handleDragLeave = useCallback(() => {
    setDragOverPhase(null)
  }, [])

  // Handle drop
  const handleDrop = (e, targetPhaseId) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverPhase(null)
    
    // Parse drag data
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

    const sourcePhaseId = item.phaseId || item.queue_phase || 'appointments_today'
    
    // Doctors cannot move to "with_doctor" phase (only receptionists can start consultations)
    if (isDoctor && targetPhaseId === 'with_doctor') {
      setDraggedItem(null)
      alert('لا يمكن للأطباء نقل المواعيد إلى مرحلة "مع الطبيب". فقط موظفو الاستقبال يمكنهم بدء الاستشارات.')
      return
    }
    
    // Doctors cannot check-in patients (move from appointments_today to waiting)
    if (isDoctor && sourcePhaseId === 'appointments_today' && targetPhaseId === 'waiting') {
      setDraggedItem(null)
      alert('لا يمكن للأطباء تسجيل دخول المرضى. فقط موظفو الاستقبال يمكنهم تسجيل دخول المرضى.')
      return
    }
    
    // Reception cannot move from "with_doctor" to "completed" (only doctors can)
    if (!isDoctor && sourcePhaseId === 'with_doctor' && targetPhaseId === 'completed') {
      setDraggedItem(null)
      alert('لا يمكن لموظفي الاستقبال إكمال المواعيد. فقط الأطباء يمكنهم إكمال الاستشارات.')
      return
    }

    // Optimistic update
    queryClient.setQueryData(['queue-phases', selectedClinic, selectedDate, isDoctor, doctorId, selectedDoctor], (oldData) => {
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
          queryClient.invalidateQueries({ queryKey: ['queue-phases', selectedClinic, selectedDate, isDoctor, doctorId, selectedDoctor] })
          refetchPhases()
          alert(`فشل تسجيل دخول المريض`)
        }
      })
    } else if (item.visit_id) {
      movePatientMutation.mutate({
        visitId: item.visit_id,
        fromPhase: sourcePhaseId,
        toPhase: targetPhaseId
      }, {
        onError: () => {
          queryClient.invalidateQueries({ queryKey: ['queue-phases', selectedClinic, selectedDate, isDoctor, doctorId, selectedDoctor] })
          refetchPhases()
          alert(`فشل نقل المريض`)
        }
      })
    } else {
      queryClient.invalidateQueries({ queryKey: ['queue-phases', selectedClinic, selectedDate, isDoctor, doctorId, selectedDoctor] })
      refetchPhases()
      alert('لا يمكن نقل هذا الموعد. يرجى تسجيل دخول المريض أولاً.')
    }
    
    setDraggedItem(null)
  }

  // Format time
  const formatTime = useCallback((timeString) => {
    if (!timeString) return 'N/A'
    const date = new Date(timeString)
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })
  }, [])

  // Format duration
  const formatDuration = useCallback((minutes) => {
    if (!minutes || minutes === 0) return 'N/A'
    if (minutes < 0) return 'N/A'
    const hours = Math.floor(minutes / 60)
    const mins = Math.floor(minutes % 60)
    if (hours > 0) {
      return `${hours}س ${mins}د`
    }
    return `${mins}د`
  }, [])

  // Filter appointments
  const filterAppointments = useCallback((appointments) => {
    if (!searchTerm) return appointments
    
    const lowerSearch = searchTerm.toLowerCase()
    return appointments.filter(apt => 
      apt.patient_name?.toLowerCase().includes(lowerSearch) ||
      apt.patient_phone?.includes(searchTerm) ||
      apt.doctor_name?.toLowerCase().includes(lowerSearch) ||
      apt.service_name?.toLowerCase().includes(lowerSearch)
    )
  }, [searchTerm])

  // Get phase data
  const getPhaseData = useCallback((phaseId) => {
    if (!phasesData?.phases) return []
    return filterAppointments(phasesData.phases[phaseId] || [])
  }, [phasesData, filterAppointments])

  // Calculate estimated wait time
  const getEstimatedWaitTime = useCallback((patient, phase) => {
    if (phase.id !== 'waiting') return null
    if (!statistics?.avg_consultation_time_minutes) return null
    
    const waitingPatients = getPhaseData('waiting')
    const patientIndex = waitingPatients.findIndex(p => p.id === patient.id)
    const avgConsultationTime = statistics.avg_consultation_time_minutes || 15
    
    return (patientIndex + 1) * avgConsultationTime
  }, [statistics, getPhaseData])

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
        <div className="space-y-4 w-full max-w-md">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" aria-hidden="true" />
          <h3 className="text-lg font-semibold text-red-600 mb-2 font-arabic">خطأ في تحميل بيانات الطابور</h3>
          <p className="text-gray-600 font-arabic">{error.message}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6" aria-label="إدارة الطابور">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-200">
        <div className="space-y-1">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 font-arabic">
            إدارة الطابور
          </h2>
          <p className="text-sm text-gray-600 font-arabic">إدارة تدفق المرضى خلال مراحل الاستشارة</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-4 py-2">
            <input
              type="checkbox"
              id="auto-refresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 focus:ring-2 focus:ring-medical-blue-200 text-medical-blue-600"
              aria-label="تحديث تلقائي"
            />
            <Label htmlFor="auto-refresh" className="text-sm font-medium text-gray-900 font-arabic cursor-pointer">
              تحديث تلقائي
            </Label>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchPhases()}
            className="flex items-center gap-2"
            aria-label="تحديث الطابور"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">تحديث</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportQueue}
            className="flex items-center gap-2"
            aria-label="تصدير الطابور"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">تصدير CSV</span>
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="إجمالي اليوم"
            value={statistics.total_appointments || 0}
            subtitle="جميع المواعيد"
            icon={Activity}
            iconColor="blue"
            loading={false}
          />
          <StatCard
            title="متوسط وقت الانتظار"
            value={formatDuration(statistics.avg_wait_time_minutes)}
            subtitle="متوسط المدة"
            icon={Clock}
            iconColor="amber"
            loading={false}
          />
          <StatCard
            title="متوسط الاستشارة"
            value={formatDuration(statistics.avg_consultation_time_minutes)}
            subtitle="متوسط المدة"
            icon={Stethoscope}
            iconColor="green"
            loading={false}
          />
          <StatCard
            title="مكتمل"
            value={statistics.completed_count || 0}
            subtitle="استشارات مكتملة"
            icon={CheckCircle}
            iconColor="gray"
            loading={false}
          />
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Filter */}
            <div className="space-y-2">
              <Label htmlFor="queue-date" className="font-arabic">التاريخ</Label>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" aria-hidden="true" />
                <div className="flex gap-2 flex-1">
                  <Input
                    id="queue-date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="flex-1 text-sm font-arabic"
                    aria-label="اختر التاريخ"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0]
                      setSelectedDate(today)
                    }}
                    className="whitespace-nowrap"
                    aria-label="اختر اليوم"
                  >
                    اليوم
                  </Button>
                </div>
              </div>
            </div>

            {/* Clinic Filter - Only for Reception/Admin */}
            {!isDoctor && (
              <div className="space-y-2">
                <Label htmlFor="queue-clinic" className="font-arabic">العيادة</Label>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" aria-hidden="true" />
                  <select
                    id="queue-clinic"
                    value={selectedClinic || ''}
                    onChange={(e) => setSelectedClinic(parseInt(e.target.value))}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium focus:border-medical-blue-500 focus:ring-2 focus:ring-medical-blue-100 bg-white text-gray-900 font-arabic"
                    aria-label="فلترة حسب العيادة"
                  >
                    <option value="">اختر عيادة</option>
                    {clinics.map(clinic => (
                      <option key={clinic.id} value={clinic.id}>
                        {clinic.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Doctor Filter - Only for Reception/Admin */}
            {!isDoctor && (
              <div className="space-y-2">
                <Label htmlFor="queue-doctor" className="font-arabic">الطبيب</Label>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" aria-hidden="true" />
                  <select
                    id="queue-doctor"
                    value={selectedDoctor}
                    onChange={(e) => setSelectedDoctor(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium focus:border-medical-blue-500 focus:ring-2 focus:ring-medical-blue-100 bg-white text-gray-900 font-arabic"
                    aria-label="فلترة حسب الطبيب"
                  >
                    <option value="all">كل الأطباء</option>
                    {doctors.map(doctor => (
                      <option key={doctor.id} value={doctor.id}>
                        {doctor.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="queue-search" className="font-arabic">البحث</Label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden="true" />
                <Input
                  id="queue-search"
                  type="text"
                  placeholder="البحث بالاسم أو الهاتف..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 pl-4 font-arabic"
                  aria-label="بحث المرضى"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Queue Phases - Kanban Style */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {phases.map((phase) => {
          const Icon = phase.icon
          const appointments = getPhaseData(phase.id)
          const isDragOver = dragOverPhase === phase.id
          
          // Phase-specific colors
          const phaseColors = {
            appointments_today: {
              border: 'border-medical-blue-200',
              bg: 'bg-medical-blue-50/20',
              icon: 'text-medical-blue-600',
              gradient: 'from-medical-blue-500 to-medical-blue-600'
            },
            waiting: {
              border: 'border-amber-200',
              bg: 'bg-amber-50/20',
              icon: 'text-amber-600',
              gradient: 'from-amber-500 to-amber-600'
            },
            with_doctor: {
              border: 'border-medical-green-200',
              bg: 'bg-medical-green-50/20',
              icon: 'text-medical-green-600',
              gradient: 'from-medical-green-500 to-medical-green-600'
            },
            completed: {
              border: 'border-gray-200',
              bg: 'bg-gray-50/20',
              icon: 'text-gray-600',
              gradient: 'from-gray-500 to-gray-600'
            }
          }
          
          const colors = phaseColors[phase.id] || phaseColors.completed

          return (
            <div
              key={phase.id}
              className={`bg-white border-2 ${colors.border} rounded-lg min-h-[500px] transition-all duration-300 shadow-md hover:shadow-lg overflow-hidden ${
                isDragOver ? 'ring-2 ring-medical-blue-300 scale-[1.02]' : ''
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
              aria-label={`${phase.title} - ${appointments.length} موعد`}
            >
              {/* Phase Header */}
              <div className={`px-4 py-4 border-b-2 ${colors.border} bg-white/80`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${colors.gradient} shadow-md`}>
                      <Icon className="w-4 h-4 text-white" aria-hidden="true" />
                    </div>
                    <h3 className={`font-bold text-base ${colors.icon} font-arabic`}>
                      {phase.title}
                    </h3>
                  </div>
                  <Badge variant={phase.variant} className="font-arabic">
                    {appointments.length}
                  </Badge>
                </div>
              </div>

              {/* Appointments List */}
              <div className="px-3 py-3 space-y-3 max-h-[500px] overflow-y-auto">
                {appointments.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <Icon className={`w-10 h-10 ${colors.icon} opacity-40 mx-auto mb-3`} aria-hidden="true" />
                    <p className={`text-sm font-medium ${colors.icon} opacity-70 font-arabic`}>
                      لا يوجد مواعيد
                    </p>
                  </div>
                ) : (
                  appointments.map((appointment, index) => {
                    const estimatedWaitTime = getEstimatedWaitTime(appointment, phase)
                    
                    return (
                      <Card
                        key={appointment.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, appointment, phase.id)}
                        className={`cursor-move border-2 ${colors.border} hover:shadow-lg transition-all duration-300 relative ${
                          draggedItem?.id === appointment.id ? 'opacity-50 scale-95' : 'hover:scale-[1.01]'
                        }`}
                        aria-label={`${appointment.patient_name} - ${phase.title}`}
                      >
                        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${colors.gradient}`} aria-hidden="true" />
                        
                        {/* Queue Position Badge */}
                        {phase.id === 'waiting' && (
                          <Badge variant="default" className="absolute -top-2 -right-2 z-10 font-arabic">
                            #{index + 1}
                          </Badge>
                        )}

                        <CardContent className="p-4 space-y-3">
                          {/* Patient Header */}
                          <div className="flex items-start gap-3">
                            <div className={`flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br ${colors.gradient} flex items-center justify-center shadow-md`}>
                              <User className="w-5 h-5 text-white" aria-hidden="true" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-base text-gray-900 mb-1 truncate font-arabic">
                                {appointment.patient_name}
                              </h4>
                              <div className="flex items-center gap-1 text-xs text-gray-600">
                                <Phone className={`w-3 h-3 ${colors.icon}`} aria-hidden="true" />
                                <span className="font-medium truncate font-arabic">{appointment.patient_phone}</span>
                              </div>
                            </div>
                          </div>

                          {/* Appointment Details */}
                          <div className={`space-y-2 p-3 ${colors.bg} rounded-lg border ${colors.border}`}>
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className={`w-4 h-4 ${colors.icon}`} aria-hidden="true" />
                              <span className="font-semibold text-gray-900 font-arabic">{formatTime(appointment.start_time)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Stethoscope className={`w-4 h-4 ${colors.icon}`} aria-hidden="true" />
                              <span className="font-medium text-gray-700 font-arabic">د. {appointment.doctor_name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Activity className={`w-4 h-4 ${colors.icon}`} aria-hidden="true" />
                              <span className="font-medium text-gray-700 font-arabic">{appointment.service_name}</span>
                            </div>
                            {appointment.booking_id && (
                              <div className="text-xs text-gray-600 font-arabic">
                                رقم الحجز: {appointment.booking_id}
                              </div>
                            )}
                            {estimatedWaitTime && (
                              <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                                <Timer className={`w-4 h-4 ${colors.icon}`} aria-hidden="true" />
                                <span className={`text-sm font-bold ${colors.icon} font-arabic`}>
                                  ~{formatDuration(estimatedWaitTime)}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          {phase.id === 'appointments_today' && !isDoctor && (
                            <Button
                              size="sm"
                              className="w-full"
                              onClick={async (e) => {
                                const mutationParams = {
                                  visitId: appointment.visit_id || null,
                                  appointmentId: appointment.id,
                                  fromPhase: 'appointments_today',
                                  toPhase: 'waiting'
                                }
                                
                                const button = e.currentTarget
                                button.disabled = true
                                
                                queryClient.setQueryData(['queue-phases', selectedClinic, selectedDate, isDoctor, doctorId, selectedDoctor], (oldData) => {
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
                                    queryClient.invalidateQueries({ queryKey: ['queue-phases', selectedClinic, selectedDate, isDoctor, doctorId, selectedDoctor] })
                                    refetchPhases()
                                    alert(`فشل تسجيل دخول المريض`)
                                  }
                                })
                              }}
                              aria-label={`تسجيل دخول ${appointment.patient_name}`}
                            >
                              تسجيل الدخول
                            </Button>
                          )}

                          {phase.id === 'waiting' && !isDoctor && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full"
                              onClick={() => {
                                if (!appointment.visit_id) {
                                  alert('لا يمكن نقل الموعد بدون زيارة. يرجى تسجيل دخول المريض أولاً.')
                                  return
                                }
                                movePatientMutation.mutate({
                                  visitId: appointment.visit_id,
                                  fromPhase: 'waiting',
                                  toPhase: 'with_doctor'
                                })
                              }}
                              aria-label={`بدء الاستشارة ${appointment.patient_name}`}
                            >
                              بدء الاستشارة
                            </Button>
                          )}

                          {phase.id === 'with_doctor' && isDoctor && (
                            <Button
                              size="sm"
                              variant="success"
                              className="w-full"
                              onClick={() => {
                                if (!appointment.visit_id) {
                                  alert('لا يمكن إكمال الموعد بدون زيارة.')
                                  return
                                }
                                movePatientMutation.mutate({
                                  visitId: appointment.visit_id,
                                  fromPhase: 'with_doctor',
                                  toPhase: 'completed'
                                })
                              }}
                              aria-label={`إكمال الاستشارة ${appointment.patient_name}`}
                            >
                              إكمال الاستشارة
                            </Button>
                          )}

                          {phase.id === 'completed' && !isDoctor && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full"
                              onClick={() => {
                                if (appointment.payment_id) {
                                  navigate(`/reception/payments?paymentId=${appointment.payment_id}`)
                                } else if (appointment.visit_id) {
                                  navigate(`/reception/payments?visitId=${appointment.visit_id}`)
                                } else {
                                  alert('معلومات الدفع غير متاحة لهذا الموعد.')
                                }
                              }}
                              aria-label={`معالجة الدفع ${appointment.patient_name}`}
                            >
                              معالجة الدفع
                            </Button>
                          )}
                        </CardContent>
                      </Card>
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
