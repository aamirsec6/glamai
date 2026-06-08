"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "./card";

interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  icon?: React.ReactNode;
  className?: string;
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ label, value, change, icon, className }, ref) => {
    const isPositive = change !== undefined && change > 0;
    const isNegative = change !== undefined && change < 0;

    return (
      <Card ref={ref} className={cn("", className)}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted">{label}</p>
              <p className="text-2xl font-bold text-text">{value}</p>
              {change !== undefined && (
                <div className="flex items-center gap-1 text-sm">
                  {isPositive && (
                    <svg className="h-4 w-4 text-success-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                  )}
                  {isNegative && (
                    <svg className="h-4 w-4 text-danger-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  )}
                  <span
                    className={cn(
                      "font-medium",
                      isPositive && "text-success-500",
                      isNegative && "text-danger-500",
                      !isPositive && !isNegative && "text-muted"
                    )}
                  >
                    {isPositive ? "+" : ""}
                    {change}%
                  </span>
                  <span className="text-muted">vs last month</span>
                </div>
              )}
            </div>
            {icon && (
              <div className="rounded-lg bg-primary-50 p-3 text-primary-500">
                {icon}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
);
StatCard.displayName = "StatCard";

export { StatCard };
