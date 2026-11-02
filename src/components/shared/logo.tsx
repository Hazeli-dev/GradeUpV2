import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient shadow-glow", className)}>
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M5 17l7-11 7 11" />
      </svg>
    </span>
  );
}

export function Logo({ to = "/", compact = false, className }: { to?: string; compact?: boolean; className?: string }) {
  return (
    <Link to={to} className={cn("flex items-center gap-2.5 font-extrabold tracking-tight", className)} aria-label="GradeUp">
      <LogoMark />
      {!compact && (
        <span className="text-lg">
          Grade<span className="text-gradient">Up</span>
        </span>
      )}
    </Link>
  );
}
