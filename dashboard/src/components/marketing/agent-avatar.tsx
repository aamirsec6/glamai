import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { AgentCastMember } from "@/lib/marketing-content";

type AgentAvatarProps = {
  agent: AgentCastMember["avatar"];
  size?: number;
  className?: string;
};

const GRADIENTS: Record<AgentCastMember["avatar"], [string, string]> = {
  scout: ["#6366f1", "#4f46e5"],
  sage: ["#22d3ee", "#0ea5e9"],
  spark: ["#3b82f6", "#2563eb"],
  maya: ["#34d399", "#10b981"],
  ruby: ["#fbbf24", "#f59e0b"],
  cleo: ["#a78bfa", "#8b5cf6"],
};

function ScoutMark({ g }: { g: string }) {
  return (
    <>
      <circle cx="32" cy="32" r="14" stroke={`url(#${g})`} strokeWidth="2.5" fill="none" opacity="0.5" />
      <path d="M18 38 L32 18 L46 38 Z" stroke={`url(#${g})`} strokeWidth="2.5" fill="none" strokeLinejoin="round" />
      <circle cx="32" cy="28" r="3" fill={`url(#${g})`} />
    </>
  );
}

function SageMark({ g }: { g: string }) {
  return (
    <>
      <path d="M16 40 L32 16 L48 40" stroke={`url(#${g})`} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="32" cy="36" r="4" fill={`url(#${g})`} opacity="0.9" />
      <line x1="32" y1="22" x2="32" y2="32" stroke={`url(#${g})`} strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

function SparkMark({ g }: { g: string }) {
  return (
    <>
      <rect x="18" y="20" width="28" height="20" rx="4" stroke={`url(#${g})`} strokeWidth="2.5" fill="none" />
      <line x1="22" y1="28" x2="42" y2="28" stroke={`url(#${g})`} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <line x1="22" y1="33" x2="36" y2="33" stroke={`url(#${g})`} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <circle cx="40" cy="18" r="4" fill={`url(#${g})`} />
    </>
  );
}

function MayaMark({ g }: { g: string }) {
  return (
    <>
      <path
        d="M20 36 C20 28 26 22 32 22 C38 22 44 28 44 36"
        stroke={`url(#${g})`}
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="26" cy="30" r="2.5" fill={`url(#${g})`} />
      <circle cx="38" cy="30" r="2.5" fill={`url(#${g})`} />
      <path d="M28 38 Q32 42 36 38" stroke={`url(#${g})`} strokeWidth="2" fill="none" strokeLinecap="round" />
    </>
  );
}

function RubyMark({ g }: { g: string }) {
  return (
    <>
      <path
        d="M32 18 L36 28 L46 28 L38 34 L41 44 L32 38 L23 44 L26 34 L18 28 L28 28 Z"
        stroke={`url(#${g})`}
        strokeWidth="2"
        fill="none"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="30" r="3" fill={`url(#${g})`} opacity="0.8" />
    </>
  );
}

function CleoMark({ g }: { g: string }) {
  return (
    <>
      <circle cx="32" cy="32" r="16" stroke={`url(#${g})`} strokeWidth="2" fill="none" opacity="0.4" />
      <circle cx="32" cy="32" r="10" stroke={`url(#${g})`} strokeWidth="2" fill="none" opacity="0.6" />
      <circle cx="32" cy="32" r="4" fill={`url(#${g})`} />
      <line x1="32" y1="16" x2="32" y2="22" stroke={`url(#${g})`} strokeWidth="2" strokeLinecap="round" />
      <line x1="32" y1="42" x2="32" y2="48" stroke={`url(#${g})`} strokeWidth="2" strokeLinecap="round" />
      <line x1="16" y1="32" x2="22" y2="32" stroke={`url(#${g})`} strokeWidth="2" strokeLinecap="round" />
      <line x1="42" y1="32" x2="48" y2="32" stroke={`url(#${g})`} strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

const MARKS: Record<AgentCastMember["avatar"], (props: { g: string }) => ReactNode> = {
  scout: ScoutMark,
  sage: SageMark,
  spark: SparkMark,
  maya: MayaMark,
  ruby: RubyMark,
  cleo: CleoMark,
};

export function AgentAvatar({ agent, size = 64, className }: AgentAvatarProps) {
  const gradId = `agent-${agent}`;
  const [c1, c2] = GRADIENTS[agent];
  const Mark = MARKS[agent];

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="12" y1="12" x2="52" y2="52">
          <stop stopColor={c1} />
          <stop offset="1" stopColor={c2} />
        </linearGradient>
        <radialGradient id={`${gradId}-bg`} cx="50%" cy="50%" r="50%">
          <stop stopColor={c1} stopOpacity="0.15" />
          <stop offset="1" stopColor={c1} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill="#0a0f1e" />
      <rect width="64" height="64" rx="18" fill={`url(#${gradId}-bg)`} />
      <rect width="63" height="63" x="0.5" y="0.5" rx="17.5" stroke={`url(#${gradId})`} strokeOpacity="0.35" />
      <Mark g={gradId} />
    </svg>
  );
}
