import React from 'react'

const Badge = ({ children, className = '', variant = 'default', size = 'md', ...props }) => {
  const baseClasses = 'inline-flex items-center font-medium rounded-full'
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-2.5 py-0.5 text-sm',
    lg: 'px-3 py-1 text-sm'
  }
  
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800',
    primary: 'bg-blue-100 text-blue-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800'
  }
  
  const classes = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`
  
  return (
    <span className={classes} {...props}>
      {children}
    </span>
  )
}

export default Badge
export { Badge }
