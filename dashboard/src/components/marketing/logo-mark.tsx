import { cn } from "@/lib/utils";

type LogoMarkProps = {
  className?: string;
  size?: number;
  id?: string;
};

/** Summit-orb mark — orbital Q with apex beacon (قمة / peak) */
export function LogoMark({ className, size = 32, id = "qimma" }: LogoMarkProps) {
  const g = `${id}-grad`;
  const bg = `${id}-bg`;
  const glow = `${id}-glow`;

  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={g} x1="6" y1="6" x2="42" y2="42">
          <stop stopColor="#22d3ee" />
          <stop offset="0.45" stopColor="#6366f1" />
          <stop offset="1" stopColor="#c084fc" />
        </linearGradient>
        <linearGradient id={bg} x1="0" y1="0" x2="48" y2="48">
          <stop stopColor="#0a0f1e" />
          <stop offset="1" stopColor="#111827" />
        </linearGradient>
        <radialGradient id={glow} cx="50%" cy="38%" r="50%">
          <stop stopColor="#22d3ee" stopOpacity="0.18" />
          <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Container */}
      <rect width="48" height="48" rx="13" fill={`url(#${bg})`} />
      <rect
        width="48"
        height="48"
        rx="13"
        fill={`url(#${glow})`}
      />
      <rect
        width="47"
        height="47"
        x="0.5"
        y="0.5"
        rx="12.5"
        stroke={`url(#${g})`}
        strokeOpacity="0.35"
      />

      {/* Orbital Q — arc + rising tail to apex */}
      <path
        d="M31.2 32.4 A11 11 0 1 1 34.1 20.1"
        stroke={`url(#${g})`}
        strokeWidth="3.25"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M31.2 32.4 L38.2 13.8"
        stroke={`url(#${g})`}
        strokeWidth="3.25"
        strokeLinecap="round"
      />

      {/* Apex beacon */}
      <circle cx="38.2" cy="12.8" r="5.5" fill="#22d3ee" fillOpacity="0.15" />
      <circle cx="38.2" cy="12.8" r="2.6" fill="#22d3ee" />
      <circle cx="38.2" cy="12.8" r="1.1" fill="#ecfeff" fillOpacity="0.9" />

      {/* Intelligence core */}
      <circle cx="24" cy="24.5" r="2.2" fill="#a78bfa" fillOpacity="0.85" />
      <circle cx="24" cy="24.5" r="4.5" fill="#6366f1" fillOpacity="0.12" />
    </svg>
  );
}
