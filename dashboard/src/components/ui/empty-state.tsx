"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ icon, title, description, action, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col items-center justify-center rounded-card bg-card shadow-card border border-gray-100 p-12 text-center",
        className
      )}
      {...props}
    >
      {icon && (
        <div className="mb-4 rounded-full bg-gray-100 p-4 text-muted">
          {icon}
        </div>
      )}
      <h3 className="mb-1 text-lg font-semibold text-text">{title}</h3>
      {description && (
        <p className="mb-6 max-w-sm text-sm text-muted">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} variant="default">
          {action.label}
        </Button>
      )}
    </div>
  )
);
EmptyState.displayName = "EmptyState";

export { EmptyState };
