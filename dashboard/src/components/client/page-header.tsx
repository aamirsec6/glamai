"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type ClientPageHeaderProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
};

export function ClientPageHeader({
  title,
  description,
  actions,
  className,
}: ClientPageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && (
          <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center [&_a]:min-h-11 [&_button]:min-h-11 sm:[&_a]:min-h-9 sm:[&_button]:min-h-9">
          {actions}
        </div>
      )}
    </div>
  );
}
