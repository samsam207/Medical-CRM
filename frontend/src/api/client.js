import axios from 'axios'

// Create axios instance
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Flag to prevent multiple refresh attempts
let isRefreshing = false
let failedQueue = []

// Process failed requests after token refresh
const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  
  failedQueue = []
}

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth-storage')
    if (token) {
      try {
        const authData = JSON.parse(token)
        if (authData.state?.token) {
          config.headers.Authorization = `Bearer ${authData.state.token}`
        }
      } catch (error) {
        console.error('Error parsing auth token:', error)
        // Clear invalid token
        localStorage.removeItem('auth-storage')
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        }).catch(err => {
          return Promise.reject(err)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // Get refresh token from localStorage
        const authData = JSON.parse(localStorage.getItem('auth-storage') || '{}')
        const refreshToken = authData.state?.refresh_token
        
        if (!refreshToken) {
          throw new Error('No refresh token available')
        }

        // Create a new axios instance for refresh to avoid interceptors
        const refreshApi = axios.create({
          baseURL: '/api',
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
          },
        })

        // Call refresh endpoint with refresh token
        const response = await refreshApi.post('/auth/refresh', {}, {
          headers: {
            'Authorization': `Bearer ${refreshToken}`
          }
        })

        const { access_token } = response.data
        
        // Update stored token
        const updatedAuthData = {
          ...authData,
          state: {
            ...authData.state,
            token: access_token
          }
        }
        localStorage.setItem('auth-storage', JSON.stringify(updatedAuthData))
        
        // Update default headers
        api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
        
        // Process queued requests
        processQueue(null, access_token)
        
        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${access_token}`
        return api(originalRequest)
        
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError)
        processQueue(refreshError, null)
        
        // Refresh failed, clear auth and redirect to login
        localStorage.removeItem('auth-storage')
        delete api.defaults.headers.common['Authorization']
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }
    
    // Log error for debugging
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      data: error.response?.data
    })
    
    return Promise.reject(error)
  }
)

export default api
export { api as apiClient }
