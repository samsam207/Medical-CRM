import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utility function to merge Tailwind CSS classes
 * Combines classnames and resolves conflicts
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

