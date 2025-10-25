import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../api/client'

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (credentials) => {
        set({ isLoading: true, error: null })
        try {
          const response = await api.post('/auth/login', credentials)
          const { access_token, refresh_token, user } = response.data
          // Normalize role to lowercase for consistent frontend checks
          const normalizedUser = {
            ...user,
            role: (user?.role || '').toString().toLowerCase()
          }
          
          // Set token in API client
          api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
          
          set({
            user: normalizedUser,
            token: access_token,
            refreshToken: refresh_token,
            isAuthenticated: true,
            isLoading: false,
            error: null
          })
          
          return { success: true }
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Login failed'
          set({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage
          })
          return { success: false, error: errorMessage }
        }
      },

      logout: async () => {
        try {
          // Call logout endpoint to blacklist token
          await api.post('/auth/logout')
        } catch (error) {
          console.error('Logout error:', error)
        } finally {
          // Clear token from API client
          delete api.defaults.headers.common['Authorization']
          
          set({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          })
        }
      },

      refreshToken: async () => {
        try {
          const { refreshToken } = get()
          if (!refreshToken) {
            throw new Error('No refresh token available')
          }

          const response = await api.post('/auth/refresh', {}, {
            headers: {
              'Authorization': `Bearer ${refreshToken}`
            }
          })
          const { access_token } = response.data
          
          // Update token in API client
          api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
          
          set({ token: access_token })
          return true
        } catch (error) {
          console.error('Token refresh failed:', error)
          // Refresh failed, logout user
          get().logout()
          return false
        }
      },

      clearError: () => set({ error: null }),

      // Initialize auth state from stored token
      initializeAuth: () => {
        const { token, user } = get()
        if (token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`
          // Ensure persisted user role stays normalized
          const normalizedUser = user
            ? { ...user, role: (user.role || '').toString().toLowerCase() }
            : null
          set({ isAuthenticated: true, user: normalizedUser })
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)

export { useAuthStore }
