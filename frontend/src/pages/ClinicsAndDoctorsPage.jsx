import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clinicsApi, doctorsApi } from '../api'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import ClinicFormModal from '../components/ClinicFormModal'
import DoctorFormModal from '../components/DoctorFormModal'
import { Building2, UserPlus, Plus, Edit, Trash2, Users, Stethoscope, Calendar } from 'lucide-react'
import { useMutationWithRefetch } from '../hooks/useMutationWithRefetch'

const ClinicsAndDoctorsPage = () => {
  const queryClient = useQueryClient()
  const [showClinicModal, setShowClinicModal] = useState(false)
  const [showDoctorModal, setShowDoctorModal] = useState(false)
  const [selectedClinic, setSelectedClinic] = useState(null)
  const [selectedDoctor, setSelectedDoctor] = useState(null)

  // Fetch clinics
  const { data: clinicsResponse, isLoading: clinicsLoading } = useQuery({
    queryKey: ['clinics-all'],
    queryFn: async () => {
      const response = await clinicsApi.getClinics()
      return response?.clinics || []
    }
  })
  const clinics = clinicsResponse || []

  // Fetch doctors
  const { data: doctorsResponse, isLoading: doctorsLoading } = useQuery({
    queryKey: ['doctors-all'],
    queryFn: async () => {
      const response = await doctorsApi.getDoctors()
      return response?.doctors || []
    }
  })
  const doctors = doctorsResponse || []

  // Clinic mutations
  const createClinicMutation = useMutationWithRefetch({
    mutationFn: (data) => clinicsApi.createClinic(data),
    queryKeys: [['clinics-all'], ['clinics'], ['clinics', 'booking-wizard']],
    onSuccessMessage: 'Clinic created successfully',
    onErrorMessage: 'Failed to create clinic',
    onSuccessCallback: () => {
      setShowClinicModal(false)
      setSelectedClinic(null)
    }
  })

  const updateClinicMutation = useMutationWithRefetch({
    mutationFn: ({ id, data }) => clinicsApi.updateClinic(id, data),
    queryKeys: [['clinics-all'], ['clinics'], ['clinics', 'booking-wizard']],
    onSuccessMessage: 'Clinic updated successfully',
    onErrorMessage: 'Failed to update clinic',
    onSuccessCallback: () => {
      setShowClinicModal(false)
      setSelectedClinic(null)
    }
  })

  const deleteClinicMutation = useMutationWithRefetch({
    mutationFn: (id) => clinicsApi.deleteClinic(id),
    queryKeys: [['clinics-all'], ['clinics'], ['clinics', 'booking-wizard']],
    onSuccessMessage: 'Clinic deleted successfully',
    onErrorMessage: 'Failed to delete clinic'
  })

  // Doctor mutations
  const createDoctorMutation = useMutationWithRefetch({
    mutationFn: (data) => {
      console.log('Creating doctor with data:', data)
      return doctorsApi.createDoctor(data)
    },
    queryKeys: [['doctors-all'], ['doctors']],
    onSuccessMessage: 'Doctor created successfully',
    onErrorMessage: 'Failed to create doctor',
    onSuccessCallback: () => {
      setShowDoctorModal(false)
      setSelectedDoctor(null)
    }
  })

  const updateDoctorMutation = useMutationWithRefetch({
    mutationFn: ({ id, data }) => {
      console.log('Updating doctor with id:', id, 'data:', data)
      return doctorsApi.updateDoctor(id, data)
    },
    queryKeys: [['doctors-all'], ['doctors']],
    onSuccessMessage: 'Doctor updated successfully',
    onErrorMessage: 'Failed to update doctor',
    onSuccessCallback: () => {
      setShowDoctorModal(false)
      setSelectedDoctor(null)
    }
  })

  const deleteDoctorMutation = useMutationWithRefetch({
    mutationFn: (id) => doctorsApi.deleteDoctor(id),
    queryKeys: [['doctors-all'], ['doctors']],
    onSuccessMessage: 'Doctor deleted successfully',
    onErrorMessage: 'Failed to delete doctor'
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
    // Fetch full doctor data with schedule
    try {
      const response = await doctorsApi.getDoctor(doctor.id)
      setSelectedDoctor(response.doctor)
      setShowDoctorModal(true)
    } catch (error) {
      console.error('Failed to fetch doctor details:', error)
      // Fallback to doctor without schedule
      setSelectedDoctor(doctor)
      setShowDoctorModal(true)
    }
  }

  const handleDeleteClinic = (clinicId) => {
    if (window.confirm('Are you sure you want to delete this clinic?')) {
      deleteClinicMutation.mutate(clinicId)
    }
  }

  const handleDeleteDoctor = (doctorId) => {
    if (window.confirm('Are you sure you want to delete this doctor?')) {
      deleteDoctorMutation.mutate(doctorId)
    }
  }

  const getClinicName = (clinicId) => {
    const clinic = clinics.find(c => c.id === clinicId)
    return clinic ? clinic.name : 'Unknown'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Building2 className="w-8 h-8 text-blue-600" />
        <h1 className="text-2xl font-bold">Clinics & Doctors Management</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clinics Section */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Clinics ({clinics.length})
            </h2>
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
          </div>

          {clinicsLoading ? (
            <p className="text-gray-500">Loading clinics...</p>
          ) : clinics.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No clinics found</p>
          ) : (
            <div className="space-y-2">
              {clinics.map(clinic => (
                <div
                  key={clinic.id}
                  className="flex items-center justify-between p-3 border rounded hover:bg-gray-50"
                >
                  <div>
                    <h3 className="font-medium">{clinic.name}</h3>
                    <p className="text-sm text-gray-600">Room {clinic.room_number}</p>
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
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditClinic(clinic)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClinic(clinic.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
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
          </div>

          {doctorsLoading ? (
            <p className="text-gray-500">Loading doctors...</p>
          ) : doctors.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No doctors found</p>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {doctors.map(doctor => (
                <div
                  key={doctor.id}
                  className="flex items-center justify-between p-3 border rounded hover:bg-gray-50"
                >
                  <div>
                    <h3 className="font-medium">{doctor.name}</h3>
                    <p className="text-sm text-gray-600">{doctor.specialty}</p>
                    <p className="text-xs text-gray-500">{getClinicName(doctor.clinic_id)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditDoctor(doctor)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteDoctor(doctor.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
    </div>
  )
}

export default ClinicsAndDoctorsPage

