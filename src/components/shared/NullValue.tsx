import { cn } from "@/lib/utils";

export function NullValue({ className }: { className?: string }) {
  return (
    <span className={cn("font-mono-db italic text-[var(--text-ghost)]", className)}>NULL</span>
  );
}
