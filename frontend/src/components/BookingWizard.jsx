import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, ChevronLeft, ChevronRight, Calendar, Clock, User, Stethoscope } from 'lucide-react'
import { Button } from './common/Button'
import { Card } from './common/Card'
import { Modal } from './common/Modal'
import { Spinner } from './common/Spinner'
import { appointmentsApi, patientsApi, clinicsApi } from '../api'
import { formatDate, formatTime } from '../utils/formatters'
import { validateForm, commonRules } from '../utils/validation'
import { useMutationWithRefetch } from '../hooks/useMutationWithRefetch'

const BookingWizard = ({ isOpen, onClose, onSuccess }) => {
  console.log('BookingWizard mounted, isOpen:', isOpen);
  
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    clinic_id: '',
    doctor_id: '',
    patient_id: '',
    service_id: '',
    start_time: '',
    booking_source: 'phone',
    notes: ''
  })
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreatingPatient, setIsCreatingPatient] = useState(false)
  const [errors, setErrors] = useState({})
  const [newPatientData, setNewPatientData] = useState({
    name: '',
    phone: '',
    address: '',
    age: '',
    gender: 'male'
  })

  const queryClient = useQueryClient()

  // Validation functions
  const validateStep = (step) => {
    const newErrors = {}
    
    switch (step) {
      case 1: // Clinic selection
        if (!formData.clinic_id) {
          newErrors.clinic_id = 'Please select a clinic'
        }
        break
      case 2: // Doctor selection
        if (!formData.doctor_id) {
          newErrors.doctor_id = 'Please select a doctor'
        }
        break
      case 3: // Patient selection
        if (!formData.patient_id && !isCreatingPatient) {
          newErrors.patient_id = 'Please select a patient or create a new one'
        }
        if (isCreatingPatient) {
          const patientValidation = validateForm(newPatientData, {
            name: commonRules.name,
            phone: commonRules.phone,
            age: commonRules.age
          })
          if (!patientValidation.isValid) {
            Object.assign(newErrors, patientValidation.errors)
          }
        }
        break
      case 4: // Service & Time selection
        if (!formData.service_id) {
          newErrors.service_id = 'Please select a service'
        }
        if (!formData.start_time) {
          newErrors.start_time = 'Please select a time slot'
        }
        break
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Test query
  const { data: testData } = useQuery({
    queryKey: ['test'],
    queryFn: () => Promise.resolve({ message: 'test' }),
    enabled: isOpen
  })
  
  console.log('Test query data:', testData);

  // Fetch clinics
  const { data: clinics = [], error: clinicsError, isLoading: clinicsLoading } = useQuery({
    queryKey: ['clinics', 'booking-wizard'],
    queryFn: async () => {
      console.log('Fetching clinics...');
      const result = await clinicsApi.getClinics();
      console.log('Clinics API result:', result);
      return result?.clinics || [];
    },
    enabled: isOpen
  })
  
  console.log('Clinics query result:', { clinics, clinicsError, clinicsLoading });
  console.log('Form data:', formData);
  console.log('Current step:', currentStep);

  // Fetch doctors for selected clinic
  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors', formData.clinic_id],
    queryFn: () => clinicsApi.getClinicDoctors(parseInt(formData.clinic_id)).then(res => res?.data?.doctors || []),
    enabled: !!formData.clinic_id && formData.clinic_id !== ''
  })

  // Fetch services for selected clinic
  const { data: services = [] } = useQuery({
    queryKey: ['services', formData.clinic_id],
    queryFn: () => clinicsApi.getClinicServices(parseInt(formData.clinic_id)).then(res => res?.services || []),
    enabled: !!formData.clinic_id && formData.clinic_id !== ''
  })

  // Search patients
  const { data: patients = [], isLoading: searchingPatients } = useQuery({
    queryKey: ['patients', 'search', searchQuery],
    queryFn: () => patientsApi.searchPatients(searchQuery).then(res => res.patients),
    enabled: searchQuery.length >= 2
  })

  // Fetch available slots
  const { data: availableSlots = [] } = useQuery({
    queryKey: ['available-slots', formData.doctor_id, selectedDate],
    queryFn: () => appointmentsApi.getAvailableSlots({
      doctor_id: formData.doctor_id,
      clinic_id: formData.clinic_id,
      date: selectedDate.toISOString().split('T')[0]
    }).then(res => res.available_slots),
    enabled: !!formData.doctor_id && !!formData.clinic_id
  })

  // Create appointment mutation
  const createAppointmentMutation = useMutationWithRefetch({
    mutationFn: (data) => appointmentsApi.createAppointment(data),
    queryKeys: [['appointments'], ['dashboard-stats'], ['queue-phases']],
    onSuccessMessage: 'Appointment created successfully',
    onErrorMessage: 'Failed to create appointment',
    onSuccessCallback: (response) => {
      onSuccess?.(response.data)
      handleClose()
    }
  })

  // Create patient mutation
  const createPatientMutation = useMutation({
    mutationFn: (data) => patientsApi.createPatient(data),
    onSuccess: (response) => {
      console.log('Patient creation response:', response)
      // Handle both response structures: response.data.patient.id and response.patient.id
      const patientId = response?.data?.patient?.id || response?.patient?.id
      if (patientId) {
        setFormData(prev => ({ ...prev, patient_id: patientId }))
        setIsCreatingPatient(false)
        setSearchQuery('')
        // Invalidate patients query to refresh the list
        queryClient.invalidateQueries(['patients'])
      } else {
        console.error('Invalid response structure:', response)
      }
    }
  })

  const handleClose = () => {
    setCurrentStep(1)
    setFormData({
      clinic_id: '',
      doctor_id: '',
      patient_id: '',
      service_id: '',
      start_time: '',
      booking_source: 'phone',
      notes: ''
    })
    setSelectedDate(new Date())
    setSearchQuery('')
    setIsCreatingPatient(false)
    onClose()
  }

  const handleNext = useCallback(() => {
    console.log('handleNext called:', { currentStep, formData });
    const isValid = validateStep(currentStep)
    console.log('validateStep result:', isValid);
    const canProceedResult = canProceed();
    console.log('canProceed result:', canProceedResult);
    if (isValid && currentStep < 5) {
      console.log('Moving to next step:', currentStep + 1);
      setCurrentStep(currentStep + 1)
    } else {
      console.log('Cannot proceed:', { isValid, currentStep, canProceedResult });
    }
  }, [currentStep, formData])

  const handlePrevious = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      setErrors({})
    }
  }, [currentStep])

  const handleSubmit = () => {
    // Convert IDs to integers for backend
    const appointmentData = {
      ...formData,
      clinic_id: parseInt(formData.clinic_id),
      doctor_id: parseInt(formData.doctor_id),
      patient_id: parseInt(formData.patient_id),
      service_id: parseInt(formData.service_id)
    }
    createAppointmentMutation.mutate(appointmentData)
  }

  const handleCreatePatient = () => {
    // Convert gender to lowercase before sending
    const patientData = {
      ...newPatientData,
      gender: newPatientData.gender.toLowerCase()
    }
    createPatientMutation.mutate(patientData)
  }

  const canProceed = () => {
    console.log('canProceed check:', { currentStep, formData, clinic_id: formData.clinic_id, clinic_id_type: typeof formData.clinic_id });
    switch (currentStep) {
      case 1: 
        // Accept both string and number types for clinic_id
        const clinicSelected = formData.clinic_id && formData.clinic_id !== '' && formData.clinic_id !== undefined;
        console.log('Step 1 canProceed:', clinicSelected, 'clinic_id:', formData.clinic_id);
        return clinicSelected;
      case 2: return !!formData.doctor_id && formData.doctor_id !== ''
      case 3: return !!formData.patient_id && formData.patient_id !== ''
      case 4: return !!formData.service_id && !!formData.start_time && formData.service_id !== '' && formData.start_time !== ''
      case 5: return !!formData.clinic_id && !!formData.doctor_id && !!formData.patient_id && !!formData.service_id && !!formData.start_time &&
               formData.clinic_id !== '' && formData.doctor_id !== '' && formData.patient_id !== '' && formData.service_id !== '' && formData.start_time !== ''
      default: return false
    }
  }

  const renderStep1 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Select Clinic</h3>
      {clinicsLoading && (
        <div className="text-blue-600 text-sm">Loading clinics...</div>
      )}
      {clinicsError && (
        <div className="text-red-600 text-sm">Error loading clinics: {clinicsError.message}</div>
      )}
      {errors.clinic_id && (
        <div className="text-red-600 text-sm">{errors.clinic_id}</div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(clinics || []).map(clinic => (
          <Card
            key={clinic.id}
            className={`p-4 cursor-pointer transition-colors ${
              formData.clinic_id === String(clinic.id)
                ? 'border-blue-500 bg-blue-50'
                : 'hover:bg-gray-50'
            }`}
            onClick={() => {
              console.log('Clinic clicked:', clinic);
              console.log('Clinic ID type:', typeof clinic.id, 'Value:', clinic.id);
              setFormData(prev => {
                const newData = { 
                  ...prev, 
                  clinic_id: String(clinic.id),
                  doctor_id: '', // Reset doctor when clinic changes
                  service_id: '', // Reset service when clinic changes
                  start_time: '', // Reset time when clinic changes
                  selectedClinic: clinic
                };
                console.log('Form data after clinic selection:', newData);
                return newData;
              });
            }}
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium">{clinic.name}</h4>
                <p className="text-sm text-gray-600">Room {clinic.room_number}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Select Doctor</h3>
      {errors.doctor_id && (
        <div className="text-red-600 text-sm">{errors.doctor_id}</div>
      )}
      <div className="grid grid-cols-1 gap-4">
        {doctors.map(doctor => {
          // is_available is now set by the backend based on schedule
          const isAvailable = doctor.is_available !== false && doctor.is_available !== undefined ? doctor.is_available : true
          const isSelected = formData.doctor_id === String(doctor.id)
          const hasSchedule = doctor.has_schedule === true
          
          return (
            <Card
              key={doctor.id}
              className={`p-4 transition-colors ${
                !isAvailable
                  ? 'opacity-50 cursor-not-allowed bg-gray-100'
                  : isSelected
                    ? 'border-blue-500 bg-blue-50 cursor-pointer'
                    : 'hover:bg-gray-50 cursor-pointer'
              }`}
              onClick={() => {
                if (isAvailable) {
                  setFormData(prev => ({ 
                    ...prev, 
                    doctor_id: String(doctor.id),
                    selectedDoctor: doctor
                  }))
                }
              }}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isAvailable ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {isAvailable ? (
                    <User className="w-5 h-5 text-green-600" />
                  ) : (
                    <User className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{doctor.name}</h4>
                    {!isAvailable && hasSchedule && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">
                        Fully Booked
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{doctor.specialty}</p>
                  <p className="text-xs text-gray-500">
                    {hasSchedule 
                      ? (isAvailable ? 'Has availability' : 'No available hours')
                      : `Working Days: ${doctor.working_days?.join(', ') || 'Not specified'}`}
                  </p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Select Patient</h3>
      
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search by name or phone number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {searchingPatients && (
          <div className="absolute right-3 top-3">
            <Spinner size="sm" />
          </div>
        )}
      </div>

      {/* Search Results */}
      {searchQuery.length >= 2 && (
        <div className="max-h-60 overflow-y-auto space-y-2">
          {patients.map(patient => (
            <Card
              key={patient.id}
              className={`p-3 cursor-pointer transition-colors ${
                formData.patient_id === String(patient.id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => setFormData(prev => ({ 
                ...prev, 
                patient_id: String(patient.id),
                selectedPatient: patient
              }))}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-medium">{patient.name}</h4>
                  <p className="text-sm text-gray-600">{patient.phone}</p>
                </div>
                <div className="text-xs text-gray-500">
                  Age: {patient.age || 'N/A'}
                </div>
              </div>
            </Card>
          ))}
          {patients.length === 0 && !searchingPatients && (
            <p className="text-gray-500 text-center py-4">No patients found</p>
          )}
        </div>
      )}

      {/* Create New Patient Button */}
      <div className="pt-4 border-t">
        <Button
          variant="outline"
          onClick={() => setIsCreatingPatient(true)}
          className="w-full"
        >
          <User className="w-4 h-4 mr-2" />
          Create New Patient
        </Button>
      </div>

      {/* Create Patient Form */}
      {isCreatingPatient && (
        <Card className="p-4 space-y-4">
          <h4 className="font-medium">Create New Patient</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Full Name"
              value={newPatientData.name}
              onChange={(e) => setNewPatientData(prev => ({ ...prev, name: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="tel"
              placeholder="Phone Number"
              value={newPatientData.phone}
              onChange={(e) => setNewPatientData(prev => ({ ...prev, phone: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Address"
              value={newPatientData.address}
              onChange={(e) => setNewPatientData(prev => ({ ...prev, address: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex space-x-2">
              <input
                type="number"
                placeholder="Age"
                value={newPatientData.age}
                onChange={(e) => setNewPatientData(prev => ({ ...prev, age: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={newPatientData.gender}
                onChange={(e) => setNewPatientData(prev => ({ ...prev, gender: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={handleCreatePatient}
              disabled={!newPatientData.name || !newPatientData.phone || createPatientMutation.isPending}
              className="flex-1"
            >
              {createPatientMutation.isPending ? <Spinner size="sm" /> : 'Create Patient'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsCreatingPatient(false)}
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}
    </div>
  )

  const renderStep4 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Select Service & Time</h3>
      
      {/* Service Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Service</label>
        <select
          value={formData.service_id}
          onChange={(e) => {
            const serviceId = e.target.value;
            const selectedService = services.find(s => s.id === parseInt(serviceId));
            setFormData(prev => ({ 
              ...prev, 
              service_id: serviceId,
              selectedService: selectedService
            }));
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a service</option>
          {services.map(service => (
            <option key={service.id} value={service.id}>
              {service.name} - ${service.price} ({service.duration} min)
            </option>
          ))}
        </select>
      </div>

      {/* Date Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Date</label>
        <input
          type="date"
          value={selectedDate.toISOString().split('T')[0]}
          onChange={(e) => setSelectedDate(new Date(e.target.value))}
          min={new Date().toISOString().split('T')[0]}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Time Slots */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Available Time Slots</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
          {availableSlots.map((slot, index) => (
            <button
              key={index}
              onClick={() => setFormData(prev => ({ 
                ...prev, 
                start_time: `${selectedDate.toISOString().split('T')[0]}T${slot.start_time}:00` 
              }))}
              disabled={!slot.available}
              className={`p-3 text-sm rounded-lg border transition-colors ${
                formData.start_time === `${selectedDate.toISOString().split('T')[0]}T${slot.start_time}:00`
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : slot.available
                  ? 'border-gray-300 hover:bg-gray-50'
                  : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{slot.start_time}</span>
              </div>
              {!slot.available && slot.reason && (
                <div className="text-xs text-gray-500 mt-1">{slot.reason}</div>
              )}
            </button>
          ))}
        </div>
        {availableSlots.length === 0 && (
          <p className="text-gray-500 text-center py-4">No available slots for this date</p>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Any special notes for this appointment..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          rows={3}
        />
      </div>
    </div>
  )

  const renderStep5 = () => {
    const selectedPatient = formData.selectedPatient
    const selectedDoctor = formData.selectedDoctor
    const selectedService = formData.selectedService
    const selectedClinic = formData.selectedClinic

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Confirm Appointment</h3>
        
        <Card className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-700">Patient</h4>
              <p className="text-sm">{selectedPatient?.name || 'Not selected'}</p>
              <p className="text-xs text-gray-500">{selectedPatient?.phone}</p>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-700">Doctor</h4>
              <p className="text-sm">Dr. {selectedDoctor?.name || 'Not selected'}</p>
              <p className="text-xs text-gray-500">{selectedDoctor?.specialty}</p>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-700">Clinic</h4>
              <p className="text-sm">{selectedClinic?.name || 'Not selected'}</p>
              <p className="text-xs text-gray-500">Room {selectedClinic?.room_number}</p>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-700">Service</h4>
              <p className="text-sm">{selectedService?.name || 'Not selected'}</p>
              <p className="text-xs text-gray-500">${selectedService?.price} ({selectedService?.duration} min)</p>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-700">Date & Time</h4>
              <p className="text-sm">{formatDate(formData.start_time)}</p>
              <p className="text-xs text-gray-500">{formatTime(formData.start_time)}</p>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-700">Booking Source</h4>
              <p className="text-sm capitalize">{formData.booking_source}</p>
            </div>
          </div>
          
          {formData.notes && (
            <div>
              <h4 className="font-medium text-gray-700">Notes</h4>
              <p className="text-sm text-gray-600">{formData.notes}</p>
            </div>
          )}
        </Card>
      </div>
    )
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1: return renderStep1()
      case 2: return renderStep2()
      case 3: return renderStep3()
      case 4: return renderStep4()
      case 5: return renderStep5()
      default: return null
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">New Appointment Booking</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3, 4, 5].map(step => (
              <div
                key={step}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Clinic</span>
            <span>Doctor</span>
            <span>Patient</span>
            <span>Service & Time</span>
            <span>Confirm</span>
          </div>
        </div>

        {/* Step Content */}
        <div className="mb-6">
          {renderStep()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          {currentStep === 5 ? (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || createAppointmentMutation.isPending}
            >
              {createAppointmentMutation.isPending ? (
                <Spinner size="sm" />
              ) : (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  Confirm Booking
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
            >
              Next {!canProceed() && `(disabled - clinic_id: ${formData.clinic_id})`}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}

export default BookingWizard
