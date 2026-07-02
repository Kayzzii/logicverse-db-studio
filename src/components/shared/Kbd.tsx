import { cn } from "@/lib/utils";

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded border border-[var(--color-border)] bg-[var(--color-muted)] px-1.5 font-mono text-[10px] font-medium text-[var(--color-muted-foreground)]",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
