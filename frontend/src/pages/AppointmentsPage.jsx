import React, { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  Copy,
  Download,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet
} from 'lucide-react'
import { Button } from '../components/common/Button'
import { Card } from '../components/common/Card'
import { Modal } from '../components/common/Modal'
import { Spinner } from '../components/common/Spinner'
import BookingWizard from '../components/BookingWizard'
import { appointmentsApi, clinicsApi, doctorsApi } from '../api'
import { formatDate, formatTime } from '../utils/formatters'
import { useMutationWithRefetch } from '../hooks/useMutationWithRefetch'
import { useDoctorFilters } from '../hooks/useDoctorFilters'
import PageContainer from '../components/layout/PageContainer'

const AppointmentsPage = () => {
  const queryClient = useQueryClient()
  const { doctorId, clinicId, isDoctor, addFilters } = useDoctorFilters()
  
  // Filters
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [clinicFilter, setClinicFilter] = useState('all')
  const [doctorFilter, setDoctorFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [useDateRange, setUseDateRange] = useState(false)
  
  // Auto-set filters for doctors
  useEffect(() => {
    if (isDoctor) {
      if (clinicId) setClinicFilter(clinicId.toString())
      if (doctorId) setDoctorFilter(doctorId.toString())
    }
  }, [isDoctor, clinicId, doctorId])
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const perPage = 20 // Fixed value, no need for state
  
  // Modals
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false)
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    start_time: '',
    service_id: null,
    doctor_id: null,
    clinic_id: null,
    status: '',
    notes: ''
  })
  
  // Cancel form state
  const [cancelReason, setCancelReason] = useState('')

  // Build query params
  let queryParams = {
    page: currentPage,
    per_page: perPage
  }
  
  // Date handling
  if (useDateRange && startDate && endDate) {
    queryParams.start_date = startDate
    queryParams.end_date = endDate
  } else {
    queryParams.date = selectedDate.toISOString().split('T')[0]
  }
  
  if (clinicFilter !== 'all') queryParams.clinic_id = parseInt(clinicFilter)
  if (doctorFilter !== 'all') queryParams.doctor_id = parseInt(doctorFilter)
  if (statusFilter !== 'all') queryParams.status = statusFilter

  // Add doctor/clinic filters automatically for doctors
  queryParams = addFilters(queryParams)

  // Fetch appointments with pagination
  const { data: appointmentsData, isLoading, error } = useQuery({
    queryKey: ['appointments', queryParams],
    queryFn: () => appointmentsApi.getAppointments(queryParams).then(res => ({
      appointments: res?.appointments || [],
      total: res?.total || 0,
      pages: res?.pages || 1,
      current_page: res?.current_page || 1
    }))
  })
  
  const appointments = appointmentsData?.appointments || []
  const totalPages = appointmentsData?.pages || 1
  const total = appointmentsData?.total || 0

  // Fetch clinics for filter
  // Use a unique query key to avoid cache conflicts with other components
  const { data: clinicsData } = useQuery({
    queryKey: ['clinics', 'appointments-page'],
    queryFn: async () => {
      try {
        const res = await clinicsApi.getClinics()
        // Backend returns { clinics: [...] }
        if (res && res.clinics && Array.isArray(res.clinics)) {
          return res.clinics
        }
        // Handle edge case where response might be array directly
        if (Array.isArray(res)) {
          return res
        }
        // Return empty array as fallback
        console.warn('Unexpected clinics API response format:', res)
        return []
      } catch (error) {
        console.error('Error fetching clinics:', error)
        return []
      }
    },
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000 // 10 minutes
  })
  
  // Ensure clinics is always an array with defensive check
  const clinics = Array.isArray(clinicsData) ? clinicsData : []

  // Fetch doctors for filter (filtered by selected clinic)
  const { data: doctorsData } = useQuery({
    queryKey: ['doctors', clinicFilter],
    queryFn: () => {
      if (clinicFilter === 'all') {
        return doctorsApi.getDoctors().then(res => {
          if (res && res.doctors && Array.isArray(res.doctors)) {
            return res.doctors
          }
          if (Array.isArray(res)) {
            return res
          }
          return []
        })
      }
      return doctorsApi.getDoctors({ clinic_id: parseInt(clinicFilter) }).then(res => {
        if (res && res.doctors && Array.isArray(res.doctors)) {
          return res.doctors
        }
        if (Array.isArray(res)) {
          return res
        }
        return []
      })
    },
    enabled: true,
    retry: 2,
    staleTime: 5 * 60 * 1000 // 5 minutes
  })
  
  // Ensure doctors is always an array
  const doctors = Array.isArray(doctorsData) ? doctorsData : []

  // Fetch services for selected clinic
  const { data: servicesData } = useQuery({
    queryKey: ['clinic-services', clinicFilter],
    queryFn: () => {
      if (clinicFilter === 'all') return Promise.resolve({ services: [] })
      return clinicsApi.getClinicServices(parseInt(clinicFilter)).then(res => ({ services: res?.services || [] }))
    },
    enabled: clinicFilter !== 'all'
  })
  
  const services = servicesData?.services || []

  // Get available slots for rescheduling
  const { data: availableSlots = [] } = useQuery({
    queryKey: ['available-slots', editForm.doctor_id, selectedDate],
    queryFn: () => {
      if (!editForm.doctor_id || !selectedAppointment?.clinic_id) return Promise.resolve([])
      return appointmentsApi.getAvailableSlots({
        clinic_id: editForm.clinic_id || selectedAppointment.clinic_id,
        doctor_id: editForm.doctor_id,
        date: selectedDate.toISOString().split('T')[0]
      }).then(res => res?.slots || [])
    },
    enabled: isRescheduleModalOpen && !!editForm.doctor_id
  })

  // Update appointment mutation
  const updateAppointmentMutation = useMutationWithRefetch({
    mutationFn: ({ id, data }) => appointmentsApi.updateAppointment(id, data),
    queryKeys: [['appointments'], ['dashboard-stats'], ['queue-phases']],
    onSuccessMessage: 'Appointment updated successfully',
    onErrorMessage: 'Failed to update appointment',
    onSuccessCallback: () => {
      setIsEditModalOpen(false)
      setIsRescheduleModalOpen(false)
      setSelectedAppointment(null)
      setEditForm({
        start_time: '',
        service_id: null,
        doctor_id: null,
        clinic_id: null,
        status: '',
        notes: ''
      })
    }
  })

  // Duplicate appointment mutation
  const duplicateAppointmentMutation = useMutationWithRefetch({
    mutationFn: (data) => appointmentsApi.createAppointment(data),
    queryKeys: [['appointments'], ['dashboard-stats']],
    onSuccessMessage: 'Appointment duplicated successfully',
    onErrorMessage: 'Failed to duplicate appointment',
    onSuccessCallback: () => {
      setIsDuplicateModalOpen(false)
      setSelectedAppointment(null)
    }
  })

  // Delete appointment mutation
  const cancelAppointmentMutation = useMutationWithRefetch({
    mutationFn: ({ id, reason }) => appointmentsApi.cancelAppointment(id, { reason }),
    queryKeys: [['appointments'], ['dashboard-stats']],
    onSuccessMessage: 'Appointment cancelled successfully',
    onErrorMessage: 'Failed to cancel appointment',
    onSuccessCallback: () => {
      setIsCancelModalOpen(false)
      setCancelReason('')
      setSelectedAppointment(null)
    }
  })

  const filteredAppointments = appointments.filter(appointment => {
    if (!searchQuery) return true
    const searchLower = searchQuery.toLowerCase()
    return (
      appointment.patient?.name?.toLowerCase().includes(searchLower) ||
      appointment.patient?.phone?.includes(searchQuery) ||
      appointment.doctor?.name?.toLowerCase().includes(searchLower) ||
      appointment.clinic?.name?.toLowerCase().includes(searchLower)
    )
  })

  const handleViewAppointment = (appointment) => {
    setSelectedAppointment(appointment)
    setIsViewModalOpen(true)
  }

  const handleEditAppointment = (appointment) => {
    setSelectedAppointment(appointment)
    setEditForm({
      start_time: appointment.start_time || '',
      service_id: appointment.service_id,
      doctor_id: appointment.doctor_id,
      clinic_id: appointment.clinic_id,
      status: appointment.status,
      notes: appointment.notes || ''
    })
    setIsEditModalOpen(true)
  }

  const handleRescheduleAppointment = (appointment) => {
    setSelectedAppointment(appointment)
    setEditForm({
      start_time: '',
      service_id: appointment.service_id,
      doctor_id: appointment.doctor_id,
      clinic_id: appointment.clinic_id,
      status: appointment.status,
      notes: appointment.notes || ''
    })
    setIsRescheduleModalOpen(true)
  }

  const handleDuplicateAppointment = (appointment) => {
    setSelectedAppointment(appointment)
    setIsDuplicateModalOpen(true)
  }

  const handleCancelAppointment = (appointment) => {
    setSelectedAppointment(appointment)
    setIsCancelModalOpen(true)
  }

  const handleSaveEdit = () => {
    if (!selectedAppointment) return
    
    const updateData = {
      status: editForm.status,
      notes: editForm.notes
    }
    
    // Add reschedule data if time changed
    if (editForm.start_time && editForm.start_time !== selectedAppointment.start_time) {
      updateData.start_time = editForm.start_time
    }
    
    // Add other fields if they changed
    if (editForm.service_id && editForm.service_id !== selectedAppointment.service_id) {
      updateData.service_id = editForm.service_id
    }
    
    if (editForm.doctor_id && editForm.doctor_id !== selectedAppointment.doctor_id) {
      updateData.doctor_id = editForm.doctor_id
    }

    updateAppointmentMutation.mutate({
      id: selectedAppointment.id,
      data: updateData
    })
  }

  const handleReschedule = () => {
    if (!selectedAppointment || !editForm.start_time) {
      alert('Please select a new time slot')
      return
    }

    updateAppointmentMutation.mutate({
      id: selectedAppointment.id,
      data: {
        start_time: editForm.start_time,
        notes: editForm.notes
      }
    })
  }

  const handleDuplicate = () => {
    if (!selectedAppointment) return
    
    const duplicateData = {
      clinic_id: selectedAppointment.clinic_id,
      doctor_id: selectedAppointment.doctor_id,
      patient_id: selectedAppointment.patient_id,
      service_id: selectedAppointment.service_id,
      booking_source: 'RECEPTION',
      notes: `Duplicated from appointment #${selectedAppointment.booking_id}`
    }
    
    // Schedule for next available slot - could be enhanced with better logic
    const nextSlot = availableSlots.find(slot => 
      new Date(slot.start_time) > new Date(selectedAppointment.start_time)
    )
    
    if (nextSlot) {
      duplicateData.start_time = nextSlot.start_time
    } else {
      // Just add 1 day to original time
      const originalDate = new Date(selectedAppointment.start_time)
      originalDate.setDate(originalDate.getDate() + 1)
      duplicateData.start_time = originalDate.toISOString()
    }

    duplicateAppointmentMutation.mutate(duplicateData)
  }

  const handleCancelConfirm = () => {
    if (!selectedAppointment) return
    cancelAppointmentMutation.mutate({
      id: selectedAppointment.id,
      reason: cancelReason
    })
  }

  const handleExport = () => {
    // Build export params
    const exportParams = { ...queryParams }
    delete exportParams.page
    delete exportParams.per_page
    
    // Fetch all appointments for export
    appointmentsApi.getAppointments({
      ...exportParams,
      per_page: 1000  // Export more records
    }).then(response => {
      const appointments = response?.appointments || []
      
      // Convert to CSV
      const headers = ['Booking ID', 'Date', 'Time', 'Patient', 'Phone', 'Doctor', 'Clinic', 'Service', 'Status', 'Notes']
      const csvRows = [headers.join(',')]
      
      appointments.forEach(apt => {
        const row = [
          apt.booking_id || '',
          formatDate(apt.start_time),
          formatTime(apt.start_time),
          apt.patient?.name || '',
          apt.patient?.phone || '',
          apt.doctor?.name || '',
          apt.clinic?.name || '',
          apt.service?.name || '',
          apt.status || '',
          `"${(apt.notes || '').replace(/"/g, '""')}"`
        ]
        csvRows.push(row.join(','))
      })
      
      const csv = csvRows.join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `appointments_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    }).catch(error => {
      console.error('Export error:', error)
      alert('Failed to export appointments')
    })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-blue-100 text-blue-800'
      case 'checked_in': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'no_show': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const resetFilters = () => {
    setSelectedDate(new Date())
    setStartDate('')
    setEndDate('')
    setClinicFilter('all')
    setDoctorFilter('all')
    setStatusFilter('all')
    setSearchQuery('')
    setCurrentPage(1)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-red-600 mb-2">Error Loading Appointments</h3>
          <p className="text-gray-600 mb-4">{error.message}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <PageContainer className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Appointments</h1>
          <p className="text-sm text-gray-600 mt-1">
            Showing {filteredAppointments.length} of {total} appointments
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExport}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          {!isDoctor && (
            <Button
              onClick={() => setIsBookingModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Appointment
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Date Filter */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Date Filter</label>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <select
                value={useDateRange ? 'range' : 'today'}
                onChange={(e) => {
                  const isRange = e.target.value === 'range'
                  setUseDateRange(isRange)
                  if (!isRange) {
                    setStartDate('')
                    setEndDate('')
                    setSelectedDate(new Date())
                  }
                }}
                className="border rounded px-3 py-1 text-sm flex-1"
              >
                <option value="today">Single Date</option>
                <option value="range">Date Range</option>
              </select>
            </div>
            {!useDateRange ? (
              <input
                type="date"
                value={selectedDate.toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="border rounded px-3 py-1 w-full text-sm"
              />
            ) : (
              <div className="flex gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border rounded px-3 py-1 flex-1 text-sm"
                  placeholder="Start"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border rounded px-3 py-1 flex-1 text-sm"
                  placeholder="End"
                />
              </div>
            )}
          </div>

          {/* Clinic Filter - Hidden for doctors */}
          {!isDoctor && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Clinic</label>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={clinicFilter}
                  onChange={(e) => {
                    setClinicFilter(e.target.value)
                    setDoctorFilter('all')
                    setCurrentPage(1)
                  }}
                  className="border rounded px-3 py-1 w-full text-sm"
                >
                  <option value="all">All Clinics</option>
                  {Array.isArray(clinics) && clinics.map(clinic => (
                    <option key={clinic.id} value={clinic.id}>{clinic.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Doctor Filter - Hidden for doctors */}
          {!isDoctor && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Doctor</label>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <select
                  value={doctorFilter}
                  onChange={(e) => {
                    setDoctorFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="border rounded px-3 py-1 w-full text-sm"
                >
                  <option value="all">All Doctors</option>
                  {Array.isArray(doctors) && doctors.map(doctor => (
                    <option key={doctor.id} value={doctor.id}>{doctor.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Status Filter */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="border rounded px-3 py-1 w-full text-sm"
              >
                <option value="all">All Status</option>
                <option value="confirmed">Confirmed</option>
                <option value="checked_in">Checked In</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No Show</option>
              </select>
            </div>
          </div>

          {/* Search */}
          <div className="space-y-2 md:col-span-2 lg:col-span-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by patient name, phone, doctor, or clinic..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border rounded px-3 py-1 flex-1 text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
              >
                Reset
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Appointments List */}
      <div className="grid gap-4">
        {filteredAppointments.length === 0 ? (
          <Card className="p-8 text-center">
            <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">No appointments found for the selected filters</p>
          </Card>
        ) : (
          filteredAppointments.map((appointment) => (
            <Card key={appointment.id} className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <h3 className="font-semibold text-lg">{appointment.patient?.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                      {appointment.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>Dr. {appointment.doctor?.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>{appointment.patient?.phone}</span>
                    </div>
                  </div>
                  
                  <div className="mt-2 text-sm text-gray-500">
                    <span className="font-medium">Service:</span> {appointment.service?.name} • 
                    <span className="font-medium ml-2">Clinic:</span> {appointment.clinic?.name}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewAppointment(appointment)}
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRescheduleAppointment(appointment)}
                    title="Reschedule"
                  >
                    <Calendar className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditAppointment(appointment)}
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDuplicateAppointment(appointment)}
                    title="Duplicate"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCancelAppointment(appointment)}
                    className="text-red-600 hover:text-red-700"
                    title="Cancel"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {((currentPage - 1) * perPage) + 1} to {Math.min(currentPage * perPage, total)} of {total} appointments
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* View Appointment Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Appointment Details"
      >
        {selectedAppointment && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Booking ID</label>
                <p className="text-lg font-semibold">#{selectedAppointment.booking_id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedAppointment.status)}`}>
                  {selectedAppointment.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Patient</label>
                <p className="text-lg">{selectedAppointment.patient?.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Phone</label>
                <p>{selectedAppointment.patient?.phone}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Doctor</label>
                <p>Dr. {selectedAppointment.doctor?.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Clinic</label>
                <p>{selectedAppointment.clinic?.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Service</label>
                <p>{selectedAppointment.service?.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Time</label>
                <p>{formatTime(selectedAppointment.start_time)} - {formatTime(selectedAppointment.end_time)}</p>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-500">Date</label>
                <p>{formatDate(selectedAppointment.start_time)}</p>
              </div>
            </div>
            
            {selectedAppointment.notes && (
              <div>
                <label className="text-sm font-medium text-gray-500">Notes</label>
                <p className="mt-1 p-3 bg-gray-50 rounded">{selectedAppointment.notes}</p>
              </div>
            )}
            
            {selectedAppointment.payment && (
              <div className="border-t pt-4">
                <h4 className="text-lg font-semibold mb-3">Payment Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Payment Status</label>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      selectedAppointment.payment.status === 'paid' ? 'bg-green-100 text-green-800' :
                      selectedAppointment.payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {selectedAppointment.payment.status.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Total Amount</label>
                    <p className="text-lg font-semibold">${selectedAppointment.payment.total_amount}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Amount Paid</label>
                    <p>${selectedAppointment.payment.amount_paid}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Payment Method</label>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      selectedAppointment.payment.payment_method === 'cash' ? 'bg-blue-100 text-blue-800' :
                      selectedAppointment.payment.payment_method === 'card' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedAppointment.payment.payment_method.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Edit Appointment Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Appointment"
      >
        {selectedAppointment && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="confirmed">Confirmed</option>
                <option value="checked_in">Checked In</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No Show</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                className="w-full border rounded px-3 py-2"
                rows="3"
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={updateAppointmentMutation.isPending}
              >
                {updateAppointmentMutation.isPending ? <Spinner size="sm" /> : 'Save Changes'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reschedule Modal */}
      <Modal
        isOpen={isRescheduleModalOpen}
        onClose={() => setIsRescheduleModalOpen(false)}
        title="Reschedule Appointment"
      >
        {selectedAppointment && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Select a new date and time for this appointment
            </p>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
              <input
                type="date"
                value={selectedDate.toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                min={new Date().toISOString().split('T')[0]}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Available Time Slots</label>
              {availableSlots.length === 0 ? (
                <p className="text-sm text-gray-500 py-4">No available slots for selected date</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                  {availableSlots.map((slot, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, start_time: slot.start_time })}
                      className={`p-2 border rounded text-sm ${
                        editForm.start_time === slot.start_time
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      {formatTime(slot.start_time)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                className="w-full border rounded px-3 py-2"
                rows="2"
                placeholder="Add a note about the reschedule reason..."
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsRescheduleModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReschedule}
                disabled={updateAppointmentMutation.isPending || !editForm.start_time}
              >
                {updateAppointmentMutation.isPending ? <Spinner size="sm" /> : 'Reschedule'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Duplicate Modal */}
      <Modal
        isOpen={isDuplicateModalOpen}
        onClose={() => setIsDuplicateModalOpen(false)}
        title="Duplicate Appointment"
      >
        {selectedAppointment && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <p className="text-sm text-blue-800">
                This will create a new appointment with the same patient, doctor, and service.
                Please review and confirm.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Patient</label>
                <p>{selectedAppointment.patient?.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Doctor</label>
                <p>Dr. {selectedAppointment.doctor?.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Service</label>
                <p>{selectedAppointment.service?.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Clinic</label>
                <p>{selectedAppointment.clinic?.name}</p>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsDuplicateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDuplicate}
                disabled={duplicateAppointmentMutation.isPending}
              >
                {duplicateAppointmentMutation.isPending ? <Spinner size="sm" /> : 'Duplicate Appointment'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Cancel Appointment"
      >
        {selectedAppointment && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded p-4">
              <p className="text-sm text-red-800 font-medium">
                Are you sure you want to cancel this appointment?
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Patient</label>
                <p>{selectedAppointment.patient?.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Date & Time</label>
                <p>{formatDate(selectedAppointment.start_time)} at {formatTime(selectedAppointment.start_time)}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cancellation Reason (Optional)
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full border rounded px-3 py-2"
                rows="3"
                placeholder="Enter reason for cancellation..."
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsCancelModalOpen(false)}
              >
                Keep Appointment
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelConfirm}
                disabled={cancelAppointmentMutation.isPending}
              >
                {cancelAppointmentMutation.isPending ? <Spinner size="sm" /> : 'Cancel Appointment'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Booking Wizard Modal */}
      <BookingWizard
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        onSuccess={(data) => {
          queryClient.invalidateQueries(['appointments'])
          setIsBookingModalOpen(false)
        }}
      />

      {/* Toast Notifications */}
      {(updateAppointmentMutation.toast.show || cancelAppointmentMutation.toast.show || duplicateAppointmentMutation.toast.show) && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 ${
          (updateAppointmentMutation.toast.show ? updateAppointmentMutation.toast.type : 
           cancelAppointmentMutation.toast.show ? cancelAppointmentMutation.toast.type :
           duplicateAppointmentMutation.toast.type) === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          <div className={`w-5 h-5 flex items-center justify-center rounded-full ${
            (updateAppointmentMutation.toast.show ? updateAppointmentMutation.toast.type : 
             cancelAppointmentMutation.toast.show ? cancelAppointmentMutation.toast.type :
             duplicateAppointmentMutation.toast.type) === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}>
            {(updateAppointmentMutation.toast.show ? updateAppointmentMutation.toast.type : 
              cancelAppointmentMutation.toast.show ? cancelAppointmentMutation.toast.type :
              duplicateAppointmentMutation.toast.type) === 'success' ? '✓' : '✕'}
          </div>
          <span className="font-medium">
            {updateAppointmentMutation.toast.show ? updateAppointmentMutation.toast.message : 
             cancelAppointmentMutation.toast.show ? cancelAppointmentMutation.toast.message :
             duplicateAppointmentMutation.toast.message}
          </span>
          <button 
            onClick={() => {
              if (updateAppointmentMutation.toast.show) updateAppointmentMutation.dismissToast()
              if (cancelAppointmentMutation.toast.show) cancelAppointmentMutation.dismissToast()
              if (duplicateAppointmentMutation.toast.show) duplicateAppointmentMutation.dismissToast()
            }}
            className="ml-2 text-white hover:text-gray-200"
          >
            ✕
          </button>
        </div>
      )}
    </PageContainer>
  )
}

export default AppointmentsPage

