/**
 * Clinic Form Modal - Redesigned with UI Kit
 * 
 * Modern clinic form using Dialog component.
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
      newErrors.name = 'اسم العيادة مطلوب'
    }
    
    if (!formData.room_number.trim()) {
      newErrors.room_number = 'رقم الغرفة مطلوب'
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle className="font-arabic flex items-center gap-2">
            <Building2 className="w-5 h-5" aria-hidden="true" />
            {clinic ? 'تعديل العيادة' : 'إضافة عيادة جديدة'}
          </DialogTitle>
          <DialogDescription className="font-arabic">
            {clinic ? 'قم بتعديل بيانات العيادة' : 'قم بإدخال بيانات العيادة الجديدة'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clinic-name" className="font-arabic">اسم العيادة *</Label>
            <Input
              id="clinic-name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="مثال: عيادة القلب"
              className={`font-arabic ${errors.name ? 'border-red-500' : ''}`}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'clinic-name-error' : undefined}
            />
            {errors.name && (
              <p id="clinic-name-error" className="text-sm text-red-600 font-arabic">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="clinic-room" className="font-arabic">رقم الغرفة *</Label>
            <Input
              id="clinic-room"
              type="text"
              name="room_number"
              value={formData.room_number}
              onChange={handleChange}
              placeholder="مثال: 101"
              className={`font-arabic ${errors.room_number ? 'border-red-500' : ''}`}
              aria-invalid={!!errors.room_number}
              aria-describedby={errors.room_number ? 'clinic-room-error' : undefined}
            />
            {errors.room_number && (
              <p id="clinic-room-error" className="text-sm text-red-600 font-arabic">{errors.room_number}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              id="clinic-active"
              className="w-4 h-4 rounded border-gray-300 focus:ring-2 focus:ring-medical-blue-200 text-medical-blue-600"
              aria-label="نشط"
            />
            <Label htmlFor="clinic-active" className="font-arabic cursor-pointer">
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
              {clinic ? 'تحديث' : 'إنشاء'} العيادة
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default ClinicFormModal
