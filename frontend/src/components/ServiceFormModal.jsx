import React, { useState, useEffect } from 'react'
import Modal from './common/Modal'
import Button from './common/Button'
import { DollarSign } from 'lucide-react'

const ServiceFormModal = ({ isOpen, onClose, onSave, service = null, clinicId = null }) => {
  const [formData, setFormData] = useState({
    name: '',
    duration: '',
    price: '',
    is_active: true
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name || '',
        duration: service.duration || '',
        price: service.price || '',
        is_active: service.is_active !== undefined ? service.is_active : true
      })
    } else {
      setFormData({
        name: '',
        duration: '',
        price: '',
        is_active: true
      })
    }
    setErrors({})
  }, [service, isOpen])

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
      newErrors.name = 'Service name is required'
    }
    
    if (!formData.duration || parseInt(formData.duration) <= 0) {
      newErrors.duration = 'Duration must be greater than 0 (in minutes)'
    }
    
    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = 'Price must be greater than 0'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!validate()) {
      return
    }

    const dataToSave = {
      name: formData.name.trim(),
      duration: parseInt(formData.duration),
      price: parseFloat(formData.price),
      is_active: formData.is_active
    }

    onSave(dataToSave)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={service ? 'Edit Service' : 'Add New Service'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full border rounded px-3 py-2 ${
                errors.name ? 'border-red-500' : ''
              }`}
              placeholder="e.g., Consultation, Check-up"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (minutes) *
              </label>
              <input
                type="number"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                min="1"
                className={`w-full border rounded px-3 py-2 ${
                  errors.duration ? 'border-red-500' : ''
                }`}
                placeholder="30"
              />
              {errors.duration && (
                <p className="text-red-500 text-sm mt-1">{errors.duration}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price ($) *
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                min="0"
                step="0.01"
                className={`w-full border rounded px-3 py-2 ${
                  errors.price ? 'border-red-500' : ''
                }`}
                placeholder="100.00"
              />
              {errors.price && (
                <p className="text-red-500 text-sm mt-1">{errors.price}</p>
              )}
            </div>
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
            {service ? 'Update' : 'Create'} Service
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default ServiceFormModal

