import React, { useState, useEffect } from 'react'
import Modal from './common/Modal'
import Button from './common/Button'
import ScheduleGrid from './ScheduleGrid'
import { clinicsApi } from '../api'
import { useQuery } from '@tanstack/react-query'

const DoctorFormModal = ({ isOpen, onClose, onSave, doctor = null, clinics = [] }) => {
  const [formData, setFormData] = useState({
    name: '',
    specialty: '',
    clinic_id: '',
    share_percentage: 0.7,
    schedule: {}
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (doctor) {
      setFormData({
        name: doctor.name || '',
        specialty: doctor.specialty || '',
        clinic_id: doctor.clinic_id ? String(doctor.clinic_id) : '',
        share_percentage: doctor.share_percentage || 0.7,
        schedule: convertScheduleToGrid(doctor.schedule)
      })
    } else {
      setFormData({
        name: '',
        specialty: '',
        clinic_id: '',
        share_percentage: 0.7,
        schedule: {}
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

    if (Object.keys(formData.schedule).length === 0) {
      newErrors.schedule = 'At least one time slot must be selected'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
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
    
    const dataToSave = {
      name: formData.name.trim(),
      specialty: formData.specialty.trim(),
      clinic_id: parseInt(formData.clinic_id),
      share_percentage: parseFloat(formData.share_percentage) || 0.7,
      schedule: scheduleArray,
      // Keep legacy fields for backward compatibility (required by backend validation)
      working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      working_hours: { start: '09:00', end: '17:00' }
    }

    console.log('Submitting doctor data:', dataToSave)
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

