
import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        [
          "flex h-11 w-full",
          "rounded-xl border border-input",
          "bg-card px-4 py-2",
          "text-sm text-foreground",
          "shadow-sm shadow-black/[0.02]",
          "placeholder:text-muted-foreground/75",
          "transition-all duration-200 ease-out",
          "hover:border-primary/30",
          "focus-visible:border-primary",
          "focus-visible:outline-none",
          "focus-visible:ring-4 focus-visible:ring-primary/10",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "file:border-0 file:bg-transparent",
          "file:text-sm file:font-medium",
        ].join(" "),
        className
      )}
      {...props}
    />
  )
);

Input.displayName = "Input";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      [
        "flex min-h-[120px] w-full",
        "rounded-xl border border-input",
        "bg-card px-4 py-3",
        "text-sm leading-relaxed text-foreground",
        "shadow-sm shadow-black/[0.02]",
        "placeholder:text-muted-foreground/75",
        "transition-all duration-200 ease-out",
        "hover:border-primary/30",
        "focus-visible:border-primary",
        "focus-visible:outline-none",
        "focus-visible:ring-4 focus-visible:ring-primary/10",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "resize-y",
      ].join(" "),
      className
    )}
    {...props}
  />
));

Textarea.displayName = "Textarea";

export { Input, Textarea };
