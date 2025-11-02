import { useAuthStore } from '../../stores/authStore'
import { Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, isAuthenticated } = useAuthStore()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Small delay to prevent immediate redirects
    const timer = setTimeout(() => {
      setIsChecking(false)
    }, 100)
    
    return () => clearTimeout(timer)
  }, [])

  // Show loading while checking auth
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Case-insensitive role comparison; if unauthorized, send to their dashboard
  if (allowedRoles.length > 0 && !allowedRoles.map(r => r.toLowerCase()).includes(user?.role?.toLowerCase())) {
    // Both doctors and receptionists go to /reception/dashboard
    return <Navigate to="/reception/dashboard" replace />
  }

  return children
}

export default ProtectedRoute
