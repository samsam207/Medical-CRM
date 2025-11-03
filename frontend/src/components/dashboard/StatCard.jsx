/**
 * StatCard Component - Redesigned with UI Kit
 * 
 * Modern stat card component using the unified design system.
 * Preserves all props and functionality.
 */

import { TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent } from '../../ui-kit'
import { Badge } from '../../ui-kit'
import { Skeleton } from '../../ui-kit'
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
    blue: 'bg-gradient-to-br from-medical-blue-500 to-medical-blue-600 text-white shadow-premium',
    green: 'bg-gradient-to-br from-medical-green-500 to-medical-green-600 text-white shadow-premium',
    amber: 'bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-premium',
    red: 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-premium',
    gray: 'bg-gradient-to-br from-gray-500 to-gray-600 text-white shadow-premium',
  }

  const borderColors = {
    blue: 'border-r-4 border-r-medical-blue-500',
    green: 'border-r-4 border-r-medical-green-500',
    amber: 'border-r-4 border-r-amber-500',
    red: 'border-r-4 border-r-red-500',
    gray: 'border-r-4 border-r-gray-500',
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-12 w-12 rounded-3xl" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn(
      'hover:shadow-premium-lg transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1',
      'bg-gradient-to-br from-white via-white to-gray-50/40',
      'backdrop-blur-md shadow-premium group',
      borderColors[iconColor],
      'cursor-pointer'
    )} role="region" aria-label={`${title}: ${value}`}>
      <CardContent className="p-7">
        <div className="flex items-start justify-between pb-5">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-600 mb-4 tracking-wider uppercase font-arabic">{title}</p>
            <p className="text-5xl font-extrabold text-gray-900 animate-counter bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent leading-tight font-arabic">
              {value}
            </p>
          </div>
          {Icon && (
            <div className={cn(
              'h-16 w-16 rounded-3xl flex items-center justify-center',
              'shadow-premium-lg group-hover:shadow-glow-blue',
              'transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300',
              iconColors[iconColor],
              'flex-shrink-0'
            )} aria-hidden="true">
              <Icon className="h-8 w-8" />
            </div>
          )}
        </div>
        <div className="space-y-2 pt-4 border-t-2 border-gray-100/80">
          {subtitle && (
            <p className="text-xs font-semibold text-gray-600 tracking-wide font-arabic">{subtitle}</p>
          )}
          {trend && trendValue && (
            <div className="flex items-center gap-2 mt-3">
              {trend === 'up' ? (
                <TrendingUp className="h-5 w-5 text-medical-green-600" aria-hidden="true" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-600" aria-hidden="true" />
              )}
              <span className={cn(
                'text-sm font-bold font-arabic',
                trend === 'up' ? 'text-medical-green-600' : 'text-red-600'
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
