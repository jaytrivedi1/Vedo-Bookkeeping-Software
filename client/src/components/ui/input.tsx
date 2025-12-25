import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  ghost?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ghost, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-xl px-3 py-2 text-sm transition-all duration-150",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-slate-700",
          "placeholder:text-slate-400",
          "disabled:cursor-not-allowed disabled:opacity-50",
          // Ghost mode - minimal borders until focus
          ghost
            ? "bg-transparent border-transparent hover:bg-slate-50 focus:bg-white focus:border-slate-200 focus:ring-2 focus:ring-sky-500/20"
            : "border border-slate-200 bg-white hover:border-slate-300 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 focus:outline-none",
          // Tabular nums for number inputs
          type === "number" && "font-tabular tabular-nums",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
