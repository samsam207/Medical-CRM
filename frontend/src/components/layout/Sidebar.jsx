/**
 * Sidebar Component - Redesigned with UI Kit
 * 
 * Modern, accessible sidebar navigation using the unified design system.
 * Preserves all routes and navigation functionality.
 */

import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  Home, Calendar, Users, User, CreditCard, Building2, Settings,
  ChevronLeft, ChevronRight, Stethoscope, Menu, X, UserCog
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAuthStore } from '../../stores/authStore'
import { useLayout } from '../../contexts/LayoutContext'
import { Button, Badge } from '../../ui-kit'

const Sidebar = ({ onCollapseChange }) => {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuthStore()
  const { setSidebarCollapsed } = useLayout()
  
  const isDoctor = user?.role === 'doctor'
  const isAdmin = user?.role === 'admin'
  
  const sidebarItems = [
    { icon: Home, label: 'لوحة التحكم', path: '/reception/dashboard' },
    { icon: Calendar, label: 'المواعيد', path: '/reception/appointments' },
    { icon: Users, label: 'إدارة الطوابير', path: '/reception/queue' },
    { icon: User, label: 'المرضى', path: '/reception/patients' },
    { icon: CreditCard, label: 'المدفوعات', path: '/reception/payments' },
    // Hide clinics-doctors page for doctors
    ...(!isDoctor ? [{ icon: Building2, label: 'العيادات والأطباء', path: '/reception/clinics-doctors' }] : []),
    ...(isDoctor ? [{ icon: Stethoscope, label: 'الموعد الحالي', path: '/doctor/current-appointment' }] : []),
    // Only admin can see users-management
    ...(isAdmin ? [{ icon: UserCog, label: 'إدارة المستخدمين', path: '/reception/users-management' }] : []),
    { icon: Settings, label: 'الإعدادات', path: '/reception/settings' },
  ]

  const isActive = (path) => {
    // Match exact path or sub-paths for dashboard
    if (path === '/reception/dashboard') {
      return location.pathname === '/reception/dashboard' || location.pathname === '/reception'
    }
    if (path === '/doctor/current-appointment') {
      return location.pathname === '/doctor/current-appointment'
    }
    if (path === '/reception/users-management') {
      return location.pathname === '/reception/users-management'
    }
    return location.pathname === path
  }

  const handleToggle = () => {
    const newCollapsed = !collapsed
    setCollapsed(newCollapsed)
    onCollapseChange?.(newCollapsed)
    setSidebarCollapsed(newCollapsed)
  }

  const handleMobileToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleNavigation = (path) => {
    navigate(path)
    // Close mobile sidebar after navigation
    if (mobileOpen) {
      setMobileOpen(false)
    }
  }

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={handleMobileToggle}
        className="fixed top-4 right-4 z-50 lg:hidden flex items-center justify-center w-12 h-12 rounded-xl bg-white shadow-premium hover:shadow-premium-lg transition-all duration-300 border-2 border-gray-200/60"
        aria-label={mobileOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
        aria-expanded={mobileOpen}
        aria-controls="mobile-sidebar"
      >
        {mobileOpen ? (
          <X className="h-6 w-6 text-medical-blue-600" />
        ) : (
          <Menu className="h-6 w-6 text-medical-blue-600" />
        )}
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={handleMobileToggle}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        id="mobile-sidebar"
        className={cn(
          'fixed left-0 top-0 z-40 h-screen transition-all duration-300',
          'bg-gradient-to-b from-medical-blue-500 to-medical-green-500',
          'relative overflow-hidden',
          // Desktop: show based on collapsed state
          'hidden lg:block',
          collapsed ? 'w-20' : 'w-64',
          // Mobile: slide in/out
          'lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{
          backgroundImage: 'linear-gradient(135deg, #0EA5E9 0%, #10B981 100%), repeating-linear-gradient(45deg, rgba(255,255,255,0.01) 0%, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 10px)'
        }}
        aria-label="القائمة الجانبية"
        role="navigation"
      >
        {/* Subtle medical pattern overlay */}
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_2px_2px,#000_1px,transparent_0)] bg-[length:20px_20px]" aria-hidden="true" />
        <div className="absolute inset-0 opacity-10" style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,.05) 2px, rgba(255,255,255,.05) 4px)'
        }} aria-hidden="true" />

        {/* Logo/Brand - Premium Design */}
        <div className="relative flex h-20 items-center justify-between border-b border-white/30 px-4 z-10 backdrop-blur-sm">
          {!collapsed && (
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/95 shadow-premium backdrop-blur-md transition-all duration-300 hover:scale-110">
                <Building2 className="h-7 w-7 text-medical-blue-600" aria-hidden="true" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base text-white drop-shadow-md leading-tight">نظام إدارة العيادة</span>
                <span className="text-xs text-white/90 font-medium">Medical CRM</span>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/95 shadow-premium mx-auto backdrop-blur-md transition-all duration-300 hover:scale-110">
              <Building2 className="h-7 w-7 text-medical-blue-600" aria-hidden="true" />
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto relative z-10" aria-label="قائمة التنقل الرئيسية">
          {sidebarItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)
            
            return (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={cn(
                  'w-full flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-bold transition-all duration-300',
                  'hover:scale-[1.03] hover:shadow-premium hover:shadow-black/10',
                  'focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-medical-blue-500',
                  active
                    ? 'bg-white text-medical-blue-600 shadow-premium shadow-black/10 scale-[1.03] border border-white/20'
                    : 'text-white/95 hover:bg-white/15 hover:text-white'
                )}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className={cn('flex-shrink-0 h-5 w-5', collapsed && 'mx-auto')} aria-hidden="true" />
                {!collapsed && <span className="font-semibold">{item.label}</span>}
              </button>
            )
          })}
        </nav>

        {/* User Profile Section - Premium Design */}
        {!collapsed && (
          <div className="border-t border-white/30 p-5 relative z-10 backdrop-blur-sm">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/95 backdrop-blur-md shadow-premium transition-all duration-300 hover:scale-110">
                <User className="h-5 w-5 text-medical-blue-600" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-bold text-white drop-shadow-sm">{user?.name || 'User'}</p>
                <p className="truncate text-xs text-white/90 font-medium">{user?.role || 'Reception'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Collapse Toggle - Premium Design */}
        <button
          onClick={handleToggle}
          className="absolute -right-3 top-24 hidden lg:flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-premium hover:shadow-premium-lg hover:scale-110 active:scale-95 transition-all duration-300 z-20 border-2 border-gray-200/80"
          aria-label={collapsed ? 'توسيع القائمة الجانبية' : 'طي القائمة الجانبية'}
          aria-expanded={!collapsed}
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5 text-medical-blue-600 font-bold" aria-hidden="true" />
          ) : (
            <ChevronLeft className="h-5 w-5 text-medical-blue-600 font-bold" aria-hidden="true" />
          )}
        </button>
      </aside>
    </>
  )
}

export default Sidebar
