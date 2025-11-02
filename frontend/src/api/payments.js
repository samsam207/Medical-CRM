import api from './client'

export const paymentsApi = {
  // Get payments with filters
  getPayments: async (params = {}) => {
    const response = await api.get('/payments', { params })
    return response.data
  },

  // Get specific payment
  getPayment: async (id) => {
    const response = await api.get(`/payments/${id}`)
    return response.data
  },

  // Process payment
  processPayment: async (data) => {
    const response = await api.post('/payments', data)
    return response.data
  },

  // Process existing payment
  processExistingPayment: async (id, data) => {
    const response = await api.put(`/payments/${id}/process`, data)
    return response.data
  },

  // Export payments to Excel
  exportPayments: async (params = {}) => {
    const response = await api.get('/payments/export', { 
      params,
      responseType: 'blob' // Important for file downloads
    })
    return response
  },

  // Get invoice
  getInvoice: async (visitId) => {
    const response = await api.get(`/payments/invoice/${visitId}`)
    return response.data
  },

  // Refund payment
  refundPayment: async (id) => {
    const response = await api.post(`/payments/refund/${id}`)
    return response.data
  },

  // Get payment statistics
  getStatistics: async () => {
    const response = await api.get('/payments/statistics')
    return response.data
  }
}
