import React from 'react'
import { clsx } from 'clsx'

const Card = ({ 
  children, 
  className = '',
  onClick,
  ...props 
}) => {
  return (
    <div
      className={clsx(
        'bg-white rounded-lg border border-gray-200 shadow-sm',
        onClick && 'cursor-pointer hover:shadow-md transition-shadow',
        className
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  )
}

const CardHeader = ({ children, className = '' }) => (
  <div className={clsx('px-6 py-4 border-b border-gray-200', className)}>
    {children}
  </div>
)

const CardTitle = ({ children, className = '' }) => (
  <h3 className={clsx('text-lg font-semibold text-gray-900', className)}>
    {children}
  </h3>
)

const CardDescription = ({ children, className = '' }) => (
  <p className={clsx('text-sm text-gray-600 mt-1', className)}>
    {children}
  </p>
)

const CardContent = ({ children, className = '' }) => (
  <div className={clsx('px-6 py-4', className)}>
    {children}
  </div>
)

const CardFooter = ({ children, className = '' }) => (
  <div className={clsx('px-6 py-4 border-t border-gray-200', className)}>
    {children}
  </div>
)

Card.Header = CardHeader
Card.Title = CardTitle
Card.Description = CardDescription
Card.Content = CardContent
Card.Footer = CardFooter

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
export default Card