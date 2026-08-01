"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/marketing/logo-mark";

type QimmaLogoProps = {
  className?: string;
  showWordmark?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "light" | "dark" | "colorful";
};

const iconSizes = { sm: 32, md: 40, lg: 48 };
const wordmarkSizes = { sm: "text-lg", md: "text-xl", lg: "text-2xl" };

export function QimmaLogo({
  className,
  showWordmark = true,
  size = "md",
  variant = "light",
}: QimmaLogoProps) {
  const uid = useId();
  const dark = variant === "dark";
  const colorful = variant === "colorful";

  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={iconSizes[size]} id={`qimma${uid.replace(/:/g, "")}`} />
      {showWordmark && (
        <span
          className={cn(
            "font-bold tracking-[-0.03em]",
            wordmarkSizes[size],
            dark ? "text-foreground" : colorful ? "mkt-gradient-text" : "text-neutral-950",
          )}
        >
          Qimma
        </span>
      )}
    </div>
  );
}

/** @deprecated Use QimmaLogo */
export const GlamLogo = QimmaLogo;
