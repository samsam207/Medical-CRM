/**
 * Service Form Modal - Redesigned with UI Kit
 * 
 * Modern service form using Dialog component.
 * Preserves all validation and API calls.
 */

import React, { useState, useEffect } from 'react'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui-kit'
import { Button } from '../ui-kit'
import { Input, Label } from '../ui-kit'
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
      newErrors.name = 'اسم الخدمة مطلوب'
    }
    
    if (!formData.duration || parseInt(formData.duration) <= 0) {
      newErrors.duration = 'يجب أن تكون المدة أكبر من 0 (بالدقائق)'
    }
    
    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = 'يجب أن يكون السعر أكبر من 0'
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle className="font-arabic flex items-center gap-2">
            <DollarSign className="w-5 h-5" aria-hidden="true" />
            {service ? 'تعديل الخدمة' : 'إضافة خدمة جديدة'}
          </DialogTitle>
          <DialogDescription className="font-arabic">
            {service ? 'قم بتعديل بيانات الخدمة' : 'قم بإدخال بيانات الخدمة الجديدة'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="service-name" className="font-arabic">اسم الخدمة *</Label>
            <Input
              id="service-name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="مثال: استشارة، فحص"
              className={`font-arabic ${errors.name ? 'border-red-500' : ''}`}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'service-name-error' : undefined}
            />
            {errors.name && (
              <p id="service-name-error" className="text-sm text-red-600 font-arabic">{errors.name}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="service-duration" className="font-arabic">المدة (بالدقائق) *</Label>
              <Input
                id="service-duration"
                type="number"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                min="1"
                placeholder="30"
                className={`font-arabic ${errors.duration ? 'border-red-500' : ''}`}
                aria-invalid={!!errors.duration}
                aria-describedby={errors.duration ? 'service-duration-error' : undefined}
              />
              {errors.duration && (
                <p id="service-duration-error" className="text-sm text-red-600 font-arabic">{errors.duration}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="service-price" className="font-arabic">السعر *</Label>
              <Input
                id="service-price"
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                min="0"
                step="0.01"
                placeholder="100.00"
                className={`font-arabic ${errors.price ? 'border-red-500' : ''}`}
                aria-invalid={!!errors.price}
                aria-describedby={errors.price ? 'service-price-error' : undefined}
              />
              {errors.price && (
                <p id="service-price-error" className="text-sm text-red-600 font-arabic">{errors.price}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              id="service-active"
              className="w-4 h-4 rounded border-gray-300 focus:ring-2 focus:ring-medical-blue-200 text-medical-blue-600"
              aria-label="نشط"
            />
            <Label htmlFor="service-active" className="font-arabic cursor-pointer">
              نشط
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              إلغاء
            </Button>
            <Button type="submit">
              {service ? 'تحديث' : 'إنشاء'} الخدمة
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default ServiceFormModal
