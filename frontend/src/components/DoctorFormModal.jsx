/**
 * Doctor Form Modal - Redesigned with UI Kit
 * 
 * Modern doctor form using Dialog component.
 * Preserves all validation, ScheduleGrid, and API calls.
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
import ScheduleGrid from './ScheduleGrid'
import { clinicsApi } from '../api'
import api from '../api/client'
import { useQuery } from '@tanstack/react-query'
import { Stethoscope } from 'lucide-react'

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
  
  // Fetch available doctor users
  const { data: availableUsersData } = useQuery({
    queryKey: ['available-doctor-users'],
    queryFn: async () => {
      const response = await api.get('/auth/users/available-doctors')
      return response.data
    },
    enabled: isOpen && !doctor,
    staleTime: 60000
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
      newErrors.name = 'اسم الطبيب مطلوب'
    }
    
    if (!formData.specialty.trim()) {
      newErrors.specialty = 'التخصص مطلوب'
    }
    
    if (!formData.clinic_id) {
      newErrors.clinic_id = 'العيادة مطلوبة'
    }
    
    if (!doctor) {
      if (!formData.create_user && !formData.user_id) {
        newErrors.user_id = 'يرجى اختيار حساب مستخدم أو إنشاء حساب جديد'
      }
      if (formData.create_user) {
        if (!formData.new_username.trim()) {
          newErrors.new_username = 'اسم المستخدم مطلوب'
        }
        if (!formData.new_password || formData.new_password.length < 6) {
          newErrors.new_password = 'يجب أن تكون كلمة المرور 6 أحرف على الأقل'
        }
      }
    }

    if (Object.keys(formData.schedule).length === 0) {
      newErrors.schedule = 'يجب اختيار وقت واحد على الأقل'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validate()) {
      return
    }

    const scheduleArray = convertGridToSchedule(formData.schedule)
    
    if (scheduleArray.length === 0) {
      setErrors({ schedule: 'يجب اختيار وقت واحد على الأقل' })
      return
    }
    
    const clinicId = formData.clinic_id ? parseInt(formData.clinic_id) : null
    if (!clinicId || isNaN(clinicId)) {
      setErrors({ clinic_id: 'يرجى اختيار عيادة صحيحة' })
      return
    }
    
    let userId = null
    
    if (!doctor) {
      if (formData.create_user) {
        try {
          const userResponse = await api.post('/auth/users', {
            username: formData.new_username.trim(),
            password: formData.new_password,
            role: 'DOCTOR'
          })
          userId = userResponse.data.user.id
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'فشل إنشاء حساب المستخدم'
          setErrors({ new_username: errorMessage })
          return
        }
      } else if (formData.user_id) {
        userId = parseInt(formData.user_id)
      }
    } else if (doctor.user_id) {
      userId = doctor.user_id
    }
    
    const dataToSave = {
      name: formData.name.trim(),
      specialty: formData.specialty.trim(),
      clinic_id: clinicId,
      share_percentage: parseFloat(formData.share_percentage) || 0.7,
      schedule: scheduleArray,
      working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      working_hours: { start: '09:00', 'end': '17:00' }
    }
    
    if (userId) {
      dataToSave.user_id = userId
    }

    onSave(dataToSave)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-arabic flex items-center gap-2">
            <Stethoscope className="w-5 h-5" aria-hidden="true" />
            {doctor ? 'تعديل الطبيب' : 'إضافة طبيب جديد'}
          </DialogTitle>
          <DialogDescription className="font-arabic">
            {doctor ? 'قم بتعديل بيانات الطبيب' : 'قم بإدخال بيانات الطبيب الجديد'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="doctor-name" className="font-arabic">اسم الطبيب *</Label>
              <Input
                id="doctor-name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="مثال: د. أحمد"
                className={`font-arabic ${errors.name ? 'border-red-500' : ''}`}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'doctor-name-error' : undefined}
              />
              {errors.name && (
                <p id="doctor-name-error" className="text-sm text-red-600 font-arabic">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="doctor-specialty" className="font-arabic">التخصص *</Label>
              <Input
                id="doctor-specialty"
                type="text"
                name="specialty"
                value={formData.specialty}
                onChange={handleChange}
                placeholder="مثال: القلب"
                className={`font-arabic ${errors.specialty ? 'border-red-500' : ''}`}
                aria-invalid={!!errors.specialty}
                aria-describedby={errors.specialty ? 'doctor-specialty-error' : undefined}
              />
              {errors.specialty && (
                <p id="doctor-specialty-error" className="text-sm text-red-600 font-arabic">{errors.specialty}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="doctor-clinic" className="font-arabic">العيادة *</Label>
              <select
                id="doctor-clinic"
                name="clinic_id"
                value={formData.clinic_id}
                onChange={handleChange}
                className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium focus:border-medical-blue-500 focus:ring-2 focus:ring-medical-blue-100 bg-white text-gray-900 font-arabic ${errors.clinic_id ? 'border-red-500' : ''}`}
                aria-invalid={!!errors.clinic_id}
                aria-describedby={errors.clinic_id ? 'doctor-clinic-error' : undefined}
              >
                <option value="">اختر عيادة</option>
                {clinics.map(clinic => (
                  <option key={clinic.id} value={clinic.id}>
                    {clinic.name} - الغرفة {clinic.room_number}
                  </option>
                ))}
              </select>
              {errors.clinic_id && (
                <p id="doctor-clinic-error" className="text-sm text-red-600 font-arabic">{errors.clinic_id}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="doctor-share" className="font-arabic">نسبة الحصة</Label>
              <Input
                id="doctor-share"
                type="number"
                name="share_percentage"
                value={formData.share_percentage}
                onChange={handleChange}
                min="0"
                max="1"
                step="0.01"
                placeholder="0.70"
                className="font-arabic"
              />
              <p className="text-xs text-gray-500 font-arabic">
                نسبة الطبيب (مثال: 0.7 = 70%)
              </p>
            </div>
          </div>
          
          {!doctor && (
            <div className="border-t pt-4 mt-4 space-y-3">
              <Label className="block text-sm font-semibold text-gray-700 font-arabic mb-2">
                ربط حساب المستخدم *
              </Label>
              <p className="text-xs text-gray-500 font-arabic mb-3">
                قم بربط هذا الطبيب بحساب مستخدم للسماح له بتسجيل الدخول. يمكنك اختيار مستخدم موجود أو إنشاء حساب جديد.
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="user_option"
                      checked={!formData.create_user}
                      onChange={() => setFormData(prev => ({ ...prev, create_user: false }))}
                      className="w-4 h-4 text-medical-blue-600 focus:ring-2 focus:ring-medical-blue-200"
                    />
                    <span className="text-sm font-arabic">اختر مستخدم موجود</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="user_option"
                      checked={formData.create_user}
                      onChange={() => setFormData(prev => ({ ...prev, create_user: true, user_id: '' }))}
                      className="w-4 h-4 text-medical-blue-600 focus:ring-2 focus:ring-medical-blue-200"
                    />
                    <span className="text-sm font-arabic">إنشاء حساب جديد</span>
                  </label>
                </div>
                
                {!formData.create_user ? (
                  <div className="space-y-2">
                    <Label htmlFor="doctor-user" className="font-arabic">مستخدمي الأطباء المتاحون</Label>
                    <select
                      id="doctor-user"
                      name="user_id"
                      value={formData.user_id}
                      onChange={handleChange}
                      className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium focus:border-medical-blue-500 focus:ring-2 focus:ring-medical-blue-100 bg-white text-gray-900 font-arabic ${errors.user_id ? 'border-red-500' : ''}`}
                      aria-invalid={!!errors.user_id}
                      aria-describedby={errors.user_id ? 'doctor-user-error' : undefined}
                    >
                      <option value="">-- اختر حساب مستخدم --</option>
                      {availableUsers.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.username} (رقم: {user.id})
                        </option>
                      ))}
                    </select>
                    {availableUsers.length === 0 && (
                      <p className="text-xs text-amber-600 font-arabic mt-1">
                        لم يتم العثور على مستخدمي أطباء متاحين. جميع مستخدمي الأطباء مرتبطون بالفعل. يمكنك إنشاء حساب مستخدم جديد.
                      </p>
                    )}
                    {errors.user_id && (
                      <p id="doctor-user-error" className="text-sm text-red-600 font-arabic">{errors.user_id}</p>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="doctor-username" className="font-arabic">اسم المستخدم *</Label>
                      <Input
                        id="doctor-username"
                        type="text"
                        name="new_username"
                        value={formData.new_username}
                        onChange={handleChange}
                        placeholder="مثال: dr_ahmed"
                        className={`font-arabic ${errors.new_username ? 'border-red-500' : ''}`}
                        aria-invalid={!!errors.new_username}
                        aria-describedby={errors.new_username ? 'doctor-username-error' : undefined}
                      />
                      {errors.new_username && (
                        <p id="doctor-username-error" className="text-sm text-red-600 font-arabic">{errors.new_username}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="doctor-password" className="font-arabic">كلمة المرور *</Label>
                      <Input
                        id="doctor-password"
                        type="password"
                        name="new_password"
                        value={formData.new_password}
                        onChange={handleChange}
                        placeholder="6 أحرف على الأقل"
                        className={`font-arabic ${errors.new_password ? 'border-red-500' : ''}`}
                        aria-invalid={!!errors.new_password}
                        aria-describedby={errors.new_password ? 'doctor-password-error' : undefined}
                      />
                      {errors.new_password && (
                        <p id="doctor-password-error" className="text-sm text-red-600 font-arabic">{errors.new_password}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {doctor && doctor.user_id && (
            <div className="border-t pt-4 mt-4">
              <Label className="block text-sm font-semibold text-gray-700 font-arabic mb-2">
                حساب المستخدم المرتبط
              </Label>
              <div className="px-3 py-2 bg-gray-50 rounded border">
                <p className="text-sm text-gray-700 font-arabic">
                  رقم المستخدم: {doctor.user_id}
                  {doctor.user?.username && ` (${doctor.user.username})`}
                </p>
                <p className="text-xs text-gray-500 font-arabic mt-1">
                  ملاحظة: لا يمكن تغيير رابط حساب المستخدم من هذا النموذج. اتصل بالمسؤول للتعديل.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="font-arabic">جدول التوفر *</Label>
            {errors.schedule && (
              <p className="text-sm text-red-600 font-arabic">{errors.schedule}</p>
            )}
            <ScheduleGrid
              scheduleData={formData.schedule}
              editable={true}
              onChange={handleScheduleChange}
            />
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
              {doctor ? 'تحديث' : 'إنشاء'} الطبيب
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default DoctorFormModal
