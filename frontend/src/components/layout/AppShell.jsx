import { Bell, Wifi, WifiOff, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuthStore } from '../../stores/authStore'
import { useLayout } from '../../contexts/LayoutContext'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Avatar, AvatarFallback } from '../ui/avatar'
import { cn } from '../../lib/utils'
import { useState } from 'react'

const AppShell = ({ children }) => {
  const { sidebarCollapsed, setSidebarCollapsed } = useLayout()
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [isConnected] = useState(true) // Replace with actual socket state

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <Sidebar onCollapseChange={setSidebarCollapsed} />

      {/* Main Content Area - Full width, no margin shift */}
      <div className="flex-1 w-full overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 border-b border-gray-200 bg-white px-6 flex items-center justify-between shadow-sm relative overflow-hidden">
          {/* Subtle gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50 via-white to-teal-50 opacity-50" />
          
          {/* Left side - Could add breadcrumbs here */}
          <div className="flex-1 relative z-10">
            {/* Breadcrumbs can go here */}
          </div>

          {/* Right side - Notifications and User Menu */}
          <div className="flex items-center gap-4 relative z-10">
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Badge 
                  variant="success" 
                  className="gap-1 animate-pulse-glow shadow-glow-green"
                >
                  <Wifi className="h-3 w-3" />
                  متصل
                </Badge>
              ) : (
                <Badge 
                  variant="destructive" 
                  className="gap-1"
                >
                  <WifiOff className="h-3 w-3" />
                  غير متصل
                </Badge>
              )}
            </div>

            {/* Notifications */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative hover:bg-gray-100 transition-all duration-200"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
            </Button>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              <Avatar className="hover:ring-2 hover:ring-blue-500 transition-all duration-200">
                <AvatarFallback className="bg-gradient-to-br from-blue-400 to-teal-500 text-white font-semibold">
                  {user?.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col">
                <span className="text-sm font-semibold text-gray-900">{user?.name || 'User'}</span>
                <span className="text-xs text-gray-500">{user?.role || 'Reception'}</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="hover:bg-red-50 hover:text-red-600 transition-all duration-200"
              >
                <LogOut className="h-4 w-4 mr-2" />
                تسجيل الخروج
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="h-[calc(100vh-4rem)] overflow-y-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  )
}

export default AppShell

