"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = {
  default: "bg-muted text-foreground border-border",
  success: "bg-success/15 text-foreground border-success/30",
  warning: "bg-warning/15 text-foreground border-warning/30",
  danger: "bg-danger/15 text-foreground border-danger/30",
  info: "bg-info/15 text-foreground border-info/30",
  outline: "bg-muted/60 text-foreground border-border font-semibold",
};

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
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
