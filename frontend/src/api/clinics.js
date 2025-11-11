import api from './client'

export const clinicsApi = {
  // Get all clinics
  getClinics: async (params = {}) => {
    const response = await api.get('/clinics', { params })
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
  getClinicDoctors: async (clinicId, params = {}) => {
    const response = await api.get(`/clinics/${clinicId}/doctors`, { params })
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
  },

  // Update service for clinic (admin only)
  updateService: async (clinicId, serviceId, data) => {
    const response = await api.put(`/clinics/${clinicId}/services/${serviceId}`, data)
    return response.data
  },

  // Delete service from clinic (admin only)
  deleteService: async (clinicId, serviceId) => {
    const response = await api.delete(`/clinics/${clinicId}/services/${serviceId}`)
    return response.data
  },

  // Delete clinic (admin only)
  deleteClinic: async (id) => {
    const response = await api.delete(`/clinics/${id}`)
    return response.data
  },

  // Activate clinic (admin only)
  activateClinic: async (id) => {
    const response = await api.post(`/clinics/${id}/activate`)
    return response.data
  },

  // Deactivate clinic (admin only)
  deactivateClinic: async (id) => {
    const response = await api.post(`/clinics/${id}/deactivate`)
    return response.data
  },

  // Get clinic statistics
  getStatistics: async (params = {}) => {
    const response = await api.get('/clinics/statistics', { params })
    return response.data
  }
}
