import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  Home, Calendar, Users, User, CreditCard, Building2, Settings,
  ChevronLeft, ChevronRight, Stethoscope
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAuthStore } from '../../stores/authStore'

const Sidebar = ({ onCollapseChange }) => {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuthStore()
  
  const isDoctor = user?.role === 'doctor'
  
  const sidebarItems = [
    { icon: Home, label: 'لوحة التحكم', path: '/reception/dashboard' },
    { icon: Calendar, label: 'المواعيد', path: '/reception/appointments' },
    { icon: Users, label: 'إدارة الطوابير', path: '/reception/queue' },
    { icon: User, label: 'المرضى', path: '/reception/patients' },
    { icon: CreditCard, label: 'المدفوعات', path: '/reception/payments' },
    { icon: Building2, label: 'العيادات والأطباء', path: '/reception/clinics-doctors' },
    ...(isDoctor ? [{ icon: Stethoscope, label: 'الموعد الحالي', path: '/doctor/current-appointment' }] : []),
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
    return location.pathname === path
  }

  const handleToggle = () => {
    const newCollapsed = !collapsed
    setCollapsed(newCollapsed)
    onCollapseChange?.(newCollapsed)
  }

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen transition-all duration-300',
        'bg-gradient-to-b from-medical-blue-500 to-medical-green-500',
        'relative overflow-hidden',
        collapsed ? 'w-20' : 'w-64'
      )}
      style={{
        backgroundImage: 'linear-gradient(135deg, #0EA5E9 0%, #10B981 100%), repeating-linear-gradient(45deg, rgba(255,255,255,0.01) 0%, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 10px)'
      }}
    >
      {/* Subtle medical pattern overlay */}
      <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_2px_2px,#000_1px,transparent_0)] bg-[length:20px_20px]" />
      <div className="absolute inset-0 opacity-10" style={{
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,.05) 2px, rgba(255,255,255,.05) 4px)'
      }} />
        {/* Logo/Brand - Premium Design */}
        <div className="relative flex h-20 items-center justify-between border-b border-white/30 px-4 z-10 backdrop-blur-sm">
          {!collapsed && (
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/95 shadow-premium backdrop-blur-md transition-all duration-300 hover:scale-110">
                <Building2 className="h-7 w-7 text-medical-blue-600" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base text-white drop-shadow-md leading-tight">نظام إدارة العيادة</span>
                <span className="text-xs text-white/90 font-medium">Medical CRM</span>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/95 shadow-premium mx-auto backdrop-blur-md transition-all duration-300 hover:scale-110">
              <Building2 className="h-7 w-7 text-medical-blue-600" />
            </div>
          )}
        </div>

      {/* Navigation Items */}
      <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto relative z-10">
        {sidebarItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'w-full flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-bold transition-all duration-300',
                'hover:scale-[1.03] hover:shadow-premium hover:shadow-black/10',
                active
                  ? 'bg-white text-medical-blue-600 shadow-premium shadow-black/10 scale-[1.03] border border-white/20'
                  : 'text-white/95 hover:bg-white/15 hover:text-white'
              )}
            >
              <Icon className={cn('flex-shrink-0 h-5 w-5', collapsed && 'mx-auto')} />
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
              <User className="h-5 w-5 text-medical-blue-600" />
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
        className="absolute -right-3 top-24 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-premium hover:shadow-premium-lg hover:scale-110 active:scale-95 transition-all duration-300 z-20 border-2 border-gray-200/80"
      >
        {collapsed ? (
          <ChevronRight className="h-5 w-5 text-medical-blue-600 font-bold" />
        ) : (
          <ChevronLeft className="h-5 w-5 text-medical-blue-600 font-bold" />
        )}
      </button>
    </aside>
  )
}

export default Sidebar

