/**
 * AppShell Component - Redesigned with UI Kit
 * 
 * Modern app shell with header, notifications, and account menu.
 * Preserves all functionality including logout and navigation.
 */

import { Bell, Wifi, WifiOff, LogOut, User, Settings, ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuthStore } from '../../stores/authStore'
import { useLayout } from '../../contexts/LayoutContext'
import { useNotificationStore } from '../../stores/notificationStore'
import { 
  Button, 
  Badge, 
  Avatar, 
  AvatarFallback,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
} from '../../ui-kit'
import { cn } from '../../lib/utils'
import { useState, useEffect } from 'react'

const AppShell = ({ children }) => {
  const { sidebarCollapsed } = useLayout()
  const { user, logout } = useAuthStore()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotificationStore()
  const navigate = useNavigate()
  const [isConnected] = useState(true) // Replace with actual socket state

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Format notification time
  const formatNotificationTime = (date) => {
    if (!date) return ''
    const now = new Date()
    const notifDate = new Date(date)
    const diffInSeconds = Math.floor((now - notifDate) / 1000)
    
    if (diffInSeconds < 60) return 'الآن'
    if (diffInSeconds < 3600) return `منذ ${Math.floor(diffInSeconds / 60)} دقيقة`
    if (diffInSeconds < 86400) return `منذ ${Math.floor(diffInSeconds / 3600)} ساعة`
    return notifDate.toLocaleDateString('ar-SA')
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50/50 overflow-hidden" dir="rtl">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 w-full overflow-hidden flex flex-col">
        {/* Premium Top Bar */}
        <header 
          className="h-20 border-b-2 border-gray-200/40 bg-white/98 backdrop-blur-md px-4 sm:px-6 lg:px-8 xl:px-10 flex items-center justify-between shadow-premium relative overflow-hidden z-10"
          role="banner"
          aria-label="شريط التطبيق العلوي"
        >
          {/* Elegant gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-medical-blue-50/20 via-white to-medical-green-50/20" aria-hidden="true" />
          
          {/* Left side - Spacer for mobile menu button */}
          <div className="flex-1 relative z-10 lg:hidden" />
          
          {/* Center/Right side - Notifications and User Menu */}
          <div className="flex items-center gap-2 sm:gap-4 relative z-10">
            {/* Connection Status */}
            <div className="hidden sm:flex items-center gap-2">
              {isConnected ? (
                <Badge 
                  variant="success" 
                  className="gap-1.5 px-3 py-1.5 animate-pulse shadow-glow-green font-medium border-0"
                  aria-label="متصل بالإنترنت"
                >
                  <Wifi className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="hidden md:inline">متصل</span>
                </Badge>
              ) : (
                <Badge 
                  variant="destructive" 
                  className="gap-1.5 px-3 py-1.5 font-medium border-0"
                  aria-label="غير متصل"
                >
                  <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="hidden md:inline">غير متصل</span>
                </Badge>
              )}
            </div>

            {/* Notifications Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="relative hover:bg-gradient-to-r hover:from-medical-blue-50 hover:to-medical-green-50 transition-all duration-200 rounded-xl group"
                  aria-label={`الإشعارات${unreadCount > 0 ? ` (${unreadCount} غير مقروء)` : ''}`}
                >
                  <Bell className="h-5 w-5 text-gray-600 group-hover:text-medical-blue-600 transition-colors" aria-hidden="true" />
                  {unreadCount > 0 && (
                    <span 
                      className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-gradient-to-r from-red-500 to-red-600 animate-pulse shadow-glow-red"
                      aria-hidden="true"
                    />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 max-h-[400px] overflow-y-auto">
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>الإشعارات</span>
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        markAllAsRead()
                      }}
                      className="text-xs h-7 px-2"
                    >
                      تحديد الكل كمقروء
                    </Button>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-gray-500 font-arabic">
                    <Bell className="h-12 w-12 mx-auto mb-2 text-gray-300" aria-hidden="true" />
                    <p className="text-sm">لا توجد إشعارات</p>
                  </div>
                ) : (
                  <DropdownMenuGroup>
                    {notifications.slice(0, 10).map((notification) => (
                      <DropdownMenuItem
                        key={notification.id}
                        className={cn(
                          'flex flex-col items-start gap-1 py-3 px-3 cursor-pointer',
                          !notification.read && 'bg-medical-blue-50/50'
                        )}
                        onClick={() => {
                          if (!notification.read) {
                            markAsRead(notification.id)
                          }
                        }}
                      >
                        <div className="flex items-start justify-between w-full gap-2">
                          <p className="text-sm font-medium text-gray-900 font-arabic flex-1">
                            {notification.message || notification.title}
                          </p>
                          {!notification.read && (
                            <span className="h-2 w-2 rounded-full bg-medical-blue-600 mt-1 flex-shrink-0" aria-label="غير مقروء" />
                          )}
                        </div>
                        {notification.createdAt && (
                          <span className="text-xs text-gray-500 font-arabic">
                            {formatNotificationTime(notification.createdAt)}
                          </span>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Menu Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-3 pl-2 sm:pl-4 border-r border-gray-200/60 pr-2 sm:pr-4 cursor-pointer hover:opacity-80 transition-opacity">
                  <Avatar className="hover:ring-4 hover:ring-medical-blue-200 transition-all duration-300 cursor-pointer ring-2 ring-medical-blue-100 shadow-premium">
                    <AvatarFallback className="bg-gradient-to-br from-medical-blue-400 via-medical-blue-500 to-medical-green-500 text-white font-bold text-base shadow-premium">
                      {user?.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:flex flex-col">
                    <span className="text-sm font-bold text-gray-900 leading-tight">{user?.name || 'User'}</span>
                    <span className="text-xs text-gray-500 font-medium">{user?.role || 'Reception'}</span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-600 hidden lg:block" aria-hidden="true" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user?.name || 'User'}</p>
                    <p className="text-xs text-gray-500">{user?.email || user?.username || ''}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem 
                    onClick={() => navigate('/reception/settings')}
                    className="cursor-pointer"
                  >
                    <User className="h-4 w-4 ml-2" aria-hidden="true" />
                    <span>الملف الشخصي</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => navigate('/reception/settings')}
                    className="cursor-pointer"
                  >
                    <Settings className="h-4 w-4 ml-2" aria-hidden="true" />
                    <span>الإعدادات</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50"
                >
                  <LogOut className="h-4 w-4 ml-2" aria-hidden="true" />
                  <span>تسجيل الخروج</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main 
          className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50/30 via-white to-gray-50/20"
          role="main"
          aria-label="المحتوى الرئيسي"
        >
          {children}
        </main>
      </div>
    </div>
  )
}

export default AppShell
