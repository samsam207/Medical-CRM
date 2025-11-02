import React, { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { 
  User, Phone, Calendar, Search, Plus, Eye, Edit, Trash2, Filter, 
  Download, FileSpreadsheet, TrendingUp, Users, Activity, ChevronLeft, 
  ChevronRight, X, Clock, Stethoscope 
} from 'lucide-react'
import { Button } from '../components/common/Button'
import { Card } from '../components/common/Card'
import { Modal } from '../components/common/Modal'
import { Spinner } from '../components/common/Spinner'
import { patientsApi } from '../api'
import { formatDate } from '../utils/formatters'
import { useMutationWithRefetch } from '../hooks/useMutationWithRefetch'
import { useDoctorFilters } from '../hooks/useDoctorFilters'
import PageContainer from '../components/layout/PageContainer'

const PatientsListPage = () => {
  const { addFilters } = useDoctorFilters()
  const [searchQuery, setSearchQuery] = useState('')
  const [genderFilter, setGenderFilter] = useState('all')
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
    medical_history: ''
  })

  const queryClient = useQueryClient()

  // Fetch patients with pagination and filters
  const { data: patientsData, isLoading, error, refetch } = useQuery({
    queryKey: ['patients', searchQuery, genderFilter, currentPage, perPage],
    queryFn: () => patientsApi.getPatients(addFilters({
      name: searchQuery || undefined,
      phone: searchQuery || undefined,
      gender: genderFilter !== 'all' ? genderFilter : undefined,
      page: currentPage,
      per_page: perPage
    })),
    refetchOnWindowFocus: false
  })

  const patients = patientsData?.patients || []
  const total = patientsData?.total || 0
  const pages = patientsData?.pages || 1
  const currentPageNum = patientsData?.current_page || 1

  // Fetch statistics
  const { data: statistics } = useQuery({
    queryKey: ['patient-statistics'],
    queryFn: () => patientsApi.getStatistics(addFilters()),
    refetchOnWindowFocus: false
  })

  // Fetch patient details with history
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

  // Create patient mutation
  const createPatientMutation = useMutationWithRefetch({
    mutationFn: (data) => patientsApi.createPatient(data),
    queryKeys: [['patients'], ['patient-statistics']],
    onSuccessMessage: 'Patient created successfully',
    onErrorMessage: 'Failed to create patient',
    onSuccessCallback: () => {
      setIsCreateModalOpen(false)
      setNewPatientData({
        name: '',
        phone: '',
        address: '',
        age: '',
        gender: 'male',
        medical_history: ''
      })
    }
  })

  // Update patient mutation
  const updatePatientMutation = useMutationWithRefetch({
    mutationFn: ({ id, data }) => patientsApi.updatePatient(id, data),
    queryKeys: [['patients'], ['patient-statistics']],
    onSuccessMessage: 'Patient updated successfully',
    onErrorMessage: 'Failed to update patient',
    onSuccessCallback: () => {
      setIsEditModalOpen(false)
      setSelectedPatient(null)
    }
  })

  // Delete patient mutation
  const deletePatientMutation = useMutationWithRefetch({
    mutationFn: (id) => patientsApi.deletePatient(id),
    queryKeys: [['patients'], ['patient-statistics']],
    onSuccessMessage: 'Patient deleted successfully',
    onErrorMessage: 'Failed to delete patient. This patient may have existing appointments or visits.',
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
        phone: searchQuery || undefined
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
    createPatientMutation.mutate(newPatientData)
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
    updatePatientMutation.mutate({
      id: selectedPatient.id,
      data: updateData
    })
  }

  const getGenderColor = (gender) => {
    switch (gender) {
      case 'male': return 'bg-blue-100 text-blue-800'
      case 'female': return 'bg-pink-100 text-pink-800'
      case 'other': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
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
          <h3 className="text-lg font-semibold text-red-600 mb-2">Error Loading Patients</h3>
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
        <h1 className="text-2xl font-bold">Patients</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExport}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Patient
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Patients</p>
                <p className="text-2xl font-bold">{statistics.total || 0}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Male</p>
                <p className="text-2xl font-bold">{statistics.by_gender?.male || 0}</p>
              </div>
              <User className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Female</p>
                <p className="text-2xl font-bold">{statistics.by_gender?.female || 0}</p>
              </div>
              <User className="w-8 h-8 text-pink-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Recent (30 days)</p>
                <p className="text-2xl font-bold">{statistics.recent || 0}</p>
              </div>
              <Activity className="w-8 h-8 text-green-500" />
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1) // Reset to first page on search
              }}
              className="border rounded px-3 py-2 flex-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={genderFilter}
              onChange={(e) => {
                setGenderFilter(e.target.value)
                setCurrentPage(1) // Reset to first page on filter change
              }}
              className="border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Per Page:</label>
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Patients List */}
      <div className="grid gap-4">
        {patients.length === 0 ? (
          <Card className="p-8 text-center">
            <User className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">No patients found</p>
          </Card>
        ) : (
          patients.map((patient) => (
            <Card key={patient.id} className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <h3 className="font-semibold text-lg">{patient.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getGenderColor(patient.gender)}`}>
                      {patient.gender?.toUpperCase() || 'N/A'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>{patient.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>Age: {patient.age || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>{patient.address || 'No address'}</span>
                    </div>
                  </div>
                  
                  {patient.medical_history && (
                    <div className="mt-2 text-sm text-gray-500">
                      <span className="font-medium">Medical History:</span> {patient.medical_history}
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewPatient(patient)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditPatient(patient)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeletePatient(patient)}
                    className="text-red-600 hover:text-red-700"
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
      {pages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPageNum === 1}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          
          <div className="flex gap-1">
            {[...Array(pages)].map((_, i) => {
              const pageNum = i + 1
              // Show first, last, current, and pages around current
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
                  >
                    {pageNum}
                  </Button>
                )
              } else if (
                pageNum === currentPageNum - 2 ||
                pageNum === currentPageNum + 2
              ) {
                return <span key={pageNum} className="px-2">...</span>
              }
              return null
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(pages, prev + 1))}
            disabled={currentPageNum === pages}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* View Patient Modal with History */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false)
          setSelectedPatient(null)
          setPatientDetails(null)
        }}
        title="Patient Details"
      >
        {isLoadingDetails ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : patientDetails ? (
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Name</label>
                <p className="text-lg font-semibold">{patientDetails.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Phone</label>
                <p>{patientDetails.phone}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Age</label>
                <p>{patientDetails.age || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Gender</label>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getGenderColor(patientDetails.gender)}`}>
                  {patientDetails.gender?.toUpperCase() || 'N/A'}
                </span>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-500">Address</label>
                <p>{patientDetails.address || 'No address'}</p>
              </div>
            </div>
            
            {patientDetails.medical_history && (
              <div>
                <label className="text-sm font-medium text-gray-500">Medical History</label>
                <p className="mt-1 p-3 bg-gray-50 rounded">{patientDetails.medical_history}</p>
              </div>
            )}

            {/* Recent Appointments */}
            {patientDetails.recent_appointments && patientDetails.recent_appointments.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-500 mb-2 block">Recent Appointments</label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {patientDetails.recent_appointments.map((apt) => (
                    <Card key={apt.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{formatDate(apt.start_time)}</p>
                          <p className="text-sm text-gray-600">Status: {apt.status}</p>
                        </div>
                        <Clock className="w-4 h-4 text-gray-400" />
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Visits */}
            {patientDetails.recent_visits && patientDetails.recent_visits.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-500 mb-2 block">Recent Visits</label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {patientDetails.recent_visits.map((visit) => (
                    <Card key={visit.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{formatDate(visit.created_at)}</p>
                          <p className="text-sm text-gray-600">Status: {visit.status}</p>
                        </div>
                        <Stethoscope className="w-4 h-4 text-gray-400" />
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p>Loading patient details...</p>
        )}
      </Modal>

      {/* Edit Patient Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setSelectedPatient(null)
        }}
        title="Edit Patient"
      >
        {selectedPatient && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={selectedPatient.name}
                  onChange={(e) => setSelectedPatient({
                    ...selectedPatient,
                    name: e.target.value
                  })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={selectedPatient.phone}
                  onChange={(e) => setSelectedPatient({
                    ...selectedPatient,
                    phone: e.target.value
                  })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                <input
                  type="number"
                  value={selectedPatient.age}
                  onChange={(e) => setSelectedPatient({
                    ...selectedPatient,
                    age: e.target.value
                  })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <select
                  value={selectedPatient.gender}
                  onChange={(e) => setSelectedPatient({
                    ...selectedPatient,
                    gender: e.target.value
                  })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                value={selectedPatient.address || ''}
                onChange={(e) => setSelectedPatient({
                  ...selectedPatient,
                  address: e.target.value
                })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Medical History</label>
              <textarea
                value={selectedPatient.medical_history || ''}
                onChange={(e) => setSelectedPatient({
                  ...selectedPatient,
                  medical_history: e.target.value
                })}
                className="w-full border rounded px-3 py-2"
                rows="3"
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditModalOpen(false)
                  setSelectedPatient(null)
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdatePatient}
                disabled={updatePatientMutation.isPending}
              >
                {updatePatientMutation.isPending ? <Spinner size="sm" /> : 'Save Changes'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setPatientToDelete(null)
        }}
        title="Delete Patient"
      >
        {patientToDelete && (
          <div className="space-y-4">
            <p className="text-gray-600">
              Are you sure you want to delete <strong>{patientToDelete.name}</strong>?
            </p>
            <p className="text-sm text-red-600">
              This action cannot be undone. If this patient has existing appointments or visits, deletion will fail.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteModalOpen(false)
                  setPatientToDelete(null)
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDelete}
                disabled={deletePatientMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deletePatientMutation.isPending ? <Spinner size="sm" /> : 'Delete Patient'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Patient Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Patient"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={newPatientData.name}
                onChange={(e) => setNewPatientData({
                  ...newPatientData,
                  name: e.target.value
                })}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
              <input
                type="text"
                value={newPatientData.phone}
                onChange={(e) => setNewPatientData({
                  ...newPatientData,
                  phone: e.target.value
                })}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Age *</label>
              <input
                type="number"
                value={newPatientData.age}
                onChange={(e) => setNewPatientData({
                  ...newPatientData,
                  age: e.target.value
                })}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
              <select
                value={newPatientData.gender}
                onChange={(e) => setNewPatientData({
                  ...newPatientData,
                  gender: e.target.value
                })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              type="text"
              value={newPatientData.address}
              onChange={(e) => setNewPatientData({
                ...newPatientData,
                address: e.target.value
              })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Medical History</label>
            <textarea
              value={newPatientData.medical_history}
              onChange={(e) => setNewPatientData({
                ...newPatientData,
                medical_history: e.target.value
              })}
              className="w-full border rounded px-3 py-2"
              rows="3"
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreatePatient}
              disabled={createPatientMutation.isPending || !newPatientData.name || !newPatientData.phone || !newPatientData.age}
            >
              {createPatientMutation.isPending ? <Spinner size="sm" /> : 'Create Patient'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Toast Notification */}
      {(createPatientMutation.toast?.show || updatePatientMutation.toast?.show || deletePatientMutation.toast?.show) && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 ${
          (() => {
            if (createPatientMutation.toast?.show) return createPatientMutation.toast.type
            if (updatePatientMutation.toast?.show) return updatePatientMutation.toast.type
            if (deletePatientMutation.toast?.show) return deletePatientMutation.toast.type
          })() === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          <div className={`w-5 h-5 flex items-center justify-center rounded-full ${
            (() => {
              if (createPatientMutation.toast?.show) return createPatientMutation.toast.type
              if (updatePatientMutation.toast?.show) return updatePatientMutation.toast.type
              if (deletePatientMutation.toast?.show) return deletePatientMutation.toast.type
            })() === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}>
            {(() => {
              if (createPatientMutation.toast?.show) return createPatientMutation.toast.type
              if (updatePatientMutation.toast?.show) return updatePatientMutation.toast.type
              if (deletePatientMutation.toast?.show) return deletePatientMutation.toast.type
            })() === 'success' ? '✓' : '✕'}
          </div>
          <span className="font-medium">
            {createPatientMutation.toast?.show && createPatientMutation.toast.message}
            {updatePatientMutation.toast?.show && updatePatientMutation.toast.message}
            {deletePatientMutation.toast?.show && deletePatientMutation.toast.message}
          </span>
          <button 
            onClick={() => {
              if (createPatientMutation.toast?.show) createPatientMutation.dismissToast()
              if (updatePatientMutation.toast?.show) updatePatientMutation.dismissToast()
              if (deletePatientMutation.toast?.show) deletePatientMutation.dismissToast()
            }}
            className="ml-2 text-white hover:text-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </PageContainer>
  )
}

export default PatientsListPage
