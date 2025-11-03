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
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-2 flex-1 min-w-0">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-12 w-12 rounded-2xl flex-shrink-0" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn(
      'hover:shadow-premium-lg transition-all duration-300',
      'bg-white shadow-md border border-gray-200',
      borderColors[iconColor],
      'group'
    )} role="region" aria-label={`${title}: ${value}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-600 mb-2 leading-tight font-arabic line-clamp-2">{title}</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight font-arabic truncate">
              {value}
            </p>
          </div>
          {Icon && (
            <div className={cn(
              'h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0',
              'shadow-md',
              iconColors[iconColor]
            )} aria-hidden="true">
              <Icon className="h-5 w-5" />
            </div>
          )}
        </div>
        {subtitle && (
          <div className="pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 font-medium font-arabic">{subtitle}</p>
          </div>
        )}
        {trend && trendValue && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
            {trend === 'up' ? (
              <TrendingUp className="h-4 w-4 text-medical-green-600 flex-shrink-0" aria-hidden="true" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600 flex-shrink-0" aria-hidden="true" />
            )}
            <span className={cn(
              'text-xs font-semibold font-arabic',
              trend === 'up' ? 'text-medical-green-600' : 'text-red-600'
            )}>
              {trendValue}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default StatCard
