import { apiClient } from './client'

export const doctorsApi = {
  // Get all doctors
  getDoctors: async () => {
    const response = await apiClient.get('/doctors')
    return response.data
  },

  // Get doctor by ID
  getDoctor: async (id) => {
    const response = await apiClient.get(`/doctors/${id}`)
    return response.data
  },

  // Create doctor
  createDoctor: async (data) => {
    const response = await apiClient.post('/doctors', data)
    return response.data
  },

  // Update doctor
  updateDoctor: async (id, data) => {
    const response = await apiClient.put(`/doctors/${id}`, data)
    return response.data
  },

  // Delete doctor
  deleteDoctor: async (id) => {
    const response = await apiClient.delete(`/doctors/${id}`)
    return response.data
  }
}
