import api from './client'

export const reportsApi = {
  // Get revenue report
  getRevenueReport: async (params = {}) => {
    const response = await api.get('/reports/revenue', { params })
    return response.data
  },

  // Get visits report
  getVisitsReport: async (params = {}) => {
    const response = await api.get('/reports/visits', { params })
    return response.data
  },

  // Get doctor shares report
  getDoctorSharesReport: async (params = {}) => {
    const response = await api.get('/reports/doctor-shares', { params })
    return response.data
  },

  // Export report
  exportReport: async (params = {}) => {
    const response = await api.get('/reports/export', { 
      params,
      responseType: 'blob' // Important for file downloads
    })
    return response
  }
}
