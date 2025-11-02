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
      {/* Logo/Brand */}
      <div className="relative flex h-16 items-center justify-between border-b border-white/20 px-4 z-10">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/90 shadow-sm backdrop-blur-sm">
              <Building2 className="h-6 w-6 text-medical-blue-600" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm text-white drop-shadow-sm">نظام إدارة العيادة</span>
              <span className="text-xs text-white/80">Medical CRM</span>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/90 shadow-sm mx-auto backdrop-blur-sm">
            <Building2 className="h-6 w-6 text-medical-blue-600" />
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
                'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                'hover:scale-[1.02] hover:shadow-md hover:shadow-black/10',
                active
                  ? 'bg-white text-medical-blue-600 shadow-md shadow-black/10 scale-[1.02]'
                  : 'text-white/90 hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon className={cn('flex-shrink-0 h-5 w-5', collapsed && 'mx-auto')} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          )
        })}
      </nav>

      {/* User Profile Section */}
      {!collapsed && (
        <div className="border-t border-white/20 p-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-sm">
              <User className="h-5 w-5 text-medical-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold text-white">{user?.name || 'User'}</p>
              <p className="truncate text-xs text-white/80">{user?.role || 'Reception'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Collapse Toggle */}
      <button
        onClick={handleToggle}
        className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 z-20 border border-gray-200"
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4 text-medical-blue-600" />
        ) : (
          <ChevronLeft className="h-4 w-4 text-medical-blue-600" />
        )}
      </button>
    </aside>
  )
}

export default Sidebar

