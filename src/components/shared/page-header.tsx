
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-2">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>

        {description && (
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  center = true,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  center?: boolean;
}) {
  return (
    <div
      className={
        center
          ? "mx-auto max-w-2xl text-center"
          : "max-w-2xl text-left"
      }
    >
      {eyebrow && (
        <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-cyan-700 dark:border-cyan-900 dark:bg-cyan-950/50 dark:text-cyan-300">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
          {eyebrow}
        </span>
      )}

      <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl">
        {title}
      </h2>

      {description && (
        <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
          {description}
        </p>
      )}
    </div>
  );
}
