import React from 'react'
import { clsx } from 'clsx'

const Card = ({ 
  children, 
  className = '',
  onClick,
  variant = 'default',
  ...props 
}) => {
  const variants = {
    default: 'bg-white border-gray-100',
    primary: 'bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200',
    secondary: 'bg-gradient-to-br from-secondary-50 to-secondary-100 border-secondary-200',
    accent: 'bg-gradient-to-br from-accent-50 to-accent-100 border-accent-200',
    success: 'bg-gradient-to-br from-success-50 to-success-100 border-success-200',
    warning: 'bg-gradient-to-br from-warning-50 to-warning-100 border-warning-200',
    error: 'bg-gradient-to-br from-error-50 to-error-100 border-error-200'
  }

  return (
    <div
      className={clsx(
        'rounded-3xl border shadow-soft hover:shadow-soft-lg transition-all duration-300',
        variants[variant],
        onClick && 'cursor-pointer transform hover:-translate-y-1',
        className
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  )
}

const CardHeader = ({ children, className = '', variant = 'default' }) => {
  const variants = {
    default: 'border-gray-100',
    primary: 'border-primary-200',
    secondary: 'border-secondary-200',
    accent: 'border-accent-200',
    success: 'border-success-200',
    warning: 'border-warning-200',
    error: 'border-error-200'
  }

  return (
    <div className={clsx('px-8 py-6 border-b', variants[variant], className)}>
      {children}
    </div>
  )
}

const CardTitle = ({ children, className = '', variant = 'default' }) => {
  const variants = {
    default: 'text-gray-900',
    primary: 'text-primary-700',
    secondary: 'text-secondary-700',
    accent: 'text-accent-700',
    success: 'text-success-700',
    warning: 'text-warning-700',
    error: 'text-error-700'
  }

  return (
    <h3 className={clsx('text-xl font-bold font-arabic', variants[variant], className)}>
      {children}
    </h3>
  )
}

const CardDescription = ({ children, className = '', variant = 'default' }) => {
  const variants = {
    default: 'text-gray-600',
    primary: 'text-primary-600',
    secondary: 'text-secondary-600',
    accent: 'text-accent-600',
    success: 'text-success-600',
    warning: 'text-warning-600',
    error: 'text-error-600'
  }

  return (
    <p className={clsx('text-sm font-arabic mt-2', variants[variant], className)}>
      {children}
    </p>
  )
}

const CardContent = ({ children, className = '' }) => (
  <div className={clsx('px-8 py-6', className)}>
    {children}
  </div>
)

const CardFooter = ({ children, className = '', variant = 'default' }) => {
  const variants = {
    default: 'border-gray-100',
    primary: 'border-primary-200',
    secondary: 'border-secondary-200',
    accent: 'border-accent-200',
    success: 'border-success-200',
    warning: 'border-warning-200',
    error: 'border-error-200'
  }

  return (
    <div className={clsx('px-8 py-6 border-t', variants[variant], className)}>
      {children}
    </div>
  )
}

Card.Header = CardHeader
Card.Title = CardTitle
Card.Description = CardDescription
Card.Content = CardContent
Card.Footer = CardFooter

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
export default Card