import { apiClient } from './client'

export const queueApi = {
  // Get queue for a specific clinic
  getClinicQueue: async (clinicId) => {
    const response = await apiClient.get(`/queue/clinic/${clinicId}`)
    return response.data
  },

  // Get queue for a specific doctor
  getDoctorQueue: async (doctorId) => {
    const response = await apiClient.get(`/queue/doctor/${doctorId}`)
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
  }
}
