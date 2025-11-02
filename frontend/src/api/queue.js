import { apiClient } from './client'

export const queueApi = {
  // Get queue for a specific clinic with optional date range
  getClinicQueue: async (clinicId, startDate = null, endDate = null) => {
    const params = {}
    if (startDate) params.start_date = startDate
    if (endDate) params.end_date = endDate
    
    const response = await apiClient.get(`/queue/clinic/${clinicId}`, { params })
    return response.data
  },

  // Get queue for a specific doctor with optional date range
  getDoctorQueue: async (doctorId, startDate = null, endDate = null) => {
    const params = {}
    if (startDate) params.start_date = startDate
    if (endDate) params.end_date = endDate
    
    const response = await apiClient.get(`/queue/doctor/${doctorId}`, { params })
    return response.data
  },

  // Get upcoming appointments (not checked in yet)
  getUpcomingAppointments: async (date, clinicId = null) => {
    const params = { date }
    if (clinicId) params.clinic_id = clinicId
    
    const response = await apiClient.get('/queue/upcoming', { params })
    return response.data
  },

  // Get all appointments for a date (including checked-in ones)
  getAllAppointmentsForDate: async (date, clinicId = null) => {
    const params = { date }
    if (clinicId) params.clinic_id = clinicId
    
    const response = await apiClient.get('/queue/appointments', { params })
    return response.data
  },

  // Get queue organized by phases
  getQueuePhases: async (clinicId, date, doctorId = null) => {
    const params = { date }
    if (doctorId) params.doctor_id = doctorId
    
    const response = await apiClient.get(`/queue/phases/${clinicId}`, { params })
    return response.data
  },

  // Move patient between phases
  movePatientPhase: async (visitId, fromPhase, toPhase, appointmentId = null) => {
    const payload = {
      from_phase: fromPhase,
      to_phase: toPhase
    }
    if (visitId) {
      payload.visit_id = visitId
    }
    if (appointmentId) {
      payload.appointment_id = appointmentId
    }
    const response = await apiClient.post('/queue/phases/move', payload)
    return response.data
  },

  // Get queue statistics
  getQueueStatistics: async (clinicId, date = null) => {
    const params = {}
    if (date) params.date = date
    
    const response = await apiClient.get(`/queue/statistics/${clinicId}`, { params })
    return response.data
  },

  // Check in a patient
  checkinPatient: async (appointmentId) => {
    const response = await apiClient.post('/queue/checkin', {
      appointment_id: appointmentId
    })
    return response.data
  },

  // Call a patient
  callPatient: async (visitId) => {
    const response = await apiClient.post('/queue/call', {
      visit_id: visitId
    })
    return response.data
  },

  // Start consultation
  startConsultation: async (visitId) => {
    const response = await apiClient.post('/queue/start', {
      visit_id: visitId
    })
    return response.data
  },

  // Complete consultation
  completeConsultation: async (visitId, notes = '') => {
    const response = await apiClient.post('/queue/complete', {
      visit_id: visitId,
      notes: notes
    })
    return response.data
  },

  // Skip patient
  skipPatient: async (visitId, reason = 'No show') => {
    const response = await apiClient.post('/queue/skip', {
      visit_id: visitId,
      reason: reason
    })
    return response.data
  },

  // Reorder queue
  reorderQueue: async (visitId, newPosition) => {
    const response = await apiClient.put('/queue/reorder', {
      visit_id: visitId,
      new_position: newPosition
    })
    return response.data
  },

  // Create walk-in visit
  createWalkIn: async (data) => {
    const response = await apiClient.post('/queue/walkin', data)
    return response.data
  },

  // Cancel visit
  cancelVisit: async (visitId, reason = 'Cancelled by receptionist') => {
    const response = await apiClient.post('/queue/cancel', {
      visit_id: visitId,
      reason: reason
    })
    return response.data
  }
}
