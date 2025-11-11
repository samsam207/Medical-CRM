import api from './client'

const usersApi = {
  getUsers: async (role = null) => {
    const params = role ? { role } : {}
    const response = await api.get('/auth/users', { params })
    return response.data
  },

  getUser: async (id) => {
    const response = await api.get(`/auth/users/${id}`)
    return response.data
  },

  createUser: async (data) => {
    const response = await api.post('/auth/users', data)
    return response.data
  },

  updateUser: async (id, data) => {
    const response = await api.put(`/auth/users/${id}`, data)
    return response.data
  },

  deleteUser: async (id) => {
    const response = await api.delete(`/auth/users/${id}`)
    return response.data
  },

  linkUserToDoctor: async (userId, doctorId) => {
    const response = await api.post(`/auth/users/${userId}/link-doctor`, { doctor_id: doctorId })
    return response.data
  },

  unlinkUserFromDoctor: async (userId) => {
    const response = await api.post(`/auth/users/${userId}/unlink-doctor`)
    return response.data
  }
}

export { usersApi }
export default usersApi

