/**
 * PageContainer Component - Redesigned with UI Kit
 * 
 * Responsive page container that adjusts padding based on sidebar state.
 * Works with both desktop and mobile layouts.
 */

import { cn } from '../../lib/utils'
import { useLayout } from '../../contexts/LayoutContext'

const PageContainer = ({ children, className = '' }) => {
  const { sidebarCollapsed } = useLayout()

  return (
    <div 
      className={cn(
        'py-8 sm:py-12 px-4 sm:pr-10 w-full transition-all duration-300 animate-fade-in',
        // Desktop: adjust padding based on sidebar state
        'lg:pl-80', // Default sidebar width (256px = 80 * 4px)
        sidebarCollapsed && 'lg:pl-20', // Collapsed sidebar width (80px = 20 * 4px)
        // Mobile: no left padding (sidebar overlays)
        className
      )}
      role="region"
      aria-label="محتوى الصفحة"
    >
      <div className="max-w-[1600px] mx-auto w-full">
        {children}
      </div>
    </div>
  )
}

export default PageContainer
