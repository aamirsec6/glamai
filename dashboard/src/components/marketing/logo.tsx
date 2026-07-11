import { cn } from "@/lib/utils";

type GlamLogoProps = {
  className?: string;
  showWordmark?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "light" | "dark";
};

const iconSizes = { sm: "h-8 w-8", md: "h-10 w-10", lg: "h-12 w-12" };
const wordmarkSizes = { sm: "text-lg", md: "text-xl", lg: "text-2xl" };

export function GlamLogo({
  className,
  showWordmark = true,
  size = "md",
  variant = "light",
}: GlamLogoProps) {
  const dark = variant === "dark";
  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        viewBox="0 0 48 48"
        fill="none"
        className={cn("shrink-0", iconSizes[size])}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="glam-lg" x1="4" y1="4" x2="44" y2="44">
            <stop stopColor="#e8d5a3" />
            <stop offset="0.5" stopColor="#d4af37" />
            <stop offset="1" stopColor="#a8893f" />
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="14" fill="url(#glam-lg)" />
        <path
          d="M14 32V16h8.2c4.4 0 7.2 2.5 7.2 6.4 0 2.5-1.2 4.4-3.2 5.3L30 32h-4.2l-3.2-3.8H18.2V32H14zm4.2-7.4h3.8c1.8 0 2.8-.9 2.8-2.3 0-1.4-1-2.3-2.8-2.3h-3.8v4.6z"
          fill="white"
        />
        <circle cx="36" cy="14" r="3" fill="#FDE68A" />
      </svg>
      {showWordmark && (
        <span
          className={cn(
            "font-bold tracking-tight",
            wordmarkSizes[size],
            dark ? "text-white" : "text-slate-900"
          )}
        >
          Glam<span className={dark ? "text-[#d4af37]" : "text-[#a8893f]"}>AI</span>
        </span>
      )}
    </div>
  );
}
