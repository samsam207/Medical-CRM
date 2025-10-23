import React, { memo } from 'react'
import { clsx } from 'clsx'

const Button = memo(({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  disabled = false, 
  loading = false,
  onClick,
  type = 'button',
  ...props 
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium font-arabic rounded-2xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0'
  
  const variants = {
    primary: 'bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-200 shadow-soft hover:shadow-soft-lg',
    secondary: 'bg-secondary-500 text-white hover:bg-secondary-600 focus:ring-secondary-200 shadow-soft hover:shadow-soft-lg',
    accent: 'bg-accent-500 text-white hover:bg-accent-600 focus:ring-accent-200 shadow-soft hover:shadow-soft-lg',
    outline: 'border-2 border-primary-500 text-primary-500 bg-white hover:bg-primary-500 hover:text-white focus:ring-primary-200 shadow-soft hover:shadow-soft-lg',
    ghost: 'text-primary-500 hover:bg-primary-50 focus:ring-primary-200',
    danger: 'bg-error-500 text-white hover:bg-error-600 focus:ring-error-200 shadow-soft hover:shadow-soft-lg',
    success: 'bg-success-500 text-white hover:bg-success-600 focus:ring-success-200 shadow-soft hover:shadow-soft-lg',
    warning: 'bg-warning-500 text-white hover:bg-warning-600 focus:ring-warning-200 shadow-soft hover:shadow-soft-lg'
  }
  
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  }
  
  // Remove loading from props to prevent it from being passed to DOM
  const { loading: _, ...domProps } = props

  return (
    <button
      type={type}
      className={clsx(
        baseClasses,
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      onClick={onClick}
      {...domProps}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
          <span>جاري التحميل...</span>
        </div>
      ) : (
        children
      )}
    </button>
  )
})

Button.displayName = 'Button'

export { Button }
export default Button