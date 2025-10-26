import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queueApi } from '../api/queue'
import { patientsApi } from '../api/patients'
import { clinicsApi } from '../api/clinics'
import { doctorsApi } from '../api/doctors'
import { servicesApi } from '../api/services'
import { Modal } from './common/Modal'
import { Button } from './common/Button'
import { Card, CardHeader, CardTitle, CardContent } from './common/Card'
import { Spinner } from './common/Spinner'
import { User, Phone, Stethoscope, Building, Plus, Search } from 'lucide-react'

const WalkInModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    patient_id: '',
    clinic_id: '',
    doctor_id: '',
    service_id: '',
    notes: ''
  })
  const [patientSearch, setPatientSearch] = useState('')
  const [showNewPatient, setShowNewPatient] = useState(false)
  const [newPatientData, setNewPatientData] = useState({
    name: '',
    phone: '',
    address: '',
    age: '',
    gender: 'Male'
  })

  const queryClient = useQueryClient()

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
    queryKey: ['doctors', formData.clinic_id],
    queryFn: async () => {
      if (!formData.clinic_id) return []
      const result = await doctorsApi.getDoctors()
      return result?.doctors?.filter(doctor => doctor.clinic_id === parseInt(formData.clinic_id)) || []
    },
    enabled: !!formData.clinic_id
  })

  // Fetch services for selected clinic
  const { data: services = [] } = useQuery({
    queryKey: ['services', formData.clinic_id],
    queryFn: async () => {
      if (!formData.clinic_id) return []
      const result = await clinicsApi.getClinicServices(formData.clinic_id)
      return result?.services || []
    },
    enabled: !!formData.clinic_id
  })

  // Search patients
  const { data: patients = [], isLoading: searchingPatients } = useQuery({
    queryKey: ['patients-search', patientSearch],
    queryFn: async () => {
      if (!patientSearch || patientSearch.length < 2) return []
      const result = await patientsApi.searchPatients(patientSearch)
      return result?.patients || []
    },
    enabled: !!patientSearch && patientSearch.length >= 2
  })

  // Create walk-in mutation
  const createWalkInMutation = useMutation({
    mutationFn: queueApi.createWalkIn,
    onSuccess: (data) => {
      queryClient.invalidateQueries(['queue'])
      queryClient.invalidateQueries(['dashboard-stats'])
      onSuccess?.(data)
      handleClose()
    },
    onError: (error) => {
      console.error('Failed to create walk-in:', error)
    }
  })

  // Create new patient mutation
  const createPatientMutation = useMutation({
    mutationFn: patientsApi.createPatient,
    onSuccess: (data) => {
      setFormData(prev => ({ ...prev, patient_id: data.patient.id }))
      setShowNewPatient(false)
      setNewPatientData({ name: '', phone: '', address: '', age: '', gender: 'Male' })
    },
    onError: (error) => {
      console.error('Failed to create patient:', error)
    }
  })

  const handleClose = () => {
    setFormData({
      patient_id: '',
      clinic_id: '',
      doctor_id: '',
      service_id: '',
      notes: ''
    })
    setPatientSearch('')
    setShowNewPatient(false)
    setNewPatientData({ name: '', phone: '', address: '', age: '', gender: 'Male' })
    onClose()
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!formData.patient_id || !formData.clinic_id || !formData.doctor_id || !formData.service_id) {
      alert('Please fill in all required fields')
      return
    }

    createWalkInMutation.mutate({
      patient_id: parseInt(formData.patient_id),
      clinic_id: parseInt(formData.clinic_id),
      doctor_id: parseInt(formData.doctor_id),
      service_id: parseInt(formData.service_id),
      notes: formData.notes
    })
  }

  const handleCreateNewPatient = (e) => {
    e.preventDefault()
    
    if (!newPatientData.name || !newPatientData.phone) {
      alert('Please fill in name and phone number')
      return
    }

    createPatientMutation.mutate({
      name: newPatientData.name,
      phone: newPatientData.phone,
      address: newPatientData.address,
      age: parseInt(newPatientData.age) || null,
      gender: newPatientData.gender
    })
  }

  const canSubmit = formData.patient_id && formData.clinic_id && formData.doctor_id && formData.service_id

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Walk-In Patient
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Patient Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Patient *
              </label>
              
              {!showNewPatient ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search patients by name or phone..."
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  {searchingPatients && (
                    <div className="flex items-center justify-center py-4">
                      <Spinner size="sm" />
                    </div>
                  )}
                  
                  {patients.length > 0 && (
                    <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                      {patients.map((patient) => (
                        <div
                          key={patient.id}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, patient_id: patient.id }))
                            setPatientSearch(patient.name)
                          }}
                          className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <div className="flex items-center gap-3">
                            <User className="w-4 h-4 text-gray-500" />
                            <div>
                              <div className="font-medium">{patient.name}</div>
                              <div className="text-sm text-gray-600">{patient.phone}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <Button
                    type="button"
                    onClick={() => setShowNewPatient(true)}
                    variant="outline"
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Patient
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Create New Patient</h4>
                    <Button
                      type="button"
                      onClick={() => setShowNewPatient(false)}
                      variant="outline"
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name *</label>
                      <input
                        type="text"
                        value={newPatientData.name}
                        onChange={(e) => setNewPatientData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone *</label>
                      <input
                        type="tel"
                        value={newPatientData.phone}
                        onChange={(e) => setNewPatientData(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Age</label>
                      <input
                        type="number"
                        value={newPatientData.age}
                        onChange={(e) => setNewPatientData(prev => ({ ...prev, age: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Gender</label>
                      <select
                        value={newPatientData.gender}
                        onChange={(e) => setNewPatientData(prev => ({ ...prev, gender: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <input
                      type="text"
                      value={newPatientData.address}
                      onChange={(e) => setNewPatientData(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <Button
                    type="button"
                    onClick={handleCreateNewPatient}
                    disabled={createPatientMutation.isPending}
                    className="w-full"
                  >
                    {createPatientMutation.isPending ? 'Creating...' : 'Create Patient'}
                  </Button>
                </div>
              )}
            </div>

            {/* Clinic Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Clinic *
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  value={formData.clinic_id}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    clinic_id: e.target.value,
                    doctor_id: '',
                    service_id: ''
                  }))}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a clinic</option>
                  {clinics.map((clinic) => (
                    <option key={clinic.id} value={clinic.id}>
                      {clinic.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Doctor Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Doctor *
              </label>
              <div className="relative">
                <Stethoscope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  value={formData.doctor_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, doctor_id: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={!formData.clinic_id}
                >
                  <option value="">Select a doctor</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.name} - {doctor.specialty}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Service Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Service *
              </label>
              <select
                value={formData.service_id}
                onChange={(e) => setFormData(prev => ({ ...prev, service_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={!formData.clinic_id}
              >
                <option value="">Select a service</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} - ${service.price} ({service.duration} min)
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Additional notes for this walk-in visit..."
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                onClick={handleClose}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!canSubmit || createWalkInMutation.isPending}
                className="flex-1"
              >
                {createWalkInMutation.isPending ? 'Adding...' : 'Add Walk-In'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </Modal>
  )
}

export default WalkInModal
