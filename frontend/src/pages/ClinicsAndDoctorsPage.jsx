/**
 * Clinics and Doctors Page - Redesigned with UI Kit
 * 
 * Modern clinics and doctors management page using the unified design system.
 * Preserves all API calls, data flow, and functionality.
 */

import React, { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { clinicsApi, doctorsApi } from '../api'
import { Button, Badge } from '../ui-kit'
import { Card, CardContent, CardHeader, CardTitle } from '../ui-kit'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui-kit'
import { Input, Label } from '../ui-kit'
import { Skeleton } from '../ui-kit'
import ClinicFormModal from '../components/ClinicFormModal'
import DoctorFormModal from '../components/DoctorFormModal'
import ServiceFormModal from '../components/ServiceFormModal'
import ScheduleGrid from '../components/ScheduleGrid'
import PageContainer from '../components/layout/PageContainer'
import StatCard from '../components/dashboard/StatCard'
import { 
  Building2, Plus, Edit, Trash2, Stethoscope, 
  Search, Filter, Eye, TrendingUp, Activity, Settings, ChevronDown, ChevronUp
} from 'lucide-react'
import { useMutationWithRefetch } from '../hooks/useMutationWithRefetch'
import { useDoctorFilters } from '../hooks/useDoctorFilters'

const ClinicsAndDoctorsPage = () => {
  const { clinicId, isDoctor, addFilters } = useDoctorFilters()
  const queryClient = useQueryClient()
  const [showClinicModal, setShowClinicModal] = useState(false)
  const [showDoctorModal, setShowDoctorModal] = useState(false)
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [showDoctorViewModal, setShowDoctorViewModal] = useState(false)
  const [showDeleteClinicModal, setShowDeleteClinicModal] = useState(false)
  const [showDeleteDoctorModal, setShowDeleteDoctorModal] = useState(false)
  const [showDeleteServiceModal, setShowDeleteServiceModal] = useState(false)
  const [selectedClinic, setSelectedClinic] = useState(null)
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [selectedDoctorForView, setSelectedDoctorForView] = useState(null)
  const [selectedService, setSelectedService] = useState(null)
  const [selectedClinicForService, setSelectedClinicForService] = useState(null)
  const [expandedClinicId, setExpandedClinicId] = useState(null)

  // Filters
  const [clinicSearch, setClinicSearch] = useState('')
  const [clinicActiveFilter, setClinicActiveFilter] = useState('all')
  const [doctorSearch, setDoctorSearch] = useState('')
  const [doctorClinicFilter, setDoctorClinicFilter] = useState('all')
  const [doctorSpecialtyFilter, setDoctorSpecialtyFilter] = useState('all')

  // Auto-set clinic filter for doctors
  useEffect(() => {
    if (isDoctor && clinicId) {
      setDoctorClinicFilter(clinicId.toString())
    }
  }, [isDoctor, clinicId])

  // Build query params
  let clinicQueryParams = {}
  if (clinicSearch) clinicQueryParams.search = clinicSearch
  if (clinicActiveFilter !== 'all') clinicQueryParams.is_active = clinicActiveFilter
  clinicQueryParams = addFilters(clinicQueryParams)

  let doctorQueryParams = {}
  if (doctorSearch) doctorQueryParams.search = doctorSearch
  if (doctorClinicFilter !== 'all') doctorQueryParams.clinic_id = parseInt(doctorClinicFilter)
  if (doctorSpecialtyFilter !== 'all') doctorQueryParams.specialty = doctorSpecialtyFilter
  doctorQueryParams = addFilters(doctorQueryParams)

  // Fetch statistics
  const { data: clinicStats } = useQuery({
    queryKey: ['clinic-statistics'],
    queryFn: () => clinicsApi.getStatistics(addFilters()),
    refetchOnWindowFocus: false
  })

  const { data: doctorStats } = useQuery({
    queryKey: ['doctor-statistics'],
    queryFn: () => doctorsApi.getStatistics(addFilters()),
    refetchOnWindowFocus: false
  })

  // Fetch clinics
  const { data: clinicsResponse, isLoading: clinicsLoading } = useQuery({
    queryKey: ['clinics-all', clinicQueryParams],
    queryFn: async () => {
      const response = await clinicsApi.getClinics(clinicQueryParams)
      return response?.clinics || []
    }
  })
  const clinics = clinicsResponse || []

  // Fetch doctors
  const { data: doctorsResponse, isLoading: doctorsLoading } = useQuery({
    queryKey: ['doctors-all', doctorQueryParams],
    queryFn: async () => {
      const response = await doctorsApi.getDoctors(doctorQueryParams)
      return response?.doctors || []
    }
  })
  const doctors = doctorsResponse || []

  // Get unique specialties
  const specialties = React.useMemo(() => {
    const uniqueSpecialties = [...new Set(doctors.map(d => d.specialty).filter(Boolean))]
    return uniqueSpecialties.sort()
  }, [doctors])

  // Mutations
  const createClinicMutation = useMutationWithRefetch({
    mutationFn: (data) => clinicsApi.createClinic(data),
    queryKeys: [['clinics-all'], ['clinics'], ['clinics', 'booking-wizard'], ['clinic-statistics']],
    onSuccessMessage: 'تم إنشاء العيادة بنجاح',
    onErrorMessage: 'فشل إنشاء العيادة',
    onSuccessCallback: async (response) => {
      setShowClinicModal(false)
      setSelectedClinic(null)
      const newClinic = response?.clinic
      if (newClinic && window.confirm('تم إنشاء العيادة بنجاح! هل تريد إضافة خدمات لهذه العيادة الآن؟')) {
        setSelectedClinicForService(newClinic)
        setShowServiceModal(true)
      }
    }
  })

  const updateClinicMutation = useMutationWithRefetch({
    mutationFn: ({ id, data }) => clinicsApi.updateClinic(id, data),
    queryKeys: [['clinics-all'], ['clinics'], ['clinics', 'booking-wizard'], ['clinic-statistics']],
    onSuccessMessage: 'تم تحديث العيادة بنجاح',
    onErrorMessage: 'فشل تحديث العيادة',
    onSuccessCallback: () => {
      setShowClinicModal(false)
      setSelectedClinic(null)
    }
  })

  const deleteClinicMutation = useMutationWithRefetch({
    mutationFn: (id) => clinicsApi.deleteClinic(id),
    queryKeys: [['clinics-all'], ['clinics'], ['clinics', 'booking-wizard'], ['clinic-statistics']],
    onSuccessMessage: 'تم حذف العيادة بنجاح',
    onErrorMessage: 'فشل حذف العيادة',
    onSuccessCallback: () => {
      setShowDeleteClinicModal(false)
      setSelectedClinic(null)
    }
  })

  const fetchClinicServices = async (clinicId) => {
    try {
      const response = await clinicsApi.getClinicServices(clinicId)
      return response?.services || []
    } catch (error) {
      console.error('Error fetching services:', error)
      return []
    }
  }

  const createServiceMutation = useMutationWithRefetch({
    mutationFn: ({ clinicId, data }) => clinicsApi.createService(clinicId, data),
    queryKeys: [['clinics-all'], ['clinic-statistics']],
    onSuccessMessage: 'تم إنشاء الخدمة بنجاح',
    onErrorMessage: 'فشل إنشاء الخدمة',
    onSuccessCallback: () => {
      setShowServiceModal(false)
      setSelectedService(null)
      if (selectedClinicForService) {
        queryClient.invalidateQueries({ queryKey: ['services', selectedClinicForService.id] })
      }
      setSelectedClinicForService(null)
    }
  })

  const updateServiceMutation = useMutationWithRefetch({
    mutationFn: ({ clinicId, serviceId, data }) => clinicsApi.updateService(clinicId, serviceId, data),
    queryKeys: [['clinics-all'], ['clinic-statistics']],
    onSuccessMessage: 'تم تحديث الخدمة بنجاح',
    onErrorMessage: 'فشل تحديث الخدمة',
    onSuccessCallback: () => {
      setShowServiceModal(false)
      setSelectedService(null)
      if (selectedClinicForService) {
        queryClient.invalidateQueries({ queryKey: ['services', selectedClinicForService.id] })
      }
      setSelectedClinicForService(null)
    }
  })

  const deleteServiceMutation = useMutationWithRefetch({
    mutationFn: ({ clinicId, serviceId }) => clinicsApi.deleteService(clinicId, serviceId),
    queryKeys: [['clinics-all'], ['clinic-statistics']],
    onSuccessMessage: 'تم حذف الخدمة بنجاح',
    onErrorMessage: 'فشل حذف الخدمة',
    onSuccessCallback: () => {
      setShowDeleteServiceModal(false)
      setSelectedService(null)
      if (selectedClinicForService) {
        queryClient.invalidateQueries({ queryKey: ['services', selectedClinicForService.id] })
      }
      setSelectedClinicForService(null)
    }
  })

  const handleSaveService = (data) => {
    if (selectedClinicForService) {
      if (selectedService) {
        updateServiceMutation.mutate({ 
          clinicId: selectedClinicForService.id, 
          serviceId: selectedService.id, 
          data 
        })
      } else {
        createServiceMutation.mutate({ clinicId: selectedClinicForService.id, data })
      }
    }
  }

  const handleAddService = (clinic) => {
    setSelectedClinicForService(clinic)
    setSelectedService(null)
    setShowServiceModal(true)
  }

  const handleEditService = (clinic, service) => {
    setSelectedClinicForService(clinic)
    setSelectedService(service)
    setShowServiceModal(true)
  }

  const handleDeleteService = (clinic, service) => {
    setSelectedClinicForService(clinic)
    setSelectedService(service)
    setShowDeleteServiceModal(true)
  }

  const confirmDeleteService = () => {
    if (selectedClinicForService && selectedService) {
      deleteServiceMutation.mutate({ 
        clinicId: selectedClinicForService.id, 
        serviceId: selectedService.id 
      })
    }
  }

  const createDoctorMutation = useMutationWithRefetch({
    mutationFn: (data) => doctorsApi.createDoctor(data),
    queryKeys: [['doctors-all'], ['doctors'], ['doctor-statistics']],
    onSuccessMessage: 'تم إنشاء الطبيب بنجاح',
    onErrorMessage: 'فشل إنشاء الطبيب',
    onSuccessCallback: async (response, variables) => {
      setShowDoctorModal(false)
      setSelectedDoctor(null)
      const clinicId = variables.clinic_id
      const services = await fetchClinicServices(clinicId)
      if (services.length === 0) {
        const clinic = clinics.find(c => c.id === clinicId)
        if (clinic && window.confirm(`لم يتم العثور على خدمات لـ ${clinic.name}. هل تريد إضافة خدمات الآن؟`)) {
          setSelectedClinicForService(clinic)
          setShowServiceModal(true)
        }
      }
    }
  })

  const updateDoctorMutation = useMutationWithRefetch({
    mutationFn: ({ id, data }) => doctorsApi.updateDoctor(id, data),
    queryKeys: [['doctors-all'], ['doctors'], ['doctor-statistics']],
    onSuccessMessage: 'تم تحديث الطبيب بنجاح',
    onErrorMessage: 'فشل تحديث الطبيب',
    onSuccessCallback: () => {
      setShowDoctorModal(false)
      setSelectedDoctor(null)
    }
  })

  const deleteDoctorMutation = useMutationWithRefetch({
    mutationFn: (id) => doctorsApi.deleteDoctor(id),
    queryKeys: [['doctors-all'], ['doctors'], ['doctor-statistics']],
    onSuccessMessage: 'تم حذف الطبيب بنجاح',
    onErrorMessage: 'فشل حذف الطبيب',
    onSuccessCallback: () => {
      setShowDeleteDoctorModal(false)
      setSelectedDoctor(null)
    }
  })

  const handleSaveClinic = (data) => {
    if (selectedClinic) {
      updateClinicMutation.mutate({ id: selectedClinic.id, data })
    } else {
      createClinicMutation.mutate(data)
    }
  }

  const handleSaveDoctor = (data) => {
    if (selectedDoctor) {
      updateDoctorMutation.mutate({ id: selectedDoctor.id, data })
    } else {
      createDoctorMutation.mutate(data)
    }
  }

  const handleEditClinic = (clinic) => {
    setSelectedClinic(clinic)
    setShowClinicModal(true)
  }

  const handleEditDoctor = async (doctor) => {
    try {
      const response = await doctorsApi.getDoctor(doctor.id)
      setSelectedDoctor(response.doctor)
      setShowDoctorModal(true)
    } catch (error) {
      console.error('Failed to fetch doctor details:', error)
      setSelectedDoctor(doctor)
      setShowDoctorModal(true)
    }
  }

  const handleViewDoctor = async (doctor) => {
    try {
      const response = await doctorsApi.getDoctor(doctor.id)
      setSelectedDoctorForView(response.doctor)
      setShowDoctorViewModal(true)
    } catch (error) {
      console.error('Failed to fetch doctor details:', error)
      setSelectedDoctorForView(doctor)
      setShowDoctorViewModal(true)
    }
  }

  const handleDeleteClinic = (clinic) => {
    setSelectedClinic(clinic)
    setShowDeleteClinicModal(true)
  }

  const confirmDeleteClinic = () => {
    if (selectedClinic) {
      deleteClinicMutation.mutate(selectedClinic.id)
    }
  }

  const handleDeleteDoctor = (doctor) => {
    setSelectedDoctor(doctor)
    setShowDeleteDoctorModal(true)
  }

  const confirmDeleteDoctor = () => {
    if (selectedDoctor) {
      deleteDoctorMutation.mutate(selectedDoctor.id)
    }
  }

  const getClinicName = (clinicId) => {
    const clinic = clinics.find(c => c.id === clinicId)
    return clinic ? clinic.name : 'غير معروف'
  }

  const convertScheduleToGrid = (scheduleArray) => {
    if (!scheduleArray || !Array.isArray(scheduleArray)) return {}
    
    const grid = {}
    scheduleArray.forEach(item => {
      if (!grid[item.day_of_week]) {
        grid[item.day_of_week] = {}
      }
      grid[item.day_of_week][item.hour] = item.is_available
    })
    return grid
  }

  return (
    <PageContainer className="space-y-6" aria-label="صفحة العيادات والأطباء">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-medical-blue-500 to-medical-green-500 flex items-center justify-center shadow-md">
            <Building2 className="w-6 h-6 text-white" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 font-arabic">
              إدارة العيادات والأطباء
            </h1>
            <p className="text-sm text-gray-600 font-arabic">إدارة العيادات والأطباء والخدمات</p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي العيادات"
          value={clinicStats?.total_clinics || 0}
          subtitle={`${clinicStats?.active_clinics || 0} نشطة`}
          icon={Building2}
          iconColor="blue"
          loading={false}
        />
        <StatCard
          title="إجمالي الأطباء"
          value={doctorStats?.total_doctors || 0}
          subtitle="عبر جميع العيادات"
          icon={Stethoscope}
          iconColor="green"
          loading={false}
        />
        <StatCard
          title="إجمالي الخدمات"
          value={clinicStats?.total_services || 0}
          subtitle={`${clinicStats?.active_services || 0} نشطة`}
          icon={Activity}
          iconColor="purple"
          loading={false}
        />
        <StatCard
          title="عيادات نشطة"
          value={clinicStats?.active_clinics || 0}
          subtitle={`${clinicStats?.inactive_clinics || 0} غير نشطة`}
          icon={TrendingUp}
          iconColor="amber"
          loading={false}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clinics Section */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="font-arabic flex items-center gap-2">
                <Building2 className="w-5 h-5 text-medical-blue-500" aria-hidden="true" />
                العيادات ({clinics.length})
              </CardTitle>
              {!isDoctor && (
                <Button
                  onClick={() => {
                    setSelectedClinic(null)
                    setShowClinicModal(true)
                  }}
                  size="sm"
                  className="flex items-center gap-2"
                  aria-label="إضافة عيادة جديدة"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  <span className="hidden sm:inline">إضافة عيادة</span>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Clinic Filters */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden="true" />
                <Input
                  type="text"
                  placeholder="البحث بالاسم أو رقم الغرفة..."
                  value={clinicSearch}
                  onChange={(e) => setClinicSearch(e.target.value)}
                  className="pr-10 pl-4 font-arabic"
                  aria-label="بحث العيادات"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" aria-hidden="true" />
                <select
                  value={clinicActiveFilter}
                  onChange={(e) => setClinicActiveFilter(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium focus:border-medical-blue-500 focus:ring-2 focus:ring-medical-blue-100 bg-white text-gray-900 font-arabic"
                  aria-label="فلترة حسب الحالة"
                >
                  <option value="all">كل الحالات</option>
                  <option value="true">نشطة فقط</option>
                  <option value="false">غير نشطة فقط</option>
                </select>
              </div>
            </div>

            {/* Clinics List */}
            {clinicsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : clinics.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Building2 className="w-12 h-12 mx-auto text-gray-400 mb-4" aria-hidden="true" />
                  <p className="text-gray-600 font-medium font-arabic">لم يتم العثور على عيادات</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {clinics.map(clinic => (
                  <ClinicCard
                    key={clinic.id}
                    clinic={clinic}
                    onEdit={isDoctor ? undefined : () => handleEditClinic(clinic)}
                    onDelete={isDoctor ? undefined : () => handleDeleteClinic(clinic)}
                    onAddService={isDoctor ? undefined : () => handleAddService(clinic)}
                    onEditService={isDoctor ? undefined : (service) => handleEditService(clinic, service)}
                    onDeleteService={isDoctor ? undefined : (service) => handleDeleteService(clinic, service)}
                    isExpanded={expandedClinicId === clinic.id}
                    onToggleExpand={() => setExpandedClinicId(expandedClinicId === clinic.id ? null : clinic.id)}
                    queryClient={queryClient}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Doctors Section */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="font-arabic flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-medical-green-500" aria-hidden="true" />
                الأطباء ({doctors.length})
              </CardTitle>
              {!isDoctor && (
                <Button
                  onClick={() => {
                    setSelectedDoctor(null)
                    setShowDoctorModal(true)
                  }}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-2"
                  aria-label="إضافة طبيب جديد"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  <span className="hidden sm:inline">إضافة طبيب</span>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Doctor Filters */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden="true" />
                <Input
                  type="text"
                  placeholder="البحث بالاسم أو التخصص..."
                  value={doctorSearch}
                  onChange={(e) => setDoctorSearch(e.target.value)}
                  className="pr-10 pl-4 font-arabic"
                  aria-label="بحث الأطباء"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" aria-hidden="true" />
                  <select
                    value={doctorClinicFilter}
                    onChange={(e) => setDoctorClinicFilter(e.target.value)}
                    disabled={isDoctor}
                    className={`flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium focus:border-medical-green-500 focus:ring-2 focus:ring-medical-green-100 bg-white text-gray-900 font-arabic ${isDoctor ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
                    aria-label="فلترة حسب العيادة"
                  >
                    <option value="all">كل العيادات</option>
                    {clinics.map(clinic => (
                      <option key={clinic.id} value={clinic.id}>{clinic.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" aria-hidden="true" />
                  <select
                    value={doctorSpecialtyFilter}
                    onChange={(e) => setDoctorSpecialtyFilter(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium focus:border-medical-green-500 focus:ring-2 focus:ring-medical-green-100 bg-white text-gray-900 font-arabic"
                    aria-label="فلترة حسب التخصص"
                  >
                    <option value="all">كل التخصصات</option>
                    {specialties.map(specialty => (
                      <option key={specialty} value={specialty}>{specialty}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Doctors List */}
            {doctorsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : doctors.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Stethoscope className="w-12 h-12 mx-auto text-gray-400 mb-4" aria-hidden="true" />
                  <p className="text-gray-600 font-medium font-arabic">لم يتم العثور على أطباء</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {doctors.map(doctor => (
                  <Card
                    key={doctor.id}
                    className="hover:shadow-lg transition-all duration-300"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-bold text-base text-gray-900 mb-1 font-arabic">{doctor.name}</h3>
                          <p className="text-sm font-medium text-gray-600 mb-1 font-arabic">{doctor.specialty}</p>
                          <p className="text-xs font-medium text-gray-500 font-arabic">{getClinicName(doctor.clinic_id)}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDoctor(doctor)}
                            className="h-8 w-8 p-0"
                            aria-label={`عرض تفاصيل ${doctor.name}`}
                          >
                            <Eye className="w-4 h-4" aria-hidden="true" />
                          </Button>
                          {!isDoctor && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditDoctor(doctor)}
                                className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                aria-label={`تعديل ${doctor.name}`}
                              >
                                <Edit className="w-4 h-4" aria-hidden="true" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteDoctor(doctor)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                aria-label={`حذف ${doctor.name}`}
                              >
                                <Trash2 className="w-4 h-4" aria-hidden="true" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Form Modals */}
      <ClinicFormModal
        isOpen={showClinicModal}
        onClose={() => {
          setShowClinicModal(false)
          setSelectedClinic(null)
        }}
        onSave={handleSaveClinic}
        clinic={selectedClinic}
      />

      <DoctorFormModal
        isOpen={showDoctorModal}
        onClose={() => {
          setShowDoctorModal(false)
          setSelectedDoctor(null)
        }}
        onSave={handleSaveDoctor}
        doctor={selectedDoctor}
        clinics={clinics}
      />

      <ServiceFormModal
        isOpen={showServiceModal}
        onClose={() => {
          setShowServiceModal(false)
          setSelectedService(null)
          setSelectedClinicForService(null)
        }}
        onSave={handleSaveService}
        service={selectedService}
        clinicId={selectedClinicForService?.id}
      />

      {/* Delete Clinic Dialog */}
      <Dialog open={showDeleteClinicModal} onOpenChange={setShowDeleteClinicModal}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle className="font-arabic text-red-600">حذف العيادة</DialogTitle>
            <DialogDescription className="font-arabic">
              هل أنت متأكد من رغبتك في حذف هذه العيادة؟
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-gray-700 font-arabic">
              هل أنت متأكد من رغبتك في حذف <strong>{selectedClinic?.name}</strong>؟
            </p>
            <p className="text-sm text-gray-500 font-arabic">
              لا يمكن التراجع عن هذا الإجراء. لا يمكن حذف العيادة إذا كانت تحتوي على أطباء أو خدمات أو مواعيد موجودة.
            </p>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteClinicModal(false)
                setSelectedClinic(null)
              }}
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteClinic}
              disabled={deleteClinicMutation.isPending}
              loading={deleteClinicMutation.isPending}
            >
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Doctor Dialog */}
      <Dialog open={showDeleteDoctorModal} onOpenChange={setShowDeleteDoctorModal}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle className="font-arabic text-red-600">حذف الطبيب</DialogTitle>
            <DialogDescription className="font-arabic">
              هل أنت متأكد من رغبتك في حذف هذا الطبيب؟
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-gray-700 font-arabic">
              هل أنت متأكد من رغبتك في حذف <strong>{selectedDoctor?.name}</strong>؟
            </p>
            <p className="text-sm text-gray-500 font-arabic">
              لا يمكن التراجع عن هذا الإجراء. لا يمكن حذف الطبيب إذا كان لديه مواعيد أو زيارات موجودة.
            </p>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDoctorModal(false)
                setSelectedDoctor(null)
              }}
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteDoctor}
              disabled={deleteDoctorMutation.isPending}
              loading={deleteDoctorMutation.isPending}
            >
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Service Dialog */}
      <Dialog open={showDeleteServiceModal} onOpenChange={setShowDeleteServiceModal}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle className="font-arabic text-red-600">حذف الخدمة</DialogTitle>
            <DialogDescription className="font-arabic">
              هل أنت متأكد من رغبتك في حذف هذه الخدمة؟
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-gray-700 font-arabic">
              هل أنت متأكد من رغبتك في حذف <strong>{selectedService?.name}</strong>؟
            </p>
            <p className="text-sm text-gray-500 font-arabic">
              لا يمكن التراجع عن هذا الإجراء إذا كانت الخدمة تحتوي على مواعيد أو زيارات موجودة.
            </p>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteServiceModal(false)
                setSelectedService(null)
                setSelectedClinicForService(null)
              }}
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteService}
              disabled={deleteServiceMutation.isPending}
              loading={deleteServiceMutation.isPending}
            >
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Doctor Dialog */}
      <Dialog open={showDoctorViewModal} onOpenChange={setShowDoctorViewModal}>
        <DialogContent size="lg" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-arabic">تفاصيل الطبيب</DialogTitle>
            <DialogDescription className="font-arabic">
              معلومات شاملة عن الطبيب
            </DialogDescription>
          </DialogHeader>
          
          {selectedDoctorForView && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-500 font-arabic mb-1">الاسم</Label>
                  <p className="text-base font-semibold text-gray-900 font-arabic">{selectedDoctorForView.name}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500 font-arabic mb-1">التخصص</Label>
                  <p className="text-base font-semibold text-gray-900 font-arabic">{selectedDoctorForView.specialty}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500 font-arabic mb-1">العيادة</Label>
                  <p className="text-base font-semibold text-gray-900 font-arabic">{getClinicName(selectedDoctorForView.clinic_id)}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500 font-arabic mb-1">نسبة الحصة</Label>
                  <p className="text-base font-semibold text-gray-900 font-arabic">{(selectedDoctorForView.share_percentage * 100).toFixed(1)}%</p>
                </div>
              </div>

              {selectedDoctorForView.schedule && selectedDoctorForView.schedule.length > 0 && (
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-2 font-arabic">الجدول</Label>
                  <ScheduleGrid
                    scheduleData={convertScheduleToGrid(selectedDoctorForView.schedule)}
                    editable={false}
                  />
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDoctorViewModal(false)
                setSelectedDoctorForView(null)
              }}
            >
              إغلاق
            </Button>
            {!isDoctor && (
              <Button
                onClick={() => {
                  setSelectedDoctor(selectedDoctorForView)
                  setShowDoctorViewModal(false)
                  setShowDoctorModal(true)
                }}
              >
                تعديل
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}

// Clinic Card Component
const ClinicCard = ({ clinic, onEdit, onDelete, onAddService, onEditService, onDeleteService, isExpanded, onToggleExpand, queryClient }) => {
  const { useQuery } = require('@tanstack/react-query')
  const { clinicsApi } = require('../api')

  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['services', clinic.id],
    queryFn: async () => {
      const response = await clinicsApi.getClinicServices(clinic.id)
      return response?.services || []
    },
    enabled: isExpanded
  })

  return (
    <Card className="hover:shadow-lg transition-all duration-300">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-bold text-base text-gray-900 font-arabic">{clinic.name}</h3>
              <Badge variant={clinic.is_active ? 'success' : 'destructive'} className="font-arabic">
                {clinic.is_active ? 'نشطة' : 'غير نشطة'}
              </Badge>
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1 font-arabic">الغرفة {clinic.room_number}</p>
            <p className="text-xs font-medium text-gray-500 font-arabic">
              {services.length} خدمة
            </p>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleExpand}
              className="h-8 w-8 p-0"
              aria-label={isExpanded ? 'إخفاء الخدمات' : 'عرض الخدمات'}
              aria-expanded={isExpanded}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" aria-hidden="true" />
              ) : (
                <ChevronDown className="w-4 h-4" aria-hidden="true" />
              )}
            </Button>
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
                className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                aria-label={`تعديل ${clinic.name}`}
              >
                <Edit className="w-4 h-4" aria-hidden="true" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                aria-label={`حذف ${clinic.name}`}
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
        
        {isExpanded && (
          <div className="border-t pt-4 mt-4 space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold text-gray-900 font-arabic">الخدمات</h4>
              {onAddService && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onAddService}
                  className="text-xs flex items-center gap-1"
                  aria-label="إضافة خدمة جديدة"
                >
                  <Plus className="w-3 h-3" aria-hidden="true" />
                  إضافة خدمة
                </Button>
              )}
            </div>
            {servicesLoading ? (
              <div className="space-y-2">
                {[1, 2].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : services.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-gray-600 font-medium mb-3 font-arabic">لا توجد خدمات بعد</p>
                  {onAddService && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onAddService}
                      className="text-xs"
                    >
                      إضافة أول خدمة
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {services.map(service => (
                  <Card key={service.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-sm text-gray-900 font-arabic">{service.name}</span>
                            {!service.is_active && (
                              <Badge variant="destructive" className="text-xs font-arabic">غير نشطة</Badge>
                            )}
                          </div>
                          <span className="text-xs font-medium text-gray-600 font-arabic">
                            {service.price} دينار · {service.duration} دقيقة
                          </span>
                        </div>
                        <div className="flex gap-1">
                          {onEditService && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEditService(service)}
                              className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              aria-label={`تعديل ${service.name}`}
                            >
                              <Edit className="w-3 h-3" aria-hidden="true" />
                            </Button>
                          )}
                          {onDeleteService && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDeleteService(service)}
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              aria-label={`حذف ${service.name}`}
                            >
                              <Trash2 className="w-3 h-3" aria-hidden="true" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ClinicsAndDoctorsPage
