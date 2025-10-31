import { TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent } from '../ui/card'
import { Badge } from '../ui/badge'
import { cn } from '../../lib/utils'

const StatCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  trendValue, 
  iconColor = 'blue',
  loading 
}) => {
  const iconColors = {
    blue: 'bg-blue-500 text-white shadow-md',
    green: 'bg-green-500 text-white shadow-md',
    amber: 'bg-amber-500 text-white shadow-md',
    red: 'bg-red-500 text-white shadow-md',
    gray: 'bg-gray-500 text-white shadow-md',
  }

  const borderColors = {
    blue: 'border-l-blue-500',
    green: 'border-l-green-500',
    amber: 'border-l-amber-500',
    red: 'border-l-red-500',
    gray: 'border-l-gray-500',
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="h-12 w-12 bg-gray-200 rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn(
      'hover:shadow-lg transition-all duration-300 hover:scale-[1.02]',
      'border-l-4',
      borderColors[iconColor]
    )}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between pb-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
            <p className="text-3xl font-bold text-gray-900 animate-counter">{value}</p>
          </div>
          {Icon && (
            <div className={cn(
              'h-12 w-12 rounded-full flex items-center justify-center',
              'shadow-lg',
              iconColors[iconColor]
            )}>
              <Icon className="h-6 w-6" />
            </div>
          )}
        </div>
        <div className="space-y-1 pt-2 border-t border-gray-100">
          {subtitle && (
            <p className="text-sm text-gray-500">{subtitle}</p>
          )}
          {trend && trendValue && (
            <div className="flex items-center gap-1 mt-2">
              {trend === 'up' ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <span className={cn(
                'text-sm font-medium',
                trend === 'up' ? 'text-green-600' : 'text-red-600'
              )}>
                {trendValue}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default StatCard

