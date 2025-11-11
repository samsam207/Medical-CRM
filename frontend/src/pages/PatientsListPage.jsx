/**
 * Patients List Page - Redesigned with UI Kit
 * 
 * Modern patients page using the unified design system.
 * Preserves all API calls, data flow, and functionality.
 */

import React, { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { 
  User, Phone, Calendar, Search, Plus, Eye, Edit, Trash2, Filter, 
  Download, FileSpreadsheet, TrendingUp, Users, Activity, ChevronLeft, 
  ChevronRight, X, Clock, Stethoscope, MapPin
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
import { patientsApi, clinicsApi, doctorsApi } from '../api'
import { formatDate } from '../utils/formatters'
import { useMutationWithRefetch } from '../hooks/useMutationWithRefetch'
import { useDoctorFilters } from '../hooks/useDoctorFilters'
import { useDebounce } from '../hooks/useDebounce'
import PageContainer from '../components/layout/PageContainer'
import StatCard from '../components/dashboard/StatCard'

const PatientsListPage = () => {
  const { addFilters } = useDoctorFilters()
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 400)
  const [genderFilter, setGenderFilter] = useState('all')
  const [clinicFilter, setClinicFilter] = useState('all')
  const [doctorFilter, setDoctorFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [patientDetails, setPatientDetails] = useState(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [patientToDelete, setPatientToDelete] = useState(null)
  const [newPatientData, setNewPatientData] = useState({
    name: '',
    phone: '',
    address: '',
    age: '',
    gender: 'male',
    medical_history: '',
    clinic_id: '',
    doctor_id: ''
  })

  const queryClient = useQueryClient()

  // Fetch patients with pagination and filters
  const { data: patientsData, isLoading, error, refetch } = useQuery({
    queryKey: ['patients', debouncedSearchQuery, genderFilter, clinicFilter, doctorFilter, currentPage, perPage],
    queryFn: () => patientsApi.getPatients(addFilters({
      name: debouncedSearchQuery || undefined,
      phone: debouncedSearchQuery || undefined,
      gender: genderFilter !== 'all' ? genderFilter : undefined,
      clinic_id: clinicFilter !== 'all' ? parseInt(clinicFilter) : undefined,
      doctor_id: doctorFilter !== 'all' ? parseInt(doctorFilter) : undefined,
      page: currentPage,
      per_page: perPage
    })),
    refetchOnWindowFocus: false,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000
  })

  const patients = patientsData?.patients || []
  const total = patientsData?.total || 0
  const pages = patientsData?.pages || 1
  const currentPageNum = patientsData?.current_page || 1

  // Fetch statistics
  const { data: statistics } = useQuery({
    queryKey: ['patient-statistics'],
    queryFn: () => patientsApi.getStatistics(addFilters()),
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  })

  // Fetch clinics for patient assignment and filtering
  const { data: clinicsData } = useQuery({
    queryKey: ['clinics', 'patients-page'],
    queryFn: async () => {
      const res = await clinicsApi.getClinics({ is_active: 'true' })
      return res?.clinics || []
    },
    staleTime: 5 * 60 * 1000
  })
  const clinics = Array.isArray(clinicsData) ? clinicsData : []

  // Fetch doctors for filter dropdown (filtered by selected clinic filter)
  const { data: filterDoctorsData } = useQuery({
    queryKey: ['doctors', 'patients-filter', clinicFilter],
    queryFn: async () => {
      if (clinicFilter === 'all') {
        // If no clinic selected, fetch all active doctors
        const res = await doctorsApi.getDoctors({ is_active: 'true' })
        return res?.doctors || []
      }
      const res = await doctorsApi.getDoctors({ 
        clinic_id: parseInt(clinicFilter),
        is_active: 'true' 
      })
      return res?.doctors || []
    },
    enabled: true, // Always enabled for filter dropdown
    staleTime: 5 * 60 * 1000
  })
  const filterDoctors = Array.isArray(filterDoctorsData) ? filterDoctorsData : []

  // Reset doctor filter when clinic filter changes
  useEffect(() => {
    if (clinicFilter === 'all') {
      setDoctorFilter('all')
    } else if (doctorFilter !== 'all' && filterDoctors.length > 0) {
      // Check if selected doctor belongs to selected clinic
      const doctor = filterDoctors.find(d => d.id === parseInt(doctorFilter))
      if (!doctor || doctor.clinic_id !== parseInt(clinicFilter)) {
        setDoctorFilter('all')
      }
    }
  }, [clinicFilter, doctorFilter, filterDoctors])

  // Fetch doctors for patient assignment (filtered by selected clinic in create form)
  const { data: doctorsData } = useQuery({
    queryKey: ['doctors', 'patients-page', newPatientData.clinic_id],
    queryFn: async () => {
      if (!newPatientData.clinic_id) return []
      const res = await doctorsApi.getDoctors({ 
        clinic_id: parseInt(newPatientData.clinic_id),
        is_active: 'true' 
      })
      return res?.doctors || []
    },
    enabled: !!newPatientData.clinic_id,
    staleTime: 5 * 60 * 1000
  })
  const doctors = Array.isArray(doctorsData) ? doctorsData : []

  // Fetch doctors for edit form (filtered by selected clinic in edit form)
  // Use selectedPatient?.clinic_id directly in query key for reactivity
  const { data: editDoctorsData } = useQuery({
    queryKey: ['doctors', 'patients-page-edit', selectedPatient?.clinic_id],
    queryFn: async () => {
      const clinicId = selectedPatient?.clinic_id
      if (!clinicId) return []
      const res = await doctorsApi.getDoctors({ 
        clinic_id: typeof clinicId === 'number' ? clinicId : parseInt(clinicId),
        is_active: 'true' 
      })
      return res?.doctors || []
    },
    enabled: !!selectedPatient?.clinic_id && isEditModalOpen,
    staleTime: 5 * 60 * 1000
  })
  const editDoctors = Array.isArray(editDoctorsData) ? editDoctorsData : []

  // Reset doctor_id when clinic changes in create form
  useEffect(() => {
    if (newPatientData.clinic_id && newPatientData.doctor_id) {
      // Check if selected doctor belongs to selected clinic
      const doctor = doctors.find(d => d.id === parseInt(newPatientData.doctor_id))
      if (!doctor || doctor.clinic_id !== parseInt(newPatientData.clinic_id)) {
        setNewPatientData(prev => ({ ...prev, doctor_id: '' }))
      }
    }
  }, [newPatientData.clinic_id, doctors])

  // Reset doctor_id when clinic changes in edit form
  useEffect(() => {
    if (selectedPatient?.clinic_id && selectedPatient?.doctor_id && editDoctors.length > 0) {
      // Check if selected doctor belongs to selected clinic
      const doctorId = typeof selectedPatient.doctor_id === 'number' 
        ? selectedPatient.doctor_id 
        : parseInt(selectedPatient.doctor_id)
      const clinicId = typeof selectedPatient.clinic_id === 'number' 
        ? selectedPatient.clinic_id 
        : parseInt(selectedPatient.clinic_id)
      const doctor = editDoctors.find(d => d.id === doctorId)
      if (!doctor || doctor.clinic_id !== clinicId) {
        setSelectedPatient(prev => ({ ...prev, doctor_id: null }))
      }
    }
  }, [selectedPatient?.clinic_id, selectedPatient?.doctor_id, editDoctors])

  // Fetch patient details
  const { data: patientDetailsData, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['patient-details', selectedPatient?.id],
    queryFn: () => patientsApi.getPatient(selectedPatient.id),
    enabled: !!selectedPatient?.id && isViewModalOpen,
    refetchOnWindowFocus: false
  })

  useEffect(() => {
    if (patientDetailsData?.patient) {
      setPatientDetails(patientDetailsData.patient)
    }
  }, [patientDetailsData])

  // Mutations
  const createPatientMutation = useMutationWithRefetch({
    mutationFn: (data) => patientsApi.createPatient(data),
    queryKeys: [['patients'], ['patient-statistics']],
    onSuccessMessage: 'تم إنشاء المريض بنجاح',
    onErrorMessage: 'فشل إنشاء المريض',
    onSuccessCallback: () => {
      setIsCreateModalOpen(false)
      setNewPatientData({
        name: '',
        phone: '',
        address: '',
        age: '',
        gender: 'male',
        medical_history: '',
        clinic_id: '',
        doctor_id: ''
      })
    }
  })

  const updatePatientMutation = useMutationWithRefetch({
    mutationFn: ({ id, data }) => patientsApi.updatePatient(id, data),
    queryKeys: [['patients'], ['patient-statistics']],
    onSuccessMessage: 'تم تحديث المريض بنجاح',
    onErrorMessage: 'فشل تحديث المريض',
    onSuccessCallback: () => {
      setIsEditModalOpen(false)
      setSelectedPatient(null)
    }
  })

  const deletePatientMutation = useMutationWithRefetch({
    mutationFn: (id) => patientsApi.deletePatient(id),
    queryKeys: [['patients'], ['patient-statistics']],
    onSuccessMessage: 'تم حذف المريض بنجاح',
    onErrorMessage: 'فشل حذف المريض. قد يكون للمريض مواعيد أو زيارات موجودة.',
    onSuccessCallback: () => {
      setIsDeleteModalOpen(false)
      setPatientToDelete(null)
    }
  })

  // Export patients
  const handleExport = async () => {
    try {
      const blob = await patientsApi.exportPatients({
        gender: genderFilter !== 'all' ? genderFilter : undefined,
        name: searchQuery || undefined,
        phone: searchQuery || undefined,
        clinic_id: clinicFilter !== 'all' ? parseInt(clinicFilter) : undefined,
        doctor_id: doctorFilter !== 'all' ? parseInt(doctorFilter) : undefined
      })
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `patients_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error exporting patients:', error)
    }
  }

  const handleViewPatient = (patient) => {
    setSelectedPatient(patient)
    setIsViewModalOpen(true)
  }

  const handleEditPatient = (patient) => {
    setSelectedPatient(patient)
    setIsEditModalOpen(true)
  }

  const handleDeletePatient = (patient) => {
    setPatientToDelete(patient)
    setIsDeleteModalOpen(true)
  }

  const confirmDelete = () => {
    if (patientToDelete) {
      deletePatientMutation.mutate(patientToDelete.id)
    }
  }

  const handleCreatePatient = () => {
    const patientData = {
      ...newPatientData,
      clinic_id: newPatientData.clinic_id ? parseInt(newPatientData.clinic_id) : null,
      doctor_id: newPatientData.doctor_id ? parseInt(newPatientData.doctor_id) : null
    }
    // Remove empty strings
    if (!patientData.clinic_id) delete patientData.clinic_id
    if (!patientData.doctor_id) delete patientData.doctor_id
    createPatientMutation.mutate(patientData)
  }

  const handleUpdatePatient = () => {
    const updateData = {
      name: selectedPatient.name,
      phone: selectedPatient.phone,
      age: selectedPatient.age,
      gender: selectedPatient.gender,
      address: selectedPatient.address,
      medical_history: selectedPatient.medical_history
    }
    
    // Handle clinic_id and doctor_id - ensure they're numbers or null
    if (selectedPatient.clinic_id) {
      updateData.clinic_id = typeof selectedPatient.clinic_id === 'number' 
        ? selectedPatient.clinic_id 
        : parseInt(selectedPatient.clinic_id)
    } else {
      updateData.clinic_id = null
    }
    
    if (selectedPatient.doctor_id) {
      updateData.doctor_id = typeof selectedPatient.doctor_id === 'number' 
        ? selectedPatient.doctor_id 
        : parseInt(selectedPatient.doctor_id)
    } else {
      updateData.doctor_id = null
    }
    
    updatePatientMutation.mutate({
      id: selectedPatient.id,
      data: updateData
    })
  }

  const getGenderColor = (gender) => {
    switch (gender) {
      case 'male': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'female': return 'bg-pink-100 text-pink-800 border-pink-200'
      case 'other': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
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
              <h3 className="text-lg font-semibold text-red-600 mb-2 font-arabic">خطأ في تحميل المرضى</h3>
              <p className="text-gray-600 mb-4 font-arabic">{error.message}</p>
              <Button onClick={() => window.location.reload()}>إعادة المحاولة</Button>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer className="space-y-6" aria-label="صفحة المرضى">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-200">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 font-arabic">
            المرضى
          </h1>
          <p className="text-sm text-gray-600 font-arabic">إدارة قاعدة بيانات المرضى</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="flex items-center gap-2"
            aria-label="تصدير المرضى"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">تصدير CSV</span>
          </Button>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2"
            aria-label="إضافة مريض جديد"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>مريض جديد</span>
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="إجمالي المرضى"
            value={statistics.total || 0}
            subtitle="جميع المرضى المسجلين"
            icon={Users}
            iconColor="blue"
            loading={false}
          />
          <StatCard
            title="ذكور"
            value={statistics.by_gender?.male || 0}
            subtitle="مرضى ذكور"
            icon={User}
            iconColor="blue"
            loading={false}
          />
          <StatCard
            title="إناث"
            value={statistics.by_gender?.female || 0}
            subtitle="مرضى إناث"
            icon={User}
            iconColor="red"
            loading={false}
          />
          <StatCard
            title="جدد (30 يوم)"
            value={statistics.recent || 0}
            subtitle="سجلات حديثة"
            icon={TrendingUp}
            iconColor="green"
            loading={false}
          />
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-3 flex-1 min-w-[250px]">
              <div className="relative w-full">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden="true" />
                <Input
                  type="text"
                  placeholder="البحث بالاسم أو رقم الهاتف..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="pr-10 pl-4"
                  aria-label="بحث المرضى"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" aria-hidden="true" />
              <Label htmlFor="gender-filter" className="sr-only">تصفية حسب الجنس</Label>
              <select
                id="gender-filter"
                value={genderFilter}
                onChange={(e) => {
                  setGenderFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium focus:border-medical-blue-500 focus:ring-2 focus:ring-medical-blue-100 bg-white text-gray-900 font-arabic"
                aria-label="تصفية حسب الجنس"
              >
                <option value="all">كل الجنسين</option>
                <option value="male">ذكر</option>
                <option value="female">أنثى</option>
                <option value="other">آخر</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="clinic-filter" className="sr-only">تصفية حسب العيادة</Label>
              <select
                id="clinic-filter"
                value={clinicFilter}
                onChange={(e) => {
                  setClinicFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium focus:border-medical-blue-500 focus:ring-2 focus:ring-medical-blue-100 bg-white text-gray-900 font-arabic"
                aria-label="تصفية حسب العيادة"
              >
                <option value="all">كل العيادات</option>
                {clinics.map(clinic => (
                  <option key={clinic.id} value={clinic.id}>
                    {clinic.name} - {clinic.room_number}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="doctor-filter" className="sr-only">تصفية حسب الطبيب</Label>
              <select
                id="doctor-filter"
                value={doctorFilter}
                onChange={(e) => {
                  setDoctorFilter(e.target.value)
                  setCurrentPage(1)
                }}
                disabled={clinicFilter === 'all' && filterDoctors.length === 0}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium focus:border-medical-blue-500 focus:ring-2 focus:ring-medical-blue-100 bg-white text-gray-900 font-arabic disabled:bg-gray-100 disabled:cursor-not-allowed"
                aria-label="تصفية حسب الطبيب"
              >
                <option value="all">كل الأطباء</option>
                {filterDoctors.map(doctor => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.name} - {doctor.specialty}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="per-page" className="text-sm text-gray-700 font-arabic">لكل صفحة:</Label>
              <select
                id="per-page"
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium focus:border-medical-blue-500 focus:ring-2 focus:ring-medical-blue-100 bg-white text-gray-900"
                aria-label="عدد العناصر لكل صفحة"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Patients Table */}
      {patients.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <User className="w-12 h-12 mx-auto text-gray-400 mb-4" aria-hidden="true" />
            <p className="text-gray-600 font-medium font-arabic">لم يتم العثور على مرضى</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-arabic">الاسم</TableHead>
                    <TableHead className="font-arabic">رقم الهاتف</TableHead>
                    <TableHead className="font-arabic">العمر</TableHead>
                    <TableHead className="font-arabic">الجنس</TableHead>
                    <TableHead className="font-arabic">العنوان</TableHead>
                    <TableHead className="font-arabic text-center">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patients.map((patient) => (
                    <TableRow key={patient.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium font-arabic">{patient.name}</TableCell>
                      <TableCell className="font-arabic">{patient.phone}</TableCell>
                      <TableCell className="font-arabic">{patient.age || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={patient.gender === 'male' ? 'default' : patient.gender === 'female' ? 'outline' : 'secondary'} className="font-arabic">
                          {patient.gender === 'male' ? 'ذكر' : patient.gender === 'female' ? 'أنثى' : 'آخر'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-arabic text-sm text-gray-600 max-w-xs truncate">
                        {patient.address || 'لا يوجد عنوان'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewPatient(patient)}
                            className="h-8 w-8 p-0"
                            aria-label={`عرض تفاصيل ${patient.name}`}
                          >
                            <Eye className="w-4 h-4" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditPatient(patient)}
                            className="h-8 w-8 p-0"
                            aria-label={`تعديل ${patient.name}`}
                          >
                            <Edit className="w-4 h-4" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePatient(patient)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            aria-label={`حذف ${patient.name}`}
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
      {pages > 1 && (
        <div className="flex justify-center items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPageNum === 1}
            aria-label="الصفحة السابقة"
          >
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">السابق</span>
          </Button>
          
          <div className="flex gap-1">
            {[...Array(pages)].map((_, i) => {
              const pageNum = i + 1
              if (
                pageNum === 1 ||
                pageNum === pages ||
                (pageNum >= currentPageNum - 1 && pageNum <= currentPageNum + 1)
              ) {
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === currentPageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    aria-label={`الصفحة ${pageNum}`}
                    aria-current={pageNum === currentPageNum ? 'page' : undefined}
                  >
                    {pageNum}
                  </Button>
                )
              } else if (
                pageNum === currentPageNum - 2 ||
                pageNum === currentPageNum + 2
              ) {
                return <span key={pageNum} className="px-2 text-gray-500">...</span>
              }
              return null
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(pages, prev + 1))}
            disabled={currentPageNum === pages}
            aria-label="الصفحة التالية"
          >
            <span className="hidden sm:inline">التالي</span>
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>
      )}

      {/* View Patient Dialog */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent size="lg" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-arabic">تفاصيل المريض</DialogTitle>
            <DialogDescription className="font-arabic">
              معلومات شاملة عن المريض وسجلاته الطبية
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingDetails ? (
            <div className="flex justify-center py-8">
              <div className="space-y-4 w-full">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
          ) : patientDetails ? (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-500 font-arabic mb-1">الاسم</Label>
                  <p className="text-base font-semibold font-arabic">{patientDetails.name}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500 font-arabic mb-1">رقم الهاتف</Label>
                  <p className="text-base font-arabic">{patientDetails.phone}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500 font-arabic mb-1">العمر</Label>
                  <p className="text-base font-arabic">{patientDetails.age || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500 font-arabic mb-1">الجنس</Label>
                  <Badge variant={patientDetails.gender === 'male' ? 'default' : patientDetails.gender === 'female' ? 'outline' : 'secondary'} className="font-arabic">
                    {patientDetails.gender === 'male' ? 'ذكر' : patientDetails.gender === 'female' ? 'أنثى' : 'آخر'}
                  </Badge>
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-sm text-gray-500 font-arabic mb-1">العنوان</Label>
                  <p className="text-base font-arabic">{patientDetails.address || 'لا يوجد عنوان'}</p>
                </div>
              </div>
              
              {patientDetails.medical_history && (
                <div>
                  <Label className="text-sm text-gray-500 font-arabic mb-1">السجل الطبي</Label>
                  <p className="mt-1 p-3 bg-gray-50 rounded-lg text-sm font-arabic">{patientDetails.medical_history}</p>
                </div>
              )}

              {/* Recent Appointments */}
              {patientDetails.recent_appointments && patientDetails.recent_appointments.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-gray-900 mb-2 block font-arabic">المواعيد الأخيرة</Label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {patientDetails.recent_appointments.map((apt) => (
                      <Card key={apt.id} className="p-3">
                        <CardContent className="p-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium font-arabic">{formatDate(apt.start_time)}</p>
                              <p className="text-xs text-gray-600 font-arabic">الحالة: {apt.status}</p>
                            </div>
                            <Clock className="w-4 h-4 text-gray-400" aria-hidden="true" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Visits */}
              {patientDetails.recent_visits && patientDetails.recent_visits.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-gray-900 mb-2 block font-arabic">الزيارات الأخيرة</Label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {patientDetails.recent_visits.map((visit) => (
                      <Card key={visit.id} className="p-3">
                        <CardContent className="p-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium font-arabic">{formatDate(visit.created_at)}</p>
                              <p className="text-xs text-gray-600 font-arabic">الحالة: {visit.status}</p>
                            </div>
                            <Stethoscope className="w-4 h-4 text-gray-400" aria-hidden="true" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-gray-600 font-arabic">جاري تحميل التفاصيل...</p>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
              إغلاق
            </Button>
            <Button onClick={() => {
              setIsViewModalOpen(false)
              handleEditPatient(patientDetails)
            }}>
              تعديل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Patient Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle className="font-arabic">تعديل المريض</DialogTitle>
            <DialogDescription className="font-arabic">
              قم بتعديل معلومات المريض
            </DialogDescription>
          </DialogHeader>
          
          {selectedPatient && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name" className="font-arabic">الاسم *</Label>
                  <Input
                    id="edit-name"
                    type="text"
                    value={selectedPatient.name}
                    onChange={(e) => setSelectedPatient({
                      ...selectedPatient,
                      name: e.target.value
                    })}
                    className="font-arabic"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone" className="font-arabic">رقم الهاتف *</Label>
                  <Input
                    id="edit-phone"
                    type="text"
                    value={selectedPatient.phone}
                    onChange={(e) => setSelectedPatient({
                      ...selectedPatient,
                      phone: e.target.value
                    })}
                    className="font-arabic"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-age" className="font-arabic">العمر *</Label>
                  <Input
                    id="edit-age"
                    type="number"
                    value={selectedPatient.age}
                    onChange={(e) => setSelectedPatient({
                      ...selectedPatient,
                      age: e.target.value
                    })}
                    className="font-arabic"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-gender" className="font-arabic">الجنس *</Label>
                  <select
                    id="edit-gender"
                    value={selectedPatient.gender}
                    onChange={(e) => setSelectedPatient({
                      ...selectedPatient,
                      gender: e.target.value
                    })}
                    className="w-full h-12 border-2 border-gray-200 rounded-lg px-4 py-2 text-sm font-medium focus:border-medical-blue-500 focus:ring-2 focus:ring-medical-blue-100 bg-white text-gray-900 font-arabic"
                  >
                    <option value="male">ذكر</option>
                    <option value="female">أنثى</option>
                    <option value="other">آخر</option>
                  </select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-address" className="font-arabic">العنوان</Label>
                <Input
                  id="edit-address"
                  type="text"
                  value={selectedPatient.address || ''}
                  onChange={(e) => setSelectedPatient({
                    ...selectedPatient,
                    address: e.target.value
                  })}
                  className="font-arabic"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-medical-history" className="font-arabic">السجل الطبي</Label>
                <textarea
                  id="edit-medical-history"
                  value={selectedPatient.medical_history || ''}
                  onChange={(e) => setSelectedPatient({
                    ...selectedPatient,
                    medical_history: e.target.value
                  })}
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 text-sm font-medium focus:border-medical-blue-500 focus:ring-2 focus:ring-medical-blue-100 bg-white text-gray-900 font-arabic min-h-[100px]"
                  rows="3"
                />
              </div>
              
              {/* Clinic and Doctor Assignment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label htmlFor="edit-clinic" className="font-arabic">العيادة</Label>
                  <select
                    id="edit-clinic"
                    value={selectedPatient.clinic_id ? String(selectedPatient.clinic_id) : ''}
                    onChange={(e) => setSelectedPatient({
                      ...selectedPatient,
                      clinic_id: e.target.value ? parseInt(e.target.value) : null,
                      doctor_id: null // Reset doctor when clinic changes
                    })}
                    className="w-full h-12 border-2 border-gray-200 rounded-lg px-4 py-2 text-sm font-medium focus:border-medical-blue-500 focus:ring-2 focus:ring-medical-blue-100 bg-white text-gray-900 font-arabic"
                  >
                    <option value="">-- اختر العيادة --</option>
                    {clinics.map(clinic => (
                      <option key={clinic.id} value={clinic.id}>
                        {clinic.name} - {clinic.room_number}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-doctor" className="font-arabic">الطبيب</Label>
                  <select
                    id="edit-doctor"
                    value={selectedPatient.doctor_id ? String(selectedPatient.doctor_id) : ''}
                    onChange={(e) => setSelectedPatient({
                      ...selectedPatient,
                      doctor_id: e.target.value ? parseInt(e.target.value) : null
                    })}
                    disabled={!selectedPatient.clinic_id}
                    className="w-full h-12 border-2 border-gray-200 rounded-lg px-4 py-2 text-sm font-medium focus:border-medical-blue-500 focus:ring-2 focus:ring-medical-blue-100 bg-white text-gray-900 font-arabic disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">-- اختر الطبيب --</option>
                    {editDoctors.map(doctor => (
                      <option key={doctor.id} value={doctor.id}>
                        {doctor.name} - {doctor.specialty}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditModalOpen(false)
                setSelectedPatient(null)
              }}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleUpdatePatient}
              disabled={updatePatientMutation.isPending || !selectedPatient?.name || !selectedPatient?.phone || !selectedPatient?.age}
              loading={updatePatientMutation.isPending}
            >
              حفظ التغييرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle className="font-arabic text-red-600">حذف المريض</DialogTitle>
            <DialogDescription className="font-arabic">
              هل أنت متأكد من رغبتك في حذف هذا المريض؟
            </DialogDescription>
          </DialogHeader>
          
          {patientToDelete && (
            <div className="space-y-4">
              <p className="text-gray-700 font-arabic">
                سيتم حذف <strong>{patientToDelete.name}</strong>
              </p>
              <p className="text-sm text-red-600 font-arabic">
                لا يمكن التراجع عن هذا الإجراء. إذا كان للمريض مواعيد أو زيارات موجودة، سيفشل الحذف.
              </p>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false)
                setPatientToDelete(null)
              }}
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deletePatientMutation.isPending}
              loading={deletePatientMutation.isPending}
            >
              حذف المريض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Patient Dialog */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle className="font-arabic">إضافة مريض جديد</DialogTitle>
            <DialogDescription className="font-arabic">
              أدخل معلومات المريض الجديد
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-name" className="font-arabic">الاسم *</Label>
                <Input
                  id="create-name"
                  type="text"
                  value={newPatientData.name}
                  onChange={(e) => setNewPatientData({
                    ...newPatientData,
                    name: e.target.value
                  })}
                  className="font-arabic"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-phone" className="font-arabic">رقم الهاتف *</Label>
                <Input
                  id="create-phone"
                  type="text"
                  value={newPatientData.phone}
                  onChange={(e) => setNewPatientData({
                    ...newPatientData,
                    phone: e.target.value
                  })}
                  className="font-arabic"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-age" className="font-arabic">العمر *</Label>
                <Input
                  id="create-age"
                  type="number"
                  value={newPatientData.age}
                  onChange={(e) => setNewPatientData({
                    ...newPatientData,
                    age: e.target.value
                  })}
                  className="font-arabic"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-gender" className="font-arabic">الجنس *</Label>
                <select
                  id="create-gender"
                  value={newPatientData.gender}
                  onChange={(e) => setNewPatientData({
                    ...newPatientData,
                    gender: e.target.value
                  })}
                  className="w-full h-12 border-2 border-gray-200 rounded-lg px-4 py-2 text-sm font-medium focus:border-medical-blue-500 focus:ring-2 focus:ring-medical-blue-100 bg-white text-gray-900 font-arabic"
                >
                  <option value="male">ذكر</option>
                  <option value="female">أنثى</option>
                  <option value="other">آخر</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="create-address" className="font-arabic">العنوان</Label>
              <Input
                id="create-address"
                type="text"
                value={newPatientData.address}
                onChange={(e) => setNewPatientData({
                  ...newPatientData,
                  address: e.target.value
                })}
                className="font-arabic"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="create-medical-history" className="font-arabic">السجل الطبي</Label>
              <textarea
                id="create-medical-history"
                value={newPatientData.medical_history}
                onChange={(e) => setNewPatientData({
                  ...newPatientData,
                  medical_history: e.target.value
                })}
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 text-sm font-medium focus:border-medical-blue-500 focus:ring-2 focus:ring-medical-blue-100 bg-white text-gray-900 font-arabic min-h-[100px]"
                rows="3"
              />
            </div>
            
            {/* Clinic and Doctor Assignment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="create-clinic" className="font-arabic">العيادة</Label>
                <select
                  id="create-clinic"
                  value={newPatientData.clinic_id}
                  onChange={(e) => setNewPatientData({
                    ...newPatientData,
                    clinic_id: e.target.value,
                    doctor_id: '' // Reset doctor when clinic changes
                  })}
                  className="w-full h-12 border-2 border-gray-200 rounded-lg px-4 py-2 text-sm font-medium focus:border-medical-blue-500 focus:ring-2 focus:ring-medical-blue-100 bg-white text-gray-900 font-arabic"
                >
                  <option value="">-- اختر العيادة --</option>
                  {clinics.map(clinic => (
                    <option key={clinic.id} value={clinic.id}>
                      {clinic.name} - {clinic.room_number}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-doctor" className="font-arabic">الطبيب</Label>
                <select
                  id="create-doctor"
                  value={newPatientData.doctor_id}
                  onChange={(e) => setNewPatientData({
                    ...newPatientData,
                    doctor_id: e.target.value
                  })}
                  disabled={!newPatientData.clinic_id}
                  className="w-full h-12 border-2 border-gray-200 rounded-lg px-4 py-2 text-sm font-medium focus:border-medical-blue-500 focus:ring-2 focus:ring-medical-blue-100 bg-white text-gray-900 font-arabic disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">-- اختر الطبيب --</option>
                  {doctors.map(doctor => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.name} - {doctor.specialty}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleCreatePatient}
              disabled={createPatientMutation.isPending || !newPatientData.name || !newPatientData.phone || !newPatientData.age}
              loading={createPatientMutation.isPending}
            >
              إضافة مريض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}

export default PatientsListPage
