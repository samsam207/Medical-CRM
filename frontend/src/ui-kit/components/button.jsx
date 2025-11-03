/**
 * Unified Button Component
 * 
 * Combines features from common/Button and ui/button
 * Maintains backward compatibility with both APIs
 */

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"
import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-bold font-arabic ring-offset-white transition-all duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-medical-blue-500/20 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] shadow-premium hover:shadow-premium-lg",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-medical-blue-500 to-medical-blue-600 text-white hover:from-medical-blue-600 hover:to-medical-blue-700 hover:scale-[1.02] transform border-0",
        primary: "bg-gradient-to-r from-medical-blue-500 to-medical-blue-600 text-white hover:from-medical-blue-600 hover:to-medical-blue-700 hover:scale-[1.02] transform border-0",
        secondary: "bg-gradient-to-r from-medical-green-500 to-medical-green-600 text-white hover:from-medical-green-600 hover:to-medical-green-700 hover:scale-[1.02] transform border-0",
        accent: "bg-gradient-to-r from-medical-blue-500 to-medical-green-500 text-white hover:from-medical-blue-600 hover:to-medical-green-600 hover:scale-[1.02] transform border-0",
        outline: "border-2 border-medical-blue-300 bg-white text-medical-blue-700 hover:bg-gradient-to-r hover:from-medical-blue-50 hover:to-medical-green-50 hover:border-medical-blue-400 hover:text-medical-blue-800 hover:scale-[1.02] transform shadow-sm",
        ghost: "hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 rounded-xl text-gray-700 hover:text-gray-900 shadow-none hover:shadow-sm",
        link: "text-medical-blue-600 underline-offset-4 hover:underline hover:text-medical-blue-700 font-bold shadow-none",
        danger: "bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 hover:scale-[1.02] transform border-0",
        destructive: "bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 hover:scale-[1.02] transform border-0",
        success: "bg-gradient-to-r from-medical-green-500 to-medical-green-600 text-white hover:from-medical-green-600 hover:to-medical-green-700 hover:scale-[1.02] transform border-0",
        warning: "bg-gradient-to-r from-warning-500 to-warning-600 text-white hover:from-warning-600 hover:to-warning-700 hover:scale-[1.02] transform border-0",
      },
      size: {
        default: "h-11 px-6 py-2.5",
        sm: "h-9 rounded-xl px-4 text-xs",
        md: "h-11 px-6 py-2.5",
        lg: "h-14 rounded-2xl px-9 text-base py-3.5",
        icon: "h-11 w-11 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ 
  className, 
  variant, 
  size, 
  asChild = false, 
  loading = false,
  disabled = false,
  children,
  ...props 
}, ref) => {
  const Comp = asChild ? Slot : "button"
  
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
          <span>جاري التحميل...</span>
        </div>
      ) : (
        children
      )}
    </Comp>
  )
})
Button.displayName = "Button"

export { Button, buttonVariants }

