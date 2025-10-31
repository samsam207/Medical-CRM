import React, { useState, useEffect } from 'react'
import Modal from './common/Modal'
import Button from './common/Button'
import { Building2 } from 'lucide-react'

const ClinicFormModal = ({ isOpen, onClose, onSave, clinic = null }) => {
  const [formData, setFormData] = useState({
    name: '',
    room_number: '',
    is_active: true
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (clinic) {
      setFormData({
        name: clinic.name || '',
        room_number: clinic.room_number || '',
        is_active: clinic.is_active !== undefined ? clinic.is_active : true
      })
    } else {
      setFormData({
        name: '',
        room_number: '',
        is_active: true
      })
    }
    setErrors({})
  }, [clinic, isOpen])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const validate = () => {
    const newErrors = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Clinic name is required'
    }
    
    if (!formData.room_number.trim()) {
      newErrors.room_number = 'Room number is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!validate()) {
      return
    }

    onSave(formData)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={clinic ? 'Edit Clinic' : 'Add New Clinic'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Clinic Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full border rounded px-3 py-2 ${
                errors.name ? 'border-red-500' : ''
              }`}
              placeholder="e.g., Cardiology Clinic"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Room Number *
            </label>
            <input
              type="text"
              name="room_number"
              value={formData.room_number}
              onChange={handleChange}
              className={`w-full border rounded px-3 py-2 ${
                errors.room_number ? 'border-red-500' : ''
              }`}
              placeholder="e.g., 101"
            />
            {errors.room_number && (
              <p className="text-red-500 text-sm mt-1">{errors.room_number}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              id="is_active"
              className="w-4 h-4"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
              Active
            </label>
          </div>
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
            {clinic ? 'Update' : 'Create'} Clinic
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default ClinicFormModal

