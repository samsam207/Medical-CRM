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
            role: (user?.role || '').toString().toLowerCase(),
            // Include doctor_id and clinic_id if present (for doctors)
            doctor_id: user?.doctor_id || null,
            clinic_id: user?.clinic_id || null
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

      // Fetch current user info (useful for refreshing doctor/clinic info)
      fetchCurrentUser: async () => {
        try {
          const response = await api.get('/auth/me')
          const { user } = response.data
          // Normalize role to lowercase for consistent frontend checks
          const normalizedUser = {
            ...user,
            role: (user?.role || '').toString().toLowerCase(),
            // Include doctor_id and clinic_id if present (for doctors)
            doctor_id: user?.doctor_id || null,
            clinic_id: user?.clinic_id || null
          }
          
          set({ user: normalizedUser })
          return normalizedUser
        } catch (error) {
          console.error('Failed to fetch current user:', error)
          return null
        }
      },

      // Helper methods for doctor info
      getDoctorId: () => {
        const { user } = get()
        return user?.doctor_id || null
      },

      getClinicId: () => {
        const { user } = get()
        return user?.clinic_id || null
      },

      isDoctor: () => {
        const { user } = get()
        return user?.role === 'doctor'
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
      initializeAuth: async () => {
        const { token, user } = get()
        if (token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`
          // Ensure persisted user role stays normalized
          const normalizedUser = user
            ? { 
                ...user, 
                role: (user.role || '').toString().toLowerCase(),
                // Include doctor_id and clinic_id if present
                doctor_id: user?.doctor_id || null,
                clinic_id: user?.clinic_id || null
              }
            : null
          set({ isAuthenticated: true, user: normalizedUser })
          
          // Fetch fresh user data to ensure doctor/clinic info is up to date
          if (normalizedUser) {
            await get().fetchCurrentUser()
          }
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
