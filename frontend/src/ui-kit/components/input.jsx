/**
 * Unified Input Component
 * 
 * Enhanced input with RTL support and medical theme
 */

import * as React from "react"
import { cn } from "../../lib/utils"

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-12 w-full rounded-2xl border-2 border-gray-200 bg-white px-4 py-3 text-sm font-medium font-arabic ring-offset-white",
        "file:border-0 file:bg-transparent file:text-sm file:font-semibold",
        "placeholder:text-gray-400",
        "shadow-sm hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-medical-blue-500/20 focus-visible:border-medical-blue-500 focus-visible:shadow-premium",
        "transition-all duration-300",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "text-gray-900 text-right",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = "Input"

export { Input }

