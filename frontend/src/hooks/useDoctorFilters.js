import { useAuthStore } from '../stores/authStore'
import { useQueueStore } from '../stores/queueStore'
import { useEffect } from 'react'

/**
 * Custom hook for doctor filtering logic
 * Provides doctor_id and clinic_id from auth store
 * Auto-sets clinic in queue store when doctor is logged in
 */
export const useDoctorFilters = () => {
  const { user, getDoctorId, getClinicId, isDoctor } = useAuthStore()
  const { selectedClinic, setSelectedClinic } = useQueueStore()
  
  const doctorId = getDoctorId()
  const clinicId = getClinicId()
  const isDoctorUser = isDoctor()
  
  // Auto-set clinic in queue store when doctor is logged in
  // Only set if not already set to prevent infinite loops
  useEffect(() => {
    if (isDoctorUser && clinicId && selectedClinic !== clinicId) {
      // Only update if different to prevent infinite loops
      setSelectedClinic(clinicId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDoctorUser, clinicId, selectedClinic])
  
  /**
   * Get filter params for API calls
   * @returns {Object} Object with doctor_id and clinic_id if user is doctor
   */
  const getFilterParams = () => {
    if (!isDoctorUser) {
      return {}
    }
    
    const params = {}
    if (doctorId) {
      params.doctor_id = doctorId
    }
    if (clinicId) {
      params.clinic_id = clinicId
    }
    return params
  }
  
  /**
   * Add filters to an existing params object
   * @param {Object} params - Existing params object
   * @returns {Object} Params with doctor/clinic filters added if user is doctor
   */
  const addFilters = (params = {}) => {
    if (!isDoctorUser) {
      return params
    }
    
    const filters = getFilterParams()
    return { ...params, ...filters }
  }
  
  return {
    doctorId,
    clinicId,
    isDoctor: isDoctorUser,
    getFilterParams,
    addFilters
  }
}

