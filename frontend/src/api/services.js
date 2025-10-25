import { apiClient } from './client'

export const servicesApi = {
  // Get all services
  getServices: async () => {
    const response = await apiClient.get('/services')
    return response.data
  },

  // Get service by ID
  getService: async (id) => {
    const response = await apiClient.get(`/services/${id}`)
    return response.data
  },

  // Create service
  createService: async (data) => {
    const response = await apiClient.post('/services', data)
    return response.data
  },

  // Update service
  updateService: async (id, data) => {
    const response = await apiClient.put(`/services/${id}`, data)
    return response.data
  },

  // Delete service
  deleteService: async (id) => {
    const response = await apiClient.delete(`/services/${id}`)
    return response.data
  }
}
