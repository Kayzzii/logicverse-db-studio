import * as React from "react";
import { cn } from "@/lib/utils";

export const Badge = ({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "secondary" | "outline" | "success" | "warning";
}) => {
  const variants = {
    default: "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]",
    secondary: "bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)]",
    outline: "border border-[var(--color-border)] text-[var(--color-foreground)]",
    success: "bg-emerald-600/20 text-emerald-400 border border-emerald-600/30",
    warning: "bg-amber-600/20 text-amber-400 border border-amber-600/30",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
};
