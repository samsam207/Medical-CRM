/**
 * Appointments Page - Redesigned with UI Kit
 * 
 * Modern appointments page using the unified design system.
 * Preserves all API calls, data flow, and functionality.
 */

import React, { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { 
  Calendar, Clock, User, Phone, Search, Filter, Plus, Eye, Edit, Trash2, Copy,
  Download, ChevronLeft, ChevronRight, X
} from 'lucide-react'
import { Button, Badge } from '../ui-kit'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui-kit'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui-kit'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui-kit'
import { Input, Label } from '../ui-kit'
import { Skeleton } from '../ui-kit'
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
  const perPage = 20
  
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
  
  if (useDateRange && startDate && endDate) {
    queryParams.start_date = startDate
    queryParams.end_date = endDate
  } else {
    queryParams.date = selectedDate.toISOString().split('T')[0]
  }
  
  if (clinicFilter !== 'all') queryParams.clinic_id = parseInt(clinicFilter)
  if (doctorFilter !== 'all') queryParams.doctor_id = parseInt(doctorFilter)
  if (statusFilter !== 'all') queryParams.status = statusFilter

  queryParams = addFilters(queryParams)

  // Fetch appointments
  const { data: appointmentsData, isLoading, error } = useQuery({
    queryKey: ['appointments', queryParams],
    queryFn: () => appointmentsApi.getAppointments(queryParams).then(res => ({
      appointments: res?.appointments || [],
      total: res?.total || 0,
      pages: res?.pages || 1,
      current_page: res?.current_page || 1
    })),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  })
  
  const appointments = appointmentsData?.appointments || []
  const totalPages = appointmentsData?.pages || 1
  const total = appointmentsData?.total || 0

  // Fetch clinics
  const { data: clinicsData } = useQuery({
    queryKey: ['clinics', 'appointments-page'],
    queryFn: async () => {
      try {
        const res = await clinicsApi.getClinics()
        if (res && res.clinics && Array.isArray(res.clinics)) {
          return res.clinics
        }
        if (Array.isArray(res)) {
          return res
        }
        console.warn('Unexpected clinics API response format:', res)
        return []
      } catch (error) {
        console.error('Error fetching clinics:', error)
        return []
      }
    },
    retry: 2,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  })
  
  const clinics = Array.isArray(clinicsData) ? clinicsData : []

  // Fetch doctors
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
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  })
  
  const doctors = Array.isArray(doctorsData) ? doctorsData : []

  // Fetch services
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

  // Mutations
  const updateAppointmentMutation = useMutationWithRefetch({
    mutationFn: ({ id, data }) => appointmentsApi.updateAppointment(id, data),
    queryKeys: [['appointments'], ['dashboard-stats'], ['queue-phases']],
    onSuccessMessage: 'تم تحديث الموعد بنجاح',
    onErrorMessage: 'فشل تحديث الموعد',
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

  const duplicateAppointmentMutation = useMutationWithRefetch({
    mutationFn: (data) => appointmentsApi.createAppointment(data),
    queryKeys: [['appointments'], ['dashboard-stats']],
    onSuccessMessage: 'تم نسخ الموعد بنجاح',
    onErrorMessage: 'فشل نسخ الموعد',
    onSuccessCallback: () => {
      setIsDuplicateModalOpen(false)
      setSelectedAppointment(null)
    }
  })

  const cancelAppointmentMutation = useMutationWithRefetch({
    mutationFn: ({ id, reason }) => appointmentsApi.cancelAppointment(id, { reason }),
    queryKeys: [['appointments'], ['dashboard-stats']],
    onSuccessMessage: 'تم إلغاء الموعد بنجاح',
    onErrorMessage: 'فشل إلغاء الموعد',
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
    
    if (editForm.start_time && editForm.start_time !== selectedAppointment.start_time) {
      updateData.start_time = editForm.start_time
    }
    
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
      alert('يرجى اختيار وقت جديد')
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
      notes: `نسخ من الموعد #${selectedAppointment.booking_id}`
    }
    
    const nextSlot = availableSlots.find(slot => 
      new Date(slot.start_time) > new Date(selectedAppointment.start_time)
    )
    
    if (nextSlot) {
      duplicateData.start_time = nextSlot.start_time
    } else {
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
    const exportParams = { ...queryParams }
    delete exportParams.page
    delete exportParams.per_page
    
    appointmentsApi.getAppointments({
      ...exportParams,
      per_page: 1000
    }).then(response => {
      const appointments = response?.appointments || []
      
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
      alert('فشل تصدير المواعيد')
    })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'checked_in': return 'bg-green-100 text-green-800 border-green-200'
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200'
      case 'no_show': return 'bg-orange-100 text-orange-800 border-orange-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusBadge = (status) => {
    const statusMap = {
      'confirmed': { label: 'مؤكد', variant: 'default' },
      'checked_in': { label: 'تم الحضور', variant: 'success' },
      'in_progress': { label: 'قيد التنفيذ', variant: 'outline' },
      'completed': { label: 'مكتمل', variant: 'secondary' },
      'cancelled': { label: 'ملغي', variant: 'destructive' },
      'no_show': { label: 'لم يحضر', variant: 'outline' }
    }
    const statusInfo = statusMap[status] || { label: status, variant: 'secondary' }
    return <Badge variant={statusInfo.variant} className="font-arabic">{statusInfo.label}</Badge>
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
      <PageContainer>
        <div className="flex justify-center items-center h-64">
          <div className="space-y-4 w-full max-w-md">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </PageContainer>
    )
  }

  if (error) {
    return (
      <PageContainer>
        <div className="flex justify-center items-center h-64">
          <Card>
            <CardContent className="p-8 text-center">
              <h3 className="text-lg font-semibold text-red-600 mb-2 font-arabic">خطأ في تحميل المواعيد</h3>
              <p className="text-gray-600 mb-4 font-arabic">{error.message}</p>
              <Button onClick={() => window.location.reload()}>إعادة المحاولة</Button>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer className="space-y-6" aria-label="صفحة المواعيد">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-200">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 font-arabic">
            المواعيد
          </h1>
          <p className="text-sm text-gray-600 font-arabic">
            عرض {filteredAppointments.length} من {total} موعد
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="flex items-center gap-2"
            aria-label="تصدير المواعيد"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">تصدير CSV</span>
          </Button>
          {!isDoctor && (
            <Button
              onClick={() => setIsBookingModalOpen(true)}
              className="flex items-center gap-2"
              aria-label="إضافة موعد جديد"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>موعد جديد</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Filter */}
            <div className="space-y-2">
              <Label htmlFor="date-filter-type" className="font-arabic">نوع التاريخ</Label>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" aria-hidden="true" />
                <select
                  id="date-filter-type"
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
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium focus:border-medical-blue-500 focus:ring-2 focus:ring-medical-blue-100 bg-white text-gray-900 font-arabic"
                  aria-label="نوع فلترة التاريخ"
                >
                  <option value="today">تاريخ واحد</option>
                  <option value="range">نطاق تاريخ</option>
                </select>
              </div>
              {!useDateRange ? (
                <Input
                  type="date"
                  value={selectedDate.toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(new Date(e.target.value))}
                  className="text-sm font-arabic"
                  aria-label="اختر التاريخ"
                />
              ) : (
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="flex-1 text-sm font-arabic"
                    placeholder="بداية"
                    aria-label="تاريخ البداية"
                  />
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="flex-1 text-sm font-arabic"
                    placeholder="نهاية"
                    aria-label="تاريخ النهاية"
                  />
                </div>
              )}
            </div>

            {/* Clinic Filter */}
            {!isDoctor && (
              <div className="space-y-2">
                <Label htmlFor="clinic-filter" className="font-arabic">العيادة</Label>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" aria-hidden="true" />
                  <select
                    id="clinic-filter"
                    value={clinicFilter}
                    onChange={(e) => {
                      setClinicFilter(e.target.value)
                      setDoctorFilter('all')
                      setCurrentPage(1)
                    }}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium focus:border-medical-blue-500 focus:ring-2 focus:ring-medical-blue-100 bg-white text-gray-900 font-arabic"
                    aria-label="فلترة حسب العيادة"
                  >
                    <option value="all">كل العيادات</option>
                    {Array.isArray(clinics) && clinics.map(clinic => (
                      <option key={clinic.id} value={clinic.id}>{clinic.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Doctor Filter */}
            {!isDoctor && (
              <div className="space-y-2">
                <Label htmlFor="doctor-filter" className="font-arabic">الطبيب</Label>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" aria-hidden="true" />
                  <select
                    id="doctor-filter"
                    value={doctorFilter}
                    onChange={(e) => {
                      setDoctorFilter(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium focus:border-medical-blue-500 focus:ring-2 focus:ring-medical-blue-100 bg-white text-gray-900 font-arabic"
                    aria-label="فلترة حسب الطبيب"
                  >
                    <option value="all">كل الأطباء</option>
                    {Array.isArray(doctors) && doctors.map(doctor => (
                      <option key={doctor.id} value={doctor.id}>{doctor.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Status Filter */}
            <div className="space-y-2">
              <Label htmlFor="status-filter" className="font-arabic">الحالة</Label>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" aria-hidden="true" />
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium focus:border-medical-blue-500 focus:ring-2 focus:ring-medical-blue-100 bg-white text-gray-900 font-arabic"
                  aria-label="فلترة حسب الحالة"
                >
                  <option value="all">كل الحالات</option>
                  <option value="confirmed">مؤكد</option>
                  <option value="checked_in">تم الحضور</option>
                  <option value="in_progress">قيد التنفيذ</option>
                  <option value="completed">مكتمل</option>
                  <option value="cancelled">ملغي</option>
                  <option value="no_show">لم يحضر</option>
                </select>
              </div>
            </div>

            {/* Search */}
            <div className="md:col-span-2 lg:col-span-4 space-y-2">
              <Label htmlFor="search-appointments" className="font-arabic">البحث</Label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden="true" />
                  <Input
                    id="search-appointments"
                    type="text"
                    placeholder="البحث بالاسم، الهاتف، الطبيب، أو العيادة..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10 pl-4 font-arabic"
                    aria-label="بحث المواعيد"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetFilters}
                  aria-label="إعادة تعيين الفلاتر"
                >
                  إعادة تعيين
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appointments Table */}
      {filteredAppointments.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" aria-hidden="true" />
            <p className="text-gray-600 font-medium font-arabic">لم يتم العثور على مواعيد للفلتر المحدد</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-arabic">التاريخ والوقت</TableHead>
                    <TableHead className="font-arabic">المريض</TableHead>
                    <TableHead className="font-arabic">الطبيب</TableHead>
                    <TableHead className="font-arabic">العيادة</TableHead>
                    <TableHead className="font-arabic">الحالة</TableHead>
                    <TableHead className="font-arabic text-center">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAppointments.map((appointment) => (
                    <TableRow key={appointment.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 font-arabic">
                            <Calendar className="w-4 h-4 text-gray-400" aria-hidden="true" />
                            <span className="font-medium">{formatDate(appointment.start_time)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 font-arabic">
                            <Clock className="w-3 h-3 text-gray-400" aria-hidden="true" />
                            <span>{formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium font-arabic">{appointment.patient?.name}</div>
                          <div className="flex items-center gap-1 text-sm text-gray-600 font-arabic">
                            <Phone className="w-3 h-3 text-gray-400" aria-hidden="true" />
                            <span>{appointment.patient?.phone}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-arabic">{appointment.doctor?.name}</TableCell>
                      <TableCell className="font-arabic">{appointment.clinic?.name}</TableCell>
                      <TableCell>{getStatusBadge(appointment.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewAppointment(appointment)}
                            className="h-8 w-8 p-0"
                            aria-label={`عرض تفاصيل ${appointment.patient?.name}`}
                          >
                            <Eye className="w-4 h-4" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRescheduleAppointment(appointment)}
                            className="h-8 w-8 p-0"
                            aria-label={`إعادة جدولة ${appointment.patient?.name}`}
                          >
                            <Calendar className="w-4 h-4" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditAppointment(appointment)}
                            className="h-8 w-8 p-0"
                            aria-label={`تعديل ${appointment.patient?.name}`}
                          >
                            <Edit className="w-4 h-4" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDuplicateAppointment(appointment)}
                            className="h-8 w-8 p-0"
                            aria-label={`نسخ ${appointment.patient?.name}`}
                          >
                            <Copy className="w-4 h-4" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelAppointment(appointment)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            aria-label={`إلغاء ${appointment.patient?.name}`}
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="text-sm text-gray-600 font-arabic">
            عرض {((currentPage - 1) * perPage) + 1} إلى {Math.min(currentPage * perPage, total)} من {total} موعد
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              aria-label="الصفحة السابقة"
            >
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">السابق</span>
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
                    aria-label={`الصفحة ${pageNum}`}
                    aria-current={currentPage === pageNum ? 'page' : undefined}
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
              aria-label="الصفحة التالية"
            >
              <span className="hidden sm:inline">التالي</span>
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}

      {/* View Appointment Dialog */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent size="lg" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-arabic">تفاصيل الموعد</DialogTitle>
            <DialogDescription className="font-arabic">
              معلومات شاملة عن الموعد
            </DialogDescription>
          </DialogHeader>
          
          {selectedAppointment && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-500 font-arabic mb-1">رقم الموعد</Label>
                  <p className="text-base font-semibold font-arabic">#{selectedAppointment.booking_id}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500 font-arabic mb-1">الحالة</Label>
                  {getStatusBadge(selectedAppointment.status)}
                </div>
                <div>
                  <Label className="text-sm text-gray-500 font-arabic mb-1">المريض</Label>
                  <p className="text-base font-arabic">{selectedAppointment.patient?.name}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500 font-arabic mb-1">رقم الهاتف</Label>
                  <p className="text-base font-arabic">{selectedAppointment.patient?.phone}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500 font-arabic mb-1">الطبيب</Label>
                  <p className="text-base font-arabic">د. {selectedAppointment.doctor?.name}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500 font-arabic mb-1">العيادة</Label>
                  <p className="text-base font-arabic">{selectedAppointment.clinic?.name}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500 font-arabic mb-1">الخدمة</Label>
                  <p className="text-base font-arabic">{selectedAppointment.service?.name}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500 font-arabic mb-1">الوقت</Label>
                  <p className="text-base font-arabic">{formatTime(selectedAppointment.start_time)} - {formatTime(selectedAppointment.end_time)}</p>
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-sm text-gray-500 font-arabic mb-1">التاريخ</Label>
                  <p className="text-base font-arabic">{formatDate(selectedAppointment.start_time)}</p>
                </div>
              </div>
              
              {selectedAppointment.notes && (
                <div>
                  <Label className="text-sm text-gray-500 font-arabic mb-1">ملاحظات</Label>
                  <p className="mt-1 p-3 bg-gray-50 rounded-lg text-sm font-arabic">{selectedAppointment.notes}</p>
                </div>
              )}
              
              {selectedAppointment.payment && (
                <div className="border-t pt-4">
                  <h4 className="text-lg font-semibold mb-3 font-arabic">معلومات الدفع</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-gray-500 font-arabic mb-1">حالة الدفع</Label>
                      <Badge variant={selectedAppointment.payment.status === 'paid' ? 'success' : selectedAppointment.payment.status === 'pending' ? 'outline' : 'destructive'} className="font-arabic">
                        {selectedAppointment.payment.status === 'paid' ? 'مدفوع' : selectedAppointment.payment.status === 'pending' ? 'معلق' : 'غير مدفوع'}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-500 font-arabic mb-1">المبلغ الإجمالي</Label>
                      <p className="text-base font-semibold font-arabic">{selectedAppointment.payment.total_amount} دينار</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-500 font-arabic mb-1">المبلغ المدفوع</Label>
                      <p className="text-base font-arabic">{selectedAppointment.payment.amount_paid} دينار</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-500 font-arabic mb-1">طريقة الدفع</Label>
                      <Badge variant="outline" className="font-arabic">
                        {selectedAppointment.payment.payment_method === 'cash' ? 'نقدي' : selectedAppointment.payment.payment_method === 'card' ? 'بطاقة' : 'أخرى'}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
              إغلاق
            </Button>
            <Button onClick={() => {
              setIsViewModalOpen(false)
              handleEditAppointment(selectedAppointment)
            }}>
              تعديل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Appointment Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle className="font-arabic">تعديل الموعد</DialogTitle>
            <DialogDescription className="font-arabic">
              قم بتعديل معلومات الموعد
            </DialogDescription>
          </DialogHeader>
          
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-status" className="font-arabic">الحالة *</Label>
                <select
                  id="edit-status"
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full h-12 border-2 border-gray-200 rounded-lg px-4 py-2 text-sm font-medium focus:border-medical-blue-500 focus:ring-2 focus:ring-medical-blue-100 bg-white text-gray-900 font-arabic"
                >
                  <option value="confirmed">مؤكد</option>
                  <option value="checked_in">تم الحضور</option>
                  <option value="in_progress">قيد التنفيذ</option>
                  <option value="completed">مكتمل</option>
                  <option value="cancelled">ملغي</option>
                  <option value="no_show">لم يحضر</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-notes" className="font-arabic">ملاحظات</Label>
                <textarea
                  id="edit-notes"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 text-sm font-medium focus:border-medical-blue-500 focus:ring-2 focus:ring-medical-blue-100 bg-white text-gray-900 font-arabic min-h-[100px]"
                  rows="3"
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateAppointmentMutation.isPending}
              loading={updateAppointmentMutation.isPending}
            >
              حفظ التغييرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={isRescheduleModalOpen} onOpenChange={setIsRescheduleModalOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle className="font-arabic">إعادة جدولة الموعد</DialogTitle>
            <DialogDescription className="font-arabic">
              اختر تاريخ ووقت جديد للموعد
            </DialogDescription>
          </DialogHeader>
          
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reschedule-date" className="font-arabic">اختر التاريخ</Label>
                <Input
                  id="reschedule-date"
                  type="date"
                  value={selectedDate.toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(new Date(e.target.value))}
                  min={new Date().toISOString().split('T')[0]}
                  className="font-arabic"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-arabic">الأوقات المتاحة</Label>
                {availableSlots.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 font-arabic">لا توجد أوقات متاحة للتاريخ المحدد</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 border border-gray-200 rounded-lg">
                    {availableSlots.map((slot, idx) => (
                      <Button
                        key={idx}
                        type="button"
                        variant={editForm.start_time === slot.start_time ? "default" : "outline"}
                        size="sm"
                        onClick={() => setEditForm({ ...editForm, start_time: slot.start_time })}
                        className="font-arabic"
                      >
                        {formatTime(slot.start_time)}
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reschedule-notes" className="font-arabic">ملاحظات</Label>
                <textarea
                  id="reschedule-notes"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 text-sm font-medium focus:border-medical-blue-500 focus:ring-2 focus:ring-medical-blue-100 bg-white text-gray-900 font-arabic min-h-[80px]"
                  rows="2"
                  placeholder="أضف ملاحظة حول سبب إعادة الجدولة..."
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRescheduleModalOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleReschedule}
              disabled={updateAppointmentMutation.isPending || !editForm.start_time}
              loading={updateAppointmentMutation.isPending}
            >
              إعادة الجدولة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Dialog */}
      <Dialog open={isDuplicateModalOpen} onOpenChange={setIsDuplicateModalOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle className="font-arabic">نسخ الموعد</DialogTitle>
            <DialogDescription className="font-arabic">
              سيتم إنشاء موعد جديد بنفس بيانات هذا الموعد
            </DialogDescription>
          </DialogHeader>
          
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 font-arabic">
                  سيتم إنشاء موعد جديد بنفس المريض والطبيب والخدمة. يرجى المراجعة والتأكيد.
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-500 font-arabic mb-1">المريض</Label>
                  <p className="text-base font-arabic">{selectedAppointment.patient?.name}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500 font-arabic mb-1">الطبيب</Label>
                  <p className="text-base font-arabic">د. {selectedAppointment.doctor?.name}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500 font-arabic mb-1">الخدمة</Label>
                  <p className="text-base font-arabic">{selectedAppointment.service?.name}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500 font-arabic mb-1">العيادة</Label>
                  <p className="text-base font-arabic">{selectedAppointment.clinic?.name}</p>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDuplicateModalOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleDuplicate}
              disabled={duplicateAppointmentMutation.isPending}
              loading={duplicateAppointmentMutation.isPending}
            >
              نسخ الموعد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle className="font-arabic text-red-600">إلغاء الموعد</DialogTitle>
            <DialogDescription className="font-arabic">
              هل أنت متأكد من رغبتك في إلغاء هذا الموعد؟
            </DialogDescription>
          </DialogHeader>
          
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800 font-medium font-arabic">
                  هل أنت متأكد من رغبتك في إلغاء هذا الموعد؟
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-500 font-arabic mb-1">المريض</Label>
                  <p className="text-base font-arabic">{selectedAppointment.patient?.name}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500 font-arabic mb-1">التاريخ والوقت</Label>
                  <p className="text-base font-arabic">{formatDate(selectedAppointment.start_time)} في {formatTime(selectedAppointment.start_time)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cancel-reason" className="font-arabic">سبب الإلغاء (اختياري)</Label>
                <textarea
                  id="cancel-reason"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 text-sm font-medium focus:border-medical-blue-500 focus:ring-2 focus:ring-medical-blue-100 bg-white text-gray-900 font-arabic min-h-[80px]"
                  rows="3"
                  placeholder="أدخل سبب الإلغاء..."
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCancelModalOpen(false)}
            >
              الاحتفاظ بالموعد
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelConfirm}
              disabled={cancelAppointmentMutation.isPending}
              loading={cancelAppointmentMutation.isPending}
            >
              إلغاء الموعد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Booking Wizard */}
      <BookingWizard
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        onSuccess={(data) => {
          queryClient.invalidateQueries(['appointments'])
          setIsBookingModalOpen(false)
        }}
      />
    </PageContainer>
  )
}

export default AppointmentsPage
