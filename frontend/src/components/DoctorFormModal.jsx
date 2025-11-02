import React, { useState, useEffect } from 'react'
import Modal from './common/Modal'
import Button from './common/Button'
import ScheduleGrid from './ScheduleGrid'
import { clinicsApi } from '../api'
import api from '../api/client'
import { useQuery } from '@tanstack/react-query'

const DoctorFormModal = ({ isOpen, onClose, onSave, doctor = null, clinics = [] }) => {
  const [formData, setFormData] = useState({
    name: '',
    specialty: '',
    clinic_id: '',
    share_percentage: 0.7,
    schedule: {},
    user_id: '',
    create_user: false,
    new_username: '',
    new_password: ''
  })
  const [errors, setErrors] = useState({})
  
  // Fetch available doctor users (users with DOCTOR role that don't have a doctor record)
  const { data: availableUsersData } = useQuery({
    queryKey: ['available-doctor-users'],
    queryFn: async () => {
      const response = await api.get('/auth/users/available-doctors')
      return response.data
    },
    enabled: isOpen && !doctor, // Only fetch when modal is open and creating new doctor
    staleTime: 60000 // Cache for 1 minute
  })
  
  const availableUsers = availableUsersData?.users || []

  useEffect(() => {
    if (doctor) {
      setFormData({
        name: doctor.name || '',
        specialty: doctor.specialty || '',
        clinic_id: doctor.clinic_id ? String(doctor.clinic_id) : '',
        share_percentage: doctor.share_percentage || 0.7,
        schedule: convertScheduleToGrid(doctor.schedule),
        user_id: doctor.user_id ? String(doctor.user_id) : '',
        create_user: false,
        new_username: '',
        new_password: ''
      })
    } else {
      setFormData({
        name: '',
        specialty: '',
        clinic_id: '',
        share_percentage: 0.7,
        schedule: {},
        user_id: '',
        create_user: false,
        new_username: '',
        new_password: ''
      })
    }
    setErrors({})
  }, [doctor, isOpen])

  const convertScheduleToGrid = (scheduleArray) => {
    if (!scheduleArray || !Array.isArray(scheduleArray)) return {}
    
    const grid = {}
    scheduleArray.forEach(item => {
      if (!grid[item.day_of_week]) {
        grid[item.day_of_week] = {}
      }
      grid[item.day_of_week][item.hour] = item.is_available
    })
    return grid
  }

  const convertGridToSchedule = (grid) => {
    const schedule = []
    for (const day in grid) {
      for (const hour in grid[day]) {
        if (grid[day][hour]) {
          schedule.push({
            day_of_week: parseInt(day),
            hour: parseInt(hour),
            is_available: true
          })
        }
      }
    }
    return schedule
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'share_percentage' ? parseFloat(value) : value
    }))
  }

  const handleScheduleChange = (newSchedule) => {
    setFormData(prev => ({
      ...prev,
      schedule: newSchedule
    }))
  }

  const validate = () => {
    const newErrors = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Doctor name is required'
    }
    
    if (!formData.specialty.trim()) {
      newErrors.specialty = 'Specialty is required'
    }
    
    if (!formData.clinic_id) {
      newErrors.clinic_id = 'Clinic is required'
    }
    
    // Validate user connection
    if (!doctor) { // Only validate when creating new doctor
      if (!formData.create_user && !formData.user_id) {
        newErrors.user_id = 'Please select a user account or create a new one'
      }
      if (formData.create_user) {
        if (!formData.new_username.trim()) {
          newErrors.new_username = 'Username is required'
        }
        if (!formData.new_password || formData.new_password.length < 6) {
          newErrors.new_password = 'Password must be at least 6 characters'
        }
      }
    }

    if (Object.keys(formData.schedule).length === 0) {
      newErrors.schedule = 'At least one time slot must be selected'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validate()) {
      return
    }

    // Convert schedule grid to array format
    const scheduleArray = convertGridToSchedule(formData.schedule)
    
    // Ensure schedule array is not empty (validation should catch this, but double-check)
    if (scheduleArray.length === 0) {
      setErrors({ schedule: 'At least one time slot must be selected' })
      return
    }
    
    // Ensure clinic_id is a valid number
    const clinicId = formData.clinic_id ? parseInt(formData.clinic_id) : null
    if (!clinicId || isNaN(clinicId)) {
      setErrors({ clinic_id: 'Please select a valid clinic' })
      return
    }
    
    // Handle user creation/linking
    let userId = null
    
    // Handle user creation/linking for new doctors only
    if (!doctor) {
      if (formData.create_user) {
        // Create new user account
        try {
          const userResponse = await api.post('/auth/users', {
            username: formData.new_username.trim(),
            password: formData.new_password,
            role: 'DOCTOR'
          })
          userId = userResponse.data.user.id
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Failed to create user account'
          setErrors({ new_username: errorMessage })
          return
        }
      } else if (formData.user_id) {
        // Use existing user
        userId = parseInt(formData.user_id)
      }
    } else if (doctor.user_id) {
      // Keep existing user_id when editing (admin can change via backend)
      userId = doctor.user_id
    }
    
    const dataToSave = {
      name: formData.name.trim(),
      specialty: formData.specialty.trim(),
      clinic_id: clinicId,
      share_percentage: parseFloat(formData.share_percentage) || 0.7,
      schedule: scheduleArray,
      // Keep legacy fields for backward compatibility (required by backend validation)
      working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      working_hours: { start: '09:00', 'end': '17:00' }
    }
    
    // Only include user_id if we have one (for new doctors)
    if (userId) {
      dataToSave.user_id = userId
    }

    onSave(dataToSave)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={doctor ? 'Edit Doctor' : 'Add New Doctor'}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="p-6">
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Doctor Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full border rounded px-3 py-2 ${
                  errors.name ? 'border-red-500' : ''
                }`}
                placeholder="e.g., Dr. Ahmed"
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Specialty *
              </label>
              <input
                type="text"
                name="specialty"
                value={formData.specialty}
                onChange={handleChange}
                className={`w-full border rounded px-3 py-2 ${
                  errors.specialty ? 'border-red-500' : ''
                }`}
                placeholder="e.g., Cardiology"
              />
              {errors.specialty && (
                <p className="text-red-500 text-sm mt-1">{errors.specialty}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Clinic *
              </label>
              <select
                name="clinic_id"
                value={formData.clinic_id}
                onChange={handleChange}
                className={`w-full border rounded px-3 py-2 ${
                  errors.clinic_id ? 'border-red-500' : ''
                }`}
              >
                <option value="">Select a clinic</option>
                {clinics.map(clinic => (
                  <option key={clinic.id} value={clinic.id}>
                    {clinic.name} - Room {clinic.room_number}
                  </option>
                ))}
              </select>
              {errors.clinic_id && (
                <p className="text-red-500 text-sm mt-1">{errors.clinic_id}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Share Percentage
              </label>
              <input
                type="number"
                name="share_percentage"
                value={formData.share_percentage}
                onChange={handleChange}
                min="0"
                max="1"
                step="0.01"
                className="w-full border rounded px-3 py-2"
                placeholder="0.70"
              />
              <p className="text-xs text-gray-500 mt-1">
                Doctor's percentage (e.g., 0.7 = 70%)
              </p>
            </div>
          </div>
          
          {/* User Account Connection - Only show when creating new doctor */}
          {!doctor && (
            <div className="border-t pt-4 mt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                User Account Connection *
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Link this doctor to a user account so they can log in. You can select an existing doctor user or create a new one.
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="user_option"
                      checked={!formData.create_user}
                      onChange={() => setFormData(prev => ({ ...prev, create_user: false }))}
                      className="mr-2"
                    />
                    <span className="text-sm">Select existing user</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="user_option"
                      checked={formData.create_user}
                      onChange={() => setFormData(prev => ({ ...prev, create_user: true, user_id: '' }))}
                      className="mr-2"
                    />
                    <span className="text-sm">Create new user</span>
                  </label>
                </div>
                
                {!formData.create_user ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Available Doctor Users
                    </label>
                    <select
                      name="user_id"
                      value={formData.user_id}
                      onChange={handleChange}
                      className={`w-full border rounded px-3 py-2 ${
                        errors.user_id ? 'border-red-500' : ''
                      }`}
                    >
                      <option value="">-- Select a user account --</option>
                      {availableUsers.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.username} (ID: {user.id})
                        </option>
                      ))}
                    </select>
                    {availableUsers.length === 0 && (
                      <p className="text-xs text-amber-600 mt-1">
                        No available doctor users found. All doctor users are already linked to doctors. You can create a new user account.
                      </p>
                    )}
                    {errors.user_id && (
                      <p className="text-red-500 text-sm mt-1">{errors.user_id}</p>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Username *
                      </label>
                      <input
                        type="text"
                        name="new_username"
                        value={formData.new_username}
                        onChange={handleChange}
                        className={`w-full border rounded px-3 py-2 ${
                          errors.new_username ? 'border-red-500' : ''
                        }`}
                        placeholder="e.g., dr_ahmed"
                      />
                      {errors.new_username && (
                        <p className="text-red-500 text-sm mt-1">{errors.new_username}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password *
                      </label>
                      <input
                        type="password"
                        name="new_password"
                        value={formData.new_password}
                        onChange={handleChange}
                        className={`w-full border rounded px-3 py-2 ${
                          errors.new_password ? 'border-red-500' : ''
                        }`}
                        placeholder="At least 6 characters"
                      />
                      {errors.new_password && (
                        <p className="text-red-500 text-sm mt-1">{errors.new_password}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Show current user when editing */}
          {doctor && doctor.user_id && (
            <div className="border-t pt-4 mt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Linked User Account
              </label>
              <div className="px-3 py-2 bg-gray-50 rounded border">
                <p className="text-sm text-gray-700">
                  User ID: {doctor.user_id}
                  {doctor.user?.username && ` (${doctor.user.username})`}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Note: User account link cannot be changed from this form. Contact admin to modify.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Availability Schedule *
          </label>
          {errors.schedule && (
            <p className="text-red-500 text-sm mb-2">{errors.schedule}</p>
          )}
          <ScheduleGrid
            scheduleData={formData.schedule}
            editable={true}
            onChange={handleScheduleChange}
          />
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
            {doctor ? 'Update' : 'Create'} Doctor
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default DoctorFormModal
