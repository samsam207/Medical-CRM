import { cn } from '../../lib/utils'
import { useLayout } from '../../contexts/LayoutContext'

const PageContainer = ({ children, className = '' }) => {
  const { sidebarCollapsed } = useLayout()

  return (
    <div 
      className={cn(
        'py-8 pr-6 w-full transition-all duration-300',
        sidebarCollapsed ? 'pl-28' : 'pl-72',
        className
      )}
    >
      {children}
    </div>
  )
}

export default PageContainer

