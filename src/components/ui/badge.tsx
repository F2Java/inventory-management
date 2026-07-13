import * as React from "react"
import { cn } from "@/lib/utils"
import { getStatusColor } from "@/lib/utils"

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "outline" | "status"
  status?: string
}

function Badge({ className, variant = "default", status, children, ...props }: BadgeProps) {
  const statusClass = status ? getStatusColor(status) : ""

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
        variant === "default" && "bg-blue-100 text-blue-800",
        variant === "outline" && "border border-gray-300 text-gray-700",
        variant === "status" && statusClass,
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { Badge }
