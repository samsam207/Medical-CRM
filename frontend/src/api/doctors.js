import api from './client'

export const doctorsApi = {
  // Get all doctors
  getDoctors: async (params = {}) => {
    const response = await api.get('/doctors', { params })
    return response.data
  },

  // Get single doctor
  getDoctor: async (id) => {
    const response = await api.get(`/doctors/${id}`)
    return response.data
  },

  // Create doctor
  createDoctor: async (data) => {
    const response = await api.post('/doctors', data)
    return response.data
  },

  // Update doctor
  updateDoctor: async (id, data) => {
    const response = await api.put(`/doctors/${id}`, data)
    return response.data
  },

  // Delete doctor
  deleteDoctor: async (id) => {
    const response = await api.delete(`/doctors/${id}`)
    return response.data
  },

  // Get doctor schedule
  getDoctorSchedule: async (id, date) => {
    const response = await api.get(`/doctors/${id}/schedule`, {
      params: { date }
    })
    return response.data
  },

  // Update doctor schedule
  updateSchedule: async (id, scheduleData) => {
    const response = await api.post(`/doctors/${id}/schedule`, {
      schedule: scheduleData
    })
    return response.data
  },

  // Get doctor statistics
  getStatistics: async (params = {}) => {
    const response = await api.get('/doctors/statistics', { params })
    return response.data
  }
}
