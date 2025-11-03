/**
 * Unified Badge Component
 * 
 * Combines features from common/Badge and ui/badge
 * Maintains backward compatibility with both APIs
 */

import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3.5 py-1.5 text-xs font-bold tracking-wide transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-medical-blue-500/20 focus:ring-offset-2 shadow-premium hover:shadow-premium-lg hover:scale-[1.05] font-arabic",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-gradient-to-r from-medical-blue-500 to-medical-blue-600 text-white hover:from-medical-blue-600 hover:to-medical-blue-700",
        secondary:
          "border-transparent bg-gradient-to-r from-gray-100 to-gray-200 text-gray-900 hover:from-gray-200 hover:to-gray-300 shadow-sm",
        destructive:
          "border-transparent bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700",
        outline: "text-gray-900 border-2 border-gray-300 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:border-gray-400 shadow-sm",
        success:
          "border-transparent bg-gradient-to-r from-medical-green-500 to-medical-green-600 text-white hover:from-medical-green-600 hover:to-medical-green-700",
        primary: "border-transparent bg-gradient-to-r from-medical-blue-500 to-medical-blue-600 text-white hover:from-medical-blue-600 hover:to-medical-blue-700",
        warning: "border-transparent bg-gradient-to-r from-warning-500 to-warning-600 text-white hover:from-warning-600 hover:to-warning-700",
        error: "border-transparent bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700",
        info: "border-transparent bg-gradient-to-r from-medical-blue-500 to-medical-blue-600 text-white hover:from-medical-blue-600 hover:to-medical-blue-700",
      },
      size: {
        default: "px-3.5 py-1.5 text-xs",
        sm: "px-2 py-1 text-xs",
        md: "px-2.5 py-0.5 text-sm",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Badge({ className, variant, size, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

