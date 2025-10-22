import api from './client'

export const clinicsApi = {
  // Get all clinics
  getClinics: async () => {
    const response = await api.get('/clinics')
    return response.data
  },

  // Get specific clinic
  getClinic: async (id) => {
    const response = await api.get(`/clinics/${id}`)
    return response.data
  },

  // Get services for a clinic
  getClinicServices: async (clinicId) => {
    const response = await api.get(`/clinics/${clinicId}/services`)
    return response.data
  },

  // Get doctors for a clinic
  getClinicDoctors: async (clinicId) => {
    const response = await api.get(`/clinics/${clinicId}/doctors`)
    return response.data
  },

  // Create new clinic (admin only)
  createClinic: async (data) => {
    const response = await api.post('/clinics', data)
    return response.data
  },

  // Update clinic (admin only)
  updateClinic: async (id, data) => {
    const response = await api.put(`/clinics/${id}`, data)
    return response.data
  },

  // Create new service for clinic (admin only)
  createService: async (clinicId, data) => {
    const response = await api.post(`/clinics/${clinicId}/services`, data)
    return response.data
  }
}
