import api from './client'

export const dashboardApi = {
  // Get dashboard stats
  getStats: async () => {
    const response = await api.get('/dashboard/stats')
    return response.data
  },

  // Get notifications
  getNotifications: async () => {
    const response = await api.get('/dashboard/notifications')
    return response.data
  }
}
