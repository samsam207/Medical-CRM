import api from './client'

export const appointmentsApi = {
  // Get appointments with filters
  getAppointments: async (params = {}) => {
    const response = await api.get('/appointments', { params })
    return response.data
  },

  // Get specific appointment
  getAppointment: async (id) => {
    const response = await api.get(`/appointments/${id}`)
    return response.data
  },

  // Create new appointment
  createAppointment: async (data) => {
    const response = await api.post('/appointments', data)
    return response.data
  },

  // Update appointment
  updateAppointment: async (id, data) => {
    const response = await api.put(`/appointments/${id}`, data)
    return response.data
  },

  // Cancel appointment
  cancelAppointment: async (id) => {
    const response = await api.delete(`/appointments/${id}`)
    return response.data
  },

  // Get available time slots
  getAvailableSlots: async (params) => {
    const response = await api.get('/appointments/available-slots', { params })
    return response.data
  }
}
