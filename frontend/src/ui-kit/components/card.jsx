/**
 * Unified Card Component
 * 
 * Combines features from common/Card and ui/card
 * Maintains backward compatibility with both APIs
 */

import * as React from "react"
import { cn } from "../../lib/utils"

const Card = React.forwardRef(({ className, variant = 'default', onClick, ...props }, ref) => {
  const variants = {
    default: 'bg-white/95 backdrop-blur-md border-gray-100/80',
    primary: 'bg-gradient-to-br from-medical-blue-50 to-medical-blue-100/80 border-medical-blue-200',
    secondary: 'bg-gradient-to-br from-medical-green-50 to-medical-green-100/80 border-medical-green-200',
    accent: 'bg-gradient-to-br from-medical-blue-50 to-medical-green-50/80 border-medical-blue-200',
    success: 'bg-gradient-to-br from-medical-green-50 to-medical-green-100/80 border-medical-green-200',
    warning: 'bg-gradient-to-br from-warning-50 to-warning-100/80 border-warning-200',
    error: 'bg-gradient-to-br from-error-50 to-error-100/80 border-error-200',
  }

  return (
    <div
      ref={ref}
      className={cn(
        'rounded-3xl border text-gray-950 shadow-premium',
        'hover:shadow-premium-lg hover:scale-[1.01] transition-all duration-300',
        'hover:border-gray-200/60',
        variants[variant],
        onClick && 'cursor-pointer transform hover:-translate-y-1',
        className
      )}
      onClick={onClick}
      {...props}
    />
  )
})
Card.displayName = "Card"

const CardHeader = React.forwardRef(({ className, variant = 'default', ...props }, ref) => {
  const variants = {
    default: 'border-gray-100/80 bg-gradient-to-r from-gray-50/50 to-white',
    primary: 'border-medical-blue-200 bg-gradient-to-r from-medical-blue-50/50 to-white',
    secondary: 'border-medical-green-200 bg-gradient-to-r from-medical-green-50/50 to-white',
    accent: 'border-medical-blue-200 bg-gradient-to-r from-medical-blue-50/50 to-white',
    success: 'border-medical-green-200 bg-gradient-to-r from-medical-green-50/50 to-white',
    warning: 'border-warning-200 bg-gradient-to-r from-warning-50/50 to-white',
    error: 'border-error-200 bg-gradient-to-r from-error-50/50 to-white',
  }

  return (
    <div
      ref={ref}
      className={cn(
        'flex flex-col space-y-2 p-7 border-b rounded-t-3xl',
        variants[variant],
        className
      )}
      {...props}
    />
  )
})
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef(({ className, variant = 'default', ...props }, ref) => {
  const variants = {
    default: 'text-gray-900',
    primary: 'text-medical-blue-700',
    secondary: 'text-medical-green-700',
    accent: 'text-medical-blue-700',
    success: 'text-medical-green-700',
    warning: 'text-warning-700',
    error: 'text-error-700',
  }

  return (
    <h3
      ref={ref}
      className={cn(
        'text-2xl font-bold leading-tight tracking-tight font-arabic',
        variants[variant],
        className
      )}
      {...props}
    />
  )
})
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef(({ className, variant = 'default', ...props }, ref) => {
  const variants = {
    default: 'text-gray-500',
    primary: 'text-medical-blue-600',
    secondary: 'text-medical-green-600',
    accent: 'text-medical-blue-600',
    success: 'text-medical-green-600',
    warning: 'text-warning-600',
    error: 'text-error-600',
  }

  return (
    <p
      ref={ref}
      className={cn(
        'text-sm font-arabic mt-2',
        variants[variant],
        className
      )}
      {...props}
    />
  )
})
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('p-7 pt-6', className)}
    {...props}
  />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef(({ className, variant = 'default', ...props }, ref) => {
  const variants = {
    default: 'border-gray-100/80',
    primary: 'border-medical-blue-200',
    secondary: 'border-medical-green-200',
    accent: 'border-medical-blue-200',
    success: 'border-medical-green-200',
    warning: 'border-warning-200',
    error: 'border-error-200',
  }

  return (
    <div
      ref={ref}
      className={cn(
        'flex items-center p-6 pt-0 border-t',
        variants[variant],
        className
      )}
      {...props}
    />
  )
})
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }

