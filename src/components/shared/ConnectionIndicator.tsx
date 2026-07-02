import { cn } from "@/lib/utils";

interface ConnectionIndicatorProps {
  connected: boolean;
  className?: string;
}

export function ConnectionIndicator({ connected, className }: ConnectionIndicatorProps) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full",
        connected
          ? "bg-[var(--color-accent-green)] connection-pulse"
          : "bg-[var(--color-text-muted)]",
        className,
      )}
      aria-hidden
    />
  );
}
