
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  [
    "inline-flex items-center justify-center gap-1.5",
    "rounded-full px-2.5 py-1",
    "text-[11px] font-semibold leading-none tracking-[0.01em]",
    "whitespace-nowrap align-middle",
    "border border-transparent",
    "transition-colors duration-200",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-soft text-primary border-primary/10 dark:text-accent",

        solid:
          "bg-primary text-primary-foreground",

        outline:
          "border-border bg-transparent text-muted-foreground",

        success:
          "border-emerald-200/70 bg-emerald-50 text-emerald-700 " +
          "dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",

        warning:
          "border-amber-200/70 bg-amber-50 text-amber-700 " +
          "dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300",

        danger:
          "border-red-200/70 bg-red-50 text-red-700 " +
          "dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300",

        muted:
          "border-border/70 bg-muted text-muted-foreground",
      },
    },

    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
