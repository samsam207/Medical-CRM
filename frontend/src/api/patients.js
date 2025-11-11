import api from './client'

export const patientsApi = {
  // Get patients with search
  getPatients: async (params = {}) => {
    const response = await api.get('/patients', { params })
    return response.data
  },

  // Get specific patient
  getPatient: async (id) => {
    const response = await api.get(`/patients/${id}`)
    return response.data
  },

  // Create new patient
  createPatient: async (data) => {
    const response = await api.post('/patients', data)
    return response.data
  },

  // Update patient
  updatePatient: async (id, data) => {
    const response = await api.put(`/patients/${id}`, data)
    return response.data
  },

  // Delete patient
  deletePatient: async (id) => {
    const response = await api.delete(`/patients/${id}`)
    return response.data
  },

  // Search patients
  searchPatients: async (query) => {
    const response = await api.get('/patients/search', { params: { q: query } })
    return response.data
  },

  // Export patients to CSV
  exportPatients: async (params = {}) => {
    const response = await api.get('/patients/export', { 
      params,
      responseType: 'blob'
    })
    return response.data
  },

  // Get patient statistics
  getStatistics: async (params = {}) => {
    const response = await api.get('/patients/statistics', { params })
    return response.data
  }
}
