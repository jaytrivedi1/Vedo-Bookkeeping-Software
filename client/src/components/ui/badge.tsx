import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-sky-50 text-sky-600 border-0",
        secondary:
          "bg-slate-100 text-slate-600 border-0",
        destructive:
          "bg-red-50 text-red-600 border-0",
        success:
          "bg-emerald-50 text-emerald-600 border-0",
        warning:
          "bg-amber-50 text-amber-600 border-0",
        outline:
          "text-slate-600 border border-slate-200 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
