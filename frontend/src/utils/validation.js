// Frontend validation utilities

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const validatePhone = (phone) => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
  return phoneRegex.test(phone.replace(/\s/g, ''))
}

export const validateRequired = (value) => {
  return value && value.toString().trim().length > 0
}

export const validateMinLength = (value, minLength) => {
  return value && value.toString().length >= minLength
}

export const validateMaxLength = (value, maxLength) => {
  return !value || value.toString().length <= maxLength
}

export const validateAge = (age) => {
  const numAge = parseInt(age)
  return !isNaN(numAge) && numAge > 0 && numAge <= 150
}

export const validateAmount = (amount) => {
  const numAmount = parseFloat(amount)
  return !isNaN(numAmount) && numAmount >= 0
}

export const validateDate = (date) => {
  const dateObj = new Date(date)
  return dateObj instanceof Date && !isNaN(dateObj)
}

export const validateFutureDate = (date) => {
  const dateObj = new Date(date)
  const now = new Date()
  return dateObj instanceof Date && !isNaN(dateObj) && dateObj > now
}

export const validateTime = (time) => {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  return timeRegex.test(time)
}

export const validatePassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/
  return passwordRegex.test(password)
}

export const validateForm = (formData, rules) => {
  const errors = {}
  
  for (const field in rules) {
    const fieldRules = rules[field]
    const value = formData[field]
    
    for (const rule of fieldRules) {
      const { validator, message } = rule
      
      if (!validator(value)) {
        errors[field] = message
        break // Stop at first error for each field
      }
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

// Common validation rules
export const commonRules = {
  email: [
    { validator: validateRequired, message: 'Email is required' },
    { validator: validateEmail, message: 'Please enter a valid email address' }
  ],
  phone: [
    { validator: validateRequired, message: 'Phone number is required' },
    { validator: validatePhone, message: 'Please enter a valid phone number' }
  ],
  name: [
    { validator: validateRequired, message: 'Name is required' },
    { validator: (value) => validateMinLength(value, 2), message: 'Name must be at least 2 characters' },
    { validator: (value) => validateMaxLength(value, 100), message: 'Name must be less than 100 characters' }
  ],
  age: [
    { validator: validateRequired, message: 'Age is required' },
    { validator: validateAge, message: 'Please enter a valid age (1-150)' }
  ],
  password: [
    { validator: validateRequired, message: 'Password is required' },
    { validator: validatePassword, message: 'Password must be at least 8 characters with uppercase, lowercase, and number' }
  ],
  amount: [
    { validator: validateRequired, message: 'Amount is required' },
    { validator: validateAmount, message: 'Please enter a valid amount' }
  ],
  date: [
    { validator: validateRequired, message: 'Date is required' },
    { validator: validateDate, message: 'Please enter a valid date' }
  ],
  futureDate: [
    { validator: validateRequired, message: 'Date is required' },
    { validator: validateDate, message: 'Please enter a valid date' },
    { validator: validateFutureDate, message: 'Date must be in the future' }
  ],
  time: [
    { validator: validateRequired, message: 'Time is required' },
    { validator: validateTime, message: 'Please enter a valid time (HH:MM)' }
  ]
}

export default {
  validateEmail,
  validatePhone,
  validateRequired,
  validateMinLength,
  validateMaxLength,
  validateAge,
  validateAmount,
  validateDate,
  validateFutureDate,
  validateTime,
  validatePassword,
  validateForm,
  commonRules
}
