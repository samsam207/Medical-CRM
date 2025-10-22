import api from './client'

export const visitsApi = {
  // Check in patient
  checkInPatient: async (appointmentId) => {
    const response = await api.post('/visits/check-in', { appointment_id: appointmentId })
    return response.data
  },

  // Create walk-in visit
  createWalkInVisit: async (data) => {
    const response = await api.post('/visits/walk-in', data)
    return response.data
  },

  // Get queue
  getQueue: async (params) => {
    const response = await api.get('/visits/queue', { params })
    return response.data
  },

  // Get visit details
  getVisit: async (id) => {
    const response = await api.get(`/visits/${id}`)
    return response.data
  },

  // Update visit status
  updateVisitStatus: async (id, status) => {
    const response = await api.put(`/visits/${id}/status`, { status })
    return response.data
  },

  // Call patient
  callPatient: async (id) => {
    const response = await api.post(`/visits/${id}/call`)
    return response.data
  }
}
