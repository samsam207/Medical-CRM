import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { User, Phone, Calendar, Search, Plus, Eye, Edit, Trash2, Filter } from 'lucide-react'
import { Button } from '../components/common/Button'
import { Card } from '../components/common/Card'
import { Modal } from '../components/common/Modal'
import { Spinner } from '../components/common/Spinner'
import { patientsApi } from '../api'
import { formatDate } from '../utils/formatters'
import { useMutationWithRefetch } from '../hooks/useMutationWithRefetch'

const PatientsListPage = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [genderFilter, setGenderFilter] = useState('all')
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newPatientData, setNewPatientData] = useState({
    name: '',
    phone: '',
    address: '',
    age: '',
    gender: 'male',
    medical_history: ''
  })

  const queryClient = useQueryClient()

  // Fetch patients
  const { data: patients = [], isLoading, error, refetch } = useQuery({
    queryKey: ['patients', searchQuery, genderFilter],
    queryFn: () => patientsApi.getPatients({
      phone: searchQuery || undefined,
      name: searchQuery || undefined
    }).then(res => res?.patients || []),
    refetchOnWindowFocus: false
  })

  // Create patient mutation
  const createPatientMutation = useMutationWithRefetch({
    mutationFn: (data) => patientsApi.createPatient(data),
    queryKeys: [['patients']],
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
    queryKeys: [['patients']],
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
    queryKeys: [['patients']],
    onSuccessMessage: 'Patient deleted successfully',
    onErrorMessage: 'Failed to delete patient. This patient may have existing appointments or visits.',
    onSuccessCallback: () => setSelectedPatient(null)
  })

  const handleViewPatient = (patient) => {
    setSelectedPatient(patient)
    setIsViewModalOpen(true)
  }

  const handleEditPatient = (patient) => {
    setSelectedPatient(patient)
    setIsEditModalOpen(true)
  }

  const handleDeletePatient = (id) => {
    if (window.confirm('Are you sure you want to delete this patient?')) {
      deletePatientMutation.mutate(id)
    }
  }

  const handleCreatePatient = () => {
    createPatientMutation.mutate(newPatientData)
  }

  const handleUpdatePatient = () => {
    // Extract only the fields we want to update
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Patients</h1>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Patient
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            <input
              type="text"
              placeholder="Search patients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border rounded px-3 py-1 w-64"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="border rounded px-3 py-1"
            >
              <option value="all">All Genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
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
                      {patient.gender.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>{patient.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>Age: {patient.age}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>{patient.address}</span>
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
                    onClick={() => handleDeletePatient(patient.id)}
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

      {/* View Patient Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Patient Details"
      >
        {selectedPatient && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Name</label>
                <p className="text-lg">{selectedPatient.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Phone</label>
                <p>{selectedPatient.phone}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Age</label>
                <p>{selectedPatient.age}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Gender</label>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getGenderColor(selectedPatient.gender)}`}>
                  {selectedPatient.gender.toUpperCase()}
                </span>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-500">Address</label>
                <p>{selectedPatient.address}</p>
              </div>
            </div>
            
            {selectedPatient.medical_history && (
              <div>
                <label className="text-sm font-medium text-gray-500">Medical History</label>
                <p className="mt-1 p-3 bg-gray-50 rounded">{selectedPatient.medical_history}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Edit Patient Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
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
                value={selectedPatient.address}
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
                onClick={() => setIsEditModalOpen(false)}
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
      {(createPatientMutation.toast.show || updatePatientMutation.toast.show || deletePatientMutation.toast.show) && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 ${
          (() => {
            if (createPatientMutation.toast.show) return createPatientMutation.toast.type
            if (updatePatientMutation.toast.show) return updatePatientMutation.toast.type
            if (deletePatientMutation.toast.show) return deletePatientMutation.toast.type
          })() === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          <div className={`w-5 h-5 flex items-center justify-center rounded-full ${(() => {
            if (createPatientMutation.toast.show) return createPatientMutation.toast.type
            if (updatePatientMutation.toast.show) return updatePatientMutation.toast.type
            if (deletePatientMutation.toast.show) return deletePatientMutation.toast.type
          })() === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            {(() => {
              if (createPatientMutation.toast.show) return createPatientMutation.toast.type
              if (updatePatientMutation.toast.show) return updatePatientMutation.toast.type
              if (deletePatientMutation.toast.show) return deletePatientMutation.toast.type
            })() === 'success' ? '✓' : '✕'}
          </div>
          <span className="font-medium">
            {createPatientMutation.toast.show && createPatientMutation.toast.message}
            {updatePatientMutation.toast.show && updatePatientMutation.toast.message}
            {deletePatientMutation.toast.show && deletePatientMutation.toast.message}
          </span>
          <button 
            onClick={() => {
              if (createPatientMutation.toast.show) createPatientMutation.dismissToast()
              if (updatePatientMutation.toast.show) updatePatientMutation.dismissToast()
              if (deletePatientMutation.toast.show) deletePatientMutation.dismissToast()
            }}
            className="ml-2 text-white hover:text-gray-200"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

export default PatientsListPage