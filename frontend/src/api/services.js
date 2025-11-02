import api from './client'

export const servicesApi = {
  // Get all services
  getServices: async (params = {}) => {
    const response = await api.get('/services', { params })
    return response.data
  },

  // Get service by ID
  getService: async (id) => {
    const response = await api.get(`/services/${id}`)
    return response.data
  },

  // Create service
  createService: async (data) => {
    const response = await api.post('/services', data)
    return response.data
  },

  // Update service
  updateService: async (id, data) => {
    const response = await api.put(`/services/${id}`, data)
    return response.data
  },

  // Delete service
  deleteService: async (id) => {
    const response = await api.delete(`/services/${id}`)
    return response.data
  }
}
