"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = {
  default: "bg-gray-100 text-gray-700 border-gray-200",
  success: "bg-success-50 text-success-600 border-success-500/20",
  warning: "bg-warning-50 text-warning-600 border-warning-500/20",
  danger: "bg-danger-50 text-danger-600 border-danger-500/20",
  info: "bg-info-50 text-info-600 border-info-500/20",
  outline: "bg-transparent text-muted border-gray-300",
};

export interface BadgeProps
  extends React.HTMLAttributes<HTMLHTMLSpanElement> {
  variant?: keyof typeof badgeVariants;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-badge border px-2.5 py-0.5 text-xs font-medium transition-colors",
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  )
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
