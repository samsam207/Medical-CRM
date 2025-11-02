import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

/**
 * Custom hook that wraps React Query's useMutation with automatic refetch and toast notifications
 * 
 * @param {Function} mutationFn - The mutation function to call
 * @param {Array<Array>} queryKeys - Array of query keys to invalidate/refetch (e.g., [['patients'], ['dashboard-stats']])
 * @param {string} onSuccessMessage - Toast message to show on success
 * @param {string} onErrorMessage - Toast message to show on error (fallback if backend doesn't provide message)
 * @param {Function} onSuccessCallback - Additional success handler (async supported)
 * @param {Function} onErrorCallback - Additional error handler (async supported)
 * @returns {Object} React Query mutation object with toast state and dismiss function
 */
export const useMutationWithRefetch = ({
  mutationFn,
  queryKeys = [],
  onSuccessMessage,
  onErrorMessage,
  onSuccessCallback,
  onErrorCallback
}) => {
  const queryClient = useQueryClient()
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 5000)
  }

  const dismissToast = () => {
    setToast({ show: false, message: '', type: 'success' })
  }

  const mutation = useMutation({
    mutationFn,
    onSuccess: async (data, variables, context) => {
      // Invalidate and refetch all specified query keys
      for (const key of queryKeys) {
        await queryClient.invalidateQueries({ queryKey: key, exact: false })
        // Refetch with exact match to ensure we get fresh data
        await queryClient.refetchQueries({ queryKey: key, exact: true })
        // Also refetch without exact match to catch all related queries
        await queryClient.refetchQueries({ queryKey: key, exact: false })
      }
      
      // Show success toast
      if (onSuccessMessage) {
        showToast(onSuccessMessage, 'success')
      }
      
      // Run custom success callback
      if (onSuccessCallback) {
        await onSuccessCallback(data, variables, context)
      }
    },
    onError: async (error, variables, context) => {
      // Extract error message from backend response or use fallback
      const message = error?.response?.data?.message || onErrorMessage || 'An error occurred'
      showToast(message, 'error')
      
      // Run custom error callback
      if (onErrorCallback) {
        await onErrorCallback(error, variables, context)
      }
    }
  })

  return {
    ...mutation,
    toast,
    dismissToast
  }
}

