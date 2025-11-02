import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clinicsApi, doctorsApi } from '../api'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import { Modal } from '../components/common/Modal'
import ClinicFormModal from '../components/ClinicFormModal'
import DoctorFormModal from '../components/DoctorFormModal'
import ServiceFormModal from '../components/ServiceFormModal'
import ScheduleGrid from '../components/ScheduleGrid'
import { 
  Building2, UserPlus, Plus, Edit, Trash2, Users, Stethoscope, 
  Calendar, DollarSign, Settings, Search, Filter, Eye, X,
  TrendingUp, Activity, Clock
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

  // Build query params for clinics
  let clinicQueryParams = {}
  if (clinicSearch) clinicQueryParams.search = clinicSearch
  if (clinicActiveFilter !== 'all') clinicQueryParams.is_active = clinicActiveFilter
  // For doctors, filter by their clinic
  clinicQueryParams = addFilters(clinicQueryParams)

  // Build query params for doctors
  let doctorQueryParams = {}
  if (doctorSearch) doctorQueryParams.search = doctorSearch
  if (doctorClinicFilter !== 'all') doctorQueryParams.clinic_id = parseInt(doctorClinicFilter)
  if (doctorSpecialtyFilter !== 'all') doctorQueryParams.specialty = doctorSpecialtyFilter
  // For doctors, filter by their clinic
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

  // Fetch clinics with filters
  const { data: clinicsResponse, isLoading: clinicsLoading } = useQuery({
    queryKey: ['clinics-all', clinicQueryParams],
    queryFn: async () => {
      const response = await clinicsApi.getClinics(clinicQueryParams)
      return response?.clinics || []
    }
  })
  const clinics = clinicsResponse || []

  // Fetch doctors with filters
  const { data: doctorsResponse, isLoading: doctorsLoading } = useQuery({
    queryKey: ['doctors-all', doctorQueryParams],
    queryFn: async () => {
      const response = await doctorsApi.getDoctors(doctorQueryParams)
      return response?.doctors || []
    }
  })
  const doctors = doctorsResponse || []

  // Get unique specialties from filtered doctors
  const specialties = React.useMemo(() => {
    const uniqueSpecialties = [...new Set(doctors.map(d => d.specialty).filter(Boolean))]
    return uniqueSpecialties.sort()
  }, [doctors])

  // Clinic mutations
  const createClinicMutation = useMutationWithRefetch({
    mutationFn: (data) => clinicsApi.createClinic(data),
    queryKeys: [['clinics-all'], ['clinics'], ['clinics', 'booking-wizard'], ['clinic-statistics']],
    onSuccessMessage: 'Clinic created successfully',
    onErrorMessage: 'Failed to create clinic',
    onSuccessCallback: async (response) => {
      setShowClinicModal(false)
      setSelectedClinic(null)
      const newClinic = response?.clinic
      if (newClinic && window.confirm('Clinic created successfully! Would you like to add services for this clinic now?')) {
        setSelectedClinicForService(newClinic)
        setShowServiceModal(true)
      }
    }
  })

  const updateClinicMutation = useMutationWithRefetch({
    mutationFn: ({ id, data }) => clinicsApi.updateClinic(id, data),
    queryKeys: [['clinics-all'], ['clinics'], ['clinics', 'booking-wizard'], ['clinic-statistics']],
    onSuccessMessage: 'Clinic updated successfully',
    onErrorMessage: 'Failed to update clinic',
    onSuccessCallback: () => {
      setShowClinicModal(false)
      setSelectedClinic(null)
    }
  })

  const deleteClinicMutation = useMutationWithRefetch({
    mutationFn: (id) => clinicsApi.deleteClinic(id),
    queryKeys: [['clinics-all'], ['clinics'], ['clinics', 'booking-wizard'], ['clinic-statistics']],
    onSuccessMessage: 'Clinic deleted successfully',
    onErrorMessage: 'Failed to delete clinic',
    onSuccessCallback: () => {
      setShowDeleteClinicModal(false)
      setSelectedClinic(null)
    }
  })

  // Fetch services for a clinic
  const fetchClinicServices = async (clinicId) => {
    try {
      const response = await clinicsApi.getClinicServices(clinicId)
      return response?.services || []
    } catch (error) {
      console.error('Error fetching services:', error)
      return []
    }
  }

  // Service mutations
  const createServiceMutation = useMutationWithRefetch({
    mutationFn: ({ clinicId, data }) => clinicsApi.createService(clinicId, data),
    queryKeys: [['clinics-all'], ['clinic-statistics']], // Removed ['services'] to prevent invalid refetches
    onSuccessMessage: 'Service created successfully',
    onErrorMessage: 'Failed to create service',
    onSuccessCallback: () => {
      setShowServiceModal(false)
      setSelectedService(null)
      if (selectedClinicForService) {
        // Only invalidate specific clinic's services, not all services
        queryClient.invalidateQueries({ queryKey: ['services', selectedClinicForService.id] })
      }
      setSelectedClinicForService(null)
    }
  })

  const updateServiceMutation = useMutationWithRefetch({
    mutationFn: ({ clinicId, serviceId, data }) => clinicsApi.updateService(clinicId, serviceId, data),
    queryKeys: [['clinics-all'], ['clinic-statistics']], // Removed ['services'] to prevent invalid refetches
    onSuccessMessage: 'Service updated successfully',
    onErrorMessage: 'Failed to update service',
    onSuccessCallback: () => {
      setShowServiceModal(false)
      setSelectedService(null)
      if (selectedClinicForService) {
        // Only invalidate specific clinic's services, not all services
        queryClient.invalidateQueries({ queryKey: ['services', selectedClinicForService.id] })
      }
      setSelectedClinicForService(null)
    }
  })

  const deleteServiceMutation = useMutationWithRefetch({
    mutationFn: ({ clinicId, serviceId }) => clinicsApi.deleteService(clinicId, serviceId),
    queryKeys: [['clinics-all'], ['clinic-statistics']], // Removed ['services'] to prevent invalid refetches
    onSuccessMessage: 'Service deleted successfully',
    onErrorMessage: 'Failed to delete service',
    onSuccessCallback: () => {
      setShowDeleteServiceModal(false)
      setSelectedService(null)
      if (selectedClinicForService) {
        // Only invalidate specific clinic's services, not all services
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

  // Doctor mutations
  const createDoctorMutation = useMutationWithRefetch({
    mutationFn: (data) => {
      return doctorsApi.createDoctor(data)
    },
    queryKeys: [['doctors-all'], ['doctors'], ['doctor-statistics']],
    onSuccessMessage: 'Doctor created successfully',
    onErrorMessage: 'Failed to create doctor',
    onSuccessCallback: async (response, variables) => {
      setShowDoctorModal(false)
      setSelectedDoctor(null)
      const clinicId = variables.clinic_id
      const services = await fetchClinicServices(clinicId)
      if (services.length === 0) {
        const clinic = clinics.find(c => c.id === clinicId)
        if (clinic && window.confirm(`No services found for ${clinic.name}. Would you like to add services now?`)) {
          setSelectedClinicForService(clinic)
          setShowServiceModal(true)
        }
      }
    }
  })

  const updateDoctorMutation = useMutationWithRefetch({
    mutationFn: ({ id, data }) => {
      return doctorsApi.updateDoctor(id, data)
    },
    queryKeys: [['doctors-all'], ['doctors'], ['doctor-statistics']],
    onSuccessMessage: 'Doctor updated successfully',
    onErrorMessage: 'Failed to update doctor',
    onSuccessCallback: () => {
      setShowDoctorModal(false)
      setSelectedDoctor(null)
    }
  })

  const deleteDoctorMutation = useMutationWithRefetch({
    mutationFn: (id) => doctorsApi.deleteDoctor(id),
    queryKeys: [['doctors-all'], ['doctors'], ['doctor-statistics']],
    onSuccessMessage: 'Doctor deleted successfully',
    onErrorMessage: 'Failed to delete doctor',
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
    return clinic ? clinic.name : 'Unknown'
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Building2 className="w-8 h-8 text-blue-600" />
        <h1 className="text-2xl font-bold">Clinics & Doctors Management</h1>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Clinics</p>
              <p className="text-2xl font-bold text-gray-900">{clinicStats?.total_clinics || 0}</p>
            </div>
            <Building2 className="w-8 h-8 text-blue-500" />
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {clinicStats?.active_clinics || 0} active
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Doctors</p>
              <p className="text-2xl font-bold text-gray-900">{doctorStats?.total_doctors || 0}</p>
            </div>
            <Stethoscope className="w-8 h-8 text-green-500" />
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Across all clinics
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Services</p>
              <p className="text-2xl font-bold text-gray-900">{clinicStats?.total_services || 0}</p>
            </div>
            <Activity className="w-8 h-8 text-purple-500" />
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {clinicStats?.active_services || 0} active
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Clinics</p>
              <p className="text-2xl font-bold text-gray-900">{clinicStats?.active_clinics || 0}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-500" />
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {clinicStats?.inactive_clinics || 0} inactive
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clinics Section */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Clinics ({clinics.length})
            </h2>
            {!isDoctor && (
              <Button
                onClick={() => {
                  setSelectedClinic(null)
                  setShowClinicModal(true)
                }}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <Plus className="w-4 h-4" />
                Add Clinic
              </Button>
            )}
          </div>

          {/* Clinic Filters */}
          <div className="space-y-3 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search clinics by name or room..."
                value={clinicSearch}
                onChange={(e) => setClinicSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={clinicActiveFilter}
                onChange={(e) => setClinicActiveFilter(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="true">Active Only</option>
                <option value="false">Inactive Only</option>
              </select>
            </div>
          </div>

          {clinicsLoading ? (
            <p className="text-gray-500">Loading clinics...</p>
          ) : clinics.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No clinics found</p>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
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
        </Card>

        {/* Doctors Section */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Stethoscope className="w-5 h-5" />
              Doctors ({doctors.length})
            </h2>
            {!isDoctor && (
              <Button
                onClick={() => {
                  setSelectedDoctor(null)
                  setShowDoctorModal(true)
                }}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <Plus className="w-4 h-4" />
                Add Doctor
              </Button>
            )}
          </div>

          {/* Doctor Filters */}
          <div className="space-y-3 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search doctors by name or specialty..."
                value={doctorSearch}
                onChange={(e) => setDoctorSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={doctorClinicFilter}
                  onChange={(e) => setDoctorClinicFilter(e.target.value)}
                  disabled={isDoctor}
                  className={`flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDoctor ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                >
                  <option value="all">All Clinics</option>
                  {clinics.map(clinic => (
                    <option key={clinic.id} value={clinic.id}>{clinic.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={doctorSpecialtyFilter}
                  onChange={(e) => setDoctorSpecialtyFilter(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Specialties</option>
                  {specialties.map(specialty => (
                    <option key={specialty} value={specialty}>{specialty}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {doctorsLoading ? (
            <p className="text-gray-500">Loading doctors...</p>
          ) : doctors.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No doctors found</p>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {doctors.map(doctor => (
                <div
                  key={doctor.id}
                  className="flex items-center justify-between p-3 border rounded hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <h3 className="font-medium">{doctor.name}</h3>
                    <p className="text-sm text-gray-600">{doctor.specialty}</p>
                    <p className="text-xs text-gray-500">{getClinicName(doctor.clinic_id)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewDoctor(doctor)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {!isDoctor && (
                      <>
                        <button
                          onClick={() => handleEditDoctor(doctor)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDoctor(doctor)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Modals */}
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

      {/* Delete Clinic Confirmation Modal */}
      <Modal
        isOpen={showDeleteClinicModal}
        onClose={() => {
          setShowDeleteClinicModal(false)
          setSelectedClinic(null)
        }}
        title="Delete Clinic"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete <strong>{selectedClinic?.name}</strong>?
          </p>
          <p className="text-sm text-gray-500">
            This action cannot be undone. The clinic cannot be deleted if it has existing doctors, services, or appointments.
          </p>
          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteClinicModal(false)
                setSelectedClinic(null)
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={confirmDeleteClinic}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Doctor Confirmation Modal */}
      <Modal
        isOpen={showDeleteDoctorModal}
        onClose={() => {
          setShowDeleteDoctorModal(false)
          setSelectedDoctor(null)
        }}
        title="Delete Doctor"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete <strong>{selectedDoctor?.name}</strong>?
          </p>
          <p className="text-sm text-gray-500">
            This action cannot be undone. The doctor cannot be deleted if they have existing appointments or visits.
          </p>
          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDoctorModal(false)
                setSelectedDoctor(null)
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={confirmDeleteDoctor}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Service Confirmation Modal */}
      <Modal
        isOpen={showDeleteServiceModal}
        onClose={() => {
          setShowDeleteServiceModal(false)
          setSelectedService(null)
          setSelectedClinicForService(null)
        }}
        title="Delete Service"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete <strong>{selectedService?.name}</strong>?
          </p>
          <p className="text-sm text-gray-500">
            This action cannot be undone if the service has existing appointments or visits.
          </p>
          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteServiceModal(false)
                setSelectedService(null)
                setSelectedClinicForService(null)
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={confirmDeleteService}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Doctor Details Modal */}
      <Modal
        isOpen={showDoctorViewModal}
        onClose={() => {
          setShowDoctorViewModal(false)
          setSelectedDoctorForView(null)
        }}
        title="Doctor Details"
        size="lg"
      >
        {selectedDoctorForView && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <p className="text-gray-900">{selectedDoctorForView.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Specialty</label>
                <p className="text-gray-900">{selectedDoctorForView.specialty}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Clinic</label>
                <p className="text-gray-900">{getClinicName(selectedDoctorForView.clinic_id)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Share Percentage</label>
                <p className="text-gray-900">{(selectedDoctorForView.share_percentage * 100).toFixed(1)}%</p>
              </div>
            </div>

            {selectedDoctorForView.schedule && selectedDoctorForView.schedule.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Schedule</label>
                <ScheduleGrid
                  scheduleData={convertScheduleToGrid(selectedDoctorForView.schedule)}
                  editable={false}
                />
              </div>
            )}

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDoctorViewModal(false)
                  setSelectedDoctorForView(null)
                }}
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setSelectedDoctor(selectedDoctorForView)
                  setShowDoctorViewModal(false)
                  setShowDoctorModal(true)
                }}
              >
                Edit
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

// Clinic Card Component with Services
const ClinicCard = ({ clinic, onEdit, onDelete, onAddService, onEditService, onDeleteService, isExpanded, onToggleExpand, queryClient }) => {
  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['services', clinic.id],
    queryFn: async () => {
      const response = await clinicsApi.getClinicServices(clinic.id)
      return response?.services || []
    },
    enabled: isExpanded
  })

  return (
    <div className="border rounded">
      <div className="flex items-center justify-between p-3 hover:bg-gray-50">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium">{clinic.name}</h3>
            <span
              className={`inline-block px-2 py-1 rounded text-xs ${
                clinic.is_active
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {clinic.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="text-sm text-gray-600">Room {clinic.room_number}</p>
          <p className="text-xs text-gray-500 mt-1">
            {services.length} service{services.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onToggleExpand}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded"
            title="View Services"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={onEdit}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-red-600 hover:bg-red-50 rounded"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      {isExpanded && (
        <div className="border-t bg-gray-50 p-3">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-medium">Services</h4>
            <button
              onClick={onAddService}
              className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800"
            >
              <Plus className="w-3 h-3" />
              Add Service
            </button>
          </div>
          {servicesLoading ? (
            <p className="text-xs text-gray-500">Loading services...</p>
          ) : services.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-xs text-gray-500 mb-2">No services yet</p>
              <button
                onClick={onAddService}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Add your first service
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {services.map(service => (
                <div
                  key={service.id}
                  className="flex items-center justify-between p-2 bg-white rounded border text-xs"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{service.name}</span>
                      {!service.is_active && (
                        <span className="text-red-600 text-xs">(Inactive)</span>
                      )}
                    </div>
                    <span className="text-gray-500">
                      ${service.price} · {service.duration} min
                    </span>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={() => onEditService(service)}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      title="Edit Service"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onDeleteService(service)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                      title="Delete Service"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ClinicsAndDoctorsPage
