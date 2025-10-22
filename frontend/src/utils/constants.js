export const USER_ROLES = {
  ADMIN: 'admin',
  RECEPTIONIST: 'receptionist',
  DOCTOR: 'doctor'
}

export const APPOINTMENT_STATUS = {
  CONFIRMED: 'confirmed',
  CHECKED_IN: 'checked_in',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show'
}

export const VISIT_STATUS = {
  WAITING: 'waiting',
  CALLED: 'called',
  IN_PROGRESS: 'in_progress',
  PENDING_PAYMENT: 'pending_payment',
  COMPLETED: 'completed'
}

export const VISIT_TYPE = {
  SCHEDULED: 'scheduled',
  WALK_IN: 'walk_in'
}

export const PAYMENT_METHOD = {
  CASH: 'cash',
  VISA: 'visa',
  BANK_TRANSFER: 'bank_transfer'
}

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  REFUNDED: 'refunded'
}

export const BOOKING_SOURCE = {
  PHONE: 'phone',
  WALK_IN: 'walk_in',
  ONLINE: 'online'
}

export const GENDER = {
  MALE: 'male',
  FEMALE: 'female',
  OTHER: 'other'
}

export const NOTIFICATION_TYPES = {
  SMS_REMINDER: 'sms_reminder',
  SMS_CONFIRMATION: 'sms_confirmation',
  SMS_FOLLOWUP: 'sms_followup'
}

export const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00'
]

export const WORKING_DAYS = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
]
